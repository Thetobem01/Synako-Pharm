/* The Synako Journal on the server: posts saved from the Pharmacist Desk, merged with the starter posts in js/journal.js.
   Posts are kept as post:<id>, listed in the "posts" index. Removing a post keeps it, marked hidden. */
import { db, site, storageReady, fail } from "./core.js";

const clean = (s, n) => String(s == null ? "" : s).replace(/\r\n/g, "\n").trim().slice(0, n);
const today = () => site().journal.lagosDay(Date.now(), site().config.site.timezone);

async function saved() {
  if (!storageReady()) return [];
  try {
    const ids = await db.latest("posts", 400);
    return (await Promise.all(ids.map(id => db.get("post:" + id)))).filter(Boolean);
  } catch (e) { console.error("Journal unavailable", e); return []; }
}
/* Everything, for the desk (drafts, scheduled and hidden posts included) */
export async function allPosts() { return site().journal.merge(await saved()); }
/* What the public sees: published posts whose date has come (Nigeria time) */
export async function livePosts() {
  const J = site().journal, now = today();
  return J.merge(await saved()).filter(p => J.isLive(p, now)).map(({ id, kind, date, title, body, author }) => ({ id, kind, date, title, body, author }));
}

export async function savePost(b, by) {
  const J = site().journal, p = b.post || {};
  const title = clean(p.title, 140), body = clean(p.body, 12000);
  if (!title) throw fail(400, "Give the post a title.");
  if (body.length < 20) throw fail(400, "Write a little more before saving.");
  const kind = J.KINDS[p.kind] ? p.kind : "diary";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || "")) ? p.date : today();
  const status = p.status === "draft" ? "draft" : "published";
  const all = await allPosts();
  let id = String(p.id || "");
  const existing = id ? all.find(x => x.id === id) : null;
  if (!existing) { // a new post: an address made from its title, unique among all posts
    const base = J.slug(title) || "post";
    id = base; for (let n = 2; all.some(x => x.id === id); n++) id = `${base}-${n}`;
  }
  const now = new Date().toISOString();
  const post = { id, kind, date, title, body, status, author: clean(p.author, 60) || (existing && existing.author) || "Synako Pharmacy",
    createdAt: (existing && existing.createdAt) || now, updatedAt: now, updatedBy: by, story: clean(p.story, 40) || (existing && existing.story) || "" };
  await db.set("post:" + id, post);
  if (!existing || existing.starter) await db.index("posts", id, Date.now());
  if (post.story && status === "published") { // the customer's experience it came from is now dealt with
    const r = await db.get("req:" + post.story);
    if (r && r.type === "experience" && r.status === "new") {
      Object.assign(r, { status: "done", handledBy: `Published as a story by ${by}`, handledAt: now });
      await db.set("req:" + r.id, r);
    }
  }
  return post;
}
export async function hidePost(id, by) {
  const p = (await allPosts()).find(x => x.id === String(id || ""));
  if (!p) throw fail(404, "Post not found.");
  const post = Object.assign({}, p, { status: "hidden", updatedAt: new Date().toISOString(), updatedBy: by });
  delete post.starter;
  await db.set("post:" + p.id, post);
  if (p.starter) await db.index("posts", p.id, Date.now());
  return post;
}

/* A draft of the week in review from the last 7 days of orders and customer experiences */
export async function weekDraft(now) {
  const { P, DEPTS, journal, config } = site();
  const ids = await db.latest("orders", 300);
  const orders = (await Promise.all(ids.map(id => db.get("order:" + id)))).filter(Boolean).map(o => ({
    createdAt: o.createdAt, status: o.status, rx: o.rx, speed: o.delivery && o.delivery.speed, city: o.delivery && o.delivery.city, state: o.delivery && o.delivery.state,
    paidAt: (o.payment && o.payment.paidAt) || "", deliveredAt: o.deliveredAt || "", items: (o.items || []).map(i => ({ id: i.id, qty: i.qty }))
  }));
  const rids = await db.latest("requests", 300);
  const stories = (await Promise.all(rids.map(id => db.get("req:" + id)))).filter(r => r && r.type === "experience").map(r => ({ createdAt: r.createdAt, rating: r.rating }));
  return journal.weekReview(orders, stories, P, DEPTS, now || Date.now(), config.site.timezone);
}

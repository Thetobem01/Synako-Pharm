import { handle, only, send, body, fail, db, newId, storageReady, digits, limit, sendEmail, site } from "./_lib/core.js";
import { livePosts } from "./_lib/journal.js";
const clean = (s, n = 300) => String(s == null ? "" : s).trim().slice(0, n);
/* Messages to a pharmacist, consultation bookings and customer experiences.
   GET: the journal's published posts (kept here to stay within Vercel Hobby's 12-function limit). */
export default handle(async (req, res) => {
  if (!only(req, res, "GET", "POST")) return;
  if (req.method === "GET") return send(res, 200, { posts: await livePosts() });
  if (!storageReady()) throw fail(503, "Online messages aren't switched on yet. Please call the pharmacy.");
  const b = await body(req);
  if (b.website) return send(res, 201, { id: newId("MSG") }); // hidden field only bots fill in: accept quietly, store nothing
  await limit(req, "requests", 6, 600, "You've sent several messages in a short time. Please call the pharmacy instead.");
  const type = ["message", "appointment", "careers", "trade", "restock", "experience"].includes(b.type) ? b.type : "message";
  if (type === "restock") return restock(b, res);
  if (type === "experience") return experience(b, res);
  const r = { id: newId({ appointment: "APT", careers: "JOB", trade: "TRD" }[type] || "MSG"), type, createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120), topic: clean(b.topic, 80), message: clean(b.message, 3000),
    date: clean(b.date, 10), time: clean(b.time, 5), role: clean(b.role, 60), pcn: clean(b.pcn, 40),
    business: clean(b.business, 120), bizType: clean(b.bizType, 60), state: clean(b.state, 40), budget: clean(b.budget, 40) };
  if (type === "trade" && (!r.business || !r.message)) throw fail(400, "Please add your business name and the products and quantities you need.");
  if (!r.name || (type !== "careers" && digits(r.phone).length < 10) || (type === "careers" && !r.email)) throw fail(400, "Please add your name and a way to contact you.");
  if (type === "appointment" && (!r.date || !r.time)) throw fail(400, "Please choose a date and time.");
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  if (process.env.STAFF_EMAIL) await sendEmail(process.env.STAFF_EMAIL, `${{ message: "New message", appointment: "Consultation request", careers: "Careers interest", trade: "Wholesale quote request" }[type]} · ${r.id}`, [`${r.name}${r.business ? ` (${r.business})` : ""} sent a ${{ appointment: "consultation request", careers: "careers enquiry", trade: "wholesale quote request", message: "message" }[type]}. Open the Pharmacist Desk to reply.`]);
  send(res, 201, { id: r.id });
});

/* "Tell me when it's back": a phone number or an email, for one product */
async function restock(b, res) {
  const p = site().P.find(x => x.id === String(b.product || ""));
  if (!p) throw fail(400, "That product isn't in our catalogue.");
  const contact = clean(b.contact, 120);
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact) ? contact : "";
  const phone = email ? "" : (digits(contact).length >= 10 ? contact : "");
  if (!email && !phone) throw fail(400, "Please enter a phone number or an email address.");
  const r = { id: newId("STK"), type: "restock", createdAt: new Date().toISOString(), status: "new", product: p.id, productName: p.name,
    name: clean(b.name, 80) || "Customer", phone, email, message: `Wants to know when ${p.name} (${p.pack}) is back in stock.` };
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  send(res, 201, { id: r.id });
}

/* "Share your experience": a rating and a few words, published on the journal only if the customer agrees */
async function experience(b, res) {
  const rating = Math.round(Number(b.rating));
  const r = { id: newId("EXP"), type: "experience", createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 60), town: clean(b.town, 60), order: clean(b.order, 20).toUpperCase(), rating: rating >= 1 && rating <= 5 ? rating : 0,
    message: clean(b.message, 2000), publish: b.publish === true || b.publish === "on" || b.publish === "yes" };
  if (!r.name) throw fail(400, "Please add your first name.");
  if (!r.rating) throw fail(400, "Please choose a rating from 1 to 5.");
  if (r.message.length < 10) throw fail(400, "Please tell us a little about your experience.");
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  if (process.env.STAFF_EMAIL) await sendEmail(process.env.STAFF_EMAIL, `Customer experience · ${r.rating}/5 · ${r.id}`, [`${r.name} rated their experience ${r.rating} out of 5${r.publish ? " and agreed to it being shared on the journal" : ""}. Open the Pharmacist Desk (Journal) to read it.`]);
  send(res, 201, { id: r.id });
}

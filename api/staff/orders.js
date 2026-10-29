import crypto from "node:crypto";
import { handle, only, send, body, query, fail, requireStaff, requireRider, db, site, STATUS, emailReady, paystackReady, smsReady, riderReady, sendEmail, mailFrom, limit, outOfStock, baseUrl,
  log, notifyCustomer, checkDeliveryCode, remindUnpaid } from "../_lib/core.js";
import { allPosts, savePost, hidePost, weekDraft } from "../_lib/journal.js";
import { lowStock, setLow, notifySupply, suppliers, saveSupplier, deleteSupplier, purchaseOrders, createPO, updatePO, shortages, overdue, supplyDigest } from "../_lib/supply.js";
/* Pharmacist Desk. GET: recent orders and requests, plus site details still missing.
   POST: mark a message, booking or quote request as handled (or back to new), stock, test email, payment reminders,
   and the journal (journal-save, journal-hide, journal-week for a week-in-review draft).
   Riders: GET ?view=rider lists deliveries; POST rider-take / rider-delivered.
   Vercel's daily scheduled job: GET ?task=reminders with CRON_SECRET.
   (One file for all of this keeps the API within Vercel Hobby's 12-function limit.) */
const DEV = process.env.SYNAKO_DEV === "1";
export default handle(async (req, res) => {
  if (!only(req, res, "GET", "POST")) return;
  const q = query(req);
  if (req.method === "GET" && q.task === "reminders") { // Vercel cron sends "Authorization: Bearer <CRON_SECRET>"
    const secret = process.env.CRON_SECRET || "", got = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!secret || got.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret))) throw fail(401, "Not allowed.");
    const reminders = await remindUnpaid();
    return send(res, 200, Object.assign(reminders, { supply: await supplyDigest() }));
  }
  if (req.method === "GET" && q.view === "rider") { requireRider(req); return send(res, 200, { deliveries: await deliveries() }); }
  const b = req.method === "POST" ? await body(req) : {};
  if (b.action === "rider-take" || b.action === "rider-delivered") { requireRider(req); return send(res, 200, await riderAction(req, b)); }
  requireStaff(req);
  if (req.method === "GET" && q.view === "supply") return send(res, 200, await supplyView());
  if (req.method === "POST") {
    const by = String(b.by || "Staff").trim().slice(0, 60);
    if (b.action === "supplier-save") { await saveSupplier(b.supplier || {}); return send(res, 200, await supplyView()); }
    if (b.action === "supplier-delete") { await deleteSupplier(String(b.id || "")); return send(res, 200, await supplyView()); }
    if (b.action === "po-create") { const po = await createPO(b, by); return send(res, 201, Object.assign(await supplyView(), { po })); }
    if (b.action === "po-update") { const po = await updatePO(b, by, tellWaitingCustomers); return send(res, 200, Object.assign(await supplyView(), { po })); }
    if (b.action === "journal-save") { const post = await savePost(b, by); return send(res, 200, { post, posts: await allPosts() }); }
    if (b.action === "journal-hide") { await hidePost(b.id, by); return send(res, 200, { posts: await allPosts() }); }
    if (b.action === "journal-week") return send(res, 200, { draft: await weekDraft(DEV && b.now ? Number(b.now) : Date.now()) });
    if (b.action === "supply-digest") return send(res, 200, await supplyDigest(DEV && b.now ? Number(b.now) : Date.now()));
    if (b.action === "stock-low") { // "running low": an early warning for the supply manager; customers can still order
      const p = site().P.find(x => x.id === String(b.id));
      if (!p) throw fail(404, "Product not found.");
      const low = await setLow(p.id, !!b.low);
      if (b.low) await notifySupply(`Running low: ${p.name}`, [`${by} marked ${p.name} (${p.pack}) as running low.`, "Add it to a purchase order from the Supply tab."], `running low: ${p.name}. Marked by ${by}.`);
      return send(res, 200, { low });
    }
    if (b.action === "reminders") { // "Send payment reminders now" on the desk
      const now = DEV && b.now ? Number(b.now) : Date.now();
      return send(res, 200, await remindUnpaid(now));
    }
    if (b.action === "stock") { // mark a product out of stock, or back in stock
      const p = site().P.find(x => x.id === String(b.id));
      if (!p) throw fail(404, "Product not found.");
      const out = await outOfStock();
      if (b.out) out.add(p.id); else out.delete(p.id);
      await db.set("stock:out", [...out]);
      if (b.out) { await setLow(p.id, false); await notifySupply(`Out of stock: ${p.name}`, [`${String(b.by || "Staff").slice(0, 60)} marked ${p.name} (${p.pack}) as out of stock. Customers can't order it until it's back.`, "Add it to a purchase order from the Supply tab."], `OUT OF STOCK: ${p.name}.`); }
      let told = 0;
      if (!b.out) told = await tellWaitingCustomers(p, String(b.by || "Staff").slice(0, 60));
      return send(res, 200, { out: [...out], told });
    }
    if (b.action === "test-email") { // only ever to the shop's own alert inbox
      await limit(req, "test-email", 5, 600, "Please wait a few minutes before sending another test.");
      const to = process.env.STAFF_EMAIL || site().config.business.email;
      if (!to) throw fail(400, "Add STAFF_EMAIL in the hosting settings first.");
      const r = await sendEmail(to, "Test email from your Synako shop", ["This is a test from the Pharmacist Desk. If you can read it, order emails are working.", `Sent from ${mailFrom()}.`]);
      return send(res, 200, { ok: r.ok, why: r.why || "", to: to.replace(/^(.).*(@.*)$/, "$1…$2"), from: mailFrom() });
    }
    const r = b.id ? await db.get("req:" + String(b.id)) : null;
    if (!r) throw fail(404, "Request not found.");
    r.status = b.status === "new" ? "new" : "done";
    r.handledBy = r.status === "done" ? String(b.by || "Staff").trim().slice(0, 60) : "";
    r.handledAt = r.status === "done" ? new Date().toISOString() : "";
    await db.set("req:" + r.id, r);
    return send(res, 200, { request: r });
  }
  // While the desk is open, payment reminders go out at most every 15 minutes (the daily scheduled job covers the rest)
  try { if (await db.once("job:remind", 900)) await remindUnpaid(); } catch (e) { console.error("Reminders failed", e); }
  // The supply manager's daily summary goes out with the first desk refresh of the day (and from the daily scheduled job)
  try { if (await db.once("job:digest:" + new Date().toISOString().slice(0, 10), 90000)) await supplyDigest(); } catch (e) { console.error("Supply summary failed", e); }
  const ids = await db.latest("orders", 200);
  const orders = (await Promise.all(ids.map(id => db.get("order:" + id)))).filter(Boolean).map(o => ({
    id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: STATUS[o.status], rx: o.rx, rxRequest: o.rxRequest,
    customer: o.customer.name, phone: o.customer.phone || "", total: o.total, priced: o.priced !== false, items: o.items.map(i => `${i.qty} × ${i.name}`),
    speed: o.delivery.label, speedId: o.delivery.speed || "", city: o.delivery.city || "", state: o.delivery.state || "", rider: o.rider || "", reminded: !!o.reminded, paidAt: (o.payment && o.payment.paidAt) || ""
  }));
  const rids = await db.latest("requests", 100);
  const requests = (await Promise.all(rids.map(id => db.get("req:" + id)))).filter(Boolean);
  const { config } = site(), biz = config.business, l = config.licences;
  const missing = [
    ["Pharmacy address", biz.address], ["City", biz.city], ["State", biz.state], ["Phone number", biz.phone], ["Email", biz.email],
    ["Company name", biz.companyName], ["RC number", biz.rcNumber], ["PCN premises number", l.pcnPremises], ["PCN e-pharmacy licence", l.pcnEPharmacy],
    ["Superintendent pharmacist", l.superintendentName], ["Superintendent PCN reg. no.", l.superintendentPcnReg], ["PCN ROPSE emblem", l.ropseImage]
  ].filter(([, v]) => !v).map(([k]) => k);
  const setup = []; // hosting settings (Vercel environment variables), not config.js
  if (!paystackReady()) setup.push("Paystack keys (PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY)");
  if (!process.env.SESSION_SECRET) setup.push("SESSION_SECRET (separate from the staff password)");
  if (!emailReady()) setup.push("Order emails (RESEND_API_KEY, MAIL_FROM)");
  if (!riderReady()) setup.push("RIDER_PASSWORD for the rider page (/rider)");
  if (!process.env.CRON_SECRET) setup.push("CRON_SECRET so payment reminders also go out when the desk is closed");
  else if (!process.env.STAFF_EMAIL) setup.push("STAFF_EMAIL for new-order alerts");
  const low = await lowStock();
  send(res, 200, { orders, requests, missing, setup, sms: smsReady(), low: [...low], out: [...await outOfStock()], posts: await allPosts(), serverTime: new Date().toISOString() });
});

/* When a product is back, email everyone who asked to be told by email; phone-only requests stay on the desk to call */
async function tellWaitingCustomers(p, by) {
  const ids = await db.latest("requests", 300);
  const waiting = (await Promise.all(ids.map(id => db.get("req:" + id)))).filter(r => r && r.type === "restock" && r.product === p.id && r.status === "new" && r.email);
  let told = 0;
  for (const r of waiting) {
    const sent = await sendEmail(r.email, `Back in stock: ${p.name}`, [`Good news: ${p.name} (${p.pack}) is back in stock at ${site().config.business.name}.`,
      { html: `<a href="${baseUrl()}/product/${p.id}">Order it now</a>`, text: `Order it now: ${baseUrl()}/product/${p.id}` }, "You asked us to let you know. We won't email you about it again."]);
    if (sent.ok) { r.status = "done"; r.handledBy = `Emailed automatically (${by})`; r.handledAt = new Date().toISOString(); await db.set("req:" + r.id, r); told++; }
  }
  return told;
}

/* What a rider needs at the door: who, where, how to reach them. No medicine names (the bag is sealed) and no health details.
   Today's delivered orders come back as a short record (no address or phone) so riders can see their day. */
const lagosDay = t => new Date(t).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
const when = (o, m) => ((o.history || []).filter(h => !h.internal && String(h.m).startsWith(m)).pop() || {}).t || "";
async function deliveries() {
  const ids = await db.latest("orders", 200);
  const today = lagosDay(Date.now());
  const all = (await Promise.all(ids.map(id => db.get("order:" + id)))).filter(Boolean);
  const done = all.filter(o => o.status === "delivered" && lagosDay(o.deliveredAt || when(o, "Delivered") || 0) === today);
  return all.filter(o => ["packed", "out_for_delivery"].includes(o.status)).map(o => ({
    id: o.id, status: o.status, statusLabel: STATUS[o.status], createdAt: o.createdAt, speedId: o.delivery.speed || "", speed: o.delivery.label,
    paidAt: (o.payment && o.payment.paidAt) || "", packedAt: when(o, "Packed"), outAt: when(o, "Out for delivery"),
    name: o.customer.name, phone: o.customer.phone, addr: o.delivery.addr, landmark: o.delivery.landmark || "", city: o.delivery.city, state: o.delivery.state, note: o.delivery.note || "",
    items: o.items.reduce((t, i) => t + (Number(i.qty) || 0), 0), total: o.total, idCheck: !!o.ageRestricted, rider: o.rider || "", hasCode: !!o.deliveryCode
  })).concat(done.map(o => ({
    id: o.id, status: "delivered", statusLabel: STATUS.delivered, speedId: o.delivery.speed || "", name: String(o.customer.name || "").split(" ")[0],
    city: o.delivery.city, rider: o.rider || "", outAt: when(o, "Out for delivery"), deliveredAt: o.deliveredAt || when(o, "Delivered")
  })));
}
async function riderAction(req, b) {
  const o = await db.get("order:" + String(b.id || ""));
  if (!o) throw fail(404, "Order not found.");
  const by = String(b.by || "Rider").trim().slice(0, 60);
  if (b.action === "rider-take") {
    if (o.status !== "packed") throw fail(409, o.status === "out_for_delivery" ? `${o.rider || "Another rider"} has already taken this delivery.` : "This order isn't ready to collect.");
    o.status = "out_for_delivery"; o.rider = by;
    log(o, "Out for delivery"); log(o, `Collected by rider ${by}`, { internal: true });
    await db.set("order:" + o.id, o);
    await notifyCustomer(o, "dispatched");
  } else {
    if (o.status !== "out_for_delivery") throw fail(409, "This order isn't out for delivery.");
    await limit(req, "delivery-code", 10, 600, "Too many wrong codes. Please wait a few minutes.");
    if (!checkDeliveryCode(o, b.code)) throw fail(400, "That code isn't right. Ask the customer for the 4-digit code in their SMS, email or order page.");
    o.status = "delivered"; o.deliveredAt = new Date().toISOString();
    log(o, "Delivered"); log(o, `Delivered by rider ${by}${o.deliveryCode ? " · delivery code checked" : ""}`, { internal: true });
    await db.set("order:" + o.id, o);
    await notifyCustomer(o, "delivered");
  }
  return { deliveries: await deliveries() };
}

async function supplyView() {
  const [list, sups, pos] = await Promise.all([shortages(), suppliers(), purchaseOrders(100)]);
  return { shortages: list, suppliers: sups, pos, overdue: overdue(pos).map(p => p.id), email: emailReady(), sms: smsReady() };
}

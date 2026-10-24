import { handle, only, send, body, fail, requireStaff, db, site, STATUS, emailReady, paystackReady, sendEmail, mailFrom, limit } from "../_lib/core.js";
/* Pharmacist Desk. GET: recent orders and requests, plus site details still missing.
   POST: mark a message, booking or quote request as handled (or back to new).
   (One file for both keeps the API within Vercel Hobby's 12-function limit.) */
export default handle(async (req, res) => {
  if (!only(req, res, "GET", "POST")) return;
  requireStaff(req);
  if (req.method === "POST") {
    const b = await body(req);
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
  const ids = await db.latest("orders", 200);
  const orders = (await Promise.all(ids.map(id => db.get("order:" + id)))).filter(Boolean).map(o => ({
    id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: STATUS[o.status], rx: o.rx, rxRequest: o.rxRequest,
    customer: o.customer.name, total: o.total, priced: o.priced !== false, items: o.items.map(i => `${i.qty} × ${i.name}`), speed: o.delivery.label
  }));
  const rids = await db.latest("requests", 100);
  const requests = (await Promise.all(rids.map(id => db.get("req:" + id)))).filter(Boolean);
  const { config } = site(), b = config.business, l = config.licences;
  const missing = [
    ["Pharmacy address", b.address], ["City", b.city], ["State", b.state], ["Phone number", b.phone], ["Email", b.email],
    ["Company name", b.companyName], ["RC number", b.rcNumber], ["PCN premises number", l.pcnPremises], ["PCN e-pharmacy licence", l.pcnEPharmacy],
    ["Superintendent pharmacist", l.superintendentName], ["Superintendent PCN reg. no.", l.superintendentPcnReg], ["PCN ROPSE emblem", l.ropseImage]
  ].filter(([, v]) => !v).map(([k]) => k);
  const setup = []; // hosting settings (Vercel environment variables), not config.js
  if (!paystackReady()) setup.push("Paystack keys (PAYSTACK_PUBLIC_KEY, PAYSTACK_SECRET_KEY)");
  if (!process.env.SESSION_SECRET) setup.push("SESSION_SECRET (separate from the staff password)");
  if (!emailReady()) setup.push("Order emails (RESEND_API_KEY, MAIL_FROM)");
  else if (!process.env.STAFF_EMAIL) setup.push("STAFF_EMAIL for new-order alerts");
  send(res, 200, { orders, requests, missing, setup, serverTime: new Date().toISOString() });
});

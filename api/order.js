import { handle, only, send, query, body, fail, db, digits, publicOrder, limit, notifyCustomer, emailReady } from "./_lib/core.js";
/* Track an order: order number plus the last 4 digits of the phone number used.
   POST { id, phone, action: "email-receipt" }: email the PDF receipt of a paid order to the address on the order. */
export default handle(async (req, res) => {
  if (!only(req, res, "GET", "POST")) return;
  const b = req.method === "POST" ? await body(req) : query(req);
  await limit(req, req.method === "POST" ? "receipt-email" : "track", req.method === "POST" ? 5 : 40, req.method === "POST" ? 3600 : 600,
    req.method === "POST" ? "You've asked for several receipts. Please download it from this page instead." : undefined);
  const { id, phone } = b;
  const o = id ? await db.get("order:" + String(id).toUpperCase().trim()) : null;
  if (!o || digits(o.customer.phone).slice(-4) !== digits(phone).slice(-4) || digits(phone).length < 4) throw fail(404, "We can't find an order with that number and phone. Check your confirmation and try again.");
  if (req.method === "GET") return send(res, 200, { order: publicOrder(o) });
  if (b.action !== "email-receipt") throw fail(400, "Unknown request.");
  if (!(o.payment && o.payment.status === "paid")) throw fail(409, "The receipt is ready once the order is paid.");
  if (!emailReady()) throw fail(503, "Emails aren't switched on yet. Please download the receipt from this page.");
  const r = await notifyCustomer(o, "receipt", { sms: false });
  if (!r.email || !r.email.ok) throw fail(502, "We couldn't send the email just now. Please download the receipt from this page.");
  send(res, 200, { ok: true, to: String(o.customer.email).replace(/^(.).*(@.*)$/, "$1…$2") });
});

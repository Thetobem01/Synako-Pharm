import { handle, only, send, body, fail, db, digits, paystackReady, limit } from "./_lib/core.js";
/* Start a Paystack payment for an order. The amount comes from the stored order, never the browser. */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  const mock = process.env.PAYSTACK_MOCK === "1" && process.env.SYNAKO_DEV === "1";
  if (!paystackReady() && !mock) throw fail(503, "Online payment isn't switched on yet. Please call the pharmacy to pay.");
  await limit(req, "pay", 20, 600);
  const { id, phone } = await body(req);
  const o = id ? await db.get("order:" + id) : null;
  if (!o || digits(phone).length < 4 || digits(o.customer.phone).slice(-4) !== digits(phone).slice(-4)) throw fail(404, "Order not found.");
  if (!["awaiting_payment", "approved_awaiting_payment"].includes(o.status)) throw fail(409, "This order isn't waiting for payment.");
  if (o.priced === false) throw fail(409, "Our pharmacist hasn't priced this order yet.");
  o.payment.attempts = (o.payment.attempts || 0) + 1;
  const reference = `${o.id}-${o.payment.attempts}`;
  await db.set("order:" + o.id, o);
  await db.set("ref:" + reference, o.id);
  send(res, 200, { reference, amount: Math.round(o.total * 100), currency: "NGN", email: o.customer.email, publicKey: process.env.PAYSTACK_PUBLIC_KEY || "", mock });
});

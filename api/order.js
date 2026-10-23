import { handle, only, send, query, fail, db, digits, publicOrder, limit } from "./_lib/core.js";
/* Track an order: order number plus the last 4 digits of the phone number used */
export default handle(async (req, res) => {
  if (!only(req, res, "GET")) return;
  await limit(req, "track", 40, 600);
  const { id, phone } = query(req);
  const o = id ? await db.get("order:" + String(id).toUpperCase().trim()) : null;
  if (!o || digits(o.customer.phone).slice(-4) !== digits(phone).slice(-4) || digits(phone).length < 4) throw fail(404, "We can't find an order with that number and phone. Check your confirmation and try again.");
  send(res, 200, { order: publicOrder(o) });
});

import { handle, only, send, body, fail, db, paystackVerify, settle, publicOrder, limit } from "./_lib/core.js";
/* Called by the website after the Paystack popup closes successfully */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  await limit(req, "pay", 20, 600);
  const { reference } = await body(req);
  const id = reference ? await db.get("ref:" + reference) : null;
  if (!id) throw fail(404, "Payment reference not found.");
  const tx = await paystackVerify(reference);
  const o = await settle(id, Object.assign({ reference }, tx));
  send(res, 200, { order: publicOrder(o) });
});

import { handle, send, storageReady, paystackReady, staffReady } from "./_lib/core.js";
/* Tells the website which live features are switched on */
export default handle(async (req, res) => {
  send(res, 200, {
    ok: true,
    orders: storageReady(),
    payments: paystackReady() || (process.env.PAYSTACK_MOCK === "1" && process.env.SYNAKO_DEV === "1"),
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
    staff: staffReady()
  });
});

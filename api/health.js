import { handle, send, query, db, storageReady, paystackReady, staffReady, emailReady } from "./_lib/core.js";
/* Tells the website which live features are switched on.
   /api/health?deep=1 also checks the order database answers, for uptime monitors: 503 if it doesn't. */
export default handle(async (req, res) => {
  const status = {
    ok: true,
    orders: storageReady(),
    payments: paystackReady() || (process.env.PAYSTACK_MOCK === "1" && process.env.SYNAKO_DEV === "1"),
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
    staff: staffReady(),
    email: emailReady()
  };
  if (query(req).deep && status.orders) {
    const t = Date.now();
    try { await db.get("health:ping"); status.storage = { ok: true, ms: Date.now() - t }; }
    catch (e) { status.ok = false; status.storage = { ok: false, error: "The order database isn't answering." }; console.error("Health check: storage", e); }
  }
  send(res, status.ok ? 200 : 503, status);
});

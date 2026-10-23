import crypto from "node:crypto";
import { rawBody, send, db, settle } from "./_lib/core.js";
/* Paystack calls this when a charge succeeds, even if the customer closed the page.
   Set the webhook URL in the Paystack dashboard to https://YOUR-DOMAIN/api/paystack-webhook */
export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed." });
  const raw = await rawBody(req); // read the exact bytes Paystack signed; don't touch req.body first
  const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "").update(raw).digest("hex");
  const got = Buffer.from(String(req.headers["x-paystack-signature"] || ""));
  if (!process.env.PAYSTACK_SECRET_KEY || got.length !== sig.length || !crypto.timingSafeEqual(got, Buffer.from(sig))) return send(res, 401, { error: "Bad signature." });
  try {
    const evt = JSON.parse(raw);
    if (evt.event === "charge.success") {
      const id = await db.get("ref:" + evt.data.reference);
      if (id) await settle(id, evt.data);
    }
  } catch (e) { console.error("Webhook error", e); }
  send(res, 200, { received: true });
}

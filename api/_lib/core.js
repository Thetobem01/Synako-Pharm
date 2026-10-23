/* Shared server helpers for Synako Pharmacy's API (Vercel serverless functions). */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";

/* ---------- Catalogue, settings and pricing (same files the website uses) ---------- */
let cache;
export function site() {
  if (cache) return cache;
  const sandbox = { window: {}, Intl, Math, Number, String, Date };
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);
  for (const f of ["js/config.js", "js/data.js", "js/pricing.js"]) {
    vm.runInContext(fs.readFileSync(path.join(process.cwd(), f), "utf8"), sandbox, { filename: f });
  }
  const w = sandbox.window;
  cache = { config: w.SYNAKO_CONFIG, P: w.SYNAKO.P, CATS: w.SYNAKO.CATS, pricing: w.SYNAKO_PRICING };
  return cache;
}

/* ---------- Storage: Upstash Redis over REST (Vercel Marketplace "Upstash for Redis") ---------- */
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const DEV = process.env.SYNAKO_DEV === "1";
const mem = globalThis.__synakoMem || (globalThis.__synakoMem = { kv: new Map(), z: new Map() });

export const storageReady = () => !!(REDIS_URL && REDIS_TOKEN) || DEV;

async function redis(cmd) {
  if (!REDIS_URL) return devRedis(cmd);
  const r = await fetch(REDIS_URL, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd), signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  if (j.error) throw new Error("Storage error: " + j.error);
  return j.result;
}
function devRedis([op, key, ...a]) { // in-memory stand-in, only when SYNAKO_DEV=1
  if (!DEV) throw new Error("Storage isn't configured.");
  switch (op) {
    case "GET": return mem.kv.has(key) ? mem.kv.get(key) : null;
    case "SET": mem.kv.set(key, a[0]); return "OK";
    case "INCR": { const n = Number(mem.kv.get(key) || 0) + 1; mem.kv.set(key, String(n)); return n; }
    case "EXPIRE": { const t = setTimeout(() => mem.kv.delete(key), Number(a[0]) * 1000); if (t.unref) t.unref(); return 1; }
    case "ZADD": { const z = mem.z.get(key) || new Map(); z.set(a[1], Number(a[0])); mem.z.set(key, z); return 1; }
    case "ZREVRANGE": { const z = [...(mem.z.get(key) || new Map()).entries()].sort((x, y) => y[1] - x[1]).map(e => e[0]); return z.slice(Number(a[0]), Number(a[1]) + 1); }
    default: throw new Error("Unsupported " + op);
  }
}
export const db = {
  async get(key) { const v = await redis(["GET", key]); return v ? JSON.parse(v) : null; },
  async set(key, val) { return redis(["SET", key, JSON.stringify(val)]); },
  async index(list, member, score) { return redis(["ZADD", list, String(score), member]); },
  async latest(list, n) { return (await redis(["ZREVRANGE", list, "0", String(n - 1)])) || []; }
};

/* ---------- Rate limits (per visitor IP; the window starts at their first attempt) ---------- */
export function clientIp(req) {
  const h = req.headers || {};
  return String(h["x-real-ip"] || String(h["x-forwarded-for"] || "").split(",")[0] || (req.socket && req.socket.remoteAddress) || "unknown").trim();
}
export async function limit(req, bucket, max, seconds, message) {
  if (process.env.RATE_LIMIT_OFF === "1") return;
  const key = `rl:${bucket}:${clientIp(req)}`;
  let n;
  try { n = await redis(["INCR", key]); if (n === 1) await redis(["EXPIRE", key, String(seconds)]); }
  catch (e) { console.error("Rate limit check failed", e); return; } // never block customers because the counter is down
  if (n > max) throw fail(429, message || "Too many attempts. Please wait a few minutes and try again.");
}

/* ---------- HTTP helpers ---------- */
export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
export async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}
export async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = typeof req.body === "string" ? req.body : await rawBody(req);
  try { const v = raw ? JSON.parse(raw) : {}; return v && typeof v === "object" ? v : {}; }
  catch (e) { throw fail(400, "We couldn't read that request. Please refresh the page and try again."); }
}
export const query = req => Object.fromEntries(new URL(req.url, "http://x").searchParams);
export function only(req, res, ...methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  send(res, 405, { error: "Method not allowed." });
  return false;
}
export function handle(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error(e);
      send(res, status, { error: status >= 500 ? "Something went wrong on our side. Please try again." : e.message });
    }
  };
}
export function fail(status, message) { const e = new Error(message); e.status = status; return e; }

/* ---------- Staff sign-in ---------- */
const SECRET = process.env.SESSION_SECRET || process.env.STAFF_PASSWORD || "";
const hmac = s => crypto.createHmac("sha256", SECRET).update(s).digest("hex");
export function staffReady() { return !!process.env.STAFF_PASSWORD; }
export function checkPassword(pw) {
  const a = Buffer.from(String(pw || "")), b = Buffer.from(process.env.STAFF_PASSWORD || "");
  return a.length === b.length && b.length > 0 && crypto.timingSafeEqual(a, b);
}
export function issueToken(hours = 12) { const exp = String(Date.now() + hours * 3600e3); return exp + "." + hmac(exp); }
export function requireStaff(req) {
  const t = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [exp, sig] = t.split(".");
  if (!SECRET || !exp || !sig || Number(exp) < Date.now()) throw fail(401, "Please sign in again.");
  const good = hmac(exp);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) throw fail(401, "Please sign in again.");
}

/* ---------- Orders ---------- */
export function newId(prefix = "SYN") {
  const abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = ""; for (let i = 0; i < 6; i++) s += abc[crypto.randomInt(abc.length)];
  return `${prefix}-${s}`;
}
export const digits = s => String(s || "").replace(/\D/g, "");
export const STATUS = {
  awaiting_payment: "Awaiting payment",
  pending_review: "Pharmacist review",
  info_needed: "More information needed",
  approved_awaiting_payment: "Approved, awaiting payment",
  rejected: "Not approved",
  paid: "Paid",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled"
};
/* What the customer may see: no date of birth, prescriber or health notes */
export function publicOrder(o) {
  return {
    id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: STATUS[o.status], rx: o.rx, rxRequest: o.rxRequest,
    items: o.items, subtotal: o.subtotal, deliveryFee: o.deliveryFee, total: o.total, priced: o.priced !== false,
    delivery: { speed: o.delivery.speed, label: o.delivery.label, city: o.delivery.city, state: o.delivery.state },
    note: ["info_needed", "rejected"].includes(o.status) ? o.note || "" : "",
    canPay: ["awaiting_payment", "approved_awaiting_payment"].includes(o.status) && o.priced !== false,
    history: o.history.filter(h => !h.internal).map(h => ({ t: h.t, m: h.m }))
  };
}
export function log(o, m, extra) { o.history.push(Object.assign({ t: new Date().toISOString(), m }, extra || {})); }

/* ---------- Email (optional, via Resend: RESEND_API_KEY, MAIL_FROM, STAFF_EMAIL) ---------- */
export const emailReady = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
const htmlEsc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/* Sends one email; never throws, so a mail problem can't break an order or payment */
export async function sendEmail(to, subject, lines) {
  if (!emailReady() || !to) return false;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1d2433">${lines.map(l => `<p>${l.html || htmlEsc(l)}</p>`).join("")}</div>`;
  const text = lines.map(l => l.text || l).join("\n\n");
  try {
    if (DEV && process.env.RESEND_API_KEY === "test") { console.log(`[email] to ${to}: ${subject}`); return true; }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text, reply_to: site().config.business.email || undefined })
    });
    if (!r.ok) console.error("Email failed", r.status, await r.text());
    return r.ok;
  } catch (e) { console.error("Email failed", e); return false; }
}
const link = (href, label) => ({ html: `<a href="${htmlEsc(href)}">${htmlEsc(label)}</a>`, text: `${label}: ${href}` });
/* The shop's public address: SITE_URL in the hosting settings wins, then site.url in js/config.js */
export const baseUrl = () => String(process.env.SITE_URL || site().config.site.url).replace(/\/$/, "");
/* For pages served to a visitor (sitemap, robots): a custom domain they reached us on beats a *.vercel.app default */
export function publicUrl(req) {
  const host = String((req.headers || {})["x-forwarded-host"] || (req.headers || {}).host || "").split(",")[0].trim().toLowerCase();
  if (process.env.SITE_URL || !host || /localhost|127\.0\.0\.1|\.vercel\.app$/.test(host) || !/^[a-z0-9.-]+(:\d+)?$/.test(host)) return baseUrl();
  return "https://" + host;
}
const naira = n => site().pricing.fmtMoney(n, site().config);
const CUSTOMER_MAIL = {
  placed: o => o.rx ? [`Thank you. We've received your order ${o.id} and your prescription. A pharmacist will review it during opening hours, and we'll email you when it's approved and ready to pay.`]
    : [`Thank you. We've received your order ${o.id} (${naira(o.total)}).`, "If you didn't finish paying, you can pay from the tracking page below."],
  paid: o => [`We've received your payment of ${naira(o.total)} for order ${o.id}. We're preparing it now.`],
  approve: o => [`Good news: our pharmacist has approved your prescription for order ${o.id}. The total is ${naira(o.total)}.`, "Open the tracking page below and press Pay now to complete your order."],
  info: o => [`Our pharmacist needs a little more information about order ${o.id}:`, `“${o.note}”`, "Please call or message us, quoting your order number."],
  reject: o => [`Our pharmacist couldn't approve the prescription for order ${o.id}:`, `“${o.note}”`, "You haven't been charged. Please contact us if you have any questions."],
  dispatched: o => [`Your order ${o.id} is on its way.`],
  delivered: o => [`Your order ${o.id} has been delivered. Thank you for choosing ${site().config.business.name}.`]
};
const SUBJECT = { placed: "Order received", paid: "Payment received", approve: "Prescription approved, ready to pay", info: "We need more information", reject: "Prescription not approved", dispatched: "Your order is on its way", delivered: "Your order has been delivered" };
export async function notifyCustomer(o, event) {
  const make = CUSTOMER_MAIL[event];
  if (!make) return;
  const name = String(o.customer.name || "").split(" ")[0];
  await sendEmail(o.customer.email, `${SUBJECT[event]} · ${o.id}`, [`Hello ${name},`, ...make(o), link(`${baseUrl()}/track/${o.id}`, "Track your order"),
    `${site().config.business.name}. Your pathway to health and wellness.`]);
}
/* Staff alerts carry no health details: just the order number and a link to the desk */
export async function notifyStaff(o, event) {
  const to = process.env.STAFF_EMAIL;
  if (!to) return;
  const what = event === "paid" ? `Payment received for ${o.id} (${naira(o.total)}). Ready to pack.`
    : o.rx ? `New prescription order ${o.id} is waiting for pharmacist review.` : `New order ${o.id} placed (${naira(o.total)}), awaiting payment.`;
  await sendEmail(to, `${event === "paid" ? "Paid" : o.rx ? "To review" : "New order"} · ${o.id}`, [what, link(`${baseUrl()}/pharmacist`, "Open the Pharmacist Desk")]);
}

/* ---------- Paystack ---------- */
export const paystackReady = () => !!(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_PUBLIC_KEY);
export async function paystackVerify(reference) {
  if (process.env.PAYSTACK_MOCK === "1" && DEV) return { status: "success", reference, amount: null, currency: "NGN", channel: "test", paid_at: new Date().toISOString(), mock: true };
  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
  const j = await r.json();
  if (!j.status) throw fail(502, "We couldn't confirm the payment with Paystack. If you were charged, contact us with your order number.");
  return j.data;
}
/* Mark an order paid after checking amount and currency; safe to call twice */
export async function settle(orderId, tx) {
  const o = await db.get("order:" + orderId);
  if (!o) throw fail(404, "Order not found.");
  if (["paid", "packed", "out_for_delivery", "delivered"].includes(o.status)) return o;
  const kobo = Math.round(o.total * 100);
  if (tx.status !== "success") throw fail(402, "The payment didn't go through. You haven't been charged.");
  if (!tx.mock && (Number(tx.amount) !== kobo || tx.currency !== "NGN")) {
    log(o, `Payment amount mismatch: received ${tx.amount} ${tx.currency}, expected ${kobo} NGN`, { internal: true });
    await db.set("order:" + o.id, o);
    throw fail(409, "The payment amount didn't match your order. Our team will contact you.");
  }
  o.status = "paid";
  o.payment = Object.assign(o.payment || {}, { status: "paid", reference: tx.reference, channel: tx.channel, paidAt: tx.paid_at || new Date().toISOString() });
  log(o, `Payment received · ${tx.channel || "Paystack"}`);
  log(o, "Order recorded for the National Electronic Pharmacy Platform (integration pending)", { internal: true });
  await db.set("order:" + o.id, o);
  await Promise.all([notifyCustomer(o, "paid"), notifyStaff(o, "paid")]);
  return o;
}

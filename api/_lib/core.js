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
  cache = { config: w.SYNAKO_CONFIG, P: w.SYNAKO.P, pricing: w.SYNAKO_PRICING };
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
  const r = await fetch(REDIS_URL, { method: "POST", headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error("Storage error: " + j.error);
  return j.result;
}
function devRedis([op, key, ...a]) { // in-memory stand-in, only when SYNAKO_DEV=1
  if (!DEV) throw new Error("Storage isn't configured.");
  switch (op) {
    case "GET": return mem.kv.has(key) ? mem.kv.get(key) : null;
    case "SET": mem.kv.set(key, a[0]); return "OK";
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
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const raw = await rawBody(req);
  return raw ? JSON.parse(raw) : {};
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
  return o;
}

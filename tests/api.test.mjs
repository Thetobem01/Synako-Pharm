/* End-to-end checks of the order API against the local dev server (in-memory storage, test payments) */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ["dev/server.mjs"], {
    env: { ...process.env, PORT: String(PORT), SYNAKO_DEV: "1", PAYSTACK_MOCK: "1", STAFF_PASSWORD: "desk", SESSION_SECRET: "test-secret",
      RESEND_API_KEY: "test", MAIL_FROM: "Synako <orders@example.com>", STAFF_EMAIL: "desk@example.com", PAYSTACK_SECRET_KEY: "", KV_REST_API_URL: "", UPSTASH_REDIS_REST_URL: "" },
    stdio: ["ignore", "pipe", "inherit"]
  });
  await new Promise((ok, no) => {
    server.stdout.on("data", d => { if (String(d).includes("http://localhost")) ok(); });
    server.on("exit", c => no(new Error("dev server exited " + c)));
  });
});
after(() => server && server.kill());

async function api(path, opts = {}) {
  const r = await fetch(BASE + "/api/" + path, { method: opts.body !== undefined || opts.raw !== undefined ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: "Bearer " + opts.token } : {}), ...(opts.headers || {}) },
    body: opts.raw !== undefined ? opts.raw : opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
const ip = n => ({ "x-real-ip": `10.0.0.${n}` });
const customer = { name: "Ada Test", phone: "0803 123 4567", email: "ada@example.com", dob: "1990-01-01" };
const delivery = { state: "Lagos", city: "Ikeja", addr: "1 Test Street", speed: "nextday" };
const today = new Date().toISOString().slice(0, 10);
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("health reports which features are on", async () => {
  const { status, json } = await api("health");
  assert.equal(status, 200);
  assert.equal(json.orders, true);
  assert.equal(json.email, true);
});

test("an over-the-counter order is priced on the server and can be paid", async () => {
  const placed = await api("orders", { body: { items: [{ id: "para", q: 2, price: 1 }], customer, delivery, consent: true }, headers: ip(1) });
  assert.equal(placed.status, 201);
  const o = placed.json.order;
  assert.equal(o.status, "awaiting_payment");
  assert.ok(o.subtotal > 2, "price sent by the browser is ignored");
  assert.equal(o.canPay, true);

  const start = await api("pay-start", { body: { id: o.id, phone: "4567" } });
  assert.equal(start.status, 200);
  assert.equal(start.json.amount, Math.round(o.total * 100));
  const paid = await api("pay-verify", { body: { reference: start.json.reference } });
  assert.equal(paid.status, 200);
  assert.equal(paid.json.order.status, "paid");

  const again = await api("pay-verify", { body: { reference: start.json.reference } });
  assert.equal(again.json.order.status, "paid", "verifying twice is harmless");
});

test("tracking needs the right phone digits and hides private details", async () => {
  const { json } = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true }, headers: ip(2) });
  const id = json.order.id;
  assert.equal((await api(`order?id=${id}&phone=0000`)).status, 404);
  assert.equal((await api(`order?id=${id}&phone=`)).status, 404);
  const ok = await api(`order?id=${id.toLowerCase()}&phone=4567`);
  assert.equal(ok.status, 200);
  assert.equal(ok.json.order.customer, undefined);
  assert.equal(ok.json.order.delivery.addr, undefined);
  assert.equal((await api("pay-start", { body: { id, phone: "" } })).status, 404);
});

test("orders are refused for under-18s, missing consent or an empty basket", async () => {
  const young = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer: { ...customer, dob: today }, delivery, consent: true }, headers: ip(3) });
  assert.equal(young.status, 400);
  const noConsent = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery }, headers: ip(3) });
  assert.equal(noConsent.status, 400);
  const empty = await api("orders", { body: { items: [], customer, delivery, consent: true }, headers: ip(3) });
  assert.equal(empty.status, 400);
});

test("malformed requests get a 400, not a server error", async () => {
  assert.equal((await api("orders", { raw: "{not json", headers: ip(4) })).status, 400);
  assert.equal((await api("orders", { raw: "null", headers: ip(4) })).status, 400);
  assert.equal((await api("health", { body: {} })).status, 200);
  assert.equal((await api("order", { body: {} })).status, 405);
});

test("prescription orders wait for a pharmacist, who can approve them for payment", async () => {
  const prescription = { pname: "Dr K. Eze", preg: "MDCN 123", pphone: "0800 000 0001", pclinic: "Test Clinic", pdate: today, file: { name: "rx.png", data: tinyPng } };
  const placed = await api("orders", { body: { items: [{ id: "amox", q: 1 }], customer, delivery, consent: true, prescription }, headers: ip(5) });
  assert.equal(placed.status, 201);
  const o = placed.json.order;
  assert.equal(o.status, "pending_review");
  assert.equal(o.canPay, false);
  assert.equal((await api("pay-start", { body: { id: o.id, phone: "4567" } })).status, 409, "can't pay before approval");

  assert.equal((await api("staff/orders")).status, 401);
  const login = await api("staff/login", { body: { password: "desk" }, headers: ip(6) });
  assert.equal(login.status, 200);
  const token = login.json.token;

  const desk = await api("staff/orders", { token });
  assert.ok(desk.json.orders.some(x => x.id === o.id));
  assert.ok(Array.isArray(desk.json.setup));
  const full = await api(`staff/order?id=${o.id}`, { token });
  assert.equal(full.json.file.data, tinyPng);
  assert.deepEqual(full.json.order.actions, ["approve", "info", "reject"]);

  assert.equal((await api("staff/order", { token, body: { id: o.id, action: "delivered" } })).status, 409, "steps can't be skipped");
  assert.equal((await api("staff/order", { token, body: { id: o.id, action: "reject" } })).status, 400, "a rejection needs a note");
  const ok = await api("staff/order", { token, body: { id: o.id, action: "approve", by: "Pharm. Test" } });
  assert.equal(ok.json.order.status, "approved_awaiting_payment");

  const track = await api(`order?id=${o.id}&phone=4567`);
  assert.equal(track.json.order.canPay, true);
  assert.ok(!track.json.order.history.some(h => /Pharm\. Test/.test(h.m)), "staff names stay internal");
});

test("old prescriptions are refused", async () => {
  const prescription = { pname: "Dr K. Eze", preg: "MDCN 123", pphone: "0800 000 0001", pclinic: "Test Clinic", pdate: "2020-01-01", file: { name: "rx.png", data: tinyPng } };
  const r = await api("orders", { body: { items: [{ id: "amox", q: 1 }], customer, delivery, consent: true, prescription }, headers: ip(7) });
  assert.equal(r.status, 400);
});

test("a forged staff token is refused", async () => {
  const exp = String(Date.now() + 3600e3);
  assert.equal((await api("staff/orders", { token: exp + ".deadbeef" })).status, 401);
  assert.equal((await api("staff/orders", { token: "1." + crypto.createHmac("sha256", "test-secret").update("1").digest("hex") })).status, 401, "expired");
});

test("messages are stored, and bot submissions are quietly dropped", async () => {
  const ok = await api("requests", { body: { type: "message", name: "Ada", phone: "08031234567", message: "Hi" }, headers: ip(8) });
  assert.equal(ok.status, 201);
  const bot = await api("requests", { body: { type: "message", name: "Bot", phone: "08031234567", website: "http://spam" }, headers: ip(8) });
  assert.equal(bot.status, 201);
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(9) })).json.token;
  const names = (await api("staff/orders", { token })).json.requests.map(r => r.name);
  assert.ok(names.includes("Ada"));
  assert.ok(!names.includes("Bot"));
});

test("webhook calls without Paystack's signature are refused", async () => {
  const r = await api("paystack-webhook", { body: { event: "charge.success", data: { reference: "x" } }, headers: { "x-paystack-signature": "bad" } });
  assert.equal(r.status, 401);
});

test("repeated wrong staff passwords are slowed down", async () => {
  let last;
  for (let i = 0; i < 9; i++) last = await api("staff/login", { body: { password: "wrong" }, headers: ip(10) });
  assert.equal(last.status, 429);
  const other = await api("staff/login", { body: { password: "desk" }, headers: ip(11) });
  assert.equal(other.status, 200, "other visitors aren't affected");
});

test("sitemap and robots follow the catalogue and site address", async () => {
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  assert.match(sm, /\/product\/para</);
  const robots = await (await fetch(BASE + "/robots.txt")).text();
  assert.match(robots, /Disallow: \/pharmacist/);
  assert.match(robots, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

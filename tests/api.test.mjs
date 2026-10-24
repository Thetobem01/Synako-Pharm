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

test("the deep health check confirms the order database answers", async () => {
  const { status, json } = await api("health?deep=1");
  assert.equal(status, 200);
  assert.equal(json.storage.ok, true);
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

test("a wholesale order keeps its units and alcohol is flagged for an ID check", async () => {
  const placed = await api("orders", { body: { items: [{ id: "glove-nitrile", q: 2, u: "10" }, { id: "lager", q: 1, u: "24" }], customer, delivery, consent: true }, headers: ip(12) });
  assert.equal(placed.status, 201);
  const o = placed.json.order;
  assert.equal(o.items[0].unit, "10");
  assert.equal(o.items[0].qty, 2);
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(13) })).json.token;
  const full = (await api(`staff/order?id=${o.id}`, { token })).json.order;
  assert.equal(full.ageRestricted, true);
  assert.equal(full.packs, 44);
  assert.ok(full.history.some(h => /photo ID/.test(h.m)));
});

test("orders too large to pay online are sent to a trade quote", async () => {
  const r = await api("orders", { body: { items: [{ id: "scale-hosp", q: 100, u: "5" }], customer, delivery, consent: true }, headers: ip(14) });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /trade/);
});

test("trade quote requests need a business name and a product list", async () => {
  assert.equal((await api("requests", { body: { type: "trade", name: "Ada", phone: "08031234567" }, headers: ip(15) })).status, 400);
  const ok = await api("requests", { body: { type: "trade", name: "Ada", phone: "08031234567", business: "Ada Pharmacy", message: "Paracetamol × 20 cartons", state: "Kano" }, headers: ip(15) });
  assert.equal(ok.status, 201);
  assert.match(ok.json.id, /^TRD-/);
});

test("tracking needs the right phone digits and hides private details", async () => {
  const { json } = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true }, headers: ip(2) });
  const id = json.order.id;
  assert.equal((await api(`order?id=${id}&phone=0000`)).status, 404);
  assert.equal((await api(`order?id=${id}&phone=`)).status, 404);
  const ok = await api(`order?id=${id.toLowerCase()}&phone=4567`);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.order.customer, { name: customer.name }, "only the name, for the receipt");
  assert.equal(ok.json.order.payment.status, "unpaid");
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

test("staff can mark a message as handled", async () => {
  const sent = await api("requests", { body: { type: "message", name: "Bola", phone: "08031234567", message: "Is Milo in stock?" }, headers: ip(16) });
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(17) })).json.token;
  assert.equal((await api("staff/orders", { body: { id: sent.json.id, status: "done" } })).status, 401);
  const done = await api("staff/orders", { token, body: { id: sent.json.id, status: "done", by: "Pharm. Test" } });
  assert.equal(done.json.request.status, "done");
  assert.equal(done.json.request.handledBy, "Pharm. Test");
  assert.equal((await api("staff/orders", { token, body: { id: "MSG-NOPE00", status: "done" } })).status, 404);
});

test("the order note reaches the pharmacist", async () => {
  const placed = await api("orders", { body: { items: [{ id: "glove-latex", q: 1 }], customer, delivery: { ...delivery, note: "Size L please" }, consent: true }, headers: ip(18) });
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(19) })).json.token;
  const full = (await api(`staff/order?id=${placed.json.order.id}`, { token })).json.order;
  assert.equal(full.delivery.note, "Size L please");
});

test("staff can send a test email, only to the shop's own inbox", async () => {
  assert.equal((await api("staff/orders", { body: { action: "test-email" } })).status, 401);
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(20) })).json.token;
  const r = await api("staff/orders", { token, body: { action: "test-email", to: "stranger@example.com" } });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.to, "d…@example.com", "always the STAFF_EMAIL inbox, masked");
});

test("each order records whether its emails were sent", async () => {
  const placed = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true }, headers: ip(21) });
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(22) })).json.token;
  const h = (await api(`staff/order?id=${placed.json.order.id}`, { token })).json.order.history.map(x => x.m);
  assert.ok(h.some(m => /Email to customer "Order received.*": sent/.test(m)), "customer email recorded");
  assert.ok(h.some(m => /Email to staff "New order.*": sent/.test(m)), "staff alert recorded");
  const pub = (await api(`order?id=${placed.json.order.id}&phone=4567`)).json.order.history.map(x => x.m);
  assert.ok(!pub.some(m => /Email to/.test(m)), "customers don't see these lines");
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

test("sitemap follows a custom domain and leaves out alcohol", async () => {
  const sm = await (await fetch(BASE + "/sitemap.xml", { headers: { "x-forwarded-host": "www.synakopharmacy.com" } })).text();
  assert.match(sm, /<loc>https:\/\/www\.synakopharmacy\.com\/product\/para<\/loc>/);
  assert.doesNotMatch(sm, /\/product\/sweet-red/);
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(locs).size, locs.length, "no address is listed twice");
  const odd = await (await fetch(BASE + "/robots.txt", { headers: { "x-forwarded-host": "evil.com/<x>" } })).text();
  assert.doesNotMatch(odd, /evil/);
});

test("sitemap and robots follow the catalogue and site address", async () => {
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  assert.match(sm, /\/product\/para</);
  const robots = await (await fetch(BASE + "/robots.txt")).text();
  assert.match(robots, /Disallow: \/pharmacist/);
  assert.match(robots, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

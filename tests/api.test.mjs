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
      RIDER_PASSWORD: "ride", TERMII_API_KEY: "test", STAFF_SMS: "08011112222", CRON_SECRET: "cron-secret",
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

test("a made-up promo code is refused by the server", async () => {
  const r = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true, promo: "FREEMONEY" }, headers: ip(26) });
  assert.equal(r.status, 400);
  assert.match(r.json.error, /isn't valid/);
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
  const row = desk.json.orders.find(x => x.id === o.id);
  assert.ok(row);
  for (const k of ["speedId", "city", "state", "phone"]) assert.ok(k in row, `desk list carries ${k} for sorting and search`);
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

test("stock marked on the desk stops orders, and waiting customers are told when it's back", async () => {
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(23) })).json.token;
  assert.equal((await api("staff/orders", { body: { action: "stock", id: "vitc", out: true } })).status, 401);
  const ask = await api("requests", { body: { type: "restock", product: "vitc", contact: "bola@example.com" }, headers: ip(24) });
  assert.equal(ask.status, 201);
  assert.equal((await api("requests", { body: { type: "restock", product: "vitc", contact: "nope" }, headers: ip(24) })).status, 400);
  assert.equal((await api("requests", { body: { type: "restock", product: "not-a-product", contact: "08031234567" }, headers: ip(24) })).status, 400);

  const off = await api("staff/orders", { token, body: { action: "stock", id: "vitc", out: true } });
  assert.deepEqual(off.json.out, ["vitc"]);
  assert.deepEqual((await api("health")).json.out, ["vitc"], "the shop learns it's out");
  const refused = await api("orders", { body: { items: [{ id: "vitc", q: 1 }], customer, delivery, consent: true }, headers: ip(25) });
  assert.equal(refused.status, 409);
  assert.match(refused.json.error, /out of stock/);

  const on = await api("staff/orders", { token, body: { action: "stock", id: "vitc", out: false, by: "Pharm. Test" } });
  assert.deepEqual(on.json.out, []);
  assert.equal(on.json.told, 1, "the customer who asked by email is told");
  const req = (await api("staff/orders", { token })).json.requests.find(r => r.id === ask.json.id);
  assert.equal(req.status, "done");
  assert.equal((await api("orders", { body: { items: [{ id: "vitc", q: 1 }], customer, delivery, consent: true }, headers: ip(25) })).status, 201);
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
  assert.match(robots, /Disallow: \/desk/);
  assert.match(robots, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

async function paidOrder(n) {
  const placed = await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true }, headers: ip(n) });
  const start = await api("pay-start", { body: { id: placed.json.order.id, phone: "4567" }, headers: ip(n) });
  return (await api("pay-verify", { body: { reference: start.json.reference }, headers: ip(n) })).json.order;
}

test("paid orders get a delivery code, and the desk needs it to mark them delivered", async () => {
  const o = await paidOrder(40);
  assert.match(o.deliveryCode, /^\d{4}$/, "the customer sees their code once paid");
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(41) })).json.token;
  const h = (await api(`staff/order?id=${o.id}`, { token })).json.order.history.map(x => x.m);
  assert.ok(h.some(m => /SMS to customer "paid": sent/.test(m)), "payment text recorded");
  assert.ok(h.some(m => /SMS to staff .*: sent/.test(m)), "the shop's phone is told too");

  await api("staff/order", { token, body: { id: o.id, action: "packed", by: "Pharm. Test" } });
  const out = await api("staff/order", { token, body: { id: o.id, action: "dispatched", rider: "Musa Bello", by: "Pharm. Test" } });
  assert.equal(out.json.order.rider, "Musa Bello");
  assert.equal((await api(`order?id=${o.id}&phone=4567`)).json.order.rider, "Musa", "the customer sees who is coming");

  assert.equal((await api("staff/order", { token, body: { id: o.id, action: "delivered" }, headers: ip(42) })).status, 400, "no code and no reason");
  const wrong = String((Number(o.deliveryCode) + 1) % 10000).padStart(4, "0");
  assert.equal((await api("staff/order", { token, body: { id: o.id, action: "delivered", code: wrong }, headers: ip(42) })).status, 400);
  const done = await api("staff/order", { token, body: { id: o.id, action: "delivered", code: o.deliveryCode }, headers: ip(42) });
  assert.equal(done.json.order.status, "delivered");
  assert.equal((await api(`order?id=${o.id}&phone=4567`)).json.order.deliveryCode, "", "the code is hidden once delivered");
});

test("riders sign in with their own password and only see deliveries", async () => {
  assert.equal((await api("staff/login", { body: { password: "ride" }, headers: ip(43) })).status, 401, "not a desk password");
  const r = await api("staff/login", { body: { password: "ride", role: "rider" }, headers: ip(43) });
  assert.equal(r.json.role, "rider");
  const rider = r.json.token;
  assert.equal((await api("staff/orders", { token: rider })).status, 401, "riders can't open the desk");
  assert.equal((await api("staff/order?id=SYN-NOPE00", { token: rider })).status, 401);
  assert.equal((await api("staff/orders", { token: rider, body: { action: "stock", id: "vitc", out: true } })).status, 401);

  const o = await paidOrder(44);
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(45) })).json.token;
  await api("staff/order", { token, body: { id: o.id, action: "packed" } });
  const list = (await api("staff/orders?view=rider", { token: rider })).json.deliveries;
  const d = list.find(x => x.id === o.id);
  assert.ok(d, "packed orders are listed");
  assert.equal(d.addr, delivery.addr);
  assert.equal(typeof d.items, "number", "item count only, no medicine names");

  const take = await api("staff/orders", { token: rider, body: { action: "rider-take", id: o.id, by: "Musa" } });
  assert.equal(take.json.deliveries.find(x => x.id === o.id).rider, "Musa");
  assert.equal((await api("staff/orders", { token: rider, body: { action: "rider-take", id: o.id, by: "Tunde" } })).status, 409, "two riders can't take one order");
  const wrong = String((Number(o.deliveryCode) + 1) % 10000).padStart(4, "0");
  assert.equal((await api("staff/orders", { token: rider, body: { action: "rider-delivered", id: o.id, code: wrong }, headers: ip(46) })).status, 400);
  const done = await api("staff/orders", { token: rider, body: { action: "rider-delivered", id: o.id, code: o.deliveryCode, by: "Musa" }, headers: ip(46) });
  assert.equal(done.status, 200);
  assert.equal((await api(`order?id=${o.id}&phone=4567`)).json.order.status, "delivered");
  const log = done.json.deliveries.find(x => x.id === o.id);
  assert.equal(log.status, "delivered", "today's deliveries stay on the rider page");
  assert.ok(log.deliveredAt && log.outAt && log.rider === "Musa");
  assert.equal(log.phone ?? log.addr, undefined, "no phone or address once delivered");
});

test("unpaid orders get one reminder, then are cancelled; a late payment still counts", async () => {
  const placed = (await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true }, headers: ip(47) })).json.order;
  const late = (await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true }, headers: ip(47) })).json.order;
  const started = (await api("pay-start", { body: { id: late.id, phone: "4567" }, headers: ip(47) })).json.reference;
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(48) })).json.token;
  assert.equal((await api("staff/orders", { body: { action: "reminders" } })).status, 401);

  const first = await api("staff/orders", { token, body: { action: "reminders", now: Date.now() + 3 * 3600e3 } });
  assert.ok(first.json.reminded >= 2);
  await api("staff/orders", { token, body: { action: "reminders", now: Date.now() + 4 * 3600e3 } });
  const h = (await api(`staff/order?id=${placed.id}`, { token })).json.order.history.map(x => x.m);
  assert.equal(h.filter(m => m === "Payment reminder sent").length, 1, "only one reminder");
  assert.ok(h.some(m => /Email to customer "Your order is waiting for payment/.test(m)));
  assert.ok(h.some(m => /SMS to customer "reminder": sent/.test(m)));

  const later = await api("staff/orders", { token, body: { action: "reminders", now: Date.now() + 49 * 3600e3 } });
  assert.ok(later.json.cancelled >= 2);
  assert.equal((await api(`order?id=${placed.id}&phone=4567`)).json.order.status, "cancelled");
  const paid = await api("pay-verify", { body: { reference: started }, headers: ip(47) });
  assert.equal(paid.json.order.status, "paid", "a payment that was already under way reinstates the order");

  assert.equal((await api("staff/orders?task=reminders")).status, 401, "the daily job needs its secret");
  assert.equal((await api("staff/orders?task=reminders", { headers: { Authorization: "Bearer cron-secret" } })).status, 200);
});

test("supply: wholesalers, the shortage list, purchase orders and restocking", async () => {
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(60) })).json.token;
  const rider = (await api("staff/login", { body: { password: "ride", role: "rider" }, headers: ip(60) })).json.token;
  assert.equal((await api("staff/orders?view=supply", { token: rider })).status, 401, "riders can't see supply");
  const starter = (await api("staff/orders?view=supply", { token })).json.suppliers;
  assert.ok(starter.some(s => s.name === "Tuyil Pharmaceuticals LTD" && s.leadDays === 5), "the starter list from js/config.js is there before any changes");
  assert.equal(new Set(starter.map(s => s.id)).size, starter.length, "starter wholesalers each get their own id");
  assert.equal((await api("staff/orders", { token, body: { action: "supplier-save", supplier: { name: "No Contact Ltd" } } })).status, 400, "a wholesaler needs a way to be reached");
  const saved = await api("staff/orders", { token, body: { action: "supplier-save", supplier: { name: "Ondo Pharma Wholesale", phone: "08030000000", email: "orders@ondo-wholesale.example", leadDays: 3 } } });
  const sup = saved.json.suppliers.find(s => s.name === "Ondo Pharma Wholesale");
  assert.ok(sup);

  await api("staff/orders", { token, body: { action: "stock", id: "amlo", out: true, by: "Pharm. Test" } });
  const low = await api("staff/orders", { token, body: { action: "stock-low", id: "ors", low: true, by: "Pharm. Test" } });
  assert.ok(low.json.low.includes("ors"));
  await api("requests", { body: { type: "restock", product: "amlo", contact: "kemi@example.com" }, headers: ip(61) });
  const view = (await api("staff/orders?view=supply", { token })).json;
  const amlo = view.shortages.find(s => s.id === "amlo"), ors = view.shortages.find(s => s.id === "ors");
  assert.equal(amlo.state, "out");
  assert.equal(amlo.waiting, 1, "customers waiting are counted");
  assert.equal(ors.state, "low");
  assert.ok(view.shortages.indexOf(amlo) < view.shortages.indexOf(ors), "out of stock with customers waiting comes first");

  assert.equal((await api("staff/orders", { token, body: { action: "po-create", supplier: sup.id, lines: [] } })).status, 400);
  const made = await api("staff/orders", { token, body: { action: "po-create", supplier: sup.id, lines: [{ id: "amlo", qty: 20 }, { id: "ors", qty: 50 }], by: "Supply Manager" } });
  assert.equal(made.status, 201);
  const po = made.json.po;
  assert.match(po.id, /^PO-/);
  assert.equal(po.status, "draft");
  assert.ok(po.expected, "the delivery date follows the wholesaler's usual lead time");
  assert.equal(made.json.shortages.find(s => s.id === "amlo").onOrder[0].po, po.id, "the shortage shows it's on order");

  const sent = await api("staff/orders", { token, body: { action: "po-update", id: po.id, po: "send", via: "email" } });
  assert.equal(sent.json.po.status, "sent");
  assert.ok(sent.json.po.history.some(h => /Emailed to orders@ondo-wholesale.example .*: sent/.test(h.m)));
  const late = await api("staff/orders", { token, body: { action: "supply-digest", now: Date.now() + 10 * 864e5 } });
  assert.ok(late.json.overdue >= 1, "an unconfirmed, overdue order shows in the daily summary");

  const got = await api("staff/orders", { token, body: { action: "po-update", id: po.id, po: "received", by: "Supply Manager" } });
  assert.equal(got.json.po.status, "received");
  assert.ok(!got.json.shortages.some(s => s.id === "amlo" || s.id === "ors"), "received items leave the shortage list");
  assert.ok(!(await api("health")).json.out.includes("amlo"), "and are back in stock for customers");
  assert.ok(got.json.po.history.some(h => /1 waiting customer emailed/.test(h.m)));
  assert.equal((await api("staff/orders", { token, body: { action: "po-update", id: po.id, po: "cancel" } })).status, 409, "a received order can't be cancelled");

  const gone = await api("staff/orders", { token, body: { action: "supplier-delete", id: sup.id } });
  assert.ok(!gone.json.suppliers.some(s => s.id === sup.id));
  assert.ok(gone.json.suppliers.some(s => s.name === "Tuyil Pharmaceuticals LTD"), "the starter wholesaler is kept once the list is saved");
});

test("the journal: starter posts, posts from the desk, scheduling and customer stories", async () => {
  const lagos = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const later = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
  const pub = async () => (await api("requests")).json.posts;
  const first = await pub();
  assert.ok(first.every(p => p.date <= lagos), "nothing shows before its date");
  assert.ok(first.every(p => !("status" in p) && !("updatedBy" in p)), "the public list carries no desk details");

  assert.equal((await api("staff/orders", { body: { action: "journal-save", post: { title: "x", body: "y".repeat(30) } } })).status, 401, "only staff can post");
  const token = (await api("staff/login", { body: { password: "desk" }, headers: ip(21) })).json.token;
  const save = post => api("staff/orders", { token, body: { action: "journal-save", by: "Pharm. Test", post } });
  assert.equal((await save({ title: "", body: "Some words about today at the pharmacy." })).status, 400);

  const today = await save({ title: "A busy Thursday", kind: "diary", date: lagos, body: "Lots of orders for **vitamin C** today.\n\n- Item one\n- Item two" });
  assert.equal(today.status, 200);
  assert.equal(today.json.post.id, "a-busy-thursday");
  const again = await save({ title: "A busy Thursday", kind: "diary", date: lagos, body: "A second post with the same title." });
  assert.equal(again.json.post.id, "a-busy-thursday-2", "each post gets its own address");
  await save({ title: "Coming next week", kind: "tip", date: later, body: "This one is scheduled for later in the week." });
  await save({ title: "Not ready yet", kind: "diary", date: lagos, status: "draft", body: "Still writing this one, staff only for now." });

  let live = await pub();
  assert.ok(live.some(p => p.id === "a-busy-thursday" && p.author === "Synako Pharmacy"));
  assert.ok(!live.some(p => p.title === "Coming next week"), "scheduled posts wait for their date");
  assert.ok(!live.some(p => p.title === "Not ready yet"), "drafts stay on the desk");

  const desk = (await api("staff/orders", { token })).json;
  assert.ok(desk.posts.some(p => p.title === "Not ready yet" && p.status === "draft"), "the desk sees drafts");
  assert.ok(desk.posts.some(p => p.id === "welcome-to-the-synako-journal" && p.starter), "and the starter posts");

  const edited = await save({ id: "welcome-to-the-synako-journal", title: "Welcome to our journal", kind: "diary", date: "2026-10-29", body: "An edited welcome post from the desk team." });
  assert.equal(edited.json.post.id, "welcome-to-the-synako-journal", "editing a starter post keeps its address");
  assert.equal(edited.json.posts.filter(p => p.id === "welcome-to-the-synako-journal").length, 1);
  const hidden = await api("staff/orders", { token, body: { action: "journal-hide", id: "a-busy-thursday-2" } });
  assert.equal(hidden.json.posts.find(p => p.id === "a-busy-thursday-2").status, "hidden");
  live = await pub();
  assert.ok(!live.some(p => p.id === "a-busy-thursday-2"), "removed posts leave the journal");

  // A customer shares their experience; the desk turns it into a story
  assert.equal((await api("requests", { body: { type: "experience", name: "Bisi", rating: 9, message: "Fast delivery!" }, headers: ip(22) })).status, 400);
  const exp = await api("requests", { body: { type: "experience", name: "Bisi", town: "Okitipupa", rating: 5, message: "The rider came in 25 minutes. Thank you!", publish: true }, headers: ip(22) });
  assert.equal(exp.status, 201);
  const r = (await api("staff/orders", { token })).json.requests.find(x => x.id === exp.json.id);
  assert.equal(r.type, "experience"); assert.equal(r.rating, 5); assert.equal(r.publish, true);
  const story = await save({ title: "“The rider came in 25 minutes.”", kind: "story", date: lagos, story: r.id, body: `${r.message}\n\n— Bisi, Okitipupa` });
  assert.equal(story.status, 200);
  assert.equal((await api("staff/orders", { token })).json.requests.find(x => x.id === r.id).status, "done", "publishing the story marks the experience as read");

  // The week in review is drafted from the week's orders, without customer details
  const placed = (await api("orders", { body: { items: [{ id: "para", q: 1 }], customer: { ...customer, name: "Zainab Secret" }, delivery, consent: true }, headers: ip(23) })).json.order;
  const ref = (await api("pay-start", { body: { id: placed.id, phone: "4567" } })).json.reference;
  await api("pay-verify", { body: { reference: ref } });
  const week = (await api("staff/orders", { token, body: { action: "journal-week" } })).json.draft;
  assert.equal(week.kind, "week");
  assert.match(week.title, /^Week in review: /);
  assert.ok(week.stats.placed >= 1 && week.stats.paid >= 1);
  assert.ok(week.stats.stories >= 1);
  assert.ok(!week.body.includes("Zainab") && !week.body.includes(placed.id) && !/paracetamol/i.test(week.body), "no names, order numbers or medicines");
  assert.match(week.body, /medicines/, "departments are named instead");
});

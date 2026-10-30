/* The till (/pos): counter sales, stock counts, shelf prices and customer records, against the local dev server */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import vm from "node:vm";

const PORT = 4000 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
let server, staff, till;

before(async () => {
  server = spawn(process.execPath, ["dev/server.mjs"], {
    env: { ...process.env, PORT: String(PORT), SYNAKO_DEV: "1", PAYSTACK_MOCK: "1", STAFF_PASSWORD: "desk", SESSION_SECRET: "test-secret", RIDER_PASSWORD: "ride", POS_PASSWORD: "till",
      RESEND_API_KEY: "test", MAIL_FROM: "Synako <orders@example.com>", STAFF_EMAIL: "desk@example.com", TERMII_API_KEY: "", RATE_LIMIT_OFF: "1", KV_REST_API_URL: "", UPSTASH_REDIS_REST_URL: "" },
    stdio: ["ignore", "pipe", "inherit"]
  });
  await new Promise((ok, no) => {
    server.stdout.on("data", d => { if (String(d).includes("http://localhost")) ok(); });
    server.on("exit", c => no(new Error("dev server exited " + c)));
  });
  staff = (await api("staff/login", { body: { password: "desk", role: "pos" } })).json.token;
  till = (await api("staff/login", { body: { password: "till", role: "pos" } })).json.token;
});
after(() => server && server.kill());

async function api(path, opts = {}) {
  const r = await fetch(BASE + "/api/" + path, { method: opts.body !== undefined ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: "Bearer " + opts.token } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
const pos = (body, token = till) => api("staff/orders", { body: Object.assign({ by: "Tolu" }, body), token });
const item = (view, id) => view.items.find(i => i.id === id);

test("the till password opens the till, but not the desk or the rider page", async () => {
  assert.ok(till && staff);
  assert.equal((await api("staff/orders?view=pos", { token: till })).status, 200);
  assert.equal((await api("staff/orders", { token: till })).status, 401, "no desk");
  assert.equal((await api("staff/orders?view=rider", { token: till })).status, 401, "no deliveries");
  const rider = (await api("staff/login", { body: { password: "ride", role: "rider" } })).json.token;
  assert.equal((await api("staff/orders?view=pos", { token: rider })).status, 401, "riders can't use the till");
  assert.equal((await api("staff/login", { body: { password: "wrong", role: "pos" } })).status, 401);
});

test("staff add stock, change a shelf price and sell; the count goes down and the sale is recorded", async () => {
  let r = await pos({ action: "pos-item", id: "ibu", price: 1500, cost: 900, reorder: 2, barcode: "6150000000017", adjust: { mode: "received", n: 5 } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  let i = item(r.json.view, "ibu");
  assert.equal(i.qty, 5); assert.equal(i.price, 1500); assert.equal(i.webPrice, 1400, "the website keeps its own price");
  assert.ok(r.json.view.moves.some(m => m.why === "price" && /1400 → 1500/.test(m.note)));

  r = await pos({ action: "pos-sell", lines: [{ id: "ibu", qty: 2, price: 1 }], method: "cash", tendered: 5000, customer: { name: "Bisi Ade", phone: "0803 555 0101" } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const s = r.json.sale;
  assert.equal(s.total, 3000, "priced on the server, not from the browser");
  assert.equal(s.change, 2000);
  assert.equal(s.by, "Tolu");
  assert.equal(item(r.json.view, "ibu").qty, 3);
  assert.equal(r.json.view.stats.today.total, 3000);
  assert.equal(r.json.view.stats.today.byMethod.cash, 3000);
  assert.equal(r.json.view.stats.today.profit, 1200);
  const c = r.json.view.customers.find(x => x.name === "Bisi Ade");
  assert.equal(c.visits, 1); assert.equal(c.spend, 3000);

  r = await pos({ action: "pos-sell", lines: [{ id: "ibu", qty: 1 }], method: "transfer", customer: { phone: "+234 803 555 0101" } });
  assert.equal(r.json.sale.customer.id, c.id, "the same phone finds the same customer");
});

test("a sale can't take more than the shelf holds, and nothing is taken when it fails", async () => {
  await pos({ action: "pos-adjust", id: "lorat", mode: "count", n: 1 });
  await pos({ action: "pos-adjust", id: "cetiri", mode: "count", n: 9 });
  const r = await pos({ action: "pos-sell", lines: [{ id: "cetiri", qty: 2 }, { id: "lorat", qty: 3 }], method: "card" });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /Only 1/);
  const v = (await api("staff/orders?view=pos", { token: till })).json;
  assert.equal(item(v, "cetiri").qty, 9, "the first line was put back");
  assert.equal(item(v, "lorat").qty, 1);
});

test("prescription medicines and alcohol need the pharmacist's and ID ticks", async () => {
  let r = await pos({ action: "pos-sell", lines: [{ id: "amox", qty: 1 }], method: "cash" });
  assert.equal(r.status, 400); assert.match(r.json.error, /prescription/);
  r = await pos({ action: "pos-sell", lines: [{ id: "amox", qty: 1 }], method: "cash", rxChecked: true });
  assert.equal(r.status, 200);
  assert.equal(r.json.sale.rxChecked, "Tolu");
});

test("the last one sold goes out of stock on the website; receiving stock brings it back", async () => {
  await pos({ action: "pos-adjust", id: "zinc", mode: "count", n: 1 });
  await pos({ action: "pos-sell", lines: [{ id: "zinc", qty: 1 }], method: "cash" });
  let health = (await api("health")).json;
  assert.ok(health.out.includes("zinc"), "out of stock online");
  await pos({ action: "pos-adjust", id: "zinc", mode: "received", n: 10 });
  health = (await api("health")).json;
  assert.ok(!health.out.includes("zinc"), "back in stock online");
});

test("only a manager can void a sale, and voiding puts the stock back", async () => {
  await pos({ action: "pos-adjust", id: "ors", mode: "count", n: 4 });
  const s = (await pos({ action: "pos-sell", lines: [{ id: "ors", qty: 3 }], method: "cash" })).json.sale;
  let r = await pos({ action: "pos-void", id: s.id, reason: "Wrong item" });
  assert.equal(r.status, 403);
  r = await pos({ action: "pos-void", id: s.id }, staff);
  assert.equal(r.status, 400, "a reason is required");
  r = await pos({ action: "pos-void", id: s.id, reason: "Wrong item scanned" }, staff);
  assert.equal(r.status, 200);
  assert.equal(r.json.sale.status, "voided");
  assert.equal(item(r.json.view, "ors").qty, 4);
  assert.equal((await pos({ action: "pos-void", id: s.id, reason: "again" }, staff)).status, 409);
});

test("items sold only in store can be added, sold and removed", async () => {
  let r = await pos({ action: "pos-item", name: "Glucose powder", pack: "400 g", dept: "provisions", price: 2200, cost: 1600, adjust: { mode: "received", n: 6 } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const id = r.json.id, i = item(r.json.view, id);
  assert.equal(i.custom, true); assert.equal(i.qty, 6); assert.equal(i.webPrice, null);
  r = await pos({ action: "pos-sell", lines: [{ id, qty: 2 }], method: "cash", tendered: 4400 });
  assert.equal(r.json.sale.total, 4400);
  r = await pos({ action: "pos-item-remove", id });
  assert.ok(!item(r.json.view, id));
  assert.equal((await pos({ action: "pos-item", name: "No price", pack: "1" })).status, 400);
});

test("customer records: duplicates by phone are refused, and the record shows purchases", async () => {
  let r = await pos({ action: "pos-customer-save", customer: { name: "Chidi Okafor", phone: "0812 000 1111", tags: "Diabetes club, Regular", notes: "Prefers sugar-free syrups" } });
  assert.equal(r.status, 200);
  const c = r.json.customer;
  assert.deepEqual(c.tags, ["Diabetes club", "Regular"]);
  assert.equal((await pos({ action: "pos-customer-save", customer: { name: "Someone else", phone: "08120001111" } })).status, 409);
  await pos({ action: "pos-sell", lines: [{ id: "para", qty: 1 }], method: "cash", customer: { id: c.id } });
  r = await pos({ action: "pos-customer", id: c.id });
  assert.equal(r.status, 200);
  assert.equal(r.json.sales.length, 1);
  assert.ok(Array.isArray(r.json.online));
});

test("packing an online order takes it off the shelf count", async () => {
  await pos({ action: "pos-adjust", id: "antacid", mode: "count", n: 10 });
  const placed = await api("orders", { body: { items: [{ id: "antacid", q: 3 }], customer: { name: "Ada Test", phone: "0803 123 4567", email: "ada@example.com", dob: "1990-01-01" }, delivery: { state: "Lagos", city: "Ikeja", addr: "1 Test Street", speed: "nextday" }, consent: true } });
  const o = placed.json.order;
  const start = await api("pay-start", { body: { id: o.id, phone: "4567" } });
  await api("pay-verify", { body: { reference: start.json.reference } });
  const desk = (await api("staff/login", { body: { password: "desk" } })).json.token;
  assert.equal((await api("staff/order", { body: { id: o.id, action: "packed", by: "Pharm. Ade" }, token: desk })).status, 200);
  const v = (await api("staff/orders?view=pos", { token: till })).json;
  assert.equal(item(v, "antacid").qty, 7);
  assert.ok(v.moves.some(m => m.why === "online" && m.ref === o.id));
});

test("the shared rules run the same in memory (the design preview)", async () => {
  const sandbox = { window: {} }; vm.createContext(sandbox);
  for (const f of ["js/config.js", "js/data.js", "js/pos.js"]) vm.runInContext(fs.readFileSync(f, "utf8"), sandbox);
  const { SYNAKO_POS: POS, SYNAKO: S, SYNAKO_CONFIG: cfg } = sandbox.window;
  const t = POS.engine(POS.memoryStore(), S.P, cfg);
  await t.adjust({ id: "para", mode: "count", n: 3 }, "Demo");
  const { sale } = await t.sell({ lines: [{ id: "para", qty: 2 }], method: "card", discount: 100 }, "Demo");
  assert.equal(sale.total, 2 * S.P.find(p => p.id === "para").price - 100);
  const v = await t.view();
  assert.equal(v.items.find(i => i.id === "para").qty, 1);
  assert.equal(v.stats.today.count, 1);
  assert.equal(v.stats.stock.low, 0);
});

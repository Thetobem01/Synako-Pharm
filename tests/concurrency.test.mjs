/* Orders are changed by several people at once (the payment page, Paystack's webhook, the desk, riders, the reminder job).
   These check that one change never silently overwrites another. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

process.env.SYNAKO_DEV = "1"; process.env.KV_REST_API_URL = ""; process.env.UPSTASH_REDIS_REST_URL = "";
const core = await import("../api/_lib/core.js");

test("updateOrder re-applies a change on top of a write that landed in between", async () => {
  await core.db.set("order:CAS-1", { id: "CAS-1", status: "awaiting_payment", history: [] });
  let calls = 0;
  const { order, changed } = await core.updateOrder("CAS-1", async o => {
    calls++;
    if (calls === 1) await core.db.set("order:CAS-1", { id: "CAS-1", status: "paid", history: [{ m: "Payment received" }] }); // someone else wins the race
    if (o.status !== "awaiting_payment") return false;
    o.status = "cancelled";
  });
  assert.equal(calls, 2, "ran again on the newer copy");
  assert.equal(changed, false);
  assert.equal(order.status, "paid");
  assert.equal((await core.db.get("order:CAS-1")).status, "paid", "the payment was not overwritten");
});

test("updateOrder refuses a missing order", async () => {
  await assert.rejects(core.updateOrder("NOPE", () => {}), e => e.status === 404);
});

/* End to end against the dev server */
const PORT = 4200 + Math.floor(Math.random() * 90), BASE = `http://localhost:${PORT}`;
let server;
before(async () => {
  server = spawn(process.execPath, ["dev/server.mjs"], {
    env: { ...process.env, PORT: String(PORT), SYNAKO_DEV: "1", PAYSTACK_MOCK: "1", STAFF_PASSWORD: "desk", SESSION_SECRET: "test-secret", RIDER_PASSWORD: "ride",
      RATE_LIMIT_OFF: "1", SYNAKO_DEV_LATENCY_MS: "5", RESEND_API_KEY: "", TERMII_API_KEY: "", PAYSTACK_SECRET_KEY: "", KV_REST_API_URL: "", UPSTASH_REDIS_REST_URL: "" },
    stdio: ["ignore", "pipe", "inherit"]
  });
  await new Promise((ok, no) => { server.stdout.on("data", d => { if (String(d).includes("http://localhost")) ok(); }); server.on("exit", c => no(new Error("dev server exited " + c))); });
});
after(() => server && server.kill());
async function api(path, opts = {}) {
  const r = await fetch(BASE + "/api/" + path, { method: opts.body !== undefined ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: "Bearer " + opts.token } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
const customer = { name: "Ada Race", phone: "0803 765 4321", email: "ada@example.com", dob: "1990-01-01" };
const delivery = { state: "Lagos", city: "Ikeja", addr: "1 Test Street", speed: "nextday" };
const place = async () => (await api("orders", { body: { items: [{ id: "para", q: 1 }], customer, delivery, consent: true } })).json.order;

test("a payment that arrives after staff cancelled the order is recorded and flagged for a pharmacist", async () => {
  const desk = (await api("staff/login", { body: { password: "desk" } })).json.token;
  const o = await place();
  const start = await api("pay-start", { body: { id: o.id, phone: "4321" } }); // the customer opens the payment window…
  assert.equal((await api("staff/order", { token: desk, body: { id: o.id, action: "cancel" } })).status, 200); // …staff cancel meanwhile
  const paid = await api("pay-verify", { body: { reference: start.json.reference } });
  assert.equal(paid.json.order.status, "paid", "the money was taken, so the payment is recorded");
  const full = (await api("staff/order?id=" + o.id, { token: desk })).json.order;
  assert.ok(full.history.some(h => h.internal && /Paid after staff cancelled/.test(h.m)), "staff are told to decide: supply or refund");
});

test("two riders taking the same parcel at once: exactly one gets it", async () => {
  const desk = (await api("staff/login", { body: { password: "desk" } })).json.token;
  const rider = (await api("staff/login", { body: { password: "ride", role: "rider" } })).json.token;
  const o = await place();
  const start = await api("pay-start", { body: { id: o.id, phone: "4321" } });
  await api("pay-verify", { body: { reference: start.json.reference } });
  assert.equal((await api("staff/order", { token: desk, body: { id: o.id, action: "packed" } })).status, 200);
  const [a, b] = await Promise.all(["Musa", "Tunde"].map(by => api("staff/orders", { token: rider, body: { action: "rider-take", id: o.id, by } })));
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const full = (await api("staff/order?id=" + o.id, { token: desk })).json.order;
  const winner = a.status === 200 ? "Musa" : "Tunde";
  assert.equal(full.rider, winner, "the order names the rider who was told they have it");
  assert.equal(full.history.filter(h => h.m === "Out for delivery").length, 1);
});

test("two payment starts at once get different references", async () => {
  const o = await place();
  const [a, b] = await Promise.all([1, 2].map(() => api("pay-start", { body: { id: o.id, phone: "4321" } })));
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.notEqual(a.json.reference, b.json.reference);
});

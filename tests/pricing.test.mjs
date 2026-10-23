/* Delivery options and totals (js/pricing.js), the rules the server charges by */
import { test } from "node:test";
import assert from "node:assert/strict";
import { site } from "../api/_lib/core.js";

const { config, P, pricing } = site();
const list = a => Array.from(a); // the catalogue runs in a sandbox, so copy its arrays before deep comparisons
const para = P.find(p => p.id === "para");
// Wednesday 2026-10-21 in Lagos (UTC+1)
const at = hhmm => new Date(`2026-10-21T${hhmm}:00+01:00`);
const sunday = new Date("2026-10-25T10:00:00+01:00");

test("prices come from the catalogue, not the browser", () => {
  const q = pricing.quote({ items: [{ id: "para", q: 2, price: 1 }] }, config, P, at("10:00"));
  assert.equal(q.lines[0].price, para.price);
  assert.equal(q.subtotal, para.price * 2);
});

test("unknown products are dropped, repeats are merged away and quantities are kept in range", () => {
  const q = pricing.quote({ items: [{ id: "nope", q: 3 }, { id: "para", q: 99 }, { id: "para", q: 2 }, { id: "ibu", q: -4 }, { id: "amox", q: 50 }] }, config, P, at("10:00"));
  assert.deepEqual(list(q.lines.map(l => [l.id, l.qty])), [["para", 50], ["ibu", 1], ["amox", 10]]);
});

test("wholesale units are priced from the catalogue, cheaper per pack", () => {
  const carton = para.units.find(u => u.n === 50);
  const q = pricing.quote({ items: [{ id: "para", q: 2, u: "50", price: 1 }] }, config, P, at("10:00"));
  assert.equal(q.lines[0].price, carton.price);
  assert.equal(q.lines[0].total, carton.price * 2);
  assert.equal(q.packs, 100);
  assert.ok(carton.price / 50 < para.price);
  assert.match(q.lines[0].name, /Carton of 50/);
});

test("single and carton of the same product can sit in one basket", () => {
  const q = pricing.quote({ items: [{ id: "para", q: 1 }, { id: "para", q: 1, u: "12" }] }, config, P, at("10:00"));
  assert.equal(q.lines.length, 2);
});

test("made-up units and wholesale prescription medicines are refused", () => {
  const q = pricing.quote({ items: [{ id: "para", q: 1, u: "7" }, { id: "amox", q: 1, u: "12" }] }, config, P, at("10:00"));
  assert.equal(q.lines.length, 0);
  assert.equal(P.find(p => p.id === "amox").units.length, 1);
});

test("orders above the online limit are flagged", () => {
  const cfg = structuredClone(config);
  cfg.orders.maxOnlineTotal = 5000;
  assert.equal(pricing.quote({ items: [{ id: "para", q: 5 }] }, cfg, P, at("10:00")).overLimit, true);
  assert.equal(pricing.quote({ items: [{ id: "para", q: 1 }] }, cfg, P, at("10:00")).overLimit, false);
});

test("alcohol marks the order as 18+", () => {
  assert.equal(pricing.quote({ items: [{ id: "lager", q: 1, u: "24" }] }, config, P, at("10:00")).age, 18);
  assert.equal(pricing.quote({ items: [{ id: "milo", q: 1 }] }, config, P, at("10:00")).age, 0);
});

test("every product belongs to a department and has a valid single unit", () => {
  for (const p of P) {
    assert.ok(p.dept, p.id);
    assert.equal(p.units[0].id, "1", p.id);
    assert.equal(p.units[0].price, p.price, p.id);
    for (const u of p.units.slice(1)) assert.ok(u.price < p.price * u.n, `${p.id} ${u.label} should cost less than singles`);
  }
});

test("express delivery is offered only while the pharmacy is open", () => {
  const open = pricing.quote({ items: [{ id: "para", q: 1 }], speed: "express" }, config, P, at("10:00"));
  assert.equal(open.speed, "express");
  assert.equal(open.deliveryFee, config.delivery.fees.express);
  const closed = pricing.quote({ items: [{ id: "para", q: 1 }], speed: "express" }, config, P, sunday);
  assert.notEqual(closed.speed, "express");
});

test("same-day delivery stops at the cut-off time", () => {
  const before = pricing.quote({ items: [{ id: "para", q: 1 }], speed: "sameday" }, config, P, at("13:59"));
  const after = pricing.quote({ items: [{ id: "para", q: 1 }], speed: "sameday" }, config, P, at("14:00"));
  assert.equal(before.speed, "sameday");
  assert.notEqual(after.speed, "sameday");
});

test("orders above the threshold go next day", () => {
  const cfg = structuredClone(config);
  cfg.delivery.nextDayThreshold = para.price; // anything over one pack counts as large here
  const q = pricing.quote({ items: [{ id: "para", q: 2 }], speed: "express" }, cfg, P, at("10:00"));
  assert.equal(q.big, true);
  assert.equal(q.speed, "nextday");
});

test("other states get the interstate option only", () => {
  const cfg = structuredClone(config);
  cfg.delivery.localStates = ["Lagos"];
  const q = pricing.quote({ items: [{ id: "para", q: 1 }], state: "Kano", speed: "express" }, cfg, P, at("10:00"));
  assert.deepEqual(list(q.options.map(o => o.speed)), ["states"]);
  assert.equal(q.deliveryFee, cfg.delivery.fees.otherStates);
});

test("an empty basket has no delivery fee", () => {
  assert.equal(pricing.quote({ items: [] }, config, P, at("10:00")).total, 0);
});

test("money is shown in Naira", () => {
  assert.equal(pricing.fmtMoney(1200, config), "₦1,200");
  assert.equal(pricing.fmtMoney(999999.99, config), "₦999,999.99");
});

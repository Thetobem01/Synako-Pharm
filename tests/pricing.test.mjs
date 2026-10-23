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

test("unknown products are dropped and quantities are kept between 1 and 10", () => {
  const q = pricing.quote({ items: [{ id: "nope", q: 3 }, { id: "para", q: 99 }, { id: "para", q: -4 }] }, config, P, at("10:00"));
  assert.deepEqual(list(q.lines.map(l => l.qty)), [10, 1]);
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

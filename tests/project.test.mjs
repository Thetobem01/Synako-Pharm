/* Checks on the project layout that the hosting depends on */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const functions = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? (e.name.startsWith("_") ? [] : functions(path.join(dir, e.name))) : e.name.endsWith(".js") && !e.name.startsWith("_") ? [path.join(dir, e.name)] : []);

test("the API fits Vercel Hobby's limit of 12 serverless functions", () => {
  const list = functions("api");
  assert.ok(list.length <= 12, `api/ has ${list.length} functions (${list.join(", ")}); Vercel Hobby deploys at most 12. Merge an endpoint into an existing file instead of adding one.`);
});

test("hosting settings are found with or without a Marketplace prefix", async () => {
  const { setting } = await import("../api/_lib/core.js");
  const keys = ["KV_REST_API_TOKEN", "storage_KV_REST_API_TOKEN", "storage_KV_REST_API_READ_ONLY_TOKEN", "messaging_RESEND_API_KEY"];
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    keys.forEach(k => delete process.env[k]);
    process.env.storage_KV_REST_API_READ_ONLY_TOKEN = "read-only";
    assert.equal(setting("KV_REST_API_TOKEN"), "", "the read-only token must never be used for writes");
    process.env.storage_KV_REST_API_TOKEN = "prefixed";
    assert.equal(setting("KV_REST_API_TOKEN"), "prefixed");
    process.env.KV_REST_API_TOKEN = "plain";
    assert.equal(setting("KV_REST_API_TOKEN"), "plain", "an unprefixed setting wins");
    process.env.messaging_RESEND_API_KEY = "re_x";
    assert.equal(setting("RESEND_API_KEY"), "re_x");
  } finally {
    keys.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
  }
});

test("every page address is served by the app (deep links, refreshes, email links)", () => {
  const v = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  const spa = v.rewrites.find(r => r.source.includes("(?!api/"));
  assert.ok(spa, "vercel.json needs a rewrite that sends page addresses to the app");
  // With cleanUrls on, /index.html is not a valid destination and Vercel answers 404 for /track/…, /product/… etc.
  if (v.cleanUrls) assert.notEqual(spa.destination, "/index.html", "with cleanUrls, rewrite page addresses to \"/\", not \"/index.html\"");
  const re = new RegExp("^" + spa.source + "$");
  for (const p of ["/track/SYN-ABC123", "/product/para", "/products/otc", "/pharmacist", "/desk", "/staff", "/rider", "/pos", "/till", "/wholesale", "/journal", "/journal/welcome-to-the-synako-journal"]) assert.ok(re.test(p), `${p} must reach the app`);
  for (const p of ["/api/health", "/assets/logo.png", "/js/app.js", "/css/styles.css"]) assert.ok(!re.test(p), `${p} must not be rewritten`);
});

test("the server builds a PDF receipt for the payment email", async () => {
  const { receiptPdf } = await import("../api/_lib/core.js");
  const order = { id: "SYN-TEST01", createdAt: "2026-10-24T09:00:00Z", status: "paid", rx: false, priced: true,
    items: [{ id: "para", name: "Paracetamol 500mg tablets · Carton of 50", qty: 2, price: 52800, total: 105600, cls: "otc", n: 50, unitLabel: "Carton (50 × 96 tablets)" }],
    subtotal: 105600, deliveryFee: 1500, total: 107100,
    customer: { name: "Ada Test", email: "ada@example.com" }, delivery: { label: "Next-day delivery", addr: "1 Test Street", city: "Ikeja", state: "Lagos" },
    payment: { status: "paid", channel: "card", reference: "SYN-TEST01-1", paidAt: "2026-10-24T09:05:00Z" } };
  const r = await receiptPdf(order);
  assert.equal(r.filename, "Synako-receipt-SYN-TEST01.pdf");
  const pdf = Buffer.from(r.content, "base64").toString("latin1");
  assert.ok(pdf.startsWith("%PDF-1.4"), "a PDF file");
  assert.ok(pdf.includes("/Subtype /Image"), "the logo is embedded");
  const hex = t => Buffer.from(t, "latin1").toString("hex");
  for (const t of ["Receipt", "SYN-TEST01", "SYN-TEST01-1", "Ada Test", "PAID"]) assert.ok(pdf.includes(hex(t)), `shows ${t}`);
});

test("scheduled jobs point at an existing function and run at most daily (Vercel Hobby)", () => {
  const v = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  for (const c of v.crons || []) {
    const file = c.path.replace(/^\//, "").replace(/\?.*$/, "") + ".js";
    assert.ok(fs.existsSync(file), `${c.path} needs ${file}`);
    const [min, hour] = c.schedule.split(" ");
    assert.ok(/^\d+$/.test(min) && /^\d+$/.test(hour), `${c.schedule}: Hobby allows one run a day at a fixed time`);
  }
});

/* Pages arrive with their own title, description and canonical link already in the HTML (for link previews and
   crawlers that don't run JavaScript), and nothing private is published in the files visitors download. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";

const PORT = 4100 + Math.floor(Math.random() * 90);
const BASE = `http://localhost:${PORT}`;
let server;
before(async () => {
  server = spawn(process.execPath, ["dev/server.mjs"], { env: { ...process.env, PORT: String(PORT), SYNAKO_DEV: "1", PAYSTACK_MOCK: "1", STAFF_PASSWORD: "desk", SESSION_SECRET: "test-secret", SITE_URL: "", KV_REST_API_URL: "", UPSTASH_REDIS_REST_URL: "" }, stdio: ["ignore", "pipe", "inherit"] });
  await new Promise((ok, no) => { server.stdout.on("data", d => { if (String(d).includes("http://localhost")) ok(); }); server.on("exit", c => no(new Error("dev server exited " + c))); });
});
after(() => server && server.kill());

const get = async (p, headers) => { const r = await fetch(BASE + p, { headers }); return { status: r.status, html: await r.text(), cache: r.headers.get("cache-control") }; };
const tag = (html, re) => (re.exec(html) || [])[1];
const title = h => tag(h, /<title>([^<]*)<\/title>/), desc = h => tag(h, /<meta name="description" content="([^"]*)">/), canon = h => tag(h, /<link rel="canonical" href="([^"]*)">/), robots = h => tag(h, /<meta name="robots" content="([^"]*)">/);
const ldPage = h => { const t = tag(h, /<script type="application\/ld\+json" id="ld-page">([\s\S]*?)<\/script>/); return t ? JSON.parse(t) : null; };
const read = f => fs.readFileSync(new URL("../" + f, import.meta.url), "utf8");

test("a product page carries its own title, description, canonical link and product details", async () => {
  const { status, html, cache } = await get("/product/para");
  assert.equal(status, 200);
  assert.equal(title(html), "Paracetamol 500mg tablets | Synako Pharmacy");
  assert.match(desc(html), /^Paracetamol 500mg tablets \(96 tablets\)\. /);
  assert.match(canon(html), /\/product\/para$/);
  assert.equal(tag(html, /<meta property="og:title" content="([^"]*)">/), title(html));
  assert.match(tag(html, /<meta property="og:url" content="([^"]*)">/), /\/product\/para$/);
  assert.equal(tag(html, /<meta property="og:type" content="([^"]*)">/), "product");
  assert.equal(robots(html), "index, follow");
  const ld = ldPage(html);
  assert.equal(ld["@type"], "Product");
  assert.equal(ld.offers.priceCurrency, "NGN");
  assert.match(cache, /s-maxage=\d+/);
  assert.match(html, /<script src="js\/app\.js"><\/script>/, "it is still the app");
  assert.equal((html.match(/<title>/g) || []).length, 1);
});

test("prescription medicines and alcohol get a title but no product listing data", async () => {
  const rx = (await get("/product/amox")).html;
  assert.match(title(rx), /\| Synako Pharmacy$/);
  assert.match(desc(rx), /Prescription only\.$/);
  assert.equal(ldPage(rx), null);
});

test("category, journal and information pages have their own heads", async () => {
  assert.equal(title((await get("/products")).html), "All products | Synako Pharmacy");
  assert.equal(title((await get("/products/prescription")).html), "Prescription medicines | Synako Pharmacy");
  assert.match(desc((await get("/products/prescription")).html), /Upload a valid prescription/);
  assert.equal(title((await get("/products/pain")).html).endsWith("| Synako Pharmacy"), true);
  assert.equal(title((await get("/products/tablets")).html), "Tablets &amp; capsules | Synako Pharmacy");
  assert.equal(title((await get("/delivery")).html), "Delivery | Synako Pharmacy");
  assert.equal(title((await get("/prescriptions")).html), "Send a prescription | Synako Pharmacy");
  const post = (await get("/journal/welcome-to-the-synako-journal")).html;
  assert.equal(ldPage(post)["@type"], "BlogPosting");
  assert.match(canon(post), /\/journal\/welcome-to-the-synako-journal$/);
  assert.equal(robots((await get("/products/pain?q=para")).html), "noindex, nofollow", "search results stay out of search engines");
});

test("unknown addresses answer 404 and are kept out of search engines, but still load the app", async () => {
  for (const p of ["/product/no-such-thing", "/products/no-such-category"]) {
    const r = await get(p);
    assert.equal(r.status, 404, p);
    assert.equal(robots(r.html), "noindex, nofollow", p);
    assert.match(r.html, /js\/app\.js/, p);
  }
  const odd = await get("/product/%3Cscript%3Ealert(1)%3C%2Fscript%3E");
  assert.ok(!odd.html.includes("<script>alert"), "nothing from the address is echoed into the page");
});

test("the canonical link follows a custom domain", async () => {
  const { html } = await get("/product/para", { "x-forwarded-host": "www.synakopharmacy.com" });
  assert.equal(canon(html), "https://www.synakopharmacy.com/product/para");
});

test("private pages and the home page are not sent through the page function", async () => {
  const v = JSON.parse(read("vercel.json"));
  const pages = v.rewrites.filter(r => r.destination.startsWith("/api/page"));
  assert.equal(pages.length, 2);
  const res = pages.map(r => new RegExp("^" + r.source.replace(/:(\w+)(\([^)]*\))?/g, (_, n, alt) => alt || "([^/]+)") + "$"));
  for (const p of ["/", "/pharmacist", "/desk", "/rider", "/pos", "/checkout", "/basket", "/track", "/track/SYN-ABC123", "/api/health", "/js/app.js"]) assert.ok(!res.some(re => re.test(p)), `${p} must not go to /api/page`);
  for (const p of ["/product/para", "/products", "/products/otc", "/journal", "/journal/x", "/about", "/controlled-medicines"]) assert.ok(res.some(re => re.test(p)), `${p} should go to /api/page`);
  assert.match(v.functions["api/**/*.js"].includeFiles, /index\.html/, "the function needs index.html bundled with it");
});

test("server wording matches the app's (js/app.js), so the head doesn't change when the app starts", async () => {
  const { PAGES, DOSES, DEFAULT_DESC } = await import("../api/_lib/page.js");
  const app = read("js/app.js");
  const ids = JSON.parse(/const PAGES = (\[[^\]]*\])/.exec(app)[1]);
  assert.deepEqual(Object.keys(PAGES).sort(), ids.slice().sort(), "every information page has a server title");
  for (const id of ids) {
    const m = new RegExp(`\\n  ${id}: \\(\\) => \\(\\{ title: "([^"]*)", lead: ("[^"]*"|\`)`).exec(app);
    assert.ok(m, `${id} found in js/app.js`);
    assert.equal(PAGES[id][0], m[1], `${id}: title`);
    if (m[2] !== "`") assert.equal(PAGES[id][1], JSON.parse(m[2]), `${id}: lead`);
  }
  assert.deepEqual(DOSES, JSON.parse(/const DOSES = (\[\[.*\]\]);/.exec(app)[1]));
  assert.ok(app.includes(`const DEFAULT_DESC = ${JSON.stringify(DEFAULT_DESC)};`));
  assert.ok(read("index.html").includes(`<meta name="description" content="${DEFAULT_DESC}">`));
});

test("the home page's business details match js/config.js", async () => {
  const { site } = await import("../api/_lib/core.js");
  const c = site().config, ld = JSON.parse(tag(read("index.html"), /<script type="application\/ld\+json" id="ld-org">\s*([\s\S]*?)\s*<\/script>/));
  assert.equal(ld.telephone, c.business.phone);
  assert.deepEqual([ld.address.streetAddress, ld.address.addressLocality, ld.address.addressRegion], [c.business.address, c.business.city, c.business.state]);
  assert.equal(ld.legalName, c.business.companyName);
  assert.equal(ld.openingHoursSpecification.length, Object.keys(c.hours.open).length);
  for (const s of ld.openingHoursSpecification) assert.deepEqual([s.opens, s.closes], [...c.hours.open[["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(s.dayOfWeek)]]);
});

test("wholesaler contacts are not in any file visitors can download", async () => {
  const { SUPPLIERS } = await import("../api/_lib/suppliers-seed.js");
  assert.ok(SUPPLIERS.length > 0);
  const pub = ["index.html", ...fs.readdirSync(new URL("../js/", import.meta.url)).map(f => "js/" + f)].map(f => [f, read(f)]);
  for (const [f, src] of pub) for (const s of SUPPLIERS) for (const v of [s.phone, s.whatsapp, s.email].filter(Boolean)) assert.ok(!src.includes(v), `${f} contains a wholesaler's contact (${s.name})`);
  const cfg = (await get("/js/config.js")).html;
  assert.ok(!/suppliers\s*:/.test(cfg), "js/config.js has no supplier list");
  assert.equal((await get("/api/_lib/suppliers-seed")).status, 404, "the server-only file is not served");
});

test("large orders go next day only: the limit is ₦999,999.99 (the shop's real settings)", async () => {
  const { site } = await import("../api/_lib/core.js");
  const { config, pricing, P } = site();
  assert.equal(config.delivery.nextDayThreshold, 999999.99);
  const monday10 = new Date("2026-11-16T09:00:00Z"); // 10:00 in Nigeria, shop open, before the cut-off
  const where = { state: "Ondo", city: "Okitipupa" };
  // the dearest non-prescription line the shop sells: enough of it to pass the limit
  const best = P.filter(p => p.cls !== "pom" && !p.out && !p.age).flatMap(p => (p.units || [{ id: "1", price: p.price }]).map(u => ({ id: p.id, u: u.id, price: u.price }))).sort((x, y) => y.price - x.price)[0];
  const over = Math.floor(999999.99 / best.price) + 1;
  const big = pricing.quote({ items: [{ id: best.id, u: best.u, q: over }], ...where, speed: "express" }, config, P, monday10);
  assert.ok(big.subtotal > 999999.99, `needs a basket over the limit (got ${big.subtotal})`);
  assert.equal(big.big, true);
  assert.equal(big.speed, "nextday", "a large order can't take 30-minute or same-day delivery");
  const small = pricing.quote({ items: [{ id: "para", q: 1 }], ...where, speed: "express" }, config, P, monday10);
  assert.equal(small.big, false);
  assert.equal(small.speed, "express");
});

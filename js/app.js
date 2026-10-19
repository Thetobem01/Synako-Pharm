/* Synako Pharmacy — front-end prototype.
   Runs entirely in the browser; nothing is stored or sent. Pages have real addresses
   (/products, /prescriptions, /track …) using the History API; vercel.json sends every
   path to index.html. Where the History API isn't available, navigation stays in memory. */
(function () {
"use strict";

const { CATS, P, STATES, FAQ } = window.SYNAKO;
const art = window.SYNAKO_ART;

/* Photos exported from Figma */
const IMG = {
  heroBg: "assets/hero-bg.jpg",
  pharmacistMale: "assets/pharmacist-male.webp",
  pharmacistFemale: "assets/pharmacist-female.webp",
  delivery: "assets/delivery.webp"
};

const NGN = n => "₦" + Math.round(n).toLocaleString("en-NG");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);
const prod = id => P.find(p => p.id === id);
const cat = id => CATS.find(c => c.id === id);
const OTC_CATS = CATS.filter(c => c.cls === "otc"), POM_CATS = CATS.filter(c => c.cls === "pom");
const now = () => new Date();
const ago = m => new Date(Date.now() - m * 60000);
const stamp = d => d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const ph = t => `<span class="ph">${t}</span>`;

const ICONS = {
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cup: '<path d="M6 4h12l-1.5 15a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z"/><path d="M6.5 9h11"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10V6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-.5A5.5 5.5 0 0 1 5 15l-1.2-3.2a1.5 1.5 0 0 1 2.7-1.2L8 13"/>',
  rx: '<path d="M6 20V4h5a4 4 0 0 1 0 8H6M10 12l8 8M18 13l-5 5"/>',
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  plus: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14l2.5 2.5L16 11"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  box: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M12 11v5M9.5 13.5h5"/>',
  store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>'
};
const icon = (k, cls) => `<svg class="${cls || "ic"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.box}</svg>`;

/* ---------- State ---------- */
const S = {
  mode: "shop", view: "home", filter: "all", tab: "body", q: "", sort: "popular", product: null, qty: 1, page: "about",
  cart: [], rxRequest: false, step: 1, form: {}, orders: [], trackId: null, sel: 0,
  queue: [
    { id: "SYN-20417", patient: "A. B. (sample)", items: [{ id: "metf", q: 2 }], status: "pending", at: ago(18),
      prescriber: { name: "Dr K. Eze (sample)", reg: "MDCN 00000", phone: "0800 000 0001", clinic: "Sample Clinic, Ikeja, Lagos", issued: "2026-08-02" }, log: [] },
    { id: "SYN-20416", patient: "C. D. (sample)", items: [{ id: "amox", q: 1 }], status: "pending", at: ago(42),
      prescriber: { name: "Dr F. Bello (sample)", reg: "", phone: "0800 000 0002", clinic: "Sample Hospital, Wuse, Abuja", issued: "2026-03-11" }, log: [] },
    { id: "SYN-20412", patient: "E. F. (sample)", items: [{ id: "amlo", q: 1 }], status: "approved", at: ago(190),
      prescriber: { name: "Dr T. Adeyemi (sample)", reg: "MDCN 00000", phone: "0800 000 0003", clinic: "Sample Clinic, Port Harcourt", issued: "2026-09-20" }, log: [] }
  ]
};
S.queue.forEach(q => q.log.push({ t: q.at, m: "Prescription uploaded by customer" }));
S.queue[2].log.push({ t: ago(170), m: "Approved by Pharm. (sample)" });

/* ---------- Router ---------- */
const MEMORY = !!window.SYNAKO_MEMORY_ROUTER || location.protocol === "file:";
const PAGES = ["about", "contact", "faq", "delivery", "returns", "privacy", "terms", "licences", "cookies", "careers"];
function parse(path) {
  const seg = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const r = { view: "home" };
  if (!seg.length || seg[0] === "index.html") return r;
  const [a, b] = seg;
  if (a === "products") { r.view = "shop"; r.filter = b === "otc" ? "otc" : b === "prescription" ? "pom" : (b && cat(b)) ? b : "all"; }
  else if (a === "product" && b && prod(b)) { r.view = "product"; r.product = b; }
  else if (a === "prescriptions") r.view = "rx";
  else if (a === "controlled-medicines") r.view = "controlled";
  else if (a === "basket" || a === "checkout" || a === "track") r.view = a;
  else if (a === "pharmacist") { r.view = "home"; r.mode = "staff"; }
  else if (PAGES.includes(a)) { r.view = "page"; r.page = a; }
  else r.view = "notfound";
  return r;
}
function pathFor() {
  if (S.mode === "staff") return "/pharmacist";
  switch (S.view) {
    case "home": return "/";
    case "shop": return "/products" + (S.filter === "all" ? "" : S.filter === "otc" ? "/otc" : S.filter === "pom" ? "/prescription" : "/" + S.filter);
    case "product": return "/product/" + S.product;
    case "rx": return "/prescriptions";
    case "controlled": return "/controlled-medicines";
    case "page": return "/" + S.page;
    case "notfound": return location.pathname;
    default: return "/" + S.view;
  }
}
function go(path, opts) {
  opts = opts || {};
  const r = parse(path);
  S.mode = r.mode || "shop";
  S.view = r.view;
  if (r.filter) S.filter = r.filter;
  if (r.product) { S.product = r.product; S.qty = 1; }
  if (r.page) S.page = r.page;
  if (!MEMORY && !opts.noHistory) {
    try { history[opts.replace ? "replaceState" : "pushState"]({}, "", pathFor()); } catch (e) { /* stay in memory */ }
  }
  closeDrawer(true);
  render(true);
}
window.addEventListener("popstate", () => go(location.pathname, { noHistory: true }));
const link = (path, label, cls) => `<a href="${path}" data-link${cls ? ` class="${cls}"` : ""}>${label}</a>`;

/* ---------- Small pieces ---------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
const photo = (src, style) => `<img src="${src}" alt="" loading="lazy" data-swap${style ? ` style="${style}"` : ""}>`;
const media = p => `<span class="drawn">${art(p)}</span>${photo(p.photo)}`;
const tag = p => p.cls === "pom" ? `<span class="tag rx">Prescription only</span>` : `<span class="tag otc">Over the counter</span>`;

function personSVG(kind) {
  const hair = kind === "female" ? `<path d="M112 128c0-44 26-74 58-74s58 30 58 74c0 30-6 56-14 72l-8-70c-8-18-22-26-36-26s-28 8-36 26l-8 70c-8-16-14-42-14-72z" fill="#9FB3D1"/>` : "";
  return `<svg viewBox="0 0 340 420" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Pharmacist photo placeholder">${hair}
    <ellipse cx="170" cy="138" rx="52" ry="62" fill="#B8C8E0"/><path d="M148 186h44v46h-44z" fill="#B8C8E0"/>
    <path d="M24 420c4-96 54-160 146-160s142 64 146 160z" fill="#FFFFFF" stroke="#CACDD8" stroke-width="2"/>
    <path d="M136 262l34 74 34-74c-10-4-22-6-34-6s-24 2-34 6z" fill="#3362AB"/></svg>`;
}

function card(p) {
  const rx = p.cls === "pom";
  return `<article class="pcard">
    <span class="flag${rx ? " rx" : ""}">${rx ? "Prescription" : "Over the counter"}</span>
    <div class="box">
      <a class="shot" href="/product/${p.id}" data-link aria-label="View ${esc(p.name)}">${media(p)}</a>
      <a class="name" href="/product/${p.id}" data-link>${esc(p.name)}</a>
      <div class="brand">${esc(p.brand === "Generic" ? p.pack : p.brand)}</div>
      <div class="prices">${p.was ? `<div class="was num">${NGN(p.was)}</div>` : ""}<div class="price">${NGN(p.price)}</div><div class="samp">Sample price</div></div>
      <button class="add${rx ? " rx" : ""}" type="button" data-add="${p.id}">${rx ? "Add · prescription" : "Add to basket"}</button>
    </div>
  </article>`;
}

/* ---------- Home (Figma "Main Web" frame, top to bottom) ---------- */
function vHome() {
  const popular = P.filter(p => p.pop).slice(0, 6);
  const tiles = P.filter(p => p.cat === S.tab).slice(0, 6);
  const TABS = ["body", "family", "vitamins", "devices"];
  return `
  <section class="hero" id="hero"><div class="wrap">
    <div class="copy">
      <h1>Your Pathway to<br>Health and Wellness</h1>
      <p class="lede">Empowering you to live your healthiest life, with genuine NAFDAC-registered medicines checked by our pharmacists and delivered to your door.</p>
      <div class="ctas">${link("/products", "Shop health products", "pill pill-solid pill-lg")}${link("/prescriptions", "Send a prescription", "pill pill-rx pill-lg")}</div>
      <p class="note">Same-day delivery in ${ph("your city")} for orders before ${ph("2pm")}. For adults 18 and over.</p>
    </div>
    <figure class="pharmacist"><div class="fallback">${personSVG("male")}</div>${photo(IMG.pharmacistMale)}
      <figcaption class="card-tag"><b>Pharmacist-checked</b><span class="muted">Every order is reviewed by a registered Synako pharmacist.</span></figcaption></figure>
  </div></section>

  <div class="trust"><div class="wrap">
    <div>${icon("shield")}<span><b>Licensed by PCN</b><span class="muted small">E-pharmacy licence ${ph("no.")}</span></span></div>
    <div>${icon("file")}<span><b>Prescriptions checked</b><span class="muted small">Before anything is charged</span></span></div>
    <div>${icon("box")}<span><b>NAFDAC-registered</b><span class="muted small">From approved suppliers</span></span></div>
    <div>${icon("truck")}<span><b>Delivery in Nigeria</b><span class="muted small">Tracked to your door</span></span></div>
  </div></div>

  <section class="section"><div class="wrap">
    <h2 class="stitle">How would you like to shop?</h2>
    <div class="routes">
      <a class="route" href="/products/otc" data-link>${icon("box", "ic big")}<span><b>Over-the-counter</b><span>${P.filter(p => p.cls === "otc").length} products · order straight away</span></span><span class="arrow">→</span></a>
      <a class="route rx" href="/products/prescription" data-link>${icon("rx", "ic big")}<span><b>Prescription medicines</b><span>${P.filter(p => p.cls === "pom").length} medicines · upload your prescription</span></span><span class="arrow">→</span></a>
      <a class="route lock" href="/controlled-medicines" data-link>${icon("lock", "ic big")}<span><b>Controlled medicines</b><span>In store only · not sold online</span></span><span class="arrow">→</span></a>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <h2 class="stitle">Most Popular Products</h2>
    <p class="ssub">Prices shown are samples until Synako's stock list is loaded.</p>
    <div class="cards">${popular.map(card).join("")}</div>
    <div style="margin-top:3rem" class="strip"><span class="tagx">Prescription medicines</span><span class="sep" aria-hidden="true"></span>
      <span>Upload your prescription at checkout. You pay only after our pharmacist approves it.</span>${link("/prescriptions", "How it works", "linkbtn")}</div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap pair">
    <div class="feature"><div><h2>Talk to a<br>Pharmacist</h2>
      <p>Don't self medicate. Talk to an expert. Reach a Synako pharmacist in <em>${ph("under 5 minutes")}</em> during opening hours.</p>${link("/contact", "Get Started", "btn-blue")}</div>
      <div class="photo"><div class="fallback">${personSVG("female")}</div>${photo(IMG.pharmacistFemale, "object-position:42% 30%")}</div></div>
    <div class="feature"><div><h2>Home delivery<br>in ${ph("30 minutes")}</h2>
      <p>Tired of waiting in a queue? Too weak to go down to the store and buy medicines? We bring them to you.</p>${link("/products", "Order Now", "btn-blue")}</div>
      <div class="photo"><div class="fallback" style="place-items:center;color:#3362AB">${icon("truck", "ic huge")}</div>${photo(IMG.delivery)}</div></div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <h2 class="stitle">Browse medicines &amp; health products</h2>
    <div class="tabs" role="tablist" aria-label="Product categories" style="margin-top:2rem">
      ${TABS.map(id => `<button type="button" role="tab" data-tab="${id}" aria-selected="${S.tab === id}">${{ body: "Body Care", family: "Family Care", vitamins: "Vitamins", devices: "Devices" }[id]}</button>`).join("")}
    </div>
    <div class="tiles" role="tabpanel">${tiles.map(p => `<a class="tile" href="/product/${p.id}" data-link aria-label="${esc(p.name)}">${media(p)}<span class="cap"><span>${esc(p.name)}</span><b class="num">${NGN(p.price)}</b></span></a>`).join("")}</div>
    <div class="center">${link("/products/" + S.tab, "View More", "btn-blue")}</div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <h2 class="stitle">How prescription orders work</h2>
    <p class="ssub">Required by Nigeria's Electronic Pharmacy Regulations 2026, and it keeps you safe.</p>
    <div class="band"><div class="inner"><div class="steps">${stepsHTML()}</div>
      <div class="foot">${link("/prescriptions", "Start a prescription order", "pill pill-rx pill-lg")}</div></div>
      <p class="below">Customer reviews will appear here once real customers have ordered.</p></div>
  </div></section>

  <section class="section"><div class="wrap mobile">
    <div><h2>Try it now<br>on mobile</h2>
      <p>The Synako site works on any phone, so you can order, upload a prescription or track a delivery wherever you are. Our pharmacists are available during opening hours.</p>
      <div class="stores">
        <button class="store" type="button" disabled><span><small>App coming soon</small><b>App Store</b></span></button>
        <button class="store alt" type="button" disabled><span><small>App coming soon</small><b>Google Play</b></span></button>
      </div></div>
    <div class="phone" aria-hidden="true"><div class="scr"><div class="tb"></div><div class="hd"><img src="assets/logo.png" alt=""><span>☰</span></div>
      <div class="bd"><h4>Your Pathway to Health and Wellness</h4><span class="b">Shop now</span><div class="row"><span></span><span></span><span></span><span></span></div></div></div></div>
  </div></section>`;
}
function stepsHTML() {
  return `<div class="step"><span class="n">1</span><h3>Upload your prescription</h3><p>A photo or scan from a licensed prescriber, with their Nigerian clinic address, registration number and signature.</p></div>
    <div class="step"><span class="n">2</span><h3>Our pharmacist checks it</h3><p>We confirm the prescriber, the date (valid for 6 months) and that the medicine is right for you.</p></div>
    <div class="step"><span class="n">3</span><h3>You pay once approved</h3><p>Nothing is charged until your prescription is approved. Card, transfer or USSD.</p></div>
    <div class="step"><span class="n">4</span><h3>We pack and deliver</h3><p>Sealed packaging and tracked delivery, with a pharmacist on call for questions.</p></div>`;
}

/* ---------- Shop ---------- */
const fpath = f => "/products" + (f === "all" ? "" : f === "otc" ? "/otc" : f === "pom" ? "/prescription" : "/" + f);
function filtered() {
  let list = P.slice();
  if (S.filter === "otc" || S.filter === "pom") list = list.filter(p => p.cls === S.filter);
  else if (S.filter !== "all") list = list.filter(p => p.cat === S.filter);
  if (S.q) { const q = S.q.toLowerCase(); list = list.filter(p => [p.name, p.generic, p.brand, p.use, cat(p.cat).name].join(" ").toLowerCase().includes(q)); }
  const by = { popular: (a, b) => (b.pop || 0) - (a.pop || 0), low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, az: (a, b) => a.name.localeCompare(b.name) }[S.sort];
  return list.sort(by);
}
function filterTitle() {
  if (S.q) return `Results for “${esc(S.q)}”`;
  return S.filter === "all" ? "All products" : S.filter === "otc" ? "Over-the-counter" : S.filter === "pom" ? "Prescription medicines" : esc(cat(S.filter).name);
}
function vShop() {
  const list = filtered();
  const count = f => f === "all" ? P.length : (f === "otc" || f === "pom") ? P.filter(p => p.cls === f).length : P.filter(p => p.cat === f).length;
  const fb = (f, label) => `<a href="${fpath(f)}" data-link aria-current="${S.filter === f}"><span>${label}</span><span class="ct">${count(f)}</span></a>`;
  const chips = [["all", "All"], ["otc", "Over the counter"], ["pom", "Prescription"]].concat(CATS.map(c => [c.id, c.name]));
  const isPom = S.filter === "pom" || (cat(S.filter) && cat(S.filter).cls === "pom");
  return `<div class="wrap page-head"><div class="crumbs">${link("/", "Home")}<span>/</span>${link("/products", "Products")}</div><h1>${filterTitle()}</h1></div>
  <div class="wrap shop">
    <aside class="filters" aria-label="Categories">
      ${fb("all", "All products")}
      <h3>Over the counter</h3>${fb("otc", "All over-the-counter")}${OTC_CATS.map(c => fb(c.id, c.name)).join("")}
      <h3>Prescription only</h3>${fb("pom", "All prescription")}${POM_CATS.map(c => fb(c.id, c.name)).join("")}
      <h3>Controlled medicines</h3><a href="/controlled-medicines" data-link><span>In store only</span><span class="ct">${icon("lock", "ic sm")}</span></a>
    </aside>
    <div style="min-width:0">
      <div class="chips">${chips.map(([f, l]) => `<a href="${fpath(f)}" data-link aria-current="${S.filter === f}">${l}</a>`).join("")}</div>
      ${isPom ? `<div class="notice rx small" style="margin-bottom:1rem"><b>Prescription needed at checkout</b><span>You can add these to your basket, then upload a valid prescription. Our pharmacist checks it before anything is charged.</span></div>` : ""}
      <div class="toolbar"><span class="muted small">${list.length} product${list.length === 1 ? "" : "s"}${S.q ? ` · <button class="linkbtn" type="button" data-clear>Clear search</button>` : ""}</span>
        <label class="sort" for="sort">Sort by <select id="sort">${[["popular", "Most popular"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["az", "Name: A to Z"]].map(([v, l]) => `<option value="${v}" ${S.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
      ${list.length ? `<div class="grid-shop">${list.map(card).join("")}</div>`
        : `<div class="empty"><p><b>No products match “${esc(S.q)}”.</b></p><p style="margin-top:.4rem">Try a generic name, such as paracetamol, or ${link("/contact", "ask our pharmacist", "linkbtn")} if we stock it. Controlled medicines aren't listed online.</p></div>`}
    </div>
  </div>`;
}

function vProduct() {
  const p = prod(S.product); if (!p) return vNotFound();
  const rx = p.cls === "pom", c = cat(p.cat);
  const related = P.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  return `<div class="wrap page-head" style="padding-bottom:.5rem"><div class="crumbs">${link("/", "Home")}<span>/</span>${link(rx ? "/products/prescription" : "/products/otc", rx ? "Prescription" : "Over the counter")}<span>/</span>${link("/products/" + p.cat, c.name)}</div></div>
  <div class="wrap pdp">
    <div class="visual">${media(p)}</div>
    <div class="info">
      ${tag(p)}
      <h1>${esc(p.name)}</h1>
      <div class="brand">${esc(p.brand)} · <span class="muted" style="font-weight:400">${esc(p.pack)}</span></div>
      <div>${p.was ? `<span class="muted num" style="text-decoration:line-through;margin-right:.5rem">${NGN(p.was)}</span>` : ""}<span class="price num">${NGN(p.price)}</span> <span class="samp">Sample price</span></div>
      ${rx ? `<div class="notice rx"><b>Prescription required</b><span>Add it to your basket, then upload your prescription at checkout. Our pharmacist checks it before you pay, and we only supply it if the prescription is valid.</span></div>`
           : `<div class="notice info"><b>Over-the-counter</b><span>Our pharmacist may contact you before sending it if they need to check it's right for you.</span></div>`}
      <div class="buy">
        <div class="qty" aria-label="Quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span class="num" id="qty-val">${S.qty}</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
        <button class="pill ${rx ? "pill-rx" : "pill-solid"} pill-lg" type="button" data-add="${p.id}" data-withqty="1">${rx ? "Add to basket · prescription needed" : "Add to basket"}</button>
      </div>
      <dl class="specs">
        <dt>Active ingredient</dt><dd>${esc(p.generic)}</dd>
        ${p.strength ? `<dt>Strength</dt><dd>${esc(p.strength)}</dd>` : ""}
        <dt>Pack size</dt><dd>${esc(p.pack)}</dd>
        <dt>Classification</dt><dd>${rx ? "Prescription-only medicine (POM)" : "Over-the-counter (OTC)"}</dd>
        <dt>NAFDAC reg. no.</dt><dd>${ph("to add")}</dd>
        <dt>Storage</dt><dd>Store below 30°C in a dry place, away from sunlight and out of reach of children.</dd>
      </dl>
      <div class="facts">
        <details open><summary>What it's for</summary><p>${esc(p.use)}</p></details>
        <details><summary>How to use</summary><p>${esc(p.how)} Always read the label and patient leaflet.</p></details>
        <details><summary>Warnings</summary><p>${esc(p.warn)}</p></details>
        <details><summary>Delivery</summary><p>Same-day delivery in ${ph("your city")} for orders before ${ph("2pm")}; other states in ${ph("2–4 working days")}. We deliver within Nigeria only.</p></details>
      </div>
      <p class="small muted">Questions about this product? ${link("/contact", "Talk to a pharmacist", "linkbtn")}.</p>
    </div>
  </div>
  ${related.length ? `<section class="wrap" style="padding-bottom:3rem"><h2 class="stitle left">More in ${esc(c.name)}</h2><div class="grid-shop">${related.map(card).join("")}</div></section>` : ""}`;
}

/* ---------- Controlled medicines (information only, nothing for sale) ---------- */
function vControlled() {
  return `<div class="wrap page-head"><div class="crumbs">${link("/", "Home")}<span>/</span>${link("/products", "Products")}<span>/</span><span>Controlled medicines</span></div>
    <h1>Controlled medicines</h1><p class="muted lead">Available in store only, with a valid prescription.</p></div>
  <div class="wrap two">
    <div style="display:grid;gap:1.25rem">
      <div class="notice rx"><b>Why you can't order these online</b><span>Nigeria's Electronic Pharmacy Regulations 2026 prohibit the online sale of controlled medicines and dangerous drugs. This protects patients from misuse and counterfeit supply. Synako follows these rules, so controlled medicines are not listed or sold on this website.</span></div>
      <div class="panel prose">
        <h2>What counts as a controlled medicine?</h2>
        <p>Controlled medicines are those the law restricts more tightly because they can cause dependence or be misused. They can include some strong painkillers, some medicines for sleep or anxiety, some medicines for seizures or nerve pain, and some medicines for ADHD. Our pharmacist can tell you whether a medicine on your prescription is controlled.</p>
        <h2>How to get a controlled medicine from Synako</h2>
        <ol class="olist">
          <li><b>Call ahead</b> on ${ph("0800 000 0000")} so we can check stock and have it ready.</li>
          <li><b>Bring your original prescription</b> to our pharmacy at ${ph("Street, City, State")}. Photos and copies aren't accepted for controlled medicines.</li>
          <li><b>Bring photo ID.</b> The medicine must be collected by the patient, or a named representative with their own ID.</li>
          <li><b>Our pharmacist checks and supplies it,</b> records it in our controlled drugs register, and explains how to take it safely.</li>
        </ol>
        <h2>Something on your prescription is controlled?</h2>
        <p>If you upload a prescription online that includes a controlled medicine, we'll prepare the other items as normal and our pharmacist will contact you to arrange collection of the controlled item in store.</p>
      </div>
    </div>
    <aside class="panel" style="display:grid;gap:.75rem;align-content:start">
      <h3>Our pharmacy</h3>
      <dl class="kv"><dt>Address</dt><dd>${ph("Street, City, State")}</dd><dt>Phone</dt><dd>${ph("0800 000 0000")}</dd><dt>Hours</dt><dd>${ph("Mon–Sat 9am–6pm")}</dd></dl>
      ${link("/contact", "Contact the pharmacy", "pill pill-solid")}
      <p class="small muted">Looking for other medicines? ${link("/products/prescription", "Prescription medicines", "linkbtn")} and ${link("/products/otc", "over-the-counter products", "linkbtn")} can be ordered online.</p>
    </aside>
  </div>`;
}

/* ---------- Basket & checkout ---------- */
const items = () => S.cart.map(l => Object.assign({}, l, { p: prod(l.id) }));
const hasRx = () => S.rxRequest || S.cart.some(l => prod(l.id).cls === "pom");
const sub = () => S.cart.reduce((s, l) => s + prod(l.id).price * l.q, 0);
const delivery = () => (S.cart.length || S.rxRequest) ? (S.form.speed === "sameday" ? 2500 : 1500) : 0;
function summary(cta) {
  return `<aside class="panel summary" aria-label="Order summary"><h3>Order summary</h3>
    ${items().map(l => `<div class="r small"><span>${l.q} × ${esc(l.p.name)}</span><span class="num">${NGN(l.p.price * l.q)}</span></div>`).join("")}
    ${S.rxRequest ? `<div class="r small"><span>Prescription items</span><span class="muted">Priced by pharmacist</span></div>` : ""}
    <div class="r"><span>Subtotal</span><span class="num">${NGN(sub())}</span></div>
    <div class="r"><span>Delivery</span><span class="num">${NGN(delivery())}</span></div>
    <div class="r total"><span>Total</span><span class="num">${NGN(sub() + delivery())}${S.rxRequest ? "+" : ""}</span></div>
    ${hasRx() ? `<div class="notice rx small"><b>Pay after approval</b><span>Your order has prescription items, so nothing is charged until our pharmacist approves the prescription.</span></div>` : ""}
    ${cta || ""}</aside>`;
}
function vBasket() {
  const list = items();
  if (!list.length && !S.rxRequest) return `<div class="wrap page-head"><h1>Your basket</h1></div>
    <div class="wrap" style="padding-bottom:3rem"><div class="empty"><p><b>Your basket is empty.</b></p><p style="margin:.4rem 0 1rem">Browse products, or send a prescription and we'll prepare it for you.</p>
    <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">${link("/products", "Shop products", "pill pill-solid")}${link("/prescriptions", "Send a prescription", "pill pill-rx")}</div></div></div>`;
  return `<div class="wrap page-head"><h1>Your basket</h1></div>
  <div class="wrap two"><div class="panel">
    ${list.map(l => `<div class="line"><a class="thumb" href="/product/${l.p.id}" data-link>${media(l.p)}</a>
      <div style="min-width:0">${link("/product/" + l.p.id, esc(l.p.name), "linkbtn dark")}<div class="muted small">${esc(l.p.pack)}</div><div style="margin-top:.35rem">${tag(l.p)}</div></div>
      <div class="right"><b class="num">${NGN(l.p.price * l.q)}</b>
        <div class="qty"><button type="button" data-lineqty="${l.id}" data-d="-1" aria-label="Decrease">−</button><span class="num">${l.q}</span><button type="button" data-lineqty="${l.id}" data-d="1" aria-label="Increase">+</button></div>
        <button class="rm" type="button" data-remove="${l.id}">Remove</button></div></div>`).join("")}
    ${S.rxRequest ? `<div class="line"><div class="thumb rxthumb">℞</div><div><b>Prescription request</b><div class="muted small">Our pharmacist will add the medicines on your prescription and confirm the price.</div></div><div class="right"><button class="rm" type="button" data-rxreq-remove>Remove</button></div></div>` : ""}
  </div>${summary(`${link("/checkout", "Go to checkout", "pill pill-solid pill-lg full")}${link("/products", "Continue shopping", "linkbtn center-self")}`)}</div>`;
}
function stepList() { const s = [{ n: 1, l: "Your details" }, { n: 2, l: "Delivery" }]; if (hasRx()) s.push({ n: 3, l: "Prescription" }); s.push({ n: 4, l: "Review & pay" }); return s; }
function vCheckout() {
  if (!S.cart.length && !S.rxRequest) return vBasket();
  const steps = stepList();
  if (!steps.some(s => s.n === S.step)) S.step = 1;
  const F = S.form, v = k => esc(F[k] || ""), rx = hasRx();
  let body = "";
  if (S.step === 1) body = `<form class="f" id="f1" novalidate><h2>Your details</h2>
    <div class="row2"><label for="fn">Full name<input id="fn" name="name" required value="${v("name")}" autocomplete="name"></label>
    <label for="phn">Phone number<input id="phn" name="phone" type="tel" inputmode="tel" required placeholder="080..." value="${v("phone")}" autocomplete="tel"></label></div>
    <div class="row2"><label for="em">Email<input id="em" name="email" type="email" required value="${v("email")}" autocomplete="email"></label>
    <label for="dob">Date of birth<span class="hint">We supply medicines to adults 18 and over only.</span><input id="dob" name="dob" type="date" required value="${v("dob")}"></label></div>
    <fieldset><legend>Age and identity check</legend><p class="small muted">The regulations require us to confirm you're an adult. In the live site this step runs a quick ID check before your first order.</p>
      <label class="check"><input type="checkbox" id="adult" name="adult" required ${F.adult ? "checked" : ""}><span>I confirm I am 18 or over and the medicines are for me or someone I care for.</span></label></fieldset>
    <label class="check"><input type="checkbox" id="consent" name="consent" required ${F.consent ? "checked" : ""}><span>I agree to Synako processing my health information to supply my order, as set out in the ${link("/privacy", "privacy notice", "linkbtn")}.</span></label>
    <div class="actions">${link("/basket", "Back to basket", "pill pill-ghost")}<button class="pill pill-solid" type="submit">Continue to delivery</button></div></form>`;
  if (S.step === 2) body = `<form class="f" id="f2" novalidate><h2>Delivery address</h2><p class="muted small">We deliver within Nigeria only.</p>
    <div class="row2"><label for="st">State<select id="st" name="state" required><option value="">Choose a state</option>${STATES.map(s => `<option ${F.state === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label for="city">City / LGA<input id="city" name="city" required value="${v("city")}"></label></div>
    <label for="addr">Street address<input id="addr" name="addr" required value="${v("addr")}" autocomplete="street-address"></label>
    <label for="lm">Nearest landmark<span class="hint">Helps our rider find you.</span><input id="lm" name="landmark" value="${v("landmark")}"></label>
    <fieldset class="pay"><legend>Delivery speed</legend>
      <label for="sp1"><input type="radio" id="sp1" name="speed" value="standard" ${F.speed !== "sameday" ? "checked" : ""}><span><b>Standard</b> · ${ph("2–4 working days")} · ${NGN(1500)}</span></label>
      <label for="sp2"><input type="radio" id="sp2" name="speed" value="sameday" ${F.speed === "sameday" ? "checked" : ""}><span><b>Same day</b> · ${ph("your city")}, order before ${ph("2pm")} · ${NGN(2500)}</span></label></fieldset>
    <div class="actions"><button class="pill pill-ghost" type="button" data-step="1">Back</button><button class="pill pill-solid" type="submit">${rx ? "Continue to prescription" : "Continue to payment"}</button></div></form>`;
  if (S.step === 3) body = `<form class="f" id="f3" novalidate><h2>Your prescription</h2>
    <div class="notice rx small"><b>What makes a prescription valid</b><span>Issued within the last 6 months by a licensed prescriber, showing their name, signature, registration number, phone number, and a clinic or hospital address in Nigeria.</span></div>
    <div class="drop"><b>Upload a photo or scan</b><span class="muted small">JPG, PNG or PDF. Make sure all four corners are visible.</span><input id="rxfile" name="rxfile" type="file" accept="image/*,.pdf" ${F.rxfile ? "" : "required"}>${F.rxfile ? `<span class="tag ok">Attached: ${esc(F.rxfile)}</span>` : ""}</div>
    <fieldset><legend>Prescriber details, as shown on the prescription</legend>
      <div class="row2"><label for="pn">Prescriber name<input id="pn" name="pname" required value="${v("pname")}"></label>
      <label for="preg">Registration number<span class="hint">For example, their MDCN number.</span><input id="preg" name="preg" required value="${v("preg")}"></label></div>
      <div class="row2"><label for="pph">Prescriber phone<input id="pph" name="pphone" type="tel" required value="${v("pphone")}"></label>
      <label for="pdate">Date issued<input id="pdate" name="pdate" type="date" required value="${v("pdate")}"></label></div>
      <label for="pclinic">Clinic or hospital address in Nigeria<input id="pclinic" name="pclinic" required value="${v("pclinic")}"></label></fieldset>
    <label for="allg">Allergies or other medicines you take<span class="hint">Optional, but it helps our pharmacist.</span><textarea id="allg" name="allergies" rows="2">${v("allergies")}</textarea></label>
    <p class="small muted">If your prescription includes a controlled medicine, we'll contact you to arrange collection of that item in store.</p>
    <div class="actions"><button class="pill pill-ghost" type="button" data-step="2">Back</button><button class="pill pill-solid" type="submit">Continue to review</button></div></form>`;
  if (S.step === 4) body = `<form class="f" id="f4" novalidate><h2>Review and ${rx ? "submit" : "pay"}</h2>
    <div class="panel" style="padding:1rem"><dl class="kv"><dt>Name</dt><dd>${v("name")}</dd><dt>Phone</dt><dd>${v("phone")}</dd><dt>Deliver to</dt><dd>${v("addr")}, ${v("city")}, ${v("state")}</dd>${rx ? `<dt>Prescription</dt><dd>${v("rxfile") || "Attached"} · ${v("pname")}</dd>` : ""}</dl></div>
    <fieldset class="pay"><legend>${rx ? "How you'll pay after approval" : "Payment method"}</legend>
      <label for="pm1"><input type="radio" id="pm1" name="pay" value="card" ${F.pay !== "transfer" && F.pay !== "ussd" ? "checked" : ""}><span><b>Debit card</b> · Verve, Mastercard, Visa</span></label>
      <label for="pm2"><input type="radio" id="pm2" name="pay" value="transfer" ${F.pay === "transfer" ? "checked" : ""}><span><b>Bank transfer</b></span></label>
      <label for="pm3"><input type="radio" id="pm3" name="pay" value="ussd" ${F.pay === "ussd" ? "checked" : ""}><span><b>USSD</b></span></label>
      <p class="small muted">Payments are processed securely by ${ph("Paystack or Flutterwave")}. Synako never sees your full card number.</p></fieldset>
    ${rx ? `<div class="notice rx small"><b>Nothing is charged yet</b><span>We'll send your payment link once our pharmacist approves your prescription, usually within ${ph("1 hour")} during opening hours.</span></div>` : ""}
    <label class="check"><input type="checkbox" id="terms" name="terms" required ${F.terms ? "checked" : ""}><span>I agree to the ${link("/terms", "terms of sale", "linkbtn")}.</span></label>
    <div class="actions"><button class="pill pill-ghost" type="button" data-step="${rx ? 3 : 2}">Back</button><button class="pill ${rx ? "pill-rx" : "pill-solid"}" type="submit">${rx ? "Submit for pharmacist review" : `Pay ${NGN(sub() + delivery())}`}</button></div>
    <p class="small muted">Prototype: no payment is taken and nothing is sent.</p></form>`;
  return `<div class="wrap page-head"><h1>Checkout</h1></div>
  <div class="wrap two"><div class="panel">
    <div class="stepper">${steps.map(s => `<button type="button" data-step="${s.n}" ${s.n === S.step ? 'aria-current="step"' : ""} class="${s.n < S.step ? "done" : ""}" ${s.n > S.step ? "disabled" : ""}>${s.l}</button>`).join("")}</div>
    ${body}</div>${summary()}</div>`;
}

function vRx() {
  return `<div class="wrap page-head"><div class="crumbs">${link("/", "Home")}<span>/</span><span>Prescriptions</span></div>
    <h1>Send us your prescription</h1><p class="muted lead">Upload a valid prescription and our pharmacist will prepare it. You only pay once it's approved.</p></div>
  <div class="wrap two">
    <div style="display:grid;gap:1rem">
      <div class="panel" style="display:grid;gap:.75rem"><h3>Option 1 · You know the medicine</h3><p class="muted small">Find it in the shop, add it to your basket, and upload the prescription at checkout.</p><div>${link("/products/prescription", "Browse prescription medicines", "pill pill-solid")}</div></div>
      <div class="panel" style="display:grid;gap:.75rem"><h3>Option 2 · Just upload it</h3><p class="muted small">Send the prescription as it is. Our pharmacist reads it, adds the medicines, and confirms the price before you pay.</p><div><button class="pill pill-rx" type="button" data-rxreq>Upload a prescription</button></div></div>
      <div class="panel" style="display:grid;gap:.6rem"><h3>Controlled medicines</h3><p class="muted small">These can't be sold online. If your prescription includes one, our pharmacist will arrange in-store collection. ${link("/controlled-medicines", "How it works", "linkbtn")}</p></div>
      <div class="band slim"><div class="inner"><div class="steps">${stepsHTML()}</div></div></div>
    </div>
    <aside class="panel" style="display:grid;gap:.7rem;align-content:start"><h3>A valid prescription shows</h3>
      <ul class="small" style="margin:0;padding-left:1.1rem;display:grid;gap:.3rem"><li>The prescriber's full name and signature</li><li>Their registration number</li><li>Their phone number</li><li>A clinic or hospital address in Nigeria</li><li>A date within the last 6 months</li><li>The medicine, strength and directions</li></ul>
      <div class="notice info small"><span>We keep a record of every prescription and its review, as the regulations require.</span></div></aside>
  </div>`;
}

/* ---------- Tracking ---------- */
const STEPS_RX = ["Order placed", "Pharmacist review", "Payment", "Packed", "Out for delivery", "Delivered"];
const STEPS = ["Order placed", "Payment", "Packed", "Out for delivery", "Delivered"];
const SAMPLE_ORDER = { id: "SYN-20412", rx: true, stage: 3, created: ago(200), sample: true, log: [
  { t: ago(200), m: "Order placed by customer" }, { t: ago(199), m: "Prescription uploaded (1 file)" }, { t: ago(170), m: "Prescription approved by Pharm. (sample)" },
  { t: ago(160), m: "Payment received · card" }, { t: ago(150), m: "Order recorded on National Electronic Pharmacy Platform · pending integration" }, { t: ago(90), m: "Packed and sealed · batch and expiry recorded" }] };
function statusTag(o) {
  if (o.status === "rejected") return `<span class="tag bad">Not approved</span>`;
  if (o.status === "info") return `<span class="tag warn">Info needed</span>`;
  const st = o.rx ? STEPS_RX : STEPS;
  if (o.stage >= st.length) return `<span class="tag ok">Delivered</span>`;
  if (o.rx && o.stage === 1) return `<span class="tag warn">In review</span>`;
  return `<span class="tag otc">${st[o.stage]}</span>`;
}
function vTrack() {
  const all = S.orders.concat([SAMPLE_ORDER]);
  const o = all.find(x => x.id === S.trackId) || all[0];
  const st = o.rx ? STEPS_RX : STEPS, rej = o.status === "rejected", info = o.status === "info";
  return `<div class="wrap page-head"><h1>Track your order</h1><p class="muted lead">Every step is logged, from prescription to your door.</p></div>
  <div class="wrap two track">
    <div style="display:grid;gap:1rem;align-content:start">
      <form class="f" id="trackform"><label for="tid">Order number<input id="tid" name="tid" placeholder="SYN-00000" class="mono"></label><button class="pill pill-ghost" type="submit">Find order</button></form>
      <div class="order-list">${all.map(x => `<button class="order-pick" type="button" data-track="${x.id}" aria-current="${x.id === o.id}"><span><b class="mono">${x.id}</b><div class="small muted">${x.sample ? "Sample order" : stamp(x.created)}</div></span>${statusTag(x)}</button>`).join("")}</div>
    </div>
    <div class="panel" style="display:grid;gap:1.25rem">
      <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center"><div><div class="muted small">Order</div><h2 class="mono" style="font-size:1.4rem">${o.id}</h2></div>${statusTag(o)}</div>
      ${rej ? `<div class="notice rx"><b>We couldn't approve this prescription</b><span>${esc(o.note || "Our pharmacist will call you to explain.")} You have not been charged.</span></div>` : ""}
      ${info ? `<div class="notice rx"><b>Our pharmacist needs more information</b><span>${esc(o.note || "We'll call you shortly.")}</span></div>` : ""}
      <ol class="timeline">${st.map((s, i) => { const c = i < o.stage ? "done" : (i === o.stage && !rej ? "now" : "next"); return `<li class="${c}"><span class="dot ${c}">${i < o.stage ? "✓" : i + 1}</span><div><b>${s}</b>${c === "now" ? `<div class="small muted">In progress</div>` : ""}</div></li>`; }).join("")}</ol>
      ${!o.sample && o.stage < st.length && !rej && !info && !(o.rx && o.stage === 1) ? `<div><button class="pill pill-ghost" type="button" data-advance="${o.id}">Prototype: move to next step</button></div>` : ""}
      ${!o.sample && o.rx && o.stage === 1 && !rej && !info ? `<div class="notice info small"><span>Waiting for the pharmacist. Switch to <a href="/pharmacist" data-link class="linkbtn">Pharmacist view</a> to review it.</span></div>` : ""}
      <div><h3 style="margin-bottom:.5rem">Order record</h3><div class="audit">${o.log.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>
    </div>
  </div>`;
}

/* ---------- Content pages ---------- */
const DRAFT = `<div class="notice info small"><b>Draft</b><span>Have this page reviewed by Synako's lawyer and data protection adviser before launch.</span></div>`;
const CONTENT = {
  about: () => ({ title: "About Synako", lead: "A licensed Nigerian pharmacy, online.", body: `
    <div class="about-hero">
      <div class="prose"><h2>Our story</h2>
        <p>Synako Pharmacy started at our premises in ${ph("City, State")} in ${ph("year")}, with one aim: to make genuine medicines and good pharmaceutical advice easy to reach for every Nigerian family. Now you can order from us online and get the same care you'd get at our counter.</p>
        <p>Every order, online or in store, is supervised by our superintendent pharmacist, ${ph("Pharm. Full Name")}. We stock only NAFDAC-registered products from approved suppliers, and we record the batch and expiry date of every item we send.</p></div>
      <figure class="about-photo"><div class="fallback">${personSVG("female")}</div>${photo(IMG.pharmacistFemale, "object-position:42% 30%")}</figure>
    </div>
    <div class="values">
      <div>${icon("shield", "ic big")}<h3>Safe</h3><p>Pharmacist checks on every prescription, and controlled medicines supplied in person only.</p></div>
      <div>${icon("box", "ic big")}<h3>Genuine</h3><p>NAFDAC-registered stock from approved manufacturers and distributors.</p></div>
      <div>${icon("chat", "ic big")}<h3>Personal</h3><p>Real pharmacists you can call or message for advice, free.</p></div>
      <div>${icon("truck", "ic big")}<h3>Convenient</h3><p>Order from your phone and have it delivered to your door.</p></div>
    </div>
    <div class="panel prose"><h2>Our team</h2><p>Add photos and short introductions for your superintendent pharmacist and pharmacy team here. Customers trust a pharmacy more when they can see who is looking after them.</p></div>` }),
  contact: () => ({ title: "Contact a pharmacist", lead: "Free advice on medicines, side effects and minor illnesses.", body: `
    <div class="two flat">
      <form class="f panel" id="contactform" novalidate><h2>Send us a message</h2>
        <div class="row2"><label for="cn">Your name<input id="cn" name="cname" required autocomplete="name"></label><label for="cp">Phone number<input id="cp" name="cphone" type="tel" required autocomplete="tel"></label></div>
        <label for="ctopic">What's it about?<select id="ctopic" name="ctopic"><option>Advice about a medicine</option><option>My order</option><option>A prescription</option><option>Controlled medicine collection</option><option>Something else</option></select></label>
        <label for="cmsg">Message<textarea id="cmsg" name="cmsg" rows="4" required></textarea></label>
        <p class="small muted">In an emergency, go to your nearest hospital or call ${ph("112")}. Don't wait for a reply.</p>
        <div><button class="pill pill-solid" type="submit">Send message</button></div></form>
      <aside class="panel" style="display:grid;gap:.9rem;align-content:start">
        <h3>Synako Pharmacy</h3>
        <dl class="kv"><dt>Address</dt><dd>${ph("Street, City, State")}</dd><dt>Phone</dt><dd>${ph("0800 000 0000")}</dd><dt>WhatsApp</dt><dd>${ph("0800 000 0000")}</dd><dt>Email</dt><dd>${ph("hello@your-domain")}</dd></dl>
        <h3>Opening hours</h3>
        <dl class="kv"><dt>Mon – Fri</dt><dd>${ph("9:00am – 6:00pm")}</dd><dt>Saturday</dt><dd>${ph("9:00am – 6:00pm")}</dd><dt>Sunday</dt><dd>${ph("Closed")}</dd></dl>
        <div class="map">${icon("store", "ic big")}<span>Map of the pharmacy goes here once the address is confirmed.</span></div>
      </aside>
    </div>` }),
  faq: () => ({ title: "Frequently asked questions", lead: "Quick answers about ordering, prescriptions and delivery.", body: `<div class="faq">${FAQ.map(([q, a], i) => `<details ${i === 0 ? "open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
    <p style="margin-top:1.5rem">Can't find your answer? ${link("/contact", "Contact a pharmacist", "linkbtn")}.</p>` }),
  delivery: () => ({ title: "Delivery areas and fees", lead: "We deliver within Nigeria only.", body: `
    <div class="table-wrap"><table class="tbl"><thead><tr><th>Area</th><th>Delivery time</th><th>Fee</th></tr></thead><tbody>
      <tr><td>${ph("Your city")}, same day</td><td>Order before ${ph("2pm")}, Mon–Sat</td><td class="num">${NGN(2500)}</td></tr>
      <tr><td>${ph("Your city")}, standard</td><td>${ph("Next working day")}</td><td class="num">${NGN(1500)}</td></tr>
      <tr><td>${ph("Your state")}</td><td>${ph("1–2 working days")}</td><td class="num">${ph("₦—")}</td></tr>
      <tr><td>Other states</td><td>${ph("2–4 working days")}</td><td class="num">${ph("₦—")}</td></tr>
    </tbody></table></div>
    <div class="panel prose"><h2>How we deliver medicines</h2><ul class="olist">
      <li>Every order is packed and sealed by our pharmacy team and checked by a pharmacist.</li>
      <li>Medicines that need cool storage travel in insulated packaging and are sent only to areas we can reach in time.</li>
      <li>Our rider may ask for your order number and, for prescription items, to see ID.</li>
      <li>We can't deliver outside Nigeria: the regulations don't allow cross-border online sales of medicines.</li></ul></div>` }),
  returns: () => ({ title: "Returns and refunds", lead: "", body: `${DRAFT}<div class="panel prose">
    <h2>Medicines</h2><p>For your safety, we can't take back medicines once they've left the pharmacy, because we can't be sure they were stored correctly. If a medicine arrives damaged, faulty, past its expiry date, or isn't what you ordered, contact us within ${ph("48 hours")} and we'll replace it or refund you.</p>
    <h2>Devices and personal care</h2><p>Unopened devices and personal care items can be returned within ${ph("7 days")} for a refund. Faulty devices are covered by the manufacturer's warranty; we'll help you claim.</p>
    <h2>Prescriptions we can't approve</h2><p>If our pharmacist can't approve your prescription, you're never charged, because payment is only taken after approval.</p>
    <h2>How refunds are paid</h2><p>Refunds go back to the card or account you paid with, usually within ${ph("5–10 working days")}.</p></div>` }),
  privacy: () => ({ title: "Privacy notice", lead: "How we handle your personal and health information.", body: `${DRAFT}<div class="panel prose">
    <h2>Who we are</h2><p>Synako Pharmacy (${ph("registered company name and RC number")}), ${ph("address")}, is the data controller for information you give us. Our data protection officer can be reached at ${ph("privacy@your-domain")}.</p>
    <h2>What we collect</h2><p>Your name, contact details, date of birth, delivery address, order history, payment confirmations (not your card number), prescriptions and the details on them, and anything you tell our pharmacists about your health.</p>
    <h2>Why we use it</h2><p>To supply your medicines safely and lawfully, check prescriptions, confirm your age, deliver your order, keep the records pharmacy law requires, and answer your questions. We rely on your consent and on our legal obligations under the Nigeria Data Protection Act 2023 and pharmacy regulations.</p>
    <h2>Who we share it with</h2><p>Only those who need it to complete your order: our delivery partners (name, address, phone), our payment provider, and the Pharmacy Council of Nigeria's National Electronic Pharmacy Platform, as the regulations require. We never sell your data.</p>
    <h2>How long we keep it</h2><p>Prescription and dispensing records are kept for as long as pharmacy law requires (${ph("period")}). Other information is kept only as long as needed.</p>
    <h2>Your rights</h2><p>You can ask to see, correct or delete your information, withdraw consent, or complain to the Nigeria Data Protection Commission. Contact us at ${ph("privacy@your-domain")}.</p>
    <h2>Security</h2><p>Information is encrypted in transit and at rest, and access to prescriptions is limited to our pharmacists.</p></div>` }),
  terms: () => ({ title: "Terms of sale", lead: "", body: `${DRAFT}<div class="panel prose">
    <h2>About these terms</h2><p>These terms apply when you order from Synako Pharmacy online. By placing an order you agree to them.</p>
    <h2>Who can order</h2><p>You must be 18 or over and have a delivery address in Nigeria.</p>
    <h2>Prescriptions and professional checks</h2><p>Prescription-only medicines are supplied only against a valid prescription checked by our pharmacist. Our pharmacists may decline to supply any medicine, or limit quantities, if they believe it isn't safe or appropriate. Controlled medicines are not sold online.</p>
    <h2>Prices and payment</h2><p>Prices are in Naira and include ${ph("VAT where applicable")}. For orders with prescription items, payment is taken only after approval.</p>
    <h2>Delivery</h2><p>Delivery times are estimates. See the Delivery page for areas and fees.</p>
    <h2>Cancellations and returns</h2><p>You can cancel before your order is packed. See Returns and refunds.</p>
    <h2>Contact and complaints</h2><p>Contact us first at ${ph("hello@your-domain")}. You can also contact the Pharmacy Council of Nigeria.</p></div>` }),
  licences: () => ({ title: "Our licences", lead: "Check that you're buying from a registered pharmacy.", body: `
    <div class="licence panel"><div class="ropse big">PCN ROPSE emblem goes here</div>
      <dl class="kv"><dt>Pharmacy</dt><dd>Synako Pharmacy</dd><dt>Premises certificate</dt><dd>${ph("PCN premises no.")}</dd><dt>E-pharmacy licence</dt><dd>${ph("PCN e-pharmacy licence no.")} (renewed annually)</dd>
      <dt>Superintendent pharmacist</dt><dd>${ph("Pharm. Full Name")}, PCN reg. no. ${ph("00000")}</dd><dt>Registered address</dt><dd>${ph("Street, City, State")}</dd><dt>Company</dt><dd>${ph("Registered name, RC number")}</dd></dl></div>
    <p class="muted" style="margin-top:1rem">You can confirm our registration on the Pharmacy Council of Nigeria's register. The emblem above will link to it once our licence is issued.</p>` }),
  cookies: () => ({ title: "Cookies", lead: "", body: `${DRAFT}<div class="panel prose"><p>We use only essential cookies to keep your basket and sign-in working. If we add analytics cookies later, we'll ask for your consent first and list them here.</p></div>` }),
  careers: () => ({ title: "Careers at Synako", lead: "Join a pharmacy team that puts patients first.", body: `
    <div class="panel prose"><h2>Open roles</h2><p>There are no open roles right now. Add vacancies here as they come up, for example pharmacists, pharmacy technicians, dispatch riders and customer support.</p></div>
    <form class="f panel" id="careersform" novalidate style="margin-top:1rem"><h2>Register your interest</h2>
      <div class="row2"><label for="kn">Full name<input id="kn" name="kname" required autocomplete="name"></label><label for="ke">Email<input id="ke" name="kemail" type="email" required autocomplete="email"></label></div>
      <label for="kr">Role you're interested in<select id="kr" name="krole"><option>Pharmacist</option><option>Pharmacy technician</option><option>Dispatch rider</option><option>Customer support</option><option>Other</option></select></label>
      <label for="kc">Your PCN registration number<span class="hint">Pharmacists and technicians only.</span><input id="kc" name="kpcn"></label>
      <div><button class="pill pill-solid" type="submit">Register interest</button></div></form>` })
};
function vPage() {
  const c = (CONTENT[S.page] || CONTENT.about)();
  return `<div class="wrap page-head"><div class="crumbs">${link("/", "Home")}<span>/</span><span>${c.title}</span></div><h1>${c.title}</h1>${c.lead ? `<p class="muted lead">${c.lead}</p>` : ""}</div>
    <div class="wrap content">${c.body}</div>`;
}
function vNotFound() {
  return `<div class="wrap page-head"><h1>Page not found</h1><p class="muted lead">The page you're looking for isn't here.</p></div>
    <div class="wrap" style="padding-bottom:3rem;display:flex;gap:.75rem;flex-wrap:wrap">${link("/", "Go to the home page", "pill pill-solid")}${link("/products", "Browse products", "pill pill-ghost")}</div>`;
}

/* ---------- Pharmacist workspace ---------- */
function vStaff() {
  const q = S.queue;
  $("#staff-stats").innerHTML = `<div><b>${q.filter(x => x.status === "pending").length}</b>Waiting</div><div><b>${q.filter(x => x.status === "approved").length}</b>Approved</div><div><b>${q.filter(x => x.status === "rejected" || x.status === "info").length}</b>Returned</div>`;
  if (S.sel >= q.length) S.sel = 0;
  const r = q[S.sel];
  const months = r.prescriber.issued ? (Date.now() - new Date(r.prescriber.issued)) / (30.44 * 864e5) : 99;
  const auto = [
    { l: "Prescriber registration number present", ok: !!r.prescriber.reg },
    { l: "Clinic address is in Nigeria", ok: /nigeria|lagos|abuja|port harcourt|ikeja|wuse|kano|ibadan|enugu|benin|kaduna|jos|owerri|calabar|abeokuta/i.test(r.prescriber.clinic || "") },
    { l: "Issued within the last 6 months", ok: months <= 6 && months >= 0 }
  ];
  const its = r.items.map(i => Object.assign({}, i, { p: prod(i.id) }));
  const decided = r.status !== "pending";
  const label = s => s === "pending" ? `<span class="tag warn">Waiting</span>` : s === "approved" ? `<span class="tag ok">Approved</span>` : s === "info" ? `<span class="tag warn">Info requested</span>` : `<span class="tag bad">Rejected</span>`;
  return `<div class="desk">
    <div class="queue" aria-label="Prescription queue">${q.map((x, i) => `<button type="button" class="q ${x.status}" data-sel="${i}" aria-current="${i === S.sel}">
      <span class="top"><b class="mono">${x.id}</b>${label(x.status)}</span>
      <span class="small">${esc(x.items.length ? x.items.map(i => prod(i.id).name).join(", ") : "Prescription request")}</span>
      <span class="small muted">${esc(x.patient)} · ${stamp(x.at)}</span></button>`).join("")}</div>
    <div class="panel" style="display:grid;gap:1.25rem">
      <div><div class="muted small">Order</div><h2 class="mono" style="font-size:1.35rem">${r.id}</h2><div class="muted small">${esc(r.patient)} · received ${stamp(r.at)}</div></div>
      <div class="review">
        <div class="rxdoc" aria-label="Uploaded prescription">
          <div class="hd"><b>${esc(r.prescriber.clinic)}</b><div>${esc(r.prescriber.name)} · ${esc(r.prescriber.reg || "(no reg. no. shown)")}</div><div>Tel ${esc(r.prescriber.phone)}</div></div>
          <div class="sym">℞</div>
          ${its.length ? its.map(i => `<div>${esc(i.p.name)} — ${i.q} pack${i.q > 1 ? "s" : ""}<br><span style="color:#666">Directions as written by prescriber</span></div>`).join("") : `<div style="color:#666">Items to be read from the uploaded image</div>`}
          <div class="sig">Signed · ${esc(r.prescriber.issued || "undated")}</div>
          <div style="font-family:var(--font);font-size:.72rem;color:#8A7A50">Sample prescription image</div>
        </div>
        <div style="display:grid;gap:1rem;align-content:start">
          <dl class="kv"><dt>Prescriber</dt><dd>${esc(r.prescriber.name)}</dd><dt>Reg. no.</dt><dd>${esc(r.prescriber.reg || "Not provided")}</dd><dt>Clinic</dt><dd>${esc(r.prescriber.clinic)}</dd><dt>Issued</dt><dd>${esc(r.prescriber.issued || "—")}</dd></dl>
          <div><h3 style="font-size:.95rem;margin-bottom:.5rem">Automatic checks</h3><div class="checks">${auto.map(c => `<div class="small" style="display:flex;gap:.5rem;align-items:center">${c.ok ? `<span class="tag ok">Pass</span>` : `<span class="tag bad">Check</span>`}<span>${c.l}</span></div>`).join("")}</div></div>
        </div>
      </div>
      <form class="f" id="reviewform">
        <fieldset ${decided ? "disabled" : ""}><legend>Pharmacist confirms</legend>
          <label class="check"><input type="checkbox" id="c1" required><span>Prescriber verified against the MDCN or relevant council register</span></label>
          <label class="check"><input type="checkbox" id="c2" required><span>Prescription is signed, legible and unaltered</span></label>
          <label class="check"><input type="checkbox" id="c3" required><span>Medicine, strength and quantity are appropriate for this patient</span></label>
          <label class="check"><input type="checkbox" id="c4" required><span>No item is a controlled medicine or dangerous drug (controlled items go to in-store collection)</span></label>
          <label for="rnote">Note to customer or record<textarea id="rnote" rows="2" placeholder="For example: prescription expired, please ask your doctor for a new one."></textarea></label>
        </fieldset>
        ${decided ? `<div class="notice ${r.status === "approved" ? "ok" : "rx"} small"><b>${r.status === "approved" ? "Approved" : r.status === "info" ? "More information requested" : "Rejected"}</b><span>This decision is in the order record.</span></div>`
          : `<div class="actions"><div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="pill pill-bad" type="button" data-decide="rejected">Reject</button><button class="pill pill-ghost" type="button" data-decide="info">Request info</button></div><button class="pill pill-ok" type="button" data-decide="approved">Approve and send payment link</button></div>`}
      </form>
      <div><h3 style="font-size:.95rem;margin-bottom:.5rem">Record</h3><div class="audit">${r.log.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>
    </div>
  </div>`;
}

/* ---------- Shell: medicines directory footer and mobile drawer ---------- */
function renderDirectory() {
  const col = cats => cats.map(c => `<li><a href="/products/${c.id}" data-link>${c.name} <span>${P.filter(p => p.cat === c.id).length}</span></a></li>`).join("");
  $("#directory").innerHTML = `
    <div><h3>${icon("box", "ic sm")} Over-the-counter medicines</h3><p>Order online straight away.</p><ul>${col(OTC_CATS)}</ul>${link("/products/otc", "All over-the-counter →", "dir-all")}</div>
    <div><h3>${icon("rx", "ic sm")} Prescription medicines</h3><p>Upload a valid prescription; pay after our pharmacist approves it.</p><ul>${col(POM_CATS)}</ul>${link("/products/prescription", "All prescription medicines →", "dir-all")}${link("/prescriptions", "Send a prescription →", "dir-all")}</div>
    <div class="lock"><h3>${icon("lock", "ic sm")} Controlled medicines</h3><p>Not sold online under the Electronic Pharmacy Regulations 2026. Collect in store with your original prescription and photo ID, after our pharmacist checks it.</p>${link("/controlled-medicines", "How to get a controlled medicine →", "dir-all")}</div>`;
}
const drawer = () => $("#drawer");
let lastFocus = null;
function openDrawer() {
  lastFocus = document.activeElement;
  drawer().hidden = false;
  requestAnimationFrame(() => drawer().classList.add("open"));
  $("#menu-toggle").setAttribute("aria-expanded", "true");
  document.body.classList.add("lock-scroll");
  const first = drawer().querySelector(".drawer-close"); if (first) first.focus();
}
function closeDrawer(silent) {
  const d = drawer(); if (!d || d.hidden) return;
  d.classList.remove("open");
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  document.body.classList.remove("lock-scroll");
  if (silent) d.hidden = true; else setTimeout(() => { d.hidden = true; }, 200);
  if (!silent && lastFocus) lastFocus.focus();
}

/* ---------- Render ---------- */
const TITLES = { home: "Synako Pharmacy · Your Pathway to Health and Wellness", rx: "Send a prescription", controlled: "Controlled medicines", basket: "Your basket", checkout: "Checkout", track: "Track your order", notfound: "Page not found" };
function renderCount() { const n = S.cart.reduce((s, l) => s + l.q, 0) + (S.rxRequest ? 1 : 0); document.querySelectorAll("[data-count]").forEach(b => { b.textContent = n; b.hidden = !n; }); }
function loadHeroBg() { const h = $("#hero"); if (!h) return; const im = new Image(); im.onload = () => { h.style.setProperty("--hero-bg", `url("${IMG.heroBg}")`); h.classList.add("has-bg"); }; im.src = IMG.heroBg; }
function render(scroll) {
  const staff = S.mode === "staff";
  $("#shell-customer").hidden = staff; $("#shell-staff").hidden = !staff;
  $("#mode-shop").setAttribute("aria-pressed", String(!staff)); $("#mode-staff").setAttribute("aria-pressed", String(staff));
  let title;
  if (staff) { $("#staff-view").innerHTML = vStaff(); title = "Pharmacist workspace"; }
  else {
    const V = { home: vHome, shop: vShop, product: vProduct, controlled: vControlled, basket: vBasket, checkout: vCheckout, rx: vRx, track: vTrack, page: vPage, notfound: vNotFound }[S.view] || vHome;
    $("#view").innerHTML = V();
    renderCount();
    if (S.view === "home") loadHeroBg();
    const here = pathFor();
    document.querySelectorAll(".nav a[data-link], .drawer a[data-link]").forEach(a => {
      const h = a.getAttribute("href");
      a.setAttribute("aria-current", String(h === here || (h === "/products" && S.view === "shop" && S.filter === "all")));
    });
    title = S.view === "shop" ? filterTitle().replace(/<[^>]+>/g, "") : S.view === "product" ? prod(S.product).name : S.view === "page" ? (CONTENT[S.page] || CONTENT.about)().title : TITLES[S.view];
  }
  document.title = S.view === "home" && !staff ? TITLES.home : `${title} | Synako Pharmacy`;
  if (scroll) window.scrollTo(0, 0);
}

/* Real photos replace the drawn images as soon as they load */
document.addEventListener("load", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.parentNode.classList.add("has-img"); }, true);
document.addEventListener("error", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.remove(); }, true);

function addToCart(id, q) {
  const l = S.cart.find(x => x.id === id);
  if (l) l.q = Math.min(10, l.q + q); else S.cart.push({ id, q });
  const p = prod(id);
  toast(p.cls === "pom" ? `Added ${p.name}. Upload your prescription at checkout.` : `Added ${p.name} to your basket.`);
  renderCount();
}
function saveForm() {
  const f = document.querySelector("form.f[id^='f']"); if (!f) return;
  new FormData(f).forEach((val, key) => { if (typeof File !== "undefined" && val instanceof File) { if (val.name) S.form[key] = val.name; } else S.form[key] = val; });
  f.querySelectorAll("input[type=checkbox]").forEach(c => { S.form[c.name] = c.checked; });
}
function doSearch(q) { S.q = q.trim(); S.filter = "all"; $("#q").value = S.q; const dq = $("#dq"); if (dq) dq.value = S.q; go("/products"); }

/* ---------- Events ---------- */
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-link]");
  if (a) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    if (a.getAttribute("href").startsWith("/products")) { S.q = ""; $("#q").value = ""; }
    go(a.getAttribute("href"));
    return;
  }
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  const d = t.dataset;
  if (t.id === "menu-toggle") { drawer().hidden ? openDrawer() : closeDrawer(); return; }
  if ("closeDrawer" in d) { closeDrawer(); return; }
  if (t.id === "search-toggle") { const bar = $("#searchbar"); bar.hidden = !bar.hidden; t.setAttribute("aria-expanded", String(!bar.hidden)); if (!bar.hidden) $("#q").focus(); return; }
  if (d.mode) { go(d.mode === "staff" ? "/pharmacist" : "/"); return; }
  if (d.tab) { S.tab = d.tab; render(); return; }
  if (d.add) { addToCart(d.add, d.withqty ? S.qty : 1); return; }
  if (d.qty) { S.qty = Math.max(1, Math.min(10, S.qty + Number(d.qty))); $("#qty-val").textContent = S.qty; return; }
  if (d.lineqty) { const l = S.cart.find(x => x.id === d.lineqty); l.q = Math.max(1, Math.min(10, l.q + Number(d.d))); render(); return; }
  if (d.remove) { S.cart = S.cart.filter(x => x.id !== d.remove); render(); return; }
  if ("rxreq" in d) { S.rxRequest = true; S.step = 1; go("/checkout"); toast("Prescription request started."); return; }
  if ("rxreqRemove" in d) { S.rxRequest = false; render(); return; }
  if ("clear" in d) { S.q = ""; $("#q").value = ""; render(); return; }
  if (d.step) { saveForm(); S.step = Number(d.step); render(true); return; }
  if (d.track) { S.trackId = d.track; render(); return; }
  if (d.advance) {
    const o = S.orders.find(x => x.id === d.advance), st = o.rx ? STEPS_RX : STEPS;
    const labels = { Payment: "Payment received", Packed: "Packed and sealed · batch and expiry recorded", "Out for delivery": "Handed to rider", Delivered: "Delivered and signed for" };
    o.log.push({ t: now(), m: labels[st[o.stage]] || st[o.stage] }); o.stage = Math.min(st.length, o.stage + 1); render(); return;
  }
  if (d.sel) { S.sel = Number(d.sel); render(); return; }
  if (d.decide) {
    const r = S.queue[S.sel], form = $("#reviewform"), note = $("#rnote").value.trim();
    if (d.decide === "approved" && !form.reportValidity()) return;
    if (d.decide !== "approved" && !note) { $("#rnote").focus(); toast("Add a note so the customer knows what to do next."); return; }
    r.status = d.decide;
    const msg = { approved: "Approved by Pharm. (prototype) · payment link sent", rejected: "Rejected by Pharm. (prototype)", info: "More information requested by Pharm. (prototype)" }[d.decide];
    r.log.push({ t: now(), m: msg + (note ? ` · “${note}”` : "") });
    const o = S.orders.find(x => x.id === r.id);
    if (o) { o.log.push({ t: now(), m: msg }); if (d.decide === "approved") { o.stage = 2; o.status = "ok"; } else { o.status = d.decide; o.note = note; } }
    toast({ approved: "Approved. Payment link sent to the customer.", rejected: "Rejected. The customer has been told.", info: "Request sent to the customer." }[d.decide]);
    render(); return;
  }
});
document.addEventListener("change", e => { if (e.target.id === "sort") { S.sort = e.target.value; render(); } });
document.addEventListener("keydown", e => {
  const d = drawer(); if (!d || d.hidden) return;
  if (e.key === "Escape") { closeDrawer(); return; }
  if (e.key === "Tab") { // keep focus inside the open drawer
    const f = [...d.querySelectorAll("a, button, input")];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
const wide = window.matchMedia("(min-width: 1001px)");
if (wide.addEventListener) wide.addEventListener("change", m => { if (m.matches) closeDrawer(true); });

document.addEventListener("submit", e => {
  const f = e.target; e.preventDefault();
  if (f.id === "search-form") { doSearch($("#q").value); return; }
  if (f.id === "drawer-search") { doSearch($("#dq").value); return; }
  if (f.id === "trackform") {
    const id = f.tid.value.trim().toUpperCase();
    if (S.orders.some(o => o.id === id) || id === SAMPLE_ORDER.id) { S.trackId = id; render(); } else toast("We can't find that order number. Check your confirmation message.");
    return;
  }
  if (f.id === "contactform" || f.id === "careersform") {
    if (!f.reportValidity()) return;
    f.reset(); toast(f.id === "contactform" ? "Thanks. A pharmacist will reply soon (prototype: nothing was sent)." : "Thanks for your interest (prototype: nothing was sent)."); return;
  }
  if (!/^f[1-4]$/.test(f.id)) return;
  if (f.id === "f3" && S.form.rxfile) f.rxfile.required = false;
  if (!f.reportValidity()) return;
  if (f.id === "f1") {
    const age = (Date.now() - new Date(f.dob.value)) / (365.25 * 864e5);
    if (!(age >= 18)) { f.dob.setCustomValidity("Our medicines can only be supplied to adults aged 18 or over."); f.reportValidity(); f.dob.setCustomValidity(""); return; }
  }
  if (f.id === "f3") {
    const m = (Date.now() - new Date(f.pdate.value)) / (30.44 * 864e5);
    if (m > 6 || m < 0) { f.pdate.setCustomValidity("Prescriptions are valid for 6 months from the date issued. Please upload a current one."); f.reportValidity(); f.pdate.setCustomValidity(""); return; }
  }
  saveForm();
  const ns = stepList().map(s => s.n), i = ns.indexOf(S.step);
  if (S.step !== 4) { S.step = ns[i + 1]; render(true); return; }
  const rx = hasRx(), id = "SYN-" + (20420 + S.orders.length), t = now();
  const o = { id, rx, stage: 1, created: t, items: S.cart.slice(), log: [{ t, m: "Order placed by customer" }] };
  if (rx) {
    o.log.push({ t, m: "Prescription uploaded (1 file) · sent to pharmacist queue" });
    S.queue.unshift({ id, patient: (S.form.name || "Customer").split(/\s+/).map(w => w[0] + ".").join(" ") + " (you)", items: S.cart.slice(), status: "pending", at: t,
      prescriber: { name: S.form.pname, reg: S.form.preg, phone: S.form.pphone, clinic: S.form.pclinic, issued: S.form.pdate }, log: [{ t, m: "Prescription uploaded by customer" }] });
    S.sel = 0;
  } else {
    o.log.push({ t, m: "Payment received · " + (S.form.pay || "card") + " (prototype)" });
    o.log.push({ t, m: "Order recorded on National Electronic Pharmacy Platform · pending integration" });
    o.stage = 2;
  }
  S.orders.unshift(o); S.trackId = id; S.cart = []; S.rxRequest = false; S.step = 1;
  go("/track");
  toast(rx ? `Order ${id} sent to our pharmacist.` : `Order ${id} placed.`);
});

renderDirectory();
go(MEMORY ? "/" : location.pathname, { replace: true });
})();

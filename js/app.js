/* Synako Pharmacy — website.
   Orders, prescriptions and payments go to the API in /api (Vercel). Business details come
   from js/config.js, products from js/data.js, delivery rules from js/pricing.js.
   When the page runs without a server (the design preview), a built-in demo stands in for
   the API so every flow can still be tried; nothing is saved or charged there. */
(function () {
"use strict";

const CFG = window.SYNAKO_CONFIG, PR = window.SYNAKO_PRICING, art = window.SYNAKO_ART;
const { CATS, P, STATES, FAQ } = window.SYNAKO;
const B = CFG.business, L = CFG.licences, H = CFG.hours, D = CFG.delivery, C = CFG.consultation;

const has = v => v != null && String(v).trim() !== "";
const NGN = n => PR.fmtMoney(n, CFG);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);
const prod = id => P.find(p => p.id === id);
const cat = id => CATS.find(c => c.id === id);
const OTC_CATS = CATS.filter(c => c.cls === "otc"), POM_CATS = CATS.filter(c => c.cls === "pom");
const stamp = d => new Date(d).toLocaleString(CFG.site.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: CFG.site.timezone });
const addressLine = [B.address, B.city, B.state].filter(has).join(", ");
const cutoff = PR.fmt12(D.sameDayCutoff);
const threshold = NGN(D.nextDayThreshold);

const IMG = {
  hero: "assets/hero-pharmacist.webp",
  pharmacistMale: "assets/pharmacist-male.webp",
  pharmacistFemale: "assets/pharmacist-female.webp",
  delivery: "assets/delivery.webp",
  mobileMockup: "assets/mobile-mockup.webp"
};

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
  store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>'
};
const icon = (k, cls) => `<svg class="${cls || "ic"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.box}</svg>`;

/* ---------- State ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  sget(k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } },
  sset(k, v) { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
};
const S = {
  mode: "shop", view: "home", filter: "all", tab: "body", q: "", sort: "popular", product: null, qty: 1, page: "about",
  cart: store.get("synako.cart", []), rxRequest: false, step: 1, form: {}, busy: false, error: "",
  mine: store.get("synako.orders", []), trackId: null, track: null, trackErr: "",
  staff: { token: store.sget("synako.staff"), name: store.sget("synako.staffName"), list: null, sel: null, detail: null, file: null, tab: "review", err: "", updated: null }
};
const saveCart = () => store.set("synako.cart", S.cart);
const saveMine = () => store.set("synako.orders", S.mine.slice(0, 20));

/* ---------- API (live) with a built-in demo for previews ---------- */
const MEMORY = !!window.SYNAKO_MEMORY_ROUTER || location.protocol === "file:";
const LIVE = { checked: MEMORY, orders: false, payments: false, staff: false, paystackPublicKey: "" };
const DEMO = MEMORY;
async function checkLive() {
  if (MEMORY) return;
  try { const r = await fetch("/api/health", { cache: "no-store" }); if (r.ok) Object.assign(LIVE, await r.json()); } catch (e) { /* offline or no API */ }
  LIVE.checked = true;
}
async function call(path, opts) {
  opts = opts || {};
  const headers = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = "Bearer " + opts.token;
  let r;
  try { r = await fetch("/api/" + path, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: "no-store" }); }
  catch (e) { throw new Error("We couldn't reach Synako. Check your internet connection and try again."); }
  let j = {}; try { j = await r.json(); } catch (e) { /* empty */ }
  if (!r.ok) throw Object.assign(new Error(j.error || "Something went wrong. Please try again."), { status: r.status });
  return j;
}
const demo = (() => {
  const orders = new Map(), reqs = [];
  const NEXT = { pending_review: ["approve", "info", "reject"], info_needed: ["approve", "reject", "resume"], awaiting_payment: ["cancel"], approved_awaiting_payment: ["cancel"], paid: ["packed"], packed: ["dispatched"], out_for_delivery: ["delivered"] };
  const LBL = { awaiting_payment: "Awaiting payment", pending_review: "Pharmacist review", info_needed: "More information needed", approved_awaiting_payment: "Approved, awaiting payment", rejected: "Not approved", paid: "Paid", packed: "Packed", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled" };
  const id = p => (p || "SYN") + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const log = (o, m, internal) => o.history.push({ t: new Date().toISOString(), m, internal: !!internal });
  const pub = o => ({ id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: LBL[o.status], rx: o.rx, rxRequest: o.rxRequest, items: o.items, subtotal: o.subtotal, deliveryFee: o.deliveryFee, total: o.total, priced: o.priced,
    delivery: o.delivery, note: ["info_needed", "rejected"].includes(o.status) ? o.note : "", canPay: ["awaiting_payment", "approved_awaiting_payment"].includes(o.status) && o.priced, history: o.history.filter(h => !h.internal) });
  const full = o => Object.assign({}, o, { statusLabel: LBL[o.status], actions: NEXT[o.status] || [] });
  const wait = v => new Promise(r => setTimeout(() => r(v), 250));
  function make(b) {
    const q = PR.quote({ items: b.items, state: b.delivery.state, speed: b.delivery.speed, rxRequest: b.rxRequest }, CFG, P);
    const rx = b.rxRequest || q.lines.some(l => l.cls === "pom");
    const o = { id: id(), createdAt: new Date().toISOString(), rx, rxRequest: !!b.rxRequest, status: rx ? "pending_review" : "awaiting_payment", items: q.lines, subtotal: q.subtotal, deliveryFee: q.deliveryFee, total: q.total, priced: !b.rxRequest,
      delivery: Object.assign({}, b.delivery, { speed: q.speed, label: q.speedLabel }), customer: b.customer, prescriber: rx ? b.prescription : null, file: rx ? b.prescription.file : null, history: [] };
    log(o, "Order placed"); if (rx) log(o, "Prescription received · waiting for pharmacist review"); if (q.big) log(o, "Order above the express limit · next-day delivery");
    orders.set(o.id, o); return o;
  }
  // Two sample prescriptions so the Pharmacist Desk isn't empty in the preview
  [["metf", "Dr K. Eze (sample)", "MDCN 00000", "Sample Clinic, Ikeja, Lagos", "2026-08-02"], ["amox", "Dr F. Bello (sample)", "", "Sample Hospital, Wuse, Abuja", "2026-03-11"]].forEach(([pid, n, reg, clinic, issued], i) => {
    const o = make({ items: [{ id: pid, q: 1 }], delivery: { state: "Lagos", city: "Ikeja", addr: "Sample address", speed: "nextday" }, customer: { name: ["Ada B. (sample)", "Chidi D. (sample)"][i], phone: "08000000000", email: "sample@example.com" }, prescription: { pname: n, preg: reg, pphone: "0800 000 0001", pclinic: clinic, pdate: issued } });
    o.createdAt = new Date(Date.now() - (18 + i * 25) * 60000).toISOString();
  });
  const find = (oid, phone) => { const o = orders.get(String(oid).toUpperCase()); if (!o || String(o.customer.phone).replace(/\D/g, "").slice(-4) !== String(phone).replace(/\D/g, "").slice(-4)) throw new Error("We can't find an order with that number and phone."); return o; };
  return {
    createOrder: b => wait({ order: pub(make(b)) }),
    getOrder: (oid, phone) => wait({ order: pub(find(oid, phone)) }),
    payStart: (oid, phone) => { const o = find(oid, phone); return wait({ reference: o.id + "-1", amount: Math.round(o.total * 100), email: o.customer.email, mock: true }); },
    payVerify: ref => { const o = orders.get(ref.replace(/-\d+$/, "")); o.status = "paid"; log(o, "Payment received · demo (no money taken)"); return wait({ order: pub(o) }); },
    request: () => wait({ id: id("MSG") }),
    staffLogin: () => wait({ token: "demo" }),
    staffList: () => wait({ orders: [...orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => ({ id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: LBL[o.status], rx: o.rx, rxRequest: o.rxRequest, customer: o.customer.name, total: o.total, priced: o.priced, items: o.items.map(i => `${i.qty} × ${i.name}`), speed: o.delivery.label })), requests: reqs, missing: missingDetails() }),
    staffOrder: (t, oid) => { const o = orders.get(oid); return wait({ order: full(o), file: o.file || null }); },
    staffAct: (t, b) => {
      const o = orders.get(b.id);
      if (!(NEXT[o.status] || []).includes(b.action)) return Promise.reject(new Error("You can't do that now."));
      if (["info", "reject"].includes(b.action) && !b.note) return Promise.reject(new Error("Add a note so the customer knows what to do next."));
      const map = { approve: "approved_awaiting_payment", info: "info_needed", reject: "rejected", resume: "pending_review", cancel: "cancelled", packed: "packed", dispatched: "out_for_delivery", delivered: "delivered" };
      if (b.action === "approve" && o.rxRequest) { const x = Number(b.price); if (!(x > 0)) return Promise.reject(new Error("Enter the price for the prescription items.")); o.items.push({ id: "rx-request", name: b.itemsText || "Prescription items", qty: 1, price: x, total: x, cls: "pom" }); o.subtotal += x; o.total = o.subtotal + o.deliveryFee; o.priced = true; }
      o.status = map[b.action]; o.note = b.note || "";
      const msg = { approve: "Prescription approved by pharmacist · payment link ready", info: "Pharmacist needs more information", reject: "Prescription not approved", resume: "Back in pharmacist review", cancel: "Order cancelled", packed: "Packed and sealed · batch and expiry recorded", dispatched: "Out for delivery", delivered: "Delivered" }[b.action];
      log(o, msg); log(o, `${msg} by ${b.by || "Pharmacist"}${b.note ? ` · “${b.note}”` : ""}`, true);
      return wait({ order: full(o) });
    }
  };
})();
const api = {
  createOrder: b => DEMO ? demo.createOrder(b) : call("orders", { method: "POST", body: b }),
  getOrder: (id, phone) => DEMO ? demo.getOrder(id, phone) : call(`order?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`),
  payStart: (id, phone) => DEMO ? demo.payStart(id, phone) : call("pay-start", { method: "POST", body: { id, phone } }),
  payVerify: reference => DEMO ? demo.payVerify(reference) : call("pay-verify", { method: "POST", body: { reference } }),
  request: b => DEMO ? demo.request(b) : call("requests", { method: "POST", body: b }),
  staffLogin: password => DEMO ? demo.staffLogin(password) : call("staff/login", { method: "POST", body: { password } }),
  staffList: t => DEMO ? demo.staffList(t) : call("staff/orders", { token: t }),
  staffOrder: (t, id) => DEMO ? demo.staffOrder(t, id) : call("staff/order?id=" + encodeURIComponent(id), { token: t }),
  staffAct: (t, b) => DEMO ? demo.staffAct(t, b) : call("staff/order", { method: "POST", body: b, token: t })
};
const ordersOn = () => DEMO || LIVE.orders;
const paymentsOn = () => DEMO || LIVE.payments;

function loadPaystack() {
  return new Promise((ok, no) => {
    if (window.PaystackPop) return ok();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v2/inline.js";
    s.onload = () => ok(); s.onerror = () => no(new Error("We couldn't open the payment window. Check your connection and try again."));
    document.head.appendChild(s);
  });
}
async function payOrder(id, phone) {
  const p = await api.payStart(id, phone);
  if (p.mock) return api.payVerify(p.reference);
  await loadPaystack();
  return new Promise((ok, no) => {
    const pop = new window.PaystackPop();
    pop.newTransaction({
      key: p.publicKey || LIVE.paystackPublicKey, email: p.email, amount: p.amount, currency: "NGN", reference: p.reference,
      onSuccess: t => api.payVerify(t.reference || p.reference).then(ok, no),
      onCancel: () => no(Object.assign(new Error("Payment cancelled. You haven't been charged, and you can pay later from Track order."), { cancel: true })),
      onError: e => no(new Error((e && e.message) || "The payment didn't go through. You haven't been charged."))
    });
  });
}

/* ---------- Router ---------- */
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
  else if (a === "track") { r.view = "track"; if (b) r.trackId = b.toUpperCase(); }
  else if (a === "basket" || a === "checkout") r.view = a;
  else if (a === "pharmacist") { r.view = "home"; r.mode = "staff"; }
  else if (PAGES.includes(a)) { r.view = "page"; r.page = a; }
  else r.view = "notfound";
  return r;
}
const fpath = f => "/products" + (f === "all" ? "" : f === "otc" ? "/otc" : f === "pom" ? "/prescription" : "/" + f);
function pathFor() {
  if (S.mode === "staff") return "/pharmacist";
  switch (S.view) {
    case "home": return "/";
    case "shop": return fpath(S.filter);
    case "product": return "/product/" + S.product;
    case "rx": return "/prescriptions";
    case "controlled": return "/controlled-medicines";
    case "track": return "/track" + (S.trackId ? "/" + S.trackId : "");
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
  S.error = "";
  if (r.filter) S.filter = r.filter;
  if (r.product) { S.product = r.product; S.qty = 1; }
  if (r.page) S.page = r.page;
  if (r.view === "track") { S.trackId = r.trackId || S.trackId; }
  if (!MEMORY && !opts.noHistory) { try { history[opts.replace ? "replaceState" : "pushState"]({}, "", pathFor()); } catch (e) { /* stay in memory */ } }
  closeDrawer(true);
  render(true);
  if (S.view === "track" && S.trackId) loadTrack();
  if (S.mode === "staff" && S.staff.token) loadDesk();
  const focusTarget = S.mode === "staff" ? $("#staff-view") : $("#view");
  if (!opts.replace && focusTarget) focusTarget.focus({ preventScroll: true });
}
window.addEventListener("popstate", () => go(location.pathname, { noHistory: true }));
const link = (path, label, cls, extra) => `<a href="${path}" data-link${cls ? ` class="${cls}"` : ""}${extra ? " " + extra : ""}>${label}</a>`;

/* ---------- Small pieces ---------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3200); }
const photo = (src, style, alt) => `<img src="${src}" alt="${esc(alt || "")}" loading="lazy" decoding="async" data-swap${style ? ` style="${style}"` : ""}>`;
const media = p => p.photo ? `<span class="drawn">${art(p)}</span>${photo(p.photo, "", p.name)}` : `<span class="drawn">${art(p)}</span>`;
const tag = p => p.cls === "pom" ? `<span class="tag rx">Prescription only</span>` : `<span class="tag otc">Over the counter</span>`;
const alertBox = msg => msg ? `<div class="notice bad" role="alert" tabindex="-1" id="form-error"><b>Something needs attention</b><span>${esc(msg)}</span></div>` : "";
const phoneText = () => has(B.phone) ? `<a class="tel" href="tel:${esc(B.phone.replace(/\s/g, ""))}">${esc(B.phone)}</a>` : "";
const contactLine = () => has(B.phone) ? `call ${phoneText()}` : `use the ${link("/contact", "contact page", "linkbtn")}`;
function hoursRows() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const t = s => PR.fmt12(s);
  return [1, 2, 3, 4, 5, 6, 0].map(d => `<dt>${days[d]}</dt><dd>${H.open[d] ? `${t(H.open[d][0])} – ${t(H.open[d][1])}` : "Closed"}</dd>`).join("");
}
function missingDetails() {
  return [["Pharmacy address", B.address], ["City", B.city], ["State", B.state], ["Phone number", B.phone], ["Email", B.email], ["Company name", B.companyName], ["RC number", B.rcNumber],
    ["PCN premises number", L.pcnPremises], ["PCN e-pharmacy licence", L.pcnEPharmacy], ["Superintendent pharmacist", L.superintendentName], ["Superintendent PCN reg. no.", L.superintendentPcnReg], ["PCN ROPSE emblem", L.ropseImage]].filter(([, v]) => !has(v)).map(([k]) => k);
}
function personSVG(kind) {
  const hair = kind === "female" ? `<path d="M112 128c0-44 26-74 58-74s58 30 58 74c0 30-6 56-14 72l-8-70c-8-18-22-26-36-26s-28 8-36 26l-8 70c-8-16-14-42-14-72z" fill="#9FB3D1"/>` : "";
  return `<svg viewBox="0 0 340 420" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${hair}
    <ellipse cx="170" cy="138" rx="52" ry="62" fill="#B8C8E0"/><path d="M148 186h44v46h-44z" fill="#B8C8E0"/>
    <path d="M24 420c4-96 54-160 146-160s142 64 146 160z" fill="#FFFFFF" stroke="#CACDD8" stroke-width="2"/>
    <path d="M136 262l34 74 34-74c-10-4-22-6-34-6s-24 2-34 6z" fill="#3362AB"/></svg>`;
}
function card(p) {
  const rx = p.cls === "pom";
  return `<article class="pcard">
    <a class="pcard-media" href="/product/${p.id}" data-link tabindex="-1" aria-hidden="true"><span class="pcard-badge ${rx ? "rx" : "otc"}">${rx ? "Prescription" : "Over the counter"}</span>${media(p)}</a>
    <div class="pcard-body">
      <p class="pcard-brand">${esc(p.brand === "Generic" ? cat(p.cat).name : p.brand)}</p>
      <h3 class="pcard-name"><a href="/product/${p.id}" data-link>${esc(p.name)}</a></h3>
      <p class="pcard-pack">${esc(p.pack)}</p>
      <p class="pcard-price"><span class="price">${p.was ? `<span class="sr">Now </span>` : ""}${NGN(p.price)}</span>${p.was ? ` <s class="was"><span class="sr">Was </span>${NGN(p.was)}</s>` : ""}</p>
      <button class="btn ${rx ? "btn-accent-soft" : "btn-secondary"} btn-sm btn-block" type="button" data-add="${p.id}" aria-label="Add ${esc(p.name)} to basket${rx ? ", prescription needed" : ""}">${rx ? "Add · prescription" : "Add to basket"}</button>
    </div>
  </article>`;
}
/* Section heading: eyebrow, title, optional intro and "view all" link */
function sectionHead(id, eyebrow, title, intro, more, center) {
  return `<header class="shead${center ? " center" : ""}"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h2 id="${id}">${title}</h2>${intro ? `<p class="shead-intro">${intro}</p>` : ""}</div>${more || ""}</header>`;
}

/* ---------- Home (follows the Figma "Main Web" frame, refined) ---------- */
function vHome() {
  const popular = P.filter(p => p.pop).slice(0, 6);
  const TABS = [["body", "Body care"], ["family", "Mother & baby"], ["vitamins", "Vitamins"], ["devices", "Health devices"]];
  const tabItems = P.filter(p => p.cat === S.tab).slice(0, 4);
  return `
  <section class="hero" aria-labelledby="hero-title"><div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Registered pharmacy · Delivery across Nigeria</p>
      <h1 id="hero-title">Your Pathway to <br class="br-lg">Health and Wellness</h1>
      <p class="lede">Empowering you to live your healthiest life, with genuine NAFDAC-registered medicines checked by our pharmacists and delivered to your door.</p>
      <div class="ctas">${link("/products", "Shop health products", "btn btn-primary btn-lg")}${link("/prescriptions", "Send a prescription", "btn btn-accent btn-lg")}</div>
      <ul class="hero-points">
        <li>${icon("check", "ic sm")} Home delivery in ${D.expressMinutes} minutes</li>
        <li>${icon("check", "ic sm")} Same day for orders before ${cutoff}</li>
        <li>${icon("check", "ic sm")} Free advice from a pharmacist</li>
      </ul>
    </div>
    <figure class="hero-media">
      <img src="${IMG.hero}" alt="A smiling Synako pharmacist at his desk" width="960" height="1196" fetchpriority="high" decoding="async">
      <figcaption class="hero-card">${icon("shield", "ic")}<span><b>Pharmacist-checked</b><span>Every order is reviewed by a registered Synako pharmacist.</span></span></figcaption>
    </figure>
  </div></section>

  <section class="trust" aria-label="Why shop with Synako"><div class="wrap trust-grid">
    <div>${icon("shield", "ic")}<p><b>Registered pharmacy</b><span>${has(L.pcnEPharmacy) ? `PCN e-pharmacy licence ${esc(L.pcnEPharmacy)}` : "Pharmacy Council of Nigeria"}</span></p></div>
    <div>${icon("file", "ic")}<p><b>Prescriptions checked</b><span>Before anything is charged</span></p></div>
    <div>${icon("box", "ic")}<p><b>NAFDAC-registered</b><span>From approved suppliers</span></p></div>
    <div>${icon("card", "ic")}<p><b>Secure payment</b><span>Card, transfer or USSD by Paystack</span></p></div>
  </div></section>

  <section class="section" aria-labelledby="routes-title"><div class="wrap">
    ${sectionHead("routes-title", "Shop your way", "How would you like to shop?", "", "", true)}
    <div class="routes">
      <a class="route" href="/products/otc" data-link><span class="route-ic">${icon("box", "ic")}</span><span><b>Over-the-counter</b><span>${P.filter(p => p.cls === "otc").length} products · order straight away</span></span><span class="arrow" aria-hidden="true">→</span></a>
      <a class="route rx" href="/products/prescription" data-link><span class="route-ic">${icon("rx", "ic")}</span><span><b>Prescription medicines</b><span>${P.filter(p => p.cls === "pom").length} medicines · upload your prescription</span></span><span class="arrow" aria-hidden="true">→</span></a>
      <a class="route lock" href="/controlled-medicines" data-link><span class="route-ic">${icon("lock", "ic")}</span><span><b>Controlled medicines</b><span>In store only · not sold online</span></span><span class="arrow" aria-hidden="true">→</span></a>
    </div>
  </div></section>

  <section class="section tight" aria-labelledby="popular-title"><div class="wrap">
    ${sectionHead("popular-title", "Bestsellers", "Most popular products", "", link("/products", "View all products <span aria-hidden=\"true\">→</span>", "more"))}
    <div class="cards">${popular.map(card).join("")}</div>
    <div class="strip">${icon("rx", "ic")}<p><b>Have a prescription?</b> Upload it at checkout. You pay only after our pharmacist approves it.</p>${link("/prescriptions", "How it works <span aria-hidden=\"true\">→</span>", "more")}</div>
  </div></section>

  <section class="section tight" aria-label="Services"><div class="wrap pair">
    <article class="feature">
      <div class="feature-copy"><p class="eyebrow">Free advice</p><h2>Talk to a Pharmacist</h2>
        <p>Don't self medicate. Talk to an expert. Reach a Synako pharmacist in <strong>under ${C.freeMinutes} minutes</strong> during opening hours. Need longer? Book a consultation.</p>${link("/contact", "Get started", "btn btn-primary")}</div>
      <div class="feature-photo"><div class="fallback">${personSVG("female")}</div>${photo(IMG.pharmacistFemale, "object-position:42% 30%", "A Synako pharmacist on the phone")}</div>
    </article>
    <article class="feature feature-warm">
      <div class="feature-copy"><p class="eyebrow">Fast delivery</p><h2>Home delivery in ${D.expressMinutes} minutes</h2>
        <p>Tired of waiting in a queue? Too weak to go to the store? We bring your medicines to you. Orders above ${threshold} are delivered the next day.</p>${link("/products", "Order now", "btn btn-primary")}</div>
      <div class="feature-photo"><div class="fallback">${icon("truck", "ic huge")}</div>${photo(IMG.delivery, "", "A Synako delivery rider holding parcels")}</div>
    </article>
  </div></section>

  <section class="section tight" aria-labelledby="browse-title"><div class="wrap">
    ${sectionHead("browse-title", "Browse", "Medicines &amp; health products", "", "", true)}
    <div class="tabs" role="tablist" aria-label="Product categories">
      ${TABS.map(([id, label]) => `<button type="button" role="tab" id="tab-${id}" aria-controls="tabpanel" data-tab="${id}" aria-selected="${S.tab === id}" tabindex="${S.tab === id ? 0 : -1}">${label}</button>`).join("")}
    </div>
    <div class="cards cards-4" role="tabpanel" id="tabpanel" aria-labelledby="tab-${S.tab}">${tabItems.map(card).join("")}</div>
    <div class="center">${link("/products/" + S.tab, "View all " + esc(cat(S.tab).name.toLowerCase()), "btn btn-secondary")}</div>
  </div></section>

  <section class="section tight" aria-labelledby="steps-title"><div class="wrap">
    ${sectionHead("steps-title", "Prescriptions", "How prescription orders work", "Required by Nigeria's Electronic Pharmacy Regulations 2026, and it keeps you safe.", "", true)}
    <ol class="steps">${stepsHTML()}</ol>
    <div class="center">${link("/prescriptions", "Start a prescription order", "btn btn-accent btn-lg")}</div>
  </div></section>

  ${mobileBanner()}`;
}
/* The "Try it now on mobile" banner, as designed */
function mobileBanner() {
  return `<section class="mbanner" aria-labelledby="mb-title"><div class="wrap mb-grid">
    <div class="mb-copy">
      <h2 id="mb-title"><span class="mb-try">Try it </span><span class="mb-now">now on</span><br><span class="mb-mobile">mobile</span></h2>
      <p>Your hand held device is also available for you to place your orders, calls or events. Remember, we are available to our customers 24/7.</p>
      <div class="mb-stores">
        <button class="mb-store apple" type="button" data-app aria-label="Download on the App Store (coming soon)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.2 14.9H6.9l.7-1.2h1.9zm4.8 0h-3.3l3.2-5.6-1-1.7.9-1.6 1.9 3.3zm3.6 0h-2.1l-.7-1.2h2.1zm-5.4-6.3L9.1 6.4l.9-1.6 1.8 3.2z"/></svg>
          <span><small>Download on</small><b>App Store</b></span></button>
        <button class="mb-store google" type="button" data-app aria-label="Get it on Google Play (coming soon)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00C3FF" d="M4 2.6v18.8c0 .3.2.5.4.6L14.8 12 4.4 2c-.2.1-.4.3-.4.6z"/><path fill="#FFCE00" d="M18.4 8.4L14.8 12l3.6 3.6 3.4-1.9c1-.6 1-2 0-2.6z"/><path fill="#FF3A44" d="M14.8 12L4.4 22c.3.2.6.2.9 0l13.1-6.4z"/><path fill="#00F076" d="M14.8 12l3.6-3.6L5.3 2c-.3-.2-.6-.2-.9 0z"/></svg>
          <span><small>Get it on</small><b>Google Play</b></span></button>
      </div>
    </div>
    <div class="mb-art"><img src="${IMG.mobileMockup}" alt="The Synako website open on two phones" width="286" height="332" loading="lazy"></div>
  </div></section>`;
}
function stepsHTML() {
  return `<li class="step"><span class="n" aria-hidden="true">1</span><h3>Upload your prescription</h3><p>A photo or scan from a licensed prescriber, with their Nigerian clinic address, registration number and signature.</p></li>
    <li class="step"><span class="n" aria-hidden="true">2</span><h3>Our pharmacist checks it</h3><p>We confirm the prescriber, the date (valid for 6 months) and that the medicine is right for you.</p></li>
    <li class="step"><span class="n" aria-hidden="true">3</span><h3>You pay once approved</h3><p>Nothing is charged until your prescription is approved. Pay by card, bank transfer or USSD through Paystack.</p></li>
    <li class="step"><span class="n" aria-hidden="true">4</span><h3>We pack and deliver</h3><p>Sealed packaging and tracked delivery, with a pharmacist on call for questions.</p></li>`;
}

/* ---------- Shop ---------- */
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
  const fb = (f, label) => `<a href="${fpath(f)}" data-link aria-current="${S.filter === f ? "page" : "false"}"><span>${label}</span><span class="ct">${count(f)}</span></a>`;
  const chips = [["all", "All"], ["otc", "Over the counter"], ["pom", "Prescription"]].concat(CATS.map(c => [c.id, c.name]));
  const isPom = S.filter === "pom" || (cat(S.filter) && cat(S.filter).cls === "pom");
  return `<div class="wrap page-head"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}<span aria-hidden="true">/</span>${link("/products", "Products")}</nav><h1>${filterTitle()}</h1></div>
  <div class="wrap shop">
    <nav class="filters" aria-label="Product categories">
      ${fb("all", "All products")}
      <h2 class="fh">Over the counter</h2>${fb("otc", "All over-the-counter")}${OTC_CATS.map(c => fb(c.id, c.name)).join("")}
      <h2 class="fh">Prescription only</h2>${fb("pom", "All prescription")}${POM_CATS.map(c => fb(c.id, c.name)).join("")}
      <h2 class="fh">Controlled medicines</h2><a href="/controlled-medicines" data-link><span>In store only</span><span class="ct">${icon("lock", "ic sm")}</span></a>
    </nav>
    <div style="min-width:0">
      <nav class="chips" aria-label="Product categories">${chips.map(([f, l]) => `<a href="${fpath(f)}" data-link aria-current="${S.filter === f ? "page" : "false"}">${l}</a>`).join("")}</nav>
      ${isPom ? `<div class="notice rx small" style="margin-bottom:1rem"><b>Prescription needed at checkout</b><span>You can add these to your basket, then upload a valid prescription. Our pharmacist checks it before anything is charged.</span></div>` : ""}
      <div class="toolbar"><p class="muted small" role="status">${list.length} product${list.length === 1 ? "" : "s"}${S.q ? ` · <button class="linkbtn" type="button" data-clear>Clear search</button>` : ""}</p>
        <label class="sort" for="sort">Sort by <select id="sort">${[["popular", "Most popular"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["az", "Name: A to Z"]].map(([v, l]) => `<option value="${v}" ${S.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <h2 class="sr">${esc(filterTitle())}: products</h2>
      ${list.length ? `<div class="grid-shop">${list.map(card).join("")}</div>`
        : `<div class="empty"><p><b>No products match “${esc(S.q)}”.</b></p><p style="margin-top:.4rem">Try a generic name, such as paracetamol, or ${link("/contact", "ask our pharmacist", "linkbtn")} if we stock it. Controlled medicines aren't listed online.</p></div>`}
    </div>
  </div>`;
}

function vProduct() {
  const p = prod(S.product); if (!p) return vNotFound();
  const rx = p.cls === "pom", c = cat(p.cat);
  const related = P.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  return `<div class="wrap page-head" style="padding-bottom:.5rem"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}<span aria-hidden="true">/</span>${link(rx ? "/products/prescription" : "/products/otc", rx ? "Prescription" : "Over the counter")}<span aria-hidden="true">/</span>${link("/products/" + p.cat, c.name)}</nav></div>
  <div class="wrap pdp">
    <div class="visual">${media(p)}</div>
    <div class="info">
      ${tag(p)}
      <h1>${esc(p.name)}</h1>
      <div class="brand">${esc(p.brand)} · <span class="muted" style="font-weight:400">${esc(p.pack)}</span></div>
      <div>${p.was ? `<span class="muted num" style="text-decoration:line-through;margin-right:.5rem"><span class="sr">Was </span>${NGN(p.was)}</span>` : ""}<span class="price num">${NGN(p.price)}</span></div>
      ${rx ? `<div class="notice rx"><b>Prescription required</b><span>Add it to your basket, then upload your prescription at checkout. Our pharmacist checks it before you pay, and we only supply it if the prescription is valid.</span></div>`
           : `<div class="notice info"><b>Over-the-counter</b><span>Our pharmacist may contact you before sending it if they need to check it's right for you.</span></div>`}
      <div class="buy">
        <div class="qty" role="group" aria-label="Quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span class="num" id="qty-val" aria-live="polite">${S.qty}</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
        <button class="btn ${rx ? "btn-accent" : "btn-primary"} btn-lg" type="button" data-add="${p.id}" data-withqty="1">${rx ? "Add to basket · prescription needed" : "Add to basket"}</button>
      </div>
      <dl class="specs">
        <dt>${p.cls === "pom" || p.strength || !["device", "thermo", "kit", "strips", "bar"].includes(p.form) && !["body", "devices", "sexual"].includes(p.cat) ? "Active ingredient" : "Product type"}</dt><dd>${esc(p.generic)}</dd>
        ${p.strength ? `<dt>Strength</dt><dd>${esc(p.strength)}</dd>` : ""}
        <dt>Pack size</dt><dd>${esc(p.pack)}</dd>
        <dt>Classification</dt><dd>${rx ? "Prescription-only medicine (POM)" : "Over-the-counter (OTC)"}</dd>
        ${has(p.nafdac) ? `<dt>NAFDAC reg. no.</dt><dd>${esc(p.nafdac)}</dd>` : ""}
        <dt>Storage</dt><dd>Store below 30°C in a dry place, away from sunlight and out of reach of children.</dd>
      </dl>
      <div class="facts">
        <details open><summary>What it's for</summary><p>${esc(p.use)}</p></details>
        <details><summary>How to use</summary><p>${esc(p.how)} Always read the label and patient leaflet.</p></details>
        <details><summary>Warnings</summary><p>${esc(p.warn)}</p></details>
        <details><summary>Delivery</summary><p>Home delivery in ${D.expressMinutes} minutes during opening hours, or same-day delivery for orders placed before ${cutoff}. Orders above ${threshold} are delivered the next day. We deliver within Nigeria only.</p></details>
      </div>
      <p class="small muted">Questions about this product? ${link("/contact", "Talk to a pharmacist", "linkbtn")}.</p>
    </div>
  </div>
  ${related.length ? `<section class="wrap related" aria-labelledby="rel-title">${sectionHead("rel-title", "", "More in " + esc(c.name), "", link("/products/" + p.cat, "View all <span aria-hidden=\"true\">→</span>", "more"))}<div class="cards cards-4">${related.map(card).join("")}</div></section>` : ""}`;
}

/* ---------- Controlled medicines (information only, nothing for sale) ---------- */
function vControlled() {
  return `<div class="wrap page-head"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}<span aria-hidden="true">/</span>${link("/products", "Products")}</nav>
    <h1>Controlled medicines</h1><p class="muted lead">Available in store only, with a valid prescription.</p></div>
  <div class="wrap two">
    <div style="display:grid;gap:1.25rem">
      <div class="notice rx"><b>Why you can't order these online</b><span>Nigeria's Electronic Pharmacy Regulations 2026 prohibit the online sale of controlled medicines and dangerous drugs. This protects patients from misuse and counterfeit supply. Synako follows these rules, so controlled medicines are not listed or sold on this website.</span></div>
      <div class="panel prose">
        <h2>What counts as a controlled medicine?</h2>
        <p>Controlled medicines are those the law restricts more tightly because they can cause dependence or be misused. They can include some strong painkillers, some medicines for sleep or anxiety, some medicines for seizures or nerve pain, and some medicines for ADHD. Our pharmacist can tell you whether a medicine on your prescription is controlled.</p>
        <h2>How to get a controlled medicine from Synako</h2>
        <ol class="olist">
          <li><b>Contact us first</b> so we can check stock and have it ready: ${contactLine()}.</li>
          <li><b>Bring your original prescription</b> to our pharmacy${addressLine ? ` at ${esc(addressLine)}` : ""}. Photos and copies aren't accepted for controlled medicines.</li>
          <li><b>Bring photo ID.</b> The medicine must be collected by the patient, or a named representative with their own ID.</li>
          <li><b>Our pharmacist checks and supplies it,</b> records it in our controlled drugs register, and explains how to take it safely.</li>
        </ol>
        <h2>Something on your prescription is controlled?</h2>
        <p>If you upload a prescription online that includes a controlled medicine, we'll prepare the other items as normal and our pharmacist will contact you to arrange collection of the controlled item in store.</p>
      </div>
    </div>
    <aside class="panel" style="display:grid;gap:.75rem;align-content:start">
      <h2 class="h3">Our pharmacy</h2>
      <dl class="kv">${addressLine ? `<dt>Address</dt><dd>${esc(addressLine)}</dd>` : ""}${has(B.phone) ? `<dt>Phone</dt><dd>${phoneText()}</dd>` : ""}<dt>Hours</dt><dd>${esc(H.label)}</dd></dl>
      ${link("/contact", "Contact the pharmacy", "btn btn-primary")}
      <p class="small muted">Looking for other medicines? ${link("/products/prescription", "Prescription medicines", "linkbtn")} and ${link("/products/otc", "over-the-counter products", "linkbtn")} can be ordered online.</p>
    </aside>
  </div>`;
}

/* ---------- Basket & checkout ---------- */
const items = () => S.cart.filter(l => prod(l.id)).map(l => Object.assign({}, l, { p: prod(l.id) }));
const hasRx = () => S.rxRequest || S.cart.some(l => prod(l.id) && prod(l.id).cls === "pom");
const quoteNow = () => PR.quote({ items: S.cart, state: S.form.state, speed: S.form.speed, rxRequest: S.rxRequest }, CFG, P);
function summary(cta) {
  const q = quoteNow();
  return `<aside class="panel summary" aria-labelledby="sum-title"><h2 class="h3" id="sum-title">Order summary</h2>
    ${items().map(l => `<div class="r small"><span>${l.q} × ${esc(l.p.name)}</span><span class="num">${NGN(l.p.price * l.q)}</span></div>`).join("")}
    ${S.rxRequest ? `<div class="r small"><span>Prescription items</span><span class="muted">Priced by pharmacist</span></div>` : ""}
    <div class="r"><span>Subtotal</span><span class="num">${NGN(q.subtotal)}</span></div>
    <div class="r"><span>Delivery <span class="muted small">(${esc(q.speedLabel)})</span></span><span class="num">${NGN(q.deliveryFee)}</span></div>
    <div class="r total"><span>Total</span><span class="num">${NGN(q.total)}${S.rxRequest ? "+" : ""}</span></div>
    ${q.big ? `<div class="notice info small"><b>Next-day delivery</b><span>Orders above ${threshold} are delivered the next day.</span></div>` : ""}
    ${hasRx() ? `<div class="notice rx small"><b>Pay after approval</b><span>Your order has prescription items, so nothing is charged until our pharmacist approves the prescription.</span></div>` : ""}
    ${cta || ""}</aside>`;
}
function vBasket() {
  const list = items();
  if (!list.length && !S.rxRequest) return `<div class="wrap page-head"><h1>Your basket</h1></div>
    <div class="wrap" style="padding-bottom:3rem"><div class="empty"><p><b>Your basket is empty.</b></p><p style="margin:.4rem 0 1rem">Browse products, or send a prescription and we'll prepare it for you.</p>
    <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">${link("/products", "Shop products", "btn btn-primary")}${link("/prescriptions", "Send a prescription", "btn btn-accent")}</div></div></div>`;
  return `<div class="wrap page-head"><h1>Your basket</h1></div>
  <div class="wrap two"><section class="panel" aria-label="Items in your basket">
    ${list.map(l => `<div class="line"><a class="thumb" href="/product/${l.p.id}" data-link tabindex="-1" aria-hidden="true">${media(l.p)}</a>
      <div style="min-width:0">${link("/product/" + l.p.id, esc(l.p.name), "linkbtn dark")}<div class="muted small">${esc(l.p.pack)}</div><div style="margin-top:.35rem">${tag(l.p)}</div></div>
      <div class="right"><b class="num">${NGN(l.p.price * l.q)}</b>
        <div class="qty" role="group" aria-label="Quantity of ${esc(l.p.name)}"><button type="button" data-lineqty="${l.id}" data-d="-1" aria-label="Decrease">−</button><span class="num" aria-live="polite">${l.q}</span><button type="button" data-lineqty="${l.id}" data-d="1" aria-label="Increase">+</button></div>
        <button class="rm" type="button" data-remove="${l.id}" aria-label="Remove ${esc(l.p.name)}">Remove</button></div></div>`).join("")}
    ${S.rxRequest ? `<div class="line"><div class="thumb rxthumb" aria-hidden="true">℞</div><div><b>Prescription request</b><div class="muted small">Our pharmacist will add the medicines on your prescription and confirm the price.</div></div><div class="right"><button class="rm" type="button" data-rxreq-remove>Remove</button></div></div>` : ""}
  </section>${summary(`${link("/checkout", "Go to checkout", "btn btn-primary btn-lg full")}${link("/products", "Continue shopping", "linkbtn center-self")}`)}</div>`;
}
function stepList() { const s = [{ n: 1, l: "Your details" }, { n: 2, l: "Delivery" }]; if (hasRx()) s.push({ n: 3, l: "Prescription" }); s.push({ n: 4, l: hasRx() ? "Review & submit" : "Review & pay" }); return s; }
function vCheckout() {
  if (!S.cart.length && !S.rxRequest) return vBasket();
  if (LIVE.checked && !ordersOn()) return `<div class="wrap page-head"><h1>Checkout</h1></div><div class="wrap" style="padding-bottom:3rem"><div class="notice info"><b>Online ordering opens soon</b><span>We're finishing our online checkout. To order now, ${contactLine()} during opening hours (${esc(H.label)}).</span></div></div>`;
  const steps = stepList();
  if (!steps.some(s => s.n === S.step)) S.step = 1;
  const F = S.form, v = k => esc(F[k] || ""), rx = hasRx();
  const q = quoteNow();
  let body = "";
  if (S.step === 1) body = `<form class="f" id="f1" novalidate><h2>Your details</h2>
    <div class="row2"><label for="fn">Full name<input id="fn" name="name" required value="${v("name")}" autocomplete="name"></label>
    <label for="phn">Phone number<span class="hint">We'll use it to confirm delivery and to find your order.</span><input id="phn" name="phone" type="tel" inputmode="tel" required minlength="10" placeholder="0803 000 0000" value="${v("phone")}" autocomplete="tel"></label></div>
    <div class="row2"><label for="em">Email<span class="hint">Paystack sends your receipt here.</span><input id="em" name="email" type="email" required value="${v("email")}" autocomplete="email"></label>
    <label for="dob">Date of birth<span class="hint">We supply medicines to adults 18 and over only.</span><input id="dob" name="dob" type="date" required value="${v("dob")}" autocomplete="bday"></label></div>
    <label class="check"><input type="checkbox" id="adult" name="adult" required ${F.adult ? "checked" : ""}><span>I confirm I am 18 or over and the medicines are for me or someone I care for.</span></label>
    <label class="check"><input type="checkbox" id="consent" name="consent" required ${F.consent ? "checked" : ""}><span>I agree to Synako processing my health information to supply my order, as set out in the ${link("/privacy", "privacy notice", "linkbtn")}.</span></label>
    <div class="actions">${link("/basket", "Back to basket", "btn btn-ghost")}<button class="btn btn-primary" type="submit">Continue to delivery</button></div></form>`;
  if (S.step === 2) body = `<form class="f" id="f2" novalidate><h2>Delivery</h2><p class="muted small">We deliver within Nigeria only.</p>
    <div class="row2"><label for="st">State<select id="st" name="state" required><option value="">Choose a state</option>${STATES.map(s => `<option ${F.state === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label for="city">City / LGA<input id="city" name="city" required value="${v("city")}" autocomplete="address-level2"></label></div>
    <label for="addr">Street address<input id="addr" name="addr" required value="${v("addr")}" autocomplete="street-address"></label>
    <label for="lm">Nearest landmark<span class="hint">Helps our rider find you.</span><input id="lm" name="landmark" value="${v("landmark")}"></label>
    <fieldset class="pay" id="speeds"><legend>Delivery option</legend>
      ${q.options.map(o => `<label for="sp-${o.speed}" class="${o.available ? "" : "off"}"><input type="radio" id="sp-${o.speed}" name="speed" value="${o.speed}" ${q.speed === o.speed ? "checked" : ""} ${o.available ? "" : "disabled"}>
        <span><b>${esc(o.label)}</b> · ${NGN(o.fee)}${o.available ? "" : `<span class="why">${esc(o.reason)}</span>`}</span></label>`).join("")}
      ${q.big ? `<p class="small muted">Orders above ${threshold} are delivered the next day.</p>` : ""}
      ${!q.openNow ? `<p class="small muted">We're closed right now (open ${esc(H.label)}). You can still order; we'll start on it when we open.</p>` : ""}
    </fieldset>
    <div class="actions"><button class="btn btn-ghost" type="button" data-step="1">Back</button><button class="btn btn-primary" type="submit">${rx ? "Continue to prescription" : "Continue to payment"}</button></div></form>`;
  if (S.step === 3) body = `<form class="f" id="f3" novalidate><h2>Your prescription</h2>
    <div class="notice rx small"><b>What makes a prescription valid</b><span>Issued within the last 6 months by a licensed prescriber, showing their name, signature, registration number, phone number, and a clinic or hospital address in Nigeria.</span></div>
    <div class="drop"><label for="rxfile"><b>Upload a photo or scan</b></label><span class="muted small" id="rxhint">JPG, PNG or PDF. Make sure all four corners are visible. Photos are resized automatically.</span>
      <input id="rxfile" name="rxfile" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-describedby="rxhint" ${F.rxfile ? "" : "required"}>
      <span id="rxstatus" role="status">${F.rxfile ? `<span class="tag ok">Attached: ${esc(F.rxfile.name)}</span>` : ""}</span></div>
    <fieldset><legend>Prescriber details, as shown on the prescription</legend>
      <div class="row2"><label for="pn">Prescriber name<input id="pn" name="pname" required value="${v("pname")}"></label>
      <label for="preg">Registration number<span class="hint">For example, their MDCN number.</span><input id="preg" name="preg" required value="${v("preg")}"></label></div>
      <div class="row2"><label for="pph">Prescriber phone<input id="pph" name="pphone" type="tel" required value="${v("pphone")}"></label>
      <label for="pdate">Date issued<input id="pdate" name="pdate" type="date" required value="${v("pdate")}"></label></div>
      <label for="pclinic">Clinic or hospital address in Nigeria<input id="pclinic" name="pclinic" required value="${v("pclinic")}"></label></fieldset>
    <label for="allg">Allergies or other medicines you take<span class="hint">Optional, but it helps our pharmacist.</span><textarea id="allg" name="allergies" rows="2">${v("allergies")}</textarea></label>
    <p class="small muted">If your prescription includes a controlled medicine, we'll contact you to arrange collection of that item in store.</p>
    <div class="actions"><button class="btn btn-ghost" type="button" data-step="2">Back</button><button class="btn btn-primary" type="submit">Continue to review</button></div></form>`;
  if (S.step === 4) body = `<form class="f" id="f4" novalidate aria-busy="${S.busy}"><h2>Review and ${rx ? "submit" : "pay"}</h2>
    ${alertBox(S.error)}
    <div class="panel" style="padding:1rem"><dl class="kv"><dt>Name</dt><dd>${v("name")}</dd><dt>Phone</dt><dd>${v("phone")}</dd><dt>Deliver to</dt><dd>${v("addr")}, ${v("city")}, ${v("state")}</dd><dt>Delivery</dt><dd>${esc(q.speedLabel)}</dd>${rx ? `<dt>Prescription</dt><dd>${F.rxfile ? esc(F.rxfile.name) : "Attached"} · ${v("pname")}</dd>` : ""}</dl></div>
    <div class="paybox">${icon("card", "ic big")}<div><b>${rx ? "You'll pay after approval" : `Pay ${NGN(q.total)} securely with Paystack`}</b>
      <p class="small muted">Card (Verve, Mastercard, Visa), bank transfer or USSD. Synako never sees your card number.${rx ? ` Once our pharmacist approves your prescription, a <b>Pay now</b> button appears on your order page.` : ""}</p></div></div>
    <label class="check"><input type="checkbox" id="terms" name="terms" required ${F.terms ? "checked" : ""}><span>I agree to the ${link("/terms", "terms of sale", "linkbtn")}.</span></label>
    <div class="actions"><button class="btn btn-ghost" type="button" data-step="${rx ? 3 : 2}" ${S.busy ? "disabled" : ""}>Back</button>
      <button class="btn ${rx ? "btn-accent" : "btn-primary"}" type="submit" ${S.busy ? "disabled" : ""}>${S.busy ? (rx ? "Sending…" : "Opening payment…") : rx ? "Submit for pharmacist review" : `Place order and pay ${NGN(q.total)}`}</button></div>
    ${DEMO ? `<p class="small muted">Design preview: orders and payments here are simulated. Nothing is charged.</p>` : ""}</form>`;
  return `<div class="wrap page-head"><h1>Checkout</h1></div>
  <div class="wrap two"><div class="panel">
    <ol class="stepper" aria-label="Checkout steps">${steps.map(s => `<li><button type="button" data-step="${s.n}" ${s.n === S.step ? 'aria-current="step"' : ""} class="${s.n < S.step ? "done" : ""}" ${s.n > S.step ? "disabled" : ""}>${s.l}</button></li>`).join("")}</ol>
    ${body}</div>${summary()}</div>`;
}

function vRx() {
  return `<div class="wrap page-head"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}</nav>
    <h1>Send us your prescription</h1><p class="muted lead">Upload a valid prescription and our pharmacist will prepare it. You only pay once it's approved.</p></div>
  <div class="wrap two">
    <div style="display:grid;gap:1rem">
      <div class="panel" style="display:grid;gap:.75rem"><h2 class="h3">Option 1 · You know the medicine</h2><p class="muted small">Find it in the shop, add it to your basket, and upload the prescription at checkout.</p><div>${link("/products/prescription", "Browse prescription medicines", "btn btn-primary")}</div></div>
      <div class="panel" style="display:grid;gap:.75rem"><h2 class="h3">Option 2 · Just upload it</h2><p class="muted small">Send the prescription as it is. Our pharmacist reads it, adds the medicines, and confirms the price before you pay.</p><div><button class="btn btn-accent" type="button" data-rxreq>Upload a prescription</button></div></div>
      <div class="panel" style="display:grid;gap:.6rem"><h2 class="h3">Controlled medicines</h2><p class="muted small">These can't be sold online. If your prescription includes one, our pharmacist will arrange in-store collection. ${link("/controlled-medicines", "How it works", "linkbtn")}</p></div>
      <ol class="steps steps-compact">${stepsHTML()}</ol>
    </div>
    <aside class="panel" style="display:grid;gap:.7rem;align-content:start"><h2 class="h3">A valid prescription shows</h2>
      <ul class="small" style="margin:0;padding-left:1.1rem;display:grid;gap:.3rem"><li>The prescriber's full name and signature</li><li>Their registration number</li><li>Their phone number</li><li>A clinic or hospital address in Nigeria</li><li>A date within the last 6 months</li><li>The medicine, strength and directions</li></ul>
      <div class="notice info small"><span>We keep a record of every prescription and its review, as the regulations require.</span></div></aside>
  </div>`;
}

/* ---------- Tracking (refreshes itself while you watch) ---------- */
const STEPS_RX = ["Order placed", "Pharmacist review", "Payment", "Packed", "Out for delivery", "Delivered"];
const STEPS_OTC = ["Order placed", "Payment", "Packed", "Out for delivery", "Delivered"];
function stageOf(o) {
  const m = o.rx ? { pending_review: 1, info_needed: 1, rejected: 1, approved_awaiting_payment: 2, paid: 3, packed: 4, out_for_delivery: 5, delivered: 6, cancelled: 1 }
                 : { awaiting_payment: 1, paid: 2, packed: 3, out_for_delivery: 4, delivered: 5, cancelled: 1 };
  return m[o.status] != null ? m[o.status] : 1;
}
const statusTag = o => {
  const cls = { delivered: "ok", paid: "ok", rejected: "bad", cancelled: "bad", info_needed: "warn", pending_review: "warn", awaiting_payment: "warn", approved_awaiting_payment: "warn" }[o.status] || "otc";
  return `<span class="tag ${cls}">${esc(o.statusLabel || o.status)}</span>`;
};
const phoneFor = id => (S.mine.find(m => m.id === id) || {}).phone || "";
async function loadTrack(phone) {
  const id = S.trackId; if (!id) return;
  phone = phone || phoneFor(id);
  if (!phone) { S.track = null; S.trackErr = ""; render(); return; }
  try {
    const { order } = await api.getOrder(id, phone);
    if (S.trackId !== id) return;
    S.track = order; S.trackErr = "";
    if (!S.mine.some(m => m.id === id)) { S.mine.unshift({ id, phone, at: order.createdAt }); saveMine(); }
  } catch (e) { S.track = null; S.trackErr = e.message; }
  if (S.view === "track") render();
}
function vTrack() {
  const o = S.track && S.track.id === S.trackId ? S.track : null;
  const needPhone = S.trackId && !phoneFor(S.trackId) && !o;
  const final = o && ["delivered", "rejected", "cancelled"].includes(o.status);
  const st = o ? (o.rx ? STEPS_RX : STEPS_OTC) : [];
  const stage = o ? stageOf(o) : 0;
  const bad = o && ["rejected", "cancelled"].includes(o.status);
  return `<div class="wrap page-head"><h1>Track your order</h1><p class="muted lead">Your order page updates by itself, so you can leave it open.</p></div>
  <div class="wrap two track">
    <div style="display:grid;gap:1rem;align-content:start">
      <form class="f panel" id="trackform" novalidate><h2 class="h3">Find an order</h2>
        <label for="tid">Order number<input id="tid" name="tid" placeholder="SYN-XXXXXX" class="mono" required value="${esc(S.trackId || "")}" autocapitalize="characters"></label>
        <label for="tph">Last 4 digits of your phone number<input id="tph" name="tph" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autocomplete="off" value="${needPhone ? "" : esc(phoneFor(S.trackId).slice(-4))}"></label>
        <button class="btn btn-primary" type="submit">Find order</button></form>
      ${S.mine.length ? `<nav class="order-list" aria-label="Your recent orders"><h2 class="h3">Your recent orders</h2>${S.mine.map(m => `<a class="order-pick" href="/track/${m.id}" data-link aria-current="${m.id === S.trackId ? "page" : "false"}"><b class="mono">${m.id}</b><span class="small muted">${m.at ? stamp(m.at) : ""}</span></a>`).join("")}</nav>` : ""}
    </div>
    <section class="panel" style="display:grid;gap:1.25rem;align-content:start" aria-live="polite" aria-busy="${S.trackId && !o && !S.trackErr && !needPhone}">
      ${!S.trackId ? `<div class="empty-state">${icon("truck", "ic big")}<p><b>Enter your order number</b></p><p class="muted small">You'll find it on the page you saw after ordering, and in your Paystack receipt.</p></div>`
      : S.trackErr ? alertBox(S.trackErr)
      : needPhone ? `<div class="empty-state"><p><b>Order ${esc(S.trackId)}</b></p><p class="muted small">Enter the last 4 digits of the phone number you used to see this order.</p></div>`
      : !o ? `<p class="muted">Loading your order…</p>`
      : `<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center"><div><div class="muted small">Order</div><h2 class="mono" style="font-size:1.4rem">${esc(o.id)}</h2><div class="muted small">Placed ${stamp(o.createdAt)}</div></div>${statusTag(o)}</div>
        ${o.status === "rejected" ? `<div class="notice rx"><b>We couldn't approve this prescription</b><span>${esc(o.note || "Our pharmacist will contact you to explain.")} You have not been charged.</span></div>` : ""}
        ${o.status === "info_needed" ? `<div class="notice rx"><b>Our pharmacist needs more information</b><span>${esc(o.note || "We'll call you shortly.")}</span></div>` : ""}
        ${o.status === "pending_review" ? `<div class="notice info"><b>Your prescription is with our pharmacist</b><span>Usually within an hour during opening hours (${esc(H.label)}). This page updates when it's approved.</span></div>` : ""}
        ${o.canPay ? `<div class="paybox go">${icon("card", "ic big")}<div><b>${o.status === "approved_awaiting_payment" ? "Approved! " : ""}Pay ${NGN(o.total)} to confirm your order</b><p class="small muted">Card, bank transfer or USSD through Paystack.</p></div><button class="btn btn-primary btn-lg" type="button" data-pay="${esc(o.id)}" ${S.busy ? "disabled" : ""}>${S.busy ? "Opening payment…" : "Pay now"}</button></div>` : ""}
        ${o.rxRequest && !o.priced ? `<p class="small muted">Our pharmacist will add your prescription items and their price when they approve it.</p>` : ""}
        <ol class="timeline">${st.map((s, i) => { const c = i < stage ? "done" : (i === stage && !bad && !final ? "now" : "next"); return `<li class="${c}"><span class="dot ${c}" aria-hidden="true">${i < stage ? "✓" : i + 1}</span><div><b>${s}</b>${c === "now" ? `<div class="small muted">In progress</div>` : ""}<span class="sr">${c === "done" ? " (done)" : c === "now" ? " (current step)" : ""}</span></div></li>`; }).join("")}</ol>
        <details class="facts"><summary>Order details</summary>
          <div class="small" style="display:grid;gap:.35rem;margin-top:.6rem">${o.items.map(i => `<div class="r"><span>${i.qty} × ${esc(i.name)}</span><span class="num">${NGN(i.total)}</span></div>`).join("")}
          <div class="r"><span>Delivery · ${esc(o.delivery.label)}</span><span class="num">${NGN(o.deliveryFee)}</span></div><div class="r"><b>Total</b><b class="num">${NGN(o.total)}${o.priced ? "" : "+"}</b></div></div></details>
        <div><h3 style="margin-bottom:.5rem">Order record</h3><div class="audit">${o.history.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>
        ${final ? "" : `<p class="small muted">Questions? ${contactLine()}.</p>`}`}
    </section>
  </div>`;
}

/* ---------- Content pages ---------- */
const DRAFT = `<div class="notice info small"><b>Draft</b><span>This page should be reviewed by Synako's lawyer and data protection adviser.</span></div>`;
const CONTENT = {
  about: () => ({ title: "About Synako", lead: "A registered Nigerian pharmacy, online.", body: `
    <div class="about-hero">
      <div class="prose"><h2>Our story</h2>
        <p>Synako Pharmacy exists to make genuine medicines and good pharmaceutical advice easy to reach for every Nigerian family. You can order from us online and get the same care you'd get at our counter${addressLine ? ` in ${esc([B.city, B.state].filter(has).join(", "))}` : ""}.</p>
        <p>Every order, online or in store, is supervised by our superintendent pharmacist${has(L.superintendentName) ? `, ${esc(L.superintendentName)}` : ""}. We stock only NAFDAC-registered products from approved suppliers, and we record the batch and expiry date of every item we send.</p></div>
      <figure class="about-photo"><div class="fallback">${personSVG("female")}</div>${photo(IMG.pharmacistFemale, "object-position:42% 30%", "A Synako pharmacist")}</figure>
    </div>
    <div class="values">
      <div>${icon("shield", "ic big")}<h3>Safe</h3><p>Pharmacist checks on every prescription, and controlled medicines supplied in person only.</p></div>
      <div>${icon("box", "ic big")}<h3>Genuine</h3><p>NAFDAC-registered stock from approved manufacturers and distributors.</p></div>
      <div>${icon("chat", "ic big")}<h3>Personal</h3><p>Real pharmacists you can reach in under ${C.freeMinutes} minutes for free advice.</p></div>
      <div>${icon("truck", "ic big")}<h3>Fast</h3><p>Home delivery in ${D.expressMinutes} minutes, or same day for orders before ${cutoff}.</p></div>
    </div>` }),
  contact: () => ({ title: "Talk to a pharmacist", lead: `Quick questions are free, and you'll reach a pharmacist in under ${C.freeMinutes} minutes during opening hours.`, body: `
    <div class="two flat">
      <div style="display:grid;gap:1.25rem">
        <form class="f panel" id="contactform" novalidate><div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div><h2>${icon("chat", "ic")} Quick question (free)</h2>
          <p class="small muted">For advice that takes under ${C.freeMinutes} minutes: a medicine, a side effect, or your order.</p>
          <div class="row2"><label for="cn">Your name<input id="cn" name="name" required autocomplete="name"></label><label for="cp">Phone number<input id="cp" name="phone" type="tel" required minlength="10" autocomplete="tel"></label></div>
          <label for="ctopic">What's it about?<select id="ctopic" name="topic"><option>Advice about a medicine</option><option>My order</option><option>A prescription</option><option>Controlled medicine collection</option><option>Something else</option></select></label>
          <label for="cmsg">Message<textarea id="cmsg" name="message" rows="4" required></textarea></label>
          <div><button class="btn btn-primary" type="submit">Send message</button></div></form>
        <form class="f panel" id="apptform" novalidate><div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div><h2>${icon("cal", "ic")} Book a consultation</h2>
          <p class="small muted">Anything longer than ${C.freeMinutes} minutes, such as a medicines review or advice on a long-term condition, is by appointment. ${C.fee ? `A consultation costs ${NGN(C.fee)}.` : "A consultation fee applies; we'll confirm it when we call to confirm your appointment."}</p>
          <div class="row2"><label for="an">Your name<input id="an" name="name" required autocomplete="name"></label><label for="ap">Phone number<input id="ap" name="phone" type="tel" required minlength="10" autocomplete="tel"></label></div>
          <div class="row2"><label for="ad">Date<input id="ad" name="date" type="date" required min="${new Date().toISOString().slice(0, 10)}"></label>
            <label for="at">Time<select id="at" name="time" required><option value="">Choose a time</option>${slots().map(t => `<option value="${t}">${PR.fmt12(t)}</option>`).join("")}</select></label></div>
          <label for="areason">What would you like to discuss?<textarea id="areason" name="message" rows="3"></textarea></label>
          <div><button class="btn btn-primary" type="submit">Request appointment</button></div></form>
        <p class="small muted">In an emergency, go to your nearest hospital or call 112. Don't wait for a reply.</p>
      </div>
      <aside class="panel" style="display:grid;gap:.9rem;align-content:start">
        <h2 class="h3">Synako Pharmacy</h2>
        <dl class="kv">${addressLine ? `<dt>Address</dt><dd>${esc(addressLine)}</dd>` : ""}${has(B.phone) ? `<dt>Phone</dt><dd>${phoneText()}</dd>` : ""}${has(B.whatsapp) ? `<dt>WhatsApp</dt><dd>${esc(B.whatsapp)}</dd>` : ""}${has(B.email) ? `<dt>Email</dt><dd>${esc(B.email)}</dd>` : ""}</dl>
        <h2 class="h3">Opening hours</h2>
        <dl class="kv">${hoursRows()}</dl>
        <p class="small muted">You can order online at any time. Orders placed while we're closed are handled when we open.</p>
      </aside>
    </div>` }),
  faq: () => ({ title: "Frequently asked questions", lead: "Quick answers about ordering, prescriptions and delivery.", body: `<div class="faq">${FAQ.map(([q, a], i) => `<details ${i === 0 ? "open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    <details><summary>How fast is delivery?</summary><p>Home delivery in ${D.expressMinutes} minutes during opening hours (${esc(H.label)}), or same-day delivery for orders placed before ${cutoff}. Orders above ${threshold} are delivered the next day.</p></details>
    <details><summary>Is pharmacist advice free?</summary><p>Yes, for quick questions: you'll reach a pharmacist in under ${C.freeMinutes} minutes. Longer consultations are by appointment and a fee applies.</p></details>
    <details><summary>How do I pay?</summary><p>Securely through Paystack, by card (Verve, Mastercard, Visa), bank transfer or USSD. For prescription orders you pay after our pharmacist approves the prescription.</p></details></div>
    <p style="margin-top:1.5rem">Can't find your answer? ${link("/contact", "Talk to a pharmacist", "linkbtn")}.</p>` }),
  delivery: () => ({ title: "Delivery", lead: "We deliver within Nigeria only.", body: `
    <div class="table-wrap" tabindex="0" role="region" aria-label="Delivery options and fees"><table class="tbl"><caption class="sr">Delivery options and fees</caption><thead><tr><th scope="col">Option</th><th scope="col">When</th><th scope="col">Fee</th></tr></thead><tbody>
      <tr><td>Home delivery in ${D.expressMinutes} minutes</td><td>During opening hours (${esc(H.label)})${has(D.expressArea) ? `, ${esc(D.expressArea)}` : ""}</td><td class="num">${NGN(D.fees.express)}</td></tr>
      <tr><td>Same day</td><td>Orders placed before ${cutoff}, Monday to Saturday</td><td class="num">${NGN(D.fees.sameDay)}</td></tr>
      <tr><td>Next day</td><td>All other orders, and every order above ${threshold}</td><td class="num">${NGN(D.fees.nextDay)}</td></tr>
      <tr><td>Other states</td><td>2–4 working days</td><td class="num">${NGN(D.fees.otherStates)}</td></tr>
    </tbody></table></div>
    <div class="panel prose"><h2>How we deliver medicines</h2><ul class="olist">
      <li>Every order is packed and sealed by our pharmacy team and checked by a pharmacist.</li>
      <li>Orders above ${threshold} are always delivered the next day, so we can prepare and insure them properly.</li>
      <li>Medicines that need cool storage travel in insulated packaging and are sent only to areas we can reach in time.</li>
      <li>Our rider may ask for your order number and, for prescription items, to see ID.</li>
      <li>We can't deliver outside Nigeria: the regulations don't allow cross-border online sales of medicines.</li></ul></div>` }),
  returns: () => ({ title: "Returns and refunds", lead: "", body: `${DRAFT}<div class="panel prose">
    <h2>Medicines</h2><p>For your safety, we can't take back medicines once they've left the pharmacy, because we can't be sure they were stored correctly. If a medicine arrives damaged, faulty, past its expiry date, or isn't what you ordered, contact us within 48 hours and we'll replace it or refund you.</p>
    <h2>Devices and personal care</h2><p>Unopened devices and personal care items can be returned within 7 days for a refund. Faulty devices are covered by the manufacturer's warranty; we'll help you claim.</p>
    <h2>Prescriptions we can't approve</h2><p>If our pharmacist can't approve your prescription, you're never charged, because payment is only taken after approval.</p>
    <h2>How refunds are paid</h2><p>Refunds go back to the card or account you paid with through Paystack, usually within 5–10 working days.</p></div>` }),
  privacy: () => ({ title: "Privacy notice", lead: "How we handle your personal and health information.", body: `${DRAFT}<div class="panel prose">
    <h2>Who we are</h2><p>${esc(has(B.companyName) ? B.companyName : "Synako Pharmacy")}${has(B.rcNumber) ? ` (RC ${esc(B.rcNumber)})` : ""}${addressLine ? `, ${esc(addressLine)}` : ""}, is the data controller for information you give us.${has(B.email) ? ` Contact us about privacy at ${esc(B.email)}.` : ""}</p>
    <h2>What we collect</h2><p>Your name, contact details, date of birth, delivery address, order history, payment confirmations from Paystack (not your card number), prescriptions and the details on them, and anything you tell our pharmacists about your health.</p>
    <h2>Why we use it</h2><p>To supply your medicines safely and lawfully, check prescriptions, confirm your age, deliver your order, keep the records pharmacy law requires, and answer your questions. We rely on your consent and on our legal obligations under the Nigeria Data Protection Act 2023 and pharmacy regulations.</p>
    <h2>Who we share it with</h2><p>Only those who need it to complete your order: our delivery riders (name, address, phone), Paystack for payment, our email provider (Resend) to send order updates, and the Pharmacy Council of Nigeria's National Electronic Pharmacy Platform, as the regulations require. We never sell your data.</p>
    <h2>How long we keep it</h2><p>Prescription and dispensing records are kept for as long as pharmacy law requires. Other information is kept only as long as needed.</p>
    <h2>Your rights</h2><p>You can ask to see, correct or delete your information, withdraw consent, or complain to the Nigeria Data Protection Commission.</p>
    <h2>Security</h2><p>Information is encrypted in transit, and prescriptions can only be opened by our pharmacists after signing in.</p></div>` }),
  terms: () => ({ title: "Terms of sale", lead: "", body: `${DRAFT}<div class="panel prose">
    <h2>About these terms</h2><p>These terms apply when you order from Synako Pharmacy online. By placing an order you agree to them.</p>
    <h2>Who can order</h2><p>You must be 18 or over and have a delivery address in Nigeria.</p>
    <h2>Prescriptions and professional checks</h2><p>Prescription-only medicines are supplied only against a valid prescription checked by our pharmacist. Our pharmacists may decline to supply any medicine, or limit quantities, if they believe it isn't safe or appropriate. Controlled medicines are not sold online.</p>
    <h2>Prices and payment</h2><p>Prices are in Naira. Payment is taken through Paystack. For orders with prescription items, payment is taken only after approval.</p>
    <h2>Delivery</h2><p>Home delivery in ${D.expressMinutes} minutes applies during opening hours. Orders above ${threshold} are delivered the next day. See the Delivery page for options and fees.</p>
    <h2>Consultations</h2><p>Quick pharmacist advice of up to ${C.freeMinutes} minutes is free. Longer consultations are by appointment and charged separately.</p>
    <h2>Cancellations and returns</h2><p>You can cancel before your order is packed. See Returns and refunds.</p></div>` }),
  licences: () => ({ title: "Our licences", lead: "Check that you're buying from a registered pharmacy.", body: `
    <div class="licence panel">${has(L.ropseImage) ? `<a href="${esc(L.ropseLink || "#")}" ${has(L.ropseLink) ? 'rel="noopener" target="_blank"' : ""}><img class="ropse-img" src="${esc(L.ropseImage)}" alt="PCN Registered Online Pharmacy Sites Emblem" width="120" height="120"></a>` : ""}
      <dl class="kv"><dt>Pharmacy</dt><dd>Synako Pharmacy</dd>${has(B.companyName) ? `<dt>Company</dt><dd>${esc(B.companyName)}${has(B.rcNumber) ? `, RC ${esc(B.rcNumber)}` : ""}</dd>` : ""}
      ${has(L.pcnPremises) ? `<dt>PCN premises certificate</dt><dd>${esc(L.pcnPremises)}</dd>` : ""}${has(L.pcnEPharmacy) ? `<dt>PCN e-pharmacy licence</dt><dd>${esc(L.pcnEPharmacy)} (renewed annually)</dd>` : ""}
      ${has(L.superintendentName) ? `<dt>Superintendent pharmacist</dt><dd>${esc(L.superintendentName)}${has(L.superintendentPcnReg) ? `, PCN reg. no. ${esc(L.superintendentPcnReg)}` : ""}</dd>` : ""}${addressLine ? `<dt>Registered address</dt><dd>${esc(addressLine)}</dd>` : ""}</dl></div>
    <p class="muted" style="margin-top:1rem">You can confirm a pharmacy's registration with the Pharmacy Council of Nigeria.</p>` }),
  cookies: () => ({ title: "Cookies", lead: "", body: `${DRAFT}<div class="panel prose"><p>We don't use advertising or tracking cookies. Your browser stores your basket and the orders you've placed on this device so they're there when you come back. If we add analytics later, we'll ask for your consent first and list them here.</p></div>` }),
  careers: () => ({ title: "Careers at Synako", lead: "Join a pharmacy team that puts patients first.", body: `
    <div class="panel prose"><h2>Open roles</h2><p>We don't have open roles right now, but we'd love to hear from pharmacists, pharmacy technicians, dispatch riders and customer support staff. Register your interest and we'll contact you when a role opens.</p></div>
    <form class="f panel" id="careersform" novalidate style="margin-top:1rem"><div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div><h2>Register your interest</h2>
      <div class="row2"><label for="kn">Full name<input id="kn" name="name" required autocomplete="name"></label><label for="ke">Email<input id="ke" name="email" type="email" required autocomplete="email"></label></div>
      <div class="row2"><label for="kr">Role you're interested in<select id="kr" name="role"><option>Pharmacist</option><option>Pharmacy technician</option><option>Dispatch rider</option><option>Customer support</option><option>Other</option></select></label>
      <label for="kc">PCN registration number<span class="hint">Pharmacists and technicians only.</span><input id="kc" name="pcn"></label></div>
      <div><button class="btn btn-primary" type="submit">Register interest</button></div></form>` })
};
function slots() { const out = []; for (let m = 7 * 60 + 30; m <= 17 * 60; m += 30) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`); return out; }
function vPage() {
  const c = (CONTENT[S.page] || CONTENT.about)();
  return `<div class="wrap page-head"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}</nav><h1>${c.title}</h1>${c.lead ? `<p class="muted lead">${c.lead}</p>` : ""}</div>
    <div class="wrap content">${c.body}</div>`;
}
function vNotFound() {
  return `<div class="wrap page-head"><h1>Page not found</h1><p class="muted lead">The page you're looking for isn't here.</p></div>
    <div class="wrap" style="padding-bottom:3rem;display:flex;gap:.75rem;flex-wrap:wrap">${link("/", "Go to the home page", "btn btn-primary")}${link("/products", "Browse products", "btn btn-ghost")}</div>`;
}

/* ---------- Pharmacist Desk (staff) ---------- */
let deskTimer = null, trackTimer = null;
async function loadDesk(silent) {
  const st = S.staff; if (!st.token) return;
  try {
    const d = await api.staffList(st.token);
    const before = st.list ? st.list.orders.filter(o => o.status === "pending_review").length : null;
    st.list = d; st.err = ""; st.updated = new Date();
    const now = d.orders.filter(o => o.status === "pending_review").length;
    if (before != null && now > before) toast(`New prescription to review (${now} waiting).`);
    if (st.sel && !silent) await loadDeskOrder(st.sel, true);
  } catch (e) { if (e.status === 401) signOut(); else st.err = e.message; }
  if (S.mode === "staff") render();
}
async function loadDeskOrder(id, quiet) {
  const st = S.staff; st.sel = id;
  if (!quiet) { st.detail = null; render(); }
  try { const d = await api.staffOrder(st.token, id); st.detail = d.order; st.file = d.file; st.err = ""; }
  catch (e) { if (e.status === 401) return signOut(); st.err = e.message; }
  if (S.mode === "staff") render();
}
function signOut() { S.staff = { token: "", name: S.staff.name, list: null, sel: null, detail: null, file: null, tab: "review", err: "" }; store.sset("synako.staff", ""); render(); }
function vStaff() {
  const st = S.staff;
  if (!st.token) return `<div class="wrap desk-login"><form class="f panel" id="staffform" novalidate>
      <h1 class="h2">Pharmacist Desk</h1><p class="muted small">For Synako pharmacy staff only. Sign in to review prescriptions and manage orders.</p>
      ${alertBox(st.err)}
      <label for="sname">Your name<span class="hint">Recorded against every decision you make.</span><input id="sname" name="sname" required autocomplete="name" value="${esc(st.name)}"></label>
      <label for="spw">Desk password<input id="spw" name="spw" type="password" required autocomplete="current-password"></label>
      <button class="btn btn-primary" type="submit">Sign in</button>
      ${DEMO ? `<p class="small muted">Design preview: any password works.</p>` : ""}</form></div>`;
  const d = st.list;
  if (!d) return `<div class="wrap"><p class="muted" style="padding:2rem 0">Loading the desk…</p></div>`;
  const groups = {
    review: d.orders.filter(o => ["pending_review", "info_needed"].includes(o.status)),
    pack: d.orders.filter(o => ["paid", "packed", "out_for_delivery"].includes(o.status)),
    pay: d.orders.filter(o => ["awaiting_payment", "approved_awaiting_payment"].includes(o.status)),
    done: d.orders.filter(o => ["delivered", "rejected", "cancelled"].includes(o.status))
  };
  const tabs = [["review", "To review"], ["pack", "To pack & deliver"], ["pay", "Awaiting payment"], ["done", "Completed"], ["requests", "Messages & bookings"]];
  const list = st.tab === "requests" ? null : groups[st.tab];
  $("#staff-stats").innerHTML = `<div><b>${groups.review.length}</b>To review</div><div><b>${groups.pack.length}</b>To pack</div><div><b>${groups.pay.length}</b>Awaiting payment</div>`;
  return `<div class="desk-top">
      <div class="desk-tabs" role="tablist" aria-label="Desk sections">${tabs.map(([k, l]) => `<button type="button" role="tab" data-dtab="${k}" aria-selected="${st.tab === k}">${l}${k === "requests" ? ` <span class="count">${d.requests.filter(r => r.status === "new").length}</span>` : ` <span class="count">${groups[k].length}</span>`}</button>`).join("")}</div>
      <p class="small muted" role="status">Updates every 10 seconds${st.updated ? ` · last ${st.updated.toLocaleTimeString("en-GB")}` : ""}</p></div>
    ${st.err ? alertBox(st.err) : ""}
    ${d.missing && d.missing.length ? `<details class="setup"><summary><b>${d.missing.length} site details still missing</b> · customers can't see these yet</summary><p class="small">Add them in <code>js/config.js</code>: ${d.missing.map(esc).join(", ")}.</p></details>` : ""}
    ${d.setup && d.setup.length ? `<details class="setup"><summary><b>${d.setup.length} hosting setting${d.setup.length === 1 ? "" : "s"} to add</b> · in Vercel, Settings → Environment Variables</summary><p class="small">${d.setup.map(esc).join(", ")}. See the README for what each one does.</p></details>` : ""}
    ${st.tab === "requests" ? `<div class="requests">${d.requests.length ? d.requests.map(r => `<article class="panel req"><div class="top"><b>${{ appointment: "Consultation booking", message: "Message", careers: "Careers interest" }[r.type]}</b><span class="small muted">${stamp(r.createdAt)}</span></div>
        <div class="small"><b>${esc(r.name)}</b> · ${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : ""} ${esc(r.email || "")}</div>
        ${r.type === "appointment" ? `<div class="small">Wants: <b>${esc(r.date)} at ${esc(PR.fmt12(r.time || "00:00"))}</b></div>` : ""}${r.topic ? `<div class="small">${esc(r.topic)}</div>` : ""}${r.role ? `<div class="small">${esc(r.role)} ${r.pcn ? `· PCN ${esc(r.pcn)}` : ""}</div>` : ""}
        ${r.message ? `<p class="small">${esc(r.message)}</p>` : ""}</article>`).join("") : `<p class="muted">No messages or bookings yet.</p>`}</div>`
    : `<div class="desk">
      <nav class="queue" aria-label="Orders">${list.length ? list.map(o => `<button type="button" class="q ${o.status}" data-sel="${o.id}" aria-current="${o.id === st.sel}">
        <span class="top"><b class="mono">${o.id}</b>${statusTag(o)}</span>
        <span class="small">${esc(o.rxRequest && !o.items.length ? "Prescription request" : o.items.join(", "))}</span>
        <span class="small muted">${esc(o.customer)} · ${stamp(o.createdAt)} · ${o.priced ? NGN(o.total) : "to price"}</span></button>`).join("") : `<p class="muted small" style="padding:1rem">Nothing here right now.</p>`}</nav>
      <section class="panel" aria-live="polite">${deskDetail()}</section>
    </div>`}`;
}
function deskDetail() {
  const st = S.staff, o = st.detail;
  if (!st.sel) return `<div class="empty-state">${icon("file", "ic big")}<p><b>Select an order</b></p><p class="muted small">Prescriptions waiting for review are under “To review”.</p></div>`;
  if (!o) return `<p class="muted">Loading…</p>`;
  const p = o.prescriber;
  const months = p && p.issued ? (Date.now() - new Date(p.issued)) / (30.44 * 864e5) : 99;
  const auto = p ? [
    { l: "Prescriber registration number given", ok: has(p.reg) },
    { l: "Clinic address looks Nigerian", ok: /nigeria|lagos|abuja|port harcourt|ikeja|wuse|kano|ibadan|enugu|benin|kaduna|jos|owerri|calabar|abeokuta|yaba|lekki|ilorin|akure/i.test(p.clinic || p.pclinic || "") },
    { l: "Issued within the last 6 months", ok: months <= 6 && months >= 0 }
  ] : [];
  const f = st.file;
  const fileView = f ? (f.data.startsWith("data:application/pdf") ? `<p><a class="btn btn-ghost" href="${f.data}" download="${esc(f.name || "prescription.pdf")}">Open prescription PDF</a></p>` : `<a href="${f.data}" target="_blank" rel="noopener"><img class="rx-img" src="${f.data}" alt="Uploaded prescription for order ${esc(o.id)}"></a>`) : (o.rx ? `<p class="muted small">No prescription file.</p>` : "");
  const A = o.actions || [];
  const reviewing = A.includes("approve");
  return `<div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><div class="muted small">Order</div><h2 class="mono" style="font-size:1.35rem">${esc(o.id)}</h2><div class="muted small">${stamp(o.createdAt)} · ${esc(o.delivery.label)}</div></div>${statusTag(o)}</div>
    <div class="review">
      <div style="display:grid;gap:.8rem;align-content:start">
        <dl class="kv"><dt>Customer</dt><dd>${esc(o.customer.name)}</dd><dt>Phone</dt><dd><a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a></dd><dt>Email</dt><dd>${esc(o.customer.email)}</dd>${o.customer.dob ? `<dt>Date of birth</dt><dd>${esc(o.customer.dob)}</dd>` : ""}
          <dt>Deliver to</dt><dd>${esc([o.delivery.addr, o.delivery.landmark, o.delivery.city, o.delivery.state].filter(has).join(", "))}</dd></dl>
        <div class="small" style="display:grid;gap:.3rem">${o.items.map(i => `<div class="r"><span>${i.qty} × ${esc(i.name)} ${i.cls === "pom" ? `<span class="tag rx">POM</span>` : ""}</span><span class="num">${NGN(i.total)}</span></div>`).join("")}
          <div class="r"><span>Delivery</span><span class="num">${NGN(o.deliveryFee)}</span></div><div class="r"><b>Total</b><b class="num">${o.priced === false ? "to price" : NGN(o.total)}</b></div></div>
      </div>
      ${o.rx ? `<div style="display:grid;gap:.8rem;align-content:start">
        <h3 class="h4">Prescription</h3>${fileView}
        ${p ? `<dl class="kv"><dt>Prescriber</dt><dd>${esc(p.name || p.pname)}</dd><dt>Reg. no.</dt><dd>${esc(p.reg || p.preg || "Not given")}</dd><dt>Phone</dt><dd>${esc(p.phone || p.pphone)}</dd><dt>Clinic</dt><dd>${esc(p.clinic || p.pclinic)}</dd><dt>Issued</dt><dd>${esc(p.issued || p.pdate)}</dd>${(p.allergies) ? `<dt>Allergies / other meds</dt><dd>${esc(p.allergies)}</dd>` : ""}</dl>` : ""}
        <div class="checks">${auto.map(c => `<div class="small" style="display:flex;gap:.5rem;align-items:center">${c.ok ? `<span class="tag ok">Pass</span>` : `<span class="tag bad">Check</span>`}<span>${c.l}</span></div>`).join("")}</div>
      </div>` : ""}
    </div>
    ${A.length ? `<form class="f" id="actform" novalidate>
      ${reviewing ? `<fieldset><legend>Pharmacist confirms</legend>
        <label class="check"><input type="checkbox" id="c1" required><span>Prescriber verified against the MDCN or relevant council register</span></label>
        <label class="check"><input type="checkbox" id="c2" required><span>Prescription is signed, legible and unaltered</span></label>
        <label class="check"><input type="checkbox" id="c3" required><span>Medicine, strength and quantity are appropriate for this patient</span></label>
        <label class="check"><input type="checkbox" id="c4" required><span>No item is a controlled medicine (controlled items go to in-store collection)</span></label>
        ${o.rxRequest && o.priced === false ? `<div class="row2"><label for="aitems">Items you'll supply<input id="aitems" placeholder="e.g. Amlodipine 5mg × 28"></label><label for="aprice">Price for these items (₦)<input id="aprice" type="number" min="1" step="0.01" inputmode="decimal"></label></div>` : ""}
      </fieldset>` : ""}
      ${A.some(a => ["info", "reject", "cancel"].includes(a)) ? `<label for="anote">Note to the customer<span class="hint">Required if you ask for information or don't approve.</span><textarea id="anote" rows="2"></textarea></label>` : ""}
      <div class="actions">${A.map(a => {
        const L2 = { approve: ["Approve and request payment", "btn-success"], info: ["Ask for more information", "btn-ghost"], reject: ["Don't approve", "btn-danger"], resume: ["Back to review", "btn-ghost"], cancel: ["Cancel order", "btn-danger"], packed: ["Mark as packed", "btn-primary"], dispatched: ["Mark out for delivery", "btn-primary"], delivered: ["Mark as delivered", "btn-success"] }[a];
        return `<button class="btn ${L2[1]}" type="button" data-act="${a}" ${S.busy ? "disabled" : ""}>${L2[0]}</button>`; }).join("")}</div>
    </form>` : ""}
    <div><h3 class="h4" style="margin-bottom:.5rem">Order record</h3><div class="audit">${o.history.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>`;
}

/* ---------- Shell: top bar, footer details, directory, drawer ---------- */
function renderShell() {
  document.documentElement.lang = CFG.site.locale || "en";
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  orgLd();
  $("#topbar-hours").textContent = H.label;
  $("#topbar-mid").innerHTML = addressLine ? `Visit our pharmacy at ${esc(addressLine)} ${link("/contact", "Contact Us")}` : `Genuine medicines, checked by our pharmacists ${link("/contact", "Contact Us")}`;
  $("#topbar-right").innerHTML = (has(B.phone) ? `<span class="callus">Call Us: ${phoneText()}</span>` : "") +
    `<span class="social">${has(B.facebook) ? `<a href="${esc(B.facebook)}" target="_blank" rel="noopener" aria-label="Synako on Facebook"><svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg></a>` : ""}${has(B.instagram) ? `<a href="${esc(B.instagram)}" target="_blank" rel="noopener" aria-label="Synako on Instagram"><svg viewBox="0 0 24 24"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8c0-1.7-.4-3.2-1.6-4.4S17.7 2.1 16 2c-1.7-.1-6.4-.1-8.1 0-1.7.1-3.2.5-4.4 1.6S2 6.3 2 8c-.1 1.7-.1 6.4 0 8.1.1 1.7.5 3.2 1.6 4.4s2.7 1.6 4.4 1.6c1.7.1 6.4.1 8.1 0 1.7-.1 3.2-.5 4.4-1.6s1.6-2.7 1.6-4.4c.1-1.7.1-6.4-.2-8.1z"/></svg></a>` : ""}</span>`;
  const rows = [["Premises", L.pcnPremises], ["E-pharmacy licence", L.pcnEPharmacy], ["Superintendent", [L.superintendentName, L.superintendentPcnReg && "PCN " + L.superintendentPcnReg].filter(has).join(", ")], ["Address", addressLine], ["Phone", B.phone]].filter(([, v]) => has(v));
  $("#reg").innerHTML = `${has(L.ropseImage) ? `<a href="${esc(L.ropseLink || "/licences")}" ${has(L.ropseLink) ? 'target="_blank" rel="noopener"' : "data-link"}><img class="ropse-img" src="${esc(L.ropseImage)}" alt="PCN Registered Online Pharmacy Sites Emblem" width="72" height="72"></a>` : ""}
    <div><p class="reg-title">Registered with the Pharmacy Council of Nigeria</p>${rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}<p class="small">Open ${esc(H.label)}</p></div>`;
  $("#drawer-foot").innerHTML = `${has(B.phone) ? `<span>Pharmacist line: ${phoneText()}</span>` : ""}<span>Open ${esc(H.label)}</span>`;
  const col = cats => cats.map(c => `<li><a href="/products/${c.id}" data-link>${c.name} <span>${P.filter(p => p.cat === c.id).length}</span></a></li>`).join("");
  $("#directory").innerHTML = `
    <div><h2>${icon("box", "ic sm")} Over-the-counter medicines</h2><p>Order online straight away.</p><ul>${col(OTC_CATS)}</ul>${link("/products/otc", "All over-the-counter <span aria-hidden=\"true\">→</span>", "dir-all")}</div>
    <div><h2>${icon("rx", "ic sm")} Prescription medicines</h2><p>Upload a valid prescription; pay after our pharmacist approves it.</p><ul>${col(POM_CATS)}</ul>${link("/products/prescription", "All prescription medicines <span aria-hidden=\"true\">→</span>", "dir-all")}${link("/prescriptions", "Send a prescription <span aria-hidden=\"true\">→</span>", "dir-all")}</div>
    <div class="lock"><h2>${icon("lock", "ic sm")} Controlled medicines</h2><p>Not sold online under the Electronic Pharmacy Regulations 2026. Collect in store with your original prescription and photo ID, after our pharmacist checks it.</p>${link("/controlled-medicines", "How to get a controlled medicine <span aria-hidden=\"true\">→</span>", "dir-all")}</div>`;
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

/* ---------- Search engines and link previews ---------- */
const SITE_URL = String(CFG.site.url || location.origin).replace(/\/$/, "");
const DEFAULT_DESC = "Genuine NAFDAC-registered medicines from a registered Nigerian pharmacy. Shop over-the-counter products, send a prescription, talk to a pharmacist and get home delivery.";
function metaTag(attr, key) {
  let m = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.appendChild(m); }
  return m;
}
function setLd(id, data) {
  let el = document.getElementById(id);
  if (!data) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("script"); el.type = "application/ld+json"; el.id = id; document.head.appendChild(el); }
  el.textContent = JSON.stringify(data);
}
function pageMeta() {
  const strip = t => String(t).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&[^;]+;/g, "");
  if (S.mode === "staff") return { title: "Pharmacist Desk", noindex: true };
  switch (S.view) {
    case "home": return { title: "", desc: DEFAULT_DESC };
    case "shop": {
      const t = strip(filterTitle());
      return { title: t, desc: S.filter === "pom" || (cat(S.filter) && cat(S.filter).cls === "pom")
        ? `${t} from Synako Pharmacy. Upload a valid prescription; our pharmacist checks it before you pay.`
        : `Shop ${t.toLowerCase()} from Synako Pharmacy, a registered Nigerian pharmacy. Genuine NAFDAC-registered products with home delivery.`, noindex: !!S.q };
    }
    case "product": {
      const p = prod(S.product), rx = p.cls === "pom";
      return { title: p.name, desc: `${p.name} (${p.pack}). ${p.use}${rx ? " Prescription only." : ""}`, type: "product",
        ld: rx ? null : { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.use, sku: p.id, category: cat(p.cat).name,
          brand: { "@type": "Brand", name: p.brand === "Generic" ? "Synako Pharmacy" : p.brand },
          image: p.photo ? `${SITE_URL}/${p.photo}` : undefined,
          offers: { "@type": "Offer", price: String(p.price), priceCurrency: CFG.site.currency, availability: "https://schema.org/InStock", url: `${SITE_URL}/product/${p.id}`, seller: { "@type": "Organization", name: B.name } } } };
    }
    case "controlled": return { title: "Controlled medicines", desc: "Controlled medicines are not sold online. How to collect one from Synako Pharmacy in store with your original prescription and photo ID." };
    case "rx": return { title: "Send a prescription", desc: "Upload a valid prescription online. Synako's pharmacist checks it, and you pay only once it's approved." };
    case "page": { const c = (CONTENT[S.page] || CONTENT.about)(); return { title: c.title, desc: strip(c.lead || "") || DEFAULT_DESC }; }
    case "basket": return { title: "Your basket", noindex: true };
    case "checkout": return { title: "Checkout", noindex: true };
    case "track": return { title: "Track your order", noindex: true };
    default: return { title: "Page not found", noindex: true };
  }
}
function applyMeta() {
  const m = pageMeta(), brand = B.name || "Synako Pharmacy";
  const title = m.title ? `${m.title} | ${brand}` : `${brand} · Your Pathway to Health and Wellness`;
  const url = SITE_URL + (S.mode === "staff" ? "/pharmacist" : pathFor());
  document.title = title;
  metaTag("name", "description").setAttribute("content", m.desc || DEFAULT_DESC);
  metaTag("name", "robots").setAttribute("content", m.noindex ? "noindex, nofollow" : "index, follow");
  metaTag("property", "og:title").setAttribute("content", title);
  metaTag("property", "og:description").setAttribute("content", m.desc || DEFAULT_DESC);
  metaTag("property", "og:url").setAttribute("content", url);
  metaTag("property", "og:type").setAttribute("content", m.type === "product" ? "product" : "website");
  let c = document.head.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
  c.href = url;
  setLd("ld-page", m.ld || null);
}
function orgLd() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Object.keys(H.open).map(d => ({ "@type": "OpeningHoursSpecification", dayOfWeek: days[d], opens: H.open[d][0], closes: H.open[d][1] }));
  const ld = { "@context": "https://schema.org", "@type": "Pharmacy", name: B.name, url: SITE_URL + "/", logo: SITE_URL + "/assets/logo@2x.png", image: SITE_URL + "/assets/og-image.jpg",
    slogan: "Your Pathway to Health and Wellness", areaServed: CFG.site.country, currenciesAccepted: CFG.site.currency, paymentAccepted: "Card, Bank transfer, USSD", openingHoursSpecification: hours };
  if (has(B.phone)) ld.telephone = B.phone;
  if (has(B.email)) ld.email = B.email;
  if (has(B.companyName)) ld.legalName = B.companyName;
  if (addressLine) ld.address = { "@type": "PostalAddress", streetAddress: B.address, addressLocality: B.city, addressRegion: B.state, addressCountry: CFG.site.country };
  const same = [B.facebook, B.instagram].filter(has); if (same.length) ld.sameAs = same;
  setLd("ld-org", ld);
  setLd("ld-site", { "@context": "https://schema.org", "@type": "WebSite", name: B.name, url: SITE_URL + "/",
    potentialAction: { "@type": "SearchAction", target: SITE_URL + "/products?q={search_term_string}", "query-input": "required name=search_term_string" } });
}

/* ---------- Render ---------- */
function renderCount() { const n = S.cart.reduce((s, l) => s + l.q, 0) + (S.rxRequest ? 1 : 0); document.querySelectorAll("[data-count]").forEach(b => { b.textContent = n; b.hidden = !n; }); const bl = $("#basket-link"); if (bl) bl.setAttribute("aria-label", `Basket, ${n} item${n === 1 ? "" : "s"}`); }
function render(scroll) {
  const staff = S.mode === "staff";
  $("#shell-customer").hidden = staff; $("#shell-staff").hidden = !staff;
  clearInterval(deskTimer); clearInterval(trackTimer);
  let title;
  if (staff) {
    $("#staff-view").innerHTML = vStaff(); title = "Pharmacist Desk";
    $("#staff-signout").hidden = !S.staff.token;
    if (S.staff.token) deskTimer = setInterval(() => loadDesk(true), 10000);
    const waiting = S.staff.list ? S.staff.list.orders.filter(o => o.status === "pending_review").length : 0;
    if (waiting) title = `(${waiting}) ${title}`;
  } else {
    const V = { home: vHome, shop: vShop, product: vProduct, controlled: vControlled, basket: vBasket, checkout: vCheckout, rx: vRx, track: vTrack, page: vPage, notfound: vNotFound }[S.view] || vHome;
    $("#view").innerHTML = V();
    renderCount();
    if (S.view === "track" && S.track && !["delivered", "rejected", "cancelled"].includes(S.track.status)) trackTimer = setInterval(() => loadTrack(), 15000);
    const here = pathFor();
    document.querySelectorAll(".nav a[data-link], .drawer a[data-link]").forEach(a => {
      const h = a.getAttribute("href");
      const cur = h === here || (h === "/products" && S.view === "shop" && S.filter === "all") || (h === "/track" && S.view === "track");
      if (cur) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  applyMeta();
  if (staff && /^\(\d+\)/.test(title)) document.title = `${title} | ${B.name}`;
  if (scroll) window.scrollTo(0, 0);
  const err = $("#form-error"); if (err && S.error) err.focus();
}

/* Real photos replace the drawn images as soon as they load */
document.addEventListener("load", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.parentNode.classList.add("has-img"); }, true);
document.addEventListener("error", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.remove(); }, true);

function addToCart(id, q) {
  const l = S.cart.find(x => x.id === id);
  if (l) l.q = Math.min(10, l.q + q); else S.cart.push({ id, q });
  saveCart();
  const p = prod(id);
  toast(p.cls === "pom" ? `Added ${p.name}. Upload your prescription at checkout.` : `Added ${p.name} to your basket.`);
  renderCount();
}
function saveForm() {
  const f = document.querySelector("form.f[id^='f']"); if (!f) return;
  new FormData(f).forEach((val, key) => { if (typeof File !== "undefined" && val instanceof File) return; S.form[key] = val; });
  f.querySelectorAll("input[type=checkbox]").forEach(c => { S.form[c.name] = c.checked; });
}
function doSearch(q) { S.q = q.trim(); S.filter = "all"; $("#q").value = S.q; const dq = $("#dq"); if (dq) dq.value = S.q; go("/products"); }

/* Prescription upload: photos are resized in the browser to keep uploads small */
function readAsDataURL(file) { return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error("We couldn't read that file.")); r.readAsDataURL(file); }); }
async function prepFile(file) {
  if (file.type === "application/pdf") {
    if (file.size > 650 * 1024) throw new Error("That PDF is too large. Please upload one under 650 KB, or take a photo instead.");
    return { name: file.name, data: await readAsDataURL(file) };
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please upload a JPG, PNG or PDF file.");
  const url = URL.createObjectURL(file);
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("We couldn't open that photo. Please try a JPG or PNG.")); i.src = url; });
  let max = 1800, quality = 0.82, data = "";
  for (let k = 0; k < 6; k++) {
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
    data = cv.toDataURL("image/jpeg", quality);
    if (data.length <= 860 * 1024) break;
    max *= 0.8; quality = Math.max(0.5, quality - 0.08);
  }
  URL.revokeObjectURL(url);
  return { name: file.name.replace(/\.\w+$/, "") + ".jpg", data };
}

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
  if (t.id === "staff-signout") { signOut(); return; }
  if ("app" in d) { toast("The Synako app is coming soon. You can order on this website from any phone in the meantime."); return; }
  if (d.tab) { S.tab = d.tab; render(); const nt = $(`#tab-${d.tab}`); if (nt) nt.focus(); return; }
  if (d.add) { addToCart(d.add, d.withqty ? S.qty : 1); return; }
  if (d.qty) { S.qty = Math.max(1, Math.min(10, S.qty + Number(d.qty))); $("#qty-val").textContent = S.qty; return; }
  if (d.lineqty) { const l = S.cart.find(x => x.id === d.lineqty); l.q = Math.max(1, Math.min(10, l.q + Number(d.d))); saveCart(); render(); return; }
  if (d.remove) { S.cart = S.cart.filter(x => x.id !== d.remove); saveCart(); render(); toast("Removed from your basket."); return; }
  if ("rxreq" in d) { S.rxRequest = true; S.step = 1; go("/checkout"); toast("Prescription request started."); return; }
  if ("rxreqRemove" in d) { S.rxRequest = false; render(); return; }
  if ("clear" in d) { S.q = ""; $("#q").value = ""; render(); return; }
  if (d.step) { saveForm(); S.step = Number(d.step); S.error = ""; render(true); return; }
  if (d.pay) { startPayment(d.pay); return; }
  if (d.dtab) { S.staff.tab = d.dtab; S.staff.sel = null; S.staff.detail = null; render(); loadDesk(true); return; }
  if (d.sel) { loadDeskOrder(d.sel); return; }
  if (d.act) { deskAction(d.act); return; }
});
document.addEventListener("keydown", e => {
  const tab = e.target.closest && e.target.closest('[role="tab"][data-tab]');
  if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { // arrow keys move between product tabs
    const all = [...document.querySelectorAll('[role="tab"][data-tab]')], i = all.indexOf(tab);
    const next = all[(i + (e.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    S.tab = next.dataset.tab; render(); $(`#tab-${S.tab}`).focus(); e.preventDefault(); return;
  }
  const dr = drawer(); if (!dr || dr.hidden) return;
  if (e.key === "Escape") { closeDrawer(); return; }
  if (e.key === "Tab") {
    const f = [...dr.querySelectorAll("a, button:not([tabindex='-1']), input")];
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "sort") { S.sort = t.value; render(); return; }
  if (t.id === "st" || t.name === "speed") { saveForm(); render(); const el = $(t.id === "st" ? "#st" : `#sp-${S.form.speed}`); if (el) el.focus(); return; }
  if (t.id === "rxfile" && t.files[0]) {
    const status = $("#rxstatus"); status.innerHTML = `<span class="tag otc">Preparing ${esc(t.files[0].name)}…</span>`;
    try { S.form.rxfile = await prepFile(t.files[0]); status.innerHTML = `<span class="tag ok">Attached: ${esc(S.form.rxfile.name)}</span>`; t.required = false; t.setCustomValidity(""); }
    catch (err) { S.form.rxfile = null; t.value = ""; status.innerHTML = `<span class="tag bad">${esc(err.message)}</span>`; }
  }
});
const wide = window.matchMedia("(min-width: 1001px)");
if (wide.addEventListener) wide.addEventListener("change", m => { if (m.matches) closeDrawer(true); });

async function startPayment(id) {
  if (!paymentsOn()) { toast("Online payment isn't switched on yet. Please contact the pharmacy to pay."); return; }
  const phone = phoneFor(id); S.busy = true; render();
  try { const { order } = await payOrder(id, phone); S.track = order; toast("Payment received. Thank you!"); }
  catch (e) { toast(e.message); }
  S.busy = false; render();
}
async function deskAction(action) {
  const st = S.staff, o = st.detail, f = $("#actform");
  const note = ($("#anote") || {}).value || "";
  if (action === "approve") { if (!f.reportValidity()) return; }
  if (["info", "reject"].includes(action) && !note.trim()) { $("#anote").focus(); toast("Add a note so the customer knows what to do next."); return; }
  const b = { id: o.id, action, note: note.trim(), by: st.name };
  if (action === "approve" && $("#aprice")) { b.price = $("#aprice").value; b.itemsText = $("#aitems").value; }
  S.busy = true; render();
  try { const r = await api.staffAct(st.token, b); st.detail = r.order; toast({ approve: "Approved. The customer can now pay.", info: "Request sent to the customer.", reject: "Marked as not approved.", packed: "Marked as packed.", dispatched: "Marked out for delivery.", delivered: "Marked as delivered.", cancel: "Order cancelled.", resume: "Back in review." }[action]); await loadDesk(true); }
  catch (e) { if (e.status === 401) signOut(); else toast(e.message); }
  S.busy = false; render();
}

document.addEventListener("submit", async e => {
  const f = e.target; e.preventDefault();
  if (f.id === "search-form") { doSearch($("#q").value); return; }
  if (f.id === "drawer-search") { doSearch($("#dq").value); return; }
  if (f.id === "trackform") {
    if (!f.reportValidity()) return;
    const id = f.tid.value.trim().toUpperCase(), ph4 = f.tph.value.trim();
    S.trackId = id; S.track = null; S.trackErr = "";
    const known = S.mine.find(m => m.id === id);
    if (!known) S.mine = S.mine.filter(m => m.id !== id);
    if (!MEMORY) { try { history.pushState({}, "", "/track/" + id); } catch (er) { /* memory */ } }
    render(); await loadTrack(known && known.phone.slice(-4) === ph4 ? known.phone : ph4);
    if (S.track && !known) { S.mine[0].phone = ph4; saveMine(); }
    return;
  }
  if (f.id === "staffform") {
    if (!f.reportValidity()) return;
    S.staff.name = f.sname.value.trim(); store.sset("synako.staffName", S.staff.name);
    try { const { token } = await api.staffLogin(f.spw.value); S.staff.token = token; S.staff.err = ""; store.sset("synako.staff", token); render(); loadDesk(); }
    catch (er) { S.staff.err = er.message; render(); }
    return;
  }
  if (["contactform", "apptform", "careersform"].includes(f.id)) {
    if (!f.reportValidity()) return;
    if (f.id === "apptform") { const day = new Date(f.date.value + "T12:00:00").getDay(); if (!H.open[day]) { f.date.setCustomValidity("We're closed that day. Please choose Monday to Saturday."); f.reportValidity(); f.date.setCustomValidity(""); return; } }
    const data = Object.fromEntries(new FormData(f).entries());
    data.type = { contactform: "message", apptform: "appointment", careersform: "careers" }[f.id];
    const btn = f.querySelector("[type=submit]"); btn.disabled = true;
    try { await api.request(data); f.reset(); toast({ message: "Thanks. A pharmacist will reply shortly.", appointment: "Thanks. We'll call you to confirm your appointment.", careers: "Thanks. We'll be in touch when a role opens." }[data.type]); }
    catch (er) { toast(er.message); }
    btn.disabled = false; return;
  }
  if (!/^f[1-4]$/.test(f.id)) return;
  if (f.id === "f3" && S.form.rxfile) f.rxfile.required = false;
  if (!f.reportValidity()) return;
  if (f.id === "f1") {
    const age = (Date.now() - new Date(f.dob.value)) / (365.25 * 864e5);
    if (!(age >= 18)) { f.dob.setCustomValidity("Our medicines can only be supplied to adults aged 18 or over."); f.reportValidity(); f.dob.setCustomValidity(""); return; }
  }
  if (f.id === "f3") {
    if (!S.form.rxfile) { f.rxfile.setCustomValidity("Please attach your prescription."); f.reportValidity(); f.rxfile.setCustomValidity(""); return; }
    const m = (Date.now() - new Date(f.pdate.value)) / (30.44 * 864e5);
    if (m > 6 || m < 0) { f.pdate.setCustomValidity("Prescriptions are valid for 6 months from the date issued. Please upload a current one."); f.reportValidity(); f.pdate.setCustomValidity(""); return; }
  }
  saveForm();
  const ns = stepList().map(s => s.n), i = ns.indexOf(S.step);
  if (S.step !== 4) { S.step = ns[i + 1]; S.error = ""; render(true); return; }
  placeOrder();
});

async function placeOrder() {
  const F = S.form, rx = hasRx();
  const payload = {
    items: S.cart.map(l => ({ id: l.id, q: l.q })), rxRequest: S.rxRequest, consent: !!F.consent,
    customer: { name: F.name, phone: F.phone, email: F.email, dob: F.dob },
    delivery: { state: F.state, city: F.city, addr: F.addr, landmark: F.landmark, speed: F.speed },
    prescription: rx ? { pname: F.pname, preg: F.preg, pphone: F.pphone, pclinic: F.pclinic, pdate: F.pdate, allergies: F.allergies, file: F.rxfile } : undefined
  };
  S.busy = true; S.error = ""; render();
  let order;
  try { order = (await api.createOrder(payload)).order; }
  catch (e) { S.busy = false; S.error = e.message; render(); return; }
  S.mine.unshift({ id: order.id, phone: F.phone, at: order.createdAt }); saveMine();
  S.cart = []; saveCart(); S.rxRequest = false; S.step = 1; S.form = { name: F.name, phone: F.phone, email: F.email, dob: F.dob, state: F.state, city: F.city, addr: F.addr, landmark: F.landmark };
  S.trackId = order.id; S.track = order;
  if (!rx && order.canPay) {
    try { S.track = (await payOrder(order.id, F.phone)).order; toast("Payment received. Thank you!"); }
    catch (e) { toast(e.message); }
  } else toast(`Order ${order.id} sent to our pharmacist.`);
  S.busy = false;
  go("/track/" + order.id);
}

checkLive().then(() => { if (S.view === "checkout") render(); });
renderShell();
try { const q0 = new URLSearchParams(location.search).get("q"); if (q0) { S.q = q0.slice(0, 80); $("#q").value = S.q; } } catch (e) { /* no query */ }
go(MEMORY ? "/" : location.pathname, { replace: true });
})();

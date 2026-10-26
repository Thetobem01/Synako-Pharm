/* Synako Pharmacy — website.
   Orders, prescriptions and payments go to the API in /api (Vercel). Business details come
   from js/config.js, products from js/data.js, delivery rules from js/pricing.js.
   When the page runs without a server (the design preview), a built-in demo stands in for
   the API so every flow can still be tried; nothing is saved or charged there. */
(function () {
"use strict";

const CFG = window.SYNAKO_CONFIG, PR = window.SYNAKO_PRICING, art = window.SYNAKO_ART;
const { DEPTS, CATS, P, STATES, FAQ, SYNONYMS } = window.SYNAKO;
const B = CFG.business, L = CFG.licences, H = CFG.hours, D = CFG.delivery, C = CFG.consultation;

const has = v => v != null && String(v).trim() !== "";
const NGN = n => PR.fmtMoney(n, CFG);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);
const prod = id => P.find(p => p.id === id);
const cat = id => CATS.find(c => c.id === id);
const OTC_CATS = CATS.filter(c => c.cls === "otc"), POM_CATS = CATS.filter(c => c.cls === "pom");
const dept = id => DEPTS.find(d => d.id === id);
const deptCats = id => CATS.filter(c => c.dept === id);
const W = CFG.wholesale || {};
/* Medicines by form: worked out from the pack and name so new products sort themselves */
const DOSES = [["tablets", "Tablets & capsules"], ["liquids", "Syrups & liquids"], ["ointments", "Creams & ointments"]];
function doseOf(p) {
  if (p.dept !== "otc") return "";
  const t = (p.name + " " + p.pack).toLowerCase();
  if (/tablet|capsule|caplet/.test(t)) return "tablets";
  if (["tube", "jar"].includes(p.form) || /cream|ointment|gel|balm|rub\b/.test(t)) return "ointments";
  if (["syrup", "spray", "drops"].includes(p.form) || /\bml\b|lotion|solution|suspension|syrup/.test(t)) return "liquids";
  return "";
}
const isBulk = p => p.units && p.units.length > 1;
/* Out of stock: out: true in js/data.js, plus whatever the pharmacy marks on the desk (sent with /api/health) */
P.forEach(p => { p.outInData = !!p.out; });
function applyStock(ids) { const set = new Set(ids || []); P.forEach(p => { p.out = p.outInData || set.has(p.id); }); }

/* ---------- Search: ranks by name, then generic, brand and category; understands common brand names ---------- */
const norm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9%./+ ]+/g, " ").replace(/\s+/g, " ").trim();
function terms(q) {
  const n = norm(q); if (!n) return [];
  return [n].concat(Object.keys(SYNONYMS || {}).filter(k => (" " + n + " ").includes(" " + k + " ") || (k.length > 3 && n.startsWith(k))).map(k => norm(SYNONYMS[k])));
}
function score(p, ts) {
  if (!p._hay) { p._name = norm(p.name); p._hay = norm([p.name, p.generic, p.brand, p.pack].join(" ")); p._more = norm([cat(p.cat).name, dept(p.dept).name, p.use].join(" ")); }
  let best = 0;
  ts.forEach(t => {
    const words = t.split(" ");
    if (p._name.startsWith(t)) best = Math.max(best, 100);
    else if ((" " + p._name).includes(" " + t)) best = Math.max(best, 70);
    else if (p._name.includes(t)) best = Math.max(best, 50);
    else if (words.every(w => (" " + p._hay).includes(" " + w))) best = Math.max(best, 40);
    else if (words.every(w => (" " + p._hay + " " + p._more).includes(" " + w))) best = Math.max(best, 20); // category or description
    else if (words.every(w => (p._hay + " " + p._more).includes(w))) best = Math.max(best, 10);
  });
  return best ? best + (p.pop ? 5 : 0) - (p.out ? 20 : 0) : 0;
}
function searchAll(q, strict) {
  const ts = terms(q); if (!ts.length) return [];
  const hits = P.map(p => [p, score(p, ts)]).filter(([p, sc]) => sc > 0 && (ageOK() || !p.age)).sort((a, b) => b[1] - a[1]);
  const top = hits.length ? hits[0][1] : 0; // suggestions drop loose matches when there are strong ones
  return hits.filter(([, sc]) => !strict || top < 40 || sc >= 40).map(x => x[0]);
}
const hiddenAlcohol = q => !ageOK() && P.some(p => p.age && score(p, terms(q)) >= 20);
const eachFrom = p => Math.min(...p.units.map(u => u.price / u.n));
const stamp = d => new Date(d).toLocaleString(CFG.site.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: CFG.site.timezone });
const addressLine = [B.address, B.city, B.state].filter(has).join(", ");
const cutoff = PR.fmt12(D.sameDayCutoff);
const threshold = NGN(D.nextDayThreshold);
/* Where fast delivery applies, for the wording around the site: " in Okitipupa", " within Ondo State" */
const expressWhere = has(D.expressArea) ? ` in ${D.expressArea}` : "";
const sameDayWhere = (D.localStates || []).length ? ` within ${D.localStates.join(", ")} State` : "";

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
  check: '<path d="M20 6L9 17l-5-5"/>',
  wine: '<path d="M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0zM12 12.5V20M8.5 21h7"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 9.5a5 5 0 0 1 7 0M12 9.5l1.2-1.6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'
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
  mode: "shop", view: "home", filter: "all", tab: "vitamins", q: "", sort: "popular", product: null, qty: 1, unit: "1", page: "about", age18: store.get("synako.age18", false),
  cart: store.get("synako.cart", []).filter(l => l && prod(l.id)).map(l => ({ id: l.id, q: l.q, u: l.u || "1" })), rxRequest: false, step: 1, form: {}, busy: false, error: "",
  mine: store.get("synako.orders", []), seen: store.get("synako.seen", []).filter(id => prod(id)), trackId: null, track: null, trackErr: "",
  rider: { token: store.sget("synako.rider"), name: store.get("synako.riderName", ""), list: null, err: "" },
  staff: { token: store.sget("synako.staff"), name: store.sget("synako.staffName"), list: null, sel: null, detail: null, file: null, tab: "overview", err: "", updated: null }
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
    const q = PR.quote({ items: b.items, state: b.delivery.state, city: b.delivery.city, speed: b.delivery.speed, rxRequest: b.rxRequest }, CFG, P);
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
    staffLogin: (pw, role) => wait({ token: "demo", role: role === "rider" ? "rider" : "staff" }),
    riderList: () => wait({ deliveries: [...orders.values()].filter(o => ["packed", "out_for_delivery"].includes(o.status)).map(o => ({ id: o.id, status: o.status, statusLabel: LBL[o.status], createdAt: o.createdAt, speedId: o.delivery.speed, speed: o.delivery.label, name: o.customer.name, phone: o.customer.phone, addr: o.delivery.addr, landmark: o.delivery.landmark || "", city: o.delivery.city, state: o.delivery.state, note: o.delivery.note || "", items: o.items.length, total: o.total, idCheck: false, rider: o.rider || "", hasCode: false })) }),
    riderAct: () => Promise.reject(new Error("Riders can't update orders in the design preview.")),
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
  staffLogin: (password, role) => DEMO ? demo.staffLogin(password, role) : call("staff/login", { method: "POST", body: { password, role } }),
  riderList: t => DEMO ? demo.riderList() : call("staff/orders?view=rider", { token: t }),
  riderAct: (t, b) => DEMO ? demo.riderAct() : call("staff/orders", { method: "POST", body: b, token: t }),
  staffPost: (t, b) => DEMO ? Promise.resolve({ reminded: 0, cancelled: 0 }) : call("staff/orders", { method: "POST", body: b, token: t }),
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
const PAGES = ["about", "contact", "faq", "delivery", "returns", "privacy", "terms", "licences", "cookies", "careers", "wholesale"];
function parse(path) {
  const seg = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const r = { view: "home" };
  if (!seg.length || seg[0] === "index.html") return r;
  const [a, b] = seg;
  if (a === "products") { r.view = "shop"; r.filter = b === "prescription" ? "pom" : (b && (FILTERS.includes(b) || dept(b) || cat(b))) ? b : b ? "unknown" : "all"; if (r.filter === "unknown") r.view = "notfound"; }
  else if (a === "product" && b && prod(b)) { r.view = "product"; r.product = b; }
  else if (a === "prescriptions") r.view = "rx";
  else if (a === "controlled-medicines") r.view = "controlled";
  else if (a === "track") { r.view = "track"; if (b) r.trackId = b.toUpperCase(); }
  else if (a === "basket" || a === "checkout") r.view = a;
  else if (["pharmacist", "desk", "staff", "admin"].includes(a)) { r.view = "home"; r.mode = "staff"; }
  else if (["rider", "riders"].includes(a)) { r.view = "home"; r.mode = "rider"; }
  else if (PAGES.includes(a)) { r.view = "page"; r.page = a; }
  else r.view = "notfound";
  return r;
}
const FILTERS = ["otc", "bulk"].concat(DOSES.map(d => d[0]));
const fpath = f => "/products" + (f === "all" ? "" : f === "pom" ? "/prescription" : "/" + f);
function pathFor() {
  if (S.mode === "staff") return "/pharmacist";
  if (S.mode === "rider") return "/rider";
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
  if (r.product) { S.product = r.product; S.qty = 1; S.unit = "1"; S.seen = [r.product].concat(S.seen.filter(x => x !== r.product)).slice(0, 12); store.set("synako.seen", S.seen); }
  closeSuggest();
  if (r.page) S.page = r.page;
  if (r.view === "track") { S.trackId = r.trackId || S.trackId; }
  if (!MEMORY && !opts.noHistory) { try { history[opts.replace ? "replaceState" : "pushState"]({}, "", pathFor()); } catch (e) { /* stay in memory */ } }
  closeDrawer(true);
  render(true);
  if (S.view === "track" && S.trackId) loadTrack();
  if (S.mode === "staff" && S.staff.token) loadDesk();
  if (S.mode === "rider" && S.rider.token) loadRider();
  const focusTarget = S.mode !== "shop" ? $("#staff-view") : $("#view");
  if (!opts.replace && focusTarget) focusTarget.focus({ preventScroll: true });
}
window.addEventListener("popstate", () => go(location.pathname, { noHistory: true }));
const link = (path, label, cls, extra) => `<a href="${path}" data-link${cls ? ` class="${cls}"` : ""}${extra ? " " + extra : ""}>${label}</a>`;

/* ---------- Small pieces ---------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3200); }
const photo = (src, style, alt) => `<img src="${src}" alt="${esc(alt || "")}" loading="lazy" decoding="async" data-swap${style ? ` style="${style}"` : ""}>`;
const media = p => p.photo ? `<span class="drawn">${art(p)}</span>${photo(p.photo, "", p.name)}` : `<span class="drawn">${art(p)}</span>`;
const tag = p => (p.cls === "pom" ? `<span class="tag rx">Prescription only</span>` : p.cls === "otc" ? `<span class="tag otc">Over the counter</span>` : `<span class="tag gen">${esc(dept(p.dept).name)}</span>`)
  + (p.age ? ` <span class="tag age">${p.age}+ only</span>` : "");
const badge = p => p.cls === "pom" ? ["rx", "Prescription"] : p.cls === "otc" ? ["otc", "Over the counter"] : p.age ? ["age", `${p.age}+`] : ["gen", dept(p.dept).short];
const alertBox = msg => msg ? `<div class="notice bad" role="alert" tabindex="-1" id="form-error"><b>Something needs attention</b><span>${esc(msg)}</span></div>` : "";
const telLink = n => `<a class="tel" href="tel:${esc(String(n).replace(/\s/g, ""))}">${esc(n)}</a>`;
const phoneText = () => has(B.phone) ? telLink(B.phone) : "";
const phonesText = () => [B.phone, B.phone2].filter(has).map(telLink).join(" · ");
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
  const rx = p.cls === "pom", [bc, bl] = badge(p);
  return `<article class="pcard">
    <a class="pcard-media" href="/product/${p.id}" data-link tabindex="-1" aria-hidden="true"><span class="pcard-badge ${bc}">${esc(bl)}</span>${media(p)}</a>
    <div class="pcard-body">
      <p class="pcard-brand">${esc(p.brand === "Generic" ? cat(p.cat).name : p.brand)}</p>
      <h3 class="pcard-name"><a href="/product/${p.id}" data-link>${esc(p.name)}</a></h3>
      <p class="pcard-pack">${esc(p.pack)}</p>
      <p class="pcard-price"><span class="price">${p.was ? `<span class="sr">Now </span>` : ""}${NGN(p.price)}</span>${p.was ? ` <s class="was"><span class="sr">Was </span>${NGN(p.was)}</s>` : ""}</p>
      ${isBulk(p) ? `<p class="pcard-bulk">${icon("layers", "ic sm")}<span>Bulk from <b>${NGN(Math.round(eachFrom(p)))}</b> each</span></p>` : ""}
      ${p.out ? `<button class="btn btn-ghost btn-sm btn-block" type="button" disabled>Out of stock</button>` : `<button class="btn ${rx ? "btn-accent-soft" : "btn-secondary"} btn-sm btn-block" type="button" data-add="${p.id}" aria-label="Add ${esc(p.name)} to basket${rx ? ", prescription needed" : ""}">${rx ? "Add · prescription" : "Add to basket"}</button>`}
    </div>
  </article>`;
}
/* Section heading: eyebrow, title, optional intro and "view all" link */
/* A fine botanical sprig, purely decorative (hidden from assistive technology) */
function sprig(cls) {
  return `<svg class="sprig ${cls || ""}" viewBox="0 0 120 160" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" vector-effect="non-scaling-stroke">
    <path d="M60 158C58 118 62 76 78 30"/><path d="M61 128c-14-4-24-14-28-28 14 2 24 12 28 28z"/><path d="M62 104c14-6 22-18 24-32-12 4-22 16-24 32z"/>
    <path d="M66 74c-12-6-18-18-18-30 12 4 18 16 18 30z"/><path d="M72 52c10-6 16-16 16-28-10 4-16 14-16 28z"/><path d="M78 30c-2-10 0-18 6-26 2 10 0 18-6 26z"/></g></svg>`;
}
function sectionHead(id, eyebrow, title, intro, more, center) {
  return `<header class="shead${center ? " center" : ""}"><div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ""}<h2 id="${id}">${title}</h2>${intro ? `<p class="shead-intro">${intro}</p>` : ""}</div>${more || ""}</header>`;
}

/* WhatsApp link to the pharmacy with a ready-written message (only when a number is set in config) */
function waLink(text) {
  if (!has(B.whatsapp)) return "";
  let n = String(B.whatsapp).replace(/\D/g, "");
  if (n.startsWith("0")) n = "234" + n.slice(1);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
/* "Open now · until 6pm" / "Closed · opens Mon 7:30am" from the opening hours */
function openStatus() {
  const c = PR.clock(CFG), today = H.open[c.day], hm = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  if (PR.isOpen(CFG)) return `<span class="lbl open">Open now</span> until ${PR.fmt12(today[1])}`;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (today && c.minutes < hm(today[0])) return `<span class="lbl">Closed.</span> Opens ${PR.fmt12(today[0])} today`;
  for (let i = 1; i <= 7; i++) { const d = (c.day + i) % 7; if (H.open[d]) return `<span class="lbl">Closed.</span> Opens ${i === 1 ? "tomorrow" : days[d]} ${PR.fmt12(H.open[d][0])}`; }
  return `<span class="lbl">Closed</span>`;
}
function seenRow(except) {
  const list = S.seen.filter(id => id !== except).map(prod).filter(p => p && (ageOK() || !p.age)).slice(0, 4);
  return list.length ? `<section class="wrap related" aria-labelledby="seen-title">${sectionHead("seen-title", "", "Recently viewed", "", `<button class="linkbtn" type="button" data-clear-seen>Clear</button>`)}<div class="cards cards-4">${list.map(card).join("")}</div></section>` : "";
}

/* ---------- Age check for wines & spirits ---------- */
const ageOK = () => !!S.age18;
function ageGate() {
  return `<div class="wrap" style="padding-block:2rem 3rem"><section class="panel agegate" aria-labelledby="age-title">${icon("wine", "ic big")}
    <h1 id="age-title" class="h2">Are you 18 or over?</h1>
    <p class="muted">Wines, spirits and beer are sold only to adults aged 18 and over. We check your date of birth at checkout, and our rider will ask for photo ID on delivery.</p>
    <div class="ctas"><button class="btn btn-primary btn-lg" type="button" data-age="yes">Yes, I'm 18 or over</button>${link("/", "No, take me back", "btn btn-ghost btn-lg")}</div>
    <p class="small muted">Please drink responsibly. Don't drink alcohol if you're pregnant, driving, or taking medicines that warn against it. ${link("/contact", "Ask our pharmacist", "linkbtn")} if you're not sure.</p>
  </section></div>`;
}

/* ---------- Home (follows the Figma "Main Web" frame, refined) ---------- */
function vHome() {
  const popular = P.filter(p => p.pop && !p.age).slice(0, 6);
  const TABS = [["vitamins", "Vitamins"], ["scales", "Weighing scales"], ["gloves", "Gloves"], ["hot-drinks", "Tea & Milo"], ["breakfast", "Breakfast"], ["body", "Body care"]];
  const tabItems = P.filter(p => p.cat === S.tab).slice(0, 4);
  return `
  <section class="hero" aria-labelledby="hero-title"><div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Retail &amp; wholesale pharmacy · Delivery across Nigeria</p>
      <h1 id="hero-title">Your Pathway to <br class="br-lg">Health and <em>Wellness</em></h1>
      <p class="lede">Genuine NAFDAC-registered medicines checked by our pharmacists, plus medical equipment, surgical supplies and provisions. Buy one pack or a whole carton, and we'll deliver it to your door.</p>
      <div class="ctas">${link("/products", "Shop all products", "btn btn-primary btn-lg")}${link("/prescriptions", "Send a prescription", "btn btn-accent btn-lg")}</div>
      <ul class="hero-points">
        <li>${icon("check", "ic sm")} Home delivery in ${D.expressMinutes} minutes${esc(expressWhere)}</li>
        <li>${icon("check", "ic sm")} Same day for orders before ${cutoff}</li>
        <li>${icon("check", "ic sm")} Free advice from a pharmacist</li>
      </ul>
    </div>
    <figure class="hero-media">
      <svg class="hero-arch" viewBox="0 0 400 520" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M1 519V200A199 199 0 0 1 399 200V519" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
      ${sprig("hero-sprig")}
      <span class="hero-orb" aria-hidden="true">${popular[0] ? media(popular[0]) : ""}</span>
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

  <section class="section" aria-labelledby="routes-title"><div class="wrap"><div class="bpanel">
    ${sectionHead("routes-title", "Shop by department", "Everything in our store, <em>online</em>", "", "", true)}
    <div class="routes depts">
      ${DEPTS.map(d => `<a class="route${d.id === "pom" ? " rx" : d.age ? " age" : ""}" href="${fpath(d.id)}" data-link><span class="route-ic">${icon(d.icon, "ic")}</span><span><b>${esc(d.name)}</b><span>${P.filter(p => p.dept === d.id).length} products${d.age ? ` · ${d.age}+ only` : d.id === "pom" ? " · prescription needed" : ""}</span></span><span class="arrow" aria-hidden="true">→</span></a>`).join("")}
      <a class="route lock" href="/controlled-medicines" data-link><span class="route-ic">${icon("lock", "ic")}</span><span><b>Controlled medicines</b><span>In store only · not sold online</span></span><span class="arrow" aria-hidden="true">→</span></a>
    </div>
  </div></div></section>

  <section class="section tight" aria-labelledby="popular-title"><div class="wrap">
    ${sectionHead("popular-title", "Bestsellers", "Most popular products", "", link("/products", "View all products <span aria-hidden=\"true\">→</span>", "more"))}
    <div class="cards">${popular.map(card).join("")}</div>
    <div class="strip">${icon("rx", "ic")}<p><b>Have a prescription?</b> Upload it at checkout. You pay only after our pharmacist approves it.</p>${link("/prescriptions", "How it works <span aria-hidden=\"true\">→</span>", "more")}</div>
  </div></section>

  ${S.seen.length ? seenRow() : ""}

  ${wholesaleBand()}

  <section class="section tight" aria-label="Services"><div class="wrap pair">
    <article class="feature">
      <div class="feature-copy"><p class="eyebrow">Free advice</p><h2>Talk to a Pharmacist</h2>
        <p>Don't self medicate. Talk to an expert. Reach a Synako pharmacist in <strong>under ${C.freeMinutes} minutes</strong> during opening hours. Need longer? Book a consultation.</p>${link("/contact", "Get started", "btn btn-primary")}</div>
      <div class="feature-photo"><div class="fallback">${personSVG("female")}</div>${photo(IMG.pharmacistFemale, "object-position:42% 30%", "A Synako pharmacist on the phone")}</div>
    </article>
    <article class="feature feature-warm">
      <div class="feature-copy"><p class="eyebrow">Fast delivery</p><h2>Home delivery in ${D.expressMinutes} minutes${esc(expressWhere)}</h2>
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

  <section class="section tight" aria-labelledby="steps-title"><div class="wrap"><div class="bfield">
    ${sectionHead("steps-title", "Prescriptions", "How prescription orders <em>work</em>", "Required by Nigeria's Electronic Pharmacy Regulations 2026, and it keeps you safe.", "", true)}
    <ol class="steps">${stepsHTML()}</ol>
    <div class="center">${link("/prescriptions", "Start a prescription order", "btn btn-accent btn-lg")}</div>
  </div></div></section>

  ${mobileBanner()}`;
}
/* Retail or wholesale: the same shop, choose how much you buy */
function wholesaleBand() {
  return `<section class="section tight" aria-labelledby="ws-title"><div class="wrap"><div class="wsband">
    <div><p class="eyebrow">Retail &amp; wholesale</p><h2 id="ws-title">One pack or a whole carton, your choice</h2>
      <p>Every product shows its wholesale options: dozens, cartons, cases and packs, each with its own bulk price. Choose the quantity you want, pay online by card, transfer or USSD, and we'll deliver anywhere in Nigeria.</p>
      <div class="ctas">${link("/products/bulk", "Shop wholesale prices", "btn btn-primary")}${link("/wholesale", "How wholesale works", "btn btn-secondary")}</div></div>
    <ul class="wspoints">
      <li>${icon("layers", "ic")}<span><b>Bulk prices on ${P.filter(isBulk).length} products</b><span>Save up to ${Math.max(...P.flatMap(p => p.units.map(u => u.save)))}% per pack</span></span></li>
      <li>${icon("truck", "ic")}<span><b>Delivered nationwide</b><span>All 36 states and the FCT</span></span></li>
      <li>${icon("store", "ic")}<span><b>For shops, clinics and homes</b><span>Large order? Request a trade quote</span></span></li>
    </ul></div></div></section>`;
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
const filterAge = f => (dept(f) && dept(f).age) || (cat(f) && cat(f).age) || 0;
function matches(p, f) {
  if (f === "all") return true;
  if (f === "bulk") return isBulk(p);
  if (DOSES.some(d => d[0] === f)) return doseOf(p) === f;
  if (dept(f)) return p.dept === f;
  return p.cat === f;
}
function filtered() {
  let list = P.filter(p => matches(p, S.filter));
  if (!ageOK() && !filterAge(S.filter)) list = list.filter(p => !p.age); // alcohol stays out of general lists until the visitor confirms their age
  if (S.q) { const ranked = searchAll(S.q); list = ranked.filter(p => list.includes(p)); if (S.sort === "popular") return list; }
  const by = { popular: (a, b) => (b.pop || 0) - (a.pop || 0), low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, az: (a, b) => a.name.localeCompare(b.name) }[S.sort];
  return list.sort(by);
}
function filterTitle() {
  if (S.q) return `Results for “${esc(S.q)}”`;
  if (S.filter === "all") return "All products";
  if (S.filter === "bulk") return "Wholesale &amp; bulk prices";
  const d = DOSES.find(x => x[0] === S.filter); if (d) return esc(d[1]);
  return esc((dept(S.filter) || cat(S.filter)).name);
}
function vShop() {
  if (filterAge(S.filter) && !ageOK()) return ageGate();
  const list = filtered();
  const count = f => P.filter(p => matches(p, f) && (ageOK() || !p.age || filterAge(f))).length;
  const fb = (f, label) => `<a href="${fpath(f)}" data-link aria-current="${S.filter === f ? "page" : "false"}"><span>${label}</span><span class="ct">${count(f)}</span></a>`;
  const here = dept(S.filter) ? S.filter : cat(S.filter) ? cat(S.filter).dept : DOSES.some(d => d[0] === S.filter) ? "otc" : "";
  const chips = [["all", "All"], ["bulk", "Wholesale"]].concat(DEPTS.map(d => [d.id, d.short]), here ? [[here, "All " + dept(here).short.toLowerCase()]].concat(here === "otc" ? DOSES : [], deptCats(here).map(c => [c.id, c.name])) : []);
  const isPom = S.filter === "pom" || (cat(S.filter) && cat(S.filter).cls === "pom");
  const ws = W.minTradeOrder ? ` for orders over ${NGN(W.minTradeOrder)}` : "";
  return `<div class="wrap page-head"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}<span aria-hidden="true">/</span>${link("/products", "Products")}${cat(S.filter) ? `<span aria-hidden="true">/</span>${link(fpath(cat(S.filter).dept), esc(dept(cat(S.filter).dept).name))}` : ""}</nav><h1>${filterTitle()}</h1>${dept(S.filter) && !S.q ? `<p class="muted lead">${esc(dept(S.filter).intro)}</p>` : ""}</div>
  <div class="wrap shop">
    <nav class="filters" aria-label="Product departments">
      ${fb("all", "All products")}${fb("bulk", "Wholesale &amp; bulk prices")}
      ${DEPTS.map(d => `<h2 class="fh">${esc(d.name)}${d.age ? ` <span class="tag age">${d.age}+</span>` : ""}</h2>${fb(d.id, "All " + esc(d.short.toLowerCase()))}${d.id === "otc" ? DOSES.map(([f, l]) => fb(f, l)).join("") : ""}${deptCats(d.id).map(c => fb(c.id, esc(c.name))).join("")}`).join("")}
      <h2 class="fh">Controlled medicines</h2><a href="/controlled-medicines" data-link><span>In store only</span><span class="ct">${icon("lock", "ic sm")}</span></a>
    </nav>
    <div style="min-width:0">
      <nav class="chips" aria-label="Product departments">${chips.map(([f, l]) => `<a href="${fpath(f)}" data-link aria-current="${S.filter === f ? "page" : "false"}">${esc(l)}</a>`).join("")}</nav>
      ${isPom ? `<div class="notice rx small" style="margin-bottom:1rem"><b>Prescription needed at checkout</b><span>You can add these to your basket, then upload a valid prescription. Our pharmacist checks it before anything is charged. Prescription medicines are sold in single packs; licensed pharmacies and hospitals can ${link("/wholesale", "request a trade quote", "linkbtn")}.</span></div>` : ""}
      ${S.filter === "bulk" ? `<div class="notice info small" style="margin-bottom:1rem"><b>Buy by the dozen, carton or case</b><span>Open any product and choose a wholesale option to see its bulk price. You pay online at checkout as usual. Need more than we sell online, or prescription medicines for a licensed premises? ${link("/wholesale", "Request a trade quote", "linkbtn")}${ws}.</span></div>` : ""}
      ${filterAge(S.filter) ? `<div class="notice rx small" style="margin-bottom:1rem"><b>18+ only · ID checked on delivery</b><span>Please drink responsibly. Alcohol doesn't mix with many medicines; ${link("/contact", "ask our pharmacist", "linkbtn")} if you're unsure.</span></div>` : ""}
      <div class="toolbar"><p class="muted small" role="status">${list.length} product${list.length === 1 ? "" : "s"}${S.q ? ` · <button class="linkbtn" type="button" data-clear>Clear search</button>` : ""}</p>
        <label class="sort" for="sort">Sort by <select id="sort">${[["popular", "Most popular"], ["low", "Price: low to high"], ["high", "Price: high to low"], ["az", "Name: A to Z"]].map(([v, l]) => `<option value="${v}" ${S.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <h2 class="sr">${filterTitle()}: products</h2>
      ${list.length ? `<div class="grid-shop">${list.map(card).join("")}</div>`
        : S.q && hiddenAlcohol(S.q) ? `<div class="empty"><p><b>Looking for wines, spirits or beer?</b></p><p style="margin:.4rem 0 1rem">They're in our 18+ section.</p>${link("/products/wines", "Go to Wines &amp; spirits", "btn btn-primary")}</div>`
        : `<div class="empty"><p><b>No products match${S.q ? ` “${esc(S.q)}”` : " here yet"}.</b></p><p style="margin-top:.4rem">Try a generic name, such as paracetamol, or ${link("/contact", "ask our pharmacist", "linkbtn")} if we stock it. Controlled medicines aren't listed online.</p></div>`}
    </div>
  </div>`;
}

const STORAGE = { wines: "Store upright in a cool, dark place.", provisions: "Store in a cool, dry place. Check the best-before date on the pack.", equipment: "Store in a clean, dry place.", surgical: "Store in a clean, dry place away from direct sunlight.", "personal-care": "Store below 30°C, away from direct sunlight." };
function unitPicker(p) {
  if (!isBulk(p)) return "";
  return `<fieldset class="units"><legend>Choose how you buy</legend>${p.units.map(u => `<label class="unit${S.unit === u.id ? " on" : ""}"><input type="radio" name="unit" value="${u.id}" ${S.unit === u.id ? "checked" : ""}>
    <span class="unit-l"><b>${u.n > 1 ? esc(u.label) : "Single"}</b><span>${u.n > 1 ? `${u.n} × ${esc(p.pack)}` : esc(p.pack)}</span></span>
    <span class="unit-p"><b class="num">${NGN(u.price)}</b><span>${u.n > 1 ? `${NGN(Math.round(u.price / u.n))} each${u.save ? ` · <span class="save">save ${u.save}%</span>` : ""}` : "Retail price"}</span></span></label>`).join("")}</fieldset>`;
}
function vProduct() {
  const p = prod(S.product); if (!p) return vNotFound();
  if (p.age && !ageOK()) return ageGate();
  const rx = p.cls === "pom", c = cat(p.cat), d = dept(p.dept), med = p.cls !== "gen";
  const unit = PR.unitOf(p, S.unit) || p.units[0], max = PR.maxQty(p, unit);
  if (S.qty > max) S.qty = max;
  const related = P.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  return `<div class="wrap page-head" style="padding-bottom:.5rem"><nav class="crumbs" aria-label="Breadcrumb">${link("/", "Home")}<span aria-hidden="true">/</span>${link(fpath(p.dept), esc(d.name))}<span aria-hidden="true">/</span>${link("/products/" + p.cat, esc(c.name))}</nav></div>
  <div class="wrap pdp">
    <div class="visual">${media(p)}</div>
    <div class="info">
      <div>${tag(p)}</div>
      <h1>${esc(p.name)}</h1>
      <div class="brand">${esc(p.brand)} · <span class="muted" style="font-weight:400">${esc(p.pack)}</span></div>
      <div>${p.was ? `<span class="was num" style="text-decoration:line-through;margin-right:.5rem"><span class="sr">Was </span>${NGN(p.was)}</span>` : ""}<span class="price num">${NGN(p.price)}</span>${isBulk(p) ? ` <span class="bulk-txt small">· wholesale from ${NGN(Math.round(eachFrom(p)))} each</span>` : ""}</div>
      ${rx ? `<div class="notice rx"><b>Prescription required</b><span>Add it to your basket, then upload your prescription at checkout. Our pharmacist checks it before you pay, and we only supply it if the prescription is valid.</span></div>`
        : p.age ? `<div class="notice rx"><b>${p.age}+ only</b><span>We confirm your date of birth at checkout, and our rider checks photo ID on delivery. Please drink responsibly.</span></div>`
        : med ? `<div class="notice info"><b>Over-the-counter</b><span>Our pharmacist may contact you before sending it if they need to check it's right for you.</span></div>` : ""}
      ${p.out ? `<div class="notice bad"><b>Out of stock</b><span>We're restocking this item. Leave your phone number or email and we'll tell you as soon as it's back, or ${link("/contact", "ask our pharmacist", "linkbtn")} for an alternative.</span></div>
        <form class="restock" id="restockform" novalidate><input type="hidden" name="product" value="${esc(p.id)}"><div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
          <label for="rsc" class="sr">Phone number or email</label><input id="rsc" name="contact" required placeholder="Phone number or email" autocomplete="email">
          <button class="btn btn-primary" type="submit">Tell me when it's back</button></form>` : ""}
      ${p.out ? "" : unitPicker(p)}
      ${p.out ? "" : `<div class="buy">
        <div class="qty" role="group" aria-label="Quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span class="num" id="qty-val" aria-live="polite">${S.qty}</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
        <button class="btn ${rx ? "btn-accent" : "btn-primary"} btn-lg" type="button" data-add="${p.id}" data-withqty="1">${rx ? "Add to basket · prescription needed" : "Add to basket"}</button>
      </div>
      <p class="small muted" id="buy-total" aria-live="polite">${buyTotal(p)}</p>`}
      <div class="pdp-links"><button class="linkbtn" type="button" data-share>${icon("share", "ic sm")} Share</button>${waLink(`Hello Synako, I'd like to ask about ${p.name} (${p.pack}): ${SITE_URL}/product/${p.id}`) ? `<a class="linkbtn" href="${esc(waLink(`Hello Synako, I'd like to ask about ${p.name} (${p.pack}): ${SITE_URL}/product/${p.id}`))}" target="_blank" rel="noopener">${icon("chat", "ic sm")} Ask on WhatsApp</a>` : ""}</div>
      <dl class="specs">
        <dt>${rx || p.strength || doseOf(p) ? "Active ingredient" : "Product type"}</dt><dd>${esc(p.generic)}</dd>
        ${p.strength ? `<dt>Strength</dt><dd>${esc(p.strength)}</dd>` : ""}
        <dt>Pack size</dt><dd>${esc(p.pack)}</dd>
        <dt>${med ? "Classification" : "Department"}</dt><dd>${rx ? "Prescription-only medicine (POM)" : med ? "Over-the-counter (OTC)" : esc(d.name)}</dd>
        ${isBulk(p) ? `<dt>Wholesale</dt><dd>${p.units.slice(1).map(u => `${esc(u.label)} of ${u.n}`).join(", ")}</dd>` : ""}
        ${has(p.nafdac) ? `<dt>NAFDAC reg. no.</dt><dd>${esc(p.nafdac)}</dd>` : ""}
        <dt>Storage</dt><dd>${STORAGE[p.dept] || "Store below 30°C in a dry place, away from sunlight and out of reach of children."}</dd>
      </dl>
      <div class="facts">
        <details open><summary>${med ? "What it's for" : "About this product"}</summary><p>${esc(p.use)}</p></details>
        ${p.how ? `<details><summary>How to use</summary><p>${esc(p.how)}${med ? " Always read the label and patient leaflet." : ""}</p></details>` : ""}
        ${p.warn ? `<details><summary>Warnings</summary><p>${esc(p.warn)}</p></details>` : ""}
        <details><summary>Delivery</summary><p>Home delivery in ${D.expressMinutes} minutes${esc(expressWhere)} during opening hours, or same-day delivery${esc(sameDayWhere)} for orders placed before ${cutoff}. Orders above ${threshold} are delivered the next day. Other states take 2–4 working days. We deliver within Nigeria only.</p></details>
      </div>
      <p class="small muted">Questions about this product, or need a larger quantity? ${link("/contact", "Talk to us", "linkbtn")} or ${link("/wholesale", "request a trade quote", "linkbtn")}.</p>
    </div>
  </div>
  ${related.length ? `<section class="wrap related" aria-labelledby="rel-title">${sectionHead("rel-title", "", "More in " + esc(c.name), "", link("/products/" + p.cat, "View all <span aria-hidden=\"true\">→</span>", "more"))}<div class="cards cards-4">${related.map(card).join("")}</div></section>` : ""}
  ${seenRow(p.id)}`;
}
function buyTotal(p) {
  const u = PR.unitOf(p, S.unit) || p.units[0];
  return u.n > 1 || S.qty > 1 ? `${S.qty} × ${u.n > 1 ? `${esc(u.label)} of ${u.n}` : "single"} = <b class="num">${NGN(u.price * S.qty)}</b>${u.n > 1 ? ` · ${S.qty * u.n} packs` : ""}` : "";
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
const lineKey = l => l.id + "|" + (l.u || "1");
const items = () => S.cart.filter(l => prod(l.id) && PR.unitOf(prod(l.id), l.u)).map(l => Object.assign({}, l, { p: prod(l.id), unit: PR.unitOf(prod(l.id), l.u), key: lineKey(l) }));
const hasRx = () => S.rxRequest || S.cart.some(l => prod(l.id) && prod(l.id).cls === "pom");
const quoteNow = () => PR.quote({ items: S.cart, state: S.form.state, city: S.form.city, speed: S.form.speed, rxRequest: S.rxRequest, promo: S.form.promo }, CFG, P);
const promosOn = () => Object.keys(CFG.promos || {}).length > 0;
function promoBox(q) {
  if (!promosOn()) return "";
  if (q.promo) return `<div class="promo-on small"><span>${icon("check", "ic sm")}<span><b>${esc(q.promo.code)}</b> · ${esc(q.promo.label)}</span></span><button class="linkbtn" type="button" data-promo-remove>Remove</button></div>`;
  return `<form class="promo" id="promoform" novalidate><label for="promo" class="sr">Promo code</label><input id="promo" name="promo" placeholder="Promo code" value="${esc(S.form.promo || "")}" autocapitalize="characters" autocomplete="off"><button class="btn btn-ghost btn-sm" type="submit">Apply</button></form>
    ${S.form.promo && q.promoError ? `<p class="small" style="color:var(--bad)" role="alert">${esc(q.promoError)}</p>` : ""}`;
}
function summary(cta) {
  const q = quoteNow();
  return `<aside class="panel summary" aria-labelledby="sum-title"><h2 class="h3" id="sum-title">Order summary</h2>
    ${q.lines.map(l => `<div class="r small"><span>${l.qty} × ${esc(l.name)}</span><span class="num">${NGN(l.total)}</span></div>`).join("")}
    ${S.rxRequest ? `<div class="r small"><span>Prescription items</span><span class="muted">Priced by pharmacist</span></div>` : ""}
    <div class="r"><span>Subtotal</span><span class="num">${NGN(q.subtotal)}</span></div>
    ${q.discount ? `<div class="r ok disc"><span>Discount <span class="muted small">(${esc(q.promo.code)})</span></span><span class="num">−${NGN(q.discount)}</span></div>` : ""}
    <div class="r"><span>Delivery <span class="muted small">(${esc(q.speedLabel)})</span></span><span class="num">${q.deliveryFee === 0 && (q.lines.length || S.rxRequest) ? "Free" : NGN(q.deliveryFee)}</span></div>
    ${q.freeOver && !q.freeDelivery && q.subtotal < q.freeOver && q.speed !== "states" ? `<p class="small muted">Add ${NGN(q.freeOver - q.subtotal)} more for free delivery${esc(sameDayWhere)}.</p>` : ""}
    <div class="r total"><span>Total</span><span class="num">${NGN(q.total)}${S.rxRequest ? "+" : ""}</span></div>
    ${q.big ? `<div class="notice info small"><b>Next-day delivery</b><span>Orders above ${threshold} are delivered the next day.</span></div>` : ""}
    ${CFG.orders && has(CFG.orders.paused) ? `<div class="notice info small"><b>Online ordering is paused</b><span>${esc(CFG.orders.paused)}</span></div>` : ""}
    ${promoBox(q)}
    ${q.unavailable.length ? `<div class="notice bad small"><b>Out of stock</b><span>${esc(q.unavailable.join(", "))} can't be ordered right now. Please remove ${q.unavailable.length === 1 ? "it" : "them"} to continue.</span></div>` : ""}
    ${q.overLimit ? `<div class="notice bad small"><b>Too large to pay online</b><span>Orders above ${NGN(q.maxTotal)} are handled as trade orders. ${link("/wholesale", "Request a trade quote", "linkbtn")} and we'll confirm stock and delivery.</span></div>` : ""}
    ${q.age >= 18 ? `<div class="notice rx small"><b>Contains alcohol</b><span>Our rider will check photo ID on delivery. We can't hand alcohol to anyone under 18.</span></div>` : ""}
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
      <div style="min-width:0">${link("/product/" + l.p.id, esc(l.p.name), "linkbtn dark")}<div class="muted small">${l.unit.n > 1 ? `<b>${esc(l.unit.label)}</b> · ${l.unit.n} × ${esc(l.p.pack)} · ${NGN(l.unit.price)} each ${esc(l.unit.label.toLowerCase())}` : `${esc(l.p.pack)} · ${NGN(l.unit.price)} each`}</div><div style="margin-top:.35rem">${tag(l.p)}</div></div>
      ${l.p.out ? `<div class="right"><span class="tag bad">Out of stock</span>` : `<div class="right"><b class="num">${NGN(l.unit.price * l.q)}</b>`}
        <div class="qty" role="group" aria-label="Quantity of ${esc(l.p.name)}"><button type="button" data-lineqty="${l.key}" data-d="-1" aria-label="Decrease">−</button><span class="num" aria-live="polite">${l.q}</span><button type="button" data-lineqty="${l.key}" data-d="1" aria-label="Increase">+</button></div>
        <button class="rm" type="button" data-remove="${l.key}" aria-label="Remove ${esc(l.p.name)}">Remove</button></div></div>`).join("")}
    ${S.rxRequest ? `<div class="line"><div class="thumb rxthumb" aria-hidden="true">℞</div><div><b>Prescription request</b><div class="muted small">Our pharmacist will add the medicines on your prescription and confirm the price.</div></div><div class="right"><button class="rm" type="button" data-rxreq-remove>Remove</button></div></div>` : ""}
  </section>${summary(`${quoteNow().overLimit ? link("/wholesale", "Request a trade quote", "btn btn-primary btn-lg full") : quoteNow().unavailable.length ? `<button class="btn btn-primary btn-lg full" type="button" disabled>Go to checkout</button>` : link("/checkout", "Go to checkout", "btn btn-primary btn-lg full")}${link("/products", "Continue shopping", "linkbtn center-self")}${basketWa()}`)}</div>`;
}
function basketWa() {
  const q = quoteNow();
  const href = waLink(`Hello Synako, I'd like to order:\n${q.lines.map(l => `• ${l.qty} × ${l.name}`).join("\n")}\nSubtotal: ${NGN(q.subtotal)}`);
  return href && q.lines.length ? `<a class="linkbtn center-self" href="${esc(href)}" target="_blank" rel="noopener">${icon("chat", "ic sm")} Prefer WhatsApp? Send us this basket</a>` : "";
}
function stepList() { const s = [{ n: 1, l: "Your details" }, { n: 2, l: "Delivery" }]; if (hasRx()) s.push({ n: 3, l: "Prescription" }); s.push({ n: 4, l: hasRx() ? "Review & submit" : "Review & pay" }); return s; }
function vCheckout() {
  if (!S.cart.length && !S.rxRequest) return vBasket();
  if (quoteNow().overLimit || quoteNow().unavailable.length) return vBasket();
  if (CFG.orders && has(CFG.orders.paused)) return `<div class="wrap page-head"><h1>Checkout</h1></div><div class="wrap" style="padding-bottom:3rem"><div class="notice info"><b>Online ordering is paused</b><span>${esc(CFG.orders.paused)} Your basket is saved. To order now, ${contactLine()}.</span></div></div>`;
  if (LIVE.checked && !ordersOn()) return `<div class="wrap page-head"><h1>Checkout</h1></div><div class="wrap" style="padding-bottom:3rem"><div class="notice info"><b>Online ordering opens soon</b><span>We're finishing our online checkout. To order now, ${contactLine()} during opening hours (${esc(H.label)}).</span></div></div>`;
  const steps = stepList();
  if (!steps.some(s => s.n === S.step)) S.step = 1;
  const F = S.form, v = k => esc(F[k] || ""), rx = hasRx();
  const q = quoteNow();
  let body = "";
  if (S.step === 1) body = `<form class="f" id="f1" novalidate><h2>Your details</h2>
    <div class="row2"><label for="fn">Full name<input id="fn" name="name" required value="${v("name")}" autocomplete="name"></label>
    <label for="phn">Phone number<span class="hint">We'll use it to confirm delivery and to find your order.</span><input id="phn" name="phone" type="tel" inputmode="tel" required minlength="10" placeholder="0803 000 0000" value="${v("phone")}" autocomplete="tel"></label></div>
    <div class="row2"><label for="em">Email<span class="hint">We send your receipt and order updates here.</span><input id="em" name="email" type="email" required value="${v("email")}" autocomplete="email" aria-describedby="em-fix"><span id="em-fix" class="em-fix" aria-live="polite"></span></label>
    <label for="dob">Date of birth<span class="hint">We supply medicines to adults 18 and over only.</span><input id="dob" name="dob" type="date" required value="${v("dob")}" autocomplete="bday"></label></div>
    <label class="check"><input type="checkbox" id="adult" name="adult" required ${F.adult ? "checked" : ""}><span>I confirm I am 18 or over and the medicines are for me or someone I care for.</span></label>
    <label class="check"><input type="checkbox" id="consent" name="consent" required ${F.consent ? "checked" : ""}><span>I agree to Synako processing my health information to supply my order, as set out in the ${link("/privacy", "privacy notice", "linkbtn")}.</span></label>
    <div class="actions">${link("/basket", "Back to basket", "btn btn-ghost")}<button class="btn btn-primary" type="submit">Continue to delivery</button></div></form>`;
  if (S.step === 2) body = `<form class="f" id="f2" novalidate><h2>Delivery</h2><p class="muted small">We deliver within Nigeria only.</p>
    <div class="row2"><label for="st">State<select id="st" name="state" required><option value="">Choose a state</option>${STATES.map(s => `<option ${F.state === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label for="city">City / LGA<input id="city" name="city" required value="${v("city")}" autocomplete="address-level2"></label></div>
    <label for="addr">Street address<input id="addr" name="addr" required value="${v("addr")}" autocomplete="street-address"></label>
    <label for="lm">Nearest landmark<span class="hint">Helps our rider find you.</span><input id="lm" name="landmark" value="${v("landmark")}"></label>
    <label for="dnote">Note for our team (optional)<span class="hint">Sizes (for example, gloves size L), delivery instructions, or a preferred brand.</span><textarea id="dnote" name="note" rows="2" maxlength="300">${v("note")}</textarea></label>
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
    <div class="panel" style="padding:1rem"><dl class="kv"><dt>Name</dt><dd>${v("name")}</dd><dt>Phone</dt><dd>${v("phone")}</dd><dt>Deliver to</dt><dd>${v("addr")}, ${v("city")}, ${v("state")}</dd><dt>Delivery</dt><dd>${esc(q.speedLabel)}</dd>${has(F.note) ? `<dt>Note</dt><dd>${v("note")}</dd>` : ""}${rx ? `<dt>Prescription</dt><dd>${F.rxfile ? esc(F.rxfile.name) : "Attached"} · ${v("pname")}</dd>` : ""}</dl></div>
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
  const cls = { delivered: "done", paid: "ok", rejected: "bad", cancelled: "bad", info_needed: "warn", pending_review: "warn", awaiting_payment: "warn", approved_awaiting_payment: "warn" }[o.status] || "otc";
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
        ${o.deliveryCode ? `<div class="notice info code-box"><b>Your delivery code: <span class="mono code">${esc(o.deliveryCode)}</span></b><span>Give this code to the rider when your order arrives${o.rider ? `. ${esc(o.rider)} is bringing it now` : ""}. Please don't share it before then.</span></div>` : ""}
        ${o.rxRequest && !o.priced ? `<p class="small muted">Our pharmacist will add your prescription items and their price when they approve it.</p>` : ""}
        <ol class="timeline">${st.map((s, i) => { const c = i < stage ? "done" : (i === stage && !bad && !final ? "now" : "next"); return `<li class="${c}"><span class="dot ${c}" aria-hidden="true">${i < stage ? "✓" : i + 1}</span><div><b>${s}</b>${c === "now" ? `<div class="small muted">In progress</div>` : ""}<span class="sr">${c === "done" ? " (done)" : c === "now" ? " (current step)" : ""}</span></div></li>`; }).join("")}</ol>
        <details class="facts"><summary>Order details</summary>
          <div class="small" style="display:grid;gap:.35rem;margin-top:.6rem">${o.items.map(i => `<div class="r"><span>${i.qty} × ${esc(i.name)}</span><span class="num">${NGN(i.total)}</span></div>`).join("")}
          ${o.discount ? `<div class="r disc"><span>Discount${o.promo ? ` (${esc(o.promo.code)})` : ""}</span><span class="num">−${NGN(o.discount)}</span></div>` : ""}
          <div class="r"><span>Delivery · ${esc(o.delivery.label)}</span><span class="num">${o.deliveryFee ? NGN(o.deliveryFee) : "Free"}</span></div><div class="r"><b>Total</b><b class="num">${NGN(o.total)}${o.priced ? "" : "+"}</b></div></div></details>
        <div class="order-actions"><button class="btn ${o.canPay ? "btn-secondary" : "btn-primary"}" type="button" data-receipt>${icon("download", "ic sm")} ${PAID(o.status) ? "Download receipt (PDF)" : "Download order summary (PDF)"}</button>${o.items.some(i => prod(i.id)) ? `<button class="btn btn-secondary" type="button" data-reorder>${icon("box", "ic sm")} Order these items again</button>` : ""}</div>
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
      <div>${icon("truck", "ic big")}<h3>Fast</h3><p>Home delivery in ${D.expressMinutes} minutes${esc(expressWhere)}, or same day${esc(sameDayWhere)} for orders before ${cutoff}.</p></div>
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
        <dl class="kv">${addressLine ? `<dt>Address</dt><dd>${esc(addressLine)}</dd>` : ""}${has(B.phone) ? `<dt>Phone</dt><dd>${phonesText()}</dd>` : ""}${has(B.whatsapp) ? `<dt>WhatsApp</dt><dd>${esc(B.whatsapp)}</dd>` : ""}${has(B.email) ? `<dt>Email</dt><dd>${esc(B.email)}</dd>` : ""}</dl>
        <h2 class="h3">Opening hours</h2>
        <dl class="kv">${hoursRows()}</dl>
        <p class="small muted">You can order online at any time. Orders placed while we're closed are handled when we open.</p>
      </aside>
    </div>` }),
  faq: () => ({ title: "Frequently asked questions", lead: "Quick answers about ordering, prescriptions and delivery.", body: `<div class="faq">${FAQ.map(([q, a], i) => `<details ${i === 0 ? "open" : ""}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    <details><summary>How fast is delivery?</summary><p>Home delivery in ${D.expressMinutes} minutes${esc(expressWhere)} during opening hours (${esc(H.label)}), or same-day delivery${esc(sameDayWhere)} for orders placed before ${cutoff}. Orders above ${threshold} are delivered the next day.</p></details>
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
    <h2>Delivery</h2><p>Home delivery in ${D.expressMinutes} minutes${esc(expressWhere)} applies during opening hours. Orders above ${threshold} are delivered the next day. See the Delivery page for options and fees.</p>
    <h2>Consultations</h2><p>Quick pharmacist advice of up to ${C.freeMinutes} minutes is free. Longer consultations are by appointment and charged separately.</p>
    <h2>Cancellations and returns</h2><p>You can cancel before your order is packed. See Returns and refunds.</p></div>` }),
  licences: () => ({ title: "Our licences", lead: "Check that you're buying from a registered pharmacy.", body: `
    <div class="licence panel">${has(L.ropseImage) ? `<a href="${esc(L.ropseLink || "#")}" ${has(L.ropseLink) ? 'rel="noopener" target="_blank"' : ""}><img class="ropse-img" src="${esc(L.ropseImage)}" alt="PCN Registered Online Pharmacy Sites Emblem" width="120" height="120"></a>` : ""}
      <dl class="kv"><dt>Pharmacy</dt><dd>Synako Pharmacy</dd>${has(B.companyName) ? `<dt>Company</dt><dd>${esc(B.companyName)}${has(B.rcNumber) ? `, RC ${esc(B.rcNumber)}` : ""}</dd>` : ""}
      ${has(L.pcnPremises) ? `<dt>PCN premises certificate</dt><dd>${esc(L.pcnPremises)}</dd>` : ""}${has(L.pcnEPharmacy) ? `<dt>PCN e-pharmacy licence</dt><dd>${esc(L.pcnEPharmacy)} (renewed annually)</dd>` : ""}
      ${has(L.superintendentName) ? `<dt>Superintendent pharmacist</dt><dd>${esc(L.superintendentName)}${has(L.superintendentPcnReg) ? `, PCN reg. no. ${esc(L.superintendentPcnReg)}` : ""}</dd>` : ""}${addressLine ? `<dt>Registered address</dt><dd>${esc(addressLine)}</dd>` : ""}</dl></div>
    <p class="muted" style="margin-top:1rem">You can confirm a pharmacy's registration with the Pharmacy Council of Nigeria.</p>` }),
  wholesale: () => ({ title: "Wholesale & bulk buying", lead: "Buy one pack or a whole carton. Retail and wholesale customers shop the same store and pay the same secure way.", body: `
    <ol class="steps">
      <li class="step"><span class="n" aria-hidden="true">1</span><h3>Choose your quantity</h3><p>Every product shows its options, such as single, dozen, carton, case or pack, each with its own bulk price.</p></li>
      <li class="step"><span class="n" aria-hidden="true">2</span><h3>Mix and match</h3><p>Combine single packs and cartons from any department in one basket: medicines, equipment, surgical supplies, provisions and drinks.</p></li>
      <li class="step"><span class="n" aria-hidden="true">3</span><h3>Pay at the end</h3><p>Pay online by card, bank transfer or USSD through Paystack. Prices are checked on our server, so what you see is what you pay.</p></li>
      <li class="step"><span class="n" aria-hidden="true">4</span><h3>We deliver anywhere</h3><p>Same-day or next-day delivery near our pharmacy, and 2–4 working days to every other state.</p></li>
    </ol>
    <div class="two flat even" style="margin-top:1.5rem">
      <div class="panel prose"><h2>Who buys wholesale from us</h2>
        <p>${esc(W.note || "Shops, clinics and families buying in bulk.")}</p>
        <ul><li><b>Bulk prices online</b> on ${P.filter(isBulk).length} products, with savings of up to ${Math.max(...P.flatMap(p => p.units.map(u => u.save)))}% per pack. ${link("/products/bulk", "See wholesale prices", "linkbtn")}.</li>
          <li><b>Online orders up to ${NGN((CFG.orders || {}).maxOnlineTotal || 10000000)}.</b> Above that, or for mixed pallets and regular supply, request a trade quote.</li>
          <li><b>Prescription-only medicines</b> are sold to the public in single packs against a prescription. Licensed pharmacies, hospitals and clinics can buy them in bulk through a trade quote with their PCN or facility licence number.</li>
          <li><b>Wines and spirits</b> are sold to adults aged 18 and over only, with ID checked on delivery.</li>
          <li><b>Every item is genuine:</b> NAFDAC-registered stock from approved manufacturers and distributors, with batch and expiry recorded.</li></ul></div>
      <form class="f panel" id="tradeform" novalidate><h2>${icon("store", "ic")} Request a trade quote</h2>
        <p class="small muted">Tell us what you need and we'll reply within one working day with prices, stock and delivery${W.minTradeOrder ? `. Trade quotes start from ${NGN(W.minTradeOrder)}` : ""}.</p>
        <div class="row2"><label for="tb">Business or organisation<input id="tb" name="business" required autocomplete="organization"></label>
          <label for="tt">Type<select id="tt" name="bizType"><option>Pharmacy</option><option>Patent medicine store</option><option>Hospital or clinic</option><option>School or company</option><option>Supermarket or shop</option><option>Hotel, restaurant or events</option><option>Individual or family</option><option>Other</option></select></label></div>
        <div class="row2"><label for="tn">Your name<input id="tn" name="name" required autocomplete="name"></label><label for="tp">Phone number<input id="tp" name="phone" type="tel" required minlength="10" autocomplete="tel"></label></div>
        <div class="row2"><label for="te">Email<input id="te" name="email" type="email" autocomplete="email"></label>
          <label for="ts">Deliver to<select id="ts" name="state" required><option value="">Choose a state</option>${STATES.map(x => `<option>${esc(x)}</option>`).join("")}</select></label></div>
        <label for="tm">Products and quantities<span class="hint">For example: Paracetamol 500mg × 20 cartons, nitrile gloves size M × 50 boxes.</span><textarea id="tm" name="message" rows="5" required></textarea></label>
        <label for="tl">PCN or facility licence number<span class="hint">Only needed for prescription medicines.</span><input id="tl" name="pcn"></label>
        <div><button class="btn btn-primary" type="submit">Request quote</button></div></form>
    </div>` }),
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
    const was = st.list ? deskCounts(st.list) : null;
    st.list = d; st.err = ""; st.updated = new Date();
    const now = deskCounts(d);
    if (was) {
      const news = [now.pack > was.pack && `${now.pack - was.pack} new paid order${now.pack - was.pack === 1 ? "" : "s"} to pack`,
        now.review > was.review && `${now.review - was.review} new prescription${now.review - was.review === 1 ? "" : "s"} to review`,
        now.requests > was.requests && `${now.requests - was.requests} new message${now.requests - was.requests === 1 ? "" : "s"}`].filter(Boolean);
      if (news.length) { toast(news.join(" · ")); chime(); }
    }
    if (st.sel && !silent) await loadDeskOrder(st.sel, true);
    if (st.tab === "supply" || (st.tab === "overview" && !st.supply)) await loadSupply(true);
  } catch (e) { if (e.status === 401) signOut(); else st.err = e.message; }
  if (S.mode === "staff") render();
}
const deskCounts = d => ({ pack: d.orders.filter(o => o.status === "paid").length, review: d.orders.filter(o => o.status === "pending_review").length, requests: (d.requests || []).filter(r => r.status === "new").length });
/* A short two-note chime, so a desk left open at the counter is noticed (no sound file needed) */
function chime() {
  if (!soundOn()) return;
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const ctx = chime.ctx || (chime.ctx = new A());
    [[880, 0], [1320, 0.18]].forEach(([f, at]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + at;
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t); o.stop(t + 0.4);
    });
  } catch (e) { /* sound not available */ }
}
async function loadDeskOrder(id, quiet) {
  const st = S.staff; st.sel = id;
  if (!quiet) { st.detail = null; render(); }
  try { const d = await api.staffOrder(st.token, id); st.detail = d.order; st.file = d.file; st.err = ""; }
  catch (e) { if (e.status === 401) return signOut(); st.err = e.message; }
  if (S.mode === "staff") render();
}
function signOut() { S.staff = { token: "", name: S.staff.name, list: null, sel: null, detail: null, file: null, tab: "overview", err: "" }; store.sset("synako.staff", ""); render(); }
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
  const groups = deskGroups(d);
  if (d.out) applyStock(d.out);
  const tab = st.tab || "overview";
  const list = groups[tab] || null;
  const day = t => new Date(t).toLocaleDateString("en-CA", { timeZone: CFG.site.timezone }), today = day(Date.now());
  const paidToday = d.orders.filter(o => PAID(o.status) && day(o.createdAt) === today);
  const takings = paidToday.reduce((t, o) => t + (Number(o.total) || 0), 0);
  $("#staff-stats").innerHTML = `<button type="button" class="cmdk-btn" data-cmdk aria-keyshortcuts="Control+K Meta+K" aria-haspopup="dialog">${icon("search", "ic sm")}<span>Search orders, products and actions</span><kbd>Ctrl K</kbd></button>`;
  const newMsgs = d.requests.filter(r => r.status === "new").length;
  const count = { review: groups.review.length, pack: groups.pack.length, pay: groups.pay.length, requests: newMsgs, stock: P.filter(p => p.out).length, supply: shortCount(d) };
  const warn = { review: groups.review.some(o => waitMins(o) > 60), pack: d.orders.some(o => o.status === "paid" && waitMins(o) > 60), supply: count.supply > 0, requests: newMsgs > 0 };
  let n = 0;
  const navHtml = DESK_NAV.map(([label, items]) => `<p class="dk-nav-label">${label}</p>${items.map(([k, l, ic]) => { n++; return `<button type="button" class="dk-link" data-dtab="${k}"${tab === k ? ' aria-current="page"' : ""}>${icon(ic, "ic sm")}<span>${l}</span>${count[k] ? `<span class="count${warn[k] ? " warn" : ""}">${count[k]}${k === "stock" ? " out" : ""}</span>` : ""}<kbd aria-hidden="true">${n}</kbd></button>`; }).join("")}`).join("");
  let [group, title, sub] = DESK_TITLES[tab] || DESK_TITLES.overview;
  if (tab === "overview") { group = "Main dashboard"; title = `${greeting()}, ${esc(String(st.name || "").split(/\s+/).filter(w => w && !/^(pharm|dr|mr|mrs|ms|miss|prof|pst|chief)\.?$/i.test(w))[0] || "team")}.`; sub = overviewSummary(d, groups); }
  const ov = tab === "overview" ? overviewPanel(d, groups, takings, paidToday, day) : null;
  const head = `<header class="dk-head${tab === "overview" ? " is-dash" : ""}"><div><p class="dk-eyebrow">${group}</p><h1 tabindex="-1" id="dk-title">${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${tab === "overview" ? overviewActions(d, groups) : ""}</header>`;
  const body = ov ? ov.rest
    : tab === "supply" ? supplyPanel() : tab === "stock" ? stockPanel() : tab === "requests" ? requestsPanel(d)
    : `<div class="desk${st.sel ? " has-sel" : ""}">
      <div class="queue-wrap">${queueTools(list)}<nav class="queue" id="queue" aria-label="Orders">${queueRows(list)}</nav></div>
      <section class="panel" aria-live="polite">${deskDetail()}</section>
    </div>`;
  return `<div class="dk">
    <nav class="dk-nav" aria-label="Desk sections">${navHtml}
      <div class="dk-tools" aria-label="Tools"><p class="dk-nav-label">Tools</p>
        <button class="dk-tool" type="button" data-remind>${icon("card", "ic sm")} Send payment reminders</button>
        <button class="dk-tool" type="button" data-csv>${icon("download", "ic sm")} Download orders (CSV)</button>
        <button class="dk-tool" type="button" data-testmail>${icon("chat", "ic sm")} Send test email</button>
        <a class="dk-tool" href="/rider" data-link>${icon("truck", "ic sm")} Rider page</a>
        <button class="dk-tool" type="button" data-sound aria-pressed="${soundOn()}">${soundOn() ? "🔔 Sound on" : "🔕 Sound off"}</button>
        <button class="dk-tool" type="button" data-keys>⌨ Keyboard shortcuts</button>
      </div>
      <p class="dk-sync" role="status"><span class="dot" aria-hidden="true"></span>Live · ${st.updated ? `updated ${st.updated.toLocaleTimeString("en-GB")}` : "connecting"}</p>
    </nav>
    <div class="dk-main">
      ${ov ? `<div class="ov-hero2">${head}${ov.flow}</div>` : head}
      ${st.err ? alertBox(st.err) : ""}
      ${st.mail ? `<div class="notice ${/NOT sent/.test(st.mail) ? "bad" : "info"} small" role="status"><span>${esc(st.mail)}</span></div>` : ""}
      ${body}
      ${ov ? ov.progress : ""}
    </div>
  </div>
  ${st.keys ? keysHelp() : ""}${st.cmdk ? cmdkView() : ""}`;
}
function requestsPanel(d) {
  return `<div class="requests">${d.requests.length ? d.requests.slice().sort((a, b) => (a.status === "done") - (b.status === "done")).map(r => `<article class="panel req${r.status === "done" ? " done" : ""}"><div class="top"><b>${{ appointment: "Consultation booking", message: "Message", careers: "Careers interest", trade: "Wholesale quote request", restock: "Back-in-stock request" }[r.type]}</b><span class="small muted">${stamp(r.createdAt)}</span></div>
        <div class="small"><b>${esc(r.name)}</b> · ${r.phone ? `<a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : ""} ${esc(r.email || "")}</div>
        ${r.type === "appointment" ? `<div class="small">Wants: <b>${esc(r.date)} at ${esc(PR.fmt12(r.time || "00:00"))}</b></div>` : ""}${r.topic ? `<div class="small">${esc(r.topic)}</div>` : ""}${r.role ? `<div class="small">${esc(r.role)} ${r.pcn ? `· PCN ${esc(r.pcn)}` : ""}</div>` : ""}${r.business ? `<div class="small"><b>${esc(r.business)}</b>${r.bizType ? ` · ${esc(r.bizType)}` : ""}${r.state ? ` · ${esc(r.state)}` : ""}${r.pcn && !r.role ? ` · Licence ${esc(r.pcn)}` : ""}</div>` : ""}
        ${r.message ? `<p class="small" style="white-space:pre-line">${esc(r.message)}</p>` : ""}
        <div class="req-foot">${r.status === "done" ? `<span class="tag ok">Handled${r.handledBy ? ` by ${esc(r.handledBy)}` : ""}</span><button class="linkbtn" type="button" data-req="${esc(r.id)}" data-st="new">Mark as new</button>` : `<button class="btn btn-secondary btn-sm" type="button" data-req="${esc(r.id)}" data-st="done">${icon("check", "ic sm")} Mark as handled</button>`}</div></article>`).join("") : `<p class="muted">No messages or bookings yet.</p>`}</div>`;
}
/* How long an order has been waiting on us: prescriptions since they arrived, paid orders since payment */
const waitFrom = o => Date.parse(o.status === "paid" && o.paidAt ? o.paidAt : o.createdAt) || Date.now();
const waitMins = o => (Date.now() - waitFrom(o)) / 60000;
function waitText(t) { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`; }
/* Takings for the last 7 days as a small bar chart (from the latest 200 orders) */
function weekBars(orders, day) {
  const days = [...Array(7)].map((_, i) => day(Date.now() - (6 - i) * 864e5));
  const sums = days.map(k => orders.filter(o => PAID(o.status) && day(o.createdAt) === k).reduce((t, o) => t + (Number(o.total) || 0), 0));
  const max = Math.max(...sums, 1);
  return `<svg class="week" viewBox="0 0 70 18" role="img" aria-label="Takings, last 7 days: ${sums.map(n => NGN(n)).join(", ")}">${sums.map((n, i) => `<rect x="${i * 10 + 1}" y="${18 - Math.max(1.5, 16 * n / max)}" width="7" height="${Math.max(1.5, 16 * n / max)}" rx="1.5"${i === 6 ? ' class="now"' : ""}><title>${days[i]}: ${NGN(n)}</title></rect>`).join("")}</svg>`;
}
const soundOn = () => store.get("synako.sound", true) !== false;
function keysHelp() {
  return `<div class="keys-help" role="dialog" aria-label="Keyboard shortcuts"><div class="panel"><div class="top"><h2 class="h3">Keyboard shortcuts</h2><button class="iconbtn" type="button" data-keys aria-label="Close">✕</button></div>
    <dl class="kv"><dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Search orders, products and actions</dd><dt><kbd>1</kbd>–<kbd>8</kbd></dt><dd>Go to a section (the numbers in the sidebar)</dd><dt><kbd>/</kbd></dt><dd>Search orders</dd><dt><kbd>J</kbd> <kbd>K</kbd> or <kbd>↓</kbd> <kbd>↑</kbd></dt><dd>Next / previous order</dd><dt><kbd>Esc</kbd></dt><dd>Close the order, or this box</dd><dt><kbd>R</kbd></dt><dd>Refresh now</dd><dt><kbd>?</kbd></dt><dd>Show or hide these shortcuts</dd></dl></div></div>`;
}
/* Order progress at a glance, from its record */
function progressSteps(o) {
  const pub = o.history.filter(h => !h.internal), at = re => (pub.find(h => re.test(h.m)) || {}).t;
  const steps = [["Placed", at(/^Order placed/)]].concat(o.rx ? [["Approved", at(/^Prescription approved/)]] : [],
    [["Paid", at(/^Payment received/)], ["Packed", at(/^Packed/)], ["On the road", at(/^Out for delivery/)], ["Delivered", at(/^Delivered/)]]);
  if (["rejected", "cancelled"].includes(o.status)) return `<p class="small"><span class="tag bad">${esc(o.statusLabel || o.status)}</span></p>`;
  const cur = steps.findIndex(x => !x[1]);
  return `<ol class="steps${cur < 0 ? " complete" : ""}">${steps.map(([l, t], i) => `<li class="${t ? "done" : i === cur ? "now" : ""}"><span class="dot" aria-hidden="true">${t ? "✓" : i + 1}</span><b>${l}</b><span class="small muted">${t ? stamp(t) : i === cur ? "Next" : ""}</span></li>`).join("")}</ol>`;
}
/* ---------- Desk layout: sections, overview and the command palette ---------- */
/* The desk's own typefaces (Host Grotesk for headings, Instrument Sans for text), loaded only for staff screens */
function deskFonts() {
  if (deskFonts.done) return; deskFonts.done = true;
  const l = document.createElement("link"); l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&display=swap";
  document.head.appendChild(l);
}
const DESK_NAV = [
  ["Operations", [["overview", "Overview", "pulse"], ["review", "To review", "rx"], ["pack", "Pack & deliver", "box"], ["pay", "Awaiting payment", "card"], ["done", "Completed", "check"]]],
  ["Customers", [["requests", "Messages & bookings", "chat"]]],
  ["Inventory", [["stock", "Stock", "layers"], ["supply", "Supply", "truck"]]]
];
const DESK_TABS = DESK_NAV.flatMap(([, items]) => items.map(i => i[0]));
const DESK_TITLES = {
  overview: ["Main dashboard", "Overview", ""],
  review: ["Operations", "To review", "Prescriptions waiting for a pharmacist's decision, oldest first."],
  pack: ["Operations", "Pack & deliver", "Paid orders to pack, and orders out with riders. 30-minute deliveries come first."],
  pay: ["Operations", "Awaiting payment", "Placed or approved orders the customer hasn't paid yet. One reminder goes out after 2 hours."],
  done: ["Operations", "Completed", "Delivered, cancelled and not-approved orders."],
  requests: ["Customers", "Messages & bookings", "Messages, consultations, wholesale quotes and back-in-stock requests."],
  stock: ["Inventory", "Stock", "Mark products running low or out of stock. Out-of-stock items can't be ordered online."],
  supply: ["Inventory", "Supply", "Shortages, purchase orders to wholesalers, and your wholesaler list."]
};
function goDesk(tab, extra) {
  const st = S.staff; st.tab = tab; st.sel = null; st.detail = null; st.status = ""; Object.assign(st, extra || {});
  render(); if (tab === "supply" || tab === "overview") loadSupply(true);
  const h = $("#dk-title"); if (h) h.focus({ preventScroll: true });
}
function greeting() { const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: CFG.site.timezone })); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
/* The dashboard's opening line: what needs the dispensary now */
function overviewSummary(d, groups) {
  const toPack = d.orders.filter(o => o.status === "paid").length, onRoad = d.orders.filter(o => o.status === "out_for_delivery").length, now = groups.review.length + toPack;
  const parts = [groups.review.length && `${groups.review.length} prescription${groups.review.length === 1 ? "" : "s"} to review`, toPack && `${toPack} to pack`].filter(Boolean);
  return (now ? `${now} order${now === 1 ? " needs" : "s need"} you now: ${parts.join(" and ")}.` : "Nothing is waiting on the dispensary right now.") + (onRoad ? ` ${onRoad} on the road with riders.` : "");
}
function overviewActions(d, groups) {
  const waiting = groups.review.concat(d.orders.filter(o => o.status === "paid")).sort((a, b) => waitFrom(a) - waitFrom(b)), next = waiting[0], short = shortCount(d);
  return `<div class="dk-head-actions">${next ? `<button class="btn btn-primary" type="button" data-openorder="${esc(next.id)}" data-otab="${next.status === "paid" ? "pack" : "review"}">Open next order · <span class="mono">${esc(next.id)}</span></button>` : `<button class="btn btn-primary" type="button" data-dtab="pack" data-dstatus="">Go to Pack &amp; deliver</button>`}<button class="btn btn-ghost" type="button" data-dtab="supply" data-dstatus="" data-sv="short">Review shortages${short ? ` (${short})` : ""}</button></div>`;
}
function overviewPanel(d, groups, takings, paidToday, day) {
  const st = S.staff, sp = st.supply, today = day(Date.now());
  const toPack = d.orders.filter(o => o.status === "paid"), onRoad = d.orders.filter(o => o.status === "out_for_delivery");
  const delivered = d.orders.filter(o => o.status === "delivered" && day(o.createdAt) === today).length;
  const newMsgs = d.requests.filter(r => r.status === "new").length, short = shortCount(d);
  const openPos = sp ? sp.pos.filter(p => ["draft", "sent", "confirmed"].includes(p.status)).length : null;
  const oldest = l => l.length ? `oldest ${waitText(Math.min(...l.map(waitFrom)))}` : "nothing waiting";
  const now = groups.review.length + toPack.length;
  const fact = (tab, status, label, value, note, hot) => `<li><button type="button" class="fact${hot ? " hot" : ""}" data-dtab="${tab}" data-dstatus="${status}"><span class="fact-label">${label}</span><b>${value}</b><span class="fact-note">${note}</span></button></li>`;
  const tile = (tab, status, label, value) => `<button type="button" class="flow-tile" data-dtab="${tab}" data-dstatus="${status}"><b>${value}</b><span>${label}</span></button>`;
  const step = (i, tab, status, label, n, note, hot) => `<li><button type="button" class="step${hot ? " hot" : ""}${n ? " live" : ""}" data-dtab="${tab}" data-dstatus="${status}"><span class="step-n" aria-hidden="true">${i}</span><span class="step-label">${label}</span><b>${n}</b><span class="fact-note">${note}</span></button></li>`;
  const progress = `<section class="ov-field ov-top" aria-labelledby="pipe-h">
      <div class="ov-field-head"><h2 id="pipe-h" class="h3">Order progress</h2><p class="small">Every order moves left to right. Select a stage to open it.</p></div>
      <ol class="dk-steps">
        ${step(1, "review", "", "Pharmacist review", groups.review.length, oldest(groups.review), groups.review.some(o => waitMins(o) > 60))}
        ${step(2, "pay", "", "Customer pays", groups.pay.length, "awaiting payment", false)}
        ${step(3, "pack", "paid", "Pack and check", toPack.length, oldest(toPack), toPack.some(o => waitMins(o) > 60))}
        ${step(4, "pack", "out_for_delivery", "Deliver with code", onRoad.length, `${delivered} delivered today`, false)}
      </ol>
    </section>`;
  const rest = `<div class="ov-grid">
      <section aria-labelledby="facts-h"><h2 id="facts-h" class="h3 ov-sub">Today at a glance</h2>
        <ul class="dk-facts">
          ${fact("review", "", "To review", groups.review.length, oldest(groups.review), groups.review.some(o => waitMins(o) > 60))}
          ${fact("pack", "paid", "To pack", toPack.length, oldest(toPack), toPack.some(o => waitMins(o) > 60))}
          ${fact("pack", "out_for_delivery", "On the road", onRoad.length, "with riders", false)}
          ${fact("pay", "", "Awaiting payment", groups.pay.length, "reminder after 2 h", false)}
          ${fact("supply", "", "Items short", short, short ? "low or out of stock" : "all in stock", short > 0)}
          <li><button type="button" class="fact" data-dtab="done" data-dstatus=""><span class="fact-label">Takings today</span><b>${NGN(takings)}</b><span class="fact-note">${paidToday.length} paid · 7 days ${weekBars(d.orders, day)}</span></button></li>
        </ul>
      </section>

    </div>`;
  const flow = `<section class="ov-flowtop" aria-label="How work flows"><figure class="dk-flow" aria-labelledby="flow-h">
        <h2 id="flow-h" class="h3 ov-sub">How work flows</h2>
        <div class="flow-row">${tile("review", "", "Prescriptions", groups.review.length)}${tile("pack", "paid", "Paid orders", toPack.length)}${tile("supply", "", "Wholesaler orders", openPos === null ? "…" : openPos)}${tile("requests", "", "Messages", newMsgs)}</div>
        <svg class="flow-lines" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M12.5 0 C12.5 22 50 18 50 40M37.5 0 C37.5 22 50 18 50 40M62.5 0 C62.5 22 50 18 50 40M87.5 0 C87.5 22 50 18 50 40"/></svg>
        <div class="flow-core"><span>Dispensary</span><b>${now + onRoad.length}</b><span>orders in progress</span></div>
        <svg class="flow-lines" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0 C50 22 30 18 30 40M50 0 C50 22 70 18 70 40"/></svg>
        <div class="flow-row flow-out">${tile("pack", "out_for_delivery", "With riders", onRoad.length)}${tile("done", "", "Delivered today", delivered)}</div>
      </figure></section>`;
  return { flow, progress, rest };
}
/* Command palette: Ctrl/⌘+K jumps to any order, section, product or action */
let cmdkList = [];
function cmdkItems(q) {
  const st = S.staff, d = st.list, nq = norm(q || "");
  const sections = DESK_NAV.flatMap(([g, items]) => items.map(([k, l]) => ({ kind: "Section", label: l, sub: g, run: () => goDesk(k) })));
  const actions = [
    { kind: "Action", label: "Send payment reminders now", run: () => { const b = document.querySelector("[data-remind]"); if (b) sendReminders(b); } },
    { kind: "Action", label: "Create a purchase order", sub: "Supply · Shortages", run: () => goDesk("supply", { sview: "short" }) },
    { kind: "Action", label: "Add a wholesaler", sub: "Supply · Wholesalers", run: () => goDesk("supply", { sview: "suppliers", editSup: "new" }) },
    { kind: "Action", label: "Download orders (CSV)", run: () => downloadCsv() },
    { kind: "Action", label: "Send test email", run: () => { const b = document.querySelector("[data-testmail]"); if (b) testEmail(b); } },
    { kind: "Action", label: soundOn() ? "Turn the new-order sound off" : "Turn the new-order sound on", run: () => { store.set("synako.sound", !soundOn()); render(); } },
    { kind: "Action", label: "Keyboard shortcuts", run: () => { st.keys = true; render(); } },
    { kind: "Page", label: "Rider page", sub: "/rider", run: () => go("/rider") },
    { kind: "Page", label: "Back to the shop", sub: "/", run: () => go("/") }
  ];
  const orders = (d ? d.orders : []).map(o => ({ kind: "Order", label: `${o.id} · ${o.customer}`, sub: `${o.statusLabel}${o.city ? ` · ${o.city}` : ""}`, key: [o.id, o.customer, o.phone, o.city, o.items.join(" ")].join(" "), run: () => openOrder(o.id) }));
  const products = nq.length >= 2 ? P.filter(p => norm([p.name, p.generic, p.brand].join(" ")).includes(nq)).slice(0, 6).map(p => ({ kind: "Stock", label: p.name, sub: p.out ? "Out of stock" : (d && (d.low || []).includes(p.id)) ? "Running low" : "In stock", run: () => goDesk("stock", { stockQ: p.name }) })) : [];
  const all = nq ? sections.concat(actions, orders, products).filter(i => norm([i.label, i.sub, i.key].join(" ")).includes(nq) || i.kind === "Stock") : sections.concat(actions.slice(0, 3), orders.slice(0, 5));
  return all.slice(0, 14);
}
function cmdkOptions() {
  const st = S.staff; cmdkList = cmdkItems(st.cq);
  if (st.ci >= cmdkList.length) st.ci = Math.max(0, cmdkList.length - 1);
  return cmdkList.length ? cmdkList.map((it, i) => `<li role="option" id="cmdk-${i}" data-cmd="${i}" aria-selected="${i === (st.ci || 0)}"><span class="cmdk-kind">${it.kind}</span><span class="cmdk-label">${esc(it.label)}</span>${it.sub ? `<span class="cmdk-sub">${esc(it.sub)}</span>` : ""}</li>`).join("") : `<li class="cmdk-empty" role="presentation">No matches. Try an order number, a name, a product or an action.</li>`;
}
function cmdkView() {
  const st = S.staff;
  return `<div class="cmdk" data-cmdkclose><div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Search the desk">
    <div class="cmdk-input">${icon("search", "ic sm")}<input id="cmdk-q" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" aria-activedescendant="cmdk-${st.ci || 0}" autocomplete="off" spellcheck="false" placeholder="Search orders, products and actions" value="${esc(st.cq || "")}"></div>
    <ul id="cmdk-list" role="listbox" aria-label="Results">${cmdkOptions()}</ul>
    <p class="cmdk-hint"><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</p></div></div>`;
}
function cmdkOpen() { const st = S.staff; st.cmdk = true; st.cq = ""; st.ci = 0; st.cmdkFrom = document.activeElement; render(); const q = $("#cmdk-q"); if (q) q.focus(); }
function cmdkClose() { const st = S.staff; st.cmdk = false; render(); const f = st.cmdkFrom; if (f && document.contains(f)) f.focus(); else { const b = $(".cmdk-btn"); if (b) b.focus(); } }
function cmdkRefresh() { const l = $("#cmdk-list"), q = $("#cmdk-q"); if (l) l.innerHTML = cmdkOptions(); if (q) q.setAttribute("aria-activedescendant", "cmdk-" + (S.staff.ci || 0)); const a = $("#cmdk-" + (S.staff.ci || 0)); if (a) a.scrollIntoView({ block: "nearest" }); }
function cmdkRun(i) { const it = cmdkList[i]; if (!it) return; S.staff.cmdk = false; it.run(); if (S.staff.cmdk === false && S.mode === "staff") render(); }
function openOrder(id) {
  const o = (S.staff.list ? S.staff.list.orders : []).find(x => x.id === id); if (!o) return;
  const g = deskGroups(S.staff.list), tab = Object.keys(g).find(k => g[k].some(x => x.id === id)) || "done";
  S.staff.tab = tab; S.staff.status = ""; S.staff.q = ""; loadDeskOrder(id);
  setTimeout(() => { const b = document.querySelector(`[data-sel="${id}"]`); if (b) b.scrollIntoView({ block: "nearest" }); }, 0);
}
/* ---------- Supply: shortages, purchase orders to wholesalers, suppliers ---------- */
const shortCount = d => new Set([...(d.out || []), ...(d.low || []), ...P.filter(p => p.outInData).map(p => p.id)]).size;
async function loadSupply(silent) {
  const st = S.staff; if (!st.token) return;
  try { st.supply = DEMO ? { shortages: [], suppliers: [], pos: [], overdue: [], email: false, sms: false } : await call("staff/orders?view=supply", { token: st.token }); st.supplyErr = ""; }
  catch (e) { if (e.status === 401) return signOut(); st.supplyErr = e.message; }
  if (S.mode === "staff" && ["supply", "overview"].includes(st.tab)) render();
}
async function supplyPost(body, btn) {
  if (btn) btn.disabled = true;
  try { const r = await call("staff/orders", { method: "POST", body: Object.assign({ by: S.staff.name }, body), token: S.staff.token }); if (r.shortages) S.staff.supply = r; return r; }
  catch (e) { if (e.status === 401) signOut(); else toast(e.message); return null; }
  finally { if (btn) btn.disabled = false; }
}
async function setLowStock(id, low, btn) {
  const r = await supplyPost({ action: "stock-low", id, low }, btn);
  if (r) { S.staff.list.low = r.low; toast(low ? `${prod(id).name} marked running low. The supply manager has been told.` : `${prod(id).name} is no longer marked low.`); render(); }
}
async function supplierCall(body, btn, msg, close) {
  const r = await supplyPost(body, btn);
  if (r) { if (close) S.staff.editSup = null; toast(msg); render.fresh = true; render(); }
}
async function createPO(btn) {
  const st = S.staff, sh = (st.supply || {}).shortages || [], sel = st.shsel || {};
  const lines = sh.filter(x => sel[x.id]).map(x => ({ id: x.id, qty: Number(($("#shq-" + x.id) || {}).value || 0) }));
  const supplier = ($("#po-sup") || {}).value || "";
  if (!lines.length) return toast("Tick the items to order.");
  if (!supplier) return toast("Choose a wholesaler.");
  const r = await supplyPost({ action: "po-create", supplier, lines, note: ($("#po-note") || {}).value || "" }, btn);
  if (r) { st.shsel = {}; st.sview = "pos"; st.openPo = r.po.id; toast(`Purchase order ${r.po.id} created. Send it to ${r.po.supplierName} next.`); render.fresh = true; render(); }
}
function poText(po) {
  return [`Purchase order ${po.id} from ${B.companyName || B.name}`, ...po.lines.map(l => `• ${l.qty} × ${l.name}${l.pack ? ` (${l.pack})` : ""}`), po.note ? `Note: ${po.note}` : "",
    `Deliver to: ${[B.address, B.city, B.state].filter(has).join(", ")}`, `Contact: ${[B.phone, B.email].filter(has).join(" · ")}`, "Please confirm availability, price and delivery date. Thank you."].filter(Boolean).join("\n");
}
async function poAction(act, extra, btn) {
  const st = S.staff, po = ((st.supply || {}).pos || []).find(x => x.id === st.openPo); if (!po) return;
  const sup = ((st.supply || {}).suppliers || []).find(x => x.id === po.supplier) || {};
  if (extra.via === "copy") { try { await navigator.clipboard.writeText(poText(po)); toast("Order copied. Paste it into a message to the wholesaler."); } catch (e) { toast("Couldn't copy on this device."); } return; }
  if (extra.via === "whatsapp") { const link = waTo(sup.whatsapp || sup.phone, poText(po)); if (!link) return toast("Add a WhatsApp or phone number for this wholesaler first."); window.open(link, "_blank", "noopener"); }
  const r = await supplyPost(Object.assign({ action: "po-update", id: po.id, po: act }, extra), btn);
  if (r) toast({ send: extra.via === "email" ? `Emailed to ${sup.email}.` : "Marked as sent.", confirmed: "Marked as confirmed.", received: "Received. The items are back in stock.", cancel: "Purchase order cancelled.", "": "Delivery date saved." }[act] || "Saved.");
  if (r && act === "received") await loadDesk(true);
  render();
}
function supplyPanel() {
  const st = S.staff, sp = st.supply, view = st.sview || "short";
  if (!sp) return `<section class="panel supply"><p class="muted">${st.supplyErr ? esc(st.supplyErr) : "Loading supply…"}</p></section>`;
  const toOrder = sp.shortages.filter(x => !x.onOrder.length), open = sp.pos.filter(p => ["draft", "sent", "confirmed"].includes(p.status));
  const out = sp.shortages.filter(x => x.state === "out").length, low = sp.shortages.length - out;
  const waiting = sp.shortages.reduce((t, x) => t + x.waiting, 0), late = sp.overdue.length;
  const fact = (sv, f, label, value, note, hot) => `<li><button type="button" class="fact${hot ? " hot" : ""}" data-sview="${sv}"${f ? ` data-shf="${f}"` : ""}><span class="fact-label">${label}</span><b>${value}</b><span class="fact-note">${note}</span></button></li>`;
  const tile = (sv, label, value, extra) => `<button type="button" class="flow-tile" data-sview="${sv}"${extra || ""}><b>${value}</b><span>${label}</span></button>`;
  const busiest = sp.suppliers.map(w => ({ w, n: open.filter(p => p.supplier === w.id).length })).sort((a, b) => b.n - a.n || a.w.name.localeCompare(b.w.name)).slice(0, 4);
  const nav = [["short", "Shortages", toOrder.length, toOrder.length > 0], ["pos", "Purchase orders", open.length, late > 0], ["suppliers", "Wholesalers", sp.suppliers.length, false]];
  const step = (i, f, label, n, note, hot) => `<li><button type="button" class="step${hot ? " hot" : ""}${n ? " live" : ""}" data-sview="pos" data-pof="${f}"><span class="step-n" aria-hidden="true">${i}</span><span class="step-label">${label}</span><b>${n}</b><span class="fact-note">${note}</span></button></li>`;
  const by = s => sp.pos.filter(p => p.status === s).length, recent = sp.pos.filter(p => p.status === "received" && Date.now() - Date.parse(p.receivedAt || p.createdAt) < 30 * 864e5).length;
  return `<section class="supply" aria-label="Supply console">
    <div class="sup-hero">
      <ul class="dk-facts" aria-label="Supply figures">
        ${fact("short", "open", "To order", toOrder.length, toOrder.length ? "short and not on order" : "nothing to order", toOrder.length > 0)}
        ${fact("short", "out", "Out of stock", out, out ? "can't be ordered online" : "none", out > 0)}
        ${fact("short", "low", "Running low", low, low ? "order before it runs out" : "none", false)}
        ${fact("short", "", "Customers waiting", waiting, waiting ? "asked to be told when back" : "nobody waiting", waiting > 0)}
        ${fact("pos", "", "Open orders", open.length, open.length ? "with wholesalers" : "none open", false)}
        ${fact("pos", "late", "Late", late, late ? "past due or unconfirmed" : "all on time", late > 0)}
      </ul>
      <figure class="dk-flow" aria-labelledby="sflow-h">
        <h2 id="sflow-h" class="h3 ov-sub">Supply chain</h2>
        <div class="flow-row" style="grid-template-columns:repeat(${Math.max(1, busiest.length)},minmax(0,1fr))">${busiest.length ? busiest.map(({ w, n }) => tile("suppliers", esc(w.name.replace(/\s+(Pharmaceuticals?|LTD|Ltd|Limited)\b.*$/i, "")), n, ` title="${esc(w.name)}: ${n} open order${n === 1 ? "" : "s"}"`)).join("") : tile("suppliers", "Add a wholesaler", "+")}</div>
        <svg class="flow-lines" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="${(busiest.length ? busiest : [0]).map((_, i, a) => { const x = (i + 0.5) * 100 / a.length; return `M${x} 0 C${x} 22 50 18 50 40`; }).join("")}"/></svg>
        <div class="flow-core"><span>Synako stock</span><b>${sp.shortages.length}</b><span>item${sp.shortages.length === 1 ? "" : "s"} short · ${open.length} on order</span></div>
        <svg class="flow-lines" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0 C50 22 30 18 30 40M50 0 C50 22 70 18 70 40"/></svg>
        <div class="flow-row flow-out">${tile("short", "Customers waiting", waiting)}${tile("pos", "Received, 30 days", recent, ' data-pof="received"')}</div>
        <figcaption class="sr">Wholesalers with open purchase orders feed Synako's stock; ${sp.shortages.length} items are short and ${waiting} customers are waiting.</figcaption>
      </figure>
    </div>
    <section class="ov-field" aria-labelledby="popipe-h">
      <div class="ov-field-head"><h2 id="popipe-h" class="h3">Purchase order pipeline</h2><p class="small">Each order moves left to right. Select a stage to see its orders.</p></div>
      <ol class="dk-steps">
        ${step(1, "draft", "Draft", by("draft"), "not sent yet", by("draft") > 0)}
        ${step(2, "sent", "Sent to wholesaler", by("sent"), late ? `${late} late` : "awaiting reply", late > 0)}
        ${step(3, "confirmed", "Confirmed", by("confirmed"), "on the way", false)}
        ${step(4, "received", "Received", recent, "last 30 days · back in stock", false)}
      </ol>
    </section>
    <div class="seg" role="tablist" aria-label="Supply views">${nav.map(([k, l, n, hot]) => `<button type="button" role="tab" id="sv-${k}" aria-controls="sv-panel" data-sview="${k}" aria-selected="${view === k}">${l} <span class="count${hot ? " warn" : ""}">${n}</span></button>`).join("")}</div>
    <div id="sv-panel" role="tabpanel" aria-labelledby="sv-${view}">${view === "short" ? shortagesView(sp) : view === "pos" ? posView(sp) : suppliersView(sp)}</div>
  </section>`;
}
const SH_COLS = [["name", "Item"], ["state", "Status"], ["waiting", "Waiting"], ["sold7", "Sold 7 days"]];
function shortagesView(sp) {
  const st = S.staff, sel = st.shsel || {}, f = st.shf || "", q = norm(st.shq || ""), sort = st.shsort || { k: "", dir: 1 };
  if (!sp.shortages.length) return `<div class="panel empty-state">${icon("check", "ic big")}<p><b>Nothing is short right now</b></p><p class="muted small">When staff mark items as running low or out of stock in the Stock section, they appear here to order.</p></div>`;
  const suggest = x => Math.max(10, Math.ceil((x.sold7 * 2 + x.waiting) / 5) * 5);
  const counts = { "": sp.shortages.length, open: sp.shortages.filter(x => !x.onOrder.length).length, out: sp.shortages.filter(x => x.state === "out").length, low: sp.shortages.filter(x => x.state === "low").length };
  let rows = sp.shortages.filter(x => (!f || (f === "open" ? !x.onOrder.length : x.state === f)) && (!q || norm(x.name + " " + x.pack).includes(q)));
  if (sort.k) rows = rows.slice().sort((a, b) => (sort.k === "name" ? a.name.localeCompare(b.name) : sort.k === "state" ? (a.state === "out" ? 0 : 1) - (b.state === "out" ? 0 : 1) : (a[sort.k] - b[sort.k])) * sort.dir);
  const picked = sp.shortages.filter(x => sel[x.id]), allOn = rows.length && rows.every(x => sel[x.id]);
  const chosen = st.poSup && sp.suppliers.some(w => w.id === st.poSup) ? st.poSup : "";
  const lead = (sp.suppliers.find(w => w.id === chosen) || {}).leadDays;
  const th = ([k, l]) => `<th scope="col" aria-sort="${sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : "none"}"><button type="button" class="th-sort" data-shsort="${k}">${l}<span aria-hidden="true">${sort.k === k ? (sort.dir > 0 ? " ↑" : " ↓") : ""}</span></button></th>`;
  return `<div class="panel dtable-wrap">
    <div class="dt-tools">
      <div class="chips" role="group" aria-label="Filter shortages">${[["", "All"], ["open", "Not on order"], ["out", "Out of stock"], ["low", "Running low"]].map(([k, l]) => `<button type="button" class="chip" data-shf="${k}" aria-pressed="${f === k}">${l} <span class="count">${counts[k]}</span></button>`).join("")}</div>
      <label class="dt-search"><span class="sr">Search shortages</span>${icon("search", "ic sm")}<input id="shq" type="search" placeholder="Search items" value="${esc(st.shq || "")}" autocomplete="off"></label>
    </div>
    <table class="dtable">
      <caption class="sr">Items short, ${rows.length} shown. Tick items, choose a wholesaler and create a purchase order.</caption>
      <thead><tr><th scope="col" class="c-check"><input type="checkbox" id="sh-all" ${allOn ? "checked" : ""} aria-label="Select all shown items"></th>${SH_COLS.map(th).join("")}<th scope="col">On order</th><th scope="col" class="c-num">Order qty</th></tr></thead>
      <tbody>${rows.length ? rows.map(x => `<tr class="${sel[x.id] ? "on" : ""}${x.onOrder.length ? " ordered" : ""}">
        <td class="c-check"><input type="checkbox" id="sh-${esc(x.id)}" data-shsel="${esc(x.id)}" ${sel[x.id] ? "checked" : ""} aria-label="Select ${esc(x.name)}"></td>
        <td data-label="Item"><label for="sh-${esc(x.id)}"><b>${esc(x.name)}</b> <span class="muted small">${esc(x.pack)}</span></label></td>
        <td data-label="Status">${x.state === "out" ? `<span class="tag bad">Out of stock</span>` : `<span class="tag warn">Running low</span>`}</td>
        <td data-label="Waiting" class="c-num">${x.waiting || "–"}</td>
        <td data-label="Sold 7 days" class="c-num">${x.sold7 || "–"}</td>
        <td data-label="On order">${x.onOrder.length ? x.onOrder.map(o => `<span class="small ok-text">${o.qty} · ${esc(o.po)} <span class="muted">(${esc(o.status)})</span></span>`).join("<br>") : `<span class="muted small">Not ordered</span>`}</td>
        <td data-label="Order qty" class="c-num"><input class="qty-in" id="shq-${esc(x.id)}" type="number" min="1" step="1" inputmode="numeric" value="${suggest(x)}" aria-label="Quantity of ${esc(x.name)} to order"></td>
      </tr>`).join("") : `<tr><td colspan="7" class="muted small">No items match. <button class="linkbtn" type="button" data-shf="">Show all</button></td></tr>`}</tbody>
    </table>
    <div class="po-bar${picked.length ? " live" : ""}" role="region" aria-label="New purchase order">
      <p class="po-bar-count"><b>${picked.length}</b> item${picked.length === 1 ? "" : "s"} selected</p>
      ${sp.suppliers.length ? `<label for="po-sup"><span>Wholesaler</span><select id="po-sup"><option value="">Choose…</option>${sp.suppliers.map(w => `<option value="${esc(w.id)}"${w.id === chosen ? " selected" : ""}>${esc(w.name)}${w.leadDays ? ` · ${w.leadDays} day${w.leadDays === 1 ? "" : "s"}` : ""}</option>`).join("")}</select></label>
      <label for="po-note"><span>Note${lead ? ` · due about ${new Date(Date.now() + lead * 864e5).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</span><input id="po-note" placeholder="Optional, e.g. deliver before Friday"></label>
      <button class="btn btn-primary" type="button" data-pocreate ${picked.length ? "" : "disabled"}>Create purchase order</button>`
      : `<p class="small">Add your wholesalers first. <button class="linkbtn" type="button" data-supedit="">Add a wholesaler</button></p>`}
    </div>
  </div>`;
}
const PO_TAG = { draft: "gen", sent: "warn", confirmed: "otc", received: "ok", cancelled: "bad" };
function poCsv() {
  const pos = ((S.staff.supply || {}).pos || []), q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const rows = [["PO", "Wholesaler", "Status", "Created", "Expected", "Item", "Pack", "Quantity"]].concat(pos.flatMap(p => p.lines.map(l => [p.id, p.supplierName, p.status, p.createdAt.slice(0, 10), p.expected || "", l.name, l.pack, l.qty])));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = `synako-purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function posView(sp) {
  const st = S.staff, late = new Set(sp.overdue), f = st.pof || "";
  if (!sp.pos.length) return `<div class="panel empty-state">${icon("box", "ic big")}<p><b>No purchase orders yet</b></p><p class="muted small">Create one from the Shortages view.</p><button class="btn btn-primary btn-sm" type="button" data-sview="short">Go to shortages</button></div>`;
  const keep = p => !f || (f === "open" ? ["draft", "sent", "confirmed"].includes(p.status) : f === "late" ? late.has(p.id) : p.status === f);
  const list = sp.pos.filter(keep);
  const chips = [["", "All"], ["open", "Open"], ["late", "Late"], ["draft", "Draft"], ["sent", "Sent"], ["confirmed", "Confirmed"], ["received", "Received"], ["cancelled", "Cancelled"]];
  return `<div class="dt-tools"><div class="chips" role="group" aria-label="Filter purchase orders">${chips.map(([k, l]) => `<button type="button" class="chip" data-pof="${k}" aria-pressed="${f === k}">${l} <span class="count">${sp.pos.filter(p => !k || (k === "open" ? ["draft", "sent", "confirmed"].includes(p.status) : k === "late" ? late.has(p.id) : p.status === k)).length}</span></button>`).join("")}</div>
    <button class="btn btn-ghost btn-sm" type="button" data-pocsv>${icon("download", "ic sm")} Download (CSV)</button></div>
    <div class="po-list">${list.length ? list.map(po => {
    const sup = sp.suppliers.find(x => x.id === po.supplier) || {}, isOpen = st.openPo === po.id, closed = ["received", "cancelled"].includes(po.status);
    const units = po.lines.reduce((t, l) => t + l.qty, 0);
    return `<article class="panel po${late.has(po.id) ? " late" : ""}">
      <button type="button" class="po-top" data-poopen="${esc(po.id)}" aria-expanded="${isOpen}" aria-controls="po-${esc(po.id)}"><b class="mono">${esc(po.id)}</b><span class="po-sup">${esc(po.supplierName)}</span><span class="tag ${PO_TAG[po.status]}">${esc(po.status)}</span>${late.has(po.id) ? `<span class="tag bad">Late</span>` : ""}<span class="small muted po-meta">${po.lines.length} line${po.lines.length === 1 ? "" : "s"} · ${units} units · ${stamp(po.createdAt)}${po.expected ? ` · due ${esc(po.expected)}` : ""}</span><span class="po-caret" aria-hidden="true">${isOpen ? "−" : "+"}</span></button>
      ${isOpen ? `<div class="po-body" id="po-${esc(po.id)}">
        <table class="dtable compact"><caption class="sr">Lines on ${esc(po.id)}</caption><thead><tr><th scope="col">Item</th><th scope="col">Pack</th><th scope="col" class="c-num">Quantity</th></tr></thead>
          <tbody>${po.lines.map(l => `<tr><td data-label="Item">${esc(l.name)}</td><td data-label="Pack" class="muted">${esc(l.pack)}</td><td data-label="Quantity" class="c-num"><b>${l.qty}</b></td></tr>`).join("")}</tbody></table>
        ${po.note ? `<p class="small"><b>Note:</b> ${esc(po.note)}</p>` : ""}
        ${closed ? "" : `<div class="po-actions" role="group" aria-label="Send ${esc(po.id)}">
          ${sup.email ? `<button class="btn btn-sm btn-primary" type="button" data-posend="email">${icon("chat", "ic sm")} Email to ${esc(sup.name)}</button>` : ""}
          ${sup.whatsapp || sup.phone ? `<button class="btn btn-sm ${sup.email ? "btn-ghost" : "btn-primary"}" type="button" data-posend="whatsapp">${icon("chat", "ic sm")} Send on WhatsApp</button>` : ""}
          ${sup.phone ? `<a class="btn btn-sm btn-ghost" href="tel:${esc(sup.phone)}">${icon("phone", "ic sm")} Call</a>` : ""}
          <button class="btn btn-sm btn-ghost" type="button" data-posend="copy">Copy order text</button>
        </div>
        <div class="po-actions" role="group" aria-label="Update ${esc(po.id)}">
          ${["draft", "sent"].includes(po.status) ? `<button class="btn btn-sm btn-ghost" type="button" data-poact="confirmed">Wholesaler confirmed</button>` : ""}
          <button class="btn btn-sm btn-success" type="button" data-poact="received">${icon("check", "ic sm")} Received: back in stock</button>
          <button class="btn btn-sm btn-ghost" type="button" data-poact="cancel">Cancel order</button>
        </div>
        <div class="po-date"><label for="po-date">Expected delivery<input id="po-date" type="date" value="${esc(po.expected || "")}"></label><button class="btn btn-sm btn-ghost" type="button" data-podate>Save date</button></div>`}
        <details class="po-log"><summary>Order record (${po.history.length})</summary><div class="audit">${po.history.slice().reverse().map(h => `<div><span>${stamp(h.t)}</span><b style="font-weight:500">${esc(h.m)}</b></div>`).join("")}</div></details>
      </div>` : ""}
    </article>`; }).join("") : `<p class="muted small">No purchase orders match. <button class="linkbtn" type="button" data-pof="">Show all</button></p>`}</div>`;
}
function suppliersView(sp) {
  const st = S.staff, ed = st.editSup, cur = ed && ed !== "new" ? sp.suppliers.find(x => x.id === ed) || {} : {};
  const open = id => sp.pos.filter(p => p.supplier === id && ["draft", "sent", "confirmed"].includes(p.status)).length;
  const initials = n => String(n).replace(/[^A-Za-z& ]/g, "").split(/\s+/).filter(w => w && !/^(ltd|limited|pharmaceuticals?)$/i.test(w)).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "W";
  const form = ed ? `<form class="f panel sup-form" id="supform" novalidate><h3>${ed === "new" ? "Add a wholesaler" : `Edit ${esc(cur.name || "wholesaler")}`}</h3>
      <div class="row2"><label for="sup-name">Business name<input id="sup-name" required value="${esc(cur.name || "")}"></label><label for="sup-contact">Contact person<input id="sup-contact" value="${esc(cur.contact || "")}"></label></div>
      <div class="row2"><label for="sup-phone">Phone<input id="sup-phone" type="tel" value="${esc(cur.phone || "")}"></label><label for="sup-wa">WhatsApp<span class="hint">If different from the phone.</span><input id="sup-wa" type="tel" value="${esc(cur.whatsapp || "")}"></label></div>
      <div class="row2"><label for="sup-email">Email<span class="hint">Orders can be emailed once your order emails work.</span><input id="sup-email" type="email" value="${esc(cur.email || "")}"></label><label for="sup-lead">Usual delivery time (days)<input id="sup-lead" type="number" min="0" max="60" value="${esc(cur.leadDays || "")}"></label></div>
      <label for="sup-notes">Notes<span class="hint">What they stock, payment terms, minimum order…</span><textarea id="sup-notes" rows="2">${esc(cur.notes || "")}</textarea></label>
      <div class="actions"><button class="btn btn-primary" type="submit">Save wholesaler</button><button class="btn btn-ghost" type="button" data-supcancel>Cancel</button></div></form>` : "";
  return `${form}<div class="dt-tools"><p class="small muted">${sp.suppliers.length} wholesaler${sp.suppliers.length === 1 ? "" : "s"}. Purchase orders reach them by email or WhatsApp.</p>${ed ? "" : `<button class="btn btn-primary btn-sm" type="button" data-supedit="">${icon("plus", "ic sm")} Add a wholesaler</button>`}</div>
    ${sp.suppliers.length ? `<ul class="sup-cards">${sp.suppliers.map(x => { const wa = waTo(x.whatsapp || x.phone, `Hello ${x.contact || x.name}, this is ${B.name}.`); const n = open(x.id); return `<li class="panel sup-card">
      <div class="sup-card-top"><span class="sup-mark" aria-hidden="true">${esc(initials(x.name))}</span><div><h3>${esc(x.name)}</h3>${x.contact ? `<p class="small muted">${esc(x.contact)}</p>` : ""}</div></div>
      <dl class="sup-facts"><div><dt>Delivery</dt><dd>${x.leadDays ? `${x.leadDays} day${x.leadDays === 1 ? "" : "s"}` : "–"}</dd></div><div><dt>Open orders</dt><dd>${n}</dd></div><div><dt>Phone</dt><dd>${x.phone ? `<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>` : "–"}</dd></div></dl>
      ${x.email ? `<p class="small sup-mail">${esc(x.email)}</p>` : `<p class="small muted sup-mail">No email yet</p>`}
      ${x.notes ? `<p class="small muted">${esc(x.notes)}</p>` : ""}
      <div class="sup-card-actions">
        <button class="btn btn-primary btn-sm" type="button" data-orderfrom="${esc(x.id)}">Order from</button>
        ${x.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${esc(x.phone)}" aria-label="Call ${esc(x.name)}">${icon("phone", "ic sm")} Call</a>` : ""}
        ${wa ? `<a class="btn btn-ghost btn-sm" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp ${esc(x.name)}">${icon("chat", "ic sm")} WhatsApp</a>` : ""}
        ${x.email ? `<a class="btn btn-ghost btn-sm" href="mailto:${esc(x.email)}" aria-label="Email ${esc(x.name)}">Email</a>` : ""}
      </div>
      <div class="sup-card-foot"><button class="linkbtn" type="button" data-supedit="${esc(x.id)}">Edit</button><button class="linkbtn" type="button" data-supdel="${esc(x.id)}">Remove</button></div>
    </li>`; }).join("")}</ul>` : `<div class="panel empty-state"><p><b>No wholesalers yet</b></p><button class="btn btn-primary btn-sm" type="button" data-supedit="">Add your first wholesaler</button></div>`}`;
}
/* Desk order list: search, delivery and status filters, and sorting (most urgent first by default) */
const SPEEDS = [["express", "30-minute"], ["sameday", "Same-day"], ["nextday", "Next-day"], ["states", "Other states"]];
const URGENCY = { express: 0, sameday: 1, nextday: 2, states: 3 };
function queueFilter(list) {
  const st = S.staff, q = norm(st.q || "");
  const out = list.filter(o => (!st.speed || o.speedId === st.speed) && (!st.status || o.status === st.status)
    && (!q || norm([o.id, o.customer, o.phone, o.city, o.state, o.items.join(" ")].join(" ")).includes(q)));
  const t = o => Date.parse(o.createdAt) || 0, sort = st.sort || "urgent";
  return out.sort(sort === "newest" ? (a, b) => t(b) - t(a) : sort === "oldest" ? (a, b) => t(a) - t(b) : sort === "total" ? (a, b) => (b.total || 0) - (a.total || 0)
    : (a, b) => ((URGENCY[a.speedId] ?? 9) - (URGENCY[b.speedId] ?? 9)) || t(a) - t(b));
}
function queueTools(list) {
  const st = S.staff, statuses = [...new Set(list.map(o => o.status))];
  const opt = (v, l, cur) => `<option value="${v}"${v === (cur || "") ? " selected" : ""}>${l}</option>`;
  return `<div class="queue-tools">
    <label for="deskq" class="sr">Search orders</label><input id="deskq" type="search" placeholder="Search order no., name, phone, item or town" value="${esc(st.q || "")}" autocomplete="off">
    <div class="queue-selects">
      <label><span class="sr">Sort orders</span><select id="desksort">${[["urgent", "Most urgent first"], ["newest", "Newest first"], ["oldest", "Oldest first"], ["total", "Highest total"]].map(([v, l]) => opt(v, l, st.sort || "urgent")).join("")}</select></label>
      <label><span class="sr">Delivery</span><select id="deskspeed">${opt("", "All delivery", st.speed)}${SPEEDS.map(([v, l]) => opt(v, l, st.speed)).join("")}</select></label>
      ${statuses.length > 1 || st.status ? `<label><span class="sr">Status</span><select id="deskstatus">${opt("", "All statuses", st.status)}${[...new Set(statuses.concat(st.status ? [st.status] : []))].map(v => opt(v, esc((list.find(o => o.status === v) || {}).statusLabel || v), st.status)).join("")}</select></label>` : ""}
    </div><p class="small muted" id="queue-count" role="status">${queueCount(list)}</p></div>`;
}
function queueCount(list) { const n = queueFilter(list).length; return n === list.length ? `${n} order${n === 1 ? "" : "s"}` : `Showing ${n} of ${list.length}`; }
function queueRows(list) {
  const st = S.staff, shown = queueFilter(list);
  if (!list.length) return `<p class="muted small" style="padding:1rem">Nothing here right now.</p>`;
  if (!shown.length) return `<p class="muted small" style="padding:1rem">No orders match. <button class="linkbtn" type="button" data-qclear>Clear filters</button></p>`;
  return shown.map(o => `<button type="button" class="q ${o.status}" data-sel="${o.id}" aria-current="${o.id === st.sel}">
        <span class="top"><b class="mono">${o.id}</b><span class="q-tags">${["pending_review", "paid"].includes(o.status) ? `<span class="wait ${waitMins(o) > 60 ? "late" : waitMins(o) > 30 ? "soon" : ""}" title="Waiting since ${stamp(waitFrom(o))}">${waitText(waitFrom(o))}</span>` : ""}${statusTag(o)}</span></span>
        <span class="small">${esc(o.rxRequest && !o.items.length ? "Prescription request" : o.items.join(", "))}</span>
        ${o.speedId ? `<span class="small"><span class="tag ${o.speedId === "express" ? "bad" : o.speedId === "sameday" ? "warn" : "gen"}">${esc((SPEEDS.find(x => x[0] === o.speedId) || [, ""])[1])}</span>${o.city ? ` ${esc(o.city)}${o.state ? ", " + esc(o.state) : ""}` : ""}</span>` : ""}
        <span class="small muted">${esc(o.customer)} · ${stamp(o.createdAt)} · ${o.priced ? NGN(o.total) : "to price"}${o.rider && o.status === "out_for_delivery" ? ` · with ${esc(o.rider)}` : ""}${o.reminded && /awaiting_payment/.test(o.status) ? " · reminder sent" : ""}</span></button>`).join("");
}
function deskGroup() { const g = deskGroups(S.staff.list); return g[S.staff.tab] || []; }
function refreshQueue() { const l = deskGroup(), q = $("#queue"), c = $("#queue-count"); if (q) q.innerHTML = queueRows(l); if (c) c.textContent = queueCount(l); }
function deskGroups(d) {
  return {
    review: d.orders.filter(o => ["pending_review", "info_needed"].includes(o.status)),
    pack: d.orders.filter(o => ["paid", "packed", "out_for_delivery"].includes(o.status)),
    pay: d.orders.filter(o => ["awaiting_payment", "approved_awaiting_payment"].includes(o.status)),
    done: d.orders.filter(o => ["delivered", "rejected", "cancelled"].includes(o.status))
  };
}
/* WhatsApp a customer from the desk or the rider page (opens WhatsApp with the message ready to send) */
function waTo(phone, text) {
  let n = String(phone || "").replace(/\D/g, "");
  if (n.startsWith("0") && n.length === 11) n = "234" + n.slice(1);
  return n.length >= 10 ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : "";
}
function waUpdate(o) {
  const hi = `Hello ${String(o.customer.name || "").split(" ")[0]}, this is ${B.name} about your order ${o.id}. `, url = `${SITE_URL}/track/${o.id}`;
  return hi + ({
    awaiting_payment: `It's waiting for payment (${NGN(o.total)}). You can pay here: ${url}`,
    approved_awaiting_payment: `Our pharmacist has approved it. Please pay ${NGN(o.total)} here: ${url}`,
    info_needed: `Our pharmacist needs a little more information. Could you reply here or call us?`,
    paid: `We've received your payment and we're preparing your order. Track it here: ${url}`,
    packed: `Your order is packed and will leave with a rider shortly.`,
    out_for_delivery: `Your order is on its way${o.rider ? ` with ${o.rider}` : ""}. Please have your delivery code ready.`,
    delivered: `Your order has been delivered. Thank you for choosing us!`
  }[o.status] || `Track it here: ${url}`);
}
async function sendReminders(btn) {
  btn.disabled = true;
  try { const r = await api.staffPost(S.staff.token, { action: "reminders" }); toast(r.reminded || r.cancelled ? `${r.reminded} reminder${r.reminded === 1 ? "" : "s"} sent${r.cancelled ? ` · ${r.cancelled} unpaid order${r.cancelled === 1 ? "" : "s"} cancelled` : ""}.` : "No unpaid orders need a reminder right now."); await loadDesk(true); }
  catch (e) { if (e.status === 401) signOut(); else toast(e.message); }
  btn.disabled = false;
}

/* ---------- Rider page: today's deliveries on a phone ---------- */
let riderTimer = null;
async function loadRider(silent) {
  const r = S.rider; if (!r.token) return;
  try {
    const was = r.list ? r.list.filter(d => d.status === "packed").length : null;
    const d = await api.riderList(r.token); r.list = d.deliveries; r.err = "";
    const now = r.list.filter(x => x.status === "packed").length;
    if (was !== null && now > was) { toast(`${now - was} new deliver${now - was === 1 ? "y" : "ies"} ready to collect`); chime(); }
  } catch (e) { if (e.status === 401) return riderSignOut(); r.err = e.message; }
  if (S.mode === "rider") render();
}
function riderSignOut() { S.rider = { token: "", name: S.rider.name, list: null, err: "" }; store.sset("synako.rider", ""); render.fresh = true; render(); }
async function riderTake(id, btn) {
  btn.disabled = true;
  try { const r = await api.riderAct(S.rider.token, { action: "rider-take", id, by: S.rider.name }); S.rider.list = r.deliveries; toast(`${id} is yours. The customer has been told you're on the way.`); render.fresh = true; render(); }
  catch (e) { if (e.status === 401) riderSignOut(); else { toast(e.message); loadRider(true); } btn.disabled = false; }
}
const mapLink = d => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([d.addr, d.landmark, d.city, d.state, "Nigeria"].filter(has).join(", "));
function rideCard(d, mine) {
  const first = String(d.name || "").split(" ")[0];
  const wa = waTo(d.phone, `Hello ${first}, this is ${S.rider.name || "your rider"} from ${B.name}. I'm ${d.status === "packed" ? "about to leave" : "on my way"} with your order ${d.id}.${d.hasCode ? " Please have your delivery code ready." : ""}`);
  const speedName = (SPEEDS.find(x => x[0] === d.speedId) || [, ""])[1];
  return `<article class="panel ride${d.speedId === "express" ? " urgent" : ""}">
    <div class="top"><b class="mono">${esc(d.id)}</b><span>${speedName ? `<span class="tag ${d.speedId === "express" ? "bad" : d.speedId === "sameday" ? "warn" : "gen"}">${esc(speedName)}</span>` : ""}${d.idCheck ? ` <span class="tag age">Check ID 18+</span>` : ""}</span></div>
    <div><b>${esc(d.name)}</b> <span class="small muted">· ${d.items} item${d.items === 1 ? "" : "s"} · paid, nothing to collect</span></div>
    <div class="small">${esc([d.addr, d.city, d.state].filter(has).join(", "))}${has(d.landmark) ? `<br><span class="muted">Landmark: ${esc(d.landmark)}</span>` : ""}</div>
    ${has(d.note) ? `<div class="small"><b>Customer note:</b> ${esc(d.note)}</div>` : ""}
    <div class="ride-links"><a class="btn btn-ghost btn-sm" href="tel:${esc(d.phone)}">${icon("phone", "ic sm")} Call</a>${wa ? `<a class="btn btn-ghost btn-sm" href="${esc(wa)}" target="_blank" rel="noopener">${icon("chat", "ic sm")} WhatsApp</a>` : ""}<a class="btn btn-ghost btn-sm" href="${esc(mapLink(d))}" target="_blank" rel="noopener">${icon("pin", "ic sm")} Directions</a></div>
    ${d.status === "packed" ? `<button class="btn btn-primary" type="button" data-rtake="${esc(d.id)}">${icon("truck", "ic sm")} Start this delivery</button>`
      : mine ? `<form class="ride-done" data-rdone="${esc(d.id)}" novalidate><label for="rcode-${esc(d.id)}">Customer's delivery code</label><div class="row"><input id="rcode-${esc(d.id)}" class="rcode mono" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="0000" required><button class="btn btn-success" type="submit">${icon("check", "ic sm")} Delivered</button></div>${d.hasCode ? "" : `<p class="small muted">This order was paid before delivery codes started: enter 0000.</p>`}</form>`
      : `<p class="small muted">With ${esc(d.rider || "another rider")}.</p>`}
  </article>`;
}
function vRider() {
  const r = S.rider;
  if (!r.token) return `<div class="wrap desk-login"><form class="f panel" id="riderform" novalidate>
      <h1 class="h2">Rider sign-in</h1><p class="muted small">For Synako delivery riders. See the deliveries that are ready, call or WhatsApp customers, get directions and confirm each delivery with the customer's code.</p>
      ${alertBox(r.err)}
      <label for="rname">Your name<span class="hint">Customers are told who is bringing their order.</span><input id="rname" name="rname" required autocomplete="name" value="${esc(r.name)}"></label>
      <label for="rpw">Rider password<span class="hint">Ask the pharmacy for it.</span><input id="rpw" name="rpw" type="password" required autocomplete="current-password"></label>
      <button class="btn btn-primary" type="submit">Sign in</button></form></div>`;
  if (!r.list) return `<div class="wrap"><p class="muted" style="padding:2rem 0">Loading deliveries…</p></div>`;
  const by = (a, b) => ((URGENCY[a.speedId] ?? 9) - (URGENCY[b.speedId] ?? 9)) || (Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const mine = r.list.filter(d => d.status === "out_for_delivery" && d.rider === r.name).sort(by);
  const ready = r.list.filter(d => d.status === "packed").sort(by);
  const others = r.list.filter(d => d.status === "out_for_delivery" && d.rider !== r.name).sort(by);
  const sec = (title, list, isMine, empty) => `<section class="ride-sec"><h2 class="h3">${title} <span class="count">${list.length}</span></h2>${list.length ? list.map(d => rideCard(d, isMine)).join("") : `<p class="muted small">${empty}</p>`}</section>`;
  return `<div class="wrap rider">
    <p class="small muted" role="status">Signed in as <b>${esc(r.name)}</b> · updates every 20 seconds</p>
    ${r.err ? alertBox(r.err) : ""}
    ${sec("On the road with you", mine, true, "Nothing yet. Start a delivery below.")}
    ${sec("Ready to collect", ready, false, "No packed orders waiting. You'll hear a chime when one is ready.")}
    ${others.length ? `<details class="ride-sec"><summary class="h4">Out with other riders (${others.length})</summary>${others.map(d => rideCard(d, false)).join("")}</details>` : ""}
  </div>`;
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
  const packing = A.includes("packed"), ticks = (st.packed && st.packed[o.id]) || [];
  const allTicked = o.items.every((_, i) => ticks.includes(i));
  return `<button class="linkbtn desk-back" type="button" data-deskback>← All orders</button>
    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><div class="muted small">Order</div><h2 class="mono" style="font-size:1.35rem">${esc(o.id)}</h2><div class="muted small">${stamp(o.createdAt)} · ${esc(o.delivery.label)}</div></div>${statusTag(o)}</div>
    ${progressSteps(o)}
    <div class="desk-print"><button class="btn btn-ghost btn-sm" type="button" data-dreceipt>${icon("download", "ic sm")} ${PAID(o.status) ? "Receipt (PDF)" : "Order summary (PDF)"}</button><button class="btn btn-ghost btn-sm" type="button" data-print>${icon("print", "ic sm")} Print delivery note</button>${waTo(o.customer.phone, waUpdate(o)) ? `<a class="btn btn-ghost btn-sm" href="${esc(waTo(o.customer.phone, waUpdate(o)))}" target="_blank" rel="noopener">${icon("chat", "ic sm")} WhatsApp the customer</a>` : ""}</div>
    <div class="review">
      <div style="display:grid;gap:.8rem;align-content:start">
        <dl class="kv"><dt>Customer</dt><dd>${esc(o.customer.name)}</dd><dt>Phone</dt><dd><a href="tel:${esc(o.customer.phone)}">${esc(o.customer.phone)}</a></dd><dt>Email</dt><dd>${esc(o.customer.email)}</dd>${o.customer.dob ? `<dt>Date of birth</dt><dd>${esc(o.customer.dob)}</dd>` : ""}
          <dt>Deliver to</dt><dd>${esc([o.delivery.addr, o.delivery.landmark, o.delivery.city, o.delivery.state].filter(has).join(", "))}</dd>${o.rider ? `<dt>Rider</dt><dd>${esc(o.rider)}</dd>` : ""}${has(o.delivery.note) ? `<dt>Customer note</dt><dd><b>${esc(o.delivery.note)}</b></dd>` : ""}</dl>
        ${packing ? `<fieldset class="packlist"><legend>Packing checklist <span class="small muted">${ticks.length} of ${o.items.length} ticked</span></legend>${o.items.map((i, n) => `<label class="check"><input type="checkbox" data-pack="${esc(o.id)}" data-n="${n}" ${ticks.includes(n) ? "checked" : ""}><span>${i.qty} × ${esc(i.name)}${i.n > 1 ? ` <span class="muted">(${i.qty * i.n} packs)</span>` : ""} · check batch and expiry</span></label>`).join("")}</fieldset>` : ""}
        <div class="small" style="display:grid;gap:.3rem">${o.items.map(i => `<div class="r"><span>${i.qty} × ${esc(i.name)} ${i.cls === "pom" ? `<span class="tag rx">POM</span>` : ""}${i.age ? `<span class="tag age">18+ ID</span>` : ""}${i.n > 1 ? `<span class="muted"> (${i.qty * i.n} packs)</span>` : ""}</span><span class="num">${NGN(i.total)}</span></div>`).join("")}
          ${o.discount ? `<div class="r"><span>Discount${o.promo ? ` (${esc(o.promo.code)})` : ""}</span><span class="num">−${NGN(o.discount)}</span></div>` : ""}<div class="r"><span>Delivery</span><span class="num">${NGN(o.deliveryFee)}</span></div><div class="r"><b>Total</b><b class="num">${o.priced === false ? "to price" : NGN(o.total)}</b></div></div>
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
      ${A.includes("dispatched") ? `<label for="arider">Rider taking it<span class="hint">Optional. The customer is told who is coming. Riders can also start deliveries themselves on the rider page.</span><input id="arider" autocomplete="off"></label>` : ""}
      ${A.includes("delivered") && o.deliveryCode ? `<label for="acode">Customer's delivery code<span class="hint">The 4-digit code the customer gives at the door.</span><input id="acode" inputmode="numeric" maxlength="4" autocomplete="off" class="mono"></label>` : ""}
      ${A.some(a => ["info", "reject", "cancel", "delivered"].includes(a)) ? `<label for="anote">${A.includes("delivered") ? "Note" : "Note to the customer"}<span class="hint">${A.includes("delivered") ? (o.deliveryCode ? "Only if there's no code, say why (for example, collected in store)." : "Optional.") : "Required if you ask for information or don't approve."}</span><textarea id="anote" rows="2"></textarea></label>` : ""}
      <div class="actions">${A.map(a => {
        const L2 = { approve: ["Approve and request payment", "btn-success"], info: ["Ask for more information", "btn-ghost"], reject: ["Don't approve", "btn-danger"], resume: ["Back to review", "btn-ghost"], cancel: ["Cancel order", "btn-danger"], packed: ["Mark as packed", "btn-primary"], dispatched: ["Mark out for delivery", "btn-primary"], delivered: ["Mark as delivered", "btn-success"] }[a];
        return `<button class="btn ${L2[1]}" type="button" data-act="${a}" ${S.busy || (a === "packed" && !allTicked) ? "disabled" : ""}>${L2[0]}</button>`; }).join("")}${packing && !allTicked ? `<span class="small muted">Tick every item to mark it packed.</span>` : ""}</div>
    </form>` : ""}
    <div><h3 class="h4" style="margin-bottom:.5rem">Order record</h3><div class="audit">${o.history.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>`;
}

/* ---------- Shell: top bar, footer details, directory, drawer ---------- */
function renderShell() {
  document.documentElement.lang = CFG.site.locale || "en";
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  const syr = $("#staff-year"); if (syr) syr.textContent = new Date().getFullYear();
  orgLd();
  const hours = () => { const el = $("#topbar-hours"); if (el) el.innerHTML = openStatus(); };
  hours(); clearInterval(renderShell.t); renderShell.t = setInterval(hours, 60000);
  $("#topbar-mid").innerHTML = addressLine ? `Visit our pharmacy at ${esc(addressLine)} ${link("/contact", "Contact Us")}` : `Genuine medicines, checked by our pharmacists ${link("/contact", "Contact Us")}`;
  $("#topbar-right").innerHTML = (has(B.phone) ? `<span class="callus">Call Us: ${phoneText()}</span>` : "") +
    `<span class="social">${has(B.facebook) ? `<a href="${esc(B.facebook)}" target="_blank" rel="noopener" aria-label="Synako on Facebook"><svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg></a>` : ""}${has(B.instagram) ? `<a href="${esc(B.instagram)}" target="_blank" rel="noopener" aria-label="Synako on Instagram"><svg viewBox="0 0 24 24"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8c0-1.7-.4-3.2-1.6-4.4S17.7 2.1 16 2c-1.7-.1-6.4-.1-8.1 0-1.7.1-3.2.5-4.4 1.6S2 6.3 2 8c-.1 1.7-.1 6.4 0 8.1.1 1.7.5 3.2 1.6 4.4s2.7 1.6 4.4 1.6c1.7.1 6.4.1 8.1 0 1.7-.1 3.2-.5 4.4-1.6s1.6-2.7 1.6-4.4c.1-1.7.1-6.4-.2-8.1z"/></svg></a>` : ""}</span>`;
  const rows = [["Premises", L.pcnPremises], ["E-pharmacy licence", L.pcnEPharmacy], ["Superintendent", [L.superintendentName, L.superintendentPcnReg && "PCN " + L.superintendentPcnReg].filter(has).join(", ")], ["Address", addressLine], ["Phone", [B.phone, B.phone2].filter(has).join(" · ")]].filter(([, v]) => has(v));
  $("#reg").innerHTML = `${has(L.ropseImage) ? `<a href="${esc(L.ropseLink || "/licences")}" ${has(L.ropseLink) ? 'target="_blank" rel="noopener"' : "data-link"}><img class="ropse-img" src="${esc(L.ropseImage)}" alt="PCN Registered Online Pharmacy Sites Emblem" width="72" height="72"></a>` : ""}
    <div><p class="reg-title">Registered with the Pharmacy Council of Nigeria</p>${rows.length ? `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}<p class="small">Open ${esc(H.label)}</p></div>`;
  $("#drawer-foot").innerHTML = `${has(B.phone) ? `<span>Pharmacist line: ${phoneText()}</span>` : ""}<span>Open ${esc(H.label)}</span>`;
  const col = cats => cats.map(c => `<li><a href="/products/${c.id}" data-link>${c.name} <span>${P.filter(p => p.cat === c.id).length}</span></a></li>`).join("");
  const dcol = (id, extra) => { const d = dept(id); return `<div><h2>${icon(d.icon, "ic sm")} ${esc(d.name)}</h2><ul>${col(deptCats(id))}</ul>${link(fpath(id), `All ${esc(d.short.toLowerCase())} <span aria-hidden="true">→</span>`, "dir-all")}${extra || ""}</div>`; };
  $("#directory").innerHTML = dcol("otc") + dcol("pom", link("/prescriptions", "Send a prescription <span aria-hidden=\"true\">→</span>", "dir-all") + link("/controlled-medicines", "Controlled medicines: in store only <span aria-hidden=\"true\">→</span>", "dir-all"))
    + `<div>${["equipment", "surgical"].map(id => `<h2>${icon(dept(id).icon, "ic sm")} ${esc(dept(id).name)}</h2><ul>${col(deptCats(id))}</ul>`).join("")}${link("/wholesale", "Wholesale &amp; trade quotes <span aria-hidden=\"true\">→</span>", "dir-all")}</div>`
    + `<div>${["personal-care", "provisions", "wines"].map(id => `<h2>${icon(dept(id).icon, "ic sm")} ${esc(dept(id).name)}</h2><ul>${col(deptCats(id))}</ul>`).join("")}</div>`;
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
/* Canonical address: site.url from config, unless the visitor is already on a custom domain (so links stay right
   even before site.url is updated after connecting one) */
const SITE_URL = (() => {
  const conf = String(CFG.site.url || location.origin).replace(/\/$/, "");
  try { const h = location.hostname; if (location.protocol === "https:" && h && !/(\.vercel\.app|localhost)$/.test(h) && new URL(conf).hostname !== h) return location.origin; } catch (e) { /* keep config */ }
  return conf;
})();
const DEFAULT_DESC = "Retail and wholesale pharmacy in Nigeria: genuine NAFDAC-registered medicines, medical equipment, surgical supplies, provisions and drinks. Buy single packs or in bulk, send a prescription and get delivery nationwide.";
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
  if (S.mode === "rider") return { title: "Rider deliveries", noindex: true };
  switch (S.view) {
    case "home": return { title: "", desc: DEFAULT_DESC };
    case "shop": {
      const t = strip(filterTitle());
      return { title: t, desc: S.filter === "pom" || (cat(S.filter) && cat(S.filter).cls === "pom")
        ? `${t} from Synako Pharmacy. Upload a valid prescription; our pharmacist checks it before you pay.`
        : `Shop ${t.toLowerCase()} from Synako Pharmacy, a registered Nigerian retail and wholesale pharmacy. Buy single packs or in bulk, with delivery across Nigeria.`, noindex: !!S.q };
    }
    case "product": {
      const p = prod(S.product), rx = p.cls === "pom";
      return { title: p.name, desc: `${p.name} (${p.pack}). ${p.use}${rx ? " Prescription only." : ""}`, type: "product",
        ld: rx || p.age ? null : { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.use, sku: p.id, category: cat(p.cat).name,
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
  const url = SITE_URL + (S.mode !== "shop" ? pathFor() : pathFor());
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
  const staff = S.mode !== "shop", rider = S.mode === "rider";
  $("#shell-customer").hidden = staff; $("#shell-staff").hidden = !staff;
  clearInterval(deskTimer); clearInterval(trackTimer); clearInterval(riderTimer);
  let title;
  if (staff) {
    deskFonts();
    // The desk and rider page refresh themselves; keep whatever staff were typing (notes, codes, searches) and where the cursor was
    const view = $("#staff-view"), a = document.activeElement;
    const typed = render.fresh ? [] : [...view.querySelectorAll("input[id], textarea[id], select[id]")].map(el => [el.id, el.type === "checkbox" ? el.checked : el.value]);
    const keep = a && a.id && view.contains(a) ? [a.id, a.selectionStart, a.selectionEnd] : null;
    render.fresh = false;
    view.innerHTML = rider ? vRider() : vStaff(); title = rider ? "Rider deliveries" : "Pharmacist Desk";
    typed.forEach(([id, v]) => { const el = document.getElementById(id); if (el && view.contains(el)) { if (el.type === "checkbox") el.checked = v; else if (el.type !== "password" || v) el.value = v; } });
    if (keep) { const el = document.getElementById(keep[0]); if (el) { el.focus(); try { el.setSelectionRange(keep[1], keep[2]); } catch (e) { /* not a text box */ } } }
    $(".staff-title").textContent = rider ? "Rider deliveries" : "Pharmacist Desk";
    $(".staff-head .eyebrow").textContent = rider ? "Synako Pharmaceutical LTD · Riders" : "Synako Pharmaceutical LTD";
    if (rider) $("#staff-stats").innerHTML = "";
    $("#staff-signout").hidden = !(rider ? S.rider.token : S.staff.token);
    if (!rider && S.staff.token) deskTimer = setInterval(() => loadDesk(true), 10000);
    if (rider && S.rider.token) riderTimer = setInterval(() => loadRider(true), 20000);
    const waiting = !rider && S.staff.list ? (c => c.pack + c.review)(deskCounts(S.staff.list)) : rider && S.rider.list ? S.rider.list.filter(d => d.status === "packed").length : 0;
    if (waiting) title = `(${waiting}) ${title}`;
  } else {
    const V = { home: vHome, shop: vShop, product: vProduct, controlled: vControlled, basket: vBasket, checkout: vCheckout, rx: vRx, track: vTrack, page: vPage, notfound: vNotFound }[S.view] || vHome;
    $("#view").innerHTML = V();
    renderCount();
    $("#desk-link").hidden = !S.staff.token; // staff signed in on this device get a shortcut back to the desk
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
  const chip = document.querySelector('.chips [aria-current="page"]'); // keep the chosen chip in view on phones
  if (chip) chip.parentNode.scrollLeft = chip.offsetLeft - chip.parentNode.offsetLeft - 16;
}

/* Real photos replace the drawn images as soon as they load */
document.addEventListener("load", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.parentNode.classList.add("has-img"); }, true);
document.addEventListener("error", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.remove(); }, true);

function addToCart(id, q, u) {
  const p = prod(id); u = u || "1";
  if (p.age && !ageOK()) { go("/product/" + id); return; }
  const unit = PR.unitOf(p, u), max = PR.maxQty(p, unit);
  const l = S.cart.find(x => x.id === id && x.u === u);
  if (l) l.q = Math.min(max, l.q + q); else S.cart.push({ id, q: Math.min(max, q), u });
  saveCart();
  const what = unit.n > 1 ? `${q} × ${unit.label.toLowerCase()} of ${p.name}` : p.name;
  toast(p.cls === "pom" ? `Added ${what}. Upload your prescription at checkout.` : `Added ${what} to your basket.`);
  renderCount();
}
function saveForm() {
  const f = document.querySelector("form.f[id^='f']"); if (!f) return;
  new FormData(f).forEach((val, key) => { if (typeof File !== "undefined" && val instanceof File) return; S.form[key] = val; });
  f.querySelectorAll("input[type=checkbox]").forEach(c => { S.form[c.name] = c.checked; });
}
function doSearch(q) { S.q = q.trim().slice(0, 80); S.filter = "all"; $("#q").value = S.q; closeSuggest(); go("/products"); }

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

/* ---------- Email typo check: "ada@gmial.com" → suggest "ada@gmail.com" ---------- */
const MAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "ymail.com", "live.com", "aol.com", "yahoo.co.uk", "hotmail.co.uk", "googlemail.com"];
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1), i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? d[i - 2][j - 2] + 1 : Infinity);
  return d[a.length][b.length];
}
function emailFix(email) {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(String(email || "").trim().toLowerCase()); if (!m) return "";
  const dom = m[2]; if (MAIL_DOMAINS.includes(dom)) return "";
  let best = "", score = 3;
  MAIL_DOMAINS.forEach(d => { const s = editDistance(dom, d); if (s < score) { score = s; best = d; } });
  return best ? `${m[1]}@${best}` : "";
}
function showEmailFix() {
  const input = $("#em"), box = $("#em-fix"); if (!input || !box) return;
  const fix = emailFix(input.value);
  box.innerHTML = fix ? `Did you mean <button type="button" class="linkbtn" data-emfix="${esc(fix)}">${esc(fix)}</button>?` : "";
}

/* ---------- Search suggestions (header search box) ---------- */
const POPULAR_SEARCHES = ["Paracetamol", "Vitamin C", "Malaria test", "Face masks", "Gloves", "Stethoscope", "Bathroom scale", "Milo", "Cornflakes"];
const SG = { items: [], active: -1 };
const hl = (text, q) => { const t = esc(text), n = esc(String(q || "").trim()); if (n.length < 2) return t; const i = t.toLowerCase().indexOf(n.toLowerCase()); return i < 0 ? t : t.slice(0, i) + "<mark>" + t.slice(i, i + n.length) + "</mark>" + t.slice(i + n.length); };
function openSuggest() {
  const input = $("#q"), box = $("#suggest"); if (!input || !box) return;
  const q = input.value.trim();
  let html = "", items = [];
  if (!q) {
    items = POPULAR_SEARCHES.map(t => ({ q: t }));
    html = `<p class="sg-head">Popular searches</p><div class="sg-chips">${items.map((it, i) => `<a id="sg-${i}" role="option" class="sg-chip" href="/products?q=${encodeURIComponent(it.q)}" data-sgq="${esc(it.q)}" aria-selected="false">${esc(it.q)}</a>`).join("")}</div>`;
  } else {
    const found = searchAll(q, true), all = searchAll(q).length, n = norm(q);
    const places = [...DEPTS.map(d => ({ f: d.id, name: d.name })), ...CATS.map(c => ({ f: c.id, name: c.name, age: c.age })), ...DOSES.map(([f, name]) => ({ f, name }))]
      .filter(x => n.length > 1 && norm(x.name).includes(n)).slice(0, 3);
    if (hiddenAlcohol(q) && !places.some(x => x.f === "wines")) places.push({ f: "wines", name: "Wines & spirits (18+)" });
    items = found.slice(0, 6).map(p => ({ p })).concat(places.map(x => ({ place: x })), [{ q, all: found.length }]);
    let i = -1;
    html = (found.length ? `<p class="sg-head">Products</p>` + found.slice(0, 6).map(p => { i++; return `<a id="sg-${i}" role="option" class="sg-item" href="/product/${p.id}" data-link aria-selected="false">
        <span class="sg-thumb" aria-hidden="true">${art(p)}</span><span class="sg-text"><b>${hl(p.name, q)}</b><span>${esc(p.pack)}${p.cls === "pom" ? " · Prescription" : ""}${p.out ? " · Out of stock" : ""}</span></span><span class="sg-price num">${NGN(p.price)}</span></a>`; }).join("")
        : `<p class="sg-empty">No products match “${esc(q)}”. Try a generic name, or ask our pharmacist.</p>`)
      + (places.length ? `<p class="sg-head">Departments</p>` + places.map(x => { i++; return `<a id="sg-${i}" role="option" class="sg-item place" href="${fpath(x.f)}" data-link aria-selected="false">${icon("box", "ic sm")}<span class="sg-text"><b>${hl(x.name, q)}</b></span></a>`; }).join("") : "")
      + (i++, `<a id="sg-${i}" role="option" class="sg-all" href="/products?q=${encodeURIComponent(q)}" data-sgq="${esc(q)}" aria-selected="false">See all ${all} result${all === 1 ? "" : "s"} for “${esc(q)}” →</a>`);
  }
  SG.items = items; SG.active = -1;
  box.innerHTML = html; box.hidden = false;
  input.setAttribute("aria-expanded", "true"); input.removeAttribute("aria-activedescendant");
}
function closeSuggest() {
  const input = $("#q"), box = $("#suggest"); if (!box || box.hidden) return;
  box.hidden = true; SG.active = -1;
  if (input) { input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); }
}
function moveSuggest(d) {
  const opts = [...document.querySelectorAll("#suggest [role=option]")]; if (!opts.length) return;
  SG.active += d; // -1 means back in the text box
  if (SG.active >= opts.length) SG.active = -1; else if (SG.active < -1) SG.active = opts.length - 1;
  opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === SG.active)));
  const input = $("#q");
  if (SG.active >= 0) { input.setAttribute("aria-activedescendant", opts[SG.active].id); opts[SG.active].scrollIntoView({ block: "nearest" }); }
  else input.removeAttribute("aria-activedescendant");
}
let sgTimer;
document.addEventListener("input", e => {
  if (e.target.id === "q") { clearTimeout(sgTimer); sgTimer = setTimeout(openSuggest, 60); }
  if (e.target.id === "em") showEmailFix();
  if (e.target.id === "cmdk-q") { S.staff.cq = e.target.value; S.staff.ci = 0; cmdkRefresh(); }
  if (e.target.id === "shq") { S.staff.shq = e.target.value; render(); }
  if (e.target.id === "deskq") { S.staff.q = e.target.value; refreshQueue(); }
  if (e.target.id === "stockq") { S.staff.stockQ = e.target.value; const l = $("#stocklist"); if (l) l.innerHTML = stockRows(); }
});
document.addEventListener("focusin", e => { if (e.target.id === "q") openSuggest(); });
document.addEventListener("click", e => {
  const opt = e.target.closest && e.target.closest("[data-cmd]");
  if (opt) { cmdkRun(Number(opt.dataset.cmd)); return; }
  if (e.target.matches && e.target.matches("[data-cmdkclose]")) cmdkClose();
});
document.addEventListener("mousemove", e => {
  const opt = e.target.closest && e.target.closest("[data-cmd]");
  if (opt && S.staff.cmdk && Number(opt.dataset.cmd) !== S.staff.ci) { S.staff.ci = Number(opt.dataset.cmd); document.querySelectorAll("#cmdk-list [role=option]").forEach((o, i) => o.setAttribute("aria-selected", String(i === S.staff.ci))); const q = $("#cmdk-q"); if (q) q.setAttribute("aria-activedescendant", "cmdk-" + S.staff.ci); }
});
/* Desk keyboard shortcuts, for the counter computer */
document.addEventListener("keydown", e => {
  if (S.mode !== "staff" || !S.staff.token || !S.staff.list) return;
  const st = S.staff;
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); if (st.cmdk) cmdkClose(); else cmdkOpen(); return; }
  if (st.cmdk) { // the palette owns the keyboard while it's open
    if (e.key === "Escape") { e.preventDefault(); cmdkClose(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = cmdkList.length; if (n) { st.ci = ((st.ci || 0) + (e.key === "ArrowDown" ? 1 : -1) + n) % n; cmdkRefresh(); } }
    else if (e.key === "Enter") { e.preventDefault(); cmdkRun(st.ci || 0); }
    else if (e.key === "Tab") { e.preventDefault(); const q = $("#cmdk-q"); if (q) q.focus(); }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const typing = /^(TEXTAREA|SELECT)$/.test(e.target.tagName) || (e.target.tagName === "INPUT" && !/^(checkbox|radio|button|submit)$/.test(e.target.type));
  if (e.key === "Escape") { if (S.staff.keys) S.staff.keys = false; else if (typing) { e.target.blur(); return; } else { S.staff.sel = null; S.staff.detail = null; } render(); return; }
  if (typing) return;
  if (/^[1-8]$/.test(e.key)) { goDesk(DESK_TABS[Number(e.key) - 1]); e.preventDefault(); return; }
  if (e.key === "/") { const q = $("#deskq") || $("#stockq"); if (q) { q.focus(); e.preventDefault(); } return; }
  if (e.key === "?") { S.staff.keys = !S.staff.keys; render(); return; }
  if (e.key === "r" || e.key === "R") { loadDesk(); return; }
  if (["j", "k", "ArrowDown", "ArrowUp"].includes(e.key) && !["overview", "requests", "stock", "supply"].includes(S.staff.tab)) {
    const shown = queueFilter(deskGroup()); if (!shown.length) return;
    const i = shown.findIndex(o => o.id === S.staff.sel), step = e.key === "j" || e.key === "ArrowDown" ? 1 : -1;
    const next = shown[i < 0 ? 0 : Math.min(shown.length - 1, Math.max(0, i + step))];
    e.preventDefault(); loadDeskOrder(next.id);
    setTimeout(() => { const b = document.querySelector(`[data-sel="${next.id}"]`); if (b) b.scrollIntoView({ block: "nearest" }); }, 0);
  }
});
document.addEventListener("focusout", e => { if (e.target.closest && e.target.closest("#search-form")) setTimeout(() => { if (!document.activeElement || !document.activeElement.closest("#search-form")) closeSuggest(); }, 120); });
document.addEventListener("keydown", e => {
  if (e.target.id !== "q") return;
  const box = $("#suggest");
  if (e.key === "ArrowDown") { if (box.hidden) openSuggest(); moveSuggest(1); e.preventDefault(); }
  else if (e.key === "ArrowUp") { moveSuggest(-1); e.preventDefault(); }
  else if (e.key === "Escape") { if (!box.hidden) { closeSuggest(); e.preventDefault(); } }
  else if (e.key === "Enter" && SG.active >= 0) { const o = document.querySelectorAll("#suggest [role=option]")[SG.active]; if (o) { e.preventDefault(); o.click(); } }
});

const PAID = st => ["paid", "packed", "out_for_delivery", "delivered"].includes(st);
async function downloadReceipt(o, btn) {
  if (!window.SYNAKO_RECEIPT) { toast("Receipts aren't available right now. Please try again later."); return; }
  btn.disabled = true;
  try { const name = await window.SYNAKO_RECEIPT.download(o); toast(`Saved ${name}`); }
  catch (e) { toast("We couldn't make the PDF. Please try again."); }
  btn.disabled = false;
}
function downloadCsv() {
  const d = S.staff.list; if (!d || !d.orders.length) { toast("No orders to download yet."); return; }
  const cell = v => { const t = String(v == null ? "" : v); return /[",\n]/.test(t) || /^[=+\-@]/.test(t) ? `"${t.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : t; };
  const rows = [["Order", "Placed", "Status", "Customer", "Items", "Delivery", "Total (NGN)", "Prescription"]]
    .concat(d.orders.map(o => [o.id, new Date(o.createdAt).toLocaleString("en-GB", { timeZone: CFG.site.timezone }), o.statusLabel, o.customer, o.items.join("; "), o.speed, o.priced ? o.total : "", o.rx ? "Yes" : "No"]));
  const blob = new Blob(["\ufeff" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `synako-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
async function shareProduct() {
  const p = prod(S.product), url = `${SITE_URL}/product/${p.id}`;
  try { if (navigator.share) { await navigator.share({ title: p.name, text: `${p.name} at ${B.name}`, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast("Link copied. Paste it anywhere to share."); } catch (e) { toast(url); }
}
function reorder() {
  const o = S.track; if (!o) return;
  let added = 0, skipped = 0;
  o.items.forEach(i => {
    const p = prod(i.id), u = i.unit || "1";
    if (!p || p.out || !PR.unitOf(p, u) || (p.age && !ageOK())) { if (i.id !== "rx-request") skipped++; return; }
    const l = S.cart.find(x => x.id === p.id && x.u === u), max = PR.maxQty(p, PR.unitOf(p, u));
    if (l) l.q = Math.min(max, l.q + i.qty); else S.cart.push({ id: p.id, q: Math.min(max, i.qty), u });
    added++;
  });
  saveCart();
  toast(added ? `Added ${added} item${added === 1 ? "" : "s"} to your basket${skipped ? `. ${skipped} couldn't be added (out of stock or unavailable)` : ""}.` : "These items can't be ordered again right now.");
  if (added) go("/basket");
}
/* Desk: stock list with search; one click marks a product out of stock or back in stock */
function stockRows() {
  const q = norm(S.staff.stockQ || "");
  const list = P.filter(p => !q || norm([p.name, p.generic, p.brand, cat(p.cat).name].join(" ")).includes(q))
    .sort((a, b) => (b.out - a.out) || ((S.staff.list.low || []).includes(b.id) - (S.staff.list.low || []).includes(a.id)) || a.name.localeCompare(b.name)).slice(0, 80);
  const waiting = id => (S.staff.list.requests || []).filter(r => r.type === "restock" && r.product === id && r.status === "new").length;
  const low = new Set(S.staff.list.low || []);
  return list.length ? list.map(p => `<div class="stock-row${p.out ? " out" : low.has(p.id) ? " low" : ""}"><span><b>${esc(p.name)}</b>${!p.out && low.has(p.id) ? ` <span class="tag warn">Running low</span>` : ""}<span class="small muted">${esc(p.pack)} · ${esc(dept(p.dept).short)}${waiting(p.id) ? ` · <b>${waiting(p.id)} waiting</b>` : ""}</span></span>
    ${p.outInData ? `<span class="small muted">Out in js/data.js</span>` : `<span class="stock-btns">${p.out ? "" : `<button class="btn btn-sm btn-ghost" type="button" data-low="${esc(p.id)}" data-on="${low.has(p.id) ? "" : "1"}">${low.has(p.id) ? "Not low" : "Running low"}</button>`}<button class="btn btn-sm ${p.out ? "btn-primary" : "btn-ghost"}" type="button" data-stock="${esc(p.id)}" data-out="${p.out ? "" : "1"}">${p.out ? "Mark back in stock" : "Mark out of stock"}</button></span>`}</div>`).join("")
    : `<p class="muted small">No products match.</p>`;
}
function stockPanel() {
  return `<section class="panel stock"><div class="stock-head"><div><h2 class="h3">Stock</h2><p class="small muted">Out-of-stock products stay on the shop but can't be ordered. When you mark one back in stock, customers who asked by email are told automatically; phone requests stay under Messages for you to call.</p></div>
    <label for="stockq" class="sr">Search products</label><input id="stockq" type="search" placeholder="Search products" value="${esc(S.staff.stockQ || "")}" autocomplete="off"></div>
    <div id="stocklist">${stockRows()}</div></section>`;
}
async function setStock(id, out, btn) {
  btn.disabled = true;
  try {
    const r = DEMO ? { out: P.filter(p => p.id === id ? out : p.out && !p.outInData).map(p => p.id), told: 0 } : await call("staff/orders", { method: "POST", body: { action: "stock", id, out, by: S.staff.name }, token: S.staff.token });
    applyStock(r.out); if (S.staff.list) S.staff.list.out = r.out;
    toast(out ? `${prod(id).name} marked out of stock.` : `${prod(id).name} is back in stock${r.told ? `. ${r.told} customer${r.told === 1 ? "" : "s"} emailed` : ""}.`);
    if (!out && r.told) await loadDesk(true);
  } catch (e) { if (e.status === 401) return signOut(); toast(e.message); }
  render();
}
async function testEmail(btn) {
  btn.disabled = true;
  try {
    const r = DEMO ? { ok: true, to: "you@…", from: "demo" } : await call("staff/orders", { method: "POST", body: { action: "test-email" }, token: S.staff.token });
    S.staff.mail = r.ok ? `Test email sent to ${r.to} from ${r.from}. If it doesn't arrive within a few minutes, check spam, then Resend → Emails.` : `Test email NOT sent: ${r.why}. Sender: ${r.from || "not set"}.`;
  } catch (e) { if (e.status === 401) return signOut(); S.staff.mail = e.message; }
  btn.disabled = false; render();
}
async function markRequest(id, status) {
  try {
    if (DEMO) { const r = S.staff.list.requests.find(x => x.id === id); if (r) { r.status = status; r.handledBy = status === "done" ? S.staff.name : ""; } }
    else await call("staff/orders", { method: "POST", body: { id, status, by: S.staff.name }, token: S.staff.token });
    toast(status === "done" ? "Marked as handled." : "Marked as new."); await loadDesk(true);
  } catch (e) { if (e.status === 401) signOut(); else toast(e.message); }
  render();
}

/* ---------- Events ---------- */
document.addEventListener("click", e => {
  const sq = e.target.closest("a[data-sgq]");
  if (sq) { e.preventDefault(); closeSuggest(); doSearch(sq.dataset.sgq); $("#q").blur(); return; }
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
  if (t.id === "staff-signout") { if (S.mode === "rider") riderSignOut(); else signOut(); return; }
  if ("app" in d) { toast("The Synako app is coming soon. You can order on this website from any phone in the meantime."); return; }
  if (d.tab) { S.tab = d.tab; render(); const nt = $(`#tab-${d.tab}`); if (nt) nt.focus(); return; }
  if (d.add) { addToCart(d.add, d.withqty ? S.qty : 1, d.withqty ? S.unit : "1"); return; }
  if (d.qty) { const p = prod(S.product); S.qty = Math.max(1, Math.min(PR.maxQty(p, PR.unitOf(p, S.unit) || p.units[0]), S.qty + Number(d.qty))); $("#qty-val").textContent = S.qty; $("#buy-total").innerHTML = buyTotal(p); return; }
  if (d.lineqty) { const l = S.cart.find(x => lineKey(x) === d.lineqty); if (l) { const p = prod(l.id); l.q = Math.max(1, Math.min(PR.maxQty(p, PR.unitOf(p, l.u)), l.q + Number(d.d))); saveCart(); } render(); return; }
  if (d.remove) { S.cart = S.cart.filter(x => lineKey(x) !== d.remove); saveCart(); render(); toast("Removed from your basket."); return; }
  if ("share" in d) { shareProduct(); return; }
  if ("clearSeen" in d) { S.seen = []; store.set("synako.seen", []); render(); return; }
  if ("reorder" in d) { reorder(); return; }
  if ("csv" in d) { downloadCsv(); return; }
  if ("print" in d) { window.print(); return; }
  if ("receipt" in d) { if (S.track) downloadReceipt(S.track, t); return; }
  if ("dreceipt" in d) { if (S.staff.detail) downloadReceipt(S.staff.detail, t); return; }
  if (d.req) { markRequest(d.req, d.st); return; }
  if ("testmail" in d) { testEmail(t); return; }
  if ("promoRemove" in d) { S.form.promo = ""; render(); return; }
  if (d.emfix) { const i = $("#em"); i.value = d.emfix; showEmailFix(); i.focus(); return; }
  if (d.stock) { setStock(d.stock, !!d.out, t); return; }
  if (d.low) { setLowStock(d.low, !!d.on, t); return; }
  if (d.sview || "shf" in d || "pof" in d) { // supply views, filters and pipeline stages
    const st = S.staff; if (d.sview) { st.sview = d.sview; st.editSup = null; }
    if ("shf" in d) st.shf = d.shf; if ("pof" in d) st.pof = d.pof;
    render(); if (d.sview && t.closest(".sup-hero, .ov-field")) { const p = $("#sv-panel"); if (p) p.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } return;
  }
  if (d.shsort) { const st = S.staff, cur = st.shsort || {}; st.shsort = { k: d.shsort, dir: cur.k === d.shsort ? -cur.dir : (d.shsort === "name" || d.shsort === "state" ? 1 : -1) }; render(); const b = document.querySelector(`[data-shsort="${d.shsort}"]`); if (b) b.focus(); return; }
  if ("pocsv" in d) { poCsv(); return; }
  if (d.orderfrom) { const st = S.staff; st.poSup = d.orderfrom; st.sview = "short"; st.shf = "open"; render(); toast(`Tick the items to order from ${((st.supply.suppliers || []).find(w => w.id === d.orderfrom) || {}).name}.`); return; }
  if ("pocreate" in d) { createPO(t); return; }
  if (d.poopen) { S.staff.openPo = S.staff.openPo === d.poopen ? null : d.poopen; render(); return; }
  if (d.posend) { poAction(d.posend === "copy" ? null : "send", { via: d.posend }, t); return; }
  if (d.poact) { if (d.poact !== "cancel" || confirm("Cancel this purchase order?")) poAction(d.poact, {}, t); return; }
  if ("podate" in d) { poAction("", { expected: ($("#po-date") || {}).value || "" }, t); return; }
  if (d.supedit !== undefined) { S.staff.editSup = d.supedit || "new"; S.staff.sview = "suppliers"; render.fresh = true; render(); const f = $("#sup-name"); if (f) f.focus(); return; }
  if (d.supdel) { if (confirm("Remove this wholesaler from your list?")) supplierCall({ action: "supplier-delete", id: d.supdel }, t, "Wholesaler removed."); return; }
  if ("supcancel" in d) { S.staff.editSup = null; render(); return; }
  if ("shall" in d) { const sh = (S.staff.supply || {}).shortages || []; const sel = S.staff.shsel || (S.staff.shsel = {}); const all = sh.filter(x => !x.onOrder.length).every(x => sel[x.id]); sh.filter(x => !x.onOrder.length).forEach(x => { sel[x.id] = !all; }); render(); return; }
  if (d.age === "yes") { S.age18 = true; store.set("synako.age18", true); render(); return; }
  if ("rxreq" in d) { S.rxRequest = true; S.step = 1; go("/checkout"); toast("Prescription request started."); return; }
  if ("rxreqRemove" in d) { S.rxRequest = false; render(); return; }
  if ("clear" in d) { S.q = ""; $("#q").value = ""; render(); return; }
  if (d.step) { saveForm(); S.step = Number(d.step); S.error = ""; render(true); return; }
  if (d.pay) { startPayment(d.pay); return; }
  if (d.rtake) { riderTake(d.rtake, t); return; }
  if ("remind" in d) { sendReminders(t); return; }
  if ("qclear" in d) { Object.assign(S.staff, { q: "", speed: "", status: "" }); render(); return; }
  if ("sound" in d) { store.set("synako.sound", !soundOn()); if (soundOn()) chime(); render(); return; }
  if ("keys" in d) { S.staff.keys = !S.staff.keys; render(); return; }
  if ("deskback" in d) { S.staff.sel = null; S.staff.detail = null; render(); return; }
  if (d.dtab && "dstatus" in d) { S.staff.tab = d.dtab; S.staff.status = d.dstatus; S.staff.sel = null; S.staff.detail = null; render(); loadDesk(true); return; }
  if ("cmdk" in d) { cmdkOpen(); return; }
  if (d.openorder) { openOrder(d.openorder); return; }
  if (d.dtab && "dstatus" in d && !d.dstatus) { goDesk(d.dtab, d.sv ? { sview: d.sv } : {}); return; }
  if (d.dtab && !("dstatus" in d)) { goDesk(d.dtab); return; }
  if (d.dtab) { S.staff.tab = d.dtab; S.staff.status = ""; S.staff.sel = null; S.staff.detail = null; render(); loadDesk(true); return; }
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
  if (t.id === "sh-all") { const st = S.staff, sel = st.shsel || (st.shsel = {}), q = norm(st.shq || ""), f = st.shf || ""; (st.supply.shortages || []).filter(x => (!f || (f === "open" ? !x.onOrder.length : x.state === f)) && (!q || norm(x.name + " " + x.pack).includes(q))).forEach(x => { sel[x.id] = t.checked; }); render(); return; }
  if (t.id === "po-sup") { S.staff.poSup = t.value; render(); return; }
  if (t.dataset && t.dataset.shsel) { const sel = S.staff.shsel || (S.staff.shsel = {}); sel[t.dataset.shsel] = t.checked; render(); return; }
  if (t.dataset && t.dataset.pack) {
    const id = t.dataset.pack, n = Number(t.dataset.n), p = S.staff.packed || (S.staff.packed = {}), l = p[id] || (p[id] = []);
    if (t.checked && !l.includes(n)) l.push(n); else if (!t.checked) p[id] = l.filter(x => x !== n);
    render.fresh = true; render(); const el = document.querySelector(`[data-pack="${id}"][data-n="${n}"]`); if (el) el.focus(); return;
  }
  if (["desksort", "deskspeed", "deskstatus"].includes(t.id)) { S.staff[{ desksort: "sort", deskspeed: "speed", deskstatus: "status" }[t.id]] = t.value; refreshQueue(); return; }
  if (t.name === "unit" && S.view === "product") { S.unit = t.value; S.qty = 1; render(); const el = document.querySelector(`input[name=unit][value="${t.value}"]`); if (el) el.focus(); return; }
  if (t.id === "st" || t.name === "speed") { saveForm(); render(); const el = $(t.id === "st" ? "#st" : `#sp-${S.form.speed}`); if (el) el.focus(); return; }
  if (t.id === "city" && S.view === "checkout") { // 30-minute delivery depends on the town: refresh the options, keeping the cursor where it went
    setTimeout(() => { const next = document.activeElement && document.activeElement.id; saveForm(); render(); const el = next && document.getElementById(next); if (el) el.focus(); }, 0); return; }
  if (t.id === "rxfile" && t.files[0]) {
    const status = $("#rxstatus"); status.innerHTML = `<span class="tag otc">Preparing ${esc(t.files[0].name)}…</span>`;
    try { S.form.rxfile = await prepFile(t.files[0]); status.innerHTML = `<span class="tag ok">Attached: ${esc(S.form.rxfile.name)}</span>`; t.required = false; t.setCustomValidity(""); }
    catch (err) { S.form.rxfile = null; t.value = ""; status.innerHTML = `<span class="tag bad">${esc(err.message)}</span>`; }
  }
});
const wide = window.matchMedia("(min-width: 1001px)");
if (wide.addEventListener) wide.addEventListener("change", m => { if (m.matches) closeDrawer(true); });

async function startPayment(id) {
  if (!paymentsOn()) await checkLive(); // the page may have loaded before payments were switched on
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
  const code = (($("#acode") || {}).value || "").trim();
  if (action === "delivered" && o.deliveryCode && !code && !note.trim()) { $("#acode").focus(); toast("Enter the customer's delivery code, or add a note saying why there isn't one."); return; }
  const b = { id: o.id, action, note: note.trim(), by: st.name, code, rider: (($("#arider") || {}).value || "").trim() };
  if (action === "approve" && $("#aprice")) { b.price = $("#aprice").value; b.itemsText = $("#aitems").value; }
  S.busy = true; render();
  try { const r = await api.staffAct(st.token, b); st.detail = r.order; render.fresh = true; toast({ approve: "Approved. The customer can now pay.", info: "Request sent to the customer.", reject: "Marked as not approved.", packed: "Marked as packed.", dispatched: "Marked out for delivery.", delivered: "Marked as delivered.", cancel: "Order cancelled.", resume: "Back in review." }[action]); await loadDesk(true); }
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
    try { const { token } = await api.staffLogin(f.spw.value); S.staff.token = token; S.staff.err = ""; store.sset("synako.staff", token); render.fresh = true; render(); loadDesk(); }
    catch (er) { S.staff.err = er.message; render(); }
    return;
  }
  if (f.id === "supform") {
    if (!f.reportValidity()) return;
    const v = id => (f.querySelector("#" + id) || {}).value || "";
    await supplierCall({ action: "supplier-save", supplier: { id: S.staff.editSup === "new" ? "" : S.staff.editSup, name: v("sup-name"), contact: v("sup-contact"), phone: v("sup-phone"), whatsapp: v("sup-wa"), email: v("sup-email"), leadDays: v("sup-lead"), notes: v("sup-notes") } }, f.querySelector("[type=submit]"), "Wholesaler saved.", true);
    return;
  }
  if (f.id === "riderform") {
    if (!f.reportValidity()) return;
    S.rider.name = f.rname.value.trim(); store.set("synako.riderName", S.rider.name);
    try { const { token } = await api.staffLogin(f.rpw.value, "rider"); S.rider.token = token; S.rider.err = ""; store.sset("synako.rider", token); render.fresh = true; render(); loadRider(); }
    catch (er) { S.rider.err = er.message; render(); }
    return;
  }
  if (f.dataset.rdone) {
    const id = f.dataset.rdone, code = (f.querySelector("input") || {}).value || "", btn = f.querySelector("button");
    if (!/^\d{4}$/.test(code.trim())) { toast("Enter the customer's 4-digit delivery code."); return; }
    btn.disabled = true;
    try { const r = await api.riderAct(S.rider.token, { action: "rider-delivered", id, code: code.trim(), by: S.rider.name }); S.rider.list = r.deliveries; toast(`${id} delivered. Well done!`); render.fresh = true; render(); }
    catch (er) { if (er.status === 401) riderSignOut(); else toast(er.message); btn.disabled = false; }
    return;
  }
  if (f.id === "promoform") { S.form.promo = f.promo.value.trim().toUpperCase(); render(); const q = quoteNow(); toast(q.promo ? `${q.promo.code} applied: ${q.promo.label}.` : q.promoError || "Enter a code."); return; }
  if (f.id === "restockform") {
    if (!f.reportValidity()) return;
    const data = Object.fromEntries(new FormData(f).entries()); data.type = "restock";
    const btn = f.querySelector("[type=submit]"); btn.disabled = true;
    try { await api.request(data); f.reset(); toast("Thanks. We'll let you know as soon as it's back in stock."); }
    catch (er) { toast(er.message); }
    btn.disabled = false; return;
  }
  if (["contactform", "apptform", "careersform", "tradeform"].includes(f.id)) {
    if (!f.reportValidity()) return;
    if (f.id === "apptform") { const day = new Date(f.date.value + "T12:00:00").getDay(); if (!H.open[day]) { f.date.setCustomValidity("We're closed that day. Please choose Monday to Saturday."); f.reportValidity(); f.date.setCustomValidity(""); return; } }
    const data = Object.fromEntries(new FormData(f).entries());
    data.type = { contactform: "message", apptform: "appointment", careersform: "careers", tradeform: "trade" }[f.id];
    const btn = f.querySelector("[type=submit]"); btn.disabled = true;
    try { await api.request(data); f.reset(); toast({ message: "Thanks. A pharmacist will reply shortly.", appointment: "Thanks. We'll call you to confirm your appointment.", careers: "Thanks. We'll be in touch when a role opens.", trade: "Thanks. We'll send your quote within one working day." }[data.type]); }
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
    delivery: { state: F.state, city: F.city, addr: F.addr, landmark: F.landmark, note: F.note, speed: F.speed }, promo: F.promo || "",
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

checkLive().then(() => { applyStock(LIVE.out); render(); });
renderShell();
try { const q0 = new URLSearchParams(location.search).get("q"); if (q0) { S.q = q0.slice(0, 80); $("#q").value = S.q; } } catch (e) { /* no query */ }
go(MEMORY ? "/" : location.pathname, { replace: true });
})();

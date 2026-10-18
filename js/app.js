/* Synako Pharmacy — front-end prototype.
   Everything runs in the browser; no data is sent anywhere. The real build will replace
   the in-memory state below with accounts, a database, payments and the PCN NEPP link. */
(function () {
"use strict";

/* ---------- Images exported from Figma ----------
   Drop the exported files at these paths. Until a file exists, a drawn placeholder shows instead. */
const IMG = {
  heroBg: "assets/hero-bg.jpg",                 // Figma: header pic / Rectangle 30 (pharmacy shelves)
  pharmacistMale: "assets/pharmacist-male.png", // Figma: header pic / Rectangle 29 (male pharmacist)
  pharmacistFemale: "assets/pharmacist-female.png", // Figma: Chat / Rectangle 31
  delivery: "assets/delivery.png"               // Figma: Delivery / Rectangle 31
};

const NGN = n => "₦" + Math.round(n).toLocaleString("en-NG");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = s => document.querySelector(s);

const CATS = [
  { id: "body", name: "Body care" },
  { id: "family", name: "Family care" },
  { id: "vitamins", name: "Vitamins" },
  { id: "devices", name: "Health devices" },
  { id: "pain", name: "Pain & fever" },
  { id: "malaria", name: "Malaria" },
  { id: "rx", name: "Prescription", rx: true }
];
const TABS = ["body", "family", "vitamins", "devices"];

/* Products. Brands match the Figma design; prices are samples in Naira.
   Lyrica (pregabalin) from the Figma design is left out: controlled medicines can't be sold online. */
const P = [
  { id: "wellman", name: "WELLMAN: Health & vitality Original", brand: "VITABIOTICS", pack: "30 tablets", cat: "vitamins", type: "otc", price: 9500, was: 11000, c: "#1F4F9A", pop: 1, tile: 1,
    use: "Daily multinutrient formulated for men.", how: "One tablet a day with your main meal.", warn: "Do not exceed the stated dose. Food supplements are not a substitute for a varied diet." },
  { id: "omron", name: "EVOLV: Digital BP Monitor", brand: "OMRON", pack: "1 device", cat: "devices", type: "otc", price: 68000, was: 75000, c: "#1B2A44", pop: 1, dev: 1,
    use: "Upper-arm blood pressure monitor for home use.", how: "Sit quietly for 5 minutes, then measure on a bare upper arm at heart level.", warn: "Share your readings with your doctor or pharmacist. Don't change any medicine based on one reading." },
  { id: "immunace", name: "IMMUNACE: Immune support Original", brand: "VITABIOTICS", pack: "30 tablets", cat: "vitamins", type: "otc", price: 8800, was: 9900, c: "#C7742C", pop: 1, tile: 1,
    use: "Multinutrient with vitamins and minerals that support normal immune function.", how: "One tablet a day with your main meal.", warn: "Do not exceed the stated dose." },
  { id: "para", name: "Paracetamol 500mg tablets", brand: "Synako pharmacy range", pack: "96 tablets", cat: "pain", type: "otc", price: 1200, c: "#3362AB", pop: 1,
    use: "Relief of mild to moderate pain and fever.", how: "Take the dose printed on the pack for your age, at least 4 hours apart.", warn: "Don't take with other products that contain paracetamol. Ask our pharmacist first if you have liver problems." },
  { id: "mrdt", name: "Malaria rapid diagnostic test", brand: "Synako pharmacy range", pack: "1 test kit", cat: "malaria", type: "otc", price: 2500, c: "#C94D3F", pop: 1, dev: 1,
    use: "Finger-prick test that shows whether malaria parasites are present.", how: "Follow the leaflet step by step and read the result in the time window shown.", warn: "A negative result doesn't rule out every illness. If you still feel unwell, see a doctor." },
  { id: "secure", name: "SECURE: Women's multivitamin", brand: "VITABIOTICS", pack: "30 tablets", cat: "vitamins", type: "otc", price: 8600, c: "#7A4FA0", pop: 1,
    use: "Daily multinutrient formulated for women.", how: "One tablet a day with your main meal.", warn: "Ask our pharmacist if you are pregnant or take other supplements." },
  { id: "pears", name: "Pears Pure & Gentle soap", brand: "PEARS", pack: "125 g bar", cat: "body", type: "otc", price: 1300, c: "#D9792B", tile: 1,
    use: "Gentle transparent glycerin soap for everyday washing.", how: "Lather with water and rinse.", warn: "For external use only." },
  { id: "nivea", name: "Nivea Cocoa Butter body lotion", brand: "NIVEA", pack: "400 ml", cat: "body", type: "otc", price: 5200, c: "#B9893E", tile: 1,
    use: "Moisturising body lotion for dry skin.", how: "Apply to clean skin daily.", warn: "For external use only." },
  { id: "aloe", name: "Aloe vera soothing gel", brand: "Synako pharmacy range", pack: "200 ml", cat: "body", type: "otc", price: 3400, c: "#5E9E4A", tile: 1,
    use: "Cooling gel for dry or sun-exposed skin.", how: "Apply a thin layer as needed.", warn: "Stop using if irritation occurs." },
  { id: "nappy", name: "Zinc oxide nappy cream", brand: "Synako pharmacy range", pack: "50 g", cat: "family", type: "otc", price: 1800, c: "#7A9CCB", tile: 1,
    use: "Soothes and protects skin against nappy rash.", how: "Apply a thin layer at each nappy change.", warn: "Ask our pharmacist if the rash gets worse or lasts more than a few days." },
  { id: "ors", name: "Oral rehydration salts", brand: "Synako pharmacy range", pack: "10 sachets", cat: "family", type: "otc", price: 1500, c: "#2E9E8F", tile: 1,
    use: "Replaces fluids and salts lost through diarrhoea or vomiting.", how: "Mix one sachet with the exact amount of clean water on the pack.", warn: "Get medical help quickly for babies, older adults, or if symptoms last more than 2 days." },
  { id: "thermo", name: "Digital thermometer", brand: "Synako pharmacy range", pack: "1 device", cat: "devices", type: "otc", price: 3200, c: "#3362AB", dev: 1, tile: 1,
    use: "Measures body temperature under the arm or tongue.", how: "Follow the leaflet; clean the tip before and after use.", warn: "For babies under 3 months with a high temperature, see a doctor straight away." },
  { id: "amlo", name: "Amlodipine 5mg tablets", brand: "Generic", pack: "28 tablets", cat: "rx", type: "rx", price: 2900, c: "#6B4FA0",
    use: "Prescribed for high blood pressure and some types of chest pain.", how: "Take exactly as your prescriber directs.", warn: "Prescription only. Our pharmacist checks your prescription before supply." },
  { id: "metf", name: "Metformin 500mg tablets", brand: "Generic", pack: "56 tablets", cat: "rx", type: "rx", price: 2400, c: "#2F7A8C",
    use: "Prescribed to control blood sugar in type 2 diabetes.", how: "Take exactly as your prescriber directs, usually with meals.", warn: "Prescription only. Our pharmacist checks your prescription before supply." },
  { id: "amox", name: "Amoxicillin 500mg capsules", brand: "Generic", pack: "21 capsules", cat: "rx", type: "rx", price: 3200, c: "#A0522D",
    use: "Antibiotic prescribed for certain bacterial infections.", how: "Take the full course exactly as prescribed.", warn: "Prescription only. Tell us about any penicillin allergy." },
  { id: "al", name: "Artemether / lumefantrine 20/120mg", brand: "Generic", pack: "24 tablets", cat: "malaria", type: "rx", price: 2600, c: "#C24E2B",
    use: "Treatment for uncomplicated malaria.", how: "Take exactly as your prescriber directs, with food.", warn: "Marked prescription-only here; your superintendent pharmacist should confirm the classification." }
];
P.forEach(p => { p.img = "assets/products/" + p.id + ".png"; });

const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT – Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

const now = () => new Date();
const ago = m => new Date(Date.now() - m * 60000);
const stamp = d => d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const prod = id => P.find(p => p.id === id);

const S = {
  mode: "shop", view: "home", cat: "all", tab: "body", q: "", product: null, qty: 1,
  cart: [], rxRequest: false, step: 1, form: {}, orders: [], trackId: null, legal: "privacy", sel: 0,
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

/* ---------- Small pieces ---------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
const photo = src => `<img src="${src}" alt="" loading="lazy" data-swap>`;
const pack = p => `<div class="pack${p.dev ? " dev" : ""}" style="--c:${p.c}" aria-hidden="true"><i>${esc(p.name)}</i><small>${esc(p.pack)}</small></div>`;
const tag = p => p.type === "rx" ? `<span class="tag rx">Prescription only</span>` : `<span class="tag otc">Pharmacy</span>`;

/* Drawn stand-in shown until the Figma pharmacist photos are added */
function personSVG(kind) {
  const hair = kind === "female"
    ? `<path d="M112 128c0-44 26-74 58-74s58 30 58 74c0 30-6 56-14 72l-8-70c-8-18-22-26-36-26s-28 8-36 26l-8 70c-8-16-14-42-14-72z" fill="#9FB3D1"/>`
    : "";
  return `<svg viewBox="0 0 340 420" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Pharmacist photo placeholder">
    ${hair}
    <ellipse cx="170" cy="138" rx="52" ry="62" fill="#B8C8E0"/>
    <path d="M148 186h44v46h-44z" fill="#B8C8E0"/>
    <path d="M24 420c4-96 54-160 146-160s142 64 146 160z" fill="#FFFFFF" stroke="#CACDD8" stroke-width="2"/>
    <path d="M136 262l34 74 34-74c-10-4-22-6-34-6s-24 2-34 6z" fill="#3362AB"/>
    <path d="M136 262c-10 44-6 100 4 158M204 262c10 44 6 100-4 158" stroke="#CACDD8" stroke-width="2" fill="none"/>
    <rect x="226" y="322" width="38" height="22" rx="3" fill="#3362AB"/>
    <text x="245" y="337" font-size="10" text-anchor="middle" fill="#fff" font-family="DM Sans, sans-serif" font-weight="700">Px</text>
  </svg>`;
}

function card(p) {
  return `<article class="pcard">
    <span class="flag${p.type === "rx" ? " rx" : ""}">${p.type === "rx" ? "Prescription" : "In stock"}</span>
    <div class="box">
      <button class="shot" type="button" data-product="${p.id}" aria-label="View ${esc(p.name)}">${pack(p)}${photo(p.img)}</button>
      <button class="name" type="button" data-product="${p.id}">${esc(p.name)}</button>
      <div class="brand">${esc(p.brand)}</div>
      <div class="prices">${p.was ? `<div class="was num">${NGN(p.was)}</div>` : ""}<div class="price">${NGN(p.price)}</div><div class="samp">Sample price</div></div>
      <button class="add${p.type === "rx" ? " rx" : ""}" type="button" data-add="${p.id}">${p.type === "rx" ? "Add · prescription" : "Add to basket"}</button>
    </div>
  </article>`;
}

/* ---------- Home (follows the Figma "Main Web" frame top to bottom) ---------- */
function vHome() {
  const popular = P.filter(p => p.pop);
  const tiles = P.filter(p => p.cat === S.tab).slice(0, 6);
  return `
  <section class="hero" id="hero">
    <div class="wrap">
      <div class="copy">
        <h1>Your Pathway to<br>Health and Wellness</h1>
        <p class="lede">Empowering you to live your healthiest life, with genuine NAFDAC-registered medicines checked by our pharmacists and delivered to your door.</p>
        <div class="ctas">
          <button class="pill pill-solid pill-lg" type="button" data-cat="all">Shop health products</button>
          <button class="pill pill-rx pill-lg" type="button" data-go="rx">Send a prescription</button>
        </div>
        <p class="note">Same-day delivery in <span class="ph">your city</span> for orders before <span class="ph">2pm</span>. For adults 18 and over.</p>
      </div>
      <figure class="pharmacist" style="margin:0">
        <div class="fallback">${personSVG("male")}</div>
        ${photo(IMG.pharmacistMale)}
        <figcaption class="card-tag"><b>Pharmacist-checked</b><span class="muted">Every order is reviewed by a registered Synako pharmacist.</span></figcaption>
      </figure>
    </div>
  </section>

  <div class="trust"><div class="wrap">
    <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg><span><b>Licensed by PCN</b><span class="muted small">E-pharmacy licence <span class="ph">no.</span></span></span></div>
    <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 14l2.5 2.5L16 11"/></svg><span><b>Prescriptions checked</b><span class="muted small">Before anything is charged</span></span></div>
    <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2M12 11v5M9.5 13.5h5"/></svg><span><b>NAFDAC-registered</b><span class="muted small">From approved suppliers</span></span></div>
    <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg><span><b>Delivery in Nigeria</b><span class="muted small">Tracked to your door</span></span></div>
  </div></div>

  <section class="section"><div class="wrap">
    <h2 class="stitle">Most Popular Products</h2>
    <p class="ssub">Prices shown are samples until Synako's stock list is loaded.</p>
    <div class="cards">${popular.map(card).join("")}</div>
    <div style="margin-top:3rem" class="strip">
      <span class="tagx">Prescription medicines</span><span class="sep" aria-hidden="true"></span>
      <span>Upload your prescription at checkout. You pay only after our pharmacist approves it.</span>
      <button class="linkbtn" type="button" data-go="rx">How it works</button>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap pair">
    <div class="feature">
      <div>
        <h2>Talk to a<br>Pharmacist</h2>
        <p>Don't self medicate. Talk to an expert. Reach a Synako pharmacist in <em><span class="ph">under 5 minutes</span></em> during opening hours.</p>
        <button class="btn-blue" type="button" data-go="legal" data-doc="contact">Get Started</button>
      </div>
      <div class="photo"><div class="fallback">${personSVG("female")}</div>${photo(IMG.pharmacistFemale)}</div>
    </div>
    <div class="feature">
      <div>
        <h2>Home delivery<br>in <span class="ph">30 minutes</span></h2>
        <p>Tired of waiting in a queue? Too weak to go down to the store and buy medicines? We bring them to you.</p>
        <button class="btn-blue" type="button" data-cat="all">Order Now</button>
      </div>
      <div class="photo"><div class="fallback" style="place-items:center;color:#3362AB"><svg viewBox="0 0 24 24" width="40%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>${photo(IMG.delivery)}</div>
    </div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <h2 class="stitle">Browse medicines &amp; health products</h2>
    <div class="tabs" role="tablist" aria-label="Product categories" style="margin-top:2rem">
      ${TABS.map(id => `<button type="button" role="tab" data-tab="${id}" aria-selected="${S.tab === id}">${CATS.find(c => c.id === id).name}</button>`).join("")}
    </div>
    <div class="tiles" role="tabpanel">
      ${tiles.map(p => `<button class="tile" type="button" data-product="${p.id}" aria-label="${esc(p.name)}">${pack(p)}${photo(p.img)}<span class="cap"><span>${esc(p.name)}</span><b class="num">${NGN(p.price)}</b></span></button>`).join("")}
    </div>
    <div class="center"><button class="btn-blue" type="button" data-cat="${S.tab}">View More</button></div>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">
    <h2 class="stitle">How prescription orders work</h2>
    <p class="ssub">Required by Nigeria's Electronic Pharmacy Regulations 2026, and it keeps you safe.</p>
    <div class="band">
      <div class="inner">
        <div class="steps">
          <div class="step"><span class="n">1</span><h3>Upload your prescription</h3><p>A photo or scan from a licensed prescriber, with their Nigerian clinic address, registration number and signature.</p></div>
          <div class="step"><span class="n">2</span><h3>Our pharmacist checks it</h3><p>We confirm the prescriber, the date (valid for 6 months) and that the medicine is right for you.</p></div>
          <div class="step"><span class="n">3</span><h3>You pay once approved</h3><p>Nothing is charged until your prescription is approved. Card, transfer or USSD.</p></div>
          <div class="step"><span class="n">4</span><h3>We pack and deliver</h3><p>Sealed packaging and tracked delivery, with a pharmacist on call for questions.</p></div>
        </div>
        <div class="foot"><button class="pill pill-rx pill-lg" type="button" data-go="rx">Start a prescription order</button></div>
      </div>
      <p class="below">Customer reviews will appear here once real customers have ordered.</p>
    </div>
  </div></section>

  <section class="section"><div class="wrap mobile">
    <div>
      <h2>Try it now<br>on mobile</h2>
      <p>The Synako site works on any phone, so you can order, upload a prescription or track a delivery wherever you are. Our pharmacists are available during opening hours.</p>
      <div class="stores">
        <button class="store" type="button" disabled><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6s1.7-.8 3.2-.8 1.9.8 3.2.8 2.2-1.3 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.2-4.2zM13.9 5c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></svg><span><small>App coming soon</small><b>App Store</b></span></button>
        <button class="store alt" type="button" disabled><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 2.6v18.8c0 .5.5.8.9.6l10.6-10L5 1.9c-.5-.2-1 .2-1 .7zm12.5 8.4l2.7-2.6-12-6.9 9.3 9.5zm0 2l-9.3 9.5 12-6.9zm3.6-3.5L17.5 12l2.6 2.5 2.3-1.3c.8-.5.8-1.5 0-2z"/></svg><span><small>App coming soon</small><b>Google Play</b></span></button>
      </div>
    </div>
    <div class="phone" aria-hidden="true"><div class="scr">
      <div class="tb"></div>
      <div class="hd"><img src="assets/logo.png" alt=""><span>☰</span></div>
      <div class="bd"><h4>Your Pathway to Health and Wellness</h4><span class="b">Shop now</span><div class="row"><span></span><span></span><span></span><span></span></div></div>
    </div></div>
  </div></section>`;
}

/* ---------- Shop ---------- */
function filtered() {
  let list = P.slice();
  if (S.cat !== "all") list = list.filter(p => p.cat === S.cat || (S.cat === "rx" && p.type === "rx"));
  if (S.q) { const q = S.q.toLowerCase(); list = list.filter(p => (p.name + " " + p.brand + " " + p.use + " " + p.cat).toLowerCase().includes(q)); }
  return list;
}
function vShop() {
  const list = filtered();
  const opts = [{ id: "all", name: "All products" }].concat(CATS);
  const count = id => id === "all" ? P.length : P.filter(p => p.cat === id || (id === "rx" && p.type === "rx")).length;
  const title = S.q ? `Results for “${esc(S.q)}”` : esc(opts.find(o => o.id === S.cat).name);
  return `<div class="wrap page-head"><div class="crumbs"><button type="button" data-go="home">Home</button><span>/</span><span>Products</span></div><h1>${title}</h1></div>
  <div class="wrap shop">
    <aside class="filters" aria-label="Categories"><h3>Categories</h3>
      ${opts.map(o => `<button type="button" data-cat="${o.id}" aria-current="${S.cat === o.id}"><span>${o.name}</span><span class="ct">${count(o.id)}</span></button>`).join("")}
    </aside>
    <div style="min-width:0">
      <div class="chips">${opts.map(o => `<button type="button" data-cat="${o.id}" aria-current="${S.cat === o.id}">${o.name}</button>`).join("")}</div>
      <div class="toolbar"><span class="muted small">${list.length} product${list.length === 1 ? "" : "s"}${S.q ? ` · <button class="linkbtn" type="button" data-clear>Clear search</button>` : ""}</span>${S.cat === "rx" ? `<span class="tag rx">Prescription needed at checkout</span>` : ""}</div>
      ${list.length ? `<div class="grid-shop">${list.map(card).join("")}</div>` : `<div class="empty"><p><b>No products match “${esc(S.q)}”.</b></p><p style="margin-top:.4rem">Try a generic name, such as paracetamol, or ask our pharmacist if we stock it.</p></div>`}
    </div>
  </div>`;
}

function vProduct() {
  const p = prod(S.product); if (!p) return vShop();
  const rx = p.type === "rx";
  const cat = CATS.find(c => c.id === p.cat);
  return `<div class="wrap page-head" style="padding-bottom:.5rem"><div class="crumbs"><button type="button" data-go="home">Home</button><span>/</span><button type="button" data-cat="${p.cat}">${cat.name}</button><span>/</span><span>${esc(p.name)}</span></div></div>
  <div class="wrap pdp">
    <div class="visual">${pack(p)}${photo(p.img)}</div>
    <div class="info">
      ${tag(p)}
      <h1>${esc(p.name)}</h1>
      <div class="brand">${esc(p.brand)} · <span class="muted" style="font-weight:400">${esc(p.pack)}</span></div>
      <div>${p.was ? `<span class="muted num" style="text-decoration:line-through;margin-right:.5rem">${NGN(p.was)}</span>` : ""}<span class="price num">${NGN(p.price)}</span> <span class="samp">Sample price</span></div>
      ${rx ? `<div class="notice rx"><b>Prescription required</b><span>Add it to your basket, then upload your prescription at checkout. Our pharmacist checks it before you pay, and we only supply it if the prescription is valid.</span></div>`
           : `<div class="notice info"><b>Pharmacy product</b><span>Our pharmacist may contact you before sending it if they need to check it's right for you.</span></div>`}
      <div class="buy">
        <div class="qty" aria-label="Quantity"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><span class="num" id="qty-val">${S.qty}</span><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div>
        <button class="pill ${rx ? "pill-rx" : "pill-solid"} pill-lg" type="button" data-add="${p.id}" data-withqty="1">${rx ? "Add to basket · prescription needed" : "Add to basket"}</button>
      </div>
      <div class="facts">
        <details open><summary>What it's for</summary><p>${esc(p.use)}</p></details>
        <details><summary>How to use</summary><p>${esc(p.how)} Always read the label and patient leaflet.</p></details>
        <details><summary>Warnings</summary><p>${esc(p.warn)}</p></details>
        <details><summary>Delivery</summary><p>Same-day delivery in <span class="ph">your city</span> for orders before <span class="ph">2pm</span>; other states in <span class="ph">2–4 working days</span>. We deliver within Nigeria only.</p></details>
      </div>
    </div>
  </div>`;
}

/* ---------- Basket & checkout ---------- */
const items = () => S.cart.map(l => Object.assign({}, l, { p: prod(l.id) }));
const hasRx = () => S.rxRequest || S.cart.some(l => prod(l.id).type === "rx");
const sub = () => S.cart.reduce((s, l) => s + prod(l.id).price * l.q, 0);
const delivery = () => (S.cart.length || S.rxRequest) ? (S.form.speed === "sameday" ? 2500 : 1500) : 0;

function summary(cta) {
  return `<aside class="panel summary" aria-label="Order summary">
    <h3>Order summary</h3>
    ${items().map(l => `<div class="r small"><span>${l.q} × ${esc(l.p.name)}</span><span class="num">${NGN(l.p.price * l.q)}</span></div>`).join("")}
    ${S.rxRequest ? `<div class="r small"><span>Prescription items</span><span class="muted">Priced by pharmacist</span></div>` : ""}
    <div class="r"><span>Subtotal</span><span class="num">${NGN(sub())}</span></div>
    <div class="r"><span>Delivery</span><span class="num">${NGN(delivery())}</span></div>
    <div class="r total"><span>Total</span><span class="num">${NGN(sub() + delivery())}${S.rxRequest ? "+" : ""}</span></div>
    ${hasRx() ? `<div class="notice rx small"><b>Pay after approval</b><span>Your order has prescription items, so nothing is charged until our pharmacist approves the prescription.</span></div>` : ""}
    ${cta || ""}
  </aside>`;
}

function vBasket() {
  const list = items();
  if (!list.length && !S.rxRequest) return `<div class="wrap page-head"><h1>Your basket</h1></div>
    <div class="wrap" style="padding-bottom:3rem"><div class="empty"><p><b>Your basket is empty.</b></p><p style="margin:.4rem 0 1rem">Browse products, or send a prescription and we'll prepare it for you.</p>
    <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap"><button class="pill pill-solid" type="button" data-cat="all">Shop products</button><button class="pill pill-rx" type="button" data-go="rx">Send a prescription</button></div></div></div>`;
  return `<div class="wrap page-head"><h1>Your basket</h1></div>
  <div class="wrap two">
    <div class="panel">
      ${list.map(l => `<div class="line">
        <div class="thumb">${pack(l.p)}${photo(l.p.img)}</div>
        <div style="min-width:0"><button class="linkbtn" type="button" data-product="${l.p.id}" style="color:#000;text-align:left">${esc(l.p.name)}</button><div class="muted small">${esc(l.p.pack)}</div><div style="margin-top:.35rem">${tag(l.p)}</div></div>
        <div class="right"><b class="num">${NGN(l.p.price * l.q)}</b>
          <div class="qty"><button type="button" data-lineqty="${l.id}" data-d="-1" aria-label="Decrease">−</button><span class="num">${l.q}</span><button type="button" data-lineqty="${l.id}" data-d="1" aria-label="Increase">+</button></div>
          <button class="rm" type="button" data-remove="${l.id}">Remove</button></div>
      </div>`).join("")}
      ${S.rxRequest ? `<div class="line"><div class="thumb" style="color:var(--rx-fg);font-weight:700;font-size:1.4rem">℞</div><div><b>Prescription request</b><div class="muted small">Our pharmacist will add the medicines on your prescription and confirm the price.</div></div><div class="right"><button class="rm" type="button" data-rxreq-remove>Remove</button></div></div>` : ""}
    </div>
    ${summary(`<button class="pill pill-solid pill-lg" type="button" data-go="checkout" style="width:100%">Go to checkout</button><button class="linkbtn" type="button" data-cat="all" style="justify-self:center">Continue shopping</button>`)}
  </div>`;
}

function stepList() {
  const s = [{ n: 1, l: "Your details" }, { n: 2, l: "Delivery" }];
  if (hasRx()) s.push({ n: 3, l: "Prescription" });
  s.push({ n: 4, l: "Review & pay" });
  return s;
}
function vCheckout() {
  if (!S.cart.length && !S.rxRequest) { S.view = "basket"; return vBasket(); }
  const steps = stepList();
  if (!steps.some(s => s.n === S.step)) S.step = 1;
  const F = S.form, v = k => esc(F[k] || ""), rx = hasRx();
  let body = "";
  if (S.step === 1) body = `<form class="f" id="f1" novalidate>
    <h2>Your details</h2>
    <div class="row2"><label for="fn">Full name<input id="fn" name="name" required value="${v("name")}" autocomplete="name"></label>
    <label for="ph">Phone number<input id="ph" name="phone" type="tel" inputmode="tel" required placeholder="080..." value="${v("phone")}" autocomplete="tel"></label></div>
    <div class="row2"><label for="em">Email<input id="em" name="email" type="email" required value="${v("email")}" autocomplete="email"></label>
    <label for="dob">Date of birth<span class="hint">We supply medicines to adults 18 and over only.</span><input id="dob" name="dob" type="date" required value="${v("dob")}"></label></div>
    <fieldset><legend>Age and identity check</legend>
      <p class="small muted">The regulations require us to confirm you're an adult. In the live site this step runs a quick ID check before your first order.</p>
      <label class="check"><input type="checkbox" id="adult" name="adult" required ${F.adult ? "checked" : ""}><span>I confirm I am 18 or over and the medicines are for me or someone I care for.</span></label>
    </fieldset>
    <label class="check"><input type="checkbox" id="consent" name="consent" required ${F.consent ? "checked" : ""}><span>I agree to Synako processing my health information to supply my order, as set out in the <button class="linkbtn" type="button" data-go="legal" data-doc="privacy">privacy notice</button>.</span></label>
    <div class="actions"><button class="pill pill-ghost" type="button" data-go="basket">Back to basket</button><button class="pill pill-solid" type="submit">Continue to delivery</button></div>
  </form>`;
  if (S.step === 2) body = `<form class="f" id="f2" novalidate>
    <h2>Delivery address</h2><p class="muted small">We deliver within Nigeria only.</p>
    <div class="row2"><label for="st">State<select id="st" name="state" required><option value="">Choose a state</option>${STATES.map(s => `<option ${F.state === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label for="city">City / LGA<input id="city" name="city" required value="${v("city")}"></label></div>
    <label for="addr">Street address<input id="addr" name="addr" required value="${v("addr")}" autocomplete="street-address"></label>
    <label for="lm">Nearest landmark<span class="hint">Helps our rider find you.</span><input id="lm" name="landmark" value="${v("landmark")}"></label>
    <fieldset class="pay"><legend>Delivery speed</legend>
      <label for="sp1"><input type="radio" id="sp1" name="speed" value="standard" ${F.speed !== "sameday" ? "checked" : ""}><span><b>Standard</b> · <span class="ph">2–4 working days</span> · ${NGN(1500)}</span></label>
      <label for="sp2"><input type="radio" id="sp2" name="speed" value="sameday" ${F.speed === "sameday" ? "checked" : ""}><span><b>Same day</b> · <span class="ph">your city</span>, order before <span class="ph">2pm</span> · ${NGN(2500)}</span></label>
    </fieldset>
    <div class="actions"><button class="pill pill-ghost" type="button" data-step="1">Back</button><button class="pill pill-solid" type="submit">${rx ? "Continue to prescription" : "Continue to payment"}</button></div>
  </form>`;
  if (S.step === 3) body = `<form class="f" id="f3" novalidate>
    <h2>Your prescription</h2>
    <div class="notice rx small"><b>What makes a prescription valid</b><span>Issued within the last 6 months by a licensed prescriber, showing their name, signature, registration number, phone number, and a clinic or hospital address in Nigeria.</span></div>
    <div class="drop"><b>Upload a photo or scan</b><span class="muted small">JPG, PNG or PDF. Make sure all four corners are visible.</span><input id="rxfile" name="rxfile" type="file" accept="image/*,.pdf" ${F.rxfile ? "" : "required"}>${F.rxfile ? `<span class="tag ok">Attached: ${esc(F.rxfile)}</span>` : ""}</div>
    <fieldset><legend>Prescriber details, as shown on the prescription</legend>
      <div class="row2"><label for="pn">Prescriber name<input id="pn" name="pname" required value="${v("pname")}"></label>
      <label for="preg">Registration number<span class="hint">For example, their MDCN number.</span><input id="preg" name="preg" required value="${v("preg")}"></label></div>
      <div class="row2"><label for="pph">Prescriber phone<input id="pph" name="pphone" type="tel" required value="${v("pphone")}"></label>
      <label for="pdate">Date issued<input id="pdate" name="pdate" type="date" required value="${v("pdate")}"></label></div>
      <label for="pclinic">Clinic or hospital address in Nigeria<input id="pclinic" name="pclinic" required value="${v("pclinic")}"></label>
    </fieldset>
    <label for="allg">Allergies or other medicines you take<span class="hint">Optional, but it helps our pharmacist.</span><textarea id="allg" name="allergies" rows="2">${v("allergies")}</textarea></label>
    <div class="actions"><button class="pill pill-ghost" type="button" data-step="2">Back</button><button class="pill pill-solid" type="submit">Continue to review</button></div>
  </form>`;
  if (S.step === 4) body = `<form class="f" id="f4" novalidate>
    <h2>Review and ${rx ? "submit" : "pay"}</h2>
    <div class="panel" style="padding:1rem"><dl class="kv">
      <dt>Name</dt><dd>${v("name")}</dd><dt>Phone</dt><dd>${v("phone")}</dd>
      <dt>Deliver to</dt><dd>${v("addr")}, ${v("city")}, ${v("state")}</dd>
      ${rx ? `<dt>Prescription</dt><dd>${v("rxfile") || "Attached"} · ${v("pname")}</dd>` : ""}
    </dl></div>
    <fieldset class="pay"><legend>${rx ? "How you'll pay after approval" : "Payment method"}</legend>
      <label for="pm1"><input type="radio" id="pm1" name="pay" value="card" ${F.pay !== "transfer" && F.pay !== "ussd" ? "checked" : ""}><span><b>Debit card</b> · Verve, Mastercard, Visa</span></label>
      <label for="pm2"><input type="radio" id="pm2" name="pay" value="transfer" ${F.pay === "transfer" ? "checked" : ""}><span><b>Bank transfer</b></span></label>
      <label for="pm3"><input type="radio" id="pm3" name="pay" value="ussd" ${F.pay === "ussd" ? "checked" : ""}><span><b>USSD</b></span></label>
      <p class="small muted">Payments are processed securely by <span class="ph">Paystack or Flutterwave</span>. Synako never sees your full card number.</p>
    </fieldset>
    ${rx ? `<div class="notice rx small"><b>Nothing is charged yet</b><span>We'll send your payment link once our pharmacist approves your prescription, usually within <span class="ph">1 hour</span> during opening hours.</span></div>` : ""}
    <label class="check"><input type="checkbox" id="terms" name="terms" required ${F.terms ? "checked" : ""}><span>I agree to the <button class="linkbtn" type="button" data-go="legal" data-doc="terms">terms of sale</button>.</span></label>
    <div class="actions"><button class="pill pill-ghost" type="button" data-step="${rx ? 3 : 2}">Back</button><button class="pill ${rx ? "pill-rx" : "pill-solid"}" type="submit">${rx ? "Submit for pharmacist review" : `Pay ${NGN(sub() + delivery())}`}</button></div>
    <p class="small muted">Prototype: no payment is taken and nothing is sent.</p>
  </form>`;
  return `<div class="wrap page-head"><h1>Checkout</h1></div>
  <div class="wrap two"><div class="panel">
    <div class="stepper">${steps.map(s => `<button type="button" data-step="${s.n}" ${s.n === S.step ? 'aria-current="step"' : ""} class="${s.n < S.step ? "done" : ""}" ${s.n > S.step ? "disabled" : ""}>${s.l}</button>`).join("")}</div>
    ${body}
  </div>${summary()}</div>`;
}

function vRx() {
  return `<div class="wrap page-head"><div class="crumbs"><button type="button" data-go="home">Home</button><span>/</span><span>Prescriptions</span></div>
    <h1>Send us your prescription</h1><p class="muted" style="max-width:40em;margin-top:.6rem">Upload a valid prescription and our pharmacist will prepare it. You only pay once it's approved.</p></div>
  <div class="wrap two">
    <div style="display:grid;gap:1rem">
      <div class="panel" style="display:grid;gap:.75rem"><h3>Option 1 · You know the medicine</h3><p class="muted small">Find it in the shop, add it to your basket, and upload the prescription at checkout.</p><div><button class="pill pill-solid" type="button" data-cat="rx">Browse prescription medicines</button></div></div>
      <div class="panel" style="display:grid;gap:.75rem"><h3>Option 2 · Just upload it</h3><p class="muted small">Send the prescription as it is. Our pharmacist reads it, adds the medicines, and confirms the price before you pay.</p><div><button class="pill pill-rx" type="button" data-rxreq>Upload a prescription</button></div></div>
      <div class="panel" style="display:grid;gap:.6rem"><h3>What we can't supply online</h3><p class="muted small">Under the Electronic Pharmacy Regulations 2026, controlled medicines and dangerous drugs can't be sold online. If your prescription includes one, our pharmacist will contact you about collecting it in store.</p></div>
    </div>
    <aside class="panel" style="display:grid;gap:.7rem">
      <h3>A valid prescription shows</h3>
      <ul class="small" style="margin:0;padding-left:1.1rem;display:grid;gap:.3rem">
        <li>The prescriber's full name and signature</li><li>Their registration number</li><li>Their phone number</li>
        <li>A clinic or hospital address in Nigeria</li><li>A date within the last 6 months</li><li>The medicine, strength and directions</li>
      </ul>
      <div class="notice info small"><span>We keep a record of every prescription and its review, as the regulations require.</span></div>
    </aside>
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
  return `<div class="wrap page-head"><h1>Track your order</h1><p class="muted" style="margin-top:.4rem">Every step is logged, from prescription to your door.</p></div>
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
      ${!o.sample && o.rx && o.stage === 1 && !rej && !info ? `<div class="notice info small"><span>Waiting for the pharmacist. Switch to <button class="linkbtn" type="button" data-mode="staff">Pharmacist view</button> to review it.</span></div>` : ""}
      <div><h3 style="margin-bottom:.5rem">Order record</h3><div class="audit">${o.log.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>
    </div>
  </div>`;
}

const LEGAL = {
  privacy: ["Privacy notice", "How Synako collects, uses and protects personal and health information under the Nigeria Data Protection Act 2023: what is collected, why, how long it's kept, who it's shared with (delivery partners, payment providers, the PCN's National Electronic Pharmacy Platform), and customers' rights. To be drafted with a data protection adviser."],
  terms: ["Terms of sale", "Pricing, payment, prescription checks, Synako's right to decline supply on clinical grounds, delivery and cancellations. To be drafted with a legal adviser."],
  returns: ["Returns and refunds", "Medicines can't be returned once they've left the pharmacy, for safety reasons, unless they're faulty or the wrong item was sent. Unopened devices and personal care items within a set number of days. Unapproved prescriptions are never charged."],
  delivery: ["Delivery areas and fees", "Which states and cities are covered, same-day cut-off times, fees by area, and how medicines that need cool storage are handled. Delivery within Nigeria only."],
  contact: ["Contact a pharmacist", "Phone and WhatsApp numbers, opening hours and the pharmacy address, shown as plain text customers can copy."],
  licence: ["About Synako & our licences", "Who Synako is, the PCN premises certificate number, the PCN e-pharmacy licence number, the superintendent pharmacist's name and PCN registration number, and the ROPSE emblem linking to the PCN register."],
  cookies: ["Cookies", "Which cookies the site uses and how customers can change their choice."]
};
function vLegal() {
  const d = LEGAL[S.legal] || LEGAL.privacy;
  return `<div class="wrap page-head"><div class="crumbs"><button type="button" data-go="home">Home</button><span>/</span><span>${d[0]}</span></div><h1>${d[0]}</h1></div>
  <div class="wrap" style="padding-bottom:3rem"><div class="panel" style="max-width:720px;display:grid;gap:.8rem"><span class="tag warn">Page to write before launch</span><p>${esc(d[1])}</p></div></div>`;
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
          <label class="check"><input type="checkbox" id="c4" required><span>No item is a controlled medicine or dangerous drug</span></label>
          <label for="rnote">Note to customer or record<textarea id="rnote" rows="2" placeholder="For example: prescription expired, please ask your doctor for a new one."></textarea></label>
        </fieldset>
        ${decided ? `<div class="notice ${r.status === "approved" ? "ok" : "rx"} small"><b>${r.status === "approved" ? "Approved" : r.status === "info" ? "More information requested" : "Rejected"}</b><span>This decision is in the order record.</span></div>`
          : `<div class="actions"><div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="pill pill-bad" type="button" data-decide="rejected">Reject</button><button class="pill pill-ghost" type="button" data-decide="info">Request info</button></div><button class="pill pill-ok" type="button" data-decide="approved">Approve and send payment link</button></div>`}
      </form>
      <div><h3 style="font-size:.95rem;margin-bottom:.5rem">Record</h3><div class="audit">${r.log.slice().reverse().map(l => `<div><span>${stamp(l.t)}</span><b style="font-weight:500">${esc(l.m)}</b></div>`).join("")}</div></div>
    </div>
  </div>`;
}

/* ---------- Render ---------- */
function renderCount() { const n = S.cart.reduce((s, l) => s + l.q, 0) + (S.rxRequest ? 1 : 0); const b = $("#cart-count"); b.textContent = n; b.hidden = !n; }
function loadHeroBg() {
  const h = $("#hero"); if (!h) return;
  const im = new Image();
  im.onload = () => { h.style.setProperty("--hero-bg", `url("${IMG.heroBg}")`); h.classList.add("has-bg"); };
  im.src = IMG.heroBg;
}
function render(scroll) {
  const staff = S.mode === "staff";
  $("#shell-customer").hidden = staff; $("#shell-staff").hidden = !staff;
  $("#mode-shop").setAttribute("aria-pressed", String(!staff)); $("#mode-staff").setAttribute("aria-pressed", String(staff));
  if (staff) $("#staff-view").innerHTML = vStaff();
  else {
    const V = { home: vHome, shop: vShop, product: vProduct, basket: vBasket, checkout: vCheckout, rx: vRx, track: vTrack, legal: vLegal }[S.view] || vHome;
    $("#view").innerHTML = V();
    renderCount();
    if (S.view === "home") loadHeroBg();
    document.querySelectorAll(".nav>button[data-cat],.nav>button[data-go]").forEach(b => b.setAttribute("aria-current", String((b.dataset.cat && S.view === "shop") || (b.dataset.go === S.view && S.view !== "legal"))));
  }
  if (scroll) window.scrollTo(0, 0);
}

/* Real photos replace the drawn placeholders as soon as they load */
document.addEventListener("load", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.parentNode.classList.add("has-img"); }, true);
document.addEventListener("error", e => { const t = e.target; if (t.tagName === "IMG" && t.hasAttribute("data-swap")) t.remove(); }, true);

function addToCart(id, q) {
  const l = S.cart.find(x => x.id === id);
  if (l) l.q = Math.min(10, l.q + q); else S.cart.push({ id, q });
  const p = prod(id);
  toast(p.type === "rx" ? `Added ${p.name}. Upload your prescription at checkout.` : `Added ${p.name} to your basket.`);
  renderCount();
}
function saveForm() {
  const f = document.querySelector("form.f[id^='f']"); if (!f) return;
  new FormData(f).forEach((val, key) => { if (typeof File !== "undefined" && val instanceof File) { if (val.name) S.form[key] = val.name; } else S.form[key] = val; });
  f.querySelectorAll("input[type=checkbox]").forEach(c => { S.form[c.name] = c.checked; });
}

$("#search-toggle").addEventListener("click", () => {
  const bar = $("#searchbar"); bar.hidden = !bar.hidden;
  $("#search-toggle").setAttribute("aria-expanded", String(!bar.hidden));
  if (!bar.hidden) $("#q").focus();
});

document.addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.mode) { S.mode = d.mode; render(true); return; }
  if (d.go) { S.view = d.go; if (d.doc) S.legal = d.doc; render(true); return; }
  if (d.cat) { S.cat = d.cat; S.q = ""; $("#q").value = ""; S.view = "shop"; render(true); return; }
  if (d.tab) { S.tab = d.tab; render(); return; }
  if (d.product) { S.product = d.product; S.qty = 1; S.view = "product"; render(true); return; }
  if (d.add) { addToCart(d.add, d.withqty ? S.qty : 1); return; }
  if (d.qty) { S.qty = Math.max(1, Math.min(10, S.qty + Number(d.qty))); $("#qty-val").textContent = S.qty; return; }
  if (d.lineqty) { const l = S.cart.find(x => x.id === d.lineqty); l.q = Math.max(1, Math.min(10, l.q + Number(d.d))); render(); return; }
  if (d.remove) { S.cart = S.cart.filter(x => x.id !== d.remove); render(); return; }
  if ("rxreq" in d) { S.rxRequest = true; S.step = 1; S.view = "checkout"; render(true); toast("Prescription request started."); return; }
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

document.addEventListener("submit", e => {
  const f = e.target; e.preventDefault();
  if (f.id === "search-form") { S.q = $("#q").value.trim(); S.cat = "all"; S.view = "shop"; render(true); return; }
  if (f.id === "trackform") {
    const id = f.tid.value.trim().toUpperCase();
    if (S.orders.some(o => o.id === id) || id === SAMPLE_ORDER.id) { S.trackId = id; render(); } else toast("We can't find that order number. Check your confirmation message.");
    return;
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
  S.orders.unshift(o); S.trackId = id; S.cart = []; S.rxRequest = false; S.step = 1; S.view = "track";
  render(true);
  toast(rx ? `Order ${id} sent to our pharmacist.` : `Order ${id} placed.`);
});

render();
})();

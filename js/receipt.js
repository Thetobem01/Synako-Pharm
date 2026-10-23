/* Synako Pharmacy — PDF receipts and order summaries.
   Made in the customer's browser from the order on screen: nothing is sent anywhere.
   Uses the PDF standard fonts (Helvetica), so the file is small and opens everywhere. */
(function (root) {
"use strict";

/* Helvetica character widths (1/1000 em) for Windows-1252 codes 32–255 */
const W = { R: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500], B: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,611,278,556,500,1000,556,556,333,1000,667,333,1000,611,611,611,611,278,278,500,500,350,556,1000,333,1000,556,333,944,611,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556] };
const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E,
  0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
function bytesOf(s) {
  const out = [];
  for (const ch of String(s == null ? "" : s)) {
    let c = ch.codePointAt(0);
    if (c === 0x20A6) { out.push(78, 71, 78, 32); continue; }        // ₦ isn't in the standard fonts: write "NGN "
    if (c === 0xA0 || c === 0x202F || c === 0x2009) c = 32;
    else if (c < 32 || (c >= 0x7F && c < 0xA0)) c = 32;
    else if (c > 0xFF) c = CP1252[c] || 63;
    out.push(c);
  }
  return out;
}
const widthOf = (s, f, size) => bytesOf(s).reduce((t, b) => t + (W[f][b - 32] || 556), 0) * size / 1000;
const hex = s => "<" + bytesOf(s).map(b => b.toString(16).padStart(2, "0")).join("") + ">";
const latin1 = s => Uint8Array.from(s, c => c.charCodeAt(0) & 255);
const n2 = v => (Math.round(v * 100) / 100).toString();
function wrap(text, f, size, max) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  words.forEach(w => {
    const t = line ? line + " " + w : w;
    if (widthOf(t, f, size) <= max || !line) line = t; else { lines.push(line); line = w; }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/* ---------- A tiny page model (origin top-left, points) ---------- */
const PW = 595.28, PH = 841.89, M = 48;
const rgb = h => [1, 3, 5].map(i => n2(parseInt(h.slice(i, i + 2), 16) / 255)).join(" ");
const COL = { brand: "#3362AB", brandLight: "#EEF3FB", ink: "#101C33", body: "#334160", muted: "#5B6680", line: "#DDE3EE", ok: "#14703F", okBg: "#E5F4EC", warn: "#8C4A08", warnBg: "#FDF1E3", white: "#FFFFFF" };
function Page() { this.ops = []; }
Page.prototype = {
  text(x, y, s, o) {
    o = o || {}; const f = o.bold ? "B" : "R", size = o.size || 10;
    let tx = x; const w = widthOf(s, f, size);
    if (o.align === "right") tx = x - w; else if (o.align === "center") tx = x - w / 2;
    this.ops.push(`BT /${f === "B" ? "F2" : "F1"} ${size} Tf ${o.spacing ? n2(o.spacing) + " Tc " : "0 Tc "}${rgb(o.color || COL.ink)} rg ${n2(tx)} ${n2(PH - y)} Td ${hex(s)} Tj ET`);
    return w;
  },
  rect(x, y, w, h, o) {
    o = o || {}; const r = o.r || 0, X = x, Y = PH - y - h, k = 0.5523 * r;
    let p = r ? `${n2(X + r)} ${n2(Y)} m ${n2(X + w - r)} ${n2(Y)} l ${n2(X + w - r + k)} ${n2(Y)} ${n2(X + w)} ${n2(Y + r - k)} ${n2(X + w)} ${n2(Y + r)} c ${n2(X + w)} ${n2(Y + h - r)} l ${n2(X + w)} ${n2(Y + h - r + k)} ${n2(X + w - r + k)} ${n2(Y + h)} ${n2(X + w - r)} ${n2(Y + h)} c ${n2(X + r)} ${n2(Y + h)} l ${n2(X + r - k)} ${n2(Y + h)} ${n2(X)} ${n2(Y + h - r + k)} ${n2(X)} ${n2(Y + h - r)} c ${n2(X)} ${n2(Y + r)} l ${n2(X)} ${n2(Y + r - k)} ${n2(X + r - k)} ${n2(Y)} ${n2(X + r)} ${n2(Y)} c h`
              : `${n2(X)} ${n2(Y)} ${n2(w)} ${n2(h)} re`;
    const paint = o.fill && o.stroke ? "B" : o.fill ? "f" : "S";
    this.ops.push(`${o.fill ? rgb(o.fill) + " rg " : ""}${o.stroke ? rgb(o.stroke) + " RG " + n2(o.lw || 0.75) + " w " : ""}${p} ${paint}`);
  },
  line(x1, y1, x2, y2, o) { o = o || {}; this.ops.push(`${rgb(o.color || COL.line)} RG ${n2(o.lw || 0.75)} w ${n2(x1)} ${n2(PH - y1)} m ${n2(x2)} ${n2(PH - y2)} l S`); },
  image(x, y, w, h) { this.ops.push(`q ${n2(w)} 0 0 ${n2(h)} ${n2(x)} ${n2(PH - y - h)} cm /Im1 Do Q`); }
};

/* JPEG width and height, read from its start-of-frame marker */
function jpegSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + len;
  }
  return null;
}

function serialize(pages, logo, info) {
  const objs = [];                         // each is an array of string | Uint8Array
  const add = parts => (objs.push(parts), objs.length);
  const catalog = add(null), pagesId = add(null);
  const f1 = add(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]);
  const f2 = add(["<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"]);
  const im = logo ? add([`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`, logo.bytes, "\nendstream"]) : 0;
  const res = `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${im ? ` /XObject << /Im1 ${im} 0 R >>` : ""} >>`;
  const kids = pages.map(p => {
    const s = p.ops.join("\n");
    const c = add([`<< /Length ${s.length} >>\nstream\n${s}\nendstream`]);
    return add([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources ${res} /Contents ${c} 0 R >>`]);
  });
  objs[catalog - 1] = [`<< /Type /Catalog /Pages ${pagesId} 0 R >>`];
  objs[pagesId - 1] = [`<< /Type /Pages /Kids [${kids.map(k => k + " 0 R").join(" ")}] /Count ${kids.length} >>`];
  const infoId = add([`<< /Title ${hex(info.title)} /Author ${hex(info.author)} /Creator ${hex("Synako Pharmacy website")} /Producer ${hex("Synako receipts")} /CreationDate (${info.date}) >>`]);
  const chunks = []; let len = 0;
  const push = x => { const u = typeof x === "string" ? latin1(x) : x; chunks.push(u); len += u.length; };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const offs = objs.map((o, i) => { const at = len; push(`${i + 1} 0 obj\n`); o.forEach(push); push("\nendobj\n"); return at; });
  const xref = len;
  push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, "0") + " 00000 n \n").join(""));
  push(`trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: "application/pdf" });
}

/* ---------- The receipt ---------- */
async function loadLogo(src) {
  try {
    const r = await fetch(src); if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer()), sz = jpegSize(bytes);
    return sz ? { bytes, w: sz.w, h: sz.h } : null;
  } catch (e) { return null; }
}
const has = v => v != null && String(v).trim() !== "";

async function build(o, opts) {
  opts = opts || {};
  const cfg = opts.cfg || root.SYNAKO_CONFIG, B = cfg.business, L = cfg.licences, site = cfg.site;
  const paid = ["paid", "packed", "out_for_delivery", "delivered"].includes(o.status);
  const money = v => new Intl.NumberFormat(site.locale, { style: "currency", currency: site.currency, currencyDisplay: "code", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0).replace(/\s/g, " ");
  const date = (d, time) => new Date(d).toLocaleString(site.locale, Object.assign({ day: "numeric", month: "short", year: "numeric", timeZone: site.timezone }, time ? { hour: "2-digit", minute: "2-digit" } : {}));
  const logo = opts.logo !== undefined ? opts.logo : await loadLogo(opts.logoSrc || "assets/receipt-logo.jpg");
  const url = String(site.url).replace(/\/$/, ""), host = url.replace(/^https?:\/\//, "");
  const pages = []; let pg, y;
  const R = PW - M;

  const footer = (p, i, n) => {
    p.line(M, PH - 64, R, PH - 64);
    p.text(M, PH - 46, `${B.name} · Your Pathway to Health and Wellness`, { size: 8, color: COL.muted });
    p.text(M, PH - 34, `View this order online: ${host}/track/${o.id}`, { size: 8, color: COL.muted });
    p.text(R, PH - 46, `Page ${i} of ${n}`, { size: 8, color: COL.muted, align: "right" });
    p.text(R, PH - 34, `Generated ${date(new Date(), true)}`, { size: 8, color: COL.muted, align: "right" });
  };
  const newPage = () => { pg = new Page(); pages.push(pg); pg.rect(0, 0, PW, 6, { fill: COL.brand }); y = 40; };
  const label = (x, yy, s, align) => pg.text(x, yy, s.toUpperCase(), { size: 7.5, bold: true, color: COL.muted, spacing: 0.6, align });

  newPage();
  /* Header: logo and seller on the left, document title on the right */
  if (logo) pg.image(M, y, 118, 118 * logo.h / logo.w); else pg.text(M, y + 26, B.name, { size: 20, bold: true, color: COL.brand });
  const title = paid ? "Receipt" : "Order summary";
  pg.text(R, y + 22, title, { size: 24, bold: true, align: "right" });
  pg.text(R, y + 40, `${paid ? "Receipt" : "Order"} no. ${o.id}`, { size: 10, color: COL.body, align: "right" });
  pg.text(R, y + 54, `Issued ${date(new Date())}`, { size: 10, color: COL.body, align: "right" });
  const pill = paid ? ["PAID", COL.ok, COL.okBg] : o.status === "cancelled" || o.status === "rejected" ? ["NOT CHARGED", COL.muted, COL.brandLight] : ["PAYMENT DUE", COL.warn, COL.warnBg];
  const pw = widthOf(pill[0], "B", 8.5) + 4.8 + 20;
  pg.rect(R - pw, y + 63, pw, 19, { fill: pill[2], r: 9.5 });
  pg.text(R - pw / 2, y + 76, pill[0], { size: 8.5, bold: true, color: pill[1], align: "center", spacing: 0.8 });

  let ly = y + (logo ? 118 * logo.h / logo.w : 30) + 22;
  pg.text(M, ly, has(B.companyName) ? B.companyName : B.name, { size: 10, bold: true }); ly += 14;
  [has(B.rcNumber) ? `RC ${B.rcNumber}` : "",
   [B.address, B.city, B.state].filter(has).join(", "),
   [B.phone, B.email].filter(has).join(" · "),
   has(L.pcnEPharmacy) ? `PCN e-pharmacy licence ${L.pcnEPharmacy}` : "Registered with the Pharmacy Council of Nigeria",
   host].filter(has).forEach(s => { pg.text(M, ly, s, { size: 9, color: COL.body }); ly += 12.5; });
  y = Math.max(ly, y + 96) + 14;
  pg.line(M, y, R, y); y += 24;

  /* Who, what and where */
  const cust = o.customer || {}, d = o.delivery || {};
  const where = [d.addr, d.landmark, d.city, d.state].filter(has).join(", ");
  const cols = [
    ["Billed to", [cust.name || "Customer", ...(cust.email ? [cust.email] : [])]],
    ["Order", [`Placed ${date(o.createdAt, true)}`, `${o.items.reduce((t, i) => t + Number(i.qty || 1), 0)} item${o.items.length === 1 && o.items[0].qty === 1 ? "" : "s"}`]],
    ["Delivery", [d.label || "", where || [d.city, d.state].filter(has).join(", ")]]
  ];
  const cw = (R - M) / 3; let maxY = y;
  cols.forEach(([h, rows], i) => {
    const x = M + i * cw; label(x, y, h); let yy = y + 15;
    rows.filter(has).forEach((r, j) => wrap(r, j ? "R" : "B", j ? 9 : 10, cw - 16).forEach(t => { pg.text(x, yy, t, { size: j ? 9 : 10, bold: !j, color: j ? COL.body : COL.ink }); yy += 13; }));
    maxY = Math.max(maxY, yy);
  });
  y = maxY + 16;

  /* Items table */
  const X = { item: M + 12, qty: 352, unit: 448, amt: R - 12 };
  const head = () => {
    pg.rect(M, y, R - M, 24, { fill: COL.brandLight, r: 4 });
    label(X.item, y + 15.5, "Item"); label(X.qty, y + 15.5, "Qty", "right"); label(X.unit, y + 15.5, "Unit price", "right"); label(X.amt, y + 15.5, "Amount", "right");
    y += 24;
  };
  head();
  o.items.forEach(it => {
    const lines = wrap(it.name, "R", 10, X.qty - X.item - 50);
    const sub = it.cls === "pom" ? "Prescription medicine · pharmacist-checked" : "";
    const h = 12 + lines.length * 13 + (sub ? 12 : 0) + 4;
    if (y + h > PH - 190) { newPage(); y = 52; head(); }
    let yy = y + 16;
    lines.forEach(t => { pg.text(X.item, yy, t, { size: 10 }); yy += 13; });
    if (sub) pg.text(X.item, yy - 1, sub, { size: 8, color: COL.muted });
    pg.text(X.qty, y + 16, String(it.qty), { size: 10, align: "right" });
    pg.text(X.unit, y + 16, money(it.price), { size: 10, align: "right", color: COL.body });
    pg.text(X.amt, y + 16, money(it.total), { size: 10, align: "right" });
    y += h; pg.line(M, y, R, y);
  });
  if (!o.priced) { y += 16; pg.text(X.item, y, "Prescription items will be added and priced by our pharmacist.", { size: 9, color: COL.muted }); }

  /* Totals and payment */
  if (y > PH - 250) { newPage(); y = 52; }
  y += 20;
  const tx = 330, top = y;
  const row = (l, v, o2) => { pg.text(tx + 12, y, l, { size: o2 && o2.size || 10, bold: o2 && o2.bold, color: o2 && o2.bold ? COL.ink : COL.body }); pg.text(X.amt, y, v, { size: o2 && o2.size || 10, bold: o2 && o2.bold, align: "right" }); y += o2 && o2.gap || 18; };
  row("Subtotal", money(o.subtotal));
  row(`Delivery`, money(o.deliveryFee));
  pg.text(tx + 12, y - 6, d.label || "", { size: 8, color: COL.muted }); y += 6;
  pg.rect(tx, y - 4, R - tx, 30, { fill: COL.brandLight, r: 4 }); y += 15;
  row("Total", money(o.total) + (o.priced ? "" : "+"), { bold: true, size: 12, gap: 26 });
  row("Amount paid", money(paid ? o.total : 0));
  row("Balance due", money(paid ? 0 : o.total), { bold: true });

  let py = top; const pay = o.payment || {};
  label(M, py, "Payment"); py += 15;
  const payLines = paid
    ? [`Paid online via Paystack${pay.channel && pay.channel !== "test" ? ` · ${String(pay.channel).replace(/_/g, " ")}` : ""}`, pay.paidAt ? `Paid on ${date(pay.paidAt, true)}` : "", pay.reference ? `Reference ${pay.reference}` : ""]
    : o.status === "cancelled" || o.status === "rejected" ? ["Nothing was charged for this order."]
    : o.status === "pending_review" || o.status === "info_needed" ? ["Not paid yet. You'll be able to pay once", "our pharmacist approves your prescription."]
    : ["Not paid yet. Pay securely by card, transfer or", `USSD at ${host}/track/${o.id}`];
  payLines.filter(has).forEach(s => { pg.text(M, py, s, { size: 9.5, color: COL.body }); py += 13.5; });
  y = Math.max(y, py) + 18;

  /* Notes */
  const notes = [];
  if (o.rx) notes.push("Prescription medicines on this order were supplied against a valid prescription reviewed by a Synako pharmacist." + (has(L.superintendentName) ? ` Superintendent pharmacist: ${L.superintendentName}${has(L.superintendentPcnReg) ? ` (PCN ${L.superintendentPcnReg})` : ""}.` : ""));
  notes.push("If anything arrives damaged, faulty, past its expiry date or isn't what you ordered, contact us within 48 hours with your order number.");
  notes.push("Keep medicines out of the sight and reach of children. Read the label and patient leaflet before use.");
  if (y > PH - 150) { newPage(); y = 52; }
  pg.line(M, y, R, y); y += 18;
  label(M, y, "Good to know"); y += 14;
  notes.forEach(n => { wrap(n, "R", 8.5, R - M).forEach(t => { pg.text(M, y, t, { size: 8.5, color: COL.body }); y += 11.5; }); y += 3; });
  y += 10;
  pg.text(M, y, `Thank you for choosing ${B.name}.`, { size: 10, bold: true, color: COL.brand });

  pages.forEach((p, i) => footer(p, i + 1, pages.length));
  const now = new Date(), pad = v => String(v).padStart(2, "0");
  return serialize(pages, logo, {
    title: `${B.name} ${title.toLowerCase()} ${o.id}`, author: B.name,
    date: `D:${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  });
}

async function download(o, opts) {
  const blob = await build(o, opts);
  const paid = ["paid", "packed", "out_for_delivery", "delivered"].includes(o.status);
  const name = `Synako-${paid ? "receipt" : "order"}-${o.id}.pdf`;
  /* Inside the claude.ai preview the viewer's app saves the file; on the website the browser does */
  if (root.claude && typeof root.claude.use === "function") {
    const dl = await root.claude.use("downloads");
    if (dl) { await dl.save({ filename: name, data: blob }); return name; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  return name;
}

root.SYNAKO_RECEIPT = { build, download };
})(typeof window !== "undefined" ? window : globalThis);

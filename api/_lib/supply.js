/* Supply chain for the supply manager: wholesalers, the shortage list, purchase orders and alerts.
   Lives behind the Pharmacist Desk sign-in; routes are in api/staff/orders.js (Vercel Hobby's 12-function limit). */
import { db, site, fail, newId, log, outOfStock, sendEmail, sendSms, smsReady, setting, baseUrl } from "./core.js";

const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
const product = id => site().P.find(p => p.id === String(id));
const shop = () => site().config.business;
export const PO_STATUS = { draft: "Draft", sent: "Sent", confirmed: "Confirmed", received: "Received", cancelled: "Cancelled" };
const OPEN = ["draft", "sent", "confirmed"];

/* ---------- Running low (staff's early warning, before it's out) ---------- */
export async function lowStock() { try { return new Set((await db.get("stock:low")) || []); } catch (e) { console.error("Low list unavailable", e); return new Set(); } }
export async function setLow(id, low) {
  const s = await lowStock();
  if (low) s.add(id); else s.delete(id);
  await db.set("stock:low", [...s]);
  return [...s];
}

/* ---------- Alerts to the supply manager (SUPPLY_EMAIL / SUPPLY_SMS, else the staff ones) ---------- */
export async function notifySupply(subject, lines, sms) {
  const to = setting("SUPPLY_EMAIL") || setting("STAFF_EMAIL"), phone = setting("SUPPLY_SMS") || setting("STAFF_SMS");
  const out = {};
  if (to) out.email = await sendEmail(to, subject, lines.concat([{ html: `<a href="${baseUrl()}/desk">Open Supply on the Pharmacist Desk</a>`, text: `Open the desk: ${baseUrl()}/desk` }]));
  if (phone && smsReady() && sms) out.sms = await sendSms(phone, `${shop().name}: ${sms}`);
  return out;
}

/* ---------- Suppliers (wholesalers) ---------- */
/* The desk's saved list; until the first save, the starter list in js/config.js (supply.suppliers) */
export async function suppliers() {
  const saved = await db.get("suppliers");
  if (saved) return saved;
  return ((site().config.supply || {}).suppliers || []).filter(x => x && x.name).map((x, i) => ({
    id: "SUP-" + (String(x.name).toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 10) || i), name: clean(x.name, 80), contact: clean(x.contact, 80), phone: clean(x.phone, 20),
    whatsapp: clean(x.whatsapp, 20), email: clean(x.email, 120).toLowerCase(), leadDays: Math.max(0, Math.min(60, Math.round(Number(x.leadDays) || 0))), notes: clean(x.notes, 300)
  }));
}
export async function saveSupplier(b) {
  const list = await suppliers();
  const s = {
    id: clean(b.id, 20) || newId("SUP"), name: clean(b.name, 80), contact: clean(b.contact, 80), phone: clean(b.phone, 20), whatsapp: clean(b.whatsapp, 20),
    email: clean(b.email, 120).toLowerCase(), leadDays: Math.max(0, Math.min(60, Math.round(Number(b.leadDays) || 0))), notes: clean(b.notes, 300)
  };
  if (!s.name) throw fail(400, "Give the wholesaler a name.");
  if (!s.phone && !s.whatsapp && !s.email) throw fail(400, "Add a phone, WhatsApp number or email so orders can reach them.");
  if (s.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email)) throw fail(400, "That email address doesn't look right.");
  const i = list.findIndex(x => x.id === s.id);
  if (i >= 0) list[i] = s; else list.push(s);
  list.sort((a, b) => a.name.localeCompare(b.name));
  await db.set("suppliers", list);
  return list;
}
export async function deleteSupplier(id) {
  const list = (await suppliers()).filter(s => s.id !== id);
  await db.set("suppliers", list);
  return list;
}

/* ---------- Purchase orders ---------- */
export async function purchaseOrders(n = 100) {
  const ids = await db.latest("pos", n);
  return (await Promise.all(ids.map(id => db.get("po:" + id)))).filter(Boolean);
}
export function poText(po) {
  const b = shop();
  return [`Purchase order ${po.id} from ${b.companyName || b.name}`, ...po.lines.map(l => `• ${l.qty} × ${l.name}${l.pack ? ` (${l.pack})` : ""}`),
    po.note ? `Note: ${po.note}` : "", `Deliver to: ${[b.address, b.city, b.state].filter(Boolean).join(", ")}`, `Contact: ${[b.phone, b.email].filter(Boolean).join(" · ")}`,
    "Please confirm availability, price and delivery date. Thank you."].filter(Boolean).join("\n");
}
export async function createPO(b, by) {
  const sup = (await suppliers()).find(s => s.id === String(b.supplier));
  if (!sup) throw fail(400, "Choose a wholesaler for this order.");
  const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 80).map(l => {
    const p = product(l.id), qty = Math.round(Number(l.qty));
    if (!p) throw fail(400, "One of the products wasn't found.");
    if (!(qty >= 1 && qty <= 100000)) throw fail(400, `Enter a quantity for ${p.name}.`);
    return { id: p.id, name: p.name, pack: p.pack || "", qty };
  });
  if (!lines.length) throw fail(400, "Tick at least one item to order.");
  const po = { id: newId("PO"), supplier: sup.id, supplierName: sup.name, lines, note: clean(b.note, 300), status: "draft", createdAt: new Date().toISOString(), expected: "", history: [] };
  if (sup.leadDays) po.expected = new Date(Date.now() + sup.leadDays * 864e5).toISOString().slice(0, 10);
  log(po, `Created by ${by}`);
  await db.set("po:" + po.id, po);
  await db.index("pos", po.id, Date.now());
  return po;
}
/* Move a purchase order along. "received" puts its products back in stock and tells customers who asked. */
export async function updatePO(b, by, tell) {
  const po = await db.get("po:" + String(b.id));
  if (!po) throw fail(404, "Purchase order not found.");
  const act = String(b.po || "");
  if (b.expected !== undefined) { const d = clean(b.expected, 10); if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw fail(400, "Choose a delivery date."); po.expected = d; }
  if (act === "send") {
    if (!OPEN.includes(po.status)) throw fail(409, "This order is closed.");
    const sup = (await suppliers()).find(s => s.id === po.supplier) || {};
    if (b.via === "email") {
      if (!sup.email) throw fail(400, "Add an email address for this wholesaler first.");
      const r = await sendEmail(sup.email, `Purchase order ${po.id} from ${shop().companyName || shop().name}`, poText(po).split("\n"));
      log(po, `Emailed to ${sup.email} by ${by}: ${r.ok ? "sent" : "NOT sent · " + r.why}`);
      if (!r.ok) { await db.set("po:" + po.id, po); throw fail(502, `The email didn't go: ${r.why}. Use WhatsApp instead.`); }
    } else log(po, `Sent by ${b.via === "whatsapp" ? "WhatsApp" : "phone"} by ${by}`);
    if (po.status === "draft") po.status = "sent";
    po.sentAt = po.sentAt || new Date().toISOString();
  } else if (act === "confirmed") {
    if (!["draft", "sent"].includes(po.status)) throw fail(409, "Only a sent order can be confirmed.");
    po.status = "confirmed"; log(po, `Confirmed by the wholesaler (noted by ${by})`);
  } else if (act === "received") {
    if (!OPEN.includes(po.status)) throw fail(409, "This order is already closed.");
    po.status = "received"; po.receivedAt = new Date().toISOString();
    const out = await outOfStock(), low = await lowStock();
    let told = 0;
    for (const l of po.lines) {
      out.delete(l.id); low.delete(l.id);
      const p = product(l.id); if (p && tell) told += await tell(p, by);
    }
    await db.set("stock:out", [...out]); await db.set("stock:low", [...low]);
    log(po, `Received by ${by} · items back in stock${told ? ` · ${told} waiting customer${told === 1 ? "" : "s"} emailed` : ""}`);
  } else if (act === "cancel") {
    if (!OPEN.includes(po.status)) throw fail(409, "This order is already closed.");
    po.status = "cancelled"; log(po, `Cancelled by ${by}${b.note ? ` · ${clean(b.note, 200)}` : ""}`);
  } else if (b.expected !== undefined) log(po, `Delivery date set to ${po.expected || "none"} by ${by}`);
  else throw fail(400, "Unknown action.");
  await db.set("po:" + po.id, po);
  return po;
}

/* ---------- The shortage list ---------- */
/* Out of stock or running low, with customers waiting, recent sales and what's already on order, most pressing first */
export async function shortages() {
  const out = await outOfStock(), low = await lowStock();
  const reqIds = await db.latest("requests", 300), orderIds = await db.latest("orders", 200);
  const [reqs, orders, pos] = await Promise.all([Promise.all(reqIds.map(id => db.get("req:" + id))), Promise.all(orderIds.map(id => db.get("order:" + id))), purchaseOrders(100)]);
  const waiting = {}, sold = {}, onOrder = {};
  for (const r of reqs) if (r && r.type === "restock" && r.status === "new") waiting[r.product] = (waiting[r.product] || 0) + 1;
  const week = Date.now() - 7 * 864e5;
  for (const o of orders) if (o && ["paid", "packed", "out_for_delivery", "delivered"].includes(o.status) && Date.parse(o.createdAt) > week) for (const i of o.items) sold[i.id] = (sold[i.id] || 0) + (Number(i.qty) || 0) * (Number(i.n) || 1);
  for (const po of pos) if (OPEN.includes(po.status)) for (const l of po.lines) (onOrder[l.id] = onOrder[l.id] || []).push({ po: po.id, qty: l.qty, status: po.status, supplier: po.supplierName });
  const ids = new Set([...out, ...low, ...site().P.filter(p => p.out).map(p => p.id)]);
  return [...ids].map(product).filter(Boolean).map(p => ({
    id: p.id, name: p.name, pack: p.pack || "", state: out.has(p.id) || p.out ? "out" : "low", waiting: waiting[p.id] || 0, sold7: sold[p.id] || 0, onOrder: onOrder[p.id] || []
  })).sort((a, b) => (a.onOrder.length > 0) - (b.onOrder.length > 0) || (b.state === "out") - (a.state === "out") || b.waiting - a.waiting || b.sold7 - a.sold7 || a.name.localeCompare(b.name));
}
/* Purchase orders past their delivery date, or sent without a reply for 2 days */
export function overdue(pos, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  return pos.filter(po => (["sent", "confirmed"].includes(po.status) && po.expected && po.expected < today) || (po.status === "sent" && po.sentAt && now - Date.parse(po.sentAt) > 2 * 864e5));
}
/* One summary a day for the supply manager */
export async function supplyDigest(now = Date.now()) {
  const list = await shortages(), late = overdue(await purchaseOrders(100), now);
  const need = list.filter(s => !s.onOrder.length);
  if (!need.length && !late.length) return { shortages: list.length, toOrder: 0, overdue: 0, sent: false };
  const lines = [`Supply summary for ${new Date(now).toLocaleDateString("en-GB", { timeZone: site().config.site.timezone })}`,
    need.length ? `${need.length} item${need.length === 1 ? "" : "s"} to order:` : "", ...need.slice(0, 20).map(s => `• ${s.name} · ${s.state === "out" ? "OUT OF STOCK" : "running low"}${s.waiting ? ` · ${s.waiting} customer${s.waiting === 1 ? "" : "s"} waiting` : ""}${s.sold7 ? ` · ${s.sold7} sold this week` : ""}`),
    late.length ? `${late.length} purchase order${late.length === 1 ? "" : "s"} late or not confirmed:` : "", ...late.map(po => `• ${po.id} from ${po.supplierName} (${PO_STATUS[po.status]}${po.expected ? `, due ${po.expected}` : ""})`)].filter(Boolean);
  const r = await notifySupply(`Supply: ${need.length} to order${late.length ? `, ${late.length} late` : ""}`, lines, `${need.length} item(s) to order${late.length ? `, ${late.length} purchase order(s) late` : ""}. Open Supply on the desk.`);
  return { shortages: list.length, toOrder: need.length, overdue: late.length, sent: !!(r.email || r.sms) };
}

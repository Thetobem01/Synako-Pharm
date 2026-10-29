/* The till (/pos): counter sales, stock counts, shelf prices and customer records.
   The rules are in js/pos.js (shared with the design preview); this file stores them in Upstash Redis and keeps the
   website in step: an item counted down to zero goes out of stock online, and comes back when stock is received.
   Routes are in api/staff/orders.js (Vercel Hobby's 12-function limit). */
import { db, site, fail, newId, outOfStock, STATUS, digits } from "./core.js";
import { lowStock, notifySupply } from "./supply.js";

const store = {
  get: k => db.get(k), set: (k, v) => db.set(k, v), incrBy: (k, n) => db.incrBy(k, n), nums: keys => db.nums(keys),
  index: (l, m, s) => db.index(l, m, s), latest: (l, n) => db.latest(l, n), id: p => newId(p), now: () => Date.now()
};
export const till = () => site().pos.engine(store, site().P, site().config);

/* After counts change: website products at zero go out of stock online (and come back when restocked);
   at or under their reorder level they're marked running low for the supply manager */
export async function syncShop(changes, by, tellWaitingCustomers) {
  const { P } = site(), web = changes.filter(c => P.some(p => p.id === c.id));
  if (!web.length) return { out: [], back: [] };
  const items = new Map((await till().items()).map(i => [i.id, i]));
  const out = await outOfStock(), low = await lowStock();
  const gone = [], back = [];
  let lowChanged = false;
  for (const c of web) {
    const i = items.get(c.id), p = P.find(x => x.id === c.id);
    if (!i || i.qty == null) continue;
    if (i.qty <= 0 && !out.has(i.id)) { out.add(i.id); gone.push(p); }
    else if (i.qty > 0 && out.has(i.id) && !p.out) { out.delete(i.id); back.push(p); }
    const isLow = i.qty > 0 && i.reorder > 0 && i.qty <= i.reorder;
    if (isLow !== low.has(i.id) || (i.qty <= 0 && low.has(i.id))) { if (isLow) low.add(i.id); else low.delete(i.id); lowChanged = true; }
  }
  if (gone.length || back.length) await db.set("stock:out", [...out]);
  if (lowChanged) await db.set("stock:low", [...low]);
  for (const p of gone) await notifySupply(`Sold out: ${p.name}`, [`The last ${p.name} (${p.pack}) left the shelf (${by}). It's now out of stock on the website.`, "Add it to a purchase order from the Supply tab."], `SOLD OUT: ${p.name}.`);
  for (const p of back) if (tellWaitingCustomers) await tellWaitingCustomers(p, by);
  return { out: gone.map(p => p.id), back: back.map(p => p.id) };
}

/* Online orders from the same phone number, for the customer's record */
async function onlineOrders(phone) {
  const key = digits(phone).slice(-10);
  if (key.length < 7) return [];
  const ids = await db.latest("orders", 200);
  return (await Promise.all(ids.map(id => db.get("order:" + id)))).filter(o => o && digits(o.customer.phone).slice(-10) === key)
    .map(o => ({ id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: STATUS[o.status], total: o.total, items: o.items.map(i => `${i.qty} × ${i.name}`) }));
}

/* POST actions from the till. role is "staff" (desk password) or "pos" (till password). */
export async function posAction(b, role, tellWaitingCustomers) {
  const t = till(), by = String(b.by || "Staff").trim().slice(0, 60) || "Staff";
  const sync = async r => Object.assign(r, { shop: await syncShop(r.changes || [], by, tellWaitingCustomers) });
  switch (b.action) {
    case "pos-sell": return Object.assign(await sync(await t.sell(b, by)), { view: await t.view() });
    case "pos-void":
      if (role !== "staff") throw fail(403, "Only a manager can void a sale. Sign in to the till with the desk password.");
      return Object.assign(await sync(await t.voidSale(b, by)), { view: await t.view() });
    case "pos-item": return Object.assign(await sync(await t.saveItem(b, by)), { view: await t.view() });
    case "pos-item-remove": await t.archiveItem(b); return { view: await t.view() };
    case "pos-adjust": return Object.assign(await sync(await t.adjust(b, by)), { view: await t.view() });
    case "pos-customer-save": { const customer = await t.saveCustomer(b.customer || {}, by); return { customer, view: await t.view() }; }
    case "pos-customer": { const r = await t.customer(b.id); return Object.assign(r, { online: await onlineOrders(r.customer.phone) }); }
    default: throw fail(400, "Unknown till action.");
  }
}
export const posView = () => till().view();

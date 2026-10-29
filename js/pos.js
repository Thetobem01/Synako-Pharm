/* Synako Pharmacy — the counter: point of sale, stock counts, shelf prices and customer records.
   Shared by the server (api/_lib/pos.js), the design preview and the tests. Storage is passed in, so the same
   rules run against Upstash Redis on the server and plain memory in the preview.
   Prices here are the in-store shelf prices; the website keeps the prices in js/data.js. */
(function (root) {
  "use strict";

  const money = n => Math.round(Number(n) * 100) / 100;
  const clean = (v, n) => String(v == null ? "" : v).trim().slice(0, n);
  const digits = s => String(s || "").replace(/\D/g, "");
  const int = (v, min, max) => Math.max(min, Math.min(max, Math.round(Number(v) || 0)));
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const METHODS = { cash: "Cash", transfer: "Bank transfer", card: "Card (POS terminal)" };
  const MOVES = { received: "Stock received", count: "Shelf count", damaged: "Damaged or expired", returned: "Returned by customer", sale: "Sold at the counter", void: "Sale voided", online: "Packed for an online order", price: "Price changed" };
  /* Phone numbers compared on their last 10 digits, so 0803… and +234 803… are the same person */
  const phoneKey = p => { const d = digits(p); return d.length >= 7 ? d.slice(-10) : ""; };
  /* A calendar day in the shop's time zone, e.g. "2026-10-29" */
  const dayOf = (t, tz) => new Date(t).toLocaleDateString("en-CA", { timeZone: tz || "Africa/Lagos" });
  const hourOf = (t, tz) => Number(new Date(t).toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: tz || "Africa/Lagos" })) % 24;

  /* Everything on the shelf: the website catalogue plus items sold only in store, with counts and shelf prices */
  function inventory(P, meta, qtys) {
    const row = (id, base, m) => ({
      id, name: m.custom ? m.name : base.name, pack: m.custom ? m.pack : base.pack, dept: m.custom ? m.dept : base.dept, cls: m.custom ? "gen" : base.cls, age: m.custom ? (m.age || 0) : (base.age || 0),
      price: m.price != null ? m.price : base.price, webPrice: m.custom ? null : base.price, cost: m.cost != null ? m.cost : null, reorder: m.reorder || 0, barcode: m.barcode || "",
      qty: qtys[id] == null ? null : Number(qtys[id]), custom: !!m.custom, updatedAt: m.updatedAt || "", updatedBy: m.updatedBy || ""
    });
    const list = P.map(p => row(p.id, p, meta[p.id] || {}));
    Object.keys(meta).filter(id => meta[id].custom && !meta[id].archived).forEach(id => list.push(row(id, {}, meta[id])));
    return list;
  }
  const isLow = i => i.qty != null && (i.qty <= 0 || (i.reorder > 0 && i.qty <= i.reorder));

  /* The figures on the till dashboard, from the latest sales */
  function stats(sales, items, now, tz) {
    const today = dayOf(now, tz), done = sales.filter(s => s.status === "completed");
    const on = d => done.filter(s => dayOf(s.createdAt, tz) === d);
    const sum = l => money(l.reduce((t, s) => t + s.total, 0));
    const t = on(today), yesterday = on(dayOf(now - 864e5, tz));
    const byMethod = Object.fromEntries(Object.keys(METHODS).map(k => [k, sum(t.filter(s => s.method === k))]));
    const byHour = Array(24).fill(0); t.forEach(s => { byHour[hourOf(s.createdAt, tz)] += s.total; });
    const week = [...Array(7)].map((_, i) => { const d = dayOf(now - (6 - i) * 864e5, tz); return { day: d, total: sum(on(d)), count: on(d).length }; });
    const tally = (list, key) => { const m = {}; list.forEach(s => s.lines.forEach(l => { const k = key(l, s); m[k] = m[k] || { qty: 0, total: 0, name: l.name }; m[k].qty += l.qty; m[k].total = money(m[k].total + l.total); })); return m; };
    const top = Object.entries(tally(done.filter(s => Date.parse(s.createdAt) > now - 7 * 864e5), l => l.id)).map(([id, v]) => Object.assign({ id }, v)).sort((a, b) => b.qty - a.qty || b.total - a.total).slice(0, 6);
    const staff = {}; t.forEach(s => { staff[s.by] = staff[s.by] || { name: s.by, count: 0, total: 0 }; staff[s.by].count++; staff[s.by].total = money(staff[s.by].total + s.total); });
    const counted = items.filter(i => i.qty != null);
    return {
      today: { total: sum(t), count: t.length, avg: t.length ? money(sum(t) / t.length) : 0, items: t.reduce((n, s) => n + s.lines.reduce((m, l) => m + l.qty, 0), 0),
        discounts: money(t.reduce((n, s) => n + (s.discount || 0), 0)), byMethod, byHour, voided: sales.filter(s => s.status === "voided" && dayOf(s.voidedAt || s.createdAt, tz) === today).length,
        profit: money(t.reduce((n, s) => n + s.lines.reduce((m, l) => m + (l.cost != null ? l.total - l.cost * l.qty : 0), 0), 0) - t.reduce((n, s) => n + (s.discount || 0), 0)) },
      yesterday: { total: sum(yesterday), count: yesterday.length },
      week, top, staff: Object.values(staff).sort((a, b) => b.total - a.total),
      stock: { counted: counted.length, low: items.filter(i => isLow(i) && i.qty > 0).length, out: counted.filter(i => i.qty <= 0).length,
        value: money(counted.reduce((n, i) => n + Math.max(0, i.qty) * (i.cost || 0), 0)), retail: money(counted.reduce((n, i) => n + Math.max(0, i.qty) * (i.price || 0), 0)) }
    };
  }

  /* store: { get, set, incrBy, nums, index, latest, id, now } — see api/_lib/pos.js for the Redis one */
  function engine(store, P, cfg) {
    const tz = (cfg && cfg.site && cfg.site.timezone) || "Africa/Lagos";
    const qtyKey = id => "pos:qty:" + id;
    const meta = async () => (await store.get("pos:items")) || {};
    async function items() {
      const m = await meta(), ids = P.map(p => p.id).concat(Object.keys(m).filter(id => m[id].custom && !m[id].archived));
      const n = await store.nums(ids.map(qtyKey));
      return inventory(P, m, Object.fromEntries(ids.map((id, i) => [id, n[i]])));
    }
    async function addMoves(list) {
      if (!list.length) return;
      const all = (await store.get("pos:moves")) || [];
      await store.set("pos:moves", list.concat(all).slice(0, 200));
    }
    const listOf = async (index, prefix, n) => (await Promise.all((await store.latest(index, n)).map(id => store.get(prefix + id)))).filter(Boolean);
    async function view() {
      const now = store.now(), [inv, sales, customers, moves] = await Promise.all([items(), listOf("pos:sales", "pos:sale:", 300), listOf("pos:customers", "pos:cust:", 300), store.get("pos:moves")]);
      return { items: inv, sales, customers, moves: moves || [], stats: stats(sales, inv, now, tz), methods: METHODS, serverTime: new Date(now).toISOString() };
    }

    /* Change counts. Each change is atomic per item; a sale that can't be filled puts back what it took. */
    async function take(lines, why, by, ref) {
      const taken = [];
      for (const l of lines) {
        const left = await store.incrBy(qtyKey(l.id), -l.qty);
        taken.push(l);
        if (left < 0) {
          for (const x of taken) await store.incrBy(qtyKey(x.id), x.qty);
          throw fail(409, `Only ${left + l.qty} × ${l.name} on the shelf. If the shelf has more, update its count under Stock & prices first.`);
        }
        l.left = left;
      }
      await addMoves(lines.map(l => ({ t: new Date(store.now()).toISOString(), id: l.id, name: l.name, change: -l.qty, qty: l.left, why, by, ref })));
      return lines.map(l => ({ id: l.id, qty: l.left }));
    }

    async function customerFor(b, by) {
      if (b && b.id) { const c = await store.get("pos:cust:" + clean(b.id, 20)); if (!c) throw fail(404, "That customer isn't on the list any more."); return c; }
      if (!b || (!clean(b.name, 80) && !phoneKey(b.phone))) return null;
      const known = phoneKey(b.phone) && await store.get("pos:phone:" + phoneKey(b.phone));
      if (known) { const c = await store.get("pos:cust:" + known); if (c) return c; }
      return saveCustomer({ name: b.name, phone: b.phone, email: b.email }, by);
    }

    async function sell(b, by) {
      const inv = new Map((await items()).map(i => [i.id, i]));
      const raw = Array.isArray(b.lines) ? b.lines.slice(0, 60) : [];
      const merged = new Map();
      raw.forEach(l => { const id = clean(l && l.id, 40), q = int(l && l.qty, 0, 999); if (id && q) merged.set(id, (merged.get(id) || 0) + q); });
      if (!merged.size) throw fail(400, "Add at least one item to the sale.");
      const lines = [...merged].map(([id, qty]) => {
        const i = inv.get(id);
        if (!i) throw fail(404, "One of the items isn't on the shelf list any more. Remove it and scan it again.");
        if (!(i.price > 0)) throw fail(400, `${i.name} has no shelf price yet. Set one under Stock & prices.`);
        return { id, name: i.name, pack: i.pack, cls: i.cls, age: i.age, qty, price: i.price, cost: i.cost, total: money(i.price * qty), tracked: i.qty != null };
      });
      if (lines.some(l => l.cls === "pom") && !b.rxChecked) throw fail(400, "This sale includes a prescription-only medicine. A pharmacist must check the prescription and tick the box first.");
      if (lines.some(l => l.age >= 18) && !b.idChecked) throw fail(400, "This sale includes alcohol. Check the buyer's photo ID (18+) and tick the box first.");
      const subtotal = money(lines.reduce((t, l) => t + l.total, 0));
      const discount = money(Math.max(0, Math.min(subtotal, Number(b.discount) || 0)));
      const total = money(subtotal - discount);
      const method = METHODS[b.method] ? b.method : "";
      if (!method) throw fail(400, "Choose how the customer paid: cash, transfer or card.");
      const tendered = method === "cash" ? money(Number(b.tendered) || total) : total;
      if (tendered < total) throw fail(400, "The cash received is less than the total.");
      const customer = await customerFor(b.customer, by);
      const id = store.id("TIL");
      const changes = await take(lines.filter(l => l.tracked).map(l => ({ id: l.id, name: l.name, qty: l.qty })), "sale", by, id);
      const sale = {
        id, createdAt: new Date(store.now()).toISOString(), status: "completed", by,
        lines: lines.map(l => ({ id: l.id, name: l.name, pack: l.pack, cls: l.cls, qty: l.qty, price: l.price, cost: l.cost, total: l.total })),
        subtotal, discount, total, method, tendered, change: money(tendered - total), reference: clean(b.reference, 60),
        rxChecked: lines.some(l => l.cls === "pom") ? by : "", idChecked: lines.some(l => l.age >= 18) ? by : "",
        customer: customer ? { id: customer.id, name: customer.name, phone: customer.phone } : null, note: clean(b.note, 200)
      };
      await store.set("pos:sale:" + id, sale);
      await store.index("pos:sales", id, store.now());
      if (customer) await visit(customer, sale, 1);
      return { sale, changes };
    }

    async function visit(c, sale, sign) {
      const fresh = (await store.get("pos:cust:" + c.id)) || c;
      fresh.visits = Math.max(0, (fresh.visits || 0) + sign);
      fresh.spend = money(Math.max(0, (fresh.spend || 0) + sign * sale.total));
      fresh.sales = sign > 0 ? [sale.id].concat(fresh.sales || []).slice(0, 50) : fresh.sales || [];
      if (sign > 0) { fresh.lastVisit = sale.createdAt; fresh.firstVisit = fresh.firstVisit || sale.createdAt; }
      await store.set("pos:cust:" + c.id, fresh);
      await store.index("pos:customers", c.id, store.now());
    }

    async function voidSale(b, by) {
      const s = await store.get("pos:sale:" + clean(b.id, 20));
      if (!s) throw fail(404, "Sale not found.");
      if (s.status !== "completed") throw fail(409, "This sale has already been voided.");
      const reason = clean(b.reason, 200);
      if (!reason) throw fail(400, "Say why the sale is being voided (for example, wrong item scanned or customer returned it).");
      const inv = new Map((await items()).map(i => [i.id, i]));
      const back = s.lines.filter(l => inv.has(l.id) && inv.get(l.id).qty != null);
      const changes = [];
      for (const l of back) changes.push({ id: l.id, qty: await store.incrBy(qtyKey(l.id), l.qty) });
      await addMoves(back.map((l, i) => ({ t: new Date(store.now()).toISOString(), id: l.id, name: l.name, change: l.qty, qty: changes[i].qty, why: "void", by, ref: s.id })));
      Object.assign(s, { status: "voided", voidedAt: new Date(store.now()).toISOString(), voidedBy: by, voidReason: reason });
      await store.set("pos:sale:" + s.id, s);
      if (s.customer) await visit(s.customer, s, -1);
      return { sale: s, changes };
    }

    /* Add an item, or change a shelf price, cost, reorder level or barcode; optionally move its count in the same step */
    async function saveItem(b, by) {
      const m = await meta(), id = clean(b.id, 40) || store.id("ITM"), base = P.find(p => p.id === id), was = m[id] || {};
      if (!base && b.id && !was.custom) throw fail(404, "Item not found.");
      const custom = !base;
      const price = b.price === "" || b.price == null ? (custom ? NaN : null) : money(b.price);
      if (custom || price != null) { if (!(price > 0) || price > 1e8) throw fail(400, "Enter a shelf price above zero."); }
      const cost = b.cost === "" || b.cost == null ? null : money(b.cost);
      if (cost != null && !(cost >= 0)) throw fail(400, "The cost price can't be negative.");
      const barcode = clean(b.barcode, 40).replace(/\s+/g, "");
      if (barcode) { const other = Object.keys(m).find(k => k !== id && m[k].barcode === barcode && !m[k].archived); if (other) throw fail(409, "Another item already has that barcode."); }
      const it = { price: price != null && (custom || price !== base.price) ? price : null, cost, reorder: int(b.reorder, 0, 100000), barcode, updatedAt: new Date(store.now()).toISOString(), updatedBy: by };
      if (custom) {
        Object.assign(it, { custom: true, name: clean(b.name, 90), pack: clean(b.pack, 60), dept: clean(b.dept, 30) || "otc", age: b.age18 ? 18 : 0 });
        if (!it.name) throw fail(400, "Give the item a name.");
      }
      const shelf = x => x.price != null ? x.price : base ? base.price : null, before = shelf(was), after = shelf(it);
      m[id] = it; await store.set("pos:items", m);
      const changes = b.adjust && (b.adjust.n !== "" && b.adjust.n != null) ? (await adjust({ id, mode: b.adjust.mode, n: b.adjust.n }, by)).changes : [];
      if (b.id && before !== after) await addMoves([{ t: it.updatedAt, id, name: it.name || base.name, change: 0, why: "price", by, note: `Shelf price ${before} → ${after}` }]);
      return { id, changes };
    }
    async function archiveItem(b) {
      const m = await meta(), id = clean(b.id, 40);
      if (!m[id] || !m[id].custom) throw fail(404, "Only items added at the counter can be removed. Website products stay on the list.");
      m[id].archived = true; await store.set("pos:items", m);
      return { id };
    }
    /* mode: received (add), returned (add), damaged (remove), count (set the number on the shelf) */
    async function adjust(b, by) {
      const inv = (await items()).find(i => i.id === clean(b.id, 40));
      if (!inv) throw fail(404, "Item not found.");
      const mode = MOVES[b.mode] && !["sale", "void", "online", "price"].includes(b.mode) ? b.mode : "";
      if (!mode) throw fail(400, "Choose what happened: received, counted, damaged or returned.");
      const n = int(b.n, 0, 1000000);
      if (mode !== "count" && !n) throw fail(400, "Enter how many.");
      let qty;
      if (mode === "count") { await store.set(qtyKey(inv.id), n); qty = n; }
      else qty = await store.incrBy(qtyKey(inv.id), mode === "damaged" ? -n : n);
      const change = mode === "count" ? n - (inv.qty || 0) : mode === "damaged" ? -n : n;
      await addMoves([{ t: new Date(store.now()).toISOString(), id: inv.id, name: inv.name, change, qty, why: mode, by, note: clean(b.note, 120) }]);
      return { changes: [{ id: inv.id, qty }] };
    }
    /* Online orders leave the same shelf when they're packed; counts never go below zero */
    async function takeOnline(lines, by, ref) {
      const counted = new Map((await items()).filter(i => i.qty != null).map(i => [i.id, i]));
      const out = [];
      for (const l of lines) {
        const i = counted.get(l.id), n = int(l.qty, 0, 100000) * (Number(l.n) || 1);
        if (!i || !n) continue;
        let left = await store.incrBy(qtyKey(i.id), -n);
        if (left < 0) left = await store.incrBy(qtyKey(i.id), -left);
        out.push({ id: i.id, name: i.name, change: -n, qty: left });
      }
      await addMoves(out.map(x => ({ t: new Date(store.now()).toISOString(), id: x.id, name: x.name, change: x.change, qty: x.qty, why: "online", by, ref })));
      return out.map(x => ({ id: x.id, qty: x.qty }));
    }

    async function saveCustomer(b, by) {
      const id = clean(b.id, 20), was = id ? await store.get("pos:cust:" + id) : null;
      if (id && !was) throw fail(404, "Customer not found.");
      const c = Object.assign({ id: id || store.id("CUS"), createdAt: new Date(store.now()).toISOString(), createdBy: by, visits: 0, spend: 0, sales: [] }, was || {}, {
        name: clean(b.name, 80), phone: clean(b.phone, 24), email: clean(b.email, 120).toLowerCase(), notes: clean(b.notes, 600), birthday: /^\d{2}-\d{2}$/.test(String(b.birthday || "")) ? b.birthday : "",
        tags: String(b.tags || "").split(",").map(t => clean(t, 24)).filter(Boolean).slice(0, 6), consent: !!b.consent, updatedAt: new Date(store.now()).toISOString(), updatedBy: by
      });
      if (!c.name) throw fail(400, "Enter the customer's name.");
      if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) throw fail(400, "That email address doesn't look right.");
      const pk = phoneKey(c.phone);
      if (c.phone && !pk) throw fail(400, "That phone number looks too short.");
      if (pk) {
        const other = await store.get("pos:phone:" + pk);
        if (other && other !== c.id && await store.get("pos:cust:" + other)) throw fail(409, "A customer with that phone number is already on the list. Search for them instead.");
        await store.set("pos:phone:" + pk, c.id);
      }
      if (was && phoneKey(was.phone) && phoneKey(was.phone) !== pk) await store.set("pos:phone:" + phoneKey(was.phone), "");
      await store.set("pos:cust:" + c.id, c);
      await store.index("pos:customers", c.id, store.now());
      return c;
    }
    async function customer(id) {
      const c = await store.get("pos:cust:" + clean(id, 20));
      if (!c) throw fail(404, "Customer not found.");
      const sales = (await Promise.all((c.sales || []).map(s => store.get("pos:sale:" + s)))).filter(Boolean);
      return { customer: c, sales };
    }

    return { items, view, sell, voidSale, saveItem, archiveItem, adjust, takeOnline, saveCustomer, customer };
  }

  /* A memory store with the same shape, for the design preview and tests */
  function memoryStore(prefix) {
    const kv = new Map(), z = new Map();
    let n = 0;
    return {
      get: async k => kv.has(k) ? JSON.parse(kv.get(k)) : null,
      set: async (k, v) => { kv.set(k, JSON.stringify(v)); },
      incrBy: async (k, d) => { const v = Number(kv.has(k) ? JSON.parse(kv.get(k)) : 0) + d; kv.set(k, String(v)); return v; },
      nums: async keys => keys.map(k => kv.has(k) ? Number(JSON.parse(kv.get(k))) : null),
      index: async (list, m, s) => { const l = z.get(list) || new Map(); l.set(m, s + (n++) / 1e6); z.set(list, l); },
      latest: async (list, c) => [...(z.get(list) || new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, c).map(e => e[0]),
      id: p => `${p}-${(prefix || "") + Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      now: () => Date.now()
    };
  }

  root.SYNAKO_POS = { engine, inventory, stats, isLow, memoryStore, phoneKey, METHODS, MOVES, dayOf, hourOf };
})(typeof window !== "undefined" ? window : globalThis);

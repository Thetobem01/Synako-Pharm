/* Synako Pharmacy — delivery options and order totals.
   Shared by the website and the server. The server always recalculates the total
   from this file and the catalogue, so prices can't be changed in the browser. */
(function (root) {
  "use strict";

  const hm = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };

  /* Current day and minutes-since-midnight in Nigeria time */
  function clock(cfg, date) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: cfg.hours.timezone || (cfg.site && cfg.site.timezone) || "Africa/Lagos", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(date || new Date());
    const get = t => (parts.find(p => p.type === t) || {}).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
  }
  function isOpen(cfg, date) {
    const c = clock(cfg, date), h = cfg.hours.open[c.day];
    return !!h && c.minutes >= hm(h[0]) && c.minutes < hm(h[1]);
  }

  const money = n => Math.round(Number(n) * 100) / 100;

  /* Most of one line a customer can order online: prescription medicines are limited per order,
     single packs up to a box-load, wholesale units (dozens, cartons, cases) up to a truck-load */
  function maxQty(p, unit) { return p.cls === "pom" ? 10 : unit.n > 1 ? 100 : 50; }
  function unitOf(p, u) { return (p.units || [{ id: "1", n: 1, label: "Single", price: p.price }]).find(x => x.id === String(u || "1")); }

  /* input: { items: [{id, q, u}], state, speed }   u = unit id: "1" single, or a bulk count such as "12"
     returns lines, subtotal, delivery options with availability, chosen speed, fee and total */
  function quote(input, cfg, P, date) {
    const d = cfg.delivery, lines = [], seen = {};
    (input.items || []).slice(0, (cfg.orders && cfg.orders.maxLines) || 60).forEach(it => {
      const p = P.find(x => x.id === (it && it.id)), unit = p && unitOf(p, it.u);
      if (!unit || seen[p.id + "|" + unit.id]) return; // unknown products or units, and repeats, are dropped
      seen[p.id + "|" + unit.id] = 1;
      const q = Math.max(1, Math.min(maxQty(p, unit), parseInt(it.q, 10) || 1));
      lines.push({ id: p.id, unit: unit.id, n: unit.n, unitLabel: unit.n > 1 ? `${unit.label} (${unit.n} × ${p.pack})` : p.pack,
        name: unit.n > 1 ? `${p.name} · ${unit.label} of ${unit.n}` : p.name, cls: p.cls, age: p.age || 0, price: unit.price, qty: q, total: money(unit.price * q) });
    });
    const subtotal = money(lines.reduce((s, l) => s + l.total, 0));
    const c = clock(cfg, date), today = cfg.hours.open[c.day];
    const local = !d.localStates || !d.localStates.length || !input.state || d.localStates.includes(input.state);
    const big = subtotal > d.nextDayThreshold;
    const openNow = isOpen(cfg, date);
    const beforeCutoff = !!today && c.minutes < hm(d.sameDayCutoff);

    const opts = [
      { speed: "express", label: `Home delivery in ${d.expressMinutes} minutes`, fee: d.fees.express,
        available: local && !big && openNow,
        reason: big ? `Orders above ${fmtMoney(d.nextDayThreshold, cfg)} are delivered the next day.` : !local ? "Not available in your state." : !openNow ? "Available during opening hours." : "" },
      { speed: "sameday", label: `Same-day delivery (order before ${fmt12(d.sameDayCutoff)})`, fee: d.fees.sameDay,
        available: local && !big && beforeCutoff,
        reason: big ? "Large orders are delivered the next day." : !local ? "Not available in your state." : !beforeCutoff ? `Order before ${fmt12(d.sameDayCutoff)} for same-day delivery.` : "" },
      { speed: "nextday", label: "Next-day delivery", fee: d.fees.nextDay, available: local, reason: local ? "" : "Not available in your state." },
      { speed: "states", label: "Delivery to other states (2–4 working days)", fee: d.fees.otherStates, available: !local, reason: local ? "" : "" }
    ].filter(o => local ? o.speed !== "states" : o.speed === "states");

    const cheapest = opts.filter(o => o.available).sort((x, y) => x.fee - y.fee)[0];
    const chosen = opts.find(o => o.speed === input.speed && o.available) || cheapest || opts[opts.length - 1];
    const deliveryFee = (lines.length || input.rxRequest) ? chosen.fee : 0;
    const maxTotal = (cfg.orders && cfg.orders.maxOnlineTotal) || Infinity;
    return { lines, subtotal, big, openNow, overLimit: subtotal > maxTotal, maxTotal, packs: lines.reduce((t, l) => t + l.qty * l.n, 0), age: Math.max(0, ...lines.map(l => l.age)), options: opts, speed: chosen.speed, speedLabel: chosen.label, deliveryFee, total: money(subtotal + deliveryFee) };
  }
  /* Currency in the shop's locale, e.g. ₦1,200 or ₦999,999.99 (decimals only when needed) */
  function fmtMoney(n, cfg) {
    const site = (cfg && cfg.site) || {}, v = Number(n);
    return new Intl.NumberFormat(site.locale || "en-NG", { style: "currency", currency: site.currency || "NGN", currencyDisplay: "narrowSymbol",
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
  }
  function fmt12(s) { const [h, m] = s.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; }

  root.SYNAKO_PRICING = { quote, clock, isOpen, fmt12, fmtMoney, unitOf, maxQty };
})(typeof window !== "undefined" ? window : globalThis);

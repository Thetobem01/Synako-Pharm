/* Synako Pharmacy — delivery options and order totals.
   Shared by the website and the server. The server always recalculates the total
   from this file and the catalogue, so prices can't be changed in the browser. */
(function (root) {
  "use strict";

  const hm = s => { const [h, m] = String(s).split(":").map(Number); return h * 60 + (m || 0); };

  /* Current day and minutes-since-midnight in Nigeria time */
  function clock(cfg, date) {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: cfg.hours.timezone || "Africa/Lagos", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
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

  /* input: { items: [{id, q}], state, speed }
     returns lines, subtotal, delivery options with availability, chosen speed, fee and total */
  function quote(input, cfg, P, date) {
    const d = cfg.delivery, lines = [];
    (input.items || []).forEach(it => {
      const p = P.find(x => x.id === it.id);
      const q = Math.max(1, Math.min(10, parseInt(it.q, 10) || 1));
      if (p) lines.push({ id: p.id, name: p.name, cls: p.cls, price: p.price, qty: q, total: money(p.price * q) });
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
        reason: big ? `Orders above ₦${Number(d.nextDayThreshold).toLocaleString("en-NG")} are delivered the next day.` : !local ? "Not available in your state." : !openNow ? "Available during opening hours." : "" },
      { speed: "sameday", label: `Same-day delivery (order before ${fmt12(d.sameDayCutoff)})`, fee: d.fees.sameDay,
        available: local && !big && beforeCutoff,
        reason: big ? "Large orders are delivered the next day." : !local ? "Not available in your state." : !beforeCutoff ? `Order before ${fmt12(d.sameDayCutoff)} for same-day delivery.` : "" },
      { speed: "nextday", label: "Next-day delivery", fee: d.fees.nextDay, available: local, reason: local ? "" : "Not available in your state." },
      { speed: "states", label: "Delivery to other states (2–4 working days)", fee: d.fees.otherStates, available: !local, reason: local ? "" : "" }
    ].filter(o => local ? o.speed !== "states" : o.speed === "states");

    const cheapest = opts.filter(o => o.available).sort((x, y) => x.fee - y.fee)[0];
    const chosen = opts.find(o => o.speed === input.speed && o.available) || cheapest || opts[opts.length - 1];
    const deliveryFee = (lines.length || input.rxRequest) ? chosen.fee : 0;
    return { lines, subtotal, big, openNow, options: opts, speed: chosen.speed, speedLabel: chosen.label, deliveryFee, total: money(subtotal + deliveryFee) };
  }
  function fmt12(s) { const [h, m] = s.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; }

  root.SYNAKO_PRICING = { quote, clock, isOpen, fmt12 };
})(typeof window !== "undefined" ? window : globalThis);

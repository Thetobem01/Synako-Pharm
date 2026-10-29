/* Synako Journal — the blog on /journal: daily notes from the pharmacy, the week in review,
   orders and delivery, customer stories and health tips.
   Staff write, schedule and edit posts on the Pharmacist Desk (Journal). The starter posts below
   cover the first week; a post saved on the desk with the same id replaces its starter version.
   Used by the website AND the server (which checks dates and builds the week-in-review draft). */
(function (root) {
  "use strict";
  const KINDS = {
    diary: { name: "Pharmacy diary", short: "Diary" },
    week: { name: "Week in review", short: "Week in review" },
    orders: { name: "Orders & delivery", short: "Orders" },
    story: { name: "Customer stories", short: "Story" },
    tip: { name: "Health tips", short: "Health tip" }
  };

  /* Posts publish on their date (Nigeria time). Write with blank lines between paragraphs,
     "## " for a subheading, "- " for a list item and [words](/path) for a link inside the shop. */
  const STARTER = [
    { id: "welcome-to-the-synako-journal", kind: "diary", date: "2026-10-29", author: "The Synako team", title: "Welcome to the Synako Journal",
      body: `From today, this page is where we tell you what's happening at Synako Pharmacy, every day.

Each day you'll find a short note from the pharmacy: what came in, what our pharmacists are being asked about, and anything you should know before you order. At the end of each week we'll post a week in review: how many orders we packed and delivered, how quickly they reached you, and what people bought most. We never share names, addresses or anyone's medicines.

## What you'll read here
- **Pharmacy diary**: a short note from the counter, most days
- **Week in review**: the week's orders and deliveries, in numbers
- **Orders & delivery**: how ordering, prescriptions and delivery work
- **Customer stories**: experiences customers have chosen to share with us
- **Health tips**: practical advice from our pharmacists

If there's something you'd like us to write about, [send us a message](/contact). And if we've delivered to you recently, we'd love to hear how it went.` },

    { id: "how-your-order-reaches-you", kind: "orders", date: "2026-10-30", author: "Synako Pharmacy", title: "From basket to your door: how your order reaches you",
      body: `Every order placed on this website goes through the same few steps, and you can follow each one on your order page.

## 1. You place the order
Over-the-counter items are paid for at checkout by card, bank transfer or USSD through Paystack. If your order includes a prescription medicine, you upload the prescription and don't pay anything yet.

## 2. A pharmacist checks it
Prescriptions are reviewed by a registered Synako pharmacist, usually within an hour during opening hours. When it's approved, a **Pay now** button appears on your order page.

## 3. We pack and check
Each item is ticked off a packing checklist, with the batch and expiry checked, and the bag is sealed.

## 4. A rider brings it
When the rider sets off you get a message. You'll also have a 4-digit **delivery code**: give it to the rider at the door, and only then is the order marked as delivered.

You can [track any order](/track) with its number and the last 4 digits of your phone number.` },

    { id: "malaria-as-the-rains-end", kind: "tip", date: "2026-10-31", author: "Synako pharmacists", title: "Health tip: keeping malaria away as the rains end",
      body: `Mosquitoes keep breeding in the puddles and containers the rains leave behind, so the end of the rainy season is no time to relax.

## Protect your home
- Sleep under an insecticide-treated net every night, especially children and pregnant women
- Empty buckets, old tyres, tins and flower-pot trays where water collects
- Close windows and doors at dusk, or fit them with nets

## If someone has a fever
- Get tested before treating. A quick malaria test tells you whether the fever is malaria at all
- If it is, take the full course of the treatment you're given, even when you feel better
- See a doctor straight away if a child, a pregnant woman or an older person has a high fever, is vomiting, drowsy or confused

Our pharmacists can advise you on testing and treatment. [Talk to a pharmacist](/contact) for free, or browse [medicines](/products/otc).` },

    { id: "sending-a-prescription-online", kind: "orders", date: "2026-11-01", author: "Synako pharmacists", title: "Sending a prescription online: what our pharmacist checks",
      body: `You can send us a prescription from your phone. Here's what happens to it, so you know why we sometimes call you.

## What we check
- The prescriber is registered (we check their registration number)
- The prescription is signed, legible and hasn't been altered
- It was issued within the last 6 months
- The medicine, strength and quantity are right for you, including any allergies or other medicines you've told us about

## What happens next
If everything is in order we approve it, and you pay only then. If something is missing we'll ask you for it, and you won't be charged until we can approve it.

Controlled medicines are never sold online. You can [collect them in store](/controlled-medicines) with your original prescription and photo ID.

Ready? [Send a prescription](/prescriptions).` },

    { id: "getting-ready-for-harmattan", kind: "tip", date: "2026-11-02", author: "Synako pharmacists", title: "Health tip: getting ready for harmattan",
      body: `The dry, dusty harmattan wind usually arrives between late November and February. A few small habits help your skin, eyes and chest through it.

## Skin and lips
- Moisturise straight after bathing, while your skin is still slightly damp
- Use a lip balm or petroleum jelly through the day
- Bathe with lukewarm rather than very hot water

## Breathing
- If you have asthma, keep your reliever inhaler with you and check it isn't empty or out of date
- Cover your nose and mouth on very dusty days
- Drink plenty of water, even when you don't feel thirsty

## Eyes
- Don't rub dry, itchy eyes. Ask a pharmacist about lubricating eye drops

See a doctor if a cough lasts more than three weeks or you're short of breath. You'll find moisturisers and lip care in [personal care](/products/personal-care).` },

    { id: "share-your-experience", kind: "story", date: "2026-11-03", author: "The Synako team", title: "Tell us how we did",
      body: `Every week we read what customers tell us about their orders: how quickly the rider arrived, whether the pharmacist's advice helped, and what we could do better.

With your permission, we'll share some of these stories here, using your first name and town only. We never publish your phone number, your address or what you ordered.

## How to share
Use the **Share your experience** form on [the journal page](/journal). It takes a minute, and you can tell us without it being published: just leave the publishing box unticked.

Thank you to everyone who has ordered from us in our first weeks online.` }
  ];

  /* The week in review, from the week's orders: counts and averages only, never names or medicines.
     orders: [{ createdAt, status, rx, speed, city, state, paidAt, deliveredAt, items: [{ id, qty }] }]
     stories: [{ createdAt, rating }] */
  const PAID = ["paid", "packed", "out_for_delivery", "delivered"];
  const lagosDay = (t, tz) => new Date(t).toLocaleDateString("en-CA", { timeZone: tz || "Africa/Lagos" });
  function weekReview(orders, stories, P, DEPTS, end, tz) {
    const to = end ? new Date(end) : new Date(), from = new Date(to.getTime() - 7 * 864e5);
    const inWeek = t => { const x = Date.parse(t); return x > from.getTime() && x <= to.getTime(); };
    const nice = d => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz || "Africa/Lagos" });
    const placed = (orders || []).filter(o => inWeek(o.createdAt));
    const paid = placed.filter(o => PAID.includes(o.status));
    const delivered = (orders || []).filter(o => o.status === "delivered" && inWeek(o.deliveredAt || o.createdAt));
    const rx = placed.filter(o => o.rx), rxDone = rx.filter(o => !["pending_review", "info_needed"].includes(o.status));
    const express = delivered.filter(o => o.speed === "express").length;
    const times = delivered.map(o => (Date.parse(o.deliveredAt) - Date.parse(o.paidAt)) / 6e4).filter(m => m > 0 && m < 7 * 1440);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const towns = new Set(placed.map(o => String(o.city || "").trim().toLowerCase()).filter(Boolean)).size;
    const states = new Set(placed.map(o => String(o.state || "").trim().toLowerCase()).filter(Boolean)).size;
    const byDept = {};
    paid.forEach(o => (o.items || []).forEach(i => { const p = (P || []).find(x => x.id === i.id); if (p && p.dept !== "pom") byDept[p.dept] = (byDept[p.dept] || 0) + (Number(i.qty) || 0); }));
    const top = Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => ((DEPTS || []).find(x => x.id === d) || { name: d }).name.toLowerCase());
    const st = (stories || []).filter(s => inWeek(s.createdAt) && s.rating);
    const stars = st.length ? (st.reduce((t, s) => t + Number(s.rating), 0) / st.length).toFixed(1) : "";
    const n = (k, one, many) => `${k} ${k === 1 ? one : many || one + "s"}`;
    const dur = m => m < 60 ? `${m} minutes` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim();
    const lines = [];
    if (!placed.length && !delivered.length) lines.push("It was a quiet week for online orders. The pharmacy was open as usual, and our pharmacists were on hand in store and on the phone.");
    else {
      lines.push(`This week we received ${n(placed.length, "online order")}${towns ? ` from ${n(towns, "town")}${states > 1 ? ` in ${states} states` : ""}` : ""}, and delivered ${n(delivered.length, "order")}.`);
      const bits = [];
      if (express) bits.push(`- ${n(express, "order")} arrived by 30-minute delivery`);
      if (avg) bits.push(`- From payment to your door took ${dur(avg)} on average`);
      if (rx.length) bits.push(`- Our pharmacists reviewed ${n(rxDone.length, "prescription")}${rxDone.length < rx.length ? ` (${rx.length - rxDone.length} still with us)` : ""}`);
      if (top.length) bits.push(`- What you bought most: ${top.join(", ")}`);
      if (bits.length) lines.push("## The week in numbers\n" + bits.join("\n"));
    }
    if (st.length) lines.push(`## What you told us\n${n(st.length, "customer")} shared their experience this week, with an average rating of ${stars} out of 5. Thank you.`);
    lines.push("## From the counter\n[Add a line or two: what was busy, what came back in stock, anything customers should know for next week.]");
    return { title: `Week in review: ${nice(from)} – ${nice(to)}`, kind: "week", date: lagosDay(to, tz), body: lines.join("\n\n"),
      stats: { placed: placed.length, paid: paid.length, delivered: delivered.length, express, avgMinutes: avg, prescriptions: rxDone.length, towns, stories: st.length } };
  }

  /* Merge starter posts with the ones saved on the desk (a saved post with the same id wins) */
  function merge(saved) {
    const map = new Map(STARTER.map(p => [p.id, Object.assign({ status: "published", starter: true }, p)]));
    (saved || []).forEach(p => { if (p && p.id) map.set(p.id, Object.assign({}, map.get(p.id) || {}, p, { starter: false })); });
    return [...map.values()].sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }
  const isLive = (p, today) => p.status === "published" && p.date <= today;
  const slug = t => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  root.SYNAKO_JOURNAL = { KINDS, STARTER, weekReview, merge, isLive, slug, lagosDay };
})(typeof window !== "undefined" ? window : globalThis);

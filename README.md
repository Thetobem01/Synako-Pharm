# Synako Pharmacy — online shop

Website and order system for Synako Pharmacy, a PCN-registered pharmacy in Nigeria, built from
the Figma file **Synako Pharmacy Store (web)**. Customers can order over-the-counter products,
send prescriptions, pay with Paystack and track their order live. Pharmacists review prescriptions
and run orders from the **Pharmacist Desk** at `/pharmacist`.

## How it works

| Part | Where |
|---|---|
| Website (all pages, mobile menu, checkout, tracking, desk) | `index.html`, `css/`, `js/app.js` |
| **Business details, hours, delivery rules and fees** | `js/config.js` ← edit this |
| Products and prices | `js/data.js` |
| Delivery options and totals (used by site *and* server) | `js/pricing.js` |
| Order API (Vercel serverless functions) | `api/` |

**Orders:** saved in Upstash Redis. The server recalculates every total from `js/data.js` and
`js/pricing.js`, so prices can't be changed in the browser.

**Payments:** Paystack (card, bank transfer, USSD). Over-the-counter orders are paid at checkout.
Prescription orders are paid after the pharmacist approves them: a **Pay now** button appears on
the customer's order page. Payments are verified with Paystack on the server, and a webhook
catches payments if the customer closes the page early.

**Delivery rules** (from `js/config.js`):
- Home delivery in 30 minutes during opening hours (Mon–Sat 7:30am–6:00pm)
- Same-day delivery for orders placed before 2pm
- Orders above ₦999,999.99 are delivered the next day
- Other states: 2–4 working days

**Pharmacist advice:** quick questions under 5 minutes are free; longer consultations are booked
as appointments (fee set in `js/config.js`).

**Prescriptions:** photos are resized in the customer's browser and stored privately; only
signed-in staff can open them. Controlled medicines are not sold online (Electronic Pharmacy
Regulations 2026); `/controlled-medicines` explains in-store collection.

## Go live on Vercel

1. **Import the repo** at vercel.com/new (framework preset "Other", no build command).
2. **Add storage:** in the Vercel project, open *Storage* → *Marketplace* → **Upstash for Redis**
   → create a database and connect it to the project. This adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically.
3. **Add environment variables** (*Settings* → *Environment Variables*):

   | Name | Value |
   |---|---|
   | `PAYSTACK_PUBLIC_KEY` | From Paystack dashboard → Settings → API Keys (`pk_test_…` first, then `pk_live_…`) |
   | `PAYSTACK_SECRET_KEY` | Same page (`sk_test_…`, then `sk_live_…`). Never put this in the code. |
   | `STAFF_PASSWORD` | A strong password for the Pharmacist Desk |
   | `SESSION_SECRET` | Any long random text (signs staff sign-ins) |

4. **Paystack webhook:** in Paystack → Settings → API Keys & Webhooks, set the webhook URL to
   `https://YOUR-DOMAIN/api/paystack-webhook`.
5. **Redeploy**, then place a test order with Paystack's test card before switching to live keys.
6. **Domain:** add it under *Settings* → *Domains*, then update `robots.txt`.

Until storage and Paystack are connected, the checkout shows a "call us to order" message instead
of taking orders.

## Fill in your details

Open `js/config.js` and add: address, city, state, phone, WhatsApp, email, company name and RC
number, PCN premises number, PCN e-pharmacy licence, superintendent pharmacist and PCN reg. no.,
and the ROPSE emblem image. Anything left empty is hidden from customers, and the Pharmacist Desk
shows a list of what's still missing. Set your real delivery fees and consultation fee there too.

**Prices in `js/data.js` are placeholders.** Replace them with your real prices, and have the
superintendent pharmacist confirm each product's OTC / prescription-only classification.

## Run it locally

```bash
npm run dev          # http://localhost:3000 · test storage and payments · desk password "desk"
```

## Fonts

Taken from the Figma file: **DM Sans** (headings, navigation, buttons, body) and **Poppins**
(top bar and product cards), both loaded from Google Fonts.

## Images to export from Figma

The logo (`assets/logo.png`) is already in. Export the rest from the Figma file and save them
with these exact names. Until a file exists, the site shows a drawn placeholder in its place.

| Save as | Figma layer (page "Main Web") |
|---|---|
| `assets/pharmacist-male.webp` ✅ | Frame 145 → header → header pic → **Rectangle 29** (pharmacist on the right of the hero) |
| `assets/hero-bg.jpg` | Frame 145 → header → header pic → **Rectangle 30** (pharmacy shelves) |
| `assets/pharmacist-female.webp` ✅ | Chat → Group 138 → Frame 103 → **Rectangle 31** |
| `assets/delivery.webp` ✅ | Delivery → Group 138 → Frame 103 → **Rectangle 31** |
| `assets/products/<id>.png` | Product photos, named by the product `id` in `js/data.js` (for example `para.png`, `wellman.png`, `omron.png`). A photo replaces the drawn pack image automatically. |
| `assets/mobile-mockup.webp` | Phone mockup in the "Try it now on mobile" banner (taken from the banner image; export **Mockup** from Figma at 2x for a sharper version) |
| `assets/logo.svg` (optional) | The logo as a vector, if you have the source file |

In Figma: select the layer, open **Export** in the right panel, choose PNG at **2x**, and export.
Rename each file to the name in the table **before** uploading (Figma exports them as "Rectangle 29.png" and so on, which the site won't find), then upload to the matching folder on GitHub (Add file → Upload files). PNG is fine for new uploads; the ✅ files have already been added and compressed to WebP.

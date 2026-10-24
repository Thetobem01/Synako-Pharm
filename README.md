# Synako Pharmacy — online shop

Website and order system for Synako Pharmacy, a PCN-registered pharmacy in Nigeria, built from
the Figma file **Synako Pharmacy Store (web)**. Customers can order over-the-counter products,
send prescriptions, pay with Paystack and track their order live. Pharmacists review prescriptions
and run orders from the **Pharmacist Desk** at `/pharmacist`.

## How it works

| Part | Where |
|---|---|
| Website (all pages, mobile menu, checkout, tracking, desk) | `index.html`, `css/`, `js/app.js` |
| **Business details, hours, delivery rules and fees, pausing orders** | `js/config.js` ← edit this |
| Products, prices, departments and wholesale options | `js/data.js` |
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
   `KV_REST_API_TOKEN` automatically. If you gave the connection a prefix (for example `storage_`, giving
   `storage_KV_REST_API_URL`), that's fine: the site accepts prefixed names, and the same goes for a
   Resend connection (`messaging_RESEND_API_KEY`, `messaging_RESEND_EMAIL_DOMAIN`). With the Resend
   connection, emails are sent from `orders@` your verified domain unless you set `MAIL_FROM`.
3. **Add environment variables** (*Settings* → *Environment Variables*):

   | Name | Value |
   |---|---|
   | `PAYSTACK_PUBLIC_KEY` | From Paystack dashboard → Settings → API Keys (`pk_test_…` first, then `pk_live_…`) |
   | `PAYSTACK_SECRET_KEY` | Same page (`sk_test_…`, then `sk_live_…`). Never put this in the code. |
   | `STAFF_PASSWORD` | A strong password for the Pharmacist Desk |
   | `SESSION_SECRET` | Any long random text (signs staff sign-ins) |
   | `RESEND_API_KEY` | *Optional, recommended.* From resend.com → API Keys. Turns on order emails. |
   | `MAIL_FROM` | Sender, e.g. `Synako Pharmacy <orders@yourdomain.com>` (verify the domain in Resend first) |
   | `SITE_URL` | Your public address once a domain is connected, e.g. `https://www.synakopharmacy.com` |
   | `STAFF_EMAIL` | Where new-order, payment and message alerts go, e.g. the pharmacist's inbox |

4. **Paystack webhook:** in Paystack → Settings → API Keys & Webhooks, set the webhook URL to
   `https://YOUR-DOMAIN/api/paystack-webhook`.
5. **Redeploy**, then place a test order with Paystack's test card before switching to live keys.
6. **Domain:** see *Connect your domain* below.

Until storage and Paystack are connected, the checkout shows a "call us to order" message instead
of taking orders.

The Pharmacist Desk lists any hosting settings that are still missing.

## Connect your domain

**Option A: buy it in Vercel (simplest).** In the Vercel project, open *Settings* → *Domains* → *Buy*. Search for the name (for example `synakopharmacy.com` or `synakopharmacy.com.ng`), pay, and Vercel connects it and sets up HTTPS for you. Nothing else to configure.

**Option B: buy it at GoDaddy (or any registrar).**
1. In Vercel, open *Settings* → *Domains*, type your domain (e.g. `synakopharmacy.com`) and press *Add*. Choose the recommended setup: `www.synakopharmacy.com` as the main address, with the bare domain redirecting to it.
2. In GoDaddy, open *My Products* → your domain → *DNS* → *DNS Records*, and set exactly what Vercel shows. Usually:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

   Delete any other `A` record for `@` and any GoDaddy "parked" or forwarding record, or they'll fight with Vercel.
3. Wait until Vercel shows *Valid Configuration* (minutes, sometimes a few hours). HTTPS is added automatically.

**Then tell the site its address:** add an environment variable `SITE_URL` = `https://www.synakopharmacy.com` (no trailing slash) and redeploy, or change `site.url` in `js/config.js`. Emails use this address for tracking links. The sitemap, robots file and page links already switch to your custom domain automatically when visitors arrive on it, so nothing breaks if you forget, but set it anyway. Also update the Paystack webhook URL to the new domain.

## Running the shop day to day

- **Out of stock:** add `out: true` to the product in `js/data.js` and redeploy. It stays visible but can't be ordered, and baskets holding it are asked to remove it. Remove `out: true` when it's back.
- **Pause online orders** (public holiday, stock count, no riders): write the reason in `orders.paused` in `js/config.js` and redeploy. Customers can still browse, and checkout shows your message and your phone number. Set it back to `""` to reopen.
- **Search:** the search box suggests products, departments and popular searches as customers type, and understands common brand names (Panadol, Flagyl, Buscopan, Vicks and more). Add local names to `SYNONYMS` in `js/data.js`.
- **Pharmacist Desk** (`/pharmacist`): review prescriptions, move orders through packed, out for delivery and delivered, **print a delivery note** for the rider, **download orders as CSV** for your accounts, and **mark messages, bookings and trade quotes as handled**.
- **Customers** can see recently viewed products, reorder a past order with one tap from its tracking page, share a product, and add a note at checkout (sizes, delivery instructions). If you set `business.whatsapp`, product pages and the basket also offer *Ask on WhatsApp* / *Send us this basket*.
- **Opening hours** in the top bar show live "Open now until 6pm" or "Closed. Opens 7:30am today", from `hours` in `js/config.js`.

## Receipts and new-order alerts

- **Receipts:** when a payment goes through, the customer's "Payment received" email has the **PDF receipt attached**, plus a link to their order page, where **Download receipt** makes a fresh copy at any time (before payment it's an order summary). Staff can download the same PDF from the Pharmacist Desk. The PDF comes from `js/receipt.js` and shows your business and licence details from `js/config.js`, so fill those in before launch.
- **How the pharmacy hears about orders:** every new order, payment and message emails `STAFF_EMAIL`, and the Pharmacist Desk refreshes every 10 seconds. When something new arrives it **chimes**, shows what came in ("1 new paid order to pack") and counts waiting orders in the browser tab. Keep `/pharmacist` open on the counter computer during opening hours.

## Keep an eye on it

- **Uptime:** add `https://YOUR-DOMAIN/api/health` to a free monitor such as UptimeRobot or Better Stack, so you get an alert if the site goes down.
- **Errors:** Vercel → your project → *Logs* shows every API error. Paystack's dashboard shows every payment and webhook delivery.
- **Visitors (optional):** Vercel → *Analytics* → *Enable* gives privacy-friendly visitor counts without cookies. It also needs its script added to `index.html` (Vercel shows the line to copy); the security policy already allows it because it's served from your own domain.
- **Backups:** Upstash keeps daily backups on paid plans. On the free plan, download orders as CSV from the desk regularly.

## Launch checklist

Work through this before switching to live Paystack keys and sharing the address:

- [ ] All business and licence details filled in `js/config.js` (the desk shows what's missing)
- [ ] Real prices in `js/data.js`, and every product's OTC / prescription-only status confirmed by the superintendent pharmacist
- [ ] Privacy notice, terms of sale and returns policy reviewed by your lawyer, then the "draft" notice removed from those pages (`DRAFT` in `js/app.js`)
- [ ] Real delivery fees, express area and consultation fee set in `js/config.js`
- [ ] Upstash Redis connected, and `STAFF_PASSWORD` and `SESSION_SECRET` set to long random values
- [ ] Order emails set up (`RESEND_API_KEY`, `MAIL_FROM`, `STAFF_EMAIL`) and one test email received
- [ ] One full test order with Paystack's test card: pay, pack, dispatch, deliver
- [ ] One test prescription order: approve on the desk, then pay from the customer's tracking page
- [ ] Paystack webhook URL set, then switch to `pk_live_…` / `sk_live_…` keys and redeploy
- [ ] Custom domain connected, `SITE_URL` set, and the Paystack webhook pointing at the new domain
- [ ] `/api/health` added to an uptime monitor
- [ ] Sitemap submitted in Google Search Console (`https://YOUR-DOMAIN/sitemap.xml`)

## Emails

With the three email settings above, the site sends:

- **To the customer:** order received, payment received, prescription approved (with a link to pay), more information needed, not approved, out for delivery, delivered. Each email links to the order's tracking page.
- **To `STAFF_EMAIL`:** a new order or prescription to review, a payment received, and a new message or consultation request. Staff alerts contain only the order number and a link to the desk, never health details.

Emails are best-effort: if Resend is down, the order still goes through.

## Abuse protection

Each visitor (by IP address) is limited to 10 orders an hour, 6 messages per 10 minutes, 40 order look-ups per 10 minutes and 8 staff sign-in attempts per 15 minutes. Messages also carry a hidden field that only spam bots fill in; those are dropped without being stored. Limits use the same Redis database as orders.

## Fill in your details

Open `js/config.js` and add: address, city, state, phone, WhatsApp, email, company name and RC
number, PCN premises number, PCN e-pharmacy licence, superintendent pharmacist and PCN reg. no.,
and the ROPSE emblem image. Anything left empty is hidden from customers, and the Pharmacist Desk
shows a list of what's still missing. Set your real delivery fees and consultation fee there too.

**Prices in `js/data.js` are placeholders.** Replace them with your real prices, and have the
superintendent pharmacist confirm each product's OTC / prescription-only classification.

## Web standards built in

- **Search engines:** each page sets its own title, description, canonical link and share preview. `/sitemap.xml` and `/robots.txt` are generated from the catalogue (`api/sitemap.js`, `api/robots.js`), so new products are listed automatically. Basket, checkout, tracking and the Pharmacist Desk are kept out of search results.
- **Structured data:** the pharmacy (address, hours, phone) and over-the-counter products are described in schema.org JSON-LD. Prescription medicines are deliberately left out.
- **Share previews:** `assets/og-image.jpg` (1200×630) is shown when the site is shared on WhatsApp, Facebook, LinkedIn or X.
- **Install to home screen:** `manifest.webmanifest` plus icons in `assets/`. For sharper icons, export the logo mark from Figma as SVG or a 1024px PNG and replace `icon-512.png`, `icon-192.png` and `apple-touch-icon.png`.
- **Security headers** (`vercel.json`): Content Security Policy, HSTS, Permissions-Policy, nosniff, frame and referrer rules. The policy allows Paystack only, so if you add another outside service (analytics, chat widget, maps), add its domain to the `Content-Security-Policy` line or it will be blocked. Run a test payment after any change.
- **Accessibility:** WCAG 2.2 AA colour contrast, keyboard navigation, skip link, labelled forms, screen-reader headings and reduced-motion support.
- **Region settings:** language, currency, country and time zone live in `site` in `js/config.js`; prices and dates are formatted from them.

## Departments, retail and wholesale

The store has seven departments (`DEPTS` in `js/data.js`): Medicines (also browsable as tablets & capsules, syrups & liquids, creams & ointments), Prescription medicines, Medical equipment, Surgical supplies, Personal care, Provisions & beverages, and Wines & spirits. Each category in `CATS` belongs to one department.

**Wholesale:** every product can be bought singly or in bulk units (dozen, carton, case, pack), each with its own price. The usual options per department are in `BULK` in `js/data.js`. A product can set its own with `bulk: [["Carton of 48", 48, 8]]` (label, how many, % off the single price), or `bulk: []` for single packs only. Bulk prices are rounded to the nearest ₦50, and the server recalculates every line, so prices can't be changed in the browser.

- Prescription-only medicines are sold in single packs only (up to 10 per order). Licensed premises buy them in bulk through a trade quote.
- Online orders are capped at `orders.maxOnlineTotal` in `js/config.js` (₦10,000,000). Anything larger is sent to the **trade quote** form on `/wholesale`, and those requests appear on the Pharmacist Desk under *Messages & bookings*.
- Single packs go up to 50 per line, and bulk units up to 100 per line.

**Wines & spirits:** visitors confirm they're 18 or over before the section opens, alcohol stays out of general product lists until they do, checkout requires a date of birth showing 18+, and the Pharmacist Desk flags every order with alcohol for a photo-ID check on delivery. **Before launch, confirm with your superintendent pharmacist and lawyer that selling alcohol fits your PCN premises registration and your state's liquor licensing rules**, and keep the drinks physically separate from the dispensary if required.

**Prices for the new departments are placeholders**, like the rest of the catalogue. Brand names (Milo, Peak, Guinness and others) are listed as products you stock; replace or remove any you don't carry.

## Product photos

Products show a drawn pack until you add a photo. Save it as `assets/products/<product id>.webp` (square, at least 800×800, white background), then add the id to the `PHOTOS` list at the top of `js/data.js`, e.g. `para: "webp",`.

## Run it locally

```bash
npm run dev          # http://localhost:3000 · test storage and payments · desk password "desk"
npm test             # pricing rules and the full order API (place, pay, review, track)
npm run check        # syntax check of every script
```

The tests run automatically on GitHub for every pull request (`.github/workflows/ci.yml`).

## Fonts

**Inter** for all text (headings, navigation, buttons, body and prices, with tabular figures so amounts line up), loaded from Google Fonts. To change it, edit the Google Fonts link in `index.html` and `--font` in `css/styles.css`.

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

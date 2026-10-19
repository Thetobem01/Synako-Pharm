# Synako Pharmacy — online shop

Website for Synako Pharmacy, a PCN-registered pharmacy in Nigeria, built from the Figma file
**Synako Pharmacy Store (web)**. It's a front-end prototype: everything runs in the browser,
nothing is stored or sent, and no payment is taken.

## What's in it

**Pages** (each has its own address, ready for your domain):

| Address | Page |
|---|---|
| `/` | Home, following the Figma layout |
| `/products`, `/products/otc`, `/products/prescription`, `/products/<category>` | Shop with categories, search and sorting |
| `/product/<id>` | Product page with active ingredient, strength, pack, classification, storage, warnings |
| `/controlled-medicines` | Why controlled medicines aren't sold online, and how to get them in store |
| `/prescriptions` | Send a prescription |
| `/basket`, `/checkout` | Naira checkout with 18+ check and prescription upload; pay after approval |
| `/track` | Order tracking with full order record |
| `/about`, `/contact`, `/faq`, `/delivery`, `/careers`, `/licences` | Information pages |
| `/privacy`, `/terms`, `/returns`, `/cookies` | Legal drafts (review before launch) |
| `/pharmacist` | Pharmacist review queue |

**Catalogue:** about 55 sample products in `js/data.js`, split into over-the-counter
(10 categories) and prescription-only (6 categories). Each has a drawn pack image (`js/art.js`)
until a real photo is added. **Controlled medicines are deliberately not listed**: the Electronic
Pharmacy Regulations 2026 prohibit selling them online. Every classification must be confirmed by
the superintendent pharmacist.

**Mobile:** hamburger menu with shop, services and company links, search, and the pharmacist line.
A medicines directory above the footer lists OTC, prescription and controlled medicines separately.

## Run it

It's a static site, so there's no build step. Page addresses need a server that sends unknown
paths to `index.html` (Vercel does this via `vercel.json`):

```bash
npx serve -s .
# then open http://localhost:3000
```

**Deploy on Vercel:** import this repo at vercel.com/new, keep the framework preset "Other" and
the build command empty. Every push to `main` deploys; every pull request gets a preview link.
When you buy your domain, add it in the Vercel project under Settings → Domains, then update
`robots.txt` with the sitemap address.

**Editing products:** open `js/data.js`. Each product has a name, ingredient, strength, pack type
(`form`, which decides the drawing), category, `cls` (`otc` or `pom`), sample price and text.

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
| `assets/logo.svg` (optional) | The logo as a vector, if you have the source file |

In Figma: select the layer, open **Export** in the right panel, choose PNG at **2x**, and export.
Rename each file to the name in the table **before** uploading (Figma exports them as "Rectangle 29.png" and so on, which the site won't find), then upload to the matching folder on GitHub (Add file → Upload files). PNG is fine for new uploads; the ✅ files have already been added and compressed to WebP.

## Before launch

Details still to fill in are marked with an orange dashed outline on the page:

- PCN premises number, PCN e-pharmacy licence number, superintendent pharmacist and PCN reg. no.
- Pharmacy address, phone/WhatsApp number, opening hours
- Delivery areas, same-day cut-off and fees, and whether "30 minutes" delivery is achievable
- Real product list, prices and OTC / prescription-only classification (confirmed by the superintendent pharmacist)
- Payment provider (Paystack or Flutterwave)
- Privacy notice (NDPA 2023), terms of sale, returns, delivery and licence pages
- The PCN ROPSE emblem

Under Nigeria's Electronic Pharmacy Regulations 2026, Synako needs a PCN e-pharmacy licence before
taking orders, sells within Nigeria only, supplies prescription-only medicines only against a valid
prescription, and can't sell controlled medicines online. Lyrica (pregabalin) from the Figma design
has been left out for that reason.

## Next: the real build

Accounts, a database, secure prescription file storage, Paystack or Flutterwave payments,
the pharmacist dashboard, and the link to the PCN's National Electronic Pharmacy Platform.

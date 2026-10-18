# Synako Pharmacy — online shop

Front-end prototype of Synako Pharmacy's online store for Nigeria, built from the Figma file
**Synako Pharmacy Store (web)** (page "Main Web").

It covers the full customer journey and the pharmacist's side:

- Home page following the Figma layout: blue top bar, header, hero with pharmacist photo,
  Most Popular Products, Talk to a Pharmacist / Home delivery cards, tabbed product browser,
  prescription steps, mobile section, footer with licence details
- Shop with categories and search, product pages (pharmacy vs prescription-only)
- Basket and Naira checkout with an 18+ check
- Prescription upload with the prescriber details the regulations require; payment only after approval
- Order tracking with a full order record
- Pharmacist review queue (approve, reject, request info)

Everything runs in the browser. No data is stored or sent, and no payment is taken.

## Run it

It's a static site, so there's no build step.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

**Deploy on Vercel:** import this repo at vercel.com/new. Leave the framework preset as "Other"
and the build command empty. Every push to `main` deploys automatically.

## Fonts

Taken from the Figma file: **DM Sans** (headings, navigation, buttons, body) and **Poppins**
(top bar and product cards), both loaded from Google Fonts.

## Images to export from Figma

The logo (`assets/logo.png`) is already in. Export the rest from the Figma file and save them
with these exact names. Until a file exists, the site shows a drawn placeholder in its place.

| Save as | Figma layer (page "Main Web") |
|---|---|
| `assets/pharmacist-male.png` | Frame 145 → header → header pic → **Rectangle 29** (pharmacist on the right of the hero) |
| `assets/hero-bg.jpg` | Frame 145 → header → header pic → **Rectangle 30** (pharmacy shelves) |
| `assets/pharmacist-female.png` | Chat → Group 138 → Frame 103 → **Rectangle 31** |
| `assets/delivery.png` | Delivery → Group 138 → Frame 103 → **Rectangle 31** |
| `assets/products/<id>.png` | Product photos. IDs: `wellman`, `omron`, `immunace`, `secure`, `pears`, `nivea`, `aloe`, `nappy`, `ors`, `thermo`, `para`, `mrdt`, `amlo`, `metf`, `amox`, `al` |
| `assets/logo.svg` (optional) | The logo as a vector, if you have the source file |

In Figma: select the layer, open **Export** in the right panel, choose PNG at **2x**, and export.
Then upload the files to the matching folder on GitHub (Add file → Upload files).

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

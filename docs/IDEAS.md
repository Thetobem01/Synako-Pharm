# Ideas for Synako's online store

A shortlist of what to build next, in the order I'd do it. Each item says why it matters for a
retail and wholesale pharmacy in Okitipupa, roughly how big it is, and anything needed from you.

## Do next (biggest effect for the least work)

1. **Product photos.** Real photos sell far better than the drawn packs. Take square photos on a
   plain white background, send them over, and I'll compress and add them (the shop already swaps
   them in automatically). *Needs: photos. Size: small per batch.*

2. ~~**Unpaid-order reminders and clean-up.**~~ Built (see below). Send one friendly email two hours after an order is left
   unpaid ("Your order is waiting, pay here"), and cancel it automatically after 48 hours so the desk
   stays tidy. Runs once a day on Vercel's free scheduler. *Size: small to medium.*

3. ~~**SMS or WhatsApp order updates.**~~ SMS built; automatic WhatsApp messages need Meta's WhatsApp Business Platform or Termii's WhatsApp channel. Many customers check SMS and WhatsApp before email. A Nigerian
   SMS provider such as Termii costs a few naira per message. Start with "Out for delivery" and
   "Approved, ready to pay". *Needs: an SMS account. Size: medium.*

## Next (bigger steps)

4. ~~**Delivery code for the rider.**~~ Built. The customer gets a 4-digit code and gives it to the rider at the
   door. The rider enters it to mark the order delivered. This proves delivery and helps with
   ID-checked alcohol orders. *Size: medium.*

5. ~~**Rider view.**~~ Built. A phone-friendly page for riders with today's deliveries, addresses, the
   customer's number to call, directions, and a "Delivered" button. *Size: medium.*

6. **Staff accounts.** Separate sign-ins for pharmacists, packers and riders instead of one shared
   password, so the record shows who approved, packed and delivered each order, and a departing
   staff member can be removed. *Size: medium.*

7. **Prescription refill reminders.** For long-term medicines (blood pressure, diabetes, thyroid),
   offer an opt-in reminder before the pack runs out, with a one-tap reorder that still goes through
   the pharmacist. Good care, and good for repeat business. *Size: medium.*

8. **Customer accounts by phone number.** Sign in with a one-time code to see every past order on
    any device, with saved addresses. Orders are currently remembered per device. *Size: medium to
    large.*

9. **Trade accounts for wholesale buyers.** Approved pharmacies, clinics and shops sign in to see
    trade prices, reorder past invoices and, if you choose, pay on agreed terms. *Size: large.*

10. **Stock quantities.** Instead of in/out only, keep a count per product, with a low-stock warning
    on the desk and automatic "out of stock" at zero. *Size: medium.*

## Later

- **Reviews and ratings** on products, approved by staff before they show.
- **Loyalty points** for repeat customers.
- **Daily summary email** to you each evening: orders, takings, what's out of stock.
- **Privacy-friendly visitor counts** with Vercel Web Analytics (no cookies).
- **Data retention:** delete prescription images automatically after an agreed period, in line with
  the Nigeria Data Protection Act. Ask your lawyer what period to use.
- **Second branch**, if you open one: stock and delivery areas per branch.

## Not code, but worth doing at launch

- **Google Business Profile** for "Synako Pharmacy, Okitipupa", with your hours, phone and website,
  so you appear in Google Maps and "pharmacy near me" searches.
- **Google Search Console:** submit `https://YOUR-DOMAIN/sitemap.xml` once the domain is live.
- **WhatsApp Business** on the pharmacist line, with your opening hours and a link to the shop.
- **A printed QR code** at the counter and on delivery bags, linking to the shop.

## Added in this round

- **Email check:** every order records whether its emails were sent (or Resend's reason if not), and
  the desk has a **Send test email** button.
- **Uptime check** that confirms the order database answers: `/api/health?deep=1`.
- **Stock from the desk:** mark products out of stock or back in stock with one click. Customers can
  ask to be told when an item is back, and are emailed automatically.
- **Email typo fix at checkout:** "Did you mean ada@gmail.com?"
- **Today's takings** on the desk header.
- **Promo codes** (for example `WELCOME10`) and **free delivery over a set amount**, both ready in
  `js/config.js` and switched off until you choose the offers.
- **Riders:** a rider page (`/rider`) with Call, WhatsApp and Directions buttons, and a delivery code the customer gives at the door.
- **SMS updates** through Termii (switched off until the account is added), texts to the shop's phone, and one-tap WhatsApp updates from the desk.
- **Unpaid orders:** one reminder after 2 hours, then automatic cancellation after 48 hours.

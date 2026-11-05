/* Synako Journal — the blog on /journal: daily notes from the pharmacy, the week in review,
   orders and delivery, customer stories and health tips.
   Staff write, schedule and edit posts on the Pharmacist Desk (Journal). The posts below are built in
   (the first week, then a post a day from 4 November); a post saved on the desk with the same id replaces its starter version.
   Used by the website AND the server (which checks dates and builds the week-in-review draft). */
(function (root) {
  "use strict";
  const KINDS = {
    diary: { name: "Pharmacy diary", short: "Diary", image: "assets/journal/kind-diary-city.webp" },
    week: { name: "Week in review", short: "Week in review", image: "assets/journal/kind-week-city.webp" },
    orders: { name: "Orders & delivery", short: "Orders", image: "assets/journal/kind-orders-city.webp" },
    story: { name: "Customer stories", short: "Story", image: "assets/journal/kind-story-city.webp" },
    tip: { name: "Health tips", short: "Health tip", image: "assets/journal/kind-tip-city.webp" }
  };
  /* Each post's picture (AI-generated scenes of everyday life in Nigeria): its own, or one for its kind */
  const imageFor = p => (p && p.image) || (KINDS[p && p.kind] || KINDS.diary).image;

  /* Posts publish on their date (Nigeria time). Write with blank lines between paragraphs,
     "## " for a subheading, "- " for a list item and [words](/path) for a link inside the shop. */
  const STARTER = [
    { id: "welcome-to-the-synako-journal", image: "assets/journal/welcome-to-the-synako-journal.webp", kind: "diary", date: "2026-10-29", author: "The Synako team", title: "Welcome to the Synako Journal",
      body: `From today, this page is where we tell you what's happening at Synako Pharmacy, every day.

Each day you'll find a short note from the pharmacy: what came in, what our pharmacists are being asked about, and anything you should know before you order. At the end of each week we'll post a week in review: how many orders we packed and delivered, how quickly they reached you, and what people bought most. We never share names, addresses or anyone's medicines.

## What you'll read here
- **Pharmacy diary**: a short note from the counter, most days
- **Week in review**: the week's orders and deliveries, in numbers
- **Orders & delivery**: how ordering, prescriptions and delivery work
- **Customer stories**: experiences customers have chosen to share with us
- **Health tips**: practical advice from our pharmacists

If there's something you'd like us to write about, [send us a message](/contact). And if we've delivered to you recently, we'd love to hear how it went.` },

    { id: "how-your-order-reaches-you", image: "assets/journal/how-your-order-reaches-you.webp", kind: "orders", date: "2026-10-30", author: "Synako Pharmacy", title: "From basket to your door: how your order reaches you",
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

    { id: "malaria-as-the-rains-end", image: "assets/journal/malaria-as-the-rains-end.webp", kind: "tip", date: "2026-10-31", author: "Synako pharmacists", title: "Health tip: keeping malaria away as the rains end",
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

    { id: "sending-a-prescription-online", image: "assets/journal/sending-a-prescription-online-city.webp", kind: "orders", date: "2026-11-01", author: "Synako pharmacists", title: "Sending a prescription online: what our pharmacist checks",
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

    { id: "getting-ready-for-harmattan", image: "assets/journal/getting-ready-for-harmattan-city.webp", kind: "tip", date: "2026-11-02", author: "Synako pharmacists", title: "Health tip: getting ready for harmattan",
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

    { id: "share-your-experience", image: "assets/journal/share-your-experience-city.webp", kind: "story", date: "2026-11-03", author: "The Synako team", title: "Tell us how we did",
      body: `Every week we read what customers tell us about their orders: how quickly the rider arrived, whether the pharmacist's advice helped, and what we could do better.

With your permission, we'll share some of these stories here, using your first name and town only. We never publish your phone number, your address or what you ordered.

## How to share
Use the **Share your experience** form on [the journal page](/journal). It takes a minute, and you can tell us without it being published: just leave the publishing box unticked.

Thank you to everyone who has ordered from us in our first weeks online.` },
    /* From 4 November: practical health tips and how-to posts, one a day. Each goes live on its date. */
    { id: "fever-in-children", kind: "tip", date: "2026-11-04", author: "Synako pharmacists", title: "Health tip: a child with a fever, what to do at home and when to go",
      body: `A fever is the body fighting an infection, and most fevers in children pass in two or three days. What matters most is how your child is, not just the number on the thermometer.

## At home
- Give plenty of fluids: breast milk, water, or [oral rehydration salts](/product/ors) if they're also vomiting or have diarrhoea
- Dress them in light clothes and keep the room airy. Don't wrap them up or bathe them in cold water
- If they're uncomfortable, give [paracetamol for children](/product/para-syrup) at the dose on the pack for their age and weight. Never give aspirin to a child under 16

## Get a malaria test
In Nigeria, a fever should always be checked for malaria. A [rapid test](/product/mrdt) or a test at a clinic tells you within minutes whether it's malaria and needs treatment.

## Go to a doctor or hospital straight away if your child
- is under 3 months old and has any fever
- is very sleepy, hard to wake, confused or has a fit (convulsion)
- is breathing fast or with difficulty, or the chest pulls in with each breath
- can't drink, or vomits everything
- has a rash that doesn't fade when you press a glass against it
- still has a fever after 3 days

Not sure? [Talk to a pharmacist](/contact). It's free, and we'll tell you honestly if your child needs to be seen.` },

    { id: "oral-rehydration-salts-done-right", kind: "tip", date: "2026-11-05", author: "Synako pharmacists", title: "Health tip: oral rehydration salts, done right",
      body: `Diarrhoea itself is rarely what makes people dangerously ill. Losing too much water and salt is. Oral rehydration salts (ORS) replace both, and they save lives, but only when they're mixed correctly.

## Mixing ORS
- Use clean water: boiled and cooled, or safe bottled water
- Use exactly the amount of water written on the sachet. Too little water makes the drink too salty, which can make things worse
- Don't add sugar, salt or juice
- Throw away what's left after 24 hours and make a fresh batch

## How much to give
- Give small sips often, from a cup or spoon, rather than large amounts at once
- After each loose stool, a child under 2 needs about a quarter to half a cup, older children half to a whole cup, and adults as much as they want
- If they vomit, wait 10 minutes and start again, more slowly
- Keep breastfeeding and keep offering food as soon as they can eat

## Zinc for children
Alongside ORS, children with diarrhoea should take [zinc](/product/zinc) once a day for 10 to 14 days, even after the diarrhoea stops. It shortens the illness and helps prevent the next one. Ask us for the right dose for your child's age.

## See a doctor if
there is blood in the stool, a high fever, the person can't drink, is very sleepy, hasn't passed urine for 6 hours or more, or the diarrhoea lasts more than 2 days in a child or 3 days in an adult.

You'll find ORS and zinc under [stomach and digestion](/products/stomach).` },

    { id: "paying-online-safely", kind: "orders", date: "2026-11-06", author: "Synako Pharmacy", title: "Paying online safely: what we will and won't ask you",
      body: `Payments on this website go through Paystack, a licensed Nigerian payment company. You can pay by card (Verve, Mastercard, Visa), bank transfer or USSD.

## What Synako will never do
- We will never call, text or WhatsApp you to ask for your card number, PIN, CVV or a one-time password (OTP)
- We will never ask you to pay into a personal bank account
- We will never ask you to pay again for an order your order page shows as paid

If anyone contacts you claiming to be from Synako and asks for any of these, don't share them. Call us on the number on this website to check.

## How to know your payment went through
- Your order page shows **Paid**, with the payment method and time
- We email you a receipt as a PDF, and you can download it again from your order page at any time
- When your order is paid you get a 4-digit **delivery code**. Give it only to our rider, at your door

## Prescription orders
For orders with a prescription medicine, you don't pay until our pharmacist has approved the prescription. A **Pay now** button then appears on your order page. If we can't approve it, you're not charged anything.

You can check any order from [Track order](/track) with its number and the last 4 digits of your phone number.` },

    { id: "clean-hands-safe-water", kind: "tip", date: "2026-11-07", author: "Synako pharmacists", title: "Health tip: clean hands and safe water stop most stomach bugs",
      body: `Most diarrhoea, typhoid and cholera spread the same way: germs from stool get onto hands, water or food, and then into the mouth. A few habits break that chain.

## Wash your hands with soap and water
- after using the toilet or changing a nappy
- before cooking, before eating and before feeding a child
- Rub every part of your hands for about 20 seconds, then rinse under running water. A bucket with a tap or a "tippy tap" works well where there's no running water
- [Hand sanitiser](/product/sanit) with at least 60% alcohol helps when soap and water aren't available, but not when your hands are visibly dirty

## Make water safe to drink
- Boil water for at least one minute, then keep it covered in a clean container
- Pour from the container rather than dipping cups into it
- If you can't boil water, a water-treatment product can be used. Follow the instructions exactly

## Food
- Eat food while it's hot, and don't leave cooked food out for hours
- Wash fruit and vegetables with safe water, or peel them

If someone does get diarrhoea, start [oral rehydration salts](/journal/oral-rehydration-salts-done-right) straight away.` },

    { id: "know-your-blood-pressure", kind: "tip", date: "2026-11-08", author: "Synako pharmacists", title: "Health tip: know your blood pressure numbers",
      body: `High blood pressure is common in Nigeria and usually causes no symptoms at all. Many people only find out after a stroke or heart problem. A quick check is the only way to know.

## What the numbers mean
Blood pressure is written as two numbers, for example 120/80.
- **Below 120/80** is a healthy reading for most adults
- **140/90 or above** on readings taken on different days is high blood pressure, and you should see a doctor
- In between, it's worth making changes now and checking again

One high reading isn't a diagnosis: it can rise when you're rushed, anxious or have just had coffee. Sit quietly for 5 minutes before measuring.

## Check it
- Every adult should have their blood pressure checked at least once a year, more often if you're over 40, overweight, pregnant, have diabetes or a family history of high blood pressure or stroke
- A home monitor from [medical equipment](/products/equipment) makes regular checks easy. Measure at the same time each day and write the readings down for your doctor

## Small changes that help
- Use less salt and fewer stock cubes in cooking
- Walk briskly for 30 minutes on most days
- Limit alcohol and stop smoking

If you've been prescribed blood pressure medicine, take it every day, even when you feel well, and don't stop it without speaking to your doctor.` },

    { id: "choosing-a-delivery-option", kind: "orders", date: "2026-11-09", author: "Synako Pharmacy", title: "Which delivery option should I choose?",
      body: `At checkout we show you only the delivery options that can actually reach you, with the price for your town. Here's what each one means.

## Home delivery in 30 minutes
In Okitipupa, during opening hours (Monday to Saturday, 7:30am to 6:00pm). Best for things you need today, such as a fever medicine or a malaria test.

## Same-day delivery
Anywhere in Ondo State, for orders placed before 2pm, Monday to Saturday.

## Next-day delivery
Anywhere in Ondo State. The fee depends on how far your town is from the pharmacy in Okitipupa: towns in Okitipupa LGA pay least, then nearby towns such as Irele and Igbokoda, then central Ondo such as Akure and Ondo town. Type your town at checkout and you'll see your exact fee.

## Other states
We deliver across Nigeria in 2 to 4 working days by courier.

## Good to know
- Prescription orders are delivered once our pharmacist has approved them and you've paid
- The rider will ask for your 4-digit delivery code. Please have it ready
- For items with an age limit, the rider will check photo ID

All fees are on the [Delivery page](/delivery).` },

    { id: "keeping-medicines-safe-in-the-heat", kind: "tip", date: "2026-11-10", author: "Synako pharmacists", title: "Health tip: keeping medicines safe in the heat",
      body: `Heat, damp and sunlight can make medicines weaker before their expiry date. Where you keep them matters.

## Where to keep them
- In a cool, dry place out of direct sunlight, such as a cupboard in a bedroom
- Not in the bathroom or next to the stove, where it's hot and steamy
- Never in a car or a bag left in the sun
- Out of reach and out of sight of children, ideally in a cupboard that's high up or locked

## Keep the packaging
Store tablets in their original strip or bottle, with the leaflet. It protects them from damp and tells you the dose and expiry date.

## Medicines that need the fridge
Some medicines, including insulin and some eye drops and children's antibiotic syrups once mixed, must be kept between 2°C and 8°C. Keep them in the main part of the fridge, not the freezer or door. During power cuts, a cool box or a clay pot can help for short periods. Ask us how long your medicine is safe out of the fridge.

## Check before you use it
Don't use a medicine if it has changed colour or smell, tablets are crumbling or sticky, or it's past its expiry date. Bring old medicines to the pharmacy rather than throwing them in the bin.` },

    { id: "paracetamol-or-ibuprofen", kind: "tip", date: "2026-11-11", author: "Synako pharmacists", title: "Health tip: paracetamol or ibuprofen?",
      body: `Both are good everyday painkillers, but they work differently and suit different people.

## Paracetamol
- Good for headache, toothache, body pains and fever
- Gentle on the stomach and suitable for most people, including in pregnancy
- Adults: 1 or 2 tablets of 500mg every 4 to 6 hours, **no more than 8 tablets in 24 hours**
- Many cold and flu remedies already contain paracetamol. Check the label so you don't take it twice: too much paracetamol can seriously damage the liver

## Ibuprofen
- Good for pain with swelling, such as sprains, back pain, period pain and toothache
- Take it with or after food
- Not suitable if you have a stomach ulcer or have had one, kidney disease, heart failure, or are in the last three months of pregnancy, and use with care if you have asthma. Ask a pharmacist first if you take blood pressure or blood-thinning medicines

## When to see a doctor
If you need painkillers for more than 3 days for a fever, or more than 10 days for pain, see a doctor to find out what's causing it.

Find both under [pain relief](/products/pain), or [ask a pharmacist](/contact) which one is right for you.` },

    { id: "pneumonia-in-children", kind: "tip", date: "2026-11-12", author: "Synako pharmacists", title: "Health tip: spotting pneumonia in children",
      body: `Today is World Pneumonia Day. Pneumonia is an infection of the lungs, and it's one of the biggest causes of death in young children worldwide. Most of those deaths can be prevented when it's caught early.

## Signs to watch for
- Cough or difficulty breathing, often with a fever
- **Fast breathing**: count the breaths for one full minute while the child is calm. It's fast if a baby under 2 months takes 60 or more, a child of 2 to 12 months takes 50 or more, and a child of 1 to 5 years takes 40 or more
- The lower chest pulls in when the child breathes in
- A grunting or wheezing sound

A child with fast breathing or chest pulling in needs to see a doctor **the same day**. Pneumonia needs a proper examination and the right treatment. Cough syrups won't treat it.

## Protecting your child
- Keep up with the free childhood vaccines, including the pneumococcal (PCV) vaccine
- Breastfeed only for the first 6 months if you can
- Keep children away from smoke from cigarettes, generators and cooking fires
- Wash hands with soap, especially before feeding

[Talk to a pharmacist](/contact) if you're unsure, but don't wait if your child is struggling to breathe.` },

    { id: "buying-in-bulk", kind: "orders", date: "2026-11-13", author: "Synako Pharmacy", title: "Buying for a shop, clinic or school: bulk units and trade quotes",
      body: `Many of our products can be ordered by the single pack or in larger units, such as a dozen or a carton, for pharmacies, patent medicine stores, clinics, schools, hotels and events.

## Ordering bulk units online
On a product's page, choose the unit you want before adding it to your basket. The price for the whole unit is shown, and your order summary lists the total number of packs.

## Trade quotes
For bigger orders, or products that aren't on the website, use the [Wholesale page](/wholesale) to request a quote. Tell us your business, the products and quantities, and your state. We'll confirm prices, stock and delivery before you pay. Trade quotes start from ₦100,000.

## Prescription medicines
Prescription-only medicines are supplied only against a valid prescription, or to licensed premises. We'll ask for your licence details with a trade quote.

Questions about an order? [Send us a message](/contact).` },

    { id: "diabetes-warning-signs", kind: "tip", date: "2026-11-14", author: "Synako pharmacists", title: "Health tip: diabetes, the warning signs and why testing matters",
      body: `Today is World Diabetes Day. Type 2 diabetes is becoming more common in Nigeria, and many people have it for years before they know.

## Signs to look out for
- Being very thirsty and passing urine often, including at night
- Feeling tired all the time
- Losing weight without trying
- Blurred vision
- Cuts and sores that heal slowly, or infections that keep coming back

Many people have no signs at all, which is why a simple blood sugar test matters.

## Who should get tested
- Adults over 40
- Anyone who is overweight, has high blood pressure, or has a parent, brother or sister with diabetes
- Women who had diabetes in pregnancy

## If you have diabetes
- Take your medicines as prescribed and keep your clinic appointments
- Check your feet every day for cuts, blisters or sores, and wear shoes or slippers even at home
- Have your eyes checked once a year
- Know the signs of low blood sugar (shaking, sweating, confusion) and carry something sweet

A blood glucose meter from [medical equipment](/products/equipment) helps you check at home. [Ask a pharmacist](/contact) how to use one.` },

    { id: "dust-allergies-and-blocked-noses", kind: "tip", date: "2026-11-15", author: "Synako pharmacists", title: "Health tip: dust, sneezing and blocked noses",
      body: `As the dry season sets in, dust in the air sets off sneezing, a runny or blocked nose and itchy eyes for many people.

## What helps
- **Saline nasal spray** rinses dust out of the nose and eases dryness. It's safe for most people, including in pregnancy, and can be used as often as needed
- **Antihistamine tablets** such as [loratadine](/product/lorat) or [cetirizine](/product/cetiri) calm sneezing and itching. Take one a day. Cetirizine can make some people drowsy, so be careful driving until you know how it affects you
- Drink plenty of water, and keep windows closed on very dusty days

## Ask before you take them if
- you are pregnant or breastfeeding
- you're buying for a child: they need a children's medicine and dose
- you take other medicines that cause drowsiness

## When it's not just dust
See a doctor if you have a high fever, green or bloody mucus for more than 10 days, pain in your face, or wheezing and shortness of breath. People with asthma should keep their reliever inhaler close during harmattan.

Find these under [cough, cold and allergy](/products/cold).` },

    { id: "tell-your-pharmacist", kind: "tip", date: "2026-11-16", author: "Synako pharmacists", title: "Five things to tell your pharmacist every time",
      body: `A pharmacist can only keep you safe with what they know. These five questions take a minute, and they can stop a medicine from doing you harm.

## 1. What other medicines do you take?
Including herbal remedies, supplements and anything you bought at a market. Some combinations don't mix, and some contain the same ingredient twice.

## 2. Do you have any allergies?
Especially to antibiotics such as penicillin, to painkillers, or to sulfa medicines. Tell us what happened when you reacted.

## 3. Are you pregnant, trying for a baby, or breastfeeding?
Many medicines are fine, but some aren't, and some need a different dose.

## 4. Do you have a long-term condition?
Such as high blood pressure, diabetes, asthma, kidney or liver disease, or a stomach ulcer.

## 5. Who is the medicine for?
If it's for a child or an older relative, tell us their age, and their weight for a child.

When you order online, the checkout asks about allergies with prescription orders, and you can add anything else in the delivery note. Our pharmacist will call you if they need to know more.` },

    { id: "folic-acid-before-pregnancy", kind: "tip", date: "2026-11-17", author: "Synako pharmacists", title: "Health tip: folic acid before and during pregnancy",
      body: `Folic acid is a B vitamin that helps a baby's brain and spine form properly in the first weeks of pregnancy, often before a woman knows she is pregnant.

## Who should take it
- Any woman who could become pregnant or is trying for a baby, ideally from 3 months before conceiving
- Every pregnant woman for at least the first 12 weeks

## How much
- Most women need **400 micrograms (0.4mg) a day**, often found in pregnancy multivitamins
- A **higher dose of 5mg** is advised for some women: those with diabetes, sickle cell disease, epilepsy or a high body weight, or who have had a pregnancy affected by a neural tube defect. Your doctor will tell you if this is you, and [5mg tablets](/product/folic) are available

## Also in pregnancy
- Attend antenatal clinic early, and keep going
- Sleep under an insecticide-treated net, and follow your clinic's advice on malaria prevention
- Iron tablets may be advised if you're anaemic
- Check with a pharmacist before taking any medicine, herbal remedy or supplement

Find vitamins under [vitamins and supplements](/products/vitamins), or [talk to a pharmacist](/contact).` },

    { id: "antibiotics-use-them-wisely", kind: "tip", date: "2026-11-18", author: "Synako pharmacists", title: "Antibiotics: use them wisely so they keep working",
      body: `World Antimicrobial Awareness Week starts today. Antibiotics are among the most important medicines we have, but every time they're used when they're not needed, the germs they target get a chance to become resistant. Resistant infections are harder and costlier to treat, and sometimes can't be treated at all.

## Antibiotics don't work on viruses
Colds, most coughs and sore throats, flu and most cases of diarrhoea are caused by viruses. Antibiotics won't make them better faster. Rest, fluids and simple remedies will.

## How you can help
- Only take antibiotics prescribed for you, for this illness, by a doctor or other qualified prescriber
- Take them exactly as prescribed: the right dose, at the right times, for as long as you're told
- Don't save leftovers for next time, and don't share them with family or friends
- Don't buy antibiotics without a prescription. In Nigeria, antibiotics are prescription-only medicines, and we only supply them against a valid prescription
- Bring unused antibiotics back to the pharmacy rather than throwing them away

## Prevent infections in the first place
Wash your hands, keep vaccines up to date, and prepare food safely.

If you have a prescription, you can [send it to us online](/prescriptions) and our pharmacist will check it.` }

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

  root.SYNAKO_JOURNAL = { KINDS, STARTER, imageFor, weekReview, merge, isLive, slug, lagosDay };
})(typeof window !== "undefined" ? window : globalThis);

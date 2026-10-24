/* Synako Pharmacy — business details and rules.
   This one file feeds the whole site AND the server (which uses it to price orders),
   so change details here only. Leave a value as "" if you don't have it yet: the site
   hides anything empty, and the Pharmacist Desk lists what's still missing. */
(function (root) {
  "use strict";
  root.SYNAKO_CONFIG = {
    site: {
      url: "https://synakopharm.vercel.app", // change to your domain when it's connected (no trailing slash)
      locale: "en-NG",            // language and region for dates and numbers (BCP 47)
      currency: "NGN",            // ISO 4217 currency code
      country: "NG",              // ISO 3166 country you sell in
      timezone: "Africa/Lagos"
    },
    business: {
      name: "Synako Pharmacy",
      companyName: "Synako Pharmaceutical LTD", // registered company name
      rcNumber: "",               // CAC RC number
      address: "41 Broad Street", // street address of the pharmacy
      city: "Okitipupa",
      state: "Ondo State",
      phone: "0805 555 9290",     // pharmacist line (shown in the top bar and on receipts)
      phone2: "+44 7928 085848",  // second line, shown on the contact page and in the footer; "" to hide
      whatsapp: "",               // WhatsApp number
      email: "thetobem@gmail.com", // shown to customers and used as the reply-to address on order emails
      instagram: "",              // full URL
      facebook: ""                // full URL
    },
    licences: {
      pcnPremises: "",            // PCN premises certificate number
      pcnEPharmacy: "",           // PCN e-pharmacy licence number
      superintendentName: "",     // e.g. "Pharm. A. B. Surname"
      superintendentPcnReg: "",   // superintendent's PCN registration number
      ropseImage: "",             // path to the PCN ROPSE emblem, e.g. "assets/ropse.png"
      ropseLink: ""               // the PCN register link the emblem points to
    },
    hours: {
      label: "Mon–Sat 7:30am–6:00pm",
      // 0 = Sunday … 6 = Saturday, times in 24h Nigeria time (WAT)
      open: { 1: ["07:30", "18:00"], 2: ["07:30", "18:00"], 3: ["07:30", "18:00"], 4: ["07:30", "18:00"], 5: ["07:30", "18:00"], 6: ["07:30", "18:00"] },
      timezone: "Africa/Lagos"
    },
    delivery: {
      sameDayCutoff: "14:00",     // same-day delivery for orders placed before this time
      expressMinutes: 30,         // home delivery time for express orders
      nextDayThreshold: 999999.99,// orders ABOVE this (₦) are delivered the next day
      fees: {                     // ₦ — set your real fees
        express: 3000,
        sameDay: 2500,
        nextDay: 1500,
        otherStates: 4000
      },
      expressArea: "",            // where 30-minute delivery applies, e.g. "Ikeja and surrounding areas"
      localStates: []             // states that get express / same-day, e.g. ["Lagos"]; empty = all
    },
    orders: {
      paused: "",                 // to stop online orders for a while, write the reason here, e.g. "We're closed for the public holiday and back on Tuesday." Leave "" to take orders.
      maxOnlineTotal: 10000000,   // ₦ — larger orders are asked to request a trade quote instead of paying online
      maxLines: 60                // most different products in one order
    },
    wholesale: {
      minTradeOrder: 100000,      // ₦ — smallest order for a trade quote; set to 0 for none
      note: "Pharmacies, patent medicine stores, hospitals, clinics, schools, hotels, supermarkets and event planners are welcome."
    },
    consultation: {
      freeMinutes: 5,             // free pharmacist chat up to this many minutes
      fee: null                   // ₦ for a booked consultation; null = "confirmed when we call"
    },
    payments: {
      provider: "Paystack",
      currency: "NGN"
    }
  };
})(typeof window !== "undefined" ? window : globalThis);

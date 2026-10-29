/* Synako Pharmacy — catalogue and site content.
   Prices are SAMPLES in Naira. Every product's classification (OTC / prescription-only)
   must be confirmed by Synako's superintendent pharmacist against NAFDAC and PCN lists
   before launch. Controlled medicines are deliberately NOT listed: the Electronic Pharmacy
   Regulations 2026 prohibit selling them online. */
window.SYNAKO = (function () {
  "use strict";

  /* Departments of the store. `cls` on a category: otc = pharmacy medicine, pom = prescription only,
     gen = general retail (not a medicine). `age` = buyers must be at least this old. */
  const DEPTS = [
    { id: "otc",           name: "Medicines",              short: "Medicines",   icon: "pill",    intro: "Tablets, capsules, syrups, creams and ointments you can order straight away." },
    { id: "pom",           name: "Prescription medicines", short: "Prescription", icon: "rx",    intro: "Upload a valid prescription. Our pharmacist checks it before you pay." },
    { id: "equipment",     name: "Medical equipment",      short: "Equipment",   icon: "steth",  intro: "Stethoscopes, BP monitors, bathroom and hospital scales, and home care aids." },
    { id: "surgical",      name: "Surgical supplies",      short: "Surgical",    icon: "syringe", intro: "Face masks, examination and surgical gloves, dressings and consumables." },
    { id: "personal-care", name: "Personal care",          short: "Personal care", icon: "hand", intro: "Soaps, lotions, sanitisers and oral care." },
    { id: "provisions",    name: "Provisions & beverages", short: "Provisions",  icon: "cup",    intro: "Tea, Milo, milk, custard, cornflakes, water and juice." },
    { id: "wines",         name: "Wines & spirits",        short: "Wines & spirits", icon: "wine", intro: "Wines, champagne, spirits and beer. Sold to adults aged 18 and over only.", age: 18 }
  ];
  const CATS = [
    { id: "pain",        dept: "otc", cls: "otc", name: "Pain & fever",               icon: "thermo" },
    { id: "cold",        dept: "otc", cls: "otc", name: "Cough, cold & allergy",      icon: "wind" },
    { id: "stomach",     dept: "otc", cls: "otc", name: "Stomach & digestion",        icon: "pill" },
    { id: "malaria",     dept: "otc", cls: "otc", name: "Malaria prevention & tests", icon: "bug" },
    { id: "vitamins",    dept: "otc", cls: "otc", name: "Vitamins & supplements",     icon: "citrus" },
    { id: "skin",        dept: "otc", cls: "otc", name: "Skin care & first aid",      icon: "bandage" },
    { id: "family",      dept: "otc", cls: "otc", name: "Mother & baby",              icon: "baby" },
    { id: "sexual",      dept: "otc", cls: "otc", name: "Sexual health",              icon: "shield" },
    { id: "rx-heart",     dept: "pom", cls: "pom", name: "Heart & blood pressure",      icon: "heart" },
    { id: "rx-diabetes",  dept: "pom", cls: "pom", name: "Diabetes",                    icon: "drop" },
    { id: "rx-infection", dept: "pom", cls: "pom", name: "Infections & antibiotics",    icon: "germ" },
    { id: "rx-malaria",   dept: "pom", cls: "pom", name: "Malaria treatment",           icon: "bug" },
    { id: "rx-breathing", dept: "pom", cls: "pom", name: "Asthma & breathing",          icon: "wind" },
    { id: "rx-other",     dept: "pom", cls: "pom", name: "Other prescription medicines", icon: "rx" },
    { id: "devices",     dept: "equipment", cls: "gen", name: "Monitors & test kits",          icon: "pulse" },
    { id: "diagnostics", dept: "equipment", cls: "gen", name: "Stethoscopes & diagnostic tools", icon: "steth" },
    { id: "scales",      dept: "equipment", cls: "gen", name: "Weighing scales",               icon: "scale" },
    { id: "mobility",    dept: "equipment", cls: "gen", name: "Mobility & home care",          icon: "mobility" },
    { id: "masks",       dept: "surgical", cls: "gen", name: "Face masks",                     icon: "shield" },
    { id: "gloves",      dept: "surgical", cls: "gen", name: "Examination & surgical gloves",  icon: "hand" },
    { id: "dressings",   dept: "surgical", cls: "gen", name: "Dressings & consumables",        icon: "bandage" },
    { id: "body",        dept: "personal-care", cls: "gen", name: "Body care",                 icon: "hand" },
    { id: "oral",        dept: "personal-care", cls: "gen", name: "Oral care",                 icon: "smile" },
    { id: "hot-drinks",  dept: "provisions", cls: "gen", name: "Tea, Milo & hot drinks",       icon: "cup" },
    { id: "dairy",       dept: "provisions", cls: "gen", name: "Milk",                         icon: "milk" },
    { id: "breakfast",   dept: "provisions", cls: "gen", name: "Cereals, oats & custard",      icon: "grain" },
    { id: "soft-drinks", dept: "provisions", cls: "gen", name: "Water, juice & soft drinks",   icon: "water" },
    { id: "wine",        dept: "wines", cls: "gen", name: "Wine & champagne",                  icon: "wine", age: 18 },
    { id: "spirits",     dept: "wines", cls: "gen", name: "Spirits & liqueurs",                icon: "spirit", age: 18 },
    { id: "beer",        dept: "wines", cls: "gen", name: "Beer & stout",                      icon: "beer", age: 18 }
  ];

  /* form = pack type, used to draw the product image:
     box, bottle, syrup, tube, sachet, blister, jar, spray, inhaler, device, thermo, kit, strips, bar, drops,
     wine, spirit, can, tin, pouch, steth, scale
     bulk = wholesale options as [label, how many, % off]; leave it out to use the department's usual
     options (BULK below), or set bulk: [] for single packs only.
     out: true = out of stock (still shown, but can't be ordered until you remove it). */
  const P = [
    // Pain & fever
    { id: "para", name: "Paracetamol 500mg tablets", generic: "Paracetamol", strength: "500mg", form: "box", pack: "96 tablets", cat: "pain", cls: "otc", brand: "Generic", price: 1200, c: "#3362AB", pop: 1,
      use: "Relief of mild to moderate pain such as headache, toothache and period pain, and to bring down a high temperature.", how: "Take the dose printed on the pack for your age. Leave at least 4 hours between doses and don't exceed the daily maximum on the pack.", warn: "Don't take with other products that contain paracetamol. Speak to our pharmacist first if you have liver problems or drink alcohol regularly." },
    { id: "para-syrup", name: "Paracetamol children's suspension", generic: "Paracetamol", strength: "120mg/5ml", form: "syrup", pack: "100 ml", cat: "pain", cls: "otc", brand: "Generic", price: 1500, c: "#E8892B",
      use: "Pain and fever relief for children.", how: "Use the measuring spoon or syringe provided and follow the dose on the pack for your child's age.", warn: "Not for babies under 2 months unless advised by a doctor. Don't give with other paracetamol products." },
    { id: "ibu", name: "Ibuprofen 200mg tablets", generic: "Ibuprofen", strength: "200mg", form: "box", pack: "24 tablets", cat: "pain", cls: "otc", brand: "Generic", price: 1400, c: "#C94D3F", pop: 1,
      use: "Relief of pain, inflammation and fever.", how: "Take with or after food, following the dose on the pack.", warn: "Not suitable for everyone. Check with our pharmacist if you are pregnant, have asthma, stomach ulcers, kidney or heart problems, or take blood thinners." },
    { id: "diclo-gel", name: "Diclofenac 1% pain relief gel", generic: "Diclofenac", strength: "1%", form: "tube", pack: "50 g", cat: "pain", cls: "otc", brand: "Generic", price: 2300, c: "#2E7DBA",
      use: "Local relief of muscle and joint pain, sprains and strains.", how: "Rub a small amount gently into the painful area up to 3–4 times a day.", warn: "Don't use on broken skin. Ask our pharmacist if you are pregnant or have asthma." },

    // Cough, cold & allergy
    { id: "lorat", name: "Loratadine 10mg allergy tablets", generic: "Loratadine", strength: "10mg", form: "box", pack: "30 tablets", cat: "cold", cls: "otc", brand: "Generic", price: 1800, c: "#6E5BB5",
      use: "Non-drowsy relief from hay fever, itchy eyes, sneezing and skin allergies.", how: "One tablet once a day.", warn: "Ask our pharmacist if you are pregnant, breastfeeding or have liver problems." },
    { id: "cetiri", name: "Cetirizine 10mg tablets", generic: "Cetirizine", strength: "10mg", form: "blister", pack: "30 tablets", cat: "cold", cls: "otc", brand: "Generic", price: 1600, c: "#2F8F83",
      use: "Relief of allergy symptoms such as sneezing, runny nose and itchy skin.", how: "One tablet once a day.", warn: "May cause drowsiness in some people. Avoid alcohol." },
    { id: "cough", name: "Chesty cough syrup (guaifenesin)", generic: "Guaifenesin", strength: "100mg/5ml", form: "syrup", pack: "150 ml", cat: "cold", cls: "otc", brand: "Generic", price: 2100, c: "#B8742B",
      use: "Helps loosen mucus in chesty coughs.", how: "Follow the dose on the pack.", warn: "See a doctor if your cough lasts more than 3 weeks, or you cough up blood. Codeine-containing cough syrups are not sold." },
    { id: "saline", name: "Saline nasal spray", generic: "Sodium chloride 0.9%", strength: "0.9%", form: "spray", pack: "30 ml", cat: "cold", cls: "otc", brand: "Generic", price: 1900, c: "#4A90C8",
      use: "Clears a blocked or dry nose. Suitable for regular use.", how: "1–2 sprays in each nostril as needed.", warn: "Use your own bottle only." },

    // Stomach & digestion
    { id: "ors", name: "Oral rehydration salts", generic: "ORS (low-osmolarity)", strength: "", form: "sachet", pack: "10 sachets", cat: "stomach", cls: "otc", brand: "Generic", price: 1500, c: "#2E9E8F", pop: 1, tile: 1,
      use: "Replaces fluids and salts lost through diarrhoea or vomiting.", how: "Mix one sachet with the exact amount of clean water stated on the pack.", warn: "Get medical help quickly for babies, older adults, blood in stools, or if symptoms last more than 2 days." },
    { id: "zinc", name: "Zinc 20mg dispersible tablets", generic: "Zinc sulphate", strength: "20mg", form: "blister", pack: "10 tablets", cat: "stomach", cls: "otc", brand: "Generic", price: 900, c: "#5E7FA8",
      use: "Used with ORS to help children recover from diarrhoea.", how: "Dissolve in a little water. Follow the course length on the pack.", warn: "Ask our pharmacist about the right dose for babies." },
    { id: "antacid", name: "Antacid suspension, mint", generic: "Aluminium & magnesium hydroxide", strength: "", form: "syrup", pack: "200 ml", cat: "stomach", cls: "otc", brand: "Generic", price: 1700, c: "#3FA06B",
      use: "Quick relief from heartburn and indigestion.", how: "Shake well. Take after meals and at bedtime, following the pack.", warn: "Separate from other medicines by 2 hours. See a doctor if symptoms last more than 2 weeks." },
    { id: "lopera", name: "Loperamide 2mg capsules", generic: "Loperamide", strength: "2mg", form: "box", pack: "12 capsules", cat: "stomach", cls: "otc", brand: "Generic", price: 1100, c: "#7A6A55",
      use: "Short-term relief of sudden diarrhoea in adults.", how: "Follow the dose on the pack.", warn: "Not for children under 12, or if you have a fever or blood in your stools." },

    // Malaria prevention & tests
    { id: "mrdt", name: "Malaria rapid diagnostic test", generic: "Malaria RDT", strength: "", form: "kit", pack: "1 test kit", cat: "malaria", cls: "otc", brand: "Generic", price: 2500, c: "#C94D3F", pop: 1,
      use: "A finger-prick test that shows whether malaria parasites are present, with a result in about 15–20 minutes.", how: "Follow the leaflet step by step and read the result in the time window shown.", warn: "A negative result doesn't rule out every illness. If you still feel unwell, see a doctor." },
    { id: "repel", name: "Insect repellent lotion (DEET 30%)", generic: "DEET", strength: "30%", form: "bottle", pack: "100 ml", cat: "malaria", cls: "otc", brand: "Generic", price: 2600, c: "#4E8F3A",
      use: "Protects against mosquito bites for up to 8 hours.", how: "Apply evenly to exposed skin. Reapply after swimming or sweating.", warn: "Keep away from eyes and mouth. Ask our pharmacist about use on young children." },
    { id: "net", name: "Long-lasting insecticidal mosquito net", generic: "LLIN", strength: "", form: "box", pack: "Double bed size", cat: "malaria", cls: "otc", brand: "Generic", price: 7500, c: "#2D6A9F",
      use: "Protects you from mosquito bites while you sleep.", how: "Hang over the bed and tuck under the mattress.", warn: "Wash gently, no more than the number of times stated on the pack." },

    // Vitamins & supplements
    { id: "wellman", name: "WELLMAN: Health & vitality Original", generic: "Multinutrient for men", strength: "", form: "box", pack: "30 tablets", cat: "vitamins", cls: "otc", brand: "VITABIOTICS", price: 9500, was: 11000, c: "#1F4F9A", pop: 1, tile: 1,
      use: "Daily multinutrient formulated for men.", how: "One tablet a day with your main meal.", warn: "Do not exceed the stated dose. Food supplements are not a substitute for a varied diet." },
    { id: "immunace", name: "IMMUNACE: Immune support Original", generic: "Multinutrient", strength: "", form: "box", pack: "30 tablets", cat: "vitamins", cls: "otc", brand: "VITABIOTICS", price: 8800, was: 9900, c: "#C7742C", pop: 1, tile: 1,
      use: "Multinutrient with vitamins and minerals that support normal immune function.", how: "One tablet a day with your main meal.", warn: "Do not exceed the stated dose." },
    { id: "secure", name: "SECURE: Women's multivitamin", generic: "Multinutrient for women", strength: "", form: "box", pack: "30 tablets", cat: "vitamins", cls: "otc", brand: "VITABIOTICS", price: 8600, c: "#7A4FA0", pop: 1, tile: 1,
      use: "Daily multinutrient formulated for women.", how: "One tablet a day with your main meal.", warn: "Ask our pharmacist if you are pregnant or take other supplements." },
    { id: "vitc", name: "Vitamin C 1000mg effervescent", generic: "Ascorbic acid", strength: "1000mg", form: "bottle", pack: "Tube of 20", cat: "vitamins", cls: "otc", brand: "Generic", price: 3500, c: "#E8A426", tile: 1,
      use: "Food supplement to support normal immune function.", how: "Dissolve one tablet in a glass of water daily.", warn: "Food supplements are not a substitute for a varied diet." },
    { id: "folic", name: "Folic acid 5mg tablets", generic: "Folic acid", strength: "5mg", form: "blister", pack: "28 tablets", cat: "vitamins", cls: "otc", brand: "Generic", price: 800, c: "#D66A8A",
      use: "Supplement used before and during early pregnancy, and for some types of anaemia.", how: "Take as advised by your doctor, midwife or our pharmacist.", warn: "Ask our pharmacist which strength is right for you." },
    { id: "iron", name: "Ferrous sulphate 200mg tablets", generic: "Ferrous sulphate", strength: "200mg", form: "box", pack: "28 tablets", cat: "vitamins", cls: "otc", brand: "Generic", price: 1000, c: "#9B3B3B",
      use: "Iron supplement to treat or prevent iron-deficiency anaemia.", how: "Take with water, ideally with orange juice and away from tea or milk.", warn: "Can darken stools and upset the stomach. Keep out of reach of children: iron overdose is dangerous for them." },

    // Skin care & first aid
    { id: "hydro", name: "Hydrocortisone 1% cream", generic: "Hydrocortisone", strength: "1%", form: "tube", pack: "15 g", cat: "skin", cls: "otc", brand: "Generic", price: 1800, c: "#8A5BB0",
      use: "Relief of mild eczema, insect bites and skin irritation.", how: "Apply thinly once or twice a day for up to 7 days.", warn: "Not for the face, broken or infected skin, or children under 10 without advice." },
    { id: "clotri", name: "Clotrimazole 1% antifungal cream", generic: "Clotrimazole", strength: "1%", form: "tube", pack: "20 g", cat: "skin", cls: "otc", brand: "Generic", price: 1500, c: "#2F8F83",
      use: "Treats fungal skin infections such as athlete's foot and ringworm.", how: "Apply 2–3 times a day and continue for 2 weeks after symptoms clear.", warn: "Ask our pharmacist if the infection is on the scalp or nails." },
    { id: "antisep", name: "Antiseptic liquid (chlorhexidine)", generic: "Chlorhexidine", strength: "", form: "bottle", pack: "250 ml", cat: "skin", cls: "otc", brand: "Generic", price: 2200, c: "#C24E2B",
      use: "Cleans cuts, grazes and minor wounds.", how: "Dilute as directed on the bottle.", warn: "For external use only." },
    { id: "plasters", name: "First aid kit, home", generic: "Assorted dressings", strength: "", form: "kit", pack: "40 pieces", cat: "skin", cls: "otc", brand: "Generic", price: 6500, c: "#C94D3F",
      use: "Plasters, bandages, gauze and tape for minor injuries at home or in the car.", how: "See the guide inside the kit.", warn: "Replace items once used or past their date." },

    // Body care
    { id: "pears", name: "Pears Pure & Gentle soap", generic: "Glycerin soap", strength: "", form: "bar", pack: "125 g bar", cat: "body", cls: "otc", brand: "PEARS", price: 1300, c: "#D9792B", tile: 1,
      use: "Gentle transparent glycerin soap for everyday washing.", how: "Lather with water and rinse.", warn: "For external use only." },
    { id: "nivea", name: "Nivea Cocoa Butter body lotion", generic: "Body lotion", strength: "", form: "bottle", pack: "400 ml", cat: "body", cls: "otc", brand: "NIVEA", price: 5200, c: "#B9893E", tile: 1,
      use: "Moisturising body lotion for dry skin.", how: "Apply to clean skin daily.", warn: "For external use only." },
    { id: "aloe", name: "Aloe vera soothing gel", generic: "Aloe vera", strength: "", form: "jar", pack: "200 ml", cat: "body", cls: "otc", brand: "Generic", price: 3400, c: "#5E9E4A", tile: 1,
      use: "Cooling gel for dry or sun-exposed skin.", how: "Apply a thin layer as needed.", warn: "Stop using if irritation occurs." },
    { id: "sanit", name: "Hand sanitiser, 70% alcohol", generic: "Ethanol 70%", strength: "", form: "bottle", pack: "500 ml", cat: "body", cls: "otc", brand: "Generic", price: 2200, c: "#3FA06B", tile: 1,
      use: "Kills germs on hands when soap and water aren't available.", how: "Rub a palmful over all surfaces of the hands until dry.", warn: "Flammable. Keep away from children and flames." },
    { id: "sunscreen", name: "Sunscreen lotion SPF 50", generic: "Sunscreen", strength: "SPF 50", form: "tube", pack: "100 ml", cat: "body", cls: "otc", brand: "Generic", price: 4800, c: "#E8A426", tile: 1,
      use: "Protects skin from sunburn and sun damage.", how: "Apply generously 15 minutes before sun exposure and reapply every 2 hours.", warn: "Keep out of eyes." },

    // Mother & baby
    { id: "nappy", name: "Zinc oxide nappy cream", generic: "Zinc oxide", strength: "", form: "tube", pack: "50 g", cat: "family", cls: "otc", brand: "Generic", price: 1800, c: "#7A9CCB", tile: 1,
      use: "Soothes and protects skin against nappy rash.", how: "Apply a thin layer at each nappy change.", warn: "Ask our pharmacist if the rash gets worse or lasts more than a few days." },
    { id: "babywipes", name: "Fragrance-free baby wipes", generic: "Baby wipes", strength: "", form: "sachet", pack: "80 wipes", cat: "family", cls: "otc", brand: "Generic", price: 1600, c: "#8CB8E0", tile: 1,
      use: "Gentle cleaning at nappy changes.", how: "Use one wipe at a time and reseal the pack.", warn: "Don't flush." },
    { id: "pregtest", name: "Pregnancy test, early result", generic: "hCG test", strength: "", form: "kit", pack: "2 tests", cat: "family", cls: "otc", brand: "Generic", price: 2000, c: "#D66A8A", tile: 1,
      use: "Detects the pregnancy hormone hCG in urine.", how: "Follow the leaflet. Results in about 3 minutes.", warn: "If you get a positive result, book an appointment with a doctor or antenatal clinic." },
    { id: "gripe", name: "Gripe water for babies", generic: "Gripe water", strength: "", form: "syrup", pack: "150 ml", cat: "family", cls: "otc", brand: "Generic", price: 1700, c: "#5FA8B8", tile: 1,
      use: "Traditionally used to ease wind and colic in babies.", how: "Follow the dose on the pack for your baby's age.", warn: "Ask our pharmacist before using for babies under 1 month." },

    // Sexual health
    { id: "condoms", name: "Latex condoms, regular", generic: "Male condoms", strength: "", form: "box", pack: "12 condoms", cat: "sexual", cls: "otc", brand: "Generic", price: 1500, c: "#3362AB",
      use: "Helps protect against pregnancy and sexually transmitted infections.", how: "Use a new condom every time. Check the expiry date.", warn: "Not suitable if you have a latex allergy." },
    { id: "hivtest", name: "HIV self-test kit (oral)", generic: "HIV self-test", strength: "", form: "kit", pack: "1 test", cat: "sexual", cls: "otc", brand: "Generic", price: 3500, c: "#C94D3F",
      use: "Private oral-fluid test for HIV, with a result in 20 minutes.", how: "Follow the leaflet carefully.", warn: "A reactive result must be confirmed at a clinic. Free support is available; ask our pharmacist." },

    // Health devices & tests
    { id: "omron", name: "EVOLV: Digital BP Monitor", generic: "Blood pressure monitor", strength: "", form: "device", pack: "1 device", cat: "devices", cls: "otc", brand: "OMRON", price: 68000, was: 75000, c: "#1B2A44", pop: 1, tile: 1,
      use: "Upper-arm blood pressure monitor for home use.", how: "Sit quietly for 5 minutes, then measure on a bare upper arm at heart level.", warn: "Share your readings with your doctor or our pharmacist. Don't change any medicine based on one reading." },
    { id: "thermo", name: "Digital thermometer", generic: "Thermometer", strength: "", form: "thermo", pack: "1 device", cat: "devices", cls: "otc", brand: "Generic", price: 3200, c: "#3362AB", tile: 1,
      use: "Measures body temperature under the arm or tongue.", how: "Follow the leaflet. Clean the tip before and after use.", warn: "For babies under 3 months with a high temperature, see a doctor straight away." },
    { id: "gluco", name: "Blood glucose meter starter kit", generic: "Glucometer", strength: "", form: "device", pack: "Meter, 10 strips, lancets", cat: "devices", cls: "otc", brand: "Generic", price: 18500, c: "#2F7A8C", tile: 1,
      use: "Check your blood sugar at home.", how: "Follow the quick-start guide. Our pharmacist can show you how to use it.", warn: "Discuss your readings with your doctor before changing any treatment." },
    { id: "strips", name: "Glucose test strips", generic: "Test strips", strength: "", form: "strips", pack: "50 strips", cat: "devices", cls: "otc", brand: "Generic", price: 9500, c: "#2F7A8C",
      use: "Refill strips for the Synako starter glucose meter.", how: "Use within the time stated after opening the vial.", warn: "Only use with the matching meter." },
    { id: "oximeter", name: "Fingertip pulse oximeter", generic: "Pulse oximeter", strength: "", form: "device", pack: "1 device", cat: "devices", cls: "otc", brand: "Generic", price: 9800, c: "#4A6FA8", tile: 1,
      use: "Measures oxygen level and pulse rate.", how: "Place on a warm finger and stay still for a few seconds.", warn: "Seek urgent help if you are breathless, whatever the reading." },

    // ---------- Prescription-only (POM) ----------
    { id: "amlo", name: "Amlodipine 5mg tablets", generic: "Amlodipine", strength: "5mg", form: "box", pack: "28 tablets", cat: "rx-heart", cls: "pom", brand: "Generic", price: 2900, c: "#6B4FA0",
      use: "Prescribed for high blood pressure and some types of chest pain.", how: "Take exactly as your prescriber directs.", warn: "Prescription only. Our pharmacist checks your prescription before supply." },
    { id: "losartan", name: "Losartan 50mg tablets", generic: "Losartan", strength: "50mg", form: "box", pack: "28 tablets", cat: "rx-heart", cls: "pom", brand: "Generic", price: 3400, c: "#3362AB",
      use: "Prescribed for high blood pressure and to protect the kidneys in diabetes.", how: "Take exactly as your prescriber directs.", warn: "Prescription only. Not for use in pregnancy." },
    { id: "lisino", name: "Lisinopril 10mg tablets", generic: "Lisinopril", strength: "10mg", form: "blister", pack: "28 tablets", cat: "rx-heart", cls: "pom", brand: "Generic", price: 2600, c: "#B8742B",
      use: "Prescribed for high blood pressure and heart failure.", how: "Take exactly as your prescriber directs.", warn: "Prescription only. Tell your doctor if you develop a dry cough." },
    { id: "atorva", name: "Atorvastatin 20mg tablets", generic: "Atorvastatin", strength: "20mg", form: "box", pack: "28 tablets", cat: "rx-heart", cls: "pom", brand: "Generic", price: 3800, c: "#C94D3F",
      use: "Prescribed to lower cholesterol and reduce the risk of heart attack and stroke.", how: "Take exactly as your prescriber directs.", warn: "Prescription only. Report unexplained muscle pain to your doctor." },
    { id: "metf", name: "Metformin 500mg tablets", generic: "Metformin", strength: "500mg", form: "box", pack: "56 tablets", cat: "rx-diabetes", cls: "pom", brand: "Generic", price: 2400, c: "#2F7A8C",
      use: "Prescribed to control blood sugar in type 2 diabetes.", how: "Take exactly as your prescriber directs, usually with meals.", warn: "Prescription only. Our pharmacist checks your prescription before supply." },
    { id: "glib", name: "Glibenclamide 5mg tablets", generic: "Glibenclamide", strength: "5mg", form: "blister", pack: "28 tablets", cat: "rx-diabetes", cls: "pom", brand: "Generic", price: 1600, c: "#5E7FA8",
      use: "Prescribed to lower blood sugar in type 2 diabetes.", how: "Take exactly as your prescriber directs, with breakfast.", warn: "Prescription only. Learn the signs of low blood sugar." },
    { id: "amox", name: "Amoxicillin 500mg capsules", generic: "Amoxicillin", strength: "500mg", form: "box", pack: "21 capsules", cat: "rx-infection", cls: "pom", brand: "Generic", price: 3200, c: "#A0522D",
      use: "Antibiotic prescribed for certain bacterial infections.", how: "Take the full course exactly as prescribed, even if you feel better.", warn: "Prescription only. Tell us about any penicillin allergy." },
    { id: "coamox", name: "Amoxicillin/clavulanate 625mg tablets", generic: "Co-amoxiclav", strength: "625mg", form: "box", pack: "14 tablets", cat: "rx-infection", cls: "pom", brand: "Generic", price: 5600, c: "#7A4FA0",
      use: "Antibiotic prescribed for certain bacterial infections.", how: "Take the full course exactly as prescribed, at the start of a meal.", warn: "Prescription only. Tell us about any penicillin allergy." },
    { id: "cipro", name: "Ciprofloxacin 500mg tablets", generic: "Ciprofloxacin", strength: "500mg", form: "blister", pack: "10 tablets", cat: "rx-infection", cls: "pom", brand: "Generic", price: 2800, c: "#2E7DBA",
      use: "Antibiotic prescribed for certain bacterial infections.", how: "Take exactly as prescribed. Avoid milk and antacids around doses.", warn: "Prescription only." },
    { id: "metro", name: "Metronidazole 400mg tablets", generic: "Metronidazole", strength: "400mg", form: "box", pack: "21 tablets", cat: "rx-infection", cls: "pom", brand: "Generic", price: 1500, c: "#3FA06B",
      use: "Prescribed for certain bacterial and parasitic infections.", how: "Take exactly as prescribed, with or after food.", warn: "Prescription only. Don't drink alcohol during the course and for 48 hours after." },
    { id: "al", name: "Artemether/lumefantrine 20/120mg", generic: "Artemether + lumefantrine", strength: "20/120mg", form: "box", pack: "24 tablets", cat: "rx-malaria", cls: "pom", brand: "Generic", price: 2600, c: "#C24E2B",
      use: "Treatment for uncomplicated malaria.", how: "Take exactly as your prescriber directs, with food or a fatty drink.", warn: "Listed as prescription-only here; your superintendent pharmacist should confirm the classification." },
    { id: "salbu", name: "Salbutamol 100mcg inhaler", generic: "Salbutamol", strength: "100mcg/dose", form: "inhaler", pack: "200 doses", cat: "rx-breathing", cls: "pom", brand: "Generic", price: 3600, c: "#2E7DBA",
      use: "Reliever inhaler for asthma and other breathing problems.", how: "Use as your prescriber directs. Ask our pharmacist to check your technique.", warn: "Prescription only. Get urgent help if your reliever isn't helping." },
    { id: "omep", name: "Omeprazole 20mg capsules", generic: "Omeprazole", strength: "20mg", form: "box", pack: "28 capsules", cat: "rx-other", cls: "pom", brand: "Generic", price: 2200, c: "#6E5BB5",
      use: "Prescribed for stomach ulcers, acid reflux and to protect the stomach.", how: "Take exactly as prescribed, before a meal.", warn: "Prescription only at this strength and pack size." },
    { id: "levo", name: "Levothyroxine 50mcg tablets", generic: "Levothyroxine", strength: "50mcg", form: "blister", pack: "28 tablets", cat: "rx-other", cls: "pom", brand: "Generic", price: 2500, c: "#B8742B",
      use: "Prescribed for an underactive thyroid.", how: "Take every morning on an empty stomach, exactly as prescribed.", warn: "Prescription only." },

    // ---------- More medicines: tablets & capsules ----------
    { id: "aspirin", name: "Aspirin 75mg low-dose tablets", generic: "Aspirin", strength: "75mg", form: "blister", pack: "28 tablets", cat: "pain", brand: "Generic", price: 700, c: "#C94D3F",
      use: "Low-dose aspirin, usually taken daily on a doctor's advice to help prevent heart attack and stroke.", how: "Take once a day with or after food, as advised by your doctor.", warn: "Not for children under 16. Don't take if you have a stomach ulcer or bleeding problem. Ask our pharmacist before starting it yourself." },
    { id: "chlorphen", name: "Chlorphenamine 4mg allergy tablets", generic: "Chlorphenamine", strength: "4mg", form: "blister", pack: "30 tablets", cat: "cold", brand: "Generic", price: 600, c: "#2F8F83",
      use: "Relief of hay fever, itching, hives and other allergy symptoms.", how: "Follow the dose on the pack for your age.", warn: "Causes drowsiness. Don't drive or drink alcohol after taking it." },
    { id: "hyoscine", name: "Hyoscine butylbromide 10mg tablets", generic: "Hyoscine butylbromide", strength: "10mg", form: "box", pack: "20 tablets", cat: "stomach", brand: "Generic", price: 1900, c: "#3FA06B",
      use: "Relief of stomach cramps and period pain.", how: "Follow the dose on the pack.", warn: "Ask our pharmacist if you have glaucoma, a fast heartbeat or trouble passing urine." },
    { id: "albend", name: "Albendazole 400mg deworming tablet", generic: "Albendazole", strength: "400mg", form: "blister", pack: "1 tablet", cat: "stomach", brand: "Generic", price: 500, c: "#B8742B", pop: 1,
      use: "Treats common intestinal worm infections.", how: "Chew or swallow the single tablet. Ask our pharmacist when to repeat.", warn: "Not for use in pregnancy or for children under 2 without advice." },
    { id: "multi", name: "Multivitamin tablets", generic: "Multivitamin", strength: "", form: "bottle", pack: "100 tablets", cat: "vitamins", brand: "Generic", price: 1800, c: "#E8A426",
      use: "Daily vitamins to support general health.", how: "One tablet a day after a meal.", warn: "Do not exceed the stated dose." },
    { id: "vitb", name: "Vitamin B complex tablets", generic: "Vitamin B complex", strength: "", form: "bottle", pack: "100 tablets", cat: "vitamins", brand: "Generic", price: 1200, c: "#C24E2B",
      use: "B vitamins that support energy release and normal nerve function.", how: "One to two tablets a day, or as directed.", warn: "Can colour urine bright yellow; this is harmless." },
    { id: "calcium", name: "Calcium + vitamin D3 tablets", generic: "Calcium carbonate + colecalciferol", strength: "", form: "box", pack: "30 tablets", cat: "vitamins", brand: "Generic", price: 3200, c: "#4A90C8",
      use: "Supports healthy bones and teeth.", how: "One tablet a day with food.", warn: "Ask our pharmacist if you take other medicines, as calcium can affect how some are absorbed." },
    { id: "codliver", name: "Cod liver oil capsules", generic: "Omega-3 fish oil", strength: "", form: "bottle", pack: "60 capsules", cat: "vitamins", brand: "Generic", price: 3900, c: "#D9792B", pop: 1,
      use: "Omega-3 and vitamins A and D for heart, joint and general health.", how: "One to two capsules a day with food.", warn: "Ask our pharmacist if you are pregnant or take blood thinners." },

    // ---------- More medicines: liquids & syrups ----------
    { id: "cough-dry", name: "Dry cough syrup (dextromethorphan)", generic: "Dextromethorphan", strength: "15mg/5ml", form: "syrup", pack: "100 ml", cat: "cold", brand: "Generic", price: 1900, c: "#6E5BB5",
      use: "Calms a dry, tickly cough.", how: "Follow the dose on the pack.", warn: "Not for children under 12, or with some antidepressants. Ask our pharmacist." },
    { id: "multi-syrup", name: "Children's multivitamin syrup", generic: "Multivitamin", strength: "", form: "syrup", pack: "100 ml", cat: "vitamins", brand: "Generic", price: 1600, c: "#E8892B",
      use: "Vitamins for growing children.", how: "Follow the dose on the pack for your child's age.", warn: "Keep out of reach of children." },
    { id: "tonic", name: "Blood tonic syrup (iron + vitamins)", generic: "Iron, folic acid, B vitamins", strength: "", form: "syrup", pack: "200 ml", cat: "vitamins", brand: "Generic", price: 2400, c: "#9B3B3B", pop: 1,
      use: "Helps build healthy blood when iron is low.", how: "Take after meals, following the dose on the pack.", warn: "Can darken stools. Keep out of reach of children." },
    { id: "albend-susp", name: "Albendazole suspension for children", generic: "Albendazole", strength: "200mg/5ml", form: "syrup", pack: "10 ml", cat: "stomach", brand: "Generic", price: 700, c: "#B8742B",
      use: "Treats common worm infections in children over 2.", how: "Shake well. Give the dose shown for your child's age.", warn: "Ask our pharmacist for children under 2." },
    { id: "eyedrops", name: "Lubricating eye drops", generic: "Hypromellose 0.3%", strength: "0.3%", form: "spray", pack: "10 ml", cat: "skin", brand: "Generic", price: 1800, c: "#2E7DBA",
      use: "Soothes dry, tired or gritty eyes.", how: "1–2 drops in each eye as needed.", warn: "See a doctor for a painful or red eye or changes in vision." },
    { id: "calamine", name: "Calamine lotion", generic: "Calamine + zinc oxide", strength: "", form: "bottle", pack: "200 ml", cat: "skin", brand: "Generic", price: 1300, c: "#D66A8A",
      use: "Cools and soothes itchy skin, rashes, insect bites and chickenpox.", how: "Shake well and dab onto the skin.", warn: "For external use only." },

    // ---------- More medicines: creams & ointments ----------
    { id: "balm", name: "Mentholated vapour rub", generic: "Menthol, camphor, eucalyptus oil", strength: "", form: "jar", pack: "50 g", cat: "cold", brand: "Generic", price: 1500, c: "#2F8F83", pop: 1,
      use: "Eases a blocked nose and chest when rubbed on, and soothes muscle aches.", how: "Rub on the chest, throat and back.", warn: "Not for children under 2. Don't apply to the nose, face or broken skin." },
    { id: "whitfield", name: "Whitfield's ointment", generic: "Benzoic acid + salicylic acid", strength: "", form: "jar", pack: "25 g", cat: "skin", brand: "Generic", price: 800, c: "#7A6A55",
      use: "Treats ringworm, athlete's foot and other fungal skin infections.", how: "Apply twice a day to the affected area.", warn: "Don't use on broken skin, the face or near the eyes." },
    { id: "povidone", name: "Povidone-iodine antiseptic solution", generic: "Povidone-iodine 10%", strength: "10%", form: "bottle", pack: "100 ml", cat: "skin", brand: "Generic", price: 1800, c: "#8A4F14",
      use: "Antiseptic for cleaning cuts, grazes and minor burns.", how: "Apply to the wound and allow to dry.", warn: "Not for people with an iodine allergy or thyroid problems." },
    { id: "zinc-oint", name: "Zinc oxide ointment", generic: "Zinc oxide 15%", strength: "15%", form: "tube", pack: "30 g", cat: "skin", brand: "Generic", price: 900, c: "#7A9CCB",
      use: "Protects and soothes sore, chafed or irritated skin.", how: "Apply a thin layer as needed.", warn: "For external use only." },
    { id: "muscle-rub", name: "Muscle and joint rub (methyl salicylate)", generic: "Methyl salicylate + menthol", strength: "", form: "tube", pack: "40 g", cat: "pain", brand: "Generic", price: 1400, c: "#C24E2B",
      use: "Warming relief for muscle aches, back pain and stiff joints.", how: "Massage gently into the painful area up to 3 times a day.", warn: "Don't use with a heat pad, on broken skin, or if you are allergic to aspirin." },

    // ---------- Medical equipment ----------
    { id: "steth", name: "Dual-head stethoscope", generic: "Stethoscope", form: "steth", pack: "1 stethoscope", cat: "diagnostics", brand: "Generic", price: 12500, c: "#1B2A44", pop: 1,
      use: "Dual-head (diaphragm and bell) stethoscope for heart, lung and blood pressure checks. Suitable for students, nurses and clinics.", how: "Clean the chest piece and ear tips with an alcohol wipe between patients.", warn: "Keep away from extreme heat and oils, which damage the tubing." },
    { id: "steth-pro", name: "LITTMANN Classic III stethoscope", generic: "Stethoscope", form: "steth", pack: "1 stethoscope", cat: "diagnostics", brand: "LITTMANN", price: 165000, c: "#2D2F7A", bulk: [["Pack of 5", 5, 4]],
      use: "Professional stethoscope with tunable diaphragms on both sides, for doctors and clinicians.", how: "Follow the care guide in the box.", warn: "Check the serial number on delivery. We supply genuine stock only." },
    { id: "sphyg", name: "Manual BP monitor (aneroid sphygmomanometer)", generic: "Sphygmomanometer", form: "device", pack: "Gauge, adult cuff, bag", cat: "diagnostics", brand: "Generic", price: 18000, c: "#3362AB",
      use: "Manual blood pressure monitor for use with a stethoscope. For clinics and trained users.", how: "Have the gauge calibrated once a year.", warn: "Home users may find a digital monitor easier." },
    { id: "penlight", name: "Diagnostic penlight", generic: "Penlight", form: "thermo", pack: "1 penlight", cat: "diagnostics", brand: "Generic", price: 2500, c: "#5E7FA8",
      use: "Reusable LED penlight for checking eyes and throats.", how: "Replace the batteries when the light dims.", warn: "Don't shine directly into eyes for long." },
    { id: "nebuliser", name: "Compressor nebuliser", generic: "Nebuliser", form: "device", pack: "Nebuliser, mask, tubing", cat: "devices", brand: "Generic", price: 45000, c: "#2F7A8C",
      use: "Turns liquid medicine into a fine mist to breathe in, for asthma and other breathing conditions.", how: "Use only with medicines prescribed for nebulising. Clean after every use.", warn: "Get urgent help if breathing doesn't improve." },
    { id: "scale-bath", name: "Digital bathroom scale", generic: "Bathroom scale", form: "scale", pack: "1 scale, up to 180 kg", cat: "scales", brand: "Generic", price: 15000, c: "#3362AB", pop: 1,
      use: "Glass digital scale for home weight checks, accurate to 100 g.", how: "Place on a hard, flat floor and weigh at the same time each day.", warn: "Not for medical dosing decisions." },
    { id: "scale-mech", name: "Mechanical bathroom scale", generic: "Bathroom scale", form: "scale", pack: "1 scale, up to 130 kg", cat: "scales", brand: "Generic", price: 11000, c: "#C94D3F",
      use: "Dial scale that needs no batteries.", how: "Set the dial to zero before weighing.", warn: "Keep dry." },
    { id: "scale-hosp", name: "Hospital weighing scale with height rod", generic: "Physician scale", form: "scale", pack: "1 scale, up to 200 kg", cat: "scales", brand: "Generic", price: 165000, c: "#1B2A44", bulk: [["Pack of 2", 2, 3], ["Pack of 5", 5, 6]],
      use: "Column scale with a height measuring rod, for hospitals, clinics and schools.", how: "Assemble as shown in the manual and check calibration regularly.", warn: "Heavy item: delivery may take an extra day." },
    { id: "scale-baby", name: "Digital baby weighing scale", generic: "Baby scale", form: "scale", pack: "1 scale, up to 20 kg", cat: "scales", brand: "Generic", price: 38000, c: "#8CB8E0",
      use: "Baby scale with a curved tray, for clinics and home.", how: "Use the tare button to zero with a blanket in the tray.", warn: "Never leave a baby unattended on the scale." },
    { id: "wheelchair", name: "Foldable wheelchair", generic: "Wheelchair", form: "device", pack: "1 wheelchair", cat: "mobility", brand: "Generic", price: 120000, c: "#4A6FA8", bulk: [["Pack of 2", 2, 3], ["Pack of 5", 5, 6]],
      use: "Steel wheelchair that folds flat for travel and storage.", how: "Lock both brakes before getting in or out.", warn: "Maximum user weight 100 kg." },
    { id: "crutches", name: "Elbow crutches, adjustable (pair)", generic: "Crutches", form: "device", pack: "1 pair", cat: "mobility", brand: "Generic", price: 18000, c: "#5E7FA8",
      use: "Lightweight aluminium crutches with adjustable height.", how: "Ask our pharmacist to help you set the right height.", warn: "Check the rubber tips regularly." },
    { id: "hotbottle", name: "Hot water bottle with cover", generic: "Hot water bottle", form: "pouch", pack: "2 litres", cat: "mobility", brand: "Generic", price: 3500, c: "#C24E2B",
      use: "Soothing warmth for aches, cramps and cold nights.", how: "Fill with hot (not boiling) water, about two-thirds full.", warn: "Don't use boiling water or sit or lie on the bottle." },

    // ---------- Surgical supplies ----------
    { id: "mask-3ply", name: "Surgical face masks, 3-ply", generic: "Face masks", form: "box", pack: "Box of 50", cat: "masks", brand: "Generic", price: 3500, c: "#2E7DBA", pop: 1,
      use: "Disposable 3-ply masks with ear loops and a nose wire, for clinics, salons and everyday use.", how: "Cover nose and mouth, press the nose wire, and replace when damp.", warn: "Single use. Don't reuse." },
    { id: "mask-n95", name: "N95 respirator masks", generic: "N95 respirator", form: "box", pack: "Box of 20", cat: "masks", brand: "Generic", price: 12000, c: "#1B2A44",
      use: "Close-fitting respirators that filter at least 95% of airborne particles.", how: "Check the seal each time you put it on.", warn: "Facial hair stops the mask from sealing." },
    { id: "mask-kids", name: "Children's face masks", generic: "Face masks", form: "box", pack: "Box of 50", cat: "masks", brand: "Generic", price: 3800, c: "#D66A8A",
      use: "Smaller 3-ply masks for children aged 4–12.", how: "Make sure it covers nose and mouth.", warn: "Not for children under 2." },
    { id: "glove-latex", name: "Latex examination gloves", generic: "Examination gloves", form: "box", pack: "Box of 100, size M", cat: "gloves", brand: "Generic", price: 6500, c: "#E8A426", pop: 1,
      use: "Non-sterile disposable gloves for examinations, cleaning and food handling.", how: "Choose S, M or L in the note at checkout if you need another size.", warn: "Not for people with a latex allergy: choose nitrile instead." },
    { id: "glove-nitrile", name: "Nitrile examination gloves, powder-free", generic: "Examination gloves", form: "box", pack: "Box of 100, size M", cat: "gloves", brand: "Generic", price: 8500, c: "#4A90C8",
      use: "Latex-free, puncture-resistant disposable gloves.", how: "Single use.", warn: "Change gloves between patients." },
    { id: "glove-surg", name: "Sterile surgical gloves, size 7.5", generic: "Surgical gloves", form: "box", pack: "Box of 50 pairs", cat: "gloves", brand: "Generic", price: 18000, c: "#3FA06B",
      use: "Individually packed sterile latex gloves for surgery and sterile procedures.", how: "Open the inner wrap without touching the glove surface.", warn: "Check the pack is sealed and in date before use." },
    { id: "syringe", name: "Disposable syringes with needle, 5 ml", generic: "Syringes", form: "box", pack: "Box of 100", cat: "dressings", brand: "Generic", price: 6000, c: "#5E7FA8",
      use: "Sterile single-use syringes with a 21G needle.", how: "Single use only. Dispose of in a sharps container.", warn: "Never share or reuse needles." },
    { id: "cotton", name: "Absorbent cotton wool", generic: "Cotton wool", form: "pouch", pack: "500 g roll", cat: "dressings", brand: "Generic", price: 3200, c: "#8CB8E0",
      use: "Cotton wool for cleaning wounds, applying lotions and general care.", how: "Use clean hands and store in a dry place.", warn: "Not sterile." },
    { id: "gauze", name: "Sterile gauze swabs, 10 × 10 cm", generic: "Gauze swabs", form: "box", pack: "Pack of 100", cat: "dressings", brand: "Generic", price: 4000, c: "#2F8F83",
      use: "Sterile swabs for cleaning and dressing wounds.", how: "Open just before use.", warn: "Don't use if the pack is damaged." },
    { id: "crepe", name: "Crepe bandage, 10 cm", generic: "Crepe bandage", form: "box", pack: "12 rolls", cat: "dressings", brand: "Generic", price: 4800, c: "#C7742C",
      use: "Stretch bandage to support sprains and hold dressings in place.", how: "Wrap firmly but not tightly.", warn: "Loosen if fingers or toes go cold, numb or blue." },
    { id: "plaster-roll", name: "Zinc oxide adhesive plaster roll", generic: "Adhesive plaster", form: "box", pack: "1 roll, 7.5 cm × 5 m", cat: "dressings", brand: "Generic", price: 1500, c: "#B9893E",
      use: "Strong adhesive tape for securing dressings and cannulas.", how: "Apply to clean, dry skin.", warn: "Remove gently." },
    { id: "spirit", name: "Methylated spirit", generic: "Methylated spirit", form: "bottle", pack: "1 litre", cat: "dressings", brand: "Generic", price: 3000, c: "#6B4FA0",
      use: "Cleans skin and surfaces before injections and procedures.", how: "Apply with cotton wool.", warn: "Poisonous if swallowed. Highly flammable. Never drink." },
    { id: "blades", name: "Surgical blades, size 22", generic: "Scalpel blades", form: "box", pack: "Box of 100", cat: "dressings", brand: "Generic", price: 5500, c: "#5A6680",
      use: "Sterile carbon-steel blades for clinical use.", how: "Fit with a blade remover or forceps.", warn: "For trained professionals. Dispose of in a sharps container." },
    { id: "caps", name: "Disposable surgical caps", generic: "Surgical caps", form: "box", pack: "Pack of 100", cat: "dressings", brand: "Generic", price: 3500, c: "#4A90C8",
      use: "Non-woven caps for theatres, labs, salons and food handling.", how: "Single use.", warn: "" },

    // ---------- Personal care: oral ----------
    { id: "toothpaste", name: "Fluoride toothpaste", generic: "Toothpaste", form: "tube", pack: "140 g", cat: "oral", brand: "Generic", price: 1100, c: "#2E7DBA",
      use: "Protects against tooth decay.", how: "Brush twice a day for 2 minutes.", warn: "Children under 6: use a pea-sized amount, supervised." },
    { id: "mouthwash", name: "Antiseptic mouthwash", generic: "Mouthwash", form: "bottle", pack: "250 ml", cat: "oral", brand: "Generic", price: 2400, c: "#3FA06B",
      use: "Freshens breath and helps keep gums healthy.", how: "Rinse with 10–20 ml for 30 seconds, then spit out.", warn: "Don't swallow. Not for children under 6." },

    // ---------- Provisions & beverages ----------
    { id: "lipton", name: "LIPTON Yellow Label tea", generic: "Black tea", form: "box", pack: "100 tea bags", cat: "hot-drinks", brand: "LIPTON", price: 3800, c: "#E8A426", pop: 1, tile: 1,
      use: "Classic black tea.", how: "Brew one bag in a cup of freshly boiled water for 2–3 minutes.", warn: "" },
    { id: "greentea", name: "Green tea", generic: "Green tea", form: "box", pack: "25 tea bags", cat: "hot-drinks", brand: "Generic", price: 1800, c: "#4E8F3A", tile: 1,
      use: "Light, refreshing green tea.", how: "Brew in water just off the boil for 2 minutes.", warn: "" },
    { id: "milo", name: "NESTLÉ MILO chocolate malt drink, refill", generic: "Chocolate malt drink", form: "pouch", pack: "500 g", cat: "hot-drinks", brand: "MILO", price: 3900, c: "#2E7D32", pop: 1, tile: 1,
      use: "Chocolate malt drink with vitamins and minerals.", how: "Mix 3 heaped teaspoons with hot or cold milk or water.", warn: "" },
    { id: "milo-tin", name: "NESTLÉ MILO chocolate malt drink, tin", generic: "Chocolate malt drink", form: "tin", pack: "400 g", cat: "hot-drinks", brand: "MILO", price: 4200, c: "#2E7D32", tile: 1,
      use: "Chocolate malt drink in a resealable tin.", how: "Mix 3 heaped teaspoons with milk or water.", warn: "" },
    { id: "bournvita", name: "CADBURY Bournvita, refill", generic: "Chocolate malt drink", form: "pouch", pack: "500 g", cat: "hot-drinks", brand: "BOURNVITA", price: 3700, c: "#6B3A1E", tile: 1,
      use: "Chocolate malt drink.", how: "Mix 3 teaspoons with hot milk or water.", warn: "" },
    { id: "glucose", name: "Glucose-D energy drink powder", generic: "Glucose powder", form: "pouch", pack: "400 g", cat: "hot-drinks", brand: "Generic", price: 2000, c: "#E8892B",
      use: "Quick energy, for example after exercise or when unwell.", how: "Mix 2 tablespoons with a glass of water.", warn: "Not suitable for people with diabetes." },
    { id: "peak-evap", name: "PEAK evaporated milk", generic: "Evaporated milk", form: "tin", pack: "160 g tin", cat: "dairy", brand: "PEAK", price: 650, c: "#1F4F9A", pop: 1, tile: 1, bulk: [["Pack of 12", 12, 3], ["Carton of 48", 48, 8]],
      use: "Rich, creamy evaporated milk for tea, cereals and cooking.", how: "Shake before opening. Refrigerate after opening and use within 2 days.", warn: "" },
    { id: "peak-powder", name: "PEAK full cream milk powder, refill", generic: "Milk powder", form: "pouch", pack: "400 g", cat: "dairy", brand: "PEAK", price: 4800, c: "#1F4F9A", tile: 1,
      use: "Full cream milk powder.", how: "Mix 4 tablespoons in a glass of warm water.", warn: "Not a breast milk substitute." },
    { id: "dano", name: "DANO full cream milk powder, refill", generic: "Milk powder", form: "pouch", pack: "400 g", cat: "dairy", brand: "DANO", price: 4300, c: "#3A7BC8", tile: 1,
      use: "Full cream milk powder.", how: "Mix 4 tablespoons in a glass of warm water.", warn: "Not a breast milk substitute." },
    { id: "cornflakes", name: "KELLOGG'S Corn Flakes", generic: "Breakfast cereal", form: "box", pack: "500 g", cat: "breakfast", brand: "KELLOGG'S", price: 4500, c: "#E8A426", pop: 1, tile: 1,
      use: "Crispy toasted corn flakes, fortified with vitamins and iron.", how: "Serve with cold milk.", warn: "" },
    { id: "goldenmorn", name: "NESTLÉ Golden Morn", generic: "Maize and soya cereal", form: "pouch", pack: "900 g", cat: "breakfast", brand: "GOLDEN MORN", price: 4800, c: "#D9792B", tile: 1,
      use: "Maize and soya cereal with vitamins and minerals.", how: "Mix with warm water or milk.", warn: "" },
    { id: "oats", name: "QUAKER Oats", generic: "Rolled oats", form: "tin", pack: "500 g", cat: "breakfast", brand: "QUAKER", price: 3200, c: "#C94D3F", tile: 1,
      use: "Wholegrain rolled oats.", how: "Cook with water or milk for 3–5 minutes.", warn: "" },
    { id: "custard", name: "Vanilla custard powder", generic: "Custard powder", form: "tin", pack: "400 g", cat: "breakfast", brand: "Generic", price: 2200, c: "#E8C226", tile: 1,
      use: "Smooth vanilla custard for breakfast and desserts.", how: "Mix with a little cold water, then stir in boiling water until thick.", warn: "" },
    { id: "sugar", name: "Sugar cubes", generic: "Sugar", form: "box", pack: "500 g", cat: "breakfast", brand: "Generic", price: 1900, c: "#3362AB", tile: 1,
      use: "Refined white sugar cubes.", how: "", warn: "" },
    { id: "water", name: "Table water, 75 cl (pack of 12)", generic: "Bottled water", form: "bottle", pack: "12 × 75 cl", cat: "soft-drinks", brand: "Generic", price: 3000, c: "#4A90C8", tile: 1, bulk: [["Bundle of 5 packs", 5, 4], ["Bundle of 20 packs", 20, 10]],
      use: "Purified table water.", how: "", warn: "" },
    { id: "juice", name: "100% fruit juice, orange", generic: "Fruit juice", form: "box", pack: "1 litre", cat: "soft-drinks", brand: "Generic", price: 2100, c: "#E8892B", tile: 1,
      use: "100% orange juice with no added sugar.", how: "Refrigerate after opening and use within 4 days.", warn: "" },
    { id: "grape-na", name: "Sparkling red grape drink (non-alcoholic)", generic: "Non-alcoholic grape drink", form: "wine", pack: "75 cl", cat: "soft-drinks", brand: "Generic", price: 2800, c: "#7A1F3D", tile: 1,
      use: "Alcohol-free sparkling grape drink for celebrations.", how: "Serve chilled.", warn: "" },

    // ---------- Wines & spirits (18+) ----------
    { id: "sweet-red", name: "FOUR COUSINS Sweet Red wine", generic: "Red wine", form: "wine", pack: "75 cl, 8% vol", cat: "wine", brand: "FOUR COUSINS", price: 8500, c: "#7A1F3D", pop: 1,
      use: "Smooth, sweet South African red wine.", how: "Serve slightly chilled.", warn: "Drink responsibly. Don't drink alcohol with medicines such as metronidazole, or if pregnant." },
    { id: "carlo-rossi", name: "CARLO ROSSI California Red", generic: "Red wine", form: "wine", pack: "75 cl, 11.5% vol", cat: "wine", brand: "CARLO ROSSI", price: 9500, c: "#5A1A2E",
      use: "Fruity, easy-drinking red wine.", how: "Serve at room temperature.", warn: "Drink responsibly. Not for under-18s or pregnant women." },
    { id: "baron", name: "Dry red table wine", generic: "Red wine", form: "wine", pack: "75 cl, 12% vol", cat: "wine", brand: "Generic", price: 6000, c: "#6B2333",
      use: "Dry Spanish red table wine.", how: "Serve at room temperature.", warn: "Drink responsibly. Not for under-18s or pregnant women." },
    { id: "asti", name: "MARTINI Asti sparkling wine", generic: "Sparkling wine", form: "wine", pack: "75 cl, 7.5% vol", cat: "wine", brand: "MARTINI", price: 16500, c: "#B8902B",
      use: "Sweet Italian sparkling wine.", how: "Serve well chilled.", warn: "Drink responsibly. Not for under-18s or pregnant women." },
    { id: "champagne", name: "MOËT & CHANDON Brut Impérial champagne", generic: "Champagne", form: "wine", pack: "75 cl, 12% vol", cat: "wine", brand: "MOËT", price: 95000, c: "#1B2A44",
      use: "Classic French champagne.", how: "Serve well chilled.", warn: "Drink responsibly. Not for under-18s or pregnant women." },
    { id: "cognac", name: "HENNESSY VS cognac", generic: "Cognac", form: "spirit", pack: "70 cl, 40% vol", cat: "spirits", brand: "HENNESSY", price: 85000, c: "#8A4F14",
      use: "French cognac.", how: "Serve neat, on ice or in a mixed drink.", warn: "Strong spirit. Drink responsibly. Not for under-18s." },
    { id: "whiskey", name: "JAMESON Irish whiskey", generic: "Whiskey", form: "spirit", pack: "75 cl, 40% vol", cat: "spirits", brand: "JAMESON", price: 28000, c: "#2E6B3A",
      use: "Smooth triple-distilled Irish whiskey.", how: "Serve neat, on ice or with a mixer.", warn: "Strong spirit. Drink responsibly. Not for under-18s." },
    { id: "vodka", name: "SMIRNOFF No. 21 vodka", generic: "Vodka", form: "spirit", pack: "75 cl, 37.5% vol", cat: "spirits", brand: "SMIRNOFF", price: 12000, c: "#C94D3F",
      use: "Triple-distilled vodka.", how: "Serve chilled or with a mixer.", warn: "Strong spirit. Drink responsibly. Not for under-18s." },
    { id: "gin", name: "GORDON'S London Dry gin", generic: "Gin", form: "spirit", pack: "75 cl, 37.5% vol", cat: "spirits", brand: "GORDON'S", price: 11500, c: "#2E7D5B",
      use: "Classic London dry gin.", how: "Serve with tonic and ice.", warn: "Strong spirit. Drink responsibly. Not for under-18s." },
    { id: "stout", name: "GUINNESS Foreign Extra Stout, can", generic: "Stout", form: "can", pack: "50 cl can, 7.5% vol", cat: "beer", brand: "GUINNESS", price: 900, c: "#1B1B1B", bulk: [["Pack of 6", 6, 3], ["Carton of 24", 24, 8]],
      use: "Rich, full-bodied stout.", how: "Serve chilled.", warn: "Drink responsibly. Not for under-18s or pregnant women." },
    { id: "lager", name: "HEINEKEN lager, can", generic: "Lager beer", form: "can", pack: "33 cl can, 5% vol", cat: "beer", brand: "HEINEKEN", price: 800, c: "#1F7A3A", bulk: [["Pack of 6", 6, 3], ["Carton of 24", 24, 8]],
      use: "Crisp premium lager.", how: "Serve chilled.", warn: "Drink responsibly. Not for under-18s or pregnant women." }
  ];

  /* Product photos: upload assets/products/<id>.webp (or .png/.jpg) and add the id here.
     Products without a photo show a drawn pack image instead. */
  const PHOTOS = {
    // para: "webp",
  };
  P.forEach(p => { if (PHOTOS[p.id]) p.photo = "assets/products/" + p.id + "." + PHOTOS[p.id]; });

  /* Usual wholesale options per department: [label, how many, % off the single price].
     Prescription medicines are sold in single packs only. */
  const BULK = {
    otc: [["Dozen", 12, 5], ["Carton", 50, 12]],
    pom: [],
    equipment: [["Pack of 5", 5, 5], ["Pack of 10", 10, 10]],
    surgical: [["Carton of 10", 10, 8], ["Carton of 40", 40, 15]],
    "personal-care": [["Dozen", 12, 5], ["Carton of 36", 36, 10]],
    provisions: [["Pack of 6", 6, 4], ["Carton of 24", 24, 10]],
    wines: [["Case of 6", 6, 5], ["Case of 12", 12, 10]]
  };
  const round50 = n => Math.round(n / 50) * 50;
  P.forEach(p => {
    const c = CATS.find(x => x.id === p.cat);
    p.cls = c.cls; p.dept = c.dept;
    if (c.age) p.age = c.age;
    if (p.strength == null) p.strength = "";
    /* units: how the product can be bought. id "1" is the single pack; bulk ids are the count. */
    p.units = [{ id: "1", n: 1, label: "Single", price: p.price, save: 0 }].concat((p.bulk || BULK[c.dept] || []).map(([label, n, off]) =>
      ({ id: String(n), n, label, price: round50(p.price * n * (1 - off / 100)), save: off })));
  });

  /* Other names customers search for, mapped to words in our product names or generics.
     Add local brand names here so search finds the generic we stock. */
  const SYNONYMS = {
    panadol: "paracetamol", emzor: "paracetamol", tylenol: "paracetamol", calpol: "paracetamol suspension",
    advil: "ibuprofen", nurofen: "ibuprofen", brufen: "ibuprofen", voltaren: "diclofenac",
    flagyl: "metronidazole", augmentin: "amoxicillin/clavulanate", amoxil: "amoxicillin", cipro: "ciprofloxacin",
    coartem: "artemether", lonart: "artemether", "malaria drug": "artemether",
    buscopan: "hyoscine", piriton: "chlorphenamine", zyrtec: "cetirizine", clarityne: "loratadine",
    ventolin: "salbutamol", inhaler: "salbutamol", "blood pressure": "bp monitor", bp: "blood pressure",
    glucometer: "glucose meter", "sugar test": "glucose", sanitizer: "sanitiser", nose: "nasal",
    zentel: "albendazole", dewormer: "albendazole", "worm": "albendazole", vicks: "vapour rub", robb: "vapour rub",
    vaseline: "petroleum jelly", mask: "face masks", "nose mask": "face masks", glove: "gloves", syringe: "syringes",
    scale: "weighing scale", "weight": "scale", milo: "milo", beverage: "tea milo bournvita", cornflakes: "corn flakes",
    beer: "lager stout", wine: "wine", whisky: "whiskey", drink: "juice water"
  };

  const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT – Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];

  const FAQ = [
    ["Is Synako a registered pharmacy?", "Yes. Synako operates from a pharmacy premises registered with the Pharmacy Council of Nigeria, supervised by our superintendent pharmacist. Our registration details are at the bottom of every page and on the Our licences page."],
    ["Do I need a prescription?", "Only for prescription-only medicines, which are clearly marked. Over-the-counter products can be ordered straight away, though our pharmacist may contact you before sending some items to check they're right for you."],
    ["What makes a prescription valid?", "It must come from a licensed prescriber, be dated within the last 6 months, and show the prescriber's name, signature, registration number, phone number and a clinic or hospital address in Nigeria."],
    ["When do I pay for prescription medicines?", "After our pharmacist approves your prescription. We send you a payment link; nothing is charged before that."],
    ["Can I order controlled medicines online?", "No. Nigerian law doesn't allow controlled medicines to be sold online. Bring your original prescription to our pharmacy and our pharmacist will help you there."],
    ["Where do you deliver?", "Within Nigeria only. Delivery options and fees are on the Delivery page."],
    ["How do I know the medicines are genuine?", "We buy only NAFDAC-registered products from approved manufacturers and distributors, and record the batch and expiry of every item we send."],
    ["Who can order?", "Adults aged 18 and over. We confirm your age before your first order."],
    ["Do you sell wholesale?", "Yes. Synako is a retail and wholesale pharmacy. Most products can be bought singly or by the dozen, carton, case or pack at bulk prices. Choose the option on the product page and pay at checkout as usual. For very large orders or regular supply, request a trade quote on our Wholesale page."],
    ["Can I buy prescription medicines in bulk?", "Members of the public can buy prescription medicines in single packs against a valid prescription. Licensed pharmacies, hospitals and clinics can buy them in bulk through a trade quote with their PCN or facility licence number."],
    ["Do you sell anything besides medicines?", "Yes: medical equipment such as stethoscopes and bathroom and hospital scales, surgical supplies such as face masks and gloves, personal care, provisions such as tea, Milo, milk, custard and cornflakes, and a wines and spirits section for adults aged 18 and over."],
    ["Who can buy wines and spirits?", "Adults aged 18 and over only. We check your date of birth at checkout and our rider will ask for photo ID on delivery. If no adult with ID is there to receive it, we'll bring the alcohol back."],
    ["Can I return medicines?", "For safety reasons, medicines can't be returned once they've left the pharmacy unless they're faulty or we sent the wrong item. See the Returns page for other products."],
    ["How is my health information protected?", "We handle it under the Nigeria Data Protection Act 2023. Only our pharmacists see your prescriptions, and we never sell your data. See the Privacy notice."]
  ];

  return { DEPTS, CATS, P, STATES, FAQ, SYNONYMS };
})();

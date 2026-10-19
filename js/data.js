/* Synako Pharmacy — catalogue and site content.
   Prices are SAMPLES in Naira. Every product's classification (OTC / prescription-only)
   must be confirmed by Synako's superintendent pharmacist against NAFDAC and PCN lists
   before launch. Controlled medicines are deliberately NOT listed: the Electronic Pharmacy
   Regulations 2026 prohibit selling them online. */
window.SYNAKO = (function () {
  "use strict";

  /* Category groups. `cls` decides which footer column and shop group a category belongs to. */
  const CATS = [
    { id: "pain",     cls: "otc", name: "Pain & fever",             icon: "thermo" },
    { id: "cold",     cls: "otc", name: "Cough, cold & allergy",    icon: "wind" },
    { id: "stomach",  cls: "otc", name: "Stomach & digestion",      icon: "cup" },
    { id: "malaria",  cls: "otc", name: "Malaria prevention & tests", icon: "drop" },
    { id: "vitamins", cls: "otc", name: "Vitamins & supplements",   icon: "sun" },
    { id: "skin",     cls: "otc", name: "Skin care & first aid",    icon: "plus" },
    { id: "body",     cls: "otc", name: "Body care",                icon: "hand" },
    { id: "family",   cls: "otc", name: "Mother & baby",            icon: "heart" },
    { id: "sexual",   cls: "otc", name: "Sexual health",            icon: "shield" },
    { id: "devices",  cls: "otc", name: "Health devices & tests",   icon: "pulse" },
    { id: "rx-heart",     cls: "pom", name: "Heart & blood pressure", icon: "heart" },
    { id: "rx-diabetes",  cls: "pom", name: "Diabetes",               icon: "drop" },
    { id: "rx-infection", cls: "pom", name: "Infections & antibiotics", icon: "shield" },
    { id: "rx-malaria",   cls: "pom", name: "Malaria treatment",      icon: "drop" },
    { id: "rx-breathing", cls: "pom", name: "Asthma & breathing",     icon: "wind" },
    { id: "rx-other",     cls: "pom", name: "Other prescription medicines", icon: "rx" }
  ];

  /* form = pack type, used to draw the product image:
     box, bottle, syrup, tube, sachet, blister, jar, spray, inhaler, device, thermo, kit, strips, bar, drops */
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
      use: "Prescribed for an underactive thyroid.", how: "Take every morning on an empty stomach, exactly as prescribed.", warn: "Prescription only." }
  ];
  P.forEach(p => { p.photo = "assets/products/" + p.id + ".png"; });

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
    ["Can I return medicines?", "For safety reasons, medicines can't be returned once they've left the pharmacy unless they're faulty or we sent the wrong item. See the Returns page for other products."],
    ["How is my health information protected?", "We handle it under the Nigeria Data Protection Act 2023. Only our pharmacists see your prescriptions, and we never sell your data. See the Privacy notice."]
  ];

  return { CATS, P, STATES, FAQ };
})();

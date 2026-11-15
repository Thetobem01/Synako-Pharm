/* Starter list of wholesalers for the Pharmacist Desk (Supply → Wholesalers).
   Server-only: files in api/_lib are never sent to visitors. It is used until staff first save a change
   on the desk; after that the desk's saved list is used. Example:
   { name: "Example Pharma Distributors Ltd", contact: "Mr Ade", phone: "0803 000 0000", whatsapp: "", email: "orders@example.com", leadDays: 3, notes: "Antibiotics, analgesics" } */
export const SUPPLIERS = [
    { name: "Tuyil Pharmaceuticals LTD", contact: "Tuyil Pharma", phone: "0807 876 5654", whatsapp: "0807 876 5654", email: "tuyilpharma@gmail.com", leadDays: 5, notes: "Usually delivers in 4–5 working days." },
    { name: "Emzor Pharmaceutical LTD", contact: "Emzor Pharma", phone: "0807 876 5609", whatsapp: "0807 876 5609", email: "emzorpharma@gmail.com", leadDays: 5, notes: "Company and branded products. Usually delivers in 4–5 working days." },
    { name: "Apacco Pharmaceuticals LTD", contact: "Apacco Pharma", phone: "0807 876 5644", whatsapp: "0807 876 5644", email: "apaccopharma@gmail.com", leadDays: 5, notes: "Company and branded products. Usually delivers in 4–5 working days." },
    { name: "M & B", contact: "Maryer & Barker", phone: "0807 876 5651", whatsapp: "0807 876 5651", email: "mayerbarker@gmail.com", leadDays: 5, notes: "Company and branded products. Usually delivers in 4–5 working days." },
    { name: "Vitabiotics", contact: "VitaBio", phone: "0807 876 5657", whatsapp: "0807 876 5657", email: "vitabio@gmail.com", leadDays: 5, notes: "Company and branded products. Usually delivers in 4–5 working days." },
    { name: "Therapeutic Pharmaceuticals LTD", contact: "Therapeutic Pharma", phone: "0807 876 5611", whatsapp: "0807 876 5611", email: "therapeuticpharma@gmail.com", leadDays: 5, notes: "Branded products. Usually delivers in 4–5 working days." },
    // Email left empty: the list gave Emzor's address (emzorpharma@gmail.com) for this company too
    { name: "Unique Global LTD (UG LTD)", contact: "Unique Pharma", phone: "0807 876 5606", whatsapp: "0807 876 5606", email: "", leadDays: 5, notes: "Branded products. Usually delivers in 4–5 working days. Email address to confirm." }
];

import { handle, only, send, body, fail, db, newId, storageReady, digits, limit, sendEmail, site } from "./_lib/core.js";
const clean = (s, n = 300) => String(s == null ? "" : s).trim().slice(0, n);
/* Messages to a pharmacist and consultation bookings */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  if (!storageReady()) throw fail(503, "Online messages aren't switched on yet. Please call the pharmacy.");
  const b = await body(req);
  if (b.website) return send(res, 201, { id: newId("MSG") }); // hidden field only bots fill in: accept quietly, store nothing
  await limit(req, "requests", 6, 600, "You've sent several messages in a short time. Please call the pharmacy instead.");
  const type = ["message", "appointment", "careers", "trade", "restock"].includes(b.type) ? b.type : "message";
  if (type === "restock") return restock(b, res);
  const r = { id: newId({ appointment: "APT", careers: "JOB", trade: "TRD" }[type] || "MSG"), type, createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120), topic: clean(b.topic, 80), message: clean(b.message, 3000),
    date: clean(b.date, 10), time: clean(b.time, 5), role: clean(b.role, 60), pcn: clean(b.pcn, 40),
    business: clean(b.business, 120), bizType: clean(b.bizType, 60), state: clean(b.state, 40), budget: clean(b.budget, 40) };
  if (type === "trade" && (!r.business || !r.message)) throw fail(400, "Please add your business name and the products and quantities you need.");
  if (!r.name || (type !== "careers" && digits(r.phone).length < 10) || (type === "careers" && !r.email)) throw fail(400, "Please add your name and a way to contact you.");
  if (type === "appointment" && (!r.date || !r.time)) throw fail(400, "Please choose a date and time.");
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  if (process.env.STAFF_EMAIL) await sendEmail(process.env.STAFF_EMAIL, `${{ message: "New message", appointment: "Consultation request", careers: "Careers interest", trade: "Wholesale quote request" }[type]} · ${r.id}`, [`${r.name}${r.business ? ` (${r.business})` : ""} sent a ${{ appointment: "consultation request", careers: "careers enquiry", trade: "wholesale quote request", message: "message" }[type]}. Open the Pharmacist Desk to reply.`]);
  send(res, 201, { id: r.id });
});

/* "Tell me when it's back": a phone number or an email, for one product */
async function restock(b, res) {
  const p = site().P.find(x => x.id === String(b.product || ""));
  if (!p) throw fail(400, "That product isn't in our catalogue.");
  const contact = clean(b.contact, 120);
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact) ? contact : "";
  const phone = email ? "" : (digits(contact).length >= 10 ? contact : "");
  if (!email && !phone) throw fail(400, "Please enter a phone number or an email address.");
  const r = { id: newId("STK"), type: "restock", createdAt: new Date().toISOString(), status: "new", product: p.id, productName: p.name,
    name: clean(b.name, 80) || "Customer", phone, email, message: `Wants to know when ${p.name} (${p.pack}) is back in stock.` };
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  send(res, 201, { id: r.id });
}

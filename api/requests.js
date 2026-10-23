import { handle, only, send, body, fail, db, newId, storageReady, digits, limit, sendEmail } from "./_lib/core.js";
const clean = (s, n = 300) => String(s == null ? "" : s).trim().slice(0, n);
/* Messages to a pharmacist and consultation bookings */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  if (!storageReady()) throw fail(503, "Online messages aren't switched on yet. Please call the pharmacy.");
  const b = await body(req);
  if (b.website) return send(res, 201, { id: newId("MSG") }); // hidden field only bots fill in: accept quietly, store nothing
  await limit(req, "requests", 6, 600, "You've sent several messages in a short time. Please call the pharmacy instead.");
  const type = ["message", "appointment", "careers"].includes(b.type) ? b.type : "message";
  const r = { id: newId(type === "appointment" ? "APT" : type === "careers" ? "JOB" : "MSG"), type, createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120), topic: clean(b.topic, 80), message: clean(b.message, 1500),
    date: clean(b.date, 10), time: clean(b.time, 5), role: clean(b.role, 60), pcn: clean(b.pcn, 40) };
  if (!r.name || (type !== "careers" && digits(r.phone).length < 10) || (type === "careers" && !r.email)) throw fail(400, "Please add your name and a way to contact you.");
  if (type === "appointment" && (!r.date || !r.time)) throw fail(400, "Please choose a date and time.");
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  if (process.env.STAFF_EMAIL) await sendEmail(process.env.STAFF_EMAIL, `${{ message: "New message", appointment: "Consultation request", careers: "Careers interest" }[type]} · ${r.id}`, [`${r.name} sent a ${type === "appointment" ? "consultation request" : type === "careers" ? "careers enquiry" : "message"}. Open the Pharmacist Desk to reply.`]);
  send(res, 201, { id: r.id });
});

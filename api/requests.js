import { handle, only, send, body, fail, db, newId, storageReady, digits } from "./_lib/core.js";
const clean = (s, n = 300) => String(s == null ? "" : s).trim().slice(0, n);
/* Messages to a pharmacist and consultation bookings */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  if (!storageReady()) throw fail(503, "Online messages aren't switched on yet. Please call the pharmacy.");
  const b = await body(req);
  const type = ["message", "appointment", "careers"].includes(b.type) ? b.type : "message";
  const r = { id: newId(type === "appointment" ? "APT" : type === "careers" ? "JOB" : "MSG"), type, createdAt: new Date().toISOString(), status: "new",
    name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120), topic: clean(b.topic, 80), message: clean(b.message, 1500),
    date: clean(b.date, 10), time: clean(b.time, 5), role: clean(b.role, 60), pcn: clean(b.pcn, 40) };
  if (!r.name || (type !== "careers" && digits(r.phone).length < 10) || (type === "careers" && !r.email)) throw fail(400, "Please add your name and a way to contact you.");
  if (type === "appointment" && (!r.date || !r.time)) throw fail(400, "Please choose a date and time.");
  await db.set("req:" + r.id, r);
  await db.index("requests", r.id, Date.now());
  send(res, 201, { id: r.id });
});

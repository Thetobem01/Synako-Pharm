import { handle, only, send, body, fail, site, db, newId, digits, log, publicOrder, storageReady } from "./_lib/core.js";

const MAX_FILE = 900 * 1024; // bytes of base64 text; images are compressed in the browser first
const clean = (s, n = 200) => String(s == null ? "" : s).trim().slice(0, n);

/* Place an order. Prices and delivery are recalculated here from the catalogue. */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  if (!storageReady()) throw fail(503, "Online ordering isn't switched on yet. Please call the pharmacy to order.");
  const b = await body(req);
  const { config, P, pricing } = site();

  const c = b.customer || {}, d = b.delivery || {};
  const customer = { name: clean(c.name, 80), phone: clean(c.phone, 20), email: clean(c.email, 120), dob: clean(c.dob, 10) };
  if (!customer.name || digits(customer.phone).length < 10 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) throw fail(400, "Please check your name, phone number and email.");
  const age = (Date.now() - new Date(customer.dob)) / (365.25 * 864e5);
  if (!(age >= 18)) throw fail(400, "Our medicines can only be supplied to adults aged 18 or over.");
  if (!b.consent) throw fail(400, "Please agree to the privacy notice to continue.");
  const delivery = { state: clean(d.state, 40), city: clean(d.city, 60), addr: clean(d.addr, 200), landmark: clean(d.landmark, 120) };
  if (!delivery.state || !delivery.city || !delivery.addr) throw fail(400, "Please enter your full delivery address.");

  const rxRequest = !!b.rxRequest;
  const q = pricing.quote({ items: b.items || [], state: delivery.state, speed: d.speed, rxRequest }, config, P);
  if (!q.lines.length && !rxRequest) throw fail(400, "Your basket is empty.");
  const rx = rxRequest || q.lines.some(l => l.cls === "pom");

  let prescriber = null, file = null;
  if (rx) {
    const p = b.prescription || {};
    prescriber = { name: clean(p.pname, 80), reg: clean(p.preg, 40), phone: clean(p.pphone, 20), clinic: clean(p.pclinic, 160), issued: clean(p.pdate, 10), allergies: clean(p.allergies, 500) };
    if (!prescriber.name || !prescriber.reg || !prescriber.phone || !prescriber.clinic || !prescriber.issued) throw fail(400, "Please fill in all the prescriber details from your prescription.");
    const months = (Date.now() - new Date(prescriber.issued)) / (30.44 * 864e5);
    if (!(months >= 0 && months <= 6)) throw fail(400, "Prescriptions are valid for 6 months from the date issued. Please upload a current one.");
    const f = p.file || {};
    if (!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(f.data || "")) throw fail(400, "Please upload your prescription as a photo or PDF.");
    if (f.data.length > MAX_FILE) throw fail(413, "That file is too large. Please upload a smaller photo or PDF (under about 650 KB).");
    file = { name: clean(f.name, 120), data: f.data };
  }

  const now = Date.now();
  const o = {
    id: newId(), createdAt: new Date(now).toISOString(), rx, rxRequest,
    status: rx ? "pending_review" : "awaiting_payment",
    items: q.lines.map(({ id, name, qty, price, total, cls }) => ({ id, name, qty, price, total, cls })),
    subtotal: q.subtotal, deliveryFee: q.deliveryFee, total: q.total, priced: !rxRequest,
    delivery: Object.assign(delivery, { speed: q.speed, label: q.speedLabel }),
    customer, prescriber, hasFile: !!file, history: [], payment: { attempts: 0 }
  };
  log(o, "Order placed");
  if (rx) log(o, "Prescription received · waiting for pharmacist review");
  if (q.big) log(o, "Order above the express limit · next-day delivery");
  await db.set("order:" + o.id, o);
  if (file) await db.set("rx:" + o.id, file);
  await db.index("orders", o.id, now);
  send(res, 201, { order: publicOrder(o) });
});

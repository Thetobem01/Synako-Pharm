import { handle, only, send, body, query, fail, requireStaff, db, log, STATUS, notifyCustomer, checkDeliveryCode, limit } from "../_lib/core.js";
import { till, syncShop } from "../_lib/pos.js";

const NEXT = { // allowed staff actions by current status
  pending_review: ["approve", "info", "reject"],
  info_needed: ["approve", "reject", "resume"],
  awaiting_payment: ["cancel"],
  approved_awaiting_payment: ["cancel"],
  paid: ["packed"],
  packed: ["dispatched"],
  out_for_delivery: ["delivered"]
};
const MSG = {
  approve: "Prescription approved by pharmacist · payment link ready",
  info: "Pharmacist needs more information",
  reject: "Prescription not approved",
  resume: "Back in pharmacist review",
  cancel: "Order cancelled",
  packed: "Packed and sealed · batch and expiry recorded",
  dispatched: "Out for delivery",
  delivered: "Delivered"
};

/* GET: full order (with prescription file). POST: pharmacist action. */
export default handle(async (req, res) => {
  if (!only(req, res, "GET", "POST")) return;
  requireStaff(req);
  if (req.method === "GET") {
    const { id } = query(req);
    const o = await db.get("order:" + id);
    if (!o) throw fail(404, "Order not found.");
    const file = o.hasFile ? await db.get("rx:" + o.id) : null;
    return send(res, 200, { order: Object.assign({}, o, { statusLabel: STATUS[o.status], actions: NEXT[o.status] || [] }), file });
  }
  const b = await body(req);
  const o = await db.get("order:" + b.id);
  if (!o) throw fail(404, "Order not found.");
  const action = String(b.action || "");
  if (!(NEXT[o.status] || []).includes(action)) throw fail(409, `You can't do that while the order is "${STATUS[o.status]}".`);
  const note = String(b.note || "").trim().slice(0, 500);
  const by = String(b.by || "Pharmacist").trim().slice(0, 60);
  if (["info", "reject"].includes(action) && !note) throw fail(400, "Add a note so the customer knows what to do next.");
  if (action === "delivered" && o.deliveryCode) { // the customer's code proves delivery; without it, say why (e.g. collected in store)
    if (b.code) {
      await limit(req, "delivery-code", 10, 600, "Too many wrong codes. Please wait a few minutes.");
      if (!checkDeliveryCode(o, b.code)) throw fail(400, "That delivery code isn't right. Ask the customer to check their SMS, email or order page.");
    } else if (!note) throw fail(400, "Enter the customer's delivery code, or add a note saying why there isn't one (for example, collected in store).");
  }

  if (action === "approve") {
    if (o.rxRequest) {
      const extra = Number(b.price);
      if (!(extra > 0)) throw fail(400, "Enter the price for the prescription items.");
      o.items.push({ id: "rx-request", name: String(b.itemsText || "Prescription items").slice(0, 200), qty: 1, price: extra, total: extra, cls: "pom" });
      o.subtotal = Math.round((o.subtotal + extra) * 100) / 100;
      o.total = Math.round((Math.max(0, o.subtotal - (o.discount || 0)) + o.deliveryFee) * 100) / 100;
      o.priced = true;
    }
    o.status = "approved_awaiting_payment";
    o.approvedAt = new Date().toISOString(); o.reminded = ""; // payment reminders count from approval
  } else if (action === "info") o.status = "info_needed";
  else if (action === "reject") o.status = "rejected";
  else if (action === "resume") o.status = "pending_review";
  else if (action === "cancel") o.status = "cancelled";
  else if (action === "packed") o.status = "packed";
  else if (action === "dispatched") { o.status = "out_for_delivery"; if (b.rider) o.rider = String(b.rider).trim().slice(0, 60); }
  else if (action === "delivered") o.status = "delivered";
  o.note = note || o.note || "";
  log(o, MSG[action]);
  log(o, `${MSG[action]} by ${by}${o.rider && action === "dispatched" ? ` · rider ${o.rider}` : ""}${action === "delivered" && b.code ? " · delivery code checked" : ""}${note ? ` · “${note}”` : ""}`, { internal: true });
  await db.set("order:" + o.id, o);
  if (action === "packed") { // the parcel leaves the same shelf the till counts; never blocks packing
    try { await syncShop(await till().takeOnline(o.items, by, o.id), by); } catch (e) { console.error("Shelf count not updated", e); }
  }
  await notifyCustomer(o, action);
  send(res, 200, { order: Object.assign({}, o, { statusLabel: STATUS[o.status], actions: NEXT[o.status] || [] }) });
});

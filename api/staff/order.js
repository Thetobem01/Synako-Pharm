import { handle, only, send, body, query, fail, requireStaff, db, log, STATUS } from "../_lib/core.js";

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

  if (action === "approve") {
    if (o.rxRequest) {
      const extra = Number(b.price);
      if (!(extra > 0)) throw fail(400, "Enter the price for the prescription items.");
      o.items.push({ id: "rx-request", name: String(b.itemsText || "Prescription items").slice(0, 200), qty: 1, price: extra, total: extra, cls: "pom" });
      o.subtotal = Math.round((o.subtotal + extra) * 100) / 100;
      o.total = Math.round((o.subtotal + o.deliveryFee) * 100) / 100;
      o.priced = true;
    }
    o.status = "approved_awaiting_payment";
  } else if (action === "info") o.status = "info_needed";
  else if (action === "reject") o.status = "rejected";
  else if (action === "resume") o.status = "pending_review";
  else if (action === "cancel") o.status = "cancelled";
  else if (action === "packed") o.status = "packed";
  else if (action === "dispatched") o.status = "out_for_delivery";
  else if (action === "delivered") o.status = "delivered";
  o.note = note || o.note || "";
  log(o, MSG[action]);
  log(o, `${MSG[action]} by ${by}${note ? ` · “${note}”` : ""}`, { internal: true });
  await db.set("order:" + o.id, o);
  send(res, 200, { order: Object.assign({}, o, { statusLabel: STATUS[o.status], actions: NEXT[o.status] || [] }) });
});

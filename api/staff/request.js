import { handle, only, send, body, fail, requireStaff, db } from "../_lib/core.js";
/* Pharmacist Desk: mark a message, booking or quote request as handled (or back to new) */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  requireStaff(req);
  const b = await body(req);
  const r = b.id ? await db.get("req:" + String(b.id)) : null;
  if (!r) throw fail(404, "Request not found.");
  r.status = b.status === "new" ? "new" : "done";
  r.handledBy = r.status === "done" ? String(b.by || "Staff").trim().slice(0, 60) : "";
  r.handledAt = r.status === "done" ? new Date().toISOString() : "";
  await db.set("req:" + r.id, r);
  send(res, 200, { request: r });
});

import { handle, only, send, requireStaff, db, site, STATUS } from "../_lib/core.js";
/* Pharmacist Desk: recent orders and requests, plus site details still missing */
export default handle(async (req, res) => {
  if (!only(req, res, "GET")) return;
  requireStaff(req);
  const ids = await db.latest("orders", 200);
  const orders = (await Promise.all(ids.map(id => db.get("order:" + id)))).filter(Boolean).map(o => ({
    id: o.id, createdAt: o.createdAt, status: o.status, statusLabel: STATUS[o.status], rx: o.rx, rxRequest: o.rxRequest,
    customer: o.customer.name, total: o.total, priced: o.priced !== false, items: o.items.map(i => `${i.qty} × ${i.name}`), speed: o.delivery.label
  }));
  const rids = await db.latest("requests", 100);
  const requests = (await Promise.all(rids.map(id => db.get("req:" + id)))).filter(Boolean);
  const { config } = site(), b = config.business, l = config.licences;
  const missing = [
    ["Pharmacy address", b.address], ["City", b.city], ["State", b.state], ["Phone number", b.phone], ["Email", b.email],
    ["Company name", b.companyName], ["RC number", b.rcNumber], ["PCN premises number", l.pcnPremises], ["PCN e-pharmacy licence", l.pcnEPharmacy],
    ["Superintendent pharmacist", l.superintendentName], ["Superintendent PCN reg. no.", l.superintendentPcnReg], ["PCN ROPSE emblem", l.ropseImage]
  ].filter(([, v]) => !v).map(([k]) => k);
  send(res, 200, { orders, requests, missing, serverTime: new Date().toISOString() });
});

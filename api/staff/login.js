import { handle, only, send, body, fail, checkPassword, checkRiderPassword, checkPosPassword, issueToken, staffReady, riderReady, posReady, limit, requireSignedIn, storageReady } from "../_lib/core.js";
import { signIn, changePassword, ROLES } from "../_lib/staff.js";
/* Sign-in. Staff use their own username and password (accounts are made by an admin on the desk's Team page).
   The owner's master password (STAFF_PASSWORD) also opens the desk as an admin. The shared RIDER_PASSWORD (rider page)
   and POS_PASSWORD (till) still work. POST { action: "change-password", current, password } with a token changes your own password. */
const DESK = ["admin", "pharmacist", "staff"];
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  const b = await body(req);
  if (b.action === "change-password") {
    const me = await requireSignedIn(req);
    if (!me.id) throw fail(400, "The master password can't be changed here. Change STAFF_PASSWORD in the hosting settings.");
    await limit(req, "change-password", 8, 900, "Too many attempts. Please wait 15 minutes and try again.");
    await changePassword(me.id, b.current, b.password);
    return send(res, 200, { ok: true });
  }
  const { password, role, username } = b;
  const rider = role === "rider", till = role === "pos";
  if (!staffReady() && !storageReady() && !(rider && riderReady()) && !(till && posReady())) throw fail(503, rider ? "Rider sign-in isn't set up yet. Add RIDER_PASSWORD in the hosting settings." : till ? "Till sign-in isn't set up yet. Add POS_PASSWORD (or STAFF_PASSWORD) in the hosting settings." : "Staff sign-in isn't set up yet. Add STAFF_PASSWORD in the hosting settings.");
  await limit(req, "staff-login", 8, 900, "Too many sign-in attempts. Please wait 15 minutes and try again.");
  const named = String(username || "").trim().slice(0, 60);
  const acc = storageReady() && username ? await signIn(username, password) : null;
  if (acc) {
    const who = { name: acc.name, username: acc.username, roleLabel: ROLES[acc.role], mustChange: !!acc.mustChange };
    if (rider) return send(res, 200, Object.assign(who, { token: issueToken(14, "rider", acc.id), role: "rider" })); // anyone may deliver
    if (till) {
      if (acc.role === "rider") throw fail(403, "This account is for the rider page. Open /rider to see your deliveries.");
      const manager = ["admin", "pharmacist"].includes(acc.role); // managers can void sales; "staff" is the till's word for a manager
      return send(res, 200, Object.assign(who, { token: issueToken(14, DESK.includes(acc.role) ? acc.role : "pos", acc.id), role: manager ? "staff" : "pos" }));
    }
    if (!DESK.includes(acc.role)) throw fail(403, acc.role === "rider" ? "This account is for the rider page. Open /rider to see your deliveries." : "This account is for the till. Open /pos to sell at the counter.");
    return send(res, 200, Object.assign(who, { token: issueToken(12, acc.role, acc.id), role: acc.role }));
  }
  if (checkPassword(password)) return send(res, 200, till ? { token: issueToken(), role: "staff", name: named } : { token: issueToken(), role: "admin", roleLabel: "Admin (master password)", name: named, master: true });
  if (rider && checkRiderPassword(password)) return send(res, 200, { token: issueToken(14, "rider"), role: "rider", name: named });
  if (till && checkPosPassword(password)) return send(res, 200, { token: issueToken(14, "pos"), role: "pos", name: named });
  await new Promise(r => setTimeout(r, 700));
  throw fail(401, "That username and password don't match.");
});

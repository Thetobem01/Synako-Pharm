import { handle, only, send, body, fail, checkPassword, checkRiderPassword, checkPosPassword, issueToken, staffReady, riderReady, posReady, limit } from "../_lib/core.js";
/* Staff sign in with STAFF_PASSWORD (the whole desk). On the rider page, RIDER_PASSWORD also works and gives the delivery list only;
   on the till (/pos), POS_PASSWORD gives counter sales, stock and customers. */
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  const { password, role } = await body(req);
  const rider = role === "rider", till = role === "pos";
  if (!staffReady() && !(rider && riderReady()) && !(till && posReady())) throw fail(503, rider ? "Rider sign-in isn't set up yet. Add RIDER_PASSWORD in the hosting settings." : till ? "Till sign-in isn't set up yet. Add POS_PASSWORD (or STAFF_PASSWORD) in the hosting settings." : "Staff sign-in isn't set up yet. Add STAFF_PASSWORD in the hosting settings.");
  await limit(req, "staff-login", 8, 900, "Too many sign-in attempts. Please wait 15 minutes and try again.");
  if (checkPassword(password)) return send(res, 200, { token: issueToken(), role: "staff" });
  if (rider && checkRiderPassword(password)) return send(res, 200, { token: issueToken(14, "rider"), role: "rider" });
  if (till && checkPosPassword(password)) return send(res, 200, { token: issueToken(14, "pos"), role: "pos" });
  await new Promise(r => setTimeout(r, 700));
  throw fail(401, "That password isn't right.");
});

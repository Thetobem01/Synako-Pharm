import { handle, only, send, body, fail, checkPassword, issueToken, staffReady, limit } from "../_lib/core.js";
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  if (!staffReady()) throw fail(503, "Staff sign-in isn't set up yet. Add STAFF_PASSWORD in the hosting settings.");
  await limit(req, "staff-login", 8, 900, "Too many sign-in attempts. Please wait 15 minutes and try again.");
  const { password } = await body(req);
  if (!checkPassword(password)) { await new Promise(r => setTimeout(r, 700)); throw fail(401, "That password isn't right."); }
  send(res, 200, { token: issueToken() });
});

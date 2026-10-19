import { handle, only, send, body, fail, checkPassword, issueToken, staffReady } from "../_lib/core.js";
export default handle(async (req, res) => {
  if (!only(req, res, "POST")) return;
  if (!staffReady()) throw fail(503, "Staff sign-in isn't set up yet. Add STAFF_PASSWORD in the hosting settings.");
  const { password } = await body(req);
  if (!checkPassword(password)) { await new Promise(r => setTimeout(r, 700)); throw fail(401, "That password isn't right."); }
  send(res, 200, { token: issueToken() });
});

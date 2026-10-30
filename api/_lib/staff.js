/* Staff accounts: each member of staff signs in with their own username and password.
   Accounts are made on the Pharmacist Desk (Team) by an admin; there is no public sign-up.
   The owner can always sign in with the master password (STAFF_PASSWORD) as an admin, to set up the team or recover access. */
import crypto from "node:crypto";
import { db, fail, storageReady } from "./core.js";

export const ROLES = {
  admin: "Admin",               // everything, plus the Team page
  pharmacist: "Pharmacist",     // the whole desk, including prescription decisions
  staff: "Shop staff",          // packing, deliveries, messages, stock, supply and the journal; no prescription decisions
  till: "Till",                 // the till (/pos) only: counter sales, stock and customers
  rider: "Rider"                // the rider page only
};
/* People already working at Synako. They appear on the Team page as "needs a first password" until an admin sets one. */
const STARTER = [
  { name: "Ogwe", username: "ogwe", role: "staff" },
  { name: "Kanny", username: "kanny", role: "staff" }
];

const KEY = "staff:accounts";
export const cleanUsername = u => String(u || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 30);
function hash(pw, salt) { return crypto.scryptSync(String(pw), salt, 32).toString("hex"); }
function matches(acc, pw) {
  if (!acc.hash || !acc.salt) return false;
  const a = Buffer.from(hash(pw, acc.salt), "hex"), b = Buffer.from(acc.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function tempPassword() {
  const abc = "23456789abcdefghjkmnpqrstuvwxyz";
  let s = ""; for (let i = 0; i < 10; i++) s += abc[crypto.randomInt(abc.length)];
  return s.slice(0, 5) + "-" + s.slice(5);
}
export function checkNewPassword(pw) {
  pw = String(pw || "");
  if (pw.length < 8) throw fail(400, "Use at least 8 characters for the password.");
  if (pw.length > 200) throw fail(400, "That password is too long.");
  return pw;
}

/* Saved accounts, plus starter people not yet saved */
export async function accounts() {
  const saved = storageReady() ? (await db.get(KEY)) || [] : [];
  const have = new Set(saved.map(a => a.username));
  return saved.concat(STARTER.filter(s => !have.has(s.username)).map(s => Object.assign({ id: "starter-" + s.username, active: true, starter: true, createdAt: "" }, s)));
}
async function save(list) { await db.set(KEY, list.filter(a => !a.starter)); }
export const publicAccount = a => ({ id: a.id, name: a.name, username: a.username, role: a.role, roleLabel: ROLES[a.role], active: a.active !== false,
  ready: !!a.hash, mustChange: !!a.mustChange, createdAt: a.createdAt || "", createdBy: a.createdBy || "", lastLogin: a.lastLogin || "" });

export async function findAccount(username) {
  const u = cleanUsername(username);
  return u ? (await accounts()).find(a => a.username === u) || null : null;
}
export async function accountById(id) { return id ? (await accounts()).find(a => a.id === id) || null : null; }

/* Sign-in with a username and password; null when it doesn't match an active, set-up account */
export async function signIn(username, pw) {
  const acc = await findAccount(username);
  if (!acc || !matches(acc, pw)) return null;
  if (acc.active === false) throw fail(403, "Your account has been switched off. Please speak to the pharmacy's admin.");
  const list = (await accounts()).map(a => a.id === acc.id ? Object.assign({}, a, { lastLogin: new Date().toISOString() }) : a);
  await save(list);
  return acc;
}

export async function changePassword(id, current, next) {
  const list = await accounts(), acc = list.find(a => a.id === id);
  if (!acc) throw fail(404, "Account not found.");
  if (!matches(acc, current)) throw fail(400, "Your current password isn't right.");
  if (String(current) === String(next)) throw fail(400, "Choose a new password, different from the current one.");
  acc.salt = crypto.randomBytes(16).toString("hex"); acc.hash = hash(checkNewPassword(next), acc.salt); acc.mustChange = false;
  await save(list);
}

/* Team page (admins only): add, edit, switch off and remove accounts, and set a one-time password */
export async function teamAction(b, me) {
  const list = await accounts(), by = me.name || "Admin";
  const find = () => { const a = list.find(x => x.id === String(b.id || "")); if (!a) throw fail(404, "Account not found."); return a; };
  const isMe = a => me.id && a.id === me.id;
  let shown = "";
  if (b.action === "team-save") {
    const name = String(b.name || "").trim().slice(0, 60), role = ROLES[b.role] ? b.role : "staff";
    if (!name) throw fail(400, "Add the staff member's name.");
    if (b.id) {
      const a = find();
      if (isMe(a) && role !== "admin") throw fail(400, "You can't remove your own admin role. Ask another admin.");
      Object.assign(a, { name, role }); delete a.starter;
    } else {
      const username = cleanUsername(b.username || name.split(/\s+/)[0]);
      if (username.length < 3) throw fail(400, "Choose a username of at least 3 letters or numbers.");
      if (list.some(a => a.username === username)) throw fail(409, `The username "${username}" is already taken.`);
      shown = tempPassword();
      const salt = crypto.randomBytes(16).toString("hex");
      list.push({ id: "U" + crypto.randomBytes(6).toString("hex"), name, username, role, active: true, salt, hash: hash(shown, salt), mustChange: true, createdAt: new Date().toISOString(), createdBy: by });
    }
  } else if (b.action === "team-password") { // a one-time password the person changes when they next sign in
    const a = find(); shown = tempPassword();
    a.salt = crypto.randomBytes(16).toString("hex"); a.hash = hash(shown, a.salt); a.mustChange = true; delete a.starter;
    if (!a.createdAt) { a.createdAt = new Date().toISOString(); a.createdBy = by; }
  } else if (b.action === "team-active") {
    const a = find();
    if (isMe(a)) throw fail(400, "You can't switch off your own account.");
    a.active = !!b.active; delete a.starter;
  } else if (b.action === "team-remove") {
    const a = find();
    if (isMe(a)) throw fail(400, "You can't remove your own account.");
    list.splice(list.indexOf(a), 1);
    if (STARTER.some(s => s.username === a.username)) list.push(Object.assign({}, a, { active: false, hash: "", salt: "", removed: true })); // keep the starter person from reappearing
  } else throw fail(400, "Unknown team action.");
  await save(list);
  const acc = shown ? list.find(a => a.hash && matches(a, shown)) : null;
  return { team: (await accounts()).filter(a => !a.removed).map(publicAccount), password: shown, for: acc ? publicAccount(acc) : null };
}
export async function team() { return (await accounts()).filter(a => !a.removed).map(publicAccount); }

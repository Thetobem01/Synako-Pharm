/* Local preview of the site + API, like Vercel.
   Run: npm run dev   (uses in-memory storage and test payments; nothing is saved)
   Passwords in dev: desk "desk", rider page "ride", till (/pos) "till" */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".txt": "text/plain", ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml" };
/* Same security headers as production (vercel.json), so problems show up locally */
const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const globalHeaders = (vercel.headers.find(h => h.source === "/(.*)") || { headers: [] }).headers;
/* vercel.json's rewrites to the API, applied the way Vercel does (":name(a|b)" and ":name" path parts) */
const REWRITES = vercel.rewrites.filter(r => r.destination.startsWith("/api/")).map(r => {
  const names = [];
  const re = new RegExp("^" + r.source.replace(/:(\w+)(\([^)]*\))?/g, (_, n, alt) => { names.push(n); return alt || "([^/]+)"; }) + "$");
  return { re, names, destination: r.destination };
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  for (const h of globalHeaders) if (h.key !== "Strict-Transport-Security") res.setHeader(h.key, h.key === "Content-Security-Policy" ? h.value.replace("; upgrade-insecure-requests", "") : h.value);
  for (const r of REWRITES) {
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    const to = new URL(r.destination.replace(/:(\w+)/g, (_, n) => encodeURIComponent(m[r.names.indexOf(n) + 1] || "")), "http://localhost");
    url.searchParams.forEach((v, k) => { if (!to.searchParams.has(k)) to.searchParams.set(k, v); });
    url.pathname = to.pathname; url.search = to.search; req.url = to.pathname + to.search;
    break;
  }
  if (url.pathname.startsWith("/api/")) {
    const file = path.join(root, url.pathname.replace(/\/$/, "") + ".js");
    if (!file.startsWith(path.join(root, "api")) || !fs.existsSync(file) || url.pathname.split("/").some(seg => seg.startsWith("_"))) { res.statusCode = 404; return res.end('{"error":"Not found"}'); } // like Vercel: nothing under a "_" name is served
    try { const mod = await import(pathToFileURL(file).href); return await mod.default(req, res); }
    catch (e) { console.error(e); res.statusCode = 500; return res.end('{"error":"Server error"}'); }
  }
  let f = path.join(root, decodeURIComponent(url.pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, "index.html");
  res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream");
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Synako dev server: http://localhost:${port}`));

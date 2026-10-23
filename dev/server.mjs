/* Local preview of the site + API, like Vercel.
   Run: npm run dev   (uses in-memory storage and test payments; nothing is saved)
   Staff password in dev: "desk" */
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
const REWRITE = { "/sitemap.xml": "/api/sitemap", "/robots.txt": "/api/robots" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  for (const h of globalHeaders) if (h.key !== "Strict-Transport-Security") res.setHeader(h.key, h.key === "Content-Security-Policy" ? h.value.replace("; upgrade-insecure-requests", "") : h.value);
  if (REWRITE[url.pathname]) url.pathname = REWRITE[url.pathname];
  if (url.pathname.startsWith("/api/")) {
    const file = path.join(root, url.pathname.replace(/\/$/, "") + ".js");
    if (!file.startsWith(path.join(root, "api")) || !fs.existsSync(file) || path.basename(file).startsWith("_")) { res.statusCode = 404; return res.end('{"error":"Not found"}'); }
    try { const mod = await import(pathToFileURL(file).href); return await mod.default(req, res); }
    catch (e) { console.error(e); res.statusCode = 500; return res.end('{"error":"Server error"}'); }
  }
  let f = path.join(root, decodeURIComponent(url.pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, "index.html");
  res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream");
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Synako dev server: http://localhost:${port}`));

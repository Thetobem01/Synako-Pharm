/* Local preview of the site + API, like Vercel.
   Run: npm run dev   (uses in-memory storage and test payments; nothing is saved)
   Staff password in dev: "desk" */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".txt": "text/plain", ".json": "application/json" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
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

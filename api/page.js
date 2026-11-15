import { site, publicUrl, query } from "./_lib/core.js";
import { pageMeta, render, shell } from "./_lib/page.js";
/* Product, category, journal and information pages: the app (index.html) with that page's own title,
   description, canonical link and share preview already in the HTML. vercel.json sends those addresses here
   as ?a=<first part>&b=<second part>. If anything goes wrong the plain app is served, so a page never breaks. */
const part = v => { const s = String(v == null ? "" : v).toLowerCase(); return /^[a-z0-9-]{1,80}$/.test(s) ? s : ""; };
export default async function handler(req, res) {
  let html, status = 200;
  try { html = shell(); }
  catch (e) { console.error("index.html unavailable", e); res.statusCode = 500; res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("Sorry, something went wrong. Please try again."); }
  try {
    const q = query(req), a = part(q.a), b = part(q.b);
    if (a && (!q.b || b)) {
      const base = publicUrl(req), m = await pageMeta(a, b, base, !!q.q);
      html = render(html, m, base + "/" + a + (b ? "/" + b : ""), site().config.business.name);
      status = m.status || 200;
    }
  } catch (e) { console.error("Page head failed", e); }
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Vercel's network keeps a copy for 5 minutes and refreshes it in the background; browsers always re-check
  res.setHeader("Cache-Control", status === 200 ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400" : "public, max-age=0, must-revalidate");
  res.end(html);
}

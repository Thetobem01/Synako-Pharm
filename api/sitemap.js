import { site, publicUrl } from "./_lib/core.js";
import { livePosts } from "./_lib/journal.js";
/* /sitemap.xml — every public page, built from the catalogue so new products appear automatically */
const PAGES = ["about", "contact", "faq", "delivery", "returns", "privacy", "terms", "licences", "cookies", "careers", "wholesale"];
const xmlEsc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
export default async function handler(req, res) {
  const { config, P, CATS } = site();
  const base = publicUrl(req);
  const paths = [
    ["/", "1.0", "daily"], ["/products", "0.9", "daily"], ["/products/prescription", "0.8", "daily"],
    ...CATS.map(c => [`/products/${c.id}`, "0.7", "weekly"]),
    ...P.filter(p => !p.age).map(p => [`/product/${p.id}`, "0.6", "weekly"]),
    ...["otc", "equipment", "surgical", "personal-care", "provisions", "wines", "bulk", "tablets", "liquids", "ointments"].map(f => [`/products/${f}`, "0.8", "daily"]),
    ["/prescriptions", "0.8", "monthly"], ["/controlled-medicines", "0.5", "monthly"],
    ...PAGES.map(pg => [`/${pg}`, "0.4", "monthly"]),
    ["/journal", "0.7", "daily"], ...(await livePosts()).map(p => [`/journal/${p.id}`, "0.5", "monthly"])
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map(([u, pr, f]) => `  <url><loc>${xmlEsc(base + u)}</loc><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join("\n") + "\n</urlset>\n";
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(body);
}

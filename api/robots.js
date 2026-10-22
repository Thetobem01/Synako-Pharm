import { site } from "./_lib/core.js";
/* /robots.txt — keeps private pages out of search results and points to the sitemap */
export default function handler(req, res) {
  const base = String(site().config.site.url).replace(/\/$/, "");
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.end(["User-agent: *", "Allow: /", "Disallow: /api/", "Disallow: /pharmacist", "Disallow: /checkout", "Disallow: /basket", "Disallow: /track", "", `Sitemap: ${base}/sitemap.xml`, ""].join("\n"));
}

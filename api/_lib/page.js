/* The right <head> for each public page, written into index.html on the server.
   The app (js/app.js, pageMeta) sets the same title, description and canonical link in the browser, but
   link previews (WhatsApp, Facebook, X) and many crawlers never run JavaScript: without this they would see
   the home page's title on every product, category and journal post.
   Wording here mirrors pageMeta in js/app.js; tests/page.test.mjs fails if the two drift apart. */
import fs from "node:fs";
import path from "node:path";
import { site } from "./core.js";
import { livePosts } from "./journal.js";

export const DEFAULT_DESC = "Retail and wholesale pharmacy in Nigeria: genuine NAFDAC-registered medicines, medical equipment, surgical supplies, provisions and drinks. Buy single packs or in bulk, send a prescription and get delivery nationwide.";
export const DOSES = [["tablets", "Tablets & capsules"], ["liquids", "Syrups & liquids"], ["ointments", "Creams & ointments"]];
/* Title and lead of the information pages (CONTENT in js/app.js) */
export const PAGES = {
  about: ["About Synako", "A registered Nigerian pharmacy, online."],
  contact: ["Talk to a pharmacist", c => `Quick questions are free, and you'll reach a pharmacist in under ${c.consultation.freeMinutes} minutes during opening hours.`],
  faq: ["Frequently asked questions", "Quick answers about ordering, prescriptions and delivery."],
  delivery: ["Delivery", "We deliver within Nigeria only."],
  returns: ["Returns and refunds", ""],
  privacy: ["Privacy notice", "How we handle your personal and health information."],
  terms: ["Terms of sale", ""],
  licences: ["Our licences", "Check that you're buying from a registered pharmacy."],
  cookies: ["Cookies", ""],
  careers: ["Careers at Synako", "Join a pharmacy team that puts patients first."],
  wholesale: ["Wholesale & bulk buying", "Buy one pack or a whole carton. Retail and wholesale customers shop the same store and pay the same secure way."]
};

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const NOT_FOUND = { title: "Page not found", noindex: true, status: 404 };

/* First plain paragraph of a journal post (jExcerpt in js/app.js) */
function excerpt(p, max = 155) {
  const t = String(p.body || "").split(/\n\s*\n/).map(b => b.trim()).find(b => b && !b.startsWith("## ") && !b.startsWith("- ")) || "";
  const s = t.replace(/\*\*|\[|\]\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, "") + "…" : s;
}

/* What a page address is about: { title, desc, type, noindex, ld, status }. `a` and `b` are the two parts of the path. */
export async function pageMeta(a, b, base, hasSearch) {
  const { config, P, CATS, DEPTS } = site();
  const B = config.business, name = B.name || "Synako Pharmacy";
  if (a === "product") {
    const p = P.find(x => x.id === b);
    if (!p) return NOT_FOUND;
    const rx = p.cls === "pom", cat = CATS.find(c => c.id === p.cat) || {};
    return { title: p.name, desc: `${p.name} (${p.pack}). ${p.use}${rx ? " Prescription only." : ""}`, type: "product",
      ld: rx || p.age ? null : { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.use, sku: p.id, category: cat.name,
        brand: { "@type": "Brand", name: p.brand === "Generic" ? name : p.brand },
        image: p.photo ? `${base}/${p.photo}` : undefined,
        offers: { "@type": "Offer", price: String(p.price), priceCurrency: config.site.currency, availability: "https://schema.org/InStock", url: `${base}/product/${p.id}`, seller: { "@type": "Organization", name } } } };
  }
  if (a === "products") {
    const f = !b ? "all" : b === "prescription" ? "pom" : b;
    const dept = DEPTS.find(d => d.id === f), cat = CATS.find(c => c.id === f), dose = DOSES.find(d => d[0] === f);
    const t = f === "all" ? "All products" : f === "bulk" ? "Wholesale & bulk prices" : dose ? dose[1] : dept ? dept.name : cat ? cat.name : "";
    if (!t) return NOT_FOUND;
    return { title: t, noindex: !!hasSearch, desc: f === "pom" || (cat && cat.cls === "pom")
      ? `${t} from Synako Pharmacy. Upload a valid prescription; our pharmacist checks it before you pay.`
      : `Shop ${t.toLowerCase()} from Synako Pharmacy, a registered Nigerian retail and wholesale pharmacy. Buy single packs or in bulk, with delivery across Nigeria.` };
  }
  if (a === "journal") {
    if (!b) return { title: "Journal", desc: "News from Synako Pharmacy: a note from the counter every day, the week's orders and deliveries, customer stories and health tips from our pharmacists." };
    const p = (await livePosts()).find(x => x.id === b);
    if (!p) return { title: "Journal", noindex: true }; // not 404: the post may be scheduled, or storage briefly unavailable
    const kind = (site().journal.KINDS[p.kind] || {}).name;
    return { title: p.title, desc: excerpt(p), type: "article", ld: { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, datePublished: p.date, articleSection: kind,
      author: { "@type": "Organization", name: p.author || name }, publisher: { "@type": "Organization", name, logo: { "@type": "ImageObject", url: base + "/assets/logo@2x.png" } }, url: `${base}/journal/${p.id}`, image: base + "/assets/og-image.jpg" } };
  }
  if (b) return NOT_FOUND;
  if (a === "prescriptions") return { title: "Send a prescription", desc: "Upload a valid prescription online. Synako's pharmacist checks it, and you pay only once it's approved." };
  if (a === "controlled-medicines") return { title: "Controlled medicines", desc: "Controlled medicines are not sold online. How to collect one from Synako Pharmacy in store with your original prescription and photo ID." };
  if (PAGES[a]) { const [title, lead] = PAGES[a]; return { title, desc: (typeof lead === "function" ? lead(config) : lead) || DEFAULT_DESC }; }
  return NOT_FOUND;
}

let shellCache;
export const shell = () => shellCache || (shellCache = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8"));

/* index.html with this page's head. Anything it can't place is left as the home page's, never broken. */
export function render(html, m, url, brand = "Synako Pharmacy") {
  const title = esc(m.title ? `${m.title} | ${brand}` : `${brand} · Your Pathway to Health and Wellness`), desc = esc(m.desc || DEFAULT_DESC), href = esc(url);
  const set = (re, value) => { html = html.replace(re, (_, pre, post) => pre + value + post); };
  set(/(<title>)[^<]*(<\/title>)/, title);
  set(/(<meta name="description" content=")[^"]*(">)/, desc);
  set(/(<link rel="canonical" href=")[^"]*(">)/, href);
  set(/(<meta property="og:url" content=")[^"]*(">)/, href);
  set(/(<meta property="og:title" content=")[^"]*(">)/, title);
  set(/(<meta property="og:description" content=")[^"]*(">)/, desc);
  set(/(<meta property="og:type" content=")[^"]*(">)/, m.type === "product" || m.type === "article" ? m.type : "website");
  const extra = [`<meta name="robots" content="${m.noindex ? "noindex, nofollow" : "index, follow"}">`];
  // "<" is escaped so nothing in a product name or post title can close the script tag
  if (m.ld) extra.push(`<script type="application/ld+json" id="ld-page">${JSON.stringify(m.ld).replace(/</g, "\\u003c")}</script>`);
  return html.replace("</head>", extra.join("\n") + "\n</head>");
}

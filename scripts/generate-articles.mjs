// Article generator — 2026 redesign edition.
// Renders articles, blog index, sitemap.xml and llms.txt in the current site
// design. Data lives in data/business.json, data/article-topics.json and
// data/article-manifest.json.
//
// Usage:
//   node scripts/generate-articles.mjs --count=1        # scheduled publishing
//   node scripts/generate-articles.mjs --count=0 --rerender
//     # regenerate every existing non-custom article + blog/sitemap/llms
//
// CUSTOM_SLUGS are hand-written pages maintained outside this generator —
// they are never generated or overwritten here (their manifest entries feed
// the blog index, sitemap and llms.txt as usual).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const topics = JSON.parse(fs.readFileSync(path.join(root, "data", "article-topics.json"), "utf8"));

const CUSTOM_SLUGS = new Set([
  "first-hijama-appointment-streatham",
  "wet-cupping-men-women-south-london",
  "hijama-aftercare-london",
]);

const args = new Map(process.argv.slice(2).map((arg, index, arr) => {
  if (!arg.startsWith("--")) return [arg, true];
  const [key, value] = arg.includes("=") ? arg.split("=") : [arg, arr[index + 1]?.startsWith("--") ? "true" : arr[index + 1]];
  return [key, value ?? "true"];
}));

const count = Number(args.get("--count") || 1);
const rerender = args.has("--rerender");
const now = args.get("--date") ? new Date(String(args.get("--date"))) : new Date();
const isoDate = now.toISOString().slice(0, 10);
const year = String(now.getFullYear());
const manifestPath = path.join(root, "data", "article-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];
const used = new Set(manifest.map((article) => article.slug));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">`;

const ICON = {
  pin: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  clock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  phone: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  chat: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z"/><path d="M9 10a1 1 0 0 0 5 5"/></svg>',
  arrow: '<svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  phone16: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  chat16: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z"/><path d="M9 10a1 1 0 0 0 5 5"/></svg>',
};

function shellTop({title, description, canonical, ogType = "website", navCurrent = "blog", extraSchema = ""}) {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${business.domain}/assets/img/wet-cupping-therapy-1600.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A2233">
<link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
${FONTS}
<link rel="stylesheet" href="/assets/css/style.css">
${extraSchema}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<div class="util-bar">
  <div class="container util-inner">
    <span class="util-item util-hide-m">${ICON.pin} ${business.address.street}, ${business.address.postcode}</span>
    <span class="util-item util-hide-m">${ICON.clock} Open every day · 10:00–19:00</span>
    <span class="spacer"></span>
    <span class="util-item">${ICON.phone} <a href="tel:${business.telephone}">${business.phone}</a></span>
    <span class="util-item">${ICON.chat} <a href="${business.whatsappUrl}">WhatsApp</a></span>
  </div>
</div>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${business.name} — home">
      <span class="brand-mark"><img src="/assets/img/sincerity-cupping-logo.svg" alt="" width="52" height="52"></span>
      <span class="brand-text">
        <span class="brand-name">Sincerity</span>
        <span class="brand-sub">Cupping Clinic</span>
      </span>
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">${ICON.menu} Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/services/">Hijama</a></li>
        <li><a href="/about/">About</a></li>
        <li><a href="/#areas">Areas</a></li>
        <li><a href="/blog/"${navCurrent === "blog" ? ' aria-current="page"' : ""}>Guides</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul>
    </nav>
    <a class="btn btn-solid btn-sm header-cta" href="${business.bookingUrl}">Book now ${ICON.arrow}</a>
  </div>
</header>

<main id="main">
`;
}

function shellBottom() {
  return `</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="footer-brand-row" href="/" aria-label="${business.name} — home" style="text-decoration:none">
          <span class="footer-logo"><img src="/assets/img/sincerity-cupping-logo.svg" alt="${business.name} logo" width="62" height="62"></span>
          <span>
            <span class="footer-wordmark">Sincerity</span>
            <span class="footer-wordsub">Cupping Clinic</span>
          </span>
        </a>
        <p class="footer-about">Insured wet cupping (hijama) for men and women in Streatham, delivered with proper consultation, single-use sterile equipment and written aftercare.</p>
        <p class="footer-about"><span class="stars" aria-hidden="true">★★★★★</span> ${business.rating.displayCount} verified reviews on Fresha and Google</p>
      </div>
      <div>
        <h4>Pages</h4>
        <ul>
          <li><a href="/services/">Hijama &amp; wet cupping</a></li>
          <li><a href="/about/">About the clinic</a></li>
          <li><a href="/blog/">Guides</a></li>
          <li><a href="/contact/">Contact &amp; hours</a></li>
          <li><a href="/privacy/">Privacy</a></li>
        </ul>
      </div>
      <div>
        <h4>Visit us</h4>
        <ul>
          <li><a href="${business.googleMapsUrl}">${business.address.street}, ${business.address.locality} ${business.address.postcode}</a></li>
          <li><a href="tel:${business.telephone}">${business.phone}</a></li>
          <li><a href="${business.whatsappUrl}">WhatsApp the clinic</a></li>
          <li>Open every day · 10:00–19:00</li>
          <li><a href="${business.bookingUrl}">Book online on Fresha</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-legal">
      <span>© ${year} ${business.name}</span>
      <span>Cupping is a complementary therapy and is not a replacement for medical advice, diagnosis or treatment.</span>
    </div>
  </div>
</footer>

<div class="mobile-bar" role="navigation" aria-label="Quick actions">
  <a class="btn btn-solid" href="${business.bookingUrl}">${ICON.cal} Book</a>
  <a class="btn btn-outline" href="tel:${business.telephone}">${ICON.phone16} Call</a>
  <a class="btn btn-outline" href="${business.whatsappUrl}">${ICON.chat16} WhatsApp</a>
</div>

<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

const CTA_BAND = `<section class="section" aria-label="Book an appointment">
  <div class="container">
    <div class="cta-band">
      <div>
        <h2>Ready when you are</h2>
        <p>Book online in about two minutes, or message us first if you want to check suitability.</p>
      </div>
      <div class="cta-actions">
        <a class="btn btn-light" href="${business.bookingUrl}">Book on Fresha ${ICON.arrow}</a>
        <a class="btn btn-ghost-dark" href="${business.whatsappUrl}">WhatsApp ${business.phone}</a>
      </div>
    </div>
  </div>
</section>
`;

function articleSchema(topic, dateIso, url) {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: topic.title,
    description: topic.summary,
    datePublished: dateIso,
    dateModified: dateIso,
    mainEntityOfPage: url,
    author: {
      "@type": "Person",
      "@id": `${business.domain}/about/#aisha-mejri`,
      name: "Sister Aisha Mejri",
      jobTitle: "Lead Hijama Practitioner",
    },
    citation: [
      {"@type": "WebPage", name: "Jami at-Tirmidhi 2051 — cupping on 17, 19, 21", url: "https://sunnah.com/tirmidhi:2051"},
      {"@type": "WebPage", name: "Cleveland Clinic — Cupping Therapy", url: "https://my.clevelandclinic.org/health/treatments/16554-cupping"},
    ],
    publisher: {
      "@type": "Organization",
      name: business.name,
      logo: {"@type": "ImageObject", url: `${business.domain}/assets/img/sincerity-cupping-logo.svg`},
    },
    image: `${business.domain}/assets/img/wet-cupping-therapy-1600.jpg`,
    about: [
      {"@type": "Thing", name: topic.service},
      {"@type": "Place", name: topic.area},
    ],
  })}</script>`;
}

function articleHtml(topic, dateIso) {
  const title = escapeHtml(topic.title);
  const url = `${business.domain}/articles/${topic.slug}/`;
  const localArea = topic.area === "South London" || topic.area === "London"
    ? "South London" : `${escapeHtml(topic.area)} and nearby South London`;
  const dateHuman = new Date(dateIso + "T12:00:00Z").toLocaleDateString("en-GB",
    {day: "numeric", month: "short", year: "numeric"});

  const body = `<div class="page-hero">
  <div class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> › <a href="/blog/">Guides</a> › <span aria-current="page">${title}</span>
    </nav>
    <p class="article-meta"><time datetime="${dateIso}">${dateHuman}</time> · ${business.name} · Local guide for ${escapeHtml(topic.area)}</p>
    <h1 style="max-width:22ch">${title}</h1>
  </div>
</div>
<section class="section">
  <div class="container">
    <article class="prose">
      <p class="lede">${escapeHtml(topic.service)} at ${business.name} is insured, consultation-led care for men and women in ${localArea}. This guide covers ${escapeHtml(topic.angle)}, so you can book with clear expectations and ask the right safety questions first.</p>

      <h2>The short answer</h2>
      <p>If you are searching for ${escapeHtml(topic.keyword)}, check four things before booking anywhere: practitioner experience, insurance, the hygiene process, and whether wet cupping suits your health situation. ${business.name} is at ${business.address.street}, ${business.address.locality} ${business.address.postcode} — open every day 10:00–19:00, with online booking through Fresha.</p>

      <h2>Before any cups are placed</h2>
      <p>A good cupping appointment never feels rushed. Expect an unhurried conversation about your goals, health history, medications, skin condition, previous cupping experience and comfort level. This matters most for wet cupping, because the skin is opened and infection-control standards make the difference.</p>
      <ul>
        <li>Mention medical conditions, pregnancy, blood-thinning medication or skin problems — we would rather rebook you than treat when we shouldn't.</li>
        <li>Ask for a same-sex practitioner if you prefer: female clients see Sister Aisha Mejri, male clients see Brother Abu Layla.</li>
        <li>Ask what marks, soreness and aftercare are normal, so nothing on the day surprises you.</li>
      </ul>

      <h2>Why local matters</h2>
      <p>For clients across ${business.serviceAreas.join(", ")}, a nearby clinic means arriving calm, asking questions easily, following aftercare properly and booking a review session without a trek across London. ${business.name} treats men and women in a clean, private, fully insured setting on Streatham High Road.</p>

      <h2>Honest safety notes</h2>
      <p>Cupping is a complementary therapy — not a replacement for medical care. The <a href="https://www.nccih.nih.gov/health/cupping" rel="noopener">National Center for Complementary and Integrative Health</a> notes cupping can cause side effects such as lasting skin discolouration, scarring, burns and infection when done poorly, and NHS guidance on <a href="https://www.nhs.uk/conditions/complementary-and-alternative-medicine/" rel="noopener">complementary medicine</a> encourages weighing evidence and safety. That is why every session here is consultation-led with single-use sterile equipment.</p>
      <p>If you have an active skin infection, a bleeding disorder, unexplained symptoms, a serious illness, or you are pregnant or on medication that affects bleeding, speak to a suitable healthcare professional before booking.</p>

      <h2>Book or ask first</h2>
      <p>Read the full treatment guide on the <a href="/services/">hijama page</a>, message us via the <a href="/contact/">contact page</a>, or book online when you're ready. Not sure about suitability? <a href="${business.whatsappUrl}">WhatsApp ${business.phone}</a> — asking first costs nothing.</p>
    </article>
  </div>
</section>
${CTA_BAND}`;

  return shellTop({
    title: `${topic.title} | ${business.name}`.length > 70 ? topic.title : `${topic.title} | ${business.name}`,
    description: topic.summary,
    canonical: url,
    ogType: "article",
    navCurrent: "blog",
    extraSchema: articleSchema(topic, dateIso, url),
  }) + body + shellBottom();
}

function blogHtml(articles) {
  const cards = articles.map((article) => {
    const dateHuman = new Date(article.date + "T12:00:00Z").toLocaleDateString("en-GB",
      {day: "numeric", month: "short", year: "numeric"});
    return `      <article class="card reveal">
        <p class="article-meta"><time datetime="${article.date}">${dateHuman}</time></p>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.summary)}</p>
        <div class="card-cta"><a href="/articles/${article.slug}/">Read the guide →</a></div>
      </article>`;
  }).join("\n");

  const body = `<div class="page-hero">
  <div class="container">
    <p class="eyebrow">Guides</p>
    <h1 style="max-width:20ch">Plain-English hijama guides</h1>
    <p class="lede">Answer-led articles for clients researching wet cupping, aftercare, privacy, hygiene and local booking questions — written by the clinic, with no medical claims.</p>
  </div>
</div>
<section class="section">
  <div class="container">
    <div class="card-grid">
${cards}
    </div>
  </div>
</section>
${CTA_BAND}`;

  return shellTop({
    title: "Hijama Guides & Articles | Sincerity Cupping Clinic",
    description: "Plain-English guides to wet cupping: first appointments, aftercare, privacy for men and women, Sunnah days, hygiene and suitability.",
    canonical: `${business.domain}/blog/`,
    navCurrent: "blog",
  }) + body + shellBottom();
}

function sitemap(articles) {
  const staticUrls = [
    ["", "1.0", "weekly"],
    ["services/", "0.9", "monthly"],
    ["about/", "0.7", "monthly"],
    ["contact/", "0.8", "monthly"],
    ["blog/", "0.8", "weekly"],
    ["privacy/", "0.3", "yearly"],
  ];
  const urls = staticUrls.map(([loc, priority, changefreq]) => `  <url><loc>${business.domain}/${loc}</loc><lastmod>${isoDate}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
  for (const article of articles) {
    urls.push(`  <url><loc>${business.domain}/articles/${article.slug}/</loc><lastmod>${article.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
  }
  for (const area of business.serviceAreas) {
    const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    urls.push(`  <url><loc>${business.domain}/areas/${slug}/</loc><lastmod>${isoDate}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function llms(articles) {
  const articleLines = articles.map((article) => `- [${article.title}](${business.domain}/articles/${article.slug}/): ${article.summary}`).join("\n");
  return `# ${business.name}
> Insured wet cupping and hijama clinic for men and women in Streatham, South London.

## Key facts
- Name: ${business.name}
- Address: ${business.address.street}, ${business.address.locality} ${business.address.postcode}, United Kingdom
- Phone: ${business.phone}
- WhatsApp: ${business.whatsappUrl}
${business.email ? `- Email: ${business.email}\n` : ""}- Services: ${business.services.map((service) => service.name).join(", ")}
- Combined practitioner experience: ${business.combinedExperienceYears} years
- Insurance: ${business.fullyInsured ? "Fully insured" : "Check with clinic"}
- Environment: ${business.environment}
- Opening hours: every day 10:00–19:00
- Service areas: ${business.serviceAreas.join(", ")}

## Main pages
- [Home](${business.domain}/): Overview of the clinic, wet cupping service, reviews and booking.
- [Hijama & wet cupping](${business.domain}/services/): The treatment step by step, hygiene standards, suitability, preparation, aftercare and all 16 FAQs.
- [About](${business.domain}/about/): Clinic story, values and practitioner profiles.
- [Contact](${business.domain}/contact/): Phone, WhatsApp, address, map, opening hours and enquiry form.
- [Guides](${business.domain}/blog/): Wet cupping guides written for local SEO and answer-led search.

## Local Area Pages
${business.serviceAreas.map((area) => {
  const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `- [Wet cupping in ${area}](${business.domain}/areas/${slug}/): Wet cupping and hijama for clients from ${area}.`;
}).join("\n")}

## Articles
${articleLines}

## Safety note
Cupping is a complementary therapy and is not a replacement for medical advice, diagnosis or treatment.
`;
}

// ---------------------------------------------------------------- execution

const created = [];
const available = topics.filter((topic) => !used.has(topic.slug) && !CUSTOM_SLUGS.has(topic.slug));
const chosen = available.slice(0, count);
if (count > 0 && chosen.length < count) {
  console.warn(`Only ${chosen.length} unused topic(s) left (asked for ${count}). Add new topics to data/article-topics.json.`);
}

for (const topic of chosen) {
  const articleDir = path.join(root, "articles", topic.slug);
  fs.mkdirSync(articleDir, {recursive: true});
  fs.writeFileSync(path.join(articleDir, "index.html"), articleHtml(topic, isoDate));
  const record = {slug: topic.slug, title: topic.title, summary: topic.summary, date: isoDate};
  const existingIndex = manifest.findIndex((article) => article.slug === topic.slug);
  if (existingIndex >= 0) manifest[existingIndex] = record;
  else manifest.push(record);
  created.push(record);
}

let rerendered = 0;
if (rerender) {
  for (const record of manifest) {
    if (CUSTOM_SLUGS.has(record.slug)) continue;
    const topic = topics.find((t) => t.slug === record.slug) || {
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      keyword: record.title.toLowerCase(),
      service: "Wet cupping / Hijama",
      area: "South London",
      angle: "what to expect, preparation and aftercare",
    };
    const articleDir = path.join(root, "articles", record.slug);
    fs.mkdirSync(articleDir, {recursive: true});
    fs.writeFileSync(path.join(articleDir, "index.html"), articleHtml(topic, record.date));
    rerendered += 1;
  }
}

manifest.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(root, "blog", "index.html"), blogHtml(manifest));
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap(manifest));
fs.writeFileSync(path.join(root, "llms.txt"), llms(manifest));

console.log(`Generated ${created.length} new article(s)${rerender ? `, re-rendered ${rerendered}` : ""}; blog index, sitemap.xml and llms.txt refreshed (${manifest.length} articles listed).`);

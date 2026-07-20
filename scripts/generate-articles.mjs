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
const bespokePath = args.get("--bespoke");
const now = args.get("--date") ? new Date(String(args.get("--date"))) : new Date();
const isoDate = now.toISOString().slice(0, 10);
const year = String(now.getFullYear());
const manifestPath = path.join(root, "data", "article-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : [];
const used = new Set(manifest.map((article) => article.slug));

function joinedPattern(...parts) {
  return new RegExp(parts.join(""), "i");
}

// This gate protects both scheduled and manual publishing. The strings are
// deliberately assembled in parts so the retired claims cannot be copied out
// of this source as ready-to-publish prose.
const LIST_SEPARATOR = "(?:\\s+|\\s*(?:,|/)\\s*(?:(?:and|&)\\s*)?|\\s*(?:and|&)\\s*)";
const RETIRED_CLAIM_CHECKS = [
  ["weak religious citation", joinedPattern("Tir", "midhi\\s*2051")],
  ["prescribed lunar dates", joinedPattern("17(?:th)?", LIST_SEPARATOR, "19(?:th)?", LIST_SEPARATOR, "21(?:st)?")],
  ["religious date promotion", joinedPattern("Sun", "nah[- ](?:days?|dates?)")],
  ["fixed recovery window", joinedPattern("normally settles within\\s*", "24", "\\s*(?:[–-]|to)\\s*", "48", "\\s*(?:h|hours?)")],
  ["post-birth interval", joinedPattern("wait(?:ing)? at least (?:three|3) months? after birth")],
  ["recurring treatment schedule", joinedPattern("once every ", "(?:three|3) months?|quarterly (?:rhythm|sessions?)")],
  ["fixed washing and exercise rule", joinedPattern("n\\x6f showers,? baths,? pools,? saunas (?:or|and) gyms|", "48[- ]hour rule|n\\x6f[- ]sweat window")],
  ["dietary rule", joinedPattern("av\\x6fid heavy meat (?:and|or) dairy|what to eat after hijama|what to skip for a day")],
  ["driving outcome", joinedPattern("most clients drive home ", "normally")],
  ["condition-specific suitability", joinedPattern("\\b(?:dia\\x62etes|type 1 dia\\x62etes|type 2 dia\\x62etes|ins\\x75lin|blood[ -]?th\\x69nners?)\\b")],
  ["age-specific suitability", joinedPattern("\\b(?:older ", "clients|older adults|over-?60s)\\b")],
  ["unsupported recovery timeline", joinedPattern("\\b(?:day[- ]by[- ]day|healing) ", "timeline\\b|when (?:you )?can return to work after")],
  ["prescriptive day plan", joinedPattern("copy-and-follow plan for treatment day")],
  ["unsupported experience claim", joinedPattern("\\b(?:20\\+|twenty-plus|over 20) ", "years\\b")],
  ["unsupported room claim", joinedPattern("\\blockable private ", "room\\b")],
  ["unsupported insurance claim", joinedPattern("\\bfully insured ", "hijama clinic\\b|\\bfull insurance (?:means|signals)\\b")],
  ["false generic duration", joinedPattern("\\b", "60", "\\s*(?:[–-]|to)\\s*", "75", "\\s*minutes?\\b")],
  ["unsupported care standard", joinedPattern("clin\\x69cal standard")],
];

function retiredClaimErrors(label, source) {
  const errors = [];
  for (const [claimLabel, pattern] of RETIRED_CLAIM_CHECKS) {
    if (pattern.test(source)) errors.push(`${label}: retired claim (${claimLabel})`);
  }
  return errors;
}

function validateTopicsForPublishing(topicList) {
  const errors = topicList.flatMap((topic) => retiredClaimErrors(
    topic.slug || "unnamed-topic",
    JSON.stringify(topic),
  ));
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
}

function validatePublishableOutput(label, source) {
  const errors = retiredClaimErrors(label, source);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
}

validateTopicsForPublishing(topics);
validatePublishableOutput("business data", JSON.stringify(business));
validatePublishableOutput("article manifest", JSON.stringify(manifest));

const DAY_CODES = new Map([
  ["Monday", "Mo"], ["Tuesday", "Tu"], ["Wednesday", "We"],
  ["Thursday", "Th"], ["Friday", "Fr"], ["Saturday", "Sa"], ["Sunday", "Su"],
]);

function openingHoursFacts(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("business.openingHours must contain at least one opening-hours entry");
  }
  const normalised = entries.map((entry) => ({
    day: String(entry.day || "").trim(),
    opens: String(entry.opens || "").trim(),
    closes: String(entry.closes || "").trim(),
  }));
  for (const entry of normalised) {
    if (!DAY_CODES.has(entry.day) || !/^\d{2}:\d{2}$/.test(entry.opens) || !/^\d{2}:\d{2}$/.test(entry.closes)) {
      throw new Error(`Invalid opening-hours entry for ${entry.day || "unknown day"}`);
    }
  }

  const everyDay = normalised.length === 7
    && normalised.every((entry, index) => entry.day === [...DAY_CODES.keys()][index])
    && normalised.every((entry) => entry.opens === normalised[0].opens && entry.closes === normalised[0].closes);
  if (everyDay) {
    const {opens, closes} = normalised[0];
    return {
      label: `daily ${opens}–${closes}`,
      schema: `Mo-Su ${opens}-${closes}`,
    };
  }

  return {
    label: normalised.map((entry) => `${entry.day} ${entry.opens}–${entry.closes}`).join("; "),
    schema: normalised.map((entry) => `${DAY_CODES.get(entry.day)} ${entry.opens}-${entry.closes}`),
  };
}

const hours = openingHoursFacts(business.openingHours);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

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

function clinicSchema() {
  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": `${business.domain}/#clinic`,
    name: business.name,
    description: "Private wet cupping for women and men in Streatham, South London.",
    url: `${business.domain}/`,
    telephone: business.telephone,
    priceRange: business.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.street,
      addressLocality: business.address.locality,
      postalCode: business.address.postcode,
      addressCountry: business.address.country,
    },
    openingHours: hours.schema,
  })}</script>`;
}

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
<meta name="theme-color" content="#163129">
<link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
<link rel="stylesheet" href="/assets/css/style.css?v=20260720">
<script>document.documentElement.classList.add("js");</script>
${clinicSchema()}
${extraSchema}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<div class="util-bar">
  <div class="container util-inner">
    <span class="util-item util-hide-m">${ICON.pin} ${business.address.street}, ${business.address.postcode}</span>
    <span class="util-item util-hide-m">${ICON.clock} Open ${hours.label.replace("daily ", "daily · ")}</span>
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
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">${ICON.menu} Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        <li><a href="/services/">Cupping &amp; prices</a></li>
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
        <a class="footer-brand-row" href="/" aria-label="${business.name} — home">
          <span class="footer-logo"><img src="/assets/img/sincerity-cupping-logo.svg" alt="" width="62" height="62"></span>
          <span>
            <span class="footer-wordmark">Sincerity</span>
            <span class="footer-wordsub">Cupping Clinic</span>
          </span>
        </a>
        <p class="footer-about">Private wet cupping for women and men in Streatham, with same-sex practitioners and written aftercare.</p>
        <p class="footer-about"><strong>${business.rating.displayCount} public reviews</strong></p>
      </div>
      <div>
        <h2>Explore</h2>
        <ul>
          <li><a href="/services/">Cupping &amp; prices</a></li>
          <li><a href="/about/">About the clinic</a></li>
          <li><a href="/#areas">Areas</a></li>
          <li><a href="/blog/">Cupping guides</a></li>
          <li><a href="/privacy/">Privacy</a></li>
          <li><a href="/contact/">Accessibility help</a></li>
        </ul>
      </div>
      <div>
        <h2>Visit</h2>
        <address>
          <a href="${escapeHtml(business.googleMapsUrl)}">${business.address.street}<br>${business.address.locality} ${business.address.postcode}</a><br>
          <a href="tel:${business.telephone}">${business.phone}</a><br>
          <a href="${business.whatsappUrl}">WhatsApp the clinic</a>
        </address>
        <p>Open ${hours.label.replace("daily ", "daily · ")}</p>
        <p><a href="${business.bookingUrl}">Book an appointment</a></p>
      </div>
    </div>
    <div class="footer-legal">
      <span>© ${year} ${business.name}</span>
      <span>Cupping is complementary care, not a replacement for medical advice, diagnosis or treatment.</span>
    </div>
  </div>
</footer>

<nav class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-solid" href="${business.bookingUrl}">${ICON.cal} Book</a>
  <a class="btn btn-outline" href="tel:${business.telephone}">${ICON.phone16} Call</a>
  <a class="btn btn-outline" href="${business.whatsappUrl}">${ICON.chat16} WhatsApp</a>
</nav>

<script src="/assets/js/site.js?v=20260720" defer></script>
</body>
</html>
`;
}

const CTA_BAND = `<section class="section" aria-label="Book an appointment">
  <div class="container">
    <div class="cta-band">
      <div>
        <h2>Ready when you are</h2>
        <p>Choose the right women’s or men’s appointment, or message us with a non-medical question.</p>
      </div>
      <div class="cta-actions">
        <a class="btn btn-light" href="${business.bookingUrl}">Choose an appointment ${ICON.arrow}</a>
        <a class="btn btn-ghost-dark" href="${business.whatsappUrl}">WhatsApp ${business.phone}</a>
      </div>
    </div>
  </div>
</section>
`;

function articleSchema(topic, publishedIso, modifiedIso, url) {
  const about = [];
  if (String(topic.service || "").trim()) {
    about.push({"@type": "Thing", name: String(topic.service).trim()});
  }
  if (String(topic.area || "").trim()) {
    about.push({"@type": "Place", name: String(topic.area).trim()});
  }

  return `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: topic.title,
    description: topic.summary,
    datePublished: publishedIso,
    dateModified: modifiedIso,
    mainEntityOfPage: url,
    author: {"@id": `${business.domain}/#clinic`},
    contributor: {
      "@type": "Person",
      "@id": `${business.domain}/about/#aisha-mejri`,
      name: "Sister Aisha Mejri",
      jobTitle: "Women's cupping practitioner",
    },
    citation: [
      {"@type": "WebPage", name: "NCCIH — Cupping", url: "https://www.nccih.nih.gov/health/cupping"},
    ],
    publisher: {"@id": `${business.domain}/#clinic`},
    image: `${business.domain}/assets/img/wet-cupping-therapy-1600.jpg`,
    ...(about.length ? {about} : {}),
  })}</script>`;
}

function topicContentHtml(topic) {
  const answer = topic.content?.answer || {
    heading: "What this guide covers",
    text: topic.summary,
  };
  const sections = Array.isArray(topic.content?.sections) && topic.content.sections.length
    ? topic.content.sections
    : [
      {
        heading: "Check the published appointment choices",
        paragraphs: ["Compare the named appointment, price and duration before choosing a booking link."],
      },
      {
        heading: "Ask before you book",
        paragraphs: ["The clinic can answer operational questions about its appointments. A healthcare professional should answer personal medical questions."],
      },
    ];

  const renderedSections = sections.map((section) => {
    const paragraphs = (section.paragraphs || []).map((paragraph) => `      <p>${escapeHtml(paragraph)}</p>`).join("\n");
    const items = Array.isArray(section.items) && section.items.length
      ? `\n      <ul>\n${section.items.map((item) => `        <li>${escapeHtml(item)}</li>`).join("\n")}\n      </ul>`
      : "";
    return `      <h2>${escapeHtml(section.heading)}</h2>\n${paragraphs}${items}`;
  }).join("\n\n");

  return `      <h2>${escapeHtml(answer.heading)}</h2>
      <p>${escapeHtml(answer.text)}</p>

${renderedSections}`;
}

function articleHtml(topic, publishedIso, modifiedIso = publishedIso) {
  const title = escapeHtml(topic.title);
  const url = `${business.domain}/articles/${topic.slug}/`;
  const dateHuman = new Date(publishedIso + "T12:00:00Z").toLocaleDateString("en-GB",
    {day: "numeric", month: "short", year: "numeric"});
  const serviceFacts = business.services
    .map((service) => `${service.audience}: ${service.name}, ${service.price}, ${service.durationMinutes} minutes`)
    .join("; ");

  const body = `<div class="page-hero">
  <div class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> › <a href="/blog/">Guides</a> › <span aria-current="page">${title}</span>
    </nav>
    <p class="article-meta"><time datetime="${publishedIso}">${dateHuman}</time> · Clinic review by Sister Aisha Mejri, Women's cupping practitioner · ${business.name}</p>
    <h1 style="max-width:22ch">${title}</h1>
  </div>
</div>
<section class="section">
  <div class="container">
    <article class="prose">
      <p class="lede">${escapeHtml(topic.summary)}</p>

${topicContentHtml(topic)}

      <h2>Published clinic details</h2>
      <p>${business.name} is at ${business.address.street}, ${business.address.locality} ${business.address.postcode}. Opening hours are ${hours.label}. Current appointment choices are ${escapeHtml(serviceFacts)}.</p>

      <h2>Evidence and safety</h2>
      <p>Cupping is complementary care, not a replacement for medical advice, diagnosis or treatment. The <a href="https://www.nccih.nih.gov/health/cupping" rel="noopener">National Center for Complementary and Integrative Health guide to cupping</a> explains that research is limited and describes possible side effects.</p>
      <p>Personal medical questions need an appropriately qualified healthcare professional. The clinic can explain its service and operational policy, but it does not diagnose conditions or direct changes to prescribed care.</p>

      <h2>Book or ask first</h2>
      <p>Compare the four appointments on the <a href="/services/">Cupping &amp; prices page</a>, use the <a href="/contact/">contact page</a>, or <a href="${business.bookingUrl}">choose the right booking route</a>. For a non-medical question, <a href="${business.whatsappUrl}">WhatsApp ${business.phone}</a>.</p>
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
    extraSchema: articleSchema(topic, publishedIso, modifiedIso, url),
  }) + body + shellBottom();
}

function bespokeArticleHtml(meta, bodyHtml, publishedIso, modifiedIso = publishedIso) {
  const url = `${business.domain}/articles/${meta.slug}/`;
  const dateHuman = new Date(publishedIso + "T12:00:00Z").toLocaleDateString("en-GB",
    {day: "numeric", month: "short", year: "numeric"});
  const body = `<div class="page-hero">
  <div class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> › <a href="/blog/">Guides</a> › <span aria-current="page">${escapeHtml(meta.title)}</span>
    </nav>
    <p class="article-meta"><time datetime="${publishedIso}">${dateHuman}</time> · Clinic review by Sister Aisha Mejri, Women's cupping practitioner · ${business.name}</p>
    <h1 style="max-width:22ch">${escapeHtml(meta.title)}</h1>
  </div>
</div>
<section class="section">
  <div class="container">
    <article class="prose">
${bodyHtml}
    </article>
  </div>
</section>
${CTA_BAND}`;
  return shellTop({
    title: `${meta.title} | ${business.name}`.length > 70 ? meta.title : `${meta.title} | ${business.name}`,
    description: meta.summary,
    canonical: url,
    ogType: "article",
    navCurrent: "blog",
    extraSchema: articleSchema(meta, publishedIso, modifiedIso, url),
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
    <p class="eyebrow">Cupping guides</p>
    <h1 style="max-width:20ch">Plain-English cupping guides</h1>
    <p class="lede">Practical articles about wet cupping, also known as hijama, with clear care boundaries, privacy information and local booking details.</p>
  </div>
</div>
<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>All cupping guides</h2>
      <p>Browse every current clinic guide by topic and publication date.</p>
    </div>
    <div class="card-grid">
${cards}
    </div>
  </div>
</section>
${CTA_BAND}`;

  return shellTop({
    title: "Cupping Guides & Articles | Sincerity Cupping Clinic",
    description: "Plain-English wet cupping guides covering the appointment process, privacy for women and men, hygiene, evidence and local booking details.",
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
    urls.push(`  <url><loc>${business.domain}/articles/${article.slug}/</loc><lastmod>${article.modified || article.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
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
> Private wet cupping for women and men in Streatham, South London. Hijama is used as a secondary name for wet cupping.

## Key facts
- Name: ${business.name}
- Address: ${business.address.street}, ${business.address.locality} ${business.address.postcode}, United Kingdom
- Phone: ${business.phone}
- WhatsApp: ${business.whatsappUrl}
${business.email ? `- Email: ${business.email}\n` : ""}- Services: ${business.services.map((service) => `${service.audience}: ${service.name} — ${service.price}, ${service.durationMinutes} minutes`).join("; ")}
- Opening hours: ${hours.label}
- Service areas: ${business.serviceAreas.join(", ")}

## Main pages
- [Home](${business.domain}/): Overview of the clinic, cupping service and women’s and men’s booking routes.
- [Cupping & prices](${business.domain}/services/): Four appointment choices, exact prices and durations, the process, hygiene and care boundaries.
- [About](${business.domain}/about/): Clinic story, values and practitioner profiles.
- [Contact](${business.domain}/contact/): Phone, WhatsApp, address, map, opening hours and enquiry form.
- [Guides](${business.domain}/blog/): Plain-English wet cupping guides and local booking information.

## Local Area Pages
${business.serviceAreas.map((area) => {
  const slug = area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `- [Wet cupping in ${area}](${business.domain}/areas/${slug}/): Wet cupping and hijama for clients from ${area}.`;
}).join("\n")}

## Articles
${articleLines}

## Safety note
Cupping is complementary care and is not a replacement for medical advice, diagnosis or treatment. Independent safety information: https://www.nccih.nih.gov/health/cupping
`;
}

function llmsFull(articles) {
  const serviceLines = business.services
    .map((service) => `- ${service.audience}: ${service.name} — ${service.price}, ${service.durationMinutes} minutes`)
    .join("\n");
  const articleLines = articles
    .map((article) => `- [${article.title}](${business.domain}/articles/${article.slug}/): ${article.summary}`)
    .join("\n");
  return `# ${business.name} — full reference
> Published operational facts for the cupping clinic at ${business.address.street}, ${business.address.locality} ${business.address.postcode}.

## Contact and opening hours
- Phone: ${business.phone}
- WhatsApp: ${business.whatsappUrl}
${business.email ? `- Email: ${business.email}\n` : ""}- Opening hours: ${hours.label}
- Booking selector: ${business.domain}/#book

## Appointment catalogue
${serviceLines}

Prices and durations belong to the named appointment only. Current availability and booking confirmation are handled on Fresha after the client chooses an appointment.

## Practitioners and privacy
- Sister Aisha Mejri is the women's cupping practitioner and sees women for private appointments.
- Brother Abu Layla is the men's cupping practitioner and sees men for private appointments.
- The clinic welcomes people of every faith and background.

## Location and travel
- Clinic: ${business.address.street}, ${business.address.locality} ${business.address.postcode}, United Kingdom.
- Areas listed by the clinic: ${business.serviceAreas.join(", ")}.
- Travellers should check a live map or transport service before setting out; published area guides do not guarantee journey times or parking.

## Care boundary
Cupping is offered as complementary care. It is not a replacement for medical advice, diagnosis or treatment. The clinic can answer operational questions about its service; personal medical questions belong with an appropriately qualified healthcare professional. Independent general information: https://www.nccih.nih.gov/health/cupping

## Published guides
${articleLines}
`;
}

// ---------------------------------------------------------------- execution

const created = [];

if (bespokePath) {
  const payload = JSON.parse(fs.readFileSync(bespokePath, "utf8"));
  if (!payload.slug || !payload.title || !payload.summary || !payload.html) {
    console.error("Bespoke payload needs slug, title, summary, html");
    process.exit(1);
  }
  const dateIso2 = payload.date || isoDate;
  const modifiedIso2 = payload.modified || dateIso2;
  const dir = path.join(root, "articles", payload.slug);
  const renderedArticle = bespokeArticleHtml(payload, payload.html, dateIso2, modifiedIso2);
  validatePublishableOutput(`article ${payload.slug}`, renderedArticle);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, "index.html"), renderedArticle);
  const rec = {slug: payload.slug, title: payload.title, summary: payload.summary,
               date: dateIso2, modified: modifiedIso2, custom: true};
  const ix = manifest.findIndex((a) => a.slug === payload.slug);
  if (ix >= 0) manifest[ix] = rec; else manifest.push(rec);
  created.push(rec);
}

const available = topics.filter((topic) => !used.has(topic.slug) && !CUSTOM_SLUGS.has(topic.slug));
const chosen = bespokePath ? [] : available.slice(0, count);
if (count > 0 && chosen.length < count) {
  console.warn(`Only ${chosen.length} unused topic(s) left (asked for ${count}). Add new topics to data/article-topics.json.`);
}

for (const topic of chosen) {
  const articleDir = path.join(root, "articles", topic.slug);
  const renderedArticle = articleHtml(topic, isoDate, isoDate);
  validatePublishableOutput(`article ${topic.slug}`, renderedArticle);
  fs.mkdirSync(articleDir, {recursive: true});
  fs.writeFileSync(path.join(articleDir, "index.html"), renderedArticle);
  const record = {slug: topic.slug, title: topic.title, summary: topic.summary, date: isoDate, modified: isoDate};
  const existingIndex = manifest.findIndex((article) => article.slug === topic.slug);
  if (existingIndex >= 0) manifest[existingIndex] = record;
  else manifest.push(record);
  created.push(record);
}

let rerendered = 0;
if (rerender) {
  for (const record of manifest) {
    if (CUSTOM_SLUGS.has(record.slug) || record.custom) continue;
    const sourceTopic = topics.find((t) => t.slug === record.slug) || {
      slug: record.slug,
      title: record.title,
      summary: record.summary,
      keyword: record.title.toLowerCase(),
      service: "Wet cupping / Hijama",
      area: "South London",
      angle: "what to expect, preparation and aftercare",
    };
    const topic = {...sourceTopic, title: record.title, summary: record.summary};
    const articleDir = path.join(root, "articles", record.slug);
    const renderedArticle = articleHtml(topic, record.date, record.modified || record.date);
    validatePublishableOutput(`article ${record.slug}`, renderedArticle);
    fs.mkdirSync(articleDir, {recursive: true});
    fs.writeFileSync(path.join(articleDir, "index.html"), renderedArticle);
    rerendered += 1;
  }
}

manifest.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const renderedManifest = `${JSON.stringify(manifest, null, 2)}\n`;
const renderedBlog = blogHtml(manifest);
const renderedSitemap = sitemap(manifest);
const renderedLlms = llms(manifest);
const renderedLlmsFull = llmsFull(manifest);
for (const [label, output] of [
  ["article manifest", renderedManifest],
  ["blog index", renderedBlog],
  ["sitemap", renderedSitemap],
  ["llms.txt", renderedLlms],
  ["llms-full.txt", renderedLlmsFull],
]) validatePublishableOutput(label, output);

fs.writeFileSync(manifestPath, renderedManifest);
fs.writeFileSync(path.join(root, "blog", "index.html"), renderedBlog);
fs.writeFileSync(path.join(root, "sitemap.xml"), renderedSitemap);
fs.writeFileSync(path.join(root, "llms.txt"), renderedLlms);
fs.writeFileSync(path.join(root, "llms-full.txt"), renderedLlmsFull);

console.log(`Generated ${created.length} new article(s)${rerender ? `, re-rendered ${rerendered}` : ""}; blog index, sitemap.xml and LLM references refreshed (${manifest.length} articles listed).`);

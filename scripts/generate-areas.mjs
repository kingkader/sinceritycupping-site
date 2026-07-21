import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://sinceritycupping.co.uk";
const destination = "330 Streatham High Rd, London SW16 6HH";
const destinationPlaceId = "ChIJ6-vLLJQHdkgRPrnWnRsH6_Q";
const areaPages = JSON.parse(fs.readFileSync(path.join(root, "data", "area-pages.json"), "utf8"));
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const reviewedSlugs = [
  "balham",
  "brixton",
  "clapham",
  "colliers-wood",
  "crystal-palace",
  "dulwich",
  "herne-hill",
  "mitcham",
  "norbury",
  "streatham",
  "streatham-common",
  "streatham-hill",
  "tooting",
  "tulse-hill",
  "west-norwood",
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizedWordCount(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9£]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function directionsUrl(areaName) {
  const parameters = new URLSearchParams({api: "1"});
  if (areaName) parameters.set("origin", `${areaName}, London`);
  parameters.set("destination", destination);
  parameters.set("destination_place_id", destinationPlaceId);
  return `https://www.google.com/maps/dir/?${parameters}`;
}

const clinicDirectionsUrl = directionsUrl();
invariant(isNonEmptyString(business.femaleBookingUrl), "Missing approved women's booking route");
invariant(isNonEmptyString(business.maleBookingUrl), "Missing approved men's booking route");

invariant(areaPages.length === reviewedSlugs.length, "Expected exactly 15 reviewed area records");
invariant(new Set(areaPages.map(({slug}) => slug)).size === areaPages.length, "Area slugs must be unique");
for (const area of areaPages) {
  invariant(isNonEmptyString(area.slug), "Area slug must be non-empty text");
  invariant(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(area.slug), `Unsafe area slug: ${area.slug}`);
  invariant(isNonEmptyString(area.name) && isNonEmptyString(area.heading), `Incomplete area record: ${area.slug}`);
  invariant(Array.isArray(area.localSections) && area.localSections.length === 3, `${area.slug}: expected three reviewed local sections`);
  for (const [index, section] of area.localSections.entries()) {
    invariant(isNonEmptyString(section?.heading), `${area.slug}: local section ${index + 1} needs a non-empty heading`);
    invariant(Array.isArray(section?.paragraphs) && section.paragraphs.length === 2, `${area.slug}: local section ${index + 1} needs exactly two paragraphs`);
    invariant(section.paragraphs.every(isNonEmptyString), `${area.slug}: local paragraph ${index + 1} must be non-empty text`);
  }
  const localWordCount = normalizedWordCount(area.localSections
    .flatMap(({heading, paragraphs}) => [heading, ...paragraphs])
    .join(" "));
  invariant(localWordCount >= 210, `${area.slug}: local copy must contain at least 210 normalized words`);
}

invariant(
  JSON.stringify(areaPages.map(({slug}) => slug).sort()) === JSON.stringify(reviewedSlugs),
  "Area records must match the exact reviewed slug allowlist",
);

const areaBySlug = new Map(areaPages.map((area) => [area.slug, area]));
for (const area of areaPages) {
  invariant(Array.isArray(area.nearby) && area.nearby.length === 3, `${area.slug}: expected three nearby records`);
  invariant(new Set(area.nearby).size === area.nearby.length, `${area.slug}: nearby slugs must be unique`);
  invariant(!area.nearby.includes(area.slug), `${area.slug}: nearby slugs must not include self`);
  for (const slug of area.nearby) invariant(areaBySlug.has(slug), `${area.slug}: unknown nearby reviewed area ${slug}`);
}

const areasRoot = path.resolve(root, "areas");
const outputPaths = [
  path.join(areasRoot, "index.html"),
  ...areaPages.map(({slug}) => path.join(areasRoot, slug, "index.html")),
];

function assertContained(outputPath) {
  const relative = path.relative(areasRoot, outputPath);
  invariant(relative && !path.isAbsolute(relative) && !relative.startsWith(`..${path.sep}`) && relative !== "..", `Area output escapes its contained directory: ${outputPath}`);
}

function assertNotSymlink(target) {
  try {
    invariant(!fs.lstatSync(target).isSymbolicLink(), `Refusing symbolic link destination: ${target}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

assertNotSymlink(areasRoot);
for (const outputPath of outputPaths) {
  assertContained(outputPath);
  assertNotSymlink(path.dirname(outputPath));
  assertNotSymlink(outputPath);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function shell({title, description, canonical, schema, main, areasCurrent = false, robots = "index, follow, max-image-preview:large"}) {
  const areasCurrentAttribute = areasCurrent ? ' aria-current="page"' : "";
  const clinicDirectionsHref = escapeHtml(clinicDirectionsUrl);
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="${escapeHtml(robots)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${origin}/assets/img/wet-cupping-therapy-1600.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#163129">
<link rel="icon" type="image/svg+xml" href="/assets/img/favicon.svg">
<link rel="stylesheet" href="/assets/css/style.css?v=20260720">
<script>document.documentElement.classList.add("js");</script>
<script type="application/ld+json">${jsonLd(schema)}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<div class="util-bar">
  <div class="container util-inner">
    <a class="util-item util-hide-m" href="${clinicDirectionsHref}">330 Streatham High Rd, SW16 6HH</a>
    <span class="util-item util-hide-m">Open daily · 10:00–19:00</span>
    <span class="spacer"></span>
    <a class="util-item" href="tel:+447552540000">07552 540000</a>
    <a class="util-item" href="https://wa.me/447552540000">WhatsApp</a>
    <a class="util-item" href="${clinicDirectionsHref}">Directions</a>
  </div>
</div>

<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/">
      <span class="brand-mark"><img src="/assets/img/sincerity-cupping-logo.svg" alt="" width="52" height="52"></span>
      <span class="brand-text"><span class="brand-name">Sincerity</span><span class="brand-sub">Cupping Clinic</span></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg> Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        <li><a href="/services/">Cupping &amp; prices</a></li>
        <li><a href="/about/">About</a></li>
        <li><a href="/areas/"${areasCurrentAttribute}>Areas</a></li>
        <li><a href="/blog/">Guides</a></li>
        <li><a href="/contact/">Contact</a></li>
      </ul>
    </nav>
    <a class="btn btn-solid btn-sm header-cta" href="/#book">Book now</a>
  </div>
</header>

${main}

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <a class="footer-brand-row" href="/">
          <span class="footer-logo"><img src="/assets/img/sincerity-cupping-logo.svg" alt="" width="62" height="62"></span>
          <span><span class="footer-wordmark">Sincerity</span><span class="footer-wordsub">Cupping Clinic</span></span>
        </a>
        <p class="footer-about">Private wet cupping for women and men in Streatham, with same-sex practitioners and written aftercare.</p>
        <p class="footer-about"><strong>100+ public reviews</strong></p>
      </div>
      <div>
        <h2>Explore</h2>
        <ul>
          <li><a href="/services/">Cupping &amp; prices</a></li>
          <li><a href="/about/">About the clinic</a></li>
          <li><a href="/areas/">Areas</a></li>
          <li><a href="/blog/">Cupping guides</a></li>
          <li><a href="/privacy/">Privacy</a></li>
          <li><a href="/contact/">Accessibility help</a></li>
        </ul>
      </div>
      <div>
        <h2>Visit</h2>
        <address><a href="${clinicDirectionsHref}">330 Streatham High Rd<br>London SW16 6HH</a><br><a href="tel:+447552540000">07552 540000</a><br><a href="https://wa.me/447552540000">WhatsApp the clinic</a></address>
        <p>Open daily · 10:00–19:00</p>
        <p><a href="/#book">Book an appointment</a></p>
      </div>
    </div>
    <div class="footer-legal">
      <span>© 2026 Sincerity Cupping Clinic</span>
      <span>Cupping is complementary care, not a replacement for medical advice, diagnosis or treatment.</span>
    </div>
  </div>
</footer>

<nav class="mobile-bar" aria-label="Quick actions">
  <a class="btn btn-solid" href="/#book"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg> Book</a>
  <a class="btn btn-outline" href="tel:+447552540000"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg> Call</a>
  <a class="btn btn-outline" href="https://wa.me/447552540000"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z"/><path d="M9 10a1 1 0 0 0 5 5"/></svg> WhatsApp</a>
</nav>

<script src="/assets/js/site.js?v=20260720" defer></script>
</body>
</html>
`;
}

function areaSchema(area) {
  const url = `${origin}/areas/${area.slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: area.heading,
        serviceType: "Wet cupping",
        url,
        areaServed: {"@type": "Place", name: area.name},
        provider: {"@id": `${origin}/#clinic`},
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {"@type": "ListItem", position: 1, name: "Home", item: `${origin}/`},
          {"@type": "ListItem", position: 2, name: "Areas", item: `${origin}/areas/`},
          {"@type": "ListItem", position: 3, name: area.name, item: url},
        ],
      },
    ],
  };
}

function renderArea(area) {
  const canonical = `${origin}/areas/${area.slug}/`;
  const description = `${area.heading}: private appointments at one Streatham clinic for women and men of every faith and background.`;
  const areaDirectionsHref = escapeHtml(directionsUrl(area.name));
  const localEyebrows = ["Local destination", "Route planning", "Before you travel"];
  const localSections = area.localSections.map((section, index) => {
    const sectionId = `local-${area.slug}-${index + 1}`;
    const sectionClass = index % 2 === 1 ? "section section-alt" : "section";
    const paragraphs = section.paragraphs
      .map((paragraph) => `      <p>${escapeHtml(paragraph)}</p>`)
      .join("\n");
    const directionsAction = index === 0
      ? `\n      <p><a class="btn btn-outline" href="${areaDirectionsHref}">Open directions from ${escapeHtml(area.name)}</a></p>`
      : "";
    return `<section class="${sectionClass}" data-area-local-copy aria-labelledby="${sectionId}">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">${localEyebrows[index]}</p>
        <h2 id="${sectionId}">${escapeHtml(section.heading)}</h2>
      </div>
${paragraphs}${directionsAction}
    </div>
  </section>`;
  }).join("\n\n  ");
  const nearby = area.nearby.map((slug) => {
    const item = areaBySlug.get(slug);
    invariant(item, `${area.slug}: unknown nearby area ${slug}`);
    return `<a class="pill" href="/areas/${item.slug}/">${escapeHtml(item.heading)}</a>`;
  }).join("\n        ");

  const main = `<main id="main">
  <div class="page-hero">
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/areas/">Areas</a> › <span aria-current="page">${escapeHtml(area.name)}</span></nav>
      <p class="eyebrow">Service area · one Streatham clinic</p>
      <h1>${escapeHtml(area.heading)}</h1>
      <p class="lede">Wet cupping, also known as hijama, in a private same-sex setting at one fixed address in Streatham.</p>
    </div>
  </div>

  ${localSections}

  <section class="section section-alt" aria-labelledby="clinic-facts-${area.slug}">
    <div class="container">
      <div class="section-head">
        <p class="eyebrow">Book directly</p>
        <h2 id="clinic-facts-${area.slug}">Book wet cupping at the one Streatham clinic</h2>
        <p>All appointments take place at the one clinic in Streatham: 330 Streatham High Rd, London SW16 6HH. The clinic is open daily, 10:00–19:00.</p>
      </div>
      <div class="card-grid">
        <article class="card"><h3>For women</h3><p>Women’s wet cupping is £45 for 45 minutes with Sister Aisha Mejri.</p><p><a class="btn btn-solid" href="${escapeHtml(business.femaleBookingUrl)}">Book women’s wet cupping</a></p></article>
        <article class="card"><h3>For men</h3><p>Men’s wet cupping is £45 for 40 minutes with Brother Abu Layla.</p><p><a class="btn btn-solid" href="${escapeHtml(business.maleBookingUrl)}">Book men’s wet cupping</a></p></article>
        <article class="card"><h3>Ask the clinic</h3><p>For a non-medical question about the booking or fixed address, call <a href="tel:+447552540000">07552 540000</a> or <a href="https://wa.me/447552540000">WhatsApp the clinic</a>.</p></article>
      </div>
      <div class="note-card" style="margin-top:2rem">
        <h3>Private, responsible care</h3>
        <p>Same-sex practitioners provide private appointments. New single-use cups and blades are used for each client and disposed of safely. Women and men of every faith and background are welcome.</p>
        <p>Wet cupping is complementary care and is not a replacement for medical advice, diagnosis or treatment. Read the independent <a href="https://www.nccih.nih.gov/health/cupping" rel="noopener">NCCIH guide to cupping</a>.</p>
      </div>
    </div>
  </section>

  <section class="section" aria-label="Nearby service areas">
    <div class="container">
      <p class="eyebrow">Other service areas</p>
      <div class="pill-cloud">
        ${nearby}
      </div>
      <p style="margin-top:1.5rem"><a href="/areas/">View all service areas</a></p>
    </div>
  </section>
</main>`;

  return shell({
    title: `${area.heading} | Sincerity Cupping Clinic`,
    description,
    canonical,
    robots: "noindex, follow",
    schema: areaSchema(area),
    main,
  });
}

function renderHub() {
  const canonical = `${origin}/areas/`;
  const itemList = areaPages.map((area, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: area.name,
    url: `${origin}/areas/${area.slug}/`,
  }));
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonical}#page`,
        name: "Wet cupping service areas near Streatham",
        description: "Local route context for service areas served by the single Sincerity Cupping Clinic in Streatham.",
        url: canonical,
      },
      {
        "@type": "ItemList",
        "@id": `${canonical}#areas`,
        name: "Sincerity Cupping Clinic service areas",
        numberOfItems: areaPages.length,
        itemListElement: itemList,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement: [
          {"@type": "ListItem", position: 1, name: "Home", item: `${origin}/`},
          {"@type": "ListItem", position: 2, name: "Areas", item: canonical},
        ],
      },
    ],
  };
  const links = areaPages.map((area) => `<a class="pill" href="/areas/${area.slug}/">${escapeHtml(area.name)}</a>`).join("\n        ");
  const main = `<main id="main">
  <div class="page-hero">
    <div class="container">
      <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span aria-current="page">Areas</span></nav>
      <p class="eyebrow">South London service areas</p>
      <h1>Wet cupping service areas near Streatham</h1>
      <p class="lede">Wet cupping, also known as hijama, for women and men travelling to one fixed clinic address.</p>
    </div>
  </div>

  <section class="section" aria-labelledby="one-clinic">
    <div class="container faq-columns">
      <div>
        <p class="eyebrow">One location</p>
        <h2 id="one-clinic">One clinic for every area listed</h2>
        <p>There is one clinic at 330 Streatham High Rd, London SW16 6HH. The local pages below describe service areas, not branches, mobile treatment locations or separate premises.</p>
        <p>The clinic is open daily, 10:00–19:00. Women and men of every faith and background are welcome for private same-sex appointments.</p>
        <p><a class="btn btn-solid" href="${escapeHtml(clinicDirectionsUrl)}">Open Google Maps directions</a></p>
      </div>
      <div class="note-card">
        <h3>Before you travel</h3>
        <p>Use the full Streatham address and check the current route from your own starting point. These pages do not guarantee journey times, parking or transport frequency.</p>
        <p><a href="/#book">Choose an appointment</a></p>
      </div>
    </div>
  </section>

  <section class="section section-alt" aria-labelledby="service-area-list">
    <div class="container">
      <div class="section-head"><p class="eyebrow">Local pages</p><h2 id="service-area-list">Check route context for your area</h2><p>Every link below returns to the same clinic address in Streatham.</p></div>
      <div class="pill-cloud">
        ${links}
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="hub-care-boundary">
    <div class="container faq-columns">
      <div>
        <p class="eyebrow">What the clinic offers</p>
        <h2 id="hub-care-boundary">Private wet cupping with clear choices</h2>
        <p>Women’s wet cupping is £45 for 45 minutes. Men’s wet cupping is £45 for 40 minutes. Same-sex practitioners provide private appointments, and new single-use cups and blades are used for each client.</p>
        <p>Hijama is used naturally as a secondary name for wet cupping. It is not a requirement or a different service.</p>
      </div>
      <div class="note-card blue">
        <h3>Responsible care</h3>
        <p>Wet cupping is complementary care and is not a replacement for medical advice, diagnosis or treatment. Read the independent <a href="https://www.nccih.nih.gov/health/cupping" rel="noopener">NCCIH guide to cupping</a>.</p>
      </div>
    </div>
  </section>

  <section class="section" aria-label="Book an appointment">
    <div class="container"><div class="cta-band"><div><h2>Book at the Streatham clinic</h2><p>Select the women’s or men’s appointment route before continuing to Fresha.</p></div><div class="cta-actions"><a class="btn btn-light" href="/#book">Book an appointment</a><a class="btn btn-ghost-dark" href="/contact/">Contact the clinic</a></div></div></div>
  </section>
</main>`;

  return shell({
    title: "South London Cupping Areas | Sincerity Cupping Clinic",
    description: "Explore 15 South London service areas for one wet cupping clinic at 330 Streatham High Rd, with live directions and clear booking choices.",
    canonical,
    schema,
    main,
    areasCurrent: true,
  });
}

fs.mkdirSync(areasRoot, {recursive: true});
fs.writeFileSync(path.join(areasRoot, "index.html"), renderHub());
for (const area of areaPages) {
  const directory = path.join(areasRoot, area.slug);
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(path.join(directory, "index.html"), renderArea(area));
}

console.log(`Rendered ${areaPages.length} area pages and the area hub.`);

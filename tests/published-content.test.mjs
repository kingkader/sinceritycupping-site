import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {after, before, test} from "node:test";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://sinceritycupping.co.uk";
const directionsUrl = "https://www.google.com/maps?q=place_id:ChIJ6-vLLJQHdkgRPrnWnRsH6_Q&amp;place_id=ChIJ6-vLLJQHdkgRPrnWnRsH6_Q";
const publicEntries = [
  "index.html",
  "404.html",
  "about",
  "areas",
  "articles",
  "assets",
  "blog",
  "contact",
  "privacy",
  "services",
  "apple-touch-icon.png",
  "favicon.ico",
  "favicon.svg",
  "icon.svg",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "llms-full.txt",
  "_headers",
  "_redirects",
];

const areas = [
  ["streatham", "Streatham"],
  ["streatham-hill", "Streatham Hill"],
  ["streatham-common", "Streatham Common"],
  ["balham", "Balham"],
  ["brixton", "Brixton"],
  ["tooting", "Tooting"],
  ["clapham", "Clapham"],
  ["norbury", "Norbury"],
  ["tulse-hill", "Tulse Hill"],
  ["west-norwood", "West Norwood"],
  ["herne-hill", "Herne Hill"],
  ["dulwich", "Dulwich"],
  ["crystal-palace", "Crystal Palace"],
  ["mitcham", "Mitcham"],
  ["colliers-wood", "Colliers Wood"],
];

const articleSlugs = [
  "can-i-drive-after-hijama",
  "clean-hijama-clinic-south-london",
  "cupping-dulwich",
  "cupping-therapy-clapham",
  "female-hijama-therapist-south-london",
  "first-hijama-appointment-streatham",
  "hijama-aftercare-london",
  "hijama-brixton",
  "hijama-cost-london",
  "hijama-crystal-palace",
  "hijama-norbury",
  "hijama-vs-dry-cupping",
  "hijama-vs-massage",
  "hijama-west-norwood",
  "insured-hijama-clinic-streatham",
  "male-hijama-therapist-south-london",
  "mens-hijama-south-london",
  "wet-cupping-balham",
  "wet-cupping-herne-hill",
  "wet-cupping-men-women-south-london",
  "wet-cupping-tooting",
  "wet-cupping-tulse-hill",
  "what-to-wear-hijama",
  "women-only-hijama-south-london",
];

const requiredRoutes = [
  "/",
  "/services/",
  "/about/",
  "/contact/",
  "/blog/",
  "/privacy/",
  ...articleSlugs.map((slug) => `/articles/${slug}/`),
  "/areas/",
  ...areas.map(([slug]) => `/areas/${slug}/`),
];

const forbiddenPublishedContent = [
  /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
  /"aggregateRating"\s*:/i,
  /"ratingValue"\s*:/i,
  /"reviewCount"\s*:/i,
  /\b100\+\s+verified reviews\b/i,
  /\bfully insured hijama clinic\b/i,
  /\b(?:fully\s+)?insured wet cupping\b/i,
  /\bfull insurance (?:means|signals)\b/i,
  /\bsterile (?:equipment|cups?|blades?|lancets?)\b/i,
  /\bSunnah[- ](?:days?|dates?)\b/i,
  /\b17(?:th)?\s*(?:,|\/|and|&)\s*19(?:th)?\s*(?:,|\/|and|&)\s*21(?:st)?\b/i,
  /\b60\s*(?:[–-]|to)\s*75\s*minutes?\b/i,
  /\bquarterly (?:rhythm|sessions?)\b/i,
  /\bfirst 48 hours\b/i,
  /\bfemale-only environment\b/i,
  /\bcheck suitability\b/i,
];

let fixture;
let builtRoot;

before(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-published-"));
  for (const entry of publicEntries) {
    fs.cpSync(path.join(root, entry), path.join(fixture, entry), {recursive: true});
  }
  execFileSync(process.execPath, [path.join(root, "scripts", "build-site.mjs"), fixture], {
    cwd: root,
    encoding: "utf8",
  });
  builtRoot = path.join(fixture, "dist");
});

after(() => {
  if (fixture) fs.rmSync(fixture, {recursive: true, force: true});
});

function walkHtml(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    if (["node_modules", ".git", "dist"].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkHtml(absolute);
    return entry.isFile() && entry.name.endsWith(".html") ? [absolute] : [];
  });
}

function readFrom(directory, relativePath) {
  return fs.readFileSync(path.join(directory, relativePath), "utf8");
}

function routeForFile(file, directory = builtRoot) {
  const relative = path.relative(directory, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/index\.html$/, "")}`;
}

function fileForRoute(route, directory = builtRoot) {
  if (route === "/") return path.join(directory, "index.html");
  return path.join(directory, route.slice(1), "index.html");
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];
}

function allJsonLd(markup, label = "document") {
  return [...markup.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match, index) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        assert.fail(`${label}: JSON-LD block ${index + 1} is invalid: ${error.message}`);
      }
    });
}

function schemaNodes(documents) {
  return documents.flatMap((document) => document["@graph"] || [document]);
}

function assertNoEmptySchemaNames(value, label) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoEmptySchemaNames(item, label);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Object.hasOwn(value, "name")) {
    assert.equal(typeof value.name, "string", `${label}: schema name must be text`);
    assert.ok(value.name.trim(), `${label}: empty schema name`);
  }
  for (const child of Object.values(value)) assertNoEmptySchemaNames(child, label);
}

function visibleText(markup) {
  return markup
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(?:rsquo|#8217|apos|#39);/g, "'")
    .replace(/&(?:ndash|#8211);/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedWords(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9£]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(value, size = 5) {
  const words = normalizedWords(value);
  return new Set(words.slice(0, Math.max(0, words.length - size + 1))
    .map((_, index) => words.slice(index, index + size).join(" ")));
}

function jaccard(left, right) {
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function sitemapEntries(markup) {
  return [...markup.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/g)]
    .map((match) => ({loc: match[1], lastmod: match[2]}));
}

function linkByText(markup, text) {
  return [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .find((match) => visibleText(match[2]) === text);
}

test("the build exposes exactly 46 indexable routes with complete self-consistent metadata", () => {
  assert.equal(walkHtml(root).length, 48, "source HTML contract changed");
  const builtFiles = walkHtml(builtRoot);
  assert.equal(builtFiles.length, 47, "dist HTML contract changed");

  const indexable = builtFiles.filter((file) => !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(fs.readFileSync(file, "utf8")));
  assert.equal(indexable.length, 46, "indexable route contract changed");

  for (const file of indexable) {
    const relative = path.relative(builtRoot, file);
    const html = fs.readFileSync(file, "utf8");
    const route = routeForFile(file);
    const expectedCanonical = `${origin}${route}`;
    const titleTags = [...html.matchAll(/<title>[\s\S]*?<\/title>/gi)];
    const descriptions = [...html.matchAll(/<meta\s+name="description"\s+content="[^"]+"\s*\/?\s*>/gi)];
    const canonicals = [...html.matchAll(/<link\s+rel="canonical"\s+href="[^"]+"\s*\/?\s*>/gi)];
    const h1s = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];

    assert.match(html, /<html\s+lang="en-GB">/i, `${relative}: wrong or missing language`);
    assert.equal(titleTags.length, 1, `${relative}: expected one title`);
    assert.ok(visibleText(titleTags[0][0]).length >= 10, `${relative}: title is not useful`);
    assert.equal(descriptions.length, 1, `${relative}: expected one meta description`);
    assert.ok(attribute(descriptions[0][0], "content").length >= 40, `${relative}: description is too short`);
    assert.equal(canonicals.length, 1, `${relative}: expected one canonical`);
    assert.equal(attribute(canonicals[0][0], "href"), expectedCanonical, `${relative}: canonical is not self-referential`);
    assert.equal(h1s.length, 1, `${relative}: expected one H1`);

    const documents = allJsonLd(html, relative);
    assert.ok(documents.length > 0, `${relative}: missing JSON-LD`);
    for (const document of documents) assertNoEmptySchemaNames(document, relative);
    for (const pattern of forbiddenPublishedContent) assert.doesNotMatch(html, pattern, `${relative}: forbidden published content`);
    for (const href of [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => match[1])) {
      assert.doesNotMatch(href, /(?:^|\/)index\.html(?:$|[?#])/i, `${relative}: unclean internal href ${href}`);
    }
  }
});

test("sitemap, canonicals and built files have exact one-to-one route parity", () => {
  const entries = sitemapEntries(readFrom(builtRoot, "sitemap.xml"));
  const locs = entries.map(({loc}) => loc);
  assert.equal(entries.length, 46);
  assert.equal(new Set(locs).size, locs.length, "duplicate sitemap URL");
  assert.deepEqual(new Set(locs), new Set(requiredRoutes.map((route) => `${origin}${route}`)));

  const canonicalUrls = walkHtml(builtRoot)
    .map((file) => fs.readFileSync(file, "utf8"))
    .filter((html) => !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html))
    .map((html) => html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]);
  assert.deepEqual(new Set(locs), new Set(canonicalUrls));
  assert.equal(canonicalUrls.length, new Set(canonicalUrls).size, "duplicate canonical URL");

  for (const loc of locs) {
    const route = new URL(loc).pathname;
    assert.ok(fs.existsSync(fileForRoute(route)), `${loc}: no built index.html`);
  }

  const notFound = readFrom(builtRoot, "404.html");
  assert.match(notFound, /<meta\s+name="robots"\s+content="[^"]*noindex/i);
  assert.ok(!locs.includes(`${origin}/404.html`), "404 must stay out of sitemap");
});

test("all published shells use clean global routes and safe generic booking controls", () => {
  for (const file of walkHtml(builtRoot)) {
    const relative = path.relative(builtRoot, file);
    const html = fs.readFileSync(file, "utf8");
    const siteNav = html.match(/<nav\b[^>]*class="[^"]*site-nav[^"]*"[^>]*>[\s\S]*?<\/nav>/i)?.[0];
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0];
    const mobile = html.match(/<nav\b[^>]*class="[^"]*mobile-bar[^"]*"[^>]*>[\s\S]*?<\/nav>/i)?.[0]
      || html.match(/<div\b[^>]*class="[^"]*mobile-bar[^"]*"[^>]*>[\s\S]*?<\/div>/i)?.[0];

    assert.ok(siteNav, `${relative}: missing global navigation`);
    assert.equal(attribute(linkByText(siteNav, "Areas")?.[0] || "", "href"), "/areas/", `${relative}: Areas must link to the hub`);
    assert.equal(attribute(linkByText(siteNav, "Cupping & prices")?.[0] || "", "href"), "/services/", `${relative}: current service navigation missing`);
    assert.ok(footer, `${relative}: missing footer`);
    assert.equal(attribute(linkByText(footer, "Accessibility help")?.[0] || "", "href"), "/contact/", `${relative}: accessibility help link missing`);

    for (const [label, region] of [["header", html.match(/<header\b[\s\S]*?<\/header>/i)?.[0]], ["footer", footer], ["mobile", mobile]]) {
      assert.ok(region, `${relative}: missing ${label} shell`);
      assert.doesNotMatch(region, /oiid=sv%3A(?:14524918|15058937)/i, `${relative}: ${label} hardwires a gendered service`);
    }
  }
});

test("all built internal hrefs resolve and published images declare accessible dimensions", () => {
  for (const file of walkHtml(builtRoot)) {
    const relative = path.relative(builtRoot, file);
    const html = fs.readFileSync(file, "utf8");

    for (const image of [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0])) {
      assert.match(image, /\balt="[^"]*"/i, `${relative}: image missing alt text`);
      assert.match(image, /\bwidth="\d+"/i, `${relative}: image missing intrinsic width`);
      assert.match(image, /\bheight="\d+"/i, `${relative}: image missing intrinsic height`);
      const src = attribute(image, "src");
      if (src?.startsWith("/")) {
        const assetPath = new URL(src.replace(/&amp;/g, "&"), origin).pathname;
        assert.ok(fs.existsSync(path.join(builtRoot, assetPath.slice(1))), `${relative}: missing image target ${src}`);
      }
    }

    for (const href of [...html.matchAll(/\bhref="([^"]+)"/gi)].map((match) => match[1])) {
      if (!href.startsWith("/")) continue;
      const pathname = new URL(href.replace(/&amp;/g, "&"), origin).pathname;
      const target = pathname === "/"
        ? path.join(builtRoot, "index.html")
        : pathname.endsWith("/")
          ? path.join(builtRoot, pathname.slice(1), "index.html")
          : path.join(builtRoot, pathname.slice(1));
      assert.ok(fs.existsSync(target), `${relative}: unresolved internal href ${href}`);
    }
  }
});

test("the areas hub clearly describes service areas for one inclusive Streatham clinic", () => {
  const html = readFrom(builtRoot, "areas/index.html");
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || "";
  const text = visibleText(main);

  assert.match(text, /one clinic[^.]*330 Streatham High Rd[^.]*SW16 6HH/i);
  assert.match(text, /service areas?, not branches/i);
  assert.match(text, /open daily[^.]*10:00[^.]*19:00/i);
  assert.match(text, /every faith and background/i);
  assert.ok(text.toLowerCase().indexOf("wet cupping") < text.toLowerCase().indexOf("hijama"), "hub must lead with cupping");
  assert.match(text, /complementary care[^.]*not a replacement for medical advice, diagnosis or treatment/i);
  assert.match(html, /nccih\.nih\.gov\/health\/cupping/i);
  assert.match(html, new RegExp(directionsUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /href="\/#book"/i);

  for (const [slug, name] of areas) {
    const link = linkByText(main, name);
    assert.ok(link, `hub missing ${name}`);
    assert.equal(attribute(link[0], "href"), `/areas/${slug}/`);
  }

  const nodes = schemaNodes(allJsonLd(html, "areas/index.html"));
  assert.equal(nodes.filter((node) => node["@type"] === "CollectionPage").length, 1);
  assert.equal(nodes.filter((node) => node["@type"] === "ItemList").length, 1);
  assert.equal(nodes.filter((node) => node["@type"] === "BreadcrumbList").length, 1);
  assert.ok(!nodes.some((node) => ["LocalBusiness", "HealthAndBeautyBusiness", "PostalAddress"].includes(node["@type"])), "hub duplicates a clinic/address entity");
});

test("all 15 locality pages publish the exact service-area copy and schema contract", () => {
  for (const [slug, name] of areas) {
    const relative = `areas/${slug}/index.html`;
    const html = readFrom(builtRoot, relative);
    const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || "";
    const text = visibleText(main);
    const expectedHeading = slug === "streatham" ? "Wet cupping in Streatham" : `Wet cupping near ${name}`;
    const title = visibleText(html.match(/<title>[\s\S]*?<\/title>/i)?.[0] || "");
    const h1 = visibleText(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || "");

    assert.equal(title, expectedHeading, `${relative}: wrong title`);
    assert.equal(h1, expectedHeading, `${relative}: wrong H1`);
    assert.match(text, /appointments take place at (?:our|the) (?:one|single) (?:clinic )?(?:in Streatham|Streatham clinic)/i);
    assert.match(text, /330 Streatham High Rd[^.]*SW16 6HH/i);
    assert.match(text, /every faith and background/i);
    assert.ok(text.toLowerCase().indexOf("wet cupping") < text.toLowerCase().indexOf("hijama"), `${relative}: must lead with cupping`);
    assert.match(text, /women[^.]*£45[^.]*45 minutes/i);
    assert.match(text, /men[^.]*£45[^.]*40 minutes/i);
    assert.match(text, /same-sex[^.]*private appointments/i);
    assert.match(text, /new single-use cups and blades/i);
    assert.match(text, /complementary care[^.]*not a replacement for medical advice, diagnosis or treatment/i);
    assert.match(html, /nccih\.nih\.gov\/health\/cupping/i);
    assert.match(html, new RegExp(directionsUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /href="\/#book"/i);
    assert.doesNotMatch(html, /oiid=sv%3A(?:14524918|15058937)/i);

    const documents = allJsonLd(html, relative);
    const nodes = schemaNodes(documents);
    const services = nodes.filter((node) => node["@type"] === "Service");
    const breadcrumbs = nodes.filter((node) => node["@type"] === "BreadcrumbList");
    assert.equal(nodes.length, 2, `${relative}: expected only Service and BreadcrumbList nodes`);
    assert.equal(services.length, 1, `${relative}: expected exactly one Service`);
    assert.equal(breadcrumbs.length, 1, `${relative}: expected exactly one BreadcrumbList`);
    assert.equal(services[0]["@id"], `${origin}/areas/${slug}/#service`);
    assert.equal(services[0].serviceType, "Wet cupping");
    assert.deepEqual(services[0].areaServed, {"@type": "Place", name});
    assert.deepEqual(services[0].provider, {"@id": `${origin}/#clinic`});
    assert.deepEqual(
      breadcrumbs[0].itemListElement.map(({position, name: crumbName, item}) => ({position, name: crumbName, item})),
      [
        {position: 1, name: "Home", item: `${origin}/`},
        {position: 2, name: "Areas", item: `${origin}/areas/`},
        {position: 3, name, item: `${origin}/areas/${slug}/`},
      ],
    );
    assert.doesNotMatch(JSON.stringify(documents), /"(?:address|geo|aggregateRating)"\s*:/i);
    assert.doesNotMatch(JSON.stringify(documents), /"@type":"(?:LocalBusiness|HealthAndBeautyBusiness)"/i);
  }
});

test("locality-focused prose stays substantive and below 0.55 normalized similarity", (t) => {
  const corpora = areas.map(([slug, name]) => {
    const html = readFrom(builtRoot, `areas/${slug}/index.html`);
    const block = html.match(/<section\b[^>]*data-area-local-copy[^>]*>([\s\S]*?)<\/section>/i)?.[1];
    assert.ok(block, `${slug}: missing locality prose marker`);
    const text = visibleText(block).replace(new RegExp(name, "gi"), "local area");
    assert.ok(normalizedWords(text).length >= 90, `${slug}: locality prose is too thin`);
    return {slug, shingles: shingles(text)};
  });

  let maximum = {left: "", right: "", score: 0};
  for (let left = 0; left < corpora.length; left += 1) {
    for (let right = left + 1; right < corpora.length; right += 1) {
      const score = jaccard(corpora[left].shingles, corpora[right].shingles);
      if (score > maximum.score) maximum = {left: corpora[left].slug, right: corpora[right].slug, score};
      assert.ok(score <= 0.55, `${corpora[left].slug} and ${corpora[right].slug} similarity ${score.toFixed(3)} exceeds 0.55`);
    }
  }
  t.diagnostic(`maximum normalized five-word-shingle similarity: ${maximum.score.toFixed(3)} (${maximum.left} / ${maximum.right})`);
});

test("area dates and both LLM catalogues identify one-clinic service areas", () => {
  const pageModified = JSON.parse(fs.readFileSync(path.join(root, "data", "page-modified.json"), "utf8"));
  const sitemap = sitemapEntries(fs.readFileSync(path.join(root, "sitemap.xml"), "utf8"));
  const sitemapDates = new Map(sitemap.map(({loc, lastmod}) => [new URL(loc).pathname, lastmod]));

  for (const route of ["/areas/", ...areas.map(([slug]) => `/areas/${slug}/`)]) {
    assert.equal(pageModified[route], "2026-07-21", `${route}: stored modified date is stale`);
    assert.equal(sitemapDates.get(route), "2026-07-21", `${route}: sitemap modified date is stale`);
  }

  for (const filename of ["llms.txt", "llms-full.txt"]) {
    const content = fs.readFileSync(path.join(root, filename), "utf8");
    assert.match(content, /service areas?[^.\n]*single Streatham clinic|single Streatham clinic[^.\n]*service areas?/i, `${filename}: one-clinic service-area meaning missing`);
    for (const [slug] of areas) {
      assert.match(content, new RegExp(`${origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/areas/${slug}/`), `${filename}: missing ${slug} service-area link`);
    }
  }
});

test("the site checker rejects semantic route, schema and clean-link violations", (t) => {
  const badRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-checker-bad-"));
  t.after(() => fs.rmSync(badRoot, {recursive: true, force: true}));
  const description = "A deliberately long fixture description that satisfies the old shallow metadata-only checker.";
  fs.writeFileSync(path.join(badRoot, "index.html"), `<!doctype html>
<html lang="en-US"><head><title>Broken publishing fixture</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${origin}/wrong/">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":""}</script>
</head><body><h1>First</h1><h1>Second</h1><a href="/about/index.html">About</a></body></html>`);
  fs.writeFileSync(path.join(badRoot, "404.html"), `<!doctype html><html lang="en-GB"><head><title>Page not found fixture</title><meta name="description" content="${description}"><meta name="robots" content="noindex, follow"></head><body><h1>Not found</h1></body></html>`);
  fs.writeFileSync(path.join(badRoot, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  fs.writeFileSync(path.join(badRoot, "sitemap.xml"), `<?xml version="1.0"?><urlset><url><loc>${origin}/</loc><lastmod>2026-07-21</lastmod></url></urlset>`);
  fs.writeFileSync(path.join(badRoot, "llms.txt"), "fixture\n");

  const result = spawnSync(process.execPath, [path.join(root, "scripts", "check-site.mjs"), badRoot], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /lang|H1|canonical|schema|JSON-LD|index\.html|sitemap/i);
});

test("the site checker rejects missing image attributes and unresolved root-relative links", (t) => {
  const badRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-checker-assets-"));
  t.after(() => fs.rmSync(badRoot, {recursive: true, force: true}));
  const description = "A deliberately complete fixture description that leaves only asset and internal-link faults.";
  fs.writeFileSync(path.join(badRoot, "index.html"), `<!doctype html>
<html lang="en-GB"><head><title>Broken asset fixture</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${origin}/">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Fixture"}</script>
</head><body><h1>Fixture page</h1><a href="/missing/">Missing route</a><img src="/missing.png"></body></html>`);
  fs.writeFileSync(path.join(badRoot, "404.html"), `<!doctype html><html lang="en-GB"><head><title>Page not found fixture</title><meta name="description" content="${description}"><meta name="robots" content="noindex, follow"></head><body><h1>Not found</h1></body></html>`);
  fs.writeFileSync(path.join(badRoot, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  fs.writeFileSync(path.join(badRoot, "sitemap.xml"), `<?xml version="1.0"?><urlset><url><loc>${origin}/</loc><lastmod>2026-07-21</lastmod></url></urlset>`);
  fs.writeFileSync(path.join(badRoot, "llms.txt"), "fixture\n");

  const result = spawnSync(process.execPath, [path.join(root, "scripts", "check-site.mjs"), badRoot], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 1, result.stdout || result.stderr);
  assert.match(result.stderr, /image|alt|width|height|unresolved|missing\/|missing\.png/i);
});

test("the manual area renderer is deterministic and refuses unreviewed or symlinked destinations before writing", (t) => {
  const makeFixture = () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-area-renderer-"));
    fs.mkdirSync(path.join(directory, "scripts"), {recursive: true});
    fs.mkdirSync(path.join(directory, "data"), {recursive: true});
    fs.cpSync(path.join(root, "scripts", "generate-areas.mjs"), path.join(directory, "scripts", "generate-areas.mjs"));
    fs.cpSync(path.join(root, "data", "area-pages.json"), path.join(directory, "data", "area-pages.json"));
    t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
    return directory;
  };
  const run = (directory) => spawnSync(process.execPath, ["scripts/generate-areas.mjs"], {cwd: directory, encoding: "utf8"});

  const clean = makeFixture();
  assert.equal(run(clean).status, 0);
  const first = walkHtml(path.join(clean, "areas"))
    .map((file) => [path.relative(clean, file), fs.readFileSync(file, "utf8")]);
  assert.equal(first.length, 16);
  assert.equal(run(clean).status, 0);
  const second = walkHtml(path.join(clean, "areas"))
    .map((file) => [path.relative(clean, file), fs.readFileSync(file, "utf8")]);
  assert.deepEqual(second, first, "manual rendering is not deterministic");

  const unreviewed = makeFixture();
  const records = JSON.parse(fs.readFileSync(path.join(unreviewed, "data", "area-pages.json"), "utf8"));
  records[0].slug = "unreviewed-place";
  fs.writeFileSync(path.join(unreviewed, "data", "area-pages.json"), `${JSON.stringify(records)}\n`);
  fs.mkdirSync(path.join(unreviewed, "areas"));
  fs.writeFileSync(path.join(unreviewed, "areas", "sentinel.txt"), "UNCHANGED\n");
  const unknownResult = run(unreviewed);
  assert.equal(unknownResult.status, 1, unknownResult.stdout || unknownResult.stderr);
  assert.match(unknownResult.stderr, /allowlist|reviewed/i);
  assert.equal(fs.readFileSync(path.join(unreviewed, "areas", "sentinel.txt"), "utf8"), "UNCHANGED\n");
  assert.equal(fs.existsSync(path.join(unreviewed, "areas", "index.html")), false);

  const linked = makeFixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-area-outside-"));
  t.after(() => fs.rmSync(outside, {recursive: true, force: true}));
  fs.mkdirSync(path.join(linked, "areas"));
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "UNCHANGED\n");
  fs.symlinkSync(outside, path.join(linked, "areas", "streatham"), "dir");
  const symlinkResult = run(linked);
  assert.equal(symlinkResult.status, 1, symlinkResult.stdout || symlinkResult.stderr);
  assert.match(symlinkResult.stderr, /symbolic link/i);
  assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "UNCHANGED\n");
  assert.equal(fs.existsSync(path.join(linked, "areas", "index.html")), false);
});

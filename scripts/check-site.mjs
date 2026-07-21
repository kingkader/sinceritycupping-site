import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const requestedRoot = process.argv[2] || ".";
const root = path.resolve(process.cwd(), requestedRoot);
const origin = "https://sinceritycupping.co.uk";
const htmlFiles = [];
const errors = [];
const forbiddenPublishedContent = [
  ["remote Google Font", /fonts\.googleapis\.com|fonts\.gstatic\.com/i],
  ["aggregate rating", /"(?:aggregateRating|ratingValue|reviewCount)"\s*:/i],
  ["verified review wording", /\b100\+\s+verified reviews\b/i],
  ["unsupported insurance claim", /\bfully insured hijama clinic\b|\b(?:fully\s+)?insured wet cupping\b|\bfull insurance (?:means|signals)\b/i],
  ["unsupported sterile claim", /\bsterile (?:equipment|cups?|blades?|lancets?)\b/i],
  ["unsupported lunar-date advice", /\bSunnah[- ](?:days?|dates?)\b|\b17(?:th)?\s*(?:,|\/|and|&)\s*19(?:th)?\s*(?:,|\/|and|&)\s*21(?:st)?\b/i],
  ["unsupported fixed duration", /\b60\s*(?:[–-]|to)\s*75\s*minutes?\b/i],
  ["unsupported frequency advice", /\bquarterly (?:rhythm|sessions?)\b/i],
  ["retired aftercare anchor", /\bfirst 48 hours\b/i],
  ["unsupported environment claim", /\bfemale-only environment\b/i],
  ["unsupported suitability advice", /\bcheck suitability\b/i],
];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    if (
      entry.name === "node_modules"
      || entry.name === ".git"
      || (requestedRoot === "." && directory === root && entry.name === "dist")
    ) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(absolute);
  }
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function routeForFile(file) {
  const filePath = relative(file);
  if (filePath === "index.html") return "/";
  if (filePath.endsWith("/index.html")) return `/${filePath.slice(0, -"index.html".length)}`;
  return `/${filePath}`;
}

function fileForRoute(route) {
  if (route === "/") return path.join(root, "index.html");
  return path.join(root, route.slice(1), "index.html");
}

function report(file, message) {
  errors.push(`${relative(file)}: ${message}`);
}

function inspectSchemaNames(value, file, location = "JSON-LD") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectSchemaNames(item, file, `${location}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Object.hasOwn(value, "name") && (typeof value.name !== "string" || !value.name.trim())) {
    report(file, `${location} contains an empty schema name`);
  }
  for (const [key, child] of Object.entries(value)) inspectSchemaNames(child, file, `${location}.${key}`);
}

function internalAnchorHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((match) => match[1]);
}

function targetForRootRelative(value) {
  const url = new URL(value.replace(/&amp;/g, "&"), origin);
  if (url.origin !== origin) return null;
  if (url.pathname === "/") return path.join(root, "index.html");
  if (url.pathname.endsWith("/")) return path.join(root, url.pathname.slice(1), "index.html");
  return path.join(root, url.pathname.slice(1));
}

function namedShellRegions(html) {
  return [
    html.match(/<header\b[\s\S]*?<\/header>/i)?.[0],
    html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0],
    html.match(/<(?:nav|div)\b[^>]*class="[^"]*mobile-bar[^"]*"[^>]*>[\s\S]*?<\/(?:nav|div)>/i)?.[0],
  ].filter(Boolean);
}

walk(root);
htmlFiles.sort();

const indexableCanonicals = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const filePath = relative(file);
  const robotsTag = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .find((tag) => attribute(tag[0], "name")?.toLowerCase() === "robots")?.[0];
  const noindex = /(?:^|[,\s])noindex(?:$|[,\s])/i.test(attribute(robotsTag || "", "content") || "");
  const isPreview = filePath.startsWith("preview/");
  const isNotFound = filePath === "404.html";
  const isPublished = !isPreview;
  const titleTags = [...html.matchAll(/<title>[\s\S]*?<\/title>/gi)];
  const descriptionTags = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .filter((tag) => attribute(tag[0], "name")?.toLowerCase() === "description");
  const canonicalTags = [...html.matchAll(/<link\b[^>]*>/gi)]
    .filter((tag) => attribute(tag[0], "rel")?.toLowerCase().split(/\s+/).includes("canonical"));
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  if (!/<html\s+lang="en-GB">/i.test(html)) report(file, "missing lang=\"en-GB\"");
  if (titleTags.length !== 1 || titleTags[0][0].replace(/<[^>]+>/g, "").trim().length < 10) report(file, "expected one useful title");
  if (descriptionTags.length !== 1 || (attribute(descriptionTags[0]?.[0] || "", "content") || "").trim().length < 40) report(file, "expected one useful meta description");
  if (h1Count !== 1) report(file, `expected one H1, found ${h1Count}`);

  if (isPublished) {
    for (const href of internalAnchorHrefs(html)) {
      if (/(?:^|\/)index\.html(?:$|[?#])/i.test(href)) report(file, `internal href must be extensionless: ${href}`);
      if (!/^(?:https?:|tel:|mailto:|#|\/)/i.test(href)) report(file, `internal href must be root-relative: ${href}`);
    }
    for (const href of [...html.matchAll(/\bhref="([^"]+)"/gi)].map((match) => match[1])) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const target = targetForRootRelative(href);
      if (target && !fs.existsSync(target)) report(file, `unresolved root-relative href: ${href}`);
    }
    for (const image of [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0])) {
      if (!/\balt="[^"]*"/i.test(image)) report(file, "image missing alt text");
      if (!/\bwidth="\d+"/i.test(image)) report(file, "image missing intrinsic width");
      if (!/\bheight="\d+"/i.test(image)) report(file, "image missing intrinsic height");
      const src = attribute(image, "src");
      if (!src) {
        report(file, "image missing src");
      } else if (src.startsWith("/") && !src.startsWith("//")) {
        const target = targetForRootRelative(src);
        if (target && !fs.existsSync(target)) report(file, `unresolved root-relative image: ${src}`);
      }
    }
    for (const [label, pattern] of forbiddenPublishedContent) {
      if (pattern.test(html)) report(file, `contains forbidden ${label}`);
    }
    for (const region of namedShellRegions(html)) {
      if (/oiid=sv%3A\d+/i.test(region)) report(file, "generic shell hardwires a service-specific booking route");
    }
  }

  if (noindex) {
    if (!isNotFound && !isPreview) report(file, "unexpected noindex page");
    continue;
  }

  if (isNotFound) report(file, "404 must remain noindex");
  if (canonicalTags.length !== 1) {
    report(file, `expected one canonical, found ${canonicalTags.length}`);
  } else {
    const canonical = attribute(canonicalTags[0][0], "href");
    const expected = `${origin}${routeForFile(file)}`;
    if (canonical !== expected) report(file, `canonical must be self-referential (${expected}), found ${canonical}`);
    indexableCanonicals.push(canonical);
  }

  const jsonScripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (jsonScripts.length === 0) report(file, "missing JSON-LD");
  jsonScripts.forEach((match, index) => {
    try {
      inspectSchemaNames(JSON.parse(match[1]), file, `JSON-LD block ${index + 1}`);
    } catch (error) {
      report(file, `invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  });
}

const robotsPath = path.join(root, "robots.txt");
const sitemapPath = path.join(root, "sitemap.xml");
const llmsPath = path.join(root, "llms.txt");
if (!fs.existsSync(robotsPath)) errors.push("missing robots.txt");
if (!fs.existsSync(sitemapPath)) errors.push("missing sitemap.xml");
if (!fs.existsSync(llmsPath)) errors.push("missing llms.txt");

if (fs.existsSync(robotsPath) && /Disallow:\s*\/(?:\s|$)/im.test(fs.readFileSync(robotsPath, "utf8"))) {
  errors.push("robots.txt blocks crawling");
}

if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push("sitemap contains duplicate URLs");
  if (new Set(indexableCanonicals).size !== indexableCanonicals.length) errors.push("published HTML contains duplicate canonicals");

  const sitemapSet = new Set(sitemapUrls);
  const canonicalSet = new Set(indexableCanonicals);
  for (const canonical of canonicalSet) if (!sitemapSet.has(canonical)) errors.push(`canonical missing from sitemap: ${canonical}`);
  for (const loc of sitemapSet) {
    if (!canonicalSet.has(loc)) errors.push(`sitemap URL has no indexable canonical: ${loc}`);
    let url;
    try {
      url = new URL(loc);
    } catch {
      errors.push(`invalid sitemap URL: ${loc}`);
      continue;
    }
    if (url.origin !== origin) errors.push(`sitemap URL uses unexpected origin: ${loc}`);
    if (!fs.existsSync(fileForRoute(url.pathname))) errors.push(`sitemap URL has no built file: ${loc}`);
  }
  if (sitemapSet.has(`${origin}/404.html`)) errors.push("404 must stay out of sitemap");
}

if (requestedRoot === ".") {
  for (const sourcePath of ["data/area-pages.json", "scripts/generate-areas.mjs"]) {
    const absolute = path.join(root, sourcePath);
    if (!fs.existsSync(absolute)) {
      errors.push(`missing maintained area source: ${sourcePath}`);
      continue;
    }
    const source = fs.readFileSync(absolute, "utf8");
    if (/href=["'][^"']*index\.html/i.test(source)) errors.push(`${sourcePath}: maintained template contains an unclean internal href`);
    for (const [label, pattern] of forbiddenPublishedContent) {
      if (pattern.test(source)) errors.push(`${sourcePath}: contains forbidden ${label}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML file(s). Metadata, routes, JSON-LD, clean links, sitemap and llms.txt look OK.`);

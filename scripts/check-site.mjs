import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const requestedRoot = process.argv[2] || ".";
const root = path.resolve(process.cwd(), requestedRoot);
const origin = "https://sinceritycupping.co.uk";
const htmlFiles = [];
const errors = [];
const areaNames = new Map([
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
]);
const expectedAreaUserRoutes = new Set([...areaNames.keys()].map((slug) => `/areas/${slug}/`));
const expectedPublishedAreaRoutes = new Set(["/areas/", ...expectedAreaUserRoutes]);
const expectedIndexableAreaRoutes = new Set(["/areas/"]);
const expectedIndexableRouteCount = 31;
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
  ["unsupported exclusive setting claim", /\b(?:female|women|woman|male|men|man)[ -]only\s+(?:environment|setting|clinic|room|space|premises)\b|\b(?:environment|setting|clinic|room|space|premises)\s+(?:is\s+)?(?:reserved\s+)?(?:exclusively|only)\s+for\s+(?:women|men|female|male)\b/i],
  ["unsupported practitioner experience claim", /\b(?:(?:more than|over)\s+)?(?:\d{2,}\+?|twenty|thirty|forty|fifty|sixty)(?:-|\s)+(?:combined\s+)?years?\b|\b(?:combined|together|between (?:the|both) practitioners?)\b[^.!?]{0,80}\b(?:\d{2,}\+?|twenty|thirty|forty|fifty|sixty)\s+years?\b/i],
  ["unsupported suitability advice", /\bcheck suitability\b/i],
  ["passive keep-dry mandate", /\b(?:treated|cupped) (?:area|skin|sites?|marks?)\b[^.!?]{0,50}\b(?:must|should|needs? to|has to|is required to)\b[^.!?]{0,30}\b(?:remain|stay|be kept)\b[^.!?]{0,20}\bdry\b/i],
  ["direct keep-dry mandate", /\b(?:keep|leave)\b[^.!?]{0,40}\b(?:treated|cupped)?\s*(?:area|skin|sites?|marks?)\b[^.!?]{0,25}\bdry\b/i],
  ["washing mandate", /\b(?:avoid|skip|do not|don't|hold off on|refrain from)\b[^.!?]{0,90}\b(?:showers?|baths?|bathe|bathing|wash(?:ing)?|pools?|swimming|saunas?|steam rooms?)\b/i],
  ["exercise mandate", /\b(?:avoid|skip|do not|don't|hold off on|refrain from)\b[^.!?]{0,90}\b(?:gyms?|exercise|sport|training|sweat(?:ing)?)\b/i],
  ["food mandate", /\b(?:avoid|skip|do not|don't|hold off on|refrain from)\b[^.!?]{0,90}\b(?:meat|dairy)\b/i],
  ["post-birth mandate", /\b(?:wait|waiting|delay)\b[^.!?]{0,60}\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve) weeks?\b[^.!?]{0,35}\b(?:after childbirth|after birth|postpartum)\b/i],
  ["driving mandate", /\bdriving may resume\b[^.!?]{0,50}\b(?:steady|well|ready)\b/i],
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

function schemaNodes(document) {
  return Array.isArray(document?.["@graph"]) ? document["@graph"] : [document];
}

function containsSchemaKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => containsSchemaKey(item, key));
  if (!value || typeof value !== "object") return false;
  return Object.hasOwn(value, key) || Object.values(value).some((child) => containsSchemaKey(child, key));
}

function containsSchemaType(value, types) {
  if (Array.isArray(value)) return value.some((item) => containsSchemaType(item, types));
  if (!value || typeof value !== "object") return false;
  const ownTypes = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (ownTypes.some((type) => types.has(type))) return true;
  return Object.values(value).some((child) => containsSchemaType(child, types));
}

function markdownInternalRoutes(markup) {
  return [...markup.matchAll(/\]\((https:\/\/sinceritycupping\.co\.uk[^)\s]*)\)/g)]
    .map((match) => new URL(match[1]))
    .filter((url) => url.origin === origin)
    .map((url) => `${origin}${url.pathname}`);
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
const schemaByRoute = new Map();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const filePath = relative(file);
  const route = routeForFile(file);
  const isAreaUserEndpoint = expectedAreaUserRoutes.has(route);
  const robotsTags = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .filter((tag) => attribute(tag[0], "name")?.toLowerCase() === "robots");
  const robotsTag = robotsTags[0]?.[0];
  const robotsContent = attribute(robotsTag || "", "content") || "";
  const noindex = /(?:^|[,\s])noindex(?:$|[,\s])/i.test(robotsContent);
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

  if (isAreaUserEndpoint) {
    if (robotsTags.length !== 1) report(file, `expected one robots tag, found ${robotsTags.length}`);
    if (robotsContent !== "noindex, follow") report(file, `locality endpoint robots must be exactly noindex, follow; found ${robotsContent || "none"}`);
  }

  if (noindex && !isAreaUserEndpoint) {
    if (!isNotFound && !isPreview) report(file, "unexpected noindex page");
    continue;
  }

  if (isAreaUserEndpoint && !noindex) report(file, "locality endpoint must be noindex, follow");
  if (isNotFound) report(file, "404 must remain noindex");
  if (canonicalTags.length !== 1) {
    report(file, `expected one canonical, found ${canonicalTags.length}`);
  } else {
    const canonical = attribute(canonicalTags[0][0], "href");
    const expected = `${origin}${route}`;
    if (canonical !== expected) report(file, `canonical must be self-referential (${expected}), found ${canonical}`);
    if (!noindex) indexableCanonicals.push(canonical);
  }

  const jsonScripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (jsonScripts.length === 0) report(file, "missing JSON-LD");
  const nodes = [];
  jsonScripts.forEach((match, index) => {
    try {
      const document = JSON.parse(match[1]);
      inspectSchemaNames(document, file, `JSON-LD block ${index + 1}`);
      nodes.push(...schemaNodes(document));
    } catch (error) {
      report(file, `invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  });
  schemaByRoute.set(route, nodes);
}

const canonicalSet = new Set(indexableCanonicals);
const canonicalRoutes = new Set([...canonicalSet].map((canonical) => new URL(canonical).pathname));
const builtAreaRoutes = new Set(htmlFiles.map(routeForFile).filter((route) => route.startsWith("/areas/")));
const indexableAreaRoutes = new Set([...canonicalRoutes].filter((route) => route.startsWith("/areas/")));
if (canonicalSet.size !== expectedIndexableRouteCount) {
  errors.push(`expected exactly ${expectedIndexableRouteCount} indexable canonical routes, found ${canonicalSet.size}`);
}
for (const route of expectedPublishedAreaRoutes) {
  if (!builtAreaRoutes.has(route)) errors.push(`missing exact published area route: ${route}`);
}
for (const route of builtAreaRoutes) {
  if (!expectedPublishedAreaRoutes.has(route)) errors.push(`unexpected area route outside exact hub and locality set: ${route}`);
}
for (const route of expectedIndexableAreaRoutes) {
  if (!indexableAreaRoutes.has(route)) errors.push(`missing exact indexable area route: ${route}`);
}
for (const route of indexableAreaRoutes) {
  if (!expectedIndexableAreaRoutes.has(route)) errors.push(`locality endpoint must not be indexable: ${route}`);
}

for (const [slug, name] of areaNames) {
  const route = `/areas/${slug}/`;
  const nodes = schemaByRoute.get(route) || [];
  const services = nodes.filter((node) => node?.["@type"] === "Service");
  const breadcrumbs = nodes.filter((node) => node?.["@type"] === "BreadcrumbList");
  const duplicatesBusiness = nodes.some((node) => containsSchemaType(
    node,
    new Set(["LocalBusiness", "HealthAndBeautyBusiness"]),
  ));
  if (nodes.length !== 2) errors.push(`${route}: expected only one Service and one BreadcrumbList schema node`);
  if (services.length !== 1) errors.push(`${route}: expected exactly one Service schema node`);
  if (breadcrumbs.length !== 1) errors.push(`${route}: expected exactly one BreadcrumbList schema node`);
  if (duplicatesBusiness) errors.push(`${route}: must not duplicate a LocalBusiness or HealthAndBeautyBusiness entity`);
  if (nodes.some((node) => containsSchemaKey(node, "address"))) errors.push(`${route}: must not duplicate a clinic address`);

  const [service] = services;
  if (service) {
    if (service["@id"] !== `${origin}${route}#service`) errors.push(`${route}: Service @id is incorrect`);
    if (service.serviceType !== "Wet cupping") errors.push(`${route}: Service serviceType must be Wet cupping`);
    if (service.url !== `${origin}${route}`) errors.push(`${route}: Service URL is incorrect`);
    if (JSON.stringify(service.areaServed) !== JSON.stringify({"@type": "Place", name})) errors.push(`${route}: Service areaServed is incorrect`);
    if (JSON.stringify(service.provider) !== JSON.stringify({"@id": `${origin}/#clinic`})) errors.push(`${route}: Service provider must reference ${origin}/#clinic`);
  }

  const [breadcrumb] = breadcrumbs;
  if (breadcrumb) {
    const actual = breadcrumb.itemListElement?.map(({position, name: itemName, item}) => ({position, name: itemName, item}));
    const expected = [
      {position: 1, name: "Home", item: `${origin}/`},
      {position: 2, name: "Areas", item: `${origin}/areas/`},
      {position: 3, name, item: `${origin}${route}`},
    ];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(`${route}: BreadcrumbList items are incorrect`);
  }
}

const robotsPath = path.join(root, "robots.txt");
const sitemapPath = path.join(root, "sitemap.xml");
if (!fs.existsSync(robotsPath)) errors.push("missing robots.txt");
if (!fs.existsSync(sitemapPath)) errors.push("missing sitemap.xml");
for (const filename of ["llms.txt", "llms-full.txt"]) {
  const llmsPath = path.join(root, filename);
  if (!fs.existsSync(llmsPath)) {
    errors.push(`missing ${filename}`);
    continue;
  }
  const routes = markdownInternalRoutes(fs.readFileSync(llmsPath, "utf8"));
  const routeSet = new Set(routes);
  if (routes.length !== expectedIndexableRouteCount) errors.push(`${filename} must contain exactly ${expectedIndexableRouteCount} canonical route links, found ${routes.length}`);
  if (routes.length !== routeSet.size) errors.push(`${filename} contains duplicate canonical route links`);
  for (const canonical of canonicalSet) {
    if (!routeSet.has(canonical)) errors.push(`${filename} missing canonical route: ${canonical}`);
  }
  for (const route of routeSet) {
    if (!canonicalSet.has(route)) errors.push(`${filename} contains a non-canonical internal route: ${route}`);
  }
}

if (fs.existsSync(robotsPath) && /Disallow:\s*\/(?:\s|$)/im.test(fs.readFileSync(robotsPath, "utf8"))) {
  errors.push("robots.txt blocks crawling");
}

if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (sitemapUrls.length !== expectedIndexableRouteCount) errors.push(`sitemap must contain exactly ${expectedIndexableRouteCount} URLs, found ${sitemapUrls.length}`);
  if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push("sitemap contains duplicate URLs");
  if (new Set(indexableCanonicals).size !== indexableCanonicals.length) errors.push("published HTML contains duplicate canonicals");

  const sitemapSet = new Set(sitemapUrls);
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

console.log(`Checked ${htmlFiles.length} HTML file(s). Metadata, routes, JSON-LD, clean links, sitemap and both LLM catalogues look OK.`);

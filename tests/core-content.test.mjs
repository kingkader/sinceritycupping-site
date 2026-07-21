import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function htmlFilesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(relativePath);
    return entry.isFile() && entry.name.endsWith(".html") ? [relativePath] : [];
  });
}

function visibleText(markup) {
  return markup
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(?:rsquo|#8217);/g, "’")
    .replace(/&(?:ndash|#8211);/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeAttribute(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function jsonLd(markup) {
  return [...markup.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

function namedShellRegions(markup) {
  return [
    markup.match(/<header\b[\s\S]*?<\/header>/i)?.[0],
    markup.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0],
    markup.match(/<nav\b[^>]*class="[^"]*mobile-bar[^"]*"[^>]*>[\s\S]*?<\/nav>/i)?.[0],
  ].filter(Boolean);
}

function anchors(markup) {
  return [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1].match(/\bhref="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&"),
    text: visibleText(match[2]),
  }));
}

const corePagePaths = [
  "services/index.html",
  "about/index.html",
  "contact/index.html",
  "privacy/index.html",
  "404.html",
  "blog/index.html",
];

const corePages = corePagePaths.map((relativePath) => ({
  relativePath,
  source: read(relativePath),
}));

const manifest = JSON.parse(read("data/article-manifest.json"));
const articlePages = manifest
  .map((article) => ({
    relativePath: `articles/${article.slug}/index.html`,
    source: read(`articles/${article.slug}/index.html`),
  }));

const retiredClaims = [
  /Tirmidhi\s*2051/i,
  /17(?:th)?\s*(?:,|\/|and|&)\s*19(?:th)?\s*(?:,|\/|and|&)\s*21(?:st)?/i,
  /Sunnah days?/i,
  /normally settles within 24\s*(?:[–-]|to)\s*48\s*(?:h|hours?)/i,
  /wait(?:ing)? at least (?:three|3) months? after birth/i,
  /once every (?:three|3) months?/i,
  /\b(?:avoid|no)\b[^.<]{0,100}\b(?:showers?|baths?|pools?|saunas?|gyms?)\b/i,
  /avoid[^.<]{0,80}\b(?:heavy meat|dairy)\b/i,
  /\b(?:diabetes|blood[ -]?thinners?)\b/i,
  /clinical standard/i,
];

test("business data exposes the generic selector and four exact services", () => {
  const business = JSON.parse(read("data/business.json"));

  assert.equal(business.bookingUrl, "/#book");
  assert.deepEqual(
    business.services,
    [
      {
        audience: "Women",
        name: "Women's wet cupping",
        price: "£45",
        durationMinutes: 45,
        bookingUrl: "https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A15058937&share=true&pId=1024551",
      },
      {
        audience: "Men",
        name: "Men's wet cupping",
        price: "£45",
        durationMinutes: 40,
        bookingUrl: "https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A14524918&share=true&pId=1024551",
      },
      {
        audience: "Women",
        name: "Full spiritual appointment",
        price: "£80",
        durationMinutes: 90,
        bookingUrl: "https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A15623186&share=true&pId=1024551",
      },
      {
        audience: "Men",
        name: "Full spiritual appointment",
        price: "£80",
        durationMinutes: 80,
        bookingUrl: "https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A15623194&share=true&pId=1024551",
      },
    ],
  );
});

test("business data keeps restrained social proof without stale source counts", () => {
  const business = JSON.parse(read("data/business.json"));

  assert.ok(business.rating, "missing rating data");
  assert.equal(business.rating.displayCount, "100+");
  assert.equal("sources" in business.rating, false);
  assert.doesNotMatch(
    JSON.stringify(business.rating),
    /sourceCounts|googleCount|freshaCount|googleReviews|freshaReviews/i,
  );
});

test("every core shell uses the Cupping & prices navigation label and local fonts", () => {
  for (const {relativePath, source} of corePages) {
    assert.match(
      source,
      /Cupping (?:&|&amp;) prices/,
      `stale navigation label in ${relativePath}`,
    );
    assert.doesNotMatch(
      source,
      /fonts\.googleapis\.com|fonts\.gstatic\.com/,
      `remote font request in ${relativePath}`,
    );
    assert.match(source, /20260720/, `stale asset version in ${relativePath}`);
  }
});

test("core shells use restrained public review wording", () => {
  for (const {relativePath, source} of corePages) {
    assert.match(visibleText(source), /100\+ public reviews/i, `stale review wording in ${relativePath}`);
  }
});

test("contact publishes the same daily opening hours visibly and in metadata", () => {
  const contact = read("contact/index.html");

  assert.match(visibleText(contact), /Daily, 10:00–19:00/);
  assert.match(contact, /"openingHours"\s*:\s*"Mo-Su 10:00-19:00"/);
});

test("contact opening hours table has an accessible caption and row headers", () => {
  const contact = read("contact/index.html");
  const table = contact.match(/<table\b[\s\S]*?<\/table>/i)?.[0];

  assert.ok(table, "missing contact opening-hours table");
  assert.match(table, /<caption>[^<]*opening hours[^<]*<\/caption>/i);
  assert.match(table, /<th\s+scope="row"[^>]*>Daily<\/th>/i);
});

test("contact required inputs do not appear invalid before interaction", () => {
  const contact = read("contact/index.html");
  const requiredInputs = [...contact.matchAll(/<input\b[^>]*\brequired\b[^>]*>/gi)]
    .map((match) => match[0]);

  assert.ok(requiredInputs.length > 0, "missing required contact inputs");
  for (const input of requiredInputs) {
    assert.match(input, /\bplaceholder="[^"]+"/i, `required input needs a placeholder: ${input}`);
  }
});

test("services gives a visible evidence-led complementary-care safety boundary", () => {
  const services = read("services/index.html");
  const text = visibleText(services);

  assert.match(
    services,
    /<a\b[^>]*href="https:\/\/www\.nccih\.nih\.gov\/health\/cupping"[^>]*>[\s\S]*?<\/a>/i,
  );
  assert.match(
    text,
    /complementary (?:practice|care)[^.]{0,140}not (?:a )?(?:replacement|substitute) for (?:medical|professional healthcare)/i,
  );
  assert.match(text, /every faith and background/i);
  assert.doesNotMatch(services, /"aggregateRating"/);
});

test("about uses cupping-first roles and welcomes every background", () => {
  const about = read("about/index.html");
  const text = visibleText(about);

  assert.match(text, /every faith and background/i);
  assert.match(text, /Women(?:'|’)s cupping practitioner/);
  assert.match(text, /Men(?:'|’)s cupping practitioner/);
  assert.doesNotMatch(text, /clinical standard/i);
});

test("privacy and not-found pages keep a single top-level heading", () => {
  for (const relativePath of ["privacy/index.html", "404.html"]) {
    const source = read(relativePath);
    assert.equal((source.match(/<h1\b/gi) ?? []).length, 1, `wrong H1 count in ${relativePath}`);
    assert.match(source.match(/<h[1-6]\b/i)?.[0] ?? "", /<h1\b/i, `first heading is not H1 in ${relativePath}`);
  }
});

test("services presents each exact service only with its matching booking route", () => {
  const services = read("services/index.html");
  const expected = JSON.parse(read("data/business.json")).services;

  assert.ok(Array.isArray(expected), "missing service records");
  assert.match(services, /id="booking-options"/);
  for (const service of expected) {
    const card = [...services.matchAll(/<article\b[\s\S]*?<\/article>/gi)]
      .map((match) => match[0])
      .find((article) => {
        const text = visibleText(article);
        return text.includes(service.audience) && text.includes(service.name);
      });
    assert.ok(card, `missing card for ${service.name}`);
    assert.match(visibleText(card), new RegExp(`${service.price}.*${service.durationMinutes} minutes`));
    assert.ok(
      anchors(card).some((anchor) => anchor.href === service.bookingUrl),
      `wrong booking route for ${service.name}`,
    );
  }
});

test("generic core booking actions route to a selector", () => {
  for (const {relativePath, source} of corePages) {
    const regions = namedShellRegions(source);
    const allShellLinks = regions.flatMap(anchors);
    const links = allShellLinks
      .filter((anchor) => /^Book(?: now| an appointment)?$/i.test(anchor.text));

    assert.ok(links.length > 0, `missing generic booking action in ${relativePath}`);
    for (const link of allShellLinks) {
      assert.doesNotMatch(link.href ?? "", /oiid=sv%3A\d+/i, `service-specific shell route in ${relativePath}`);
    }
    for (const link of links) {
      const allowed = relativePath === "services/index.html"
        ? ["/#book", "#booking-options"]
        : ["/#book"];
      assert.ok(allowed.includes(link.href), `unsafe generic booking route in ${relativePath}: ${link.href}`);
      assert.doesNotMatch(link.href, /oiid=sv%3A\d+/i);
    }
  }
});

test("committed core pages exclude retired claims", () => {
  for (const {relativePath, source} of corePages) {
    for (const claim of retiredClaims) {
      assert.doesNotMatch(source, claim, `retired claim in ${relativePath}: ${claim}`);
    }
  }
});

test("committed core pages omit stale exact review splits", () => {
  const staleReviewSplit = /(?:\d[\d,]*\+?\s+(?:Google|Fresha)\s+reviews?|(?:Google|Fresha)\s+reviews?\s*[:\-]\s*\d|86\s+on\s+Fresha|24\s+on\s+Google)/i;

  for (const {relativePath, source} of corePages) {
    assert.doesNotMatch(source, staleReviewSplit, `stale review split in ${relativePath}`);
  }
});

test("committed article shells use generic booking links and stable clinic references", () => {
  assert.equal(articlePages.length, manifest.length, "expected every committed article page");

  for (const {relativePath, source} of articlePages) {
    const allShellLinks = namedShellRegions(source).flatMap(anchors);
    const shellLinks = allShellLinks
      .filter((anchor) => /^Book(?: now| an appointment)?$/i.test(anchor.text));

    assert.ok(shellLinks.length > 0, `missing generated booking action in ${relativePath}`);
    for (const link of allShellLinks) {
      assert.doesNotMatch(link.href ?? "", /oiid=sv%3A\d+/i, `service-specific shell route in ${relativePath}`);
    }
    for (const link of shellLinks) {
      assert.equal(link.href, "/#book", `service-specific shell booking in ${relativePath}`);
    }
    assert.match(
      source,
      /"@id"\s*:\s*"https:\/\/sinceritycupping\.co\.uk\/#clinic"/,
      `missing stable clinic schema reference in ${relativePath}`,
    );
    assert.doesNotMatch(source, /"name"\s*:\s*(?:""|null)/, `empty schema name in ${relativePath}`);
    assert.doesNotMatch(source, /Tirmidhi\s*2051/i, `weak citation in ${relativePath}`);
  }
});

test("committed articles align visible review credit with structured authorship", () => {
  for (const {relativePath, source} of articlePages) {
    const article = jsonLd(source).find((item) => item["@type"] === "Article");
    assert.ok(article, `missing Article schema in ${relativePath}`);
    assert.deepEqual(article.author, {"@id": "https://sinceritycupping.co.uk/#clinic"});
    assert.equal(article.contributor?.name, "Sister Aisha Mejri");
    assert.match(visibleText(source), /Clinic review by Sister Aisha Mejri/);
  }
});

test("committed article summaries match their manifest records", () => {
  const byPath = new Map(articlePages.map((article) => [article.relativePath, article.source]));

  for (const article of manifest) {
    const relativePath = `articles/${article.slug}/index.html`;
    const source = byPath.get(relativePath);
    const description = source.match(/<meta name="description" content="([^"]*)">/i)?.[1];
    assert.equal(decodeAttribute(description ?? ""), article.summary, `metadata drift in ${relativePath}`);
    const schema = jsonLd(source).find((item) => item["@type"] === "Article");
    assert.equal(schema?.description, article.summary, `schema drift in ${relativePath}`);
  }
});

test("core and committed article links encode query-string separators", () => {
  const unescapedQuerySeparator = /<a\b[^>]*\bhref="[^"]*&(?!amp;|quot;|apos;|lt;|gt;|#\d+;|#x[\da-f]+;)[^"]*"/i;

  for (const {relativePath, source} of [...corePages, ...articlePages]) {
    assert.doesNotMatch(source, unescapedQuerySeparator, `unescaped link query in ${relativePath}`);
  }
});

test("committed articles keep an official cupping source and the blog remains cupping-first", () => {
  const blog = read("blog/index.html");
  const title = blog.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const heading = visibleText(blog.match(/<h1\b[\s\S]*?<\/h1>/i)?.[0] ?? "");

  for (const {relativePath, source} of articlePages) {
    assert.match(source, /https:\/\/www\.nccih\.nih\.gov\/health\/cupping/, `missing NCCIH source in ${relativePath}`);
  }
  assert.match(title, /cupping/i);
  assert.match(heading, /cupping/i);
  assert.ok(
    !/hijama/i.test(title) || title.toLowerCase().indexOf("cupping") < title.toLowerCase().indexOf("hijama"),
    "blog title must lead with cupping",
  );
  assert.ok(
    !/hijama/i.test(heading) || heading.toLowerCase().indexOf("cupping") < heading.toLowerCase().indexOf("hijama"),
    "blog H1 must lead with cupping",
  );

  const headingLevels = [...blog.matchAll(/<h([1-6])\b/gi)].map((match) => Number(match[1]));
  assert.deepEqual(headingLevels.slice(0, 2), [1, 2], "blog must introduce cards with an H2");
});

import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatorPath = path.join(root, "scripts", "generate-articles.mjs");
const generator = fs.readFileSync(generatorPath, "utf8");
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const topics = JSON.parse(fs.readFileSync(path.join(root, "data", "article-topics.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data", "article-manifest.json"), "utf8"));

const fixedCustomSlugs = new Set(
  [...(generator.match(/const CUSTOM_SLUGS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? "")
    .matchAll(/"([^"]+)"/g)]
    .map((match) => match[1]),
);

const generatedRecords = manifest.filter((record) => !record.custom && !fixedCustomSlugs.has(record.slug));
const protectedRecords = manifest.filter((record) => record.custom || fixedCustomSlugs.has(record.slug));

const bannedClaims = [
  /Tirmidhi\s*2051/i,
  /17(?:th)?\s*(?:,|\/|and|&)\s*19(?:th)?\s*(?:,|\/|and|&)\s*21(?:st)?/i,
  /17th\s+19th\s+21st/i,
  /Sunnah[- ](?:days?|dates?)/i,
  /normally settles within 24\s*(?:[–-]|to)\s*48\s*(?:h|hours?)/i,
  /wait(?:ing)? at least (?:three|3) months? after birth/i,
  /once every (?:three|3) months?/i,
  /no showers,? baths,? pools,? saunas (?:or|and) gyms/i,
  /avoid heavy meat (?:and|or) dairy/i,
  /\b48[- ]hour rule\b/i,
  /\bno[- ]sweat window\b/i,
  /\bquarterly (?:rhythm|sessions?)\b/i,
  /most clients drive home normally/i,
  /\b(?:diabetes|type 1 diabetes|type 2 diabetes|insulin)\b/i,
  /\b(?:older clients|older adults|over-?60s)\b/i,
  /\b(?:day[- ]by[- ]day|healing) timeline\b/i,
  /\bwhat to eat after hijama\b/i,
  /\bwhat to skip for a day\b/i,
  /\bwhen (?:you )?can return to work after\b/i,
  /copy-and-follow plan for treatment day/i,
  /\b(?:20\+|twenty-plus|over 20) years\b/i,
  /\blockable private room\b/i,
  /\bfully insured hijama clinic\b/i,
  /\bfull insurance (?:means|signals)\b/i,
  /\b60\s*(?:[–-]|to)\s*75\s*minutes?\b/i,
  /clinical standard/i,
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

function articleBody(relativePath) {
  const source = read(relativePath);
  const article = source.match(/<article\b[^>]*class="[^"]*prose[^"]*"[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  assert.ok(article, `missing prose article in ${relativePath}`);
  return visibleText(article);
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
  const result = new Set();
  for (let index = 0; index <= words.length - size; index += 1) {
    result.add(words.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(left, right) {
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function jsonLd(markup) {
  return [...markup.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

function makeGeneratorFixture({fixtureTopics = [], fixtureManifest = [], mutateBusiness} = {}) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-generator-"));
  fs.mkdirSync(path.join(fixture, "data"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "articles"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "blog"), {recursive: true});

  const fixtureBusiness = structuredClone(business);
  if (mutateBusiness) mutateBusiness(fixtureBusiness);

  fs.writeFileSync(path.join(fixture, "data", "business.json"), `${JSON.stringify(fixtureBusiness, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "article-topics.json"), `${JSON.stringify(fixtureTopics, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "article-manifest.json"), `${JSON.stringify(fixtureManifest, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "blog", "index.html"), "UNCHANGED BLOG");
  return fixture;
}

function runGenerator(fixture, ...args) {
  return spawnSync(process.execPath, [generatorPath, ...args], {
    cwd: fixture,
    encoding: "utf8",
  });
}

test("generator-owned articles answer their own title and summary promises", () => {
  assert.equal(generatedRecords.length, 16);

  for (const record of generatedRecords) {
    const topic = topics.find((item) => item.slug === record.slug);
    assert.ok(topic, `missing topic for ${record.slug}`);
    assert.ok(topic.content?.answer?.heading, `missing answer heading for ${record.slug}`);
    assert.ok(topic.content?.answer?.text, `missing answer text for ${record.slug}`);
    assert.ok(topic.content?.sections?.length >= 2, `missing structured sections for ${record.slug}`);
    assert.ok(topic.promiseTerms?.length >= 2, `missing promise terms for ${record.slug}`);

    const promise = `${record.title} ${record.summary}`.toLowerCase();
    const body = articleBody(`articles/${record.slug}/index.html`).toLowerCase();
    const headings = [
      topic.content.answer.heading,
      ...topic.content.sections.map((section) => section.heading),
    ].join(" ").toLowerCase();

    assert.match(body, new RegExp(topic.content.answer.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(body, new RegExp(topic.content.answer.text.slice(0, 48).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    for (const term of topic.promiseTerms) {
      assert.ok(promise.includes(term.toLowerCase()), `${record.slug} promise omits ${term}`);
      assert.ok(`${headings} ${body}`.includes(term.toLowerCase()), `${record.slug} answer omits ${term}`);
    }
  }
});

test("no two generated article bodies exceed 0.80 five-word-shingle similarity", () => {
  const corpora = generatedRecords.map((record) => ({
    slug: record.slug,
    shingles: shingles(articleBody(`articles/${record.slug}/index.html`)),
  }));

  for (let left = 0; left < corpora.length; left += 1) {
    for (let right = left + 1; right < corpora.length; right += 1) {
      const score = jaccard(corpora[left].shingles, corpora[right].shingles);
      assert.ok(
        score <= 0.80,
        `${corpora[left].slug} and ${corpora[right].slug} similarity ${score.toFixed(3)} exceeds 0.80`,
      );
    }
  }
});

test("all publishable topic and LLM inputs exclude retired claims", () => {
  const sources = [
    ["data/article-topics.json", JSON.stringify(topics)],
    ["data/article-manifest.json", JSON.stringify(manifest)],
    ["llms.txt", read("llms.txt")],
    ["llms-full.txt", read("llms-full.txt")],
    ...generatedRecords.map((record) => [
      `articles/${record.slug}/index.html`,
      read(`articles/${record.slug}/index.html`),
    ]),
  ];

  for (const [label, source] of sources) {
    for (const pattern of bannedClaims) {
      assert.doesNotMatch(source, pattern, `${label} contains ${pattern}`);
    }
  }
});

test("generator rejects a banned topic before writing any output", (t) => {
  const badTopic = {
    slug: "unsafe-fixture",
    title: "Unsafe fixture",
    keyword: "unsafe fixture",
    intent: "test",
    service: "Wet cupping",
    area: "London",
    angle: "normally settles within 24 to 48 hours",
    summary: "A deliberately unsafe publishing fixture.",
  };
  const fixture = makeGeneratorFixture({fixtureTopics: [badTopic]});
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = runGenerator(fixture, "--count=1", "--date=2099-12-31");

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /unsafe-fixture.*retired claim/i);
  assert.equal(fs.readFileSync(path.join(fixture, "blog", "index.html"), "utf8"), "UNCHANGED BLOG");
  assert.equal(
    fs.readFileSync(path.join(fixture, "data", "article-manifest.json"), "utf8"),
    "[]\n",
  );
  assert.equal(fs.existsSync(path.join(fixture, "articles", "unsafe-fixture", "index.html")), false);
  assert.equal(fs.existsSync(path.join(fixture, "llms.txt")), false);
});

test("generator rejects retired lunar-date variants before writing any output", (t) => {
  const variants = [
    "17th 19th 21st",
    "17th, 19th and 21st",
    "17th, 19th, and 21st",
    "17, 19, & 21",
  ];

  for (const [index, angle] of variants.entries()) {
    const slug = `unsafe-religious-fixture-${index}`;
    const badTopic = {
      slug,
      title: "Unsafe religious fixture",
      keyword: "unsafe religious fixture",
      intent: "test",
      service: "Wet cupping",
      area: "London",
      angle,
      summary: "A deliberately unsafe publishing fixture.",
    };
    const fixture = makeGeneratorFixture({fixtureTopics: [badTopic]});
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, "--count=1", "--date=2099-12-31");

    assert.equal(result.status, 1, `${angle}: ${result.stderr || result.stdout}`);
    assert.match(result.stderr, new RegExp(`${slug}.*retired claim`, "i"));
    assert.equal(fs.readFileSync(path.join(fixture, "blog", "index.html"), "utf8"), "UNCHANGED BLOG");
    assert.equal(
      fs.readFileSync(path.join(fixture, "data", "article-manifest.json"), "utf8"),
      "[]\n",
    );
    assert.equal(fs.existsSync(path.join(fixture, "articles", slug, "index.html")), false);
    assert.equal(fs.existsSync(path.join(fixture, "llms.txt")), false);
  }
});

test("privacy notice identifies the UK controller and required processing details", () => {
  const privacy = read("privacy/index.html");
  const text = visibleText(privacy);

  assert.match(text, /AXONIS LTD trading as Sincerity Cupping Clinic/);
  assert.match(text, /21 July 2026/);
  assert.match(text, /contact and booking information/i);
  assert.match(text, /safety and consultation information/i);
  assert.match(text, /technical logs/i);
  assert.match(text, /contract|steps at your request/i);
  assert.match(text, /legitimate interests/i);
  assert.match(text, /legal obligation/i);
  assert.match(text, /special category/i);
  assert.match(text, /Article 9/i);
  assert.match(text, /Fresha/i);
  assert.match(text, /hosting/i);
  assert.match(text, /email|telephone|WhatsApp/i);
  assert.match(text, /retention/i);
  assert.match(text, /security/i);
  assert.match(text, /outside the UK|international transfer/i);
  for (const right of ["access", "rectification", "erasure", "restriction", "object", "portability", "withdraw consent"]) {
    assert.match(text, new RegExp(right, "i"));
  }
  assert.match(
    privacy,
    /href="https:\/\/ico\.org\.uk\/for-the-public\/how-to-make-a-data-protection-complaint\/"/i,
  );
  assert.match(text, /sincerityruqyah@gmail\.com/);
  assert.match(text, /330 Streatham High Rd/);
  assert.match(text, /07552 540000/);
  assert.doesNotMatch(text, /never share|100% secure|guarantee/i);
  assert.doesNotMatch(text, /retain(?:ed)? for (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) (?:days|months|years)/i);
});

test("404 recovery assets and links resolve from a nested missing route", async (t) => {
  const notFound = read("404.html");
  const server = http.createServer((_request, response) => {
    response.writeHead(404, {"content-type": "text/html; charset=utf-8"});
    response.end(notFound);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/nested/missing/page`);
  const source = await response.text();
  assert.equal(response.status, 404);

  const localTargets = [...source.matchAll(/\b(?:href|src)="([^"]+)"/gi)]
    .map((match) => match[1])
    .filter((target) => !/^(?:https?:|tel:|mailto:|#)/i.test(target));

  assert.ok(localTargets.length > 0, "missing local 404 recovery targets");
  for (const target of localTargets) {
    assert.match(target, /^\//, `nested-route-relative target: ${target}`);
    const resolved = new URL(target, response.url);
    assert.equal(resolved.origin, new URL(response.url).origin);
    assert.doesNotMatch(resolved.pathname, /^\/nested\/missing\//);
  }

  for (const expected of [
    "/assets/css/style.css?v=20260720",
    "/assets/img/sincerity-cupping-logo.svg",
    "/assets/js/site.js?v=20260720",
    "/services/",
    "/contact/",
    "/#book",
  ]) {
    assert.ok(localTargets.includes(expected), `missing root recovery target: ${expected}`);
  }
});

test("LLM files publish exact service facts and the complete safe catalogue", () => {
  const llms = read("llms.txt");
  const llmsFull = read("llms-full.txt");
  const expectedFacts = [
    "Women: Women's wet cupping — £45, 45 minutes",
    "Men: Men's wet cupping — £45, 40 minutes",
    "Women: Full spiritual appointment — £80, 90 minutes",
    "Men: Full spiritual appointment — £80, 80 minutes",
  ];

  for (const fact of expectedFacts) {
    assert.match(llms, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(llmsFull, new RegExp(fact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const record of manifest) {
    assert.match(llms, new RegExp(`/articles/${record.slug}/`), `llms.txt omits ${record.slug}`);
  }
  for (const pattern of bannedClaims) {
    assert.doesNotMatch(llms, pattern, `llms.txt contains ${pattern}`);
    assert.doesNotMatch(llmsFull, pattern, `llms-full.txt contains ${pattern}`);
  }
});

test("article publication and modification dates remain separate on rerender", (t) => {
  const record = {
    slug: "date-fixture",
    title: "A safe cupping date fixture",
    summary: "A safe summary for generator date testing.",
    date: "2025-01-02",
    modified: "2025-03-04",
  };
  const topic = {
    ...record,
    keyword: "cupping date fixture",
    intent: "test",
    service: "Wet cupping",
    area: "London",
    angle: "published and updated dates",
  };
  delete topic.date;
  delete topic.modified;
  const fixture = makeGeneratorFixture({fixtureTopics: [topic], fixtureManifest: [record]});
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = runGenerator(fixture, "--count=0", "--rerender", "--date=2099-12-31");
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const after = JSON.parse(fs.readFileSync(path.join(fixture, "data", "article-manifest.json"), "utf8"));
  assert.equal(after[0].date, "2025-01-02");
  assert.equal(after[0].modified, "2025-03-04");

  const article = fs.readFileSync(path.join(fixture, "articles", record.slug, "index.html"), "utf8");
  const schema = jsonLd(article).find((item) => item["@type"] === "Article");
  assert.equal(schema.datePublished, "2025-01-02");
  assert.equal(schema.dateModified, "2025-03-04");
});

test("generated hours labels, schema and LLM facts derive from business data", (t) => {
  const fixture = makeGeneratorFixture({
    mutateBusiness(fixtureBusiness) {
      fixtureBusiness.openingHours = fixtureBusiness.openingHours.map((entry) => ({
        ...entry,
        opens: "09:15",
        closes: "17:45",
      }));
    },
  });
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = runGenerator(fixture, "--count=0", "--date=2099-12-31");
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const blog = fs.readFileSync(path.join(fixture, "blog", "index.html"), "utf8");
  const llms = fs.readFileSync(path.join(fixture, "llms.txt"), "utf8");
  assert.match(visibleText(blog), /Open daily · 09:15–17:45/);
  assert.match(blog, /"openingHours":"Mo-Su 09:15-17:45"/);
  assert.match(llms, /Opening hours: daily 09:15–17:45/);
  assert.doesNotMatch(`${blog}\n${llms}`, /10:00[–-]19:00/);
});

test("manifest marks only redesigned generated articles as modified on 20 July", () => {
  assert.equal(generatedRecords.length, 16);
  assert.equal(protectedRecords.length, 8);
  const sitemap = read("sitemap.xml");

  for (const record of generatedRecords) {
    assert.equal(record.modified, "2026-07-20", `wrong modified date for ${record.slug}`);
    const article = read(`articles/${record.slug}/index.html`);
    const schema = jsonLd(article).find((item) => item["@type"] === "Article");
    assert.equal(schema?.datePublished, record.date, `published date drift for ${record.slug}`);
    assert.equal(schema?.dateModified, record.modified, `modified date drift for ${record.slug}`);
  }
  for (const record of protectedRecords) {
    assert.equal(record.modified, record.date, `protected content modified unexpectedly: ${record.slug}`);
  }
  for (const record of manifest) {
    const escapedUrl = `${business.domain}/articles/${record.slug}/`
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      sitemap,
      new RegExp(`<loc>${escapedUrl}</loc><lastmod>${record.modified}</lastmod>`),
      `sitemap lastmod drift for ${record.slug}`,
    );
  }
});

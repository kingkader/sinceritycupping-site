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
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const topics = JSON.parse(fs.readFileSync(path.join(root, "data", "article-topics.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "data", "article-manifest.json"), "utf8"));

const fixedCustomSlugs = new Set([
  "first-hijama-appointment-streatham",
  "wet-cupping-men-women-south-london",
  "hijama-aftercare-london",
]);

const generatedRecords = manifest.filter((record) => !record.custom && !fixedCustomSlugs.has(record.slug));
const protectedRecords = manifest.filter((record) => record.custom || fixedCustomSlugs.has(record.slug));
const allRecords = manifest;
const rendererRetired = /automatic article rendering is retired.*direct static edits.*human review/is;

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
  /\b(?:avoid|skip|no|do not|don't|hold off on)\b[^.!?]{0,90}\b(?:showers?|baths?|bathe|bathing|wash(?:ing)?|pools?|swimming|saunas?|steam rooms?)\b/i,
  /\b(?:avoid|skip|no|do not|don't|hold off on)\b[^.!?]{0,90}\b(?:gyms?|exercise|sport|training|sweat(?:ing)?)\b/i,
  /\b(?:avoid|skip|no|do not|don't|hold off on)\b[^.!?]{0,90}\b(?:meat|dairy)\b/i,
  /\b(?:recover(?:y|ing)?|rest|soreness|healing|aftercare|return)\b[^.!?]{0,70}\b(?:24|48)[ -]?(?:hours?|hrs?|h)\b/i,
  /\b(?:24|48)[ -]?(?:hours?|hrs?|h)\b[^.!?]{0,70}\b(?:recover(?:y|ing)?|rest|soreness|healing|aftercare|return)\b/i,
  /\b(?:monthly|quarterly|once (?:a|every) month|every (?:one|three|1|3) months?)\b[^.!?]{0,80}\b(?:cupping|hijama|sessions?|appointments?|return)\b/i,
  /\b(?:cupping|hijama|sessions?|appointments?|return)\b[^.!?]{0,80}\b(?:monthly|quarterly|once (?:a|every) month|every (?:one|three|1|3) months?)\b/i,
  /\b(?:wait|waiting|delay)\b[^.!?]{0,60}\b(?:postpartum|after (?:giving )?birth|after delivery)\b/i,
  /\b(?:postpartum|after (?:giving )?birth|after delivery)\b[^.!?]{0,60}\b(?:wait|waiting|weeks?|months?)\b/i,
  /\b(?:you|clients?|most people|people)\b[^.!?]{0,30}\b(?:can|may|usually|normally)\b[^.!?]{0,20}\bdrive\b/i,
  /\b(?:safe|fit|fine|okay|ok) to drive\b|\bdrive home (?:safely|normally)\b/i,
  /\b(?:pregnan(?:t|cy)|breastfeeding|diabetes|insulin|blood[ -]?thinners?|anticoagulants?)\b[^.!?]{0,100}\b(?:book|treat|session|suitable|unsuitable|contraindicat|avoid|must|should|can|cannot|eligible|allowed)\b/i,
  /\b(?:book|treat|session|suitable|unsuitable|contraindicat|avoid|must|should|can|cannot|eligible|allowed)\b[^.!?]{0,100}\b(?:pregnan(?:t|cy)|breastfeeding|diabetes|insulin|blood[ -]?thinners?|anticoagulants?)\b/i,
  /\bsterile (?:equipment|cups?|blades?|lancets?)\b/i,
  /\b(?:treated|cupped) area\b[^.!?]{0,60}\b(?:must|should|needs? to)\b[^.!?]{0,30}\b(?:remain|stay|be kept)\b[^.!?]{0,20}\bdry\b/i,
  /\b(?:wait|waiting)\b[^.!?]{0,40}\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve) weeks?\b[^.!?]{0,35}\b(?:after childbirth|after birth|postpartum)\b/i,
  /\bdriving may resume\b[^.!?]{0,50}\b(?:steady|well|ready)\b/i,
];

const unsupportedTravelClaimPatterns = [
  /\b(?:A|B|M)\d{1,4}\b/i,
  /\b(?:Northern|Victoria|Piccadilly|Central|District|Jubilee|Circle|Elizabeth|Metropolitan|Bakerloo|Overground|DLR)\s+line\b/i,
  /\b(?:bus(?:es)?|rail|train|road|car)\b[^.!?]{0,100}\b(?:via|through|towards|follow(?:s|ed)?|runs?|connect(?:s|ions?)?|one\s+(?:rail|train)\s+stop)\b/i,
  /\b(?:via|through|towards|follow(?:s|ed)?|runs?|connect(?:s|ions?)?)\b[^.!?]{0,100}\b(?:bus(?:es)?|rail|train|road|car)\b/i,
  /\b(?:routes?|journeys?)\s+(?:via|through)\s+[A-Z][^,.!?]{1,60}/,
  /\b(?:walk(?:ing)?|journey|travel|drive)\b[^.!?]{0,60}\b\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|miles?|kilometres?|kilometers?|km)\b/i,
  /\b\d+(?:\.\d+)?\s*(?:minutes?|mins?|hours?|miles?|kilometres?|kilometers?|km)\b[^.!?]{0,60}\b(?:walk(?:ing)?|journey|travel|drive)\b/i,
  /\b(?:published (?:local )?(?:route notes|road description)|school-run traffic|roads? can be busier|traffic[^.!?]{0,40}add time|parking is not guaranteed|onsite parking)\b/i,
];

const travelPlanningSlugs = new Set([
  "cupping-dulwich",
  "cupping-therapy-clapham",
  "hijama-brixton",
  "hijama-crystal-palace",
  "hijama-norbury",
  "hijama-west-norwood",
  "wet-cupping-balham",
  "wet-cupping-herne-hill",
  "wet-cupping-tooting",
  "wet-cupping-tulse-hill",
]);

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

function decodeAttribute(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const fixturePageModified = {
  "/": "2026-07-21",
  "/services/": "2026-07-21",
  "/about/": "2026-07-21",
  "/contact/": "2026-07-21",
  "/blog/": "2026-07-21",
  "/privacy/": "2026-07-21",
  "/areas/": "2026-07-21",
  ...Object.fromEntries(business.serviceAreas.map((area) => [
    `/areas/${area.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/`,
    "2026-07-21",
  ])),
};

function makeGeneratorFixture({fixtureTopics = [], fixtureManifest = []} = {}) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-generator-"));
  fs.mkdirSync(path.join(fixture, "data"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "articles"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "blog"), {recursive: true});

  const fixtureBusiness = structuredClone(business);

  fs.writeFileSync(path.join(fixture, "data", "business.json"), `${JSON.stringify(fixtureBusiness, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "article-topics.json"), `${JSON.stringify(fixtureTopics, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "article-manifest.json"), `${JSON.stringify(fixtureManifest, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "page-modified.json"), `${JSON.stringify(fixturePageModified, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "blog", "index.html"), "UNCHANGED BLOG");
  return fixture;
}

function runGenerator(fixture, ...args) {
  return spawnSync(process.execPath, [generatorPath, ...args], {
    cwd: fixture,
    encoding: "utf8",
  });
}

function seedOutputSentinels(fixture) {
  const relativePaths = [
    "data/article-manifest.json",
    "blog/index.html",
    "sitemap.xml",
    "llms.txt",
    "llms-full.txt",
    "articles/existing/index.html",
  ];
  fs.mkdirSync(path.join(fixture, "articles", "existing"), {recursive: true});
  for (const relativePath of relativePaths.filter((item) => !item.startsWith("data/") && item !== "blog/index.html")) {
    fs.writeFileSync(path.join(fixture, relativePath), `SENTINEL ${relativePath}\n`);
  }
  return new Map(relativePaths.map((relativePath) => [
    relativePath,
    fs.readFileSync(path.join(fixture, relativePath)),
  ]));
}

function assertSentinelsUnchanged(fixture, before) {
  for (const [relativePath, expected] of before) {
    assert.deepEqual(
      fs.readFileSync(path.join(fixture, relativePath)),
      expected,
      `mutated ${relativePath}`,
    );
  }
}

test("all 24 articles answer their own title and summary promises", () => {
  assert.equal(allRecords.length, 24);
  const manifestSlugs = allRecords.map((record) => record.slug);
  const topicSlugs = topics.map((topic) => topic.slug);
  const articleDirectories = fs.readdirSync(path.join(root, "articles"), {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.equal(new Set(manifestSlugs).size, manifestSlugs.length, "duplicate manifest slug");
  assert.equal(new Set(topicSlugs).size, topicSlugs.length, "duplicate topic slug");
  for (const slug of topicSlugs) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `unsafe topic slug: ${slug}`);
  assert.deepEqual(articleDirectories, [...manifestSlugs].sort(), "missing or orphan committed article directory");

  for (const record of allRecords) {
    assert.match(record.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `unsafe committed slug: ${record.slug}`);
    const matchingTopics = topics.filter((item) => item.slug === record.slug);
    assert.equal(matchingTopics.length, 1, `expected one topic for ${record.slug}`);
    const [topic] = matchingTopics;
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

test("no two article bodies exceed 0.80 five-word-shingle similarity", () => {
  const corpora = allRecords.map((record) => ({
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

test("all committed topic, article, manifest and LLM sources exclude retired claims", () => {
  const sources = [
    ["data/article-topics.json", JSON.stringify(topics)],
    ["data/article-manifest.json", JSON.stringify(manifest)],
    ["llms.txt", read("llms.txt")],
    ["llms-full.txt", read("llms-full.txt")],
    ...allRecords.map((record) => [
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

test("all published articles keep travel guidance live-planner based and free of unsupported route facts", () => {
  assert.equal(allRecords.length, 24);

  for (const record of allRecords) {
    const relativePath = `articles/${record.slug}/index.html`;
    const source = read(relativePath);
    const body = articleBody(relativePath);

    for (const pattern of unsupportedTravelClaimPatterns) {
      assert.doesNotMatch(body, pattern, `${relativePath} contains unsupported route claim ${pattern}`);
    }

    if (travelPlanningSlugs.has(record.slug)) {
      const prose = source.match(/<article\b[^>]*class="[^"]*prose[^"]*"[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? "";
      assert.match(prose, /330 Streatham High Rd, London SW16 6HH/i, `${relativePath} omits the fixed clinic address`);
      assert.match(prose, /href="https:\/\/www\.google\.com\/maps[^\"]*"/i, `${relativePath} omits live Google Maps planning`);
      assert.match(prose, /href="https:\/\/tfl\.gov\.uk\/plan-a-journey\/"/i, `${relativePath} omits live TfL planning`);
    }
  }
});

test("all 24 article pages agree with manifest and use the safe article contract", () => {
  assert.equal(allRecords.length, 24);

  for (const record of allRecords) {
    const relativePath = `articles/${record.slug}/index.html`;
    const source = read(relativePath);
    const description = decodeAttribute(source.match(/<meta name="description" content="([^"]*)">/i)?.[1] ?? "");
    const pageTitle = visibleText(source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const h1 = visibleText(source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
    const article = jsonLd(source).find((item) => item["@type"] === "Article");
    const prose = source.match(/<article\b[^>]*class="[^"]*prose[^"]*"[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? "";
    const shell = [
      source.match(/<header\b[\s\S]*?<\/header>/i)?.[0],
      source.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0],
      source.match(/<nav\b[^>]*class="[^"]*mobile-bar[^"]*"[^>]*>[\s\S]*?<\/nav>/i)?.[0],
    ].filter(Boolean).join("\n");

    assert.ok(pageTitle.includes(record.title), `title drift in ${relativePath}`);
    assert.equal(description, record.summary, `description drift in ${relativePath}`);
    assert.equal(h1, record.title, `H1 drift in ${relativePath}`);
    assert.ok(article, `missing Article schema in ${relativePath}`);
    assert.equal(article.headline, record.title, `schema headline drift in ${relativePath}`);
    assert.equal(article.description, record.summary, `schema description drift in ${relativePath}`);
    assert.equal(article.datePublished, record.date, `schema published date drift in ${relativePath}`);
    assert.equal(article.dateModified, record.modified, `schema modified date drift in ${relativePath}`);
    assert.deepEqual(article.author, {"@id": `${business.domain}/#clinic`}, `wrong author in ${relativePath}`);
    assert.equal("contributor" in article, false, `unverified contributor in ${relativePath}`);
    assert.doesNotMatch(visibleText(source), /\b(?:Clinic review|Reviewed) by\b/i, `unverified review credit in ${relativePath}`);
    assert.ok(article.citation?.some((item) => item.url === "https://www.nccih.nih.gov/health/cupping"), `missing NCCIH schema citation in ${relativePath}`);
    assert.match(prose, /href="https:\/\/www\.nccih\.nih\.gov\/health\/cupping"/i, `missing visible NCCIH source in ${relativePath}`);
    assert.match(visibleText(prose), /complementary care[^.]{0,120}not a replacement for medical advice/i, `missing care boundary in ${relativePath}`);
    assert.doesNotMatch(shell, /oiid=sv%3A\d+/i, `service-specific shell booking in ${relativePath}`);
    assert.match(shell, /href="\/#book"/, `missing generic shell booking in ${relativePath}`);
  }
});

test("article sources and retired renderer contain no unverified review attribution fields", () => {
  for (const [label, records] of [["manifest", manifest], ["topics", topics]]) {
    for (const record of records) {
      assert.equal("contributor" in record, false, `${label} contributor field in ${record.slug}`);
      assert.equal("reviewer" in record, false, `${label} reviewer field in ${record.slug}`);
      assert.equal("reviewedBy" in record, false, `${label} reviewedBy field in ${record.slug}`);
    }
  }

  assert.doesNotMatch(read("scripts/generate-articles.mjs"), /Clinic review by|"contributor"\s*:/i);
});

test("automatic new-topic publishing is disabled before any write for harmless and risky inputs", (t) => {
  const cases = [
    {
      label: "harmless explicit count",
      args: ["--count=1"],
      text: "A harmless operational guide.",
    },
    {
      label: "harmless larger count",
      args: ["--count=3"],
      text: "Another harmless operational guide.",
    },
    {
      label: "harmless implicit default",
      args: [],
      text: "A harmless default-invocation guide.",
    },
    {
      label: "non-rerender count zero",
      args: ["--count=0"],
      text: "A harmless non-rerender guide.",
    },
    {
      label: "non-canonical zero",
      args: ["--count=0.0", "--rerender"],
      text: "A harmless non-canonical-count guide.",
    },
    {
      label: "zero-padded count",
      args: ["--count=00", "--rerender"],
      text: "A harmless zero-padded-count guide.",
    },
    {
      label: "negative count",
      args: ["--count=-1", "--rerender"],
      text: "A harmless negative-count guide.",
    },
    {
      label: "non-numeric count",
      args: ["--count=not-a-number", "--rerender"],
      text: "A harmless non-numeric-count guide.",
    },
    {
      label: "conflicting duplicate counts",
      args: ["--count=1", "--count=0", "--rerender"],
      text: "A harmless duplicate-count guide.",
    },
    {
      label: "risky paraphrase",
      args: ["--count=1"],
      text: "Have cupping twice per year.",
    },
  ];

  for (const [index, item] of cases.entries()) {
    const slug = `new-topic-disabled-${index}`;
    const topic = {
      slug,
      title: "New topic fixture",
      keyword: "new topic fixture",
      intent: "test",
      service: "Wet cupping",
      area: "London",
      angle: item.text,
      summary: "A publishing lockout fixture.",
    };
    const fixture = makeGeneratorFixture({fixtureTopics: [topic]});
    const before = seedOutputSentinels(fixture);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, ...item.args);

    assert.notEqual(result.status, 0, `${item.label}: generator unexpectedly succeeded`);
    assert.match(result.stderr, rendererRetired);
    assertSentinelsUnchanged(fixture, before);
    assert.equal(fs.existsSync(path.join(fixture, "articles", slug, "index.html")), false);
  }
});

test("disabled publishing exits before reading project files", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-empty-generator-"));
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = runGenerator(fixture, "--count=1");

  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, rendererRetired);
  assert.doesNotMatch(result.stderr, /ENOENT|business\.json|article-topics/i);
  assert.deepEqual(fs.readdirSync(fixture), []);
});

test("reviewed rerender rejects unsafe slugs before any write or path escape", (t) => {
  const unsafeSlugs = [
    "../areas/balham",
    "/absolute/article",
    "%2e%2e%2fareas%2fbalham",
    "nested/article",
    "Uppercase-Slug",
  ];

  for (const unsafeSlug of unsafeSlugs) {
    const record = {
      slug: unsafeSlug,
      title: "Unsafe slug fixture",
      summary: "A safe summary paired with an unsafe storage path.",
      date: "2025-01-02",
      modified: "2026-07-21",
    };
    const topic = {
      ...record,
      keyword: "unsafe slug fixture",
      intent: "test",
      service: "Wet cupping",
      area: "London",
      angle: "safe fixture content",
    };
    delete topic.date;
    delete topic.modified;
    const fixture = makeGeneratorFixture({fixtureTopics: [topic], fixtureManifest: [record]});
    const areaPath = path.join(fixture, "areas", "balham", "index.html");
    fs.mkdirSync(path.dirname(areaPath), {recursive: true});
    fs.writeFileSync(areaPath, "AREA SENTINEL\n");
    const before = seedOutputSentinels(fixture);
    const areaBefore = fs.readFileSync(areaPath);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, "--count=0", "--rerender");

    assert.notEqual(result.status, 0, `${unsafeSlug}: generator unexpectedly succeeded`);
    assert.match(result.stderr, rendererRetired);
    assertSentinelsUnchanged(fixture, before);
    assert.deepEqual(fs.readFileSync(areaPath), areaBefore, `${unsafeSlug}: area path was mutated`);
  }
});

test("reviewed rerender rejects duplicate topic and manifest slugs before any write", (t) => {
  const record = {
    slug: "duplicate-slug-fixture",
    title: "Duplicate slug fixture",
    summary: "A safe duplicate-slug validation fixture.",
    date: "2025-01-02",
    modified: "2026-07-21",
  };
  const topic = {
    slug: record.slug,
    title: record.title,
    summary: record.summary,
    keyword: "duplicate slug fixture",
    intent: "test",
    service: "Wet cupping",
    area: "London",
    angle: "safe fixture content",
  };
  const cases = [
    {label: "topic", fixtureTopics: [topic, structuredClone(topic)], fixtureManifest: [record]},
    {label: "manifest", fixtureTopics: [topic], fixtureManifest: [record, structuredClone(record)]},
  ];

  for (const item of cases) {
    const fixture = makeGeneratorFixture(item);
    const before = seedOutputSentinels(fixture);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, "--count=0", "--rerender");

    assert.notEqual(result.status, 0, `${item.label}: generator unexpectedly succeeded`);
    assert.match(result.stderr, rendererRetired);
    assertSentinelsUnchanged(fixture, before);
  }
});

test("operator surfaces validate committed static articles without rendering or publishing", () => {
  const packageJson = JSON.parse(read("package.json"));
  const workflow = read(".github/workflows/seo-articles.yml");
  const bespokeWrapper = read("scripts/write-article.mjs");

  assert.equal("generate:articles" in packageJson.scripts, false);
  assert.equal("rerender:articles" in packageJson.scripts, false);

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run check:dist/);
  assert.match(workflow, /git diff --exit-code/);
  assert.doesNotMatch(workflow, /generate-articles|write-article|rerender|\bschedule:|\bcron:|git-auto-commit|pages deploy|wrangler/i);

  assert.doesNotMatch(bespokeWrapper, /spawnSync|--bespoke/);
  assert.match(bespokeWrapper, /(?:manual|human) review/i);
});

test("retired renderer rejects reviewed data containing a direct retired claim without writes", (t) => {
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
  const record = {
    slug: badTopic.slug,
    title: badTopic.title,
    summary: badTopic.summary,
    date: "2025-01-02",
    modified: "2026-07-21",
  };
  const fixture = makeGeneratorFixture({fixtureTopics: [badTopic], fixtureManifest: [record]});
  const before = seedOutputSentinels(fixture);
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = runGenerator(fixture, "--count=0", "--rerender", "--date=2099-12-31");

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, rendererRetired);
  assertSentinelsUnchanged(fixture, before);
  assert.equal(fs.existsSync(path.join(fixture, "articles", "unsafe-fixture", "index.html")), false);
});

test("retired renderer cannot publish lunar-date variants", (t) => {
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
    const record = {
      slug,
      title: badTopic.title,
      summary: badTopic.summary,
      date: "2025-01-02",
      modified: "2026-07-21",
    };
    const fixture = makeGeneratorFixture({fixtureTopics: [badTopic], fixtureManifest: [record]});
    const before = seedOutputSentinels(fixture);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, "--count=0", "--rerender", "--date=2099-12-31");

    assert.equal(result.status, 1, `${angle}: ${result.stderr || result.stdout}`);
    assert.match(result.stderr, rendererRetired);
    assertSentinelsUnchanged(fixture, before);
    assert.equal(fs.existsSync(path.join(fixture, "articles", slug, "index.html")), false);
  }
});

test("retired renderer cannot publish paraphrased care rules", (t) => {
  const variants = [
    "avoid showers for 24 hours",
    "avoid dairy after cupping",
    "do not bathe or wash the area after cupping",
    "skip the gym and exercise after hijama",
    "avoid meat after the appointment",
    "recovery takes 24 hours",
    "rest for 48 hours after hijama",
    "quarterly cupping sessions",
    "return monthly for hijama",
    "wait six weeks postpartum",
    "clients can normally drive after cupping",
    "clients with diabetes can book treatment",
    "people on blood thinners should avoid a session",
    "Tirmidhi 2051",
    "Sunnah dates for cupping",
    "Refrain from showering",
    "Recovery takes two days",
    "Book cupping every six weeks",
    "Do not book until six weeks after giving birth",
    "Driving home is safe",
    "Sterilised instruments are used",
    "Recovery takes 72 hours",
    "Have two sessions per year",
    "Avoid workouts after hijama",
    "Equipment is sterile",
  ];

  for (const [index, unsafeText] of variants.entries()) {
    const slug = `unsafe-paraphrase-${index}`;
    const badTopic = {
      slug,
      title: "Unsafe paraphrase fixture",
      keyword: "unsafe paraphrase fixture",
      intent: "test",
      service: "Wet cupping",
      area: "London",
      angle: "claim-gate test",
      summary: "A deliberately unsafe publishing fixture.",
      content: {
        answer: {heading: "Unsafe answer", text: unsafeText},
        sections: [
          {heading: "Section one", paragraphs: ["Safe fixture text."]},
          {heading: "Section two", paragraphs: ["Safe fixture text."]},
        ],
      },
    };
    const record = {
      slug,
      title: badTopic.title,
      summary: badTopic.summary,
      date: "2025-01-02",
      modified: "2026-07-21",
    };
    const fixture = makeGeneratorFixture({fixtureTopics: [badTopic], fixtureManifest: [record]});
    const before = seedOutputSentinels(fixture);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, "--count=0", "--rerender", "--date=2099-12-31");

    assert.notEqual(result.status, 0, `${unsafeText}: generator unexpectedly succeeded`);
    assert.match(result.stderr, rendererRetired);
    assertSentinelsUnchanged(fixture, before);
    assert.equal(fs.existsSync(path.join(fixture, "articles", slug, "index.html")), false);
  }
});

test("bespoke publishing is disabled before any write for harmless and risky HTML", (t) => {
  const variants = [
    "<p>A harmless operational article.</p>",
    "<p>Do <strong>not</strong> exercise after cupping.</p>",
    "<p>Do not<br>exercise after hijama.</p>",
  ];

  for (const [index, html] of variants.entries()) {
    const fixture = makeGeneratorFixture();
    const before = seedOutputSentinels(fixture);
    const slug = `unsafe-bespoke-${index}`;
    const payloadPath = path.join(fixture, "unsafe-bespoke.json");
    fs.writeFileSync(payloadPath, `${JSON.stringify({
      slug,
      title: "Unsafe bespoke fixture",
      summary: "A deliberately unsafe bespoke fixture.",
      date: "2099-12-31",
      html: `<h2>The answer</h2>${html}`,
    })}\n`);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = runGenerator(fixture, "--count=0", `--bespoke=${payloadPath}`);

    assert.notEqual(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr, rendererRetired);
    assertSentinelsUnchanged(fixture, before);
    assert.equal(fs.existsSync(path.join(fixture, "articles", slug, "index.html")), false);
  }
});

test("an empty bespoke flag is still rejected before any write", (t) => {
  const fixture = makeGeneratorFixture();
  const before = seedOutputSentinels(fixture);
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = runGenerator(fixture, "--count=0", "--rerender", "--bespoke=");

  assert.notEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, rendererRetired);
  assertSentinelsUnchanged(fixture, before);
});

test("all committed article paths are regular static files rather than links", () => {
  for (const record of manifest) {
    const articleDirectory = path.join(root, "articles", record.slug);
    const articlePath = path.join(articleDirectory, "index.html");
    assert.ok(fs.lstatSync(articleDirectory).isDirectory(), `non-directory article path: ${record.slug}`);
    assert.equal(fs.lstatSync(articleDirectory).isSymbolicLink(), false, `linked article directory: ${record.slug}`);
    assert.ok(fs.lstatSync(articlePath).isFile(), `non-file article page: ${record.slug}`);
    assert.equal(fs.lstatSync(articlePath).isSymbolicLink(), false, `linked article page: ${record.slug}`);
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

test("privacy notice documents the clinic's actual data flows and retention end criteria", () => {
  const privacy = read("privacy/index.html");
  const text = visibleText(privacy);
  const flowTable = privacy.match(/<table\b[^>]*id="privacy-flow"[^>]*>[\s\S]*?<\/table>/i)?.[0];
  assert.ok(flowTable, "missing actual-flow table");
  const rows = [...flowTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => visibleText(match[1]));
  const row = (label) => rows.find((item) => item.toLowerCase().includes(label.toLowerCase())) ?? "";

  assert.match(row("Email enquiries"), /mailto|Gmail/i);
  assert.match(row("Email enquiries"), /Article 6\(1\)\(b\)/i);
  assert.match(row("Phone enquiries"), /answer an enquiry|appointment administration/i);
  assert.match(row("Phone enquiries"), /telecom|telephone provider/i);
  assert.match(row("Phone enquiries"), /Article 6\(1\)\(b\)/i);
  assert.match(row("Fresha bookings"), /appointment administration/i);
  assert.match(row("Fresha bookings"), /Article 6\(1\)\(b\)/i);
  assert.match(row("Financial records"), /Article 6\(1\)\(c\)/i);
  assert.doesNotMatch(row("Financial records"), /complaint|claim|Article 6\(1\)\(f\)/i);
  const complaintRow = row("Complaints");
  const legalClaimRow = row("Legal claims");
  assert.notEqual(complaintRow, legalClaimRow, "complaints and legal claims need separate processing rows");
  assert.match(complaintRow, /Article 6\(1\)\(f\)/i);
  assert.match(complaintRow, /separate valid Article 9 condition/i);
  assert.doesNotMatch(complaintRow, /Article 9\(2\)\(f\)/i);
  assert.match(legalClaimRow, /Article 6\(1\)\(f\)/i);
  assert.match(legalClaimRow, /Article 9\(2\)\(f\)/i);
  assert.match(legalClaimRow, /actual or prospective|legal advice|legal rights/i);
  assert.match(row("Cloudflare security logs"), /Article 6\(1\)\(f\)/i);
  assert.match(row("Consultation safety information"), /contract steps|contract performance/i);
  assert.match(row("Consultation safety information"), /Article 9\(2\)\(a\).*explicit consent/i);
  assert.match(text, /consultation consent does not cover complaint handling/i);
  assert.match(text, /Article 6\(1\)\(f\).*Article 9\(2\)\(f\).*(?:legal claim|legal advice|legal rights)/i);

  assert.match(text, /contact details, chosen service and appointment time are needed to arrange/i);
  assert.match(text, /do not send detailed health information (?:by|through) (?:email,? WhatsApp (?:or|and) Fresha|Fresha,? email (?:or|and) WhatsApp)/i);
  assert.match(text, /provide necessary health information privately during the consultation|approved private channel/i);
  assert.match(text, /declining necessary in-person safety questions may mean the clinic cannot proceed/i);
  assert.match(text, /telephone or telecom provider/i);

  for (const criterion of [
    /enquiry is answered and any requested follow-up is complete/i,
    /appointment is completed or cancelled and (?:the )?booking, refund and payment administration is closed/i,
    /appointment and any directly related safety follow-up are complete/i,
    /statutory financial-record period has ended/i,
    /complaint response and any agreed follow-up are complete/i,
    /legal advice, proceedings or legal rights no longer require the record/i,
    /security event is closed and the log is no longer needed/i,
    /clinic-created call note follows the enquiry criterion/i,
  ]) assert.match(text, criterion);

  for (const href of [
    "https://terms.fresha.com/privacy-policy",
    "https://policies.google.com/privacy?hl=en-GB",
    "https://policies.google.com/privacy/frameworks?hl=en-GB",
    "https://www.whatsapp.com/legal/privacy-policy-uk",
    "https://www.cloudflare.com/policies/privacy/",
    "https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/",
  ]) assert.match(privacy, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));

  assert.match(text, /processing outside the UK may occur under each provider's official (?:notice|terms)/i);
  assert.match(text, /only where a valid UK transfer mechanism applies/i);
  assert.match(text, /ask (?:the clinic|us) for (?:the )?relevant safeguard details or a copy/i);
  assert.doesNotMatch(text, /we (?:checked|verified) (?:the )?(?:account|DPA|contract)|our DPA with/i);
});

test("internal privacy verification note records what still needs operational confirmation", () => {
  const note = read("docs/privacy-provider-verification.md");

  assert.match(note, /account-specific (?:contracts|DPAs).*not (?:inspected|verified)/i);
  assert.match(note, /Fresha.*Cloudflare.*Google.*WhatsApp/is);
  assert.match(note, /telecom provider.*not (?:identified|verified)/i);
  assert.match(note, /before making stronger controller-processor or transfer-mechanism claims/i);
  assert.doesNotMatch(note, /release blocker|blocks? (?:launch|publication)/i);
});

test("contact loads Google Maps only after an explicit directions click", () => {
  const contact = read("contact/index.html");
  const privacy = visibleText(read("privacy/index.html"));

  assert.doesNotMatch(contact, /<iframe\b/i);
  assert.doesNotMatch(contact, /maps\.google\.com\/maps[^"']*output=embed/i);
  assert.match(
    contact,
    /<a\b[^>]*href="https:\/\/www\.google\.com\/maps\?[^"#]+"[^>]*>Open directions in Google Maps<\/a>/i,
  );
  assert.match(privacy, /Google Maps receives (?:the request|technical information) only when you choose (?:the|a) directions link/i);
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
    "/assets/css/style.css?v=c1bedce9c888",
    "/assets/img/sincerity-cupping-logo.svg",
    "/assets/js/site.js?v=939cec1c255b",
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

test("sitemap static and area lastmod values come only from stored page dates", () => {
  const pageModifiedPath = path.join(root, "data", "page-modified.json");
  assert.ok(fs.existsSync(pageModifiedPath), "missing data/page-modified.json");
  const pageModified = JSON.parse(fs.readFileSync(pageModifiedPath, "utf8"));
  assert.deepEqual(Object.keys(pageModified).sort(), Object.keys(fixturePageModified).sort());
  for (const [urlPath, expectedDate] of Object.entries(fixturePageModified)) {
    assert.equal(pageModified[urlPath], expectedDate, `wrong stored modified date for ${urlPath}`);
  }

  const productionSitemap = read("sitemap.xml");
  for (const [urlPath, modified] of Object.entries(pageModified)) {
    if (/^\/areas\/[^/]+\/$/.test(urlPath)) {
      assert.doesNotMatch(productionSitemap, new RegExp(`<loc>${business.domain}${urlPath}</loc>`));
      continue;
    }
    const url = `${business.domain}${urlPath}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(productionSitemap, new RegExp(`<loc>${url}</loc><lastmod>${modified}</lastmod>`));
  }

});

test("committed sitemap dates contain no runtime or future-date churn", () => {
  const sitemap = read("sitemap.xml");
  assert.doesNotMatch(sitemap, /<lastmod>2099-/);
  for (const [urlPath, modified] of Object.entries(fixturePageModified)) {
    if (/^\/areas\/[^/]+\/$/.test(urlPath)) {
      assert.equal(sitemap.includes(`<loc>${business.domain}${urlPath}</loc>`), false, `noindex route leaked into sitemap: ${urlPath}`);
      continue;
    }
    const expected = `<loc>${business.domain}${urlPath}</loc><lastmod>${modified}</lastmod>`;
    assert.equal(sitemap.split(expected).length - 1, 1, `stored date drift for ${urlPath}`);
  }
});

test("committed catalogue agrees across articles, blog, sitemap and both LLM files", () => {
  const blog = read("blog/index.html");
  const sitemap = read("sitemap.xml");
  const llms = read("llms.txt");
  const llmsFull = read("llms-full.txt");
  const blogCards = [...blog.matchAll(/<article\b[^>]*class="[^"]*\bcard\b[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)]
    .map((match) => match[0]);

  for (const record of manifest) {
    const relativeUrl = `/articles/${record.slug}/`;
    const absoluteUrl = `${business.domain}${relativeUrl}`;
    assert.ok(fs.existsSync(path.join(root, "articles", record.slug, "index.html")), `missing article ${record.slug}`);
    const matchingCards = blogCards.filter((card) => card.includes(`href="${relativeUrl}"`));
    assert.equal(matchingCards.length, 1, `blog card drift for ${record.slug}`);
    const [card] = matchingCards;
    const cardText = visibleText(card);
    assert.ok(cardText.includes(record.title), `blog title drift for ${record.slug}`);
    assert.ok(cardText.includes(record.summary), `blog summary drift for ${record.slug}`);
    assert.match(card, new RegExp(`<time\\b[^>]*datetime="${record.date}"`), `blog date drift for ${record.slug}`);
    assert.equal(sitemap.split(`<loc>${absoluteUrl}</loc>`).length - 1, 1, `sitemap drift for ${record.slug}`);
    const line = `[${record.title}](${absoluteUrl}): ${record.summary}`;
    assert.equal(llms.split(line).length - 1, 1, `llms.txt drift for ${record.slug}`);
    assert.equal(llmsFull.split(line).length - 1, 1, `llms-full.txt drift for ${record.slug}`);
  }
});

test("committed protected articles retain reviewed structured content and metadata", () => {
  assert.equal(protectedRecords.length, 8);
  for (const record of protectedRecords) {
    const topic = topics.find((item) => item.slug === record.slug);
    const article = read(`articles/${record.slug}/index.html`);
    assert.ok(topic, `missing protected topic ${record.slug}`);
    assert.match(article, new RegExp(topic.content.answer.heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(article, new RegExp(topic.content.answer.text.slice(0, 48).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    const schema = jsonLd(article).find((item) => item["@type"] === "Article");
    assert.equal(schema?.headline, record.title);
    assert.equal(schema?.description, record.summary);
  }
});

test("committed article publication and modification dates remain separate", () => {
  for (const record of manifest) {
    assert.match(record.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(record.modified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(record.date < record.modified, `publication date was not preserved for ${record.slug}`);
    const article = read(`articles/${record.slug}/index.html`);
    const schema = jsonLd(article).find((item) => item["@type"] === "Article");
    assert.equal(schema?.datePublished, record.date, `published date drift for ${record.slug}`);
    assert.equal(schema?.dateModified, record.modified, `modified date drift for ${record.slug}`);
  }
});

test("committed hours labels, schema and LLM facts derive from business data", () => {
  assert.deepEqual(
    business.openingHours.map((entry) => entry.day),
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "business opening hours must contain each weekday once, in order",
  );
  const {opens, closes} = business.openingHours[0];
  assert.match(opens, /^\d{2}:\d{2}$/);
  assert.match(closes, /^\d{2}:\d{2}$/);
  assert.ok(
    business.openingHours.every((entry) => entry.opens === opens && entry.closes === closes),
    "daily opening hours must use one consistent time range",
  );

  const blog = read("blog/index.html");
  const llms = read("llms.txt");
  const llmsFull = read("llms-full.txt");
  assert.match(visibleText(blog), new RegExp(`Open daily · ${opens}–${closes}`));
  assert.match(blog, new RegExp(`"openingHours":"Mo-Su ${opens}-${closes}"`));
  assert.match(llms, new RegExp(`Opening hours: daily ${opens}–${closes}`));
  assert.match(llmsFull, new RegExp(`Opening hours: daily ${opens}–${closes}`));
});

test("manifest preserves publication dates and records the attribution rewrite date", () => {
  assert.equal(generatedRecords.length, 16);
  assert.equal(protectedRecords.length, 8);
  const sitemap = read("sitemap.xml");

  for (const record of generatedRecords) {
    assert.equal(record.modified, "2026-07-21", `wrong modified date for ${record.slug}`);
    const article = read(`articles/${record.slug}/index.html`);
    const schema = jsonLd(article).find((item) => item["@type"] === "Article");
    assert.equal(schema?.datePublished, record.date, `published date drift for ${record.slug}`);
    assert.equal(schema?.dateModified, record.modified, `modified date drift for ${record.slug}`);
  }
  for (const record of protectedRecords) {
    assert.equal(record.modified, "2026-07-21", `wrong protected rewrite date: ${record.slug}`);
    assert.notEqual(record.modified, record.date, `protected publication date was not preserved: ${record.slug}`);
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

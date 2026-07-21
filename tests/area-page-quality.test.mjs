import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const areas = JSON.parse(fs.readFileSync(path.join(root, "data", "area-pages.json"), "utf8"));
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const destination = "330 Streatham High Rd, London SW16 6HH";
const destinationPlaceId = "ChIJ6-vLLJQHdkgRPrnWnRsH6_Q";
const outputFiles = [
  "areas/index.html",
  ...areas.map(({slug}) => `areas/${slug}/index.html`),
];

function read(relativePath, directory = root) {
  return fs.readFileSync(path.join(directory, relativePath), "utf8");
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
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];
}

function anchorByText(markup, text) {
  return [...markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)]
    .map((match) => match[0])
    .find((anchor) => visibleText(anchor) === text);
}

function normalizeLocalityNames(text) {
  return [...areas]
    .sort((left, right) => right.name.length - left.name.length)
    .reduce(
      (result, area) => result.replace(new RegExp(`\\b${escapeRegExp(area.name)}\\b`, "gi"), "local area"),
      text,
    );
}

function generatorFixture(t) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-area-renderer-"));
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));
  fs.mkdirSync(path.join(fixture, "scripts"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "data"), {recursive: true});
  fs.copyFileSync(path.join(root, "scripts", "generate-areas.mjs"), path.join(fixture, "scripts", "generate-areas.mjs"));
  fs.copyFileSync(path.join(root, "data", "area-pages.json"), path.join(fixture, "data", "area-pages.json"));
  fs.copyFileSync(path.join(root, "data", "business.json"), path.join(fixture, "data", "business.json"));
  return fixture;
}

function runGenerator(fixture) {
  return spawnSync(process.execPath, [path.join(fixture, "scripts", "generate-areas.mjs")], {
    cwd: fixture,
    encoding: "utf8",
  });
}

test("locality copy is most of each page and whole-main similarity stays below 0.40", (t) => {
  const corpora = [];
  let lowestRatio = {slug: "", ratio: 1};

  for (const area of areas) {
    const html = read(`areas/${area.slug}/index.html`);
    const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0];
    assert.ok(main, `${area.slug}: missing main`);
    const localSections = [...main.matchAll(/<section\b(?=[^>]*\bdata-area-local-copy\b)[^>]*>[\s\S]*?<\/section>/gi)]
      .map((match) => match[0]);
    assert.equal(localSections.length, 3, `${area.slug}: expected three marked local sections`);

    const localWordCount = normalizedWords(visibleText(localSections.join(" "))).length;
    const mainWordCount = normalizedWords(visibleText(main)).length;
    const ratio = localWordCount / mainWordCount;
    assert.ok(localWordCount >= 210, `${area.slug}: only ${localWordCount} local words`);
    assert.ok(ratio >= 0.55, `${area.slug}: local share ${ratio.toFixed(3)} is below 0.55`);
    if (ratio < lowestRatio.ratio) lowestRatio = {slug: area.slug, ratio};

    const normalizedMain = normalizeLocalityNames(visibleText(main));
    corpora.push({slug: area.slug, shingles: shingles(normalizedMain)});
  }

  let maximum = {left: "", right: "", score: 0};
  for (let left = 0; left < corpora.length; left += 1) {
    for (let right = left + 1; right < corpora.length; right += 1) {
      const score = jaccard(corpora[left].shingles, corpora[right].shingles);
      if (score > maximum.score) maximum = {left: corpora[left].slug, right: corpora[right].slug, score};
      assert.ok(score < 0.40, `${corpora[left].slug} and ${corpora[right].slug}: similarity ${score.toFixed(3)} is not below 0.40`);
    }
  }

  t.diagnostic(`lowest local share: ${lowestRatio.ratio.toFixed(3)} (${lowestRatio.slug})`);
  t.diagnostic(`maximum whole-main similarity: ${maximum.score.toFixed(3)} (${maximum.left} / ${maximum.right})`);
});

test("area titles carry the clinic brand while visible headings stay route-specific", () => {
  for (const area of areas) {
    const html = read(`areas/${area.slug}/index.html`);
    const expectedTitle = `${area.heading} | Sincerity Cupping Clinic`;
    const title = visibleText(html.match(/<title>[\s\S]*?<\/title>/i)?.[0] || "");
    const h1 = visibleText(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || "");
    const ogTitle = html.match(/<meta\b[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1];
    assert.equal(title, expectedTitle, `${area.slug}: title is not branded`);
    assert.ok(title.length <= 60, `${area.slug}: title is ${title.length} characters`);
    assert.equal(ogTitle, expectedTitle, `${area.slug}: og:title differs from title`);
    assert.equal(h1, area.heading, `${area.slug}: H1 must stay route-specific`);
  }

  const hub = read("areas/index.html");
  const expectedHubTitle = "South London Cupping Areas | Sincerity Cupping Clinic";
  const hubTitle = visibleText(hub.match(/<title>[\s\S]*?<\/title>/i)?.[0] || "");
  const hubHeading = visibleText(hub.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || "");
  const hubOgTitle = hub.match(/<meta\b[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1];
  assert.equal(hubTitle, expectedHubTitle);
  assert.ok(hubTitle.length <= 60, `area hub: title is ${hubTitle.length} characters`);
  assert.equal(hubOgTitle, expectedHubTitle);
  assert.equal(hubHeading, "Wet cupping service areas near Streatham");
});

test("each locality endpoint has exact origin-to-clinic directions and direct wet-cupping booking routes", () => {
  for (const area of areas) {
    const html = read(`areas/${area.slug}/index.html`);
    const directions = anchorByText(html, `Open directions from ${area.name}`);
    assert.ok(directions, `${area.slug}: missing locality directions action`);
    const directionsUrl = new URL(attribute(directions, "href").replace(/&amp;/g, "&"));
    assert.equal(directionsUrl.origin, "https://www.google.com", `${area.slug}: wrong Maps origin`);
    assert.equal(directionsUrl.pathname, "/maps/dir/", `${area.slug}: wrong Maps path`);
    assert.equal(directionsUrl.searchParams.get("api"), "1", `${area.slug}: missing Maps API flag`);
    assert.equal(directionsUrl.searchParams.get("origin"), `${area.name}, London`, `${area.slug}: wrong journey origin`);
    assert.equal(directionsUrl.searchParams.get("destination"), destination, `${area.slug}: wrong destination`);
    assert.equal(directionsUrl.searchParams.get("destination_place_id"), destinationPlaceId, `${area.slug}: wrong place ID`);

    const women = anchorByText(html, "Book women’s wet cupping");
    const men = anchorByText(html, "Book men’s wet cupping");
    assert.ok(women, `${area.slug}: missing direct women's route`);
    assert.ok(men, `${area.slug}: missing direct men's route`);
    assert.equal(attribute(women, "href").replace(/&amp;/g, "&"), business.femaleBookingUrl, `${area.slug}: wrong women's route`);
    assert.equal(attribute(men, "href").replace(/&amp;/g, "&"), business.maleBookingUrl, `${area.slug}: wrong men's route`);
  }
});

test("only the area hub marks Areas as the current main-navigation page", () => {
  const hub = read("areas/index.html");
  const hubNav = hub.match(/<nav\b[^>]*class="site-nav"[^>]*>[\s\S]*?<\/nav>/i)?.[0];
  const hubAreasLink = hubNav && [...hubNav.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)]
    .map((match) => match[0])
    .find((anchor) => attribute(anchor, "href") === "/areas/");
  assert.equal(attribute(hubAreasLink, "aria-current"), "page", "area hub must mark Areas current");

  for (const area of areas) {
    const html = read(`areas/${area.slug}/index.html`);
    const nav = html.match(/<nav\b[^>]*class="site-nav"[^>]*>[\s\S]*?<\/nav>/i)?.[0];
    const areasLink = nav && [...nav.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)]
      .map((match) => match[0])
      .find((anchor) => attribute(anchor, "href") === "/areas/");
    assert.ok(areasLink, `${area.slug}: missing Areas navigation link`);
    assert.equal(attribute(areasLink, "aria-current"), undefined, `${area.slug}: parent hub is not the current page`);
  }
});

test("the renderer rejects duplicate/self nearby entries and blank locality prose before writing", (t) => {
  const duplicateFixture = generatorFixture(t);
  const duplicatePath = path.join(duplicateFixture, "data", "area-pages.json");
  const duplicateData = JSON.parse(fs.readFileSync(duplicatePath, "utf8"));
  duplicateData[0].nearby = [duplicateData[0].slug, duplicateData[0].slug, duplicateData[0].slug];
  fs.writeFileSync(duplicatePath, `${JSON.stringify(duplicateData, null, 2)}\n`);
  const duplicateResult = runGenerator(duplicateFixture);
  assert.equal(duplicateResult.status, 1, duplicateResult.stdout || duplicateResult.stderr);
  assert.match(duplicateResult.stderr, /nearby.*(?:unique|self)|(?:unique|self).*nearby/i);

  const blankFixture = generatorFixture(t);
  const blankPath = path.join(blankFixture, "data", "area-pages.json");
  const blankData = JSON.parse(fs.readFileSync(blankPath, "utf8"));
  const firstParagraphs = blankData[0].localSections?.[0]?.paragraphs || blankData[0].localParagraphs;
  firstParagraphs[0] = "   ";
  fs.writeFileSync(blankPath, `${JSON.stringify(blankData, null, 2)}\n`);
  const blankResult = runGenerator(blankFixture);
  assert.equal(blankResult.status, 1, blankResult.stdout || blankResult.stderr);
  assert.match(blankResult.stderr, /local.*(?:paragraph|copy)|(?:paragraph|copy).*local/i);
});

test("the renderer is deterministic and its output matches every committed area file", (t) => {
  const fixture = generatorFixture(t);
  const firstResult = runGenerator(fixture);
  assert.equal(firstResult.status, 0, firstResult.stderr || firstResult.stdout);
  const firstOutput = new Map(outputFiles.map((relativePath) => [relativePath, read(relativePath, fixture)]));

  const secondResult = runGenerator(fixture);
  assert.equal(secondResult.status, 0, secondResult.stderr || secondResult.stdout);
  for (const relativePath of outputFiles) {
    const secondOutput = read(relativePath, fixture);
    assert.equal(secondOutput, firstOutput.get(relativePath), `${relativePath}: output changed between identical runs`);
    assert.equal(secondOutput, read(relativePath), `${relativePath}: committed page differs from generator output`);
  }
});

test("the homepage modification date reflects its published area-copy change", () => {
  const pageModified = JSON.parse(read("data/page-modified.json"));
  assert.equal(pageModified["/"], "2026-07-21", "stored homepage date is stale");

  const sitemap = read("sitemap.xml");
  const homepage = sitemap.match(/<url>\s*<loc>https:\/\/sinceritycupping\.co\.uk\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/i);
  assert.ok(homepage, "sitemap is missing the homepage entry");
  assert.equal(homepage[1], "2026-07-21", "sitemap homepage date is stale");
});

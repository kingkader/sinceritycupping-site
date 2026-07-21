import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rendererPath = path.join(root, "scripts", "generate-articles.mjs");
const bespokePublisherPath = path.join(root, "scripts", "write-article.mjs");
const retiredMessage = /automatic article rendering is retired.*direct static edits.*human review/is;
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const pageModified = JSON.parse(fs.readFileSync(path.join(root, "data", "page-modified.json"), "utf8"));

function run(scriptPath, cwd, ...args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {cwd, encoding: "utf8"});
}

function snapshotTree(directory) {
  const snapshot = [];
  const visit = (absoluteDirectory, relativeDirectory = "") => {
    for (const name of fs.readdirSync(absoluteDirectory).sort()) {
      const absolutePath = path.join(absoluteDirectory, name);
      const relativePath = path.join(relativeDirectory, name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        snapshot.push([relativePath, "symlink", fs.readlinkSync(absolutePath)]);
      } else if (stat.isDirectory()) {
        snapshot.push([relativePath, "directory"]);
        visit(absolutePath, relativePath);
      } else {
        snapshot.push([relativePath, "file", fs.readFileSync(absolutePath).toString("base64")]);
      }
    }
  };
  visit(directory);
  return snapshot;
}

function makeAdversarialFixture() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-renderer-retired-"));
  const areaDirectory = path.join(fixture, "areas", "balham");
  fs.mkdirSync(path.join(fixture, "data"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "articles"), {recursive: true});
  fs.mkdirSync(path.join(fixture, "blog"), {recursive: true});
  fs.mkdirSync(areaDirectory, {recursive: true});

  const slug = "safe-looking-slug";
  const topic = {
    slug,
    title: "Adversarial euphemism fixture",
    summary: "A passive-rule fixture that previously passed the regex gate.",
    angle: "The treated area must remain dry for a day.",
    content: {
      answer: {heading: "Passive instruction", text: "The treated area must remain dry for a day."},
      sections: [
        {heading: "Post-birth timing", paragraphs: ["Wait eight weeks after childbirth."]},
        {heading: "Driving", paragraphs: ["Driving may resume when you feel steady."]},
      ],
    },
  };
  const record = {
    slug,
    title: topic.title,
    summary: topic.summary,
    date: "2025-01-02",
    modified: "2026-07-21",
  };

  fs.writeFileSync(path.join(fixture, "data", "business.json"), `${JSON.stringify(business, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "article-topics.json"), `${JSON.stringify([topic], null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "article-manifest.json"), `${JSON.stringify([record], null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "data", "page-modified.json"), `${JSON.stringify(pageModified, null, 2)}\n`);
  fs.writeFileSync(path.join(fixture, "blog", "index.html"), "BLOG SENTINEL\n");
  fs.writeFileSync(path.join(fixture, "sitemap.xml"), "SITEMAP SENTINEL\n");
  fs.writeFileSync(path.join(fixture, "llms.txt"), "LLMS SENTINEL\n");
  fs.writeFileSync(path.join(fixture, "llms-full.txt"), "LLMS FULL SENTINEL\n");
  fs.writeFileSync(path.join(fixture, "payload.json"), `${JSON.stringify({...record, html: `<p>${topic.angle}</p>`})}\n`);
  fs.writeFileSync(path.join(areaDirectory, "index.html"), "AREA SENTINEL\n");
  fs.symlinkSync("../areas/balham", path.join(fixture, "articles", slug), "dir");
  return fixture;
}

test("retired renderer rejects every invocation without mutating adversarial data or following symlinks", (t) => {
  const invocations = [
    ["canonical reviewed rerender", "--count=0", "--rerender"],
    ["no arguments"],
    ["split count", "--count", "0", "--rerender"],
    ["false boolean", "--count=0", "--rerender=false"],
    ["zero boolean", "--count=0", "--rerender=0"],
    ["protected and dated", "--count=0", "--rerender", "--rerender-protected", "--date=2099-12-31"],
    ["new article", "--count=1"],
    ["duplicate counts", "--count=1", "--count=0", "--rerender"],
    ["bespoke equals", "--count=0", "--rerender", "--bespoke=payload.json"],
    ["bespoke split", "--count=0", "--rerender", "--bespoke", "payload.json"],
    ["empty bespoke", "--count=0", "--rerender", "--bespoke="],
    ["unknown and positional", "article.json", "--publish=true", "--force"],
  ];

  for (const [label, ...args] of invocations) {
    const fixture = makeAdversarialFixture();
    const before = snapshotTree(fixture);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = run(rendererPath, fixture, ...args);

    assert.deepEqual(snapshotTree(fixture), before, `${label}: filesystem changed`);
    assert.equal(result.status, 1, `${label}: ${result.stderr || result.stdout}`);
    assert.match(result.stderr, retiredMessage, label);
  }
});

test("retired renderer exits with its stable message before reading an empty project", (t) => {
  for (const args of [[], ["--count=0", "--rerender"], ["--rerender=false"], ["--help"]]) {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-renderer-empty-"));
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = run(rendererPath, fixture, ...args);

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stderr, retiredMessage);
    assert.doesNotMatch(result.stderr, /ENOENT|no such file|business\.json|article-topics\.json|at .*generate-articles/i);
    assert.deepEqual(fs.readdirSync(fixture), []);
  }
});

test("bespoke publisher remains a no-write tombstone for every argument form", (t) => {
  for (const args of [[], ["payload.json"], ["--bespoke=payload.json"], ["--force", "payload.json"]]) {
    const fixture = makeAdversarialFixture();
    const before = snapshotTree(fixture);
    t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

    const result = run(bespokePublisherPath, fixture, ...args);

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stderr, /automatic bespoke article publishing is retired.*(?:manual|human) review/is);
    assert.deepEqual(snapshotTree(fixture), before);
  }
});

test("no package, workflow or tombstone source can activate article rendering", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "seo-articles.yml"), "utf8");
  const renderer = fs.readFileSync(rendererPath, "utf8");
  const bespokePublisher = fs.readFileSync(bespokePublisherPath, "utf8");

  assert.equal("generate:articles" in packageJson.scripts, false);
  assert.equal("rerender:articles" in packageJson.scripts, false);
  assert.match(workflow, /workflow_dispatch:/);
  for (const command of [/npm test/, /npm run build/, /npm run check:dist/, /git diff --exit-code/]) {
    assert.match(workflow, command);
  }
  assert.doesNotMatch(workflow, /generate-articles|write-article|rerender|\bschedule:|\bcron:|git-auto-commit|pages deploy|wrangler/i);

  assert.match(renderer, retiredMessage);
  assert.doesNotMatch(renderer, /node:(?:fs|path)|readFile|writeFile|mkdir|copyFile|cpSync|rename|symlink|spawn|<article/i);
  assert.ok(renderer.trim().split("\n").length <= 12, "renderer tombstone contains dead rendering complexity");
  assert.match(bespokePublisher, /automatic bespoke article publishing is retired.*direct static edits.*human review/is);
  assert.doesNotMatch(bespokePublisher, /node:(?:fs|path|child_process)|readFile|writeFile|mkdir|spawn/i);
});

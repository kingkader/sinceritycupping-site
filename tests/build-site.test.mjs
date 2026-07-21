import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

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

const coreRoutes = [
  "index.html",
  "about/index.html",
  "areas/index.html",
  "blog/index.html",
  "contact/index.html",
  "privacy/index.html",
  "services/index.html",
];

const areaSlugs = [
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

const baselineRoutes = [
  ...coreRoutes,
  ...areaSlugs.map((slug) => `areas/${slug}/index.html`),
  ...articleSlugs.map((slug) => `articles/${slug}/index.html`),
];

const assetPaths = [
  "assets/css/style.css",
  "assets/img/back-cupping-glass-1200.avif",
  "assets/img/back-cupping-glass-1200.jpg",
  "assets/img/back-cupping-glass-1200.webp",
  "assets/img/back-cupping-glass-480.avif",
  "assets/img/back-cupping-glass-480.jpg",
  "assets/img/back-cupping-glass-480.webp",
  "assets/img/back-cupping-glass-800.avif",
  "assets/img/back-cupping-glass-800.jpg",
  "assets/img/back-cupping-glass-800.webp",
  "assets/img/favicon.svg",
  "assets/img/sincerity-cupping-logo.svg",
  "assets/img/wet-cupping-therapy-1600.jpg",
  "assets/js/site.js",
];

const requiredPublicPaths = [
  ...baselineRoutes,
  "404.html",
  ...assetPaths,
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

function filesUnder(directory, prefix = "") {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(absolutePath, relativePath);
    return entry.isFile() ? [relativePath] : [];
  });
}

function runBuild(...args) {
  return execFileSync(process.execPath, ["scripts/build-site.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function makeSourceFixtureWithout(missingEntry) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "sincerity-build-"));

  for (const relativePath of requiredPublicPaths) {
    if (relativePath === missingEntry) continue;
    const target = path.join(fixture, relativePath);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(root, relativePath), target);
  }

  return fixture;
}

test("build creates the exact public site contract", () => {
  fs.rmSync(dist, {recursive: true, force: true});
  fs.mkdirSync(dist, {recursive: true});
  fs.writeFileSync(path.join(dist, "stale-private-file.txt"), "remove me");

  runBuild();

  assert.equal(coreRoutes.length, 7);
  assert.equal(areaSlugs.length, 15);
  assert.equal(articleSlugs.length, 24);
  assert.equal(baselineRoutes.length, 46);
  assert.deepEqual(fs.readdirSync(dist).sort(), [...publicEntries].sort());
  assert.deepEqual(filesUnder(dist).sort(), [...requiredPublicPaths].sort());

  for (const relativePath of requiredPublicPaths) {
    assert.ok(
      fs.existsSync(path.join(dist, relativePath)),
      `missing required public path: ${relativePath}`,
    );
  }
});

test("build excludes every unallowlisted nested file from dist", (t) => {
  const fixture = makeSourceFixtureWithout("not-a-public-entry");
  const privatePath = path.join(fixture, "assets", "private-credentials.env");
  fs.writeFileSync(privatePath, "DO NOT PUBLISH\n");
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  runBuild(fixture);

  assert.equal(fs.existsSync(path.join(fixture, "dist", "assets", "private-credentials.env")), false);
  assert.deepEqual(filesUnder(path.join(fixture, "dist")).sort(), [...requiredPublicPaths].sort());
});

test("build fails clearly when an allowlisted source entry is missing", (t) => {
  const fixture = makeSourceFixtureWithout("robots.txt");
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = spawnSync(
    process.execPath,
    ["scripts/build-site.mjs", fixture],
    {cwd: root, encoding: "utf8"},
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /Missing public site entries: robots\.txt/);
});

test("build rejects nested public symlinks before touching dist", (t) => {
  const fixture = makeSourceFixtureWithout("not-a-public-entry");
  const privateSource = path.join(fixture, "private-source.txt");
  const publicLink = path.join(fixture, "assets", "nested", "leak.txt");
  const distSentinel = path.join(fixture, "dist", "sentinel.txt");
  fs.writeFileSync(privateSource, "PRIVATE SENTINEL\n");
  fs.mkdirSync(path.dirname(publicLink), {recursive: true});
  fs.symlinkSync("../../private-source.txt", publicLink);
  fs.mkdirSync(path.dirname(distSentinel), {recursive: true});
  fs.writeFileSync(distSentinel, "UNCHANGED DIST\n");
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = spawnSync(
    process.execPath,
    ["scripts/build-site.mjs", fixture],
    {cwd: root, encoding: "utf8"},
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /symbolic link.*assets[\\/]nested[\\/]leak\.txt/i);
  assert.equal(fs.readFileSync(distSentinel, "utf8"), "UNCHANGED DIST\n");
  assert.equal(fs.existsSync(path.join(fixture, "dist", "assets", "nested", "leak.txt")), false);
});

test("build rejects a broken top-level public symlink before touching dist", (t) => {
  const fixture = makeSourceFixtureWithout("not-a-public-entry");
  const publicEntry = path.join(fixture, "privacy");
  const distSentinel = path.join(fixture, "dist", "sentinel.txt");
  fs.rmSync(publicEntry, {recursive: true});
  fs.symlinkSync("missing-private-directory", publicEntry, "dir");
  fs.mkdirSync(path.dirname(distSentinel), {recursive: true});
  fs.writeFileSync(distSentinel, "UNCHANGED DIST\n");
  t.after(() => fs.rmSync(fixture, {recursive: true, force: true}));

  const result = spawnSync(
    process.execPath,
    ["scripts/build-site.mjs", fixture],
    {cwd: root, encoding: "utf8"},
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /symbolic links?: privacy/i);
  assert.equal(fs.readFileSync(distSentinel, "utf8"), "UNCHANGED DIST\n");
});

test("source check excludes the generated dist directory", () => {
  runBuild();

  const output = execFileSync(process.execPath, ["scripts/check-site.mjs", "."], {
    cwd: root,
    encoding: "utf8",
  });

  assert.match(output, /^Checked 48 HTML file\(s\)\./);
});

import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const requiredPaths = [
  "index.html",
  "404.html",
  "services/index.html",
  "about/index.html",
  "contact/index.html",
  "blog/index.html",
  "privacy/index.html",
  "assets/css/style.css",
  "assets/js/site.js",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "llms-full.txt",
  "_headers",
  "_redirects",
];

const rejectedPaths = [
  "package.json",
  "README.md",
  "payload.json",
  "data",
  "scripts",
  "tests",
  ".github",
  ".gitignore",
  ".wrangler",
  "preview",
  "docs",
];

function pageSlugs(directory) {
  return fs.readdirSync(path.join(root, directory), {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

test("build creates a clean public dist directory", () => {
  fs.rmSync(dist, {recursive: true, force: true});
  fs.mkdirSync(dist, {recursive: true});
  fs.writeFileSync(path.join(dist, "stale-private-file.txt"), "remove me");

  execFileSync(process.execPath, ["scripts/build-site.mjs"], {
    cwd: root,
    encoding: "utf8",
  });

  for (const relativePath of requiredPaths) {
    assert.ok(
      fs.existsSync(path.join(dist, relativePath)),
      `missing required public path: ${relativePath}`,
    );
  }

  const areaSlugs = pageSlugs("areas");
  const articleSlugs = pageSlugs("articles");

  assert.equal(areaSlugs.length, 15, "source should contain 15 area pages");
  assert.equal(articleSlugs.length, 24, "source should contain 24 article pages");

  for (const slug of areaSlugs) {
    assert.ok(
      fs.existsSync(path.join(dist, "areas", slug, "index.html")),
      `missing area page: ${slug}`,
    );
  }

  for (const slug of articleSlugs) {
    assert.ok(
      fs.existsSync(path.join(dist, "articles", slug, "index.html")),
      `missing article page: ${slug}`,
    );
  }

  for (const relativePath of [...rejectedPaths, "stale-private-file.txt"]) {
    assert.ok(
      !fs.existsSync(path.join(dist, relativePath)),
      `private or stale path leaked into dist: ${relativePath}`,
    );
  }
});

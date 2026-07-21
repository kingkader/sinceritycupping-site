import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const remoteFonts = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

function htmlFilesUnder(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(entryPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
  });
}

const productionHtml = [
  ...fs.readdirSync(root, {withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(root, entry.name)),
  ...["about", "areas", "articles", "blog", "contact", "privacy", "services"]
    .flatMap((directory) => htmlFilesUnder(path.join(root, directory))),
];

test("all production HTML uses local font stacks only", () => {
  assert.ok(productionHtml.length >= 46, "expected every production HTML source");

  for (const file of productionHtml) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      remoteFonts,
      `remote font request in ${path.relative(root, file)}`,
    );
  }
});

test("retired article renderer tombstone contains no remote font dependency", () => {
  const tombstone = fs.readFileSync(
    path.join(root, "scripts/generate-articles.mjs"),
    "utf8",
  );
  assert.doesNotMatch(tombstone, remoteFonts);
});

test("reveal motion never fades readable content through low-contrast opacity states", () => {
  const css = fs.readFileSync(path.join(root, "assets/css/style.css"), "utf8");
  const revealRules = [...css.matchAll(/\.js\s+\.reveal(?:\.in)?\s*\{([^}]*)\}/g)];

  assert.ok(revealRules.length >= 2, "expected the progressive reveal rules");
  for (const rule of revealRules) assert.doesNotMatch(rule[1], /\bopacity\s*:/i);
});

test("brand home links derive their accessible names from their visible text", () => {
  for (const file of productionHtml) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(
      source,
      /<a\b[^>]*class="(?:brand|footer-brand-row)"[^>]*\baria-label=/i,
      `redundant brand-link label in ${path.relative(root, file)}`,
    );
  }

  assert.doesNotMatch(
    fs.readFileSync(path.join(root, "scripts/generate-areas.mjs"), "utf8"),
    /<a\b[^>]*class="(?:brand|footer-brand-row)"[^>]*\baria-label=/i,
  );
});

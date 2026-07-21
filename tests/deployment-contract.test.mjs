import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function htmlFilesUnder(directory) {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFilesUnder(entryPath);
    return entry.isFile() && entry.name.endsWith(".html") ? [entryPath] : [];
  });
}

test("production workflow validates and deploys only the allowlisted dist build", () => {
  const workflow = read(".github/workflows/deploy.yml");

  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run check:dist/);
  assert.match(
    workflow,
    /pages deploy dist --project-name=sinceritycupping --branch=main/,
  );
  assert.doesNotMatch(workflow, /pages deploy \. /);
  assert.match(workflow, /group:\s*sinceritycupping-production/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
});

test("article workflow remains manual validation only", () => {
  const workflow = read(".github/workflows/seo-articles.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /schedule:/);
  assert.doesNotMatch(workflow, /generate-articles|write-article|wrangler-action|pages deploy/i);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run check:dist/);
});

test("Cloudflare headers enforce security and safe cache policy", () => {
  const headers = read("_headers");

  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]) {
    assert.ok(headers.includes(directive), `missing CSP directive: ${directive}`);
  }

  assert.match(headers, /Content-Security-Policy:/);
  assert.match(headers, /Strict-Transport-Security: max-age=63072000; includeSubDomains; preload/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
  assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
  assert.match(headers, /Cache-Control: public, max-age=0, must-revalidate/);
  assert.doesNotMatch(headers, /\/assets\/\*[\s\S]*?immutable/);
});

test("CSP allows each intentional inline executable script by exact hash", () => {
  const headers = read("_headers");
  const htmlFiles = [
    path.join(root, "index.html"),
    path.join(root, "404.html"),
    ...["about", "areas", "articles", "blog", "contact", "privacy", "services"]
      .flatMap((directory) => htmlFilesUnder(path.join(root, directory))),
  ];

  let executableScriptCount = 0;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      const [, attributes, source] = match;
      if (/\bsrc\s*=/.test(attributes) || /application\/ld\+json/.test(attributes)) continue;
      executableScriptCount += 1;
      const hash = crypto.createHash("sha256").update(source).digest("base64");
      assert.ok(
        headers.includes(`'sha256-${hash}'`),
        `CSP does not allow inline script in ${path.relative(root, file)}`,
      );
    }
  }

  assert.equal(executableScriptCount, 48);
});

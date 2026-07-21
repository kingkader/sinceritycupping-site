import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pinnedActions = new Map([
  ["actions/checkout", "11d5960a326750d5838078e36cf38b85af677262"],
  ["actions/setup-node", "49933ea5288caeca8642d1e84afbd3f7d6820020"],
  ["cloudflare/wrangler-action", "9acf94ace14e7dc412b076f2c5c20b8ce93c79cd"],
]);

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

function workflowTriggerBlock(workflow) {
  const match = workflow.match(/^on:\n([\s\S]*?)\npermissions:/m);
  assert.ok(match, "workflow must declare triggers before permissions");
  return match[1].trim();
}

function headerRuleBody(headers, pattern) {
  const block = headers.trim().split(/\n(?=\/)/)
    .find((candidate) => candidate.split("\n", 1)[0] === pattern);
  assert.ok(block, `missing header rule: ${pattern}`);
  return block.slice(block.indexOf("\n") + 1);
}

function workflowStep(workflow, name) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  assert.notEqual(start, -1, `missing workflow step: ${name}`);
  let end = start + 1;
  while (end < lines.length && !/^\s{6}- name: /.test(lines[end])) end += 1;
  return lines.slice(start, end).join("\n");
}

function assertMandatoryRunStep(workflow, name, command) {
  const step = workflowStep(workflow, name);
  const run = step.match(/^\s+run:\s*(.+?)\s*$/m)?.[1];
  assert.equal(run, command, `${name} must execute the exact required command`);
  assert.doesNotMatch(step, /^\s+(?:if|continue-on-error):/m, `${name} must not be bypassable`);
}

function assertPinnedActions(workflow, expectedNames) {
  const uses = [...workflow.matchAll(/^\s+uses:\s*([^\s#]+).*$/gm)].map((match) => match[1]);
  assert.equal(uses.length, expectedNames.length, "unexpected workflow action count");

  for (const name of expectedNames) {
    const sha = pinnedActions.get(name);
    assert.ok(sha, `test is missing a trusted SHA for ${name}`);
    assert.ok(uses.includes(`${name}@${sha}`), `${name} must be pinned to ${sha}`);
  }
  for (const use of uses) assert.match(use, /@[0-9a-f]{40}$/, `action is not pinned to a full commit SHA: ${use}`);
}

test("production workflow validates and deploys only the allowlisted dist build", () => {
  const workflow = read(".github/workflows/deploy.yml");
  const commands = [...workflow.matchAll(/\bpages deploy\s+([^\s]+)/g)];
  const testIndex = workflow.indexOf("- name: Test committed site");
  const buildIndex = workflow.indexOf("- name: Build allowlisted public site");
  const checkIndex = workflow.indexOf("- name: Validate built site");
  const deployIndex = workflow.indexOf("command: pages deploy dist ");

  assert.equal(workflowTriggerBlock(workflow), "push:\n    branches: [main]");
  assertPinnedActions(workflow, ["actions/checkout", "actions/setup-node", "cloudflare/wrangler-action"]);
  assertMandatoryRunStep(workflow, "Test committed site", "npm test");
  assertMandatoryRunStep(workflow, "Build allowlisted public site", "npm run build");
  assertMandatoryRunStep(workflow, "Validate built site", "npm run check:dist");
  assertMandatoryRunStep(workflow, "Confirm build did not edit tracked files", "git diff --exit-code");
  assert.doesNotMatch(workflow, /^\s+(?:if|continue-on-error):/m, "production workflow must not contain bypass controls");
  assert.doesNotMatch(workflow, /^\s+deployments:\s*write\s*$/m, "Cloudflare direct deploy does not need GitHub deployment writes");
  assert.equal(commands.length, 1, "production workflow must contain exactly one deploy command");
  assert.equal(commands[0][1], "dist", "production upload boundary must be exactly dist");
  assert.ok(testIndex >= 0 && testIndex < buildIndex, "tests must run before build");
  assert.ok(buildIndex < checkIndex, "build must run before dist validation");
  assert.ok(checkIndex < deployIndex, "dist validation must run before deployment");
  assert.match(workflow, /command: pages deploy dist --project-name=sinceritycupping --branch=main/);
  assert.match(workflow, /group:\s*sinceritycupping-production/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  const deployStep = workflowStep(workflow, "Deploy to Cloudflare Pages");
  assert.doesNotMatch(deployStep, /^\s+(?:if|continue-on-error):/m, "deploy step must not be bypassable");
});

test("article workflow remains manual validation only", () => {
  const workflow = read(".github/workflows/seo-articles.yml");

  assert.equal(workflowTriggerBlock(workflow), "workflow_dispatch:");
  assertPinnedActions(workflow, ["actions/checkout", "actions/setup-node"]);
  assertMandatoryRunStep(workflow, "Test committed content", "npm test");
  assertMandatoryRunStep(workflow, "Build allowlisted public site", "npm run build");
  assertMandatoryRunStep(workflow, "Validate built site", "npm run check:dist");
  assertMandatoryRunStep(workflow, "Confirm validation did not edit tracked files", "git diff --exit-code");
  assert.doesNotMatch(workflow, /^\s+(?:if|continue-on-error):/m, "validation workflow must not contain bypass controls");
  assert.doesNotMatch(workflow, /generate-articles|write-article|wrangler-action|pages deploy/i);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm run check:dist/);
  assert.match(workflow, /group:\s*sinceritycupping-production/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
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
  const universalBlock = headerRuleBody(headers, "/*");
  const assetBlock = headerRuleBody(headers, "/assets/*");
  assert.doesNotMatch(universalBlock, /Cache-Control:/, "universal security rule must not duplicate cache policy");
  assert.match(assetBlock, /Cache-Control: public, max-age=604800, stale-while-revalidate=86400/);
  assert.equal((assetBlock.match(/Cache-Control:/g) || []).length, 1);
  assert.doesNotMatch(headers, /immutable/);
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

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}

walk(root);

const errors = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (/noindex,\s*nofollow/i.test(html)) errors.push(`${file}: contains noindex,nofollow`);
  if (!/<title>[^<]{10,}<\/title>/i.test(html)) errors.push(`${file}: missing useful title`);
  if (!/<meta name="description" content="[^"]{40,}"/i.test(html)) errors.push(`${file}: missing useful meta description`);
  if (!/rel="canonical"/i.test(html) && path.basename(file) !== "404.html") errors.push(`${file}: missing canonical`);
  if (/<img(?![^>]*\salt=)/i.test(html)) errors.push(`${file}: image missing alt text`);
}

const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
if (/Disallow:\s*\//i.test(robots)) errors.push("robots.txt blocks crawling");
if (!fs.existsSync(path.join(root, "sitemap.xml"))) errors.push("missing sitemap.xml");
if (!fs.existsSync(path.join(root, "llms.txt"))) errors.push("missing llms.txt");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} HTML file(s). Indexing, metadata, sitemap and llms.txt look OK.`);

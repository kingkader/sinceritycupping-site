import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
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

const missingEntries = publicEntries.filter((entry) => !fs.existsSync(path.join(root, entry)));
if (missingEntries.length) {
  throw new Error(`Missing public site entries: ${missingEntries.join(", ")}`);
}

fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});

let copiedCount = 0;
for (const entry of publicEntries) {
  fs.cpSync(path.join(root, entry), path.join(dist, entry), {recursive: true});
  copiedCount += 1;
}

console.log(`Copied ${copiedCount} public entries to dist/.`);

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), process.argv[2] || ".");
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

const missingEntries = publicEntries.filter((entry) => {
  try {
    fs.lstatSync(path.join(root, entry));
    return false;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
});
if (missingEntries.length) {
  throw new Error(`Missing public site entries: ${missingEntries.join(", ")}`);
}

function findSymlinks(absolutePath, relativePath) {
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) return [relativePath];
  if (!stat.isDirectory()) return [];
  return fs.readdirSync(absolutePath)
    .flatMap((name) => findSymlinks(path.join(absolutePath, name), path.join(relativePath, name)));
}

const publicSymlinks = publicEntries.flatMap((entry) => (
  findSymlinks(path.join(root, entry), entry)
));
if (publicSymlinks.length) {
  throw new Error(`Public site inputs must not contain symbolic links: ${publicSymlinks.join(", ")}`);
}

fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});

let copiedCount = 0;
for (const entry of publicEntries) {
  fs.cpSync(path.join(root, entry), path.join(dist, entry), {recursive: true});
  copiedCount += 1;
}

console.log(`Copied ${copiedCount} public entries to dist/.`);

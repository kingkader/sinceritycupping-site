import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), process.argv[2] || ".");
const dist = path.join(root, "dist");
const coreFiles = [
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
const assetFiles = [
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
const publicFiles = [
  ...coreFiles,
  ...areaSlugs.map((slug) => `areas/${slug}/index.html`),
  ...articleSlugs.map((slug) => `articles/${slug}/index.html`),
  ...assetFiles,
  "404.html",
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
const publicRoots = [...new Set(publicFiles.map((relativePath) => relativePath.split("/")[0]))];

function findSymlinks(absolutePath, relativePath) {
  let stat;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  if (stat.isSymbolicLink()) return [relativePath];
  if (!stat.isDirectory()) return [];
  return fs.readdirSync(absolutePath)
    .flatMap((name) => findSymlinks(path.join(absolutePath, name), path.join(relativePath, name)));
}

const publicSymlinks = publicRoots.flatMap((entry) => (
  findSymlinks(path.join(root, entry), entry)
));
if (publicSymlinks.length) {
  throw new Error(`Public site inputs must not contain symbolic links: ${publicSymlinks.join(", ")}`);
}

const missingFiles = publicFiles.filter((relativePath) => {
  try {
    return !fs.lstatSync(path.join(root, relativePath)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
});
if (missingFiles.length) {
  throw new Error(`Missing public site entries: ${missingFiles.join(", ")}`);
}

fs.rmSync(dist, {recursive: true, force: true});
fs.mkdirSync(dist, {recursive: true});

let copiedCount = 0;
for (const relativePath of publicFiles) {
  const target = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, relativePath), target);
  copiedCount += 1;
}

console.log(`Copied ${copiedCount} exact public files to dist/.`);

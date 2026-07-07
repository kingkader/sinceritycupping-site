// Bespoke article publisher for Hermes content ops.
// Usage: node scripts/write-article.mjs payload.json
//   payload: {slug, title, summary, html, date?}
// Renders the article in the site shell, updates the manifest (custom:true so
// it is never regenerated), and refreshes blog index, sitemap.xml and llms.txt.
import {spawnSync} from "node:child_process";
import process from "node:process";
const payload = process.argv[2];
if (!payload) { console.error("Usage: node scripts/write-article.mjs payload.json"); process.exit(1); }
const r = spawnSync("node", ["scripts/generate-articles.mjs", "--count=0", "--bespoke", payload], {stdio: "inherit"});
process.exit(r.status ?? 1);

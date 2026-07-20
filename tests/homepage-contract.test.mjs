import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/style.css"), "utf8");

test("homepage leads with the approved inclusive cupping message", () => {
  assert.match(
    home,
    /<h1>Private, professional cupping in South London<\/h1>/,
  );
  assert.match(home, /every faith and background/);
  assert.match(home, /Everyone is welcome/);
  assert.match(home, /Women(?:'|’)s cupping/);
  assert.match(home, /Men(?:'|’)s cupping/);
});

test("homepage offers distinct booking routes for women and men", () => {
  assert.match(home, /id="book"/);
  assert.match(home, /oiid=sv%3A15058937/);
  assert.match(home, /oiid=sv%3A14524918/);
});

test("homepage excludes network fonts and retired claims", () => {
  assert.doesNotMatch(home, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(
    home,
    /Tirmidhi 2051|17th, 19th and 21st|clinical standard/i,
  );
});

test("homepage uses the approved accessible visual tokens", () => {
  assert.match(css, /--cream:\s*#fbf7ee/i);
  assert.match(css, /--forest:\s*#163129/i);
  assert.match(css, /prefers-reduced-motion/);
});

test("every homepage image declares alt text and intrinsic dimensions", () => {
  const images = [...home.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);

  assert.ok(images.length > 0, "expected at least one homepage image");

  for (const image of images) {
    assert.match(image, /\balt\s*=\s*(?:"[^"]*"|'[^']*')/i, `missing alt: ${image}`);
    assert.match(image, /\bwidth\s*=\s*(?:"\d+"|'\d+')/i, `missing width: ${image}`);
    assert.match(image, /\bheight\s*=\s*(?:"\d+"|'\d+')/i, `missing height: ${image}`);
  }
});

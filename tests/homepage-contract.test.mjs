import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/style.css"), "utf8");
const heroSizes = "(max-width: 700px) calc(100vw - 3rem), (max-width: 980px) 540px, (max-width: 1200px) 42vw, 540px";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cssRuleBody(styles, selector) {
  const match = styles.match(
    new RegExp(`(?:^|\\n)\\s*${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`),
  );
  assert.ok(match, `missing ${selector} rule`);
  return match[1];
}

function anchorHrefByText(markup, label) {
  const anchor = [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .find((match) => match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() === label);
  assert.ok(anchor, `missing link: ${label}`);
  const href = anchor[1].match(/\bhref="([^"]+)"/i)?.[1];
  assert.ok(href, `missing href for: ${label}`);
  return href;
}

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

test("booking cards bind each client route to its correct service", () => {
  const womenCard = home.match(/<article\b[^>]*\bid="women-booking"[^>]*>[\s\S]*?<\/article>/)?.[0];
  const menCard = home.match(/<article\b[^>]*\bid="men-booking"[^>]*>[\s\S]*?<\/article>/)?.[0];
  assert.ok(womenCard, "missing women booking card");
  assert.ok(menCard, "missing men booking card");

  assert.match(womenCard, /Women(?:'|’)s cupping/);
  assert.match(womenCard, /Sister Aisha Mejri · from £45 · 45 minutes/);
  assert.equal(
    anchorHrefByText(womenCard, "Book for women"),
    "https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&amp;oiid=sv%3A15058937&amp;share=true&amp;pId=1024551",
  );

  assert.match(menCard, /Men(?:'|’)s cupping/);
  assert.match(menCard, /Brother Abu Layla · from £45 · 40 minutes/);
  assert.equal(
    anchorHrefByText(menCard, "Book for men"),
    "https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&amp;oiid=sv%3A14524918&amp;share=true&amp;pId=1024551",
  );
});

test("generic homepage booking controls route through the selector", () => {
  const regions = [
    home.match(/<header\b[\s\S]*?<\/header>/)?.[0],
    home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0],
    home.match(/<nav\b[^>]*class="[^"]*mobile-bar[^"]*"[^>]*>[\s\S]*?<\/nav>/)?.[0],
  ];

  for (const region of regions) {
    assert.ok(region, "missing generic booking region");
    const links = [...region.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
      .map((match) => ({
        href: match[1].match(/\bhref="([^"]+)"/i)?.[1],
        text: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      }))
      .filter((link) => /^Book(?: an appointment)?$/i.test(link.text));

    assert.ok(links.length > 0, "missing generic Book control");
    for (const link of links) {
      assert.ok(["#book", "/#book"].includes(link.href), `unsafe generic Book route: ${link.href}`);
      assert.doesNotMatch(link.href, /oiid=sv%3A(?:14524918|15058937)/);
    }
  }
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

test("mobile navigation keeps no-JS content in flow and scopes collapse styles to JS", () => {
  const mobileStyles = css.match(
    /@media \(max-width: 800px\) \{([\s\S]*?)\n\}\n\n@media \(max-width: 700px\)/,
  )?.[1];
  assert.ok(mobileStyles, "missing 800px mobile styles");

  const noJsHeader = cssRuleBody(mobileStyles, ".site-header");
  const noJsNav = cssRuleBody(mobileStyles, ".site-nav");
  const jsHeader = cssRuleBody(mobileStyles, ".js .site-header");
  const jsNav = cssRuleBody(mobileStyles, ".js .site-nav");

  assert.match(noJsHeader, /position:\s*static/);
  assert.match(noJsNav, /position:\s*static/);
  assert.match(noJsNav, /display:\s*block/);
  assert.doesNotMatch(noJsNav, /position:\s*absolute|display:\s*none/);
  assert.match(jsHeader, /position:\s*sticky/);
  assert.match(jsNav, /position:\s*absolute/);
  assert.match(jsNav, /display:\s*none/);
  assert.match(cssRuleBody(mobileStyles, ".js .site-nav.open"), /display:\s*block/);
});

test("homepage footer links accessibility help to Contact", () => {
  const footer = home.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer, "missing homepage footer");
  assert.match(footer, /<a href="\/contact\/">Accessibility help<\/a>/);
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

test("homepage hero publishes resolution-responsive image candidates", () => {
  const picture = home.match(/<picture>[\s\S]*?back-cupping-glass[\s\S]*?<\/picture>/)?.[0];
  assert.ok(picture, "missing back-cupping-glass picture");

  for (const extension of ["avif", "webp", "jpg"]) {
    const srcset = [480, 800, 1200]
      .map((width) => `assets/img/back-cupping-glass-${width}.${extension} ${width}w`)
      .join(",\\s*");

    assert.match(
      picture,
      new RegExp(`srcset="${srcset}"[^>]*sizes="${escapeRegExp(heroSizes)}"`),
      `missing responsive ${extension.toUpperCase()} srcset and sizes`,
    );
  }
});

test("every responsive homepage hero candidate exists", () => {
  for (const width of [480, 800, 1200]) {
    for (const extension of ["avif", "webp", "jpg"]) {
      const candidate = path.join(
        root,
        "assets/img",
        `back-cupping-glass-${width}.${extension}`,
      );
      assert.ok(fs.existsSync(candidate), `missing hero candidate: ${candidate}`);
      assert.ok(fs.statSync(candidate).size > 0, `empty hero candidate: ${candidate}`);
    }
  }
});

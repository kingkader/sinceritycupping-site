# Sincerity Cupping Production Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved cupping-first, inclusive redesign to sinceritycupping.co.uk with correct women/men booking routes, responsible copy, a clean public build and verified performance/accessibility/search quality.

**Architecture:** Keep the existing dependency-free static HTML/CSS/JavaScript site. Add Node built-in contract tests and a deterministic allowlisted `dist/` build, improve the hand-authored core pages and global styles, then update the article generator and mechanical common-page content so future scheduled generation preserves the redesign. Cloudflare Pages deploys only `dist/`.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, Node.js 22 built-in test runner, GitHub Actions, Cloudflare Pages, Lighthouse CLI.

---

### Task 1: Add a clean, tested production build

**Files:**
- Create: `tests/build-site.test.mjs`
- Create: `scripts/build-site.mjs`
- Modify: `scripts/check-site.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing build allowlist test**

Create `tests/build-site.test.mjs` with Node's built-in test runner. The test must run `node scripts/build-site.mjs`, require these production paths, require all 45 pre-redesign sitemap paths, and reject source/private paths:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {spawnSync} from "node:child_process";

const root = process.cwd();
const dist = path.join(root, "dist");

test("build emits only the public website", () => {
  const result = spawnSync(process.execPath, ["scripts/build-site.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  for (const required of [
    "index.html", "404.html", "services/index.html", "about/index.html",
    "contact/index.html", "blog/index.html", "privacy/index.html",
    "assets/css/style.css", "assets/js/site.js", "robots.txt", "sitemap.xml",
    "llms.txt", "llms-full.txt", "_headers", "_redirects",
  ]) {
    assert.equal(fs.existsSync(path.join(dist, required)), true, required);
  }

  for (const forbidden of [
    "package.json", "README.md", "payload.json", "data", "scripts", "tests",
    ".github", ".gitignore", ".wrangler", "preview", "docs",
  ]) {
    assert.equal(fs.existsSync(path.join(dist, forbidden)), false, forbidden);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/build-site.test.mjs`

Expected: FAIL because `scripts/build-site.mjs` does not exist or `dist/` is not produced.

- [ ] **Step 3: Implement the minimal allowlisted build**

Create `scripts/build-site.mjs` using `fs.rmSync`, `fs.mkdirSync` and `fs.cpSync`. Copy exactly:

```js
const publicEntries = [
  "index.html", "404.html", "about", "areas", "articles", "assets", "blog",
  "contact", "privacy", "services", "apple-touch-icon.png", "favicon.ico",
  "favicon.svg", "icon.svg", "robots.txt", "sitemap.xml", "llms.txt",
  "llms-full.txt", "_headers", "_redirects",
];
```

The script must reject a missing allowlisted entry and print the number of copied entries. Add `dist/` to `.gitignore`.

Make the existing checker honour an optional root argument before any path walk:

```js
const requestedRoot = process.argv[2] || ".";
const root = path.resolve(process.cwd(), requestedRoot);
```

Update `package.json` scripts to:

```json
{
  "build": "node scripts/build-site.mjs",
  "test": "node --test tests/*.test.mjs",
  "check:source": "node scripts/check-site.mjs .",
  "check:dist": "node scripts/check-site.mjs dist",
  "check": "npm run check:source"
}
```

Preserve `generate:articles`.

- [ ] **Step 4: Verify GREEN and the baseline checker**

Run: `npm test && npm run build && npm run check:dist`

Expected: build test passes and the existing checker reports the public HTML count without scanning source-only previews.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json scripts/build-site.mjs scripts/check-site.mjs tests/build-site.test.mjs
git commit -m "build: deploy a clean public site"
```

### Task 2: Implement the approved visual system and homepage

**Files:**
- Create: `tests/homepage-contract.test.mjs`
- Modify: `index.html`
- Modify: `assets/css/style.css`
- Modify: `assets/js/site.js`

- [ ] **Step 1: Write the failing homepage contract**

Create a test that reads `index.html` and `assets/css/style.css` and asserts:

```js
assert.match(home, /Private, professional cupping in South London/);
assert.match(home, /every faith and background/);
assert.match(home, /Everyone is welcome/);
assert.match(home, /id="book"/);
assert.match(home, /oiid=sv%3A15058937/);
assert.match(home, /oiid=sv%3A14524918/);
assert.match(home, /Women(?:'|’)?s cupping/);
assert.match(home, /Men(?:'|’)?s cupping/);
assert.doesNotMatch(home, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
assert.doesNotMatch(home, /Tirmidhi 2051|17th, 19th and 21st|clinical standard/i);
assert.match(css, /--cream:\s*#fbf7ee/i);
assert.match(css, /--forest:\s*#163129/i);
assert.match(css, /prefers-reduced-motion/);
```

Also parse every `<img>` in the homepage and fail if it lacks `alt`, `width` or `height`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/homepage-contract.test.mjs`

Expected: FAIL on the old H1, Google Fonts, missing booking selector and missing image dimensions.

- [ ] **Step 3: Rebuild the homepage to the approved structure**

Use the specification verbatim for the hero message and section order. Preserve the existing address, phone, WhatsApp, public review quotations and all useful links. Required booking cards:

```html
<section class="section booking-section" id="book" aria-labelledby="booking-heading">
  <div class="container">
    <p class="eyebrow">Choose the right appointment</p>
    <h2 id="booking-heading">Two clear routes. No wrong-service bookings.</h2>
    <div class="booking-grid">
      <article class="booking-card">
        <p class="booking-role">Female practitioner</p>
        <h3>Women’s cupping</h3>
        <p>With Sister Aisha Mejri · from £45 · 45 minutes</p>
        <a class="btn btn-solid" href="https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&amp;oiid=sv%3A15058937&amp;share=true&amp;pId=1024551">Book for women</a>
      </article>
      <article class="booking-card">
        <p class="booking-role">Male practitioner</p>
        <h3>Men’s cupping</h3>
        <p>With Brother Abu Layla · from £45 · 40 minutes</p>
        <a class="btn btn-outline" href="https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&amp;oiid=sv%3A14524918&amp;share=true&amp;pId=1024551">Book for men</a>
      </article>
    </div>
  </div>
</section>
```

Generic header/mobile/footer Book controls must link to `/#book` or `#book`, never directly to the male Fresha URL.

- [ ] **Step 4: Apply the cream-and-forest design system**

Preserve existing selectors where possible. Define and use these tokens:

```css
:root {
  --cream: #fbf7ee;
  --cream-deep: #f3ecdd;
  --forest: #163129;
  --forest-deep: #102d25;
  --green: #2f6b54;
  --green-dark: #214e3b;
  --sage: #dfe9e1;
  --ink: #163129;
  --body: #3f514a;
  --muted: #5f6f68;
  --line: #d8cfbe;
  --control: #7b8a82;
  --gold: #7a4a16;
}
```

Use `Georgia, "Times New Roman", serif` for display text and `Arial, Helvetica, sans-serif` for body text. Remove all Google font requests. Add restrained 6–12px corners, strong focus rings, 44px targets, corrected contrast, 320px-safe grids, and responsive picture rules. Use the existing `back-cupping-glass` image for the hero with AVIF/WebP sources and explicit dimensions.

- [ ] **Step 5: Verify GREEN, responsive structure and unchanged JS essentials**

Run: `npm test && npm run build && npm run check:dist`

Expected: all tests pass. Manually verify the menu can open/close with Escape and content is visible when JavaScript is disabled.

- [ ] **Step 6: Commit**

```bash
git add index.html assets/css/style.css assets/js/site.js tests/homepage-contract.test.mjs
git commit -m "feat: launch the cupping-first homepage design"
```

### Task 3: Correct business data, booking details and core-page copy

**Files:**
- Create: `tests/core-content.test.mjs`
- Modify: `data/business.json`
- Modify: `services/index.html`
- Modify: `about/index.html`
- Modify: `contact/index.html`
- Modify: `privacy/index.html`
- Modify: `404.html`
- Modify: `scripts/generate-articles.mjs`
- Generated: `blog/index.html`

- [ ] **Step 1: Write the failing core-content test**

Assert that business data contains explicit standard/full service objects with prices, durations and four booking URLs; core navigation says `Cupping & prices`; contact metadata says daily 10:00–19:00; and public core pages contain none of:

```js
const banned = [
  /Tirmidhi 2051/i,
  /17th,? 19th and 21st/i,
  /Sunnah days?/i,
  /normally settles within 24 to 48 hours/i,
  /waiting at least three months after birth/i,
  /once every three months/i,
  /no showers, baths, pools, saunas or gyms/i,
  /avoid heavy meat and dairy/i,
];
```

Require a visible NCCIH safety link, complementary-care boundary, `100+ public reviews` wording and no exact `86 on Fresha` / `24 on Google` breakdown.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/core-content.test.mjs`

Expected: FAIL on old service advice, weak narration, generic booking data and stale review breakdown.

- [ ] **Step 3: Make business data a safe source of truth**

Replace the generic `bookingUrl` with `/#book` and define service records with these exact facts:

```json
[
  {"audience":"Women","name":"Women's wet cupping","price":"£45","durationMinutes":45,"bookingUrl":"https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A15058937&share=true&pId=1024551"},
  {"audience":"Men","name":"Men's wet cupping","price":"£45","durationMinutes":40,"bookingUrl":"https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A14524918&share=true&pId=1024551"},
  {"audience":"Women","name":"Full spiritual appointment","price":"£80","durationMinutes":90,"bookingUrl":"https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A15623186&share=true&pId=1024551"},
  {"audience":"Men","name":"Full spiritual appointment","price":"£80","durationMinutes":80,"bookingUrl":"https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&oiid=sv%3A15623194&share=true&pId=1024551"}
]
```

Use the complete existing Fresha URL around each shown service ID. Retain `displayCount: "100+"` but remove stale exact source totals from public output.

- [ ] **Step 4: Rewrite the services and shared core copy**

- `/services/` becomes `Cupping & prices`, shows all four service options, and separates clinic policy from medical guidance.
- `/about/` uses cupping-first practitioner roles and the explicit all-backgrounds welcome.
- `/contact/` metadata, visible hours and structured data agree on daily 10:00–19:00; the hours table has a caption and row headers.
- `/privacy/` and `404.html` receive the new shell and correct heading order.
- `scripts/generate-articles.mjs` emits the new navigation, footer, generic `/#book` action, system fonts, CSS/JS version `20260720`, cupping-first blog H1/title and stable `#clinic` references.

- [ ] **Step 5: Regenerate the owned pages and verify GREEN**

Run:

```bash
node scripts/generate-articles.mjs --count=0 --rerender
npm test
npm run build
npm run check:dist
```

Expected: generated blog and non-custom articles use the new shell, all tests pass and no current URL disappears.

- [ ] **Step 6: Commit**

```bash
git add data/business.json services about contact privacy 404.html scripts/generate-articles.mjs blog articles tests/core-content.test.mjs sitemap.xml llms.txt
git commit -m "fix: align booking and core cupping content"
```

### Task 4: Normalise all published routes, schema and answer-engine content

**Files:**
- Create: `areas/index.html`
- Create: `tests/published-content.test.mjs`
- Modify: `scripts/check-site.mjs`
- Modify: `scripts/generate-articles.mjs`
- Modify: `areas/*/index.html`
- Modify: `articles/*/index.html`
- Modify: `data/article-topics.json`
- Modify: `data/article-manifest.json`
- Modify: `sitemap.xml`
- Modify: `llms.txt`
- Modify: `llms-full.txt`

- [ ] **Step 1: Write the failing whole-site publication test**

Build `dist/`, parse every published HTML file and assert:

- one H1, title, meta description, self-canonical and `lang="en-GB"` per indexable page;
- no internal `href` contains `/index.html`;
- no Google Fonts, Tirmidhi 2051, 17/19/21 promotion, hidden boilerplate religious citation, exact stale review split or banned medical-instruction phrase;
- every JSON-LD block parses and contains no empty `Thing` or `Place` name;
- every area page references provider `https://sinceritycupping.co.uk/#clinic`, has one BreadcrumbList, and does not create a second address;
- `/areas/` exists and links to all 15 retained area routes;
- every sitemap URL maps to a built file and every indexable canonical appears once in the sitemap;
- booking URLs containing female service ID 15058937 appear only with women's context, and male ID 14524918 only with men's context.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/published-content.test.mjs`

Expected: FAIL on `/index.html` links, missing areas hub, weak source text, duplicate/anonymous schema and generated/article shell inconsistencies.

- [ ] **Step 3: Add the areas hub and correct area entities**

Create `/areas/index.html` with the approved shell, a direct answer explaining that there is one clinic in Streatham, directions and links to the 15 retained area pages. Area-page titles/H1s lead with `Wet cupping near {area}` or `Cupping near {area}`; body copy makes clear that treatment happens at the Streatham address. Structured data uses `Service`, `areaServed`, `BreadcrumbList` and provider `{"@id":"https://sinceritycupping.co.uk/#clinic"}`.

- [ ] **Step 4: Remove unsafe/duplicated boilerplate and repair article entities**

Update the generator and all guarded/custom article files so each visible answer has a cupping-first first paragraph, visible relevant source block, published/updated date and responsible safety boundary. Remove unrelated repeated citations, empty schema entities and unsupported health instructions. Preserve existing article slugs; a slug containing `hijama` may remain for compatibility while its title/H1 can lead with cupping where natural.

Future article topics must not schedule weak-Sunnah-day or unsourced medical-instruction pages. Rewrite or remove those queued topic records from `data/article-topics.json`.

- [ ] **Step 5: Fix sitemap/LLM accuracy and the checker**

Add `/areas/` to sitemap and LLM catalogues. Preserve genuine article dates. Do not churn `lastmod` on unchanged pages. Extend `scripts/check-site.mjs` to enforce the same route/canonical/JSON-LD/internal-link checks used by the test.

- [ ] **Step 6: Verify GREEN**

Run: `npm test && npm run build && npm run check:dist`

Expected: zero contract/checker errors and all original routes plus `/areas/` present.

- [ ] **Step 7: Commit**

```bash
git add areas articles data scripts/check-site.mjs scripts/generate-articles.mjs sitemap.xml llms.txt llms-full.txt tests/published-content.test.mjs
git commit -m "fix: strengthen local and answer-engine content"
```

### Task 5: Secure the deployment and prove the release

**Files:**
- Create: `tests/deployment-contract.test.mjs`
- Modify: `_headers`
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/seo-articles.yml`
- Modify: `README.md`

- [ ] **Step 1: Write the failing deployment contract**

Assert that `_headers` contains `Content-Security-Policy`, `CDN-Cache-Control`, HSTS, nosniff, Referrer-Policy and Permissions-Policy; both workflows run test/build/check and deploy `dist`, never `.`; and the deploy workflow has a production concurrency group.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/deployment-contract.test.mjs`

Expected: FAIL because the workflows currently deploy the repository root and CSP is absent.

- [ ] **Step 3: Implement the deployment gate**

The deployment job must execute:

```yaml
- run: npm test
- run: npm run build
- run: npm run check:dist
```

and Cloudflare Wrangler must use:

```yaml
command: pages deploy dist --project-name=sinceritycupping --branch=main
```

Use `concurrency: {group: sinceritycupping-production, cancel-in-progress: false}` in both workflows. Add a CSP compatible with self-hosted assets, Google Maps iframe, phone/WhatsApp/Fresha links and the existing contact behaviour. Add short browser revalidation for HTML and immutable caching only for versioned assets.

- [ ] **Step 4: Verify GREEN and run production-like local tests**

Run:

```bash
npm test
npm run build
npm run check:dist
npx --yes http-server dist -p 4173
```

Against `http://127.0.0.1:4173/`, run Lighthouse three times each for mobile and desktop on `/`, `/services/`, `/articles/first-hijama-appointment-streatham/`, `/areas/streatham/`, `/contact/` and `/404.html`. Target 100 in all four categories; do not release below the specification's hard floor. Also verify 390px and desktop layouts, keyboard navigation, menu Escape behaviour and the four Fresha service IDs.

- [ ] **Step 5: Commit**

```bash
git add _headers .github/workflows README.md tests/deployment-contract.test.mjs
git commit -m "ci: verify and deploy the public build"
```

### Task 6: Final review, production deployment and rollback proof

**Files:**
- Review: all changed files
- No new feature files unless a failing verification test requires a fix

- [ ] **Step 1: Run the complete final verification from a clean checkout state**

Run:

```bash
git status --short
npm test
npm run build
npm run check:dist
git diff --check origin/main...HEAD
```

Expected: clean tracked state, all tests/checks pass and no whitespace errors.

- [ ] **Step 2: Obtain spec-compliance and code-quality approval**

Review the full branch against `docs/superpowers/specs/2026-07-20-sincerity-cupping-redesign-design.md`. Fix every Important/Critical finding through a failing regression test before continuing.

- [ ] **Step 3: Push the reviewed branch, fast-forward main and monitor Cloudflare**

```bash
git push -u origin codex/cupping-first-redesign-2026-07-20
git push origin codex/cupping-first-redesign-2026-07-20:main
```

Wait for the GitHub Actions deployment to finish. Do not run a second direct Wrangler deployment while the workflow is active.

- [ ] **Step 4: Verify production directly**

Check all sitemap URLs, plus `/areas/`, return 200 and no internal link is broken. Verify `https://www.sinceritycupping.co.uk/` redirects to the canonical host. Confirm `/package.json`, `/data/business.json`, `/scripts/generate-articles.mjs`, `/.github/workflows/deploy.yml`, `/.wrangler/cache/pages.json` and `/preview/ruqyah/` return 404. Verify booking links contain the correct service IDs and run final production Lighthouse samples.

- [ ] **Step 5: Roll back if a critical production check fails**

The immutable rollback point is `pre-redesign-2026-07-20` at commit `8315e6fa89f79d1801f34fdde2f84deb7045ae58`. Restore it only if a critical route, booking or production deployment check fails:

```bash
git push --force-with-lease origin pre-redesign-2026-07-20:main
```

Then wait for Cloudflare and re-run the production checks before reporting the rollback.

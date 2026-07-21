# Area Page Local Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 15 service-area pages useful, locality-led endpoints for the single Streatham clinic while enforcing a 55% local-copy floor, whole-main similarity below 0.40, exact direct booking routes, and truthful directions.

**Architecture:** Keep editorial locality copy in `data/area-pages.json`, validate it before any write, and render all area routes from the manual generator. A separate contract test measures the committed HTML, mutates generator fixtures to prove rejection paths, and confirms generated output is deterministic.

**Tech Stack:** Node.js ESM, `node:test`, static HTML, JSON, URL/URLSearchParams, the existing manual area renderer.

---

## File map

- Create `tests/area-page-quality.test.mjs`: isolated contracts for locality share, similarity, Maps parameters, exact Fresha routes, navigation state, source dates, strict data rejection, and deterministic committed output.
- Modify `data/area-pages.json`: replace each two-paragraph local block with three reviewed local sections, each containing two non-empty paragraphs.
- Modify `scripts/generate-areas.mjs`: validate the richer data, construct documented directions URLs, render compact booking/contact facts, and set the Areas current-page state only on the hub.
- Regenerate `areas/index.html` and `areas/*/index.html`: committed deterministic output only.
- Modify `data/page-modified.json` and `sitemap.xml`: move only the homepage modification date to `2026-07-21`.

### Task 1: Lock the quality contract with failing tests

**Files:**
- Create: `tests/area-page-quality.test.mjs`

- [ ] **Step 1: Write the generated-page contracts**

Create a Node test file which:

```js
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const areas = JSON.parse(fs.readFileSync(path.join(root, "data", "area-pages.json"), "utf8"));
const business = JSON.parse(fs.readFileSync(path.join(root, "data", "business.json"), "utf8"));
const placeId = "ChIJ6-vLLJQHdkgRPrnWnRsH6_Q";
const destination = "330 Streatham High Rd, London SW16 6HH";

function visibleText(markup) {
  return markup.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&")
    .replace(/&(?:rsquo|#8217|apos|#39);/g, "'").replace(/\s+/g, " ").trim();
}

function words(value) {
  return value.toLowerCase().replace(/[^a-z0-9£]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function shingles(value, size = 5) {
  const tokens = words(value);
  return new Set(tokens.slice(0, Math.max(0, tokens.length - size + 1))
    .map((_, index) => tokens.slice(index, index + size).join(" ")));
}

function jaccard(left, right) {
  const intersection = [...left].filter((value) => right.has(value)).length;
  return intersection / new Set([...left, ...right]).size;
}
```

Add tests that require exactly three marked local sections, local words divided by all main words to be at least `0.55`, and every normalized pair of full-main five-word shingle sets to be below `0.40`. Normalize every reviewed locality name, longest first, before building shingles.

Add a Maps test that finds `Open directions from <name>`, decodes `&amp;`, constructs `new URL(href)`, and asserts:

```js
assert.equal(url.origin, "https://www.google.com");
assert.equal(url.pathname, "/maps/dir/");
assert.equal(url.searchParams.get("api"), "1");
assert.equal(url.searchParams.get("origin"), `${area.name}, London`);
assert.equal(url.searchParams.get("destination"), destination);
assert.equal(url.searchParams.get("destination_place_id"), placeId);
```

Add exact-link tests for `business.femaleBookingUrl` and `business.maleBookingUrl`, with visible labels `Book women’s wet cupping` and `Book men’s wet cupping`. Assert that child pages omit `aria-current` from the `/areas/` main-nav anchor while the hub uses `aria-current="page"`.

Add a generator fixture helper that copies `scripts/generate-areas.mjs`, `data/area-pages.json`, and `data/business.json` into a temporary root. Prove that duplicate/self nearby slugs and a whitespace-only local paragraph each exit non-zero. Run a clean fixture twice and compare every generated area file byte-for-byte across runs and against the committed files.

Finally assert `data/page-modified.json["/"] === "2026-07-21"` and the sitemap root entry has the same `lastmod`.

- [ ] **Step 2: Run only the new file and capture RED**

Run:

```bash
node --test tests/area-page-quality.test.mjs
```

Expected: failures for the one-section local template, local ratio, similarity, old Maps query URL, generic booking route, incorrect child navigation state, permissive nearby validation, and stale homepage date.

### Task 2: Replace thin locality blocks with reviewed structured copy

**Files:**
- Modify: `data/area-pages.json`

- [ ] **Step 1: Change every record to the exact local-section shape**

Keep `slug`, `name`, `heading`, and `nearby`. Replace `localHeading` and `localParagraphs` with:

```json
"localSections": [
  {
    "heading": "Use the street number, not Streatham alone",
    "paragraphs": [
      "Streatham covers more than one named neighbourhood, so the district label is not precise enough to identify the appointment door. Set 330 Streatham High Rd, London SW16 6HH as the destination and confirm that number 330 appears before accepting the map result.",
      "The pin belongs to the clinic’s only treatment address. It should not be interpreted as another Streatham venue, a mobile appointment point or a choice between branches. Every booking made through this page finishes at the same High Road premises."
    ]
  },
  {
    "heading": "Plan from your exact Streatham starting point",
    "paragraphs": [
      "Begin with the street where you will actually set out, not the wider word Streatham. A route selected from one part of the district may be unhelpful from another, while a current map can use the origin you provide.",
      "Review the available road or public-transport choices close to departure and decide which suits your circumstances. The clinic supplies the destination, but it does not prescribe a connection or promise how long changing conditions will make the journey."
    ]
  },
  {
    "heading": "Match the route to the booking before leaving",
    "paragraphs": [
      "Compare the address in your route with the address in the appointment details before setting out. The useful checks are the street number, the SW16 6HH postcode and the pin at the Streatham clinic, rather than the neighbourhood name on its own.",
      "If the booking choice or destination still looks unclear, call or WhatsApp the clinic before travelling. Staff can confirm the fixed address and appointment details; current Maps information remains the source for the route from your particular starting point."
    ]
  }
]
```

For each of the 15 records, preserve only the already-reviewed high-level orientation fact: Streatham spans several named neighbourhoods; Streatham Hill is north; Streatham Common is south; Balham is north-west; Brixton is north; Tooting is west; Clapham is north-west; Norbury is south; Tulse Hill is north-east; West Norwood is east; Herne Hill is north-east; Dulwich is east; Crystal Palace is east and elevated; Mitcham is south-west; Colliers Wood is west.

Each six-paragraph set must total at least 210 normalized words and give three concrete decisions: use the complete address and pin, choose a current route from the exact starting point, and reconcile the booking confirmation with the one Streatham destination before leaving. Vary structure and vocabulary genuinely by locality. Do not introduce a time, distance, parking facility, landmark, transit line/service, branch, mobile visit, clinical outcome, or unverifiable business claim.

- [ ] **Step 2: Validate the JSON syntax**

Run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("data/area-pages.json", "utf8")); console.log("area JSON valid")'
```

Expected: `area JSON valid`.

### Task 3: Harden and simplify the manual renderer

**Files:**
- Modify: `scripts/generate-areas.mjs`

- [ ] **Step 1: Read approved booking routes and build Maps URLs**

Read `data/business.json`, take the exact `femaleBookingUrl` and `maleBookingUrl`, and define:

```js
const destination = "330 Streatham High Rd, London SW16 6HH";
const destinationPlaceId = "ChIJ6-vLLJQHdkgRPrnWnRsH6_Q";

function directionsUrl(areaName) {
  const parameters = new URLSearchParams({api: "1"});
  if (areaName) parameters.set("origin", `${areaName}, London`);
  parameters.set("destination", destination);
  parameters.set("destination_place_id", destinationPlaceId);
  return `https://www.google.com/maps/dir/?${parameters}`;
}

const clinicDirectionsUrl = directionsUrl();
```

Pass every URL through `escapeHtml` when inserting it into an HTML attribute.

- [ ] **Step 2: Reject incomplete editorial records before writing**

Validate all scalar editorial fields with:

```js
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
```

Require exactly three `localSections`, exactly two non-empty paragraphs per section, at least 210 normalized local words in total, exactly three unique nearby slugs, no self-reference, and only known reviewed slugs. Preserve the existing allowlist, safe-slug, contained-output, and symlink checks.

- [ ] **Step 3: Render three local sections and one compact shared endpoint block**

Render every `localSections` entry as its own `<section data-area-local-copy>`. Put the area-specific directions action in the first section with label `Open directions from ${area.name}`.

Replace the repeated facts/care/CTA sections with one compact shared block that contains:

```html
<h2>Book wet cupping at the one Streatham clinic</h2>
<p>Every appointment is at 330 Streatham High Rd, London SW16 6HH. The clinic is open daily, 10:00–19:00.</p>
<a href="https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&amp;oiid=sv%3A15058937&amp;share=true&amp;pId=1024551">Book women’s wet cupping</a>
<a href="https://www.fresha.com/book-now/sincerity-ruqyah-centre-en3ghpfz/services?lid=1080569&amp;oiid=sv%3A14524918&amp;share=true&amp;pId=1024551">Book men’s wet cupping</a>
<a href="tel:+447552540000">Call 07552 540000</a>
<a href="https://wa.me/447552540000">WhatsApp the clinic</a>
```

Retain the exact £45/45-minute women’s and £45/40-minute men’s facts, private same-sex appointments, new single-use cups and blades, welcome for every faith/background, the complementary-care boundary, and the NCCIH link. Keep `/areas/` nearby links, but remove the redundant final CTA section.

- [ ] **Step 4: Fix navigation current state and hub directions**

Give `shell` an `areasCurrent = false` parameter and render:

```js
const areasCurrentAttribute = areasCurrent ? ' aria-current="page"' : "";
const areasLink = `<a href="/areas/"${areasCurrentAttribute}>Areas</a>`;
```

Pass `areasCurrent: true` only from `renderHub`. Use `clinicDirectionsUrl` for shell/footer/hub destination-only links and `directionsUrl(area.name)` only for each locality action.

- [ ] **Step 5: Generate pages and run GREEN**

Run:

```bash
node scripts/generate-areas.mjs
node --test tests/area-page-quality.test.mjs
```

Expected: `Rendered 15 area pages and the area hub.` followed by all new tests passing, with diagnostics showing local ratios of at least `0.550` and maximum normalized whole-main similarity below `0.400`.

### Task 4: Correct dates and verify the complete publication

**Files:**
- Modify: `data/page-modified.json`
- Modify: `sitemap.xml`
- Verify: all owned source/generated files

- [ ] **Step 1: Correct the homepage date only**

Change the homepage entry and root sitemap URL from `2026-07-20` to `2026-07-21`. Do not change unrelated route dates.

- [ ] **Step 2: Run the focused contract again**

Run `node --test tests/area-page-quality.test.mjs`.

Expected: all tests pass.

- [ ] **Step 3: Run publication verification**

Run:

```bash
npm test
npm run check:source
npm run build
npm run check:dist
git diff --check
```

Expected: the full test suite passes, source/dist checks report zero errors, build succeeds, and `git diff --check` prints nothing. If the shared published-content owner has not yet landed its expected Maps/direct-booking assertion update, report that exact external conflict without changing their file.

- [ ] **Step 4: Inspect scope and commit owned files**

Stage only:

```text
tests/area-page-quality.test.mjs
data/area-pages.json
scripts/generate-areas.mjs
areas/index.html
areas/*/index.html
data/page-modified.json
sitemap.xml
```

Commit with `feat: make area pages useful local endpoints`, then verify `git status --short` contains only other agents’ pre-existing files.

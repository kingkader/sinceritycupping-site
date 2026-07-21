# Area page local-quality design

Date: 21 July 2026
Status: Approved

## Goal

Keep the 15 published service-area pages as useful endpoints for one clinic at 330 Streatham High Rd while reducing doorway-page risk. Each page must provide substantial, truthful locality-specific planning copy without invented journey times, distances, parking, landmarks, branches, transit services, or medical and business claims.

## Content model

`data/area-pages.json` remains the reviewed source. Each record will hold a `localSections` array containing exactly three `{ heading, paragraphs }` objects rather than two paragraphs inside an otherwise shared page:

- the existing slug, name, H1, local heading, and three nearby areas;
- an area-specific route-planning introduction;
- a second area-specific planning section;
- a third area-specific destination-check section.

The prose may use stable, high-level orientation already present in the reviewed data, the exact area name, the fixed clinic address, and advice to check a current map. It must not state travel times, distances, parking availability, named landmarks, specific transport lines or services, or a second location.

Each local section will contain exactly two non-empty paragraphs, and the three sections will be wrapped individually with `data-area-local-copy`. The generated main content will keep shared material compact. Shared content may state the fixed clinic address, opening hours, exact wet-cupping prices and durations, the complementary-care boundary, contact methods, and booking routes. It will not be counted as local copy.

## Useful endpoint actions

Each locality page will offer these actions directly:

- women’s wet cupping through the existing approved women’s Fresha route;
- men’s wet cupping through the existing approved men’s Fresha route;
- phone or WhatsApp contact;
- Google Maps directions from the named locality to the one clinic.

The shared booking block stays short and is included in whole-main similarity measurement. It is never counted as locality-specific copy.

## Directions URL

The generator will use Google’s documented universal directions form:

`https://www.google.com/maps/dir/?api=1&origin=<AREA>%2C+London&destination=330+Streatham+High+Rd%2C+London+SW16+6HH&destination_place_id=ChIJ6-vLLJQHdkgRPrnWnRsH6_Q`

The origin is derived from the reviewed locality name. The destination address and place ID are fixed. HTML output will encode query separators as `&amp;`.

## Quality gates

Tests will measure generated pages, not only source data:

- locality-specific marked sections must contain at least 55% of all normalized words inside `<main>`;
- pairwise whole-main five-word-shingle Jaccard similarity, after normalising locality names, must stay below 0.40;
- directions links must use `/maps/dir/`, `api=1`, the exact locality origin, fixed destination, and fixed destination place ID;
- area child pages must not mark the parent `/areas/` link as `aria-current="page"`; the hub keeps its current-page state;
- direct booking links must match the existing women’s and men’s wet-cupping routes;
- the homepage stored and sitemap `lastmod` becomes `2026-07-21` because its indexed area copy and links changed;
- renderer output must remain deterministic and byte-identical to committed area HTML.

## Data and path validation

Before writing, the manual generator will reject:

- records outside the exact 15-slug allowlist;
- missing, non-string, or whitespace-only editorial fields;
- locality sections below the reviewed word floor;
- unknown, repeated, or self-referential nearby slugs;
- unsafe slugs or output paths;
- symbolic-link output destinations.

No package script, workflow, scheduled job, build step, or deploy step will activate the renderer automatically.

## TDD and verification

1. Add focused tests for locality share, whole-main similarity, directions semantics, direct booking routes, child/hub ARIA, strict data rejection, deterministic parity, and homepage dates.
2. Run the focused test and confirm it fails for the current shared template and old map URL.
3. Update the reviewed area data and generator, then rerender committed pages.
4. Run the focused test to green, followed by the full test suite, source check, production build, dist check, diff validation, and a clean worktree check after commit.

## Ownership boundaries

This change will not edit `scripts/check-site.mjs`, `llms.txt`, `llms-full.txt`, article retired-claim patterns, or deployment controls. It will preserve unrelated article and core-page content apart from the already-approved homepage date correction and generated area pages.

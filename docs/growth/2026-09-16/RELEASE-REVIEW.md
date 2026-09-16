# Release review — SCC-2026-09-16-A

## Scope ready for review

Local branch `codex/cupping-growth-redesign-20260916`, based on remote main `6c1b6b9`.

- Shared visual redesign; clearer homepage, prices, about, contact and guides pages.
- Direct women/men booking links, visible £45 price and clear Fresha brand handoff.
- Accessible local-only guide search with reset and empty state.
- Updated asset hashes throughout production HTML and area renderer.
- Five genuine content modification dates; no URL migration or mass indexation change.
- Quarantined unreviewed timing topic, preserving the existing safety test.
- Private content drafts, acquisition plan and proposed Hermes repair. These are excluded from the 71-file public build.

## Verified on 16 September 2026

- Baseline fetched main: 110/111 tests; inherited unsafe topic failure.
- Proposed release: 114/114 tests, zero skipped, zero failed.
- Build: 71 exact public files.
- Built-site checker: 47 HTML pages; metadata, local routes, JSON-LD, links, sitemap and both LLM catalogues pass.
- Desktop browser: price and direct booking choices visible in initial viewport.
- Phone browser at 390 × 844: price and both booking choices visible; fixed Book/Call/WhatsApp bar; menu opens and Escape closes it.
- Guide search in actual browser: “female” returns one guide; unmatched term returns zero; Show all restores 24 and focuses search input. No horizontal overflow observed on that page.
- Visual inspection of mobile services page completed. No completed booking, phone call, WhatsApp message or email was sent.

Automated checks are not a full accessibility conformance audit, live conversion proof or field performance measurement. Live Fresha availability and final booking confirmation remain external checks. No Lighthouse score is claimed.

## Proposed website release after explicit approval

1. Fetch remote; compare main with approved base. If another person changed it, reconcile and repeat affected checks before release.
2. Preserve current production deployment identifier and main SHA. Existing pre-edit source backup: `../reports/2026-09-14-cupping-audit/before-redesign-20260916.tar.gz`.
3. Review the exact branch diff; release through the repository's existing Cloudflare Pages process. Never push the divergent VPS content commit.
4. Verify HTTPS 200 responses, deployed title and asset hashes, all four Fresha destinations, mobile navigation, guide search, contact fallback, robots/sitemap and a true missing-page response. Check deployment logs.
5. If booking navigation or essential pages regress, restore the recorded prior Cloudflare deployment or revert this release commit through the existing pipeline; verify live content again.

## Separate runtime change

Installing the proposed Hermes workflow requires backup of live scheduler and skill, preserving the divergent commit and a controlled draft-only run. It is not included in a website-only approval. No model/provider upgrade or additional spend is authorised by this document.

## Remaining evidence

Authenticated Search Console/GBP, booking attribution, original review provenance and current live service facts need verification before claims of ranking progress or a fully repaired acquisition system. The site is prepared locally; it has not been deployed.

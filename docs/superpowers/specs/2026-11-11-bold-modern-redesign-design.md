# Sincerity Cupping Clinic: "Bold and modern" redesign (design v4)

Date: 11 Nov 2026. Owner decision: Abdul chose look B of three phone mockups ("Bold and modern").

## Goal
A site that looks much better, makes booking impossible to miss, uses real photos, and carries the cupping SEO and AI-search plan (seo-engine/baseline/sinceritycupping.md).

## Look
- Ground: dark forest (#0b211c page, #0f2a23 bands, #163129 cards). One accent, orange #ff7a45, used only for booking actions and small markers.
- Type: Outfit (open licence), self-hosted, one family, bold display sizes. No network fonts.
- Radius scale 10 / 14 / 22px. Cards use borders, not heavy shadows.
- Motion: transform only. Text never fades. Reduced-motion respected.

## Booking actions
- `.btn-solid` is always the booking action (orange). Hero: price card with "Book for women" and "Book for men". Header button, phone action bar, a booking band mid-page and at the end of every page (`.cta-band`, solid orange), and a small booking nudge at the top of every guide (`.prose-cta`).

## Photos (real photographs, not AI)
- back-cupping-glass (hero, services), cupping-cups-box (home, about), glass-cups-drawer (home; Pexels, photographer cottonbro), wet-cupping-therapy (session guide only).
- No photos of the real clinic exist yet. Swap them in when the clinic sends them.

## SEO and AI-search work in this release
- Homepage H1 leads with "Hijama & wet cupping in Streatham". WebSite schema and logo added. BreadcrumbList on all 29 guides.
- Guide titles on /blog/ are links (descriptive anchors). Home lists the three most useful guides.
- llms.txt: practitioners and booking note. llms-full.txt: a "Common questions" section assistants can quote.
- The pages.dev copy of the site sends `X-Robots-Tag: noindex`.
- CSS rewritten from 55 KB to 34 KB.

## Not in this release (need Abdul)
- Real clinic and practitioner photos, practitioner credentials, the "Full body cupping" service name used on Fresha, a checkable Google review figure, visitor tracking.

## Testing
- `npm test` (113), `npm run build`, `npm run check:dist`, local phone and desktop screenshots of home, services, about, contact, blog, a guide, areas, an area page and 404.
- Preview: branch `redesign` deploys to the Cloudflare Pages preview. Live only after Abdul's yes (merge to main).

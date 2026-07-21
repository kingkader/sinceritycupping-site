# Sincerity Cupping Clinic static website

Fast static rebuild for `sinceritycupping.co.uk`.

The content reflects the current published wet cupping / hijama choices for women and men in Streatham.

## What is included

- Indexable static HTML with no WordPress `noindex, nofollow`.
- Local SEO schema for the clinic, wet cupping service, address, geo coordinates, hours and reviews.
- `robots.txt`, `sitemap.xml` and `llms.txt` for SEO, AEO and GEO discovery.
- Manual workflow in `.github/workflows/seo-articles.yml` that verifies reviewed article data rerenders deterministically.
- Dependency-free renderer in `scripts/generate-articles.mjs`; new and bespoke article publishing is disabled pending manual review.

## Local commands

```bash
python3 -m http.server 8080
npm run rerender:articles
npm run check
```

## Launch notes

Use the non-www canonical domain: `https://sinceritycupping.co.uk/`.

Confirm postcode and opening hours before launch. The rebuild currently uses the supplied contact number `07552 540000`, WhatsApp at `https://wa.me/447552540000`, and the public address `330 Streatham High Rd`, `SW16 6HH`.

# Sincerity Cupping Clinic static website

Fast static rebuild for `sinceritycupping.co.uk`.

The content reflects the current published wet cupping / hijama choices for women and men in Streatham.

## What is included

- Indexable static HTML with no WordPress `noindex, nofollow`.
- Local SEO schema for the clinic, wet cupping service, address, geo coordinates, hours and reviews.
- `robots.txt`, `sitemap.xml` and `llms.txt` for SEO, AEO and GEO discovery.
- Manual workflow in `.github/workflows/seo-articles.yml` that tests and builds the committed static catalogue without generating content.
- Automatic article rendering and bespoke publishing are retired.

## Local commands

```bash
python3 -m http.server 8080
npm test
npm run build
npm run check:dist
npm run check
```

## Article changes

New or changed articles require direct static edits to the article HTML, `data/article-manifest.json`, `data/article-topics.json`, `blog/index.html`, `sitemap.xml`, `llms.txt` and `llms-full.txt`. Run the tests and production build, then obtain human content review before committing or publishing.

## Launch notes

Use the non-www canonical domain: `https://sinceritycupping.co.uk/`.

Confirm postcode and opening hours before launch. The rebuild currently uses the supplied contact number `07552 540000`, WhatsApp at `https://wa.me/447552540000`, and the public address `330 Streatham High Rd`, `SW16 6HH`.

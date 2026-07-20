# Sincerity Cupping cupping-first redesign specification

**Status:** Approved for production by Abdul on 20 July 2026 with the instruction to publish the approved local direction to sinceritycupping.co.uk.

## Goal

Replace the current Muslim-first, hijama-heavy presentation with a calm, premium and explicitly inclusive wet-cupping website. Preserve the clinic's useful information and every existing public route while making the booking journey safer, the copy more responsible, and the site substantially faster and easier for search engines and answer engines to understand.

## Release boundary

- Keep the existing vanilla HTML, CSS and JavaScript stack.
- Keep the existing domain, Cloudflare Pages project and all 45 current public URLs reachable.
- Add a proper `/areas/` hub; existing area URLs remain reachable and canonical.
- Do not migrate the CMS, booking platform or DNS in this release.
- Do not invent practitioner credentials, qualifications, client outcomes, clinic photographs or review counts.
- Do not publish medical advice, treatment promises or weak religious narrations.
- Production is deployed only from a clean `dist/` directory after automated and manual verification.

## Audited source of truth

- Clinic: Sincerity Cupping Clinic.
- Address: 330 Streatham High Rd, London SW16 6HH.
- Phone and WhatsApp: 07552 540000 / +44 7552 540000.
- Published opening hours: daily, 10:00–19:00. Fresha currently agrees; stale third-party citations must be corrected separately.
- Standard women's wet cupping: £45, 45 minutes, female service ID `15058937`.
- Standard men's wet cupping: £45, 40 minutes, male service ID `14524918`.
- Full spiritual women's appointment: £80, 90 minutes, service ID `15623186`.
- Full spiritual men's appointment: £80, 80 minutes, service ID `15623194`.
- Public review statement: use the durable wording `100+ public reviews`; do not hard-code exact per-platform totals in visible copy or structured data.
- Practitioners carried forward from the approved source: Sister Aisha Mejri for women and Brother Abu Layla for men. No new credentials are claimed.

## Brand and visual direction

The approved direction is a “calm clinical sanctuary” without presenting the clinic as a medical provider.

- Warm cream page surface, deep forest-green text and controls, muted sage supporting surfaces, and one restrained warm-gold detail colour.
- Editorial serif display type paired with a clean system sans-serif. Use local system fonts so no render-blocking third-party font request is required.
- Large left-aligned headings, compact small labels, generous whitespace and asymmetric content/media sections.
- Fine borders and tinted shadows; avoid generic equal-card grids, bright gradients, excessive rounded pills and multiple accent colours.
- Use the strongest existing cupping image carefully. Do not fabricate a clinic interior or practitioner portrait. Preserve obvious replacement slots for genuine photography later.
- Motion is limited to subtle opacity/transform reveals and disabled under `prefers-reduced-motion`.
- All interactive controls need visible hover, active and keyboard focus states.

## Terminology and voice

1. Lead with `wet cupping` or `cupping` in navigation, titles, headings and calls to action.
2. Use `also known as hijama` once on the homepage and naturally where the Islamic term is required for search or historical context.
3. Explicitly welcome women and men of every faith, ethnicity and background.
4. Keep same-sex practitioner information because it is a privacy and comfort feature, not a religious gate.
5. Use short, specific sentences. Avoid “clinical standard”, “healing”, medical outcomes and vague promotional language.
6. Frame cupping as complementary care, not medical diagnosis or treatment.

Approved homepage message:

- Eyebrow: `Wet cupping clinic · Streatham SW16`
- H1: `Private, professional cupping in South London`
- Intro: `Wet cupping, also known as hijama, for women and men of every faith and background. Same-sex practitioners, single-use equipment, a proper consultation and written aftercare.`
- Welcome line: `Everyone is welcome. Your privacy, comfort and dignity come first.`

## Homepage structure

1. Compact utility bar with address, verified daily hours, phone, WhatsApp and directions.
2. Clear navigation: Cupping & prices, About, Areas, Guides and Contact.
3. Split hero with the approved message, existing cupping photograph and three actions: Book for women, Book for men and Ask on WhatsApp.
4. Fact strip: From £45, 40+ combined years, 100+ public reviews and open daily 10:00–19:00. Claims receive durable source links or conservative wording.
5. Booking selector with explicit women's and men's routes before Fresha opens. Show practitioner, starting price and verified duration. Never send a generic Book control directly to a male service.
6. Trust section: single-use equipment, same-sex appointments, consultation plus written aftercare, and a visible complementary-care boundary.
7. Direct-answer section with `What is wet cupping?` and `Is the clinic only for Muslims?` answers.
8. Four-step appointment explanation.
9. Practitioner section without fake portraits or unverified qualifications.
10. Local directions and `/areas/` hub.
11. Curated guide links.
12. Compact call-to-action and footer with address, contact details, hours, privacy and accessibility paths.

## Core pages

- `/services/`: rename and position as `Cupping & prices`; show the four current Fresha options with exact price and duration. Replace medical-suitability advice with clinic policy plus referral to a qualified healthcare professional for medical questions. Keep clear process, hygiene and aftercare explanations.
- `/about/`: use cupping-first practitioner titles, explain the clinic's standards and welcome all communities. Do not add qualifications that cannot be verified.
- `/contact/`: correct stale metadata, expose directions, phone, WhatsApp and daily hours consistently, and retain a usable enquiry method.
- `/blog/`: rename to Cupping guides, use cupping-first titles and descriptions, and retain the existing catalogue.
- `/areas/`: add a real service-area hub. Existing area pages reference the single Streatham clinic rather than implying branches.
- `/privacy/` and `/404.html`: apply the same shell, navigation and accessibility treatment.

## Booking behaviour

- Header and mobile generic booking controls go to the on-page booking selector, not directly to Fresha.
- Women's and men's standard routes use the correct filtered Fresha service links.
- The services page also shows the full spiritual options without confusing them with the standard wet-cupping duration.
- External booking links state the destination and open normally; no popup or embedded booking widget is required.
- Call and WhatsApp remain available as secondary actions.

## Content safety and religious sourcing

- Remove the 17th/19th/21st “Sunnah days” promotion and all weekday preferences based on Jami at-Tirmidhi 2051, which the cited source grades Da'if.
- If Prophetic provenance is mentioned, use a genuinely Sahih general cupping report such as Sahih al-Bukhari 5696 without turning it into a medical claim.
- Remove or rewrite unsourced health instructions about treatment frequency, driving, showering, exercise, food, recovery timelines, pregnancy/postpartum timing, diabetes, blood-thinner rules and disease suitability.
- Operational clinic policies may be stated as clinic policy. Medical questions must be referred to an appropriately qualified healthcare professional.
- Visible safety copy must acknowledge that cupping can cause adverse effects and link to an authoritative source such as NCCIH.
- Article sources must be visible and relevant to the claim; do not repeat hidden boilerplate citations unrelated to the page.

## Search, AEO, GEO and local SEO

There is no official universal `100` score for AEO, GEO or local SEO. Release readiness is measured with explicit pass/fail checks.

- Cupping-first unique title, meta description and H1 on every core and area template.
- One self-canonical, indexable URL per page and no internal `/index.html` redirect hops.
- Direct 40–60-word answers after important question headings.
- Crawlable static HTML; no client-rendered core copy.
- One stable clinic entity ID: `https://sinceritycupping.co.uk/#clinic`.
- Area pages use `Service`, `areaServed`, `BreadcrumbList` and the clinic provider `@id`; they do not create area-specific addresses or geocoordinates.
- Home/contact use truthful `HealthAndBeautyBusiness`; remove stale aggregate-rating counts.
- Article pages use consistent Article, Person, Organization and Breadcrumb entities with visible author/reviewer and genuine dates.
- `robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt` must accurately match the released pages.
- Sitemap `lastmod` changes only when page content changes.
- Keep major search and AI-search crawlers allowed; do not imply that crawler access guarantees citations or rankings.
- NAP and hours must match visible copy, metadata and structured data.

## Performance and accessibility

- Target Lighthouse 100 for Performance, Accessibility, Best Practices and SEO on representative mobile and desktop pages.
- Hard release floor: three production-like runs at Performance >=95, LCP <2.5 seconds, CLS <0.1 and total blocking time <200ms. Report exact results rather than rounding or hiding variation.
- Remove Google Fonts and use system font stacks.
- Use responsive AVIF/WebP images with `srcset`, `sizes`, explicit width/height, lazy loading below the fold and high priority only for the hero image.
- Keep JavaScript optional and below the current lightweight budget; core navigation/content must work without it.
- Fix colour contrast, heading order, skip links, focus indicators, accessible navigation toggles and touch target sizes.
- Respect `prefers-reduced-motion`.

## Build, security and deployment

- Add a deterministic build that copies only public pages/assets and platform files into `dist/`.
- Exclude source data, scripts, package files, README, payloads, workflows and previews from the deployed root.
- Extend automated checks to cover sitemap status, canonicals, internal links, banned weak-source/medical claims, booking-route correctness, heading order, image dimensions, JSON-LD validity and public build contents.
- Update Cloudflare Pages deployment to validate, build and deploy `dist/` only.
- Add a tested Content-Security-Policy and appropriate caching headers without breaking maps, contact actions or local assets.
- Keep the immutable Git tag `pre-redesign-2026-07-20` as the rollback point.

## Acceptance and rollback

Before production:

- Automated checks pass with zero errors.
- All current public paths return either 200 at the same path or an intentional, documented redirect; no route is silently lost.
- Women's and men's booking controls resolve to their correct service IDs.
- No Tirmidhi 2051 / 17th–19th–21st promotion remains in the public build.
- No exact stale review breakdown remains.
- Homepage and representative core, article, area, contact and 404 pages pass desktop and mobile visual checks.
- Production is deployed, the Cloudflare workflow completes, and live 200/redirect/header/booking checks pass.
- If any critical route, booking link or production check fails, immediately redeploy/tag-reset to `pre-redesign-2026-07-20` and verify the previous site is restored.

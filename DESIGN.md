---
name: Sincerity Cupping Clinic
description: The clinic's appointment card. Mineral ground, white card paper, green-black ink, one teal accent for the act of booking.
colors:
  ground: "#e7eeec"
  ground-2: "#dbe6e3"
  paper: "#fbfcfb"
  ink: "#10201d"
  ink-2: "#22332f"
  muted: "#475752"
  control: "#6b766f"
  rule: "#cbd8d4"
  rule-strong: "#a3b5b0"
  teal: "#0e5b57"
  teal-hover: "#127069"
  teal-press: "#0a4744"
  teal-ink: "#f2fbfa"
  teal-tint: "#e2f0ed"
  open: "#2c7a4f"
  night: "#10201d"
  night-2: "#1a2b27"
  night-text: "#d7dfda"
  night-muted: "#a6b3ac"
typography:
  display:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5.4vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "clamp(1.85rem, 3.3vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Schibsted Grotesk, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 500
    lineHeight: 1.3
  figure:
    fontFamily: "Red Hat Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "1.6rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "\"tnum\" 1"
  figure-small:
    fontFamily: "Red Hat Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  band: "24px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  slip-row: "1.2rem 1.35rem"
  card-head: "1rem 1.15rem"
  section: "clamp(3.5rem, 7vw, 6rem)"
  gutter: "clamp(1.25rem, 4.5vw, 3rem)"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.teal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.4rem"
    height: "54px"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
    textColor: "{colors.teal-ink}"
  button-primary-active:
    backgroundColor: "{colors.teal-press}"
    textColor: "{colors.teal-ink}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.4rem"
    height: "54px"
  button-small:
    rounded: "{rounded.pill}"
    padding: "0.55rem 1.1rem"
    height: "44px"
  appointment-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  appointment-choice:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "12px"
    padding: "0.75rem 0.8rem"
  appointment-choice-selected:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.teal-ink}"
  appointment-bar:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.teal-ink}"
    rounded: "0"
    height: "60px"
  week-day-today:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.night-text}"
    rounded: "8px"
  slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.slip-row}"
  row-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "44px"
  row-link-hover:
    backgroundColor: "{colors.teal-tint}"
    textColor: "{colors.teal}"
  pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.45rem 1rem"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.85rem 1rem"
    height: "52px"
  nav-link:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.8rem"
    height: "44px"
  nav-link-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  cta-band:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.band}"
    padding: "clamp(1.8rem, 4.5vw, 3rem)"
---

# Design System: Sincerity Cupping Clinic

## Overview

**Creative North Star: "The Appointment Card"**

The site is the clinic's appointment card, not a brochure. The homepage opens on a working booking slip: treatment and price, practitioner choice, the week's opening hours, and one booking bar. Every page after it keeps that idea. Content sits on white card paper laid over a cool mineral ground. Lists become rows on one slip, split by hairline rules. They are not grids of separate tiles.

The world is calm and clinical-premium, never spa-pastel and never religious decoration. Colour stays almost silent: green-black ink on bone and white. One teal, taken from a cupping case, appears only where the visitor acts: the booking buttons, the chosen practitioner, focus rings, link hovers. Every figure that answers "when, how long, how much" is set in one tabular mono. The visitor reads it like the printed card a front desk hands you.

Density is moderate. Phones come first, because most visitors arrive from Maps on a phone. On a 390 x 844 screen the whole appointment card, including its teal booking bar, sits in the first viewport.

**Key Characteristics:**
- Mineral ground, white paper slips, hairline rows.
- One teal accent, used only for actions and the selected choice.
- Schibsted Grotesk for words. Red Hat Mono for every time, price, duration and year count.
- Soft, low, cool-green shadows that lift slips off the ground. No hard edges, no glows.
- Motion after Emil Kowalski: fast custom ease-out, small press scale, hover only on fine pointers, reduced motion honoured.

## Colors

A near-monochrome cool mineral palette, with one deep teal held back for the act of booking.

### Primary
- **Cupping-Case Teal** (teal): primary buttons, the appointment card's booking bar, the selected practitioner choice, focus outlines, text selection, link hover colour and the underline colour on in-prose and CTA links. Hover deepens to **Lit Teal** (teal-hover) and press drops to **Pressed Teal** (teal-press). Text on teal is **Teal Paper** (teal-ink). **Teal Wash** (teal-tint) is the hover fill on row links only.

### Tertiary
- **Open Green** (open): only the small dot before "Open now" on the appointment card. It is a status light, not a brand colour.

### Neutral
- **Mineral Bone** (ground): the page ground, the sticky header (at 88% with blur) and the hero.
- **Shaded Bone** (ground-2): alternate section bands, nav hover fill and image placeholders.
- **Card Paper** (paper): every slip, card, input, FAQ item and the white fact strip.
- **Green-Black Ink** (ink): headings, body text and the "today" cell in the week strip.
- **Soft Ink** (ink-2): secondary body text inside answers, notes and FAQ bodies.
- **Lichen Grey** (muted): ledes, captions, row numbers, metadata. It meets AA contrast on paper and on ground.
- **Control Grey** (control): input and radio borders, and the "opens later" status dot.
- **Hairline** (rule): the 1px row dividers inside slips, section borders and inset outlines.
- **Strong Hairline** (rule-strong): outline-button borders, link underlines and the FAQ toggle ring.
- **Night** (night, night-2, night-text, night-muted, plus a 16% night-text rule): the utility bar, the single booking band per page and the footer.

### Named Rules
**The Teal-Means-Act Rule.** Teal appears only on something you press, on the choice you have made, or on focus. Never use it for headings, decoration, backgrounds, icons or section fills.

**The One Dark Block Rule.** Night is for chrome (utility bar, footer) and for one booking band per page. Content sections never go dark.

## Typography

**Display Font:** Schibsted Grotesk (variable 400–900, self-hosted; fallback Helvetica Neue, Arial, system-ui)
**Body Font:** Schibsted Grotesk
**Label/Mono Font:** Red Hat Mono (variable 300–700, self-hosted; fallback ui-monospace, SFMono-Regular, Menlo)

**Character:** A firm, newsy grotesk with tight negative tracking at large sizes, paired with a soft-cornered mono that makes every number feel printed on a card.

### Hierarchy
- **Display** (600, clamp 2.6–4.5rem, 1.0, -0.035em): page H1. On the homepage it is held to 14ch and sizes to clamp(2.3rem, 10.6vw, 2.75rem) under 460px. A subline inside the H1 drops to 0.4em, weight 500, muted.
- **Headline** (600, clamp 1.85–2.75rem, 1.06, -0.03em): section H2s. Answer-block H2s step down to clamp(1.4rem, 2.2vw, 1.8rem).
- **Title** (600, 1.25rem, 1.22): H3 on cards and rows. Booking-slip names grow to clamp(1.55rem, 2.6vw, 2rem).
- **Body** (400, 1.0625rem, 1.6; 1rem under 460px): paragraphs capped at 66ch. Long-form prose is 1.1rem / 1.72 in a 44rem column.
- **Label** (500, ~0.82–0.88rem, sentence case, no tracking): legends, captions, list metadata, FAQ group titles.
- **Figure** (Red Hat Mono 500, tabular, -0.01 to -0.04em): prices (1.6rem in the card, 2.1rem on booking slips), durations, hours, practitioner years, dates, review ratings and step numbers.

### Named Rules
**The Mono-For-Figures Rule.** Every time, price, duration, opening hour, year count and date is set in Red Hat Mono with tabular numerals. Words never are.

**The Heading-Speaks-For-Itself Rule.** No small label, kicker or eyebrow line above a heading. The heading carries the section. Labels sit inside a slip as legends for a control, never as a heading prefix.

## Layout

A single 1200px container with fluid gutters (clamp(1.25rem, 4.5vw, 3rem); 1.1rem under 700px). Vertical rhythm comes from section padding (clamp(3.5rem, 7vw, 6rem); 3.2rem on small phones). Spacing inside components works on a 4px module.

- **Homepage hero:** a 7fr / 5fr grid. Copy, a welcome line and a photograph sit on the left. The appointment card sits on the right and is sticky at 92px. At 980px and below it stacks copy, card, welcome, photo, and the card stretches full-width at 800px.
- **Story sections:** a 5fr / 7fr split, with intro copy on the left and a slip on the right. It collapses to one column at 980px.
- **Two-column slips** (booking, answers, reviews, direction facts) keep their columns inside one paper surface, split by hairlines. They collapse to one column at 800px or 700px.
- **Fact strip:** four facts across, split by vertical hairlines. Two across at 800px.
- **Breakpoints:** 1100px (tighter nav), 980px (stack layouts), 800px (phone chrome: menu toggle, sticky bottom action bar), 700px, 460px.
- **Phone action bar:** a fixed frosted-paper bar with pill buttons. It tucks away while the appointment card's own booking bar is on screen.

## Elevation & Depth

A light hybrid. Slips are lifted off the mineral ground by one soft, cool-tinted shadow. Inside a slip, depth is flat: hairline rules separate rows. Quieter containers (FAQ closed, notes, contact help) use a 1px inset hairline instead of a shadow. The sticky header and phone bar use frosted translucency (saturate 1.4, blur 12px) rather than shadow.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 1px rgba(18,26,23,0.04), 0 14px 34px -16px rgba(18,26,23,0.24)`): every slip and card at rest, and an open FAQ item.
- **Lift** (`box-shadow: 0 1px 2px rgba(18,26,23,0.06), 0 20px 40px -18px rgba(18,26,23,0.3)`): card hover on fine pointers (with a 2px rise), and the opened phone menu.
- **Inset hairline** (`box-shadow: inset 0 0 0 1px #cbd8d4`): closed FAQ items, the brand mark, the current nav pill, quiet notes.
- **Focus halo on fields** (`box-shadow: 0 0 0 4px rgba(106,34,69,0.16)`): text inputs on focus, with a teal border.

### Named Rules
**The Slip-Not-Tiles Rule.** A list of like things is one paper surface with hairline rows, not a grid of separate shadowed tiles. Only an open-ended set of articles may use separate cards.

## Shapes

Gentle, consistent rounding. Slips and the appointment card use 20px. Buttons and FAQ items use 14px. Inputs use 10px. Choices inside the card use 12px. The week cells use 8px, and the dark booking band uses 24px (20px on phones). Anything small and secondary is a full pill: small buttons, nav links, row links, pills and phone-bar buttons. Borders are always 1px hairlines (1.5px for controls). The booking bar is square-cornered because the card clips it. Photographs sit in 20px rounded frames with object-fit cover.

## Components

### Buttons
Firm and quiet. Teal is the only filled colour.
- **Shape:** gently rounded (14px), 54px tall. The small variant is a 44px pill.
- **Primary:** teal fill with teal-paper text, 600 weight, and an arrow icon that slides 3px on hover.
- **Hover / Active:** hover deepens to teal-hover, but only under `(hover: hover) and (pointer: fine)`. Press scales to 0.97 and fills teal-press.
- **Outline:** transparent with a strong-hairline border. On hover the border goes ink and the fill goes paper.
- **On night:** a ghost button with a 40% night-text border. The booking action stays teal.

### The Appointment Card (signature)
A paper slip (20px, card shadow) with stacked rows split by hairlines:
1. **Head row:** treatment name, a mono duration in muted grey, and a mono price on the right.
2. **Practitioner choice:** a fieldset with two radio cards side by side, each showing name, who it is for, and mono years. The selected card fills teal with teal-paper text. The selection plays a spring scale (0.96 to 1, 360ms, `cubic-bezier(0.34, 1.4, 0.64, 1)`), and the custom radio dot thickens to a 5px ring. Choosing also swaps the duration text.
3. **Week strip:** seven cells (day initial plus mono hours). Today is marked in solid ink, set from London time. An open-status line below has a green or grey dot.
4. **Booking bar:** a full-width, 60px teal bar with label and arrow at opposite ends. The two practitioners' booking links share one grid cell. The unchosen one crossfades out with opacity, a 2px blur and a 4px drop (220ms ease-out). It also goes `visibility: hidden`, so only one link is ever focusable. Without `:has()`, both show side by side.
5. **Note row:** muted small text with a teal-underlined WhatsApp link.

### Slips (lists as rows)
Trust points, visit steps, commitments, practitioners and guides are each one paper slip with 1.2rem x 1.35rem rows split by hairlines. Practitioner and guide rows end in a pill row link. Its hairline border turns teal with a teal-wash fill on hover. Booking slips put a large mono price under the name and a full-width primary button at the bottom.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** paper on ground or shaded-bone bands.
- **Shadow Strategy:** card at rest, lift on fine-pointer hover (see Elevation).
- **Internal Padding:** 1.45rem for cards. Slips and answers use clamp(1.4rem, 3vw, 2rem).

### Inputs / Fields
- **Style:** paper fill, 1.5px control-grey border, 10px radius (14px for guide search), 52–54px tall.
- **Focus:** teal border plus a 4px teal halo at 16%.
- **Error:** a red border on invalid input that has content.

### Chips (pills)
Paper pills with a hairline border, 44px tall. On hover the border goes ink. Press scales to 0.97.

### Navigation
Pill links in soft ink, 500 weight. Hover fills shaded bone. The current page shows as a paper pill with an inset hairline. The header is sticky and frosted, and gains a hairline bottom border once scrolled. At 800px a "Menu" pill opens a paper panel with a lift shadow, and Escape closes it. A night utility bar sits above the header. The footer is night with white headings.

### FAQ
Paper items with an inset hairline that switch to the card shadow when open. The summary is 56px tall, with a circular ring toggle that rotates 45 degrees on open (240ms ease-out).

### Motion
- **Easing:** ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for movement. Plain `ease` (160–240ms) is used only for colour and border changes. In-out `cubic-bezier(0.77, 0, 0.175, 1)` is defined but held in reserve.
- **Press:** buttons, pills, row links and the menu toggle scale to 0.97 on `:active`.
- **Hover:** every hover effect is gated to `(hover: hover) and (pointer: fine)`.
- **Spring:** used only on the practitioner pick.
- **Blur crossfade:** used only on the booking bar swap.
- **Reveal:** sections rise 12px over 600ms ease-out. Text never fades in from transparent, and everything is forced visible after 2.5s.
- **Reduced motion:** honoured. Smooth scroll is off, reveals are static, and every transition and animation is cut to 0.01ms.

### Imagery
All photographs are pre-existing stock photographs already in the repo. None are AI-generated: back-cupping-glass, cupping-cups-box, glass-cups-drawer and wet-cupping-therapy, served as AVIF/WebP/JPEG at several widths. glass-cups-drawer is from Pexels (photographer cottonbro). No photographs of the real clinic or practitioners exist yet. None may be faked, generated or staged to look like the clinic until real ones are supplied.

## Do's and Don'ts

### Do:
- **Do** keep teal (#0e5b57) for actions, the selected choice and focus only.
- **Do** set every time, price, duration, hour, year count and date in Red Hat Mono with tabular numerals.
- **Do** build lists as one paper slip with 1px hairline rows (#cbd8d4).
- **Do** gate every hover effect behind `(hover: hover) and (pointer: fine)`, and give pressables a 0.97 press scale.
- **Do** use the ease-out curve `cubic-bezier(0.23, 1, 0.32, 1)` for movement, and honour `prefers-reduced-motion`.
- **Do** keep touch targets at least 44px tall (48–60px for booking actions).
- **Do** use only real photographs from the repo, credited where the source requires it.

### Don't:
- **Don't** put small labels, kickers or eyebrow lines above headings.
- **Don't** number things that are not a sequence. Numerals like 01–04 belong only to ordered steps, such as the four stages of a visit.
- **Don't** use teal for headings, backgrounds, decoration or section fills.
- **Don't** split a list of like items into separately shadowed tiles.
- **Don't** add a second dark content block to a page. One night booking band is the limit.
- **Don't** fade text in from transparent, and don't animate on hover for touch pointers.
- **Don't** use AI-generated or staged images presented as the clinic, its rooms or its practitioners.

# Proposed replacement for scc-publishing — draft-only

Status: prepared for approval; not installed. Owner: Abdul. Operator: Astra. Writer: Hermes.

## Job prompt

Prepare one useful cupping content improvement for Abdul's next review batch. Work in a dedicated clean draft checkout based on verified remote main. Never use the divergent production checkout. Never push main, deploy, change published HTML, send a message to a third party, change a model/provider or install software.

Read repository instructions, business facts, catalogue and existing article before writing. Prefer improving an existing article when the same search intent is already covered. Use the approved editorial queue; do not generate location-swapped articles. If required evidence is missing, record the exact missing fact and stop that claim.

Write under `docs/growth/content-drafts/<date>/<slug>/`: draft.md, sources.md, changes.md and result.json. Record sources with checked date, existing route, proposed intent, genuinely new information, and claims requiring Abdul's review. Do not invent qualifications, reviews, clinic photos, medical benefit claims, insurance, journey times or religious references. Religious content requires Abdul's review. Do not give personalised medical advice.

Do not change the article manifest, topic completion state, sitemap or publication dates during drafting. Do not use retired article generators. Before reporting success, verify that all four output files exist and contain the expected draft. Report `draft_ready`, `blocked` or `failed` with paths and evidence. Never report `published` from a draft, topic update, payload file, commit message or successful model response.

## Operator installation procedure after approval

1. Back up the actual host cron JSON and skill, preserve `d846812` as a Git bundle, and record current remote main and scheduler status. Pause the existing direct publisher while replacing its instructions; do not create a competing job.
2. Confirm the existing subscription-backed model configuration and actual cost before any model pinning. Do not silently fall back to a paid provider. Resolve model drift using the scheduler's supported settings, after inspecting its current schema.
3. Replace the skill and prompt with the reviewed draft-only instructions. Keep the existing schedule unless Abdul approves a change. It is currently Monday/Wednesday/Friday 06:00 UTC, not Saudi or UK wall time.
4. Run once under the correct account and data directory. Verify the draft, source notes and status file directly; verify no public HTML/manifest changed and no main push occurred. Record duration, model, cost and failure reason if any.
5. Only enable scheduled drafts after the controlled run passes. Test one failure path: missing required evidence must return blocked, never a fake publication success.
6. Add each exact draft to the versioned two-calendar-month approval batch. Approved content still needs human implementation, tests, preview and an authorised release.

## Proof of a later publication

A successful release requires reviewed content diff, article HTML, accurate catalogue/sitemap/LLM entries and deployment allowlist changes where needed, passing tests, approved commit SHA, deployed response and expected live content. Record each separately. A green scheduler status alone is insufficient.

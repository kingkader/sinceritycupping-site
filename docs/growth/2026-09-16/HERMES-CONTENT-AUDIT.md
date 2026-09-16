# Hermes content audit — 16 September 2026

## Answer

Hermes was attempting the cupping publishing job. The evidence does **not** support regular successful publication of new articles. The current public-source catalogue contains 24 articles; its latest publication date is 15 July. Later commits labelled “Publish” do not prove a new HTML article was published.

## Direct evidence

Read directly over SSH on 16 September; no agent status was accepted as proof.

- Host scheduler: `/root/.hermes/cron/jobs.json`. Active job `65817ddaa046`, named `scc-publish`, scheduled Monday/Wednesday/Friday at 06:00 UTC. It is outside the Axonis container's own job list.
- Its 14 September output (`/root/.hermes/cron/output/65817ddaa046/2026-09-14_06-00-09.md`) reports `drift_skip`: stored model gpt-5.5 differs from the current gpt-6-astra. The run stopped before generating content.
- The 10 August output says publishing passed. Remote commit `4a912d6` changed only `data/article-payload.json`, not article HTML. The female-practitioner article already existed.
- The 28 August output reports a 600-second subagent timeout and no confirmed publication.
- Host checkout `/root/repos/sinceritycupping-site` has clean working tree at local commit `d846812`, “Publish: Hijama aftercare in London”. Its entire change is to the manifest: 8 insertions and 168 deletions. It has not reached inspected remote main `6c1b6b9`. Do not push or merge this commit.
- The 11 September output says source JSON files were missing. Both files exist at the expected host path on 16 September. Treat the earlier message as an unresolved execution-context failure, not current proof of missing files.
- Legacy job `87213a337a0b` is paused and points at an obsolete checkout. It is not the active publisher.
- Current host publishing skill `/root/.hermes/skills/scc-publishing/SKILL.md` contradicts the repository: it demands unsupported service durations and practitioner experience, and refers to a retired article renderer. It also instructs direct pushes to main.
- Baseline remote-main test result: 110/111. An unreviewed religious timing topic broke an existing content-safety test. Preserved separately in `quarantined-topic.json`; removed from the active topic list in this proposed release. Safety test remains intact.

## Prepared repair, not yet installed

Use `HERMES-DRAFT-WORKFLOW.md` as the replacement specification. Preserve the scheduler, old skill, logs and divergent host commit first. Replace direct publishing with private review drafts and explicit output verification. Do not resume by merely changing the model snapshot: that would expose the unsafe publishing instructions again.

No production job, model, provider, schedule or spend setting has been changed in this work. A controlled draft run and its cost must be verified after approval before describing the pipeline as fixed.

## Correction to earlier audit

The earlier 72/100 audit score was not measured and must not be used as a baseline. The earlier clean test claim applied to an older local branch. This audit uses fetched remote main and distinguishes output text, source commits and actual deployment.

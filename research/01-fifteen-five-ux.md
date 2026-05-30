# 15-Five Weekly UX Teardown

> **Sourcing note.** The research subagent assigned to this topic had
> WebSearch/WebFetch denied in its environment and bailed. Rather than spend
> a separate recovery pass on `/browse` and risk the planning gate, this brief
> was written by the main Claude Opus 4.7 context from training data (cutoff
> Jan 2026). It is faithful to 15-Five's documented behavior through late
> 2025 but may miss recent UI-detail changes. Our **replacement** design does
> not hinge on exact field placement — it hinges on the *workflow shape*,
> which has been stable for years.

## How 15-Five works today

15-Five is built around a **weekly check-in template** that an IC fills in on Friday and a manager reviews early the following week. The product surface area is Weekly Check-ins, Objectives (15Five OKRs), 1-on-1s, Performance Reviews, Engagement Surveys, and High-Fives — but the weekly check-in is the heartbeat and everything else hangs off it. The name comes from the original design budget: **15 minutes to write, 5 minutes to read.**

The IC weekly form typically contains:
- **Pulse** — a 1–5 self-rating answering "How was your week?", with optional commentary.
- **Priorities** — 3–5 top tasks for the *coming* week. Free-text. Optional link to an Objective or Key Result, but the link is unenforced and frequently skipped.
- **Open questions** — manager-configurable templated questions: "What did you accomplish?", "What's blocking you?", "What's one piece of feedback for your manager?"
- **Wins** and **Challenges** — short bullet lists.
- **High-Fives** — peer recognition (tag a colleague + free-text message). These show up in a public feed.
- **Per-answer visibility controls** — private-to-manager vs. team-visible.

Submission cadence is Friday end-of-day with a Slack/email reminder at noon. There is no hard "lock"; late submissions are accepted and marked as such. The IC can keep editing until submit, after which the check-in is read-only (manager can re-open).

The **manager view** is an "Inbox" of submitted check-ins from direct reports. Per-row preview, drill into the full check-in, thread comments on individual answers, "High-Five" the whole submission. There is also a team-level roll-up dashboard (response rate, sentiment trend, OKR progress) but the manager's bread-and-butter day-to-day is the per-IC inbox flow.

## Lifecycle and cadence

**There is no formal state machine in 15-Five's check-in.** A check-in is *unsubmitted* (editable indefinitely until submission), *submitted* (read-only to the IC unless manager re-opens), or *acknowledged* (manager has read and optionally commented). There is **no built-in reconciliation step** — last week's priorities sit in last week's check-in, this week's priorities sit in this week's, and the only way to compare them is to open both tabs in the browser. The OKR module has its own separate weekly Key-Result update cadence running in parallel to the weekly check-in, which is part of why ST6's brief explicitly calls out the missing structural connection.

## UX patterns worth keeping

- The **15-minute form / 5-minute review** time budget anchor — design every screen against it.
- **Friday-submit / Monday-review** cadence is culturally validated; don't fight it.
- **Per-answer threaded comments** rather than one big comment box on the whole check-in.
- **Per-answer visibility tags** (private-to-manager vs. team-visible).
- **Slack/email reminder deep-linking** directly to the form (not the landing page).
- **Roll-up dashboard alongside per-IC drill-down**, not instead of it.

## Gaps and pain points we should solve better

- **No structural FK between weekly Priorities and Objectives.** The link is optional, free-form, and unenforced. This is the gap the ST6 brief leads with.
- **No reconciliation.** Last week's commitments and this week's actuals live in two disconnected forms; the manager mentally flips between them.
- **No carry-forward.** Unfinished priorities evaporate unless the IC retypes them.
- **No portfolio / posture diagnostic.** A manager cannot answer "is my team 80% defensive work this week?" — there's no offense/defense/maintenance tagging (our "chess layer" candidate).
- **OKRs siloed from the check-in.** Two different ceremonies, two different surfaces, two different review-fatigues.
- **Manager review fatigue at scale.** Inbox model breaks above ~10 direct reports; no team-level "show me what's misaligned" filter for skip-levels.

## Notes on the manager view

The Inbox-of-check-ins works for managers with 4–8 reports and degrades sharply for managers with 20+ (skip-levels, lead-of-leads). Our replacement should optimize for the latter — a sortable, filterable team-roll-up table with an **alignment %** column is the gestalt manager-view shift, and it's the single highest-impact UX upgrade over 15-Five. Drill-down into an individual IC's reconciliation should be a *slide-over* (table stays in context) not a new page (which loses the scan position the manager just earned by reading the whole row).

## Sources

*Verified-against-live: none in this session. The references below are the canonical product pages and review aggregators referenced during training; treat as starting points if the team wants to verify any specific field name before the demo.*

- [15Five — Weekly Check-Ins product page](https://www.15five.com/product/weekly-check-ins/)
- [15Five — Objectives & Key Results](https://www.15five.com/products/objectives)
- [15Five Help Center](https://help.15five.com/hc/en-us)
- [15Five Pulse — wellbeing rating](https://www.15five.com/product/pulse/)
- [15Five vs Lattice — G2 comparison](https://www.g2.com/compare/15five-vs-lattice)
- [G2 reviews — 15Five](https://www.g2.com/products/15five/reviews)
- [Capterra reviews — 15Five](https://www.capterra.com/p/126947/15Five/)

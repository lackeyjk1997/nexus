# Prompt Port Manifest

All 25 original prompts from `04-PROMPTS.md`, mapped to their v2 disposition. Per DECISIONS.md 2.7, prompts not rewritten in `04C-PROMPT-REWRITES.md` are ported **verbatim** (preserving model instructions) but get mechanical cleanups per the Section 2 "Prompt Principles for Codex" checklist: move from inline string literal to `.md` file, port to tool-use schemas, wire shared enums (`SignalTaxonomy`, `OdealTaxonomy`, `CloseFactorTaxonomy`), set explicit temperatures, route context through services (`DealIntelligence`, `CrmAdapter`, `IntelligenceCoordinator`, `TranscriptPreprocessor`, `Formatter`).

Status legend:
- **REWRITTEN** — Full rewrite staged in this directory; drop-in ready.
- **PORT-WITH-CLEANUPS** — Preserve model instructions verbatim; apply Section 2 port checklist (tool schemas, shared enums, explicit temperatures, service-routed context). Most prompts land here.
- **PORT-VERBATIM** — Strong text already; minimal cleanups (mostly mechanical: `.md` file + tool schema).
- **CONSOLIDATE** — Merges with other prompt(s) into a single parameterized prompt file.

Port checklist reference: `04C-PROMPT-REWRITES.md` Section 2 (Prompt Principles for Codex).

| # | Original Name | Status | Target v2 Filename | Notes |
|---|---------------|--------|--------------------|-------|
| 1 | Observation Classification | REWRITTEN | `02-observation-classification.md` | Rewrite 2 in 04C. 9-type `SignalTaxonomy`, tool-use schema, reasoning_trace, observer history + cluster context added. |
| 2 | Cluster Semantic Match | PORT-WITH-CLEANUPS | `cluster-semantic-match.md` | Mechanical port + add severity, arr_impact_total, full unstructured_quotes, verticals_affected[], structured_summary. Tool-use schema with `cluster_id` enum-validated against active clusters. |
| 3 | New Cluster Detection | PORT-WITH-CLEANUPS | `new-cluster-detection.md` | Mechanical port + add observer_id, linked_deals, ARR per unclustered observation. Tool-use schema. Same `SignalTaxonomy` enum as #1, #21. |
| 4 | Agent Config Change Suggestion | REWRITTEN | `03-agent-config-proposal.md` | Rewrite 3 in 04C. Re-scoped from auto-write to proposal (DECISIONS.md 2.25 #3). Full instructions (no 500-char slice), change history, behavior digest, worked examples. |
| 5 | Streaming Transcript Analysis | PORT-VERBATIM | `streaming-transcript-analysis.md` | Strong text already; isolated surface (`/analyze`). Add optional dealId-to-context expansion. Streaming preserved. |
| 6 | Field Query Analysis (Org-Wide) | PORT-WITH-CLEANUPS | `field-query-analysis.md` | Add coordinator patterns, prior field queries, system intelligence. Split tool schema into `direct_answer` and `fanout_targets` variants. |
| 7 | Personalized AE Question Generator | PORT-WITH-CLEANUPS | `ae-question-generator.md` | Add MEDDPICC + active experiments to per-AE context. Tool-use schema with structured chips (`structured_slot` mapping like #1's). Worked good/bad example pair. |
| 8 | Deal-Scoped Manager Question Answer | PORT-WITH-CLEANUPS | `deal-scoped-manager-answer.md` | Non-empty system prompt (second `system: ""` anomaly). Replace plain-text+sentinel parsing with tool-use schema `{ summary, needs_ae_input, suggested_chips_for_ae }`. Add MEDDPICC + agent memory + coordinator patterns context. |
| 9 | Give-Back Insight | REWRITTEN | `07-give-back.md` | Rewrite 7 in 04C. `applies: false` opt-out, structured `cited_data[]`, peer responses + coordinator patterns + system intelligence + MEDDPICC context. |
| 10 | Aggregated Answer Synthesis | PORT-WITH-CLEANUPS | `aggregated-answer-synthesis.md` | Role framing per Principle 1. Tool-use schema: `{ summary, key_findings, agreement_level, dissent_notes, confidence, recommended_next_step }`. Add per-response AE context, prior aggregated answers, coordinator patterns. |
| 11 | Call Prep Brief Generator (The Big One) | REWRITTEN | `08-call-prep-orchestrator.md` | Rewrite 8 in 04C. Decomposed into orchestrator + 10 sub-prompts. Direct `coordinator_patterns` read per DECISIONS.md 2.17. Deterministic proven-plays post-check. Per-section length budgets. |
| 12 | Email Draft Generator | CONSOLIDATE | `email-draft.md` | Merges with #24 + #18 into single prompt with input variants (`trigger: 'on_demand' | 'post_pipeline' | 'post_sale_outreach'`). Add prior email bodies, MEDDPICC, agent memory, fitness gaps, coordinator patterns. Single tool schema. |
| 13 | Natural-Language Agent Config Interpretation | PORT-WITH-CLEANUPS | `nl-agent-config-interp.md` | Add manager directives, change history, role-framing, examples. Tool-use schema preserves `{ changeSummary, updatedFields, fullConfig, clarification }`. Cycle risk with #4 breaks once #4 becomes a proposal. |
| 14 | Close Analysis (Win/Loss) | REWRITTEN (SPLIT) | `06a-close-analysis-continuous.md` + `06b-close-analysis-final.md` | Rewrite 6 in 04C. Split per DECISIONS.md 1.1: continuous deal-theory updater (#14A) + final deep pass at close (#14B). Event-stream verification per 2.21. Candidate taxonomy promotion. |
| 15 | Deal Fitness Analysis (The oDeal Framework) | REWRITTEN | `05-deal-fitness.md` | Rewrite 5 in 04C. `OdealTaxonomy` single-source 25-event enum. Prior-evidence incremental detection. Seller roster in context. 5-pass reasoning. Renamed output fields to match DB columns. |
| 16 | Customer Response Kit | PORT-WITH-CLEANUPS | `customer-response-kit.md` | De-hardcode role (parameterize); ground similar_resolutions in actual `account_health` records (no invention); pass prior `customer_messages` thread for the contact. Tool-use schema. |
| 17 | QBR Agenda Generator | PORT-WITH-CLEANUPS | `qbr-agenda.md` | Server-side context query (no client-trusted account context — security fix). De-hardcode product list. Tool-use schema with structured agenda items. |
| 18 | Customer Outreach Email | CONSOLIDATE | `email-draft.md` | Consolidation target in #12's port. `trigger: 'post_sale_outreach'` variant. Parameterize sender (no Sarah hardcode). Add recipient engagement history. |
| 19 | Pipeline Step — Extract Actions (Actor) | PORT-WITH-CLEANUPS | `pipeline-extract-actions.md` | Read from `TranscriptPreprocessor.getCanonical()` (canonical analyzed-transcript). Tool-use schema. Distinguish buyer vs. seller actions explicitly. |
| 20 | Pipeline Step — Score MEDDPICC (Actor) | PORT-WITH-CLEANUPS | `pipeline-score-meddpicc.md` | Pass current MEDDPICC evidence text per dimension (not just score). Tool-use schema with per-dimension contradiction-handling instruction. Same canonical analyzed-transcript input as #19/#21. |
| 21 | Pipeline Step — Detect Signals (Actor) | REWRITTEN | `01-detect-signals.md` | Rewrite 1 in 04C. Establishes 9-type `SignalTaxonomy`. Tool-use schema with per-signal confidence + recurrence + coordinator-pattern + experiment linkage. Buyer/seller separation at context level. |
| 22 | Pipeline Step — Synthesize Learnings (Actor) | PORT-WITH-CLEANUPS | `pipeline-synthesize-learnings.md` | Match upstream truncation via `TranscriptPreprocessor`; pass existing learnings; replace `JSON.stringify` upstream-output blobs with structured sections; tool-use schema with `learnings[].{ evidence, context, action, scope }`. |
| 23 | Pipeline Step — Experiment Attribution (Actor, Conditional) | PORT-WITH-CLEANUPS | `pipeline-experiment-attribution.md` | Applicability gate per DECISIONS.md 2.21 (only run against experiments whose applicability matches the deal's state). Pass existing experiment_evidence for dedup. Tool-use schema. |
| 24 | Pipeline Step — Draft Follow-Up Email (Actor) | CONSOLIDATE | `email-draft.md` | Consolidation target in #12's port. `trigger: 'post_pipeline'` variant. Pass full stakeholder details, prior emails, MEDDPICC, agent memory. |
| 25 | Coordinator Pattern Synthesis (Actor) | REWRITTEN | `04-coordinator-synthesis.md` | Rewrite 4 in 04C. Fixes `system: ""` anomaly. Structured per-deal recommendations. Calibrated ARR multiplier with shown calculation. Pattern lineage. Generic-playbook rail. |

## Summary counts

- **REWRITTEN:** 8 originals → 9 files (prompts 1, 4, 9, 11, 14, 15, 21, 25 — with #14 splitting into 14A/14B).
- **PORT-WITH-CLEANUPS:** 13 (prompts 2, 3, 6, 7, 8, 10, 13, 16, 17, 19, 20, 22, 23).
- **PORT-VERBATIM:** 1 (prompt 5).
- **CONSOLIDATE:** 3 merging into `email-draft.md` (prompts 12, 18, 24).

Total: 25 originals → 21 distinct v2 prompt files (9 rewrites + 11 ported + 1 consolidated email-draft).

## Port checklist (from 04C Section 2)

Codex applies this checklist to every PORT-WITH-CLEANUPS and PORT-VERBATIM prompt during port:

```
[ ] Prompt lives as a .md file loaded at runtime (no inline string literal)
[ ] System prompt non-empty and role-anchored (Principle 1)
[ ] Output uses tool-use schema, not JSON-in-text (Principle 4)
[ ] Signal/event/stage enums sourced from SignalTaxonomy / OdealTaxonomy / CloseFactorTaxonomy (Principle 9)
[ ] Temperature set explicitly per task type (Principle 5)
[ ] Context routed through DealIntelligence / CrmAdapter / IntelligenceCoordinator services, not inline DB queries (Principle 7)
[ ] Currency, dates, names formatted via single Formatter module (DECISIONS.md 2.13)
[ ] Confidence fields calibrated with explicit bands (Principle 6)
[ ] Anti-hallucination rails explicit (no "cite X" when context lacks X) (Principle 3)
[ ] Truncation delegated to TranscriptPreprocessor — no silent per-prompt truncation (Principle 13)
[ ] Every route declares maxDuration (DECISIONS.md 2.9)
[ ] Model identifier pinned via env var (Principle 15)
[ ] Version stamp added at top of .md file (Principle 16)
[ ] Cross-prompt consistency checked: same conceptual task = same output shape (Principle 12)
[ ] Role framing rewritten to invoke domain expertise if originally generic (Principle 1)
```

## Services prerequisite for port order

Rewrites assume these v2 services exist. Build in this order to unblock dependent prompts:

1. `SignalTaxonomy`, `OdealTaxonomy`, `CloseFactorTaxonomy` enums — unblocks #1, #21, #15, #14B.
2. `Formatter` module — unblocks every prompt that renders currency/dates/names.
3. `TranscriptPreprocessor.getCanonical(transcriptId)` + `.getDealTimeline(dealId)` — unblocks #19, #20, #21, #15, #22.
4. `CrmAdapter` (deals, contacts, companies, team members, participants) — unblocks all.
5. `DealIntelligence` event-sourced reads (`getCurrentTheory`, `getPriorFitnessEvents`, `getOpenSignals`, `getMeddpiccTrajectory`, `getEventStream`, `getApplicableExperiments`, `getAgentConfigHistory`, `getAgentBehaviorDigest`, `getPeerResponsesToFieldQuery`, `getDealContext`) — unblocks #1, #4, #15, #14A/B, #9, #11.
6. `IntelligenceCoordinator` (`getActivePatterns`, `getPriorPatterns`, `synthesizePattern`, `receiveSignal`) — unblocks #25, then #11, #14B, #9, #15, #21.
7. `services/call-prep/orchestrator.ts` — last; ports #11 and its 10 sub-prompts.

See 04C-PROMPT-REWRITES.md Section 3 for full rewrite-ordering rationale.

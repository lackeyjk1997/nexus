# 07A — Context Assembly Audit

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Phase 3-5 reference for context-assembly services.** This document is the list of what Phase 3-5 context-assembly services (DealIntelligence, TranscriptPreprocessor, CallPrepOrchestrator, EmailDrafter) must deliver to each prompt. Still authoritative for gap identification.
>
> **v2-era resolutions for the two CRITICAL gaps:**
> - **#11 Call Prep — CRITICAL.** Coordinator gap resolved by §2.17 + §2.16 (DealIntelligence is the single interface for event-stream + coordinator-pattern reads). MEDDPICC trajectory + prior briefs + full fitness narrative available via event sourcing.
> - **#14 Close Analysis — CRITICAL.** Resolved by §1.1 (continuous pre-analysis + final deep pass) + §2.16 (event-sourced deal theory). Split into 14A continuous + 14B final deep pass per 04C Rewrite 6.
>
> **Top 5 highest-leverage context fixes** (this doc's Cross-Cutting Findings):
> 1. Wire `coordinator_patterns` into 7 prompts at once → §2.17 direct-read from the authoritative table.
> 2. `DealIntelligence` service returning canonical deal-context object → §2.16, skeleton shipped Session 0-B (`buildEventContext`); full surface lands Phase 4.
> 3. Full transcript text (not summaries) to synthesis → `TranscriptPreprocessor.getCanonical()` Phase 3 Day 2.
> 4. Continuous deal-theory accumulation → §1.1 + §2.16 event sourcing; `deal_theory_updated` events emitted by Rewrite 6a during Phase 3 Day 2+.
> 5. Applicability gating → §2.21 + C2 applicability DSL (Phase 4 Day 1 per `docs/PRE-PHASE-3-FIX-PLAN.md` §7.3).
>
> Duplication patterns (8 enumerated in this doc's Cross-Cutting section) are closing as the v2 service layer lands: MeddpiccService.formatForPrompt, CrmAdapter.listDealContacts, TranscriptPreprocessor.getCanonical, Formatter module (§2.13 LOCKED), DealIntelligence for event-sourced reads.
>
> Current v2 authoritative sources: `~/nexus-v2/docs/DECISIONS.md` §2.13 / §2.16 / §2.17 / §2.21; `~/nexus-v2/packages/shared/src/services/`. Handoff-edit policy per §2.13.1.

---

For every Claude call site in 04-PROMPTS.md, this doc diagnoses the gap between the context the prompt currently receives and the context it should receive for VP-of-Sales-grade output. Per DECISIONS.md 2.8, this feeds Prompts 4.5a/b (quality audit) and Prompt 10 (rebuild plan).

**Scope:** 25 prompts (matches 04-PROMPTS.md and 01-INVENTORY §6). Diagnosis only — no rewrites (that's Prompt 4.7).

**Rating scale:**
- **CRITICAL** — gap fundamentally breaks the prompt's VP-quality ceiling; the output cannot meet the 1.1/1.2 bar without closing it.
- **HIGH** — gap reliably degrades output on most calls; closing it would noticeably sharpen demo moments.
- **MEDIUM** — gap makes the output softer or less specific but not broken.
- **LOW** — gap is cosmetic, nice-to-have, or narrow.

---

### 1. Observation Classification

**Current Context Shape**

- `${observer.name}`, `${observer.role}`, `${observer.verticalSpecialization}` — single row from `team_members` via FK on `observations.observer_id`.
- `${context.page}`, `${context.dealId ? "yes" : "no"}`, `${context.trigger}` — client-supplied hint ({page, dealId, accountId, trigger, transcriptId, signalType}); the actual dealId is boolean-flattened to "yes"/"no" before prompt insertion.
- `${accountNames}` — comma-joined `companies.name` across **all** rows in the table. No vertical/assigned-AE filter. At demo scale (~40 companies) this is tolerable; at real scale it bloats the prompt and drowns out the observer's own book.
- `${dealLines}` — multi-line list of the observer's deals only (`assigned_ae_id = observerId`), formatted as `- {name} ({companyName}, {stage}, €{dealValue || 0})`. Currency hardcoded to €.
- `${rawInput}` — raw observation text, untruncated.

**Context Gaps — What's Missing That the System Has**

- **Observer's prior observations.** `observations` rows where `observer_id = observerId` (per 02-SCHEMA). Not passed. If Sarah has already reported "Microsoft DAX pricing" three times this month, the classifier doesn't know it's a repeat — it cannot bias toward the existing cluster, and it re-asks the same follow-up questions. **Cost: low.**
- **Active observation clusters for the observer's vertical.** `observation_clusters` filtered by `verticals_affected @> {observerVertical}`. Without these the classifier has no prior-pattern awareness — prompts #2 and #3 do the clustering work separately but the classifier could hint at which existing cluster is most likely. **Cost: low.**
- **Recent deal activity for `context.dealId`.** Per 07-DATA-FLOWS Flow 3, `source_context.dealId` is explicitly set but is read only as a boolean. If present, the last 5 activities + MEDDPICC snapshot + last transcript summary would let the classifier resolve "they pushed back on pricing again" to a specific dimension. **Cost: low.**
- **Recent signal trends per vertical.** `coordinator_patterns` rows with `vertical = observerVertical AND status = 'active'` (02-SCHEMA). Passing these would let the classifier recognize org-wide patterns the observer may not know about ("three other reps flagged this competitor in the last week — are you seeing the same?"). **Cost: low.**
- **Rep's typical classification bias.** A lookup of past observations by this observer that ended up mis-routed (follow-up corrected the initial signal_type). Would let the classifier guard against personal habits. **Cost: medium.**

**Context Gaps — What's Missing That the System Should Generate**

- **Per-observer recency map.** "Which clusters has this rep contributed to in the last 14 days?" A simple aggregate that doesn't exist but could be computed in the event-sourced v2 (DECISIONS.md 2.16) from the `observations` table directly. **Cost: low.**

**Truncation and Shape Risks**

- `accountNames` as a comma-joined blob is the wrong shape for matching — the model has to tokenize the CSV and guess which account is "MedCore". A structured list with `{id, name, vertical, assigned_ae}` lets the model return real IDs directly, eliminating the downstream `resolveEntities()` string-match step.
- `deal = "yes"/"no"` flatten loses dealId and stage. The classifier could deliver a better `linked_deals` array if it saw the deal it's already on the page for.
- `dealValue || 0` renders as `€0` for deals without a value — misleading in the prompt.

**Impact Estimate**

Richer observer context (prior observations, active clusters, page deal) would sharpen entity resolution, reduce unnecessary follow-up questions, and auto-link repeat observations to their existing cluster without a second Claude call. **HIGH** — this prompt runs on every observation and seeds downstream routing, ARR attribution, and auto-experiment creation.

**Blast Radius Note**

Feeds prompts #2 (cluster match), #3 (new cluster detection), #4 (agent config suggestion), and the `observation_routing` logic. A weak classification propagates into all four.

---

### 2. Cluster Semantic Match

**Current Context Shape**

- `${rawInput}` — full observation text.
- `${classification.signals[0].type}` — primary signal type from prompt #1 output.
- `${clusterDescriptions}` — multi-line list for every **active** `observation_clusters` row: `- ID: {id} | "{title}" | Type: {signalType} | {summary} | Samples: "{quote1}", "{quote2}"` (top 2 `unstructured_quotes` per cluster).

**Context Gaps — What's Missing That the System Has**

- **Cluster severity and ARR impact.** `observation_clusters.severity` and `arr_impact_total` are not in the match prompt. A tied semantic match between a "critical, $8M ARR" cluster and an "informational, $0 ARR" cluster should resolve to the critical one. Not passed → arbitrary tiebreaks. **Cost: low.**
- **Cluster observation count and recency.** `observation_count`, `last_observed`. A cluster with 12 observations in the last week is a stronger match target than a 1-observation cluster from 3 months ago. **Cost: low.**
- **Verticals affected.** `verticals_affected[]`. If the observation comes from a Financial Services AE and the cluster is Healthcare-only, the match should be weaker. **Cost: low.**
- **Full unstructured_quotes list, not top 2.** The code passes only 2 quotes from `unstructured_quotes` jsonb. A cluster with 15 diverse quotes is being represented by 2 possibly-unrelated ones. **Cost: low.**
- **Structured summary.** `observation_clusters.structured_summary` jsonb — not passed. A cluster that has "Competitor: Microsoft, pricing discount: 20%, stage: negotiation" as structured data gives the model a much clearer target than a free-text title+summary. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- None beyond the existing columns. The bottleneck is shape, not new data.

**Truncation and Shape Risks**

- **2-quote truncation on unstructured_quotes is the biggest shape problem here.** The cluster's identity lives in its accumulated quotes. The 3rd through Nth quotes are dropped silently. If the 3rd quote is the one that would resolve the match, the model never sees it.
- The whole cluster list is flattened to a single prompt as plaintext — no structural separation between clusters beyond bullets. At 30+ active clusters, formatting noise dominates.

**Impact Estimate**

Better cluster representation (severity, count, full quotes, structured summary) would reduce false-negative matches, which currently cascade into unnecessary new-cluster creation via prompt #3. **MEDIUM** — the 0.6 confidence threshold is a backstop but cluster quality directly determines Intelligence dashboard coherence.

**Blast Radius Note**

Feeds `observations.cluster_id` assignment and `observation_clusters.unstructured_quotes` append. A false-negative triggers prompt #3 (new cluster creation) which may duplicate an existing cluster.

---

### 3. New Cluster Detection

**Current Context Shape**

- `${obs.id}`, `${obs.rawInput}` — the just-inserted observation.
- `${primarySignal.type}` — from prompt #1.
- `${obsDescriptions}` — up to 30 unclustered observations (`cluster_id IS NULL`, limit 30 by recency), each rendered as `- ID: {id} | "{first 120 chars of rawInput}" | Signal: {type}`.

**Context Gaps — What's Missing That the System Has**

- **Observer identity per unclustered observation.** `observations` has `observer_id`. Pattern detection that spans observers is meaningful; a cluster of 4 observations all from one rep is much weaker than 4 observations from 4 reps. Not passed. **Cost: low.**
- **Linked deal/account per unclustered observation.** `linked_deal_ids[]`, `linked_account_ids[]`. A cluster that spans 4 deals is a real pattern; 4 observations about the same deal is just noise about one situation. **Cost: low.**
- **AI classification confidence per unclustered observation.** `observations.ai_classification.signals[0].confidence`. Unclustered observations with confidence <0.6 should be down-weighted as potential matches. **Cost: low.**
- **Structured entity extractions.** `observations.extracted_entities` jsonb — competitor names, dollar amounts, timelines. When two observations both mention "Microsoft DAX" the model should see that directly, not infer it from truncated raw text. **Cost: low.**
- **ARR impact.** `observations.arr_impact` jsonb — higher-impact observations should weight toward cluster creation. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- None. Existing columns are sufficient if properly shaped.

**Truncation and Shape Risks**

- **120-char truncation of `raw_input` per observation is the primary lossy transformation.** An observation like "We need a healthcare-specific HIPAA battlecard; Microsoft DAX already has one, and their rep walked in with a three-page printout at last week's call with Pacific Coast Medical" gets cut to ~120 chars — the critical context about the competitor and the specific deal may be lost. 30 obs × 120 chars ~= 3.6K chars of context; even at 30 × 500 chars the prompt would fit well within budget.
- 30-observation limit can drop old-but-relevant unclustered observations.

**Impact Estimate**

Better representation (full raw input, observer, deals, entities) would materially improve pattern detection quality. The output feeds `observation_clusters` creation — a missed cluster today is a missed pattern on the Intelligence dashboard forever (no re-clustering job exists). **MEDIUM.**

**Blast Radius Note**

Direct write to `observation_clusters`. Downstream: Intelligence Patterns tab, field_queries cluster_id linkage, prompt #2 future match quality.

---

### 4. Agent Config Change Suggestion

**Current Context Shape**

- `${observationText}` — raw observation.
- `${signal.type}`, `${signal.summary}` — a single signal from classification.
- `${config.instructions}` — truncated to first 500 chars. Whole field stored in DB but model sees only 500.
- `${config.outputPreferences}` — full jsonb serialized.

**Context Gaps — What's Missing That the System Has**

- **Full instructions, not 500-char slice.** `agent_configs.instructions` can legitimately be 2-3K chars (natural-language persona, guardrails, preferences accumulated over time). The 500-char truncation means Claude proposes additions that may duplicate or contradict rules past the cut. **Cost: trivial.**
- **Prior `agent_config_versions` for this agent.** Change history shows what's already been tried, what was reverted, and whether similar additions have been made. Not passed. A v2 event-sourced design (per DECISIONS.md 2.16 spirit) makes this near-free. **Cost: low.**
- **Related `agent_actions_log` entries.** The log of this agent's actual outputs (`output_data` jsonb) shows how the persona is behaving today. The suggestion should address observed behavior, not just prose edits to the instructions. **Cost: medium.**
- **Observations that previously triggered config changes for this member.** Prior observations with signal_type `agent_tuning` or `cross_agent` targeting this agent — context on why earlier tweaks were made. **Cost: low.**
- **Target member's deals and vertical.** If the observation came from a Healthcare AE about a FinServ AE's agent, that cross-vertical context should shape the suggestion. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **Per-agent behavior diff.** "What has this agent actually been writing in its last 10 call preps?" A derived summary from `agent_actions_log.output_data`. Would let the suggestion engine target real drift, not theoretical drift. **Cost: medium.**

**Truncation and Shape Risks**

- **500-char instruction truncation is the critical shape problem.** This path silently auto-writes to `agent_configs.instructions` without human review (07-DATA-FLOWS Flow 3 issue #2) — so the model proposing a duplicate addition past the truncation is a live correctness failure, not a theoretical one.
- Output preferences JSONB stringified with no schema hint — the model must guess which fields are valid keys.

**Impact Estimate**

This prompt writes live configuration with no human-in-the-loop (DECISIONS.md 2.25 #3 already flags this; v2 converts it to an event-sourced proposal). Even after the v2 redesign, the suggestion quality drives whether humans approve or reject. Full instructions + history + action log would materially improve proposal quality. **HIGH** for the v2 proposal-quality goal; the current auto-apply behavior should be disabled regardless.

**Blast Radius Note**

Direct mutations to `agent_configs` + `agent_config_versions`. Every subsequent call prep (#11) and draft email (#12) for the target member reads the mutated config. Poor suggestions compound.

---

### 5. Streaming Transcript Analysis

**Current Context Shape**

- `${transcript}` — full pasted transcript, max 100K chars (caller-validated). No DB reads. Standalone analyzer path (`/analyze` page), not the pipeline.

**Context Gaps — What's Missing That the System Has**

- **Deal context.** No deal ID required or passed. If the rep ran this analyzer from a deal page, the prompt could know the deal stage, vertical, competitor, MEDDPICC scores, prior transcripts for the same deal. Today it analyzes in a vacuum. **Cost: low (add optional dealId param).**
- **Rep's agent config.** `agent_configs.instructions` and `output_preferences` — for voice/style alignment. Missing means the analysis sounds generic. **Cost: low.**
- **Prior transcript analyses for this deal.** `call_analyses` joined by `call_transcripts.deal_id`. Sentiment arc should be cumulative across calls, not per-call isolated. **Cost: low.**
- **Known stakeholders.** `contacts` for the deal's company — so the analysis can attribute sentiment to the right person by name rather than "the prospect said...". **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **Per-rep coaching trajectory.** What has this rep improved/regressed on in the last 10 analyses? A simple aggregate over past `call_analyses.coaching_insights` jsonb. Would turn generic tips into personalized tips. **Cost: medium.**

**Truncation and Shape Risks**

- 100K char limit is generous — rarely the bottleneck here.
- Output is streaming SSE; partial JSON states are handled client-side. No shape loss in the request path.

**Impact Estimate**

This path is used from the standalone `/analyze` page (not in the deal workflow). Upgrading it to optionally take a dealId and pull the same deal context as the pipeline would make it a useful one-off coaching tool without duplicating the pipeline. **MEDIUM** — currently a secondary surface but under-leveraged.

**Blast Radius Note**

Output can be saved as a `call_analysis` activity on a deal via `/api/analyze/link`. Does NOT feed the pipeline or call prep. Isolated.

---

### 6. Field Query Analysis (Org-Wide)

**Current Context Shape**

- `${rawQuestion}` — manager's free-form question.
- `${clusters}` — top 10 of recent 20 `observation_clusters` ordered by `last_observed`, serialized as `{title, signalType, observationCount, severity, arrImpactTotal}` JSON-stringified.
- `${recentObs}` — top 20 of 50 recent observations serialized as `{rawInput (120 chars), structuredData}`.
- `${openDeals}` — every open deal, serialized as `{id, name, stage, value, vertical, competitor, aeId}`.
- `${closedDeals}` — top 5 recent closed deals with `closeFactors` jsonb.

**Context Gaps — What's Missing That the System Has**

- **Coordinator patterns.** `coordinator_patterns` where `status = 'active'` — already-synthesized cross-deal patterns would let the prompt answer "what are we seeing across the portfolio" directly from existing synthesis instead of re-synthesizing from raw observations. Critically this is the exact type of question field queries are designed for. **Cost: low.**
- **Prior field queries and their aggregated answers.** `field_queries` where `status = 'answered'` — "we already asked this three weeks ago, here's what we heard" is the strongest possible answer. Not consulted. **Cost: low.**
- **System intelligence.** `system_intelligence` filtered by active + vertical — pre-computed insights from the team that may already answer the question. **Cost: low.**
- **Deal MEDDPICC summaries.** For open deals, the serialized form has no MEDDPICC. Answering "which deals are stuck because of competitive pressure?" requires seeing competition_confidence scores; the current prompt has to re-infer from raw observations. **Cost: medium.**
- **Manager directives already in flight.** `manager_directives` where active — the manager may be asking about a topic their own directive already addresses. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Portfolio health" rollup per vertical.** Aggregated MEDDPICC averages, stage distribution, win-rate, top-3 coordinator patterns. Not computed today; would be natural to derive in the v2 DealIntelligence service. **Cost: medium.**

**Truncation and Shape Risks**

- `rawInput` truncated to 120 chars per observation, same problem as prompt #3. At 20 observations that's 2.4K chars; easily 4× that without strain.
- `openDeals` serialized as uniform JSON rows — no grouping by vertical or severity, so the model has to re-group inside its own reasoning.
- `closedDeals.closeFactors` is jsonb; stringified without schema hint. Model has to decipher the shape each time.

**Impact Estimate**

Answering "can we answer this from existing data?" is this prompt's whole job. Omitting coordinator patterns, prior answers, and system intelligence means the prompt re-derives insights that already exist elsewhere — and frequently says "no, ask the field" when the answer is already in `coordinator_patterns`. **HIGH.**

**Blast Radius Note**

When `can_answer_now=false`, fan-out fires prompt #7 per AE in a loop — a bad "can_answer_now=false" decision triggers 8 unnecessary personalized-question generations at 30s timeout.

---

### 7. Personalized AE Question Generator

**Current Context Shape**

- `${rawQuestion}`, `${dataGap}` — manager's question and the gap from prompt #6.
- `${repName}` — `team_members.name`.
- Single deal's `${dealName}, ${accountName}, ${stage}, ${value}` — the highest-value open deal assigned to the AE. Currency rendered as €.

**Context Gaps — What's Missing That the System Has**

- **All of the AE's deals, not just the highest-value.** The manager question may be about a different deal than the AE's biggest one. Passing all open deals (or top 3) would let the model pick the right one. **Cost: low.**
- **The AE's recent observations.** `observations` by this `observer_id` — the AE may have already reported on this topic; the question should reference that rather than ask blind. **Cost: low.**
- **The deal's MEDDPICC snapshot.** `meddpicc_fields` for the chosen deal — "your Economic Buyer confidence is 20%, is the CFO still engaged?" is a much better question than "how's the deal going?". **Cost: low.**
- **The deal's last transcript summary.** `call_analyses.summary` from the most recent transcript — anchor the question in a specific recent moment. **Cost: low.**
- **Prior field-query responses from this AE.** `field_query_questions` where `target_member_id = this AE`. Gives stylistic context and avoids asking the same rep twice. **Cost: low.**
- **Active experiments the AE is in.** `playbook_ideas` where `status='testing' AND ae in test_group` — a question that references "this is about your active experiment X" feels more grounded than a cold check-in. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Last meaningful engagement" timestamp per deal.** Derived from activities + transcripts. Would let the prompt ask targeted questions like "it's been 11 days since your last touch on MedVista, anything changed?". **Cost: low.**

**Truncation and Shape Risks**

- Hardcoded to highest-value deal drops the question's relevance when the manager's concern is about a different deal.
- `value` stringified with € hardcoded — mismatches USD deals.

**Impact Estimate**

Questions generated here are the primary surface reps see. "Feel like a colleague, not an interrogation" is the whole goal and requires deal-specific grounding. Missing MEDDPICC + last transcript is the single biggest reason questions read as generic. **HIGH.**

**Blast Radius Note**

Chip responses flow into `field_query_questions.response_text`, which feeds prompts #9 (give-back) and #10 (aggregated answer). A vague question → vague answer → vague synthesis.

---

### 8. Deal-Scoped Manager Question Answer

**Current Context Shape**

- `${rawQuestion}` — manager's question.
- `${dealContext}` — large composite JSON: `{name, stage, value, competitor, ae, company, meddpicc (7 dimensions + confidence), contacts (name/title/role), recentActivities (type/subject/date/description), observations (text/date), teamFeedback (from/content)}`.

**Context Gaps — What's Missing That the System Has**

- **Call transcripts and analyses.** `call_transcripts` + `call_analyses` for this deal. The prompt has `recentActivities` and `observations` but not actual call content. Most deal-specific questions ("did we address the pricing objection?") require transcript content. **Cost: low.**
- **Deal stage history with timestamps.** `deal_stage_history` — "how long has this been in Negotiation?" requires the stage-entry timestamp. Not passed. **Cost: low.**
- **Deal fitness scores and events.** `deal_fitness_scores` + `deal_fitness_events` — the oDeal framework's whole point is evidenced buyer-behavior detection. A manager question about whether the deal is real gets answered from fitness, not from activities. **Cost: low.**
- **Agent memory.** `deal_agent_states.learnings`, `risk_signals`, `competitive_context` — accumulated insights. Not passed. **Cost: low.**
- **Coordinator patterns referencing this deal.** `coordinator_patterns` where `deal_ids @> [dealId]`. Cross-deal context is exactly what a manager wants to know. **Cost: low.**
- **System intelligence for the vertical.** `system_intelligence` where `vertical = dealVertical AND status = 'active'`. Pre-computed patterns. **Cost: low.**
- **Manager directives.** `manager_directives` active for this vertical/role. The answer should reflect current leadership priorities. **Cost: low.**
- **Win/loss patterns for similar deals.** Same vertical, recent closed deals with `close_factors`. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Stakeholder responsiveness trajectory" per contact.** Derived from activity dates + transcript participants. "Has this champion been engaged?" is a common manager question that today is answerable only from a sparse activity feed. **Cost: medium.**

**Truncation and Shape Risks**

- **`recentActivities` and `observations` do not include transcript text or call summaries.** The prompt sees activity subjects like "Note added" or "Email sent" but not content. The model must guess.
- `teamFeedback` jsonb includes all cross-agent feedback regardless of date; no recency filter.
- No system prompt (prompt uses entire instruction inside user message per 04-PROMPTS) — lower role discipline, higher hallucination risk.

**Impact Estimate**

This prompt has a relatively rich surface object but is missing transcripts, fitness, agent memory, coordinator patterns, stage history. A manager asking "why is this stalling?" today gets a shallow answer. Closing these gaps converts it into a real deal-inspection tool. **HIGH.**

**Blast Radius Note**

Output feeds `field_queries.aggregated_answer.summary`. If `NEEDS_AE_INPUT: true` is returned, a fixed-chip follow-up question fires to the deal's assigned AE.

---

### 9. Give-Back Insight

**Current Context Shape**

- `${responseText}` — AE's response to the field-query question.
- `${questionText}` — the question that was asked.
- Deal basics: `${dealName}, ${stage}, ${value}, ${vertical}, ${accountName}` — joined from `field_query_questions` ⨝ `deals` ⨝ `companies`.

**Context Gaps — What's Missing That the System Has**

- **The original manager question** that spawned the field query. Without it the give-back cannot reference the bigger picture. **Cost: trivial** — one join.
- **Other AEs' responses to the same field query.** `field_query_questions` where `query_id = thisQueryId AND status = 'answered'`. "3 of your teammates are seeing the same thing" is the strongest possible give-back and the entire system architecture supports it. **Cost: low.**
- **Relevant coordinator patterns.** `coordinator_patterns` matching the query's vertical + signal type. Cross-deal synthesis the AE may not have seen. **Cost: low.**
- **Relevant active experiments.** `playbook_ideas` where `status='testing' AND ae in test_group`. If the response describes a pattern the rep has been testing, surface that connection. **Cost: low.**
- **System intelligence for this vertical.** `system_intelligence`. "Data shows X in this vertical; your response matches/diverges from that." **Cost: low.**
- **Deal MEDDPICC for the AE's chip response context.** Anchors the give-back in what the deal actually looks like. **Cost: low.**
- **Similar prior give-backs.** Past `field_query_questions.give_back` jsonb on the same signal type — to avoid repeating the same "tip". **Cost: medium.**

**Context Gaps — What's Missing That the System Should Generate**

- **A running "what teammates are doing" feed.** Not just individual give-backs, but a derived rollup of recent peer activity. Today the `fallbackGiveBack` hardcodes generic vertical tips; a real peer-activity summary would replace that. **Cost: medium.**

**Truncation and Shape Risks**

- The entire prompt is 4 variables. There's no shape risk; there's just missing data.

**Impact Estimate**

Prompt says "NEVER be generic" but the input has no concrete anchors beyond the deal name. Output predictably reads as generic. Closing these gaps is the main thing between "forgettable tooltip" and "this is why I responded". **HIGH** for the core Nexus promise of "give-backs feel like a smart colleague".

**Blast Radius Note**

Written to `field_query_questions.give_back` jsonb; rendered inline in QuickQuestions UI. Self-contained surface.

---

### 10. Aggregated Answer Synthesis

**Current Context Shape**

- `JSON.stringify({ original_question, responses: answered.map({deal, response, value}), total_asked, total_answered })` — entire user message is this JSON blob. No system-prompt specificity beyond "Synthesize field responses into a brief aggregated answer."

**Context Gaps — What's Missing That the System Has**

- **AE context per response.** Each answered question should include rep name (or anonymized rep tag), vertical, stage, and deal status. Today only the deal name + response + value — a response from a 3-year AE on a $2M deal gets the same weight as a 6-month AE on a $100K deal. **Cost: low.**
- **Prior aggregated answers on similar questions.** `field_queries.aggregated_answer` where older rows have similar signal types. Consistent synthesis style and ability to flag "we heard different things last time". **Cost: low.**
- **Deal outcome trajectory.** For each deal in `answered`, whether it closed won/lost since. `deals.stage` at time of synthesis. **Cost: low.**
- **The original prompt #6 analysis.** `field_queries.ai_analysis` jsonb — the data_gaps that motivated the fan-out. Synthesis should address whether the gaps were filled. **Cost: trivial.**
- **Related coordinator patterns.** If 3 of 4 responses match an existing coordinator pattern, the synthesis should reference it. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **Confidence scoring per response.** Did the rep choose a definitive chip or "Not sure"? A confidence-weighted aggregate beats a simple count. (Schema supports chip responses; code just flattens.) **Cost: trivial.**

**Truncation and Shape Risks**

- Raw JSON-stringified blob with no narrative framing; the model must parse it into concepts unaided. Named fields like `responses: [{deal, response, value}]` are readable but the 300-token cap leaves no room for model reasoning.
- System prompt is 1 sentence; does not explain what "aggregated answer" means, what audience to write for, or what to include beyond anonymization.

**Impact Estimate**

300-token cap + thin context + 1-sentence system prompt = predictable "2 of 3 reps say X" generic rollups. Prompt #10 is supposed to give the manager a strategic read; today it's a counter. **HIGH** for the Field Query flow's VP-quality bar.

**Blast Radius Note**

Written to `field_queries.aggregated_answer.summary`. Rendered as the manager's answer. Final surface in the flow.

---

### 11. Call Prep Brief Generator (The Big One)

**Current Context Shape**

Per 07-DATA-FLOWS Flow 2, the prompt assembles from 14+ queries:

- `${rep.name}` — single row from `team_members`.
- `${prepContextSection}`, `${attendeeContext}` — optional inlined blocks for prep type and attendee contact list.
- `${agentMemory}` — formatted block from `formatMemoryForPrompt()` over `deal_agent_states` columns (learnings, riskSignals, competitiveContext, interactionCount, coordinatedIntel).
- `${fitnessContext}` — inline block built from `deal_fitness_events` (detected vs. not_yet per category) + `deal_fitness_scores` (overall/business/emotional/technical/readiness scores, velocityTrend, fitImbalanceFlag, buyer commitments from `buyer_momentum` jsonb).
- `${agentConfigRow.instructions}` + `${outputPrefs.communicationStyle/guardrails/dealStageRules[stage]}` — from `agent_configs`.
- `${systemInsights[]}` — top 5 `system_intelligence` rows by relevanceScore where vertical matches.
- `${lossPatterns[]}` + `${winPatterns[]}` — derived from up to 10 closed deals in the same vertical with close_factors/win_turning_point.
- `${underEngagedStakeholders[]}` — in-code N+1 loop counting activities mentioning each champion/EB contact; flagged if <2.
- `${directives[]}` — active `manager_directives` for scope=org_wide OR (scope=vertical AND matching vertical).
- `${playbookInsights[]}` — 3 promoted experiments for vertical.
- `${testingIdeas[]}` — 2 testing experiments where this deal is in test_group_deals.
- `${activeExperimentsForAE[]}` — all testing experiments where member is in test_group.
- `${provenPlays[]}` — 5 graduated+promoted experiments with currentMetrics/results.
- `${context}` (user prompt JSON) — composite: deal (9 fields), account (5), meddpicc (7 dims + confidence), contacts (name/title/role), recent_activities (10, type/subject/description/date/by), previous_calls (3 most recent, title/date/qualityScore/summary/painPoints/nextSteps/competitiveMentions).

**Context Gaps — What's Missing That the System Has**

- **Coordinator patterns directly.** Per DECISIONS.md 2.17 LOCKED: "Call prep MUST query the coordinator." Today call prep reads `deal_agent_states.coordinated_intel` which is never written (07-DATA-FLOWS Flow 6 BROKEN). `coordinator_patterns` where `deal_ids @> [dealId] OR (vertical = dealVertical AND status='active')` would deliver the actual cross-deal intel. **This is the single most important gap in the prompt.** **Cost: low** (one query + format).
- **Full transcript texts, not just analysis summaries.** Previous calls are represented only by `call_analyses.summary/painPoints/nextSteps/competitiveMentions`. `call_transcripts.transcript_text` is not passed. For a "walk in prepared in 2 minutes" brief the summary is enough, but for weakest-fit-category diagnosis (the `deal_fitness_insights` section) the actual quotes matter. **Cost: medium** (prompt budget).
- **Emails sent and received.** Per 02-SCHEMA, emails live in `activities` with `type IN ('email_sent', 'email_received')` plus `email_sequences`/`email_steps`. `recent_activities` surfaces them by type but not body. "Has the champion replied to our last email?" requires email content. **Cost: low.**
- **Deal stage history with timestamps.** `deal_stage_history`. The prompt has `days_in_stage` (computed from stageEnteredAt) but not the arc — "this deal was pushed from Proposal back to Tech Val last week" is invisible. **Cost: trivial.**
- **Prior call prep briefs for this deal.** `activities` where `type='call_prep' AND deal_id=X`. Lets the brief acknowledge what was already covered/committed in prior prep, avoid repeating, and flag when prior suggestions weren't followed. This is the closest current-state equivalent to the event-sourced deal theory (DECISIONS.md 2.16). **Cost: low.**
- **Full MEDDPICC score trajectory over time, not current snapshot.** The pipeline writes deltas to `activities` metadata (per Flow 4 step 3). Current prompt sees only the latest scores — so "Economic Buyer confidence went from 60 → 20 in the last two weeks" is invisible. **Cost: medium.**
- **Rep's prior feedback on briefs.** `agent_actions_log` where `action_type='call_prep' AND was_overridden=true` plus `override_reason`. Lets the prompt avoid repeating the same mistakes. **Cost: medium.**
- **Close-lost analyses on similar past deals.** `deals.close_ai_analysis` jsonb for closed-lost deals in the same vertical. The prompt gets `win_turning_point`/`loss_reason` via win/lossPatterns but not the Claude-generated analysis narrative that lives in `close_ai_analysis`. **Cost: low.**
- **Observation cluster context.** `observation_clusters` relevant to this deal (linked via `linked_deal_ids` in constituent observations). The Intelligence dashboard shows them, call prep doesn't mention them. **Cost: medium.**
- **Account Health data.** `account_health` — only populated for post-close accounts today, but signals like "this company has other deals that closed lost on compliance" are relevant. Out of scope for open deals but worth flagging. **Cost: low.**
- **Deal fitness `stakeholder_engagement`, `buyer_momentum`, `conversation_signals` full jsonb.** Prompt includes only overall scores and buyer commitments; the richer narrative (W0-W8 engagement grid, response-time trajectory, ownership-language percentage) never reaches Claude. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Last meaningful engagement" derivation.** Days since last activity where the buyer responded (not just "last email sent"). Would let the brief lead with "Your champion hasn't been heard from in 11 days" without further prompt logic. **Cost: medium.**
- **"Buyer commitment follow-through rate" rollup.** Derived from `buyer_momentum.commitmentFollowThrough.commitments[]`: what % of buyer promises are being kept? One number that dramatically changes the risk read. Could be computed in the v2 DealIntelligence service. **Cost: low.**
- **"Cross-deal competitive signal" aggregator.** For deals where the primary competitor has appeared in other active deals' signals this week, surface that directly. Per DECISIONS.md 2.17 this is what coordinator is supposed to do; wiring it in becomes trivial once the coordinator-to-call-prep gap closes. **Cost: low.**
- **Deal theory.** Per DECISIONS.md 1.1: a continuously-updated rolling analysis. Does not exist. Every prior call prep analysis is disconnected from every other. **Cost: high** (full event-sourcing rework per 2.16).

**Truncation and Shape Risks**

- `recent_activities` truncated to 10 rows; `description` text not truncated but typically short. Losses rare.
- `previous_calls` limited to 3 most recent; `summary` is one paragraph. A 6-call deal loses the earlier half of its arc.
- `underEngagedStakeholders` N+1 query (`activities.description ILIKE '%name%' OR subject ILIKE '%name%' OR contactId = id`) is approximate — a call where the champion participated but wasn't named in subject/description goes uncounted.
- `isPrimary: false` hardcoded in returned contacts list (call-prep/route.ts:818) — downstream UI lies about primary status (07-DATA-FLOWS Flow 2 issue #6).
- **~12 conditional sections assembled by string concatenation.** Whitespace/order varies by what's present; Claude's output sometimes degrades subtly when unusual section combinations are assembled.

**Impact Estimate**

Call prep is the hero surface (Flow 2, 8+ intelligence layers, MANDATORY framing around proven plays). The coordinator gap alone blocks the Act 2 demo story. Adding coordinator, MEDDPICC trajectory, prior briefs, and full fitness narrative would close the gap between today's "decent synthesis" and the VP-grade "diagnosed the deal". **CRITICAL.**

**Blast Radius Note**

Output is the rep's pre-call brief. Also auto-fired after transcript pipeline (Flow 1→2). No direct downstream prompts consume it; output saved as `call_prep` activity metadata.

---

### 12. Email Draft Generator

**Current Context Shape**

- `${rep.name}` + `${agentConfigRow.instructions}` + `${outputPrefs.communicationStyle/guardrails}` — voice.
- `${type}` — "follow_up" | "outreach".
- `${teamIntel}` — up to N team members with same vertical specialization, rendered as `From {name} ({role}): {guardrails.join("; ")}`. (Guardrails, not actual intel.)
- `${crossFeedback}` — `cross_agent_feedback` rows where `target_member_id = rep`. Renders as `- From {sourceName}: {content}`.
- `${emailSystemInsights}` — `system_intelligence` filtered by vertical. Top rows.
- `${emailDirectives}` — active manager directives (same filters as call prep).
- `${latestAnalysis}` (follow-up only) — last `call_analyses.summary/painPoints/nextSteps`.
- `${relevantResources}` — `resources` filtered by vertical. Injected as title + type + description.
- `${additionalContext}`, `${rawQuery}` — rep's free-text instructions.
- **User prompt:** `${dealName}`, `${companyName}`, `${stage}`, `${primaryContact}`, `${recentEmails}` (last N activities filtered to email types, subject+date only), `${dealObs}` (observations for this deal, rawInput only).

**Context Gaps — What's Missing That the System Has**

- **Full prior email bodies.** `activities.description` for email_sent/email_received rows is available. Currently only `subject` and date are shown. A follow-up email that doesn't see the prior thread is flying blind. **Cost: low.**
- **MEDDPICC for the deal.** Economic Buyer confidence, identify pain — directly shapes email content and tone. Not passed. **Cost: low.**
- **Recipient's role and prior responsiveness.** The prompt has `primaryContact` (name/title) but no engagement history, role_in_deal tagging, or prior email behavior (opens/replies from `email_steps`). **Cost: low.**
- **Agent memory (learnings + riskSignals + competitiveContext).** `deal_agent_states` — accumulated deal insights. Not passed. Every email draft starts from zero. **Cost: low.**
- **Prior email sequences for this deal/contact.** `email_sequences` + `email_steps` — avoid repeating subject lines, sequence steps, or approaches that got no reply. **Cost: low.**
- **Call transcript content, not just summary.** For follow-up emails that should reference "what they said", the raw quotes matter. **Cost: medium.**
- **Deal fitness events.** `deal_fitness_events` with status='not_yet' — a follow-up email is the natural place to probe for unmet buyer behaviors (e.g., "would it help to spec out rollout timing?"). **Cost: low.**
- **Coordinator patterns.** "Three other healthcare deals have seen Microsoft DAX pricing — here's how peers positioned" should be in the draft prompt too. **Cost: low.**
- **Proven plays relevant to this email type.** Per prompt #11 treatment of proven plays. Email draft can apply them too. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Thread tone" read.** A derived read of recent thread sentiment (from sender's side in each message). Lets the prompt calibrate tone (warm re-engage vs. crisp confirm). **Cost: medium.**

**Truncation and Shape Risks**

- `recentEmails.map((e) => "- ${e.type}: ${e.subject} (${date})")` — bodies fully dropped.
- `dealObs.map((o) => "- ${o.rawInput}")` — observations listed raw without classification or deal linkage.
- `teamIntel` renders **guardrails** (what teammates' agents are told not to do) labeled as "insights" — this is misleading data shape: the team's actual insights live in `cross_agent_feedback`, which IS separately passed.

**Impact Estimate**

Draft-email is the second most-used Claude surface after observations. Missing prior email bodies means every follow-up is an informed guess. **HIGH.**

**Blast Radius Note**

Saved as `email_draft` activity via save-to-deal. Drafts can be edited by the rep before sending — but a bad draft burns rep time.

---

### 13. Natural-Language Agent Config Interpretation

**Current Context Shape**

- `${currentConfig}` — the client-passed current agent config (instructions + outputPreferences).
- `${instruction}` — user's free-form NL request.
- No DB reads.

**Context Gaps — What's Missing That the System Has**

- **Agent config version history.** `agent_config_versions` for this agent — tells the interpreter what's been tried, reverted, or auto-applied. Prevents conflicting changes. **Cost: low.**
- **The target member's role and vertical.** `team_members.role` + `vertical_specialization`. An instruction that says "lean more aggressive on closing" means different things for an AE vs. a BDR. **Cost: trivial.**
- **The member's deals (at least summary).** Would let "make briefs shorter for my smaller deals" resolve "smaller" quantitatively. **Cost: low.**
- **The member's recent `agent_actions_log` outputs.** If the user is asking to change behavior, the interpreter should see actual current behavior. **Cost: medium.**
- **Active manager directives for this role/vertical.** If the user's request contradicts a mandatory directive, the interpreter should say so explicitly. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- None beyond the above; existing columns suffice.

**Truncation and Shape Risks**

- Full `currentConfig` is passed without schema doc other than the system-prompt field list — malformed input cascades. Not a truncation problem.

**Impact Estimate**

This is the NL-to-structured config layer. A bad interpretation directly mutates agent behavior for every future prompt call (#4, #11, #12). Closing the gap to include history + directives + observed behavior lifts correctness. **MEDIUM** — low-volume surface but high blast radius.

**Blast Radius Note**

Writes `agent_configs` + `agent_config_versions`. Every #4/#11/#12 call for this member reads the result.

---

### 14. Close Analysis (Win/Loss)

**Current Context Shape**

- Deal header: `${dealRow.name}, ${companyName}, outcome, ${dealValue} (€-hardcoded), ${vertical}, ${competitor}, ${daysInPipeline}`.
- `${stageHistory}` — up to 10 `deal_stage_history` rows (from_stage → to_stage, reason, date).
- `${meddpicc}` — all 7 dimensions from `meddpicc_fields` with evidence text + confidence.
- `${relevantContacts}` — contacts for the deal's company with per-contact `engagement` count (activities where `contactId` matches OR subject/description ILIKE contact name).
- `${transcriptData}` — up to 5 call transcripts joined with `call_analyses` (title, date, callQualityScore, summary, painPoints, competitiveMentions, nextSteps) — **summaries only, not transcript text**.
- `${dealObservations}` — 10 recent observations for the deal with `rawInput` + classification signal types.
- `${recentActivities}` — first 10 of 20 activities with `type: subject || description`.
- `${sysIntel}` — 5 system_intelligence rows with title + insight (vertical-filtered).

**Context Gaps — What's Missing That the System Has**

- **Full transcript text.** `call_transcripts.transcript_text` is not passed; only `call_analyses.summary` + `painPoints` + `nextSteps`. The close-lost story often lives in specific quotes ("Henrik said on 3/15: 'If security review takes another month we'll go with Microsoft'"). The summary does not preserve those quotes. **Cost: medium** (prompt budget).
- **Email bodies.** Same as #12 gap — activities for email types pass subject+date only. The loss-driving email exchange is invisible. **Cost: low.**
- **Agent memory / deal-theory history.** `deal_agent_states.learnings`, `risk_signals`, `competitive_context`, `coordinated_intel` — accumulated over the life of the deal. Not passed. **Cost: low.**
- **Coordinator patterns referencing this deal or competitor.** `coordinator_patterns` where `deal_ids @> [dealId]` OR (`competitor = thisCompetitor AND vertical = thisVertical`). The loss may be part of a documented org-wide pattern; the analysis should reference it. **Cost: low.**
- **Deal fitness events + scores trajectory.** `deal_fitness_events` and `deal_fitness_scores.buyer_momentum.commitmentFollowThrough`, `stakeholder_engagement`, `conversation_signals`. Exactly the buyer-behavior evidence that oDeal exists to track — and it's not in the close analysis. **Cost: low.**
- **Prior AI close analyses on similar past losses.** `deals.close_ai_analysis` jsonb across recent closed-lost deals in the same vertical with the same competitor. Would let the prompt say "this is the 4th loss to Microsoft DAX in healthcare in Q1" rather than treating each loss as isolated. **Cost: low.**
- **Prior call prep briefs.** `activities` where `type='call_prep' AND deal_id=X` — the briefs show what risks the system flagged over time. Comparing flagged-risks to actual-loss-reason is the feedback loop that should exist. **Cost: low.**
- **Observation cluster context.** `observation_clusters` referenced by this deal's observations. Cluster-level severity and count add meaning to each observation. **Cost: low.**
- **MEDDPICC score deltas over time.** Every pipeline run writes a delta activity; the trajectory ("Economic Buyer confidence dropped 60→20 after the CFO changed") is the story. Prompt sees only the current snapshot. **Cost: medium.**
- **Email sequences sent to the deal.** `email_sequences` + `email_steps`. Multi-touch campaign attempts, which were opened/replied. **Cost: low.**
- **Win/loss outcomes from other deals the same champion worked on.** If the champion has been on 3 other deals that lost, that's a signal. `contacts` doesn't link across companies (per 02-SCHEMA — FK-locked to one company) but `people` table in v2 (DECISIONS.md 2.19) will. Today this is **not available**.

**Context Gaps — What's Missing That the System Should Generate**

- **The continuously-updated "deal theory" mandated by DECISIONS.md 1.1 LOCKED: "Continuous pre-analysis on every transcript and email (lightweight Claude call updates a rolling 'deal theory')."** This does not exist. Current Nexus runs close analysis as a single pass at close time with no prior theory accumulation. DECISIONS.md 1.1 explicitly notes: "Current Nexus does NOT meet this spec (Prompt 7 finding). Close capture today is a single-pass LLM call with no prior deal theory. v2 must implement the continuous pre-analysis path." The event-sourced architecture (DECISIONS.md 2.16) is the plumbing for this. **Cost: high** (requires event-source scaffolding + every-pipeline-run theory update).
- **Hypothesis validation against event stream per DECISIONS.md 2.21.** Before surfacing a hypothesis, the system should verify it against `deal_events`. Not built. **Cost: medium** (requires event store first).
- **Per-factor verification score.** Each AI-generated factor should have a confidence drawn from how many events back it. Not computed. **Cost: medium.**
- **Taxonomy-promotion logic.** DECISIONS.md 1.1 says: "When hypotheses surface uncategorized reasons, flag as candidates. If 3+ deals accumulate similar uncategorized reasons, surface to Jeff/Marcus." Zero code implements this. **Cost: medium.**

**Truncation and Shape Risks**

- `transcriptData` renders per-transcript as `Summary: ${summary} / Pain points: ${JSON.stringify(painPoints)} / Competitive mentions: ${JSON.stringify(competitiveMentions)} / Next steps: ${JSON.stringify(nextSteps)}`. JSON-stringified arrays in-prompt are parseable by Claude but burn tokens and are brittle.
- Transcript text itself entirely missing — this is the biggest data-shape loss in any prompt in the system.
- `relevantContacts` engagement count uses ILIKE substring — approximate. Count of "2" may understate an actively-engaged stakeholder.
- `factors[].category` interpolates pipe-separated enum literal `"competitor|stakeholder|process|..."` directly into the spec line (known issue per 04-PROMPTS); model sometimes returns the pipe-separated literal as the value.
- MEDDPICC values in prompt show `${meddpicc.metrics || "N/A"} (confidence: ${metricsConfidence}%)`. The actual evidence-text that populated the dimension is the `metrics` value itself — so evidence IS passed, but mixed into a single line with no separation between narrative and score.

**Impact Estimate**

This is the flagship surface for DECISIONS.md 1.1 LOCKED. The stated target is "VP of Sales grade hypothesis — an argument with depth, not a summary." The prompt receives no transcript text, no deal theory, no coordinator patterns, no fitness narrative, no MEDDPICC trajectory. It is mathematically incapable of producing a VP-grade hypothesis from the context it is given. **CRITICAL.** Continuous pre-analysis (DECISIONS.md 1.1) + event-sourced deal theory (2.16) are the load-bearing architectural fixes; closing those gaps is the centerpiece of the v2 rebuild.

**Blast Radius Note**

Output shapes the close modal chips/questions the rep reacts to (DECISIONS.md 1.2 research-interview pattern — partial implementation). Confirmed factors write to `deals.close_factors`/`win_factors` AND create `observations` rows AND feed `/api/intelligence` Close Intelligence tab AND feed prompt #11 (win/loss patterns for vertical). A weak close analysis cascades into every future call prep for every future deal in the vertical.

---

### 15. Deal Fitness Analysis (The oDeal Framework)

**Current Context Shape**

- Deal header: `${dealRow.name} | ${companyName} | ${vertical} | Stage | Value ($ hardcoded) | Close date`.
- `${contactsText}` — all contacts on the company with `name, title, role_in_deal`.
- `${existingKeysText}` — event_keys of previously-detected events, OR "None — this is the first analysis for this deal."
- `${timelineText}` — chronological timeline, built from:
  - `call_transcripts` where `transcript_text` length > 50: full transcript text, joined with `participants` jsonb.
  - `activities` filtered to `type IN ('email_sent','email_received')`: subject, description body, `metadata.{direction, from, to, responseTimeHours}`.
  - Sorted by date ascending; separator `════════════════════════════════════════`.

**Context Gaps — What's Missing That the System Has**

- **MEDDPICC scores.** `meddpicc_fields` — buyer behavior and MEDDPICC are adjacent; champion presence / economic buyer confidence directly relates to `buyer_introduces_economic_buyer`, `buyer_identifies_sponsor` events. Not passed. **Cost: low.**
- **Deal stage history.** `deal_stage_history` — which events happened in which stage. A fitness event detected in Discovery should weight differently than one in Negotiation. **Cost: low.**
- **Prior fitness events being re-evaluated.** Currently the prompt only sees `existingKeysText` (a list of already-detected event keys). The **evidence snippets** from prior detection are not passed — Claude re-reads the full transcript and may lose context, downgrade a previously-strong detection, or double-count. The code uses delete-then-insert to avoid duplicates but loses continuity. **Cost: low.**
- **Prior `deal_fitness_scores.stakeholder_engagement`, `buyer_momentum`, `conversation_signals` jsonb.** These contain the prior call's response-time trajectory, ownership language trajectory, commitment tracking. Claude must re-derive every time. **Cost: low.**
- **Observations linked to the deal.** `observations` where `linked_deal_ids @> [dealId]` — field observations often directly describe buyer behavior that qualifies as events (e.g., "Champion said he'd present to CFO next Tuesday" = commitment). Not passed. **Cost: low.**
- **Agent memory.** `deal_agent_states.learnings`, `risk_signals`, `competitive_context` — strategic synthesis. Not passed. **Cost: low.**
- **Coordinator patterns.** Same story. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Seller behavior baseline" per rep.** Since oDeal specifies "we are measuring BUYER behavior, not seller behavior," the model needs to distinguish them. Today the model must infer who is the seller from context. A per-rep seller-name list (team_members for this AE + SA + BDR) and their emails/ speaking patterns would sharpen detection. **Cost: trivial.**
- **"Email thread graph" per deal.** Who emailed whom, when, in what order. Derivable from `activities.metadata.{from, to}` but not structured in the prompt. Useful for `buyer_initiates_contact`, `buyer_response_accelerating`, `buyer_technical_team_joins`. **Cost: low.**
- **Language-progression priors per stage.** What ownership-language % is normal for Proposal vs. Negotiation (across won deals)? Enables calibrated assessment. **Cost: medium.**

**Truncation and Shape Risks**

- **No explicit transcript truncation** — the full `transcript_text` is embedded per entry. At 16K output tokens and Sonnet 4's context window, long-call deals (8+ transcripts × 4K chars each = 32K+ input) are likely to exceed practical budget. Silent tokens-used-up = Claude's output truncates mid-JSON = full 25-event output corrupted. The 16K output cap is the highest in the codebase for exactly this reason.
- Email activities use `metadata.description` for body content — `description` field may be short or absent for activities written elsewhere in the codebase.
- `existingKeysText` is only the keys; evidence snippets lost. Reanalyses cannot be additive.
- **Hardcoded fallback values in post-processing:** per 04-PROMPTS known issue, the code fills in hardcoded defaults (`week: 0`, `benchmark.wonDealAvg: 60`) for `stakeholderEngagement` / `buyerMomentum` / `conversationSignals` even when Claude produced better data.
- Canonical `ALL_EVENTS` in code drives the not_yet fallback. The example JSON in the system prompt references `buyer_assigns_day_to_day_owner` — **not in the canonical 25-event list**. A known unreachable example that the model may still emit.

**Impact Estimate**

Fitness analysis is the second-largest prompt in the system (16K output) and the only one explicitly framed around buyer-behavior evidence. The prompt is reasonably self-contained (full transcripts IS passed) but the **gap between prior analyses being fully re-derived vs. incrementally updated is the biggest quality risk** — every pipeline run re-analyzes everything, introducing score drift, and losing evidence snippets from prior runs. Adding MEDDPICC + prior-run evidence snippets + observations would tighten detection. **HIGH.** Not CRITICAL because the core data (transcripts) IS passed; the gaps are refinements, not fundamental.

**Blast Radius Note**

Output writes `deal_fitness_events` (delete-then-insert 25 rows) and `deal_fitness_scores` (upsert). Feeds `/deal-fitness` page, feeds prompt #11's fitness-context section (overall scores + not_yet gaps + buyer commitments), and per DECISIONS.md 2.16 should feed the event stream.

---

### 16. Customer Response Kit

**Current Context Shape**

- Customer message: `${contactName, contactTitle, companyName, subject, channel, receivedAt, body}`.
- Account context: company+vertical+ARR+contract_status+health_score+health_trend+products_purchased+renewal_date+days_since_touch.
- `${usageMetricsStr}`, `${stakeholdersStr}`, `${riskSignalsStr}`, `${expansionSignalsStr}` — each built from corresponding `account_health` jsonb column.
- `${articlesStr}` — `knowledge_articles` pre-filtered client-side by vertical/tags/article_type.
- `${otherAccounts}` — summary of other accounts in the same vertical.
- `${sysIntelStr}` — system_intelligence for vertical.

**Context Gaps — What's Missing That the System Has**

- **Prior customer messages and response history.** `customer_messages` where `company_id = thisCompanyId AND responded_at IS NOT NULL`. The full conversation history with this account. Not passed. **Cost: low.**
- **Prior response kits and whether they led to resolution.** `customer_messages.response_kit` jsonb across resolved messages. Lets the model say "you wrote a similar reply two weeks ago for this customer, here's what worked / didn't". **Cost: low.**
- **Contracted use cases detail.** `account_health.contracted_use_cases` jsonb — adoption status per team. Deeply relevant to technical issues and adoption-help categories. **Cost: low.**
- **Expansion map.** `account_health.expansion_map` jsonb. For renewal/expansion messages, the whitespace map is the literal answer. **Cost: low.**
- **Proactive signals.** `account_health.proactive_signals` jsonb. Industry news, product releases, customer news — the prompt has RelevantKBArticles but not the "context for outreach" that's already pre-computed. **Cost: low.**
- **Observations linked to this account.** `observations` where `linked_account_ids @> [companyId]`. Cross-rep signals about this account. **Cost: low.**
- **Similar situations across book.** `account_health.similar_situations` jsonb — pre-computed cross-account patterns. **Cost: low.**
- **Recommended resources prior.** `account_health.recommended_resources` jsonb — prior-curated resource pointers. **Cost: low.**
- **Full knowledge-article text, not just title.** Articles are pre-filtered and serialized; need to verify whether `content` or just `summary` is in `articlesStr`. If summary-only, the model may recommend an article that doesn't actually address the issue. Worth verifying in Prompt 4.5b. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Account mood" derived signal.** Aggregated sentiment from recent `customer_messages` + `observations` + `activities`. Lets the draft_reply calibrate tone. **Cost: medium.**

**Truncation and Shape Risks**

- `similar_resolutions[].account_name` is free-form — model can and does invent accounts that don't exist (known issue per 04-PROMPTS #16). Passing a structured list of real account names in `otherAccounts` that the model is constrained to choose from would eliminate this.
- `otherAccounts` shape not verified in this audit; likely summary-level which loses per-account specificity.
- Hardcoded "100+ accounts with no Customer Success team" in the system prompt locks this to Sarah Chen's role — v2 should parameterize.

**Impact Estimate**

Response kit is the core My Book feature. Missing prior-conversation history means every kit starts from a cold read of the current message. Adding prior messages, use-case adoption, expansion map, and proactive signals would shift the kit from "reasonable draft" to "demonstrably account-specific". **HIGH.**

**Blast Radius Note**

Kit is cached to `customer_messages.response_kit` jsonb. One round of low-quality kits pollutes future "similar_resolutions" references.

---

### 17. QBR Agenda Generator

**Current Context Shape**

- `${qbrType}` — one of 4 values.
- `${companyName}`.
- `${accountContext}` — full jsonb object **passed from the client**. No DB reads by this route.

**Context Gaps — What's Missing That the System Has**

- **Authoritative server-side account data.** The prompt trusts the client-supplied accountContext. Per DECISIONS.md 2.11 LOCKED: "No client-controlled flags gate server-side trust decisions." `accountContext` is not a trust flag, but it is client-asserted data determining QBR output; the server should re-fetch from `account_health`, `companies`, `contacts`, `customer_messages` to avoid stale UI state poisoning the brief. **Cost: low.**
- **Prior QBR briefs.** No storage exists for QBR output today (it's returned and rendered inline per 07-DATA-FLOWS Flow 6, issue note — actually QBR output is "Not persisted" per prompt #17 downstream). v2 should persist. Missing continuity between QBRs. **Cost: medium.**
- **Customer message history.** `customer_messages` for this company. Recent pain points and requests. **Cost: low.**
- **Related observations.** `observations` linked to the account. **Cost: low.**
- **Deal history.** Closed-won deal + expansion deals. Prior pipeline behavior shapes QBR agenda. **Cost: low.**
- **Health factor trajectory.** `account_health.health_factors` jsonb — per-factor scores. Today the prompt sees only overall health_score. **Cost: trivial.**
- **Competitive context.** `companies.enrichment_data` jsonb may have competitor info; system_intelligence for the vertical. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"QBR readiness score" derivation.** What % of use cases are on_track? What % of stakeholders are engaged? One composite score that drives agenda prioritization. **Cost: low.**

**Truncation and Shape Risks**

- Whole context is JSON.stringify of a client-passed object. No schema hint, no truncation control. A large account with hundreds of usage metrics could overflow context silently.
- Product-hardcoded system prompt ("Claude AI, Claude Code, Cowork") — not a context issue but a reuse blocker.

**Impact Estimate**

QBR prep is lower-frequency than response kits but higher-value per invocation (drives major stakeholder meetings). Missing customer_messages and observations means the agenda misses concrete recent pain points. **MEDIUM.**

**Blast Radius Note**

Returned and rendered inline; not persisted. Self-contained.

---

### 18. Customer Outreach Email

**Current Context Shape**

- `${type}` — "use_case_checkin" or "proactive_signal".
- `${purposes[]}` + `${purposeGuides}` — user-selected purposes + lookup-table guidance.
- `${additionalContext}` — free-text from rep.
- For `use_case_checkin`: `${useCase.{team, seats, activeUsers, product, useCase, expectedOutcome, adoptionStatus, notes}}`.
- For `proactive_signal`: `${signal.{type, signal, relevance, action}}`.
- `${accountContext.{healthScore, arr, productsPurchased, contractStatus, daysSinceTouch, renewalDate}}`.
- `${recipientName, recipientTitle, companyName, vertical}`.
- **All DB-less — context is client-passed.**

**Context Gaps — What's Missing That the System Has**

- **Recipient's engagement history.** `activities` for this contact — prior email opens, replies, no-replies. Needed to calibrate tone. **Cost: low.**
- **Prior outreach emails sent to this contact.** `activities` where `type IN ('email_sent', 'email_received')` for this deal/account. Avoid repeating approach. **Cost: low.**
- **Prior customer messages from this contact.** `customer_messages.body` — what they've raised. Directly relevant context. **Cost: low.**
- **Agent config for voice.** `agent_configs` for the sending rep. Today "Sign off as Sarah" is hardcoded — no voice parameterization. **Cost: low.**
- **Cross-agent feedback.** `cross_agent_feedback` targeting the sending rep about this account. **Cost: low.**
- **Similar_situations + recommended_resources from account_health.** Already pre-computed; not passed to this prompt though. **Cost: trivial.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Warm vs. cold" classification for recipient.** Based on recent engagement. Today the prompt writes the same formality level regardless. **Cost: low.**

**Truncation and Shape Risks**

- No DB reads at all — entirely client-trusted context. Same issue as #17 + the added risk that email content is sent out externally.
- Hardcoded "Sign off as Sarah" limits applicability.

**Impact Estimate**

Drafts emails that go to customers. Missing recipient history means a cold-outreach-feeling email when the recipient has replied 5 times in the last month. **MEDIUM.**

**Blast Radius Note**

Not persisted — rep reviews and sends (or doesn't) from the UI. Self-contained.

---

### 19. Pipeline Step — Extract Actions (Actor)

**Current Context Shape**

- `${input.companyName}` — passed from `/api/transcript-pipeline` enqueue.
- `${input.transcriptText.slice(0, 15000)}` — transcript truncated at 15K chars.

**Context Gaps — What's Missing That the System Has**

- **Deal name + stage + vertical.** Already in `input` (other parallel calls use it). Would let "action items" reference "for this Negotiation-stage healthcare deal". **Cost: trivial.**
- **Existing contacts with roles.** `input.existingContacts` — extracted in enqueue. Not passed to this call. The `owner` field in output is a free-text name today; passing contacts lets the model pick real IDs. **Cost: trivial.**
- **Prior action items not yet closed.** `activities` where `metadata.action_items` exists. Actions accumulate across calls; treating each call as isolated means overdue actions are lost. **Cost: low.**
- **MEDDPICC current scores.** `input.currentMeddpicc` — also enqueue-assembled and available. Enables actions like "confirm with Economic Buyer" more concretely. **Cost: trivial.**

**Context Gaps — What's Missing That the System Should Generate**

- **Action-item completion status lookup.** Fuzzy-match prior action items against current transcript to mark them completed. Today actions are never closed. **Cost: medium.**

**Truncation and Shape Risks**

- **15K-char truncation drops late-transcript content.** Action items and commitments often appear at the end ("here's what we'll do next..."). A 19-minute dense transcript can exceed 15K. Silent loss.
- Varying truncation across pipeline steps (15K / 12K / 8K) means "actions" sees more text than "learnings synthesis" (#22) — a downstream synthesis prompt has LESS context than the step it synthesizes from.

**Impact Estimate**

Action items drive follow-up email drafting (#24) and agent memory updates. Generic output here makes every downstream step generic. **MEDIUM.** Not HIGH because the data is present (just not passed) — fix is nearly free.

**Blast Radius Note**

Output feeds #22 (synthesize learnings), #24 (draft email), #8 (save-state-to-supabase summary), and the deal agent's `recordInteraction`.

---

### 20. Pipeline Step — Score MEDDPICC (Actor)

**Current Context Shape**

- `${currentScores}` — comma-separated `"dimensionConfidence: N"` pairs from `input.currentMeddpicc`, OR "No existing scores".
- `${input.transcriptText.slice(0, 15000)}`.

**Context Gaps — What's Missing That the System Has**

- **Current evidence text per dimension, not just confidence.** `meddpicc_fields.metrics`, `.economic_buyer`, etc. are the narrative strings. The prompt passes only confidence numbers — so Claude re-scores without knowing what evidence already exists. Result: re-evidences the same quotes, and cannot judge whether a new quote is stronger than the existing one. **Cost: trivial** (already in `currentMeddpicc`).
- **Deal basics.** Vertical, stage, competitor — affects how to weigh evidence. Not passed. **Cost: trivial.**
- **Contact roles.** `existingContacts` with `role_in_deal`. A statement from someone tagged `economic_buyer` scores Economic Buyer differently than the same statement from an end_user. **Cost: trivial.**
- **Prior MEDDPICC updates (deltas).** `activities` where `metadata.source='transcript_pipeline' AND metadata.updates` — trajectory over time. **Cost: low.**
- **Manager directives relevant to MEDDPICC qualification.** Some directives specify minimum confidence thresholds. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **Dimension-specific transcript extracts.** Pre-extract segments of the transcript likely to discuss each dimension (regex/NER). Would let the prompt see focused text per dimension instead of 15K generic chars. **Cost: medium.**

**Truncation and Shape Risks**

- Same 15K truncation as #19.
- Prompt instructs "Only include dimensions with new evidence" but without seeing existing evidence text, the model can't reliably judge "new vs. same" — so it may score a dimension up based on evidence that's already recorded.
- `currentScores` format is flat key:value string; no structure.

**Impact Estimate**

MEDDPICC is the core deal-qualification object. Scoring without existing evidence context means every re-run of the pipeline may rewrite dimensions with "new" scores derived from the same quotes. **HIGH.**

**Blast Radius Note**

Writes `meddpicc_fields` (upsert) + `activities` (delta audit). Read by prompts #8, #11, #14, MCP `get_deal_details`, `/intelligence/field-feed`, UI MEDDPICC tab.

---

### 21. Pipeline Step — Detect Signals (Actor)

**Current Context Shape**

- `${input.vertical}` in system prompt.
- `${input.dealName}, ${input.companyName}, ${input.vertical}` in user prompt.
- `${contactsCtx}` — semicolon-joined `"{name} ({title}, {role})"` from `input.existingContacts`.
- `${input.transcriptText.slice(0, 15000)}`.

**Context Gaps — What's Missing That the System Has**

- **Current MEDDPICC.** Economic Buyer / Champion confidence directly flags `deal_blocker` vs. `process_friction` classification. **Cost: trivial.**
- **Deal stage and competitor.** Already in `input`, not in prompt. A signal like "pricing pushback" reads differently in Discovery vs. Negotiation. **Cost: trivial.**
- **Active experiments for this AE.** Already passed to #23 (conditional experiment check) but not to #21 (signal detection). A signal that aligns with an active experiment tactic should be flagged. **Cost: trivial.**
- **Existing open signals for the deal.** `observations` where `source_context.dealId = this AND status != 'resolved'`. Would let the prompt recognize "this is the 3rd time this deal has flagged security review delays" and raise urgency. **Cost: low.**
- **Coordinator patterns matching this vertical.** Flag signals that match existing cross-deal patterns. **Cost: low.**
- **The canonical 9 signal types per prompt #1.** This prompt enumerates 7; it lacks `agent_tuning` and `cross_agent`. Per 04-PROMPTS Inconsistencies and 07-DATA-FLOWS Flow 1 known issue #3, this drift has been documented but not fixed. Adds no new context — fixes a shape issue. **Cost: trivial.**

**Context Gaps — What's Missing That the System Should Generate**

- **Per-stakeholder sentiment baseline.** What does this stakeholder usually sound like? Detecting a shift requires a baseline. Today each call's sentiment assessment is stateless. **Cost: medium.**

**Truncation and Shape Risks**

- Same 15K truncation.
- Signal-type enumeration in the system prompt DIVERGES from prompt #1's enumeration (7 vs. 9). Pipeline-generated observations can therefore never have signal_type `agent_tuning` or `cross_agent`, meaning the agent-config auto-update path (prompt #4) never fires from pipeline signals.

**Impact Estimate**

Signals feed the coordinator + observations table + agent memory risk signals + call prep proven-plays section. Every gap compounds. Fixing the 7-vs-9 enum drift is low cost, high impact. Adding MEDDPICC / stage / coordinator context would sharpen signal quality. **HIGH.**

**Blast Radius Note**

One signal = one observation = one routing record = possibly one coordinator pattern = possibly surfaced in every future call prep in the vertical. Highest blast radius per-output-item of any pipeline step.

---

### 22. Pipeline Step — Synthesize Learnings (Actor)

**Current Context Shape**

- `${input.dealName, companyName, vertical}`.
- `${JSON.stringify(actions)}` — output of #19.
- `${JSON.stringify(meddpicc)}` — output of #20.
- `${JSON.stringify(signals.signals)}` — output of #21.
- `${JSON.stringify(signals.stakeholderInsights)}` — output of #21.
- `${input.transcriptText.slice(0, 8000)}` — **transcript truncated at 8K, lower than 15K for upstream calls**.

**Context Gaps — What's Missing That the System Has**

- **Prior learnings from this deal.** `deal_agent_states.learnings` jsonb. Synthesis should be additive, not redundant. Not passed. **Cost: trivial.**
- **Prior risk signals.** `deal_agent_states.risk_signals`. Same. **Cost: trivial.**
- **Current MEDDPICC evidence text.** Not just the `meddpicc` update deltas from #20. **Cost: trivial.**
- **Stage history.** `deal_stage_history`. Learnings should reference arc. **Cost: low.**
- **Prior observation cluster memberships for the deal.** `observations` ⨝ `observation_clusters` where observations.linkedDealIds @> [dealId]. Synthesis should recognize "this is the Nth call flagging the same cluster pattern". **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **De-duplication signal.** A similarity score against existing `learnings[]` to avoid writing "the customer cares about compliance" for the 5th time. Current code merges via string equality. **Cost: low.**

**Truncation and Shape Risks**

- **8K transcript truncation is smaller than the 15K the upstream calls saw.** A learning that references late-transcript detail may have been seen by signal-detection but not by synthesis. Absurd: the synthesis step sees LESS context than the step it synthesizes from.
- JSON.stringify-ing actions + meddpicc + signals + stakeholderInsights produces a wall of JSON — model must parse and re-prioritize. A structured outline ("Action items found: N / MEDDPICC changes: N / Signals: N") with named sections would be cleaner.
- Good/bad-example pairs in the prompt are excellent and should be preserved — this is one of the stronger shape devices in the codebase.

**Impact Estimate**

Learnings feed `deal_agent_states.learnings`, which flow into call prep via `formatMemoryForPrompt`. Every pipeline run's learnings are the deal agent's long-term memory. Missing prior-learnings context means duplicate entries accumulate; missing late-transcript content means incomplete synthesis. **HIGH.**

**Blast Radius Note**

Feeds `deal_agent_states.learnings` — directly consumed by prompt #11 (call prep). Persistent across sessions. Low-quality learnings degrade every future call prep.

---

### 23. Pipeline Step — Experiment Attribution (Actor, Conditional)

**Current Context Shape**

- `${experiments}` — list from `input.activeExperiments` (playbook_ideas where status='testing' AND AE in test_group). Each rendered as `"- "${title}" (ID: ${id}): ${hypothesis} (Category: ${category})"`.
- `${input.transcriptText.slice(0, 12000)}` — transcript at 12K.

**Context Gaps — What's Missing That the System Has**

- **Existing experiment evidence.** `playbook_ideas.experiment_evidence` jsonb for each experiment — the tactics that have already been attributed. Lets the prompt identify a strengthening pattern vs. recognize a once-off. **Cost: trivial.**
- **Success thresholds and current metrics.** `success_thresholds`, `current_metrics` — calibrate urgency. **Cost: trivial.**
- **The AE's previous experiment attributions across other deals.** `playbook_ideas.experiment_evidence` where tacticUsed=true for this AE. Lets the model recognize rep-specific patterns. **Cost: low.**
- **Contact context.** Relevant when attribution depends on who was in the meeting (e.g., "built prototype during session" requires a Technical Evaluator to be present). **Cost: trivial.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Applicability gate check" per DECISIONS.md 2.21 LOCKED.** Experiments should carry structured `applicability` JSONB and the attribution prompt should only run against experiments whose applicability matches the deal's current state. Today all active experiments for the AE are checked blindly. **Cost: medium** (requires applicability schema).

**Truncation and Shape Risks**

- 12K truncation is a middle-ground choice — smaller than signal detection (15K) but larger than learnings synthesis (8K). The pattern of varied truncation across pipeline steps is a consistency debt rather than a context issue per se.
- Experiment format line is bare: `"- ${title} (ID: ${id}): ${hypothesis}"`. No category-specific detection hint or example of what the tactic looks like in practice.

**Impact Estimate**

Experiment attribution is the evidence-accumulation engine for DECISIONS.md 1.3-1.6 LOCKED experiment lifecycle. Missing applicability gating means attribution runs against experiments that don't apply to the deal's situation, poisoning evidence counts. **MEDIUM** in isolation but **HIGH** for the experiment lifecycle's integrity once v2 ships.

**Blast Radius Note**

Writes `playbook_ideas.experiment_evidence` — feeds graduation decisions, which feed proven-plays injection into prompt #11.

---

### 24. Pipeline Step — Draft Follow-Up Email (Actor)

**Current Context Shape**

- `${input.companyName}`, `${input.dealName}`.
- `${JSON.stringify(actions)}` — from #19.
- `${JSON.stringify(signals.stakeholderInsights.map(s => s.name))}` — just names.
- `${input.agentConfigInstructions}` (optional) — rep's communication style.

**Context Gaps — What's Missing That the System Has**

- **Recipient's title, role, prior engagement.** `existingContacts` is in `input`. Passing stakeholders with titles/roles would let the email target the right person appropriately. Today it's a list of names. **Cost: trivial.**
- **Prior email exchange on this deal.** `activities` email rows. Threading context. **Cost: low.**
- **Deal stage and MEDDPICC gaps.** A follow-up from Discovery should sound different than from Negotiation. **Cost: trivial.**
- **Action items the buyer committed to (not just seller actions).** `signals.signals` where type='buyer_commitment' (not today) or derivation from prompt #15's `commitmentTracking`. Let the email reinforce buyer promises, not just seller to-dos. **Cost: low.**
- **Relevant resources.** `resources` filtered by vertical. Same shape as #12. Not passed. **Cost: low.**
- **Agent memory (learnings, risk signals).** `deal_agent_states`. **Cost: low.**
- **Manager directives.** Voice/content rules. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Appropriate level of formality" read.** Derived from prior email thread style. **Cost: medium.**

**Truncation and Shape Risks**

- Stakeholders reduced to just names; titles/roles dropped.
- Actions passed as JSON.stringify — OK but a structured "owner → commitment → deadline" list would read more clearly.
- Email draft prompt and `/api/agent/draft-email` (#12) produce different shapes with different system prompts — known duplication per 04-PROMPTS #24.

**Impact Estimate**

This email fires automatically after every pipeline run (per Flow 1). Low context = generic email. A follow-up that references specific buyer commitments, stakeholder concerns, and stage would actually be sendable. Today's output is at best a reasonable template. **HIGH** per-invocation but graceful-failure wrapped so pipeline doesn't break on a bad one.

**Blast Radius Note**

Rendered in workflow tracker; does NOT persist unless rep saves. Also #12 separately handles on-demand drafting. Consolidate in v2 per DECISIONS.md 2.13 "one email-drafting service".

---

### 25. Coordinator Pattern Synthesis (Actor)

**Current Context Shape**

- `${pattern.vertical}`, `${pattern.signalType}`.
- `${signalSummary}` — multi-line `"- ${dealName} (${companyName}): ${content}"` per signal in the pattern.
- `${pattern.competitor}` (conditional) — competitor name for competitive_intel patterns.
- `${pattern.dealIds.length}`, `${pattern.dealNames.join(", ")}`.
- **`system: ""` — no system prompt.** User message contains the whole instruction.

**Context Gaps — What's Missing That the System Has**

- **Deal stage per signal.** Pattern signals come from deals at different stages. A pattern across 3 Discovery deals reads differently than across 3 Negotiation deals. The coordinator stores `signal.stage` in the per-signal jsonb but does not pass it. **Cost: trivial.**
- **ARR per deal in the pattern.** Known in the actor state. Synthesis should quantify risk — it currently asks Claude for an `arrImpactMultiplier` without providing the individual ARRs. **Cost: trivial.**
- **Stakeholder context per deal.** Which roles said what. A pattern where CFOs pushed back is different from a pattern where end users complained. **Cost: low** (add via `signal.sourceSpeaker` + contacts lookup).
- **Prior synthesized patterns of the same type.** `coordinator_patterns` where `signal_type = thisType AND vertical = thisVertical`. Recognize "this is an escalation of last week's pattern" vs. a new one. **Cost: low.**
- **Prior recommendations that worked or didn't.** Feedback loop on past recommendations — did AEs execute them? Did deals progress? Not tracked today. **Cost: medium.**
- **Related playbook experiments (testing or graduated).** Patterns should surface existing experiments addressing the issue. **Cost: low.**
- **System intelligence for vertical.** `system_intelligence` active for the vertical. **Cost: low.**
- **Manager directives.** Recommendations should not contradict mandatory directives. **Cost: low.**

**Context Gaps — What's Missing That the System Should Generate**

- **"Pattern lineage" timestamps.** When was this first detected? How has it evolved? Derivable from `coordinator_patterns.detected_at` + `updated_at`. **Cost: trivial.**

**Truncation and Shape Risks**

- **Empty system prompt** is the sharpest anomaly (flagged in DECISIONS.md 2.14 OPEN). Reduces role discipline.
- `signalSummary` renders each signal as one line of free text. The signal's `urgency`, `sourceSpeaker`, `quote` (from prompt #21 output) are dropped — only `.content` is shown.
- Competitor conditional is interpolated on a single line; empty string when absent (no elegant omission of the line).
- Coordinator operates from in-memory `patterns[]` which is lost on actor destruction. Per 07-DATA-FLOWS Flow 6 BROKEN, the downstream push to deal agents is a no-op — so even a perfect synthesis here doesn't reach call prep until the coordinator→call-prep wiring lands (DECISIONS.md 2.17).

**Impact Estimate**

Cross-deal pattern synthesis is the Act 2 narrative. Current prompt has thin input (just `content` per signal, no stage/ARR/stakeholder/priors) AND its output goes nowhere usable (DECISIONS.md 2.17 fix required). Both sides broken. Fixing the context side is low-cost; fixing the downstream path per 2.17 is separate plumbing. **HIGH** — coordinator is the one surface that actively exists in code AND is explicitly listed as required input for call prep in LOCKED 2.17.

**Blast Radius Note**

Writes `coordinator_patterns` + (today no-op) pushes to deal agents. In v2 per 2.17, call prep queries `coordinator_patterns` directly — so synthesis quality directly shapes every future call prep.

---

## Cross-Cutting Context Findings

### 1. Structural gaps

Patterns seen systematically across many prompts:

1. **No continuous deal theory / no event stream.** DECISIONS.md 1.1 LOCKED and 2.16 LOCKED mandate an event-sourced intelligence layer with rolling deal theory. **Zero prompts read from such a stream today because it does not exist.** Every pipeline run re-derives from scratch, every close analysis ignores prior inferred hypotheses, every call prep starts from raw deal data rather than accumulated understanding. This is the single largest structural gap across the audit.

2. **Coordinator patterns never reach call prep.** Per DECISIONS.md 2.17 LOCKED: "Call prep MUST query the coordinator." 07-DATA-FLOWS Flow 6 documents the BROKEN plumbing — `coordinator_patterns` is written, `dealAgentStates.coordinatedIntel` is read, but nothing writes between them. Prompts #11, #14, #8, #6, #9, #10, #12, #22, #24 all lack coordinator context. This is one missing DB write / one query addition from being systemic across 9 prompts.

3. **Prior call content (transcripts + emails) is routinely summarized, not quoted.** Prompt #11 sees call summaries, not transcripts. Prompt #12 sees email subjects + dates, not bodies. Prompt #14 sees call summaries + competitive mention arrays, not transcripts. Prompt #8 sees activity subjects, not content. Across the pipeline-downstream prompts, the raw buyer voice is present at #19/#20/#21 (truncated to 15K) and then discarded. Prompts that reconstruct deal state have to work from pre-digested summaries produced by earlier summaries.

4. **MEDDPICC evidence text passed inconsistently.** Prompts #1, #3, #4, #7, #17, #18, #19, #21, #22, #23, #24, #25 do not see MEDDPICC at all. Prompts #8, #14 see it fully. Prompt #11 sees it structurally. Prompt #20 sees only confidence numbers, not the evidence text even though both are in the same row. MEDDPICC is the central qualification object and its systematic absence from analytic prompts is a structural miss.

5. **Stakeholder engagement data is rarely included and when present is approximate.** `contacts.role_in_deal` is passed in #11 and #14 but engagement is derived inline via N+1 ILIKE substring queries. `deal_fitness_scores.stakeholder_engagement` jsonb contains the W0-W8 engagement grid but is not passed to any prompt. #15 receives the raw ingredients (all transcripts + emails) to derive it but doesn't surface the prior derivation. Engagement patterns should be a cross-prompt primitive.

6. **Experiment applicability is not gated (DECISIONS.md 2.21 LOCKED).** Prompts #11 and #23 inject active experiments without filtering by deal stage, precondition, or temporal fit. A "post-disco prototype" experiment surfaced on a Negotiation deal is noise. Requires structured `applicability` JSONB per experiment + a DealIntelligence `getApplicable*()` gate applied before prompt context assembly.

7. **Prior AI outputs never feed back in.** Agent actions log exists (`agent_actions_log.output_data` + `was_overridden`). No prompt reads it. Reps override briefs and emails; the override reason is stored but never consulted. This is the most obvious "use your own feedback" miss in the system.

8. **Currency and date formatting drift.** €, $, en-GB, en-US, ISO all appear in different prompts. Not a context gap per se but a consistency debt that makes prompt rewriting error-prone.

### 2. Duplication

Multiple prompts re-fetch or re-shape the same data, indicating the need for the canonical analyzed-transcript object (DECISIONS.md 2.13) and the DealIntelligence service (2.16):

- **Deal-with-company fetch.** Prompts #8, #11, #14 each do the same `deals ⨝ companies` query with mostly overlapping projections. Should be one `DealIntelligence.getDealSnapshot(dealId)` call returning a canonical shape.
- **MEDDPICC fetch + format.** Prompts #8, #11, #14, #20 each fetch and format the MEDDPICC row differently. #11 formats as a snake_case nested object; #14 as a human-readable block; #20 as a confidence-only CSV. One canonical formatter per 2.13 would eliminate drift.
- **System intelligence fetch.** Prompts #6, #8, #11, #12, #14, #16 each run the same vertical-filtered, relevance-ordered query with slightly different row shapes and limits. One `DealIntelligence.getSystemInsights(vertical)` call.
- **Manager directives fetch.** Prompts #6, #8, #11, #12 each fetch active directives for scope/vertical. One canonical filter.
- **Contact list with roles.** Prompts #11, #12, #14, #15, #17, #19, #21, #23, #24 all need "contacts for this deal with their roles and engagement counts". Five different shapes across the codebase. The in-code engagement loop (prompt #11) is N+1.
- **Recent activities for deal.** Prompts #8, #11, #14 fetch recent activities with different limits (10/10/20) and different field projections. Should be one canonical call.
- **Transcript + analysis join.** Prompts #11, #14 both join `call_transcripts` ⨝ `call_analyses` with slightly different projections. #15 reads transcripts directly (for its timeline). One canonical "transcript + analysis" shape would unify.
- **Email-type activity filter.** Prompts #12, #15 filter activities to email types. Two different projections, no shared helper.
- **Playbook experiments active/testing/graduated.** Prompts #11, #23 both filter playbook_ideas with overlapping shapes. Should be one `DealIntelligence.getApplicableExperiments(dealId, aeId)` applying 2.21 gates.
- **Two email-drafting paths.** Prompts #12 (on-demand) and #24 (post-pipeline) do the same thing with different system prompts and output shapes. Per DECISIONS.md 2.13 LOCKED: "One email-drafting service."
- **Two transcript-analysis paths.** Prompt #5 (standalone `/analyze` streaming) and prompts #19/#20/#21 (pipeline parallel analysis) process transcripts with different truncation limits and different feature sets. Per 2.13 LOCKED: "One transcript preprocessing pass produces the canonical analyzed-transcript object."

### 3. Quality-critical gaps

The 3-5 gaps that, if fixed, would improve the most prompts:

1. **Wire coordinator_patterns into call prep (and into #8, #9, #10, #14, #22, #24).** One query + one formatter, but it unblocks the Act 2 demo story and retrofits cross-deal context into 7 prompts at once. Per DECISIONS.md 2.17 LOCKED this is already mandatory; the fix is small.

2. **Add a DealIntelligence service returning a canonical deal context object.** Per DECISIONS.md 2.16 + 2.13. One shape consumed by #8, #11, #14, #15 at minimum — with deal header, company, MEDDPICC with evidence, contacts with roles + engagement, stage history, recent activities with body, transcripts + analyses, agent memory, fitness scores, coordinator patterns, system intelligence, manager directives, applicable experiments. Replaces ~60% of the parallel-query blocks currently inlined in route handlers.

3. **Pass full transcript text (not just summaries) to downstream synthesis prompts — subject to a shared truncation budget set once per pipeline run.** Resolves the #22 "synthesis sees less than signal detection" inversion, resolves #11's "previous_calls are summary-only", resolves #14's "no transcript text in close analysis". Corollary: replace varied per-step truncation limits (15K/12K/8K) with a single canonical budget.

4. **Implement continuous deal-theory accumulation (DECISIONS.md 1.1 + 2.16).** Every pipeline run emits `deal_events`; a lightweight synthesis pass updates a rolling theory in `deal_snapshots`. Prompts #8, #11, #14 read the theory. This is the event-sourced backbone of the rebuild — without it, #14 cannot meet its LOCKED bar.

5. **Add the applicability gate (DECISIONS.md 2.21).** Experiments, patterns, and interventions carry structured `applicability` JSONB; every surfacing path runs through `DealIntelligence.getApplicable*()`. Removes the NordicMed hardcoded check, removes the #23 "all active experiments" fanout, and makes #11's proven plays actually relevant rather than mandatory-injection.

### 4. v2 implications

How the DECISIONS.md architecture changes the answer to "what context should each prompt have?":

- **Event-sourced intelligence (2.16) turns the #14 close-lost gap from "needs a continuous analysis pipeline to be built" into "query the deal theory snapshot."** Every gap marked CRITICAL on prompt #14 becomes tractable once `deal_events` + `deal_snapshots` exist. The LOCKED "deal theory" bar is reachable without it; the sheer mass of the pipeline becomes an engineering exercise once the backbone is in place.

- **Canonical analyzed-transcript object (2.13) eliminates the 15K/12K/8K truncation drift.** One pass produces a structured object; #19/#20/#21/#22/#23 all read from the canonical object rather than re-processing raw transcript text. #11 and #14 get the same object via DealIntelligence. A trivially-closed gap today becomes structurally closed.

- **DealIntelligence service (2.16) means the Cross-Cutting #2 duplication goes away.** Prompts become thin consumers of a uniform context shape; adding a new field to the shape upgrades 10 prompts at once. The 4 fuzzy deal-resolution paths (07-DATA-FLOWS cross-flow #2) collapse into `CrmAdapter.resolveDeal`; the N+1 engagement loop in #11 collapses into a `StakeholderEngagement.get(dealId)` method.

- **Coordinator query (2.17) is the one-query fix** for the systemic Flow 6 BROKEN gap. Prompts #11 (mandated by 2.17), #8, #9, #10, #14, #22, #24 all gain coordinator context via a single new query.

- **Applicability gating (2.21) converts "all active experiments + all patterns" fanout into "only the ones that apply to this deal's state."** Prompt #11 stops receiving irrelevant experiments; prompt #23 stops re-detecting experiments that can't apply. Prompt #14 close-lost hypotheses become verified against the event stream before surfacing.

- **People table (DECISIONS.md 2.19, future-state 1.11 #5) enables cross-company champion tracking** that no prompt today can access. Prompt #14 gains "this champion has been on 3 prior closed-lost deals" context; prompt #11 gains "this EB has bought Claude API at 2 prior companies" context.

- **CrmAdapter (2.18) and HubSpot as source-of-truth** mean deal/contact/company context assembly moves behind one interface. No prompt needs to know whether it's reading cached data or live.

- **Single Claude integration layer (2.13)** means per-prompt decisions about temperature, tool use (for structured outputs), max_tokens, and prompt file loading become uniform. Context-quality fixes at prompt level become deployable without chasing 25 call-site files.

Places where v2 architecture makes a current gap trivial:
- **Coordinator → call prep:** one query in v2 (`SELECT * FROM coordinator_patterns WHERE vertical = ? AND status = 'active'`) vs. the never-reached actor push in v1.
- **MEDDPICC trajectory:** event-sourced `deal_events` naturally stores every MEDDPICC change; `DealIntelligence.getMeddpiccTrajectory(dealId)` is a one-liner.
- **Prior-run learnings de-duplication:** event-sourced store naturally supports this vs. jsonb string-merge today.
- **Prompt context governance:** prompts as `.md` files (Guardrail #4) + unified Claude client + DealIntelligence service means "add X to all prompts that need it" becomes a config change, not a 10-file edit.

Places where v2 architecture does NOT automatically close a gap:
- **Full transcript text in downstream synthesis prompts** — still a prompt-budget decision. The canonical analyzed-transcript object can attach the full text but each prompt must opt in.
- **Email body inclusion** — same issue; the object can carry email bodies but token cost is real.
- **Close-lost hypothesis depth** — DECISIONS.md 1.1 mandates it but the prompt engineering (how to argue, how to structure the 3-output shape) is still Prompt 4.7's job.
- **Rep-feedback loop into prompt context** — `agent_actions_log` is already populated; v2 doesn't change that, but no prompt reads it today. Requires a separate wiring decision in Prompt 10.


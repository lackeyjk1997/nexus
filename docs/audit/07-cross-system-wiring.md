# Phase 7: Cross-System Wiring & Gap Analysis

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1-6 audit results (synthesis phase)

---

## Section 1: System Map

### System Definitions

| # | System | Core Responsibility | Primary Storage |
|---|--------|-------------------|-----------------|
| 1 | **Pipeline** | Transcript upload → multi-step AI processing | Rivet transcriptPipeline actor (ephemeral) |
| 2 | **Deal Agent** | Per-deal persistent intelligence, health checks, interventions | Rivet dealAgent actor (in-memory) |
| 3 | **Coordinator** | Cross-deal pattern detection and synthesis | Rivet intelligenceCoordinator actor (in-memory) |
| 4 | **Observations** | Field signals: classification, clustering, routing | DB: observations, observationClusters, observationRouting |
| 5 | **Experiments** | A/B testing: evidence attribution, lifecycle management | DB: playbookIdeas |
| 6 | **Intelligence Dashboard** | Aggregation: patterns, field feed, close analysis, role views | Server queries + client fetch (no dedicated table) |
| 7 | **Field Queries** | Questions → reps → analysis → give-back | DB: fieldQueries, fieldQueryQuestions |
| 8 | **Deal Detail UI** | MEDDPICC, activities, stakeholders, agent memory, interventions | DB: deals, meddpiccFields, activities, contacts + actor state |
| 9 | **Deal Fitness** | oDeal framework scoring (B/E/T/R dimensions) | DB: dealFitnessScores, dealFitnessEvents |
| 10 | **Book** | Post-sale account management, health, response kits | DB: accountHealth, customerMessages, knowledgeArticles |
| 11 | **Call Prep** | AI-generated 9-layer briefings for upcoming calls | Generated via Claude API (stored in actor state only) |
| 12 | **Outreach** | Email sequences + intelligence brief | DB: emailSequences, emailSteps |

### Connection Matrix

| From ↓ / To → | Pipeline | Deal Agent | Coordinator | Observations | Experiments | Intelligence | Field Queries | Deal Detail | Deal Fitness | Book | Call Prep | Outreach |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pipeline** | — | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ | ✅ | ❌ | ➖ | ✅ | ➖ |
| **Deal Agent** | ➖ | — | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ | ➖ | ➖ | ✅ | ➖ |
| **Coordinator** | ➖ | ✅ | — | ➖ | ➖ | ⚠️ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Observations** | ➖ | ➖ | ➖ | — | ✅ | ✅ | ⚠️ | ➖ | ➖ | ➖ | ➖ | ✅ |
| **Experiments** | ➖ | ➖ | ➖ | ✅ | — | ✅ | ➖ | ➖ | ➖ | ➖ | ⚠️ | ➖ |
| **Intelligence** | ➖ | ➖ | ➖ | ➖ | ➖ | — | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| **Field Queries** | ➖ | ➖ | ➖ | ⚠️ | ➖ | ✅ | — | ✅ | ➖ | ➖ | ➖ | ➖ |
| **Deal Detail** | ✅ | ✅ | ➖ | ✅ | ➖ | ➖ | ✅ | — | ➖ | ➖ | ✅ | ➖ |
| **Deal Fitness** | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | — | ➖ | ➖ | ➖ |
| **Book** | ➖ | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | — | ➖ | ➖ |
| **Call Prep** | ➖ | ✅ | ➖ | ➖ | ⚠️ | ➖ | ➖ | ✅ | ➖ | ➖ | — | ➖ |
| **Outreach** | ➖ | ➖ | ➖ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | — |

**Legend:** ✅ Connected and working | ⚠️ Partial/broken | ❌ Should exist but doesn't | ➖ Not applicable

---

## Section 2: Data Flow Across System Boundaries

### Wire: Pipeline → Deal Agent
- **Trigger:** Pipeline step 7 (update-deal-agent), after all analysis complete
- **Data at source:** Synthesis text, detected signals (competitive intel, risk signals), stakeholder insights
- **Transformation:** Signals split into separate RPC calls: `recordInteraction`, `updateLearnings`, `addCompetitiveIntel`, `addRiskSignal`
- **Data at destination:** Deal agent state fields: `interactionMemory[]`, `learnings[]`, `competitiveContext`, `riskSignals[]`
- **Shape match:** DRIFT — Pipeline passes raw `synthesis` string to `updateLearnings`. Agent's `validateLearnings()` was designed to filter this, but pipeline bypasses it by sending raw unvalidated text. Agent's `consolidateLearnings()` catches some generic entries but not all. (Phase 5, Section 4.5)
- **Failure mode:** Graceful degradation — pipeline marks complete even if deal agent RPCs fail. Agent simply misses updates. No retry. No reconciliation.
- **Evidence:** Phase 5, Section 3 (step 7); Phase 4, Section 2

### Wire: Pipeline → Coordinator
- **Trigger:** Pipeline step 8 (send-signals-to-coordinator), sequential for-of loop
- **Data at source:** Array of signal objects: `{ id, dealId, dealName, companyName, vertical, signalType, content, competitor?, urgency, sourceAeId, sourceAeName }`
- **Transformation:** Pipeline maps field names: `Signal.signalType → type`, `Signal.sourceAeName → source_speaker`. Fixed in S13 per CLAUDE.md.
- **Data at destination:** Coordinator state `signals[]` (capped at 200, FIFO eviction)
- **Shape match:** YES (after S13 field mapping fix)
- **Failure mode:** Pipeline wraps in try/catch with 180s timeout. If coordinator unreachable, pipeline still completes. Signals lost silently.
- **Evidence:** Phase 5, Section 3 (step 8); Phase 4, Section 3

### Wire: Pipeline → Observations
- **Trigger:** Pipeline step 4 (create-signal-observations), parallel POST calls
- **Data at source:** Per-signal: rawInput (signal description), sourceContext with transcriptId, dealId, signalType, vertical, sourceSpeaker
- **Transformation:** None — posted directly to observation API
- **Data at destination:** observations table (full classification pipeline runs: Claude classify, cluster match, routing)
- **Shape match:** DRIFT — Pipeline already classified the signal (step 2, Detect Signals). Observation route re-classifies from scratch. Two different Claude calls produce potentially different classifications for the same signal text. (Phase 6, Section 1b)
- **Failure mode:** Per-observation error handling. If one observation fails, others still created. Dedup check prevents re-processing same transcriptId+signalType+dealId.
- **Evidence:** Phase 5, Section 3 (step 4); Phase 6, Section 1a (Path 2)

### Wire: Pipeline → Experiments
- **Trigger:** Pipeline step 5 (check-experiments), conditional on active experiments where AE is in testGroup
- **Data at source:** Claude-generated evidence attribution per active experiment
- **Transformation:** Evidence structured as `{ deals: [{ deal_name, deal_id, evidence: [...] }] }` and sent via PATCH
- **Data at destination:** `playbookIdeas.experimentEvidence` (jsonb, append)
- **Shape match:** DRIFT — Seed evidence structure wraps deals in `{ deals: [...] }` with per-deal metrics (days_in_stage, sentiment_score, avg baselines). Pipeline appends flat entries `{ dealId, dealName, date, source, tacticUsed, evidence, sentiment }`. Playbook MetricDrillDownModal (lines 304-525) assumes seed structure. (Phase 5, Section 4.4; Phase 6, Section 2c)
- **Failure mode:** Pipeline continues if experiment update fails. Evidence lost silently.
- **Evidence:** Phase 5, Section 3 (step 5); Phase 6, Section 2c

### Wire: Pipeline → Deal Detail UI (MEDDPICC)
- **Trigger:** Pipeline step 3 (persist-meddpicc)
- **Data at source:** MEDDPICC scores with confidence (0-100) and evidence text per dimension
- **Transformation:** PATCH `/api/deals/[id]/meddpicc-update` → upsert to meddpiccFields table. Also inserts activity record.
- **Data at destination:** DB: meddpiccFields (7 dimensions × confidence + evidence). UI: deal detail MEDDPICC tab.
- **Shape match:** YES
- **Failure mode:** If PATCH fails, pipeline continues (graceful). MEDDPICC tab shows stale/seed data.
- **Evidence:** Phase 5, Section 3 (step 3a); Phase 3, API route inventory

### Wire: Pipeline → Call Prep
- **Trigger:** Pipeline step 9 (auto-call-prep), final step
- **Data at source:** POST to `/api/agent/call-prep` with dealId
- **Transformation:** Call prep route independently fetches 8 intelligence layers from DB + deal agent memory as 9th layer
- **Data at destination:** Deal agent state: `briefReady` field. UI: coral "Brief Ready" button on deal detail.
- **Shape match:** YES
- **Failure mode:** KNOWN ISSUE — hangs on production (CLAUDE.md). Pipeline marks complete even if call prep fails (graceful degradation). Brief may never generate.
- **Evidence:** Phase 5, Section 3 (step 9); Phase 4, Section 2

### Wire: Coordinator → Deal Agent
- **Trigger:** Coordinator's `synthesizePattern` action, after 3s scheduled delay
- **Data at source:** Pattern synthesis: `{ patternId, signalType, vertical, competitor?, synthesis, recommendations, affectedDeals, detectedAt }`
- **Transformation:** None — pushed directly via `dealAgent.addCoordinatedIntel()`
- **Data at destination:** Deal agent state: `coordinatedIntel[]` (capped at 20)
- **Shape match:** YES
- **Failure mode:** If deal agent unreachable, coordinator sets `pushStatus = "failed"`. Pattern exists in coordinator but never reaches deal agents. No retry.
- **Evidence:** Phase 4, Section 3; Phase 6, Section 3d

### Wire: Coordinator → Intelligence Dashboard
- **Trigger:** Client-side fetch on intelligence page mount
- **Data at source:** Coordinator actor state: `patterns[]` with synthesis, recommendations, affectedDeals
- **Transformation:** GET `/api/intelligence/agent-patterns` reads coordinator's `getPatterns()` action, returns array
- **Data at destination:** intelligence-client.tsx `agentPatterns` state, rendered in Patterns tab top section
- **Shape match:** YES
- **Failure mode:** If coordinator destroyed (demo reset) or actor unreachable, API returns empty array. UI shows no agent patterns section (gracefully hidden).
- **Wire status:** ⚠️ PARTIAL — fetched once on mount, no polling. Patterns detected mid-session won't appear until page refresh.
- **Evidence:** Phase 6, Section 3d

### Wire: Observations → Experiments (auto-creation)
- **Trigger:** Observation classified with signal type `process_innovation`
- **Data at source:** Observation rawInput, observer details, vertical
- **Transformation:** Creates playbookIdea with `status: "proposed"`, `originatedFrom: "observation"`, `sourceObservationId` FK
- **Data at destination:** playbookIdeas table, displayed on playbook page Active Experiments tab
- **Shape match:** YES
- **Failure mode:** If insert fails, observation still saved. Experiment creation is fire-and-forget.
- **Evidence:** Phase 6, Section 2b (Path 1)

### Wire: Observations → Intelligence Dashboard
- **Trigger:** Server-side queries on intelligence page load (force-dynamic)
- **Data at source:** observations table (all, with observer names), observationClusters (all, ordered by lastObserved)
- **Transformation:** Metrics computed server-side: active clusters count, total ARR at risk, this-month observation count, resolution rate. Close intelligence aggregated from deals.closeFactors/winFactors.
- **Data at destination:** intelligence-client.tsx props: clusters, observations, closeIntelligence, metrics
- **Shape match:** YES
- **Failure mode:** If DB query fails, page 500s. No graceful degradation.
- **Evidence:** Phase 6, Section 3a

### Wire: Observations → Outreach
- **Trigger:** Server-side query on outreach page load
- **Data at source:** observationClusters where signal_type = "competitive_intel" or "win_pattern"
- **Transformation:** Clusters passed as props to OutreachClient for intelligence brief section
- **Data at destination:** Outreach page intelligence brief cards
- **Shape match:** YES
- **Failure mode:** If no clusters exist, intelligence brief section shows empty.
- **Evidence:** Phase 7, source verification

### Wire: Field Queries → Observations (response side-effect)
- **Trigger:** AE responds to field query question
- **Data at source:** Response text, question context, deal context
- **Transformation:** Creates observation with `rawInput: "[Field Query Response] Q: ... A: ..."`, `sourceContext.trigger: "field_query_response"`, `status: "classified"`
- **Data at destination:** observations table (bare INSERT — no classification, clustering, or routing)
- **Shape match:** ⚠️ PARTIAL — Observation created but skips full pipeline (no Claude classification, no cluster matching, no routing). Observation appears in Field Feed but is never clustered or routed to support functions.
- **Failure mode:** If insert fails, field query response still saved. Observation creation is fire-and-forget.
- **Evidence:** Phase 6, Section 1a (Path 3); Phase 6, Section 4c

### Wire: Field Queries → Deal Detail
- **Trigger:** Manager uses DealQuestionInput on deal detail page; AE sees QuickQuestions on deal page (filtered by dealId)
- **Data at source:** Field query with dealId, MEDDPICC context, contact list, activities
- **Transformation:** Deal-scoped path in `/api/field-queries` fetches rich deal context, Claude answers from data or sends question to AE
- **Data at destination:** DealQuestionInput shows immediate answer + "Question sent to [AE]" status
- **Shape match:** YES
- **Failure mode:** If Claude call fails, falls back to `buildFallbackDealAnswer()` (template-based).
- **Evidence:** Phase 6, Section 4a (Scenario A)

### Wire: Deal Detail → Deal Agent
- **Trigger:** useActor hook on deal detail page (real-time WebSocket)
- **Data at source:** Deal agent state: interactionMemory, learnings, competitiveContext, riskSignals, coordinatedIntel, briefReady, activeIntervention, healthScore
- **Transformation:** None — read directly from actor state
- **Data at destination:** AgentMemory component, AgentIntervention component, "Brief Ready" button
- **Shape match:** YES
- **Failure mode:** If actor unreachable, components show empty/default state. No error UI displayed.
- **Evidence:** Phase 4, Section 2; Phase 6, Section 3d

### Wire: Deal Agent → Call Prep
- **Trigger:** Call prep generation (manual or auto from pipeline step 9)
- **Data at source:** Deal agent state formatted via `getMemoryForPrompt()` — structured text with learnings, risks, competitive context, coordinated intel (9th intelligence layer)
- **Transformation:** Formatted as structured text block, injected into Claude prompt alongside 8 other intelligence layers
- **Data at destination:** Claude-generated call prep brief
- **Shape match:** YES
- **Failure mode:** If deal agent unreachable, call prep generates without 9th layer (agent memory). Brief is less personalized but still functional.
- **Evidence:** Phase 4, Section 2; Phase 5, Section 3 (step 9)

### Wire: Experiments → Call Prep
- **Trigger:** Call prep generation queries promoted + testing experiments for the deal's vertical
- **Data at source:** playbookIdeas where status in ('promoted', 'testing') and deal is in testGroupDeals
- **Transformation:** Promoted plays injected as DIRECTIVE language in call prep prompt; testing experiments noted for awareness
- **Data at destination:** Claude-generated call prep brief
- **Shape match:** ⚠️ PARTIAL — Call prep queries experiments but only promoted plays are injected as directives. Testing experiments are noted but not actionable in the brief.
- **Evidence:** Phase 3, API route inventory (call-prep)

### Wire: Book → Observations
- **Trigger:** User clicks "Log Observation" in account detail drawer
- **Data at source:** Manual observation text with account context (companyId, health data)
- **Transformation:** POST `/api/observations` with `context.page: "book"`, `context.accountId`
- **Data at destination:** Full observation pipeline (classify, cluster, route)
- **Shape match:** YES
- **Failure mode:** Standard observation pipeline error handling
- **Evidence:** Phase 7, source verification (book-client.tsx line 1241)

### Wire: Experiment Graduation → Observations
- **Trigger:** Manager graduates experiment (PATCH status → "graduated")
- **Data at source:** Experiment title, hypothesis, results
- **Transformation:** Creates observation with `aiClassification: { signals: [{ type: "process_innovation", confidence: 0.95 }] }`, `extractedEntities: {}` (EMPTY — shape drift)
- **Data at destination:** observations table
- **Shape match:** DRIFT — `extractedEntities` should be array `[]` per observation pipeline standard, but graduation writes empty object `{}`. Code expecting array may fail on these observations.
- **Evidence:** Phase 6, Section 2d

---

## Section 3: Broken Wires (Should Exist But Don't)

### Missing Wire: Pipeline → Deal Fitness
- **What should flow:** Pipeline extracts stakeholder engagement, buyer commitment signals, and ownership language — all of which map directly to Deal Fitness dimensions (Business, Emotional, Technical, Readiness fit)
- **Why it matters:** Deal Fitness scores are currently seed-data only. The pipeline generates exactly the data needed to update fitness events and scores in real-time, but doesn't write to the deal_fitness_events or deal_fitness_scores tables.
- **Effort to fix:** MEDIUM — Add a pipeline step after signal detection that maps signals to fitness dimensions and INSERTs deal_fitness_events. Update deal_fitness_scores aggregation.
- **Priority:** NICE-TO-HAVE — Deal Fitness page works with seed data for demo. Live updates would make it more impressive but aren't required.

### Missing Wire: Deal Agent → Deal Fitness
- **What should flow:** Deal agent health checks, risk signals, and intervention data could feed fitness scoring (e.g., health score < 60 creates a "readiness_fit" event)
- **Why it matters:** Health checks and fitness scores measure overlapping concerns (deal risk, stakeholder engagement) but operate independently with no data sharing
- **Effort to fix:** MEDIUM — Health check in deal-agent.ts could write fitness events via API call
- **Priority:** NICE-TO-HAVE — Both systems work independently for demo

### Missing Wire: Deal Fitness → Call Prep
- **What should flow:** Fitness dimension scores and imbalance flags should inform call prep briefings (e.g., "Emotional fit lagging at 67% — champion engagement needed")
- **Why it matters:** Call prep currently has 8+1 intelligence layers but doesn't include deal fitness insights. A rep preparing for a call would benefit from knowing which fit dimensions are weak.
- **Effort to fix:** LOW — Add a 10th layer to call prep that queries `/api/deal-fitness?dealId=X`
- **Priority:** NICE-TO-HAVE — Call prep works without it, but fitness data would improve brief quality

### Missing Wire: Deal Fitness → Deal Detail UI
- **What should flow:** Fitness summary (overall score, imbalance flag) displayed on deal detail page alongside MEDDPICC
- **Why it matters:** Deal detail page shows MEDDPICC, activities, agent memory, but no fitness overview. User must navigate to separate `/deal-fitness` page to see fitness data.
- **Effort to fix:** LOW — Add a fitness summary card to deal-detail-client.tsx that fetches from `/api/deal-fitness?dealId=X`
- **Priority:** NICE-TO-HAVE

### Missing Wire: Book → Deal Agent
- **What should flow:** Post-sale account health signals, customer messages, and risk indicators could inform deal agents for expansion/renewal deals
- **Why it matters:** Book tracks account health (scores, risk signals, usage metrics) but deal agents have no awareness of post-sale context. An AE preparing for a renewal call gets no account health insights in their call prep.
- **Effort to fix:** HIGH — Would require architectural decision about whether post-sale accounts should have deal agents, or whether a new "account agent" pattern is needed
- **Priority:** CUT IT — Book system is self-contained for demo, no current deal agent for post-sale accounts

### Missing Wire: Observations → Deal Fitness
- **What should flow:** Observations classified as deal_blocker, competitive_intel, or win_pattern could create fitness events
- **Why it matters:** Manual observations about a deal could update fitness scores in real-time
- **Effort to fix:** MEDIUM — After observation classification, check if observation is linked to a deal with fitness tracking, create fitness event
- **Priority:** NICE-TO-HAVE

---

## Section 4: Data Duplication & Inconsistency

### Duplication 1: Signal Classification
- **What data:** Signal type, confidence, urgency for pipeline-detected signals
- **System A:** TranscriptPipeline actor state: `detectedSignals[]` (Claude call in step 2)
- **System B:** observations.aiClassification (Claude call in observation route POST)
- **Source of truth:** Ambiguous — observation route's classification is used for clustering/routing, but pipeline's classification determines what signals get sent
- **Sync mechanism:** None — two independent Claude calls on the same text
- **Divergence risk:** HIGH — Two Claude calls can produce different signal types, different confidence scores, different urgency levels for identical input text. Pipeline may classify as "competitive_intel" but observation route may classify as "field_intelligence". This means the signal routed to the coordinator (from pipeline) may differ from the signal clustered on the intelligence page (from observation route).

### Duplication 2: MEDDPICC Scores
- **What data:** MEDDPICC dimension confidence scores (0-100) and evidence text
- **System A:** DB: meddpiccFields table (written by pipeline step 3a via `/api/deals/[id]/meddpicc-update`)
- **System B:** Deal agent state has NO copy of MEDDPICC (agent is unaware of scores)
- **Source of truth:** DB (meddpiccFields) is sole source
- **Sync mechanism:** Not needed — only DB stores MEDDPICC
- **Divergence risk:** LOW — However, call prep fetches MEDDPICC from DB independently. If DB write fails in pipeline but agent gets updated with learnings, call prep has stale MEDDPICC but fresh learnings. Mild inconsistency.

### Duplication 3: Deal Learnings
- **What data:** Strategic insights about a deal (buyer dynamics, approach recommendations)
- **System A:** Deal agent state: `learnings[]` (written by pipeline step 7)
- **System B:** DB: activities table (type = "note_added", metadata contains learning text) — optional side-effect
- **Source of truth:** Deal agent state is authoritative. Activity log is a lossy record.
- **Sync mechanism:** Unidirectional — pipeline writes to agent, activity log is separate side-effect
- **Divergence risk:** HIGH on reset — Agent state destroyed on demo reset. Activity log also cleared (pattern match deletion). After reset, both are gone. No recovery path.

### Duplication 4: Competitive Context
- **What data:** Competitor names, recent mentions, positioning intelligence
- **System A:** Deal agent state: `competitiveContext.competitors[]`, `recentMentions[]`
- **System B:** DB: observations where aiClassification.signals includes type = "competitive_intel"
- **Source of truth:** Both are authoritative for different purposes. Agent state is used in call prep (9th layer). Observations are used in intelligence dashboard clustering.
- **Sync mechanism:** Pipeline writes to both independently (step 4 creates observations, step 7 updates agent)
- **Divergence risk:** MEDIUM — After demo reset, agent loses competitive context but observations may survive (only pipeline-triggered observations are deleted). Manual competitive_intel observations persist, creating a mismatch.

### Duplication 5: Risk Signals
- **What data:** Deal risk indicators (process friction, deal blockers, timeline risk)
- **System A:** Deal agent state: `riskSignals[]` (written by pipeline step 7, also by health check)
- **System B:** DB: observations where aiClassification.signals includes urgency = "high" or type = "deal_blocker"
- **Source of truth:** Agent state for interventions/health checks; observations for intelligence dashboard
- **Sync mechanism:** Pipeline writes to both independently
- **Divergence risk:** Same as competitive context — agent state lost on reset, observations partially survive

### Duplication 6: Experiment Evidence Shape
- **What data:** Evidence that a sales tactic was used in a deal (excerpts, dates, sentiment)
- **System A:** Seed data shape: `{ deals: [{ deal_name, deal_id, owner_name, group, stage, amount, days_in_stage, avg_days_baseline, sentiment_score, avg_sentiment_baseline, evidence: [{ type, date, source, excerpt }] }] }`
- **System B:** Pipeline-appended shape: `{ dealId, dealName, date, source, tacticUsed, evidence, sentiment }` (flat, no wrapping `deals` array)
- **Source of truth:** DB column `playbookIdeas.experimentEvidence` contains both shapes mixed together
- **Sync mechanism:** Append-only — seed data pre-loaded, pipeline appends
- **Divergence risk:** HIGH — Playbook page MetricDrillDownModal assumes seed structure with `.deals` array. Pipeline-appended flat entries may cause rendering errors or be silently ignored.

---

## Section 5: Single Points of Failure

### SPOF 1: Claude API in Parallel Analysis
- **Bottleneck:** TranscriptPipeline step 2 uses `Promise.all` with 3 Claude calls (extract actions, score MEDDPICC, detect signals)
- **Depends on it:** All downstream pipeline steps (3-9), deal agent updates, coordinator signals, MEDDPICC persistence, observation creation, experiment evidence
- **Failure impact:** Any single Claude 429/500 error rejects the entire Promise.all → pipeline aborts → no analysis, no scores, no signals, no agent updates
- **Current error handling:** Raw `fetch` with no retry logic. No SDK. No exponential backoff. Outer try/catch marks pipeline as "error" status.
- **Risk level:** HIGH — Claude API rate limits or transient errors during demo will kill the entire pipeline run. No partial recovery.

### SPOF 2: Intelligence Coordinator Actor
- **Bottleneck:** Singleton actor (key: `["default"]`), in-memory only, no DB persistence
- **Depends on it:** All cross-deal pattern detection, synthesis, and push to deal agents. Intelligence dashboard agent-detected patterns section.
- **Failure impact:** If destroyed (demo reset, server restart, actor crash): all accumulated signals lost, all detected patterns lost, intelligence page shows no agent patterns, deal agents lose coordinated intel source
- **Current error handling:** If coordinator RPC fails, pipeline step 8 catches error and continues. But data is lost with no recovery.
- **Risk level:** HIGH — Demo reset always destroys this. After reset, cross-deal intelligence is empty until 2+ pipelines re-run.

### SPOF 3: PersonaProvider
- **Bottleneck:** Single React context provider wrapping entire dashboard
- **Depends on it:** Every dashboard page (role-based rendering, persona-based filtering, API calls with observerId/teamMemberId)
- **Failure impact:** If provider fails to fetch team members, all dashboard pages crash. No error boundary.
- **Current error handling:** None visible. fetch failure propagates as unhandled error.
- **Risk level:** MEDIUM — Team members are seed data, unlikely to fail. But if DB connection drops during page load, entire app is unusable.

### SPOF 4: Database Connection
- **Bottleneck:** Single module-level postgres() instance in `packages/db`
- **Depends on it:** Every API route, every server component, every data read/write
- **Failure impact:** Connection error → all routes return 500 → entire app unusable
- **Current error handling:** No retry, no circuit breaker, no connection pool health check
- **Risk level:** MEDIUM — Supabase is generally reliable, but a transient connection issue during demo has no graceful handling

### SPOF 5: Rivet Endpoint Resolution
- **Bottleneck:** Client-side actor access requires resolving Rivet endpoint
- **Depends on it:** AgentMemory, WorkflowTracker, AgentIntervention, deal detail agent state
- **Failure impact:** If endpoint unreachable, useActor hook fails silently. Components show empty state. User sees no agent memory, no workflow progress, no interventions.
- **Current error handling:** Fallback chain: `NEXT_PUBLIC_RIVET_ENDPOINT` → `window.location.origin/api/rivet` → `NEXT_PUBLIC_SITE_URL/api/rivet` → `http://localhost:3001/api/rivet`. Silent failure on all fallbacks.
- **Risk level:** MEDIUM — Port drift (dev server on 3002 instead of 3001) can break this. CLAUDE.md documents this as known issue.

---

## Section 6: The Demo Flow Wire Check

### Act 1: "What happens after a call"

**Setup:** Sarah Chen (AE) is logged in. Demo reset has been run. NordicMed deal is at Discovery stage.

**Step-by-step wire trace:**

1. **Sarah navigates to `/pipeline/[nordicmed-id]`** (Deal Detail page)
   - Wire: Deal Detail → DB (deals, contacts, meddpiccFields, activities, callTranscripts) ✅
   - Wire: Deal Detail → Deal Agent (useActor hook) ✅ — but agent has no state yet (just created/initialized by getOrCreate)
   - Wire: Deal Detail → AgentMemory component ✅ — shows empty (no learnings yet)
   - **What Sarah sees:** Deal header, MEDDPICC (seed baseline scores), contacts, activities, transcript cards. Agent memory is empty.

2. **Sarah clicks "Process Transcript" on NordicMed transcript**
   - Wire: Deal Detail → Pipeline (POST `/api/transcript-pipeline`) ✅
   - API gathers deal context: deal, MEDDPICC, contacts, agent config, active experiments (6 DB queries)
   - Pipeline actor created via `getOrCreate(["nordicmed-id"])`
   - Work enqueued: `pipeline.send("process", { dealId, transcriptText, ... })`

3. **Pipeline runs — WorkflowTracker shows real-time progress**
   - Wire: Pipeline → Deal Agent (workflowProgress events via WebSocket) ✅
   - Wire: Deal Detail → WorkflowTracker (subscribes to workflowProgress) ✅
   - **What Sarah sees:** 5-step progress tracker lights up: Analyze Transcript → Update Scores → Check Experiments → Synthesize → Finalize

4. **Step 2 (parallel-analysis): 3 Claude calls**
   - Extract actions, score MEDDPICC, detect signals — all in parallel
   - ⚠️ Risk: If any Claude call fails, entire pipeline aborts (Promise.all)
   - **What Sarah sees:** "Analyze Transcript" step active

5. **Step 3a (persist-meddpicc): MEDDPICC written to DB**
   - Wire: Pipeline → Deal Detail (MEDDPICC update via API) ✅
   - Deal detail page receives `workflowProgress` event, refreshes MEDDPICC display
   - **What Sarah sees:** MEDDPICC scores update in real-time on the deal page

6. **Step 3b (create-signal-observations): Observations created**
   - Wire: Pipeline → Observations (POST `/api/observations` × N signals) ✅
   - Each signal gets full observation pipeline: classify (Claude), cluster (Claude), route
   - ⚠️ Issue: Double classification — pipeline already classified these signals in step 2
   - **What Sarah sees:** Nothing yet (observations appear on intelligence page, not deal page)

7. **Step 4 (synthesize-learnings): Claude synthesizes**
   - Wire: Pipeline → Deal Agent (updateLearnings) ✅
   - ⚠️ Issue: Raw unvalidated synthesis passed to agent
   - **What Sarah sees:** Agent memory panel updates with new learnings

8. **Step 5 (check-experiments): Evidence attributed**
   - Wire: Pipeline → Experiments (PATCH experiment evidence) ✅
   - Only fires if AE is in an active experiment's test group
   - **What Sarah sees:** Nothing visible on deal page

9. **Step 6 (draft-email): Email drafted**
   - ⚠️ LIFECYCLE GAP: Email created but stored in pipeline actor state only. Never displayed anywhere.
   - **What Sarah sees:** Nothing

10. **Step 7 (update-deal-agent): Agent state updated**
    - Wire: Pipeline → Deal Agent (recordInteraction, updateLearnings, addCompetitiveIntel, addRiskSignal) ✅
    - **What Sarah sees:** Agent memory panel shows learnings, risks, competitive context

11. **Step 8 (send-signals-to-coordinator): Cross-deal intelligence**
    - Wire: Pipeline → Coordinator (receiveSignal × N) ✅
    - If this is the FIRST pipeline run, coordinator accumulates signals but no pattern detected yet (needs 2+ deals)
    - If this is the SECOND pipeline run (after running MedVista), coordinator may detect patterns
    - **What Sarah sees:** Nothing yet (patterns appear on intelligence page)

12. **Step 9 (auto-call-prep): Brief generated**
    - Wire: Pipeline → Call Prep → Deal Agent (setBriefReady) ✅
    - ⚠️ KNOWN ISSUE: May hang on production (timeout)
    - If successful: coral "Brief Ready" button appears on deal page
    - **What Sarah sees:** "Brief Ready" button (if step completes). Call prep card when clicked.

13. **Health check fires (10s after step 7)**
    - Wire: Deal Agent internal (runHealthCheck → setIntervention) ✅
    - For NordicMed specifically: checks process_friction risk + close date proximity → generates timeline risk intervention with one-click close date adjustment
    - ⚠️ NordicMed-only constraint: Only fires for company name "NordicMed Group" (hardcoded)
    - **What Sarah sees:** Intervention card with health score bar and "Adjust Close Date" button

**Demo failure points in Act 1:**
- ❌ Claude API rate limit → pipeline aborts at step 2
- ❌ Auto-call-prep timeout → no "Brief Ready" button (step 9)
- ⚠️ Port drift → useActor hook fails → no workflow tracker, no agent memory
- ⚠️ Slow Claude responses → pipeline takes >60s → presenter waits

### Act 2: "What happens across the org"

**Setup:** Marcus Thompson (MANAGER) switches persona. At least one pipeline has been run in Act 1.

1. **Marcus navigates to `/intelligence`**
   - Wire: Intelligence Dashboard → DB (clusters, observations, routing, deals, directives) ✅
   - Wire: Intelligence Dashboard → Coordinator (GET agent-patterns) ⚠️ (fetched once, no polling)
   - **What Marcus sees:**

2. **Patterns tab:**
   - **Agent-detected patterns:** Only shown if 2+ pipelines ran on deals in same vertical with same signal type. If only NordicMed was processed in Act 1, NO agent patterns yet. Must process MedVista too for cross-deal detection. ⚠️
   - **Observation clusters:** Mix of seed data + live pipeline observations. Pipeline-created observations may have clustered into existing seed clusters or created new ones. ✅
   - **Metrics:** Active patterns count, ARR at risk, observations this month, avg response time. ✅ (partially seed-dependent)

3. **Field Feed tab:**
   - Shows all observations including pipeline-created ones from Act 1. ✅
   - Pipeline observations tagged with "From transcript" badge. ✅
   - **What's live vs. seed:** Pipeline observations are live. Seed observations pre-exist. Both display.

4. **Close Intelligence tab:**
   - ⚠️ SEED-DATA ONLY — Requires deals closed with factors. No deals were closed in Act 1.
   - **What Marcus sees:** Seed close factors for HealthFirst (Closed Lost) and MedTech Solutions (Closed Won), if seeded.

5. **Marcus asks a question via "Ask Team" input:**
   - Wire: Intelligence Dashboard → Field Queries (POST) ✅
   - Wire: Field Queries → AEs (question distributed) ✅
   - **What Marcus sees:** Immediate answer (if data sufficient) or "Question sent to X AEs"

6. **If seeds were deleted, what would be missing?**
   - No observation clusters (Patterns tab nearly empty until many observations accumulate)
   - No close intelligence (tab shows "No close intelligence data yet")
   - No manager directives
   - No avg response time metric
   - Field Feed would show only pipeline-created observations from Act 1
   - Agent-detected patterns would still work (live from coordinator)

**Demo failure points in Act 2:**
- ❌ Only one pipeline run → no cross-deal patterns (need 2+)
- ⚠️ No page refresh → stale agent patterns if coordinator synthesized after page load
- ⚠️ Close Intelligence tab empty without seed data

### Act 3: "What happens before Sarah asks"

**Setup:** Sarah is back on the NordicMed deal page. Pipeline has completed. Health check has fired.

1. **Intervention card appears on deal page:**
   - Wire: Deal Agent → Deal Detail (interventionReady event via WebSocket) ✅
   - For NordicMed: timeline risk intervention with health score 59/100, one-click close date adjustment
   - ⚠️ NordicMed-only constraint: Other deals get text-only generic interventions
   - **What Sarah sees:** Coral intervention card with health bar, risk description, "Adjust Close Date" button with date picker

2. **What wires must be working:**
   - Pipeline must have completed (created risk signals) ✅
   - Deal agent must have received risk signals via step 7 ✅
   - Health check must have fired (scheduled 10s after recordInteraction) ✅
   - Health score must be < 60 ✅ (NordicMed designed to score 59)
   - Company name must be "NordicMed Group" ✅ (hardcoded constraint)
   - WebSocket connection must be active (interventionReady event) ✅

3. **Brief Ready button:**
   - Wire: Pipeline step 9 → Deal Agent setBriefReady → Deal Detail briefReady event ✅
   - ⚠️ KNOWN ISSUE: Step 9 may hang on production. If it completes, coral "Brief Ready" button appears.
   - When clicked: shows cached call prep brief (9 intelligence layers)
   - **What Sarah sees:** Coral "Brief Ready" button (if step 9 succeeded)

4. **NordicMed constraint assessment:**
   - YES, NordicMed is the only deal where timeline risk intervention fires with actionable one-click button
   - Other deals: health check runs but generic text-only intervention (no close date button)
   - For demo: This is acceptable — NordicMed is the demo deal. But blocks production use.

**Demo failure points in Act 3:**
- ❌ Auto-call-prep timeout → no "Brief Ready" button
- ❌ Port drift → no WebSocket → no intervention card, no brief ready button
- ⚠️ Health check timing — fires 10s after recordInteraction. Presenter must wait ~15-20s after pipeline completes.

---

## Section 7: Ghost Features

### Ghost 1: Follow Experiment Button
- **What it is:** "Follow" button on experiment cards in playbook page
- **What it looks like:** Renders with follower count from seed data. Button appears clickable.
- **What's missing:** No PATCH endpoint to add/remove followers. Click does nothing. DB schema has `followers[]` array but no API updates it.
- **Recommendation:** HIDE — Remove button from playbook-client.tsx. Follower tracking is not needed for demo.

### Ghost 2: Archive Mid-Test
- **What it is:** Ability to stop a testing experiment before graduation
- **What it looks like:** No button exists in testing card UI. State machine allows `testing → archived` but no trigger.
- **What's missing:** No UI button. API route supports the transition if called directly.
- **Recommendation:** CUT — Not needed for demo flow. Manager either graduates or ignores.

### Ghost 3: Support Function Routing UI
- **What it is:** Queue of routed observations for support function personas (Enablement, PM, Deal Desk)
- **What it looks like:** observationRouting records created in DB with status "sent". PATCH API exists to acknowledge/resolve.
- **What's missing:** No React component for support personas to view their routing queue. API is orphaned.
- **Recommendation:** FIX (MEDIUM) — Build simple component showing routed observations with acknowledge/resolve buttons. Enables Act 2 demo for Lisa Park (Enablement) and Michael Torres (PM).

### Ghost 4: Draft Follow-up Email
- **What it is:** AI-generated follow-up email from transcript pipeline step 6
- **What it looks like:** Claude generates email, stored in pipeline actor state. Never displayed.
- **What's missing:** No UI retrieval path. Email data lives and dies in ephemeral pipeline actor state.
- **Recommendation:** FIX (LOW) — Store email in deal agent state alongside briefReady. Add "Draft Email Ready" indicator on deal page.

### Ghost 5: Pipeline Action Items
- **What it is:** Extracted action items from transcript (Claude output in step 2)
- **What it looks like:** Claude extracts structured action items. Stored in pipeline actor state. Never displayed.
- **What's missing:** No UI component. Data never reaches deal detail page.
- **Recommendation:** FIX (LOW) — Include action items in call prep brief or agent memory display.

### Ghost 6: Experiment Direct Creation
- **What it is:** Ability for AEs/managers to propose experiments directly through the playbook page
- **What it looks like:** Only "proposed" experiments appear via auto-creation from process_innovation observations. No "Propose Experiment" button.
- **What's missing:** No creation form in playbook page UI. Must come from observation classification.
- **Recommendation:** CUT — Auto-creation from observations is the intended design. Direct creation would bypass the field-signal-driven philosophy.

### Ghost 7: Live Experiment Metrics
- **What it is:** Real-time velocity, sentiment, and close rate metrics for testing experiments
- **What it looks like:** Metrics display on testing cards with threshold progress bars. Values from seed data.
- **What's missing:** No aggregation logic computes metrics from evidence deals. `currentMetrics` pre-populated in seeds, never recalculated from live data.
- **Recommendation:** FIX (MEDIUM) for rebuild — Add aggregation that computes metrics from `experimentEvidence.deals` array. Not critical for demo (seed metrics look realistic).

### Ghost 8: Influence Tab (Playbook)
- **What it is:** Per-member influence scores showing contribution to experiments and proven plays
- **What it looks like:** Tab renders with seed data. Shows influence scores, attributions, experiment counts.
- **What's missing:** No live calculation. `influenceScores` table populated by seeds only. No API or logic to compute from live data.
- **Recommendation:** HIDE for demo if influence is not part of demo narrative. Or leave as-is (seed data looks realistic).

### Ghost 9: Field Query Background Expiration
- **What it is:** Automatic expiration of old field queries and questions
- **What it looks like:** `expiresAt` field set on creation (NOW + 24h). UI shows countdown.
- **What's missing:** No background job or cron to enforce expiration. Questions only expire when AE calls GET endpoint. Parent queries never expire.
- **Recommendation:** FIX (LOW) — Add expiration check to field query creation or a periodic cleanup. Not critical for demo (24h demo window unlikely to trigger).

### Ghost 10: Real-Time Intelligence Updates
- **What it is:** Live updates on intelligence page as new observations/patterns arrive
- **What it looks like:** Page loads with data from server render. No polling or WebSocket for updates.
- **What's missing:** No polling interval, no WebSocket subscription for new observations or coordinator patterns.
- **Recommendation:** FIX (LOW) — Add 10-second polling or manual "Refresh" button. Enables smoother Act 2 demo flow.

---

## Section 8: Rebuild Priority Matrix

### Tier 1: Must Fix (Demo Breaks Without These)

| # | What to Fix | Systems/Files | Effort | Why |
|---|------------|---------------|--------|-----|
| 1.1 | **Add Claude API retry logic in pipeline parallel-analysis** | `actors/transcript-pipeline.ts` (callClaude function) | Small | Single 429/500 error kills entire pipeline. Add 2-retry with exponential backoff. Demo-breaking if Claude has any transient error. |
| 1.2 | **Persist coordinator patterns to DB** | `actors/intelligence-coordinator.ts`, new table or use existing `systemIntelligence` | Medium | Cross-deal patterns (Act 2 signature feature) lost on demo reset. Must survive restart. Add DB write on synthesis, read from DB in `/api/intelligence/agent-patterns`. |
| 1.3 | **Fix auto-call-prep production timeout** | `actors/transcript-pipeline.ts` (step 9), `/api/agent/call-prep/route.ts` | Medium | "Brief Ready" button is a key demo moment. Currently hangs on production. Investigate timeout source — likely Claude call with large prompt (8000+ chars). Consider streaming or reducing context. |
| 1.4 | **Skip re-classification for pipeline observations** | `app/api/observations/route.ts` (POST handler) | Small | Saves 2 Claude calls per signal (12-16 calls per pipeline run). When `sourceContext.trigger === "transcript_pipeline"`, accept pipeline's classification and skip to clustering. Reduces cost and eliminates classification divergence. |

### Tier 2: Should Fix (Demo Is Weaker Without These)

| # | What to Fix | Systems/Files | Effort | Why |
|---|------------|---------------|--------|-----|
| 2.1 | **Add polling/refresh on intelligence page** | `app/(dashboard)/intelligence/intelligence-client.tsx` | Small | Agent patterns fetched once on mount. After pipeline runs, presenter must refresh page to see new patterns. Add 10s polling for agent patterns. |
| 2.2 | **Build support function routing UI** | New component, `intelligence-client.tsx` | Medium | Observation routing records are created but invisible. Lisa Park (Enablement) demo persona has nothing to show. Simple list with acknowledge/resolve buttons. |
| 2.3 | **Fix experiment evidence shape drift** | `actors/transcript-pipeline.ts` (step 5), `app/api/playbook/ideas/[id]/route.ts` | Small | Pipeline appends flat evidence entries; UI expects seed structure with `deals[]` wrapper. Normalize pipeline output to match seed shape. |
| 2.4 | **Surface draft email from pipeline** | `actors/transcript-pipeline.ts` (step 6), `actors/deal-agent.ts`, deal detail UI | Medium | Email drafted but never displayed. Store in deal agent state (alongside briefReady), add "Draft Email Ready" button on deal page. |
| 2.5 | **Remove NordicMed-only constraint for interventions** | `actors/deal-agent.ts` (health check, ~line 345) | Small | Generalize actionable interventions (close date adjustment) to all deals, not just NordicMed. Enables intervention demo on any deal. |
| 2.6 | **Fix unvalidated learnings flowing to agent** | `actors/transcript-pipeline.ts` (step 7) | Small | Pass `state.newLearnings` (validated) instead of raw `synthesis` to deal agent's `updateLearnings`. Prevents generic jargon polluting agent memory. |

### Tier 3: Nice To Have (Polish)

| # | What to Fix | Systems/Files | Effort | Why |
|---|------------|---------------|--------|-----|
| 3.1 | **Compute experiment metrics from evidence** | `app/api/playbook/ideas/[id]/route.ts` or new aggregation | Medium | Replace seed-static metrics with live calculation from evidence deals. Not critical (seed metrics look real). |
| 3.2 | **Pipeline → Deal Fitness events** | `actors/transcript-pipeline.ts`, `/api/deal-fitness` | Medium | Pipeline data could auto-update fitness scores. Deal Fitness works with seed data for demo. |
| 3.3 | **Full classification for field query observations** | `app/api/field-queries/respond/route.ts` | Small | Field query response observations skip classification/clustering. Route through full pipeline for better intelligence capture. |
| 3.4 | **Fix lastCustomerResponseDate phantom health deduction** | `actors/deal-agent.ts` | Small | Never written, causes -20 phantom health deduction. Fix health check logic to handle unset value. |
| 3.5 | **Add field query background expiration** | New cron job or middleware | Small | expiresAt not enforced. Add cleanup to prevent stale queries accumulating. |
| 3.6 | **Surface pipeline action items** | Deal detail UI, deal agent state | Small | Claude extracts action items but they're never displayed. Add to agent memory or call prep. |
| 3.7 | **Deal Fitness summary on deal detail page** | `deal-detail-client.tsx` | Small | Add fitness card alongside MEDDPICC for at-a-glance fitness view. |

### Tier 4: Cut (Remove From Rebuild Scope)

| # | What to Cut | Why |
|---|------------|-----|
| 4.1 | **Follow/Unfollow experiment buttons** | No backend wiring, not needed for demo narrative. Remove buttons. |
| 4.2 | **Archive mid-test experiment UI** | State machine supports it but no demo moment needs it. Leave API-only. |
| 4.3 | **Direct experiment creation form** | Auto-creation from observations is the design intent. Direct creation would bypass field-signal philosophy. |
| 4.4 | **Book → Deal Agent connection** | Requires "account agent" architectural pattern. Not needed for current demo. Book is self-contained. |
| 4.5 | **Live influence score calculation** | Seed data looks realistic. No demo moment depends on live calculation. |
| 4.6 | **Observation deletion capability** | Not needed. Resolved observations filtered from display. |

---

## Section 9: Summary Statistics

| Metric | Count |
|--------|-------|
| Total system-to-system connections in matrix | 132 cells (12×11) |
| Connected and working (✅) | 18 |
| Partially working (⚠️) | 5 |
| Should exist but missing (❌) | 1 |
| Not applicable (➖) | 108 |
| Data duplications found | 6 |
| Single points of failure | 5 |
| Ghost features | 10 |
| Tier 1 (must fix) items | 4 |
| Tier 2 (should fix) items | 6 |
| Tier 3 (nice to have) items | 7 |
| Tier 4 (cut) items | 6 |

---

## Section 10: Files Phase 8 Should Read

Phase 8 (Real vs. Theater Feature Matrix) should classify every user-visible feature. Based on this phase's findings, these files need examination:

### Pages not fully covered in Phases 1-7:
1. `apps/web/src/app/(dashboard)/outreach/outreach-client.tsx` — Outreach page rendering (seed vs. live data balance)
2. `apps/web/src/app/(dashboard)/command-center/command-center-client.tsx` — Command center (what data sources, what's live)
3. `apps/web/src/app/(dashboard)/analytics/analytics-client.tsx` — Analytics page (seed data only?)
4. `apps/web/src/app/(dashboard)/prospects/prospects-client.tsx` — Prospects/contacts database
5. `apps/web/src/app/(dashboard)/calls/page.tsx` — Call transcript library
6. `apps/web/src/app/(dashboard)/team/page.tsx` — Team roster page

### Components with unclear live/theater status:
7. `apps/web/src/components/stage-change-modal.tsx` — Close/won/lost outcome capture (feeds Close Intelligence)
8. `apps/web/src/components/demo-guide.tsx` — Guided demo checklist (10 steps, hybrid detection)
9. `apps/web/src/app/page.tsx` — Landing page with "Enter Demo" button

### Seed scripts to compare against live data shapes:
10. `packages/db/src/seed-data/playbook-evidence.ts` — Evidence shape comparison
11. `packages/db/src/seed-data/playbook-experiments.ts` — Experiment seed shapes
12. `packages/db/src/seed-book.ts` — Post-sale seed data completeness

### Integration points to verify:
13. `apps/web/src/components/providers.tsx` — PersonaContext (does persona switch actually change all views?)
14. `apps/web/src/components/layout/sidebar.tsx` — All 7 nav items → do all pages load?
15. `apps/web/src/app/(dashboard)/agent-config/agent-config-client.tsx` — Agent configuration NL interface

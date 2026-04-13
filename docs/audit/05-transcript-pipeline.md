# Phase 5: Data Flow Tracing — Transcript Pipeline

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1-4 audit results

---

## Section 1: Pipeline Trigger Flow

### Trigger Point 1: Deal Detail Page — "Process Transcript" Button

**Component:** `apps/web/src/app/(dashboard)/pipeline/[id]/deal-detail-client.tsx`
**Location:** Calls tab → each transcript card with `transcriptText` content
**Button text:** "Process Transcript" (Bot icon)

**Data gathered:** `dealId` (from parent component), `transcriptText`, `transcriptId` (from transcript object)

**Fetch call:**
```typescript
await fetch("/api/transcript-pipeline", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ dealId, transcriptText: t.transcriptText, transcriptId: t.id }),
});
```

**After call returns:** Button shows "Processing..." with spinner, then "Processed" after 2s timeout. Real-time progress shown via `<WorkflowTracker>` which subscribes to deal agent `workflowProgress` events over WebSocket.

### Trigger Point 2: Analyze Page — "Link to Deal"

**Flow:** User pastes/uploads transcript → `/api/analyze` streams Claude analysis → user clicks "Link to Deal" → selects deal from modal → `POST /api/analyze/link` → route saves activity + fires `POST /api/transcript-pipeline`

**Key difference:** The analyze/link trigger does NOT include `transcriptId` in the pipeline request. The pipeline still runs but dedup checks on observations may behave differently.

### What `/api/transcript-pipeline` Does Before Actor Handoff

The route performs 6 sequential DB queries:
1. `deals` + `companies` — deal info and company name
2. `meddpiccFields` — current MEDDPICC scores (confidence values only)
3. `contacts` — all contacts for the deal's company
4. `agentConfigs` — assigned AE's agent instructions
5. `playbookIdeas` — active experiments where AE is in test group
6. `teamMembers` — assigned AE name

Then sends the full context to the Rivet actor:
```
pipeline.send("process", {
  dealId, transcriptText, transcriptId, dealName, companyName, vertical,
  currentMeddpicc, existingContacts, agentConfigInstructions,
  assignedAeId, assignedAeName, appUrl, activeExperiments
})
```

**Actor instantiation:** `rivetClient.transcriptPipeline.getOrCreate([dealId])` — one pipeline actor per deal. If already running, the new message is queued.

**Concurrent runs:** The pipeline uses `ctx.loop()` with `loopCtx.queue.next()` — a second `process` message waits in the queue until the current run completes.

---

## Section 2: Step-by-Step Data Flow

### Step 1: init-pipeline

**Input:** PipelineInput from `process` queue message.

**Processing:** Resets all state fields to defaults. Sets `status = "running"`, `startedAt`, `dealId`.

**Output:** Clean state.

**Storage:** Actor state only (no DB).

**Display:** WorkflowTracker activates (first `workflowProgress` event).

**Failure mode:** Abort — inner catch sets `status = "error"`.

---

### Step 2: parallel-analysis (timeout: 180s)

**Input:** `transcriptText`, `currentMeddpicc`, `existingContacts`, `dealName`, `companyName`, `vertical`

**Processing:** 3 Claude calls in parallel via `Promise.all`:

| Call | Purpose | max_tokens | Transcript Limit | Output Shape |
|------|---------|------------|------------------|--------------|
| Extract Actions | Action items, commitments, decisions | 1024 | 15,000 chars | `{ actionItems: [{ item, owner, deadline? }] }` |
| Score MEDDPICC | Score 7 dimensions with evidence | 1024 | 15,000 chars | `{ updates: Record<string, { score, evidence, delta }> }` |
| Detect Signals | 7 signal types + stakeholder sentiment | 2048 | 15,000 chars | `{ signals: DetectedSignal[], stakeholderInsights: StakeholderInsight[] }` |

Post-processing: MEDDPICC scores validated (clamped 0-100, evidence quality checks). Signals validated (type check, min content length, urgency normalization, competitor extraction).

**Output:**
- `actionItems: ActionItem[]`
- `meddpiccUpdates: Record<string, { score, evidence, delta }>`
- `detectedSignals: DetectedSignal[]` (shape: `{ type, content, context, urgency, source_speaker, quote }`)
- `stakeholderInsights: StakeholderInsight[]` (shape: `{ name, title?, sentiment, engagement, keyPriorities[], concerns[], notableQuotes[] }`)

**Storage:** Actor state fields: `actionItems`, `meddpiccUpdates`, `detectedSignals`, `stakeholderInsights`

**Display:** WorkflowTracker shows "Analyze Transcript" step running → complete.

**Failure mode:** If ANY of the 3 parallel calls fails, the entire step aborts. Pipeline enters error state. All 3 calls fail together (Promise.all rejects on first failure).

---

### Step 3: persist-meddpicc + create-signal-observations

#### 3a: persist-meddpicc (conditional — only if MEDDPICC fields changed)

**Input:** `meddpiccUpdates` from step 2.

**Processing:** `PATCH /api/deals/{dealId}/meddpicc-update` with `{ updates }`.

**DB writes:**
- `meddpicc_fields` UPDATE: dimension confidence scores + evidence text for each changed dimension
- `activities` INSERT: type `"note_added"`, subject "MEDDPICC updated from transcript analysis"

**Storage:** Database (meddpiccFields, activities tables).

**Display:** Deal detail MEDDPICC tab — client subscribes to `workflowProgress` event, re-fetches from `GET /api/deals/{id}/meddpicc` on `score_meddpicc` complete.

**Failure mode:** Swallowed — pipeline continues.

#### 3b: create-signal-observations (conditional — only if signals detected)

**Input:** `detectedSignals` from step 2.

**Processing:** `POST /api/observations` per signal (parallel via Promise.all). Each call triggers the FULL observation AI pipeline (classify → cluster → route). This means EACH observation gets re-classified by Claude, even though the pipeline already classified it.

**Dedup check:** The observation route checks for existing observations matching same `observerId` + `transcriptId` + `signalType` + `dealId` in `sourceContext`. If found, returns early with no writes.

**DB writes per observation (up to):**
- `observations` INSERT: rawInput, sourceContext, aiClassification, aiGiveback, status, arrImpact, clusterId, linkedAccountIds, linkedDealIds, extractedEntities, lifecycleEvents
- `observation_clusters` UPDATE: counts, severity, quotes (if matched to existing cluster)
- `observation_clusters` INSERT: new cluster (if no match found and similar unclustered obs exist)
- `observation_routing` INSERT: 1 per routable signal type
- `playbook_ideas` INSERT: if `process_innovation` signal
- `agent_configs` UPDATE: if `agent_tuning` or `cross_agent` signal (unlikely from transcripts)
- `agent_config_versions` INSERT: if config changed
- `notifications` INSERT: if config changed

**Storage:** Database (observations, observationClusters, observationRouting, possibly playbookIdeas, agentConfigs, agentConfigVersions, notifications).

**Display:** Observations appear on Intelligence page (Field Feed tab) and deal detail (observations section). Clusters appear on Intelligence page (Patterns tab).

**Failure mode:** Per-observation `.catch()` — individual failures don't block others.

---

### Step 4: synthesize-learnings

**Input:** `actionItems`, `meddpiccUpdates`, `detectedSignals`, `stakeholderInsights` from step 2. Transcript text (truncated to 8,000 chars).

**Processing:** Claude call to synthesize 3-7 strategic learnings with quality rubric. Validated via `validateLearnings()` (min 20 chars, dedup, reject generic patterns, require specific evidence).

**Output:** `string[]` of validated learnings (state) and raw learnings (local `synthesis` variable).

**Storage:** Actor state: `newLearnings` (validated). The RAW unvalidated `synthesis` variable is what gets passed to the deal agent in step 7.

**Display:** Agent memory component shows learnings from deal agent state.

**Failure mode:** Abort — inner catch.

**Critical issue:** The `synthesis` variable (raw, unvalidated) is passed to the deal agent, not `state.newLearnings` (validated). Generic learnings rejected by validation still flow through.

---

### Step 5: check-experiments (conditional — only if activeExperiments provided)

**Input:** `activeExperiments` from PipelineInput. Transcript text (truncated to 12,000 chars).

**Processing:** Claude analyzes whether experiment tactics were used in the call. For each attribution with `evidenceFound === true`, appends evidence to the experiment's `experimentEvidence` JSONB array via `PATCH /api/playbook/ideas/{id}`.

**Output:** `ExperimentAttribution[]` (shape: `{ experimentId, evidenceFound, tacticUsed, evidence, customerResponse, sentiment }`)

**Storage:** Actor state: `experimentAttributions`. Database: `playbook_ideas.experimentEvidence` JSONB updated.

**Display:** Playbook page experiment cards show evidence counts. Experiment detail shows deal-level evidence.

**Failure mode:** Abort on Claude call failure. Per-experiment evidence update failures caught individually.

---

### Step 6: draft-email (graceful degradation)

**Input:** `companyName`, `dealName`, `actionItems`, `stakeholderInsights`, `agentConfigInstructions`.

**Processing:** Claude drafts follow-up email.

**Output:** `{ subject, body }` or null.

**Storage:** Actor state: `followUpEmail`. Not stored in DB.

**Display:** The drafted email is available in the deal agent state but there is **no UI component that displays `followUpEmail` from actor state**. The email draft feature in the deal detail page calls `/api/agent/draft-email` directly, not the pipeline's pre-drafted email.

**Failure mode:** Graceful — sets `followUpEmail = null`, pipeline continues.

**Lifecycle gap:** Email is CREATED and STORED (actor state) but never RETRIEVED or RENDERED. This is dead data.

---

### Step 7: update-deal-agent

**Input:** All pipeline results from steps 2-6.

**Processing:** Calls 5+ RPCs on the deal agent:
1. `recordInteraction({ type: "transcript_analysis", summary, insights: synthesis })` — raw learnings
2. `updateLearnings(synthesis)` — raw learnings (deal agent applies consolidateLearnings)
3. `addCompetitiveIntel()` per competitive_intel signal — normalized competitor + context
4. `addRiskSignal()` per high-urgency deal_blocker/process_friction — risk type + content
5. `recordInteraction()` per matched stakeholder — sentiment/engagement/priorities

**Storage:** Deal agent state fields: `interactionMemory`, `totalInteractions`, `lastInteractionDate`, `learnings`, `competitiveContext`, `riskSignals`.

**Display:** Agent memory component (`agent-memory.tsx`) shows learnings, risk signals, competitive context. Updates in real-time via `memoryUpdated` event.

**Side effects:**
- `recordInteraction` schedules `runHealthCheck` after 10s
- Multiple `recordInteraction` calls may stack health check schedules (debounced by 60s)

**Failure mode:** Abort — inner catch.

---

### Step 8: send-signals-to-coordinator (timeout: 180s, graceful)

**Input:** `detectedSignals` from actor state.

**Processing:** Gets coordinator actor via `getOrCreate(["default"])`. Sends each signal via `coordinator.receiveSignal()` sequentially.

**Signal shape:**
```typescript
{ id: "sig-{timestamp}-{random6}", dealId, dealName, companyName, vertical,
  signalType, content, competitor?, urgency, receivedAt, sourceAeId, sourceAeName }
```

**Storage:** Coordinator state: `signals[]` (capped at 200). Patterns detected → `patterns[]`.

**Downstream:** If 2+ deals share same signalType+vertical, coordinator detects pattern → schedules `synthesizePattern` after 3s → Claude synthesizes → pushes `addCoordinatedIntel` to affected deal agents → intelligence dashboard shows pattern cards.

**Display:** Intelligence page Patterns tab shows "Agent-Detected Pattern" cards. Agent memory shows "Cross-Deal Intelligence" section.

**Failure mode:** Graceful — swallows errors, pipeline continues.

---

### Step 9: auto-call-prep (timeout: 180s, graceful)

**Input:** `dealId`, `assignedAeId`.

**Processing:** `POST /api/agent/call-prep` with `{ dealId, memberId, prepContext: "follow_up", autoGenerated: true }`. On success, calls `dealAgent.setBriefReady({ brief, generatedAt, context: "post_transcript_analysis" })`.

**Storage:** Deal agent state: `briefReady` field. Not stored in DB.

**Display:** Deal detail page "Prep Call" button changes to coral "Brief Ready" button. Clicking loads the brief instantly from actor state (no API call).

**Failure mode:** Graceful — swallows errors, pipeline continues. CLAUDE.md notes this step "hangs on production" due to timeout.

---

### Step 10: mark-complete

**Input:** None.

**Processing:** Sets `status = "complete"`, `completedAt` timestamp. Sends final `workflowProgress` event.

**Storage:** Actor state only.

**Display:** WorkflowTracker shows "Finalize" step complete. Auto-collapses after 30s.

---

## Section 3: Complete Data Flow Diagram

```
TRIGGER: "Process Transcript" button (deal detail) OR "Link to Deal" (analyze page)
  │
  ├── /api/transcript-pipeline fetches deal context (6 DB queries)
  │   └── pipeline.send("process", { full context })
  │
  ├── Step 1: init-pipeline
  │     └── Resets actor state
  │
  ├── Step 2: parallel-analysis [180s timeout, 3 parallel Claude calls]
  │     ├── Claude 1: Extract Actions → state.actionItems
  │     ├── Claude 2: Score MEDDPICC → state.meddpiccUpdates
  │     └── Claude 3: Detect Signals → state.detectedSignals, state.stakeholderInsights
  │
  ├── Step 3a: persist-meddpicc [graceful]
  │     ├── PATCH /api/deals/{id}/meddpicc-update
  │     │   ├── DB: meddpicc_fields UPDATE (confidence + evidence)
  │     │   └── DB: activities INSERT (type: "note_added")
  │     └── Displayed in: Deal detail MEDDPICC tab (live refresh via event)
  │
  ├── Step 3b: create-signal-observations [graceful per-obs]
  │     ├── POST /api/observations × N signals (parallel)
  │     │   ├── DB: observations INSERT (per signal, with full AI pipeline)
  │     │   ├── DB: observation_clusters UPDATE or INSERT
  │     │   ├── DB: observation_routing INSERT
  │     │   └── DB: playbook_ideas INSERT (if process_innovation)
  │     └── Displayed in: Intelligence page (Field Feed, Patterns), Deal detail observations
  │
  ├── Step 4: synthesize-learnings [Claude call]
  │     ├── State: newLearnings (validated), synthesis var (raw)
  │     └── Displayed in: Agent memory (via step 7 → deal agent)
  │
  ├── Step 5: check-experiments [conditional, Claude call]
  │     ├── PATCH /api/playbook/ideas/{id} × N experiments
  │     │   └── DB: playbook_ideas.experimentEvidence UPDATE
  │     └── Displayed in: Playbook page experiment evidence
  │
  ├── Step 6: draft-email [graceful, Claude call]
  │     ├── State: followUpEmail
  │     └── Displayed in: NOWHERE ← lifecycle gap
  │
  ├── Step 7: update-deal-agent
  │     ├── dealAgent.recordInteraction() → state.interactionMemory
  │     ├── dealAgent.updateLearnings(raw) → state.learnings
  │     ├── dealAgent.addCompetitiveIntel() → state.competitiveContext
  │     ├── dealAgent.addRiskSignal() → state.riskSignals
  │     └── Displayed in: Agent memory component (all fields)
  │
  ├── Step 8: send-signals-to-coordinator [graceful, 180s timeout]
  │     ├── coordinator.receiveSignal() × N signals
  │     │   └── Downstream: pattern detection → synthesis → push to deal agents
  │     └── Displayed in: Intelligence page (Agent-Detected Patterns), Agent memory (Cross-Deal Intel)
  │
  ├── Step 9: auto-call-prep [graceful, 180s timeout]
  │     ├── POST /api/agent/call-prep
  │     ├── dealAgent.setBriefReady()
  │     └── Displayed in: "Brief Ready" button on deal detail page
  │
  └── Step 10: mark-complete
        └── Displayed in: WorkflowTracker "Finalize" complete
```

---

## Section 4: Cross-System Effects

### Deal Agent State Updates

| Field | RPC | Values Set | Event |
|-------|-----|-----------|-------|
| `interactionMemory` | recordInteraction (main + per stakeholder) | `{ date, type: "transcript_analysis"/"observation", summary, insights }` | memoryUpdated |
| `totalInteractions` | recordInteraction (1 + N stakeholders) | Incremented | — |
| `lastInteractionDate` | recordInteraction | Today's date | — |
| `learnings` | updateLearnings | Consolidated via consolidateLearnings (from raw input) | learningsUpdated |
| `competitiveContext.competitors` | addCompetitiveIntel (per comp. signal) | Normalized competitor name | — |
| `competitiveContext.recentMentions` | addCompetitiveIntel | `{ date, competitor, context }` (capped at 10) | — |
| `riskSignals` | addRiskSignal (per high-urgency blocker/friction) | `"blocker_detected"` or `"process_friction"` | riskDetected |
| `briefReady` | setBriefReady (from auto-call-prep) | `{ brief, generatedAt, context, dismissed: false }` | briefReady |

### Health Check Cascade

- **Timing:** Fires ~10s after last `recordInteraction` call in step 7 (debounced by 60s)
- **Intervention for NordicMed:** If health score < 60, company name contains "nordicmed", has a process_friction risk signal containing "security"/"review"/"friction", close date set, and daysUntilClose < 70 → creates `timeline_risk` intervention with one-click close date adjustment (today + 84 days)
- **Known issue:** `lastCustomerResponseDate` is never set, causing phantom -20 point deduction after 2+ interactions
- **UI:** Agent intervention component shows card with health bar + action button

### Intelligence Coordinator Cascade

- **Pattern detection:** Fires synchronously in `receiveSignal`. Requires 2+ signals with same type+vertical from different deals
- **Synthesis:** Claude call 3s after pattern detection. Can stack for rapid signal ingestion
- **Push to deal agents:** Sequential `addCoordinatedIntel` per affected deal
- **UI:** Intelligence page "Agent-Detected Patterns" cards. Agent memory "Cross-Deal Intelligence" section
- **Working?** YES — verified in production per CLAUDE.md Session S12

### Brief Ready Cascade

- **Stored in:** dealAgent state `briefReady` field
- **Detection:** deal-detail-client.tsx polls `getBriefReady()` on mount + subscribes to `briefReady` event
- **UI:** Button changes from "Prep Call" to coral "Brief Ready"
- **Known issue:** Auto-call-prep step "hangs on production" per CLAUDE.md — core pipeline completes through step 4, but steps 9-10 may timeout

### Notification Generation

**0 database notifications per normal pipeline run.** The observation route only creates notifications for `agent_tuning`/`cross_agent` signals (unlikely from transcript analysis). All pipeline updates are communicated via Rivet WebSocket events, not DB notifications.

### Activity Timeline Entries

**1 activity per pipeline run** (the MEDDPICC update note), assuming at least one dimension changed. If no MEDDPICC dimensions change, 0 activities are created.

---

## Section 5: UI Display Audit

| Data | Stored In | Display Component | Page/Tab | Working? | Notes |
|------|-----------|-------------------|----------|----------|-------|
| MEDDPICC scores | `meddpicc_fields` table | MeddpiccTab in deal-detail-client | Deal detail > MEDDPICC tab | **YES** | Live refresh via `workflowProgress` event → re-fetch from API |
| MEDDPICC activity | `activities` table | ActivityFeed | Deal detail > Activity tab, Command Center | **YES** | Type "note_added", subject mentions MEDDPICC |
| Detected signals → observations | `observations` table | ObservationsList | Deal detail > observations section, Intelligence > Field Feed | **YES** | Created via full observation pipeline per signal |
| Observation clusters | `observation_clusters` table | ClusterCards | Intelligence > Patterns tab | **YES** | Updated counts/severity when observations match |
| Observation routing | `observation_routing` table | RoutingTable | UNKNOWN — observation-routing route exists but frontend reference unclear | **PARTIAL** | Route exists, may be used in support function views |
| Action items | Actor state `actionItems` | **NONE** | — | **NO** | Created and stored in actor state but no component reads `actionItems` |
| Learnings | Deal agent state `learnings` | AgentMemory | Deal detail > agent memory panel | **YES** | Live update via `learningsUpdated` event. Raw learnings issue noted |
| Risk signals | Deal agent state `riskSignals` | AgentMemory | Deal detail > agent memory panel | **YES** | Coral badges, live update via `riskDetected` event |
| Competitive context | Deal agent state `competitiveContext` | AgentMemory | Deal detail > agent memory panel | **YES** | Shows competitors + recent mentions |
| Stakeholder insights | Actor state `stakeholderInsights` | **NONE** | — | **NO** | Created by Claude, stored in pipeline state, passed as recordInteraction summaries but raw insights not displayed |
| Follow-up email draft | Actor state `followUpEmail` | **NONE** | — | **NO** | Lifecycle gap — created but never retrieved or rendered |
| Experiment evidence | `playbook_ideas.experimentEvidence` | ExperimentCards | Playbook page | **YES** | Evidence count badges, drill-down shows deal-level data |
| Call prep brief | Deal agent state `briefReady` | BriefReady button + CallPrepResult | Deal detail > header button | **YES** | Coral button appears, click loads brief instantly |
| Workflow progress | Deal agent events | WorkflowTracker | Deal detail > workflow tracker overlay | **YES** | 5-step visual tracker with real-time status |
| Health score | Deal agent state `healthScore` | AgentIntervention | Deal detail > intervention card | **YES** | Health bar + intervention card when score < 60 |
| Cross-deal intelligence | Deal agent state `coordinatedIntel` | AgentMemory + IntelligencePatterns | Deal detail + Intelligence page | **YES** | Shows synthesis + recommendations |
| Coordinator patterns | Coordinator state `patterns` | PatternCards | Intelligence > Patterns tab (agent-detected section) | **YES** | Cards with synthesis, affected deals, recommendations |

---

## Section 6: Lifecycle Gaps

### Action Items
```
CREATE:   Claude call 1 in parallel-analysis
STORE:    Actor state: transcriptPipeline.actionItems
RETRIEVE: NEVER — no component calls getState() on the pipeline actor for actionItems
RENDER:   NEVER — no component displays action items from pipeline
UPDATE:   Overwritten on next pipeline run
DELETE:   Lost on actor destruction
```
**Gap:** Data is created and stored but never displayed. The email draft step uses actionItems as input for the email, but actionItems themselves are invisible to the user.

### Stakeholder Insights
```
CREATE:   Claude call 3 in parallel-analysis
STORE:    Actor state: transcriptPipeline.stakeholderInsights
RETRIEVE: Partially — update-deal-agent step reads them to create per-stakeholder recordInteraction calls
RENDER:   Indirectly — stakeholder summaries appear in agent interaction memory, but the structured insights (priorities, concerns, notable quotes) are not individually rendered
UPDATE:   Overwritten on next pipeline run
DELETE:   Lost on actor destruction
```
**Gap:** Rich structured data (priorities, concerns, quotes) is reduced to a one-line summary string when passed to the deal agent. The full structure is lost.

### Follow-Up Email Draft
```
CREATE:   Claude call 6 in draft-email step
STORE:    Actor state: transcriptPipeline.followUpEmail
RETRIEVE: NEVER
RENDER:   NEVER
UPDATE:   Overwritten on next pipeline run
DELETE:   Lost on actor destruction
```
**Gap:** Complete lifecycle failure. Email is generated but no UI ever reads `followUpEmail` from pipeline actor state. The deal detail email draft feature calls `/api/agent/draft-email` independently.

### Experiment Attributions (Actor State)
```
CREATE:   Claude call 5 in check-experiments
STORE:    Actor state: transcriptPipeline.experimentAttributions + DB: playbook_ideas.experimentEvidence
RETRIEVE: DB version retrieved by playbook page. Actor state version: NEVER directly.
RENDER:   DB version rendered in playbook experiment cards
UPDATE:   DB version appended; actor state overwritten on next run
DELETE:   DB version persists; actor state lost on destruction
```
**Gap:** Partial — the important data (experiment evidence) makes it to the DB and is displayed. The actor state copy is redundant and unused.

### MEDDPICC Scores
```
CREATE:   Claude call 2 in parallel-analysis → validated
STORE:    DB: meddpicc_fields (UPDATE/INSERT via API route)
RETRIEVE: GET /api/deals/{id}/meddpicc (triggered by workflowProgress event)
RENDER:   MeddpiccTab in deal detail (7 field cards with confidence bars + evidence)
UPDATE:   Upsert pattern (check existence, then insert or update)
DELETE:   Demo reset deletes all + re-seeds
```
**Status:** COMPLETE lifecycle. Working end-to-end.

### Observations
```
CREATE:   Pipeline sends signal content to POST /api/observations → full AI pipeline
STORE:    DB: observations, observation_clusters, observation_routing
RETRIEVE: Server component query on deal detail page (sourceContext.dealId or linkedDealIds)
RENDER:   Deal detail observations section, Intelligence field feed
UPDATE:   Observation route handles follow-up responses
DELETE:   Demo reset deletes pipeline-created observations (by sourceContext trigger)
```
**Status:** COMPLETE lifecycle. Working end-to-end.

### Call Prep Brief
```
CREATE:   Pipeline step 9 calls /api/agent/call-prep → Claude → JSON brief
STORE:    Deal agent state: briefReady (NOT in DB)
RETRIEVE: deal-detail-client.tsx polls getBriefReady() + subscribes to briefReady event
RENDER:   CallPrepResult panel (12 collapsible sections)
UPDATE:   Overwritten by next pipeline run
DELETE:   Lost on actor destruction. Also cleared when user clicks "Brief Ready" (dismissed)
```
**Gap:** Brief is only in actor state — not persisted to DB. If the actor is destroyed before the user sees the brief, it's lost.

---

## Section 7: Seed Data vs. Live Pipeline Comparison

| Data Type | Seed Shape (Phase 2) | Live Pipeline Shape | Status |
|-----------|---------------------|---------------------|--------|
| `meddpicc_fields` confidence | `integer` 0-100 | `integer` 0-100 (clamped by validateMeddpiccScore) | **MATCH** |
| `meddpicc_fields` evidence text | `text` strings | `text` strings from Claude | **MATCH** |
| `observations.aiClassification` | `{ signals[], sentiment, urgency, entities[], linked_accounts[], linked_deals[] }` | Same shape (Claude generates, then observation route re-classifies) | **MATCH** |
| `observations.sourceContext` | `{ page: "manual", trigger: "manual" }` | `{ page: "pipeline", dealId, trigger: "transcript_pipeline", transcriptId, signalType, urgency, sourceSpeaker }` | **MATCH** (pipeline is superset of seed shape) |
| `observations.aiGiveback` | `{ acknowledgment, related_observations_hint }` | `{ acknowledgment, related_observations_hint, routing, arr_impact? }` | **MATCH** (pipeline adds routing + arr_impact) |
| `observationClusters.unstructuredQuotes` | `[{ quote, role, vertical, date }]` | Same shape | **MATCH** |
| `activities.metadata` (MEDDPICC) | Seed: `{ source: "call_prep" }` etc. | Pipeline: `{ source: "transcript_pipeline", updates: {...} }` | **MATCH** (different source but same polymorphic pattern) |
| `playbookIdeas.experimentEvidence` | `{ deals: [{ deal_name, deal_id, owner_name, ... }] }` | Pipeline appends: `{ dealId, dealName, date, source: "transcript_analysis", tacticUsed, evidence, customerResponse, sentiment }` | **DRIFT** — seed shape wraps in `{ deals: [...] }` with richer per-deal structure. Pipeline appends flat evidence objects directly to the array. |
| `callAnalyses` (from seed) | Complex JSONB fields (painPoints, budgetSignals, etc.) with shape drift noted in Phase 2 | Pipeline does NOT write to callAnalyses — it creates observations instead | **N/A** — different data path |

---

## Section 8: Pipeline Health Summary

### What Works End-to-End (Create → Store → Display)

1. **MEDDPICC scoring** — Claude scores → DB persist → live refresh on deal page ✓
2. **Signal observations** — detected signals → full observation pipeline → Intelligence page ✓
3. **Observation clustering** — signals match/create clusters → Intelligence patterns tab ✓
4. **Deal agent learnings** — Claude synthesizes → deal agent state → agent memory panel ✓
5. **Risk signals** — high-urgency blockers/friction → deal agent → agent memory badges ✓
6. **Competitive context** — competitor mentions → deal agent → agent memory ✓
7. **Workflow progress** — step events → deal agent broadcast → WorkflowTracker component ✓
8. **Cross-deal intelligence** — coordinator patterns → synthesis → deal agent → agent memory + intelligence page ✓
9. **Experiment evidence** — Claude attribution → DB update → playbook page ✓
10. **Health check + intervention** — scheduled after pipeline → score evaluation → intervention card (NordicMed only for actionable) ✓

### What's Partially Working

1. **Auto call-prep brief** — generates brief → stored in actor state → "Brief Ready" button works — BUT: "hangs on production" per CLAUDE.md (timeout). Core pipeline intelligence completes through step 4; step 9 may fail gracefully.

2. **Learnings quality** — raw unvalidated learnings flow to deal agent. The deal agent's `updateLearnings` runs `consolidateLearnings` which catches some generic ones, but not all that `validateLearnings` would have caught.

3. **Notification of pipeline results** — only communicated via WebSocket events. If the user isn't on the deal page when the pipeline completes, they won't know it ran (no DB notification, no email, no badge).

### What's Broken or Missing

1. **Follow-up email draft** — generated but never displayed. Complete lifecycle failure. Dead data.
2. **Action items** — extracted by Claude but never displayed. Stored only in pipeline actor state.
3. **Stakeholder insights** — rich structured data reduced to one-line summaries when passed to deal agent. Priorities, concerns, quotes lost.
4. **`lastCustomerResponseDate`** — never set, causing phantom -20 health deduction after 2+ interactions.
5. **Observation re-classification** — pipeline classifies signals, then sends them to the observation route which re-classifies them with a separate Claude call. Wasteful (redundant Claude call per signal) and potentially inconsistent (two different Claude calls may produce different classifications).

### Critical Risks for Demo

1. **Timeout on auto-call-prep** — step 9 may hang on production (Vercel). Pipeline marks as "complete" anyway due to graceful degradation, but "Brief Ready" won't appear.
2. **maxDuration=30 on observation route** — each observation POST triggers the full observation AI pipeline (1-4 Claude calls). With 5+ signals, the observation route could timeout on production even though the individual pipeline step has graceful per-observation error handling.
3. **No Claude retry logic** — raw `fetch` to Anthropic API with no retries. A single 429/500 in the parallel-analysis step aborts the entire pipeline.
4. **NordicMed-only actionable intervention** — the demo's most impressive feature (one-click close date adjustment) only works for NordicMed. All other deals get generic text-only interventions.
5. **Signal sequential send to coordinator** — for-of loop with await, not parallel. With many signals, this extends the pipeline duration unnecessarily.

### Recommended Fixes for Rebuild (Prioritized by Demo Impact)

1. **Display action items and stakeholder insights** — these are already extracted by Claude but invisible. Quick UI win.
2. **Surface the follow-up email draft** — either display it in the deal detail or remove the Claude call to save tokens/time.
3. **Skip observation re-classification** — when source is `transcript_pipeline`, trust the pipeline's classification instead of re-running Claude. Saves ~30s and 5+ Claude calls per pipeline run.
4. **Add retry logic to callClaude** — exponential backoff on 429/500. Critical for production reliability.
5. **Set `lastCustomerResponseDate`** — either set it during pipeline (from transcript timestamps) or remove the health check penalty.
6. **Generalize actionable interventions** — remove NordicMed guard for production.
7. **Pass validated learnings to deal agent** — use `state.newLearnings` instead of raw `synthesis` variable.
8. **Parallelize coordinator signal sends** — use Promise.all instead of sequential for-of loop.
9. **Add DB persistence for call prep briefs** — so they survive actor destruction.
10. **Create DB notification on pipeline completion** — so users who aren't on the deal page still know it ran.

---

## Section 9: Files Phase 6 Should Read

Phase 6 (Data Flow Tracing — Observations, Experiments, Intelligence) should read:

### Observation Pipeline (the other major data flow)
1. `apps/web/src/app/api/observations/route.ts` — full POST handler (classify, cluster, route, auto-playbook)
2. `apps/web/src/app/api/observations/[id]/follow-up/route.ts` — follow-up processing
3. `apps/web/src/app/api/observations/clusters/route.ts` — cluster listing
4. `apps/web/src/app/api/observation-routing/route.ts` — routing CRUD

### Intelligence Dashboard
5. `apps/web/src/app/(dashboard)/intelligence/intelligence-client.tsx` — Patterns tab, Field Feed, Close Intelligence
6. `apps/web/src/app/(dashboard)/intelligence/page.tsx` — server component data loading

### Playbook System
7. `apps/web/src/app/(dashboard)/playbook/playbook-client.tsx` — experiments, influence scores
8. `apps/web/src/app/(dashboard)/playbook/page.tsx` — server component
9. `apps/web/src/app/api/playbook/ideas/[id]/route.ts` — experiment status transitions

### Observation Input (Agent Bar)
10. `apps/web/src/components/observation-input.tsx` — universal agent bar (~1800 lines)

### Field Query Engine
11. `apps/web/src/app/api/field-queries/route.ts` — query creation + distribution
12. `apps/web/src/app/api/field-queries/respond/route.ts` — response processing
13. `apps/web/src/app/api/field-queries/suggestions/route.ts` — suggested questions

### Seed Data for Comparison
14. `packages/db/src/seed-observations.ts`
15. `packages/db/src/seed-intelligence.ts`
16. `packages/db/src/seed-playbook.ts`
17. `packages/db/src/seed-playbook-lifecycle.ts`
18. `packages/db/src/seed-data/` — playbook evidence and experiments data

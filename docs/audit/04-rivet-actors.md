# Phase 4: Rivet Actor Inventory

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1-3 audit results

---

## Section 1: Actor Overview Table

| Actor | Type | Key Pattern | State Fields | RPCs | Claude Calls | Schedules | Communicates With |
|-------|------|-------------|-------------|------|-------------|-----------|-------------------|
| `dealAgent` | Simple | `[dealId]` (per deal) | 20 | 18 | 0 | 2 (`runHealthCheck` after 30s on init, after 10s on interaction) | Receives from: transcriptPipeline, intelligenceCoordinator. Broadcasts events to: browser clients. |
| `transcriptPipeline` | Workflow | `[dealId]` (per deal) | 12 | 2 (getState, destroyActor) + queue | 6 per run | 0 | Calls: dealAgent (7 RPCs), intelligenceCoordinator (receiveSignal). Calls: 4 API routes. |
| `intelligenceCoordinator` | Simple | `["default"]` (singleton) | 5 | 6 | 1 per pattern | 1 (`synthesizePattern` after 3s) | Receives from: transcriptPipeline. Calls: dealAgent (addCoordinatedIntel). |

---

## Section 2: Detailed Actor Inventory

### 2.1 Deal Agent (`dealAgent`)

**File:** `apps/web/src/actors/deal-agent.ts` (683 lines)
**Type:** Simple actor (not workflow)
**Purpose:** Persistent per-deal intelligence agent that accumulates interaction memory, learnings, competitive context, risk signals, and cross-deal intelligence. Runs health checks and generates proactive interventions.

#### State Shape (`DealAgentState`)

| Field | Type | Default | Cap | Written By | Read By |
|-------|------|---------|-----|-----------|---------|
| `dealId` | string | `""` | — | initialize | formatMemoryForPrompt, health check |
| `dealName` | string | `""` | — | initialize | health check (NordicMed guard) |
| `companyName` | string | `""` | — | initialize | health check (NordicMed guard) |
| `vertical` | string | `""` | — | initialize | formatMemoryForPrompt |
| `initialized` | boolean | `false` | — | initialize | formatMemoryForPrompt guard |
| `interactionMemory` | InteractionMemory[] | `[]` | **50** | recordInteraction, recordFeedback, updateStage, dismissIntervention, addCoordinatedIntel | formatMemoryForPrompt |
| `learnings` | string[] | `[]` | **20** | updateLearnings (via consolidateLearnings) | formatMemoryForPrompt, health check |
| `riskSignals` | string[] | `[]` | **NONE** | addRiskSignal, removeRiskSignal | formatMemoryForPrompt, health check |
| `competitiveContext.competitors` | string[] | `[]` | **NONE** | addCompetitiveIntel | formatMemoryForPrompt, health check |
| `competitiveContext.ourDifferentiators` | string[] | `[]` | **NONE** | addCompetitiveIntel | formatMemoryForPrompt |
| `competitiveContext.recentMentions` | Array<{date,competitor,context}> | `[]` | **10** | addCompetitiveIntel | formatMemoryForPrompt |
| `coordinatedIntel` | CoordinatedIntel[] | `[]` | **20** | addCoordinatedIntel | formatMemoryForPrompt |
| `daysSinceCreation` | number | `0` | — | initialize (set to 0) | formatMemoryForPrompt |
| `totalInteractions` | number | `0` | — | recordInteraction, recordFeedback, updateStage, dismissIntervention, addCoordinatedIntel | formatMemoryForPrompt, health check |
| `lastInteractionDate` | string\|null | `null` | — | recordInteraction, recordFeedback, updateStage, addCoordinatedIntel | — |
| `lastCallPrepFeedback` | {date,rating,comment}\|null | `null` | — | recordFeedback | formatMemoryForPrompt |
| `currentStage` | string | `""` | — | initialize, updateStage | health check (stage age) |
| `stageEnteredAt` | string\|null | `null` | — | initialize, updateStage | health check (stage age) |
| `lastCustomerResponseDate` | string\|null | `null` | — | **NEVER WRITTEN** | health check |
| `closeDate` | string\|null | `null` | — | initialize | health check (NordicMed intervention) |
| `briefReady` | BriefReady\|null | `null` | — | setBriefReady, dismissBrief | getBriefReady |
| `activeIntervention` | ActiveIntervention\|null | `null` | — | setIntervention, dismissIntervention, runHealthCheck | getState |
| `lastHealthCheck` | string\|null | `null` | — | runHealthCheck | recordInteraction (debounce) |
| `healthScore` | number | `100` | — | runHealthCheck | getState |

**Dead state field:** `lastCustomerResponseDate` — declared and read by `runHealthCheck` but never written by any action. Always `null`, causes a 20-point health deduction once `totalInteractions > 2`.

**Dead state field:** `daysSinceCreation` — set to `0` on initialize, never incremented. Always displays as "0 day(s)" in prompt.

#### RPCs (18 actions)

| Action | Params | Mutates State | Events | External Calls |
|--------|--------|---------------|--------|----------------|
| `initialize` | `{dealId, dealName, companyName, vertical, currentStage, stageEnteredAt, closeDate?}` | Identity fields, initialized, daysSinceCreation | — | schedule runHealthCheck 30s |
| `getState` | — | — | — | — |
| `destroyActor` | — | Actor destroyed | — | c.destroy() |
| `recordInteraction` | `{type, summary, insights?, feedback?}` | interactionMemory, totalInteractions, lastInteractionDate | memoryUpdated | Conditionally schedule runHealthCheck 10s |
| `recordFeedback` | `{rating, comment}` | lastCallPrepFeedback, interactionMemory, totalInteractions, lastInteractionDate | memoryUpdated | — |
| `updateLearnings` | `newLearnings: string[]` | learnings (full replace via consolidate) | learningsUpdated | — |
| `addCompetitiveIntel` | `{competitor, context, differentiators?}` | competitiveContext (all 3 sub-fields) | — | — |
| `addRiskSignal` | `signal, _details` | riskSignals (append) | riskDetected | — |
| `removeRiskSignal` | `signal` | riskSignals (filter) | — | — |
| `updateStage` | `stage` | currentStage, stageEnteredAt, interactionMemory, totalInteractions, lastInteractionDate | memoryUpdated | — |
| `getMemoryForPrompt` | — | — | — | — |
| `workflowProgress` | `{step, status, details?}` | — | workflowProgress | — |
| `setBriefReady` | `{brief, generatedAt, context}` | briefReady | briefReady | — |
| `dismissBrief` | — | briefReady.dismissed | — | — |
| `getBriefReady` | — | — | — | — |
| `setIntervention` | `intervention: ActiveIntervention\|null` | activeIntervention | interventionReady (if non-null) | — |
| `dismissIntervention` | — | activeIntervention.dismissed, interactionMemory, totalInteractions | — | — |
| `addCoordinatedIntel` | `{patternId, signalType, vertical, competitor?, synthesis, recommendations, affectedDeals, detectedAt}` | coordinatedIntel, interactionMemory, totalInteractions, lastInteractionDate | coordinatedIntelReceived | — |
| `runHealthCheck` | — | lastHealthCheck, healthScore, activeIntervention | healthChecked, interventionReady | — |

#### Events (8)

| Event | Payload | Triggered By |
|-------|---------|-------------|
| `memoryUpdated` | `{type, summary}` | recordInteraction, recordFeedback, updateStage |
| `learningsUpdated` | `{learnings[]}` | updateLearnings |
| `riskDetected` | `{signal, details}` | addRiskSignal |
| `workflowProgress` | `{step, status, details?}` | workflowProgress (passthrough) |
| `interventionReady` | `{type, title}` | setIntervention, runHealthCheck |
| `briefReady` | `{generatedAt}` | setBriefReady |
| `healthChecked` | `{score, issues[]}` | runHealthCheck |
| `coordinatedIntelReceived` | `{signalType, synthesis}` | addCoordinatedIntel |

#### Health Check Algorithm (`runHealthCheck`)

Starts at 100, applies deductions:

| Factor | Condition | Deduction | Issue Added |
|--------|-----------|-----------|-------------|
| Customer silence | `lastCustomerResponseDate` set and >14 days | -30 | Yes |
| Customer silence | `lastCustomerResponseDate` set and >7 days | -15 | Yes |
| Customer silence | Not set AND `totalInteractions > 2` | -20 | Yes |
| Risk signals | Per risk signal | -10 each | Yes (per signal) |
| MEDDPICC gaps | Learnings containing "gap"/"missing"/"needs engagement" | -5 each | No |
| Competitive pressure | Any competitors exist | -10 | No |
| Competitive pressure | 3+ recent mentions | -10 additional | Yes |
| Stage age | `daysInStage > threshold * 1.5` | -15 | Yes |

Stage thresholds: new_lead=7, qualified=14, discovery=21, technical_validation=28, proposal=14, negotiation=21, closing=14. Default=21.

Score clamped to 0-100. Intervention triggered when `score < 60` and no active undismissed intervention.

#### Intervention Logic

**NordicMed-specific** (demo constraint — company/deal name contains "nordicmed"):
- Requires risk signal containing "security"/"review"/"process_friction"/"friction"
- Requires `closeDate` set and `daysUntilClose < 70`
- Creates `timeline_risk` intervention with one-click close date adjustment (today + 84 days)
- Has an `action` field with `type: 'update_field'`, `field: 'close_date'`

**Generic** (all other deals when score < 60):
- Type selected from: `competitive_threat`, `stall_detected`, `stage_overdue`, `meddpicc_gap`
- Informational only — no `action` field (no one-click fix)

#### `formatMemoryForPrompt()` Output

Returns empty string if `!initialized` or `totalInteractions === 0`. Otherwise builds 7 sections:
1. Header — active days + interaction count
2. Key Learnings — bullet list
3. Recent Activity Pattern — last 5 interactions by type
4. Last Call Prep Feedback — rating + contextual note
5. Active Risk Signals — warning bullet list
6. Competitive Context — competitors, differentiators, last 3 mentions
7. Cross-Deal Intelligence — coordinator-pushed synthesis + recommendations

---

### 2.2 Transcript Pipeline (`transcriptPipeline`)

**File:** `apps/web/src/actors/transcript-pipeline.ts` (807 lines)
**Type:** Workflow actor (durable steps via `workflow()` + `ctx.loop()` + `loopCtx.step()`)
**Purpose:** Multi-step durable workflow that processes call transcripts through parallel AI analysis, MEDDPICC scoring, signal detection, learning synthesis, experiment attribution, email drafting, and deal agent/coordinator updates.

#### State Shape (`TranscriptPipelineState`)

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `dealId` | string | `""` | Current deal being processed |
| `status` | `"idle"\|"running"\|"complete"\|"error"` | `"idle"` | Pipeline lifecycle |
| `currentStep` | string | `""` | Current step name |
| `startedAt` | string\|null | `null` | ISO timestamp |
| `completedAt` | string\|null | `null` | ISO timestamp |
| `error` | string\|null | `null` | Error message |
| `actionItems` | ActionItem[] | `[]` | Extracted actions |
| `meddpiccUpdates` | Record<string, MeddpiccUpdate> | `{}` | Scored dimensions |
| `detectedSignals` | DetectedSignal[] | `[]` | Classified signals |
| `stakeholderInsights` | StakeholderInsight[] | `[]` | Per-person analysis |
| `newLearnings` | string[] | `[]` | Strategic learnings |
| `followUpEmail` | {subject,body}\|null | `null` | Drafted email |
| `experimentAttributions` | ExperimentAttribution[] | `[]` | Experiment evidence |

#### Input Shape (`PipelineInput` — via `process` queue message)

```
{ dealId, transcriptText, transcriptId, dealName, companyName, vertical,
  currentMeddpicc, existingContacts, agentConfigInstructions,
  assignedAeId, assignedAeName, appUrl, activeExperiments? }
```

#### `callClaude` Helper

- Raw `fetch` to `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Model: `claude-sonnet-4-20250514` (constant `MODEL`)
- No retry logic, no streaming, no timeout on fetch
- Throws on non-OK response

#### `parseJSON` Helper (4-strategy parser)

1. Markdown fence extraction
2. Outermost brace match
3. Raw parse
4. Truncation repair (closes unclosed brackets/braces)
Falls back to provided default on all failures.

#### RPCs

| Action | Purpose |
|--------|---------|
| `getState` | Returns `c.state` |
| `destroyActor` | Calls `c.destroy()` |

All work comes via `process` queue message, not RPCs.

---

### 2.3 Intelligence Coordinator (`intelligenceCoordinator`)

**File:** `apps/web/src/actors/intelligence-coordinator.ts` (358 lines)
**Type:** Simple actor (not workflow)
**Purpose:** Singleton that receives signals from all transcript pipelines, detects cross-deal patterns (2+ deals with same signal type in same vertical), synthesizes insights via Claude, and pushes intelligence back to affected deal agents.

#### State Shape (`CoordinatorState`)

| Field | Type | Default | Cap | Written By |
|-------|------|---------|-----|-----------|
| `signals` | Signal[] | `[]` | **200** | receiveSignal |
| `patterns` | Pattern[] | `[]` | **NONE** | receiveSignal |
| `lastSynthesisRun` | string\|null | `null` | — | synthesizePattern |
| `totalSignalsReceived` | number | `0` | — | receiveSignal |
| `totalPatternsDetected` | number | `0` | — | receiveSignal |

#### RPCs (6 actions)

| Action | Params | Purpose | External Calls |
|--------|--------|---------|----------------|
| `receiveSignal` | `Signal` | Validate, store, detect patterns | Schedule synthesizePattern 3s |
| `synthesizePattern` | `patternId: string` | Claude synthesis + push to deal agents | Claude API (1 call) + dealAgent.addCoordinatedIntel (N calls) |
| `getPatterns` | — | Return all patterns | — |
| `getPatternsForDeal` | `dealId` | Return patterns containing deal | — |
| `getStatus` | — | Return counters | — |
| `destroyActor` | — | Destroy actor | c.destroy() |

#### Pattern Detection Logic

A pattern is detected when 2+ signals share the same `signalType` + `vertical` from different deals. For `competitive_intel`, the `competitor` field must also match (case-insensitive).

Existing patterns are updated in-place rather than creating duplicates. Updated patterns get re-scheduled for synthesis.

#### Claude API Call (in `synthesizePattern`)

- Model: `claude-sonnet-4-20250514`, max_tokens: 1024
- **No system prompt** — single user message
- User prompt: ~300+ chars template asking for synthesis (2-3 sentences), recommendations (2-3), and ARR impact multiplier
- Response: `{ synthesis, recommendations[], arrImpactMultiplier }`
- Parsing: regex `\{[\s\S]*\}` then JSON.parse. Failure sets `pushStatus = "failed"`
- After synthesis: pushes to each affected deal agent via `addCoordinatedIntel`

#### Scheduling

`c.schedule.after(3000, "synthesizePattern", patternId)` — 3s delay for demo pacing. Can stack if multiple signals arrive rapidly (no deduplication of scheduled calls).

---

## Section 3: Transcript Pipeline Deep Dive

### Complete Step-by-Step Flow

```
Input (PipelineInput via "process" queue)
  │
  ▼
Step 1: init-pipeline
  │  Reset all state, status = "running"
  │
  ▼
Step 2: parallel-analysis [timeout: 180s]
  │  ├── Claude Call 1: Extract Actions (max_tokens: 1024)
  │  ├── Claude Call 2: Score MEDDPICC (max_tokens: 1024)
  │  └── Claude Call 3: Detect Signals (max_tokens: 2048)
  │  State: actionItems, meddpiccUpdates, detectedSignals, stakeholderInsights
  │
  ▼
Step 3a: progress-update-scores-start
  │
  ▼
Step 3b: persist-meddpicc [conditional: updatedFields.length > 0]
  │  API: PATCH /api/deals/[id]/meddpicc-update
  │  [Graceful: swallows errors]
  │
  ▼
Step 3c: create-signal-observations [conditional: signals.length > 0]
  │  API: POST /api/observations (parallel, per signal)
  │  [Graceful: per-observation .catch()]
  │
  ▼
Step 3d: progress-update-scores-done
  │
  ▼
Step 4: synthesize-learnings
  │  Claude Call 4: Synthesize (max_tokens: 1024, transcript truncated to 8K)
  │  State: newLearnings
  │
  ▼
Step 5: check-experiments [conditional: activeExperiments.length > 0]
  │  Claude Call 5: Attribution (max_tokens: 1024, transcript truncated to 12K)
  │  State: experimentAttributions
  │  API: PATCH /api/playbook/ideas/[id] (per attributed experiment)
  │
  ▼
Step 6: draft-email
  │  Claude Call 6: Draft (max_tokens: 1024)
  │  State: followUpEmail
  │  [Graceful: sets null on error]
  │
  ▼
Step 7: update-deal-agent
  │  RPCs to dealAgent:
  │  ├── recordInteraction (transcript_analysis)
  │  ├── updateLearnings (RAW learnings, not validated)
  │  ├── addCompetitiveIntel (per competitive_intel signal)
  │  ├── addRiskSignal (per high-urgency blocker/friction)
  │  └── recordInteraction (per matched stakeholder)
  │
  ▼
Step 8: send-signals-to-coordinator [timeout: 180s]
  │  RPC: coordinator.receiveSignal() per signal (sequential)
  │  [Graceful: swallows errors]
  │
  ▼
Step 9: auto-call-prep [timeout: 180s]
  │  API: POST /api/agent/call-prep
  │  RPC: dealAgent.setBriefReady()
  │  [Graceful: swallows errors]
  │
  ▼
Step 10: mark-complete
  │  State: status = "complete", completedAt
  │  Event: workflowProgress (finalize, complete)
```

### Claude Calls Summary

| # | Step | Purpose | System Prompt | max_tokens | Transcript Truncation |
|---|------|---------|---------------|------------|----------------------|
| 1 | parallel-analysis | Extract actions | ~147 chars | 1024 | 15,000 chars |
| 2 | parallel-analysis | Score MEDDPICC | ~202 chars | 1024 | 15,000 chars |
| 3 | parallel-analysis | Detect signals | ~1,710 chars | 2048 | 15,000 chars |
| 4 | synthesize-learnings | Synthesize | ~79 chars | 1024 | 8,000 chars |
| 5 | check-experiments | Attribution | ~300+ chars | 1024 | 12,000 chars |
| 6 | draft-email | Draft follow-up | ~123 chars | 1024 | N/A |

### Error Handling per Step

| Step | On Failure |
|------|-----------|
| init-pipeline | Aborts (inner catch) |
| parallel-analysis | Aborts (inner catch) — any of 3 parallel Claude calls failing aborts all |
| persist-meddpicc | Swallows error, continues |
| create-signal-observations | Per-observation catch, continues |
| synthesize-learnings | Aborts (inner catch) |
| check-experiments | Aborts (inner catch), but experiment evidence updates have per-experiment catch |
| draft-email | Swallows error, sets followUpEmail=null, continues |
| update-deal-agent | Aborts (inner catch) |
| send-signals-to-coordinator | Swallows error, continues |
| auto-call-prep | Swallows error, continues |
| mark-complete | Aborts (inner catch) |

### Critical Finding: Raw vs Validated Learnings

In the `synthesize-learnings` step, the `synthesis` variable holds RAW learnings from Claude. The `state.newLearnings` field gets validated learnings (via `validateLearnings()`). However, the `update-deal-agent` step passes `synthesis` (raw) to both `dealAgent.recordInteraction({insights: synthesis})` and `dealAgent.updateLearnings(synthesis)`. This means generic/short learnings rejected by validation still flow to the deal agent. The deal agent's `updateLearnings` runs its own `consolidateLearnings` which may catch some but not all rejected learnings.

---

## Section 4: State Persistence & Sync

### Deal Agent

| Aspect | Details |
|--------|---------|
| **Loads from Supabase on wake?** | No. State is Rivet-managed only. |
| **Writes to Supabase?** | No. All DB writes happen in API routes, not in the actor. |
| **Sync pattern** | None — actor state is independent of DB state. The pipeline writes to both the DB (via API routes) and the actor (via RPCs). |
| **Divergence risk** | If the pipeline succeeds at writing to the DB but fails writing to the actor (or vice versa), they diverge. The actor has no mechanism to reconcile with DB state. |
| **Reconstructible from DB?** | Partially. MEDDPICC scores, activities, and observations are in DB. But learnings, competitive context, coordinated intel, risk signals, interaction memory, and health score are actor-only — they would be lost on actor destruction. |

### Transcript Pipeline

| Aspect | Details |
|--------|---------|
| **Loads from Supabase on wake?** | No. Input data is passed via the `process` queue message (pre-fetched by the `/api/transcript-pipeline` route). |
| **Writes to Supabase?** | Yes, via API routes: `/api/deals/[id]/meddpicc-update`, `/api/observations`, `/api/playbook/ideas/[id]`, `/api/agent/call-prep`. |
| **Sync pattern** | Write-through: DB writes happen during pipeline execution. Actor state is ephemeral — reset on each new run. |
| **Reconstructible from DB?** | Yes. Pipeline results (MEDDPICC scores, observations, activities) are persisted to DB. Actor state is transient. |

### Intelligence Coordinator

| Aspect | Details |
|--------|---------|
| **Loads from Supabase on wake?** | No. |
| **Writes to Supabase?** | No. All state is in-memory only. |
| **Sync pattern** | None. Patterns and signals exist only in actor state. |
| **Divergence risk** | N/A — no DB counterpart exists. |
| **Reconstructible from DB?** | No. All coordinator state (signals, patterns, synthesis) would be lost on destruction. The `/api/intelligence/agent-patterns` route reads directly from the actor. |

### Demo Reset Impact

When `/api/demo/reset` destroys all actors:
- **Deal agents:** All learnings, interaction memory, competitive context, risk signals, coordinated intel, health scores are lost. These cannot be reconstructed from the DB.
- **Pipeline:** State is transient anyway — no data loss.
- **Coordinator:** All signals and patterns are lost. The intelligence dashboard shows empty until pipelines are re-run.

---

## Section 5: Client-Side Integration

### `useActor` Hook Consumers (4 components)

| Component | Actor | Key | RPCs Called | Events Subscribed | UI Behavior |
|-----------|-------|-----|-----------|-------------------|-------------|
| `agent-memory.tsx` | dealAgent | `[dealId]` | `getState()`, `initialize()` | memoryUpdated, learningsUpdated, coordinatedIntelReceived | Collapsible memory panel: learnings, risks, competitive context, coordinator intel |
| `workflow-tracker.tsx` | dealAgent | `[dealId]` | (none) | workflowProgress | 5-step progress tracker with auto-collapse |
| `agent-intervention.tsx` | dealAgent | `[dealId]` | `getState()`, `dismissIntervention()` | interventionReady, healthChecked | Intervention card with health bar, date picker, confirm/dismiss |
| `deal-detail-client.tsx` | dealAgent | `[deal.id]` | `getBriefReady()`, `dismissBrief()` | briefReady, workflowProgress | "Brief Ready" coral button, live MEDDPICC refresh |

### Connection Pattern

- All 4 components use `useActor` from `@/lib/rivet`
- Endpoint: `window.location.origin/api/rivet` (browser) or `NEXT_PUBLIC_SITE_URL/api/rivet` (SSR)
- No provider required — each hook creates its own connection
- Connection failure: silent — components show empty/default state with no error UI

### Server-Side Actor Access (API Routes)

| Route | Actor | RPC | Purpose |
|-------|-------|-----|---------|
| `/api/agent/call-prep` | dealAgent | `getMemoryForPrompt()` | 9th intelligence layer |
| `/api/transcript-pipeline` | transcriptPipeline | `send("process", ...)` | Enqueue work |
| `/api/intelligence/agent-patterns` | intelligenceCoordinator | `getPatterns()`, `getStatus()` | Fetch patterns |
| `/api/demo/reset` | all 3 | `destroyActor()` | Cleanup |

---

## Section 6: Actor Health Flags

### 1. State Bloat — Unbounded Arrays

| Actor | Field | Current Cap | Risk |
|-------|-------|-------------|------|
| dealAgent | `riskSignals` | **None** | Grows without bound. Each high-urgency blocker/friction signal adds an entry. |
| dealAgent | `competitiveContext.competitors` | **None** | Grows without bound per unique competitor. |
| dealAgent | `competitiveContext.ourDifferentiators` | **None** | Grows without bound per unique differentiator. |
| intelligenceCoordinator | `patterns` | **None** | New pattern per unique signalType+vertical+competitor combo. No pruning. |

### 2. Missing Error Handling

- **`callClaude` in transcript-pipeline:** No retry logic. Single failure aborts the `parallel-analysis` step (all 3 calls fail together via `Promise.all`).
- **`synthesizePattern` in intelligence-coordinator:** Single Claude call with no retry. Failure sets `pushStatus = "failed"` but pattern stays in state — no recovery mechanism.
- **Raw fetch to Anthropic API:** Both actors use raw `fetch` without the SDK's built-in retry, timeout, or rate-limit handling.

### 3. Stale State Risk

| Field | Risk | Scenario |
|-------|------|----------|
| `dealAgent.lastCustomerResponseDate` | **Always stale (never written)** | Health check always deducts 20 points after 2+ interactions |
| `dealAgent.daysSinceCreation` | **Always 0** | Never incremented after initialization |
| `dealAgent.closeDate` | **Stale after pipeline updates** | Pipeline calls `/api/deals/[id]/update` to change close date, but does NOT update the deal agent's `closeDate` field. The intervention card updates the DB but not the actor. |
| `dealAgent.currentStage` | **Potentially stale** | Only updated via `updateStage` RPC — if stage changes through `/api/deals/stage` without calling the actor, the actor's stage is wrong |
| `intelligenceCoordinator.patterns[].arrImpact` | **Semantically misleading** | Calculated as `multiplier * dealCount`, not actual ARR values |

### 4. Timeout Risks

| Actor | Step/Action | Timeout | Claude Calls | Risk |
|-------|------------|---------|-------------|------|
| transcriptPipeline | parallel-analysis | 180s | 3 parallel | Acceptable — 3 minutes for parallel calls |
| transcriptPipeline | send-signals-to-coordinator | 180s | 0 (sequential RPCs) | Could be slow with many signals — sequential sends |
| transcriptPipeline | auto-call-prep | 180s | 0 (calls API route which has its own Claude call) | Cascading timeout risk: API route has 120s maxDuration, step has 180s |
| transcriptPipeline | synthesize-learnings | **None** | 1 | No timeout protection |
| transcriptPipeline | draft-email | **None** | 1 | No timeout, but graceful degradation |
| transcriptPipeline | check-experiments | **None** | 1 | No timeout protection |

### 5. Dead RPCs

| Actor | RPC | Called By | Status |
|-------|-----|----------|--------|
| dealAgent | `removeRiskSignal` | UNKNOWN — grep found no callers | **Potentially dead** |
| dealAgent | `setIntervention` | Only called by `runHealthCheck` (internal) | Not dead, but never called externally |
| intelligenceCoordinator | `getPatternsForDeal` | UNKNOWN — grep found no callers | **Potentially dead** |

### 6. Missing Actor Destruction

- **When a deal is deleted:** No deal deletion API exists, but if one were added, the corresponding `dealAgent` and `transcriptPipeline` actors would not be destroyed.
- **When a deal stage changes to closed_won/closed_lost:** No actor destruction occurs. Closed deal agents continue to exist with stale state.
- **Demo reset edge case:** If a new deal is created during demo play (not currently possible via UI), its actor would not be destroyed on reset since reset only iterates existing DB deals.

### 7. Raw Fetch Risks

Both `transcript-pipeline.ts` and `intelligence-coordinator.ts` call Claude via raw `fetch`:
- No SDK retry logic (SDK retries on 429, 500, 503)
- No timeout on `fetch` itself (relies on Rivet step timeout if set)
- Manual `anthropic-version` header (`2023-06-01`) — could become outdated
- API key read from `process.env` on every call (no caching, but this is fine)

### 8. Hardcoded Values

| Actor | Value | Context | Production Impact |
|-------|-------|---------|-------------------|
| dealAgent | "nordicmed" company name check | Only NordicMed gets timeline_risk intervention with action button | All other deals get generic interventions without one-click fix |
| dealAgent | 30s / 10s scheduling intervals | Health check timing | Very aggressive for production — would create excessive health checks |
| dealAgent | Stage thresholds (7-28 days) | Health check stage age limits | May not match real enterprise sales cycles |
| intelligenceCoordinator | 3s synthesis delay | Demo pacing for pattern detection | Too fast for production (would want batching) |
| transcriptPipeline | 15,000 / 8,000 / 12,000 char truncation | Transcript limits per step | May truncate important content in long calls |
| dealAgent | `"Dr. Larsson"`, `"5 weeks"` in intervention diagnosis | NordicMed intervention text | Hardcoded persona names |

---

## Section 7: Summary Statistics

| Metric | Count |
|--------|-------|
| Total actors | 3 |
| Total RPCs across all actors | 26 (18 dealAgent + 2 transcriptPipeline + 6 intelligenceCoordinator) |
| Total Claude calls inside actors | 7 per pipeline run + 1 per coordinator synthesis = **8 max per transcript** |
| Total workflow steps (pipeline) | 10 (plus 4 progress-update sub-steps) |
| State fields: dealAgent | 20 |
| State fields: transcriptPipeline | 12 |
| State fields: intelligenceCoordinator | 5 |
| Scheduled actions: dealAgent | 2 patterns (runHealthCheck at 30s and 10s) |
| Scheduled actions: intelligenceCoordinator | 1 pattern (synthesizePattern at 3s) |
| Components using useActor | 4 |
| Dead state fields | 2 (lastCustomerResponseDate, daysSinceCreation) |
| Unbounded arrays | 4 (riskSignals, competitors, ourDifferentiators, patterns) |
| Potentially dead RPCs | 2 (removeRiskSignal, getPatternsForDeal) |

---

## Section 8: Files Phase 5 Should Read

Phase 5 (Data Flow Tracing — Transcript Pipeline) should trace the complete data path from transcript input to UI display:

### Pipeline Actor + Validation
1. `apps/web/src/actors/transcript-pipeline.ts` — the workflow itself
2. `apps/web/src/lib/validation.ts` — validateSignal, validateMeddpiccScore, validateLearnings, consolidateLearnings, normalizeCompetitorName, findCompetitorInText

### API Routes Called By Pipeline
3. `apps/web/src/app/api/deals/[id]/meddpicc-update/route.ts` — MEDDPICC persistence
4. `apps/web/src/app/api/observations/route.ts` — Signal observation creation (triggers full observation pipeline)
5. `apps/web/src/app/api/agent/call-prep/route.ts` — Auto call prep generation
6. `apps/web/src/app/api/deals/[id]/update/route.ts` — Deal field updates
7. `apps/web/src/app/api/playbook/ideas/[id]/route.ts` — Experiment evidence updates

### Deal Agent (receives pipeline output)
8. `apps/web/src/actors/deal-agent.ts` — recordInteraction, updateLearnings, addCompetitiveIntel, addRiskSignal, setBriefReady

### Intelligence Coordinator (receives signals)
9. `apps/web/src/actors/intelligence-coordinator.ts` — receiveSignal, synthesizePattern

### API Route That Triggers Pipeline
10. `apps/web/src/app/api/transcript-pipeline/route.ts` — context gathering
11. `apps/web/src/app/api/analyze/link/route.ts` — upstream trigger

### UI Components That Display Pipeline Results
12. `apps/web/src/components/workflow-tracker.tsx` — real-time progress
13. `apps/web/src/components/agent-memory.tsx` — learnings, risks, intel
14. `apps/web/src/components/agent-intervention.tsx` — health-triggered interventions
15. `apps/web/src/app/(dashboard)/pipeline/[id]/deal-detail-client.tsx` — brief ready, MEDDPICC refresh
16. `apps/web/src/app/(dashboard)/intelligence/intelligence-client.tsx` — agent-detected patterns

### Database Tables Written During Pipeline
17. `packages/db/src/schema.ts` — meddpiccFields, observations, observationClusters, observationRouting, activities, playbookIdeas, agentConfigs, agentConfigVersions, notifications (all via API routes called by pipeline)

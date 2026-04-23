# 07 — Data Flows

> **Reconciliation banner (added 2026-04-22).** Status: **FROZEN v1 snapshot.** The 8 v1 lifecycles below are preserved as the "what v2 replaces" reference. Key Known Issues resolved by v2:
>
> - **Flow 2 "Brief Ready" browser-dependent** → §2.6 jobs table + pg_cron worker + Supabase Realtime (shipped Phase 1 Day 3; no browser-polling dependency).
> - **Flow 6 coordinator → call-prep broken edge** → §2.17 call prep reads `coordinator_patterns` directly (wiring lands Phase 4 Day 2; no actor hop).
> - **Flow 1 pipeline step 9 = 15 no-op RPCs** → §2.6 Rivet removed + §2.24 pipeline simplification (Phase 3 Day 2 ships 7-step pipeline with no no-ops).
> - **Flow 7 Known Issue #1 NordicMed-name-hardcoded intervention** → §1.14 + §2.21 applicability gating (lands Phase 5 Day 1).
> - **Flow 7 Known Issue #2 healthScore has no column** → event-sourced per §2.16 + applicability flags per §2.21.
>
> Phase 3+ sessions read this doc as the v1 baseline for understanding what v2 is replacing flow-by-flow. Not a current-state reference.

---

End-to-end lifecycles for the 8 major features. Uses Framework 1 vocabulary: CREATE → STORE → PROCESS → RETRIEVE → RENDER → UPDATE/DELETE → KNOWN ISSUES.

References to other docs:
- Prompts: `#N` = entry #N in 04-PROMPTS.md.
- Routes: full paths as in 03-API-ROUTES.md.
- Tables / columns: as in 02-SCHEMA.md.
- Actor behavior: as in 05-RIVET-ACTORS.md.
- UI components: as in 06-UI-STRUCTURE.md.

Each "BROKEN" flag is followed by a SHOULD BE section where the intended behavior differs from what the code actually does at commit `c71d2b6`.

---

## Flow 1: Transcript upload and processing

The deepest flow in Nexus. One transcript triggers 6 Claude calls, writes to 5 tables, pushes signals to the org-wide coordinator, and drives the workflow tracker on the browser via WebSocket.

### CREATE
- **Origin:** Rep pastes a call transcript OR an existing `call_transcripts` row is re-processed.
- **UI component:** `DealDetailClient` (06 §3A) exposes a "Process Transcript" button per transcript row. Clicking POSTs the transcript text to the pipeline endpoint. Same path triggered from `/api/analyze/link` (after running the /analyze streaming UI) and `/api/demo/prep-deal` (loop over all unprocessed transcripts).
- **API route that receives it:** `POST /api/transcript-pipeline` (03 §transcript-pipeline, `maxDuration=300`).
- **Request shape:** `{ dealId: string, transcriptText: string, transcriptId?: string }`.

### STORE (pre-enqueue, in `/api/transcript-pipeline` itself)
Before enqueuing to Rivet, the route performs 5 parallel reads to assemble `PipelineInput`:
1. `deals` ⨝ `companies` — deal.name, vertical, assignedAeId, companyName.
2. `meddpiccFields` — current scores (for delta calculation).
3. `contacts` (by companyId) — existingContacts array.
4. `agentConfigs` (by assignedAeId + isActive=true) — rep's instructions.
5. `playbookIdeas` where `status='testing' AND assignedAeId = ANY(test_group)` — activeExperiments.
6. `teamMembers` (by assignedAeId) — assignedAeName.

Then **writes**:
- `callTranscripts.pipelineProcessed = true` immediately (before pipeline runs — "pipeline always completes" contract).

Finally enqueues: `transcriptPipeline.getOrCreate([dealId]).send("process", { ... })` to the Rivet workflow actor.

### PROCESS (the workflow — 05 §2.2)
The pipeline actor runs through its step loop on Rivet:

| # | Step | Claude prompt | DB writes |
|---|------|---------------|-----------|
| 1 | `init-pipeline` | — | Resets `loopCtx.state`. |
| 2 | `parallel-analysis` (180s timeout) | **#19** extract actions, **#20** score MEDDPICC, **#21** detect signals + stakeholder sentiment | none (in-memory) |
| 3 | `persist-meddpicc` | — | `PATCH /api/deals/[id]/meddpicc-update` → `meddpiccFields` (upsert per dimension with delta≠0 OR score>0) + `activities` (`type='note_added'`, source=`'transcript_pipeline'`) |
| 4 | `create-signal-observations` (120s) | — | `POST /api/observations` with `preClassified: true` per signal → `observations` row per signal (skips classifier, writes cluster assignment as null initially — the semantic matcher in `/api/observations` runs a separate pass with `#2` and `#3` for these pre-classified writes too) |
| 5 | `synthesize-learnings` | **#22** | none (in-memory) |
| 6 | `check-experiments` (conditional) | **#23** | `PATCH /api/playbook/ideas/[experimentId]` → `playbookIdeas.experimentEvidence` jsonb (append) |
| 7 | `draft-email` (graceful) | **#24** | none (in-memory, followUpEmail) |
| 8 | `save-state-to-supabase` | — | `POST /api/deal-agent-state` → `dealAgentStates` (upsert by `deal_id`): `interactionCount += 1`, `lastInteractionDate`, `lastInteractionSummary`, `learnings` (merged), `riskSignals` (for deal_blocker + high-urgency process_friction), `competitiveContext`, `pipelineStatus: "running"`, `pipelineStep: "update_deal_agent"` |
| 9 | `update-deal-agent` | — | **All no-op RPCs** to `dealAgent` (05 §2.1). Specifically: `recordInteraction`, `updateLearnings`, `addCompetitiveIntel` per competitor, `addRiskSignal` per blocker, `recordInteraction` per matched stakeholder. These log but do nothing. |
| 10 | `send-signals-to-coordinator` (180s) | — | RPC to `intelligenceCoordinator.getOrCreate(["default"]).receiveSignal({...})` per signal. See Flow 6. |
| 11 | `flag-brief-pending` | — | `POST /api/deal-agent-state` → `dealAgentStates.briefPending: true`. Plus a no-op RPC `dealAgent.setBriefPending(true)` "for backward compat". |
| 12 | `mark-complete` | — | `POST /api/deal-agent-state` → `dealAgentStates.pipelineStatus: "complete"`. Sets `loopCtx.state.status = "complete"`. Broadcasts final `workflowProgress({ step: "finalize", status: "complete" })`. |

**In parallel throughout:** every step calls `dealAgent.workflowProgress({ step, status, details })` which `c.broadcast("workflowProgress", ...)` to any WebSocket subscriber (Flow surfaces on the deal detail page).

> The CLAUDE.md header lists 9 pipeline steps. At commit `c71d2b6`, the actor has 12 steps as listed above (with `check-experiments` conditional, so 11 when no experiments are testing). The widely-cited "9" count dates from before the state-migration split that added `save-state-to-supabase` and `flag-brief-pending` as separate steps.

### RETRIEVE
- `DealDetailClient` calls `GET /api/deals/[id]/meddpicc` after `workflowProgress` event `update_scores: complete` — live MEDDPICC refresh.
- `DealDetailClient` fires `POST /api/deal-fitness/analyze` after `workflowProgress` event `finalize: complete` (see Flow 2).
- `AgentMemory` component calls `GET /api/deal-agent-state?dealId=...` — polls after `finalize` complete (via `triggerRefetch` key).
- `WorkflowTracker` component: subscribes to the `dealAgent` actor's `workflowProgress` event via `useActor` + `.connection.on("workflowProgress", ...)`.
- **The "Brief Ready" flag** is polled: `DealDetailClient` calls `GET /api/deal-agent-state?dealId=...` and checks `state.briefPending`. When true, the client fires `POST /api/agent/call-prep` ITSELF (see Flow 2).

### RENDER
- **Workflow tracker panel** (06 §3B — `WorkflowTracker`): floating 5-step progress bar (Analyze Transcript / Update Scores / Check Experiments / Synthesize / Finalize). Auto-collapses 30s after complete.
- **MEDDPICC table** on deal page: numeric confidence per dimension + evidence text; refreshes live on `update_scores: complete`.
- **Activity feed:** new `note_added` row with `source: 'transcript_pipeline'` (rendered with `getEffectiveType()` fallback — activity-feed.tsx:45, see 02-SCHEMA §4.1).
- **Field Feed** (intelligence page): each pipeline-generated observation appears as a tile with `source: pipeline` badge.
- **Agent Memory** card on deal page: updated learnings + risk signals + competitive context.
- **Cross-deal patterns** in Intelligence dashboard (Flow 6).
- **Brief Ready** badge on deal detail page (coral "Prep Call" button) once `briefPending=true`.

**Framework 4 — missing data:**
- No transcript text → 400 error at POST. Surfaced in the UI as a toast.
- Claude call 429 → `callClaude()` retries 3× then throws; pipeline goes to `handle-error`, reports `workflowProgress({ step: currentStep, status: "error" })`.
- `draft-email` failure → pipeline continues; brief just lacks a draft email (graceful degradation).

### UPDATE/DELETE
- **Re-processing the same transcript:** the pipeline is keyed by `dealId`, not `transcriptId` — a second run for the same deal resumes the existing workflow actor. Rivet's workflow replay semantics mean prior steps may be re-played. See 05 §4.3.
- **Demo reset** (`POST /api/demo/reset`) deletes pipeline-generated observations, clears MEDDPICC, nukes actors. See 03 §demo/reset.
- No direct "undo transcript analysis" UX. Consumers have to reset and re-run.

### KNOWN ISSUES (drawn from 05 §4)
1. **Brief generation moved OUT of the pipeline** (line 806-808 of the actor file): the previous Rivet-Cloud→Vercel→Claude chain timed out on production. Now the pipeline sets `briefPending` and the browser fires `/api/agent/call-prep`. The flow in Flow 2 is not what the pipeline does — it's what the browser does after the pipeline.
2. **Step 9 is ~15 no-op RPCs.** Every pipeline run hits the `dealAgent` actor over the network for nothing. Pure latency cost.
3. **Signal-type drift** between `#21` (7 types) and `/api/observations` `#1` classifier (9 types). Pipeline observations will never have `agent_tuning` or `cross_agent`.
4. **Stale workflow replay** causes `rotate-medvista-uuid.ts` to exist. Not user-facing, but requires operator awareness.
5. **Transcript truncation varies** step-to-step: 15K for parallel-analysis, 12K for experiments check, 8K for learnings synthesis. Silent.

---

## Flow 2: Call prep generation

Largest Claude prompt in the system (~3000 tokens of system prompt). Assembles 8+ intelligence layers.

### CREATE
- **Origin:** One of three triggers.
  1. **Manual:** Rep clicks "Prep Call" on the deal detail page.
  2. **Auto after pipeline:** Pipeline's `flag-brief-pending` step sets `briefPending=true`; browser polls; when set, client-side fires call-prep.
  3. **MCP tool:** `generate_call_prep` MCP tool (03 §mcp).
- **UI component:** `DealDetailClient` (brief modal trigger). `ObservationInput` can also fire it via the "Prep for call" sub-command.
- **API route:** `POST /api/agent/call-prep` (03 §agent/call-prep, `maxDuration=300`).
- **Request shape:** `{ dealId?, accountId?, memberId, rawQuery?, prepContext?, attendeeIds?, autoGenerated? }`.

### STORE
**None by this route.** Call prep is a read-only synthesis. No rows written.

Save-on-confirm is a separate step via `POST /api/agent/save-to-deal` (03 §agent/save-to-deal), which writes to `activities` with `type='call_prep'`.

### PROCESS
1. **Deal resolution:** if no `dealId`, does an in-memory fuzzy match of `rawQuery` against all deal names + company names; falls back to the AE's latest deal.
2. **Parallel context fetch** (7 queries): `deals` ⨝ `companies` ⨝ `meddpiccFields`, `contacts` by companyId, recent `activities` ⨝ `teamMembers`, `agentConfigs` by memberId + isActive, last 3 `callTranscripts` ⨝ `callAnalyses`, `teamMembers` by id.
3. **Sequential context fetches** (6 more): `systemIntelligence` filtered by vertical + active + ordered by relevanceScore limit 5; `managerDirectives` filtered by scope + vertical + active + not expired; `deals` where stage in (closed_won, closed_lost) limit 10 (for win/loss patterns); `playbookIdeas` where `status='promoted' AND (vertical=dealVertical OR vertical IS NULL)` limit 3; `playbookIdeas` where `status='testing' AND this dealId IN test_group_deals` limit 2; `playbookIdeas` where `memberId IN test_group` (active AE experiments); `playbookIdeas` where `status IN ('graduated', 'promoted')` limit 5 (proven plays).
4. **Stakeholder engagement loop:** for each key contact (`roleInDeal IN ('economic_buyer', 'champion')`), runs a `COUNT(*)` against activities — flags if < 2 interactions.
5. **Agent memory fetch:** `GET /api/deal-agent-state?dealId=...` — reads `learnings`, `riskSignals`, `competitiveContext`, `interactionCount`, `coordinatedIntel`. Formats via `formatMemoryForPrompt()`.
6. **Fitness context:** queries `dealFitnessEvents` + `dealFitnessScores`. Builds an inline prompt section with category scores, detected vs not_yet events, imbalance flag, buyer commitments.
7. **Claude call** using prompt **#11** (`max_tokens: 3000`). Assembles the system prompt from ~12 conditional sections (agent config, memory, fitness, system intelligence, win/loss patterns, stakeholder alerts, manager directives, playbook — both promoted and testing and active-experiments-for-AE, proven plays).
8. **Parse:** regex `text.match(/\{[\s\S]*\}/)` then `JSON.parse`.

### RETRIEVE
Caller consumes the return value directly. No DB retrieval downstream except the "Save to Deal" action.

### RENDER
- **Inline brief modal** in `DealDetailClient` — coral card with 10+ sections: headline, proven_plays, talking_points, questions_to_ask, deal_fitness_insights, risks_and_landmines, next_steps, deal_snapshot, stakeholders_in_play, competitive_context, system_intelligence, manager_directives.
- **Save button:** `POST /api/agent/save-to-deal` writes `activities` row with the full brief in `metadata`. Then renders in `ActivityFeed` timeline with `type='call_prep'` (or `note_added + metadata.source='call_prep'` for legacy compatibility).

**Framework 4 — missing data:**
- No MEDDPICC → prompt emits `"No MEDDPICC data available"` text.
- No agent config → prompt falls back to "Professional and data-driven" style; no guardrails.
- No transcripts → `previous_calls` array empty.
- No fitness data → `deal_fitness_insights` section omitted from the conditional prompt assembly.
- No coordinator intel → **silent omission** (see Flow 6 BROKEN).

### UPDATE/DELETE
- A brief is regenerable anytime (just calls the route again). Each run is independent.
- Saved briefs live as `activities` rows; edited by updating the row directly (no dedicated endpoint).
- Demo reset deletes pipeline-generated activities including those with `subject ILIKE 'call prep%'` or `subject ILIKE 'brief%'` (03 §demo/reset pattern list).

### KNOWN ISSUES
1. **Auto-fired from browser, not pipeline.** Documented in 05 §4.2. The "agent prepares ahead of the call" narrative is only as real as the browser being open.
2. **Proven-plays prompt is aggressive** ("MANDATORY INSTRUCTIONS … These are not suggestions — they are requirements"). Model still sometimes omits them. No deterministic enforcement.
3. **`coordinatedIntel` is always empty** — see Flow 6 BROKEN. The prompt has a formatted memory section for cross-deal intel, but the underlying column is never populated by the coordinator.
4. **N+1 query** in step 4 (stakeholder engagement loop).
5. **Vertical narrowing cast** at line 283 (`as typeof deals.vertical.enumValues[number]`) will break on any new vertical value.
6. **`isPrimary: false` hardcoded** in the returned contacts list (call-prep/route.ts:818) — data shape lies to the client.

---

## Flow 3: Observation capture

The capture surface that distinguishes Nexus from a standard CRM. Any rep types a raw observation and Claude classifies/clusters/routes it.

### CREATE
- **Origin:** Two paths.
  1. **Rep-initiated:** Rep types in the Universal Agent Bar (`ObservationInput`) at the bottom of any dashboard page.
  2. **Pipeline-initiated:** `transcriptPipeline` actor creates one observation per detected signal (with `preClassified: true`).
- **UI component:** `ObservationInput` (06 §3B, 2,130 LOC). Also called from:
  - `BookClient` drawer action "Log Observation".
  - `/api/deals/stage` when closing a deal (creates observations for each confirmed close factor).
  - `/api/field-queries/respond` when an AE answers a field query.
  - `/api/playbook/ideas/[id]` when an experiment graduates.
  - MCP tool `log_observation` (via `/api/observations`).
- **API route:** `POST /api/observations` (03 §observations, `maxDuration=30`).
- **Request shape:** `{ rawInput: string, observerId: string, context?: { page, dealId, accountId, trigger, transcriptId, signalType }, preClassified?, signalType?, severity?, aiClassification? }`.

### STORE
- **Dedup check:** For pipeline-originated observations (`trigger='transcript_pipeline' + transcriptId + signalType + dealId`), checks for existing match and returns early if found.
- **Main write:** `observations` row with `aiClassification`, `aiGiveback`, `sourceContext`, `linkedAccountIds[]`, `linkedDealIds[]`, `extractedEntities`, `clusterId` (from matching pass), `lifecycleEvents` (`[submitted, classified, optionally clustered]`), `followUpQuestion`, `followUpChips[]`, `arrImpact` jsonb.
- **Cluster update:** If matched to existing cluster, `observationClusters.observationCount += 1`, `observerCount += 1` if new observer, `lastObserved = now`, append to `unstructuredQuotes[]`.
- **New cluster:** If ≥1 matching-ids from prompt #3, create `observationClusters` row with all matched observations pointed at it.
- **Routing:** `observationRouting` row per signal type, routed to the appropriate support function.
- **Process innovation:** If signal type is `process_innovation`, creates a `playbookIdeas` row (status=`proposed`, category=`process`, originatedFrom=`observation`).
- **Agent tuning / cross-agent:** If either signal type present, calls `applyAgentChange()` which runs prompt **#4** and potentially writes `agentConfigs` + `agentConfigVersions` + `notifications`.

### PROCESS
1. Dedup check (pipeline only).
2. Look up observer info from `teamMembers`.
3. Fetch accounts (all) + observer's deals (`assignedAeId = observerId`).
4. **Classification:** prompt **#1** (`max_tokens: 1500`) — returns `{ classification: { signals[], sentiment, urgency, entities, linked_accounts, linked_deals, needs_clarification }, follow_up: { should_ask, question, chips }, acknowledgment }`. Skipped if `preClassified: true`.
5. **Entity resolution:** `resolveEntities()` maps extracted entity names to real account/deal IDs via string match.
6. **Cluster matching:** prompt **#2** (`max_tokens: 200`). Returns `{ cluster_id, confidence }`. Code requires `confidence >= 0.6` to accept.
7. **New cluster detection:** If no existing match, prompt **#3** (`max_tokens: 300`) over up to 30 unclustered observations. Returns `{ matching_ids[], pattern_title, pattern_description }`. If ≥1 matches, creates new `observationClusters` row.
8. **ARR impact calculation:** `calculateArrImpactFromDeals(resolvedDealIds)` sums `deal_value` across linked deals.
9. **Cluster side effects:** `appendQuoteToCluster` writes the rawInput to `unstructuredQuotes` jsonb.
10. **Routing:** `createRoutingRecords()` writes one `observationRouting` row per signal type via hardcoded `SIGNAL_ROUTES` map (`competitive_intel → "Product Marketing"`, `content_gap → "Enablement"`, etc.).
11. **Auto-playbook idea:** If any signal is `process_innovation`, insert `playbookIdeas` row.
12. **Agent signal processing:** If any signal is `agent_tuning` or `cross_agent`, calls `applyAgentChange()` per target member. Prompt **#4** suggests a minimal config change; if `should_apply=true`, appends to instructions (never replaces) + merges outputPreferences + writes version history + sends notification.

### Follow-up sub-flow (prompted by the classifier)
If `follow_up.should_ask=true`, the rep sees a chip-based question inline. When answered:
- **API:** `POST /api/observations/[id]/follow-up`.
- **Process:** Maps chip response to structured data via hardcoded `CHIP_TO_STRUCTURED` lookup; free-text parse fallback. Calculates ARR impact from linked deals. Updates `observations.structuredData`, `observations.arrImpact`, `observations.lifecycleEvents += [follow_up_answered, routed]`. If scope broader than `this_deal`, fires **notification chains** to other reps in the same vertical via `notifications` inserts.

### RETRIEVE
- **Intelligence page** (`/intelligence`): `GET /api/intelligence` returns `observationClusters` + `observations` ⨝ `teamMembers` + acknowledged routing + close factor aggregates + active directives.
- **Field feed tab**: same endpoint, uses the `observations` slice.
- **Deal detail observations list:** `/api/pipeline/[id]/page.tsx` server-fetches `observations` filtered by `sourceContext.dealId = id OR id = ANY(linkedDealIds)`.
- **Response kit generation (`/api/customer/response-kit`):** reads last 20 observations as cross-account pattern input (no filter).
- **Pending field queries (`QuickQuestions`):** fetches `fieldQueryQuestions` — separate table, not observations.
- **Routing inbox** (unused UI): `GET /api/observation-routing?targetFunction=...` — this endpoint is candidate dead code (03 §summary).

### RENDER
- **Giveback card** in `ObservationInput`: shows acknowledgment + related-observations hint + routing target + ARR impact after submit.
- **Intelligence — Patterns tab:** one tile per cluster with title, severity, ARR impact, observation count.
- **Intelligence — Field Feed tab:** one tile per observation with signal type, observer name/role, raw input, timestamp.
- **Intelligence — Close Intelligence tab:** aggregated loss/win factors (derived from deals' `closeFactors`/`winFactors`, not from observations directly).
- **Deal detail observations list:** linked observations rendered as a sub-list.
- **Notification** sent to targeted rep on agent config auto-change (type=`agent_recommendation`).

**Framework 4 — missing data:**
- No Claude API key → `fallbackClassify()` runs a regex-based classifier with 7 signal types.
- No entities resolved → `linkedDealIds`/`linkedAccountIds` stay null. Observation is still saved.
- No cluster match → proceed without cluster.
- ARR impact unknown → `arrImpact: null`.

### UPDATE/DELETE
- **Update:** No direct update endpoint. Follow-up writes through `/api/observations/[id]/follow-up`. Updating `status` / `lifecycleEvents` happens only through that route.
- **Delete:** Demo reset deletes all pipeline-originated observations (`sourceContext.trigger = 'transcript_pipeline'`) and orphaned clusters. No user-facing delete UI.

### KNOWN ISSUES
1. **`preClassified: true` skips Claude entirely** — an untrusted caller can inject arbitrary classifications. Pipeline uses this legitimately; MCP uses proper classification.
2. **Agent config auto-mutation has no human-in-the-loop** (prompt #4 path). The system silently appends text to the agent's instructions. DECISIONS.md Guardrail #7 says experiments should be soft-mode only; this is stronger than soft-mode.
3. **Chip-to-structured lookup is fragile** (follow-up route, 20+ hardcoded string keys). A new chip label that doesn't exactly match the lookup falls through to free-text parsing.
4. **Notification chains fire for every non-`this_deal` scope change**, with priority=high for `whole_vertical`/`org_wide`. Unclear whether this is still in scope for the demo.
5. **`linkedDealIds` / `linkedAccountIds`** are uuid[] without FK enforcement (02 §4.7) — observations can point at deleted deals.
6. **Signal-type list inconsistency** between prompt #1 (9 types) and pipeline prompt #21 (7 types).

---

## Flow 4: Deal creation and MEDDPICC scoring

### CREATE
**Deals are not created by any UI in the current codebase.** There is no `POST /api/deals` route (confirmed in 03). All deals come from:
- Seed scripts (`packages/db/src/seed-*.ts`).
- Demo reset re-seeding.

**MEDDPICC scoring** has three write paths:

1. **Automated (via pipeline):** Transcript → prompt **#20** → `PATCH /api/deals/[id]/meddpicc-update` → `meddpiccFields` upsert. Writes a `note_added` activity. (Flow 1 step 3.)
2. **Automated (via close analysis):** User chooses Close Won/Lost → prompt **#14** produces `meddpicc_gaps[]` as narrative — but does NOT write to `meddpiccFields`. The gaps appear in close analysis only.
3. **Manual (via seed script):** `seed-book.ts` and `demo/reset` re-seed MEDDPICC for 4 named deals (NordicMed, Atlas, HealthBridge, MedTech).

**There is no manual "edit MEDDPICC" UI.** The deal detail page displays MEDDPICC but the only way to change it is via transcript pipeline or direct DB write. The `aeConfirmed` column exists but is never flipped true by any code path.

### STORE
- **Primary:** `meddpiccFields` — one row per deal (unique index on `deal_id`). Columns: `metrics`, `metricsConfidence`, `economicBuyer`, `economicBuyerConfidence`, ..., `competitionConfidence`, `aiExtracted`, `aeConfirmed`.
- **Audit:** `activities` — `type='note_added'` with `metadata.source='transcript_pipeline'` and `metadata.updates: { dimensionName: { score, evidence, delta } }`.

### PROCESS
The scoring logic lives in prompt **#20**:
- For each dimension (7 total), Claude returns `{ score: 0-100, evidence: "quote", delta: positive|negative|zero }` only when new evidence is present.
- `/api/deals/[id]/meddpicc-update` writes the dimension if `delta !== 0` (existing row) or `score > 0` (new row).
- `validateMeddpiccScore()` normalizes scores.

### RETRIEVE
- **Deal detail page:** server-fetched via Drizzle directly (no API roundtrip).
- **Live refresh after pipeline:** `GET /api/deals/[id]/meddpicc` — called on `workflowProgress.update_scores.complete`.
- **Call prep (#11):** reads MEDDPICC inline via Drizzle.
- **Close analysis (#14):** reads MEDDPICC to identify "critically low" fields.
- **Deal-scoped manager question (#8):** includes MEDDPICC in the deal context sent to Claude.
- **MCP tool `get_deal_details`:** returns MEDDPICC.

### RENDER
- **Deal detail MEDDPICC tab** (`DealDetailClient`): 7 rows with confidence bar, evidence text, and an "updated from transcript" pulse when live refresh fires.
- **Call prep brief:** `questions_to_ask[].meddpicc_gap` field references the gap a question fills.
- **Close analysis modal:** `meddpicc_gaps[]` list.
- **Intervention:** none today (see Flow 7).

**Framework 4 — missing data:**
- No transcript yet → all confidences = 0 (defaults).
- Score present but evidence null → rendered as score-only (uncommon).

### UPDATE/DELETE
- **Update:** only via pipeline or seed re-insert. **No UI to edit.**
- **Delete:** demo reset clears all MEDDPICC + re-seeds 4 deals. No user-facing delete.
- **Cascades:** `meddpiccFields.dealId` has no `ON DELETE` — deleting a deal would orphan the row (02 §4.5).

### KNOWN ISSUES
1. **No deal creation UI.** Everything assumes seeded deals. First rebuild task will be `POST /api/deals`.
2. **No MEDDPICC edit UI.** `aeConfirmed` column exists but is never set. Reps cannot correct AI mistakes.
3. **Live refresh after pipeline is non-deterministic** — the `GET /api/deals/[id]/meddpicc` fires on the WebSocket event, but if the WebSocket is disconnected at that moment (common on serverless cold start) the UI stays stale until page reload.
4. **Close analysis produces `meddpicc_gaps[]` that don't feed back** — they're displayed in the modal but not persisted to `meddpiccFields`, not captured as observations, not included in call prep for the next deal.

---

## Flow 5: Experiment lifecycle (proposed → testing → graduated)

Implements the "test a tactic, measure it, scale the winner" pattern described in CLAUDE.md.

### CREATE
Three entry paths:
1. **Auto-created from observation:** `POST /api/observations` with a `process_innovation` signal inserts a `playbookIdeas` row (status=`proposed`, category=`process`, originatedFrom=`observation`, sourceObservationId set).
2. **Manual via Playbook page:** `PlaybookClient` (06 §3A) — user can create a proposed idea in the UI (the API route for this is **not** in 03; the route that handles it is `PATCH /api/playbook/ideas/[id]` for updates only). **This is a gap** — the UI apparently has a proposal form, but the backing POST route is missing from 03's 41-route census.
3. **Seed scripts:** `seed-playbook.ts`, `seed-playbook-lifecycle.ts` seed 8 experiments. Demo reset re-seeds all 8 each run.

### STORE
`playbookIdeas` — single row per experiment. Columns of note:
- Lifecycle: `status` (text; `proposed | testing | graduated | rejected | archived | promoted | retired`), `testGroup[]` (text[]), `controlGroup[]`, `successThresholds` (jsonb: `{ velocity_pct, sentiment_pts, close_rate_pct }`), `currentMetrics` (jsonb), `approvedBy`, `approvedAt`, `experimentStart`, `experimentEnd`, `graduatedAt`.
- Evidence: `experimentEvidence` (jsonb array of `{ dealId, dealName, date, source, tacticUsed, evidence, customerResponse, sentiment }`).
- Attribution: `attribution` jsonb `{ proposed_by, proposed_at, approved_by, impact_arr, scaling_scope }`.

Valid transitions enforced in `/api/playbook/ideas/[id]`:
```
proposed  → testing | rejected
testing   → graduated | archived
rejected  → (terminal)
graduated → (terminal)
archived  → (terminal)
```

`promoted` and `retired` are listed as legacy with empty allowed transitions; seeded data still uses `promoted`.

### PROCESS
- **Approval** (`status: proposed → testing`): `PATCH /api/playbook/ideas/[id]` with `{ status: "testing", test_group, success_thresholds, approved_by, experiment_duration_days }`. Auto-sets `approvedAt=now`, `experimentStart=now`, `experimentEnd = now + duration_days × day`.
- **Evidence accumulation during testing:** Every transcript pipeline run for a deal whose AE is in `test_group` triggers prompt **#23** and PATCHes the experiment with appended `experiment_evidence[]`. See Flow 1 step 6.
- **Graduation** (`status: testing → graduated`): PATCH with `{ status: "graduated" }`. On success, creates a `process_innovation` observation summarizing the experiment (see route body lines 96-134) — this observation flows back into the intelligence dashboard and gets picked up as a seed for cross-team inspiration.
- **Integration with call prep (prompt #11):** Proven plays (`status IN ('graduated', 'promoted')`) are injected as mandatory sections. Testing experiments where the AE is in `test_group` are surfaced as "active experiments".

### RETRIEVE
- **Playbook page:** server-fetched via Drizzle at `/playbook/page.tsx` — full projection of every experiment with metrics, attribution, evidence jsonb (via raw SQL wrapped in try/catch for legacy compatibility).
- **Call prep:** inline queries for both promoted and testing experiments.
- **Pipeline enqueue:** `/api/transcript-pipeline` pre-fetches active experiments for the assigned AE.

### RENDER
- **Playbook page** tabs: Active Experiments (testing), What's Working (graduated + promoted), Influence (scores).
- **Call prep brief:** Proven Plays section (must have at least one entry if any exist — see prompt #11 "MANDATORY INSTRUCTIONS"); active_experiments array.
- **Deal fitness gaps:** `matched_play` field links a fitness gap to a proven play (prompt #11 deal_fitness_insights.gaps[].matched_play).
- **Intelligence dashboard Field Feed:** graduation-generated observation appears as a tile with `process_innovation` signal badge.

**Framework 4 — missing data:**
- No metrics → prompt shows "Proven effective across the team" instead of velocity numbers.
- No evidence → experiment shows in Playbook but with an empty evidence drill-down.

### UPDATE/DELETE
- **Update:** via `PATCH /api/playbook/ideas/[id]`. Fields: `status`, `structured_feedback`, `test_group`, `control_group`, `success_thresholds`, `current_metrics`, `approved_by`, `approved_at`, `experiment_start`, `experiment_end`, `experiment_duration_days`, `attribution`, `experiment_evidence`.
- **Status transitions strictly enforced** (see table above).
- **Delete:** no endpoint. Demo reset wipes and re-seeds.
- **FK:** `source_observation_id` has FK; deleting an observation without nulling first would fail (demo reset handles this at `/api/demo/reset:39`).

### KNOWN ISSUES
1. **No POST route for creating experiments from the UI.** The `PlaybookClient` might expose a "Propose" flow (2,429 LOC, not fully audited) but the 03 route census has no POST endpoint. Either the proposal UI is broken or uses the auto-create-from-observation path only.
2. **Attribution accuracy** relies entirely on prompt #23. The prompt runs on truncated transcript text (12,000 chars) and uses the loose "tacticUsed | evidenceFound" yes/no. Hard to evaluate quality without ground truth.
3. **Graduation threshold check is manual** — nothing automatically transitions testing → graduated when `currentMetrics` crosses `successThresholds`. A manager must click Graduate.
4. **Legacy `promoted`/`retired` states** in seeded data conflict with the `proposed/testing/graduated/rejected/archived` state machine. The transition map leaves both terminal with empty valid transitions — this works but is confusing.
5. **`testGroupDeals[]` vs `testGroup[]`**: two different columns track experiment scope. `testGroup[]` is AE IDs; `testGroupDeals[]` is deal IDs. Schema supports both but the consistent flow uses AE IDs (see pipeline's `assignedAeId IN testGroup`).

---

## Flow 6: Intelligence coordinator pattern detection

Cross-deal pattern detector. The "Act 2" demo narrative for cross-deal intelligence. **BROKEN end-to-end as of this commit** — see below.

### CREATE
- **Origin:** Every transcript pipeline run sends each detected signal to the coordinator actor.
- **Sender:** `transcriptPipeline` step 10 (`send-signals-to-coordinator`, 180s timeout).
- **Receiver:** `intelligenceCoordinator.getOrCreate(["default"]).receiveSignal({...})` (05 §2.3).
- **No UI directly creates coordinator patterns** — they're all derived.

### STORE
- **Actor state (in-memory):** `signals[]` (last 200), `patterns[]` (no limit), plus 3 counters. In-memory — lost on actor destruction or Rivet Cloud restart.
- **Parallel Supabase write:** `coordinator_patterns` table (migration 0011) — via `POST /api/intelligence/persist-pattern` from the coordinator itself. Keyed by `patternId` (unique). Columns: `signalType`, `vertical`, `competitor`, `dealIds[]`, `dealNames[]`, `synthesis`, `recommendations`, `arrImpact`, `dealCount`, `status`, `detectedAt`, `synthesizedAt`.

### PROCESS
1. **`receiveSignal` handler:** validates signal via `validateSignal`. Normalizes competitor name for `competitive_intel`. Appends to `signals[]`. Checks for 2+ signals of same type + same vertical (for `competitive_intel`, same competitor) from different deals. If threshold hit:
2. **Pattern creation/update:** create a new `patterns[]` entry OR update an existing one. Sets `pushStatus: "pending"`.
3. **Broadcast `patternDetected`:** `c.broadcast("patternDetected", { patternId, signalType, vertical, dealCount })`. **Nothing in the codebase subscribes to this event** (see 05 §4.9).
4. **Schedule synthesis:** `c.schedule.after(3000, "synthesizePattern", patternId)` — wait 3 seconds, then run `synthesizePattern`.
5. **`synthesizePattern` handler:** calls prompt **#25** (empty system prompt, 1024 max_tokens). Parses JSON via `text.match(/\{[\s\S]*\}/)`. Sets `pattern.synthesis`, `pattern.recommendations[]`, `pattern.arrImpact`, `pattern.synthesizedAt`.
6. **Push to affected deals:** for each `pattern.dealIds[]`, call `dealAgent.getOrCreate([dealId]).addCoordinatedIntel({...})`. **This is a no-op** — the `dealAgent` actor's `addCoordinatedIntel` action logs and returns (05 §2.1).
7. **Persist to Supabase:** `POST /api/intelligence/persist-pattern` writes the full pattern to `coordinator_patterns`.
8. **Broadcast `patternSynthesized`:** also has no subscribers.

### RETRIEVE
- **Intelligence dashboard (`/intelligence`):** `GET /api/intelligence/agent-patterns` — tries the actor first, falls back to `coordinator_patterns` DB table when actor is unavailable (03 §intelligence/agent-patterns).
- **MCP tool:** indirectly via `get_deal_details` / `get_deal_fitness` (no direct tool for patterns).

### RENDER
- **Intelligence — Patterns tab:** "Agent-Detected Patterns" section shows each pattern card (synthesis text, affected deal names, recommendations array).
- **Deal detail call prep:** expected to surface coordinated intel per CLAUDE.md's Act 2 narrative. **Does not.**

**Framework 4 — missing data:**
- No signals received → empty patterns array; dashboard shows "No cross-deal patterns detected yet".
- Claude parse failure → `pattern.pushStatus = "failed"`. Pattern persists in memory and DB but without synthesis text.

### UPDATE/DELETE
- **Update:** only through continued signal reception updating `signals[]` and `signalCount`.
- **Delete:** demo reset's `nukeAllActors()` destroys the coordinator. `coordinator_patterns` DB rows are **not cleared by demo reset** — they persist. Demo clears everything else via pattern matching on activity/observation subjects, but patterns are left.
- **No manual delete UI.**

### KNOWN ISSUES — BROKEN end-to-end

**Documented in 05 §4.5:**
- Coordinator pushes synthesized intel via `dealAgent.addCoordinatedIntel(...)` — **no-op**.
- Coordinator ALSO writes to `coordinator_patterns` table — this works.
- `/api/agent/call-prep` (Flow 2) fetches agent memory from `/api/deal-agent-state` → reads `dealAgentStates.coordinatedIntel`.
- **But `dealAgentStates.coordinatedIntel` is never written by the coordinator.** The only code that writes to it is `/api/deal-agent-state` POST — and no caller sends `coordinatedIntel` in the updates payload.
- **Net effect:** coordinator patterns appear on the Intelligence dashboard (because that page reads `coordinator_patterns` via `/api/intelligence/agent-patterns`), but they never reach the next deal's call prep.

### SHOULD BE
- Coordinator's `synthesizePattern` handler (or its `/api/intelligence/persist-pattern` write) should ALSO call `POST /api/deal-agent-state` for each affected `dealId` with `{ coordinatedIntel: [{ patternId, signalType, vertical, competitor, synthesis, recommendations, affectedDeals, detectedAt }] }`.
- That would cause the existing call prep code path (which reads `dealAgentStates.coordinatedIntel` via `formatMemoryForPrompt`) to surface the intel in the next brief for those deals.
- Alternatively: `/api/agent/call-prep` should query `coordinator_patterns` directly for any pattern whose `dealIds[]` includes the current deal.

Fix cost is low. Either change is ~10 lines. But neither is in place today, and the Act 2 demo story **appears to work** because the dashboard renders patterns — while the call prep actually ignores them.

---

## Flow 7: Agent intervention (health check → intervention card)

Documented in CLAUDE.md S13 as a major feature. **Largely a demo facade** in this commit — the stated pipeline doesn't exist in code. See 05 §4.10.

### CREATE (STATED)
**Per CLAUDE.md:**
> "Health checks auto-schedule: 30s after initialize, 10s after recordInteraction (if not recently run)"
> "runHealthCheck — evaluates compound risk (customer silence, risk signals, MEDDPICC gaps, competitive pressure, stage age), creates interventions when score < 60"
> "Intervention timing: fires AFTER pipeline Finalize + call prep generation"

### CREATE (ACTUAL)
- No `c.schedule.after(30000, ...)` call exists in `deal-agent.ts` (05 §4.10).
- `runHealthCheck` action exists but the body is `// No-op`.
- The `AgentIntervention` component (06 §3B) renders based on **direct hardcoded logic in the component itself**, not on an actor-created intervention:
  1. Renders only if `deal.name` contains "nordicmed" (case-insensitive) — line 22-25.
  2. Polls `GET /api/deal-agent-state?dealId=...`.
  3. If `state.interactionCount > 0` (i.e. pipeline has run) AND close date is 0-90 days away AND deal not closed, shows the card.
  4. Suggests extending close date by 14 days.

There is **no actor-driven health score computation**. `dealAgentStates.healthScore` doesn't even exist as a column (not in 02-SCHEMA §2 `dealAgentStates`).

### STORE
- `dealAgentStates.interventionDismissed` — boolean. Set true when user dismisses.
- `dealAgentStates.interventionDismissedAt` — timestamp.
- That's it. No `activeIntervention` jsonb column despite the actor's type interface suggesting one (05 §2.1 `ActiveIntervention` type "kept for backward compatibility").

### PROCESS (ACTUAL)
1. Component mounts on deal detail page.
2. Deal name check: `!deal.name.includes("nordicmed")` → component returns `null`.
3. Fetches `/api/deal-agent-state`.
4. Checks `state.interactionCount > 0`.
5. Checks `state.interventionDismissed` → if true, hide.
6. Extracts first `state.riskSignals[]` entry as the card title.
7. Computes days-remaining from `deal.closeDate`.
8. Conditionally renders.
9. On "Adjust close date" click: `PATCH /api/deals/[id]/update` with new `close_date`. On "Dismiss": `POST /api/deal-agent-state` with `{ interventionDismissed: true }`.

### RETRIEVE
- **Deal detail:** loads `AgentIntervention` component (06 §3B) which self-polls.

### RENDER
- **Deal detail workspace** only — floating card near the top.
- **NordicMed only.** All other deals show nothing even if they'd qualify.

**Framework 4 — missing data:**
- `closeDate` null → card doesn't render.
- `riskSignals[]` empty → card title falls back to a default.

### UPDATE/DELETE
- **Update:** user accepts the suggestion → `PATCH /api/deals/[id]/update` writes new `close_date`. Also updates `dealAgentStates` (via state.closeDate sync).
- **Dismiss:** `POST /api/deal-agent-state` with `{ interventionDismissed: true, interventionDismissedAt: now }`.
- **Demo reset:** clears `deal_agent_states` entirely (dropped + re-created fresh on next pipeline run).

### KNOWN ISSUES
1. **Hardcoded to NordicMed.** Any deal name change breaks the demo. Any other deal cannot benefit.
2. **No health score exists.** `healthScore` is in the actor's TypeScript interface (05 §2.1) but has no Supabase column, no compute logic, no trigger.
3. **Not actor-driven.** The "scheduled health check" in CLAUDE.md is fiction. The rendering is entirely client-side based on a static deal-name check + close date math.
4. **Presentation matches CLAUDE.md's narrative** (proactive risk flag, one-click close-date adjustment) but the machinery behind it is a demo-only stub.

### SHOULD BE
To match the stated design:
- Add `health_score`, `health_check_at`, `active_intervention` jsonb columns to `dealAgentStates`.
- Build a real health check function (API route or background job): evaluates risk signals + MEDDPICC gaps + stage age + activity recency + competitive pressure.
- Trigger the check after pipeline completion (or on a schedule).
- `AgentIntervention` component reads `active_intervention` from `dealAgentStates` instead of computing inline.
- Remove the NordicMed constraint.

---

## Flow 8: Close capture (win/loss)

### CREATE
- **Origin:** Rep opens the stage modal on the deal detail page and selects Close Won or Close Lost.
- **UI component:** `StageChangeModal` (06 §3B, 739 LOC). Renders stage chips; when user picks `closed_won` or `closed_lost`, the modal expands into a close-capture form with AI suggestions.
- **API route (pre-close AI):** `POST /api/deals/close-analysis` (prompt **#14**) — called automatically when the user picks the close stage.
- **API route (commit):** `POST /api/deals/stage` — called when the user clicks Save.

### STORE
The commit endpoint writes in this order:
1. **`deals` update:** sets `stage`, `stageEnteredAt=now`, `closedAt=now`, `winProbability=100`|`0`, `forecastCategory='closed'`, and whichever of these close-fields the user filled: `lossReason`, `closeCompetitor`, `closeNotes`, `closeImprovement`, `winTurningPoint`, `winReplicable`, `closeAiAnalysis`, `closeFactors`, `winFactors`, `closeAiRanAtTimestamp`.
2. **`dealStageHistory` insert:** `{ dealId, fromStage, toStage, changedBy: "human", reason }`.
3. **`activities` insert:** `type='stage_changed'`, subject describes the outcome + turning point / loss reason, metadata includes outcome, factors, AI summary.
4. **Per confirmed AI factor:** `observations` insert with `observerId=deal.assignedAeId`, rawInput prefixed `[Close won/lost — dealName]`, `aiClassification` signal type mapped from factor.category (competitor → competitive_intel, process → process_friction, product → product_gap, etc.), sourceContext.trigger=`loss_debrief` or `win_debrief`, status=`processed`.

### PROCESS
1. **Rep picks stage:** `StageChangeModal` fires `POST /api/deals/close-analysis` with `{ dealId, outcome: "won"|"lost" }`.
2. **Close analysis endpoint:** gathers deal + company + contacts + MEDDPICC + 20 activities + 10 observations + 5 transcripts + stage history + 5 system intelligence in parallel. Computes contact engagement counts. Sends everything to Claude via prompt **#14** (`max_tokens: 2000`). Parses JSON.
3. **Returns:** `{ summary, factors[], questions[], meddpicc_gaps[], stakeholder_flags[] }`. Factors = AI-suggested chips. Questions = 0-2 AI-generated questions with chip options.
4. **User reacts:** `StageChangeModal` renders the summary + suggested factor chips. User confirms/dismisses each factor, optionally answers the questions, fills free-text notes.
5. **Submit:** `POST /api/deals/stage` with all user-confirmed factors + AI analysis + free-text fields.
6. **Commit endpoint:** does the 4-step store above. Fires no further Claude calls.

### RETRIEVE
- **Intelligence dashboard (Close Intelligence tab):** `GET /api/intelligence` aggregates `deals.closeFactors` and `deals.winFactors` by category across all closed deals.
- **Call prep for similar deals:** `/api/agent/call-prep` fetches up to 10 closed deals in the same vertical with factors + reasons. Prompt #11 renders these as "Win/Loss Intelligence for <vertical>".
- **Deal detail view:** shows close outcome fields inline.
- **Analytics page:** aggregates stage history.
- **`/api/deals/close-analysis`:** regenerable any time (no caching). A second POST runs the full prompt again.

### RENDER
- **Stage modal close-capture form:** AI summary card + confirmed factor chips + dismissed chips + dynamic questions with chip answers + free-text fields.
- **Deal detail header:** "Closed Won" / "Closed Lost" badge with turning point / loss reason.
- **Activity timeline:** `stage_changed` row with summary.
- **Intelligence — Close Intelligence tab:** factor aggregation cards (loss factors by category with ARR, win factors with ARR).
- **Call prep brief** for future similar-vertical deals: `risks_and_landmines[]` with `source: "win_loss"`.
- **Field feed:** confirmed close factors appear as observations.

**Framework 4 — missing data:**
- Claude fails → `/api/deals/close-analysis` returns empty analysis at 200 status; modal falls back to fixed chips (03 §deals/close-analysis).
- No MEDDPICC → prompt shows "No MEDDPICC data available".
- No transcripts → `TRANSCRIPT ANALYSES:` section reads "No transcript analyses".

### UPDATE/DELETE
- **Update after close:** no direct route to re-edit close outcome fields. The only path is another `POST /api/deals/stage` with the same or different stage (which would re-write).
- **Stage reversal:** possible via the same endpoint (e.g. `closed_lost → negotiation`). Fromstage history preserved.
- **Delete:** `POST /api/demo/reset` nulls all close fields on MedVista and wipes all `dealStageHistory`. Other deals keep their close outcomes unless explicitly reset.

### KNOWN ISSUES
1. **The close-lost analysis is single-pass** (03 §deals/close-analysis). DECISIONS.md 1.1 LOCKED specifies a much richer "continuous deal theory" pattern — continuous pre-analysis on every transcript/email + a final deep pass on close. Current implementation doesn't match this bar.
2. **Factor confirmations don't update MEDDPICC.** `meddpicc_gaps[]` are displayed and nothing else. If a post-mortem reveals Economic Buyer was weak, the MEDDPICC row still shows whatever the transcripts inferred.
3. **Category string parsing is brittle.** Prompt #14 interpolates `competitor|stakeholder|...` literal enum string directly into the spec; Claude occasionally returns the literal pipe-separated string.
4. **Taxonomy is hardcoded UI-side.** `StageChangeModal:21-47` has three hardcoded arrays (`LOSS_REASONS`, `IMPROVEMENTS`, `WIN_TURNING_POINTS`). DECISIONS.md 1.1 LOCKED says taxonomy is seeded-at-launch with ability to promote new categories when 3+ deals accumulate similar ones — that promotion logic does not exist in this code.
5. **Observations from close factors** are written with `status='processed'` (not a valid observation status from the classifier — the valid value is `classified | routed | submitted | resolved`). Downstream code that filters observations by status may silently miss these.
6. **Reverse stage changes through `/api/deals/[id]/update`** bypass the audit trail entirely (03 §deals/[id]/update — "A stage change via /update silently bypasses the audit"). Close capture works only if the user goes through `/api/deals/stage`.

---

## Cross-flow debt

Writing this doc surfaced a few patterns that cross flow boundaries:

### 1. The activity-type fallback
Flows 1, 2, 3, 5, 8 all write to `activities`. Flows 1, 2 use `type='note_added'` with `metadata.source` (perpetuating 02-SCHEMA §4.1 debt). Flow 3 uses the real enum value. Flow 8 uses `type='stage_changed'` (real). Inconsistent and forces `getEffectiveType()` to stay in the code (see `activity-feed.tsx:45`).

### 2. Fuzzy deal resolution is duplicated in 4 places
- `/api/deals/resolve` (94 LOC, loads ALL deals then JS fuzzy match).
- `/api/agent/call-prep` (inline, same pattern).
- `/api/agent/draft-email` (inline).
- `/api/mcp` (SQL ILIKE, cleanest implementation).
- `/api/observations` (inline entity extraction via Claude).

### 3. Configuration auto-mutation is a stealth surface
Flow 3 step 12 (agent config change suggestion) silently appends text to `agentConfigs.instructions`. The only notification is an `agent_recommendation` notification. No approval step. DECISIONS.md Guardrail #7 says experiments are soft-mode — this violates that spirit.

### 4. The coordinator's cross-deal value is blocked by one missing DB write
Flow 6 BROKEN. Coordinator patterns are stored in `coordinator_patterns` but never flow into `dealAgentStates.coordinatedIntel` or directly into call prep. The Act 2 demo story renders on the Intelligence dashboard but misses the next brief.

### 5. No creation UX for deals
Flow 4 notes no `POST /api/deals` route. Every deal in the system today comes from a seed script. For the rebuild, deal creation is the first missing core feature — the current UI cannot create a deal at all.

### 6. Close lost debrief doesn't meet DECISIONS.md 1.1
Single-pass analysis, no continuous theory buildup, no taxonomy-promotion logic for new loss reasons. The research-interview pattern (DECISIONS.md 1.2) is partially applied (dynamic chips + dynamic questions) but falls short of "AI reads full context → generates an argument → asks user to react to it".

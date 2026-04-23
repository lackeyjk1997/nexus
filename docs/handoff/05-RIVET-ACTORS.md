# 05 — Rivet Actors

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Historical diagnosis — Rivet is REMOVED in v2.** Per §2.6 LOCKED, Rivet is not installed; `rivetkit`, `@rivetkit/next-js`, `@rivetkit/react` are not dependencies. Long-running work runs as `jobs` rows + `pg_cron` + Supabase Realtime (shipped Phase 1 Day 3).
>
> **This doc's purpose today:** explain *why* Rivet was removed. The "gutted stub" + "dismantled in place" findings in §1 + §4 are the concrete evidence that drove §2.6. Future readers who wonder "could we have kept Rivet?" should read this to see the honest answer (no — it was already half-migrated away by v1's team).
>
> **v2 replacements for each Rivet responsibility** (from Section 5 of 10-REBUILD-PLAN.md):
> - Per-deal state accumulation → `deal_events` append-only + `DealIntelligence.getDealState()` (§2.16; skeleton shipped Session 0-B).
> - Durable transcript workflow → Postgres `jobs` row per transcript; worker executes sequential steps per §2.24 (Phase 3 Day 2 wiring).
> - Scheduled health checks → pg_cron.
> - Cross-deal coordinator → `coordinator_patterns` table + pg_cron + direct reads from call prep (§2.17; Phase 4 Day 2).
> - WebSocket broadcasts → Supabase Realtime on `jobs` status (shipped Phase 1 Day 3).
>
> Current v2 authoritative sources: `~/nexus-v2/docs/DECISIONS.md` §2.6; `~/nexus-v2/packages/db/src/schema.ts` jobs + job_results; `~/nexus-v2/apps/web/src/app/api/jobs/worker/route.ts`. Handoff-edit policy per §2.13.1.

---

This document is deliberately blunt. Jeff's framing was: "we don't actually have a true understanding of what some of these things do, and they're not really working as well as they could be in production." After reading every line of actor code, the situation is worse than that framing suggests — Rivet has been **progressively dismantled in place** to work around production failures, while the package remains a dependency and the CLAUDE.md narrative still talks about Rivet as if it's the architecture.

---

## Section 1: Architecture Overview

### What Rivet is (advertised)
Rivet (`rivetkit@2.2.0`) is an actor runtime for durable, stateful agents with built-in persistence, WebSocket pub/sub, scheduling, and durable workflow primitives. Actors are keyed (e.g. `dealAgent[dealId]`), lazily spawned, and outlive HTTP requests. Workflows get replay-safe step execution.

### Why it was chosen (inferred from CLAUDE.md S10/S11)
- **Stateful per-deal AI agents** — one `dealAgent` per deal, keyed by `dealId`, accumulating memory/learnings/risk signals across sessions.
- **Durable transcript pipeline** — 9+ Claude calls across a long-running job that must survive cold starts and restarts.
- **Real-time progress updates** — browser subscribes to `workflowProgress` events via WebSocket.
- **Scheduled work** — `c.schedule.after()` for health checks and synthesis delays.
- **Cross-deal coordinator** — org-wide actor that receives signals from all deals, detects patterns, pushes synthesized intel back to affected deal agents.

### What Rivet actually does today (this codebase)
1. **`dealAgent`** — **gutted stub.** Empty state (`state: {}`), every action is a no-op that logs and returns. The comment above the state says "EMPTY STATE — nothing to persist, nothing to deserialize, nothing to crash." All per-deal state lives in Supabase (`deal_agent_states` table, migration 0010). The actor is retained solely to broadcast `workflowProgress` events over WebSocket.
2. **`transcriptPipeline`** — real durable workflow (875 LOC, 8+ steps). This is the one actor that still earns its place; several steps have been trimmed to prevent Vercel/Rivet-Cloud timeouts.
3. **`intelligenceCoordinator`** — in-memory state, but every synthesis also writes to Supabase (`coordinator_patterns`) so it survives reset. The API route that reads patterns explicitly falls back to the database when the actor is unavailable.

The net effect: Rivet is **one workflow + one event relay + one soft-state actor with a DB mirror**. The "stateful agent" use case that motivated adopting Rivet has been migrated away.

### Request flow (actual, as of this commit)
```
Browser (deal detail page)
  └── POST /api/transcript-pipeline  ───────────┐
         (gathers deal context + enqueues)      │
                                                ▼
                                ┌───────────────────────────┐
                                │  transcriptPipeline actor │
                                │  (workflow, keyed=dealId) │
                                └───┬─────────────────┬─────┘
                                    │                 │
                         ┌──────────┘                 └──────────┐
                         ▼                                       ▼
                 callClaude() helper              dealAgent.workflowProgress
                 (raw fetch → api.anthropic.com)  (broadcasts over WS)
                         │                                       │
                         ▼                                       ▼
                 Claude JSON parsed                  Browser receives progress
                         │                                       │
                         ▼                                       ▼
     fetch(appUrl/api/deals/[id]/meddpicc-update)      <workflow-tracker.tsx>
     fetch(appUrl/api/observations) × N                <deal-detail-client.tsx>
     fetch(appUrl/api/deal-agent-state)                     polls Supabase
     fetch(appUrl/api/playbook/ideas/[id])
     fetch(appUrl/api/intelligence/persist-pattern)
                         │
                         ▼
                     Supabase
```

Every arrow from the pipeline to the rest of the system goes through `fetch(appUrl + "/api/…")` — the pipeline actor does **not** talk to Supabase via the shared `db` client. Every downstream write is a full Next.js API roundtrip.

### Next.js + Vercel integration
- Mount: `apps/web/src/app/api/rivet/[...all]/route.ts` — 6 lines, exports all HTTP verbs via `toNextHandler(registry)` from `@rivetkit/next-js`.
- `next.config.mjs` has `serverExternalPackages: ["rivetkit", "@rivetkit/next-js"]` to prevent webpack bundling (per CLAUDE.md).
- **Dev mode:** `@rivetkit/next-js` auto-spawns a local Rivet engine in-process on port 6420. Actor state lives in local memory for the dev session.
- **Production (Vercel):** Actor state is hosted on **Rivet Cloud**. Env vars `RIVET_ENDPOINT` / `RIVET_PUBLIC_ENDPOINT` point to the cloud namespace. The Next.js function proxies to the cloud engine.
- **Implication:** In production, every `pipeline.send("process", …)` call is a network hop to Rivet Cloud, which then runs the workflow on their runners, which then call back into your Vercel functions via `fetch(appUrl + /api/…)`. Multi-hop latency on every step.

### Dependencies (from `apps/web/package.json`)
- `rivetkit ^2.2.0`
- `@rivetkit/next-js ^2.2.0`
- `@rivetkit/react ^2.2.0`

---

## Section 2: Per-Actor Documentation

### 2.1 `dealAgent` — GUTTED STUB

- **File:** `apps/web/src/actors/deal-agent.ts` (195 LOC)
- **Type:** Simple actor (NOT a workflow actor).
- **Purpose:** **Today**, purely an event relay that broadcasts `workflowProgress` to any browser subscribed via WebSocket. It carries no state and does no work. Historically (pre-migration 0010), it held rich per-deal state: interaction memory, learnings, competitive context, risk signals, health score, interventions, coordinated intel.
- **State shape:**

~~~typescript
// Literal state declaration at line 101
state: {}

// TypeScript interface exported for "backward compatibility with imports" (line 3)
// NOT USED BY THE ACTOR — present to satisfy legacy import paths.
export interface DealAgentState {
  dealId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  initialized: boolean;
  interactionMemory: InteractionMemory[];
  learnings: string[];
  riskSignals: string[];
  competitiveContext: {
    competitors: string[];
    ourDifferentiators: string[];
    recentMentions: Array<{ date: string; competitor: string; context: string }>;
  };
  coordinatedIntel: CoordinatedIntel[];
  createdAt: string | null;
  totalInteractions: number;
  lastInteractionDate: string | null;
  lastCallPrepFeedback: { date: string; rating: number; comment: string } | null;
  currentStage: string;
  stageEnteredAt: string | null;
  closeDate: string | null;
  briefReady: BriefReady | null;
  briefPending: boolean;
  activeIntervention: ActiveIntervention | null;
  lastHealthCheck: string | null;
  healthScore: number;
}
~~~

The interface is what the state *was*. The actor no longer uses it. All of these fields now live in Supabase `deal_agent_states` (see 02-SCHEMA.md).

- **Events:**
  - `workflowProgress` — payload `{ step: string, status: "running" | "complete" | "error", details?: string }`. Broadcast via `c.broadcast("workflowProgress", data)`.

- **Actions** (every action at a glance):

| Action | Behavior |
|---|---|
| `workflowProgress(data)` | Broadcasts `data` on the `workflowProgress` event. Wrapped in try/catch — broadcast failures are swallowed and logged. |
| `destroyActor()` | Calls `c.destroy()`. Used by demo reset fallback. |
| `recordInteraction(_)` | **No-op.** Logs `"state now in Supabase, ignoring"`. |
| `updateLearnings(_)` | **No-op.** Same logging. |
| `addCompetitiveIntel(_)` | **No-op.** |
| `addRiskSignal(_)` | **No-op.** |
| `removeRiskSignal(_)` | **No-op.** |
| `setBriefPending(_)` | **No-op.** |
| `setBriefReady(_)` | **No-op.** |
| `dismissBrief()` | **No-op.** |
| `getBriefReady()` | Returns literal `null`. |
| `getBriefPending()` | Returns literal `false`. |
| `getState()` | Returns literal `{}`. |
| `getMemoryForPrompt()` | Returns literal `""`. |
| `initialize(_)` | **No-op.** |
| `recordFeedback(_)` | **No-op.** |
| `updateStage(_)` | **No-op.** |
| `setIntervention(_)` | **No-op.** |
| `dismissIntervention()` | **No-op.** |
| `addCoordinatedIntel(_)` | **No-op.** Despite the name, it does not store anything. |
| `runHealthCheck()` | **No-op.** CLAUDE.md describes scheduled health checks; there is no scheduling code in this file. |

- **Scheduled jobs:** **None.** CLAUDE.md describes `c.schedule.after(30000, "runHealthCheck")` (initialize) and `c.schedule.after(10000, ...)` (after recordInteraction). None of that code exists in this file.
- **WebSocket broadcasts:** `c.broadcast("workflowProgress", data)` only. One event, one broadcast site.
- **Dependencies:** None. The actor doesn't call Claude, Supabase, or other actors.
- **Awake triggers:** Any RPC call to a `dealAgent.getOrCreate([dealId])` handle. In practice:
  - `transcriptPipeline` workflow calls `.workflowProgress(...)` dozens of times per run.
  - `intelligenceCoordinator` calls `.addCoordinatedIntel(...)` when a pattern is synthesized (no-op now).
  - Browser `useActor({ name: "dealAgent", key: [dealId] })` attempts a connection for WebSocket subscription.
- **Persistence:** **None** — state is `{}`. The real persistence is in Supabase `deal_agent_states`, managed by the `/api/deal-agent-state` route.

### 2.2 `transcriptPipeline` — WORKFLOW ACTOR (real work)

- **File:** `apps/web/src/actors/transcript-pipeline.ts` (875 LOC)
- **Type:** Workflow actor. Uses `workflow(async (ctx) => { ctx.loop(..., loopCtx => { loopCtx.step(...) }) })`.
- **Purpose:** Durable, queue-driven transcript processing. When `/api/transcript-pipeline` enqueues a `process` message, this workflow analyzes the transcript (action items, MEDDPICC deltas, 7 signal types, stakeholder sentiment), persists results to Supabase via API fetches, updates experiment evidence, drafts a follow-up email, flags the deal for client-side brief generation, and pushes signals to the intelligence coordinator.
- **State shape:**

~~~typescript
export interface TranscriptPipelineState {
  dealId: string;
  status: "idle" | "running" | "complete" | "error";
  currentStep: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  actionItems: ActionItem[];
  meddpiccUpdates: Record<string, MeddpiccUpdate>;
  detectedSignals: DetectedSignal[];
  stakeholderInsights: StakeholderInsight[];
  newLearnings: string[];
  followUpEmail: { subject: string; body: string } | null;
  experimentAttributions: ExperimentAttribution[];
}
~~~

Supporting interfaces (same file):

~~~typescript
interface PipelineInput {
  dealId: string;
  transcriptText: string;
  transcriptId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  currentMeddpicc: Record<string, unknown> | null;
  existingContacts: Array<{ name: string; title: string; role: string }>;
  agentConfigInstructions: string;
  assignedAeId: string;
  assignedAeName: string;
  appUrl: string;
  activeExperiments?: ActiveExperiment[];
}
interface ActionItem { item: string; owner: string; deadline?: string; }
interface MeddpiccUpdate { score: number; evidence: string; delta: number; }
interface DetectedSignal {
  type: string;
  content: string;
  context: string;
  urgency: string;
  source_speaker: string;
  quote: string;
}
interface StakeholderInsight {
  name: string;
  title?: string;
  sentiment: string;
  engagement: string;
  keyPriorities: string[];
  concerns: string[];
  notableQuotes: string[];
}
interface ExperimentAttribution {
  experimentId: string;
  evidenceFound: boolean;
  tacticUsed: boolean;
  evidence: string;
  customerResponse: string;
  sentiment: string;
}
~~~

- **Queues:** `process: queue<PipelineInput>()` — single queue the workflow consumes in a loop.
- **Actions:**
  - `getState(c)` → returns `c.state`.
  - `destroyActor(c)` → `c.destroy()`.

- **Events:** **None.** Progress is reported by calling `dealAgent.workflowProgress(...)` — the pipeline relies on the deal agent's broadcast channel rather than exposing its own. This means every pipeline progress event is an actor-to-actor RPC.

- **Steps** (in order; timeout is 5 min default unless noted):

| # | Step name | Timeout | Behavior |
|---|-----------|---------|----------|
| 0 | `init-pipeline` | default | Reset loop state (actionItems/meddpicc/signals/etc.), set status=`running`, set startedAt. |
| 1 | `parallel-analysis` | **180s** | Kick off 3 Claude calls in parallel via `Promise.all`: extract actions (prompt #19), score MEDDPICC (prompt #20), detect signals (prompt #21). Parse all three with 4-strategy `parseJSON` helper. Validate signals via `validateSignal()`. Validate MEDDPICC via `validateMeddpiccScore()`. Report `parallel_analysis` complete. |
| 2 | `progress-update-scores-start` | default | Report `update_scores: running`. |
| 3 | `persist-meddpicc` (conditional) | default | PATCH `/api/deals/[id]/meddpicc-update` with the deltas. Logs but doesn't throw on error. |
| 4 | `create-signal-observations` (conditional) | **120s** | `Promise.all` fetch POST `/api/observations` per signal with `preClassified: true`. Catches and logs per-request. |
| 5 | `progress-update-scores-done` | default | Report `update_scores: complete`. |
| 6 | `synthesize-learnings` | default | Claude prompt #22. Validates learnings via `validateLearnings()`. Stores into `loopCtx.state.newLearnings`. |
| 7a | `progress-check-experiments-start` (conditional) | default | Report `check_experiments: running`. |
| 7b | `check-experiments` (conditional) | default | Claude prompt #23. For each attribution, PATCH `/api/playbook/ideas/[id]` with appended evidence. |
| 7c | `progress-check-experiments-done` OR `progress-check-experiments-skip` | default | Report `check_experiments: complete`. |
| 8 | `progress-finalize-start` | default | Report `finalize: running`. |
| 9 | `draft-email` | default | Claude prompt #24. Inside a try/catch — **graceful degradation**: pipeline proceeds with `followUpEmail = null` on any error (comment at line 633). |
| 10 | `save-state-to-supabase` | default | POST `/api/deal-agent-state` with interactionCount increment, learnings, riskSignals, competitiveContext, pipelineStatus=`running`, pipelineStep=`update_deal_agent`. Fire-and-forget. |
| 11 | `update-deal-agent` | default | Many no-op RPC calls to the deal agent: `recordInteraction`, `updateLearnings`, `addCompetitiveIntel(...)`, `addRiskSignal(...)`, `recordInteraction(...)` per stakeholder. All are no-ops (see §2.1). Kept "for safety" per comment at line 697. |
| 12 | `send-signals-to-coordinator` | **180s** | For each detected signal, `coordinator.receiveSignal({...})` RPC to `intelligenceCoordinator.getOrCreate(["default"])`. Wrapped in try/catch. |
| 13 | `flag-brief-pending` | default | POST `/api/deal-agent-state` with `{ briefPending: true }`. Also calls `dealAgent.setBriefPending(true)` (no-op) "for backward compat" (comment at line 827). |
| 14 | `mark-complete` | default | Set `status=complete`, `completedAt=now`. POST `/api/deal-agent-state` with `{ pipelineStatus: "complete" }`. Report `finalize: complete`. |
| 15 | `handle-error` (catch block) | default | Runs only if the outer try/catch fires. Sets `status=error`, reports error event. |

- **Scheduled jobs:** **None.** All work is triggered by the `process` queue.
- **WebSocket broadcasts:** None directly — all progress events are delegated to the deal agent's `workflowProgress` broadcast.
- **Dependencies:**
  - Claude API via `callClaude()` helper (6 invocations per run: actions, MEDDPICC, signals, learnings, experiments, email).
  - Next.js API routes via `fetch(input.appUrl + "/api/…")`: `/api/deals/[id]/meddpicc-update`, `/api/observations`, `/api/deal-agent-state` (×3 times), `/api/playbook/ideas/[id]`.
  - Actor-to-actor RPC: `dealAgent.getOrCreate([dealId]).workflowProgress(...)` and many no-op RPCs; `intelligenceCoordinator.getOrCreate(["default"]).receiveSignal(...)`.
- **Awake triggers:** The `process` queue receiving a message via `pipeline.send("process", { … })` from `/api/transcript-pipeline/route.ts`. Actor is keyed by `dealId` — one workflow actor per deal.
- **Persistence:** Rivet's built-in workflow persistence. Loop state is durable, step results are replayed on restart (workflow replay semantics).
- **Inputs:** `PipelineInput` (see shape above).
- **Outputs:** Mutations to Supabase (MEDDPICC, observations, deal agent state, playbook evidence, coordinator patterns). Broadcast events to browser.
- **Failure modes per step:**
  - `parallel-analysis`: fails if any of the 3 Claude calls errors (180s timeout). `callClaude()` retries 429/5xx 3× with exponential backoff; non-retryable errors throw. If this fails, the whole workflow aborts into `handle-error`.
  - `persist-meddpicc` / `create-signal-observations`: errors logged, not thrown. Pipeline continues.
  - `draft-email`: explicit try/catch — sets `followUpEmail = null` and continues.
  - `send-signals-to-coordinator`: try/catch around the entire inner block. Signals lost on failure; pipeline continues.
  - `update-deal-agent`: RPCs are no-ops; can't fail meaningfully.
  - Outer try/catch: sets `status=error`, reports error, does not re-throw.
  - Outermost try/catch: catches anything missed, logs `[pipeline] FATAL:` (per CLAUDE.md S13 fix).

### 2.3 `intelligenceCoordinator` — SIMPLE ACTOR WITH SUPABASE MIRROR

- **File:** `apps/web/src/actors/intelligence-coordinator.ts` (368 LOC)
- **Type:** Simple actor. One per org, keyed as `["default"]`.
- **Purpose:** Aggregates signals from every deal's pipeline run. When 2+ deals in the same vertical emit the same signal type (with matching competitor for `competitive_intel`), creates a pattern, schedules a Claude synthesis call 3s later, then pushes the resulting intel to every affected deal agent via `addCoordinatedIntel()` — but since `addCoordinatedIntel` is a no-op on the gutted `dealAgent`, the intel only actually lands via the parallel Supabase write to `coordinator_patterns`.
- **State shape:**

~~~typescript
interface Signal {
  id: string;
  dealId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  signalType: string;
  content: string;
  competitor?: string;
  urgency: string;
  receivedAt: string;
  sourceAeId: string;
  sourceAeName: string;
}

interface Pattern {
  id: string;
  signalType: string;
  vertical: string;
  competitor?: string;
  dealIds: string[];
  dealNames: string[];
  signals: Signal[];
  signalCount: number;
  synthesis: string;
  recommendations: string[];
  arrImpact: number;
  detectedAt: string;
  synthesizedAt: string | null;
  pushStatus: "pending" | "pushed" | "failed";
}

interface CoordinatorState {
  signals: Signal[];
  patterns: Pattern[];
  lastSynthesisRun: string | null;
  totalSignalsReceived: number;
  totalPatternsDetected: number;
}
~~~

Initial state:
~~~typescript
state: {
  signals: [],
  patterns: [],
  lastSynthesisRun: null,
  totalSignalsReceived: 0,
  totalPatternsDetected: 0,
} as CoordinatorState
~~~

- **Actions:**

| Action | Input | Behavior |
|---|---|---|
| `receiveSignal(c, signal)` | `Signal` | Validates via `validateSignal()` (drops invalid). Normalizes competitor name. Appends to signals array (keeps last 200). Checks for 2+ signals of same type + same vertical (for `competitive_intel`, also matching competitor). If threshold met: updates existing matching pattern OR creates a new one. Broadcasts `patternDetected`. Schedules `synthesizePattern` 3s later via `c.schedule.after(3000, "synthesizePattern", patternId)`. |
| `synthesizePattern(c, patternId)` | `string` | Scheduled callback. Finds pattern in state. Calls Claude (prompt #25, empty system message). Parses JSON via `text.match(/\{[\s\S]*\}/)`. Updates pattern with synthesis + recommendations + arrImpact. For each affected deal, calls `dealAgent.addCoordinatedIntel(...)` — which is a no-op. Persists the pattern to Supabase via POST `/api/intelligence/persist-pattern`. Broadcasts `patternSynthesized`. |
| `getPatterns(c)` | — | Returns `c.state.patterns`. |
| `getPatternsForDeal(c, dealId)` | `string` | Returns filtered patterns. |
| `getStatus(c)` | — | Returns `{ totalSignalsReceived, totalPatternsDetected, activePatterns, lastSynthesisRun }`. |
| `destroyActor(c)` | — | `c.destroy()`. |

- **Events:**
  - `patternDetected` — `{ patternId, signalType, vertical, dealCount }`.
  - `patternSynthesized` — `{ patternId, synthesis }`.

- **Scheduled jobs:**
  - `c.schedule.after(3000, "synthesizePattern", patternId)` — called from `receiveSignal` when a new/updated pattern crosses threshold. Runs the synthesis action 3 seconds later.

- **WebSocket broadcasts:**
  - `c.broadcast("patternDetected", { patternId, signalType, vertical, dealCount })` inside `receiveSignal` on new pattern.
  - `c.broadcast("patternSynthesized", { patternId, synthesis })` inside `synthesizePattern` after Claude completes.

- **Dependencies:**
  - Claude API via `callClaude()` (prompt #25).
  - Actor-to-actor: `dealAgent.addCoordinatedIntel(...)` per affected deal (no-op today).
  - Supabase via `fetch(siteUrl + "/api/intelligence/persist-pattern", ...)`.
  - `lib/validation.ts` for signal normalization.

- **Awake triggers:** `receiveSignal` RPC from the transcript pipeline. `getPatterns` / `getStatus` RPC from `/api/intelligence/agent-patterns`. Keyed as `["default"]` — exactly one instance per Rivet namespace.

- **Persistence:** Rivet's built-in state persistence, plus a parallel write to Supabase `coordinator_patterns` on every synthesis. **The API route that reads patterns tries the actor first, then falls back to the database** (`/api/intelligence/agent-patterns/route.ts:27-29`). This pattern betrays the reality that nobody trusts the actor's in-memory state to be up to date.

---

## Section 3: Client Usage

### 3.1 React hook callers (browser WebSocket subscriptions)
Only **2 components** use `useActor` — both subscribe to the same event on the same actor type.

| File | Line | Actor | Key | Subscribed event | Actions invoked |
|------|------|-------|-----|------------------|-----------------|
| `apps/web/src/components/workflow-tracker.tsx` | 50 | `dealAgent` | `[dealId]` | `workflowProgress` | None. The component only reads events; it never calls actions. |
| `apps/web/src/app/(dashboard)/pipeline/[id]/deal-detail-client.tsx` | 325 | `dealAgent` | `[deal.id]` | `workflowProgress` | None. Also only reads events. On `update_scores: complete`, fetches `/api/deals/[id]/meddpicc`. On `finalize: complete`, POSTs `/api/deal-fitness/analyze` and bumps an agent-memory refetch key. |

**Nothing subscribes to `patternDetected` or `patternSynthesized`.** The coordinator's broadcast events are silently dropped. The dashboard instead polls `/api/intelligence/agent-patterns` periodically.

### 3.2 Server-side Rivet clients
| File | Line | Purpose |
|------|------|---------|
| `apps/web/src/app/api/transcript-pipeline/route.ts` | 17, 128-138 | `createClient<Registry>()` to `rivetClient.transcriptPipeline.getOrCreate([dealId]).send("process", {...})` — enqueues the pipeline. |
| `apps/web/src/app/api/intelligence/agent-patterns/route.ts` | 4, 17-21 | `createClient<Registry>()` to call `coordinator.getPatterns()` and `.getStatus()`. Has an explicit try/catch with DB fallback. |

### 3.3 Cleanup scripts
| File | Purpose |
|------|---------|
| `apps/web/scripts/nuke-rivet-actors.ts` | Calls `nukeAllActors()` in `lib/rivet-actor-cleanup.ts`. Used via `pnpm nuke-actors` and by `/api/demo/reset`. |
| `apps/web/scripts/destroy-zombie-dealagent.ts` | Ad-hoc destroyer for a specific stuck deal agent. |
| `apps/web/scripts/rotate-medvista-uuid.ts` | Rotates the MedVista deal UUID in Supabase **specifically because the pipeline replays the old workflow history when the same UUID is re-processed** (comment in file: "the UUID in Supabase makes the pipeline call dealAgent.getOrCreate(...)"). The existence of this script is itself evidence of a fundamental Rivet workflow issue — see Section 4. |

### 3.4 Actor-to-actor RPC (inside actors)
| From | To | Action | Frequency |
|------|-----|--------|-----------|
| `transcriptPipeline` | `dealAgent.getOrCreate([dealId])` | `.workflowProgress(...)` | ~12 times per pipeline run |
| `transcriptPipeline` | `dealAgent.getOrCreate([dealId])` | Misc no-op actions (`recordInteraction`, `addCompetitiveIntel`, `addRiskSignal`, `setBriefPending`) | ~N+5 per run, where N = stakeholder count |
| `transcriptPipeline` | `intelligenceCoordinator.getOrCreate(["default"])` | `.receiveSignal(...)` | Once per detected signal |
| `intelligenceCoordinator` | `dealAgent.getOrCreate([dealId])` | `.addCoordinatedIntel(...)` | Once per affected deal, per synthesis (no-op) |

---

## Section 4: What's Broken

### 4.1 `dealAgent` has been eviscerated without removing it
Every one of its 18 actions is either a no-op or returns a literal. State is `{}`. The file's own comment says "EMPTY STATE — nothing to persist, nothing to deserialize, nothing to crash." The actor exists for exactly one reason: `workflowProgress` broadcasts. Every other usage is either a dead RPC call from the pipeline or a dead import in call-prep assembly code.

Meanwhile, CLAUDE.md still documents the `dealAgent` as if it's the rich stateful agent from the original design — with scheduled health checks, coordinated intel accumulation, intervention management, and brief-ready flags. Anyone reading CLAUDE.md and then the code will conclude the file is wrong, not that the feature was silently removed.

**Evidence files:** `apps/web/src/actors/deal-agent.ts` lines 100-101 (state), 135-196 (all no-op actions). Migration 0010 created `deal_agent_states` — the table that now holds what this actor used to hold.

### 4.2 Brief generation was removed from the pipeline because of production timeouts
The pipeline's comment at line 806-808 is explicit:

> `// Previously this step called /api/agent/call-prep directly from the pipeline actor,`
> `// which created a Rivet Cloud → Vercel → Claude chain that timed out on production.`
> `// Now we just set a flag — the deal detail page generates the brief client-side.`

The "Brief Ready" auto-generation flow that CLAUDE.md describes as working is in fact **architectural dead weight** — the pipeline sets `briefPending: true` in Supabase, the browser polls the state, then fires `/api/agent/call-prep` from its own context to avoid the Rivet→Vercel→Claude chain.

This means: Rivet Cloud → Vercel Function → Claude API was the original flow, and it didn't work within the 300s Vercel cap. The mitigation is a polling architecture, not a fix.

### 4.3 Stale actors replay old workflow history
The `rotate-medvista-uuid.ts` script exists because when a deal is re-processed under the same ID, the pipeline actor (keyed by `dealId`) replays its prior workflow history. The script's docstring confirms this. The script rotates the UUID so `transcriptPipeline.getOrCreate([newUuid])` spawns a fresh workflow actor.

Demo reset's Phase 3 (nukeAllActors) is the brute-force mitigation — it lists every actor via the Rivet Engine REST API and DELETEs each. This uses the **engine-level REST API, not the in-actor `destroyActor` action**, because "crashed / orphaned actors can't wake successfully to receive the call" (comment at `lib/rivet-actor-cleanup.ts:1-10`).

Taken together: (a) Rivet's workflow replay semantics don't play nicely with re-running a pipeline against the same key; (b) the in-actor action for destruction can't reach crashed actors; (c) the product's first-line workaround is a REST-API mass-destroy on every demo reset. This is a lot of scaffolding to work around the primitive Rivet is supposed to provide.

### 4.4 Workflow timeouts and the ever-shrinking transcript windows
Three pipeline steps have explicit elevated timeouts:
- `parallel-analysis`: 180s
- `create-signal-observations`: 120s
- `send-signals-to-coordinator`: 180s

The transcript is truncated at 15,000 chars for the 3 parallel Claude calls (prompts #19/20/21), but narrowed further to 12,000 in `check-experiments` (prompt #23) and 8,000 in `synthesize-learnings` (prompt #22) — silently, without any evidence collection about what was dropped. This is engineering around model throughput, not model capability.

### 4.5 Coordinator's `addCoordinatedIntel` push is dead
The coordinator dutifully calls `dealAgent.getOrCreate([dealId]).addCoordinatedIntel(...)` for every affected deal when it synthesizes a pattern (`intelligence-coordinator.ts:278-288`). On the gutted `dealAgent`, this is a no-op.

The only thing that actually delivers synthesized intel to a deal's call prep is:
1. The coordinator's separate POST to `/api/intelligence/persist-pattern` which writes to `coordinator_patterns` table.
2. The call-prep route (prompt #11) reads… actually, call-prep does NOT read `coordinator_patterns`. It reads `dealAgentStates.coordinatedIntel` — which is a column in Supabase that's ONLY written by `/api/deal-agent-state` POST with `{ coordinatedIntel: [...] }` merged into the array.
3. **Nothing writes to `dealAgentStates.coordinatedIntel` in the current code path.** Grep `coordinatedIntel:` and you'll find the pipeline sets `learnings`, `riskSignals`, `competitiveContext` on Supabase state — but never `coordinatedIntel`.

**Cross-deal intel flowing into call prep is therefore functionally broken.** The coordinator's push is a no-op; the Supabase column is never updated from the coordinator's writes; and the pattern is stored in `coordinator_patterns` but call-prep doesn't query that table. Verify in `apps/web/src/app/api/agent/call-prep/route.ts` — there is no query against `coordinator_patterns`.

**Only surviving path:** `/api/intelligence/agent-patterns` route fetches patterns for the Intelligence dashboard view. That endpoint is read-only; it doesn't enrich call prep.

This is the Act 2 demo story from CLAUDE.md — the cross-deal coordinator insights that should flow into the next call prep for affected deals. **The observable demo shows the intel on the Intelligence dashboard (because that's what `/api/intelligence/agent-patterns` serves) but not in the brief that the AE reads before the next call** (because no code path wires coordinator patterns into `deal_agent_states.coordinatedIntel`).

### 4.6 Swallowed exceptions everywhere
Every non-critical path is wrapped in try/catch with `console.error(...)` and a "non-fatal, continuing" log message. Specifically:
- `draft-email` step — swallows all errors and sets `followUpEmail = null` (`transcript-pipeline.ts:632-635`).
- `save-state-to-supabase` step — swallows all errors with a "Non-blocking — actor calls below serve as backup" comment (line 693-694). Those backup actor calls are no-ops. There is no backup.
- `send-signals-to-coordinator` step — swallows all errors (line 797-802).
- Coordinator `persist-pattern` fetch — swallows all errors (line 328-332).
- `workflowProgress` broadcast in `dealAgent` — swallows all errors (line 123-127).
- Outer pipeline try/catch — reports error step but doesn't re-throw.
- Outermost pipeline try/catch — logs `[pipeline] FATAL:` but never rejects or notifies anyone.

Effect: a pipeline can complete with `status=complete` while half its writes silently failed. Nothing tells the operator, and nothing alerts the user.

### 4.7 Race condition on `deal_agent_states.briefPending`
The pipeline sets `briefPending: true` at step 13, then `pipelineStatus: "complete"` at step 14. Both are POSTs to the same `/api/deal-agent-state` route which upserts on `dealId`. If the two requests race (unlikely but not impossible), the second could clobber the first (the upsert merges arrays but replaces scalar fields — see `/api/deal-agent-state/route.ts:104-117`).

Low-probability, but a real ordering assumption not enforced.

### 4.8 Actor-to-actor no-op flood
Each pipeline run makes ~15-20 RPCs to `dealAgent` that are all no-ops (recordInteraction, addCompetitiveIntel, addRiskSignal per stakeholder, setBriefPending, etc.). On Vercel → Rivet Cloud, each of these is a full network roundtrip. They exist only because the pipeline code wasn't cleaned up after the state migration. "Kept for safety" (line 697) doesn't earn the latency.

### 4.9 `c.broadcast` with zero consumers
`intelligenceCoordinator` broadcasts `patternDetected` and `patternSynthesized`. No component subscribes to either event. They're emitted into the void. If the intent was real-time Intelligence dashboard updates, they were never wired up.

### 4.10 No health checks, no interventions, no scheduled work
CLAUDE.md S13 prominently describes: "Health checks auto-schedule: 30s after initialize, 10s after recordInteraction (if not recently run)" and "Intervention timing: fires AFTER pipeline Finalize + call prep generation." None of this code exists. `runHealthCheck` in `dealAgent` is a literal no-op. There are **zero** `c.schedule.after(...)` calls in the deal agent. The only scheduled job in the entire codebase is the 3s synthesis delay in the coordinator.

The `agent-intervention.tsx` component reads from `/api/deal-agent-state` and renders a card when `activeIntervention` is populated. Nothing in the current code populates it.

**Intervention cards as described in CLAUDE.md don't fire in this codebase.** They may have worked at some prior commit; they don't at `c71d2b6`.

### 4.11 Actor state interface exported for nobody
`deal-agent.ts` exports `DealAgentState`, `BriefReady`, `InterventionAction`, `ActiveIntervention`, `CoordinatedIntel`, `InteractionMemory` — six interfaces "kept for backward compatibility with imports." Nothing uses them. They're shaped against the old actor, now describing nothing real. Dead code masquerading as an API.

---

## Section 5: Rivet Value Assessment

### The question
Given we run on Vercel + Supabase + Claude API, does Rivet earn its place?

### What Rivet uniquely delivers today
Going through each claimed benefit:

1. **Durable workflow primitives** — yes, earned, but used by exactly one workflow (`transcriptPipeline`). 8 steps with replay safety. **Swappable for Inngest, Trigger.dev, or a simple Supabase-backed job queue.** The whole workflow could be rewritten in Inngest or Trigger.dev in about a day; replay semantics are better (and opt-in per step); observability dashboards are free.

2. **Stateful per-deal agents** — **not delivered.** `dealAgent` state is `{}`. The real state is in `deal_agent_states` (Supabase). The actor is a vestigial shell.

3. **WebSocket real-time events to browser** — yes, earned, but only for `workflowProgress`. One event type. **Trivially replaceable by Supabase Realtime** (which you already have) or a Next.js `GET /api/pipeline-status?dealId=…` SSE endpoint.

4. **Scheduled jobs** — exactly one use: `c.schedule.after(3000, "synthesizePattern", patternId)` in the coordinator. **Replaceable with `setTimeout(() => fetch(url), 3000)` in a Vercel function — or a DB-backed job row.**

5. **Cross-deal coordinator with in-memory state** — yes, but the in-memory state is mirrored to `coordinator_patterns` and the API route that reads patterns falls back to the database anyway. **The actor adds latency without adding capability.** A scheduled job + DB query would be faster and more observable.

6. **Cost of running Rivet Cloud** — unknown (not in docs), but on Vercel with Supabase you're already paying for the runtime. Rivet Cloud is an additional tier of infra to operate, monitor, and pay for.

### What Rivet costs today

- **Cognitive overhead:** Three mental models for state (Rivet in-memory, Rivet workflow replay, Supabase). Developers routinely ask "where is X stored?" — we saw this in Sections 2, 3, 4.
- **Debugging burden:** Every bug reaches at least two runtimes. "Brief Ready on production" couldn't be debugged in Rivet Cloud; the fix was to move the work out of Rivet.
- **Dead-code tax:** ~195 LOC of `dealAgent` no-ops. ~15 RPC calls per pipeline run that do nothing. The entire `InteractionMemory`, `BriefReady`, `ActiveIntervention`, `CoordinatedIntel` type machinery kept "for backward compat" with nothing.
- **Workaround tax:** `rotate-medvista-uuid.ts`, `nuke-rivet-actors.ts`, `destroy-zombie-dealagent.ts`, and the REST-API destruction path in `demo/reset` all exist to work around Rivet behavior. None of them should be necessary.
- **Architectural confusion:** CLAUDE.md's description of the system is materially disconnected from what the code actually does because the code was migrated away from Rivet in a half-finished way.
- **Call-path latency:** Browser → Next.js API → Rivet Cloud → Vercel fetch → Supabase / Claude. For call-prep this got trimmed; for transcript pipeline it's still live. Every hop adds cold-start exposure.

### Could the rebuild be simpler without Rivet?

Yes, and the delta is stark:

- **Transcript pipeline** → **Inngest** or **Trigger.dev** workflow. Each has durable steps, automatic retries, observable runs, a dashboard for operator review, and native Vercel/Supabase integration. Retries are better-tuned than `callClaude()`. Workflow runs are inspectable in a UI instead of cloud logs.
- **Per-deal state** → **Supabase.** Already done. Remove the actor; keep the table.
- **Cross-deal coordinator** → a **scheduled Inngest function** that runs every N minutes over `observations` to detect patterns, synthesize, and write `coordinator_patterns`. Or a trigger on signal insert. Same outcome, far less moving parts, one data location.
- **Real-time UI updates** → **Supabase Realtime subscriptions** to `deal_agent_states`, `coordinator_patterns`, `deal_fitness_scores`. Browser subscribes directly. No actor relay. Works with the AE's existing row-level data model.
- **Scheduled health checks / interventions** → **Supabase `pg_cron`** or **Inngest scheduled functions** hitting a REST endpoint. Trivial.

Total net change: remove ~1,500 LOC of actor code and `rivetkit` / `@rivetkit/next-js` / `@rivetkit/react` dependencies; gain an operator dashboard and correct replay semantics.

### Recommendation

**REMOVE.**

Rivet is doing one job today — durable transcript workflow — and it's doing it with enough friction that major steps have been moved out of it. The other advertised benefits (stateful agents, coordinator, scheduling) have been silently dismantled or mirrored to Supabase. The remaining workflow is small enough that a rewrite into Inngest or Trigger.dev is a days-not-weeks job, and the resulting system will be:
- Simpler to reason about (one source of truth).
- Faster to debug (one dashboard).
- Cheaper to operate (one less managed service).
- Smaller (removes ~1,500 LOC and 3 dependencies).
- Aligned with the rest of the stack (Vercel + Supabase + Claude API, nothing else).

Keeping Rivet just because it's still wired up is the worst outcome. The gutted `dealAgent` is the proof: the team already knew this direction was right and stopped halfway.

The rebuild plan in Prompt 10 should treat Rivet as non-negotiable remove. Every valuable piece of behavior can be preserved; the primitive can't.

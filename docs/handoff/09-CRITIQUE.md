# 09 — Architectural Critique

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Historical reasoning trail — preserved.** This document captures *why* v2 looks the way it does. Every §3 finding has a v2 resolution; this doc is the record of what the v2 architecture is solving.
>
> **Live status across the §3 + §4 + §5 + §6 findings:**
>
> | Section | Finding | v2 resolution | Status |
> |---|---|---|---|
> | §3.1 | Rivet dismantled in place | §2.6 Rivet REMOVED; jobs table + pg_cron + Realtime | **Resolved — Phase 1 Day 3** |
> | §3.2 | Coordinator → call-prep broken edge | §2.17 call prep reads coordinator_patterns directly | **Resolved by design — Phase 4 Day 2 wires it** |
> | §3.3 | Close Lost single-pass | §1.1 continuous pre-analysis + final deep pass + §2.16 event sourcing | **Ahead — Phase 5 Day 1** |
> | §3.4 | AgentIntervention hardcoded to one deal | §1.14 data-driven + §2.21 applicability gating | **Ahead — Phase 5 Day 1** |
> | §3.5 | Deal creation missing | §1.13 first-class + CrmAdapter.createDeal | **Resolved — Phase 1 Day 5 + Phase 2 Day 2** |
> | §3.6 | Experiment creation UI + no backend | §1.3 POST /api/experiments + attribution pipeline | **Ahead — Phase 5 Day 1** |
> | §3.7 | Pipeline step 9 = 15 no-op RPCs | §2.6 Rivet removed + §2.24 pipeline simplification | **Resolved — Phase 1 Day 3** |
> | §3.8 | Brief Ready browser-dependent | §2.6 jobs table + worker + pg_cron | **Resolved — Phase 1 Day 3** |
> | §3.9 | Coordinator system prompt empty | 04C Rewrite 4 non-empty system + reasoning_trace | **Resolved — Rewrite 4 already done; port at Phase 3 Day 1** |
> | §3.10 | Agent config auto-mutates | Guardrail 43 proposals not direct writes | **Ahead — Phase 5 Day 1** |
> | §3.11 | Stage audit bypass | §2.10 single write-path + shared stage-change action | **Resolved — Phase 2 Day 4 Session B** |
> | §3.12 | preClassified trust flag | §2.11 + §2.12 function calls not HTTP | **Resolved by design — v2 has no such flag** |
> | §3.13 | demo-guide.tsx missing | §2.23 dead code discipline | **Resolved — not rebuilt in v2** |
> | §4.x Fragility | Various | §2.2 hygiene, §2.9 maxDuration, §2.13 unified Claude | **Resolved — Phase 1 Days 1-5** |
> | §5.x Incidental complexity | Various | Covered across §2.2 / §2.6 / §2.13 / §2.22 / §2.23 / §2.25 | **Resolved — Phase 1-2** |
> | §6 Prompt debt | Various | §2.13 unified layer + 8 rewrites in 04C | **Resolved by design; 1/8 ported, 7/8 port at Phase 3 Day 1** |
> | §7 Context gaps | Various | §2.16 DealIntelligence + §2.17 coordinator + §2.21 applicability | **Service layer building through Phase 3-5** |
> | §8 Security | No auth / no RLS | §2.1 Supabase Auth + RLS Day 1 | **Resolved — Phase 1 Day 2** |
> | §9 UI debt | 1019 inline hex / 113 DM Sans / no primitives | §2.22 tokens/caps/registry/primitives + DESIGN-SYSTEM.md | **Resolved — Phase 2 Day 1** |
> | §10 Cost/scale | Per-transcript Claude cost | §2.6 Rivet removed + §2.13 unified client | **Measurable via prompt_call_log Phase 3 Day 1** |
> | §11 CLAUDE.md drift | Stale everywhere | v2 CLAUDE.md rewritten against actual code | **Resolved — ongoing discipline** |
> | §12 Demo paradox | Narrative exceeds execution | §1.9 narrative preserved; code built first | **In progress across all phases** |
>
> Each finding's "diagnosis only" intent is preserved — this doc doesn't get retrofitted with solutions inline, and the §3/§4/§5 bodies below stay as the original critique. The table above is the accountability ledger.
>
> Current v2 authoritative sources: `~/nexus-v2/docs/DECISIONS.md` + `~/nexus-v2/docs/BUILD-LOG.md`. Handoff-edit policy per §2.13.1.

---

Synthesis of findings from extraction sessions 01–08 and DECISIONS.md. Every claim cites its evidence. No solutions here — diagnosis only.

**Reading guide.** Sections are ordered roughly by severity rather than by area. A reader who only has time for the verdict should read §1; ten minutes gets §1–§3; twenty minutes gets the full document. Every cross-reference to `DECISIONS.md` points at a LOCKED decision where v2 already resolves the issue — that mapping is summarized at the end. Every claim names a file, line, or upstream extraction document. Where an observation is a judgment call rather than a fact, the text says so.

**Methodology.** The extraction sessions (01 inventory; 02 schema; 03 routes; 04/04A/04B/04C prompts; 05 Rivet actors; 06 UI structure; 07 data flows; 07A context audit; 07B CRM boundary; 07C HubSpot setup; 08 source index) produced ~2,500 pages of file-by-file, prompt-by-prompt, flow-by-flow analysis. This document compresses those findings down to the shape needed for Codex to understand *why* each v2 decision is the right one. It does not re-extract. It synthesizes.

---

## 1. The One-Sentence Verdict

Nexus today is a demo whose narrative has quietly outrun its code: three of the three marketed pillars — persistent deal agents, cross-deal intelligence, and proactive interventions — are structurally broken, held together by a dismantled-in-place actor runtime, a single broken write between two services, and a hardcoded company-name check in a React component.

The rest of this document backs that sentence up.

---

## 2. What's Actually Working

Real foundations survive into v2. Not everything is broken.

**2.1 The observation capture input pattern** (`apps/web/src/components/observation-input.tsx`, ~2,130 LOC). Framework 21's single-input agent bar is a genuinely good interaction model. DECISIONS.md 1.9 LOCKED preserves it explicitly. The prompt behind it (Prompt #1) is large and has issues (04A-PROMPT-AUDIT.md §1, SHOULD REWRITE), but the *interaction shape* — free text in, Claude classifies + follow-up + giveback — is a design that works and transfers to v2.

**2.2 The core relational shape for deals / stakeholders / activities** (02-SCHEMA.md §3). Deals link to companies, contacts, and team members the way you'd expect. `meddpicc_fields` is a 1:1 on `deals`. `call_transcripts` hangs off deals. `activities` joins cleanly. The relationships are right — what's missing is RLS (every table has `isRLSEnabled: false`), indexes on FKs (only 4 unique indexes exist), and explicit `ON DELETE` behavior (everything defaults to NO ACTION). The *shape* survives; the *hardening* is the v2 task. Covered by DECISIONS.md 2.1, 2.2.

**2.3 The MEDDPICC data model** (02-SCHEMA.md `meddpicc_fields`). Seven dimensions, each with text narrative + integer confidence 0–100, plus `ai_extracted` / `ae_confirmed` provenance flags. The scoring dimensions are right. What's broken is everything *around* it: the edit UI doesn't exist (DECISIONS.md 1.13 LOCKED requires it for v2 Day 1), and MEDDPICC context is passed inconsistently to the 7 downstream prompts that need it (07A-CONTEXT-AUDIT cross-cutting finding #4).

**2.4 The transcript analysis pipeline's decomposition** (`apps/web/src/actors/transcript-pipeline.ts`). Extract actions → score MEDDPICC → detect signals → synthesize learnings → draft follow-up is the right mental model. The three parallel Claude calls (prompts #19, #20, #21) are a reasonable shape. What's wrong is the runtime (Rivet — see §3.1), the handoff between steps (JSON.stringify walls — 04B-PROMPT-DEPENDENCIES Finding 8), the signal-type drift (9 in #1 vs 7 in #21), and that step 9 is ~15 no-op RPCs (07-DATA-FLOWS Flow 1). The decomposition survives; the execution doesn't.

**2.5 The three-act demo narrative.** Process a transcript → see cross-deal intel emerge → act on an intervention → arrive at a call brief that names the pattern. This IS the right story. It just doesn't work end-to-end today because Act 2 is blocked by the coordinator→call-prep broken edge (07-DATA-FLOWS Flow 6; 04B CRITICAL Finding 1). DECISIONS.md 1.9 LOCKED preserves the narrative.

**2.6 The prompts rated PRESERVE in 04A** (04A-PROMPT-AUDIT §Tiered Summary, lines 1560–1561):
- **#2 Cluster Semantic Match** — small, tightly focused. Core issues are context-shape, not prompt text. Survives v2 with minor integration updates.
- **#5 Streaming Transcript Analysis** — "strongest prompt in the registry." Only minor additions needed (chain-of-thought for long transcripts, quote grounding, optional dealId). This is the prompt behind the standalone `/api/analyze` streaming endpoint; it's a clean demonstration of how a single-purpose well-framed prompt produces good output. Worth studying as a template.

Those two, out of 25, ship untouched. Every other prompt needs work. But the distribution itself is instructive: the two PRESERVE prompts are both *small* prompts with *narrow scope*. The 4 MUST REWRITE are all prompts with *ambitious scope* (call brief with 8 intelligence layers, continuous-theory close analysis, cross-deal coordinator synthesis, live agent-config mutation). The pattern suggests that the team's prompt-writing ability is adequate to the current prompts — the issue is not craft, it's that the largest prompts tried to do too much without the context architecture to support them. v2's rewrites unbundle scope and wire context properly.

**2.7 The HubSpot Starter + CrmAdapter decision** (07B-CRM-BOUNDARY, DECISIONS.md 2.18, 2.19). Not working code — it's a decision made for v2. But the boundary it draws (HubSpot owns book-of-business identity; Nexus owns intelligence layer) is the right answer to the "37-tables-with-a-custom-CRM-half-baked" mess current Nexus is. This is the lens that lets v2 drop `companies`, `contacts`, `deals` entirely from Nexus's schema and focus on `deal_events`, `deal_snapshots`, `coordinator_patterns`, `observations`, and intelligence caches.

**2.8 The event-sourced deal intelligence model** (DECISIONS.md 2.16 LOCKED). Decided, not yet implemented. `deal_events` append-only, `deal_snapshots` for projections, `DealIntelligence` service as sole interface — this is the v2 backbone that makes both continuous deal theory (1.1) and applicability gating (2.21) possible. It's a good decision on top of a working but under-leveraged schema.

**2.9 The MCP server integration pattern** (03-API-ROUTES `/api/mcp`, 734 LOC). Stateless mode, Zod-validated tools, 5 usable tools wired to real internal logic. The hardcoded Sarah Chen identity is a problem (see §8), but the MCP surface itself is a clean, working implementation of a modern integration protocol — one of the few places in Nexus where the external-facing contract matches its internal behavior.

**2.10 The persona provider + PersonaContext pattern.** `apps/web/src/components/providers.tsx` wraps the dashboard with a context that persists the selected persona to localStorage. It's not auth and shouldn't be relied on for any security property, but as a *pattern for threading rep identity through client code*, it's a working precedent. DECISIONS.md 2.1 replaces it with Supabase Auth; the replacement inherits the surface area without a new invention.

**2.11 The observation→cluster→routing pipeline concept.** The actual prompts need work (§6), but the three-stage flow — classify → match-or-detect-cluster → route-to-function — is the right decomposition for field-observation intelligence. Current Nexus gets the *shape* right even where it gets the *execution* wrong. DECISIONS.md 2.3 (observation_deals join table) and 2.13 (single classifier with canonical signal enum) preserve the pipeline.

**2.12 HubSpot-as-CRM decision with CrmAdapter pattern** (07B-CRM-BOUNDARY). Recognizes that Nexus was drifting toward "build our own CRM" and stops that drift explicitly. Every row in `deals`, `contacts`, `companies` in current Nexus becomes a HubSpot record in v2; Nexus keeps its intelligence tables and thin caches. This is a clarity of purpose that was missing; it is *working* in the sense that the decision is made and locked.

**2.13 Seed-script discipline.** 17 seed files under `packages/db/src/` covering agents, book, close-analysis, deal-fitness, field-queries, observations, outreach, playbooks, system-intelligence, transcripts, and more. They're not *pretty* (duplicated constants, shared UUIDs across files) but they are *comprehensive* — every feature has corresponding seed data. v2 rebuilds seed scripts against the new schema, but the *coverage discipline* (every demo surface has backing seed data) survives as a convention.

**2.14 DECISIONS.md itself.** The single most important surviving artifact from the planning phase. 51 numbered decisions, LOCKED/PENDING/DEFERRED status tracking, explicit guardrails, cross-references to extractions. When a Codex session gets confused, DECISIONS.md + this critique settle every architectural question. CLAUDE.md drifted; DECISIONS.md is a different genre of document — decisions, not state — and it has held up.

---

## 3. What's Structurally Broken

Items are ordered by severity. Each names files and lines.

### 3.1 Rivet is dismantled in place — CRITICAL

**What it is.** `dealAgent` is declared at `apps/web/src/actors/deal-agent.ts:99`. At line 101 its state declaration is literally `state: {}`. The comment above that line: "EMPTY STATE — nothing to persist, nothing to deserialize, nothing to crash." All 18 actions (`recordInteraction`, `updateLearnings`, `addCompetitiveIntel`, `addRiskSignal`, `setBriefReady`, `dismissBrief`, `getBriefReady`, `getState`, `getMemoryForPrompt`, `recordFeedback`, `updateStage`, `setIntervention`, `dismissIntervention`, `addCoordinatedIntel`, `runHealthCheck`, plus three more) are no-ops or return literals (`""`, `null`, `false`, `{}`). Six interfaces (`DealAgentState`, `BriefReady`, `InterventionAction`, `ActiveIntervention`, `CoordinatedIntel`, `InteractionMemory`) are exported "for backward compatibility with imports" (`deal-agent.ts:486`) — nothing consumes them.

**Symptom.** The marketed pillar "Persistent Deal Agents" runs on nothing. State persists only because a prior pivot moved every field to an explicit Supabase table: `deal_agent_states` (migration 0010) — the real storage — while the Rivet actor remained as a wrapper that broadcasts `workflowProgress` events and does nothing else. CLAUDE.md's description ("persistent state across sessions", "scheduled health checks", "event-sourced", "memory displayed on deal page") matches the intent; the code matches none of it. `/api/intelligence/agent-patterns` exposes the lack of trust explicitly: "try the actor first, fall back to `coordinator_patterns` table" (03-API-ROUTES Known Issues) — the fallback exists because nobody trusts the in-memory state.

**Root cause.** Mid-pivot. The team migrated agent state to Supabase (05-RIVET-ACTORS §2.1, §2.3) but left the actor shell intact so imports and scaffolding didn't need rewriting. `healthScore` is referenced in CLAUDE.md and in code paths, but it never had a database column — the promised "scheduled health check" has no compute logic, no trigger, no persistence (07-DATA-FLOWS Flow 7 Known Issue #2). The coexistence of `nukeAllActors()` (a raw engine-level REST mass-destroy script in `apps/web/scripts/nuke-rivet-actors.ts`) and `destroy-zombie-dealagent.ts` and `rotate-medvista-uuid.ts` shows the current team's operational posture toward the actor runtime: mass-destroy on every demo reset because the `destroyActor` primitive can't reach crashed actors. The mitigation is also the evidence.

**Evidence doc.** 05-RIVET-ACTORS §4.1, §4.3, §5 (recommendation: REMOVE, replaceable by Inngest/Trigger.dev in days, ~1,500 LOC removed).

**Severity.** CRITICAL. The primary marketed pillar is a facade.

**Resolved in v2 by DECISIONS.md 2.6 (Rivet REMOVED) and 2.16 (event-sourced DealIntelligence service).**

### 3.2 Coordinator → call-prep write is broken — CRITICAL

**What it is.** The `intelligenceCoordinator` actor detects cross-deal patterns, synthesizes them with Claude (#25), and writes them to `coordinator_patterns`. It also calls `addCoordinatedIntel()` on each affected `dealAgent` — which, per §3.1, is a no-op. Call prep reads `deal_agent_states.coordinated_intel` expecting to find them. The column is never written. The only code that writes to it is `POST /api/deal-agent-state`, and no caller sends `coordinatedIntel` in the updates payload.

**Symptom.** Act 2 of the demo narrative (MedVista → NordicMed → cross-deal intel appears in call prep) silently fails. The coordinator has done its work; the intel exists in `coordinator_patterns`; the call prep is the last mile; the last mile is not connected. The intelligence dashboard shows the "Agent-Detected Patterns" card because `/api/intelligence/agent-patterns` reads directly from `coordinator_patterns`. But the call prep brief does not.

**Root cause.** One missing service call. Coordinator's `synthesizePattern` handler writes `coordinator_patterns` (via `POST /api/intelligence/persist-pattern`) and calls `dealAgent.addCoordinatedIntel()` for each affected deal — but `addCoordinatedIntel()` is a no-op per §3.1, and nothing writes through to `deal_agent_states.coordinated_intel`. Call prep reads that exact column. The coordinator should also `POST /api/deal-agent-state` for each affected dealId with `{ coordinatedIntel: [...] }`. It doesn't. Alternately — and this is the v2 fix — call prep could read `coordinator_patterns` directly.

**Evidence doc.** 07-DATA-FLOWS Flow 6 "KNOWN ISSUES"; 04B-PROMPT-DEPENDENCIES CRITICAL Finding 1 (severity CRITICAL, blast radius 7 downstream prompts when the wire is finally connected).

**Severity.** CRITICAL. This is the single most visible "Act 2 demo beat doesn't work" bug, and it's one missing write. It is also the broken edge on the prompt-dependency graph — #25 is supposed to feed #11, and it doesn't.

**Resolved in v2 by DECISIONS.md 2.17 (LOCKED: call prep MUST query the coordinator; `coordinator_patterns` is the authoritative table) — eliminates the broken relay entirely. Call prep reads `coordinator_patterns` directly via the DealIntelligence service, no actor hop involved.**

### 3.3 Close Lost is single-pass; continuous deal theory doesn't exist — CRITICAL

**What it is.** `POST /api/deals/close-analysis` (03-API-ROUTES, `apps/web/src/app/api/deals/close-analysis/route.ts`) fires exactly once when the AE clicks "Close Lost." It gathers deal + MEDDPICC + contacts + last 20 activities + last 10 observations + last 5 transcripts + stage history + vertical system intelligence, sends everything to Claude once (prompt #14), and returns. No transcript text is included (07A-CONTEXT-AUDIT §14). No accumulated "deal theory" is built from earlier touchpoints. No coordinator patterns feed in. No fitness narrative.

**Symptom.** The hypothesis Claude produces is shallow — summary of what the AE already knows, not the VP-grade argument DECISIONS.md 1.1 LOCKED describes. And because the prompt "receives no transcript text, no deal theory, no coordinator patterns, no fitness narrative, no MEDDPICC trajectory" (07A §14 verbatim), "it is mathematically incapable of producing a VP-grade hypothesis from the context it is given."

**Root cause.** Close-lost is treated as a single request/response. The architecture for continuous pre-analysis — a rolling theory of the deal that every transcript and email contributes to — has not been built. DECISIONS.md 1.1 is explicit: "Current Nexus does NOT meet this spec. v2 must implement the continuous pre-analysis path."

**Evidence doc.** 07A-CONTEXT-AUDIT.md CRITICAL #14; 04A-PROMPT-AUDIT #14 MUST REWRITE.

**Severity.** CRITICAL. This is the hero surface of the product and its depth is bounded by architecture, not prompts.

**Resolved in v2 by DECISIONS.md 1.1 (continuous pre-analysis + final deep pass) and 2.16 (event-sourced deal intelligence as the substrate).**

### 3.4 AgentIntervention is hardcoded to one deal — HIGH

**What it is.** `apps/web/src/components/agent-intervention.tsx:22-25`:

```
const isNordicMed =
  deal.name?.toLowerCase().includes("nordicmed") ||
  deal.name?.toLowerCase().includes("nordic med");
```

The entire "proactive agent intervention" narrative — the second marketed pillar under Session S13's "Smart Interventions" banner — triggers on a deal-name substring match.

**Symptom.** Rename the NordicMed deal and the feature disappears. The intervention is not data-driven — there is no health score (no column, no compute), no threshold, no applicability gate, no trigger logic. It is a component that renders when the deal name contains a specific string.

**Root cause.** Demo scaffolding never refactored into product logic. CLAUDE.md S13 even acknowledges this: "Demo constraint: timeline risk intervention ONLY fires for NordicMed Group (company name check in deal-agent.ts). Remove for production."

**Evidence doc.** 07-DATA-FLOWS Flow 7 Known Issue #1.

**Severity.** HIGH. A marketed pillar is a `.includes()` check.

**Resolved in v2 by DECISIONS.md 1.14 (AgentIntervention must be data-driven) + 2.21 (structured applicability JSONB, DealIntelligence.getApplicableInterventions()).**

### 3.5 Deal creation does not exist — HIGH

**What it is.** There is no `POST /api/deals` route. All deals come from seed scripts. The UI has no "New Deal" surface.

**Symptom.** A working AE using current Nexus cannot create a deal. Every workflow starts from seeded data. The demo reset re-seeds; no other path exists.

**Root cause.** Nexus was built as a demo-of-a-demo. Deal creation wasn't needed to tell the story, so it was skipped.

**Evidence doc.** 03-API-ROUTES (no POST /api/deals in the 41-route census); 07-DATA-FLOWS Flow 4.

**Severity.** HIGH. You cannot ship a pipeline tool that can't create pipeline.

**Resolved in v2 by DECISIONS.md 1.13 (deal creation is first-class; CrmAdapter creates in HubSpot + initializes Nexus intelligence shell).**

### 3.6 Experiment creation UI exists; the backend doesn't — HIGH

**What it is.** `PlaybookClient` (2,429 LOC) includes an experiment proposal form. There is no `POST /api/experiments`. `PATCH /api/playbook/ideas/[id]` handles updates only. The 41-route census has no creation route.

**Symptom.** A rep can fill out the proposal form. It goes nowhere.

**Root cause.** Unfinished feature.

**Evidence doc.** 07-DATA-FLOWS Flow 5; 01-INVENTORY (41 routes, none is a create-experiment route).

**Severity.** HIGH. DECISIONS.md 1.3 LOCKED explicitly flags this as a v2 build item.

**Resolved in v2 by DECISIONS.md 1.3 (preserve proposal UI; build `POST /api/experiments` + attribution + applicability gating).**

### 3.7 Pipeline step 9 is ~15 no-op RPCs — HIGH

**What it is.** `transcript-pipeline.ts` step `update-deal-agent` calls `dealAgent.recordInteraction()`, `updateLearnings()`, `addCompetitiveIntel()` (per competitor), `addRiskSignal()` (per blocker), plus `recordInteraction()` per stakeholder. Every one is a no-op (per §3.1). Each is a full network roundtrip to Rivet Cloud. The comment at `transcript-pipeline.ts:697` says the calls are kept "for safety."

**Symptom.** Every transcript pipeline run burns ~15 RPC roundtrips for zero effect. Pure latency cost per run, multiplied by every deal every transcript.

**Root cause.** Mid-pivot debris. The actor's in-memory state was deprecated; the pipeline still talks to it.

**Evidence doc.** 05-RIVET-ACTORS §2.2 row 11, §4.8; 07-DATA-FLOWS Flow 1 Known Issue #2.

**Severity.** HIGH. Performance tax on every pipeline run. Also a misleading signal that "the agent is being updated" when it isn't.

**Resolved in v2 by DECISIONS.md 2.6 (Rivet removed) + 2.24 (pipeline simplification: no backward-compat placeholders, sequential job rows, ~6–8 steps).**

### 3.8 "Brief Ready" works only while the browser is open — HIGH

**What it is.** Pipeline step `flag-brief-pending` sets `briefPending=true` on `deal_agent_states`. A browser-side polling hook watches for the flag. When it flips, the browser fires `POST /api/agent/call-prep`. The brief is generated in the browser's serverless invocation window.

**Symptom.** Per 07-DATA-FLOWS Flow 2 Known Issue #1: "The 'agent prepares ahead of the call' narrative is only as real as the browser being open." Close the browser after kicking off a transcript, go to bed, come back the next morning: no brief exists until you reload the page.

**Root cause.** Auto-call-prep was originally a pipeline step. It was removed because "Rivet Cloud → Vercel → Claude chain timed out on production" (comment at `transcript-pipeline.ts:806-808`). The fix moved the work to the browser instead of fixing the runtime.

**Evidence doc.** 07-DATA-FLOWS Flow 2 Known Issues; 05-RIVET-ACTORS §4.6.

**Severity.** HIGH. The hero narrative of an agent "preparing ahead of the call" is ghostwritten by a browser tab.

**Resolved in v2 by DECISIONS.md 2.6 (jobs table + Next.js worker + pg_cron) — long-running work runs on the server, not the browser.**

### 3.9 Coordinator synthesis prompt is empty — HIGH

**What it is.** Prompt #25 (intelligence coordinator synthesis, `apps/web/src/actors/intelligence-coordinator.ts:215`) has `system: ""`. The role declaration is in the user message. Per 04A-PROMPT-AUDIT (lines 1399–1408): "Structurally the model reads 'the task is this, oh and by the way you're an analyst' rather than 'you are an analyst doing this task.' Weakest role framing in the entire registry, not by omission but by placement." Four documented harms: role discipline collapses, sampling becomes variable, instruction following weakens, safety/style constraints drift.

**Symptom.** Cross-deal pattern synthesis — the output that should power the intelligence dashboard's most important card — is shallow and generic. Recommendations default to "Build a battlecard" / "Schedule alignment" rather than pattern-specific actions. DECISIONS.md 2.14 flags this explicitly.

**Root cause.** Prompt was never finished. Also flagged as #25 MUST REWRITE in 04A (one of the 4 of 25).

**Evidence doc.** 04A-PROMPT-AUDIT.md lines 1383–1408; 04C-PROMPT-REWRITES rewrite #4.

**Severity.** HIGH.

**Resolved in v2 by 04C-PROMPT-REWRITES rewrite #4 (non-empty system prompt, reasoning_trace scaffold, structured per-deal recommendations, forbidden-language list, arr_impact with shown calculation).**

### 3.10 Agent configs auto-mutate without human review — HIGH

**What it is.** Prompt #4 (`/api/observations/route.ts:949`) suggests changes to another team member's agent config. The suggestion is applied directly: `agentConfigs.instructions` is appended with `\n\n[Auto-added from field intelligence] {instruction_addition}`, `outputPreferences` is merged, a version row is written with `changedBy: "feedback_loop"`, a notification is sent to the affected member.

**Symptom.** Reps' AI agents get quietly modified by other reps' observations. No human-in-the-loop confirmation. No dry-run. No revert UI (the version history exists; no page reads it).

**Root cause.** Experiment in automation that shipped without the guardrails.

**Evidence doc.** 04-PROMPTS.md Prompt #4 Known Issues; 03-API-ROUTES `/api/observations` Known Issues.

**Severity.** HIGH. DECISIONS.md Guardrail #43 explicitly forbids this: "AI-driven config mutations are proposals, not direct writes."

**Resolved in v2 by Guardrail #43.**

### 3.11 `/api/deals/[id]/update` silently bypasses the stage-change audit trail — HIGH

**What it is.** Two routes can change `deals.stage`. `POST /api/deals/stage` writes a `deal_stage_history` row, creates a `stage_changed` activity, writes observations for confirmed close factors. `PATCH /api/deals/[id]/update` updates the `stage` column directly, writing none of the above.

**Symptom.** A stage transition via `/update` is invisible to the audit trail and to intelligence surfaces.

**Root cause.** Two paths, no service boundary. The generic update endpoint accepts any of `close_date`, `stage`, `win_probability`, without discriminating which require audit.

**Evidence doc.** 03-API-ROUTES summary `/api/deals/[id]/update` Known Issues; "Notable cross-route risks" #1.

**Severity.** HIGH. Silent audit bypass is the specific failure mode that eats forensic capability.

**Resolved in v2 by DECISIONS.md 2.10 (single write-path per domain concept — 2+ write sites → service function).**

### 3.12 `preClassified: true` is a trust flag bypass — HIGH

**What it is.** `POST /api/observations` accepts `preClassified: true` in the body. If set, it bypasses the full Claude classification pipeline (prompts #1, #2, #3) and writes whatever `signalType`, `severity`, `aiClassification` the caller supplied directly.

**Symptom.** An untrusted caller can inject classifications that downstream routing, cluster matching, playbook auto-creation, and agent config auto-mutation all act on.

**Root cause.** Demo performance optimization. The classifier is expensive; preClassified lets the pipeline (which already classified) skip it. But the API accepts it from any caller.

**Evidence doc.** 03-API-ROUTES `/api/observations` Known Issues.

**Severity.** HIGH. Client-controlled trust flag, explicitly forbidden by DECISIONS.md Guardrail #14.

**Resolved in v2 by 2.11 (no trust flags on user input) and 2.12 (server-to-server work uses function calls, not HTTP — the pipeline no longer needs to POST via an authenticated-by-nothing external endpoint).**

### 3.13 `demo-guide.tsx` does not exist — MEDIUM

**What it is.** CLAUDE.md Session S13 describes "`DemoGuide` component: floating panel… 10 steps guiding through NordicMed pipeline → intervention → call prep…" and lists it in the components inventory. The file is not in `apps/web/src/components/`. Confirmed by 01-INVENTORY.md Section 5.

**Symptom.** CLAUDE.md describes a feature that doesn't ship. Any new developer reading CLAUDE.md starts with a wrong map.

**Severity.** MEDIUM. Not load-bearing code; is load-bearing documentation.

**Resolved in v2 by DECISIONS.md 2.23 (dead code discipline) and by rewriting CLAUDE.md against actual code at the start of Codex's work.**

### 3.14 `initialize` workflow has been "de-inited" but the comment lies — LOW

**What it is.** `dealAgent.initialize(closeDate, companyName)` is declared, accepted, and stored nowhere because state is `{}`. Callers still call it (pipeline, deal-detail-client mount). The action exists to keep the call sites compiling while the actor does nothing.

**Symptom.** Code reads as if `closeDate` and `companyName` are being persisted to the agent state. They aren't. A reviewer expecting `closeDate` to influence interventions finds neither storage nor trigger.

**Severity.** LOW. Ghost API surface; harmless individually, contributes to the overall "runs on scaffolding" picture from §3.1.

**Resolved in v2 by DECISIONS.md 2.6 (Rivet removed) — the action and its callers disappear together.**

---

## 4. What's Fragile

Things that work today but won't survive real usage, real data, or minor change.

**4.1 `maxDuration: 30` on `/api/field-queries` against up-to-10 Claude calls.** The POST happy path fires one analysis call + up to 8 generate-question calls + transitively give-back + aggregation. With any latency drift, the route times out (03-API-ROUTES `/api/field-queries` Known Issues).

**4.2 Stale CLAUDE.md drives every new session's mental model.** CLAUDE.md says 33 tables (actual 37), 32 API routes (actual 41), 14 dashboard pages (actual 16), references `demo-guide.tsx` (doesn't exist), claims shadcn/ui (no `components/ui/` directory), claims "Enter Demo = Reset" on the landing page (actually triggered only by sidebar button per `AdminReset`, see 03-API-ROUTES `/api/demo/reset` Known Issues). Every new Claude Code session starts from this map.

**4.3 `readnessFitDetected` typo at `schema.ts:998`.** The TS property is misspelled; the SQL column is correct. Every caller uses the misspelled name. The typo leaks into API response shape (`/api/deal-fitness` returns `readnessFitDetected`) and into the MCP surface at `mcp/route.ts:474`. Renaming by search fails because the DB column doesn't match.

**4.4 Demo reset does `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` at runtime** (`apps/web/src/app/api/demo/reset/route.ts:266`). A schema migration baked into a demo endpoint. Works once; surprises forever.

**4.5 Demo reset hardcodes deal names** via `ILIKE '%MedVista%'` and 14 other pattern-delete rules (03-API-ROUTES `/api/demo/reset` Known Issues). Any rename breaks the reset's idempotence.

**4.6 `/api/demo/prep-deal` sleeps 90 seconds between transcripts** inside a Vercel function. Three transcripts = 270s, against a 300s maxDuration. Every time the pipeline gets slower, this gets closer to the cliff.

**4.7 Port 3001 auto-increments, breaking Rivet actors.** CLAUDE.md Known Issues: "when port shifts, Rivet actors can't connect (NEXT_PUBLIC_SITE_URL mismatch). Kill stale servers and restart." A bring-up failure mode that happens at the cost of minutes every time.

**4.8 Seed data shape is load-bearing for prompts.** MedVista (3500 words, Microsoft DAX Copilot mention, 6–8 week security review) is a carefully tuned input to prompts #21 (signal detection) and #25 (coordinator synthesis). Realistic customer transcripts — shorter, more ambiguous, no named competitor — would fail the coordinator's "2+ deals, same vertical, same competitor" trigger.

**4.9 Two email-drafting paths with different schemas.** `/api/agent/draft-email` (for deals, prompt #12) and `/api/customer/outreach-email` (for post-sale, prompt #18) share no code, output different shapes, and drift (07A-CONTEXT-AUDIT duplication findings #7).

**4.10 Silent 200-empty returns.** `/api/deals/close-analysis` returns 200 with empty analysis on Claude failure (03-API-ROUTES Known Issues). The UI renders "no AI data" and falls back to fixed chips. Users never know Claude failed.

**4.11 Schema "enum-shaped" text columns.** 20+ columns are documented-as-enum but stored as plain text (02-SCHEMA.md §1, §4.3). `observations.status`, `observation_clusters.signal_type`, `account_health.contract_status`, `customer_messages.status`, `deal_fitness_events.fit_category`, `coordinator_patterns.status`, `playbook_ideas.status`. A typo'd value (`kit-ready` vs `kit_ready`) lands silently.

**4.12 Pipeline timeouts already worked around by moving work out.** Step 7 (`draft-email`) and step 10 (`auto-call-prep`) are both wrapped in graceful degradation because the original runtime couldn't reliably complete them. The comment at `transcript-pipeline.ts:806-808` documents this. The pipeline shows "Complete" while two of its steps silently failed.

**4.13 Cascade from `readnessFitDetected` typo.** The TS property (`schema.ts:998`) is misspelled `readness` (missing "i"). The SQL column is correct. Every caller uses the misspelled name. `/api/deal-fitness` returns it in the API response as `readnessFitDetected`. `/api/mcp` surfaces it at `mcp/route.ts:474`. A safe rename needs to touch every consumer across the API, client, and MCP simultaneously — a single config change has cascading visible effects.

**4.14 Aggressive AI context truncation drift across pipeline steps.** 04B-PROMPT-DEPENDENCIES Finding 9 (MEDIUM): "Truncation drift 15K → 12K → 8K across pipeline." Early signal detection reads full transcript; synthesis prompts receive truncated versions; the downstream synthesis is already seeing less than what the detector saw. This inverts the usual "synthesis gets more context than detection" relationship.

**4.15 Async race between coordinator synthesis and call prep.** Pipeline sends signals to coordinator in step 9 (`send-signals-to-coordinator`). Coordinator's synthesis runs on a 3-second scheduled delay (`c.schedule.after(3000)`). Auto-call-prep fires in step 10. On a slow run, call prep fires before coordinator finishes synthesizing — even if the write-path to `coordinated_intel` were fixed (§3.2), the timing window is narrow. Surfaced by 07-DATA-FLOWS Flow 6 indirectly via the "coordinator is asynchronous" note.

**4.16 Dev-server port shifts break Rivet actor connectivity.** CLAUDE.md Known Issues: "Dev server default port 3001, auto-increments if occupied — when port shifts, Rivet actors can't connect (NEXT_PUBLIC_SITE_URL mismatch). Kill stale servers and restart." A port-in-use warning that most frameworks absorb silently is load-bearing in Nexus.

**4.17 Demo-reset hard-coded to specific deals.** `apps/web/src/app/api/demo/reset/route.ts` references 15+ specific deal names via `ILIKE '%MedVista%'` and sibling patterns. Changing any demo deal name requires updating the reset script in 15 places. It also hardcodes relative close-date offsets per deal (MedVista today+55d, NordicMed today+42d, TrustBank today+60d, PharmaBridge today+90d, etc.). Any new seeded deal needs a parallel entry here or it drifts out of sync with the demo narrative.

**4.18 Pipeline "always completes" contract is enforced structurally, not correctly.** `/api/transcript-pipeline` flips `call_transcripts.pipeline_processed = true` immediately on enqueue, before the pipeline actually runs. If the pipeline then fails, the transcript is marked processed anyway. The contract guarantees the *flag* flips; it doesn't guarantee the *work* happened. Observability becomes difficult: a user seeing `pipeline_processed=true` cannot tell whether the pipeline succeeded, partially succeeded (§4.12), or failed outright.

---

## 5. What's Incidental Complexity

Things that exist because of workarounds, reversed decisions, or abandoned abstractions. Each has a v2 replacement already decided.

**5.1 `getEffectiveType()` fallback in `activity-feed.tsx:45`.** Every read of `activity.type` inspects `metadata.source` and returns one of `call_prep | call_analysis | email_draft | agent_action` because legacy rows wrote real activity types into metadata while `type` stayed `note_added`. Three routes (`/api/agent/save-to-deal`, `/api/deals/[id]/meddpicc-update`, `/api/field-queries/respond`) still perpetuate the debt by writing `type: "note_added"` + `metadata.source`. 02-SCHEMA §4.1 has the fix. **v2 replacement:** DECISIONS.md 2.2 (full hygiene) plus a canonical activity/event model.

**5.2 Dual persistence — Rivet in-memory + Supabase mirror.** `deal_agent_states` and `coordinator_patterns` mirror Rivet in-memory state because the in-memory state is untrusted (actor destruction, cold starts, Rivet Cloud restarts). Both API routes (`/api/deal-agent-state`, `/api/intelligence/agent-patterns`) "try the actor, fall back to DB" — which betrays that nobody trusts the actor. **v2 replacement:** DECISIONS.md 2.6 (Rivet REMOVED).

**5.3 Four copies of fuzzy deal resolution.** `/api/deals/resolve`, `/api/mcp`, call prep's deal lookup, and the Universal Agent Bar's internal resolver each implement the same tokenize-on-4-char-words ILIKE pattern differently. DECISIONS.md 2.25 #2 identifies this. **v2 replacement:** `CrmAdapter.resolveDeal` (07B-CRM-BOUNDARY §2).

**5.4 Rivet scaffolding scripts.** `apps/web/scripts/nuke-rivet-actors.ts` (engine-level REST mass-destroy because `destroyActor` can't reach crashed actors), `destroy-zombie-dealagent.ts` (ad-hoc stuck-actor destroyer), `rotate-medvista-uuid.ts` (rotates UUID because replaying the same ID re-runs old workflow history). Three files that exist only to keep Rivet going. **v2 replacement:** zero files when Rivet is removed (2.6).

**5.5 ~15 no-op RPCs in pipeline step 9.** Each a Rivet Cloud roundtrip, each does nothing. Comment in code: "Kept for safety." **v2 replacement:** pipeline step 9 is deleted (2.24).

**5.6 1,019 inline hex colors across 23 files.** 06-UI-STRUCTURE.md §4. Heaviest: `playbook-client.tsx` (208), `observation-input.tsx` (188), `deal-detail-client.tsx` (145), `intelligence-client.tsx` (102), `activity-feed.tsx` (91). Two corals (`#D4735E` vs `#E07A5F`) already drift. Any visual rebrand is a find-replace across 23 files and the risk of missing a variant. **v2 replacement:** DECISIONS.md 2.22 (design tokens, no inline styling).

**5.7 Two parallel email-drafting paths.** `/api/agent/draft-email` and `/api/customer/outreach-email`. Different shapes, different context gathering, no shared service. **v2 replacement:** DECISIONS.md 2.13 (one email service).

**5.8 Four fence-strip regex patterns.** 04A-PROMPT-AUDIT anti-pattern #7: "at least 4 different regex patterns for stripping Markdown fences across the codebase." Only prompt #15 (deal fitness) has a robust 3-strategy extractor. Everywhere else: regex-and-hope. **v2 replacement:** DECISIONS.md Guardrail #17 (tool use, not JSON-in-text regex parsing).

**5.9 113 `DM Sans` declarations across 19 files; DM Sans never loads.** Tailwind declares Inter. `globals.css:1` imports Inter from Google Fonts. Inline styles ask for `'DM Sans', sans-serif`. Browser falls back to generic sans-serif everywhere. 06-UI-STRUCTURE §4 "What actually renders." **v2 replacement:** DECISIONS.md 2.22 (fonts referenced in code must load) + Guardrail #38.

**5.10 10 unused Radix + Tremor dependencies.** `@radix-ui/react-avatar`, `-dialog`, `-dropdown-menu`, `-popover`, `-select`, `-separator`, `-slot`, `-tabs`, `-tooltip`, and `@tremor/react`. Declared in `package.json`, zero imports (06-UI-STRUCTURE §4, confirmed via grep). **v2 replacement:** DECISIONS.md Guardrail #37 (UI primitives from ONE library).

**5.11 Legacy statuses in the playbook transition map.** `PATCH /api/playbook/ideas/[id]` has `"promoted"` and `"retired"` entries with empty allowed-transition arrays "for backward compat" (03-API-ROUTES Known Issues). Any caller trying to transition out of them gets a confusing error. **v2 replacement:** DECISIONS.md 1.5 (canonical lifecycle: proposed → active → graduated | killed).

**5.12 Dead pages and routes.** `observations-client.tsx` is 463 LOC of unreachable code (06-UI-STRUCTURE §5). `/agent-admin`, `/team` are placeholder stubs. `/observations` is a redirect shell. Five API routes have zero callers in the repo: `/api/activities`, `/api/team-members`, `/api/observation-routing`, `/api/observations/clusters`, `/api/demo/prep-deal` (03-API-ROUTES "Candidate dead code"). **v2 replacement:** DECISIONS.md 1.10 / 1.12 / 2.23 (dead code discipline, explicit cut list).

**5.13 Supabase `deal_agent_states` as a Rivet workaround.** Migration 0010 added this table specifically because Rivet actor state was unreliable. Columns like `pipeline_status`, `pipeline_step`, `pipeline_details`, `brief_ready`, `brief_pending`, `intervention_dismissed` all exist to replicate Rivet state externally. Once Rivet is removed (2.6), the table's *reason* for existing collapses; its *structure* becomes a projection off `deal_events` instead (DECISIONS.md 2.16).

**5.14 `coordinator_patterns.deal_ids` as a text[] without FK.** 02-SCHEMA §3 loose uuid arrays. The coordinator wants to reference affected deals; Drizzle doesn't enforce any of the references; deleted deal IDs can persist in coordinator_patterns arrays indefinitely. **v2 replacement:** join table `coordinator_pattern_deals` with real FKs and cascades, per DECISIONS.md 2.3 pattern.

**5.15 `field_queries.initiated_by` heterogeneous FK.** 02-SCHEMA §4.6: the column can point at `team_members.id` OR `support_function_members.id` with no discriminator, no FK, no runtime check. Callers have to know. **v2 replacement:** split into two nullable FK columns with a CHECK constraint (DECISIONS.md 2.2 hygiene).

**5.16 Inconsistent "back-compat" placeholders in pipeline + playbook.** The 15 no-op RPCs in the transcript pipeline and the `"promoted"` / `"retired"` empty-transition entries in the playbook transition map are both labelled in code as "for backward compat" — neither has backward consumers in the repo. **v2 replacement:** DECISIONS.md 2.24 (no backward-compat placeholders in v2 pipelines).

---

## 6. Prompt Engineering Debt

The AI layer's problems break into two categories: prompt text, and prompt-to-prompt architecture.

**Tiered rewrite summary** (04A-PROMPT-AUDIT lines 1528–1566):
- **4 MUST REWRITE:** #4 (agent config auto-mutate — DECISIONS.md 2.25 violation, unbounded instruction growth, no human review), #11 (call prep brief — 200-line conditional monolith, coordinator gap blocks Act 2), #14 (close analysis — structurally cannot meet DECISIONS.md 1.1 from the context it gets), #25 (coordinator synthesis — `system: ""`, thin signal representation, generic outputs, broken downstream wire).
- **19 SHOULD REWRITE:** #1, #3, #6, #7, #8, #9, #10, #12, #13, #15, #16, #17, #18, #19, #20, #21, #22, #23, #24. Common issues: missing reasoning_trace scaffold (absent in 23/25 prompts), missing worked examples (absent or weak in 18/25), weak anti-hallucination (weak in 17/25), stakeholder/applicability context missing.
- **2 PRESERVE WITH MINOR EDITS:** #2 (cluster match — small, tightly focused, core issues are context-shape not prompt-text), #5 (streaming transcript analysis — "strongest prompt in the registry"; only minor additions needed for long-transcript chain-of-thought and quote grounding).

**The CRITICAL dependency graph finding** (04B-PROMPT-DEPENDENCIES Finding 1) is the coordinator → call-prep broken edge detailed in §3.2. One missing write blocks the entire Act 2 demo beat and is a CRITICAL finding both on the data-flow axis and on the prompt-dependency axis. It's the single highest-leverage fix.

**Signal-type enum drift** (04A line 66, 04B Finding 2). Prompt #1 (observations classifier) enumerates 9 types including `agent_tuning` and `cross_agent`. Prompt #21 (pipeline signal detection) lists 7 and omits those two. Pipeline observations can therefore never carry `agent_tuning` or `cross_agent` signal types, which blocks the entire agent-config auto-tuning flow (prompt #4) from ever firing on pipeline-detected signals. The drift is documented in the product code as comments and enforced by nothing.

**Temperature unset everywhere.** 04-PROMPTS.md Universal facts line 11: "**No `temperature` is set on any call.** All rely on the API default." API default is 1.0 — correct for creative generation (emails, brief narrative), wrong for classification (prompt #1), scoring (#15, #20), and pattern synthesis (#25) where determinism matters. DECISIONS.md Guardrail #18 (explicit per-task temperature) addresses this in v2.

**No tool use; no structured output.** Every Claude call uses JSON-as-text. Parsing relies on fence-stripping (§5.8 above, four regex patterns). Only prompt #15 has a 3-strategy robust parser. Every other prompt fails silently when the model adds explanatory text around the JSON. 04A-PROMPT-AUDIT anti-pattern #7 and Principle 3 in the 04C patterns section.

**Coordinator system prompt is empty.** §3.9 above. Prompt #25 `system: ""`. Prompt #8 (deal-scoped manager question, 04-PROMPTS) is a second `system: ""` equivalent (omitted rather than empty).

**"MANDATORY" language on #11 proven plays doesn't work.** 04A-PROMPT-AUDIT line 584: "Proven plays skipped despite MANDATORY framing." All-caps, multi-sentence "These are not suggestions — they are requirements" still permits omission. No deterministic post-check.

**Prompts that write to live persistent state are the weakest-guarded.** 04A lines 1488–1492: "Prompts that write to live persistent state (#4, #11, #20, #22) have weaker anti-hallucination than prompts with human-in-the-loop confirmation (#13, #14's close modal). The highest-consequence paths are the least-guarded — an inverted correlation that is specifically dangerous."

**How much of the AI quality gap is prompts vs. architecture?** Reading 04A, 04B, and 07A together: maybe 40% is prompt text (tightening role framing, adding reasoning_trace, adding worked examples, adding temperature), maybe 60% is context and wiring (coordinator→call-prep, full transcripts in synthesis, coordinator patterns in close analysis, continuous deal theory accumulation). Fixing the 4 MUST REWRITE prompts in isolation would not close the gap. Fixing the architecture without rewriting #4/#11/#14/#25 would leave the biggest quality levers untouched. **Both are required** — and DECISIONS.md treats them as co-equal (2.13 for the prompt infrastructure, 2.16/2.17/2.21 for the context architecture).

**Cross-cutting anti-patterns in the audit.** 04A enumerates 15 recurring anti-patterns. The most load-bearing seven:
1. Empty/absent system prompts (#25, #8) — weakest role framing, most variable sampling.
2. JSON-in-text with regex fence-stripping — brittle to any narration the model adds.
3. Enum definitions embedded in prompt text — drift between prompts becomes invisible until runtime.
4. Aggressive all-caps "MANDATORY" framing — model still omits the required section (#11 proven plays).
5. Truncation of context without telling the model — the model sees 500-char config slices in prompt #4 and reasons as if that were the whole config.
6. Prompts without `reasoning_trace` — analytical tasks skip the explicit multi-step reasoning scaffold.
7. Prompts that write live state being the least-guarded — #4, #11, #20, #22 mutate persistence with the weakest anti-hallucination.

**Signal-to-consumer fanout.** Prompt #1 (classifier) feeds 3 downstream prompts (#2 cluster-match, #3 new-cluster, #4 agent-config suggestion). Prompt #21 (pipeline signal detector) feeds #22 (learnings) and #25 (coordinator synthesis). Both sit at the top of a dependency tree — fixing them has blast radius across 5+ prompts. 04B scores this via blast-radius: #1 and #21 are tied for highest.

**Resolved in v2 by:** DECISIONS.md 2.13 (unified Claude client, tool use, explicit temperatures, prompts as `.md` files, single signal-type enum), all 8 rewrites in 04C, and the architecture fixes in 2.16 / 2.17 / 2.21.

---

## 7. Context Gaps — Where Demo Quality Lives

07A-CONTEXT-AUDIT audited 25 prompts. The finding distribution skews HIGH: 2 CRITICAL, ~11 HIGH, ~8 MEDIUM, 0 LOW. "Framing skews HIGH because every prompt has systemic context gaps."

**Two CRITICAL gaps:**

**#11 Call Prep — CRITICAL.** "The coordinator gap alone blocks the Act 2 demo story. Adding coordinator, MEDDPICC trajectory, prior briefs, and full fitness narrative would close the gap between today's 'decent synthesis' and the VP-grade 'diagnosed the deal.'" The prompt itself is 200+ lines of conditional context assembly; the actual inputs it receives are incomplete; what the call brief says is bounded by what it knows.

**#14 Close Analysis — CRITICAL.** "The prompt receives no transcript text, no deal theory, no coordinator patterns, no fitness narrative, no MEDDPICC trajectory. It is mathematically incapable of producing a VP-grade hypothesis from the context it is given." This is architectural, not prompt-engineering — no better prompt can rescue missing context.

**Top 5 highest-leverage context fixes** (07A Cross-Cutting Findings):

1. **Wire `coordinator_patterns` into 7 prompts at once** — call prep + #8, #9, #10, #14, #22, #24. "One query + one formatter… retrofits cross-deal context into 7 prompts at once."
2. **Add a `DealIntelligence` service** returning a canonical deal context object. "Replaces ~60% of the parallel-query blocks currently inlined in route handlers."
3. **Pass full transcript text (not just summaries)** to downstream synthesis. Fixes #22's "synthesis sees less than signal detection" inversion, #11's summary-only previous calls, #14's missing transcripts.
4. **Implement continuous deal-theory accumulation.** Event-sourced backbone — without it, #14 cannot meet DECISIONS.md 1.1.
5. **Add applicability gating.** Removes the NordicMed hardcoded check (§3.4), fixes #23's blind fanout, makes #11's proven plays actually relevant.

**The broader observation.** 07A's closing tone is consistent with this framing: architecture is plumbing; intelligence lives in prompts plus context. What reps experience as "the AI is shallow" is mostly two things — the model isn't given enough to work with (context), and the model isn't asked to reason carefully about what it's given (prompt structure). Both are fixable without changing models. 07A names 11 duplication patterns — fuzzy deal resolution, MEDDPICC formatting, system intelligence fetch, manager directives, contact list with roles, recent activities — where the same context needs the same shape across 3–9 prompts each. A single canonical context shape upgrades all consumers at once.

**Specific duplications with high consolidation value:**
- **Deal + company + AE lookup** repeated in 3+ prompts as an ad-hoc parallel query block
- **MEDDPICC formatting** repeated in 4 prompts with subtly different stringification
- **System intelligence filter-by-vertical** fetch repeated in 6 prompts
- **Manager directives filter** repeated in 4 prompts
- **Contact list with roles** repeated across 9 prompts
- **Recent activities (last N)** queried with 3 different limits across 3 prompts
- **Two parallel email-drafting paths** (deal vs. post-sale) with different shapes
- **Two transcript-analysis paths** (standalone `/api/analyze` vs. durable pipeline)
- **Four fuzzy deal resolvers** (per DECISIONS.md 2.25 #2)

**One canonical `DealIntelligence.getDealContext(dealId)` method** — returning a typed object with deal, company, AE, MEDDPICC, stakeholders, last-N activities, system intelligence, directives, fitness summary, coordinator patterns — replaces ~60% of the parallel-query blocks currently inlined in route handlers (07A Cross-Cutting Finding #2). Every prompt shrinks proportionally, every bug fix propagates.

**Resolved in v2 by DECISIONS.md 2.13 (canonical prompt infrastructure), 2.16 (event-sourced DealIntelligence), 2.17 (coordinator queried by call prep), 2.21 (applicability gating).**

**Audit footprint.** 07A-CONTEXT-AUDIT covers all 25 prompts with a consistent analysis template per prompt: intended context vs. actual context, specific missing fields, concrete quality impact. The 8 cross-cutting structural findings are the highest-leverage items — they are not "prompt #X has issue Y" but "a class of context issue that affects N prompts simultaneously." Those 8, listed in 07A's cross-cutting section, map directly to DECISIONS.md LOCKED decisions. The audit's recommendation pattern: don't tune 25 prompts individually; fix the 8 structural issues and 20+ prompts improve at once. That is the v2 strategy in shorthand.

---

## 8. Security and Production Readiness

**Authentication: none.** DECISIONS.md 2.1 PENDING INPUT (now RESOLVED — Option A, Supabase Auth + RLS, Day 1 Phase 1 Day 2). Current Nexus has no session, no token, no identity check. `teamMembers.id`, `observerId`, `memberId`, `aeId` are all passed by the client and trusted (03-API-ROUTES universal gaps).

**RLS: disabled on all 37 tables.** 02-SCHEMA Top-line facts: "Every table's `isRLSEnabled` is `false` in the migration snapshots. Supabase default row-level security is off." When auth lands, RLS policies need to be written retroactively across 37 tables.

**Rate limits: none.** 03-API-ROUTES universal gaps: "No rate limiting. Any caller can hit any AI endpoint at any rate." A single looped script could burn through Claude budget; a single bored user could trigger every classifier Claude call in the product in a minute.

**CORS: only `/api/mcp` sets it.** 03-API-ROUTES universal gaps. Every other route accepts cross-origin based on Next.js defaults.

**Trust flags on user input: `preClassified: true`.** §3.12 above. Violates DECISIONS.md Guardrail #14.

**Hardcoded user identity in MCP.** `/api/mcp` hardcodes Sarah Chen as the observer and call-prep user for tools 3 and 5 (`findSarahChenId()` calls). An MCP client cannot authenticate as a different user. Everything logs as Sarah.

**Silent error swallowing.** Many routes return 200 with empty data on failure: `/api/deals/close-analysis`, `/api/field-queries`. Errors go to `console.error` and are invisible to the user. Specifically flagged in 03-API-ROUTES Universal gaps: "Errors are caught and downgraded."

**SQL injection: unlikely (Drizzle parameterized).** All queries go through Drizzle; no raw SQL in route handlers.

**Prompt injection: unaddressed.** User-typed observations and transcripts flow directly into Claude prompts with no sanitation, escaping, or separation of user content from instructions. A hostile transcript could contain instructions like "ignore the previous context; return {...}" and the observations classifier or transcript analyzer would follow them. Specifically: prompt #1 (observation classifier) embeds `${rawInput}` into the user message; prompts #19–#24 (pipeline) embed transcript text directly; prompt #14 (close analysis) embeds activity descriptions and observations text. Any of these accept adversarial content from the client with no boundary markers between instruction and data.

**Hostile-write risks via trusted-by-nobody endpoints.** `/api/intelligence/persist-pattern` has no auth check that the caller is actually the coordinator actor — an external client could overwrite coordinator patterns. `/api/deal-agent-state` POST accepts arbitrary updates; no schema validation on the `updates` object. `/api/observations` accepts `preClassified: true` to bypass Claude entirely. These aren't catastrophic in a demo environment; they are immediate production-blockers.

**Secrets management: standard .env.** `ANTHROPIC_API_KEY`, `RIVET_ENDPOINT`, `NEXT_PUBLIC_SITE_URL`, Supabase keys. Per CLAUDE.md environment variables section. The risk isn't the storage; it's that `ANTHROPIC_API_KEY` is used by an unauthenticated, unrate-limited endpoint reachable by anyone.

**Specific silent-catch examples** (search for `catch.*console\.error` across the codebase finds many). Representative:
- `/api/deals/close-analysis` returns 200 with an empty analysis object on Claude failure. Frontend renders "no AI data" and shows fixed chips. User believes the AI had nothing to say; in fact the AI call failed.
- `/api/field-queries` multiple paths return partial responses on Claude failure rather than surfacing the failure.
- `/api/agent/draft-email` has multiple non-fatal try/catches that swallow individual query failures while continuing (03-API-ROUTES Known Issues). The final email is drafted against incomplete context with no indication to the caller.
- `/api/analyze` collapses non-429 Claude errors into a generic message. Rate-limit, auth, and model errors are indistinguishable to the caller.

**Net production-readiness posture:** this is not a product that can take real customers as-is. Nothing enforces data isolation, nothing caps AI spend, nothing authenticates users, nothing surfaces silent failures. It is — correctly, for its purpose — a demo. But the gap between "works as a demo" and "safe with real customer data" is larger than a checklist of auth + RLS + rate limits. Several data paths are designed around trust boundaries that don't exist; several silent-catch paths hide failures specifically so the demo feels smooth. Making it production-safe is not a hardening pass; it's a rewrite of several specific paths to accommodate boundaries they don't currently know about. DECISIONS.md 2.1, 2.2, 2.11, 2.12, and 2.26 together address the full surface.

**Resolved in v2 by DECISIONS.md 2.1 (auth + RLS Day 1), 2.2 (full hygiene), 2.11 (no trust flags), 2.12 (function calls, not HTTP, for server-to-server).**

---

## 9. UI Architecture Debt

06-UI-STRUCTURE.md audited the web app. The numbers are specific.

**1,019 inline hex colors** across 23 files. Top files: `playbook-client.tsx` 208, `observation-input.tsx` 188, `deal-detail-client.tsx` 145, `intelligence-client.tsx` 102, `activity-feed.tsx` 91. Two corals (`#D4735E` and `#E07A5F`) have already drifted — CLAUDE.md documents both as "brand accent coral." Any rebrand is a find-replace plus manual inspection. Any new color needs a decision about where to add it.

**113 DM Sans declarations across 19 files; DM Sans never loads.** Tailwind config declares `Inter`. `globals.css:1` loads Inter from Google Fonts. Inline styles ask for `'DM Sans', sans-serif`. The browser falls back to generic sans-serif everywhere. The entire product renders in a font it doesn't think it's in.

**10 unused production dependencies.** `@radix-ui/react-avatar`, `-dialog`, `-dropdown-menu`, `-popover`, `-select`, `-separator`, `-slot`, `-tabs`, `-tooltip`, `@tremor/react`. Declared in `package.json`, imported by nothing. Every modal, dropdown, and dialog in the product is hand-built with `<div>` + inline styles.

**Five 1,500+ LOC client component files.**
- `BookClient` 2,543 LOC
- `DealDetailClient` 2,463 LOC
- `PlaybookClient` 2,429 LOC
- `DealFitnessClient` 2,197 LOC
- `IntelligenceClient` 1,575 LOC
- Plus the shared `ObservationInput` at 2,130 LOC

DECISIONS.md 2.22 hard-caps client files at 400 LOC. Every one of these is 4–6x over the cap.

**12 pages reachable only by URL.** Sidebar has 5 links (Pipeline, My Book, Intelligence, Playbook, Deal Fitness). The other 12 — `agent-admin`, `agent-config`, `analytics`, `analyze`, `calls`, `command-center`, `observations`, `outreach`, `pipeline/[id]`, `prospects`, `team`, landing `/` — are reachable only via URL typing or internal redirects.

**No `components/ui/` directory.** CLAUDE.md claims shadcn/ui. 06-UI-STRUCTURE §4 confirmed via filesystem check: "returns no output." Zero shadcn primitives exist in the repo.

**Chip pattern duplicated ~7 times.** No shared `<Chip/>` primitive. Each call-site rebuilds the same chip markup with different inline styles (06-UI-STRUCTURE §4).

**The implication.** The UI is written in a mode where every file is its own framework. A rebrand is not a token change; it's a research-and-replace operation across 23 files with 1,019 decisions to re-validate.

**Per-file framework effect.** Each of the 5 hero client files (`book-client`, `deal-detail-client`, `playbook-client`, `deal-fitness-client`, `intelligence-client`) has its own copy of: chip markup, drawer markup, modal markup, tab-bar markup, card markup, table styling, spacing scale, font-size scale. The same interaction element looks slightly different on different pages. A meeting to align on "what does a chip look like" would produce seven answers.

**Dead imports and ghost deps.** Beyond the 10 unused Radix/Tremor deps, 06-UI-STRUCTURE §5 confirms `observations-client.tsx` (463 LOC) is unreachable. Any find-replace of component patterns must scan files that haven't been touched in months and components that aren't loaded anywhere. High-friction edit surface.

**Resolved in v2 by DECISIONS.md 2.22 (design tokens, no inline styling, client files ≤400 LOC, declarative route registry, one UI primitive library, fonts actually load), DECISIONS.md 3.1 (fresh design system in a separate track), Guardrails 34–38.**

---

## 10. Cost and Scaling Forecast

Speculative but grounded in the code.

**Per-transcript Claude cost.** The pipeline makes 6–7 Claude calls per transcript at model `claude-sonnet-4-20250514`: extract actions (#19, max_tokens 4096), score MEDDPICC (#20, max_tokens 4096), detect signals (#21, max_tokens 4096), synthesize learnings (#22, max_tokens 4096), check experiments (#23, max_tokens ~2000), draft email (#24, max_tokens 4096), plus deal fitness analysis (#15, max_tokens 16000) after pipeline. Context windows are 2k–10k tokens each. Rough estimate: 40–80k input tokens + 20–40k output tokens per transcript. At Sonnet list pricing ($3/1M input, $15/1M output), roughly **$0.40–$0.80 per transcript.** At 100 reps × 5 transcripts/day that's 500 transcripts/day — $200–$400/day in Claude spend. At 10x scale (real product), $2k–$4k/day.

**Context over-fetching.** Many of the 8 intelligence layers in call prep query broader data than they consume. `/api/book` fetches ALL customer messages and filters in code (03-API-ROUTES `/api/book` Known Issues). `/api/customer/response-kit` fetches all knowledge articles before filtering. `/api/intelligence` returns ALL observations with no pagination. These are cheap in demo (low row counts) and expensive under realistic data shapes. Cost per call scales quadratically as the database grows, which is the wrong scaling curve.

**Where it breaks first at 100 concurrent reps.** (a) **Claude rate limits,** since every invocation constructs a new `Anthropic` client (no shared singleton, 03-API-ROUTES universal conventions) — no request deduplication, no batching. Rate limit per-key applies; 100 reps hitting classify + follow-up simultaneously would hit throughput limits. (b) **Rivet Cloud actor spawning,** — one `dealAgent` and one `transcriptPipeline` per deal — every deal spawns two actors. At 100 reps × 50 deals/rep = 5,000 actor instances. Rivet Cloud pricing scales with this; 5,000 actors doing nothing (per §3.1) would still cost. Moot once Rivet is removed (2.6). (c) **Field queries max_duration of 30s with up to 10 Claude calls.** Will time out under any load. (d) **`/api/observations` max_duration of 30s with up to 4 Claude calls.** Same timeout risk. (e) **No database connection pooling visible.** Postgres connections per invocation, no pooler mentioned. At 100 concurrent reps, Postgres connection exhaustion is plausible. (f) **N+1 queries in call prep.** 03-API-ROUTES `/api/agent/call-prep` Known Issues: "N+1 pattern in stakeholder engagement loop (line 384) — runs one `COUNT(*)` per key contact." At 100 reps × 5 contacts/deal × call-prep-per-hour, this is Postgres-bound.

**Internal-fetch hop multiplication.** 03-API-ROUTES "Notable cross-route risks": the pipeline actor internally fetches `/api/deals/[id]/meddpicc-update`, `/api/observations`, `/api/playbook/ideas/[id]`, `/api/deal-agent-state`, `/api/agent/call-prep`. The coordinator fetches `/api/intelligence/persist-pattern`. Call prep fetches `/api/deal-agent-state`. MCP fetches `/api/agent/call-prep`. Every hop is a full HTTPS roundtrip with a cold-start exposure in production. At 100 reps running pipelines simultaneously, serverless function concurrency and cold-start latency compound. **Resolved in v2 by DECISIONS.md 2.12** (server-to-server work uses function calls, not HTTP).

**HubSpot free tier API budget — irrelevant.** 07C-HUBSPOT-SETUP §7: "Rate limits identical to Free (100/10s burst, 250k/day)." Read estimate ~20 API calls/session at 80% cache hit. Write ~10–15/session. Demo cadence fits comfortably. Full reset is tight unbatched (170 calls over 20s exceeds burst) but batched to ~10 calls via HubSpot's batch create endpoints. Adequate for v2.

**Rivet Cloud monthly cost.** Whatever it is today, it becomes $0 in v2.

---

## 11. What CLAUDE.md Gets Wrong

CLAUDE.md is the first file Claude Code reads every session. It is badly out of date.

- **Tables: 33. Actual: 37.** The inventory header box says 33 (01-INVENTORY.md Section 3 discrepancies).
- **API routes: 32 in the table / 29 in the narrative. Actual: 41.** (01-INVENTORY Section 4.)
- **Dashboard pages: 14. Actual: 16 (+ root landing = 17).** Missed `agent-admin` and `observations` (redirects).
- **`demo-guide.tsx` referenced but doesn't exist.** §3.13 above.
- **`shadcn/ui` referenced with no `components/ui/` directory.** §9 above; 06-UI-STRUCTURE §4.
- **"Enter Demo = Reset" claim is stale.** 03-API-ROUTES `/api/demo/reset` Known Issues: "The landing page at `apps/web/src/app/page.tsx` has no reference to `/api/demo/reset` — the only caller is the `AdminReset` component mounted in the dashboard layout, triggered by a custom event from the sidebar."
- **"Pipeline described as 9 steps; actually 11 steps with no-ops."** CLAUDE.md lists 11 actual pipeline steps; described narrative is loose.
- **Three pillars as described vs. as implemented.** "Persistent Deal Agents" is §3.1. "Smart Interventions" is §3.4. "Cross-Deal Intelligence" is §3.2. All three marketed pillars have structural gaps between marketing and implementation.
- **"Coordinator synthesis prompt" described as working.** Prompt #25 is `system: ""` — §3.9.
- **`healthScore` referenced; no column exists.** 07-DATA-FLOWS Flow 7 Known Issue #2: "No health score exists… has no Supabase column, no compute logic, no trigger."

**Additional specific drift items:**
- CLAUDE.md describes a 10-step guided demo checklist (S13 notes). The component doesn't exist; the checklist doesn't render anywhere.
- CLAUDE.md says "NEXUS Intelligence Coordinator detects patterns" with specific phrasing around how synthesis works. Prompt #25 is `system: ""`; the narrative around coordinator quality is aspirational.
- CLAUDE.md's "Pipeline Hardening" Session S13 summary claims parallelized steps that reliably complete. The actual code has explicit graceful-degradation wrappers around steps 7 and 10 documenting that they timeout on production (`transcript-pipeline.ts:806-808`).
- CLAUDE.md inventory: "3 Rivet actors: dealAgent, transcriptPipeline, intelligenceCoordinator." One of the three (dealAgent) has empty state and no-op actions.

Why this matters: every new Claude Code session starts from this map. Extractions 01–08 (and this critique) are the corrective. Codex reads these, not CLAUDE.md. DECISIONS.md 2.23 (dead code discipline) applies transitively to documentation — the first Codex task after planning is to rewrite CLAUDE.md against actual code.

---

## 12. The Demo Paradox

Current Nexus works because the seed data is carefully shaped to hit the code's happy paths. MedVista is 3,500 words long and mentions Microsoft DAX Copilot specifically because that substring matches the coordinator's competitor regex and lets the same-competitor-same-vertical pattern fire against NordicMed. The intervention fires because the company name contains "NordicMed." The close analysis is shallow but looks adequate against single seeded loss reasons. The call prep looks intelligent because the 8 intelligence layers are queryable against seeded system_intelligence, seeded manager_directives, seeded playbook_ideas, seeded cross_agent_feedback — all aligned to the narrative.

Real customers producing real data would expose the gaps on day one. The coordinator would not fire because real competitors aren't named in every transcript. The intervention would never trigger because no real deal is named "NordicMed." The close analysis would produce generic hypotheses because there is no accumulated deal theory to draw on. The call prep would be shallow because the coordinator patterns never reach it. The third marketed pillar ("Proactive Interventions") would fail silently because health scores don't exist. The pipeline would silently partial-fail because drafting emails and auto-call-prep timeout on real transcripts (already documented in code comments as the reason they were moved out of the pipeline).

Current Nexus is not a product that happens to demo well. It is a demo that happens to have a database underneath.

**Specific failures under realistic data:**
- Coordinator cross-deal pattern: requires 2+ deals in same vertical with same signal type and same competitor name substring. Real transcripts rarely name competitors by exact string. Miss rate near 100%.
- Intervention fires on `deal.name.includes("nordicmed")`. Real deals have real names. Fire rate: 0%.
- Close analysis depth is bounded by context. Real deals accumulate hundreds of emails, dozens of calls, implicit stakeholder maps. Current prompt #14 sees activity *summaries* not transcripts, and no accumulated theory. Hypotheses would be generic: "pricing was a concern; stakeholder alignment was weak." The VP-grade bar in DECISIONS.md 1.1 is unreachable without architectural change.
- Call prep's 8 intelligence layers rely on seeded `system_intelligence`, `manager_directives`, `playbook_ideas`, and `cross_agent_feedback` rows tuned to MedVista and NordicMed. Real orgs would have none of this until they earned it over time. Cold-start quality would be low for months.
- Pipeline times out on long transcripts (the reason auto-call-prep and draft-email were moved to graceful-degradation). Real calls can run 45–90 minutes. Pipeline partial-failure rate rises with transcript length.
- `preClassified: true` trust flag is load-bearing internally — the pipeline uses it so its signals don't re-classify. The same flag is a vulnerability when exposed externally. Real deployments have to close the door the pipeline relies on staying open.

V2 inverts this. DECISIONS.md 1.9 LOCKED preserves the three-act narrative; DECISIONS.md 1.13 makes deal creation first-class; 1.1 makes close analysis continuous; 1.14 makes interventions data-driven; 2.17 wires the coordinator into call prep authoritatively; 2.21 applies applicability gates across every surface. Demo data in v2 rides on top of correctness — "we can seed a realistic dataset and the product works" — instead of the correctness riding on top of the seed data.

That inversion is the whole point of the rebuild. The demo doesn't have to tell a story the code can't back. The code is built to handle real usage first, and the demo is a realistic slice of that working product. What survives from current Nexus is the narrative arc and the interaction patterns (Framework 21, the three-act demo, MEDDPICC, observation capture). What gets replaced is the scaffolding — the empty Rivet actors, the 1,019 inline colors, the hardcoded company-name checks, the 15 no-op RPCs, the empty coordinator system prompt, the missing deal creation UI. Everything in this critique falls into one of those two buckets.

---

## Cross-reference map

| Section | DECISIONS.md resolution |
|---------|------------------------|
| §3.1 Rivet dismantled | 2.6 Rivet REMOVED; 2.16 event-sourced DealIntelligence |
| §3.2 Coordinator → call-prep broken | 2.17 coordinator is authoritative, call prep queries it |
| §3.3 Close Lost single-pass | 1.1 continuous pre-analysis; 2.16 event-sourced backbone |
| §3.4 AgentIntervention hardcoded | 1.14 data-driven; 2.21 applicability gating |
| §3.5 Deal creation missing | 1.13 first-class via CrmAdapter |
| §3.6 Experiment creation missing | 1.3 POST /api/experiments; 2.21 applicability |
| §3.7 Pipeline step 9 no-ops | 2.6 Rivet removed; 2.24 pipeline simplification |
| §3.8 Brief Ready browser-dependent | 2.6 jobs table + worker + pg_cron |
| §3.9 Coordinator system empty | 04C rewrite #4 |
| §3.10 Agent config auto-mutates | Guardrail #43 proposals not direct writes |
| §3.11 Stage audit bypass | 2.10 single write-path per domain |
| §3.12 preClassified trust flag | 2.11 no client-controlled trust flags; 2.12 function calls |
| §3.13 demo-guide.tsx missing | 2.23 dead code discipline |
| §4 Fragility | 2.2 hygiene; 2.9 maxDuration policy; 2.13 unified Claude |
| §5 Incidental complexity | Covered across 2.2 / 2.6 / 2.13 / 2.22 / 2.23 / 2.25 |
| §6 Prompt debt | 2.13 unified layer; 2.14 resolved via 04C #4; all 8 rewrites in 04C |
| §7 Context gaps | 2.16 DealIntelligence; 2.17 coordinator wiring; 2.21 applicability |
| §8 Security | 2.1 auth + RLS Day 1; 2.2 hygiene; 2.11 no trust flags |
| §9 UI debt | 2.22 tokens/caps/registry/primitives/fonts; 3.1 design system |
| §10 Cost/scale | 2.6 Rivet removed; 2.13 unified client; 2.18 HubSpot Starter adequate |
| §11 CLAUDE.md drift | 2.23 rewrites CLAUDE.md against actual code at Codex start |
| §12 Demo paradox | 1.9 preserves narrative; 1.1 / 1.13 / 1.14 / 2.17 / 2.21 address specific failure modes |
| Cross-cutting: prompt debt | 2.13 unified Claude integration; 04C 8 rewrites |
| Cross-cutting: UI fragility | 2.22 tokens/caps/primitives; 3.1/3.2 design system collaboration |
| Cross-cutting: auth + RLS | 2.1 Day-1 Supabase Auth + RLS; Guardrail #45 |
| Cross-cutting: event-sourcing | 2.16 deal_events append-only; DealIntelligence service |
| Cross-cutting: surfacing | 1.15–1.18 ambient + digest; 2.26 surfaces registry + admission engine |

## Closing note

The narrative arc of this critique is simple: Nexus is a demo that over-committed on narrative and under-delivered on execution, and DECISIONS.md has already made the architectural calls that fix it. The 12 sections above are not a list of complaints; they are the evidence base for why v2 is structured the way it's structured. Every LOCKED decision in DECISIONS.md has one or more specific citations here that justify it. Every "PENDING" decision was resolved before this document was written — there are no open questions between diagnosis and plan.

This is the last document before the rebuild plan. Prompt 10 reads this to understand why; Codex reads the rebuild plan to know what. The two together are the contract.

Three things are worth naming explicitly, one last time:

**The coordinator → call-prep broken edge is the highest-leverage single fix in current Nexus.** A few lines of code would wire it. The entire Act 2 demo beat would start working. The reason v2 takes a different approach (query the coordinator table directly, via DealIntelligence) is not that the small fix wouldn't work — it's that the architecture that would need the small fix (Rivet actor addCoordinatedIntel handshake) is being removed anyway. Fixing it in place would mean fixing something that's getting deleted.

**The Rivet dismantled-in-place is the most diagnostic thing in the entire codebase.** Every other pattern in current Nexus — the scaffolding scripts, the Supabase mirror tables, the browser-polling workarounds, the 15 no-op RPCs — traces back to the team's prior realization that the actor runtime wasn't the right tool and the subsequent half-migration. The empty `state: {}` at `deal-agent.ts:101` is not a bug; it is the team's honest assessment of what Rivet is doing for Nexus, encoded in code. v2 completes what the team already started.

**The three marketed pillars are a forecast of what v2 delivers, not a description of what current Nexus delivers.** "Persistent Deal Agents" is the event-sourced DealIntelligence service in DECISIONS.md 2.16. "Cross-Deal Intelligence" is the coordinator architecture in 2.17. "Proactive Interventions" is the data-driven surfacing in 1.14 + 2.21 + 2.26. None of them work in current Nexus as the marketing describes; all of them are designed-for in v2. The pillars are the right pillars — they just haven't been built yet.

End of 09-CRITIQUE.

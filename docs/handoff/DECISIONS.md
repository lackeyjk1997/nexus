# Nexus Rebuild — Decisions Log

**Purpose:** Single source of truth for product and architectural decisions made during the Nexus → Codex rebuild planning. Both Claude (planning chat) and Claude Code (extraction sessions) read this file for context.

**Status key:**
- **LOCKED** — decision made, do not relitigate
- **OPEN** — identified as a decision Jeff needs to make; Claude should prompt him when relevant
- **PENDING INPUT** — Claude has a recommendation; awaiting Jeff's call
- **DEFERRED** — decision explicitly punted until later phase

**How to use this file:**
- Claude Code: read this at the start of every session after reading CLAUDE.md. When generating the critique (09) and rebuild plan (10), treat LOCKED decisions as constraints and PENDING items as Jeff's call to make. Surface OPEN items to Jeff before picking defaults.
- Jeff: update this file (or ask Claude to update it) whenever a new decision is made. Commit to `docs/handoff/DECISIONS.md` so Claude Code sees the latest version on every new session.

---

## Part 1 — Product Vision Decisions

### 1.1 Closed-Lost Analysis (LOCKED)

**Experience:**
- Sarah clicks "Close Lost" → loading state while AI analyzes in background
- AI reads every signal: oDeal gaps, MEDDPICC gaps, timeline, promises made/kept, stakeholder engagement, deal size, stage velocity, transcript content, email patterns
- AI produces a strategic-VP-of-Sales-grade hypothesis — an argument with depth, not a summary
- **Sarah sees the hypothesis first.** She reacts to the AI's argument, not a blank form.
- System asks pointed questions dynamically generated from the hypothesis
- Always-present open-ended question: "In your own words, why do you think we lost this?"
- Reconciliation between AI hypothesis and Sarah's response is stored as its own data — this is the learning signal
- Close-lost analysis page shows hypothesis, responses, reconciliation, and cross-deal comparisons

**Architecture:**
- Continuous pre-analysis on every transcript and email (lightweight Claude call updates a rolling "deal theory")
- Close Lost triggers a final deep pass that reads the deal theory + everything else
- Cost is not a constraint. Build the heavy version.
- **Current Nexus does NOT meet this spec** (Prompt 7 finding). Close capture today is a single-pass LLM call with no prior deal theory. v2 must implement the continuous pre-analysis path.

**Taxonomy (four overlapping dimensions):**
- Loss reason, Objection, Friction, Gap — each seeded at launch with reasonable values.
- When hypotheses surface uncategorized reasons, flag as candidates.
- If 3+ deals accumulate similar uncategorized reasons, surface to Jeff/Marcus: "This looks like a new pattern — name it?" Humans promote.
- **Current Nexus has hardcoded taxonomy in `StageChangeModal`** (Prompt 7 finding). No candidate-category promotion logic exists. v2 builds this.

**Hypothesis validation requirement:** Close-lost hypotheses must be verified against the event stream before surfacing (see 2.21).

### 1.2 Research-Interview Pattern (LOCKED)

Every capture moment uses the same pattern: AI reads full context → generates an argument → asks user to react to it. Not forms.

Applies to: close-lost capture, observation capture, call prep feedback, any future capture surface.

### 1.3 Experiments — What Exists vs. What's Missing (LOCKED)

**Preserve (already built):**
- Observation → experiment proposal UI flow (via app or Nexus MCP)
- Marcus-approved experiment lifecycle UI
- Rep assignment
- Active experiments surface in call prep for assigned reps

**Build (missing or broken):**
- **POST /api/experiments route** — Prompt 7 finding: the PlaybookClient has proposal UI but no backend endpoint. v2 ships this as a first-class route through a service function (per 2.10).
- **Attribution** on transcripts and emails (open-loop today).
- **Applicability gating** (see 2.21).

### 1.4 Three Categories of Experiments (LOCKED)

1. **In-conversation behaviors.** Attribution at transcript processing time.
2. **Out-of-conversation actions.** Attribution at email/activity event time.
3. **Implicit/approach experiments.** Rubric-based scoring with visible confidence.

All three carry explicit applicability rules (see 2.21).

### 1.5 Experiment Lifecycle and Mode (LOCKED)

- Lifecycle: `proposed → active → graduated` or `killed`. Evidence thresholds on transitions.
- Soft mode only.

### 1.6 Experiment Proposal Paths (LOCKED)

- Leadership/Enablement → runs immediately
- AE proposes → Marcus approves → runs
- AI (intelligence coordinator) proposes → surfaces to Enablement

### 1.7 oDeal vs. Experiments (LOCKED)

- Separate in UI, unified in data model and analysis pipeline.
- One analysis pass per touchpoint emits signals for both.

### 1.8 Out of Scope for Rebuild (LOCKED)

- Role-based surfacing
- User permissions / multi-tenancy
- Real authentication (see 2.1)
- Guided tour

### 1.9 Features Preserved from Current Nexus (LOCKED)

- Pipeline (reads from HubSpot via adapter)
- Deal details with MEDDPICC tabs (with new edit UI — see 1.13)
- Stakeholder maps
- Activity feeds
- Transcript analyzer pipeline (re-architected, fewer steps)
- Agent configuration
- Observation system
- Intelligence dashboard
- Playbook / experiments UI
- Call prep generation
- Follow-up email drafting
- Agent memory / per-deal intelligence (event-sourced per 2.16)
- Agent interventions — now data-driven via applicability gating, NOT hardcoded deal-name checks (Prompt 7 finding)
- 14-person demo org + support personas
- Vertical-specific demo data
- Framework 21 interaction patterns
- Three-act demo narrative

### 1.10 Candidate Dead-Code Routes (LOCKED)

Zero grep-findable callers per Prompt 3:
- `/api/activities`, `/api/team-members`, `/api/observation-routing`, `/api/observations/clusters`, `/api/demo/prep-deal`

### 1.11 Future State Capabilities — Designed-For, Not Built-For (LOCKED)

1. Deal simulation
2. Rep coaching replay
3. Proactive outreach prioritization
4. Real-time competitive intelligence
5. Cross-account intelligence (via `people` table)
6. Automatic playbook generation
7. Defensible forecasting
8. Experiment evidence compounding

### 1.12 Dead Pages and Placeholder Routes (LOCKED)

Per Prompt 6 findings, cut from v2: `observations-client.tsx`, `/agent-admin`, `/team`. v2 nav is a declarative registry; commented-out entries not allowed.

### 1.13 Deal Creation as a First-Class Feature (LOCKED — from Prompt 7 findings)

Current Nexus has no `POST /api/deals` route. Every deal comes from seed scripts.

**v2 requirements:**
- Deal creation is a first-class UI surface in Nexus (not a CRM page).
- When a user creates a deal in Nexus, the adapter layer creates it in HubSpot AND initializes the Nexus intelligence shell (the first few `deal_events` — `DealCreated`, `StageSet`, etc.).
- Create flow asks enough up-front to seed useful intelligence: name, amount, stage, close date, primary contact, company. Everything else can be filled in later.
- MEDDPICC edit UI also ships in v2 — current Nexus has none. Users can mark M/E/D/D/P/I/C/C dimensions as the deal progresses.

This changes Codex's Phase 2 (Core CRUD) scope — deal creation and MEDDPICC edit are Day-1 features, not future work.

### 1.14 AgentIntervention Must Be Data-Driven (LOCKED — from Prompt 7 findings)

Current `AgentIntervention` component hardcodes `deal.name.includes("nordicmed")` as its trigger. This is the most brittle demo scaffolding in current Nexus.

**v2 requirements:**
- No name-based demo scaffolding in production code.
- Intervention triggers are structured rules (applicability metadata per 2.21).
- Interventions surface via the same `DealIntelligence.getApplicable*()` pipeline as everything else.
- Demo data is shaped so that real triggers fire for real reasons — if NordicMed is supposed to show an intervention, its deal events make it applicable (e.g., champion silence event + overdue close date event).

---

## Part 2 — Architectural Decisions

### 2.1 Authentication Strategy (PENDING INPUT)

**Options:** (A) real auth, (B) persona switching. **Claude's recommendation:** (A).

### 2.2 Database Hygiene — Full Migration Scope (PENDING INPUT)

**Options:** (A) full hygiene pass, (B) targeted pass. **Claude's recommendation:** (A).

### 2.3 Observation → Deal Relationship (PENDING INPUT)

**Options:** (A) many-to-many join table, (B) one-to-one. **Claude's recommendation:** (A).

### 2.4 Column Naming Conventions (LOCKED)

- `observations.observer_id`, `raw_input`, `ai_classification`, `linked_deal_ids uuid[]`
- Routes use camelCase equivalents.

### 2.5 Surfacing Strategy — Two-Part Problem (PARTIALLY RESOLVED)

**Part A (applicability): RESOLVED via 2.21.**
**Part B (prioritization/frequency): OPEN, queued for conversation after Prompt 8.**

### 2.6 Infrastructure / Long-Running Workflows (RESOLVED)

Rivet is REMOVED. New stack: Postgres `jobs` table + Next.js worker + `pg_cron` + Supabase Realtime.

### 2.7 Prompt Preservation (LOCKED)

Prompts preserved verbatim except those rewritten in `04C-PROMPT-REWRITES.md`.

### 2.8 Context Assembly Audit — New Prompt (LOCKED)

Prompt 7.5 runs after Prompt 7.

### 2.9 Timeout / maxDuration Policy (LOCKED)

Every route declares `maxDuration` explicitly.

### 2.10 Single Write-Path per Domain Concept (LOCKED)

Any domain concept with 2+ write sites goes through a service function.

### 2.11 No Trust Flags on User Input (LOCKED)

No client-controlled flags gate server-side trust decisions.

### 2.12 Server-to-Server Work Uses Function Calls, Not HTTP (LOCKED)

Shared logic lives in `services/`.

### 2.13 Unified Claude Integration Layer (LOCKED)

One Claude client wrapper. Structured outputs via tool use. Explicit per-call temperature. One formatter module. Single signal-type enum. One transcript preprocessing pass. One email-drafting service. Prompts as `.md` files.

### 2.14 Coordinator Synthesis Prompt Anomaly (OPEN)

Prompt #25 uses `system: ""`. Flagged for Prompt 4.5a/b.

### 2.15 Prompt Analysis Phase (LOCKED)

Four sessions after Prompt 7.5: 4.5a, 4.5b, 4.6, 4.7.

### 2.16 Intelligence Service Architecture (LOCKED)

Event-sourced state in `deal_events` (append-only). Snapshots in `deal_snapshots`. `DealIntelligence` service is the only interface. No actors, no daemons.

### 2.17 Coordinator Architecture (LOCKED)

Scheduled (pg_cron) + on-demand (called by call-prep and close-lost). Same code path. Call prep MUST query the coordinator.

**Prompt 7 follow-up:** Current Nexus coordinator writes to `coordinator_patterns` but call-prep reads from `dealAgentStates.coordinatedIntel` (which is never written). In v2, `coordinator_patterns` is the authoritative table. Call prep queries it directly. The misalignment disappears because the two-table pattern disappears.

### 2.18 CRM Strategy — HubSpot Hybrid (LOCKED)

HubSpot = data backend nobody logs into. Nexus = the UI users experience. Adapter pattern mandatory.

### 2.19 Data Boundary (LOCKED)

**HubSpot:** deals, contacts, companies, native activities, stages, pipelines.
**Nexus:** `deal_events`, `deal_snapshots`, `observations`, `coordinator_patterns`, `experiments`, `transcripts`, `meddpicc_scores`, `people` table, rep accounts.
**Split:** stakeholders (identity in HubSpot, engagement analysis in Nexus events).
**Sync:** HubSpot → Nexus via webhooks + periodic sync. Nexus → HubSpot write-back only for AI custom properties.

### 2.20 New Extraction Prompts for HubSpot Planning (LOCKED)

- Prompt 7.6 — CRM Data Boundary Mapping
- Prompt 7.7 — HubSpot Property and Integration Design

### 2.21 Deal-Context Applicability Gating (LOCKED)

Every surface passes three gates: stage applicability, temporal applicability, precondition applicability.

Experiments (and patterns, flags) carry structured `applicability` JSONB. `DealIntelligence` service exposes `getApplicable*()` methods. Every surfacing path runs through the gate. Close-lost hypotheses verified against event stream.

### 2.22 UI Architecture for v2 (LOCKED)

(a) Design tokens, never inline hex/font/background.
(b) Client component files hard-capped at ~400 LOC.
(c) Declarative route registry, no hardcoded nav, no commented-out entries.
(d) One UI primitive library; no hand-built modals/dropdowns/chips when a primitive exists; no dead UI dependencies.
(e) Fonts referenced in code are loaded; no silent fallbacks.

### 2.23 Dead Code Discipline (LOCKED)

Zero-importer components, redirect-only shells, "Coming Soon" placeholders do not ship in v2.

### 2.24 Pipeline Simplification — No "Backward Compat" Steps (LOCKED — from Prompt 7 findings)

Current transcript pipeline has 12 steps, including Step 9 which is "~15 no-op RPCs kept for backward compat." This is dead-code theater.

**v2 requirements:**
- Pipeline is expressed as sequential job rows (per 2.6 infrastructure).
- Each step does real work or doesn't exist.
- No "kept for backward compat" placeholder steps.
- Target pipeline: target ~6-8 steps, each with a clear single responsibility (preprocess transcript → extract entities → detect signals → score MEDDPICC → append deal events → synthesize learnings → trigger downstream jobs). Final count falls out of design; the ceiling is "every step earns its keep."

### 2.25 Cross-Flow Debt to Eliminate in v2 (LOCKED — from Prompt 7 findings)

Prompt 7's cross-flow debt section identified:

1. **Activity-type inconsistency** — resolved by 2.10 (single write-path) and migrating `getEffectiveType()` away.
2. **Four copies of fuzzy deal resolution** — consolidated into a single `CrmAdapter.resolveDeal(...)` method (per 2.18).
3. **Config auto-mutation with no approval** — flag for Prompt 4.5/4.6 deep dive. In v2, any AI-driven config mutation is an event-sourced proposal, not a direct write. Humans approve or the system requires explicit autonomy grants.
4. **Coordinator one-missing-write blocker** — eliminated by 2.17 redesign.
5. **No deal creation UX** — addressed by 1.13.
6. **Close-lost short of spec** — addressed by continuous pre-analysis in 1.1.
7. **Brief Ready browser-dependent** — addressed by 2.6 (jobs run server-side, UI subscribes via Supabase Realtime; browser presence not required).

---

## Part 3 — Design System

### 3.1 Visual Rebrand — Anthropic → OpenAI Aesthetic (LOCKED)

Design work in a separate Claude chat. "In the spirit of" OpenAI, not clone. Do NOT copy `#10A37F`.

Deliverable: `docs/handoff/DESIGN-SYSTEM.md`. Timing: between Codex Phase 1 and Phase 2.

### 3.2 Ongoing Design Collaboration During Build (LOCKED)

**Mode 1 (upfront foundation):** `DESIGN-SYSTEM.md` with tokens, primitives, Framework 21 re-skinned.

**Mode 2 (per-feature sessions):** Claude designs hero pages in full artifacts before Codex implements. Pages include: close-lost analysis, intelligence dashboard, call prep brief rendering, observation capture, deal detail, close-lost comparison views.

Handoff: Mode 1 output → `DESIGN-SYSTEM.md`. Mode 2 output → `docs/design/<page-name>.md` + artifact. Codex reads both, doesn't improvise.

---

## Part 4 — Remaining Conversations Required

1. Surfacing prioritization / frequency (Part B of 2.5) — after Prompt 8.
2. Resolve 2.1, 2.2, 2.3 PENDING items — same conversation.

---

## Part 5 — Updated Claude Code Prompt Sequence

- ✅ Prompt 0 — Setup
- ✅ Prompt 1 — Inventory
- ✅ Prompt 2 — Schema
- ✅ Prompt 3 — API Routes
- ✅ Prompt 4 — Prompt Registry
- ✅ Prompt 5 — Rivet Actors
- ✅ Prompt 6 — UI Structure
- ✅ Prompt 7 — Data Flows
- ⏳ Prompt 7.5 — Context Assembly Audit (next)
- Prompt 4.5a — Prompt Quality Audit (prompts 1-13)
- Prompt 4.5b — Prompt Quality Audit (prompts 14-25)
- Prompt 4.6 — Prompt Dependency Graph
- Prompt 4.7 — Prompt Rewrites + Principles
- Prompt 7.6 — CRM Data Boundary Mapping
- Prompt 7.7 — HubSpot Property and Integration Design
- Prompt 8 — Source Copy
- **[Planning chat: Surfacing Part B + resolve 2.1/2.2/2.3]**
- Prompt 9 — Critique
- Prompt 10 — Rebuild Plan
- Prompt 11 — Final Packaging

---

## Part 6 — Guardrails for Codex

1. Prompts from 04-PROMPTS.md are preserved verbatim except those rewritten in 04C-PROMPT-REWRITES.md.
2. Schema-first design. No workarounds. Migrate schema before code.
3. Every capture moment is a research interview, not a form.
4. No dual persistence except the explicit HubSpot/Nexus split defined in 2.19.
5. Long-running operations are background jobs. UI polls or subscribes.
6. oDeal and experiments share a data pipeline but present separate UI narratives.
7. Soft-mode experiments only.
8. "Nexus Intelligence" is the voice. Never frame AI outputs as coming from a person.
9. Inline rendering for all AI responses. No toasts for meaningful content.
10. Cost is not a constraint in this phase.
11. `DESIGN-SYSTEM.md` authoritative for visual decisions. `docs/design/<page>.md` authoritative for page-specific design. No improvising visual decisions.
12. Every route declares `maxDuration` explicitly.
13. Any domain concept with 2+ write sites goes through a service function.
14. No client-controlled trust flags.
15. Server-to-server work is a function call, not HTTP.
16. All Claude calls go through the unified client wrapper.
17. Structured outputs use tool use, not JSON-in-text regex parsing.
18. Temperature is set explicitly per call by task type.
19. Prompts live as `.md` files loaded at runtime.
20. One formatter module for currency/dates/names/stages.
21. One transcript preprocessing pass produces the canonical analyzed-transcript object.
22. Single source-of-truth enum for signal types.
23. All deal/contact/company data access goes through `CrmAdapter`.
24. Intelligence state is event-sourced. `deal_events` append-only.
25. `DealIntelligence` service is the only interface for intelligence data.
26. Coordinator runs in scheduled + on-demand modes; call prep must query it.
27. `people` table exists from day one.
28. Rivet is removed. Background work is Postgres `jobs` + worker + `pg_cron`.
29. HubSpot cache read-through.
30. Architecture decisions must not preclude any Future State Capability in 1.11.
31. Nothing surfaces without passing the applicability gate (2.21).
32. Applicability rules are structured data (JSONB), never prose.
33. Close-lost hypothesis verified against event stream before surfacing.
34. No inline hex colors, fonts, or backgrounds. All through design tokens.
35. Client component files hard-capped at ~400 LOC.
36. Nav is a declarative route registry. Every shipped page has an entry.
37. UI primitives from ONE library. No hand-built when primitive exists. No dead UI dependencies.
38. Fonts referenced in code must load.
39. Zero-importer components, redirect-only shells, "Coming Soon" pages do not ship.
40. Deal creation + MEDDPICC edit UI are Day-1 features in v2 (1.13).
41. No name-based demo scaffolding. Interventions and triggers are data-driven (1.14).
42. Pipeline steps do real work. No "backward compat" placeholders (2.24).
43. AI-driven config mutations are proposals, not direct writes; humans approve or explicit autonomy grants are required (2.25).

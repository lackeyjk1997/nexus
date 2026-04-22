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
- If 3+ deals accumulate similar uncategorized reasons, surface: "This looks like a new pattern — name it?" Humans promote.
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
- **POST /api/experiments route** — Prompt 7 finding. v2 ships through a service function (per 2.10).
- **Attribution** on transcripts and emails (open-loop today).
- **Applicability gating** (see 2.21).

### 1.4 Three Categories of Experiments (LOCKED)

1. In-conversation behaviors. Attribution at transcript processing time.
2. Out-of-conversation actions. Attribution at email/activity event time.
3. Implicit/approach experiments. Rubric-based scoring with visible confidence.

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
- Multi-tenancy
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
- Agent interventions — data-driven via applicability gating, NOT hardcoded deal-name checks
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

Cut from v2: `observations-client.tsx`, `/agent-admin`, `/team`. v2 nav is a declarative registry.

### 1.13 Deal Creation as a First-Class Feature (LOCKED)

- Deal creation is a first-class UI surface in Nexus
- Adapter creates deal in HubSpot AND initializes Nexus intelligence shell (`DealCreated`, `StageSet` events)
- Create flow captures: name, amount, stage, close date, primary contact, company
- MEDDPICC edit UI ships in v2

### 1.14 AgentIntervention Must Be Data-Driven (LOCKED)

No name-based demo scaffolding. Intervention triggers are structured rules (applicability metadata per 2.21). Surface via `DealIntelligence.getApplicable*()` pipeline.

---

## Part 2 — Architectural Decisions

### 2.1 Authentication Strategy (RESOLVED — Option A)

**Decision:** Real authentication from day one.

**Stack:**
- **Supabase Auth** as the identity provider (email + magic link primarily; Google OAuth optional)
- **RLS policies enforced on every Nexus-owned table** (see 2.2 for table list)
- **User session** binds to a row in `users` table (14-person demo org + any new users added)
- **Rep identity flows to Claude prompts** — `DealIntelligence` operations carry the acting user's ID, and prompts requiring a rep's voice (call prep, email drafting, feedback) receive the rep's name and role
- **Admin role** exists for debug/dev bypass during iteration; never used in demo flows

**What this replaces:** The persona-switching pattern in current Nexus is removed. No more `?persona=sarah` URL params. Each demo persona logs in with their own (seeded) email.

**Rationale:** Codex builds from scratch; retrofitting auth later is always more painful than building it in. Real auth unlocks: real observation attribution, real per-rep call prep feedback loops, real multi-user demo moments (e.g., Sarah reporting an observation that Marcus sees as a manager), and accurate audit trails.

**Day-1 implementation (Phase 1 Day 2):** Supabase Auth wired, RLS stubbed (filled as tables come online), seed script creates auth users for the 14-person demo org with known passwords (or magic-link-redeem flow for a demo).

### 2.2 Database Hygiene — Full Migration Scope (RESOLVED — Option A)

**Decision:** Full hygiene pass in v2. Every debt item from 02-SCHEMA.md findings gets resolved at v2 genesis.

**Scope:**
- **20+ text-shaped enum columns** → proper Postgres enums or lookup tables per column's semantics
- **RLS enabled on every Nexus-owned table** (paired with 2.1). Policies written alongside each table's schema
- **Indexes on every FK** — no FK column unindexed
- **Explicit ON DELETE behavior on every FK** — CASCADE, RESTRICT, or SET NULL chosen per relationship's semantics, never defaulted
- **Heterogeneous FKs split** — `field_queries.initiated_by` and `observation_routing.target_member_id` become two nullable columns (one per target type) with a discriminator, not a single polymorphic column
- **uuid[] arrays → join tables** — `observations.linked_deal_ids[]`, `playbook.*`, `coordinator_patterns.*`, `knowledge_articles.*` all become proper FK join tables (see 2.3 for the observation case specifically)
- **Schema typos corrected** — `readnessFitDetected` → `readinessFitDetected`, and any other misspellings surfaced during migration
- **Dropped tables** (from 07B findings): `agent_actions_log`, `deal_agent_states`, `deal_stage_history` — these are Rivet-era or HubSpot-owned now
- **Migration discipline:** every schema change is a numbered Drizzle migration; no manual DB edits

**Codex execution path:** Phase 1 Day 2 applies the full v2 schema as migrations before any code is written against tables. No "we'll fix the schema later."

### 2.3 Observation → Deal Relationship (RESOLVED — Option A)

**Decision:** Many-to-many via proper `observation_deals` join table.

**Schema:**
```sql
observation_deals (
  observation_id uuid NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES deals_cache(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (observation_id, deal_id)
)
```

**Eliminates:** the `observations.linked_deal_ids uuid[]` array column. Enforcement of deal existence is now at the database level.

**Enables:** the coordinator's core value — cross-deal pattern detection. An observation that touches 3 deals is naturally representable. Queries like "all observations on deal X" and "all deals affected by observation Y" are both trivial.

**Related design:** `DealIntelligence` service queries observations for a deal via the join table. Observation ingestion may write 1+ rows into `observation_deals` based on classifier output (the classifier determines which deal(s) an observation applies to).

### 2.4 Column Naming Conventions (LOCKED)

- `observations.observer_id`, `raw_input`, `ai_classification`, and observation↔deal links via `observation_deals` join table (see 2.3 — the `linked_deal_ids uuid[]` column is gone in v2)
- API routes use camelCase equivalents: `observerId`, `rawInput`, `aiClassification`
- Any observation↔deal relationship references the join table, not an array column

### 2.5 Surfacing Strategy — Two-Part Problem (PARTIALLY RESOLVED)

**Part A (applicability): RESOLVED via 2.21.**
**Part B (prioritization/frequency): ACTIVE CONVERSATION NOW in planning chat.** Once resolved, this section updates to LOCKED.

### 2.6 Infrastructure / Long-Running Workflows (RESOLVED)

Rivet is REMOVED.

New stack: Postgres `jobs` table + Next.js worker + `pg_cron` + Supabase Realtime.

### 2.7 Prompt Preservation (LOCKED)

Prompts preserved verbatim except those rewritten in `04C-PROMPT-REWRITES.md`.

### 2.8 Context Assembly Audit — New Prompt (LOCKED)

Prompt 7.5 ran after Prompt 7. Output: `07A-CONTEXT-AUDIT.md`.

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

### 2.14 Coordinator Synthesis Prompt Anomaly (RESOLVED in 4.7)

Resolved via rewrite #4 (Coordinator Synthesis) in 04C-PROMPT-REWRITES.md — 937-word system prompt replacing the empty one.

### 2.15 Prompt Analysis Phase (COMPLETED)

Four sessions after Prompt 7.5: 4.5a, 4.5b, 4.6, 4.7.

### 2.16 Intelligence Service Architecture (LOCKED)

Event-sourced state in `deal_events` (append-only). Snapshots in `deal_snapshots`. `DealIntelligence` service is the only interface. No actors, no daemons.

### 2.17 Coordinator Architecture (LOCKED)

Scheduled (pg_cron) + on-demand (called by call-prep and close-lost). Same code path. Call prep MUST query the coordinator.

### 2.18 CRM Strategy — HubSpot Starter Customer Platform Hybrid (LOCKED)

**Tier:** HubSpot Starter Customer Platform (paid). $9-15/month per seat.

**Why Starter over Free:** Free tier caps custom properties at 10 total across the account. v2 needs 38. Starter relaxes this; no property consolidation required.

**What's identical to Free-tier plan:** API rate limits (100 req/10s, 250K daily), webhooks, auth, sync architecture.

**What changes:** Custom properties ship as first-class HubSpot fields (no packed-JSON consolidation).

**Architecture invariants:**
- HubSpot = data backend nobody logs into
- Nexus = the UI users experience
- `CrmAdapter` interface mandatory, `HubSpotAdapter` implementation
- Read-through cache for demo resilience

### 2.19 Data Boundary (LOCKED)

**HubSpot:** deals, contacts, companies, native activities, stages, pipelines.
**Nexus:** `deal_events`, `deal_snapshots`, `observations`, `observation_deals` (2.3), `coordinator_patterns`, `experiments`, `transcripts`, `meddpicc_scores`, `people` table, rep/user accounts (2.1).
**Split:** stakeholders (identity in HubSpot, engagement analysis in Nexus events).
**Sync:** HubSpot → Nexus via webhooks + periodic sync. Nexus → HubSpot write-back only for AI custom properties.

### 2.20 New Extraction Prompts for HubSpot Planning (COMPLETED)

07B, 07C, and 7.7 Addendum all complete.

### 2.21 Deal-Context Applicability Gating (LOCKED)

Every surface passes three gates: stage applicability, temporal applicability, precondition applicability.

Structured `applicability` JSONB on experiments, patterns, flags. `DealIntelligence` exposes `getApplicable*()` methods. Every surfacing path runs through the gate. Close-lost hypotheses verified against event stream.

### 2.22 UI Architecture for v2 (LOCKED)

(a) Design tokens, never inline hex/font/background.
(b) Client component files hard-capped at ~400 LOC.
(c) Declarative route registry, no hardcoded nav, no commented-out entries.
(d) One UI primitive library; no hand-built modals/dropdowns/chips when a primitive exists; no dead UI dependencies.
(e) Fonts referenced in code are loaded; no silent fallbacks.

### 2.23 Dead Code Discipline (LOCKED)

Zero-importer components, redirect-only shells, "Coming Soon" placeholders do not ship in v2.

### 2.24 Pipeline Simplification (LOCKED)

No "backward compat" placeholder steps. Pipeline expressed as sequential job rows. Each step does real work. Target ~6-8 steps.

### 2.25 Cross-Flow Debt to Eliminate in v2 (LOCKED)

Activity-type inconsistency, four copies of fuzzy deal resolution, config auto-mutation with no approval (AI-driven config mutations are now proposals, humans approve), coordinator one-missing-write blocker, no deal creation UX, close-lost short of spec, Brief Ready browser-dependent — all addressed by the decisions above.

---

## Part 3 — Design System

### 3.1 Visual Rebrand — Anthropic → OpenAI Aesthetic (LOCKED)

Design work in a separate Claude chat. "In the spirit of" OpenAI, not clone. Do NOT copy `#10A37F`.

Deliverable: `docs/handoff/DESIGN-SYSTEM.md`. Timing: between Codex Phase 1 and Phase 2.

### 3.2 Ongoing Design Collaboration During Build (LOCKED)

**Mode 1 (upfront foundation):** `DESIGN-SYSTEM.md` with tokens, primitives, Framework 21 re-skinned.

**Mode 2 (per-feature sessions):** Claude designs hero pages as full artifacts before Codex implements. Pages: close-lost analysis, intelligence dashboard, call prep brief rendering, observation capture, deal detail.

Handoff: Mode 1 → `DESIGN-SYSTEM.md`. Mode 2 → `docs/design/<page-name>.md` + artifact. Codex reads both, doesn't improvise.

---

## Part 4 — Remaining Conversations Required

1. **Surfacing Part B (2.5)** — ACTIVE NOW in planning chat.

All other PENDING items resolved.

---

## Part 5 — Updated Claude Code Prompt Sequence

- ✅ Prompt 0 through Prompt 7.7 (extraction)
- ✅ Prompt 7.7 Addendum (Starter tier)
- ✅ Prompt 8 (Source Copy)
- ⏳ **[Planning chat: Surfacing Part B — ACTIVE NOW]**
- Prompt 9 — Critique
- Prompt 10 — Rebuild Plan
- Prompt 11 — Final Packaging

---

## Part 6 — Guardrails for Codex

1. Prompts from 04-PROMPTS.md preserved verbatim except those rewritten in 04C-PROMPT-REWRITES.md.
2. Schema-first design. No workarounds. Migrate schema before code.
3. Every capture moment is a research interview, not a form.
4. No dual persistence except the explicit HubSpot/Nexus split defined in 2.19.
5. Long-running operations are background jobs.
6. oDeal and experiments share a data pipeline but present separate UI narratives.
7. Soft-mode experiments only.
8. "Nexus Intelligence" is the voice. Never frame AI outputs as coming from a person.
9. Inline rendering for all AI responses. No toasts for meaningful content.
10. Cost is not a constraint in this phase.
11. `DESIGN-SYSTEM.md` authoritative for visual decisions. `docs/design/<page>.md` authoritative per-page.
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
34. No inline hex colors, fonts, or backgrounds.
35. Client component files hard-capped at ~400 LOC.
36. Nav is a declarative route registry.
37. UI primitives from ONE library. No hand-built when primitive exists.
38. Fonts referenced in code must load.
39. Zero-importer components, redirect-only shells, "Coming Soon" pages do not ship.
40. Deal creation + MEDDPICC edit UI are Day-1 features in v2.
41. No name-based demo scaffolding. Interventions and triggers are data-driven.
42. Pipeline steps do real work. No "backward compat" placeholders.
43. AI-driven config mutations are proposals, not direct writes.
44. HubSpot is on Starter Customer Platform tier. Custom properties ship as first-class HubSpot fields (no packed-JSON consolidation).
45. Real authentication from day one via Supabase Auth + RLS (per 2.1). No persona-switching demo pattern.
46. Full database hygiene pass at v2 genesis: proper enums, indexed FKs, explicit ON DELETE, split heterogeneous FKs, join tables instead of uuid[] arrays (per 2.2).
47. Observation↔deal relationship via `observation_deals` join table (per 2.3). No `linked_deal_ids uuid[]` column in v2.

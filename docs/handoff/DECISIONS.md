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

**Taxonomy (four overlapping dimensions):**
- Loss reason (price, timing, competitor, product gap, champion left, procurement killed it, etc.)
- Objection (security, pricing model, integration, implementation time, etc.)
- Friction (security review, legal redlines, procurement, budget approval, etc.)
- Gap (product feature, compliance cert, reference customer, pricing flexibility, etc.)

Seeded at launch with reasonable values. When hypotheses surface uncategorized reasons, flag as candidates. If 3+ deals accumulate similar uncategorized reasons, surface to Jeff/Marcus: "This looks like a new pattern — name it?" Humans promote.

**Hypothesis validation requirement:** Close-lost hypotheses must be verified against the event stream before surfacing. If the AI hypothesizes "we lost because we didn't send a demo early" but `deal_events` shows a demo was sent, the hypothesis is suppressed or rewritten. See 2.21.

### 1.2 Research-Interview Pattern (LOCKED)

Every capture moment uses the same pattern: AI reads full context → generates an argument → asks user to react to it. Not forms.

Applies to: close-lost capture, observation capture, call prep feedback, any future capture surface.

The product's voice IS this pattern.

### 1.3 Experiments — What Exists vs. What's Missing (LOCKED)

**Preserve (already built):**
- Observation → experiment proposal flow (via app or Nexus MCP)
- Marcus-approved experiment lifecycle
- Rep assignment
- Active experiments surface in call prep for assigned reps

**Build (missing):**
- **Attribution.** When a transcript lands or email sends, analyze whether the rep actually did the experiment behavior. Currently runs open-loop.
- **Applicability gating.** Experiments only surface on deals where they're actually applicable given stage, timing, and preconditions. See 2.21.

### 1.4 Three Categories of Experiments (LOCKED)

1. **In-conversation behaviors** ("mention SOC 2 in discovery"). Attribution: Claude reads transcript + experiment description, returns yes/no/partial with quoted evidence.
2. **Out-of-conversation actions** ("send follow-up email within 24h with security one-pager"). Attribution: detect email event in window with artifact reference.
3. **Implicit/approach experiments** ("lead with discovery, not product pitch"). Attribution: rubric-based scoring with visible confidence.

All three categories carry explicit applicability rules (see 2.21). An experiment is only presented to a rep or tracked against a deal when those rules pass.

### 1.5 Experiment Lifecycle and Mode (LOCKED)

- **Lifecycle:** `proposed → active → graduated` (makes standard playbook) or `killed`. Transitions require evidence thresholds.
- **Mode:** Soft only. Reps see assignment. Non-compliance logged as data, not enforced.

### 1.6 Experiment Proposal Paths (LOCKED)

- Leadership/Enablement → runs immediately
- AE proposes → Marcus approves → runs
- AI (intelligence coordinator) proposes → surfaces to Enablement who decide

### 1.7 oDeal vs. Experiments (LOCKED)

- **Separate in UI** (different user stories: buyer health vs. seller tactic)
- **Unified in data model and analysis pipeline**
- One analysis pass per touchpoint emits signals for both consumers
- Storage separates them because lifecycles differ

### 1.8 Out of Scope for Rebuild (LOCKED)

- Role-based surfacing (Marcus/Lisa/Legal see same data in v1)
- User permissions / multi-tenancy
- Real authentication (see 2.1 open question)
- Guided tour (already deferred in CLAUDE.md)

### 1.9 Features Preserved from Current Nexus (LOCKED)

- Pipeline (kanban/table/forecast) — now reads from HubSpot via adapter (see 2.18)
- Deal details with MEDDPICC tabs
- Stakeholder maps
- Activity feeds
- Transcript analyzer + 9-step pipeline (re-architected, same outcomes)
- Agent configuration
- Observation system (input → classification → clustering → routing)
- Intelligence dashboard (patterns, ARR impact)
- Playbook / experiments UI
- Call prep generation
- Follow-up email drafting
- Agent memory / per-deal accumulated intelligence (now event-sourced, see 2.16)
- Agent interventions (health checks, risk flags)
- 14-person demo org + support personas
- Vertical-specific demo data (Healthcare, FinServ, Tech, Gov, Media)
- Framework 21 conversational UI contract (interaction pattern, NOT color palette — see 3.1)
- Three-act demo narrative

### 1.10 Candidate Dead-Code Routes (LOCKED)

Per Prompt 3 findings, the following routes have zero grep-findable callers in the codebase:
- `/api/activities`
- `/api/team-members`
- `/api/observation-routing`
- `/api/observations/clusters`
- `/api/demo/prep-deal`

Do not rebuild these in v2 unless a consumer is identified.

### 1.11 Future State Capabilities — Designed-For, Not Built-For (LOCKED)

The v2 architecture must be designed so these capabilities are feasible to add later without rewiring core systems. They are NOT scoped for v1 build, but v1 architecture decisions must not close the door on them.

1. **Deal simulation.** Fork a deal's intelligence state, inject hypothetical events, project forward via Claude. Enabled by event-sourced state.
2. **Rep coaching replay.** Replay intelligence object week-by-week for any historical deal. Enabled by event-sourced state with stable timestamps.
3. **Proactive outreach prioritization.** "Which of my 12 open deals should I act on today, and what action?" Enabled by coordinator + intelligence + applicability gating.
4. **Real-time competitive intelligence.** During a live call or session, query coordinator for latest positioning. Enabled by on-demand coordinator mode.
5. **Cross-account intelligence.** Link buyers across deals and companies. Enabled by dedicated `people` table (see 2.19).
6. **Automatic playbook generation.** Synthesize new playbooks from win-pattern analysis across deals. Enabled by consistent signal vocabulary and queryable intelligence.
7. **Defensible forecasting.** Compute forecasts with per-deal reasoning, not just stage-weighted averages. Enabled by event-sourced intelligence and pattern data.
8. **Experiment evidence compounding.** Experiments reference prior learnings via the same intelligence store. Enabled by unified data pipeline.

Codex's rebuild plan should explicitly note these as "designed-for outcomes" and reject architectural choices that preclude them.

---

## Part 2 — Architectural Decisions

### 2.1 Authentication Strategy (PENDING INPUT)

**Options:**
- (A) Real auth from day one (Supabase Auth or Clerk) with RLS enforcement
- (B) Preserve persona-switching demo pattern, skip auth entirely

**Claude's recommendation:** (A).

**Jeff's call needed.**

### 2.2 Database Hygiene — Full Migration Scope (PENDING INPUT)

Per Prompt 2 findings.

**Options:**
- (A) Full hygiene pass in v2
- (B) Targeted pass, only migrate what's actively breaking

**Claude's recommendation:** (A).

**Jeff's call needed.**

### 2.3 Observation → Deal Relationship (PENDING INPUT)

**Options:**
- (A) Many-to-many via proper join table (`observation_deals` with FKs)
- (B) One-to-one (`observations.deal_id uuid`)

**Claude's recommendation:** (A).

**Jeff's call needed.**

### 2.4 Column Naming Conventions (LOCKED)

- `observations.observer_id`, `observations.raw_input`, `observations.ai_classification`, `observations.linked_deal_ids uuid[]`
- API routes use camelCase: `observerId`, `rawInput`, `aiClassification`, `linkedDealIds[]`

### 2.5 Surfacing Strategy — Two-Part Problem (PARTIALLY RESOLVED)

The "surfacing without being overbearing" problem has two parts:

**Part A: Applicability — RESOLVED via 2.21.** What's applicable to surface right now given deal stage, timing, and preconditions? Handled mechanically by the applicability gate.

**Part B: Prioritization and frequency — OPEN, queued for conversation after Prompt 8.** Of the set that IS applicable, what's worth actually surfacing vs. silently accumulating? Thresholds, prioritization, cadence, dismissal semantics, when the system says nothing.

Part A materially simplifies Part B because the candidate set is already filtered.

### 2.6 Infrastructure / Long-Running Workflows (RESOLVED)

Rivet is REMOVED. Current integration has been silently dismantled in place.

**New stack (LOCKED):**
- **Long-running jobs:** Postgres `jobs` table + Next.js worker endpoint. Jobs are rows with `type`, `payload jsonb`, `status`, `attempts`, `run_after`, `completed_at`, `error`.
- **Scheduling:** `pg_cron`.
- **Real-time UI updates:** Supabase Realtime.
- **Durable workflows:** Sequential job rows with `parent_job_id`.

### 2.7 Prompt Preservation (LOCKED)

Prompts from `04-PROMPTS.md` are preserved verbatim EXCEPT those explicitly rewritten in `04C-PROMPT-REWRITES.md`.

### 2.8 Context Assembly Audit — New Prompt (LOCKED)

Prompt 7.5 runs after 07-DATA-FLOWS.

### 2.9 Timeout / maxDuration Policy (LOCKED)

Every route declares `maxDuration` explicitly.

### 2.10 Single Write-Path per Domain Concept (LOCKED)

Any domain concept with 2+ write sites goes through a service function.

### 2.11 No Trust Flags on User Input (LOCKED)

No client-controlled flags gate server-side trust decisions.

### 2.12 Server-to-Server Work Uses Function Calls, Not HTTP (LOCKED)

Shared logic lives in `services/`.

### 2.13 Unified Claude Integration Layer (LOCKED)

- One Claude client wrapper (retry, telemetry, model pinning, error classification)
- Structured outputs via tool use
- Temperature set explicitly per task type
- One formatter module
- Single source-of-truth enum for signal types
- One transcript preprocessing pass
- One email-drafting service
- Prompts as `.md` files in `prompts/` directory

### 2.14 Coordinator Synthesis Prompt Anomaly (OPEN)

Prompt #25 uses `system: ""`. Flagged for deep dive in Prompt 4.5a/b. Strong candidate for full system-prompt redesign in Prompt 4.7.

### 2.15 Prompt Analysis Phase (LOCKED)

Four sessions inserted after Prompt 7.5: 4.5a, 4.5b, 4.6, 4.7.

### 2.16 Intelligence Service Architecture (LOCKED)

Stateless service backed by event-sourced storage.

1. **Event-sourced state.** `deal_events` table. Append-only. Each event: `deal_id`, `event_type`, `payload jsonb`, `source`, `reason`, `created_at`. Deletion is soft (tombstone events).
2. **Snapshots.** `deal_snapshots` table caches computed state. Current state = latest snapshot + events since snapshot.
3. **DealIntelligence service.** Stateless TypeScript. Methods: `getCurrentState`, `getStateAsOf`, `appendEvent`, `getHealthScore`, `getRiskSignals`, `getCompetitiveContext`, `getStakeholderEngagement`, `getLearnings`, and the applicability methods from 2.21.
4. **Queryable across deals.** `deal_event_signals` view/index for cross-deal queries.
5. **Signals link to people, not just stakeholders.** `person_id` where relevant (see 2.19).
6. **No actors, no daemons.** Service loads from Postgres per call; snapshots keep it fast.
7. **Snapshots are diagnostic.** Debug UI can inspect.
8. **Stable interface.** Callers use service methods. Never direct table access.

### 2.17 Coordinator Architecture (LOCKED)

**Mode 1 — Scheduled:** pg_cron triggered; queries recent events; synthesizes via Claude; writes to `coordinator_patterns`.

**Mode 2 — On-demand:** invoked by call prep and close-lost; queries cached patterns + runs targeted synthesis for this deal; returns top N; read-only.

Call prep MUST query the coordinator. Zero results is a valid return, not an error. Coordinator patterns carry provenance (contributing event IDs and deal IDs).

### 2.18 CRM Strategy — HubSpot Hybrid (LOCKED)

HubSpot free CRM = system of record for deal/contact/company data. Nexus owns intelligence data in its own Postgres.

**Adapter pattern mandatory.** `CrmAdapter` interface; `HubSpotAdapter` is v1 implementation. No HubSpot-specific code outside the adapter.

**Failure mode:** read-through cache on adapter layer. Nexus continues to demo against cached data if HubSpot is unavailable.

### 2.19 Data Boundary (LOCKED)

**HubSpot:** deals, contacts, companies, native CRM activities, stages, pipelines.

**Nexus:** `deal_events`, `deal_snapshots`, `observations`, `coordinator_patterns`, `experiments`, `transcripts`, `meddpicc_scores`, oDeal fitness, `people` table, rep accounts, clusters, classifications, interventions.

**Split:** stakeholders (identity → HubSpot contacts; engagement analysis → Nexus `deal_events` keyed by HubSpot contact id). Basic deal metadata cached in Nexus; source of truth HubSpot.

**Sync:** HubSpot → Nexus one-way via webhooks + periodic full sync. Nexus → HubSpot write-back only for specific AI values as custom properties. HubSpot wins CRM fields; Nexus wins Nexus fields.

### 2.20 New Extraction Prompts for HubSpot Planning (LOCKED)

- **Prompt 7.6** — CRM Data Boundary Mapping. Output: `07B-CRM-BOUNDARY.md`.
- **Prompt 7.7** — HubSpot Property and Integration Design. Output: `07C-HUBSPOT-SETUP.md`.

### 2.21 Deal-Context Applicability Gating (LOCKED)

Every piece of surfaced intelligence — experiments, recommendations, coordinator patterns, risk flags, intervention cards, call-prep content — must be gated by deal context before surfacing. Without gating, the system fires noise regardless of whether the insight applies to this deal right now.

**The three gates every candidate surface must pass:**

1. **Stage applicability.** Does this surface make sense for deals in this stage? A "send a working demo" experiment is not applicable to a deal in negotiate-and-review. A pattern about "deals losing to Microsoft when CFO isn't engaged by Stage 3" is noise on a deal at Stage 1 with no Microsoft mention.

2. **Temporal applicability.** Is the timing right? "Send a working demo within 3 hours of a discovery call" is relevant only in the 3-hour window after a discovery call event. "Champion silence" is concerning at Stage 5, expected at Stage 1.

3. **Precondition applicability.** Have prerequisite events happened? Have excluded events NOT happened? "Send a demo" is not applicable if a demo has already been sent. "Push on decision criteria" is not applicable if decision criteria are already documented in MEDDPICC.

**Where this is built:**

**(a) Structured applicability on every surfaceable entity.**

For experiments, a required `applicability` JSONB column with a defined schema:
- `applicable_stages: string[]`
- `triggering_event_types: string[]`
- `time_window_after_trigger_hours: number | null`
- `preconditions: { event_types_required: string[]; event_types_excluded: string[] }`

Coordinator patterns, risk flags, and intervention definitions carry equivalent applicability metadata appropriate to their type.

Applicability rules are structured data, never prose buried in a description. Claude Code and Codex both enforce: no experiment or pattern ships without structured applicability.

**(b) Applicability engine in DealIntelligence service.**

The `DealIntelligence` service (see 2.16) exposes:
- `getApplicableExperiments(dealId, candidateExperiments[]): Experiment[]`
- `getApplicablePatterns(dealId, candidatePatterns[]): Pattern[]`
- `getApplicableRiskFlags(dealId, candidateFlags[]): Flag[]`
- `isApplicable(dealId, applicabilityRules): { applicable: boolean, reasons: string[] }`

Because intelligence is event-sourced (2.16), these queries are trivial against `deal_events`. "Was there a discovery call in the last 3 hours?" is one query. "Has a demo been sent?" is another.

**(c) Every surfacing path runs through the gate.**

Call prep, intervention cards, intelligence dashboard sections, observation routing, close-lost hypothesis generation — all ask the applicability engine first. Nothing reads candidate experiments/patterns/flags and surfaces them directly.

**Hypothesis validation (close-lost specifically).** The close-lost analysis also verifies its generated hypotheses against the event stream. If the hypothesis claim is contradicted by events (e.g., "we should have sent a demo earlier" when a demo event exists), the hypothesis is suppressed or the AI is re-prompted.

**Logging.** When a candidate surface is rejected by the gate, the rejection reason is logged. This supports debug UIs and future learning ("did we correctly suppress this? did it turn out to matter?").

---

## Part 3 — Design System

### 3.1 Visual Rebrand — Anthropic → OpenAI Aesthetic (LOCKED)

Current Nexus uses an Anthropic-flavored palette. Rebuild moves away from Anthropic brand cues.

Design work happens in a separate Claude chat. Aesthetic direction: "in the spirit of" OpenAI's visual language without cloning ChatGPT. Do NOT copy `#10A37F`.

Deliverable: `docs/handoff/DESIGN-SYSTEM.md`. Timing: between Codex Phase 1 (foundation) and Phase 2 (UI work).

Preserve Framework 21 interaction patterns. Change color values, typography, component styling.

---

## Part 4 — Remaining Conversations Required

1. **Surfacing prioritization / frequency (Part B of 2.5)** — to resolve after Prompt 8.
2. **Resolve 2.1, 2.2, 2.3 PENDING items** — can happen in the same conversation.

Design system (3.1) is on a separate timeline.

---

## Part 5 — Updated Claude Code Prompt Sequence

- ✅ Prompt 0 — Setup
- ✅ Prompt 1 — Inventory
- ✅ Prompt 2 — Schema
- ✅ Prompt 3 — API Routes
- ✅ Prompt 4 — Prompt Registry
- ✅ Prompt 5 — Rivet Actors
- ⏳ Prompt 6 — UI Structure
- Prompt 7 — Data Flows
- Prompt 7.5 — Context Assembly Audit
- Prompt 4.5a — Prompt Quality Audit (prompts 1-13)
- Prompt 4.5b — Prompt Quality Audit (prompts 14-25)
- Prompt 4.6 — Prompt Dependency Graph
- Prompt 4.7 — Prompt Rewrites + Principles
- Prompt 7.6 — CRM Data Boundary Mapping
- Prompt 7.7 — HubSpot Property and Integration Design
- Prompt 8 — Source Copy
- **[Planning chat: Surfacing Part B conversation + resolve 2.1/2.2/2.3]**
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
7. Soft-mode experiments only. No enforcement.
8. "Nexus Intelligence" is the voice. Never frame AI outputs as coming from a person.
9. Inline rendering for all AI responses. No toasts for meaningful content.
10. Cost is not a constraint in this phase. Build the heavy version.
11. When `DESIGN-SYSTEM.md` is provided, treat it as authoritative for visual decisions.
12. Every route declares `maxDuration` explicitly.
13. Any domain concept with 2+ write sites goes through a service function.
14. No client-controlled trust flags.
15. Server-to-server work is a function call, not HTTP.
16. All Claude calls go through the unified client wrapper.
17. Structured outputs use tool use, not JSON-in-text regex parsing.
18. Temperature is set explicitly per call by task type; never unset.
19. Prompts live as `.md` files loaded at runtime.
20. One formatter module for currency/dates/names/stages.
21. One transcript preprocessing pass produces the canonical analyzed-transcript object.
22. Single source-of-truth enum for signal types.
23. All deal/contact/company data access goes through `CrmAdapter`.
24. Intelligence state is event-sourced. `deal_events` is append-only.
25. `DealIntelligence` service is the only interface for intelligence data.
26. The coordinator runs in both scheduled and on-demand modes using the same code. Call prep must query it.
27. `people` table exists from day one even if unused in v1.
28. Rivet is removed. Background work is Postgres `jobs` + Next.js worker + `pg_cron`.
29. HubSpot cache read-through. Nexus continues demoing against cached data if HubSpot is unavailable.
30. Architecture decisions must not preclude any of the eight Future State Capabilities in 1.11.
31. Nothing surfaces to a user without passing the applicability gate (2.21). Candidate experiments, patterns, risk flags, and recommendations are always filtered through `DealIntelligence.getApplicable*()` before reaching any surfacing path.
32. Applicability rules on experiments and patterns are structured data (JSONB schema per 2.21), never prose in a description field. Any experiment or pattern shipped without structured applicability is a bug.
33. The close-lost hypothesis generator verifies claims against the event stream before surfacing. Contradicted hypotheses are suppressed or the model is re-prompted. Close-lost never tells Sarah "we should have done X" when events show X was done.

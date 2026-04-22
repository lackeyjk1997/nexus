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

**Hypothesis validation requirement:** Close-lost hypotheses must be verified against the event stream before surfacing (see 2.21).

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

All three categories carry explicit applicability rules (see 2.21).

### 1.5 Experiment Lifecycle and Mode (LOCKED)

- **Lifecycle:** `proposed → active → graduated` or `killed`. Transitions require evidence thresholds.
- **Mode:** Soft only. Non-compliance logged as data, not enforced.

### 1.6 Experiment Proposal Paths (LOCKED)

- Leadership/Enablement → runs immediately
- AE proposes → Marcus approves → runs
- AI (intelligence coordinator) proposes → surfaces to Enablement who decide

### 1.7 oDeal vs. Experiments (LOCKED)

- **Separate in UI** (buyer health vs. seller tactic)
- **Unified in data model and analysis pipeline**
- One analysis pass per touchpoint emits signals for both consumers

### 1.8 Out of Scope for Rebuild (LOCKED)

- Role-based surfacing (Marcus/Lisa/Legal see same data in v1)
- User permissions / multi-tenancy
- Real authentication (see 2.1)
- Guided tour (already deferred)

### 1.9 Features Preserved from Current Nexus (LOCKED)

- Pipeline (kanban/table/forecast) — reads from HubSpot via adapter
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
- Agent memory / per-deal accumulated intelligence (event-sourced, see 2.16)
- Agent interventions (health checks, risk flags)
- 14-person demo org + support personas
- Vertical-specific demo data (Healthcare, FinServ, Tech, Gov, Media)
- Framework 21 conversational UI contract (interaction pattern — not color palette)
- Three-act demo narrative

### 1.10 Candidate Dead-Code Routes (LOCKED)

Zero grep-findable callers per Prompt 3:
- `/api/activities`
- `/api/team-members`
- `/api/observation-routing`
- `/api/observations/clusters`
- `/api/demo/prep-deal`

Do not rebuild unless a consumer surfaces.

### 1.11 Future State Capabilities — Designed-For, Not Built-For (LOCKED)

v2 architecture must not close the door on these. NOT scoped for v1 build.

1. Deal simulation
2. Rep coaching replay
3. Proactive outreach prioritization
4. Real-time competitive intelligence
5. Cross-account intelligence (via `people` table)
6. Automatic playbook generation
7. Defensible forecasting
8. Experiment evidence compounding

### 1.12 Dead Pages and Placeholder Routes (LOCKED)

Per Prompt 6 findings:
- `observations-client.tsx` (463 LOC) has zero importers; the page is a redirect. Cut from v2.
- `/agent-admin` and `/team` are 10-line "Coming Soon" placeholders. Cut from v2 unless an actual feature spec is defined.
- 12 current pages are reachable only by URL (not in sidebar nav): `/analyze`, `/calls`, `/analytics`, `/prospects`, `/team`, `/agent-admin`, `/command-center`, `/outreach`, `/agent-config`, and others. In v2, any page that ships has nav entry + clear product purpose, or it doesn't ship.
- Three sidebar entries in current `sidebar.tsx` are commented out. v2 nav is a declarative registry; commented-out entries are not allowed.

---

## Part 2 — Architectural Decisions

### 2.1 Authentication Strategy (PENDING INPUT)

**Options:** (A) real auth (Supabase Auth or Clerk) with RLS, or (B) persona-switching demo pattern.

**Claude's recommendation:** (A).

**Jeff's call needed.**

### 2.2 Database Hygiene — Full Migration Scope (PENDING INPUT)

**Options:** (A) full hygiene pass, or (B) targeted pass.

**Claude's recommendation:** (A).

**Jeff's call needed.**

### 2.3 Observation → Deal Relationship (PENDING INPUT)

**Options:** (A) many-to-many join table, or (B) one-to-one.

**Claude's recommendation:** (A).

**Jeff's call needed.**

### 2.4 Column Naming Conventions (LOCKED)

- `observations.observer_id`, `raw_input`, `ai_classification`, `linked_deal_ids uuid[]`
- Routes use camelCase equivalents.

### 2.5 Surfacing Strategy — Two-Part Problem (PARTIALLY RESOLVED)

**Part A: Applicability — RESOLVED via 2.21.**

**Part B: Prioritization and frequency — OPEN, queued for conversation after Prompt 8.**

### 2.6 Infrastructure / Long-Running Workflows (RESOLVED)

Rivet is REMOVED.

**New stack:**
- Long-running jobs: Postgres `jobs` table + Next.js worker endpoint
- Scheduling: `pg_cron`
- Real-time UI updates: Supabase Realtime
- Durable workflows: sequential job rows with `parent_job_id`

### 2.7 Prompt Preservation (LOCKED)

Prompts preserved verbatim except those rewritten in `04C-PROMPT-REWRITES.md`.

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

- One Claude client wrapper
- Structured outputs via tool use
- Temperature set explicitly per task type
- One formatter module
- Single source-of-truth enum for signal types
- One transcript preprocessing pass
- One email-drafting service
- Prompts as `.md` files in `prompts/`

### 2.14 Coordinator Synthesis Prompt Anomaly (OPEN)

Prompt #25 uses `system: ""`. Flagged for Prompt 4.5a/b. Rewrite candidate in 4.7.

### 2.15 Prompt Analysis Phase (LOCKED)

Four sessions after Prompt 7.5: 4.5a, 4.5b, 4.6, 4.7.

### 2.16 Intelligence Service Architecture (LOCKED)

Event-sourced state in `deal_events` (append-only). Snapshots in `deal_snapshots`. `DealIntelligence` service is the only interface. No actors, no daemons. Stable interface boundary.

### 2.17 Coordinator Architecture (LOCKED)

Scheduled (pg_cron) + on-demand (called by call-prep and close-lost). Same code path. Call prep MUST query the coordinator; zero results is a valid return.

### 2.18 CRM Strategy — HubSpot Hybrid (LOCKED)

HubSpot = system of record for deal/contact/company data. Nexus owns intelligence data. **Users only ever see the Nexus UI.** HubSpot is the backend data layer; nobody logs into HubSpot during a demo.

Adapter pattern mandatory: `CrmAdapter` interface, `HubSpotAdapter` implementation. Read-through cache so Nexus can demo even if HubSpot is unavailable.

### 2.19 Data Boundary (LOCKED)

**HubSpot:** deals, contacts, companies, native activities, stages, pipelines.

**Nexus:** `deal_events`, `deal_snapshots`, `observations`, `coordinator_patterns`, `experiments`, `transcripts`, `meddpicc_scores`, oDeal fitness, `people` table, rep accounts.

**Split:** stakeholders (identity in HubSpot, engagement analysis in Nexus events).

**Sync:** HubSpot → Nexus via webhooks + periodic full sync. Nexus → HubSpot write-back only for AI-generated custom properties.

### 2.20 New Extraction Prompts for HubSpot Planning (LOCKED)

- Prompt 7.6 — CRM Data Boundary Mapping → `07B-CRM-BOUNDARY.md`
- Prompt 7.7 — HubSpot Property and Integration Design → `07C-HUBSPOT-SETUP.md`

### 2.21 Deal-Context Applicability Gating (LOCKED)

Every surface (experiment, pattern, risk flag, recommendation, intervention, close-lost hypothesis) must pass three gates before surfacing:

1. **Stage applicability** — does this make sense for deals in this stage?
2. **Temporal applicability** — is the timing right?
3. **Precondition applicability** — have prerequisite events happened, required-absent events stayed absent?

**Architecture:**
- Experiments (and patterns, flags) carry structured `applicability` JSONB column: `applicable_stages`, `triggering_event_types`, `time_window_after_trigger_hours`, `preconditions`.
- `DealIntelligence` service exposes: `getApplicableExperiments`, `getApplicablePatterns`, `getApplicableRiskFlags`, `isApplicable`.
- Every surfacing path runs through the gate. Rejections are logged with reasons.
- Close-lost hypotheses verified against event stream; contradicted hypotheses suppressed.

### 2.22 UI Architecture for v2 (LOCKED — from Prompt 6 findings)

Current Nexus has severe UI architecture debt: 1,019 inline hex colors across 23 files, five 1,500+ LOC client files, 113 inline `font-family: 'DM Sans'` declarations where DM Sans is never loaded (everything renders in browser default), no `components/ui/` directory, 10 unused UI dependencies (Radix + Tremor) in package.json with zero imports, commented-out nav entries, 12 pages reachable only by URL.

**Rules for v2:**

**(a) Design tokens, never inline.**
- All color, typography, spacing, radius, shadow values live in a design token source (Tailwind config + CSS variables).
- Zero inline hex colors. Zero inline `font-family`. Zero inline `background: #...`.
- Lint rule enforces this at PR time.

**(b) Component size ceilings.**
- Client component files hard-cap at ~400 LOC. Above that, split into composed sub-components.
- No page is a single 2,000+ LOC monolith. Pages compose smaller components.

**(c) Declarative route/nav registry.**
- A single `routes.ts` (or equivalent) lists every page: path, nav label, icon, visibility, optional role gating.
- Sidebar reads from the registry. No hardcoded nav. No commented-out entries.
- If a page exists in the app, it has a registry entry. If it doesn't have a registry entry, it shouldn't ship.

**(d) Use the primitives you install.**
- UI primitives come from ONE library (likely shadcn/ui built on Radix, or Tremor, or hand-rolled — picked deliberately, not inherited).
- If it's in `package.json`, it's imported somewhere. Dead UI dependencies are a lint failure.
- Modals, dropdowns, tooltips, chips, popovers all use the primitive library. No hand-built versions when a primitive exists.

**(e) Fonts actually load.**
- Any font referenced in code is loaded via the Next.js font loader or equivalent. If DM Sans is specified, it ships. No more silent fallbacks to system default.

### 2.23 Dead Code Discipline (LOCKED — from Prompt 6 findings)

- Zero-importer components, pages that are redirect-only shells, and "Coming Soon" placeholders do not ship in v2.
- Prompt 9 critique is the audit; Prompt 10 rebuild plan explicitly cuts anything in that list.

---

## Part 3 — Design System

### 3.1 Visual Rebrand — Anthropic → OpenAI Aesthetic (LOCKED)

Current Nexus uses an Anthropic-flavored palette. Rebuild moves away from Anthropic brand cues.

Design work happens in a separate Claude chat. Aesthetic direction: "in the spirit of" OpenAI's visual language without cloning ChatGPT. Do NOT copy `#10A37F`.

Deliverable: `docs/handoff/DESIGN-SYSTEM.md`. Timing: between Codex Phase 1 (foundation) and Phase 2 (UI work).

Preserve Framework 21 interaction patterns. Change color values, typography, component styling.

### 3.2 Ongoing Design Collaboration During Build (LOCKED)

Design work on v2 happens in two complementary modes alongside Codex execution. Claude handles design; Codex handles build. They hand off via artifacts and specs.

**Mode 1 — Foundation (one-time, upfront).**

Between Codex Phase 1 and Phase 2, a dedicated Claude chat produces `DESIGN-SYSTEM.md` containing:
- Design tokens (color palette, typography scale, spacing, radii, shadows)
- Component primitives (button, card, input, chip, modal, tooltip) with all 5 visual states per Framework 6
- Framework 21 conversational UI components re-skinned (chip cards, sparkle give-backs, research-interview inputs)
- A primitive library decision (shadcn/ui recommended — built on Radix, tailored, installable)

Codex reads this as the authoritative source for all UI decisions thereafter.

**Mode 2 — Per-feature design sessions (ongoing, as needed).**

For pages that need creative treatment, a Claude chat produces a full design artifact (HTML/CSS or JSX mockup) BEFORE Codex implements. Jeff reviews, iterates, locks. Codex then implements against the locked design.

**Pages that go through Mode 2:**
- Close-lost analysis page (hero moment — the forensic research interview)
- Intelligence dashboard (hero moment — the "field intelligence compounds" pillar)
- Call prep brief rendering (hero moment — the AI-generated deliverable users see most often)
- Observation capture experience
- Deal detail page (the workhorse — rep spends most time here)
- Any close-lost comparison / causal-analysis view when built

**Pages that rely on Mode 1 only (no per-feature design session):**
- Pipeline view (standard kanban)
- Deal list, contact list, company list
- Settings, profile, admin screens
- Any routine CRUD page

**Handoff between Claude design and Codex:**
- Mode 1 output: `docs/handoff/DESIGN-SYSTEM.md` committed to repo. Codex reads.
- Mode 2 output: design artifact (HTML/CSS or JSX) + short spec markdown describing component structure, states, and edge cases. Both committed to `docs/design/<page-name>.md` and its referenced artifact.
- Codex's instruction when implementing: "Read `docs/design/<page-name>.md` and the referenced artifact. Implement using the design system tokens from `DESIGN-SYSTEM.md`. Do not improvise visual decisions."

**What does NOT change between Claude design and Codex build:**
- Interaction patterns from Framework 21 (chip cards, inline responses, etc.)
- Accessibility commitments (keyboard nav, contrast, focus states)
- Loading/empty/error states (explicit in every design artifact)

---

## Part 4 — Remaining Conversations Required

1. **Surfacing prioritization / frequency (Part B of 2.5)** — to resolve after Prompt 8.
2. **Resolve 2.1, 2.2, 2.3 PENDING items** — can happen in the same conversation.

Design system (3.1) is produced in a separate chat. Per-feature design sessions (3.2) happen alongside Codex execution as features come up.

---

## Part 5 — Updated Claude Code Prompt Sequence

- ✅ Prompt 0 — Setup
- ✅ Prompt 1 — Inventory
- ✅ Prompt 2 — Schema
- ✅ Prompt 3 — API Routes
- ✅ Prompt 4 — Prompt Registry
- ✅ Prompt 5 — Rivet Actors
- ✅ Prompt 6 — UI Structure
- ⏳ Prompt 7 — Data Flows
- Prompt 7.5 — Context Assembly Audit
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
7. Soft-mode experiments only. No enforcement.
8. "Nexus Intelligence" is the voice. Never frame AI outputs as coming from a person.
9. Inline rendering for all AI responses. No toasts for meaningful content.
10. Cost is not a constraint in this phase. Build the heavy version.
11. When `DESIGN-SYSTEM.md` is provided, treat it as authoritative for visual decisions. When `docs/design/<page>.md` exists for a page, treat it as authoritative for that page's design. Do not improvise visual decisions.
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
23. All deal/contact/company data access goes through `CrmAdapter`. No HubSpot types leak into the rest of the codebase.
24. Intelligence state is event-sourced. `deal_events` is append-only.
25. `DealIntelligence` service is the only interface for intelligence data.
26. The coordinator runs in both scheduled and on-demand modes using the same code. Call prep must query it.
27. `people` table exists from day one.
28. Rivet is removed. Background work is Postgres `jobs` + Next.js worker + `pg_cron`.
29. HubSpot cache read-through. Nexus continues demoing against cached data if HubSpot is unavailable.
30. Architecture decisions must not preclude any of the eight Future State Capabilities in 1.11.
31. Nothing surfaces to a user without passing the applicability gate (2.21).
32. Applicability rules on experiments and patterns are structured data (JSONB schema per 2.21), never prose.
33. Close-lost hypothesis generator verifies claims against the event stream before surfacing.
34. No inline hex colors, no inline `font-family`, no inline `background: #...`. All styling through design tokens (2.22a).
35. Client component files hard-cap at ~400 LOC. Above that, split into composed sub-components (2.22b).
36. Nav is a declarative route registry. No hardcoded nav, no commented-out entries. Every shipped page has a registry entry (2.22c).
37. UI primitives come from ONE library. No hand-built modals/dropdowns/tooltips/chips when a primitive exists. No dead UI dependencies in package.json (2.22d).
38. Every font referenced in code is loaded. No silent fallbacks (2.22e).
39. Zero-importer components, redirect-only page shells, and "Coming Soon" placeholders do not ship in v2 (2.23).

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

### 1.2 Research-Interview Pattern (LOCKED)

Every capture moment uses the same pattern: AI reads full context → generates an argument → asks user to react to it. Not forms.

Applies to:
- Close-lost capture
- Observation capture
- Call prep feedback
- Any future capture surface

The product's voice IS this pattern.

### 1.3 Experiments — What Exists vs. What's Missing (LOCKED)

**Preserve (already built):**
- Observation → experiment proposal flow (via app or Nexus MCP)
- Marcus-approved experiment lifecycle
- Rep assignment
- Active experiments surface in call prep for assigned reps

**Build (missing):**
- **Attribution.** When a transcript lands or email sends, analyze whether the rep actually did the experiment behavior. Currently runs open-loop.

### 1.4 Three Categories of Experiments (LOCKED)

1. **In-conversation behaviors** ("mention SOC 2 in discovery"). Attribution: Claude reads transcript + experiment description, returns yes/no/partial with quoted evidence.
2. **Out-of-conversation actions** ("send follow-up email within 24h with security one-pager"). Attribution: detect email event in window with artifact reference.
3. **Implicit/approach experiments** ("lead with discovery, not product pitch"). Attribution: rubric-based scoring with visible confidence.

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

- Pipeline (kanban/table/forecast)
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
- Agent memory / per-deal accumulated learnings
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

Do not rebuild these in v2 unless a consumer is identified. If a consumer turns up during the critique or data-flow sessions, add it back.

---

## Part 2 — Architectural Decisions

### 2.1 Authentication Strategy (PENDING INPUT)

**Options:**
- (A) Real auth from day one (Supabase Auth or Clerk) with RLS enforcement
- (B) Preserve persona-switching demo pattern, skip auth entirely

**Claude's recommendation:** (A). Codex will build it cleaner starting fresh than retrofitting later. Real auth enables future features (multi-user demos, real observation attribution).

**Jeff's call needed.**

### 2.2 Database Hygiene — Full Migration Scope (PENDING INPUT)

**Findings from Prompt 2:**
- 20+ "enum-shaped" text columns
- No RLS policies (every table `isRLSEnabled: false`)
- Only 4 indexes exist (all unique, on 1:1 FKs); no FK columns otherwise indexed
- No `ON DELETE` behavior set on any FK (demo reset relies on manual ordering — fragile)
- Heterogeneous FKs (`field_queries.initiated_by`, `observation_routing.target_member_id`) with no enforcement
- Loose `uuid[]` arrays without FK (observations, playbook, coordinator_patterns, knowledge_articles)
- Typo: `readnessFitDetected` (schema.ts:998, missing the "i")

**Options:**
- (A) Full hygiene pass in v2: real Postgres enums or lookup tables, indexes on every FK, explicit ON DELETE, join tables instead of uuid[], split FKs instead of polymorphic
- (B) Targeted pass: only migrate what's actively breaking

**Claude's recommendation:** (A). Codex builds from scratch, so doing it right is the same cost as doing it wrong. The `getEffectiveType()` pattern exists today precisely because someone chose (B) once.

**Jeff's call needed.**

### 2.3 Observation → Deal Relationship (PENDING INPUT)

**Current schema:** `observations.linked_deal_ids uuid[]` — one observation can touch many deals. Array column, no FK enforcement.

**Options:**
- (A) Keep many-to-many via proper join table (`observation_deals` with FKs both sides)
- (B) Restrict to strictly one deal per observation (`observations.deal_id uuid`)

**Claude's recommendation:** (A). The many-to-many pattern is what makes the intelligence coordinator's job possible — patterns that span multiple deals are the point. Proper join table gives you the semantics you want plus FK enforcement.

**Jeff's call needed.**

### 2.4 Column Naming Conventions (LOCKED)

Real column names (correcting CLAUDE.md's approximations):
- `observations.observer_id` (not `reporter_id`)
- `observations.raw_input` (not `content`)
- `observations.ai_classification` (not `classification`)
- `observations.linked_deal_ids uuid[]` (not `deal_id`)

API routes use camelCase equivalents: `observerId`, `rawInput`, `aiClassification`, `linkedDealIds[]`.

Any prompt or documentation going forward uses these real names.

### 2.5 Surfacing / "Not Overbearing" UX (OPEN — to resolve after Prompt 8)

**Constraints:**
- Everyone sees everything (no role-based gating in v1)
- Must not feel surveillant
- Must not be noisy
- Should proactively surface what matters, stay quiet when nothing matters
- Continuous pre-analysis generates huge volume of data; most not worth surfacing

**Questions to resolve:**
- Threshold for surfacing to a rep vs. silent accumulation?
- Threshold for surfacing to leadership?
- Inline vs. notification vs. scheduled digest?
- How does a user dismiss / mute / engage with a surfaced insight?
- When does the system say nothing?

### 2.6 Infrastructure / Long-Running Workflows (OPEN — to resolve after 2.5)

**Candidates:**
- Rivet (current)
- Cloudflare Durable Objects
- Supabase + Inngest
- Supabase + Trigger.dev
- Postgres + Vercel Cron + a simple job table

**Decision depends on runtime requirements from:**
- Continuous pre-analysis on every transcript/email (heavy, frequent Claude calls)
- Durable long-running workflows (transcript pipeline)
- Scheduled jobs (deal health checks, graduation decisions)
- Real-time UI updates (brief ready, intervention cards)
- Whatever surfacing mechanism 2.5 lands on

**Deferred until after 2.5 is resolved.**

### 2.7 Prompt Preservation (LOCKED)

The prompts from `04-PROMPTS.md` are the product. They get ported faithfully in v2, not rewritten from scratch **except where the Prompt 4.5–4.7 analysis phase explicitly produces improved versions**. Codex may refactor the code around prompts freely but must preserve the prompt text verbatim for any prompt not flagged for rewrite.

### 2.8 Context Assembly Audit — New Prompt (LOCKED)

Add **Prompt 7.5 — Context Assembly Audit** to the handoff sequence. Runs after 07-DATA-FLOWS.md. For every Claude API call: what data does it currently access? What data should it access? Where are the gaps?

This is where demo quality lives. Architecture is plumbing; intelligence is prompts + context.

### 2.9 Timeout / maxDuration Policy (LOCKED)

Per Prompt 3 findings: 26 of 41 current routes rely on Vercel's default 10-second timeout. Any route that directly or transitively calls Claude will fail under real load.

**Rule for v2:** Every route declares `maxDuration` explicitly. No route ships on the default. Routes grouped by role:
- CRUD / read-only routes: 10s cap (fast fail preferred)
- Routes calling Claude synchronously: minimum 60s, typically 300s
- Routes that enqueue background work: 10s cap (enqueue is fast)
- Routes that stream: use streaming with no hard cap instead of large maxDuration

### 2.10 Single Write-Path per Domain Concept (LOCKED)

Per Prompt 3 findings: `observations` has 6 write-paths with no service boundary — every route writes raw. `/api/deals/stage` writes full audit; `/api/deals/[id]/update` silently skips it. These asymmetries create silent audit gaps.

**Rule for v2:**
- For any domain concept with 2+ write sites (observations, deals, stage changes, activities), introduce a service function. All routes call the service; routes do not insert directly.
- The service is the only code that writes the canonical audit trail (history, activity, linked observations).
- No raw inserts from route handlers to tables with any downstream observer.

### 2.11 No Trust Flags on User Input (LOCKED)

Per Prompt 3 findings: `/api/observations` with `preClassified: true` bypasses the classifier. In a demo this is fine; in any multi-tenant context it is a critical vulnerability.

**Rule for v2:** No client-provided flags control server-side trust decisions. The server decides what runs classification, what bypasses it, what's pre-verified. Internal-only code paths (e.g., the pipeline calling the observation service directly) bypass classification by invoking a different service method, not by setting a flag.

### 2.12 Server-to-Server Work Uses Function Calls, Not HTTP (LOCKED)

Per Prompt 3 findings: pipeline actor, MCP, call-prep, analyze/link all use `fetch()` to hit internal Next.js routes. Every call pays serverless cold-start + invocation latency.

**Rule for v2:**
- HTTP is for client-server boundaries only.
- Server code that needs work from another server component calls it as a function, not an HTTP request.
- Background jobs invoke services directly. The pipeline does not `fetch('/api/...')` to talk to itself.
- Shared logic (classify observation, score MEDDPICC, draft email) lives in a `services/` layer that both routes and jobs import.

### 2.13 Unified Claude Integration Layer (LOCKED)

Per Prompt 4 findings, the Claude integration is inconsistent across 25 call sites: 4 different fence-strip regex patterns, temperature unset everywhere (defaults to 1.0), transcript truncation varies 8K-15K across pipeline steps, signal-type enum drift (9 vs 7), currency symbol mixing ($/€), parallel email-drafting paths with different schemas, retry asymmetry (7 actor-side retry, 18 SDK-side don't), and every response is JSON-in-text that requires regex parsing.

**Rules for v2:**

**One Claude client wrapper.** All call sites use it. Built-in:
- Retry policy (429/5xx handling)
- Telemetry (per-call duration, tokens, cost, task name)
- Error classification (transient vs. permanent)
- Model pinning (one env var, not 25 string literals)

**Structured outputs via tool use.** Every prompt expecting structured output defines a tool schema. Model invokes the tool. Response comes back as typed JSON. No regex, no fence stripping, no `try/catch JSON.parse` ladders. (Exception: truly free-form generation like email body text — those return plain text.)

**Temperature set explicitly per call, chosen by task type:**
- Classification / extraction / scoring: 0.2
- Analysis / hypothesis generation: 0.3-0.4
- Creative drafting (email, hypothesis prose): 0.6-0.7
- Never leave it unset.

**One formatter module.** Currency, dates, deal stages, percentages, names formatted through shared utilities. Prompts consume pre-formatted strings, not raw fields.

**Single source-of-truth enum for signal types.** One TypeScript enum, referenced by every prompt that mentions signal types. No drift.

**One transcript preprocessing pass.** At ingestion, a transcript is normalized into a canonical analyzed-transcript object (full text, segments, speaker turns, extracted entities, token counts). Every downstream prompt reads from this object. No ad-hoc truncation per step. The "analyzed transcript" is itself cached / stored so re-analysis is cheap.

**One email-drafting service.** Current prompts #12 and #24 emit different shapes. v2 has one service, one prompt, one output schema. Both consumers (agent draft-email route, pipeline actor) call the service.

**Prompts live as `.md` files in `prompts/` directory** (already Guardrail #4). Loaded at runtime, not string literals in routes.

### 2.14 Coordinator Synthesis Prompt Anomaly (OPEN)

Per Prompt 4 findings: prompt #25 (intelligence coordinator synthesis) uses `system: ""` while all other 24 prompts set a system prompt. The coordinator is arguably the prompt that needs the strongest system framing because it's doing cross-deal pattern synthesis.

This is likely a root cause of "the intelligence coordinator feels weak" — a known product issue from CLAUDE.md.

**Action:** Flag for deep dive in Prompt 4.5a or 4.5b. The rewrite in Prompt 4.7 is a strong candidate for a full system-prompt redesign.

### 2.15 Prompt Analysis Phase — Added to Handoff Sequence (LOCKED)

Insert a new analysis block after Prompt 7.5 (Context Assembly Audit) and before Prompt 8 (Source Copy). Four sessions, three deliverables:

- **Prompt 4.5a:** Deep quality audit on prompts 1-13 of 25. Output: `04A-PROMPT-AUDIT.md` (created).
- **Prompt 4.5b:** Deep quality audit on prompts 14-25. Appends to `04A-PROMPT-AUDIT.md`.
- **Prompt 4.6:** Prompt dependency graph + blast-radius ranking. Output: `04B-PROMPT-DEPENDENCIES.md`.
- **Prompt 4.7:** Full rewrites for top 8 prompts by blast radius + "Prompt Principles for Codex" section. Output: `04C-PROMPT-REWRITES.md`.

Sequencing rationale: run 5, 6, 7, 7.5 first (mechanical extraction) so the quality audit has full context when it runs.

---

## Part 3 — Design System

### 3.1 Visual Rebrand — Anthropic → OpenAI Aesthetic (LOCKED)

**Context:** Current Nexus uses an Anthropic-flavored palette (sand `#E8DDD3`, coral `#E07A5F`, page bg `#FDFAF7`, DM Sans typography). Rebuild needs to move away from Anthropic brand cues given the build is now for OpenAI.

**Approach:**
- Design work happens in a **separate Claude chat**, not in Codex. Claude handles design; Codex handles build.
- Aesthetic direction: "in the spirit of" OpenAI's visual language (calm, minimal, confident, restrained) without literally cloning ChatGPT's palette. Interviewer should recognize kinship, not photocopy.
- Do NOT copy `#10A37F` (OpenAI's literal green). Use a distinct accent color that feels like it could belong in their ecosystem.

**Deliverable:** `docs/handoff/DESIGN-SYSTEM.md` produced in a dedicated Claude chat, containing:
- Color palette (primary, accent, text, backgrounds, borders, states)
- Typography scale (font family, sizes, weights)
- Component primitives (buttons, cards, inputs, chips) with all 5 visual states per Framework 6
- Spacing and radius system
- Shadow and elevation
- Any patterns needed to re-skin Framework 21's conversational UI components

**Timing:** Produce this between Codex Phase 1 (foundation) and Codex Phase 2 (UI work starts). Hand to Codex as input for Phase 2+.

**What transfers vs. what changes:**
- **Preserve:** Framework 21 interaction patterns — numbered chip cards, inline responses, sparkle header give-backs, research-interview framing. These are product IP.
- **Change:** All color values. Typography family if needed. Component styling details. Brand voice if any.

**Codex instruction when design system is ready:**
> "Read `DESIGN-SYSTEM.md`. Apply this palette, typography, and component styling throughout. The interaction patterns from Framework 21 (in the handoff package) are preserved — only the visual skin changes."

---

## Part 4 — Remaining Conversations Required

Before the future-state vision doc and rebuild plan can be written, these conversations must happen:

1. **Surfacing mechanics** (see 2.5) — how Nexus proactively surfaces insight without being overbearing
2. **Infrastructure decision** (see 2.6) — dependent on 1
3. **Confirm 2.1, 2.2, 2.3** pending decisions

Resolve these in the planning chat after Prompt 8 completes, before writing Prompts 8.5, 8.75, 9, and 10.

The design system (3.1) is produced in a separate chat on its own timeline — does not block the rebuild plan.

---

## Part 5 — Guardrails for Codex

When the rebuild plan hands off to Codex, enforce these non-negotiables:

1. Prompts from 04-PROMPTS.md are preserved verbatim except those explicitly rewritten in 04C-PROMPT-REWRITES.md.
2. Schema-first design. No workarounds like `getEffectiveType()`. If the schema needs to change, migrate first.
3. Every capture moment is a research interview, not a form.
4. No dual persistence. One source of truth per data type.
5. Long-running operations are background jobs. UI polls or subscribes; never blocks on a synchronous call.
6. oDeal and experiments share a data pipeline but present separate UI narratives.
7. Soft-mode experiments only. No enforcement, no surveillance framing.
8. "Nexus Intelligence" is the voice. Never frame AI outputs as coming from a person (e.g., "Marcus is asking...").
9. Inline rendering for all AI responses. No toasts for meaningful content.
10. Cost is not a constraint in this phase. Build the heavy version. Optimize later.
11. When `DESIGN-SYSTEM.md` is provided, treat it as authoritative for all visual decisions. Framework 21 interaction patterns remain; only visual skin changes.
12. Every route declares `maxDuration` explicitly. No route ships on Vercel's default (per 2.9).
13. Any domain concept with 2+ write sites goes through a service function. Routes never insert directly into tables with downstream observers (per 2.10).
14. No client-controlled trust flags. Server decides what's verified, what runs classification, what's internal (per 2.11).
15. Server-to-server work is a function call, not HTTP. Internal `fetch()` to your own routes is banned (per 2.12).
16. All Claude calls go through the unified client wrapper. No direct SDK calls anywhere outside that wrapper (per 2.13).
17. Structured outputs use tool use, not JSON-in-text regex parsing (per 2.13).
18. Temperature is set explicitly per call based on task type; never unset (per 2.13).
19. Prompts live as `.md` files loaded at runtime, not string literals inline in routes.
20. One formatter module for currency/dates/names/stages. Prompts never see raw fields.
21. One transcript preprocessing pass produces the canonical analyzed-transcript object. All downstream prompts read from it.
22. Single source-of-truth enum for signal types, referenced everywhere.

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
- Brand palette + Framework 21 conversational UI contract
- Three-act demo narrative

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

The prompts from `04-PROMPTS.md` are the product. They get ported faithfully in v2, not rewritten from scratch. Codex may refactor the code around them freely but must preserve the prompt text verbatim. Iteration on prompts happens post-migration based on demo output quality.

### 2.8 Context Assembly Audit — New Prompt (LOCKED)

Add **Prompt 7.5 — Context Assembly Audit** to the handoff sequence. Runs after 07-DATA-FLOWS.md. For every Claude API call: what data does it currently access? What data should it access? Where are the gaps?

This is where demo quality lives. Architecture is plumbing; intelligence is prompts + context.

---

## Part 3 — Remaining Conversations Required

Before the future-state vision doc and rebuild plan can be written, these conversations must happen:

1. **Surfacing mechanics** (see 2.5) — how Nexus proactively surfaces insight without being overbearing
2. **Infrastructure decision** (see 2.6) — dependent on 1
3. **Confirm 2.1, 2.2, 2.3** pending decisions

Resolve these in the planning chat after Prompt 8 completes, before writing Prompts 8.5, 8.75, 9, and 10.

---

## Part 4 — Guardrails for Codex

When the rebuild plan hands off to Codex, enforce these non-negotiables:

1. Prompts from 04-PROMPTS.md are preserved verbatim. Refactor code around them freely.
2. Schema-first design. No workarounds like `getEffectiveType()`. If the schema needs to change, migrate first.
3. Every capture moment is a research interview, not a form.
4. No dual persistence. One source of truth per data type.
5. Long-running operations are background jobs. UI polls or subscribes; never blocks on a synchronous call.
6. oDeal and experiments share a data pipeline but present separate UI narratives.
7. Soft-mode experiments only. No enforcement, no surveillance framing.
8. "Nexus Intelligence" is the voice. Never frame AI outputs as coming from a person (e.g., "Marcus is asking...").
9. Inline rendering for all AI responses. No toasts for meaningful content.
10. Cost is not a constraint in this phase. Build the heavy version. Optimize later.

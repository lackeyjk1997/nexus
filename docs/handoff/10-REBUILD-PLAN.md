# 10 — Rebuild Plan

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Phases 1 + 2 shipped, Phase 3+ ahead.** This document was authored as the full 6-phase blueprint; the active rebuild now has two phases complete, a pre-Phase-3 fix plan executed, and Phases 3-6 as the forward plan. Read with the amendments below in mind; do not re-litigate LOCKED decisions that have since landed.
>
> **Phase status as of 2026-04-22 (HEAD `4e5d281`):**
>
> | Phase | Status | Notes |
> |---|---|---|
> | 1 Foundation | **Complete** | Days 1-5 shipped; exit criteria all pass. See `~/nexus-v2/docs/BUILD-LOG.md` Phase 1 Day 1-5 entries. |
> | 2 Core CRUD | **Days 1-4 Sessions A+B shipped.** Sessions C (deal edit) + D (polish) deferred until after Phase 3 lands per `~/nexus-v2/docs/PRE-PHASE-3-FIX-PLAN.md` §7. |
> | **Pre-Phase-3 fix plan** | **Complete (inserted between Phase 2 and Phase 3).** 21/21 foundation-review items closed across 3 sessions (0-A, 0-B, 0-C). See `~/nexus-v2/docs/PRE-PHASE-3-FIX-PLAN.md` and `~/nexus-v2/docs/FOUNDATION-REVIEW-2026-04-22.md`. |
> | 3 AI Features | **Ahead.** Phase 3 Day 1 kickoff is the next milestone. First step: move 7 remaining rewrites (02-08) from `source/prompts/` → `packages/prompts/files/` per fix plan §6. |
> | 4 Intelligence | Ahead. |
> | 5 Agent Layer | Ahead. |
> | 6 Polish | Ahead. |
>
> **Section 8 "The First Week" — divergences that have been resolved by amendments:**
>
> - **Day 2 schema size.** Document said "33-table v2 migration"; actual shipped schema is 36 tables at Phase 1 Day 2 (plus 3 more via migration 0005 → 41 total). The extras (`experiment_assignments`, `experiment_attributions`, `experiment_attribution_events`, and later `prompt_call_log`, `transcript_embeddings`, `sync_state`) are per §2.2 hygiene + §2.16.1 preservation pull-forwards. Schema.ts is the source of truth.
> - **Day 2 admin-role shape (§2.2.1 LOCKED — Phase 1 Day 2).** `users.is_admin boolean` + `public.is_admin()` SECURITY DEFINER helper instead of a roles table or Supabase JWT claims. Single seam for future multi-role expansion.
> - **Day 2 four RLS patterns (§2.2.1).** Canonical patterns A/B/C/D — own-rows / team-lookup / read-all-update-own / read-all-authenticated+service-role-writes. Two tables (`agent_config_proposals`, `field_queries`) ship with read-all-authenticated and tighten in Phase 5 Day 1.
> - **Day 3 pg_cron secret handling (§2.6.1 LOCKED — Phase 1 Day 3).** Supabase denies `ALTER DATABASE ... SET` for custom GUCs; URL + Bearer embedded as SQL literals inside the `cron.job.command` body. Rotation via Vercel env + `pnpm configure-cron`.
> - **Day 4 Claude wrapper clarifications (§2.13.1 LOCKED — Phase 1 Day 4).** `01-detect-signals` max_tokens at 6000 (not 3000); dotenv `override: true` convention for Claude-calling scripts; reasoning_trace calendared resolutions for 01/03/06a/08; telemetry as prompt-quality early warning.
> - **Day 5 HubSpot config path (§2.18.1 LOCKED — Phase 1 Day 5).** All HubSpot-specific config under `packages/shared/src/crm/hubspot/` — not `apps/web/src/config/` (Day-5 brief) or `packages/seed-data/` (07C). Resolves a disagreement in the original handoff docs.
> - **Day 5 additional CrmAdapter methods.** `getCompany` + `createCompany` + `createContact` were stubbed in Day-5 brief but went live on Day 5 because `/pipeline` needs company name resolution + the minimal seed needs company/contact creation. Live vs stub list in `~/nexus-v2/packages/shared/src/crm/hubspot/adapter.ts` header.
>
> **Section 4 data-model additions since this plan was authored:**
>
> - `prompt_call_log` (§2.16.1 decision 3 locked Pre-Phase 3 Session 0-A, 19-column shape) — Claude wrapper telemetry, lands Session 0-B.
> - `transcript_embeddings` (§2.16.1 decision 1, `vector(1536)` + voyage-large-2 + HNSW index Phase 3 Day 2) — corpus-intelligence preservation.
> - `deal_events.event_context jsonb` nullable (§2.16.1 decision 2 pulled-forward) — Phase 3 Day 2 event writers populate; Phase 4 Day 1 flips to NOT NULL.
> - `experiments.vertical` + composite index (foundation-review A6).
> - `fitness_velocity` proper enum + column cast (A11 first half; `ai_category` second half defers to Phase 5 Day 3-4).
> - `experiment_attributions.transcript_id` FK + `deal_events (hubspot_deal_id, created_at DESC)` composite index (A12, A13).
> - `sync_state` table (A8) — pg_cron wiring Phase 4 Day 2.
>
> **Creative additions shipped or scheduled since this plan was authored:**
>
> - **C1** `pnpm enum:audit` — shipped Session 0-C. Three-way drift gate across TS/schema/HubSpot. Would have caught the ContactRole + MEDDPICC drifts by hand in Phase 2 Day 2 + pre-Phase-3 foundation review.
> - **C5** demo-reset manifest — shipped Session 0-B (skeleton); every migration that adds a Nexus-owned table adds a manifest entry in the same commit. Actual demo-reset script walking the manifest lands Phase 6 Polish.
> - **C2** applicability DSL + shared evaluator service — Phase 4 Day 1 per foundation review.
> - **C3** MockClaudeWrapper — Phase 3 Day 1 alongside wrapper wiring.
> - **C4** telemetry dashboard `/admin/claude-telemetry` — Phase 3 Day 2 (optional capstone; may defer to Day 3 for first real data).
>
> **§2.1.1 Supabase auth hotfix + three defense-in-depth layers (LOCKED — Phase 2 Day 2 hotfix).** Dashboard Site URL + Redirect URLs allowlist + `NEXT_PUBLIC_SITE_URL` on Vercel (all three scopes) + explicit `emailRedirectTo` + `/` page forwarding stray `?code=` to `/auth/callback`. Operational notes and resolution in `~/nexus-v2/docs/BUILD-LOG.md`.
>
> **Current v2 authoritative sources:**
> - `~/nexus-v2/docs/BUILD-LOG.md` — day-by-day execution history + current state.
> - `~/nexus-v2/docs/DECISIONS.md` — 51 guardrails + v2-era amendments (§2.1.1, §2.2.1, §2.2.2, §2.6.1, §2.13.1, §2.16.1, §2.18.1).
> - `~/nexus-v2/docs/PRE-PHASE-3-FIX-PLAN.md` — pre-Phase-3 fix plan (now closed out).
> - `~/nexus-v2/docs/FOUNDATION-REVIEW-2026-04-22.md` — foundation review that motivated the fix plan.
> - `~/nexus-v2/docs/PRODUCTIZATION-NOTES.md` — productization arc + corpus-intelligence second-product thesis; informs the "designed-for not built-for" sequencing in Section 7.
>
> Sections 1-12 below are unchanged from the original handoff. Read them as the blueprint with the status + amendments above factored in.

---

**Audience:** Codex (primary), Jeff (reviewer).
**Purpose:** Operationalize [DECISIONS.md](DECISIONS.md) into an executable, phase-by-phase build plan for Nexus v2.
**Status:** Authoritative. Every recommendation cites evidence from earlier handoff docs. No floating claims.

This document assumes Codex has already read, in order: `CLAUDE.md`, `DECISIONS.md`, `01-INVENTORY.md`, `02-SCHEMA.md`, `03-API-ROUTES.md`, `04-PROMPTS.md`, `04A-PROMPT-AUDIT.md`, `04B-PROMPT-DEPENDENCIES.md`, `04C-PROMPT-REWRITES.md`, `05-RIVET-ACTORS.md`, `06-UI-STRUCTURE.md`, `07-DATA-FLOWS.md`, `07A-CONTEXT-AUDIT.md`, `07B-CRM-BOUNDARY.md`, `07C-HUBSPOT-SETUP.md`, `08-SOURCE-INDEX.md`, `09-CRITIQUE.md`.

---

## Section 1 — Executive Summary

### What Nexus v2 is

Nexus v2 is a full-cycle AI sales orchestration platform. It is the same product vision as v1, with a radically simpler implementation and the intelligence actually wired through. It exists to demonstrate to Anthropic's sales leadership how AEs direct AI agents across the entire buyer's journey.

### The three pillars v2 delivers

Per [DECISIONS.md Part 1](DECISIONS.md):

1. **AI agents automate the mechanical work of selling.** Transcript analysis, MEDDPICC scoring, signal detection, call-prep assembly, email drafting, deal-fitness inspection. The mechanical tax of CRM hygiene becomes a background job. (DECISIONS.md 1.9, 2.16)
2. **Field intelligence compounds across deals.** Every observation, every transcript signal, every close-lost hypothesis is event-sourced. A coordinator detects cross-deal patterns and pushes them back into call prep. Each deal makes every subsequent deal smarter. (DECISIONS.md 2.16, 2.17)
3. **The human directs the AI.** Agent configs are proposals, not auto-writes. Experiments are soft-mode. Close-lost capture is a research interview where the AI argues first and the rep reacts. Surface admission is threshold-based with visible scores and explicit dismissal/feedback paths. (DECISIONS.md 1.2, 1.5, 1.15–1.18, 2.25 #3)

### The stack in three bullets

- **HubSpot Starter Customer Platform** is the CRM system of record (deals, contacts, companies, stages, native activities). Nexus never duplicates that data. All CRM access goes through a `CrmAdapter` interface with a HubSpot implementation and a read-through cache. (DECISIONS.md 2.18, 2.19, Guardrail 23/44)
- **Next.js 14 (App Router) on Vercel Pro**, backed by **Supabase Postgres** (Drizzle ORM, RLS, Supabase Auth), with **Postgres-backed job infrastructure** (`jobs` table + Next.js worker + `pg_cron`) replacing Rivet entirely. Real-time updates via **Supabase Realtime**. (DECISIONS.md 2.1, 2.2, 2.6, 2.9)
- **Anthropic SDK behind a unified Claude wrapper.** Prompts live as `.md` files. Structured outputs use tool-use schemas, not JSON-in-text regex parsing. Temperature is set explicitly per task type. (DECISIONS.md 2.13, Guardrails 16–20)

### Scope — six phases, honest timeline

Each phase assumes focused Codex work. Jeff's design-system deliverable ([DECISIONS.md 3.1–3.2](DECISIONS.md)) runs between Phase 1 and Phase 2.

| Phase | Name              | Goal                                           | Scope      |
|-------|-------------------|------------------------------------------------|------------|
| 1     | Foundation        | Skeleton stands. Infra + auth + jobs + CRM adapter. | ~5 days    |
| 2     | Core CRUD         | Deals are real. Pipeline, deal detail, MEDDPICC edit. | ~4 days    |
| 3     | AI Features       | Transcript pipeline, call prep, email, observations. | ~6 days    |
| 4     | Intelligence      | Event-sourced deal intelligence, coordinator, clustering. | ~5 days    |
| 5     | Agent Layer       | Config proposals, close-lost interview, experiments, interventions. | ~5 days    |
| 6     | Polish            | Per-feature design integration, empty states, demo polish. | ~4 days    |

**Total:** ~29 focused days. Honest, not optimistic. See [Section 6](#section-6--phase-plan) for detail.

### Explicitly out of scope for v1

Per [DECISIONS.md 1.8 and 1.11](DECISIONS.md), the following do **not** ship in v2 and Codex should not design for them beyond preserving future extensibility:

- Role-based permissions / multi-user surfacing policies
- Multi-tenancy (single demo org only)
- Guided tour (removed in S10; not rebuilt)
- The eight "future state capabilities" (deal simulation, coaching replay, proactive outreach prioritization, real-time competitive intelligence, cross-account intelligence surfaces, automatic playbook generation, defensible forecasting, experiment evidence compounding) are **designed-for, not built-for** — Guardrail 30. Schema must admit them; UI must not build them.
- Admin UI for threshold configuration (1.16 — hardcoded thresholds ship in v1)
- Leadership-facing feedback surfacing (1.17 — table exists, surface does not)

### What success looks like

The three-act demo runs end-to-end without human narration filling gaps:

1. **Act 1 (morning digest + deal workflow):** Sarah opens the app, sees a quiet digest with 3 items, clicks through to MedVista, uploads a transcript, watches the job complete, sees an updated MEDDPICC + a call-prep brief that cites coordinator patterns.
2. **Act 2 (cross-deal intelligence):** A second transcript on NordicMed triggers the coordinator to detect a cross-deal competitive pattern. Sarah's next call prep on MedVista shows the pattern.
3. **Act 3 (close-lost research interview):** Sarah marks HealthFirst Closed Lost. The system produces a VP-grade hypothesis grounded in event-stream evidence. Sarah reacts, answers pointed questions, submits her own narrative. The reconciliation becomes a learning signal.

Success is also that Codex never hit a decision point that forced a conversation with Jeff.

---

## Section 2 — Recommended Stack

One decision per layer. Locked by prior sessions; this section confirms and cites.

| Layer | Decision | Rationale / Reference |
|---|---|---|
| **Framework** | Next.js 14 App Router (TypeScript strict) | Continuity with v1. No migration cost. Server Components simplify data access. `maxDuration` per route. (CLAUDE.md; DECISIONS.md 2.9) |
| **Hosting** | Vercel Pro (300s max function duration) | 60s Hobby tier cannot cover `/api/agent/call-prep` or `/api/transcript-pipeline`. Pro tier buys the headroom. (DECISIONS.md 2.9) |
| **Database** | Supabase Postgres | Already provisioned. Built-in RLS, Auth, Realtime — all three v2 needs. (DECISIONS.md 2.1, 2.2, 2.6) |
| **ORM** | Drizzle | Continuity with v1 schema migrations. Typed queries. No raw SQL except seeds. (CLAUDE.md; DECISIONS.md 2.2 numbered migrations) |
| **AI SDK** | Anthropic SDK via unified Claude wrapper | Retry, telemetry, explicit temperature, tool-use structured outputs, prompts loaded from `.md` files. (DECISIONS.md 2.13, Guardrails 16–20) |
| **Background jobs** | Postgres `jobs` table + Next.js worker + `pg_cron` | Rivet removed. Serverless-compatible. Durable without a second runtime. (DECISIONS.md 2.6; [Section 5](#section-5--the-rivet-question--resolved)) |
| **Real-time** | Supabase Realtime (Postgres logical replication) | Job-status broadcasts to the UI replace Rivet WebSocket events. Already provisioned with the database. (DECISIONS.md 2.6) |
| **State management** | React Server Components + minimal `useState` client state | No Redux. No Zustand. Client files capped at ~400 LOC; complex state lives server-side. (DECISIONS.md 2.22, Guardrail 35) |
| **Auth** | Supabase Auth + RLS on every Nexus-owned table | Real auth from day one. Admin role for dev-only bypass. Persona-switching removed. (DECISIONS.md 2.1, Guardrail 45) |
| **CRM adapter** | `CrmAdapter` interface; `HubSpotAdapter` implementation | All deal/contact/company data access through this. HubSpot Starter tier, 38 first-class custom properties. (DECISIONS.md 2.18, 2.19, Guardrails 23/44) |
| **CI/CD** | Vercel's built-in preview/deploy + GitHub Actions for lint & typecheck | Vercel handles deploy; GHA prevents broken main. No over-engineering. |
| **Monorepo** | Turborepo + pnpm | Continuity with v1. `apps/web`, `packages/db`, `packages/shared`, `packages/prompts`. (CLAUDE.md) |
| **UI primitives** | shadcn/ui + Radix (one library, not two) | v1 installed ten unused Radix packages ([09-CRITIQUE.md §9](09-CRITIQUE.md)); v2 uses exactly one primitive library everywhere. (DECISIONS.md 2.22d, Guardrail 37) |
| **Styling** | Tailwind + design tokens (no inline hex/fonts) | v1 has 1,019 inline hex colors and 113 unresolved font declarations ([09-CRITIQUE.md §9](09-CRITIQUE.md)). v2 uses tokens from `DESIGN-SYSTEM.md`. (DECISIONS.md 2.22a, Guardrail 34) |
| **Prompts** | `packages/prompts/` — `.md` files loaded at runtime | No inline prompt string literals. Version-stamped. (DECISIONS.md 2.13, Guardrail 19) |

### What changed vs. current Nexus

- **Rivet removed.** The wrapper broadcasts nothing; 18 actions are no-ops; `state: {}` empty ([09-CRITIQUE.md §3.1](09-CRITIQUE.md)). Replaced by `jobs` + `pg_cron` + `deal_events`.
- **Auth added.** v1 has none. v2 ships Supabase Auth on day two. RLS on all 37+ tables that currently have it disabled.
- **Schema hygiene.** 20+ text-shaped enums become proper Postgres enums. `coordinator_patterns.deal_ids text[]` becomes an FK join table. Heterogeneous FKs (`field_queries.initiated_by`) get split into discriminated nullable pairs. (DECISIONS.md 2.2)
- **UI primitives consolidated.** Ten unused Radix packages deleted; shadcn/ui is the single primitive library. (DECISIONS.md 2.22d)
- **CRM boundary.** v1 duplicates CRM data in its own tables. v2 treats HubSpot as system of record and caches it read-through. (DECISIONS.md 2.18)

---

## Section 3 — Architectural Principles (Non-Negotiable)

These are the invariants Codex treats as non-negotiable. Derived from [DECISIONS.md Guardrails](DECISIONS.md#part-6--guardrails-for-codex) and [09-CRITIQUE.md](09-CRITIQUE.md) findings. Each is one sentence with a reference.

1. **Schema-first.** Every schema change lands as a numbered Drizzle migration before any code that depends on it ships. No `getEffectiveType()` workarounds; no runtime schema mutations. (DECISIONS.md Guardrail 2, 2.2; [09-CRITIQUE.md §4](09-CRITIQUE.md))
2. **One source of truth per concept.** HubSpot owns CRM state; Nexus owns intelligence. Cross the boundary only through `CrmAdapter`. (DECISIONS.md 2.18, 2.19, Guardrail 23)
3. **Event-sourced intelligence.** `deal_events` is append-only. `DealIntelligence` service is the only read/write interface. No intelligence state lives in actors, in-memory caches, or ad-hoc columns. (DECISIONS.md 2.16, Guardrails 24–25)
4. **Applicability gating.** Nothing surfaces without passing stage + temporal + precondition checks. Rules are structured JSONB, never prose. (DECISIONS.md 2.21, Guardrails 31–32)
5. **Research-interview pattern.** Every capture moment reads full context, generates an argument, asks the user to react. No blank forms for close-lost, observation capture, or feedback. (DECISIONS.md 1.2, Guardrail 3)
6. **Soft-mode experiments.** Assignment is data; non-compliance is logged, not enforced. Applicability gates decide where experiments surface. (DECISIONS.md 1.5, Guardrail 7)
7. **Long operations are jobs.** UI subscribes to status via Realtime; never blocks on synchronous Claude calls. (DECISIONS.md 2.6, 2.9, Guardrail 5)
8. **Design tokens, never inline.** No hex colors, no inline fonts, no inline backgrounds in components. (DECISIONS.md 2.22a, Guardrail 34)
9. **Prompts as files.** `.md` in `packages/prompts/`, loaded at runtime. Version-stamped. No inline prompt string literals anywhere. (DECISIONS.md 2.13, Guardrail 19)
10. **Unified Claude layer.** One wrapper module. Tool-use for structured outputs. Explicit temperature per task type (0.2 classification, 0.3 synthesis, 0.5–0.7 voice). (DECISIONS.md 2.13, Guardrails 16–18)
11. **Services own write-paths.** Any domain concept with 2+ write sites goes through a service function. No two routes writing `deals.stage` (current v1 has this — [09-CRITIQUE.md §4](09-CRITIQUE.md)). (DECISIONS.md 2.10, Guardrail 13)
12. **Server-to-server is a function call.** Routes never HTTP-hop to each other. Shared logic lives in `services/`. (DECISIONS.md 2.12, Guardrail 15)
13. **No client-controlled trust flags.** `preClassified: true` style bypasses do not exist. Server decides trust. (DECISIONS.md 2.11, Guardrail 14)
14. **`maxDuration` is explicit.** Every route declares it. No relying on platform defaults. (DECISIONS.md 2.9, Guardrail 12)
15. **Client components are bounded.** Hard cap ~400 LOC. The 2,543-LOC `BookClient` cannot ship. (DECISIONS.md 2.22b, Guardrail 35)
16. **Nav is a declarative route registry.** Sidebar reads from one data structure. No redirect-only shells, no "Coming Soon." (DECISIONS.md 2.22c, 2.23, Guardrails 36/39)
17. **Surfacing is ambient + digest, never interruptive.** No push notifications, no banners, no real-time alerts. Toasts are reserved for non-meaningful content. (DECISIONS.md 1.15, Guardrails 9/48)
18. **Empty states are intentional.** Silence is a feature. First 48 hours of a new deal is observation-only. Daily digest has a "nothing new" state. (DECISIONS.md 1.18, Guardrail 51)
19. **No name-based scaffolding.** No `deal.name.includes("nordicmed")`. No `ILIKE '%MedVista%'` in demo reset logic. Behaviors key off structured data, not seed string matches. (DECISIONS.md 1.14, Guardrail 41; [09-CRITIQUE.md §3.4](09-CRITIQUE.md))
20. **Pipeline steps do real work.** No no-op RPCs. No "graceful degradation" masking total failure as completion. Target 6–8 steps, each with observable effect. (DECISIONS.md 2.24, Guardrail 42; [09-CRITIQUE.md §3.7](09-CRITIQUE.md))
21. **AI-driven config mutations are proposals.** Writing to `agent_configs` requires human approval. No direct writes from classifier outputs. (DECISIONS.md 2.25 #3, Guardrail 43)

---

## Section 4 — Data Model

Reference structure. Not full DDL. Codex generates migrations in Phase 1 Day 2 per [DECISIONS.md 2.2](DECISIONS.md).

### 4.1 HubSpot side (system of record)

Per [07C-HUBSPOT-SETUP.md](07C-HUBSPOT-SETUP.md):

- **Objects used:** Deals, Contacts, Companies, Engagements (native).
- **One pipeline:** "Nexus Sales" with 9 stages.
- **38 custom properties** across three property groups (all under `nexus_intelligence`):
  - 28 on Deal (MEDDPICC dimension scores + overall, fitness score + velocity, lead score, vertical, products, close analysis fields, renewal/QBR dates, contracted use cases, close notes)
  - 5 on Contact (role in deal, engagement status, LinkedIn URL, identity confidence, Nexus person ID)
  - 5 on Company (vertical, tech stack, health score, enrichment source, enrichment ID)
- **12 webhook subscriptions:** deal/contact/company creation + filtered property change + deletion. `engagement.creation` intentionally NOT subscribed (feedback loop); engagements reconcile via 15-minute periodic sync.
- **Write-back to HubSpot:** Nexus writes only its own `nexus_*` custom properties. Never overwrites native fields (`dealname`, `dealstage` except user action, `amount`, `closedate`) or `hs_*` system namespace.

### 4.2 Nexus authoritative tables

Per [07B-CRM-BOUNDARY.md Section 2](07B-CRM-BOUNDARY.md) and [DECISIONS.md 2.19](DECISIONS.md):

| Table | Purpose | PK | Key Relations |
|---|---|---|---|
| **`users`** | Authenticated rep accounts. Session binds here. | `id (uuid)` | — |
| **`team_members`** | Rep profile (role, vertical specialization) joined to `users`. | `id (uuid)` | → `users` |
| **`support_function_members`** | Non-sales personas (Enablement, Deal Desk, Product Marketing). | `id (uuid)` | → `users` |
| **`hubspot_cache`** (new) | Read-through cache of HubSpot deal/contact/company objects. TTL-based invalidation. | `id (uuid)` | composite unique on `(object_type, hubspot_id)` |
| **`people`** (new) | Canonical person identity — same human across multiple HubSpot contact records. Enables future cross-account intelligence (1.11 #5). | `id (uuid)` | — |
| **`people_contacts`** (new) | Join table mapping `people` → HubSpot contact IDs with link method and confidence. | `(person_id, hubspot_contact_id)` | → `people` |
| **`deal_events`** (new, event-sourced) | Append-only audit + intelligence stream. Every signal, every MEDDPICC update, every theory revision, every coordinator insight. | `id (uuid)` | → `hubspot_cache` (deal_id FK) |
| **`deal_snapshots`** (new) | Periodic materialized projections from `deal_events` for read performance. | `(deal_id, snapshot_at)` | → `hubspot_cache` |
| **`deal_contact_roles`** (new) | Per-deal role assignments for stakeholders (champion, EB, SA, etc.). Backup when HubSpot `nexus_role_in_deal` isn't sufficient. | `(deal_id, hubspot_contact_id)` | → `hubspot_cache` |
| **`observations`** | Field observations with AI classification, confidence, signal type. | `id (uuid)` | → `users` (observer) |
| **`observation_deals`** (new) | Many-to-many link between observations and deals. Replaces `observations.linked_deal_ids uuid[]`. | `(observation_id, deal_id)` | → `observations`, `hubspot_cache` |
| **`observation_clusters`** | Semantic groups of related observations. | `id (uuid)` | — |
| **`coordinator_patterns`** | Cross-deal patterns detected by the coordinator. Authoritative per [DECISIONS.md 2.17](DECISIONS.md). | `id (uuid)` | — |
| **`coordinator_pattern_deals`** (new) | FK-enforced join from patterns to deals. Replaces `coordinator_patterns.deal_ids text[]`. | `(pattern_id, deal_id)` | → `coordinator_patterns`, `hubspot_cache` |
| **`experiments`** | Experiment definitions with structured `applicability` JSONB. Lifecycle: proposed → active → graduated/killed. | `id (uuid)` | → `team_members` (originator) |
| **`experiment_attributions`** (new) | Per-transcript/email attribution of experiment behavior. Feeds evidence thresholds. | `id (uuid)` | → `experiments`, `deal_events` |
| **`transcripts`** | Raw transcript text + metadata. | `id (uuid)` | → `hubspot_cache` (deal_id) |
| **`analyzed_transcripts`** (new) | Canonical preprocessed transcript object. One row per transcript. Reused by every downstream prompt. (DECISIONS.md 2.13) | `transcript_id (uuid, unique)` | → `transcripts` |
| **`meddpicc_scores`** | Per-deal MEDDPICC dimension scores + confidence + evidence event IDs. Mirrors the 7 custom HubSpot properties + overall score. | `deal_id (uuid, unique)` | → `hubspot_cache` |
| **`deal_fitness_events`** | 25 oDeal framework events per deal. Detected vs. not-yet. | `id (uuid)` | → `hubspot_cache` |
| **`deal_fitness_scores`** | Per-deal aggregate fitness scores + jsonb intel (stakeholder engagement, buyer momentum, conversation signals). | `deal_id (uuid, unique)` | → `hubspot_cache` |
| **`agent_configs`** | Per-rep agent configuration (natural-language instructions + structured preferences). | `id (uuid)` | → `team_members` |
| **`agent_config_versions`** | Immutable version history of every config change. | `id (uuid)` | → `agent_configs` |
| **`agent_config_proposals`** (new) | Pending changes from classifier/feedback flows. Human approves before write. | `id (uuid)` | → `agent_configs`, `users` |
| **`manager_directives`** | Leadership directives injected into call prep as DIRECTIVE language. | `id (uuid)` | → `team_members` (author) |
| **`system_intelligence`** | Pre-computed data patterns (win/loss, competitive, vertical-specific). | `id (uuid)` | — |
| **`knowledge_articles`** | Internal KB articles consumed by response-kit and call-prep prompts. | `id (uuid)` | — |
| **`customer_messages`** | Inbound customer communications + response kits. | `id (uuid)` | → `hubspot_cache` |
| **`account_health`** | Post-close account state tracking. | `id (uuid)` | → `hubspot_cache` |
| **`field_queries`** | Manager/support questions sent to reps. Initiator discriminated via nullable pair. (DECISIONS.md 2.2) | `id (uuid)` | → `team_members` OR `support_function_members` (one non-null) |
| **`field_query_questions`** | Per-rep questions within a query. | `id (uuid)` | → `field_queries` |
| **`notifications`** | In-app notifications. Ambient only (DECISIONS.md 1.15). | `id (uuid)` | → `users` |
| **`surface_dismissals`** (new) | Per-user, per-insight dismissal log. Soft (7-day resurface) or hard. (DECISIONS.md 1.17, 2.26) | `(user_id, insight_id, insight_type)` | → `users` |
| **`surface_feedback`** (new) | "This is wrong" feedback on surfaced insights. Learning signal. (DECISIONS.md 1.17, 2.26) | `id (uuid)` | → `users` |
| **`jobs`** (new) | Background job queue. Worker polls; `pg_cron` schedules. (DECISIONS.md 2.6) | `id (uuid)` | — |
| **`job_results`** (new) | Immutable per-step outputs from transcript pipeline and other multi-step jobs. | `(job_id, step_index)` | → `jobs` |

### 4.3 Dropped tables

Per [07B-CRM-BOUNDARY.md](07B-CRM-BOUNDARY.md) and [DECISIONS.md 2.2](DECISIONS.md):

- **`deal_agent_states`** — Rivet-era state mirror. Replaced by `deal_events` + `deal_snapshots`.
- **`agent_actions_log`** — Rivet-era action audit. Subsumed by `deal_events`.
- **`deal_stage_history`** — HubSpot owns stage history via native property-change events; reconciled through the cache. Stage transition intelligence (AI vs. human author) lives in `deal_events`.
- **Also gone:** `influence_scores` (unused, UI-only per v1), all Rivet-adjacent columns on surviving tables.

### 4.4 `deal_events` type catalog

`deal_events` is the backbone of v2 intelligence. Codex defines the full type enum up front; all future features extend it. Initial v1 set:

| Event type | Emitted by | Payload shape (jsonb) |
|---|---|---|
| `stage_changed` | Stage service | `{from, to, changed_by (user\|ai), reason?}` |
| `meddpicc_scored` | Transcript pipeline step | `{dimension, old_score, new_score, confidence, evidence_event_ids[]}` |
| `signal_detected` | Transcript pipeline step | `{signal_type (SignalTaxonomy), source_ref, confidence, quote?}` |
| `stakeholder_engagement_recorded` | Engagement webhook + transcript parser | `{hubspot_contact_id, engagement_type, sentiment?, duration_s?}` |
| `transcript_ingested` | Transcript pipeline step | `{transcript_id, word_count, speaker_turns}` |
| `deal_theory_updated` | Prompt #14A output | `{hypotheses[], threats[], tailwinds[], confidence}` |
| `risk_flag_raised` | Intelligence service | `{flag_type, threshold_crossed, applicability_passed}` |
| `risk_flag_cleared` | Intelligence service | `{flag_id, cleared_by (user\|ai\|auto), reason}` |
| `coordinated_intel_received` | Coordinator → deal push | `{pattern_id, summary, score, reasoning}` |
| `experiment_attributed` | Transcript attribution pass | `{experiment_id, matched (bool), evidence_event_ids[]}` |
| `observation_linked` | Observation write-path | `{observation_id, signal_type, raw_input_hash}` |
| `intervention_proposed` | Intervention engine | `{intervention_type, action_suggested, applicability_passed}` |
| `intervention_resolved` | User action | `{intervention_id, action_taken (accepted\|dismissed\|modified)}` |
| `email_drafted` | Email drafter service | `{draft_id, context_layers[], recipient_contact_id}` |
| `call_prep_generated` | Call-prep orchestrator | `{brief_id, layers_queried[], patterns_cited[]}` |
| `close_hypothesis_produced` | Prompt #14B output | `{hypothesis_id, top_factors[], confidence, event_citations[]}` |
| `close_reconciliation_recorded` | Close-lost interview | `{hypothesis_id, rep_narrative, agreements[], disagreements[]}` |

Events carry `{id, deal_id, type, payload, source (prompt_id\|service_name\|user_id), created_at}`. Append-only. No updates or deletes.

### 4.5 `jobs` table shape

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | `job_type` enum | `transcript_pipeline`, `coordinator_synthesis`, `observation_cluster`, `daily_digest`, `deal_health_check`, `hubspot_periodic_sync`, `noop` |
| `status` | `job_status` enum | `queued`, `running`, `succeeded`, `failed` |
| `input` | jsonb | Job-type-specific input |
| `result` | jsonb | Final aggregate (per-step in `job_results`) |
| `error` | text | Stack trace / error message if `status='failed'` |
| `user_id` | uuid FK | Requesting user if applicable |
| `scheduled_for` | timestamptz | For future-scheduled jobs (pg_cron writes this) |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | |
| `attempts` | int default 0 | Incremented on retry; capped at 3 |
| `created_at` | timestamptz default now() | |

Indexes: `(status, scheduled_for)` for the worker poll query; `(user_id, created_at desc)` for UI queries.

### 4.6 Enum discipline

Per [DECISIONS.md 2.2](DECISIONS.md): every `text`-shaped column that [02-SCHEMA.md](02-SCHEMA.md) documents as an enum becomes a proper Postgres enum or lookup table. v1 has **20+** such columns. Canonical enums live in `packages/shared/src/enums/`:

- **`SignalTaxonomy`** — 9 types: `deal_blocker`, `competitive_intel`, `process_friction`, `content_gap`, `win_pattern`, `field_intelligence`, `process_innovation`, `agent_tuning`, `cross_agent`. Every classifier and detector imports from here. (Fixes v1's 9 vs. 7 drift between prompt #1 and prompt #21 — [09-CRITIQUE.md §6](09-CRITIQUE.md).)
- **`DealStage`** — 9 stages from the "Nexus Sales" HubSpot pipeline
- **`Vertical`** — `healthcare`, `financial_services`, `technology`, `retail`, `manufacturing`, etc.
- **`MeddpiccDimension`** — `metrics`, `economic_buyer`, `decision_criteria`, `decision_process`, `paper_process`, `identify_pain`, `champion`, `competition`
- **`OdealCategory`** — `business_fit`, `emotional_fit`, `technical_fit`, `readiness_fit`
- **`CloseFactorTaxonomy`** — the four-dimensional close analysis (loss reason, objection, friction, gap) + seed values per [DECISIONS.md 1.1](DECISIONS.md)
- **`ContactRole`** — `champion`, `economic_buyer`, `decision_maker`, `technical_evaluator`, `end_user`, `procurement`, `influencer`
- **`JobStatus`**, **`JobType`**, **`ExperimentLifecycle`** (`proposed`, `active`, `graduated`, `killed`)
- **`SurfaceDismissalMode`** (`soft`, `hard`)
- **`EngagementStatus`** (`engaged`, `silent`, `new`, `departed`)

No prompt, no service, no component hand-constructs enum values. All imports from canonical modules. Tool-use schemas reference the enums via JSON Schema `enum` constraints.

### 4.7 Service layer catalog

Every domain concept with ≥2 write sites lives behind a service function ([DECISIONS.md 2.10, Guardrail 13](DECISIONS.md)). Codex builds these in `apps/web/src/services/`:

| Service | Responsibility | Write sites |
|---|---|---|
| `DealIntelligence` | Sole read/write interface for `deal_events` + `deal_snapshots`. Methods: `recordEvent`, `getDealState`, `getApplicablePatterns`, `getApplicableExperiments`, `getApplicableFlags`, `refreshSnapshot`. | All intelligence consumers |
| `IntelligenceCoordinator` | Cross-deal pattern detection + synthesis. Methods: `receiveSignals`, `runSynthesis`, `getPatternsForDeal`, `getAllPatterns`. Callable from scheduled job or on-demand. | Transcript pipeline step 5, scheduled job, direct API |
| `CallPrepOrchestrator` | Assembles 8+ intelligence layers into a structured brief. Methods: `generateBrief(dealId, attendees, context)`. | `/api/agent/call-prep`, transcript pipeline auto-brief |
| `EmailDrafter` | Single entry point for all AI-drafted emails (follow-up, customer outreach, QBR prep). Methods: `draft(dealOrAccountId, purpose, voiceProfile)`. | Transcript pipeline step 7, `/book` drawer, customer message response kit |
| `TranscriptPreprocessor` | Produces canonical `analyzed_transcripts` row. Run once per transcript; all downstream prompts read from it. Methods: `preprocess(transcriptId)`. | Transcript pipeline step 2 |
| `ObservationService` | Classification → entity extraction → cluster match → routing. Methods: `capture(rawInput, observerId, dealContext?)`, `followUp(observationId, response)`. | Agent bar, `/book` log-observation action, scheduled clustering job |
| `ExperimentService` | Proposal, lifecycle, attribution. Methods: `propose`, `approve`, `kill`, `graduate`, `attributeToTranscript`. | Playbook UI, transcript pipeline attribution pass |
| `InterventionEngine` | Data-driven intervention detection via applicability gate. Methods: `evaluateDeal(dealId)`, `proposeIntervention(dealId, type)`. | Scheduled health check, post-pipeline hook |
| `SurfaceAdmission` | Reads candidates from intelligence tables, applies applicability + thresholds, scores for ordering, filters dismissals. Methods: `admit(surfaceId, userId, dealId?)`. | Every UI surface that renders AI insights |
| `AgentConfigService` | Config reads, version writes, proposal queue. Methods: `get`, `applyProposal`, `createProposal`, `listPending`. | Agent config page, classifier output path |
| `FormatterService` | Currency, dates, names, stages, enum labels. Single source of truth. ([DECISIONS.md 2.13](DECISIONS.md)) | Every UI component |
| `CrmAdapter` (interface) | Abstract CRM access. One implementation (`HubSpotAdapter`). | All deal/contact/company operations |

Routes are thin wrappers. The logic is in services. Two routes wanting the same behavior import the same service function — they do not `fetch()` each other.

---

## Section 5 — The Rivet Question — RESOLVED

**Rivet is REMOVED.** Per [DECISIONS.md 2.6](DECISIONS.md) and [09-CRITIQUE.md §3.1](09-CRITIQUE.md). Codex does not install `rivetkit`, `@rivetkit/next-js`, `@rivetkit/react`, or any related package.

v1's Rivet surface was a facade: 18 actor actions that returned `""`, `null`, `false`, or `{}`; `state: {}` empty; 6 exported interfaces stubbed for backward compat; zero runtime persistence. The single durable use case (transcript workflow) is replaceable by a sequence of `jobs` rows.

Replacements, one-to-one:

| v1 Rivet responsibility | v2 replacement |
|---|---|
| Per-deal state accumulation (`deal_agent.ts` state, learnings, competitive context) | Append rows to `deal_events`; read via `DealIntelligence.getDealState(dealId)` ([DECISIONS.md 2.16](DECISIONS.md)) |
| Durable transcript workflow (`transcript-pipeline.ts` `ctx.loop()` + `loopCtx.step()`) | Postgres `jobs` row per transcript; worker executes each of 6–8 steps sequentially, writes `job_results`. Durable via DB, not via actor memory. ([DECISIONS.md 2.6, 2.24](DECISIONS.md)) |
| Scheduled health checks (`c.schedule.after(30_000)` in deal-agent) | `pg_cron` with SQL function `run_deal_health_checks()` executing nightly + on-demand trigger |
| Cross-deal intelligence coordinator (`intelligence-coordinator.ts`) | `coordinator_patterns` table as authoritative store; `pg_cron` scheduled synthesis job + on-demand call from API/service. Call prep directly reads `coordinator_patterns`. ([DECISIONS.md 2.17](DECISIONS.md)) |
| WebSocket broadcasts (`broadcast("workflowProgress")`) | Supabase Realtime channel on `jobs` table status column. Browser subscribes; no custom WebSocket transport. |

Codex deletes from v1: `apps/web/src/actors/*`, `apps/web/src/app/api/rivet/[...all]/route.ts`, `apps/web/src/lib/rivet.ts`, `apps/web/src/lib/rivet-actor-cleanup.ts`, and the three scaffolding scripts in `apps/web/scripts/`.

### The one concession: call-prep auto-brief on pipeline completion

v1 had an auto-call-prep step at the end of the transcript pipeline ([09-CRITIQUE.md §3.8](09-CRITIQUE.md)) that was removed because "Rivet Cloud → Vercel → Claude chain timed out." In v2, the equivalent is a separate `jobs` row of type `call_prep_generate` enqueued by the last step of the transcript pipeline job. No single job holds two Claude calls' worth of budget; each is an independently-queued, independently-resumable unit.

### Why not Inngest, Trigger.dev, or Temporal?

Codex may be tempted by a hosted job service. Don't. Three reasons:

1. **Vercel + Supabase + one more external service adds a third blast radius.** Jobs table + pg_cron + Realtime all live in the Supabase blast radius Codex already owns. One less vendor to go down at demo time.
2. **The demo workload is small.** ~10 deals × ~5 transcripts/demo × 7 pipeline steps = 350 job executions in a full demo run. Postgres handles this trivially.
3. **`pg_cron` + `FOR UPDATE SKIP LOCKED` gives Codex durable scheduling + work-stealing without a second runtime.** The entire jobs system is ~200 LOC of Postgres + TypeScript.

The hosted-job alternative becomes interesting at production scale with many concurrent users. That's a post-demo problem.

---

## Section 6 — Phase Plan

Each phase: goal, deliverables, exit criteria, scope, dependencies, references. Estimates assume focused Codex work; no parallel human work assumed.

### Phase 1 — Foundation

- **Goal:** The skeleton stands. Auth, schema, job infrastructure, CRM adapter, CI/CD. No user-visible features yet.
- **Deliverables:**
  1. Next.js 14 + Turborepo monorepo scaffolded at `~/nexus-v2`
  2. Supabase project provisioned; Drizzle wired; full v2 schema migrated
  3. Supabase Auth + RLS on every Nexus table; seed users for the 14-person demo org
  4. `jobs` + `job_results` + worker endpoint + `pg_cron` + Supabase Realtime smoke test
  5. Unified Claude client + `packages/prompts/` loader + first ported prompt (#21)
  6. `CrmAdapter` interface + `HubSpotAdapter` skeleton + HubSpot workspace provisioned per [07C Section 8](07C-HUBSPOT-SETUP.md)
  7. First end-to-end flow: one seeded deal in HubSpot, mirrored in `hubspot_cache`, rendered by minimal UI
- **Exit criteria:**
  - `pnpm dev` runs; deal-list page loads; seeded deal visible.
  - A no-op job enqueued via API completes, status broadcasts to the browser via Realtime.
  - Calling the wrapped Claude client against a fixture transcript with prompt #21 returns a valid tool-use response.
  - Creating a deal via `HubSpotAdapter.createDeal()` appears in HubSpot UI within 5s and in Nexus cache within 15s (webhook path).
- **Estimated scope:** ~5 days (see [Section 8](#section-8--the-first-week)).
- **Dependencies:** Jeff provides HubSpot portal + private app credentials on Day 5.
- **Key references:** [DECISIONS.md 2.1, 2.2, 2.6, 2.9, 2.13, 2.18](DECISIONS.md); [07B-CRM-BOUNDARY.md](07B-CRM-BOUNDARY.md); [07C-HUBSPOT-SETUP.md §8](07C-HUBSPOT-SETUP.md); [04C-PROMPT-REWRITES.md](04C-PROMPT-REWRITES.md) Rewrite 1.

### Phase 2 — Core CRUD

- **Goal:** Deals are real. A rep can create a deal, see it in a pipeline view, open it, edit MEDDPICC, manage stakeholders, walk it through stages. First demoable moment.
- **Deliverables:**
  1. `DESIGN-SYSTEM.md` delivered by Jeff (between Phase 1 and Phase 2 — [DECISIONS.md 3.1](DECISIONS.md)); Codex populates Tailwind tokens, font loading, primitive re-skinning
  2. Pipeline view (kanban + table) reading from `hubspot_cache` via `CrmAdapter.listDeals()`
  3. Deal-creation UI (per [DECISIONS.md 1.13](DECISIONS.md)) — first-class surface
  4. Deal detail page with tabs: overview, MEDDPICC, stakeholders, activity feed (native HubSpot engagements)
  5. MEDDPICC edit UI — inline, writes through `meddpicc_scores` service + HubSpot custom properties
  6. Stakeholder management UI — adds/removes contacts, assigns roles via `deal_contact_roles`
  7. Stage change UI with Close Won / Close Lost outcome stubs (close-lost interview lands in Phase 5)
  8. Declarative nav registry; sidebar reads from it ([DECISIONS.md 2.22c](DECISIONS.md))
- **Exit criteria:**
  - Create a deal from the UI. Confirm it exists in HubSpot and in `hubspot_cache`.
  - Edit MEDDPICC, see the change write to both tables and the HubSpot custom properties.
  - Move a deal from Discovery to Proposal. See `deal_events` row with `type='stage_changed'`.
  - Every client component file ≤400 LOC.
- **Estimated scope:** ~4 days.
- **Dependencies:** `DESIGN-SYSTEM.md` from Jeff; Phase 1 complete.
- **Key references:** [DECISIONS.md 1.9, 1.13, 2.22, 2.23](DECISIONS.md); [06-UI-STRUCTURE.md](06-UI-STRUCTURE.md); [07B Section 3 (services)](07B-CRM-BOUNDARY.md).

### Phase 3 — AI Features

> **Reconciliation banner (Phase 3 Day 2 Session B, 2026-04-22).** Status: deliverable 1's prompt-number references drifted from the PORT-MANIFEST.md structure during 04C authoring. Corrections authoritative below; original body preserved as the design-intent trail:
>
> **Step 3 parallel-analysis prompts (corrected numbering per PORT-MANIFEST.md):**
> - (a) **MEDDPICC scoring → prompt #20** (`pipeline-score-meddpicc.md`, PORT-WITH-CLEANUPS). Original text says "#15 / rewritten" — that's Deal Fitness, NOT MEDDPICC (see below).
> - (b) signal detection → prompt #21 (`01-detect-signals.md`, REWRITTEN). ✓ accurate.
> - (c) **action extraction → prompt #19** (`pipeline-extract-actions.md`, PORT-WITH-CLEANUPS). Original text says "#2 / ported" — that's Cluster Semantic Match, a distinct prompt for the observation-clustering pipeline, NOT action extraction.
>
> **Deal Fitness (#15 → `05-deal-fitness.md`, REWRITTEN) is a separate on-demand analysis track**, NOT part of the per-transcript pipeline step 3. Invoked on demand against a deal's full conversation history (via a dedicated job type or direct service call when the Deal Fitness page renders), not as part of the transcript_pipeline job.
>
> v2-canonical wiring lives in `packages/shared/src/jobs/handlers.ts` (landed Phase 3 Day 2 Session B `7f1b3f8`). Day 2 shipped step 3 detect-signals-only; score-meddpicc + extract-actions ports Phase 3 Day 3+.

- **Goal:** Pillar 1. Transcript processing pipeline runs. Call prep assembles. Email drafts work. Observations classify. The 8 rewritten prompts ship.
- **Deliverables:**
  1. Transcript pipeline as a `jobs` row of type `transcript_pipeline`. 7 sequential steps, each writing a `job_results` row:
     - **Step 1 — `ingest`:** Load transcript from `transcripts`; validate length + speaker count; write `transcript_ingested` event.
     - **Step 2 — `preprocess`:** `TranscriptPreprocessor` service runs once, writes canonical `analyzed_transcripts` row (speaker-turn segmented, competitor mentions normalized, company/contact entities resolved to HubSpot IDs). Consumed by every subsequent step — no re-parsing.
     - **Step 3 — `analyze` (parallel):** Three Claude calls via `Promise.all` — (a) MEDDPICC scoring (prompt #15 / rewritten), (b) signal detection (prompt #21 / rewritten), (c) action extraction (prompt #2 / ported). Each uses tool-use schemas. _[See reconciliation banner above — corrected numbering is #20 / #21 / #19; Deal Fitness #15 is a separate track.]_
     - **Step 4 — `persist`:** Write `meddpicc_scores` updates; write `signal_detected` events (one per signal); write HubSpot custom properties via `CrmAdapter.updateDealCustomProperties`. Idempotent by `(deal_id, dimension)` for MEDDPICC, by `(transcript_id, signal_hash)` for signals.
     - **Step 5 — `coordinator-signal`:** Send all `signal_detected` events from this transcript to the coordinator via direct service call (`IntelligenceCoordinator.receiveSignals(signals)`). Coordinator schedules its synthesis as a separate `coordinator_synthesis` job — pipeline does not block.
     - **Step 6 — `synthesize-theory`:** Prompt #14A continuous deal-theory update. Reads full event stream for the deal. Writes `deal_theory_updated` event.
     - **Step 7 — `draft-email`:** Prompt #12 / ported. Drafts follow-up email using the assembled context. Writes `email_drafted` event. Email draft is stored, not sent.
     - Terminal: mark job `succeeded`. If any step fails, job is `failed`; no "graceful degradation" that fakes success ([DECISIONS.md 2.24](DECISIONS.md)).
  2. Call-prep orchestrator service. Assembles 8+ intelligence layers: rep config, system intelligence, coordinator patterns (direct read from `coordinator_patterns`), MEDDPICC scores, contacts, recent activities (via `CrmAdapter.listEngagements`), transcripts, playbook experiments, deal theory. ([DECISIONS.md 2.17](DECISIONS.md))
  3. Email drafting — one service, one prompt file. Consolidates v1's two divergent email paths — [09-CRITIQUE.md §4](09-CRITIQUE.md).
  4. Observation capture UI (agent bar) with classification → entity extraction → cluster match → routing. Writes to `observations` + `observation_deals`.
  5. Workflow tracker UI subscribes to job status via Realtime channel on `jobs` table.
  6. All 8 rewritten prompts (+ #14 split) live. 17 port-verbatim prompts ported using the [04C Section 2](04C-PROMPT-REWRITES.md) Port Checklist.
  7. Observation follow-up flow (prompt #2 port) — when an observation has high coordinator impact, a give-back (prompt #9 / rewritten) generates inline.
- **Exit criteria:**
  - Upload the MedVista fixture transcript. Job completes in <90s. MEDDPICC updates in HubSpot custom properties. Signals observed in `deal_events`. Follow-up email drafted. Call prep brief generates with coordinator pattern cited.
  - All 25 prompts live under `packages/prompts/files/`. `grep -r 'anthropic.messages.create' apps/web/src/` returns hits only in `packages/shared/src/claude/client.ts`.
  - Every prompt response parsed via tool-use; no regex JSON extraction.
  - Calling `/api/agent/call-prep` with a deal that has a coordinator pattern returns a brief that cites the pattern in a dedicated section.
- **Estimated scope:** ~6 days.
- **Dependencies:** Phase 2 complete; `analyzed_transcripts` shape frozen.
- **Key references:** [04C-PROMPT-REWRITES.md](04C-PROMPT-REWRITES.md) Rewrites 1, 2, 8; [04B-PROMPT-DEPENDENCIES.md](04B-PROMPT-DEPENDENCIES.md); [05-RIVET-ACTORS.md](05-RIVET-ACTORS.md) (what the pipeline used to do); [07-DATA-FLOWS.md](07-DATA-FLOWS.md); [DECISIONS.md 2.13, 2.17, 2.24](DECISIONS.md).

### Phase 4 — Intelligence Layer

- **Goal:** Pillar 2. Cross-deal intelligence compounds. The coordinator runs and its outputs reach call prep.
- **Deliverables:**
  1. `deal_events` write-path from every intelligence-producing surface. Event types enumerated; schema frozen.
  2. `DealIntelligence` service — the only read/write interface. Snapshot generation via `pg_cron`. ([DECISIONS.md 2.16](DECISIONS.md))
  3. Observation clustering job (scheduled + on-demand) — semantic clusters via embeddings or prompt-based matching. Writes to `observation_clusters`.
  4. Coordinator synthesis job (`pg_cron` scheduled + on-demand from pipeline step). Pattern detection: 2+ deals same signal + same vertical. Writes to `coordinator_patterns` + `coordinator_pattern_deals`. ([DECISIONS.md 2.17](DECISIONS.md))
  5. Intelligence dashboard UI. Patterns tab reads `coordinator_patterns` with visible scores + reasoning. (Fixes v1 §3.2: coordinator write to call prep.)
  6. Cross-book intelligence view on `/book` (if applicable; evidence-gated).
  7. Applicability gating engine. `DealIntelligence.getApplicablePatterns(dealId)`, `.getApplicableExperiments(dealId)`, `.getApplicableFlags(dealId)`. Rejections logged to a diagnostic table. ([DECISIONS.md 2.21](DECISIONS.md))
  8. Surfaces registry: TypeScript module defining each surface + threshold rules + max item counts + empty-state UI. ([DECISIONS.md 2.26](DECISIONS.md))
- **Surfaces registry shape** (Phase 4 Day 2):

  ```ts
  // packages/shared/src/surfaces/registry.ts
  export const SURFACES = {
    call_prep_brief: {
      admission: { minScore: 70, appliesWhenStageIn: ['discovery', 'tech_val', 'proposal', 'negotiation'] },
      maxItems: { patterns: 3, risks: 5, experiments: 2 },
      emptyState: 'CallPrepEmptyState',
    },
    intelligence_dashboard_patterns: {
      admission: { minDealsAffected: 2, minAggregateArr: 500_000 },
      maxItems: 20,
      emptyState: 'PatternsEmptyState',
    },
    daily_digest: {
      admission: { minScore: 75, maxAgeHours: 24 },
      maxItems: 5,
      emptyState: 'DigestNothingNewState',
    },
    deal_detail_intelligence: {
      admission: { dealSpecific: true, minScore: 60 },
      maxItems: 10,
      emptyState: 'DealDetailEmptyState',
    },
  } as const;
  ```

- **Exit criteria:**
  - Process a transcript on deal A. Process one on deal B (same vertical, same competitor mention). Coordinator detects pattern. Next call prep on deal A cites the pattern with visible score + explanation.
  - Dashboard's Patterns tab empty state reads "Nothing to show yet" — not broken, intentional.
  - Every surface renders through `SurfaceAdmission.admit(surfaceId, userId, dealId?)`. No hand-rolled filtering logic in components.
  - Toggling a deal's stage backward (e.g., Proposal → Discovery) flips applicability gates correctly — patterns that were surfacing disappear from the brief.
- **Estimated scope:** ~5 days.
- **Dependencies:** Phase 3 complete; `deal_events` schema stable.
- **Key references:** [DECISIONS.md 2.16, 2.17, 2.21, 2.26](DECISIONS.md); [04C-PROMPT-REWRITES.md](04C-PROMPT-REWRITES.md) Rewrite 4; [09-CRITIQUE.md §3.2](09-CRITIQUE.md).

### Phase 5 — Agent Layer

- **Goal:** Pillar 3. Human directs AI. Configs are proposals. Close-lost is a research interview. Experiments gate by applicability. Interventions are data-driven.
- **Deliverables:**
  1. Agent config page: natural-language instructions editor + structured preferences. Writes via service through `agent_configs` + `agent_config_versions`.
  2. Agent config proposal queue UI — when classifier or feedback surfaces a suggestion, it lands in the queue. Human approves, then write lands. ([DECISIONS.md 2.25 #3](DECISIONS.md))
  3. Close-lost research-interview UI. Uses prompts #14A (continuous) and #14B (final deep pass). Hypothesis surfaces first, then dynamic questions, then open-ended narrative. Reconciliation stored as a learning signal. ([DECISIONS.md 1.1, 1.2](DECISIONS.md))
  4. Experiment lifecycle UI (preserve from v1 per [DECISIONS.md 1.3](DECISIONS.md)). `POST /api/experiments` endpoint. Soft-mode. Structured `applicability` JSONB.
  5. Experiment attribution pipeline — during transcript processing, classify whether the AE used the assigned experiment's tactic. Writes `experiment_attributions`.
  6. AgentIntervention engine — reads deal health score (computed from `deal_events`), runs applicability gate, creates structured intervention records when conditions met. No name checks. ([DECISIONS.md 1.14, 2.21](DECISIONS.md))
  7. Intervention UI — card on deal detail with one-click actions (adjust close date, flag risk, request help). Each action writes through a service.
  8. Agent feedback loop — thumb rating + "this is wrong" flow writes to `surface_feedback`.
  9. Daily digest job — `pg_cron` scheduled, writes per-user digest to `notifications` with "nothing new" handling. ([DECISIONS.md 1.15, 1.18, 2.26](DECISIONS.md))
- **Exit criteria:**
  - Mark HealthFirst Closed Lost. Hypothesis surfaces with at least 3 cited event IDs. Sarah answers questions; reconciliation persists.
  - Create an experiment. Assign to an AE. Process a transcript that matches the tactic. Attribution record lands.
  - An intervention fires on a deal based on structured signals (no name check). Dismiss it; confirm 7-day soft-resurface works.
- **Estimated scope:** ~5 days.
- **Dependencies:** Phases 3 + 4 complete; event stream has enough depth to support hypotheses.
- **Key references:** [DECISIONS.md 1.1, 1.2, 1.3, 1.5, 1.14, 1.15–1.18, 2.21, 2.25, 2.26](DECISIONS.md); [04C-PROMPT-REWRITES.md](04C-PROMPT-REWRITES.md) Rewrites 3, 6, 7.

### Phase 6 — Polish

- **Goal:** The demo is stunning. Per-feature design Mode 2 artifacts integrated on hero pages. Loading states, empty states, edge cases. Three-act demo runs clean.
- **Deliverables:**
  1. Mode 2 design integration ([DECISIONS.md 3.2](DECISIONS.md)) for hero pages: close-lost, intelligence dashboard, call prep brief, observation capture, deal detail, daily digest, empty-state treatments, score/reasoning surfaces.
  2. Loading states for every job-backed UI (skeleton + progress).
  3. Empty-state UIs — not afterthoughts; first-class per surface.
  4. Responsive design (1024px+ only; no mobile). Accessibility pass.
  5. Demo reset endpoint — rebuilt without `ILIKE '%MedVista%'` logic. Uses structured `demo_seed` markers on `deal_events`. ([DECISIONS.md 1.14](DECISIONS.md))
  6. The three-act demo scripted + rehearsed end-to-end.
  7. README, runbook, known-issues doc for Jeff post-demo.
- **Exit criteria:** Three-act demo runs clean in 15 minutes. Zero manual narration fills gaps. No broken UI states. No console errors. No "This is wrong" surfaces that shouldn't surface.
- **Estimated scope:** ~4 days.
- **Dependencies:** All prior phases complete; Mode 2 artifacts from Jeff for at least the 5 hero pages.
- **Key references:** [DECISIONS.md 3.2](DECISIONS.md); [06-UI-STRUCTURE.md](06-UI-STRUCTURE.md).

---

## Section 7 — Feature Prioritization

Every major feature from v1 or designed for v2, ranked into four tiers. "Feature" here means a user-visible capability or an architecturally significant surface.

### 7.1 MUST HAVE for demo (Phases 1–3)

- Auth + rep login (Phase 1)
- Pipeline view (kanban + table) (Phase 2)
- Deal creation UI ([DECISIONS.md 1.13](DECISIONS.md)) (Phase 2)
- Deal detail page (Phase 2)
- MEDDPICC edit UI ([DECISIONS.md 1.13](DECISIONS.md)) (Phase 2)
- Stakeholder management (Phase 2)
- Transcript upload + processing pipeline (Phase 3)
- Call-prep brief generator (Phase 3)
- Email drafting (Phase 3)
- Observation capture via agent bar (Phase 3)
- HubSpot sync (read + AI-property writeback) (Phase 1–3)
- Activity feed (native HubSpot engagements rendered) (Phase 2)

### 7.2 SHOULD HAVE for completeness (Phases 4–5)

- Intelligence dashboard with coordinator patterns (Phase 4)
- Cross-deal pattern detection + call-prep injection (Phase 4)
- Observation clustering (Phase 4)
- Deal fitness UI (port from v1 per [DECISIONS.md 1.9](DECISIONS.md)) (Phase 4)
- Playbook / experiments UI + creation backend (Phase 5)
- Experiment attribution from transcripts (Phase 5)
- Close-lost research-interview UI (Phase 5)
- AgentIntervention cards (data-driven) (Phase 5)
- Agent config + proposal queue (Phase 5)
- Daily digest (Phase 5)
- Surface dismissal + "this is wrong" feedback (Phase 5)
- `/book` post-sale portfolio view (Phase 4–5, data-permitting)
- MCP server (port from v1 — `/api/mcp`) (Phase 5 or defer)

### 7.3 NICE TO HAVE (Phase 6 or deferred)

- `/analyze` standalone streaming analyzer (port; low priority — not in main demo path)
- `/outreach` email sequences UI (port if time permits; not in main demo narrative)
- Prospect database (`/prospects`) — port; not in sidebar for v2
- `/calls` transcript library page — port; not in sidebar
- Admin threshold configuration UI ([DECISIONS.md 1.16](DECISIONS.md) deferred)
- Leadership feedback surfacing ([DECISIONS.md 1.17](DECISIONS.md) deferred)

### 7.4 CUT — does not rebuild

Each with evidence. Codex deletes or does not implement:

| Cut | Why |
|---|---|
| **Rivet actors** (`deal-agent`, `transcript-pipeline`, `intelligence-coordinator`, `registry`, `lib/rivet.ts`, `lib/rivet-actor-cleanup.ts`, `/api/rivet/[...all]/route.ts`) | [DECISIONS.md 2.6](DECISIONS.md); [09-CRITIQUE.md §3.1](09-CRITIQUE.md): 18 no-op actions, `state: {}`, zero persistence. |
| **Rivet scaffolding scripts** (`nuke-rivet-actors.ts`, `destroy-zombie-dealagent.ts`, `rotate-medvista-uuid.ts`) | [DECISIONS.md 2.6](DECISIONS.md); exist only to compensate for Rivet brittleness. |
| **`observations-client.tsx` (463 LOC)** | [DECISIONS.md 1.12](DECISIONS.md); [06-UI-STRUCTURE.md §5](06-UI-STRUCTURE.md): unreachable — `/observations` route is a redirect shell. |
| **`/agent-admin` page** | [DECISIONS.md 1.12](DECISIONS.md): placeholder with no content. |
| **`/team` page** | [DECISIONS.md 1.12](DECISIONS.md): placeholder with no content. |
| **`/observations` redirect shell** | [DECISIONS.md 1.12](DECISIONS.md): redirect-only, no UI. |
| **`/api/activities`** | [DECISIONS.md 1.10](DECISIONS.md); [09-CRITIQUE.md §3.14](09-CRITIQUE.md): zero callers. |
| **`/api/team-members`** | [DECISIONS.md 1.10](DECISIONS.md): zero callers. |
| **`/api/observation-routing`** | [DECISIONS.md 1.10](DECISIONS.md): zero callers. |
| **`/api/observations/clusters`** | [DECISIONS.md 1.10](DECISIONS.md): zero callers. |
| **`/api/demo/prep-deal`** | [DECISIONS.md 1.10](DECISIONS.md): zero callers. |
| **Table `deal_agent_states`** | [07B-CRM-BOUNDARY.md §1](07B-CRM-BOUNDARY.md); [DECISIONS.md 2.2](DECISIONS.md): replaced by `deal_events`. |
| **Table `agent_actions_log`** | [07B-CRM-BOUNDARY.md §1](07B-CRM-BOUNDARY.md); [DECISIONS.md 2.2](DECISIONS.md): subsumed by `deal_events`. |
| **Table `deal_stage_history`** | [07B-CRM-BOUNDARY.md §1](07B-CRM-BOUNDARY.md); [DECISIONS.md 2.2](DECISIONS.md): HubSpot owns stage history; Nexus stores AI-vs-human provenance on `deal_events`. |
| **Table `influence_scores`** | UI-only placeholder per CLAUDE.md Known Issues. |
| **Pipeline step 9 (15 no-op actor calls)** | [DECISIONS.md 2.24](DECISIONS.md); [09-CRITIQUE.md §3.7](09-CRITIQUE.md): pure latency tax. |
| **Playbook transition map entries `"promoted"` and `"retired"`** | [DECISIONS.md 2.23](DECISIONS.md); empty allowed-transition arrays — backward-compat with nothing. |
| **Hardcoded intervention trigger** (`deal.name.toLowerCase().includes("nordicmed")`) | [DECISIONS.md 1.14](DECISIONS.md); [09-CRITIQUE.md §3.4](09-CRITIQUE.md). |
| **`preClassified: true` trust flag** | [DECISIONS.md 2.11](DECISIONS.md); [09-CRITIQUE.md §3.12](09-CRITIQUE.md). |
| **Guided tour** | [DECISIONS.md 1.8](DECISIONS.md). |
| **Persona-switcher + `PersonaContext` in providers.tsx** | [DECISIONS.md 2.1](DECISIONS.md): real auth replaces it. |
| **`getEffectiveType()` legacy-type mapper in `activity-feed.tsx`** | [DECISIONS.md 2.2](DECISIONS.md): fixed by proper activity-type enum. |
| **`lib/analysis/prompts.ts` inline string prompt literals** | [DECISIONS.md 2.13](DECISIONS.md); Guardrail 19: becomes `.md` files. |
| **10 unused Radix/Tremor packages** | [09-CRITIQUE.md §9](09-CRITIQUE.md); [DECISIONS.md 2.22d](DECISIONS.md): one primitive library only. |

---

## Section 8 — The First Week

Day-by-day deliverables for Phase 1. Concrete, testable, no guesswork. If Codex has to ask Jeff a question to execute any of these days, this section failed.

### Day 1 — Project skeleton

**Location:** `~/nexus-v2` (fresh directory; not a branch of v1).

- Initialize pnpm + Turborepo monorepo
- Scaffold `apps/web` as a Next.js 14 TypeScript project (App Router, strict mode, Turbopack for dev)
- Scaffold `packages/db` (Drizzle + Postgres types), `packages/shared` (types, enums), `packages/prompts` (`.md` loader)
- Install base deps: `drizzle-orm`, `@anthropic-ai/sdk`, `zod`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`, `clsx`, `tailwind-merge`
- Install shadcn/ui and Radix primitives (one library — no Tremor)
- Configure Tailwind with **empty design-token placeholders** (populated in Phase 2 Day 1 after `DESIGN-SYSTEM.md`)
- Provision Supabase project ("nexus-v2"); capture `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Link Vercel project to GitHub repo; preview deploys working on every push to a branch
- `README.md` with setup instructions and required env vars
- `.env.example` with every env var name and a `REDACTED` value (use [08-SOURCE-INDEX.md §4](08-SOURCE-INDEX.md)'s pattern)
- Git commit with initial scaffold; push to main; confirm Vercel preview deploys clean

**Test at end of Day 1:** `pnpm dev` runs locally on port 3001; Vercel preview URL loads a blank Next.js page.

### Day 2 — Schema and auth

- Full v2 schema migrations applied via Drizzle — all tables from [Section 4.2](#42-nexus-authoritative-tables), all enums as proper Postgres enums per [Section 4.4](#44-enum-discipline)
- Define RLS policies on every Nexus-owned table (users see their own rows; admin role bypasses)
- Wire Supabase Auth: email + magic link flow
- Scaffold a minimal `/login` page, `/` landing, `/(dashboard)/layout.tsx` that requires auth
- Seed 14 users matching the demo-org personas: Sarah Chen, David Park, Ryan Foster, Marcus Thompson, Alex Kim, Lisa Park, Michael Torres, Rachel Kim + 6 more per [07B-CRM-BOUNDARY.md](07B-CRM-BOUNDARY.md) / v1 CLAUDE.md personas list
- Seed `team_members` + `support_function_members` rows with role + vertical specialization
- No deals, contacts, or companies yet — those come on Day 5

**Test at end of Day 2:** Log in via magic link as Sarah; see a gated `/dashboard` page that says "Logged in as sarah@nexus-demo.com" and nothing else. Confirm RLS blocks a second user from reading Sarah's row via the Supabase client.

### Day 3 — Job infrastructure

- `jobs` table (id, type, status enum: `queued|running|succeeded|failed`, input jsonb, result jsonb, error text, created_at, started_at, completed_at, user_id FK)
- `job_results` table (job_id FK, step_index, step_name, output jsonb, duration_ms, created_at)
- `GET /api/jobs/worker` endpoint (cron-triggered): polls for `queued` jobs, claims one via `UPDATE ... WHERE status='queued' FOR UPDATE SKIP LOCKED`, executes handler, writes result, updates status
- One test job type: `noop` — sleeps 2s, writes "hello" to result
- `pg_cron` installed via Supabase dashboard; schedule `/api/jobs/worker` every 10 seconds
- Supabase Realtime channel subscription in a minimal client hook: `useJobStatus(jobId)` returns `{status, result}` from a Postgres changes subscription on `jobs` table
- Minimal UI: a button that POSTs to `/api/jobs/enqueue` with `{type: 'noop'}`, gets back `{jobId}`, then subscribes and renders status

**Test at end of Day 3:** Click button → see "queued" → "running" → "succeeded" with result "hello" appear in the browser in under 20 seconds without a page refresh.

### Day 4 — Claude client wrapper + first ported prompt

- Build `packages/shared/src/claude/client.ts`: unified Claude wrapper with retry (exponential backoff 3x), structured telemetry logging, tool-use support, explicit `temperature` parameter, explicit `max_tokens`, explicit `model`. Export one function: `callClaude({ promptFile, vars, tool, temperature, maxTokens })`.
- Default temperatures per task type in the wrapper:
  - `classification`: 0.2
  - `synthesis`: 0.3
  - `voice`: 0.6
  - `voice_creative`: 0.7
- Build `packages/prompts/src/loader.ts`: reads `.md` files from `packages/prompts/files/`, parses YAML front-matter (model, temperature, max_tokens, tool_name, version), returns `{systemPrompt, userTemplate, frontmatter}`
- Create `packages/prompts/files/01-detect-signals.md` — copy from `docs/handoff/source/prompts/01-detect-signals.md` (the first rewritten prompt per [04C Rewrite 1](04C-PROMPT-REWRITES.md))
- Define the `detect_signals` tool-use schema in `packages/shared/src/claude/tools/detect-signals.ts` (import `SignalTaxonomy` enum from canonical module)
- Write an integration test: load a fixture transcript (`tests/fixtures/medvista-transcript.txt`, ~3500 words), call the wrapped client with prompt #21 + the tool, assert the response parses into a structured `Signal[]` array with valid enum values

**Test at end of Day 4:** `pnpm test` runs the integration test and passes. Confirm the telemetry log shows the model, temperature (0.2), input tokens, output tokens, duration.

### Day 5 — `CrmAdapter` + HubSpot foundation

- Define `packages/shared/src/crm/adapter.ts` — TypeScript interface per [07B-CRM-BOUNDARY.md Section 2](07B-CRM-BOUNDARY.md): `createDeal`, `getDeal`, `updateDeal`, `updateDealCustomProperties`, `listDeals`, `updateDealStage`, `getDealStageHistory`, `createContact`, `getContact`, `upsertContact`, `updateContact`, `updateContactCustomProperties`, `listDealContacts`, `setContactRoleOnDeal`, `createCompany`, `getCompany`, `upsertCompany`, `updateCompany`, `updateCompanyCustomProperties`, `listCompanies`, `logEngagement`, `listEngagements`, `bulkSyncDeals`, `bulkSyncContacts`, `bulkSyncCompanies`, `bulkSyncEngagements`, `parseWebhookPayload`, `handleWebhookEvent`, `invalidateCache`, `healthCheck`, `resolveDeal`, `resolveStakeholder`.
- Define error subclasses: `CrmNotFoundError`, `CrmAuthError`, `CrmRateLimitError`, `CrmValidationError`, `CrmTransientError`.
- Implement `HubSpotAdapter` skeleton with method signatures + auth (private app token from env) + rate-limit handler (respect 100 req / 10s burst, 250k/day).
- **Run [07C-HUBSPOT-SETUP.md Section 8](07C-HUBSPOT-SETUP.md) playbook Steps 1–10:**
  - Step 1 (Jeff, pre-Day-5): Signs up for HubSpot Starter, gives Codex portal ID + private app token + client secret via encrypted channel
  - Step 4 (Codex): Create "Nexus Sales" pipeline + 9 stages; write stage IDs to `apps/web/src/config/hubspot-pipeline-ids.json`
  - Step 5: Create `nexus_intelligence` property group; create all 38 custom properties via the `HUBSPOT_CUSTOM_PROPERTIES` array defined in `packages/shared/src/crm/hubspot/properties.ts`
  - Step 6: Subscribe to 12 webhook events
  - Step 7 (minimal for Day 5): Seed ONE company (MedVista), ONE contact (Dr. Michael Chen, Chief of Surgery), ONE deal (MedVista Epic Integration, $2.4M, Discovery) via `bulkSync*` batch endpoints
  - Step 9: Pre-warm cache via `bulkSyncDeals` + `bulkSyncContacts` + `bulkSyncCompanies`
- Minimal UI: a `/pipeline` page that reads from `hubspot_cache` via `CrmAdapter.listDeals()` and renders a table with columns: name, company, stage, value, close date
- Smoke test: update MedVista's stage in HubSpot UI → webhook fires → `hubspot_cache` row updates → next `/pipeline` page refresh shows new stage

**Test at end of Day 5:** Navigate to `/pipeline` after logging in as Sarah. See exactly one row: "MedVista Epic Integration — MedVista — Discovery — $2,400,000 — [today+55d]". Update the stage in HubSpot; confirm the change reflects in the UI within 15 seconds.

**Phase 1 exit criteria (end of Day 5):** All four Phase 1 exit criteria from [Section 6](#phase-1--foundation) pass. Codex commits + pushes; Vercel preview deploys clean. Jeff reviews.

### Buffer — Day 6-7 if needed

If Day 5 slips (HubSpot provisioning delay, webhook debugging, schema migration ordering issues), Day 6-7 absorb the slip without compressing Phase 2. Do not skip Phase 1 deliverables to hit Phase 2 on calendar. A half-complete foundation makes every subsequent phase worse.

Legitimate use of Day 6-7:
- Webhook signature verification debugging
- RLS policy refinement after first auth test
- Prompt #21 fixture calibration if the first Claude call returns lower-quality signals than expected
- Supabase connection pooling tuning

Not legitimate:
- Starting on pipeline UI work
- Adding non-foundation features
- "While I'm here" refactors

Day 6-7 are buffer, not opportunity.

---

## Section 9 — Prompts: Port and Rewrite Strategy

Per [DECISIONS.md 2.7](DECISIONS.md) and [04C-PROMPT-REWRITES.md](04C-PROMPT-REWRITES.md).

### 9.1 Inventory

- **25 total prompts** (from [04-PROMPTS.md](04-PROMPTS.md))
- **8 rewritten** (produces 9 `.md` files — #14 splits into #14A + #14B):
  - `01-detect-signals.md` (rewrite of #21)
  - `02-observation-classification.md` (rewrite of #1)
  - `03-agent-config-proposal.md` (rewrite of #4)
  - `04-coordinator-synthesis.md` (rewrite of #25 — fixes `system: ""` anomaly)
  - `05-deal-fitness.md` (rewrite of #15)
  - `06a-close-analysis-continuous.md` (rewrite of #14A — per-touchpoint theory update)
  - `06b-close-analysis-final.md` (rewrite of #14B — VP-grade close hypothesis on close)
  - `07-give-back.md` (rewrite of #9)
  - `08-call-prep-orchestrator.md` (rewrite of #11 — decomposed into orchestrator + 10 sub-prompts)
- **17 port-verbatim**: #2, #3, #5, #6, #7, #8, #10, #12, #13, #16, #17, #18, #19, #20, #22, #23, #24

### 9.2 Rewritten prompts — already staged

`docs/handoff/source/prompts/*.md` contains the 9 rewritten files ready for drop-in. Codex copies them to `packages/prompts/files/` with zero transformation except wiring (tool schema registration, consumer services).

### 9.3 Port checklist for the 17 verbatim ports

Per [04C-PROMPT-REWRITES.md Section 2](04C-PROMPT-REWRITES.md):

1. Move inline string literal to `packages/prompts/files/<NN>-<feature>.md`
2. Add YAML front-matter: `model`, `temperature`, `max_tokens`, `tool_name`, `version`
3. Set temperature per task type (0.2 classification / 0.3 synthesis / 0.5–0.7 voice)
4. Convert output parsing from JSON-in-text to tool-use schema
5. Import enums from canonical modules (`SignalTaxonomy`, `OdealCategory`, `CloseFactorTaxonomy`, `MeddpiccDimension`, `DealStage`, `Vertical`)
6. Assemble context via service functions — no `JSON.stringify` of upstream outputs
7. Add explicit edge-case handling (empty data, conflicting evidence, low confidence)
8. Add anti-hallucination scaffolds where applicable
9. Name the voice/tone for user-facing outputs
10. Enforce length bounds via tool schema `maxItems`, `maxLength`
11. Verify every output field has a named downstream consumer (if not — delete the field)
12. Stamp version in front-matter

### 9.4 Versioning

Every prompt file carries `version: X.Y.Z` in front-matter. Change increments:
- **Patch (X.Y.Z+1):** typo fix, wording tweak, no semantic change
- **Minor (X.Y+1.0):** new output field with backward-compatible default, new edge case handled
- **Major (X+1.0.0):** breaking output-shape change; consumers must update in lockstep

---

## Section 10 — What NOT to Build

Codex will be tempted to build these. Do not.

1. **Rivet.** Do not install `rivetkit`, `@rivetkit/next-js`, or `@rivetkit/react`. Do not create `apps/web/src/actors/`. ([DECISIONS.md 2.6](DECISIONS.md))
2. **Role-based permissions or multi-user surfacing policies.** ([DECISIONS.md 1.8](DECISIONS.md))
3. **Multi-tenancy.** Single demo org only. ([DECISIONS.md 1.8](DECISIONS.md))
4. **A guided tour.** Removed in v1; not part of v2. ([DECISIONS.md 1.8](DECISIONS.md))
5. **Admin UI for threshold configuration.** Hardcoded thresholds ship in v1. ([DECISIONS.md 1.16](DECISIONS.md))
6. **The three dropped tables** (`deal_agent_states`, `agent_actions_log`, `deal_stage_history`). ([07B-CRM-BOUNDARY.md](07B-CRM-BOUNDARY.md))
7. **The five dead API routes** (`/api/activities`, `/api/team-members`, `/api/observation-routing`, `/api/observations/clusters`, `/api/demo/prep-deal`). ([DECISIONS.md 1.10](DECISIONS.md))
8. **Placeholder pages** (`/agent-admin`, `/team`, `/observations` redirect shell). ([DECISIONS.md 1.12](DECISIONS.md))
9. **`observations-client.tsx`** (463 LOC orphan). ([DECISIONS.md 1.12](DECISIONS.md))
10. **Toast notifications for meaningful AI output.** AI outputs render inline. Toasts are for non-meaningful status only. ([DECISIONS.md Guardrail 9](DECISIONS.md))
11. **Hand-built modals or dropdowns.** Use shadcn/Radix primitives. ([DECISIONS.md 2.22d](DECISIONS.md))
12. **Inline hex colors, fonts, or backgrounds.** Design tokens only. ([DECISIONS.md 2.22a](DECISIONS.md))
13. **JSON-in-text parsing.** Tool-use schemas only. ([DECISIONS.md 2.13](DECISIONS.md))
14. **Name-based scaffolding.** No `deal.name.includes(...)`. No `ILIKE '%MedVista%'`. Demo data gets flagged via structured columns. ([DECISIONS.md 1.14](DECISIONS.md))
15. **Client-controlled trust flags.** No `preClassified: true` style bypasses. ([DECISIONS.md 2.11](DECISIONS.md))
16. **Auto-writing agent configs.** Proposals only. ([DECISIONS.md 2.25 #3](DECISIONS.md))
17. **Duplicated services.** One email drafter. One fuzzy deal resolver. One transcript preprocessor. ([DECISIONS.md 2.10, 2.13](DECISIONS.md))
18. **A second UI primitive library.** shadcn/Radix only; no Tremor, no MUI, no Chakra. ([DECISIONS.md 2.22d](DECISIONS.md))
19. **Client files over ~400 LOC.** If you hit it, split. ([DECISIONS.md 2.22b](DECISIONS.md))
20. **"Graceful degradation" that marks a failed step as complete.** A step fails → the job fails. The UI shows the failure. ([DECISIONS.md 2.24](DECISIONS.md); [09-CRITIQUE.md §4.12](09-CRITIQUE.md))
21. **In-app push notifications, banners, or real-time alerts.** Ambient + digest only. ([DECISIONS.md 1.15](DECISIONS.md))
22. **Writes to `hubspot_cache` from anywhere except the webhook handler or `bulkSync*` methods.** The cache is read-through, not a dual-persistence target.

---

## Section 11 — IP Migration: What Survives Verbatim

v2 preserves the product IP without change. Only the implementation changes.

### 11.1 Preserved verbatim

- **All 25 prompts** from [04-PROMPTS.md](04-PROMPTS.md), either as rewrites (9 files in `docs/handoff/source/prompts/`) or ports using the [04C Section 2](04C-PROMPT-REWRITES.md) Port Checklist.
- **The 21 Nexus frameworks** from v1 CLAUDE.md — adapted to the new stack but preserved as principles (Framework 21 interaction patterns, three-act demo narrative, the 8 intelligence layers in call prep, etc.).
- **Vertical-specific demo data**: Healthcare, Financial Services, Technology (Life Sciences), Retail. Same vertical distribution, same key accounts (MedVista, NordicMed, TrustBank, PharmaBridge, HealthFirst, HealthBridge, MedTech Solutions, NordicCare, Atlas Capital, plus Sarah Chen's 18 post-close accounts).
- **The 14-person demo org + support personas** — recreated across HubSpot (users + contacts) and Nexus (`users`, `team_members`, `support_function_members`).
- **Framework 21 interaction patterns**: chip cards, inline responses, sparkle give-backs, expandable reasoning.
- **The three-act demo narrative**: Act 1 (morning digest + deal workflow), Act 2 (cross-deal intelligence), Act 3 (close-lost research interview).
- **MEDDPICC as the qualification backbone.** Same 7 dimensions, same confidence scoring.
- **oDeal as the fitness framework.** Same 25 inspectable events across 4 categories (Business/Emotional/Technical/Readiness).

### 11.2 Changes freely (implementation, not spec)

- Component file organization (split mega-components into ~400 LOC units)
- API route structure (consolidate duplicated resolvers; add service layer)
- State management patterns (RSC-first; minimal client state)
- Styling approach (tokens instead of inline hex; `DESIGN-SYSTEM.md` replaces v1's Anthropic palette)
- Data boundary (HubSpot system of record; Nexus intelligence overlay)
- Infrastructure (jobs replace actors; Realtime replaces custom WebSockets)

---

## Section 12 — Risks and Mitigations

### 12.1 HubSpot free-tier / rate-limit hitting ceiling

- **Risk:** Demo reset without batching triggers ~170 calls in 20s → over the 100 req/10s burst limit → demo fails mid-reset.
- **Mitigation:** Follow [07C Section 7.5](07C-HUBSPOT-SETUP.md) batching pattern — use `batch/create`, `batch/update`, `batch/read` endpoints for every high-volume operation. Coalesce per-deal property writes into a single `updateDealCustomProperties` call with all 38 properties. Full reset post-batching: ~10 API calls. Rate-limit handler in `HubSpotAdapter` backs off on 429 with exponential retry.

### 12.2 `DESIGN-SYSTEM.md` not ready when Phase 2 starts

- **Risk:** Phase 2 UI work blocked by missing design tokens. Codex either waits (wasted days) or builds against placeholder tokens and re-skins later (rework).
- **Mitigation:** Phase 1 ships with empty-but-working token scaffolding. If design slips 1–2 days, Codex starts Phase 2 with neutral greyscale tokens + neutral typography, moves through all layout/structure work, and re-skins once `DESIGN-SYSTEM.md` lands. Layout work is unaffected by visual tokens.

### 12.3 Event-sourced intelligence performance on large demos

- **Risk:** `deal_events` grows unbounded; call prep queries 100+ events per deal; performance degrades visibly in demo.
- **Mitigation:** [DECISIONS.md 2.16](DECISIONS.md) snapshots. `pg_cron` job runs nightly, materializes per-deal snapshot from events. `DealIntelligence.getDealState(dealId)` reads the snapshot + events since snapshot timestamp. Demo data volume (~10 deals, ~50 events/deal) is well within raw-query performance anyway; snapshot path protects future scale and is cheap to implement.

### 12.4 Supabase Auth + RLS friction during rapid iteration

- **Risk:** RLS policies block legitimate queries during development; Codex can't diagnose because errors are opaque.
- **Mitigation:** Ship an admin role from day one with a documented `.env.local` flag (`DEV_ADMIN_USER_ID`) that bypasses RLS in server-side queries during development only. Never ships to production. Every RLS policy has a comment citing the query pattern it protects.

### 12.5 Applicability gating producing false negatives

- **Risk:** Insights are correctly detected but filtered out by over-aggressive applicability rules; UI looks empty; demo falls flat.
- **Mitigation:** [DECISIONS.md 2.21](DECISIONS.md) rejection logging. Every gate rejection writes to a diagnostic table (`applicability_rejections` — user_id, insight_id, gate_name, rule_evaluated, reason). Dashboard-internal tool (admin-only) surfaces rejection frequencies so Codex can tune thresholds. Ship conservative (high-admission) thresholds for demo; tighten later.

### 12.6 Prompt cost blowing up in continuous deal-theory mode

- **Risk:** Per [DECISIONS.md 1.1](DECISIONS.md), every transcript and email triggers a lightweight deal-theory update. At 100 deals × 5 touchpoints/week × $0.10/call = ~$200/week Claude spend during demo period. Not a production risk, but a cost-surprise risk.
- **Mitigation:** Cost is not a constraint per [DECISIONS.md 1.1](DECISIONS.md) / Guardrail 10 — but telemetry logs every call with token counts + cost estimate, so Codex has visibility. If spend is ballooning during development, the prompt wrapper has a `DEV_COST_CEILING` env-var kill switch that fails calls over threshold.

### 12.7 HubSpot webhook reliability for demo-sensitive sync

- **Risk:** HubSpot webhooks have SLA but occasional delays; demo moment where "update in HubSpot → reflects in Nexus in 5s" stalls at 30s.
- **Mitigation:** 15-minute `pg_cron` sync (per [07C Section 8 Step 12](07C-HUBSPOT-SETUP.md)) catches any missed webhook. Manual refresh button on `/pipeline` forces `bulkSyncDeals()` — demo bailout. Webhook handler idempotent so duplicates from periodic sync are fine.

### 12.8 Demo reset brittleness under schema evolution

- **Risk:** Demo reset endpoint needs to clear every v2 table in correct FK order; adding a new table without updating reset breaks the demo.
- **Mitigation:** Reset uses a declarative list of tables + order in `apps/web/src/config/demo-reset-manifest.ts`. Every new Nexus-authoritative table added to this manifest in the same commit. Reset also uses structured `demo_seed: true` column markers rather than name-based filters ([DECISIONS.md 1.14](DECISIONS.md)).

### 12.9 HubSpot private-app token scope / permission gaps

- **Risk:** Jeff provisions the private app with a narrow scope; Codex hits runtime "insufficient permissions" errors mid-build on Day 5; unclear which scope to add without re-reading HubSpot docs.
- **Mitigation:** `07C Section 2` (or equivalent) enumerates exact scopes needed: `crm.objects.deals.read/write`, `crm.objects.contacts.read/write`, `crm.objects.companies.read/write`, `crm.schemas.deals.write` (for custom property creation), `crm.schemas.contacts.write`, `crm.schemas.companies.write`, `engagements.read`, plus webhook subscription scopes. Pre-flight health check in `HubSpotAdapter.healthCheck()` verifies each scope on startup; fails fast with a human-readable missing-scope error rather than an opaque 403 mid-operation.

### 12.10 Prompt output parsing drift when a prompt is updated

- **Risk:** Codex updates a prompt's output tool schema; a downstream consumer expects the old field shape; silent mismatch produces broken UI or empty sections.
- **Mitigation:** Tool-use schemas live in `packages/shared/src/claude/tools/` as Zod (or equivalent) schemas — consumed by both the prompt wrapper (for validation) and the consuming service (for typing). Schema version in prompt front-matter MUST match consumer's imported schema version; mismatch throws at startup. No silent drift.

---

## End of Plan

Codex: execute Section 8 starting Day 1 after Jeff confirms this plan. Proceed through Phases 1–6 in order. Reference DECISIONS.md Guardrails as hard constraints throughout. When you hit a choice not covered here, re-read the referenced extraction doc before making it.

**No more Jeff conversations required mid-build.**

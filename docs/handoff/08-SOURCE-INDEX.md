# 08 — Source Index

> **Reconciliation banner (added 2026-04-22).** Status: **FROZEN — archival index.** 138 files under `source/` are the v1 codebase snapshot at commit `246c45f`. Read-only reference — v2 does not import from here. Section 3's v2-ready prompts (9 rewrites + PORT-MANIFEST.md) will have moved to `~/nexus-v2/packages/prompts/files/` at Phase 3 Day 1 kickoff per `docs/PRE-PHASE-3-FIX-PLAN.md` §6; handoff copies stay archival.

---

Index of every source file copied into `docs/handoff/source/` plus the v2-ready prompt staging. Per DECISIONS.md 2.7, copied source files are identical to originals — do not modify. Per DECISIONS.md 2.10 / 2.12 / 2.13, many of these routes/components get replaced by service functions in v2; cross-references below point to the applicable decision.

Generated 2026-04-21 from commit `246c45f` (see `README.md` header).

## Section 1: Directory Layout

```
source/
├── .env.example  (in config/ — redacted, see §4)
├── api/                          41 route.ts files (see §2.1)
├── components/                   30 UI components (see §2.2)
│   ├── analyzer/                 9 /analyze sub-components
│   ├── feedback/                 1 rating widget
│   ├── layout/                   2 shell components
│   └── route-clients/            12 per-route client components
├── config/                       13 build/workspace config files + .env.example (see §2.3)
│   ├── apps/web/                 Next.js app configs
│   └── packages/{db,shared}/     Workspace package configs
├── lib/                          10 shared libs (see §2.4)
│   └── analysis/                 4 /analyze helpers
├── pages/                        17 page.tsx server components (see §2.5)
│   └── (dashboard)/              Dashboard routes
├── prompts/                      9 rewritten prompts + PORT-MANIFEST.md (see §3)
├── rivet/                        5 actor files + 1 handler route (see §2.6)
├── schema/                       1 file — Drizzle schema (see §2.7)
└── types/                        2 shared types files (see §2.8)
```

Full file listing: run `find docs/handoff/source -type f | sort` (131 files total).

## Section 2: File Index

One line per copied file. Decision references in brackets refer to `DECISIONS.md`.

### 2.1 `source/api/` — API Routes (41 files)

Every `route.ts` from `apps/web/src/app/api/` preserving directory structure. Per DECISIONS.md 2.10 + 2.12, any domain concept with 2+ write sites goes through a service function in v2; routes become thin wrappers. Per 2.9 every v2 route declares `maxDuration` explicitly.

| File | Purpose / v2 direction |
|---|---|
| `api/activities/route.ts` | GET recent activities with joins. Dead-code candidate per DECISIONS.md 1.10. |
| `api/agent/call-prep/route.ts` | POST generate call brief (prompt #11). In v2 this becomes `services/call-prep/orchestrator.ts` (see prompt `08-call-prep-orchestrator.md`). |
| `api/agent/configure/route.ts` | POST/PUT interpret/save agent config via Claude (prompt #13). In v2 config mutations are proposals per DECISIONS.md 2.25 #3. |
| `api/agent/draft-email/route.ts` | POST generate email draft (prompts #12/#18/#24 consolidate — see PORT-MANIFEST `email-draft.md`). |
| `api/agent/feedback/route.ts` | POST create feedback request from rating. |
| `api/agent/save-to-deal/route.ts` | POST save agent action as deal activity. |
| `api/analyze/link/route.ts` | POST save analysis as deal activity (`/analyze` standalone tool). |
| `api/analyze/route.ts` | POST stream transcript analysis via Claude (prompt #5). |
| `api/book/route.ts` | GET AE's full post-close book. |
| `api/companies/route.ts` | GET all companies. In v2 served via `CrmAdapter`. |
| `api/customer/outreach-email/route.ts` | POST generate customer outreach email (prompt #18 → consolidates into `email-draft.md`). |
| `api/customer/qbr-prep/route.ts` | POST generate QBR agenda via Claude (prompt #17). 07C security fix: server-side context query. |
| `api/customer/response-kit/route.ts` | POST generate AI response kit for customer message (prompt #16). |
| `api/deal-agent-state/route.ts` | GET+POST deal agent memory CRUD. In v2 event-sourced per 2.16 (`deal_events`/`deal_snapshots`). |
| `api/deal-fitness/analyze/route.ts` | POST run deal-fitness analysis (prompt #15 → see `05-deal-fitness.md`). |
| `api/deal-fitness/route.ts` | GET portfolio or single-deal fitness data. |
| `api/deals/[id]/meddpicc-update/route.ts` | PATCH persist MEDDPICC scores. |
| `api/deals/[id]/meddpicc/route.ts` | GET MEDDPICC snapshot for deal (used for live refresh). |
| `api/deals/[id]/update/route.ts` | PATCH generic deal field update (close_date, stage, win_probability). |
| `api/deals/close-analysis/route.ts` | POST AI close/loss analysis (prompt #14 → splits into `06a-*.md` + `06b-*.md`). |
| `api/deals/resolve/route.ts` | POST resolve deal from name fragment. One of 4 fuzzy-resolve implementations flagged as debt in DECISIONS.md 2.25. |
| `api/deals/route.ts` | GET all deals with joins. v2 via `CrmAdapter`. |
| `api/deals/stage/route.ts` | POST update stage with close capture. |
| `api/demo/prep-deal/route.ts` | Demo scaffolding. Dead-code candidate per DECISIONS.md 1.10. |
| `api/demo/reset/route.ts` | POST reset demo data (300s maxDuration). |
| `api/field-queries/respond/route.ts` | POST process AE response, generate give-back (prompt #9 → see `07-give-back.md`). |
| `api/field-queries/route.ts` | GET+POST org-wide or deal-scoped field queries (prompts #6/#8). |
| `api/field-queries/suggestions/route.ts` | GET suggested questions from clusters. |
| `api/intelligence/agent-patterns/route.ts` | GET agent-detected cross-deal patterns. |
| `api/intelligence/persist-pattern/route.ts` | POST persist coordinator pattern (prompt #25 → see `04-coordinator-synthesis.md`). |
| `api/intelligence/route.ts` | GET intelligence-dashboard top-level data. |
| `api/mcp/route.ts` | MCP server handler (5 tools: get_pipeline, get_deal_details, generate_call_prep, get_deal_fitness, log_observation). |
| `api/notifications/route.ts` | GET notifications by member. |
| `api/observation-routing/route.ts` | GET+PATCH routing records. Dead-code candidate per 1.10. |
| `api/observations/[id]/follow-up/route.ts` | POST process observation follow-up (prompt #1 → see `02-observation-classification.md`). |
| `api/observations/clusters/route.ts` | GET clusters ordered by recency. Dead-code candidate per 1.10. |
| `api/observations/route.ts` | GET+POST observations with AI pipeline (prompts #1/#2/#3). |
| `api/playbook/ideas/[id]/route.ts` | PATCH update experiment status. No POST `/api/experiments` exists; v2 adds via service per 1.3. |
| `api/rivet/[...all]/route.ts` | Rivet actor handler (`@rivetkit/next-js toNextHandler`). REMOVED in v2 per 2.6. |
| `api/team-members/route.ts` | GET all team members. Dead-code candidate per 1.10. |
| `api/transcript-pipeline/route.ts` | POST enqueue transcript pipeline (300s). In v2 rewritten as Postgres `jobs` row per 2.6 + 2.24. |

### 2.2 `source/components/` — UI Components (30 files)

Major components per `06-UI-STRUCTURE.md` Section 3. Per DECISIONS.md 2.22 v2 caps client files at ~400 LOC; the 2,543-LOC `BookClient` and 2,463-LOC `DealDetailClient` must be split during port. Per 2.22(a) no inline hex/font/background — tokens only. Per 2.22(d) one UI primitive library.

**Shared (apps/web/src/components/*):**
- `activity-feed.tsx` — Timeline activity list (contains `getEffectiveType()` legacy-type mapper debt; resolves in v2 via unified activity-type enum).
- `admin-reset.tsx` — Reset-demo modal + `⌘⇧X` shortcut.
- `agent-intervention.tsx` — Proactive intervention card. **Must be re-architected in v2 per 1.14** (no `deal.name.includes("nordicmed")` hardcode).
- `agent-memory.tsx` — Deal agent memory card. v2 reads from event-sourced `deal_events`/`deal_snapshots` per 2.16.
- `deal-question-input.tsx` — MANAGER-only "Ask about this deal" composer.
- `layout-agent-bar.tsx` — Layout wrapper for the agent bar.
- `observation-input.tsx` — Universal Agent Bar (~2,130 LOC). The single largest component; must be split per 2.22(b).
- `providers.tsx` — PersonaContext provider (no auth per 1.8 — persona switching only in demo).
- `quick-questions.tsx` — AE quick-check responses card.
- `response-kit-modal.tsx` — Reusable Response Kit modal (`/book`).
- `stage-change-modal.tsx` — Stage transitions + Close Won/Lost capture (calls prompt #14 — split in v2 per `06a/b-*.md`).
- `workflow-tracker.tsx` — 5-step pipeline progress tracker. Rebuilt as progress reads from `jobs` table per 2.6.

**analyzer/ subdirectory:**
- `analysis-stream.tsx`, `call-summary.tsx`, `coaching-tips.tsx`, `deal-score.tsx`, `key-moments.tsx`, `link-to-deal.tsx`, `risk-signals.tsx`, `sentiment-arc.tsx`, `talk-ratio.tsx`, `transcript-input.tsx` — `/analyze` page sub-components.

**feedback/ subdirectory:**
- `agent-feedback.tsx` — Thumb-up/down + tag + comment widget.

**layout/ subdirectory:**
- `sidebar.tsx` — Nav rail. v2 rebuilds as declarative route registry per 2.22(c).
- `top-bar.tsx` — Persona switcher + notification bell.

**route-clients/ subdirectory:** per-route `*-client.tsx` files from `apps/web/src/app/(dashboard)/<route>/`. Each is a single-page state-heavy client. Most exceed 2.22(b)'s 400-LOC cap:
- `agent-config-client.tsx` (793 LOC)
- `analytics-client.tsx` (301) — not in v2 sidebar.
- `book-client.tsx` (2,543) — `/book` post-sale UI.
- `command-center-client.tsx` (313)
- `deal-detail-client.tsx` (2,463) — `/pipeline/[id]` deal workspace.
- `deal-fitness-client.tsx` (2,197) — `/deal-fitness` portfolio + drill.
- `intelligence-client.tsx` (1,575) — `/intelligence`.
- `observations-client.tsx` (463) — **DEAD CODE** per `06-UI-STRUCTURE.md` §5. Cut from v2 per DECISIONS.md 1.12.
- `outreach-client.tsx` (343)
- `pipeline-client.tsx` (572)
- `playbook-client.tsx` (2,429)
- `prospects-client.tsx` (420)

### 2.3 `source/config/` — Build & Workspace Config (14 files)

- `package.json` — root + `apps/web/` + `packages/db/` + `packages/shared/` (4 files).
- `tsconfig.json` — root + each workspace (4 files).
- `turbo.json` — Turborepo pipeline.
- `apps/web/next.config.mjs` — `serverExternalPackages: ["rivetkit", "@rivetkit/next-js"]` (removed in v2 per 2.6).
- `apps/web/tailwind.config.ts` — Tailwind tokens. v2 converts per DECISIONS.md 2.22(a).
- `apps/web/postcss.config.mjs`.
- `packages/db/drizzle.config.ts` — Drizzle migration config.
- `.env.example` — env var names with every value `REDACTED` (see §4). Extracted via `grep -rhoE "process\.env\.[A-Z_]+" apps/web/src packages/db/src packages/shared/src`.

### 2.4 `source/lib/` — Shared libraries (10 files)

- `db.ts` — Drizzle DB connection (Supabase Postgres).
- `format-agent-memory.ts` — Agent-memory formatter. In v2 replaced by `Formatter` module per DECISIONS.md 2.13 single formatter module.
- `rivet-actor-cleanup.ts` — Actor teardown helper. REMOVED in v2 per 2.6.
- `rivet.ts` — Client-side `useActor` hook wrapper. REMOVED in v2 per 2.6 (replaced by Supabase Realtime).
- `utils.ts` — Generic utility functions.
- `validation.ts` — Input validation helpers.
- `analysis/demo-transcripts.ts` — Seed transcripts for `/analyze` demo.
- `analysis/parse-stream.ts` — Streaming response parser (prompt #5).
- `analysis/prompts.ts` — Inline prompt literals for `/analyze`. Per DECISIONS.md 2.13 / Guardrail #19 these become `.md` files in v2.
- `analysis/types.ts` — `/analyze` page shared types.

### 2.5 `source/pages/` — Page server components (17 files)

Every `page.tsx` under `apps/web/src/app/`, preserving structure. Per DECISIONS.md 1.12 some redirect-only shells do NOT ship in v2. Per 2.22(c) v2 nav is a declarative registry.

- `page.tsx` — Landing page (rebuilt in v2 per DECISIONS.md 3.1 rebrand).
- `(dashboard)/agent-admin/page.tsx` — **CUT from v2** per 1.12 (placeholder).
- `(dashboard)/agent-config/page.tsx`
- `(dashboard)/analytics/page.tsx` — not in v2 sidebar.
- `(dashboard)/analyze/page.tsx` — `/analyze` tool (not in sidebar; client-at-page-level issue flagged in 06-UI §5.6).
- `(dashboard)/book/page.tsx` — `/book` post-sale UI.
- `(dashboard)/calls/page.tsx` — transcript library, not in sidebar.
- `(dashboard)/command-center/page.tsx`
- `(dashboard)/deal-fitness/page.tsx`
- `(dashboard)/intelligence/page.tsx`
- `(dashboard)/observations/page.tsx` — redirect-only shell; **CUT from v2** per 1.12.
- `(dashboard)/outreach/page.tsx`
- `(dashboard)/pipeline/[id]/page.tsx` — deal workspace.
- `(dashboard)/pipeline/page.tsx`
- `(dashboard)/playbook/page.tsx`
- `(dashboard)/prospects/page.tsx` — not in sidebar.
- `(dashboard)/team/page.tsx` — **CUT from v2** per 1.12 (placeholder).

### 2.6 `source/rivet/` — Rivet actors (6 files)

**Entire directory REMOVED in v2 per DECISIONS.md 2.6.** New stack: Postgres `jobs` table + Next.js worker + `pg_cron` + Supabase Realtime. All state event-sourced per 2.16.

- `claude-api.ts` — Claude client wrapper. In v2 unified per DECISIONS.md 2.13.
- `deal-agent.ts` — Per-deal agent actor (state, actions, events). Replaced by `DealIntelligence` service per 2.16.
- `intelligence-coordinator.ts` — Cross-deal coordinator (prompt #25 — rewritten as `04-coordinator-synthesis.md`). Replaced by `IntelligenceCoordinator` service per 2.17 (scheduled + on-demand, same code path).
- `registry.ts` — Actor registry + type export.
- `route.ts` — Rivet `[...all]/route.ts` handler (duplicate of `api/rivet/[...all]/route.ts` for semantic grouping).
- `transcript-pipeline.ts` — Transcript pipeline workflow actor (durable Rivet `workflow()` + `ctx.loop()` + `loopCtx.step()`). Rewritten as Postgres jobs rows per 2.24.

### 2.7 `source/schema/` — Database schema (1 file)

- `schema.ts` — Drizzle schema: 35 tables, all enums, all relations. v2 re-designs per 2.16 (event-sourcing adds `deal_events`, `deal_snapshots`, `coordinator_patterns`, `people`, `jobs`). Full hygiene pass pending per 2.2.

### 2.8 `source/types/` — Shared types (2 files)

- `index.ts` — Re-exports from `packages/shared/src/`.
- `types.ts` — Stage labels, shared types.

## Section 3: Prompt Staging Index

`source/prompts/` — v2-ready prompt drop-ins. Codex copies this directory to `v2-repo/prompts/` with zero transformation.

All 25 original prompts from `04-PROMPTS.md` are accounted for. The 8 rewrites produce 9 `.md` files (#14 splits into 14A + 14B). See `PORT-MANIFEST.md` for the remaining 17 prompts' port treatment.

| File | Source in 04C | Original prompt # | v2 feature powered |
|---|---|---|---|
| `01-detect-signals.md` | Rewrite 1 | #21 Detect Signals (Pipeline Actor) | Transcript pipeline: establishes canonical 9-type `SignalTaxonomy` enum. |
| `02-observation-classification.md` | Rewrite 2 | #1 Observation Classification | Agent-bar observation capture. Feeds cluster matcher + routing + agent-config feedback. |
| `03-agent-config-proposal.md` | Rewrite 3 | #4 Agent Config Change Suggestion | Agent-config proposal queue per DECISIONS.md 2.25 #3 (human approves; no auto-write). |
| `04-coordinator-synthesis.md` | Rewrite 4 | #25 Coordinator Pattern Synthesis (Actor) | Cross-deal coordinator — fixes `system: ""` anomaly. Required input to call prep per 2.17. |
| `05-deal-fitness.md` | Rewrite 5 | #15 Deal Fitness Analysis | oDeal Framework analysis: 25-event enum via `OdealTaxonomy`. Incremental detection with prior-evidence context. |
| `06a-close-analysis-continuous.md` | Rewrite 6 (#14A) | #14 Close Analysis (Win/Loss) — continuous part | Per-touchpoint rolling deal-theory updater. Writes `DealTheoryUpdated` to `deal_events`. |
| `06b-close-analysis-final.md` | Rewrite 6 (#14B) | #14 Close Analysis (Win/Loss) — final deep pass | VP-grade close hypothesis at Closed Won/Lost. Event-stream verification per 2.21. Candidate taxonomy promotion. |
| `07-give-back.md` | Rewrite 7 | #9 Give-Back Insight | Peer-tip after AE chip response to field query. `applies: false` opt-out; structured `cited_data[]`. |
| `08-call-prep-orchestrator.md` | Rewrite 8 | #11 Call Prep Brief Generator (The Big One) | Flagship call prep — decomposed into orchestrator + 10 sub-prompts. Direct `coordinator_patterns` read per 2.17. |
| `PORT-MANIFEST.md` | Synthesized index | All 25 prompts | Maps every original prompt to a v2 target filename and port treatment. |

## Section 4: NOT Included

- **`node_modules/`** — reinstall from `config/package.json` with `pnpm install`.
- **Build artifacts** — `.next/`, `dist/`, `.turbo/` intentionally excluded. Recompile from source.
- **`.env*` files with real values** — only `.env.example` (all values `REDACTED`) is included. Populate `ANTHROPIC_API_KEY`, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SITE_URL`, etc. locally or in Vercel.
- **Test fixtures with PII** — none copied.
- **Seed data scripts** (`packages/db/src/seed-*.ts`) — not copied in this phase; v2 builds its own seeds post-rebrand + schema reshape.
- **Migrations** (`packages/db/drizzle/0005..0009.sql`) — not copied; v2 writes fresh migrations against the re-designed schema per DECISIONS.md 2.2.
- **`apps/web/.next/` cache artifacts** — filtered from `.env.example` extraction (binary matches skipped).
- **`apps/web/scripts/` / `apps/web/public/`** — scripts are one-off utilities; public is static assets rebuilt from design system per 3.1.
- **Other handoff docs** (`docs/handoff/01-INVENTORY.md` through `07C-HUBSPOT-SETUP.md`, `DECISIONS.md`, `README.md`) — remain in `docs/handoff/` root, not copied into `source/`.

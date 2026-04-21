# 01 — Inventory

Project scope at commit `c71d2b6` (2026-04-21). Counts and paths only — no narrative. Everything derived from the current repo state.

---

## Section 1: File Tree

Generated with:
```
find . -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.next/*' -not -path '*/.turbo/*' -not -path '*/.git/*' -not -path '*/dist/*' | sort
```

```
.
./.claude
./.claude/launch.json
./.claude/settings.local.json
./.claude/specs
./.claude/specs/completed
./.claude/specs/in-progress
./.claude/specs/plans
./.env
./.env.local
./.git
./.gitignore
./.next
./.turbo
./CLAUDE.md
./apps
./apps/web
./apps/web/.env
./apps/web/.env.local
./apps/web/.next
./apps/web/.turbo
./apps/web/next-env.d.ts
./apps/web/next.config.mjs
./apps/web/node_modules
./apps/web/package.json
./apps/web/postcss.config.mjs
./apps/web/public
./apps/web/scripts
./apps/web/src
./apps/web/tailwind.config.ts
./apps/web/tsconfig.json
./apps/web/tsconfig.tsbuildinfo
./demo-transcripts
./demo-transcripts/discovery-call-atlas-capital.md
./demo-transcripts/discovery-call-medcore.md
./demo-transcripts/discovery-call-quantumleap.md
./docs
./docs/all-prompts.md
./docs/all-prompts.pdf
./docs/audit
./docs/audit/01-structure.md
./docs/audit/02-database-schema.md
./docs/audit/03-api-routes.md
./docs/audit/04-rivet-actors.md
./docs/audit/05-transcript-pipeline.md
./docs/audit/06-observations-experiments-intelligence.md
./docs/audit/07-cross-system-wiring.md
./docs/audit/08-feature-matrix.md
./docs/diagrams
./docs/handoff
./docs/handoff/README.md
./docs/handoff/source
./landing-page-copy.md
./node_modules
./package.json
./packages
./packages/db
./packages/db/.claude
./packages/db/.turbo
./packages/db/dist
./packages/db/drizzle
./packages/db/drizzle.config.ts
./packages/db/node_modules
./packages/db/package.json
./packages/db/src
./packages/shared
./packages/shared/.turbo
./packages/shared/dist
./packages/shared/node_modules
./packages/shared/package.json
./packages/shared/src
./packages/shared/tsconfig.json
./pnpm-lock.yaml
./pnpm-workspace.yaml
./system-flows-report.md
./tsconfig.json
./turbo.json
```

---

## Section 2: Packages

Workspace definition (`pnpm-workspace.yaml`): `apps/*` and `packages/*`. Four `package.json` files in the repo.

### `nexus` (root — `package.json`)
- **Version:** n/a (private)
- **Package manager:** pnpm@10.33.0
- **Dependencies:** none
- **DevDependencies:**
  - `turbo` ^2.5.0
  - `typescript` ^5.7.0
- **pnpm overrides:** `drizzle-orm` ^0.39.0
- **Scripts:**
  - `dev` → `turbo dev`
  - `build` → `turbo build`
  - `lint` → `turbo lint`
  - `db:generate` → `turbo db:generate`
  - `db:push` → `turbo db:push`
  - `db:seed` → `turbo db:seed`

### `@nexus/web` (`apps/web/package.json`)
- **Version:** 0.0.0 (private)
- **Type:** module
- **Dependencies:**
  - `@anthropic-ai/sdk` ^0.80.0
  - `@modelcontextprotocol/sdk` ^1.29.0
  - `@nexus/db` workspace:*
  - `@nexus/shared` workspace:*
  - `@radix-ui/react-avatar` ^1.1.0
  - `@radix-ui/react-dialog` ^1.1.0
  - `@radix-ui/react-dropdown-menu` ^2.1.0
  - `@radix-ui/react-popover` ^1.1.0
  - `@radix-ui/react-select` ^2.1.0
  - `@radix-ui/react-separator` ^1.1.0
  - `@radix-ui/react-slot` ^1.1.0
  - `@radix-ui/react-tabs` ^1.1.0
  - `@radix-ui/react-tooltip` ^1.1.0
  - `@rivetkit/next-js` ^2.2.0
  - `@rivetkit/react` ^2.2.0
  - `@tremor/react` ^3.18.0
  - `class-variance-authority` ^0.7.0
  - `clsx` ^2.1.0
  - `dotenv` ^16.6.1
  - `drizzle-orm` ^0.39.0
  - `lucide-react` ^0.468.0
  - `next` 14.2.29
  - `postgres` ^3.4.0
  - `react` ^18.3.0
  - `react-dom` ^18.3.0
  - `rivetkit` ^2.2.0
  - `tailwind-merge` ^2.6.0
  - `tailwindcss-animate` ^1.0.7
  - `zod` ^4.3.6
- **DevDependencies:**
  - `@types/node` ^22.0.0
  - `@types/react` ^18.3.0
  - `@types/react-dom` ^18.3.0
  - `autoprefixer` ^10.4.0
  - `postcss` ^8.4.0
  - `tailwindcss` ^3.4.0
  - `tsx` ^4.19.0
  - `typescript` ^5.7.0
- **Scripts:**
  - `dev` → `next dev --turbo`
  - `build` → `next build`
  - `start` → `next start`
  - `lint` → `next lint`
  - `nuke-actors` → `tsx scripts/nuke-rivet-actors.ts`
  - `destroy-zombie` → `tsx scripts/destroy-zombie-dealagent.ts`
  - `rotate-medvista` → `tsx scripts/rotate-medvista-uuid.ts`

### `@nexus/db` (`packages/db/package.json`)
- **Version:** 0.0.0 (private)
- **Type:** module
- **Main/Types:** `./src/index.ts`
- **Dependencies:**
  - `@nexus/shared` workspace:*
  - `drizzle-orm` ^0.39.0
  - `postgres` ^3.4.0
- **DevDependencies:**
  - `drizzle-kit` ^0.30.0
  - `tsx` ^4.19.0
  - `typescript` ^5.7.0
  - `dotenv` ^16.4.0
- **Scripts:**
  - `build` → `tsc`
  - `lint` → `tsc --noEmit`
  - `db:generate` → `drizzle-kit generate`
  - `db:push` → `drizzle-kit push`
  - `db:seed` → `tsx src/seed.ts`
  - `db:seed-field-queries` → `tsx src/seed-field-queries.ts`

### `@nexus/shared` (`packages/shared/package.json`)
- **Version:** 0.0.0 (private)
- **Type:** module
- **Main/Types:** `./src/index.ts`
- **Dependencies:** none
- **DevDependencies:**
  - `typescript` ^5.7.0
- **Scripts:**
  - `build` → `tsc`
  - `lint` → `tsc --noEmit`

### Turborepo pipeline (`turbo.json`)
- `globalEnv`: `DATABASE_URL`, `DIRECT_URL`
- Tasks: `build` (env adds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`), `dev` (no cache, persistent), `lint`, `db:generate`, `db:push`, `db:seed` (no cache each).

---

## Section 3: Database

All schema definitions live in a single file: `packages/db/src/schema.ts` (1110 lines). Migrations are generated into `packages/db/drizzle/` (12 migration SQL files, `0000_useful_bucky.sql` through `0011_rapid_lord_tyger.sql`).

### Tables — 37 total (alphabetical)

1. `accountHealth`
2. `activities`
3. `agentActionsLog`
4. `agentConfigVersions`
5. `agentConfigs`
6. `callAnalyses`
7. `callTranscripts`
8. `companies`
9. `contacts`
10. `coordinatorPatterns`
11. `crossAgentFeedback`
12. `customerMessages`
13. `dealAgentStates`
14. `dealFitnessEvents`
15. `dealFitnessScores`
16. `dealMilestones`
17. `dealStageHistory`
18. `deals`
19. `emailSequences`
20. `emailSteps`
21. `feedbackRequests`
22. `fieldQueries`
23. `fieldQueryQuestions`
24. `influenceScores`
25. `knowledgeArticles`
26. `leadScores`
27. `managerDirectives`
28. `meddpiccFields`
29. `notifications`
30. `observationClusters`
31. `observationRouting`
32. `observations`
33. `playbookIdeas`
34. `resources`
35. `supportFunctionMembers`
36. `systemIntelligence`
37. `teamMembers`

> NOTE: CLAUDE.md still references "33 tables" in the header section but the document itself later mentions S13 (35 tables), S15 (added `dealFitnessEvents` + `dealFitnessScores`), plus `dealAgentStates` and `coordinatorPatterns`. The count in CLAUDE.md is stale. 37 is the true count at this commit.

### Enums — 25 total (alphabetical)

1. `activityTypeEnum` (`activity_type`)
2. `agentActionTypeEnum` (`agent_action_type`)
3. `agentRoleTypeEnum` (`agent_role_type`)
4. `configChangedByEnum` (`config_changed_by`)
5. `contactRoleEnum` (`contact_role`)
6. `emailSequenceStatusEnum` (`email_sequence_status`)
7. `emailStepStatusEnum` (`email_step_status`)
8. `enrichmentSourceEnum` (`enrichment_source`)
9. `feedbackRequestTypeEnum` (`feedback_request_type`)
10. `feedbackStatusEnum` (`feedback_status`)
11. `fieldQueryQuestionStatusEnum` (`field_query_question_status`)
12. `fieldQueryStatusEnum` (`field_query_status`)
13. `forecastCategoryEnum` (`forecast_category`)
14. `leadSourceEnum` (`lead_source`)
15. `milestoneSourceEnum` (`milestone_source`)
16. `notificationTypeEnum` (`notification_type`)
17. `observationRoutingStatusEnum` (`observation_routing_status`)
18. `pipelineStageEnum` (`pipeline_stage`)
19. `priorityEnum` (`priority`)
20. `productEnum` (`product`)
21. `roleEnum` (`role`)
22. `stageChangedByEnum` (`stage_changed_by`)
23. `transcriptSourceEnum` (`transcript_source`)
24. `transcriptStatusEnum` (`transcript_status`)
25. `verticalEnum` (`vertical`)

### Migrations — 12 files
`0000_useful_bucky.sql`, `0001_perpetual_mentor.sql`, `0002_fuzzy_cloak.sql`, `0003_yellow_scream.sql`, `0004_gigantic_terror.sql`, `0005_dashing_the_executioner.sql`, `0006_abnormal_betty_brant.sql`, `0007_abandoned_cerebro.sql`, `0008_previous_zemo.sql`, `0009_loving_silver_samurai.sql`, `0010_misty_screwball.sql`, `0011_rapid_lord_tyger.sql`.

### Seed scripts
Under `packages/db/src/`: 17 top-level seed files (`seed.ts`, `seed-agent-actions.ts`, `seed-agents.ts`, `seed-book.ts`, `seed-close-analysis.ts`, `seed-cross-feedback.ts`, `seed-deal-fitness.ts`, `seed-field-queries.ts`, `seed-final-polish.ts`, `seed-hero-activities.ts`, `seed-intelligence-fixes.ts`, `seed-intelligence.ts`, `seed-observations.ts`, `seed-org.ts`, `seed-outreach.ts`, `seed-playbook-lifecycle.ts`, `seed-playbook.ts`, `seed-system-intelligence.ts`, `seed-transcripts-resources.ts`). Subdirectories: `seed-data/` (`playbook-evidence.ts`, `playbook-experiments.ts`) and `seeds/` (`seed-healthfirst-transcript.ts`). Also present: `backfill-entities.ts`, `backfill-routing.ts`, `check-members.ts`, `cleanup-test-artifacts.ts`, `fix-org.ts`, `migrate-activity-types.ts`, `migrate-playbook-lifecycle.ts`, `remove-david-kim.ts`, `index.ts`.

---

## Section 4: Routes

### Top-level route groups under `apps/web/src/app/`
- `(dashboard)/` — 16 dashboard pages
- `api/` — 41 API route handlers
- `page.tsx` — root landing page (outside dashboard)

### Pages — 17 `page.tsx` files
```
apps/web/src/app/page.tsx
apps/web/src/app/(dashboard)/agent-admin/page.tsx
apps/web/src/app/(dashboard)/agent-config/page.tsx
apps/web/src/app/(dashboard)/analytics/page.tsx
apps/web/src/app/(dashboard)/analyze/page.tsx
apps/web/src/app/(dashboard)/book/page.tsx
apps/web/src/app/(dashboard)/calls/page.tsx
apps/web/src/app/(dashboard)/command-center/page.tsx
apps/web/src/app/(dashboard)/deal-fitness/page.tsx
apps/web/src/app/(dashboard)/intelligence/page.tsx
apps/web/src/app/(dashboard)/observations/page.tsx
apps/web/src/app/(dashboard)/outreach/page.tsx
apps/web/src/app/(dashboard)/pipeline/[id]/page.tsx
apps/web/src/app/(dashboard)/pipeline/page.tsx
apps/web/src/app/(dashboard)/playbook/page.tsx
apps/web/src/app/(dashboard)/prospects/page.tsx
apps/web/src/app/(dashboard)/team/page.tsx
```

> NOTE: CLAUDE.md lists 14 dashboard pages; the actual count is 16 (it missed `agent-admin` and `observations`, which redirects to `intelligence`). Plus root `page.tsx` = 17.

### API Routes — 41 `route.ts` files
```
apps/web/src/app/api/activities/route.ts
apps/web/src/app/api/agent/call-prep/route.ts
apps/web/src/app/api/agent/configure/route.ts
apps/web/src/app/api/agent/draft-email/route.ts
apps/web/src/app/api/agent/feedback/route.ts
apps/web/src/app/api/agent/save-to-deal/route.ts
apps/web/src/app/api/analyze/link/route.ts
apps/web/src/app/api/analyze/route.ts
apps/web/src/app/api/book/route.ts
apps/web/src/app/api/companies/route.ts
apps/web/src/app/api/customer/outreach-email/route.ts
apps/web/src/app/api/customer/qbr-prep/route.ts
apps/web/src/app/api/customer/response-kit/route.ts
apps/web/src/app/api/deal-agent-state/route.ts
apps/web/src/app/api/deal-fitness/analyze/route.ts
apps/web/src/app/api/deal-fitness/route.ts
apps/web/src/app/api/deals/[id]/meddpicc-update/route.ts
apps/web/src/app/api/deals/[id]/meddpicc/route.ts
apps/web/src/app/api/deals/[id]/update/route.ts
apps/web/src/app/api/deals/close-analysis/route.ts
apps/web/src/app/api/deals/resolve/route.ts
apps/web/src/app/api/deals/route.ts
apps/web/src/app/api/deals/stage/route.ts
apps/web/src/app/api/demo/prep-deal/route.ts
apps/web/src/app/api/demo/reset/route.ts
apps/web/src/app/api/field-queries/respond/route.ts
apps/web/src/app/api/field-queries/route.ts
apps/web/src/app/api/field-queries/suggestions/route.ts
apps/web/src/app/api/intelligence/agent-patterns/route.ts
apps/web/src/app/api/intelligence/persist-pattern/route.ts
apps/web/src/app/api/intelligence/route.ts
apps/web/src/app/api/mcp/route.ts
apps/web/src/app/api/notifications/route.ts
apps/web/src/app/api/observation-routing/route.ts
apps/web/src/app/api/observations/[id]/follow-up/route.ts
apps/web/src/app/api/observations/clusters/route.ts
apps/web/src/app/api/observations/route.ts
apps/web/src/app/api/playbook/ideas/[id]/route.ts
apps/web/src/app/api/rivet/[...all]/route.ts
apps/web/src/app/api/team-members/route.ts
apps/web/src/app/api/transcript-pipeline/route.ts
```

> NOTE: CLAUDE.md lists 32 API routes (inventory box) / 29 (section header). Actual count is 41. Delta comes from routes added/missed: `agent-admin`, `demo/prep-deal`, `deal-agent-state`, `deal-fitness/*`, `intelligence/persist-pattern`, `intelligence/route.ts`, `analyze/link`, `agent/feedback`, `agent/save-to-deal`, `customer/outreach-email`, `field-queries/suggestions`, `observation-routing`.

---

## Section 5: Components

**Total:** 25 `.tsx` files under `apps/web/src/components/`.

### By subdirectory
- `components/` (root) — 13 files
  - `activity-feed.tsx`, `admin-reset.tsx`, `agent-intervention.tsx`, `agent-memory.tsx`, `deal-question-input.tsx`, `layout-agent-bar.tsx`, `observation-input.tsx`, `providers.tsx`, `quick-questions.tsx`, `response-kit-modal.tsx`, `stage-change-modal.tsx`, `workflow-tracker.tsx`
- `components/analyzer/` — 9 files (`analysis-stream.tsx`, `call-summary.tsx`, `coaching-tips.tsx`, `deal-score.tsx`, `key-moments.tsx`, `link-to-deal.tsx`, `risk-signals.tsx`, `sentiment-arc.tsx`, `talk-ratio.tsx`, `transcript-input.tsx`)
- `components/layout/` — 2 files (`sidebar.tsx`, `top-bar.tsx`)
- `components/feedback/` — 1 file (`agent-feedback.tsx`)

> NOTE: `components/ui/` (shadcn/ui primitives) does NOT exist in this repo. Radix primitives are imported directly; there's no wrapper layer. The demo-guide component referenced in CLAUDE.md (`demo-guide.tsx`) is not present in the components directory — no match for it anywhere in `apps/web`.

### Client components referenced from pages
Per-page client component convention (e.g. `pipeline-client.tsx`, `deal-detail-client.tsx`, `book-client.tsx`) — these live alongside their `page.tsx` inside `(dashboard)/<route>/` directories, not under `components/`. They are NOT included in the 25-count above.

### App `src/lib/`
- `db.ts`, `format-agent-memory.ts`, `rivet-actor-cleanup.ts`, `rivet.ts`, `utils.ts`, `validation.ts`
- Subdirectory `lib/analysis/`: `demo-transcripts.ts`, `parse-stream.ts`, `prompts.ts`, `types.ts`

---

## Section 6: AI Call Sites

Claude is invoked two ways:

1. **Direct SDK calls** — `client.messages.create(...)` / `client.messages.stream(...)` using `@anthropic-ai/sdk`. Used by API routes.
2. **Raw `fetch` helper** — `callClaude()` in `apps/web/src/actors/claude-api.ts` (a retry wrapper around `POST https://api.anthropic.com/v1/messages`). Used inside Rivet actors because the SDK is incompatible with the Rivet runtime (comment at `claude-api.ts:1-2`).

**Total call sites: 25** (18 SDK + 7 helper).

### Direct SDK calls (18)

| # | File | Line | One-line purpose |
|---|------|------|------------------|
| 1 | `apps/web/src/app/api/observations/route.ts` | 436 | Classify observation into signal types + decide if follow-up adds value |
| 2 | `apps/web/src/app/api/observations/route.ts` | 640 | Semantic match of observation to existing cluster (confidence ≥ 0.6) |
| 3 | `apps/web/src/app/api/observations/route.ts` | 794 | Detect new cluster across recent unclustered observations |
| 4 | `apps/web/src/app/api/observations/route.ts` | 949 | Suggest targeted agent-config change triggered by observation |
| 5 | `apps/web/src/app/api/analyze/route.ts` | 48 | **Streaming** — analyze pasted call transcript (coaching, moments, risk, sentiment) |
| 6 | `apps/web/src/app/api/field-queries/route.ts` | 504 | Decide whether existing data answers a manager's query + which deals/AEs to ask |
| 7 | `apps/web/src/app/api/field-queries/route.ts` | 570 | Generate per-AE personalized question with response chips |
| 8 | `apps/web/src/app/api/field-queries/route.ts` | 734 | Answer a deal-scoped manager question from MEDDPICC + contacts + activity context |
| 9 | `apps/web/src/app/api/field-queries/respond/route.ts` | 164 | Generate "give-back" insight shown to AE after they answer |
| 10 | `apps/web/src/app/api/field-queries/respond/route.ts` | 254 | Synthesize aggregated answer once enough AEs have responded |
| 11 | `apps/web/src/app/api/agent/call-prep/route.ts` | 787 | Generate call brief fusing 8+ intelligence layers |
| 12 | `apps/web/src/app/api/agent/draft-email/route.ts` | 470 | Draft email using deal context + AE agent config voice |
| 13 | `apps/web/src/app/api/agent/configure/route.ts` | 57 | Interpret natural-language agent config instruction into saved config |
| 14 | `apps/web/src/app/api/deals/close-analysis/route.ts` | 312 | Win/loss close analysis from deal context when stage changes |
| 15 | `apps/web/src/app/api/deal-fitness/analyze/route.ts` | 470 | oDeal fitness framework — score 25 inspectable events from all transcripts + emails |
| 16 | `apps/web/src/app/api/customer/response-kit/route.ts` | 347 | Generate response kit (analysis + similar resolutions + draft reply) for inbound customer message |
| 17 | `apps/web/src/app/api/customer/qbr-prep/route.ts` | 50 | Generate structured QBR agenda (4 types) for a post-close account |
| 18 | `apps/web/src/app/api/customer/outreach-email/route.ts` | 145 | Draft proactive customer check-in email |

### Actor-based calls via `callClaude()` helper (7)

| # | File | Line | One-line purpose |
|---|------|------|------------------|
| 19 | `apps/web/src/actors/transcript-pipeline.ts` | 239 | Extract action items from transcript (pipeline parallel step 1) |
| 20 | `apps/web/src/actors/transcript-pipeline.ts` | 249 | Score MEDDPICC deltas from transcript (pipeline parallel step 2) |
| 21 | `apps/web/src/actors/transcript-pipeline.ts` | 267 | Detect 7 signal types + per-stakeholder sentiment (pipeline parallel step 3) |
| 22 | `apps/web/src/actors/transcript-pipeline.ts` | 472 | Synthesize strategic learnings for deal-agent memory |
| 23 | `apps/web/src/actors/transcript-pipeline.ts` | 521 | Check transcript for evidence of active A/B experiments |
| 24 | `apps/web/src/actors/transcript-pipeline.ts` | 616 | Draft follow-up email after transcript processing |
| 25 | `apps/web/src/actors/intelligence-coordinator.ts` | 215 | Synthesize cross-deal pattern insight when 2+ signals cluster |

All direct SDK calls construct `new Anthropic()` or `new Anthropic({ apiKey })` — no shared client singleton. Model used everywhere: `claude-sonnet-4-20250514`.

---

## Section 7: Rivet Actors

### Actors defined — 3 total

All live in `apps/web/src/actors/`.

| Actor | File | Type | One-sentence purpose |
|-------|------|------|----------------------|
| `dealAgent` | `apps/web/src/actors/deal-agent.ts:99` | simple actor | Per-deal stateful agent: holds memory, learnings, competitive intel, risk signals, health score, interventions; scheduled health checks via `c.schedule.after()` |
| `transcriptPipeline` | `apps/web/src/actors/transcript-pipeline.ts:165` | **workflow actor** — contains `workflow()` at line 191 | Durable transcript-processing workflow: extracts actions + MEDDPICC + signals (parallel), synthesizes learnings, checks experiments, drafts email, updates deal agent, pushes signals to coordinator, auto-generates call prep, analyzes deal fitness |
| `intelligenceCoordinator` | `apps/web/src/actors/intelligence-coordinator.ts:53` | simple actor | Org-wide actor: receives signals from every pipeline run, detects cross-deal patterns (2+ signals same-type same-vertical), schedules Claude synthesis, pushes synthesized intel back to affected deal agents |

### Supporting files
- `apps/web/src/actors/registry.ts` — Rivet registry setup and type exports.
- `apps/web/src/actors/claude-api.ts` — `fetch`-based Claude wrapper with exponential backoff (used only inside actors; SDK is incompatible with Rivet runtime).
- `apps/web/src/app/api/rivet/[...all]/route.ts` — `toNextHandler(registry)` mount, exports GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS.

### Scripts that touch actors
Under `apps/web/scripts/`:
- `nuke-rivet-actors.ts` — destroys all actors
- `destroy-zombie-dealagent.ts` — removes stuck deal agents
- `rotate-medvista-uuid.ts` — swaps MedVista UUID to reset replayed workflow history

---

## Summary Counts

| Thing | Count |
|-------|-------|
| Packages | 4 |
| Drizzle tables | 37 |
| Drizzle enums | 25 |
| Migrations | 12 |
| Pages (`page.tsx`) | 17 |
| API routes (`route.ts`) | 41 |
| Components (`apps/web/src/components/**/*.tsx`) | 25 |
| Claude call sites (SDK + helper combined) | 25 |
| Rivet actors | 3 (1 workflow, 2 simple) |

---

## Discrepancies vs. CLAUDE.md (for later reconciliation)

- **Tables:** CLAUDE.md says 33; actual 37.
- **API routes:** CLAUDE.md table says 32 / narrative says 29; actual 41.
- **Dashboard pages:** CLAUDE.md lists 14; actual 16 (+ root landing = 17).
- **`demo-guide.tsx` component:** referenced in CLAUDE.md S13 notes, not present in `apps/web/src/components/`.
- **`components/ui/` primitives directory:** referenced in CLAUDE.md (shadcn/ui), not present — Radix is imported directly.
- **CLAUDE.md** still describes the codebase as using `shadcn/ui`; actual UI primitives come from direct `@radix-ui/*` imports plus Tremor + custom components.

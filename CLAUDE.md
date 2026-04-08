# NEXUS — Architecture Reference

## Overview
Nexus is a full-cycle AI sales orchestration platform where AEs direct AI agents across the buyer's journey. Built as a demo for Anthropic's sales leadership. Monorepo: Turborepo + pnpm, Next.js 14 (App Router, Turbopack), shadcn/ui + Tailwind, Supabase PostgreSQL + Drizzle ORM, Claude API. Deployed on Vercel at `nexus-web-plum-iota.vercel.app`.

## File Structure
```
apps/web/src/app/                    → Next.js pages + API routes
apps/web/src/app/(dashboard)/        → Dashboard pages (14 routes)
apps/web/src/app/api/                → API routes (29 endpoints)
apps/web/src/components/             → Shared components
apps/web/src/lib/                    → DB connection, utils
packages/db/src/schema.ts            → 33 tables, all enums and relations
packages/db/src/seed-*.ts            → 17 seed scripts (includes seed-book.ts for post-sale data)
packages/db/src/seed-data/           → Extracted seed data (playbook evidence, experiments)
packages/shared/src/types.ts         → Shared types, stage labels
```

## Database Tables (33)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `teamMembers` | id, name, role (AE/BDR/SA/CSM/MANAGER), verticalSpecialization | Sales team profiles |
| `companies` | id, name, industry (verticalEnum), employeeCount, techStack[] | Account records |
| `contacts` | id, firstName, lastName, companyId (FK), roleInDeal, isPrimary | People at companies |
| `deals` | id, name, companyId, stage, dealValue, assignedAeId, closeFactors (jsonb) | Pipeline deals |
| `dealMilestones` | dealId, milestoneKey, isCompleted, source | Deal progress tracking |
| `meddpiccFields` | dealId (unique), metrics/economicBuyer/etc + confidence | MEDDPICC scoring per deal |
| `dealStageHistory` | dealId, fromStage, toStage, changedBy (ai/human) | Stage transition audit |
| `activities` | dealId, contactId, teamMemberId, type (15 types), metadata (jsonb) | Timeline entries |
| `emailSequences` | dealId, contactId, name, status | Multi-step email campaigns |
| `emailSteps` | sequenceId, subject, body, sentAt, openedAt, repliedAt | Individual campaign steps |
| `callTranscripts` | dealId, title, transcriptText, participants (jsonb) | Raw call transcripts |
| `callAnalyses` | transcriptId (unique), summary, painPoints, coachingInsights | AI-extracted call insights |
| `agentConfigs` | teamMemberId, agentName, roleType, instructions, outputPreferences (jsonb) | Per-member agent config |
| `agentConfigVersions` | agentConfigId, version, changedBy (user/ai/feedback_loop) | Config change history |
| `feedbackRequests` | fromMemberId, targetRoleType, requestType, status | Agent output feedback |
| `agentActionsLog` | agentConfigId, actionType, inputData, outputData, dealId | Agent action audit |
| `crossAgentFeedback` | sourceMemberId, targetMemberId, content, dealId, vertical | Teammate recommendations |
| `leadScores` | companyId, dealId, score, icpMatchPct, engagementScore | ICP/engagement/intent scores |
| `notifications` | teamMemberId, type, title, message, isRead, priority | In-app notifications |
| `observations` | observerId, rawInput, aiClassification (jsonb), clusterId, linkedDealIds[] | Field observations |
| `observationClusters` | title, signalType, severity, arrImpactTotal, unstructuredQuotes (jsonb) | Semantic observation groups |
| `observationRouting` | observationId, targetFunction, targetMemberId, status | Routes to support functions |
| `supportFunctionMembers` | name, role, function, verticalsCovered[] | Non-sales personas |
| `fieldQueries` | initiatedBy (no FK), rawQuestion, aiAnalysis (jsonb), status, expiresAt | Manager/support questions |
| `fieldQueryQuestions` | queryId, targetMemberId, questionText, chips[], giveBack (jsonb) | Per-AE questions |
| `systemIntelligence` | vertical, insightType, title, insight, confidence (decimal 3,2) | Pre-computed data patterns |
| `managerDirectives` | authorId, scope, directive, priority, category, isActive | Leadership directives |
| `resources` | title, type, verticals[], description | Knowledge base docs |
| `playbookIdeas` | originatorId, title, hypothesis, status, testGroupDeals[], results (jsonb) | Process experiments |
| `influenceScores` | memberId, dimension, vertical, score (0-100), tier, attributions (jsonb) | Per-member influence |
| `knowledgeArticles` | title, articleType, content, summary, products[], verticals[], tags[], resolutionSteps (jsonb) | Internal knowledge base for AI response generation |
| `customerMessages` | companyId (FK), contactId (FK), dealId (FK), subject, body, channel, status, responseKit (jsonb), aiCategory | Inbound customer communications |
| `accountHealth` | companyId (FK), dealId (FK), healthScore, healthTrend, contractStatus, arr, usageMetrics (jsonb), riskSignals (jsonb), contractedUseCases (jsonb), expansionMap (jsonb), proactiveSignals (jsonb) | Post-close account state tracking |

## API Routes (32)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/deals` | GET | All deals with company/member joins |
| `/api/deals/stage` | POST | Update deal stage with close capture |
| `/api/deals/resolve` | POST | Resolve deal from name fragment |
| `/api/deals/close-analysis` | POST | AI close/loss analysis from deal context |
| `/api/companies` | GET | All companies (id, name, industry) |
| `/api/team-members` | GET | All team members |
| `/api/activities` | GET | Recent activities with joins |
| `/api/notifications` | GET | Notifications filtered by member |
| `/api/observations` | GET, POST | List/create observations with AI pipeline |
| `/api/observations/[id]/follow-up` | POST | Process follow-up, recalculate cluster |
| `/api/observations/clusters` | GET | All clusters ordered by recency |
| `/api/observation-routing` | GET, PATCH | Routing records by function/member |
| `/api/field-queries` | GET, POST | Field queries: org-wide or deal-scoped |
| `/api/field-queries/respond` | POST | Process response, generate give-back |
| `/api/field-queries/suggestions` | GET | Suggested questions from clusters |
| `/api/analyze` | POST | Stream transcript analysis via Claude |
| `/api/analyze/link` | POST | Save analysis as deal activity |
| `/api/agent/configure` | POST, PUT | Interpret/save agent config via Claude |
| `/api/agent/feedback` | POST | Create feedback request from rating |
| `/api/agent/call-prep` | POST | Generate call brief (8 intelligence layers) |
| `/api/agent/draft-email` | POST | Generate email with deal context + voice |
| `/api/agent/save-to-deal` | POST | Save agent action as deal activity |
| `/api/playbook/ideas/[id]` | PATCH | Update experiment status with transitions |
| `/api/demo/reset` | POST | Reset demo data to clean state |
| `/api/rivet/[...all]` | ALL | Rivet actor handler (@rivetkit/next-js toNextHandler) |
| `/api/transcript-pipeline` | POST | Trigger transcript pipeline (enqueues to Rivet actor) |
| `/api/deals/[id]/meddpicc` | GET | Fetch MEDDPICC data for a deal (used for live refresh) |
| `/api/deals/[id]/meddpicc-update` | PATCH | Persist MEDDPICC scores from pipeline |
| `/api/deals/[id]/update` | PATCH | Generic deal field update (close_date, stage, win_probability) |
| `/api/book` | GET | AE's full book of post-close accounts with health, messages, priority scores |
| `/api/customer/response-kit` | POST | Generate AI response kit for customer message via Claude (or return cached) |
| `/api/customer/qbr-prep` | POST | Generate structured QBR agenda via Claude from account context (no DB query) |

## Dashboard Pages

| Route | Client Component | Purpose |
|-------|-----------------|---------|
| `/` | — | Landing page (standalone, outside dashboard) |
| `/command-center` | command-center-client.tsx | Pipeline overview, activities, notifications |
| `/pipeline` | pipeline-client.tsx | Kanban/table/chart views, drag-to-move |
| `/pipeline/[id]` | deal-detail-client.tsx | Deal workspace: details, contacts, MEDDPICC, call prep |
| `/intelligence` | intelligence-client.tsx | 3 tabs: Patterns, Field Feed, Close Intelligence |
| `/playbook` | playbook-client.tsx | 3 tabs: Active Experiments, What's Working, Influence |
| `/outreach` | outreach-client.tsx | Email sequences + Intelligence Brief |
| `/book` | book-client.tsx | My Book: post-close accounts, health, drawer, QBR prep |
| `/agent-config` | agent-config-client.tsx | Agent configuration with NL instructions |
| `/observations` | — | Redirects to `/intelligence?tab=feed` |
| `/prospects` | prospects-client.tsx | Contact database (not in sidebar) |
| `/calls` | — | Call transcript library (not in sidebar) |
| `/analyze` | — | Streaming call analyzer (not in sidebar) |
| `/analytics` | analytics-client.tsx | Pipeline metrics, velocity (not in sidebar) |
| `/team` | — | Team roster (not in sidebar) |

## Key Components

| File | Purpose |
|------|---------|
| `components/observation-input.tsx` | Universal Agent Bar (~1800 lines) — observe, quick check, call prep, email draft |
| `components/agent-memory.tsx` | Deal agent memory display (expandable, connects to Rivet actor) |
| `components/workflow-tracker.tsx` | Real-time 5-step transcript pipeline progress tracker |
| `components/stage-change-modal.tsx` | Stage transitions + close/won/lost outcome capture |
| `components/deal-question-input.tsx` | MANAGER-only "Ask about this deal" |
| `components/activity-feed.tsx` | Timeline activity list with type icons |
| `components/quick-questions.tsx` | AE quick check responses |
| `components/providers.tsx` | PersonaContext provider, persists to localStorage |
| `components/response-kit-modal.tsx` | Reusable Response Kit modal for customer messages |
| `components/layout/sidebar.tsx` | 7-item navigation sidebar (includes My Book) |
| `components/layout/top-bar.tsx` | Header with GuideLink, user switcher, notifications |
| `components/layout-agent-bar.tsx` | Layout wrapper for agent bar placement |
| `components/demo-guide.tsx` | Floating guided demo checklist (10 steps, hybrid detection, localStorage state) |

## Data Flows

### Observation Pipeline
Agent bar → POST `/api/observations` → Claude classifies (9 signal types) → entity extraction → fuzzy CRM matching → semantic cluster matching (confidence >= 0.6) → save observation → create/update cluster → route to support functions → if `process_innovation`: auto-create playbook idea

### Call Prep (8 Intelligence Layers)
Deal page "Prep Call" → POST `/api/agent/call-prep` → queries: (1) rep's agent config, (2) team intelligence by vertical, (3) system intelligence patterns, (4) win/loss patterns, (5) stakeholder alerts, (6) manager directives, (7) CRM context (deal, MEDDPICC, contacts, activities, transcripts), (8) playbook ideas (promoted + testing for this deal) → Claude API → structured brief

### Playbook Lifecycle
AE submits idea → proposed → manager approves (selects AEs, sets thresholds) → testing with A/B groups → measures velocity/sentiment/close rate with deal-level evidence → graduation when thresholds met → proven play injected into call prep as DIRECTIVE

### Demo Reset
Landing page "Enter Demo" button → POST `/api/demo/reset` (maxDuration=300) with animated loading states → auto-navigates to `/pipeline`. Also activates guided demo checklist via localStorage. Resets: MedVista to Discovery, deal probabilities, relative close dates (MedVista today+55d, NordicMed today+42d, TrustBank today+60d, PharmaBridge today+90d, NordicCare today+45d, Atlas today+30d), all playbook ideas (re-inserts 8 experiments with lifecycle data from `packages/db/src/seed-data/`), pipeline-created observations (matched by `source_context` trigger), `meddpicc_fields` (full reset to seeds), `deal_stage_history` (full delete), expanded activity pattern matching, orphaned observation clusters, notifications → destroys ALL Rivet actors (dealAgent, transcriptPipeline, intelligenceCoordinator)

## Demo Data

### 10 Deals
MedVista (Sarah, 2.4M, Discovery), HealthFirst (Sarah, 3.2M, Closed Lost), TrustBank (Sarah, 950K, Tech Val), NordicMed (Ryan, 1.6M, Proposal), Atlas Capital (David, 580K, Negotiation), HealthBridge (Sarah, 1.2M, Closed Lost), MedTech Solutions (Ryan, 2.1M, Closed Won), NordicCare Patient Records (Ryan, 1.8M, Closed Lost), PharmaBridge (Sarah, 340K, Discovery), NordicCare API (Sarah, 780K, Tech Val)

### 8 Personas (in switcher)
Sales: Sarah Chen (AE), David Park (AE), Ryan Foster (AE) | Leadership: Marcus Thompson (MANAGER) | Solutions: Alex Kim (SA) | Support: Lisa Park (Enablement), Michael Torres (Product Marketing), Rachel Kim (Deal Desk)

### 8 Playbook Experiments
3 promoted (compliance-led discovery, CISO engagement, security doc pre-delivery), 3 testing (post-disco prototype, two-disco minimum, multi-threaded engagement), 1 proposed (competitive battlecard), 1 retired (ROI-first messaging)

### 18 Post-Sale Accounts (Sarah Chen's Book)
Healthcare: Meridian Health (85, active, $420K), Pacific Coast Medical (62, renewal, $280K), BrightPath Diagnostics (78, active, $195K), Cascadia Life Sciences (72, onboarding, $340K), Summit Genomics (90, active, $150K)
Financial Services: Redwood Capital (75, active, $380K), Harbor Compliance (45, at_risk, $520K), Lighthouse Insurance (68, renewal, $290K), Apex Financial (82, active, $180K), Cornerstone Banking (88, active, $440K)
Technology/Life Sciences: Vertex Pharma R&D (80, active, $310K), Pinnacle Biotech (55, onboarding, $240K), GenePath Analytics (73, active, $175K)
Retail: Atlas Retail (77, active, $350K), Brightside Commerce (70, renewal, $260K), Metro Market (85, active, $190K), Cascade Supply Chain (65, active, $420K), Evolve Retail Tech (48, at_risk, $280K)
Total ARR: $5.42M | 12 healthy | 3 at-risk | 3 upcoming renewals

### Tour
Removed in Session S10. Will be rebuilt later to tell the agent story.

## Code Conventions
- TypeScript strict, ES modules, functional components only
- Tailwind utility classes, shadcn/ui base components
- Drizzle ORM typed queries, no raw SQL (except seed scripts)
- camelCase vars/functions, PascalCase components/types, kebab-case files
- IDs: `uuid("id").defaultRandom().primaryKey()`
- Server components: `export const dynamic = "force-dynamic"`
- Model string: `claude-sonnet-4-20250514`
- Drizzle timestamps: pass Date objects, not strings
- SQL array containment: `memberId = ANY(testGroup)` not `@>`
- `scaling_scope` stored in attribution jsonb
- Proven plays prompt uses DIRECTIVE language in call prep
- `verticalSpecialization` is single enum, `outputPreferences.industryFocus` is jsonb array
- `initiatedBy` on fieldQueries has no FK (can be teamMembers or supportFunctionMembers)
- `systemIntelligence` confidence/relevanceScore: decimal(3,2) — values 0.00-9.99

## Brand Palette
Background: #FAF9F6 (cream), #FFFFFF (card), #F5F3EF (sidebar)
Accent: #0C7489 (teal), #D4735E (coral), #E07A5F (coral/icons)
Text: #3D3833 (primary), #8A8078 (muted)
Chips — selected: bg-[#3D3833] text-white, default: bg-[#F5F3EF] text-[#3D3833]
Tabs — active: text-[#3D3833] font-600 border-b-2 #E07A5F, inactive: text-[#8A8078]
Font: DM Sans. Radius: 12px cards, 8px buttons, 6px badges.
Verticals: Healthcare #3B82F6, Financial Services #10B981, Manufacturing #F59E0B, Retail #8B5CF6, Technology #06B6D4

## Known Issues
- MedVista resets to Discovery via demo reset; may need manual reset after testing
- `PgArray` errors from stale cache: fix with `rm -rf apps/web/.next && pnpm dev`
- No auth — persona switching via PersonaProvider context only
- Dev server default port 3001, auto-increments if occupied — when port shifts, Rivet actors can't connect (NEXT_PUBLIC_SITE_URL mismatch). Kill stale servers and restart.
- Influence scores and playbook "Start Test"/"Follow" buttons are UI-only in demo
- Coordinator `validateSignal` requires field mapping: Signal.signalType → type, Signal.sourceAeName → source_speaker (fixed in S13)
- Observation deduplication: pipeline observations include `transcriptId` in `sourceContext` to prevent duplicates on re-processing
- Demo reset destroys all 3 actor types (dealAgent, transcriptPipeline, intelligenceCoordinator) for clean restart
- Finalize step hangs on production (draft email + auto-call-prep timeout) — core pipeline intelligence completes fine through step 4
- Cross-deal intelligence section on deal page shows all pattern cards (can be 7+) — may need to limit to top 2-3
- Intervention timeline risk only fires for NordicMed Group (demo constraint, company name check) — remove for production
- Guided demo checklist uses localStorage only — no server persistence, clears on demo reset

## Deploy
```
pnpm dev                    # Dev server (Turbopack, port 3001)
git push origin main        # Vercel auto-deploys from main
```
Live: https://nexus-web-plum-iota.vercel.app
Reset link: `?reset=true` query param on landing page

## Rivet Actors (Sessions S10, S11)

Nexus uses Rivet (rivet.dev) for stateful AI agents. Documentation: https://rivet.dev/llms.txt

### File Structure
```
apps/web/src/actors/deal-agent.ts              → Deal agent actor (state, actions, events)
apps/web/src/actors/transcript-pipeline.ts     → Transcript pipeline workflow actor (parallelized, graceful degradation)
apps/web/src/actors/intelligence-coordinator.ts → Cross-deal intelligence coordinator (simple actor)
apps/web/src/actors/registry.ts                → Actor registry (setup + type export)
apps/web/src/app/api/rivet/[...all]/route.ts → Rivet handler via @rivetkit/next-js toNextHandler
apps/web/src/app/api/transcript-pipeline/route.ts → Pipeline trigger (fetches deal context, enqueues work)
apps/web/src/app/api/deals/[id]/meddpicc/route.ts → GET MEDDPICC data for live refresh after pipeline
apps/web/src/app/api/deals/[id]/meddpicc-update/route.ts → MEDDPICC persistence (called by pipeline actor)
apps/web/src/app/api/deals/[id]/update/route.ts → Generic deal field update (close_date, stage, win_probability)
apps/web/src/lib/rivet.ts                  → Client-side useActor hook (createRivetKit)
apps/web/src/components/agent-memory.tsx    → Deal agent memory display (expandable on deal page)
apps/web/src/components/workflow-tracker.tsx → Real-time pipeline progress tracker (subscribes to workflowProgress events)
apps/web/src/components/agent-intervention.tsx → Proactive intervention card with health score bar
apps/web/src/app/api/intelligence/agent-patterns/route.ts → GET agent-detected cross-deal patterns
```

### Deal Agent (`dealAgent`)
- One per deal, created lazily via `getOrCreate([dealId])`
- Persistent state: interactionMemory, learnings, competitiveContext, riskSignals, briefReady, activeIntervention, healthScore, lastHealthCheck, closeDate, companyName
- Actions:
  - **Core**: initialize, getState, destroyActor, recordInteraction, updateLearnings, addCompetitiveIntel, addRiskSignal, removeRiskSignal, recordFeedback, updateStage, getMemoryForPrompt, workflowProgress
  - **Brief Ready**: setBriefReady, dismissBrief, getBriefReady — manage auto-generated call prep from pipeline
  - **Interventions**: setIntervention, dismissIntervention — manage proactive risk alerts
  - **Health**: runHealthCheck — evaluates compound risk (customer silence, risk signals, MEDDPICC gaps, competitive pressure, stage age), creates interventions when score < 60, scheduled via `c.schedule.after()`
  - **Coordinated Intel**: addCoordinatedIntel — receives cross-deal insights pushed by coordinator, stores in coordinatedIntel array, broadcasts coordinatedIntelReceived event
- Events: memoryUpdated, learningsUpdated, riskDetected, workflowProgress, interventionReady, briefReady, healthChecked, coordinatedIntelReceived
- `formatMemoryForPrompt()` exports agent memory as structured text for call prep (9th intelligence layer)
- Agent state persists across sessions (not lost on page refresh)
- Supabase remains source of truth — agents are the intelligence/memory layer on top
- Health checks auto-schedule: 30s after initialize, 10s after recordInteraction (if not recently run)

### Transcript Pipeline (`transcriptPipeline`)
- Durable Rivet workflow actor using `workflow()` + `ctx.loop()` + `loopCtx.step()`
- Queue-driven: receives work via `pipeline.send("process", { ... })` from `/api/transcript-pipeline`
- `/api/transcript-pipeline` fetches deal context (deal, MEDDPICC, contacts, agent config, active experiments) before enqueuing
- Durable steps, each inside a `loopCtx.step()`:
  1. **init-pipeline** — reset state, set status to running
  2. **parallel-analysis** (timeout: 180s) — runs 3 Claude calls in parallel via `Promise.all`: extract actions, score MEDDPICC, detect signals (all 9 types + stakeholder sentiment). Saves ~60-80s vs sequential.
  3. **persist-meddpicc** — writes MEDDPICC scores to Supabase via `/api/deals/[id]/meddpicc-update`
  4. **create-signal-observations** — creates observations in parallel via `Promise.all`
  5. **synthesize-learnings** — Claude synthesizes strategic insights for deal agent
  6. **check-experiments** — (conditional) Claude checks for experiment tactic usage
  7. **draft-email** — Claude drafts follow-up email. **Graceful failure**: pipeline continues if this fails
  8. **update-deal-agent** — records interaction, updates learnings, adds competitive intel, adds risk signals
  9. **send-signals-to-coordinator** (timeout: 180s) — sends signals to intelligence coordinator via RPC
  10. **auto-call-prep** (timeout: 180s) — generates brief via `/api/agent/call-prep`. **Graceful failure**: pipeline completes even if this fails
  11. **mark-complete** — sets pipeline status to complete
- Workflow tracker UI shows 5 visual steps: Analyze Transcript → Update Scores → Check Experiments → Synthesize → Finalize
- Actions: getState, destroyActor
- Progress broadcasts via deal agent's `workflowProgress` action → WebSocket to browser
- **Workflow rule**: all `state`, `client()`, and actor-to-actor RPCs must be inside `loopCtx.step()` callbacks

### React Integration
- `useActor({ name, key })` hook from `@/lib/rivet` — no provider needed
- Used by: agent-memory.tsx, workflow-tracker.tsx, deal-detail-client.tsx
- Client endpoint: `window.location.origin/api/rivet` (browser), `NEXT_PUBLIC_SITE_URL/api/rivet` (SSR)
- deal-detail-client.tsx subscribes to `briefReady` event and polls `getBriefReady()` on mount — shows coral "Brief Ready" button when brief is available

### Vercel / Next.js Integration
- `@rivetkit/next-js` package: `toNextHandler(registry)` auto-spawns local engine in dev, serverless on Vercel
- `next.config.mjs`: `serverExternalPackages: ["rivetkit", "@rivetkit/next-js"]` (prevents webpack bundling)
- `/api/rivet/[...all]/route.ts`: exports GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS with `maxDuration = 300`
- `/api/transcript-pipeline/route.ts`: `maxDuration = 300`
- `/api/agent/call-prep/route.ts`: `maxDuration = 120`
- `/api/deals/[id]/meddpicc-update/route.ts`: `maxDuration = 15`

### Environment Variables
- `RIVET_ENDPOINT` — Rivet Cloud internal endpoint (production only)
- `RIVET_PUBLIC_ENDPOINT` — Rivet Cloud public endpoint (production only)
- `NEXT_PUBLIC_SITE_URL` — Absolute URL for server-side Rivet client creation (e.g. `https://nexus-web-plum-iota.vercel.app`)
- `ANTHROPIC_API_KEY` — Used by transcript pipeline actor for Claude API calls

### Intelligence Coordinator (`intelligenceCoordinator`)
- Simple actor (NOT workflow) — one per org, key: `["default"]`
- Receives signals from pipeline's update-deal-agent step after each transcript processing
- Detects patterns: 2+ signals of same type in same vertical (competitive_intel also matches on competitor name)
- Synthesizes cross-deal insights via Claude API (`claude-sonnet-4-20250514`, max_tokens: 1024)
- Pushes synthesized intel back to affected deal agents via `addCoordinatedIntel()`
- Uses `c.schedule.after(3000)` for synthesis delay (demo speed)
- State: signals (last 200), patterns, totalSignalsReceived, totalPatternsDetected
- Actions: receiveSignal, synthesizePattern, getPatterns, getPatternsForDeal, getStatus
- Events: patternDetected, patternSynthesized

### Demo Reset
- POST `/api/demo/reset` destroys all Rivet actors (`dealAgent`, `transcriptPipeline`, `intelligenceCoordinator`) for clean restart

## Session S12: Agent-to-Agent Coordination

### What was added
- Intelligence Coordinator actor (simple actor, not workflow) — detects cross-deal patterns and synthesizes insights
- Deal agents receive coordinatedIntel pushed by coordinator, stored in state, flows into call prep via getMemoryForPrompt()
- Pipeline sends all detected signals to coordinator in the update-deal-agent step
- Coordinator detects patterns (2+ deals with same signal type in same vertical) and synthesizes with Claude
- Intelligence dashboard shows "Agent-Detected Patterns" section at top of Patterns tab
- Agent memory displays cross-deal intelligence section
- HealthFirst seed transcript with transcript_text for cross-deal demo
- New API route: GET `/api/intelligence/agent-patterns`
- Demo reset destroys coordinator actor

### Actor Network
- dealAgent (per deal) ← pipeline sends signals to → intelligenceCoordinator (per org)
- intelligenceCoordinator → pushes synthesized intel back to → dealAgent(s)
- Key: coordinator uses c.schedule.after() for synthesis, NOT workflow steps (avoids timeout issues)

### Demo Flow for Cross-Deal Intelligence
1. Process transcript on MedVista → signals sent to coordinator
2. Process transcript on NordicMed → signals sent to coordinator
3. Coordinator detects pattern (same competitor/signal in same vertical)
4. Coordinator synthesizes and pushes to both deal agents
5. Intelligence dashboard shows agent-detected pattern
6. Next call prep for either deal includes cross-deal insight

## Session S13: Pipeline Hardening & Demo Polish

### What changed
- **Enter Demo = Reset**: No separate "Reset Demo Data" button. Landing page "Enter Demo" fires POST `/api/demo/reset` with animated loading states, auto-navigates to `/pipeline`
- **Demo reset expanded**: now cleans pipeline-created observations (by `source_context` trigger), `meddpicc_fields` (full reset to seeds), `deal_stage_history` (full delete), expanded activity pattern matching, orphaned observation clusters
- **Pipeline parallelized**: steps 1-3 (Extract Actions, Score MEDDPICC, Detect Signals) run in parallel via `Promise.all` inside single `parallel-analysis` workflow step. Saves ~60-80s vs sequential
- **Graceful degradation**: Draft Email and auto-call-prep wrapped in error handlers — pipeline shows "Complete" even if these fail
- **Pipeline run handler fix**: 6 `getDealActor()` calls and 2 `loopCtx.state` reads were outside `step()` callbacks, violating Rivet workflow rules. All wrapped in proper `step()` wrappers. Added outer try/catch with `console.error('[pipeline] FATAL:', error)`
- **Dense transcripts**: MedVista (~3500 words, 19 min) and NordicMed (~3500 words, 18 min). Both mention Microsoft DAX Copilot and 6-8 week security review (for coordinator cross-deal pattern). Include full tech stack details (Epic, Dragon Medical, Cerner, PowerScribe, PACS). Seed: `packages/db/src/seeds/seed-healthfirst-transcript.ts`
- **Workflow tracker**: 5 steps: Analyze Transcript → Update Scores → Check Experiments → Synthesize → Finalize. Steps may light up out of order due to parallelization (expected)
- **Cross-deal intelligence verified on production**: coordinator detects patterns across MedVista + NordicMed (competitive intel, process friction, content gaps, win patterns)
- **Intervention card fires naturally**: health check triggers on NordicMed with health score 59/100 — next task is rewriting to human-readable timeline risk with one-click close date adjustment

### Session S13 continued: Interventions, Landing Page, Demo Guide

**Smart Interventions:**
- Generic `InterventionAction` infrastructure supporting any deal field update (close_date, stage, win_probability)
- First implementation: timeline risk detection on NordicMed. Health check detects process_friction risk signal + close date < 70 days out → generates human-readable intervention with one-click close date adjustment
- User can modify suggested date before confirming. Card shows confirmation then auto-dismisses
- Intervention timing: fires AFTER pipeline Finalize + call prep generation. Sequence: pipeline completes → call prep generates → health check fires → intervention appears
- Demo constraint: timeline risk intervention ONLY fires for NordicMed Group (company name check in deal-agent.ts). Remove for production

**Editable close date:**
- Close date in deal header is now clickable → native date picker
- PATCH `/api/deals/[id]/update` saves to Supabase, React state updates inline without page refresh
- Generic endpoint accepts close_date, stage, win_probability

**Relative close dates in demo reset:**
- Demo reset now sets close dates relative to current date: MedVista today+55d, NordicMed today+42d, TrustBank today+60d, PharmaBridge today+90d, NordicCare today+45d, Atlas today+30d
- Ensures intervention always triggers regardless of when the demo runs

**Landing page rebuild:**
- New thesis copy: "Your AEs don't have an information problem — they have a time problem"
- Two release cards (Persistent Deal Agents, Smart Interventions) side by side at top
- Three pillars: One Conversation Zero Updates, Capture What Evaporates, Agents That Anticipate
- Attribution: "Designed by an enterprise AE. Built entirely with Claude."
- Context note about manual triggers in demo vs automatic in production
- Footer: "Built for the enterprise sales motion Anthropic is scaling right now."
- Enter Demo button with existing reset + loading states preserved
- All content fits on 1440x900 viewport without scrolling

**Guided demo checklist:**
- `DemoGuide` component: floating panel on right side of dashboard (position: fixed, 280px wide)
- 10 steps guiding through NordicMed pipeline → intervention → call prep → MedVista pipeline → cross-deal intelligence → Intelligence dashboard
- Hybrid detection: URL-based auto-advance (steps 1, 7, 10), element-based via `data-workflow-tracker`/`data-workflow-complete` attributes (steps 2, 3, 8), manual "Done ✓" buttons (steps 4, 5, 6, 9)
- Activated on Enter Demo (localStorage flags set in landing page), toggle via floating "Guide" button
- localStorage only — no server persistence. Cleared on demo reset (localStorage.clear())
- Added to dashboard layout.tsx, visible on all dashboard pages

**Key files added/modified:**
- `apps/web/src/app/api/deals/[id]/update/route.ts` — new PATCH endpoint
- `apps/web/src/components/agent-intervention.tsx` — redesigned with action buttons
- `apps/web/src/actors/deal-agent.ts` — closeDate/companyName in state, timeline risk check, NordicMed constraint
- `apps/web/src/app/page.tsx` — full landing page rebuild
- `apps/web/src/components/demo-guide.tsx` — new guided demo checklist
- `apps/web/src/components/workflow-tracker.tsx` — added data-workflow-tracker/data-workflow-complete attributes
- `apps/web/src/app/(dashboard)/layout.tsx` — added DemoGuide component

## Session S14: Post-Sale Account Management

### Schema Changes (Migration 0005)
- **`knowledgeArticles`** — Internal knowledge base articles (implementation guides, case studies, resolution histories, best practices). No FKs. Fields: title, articleType (text), content (full body), summary, products[], verticals[], tags[], resolutionSteps (jsonb), relatedCompanyIds (uuid array, no FK), effectivenessScore, viewCount.
- **`customerMessages`** — Inbound customer communications. FKs: companyId → companies, contactId → contacts, dealId → deals. Fields: subject, body, channel (text: email/support_ticket/slack/meeting_note), priority (text), status (text: pending/kit_ready/responded/resolved), responseKit (jsonb — AI-generated response kit), aiCategory (text).
- **`accountHealth`** — Post-close account state tracking. FKs: companyId → companies, dealId → deals. Fields: healthScore (0-100), healthTrend (text), contractStatus (text: onboarding/active/renewal_window/at_risk/churned), arr (decimal 12,2), productsPurchased[], usageMetrics (jsonb), keyStakeholders (jsonb), expansionSignals (jsonb), riskSignals (jsonb), contractedUseCases (jsonb), expansionMap (jsonb), proactiveSignals (jsonb), renewalDate, lastTouchDate, daysSinceTouch, nextQbrDate, onboardingComplete.
- No new pgEnum types — all status-like fields use plain text (same pattern as observationClusters)
- Relations added for all 3 tables (knowledgeArticlesRelations is empty, customerMessages has company/contact/deal, accountHealth has company/deal)

### Seed Data (`packages/db/src/seed-book.ts`)
- **18 post-close companies** across 4 verticals: 5 healthcare, 5 financial_services, 3 technology (life sciences), 5 retail
- **22 contacts** (1-2 per company) with realistic names, titles, emails
- **18 closed_won deals** all assigned to Sarah Chen, deal values matching ARR
- **18 account_health records** with full health data:
  - Healthy (score 70+): Meridian (85), Summit (90), Cornerstone (88), Metro (85), Apex (82), Vertex (80)
  - At-risk (score <60): Harbor Compliance (45, critical — champion departed), Evolve Retail (48, critical — stakeholder silent), Pinnacle Biotech (55, LIMS integration failing)
  - Renewal window: Pacific Coast (62, usage declining), Lighthouse (68, mixed signals), Brightside (70, competitor sniffing)
  - Onboarding: Cascadia (72, slow adoption), Pinnacle (55, integration blocked)
- **15 knowledge articles** with full 3-5 paragraph content each:
  - 5 technical/integration guides (healthcare API, FinServ Claude Code, rate limits, GDPR, multi-dept rollout)
  - 4 adoption/onboarding guides (30-day checklist, driving adoption, prompt workshop, exec sponsor framework)
  - 3 product-specific guides (healthcare patterns, FinServ compliance, Cowork for non-technical)
  - 3 resolution histories (Meridian latency, Redwood stakeholder transition, BrightPath LIMS integration)
- **8 customer messages** (6 with pre-generated response kits, 2 pending):
  - Harbor Compliance: churn signal — new COO reviewing contracts (kit_ready)
  - Pinnacle Biotech: LIMS integration failure (kit_ready)
  - Pacific Coast Medical: renewal usage review (kit_ready)
  - Cascade Supply Chain: 3rd latency escalation (kit_ready)
  - Cascadia Life Sciences: adoption help (kit_ready)
  - Atlas Retail Group: Cowork expansion inquiry (kit_ready)
  - Vertex Pharmaceuticals: clinical trials expansion (pending)
  - Lighthouse Insurance: SOC 2 docs request (pending)
- Response kits cross-reference seeded companies and article titles (e.g., Harbor kit references Redwood Capital resolution, Pinnacle kit references BrightPath LIMS resolution)
- All UUIDs are deterministic constants (company IDs start with `a0000001-`, contacts `b0000001-`, deals `c0000001-`, articles `d0000001-`)

### API Routes

**GET `/api/book`** (`apps/web/src/app/api/book/route.ts`)
- Query param: `?aeId=<uuid>`
- Returns AE's full book of post-close accounts: accountHealth joined with companies and deals where deals.assigned_ae_id = aeId AND stage = closed_won
- Includes nested customer messages per account with contact info
- Priority scoring: urgent message (+100), high message (+80), health <50 (+90), at_risk (+70), renewal_window (+60), medium message (+50), health <70 (+40), days_since_touch >20 (+30)
- Accounts sorted by priorityScore descending
- Metrics: totalAccounts, totalArr, healthyCount, atRiskCount, pendingMessages, upcomingRenewals

**POST `/api/customer/response-kit`** (`apps/web/src/app/api/customer/response-kit/route.ts`)
- Body: `{ messageId: string }`, optional query param `?force=true`
- If message already has kit (status: kit_ready) and !force, returns cached kit with `cached: true`
- Otherwise gathers context in parallel: message+company+contact+deal, account health, all knowledge articles (filtered by vertical/tags in code), other accounts in same vertical, system intelligence
- Calls Claude (`claude-sonnet-4-20250514`, max_tokens: 2048) with full account context and knowledge base
- Returns structured response kit: message_analysis, similar_resolutions, recommended_resources, draft_reply, internal_notes
- Saves kit to customerMessages.responseKit, updates status to kit_ready
- maxDuration: 60

### Response Kit Data Flow
Customer message received → POST `/api/customer/response-kit` → parallel context queries (account health, knowledge base, vertical accounts, system intel) → Claude generates kit with cross-account pattern matching → kit saved to customerMessages.responseKit → status updated to kit_ready → AE sees kit in UI

**POST `/api/customer/qbr-prep`** (`apps/web/src/app/api/customer/qbr-prep/route.ts`)
- Body: `{ companyId, companyName, qbrType, accountContext }` — client sends all data from state, no DB query
- QBR types: Renewal Defense, Expansion Pitch, Usage Review, Executive Re-engagement
- Calls Claude (`claude-sonnet-4-20250514`, max_tokens: 2048) with account context including use cases, expansion map, stakeholders
- Returns structured QBR brief: executive_summary, agenda_items (topic, duration, talking_points, data_to_prepare, desired_outcome), stakeholder_strategy, risk_to_address, success_metric
- maxDuration: 60

### Schema Changes (Migration 0006)
- Added 3 jsonb columns to `accountHealth`: `contractedUseCases`, `expansionMap`, `proactiveSignals`
- **contractedUseCases**: array of `{ team, seats, product, useCase, expectedOutcome, adoptionStatus (on_track/needs_attention/at_risk), activeUsers, notes }`
- **expansionMap**: array of `{ department, headcount, currentProduct, recommendedProduct, opportunityArr, rationale }`
- **proactiveSignals**: array of `{ type (product_release/industry_news/customer_news), signal, relevance, action, daysAgo }`
- Populated for 8 key accounts: Harbor Compliance, Pinnacle Biotech, Summit Genomics, Pacific Coast Medical, Atlas Retail, Cornerstone Banking, Evolve Retail Tech, Cascadia Life Sciences

### My Book Page (`apps/web/src/app/(dashboard)/book/book-client.tsx`)
- Morning Brief (seeded, collapsible) — portfolio summary with urgent accounts, renewal wave, expansion opportunities
- Cross-Book Intelligence — 4 pattern cards: Renewal Wave, Integration Pattern, Expansion Cluster, Onboarding Risk (hardcoded)
- Priority queue — top 5 accounts by priority score with risk signals and response kit buttons
- All Accounts table — sortable by health score, vertical filter chips, click-to-open drawer
- Response Kit modal — reusable component, works from priority cards and drawer
- **Account Detail Drawer** (12 sections):
  1. Header (name, vertical, ARR)
  2. Health Overview — relabeled factors: Seat Utilization, Usage Trend, Stakeholder Health, Engagement Recency (with subtitles)
  3. Contracted Use Cases — cards with product pills, adoption status badges, seat utilization bars
  4. Contract — status, renewal date, products
  5. Usage Metrics — API calls, trend, active seats
  6. Key Stakeholders — status dots (engaged/silent/new/departed)
  7. Expansion Map — total whitespace ARR, department cards with recommended products
  8. Risk Signals — warning icons with signal text
  9. Expansion Signals — existing signals with product badges
  10. Proactive Signals — typed icons, relevance, actionable next steps in coral
  11. Recent Messages — pending/kit_ready with response kit links
  12. Actions: Log Observation (functional POST to /api/observations), Prep for QBR (4-type selector → Claude API → inline brief with copy), Draft Check-in Email (hardcoded per account)

### Key Files
```
packages/db/src/schema.ts                            → 3 new tables + relations (33 total), 3 new jsonb columns on accountHealth
packages/db/drizzle/0005_dashing_the_executioner.sql → Migration for new tables
packages/db/drizzle/0006_abnormal_betty_brant.sql    → Migration for accountHealth jsonb columns
packages/db/src/seed-book.ts                         → Full post-sale seed data (18 companies, 22 contacts, 18 deals, 18 health records, 15 articles, 8 messages)
apps/web/src/app/api/book/route.ts                   → GET book of accounts
apps/web/src/app/api/customer/response-kit/route.ts  → POST generate/return response kit
apps/web/src/app/api/customer/qbr-prep/route.ts      → POST generate QBR agenda via Claude
apps/web/src/app/(dashboard)/book/book-client.tsx     → My Book page with drawer, all sections
apps/web/src/components/response-kit-modal.tsx        → Reusable Response Kit modal
```

## Session 13 (Post-Sale Book)

- 3 new tables: `knowledge_articles`, `customer_messages`, `account_health` (35 tables total)
- 5 jsonb columns added to `account_health`: `contracted_use_cases`, `expansion_map`, `proactive_signals`, `similar_situations`, `recommended_resources`
- Migrations: 0005, 0006, 0007
- `seed-book.ts`: 18 post-close companies, 22 contacts, 18 closed_won deals (Sarah Chen), 18 account_health records, 15 KB articles, 8 customer messages (6 with response kits)
- New API routes: `GET /api/book`, `POST /api/customer/response-kit`, `POST /api/customer/qbr-prep`, `POST /api/customer/outreach-email`
- `/book` page sections: Morning Brief (seeded), Cross-Book Intelligence (4 pattern cards), All Accounts table with vertical filters, Account Detail Drawer (14 sections)
- Drawer sections: health overview (Seat Utilization, Usage Trend, Stakeholder Health, Engagement Recency as days), contracted use cases with adoption bars and check-in email generation (multi-select purpose chips + free text), contract info, usage metrics, stakeholders, expansion map, risk signals, expansion signals, proactive signals with clickable email actions, similar situations with transferable playbooks, recommended resources, recent messages with response kit modal, actions (log observation functional, QBR prep with live Claude, draft check-in email)
- Sidebar: My Book added between Pipeline and Intelligence
- "Needs Your Attention" section hidden, page order: Brief → Metrics → Cross-Book → All Accounts
- Demo reset updated for new tables
- Response kit modal z-index fixed above drawer (drawer z-40, modal z-50)

## Session S15: Deal Fitness (oDeal Framework)
- Added tables: deal_fitness_events, deal_fitness_scores
- Added seed: seed-deal-fitness.ts — Horizon Health Partners account
  - Company: Horizon Health Partners (healthcare, $890M revenue, 4,200 employees)
  - 7 contacts: Amanda Chen (champion), Priya Mehta (tech eval), Robert Garrison (EB), Lisa Huang (end user), James Whitfield (CISO), Mark Davidson (procurement), Dr. Sarah Kim (CMO)
  - Deal: $1.8M, Negotiation stage, Sarah Chen AE, Alex Kim SC
  - 5 call transcripts spanning 8 weeks
  - 14 email activities showing buyer committee expansion
  - MEDDPICC populated from transcript evidence
  - Deal milestones tracking buyer's journey
  - UUID pattern: e0=companies, e1=contacts, e2=deals, e3=transcripts, e4=fitness events, e5=fitness scores, e6=milestones, e7=meddpicc
- Part 2 (S15.2) seeded 25 fitness events + 1 scores record + GET /api/deal-fitness
- Part 3 will build the Deal Fitness UI page

### Session S15.2: Deal Fitness Events + API
- Seed file (`seed-deal-fitness.ts`) refactored: base records gated on `baseAlreadySeeded`, fitness events/scores always re-seeded (delete-then-insert) so the script is fully idempotent
- 25 `deal_fitness_events` for Horizon Health: 20 detected + 5 not_yet
  - Business Fit: 6 events (5 detected, 1 not_yet) = 83%
  - Emotional Fit: 6 events (4 detected, 2 not_yet) = 67%
  - Technical Fit: 6 events (6 detected, 0 not_yet) = 100%
  - Readiness Fit: 7 events (5 detected, 2 not_yet) = 71%
  - Each detected event has `evidenceSnippets` (short quotes) and `sourceReferences` linking to actual transcript UUIDs and email-activity UUIDs
- 1 `deal_fitness_scores` record: overall 80, accelerating velocity, fitImbalanceFlag true (Technical 100 vs Emotional 67 = 33-pt spread), benchmarkVsWon for Negotiation/Healthcare
- New API route `apps/web/src/app/api/deal-fitness/route.ts`:
  - `GET /api/deal-fitness` → portfolio view (all deals with fitness scores), sorted by imbalance flag desc, then overall fitness asc
  - `GET /api/deal-fitness?dealId=<uuid>` → single-deal view: `{ deal, scores, events: { business_fit, emotional_fit, technical_fit, readiness_fit }, timeline }`
  - Events grouped by category, detected first (chronological) then not_yet
  - Timeline = all detected events sorted by detectedAt asc
- UUID convention extended: `e4` = fitness events, `e5` = fitness scores

### Session S15.3: Deal Fitness UI page
- New sidebar nav item: "Deal Fitness" (Activity icon), placed between Playbook and Outreach
- Page route: `/deal-fitness` (server component fetches portfolio via internal `GET /api/deal-fitness`)
- Client: `apps/web/src/app/(dashboard)/deal-fitness/deal-fitness-client.tsx`
  - Two views toggled by React state (no URL routing): Portfolio + Drill-Down
  - Portfolio: 4 summary cards (Portfolio Fitness avg, Deals Tracked, Fit Imbalances, Events This Week) + deal table with B/E/T/R mini progress bars, circular ring gauge for overall fitness, velocity trend, and "Days Quiet" coral when >7
  - Drill-down: deal header card with 80px circular gauge + benchmark line, radar chart card, event timeline card, 2×2 fit cards grid
  - Radar chart: pure SVG, four axes (Business/Technical/Readiness/Emotional), grid rings at 25/50/75/100, coral filled polygon for this deal + dotted sand polygon for won-deal benchmark, vertex dots, axis labels with score percentages, `overflow: visible` so labels are not clipped
  - Velocity timeline: pure SVG, 4 category rows (color-coded blue/coral/green/purple), Week 0-8 ticks, gap markers (dashed amber line + day count) when >10 days between consecutive events in a row, hover tooltips via `<title>`
  - Fit cards: each shows icon, label, score pill (`detected/total · pct%`), expandable event rows. Detected events show ✓ + week label + source badges (Transcript blue / Email green) + contact name. Not_yet events show gray ring + italic 💡 Coaching text in muted. Click to expand reveals full description, evidence snippets in sand-light cards with coral left border, and confidence bar
- All styling uses inline styles with the existing Nexus PALETTE (matches playbook page convention) — no new design tokens introduced
- Build gotcha re-encountered: running `pnpm build` while the dev preview server is running corrupts `.next` and the dev server returns HTML 500. Always stop preview, `rm -rf apps/web/.next`, build, then restart preview

### Session S15.4: Deep deal intelligence (Stakeholder Map, Buyer Momentum, Conversation Signals)
- Replaced the SVG Event Timeline card with three richer analysis cards driven by seeded jsonb data
- New schema columns on `deal_fitness_scores` (migration 0009): `stakeholder_engagement`, `buyer_momentum`, `conversation_signals` (all jsonb)
- API route `/api/deal-fitness?dealId=…` now returns these three fields inside the `scores` object
- Seed (`seed-deal-fitness.ts`):
  - `stakeholderEngagement` — 7 contacts with `weeksActive`, `callsJoined`, `introducedBy`, plus department list and benchmark vs. won deals (5.8 avg vs. this deal's 7)
  - `buyerMomentum` — 8-point response time trend (36h → 0.75h), 71% buyer-initiated email ratio with won/lost benchmarks, 8 commitments with `madeBy`/`madeIn`/`fulfilledHow`/`fulfilledWeek`
  - `conversationSignals` — 5-point ownership-language trajectory (20% → 88% "we/our"), `healthy_skepticism` sentiment profile with 3 key moments, and a synthesized `dealInsight` paragraph
- UI (`deal-fitness-client.tsx`):
  - **StakeholderEngagementCard** (left, ~50%): table with role badges + a 9-column W0–W8 grid using solid coral dots for call-weeks and outlined coral dots for email-only weeks. Visual triangle expanding from top-left as the committee grows
  - **BuyerMomentumCard** (right top): 3 metric rows — sparkline (pure SVG path + area fill), buyer-initiated horizontal bar with overlay, "8 of 8" promises with expandable accordion of all commitments
  - **ConversationSignalsCard** (right bottom): 5 stacked horizontal language bars (styled divs, not SVG) showing the 20% → 88% shift, `lang.insight` italic, sentiment "Deal Temperament" section with description + collapsible key-moment rows (color-coded left border per signal strength)
  - **FitCard last-event badge**: each fit card header now shows a `Nd ago` pill colored by recency — neutral <7d, amber 7–14d, danger >14d. Computed client-side from the events array
  - **Bottom Nexus Intelligence card**: full-width card with `✦ NEXUS INTELLIGENCE` header rendering `dealInsight` as a paragraph
- Removed `VelocityTimeline` component entirely, removed `timeline` from the destructured `DrillContent` props (but the API still returns it for potential future use)
- TypeScript fix: `let bg/fg/border: string` annotations needed on `lastBadge` in `FitCard` because `PALETTE` is `as const`


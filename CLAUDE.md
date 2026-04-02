# NEXUS — Architecture Reference

## Overview
Nexus is a full-cycle AI sales orchestration platform where AEs direct AI agents across the buyer's journey. Built as a demo for Anthropic's sales leadership. Monorepo: Turborepo + pnpm, Next.js 14 (App Router, Turbopack), shadcn/ui + Tailwind, Supabase PostgreSQL + Drizzle ORM, Claude API. Deployed on Vercel at `nexus-web-plum-iota.vercel.app`.

## File Structure
```
apps/web/src/app/                    → Next.js pages + API routes
apps/web/src/app/(dashboard)/        → Dashboard pages (13 routes)
apps/web/src/app/api/                → API routes (25 endpoints)
apps/web/src/components/             → Shared components
apps/web/src/lib/                    → DB connection, utils
packages/db/src/schema.ts            → 30 tables, all enums and relations
packages/db/src/seed-*.ts            → 16 seed scripts
packages/db/src/seed-data/           → Extracted seed data (playbook evidence, experiments)
packages/shared/src/types.ts         → Shared types, stage labels
```

## Database Tables (30)

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

## API Routes (29)

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
| `components/layout/sidebar.tsx` | 6-item navigation sidebar |
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

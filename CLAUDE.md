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

## API Routes (27)

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
| `/api/deals/[id]/meddpicc-update` | PATCH | Persist MEDDPICC scores from pipeline |

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

## Data Flows

### Observation Pipeline
Agent bar → POST `/api/observations` → Claude classifies (9 signal types) → entity extraction → fuzzy CRM matching → semantic cluster matching (confidence >= 0.6) → save observation → create/update cluster → route to support functions → if `process_innovation`: auto-create playbook idea

### Call Prep (8 Intelligence Layers)
Deal page "Prep Call" → POST `/api/agent/call-prep` → queries: (1) rep's agent config, (2) team intelligence by vertical, (3) system intelligence patterns, (4) win/loss patterns, (5) stakeholder alerts, (6) manager directives, (7) CRM context (deal, MEDDPICC, contacts, activities, transcripts), (8) playbook ideas (promoted + testing for this deal) → Claude API → structured brief

### Playbook Lifecycle
AE submits idea → proposed → manager approves (selects AEs, sets thresholds) → testing with A/B groups → measures velocity/sentiment/close rate with deal-level evidence → graduation when thresholds met → proven play injected into call prep as DIRECTIVE

### Demo Reset
POST `/api/demo/reset` → resets MedVista to Discovery → resets deal probabilities → deletes all playbook ideas and re-inserts 8 experiments with lifecycle data (evidence imported from `packages/db/src/seed-data/`) → deletes recent observations/queries/activities → marks notifications unread → recalculates cluster metrics

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
- Dev server default port 3001, auto-increments if occupied
- Influence scores and playbook "Start Test"/"Follow" buttons are UI-only in demo

## Deploy
```
pnpm dev                    # Dev server (Turbopack, port 3001)
git push origin main        # Vercel auto-deploys from main
```
Live: https://nexus-web-plum-iota.vercel.app
Reset link: `?reset=true` query param on landing page

## Rivet Actors (Sessions S10-P1, S10-P2)

Nexus uses Rivet (rivet.dev) for stateful AI agents. Documentation: https://rivet.dev/llms.txt

### File Structure
```
apps/web/src/actors/deal-agent.ts          → Deal agent actor (state, actions, events)
apps/web/src/actors/transcript-pipeline.ts → Transcript pipeline workflow actor (5 Claude steps)
apps/web/src/actors/registry.ts            → Actor registry (setup + type export)
apps/web/src/app/api/rivet/[...all]/route.ts → Rivet handler via @rivetkit/next-js toNextHandler
apps/web/src/app/api/transcript-pipeline/route.ts → Pipeline trigger (fetches deal context, enqueues work)
apps/web/src/app/api/deals/[id]/meddpicc-update/route.ts → MEDDPICC persistence (called by pipeline actor)
apps/web/src/lib/rivet.ts                  → Client-side useActor hook (createRivetKit)
apps/web/src/components/agent-memory.tsx    → Deal agent memory display (expandable on deal page)
apps/web/src/components/workflow-tracker.tsx → Real-time 5-step pipeline progress tracker
```

### Deal Agent (`dealAgent`)
- One per deal, created lazily via `getOrCreate([dealId])`
- Accumulates intelligence: interactionMemory, learnings, competitiveContext, riskSignals
- Actions: initialize, getState, recordInteraction, updateLearnings, addCompetitiveIntel, recordFeedback, updateStage, getMemoryForPrompt, workflowProgress
- Events: memoryUpdated, learningsUpdated, riskDetected, workflowProgress, interventionReady
- `formatMemoryForPrompt()` exports agent memory as structured text for call prep (9th intelligence layer)
- Agent state persists across sessions (not lost on page refresh)
- Supabase remains source of truth — agents are the intelligence/memory layer on top

### Transcript Pipeline (`transcriptPipeline`)
- Durable Rivet workflow actor using `workflow()` + `ctx.loop()` + `loopCtx.step()`
- Queue-driven: receives work via `pipeline.send("process", { ... })` from `/api/transcript-pipeline`
- 5 sequential Claude API steps, each inside a `loopCtx.step()`:
  1. **Extract Actions** — action items, commitments, decisions
  2. **Score MEDDPICC** — evidence-based scoring with deltas
  3. **Detect Signals** — competitive mentions + stakeholder sentiment
  4. **Synthesize Learnings** — strategic insights for deal agent
  5. **Draft Email** — follow-up email from call context
- Downstream effects: persists MEDDPICC to Supabase, creates observations, updates deal agent memory
- Progress broadcasts via deal agent's `workflowProgress` action → WebSocket to browser
- **Workflow rule**: all `state`, `client()`, and actor-to-actor RPCs must be inside `loopCtx.step()` callbacks

### React Integration
- `useActor({ name, key })` hook from `@/lib/rivet` — no provider needed
- Used by: agent-memory.tsx, workflow-tracker.tsx, deal-detail-client.tsx
- Client endpoint: `window.location.origin/api/rivet` (browser), `NEXT_PUBLIC_SITE_URL/api/rivet` (SSR)

### Vercel / Next.js Integration
- `@rivetkit/next-js` package: `toNextHandler(registry)` auto-spawns local engine in dev, serverless on Vercel
- `next.config.mjs`: `serverExternalPackages: ["rivetkit", "@rivetkit/next-js"]` (prevents webpack bundling)
- `/api/rivet/[...all]/route.ts`: exports GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS with `maxDuration = 300`
- `/api/transcript-pipeline/route.ts`: `maxDuration = 30`
- `/api/deals/[id]/meddpicc-update/route.ts`: `maxDuration = 15`

### Environment Variables
- `RIVET_ENDPOINT` — Rivet Cloud internal endpoint (production only)
- `RIVET_PUBLIC_ENDPOINT` — Rivet Cloud public endpoint (production only)
- `NEXT_PUBLIC_SITE_URL` — Absolute URL for server-side Rivet client creation (e.g. `https://nexus-web-plum-iota.vercel.app`)
- `ANTHROPIC_API_KEY` — Used by transcript pipeline actor for Claude API calls

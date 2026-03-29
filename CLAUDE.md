# NEXUS — AI Sales Orchestration Platform

## Project Overview
Nexus is a full-cycle AI sales orchestration platform where human AEs direct AI agents to automate key elements of the buyer's journey. Built as a functional demo for Anthropic's mid-market sales leadership. Every person in the sales cycle gets their own configurable AI agent connected through an organizational learning loop — feedback from downstream roles reshapes upstream agent behavior.

The platform has three layers:
1. **Context Engine** — observations, intelligence clustering, cross-agent feedback, entity extraction, agent config. The agent knows things.
2. **Action Layer** — call prep, email drafting, intent-routed agent bar. The agent does things.
3. **Intelligence Layer** — system intelligence (data-driven patterns), manager directives, win/loss patterns, stakeholder alerts. The system learns from everything happening inside it.

## Tech Stack
- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 14 (App Router, Turbopack dev) + TypeScript
- **UI:** shadcn/ui + Tailwind CSS + Tremor (charts/data viz)
- **Database:** Supabase PostgreSQL + Drizzle ORM
- **AI:** Claude API (`@anthropic-ai/sdk`, model: `claude-sonnet-4-20250514`)
- **Hosting:** Vercel (frontend)
- **Auth:** None (public demo) — persona switching via PersonaProvider context
- **Dev server:** `pnpm dev` runs on port 3000 (Turbopack)

## Code Conventions
- TypeScript strict mode everywhere
- ES modules (import/export, no require)
- React: functional components only
- Styling: Tailwind utility classes only
- Components: shadcn/ui as base, customize with Anthropic brand tokens
- API routes: Next.js App Router route handlers
- Database: Drizzle ORM with typed queries, no raw SQL
- Naming: camelCase variables/functions, PascalCase components/types, kebab-case files
- Default exports for pages, named exports for utilities
- IDs: `uuid("id").defaultRandom().primaryKey()` — no `generateId()` helper
- Server components use `export const dynamic = "force-dynamic"`

## Anthropic Brand Palette
--bg-primary: #FAF9F6 (warm cream background)
--bg-card: #FFFFFF (card background)
--bg-sidebar: #F5F3EF (sidebar)
--accent-teal: #0C7489 (primary accent)
--accent-teal-light: #E6F4F7 (teal hover)
--accent-coral: #D4735E (secondary accent, alerts)
--accent-coral-light: #FDF0ED (coral highlight)
--text-primary: #1A1A1A
--text-secondary: #6B6B6B
--text-muted: #9B9B9B
--border: #E8E5E0
--success: #2D8A4E
--warning: #D4A843
--danger: #C74B3B

### Additional UI Tokens (used in observation/agent bar)
--sand: #E8DDD3 (backgrounds)
--sand-light: #F3EDE7 (hover states)
--coral: #E07A5F (accents, icons)
--text: #3D3833 (primary text)
--text-muted: #8A8078 (secondary text)
--card-shadow: 0 4px 24px rgba(107,79,57,0.08)
--border: rgba(0,0,0,0.06)

### Chip UI Pattern (used throughout — observation bar, call prep, close/lost capture)
- Selected: bg-[#3D3833] text-white
- Default: bg-[#F5F3EF] text-[#3D3833]
- Hover: bg-[#E8DDD3]
- Driven by React state, not CSS pseudo-classes

Font: DM Sans. Border radius: 12px cards, 8px buttons, 6px badges.

## Vertical Colors
Healthcare: #3B82F6 (blue)
Financial Services: #10B981 (emerald)
Manufacturing: #F59E0B (amber)
Retail: #8B5CF6 (violet)
Technology: #06B6D4 (cyan)

## Pipeline Stages
New Lead → Qualified → Discovery → Technical Validation → Proposal → Negotiation → Closing → Closed Won / Closed Lost

---

## Organization Structure

### Team Members (14 people in `teamMembers` table)
- **Sarah Chen** — AE, Healthcare
- **Priya Sharma** — AE, Technology
- **Marcus Thompson** — MANAGER, General
- **Ryan Foster** — AE, Healthcare
- **James Wilson** — AE, General
- **Elena Rodriguez** — AE, General
- **Alex Kim** — SA, Healthcare
- **Maya Johnson** — SA, Technology
- **Tom Bradley** — SA, General
- **Jordan Lee** — BDR, Healthcare
- **Casey Martinez** — BDR, Financial Services
- **Nina Patel** — CSM, Healthcare
- **Chris Okafor** — CSM, Technology
- **David Park** — AE, Financial Services (original seed member)

### Support Function Members (3 people in `supportFunctionMembers` table)
- **Lisa Park** — Sales Enablement
- **Michael Torres** — Product Marketing
- **Rachel Kim** — Deal Desk

Support function members are stored separately because they don't fit the `teamMembers` role enum. They're referenced by plain uuid (no FK) in `fieldQueries.initiatedBy` and `observationRouting.targetMemberId`.

---

## Database Schema

### 27 Tables in `packages/db/src/schema.ts`

**Core CRM:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `teamMembers` | Sales org roles | id, name, email, role (AE/BDR/SA/CSM/MANAGER), verticalSpecialization (single enum, not array) |
| `companies` | Account records | id, name, industry (verticalEnum), employeeCount, techStack (text[]), hqLocation |
| `contacts` | People at companies | id, firstName, lastName, title, companyId (FK), roleInDeal (champion/economic_buyer/etc), isPrimary |
| `deals` | Pipeline deals | id, name, companyId, assignedAeId/BdrId/SaId, stage, dealValue, vertical, competitor, lossReason, closeCompetitor, closeNotes, closeImprovement, winTurningPoint, winReplicable, closedAt |
| `dealMilestones` | Progress milestones | dealId, milestoneKey, isCompleted, source (manual/transcript/ai_detected) |
| `meddpiccFields` | MEDDPICC per deal (unique on dealId) | 7 fields × (text + confidence integer): metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion, competition |
| `dealStageHistory` | Stage transition audit | dealId, fromStage, toStage, changedBy (ai/human), reason |
| `activities` | Timeline entries | dealId, contactId, teamMemberId, type (15 types incl. call_prep, email_draft, observation), subject, description, metadata (jsonb) |
| `leadScores` | ICP/engagement/intent | companyId, dealId, score, icpMatchPct, engagementScore, intentScore |

**Outreach:**
| Table | Purpose |
|-------|---------|
| `emailSequences` | Multi-step email campaigns |
| `emailSteps` | Individual steps with send/open/reply tracking |

**Call Intelligence:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `callTranscripts` | Raw transcripts | dealId, title, date, transcriptText, participants (jsonb) |
| `callAnalyses` | AI-extracted insights (unique on transcriptId) | summary, painPoints (jsonb), nextSteps (jsonb), competitiveMentions (jsonb), coachingInsights (jsonb), callQualityScore |

**Agent System:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `agentConfigs` | Per-member agent config | teamMemberId, agentName, roleType, instructions (text), outputPreferences (jsonb: communicationStyle, guardrails[], dealStageRules{}, industryFocus[]), isActive |
| `agentConfigVersions` | Config change history | agentConfigId, version, changedBy (user/ai/feedback_loop), changeReason |
| `feedbackRequests` | Agent output feedback | fromMemberId, fromAgentConfigId, targetRoleType, description, requestType, status |
| `agentActionsLog` | Audit log | agentConfigId, actionType, inputData, outputData, dealId |
| `crossAgentFeedback` | Teammate-to-teammate recommendations | sourceMemberId, targetMemberId, content, dealId, accountId, vertical |

**Observation & Intelligence:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `observations` | Field observations | observerId, rawInput, aiClassification (jsonb), clusterId, linkedAccountIds[], linkedDealIds[], extractedEntities (jsonb), followUpQuestion/Response |
| `observationClusters` | Semantic groupings | title, summary, signalType, severity, resolutionStatus, arrImpactTotal, verticalsAffected[], unstructuredQuotes (jsonb) |
| `observationRouting` | Routes to support functions | observationId, targetFunction, targetMemberId, status (sent/acknowledged/in_progress/resolved) |
| `supportFunctionMembers` | Non-sales personas | name, role, function, verticalsCovered[] |

**Field Query Engine:**
| Table | Purpose |
|-------|---------|
| `fieldQueries` | Manager/support questions | initiatedBy (no FK, can be either table), rawQuestion, aiAnalysis (jsonb), aggregatedAnswer (jsonb), status, expiresAt |
| `fieldQueryQuestions` | Per-AE questions | queryId, targetMemberId, questionText, chips[], dealId, responseText, giveBack (jsonb) |

**System Intelligence:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `systemIntelligence` | Pre-computed data patterns | vertical (nullable = org-wide), insightType (transcript_pattern/stakeholder_pattern/competitive_pattern/velocity_pattern/win_pattern/loss_pattern/meddpicc_pattern/process_insight), title, insight, supportingData (jsonb: sample_size, time_range, metric), confidence, relevanceScore, status |
| `managerDirectives` | Leadership directives | authorId, scope (org_wide/vertical/role/person), directive, priority (mandatory/strong/guidance), category (pricing/positioning/process/competitive/messaging), isActive, expiresAt |

**Resources:**
| Table | Purpose |
|-------|---------|
| `resources` | Knowledge base docs | title, type (one_pager/case_study/whitepaper/faq/battlecard/roi_calculator/security_doc/template), verticals[], description |

**System:**
| Table | Purpose |
|-------|---------|
| `notifications` | In-app notifications | teamMemberId, type, title, message, dealId, isRead, priority |

---

## API Routes

### Core CRM
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/deals` | GET | All deals with company/member/contact joins |
| `/api/deals/stage` | POST | Update deal stage with close/lost and close/won outcome capture (lossReason, closeCompetitor, closeNotes, closeImprovement, winTurningPoint, winReplicable) |
| `/api/deals/resolve` | POST | Resolve deal from name fragment or ID; returns contacts for agent context |
| `/api/companies` | GET | All companies (id, name, industry) |
| `/api/team-members` | GET | All team members |
| `/api/activities` | GET | Recent activities (limit 20) with full joins |
| `/api/notifications` | GET | Notifications filtered by member |

### Observation System
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/observations` | GET, POST | GET: list observations. POST: full pipeline — classify with Claude, extract entities, resolve to CRM, calculate ARR, semantic cluster matching, routing to support functions, cross-agent feedback |
| `/api/observations/[id]/follow-up` | POST | Process follow-up response, recalculate cluster ARR, fire notification chains |
| `/api/observations/clusters` | GET | All clusters ordered by recency |
| `/api/observation-routing` | GET, PATCH | GET: routing records by function/member. PATCH: update status with timestamps |

### Field Query Engine
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/field-queries` | GET, POST | GET: pending questions for AEs or queries for managers. POST: analyze question, generate deal-specific AE questions (3/AE limit, 24h expiry) |
| `/api/field-queries/respond` | POST | Process response, generate give-back insight, create observation, update aggregated answer |

### Call Analysis
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/analyze` | POST | Stream transcript analysis via Claude (text-event-stream) |
| `/api/analyze/link` | POST | Save analysis as deal activity with score metadata |

### Agent System
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/agent/configure` | POST, PUT | POST: interpret natural language config via Claude. PUT: save confirmed config + create version |
| `/api/agent/feedback` | POST | Create feedback request from rating |
| `/api/agent/call-prep` | POST | Generate structured call brief from deal + MEDDPICC + observations + clusters + agent config + team intelligence + system intelligence + manager directives + win/loss patterns + stakeholder alerts |
| `/api/agent/draft-email` | POST | Generate personalized email draft using deal context, transcript analysis, agent config voice/guardrails + team intelligence + system intelligence + directives |
| `/api/agent/save-to-deal` | POST | Save any agent action as a deal activity (dedupes same type+deal within 1 hour) |

---

## Pages & Components

### Dashboard Pages (`apps/web/src/app/(dashboard)/`)
| Route | Server/Client | Purpose |
|-------|--------------|---------|
| `/command-center` | Both | Executive dashboard: pipeline overview, activities, notifications |
| `/pipeline` | Both | Pipeline board (Kanban/table/chart views), drag-to-move, filters |
| `/pipeline/[id]` | Both | Deal workspace: details, contacts, activities, calls, MEDDPICC, "Prep Call" button, "Draft Follow-Up" button |
| `/prospects` | Both | Contact database with company/deal associations |
| `/calls` | Server | Call transcript library with analysis status |
| `/analyze` | Client | Real-time streaming call analyzer + "Draft Follow-Up Email" button |
| `/observations` | Both | Observation feed with classification and clustering |
| `/intelligence` | Both | Cross-functional intelligence dashboard: clusters, routing, field queries, "Ask Team" input |
| `/outreach` | Both | Email sequence builder and campaign tracking |
| `/agent-config` | Both | Agent configuration with natural language instructions and feedback loop |
| `/agent-admin` | Both | Agent administration view |
| `/analytics` | Both | Pipeline metrics, velocity, win rates, team performance |
| `/team` | Server | Team roster and org chart |

### Key Components (`apps/web/src/components/`)
| Component | Purpose |
|-----------|---------|
| `observation-input.tsx` | **Universal Agent Bar** (~1800 lines) — multi-mode interaction surface. Handles 4 intents: observe, quick check, call prep, email draft. Intent detection routes user input. 6-phase state machine for observations: collapsed → expanded → submitting → follow_up → follow_up_submitting → giveback. Also handles call_prep_context, call_prep_loading, draft_loading, draft_result phases. |
| `stage-change-modal.tsx` | Modal for pipeline stage transitions. When target is closed_won/closed_lost, shows outcome capture card with chip UI for loss reasons, improvements, win turning points, and replicable notes. Stage change blocked until outcome is captured. |
| `activity-feed.tsx` | Timeline activity list with type icons and observation entries |
| `quick-questions.tsx` | Legacy standalone quick questions (functionality merged into agent bar) |
| `providers.tsx` | PersonaContext provider for user/role switching |
| `layout/sidebar.tsx` | Role-based navigation sidebar |
| `layout/top-bar.tsx` | Top header bar |
| `analyzer/*` | 10 sub-components for call analysis display (stream, summary, coaching, deal score, key moments, risk signals, sentiment arc, talk ratio, transcript input, link to deal) |
| `feedback/agent-feedback.tsx` | Thumbs up/down rating with tags |

---

## Key Systems & How They Work

### 1. Observation System
AEs submit observations via the agent bar. The POST pipeline:
1. **Classify** with Claude — extracts signal type, urgency, scope, vertical, entities
2. **Resolve entities** — fuzzy matches extracted accounts/deals/competitors to CRM records
3. **Calculate ARR** — sums deal values from linked deals
4. **Semantic cluster matching** — Claude compares against existing cluster titles/descriptions (confidence >= 0.6)
5. **Save observation** with entity links
6. **Create/match cluster** — if no match, Claude groups unclustered observations semantically
7. **Append quotes** to cluster with deduplication
8. **Route to support functions** — creates `observation_routing` records for enablement/product marketing/deal desk
9. **Process agent signals** — `agent_tuning` and `cross_agent` signals trigger config changes
10. **Follow-up** — Claude decides if clarification needed; if deal context missing, generates deal selection chips

### 2. Intelligence Dashboard
Server component fetches clusters, observations, and routing records. Client component shows:
- Observation clusters with severity, ARR impact, and resolution status
- Support function routing with acknowledgment tracking
- "Ask Team" input for managers/support to create field queries
- "Your Queries" section with auto-refresh every 30 seconds
- Real average response time from routing acknowledgment timestamps

### 3. Field Query Engine
Managers ask questions → AI generates deal-specific questions for AEs → AEs respond with one tap → responses update dashboard with aggregated answers.
- 3 questions per AE limit, 24h expiration
- Give-back insight generated for each response
- Responses auto-create observations

### 4. Agent Bar (Universal Interaction Surface)
The bar at the bottom of every page detects intent from natural language input:
- **"prep my MedCore call"** → call prep (resolves entity, generates structured brief)
- **"draft follow-up to Oliver"** → email draft (resolves contact, generates email in AE's voice)
- **"CompetitorX dropping prices"** → observation (existing classification flow)
- **"what's the status on Atlas?"** → quick answer from deal data
- **"✦ 1 quick check waiting"** → field query response (priority collapsed state)

Meeting type selector starts BLANK (no auto-selection) — user must explicitly pick a type before generating.

### 5. Call Prep — Full Intelligence Stack
The call prep API gathers context from every subsystem and injects it into the Claude prompt. The brief includes:

**Layer 1 — Rep's Own Config (Session A)**
- Persona, communication style, guardrails, deal stage rules from `agentConfigs`
- Output matches the rep's voice, not generic AI

**Layer 2 — Team Intelligence (Session A)**
- Queries team members whose `verticalSpecialization` matches the deal's vertical
- Also checks `outputPreferences.industryFocus` for broader matching
- Filters guardrails to vertical-relevant ones
- Queries `crossAgentFeedback` for direct teammate recommendations
- Tagged with `📋 Team Intel from [Name] ([Role])` in the output

**Layer 3 — System Intelligence (Session B)**
- Queries `systemIntelligence` for data-driven patterns (transcript, stakeholder, competitive, velocity, win/loss, MEDDPICC patterns)
- Matches on deal vertical + org-wide insights
- Tagged with `📊` in the output

**Layer 4 — Win/Loss Patterns (Session B)**
- Queries closed deals in the same vertical with outcome data
- Surfaces loss patterns (what went wrong) and win patterns (what worked)
- Tagged with `📉` and `🏆` in the output

**Layer 5 — Stakeholder Alerts (Session B)**
- Counts activities per key contact (champion, economic_buyer) on this deal
- Flags under-engaged stakeholders (fewer than 2 logged interactions)
- Tagged with `⚠️` in the output

**Layer 6 — Manager Directives (Session B)**
- Queries `managerDirectives` matching deal vertical + org-wide
- Mandatory directives are hard constraints the AI cannot violate
- Tagged with `🔴 MANDATORY`, `🟡 STRONG`, `🟢 GUIDANCE`

**Layer 7 — CRM Context (original)**
- Deal data, MEDDPICC scores, contacts, recent activities, observations, clusters, transcript analyses, resources

### 6. Email Drafting
Same intelligence stack as call prep (lighter version — focuses on competitive patterns, win/loss, messaging directives). Email is written in the rep's voice using persona + communication style from agent config.

### 7. Agent Config
Per-member AI configuration: persona, communication style, guardrails, deal stage rules, industry focus. Config feeds into all AI actions (call prep, email draft, transcript coaching, observation give-back). Natural language instruction interpretation via Claude. Version history tracks changes by user, AI, or feedback loop.

### 8. Cross-Agent Feedback Loop
Observations with `cross_agent` signals trigger config changes on related agents. Claude suggests minimal config modifications. Version records created. Affected reps notified. Downstream role feedback reshapes upstream agent behavior.

### 9. Close/Lost Capture
When a deal moves to Closed-Won or Closed-Lost via the stage change modal:
- **Closed-Lost**: Captures loss reason (chip), competitor name (if competitor-won), notes, improvement suggestion (chip)
- **Closed-Won**: Captures turning point (chip), replicable notes
- Stage change is blocked until outcome is captured
- Data feeds into win/loss pattern analysis for future call preps

---

## Seed & Migration Scripts (`packages/db/src/`)
| Script | Purpose |
|--------|---------|
| `seed.ts` | Main seed: companies, contacts, deals, milestones, activities, lead scores, notifications |
| `seed-org.ts` | Extended 14-person org with role assignments and agent configs |
| `seed-agents.ts` | Rich agent config for Sarah Chen with version history and feedback entries |
| `seed-outreach.ts` | Demo email sequences and steps |
| `seed-observations.ts` | ~39 observations with classifications and clusters |
| `seed-intelligence.ts` | Support function members (Lisa Park, Michael Torres, Rachel Kim) |
| `seed-field-queries.ts` | 2 demo field queries |
| `seed-agent-actions.ts` | Demo call prep and email draft activities on MedCore deal |
| `seed-hero-activities.ts` | Recent hero activities for command center timeline |
| `seed-transcripts-resources.ts` | Demo call transcripts and resource hub documents |
| `seed-cross-feedback.ts` | 8 cross-agent feedback records + enriched SC/CSM configs with vertical insights |
| `seed-system-intelligence.ts` | 10 system intelligence insights + 6 manager directives + 5 closed deals with outcome data |
| `backfill-routing.ts` | Creates 34 routing records from existing observations |
| `backfill-entities.ts` | Links 4 observations to accounts/deals via fuzzy matching |

---

## Session Build History

### Sessions 1–4: Foundation
CRM data model, pipeline management, deal detail pages, contact management, activity tracking, Kanban board with drag-to-move.

### Session 5: Call Intelligence
Transcript upload/paste/demo, streaming Claude analysis, coaching tips, MEDDPICC extraction, deal scoring, sentiment arcs, link-to-deal.

### Session 6: Agent Configuration + Prospects/Outreach/Analytics/Calls
Per-member agent config, natural language instructions, version history, feedback loop with approval workflow. Added Prospects, Outreach, Analytics, and Calls pages.

### Session 7: Observation System
6-phase observation input, Claude classification with signal types, follow-up questions, give-back insights, observation feed page.

### Session 8: Intelligence Dashboard + ARR Impact + Support Functions
Intelligence dashboard with clusters, observation routing to support functions, ARR impact calculation, support function members, notification chains.

### Session 9: Field Query Engine + System Audit + Remediation
- Field query engine: bidirectional manager↔AE intelligence flow
- Full 11-point system audit (identified 2 FAKE, 3 PARTIAL systems)
- Remediation: fixed observation routing, deal page observations, cluster auto-creation, dashboard metrics, cross-agent feedback
- AI entity extraction: Claude extracts accounts/deals/competitors from observations, fuzzy matches to CRM
- Semantic clustering: Claude-based cluster matching replaces keyword overlap (confidence >= 0.6)
- Context follow-ups: auto-generates "Which deal?" with rep's deals as chips when deal context missing

### Session 9 cont: Agent Action Layer
- Universal agent bar: evolved ObservationInput into multi-mode interaction surface with intent detection
- AI call prep: structured brief from deal + MEDDPICC + observations + clusters + agent config
- AI email drafting: personalized emails in AE's voice from deal + transcript + agent config
- Agent config wiring: persona/guardrails/style feed into all AI actions
- Post-action activities: call prep and email drafts logged to deal timelines
- Quick checks merged into agent bar (removed standalone QuickQuestions from pipeline)
- "Prep Call" button on deal detail page, "Draft Follow-Up" button on analyze page

### Session A: Make Agent Configs Matter
- **Team intelligence read layer**: call prep and email draft API routes now query teammates' agent configs by deal vertical and inject expertise into the Claude prompt
- **Vertical matching**: uses both `verticalSpecialization` (enum) and `outputPreferences.industryFocus` (jsonb array) for comprehensive matching
- **Cross-agent feedback table**: new `crossAgentFeedback` table for teammate-to-teammate recommendations (8 seeded records)
- **Persona-driven output**: rep's communication style, guardrails, and deal stage rules shape the tone and constraints of every generated brief/email
- **Enriched SC/CSM configs**: Maya Johnson, Tom Bradley, Nina Patel, Chris Okafor configs updated with vertical-specific expertise
- **Meeting type default**: prep type selector starts blank (no auto-selection from deal stage)
- Architecture: team intelligence is READ-ONLY — nobody's config is modified, insights flow via prompt injection

### Session B: System Intelligence Layer
- **System intelligence table**: `systemIntelligence` with 10 seeded data-driven pattern insights across Healthcare (5), FinServ (2), Tech (1), org-wide (2)
- **Manager directives table**: `managerDirectives` with 6 seeded directives from Marcus Thompson (pricing caps, process requirements, messaging guidance, vertical-specific positioning)
- **Close/Lost capture UI**: stage change modal now shows contextual outcome capture when moving to Closed-Won or Closed-Lost (chip UI for reasons, improvements, turning points)
- **Deal outcome columns**: closeCompetitor, closeNotes, closeImprovement, winTurningPoint, winReplicable, closedAt added to deals table
- **5 seeded closed deals**: 3 lost (security review, pricing, no decision) + 2 won (champion-driven, compliance advantage) with full outcome data
- **Full intelligence wiring**: call prep prompt now includes system intelligence patterns, win/loss intelligence, stakeholder engagement alerts, and manager directives alongside team intelligence from Session A
- **Email draft intelligence**: competitive/win/loss patterns and messaging directives also flow into email generation

### Bug Fixes (across sessions)
- Follow-up fix: Removed keyword gating for follow-up decisions. Claude API now controls whether to ask follow-ups.
- Clustering bug: Fixed keyword threshold excluding short terms (>5 → >=4), added deduplication.
- FK constraint: Removed FK on `fieldQueries.initiatedBy` (can reference either table).
- PgArray error: Stale `.next` cache after schema changes — fix with `rm -rf .next`.
- Call prep 500 errors: fixed missing resource table reference, added error feedback to buttons.
- Activity deduplication: `save-to-deal` now dedupes same activity type + deal within 1 hour.

---

## Known Issues / Gotchas
- **PgArray error**: If schema changes (adding columns/tables), the Next.js dev server may throw `PgArray` errors from stale cache. Fix: `rm -rf apps/web/.next && pnpm dev`.
- **No auth**: The app uses persona switching via PersonaProvider context. There is no real authentication — any user can switch to any persona via the dropdown.
- **`verticalSpecialization` is a single enum**: Team members have ONE vertical, not an array. The `outputPreferences.industryFocus` array in agent configs provides broader coverage.
- **`initiatedBy` on `fieldQueries` has no FK**: Can reference either `teamMembers` or `supportFunctionMembers` (different tables).
- **Dev server port**: Default is 3000 but auto-increments if occupied.
- **ReadableStream error**: Next.js 14 occasionally throws `ReadableStream is already closed` on page navigation — this is a known Next.js internal issue, not app code.

---

## File Structure Quick Reference

```
nexus/
├── apps/web/src/
│   ├── app/
│   │   ├── api/                          # 20 API route files
│   │   │   ├── agent/                    # call-prep, draft-email, configure, feedback, save-to-deal
│   │   │   ├── analyze/                  # analyze, analyze/link
│   │   │   ├── deals/                    # deals, stage, resolve
│   │   │   ├── field-queries/            # field-queries, respond
│   │   │   ├── observations/             # observations, [id]/follow-up, clusters
│   │   │   └── ...                       # activities, companies, notifications, team-members, observation-routing
│   │   └── (dashboard)/                  # 13 pages, 9 client components
│   │       ├── pipeline/[id]/            # Deal detail page + stage change
│   │       └── ...
│   ├── components/                       # 18 components
│   │   ├── observation-input.tsx          # Universal Agent Bar (~1800 lines)
│   │   ├── stage-change-modal.tsx         # Stage change + close/lost capture
│   │   ├── analyzer/                      # 10 call analysis sub-components
│   │   └── ...
│   └── lib/
│       ├── db.ts                          # Drizzle DB connection
│       └── analysis/                      # Transcript analysis utils
├── packages/db/src/
│   ├── schema.ts                          # 27 tables, all enums and relations
│   ├── index.ts                           # Re-exports
│   └── seed-*.ts                          # 12 seed scripts
└── packages/shared/src/
    └── types.ts                           # Shared types, stage labels, nav config
```

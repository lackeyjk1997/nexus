# NEXUS — AI Sales Orchestration Platform

## Project Overview
Nexus is a full-cycle AI sales orchestration platform where human AEs direct AI agents to automate key elements of the buyer's journey. Built as a functional demo for Anthropic's mid-market sales leadership. Every person in the sales cycle gets their own configurable AI agent connected through an organizational learning loop — feedback from downstream roles reshapes upstream agent behavior.

The platform has two layers:
1. **Context Engine** — observations, intelligence clustering, cross-agent feedback, entity extraction, agent config. The agent knows things.
2. **Action Layer** — call prep, email drafting, intent-routed agent bar. The agent does things.

## Tech Stack
- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **UI:** shadcn/ui + Tailwind CSS + Tremor (charts/data viz)
- **Database:** Supabase PostgreSQL + Drizzle ORM
- **AI:** Claude API (`@anthropic-ai/sdk`, model: `claude-sonnet-4-20250514`)
- **Hosting:** Vercel (frontend)
- **Auth:** None (public demo) — persona switching via PersonaProvider context

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
- **David Park** — SA (original seed member)

### Support Function Members (3 people in `supportFunctionMembers` table)
- **Lisa Park** — Sales Enablement
- **Michael Torres** — Product Marketing
- **Rachel Kim** — Deal Desk

Support function members are stored separately because they don't fit the `teamMembers` role enum. They're referenced by plain uuid (no FK) in `fieldQueries.initiatedBy` and `observationRouting.targetMemberId`.

---

## Database Schema

### 24 Tables in `packages/db/src/schema.ts`

**Core CRM:**
| Table | Purpose |
|-------|---------|
| `teamMembers` | Sales org roles (AE, BDR, SA, CSM, MANAGER) |
| `companies` | Account records with industry, tech stack, enrichment |
| `contacts` | People at companies with role classification |
| `deals` | Pipeline deals with stage, value, forecast, MEDDPICC |
| `dealMilestones` | Deal progress milestones with evidence tracking |
| `meddpiccFields` | MEDDPICC scoring per deal (7 fields × confidence) |
| `dealStageHistory` | Audit trail of stage transitions |
| `activities` | Timeline entries (emails, calls, meetings, notes, agent actions) |
| `leadScores` | ICP match, engagement, and intent scoring |

**Outreach:**
| Table | Purpose |
|-------|---------|
| `emailSequences` | Multi-step email campaigns |
| `emailSteps` | Individual steps in a sequence with send/open/reply tracking |

**Call Intelligence:**
| Table | Purpose |
|-------|---------|
| `callTranscripts` | Raw transcript storage with participants |
| `callAnalyses` | AI-extracted insights: pain points, budget signals, coaching, MEDDPICC |

**Agent System:**
| Table | Purpose |
|-------|---------|
| `agentConfigs` | Per-member agent configuration (persona, instructions, output prefs) |
| `agentConfigVersions` | Version history of config changes (by user, AI, or feedback loop) |
| `feedbackRequests` | Cross-agent feedback with approval workflow |
| `agentActionsLog` | Audit log of all agent actions (emails, scoring, analysis) |

**Observation & Intelligence:**
| Table | Purpose |
|-------|---------|
| `observations` | Field observations with AI classification, entity linking, ARR impact |
| `observationClusters` | Semantic groupings of observations with severity and resolution |
| `observationRouting` | Routes observations to support functions (enablement, product marketing, deal desk) |
| `supportFunctionMembers` | Non-sales personas (enablement, product marketing, deal desk) |

**Field Query Engine:**
| Table | Purpose |
|-------|---------|
| `fieldQueries` | Manager/support questions sent to AEs |
| `fieldQueryQuestions` | Per-AE personalized questions with chips, response, give-back |

**System:**
| Table | Purpose |
|-------|---------|
| `notifications` | In-app notifications with type, priority, read status |

---

## API Routes

### Core CRM
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/deals` | GET | All deals with company/member/contact joins |
| `/api/deals/stage` | POST | Update deal stage, create history, log activity |
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
| `/api/agent/call-prep` | POST | Generate structured call brief from deal + MEDDPICC + observations + clusters + agent config |
| `/api/agent/draft-email` | POST | Generate personalized email draft using deal context, transcript analysis, agent config voice/guardrails |
| `/api/agent/save-to-deal` | POST | Save any agent action as a deal activity |

---

## Pages & Components

### Dashboard Pages (`apps/web/src/app/(dashboard)/`)
| Route | Server/Client | Purpose |
|-------|--------------|---------|
| `/command-center` | Both | Executive dashboard: pipeline overview, activities, notifications |
| `/pipeline` | Both | Pipeline board (Kanban/table/chart views), drag-to-move, filters |
| `/pipeline/[id]` | Both | Deal workspace: details, contacts, activities, calls, MEDDPICC, "Prep Call" button |
| `/prospects` | Both | Contact database with company/deal associations |
| `/calls` | Server | Call transcript library with analysis status |
| `/analyze` | Client | Real-time streaming call analyzer + "Draft Follow-Up Email" button |
| `/observations` | Both | Observation feed with classification and clustering |
| `/intelligence` | Both | Cross-functional intelligence dashboard: clusters, routing, field queries, "Ask Team" input |
| `/outreach` | Both | Email sequence builder and campaign tracking |
| `/agent-config` | Both | Agent configuration with natural language instructions and feedback loop |
| `/analytics` | Both | Pipeline metrics, velocity, win rates, team performance |

### Key Components (`apps/web/src/components/`)
| Component | Purpose |
|-----------|---------|
| `observation-input.tsx` | **Universal Agent Bar** — multi-mode interaction surface. Handles 4 intents: observe, quick check, call prep, email draft. Intent detection routes user input. Merged QuickQuestions functionality. 6-phase state machine for observations: collapsed → expanded → submitting → follow_up → follow_up_submitting → giveback |
| `quick-questions.tsx` | Legacy standalone quick questions (functionality merged into agent bar) |
| `activity-feed.tsx` | Timeline activity list with type icons and observation entries |
| `stage-change-modal.tsx` | Modal for pipeline stage transitions |
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
4. **Semantic cluster matching** — Claude compares against existing cluster titles/descriptions (confidence ≥ 0.6)
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

### 5. Call Prep
Gathers: deal details + MEDDPICC + recent activities + linked observations + relevant clusters + competitive signals + transcript analyses + agent config + vertical insights. Claude generates structured brief with: headline, deal snapshot, stakeholders, talking points, questions to ask (mapped to MEDDPICC gaps), risks, team intelligence, competitive context, suggested next steps. Brief renders inline with collapsible sections, "Copy to clipboard" and "Save to deal" actions.

### 6. Email Drafting
Gathers: agent config (voice, guardrails) + deal context + contact info + transcript analysis + recent emails + observations. Claude drafts email in AE's voice respecting guardrails. Draft renders inline with editable subject/body, regenerate, copy, and save to deal. Post-call follow-ups reference specific transcript moments.

### 7. Agent Config
Per-member AI configuration: persona, communication style, guardrails, deal stage rules, industry focus. Config feeds into all AI actions (call prep, email draft, transcript coaching, observation give-back). Natural language instruction interpretation via Claude. Version history tracks changes by user, AI, or feedback loop.

### 8. Cross-Agent Feedback Loop
Observations with `cross_agent` signals trigger config changes on related agents. Claude suggests minimal config modifications. Version records created. Affected reps notified. Downstream role feedback reshapes upstream agent behavior.

---

## Seed & Migration Scripts (`packages/db/src/`)
| Script | Purpose |
|--------|---------|
| `seed.ts` | Main seed: companies, contacts, deals, milestones, activities, lead scores, notifications |
| `seed-org.ts` | Extended 14-person org with role assignments |
| `seed-agents.ts` | Agent configs for all team members |
| `seed-outreach.ts` | Demo email sequences and steps |
| `seed-observations.ts` | ~39 observations with classifications and clusters |
| `seed-intelligence.ts` | Support function members (Lisa Park, Michael Torres, Rachel Kim) |
| `seed-field-queries.ts` | 2 demo field queries |
| `seed-agent-actions.ts` | Demo call prep and email draft activities on MedCore deal |
| `backfill-routing.ts` | Creates 34 routing records from existing observations |
| `backfill-entities.ts` | Links 4 observations to accounts/deals via fuzzy matching |

---

## Session Build History

### Sessions 1–4: Foundation
CRM data model, pipeline management, deal detail pages, contact management, activity tracking, Kanban board with drag-to-move.

### Session 5: Call Intelligence
Transcript upload/paste/demo, streaming Claude analysis, coaching tips, MEDDPICC extraction, deal scoring, sentiment arcs, link-to-deal.

### Session 6: Agent Configuration
Per-member agent config, natural language instructions, version history, feedback loop with approval workflow.

### Session 7: Observation System
6-phase observation input, Claude classification with signal types, follow-up questions, give-back insights, observation feed page.

### Session 8: Intelligence Dashboard + ARR Impact + Support Functions
Intelligence dashboard with clusters, observation routing to support functions, ARR impact calculation, support function members, notification chains.

### Session 9: Field Query Engine + System Audit + Remediation
- Field query engine: bidirectional manager↔AE intelligence flow
- Full 11-point system audit (identified 2 FAKE, 3 PARTIAL systems)
- Remediation: fixed observation routing, deal page observations, cluster auto-creation, dashboard metrics, cross-agent feedback
- AI entity extraction: Claude extracts accounts/deals/competitors from observations, fuzzy matches to CRM
- Semantic clustering: Claude-based cluster matching replaces keyword overlap (confidence ≥ 0.6)
- Context follow-ups: auto-generates "Which deal?" with rep's deals as chips when deal context missing

### Session 9 cont: Agent Action Layer
- Universal agent bar: evolved ObservationInput into multi-mode interaction surface with intent detection
- AI call prep: structured brief from deal + MEDDPICC + observations + clusters + agent config
- AI email drafting: personalized emails in AE's voice from deal + transcript + agent config
- Agent config wiring: persona/guardrails/style feed into all AI actions
- Post-action activities: call prep and email drafts logged to deal timelines
- Quick checks merged into agent bar (removed standalone QuickQuestions from pipeline)
- "Prep Call" button on deal detail page, "Draft Follow-Up" button on analyze page

### Bug Fixes
- Follow-up fix: Removed keyword gating for follow-up decisions. Claude API now controls whether to ask follow-ups. Strengthened prompt to skip follow-ups on highly specific observations. Added isHighDetail fallback heuristic.
- Clustering bug: Fixed keyword threshold excluding short terms (>5 → >=4), added duplicate observer+text filtering, added quote deduplication.
- FK constraint: Removed FK on `fieldQueries.initiatedBy` (can reference either table).
- PgArray error: Stale `.next` cache after schema changes — fix with `rm -rf .next`.

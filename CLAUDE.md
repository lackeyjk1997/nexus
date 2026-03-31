# NEXUS — AI Sales Orchestration Platform

## Project Overview
Nexus is a full-cycle AI sales orchestration platform where human AEs direct AI agents to automate key elements of the buyer's journey. Built as a functional demo for Anthropic's mid-market sales leadership. Every person in the sales cycle gets their own configurable AI agent connected through an organizational learning loop — feedback from downstream roles reshapes upstream agent behavior.

The platform has four layers:
1. **Context Engine** — observations, intelligence clustering, cross-agent feedback, entity extraction, agent config. The agent knows things.
2. **Action Layer** — call prep, email drafting, intent-routed agent bar. The agent does things.
3. **Intelligence Layer** — system intelligence (data-driven patterns), manager directives, win/loss patterns, stakeholder alerts. The system learns from everything happening inside it.
4. **Playbook Layer** — process intelligence, influence scoring, market signals, experiment tracking. The system measures what works and who's moving the needle.

## Tech Stack
- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 14 (App Router, Turbopack dev) + TypeScript
- **UI:** shadcn/ui + Tailwind CSS + Tremor (charts/data viz)
- **Database:** Supabase PostgreSQL + Drizzle ORM
- **AI:** Claude API (`@anthropic-ai/sdk`, model: `claude-sonnet-4-20250514`)
- **Hosting:** Vercel (frontend)
- **Auth:** None (public demo) — persona switching via PersonaProvider context
- **Dev server:** `pnpm dev` runs on port 3001 (Turbopack)
- **Deploy:** Vercel at nexus-web-plum-iota.vercel.app

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

### Tab UI Pattern (used on Intelligence and Playbook pages)
- Active tab: text-[#3D3833], font-weight 600, border-bottom 2px solid #E07A5F
- Inactive: text-[#8A8078], font-weight 400, border-bottom 2px solid transparent
- Tab bar: border-bottom 1px solid rgba(0,0,0,0.06), margin-bottom 24px

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
- **Sarah Chen** — AE, Healthcare (ID: ec26c991-f580-452c-ae60-14b94800e920)
- **Priya Sharma** — AE, Technology
- **Marcus Thompson** — MANAGER, General (ID: fcbfac19-88eb-4a34-8582-b1cdfa03055b)
- **Ryan Foster** — AE, Healthcare (ID: f7c15224-0883-46b7-affa-990eeedaac07)
- **James Wilson** — AE, General
- **Elena Rodriguez** — AE, General
- **Alex Kim** — SA, Healthcare (ID: eae38d09-1cfb-4044-8a16-b839bcb7d5d7)
- **Maya Johnson** — SA, Technology
- **Tom Bradley** — SA, General (ID: 27cb3617-b187-40a5-9761-f878ce89f73d)
- **Jordan Lee** — BDR, Healthcare
- **Casey Martinez** — BDR, Financial Services
- **Nina Patel** — CSM, Healthcare
- **Chris Okafor** — CSM, Technology
- **David Park** — AE, Financial Services (ID: 4443c9bb-5a4a-405a-9b99-f0e97e86b0d2)

### Support Function Members (3 people in `supportFunctionMembers` table)
- **Lisa Park** — Sales Enablement
- **Michael Torres** — Product Marketing
- **Rachel Kim** — Deal Desk

Support function members are stored separately because they don't fit the `teamMembers` role enum. They're referenced by plain uuid (no FK) in `fieldQueries.initiatedBy` and `observationRouting.targetMemberId`.

---

## Database Schema

### 29 Tables in `packages/db/src/schema.ts`

**Core CRM:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `teamMembers` | Sales org roles | id, name, email, role (AE/BDR/SA/CSM/MANAGER), verticalSpecialization (single enum, not array) |
| `companies` | Account records | id, name, industry (verticalEnum), employeeCount, techStack (text[]), hqLocation |
| `contacts` | People at companies | id, firstName, lastName, title, companyId (FK), roleInDeal (champion/economic_buyer/etc), isPrimary |
| `deals` | Pipeline deals | id, name, companyId, assignedAeId/BdrId/SaId, stage, dealValue, vertical, competitor, lossReason, closeCompetitor, closeNotes, closeImprovement, winTurningPoint, winReplicable, closedAt, closeAiAnalysis (jsonb), closeFactors (jsonb), winFactors (jsonb) |
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
| `systemIntelligence` | Pre-computed data patterns | vertical (nullable = org-wide), insightType (transcript_pattern/stakeholder_pattern/competitive_pattern/velocity_pattern/win_pattern/loss_pattern/meddpicc_pattern/process_insight/market_signal), title, insight, supportingData (jsonb), confidence (decimal 3,2), relevanceScore (decimal 3,2), status |
| `managerDirectives` | Leadership directives | authorId, scope (org_wide/vertical/role/person), directive, priority (mandatory/strong/guidance), category (pricing/positioning/process/competitive/messaging), isActive, expiresAt |

**Playbook Intelligence:**
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `playbookIdeas` | Process experiments | originatorId, originatedFrom (observation/close_analysis/manual/system_detected/cross_agent), sourceObservationId, title, hypothesis, category (process/messaging/positioning/discovery/closing/engagement), vertical, status (proposed/testing/promoted/retired), testStartDate, testEndDate, testGroupDeals[], controlGroupDeals[], results (jsonb), followers[], followerCount |
| `influenceScores` | Per-member influence | memberId, dimension (process_innovation/competitive_intel/technical_expertise/deal_coaching/customer_insight), vertical, score (0-100), tier (high_impact/growing/contributing/new), attributions (jsonb array), lastContributionAt |

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
| `/api/deals/stage` | POST | Update deal stage with close/lost and close/won outcome capture |
| `/api/deals/resolve` | POST | Resolve deal from name fragment or ID; returns contacts for agent context |
| `/api/companies` | GET | All companies (id, name, industry) |
| `/api/team-members` | GET | All team members |
| `/api/activities` | GET | Recent activities (limit 20) with full joins |
| `/api/notifications` | GET | Notifications filtered by member |

### Observation System
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/observations` | GET, POST | GET: list observations. POST: full pipeline — classify with Claude (9 signal types incl. process_innovation), extract entities, resolve to CRM, calculate ARR, semantic cluster matching, routing to support functions, cross-agent feedback, auto-create playbook ideas for process_innovation signals |
| `/api/observations/[id]/follow-up` | POST | Process follow-up response, recalculate cluster ARR, fire notification chains |
| `/api/observations/clusters` | GET | All clusters ordered by recency |
| `/api/observation-routing` | GET, PATCH | GET: routing records by function/member. PATCH: update status with timestamps |

### Field Query Engine
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/field-queries` | GET, POST | GET: pending questions for AEs or queries for managers. POST: two modes — (1) org-wide: analyze question, generate deal-specific AE questions (3/AE limit, 24h expiry); (2) deal-scoped (when `dealId` provided): AI answers from deal context first, falls back to one targeted question to deal owner |
| `/api/field-queries/respond` | POST | Process response, generate give-back insight, create observation, update aggregated answer |
| `/api/field-queries/suggestions` | GET | Generates suggested questions from active observation clusters by severity |

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
| `/api/agent/call-prep` | POST | Generate structured call brief from 8 intelligence layers (see Call Prep section below) |
| `/api/agent/draft-email` | POST | Generate personalized email draft using deal context, transcript analysis, agent config voice/guardrails + team intelligence + system intelligence + directives |
| `/api/agent/save-to-deal` | POST | Save any agent action as a deal activity (dedupes same type+deal within 1 hour) |
| `/api/deals/close-analysis` | POST | AI-powered close/loss analysis — gathers full deal context and generates structured analysis with dynamic factor chips |

### Demo System
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/demo/reset` | POST | Resets MedVista to negotiation, clears test data from last 4 hours, marks notifications unread, recalculates cluster metrics |
| `/api/demo/ask` | POST | AI demo assistant with comprehensive product knowledge base. Accepts { question, currentPage, currentPersona }. Responds in 2-4 sentences with specific feature references. |

---

## Pages & Navigation

### Sidebar (6 items, all roles)
1. Command Center (`/command-center`)
2. Pipeline (`/pipeline`)
3. Intelligence (`/intelligence`)
4. Playbook (`/playbook`)
5. Outreach (`/outreach`)
6. Agent Config (`/agent-config`)

### Landing Page (`/` — outside dashboard layout)
- Standalone page with thesis text, "Enter Demo" button, contact info, "Reset Demo Data" button
- `?reset=true` query param calls POST /api/demo/reset and clears localStorage
- "Enter Demo" sets `nexus_demo_step=1` and navigates to /pipeline
- Shareable link: `https://nexus-web-plum-iota.vercel.app?reset=true`

### Dashboard Pages (`apps/web/src/app/(dashboard)/`)
| Route | Purpose |
|-------|---------|
| `/command-center` | Executive dashboard: pipeline overview, activities, notifications |
| `/pipeline` | Pipeline board (Kanban/table/chart views), drag-to-move, filters |
| `/pipeline/[id]` | Deal workspace: details, contacts, activities, calls, MEDDPICC, "Prep Call", "Draft Follow-Up", MANAGER-only "Ask about this deal", Close Analysis card, **Sentiment Trajectory** (Prospect Engagement section showing call quality scores across transcripts with trend direction) |
| `/intelligence` | **3 tabs**: Patterns (clusters, metrics, field queries, directives, AE impact), Field Feed (raw observation stream), Close Intelligence (win/loss factor cards) |
| `/playbook` | **3 tabs**: Active Experiments (testing + proposed ideas with metrics), What's Working (promoted + retired ideas with results), Influence (team influence cards, market signals, attribution trail) |
| `/outreach` | Email sequences with **Intelligence Brief card** at top (competitive patterns, win patterns, messaging directives from clusters + managerDirectives) |
| `/agent-config` | Agent configuration with natural language instructions and feedback loop |
| `/observations` | **Redirects to `/intelligence?tab=feed`** |
| `/prospects` | Contact database (not in sidebar — accessible via direct URL) |
| `/calls` | Call transcript library (not in sidebar) |
| `/analyze` | Real-time streaming call analyzer (not in sidebar) |
| `/analytics` | Pipeline metrics, velocity, win rates (not in sidebar) |
| `/team` | Team roster and org chart (not in sidebar) |
| `/agent-admin` | Agent administration view (not in sidebar) |

### Key Components (`apps/web/src/components/`)
| Component | Purpose |
|-----------|---------|
| `observation-input.tsx` | **Universal Agent Bar** (~1800 lines) — multi-mode interaction surface. Handles 4 intents: observe, quick check, call prep, email draft. Appears on Pipeline, Outreach, Intelligence, and deal detail pages. |
| `stage-change-modal.tsx` | Modal for pipeline stage transitions with close/lost/won outcome capture. |
| `deal-question-input.tsx` | **Deal-Scoped Question Input** — MANAGER-only "Ask about this deal" on deal pages. |
| `demo-guide.tsx` | **Demo Guide** — 3 modes: Tour (6-step guided walkthrough with element highlighting, persona switching, auto-navigation), Assistant (contextual hints + Claude-powered chat via /api/demo/ask), Hidden (dismissed, re-openable via top bar). Exports `useTourState()` hook for top bar consumption. |
| `activity-feed.tsx` | Timeline activity list with type icons and observation entries |
| `providers.tsx` | PersonaContext provider for user/role switching. Persists to `localStorage.nexus_persona_id`. Defaults to Sarah Chen. |
| `layout/sidebar.tsx` | 6-item navigation sidebar with FlaskConical icon for Playbook |
| `layout/top-bar.tsx` | Top header with GuideLink (3 states: Resume Tour, Assistant, Guide), user switcher (4 sections), notification bell |

---

## Key Systems & How They Work

### 1. Observation System
AEs submit observations via the agent bar. The POST pipeline:
1. **Classify** with Claude — extracts signal type, urgency, scope, vertical, entities. 9 signal types: competitive_intel, content_gap, deal_blocker, win_pattern, process_friction, agent_tuning, cross_agent, field_intelligence, **process_innovation**
2. **Resolve entities** — fuzzy matches extracted accounts/deals/competitors to CRM records
3. **Calculate ARR** — sums deal values from linked deals
4. **Semantic cluster matching** — Claude compares against existing cluster titles/descriptions (confidence >= 0.6)
5. **Save observation** with entity links
6. **Create/match cluster** — if no match, Claude groups unclustered observations semantically
7. **Append quotes** to cluster with deduplication
8. **Route to support functions** — creates `observation_routing` records
9. **Auto-create playbook idea** — if signal is `process_innovation`, creates a `playbookIdeas` record
10. **Process agent signals** — `agent_tuning` and `cross_agent` signals trigger config changes
11. **Follow-up** — Claude decides if clarification needed; if deal context missing, generates deal selection chips

### 2. Intelligence Dashboard (3 tabs)
**Patterns tab (default):** Metrics cards (active patterns, ARR at risk, observations, avg response, resolution rate). Observation cluster cards with severity, field voices, recommended actions. Manager-only: "Ask about what you're seeing" input, "Your Queries" with progress bars, **"Your Directives"** grouped by priority (mandatory/strong/guidance). AE-only: "Your Impact" card.

**Field Feed tab:** Raw observation stream (merged from former /observations page). Each observation shows observer name/role, raw text, classification badges, cluster assignment (clickable → switches to Patterns tab), status indicator.

**Close Intelligence tab:** Deals Lost/Won summary cards with factor categories, counts, ARR totals.

### 3. Playbook System
Process intelligence — ideas about how to sell better, tracked and measured by deal outcomes.

**Active Experiments tab:** Shows testing ideas with early results (velocity change, sentiment shift, adoption count, confidence level) and proposed ideas waiting for adoption.

**What's Working tab:** Promoted ideas (proven winners with close rates, ARR impact, followers) with green left border. Retired ideas (data showed they didn't work) with coral left border, referencing the replacement play.

**Influence tab:** Team influence cards sorted by total ARR influenced, with per-dimension tier icons (★ High Impact, ● Growing, ○ Contributing). Market signals from `systemIntelligence` records with `insightType = 'market_signal'`. Attribution trail showing chronological chain of how inputs changed outcomes.

### 4. Field Query Engine
Managers ask questions → AI generates deal-specific questions for AEs → AEs respond with one tap → responses update dashboard with aggregated answers.
- 3 questions per AE limit, 24h expiration
- Give-back insight generated for each response
- Responses auto-create observations

### 5. Agent Bar (Universal Interaction Surface)
The bar at the bottom of Pipeline, Outreach, Intelligence, and deal detail pages detects intent:
- **"prep my MedCore call"** → call prep
- **"draft follow-up to Oliver"** → email draft
- **"CompetitorX dropping prices"** → observation (classification flow)
- **"what's the status on Atlas?"** → quick answer from deal data
- **"✦ 1 quick check waiting"** → field query response

### 6. Call Prep — Full Intelligence Stack (8 Layers)
**Layer 1 — Rep's Own Config:** Persona, communication style, guardrails, deal stage rules
**Layer 2 — Team Intelligence:** Teammates' configs matched by vertical + cross-agent feedback
**Layer 3 — System Intelligence:** Data-driven patterns from `systemIntelligence` table
**Layer 4 — Win/Loss Patterns:** Closed deals in same vertical with outcome data
**Layer 5 — Stakeholder Alerts:** Under-engaged champions and economic buyers
**Layer 6 — Manager Directives:** Mandatory/strong/guidance constraints from leadership
**Layer 7 — CRM Context:** Deal data, MEDDPICC, contacts, activities, observations, clusters, transcripts, resources
**Layer 8 — Playbook Intelligence:** Promoted playbook ideas matching deal vertical + testing ideas where this deal is in the test group

### 7. Sentiment Trajectory
Deal detail pages show "Prospect Engagement" section in the Overview tab when transcripts exist. Shows call quality scores as colored progress bars (green ≥80, amber 60-79, coral <60), sentiment labels (Committed/Engaged/Interested/Cautious/Uncertain), and trend direction (improving/stable/declining with point delta).

### 8. Demo Guide (3 modes)
**Tour mode:** 6-step guided walkthrough: (1) Click MedVista → (2) Prep Call + see brief → (3) Share observation → (4) VP Intelligence view → (5) Sarah's quick check → (6) System compounds summary. Element highlighting with CSS outline animation, persona switching, auto-navigation.

**Assistant mode:** Contextual hints based on current page + persona. Claude-powered chat via POST /api/demo/ask. Dark card in bottom-left corner.

**Hidden mode:** Dismissed by user. Re-openable via "Assistant" button in top bar.

### 9. Close/Lost Capture
When a deal moves to Closed-Won or Closed-Lost via the stage change modal:
- AI pre-populates loss/win analysis from deal history
- Rep confirms/corrects/adds with chip UI
- Confirmed factors become observations feeding clusters
- Close analysis visible on deal detail Overview tab

### 10. Demo Reset
POST /api/demo/reset:
- Resets MedVista to Negotiation / 65% win probability, clears close analysis fields
- Resets other deals' win probabilities to seed values
- Deletes observations, field queries, activities from last 4 hours
- Marks all notifications unread
- Recalculates cluster counts and ARR totals

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
| `seed-cross-feedback.ts` | 8 cross-agent feedback records + enriched SC/CSM configs |
| `seed-system-intelligence.ts` | 10 system intelligence insights + 6 manager directives + 5 closed deals |
| `seed-close-analysis.ts` | Seeded AI close analysis data on closed deals |
| `seed-final-polish.ts` | Final demo polish: 10 curated deals, dedup observations, recalculate metrics |
| `seed-intelligence-fixes.ts` | Dedup observations, seed acknowledged_at, recalculate cluster ARR |
| `seed-playbook.ts` | 8 playbook ideas (3 promoted, 3 testing, 1 proposed, 1 retired), 12 influence scores for 5 members, 5 market signals |
| `seed-playbook-lifecycle.ts` | Lifecycle data: test groups, metrics, evidence for 3 TESTING experiments + experiment_evidence column migration |
| `backfill-routing.ts` | Creates 34 routing records from existing observations |
| `backfill-entities.ts` | Links 4 observations to accounts/deals via fuzzy matching |

---

## Demo Data State

### 10 Curated Deals
| Deal | Company | AE | Stage | Value | Vertical |
|------|---------|----|----|-------|----------|
| MedVista Enterprise Platform | MedVista Health Systems | Sarah Chen | Negotiation | €2.4M | Healthcare |
| HealthFirst Analytics Suite | HealthFirst Medical | Sarah Chen | Closed Lost | €3.2M | Healthcare |
| TrustBank Digital Transformation | TrustBank Financial | Sarah Chen | Technical Validation | €950K | Financial Services |
| NordicMed Group Platform | NordicMed Group | Ryan Foster | Proposal | €1.6M | Healthcare |
| Atlas Capital Analytics | Atlas Capital | David Park | Negotiation | €580K | Financial Services |
| HealthBridge Analytics Platform | HealthBridge Analytics | Sarah Chen | Closed Lost | €1.2M | Healthcare |
| MedTech Solutions Platform | MedTech Solutions | Ryan Foster | Closed Won | €2.1M | Healthcare |
| NordicCare — Patient Records | NordicCare Health | Ryan Foster | Closed Lost | €1.8M | Healthcare |
| PharmaBridge Analytics | PharmaBridge | Sarah Chen | Discovery | €340K | Healthcare |
| NordicCare API Integration | NordicCare Group | Sarah Chen | Technical Validation | €780K | Healthcare |

### 8 Curated Users (in switcher)
Sales Team: Sarah Chen (AE), David Park (AE), Ryan Foster (AE)
Leadership: Marcus Thompson (MANAGER)
Solutions & Support: Alex Kim (SA)
Support Functions: Lisa Park (Enablement), Michael Torres (Product Marketing), Rachel Kim (Deal Desk)

Default persona: Sarah Chen. Persisted via `localStorage.nexus_persona_id`.

### 8 Playbook Ideas
3 promoted (compliance-led discovery, CISO engagement, security doc pre-delivery), 3 testing (post-disco prototype, two-disco minimum, multi-threaded engagement), 1 proposed (competitive battlecard review), 1 retired (ROI-first messaging)

### 5 Market Signals
Seeded as `systemIntelligence` records with `insightType = 'market_signal'`. Prospect behavioral patterns that predict deal outcomes.

---

## Known Issues / Gotchas
- **MedVista stage**: Reset to Negotiation via demo reset. May need manual reset after testing close/lost capture.
- **PgArray error**: If schema changes, Next.js may throw `PgArray` errors from stale cache. Fix: `rm -rf apps/web/.next && pnpm dev`.
- **No auth**: Persona switching via PersonaProvider context. No real authentication.
- **`verticalSpecialization` is a single enum**: Team members have ONE vertical. `outputPreferences.industryFocus` provides broader coverage.
- **`initiatedBy` on `fieldQueries` has no FK**: Can reference either `teamMembers` or `supportFunctionMembers`.
- **Dev server port**: Default is 3001 but auto-increments if occupied.
- **systemIntelligence confidence/relevanceScore**: Both are `decimal(3,2)` — values must be 0.00-9.99, not percentages.
- **Influence scores are seeded data**: No live computation — future work.
- **Playbook ideas are seeded data**: The "Start Test" and "Follow" buttons are UI-only in the current demo.

---

## Design Principles
- **One input → multiple outputs** is the core product thesis.
- **All conversational UIs use inline responses** (no toasts), numbered card chips + text input, React state for chip selection, "Nexus Intelligence" framing.
- **Seed data and live generation must produce identical data shapes.**
- **Model string**: Always use `claude-sonnet-4-20250514` (full identifier, not shorthand).
- **Influence is measured by outcomes, not activity.** The Playbook system tracks whose ideas actually moved revenue — not who talked the most.

---

## Session Build History

### S1–S2: Foundation + Deal Details
CRM data model, pipeline management (Kanban/table/chart views), deal detail pages, contact management, activity tracking, MEDDPICC scoring.

### S3: Transcript Analyzer
Transcript upload/paste/demo, streaming Claude analysis, coaching tips, MEDDPICC extraction, deal scoring, sentiment arcs, link-to-deal.

### S4: Agent Configuration
Per-member agent config, natural language instructions, version history, feedback loop with approval workflow.

### S5: Organization Network
14-person org with role assignments and agent configs, notifications system, user/persona switcher via PersonaProvider.

### S6: Outreach + Prospects + Analytics
Added Prospects, Outreach, Analytics, and Calls pages. Email sequence builder.

### S7: Observation System
Unified observation system with ObservationInput on 5 pages. 6-phase observation input, Claude classification with signal types, follow-up questions, give-back insights, /observations page. AI classification pipeline.

### S8: Intelligence Dashboard
Intelligence dashboard with clusters, support function personas (Lisa Park, Michael Torres, Rachel Kim), observation routing to support functions, ARR impact calculation, role-based views, notification chains.

### S9: Field Query Engine
- Field query engine: bidirectional manager↔AE intelligence flow, "Ask your team" on Intelligence dashboard
- QuickQuestions component for AE responses
- Full 11-point system audit (identified 2 FAKE, 3 PARTIAL systems)
- Remediation: fixed observation routing, deal page observations, cluster auto-creation, dashboard metrics, cross-agent feedback
- AI entity extraction: Claude extracts accounts/deals/competitors from observations, fuzzy matches to CRM
- Semantic clustering: Claude-based cluster matching replaces keyword overlap (confidence >= 0.6)
- Context follow-ups: auto-generates "Which deal?" with rep's deals as chips when deal context missing

### Post-Session Builds (between S9 and Session A)
- **Schema migration**: expanded activity type enum with call_prep, email_draft, call_analysis, observation, agent_feedback, competitive_intel. Data migration moved note_added records to real types.
- **Seed data cleanup**: 3 hero deals (MedVista, HealthFirst, TrustBank) with deep activity timelines. Activity timeline redesign with typed entries, distinct icons, click to expand, dedup logic.
- **Call prep context flow**: meeting type selector (4 chips, starts blank), attendee selection, full brief stored in activity metadata, "View full brief" modal.
- **Agent action layer**: universal agent bar with intent detection (observe/call_prep/draft_email), call prep API gathering 9 data sources, email draft API, QuickQuestions merged into agent bar.
- **Demo polish**: 4 seeded transcripts, resources table with 12 docs, promptable email regeneration, save-to-timeline buttons.
- **Follow-up engine**: AI-driven follow-up decisions (no keyword gating), restyled inline UI with chat bubbles, numbered card chips, sparkle give-back cards. No toasts.
- **Entity extraction and semantic clustering**: Claude-based fuzzy entity matching, semantic cluster comparison, context follow-ups for ambiguous deals.

### Session A: Agent Config Wiring
- **Team intelligence read layer**: call prep and email draft API routes now query teammates' agent configs by deal vertical and inject expertise into the Claude prompt
- **Vertical matching**: uses both `verticalSpecialization` (enum) and `outputPreferences.industryFocus` (jsonb array) for comprehensive matching
- **Cross-agent feedback table**: new `crossAgentFeedback` table for teammate-to-teammate recommendations (6 seeded records)
- **Persona-driven output**: rep's communication style, guardrails, and deal stage rules shape the tone and constraints of every generated brief/email
- **Enriched SC/CSM configs**: Maya Johnson, Tom Bradley, Nina Patel, Chris Okafor configs updated with vertical-specific expertise
- **Meeting type default**: prep type selector starts blank (no auto-selection from deal stage)
- Architecture: team intelligence is READ-ONLY — nobody's config is modified, insights flow via prompt injection

### Session B: System Intelligence Layer
- **System intelligence table**: `systemIntelligence` with 10 seeded data-driven pattern insights across Healthcare (5), FinServ (2), Tech (1), org-wide (2)
- **Manager directives table**: `managerDirectives` with 6 seeded directives from Marcus Thompson (pricing caps, process requirements, messaging guidance, vertical-specific positioning)
- **Close/Lost capture UI**: stage change modal with AI summary card, dynamic factor chips, fixed chips, dynamic questions. closeAiAnalysis, closeFactors, winFactors, closeAiRanAtTimestamp on deals table. Observations auto-created from confirmed loss factors.
- **Deal outcome columns**: closeCompetitor, closeNotes, closeImprovement, winTurningPoint, winReplicable, closedAt added to deals table
- **5 seeded closed deals**: 3 lost (security review, pricing, no decision) + 2 won (champion-driven, compliance advantage) with full outcome data and AI analysis
- **Full intelligence wiring**: call prep prompt now includes system intelligence patterns, win/loss intelligence, stakeholder engagement alerts, and manager directives alongside team intelligence from Session A
- **Email draft intelligence**: competitive/win/loss patterns and messaging directives also flow into email generation

### Session C: Intelligence Dashboard Upgrade
- **Field query multi-AE targeting**: multi-path targeting (cluster observations → linkedDealIds, competitor keyword match, vertical fallback). Fixed — now correctly routes to 3+ reps.
- **Duplicate field voices**: deduplicated via Map keyed on quote text
- **Avg Response metric**: seeded acknowledged_at on 15 routing records, shows "5.9h" instead of "No data"
- **ARR restored on clusters**: recalculation script preserves seeded values when no linked deals found
- **Close Intelligence cards**: Deals Lost/Won summary visible to MANAGER/SUPPORT roles on intelligence dashboard
- **Cluster action recommendations**: `getRecommendedAction()` generates context-specific suggestions based on severity/status/signalType
- **Progress bars on field queries**: visual response tracking in QueryCard (amber in-progress, green complete)
- **AE Impact card**: personal stats visible to AE/SA/BDR/CSM — observations shared, patterns contributed, pending quick checks

### Session D: Final Demo Polish
- **Data curation**: Reduced from 30 to 10 hero deals (8 retained + 2 new). FK-safe cascade deletion of 22 deals + orphaned companies/contacts/sequences
- **New deals**: NordicMed Group (Ryan Foster, €1.6M, Healthcare, Discovery) and Atlas Capital (David Park, €580K, Financial Services, Technical Validation) with full contacts, MEDDPICC, activities
- **Closed deal gap-fill**: HealthBridge Analytics, MedTech Solutions, NordicCare Patient Records — filled missing contacts, activities, MEDDPICC data
- **Observation dedup**: Deduplicated by (observerId, rawInput) key; recalculated cluster observationCount/observerCount/arrImpactTotal
- **User switcher redesign**: Slimmed to 8 curated users in 4 sections (Sales Team, Leadership, Solutions & Support, Support Functions). Support Functions section collapsed by default
- **Persona persistence**: PersonaProvider now saves selected user to `localStorage.nexus_persona_id` and restores on reload
- **Deal-scoped field queries**: Marcus's "Ask about this deal" component + deal-scoped query handler in field-queries API
- **Close Analysis view**: `CloseAnalysisCard` on closed deal pages showing AI analysis, factors, MEDDPICC at close, stakeholder flags
- **Guided walkthrough**: 4-step tour overlay with welcome screen, persona switching, and deal navigation. `TourButton` for restart

### Session E: Playbook Layer + Demo Infrastructure
- **Playbook page**: New `/playbook` route with 3 tabs (Active Experiments, What's Working, Influence). Added to sidebar as 4th item with FlaskConical icon.
- **`playbookIdeas` table**: Process experiment tracking with status lifecycle (proposed → testing → promoted/retired), test groups, results jsonb, followers
- **`influenceScores` table**: Per-member influence across 5 dimensions with tier classification and attribution trail
- **`market_signal` insightType**: New value added to `systemIntelligence` insightType enum for prospect behavioral patterns
- **`process_innovation` signal type**: New observation classification that auto-creates a `playbookIdeas` record
- **Call prep Layer 8**: Playbook intelligence injected into call briefs (promoted ideas + testing ideas for this deal)
- **Intelligence dashboard restructure**: Observations merged into "Field Feed" tab. Manager directives visible on Patterns tab (MANAGER only). 3-tab layout with tab UI pattern.
- **`/observations` redirect**: Route now redirects to `/intelligence?tab=feed`
- **Outreach Intelligence Brief**: Competitive patterns, win patterns, messaging directives surfaced at top of Outreach page
- **Sentiment Trajectory**: "Prospect Engagement" section on deal detail pages showing call quality score trend across transcripts
- **Demo Guide** (`demo-guide.tsx`): Replaces `walkthrough.tsx`. 3 modes — Tour (6 steps with element highlighting + persona switching), Assistant (Claude chat via /api/demo/ask), Hidden
- **Landing page** (`/`): Standalone page outside dashboard layout with product thesis, Enter Demo button, demo reset link
- **`/api/demo/reset`**: Resets MedVista to Negotiation, clears last-4-hour test data, marks notifications unread, recalculates cluster metrics
- **`/api/demo/ask`**: Claude-powered demo assistant with full product knowledge base. Context-aware responses based on current page + persona.
- **`seed-playbook.ts`**: 8 playbook ideas, 12 influence scores for 5 members, 5 market signals

### Session S9 (continued) — Playbook Lifecycle + Demo Polish
- **Agent bar** (ObservationInput) on all dashboard pages with contextual placeholders, hidden on /agent-config
- **Fixed agent bar submission**: dealId guard removed for non-deal pages, Drizzle timestamp bug fixed (Date objects passed directly to .set())
- **Playbook Lifecycle Part 1**: schema migration (test_group, control_group, success_thresholds, current_metrics, approved_by, approved_at, graduated_at, experiment_duration_days, experiment_start, experiment_end, experiment_evidence, attribution columns). Status transitions: proposed → testing → graduated/archived. Manager approval UI with inline AE chips + threshold inputs. PROPOSED → TESTING validation server-side.
- **Playbook Lifecycle Part 2**: call prep injection for TESTING experiments (🧪 Active Experiment badge, coral). Proven Plays query for GRADUATED/PROMOTED experiments (📋 Proven Play badge, green #4A7C59) with DIRECTIVE prompt injection requiring incorporation into talking_points and suggested_close. Graduation creates process_innovation observation for Intelligence dashboard. Playbook filter pill on Intelligence. Influence tab with per-AE experiment stats. PromotedCard enhanced with NOW SCALING TO + attribution trail.
- **Confidence bands**: Low (<5), Medium (5-8), High (9-12), Statistically Significant (13+). Minimum 8 deals for graduation.
- **Metric drill-down modal**: click Velocity/Sentiment/Close Rate on any experiment to see test vs control deal comparisons with transcript/email excerpts. Deal rows are clickable links. Works on both TESTING and PROMOTED cards.
- **Manager graduation UI**: "Graduate & Scale" button (green, visible when isManager && thresholdsMet >= 2 && dealsTested >= 8). Inline expansion with vertical/all/custom scaling scope.
- **Demo reset**: full playbook reset as Step 3 (before observation deletion to avoid FK constraint). Deletes ALL playbook_ideas, re-inserts 7 experiments (3 TESTING + 1 PROPOSED + 3 PROMOTED), applies lifecycle data with evidence. Post-discovery prototype always resets to TESTING with 9 deals, 3/3 thresholds, High Confidence, graduation-ready. MedVista resets to Discovery stage.
- **Guided tour**: 10-step narrative flow with data-tour attributes, applyHighlight() with orange glow CSS, persona auto-switching with router.refresh(), route auto-navigation.
- **Knowledge base**: comprehensive system prompt covering all features + "What Does Not Exist" section.

**Key architectural decisions:**
- scaling_scope stored inside attribution jsonb, not its own column
- provenPlays query fetches ALL graduated + promoted experiments (no vertical filtering for demo simplicity)
- Call prep proven plays prompt uses DIRECTIVE language ("You MUST incorporate") not passive ("apply where relevant")
- MedVista moved from Negotiation to Discovery for tour narrative
- Competitive battlecard seeded as PROPOSED (not TESTING) so Marcus has a card to approve during tour
- SQL: memberId = ANY(testGroup) instead of testGroup @> ARRAY[] for Drizzle compatibility

**Known issues / next steps:**
- Tour auto-progression not yet implemented (user must click Next for every step)
- Tour steps 8-10 need restructuring to highlight call prep sections (Proven Plays, Team Intelligence, Suggested Resources) instead of deal tabs
- Tour should be 12 steps total after restructuring
- Agent bar Q&A follow-up chip submission flow not fully wired
- MEDDPICC warnings still need explanations/actions wired into observation system

**Files most frequently modified:**
- `apps/web/src/components/demo-guide.tsx` (tour)
- `apps/web/src/components/observation-input.tsx` (agent bar, call prep, badges)
- `apps/web/src/app/api/agent/call-prep/route.ts` (call prep generation)
- `apps/web/src/app/api/demo/reset/route.ts` (demo reset)
- `apps/web/src/app/(dashboard)/playbook/playbook-client.tsx` (playbook UI)
- `apps/web/src/app/api/playbook/ideas/[id]/route.ts` (PATCH handler)
- `packages/db/src/schema.ts` (playbookIdeas table)

---

## File Structure Quick Reference

```
nexus/
├── apps/web/src/
│   ├── app/
│   │   ├── page.tsx                          # Landing page (standalone, outside dashboard)
│   │   ├── globals.css                       # Global styles incl. .demo-highlight animation
│   │   ├── api/                              # 24+ API route files
│   │   │   ├── agent/                        # call-prep, draft-email, configure, feedback, save-to-deal
│   │   │   ├── analyze/                      # analyze, analyze/link
│   │   │   ├── deals/                        # deals, stage, resolve, close-analysis
│   │   │   ├── demo/                         # reset, ask (demo assistant)
│   │   │   ├── field-queries/                # field-queries, respond, suggestions
│   │   │   ├── observations/                 # observations, [id]/follow-up, clusters
│   │   │   └── ...                           # activities, companies, notifications, team-members, observation-routing
│   │   └── (dashboard)/                      # 14 pages
│   │       ├── pipeline/[id]/                # Deal detail + stage change + sentiment trajectory
│   │       ├── intelligence/                 # 3-tab intelligence dashboard
│   │       ├── playbook/                     # 3-tab playbook page
│   │       ├── outreach/                     # Email sequences + intelligence brief
│   │       └── ...                           # command-center, agent-config, observations (redirect), prospects, calls, analyze, analytics, team, agent-admin
│   ├── components/
│   │   ├── observation-input.tsx              # Universal Agent Bar (~1800 lines)
│   │   ├── stage-change-modal.tsx             # Stage change + close/lost capture
│   │   ├── demo-guide.tsx                     # 3-mode demo guide (tour + assistant + hidden)
│   │   ├── deal-question-input.tsx            # MANAGER deal-scoped questions
│   │   ├── activity-feed.tsx                  # Timeline activity list
│   │   ├── providers.tsx                      # PersonaContext provider
│   │   ├── layout/sidebar.tsx                 # 6-item navigation
│   │   ├── layout/top-bar.tsx                 # Header with GuideLink + user switcher + notifications
│   │   ├── analyzer/                          # 10 call analysis sub-components
│   │   └── feedback/                          # Agent feedback components
│   └── lib/
│       ├── db.ts                              # Drizzle DB connection
│       └── analysis/                          # Transcript analysis utils
├── packages/db/src/
│   ├── schema.ts                              # 29 tables, all enums and relations
│   ├── index.ts                               # Re-exports
│   └── seed-*.ts                              # 16 seed scripts + 2 backfill scripts
└── packages/shared/src/
    └── types.ts                               # Shared types, stage labels, nav config
```

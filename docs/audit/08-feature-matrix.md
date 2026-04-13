# Phase 8: Real vs. Theater Feature Matrix

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1-7 audit results (final synthesis)

---

## Section 1: Feature Matrix

| # | Feature | Page/Location | Classification | Live Data Flow? | Seed Dependent? | Demo Impact | Evidence |
|---|---------|---------------|---------------|-----------------|-----------------|-------------|----------|
| 1 | Pipeline Kanban view | /pipeline | REAL | YES | YES (needs deals) | CRITICAL | Phase 3 §Dead Routes; Phase 7 §Act 1 |
| 2 | Pipeline Table view | /pipeline | REAL | YES | YES (needs deals) | SUPPORTING | Phase 1 §Structural |
| 3 | Pipeline Forecast view | /pipeline | REAL | YES | YES (needs deals) | SUPPORTING | Phase 1 §Structural |
| 4 | Pipeline vertical/AE/forecast filters | /pipeline | REAL | YES | YES (needs deals) | SUPPORTING | Phase 1 §Structural |
| 5 | Pipeline metrics (total value, count) | /pipeline | REAL | YES | YES (needs deals) | SUPPORTING | Phase 1 §Structural |
| 6 | Deal detail — header (name, stage, value, close date) | /pipeline/[id] | REAL | YES | YES (needs deal) | CRITICAL | Phase 3 §API Routes |
| 7 | Deal detail — editable close date | /pipeline/[id] | REAL | YES | NO | CRITICAL | Phase 7 §S13 Interventions; CLAUDE.md §S13 |
| 8 | Deal detail — stage change modal | /pipeline/[id] | REAL | YES | NO | CRITICAL | Phase 3 §API /deals/stage |
| 9 | Deal detail — close/won/lost outcome capture | /pipeline/[id] | REAL | YES | NO | SUPPORTING | Phase 3 §API /deals/stage |
| 10 | Deal detail — MEDDPICC tab | /pipeline/[id] | PARTIAL | PARTIAL | YES (seed scores) | CRITICAL | Phase 5 §MEDDPICC persistence; Phase 4 §Pipeline |
| 11 | Deal detail — MEDDPICC live refresh from pipeline | /pipeline/[id] | REAL | YES | NO | CRITICAL | Phase 5 §Lifecycle; Phase 7 §Act 1 |
| 12 | Deal detail — Stakeholders tab (contacts list) | /pipeline/[id] | THEATER | NO | YES | SUPPORTING | Phase 2 §Orphaned tables; no contact creation UI |
| 13 | Deal detail — Activity tab (timeline) | /pipeline/[id] | PARTIAL | PARTIAL | YES (seed activities) | SUPPORTING | Phase 3 §Dead Routes (activities API bypassed) |
| 14 | Deal detail — Calls tab (transcript list) | /pipeline/[id] | THEATER | NO | YES | CRITICAL | Phase 2 §Seed dependencies; no upload UI |
| 15 | Deal detail — Process Transcript button | /pipeline/[id] | REAL | YES | YES (needs transcript) | CRITICAL | Phase 5 §Pipeline lifecycle; Phase 7 §Act 1 |
| 16 | Deal detail — Workflow Tracker (5-step progress) | /pipeline/[id] | REAL | YES | NO | CRITICAL | Phase 5 §UI Display; Phase 4 §Rivet actors |
| 17 | Deal detail — Agent Memory panel | /pipeline/[id] | PARTIAL | PARTIAL | NO | CRITICAL | Phase 4 §Dead state fields; Phase 5 §Lifecycle gaps |
| 18 | Deal detail — Agent Intervention card | /pipeline/[id] | PARTIAL | YES | NO | CRITICAL | Phase 4 §NordicMed-only constraint; Phase 7 §S13 |
| 19 | Deal detail — Brief Ready indicator | /pipeline/[id] | PARTIAL | YES | NO | CRITICAL | Phase 5 §Call prep production timeout; Phase 4 §State not persisted |
| 20 | Deal detail — Prep Call button + brief generation | /pipeline/[id] | PARTIAL | YES | NO | CRITICAL | Phase 3 §Call prep hangs; Phase 5 §Auto-call-prep timeout |
| 21 | Deal detail — Call prep brief display (8 layers) | /pipeline/[id] | REAL | YES | YES (needs context) | CRITICAL | Phase 3 §API /agent/call-prep; Phase 7 §Act 1 |
| 22 | Deal detail — Draft Email button + generation | /pipeline/[id] | REAL | YES | NO | SUPPORTING | Phase 3 §API /agent/draft-email |
| 23 | Deal detail — Stage history timeline | /pipeline/[id] | REAL | YES | PARTIALLY | SUPPORTING | Phase 3 §API routes |
| 24 | Deal detail — Linked observations | /pipeline/[id] | PARTIAL | PARTIAL | YES (seed obs) | SUPPORTING | Phase 6 §Observation pipeline |
| 25 | Deal detail — Deal question input (MANAGER) | /pipeline/[id] | REAL | YES | NO | SUPPORTING | Phase 6 §Field query lifecycle |
| 26 | Deal detail — Close Intelligence (won/lost analysis) | /pipeline/[id] | PARTIAL | YES | YES (needs closed deals) | SUPPORTING | Phase 3 §/deals/close-analysis; Phase 6 §Seed theater |
| 27 | Observation input bar — observe mode | Global (multiple pages) | REAL | YES | NO | CRITICAL | Phase 6 §Observation pipeline; Phase 7 §Fully wired |
| 28 | Observation input bar — quick check mode | Global | REAL | YES | NO | SUPPORTING | Phase 6 §Real features |
| 29 | Observation input bar — call prep mode | Global | REAL | YES | YES (needs deal context) | SUPPORTING | Phase 3 §API /agent/call-prep |
| 30 | Observation input bar — email draft mode | Global | REAL | YES | NO | SUPPORTING | Phase 3 §API /agent/draft-email |
| 31 | Observation follow-up flow | Global | REAL | YES | NO | SUPPORTING | Phase 6 §Real features |
| 32 | Observation → cluster creation/matching | Backend | REAL | YES | NO | SUPPORTING | Phase 6 §Real features; Phase 7 §Fully wired |
| 33 | Observation → routing to support functions | Backend | PARTIAL | PARTIAL | NO | BACKGROUND | Phase 7 §Ghost #3 (no support UI) |
| 34 | Command Center — metric cards (4) | /command-center | REAL | YES | YES (needs deals) | SUPPORTING | Phase 1 §Structural |
| 35 | Command Center — recent activity feed | /command-center | REAL | YES | YES (needs activities) | SUPPORTING | Phase 3 §Dead routes (bypasses API) |
| 36 | Command Center — notifications panel | /command-center | THEATER | NO | YES | SUPPORTING | Phase 2 §Seed dependencies; no live notification creation except pipeline |
| 37 | Intelligence — Patterns tab (cluster cards) | /intelligence?tab=patterns | THEATER | PARTIAL | YES (~90%) | CRITICAL | Phase 6 §Seed theater; Phase 7 §Connection matrix |
| 38 | Intelligence — Agent-Detected Patterns section | /intelligence?tab=patterns | PARTIAL | YES | NO | CRITICAL | Phase 4 §Coordinator state not persisted; Phase 7 §Act 2 |
| 39 | Intelligence — Patterns metrics (ARR at risk, count) | /intelligence?tab=patterns | THEATER | PARTIAL | YES | SUPPORTING | Phase 6 §Seed theater |
| 40 | Intelligence — Field Feed tab | /intelligence?tab=feed | PARTIAL | PARTIAL | YES (~80%) | SUPPORTING | Phase 6 §Seed theater |
| 41 | Intelligence — Close Intelligence tab | /intelligence?tab=close | THEATER | PARTIAL | YES | SUPPORTING | Phase 6 §Close Intelligence seed-dependent |
| 42 | Intelligence — Manager Directives display | /intelligence | THEATER | NO | YES | BACKGROUND | Phase 6 §Seed-only, no creation UI |
| 43 | Intelligence — Field query suggestions | /intelligence | PARTIAL | PARTIAL | NO | BACKGROUND | Phase 6 §Field query lifecycle |
| 44 | Playbook — Active Experiments tab | /playbook | THEATER | PARTIAL | YES (100%) | CRITICAL | Phase 6 §All 8 experiments seed data |
| 45 | Playbook — Experiment metrics (velocity, sentiment, close rate) | /playbook | THEATER | NO | YES | CRITICAL | Phase 6 §Seed theater; never recalculated |
| 46 | Playbook — Experiment evidence drill-down | /playbook | PARTIAL | PARTIAL | YES | SUPPORTING | Phase 6 §Evidence attribution from pipeline works |
| 47 | Playbook — Proposed Ideas tab | /playbook | THEATER | PARTIAL | YES | SUPPORTING | Phase 6 §Only auto-creation from observations |
| 48 | Playbook — Approve & Start Testing button | /playbook | REAL | YES | YES (needs proposal) | SUPPORTING | Phase 6 §Manager approval flow works |
| 49 | Playbook — Graduated Plays tab | /playbook | THEATER | PARTIAL | YES | SUPPORTING | Phase 6 §Graduation works but evidence is seed |
| 50 | Playbook — What's Working tab (market signals) | /playbook | THEATER | NO | YES | BACKGROUND | Phase 6 §System intelligence is seed-only |
| 51 | Playbook — Influence Leaderboard tab | /playbook | THEATER | NO | YES | BACKGROUND | Phase 6 §Seed-only, no live calculation |
| 52 | Playbook — Follow/Unfollow buttons | /playbook | BROKEN | NO | N/A | BACKGROUND | Phase 7 §Ghost #1; UI renders, no API |
| 53 | Playbook — "Start Test" button (proposed) | /playbook | THEATER | PARTIAL | YES | BACKGROUND | Phase 6 §UI-only in demo |
| 54 | Deal Fitness — Portfolio view (summary cards) | /deal-fitness | THEATER | NO | YES | SUPPORTING | Phase 2 §Seed; only Horizon Health has data |
| 55 | Deal Fitness — Portfolio deal table (B/E/T/R bars) | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15; only 1 deal has fitness data |
| 56 | Deal Fitness — Drill-down circular gauge + benchmark | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.3 |
| 57 | Deal Fitness — Radar chart (4 axes) | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.3 |
| 58 | Deal Fitness — Fit cards (B/E/T/R with events) | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.3; events are seeded |
| 59 | Deal Fitness — Stakeholder Engagement card | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.4; stakeholderEngagement is seeded jsonb |
| 60 | Deal Fitness — Buyer Momentum card | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.4; buyerMomentum is seeded jsonb |
| 61 | Deal Fitness — Conversation Signals card | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.4; conversationSignals is seeded jsonb |
| 62 | Deal Fitness — Nexus Intelligence insight | /deal-fitness | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S15.4 |
| 63 | My Book — Morning Brief | /book | THEATER | NO | YES | SUPPORTING | CLAUDE.md §S14; seeded static content |
| 64 | My Book — Cross-Book Intelligence (4 pattern cards) | /book | THEATER | NO | YES | SUPPORTING | Verified: hardcoded in book-client.tsx lines 220-280 |
| 65 | My Book — Priority queue (top 5 accounts) | /book | THEATER | PARTIAL | YES | SUPPORTING | Phase 3 §API /book; data from seeds |
| 66 | My Book — All Accounts table with vertical filters | /book | THEATER | PARTIAL | YES | SUPPORTING | Phase 3 §API /book; 18 seeded accounts |
| 67 | My Book — Account Detail Drawer (14 sections) | /book | THEATER | PARTIAL | YES | SUPPORTING | CLAUDE.md §S14; all account data seeded |
| 68 | My Book — Response Kit modal (AI-generated) | /book | PARTIAL | YES | YES | SUPPORTING | Phase 3 §API /customer/response-kit; works live but needs seed messages |
| 69 | My Book — QBR Prep (Claude-generated agenda) | /book | REAL | YES | YES (needs account context) | SUPPORTING | Phase 3 §API /customer/qbr-prep |
| 70 | My Book — Log Observation (from drawer) | /book | REAL | YES | NO | BACKGROUND | CLAUDE.md §S14; functional POST |
| 71 | My Book — Draft Check-in Email | /book | THEATER | NO | YES | BACKGROUND | Verified: hardcoded per-account emails in book-client.tsx |
| 72 | My Book — Proactive Signals display | /book | THEATER | NO | YES | BACKGROUND | CLAUDE.md §S14; seeded jsonb |
| 73 | My Book — Expansion Map display | /book | THEATER | NO | YES | BACKGROUND | CLAUDE.md §S14; seeded jsonb |
| 74 | My Book — Contracted Use Cases display | /book | THEATER | NO | YES | BACKGROUND | CLAUDE.md §S14; seeded jsonb |
| 75 | Outreach — Sequence list with status/progress | /outreach | THEATER | NO | YES | BACKGROUND | Phase 2 §Orphaned tables; no sequence creation |
| 76 | Outreach — Intelligence Brief sidebar | /outreach | THEATER | PARTIAL | YES | BACKGROUND | Phase 6 §Clusters ~90% seed |
| 77 | Outreach — Messaging Directives | /outreach | THEATER | NO | YES | BACKGROUND | Phase 6 §Manager directives seed-only |
| 78 | Agent Config — Configure tab (NL instructions) | /agent-config | REAL | YES | YES (needs config) | BACKGROUND | Phase 3 §API /agent/configure |
| 79 | Agent Config — Evolution tab (version history) | /agent-config | REAL | YES | YES (needs versions) | BACKGROUND | Phase 3 §API /agent/configure |
| 80 | Agent Config — Feedback tab | /agent-config | REAL | YES | NO | BACKGROUND | Phase 3 §API /agent/feedback |
| 81 | Agent Config — Team Network tab | /agent-config | THEATER | NO | YES | BACKGROUND | Phase 3 §Cross-agent feedback seed-only |
| 82 | Analytics — KPI cards (Pipeline, Won, Win Rate, Cycle) | /analytics | REAL | YES | YES (needs deals) | HIDDEN | Phase 1 §Structural |
| 83 | Analytics — Pipeline by Stage bar chart | /analytics | REAL | YES | YES (needs deals) | HIDDEN | Phase 1 §Structural |
| 84 | Analytics — AE Performance section | /analytics | REAL | YES | YES (needs deals) | HIDDEN | Phase 1 §Structural |
| 85 | Analytics — Vertical Performance | /analytics | REAL | YES | YES (needs deals) | HIDDEN | Phase 1 §Structural |
| 86 | Analytics — Deal Aging | /analytics | REAL | YES | YES (needs deals) | HIDDEN | Phase 1 §Structural |
| 87 | Calls — Transcript library table | /calls | THEATER | NO | YES | HIDDEN | Phase 2 §Seed dependencies; no upload |
| 88 | Analyze — Streaming transcript analyzer | /analyze | REAL | YES | NO | HIDDEN | Phase 3 §API /analyze |
| 89 | Analyze — Link analysis to deal | /analyze | REAL | YES | NO | HIDDEN | Phase 3 §API /analyze/link |
| 90 | Analyze — Email draft from analysis | /analyze | REAL | YES | NO | HIDDEN | Phase 3 §API /agent/draft-email |
| 91 | Prospects — Contact database | /prospects | THEATER | NO | YES | HIDDEN | Phase 2 §No contact creation UI |
| 92 | Team — Page | /team | BROKEN | NO | N/A | HIDDEN | Verified: "Coming Soon" placeholder |
| 93 | Agent Admin — Page | /agent-admin | BROKEN | NO | N/A | HIDDEN | Verified: "Coming Soon" placeholder |
| 94 | Landing page — Enter Demo button + reset | / | REAL | YES | N/A | CRITICAL | Phase 7 §Demo reset; CLAUDE.md §S13 |
| 95 | Landing page — Feature cards + thesis | / | REAL | N/A | N/A | CRITICAL | Static content |
| 96 | Demo Guide — 10-step guided checklist | Dashboard (floating) | REAL | N/A | NO | CRITICAL | CLAUDE.md §S13; localStorage-based |
| 97 | Persona switcher (top bar) | Dashboard header | REAL | YES | YES (needs team members) | CRITICAL | Phase 1 §Structural; localStorage |
| 98 | Notification bell (top bar) | Dashboard header | THEATER | PARTIAL | YES | BACKGROUND | Phase 2 §No live notification creation |
| 99 | Pipeline — Quick Questions (bottom) | /pipeline | REAL | YES | NO | BACKGROUND | Phase 6 §Real features |
| 100 | Cross-deal intelligence (agent memory) | /pipeline/[id] | PARTIAL | YES | NO | CRITICAL | Phase 4 §Coordinator; Phase 7 §Act 2 |
| 101 | Transcript pipeline — follow-up email draft | Backend (never displayed) | BROKEN | PARTIAL | NO | BACKGROUND | Phase 5 §Lifecycle gap; generated but never rendered |
| 102 | Transcript pipeline — action items | Backend (never displayed) | BROKEN | PARTIAL | NO | BACKGROUND | Phase 5 §Lifecycle gap; extracted but never rendered |
| 103 | Field Queries — full lifecycle | /intelligence?tab=feed | REAL | YES | NO | SUPPORTING | Phase 6 §Real features |

---

## Section 2: Page-by-Page Breakdown

### Landing Page (/)
- **Enter Demo button + animated reset:** REAL — POST /api/demo/reset fires, resets DB, auto-navigates (Phase 7 §S13)
- **Feature cards / thesis copy:** REAL — Static marketing content, no data dependency
- **Context note about manual triggers:** REAL — Static text

### /command-center
- **Welcome header with persona name:** REAL — Reads from PersonaContext (Phase 1)
- **Pipeline Value metric card:** REAL — Computed from live deal query (Phase 1)
- **Commit Forecast metric card:** REAL — Computed from live deal query (Phase 1)
- **Closing This Month metric card:** REAL — Computed from live deal query (Phase 1)
- **Notifications metric card:** THEATER — Count is real but notifications are seed-only (Phase 2)
- **Recent Activity feed (8 items):** PARTIAL — Shows real activities but list is seed-heavy; pipeline creates new ones (Phase 3)
- **Notifications list with priority:** THEATER — All notifications are seeded; only pipeline creates new ones in limited cases (Phase 2)
- **Activity type icons and formatting:** REAL — Pure UI logic (Phase 1)

### /pipeline
- **Kanban view with stage columns:** REAL — Queries all deals, renders by stage. Filters out NordicCare deals (Phase 1, Phase 3)
- **Table view:** REAL — Same data, different layout (Phase 1)
- **Forecast view:** REAL — Same data grouped by forecast category (Phase 1)
- **Vertical filter dropdown:** REAL — Client-side filter on live data (Phase 1)
- **AE filter dropdown:** REAL — Client-side filter (Phase 1)
- **Forecast filter dropdown:** REAL — Client-side filter (Phase 1)
- **Total active pipeline value:** REAL — Computed from query (Phase 1)
- **Quick Questions component:** REAL — Calls Claude API for quick checks (Phase 6)
- **Observation input bar:** REAL — Full pipeline works (Phase 6, Phase 7)

### /pipeline/[id] (Deal Detail)
- **Deal header (name, stage, value):** REAL — From DB query (Phase 3)
- **Editable close date:** REAL — PATCH /api/deals/[id]/update persists (CLAUDE.md §S13)
- **Stage change modal:** REAL — POST /api/deals/stage with outcome capture (Phase 3)
- **Company info card:** THEATER — Seed data, no company editing (Phase 2)
- **Overview tab — deal summary:** REAL — DB query (Phase 3)
- **MEDDPICC tab — scores display:** PARTIAL — Seed scores shown; pipeline updates them live but manual editing not implemented (Phase 5)
- **MEDDPICC — live refresh after pipeline:** REAL — WebSocket event triggers re-fetch (Phase 5)
- **Stakeholders tab — contact list:** THEATER — Seed contacts, no creation/editing UI (Phase 2)
- **Activity tab — timeline:** PARTIAL — Mix of seed activities and pipeline-created ones; merged with observations (Phase 3)
- **Calls tab — transcript list:** THEATER — Seed transcripts only, no upload mechanism on this page (Phase 2)
- **Process Transcript button:** REAL — Triggers pipeline via POST /api/transcript-pipeline (Phase 5, Phase 7)
- **Workflow Tracker (5-step progress):** REAL — Real-time WebSocket subscription to deal agent (Phase 4, Phase 5)
- **Agent Memory panel:** PARTIAL — Displays real actor state but has dead fields (lastCustomerResponseDate, daysSinceCreation); follow-up email and action items never displayed (Phase 4, Phase 5)
- **Agent Intervention card:** PARTIAL — Works but only for NordicMed (hardcoded company name check). Generic text-only for all other deals (Phase 4, Phase 7)
- **Brief Ready button:** PARTIAL — Pipeline generates brief but hangs on production (auto-call-prep timeout). Not persisted to DB — lost on actor destruction (Phase 4, Phase 5)
- **Prep Call button:** PARTIAL — Works on localhost but known production timeout issue. When it works, generates excellent 8-layer brief (Phase 3, Phase 5)
- **Call prep brief display:** REAL — When brief exists, renders all 8 intelligence layers correctly (Phase 3)
- **Draft Email button + modal:** REAL — POST /api/agent/draft-email works end-to-end (Phase 3)
- **Stage history timeline:** REAL — Queries deal_stage_history, shows all transitions (Phase 3)
- **Linked observations in activity feed:** PARTIAL — Shows observations linked by dealId but merge logic is complex (Phase 6)
- **Deal question input (MANAGER only):** REAL — Full field query lifecycle works (Phase 6)
- **Close Intelligence (won/lost deals):** PARTIAL — AI analysis works (POST /api/deals/close-analysis) but requires deal to be closed first; close factors from seed data (Phase 3, Phase 6)
- **Cross-deal intelligence section:** PARTIAL — Coordinator pushes intel to deal agents but patterns not persisted to DB; lost on reset (Phase 4, Phase 7)

### /intelligence
- **Patterns tab — cluster cards:** THEATER — ~90% seed-dependent. Pipeline creates new ones but most visible patterns are from seeds (Phase 6)
- **Patterns tab — Agent-Detected Patterns:** PARTIAL — Real coordinator output but only appears after 2+ pipeline runs; not persisted to DB (Phase 4, Phase 7)
- **Patterns tab — metrics (Active Patterns, ARR at Risk, Observations, Avg Response, Resolution Rate):** THEATER — Computed from mostly-seed data (Phase 6)
- **Patterns tab — signal type filter chips:** REAL — Client-side filter on whatever data exists (Phase 1)
- **Patterns tab — severity badges:** REAL — UI rendering logic (Phase 1)
- **Field Feed tab — observation list:** PARTIAL — Shows all observations; ~80% seed, ~20% pipeline-created (Phase 6)
- **Field Feed tab — field query display:** REAL — Field queries work end-to-end (Phase 6)
- **Field Feed tab — follow-up interactions:** REAL — Follow-up flow works (Phase 6)
- **Close Intelligence tab — loss/win factor analysis:** THEATER — Requires closed deals with closeFactors, which are seed data (Phase 6)
- **Close Intelligence tab — ARR breakdown:** THEATER — Seed deals only (Phase 6)
- **Manager Directives display:** THEATER — Seeded, no creation UI (Phase 6)

### /playbook
- **Active Experiments tab — experiment cards:** THEATER — All 8 experiments are seed data (Phase 6)
- **Active Experiments tab — metrics (velocity, sentiment, close rate):** THEATER — Pre-populated in seeds, never recalculated live (Phase 6, Phase 7)
- **Active Experiments tab — confidence bands:** THEATER — Based on seed deal counts (Phase 6)
- **Active Experiments tab — evidence drill-down:** PARTIAL — Evidence attribution from pipeline works, but base evidence is seed (Phase 6)
- **Proposed Ideas tab:** THEATER — Only auto-creation from process_innovation observations; no direct creation form (Phase 6)
- **Approve & Start Testing button:** REAL — Manager approval flow persists to DB with state transitions (Phase 6)
- **Graduated/What's Working tab:** THEATER — Seed experiments with static results (Phase 6)
- **Market Signals section:** THEATER — systemIntelligence table is seed-only (Phase 6)
- **Influence Leaderboard tab:** THEATER — Seed-only, no live calculation (Phase 6, Phase 7 §Ghost #8)
- **Follow/Unfollow buttons:** BROKEN — UI renders but no API call behind it (Phase 7 §Ghost #1)

### /deal-fitness
- **Portfolio summary cards (4):** THEATER — Only Horizon Health Partners has fitness data (CLAUDE.md §S15)
- **Deal table with B/E/T/R progress bars:** THEATER — Single deal with scores; all other deals show empty (CLAUDE.md §S15)
- **Drill-down — circular gauge + benchmark:** THEATER — Seeded scores for one deal (CLAUDE.md §S15.3)
- **Drill-down — radar chart (4 axes):** THEATER — Seeded data (CLAUDE.md §S15.3)
- **Drill-down — fit cards with events:** THEATER — 25 seeded fitness events, no live creation pipeline (CLAUDE.md §S15.2)
- **Drill-down — Stakeholder Engagement card:** THEATER — Seeded jsonb on deal_fitness_scores (CLAUDE.md §S15.4)
- **Drill-down — Buyer Momentum card:** THEATER — Seeded jsonb (CLAUDE.md §S15.4)
- **Drill-down — Conversation Signals card:** THEATER — Seeded jsonb (CLAUDE.md §S15.4)
- **Drill-down — Nexus Intelligence insight:** THEATER — Seeded dealInsight text (CLAUDE.md §S15.4)

### /book (My Book)
- **Morning Brief (collapsible):** THEATER — Seeded static content (CLAUDE.md §S14)
- **Cross-Book Intelligence (4 pattern cards):** THEATER — Hardcoded in client component (verified lines 220-280)
- **Book metrics (Total ARR, account counts):** THEATER — Computed from seed data via GET /api/book (CLAUDE.md §S14)
- **Priority queue (top 5 accounts):** THEATER — Priority scoring is real logic but all accounts are seeded (CLAUDE.md §S14)
- **All Accounts table:** THEATER — 18 seeded accounts (CLAUDE.md §S14)
- **Vertical filter chips:** REAL — Client-side filter logic (CLAUDE.md §S14)
- **Account Detail Drawer — health overview:** THEATER — Seeded health scores (CLAUDE.md §S14)
- **Account Detail Drawer — contracted use cases:** THEATER — Seeded jsonb (CLAUDE.md §S14)
- **Account Detail Drawer — usage metrics:** THEATER — Seeded data (CLAUDE.md §S14)
- **Account Detail Drawer — stakeholders:** THEATER — Seeded contacts (CLAUDE.md §S14)
- **Account Detail Drawer — expansion map:** THEATER — Seeded jsonb (CLAUDE.md §S14)
- **Account Detail Drawer — risk/expansion signals:** THEATER — Seeded data (CLAUDE.md §S14)
- **Account Detail Drawer — proactive signals:** THEATER — Seeded jsonb (CLAUDE.md §S14)
- **Account Detail Drawer — recent messages:** THEATER — 8 seeded messages (CLAUDE.md §S14)
- **Response Kit modal (AI-generated):** PARTIAL — Claude generates kits live but needs seeded messages as input. Caching works. (Phase 3 §API /customer/response-kit)
- **QBR Prep (Claude-generated agenda):** REAL — Takes account context from state, calls Claude live, no DB query needed (Phase 3 §API /customer/qbr-prep)
- **Log Observation (from drawer):** REAL — Functional POST to /api/observations (CLAUDE.md §S14)
- **Draft Check-in Email:** THEATER — Hardcoded per-account email templates in client code (verified book-client.tsx)

### /outreach
- **Sequence list with status badges:** THEATER — emailSequences/emailSteps are orphaned tables, no creation API (Phase 2)
- **Sequence progress bars (sent/total):** THEATER — Seed data display only (Phase 2)
- **Status filter dropdown:** REAL — Client-side filter logic (Phase 1)
- **Intelligence Brief — Competitive Intel:** THEATER — Clusters are ~90% seed (Phase 6)
- **Intelligence Brief — What's Working:** THEATER — Clusters are ~90% seed (Phase 6)
- **Intelligence Brief — Messaging Directives:** THEATER — Manager directives are seed-only (Phase 6)

### /agent-config
- **Configure tab — NL instruction input:** REAL — POST /api/agent/configure interprets via Claude, saves config (Phase 3)
- **Configure tab — current config display:** REAL — Shows persisted agent config from DB (Phase 3)
- **Evolution tab — version history:** REAL — agentConfigVersions table populated on each save (Phase 3)
- **Feedback tab — feedback list:** REAL — POST /api/agent/feedback creates records (Phase 3)
- **Team Network tab — cross-agent recommendations:** THEATER — crossAgentFeedback is seed-only data (Phase 2)

### /analytics
- **KPI cards (Pipeline, Won, Win Rate, Avg Cycle):** REAL — Computed from live deal query (Phase 1)
- **Pipeline by Stage bar chart:** REAL — Client-side computation from deal data (Phase 1)
- **AE Performance section:** REAL — Grouped by AE from deal query (Phase 1)
- **Vertical Performance:** REAL — Grouped by vertical from deal query (Phase 1)
- **Deal Aging (top 10):** REAL — Computed from stageEnteredAt dates (Phase 1)

### /calls
- **Transcript table (title, company, date, duration, quality, status):** THEATER — All transcripts are seeded. No upload mechanism. Quality scores from seed call analyses (Phase 2)

### /analyze
- **Transcript text input:** REAL — Client-side input (Phase 1)
- **Streaming analysis via Claude:** REAL — POST /api/analyze with streaming response (Phase 3)
- **Link analysis to deal:** REAL — POST /api/analyze/link saves as activity (Phase 3)
- **Email draft from analysis:** REAL — POST /api/agent/draft-email works (Phase 3)
- **Post-analysis observation input:** REAL — Standard observation bar (Phase 6)

### /prospects
- **Contact database table:** THEATER — All contacts are seeded, no creation/editing UI (Phase 2)
- **Search and filters:** REAL — Client-side filter logic on seed data (Phase 1)

### /team
- **Entire page:** BROKEN — "Coming Soon" placeholder (verified)

### /agent-admin
- **Entire page:** BROKEN — "Coming Soon" placeholder (verified)

### /observations
- **Redirect:** REAL — Redirects to /intelligence?tab=feed (verified)

---

## Section 3: Sidebar Navigation Audit

| # | Navigation Label | Route | Icon | Page Classification | Recommendation |
|---|-----------------|-------|------|-------------------|----------------|
| 1 | Command Center | /command-center | LayoutDashboard | PARTIAL (real metrics, theater notifications) | KEEP — Fix notification pipeline |
| 2 | Pipeline | /pipeline | Kanban | REAL (core feature) | KEEP — Primary demo page |
| 3 | My Book | /book | BookOpen | THEATER (all seed data) | KEEP for demo, acknowledge theater |
| 4 | Intelligence | /intelligence | BarChart3 | PARTIAL (real pipeline feeds it, seed base) | KEEP — Core demo Act 2 |
| 5 | Playbook | /playbook | FlaskConical | THEATER (all experiments seeded) | KEEP for demo, acknowledge theater |
| 6 | Deal Fitness | /deal-fitness | Activity | THEATER (single seeded deal) | HIDE — Not in demo flow, 100% theater |
| 7 | Outreach | /outreach | Mail | THEATER (orphaned tables, no creation) | HIDE — Not demo-critical, fully theater |
| 8 | Agent Config | /agent-config | Bot | PARTIAL (config works, network is theater) | KEEP — Demonstrates agent personalization |

**Not in Sidebar but Accessible:**

| Route | Classification | Recommendation |
|-------|---------------|----------------|
| /calls | THEATER | HIDE — No upload, purely seed display |
| /analyze | REAL | Consider adding to sidebar or keeping as utility |
| /prospects | THEATER | HIDE — Seed contacts, no CRUD |
| /analytics | REAL | Consider adding to sidebar |
| /team | BROKEN | DELETE — Placeholder only |
| /agent-admin | BROKEN | DELETE — Placeholder only |

---

## Section 4: Classification Summary

| Classification | Count | Percentage |
|----------------|-------|------------|
| REAL | 38 | 36.9% |
| THEATER | 44 | 42.7% |
| PARTIAL | 17 | 16.5% |
| BROKEN | 4 | 3.9% |
| **Total** | **103** | **100%** |

**By Demo Impact:**

| Demo Impact | REAL | THEATER | PARTIAL | BROKEN | Total |
|-------------|------|---------|---------|--------|-------|
| CRITICAL | 11 | 2 | 8 | 0 | 21 |
| SUPPORTING | 15 | 20 | 6 | 0 | 41 |
| BACKGROUND | 7 | 14 | 2 | 2 | 25 |
| HIDDEN | 5 | 8 | 0 | 2 | 15 |

---

## Section 5: The Demo-Critical Path

### Act 1: "What Happens After a Call" (NordicMed Deal)

| Step | Feature | Classification | Risk | Notes |
|------|---------|---------------|------|-------|
| 1 | Navigate to /pipeline | REAL | GREEN | Always loads |
| 2 | Click NordicMed deal card | REAL | GREEN | Seed deal always exists after reset |
| 3 | View deal detail header | REAL | GREEN | DB query reliable |
| 4 | Click Calls tab | THEATER | YELLOW | Seed transcripts must exist; no fallback if missing |
| 5 | Click "Process Transcript" | REAL | GREEN | Triggers pipeline reliably |
| 6 | Watch Workflow Tracker (5 steps) | REAL | YELLOW | WebSocket connection required; steps may light out of order |
| 7 | See MEDDPICC scores update live | REAL | YELLOW | Depends on pipeline step 3 succeeding; no retry on Claude failure |
| 8 | Agent Memory panel populates | PARTIAL | YELLOW | Real data but dead fields (daysSinceCreation=0); follow-up email never shown |
| 9 | Intervention card appears | PARTIAL | RED | Only fires for NordicMed (hardcoded). Health check uses phantom -20 deduction. Timing-dependent: fires after pipeline + call prep |
| 10 | Click "Adjust Close Date" on intervention | REAL | GREEN | PATCH /api/deals/[id]/update works |
| 11 | Brief Ready button appears | PARTIAL | RED | Auto-call-prep hangs on production (known issue). Not persisted — lost if actor dies |
| 12 | Click Prep Call manually | PARTIAL | RED | 120s maxDuration on production. Usually works on localhost |
| 13 | View 8-layer call prep brief | REAL | GREEN | When generated, renders correctly |

**Act 1 Overall Risk: YELLOW** — Core pipeline (steps 5-7) is reliable. Major risks are call prep timeout (steps 11-12) and intervention timing (step 9).

### Act 2: "What Happens Across the Org" (Cross-Deal Intelligence)

| Step | Feature | Classification | Risk | Notes |
|------|---------|---------------|------|-------|
| 1 | Navigate to MedVista deal | REAL | GREEN | Seed deal exists |
| 2 | Process MedVista transcript | REAL | GREEN | Same pipeline as Act 1 |
| 3 | Watch pipeline complete | REAL | YELLOW | Same risks as Act 1 |
| 4 | Coordinator detects cross-deal pattern | PARTIAL | YELLOW | Requires both NordicMed + MedVista pipelines to complete. 3s synthesis delay. Not persisted to DB |
| 5 | Agent Memory shows cross-deal intel | PARTIAL | YELLOW | Coordinator must push successfully; pushStatus can be "failed" (Phase 3) |
| 6 | Navigate to Intelligence page | REAL | GREEN | Always loads |
| 7 | See Agent-Detected Patterns section | PARTIAL | YELLOW | In-memory only; requires page refresh after pipeline. No auto-refresh/polling |
| 8 | See observation clusters with new signals | PARTIAL | YELLOW | Pipeline observations appear but mixed with seed clusters |
| 9 | Submit observation via agent bar | REAL | GREEN | Reliable end-to-end |
| 10 | See auto-created playbook experiment | PARTIAL | YELLOW | Only if observation classified as process_innovation |

**Act 2 Overall Risk: YELLOW** — Cross-deal intelligence works but is fragile (in-memory, no persistence, no auto-refresh, dependent on two sequential pipeline runs).

### Act 3: "What Happens Before Sarah Asks" (Proactive Intelligence)

| Step | Feature | Classification | Risk | Notes |
|------|---------|---------------|------|-------|
| 1 | Switch to Marcus (MANAGER) persona | REAL | GREEN | localStorage switch |
| 2 | View Intelligence Patterns tab | THEATER | YELLOW | ~90% seed clusters. Agent patterns are in-memory only |
| 3 | Ask field query about a deal | REAL | GREEN | Full lifecycle works |
| 4 | Distribute questions to AEs | REAL | GREEN | Questions created and linked |
| 5 | Switch to AE persona, answer question | REAL | GREEN | Response flow + give-back works |
| 6 | View Playbook experiments | THEATER | YELLOW | All experiments are seed data |
| 7 | Approve proposed experiment | REAL | GREEN | State transition persists |
| 8 | View graduated play in call prep | PARTIAL | YELLOW | Promoted plays injected into call prep prompt, but call prep may timeout |

**Act 3 Overall Risk: YELLOW** — Field query flow is solid. Playbook is convincing theater. Call prep timeout remains the persistent risk.

---

## Section 6: The "Delete Seeds" Test

| Page | Current State | Without Seeds | Impact |
|------|--------------|---------------|--------|
| / (Landing) | Marketing copy + Enter Demo button | Identical — no seed dependency | NONE |
| /command-center | 4 metric cards, 8 activities, notifications | Empty metrics (0 deals), empty activity feed, empty notifications | SEVERE — Page looks broken |
| /pipeline | 6 active deals in kanban | Empty kanban — no stage columns rendered | CRITICAL — Core page empty |
| /pipeline/[id] | Full deal details, MEDDPICC, contacts, activities, transcripts | 404 — no deals exist | CRITICAL — Cannot navigate here |
| /intelligence | Patterns tab with clusters, Field Feed with observations, Close Intelligence | All tabs empty. No clusters, no observations, no close data | SEVERE — Three empty tabs |
| /playbook | 8 experiments across tabs, influence leaderboard, market signals | Completely empty — all tabs show nothing | SEVERE — Entire page blank |
| /deal-fitness | Horizon Health portfolio + drill-down | Empty portfolio table, no drill-down available | SEVERE — Page blank |
| /book | 18 accounts, morning brief, cross-book insights | No accounts (Sarah has no closed_won deals), empty metrics | SEVERE — Page blank |
| /outreach | Email sequences + intelligence brief | No sequences (orphaned tables), empty brief | SEVERE — Page blank |
| /agent-config | Agent configs, versions, feedback | Empty — no configs exist until created | MODERATE — Needs first-run setup |
| /analytics | KPI cards, charts, breakdowns | All zeros — no deals to compute from | SEVERE — Charts show nothing |
| /calls | Transcript table with 5+ entries | "No call transcripts yet" empty state | MODERATE — Clean empty state |
| /analyze | Transcript input + streaming analysis | Fully functional — no seed dependency | NONE — Works standalone |
| /prospects | Contact database table | Empty table — no contacts | MODERATE — Clean empty state |
| /team | "Coming Soon" | Identical — always placeholder | NONE |
| /agent-admin | "Coming Soon" | Identical — always placeholder | NONE |

**Verdict:** Deleting seeds leaves only 3 functional pages: Landing, Analyze, and the observation input bar. Every other page is empty or broken. The application is ~95% theater without seeds.

---

## Section 7: Rebuild Scope Recommendation

### Keep and Harden (REAL features that need reliability work)

1. **Transcript Pipeline (steps 1-7)** — Add Claude API retry logic (2 retries with exponential backoff) to parallel-analysis step. Replace raw `fetch` with Anthropic SDK. Estimated: 2-3 hours.

2. **Observation Pipeline** — Skip re-classification when `sourceContext.trigger === "transcript_pipeline"` (saves 2 Claude calls per signal). Add observation deduplication. Estimated: 1-2 hours.

3. **Stage Change Modal** — Works but test close/won/lost capture thoroughly. Verify close factors persist correctly. Estimated: 1 hour.

4. **Demo Reset** — Verify idempotency. Ensure all actor types destroyed. Test that relative close dates work correctly. Estimated: 1 hour.

5. **Field Query Lifecycle** — Add background expiration enforcement. Test give-back rendering. Estimated: 1-2 hours.

6. **Agent Config — Configure/Evolution tabs** — Test NL interpretation edge cases. Verify version diffing. Estimated: 1 hour.

### Make Real (THEATER features worth converting to live data)

1. **Experiment Metrics Calculation** — Replace seed-static metrics with live computation from evidence deals. Query deals in test/control groups, compute velocity/sentiment/close rate. Estimated: 3-4 hours.

2. **Intelligence Page Auto-Refresh** — Add 10-second polling or WebSocket subscription for agent-detected patterns after pipeline runs. Estimated: 1-2 hours.

3. **Coordinator Pattern Persistence** — Persist coordinator patterns to a new DB table (or reuse systemIntelligence). Survive demo reset. Estimated: 2-3 hours.

4. **Notifications from Pipeline** — Create real notifications when pipeline completes, intervention fires, or brief is ready. Estimated: 2 hours.

### Complete (PARTIAL features that need gaps filled)

1. **Call Prep Production Timeout** — Investigate and fix the auto-call-prep timeout. Options: reduce prompt size, increase maxDuration, or make it a separate background step. Estimated: 2-4 hours.

2. **Brief Ready Persistence** — Persist call prep brief to DB (activities table or new column on deals) so it survives actor destruction. Estimated: 1-2 hours.

3. **Agent Intervention — Remove NordicMed Constraint** — Generalize health check to all deals. Remove hardcoded company name check. Estimated: 1 hour.

4. **Agent Memory — Fix Dead Fields** — Either write `lastCustomerResponseDate` from pipeline (fix phantom -20 deduction) or remove it from health check. Fix `daysSinceCreation` or remove it. Estimated: 1-2 hours.

5. **Pipeline Follow-up Email Display** — Surface the draft email generated in pipeline step 6 somewhere in the deal detail UI (e.g., "Draft Email Ready" button). Estimated: 1-2 hours.

### Cut (features to remove from rebuild scope)

| Feature | How to Cut |
|---------|-----------|
| Follow/Unfollow experiment buttons | Remove button JSX from playbook-client.tsx |
| /team page | Delete page.tsx — it's a placeholder |
| /agent-admin page | Delete page.tsx — it's a placeholder |
| /prospects page | Remove from any nav; keep file but deprioritize |
| /calls page | Remove from any nav; transcripts accessed via deal detail |
| /outreach page | Hide sidebar item — orphaned tables, no creation flow |
| Deal Fitness page | Hide sidebar item — 100% theater, not in demo flow, would need full pipeline integration to make real |
| Influence Leaderboard tab | Hide tab — seed-only, no calculation engine |
| Agent Config Team Network tab | Hide tab — seed-only cross-agent data |
| agentActionsLog table | Leave in schema but ignore — dead table (Phase 2) |
| emailSequences/emailSteps tables | Leave in schema — orphaned, no API |
| leadScores table | Leave in schema — never queried |
| Pipeline action items extraction | Already extracted by Claude but never displayed — low value, cut from scope |
| Support function routing UI | Cut unless building support persona demo — API exists but no component |
| Book — Draft Check-in Emails | Cut hardcoded emails — either build real generation or remove feature |
| Book — Cross-Book Intelligence | Cut hardcoded pattern cards — either compute live or remove |

### The Minimum Viable Demo

If time is extremely tight, these 7 features tell the complete Nexus story in 7-10 minutes:

| # | Feature | Current | Needed | Estimated Fix |
|---|---------|---------|--------|---------------|
| 1 | **Pipeline Kanban → Deal Detail** | REAL | Harden | 0 hours (works) |
| 2 | **Process Transcript → Workflow Tracker** | REAL | Add retry logic | 2 hours |
| 3 | **MEDDPICC Live Update** | REAL | Harden | 0 hours (works) |
| 4 | **Agent Intervention (close date)** | PARTIAL | Remove NordicMed constraint, fix phantom deduction | 2 hours |
| 5 | **Call Prep Brief Generation** | PARTIAL | Fix production timeout, persist to DB | 3 hours |
| 6 | **Cross-Deal Intelligence** | PARTIAL | Persist patterns to DB, add intelligence page refresh | 3 hours |
| 7 | **Observation → Cluster → Experiment Auto-Creation** | REAL | Harden, verify end-to-end | 1 hour |

**Total minimum viable demo fix: ~11 hours of focused work.**

The story arc: Sarah processes a call (1-3) → agent detects risk and intervenes (4) → agent prepares her for next call (5) → process second call, see cross-deal patterns emerge (6) → submit observation, watch it flow through the system (7).

This covers the "persistent agents that learn, anticipate, and connect dots across the org" thesis without requiring any theater features.

---

## Section 8: Final Audit Summary

### What Nexus IS Right Now

Nexus is a visually polished demo application with a genuinely impressive core pipeline (transcript → AI analysis → MEDDPICC scoring → observation creation → cluster matching → cross-deal coordination) surrounded by a large shell of seed-data theater. The 37% of features that are REAL demonstrate sophisticated AI orchestration; the 43% that are THEATER create the illusion of a mature platform with months of accumulated intelligence.

### What Works

- **Transcript processing pipeline** — 11-step durable workflow with parallel Claude calls, real-time WebSocket progress, and MEDDPICC persistence
- **Observation system** — Manual input → AI classification → cluster matching → routing → follow-up questions → give-back. Full lifecycle
- **Agent bar** — Multi-mode input (observe, quick check, call prep, email draft) that works across all pages
- **Field query lifecycle** — Manager asks → distribute to AEs → collect responses → generate give-back → aggregate
- **Stage management** — Stage changes with outcome capture, close/won/lost analysis via Claude
- **Agent configuration** — Natural language instructions interpreted by Claude, versioned, with feedback loop
- **Demo reset** — Reliable full-state reset with relative dates and actor destruction
- **Streaming transcript analyzer** — Standalone analysis page with real Claude streaming

### What's Theater

- **All 8 playbook experiments** — Seed data with static metrics, never recalculated
- **Intelligence patterns** — ~90% seed clusters, metrics derived from seed data
- **Deal Fitness page** — Single seeded deal (Horizon Health), no pipeline integration
- **My Book page** — 18 seeded post-sale accounts with hardcoded cross-book insights and email templates
- **Outreach page** — Orphaned email sequence tables, no creation flow
- **Influence scores** — Seed-only, no calculation engine
- **Manager directives** — Seed-only, no creation UI
- **Notification system** — Almost entirely seed data
- **Contact/prospect database** — Seed contacts, no CRUD
- **Call transcript library** — Seed transcripts, no upload

### What's Broken

- **Follow/Unfollow experiment buttons** — UI renders, no API behind them
- **/team page** — "Coming Soon" placeholder
- **/agent-admin page** — "Coming Soon" placeholder
- **Pipeline follow-up email** — Claude generates it, never displayed anywhere
- **Pipeline action items** — Claude extracts them, never displayed anywhere
- **Health check phantom deduction** — `lastCustomerResponseDate` never written, causes -20 false penalty

### The Honest Assessment

**Is this demo-ready?** Conditionally yes, with caveats. The core pipeline story (Act 1) works reliably on localhost and mostly works on production, with the call prep timeout being the highest-risk moment. The cross-deal story (Act 2) works but is fragile — patterns live only in actor memory and disappear on restart. Act 3 (field queries, playbook) is a mix of real functionality and convincing theater.

**The gap between current state and a flawless 7-10 minute presentation:** The pipeline is 80% there. The biggest risk is the call prep production timeout — if "Brief Ready" doesn't fire during a live demo, it undermines the "agents that anticipate" thesis. The second risk is cross-deal intelligence disappearing on demo reset. The third risk is the intervention card's NordicMed-only constraint making it feel scripted rather than intelligent.

**The minimum work to close the gap:** Fix call prep timeout, persist coordinator patterns, remove NordicMed constraint, fix phantom health deduction, and add intelligence page refresh. This is approximately 11 hours of focused engineering work. Everything else (experiment metrics, notification pipeline, outreach creation, deal fitness integration) is polish that can wait.

### Estimated Rebuild Effort

- **Tier 1 — Must Fix (demo breaks without these):** ~11 hours
  - Claude API retry logic (2h)
  - Call prep production timeout (3h)
  - Coordinator pattern persistence (3h)
  - NordicMed constraint removal + health check fix (2h)
  - Intelligence page auto-refresh (1h)

- **Tier 2 — Should Fix (demo is weaker without these):** ~10 hours
  - Brief ready DB persistence (2h)
  - Pipeline email display (2h)
  - Experiment metrics live calculation (3h)
  - Notification pipeline from real events (2h)
  - Skip observation re-classification (1h)

- **Full Minimum Viable Demo (Tier 1 + Tier 2 + integration testing):** ~25 hours

- **Make Everything Real (eliminate all theater):** ~80-120 hours
  - This includes: deal fitness pipeline integration, post-sale account lifecycle, outreach sequence creation, contact CRUD, influence score engine, manager directive creation UI, support function routing UI, and more. Not recommended — the theater features serve the demo narrative without needing to be real.

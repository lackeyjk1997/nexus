# 06 — UI Structure

Frontend map at commit `c71d2b6`. 17 pages, 2 layouts, 25 shared components (7,783 LOC), 12 per-route client components (14,412 LOC). **Total TSX under `apps/web/src`: ~22,200 LOC** excluding the API routes covered in 03.

The dominant architectural pattern is **server-fetches-then-passes-to-client**: each dashboard page is a `"use server"` RSC that runs Drizzle queries in parallel and hands the results as props to a single massive `-client.tsx` file. Client components then fetch additional data via the API routes documented in 03. The `/analyze` route is the exception — it's a pure client page.

---

## Section 1: Page Map

17 `page.tsx` files. Organized by top-level route group, alphabetical within. The dashboard group has 16; the root landing page sits outside.

### Root

#### `/` — Landing page
- **File:** [apps/web/src/app/page.tsx](../../apps/web/src/app/page.tsx) (358 LOC)
- **Purpose:** Marketing landing with two "New" release cards (Persistent Deal Agents, Smart Interventions), thesis, three pillars, and an "Enter Demo" button linking to `/pipeline`.
- **Data fetching:** **None.** Pure static content with inline hex-color styles.
- **Components used:** only `next/link`.
- **API routes called:** **none.** (CLAUDE.md S13 claims this page fires `/api/demo/reset` on click — it does not. The button is a plain `<Link href="/pipeline">`.)
- **Layouts applied:** Root `layout.tsx` only (no dashboard chrome).

### `(dashboard)`

#### `/agent-admin`
- **File:** [apps/web/src/app/(dashboard)/agent-admin/page.tsx](../../apps/web/src/app/(dashboard)/agent-admin/page.tsx) (10 LOC)
- **Purpose:** Placeholder — renders "Coming Soon. This section will be built in a future session."
- **Data fetching:** none. **Components:** none. **API routes:** none.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar navigation.**

#### `/agent-config`
- **File:** [apps/web/src/app/(dashboard)/agent-config/page.tsx](../../apps/web/src/app/(dashboard)/agent-config/page.tsx) (35 LOC)
- **Purpose:** Per-member AI agent configuration UI with version history and feedback log.
- **Data fetching (server):** `agentConfigs`, `agentConfigVersions` (ordered by version desc), `feedbackRequests` (ordered by createdAt desc), `teamMembers`.
- **Components used:** `AgentConfigClient` (793 LOC).
- **API routes called** (from client): `POST /api/agent/configure` (interpret NL instruction), `PUT /api/agent/configure` (save confirmed change).
- **Layouts:** Root + `(dashboard)`. **Not currently in sidebar** (commented out in `sidebar.tsx:52`).

#### `/analytics`
- **File:** [apps/web/src/app/(dashboard)/analytics/page.tsx](../../apps/web/src/app/(dashboard)/analytics/page.tsx) (46 LOC)
- **Purpose:** Pipeline metrics / velocity dashboard.
- **Data fetching (server):** `deals` ⨝ `companies` ⨝ `teamMembers`, `activities` (all, ordered by createdAt desc), minimal `teamMembers` selection.
- **Components used:** `AnalyticsClient` (301 LOC).
- **API routes called:** none.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar.**

#### `/analyze`
- **File:** [apps/web/src/app/(dashboard)/analyze/page.tsx](../../apps/web/src/app/(dashboard)/analyze/page.tsx) (379 LOC) — **client component directly as the page**.
- **Purpose:** Paste transcript → AI streams analysis (prompt #5) → optionally link to deal + draft follow-up email.
- **Data fetching:** none on the server. Everything client-side.
- **Components used:** `TranscriptInput`, `AnalysisStream`, `ObservationInput`.
- **API routes called:** `POST /api/analyze` (stream), `POST /api/agent/draft-email`, `POST /api/agent/save-to-deal`.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar.**

#### `/book`
- **File:** [apps/web/src/app/(dashboard)/book/page.tsx](../../apps/web/src/app/(dashboard)/book/page.tsx) (7 LOC)
- **Purpose:** Sarah Chen's post-sale account book. Thin wrapper; `BookClient` does its own fetching.
- **Data fetching (server):** none.
- **Components used:** `BookClient` (2,543 LOC — the biggest client file).
- **API routes called** (from client): `GET /api/book?aeId=...`, `POST /api/customer/response-kit`, `POST /api/customer/qbr-prep`, `POST /api/customer/outreach-email`, `POST /api/observations`.
- **Layouts:** Root + `(dashboard)`. **In sidebar.**

#### `/calls`
- **File:** [apps/web/src/app/(dashboard)/calls/page.tsx](../../apps/web/src/app/(dashboard)/calls/page.tsx) (117 LOC) — **renders table directly, no client component**.
- **Purpose:** Call transcript library — read-only list of all call transcripts with quality score and analysis badge.
- **Data fetching (server):** `callTranscripts` ⨝ `deals` ⨝ `companies` ⨝ `callAnalyses`.
- **Components used:** none (inline table).
- **API routes called:** none.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar.**

#### `/command-center`
- **File:** [apps/web/src/app/(dashboard)/command-center/page.tsx](../../apps/web/src/app/(dashboard)/command-center/page.tsx) (77 LOC)
- **Purpose:** (Historical) Pipeline overview + recent activities + notifications dashboard. Not currently in sidebar.
- **Data fetching (server):** `deals` ⨝ `companies` ⨝ `teamMembers`, `activities` (top 10), `notifications` ⨝ `teamMembers`, `teamMembers` (all).
- **Components used:** `CommandCenterClient` (313 LOC), `ActivityFeed`.
- **API routes called:** none from server.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar** (`Command Center` is commented out at `sidebar.tsx:45`).

#### `/deal-fitness`
- **File:** [apps/web/src/app/(dashboard)/deal-fitness/page.tsx](../../apps/web/src/app/(dashboard)/deal-fitness/page.tsx) (20 LOC)
- **Purpose:** Portfolio-level oDeal fitness view + drill-down per deal.
- **Data fetching (server):** internal fetch to `${baseUrl}/api/deal-fitness` — the page re-uses its own API route rather than calling Drizzle directly.
- **Components used:** `DealFitnessClient` (2,197 LOC).
- **API routes called** (from client): `GET /api/deal-fitness?dealId=...` (drill-down).
- **Layouts:** Root + `(dashboard)`. **In sidebar.**

#### `/intelligence`
- **File:** [apps/web/src/app/(dashboard)/intelligence/page.tsx](../../apps/web/src/app/(dashboard)/intelligence/page.tsx) (155 LOC)
- **Purpose:** Cross-team signals dashboard with tabs: Patterns (clusters), Field Feed (observations), Close Intelligence (win/loss factor aggregation). Used by all roles — managers fire field queries from here.
- **Data fetching (server):** `observationClusters` (all), `observations` ⨝ `teamMembers` (all), `observationRouting` (acknowledged only — used to compute avg response time), deals with `closeFactors`/`winFactors`, active `managerDirectives`. Aggregates loss/win factors by category in the RSC before passing to client.
- **Components used:** `IntelligenceClient` (1,575 LOC).
- **API routes called** (from client): `GET /api/intelligence`, `GET /api/intelligence/agent-patterns`, `GET /api/field-queries/suggestions`, `POST /api/field-queries`, `GET /api/field-queries?initiatedBy=...`, `GET /api/field-queries?targetMemberId=...`.
- **Layouts:** Root + `(dashboard)`. **In sidebar.**

#### `/observations`
- **File:** [apps/web/src/app/(dashboard)/observations/page.tsx](../../apps/web/src/app/(dashboard)/observations/page.tsx) (5 LOC)
- **Purpose:** Redirect-only. `redirect("/intelligence?tab=feed")`.
- **Data fetching:** none. **Components:** none. **API routes:** none.
- **Layouts:** Root + `(dashboard)` (not reached). **Not in sidebar.**
- **Note:** A full client file `observations-client.tsx` exists in this directory (463 LOC) but is **unreachable dead code** — see Section 5.

#### `/outreach`
- **File:** [apps/web/src/app/(dashboard)/outreach/page.tsx](../../apps/web/src/app/(dashboard)/outreach/page.tsx) (78 LOC)
- **Purpose:** Email sequences + Intelligence Brief sidebar.
- **Data fetching (server):** `emailSequences` ⨝ `deals` ⨝ `companies` ⨝ `contacts` ⨝ `teamMembers`; `emailSteps` (all); top 2 competitive_intel clusters by ARR; top 2 win_pattern clusters; active messaging/positioning/competitive directives.
- **Components used:** `OutreachClient` (343 LOC).
- **API routes called** (from client): none in the top-level fetch sites grepped.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar** (commented out at `sidebar.tsx:51`).

#### `/pipeline`
- **File:** [apps/web/src/app/(dashboard)/pipeline/page.tsx](../../apps/web/src/app/(dashboard)/pipeline/page.tsx) (37 LOC)
- **Purpose:** Pipeline views — kanban, table, forecast.
- **Data fetching (server):** `deals` ⨝ `companies` ⨝ `teamMembers` ⨝ `contacts`, all `teamMembers`.
- **Components used:** `PipelineClient` (572 LOC), `QuickQuestions`.
- **API routes called** (from client): `GET /api/field-queries?targetMemberId=...` (via `QuickQuestions`).
- **Layouts:** Root + `(dashboard)`. **In sidebar — first item.**

#### `/pipeline/[id]`
- **File:** [apps/web/src/app/(dashboard)/pipeline/[id]/page.tsx](../../apps/web/src/app/(dashboard)/pipeline/[id]/page.tsx) (174 LOC)
- **Purpose:** Deal detail workspace — the single most complex UI surface. Holds deal overview, MEDDPICC, milestones, stakeholders, activity feed, call transcripts, stage history, agent memory, interventions, workflow tracker, stage-change modal, call prep, email draft.
- **Data fetching (server):** 1 sequential query for the deal itself + 7 parallel follow-ups: `meddpiccFields`, `dealMilestones`, `contacts` (by companyId), `activities` ⨝ `teamMembers`, `callTranscripts` ⨝ `callAnalyses`, `dealStageHistory`, `observations` (by sourceContext.dealId OR linkedDealIds).
- **Components used:** `DealDetailClient` (2,463 LOC — second-biggest client file), which itself imports `ActivityFeed`, `StageChangeModal`, `AgentMemory`, `AgentIntervention`, `WorkflowTracker`, `DealQuestionInput`.
- **API routes called** (from client, confirmed from Session 3): `GET /api/deals/[id]/meddpicc`, `PATCH /api/deals/[id]/update`, `GET /api/deal-agent-state`, `POST /api/agent/call-prep`, `POST /api/agent/save-to-deal`, `POST /api/agent/draft-email`, `POST /api/deal-fitness/analyze`, `POST /api/transcript-pipeline`. Uses `useActor({ name: "dealAgent" })` for WebSocket `workflowProgress` events.
- **Layouts:** Root + `(dashboard)`.

#### `/playbook`
- **File:** [apps/web/src/app/(dashboard)/playbook/page.tsx](../../apps/web/src/app/(dashboard)/playbook/page.tsx) (151 LOC)
- **Purpose:** Experiments lifecycle. 3 tabs: Active Experiments, What's Working (promoted/graduated), Influence. Drills into deal-level evidence per experiment.
- **Data fetching (server):** `playbookIdeas` (large projection), `influenceScores`, `teamMembers`, `systemIntelligence` where `insightType='market_signal'`. Plus a raw SQL query for `experiment_evidence` column (wrapped in try/catch for legacy safety).
- **Components used:** `PlaybookClient` (2,429 LOC — third-biggest).
- **API routes called** (from client): `PATCH /api/playbook/ideas/[id]` (status transitions).
- **Layouts:** Root + `(dashboard)`. **In sidebar.**

#### `/prospects`
- **File:** [apps/web/src/app/(dashboard)/prospects/page.tsx](../../apps/web/src/app/(dashboard)/prospects/page.tsx) (58 LOC)
- **Purpose:** Contact database with filters.
- **Data fetching (server):** `contacts` ⨝ `companies`, all `deals`, recent `activities` ⨝ `teamMembers`.
- **Components used:** `ProspectsClient` (420 LOC).
- **API routes called:** none.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar.**

#### `/team`
- **File:** [apps/web/src/app/(dashboard)/team/page.tsx](../../apps/web/src/app/(dashboard)/team/page.tsx) (10 LOC)
- **Purpose:** Placeholder — "Coming Soon" (identical to `/agent-admin`).
- **Data fetching:** none. **Components:** none. **API routes:** none.
- **Layouts:** Root + `(dashboard)`. **Not in sidebar.**

### Page count check
17 pages total — matches 01-INVENTORY.md §4.

### Active sidebar navigation
Only 5 items are actually in the sidebar (from `sidebar.tsx:44-53`): **Pipeline**, **My Book**, **Intelligence**, **Playbook**, **Deal Fitness**. Everything else (Command Center, Outreach, Agent Config) is present in the file but commented out. Pages like Calls, Analytics, Analyze, Prospects, Team, Agent Admin, Observations are reachable only by direct URL.

---

## Section 2: Layout Map

Two layout files total.

### `apps/web/src/app/layout.tsx` — Root (19 LOC)
- **Scope:** Every route.
- **Renders:** `<html lang="en"><body>{children}</body></html>` — minimal HTML shell.
- **Metadata:** title "Nexus — AI Sales Orchestration".
- **Providers wrapped:** **None at this layer.**
- **Notable:** Imports `globals.css` which loads the Inter font from Google Fonts (line 1: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')`). Despite this, inline styles throughout the codebase specify `"'DM Sans', sans-serif"` — see Section 4.

### `apps/web/src/app/(dashboard)/layout.tsx` — Dashboard (70 LOC)
- **Scope:** Every route under `(dashboard)/` (all dashboard pages).
- **Marked `"use server"` (async RSC)** with `export const dynamic = "force-dynamic"`.
- **Data fetching:** In parallel: `teamMembers` (all), `supportFunctionMembers` (all). Merged into a single `users` list, filtered + sorted by a hardcoded `DEMO_ORDER` of 8 demo personas: `"Sarah Chen", "David Park", "Ryan Foster", "Marcus Thompson", "Alex Kim", "Lisa Park", "Michael Torres", "Rachel Kim"`.
- **Renders:** a flex shell — `<Sidebar />` + (`<TopBar />` + `<main>{children}<LayoutAgentBar /></main>`) + `<AdminReset />`.
- **Providers wrapped:**
  - `<PersonaProvider initialUsers={sortedUsers}>` — React context for the currently selected demo persona (see `providers.tsx`). Persists via `localStorage.nexus_persona_id`.
  - **No `RivetProvider`** — despite the name, `@rivetkit/react` does not use a provider; `useActor` establishes its own connection inline (see `lib/rivet.ts`).
- **Notable:** No auth check. The dashboard loads for any visitor.

---

## Section 3: Major Components (>100 LOC)

25 shared components under `apps/web/src/components/` plus 12 per-route client files. Organized by role.

### 3A. Per-route client components (state-heavy, route-scoped)

All live alongside their `page.tsx`. **None** are importable from elsewhere — each serves exactly one route.

#### `BookClient` — 2,543 LOC — `apps/web/src/app/(dashboard)/book/book-client.tsx`
- **Purpose:** My Book page. Account list, priority queue, cross-book intelligence, and the 12-section account drawer (health, contracted use cases, contract, usage metrics, stakeholders, expansion map, risk/expansion/proactive signals, messages, actions).
- **Props:** `(none)` — fetches its own data.
- **State:** 20+ `useState` including `accounts`, `metrics`, `activeDrawer`, selected account, selected response-kit message, QBR prep modal state, outreach email modal state, filter/sort state.
- **External calls:** `GET /api/book?aeId=...`, `POST /api/customer/response-kit`, `POST /api/customer/qbr-prep`, `POST /api/customer/outreach-email`, `POST /api/observations`.
- **Child components:** `ResponseKitModal`, plus heavy inline JSX (no extracted sub-components).
- **Pages that use it:** `/book` only.

#### `DealDetailClient` — 2,463 LOC — `apps/web/src/app/(dashboard)/pipeline/[id]/deal-detail-client.tsx`
- **Purpose:** Deal workspace; see §1 above for data sources. Includes embedded email draft modal, call-prep modal, fitness-trigger, MEDDPICC live refresh, workflow tracker, agent memory, agent intervention.
- **Props:** `{ deal, meddpicc, milestones, contacts, activities, transcripts, stageHistory, dealObservations }`.
- **State:** 30+ `useState` — current tab, MEDDPICC editing state, brief open/closed, email draft state, attendee picker, copy-confirmation flags, fitness poll ref, agent-memory refetch key.
- **External calls:** via Session 3 grep — 10+ fetch sites. Notable: uses `useActor({ name: "dealAgent", key: [deal.id] })` for WebSocket subscription.
- **Child components:** `ActivityFeed`, `StageChangeModal`, `AgentMemory`, `AgentIntervention`, `WorkflowTracker`, `DealQuestionInput`.
- **Pages that use it:** `/pipeline/[id]` only.

#### `PlaybookClient` — 2,429 LOC — `apps/web/src/app/(dashboard)/playbook/playbook-client.tsx`
- **Purpose:** Experiments lifecycle UI. Shows 8+ experiments with lifecycle, evidence drill-down, approval flow, graduation logic.
- **Props:** `{ ideas, scores, members, marketSignals }`.
- **State:** tab state, selected experiment modal, approval form state, evidence expansion state, filter state.
- **External calls:** `PATCH /api/playbook/ideas/[id]` (3 call sites — approve, reject, graduate).
- **Pages that use it:** `/playbook` only.

#### `DealFitnessClient` — 2,197 LOC — `apps/web/src/app/(dashboard)/deal-fitness/deal-fitness-client.tsx`
- **Purpose:** oDeal fitness portfolio + drill-down with 3 rich card types (Stakeholder Engagement, Buyer Momentum, Conversation Signals — all hand-drawn SVGs).
- **Props:** `{ initialData: { deals: any[] } }`.
- **State:** view toggle (portfolio vs drill), selected deal, animation states, expansion toggles for event lists.
- **External calls:** `GET /api/deal-fitness?dealId=...`.
- **Pages that use it:** `/deal-fitness` only.

#### `IntelligenceClient` — 1,575 LOC — `apps/web/src/app/(dashboard)/intelligence/intelligence-client.tsx`
- **Purpose:** Three tabs (Patterns / Field Feed / Close Intelligence) + field-query composer + field-query history.
- **Props:** `{ clusters, observations, avgResponseTime, closeIntelligence, directives }`.
- **State:** tab state from URL search params, selected cluster, field-query draft, agent-patterns state.
- **External calls:** 6 `fetch` sites (see §1).
- **Pages that use it:** `/intelligence` only. (`/observations` redirects here with `?tab=feed`.)

#### `AgentConfigClient` — 793 LOC — `apps/web/src/app/(dashboard)/agent-config/agent-config-client.tsx`
- **Purpose:** Agent persona + guardrails + output preferences editor with version history.
- **Props:** `{ allConfigs, allVersions, allFeedback, allMembers }`.
- **External calls:** `POST /api/agent/configure` (interpret), `PUT /api/agent/configure` (save).

#### `PipelineClient` — 572 LOC — `apps/web/src/app/(dashboard)/pipeline/pipeline-client.tsx`
- **Purpose:** 3 views (kanban / table / forecast) + vertical/AE/forecast filters.
- **Props:** `{ deals, teamMembers }`.
- **State:** view mode, 3 filter states.
- **External calls:** none directly; child `QuickQuestions` fetches pending field queries.
- **Child components:** `QuickQuestions`.

#### `ObservationsClient` — 463 LOC — **UNUSED** (see Section 5).

#### `ProspectsClient` — 420 LOC — `apps/web/src/app/(dashboard)/prospects/prospects-client.tsx`
- **Purpose:** Contact directory with search + filter.
- **Props:** `{ contacts, deals, activities }`.
- **External calls:** none.

#### `OutreachClient` — 343 LOC — `apps/web/src/app/(dashboard)/outreach/outreach-client.tsx`
- **Purpose:** Email sequence list + Intelligence Brief (competitive clusters + wins + directives).
- **Props:** `{ sequences, steps, intelligenceBrief }`.
- **External calls:** none.

#### `CommandCenterClient` — 313 LOC — `apps/web/src/app/(dashboard)/command-center/command-center-client.tsx`
- **Purpose:** Legacy dashboard (pipeline metrics + activities + notifications).
- **Props:** `{ deals, activities, notifications, teamMembers }`.
- **Child components:** `ActivityFeed`.
- **External calls:** none.

#### `AnalyticsClient` — 301 LOC — `apps/web/src/app/(dashboard)/analytics/analytics-client.tsx`
- **Purpose:** Pipeline velocity / stage flow metrics.
- **Props:** `{ deals, activities, members }`.
- **External calls:** none.

### 3B. Shared data-orchestrating / stateful components

#### `ObservationInput` (Universal Agent Bar) — 2,130 LOC — `apps/web/src/components/observation-input.tsx`
- **The single largest component in the codebase.**
- **Purpose:** The persistent "Ask Nexus" bar at the bottom of every dashboard page. Handles observation capture, follow-up questions, quick-check responses, deal resolution for attendee picking, call-prep generation, email draft generation. ~10 distinct UI phases (`collapsed | expanded | submitting | follow_up | follow_up_submitting | giveback | quick_check | quick_check_submitting | quick_check_giveback | call_prep_context | ...`).
- **Props:** `{ context: { page, dealId, accountId, analysisId, trigger, vertical }, variant?: "inline"|"sidebar"|"post-action", autoOpen?: boolean, placeholder?: string }`.
- **State:** 25+ `useState` hooks. Plus multiple `useRef`s for focus management and DOM interaction.
- **External calls** (from Session 3 grep): `GET /api/field-queries?targetMemberId=...`, `POST /api/observations`, `POST /api/deals/resolve` (×2), `POST /api/agent/call-prep`, `POST /api/agent/draft-email` (×2), `POST /api/observations/[id]/follow-up`, `PATCH /api/playbook/ideas/[id]`, `POST /api/field-queries/respond` (×2), `POST /api/agent/save-to-deal`.
- **Child components:** none (inline JSX). Heavy `lucide-react` icon usage; 188 hex colors inline.
- **Pages that use it:** all dashboard pages (via `LayoutAgentBar`) + `/analyze` page (standalone).

#### `StageChangeModal` — 739 LOC — `apps/web/src/components/stage-change-modal.tsx`
- **Purpose:** Modal for deal stage transitions. Handles Close Won / Close Lost with AI-suggested chips (prompt #14), loss-reason chips, improvement chips, win-turning-point chips, rep notes.
- **Props:** `{ deal, onStageChange, onClose, open, etc. }` (inferred).
- **External calls:** `POST /api/deals/close-analysis` (fires on open to Close Won/Lost), `POST /api/deals/stage` (×2 — save confirmation).
- **Pages that use it:** `/pipeline/[id]` (via `DealDetailClient`).

#### `ActivityFeed` — 613 LOC — `apps/web/src/components/activity-feed.tsx`
- **Purpose:** Deal/company activity timeline with per-type icons + colors + expansion for long entries.
- **Critical debt:** Contains the `getEffectiveType()` function (schema.ts debt §4.1) — maps legacy `type='note_added'` rows to a real type via `metadata.source`.
- **Props:** `{ activities: ActivityItem[] }` (exported ActivityItem type).
- **External calls:** none (pure presentational).
- **Pages that use it:** `/command-center`, `/pipeline/[id]`.

#### `ResponseKitModal` — 535 LOC — `apps/web/src/components/response-kit-modal.tsx`
- **Purpose:** Reusable response-kit modal for inbound customer messages. Renders message analysis, similar resolutions, recommended resources, draft reply.
- **Props:** `{ message, account, open, onClose }`.
- **External calls:** `POST /api/customer/response-kit` (×2 — one for generate/load, one for mark-responded).
- **Pages that use it:** `/book` (via `BookClient`).

#### `QuickQuestions` — 421 LOC — `apps/web/src/components/quick-questions.tsx`
- **Purpose:** Floating question card — shows pending field queries targeted at the current user. AE-only (`currentUser?.role === "AE"`).
- **Props:** `{ filterDealId?: string }`.
- **External calls:** `GET /api/field-queries?targetMemberId=...`, `POST /api/field-queries/respond` (×2).
- **Pages that use it:** `/pipeline` (via `PipelineClient`).

#### `TopBar` — 339 LOC — `apps/web/src/components/layout/top-bar.tsx`
- **Purpose:** Dashboard header — persona switcher (dropdown grouped by Sales Team / Leadership / Solutions / Support Functions), notification bell, deal-count badge.
- **Props:** none (uses `usePersona()`).
- **External calls:** `GET /api/notifications?memberId=...`.
- **Pages:** Every dashboard page via `(dashboard)/layout.tsx`.

#### `DealQuestionInput` — 285 LOC — `apps/web/src/components/deal-question-input.tsx`
- **Purpose:** MANAGER-only "Ask about this deal" composer on the deal page. Generates suggested questions based on MEDDPICC gaps, competitor presence, stage age.
- **Props:** `{ deal, meddpicc }`.
- **External calls:** `POST /api/field-queries`.
- **Pages that use it:** `/pipeline/[id]`.

#### `AgentMemory` — 281 LOC — `apps/web/src/components/agent-memory.tsx`
- **Purpose:** Collapsible "Agent Memory" card on the deal page showing learnings, risk signals, competitive context, coordinated intel.
- **Props:** `{ dealId, triggerRefetch? }`.
- **External calls:** `GET /api/deal-agent-state?dealId=...`.
- **Pages:** `/pipeline/[id]`.

#### `WorkflowTracker` — 279 LOC — `apps/web/src/components/workflow-tracker.tsx`
- **Purpose:** Real-time 5-step pipeline tracker (Analyze Transcript / Update Scores / Check Experiments / Synthesize / Finalize). Subscribes to `workflowProgress` WebSocket events.
- **Props:** `{ dealId: string }`.
- **External calls:** `useActor({ name: "dealAgent", key: [dealId] })` for events — no REST fetch.
- **Pages:** `/pipeline/[id]`.

#### `AgentIntervention` — 261 LOC — `apps/web/src/components/agent-intervention.tsx`
- **Purpose:** Proactive timeline-risk card on the deal page. **Demo constraint: only renders for deals with "nordicmed"/"nordic med" in the name** (line 22-25).
- **Props:** `{ dealId, deal: { closeDate, stage, name }, onCloseDateChange? }`.
- **External calls:** `GET /api/deal-agent-state?dealId=...`, `POST /api/deal-agent-state`, `PATCH /api/deals/[id]/update`.
- **Pages:** `/pipeline/[id]`.

#### `LinkToDeal` — 247 LOC — `apps/web/src/components/analyzer/link-to-deal.tsx`
- **Purpose:** Post-analysis deal/company linker on `/analyze`. Picks the deal for an unlinked transcript, then calls the link API.
- **External calls:** `GET /api/deals`, `GET /api/companies`, `POST /api/analyze/link` (×2).
- **Pages:** `/analyze` (via `AnalysisStream`).

#### `TranscriptInput` — 245 LOC — `apps/web/src/components/analyzer/transcript-input.tsx`
- **Purpose:** Transcript upload area with paste/file/demo-transcript options.
- **Props:** `{ onTranscriptReady, isAnalyzing }`.
- **Pages:** `/analyze`.

#### `AgentFeedback` — 213 LOC — `apps/web/src/components/feedback/agent-feedback.tsx`
- **Purpose:** Thumb up/down + tag + comment widget for rating AI outputs.
- **Props:** `{ agentConfigId, sourceType }`.
- **External calls:** `POST /api/agent/feedback`.
- **Pages:** used inside analyzer subcomponents (`deal-score`, `coaching-tips`, `call-summary`) which are on `/analyze`.

### 3C. Smaller presentational components (100–200 LOC)

Kept brief — these are mostly styled views with minimal logic.

| Component | LOC | Purpose | External calls | Used by |
|-----------|-----|---------|----------------|---------|
| `SentimentArc` | 164 | SVG curve of buyer sentiment shift | none | `AnalysisStream` |
| `AnalysisStream` | 144 | Wrapper for /analyze streaming + result cards | none | `/analyze` page |
| `Sidebar` | 130 | Nav rail (5 items) + Reset Demo button | none (dispatches `admin-reset-trigger` event) | `(dashboard)/layout.tsx` |
| `AdminReset` | 128 | Reset confirmation modal; keyboard shortcut ⌘⇧X; listens to `admin-reset-trigger` event | `POST /api/demo/reset` | `(dashboard)/layout.tsx` |
| `DealScore` | 121 | Deal-score card on /analyze | none | `AnalysisStream` |

### 3D. Small presentational (< 100 LOC)

`layout-agent-bar.tsx` (61 — path-based context + placeholder selection for `ObservationInput`), `providers.tsx` (96 — PersonaContext), `key-moments.tsx` (97), `risk-signals.tsx` (94), `coaching-tips.tsx` (70), `talk-ratio.tsx` (65), `call-summary.tsx` (25).

---

## Section 4: Design System

### Color palette
Two definitions coexist, each drifted from the other.

**1. Tailwind theme (`apps/web/tailwind.config.ts`)** — the "official" token source:

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#FAF9F6` (cream) | body bg |
| `foreground` | `#1A1A1A` | body text |
| `card.DEFAULT` | `#FFFFFF` | card bg |
| `sidebar.DEFAULT` | `#F5F3EF` | sidebar bg |
| `primary.DEFAULT` | `#0C7489` (teal) | primary buttons/active nav |
| `primary.light` | `#E6F4F7` | hover background |
| `secondary.DEFAULT` | `#D4735E` (coral) | accents |
| `secondary.light` | `#FDF0ED` | subtle coral bg |
| `muted.DEFAULT` | `#F5F3EF` | muted bg |
| `muted.foreground` | `#6B6B6B` | muted text |
| `destructive` | `#C74B3B` | destructive actions |
| `border` | `#E8E5E0` | borders |
| `ring` | `#0C7489` | focus rings |
| `success` / `warning` / `danger` | `#2D8A4E` / `#D4A843` / `#C74B3B` | state colors |
| `vertical.healthcare` | `#3B82F6` | blue |
| `vertical.financial` | `#10B981` | green (note: `getVerticalColor` at `lib/utils.ts:48` keys on `financial_services` and uses the same `#10B981`) |
| `vertical.manufacturing` | `#F59E0B` | amber |
| `vertical.retail` | `#8B5CF6` | purple |
| `vertical.technology` | `#06B6D4` | cyan |

**2. Inline hex strings in components** — the actual dominant styling layer. Grep count: **1,019 occurrences of `#[0-9A-Fa-f]{6}` across 23 files**, concentrated in:

| File | Hex count |
|------|----------|
| `playbook-client.tsx` | 208 |
| `observation-input.tsx` | 188 |
| `deal-detail-client.tsx` | 145 |
| `intelligence-client.tsx` | 102 |
| `activity-feed.tsx` | 91 |
| `stage-change-modal.tsx` | 46 |
| `page.tsx` (landing) | 26 |
| `agent-memory.tsx` | 24 |
| `deal-fitness-client.tsx` | 25 |
| ... 14 other files | 139 |

**Color drift between the two sources:**
- Inline files use **`#E07A5F`** as their coral accent — the "brand coral" in CLAUDE.md. Tailwind's `secondary.DEFAULT` is **`#D4735E`** — slightly different. Two corals are rendered side-by-side on the same pages.
- Inline files use `#3D3833` as text primary, `#8A8078` as muted — Tailwind uses `#1A1A1A` and `#6B6B6B`. Four text colors when the design system should have two.
- Inline files use `#FAF9F6` cream consistently, matching Tailwind.
- Component-specific sand tones (`#F5F3EF`, `#F3EDE7`, `#F9F7F4`, `#FDFAF7`) proliferate — see the landing page, `AdminReset`, various drawer backgrounds.

### Fonts
- **Tailwind config declares:** `fontFamily.sans: ["Inter", "system-ui", "sans-serif"]`.
- **`globals.css` loads:** Inter from Google Fonts (weights 300–700).
- **Inline styles request:** `'DM Sans', sans-serif` — appearing 113 times across 19 files (observation-input alone uses it 14 times).
- **What actually renders:** Tailwind classes get Inter; inline styles get **whatever sans-serif the browser defaults to** because DM Sans is never loaded. CLAUDE.md claims "Font: DM Sans" — the codebase does not match.

**Three fonts are in play when the design system should have one.**

### Shared UI primitives
**`apps/web/src/components/ui/` does NOT exist.** Confirmed with `ls apps/web/src/components/ui 2>/dev/null` (returns no output).

Despite the following Radix UI packages being declared in `apps/web/package.json`:
- `@radix-ui/react-avatar ^1.1.0`
- `@radix-ui/react-dialog ^1.1.0`
- `@radix-ui/react-dropdown-menu ^2.1.0`
- `@radix-ui/react-popover ^1.1.0`
- `@radix-ui/react-select ^2.1.0`
- `@radix-ui/react-separator ^1.1.0`
- `@radix-ui/react-slot ^1.1.0`
- `@radix-ui/react-tabs ^1.1.0`
- `@radix-ui/react-tooltip ^1.1.0`
- `@tremor/react ^3.18.0`

…**zero imports** of `@radix-ui/*` or `@tremor/react` exist anywhere in `apps/web/src`. Verified:

```
Grep: from ['\"]@radix-ui|from ['\"]@tremor
Result: No matches found
```

These packages ship, take up node_modules space, are listed in Tailwind's content paths (for `@tremor/react` styles), and are never used. **10 unused production dependencies.**

Every modal / dropdown / dialog / tooltip / popover in the codebase is hand-built from `<div>` + inline styles + manual event handling. For example `StageChangeModal`, `ResponseKitModal`, `TopBar`'s persona dropdown, and `AgentFeedback`'s tag picker are all bespoke.

### Framework 21 conversational UI
CLAUDE.md refers to "Framework 21 conversational UI" (brand palette section) — specifically:
- **Chips — selected:** `bg-[#3D3833] text-white`
- **Chips — default:** `bg-[#F5F3EF] text-[#3D3833]`
- **Tabs — active:** `text-[#3D3833] font-600 border-b-2 #E07A5F`
- **Tabs — inactive:** `text-[#8A8078]`

Components implementing this pattern directly:
- `ObservationInput` — chip set, follow-up chips, giveback card.
- `StageChangeModal` — chip-based loss/win factor selection (see `Chip` subcomponent at line 72).
- `QuickQuestions` — chip responses to field queries.
- `DealQuestionInput` — chip suggestions.
- `AgentFeedback` — tag chips.
- `deal-fitness-client` — category pill chips.
- `intelligence-client` — cluster severity chips.

The chip pattern is repeated ~7 times in separate components, each with its own hex colors and hover handlers. **No shared `<Chip />` primitive.**

---

## Section 5: Dead Code

### Dead client component

**`apps/web/src/app/(dashboard)/observations/observations-client.tsx` — 463 LOC — UNUSED.**

The file exports `ObservationsClient({ ... })` at line 116, but the only matching grep hit is the declaration itself. No page imports it. The `/observations` page at the same path is a 5-line redirect (`redirect("/intelligence?tab=feed")`).

Grep commands used to confirm:

```
Grep: observations-client|ObservationsClient
Result:
  apps/web/src/app/(dashboard)/observations/observations-client.tsx:116:export function ObservationsClient({
```

Only the declaration line matches. No importer. Confirmed dead code.

### Dead dependencies

10 production dependencies declared in `apps/web/package.json` with **zero imports** across `apps/web/src`:
- `@radix-ui/react-avatar`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `@tremor/react`

Verified via:
```
Grep: from ['\"]@radix-ui|from ['\"]@tremor
Result: No matches found
```

### Dead/stale sidebar configuration
`apps/web/src/components/layout/sidebar.tsx:45,51,52` have commented-out nav items for **Command Center**, **Outreach**, **Agent Config** — the pages still exist and are reachable by URL but are orphaned from navigation. Either the pages should be removed or the nav items restored.

### References CLAUDE.md says exist but don't

- **`DemoGuide` / `demo-guide.tsx`** — referenced heavily in CLAUDE.md S13 ("Guided demo checklist: floating panel…"). Grep confirms the only matches for `DemoGuide|demo-guide` are CSS class `.demo-highlight` and `data-demo-guide` attributes inline. The component does not exist in the repo. Commands run:
  ```
  Grep: \.old\.|-v1\.|\.deprecated\.|tour|DemoTour|DemoGuide|demo-guide
  Result: 6 files — all are CSS class references, not a component
  Grep: DemoGuide
  Result: 0 actual component references
  ```
- **`components/ui/` directory** — referenced in CLAUDE.md. Does not exist (confirmed by `ls` above).

### Files named to suggest deprecation
Grep for `.old.`, `-v1.`, `.deprecated.` across `apps/web/src`:

```
Grep: \.old\.|-v1\.|\.deprecated\.
Result: No matches found
```

No named-deprecation files. But `agent-admin/page.tsx` and `team/page.tsx` are identical "Coming Soon" placeholders (10 LOC each), unreachable via navigation — arguably dead stubs. These should either be built or deleted.

### `/analyze` page is a client component at the page level
Unusual architecturally: `apps/web/src/app/(dashboard)/analyze/page.tsx` is marked `"use client"` at the top and does the streaming fetch directly, without a separate `analyze-client.tsx`. This is different from every other dashboard page. Not dead, but inconsistent enough to flag for the rebuild.

---

## Summary

- **Pages:** 17 (matches 01-INVENTORY §4). Only 5 are in sidebar; 12 are reachable by URL only.
- **Layouts:** 2. Root is trivial; `(dashboard)` does the `teamMembers` + `supportFunctionMembers` fetch and mounts `PersonaProvider`.
- **Client components >100 LOC:** 19 in `components/` plus 12 per-route — 31 total files heavier than a typical presentational component.
- **Total TSX volume:** ~22,200 LOC — dominated by 5 per-route client files that each exceed 1,500 LOC.
- **Design system state:** 1,019 inline hex colors, 3 competing font declarations (Tailwind/Inter, globals.css/Inter, inline/DM Sans-which-never-loads), no shared `<Chip />`/`<Modal />`/`<Dropdown />` primitive, zero Radix/Tremor imports despite 10 such dependencies.
- **Dead code:** `observations-client.tsx` (463 LOC unreachable), 2 placeholder pages, 10 unused production dependencies. Commented-out sidebar items for 3 pages.
- **Architectural consistency:** strong — 11 of 17 pages follow the same RSC-fetches-then-client-renders pattern. `/analyze` is the main outlier (client page with no server fetching).

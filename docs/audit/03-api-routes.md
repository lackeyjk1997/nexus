# Phase 3: API Route & Claude AI Inventory

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1 (docs/audit/01-structure.md), Phase 2 (docs/audit/02-database-schema.md)

---

## Section 1: Route Summary Table

| # | Route | Methods | maxDuration | Tables Read | Tables Written | Claude? | Claude Calls | Description |
|---|-------|---------|-------------|-------------|----------------|---------|-------------|-------------|
| 1 | `/api/deals` | GET | default | deals, companies, teamMembers, contacts | — | No | 0 | All deals with company/AE/contact joins |
| 2 | `/api/deals/stage` | POST | default | deals | deals, dealStageHistory, activities, observations | No | 0 | Update deal stage with close capture |
| 3 | `/api/deals/resolve` | POST | default | deals, companies, contacts | — | No | 0 | Fuzzy-match deal by name fragment |
| 4 | `/api/deals/close-analysis` | POST | 60 | deals, companies, contacts, meddpiccFields, activities, observations, callTranscripts, callAnalyses, dealStageHistory, systemIntelligence | — | Yes | 1 | AI close/loss analysis |
| 5 | `/api/deals/[id]/meddpicc` | GET | default | meddpiccFields | — | No | 0 | Fetch MEDDPICC for deal |
| 6 | `/api/deals/[id]/meddpicc-update` | PATCH | 15 | deals, meddpiccFields | meddpiccFields, activities | No | 0 | Persist MEDDPICC from pipeline |
| 7 | `/api/deals/[id]/update` | PATCH | default | — | deals | No | 0 | Generic deal field update |
| 8 | `/api/companies` | GET | default | companies | — | No | 0 | All companies (id, name, industry) |
| 9 | `/api/team-members` | GET | default | teamMembers | — | No | 0 | All team members |
| 10 | `/api/activities` | GET | default | activities, deals, companies, teamMembers, contacts | — | No | 0 | Recent 20 activities with joins |
| 11 | `/api/notifications` | GET | default | notifications, teamMembers | — | No | 0 | Notifications by member |
| 12 | `/api/agent/call-prep` | POST | 120 | deals, companies, meddpiccFields, contacts, activities, observations, observationClusters, agentConfigs, callTranscripts, callAnalyses, teamMembers, resources, crossAgentFeedback, systemIntelligence, managerDirectives, playbookIdeas | — | Yes | 1 | Generate 8-layer call brief |
| 13 | `/api/agent/configure` | POST, PUT | default | agentConfigs | agentConfigs, agentConfigVersions | Yes | 1 (POST) | Interpret/save agent config |
| 14 | `/api/agent/draft-email` | POST | 60 | deals, companies, teamMembers, agentConfigs, contacts, activities, callTranscripts, callAnalyses, observations, resources, crossAgentFeedback, systemIntelligence, managerDirectives | — | Yes | 1 | Generate contextual email |
| 15 | `/api/agent/feedback` | POST | default | agentConfigs | feedbackRequests | No | 0 | Create feedback request |
| 16 | `/api/agent/save-to-deal` | POST | default | activities | activities | No | 0 | Save agent action as activity |
| 17 | `/api/analyze` | POST | 60 | — | — | Yes | 1 | Stream transcript analysis |
| 18 | `/api/analyze/link` | POST | default | deals, teamMembers | activities | No | 0 | Save analysis + trigger pipeline |
| 19 | `/api/observations` | GET, POST | 30 | observations, teamMembers, companies, deals, observationClusters, supportFunctionMembers, agentConfigs | observations, observationClusters, observationRouting, playbookIdeas, agentConfigs, agentConfigVersions, notifications | Yes | 2-4+ | Observation AI pipeline |
| 20 | `/api/observations/[id]/follow-up` | POST | default | observations, deals, teamMembers | observations, observationClusters, notifications | No | 0 | Process follow-up response |
| 21 | `/api/observations/clusters` | GET | default | observationClusters | — | No | 0 | All clusters by recency |
| 22 | `/api/observation-routing` | GET, PATCH | default | observationRouting, observations, teamMembers | observationRouting | No | 0 | Routing records CRUD |
| 23 | `/api/intelligence/agent-patterns` | GET | 30 | — (Rivet RPC) | — | No | 0 | Cross-deal patterns from coordinator |
| 24 | `/api/field-queries` | GET, POST | 30 | fieldQueries, fieldQueryQuestions, deals, companies, observationClusters, observations, teamMembers, meddpiccFields, contacts, activities, crossAgentFeedback | fieldQueries, fieldQueryQuestions | Yes | 1-9 | Field query creation + distribution |
| 25 | `/api/field-queries/respond` | POST | 30 | fieldQueryQuestions, deals, companies, fieldQueries, teamMembers | activities, observations, fieldQueryQuestions, fieldQueries | Yes | 2 | Process response + give-back |
| 26 | `/api/field-queries/suggestions` | GET | default | observationClusters | — | No | 0 | Suggested questions from clusters |
| 27 | `/api/book` | GET | default | deals, companies, accountHealth, customerMessages, contacts | — | No | 0 | AE's book of accounts |
| 28 | `/api/customer/response-kit` | POST | 60 | customerMessages, companies, contacts, deals, accountHealth, knowledgeArticles, systemIntelligence, observations | customerMessages | Yes | 1 | Generate/cache response kit |
| 29 | `/api/customer/qbr-prep` | POST | 60 | — | — | Yes | 1 | Generate QBR agenda |
| 30 | `/api/customer/outreach-email` | POST | 60 | — | — | Yes | 1 | Generate outreach email |
| 31 | `/api/deal-fitness` | GET | default | dealFitnessScores, deals, companies, teamMembers, dealFitnessEvents | — | No | 0 | Portfolio or deal fitness data |
| 32 | `/api/playbook/ideas/[id]` | PATCH | default | playbookIdeas, teamMembers | playbookIdeas, observations | No | 0 | Update experiment status |
| 33 | `/api/rivet/[...all]` | ALL | 300 | — (Rivet) | — (Rivet) | No | 0 | Rivet actor passthrough |
| 34 | `/api/transcript-pipeline` | POST | 300 | deals, companies, meddpiccFields, contacts, agentConfigs, playbookIdeas, teamMembers | — (via actor) | No | 0 | Trigger transcript pipeline |
| 35 | `/api/demo/reset` | POST | 300 | deals | deals, observations, observationRouting, observationClusters, fieldQueries, fieldQueryQuestions, activities, dealStageHistory, meddpiccFields, playbookIdeas, notifications, customerMessages | No | 0 | Reset demo data |

---

## Section 2: Detailed Route Inventory

### 2.1 Core Data Routes

#### `/api/deals` — GET

**Purpose:** Returns all deals with joined company, AE, and primary contact data.

**Database reads:** `deals` with leftJoin on `companies`, `teamMembers`, `contacts`. Ordered by `createdAt`. No limit.

**Database writes:** None.

**Response shape:** Array of flat deal objects with inlined company/AE/contact fields.

**Flags:**
- No pagination or limit — returns all deals
- Only selects `contacts.firstName` — lastName missing from primary contact display
- No try-catch

---

#### `/api/deals/stage` — POST

**Purpose:** Updates deal stage, records stage history, creates activity, and optionally creates observations from confirmed close factors.

**Request:** `{ dealId, fromStage, toStage, reason?, lossReason?, closeCompetitor?, closeNotes?, closeImprovement?, winTurningPoint?, winReplicable?, closeAiAnalysis?, closeFactors?, winFactors? }`

**Database writes:**
- `deals` UPDATE: stage + close fields + JSONB: `closeAiAnalysis`, `closeFactors`, `winFactors`
- `dealStageHistory` INSERT
- `activities` INSERT with metadata JSONB
- `observations` INSERT (per confirmed AI factor) with `aiClassification` JSONB: `{ signals: [{ type, confidence }] }`

**Flags:**
- Setting `winProbability` to `undefined` on non-close stages is a no-op — doesn't clear stale values
- Dead code: `companyContacts` filter returns `true` unconditionally

---

#### `/api/deals/resolve` — POST

**Purpose:** Fuzzy-match deal by name fragment for agent bar.

**Request:** `{ rawQuery?, dealId? }`

**Response:** `{ dealId, dealName, dealStage, accountName, accountId, contacts[] }`

**Flags:**
- Only matches words >= 4 chars — short names could be missed
- `resolvedAccountId` assigned but never used

---

#### `/api/deals/close-analysis` — POST (maxDuration: 60)

**Purpose:** AI-powered close/loss analysis using full deal context.

**Request:** `{ dealId, outcome }`

**Database reads:** 7 parallel + 2 sequential queries across deals, companies, contacts, meddpiccFields, activities, observations, callTranscripts, callAnalyses, dealStageHistory, systemIntelligence.

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 2000, non-streaming
- System prompt: ~1,600 chars — analyze closed deal, produce factors with evidence, chips, clarifying questions
- Response JSON: `{ summary, factors[], questions[], meddpicc_gaps[], stakeholder_flags[] }`
- JSON.parse: YES try/catch with fallback to empty structure
- Stored in JSONB: No (returned to client, later saved via `/api/deals/stage`)

**Flags:**
- Line 76: queries ALL contacts with no filter — full table scan, results discarded
- Currency hardcoded as EUR regardless of `deal.currency`

---

#### `/api/deals/[id]/meddpicc` — GET

**Purpose:** Fetch MEDDPICC record for a deal.

**Response:** Full `meddpiccFields` row or `null`.

---

#### `/api/deals/[id]/meddpicc-update` — PATCH (maxDuration: 15)

**Purpose:** Persist MEDDPICC scores from transcript pipeline.

**Request:** `{ updates: { [dimension]: { score, evidence, delta } } }`

**Database writes:** `meddpiccFields` UPDATE/INSERT, `activities` INSERT.

**Flags:**
- Skips dimensions with `delta === 0` — can't update evidence without changing score
- Race condition on upsert (acceptable — only called by serial pipeline)

---

#### `/api/deals/[id]/update` — PATCH

**Purpose:** Generic deal field update (close_date, stage, win_probability).

**Flags:**
- Sync params pattern (`{ params }: { params: { id: string } }`) — will break on Next.js 15 upgrade
- No `updatedAt` set on update
- `close_date` converted with no timezone

---

#### `/api/companies` — GET

Simple: returns `{ id, name, industry }` for all companies, ordered by name.

---

#### `/api/team-members` — GET

Simple: returns all `teamMembers` rows, no ordering.

---

#### `/api/activities` — GET

Returns 20 most recent activities with deal/company/member/contact joins. No filtering by persona — global feed.

---

#### `/api/notifications` — GET

Returns up to 20 notifications, optionally filtered by `?memberId=`. No endpoint for marking as read.

---

### 2.2 Agent / AI Routes

#### `/api/agent/call-prep` — POST (maxDuration: 120)

**Purpose:** Generate comprehensive call brief using 8+ intelligence layers.

**Request:** `{ dealId?, accountId?, memberId, rawQuery?, prepContext?, attendeeIds?, autoGenerated? }`

**Database reads:** 14+ tables (deals, companies, meddpiccFields, contacts, activities, observations, observationClusters, agentConfigs, callTranscripts, callAnalyses, teamMembers, resources, crossAgentFeedback, systemIntelligence, managerDirectives, playbookIdeas). Also Rivet RPC to `dealAgent.getMemoryForPrompt()`.

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 3000, non-streaming
- System prompt: ~4,000-8,000 chars (dynamic). 14 sections including deal agent memory, team intelligence, system intelligence, manager directives, playbook proven plays, available resources
- Response JSON: `{ headline, deal_snapshot, stakeholders_in_play[], talking_points[], questions_to_ask[], risks_and_landmines[], team_intelligence[], system_intelligence[], manager_directives[], competitive_context, suggested_resources[], suggested_next_steps[], active_experiments[], proven_plays[] }`
- JSON.parse: regex extract `{...}` then parse, inside outer try/catch. Generic error on failure.

**Flags:**
- N+1 query: per-contact stakeholder engagement count
- `resources` full table scan filtered in-memory
- `teamMembers` queried 3+ times
- `autoGenerated` param accepted but never used
- `isPrimary` hardcoded to `false` for contacts

---

#### `/api/agent/configure` — POST, PUT

**POST Purpose:** Interpret NL config instruction via Claude.
**PUT Purpose:** Save confirmed config changes.

**Claude AI call (POST):**
- Model: `claude-sonnet-4-20250514`, max_tokens: 2048, non-streaming
- System prompt: ~1,100 chars — interpret config changes conservatively
- Response JSON: `{ changeSummary, updatedFields, fullConfig }`

**PUT writes:** `agentConfigs` UPDATE + `agentConfigVersions` INSERT (non-transactional).

**Flags:**
- `configId` accepted in POST but unused
- PUT writes two queries without a transaction

---

#### `/api/agent/draft-email` — POST (maxDuration: 60)

**Purpose:** Generate contextual sales email with deal context and rep voice.

**Request:** `{ type?, dealId?, accountId?, contactId?, memberId, rawQuery?, additionalContext? }`

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 1000, non-streaming
- System prompt: ~2,000-4,000 chars (dynamic) — writing style, guardrails, team intel, directives
- Response JSON: `{ subject, body, to, notes_for_rep }`

**Response:** `{ draft: {...}, dealId, dealName, accountName, contactName }`

---

#### `/api/agent/feedback` — POST

**Purpose:** Create feedback request from rating.

**Request:** `{ agentConfigId, rating, feedbackText?, sourceType?, tags? }`

**Flags:** `targetRoleType` hardcoded to `"ae"`. No validation on rating range.

---

#### `/api/agent/save-to-deal` — POST

**Purpose:** Save agent action as activity with 1-hour dedup window.

**Request:** `{ dealId, memberId, title, description?, fullMetadata?, activityType? }`

**Flags:** Dedup updates `createdAt` on existing activity — could mislead timeline.

---

#### `/api/analyze` — POST (maxDuration: 60)

**Purpose:** Stream transcript analysis as SSE.

**Request:** `{ transcript }` (max 100K chars)

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 4096, **streaming** (SSE)
- System prompt: ~1,350 chars — return JSON with summary, sentimentArc, keyMoments, talkRatio, riskSignals, coachingTips, dealScore
- Client accumulates streamed text and parses JSON

---

#### `/api/analyze/link` — POST

**Purpose:** Save analysis as activity, optionally trigger transcript pipeline.

**Side effect:** Fires `POST /api/transcript-pipeline` if dealId and transcriptText provided.

**Flags:**
- `companyId` accepted but unused
- Pipeline fetch is actually awaited despite comment saying "non-blocking"

---

### 2.3 Observations / Intelligence Routes

#### `/api/observations` — GET, POST (maxDuration: 30)

**GET:** List observations with optional `?observerId=` filter. No limit.

**POST Purpose:** Multi-step AI pipeline: classify → extract entities → match CRM → cluster → route → auto-create playbook ideas → process agent signals.

**Claude AI calls (2-4+ per request):**

| Call | Purpose | max_tokens | JSON try/catch | Stored In |
|------|---------|------------|----------------|-----------|
| 1. classifyWithClaude | Classify observation (9 signal types) | 1500 | NO (outer catch) | observations.aiClassification |
| 2. findMatchingCluster | Match to existing cluster | 200 | YES | observations.clusterId |
| 3. checkAndCreateCluster | Detect patterns in unclustered obs | 300 | YES | new observationClusters row |
| 4. applyAgentChange | Suggest agent config changes (per AE) | 500 | YES | agentConfigs.outputPreferences |

**JSONB shapes written:**
- `observations.aiClassification`: `{ signals[], sentiment, urgency, sensitivity?, entities[], linked_accounts[], linked_deals[], needs_clarification? }`
- `observations.aiGiveback`: `{ acknowledgment, related_observations_hint, routing, arr_impact? }`
- `observations.sourceContext`: passthrough from request
- `observations.arrImpact`: `{ total_value, deal_count, deals[] }`
- `observations.extractedEntities`: array from Claude
- `observationClusters.unstructuredQuotes`: `[{ quote, role, vertical, date }]`

**Flags:**
- Call 1 `JSON.parse` has NO try/catch — relies on outer catch with `fallbackClassify`
- maxDuration=30 is tight for 2-4+ serial Claude calls
- Agent change call can loop N times for cross_agent signals (once per AE in vertical)
- Reads ALL companies with no filter

---

#### `/api/observations/[id]/follow-up` — POST

**Purpose:** Process follow-up response, update structured data, recalculate cluster ARR.

**Writes:** observations UPDATE, observationClusters UPDATE, notifications INSERT.

---

#### `/api/observations/clusters` — GET

Simple: all clusters by `lastObserved` desc. No limit.

---

#### `/api/observation-routing` — GET, PATCH

**GET:** Routing records by function/member with joins. Limit 50.
**PATCH:** Blind status update — no existence check, always returns success.

---

#### `/api/intelligence/agent-patterns` — GET (maxDuration: 30)

Reads patterns from Rivet `intelligenceCoordinator` actor via RPC. Returns empty on error.

---

#### `/api/field-queries` — GET, POST (maxDuration: 30)

**GET:** List queries for manager (by `initiatedBy`) or pending questions for AE (by `targetMemberId`). Side effect: expires old questions on GET.

**POST:** Create field query. Two paths:

*Org-wide path:* analyzeQuery (Claude) → distribute questions to AEs (Claude per AE). Up to 9 Claude calls.

*Deal-scoped path:* single Claude call with deal context, response parsed via string matching (not JSON).

**Claude calls (org-wide):**
| Call | Purpose | max_tokens | JSON try/catch |
|------|---------|------------|----------------|
| analyzeQuery | Determine data gaps | 1024 | NO (outer catch) |
| generateQuestion (xN) | Per-AE question | 256 | NO (per-AE catch) |

**Claude calls (deal-scoped):**
| Call | Purpose | max_tokens | Response format |
|------|---------|------------|-----------------|
| inline | Answer from deal data | 600 | Plain text (string match) |

**Flags:**
- maxDuration=30 for up to 9 serial Claude calls — high timeout risk
- N+1 queries in AE loop
- Side effect on GET (expires questions)
- Deal-scoped path uses raw SQL subqueries

---

#### `/api/field-queries/respond` — POST (maxDuration: 30)

**Purpose:** Process AE response, generate give-back insight, update aggregated answer.

**Claude calls:** 2 (generateGiveBack + updateAggregatedAnswer)

**Writes:** activities INSERT, observations INSERT, fieldQueryQuestions UPDATE, fieldQueries UPDATE.

**JSONB written:**
- `fieldQueryQuestions.giveBack`: `{ insight, source }`
- `fieldQueryQuestions.recordsUpdated`: `{ deal_updates[], observation_id }`
- `fieldQueries.aggregatedAnswer`: `{ summary, response_count, target_count, updated_at }`

---

#### `/api/field-queries/suggestions` — GET

Simple: top 10 clusters → 3 suggested questions. Pure read-only.

---

### 2.4 Post-Sale / Customer Routes

#### `/api/book` — GET

**Purpose:** AE's full book of post-close accounts with health, messages, priority scores.

**Request:** `?aeId=<uuid>`

**Database reads:** deals + companies + accountHealth (joined), ALL customerMessages (filtered in JS).

**Flags:**
- Fetches ALL customerMessages then filters in JS — could use SQL `inArray()` instead
- Complex priority scoring formula inline

---

#### `/api/customer/response-kit` — POST (maxDuration: 60)

**Purpose:** Generate/return cached AI response kit for customer message.

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 2048, non-streaming
- System prompt: ~1,478 chars — actionable response kit with similar resolutions
- Response JSON: `{ message_analysis, similar_resolutions[], recommended_resources[], draft_reply, internal_notes }`
- JSON.parse: YES try/catch
- Stored in: `customerMessages.responseKit` (JSONB)

**Flags:**
- Dead query: `recentObs` fetched but never used
- `knowledgeArticles` full table scan filtered in JS

---

#### `/api/customer/qbr-prep` — POST (maxDuration: 60)

**Purpose:** Generate QBR agenda from client-provided context (no DB query).

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 2048, non-streaming
- System prompt: ~771 chars
- Response JSON: `{ qbr_type, title, executive_summary, agenda_items[], stakeholder_strategy, risk_to_address, success_metric }`
- JSON.parse: NO specific try/catch (outer catch only)

---

#### `/api/customer/outreach-email` — POST (maxDuration: 60)

**Purpose:** Generate proactive outreach email (use-case check-in or signal-triggered).

**Claude AI call:**
- Model: `claude-sonnet-4-20250514`, max_tokens: 1024, non-streaming
- System prompt: ~450-837 chars depending on type
- Response JSON: `{ subject, body, purpose_notes|signal_notes }`
- JSON.parse: NO specific try/catch

**Flags:**
- Hardcoded sign-off "Sarah" in both prompt variants — not parameterized per AE

---

### 2.5 Deal Fitness / Playbook Routes

#### `/api/deal-fitness` — GET

**Purpose:** Portfolio view (all deals with scores) or single-deal drill-down.

**Request:** Optional `?dealId=<uuid>`.

**Flags:**
- Column typo `readnessFitDetected` propagates to API response
- Portfolio sorts in JS

---

#### `/api/playbook/ideas/[id]` — PATCH

**Purpose:** Update experiment status with validated state transitions.

**Writes:** `playbookIdeas` UPDATE, `observations` INSERT (on graduation).

**JSONB written on graduation:**
- `observations.aiClassification`: `{ signals: [{ type: "process_innovation", confidence: 0.95 }], ... }`
- `observations.extractedEntities`: `{}` (empty object — SHAPE DRIFT from array expected elsewhere)

---

### 2.6 Infrastructure Routes

#### `/api/rivet/[...all]` — ALL (maxDuration: 300)

Thin passthrough to Rivet runtime via `toNextHandler(registry)`.

---

#### `/api/transcript-pipeline` — POST (maxDuration: 300)

**Purpose:** Gather deal context and enqueue work to Rivet `transcriptPipeline` actor.

**Database reads:** 6 sequential queries (deals, meddpiccFields, contacts, agentConfigs, playbookIdeas, teamMembers).

**Side effects:** Rivet actor `transcriptPipeline.send("process", ...)` which internally calls:
- `/api/deals/[id]/meddpicc-update`
- `/api/observations` (POST)
- `/api/agent/call-prep`
- `/api/deals/[id]/update`

**Flags:**
- 6 sequential queries not parallelized
- Fire-and-forget to actor — no confirmation of work pickup
- Different env var chains for `appUrl` vs `rivetEndpoint`

---

#### `/api/demo/reset` — POST (maxDuration: 300)

**Purpose:** Reset all demo data to clean seed state.

**Operations in order:**
1. customerMessages UPDATE (reset status)
2. observationRouting DELETE (pipeline-created)
3. observations DELETE (pipeline-created)
4. observationClusters UPDATE (recalculate counts) + DELETE (orphaned)
5. fieldQueryQuestions DELETE (< 4h old)
6. fieldQueries DELETE (< 4h old)
7. activities DELETE (13 ILIKE patterns)
8. dealStageHistory DELETE (full wipe)
9. meddpiccFields DELETE (full wipe) + INSERT (re-seed 4 deals)
10. deals UPDATE (reset MedVista to discovery, reset probabilities, reset close dates)
11. playbookIdeas DELETE (full wipe) + INSERT (8 experiments + lifecycle data)
12. notifications UPDATE (mark all unread)
13. Rivet: destroy all dealAgent + transcriptPipeline + intelligenceCoordinator actors

**Flags:**
- All SQL via raw `db.execute(sql...)` — no type safety
- Contains DDL: `ALTER TABLE playbook_ideas ADD COLUMN IF NOT EXISTS experiment_evidence jsonb`
- Broad ILIKE patterns could match unintended activities
- Actor destruction iterates all deals sequentially

---

## Section 3: Claude AI Call Inventory

| # | Route | Call Purpose | System Prompt Summary | Max Tokens | Streaming | Response Format | JSON try/catch | Stored in JSONB |
|---|-------|-------------|----------------------|------------|-----------|-----------------|----------------|-----------------|
| 1 | /api/deals/close-analysis | Close/loss analysis | Analyze deal, produce factors w/ evidence (~1600ch) | 2000 | No | JSON | YES | No (client passes to /deals/stage → deals.closeAiAnalysis) |
| 2 | /api/agent/call-prep | Call brief generation | 8-layer intelligence synthesis (~4000-8000ch dynamic) | 3000 | No | JSON | Outer catch | No |
| 3 | /api/agent/configure (POST) | Interpret config instruction | Conservative config change interpreter (~1100ch) | 2048 | No | JSON | Outer catch | No (PUT stores outputPreferences) |
| 4 | /api/agent/draft-email | Email draft generation | Rep voice + team intel + directives (~2000-4000ch) | 1000 | No | JSON | Outer catch | No |
| 5 | /api/analyze | Transcript analysis | Elite sales coach, structured analysis (~1350ch) | 4096 | YES | JSON (streamed) | Client-side | No |
| 6 | /api/observations (classify) | Observation classification | 9 signal types, entity extraction (~3100ch) | 1500 | No | JSON | NO (outer catch) | observations.aiClassification |
| 7 | /api/observations (cluster match) | Match to existing cluster | Semantic cluster matching (~290ch) | 200 | No | JSON | YES | observations.clusterId |
| 8 | /api/observations (cluster create) | Detect patterns | Pattern detection in unclustered obs (~310ch) | 300 | No | JSON | YES | new observationClusters row |
| 9 | /api/observations (agent change) | Config change suggestion | Agent config updates (~475ch) | 500 | No | JSON | YES | agentConfigs.outputPreferences |
| 10 | /api/field-queries (analyzeQuery) | Determine data gaps | Analyze question against CRM data (~670ch) | 1024 | No | JSON | NO (outer catch) | fieldQueries.aiAnalysis |
| 11 | /api/field-queries (generateQuestion) | Per-AE question | Personalize question for AE (~350ch) | 256 | No | JSON | NO (per-AE catch) | fieldQueryQuestions |
| 12 | /api/field-queries (deal-scoped) | Answer from deal data | (In user msg, no system prompt) | 600 | No | Plain text | N/A | fieldQueries.aggregatedAnswer |
| 13 | /api/field-queries/respond (giveBack) | Generate give-back insight | Brief actionable insight (~365ch) | 256 | No | JSON | NO (outer catch) | fieldQueryQuestions.giveBack |
| 14 | /api/field-queries/respond (aggregate) | Synthesize responses | Aggregate field responses (~170ch) | 300 | No | Plain text | N/A | fieldQueries.aggregatedAnswer |
| 15 | /api/customer/response-kit | Generate response kit | AE assistant, 100+ accounts (~1478ch) | 2048 | No | JSON | YES | customerMessages.responseKit |
| 16 | /api/customer/qbr-prep | Generate QBR agenda | QBR preparation, products context (~771ch) | 2048 | No | JSON | NO (outer catch) | No |
| 17 | /api/customer/outreach-email | Generate outreach email | Value-focused/signal outreach (~450-837ch) | 1024 | No | JSON | NO (outer catch) | No |

**Total unique Claude call sites:** 17
**Calls that store result in JSONB:** 6 (#6, #7, #8, #9, #10, #13, #15 — 7 actually)
**Calls with proper JSON.parse try/catch:** 4 (#1, #7, #8, #9, #15)
**Calls relying on outer catch:** 9 (#2, #3, #4, #6, #10, #11, #13, #16, #17)
**Calls with no JSON parsing needed:** 2 (#12, #14 — plain text)
**Streaming calls:** 1 (#5)

---

## Section 4: JSONB Write Map

Cross-reference of JSONB columns written by API routes vs seed data shapes (from Phase 2):

| Table.Column | API Route(s) Writing | API Shape | Seed Shape | Status |
|-------------|---------------------|-----------|------------|--------|
| deals.closeAiAnalysis | /deals/stage (passthrough from client) | `{ summary, factors[], questions[], meddpicc_gaps[], stakeholder_flags[] }` | Same | MATCH |
| deals.closeFactors | /deals/stage | `[{ id, label, category, source, confirmed, evidence, repNote }]` | Same | MATCH |
| deals.winFactors | /deals/stage | Same as closeFactors | Same | MATCH |
| activities.metadata | /deals/stage, /deals/[id]/meddpicc-update, /agent/save-to-deal, /analyze/link, /field-queries/respond | Polymorphic (varies by activityType) | Polymorphic | MATCH (both are polymorphic by design) |
| observations.aiClassification | /observations POST (Claude), /deals/stage (inline), /playbook/ideas/[id] (graduation) | `{ signals[], sentiment, urgency, ...entities, linked_accounts, linked_deals }` | Same | **DRIFT** — playbook writes `{ signals: [...], scope, urgency, impact_severity, source }` (different keys) |
| observations.aiGiveback | /observations POST | `{ acknowledgment, related_observations_hint, routing, arr_impact? }` | Same | MATCH |
| observations.sourceContext | /observations POST, /deals/stage, /field-queries/respond | `{ page?, trigger, transcriptId?, signalType?, dealId? }` | `{ page: "manual", trigger: "manual" }` | MATCH (API is superset) |
| observations.arrImpact | /observations POST, /observations/[id]/follow-up | `{ total_value, deal_count, deals[] }` | Same | MATCH |
| observations.lifecycleEvents | /observations POST, /observations/[id]/follow-up, /field-queries/respond | `[{ status, timestamp }]` | Same | MATCH |
| observations.structuredData | /observations/[id]/follow-up | `{ scope?, frequency?, confidence?, source?, impact_severity?, affected_deal_ids? }` | Similar | MATCH |
| observations.extractedEntities | /observations POST (Claude array), /playbook/ideas/[id] (empty `{}`) | Array OR empty object | Seed: not populated | **DRIFT** — array vs `{}` |
| observationClusters.unstructuredQuotes | /observations POST | `[{ quote, role, vertical, date }]` | Same | MATCH |
| agentConfigs.outputPreferences | /agent/configure PUT, /observations POST (agent change) | Config object with industryFocus, guardrails, etc. | Same base shape | MATCH |
| agentConfigVersions.outputPreferences | /agent/configure PUT, /observations POST | Normal config OR `{ crossAgentUpdate: true, fromUser, fromRole }` | Same | **DRIFT** — cross-agent updates use different shape |
| fieldQueries.aiAnalysis | /field-queries POST | `{ can_answer_now, immediate_answer, confidence, data_gaps[], needs_input_from }` | Same | MATCH |
| fieldQueries.aggregatedAnswer | /field-queries POST, /field-queries/respond | `{ summary, response_count, target_count, key_findings?, answered_from_data?, updated_at }` | Same base | MATCH |
| fieldQueryQuestions.giveBack | /field-queries/respond | `{ insight, source }` | Same | MATCH |
| fieldQueryQuestions.recordsUpdated | /field-queries/respond | `{ deal_updates[], observation_id }` | Same | MATCH |
| meddpiccFields (confidence+text) | /deals/[id]/meddpicc-update | Individual columns (not JSONB) | N/A | N/A |
| customerMessages.responseKit | /customer/response-kit | `{ message_analysis, similar_resolutions[], recommended_resources[], draft_reply, internal_notes }` | Same | MATCH |

**Confirmed API-side shape drift: 3 columns**
1. `observations.aiClassification` — playbook graduation writes different keys than observation pipeline
2. `observations.extractedEntities` — playbook writes `{}` (object), observation pipeline writes array
3. `agentConfigVersions.outputPreferences` — cross-agent updates write `{ crossAgentUpdate: true }` shape

---

## Section 5: Route Health Flags

### 1. Dead Routes (never called from frontend .tsx files)

| Route | Called From | Status |
|-------|------------|--------|
| `/api/activities` | Not from .tsx; server component in command-center/page.tsx queries DB directly | **DEAD API ROUTE** — server component bypasses it |
| `/api/team-members` | Not from .tsx; server component in layout.tsx queries DB directly | **DEAD API ROUTE** — server component bypasses it |
| `/api/observations/clusters` | Not from .tsx; intelligence-client.tsx does NOT call this API | **DEAD API ROUTE** |
| `/api/observation-routing` | Not from .tsx; called only from observation-input.tsx indirectly? | UNVERIFIED |
| `/api/deals/[id]/meddpicc-update` | Called by Rivet pipeline actor only | **Internal only** — not dead, but not client-facing |

### 2. Missing Error Handling

Routes with no try-catch around main logic:
- `/api/deals` (GET)
- `/api/deals/resolve` (POST)
- `/api/deals/[id]/meddpicc` (GET)
- `/api/deals/[id]/meddpicc-update` (PATCH) — partial
- `/api/deals/[id]/update` (PATCH)
- `/api/companies` (GET)
- `/api/team-members` (GET)
- `/api/activities` (GET)
- `/api/notifications` (GET)

### 3. Inconsistent Response Shapes

- `/api/deals/close-analysis` returns 200 with empty fallback on error (not 500)
- `/api/field-queries` returns different shapes for `targetMemberId` vs `initiatedBy` query paths
- `/api/observation-routing` PATCH returns `{ success: true }` even if the record doesn't exist

### 4. Hardcoded Data

- `/api/customer/outreach-email` — hardcoded sign-off "Sarah" in system prompts
- `/api/agent/feedback` — `targetRoleType` hardcoded to "ae"
- `/api/deals/close-analysis` — currency hardcoded as EUR

### 5. Missing maxDuration on Claude-Calling Routes

All Claude-calling routes have maxDuration set. However:
- `/api/agent/configure` has no maxDuration but calls Claude (POST handler) — will use Vercel default
- `/api/agent/feedback` has no maxDuration but doesn't call Claude, so this is fine

### 6. Prompt Injection Risk

Routes that pass raw user input into Claude prompts:
- `/api/observations` POST — `rawInput` goes directly into Claude system prompt
- `/api/agent/call-prep` — `rawQuery` and `prepContext` go into prompt
- `/api/agent/draft-email` — `rawQuery` and `additionalContext` go into prompt
- `/api/agent/configure` — `instruction` goes into prompt
- `/api/analyze` — full `transcript` goes as user message
- `/api/field-queries` — `rawQuestion` goes into prompt
- `/api/customer/qbr-prep` — `accountContext` object stringified into prompt

All of these are acceptable for a demo app with no public access.

---

## Section 6: Route Dependency Graph

```
/api/analyze/link
  └──▶ POST /api/transcript-pipeline (fire-and-forget)

/api/transcript-pipeline
  └──▶ Rivet: transcriptPipeline.send("process", ...)
        └──▶ (inside actor):
             ├── POST /api/deals/[id]/meddpicc-update
             ├── POST /api/observations
             ├── POST /api/agent/call-prep
             └── PATCH /api/deals/[id]/update

/api/demo/reset
  └──▶ Rivet: destroy dealAgent, transcriptPipeline, intelligenceCoordinator actors

/api/intelligence/agent-patterns
  └──▶ Rivet RPC: intelligenceCoordinator.getPatterns()

/api/agent/call-prep
  └──▶ Rivet RPC: dealAgent.getMemoryForPrompt()
```

Key observation: the transcript pipeline is the deepest call chain — `analyze/link` → `transcript-pipeline` → Rivet actor → 4 internal API calls. Total chain depth: 5 hops.

---

## Section 7: Summary Statistics

| Metric | Count |
|--------|-------|
| Total API routes | 35 |
| Routes that call Claude | 11 |
| Total Claude call sites | 17 |
| Streaming Claude calls | 1 |
| Routes with JSONB writes | 12 |
| JSONB columns with confirmed API-side shape drift | 3 |
| Routes with no error handling | 9 |
| Dead routes (exist but frontend bypasses) | 3 (activities, team-members, observations/clusters) |
| Internal-only routes (called by actors, not frontend) | 2 (meddpicc-update, observation-routing) |
| Routes with hardcoded data | 3 |
| Routes with prompt injection surface | 7 (acceptable for demo) |
| Routes calling other routes internally | 2 (analyze/link, transcript-pipeline) |
| Max route call chain depth | 5 hops |
| JSON.parse with proper try/catch | 4 of 15 JSON-returning Claude calls |
| JSON.parse relying on outer catch | 9 of 15 |

---

## Section 8: Files Phase 4 Should Read

Phase 4 (Rivet Actor Inventory) should focus on:

### Actor Files (primary)
1. `apps/web/src/actors/deal-agent.ts` — Deal agent state, actions, health checks, interventions
2. `apps/web/src/actors/transcript-pipeline.ts` — Workflow actor with parallel Claude calls, most complex actor
3. `apps/web/src/actors/intelligence-coordinator.ts` — Cross-deal pattern detection with Claude
4. `apps/web/src/actors/registry.ts` — Actor registration

### Routes That Interact With Actors
5. `apps/web/src/app/api/rivet/[...all]/route.ts` — Handler configuration
6. `apps/web/src/app/api/transcript-pipeline/route.ts` — Context gathering before actor enqueue
7. `apps/web/src/app/api/agent/call-prep/route.ts` — Rivet RPC to dealAgent.getMemoryForPrompt()
8. `apps/web/src/app/api/intelligence/agent-patterns/route.ts` — Rivet RPC to intelligenceCoordinator
9. `apps/web/src/app/api/demo/reset/route.ts` — Actor destruction logic

### Client Components Using Rivet
10. `apps/web/src/lib/rivet.ts` — Client-side Rivet setup
11. `apps/web/src/components/agent-memory.tsx` — Deal agent memory display
12. `apps/web/src/components/workflow-tracker.tsx` — Pipeline progress tracker
13. `apps/web/src/components/agent-intervention.tsx` — Proactive intervention UI
14. `apps/web/src/app/(dashboard)/pipeline/[id]/deal-detail-client.tsx` — Subscribes to briefReady, triggers pipeline

### Routes Called BY Actors (internal API)
15. `apps/web/src/app/api/deals/[id]/meddpicc-update/route.ts` — Called by pipeline
16. `apps/web/src/app/api/observations/route.ts` — Called by pipeline
17. `apps/web/src/app/api/agent/call-prep/route.ts` — Called by pipeline
18. `apps/web/src/app/api/deals/[id]/update/route.ts` — Called by pipeline

# Phase 6: Data Flow Tracing — Observations, Experiments, Intelligence

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1-5 audit results

---

## Section 1: Observations System

### 1a. Observation Creation Flow

Observations enter through **two primary paths** and **one secondary path**:

#### Path 1: Manual Input (Agent Bar)

**Component:** `components/observation-input.tsx` (~1800 lines)
**Pages where present:**
- `components/layout-agent-bar.tsx` (line 60) — global agent bar on all dashboard pages via layout wrapper
- `app/(dashboard)/analyze/page.tsx` (line 370) — inline on analyze page

The ObservationInput component detects user intent and routes accordingly:
- **Observation intent** → POST `/api/observations`
- **Quick answer intent** (detects "what's", "how's", "status", "where is") → POST `/api/field-queries`
- **Call prep intent** → POST `/api/agent/call-prep`
- **Email draft intent** → POST `/api/agent/draft-email`

**Request body shape (observation path):**
```json
{
  "rawInput": "string",
  "context": {
    "page": "pipeline" | "deal_detail" | "intelligence" | "analyze",
    "dealId": "uuid (optional)",
    "accountId": "uuid (optional)",
    "trigger": "manual",
    "transcriptId": "uuid (optional)",
    "signalType": "string (optional)",
    "vertical": "string (optional)"
  },
  "observerId": "uuid"
}
```

#### Path 2: Auto-Generated from Transcript Pipeline

**Source:** transcript-pipeline actor, step 4 (create-signal-observations)
**Trigger:** Pipeline detects signals in call transcript via Claude analysis

The pipeline creates observations by POSTing to `/api/observations` with:
```json
{
  "rawInput": "signal description text",
  "context": {
    "page": "pipeline",
    "trigger": "transcript_pipeline",
    "transcriptId": "uuid",
    "dealId": "uuid",
    "signalType": "competitive_intel | process_friction | etc.",
    "vertical": "string",
    "sourceSpeaker": "contact name"
  },
  "observerId": "uuid (AE who owns the deal)"
}
```

**Deduplication logic (route.ts lines 71-90):** Only active for transcript pipeline signals. Checks composite key: `observerId + transcriptId + signalType + dealId`. If found, returns `{ id, duplicate: true }` without re-processing.

#### Path 3: Field Query Response Side-Effect

**Source:** `/api/field-queries/respond` (respond/route.ts lines 104-124)
**Trigger:** When an AE answers a field query question

Creates observation with:
```json
{
  "rawInput": "[Field Query Response] Q: ... A: ...",
  "sourceContext": { "page": "field_query", "dealId": "uuid", "trigger": "field_query_response" },
  "status": "classified",
  "lifecycleEvents": [{ "status": "submitted" }, { "status": "classified" }]
}
```

**Note:** This observation is inserted directly into the DB — it does NOT go through the full classification pipeline (no Claude call, no clustering, no routing). It's a bare insert.

---

### 1b. Observation Classification

**Function:** `classifyWithClaude()` — route.ts lines 332-457
**Model:** `claude-sonnet-4-20250514`, max_tokens: 1500

**What the AI classifies:**
- **Signal type** (one of 9): competitive_intel, content_gap, deal_blocker, win_pattern, process_friction, agent_tuning, cross_agent, field_intelligence, process_innovation
- **Confidence** per signal (0-1 float)
- **Sentiment:** positive / negative / neutral / frustrated
- **Urgency:** low / medium / high / critical
- **Sensitivity:** normal / political / personnel
- **Entities:** array of { type, text, normalized, confidence, match_hint }
- **Linked accounts/deals:** array of { name, confidence }
- **Follow-up decision:** should_ask (boolean), question (string), chips (string[]), clarifies (scope/source/impact/frequency/deal_context)

**Prompt context includes:** observer name/role/vertical, rep's 4 current deals by value, all known accounts, raw observation text.

**Classification result stored as:** `observations.aiClassification` (jsonb)

**Double classification issue (flagged in Phase 5):**
The transcript pipeline classifies signals in step 3 (Detect Signals) using its own Claude call. Then when creating observations via POST `/api/observations`, the observation route runs `classifyWithClaude()` AGAIN on the same signal text. This means:
- **2 Claude calls per pipeline signal** (wasteful)
- **Potential inconsistency** — pipeline classification may differ from observation classification
- The pipeline's classification determines what signals get sent; the observation route's classification determines routing and clustering
- Pipeline passes `signalType` in sourceContext, but the observation route ignores it and re-classifies from scratch

---

### 1c. Observation Clustering

**Two clustering mechanisms run sequentially on every observation creation:**

#### Mechanism 1: Match Existing Cluster

**Function:** `findMatchingCluster()` — route.ts lines 595-657
**Model:** `claude-sonnet-4-20250514`, max_tokens: 200

**How it works:**
1. Fetch all active (non-resolved) clusters from `observationClusters`
2. Build cluster descriptions: `"ID: {id} | "{title}" | Type: {type} | {summary} | Samples: "{quote1}", "{quote2}"`
3. Call Claude: "Match new observation to a cluster. Return `{ cluster_id, confidence }`. Reject if confidence < 0.6."
4. **Confidence threshold: 0.6** — conservative, most observations don't match
5. **Fallback (no API key):** Match signal type exactly + keyword overlap (≥2 words ≥4 chars)

**If matched:** Update cluster counts via `updateClusterCounts()` (route.ts lines 670-681):
- Increment `observationCount`, `observerCount`
- Update `lastObserved`
- Escalate severity: "critical" if ≥4 obs + ≥3 observers, "concerning" if ≥3 obs + ≥2 observers

#### Mechanism 2: Auto-Create New Cluster

**Function:** `checkAndCreateCluster()` — route.ts lines 737-815
**Trigger:** Only if Mechanism 1 returns no match
**Model:** `claude-sonnet-4-20250514`, max_tokens: 300

**How it works:**
1. Query unclustered observations from last 30 days (limit 30)
2. Call Claude: "Find which observations are about the SAME topic. Return `{ matching_ids[], pattern_title, pattern_description }`"
3. If `matching_ids.length >= 1`: create new cluster
4. **Fallback:** keyword-based grouping (≥2 shared 4+ char words)

**New cluster shape:**
```json
{
  "title": "pattern_title or template",
  "summary": "pattern_description",
  "signalType": "from primary signal",
  "targetFunction": "from SIGNAL_ROUTES map",
  "observationCount": "N",
  "observerCount": "unique observer count",
  "severity": "critical | concerning | notable",
  "resolutionStatus": "emerging",
  "unstructuredQuotes": [{ "quote", "role", "vertical", "date" }],
  "structuredSummary": { "competitor_name", "content_type", "process_name" }
}
```

**Where clusters are displayed:**
- Intelligence dashboard → Patterns tab (via GET `/api/observations/clusters`)
- Ordered by `lastObserved` DESC
- Filtered by signal type in the UI
- Expandable cards show analytics, field voices (quotes), resolution status

**Is clustering working end-to-end?** Yes — both seed data clusters and live-created clusters appear. The pipeline creates observations → observations create/update clusters → clusters display on intelligence page. However, the 0.6 confidence threshold is conservative, meaning many observations stay unclustered.

---

### 1d. Observation Routing

**Trigger:** During observation creation, after classification and clustering
**Location:** route.ts lines 710-731

**Signal type → support function mapping:**
```
content_gap       → enablement
win_pattern       → enablement
competitive_intel → product_marketing
field_intelligence → product_marketing
process_friction  → deal_desk
deal_blocker      → deal_desk
```
(agent_tuning, cross_agent, and process_innovation have special handling, not routed)

**Routing record shape (INSERT into `observationRouting`):**
```json
{
  "observationId": "uuid",
  "targetFunction": "enablement | product_marketing | deal_desk",
  "targetMemberId": "uuid (from supportFunctionMembers lookup)",
  "signalType": "string",
  "status": "sent"
}
```

**Routing lifecycle:**
- `sent` → `acknowledged` (sets `acknowledgedAt`) → `in_progress` → `resolved` (sets `resolvedAt`)
- Status transitions via PATCH `/api/observation-routing`
- No validation that transitions are sequential (can jump from sent → resolved)

**Where routing appears in UI:**
- Intelligence dashboard uses `acknowledgedAt` to calculate average response time metric
- GET `/api/observation-routing` with `targetFunction` or `targetMemberId` returns up to 50 records
- **Gap:** No dedicated UI for support function members to view/manage their routed observations. The API exists but no component consumes it in a support-function-specific view.

**Can support functions respond/acknowledge?**
- API supports it (PATCH endpoint exists)
- No visible UI for support function personas to acknowledge/resolve routings
- The intelligence-client.tsx does not render a routing management panel for support roles

---

### 1e. Follow-up Flow

**Route:** POST `/api/observations/[id]/follow-up`
**Trigger:** When Claude decides a follow-up question is needed during classification (`follow_up.should_ask === true`)

**How it works:**
1. Classification returns: `{ should_ask: true, question: "...", chips: ["opt1", "opt2"], clarifies: "scope" }`
2. UI shows follow-up question with chip buttons + free text input
3. User responds → POST with `{ responseText, responseSource: "chip"|"text", selectedChip? }`

**Follow-up processing (route.ts lines 45-272):**
1. Determine which field this clarifies from question text:
   - "hear"/"source" → clarifies "source"
   - "severe"/"blocking"/"impact" → clarifies "impact"
   - "often"/"frequent" → clarifies "frequency"
   - else → clarifies "scope"
2. Map chip response to structured data via CHIP_TO_STRUCTURED mapping (lines 9-43):
   - Scope chips: "Just this deal" → `{ scope: "this_deal" }`, "Across the vertical" → `{ scope: "whole_vertical" }`
   - Impact chips: "Deal-blocking" → `{ impact_severity: "blocking" }`
   - etc.
3. Calculate ARR impact from linked deals
4. UPDATE observation: `followUpResponse`, `structuredData`, `arrImpact`, `status → "routed"`, append lifecycle events
5. If scope is broader than "this_deal": fire notification chains to team members in same vertical

**Where follow-up appears in UI:**
- ObservationInput component transitions to "follow_up" phase after initial submission
- Shows question, chip options, free text fallback
- After response: shows enhanced give-back with ARR impact

**Does follow-up feed back into anything?**
- YES: Updates observation status to "routed"
- YES: Recalculates cluster ARR if clustered
- YES: Fires notification chains if scope is broader than this_deal
- NO: Does not re-trigger classification or re-cluster

---

### 1f. Observation Lifecycle Gaps

| Step | Status | Notes |
|------|--------|-------|
| **CREATE** | WORKING | Manual (agent bar), pipeline (auto), field query (side-effect) |
| **STORE** | WORKING | observations table, full JSONB shapes |
| **CLASSIFY** | WORKING but REDUNDANT | Double classification for pipeline signals |
| **CLUSTER** | WORKING | Both match-existing and auto-create paths |
| **ROUTE** | PARTIALLY WORKING | Records created, but no UI for support functions to manage them |
| **RETRIEVE** | WORKING | GET /api/observations returns all with observer names |
| **RENDER** | WORKING | Intelligence page Field Feed tab, cluster cards on Patterns tab |
| **UPDATE** | PARTIALLY WORKING | Follow-up updates observation; routing status updatable via API but no UI |
| **DELETE** | NOT IMPLEMENTED | No delete capability. Observations persist forever. Resolved clusters are filtered from display but never deleted |

**Key gaps:**
1. No support function UI for routing management
2. Field query response observations skip classification/clustering/routing (bare insert)
3. Double classification for pipeline signals (wasteful, potentially inconsistent)
4. No observation deletion or archival
5. Dedup only works for transcript pipeline path — manual duplicates possible

---

## Section 2: Playbook/Experiments System

### 2a. Experiment Data Model

**Primary table:** `playbookIdeas`

**Core fields:**
- `id` (UUID PK), `originatorId` (FK teamMembers), `originatedFrom` (text: observation/close_analysis/manual/system_detected/cross_agent)
- `sourceObservationId` (FK observations), `title`, `hypothesis`, `category` (process/messaging/positioning/discovery/closing/engagement), `vertical`

**Lifecycle fields:**
- `status` (text, default "proposed"): proposed | testing | graduated | rejected | archived | promoted (legacy) | retired (legacy)
- `testStartDate`, `testEndDate`, `testGroupDeals[]`, `controlGroupDeals[]`
- `testGroup[]` (AE UUIDs in test), `controlGroup[]` (AE UUIDs in control)
- `successThresholds` (jsonb): `{ velocity_pct, sentiment_pts, close_rate_pct }`
- `currentMetrics` (jsonb): `{ velocity_pct, sentiment_pts, close_rate_pct, deals_tested }`
- `experimentDurationDays` (int, default 30), `experimentStart`, `experimentEnd`
- `approvedBy`, `approvedAt`, `graduatedAt`

**Results/Attribution fields:**
- `results` (jsonb, legacy): `{ stage_velocity_change, sentiment_shift, adoption_count, deals_influenced, arr_influenced, close_rate_test, close_rate_control, confidence, measurement_period_days }`
- `attribution` (jsonb): `{ proposed_by, proposed_at, approved_by, impact_arr, scaling_scope }`
- `experimentEvidence` (jsonb): `{ deals: [{ deal_name, deal_id, owner_name, owner_id, group, stage, amount, days_in_stage, avg_days_baseline, sentiment_score, avg_sentiment_baseline, evidence: [{ type, date, source, excerpt }] }] }`

**Social fields:** `followers[]` (text array), `followerCount` (int)

---

### 2b. Experiment Creation

Experiments are created through **two paths** — there is **no UI form to create experiments directly**:

#### Path 1: Auto-Created from Process Innovation Observations

**Location:** `/api/observations/route.ts` lines 287-304
**Trigger:** When observation classification includes signal type `process_innovation`

Creates:
```json
{
  "originatorId": "observer UUID",
  "originatedFrom": "observation",
  "sourceObservationId": "observation UUID",
  "title": "signal.summary || rawInput.slice(0,80)",
  "hypothesis": "rawInput",
  "category": "process",
  "vertical": "observer.verticalSpecialization",
  "status": "proposed"
}
```

#### Path 2: Seed Data / Demo Reset

**Location:** `packages/db/src/seed-data/playbook-experiments.ts` + `app/api/demo/reset/route.ts` lines 278-349
- 8 base experiments with varying statuses
- 3 testing experiments with pre-populated evidence (from `seed-data/playbook-evidence.ts`)
- 2 promoted experiments with evidence and results

**No manual UI creation path.** Users cannot propose experiments through the playbook page itself.

---

### 2c. Experiment Evidence Attribution

**How the pipeline attributes evidence (traced from Phase 5):**

1. POST `/api/transcript-pipeline` fetches active testing experiments where the AE is in testGroup (lines 91-105)
2. Passes `existingEvidence` to Rivet transcript pipeline actor (line 147-154)
3. Pipeline step 6 (check-experiments): Claude analyzes transcript for each active experiment's tactic usage
4. If evidence found, pipeline calls PATCH `/api/playbook/ideas/[id]` with `experiment_evidence` payload

**Evidence shape (live-created):**
```json
{
  "deals": [{
    "deal_name": "string",
    "deal_id": "uuid",
    "owner_name": "string",
    "owner_id": "uuid",
    "group": "test" | "control",
    "stage": "string",
    "amount": "number",
    "days_in_stage": "number",
    "avg_days_baseline": "number",
    "sentiment_score": "number",
    "avg_sentiment_baseline": "number",
    "evidence": [{ "type", "date", "source", "excerpt" }]
  }]
}
```

**Seed data vs live data shape comparison:**
- Seed evidence (playbook-evidence.ts): Full deal-level comparison data with 2-4 deals per experiment, manually crafted excerpts
- Live evidence (from pipeline): Same shape but auto-populated by Claude. Evidence excerpts are AI-extracted from transcript text
- **Shape is consistent** — no drift between seed and live evidence structures

**Where evidence is displayed:**
- Playbook page → Testing card → MetricDrillDownModal (lines 304-525)
- Shows test vs. control deal comparison
- Field evidence quotes (up to 4 most recent, sorted desc by date)
- Clickable deal links navigate to `/pipeline/{deal_id}`

---

### 2d. Experiment Lifecycle Management

**State machine (route.ts lines 9-18):**
```
proposed  → [testing, rejected]       (non-terminal)
testing   → [graduated, archived]     (non-terminal)
rejected  → []                        (TERMINAL)
graduated → []                        (TERMINAL)
archived  → []                        (TERMINAL)
promoted  → []                        (TERMINAL - legacy)
retired   → []                        (TERMINAL - legacy)
```

**API route:** PATCH `/api/playbook/ideas/[id]`

**Transition requirements:**
- **proposed → testing**: REQUIRES `test_group` (non-empty), `success_thresholds` (with values), `approved_by` (manager ID). Auto-sets: `approvedAt = now`, `experimentStart = now`, `experimentEnd = now + duration_days`
- **testing → graduated**: No explicit field validation in API. UI enforces: `thresholdsMet >= 2` AND `dealsTested >= 8`. Auto-sets: `graduatedAt = now`. **Side effect:** Creates `process_innovation` observation (route.ts lines 96-134)
- **testing → archived**: User-initiated, no special requirements
- **proposed → rejected**: Optional feedback in `results.structured_feedback`

**Is the lifecycle fully wired?** YES for the core path (proposed → testing → graduated). A manager can:
1. View proposed ideas on playbook page
2. Click "Approve & Start Testing" → select AEs, set thresholds
3. View live metrics accumulate during testing
4. Click "Graduate & Scale" when thresholds met → select scaling scope
5. See graduated play in "What's Working" tab

**Gaps:**
- No UI to archive/retire a testing experiment mid-test
- No notifications to AEs when assigned to test/control group
- No UI for AEs to follow/unfollow experiments (follower DB fields exist, buttons are display-only)
- No way to edit test group, thresholds, or duration mid-test
- "Start Test" and "Follow" buttons mentioned in CLAUDE.md as "UI-only in demo" — confirmed

---

### 2e. Experiment Display

**Playbook page has 3 tabs:**

#### Tab 1: Active Experiments
- **Proposed cards:** Title, originator, vertical, hypothesis, age. Manager sees "Approve & Start Testing" button with inline form (test group, thresholds). Non-managers see "No test data yet."
- **Testing cards:** Title, originator, days active, deals tested. Threshold progress (3 metrics: velocity, sentiment, close rate) with checkmarks. Clickable metrics open MetricDrillDownModal. Manager sees "Graduate & Scale" when thresholdsMet ≥ 2 and dealsTested ≥ 8. Confidence band based on deals_tested count.

#### Tab 2: What's Working
- **Promoted/Graduated cards:** Title, originator, vertical, hypothesis. Results metrics: velocity, sentiment, close rate, deals influenced, ARR impact. For graduated: "NOW SCALING TO" box + attribution trail. For promoted: "Now part of standard playbook."
- **Retired/Archived cards:** Title, originator, "Retired Xd ago", old metrics. Replacement reference if better variant exists.

#### Tab 3: Influence
- Per-member influence scores, attributions, experiment stats
- Not directly related to experiment lifecycle

---

### 2f. Experiment Lifecycle Gaps

| Step | Status | Notes |
|------|--------|-------|
| **CREATE** | PARTIALLY WORKING | Auto-created from process_innovation observations. No manual UI creation form |
| **STORE** | WORKING | playbookIdeas table with full schema |
| **APPROVE (proposed → testing)** | WORKING | Manager UI, inline form, PATCH API |
| **EVIDENCE COLLECTION** | WORKING | Pipeline auto-attributes evidence via PATCH |
| **METRICS UPDATE** | SEED-ONLY for demo, LIVE via pipeline | currentMetrics pre-populated in seeds; pipeline can update but metrics aren't live-calculated |
| **GRADUATION** | WORKING | Manager UI, creates observation side-effect |
| **RENDER** | WORKING | All 3 tabs render correctly per status |
| **FOLLOW/UNFOLLOW** | NOT WORKING | DB fields exist, no UI wiring |
| **ARCHIVE MID-TEST** | NOT WORKING | No UI button for testing → archived |
| **DELETE** | NOT IMPLEMENTED | No delete capability |

**Key gaps:**
1. Experiment creation requires observation classification as "process_innovation" — no other path
2. Metrics are seed data for demo; pipeline can update but no real-time aggregation
3. Follow button is UI-only (no API call)
4. Two legacy statuses (promoted, retired) create parallel taxonomy with main state machine
5. Evidence is append-only, no dedup — same transcript processed twice creates duplicate evidence
6. Graduation observation uses `extractedEntities: {}` (empty object) instead of array — shape drift

---

## Section 3: Intelligence Dashboard System

### 3a. Intelligence Data Sources

The intelligence page (`/intelligence`) fetches data from **5 server-side sources** and **3 client-side sources**:

#### Server-Side (page.tsx lines 18-79):

| Source | Query | Used For |
|--------|-------|----------|
| `observationClusters` | All, ordered by lastObserved DESC | Patterns tab cards |
| `observations` + `teamMembers` JOIN | All, ordered by createdAt DESC | Field Feed tab, metrics |
| `observationRouting` (acknowledged only) | Where acknowledgedAt IS NOT NULL | Avg response time metric |
| `deals` with closeFactors/winFactors | Where closeFactors or winFactors IS NOT NULL | Close Intelligence tab |
| `managerDirectives` (active only) | Where isActive = true | Directives section (manager-only) |

**Close Intelligence aggregation (server-side, lines 93-144):**
- For each deal with close/win factors
- Filter only `confirmed: true` factors
- Group by `factor.category`, accumulate count + totalArr
- Sort by totalArr DESC

#### Client-Side (intelligence-client.tsx):

| Source | Endpoint | Polling | Used For |
|--------|----------|---------|----------|
| Agent-detected patterns | GET `/api/intelligence/agent-patterns` | Once on mount | Patterns tab top section |
| Field query suggestions | GET `/api/field-queries/suggestions` | On expand | Ask Team input chips |
| Your queries | GET `/api/field-queries?initiatedBy={id}` | Every 30s | Query tracking section |

---

### 3b. Pattern Detection

**Two types of patterns appear on the intelligence dashboard:**

#### Type 1: Observation Clusters (from DB)
- **Detection:** AI-powered clustering in observation route (see Section 1c)
- **Rule:** Claude matches new observations to existing clusters (confidence ≥ 0.6) or auto-creates clusters from unclustered observations (≥1 match in 30-day window)
- **Displayed in:** Patterns tab, below agent-detected patterns section
- **Filterable by:** signal type (competitive_intel, content_gap, process_friction, win_pattern, process_innovation)

#### Type 2: Agent-Detected Patterns (from Coordinator Actor)
- **Detection:** Intelligence coordinator actor matches signals: 2+ of same type + same vertical + different deals
- **For competitive_intel:** Also requires matching competitor name (case-insensitive)
- **Synthesis:** Claude call (1024 max_tokens) generates 2-3 sentence synthesis + recommendations + arrImpactMultiplier
- **Push:** Synthesized patterns pushed to affected deal agents via `addCoordinatedIntel()`
- **Displayed in:** Patterns tab, top section (sparkle icon, "Agent-Detected Pattern" label)
- **Fetched from:** GET `/api/intelligence/agent-patterns` which reads coordinator actor state directly

**Key difference:** Observation clusters are persisted in DB and survive restarts. Coordinator patterns are in-memory only — destroyed on demo reset or server restart.

---

### 3c. Role-Based Views

| Element | AE/SA/BDR/CSM | MANAGER | SUPPORT |
|---------|---------------|---------|---------|
| Patterns tab (all metrics) | Yes | Yes | Yes |
| Agent-detected patterns | Yes | Yes | Yes |
| Pattern cards (clusters) | Yes | Yes | Yes |
| Field Feed tab | Yes | Yes | Yes (observer names anonymized) |
| Close Intelligence tab | Yes | Yes | Yes |
| AE Impact Card | Yes | No | No |
| Ask Team Input | No | Yes | Yes |
| Your Queries | No | Yes | Yes |
| Directives Section | No | Yes (only) | No |

**Default signal filter by role:**
- SUPPORT + enablement specialization → "content_gap" (includes win_pattern)
- SUPPORT + product_marketing → "competitive_intel"
- SUPPORT + deal_desk → "process_friction" (includes deal_blocker)
- All others → "all"

**SUPPORT anonymization:** In Field Feed, observer name is replaced with "{ROLE}, {vertical}" to protect rep identity. Observer role badge is hidden.

**Is role switching wired?** Yes — PersonaContext provider switches role, and intelligence-client.tsx reads `currentUser?.role` to conditionally render sections. Switching personas shows/hides the appropriate sections.

---

### 3d. Intelligence Coordinator Integration

**Full flow: coordinator → API → dashboard component:**

1. Pipeline step 8 sends signals to coordinator via RPC (`receiveSignal`)
2. Coordinator detects pattern when 2+ signals match (same type + vertical + different deals)
3. Pattern scheduled for synthesis after 3 seconds (`c.schedule.after(3000)`)
4. Claude synthesizes: `{ synthesis, recommendations, arrImpactMultiplier }`
5. Coordinator pushes to affected deal agents via `addCoordinatedIntel()`
6. Pattern stored in coordinator state with `pushStatus: "pushed"`
7. GET `/api/intelligence/agent-patterns` reads coordinator's `getPatterns()` action
8. intelligence-client.tsx fetches patterns on mount (line 196-200)
9. Renders only patterns with `.synthesis` populated (line 289)

**Pattern card shows:** Signal type badge, vertical, competitor (if competitive_intel), synthesis text, deal name pills, recommendations bullet list, detection timestamp.

**Is this working end-to-end?** YES, but with caveats:
- Patterns are in-memory only — lost on demo reset/server restart
- No polling on the UI — patterns fetched once on mount, won't auto-update
- If coordinator synthesis fails (Claude API error), `pushStatus = "failed"` and pattern appears without synthesis (filtered from display)
- After demo reset, intelligence page shows no agent patterns until pipelines are re-run on 2+ deals

---

### 3e. Intelligence Lifecycle Gaps

| Step | Status | Notes |
|------|--------|-------|
| **CREATE (clusters)** | WORKING | Auto-created from observation clustering |
| **CREATE (coordinator patterns)** | WORKING | Auto-detected from pipeline signals |
| **STORE (clusters)** | WORKING | Persisted in observationClusters table |
| **STORE (coordinator patterns)** | IN-MEMORY ONLY | Lost on reset/restart |
| **RETRIEVE** | WORKING | Server queries + client fetch |
| **RENDER (Patterns tab)** | WORKING | Both cluster cards and agent-detected cards |
| **RENDER (Field Feed)** | WORKING | All observations with classification badges |
| **RENDER (Close Intelligence)** | WORKING | Aggregated loss/win factors |
| **UPDATE (clusters)** | PARTIALLY WORKING | Counts/severity update automatically; resolution status updatable via API but no UI |
| **UPDATE (coordinator patterns)** | WORKING | Patterns updated in-place as new signals arrive |
| **RESOLVE/CLOSE** | NOT IMPLEMENTED | No UI to mark clusters or patterns as resolved |
| **DELETE** | NOT IMPLEMENTED | No deletion capability |

**Key gaps:**
1. Coordinator patterns not persisted to DB — lost on restart
2. No real-time updates on intelligence page (no WebSocket/polling for patterns or observations)
3. No UI for cluster resolution management
4. Close Intelligence is seed-data dependent (requires deals closed with factors)
5. Average response time metric only counts acknowledged routings (survival bias)

---

## Section 4: Field Queries System

### 4a. Field Query Flow

**Complete lifecycle:**

#### Creation (3 entry points):

1. **Manager on deal detail page** → DealQuestionInput component → POST `/api/field-queries` with `dealId`
   - Uses `handleDealScopedQuery()`: fetches deal context (MEDDPICC, contacts, activities, observations, cross-agent feedback), Claude answers from data, optionally sends question to deal's AE

2. **Manager/support on intelligence page** → ObservationInput detects "quick_answer" intent → POST `/api/field-queries`
   - Uses full `analyzeQuery()` path: gathers 4 context sources (clusters, observations, open deals, closed deals), Claude determines if answerable from data or needs rep input

3. **Manager/support on intelligence page** → "Ask Team" input → POST `/api/field-queries`
   - Same full path as #2, with optional `clusterId` link

**No role-based access control on the API.** Any UUID can be passed as `initiatedBy`.

#### Distribution:

When Claude determines rep input needed:
1. Build target deal set from AI-suggested deal IDs + cluster observations + text search + keyword match
2. Group by AE, pick highest-value deal per AE
3. **Rate limit:** Max 3 pending questions per AE (route.ts lines 370-379)
4. For each AE: generate personalized question + chips via Claude (`generateQuestion()`, max_tokens: 256)
5. INSERT `fieldQueryQuestions` with: targetMemberId, questionText, chips[], dealId, accountId, status "pending"

#### Response Collection:

1. AE sees pending questions in QuickQuestions component (keyboard-first: 1-N select chip, ↑↓ navigate, Enter confirm)
2. AE responds → POST `/api/field-queries/respond`
3. Handler: generates give-back insight via Claude, logs activity, creates observation, updates question status to "answered"
4. After all responses: `updateAggregatedAnswer()` synthesizes via Claude (2-3 sentences, anonymized)

#### Give-Back Mechanism:

When AE responds, they immediately receive:
- Acknowledgment: "Got it — [deal] updated"
- Insight: 1-2 sentence actionable tip (Claude-generated, `max_tokens: 256`)
- Records updated: deal record, account profile, team intel
- Auto-advances after 4 seconds

---

### 4b. Field Query Display

**For AEs (recipients):**
- QuickQuestions component (`components/quick-questions.tsx`): visible on all dashboard pages when `currentUser?.role === "AE"`
- Shows pending questions as interactive cards with chip buttons + free text
- Optional `filterDealId` prop on deal detail page to show only deal-specific questions

**For Managers (creators):**
- DealQuestionInput (`components/deal-question-input.tsx`): on deal detail page, manager-only
- Shows 3 auto-suggested questions based on MEDDPICC gaps and deal signals
- Displays immediate answer + "Question sent to [AE]" status

**For Managers/Support (intelligence page):**
- "Your Queries" section (intelligence-client.tsx): polled every 30s
- Shows query, responses received, who's still waiting, synthesis
- Suggestion chips from `/api/field-queries/suggestions`

---

### 4c. Field Query Lifecycle Gaps

| Step | Status | Notes |
|------|--------|-------|
| **CREATE** | WORKING | 3 entry points, AI analysis determines path |
| **DISTRIBUTE** | WORKING | Rate-limited (max 3/AE), personalized questions |
| **DELIVER TO AE** | WORKING | QuickQuestions component with keyboard shortcuts |
| **COLLECT RESPONSE** | WORKING | Chip or free text, generates give-back |
| **LOG RESPONSE** | WORKING | Activity created, observation created |
| **AGGREGATE** | WORKING | Claude synthesis after all responses |
| **EXPIRE** | PARTIALLY WORKING | Questions expire only when AE calls GET endpoint (no background job). Parent queries never auto-expire |
| **DELETE** | NOT IMPLEMENTED | No cleanup mechanism |

**Key gaps:**
1. No background expiration job — `expiresAt` on fieldQueries is set but never checked
2. Question expiration only runs on GET `/api/field-queries?targetMemberId` (lines 32-40) — if AE never loads dashboard, questions stay "pending" forever
3. No role-based access control on API endpoints
4. Deal-scoped responses don't create observations (only non-deal-scoped responses do)
5. No duplicate question detection — same question can be asked repeatedly
6. Suggestion system is template-based (3 severity variants) — useful but shallow
7. No follow-up questions — if rep says "Not sure", no clarification path

---

## Section 5: Cross-System Connections

```
Observations → Clusters → Intelligence Dashboard patterns     [WIRED, LIVE]
Observations → Routing → Support function views               [PARTIALLY WIRED — API exists, no support UI]
Pipeline → Observations (auto-creation)                        [WIRED, LIVE]
Pipeline → Experiments (evidence attribution)                  [WIRED, LIVE]
Pipeline → Coordinator (signal dispatch)                       [WIRED, LIVE]
Coordinator → Deal Agents (coordinated intel push)            [WIRED, LIVE]
Coordinator → Intelligence Dashboard (agent patterns)         [WIRED, IN-MEMORY ONLY]
Observations → Field Queries (cluster link)                   [WIRED — clusterId in query suggestions]
Field Query Response → Observations (side-effect)             [PARTIALLY WIRED — bare insert, no classification]
Experiment Graduation → Observations (process_innovation)     [WIRED, LIVE]
Observations (process_innovation) → Experiment Creation       [WIRED, LIVE]
Close Analysis → Intelligence (close factors)                 [WIRED — seed data displayed on Close Intelligence tab]
Manager Directives → Intelligence (directive display)         [WIRED — seed data, manager-only display]
```

**Connection detail:**

| Connection | Actually Wired? | Evidence |
|-----------|----------------|----------|
| Observations → Clusters | YES, live | `findMatchingCluster()` + `checkAndCreateCluster()` in observation route |
| Clusters → Intelligence Patterns tab | YES, live | page.tsx fetches all clusters, client renders as filterable cards |
| Observations → Routing records | YES, live | observation route creates routing records for routable signal types |
| Routing → Support function UI | NO — API only | PATCH endpoint exists but no component renders routing queue for support roles |
| Pipeline → Observations | YES, live | Pipeline step 4 POSTs to `/api/observations` |
| Pipeline → Experiments (evidence) | YES, live | Pipeline step 6 PATCHes experiment evidence |
| Pipeline → Coordinator | YES, live | Pipeline step 9 sends signals via RPC |
| Coordinator → Deal Agents | YES, live | Coordinator's `synthesizePattern` pushes to deal agents |
| Coordinator → Intelligence page | YES but in-memory | GET `/api/intelligence/agent-patterns` reads actor state |
| Cluster link → Field Queries | YES, partially | Suggestions reference clusterId, questions can include clusterId |
| Field query response → Observations | YES but degraded | Creates observation but skips classification/clustering/routing |
| Graduation → Observation | YES, live | PATCH route creates process_innovation observation |
| Process innovation → Experiment | YES, live | Observation route auto-creates playbookIdea |
| Close analysis → Close Intelligence | YES, seed-dependent | Requires deals closed with factors (mostly seed data) |

---

## Section 6: Seed Data vs. Live Data Reality Check

### Observations System

| Feature | Seed % | Live % | If Seeds Deleted |
|---------|--------|--------|-----------------|
| Observations in Field Feed | ~80% seed | ~20% from pipeline/manual | Field Feed works but nearly empty |
| Observation clusters | ~90% seed | ~10% live-created | Patterns tab nearly empty until many observations accumulate |
| Routing records | 100% seed | 0% live verified | Routing section would be empty (no confirmed live routing path creates visible UI) |
| Follow-up questions | 0% | 100% Claude-generated | Would still work |
| Notification chains | 0% | 100% Claude-triggered | Would still work |

### Playbook/Experiments System

| Feature | Seed % | Live % | If Seeds Deleted |
|---------|--------|--------|-----------------|
| Experiments (8 total) | 100% seed | 0% manually created | Playbook page completely empty until process_innovation observation auto-creates one |
| Evidence data | 100% seed for testing experiments | Pipeline can generate but none in demo without running pipeline | Drill-down modals empty |
| Metrics (velocity/sentiment/close rate) | 100% seed | Pipeline can update via PATCH | All metric displays show 0 |
| Influence scores | 100% seed | 0% live | Influence tab empty |

### Intelligence Dashboard

| Feature | Seed % | Live % | If Seeds Deleted |
|---------|--------|--------|-----------------|
| Observation clusters on Patterns tab | ~90% seed | ~10% live | Nearly empty |
| Agent-detected patterns | 0% seed | 100% live (from coordinator) | Still works — requires running 2+ pipelines |
| Close Intelligence | 100% seed | Requires closing deals with factors | Tab shows "No close intelligence data yet" |
| Manager directives | 100% seed | No creation UI | Directives section empty |
| Field Feed observations | ~80% seed | ~20% live | Mostly empty |
| Avg response time metric | 100% seed | Requires acknowledged routings | Shows "N/A" |

### Field Queries System

| Feature | Seed % | Live % | If Seeds Deleted |
|---------|--------|--------|-----------------|
| Pending questions for AEs | ~100% seed | Can be created live | QuickQuestions shows nothing initially |
| Aggregated answers | ~100% seed | Claude generates live | Empty until queries are created |
| Suggestions | 0% | Template-generated from clusters | Works if clusters exist |

### Summary: "Theater" vs. "Real"

**Real (works end-to-end from live actions):**
- Observation creation (manual + pipeline)
- AI classification of observations
- Observation clustering (both match and auto-create)
- Agent-detected patterns (coordinator synthesis + push to deal agents)
- Field query creation → distribution → response → give-back → aggregation
- Experiment approval → testing transition (manager flow)
- Experiment evidence attribution from pipeline

**Theater (looks real but is static seed data):**
- Experiment metrics (velocity, sentiment, close rate) — pre-populated, not computed
- Close Intelligence aggregation — requires seed deals with closeFactors
- Manager directives — seed-only, no creation UI
- Routing lifecycle — records created but no support function UI to manage them
- Influence scores — seed-only, no live calculation
- Follow/unfollow buttons on experiments — UI-only, no API call
- "Start Test" buttons for proposed experiments — UI works but requires seed proposals to exist

---

## Section 7: Health Summary

### Fully working end-to-end:
- Observation creation from manual input (agent bar → classify → cluster → route → display)
- Observation creation from transcript pipeline (pipeline → observations API → classify → cluster → display)
- Observation follow-up flow (classify → ask follow-up → receive answer → update → notify)
- Agent-detected pattern synthesis (coordinator receives signals → detects pattern → Claude synthesis → push to deal agents → display on intelligence page)
- Field query full lifecycle (ask → distribute → collect → give-back → aggregate)
- Experiment approval flow (manager approves proposed → sets test group → starts testing)
- Experiment graduation flow (manager graduates → scaling scope → creates observation)

### Partially working (some lifecycle steps broken):
- **Observation routing:** Records created during observation classification, but no support function UI exists to view/acknowledge/resolve them. API endpoints work but have no consumer.
- **Observation from field query responses:** Creates observation but skips classification, clustering, and routing (bare DB insert). Observation appears in Field Feed but never clustered or routed.
- **Experiment evidence from pipeline:** Pipeline can PATCH evidence to experiments, but experiment metrics (currentMetrics) are not automatically calculated from evidence. Seeds pre-populate metrics; live evidence doesn't update the metric display.
- **Coordinator pattern persistence:** Patterns work end-to-end while server runs, but lost on restart/demo reset. No DB persistence.
- **Field query expiration:** Questions expire only when AE calls the GET endpoint. No background job. Parent queries never expire.

### Seed-data theater (looks real, isn't):
- **Experiment metrics** (velocity_pct, sentiment_pts, close_rate_pct) — pre-populated in seeds, never computed live
- **Close Intelligence** aggregation — requires seed deals marked closed with factors
- **Manager directives** — seed data displayed on intelligence page, no creation UI
- **Influence scores** — seed-only, Tab 3 on playbook page
- **Average response time** metric on Patterns tab — depends on seed routing acknowledgments
- **Observation clusters** severity escalation — works in code but most demo clusters are from seeds
- **Follow/unfollow buttons** on experiments — UI renders but no API call fires

### Not working:
- **Support function routing UI** — no component exists for support personas to manage their routed observations
- **Experiment deletion/archival mid-test** — no UI to archive a testing experiment
- **Observation deletion** — no delete capability anywhere
- **Field query background expiration** — no scheduled cleanup
- **Live experiment metric calculation** — no aggregation logic converts evidence into metrics

### Critical risks for demo:
1. **Coordinator patterns lost on demo reset** — After "Enter Demo", intelligence page shows no agent-detected patterns until 2+ pipelines are run. This is the signature feature of Act 2 and requires pipeline runs during demo.
2. **Experiment metrics are static** — Drill-down modals show seed data. Running pipeline on a different deal won't change the displayed metrics. Manager graduation flow works but the "evidence" supporting it is from seeds.
3. **Close Intelligence requires seed closed deals** — Tab shows "No close intelligence data yet" if seeds are missing. No live deal closure in demo populates this.
4. **Double classification burns Claude tokens** — Each pipeline signal gets classified twice (once in pipeline, once in observation route). With dense transcripts generating 6-8 signals each, this is 12-16 extra Claude calls per pipeline run.
5. **No real-time updates on intelligence page** — Agent-detected patterns, observations, and clusters are fetched once on page load. Demo presenter must refresh page to see updates after pipeline runs.

### Recommended fixes for rebuild (prioritized by demo impact):

1. **HIGH — Persist coordinator patterns to DB:** Add a `coordinator_patterns` table. Write patterns on synthesis, read from DB in `/api/intelligence/agent-patterns`. Survives demo reset.
2. **HIGH — Add polling/refresh on intelligence page:** Fetch agent patterns and observations on an interval (e.g., 10s) or add a "Refresh" button. Critical for live demo flow.
3. **HIGH — Skip re-classification for pipeline observations:** When `sourceContext.trigger === "transcript_pipeline"`, trust the pipeline's classification instead of calling Claude again. Pass classification in request body.
4. **MEDIUM — Build support function routing view:** Simple component showing routed observations with acknowledge/resolve buttons. Enables Act 2 demo for support personas.
5. **MEDIUM — Compute experiment metrics from evidence:** Add aggregation logic that calculates velocity/sentiment/close rate from evidence deals. Replace seed metrics.
6. **MEDIUM — Add background expiration job:** CronJob or scheduled task to expire old field queries and questions.
7. **LOW — Full classification for field query observations:** Route field query response observations through the full classification pipeline instead of bare insert.
8. **LOW — Persist routing acknowledgments for demo:** Pre-seed some acknowledged routings so avg response time metric is non-zero after demo reset.

---

## Section 8: Files Phase 7 Should Read

Phase 7 (Cross-System Wiring & Gap Analysis) should prioritize:

### Cross-system integration points:
1. `apps/web/src/actors/transcript-pipeline.ts` — The hub that feeds observations, experiments, coordinator, and deal agents
2. `apps/web/src/actors/intelligence-coordinator.ts` — Cross-deal pattern detection and synthesis
3. `apps/web/src/actors/deal-agent.ts` — Receives coordinated intel, manages health checks, interventions
4. `apps/web/src/app/api/observations/route.ts` — Central observation pipeline (creates clusters, routes, experiments)

### Layout and persona wiring:
5. `apps/web/src/components/providers.tsx` — PersonaContext that controls role-based rendering
6. `apps/web/src/components/layout-agent-bar.tsx` — Where ObservationInput lives globally
7. `apps/web/src/app/(dashboard)/layout.tsx` — Dashboard layout with DemoGuide, sidebar, agent bar

### Demo reset and seed integrity:
8. `apps/web/src/app/api/demo/reset/route.ts` — What gets reset and what survives
9. `packages/db/src/seed-book.ts` — Post-sale seed data
10. `packages/db/src/seed-data/playbook-experiments.ts` — Experiment seed shapes
11. `packages/db/src/seed-data/playbook-evidence.ts` — Evidence seed shapes

### Feature completeness:
12. `apps/web/src/app/(dashboard)/pipeline/[id]/deal-detail-client.tsx` — Deal page integrations (agent memory, interventions, field queries, call prep)
13. `apps/web/src/components/observation-input.tsx` — Intent detection, all interaction modes
14. `apps/web/src/app/(dashboard)/book/book-client.tsx` — Post-sale book integrations

### Schema for gap analysis:
15. `packages/db/src/schema.ts` — Full schema (33 tables) to verify all FK relationships and column usage

# Phase 2: Database Schema Audit

**Audit Date:** 2026-04-13
**Auditor:** Claude (automated)
**Mode:** READ ONLY — no source files modified
**Input:** Phase 1 results (docs/audit/01-structure.md)

---

## Section 1: Enum Inventory

25 pgEnum types defined in `packages/db/src/schema.ts`.

### 1. roleEnum
**Values:** `AE`, `BDR`, `SA`, `CSM`, `MANAGER`
**Used by:** `teamMembers.role`
**Unused values:** None

### 2. verticalEnum
**Values:** `healthcare`, `financial_services`, `manufacturing`, `retail`, `technology`, `general`
**Used by:** `teamMembers.verticalSpecialization`, `companies.industry`, `deals.vertical`, `crossAgentFeedback.vertical`
**Unused values:** None

### 3. pipelineStageEnum
**Values:** `new_lead`, `qualified`, `discovery`, `technical_validation`, `proposal`, `negotiation`, `closing`, `closed_won`, `closed_lost`
**Used by:** `deals.stage`, `dealStageHistory.fromStage`, `dealStageHistory.toStage`
**Unused values:** None

### 4. forecastCategoryEnum
**Values:** `pipeline`, `upside`, `commit`, `closed`
**Used by:** `deals.forecastCategory`
**Unused values:** None (but no API route writes these; seed-only)

### 5. productEnum
**Values:** `claude_api`, `claude_enterprise`, `claude_team`
**Used by:** `deals.product`
**Unused values:** None

### 6. leadSourceEnum
**Values:** `inbound`, `outbound`, `plg_upgrade`, `partner`, `event`
**Used by:** `deals.leadSource`
**Unused values:** None

### 7. enrichmentSourceEnum
**Values:** `apollo`, `clearbit`, `simulated`
**Used by:** `companies.enrichmentSource`
**Unused values:** `apollo`, `clearbit` (only `simulated` is ever written)

### 8. milestoneSourceEnum
**Values:** `manual`, `transcript`, `email`, `ai_detected`
**Used by:** `dealMilestones.source`
**Unused values:** None

### 9. stageChangedByEnum
**Values:** `ai`, `human`
**Used by:** `dealStageHistory.changedBy`
**Unused values:** None

### 10. emailSequenceStatusEnum
**Values:** `draft`, `active`, `paused`, `completed`
**Used by:** `emailSequences.status`
**Unused values:** `completed`

### 11. emailStepStatusEnum
**Values:** `draft`, `approved`, `sent`, `opened`, `clicked`, `replied`, `bounced`
**Used by:** `emailSteps.status`
**Unused values:** `clicked` (never written in seeds or API)

### 12. transcriptSourceEnum
**Values:** `uploaded`, `recorded`, `simulated`
**Used by:** `callTranscripts.source`
**Unused values:** `uploaded`, `recorded` (all transcripts are `simulated`)

### 13. transcriptStatusEnum
**Values:** `pending`, `transcribing`, `analyzing`, `complete`
**Used by:** `callTranscripts.status`
**Unused values:** `pending`, `transcribing`, `analyzing` (all transcripts seeded as `complete`)

### 14. agentRoleTypeEnum
**Values:** `ae`, `bdr`, `sa`, `csm`, `manager`
**Used by:** `agentConfigs.roleType`, `feedbackRequests.targetRoleType`
**Unused values:** None

### 15. configChangedByEnum
**Values:** `user`, `ai`, `feedback_loop`
**Used by:** `agentConfigVersions.changedBy`
**Unused values:** `ai` (only `user` and `feedback_loop` are written)

### 16. feedbackRequestTypeEnum
**Values:** `add_info`, `change_format`, `add_question`, `remove_field`, `process_change`
**Used by:** `feedbackRequests.requestType`
**Unused values:** None

### 17. feedbackStatusEnum
**Values:** `pending`, `approved`, `rejected`, `auto_applied`
**Used by:** `feedbackRequests.status`
**Unused values:** `rejected`

### 18. priorityEnum
**Values:** `low`, `medium`, `high`, `urgent`
**Used by:** `feedbackRequests.priority`, `notifications.priority`
**Unused values:** None

### 19. agentActionTypeEnum
**Values:** `email_drafted`, `lead_scored`, `research_generated`, `transcript_analyzed`, `deal_stage_recommended`, `meeting_scheduled`, `feedback_processed`, `instruction_updated`
**Used by:** `agentActionsLog.actionType`
**Unused values:** ALL 8 VALUES. The `agentActionsLog` table is never inserted into by any seed or API route. This entire enum is dead code.

### 20. notificationTypeEnum
**Values:** `deal_at_risk`, `handoff_request`, `agent_recommendation`, `feedback_received`, `stage_change`, `meeting_reminder`, `approval_needed`, `system_intelligence`
**Used by:** `notifications.type`
**Unused values:** None

### 21. observationRoutingStatusEnum
**Values:** `sent`, `acknowledged`, `in_progress`, `resolved`
**Used by:** `observationRouting.status`
**Unused values:** None

### 22. fieldQueryStatusEnum
**Values:** `active`, `answered`, `expired`
**Used by:** `fieldQueries.status`
**Unused values:** None

### 23. fieldQueryQuestionStatusEnum
**Values:** `pending`, `answered`, `skipped`, `expired`
**Used by:** `fieldQueryQuestions.status`
**Unused values:** `skipped`

### 24. activityTypeEnum
**Values:** `email_sent`, `email_received`, `call_completed`, `meeting_scheduled`, `meeting_completed`, `note_added`, `stage_changed`, `task_completed`, `document_shared`, `call_prep`, `email_draft`, `call_analysis`, `observation`, `agent_feedback`, `competitive_intel`
**Used by:** `activities.type`
**Unused values:** `task_completed`, `document_shared`, `agent_feedback` (defined in schema and types.ts but never written)

### 25. contactRoleEnum
**Values:** `champion`, `economic_buyer`, `technical_evaluator`, `end_user`, `blocker`, `coach`
**Used by:** `contacts.roleInDeal`
**Unused values:** None

---

## Section 2: Table Inventory

### teamMembers

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| name | text | no | — | — | |
| email | text | no | — | — | |
| role | roleEnum | no | — | — | |
| verticalSpecialization | verticalEnum | no | 'general' | — | |
| isActive | boolean | no | true | — | |
| avatarUrl | text | yes | — | — | |
| capacityTarget | integer | yes | 10 | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-org.ts, seed-agents.ts, seed-cross-feedback.ts, seed-field-queries.ts, seed-hero-activities.ts, seed-intelligence-fixes.ts, seed-observations.ts, seed-outreach.ts, seed-system-intelligence.ts, seed-final-polish.ts, seed-agent-actions.ts, seed-book.ts, seed-deal-fitness.ts, seed-transcripts-resources.ts
**API reads:** /api/team-members, /api/deals, /api/activities, /api/notifications, /api/observations, /api/observation-routing, /api/field-queries, /api/agent/call-prep, /api/agent/draft-email, /api/agent/feedback, /api/agent/save-to-deal, /api/analyze/link, /api/playbook/ideas/[id], /api/deal-fitness, /api/transcript-pipeline
**API writes:** None (read-only in API layer)
**Relations:** teamMembersRelations (aeDeals → deals, activities → activities, agentConfigs → agentConfigs, notifications → notifications)
**Indexes:** None beyond PK

---

### companies

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| name | text | no | — | — | |
| domain | text | yes | — | — | |
| industry | verticalEnum | no | — | — | |
| employeeCount | integer | yes | — | — | |
| annualRevenue | text | yes | — | — | Stored as text (e.g., "€450M") |
| techStack | text[] | yes | — | — | |
| hqLocation | text | yes | — | — | |
| description | text | yes | — | — | |
| enrichmentSource | enrichmentSourceEnum | yes | 'simulated' | — | |
| enrichmentData | jsonb | yes | — | — | NEVER POPULATED |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-system-intelligence.ts, seed-final-polish.ts, seed-transcripts-resources.ts, seed-book.ts, seed-deal-fitness.ts
**API reads:** /api/companies, /api/deals, /api/activities, /api/book, /api/customer/response-kit, /api/deal-fitness, /api/deals/resolve, /api/deals/close-analysis, /api/field-queries, /api/agent/call-prep, /api/agent/draft-email, /api/observations, /api/transcript-pipeline
**API writes:** None
**Relations:** companiesRelations (contacts, deals, leadScores)

---

### contacts

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| firstName | text | no | — | — | |
| lastName | text | no | — | — | |
| email | text | yes | — | — | |
| phone | text | yes | — | — | |
| title | text | yes | — | — | |
| linkedinUrl | text | yes | — | — | |
| companyId | uuid | no | — | companies.id | |
| roleInDeal | contactRoleEnum | yes | — | — | |
| isPrimary | boolean | yes | false | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-outreach.ts, seed-system-intelligence.ts, seed-final-polish.ts, seed-book.ts, seed-deal-fitness.ts
**API reads:** /api/deals, /api/activities, /api/book, /api/customer/response-kit, /api/deals/resolve, /api/deals/close-analysis, /api/agent/call-prep, /api/agent/draft-email, /api/field-queries, /api/transcript-pipeline
**API writes:** None
**Relations:** contactsRelations (company → companies, activities → activities)

---

### deals

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| name | text | no | — | — | |
| companyId | uuid | no | — | companies.id | |
| primaryContactId | uuid | yes | — | contacts.id | |
| assignedAeId | uuid | yes | — | teamMembers.id | |
| assignedBdrId | uuid | yes | — | teamMembers.id | |
| assignedSaId | uuid | yes | — | teamMembers.id | |
| stage | pipelineStageEnum | no | 'new_lead' | — | |
| dealValue | decimal(12,2) | yes | — | — | |
| currency | text | yes | 'EUR' | — | |
| closeDate | timestamp | yes | — | — | |
| winProbability | integer | yes | 0 | — | |
| forecastCategory | forecastCategoryEnum | yes | 'pipeline' | — | |
| vertical | verticalEnum | no | — | — | |
| product | productEnum | yes | — | — | |
| leadSource | leadSourceEnum | yes | — | — | |
| competitor | text | yes | — | — | |
| lossReason | text | yes | — | — | |
| closeCompetitor | text | yes | — | — | |
| closeNotes | text | yes | — | — | |
| closeImprovement | text | yes | — | — | |
| winTurningPoint | text | yes | — | — | |
| winReplicable | text | yes | — | — | |
| closeAiAnalysis | jsonb | yes | — | — | |
| closeFactors | jsonb | yes | — | — | |
| winFactors | jsonb | yes | — | — | |
| closeAiRanAtTimestamp | timestamp | yes | — | — | |
| closedAt | timestamp | yes | — | — | |
| stageEnteredAt | timestamp | yes | now() | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-org.ts, seed-playbook.ts, seed-playbook-lifecycle.ts, seed-outreach.ts, seed-intelligence.ts, seed-intelligence-fixes.ts, seed-hero-activities.ts, seed-final-polish.ts, seed-field-queries.ts, seed-cross-feedback.ts, seed-close-analysis.ts, seed-agent-actions.ts, seed-transcripts-resources.ts, seed-book.ts, seed-deal-fitness.ts, seeds/seed-healthfirst-transcript.ts
**API reads:** /api/deals, /api/deal-fitness, /api/book, /api/customer/response-kit, /api/deals/resolve, /api/deals/close-analysis, /api/field-queries, /api/agent/call-prep, /api/agent/draft-email, /api/activities, /api/observations, /api/analyze/link, /api/transcript-pipeline
**API writes:** /api/deals/stage (UPDATE), /api/deals/[id]/update (UPDATE), /api/demo/reset (UPDATE)
**Relations:** dealsRelations (company, primaryContact, assignedAe, milestones, meddpicc, stageHistory, activities, callTranscripts, notifications)
**Indexes:** None beyond PK

---

### dealMilestones

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| milestoneKey | text | no | — | — | |
| isCompleted | boolean | yes | false | — | |
| completedAt | timestamp | yes | — | — | |
| source | milestoneSourceEnum | yes | 'manual' | — | |
| evidence | text | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-final-polish.ts, seed-deal-fitness.ts
**API reads:** None
**API writes:** None
**Relations:** Referenced in dealsRelations (deals.milestones → many)
**Note:** No API route references this table. May be read by server components directly (UNVERIFIED).

---

### meddpiccFields

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| metrics | text | yes | — | — | |
| metricsConfidence | integer | yes | 0 | — | |
| economicBuyer | text | yes | — | — | |
| economicBuyerConfidence | integer | yes | 0 | — | |
| decisionCriteria | text | yes | — | — | |
| decisionCriteriaConfidence | integer | yes | 0 | — | |
| decisionProcess | text | yes | — | — | |
| decisionProcessConfidence | integer | yes | 0 | — | |
| identifyPain | text | yes | — | — | |
| identifyPainConfidence | integer | yes | 0 | — | |
| champion | text | yes | — | — | |
| championConfidence | integer | yes | 0 | — | |
| competition | text | yes | — | — | |
| competitionConfidence | integer | yes | 0 | — | |
| aiExtracted | boolean | yes | true | — | |
| aeConfirmed | boolean | yes | false | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-final-polish.ts, seed-deal-fitness.ts
**API reads:** /api/deals/[id]/meddpicc, /api/transcript-pipeline, /api/agent/call-prep, /api/field-queries, /api/deals/close-analysis
**API writes:** /api/deals/[id]/meddpicc-update (UPDATE+INSERT), /api/demo/reset (DELETE+re-insert)
**Relations:** Referenced in dealsRelations (deals.meddpicc → one)
**Indexes:** uniqueIndex on `dealId` (`meddpicc_deal_id_idx`)

---

### dealStageHistory

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| fromStage | pipelineStageEnum | yes | — | — | |
| toStage | pipelineStageEnum | no | — | — | |
| changedBy | stageChangedByEnum | no | — | — | |
| reason | text | yes | — | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-final-polish.ts
**API reads:** /api/deals/close-analysis
**API writes:** /api/deals/stage (INSERT), /api/demo/reset (DELETE all)
**Relations:** Referenced in dealsRelations (deals.stageHistory → many)
**Note:** No updatedAt column.

---

### activities

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | yes | — | deals.id | Nullable (some activities not deal-scoped) |
| contactId | uuid | yes | — | contacts.id | |
| teamMemberId | uuid | no | — | teamMembers.id | |
| type | activityTypeEnum | no | — | — | |
| subject | text | yes | — | — | |
| description | text | yes | — | — | |
| metadata | jsonb | yes | — | — | Polymorphic by activity type |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-hero-activities.ts, seed-final-polish.ts, seed-close-analysis.ts, seed-agent-actions.ts, seed-transcripts-resources.ts, seed-book.ts, seed-deal-fitness.ts
**API reads:** /api/activities, /api/agent/call-prep, /api/deals/close-analysis, /api/agent/draft-email, /api/field-queries, /api/deals/stage
**API writes:** /api/analyze/link (INSERT), /api/deals/stage (INSERT), /api/agent/save-to-deal (INSERT+UPDATE), /api/field-queries/respond (INSERT), /api/deals/[id]/meddpicc-update (INSERT), /api/demo/reset (DELETE)
**Relations:** Referenced in dealsRelations, contactsRelations, teamMembersRelations
**Note:** No updatedAt column.

---

### emailSequences

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| contactId | uuid | no | — | contacts.id | |
| assignedAeId | uuid | no | — | teamMembers.id | |
| name | text | no | — | — | |
| status | emailSequenceStatusEnum | yes | 'draft' | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-outreach.ts, seed-final-polish.ts
**API reads:** None
**API writes:** None
**Relations:** None defined
**Note:** ORPHANED from API — seeded but no API route references it. Likely read directly by outreach page server component.

---

### emailSteps

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| sequenceId | uuid | no | — | emailSequences.id | |
| stepNumber | integer | no | — | — | |
| subject | text | no | — | — | |
| body | text | no | — | — | |
| delayDays | integer | yes | 0 | — | |
| status | emailStepStatusEnum | yes | 'draft' | — | |
| sentAt | timestamp | yes | — | — | |
| openedAt | timestamp | yes | — | — | |
| repliedAt | timestamp | yes | — | — | |
| aiGenerated | boolean | yes | false | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-outreach.ts, seed-final-polish.ts
**API reads:** None
**API writes:** None
**Relations:** None defined
**Note:** ORPHANED from API — same as emailSequences.

---

### callTranscripts

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| title | text | no | — | — | |
| date | timestamp | no | — | — | |
| durationSeconds | integer | yes | — | — | |
| participants | jsonb | yes | — | — | |
| transcriptText | text | yes | — | — | |
| source | transcriptSourceEnum | yes | 'simulated' | — | |
| status | transcriptStatusEnum | yes | 'complete' | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-transcripts-resources.ts, seed-final-polish.ts, seed-deal-fitness.ts, seeds/seed-healthfirst-transcript.ts
**API reads:** /api/agent/call-prep, /api/deals/close-analysis, /api/agent/draft-email
**API writes:** None
**Relations:** Referenced in dealsRelations (deals.callTranscripts → many)

---

### callAnalyses

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| transcriptId | uuid | no | — | callTranscripts.id | |
| summary | text | yes | — | — | |
| painPoints | jsonb | yes | — | — | |
| nextSteps | jsonb | yes | — | — | |
| stakeholdersMentioned | jsonb | yes | — | — | |
| budgetSignals | jsonb | yes | — | — | |
| competitiveMentions | jsonb | yes | — | — | |
| talkRatio | jsonb | yes | — | — | |
| questionQuality | jsonb | yes | — | — | |
| callQualityScore | integer | yes | — | — | |
| meddpiccExtractions | jsonb | yes | — | — | |
| coachingInsights | jsonb | yes | — | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-transcripts-resources.ts, seed-final-polish.ts
**API reads:** /api/agent/call-prep, /api/deals/close-analysis, /api/agent/draft-email
**API writes:** None
**Relations:** None explicitly defined (implicit via transcriptId)
**Indexes:** uniqueIndex on `transcriptId` (`call_analyses_transcript_id_idx`)
**Note:** No updatedAt column. 9 JSONB columns, many with shape drift between seed files.

---

### agentConfigs

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| teamMemberId | uuid | no | — | teamMembers.id | |
| agentName | text | no | — | — | |
| roleType | agentRoleTypeEnum | no | — | — | |
| instructions | text | no | — | — | |
| outputPreferences | jsonb | yes | — | — | |
| version | integer | yes | 1 | — | |
| isActive | boolean | yes | true | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-org.ts, seed-agents.ts, seed-cross-feedback.ts
**API reads:** /api/observations, /api/transcript-pipeline, /api/agent/call-prep, /api/agent/draft-email, /api/agent/feedback, /api/agent/configure
**API writes:** /api/agent/configure (UPDATE), /api/observations (UPDATE)
**Relations:** Referenced in teamMembersRelations (teamMembers.agentConfigs → many)

---

### agentConfigVersions

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| agentConfigId | uuid | no | — | agentConfigs.id | |
| version | integer | no | — | — | |
| instructions | text | no | — | — | |
| outputPreferences | jsonb | yes | — | — | |
| changedBy | configChangedByEnum | no | — | — | |
| changeReason | text | yes | — | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-org.ts, seed-agents.ts
**API reads:** /api/observations, /api/agent/configure
**API writes:** /api/agent/configure (INSERT), /api/observations (INSERT)
**Relations:** None explicitly defined
**Note:** No updatedAt column.

---

### feedbackRequests

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| fromMemberId | uuid | no | — | teamMembers.id | |
| fromAgentConfigId | uuid | no | — | agentConfigs.id | |
| targetRoleType | agentRoleTypeEnum | no | — | — | |
| description | text | no | — | — | |
| requestType | feedbackRequestTypeEnum | no | — | — | |
| status | feedbackStatusEnum | yes | 'pending' | — | |
| priority | priorityEnum | yes | 'medium' | — | |
| approvedByMemberId | uuid | yes | — | teamMembers.id | |
| resolvedAt | timestamp | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-agents.ts
**API reads:** /api/agent/feedback
**API writes:** /api/agent/feedback (INSERT)
**Relations:** None explicitly defined

---

### agentActionsLog

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| agentConfigId | uuid | no | — | agentConfigs.id | |
| actionType | agentActionTypeEnum | no | — | — | |
| description | text | yes | — | — | |
| inputData | jsonb | yes | — | — | NEVER POPULATED |
| outputData | jsonb | yes | — | — | NEVER POPULATED |
| wasOverridden | boolean | yes | false | — | |
| overrideReason | text | yes | — | — | |
| dealId | uuid | yes | — | deals.id | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts (DELETE only — never inserted)
**API reads:** None
**API writes:** None
**Relations:** None defined
**Note:** DEAD TABLE. seed.ts only deletes from it during cleanup. No seed inserts, no API routes. The entire agentActionTypeEnum is also dead code. No updatedAt column.

---

### leadScores

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| companyId | uuid | no | — | companies.id | |
| dealId | uuid | yes | — | deals.id | |
| score | integer | yes | 0 | — | |
| scoringFactors | jsonb | yes | — | — | |
| icpMatchPct | integer | yes | 0 | — | |
| engagementScore | integer | yes | 0 | — | |
| intentScore | integer | yes | 0 | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-final-polish.ts
**API reads:** None
**API writes:** None
**Relations:** Referenced in companiesRelations (companies.leadScores → many)
**Note:** ORPHANED from API — seeded but no API route reads or writes. No updatedAt column.

---

### notifications

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| teamMemberId | uuid | no | — | teamMembers.id | |
| type | notificationTypeEnum | no | — | — | |
| title | text | no | — | — | |
| message | text | no | — | — | |
| dealId | uuid | yes | — | deals.id | |
| isRead | boolean | yes | false | — | |
| priority | priorityEnum | yes | 'medium' | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed.ts, seed-org.ts, seed-final-polish.ts
**API reads:** /api/notifications
**API writes:** /api/observations (INSERT), /api/observations/[id]/follow-up (INSERT), /api/demo/reset (DELETE)
**Relations:** Referenced in dealsRelations, teamMembersRelations
**Note:** No updatedAt column.

---

### observationClusters

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| title | text | no | — | — | |
| summary | text | yes | — | — | |
| signalType | text | no | — | — | Plain text, NOT enum |
| targetFunction | text | yes | — | — | |
| observationCount | integer | yes | 1 | — | |
| observerCount | integer | yes | 1 | — | |
| verticalsAffected | text[] | yes | — | — | |
| pipelineImpact | jsonb | yes | — | — | |
| severity | text | yes | 'informational' | — | Plain text |
| resolutionStatus | text | yes | 'emerging' | — | Plain text |
| resolutionNotes | text | yes | — | — | |
| effectivenessScore | integer | yes | — | — | |
| arrImpactTotal | decimal(12,2) | yes | — | — | |
| arrImpactDetails | jsonb | yes | — | — | |
| unstructuredQuotes | jsonb | yes | — | — | |
| structuredSummary | jsonb | yes | — | — | |
| firstObserved | timestamp | yes | now() | — | |
| lastObserved | timestamp | yes | now() | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-observations.ts, seed-intelligence.ts, seed-intelligence-fixes.ts, seed-final-polish.ts
**API reads:** /api/observations/clusters, /api/observations, /api/agent/call-prep, /api/field-queries, /api/field-queries/suggestions, /api/observations/[id]/follow-up
**API writes:** /api/observations (INSERT+UPDATE), /api/observations/[id]/follow-up (UPDATE), /api/demo/reset (UPDATE+DELETE)
**Relations:** Referenced in fieldQueriesRelations (fieldQueries.cluster → observationClusters)

---

### observations

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| observerId | uuid | no | — | teamMembers.id | |
| rawInput | text | no | — | — | |
| sourceContext | jsonb | yes | — | — | |
| aiClassification | jsonb | yes | — | — | |
| aiGiveback | jsonb | yes | — | — | |
| status | text | yes | 'submitted' | — | Plain text |
| lifecycleEvents | jsonb | yes | — | — | |
| clusterId | uuid | yes | — | observationClusters.id | |
| followUpQuestion | text | yes | — | — | |
| followUpResponse | text | yes | — | — | |
| followUpChips | text[] | yes | — | — | |
| structuredData | jsonb | yes | — | — | |
| arrImpact | jsonb | yes | — | — | |
| linkedAccountIds | uuid[] | yes | — | — | No FK constraint |
| linkedDealIds | uuid[] | yes | — | — | No FK constraint |
| extractedEntities | jsonb | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-observations.ts, seed-intelligence.ts, seed-intelligence-fixes.ts, seed-hero-activities.ts, seed-final-polish.ts, seed-playbook.ts, seed-deal-fitness.ts
**API reads:** /api/observations, /api/agent/call-prep, /api/field-queries, /api/deals/close-analysis, /api/agent/draft-email, /api/customer/response-kit, /api/observation-routing, /api/observations/[id]/follow-up
**API writes:** /api/observations (INSERT+UPDATE), /api/observations/[id]/follow-up (UPDATE), /api/deals/stage (INSERT), /api/field-queries/respond (INSERT), /api/playbook/ideas/[id] (INSERT), /api/demo/reset (DELETE)
**Relations:** None explicitly defined for observations itself

---

### supportFunctionMembers

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| name | text | no | — | — | |
| role | text | no | — | — | Plain text |
| function | text | no | — | — | Plain text |
| email | text | yes | — | — | |
| avatarInitials | text | yes | — | — | |
| avatarColor | text | yes | — | — | |
| verticalsCovered | text[] | yes | — | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed-intelligence.ts, seed-field-queries.ts
**API reads:** /api/observations (dashboard layout also queries this table)
**API writes:** None
**Relations:** None defined
**Note:** No updatedAt column.

---

### observationRouting

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| observationId | uuid | no | — | observations.id | |
| targetFunction | text | no | — | — | |
| targetMemberId | uuid | yes | — | — | References supportFunctionMembers but NO FK constraint |
| signalType | text | no | — | — | |
| status | observationRoutingStatusEnum | no | 'sent' | — | |
| acknowledgedAt | timestamp | yes | — | — | |
| resolvedAt | timestamp | yes | — | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed-intelligence-fixes.ts, seed-final-polish.ts
**API reads:** /api/observation-routing, /api/observations
**API writes:** /api/observations (INSERT), /api/observation-routing (UPDATE/PATCH), /api/demo/reset (DELETE)
**Relations:** None defined
**Note:** No updatedAt column. `targetMemberId` intentionally has no FK (references supportFunctionMembers, a different table from teamMembers).

---

### fieldQueries

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| initiatedBy | uuid | no | — | — | NO FK (intentional — can be teamMembers or supportFunctionMembers) |
| rawQuestion | text | no | — | — | |
| aiAnalysis | jsonb | yes | — | — | |
| clusterId | uuid | yes | — | observationClusters.id | |
| aggregatedAnswer | jsonb | yes | — | — | |
| status | fieldQueryStatusEnum | no | 'active' | — | |
| expiresAt | timestamp | no | — | — | |
| initiatedAt | timestamp | yes | now() | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-field-queries.ts, seed-intelligence-fixes.ts
**API reads:** /api/field-queries, /api/field-queries/respond
**API writes:** /api/field-queries (INSERT), /api/field-queries/respond (UPDATE), /api/demo/reset (DELETE)
**Relations:** fieldQueriesRelations (cluster → observationClusters, questions → fieldQueryQuestions)

---

### fieldQueryQuestions

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| queryId | uuid | no | — | fieldQueries.id | |
| targetMemberId | uuid | no | — | teamMembers.id | |
| questionText | text | no | — | — | |
| chips | text[] | no | — | — | |
| dealId | uuid | yes | — | deals.id | |
| accountId | uuid | yes | — | companies.id | |
| responseText | text | yes | — | — | |
| responseType | text | yes | — | — | Plain text |
| respondedAt | timestamp | yes | — | — | |
| giveBack | jsonb | yes | — | — | |
| recordsUpdated | jsonb | yes | — | — | |
| status | fieldQueryQuestionStatusEnum | no | 'pending' | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed-field-queries.ts, seed-intelligence-fixes.ts, seed-final-polish.ts
**API reads:** /api/field-queries, /api/field-queries/respond
**API writes:** /api/field-queries (INSERT+UPDATE), /api/field-queries/respond (UPDATE), /api/demo/reset (DELETE)
**Relations:** fieldQueryQuestionsRelations (query → fieldQueries, targetMember → teamMembers, deal → deals, account → companies)
**Note:** No updatedAt column.

---

### crossAgentFeedback

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| sourceMemberId | uuid | no | — | teamMembers.id | |
| targetMemberId | uuid | no | — | teamMembers.id | |
| content | text | no | — | — | |
| dealId | uuid | yes | — | deals.id | |
| accountId | uuid | yes | — | companies.id | |
| vertical | verticalEnum | yes | — | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed-cross-feedback.ts, seed-final-polish.ts
**API reads:** /api/agent/call-prep, /api/field-queries, /api/agent/draft-email
**API writes:** None
**Relations:** None defined
**Note:** No updatedAt column.

---

### systemIntelligence

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| vertical | text | yes | — | — | Plain text (NOT verticalEnum) |
| accountId | uuid | yes | — | companies.id | |
| insightType | text | no | — | — | |
| title | text | no | — | — | |
| insight | text | no | — | — | |
| supportingData | jsonb | yes | — | — | |
| confidence | decimal(3,2) | yes | — | — | Range 0.00-9.99 |
| relevanceScore | decimal(3,2) | yes | — | — | Range 0.00-9.99 |
| status | text | no | 'active' | — | Plain text |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-system-intelligence.ts, seed-playbook.ts
**API reads:** /api/agent/call-prep, /api/deals/close-analysis, /api/agent/draft-email, /api/customer/response-kit
**API writes:** None
**Relations:** None defined

---

### managerDirectives

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| authorId | uuid | no | — | teamMembers.id | |
| scope | text | no | — | — | |
| vertical | text | yes | — | — | Plain text |
| targetRole | text | yes | — | — | Plain text |
| targetMemberId | uuid | yes | — | teamMembers.id | |
| directive | text | no | — | — | |
| priority | text | no | — | — | Plain text (NOT priorityEnum) |
| category | text | no | — | — | |
| isActive | boolean | no | true | — | |
| createdAt | timestamp | no | now() | — | |
| expiresAt | timestamp | yes | — | — | |

**Seeds:** seed-system-intelligence.ts
**API reads:** /api/agent/call-prep, /api/agent/draft-email
**API writes:** None
**Relations:** None defined
**Note:** No updatedAt column.

---

### resources

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| title | text | no | — | — | |
| type | text | no | — | — | Plain text |
| description | text | yes | — | — | |
| verticals | text[] | yes | — | — | |
| tags | text[] | yes | — | — | |
| url | text | yes | — | — | |
| updatedAt | timestamp | no | now() | — | |
| createdAt | timestamp | no | now() | — | |

**Seeds:** seed-transcripts-resources.ts
**API reads:** /api/agent/call-prep, /api/agent/draft-email
**API writes:** None
**Relations:** None defined

---

### playbookIdeas

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| originatorId | uuid | no | — | teamMembers.id | |
| originatedFrom | text | yes | — | — | observation, close_analysis, manual, system_detected, cross_agent |
| sourceObservationId | uuid | yes | — | observations.id | |
| title | text | no | — | — | |
| hypothesis | text | no | — | — | |
| category | text | no | — | — | process, messaging, positioning, discovery, closing, engagement |
| vertical | text | yes | — | — | |
| status | text | no | 'proposed' | — | proposed, testing, graduated, rejected, archived |
| testStartDate | timestamp | yes | — | — | |
| testEndDate | timestamp | yes | — | — | |
| testGroupDeals | text[] | yes | — | — | |
| controlGroupDeals | text[] | yes | — | — | |
| results | jsonb | yes | — | — | |
| followers | text[] | yes | — | — | |
| followerCount | integer | yes | 0 | — | |
| testGroup | text[] | yes | — | — | AE user IDs |
| controlGroup | text[] | yes | — | — | AE user IDs |
| successThresholds | jsonb | yes | — | — | |
| currentMetrics | jsonb | yes | — | — | |
| approvedBy | text | yes | — | — | Manager user ID (no FK) |
| approvedAt | timestamp | yes | — | — | |
| graduatedAt | timestamp | yes | — | — | |
| experimentDurationDays | integer | yes | 30 | — | |
| experimentStart | timestamp | yes | — | — | |
| experimentEnd | timestamp | yes | — | — | |
| attribution | jsonb | yes | — | — | |
| experimentEvidence | jsonb | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-playbook.ts
**API reads:** /api/observations, /api/transcript-pipeline, /api/agent/call-prep, /api/playbook/ideas/[id]
**API writes:** /api/observations (INSERT), /api/playbook/ideas/[id] (UPDATE), /api/demo/reset (DELETE+INSERT)
**Relations:** None defined
**Note:** `approvedBy` stores a user ID as text with no FK constraint.

---

### influenceScores

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| memberId | uuid | no | — | teamMembers.id | |
| dimension | text | no | — | — | process_innovation, competitive_intel, technical_expertise, deal_coaching, customer_insight |
| vertical | text | yes | — | — | |
| score | integer | yes | 0 | — | 0-100 |
| tier | text | yes | 'contributing' | — | high_impact, growing, contributing, new |
| attributions | jsonb | yes | — | — | |
| lastContributionAt | timestamp | yes | — | — | |
| decayAppliedAt | timestamp | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-playbook.ts
**API reads:** None
**API writes:** None
**Relations:** None defined
**Note:** ORPHANED from API — UI-only display per CLAUDE.md.

---

### knowledgeArticles

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| title | text | no | — | — | |
| articleType | text | no | — | — | implementation_guide, case_study, resolution_history, best_practice, faq, product_update |
| content | text | no | — | — | |
| summary | text | yes | — | — | |
| products | text[] | yes | — | — | |
| verticals | text[] | yes | — | — | |
| tags | text[] | yes | — | — | |
| resolutionSteps | jsonb | yes | — | — | |
| relatedCompanyIds | uuid[] | yes | — | — | No FK constraint |
| effectivenessScore | integer | yes | — | — | |
| viewCount | integer | yes | 0 | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-book.ts
**API reads:** /api/customer/response-kit
**API writes:** None
**Relations:** knowledgeArticlesRelations (empty — `relations(knowledgeArticles, ({}) => ({}))`)

---

### customerMessages

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| companyId | uuid | no | — | companies.id | |
| contactId | uuid | yes | — | contacts.id | |
| dealId | uuid | yes | — | deals.id | |
| subject | text | no | — | — | |
| body | text | no | — | — | |
| channel | text | no | — | — | email, support_ticket, slack, meeting_note |
| receivedAt | timestamp | no | — | — | |
| priority | text | yes | 'medium' | — | Plain text |
| status | text | yes | 'pending' | — | pending, kit_ready, responded, resolved |
| responseKit | jsonb | yes | — | — | |
| respondedAt | timestamp | yes | — | — | |
| responseText | text | yes | — | — | |
| aiCategory | text | yes | — | — | technical_issue, adoption_help, billing_question, feature_request, escalation, check_in, renewal_discussion |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-book.ts
**API reads:** /api/book, /api/customer/response-kit
**API writes:** /api/customer/response-kit (UPDATE), /api/demo/reset (UPDATE via raw SQL)
**Relations:** customerMessagesRelations (company → companies, contact → contacts, deal → deals)

---

### accountHealth

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| companyId | uuid | no | — | companies.id | |
| dealId | uuid | no | — | deals.id | |
| healthScore | integer | yes | 80 | — | 0-100 |
| healthTrend | text | yes | 'stable' | — | improving, stable, declining, critical |
| healthFactors | jsonb | yes | — | — | |
| contractStatus | text | no | — | — | onboarding, active, renewal_window, at_risk, churned |
| contractStart | timestamp | yes | — | — | |
| renewalDate | timestamp | yes | — | — | |
| arr | decimal(12,2) | yes | — | — | |
| productsPurchased | text[] | yes | — | — | |
| usageMetrics | jsonb | yes | — | — | |
| lastTouchDate | timestamp | yes | — | — | |
| daysSinceTouch | integer | yes | — | — | |
| keyStakeholders | jsonb | yes | — | — | |
| expansionSignals | jsonb | yes | — | — | |
| riskSignals | jsonb | yes | — | — | |
| contractedUseCases | jsonb | yes | — | — | |
| expansionMap | jsonb | yes | — | — | |
| proactiveSignals | jsonb | yes | — | — | |
| similarSituations | jsonb | yes | — | — | |
| recommendedResources | jsonb | yes | — | — | |
| nextQbrDate | timestamp | yes | — | — | |
| onboardingComplete | boolean | yes | false | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-book.ts
**API reads:** /api/book, /api/customer/response-kit
**API writes:** None
**Relations:** accountHealthRelations (company → companies, deal → deals)
**Note:** 11 JSONB columns — highest JSONB density of any table.

---

### dealFitnessEvents

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| fitCategory | text | no | — | — | business_fit, emotional_fit, technical_fit, readiness_fit |
| eventKey | text | no | — | — | |
| eventLabel | text | no | — | — | |
| eventDescription | text | yes | — | — | |
| status | text | no | 'not_yet' | — | detected, not_yet, negative |
| detectedAt | timestamp | yes | — | — | |
| lifecyclePhase | text | no | 'pre_sale' | — | pre_sale, onboarding, active, renewal |
| detectionSources | text[] | yes | — | — | |
| sourceReferences | jsonb | yes | — | — | |
| evidenceSnippets | jsonb | yes | — | — | |
| confidence | decimal(3,2) | yes | — | — | |
| detectedBy | text | yes | 'ai' | — | |
| contactId | uuid | yes | — | contacts.id | |
| contactName | text | yes | — | — | Denormalized from contacts |
| notes | text | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-deal-fitness.ts
**API reads:** /api/deal-fitness
**API writes:** None
**Relations:** dealFitnessEventsRelations (deal → deals, contact → contacts)

---

### dealFitnessScores

| Column | Type | Nullable | Default | FK | Notes |
|--------|------|----------|---------|------|-------|
| id | uuid | no | gen_random_uuid() | — | PK |
| dealId | uuid | no | — | deals.id | |
| businessFitScore | integer | yes | 0 | — | |
| businessFitDetected | integer | yes | 0 | — | |
| businessFitTotal | integer | yes | 0 | — | |
| emotionalFitScore | integer | yes | 0 | — | |
| emotionalFitDetected | integer | yes | 0 | — | |
| emotionalFitTotal | integer | yes | 0 | — | |
| technicalFitScore | integer | yes | 0 | — | |
| technicalFitDetected | integer | yes | 0 | — | |
| technicalFitTotal | integer | yes | 0 | — | |
| readinessFitScore | integer | yes | 0 | — | |
| readnessFitDetected | integer | yes | 0 | — | Typo: "readness" instead of "readiness" |
| readinessFitTotal | integer | yes | 0 | — | |
| overallFitness | integer | yes | 0 | — | |
| velocityTrend | text | yes | 'stable' | — | accelerating, stable, decelerating, stalled |
| lastEventAt | timestamp | yes | — | — | |
| daysSinceLastEvent | integer | yes | — | — | |
| fitImbalanceFlag | boolean | yes | false | — | |
| eventsThisWeek | integer | yes | 0 | — | |
| eventsLastWeek | integer | yes | 0 | — | |
| benchmarkVsWon | jsonb | yes | — | — | |
| stakeholderEngagement | jsonb | yes | — | — | |
| buyerMomentum | jsonb | yes | — | — | |
| conversationSignals | jsonb | yes | — | — | |
| createdAt | timestamp | no | now() | — | |
| updatedAt | timestamp | no | now() | — | |

**Seeds:** seed-deal-fitness.ts
**API reads:** /api/deal-fitness
**API writes:** None
**Relations:** dealFitnessScoresRelations (deal → deals)
**Indexes:** uniqueIndex on `dealId` (`deal_fitness_scores_deal_id_idx`)
**Note:** Column name typo: `readnessFitDetected` should be `readinessFitDetected`.

---

## Section 3: Relations Map

| Defining Table | Relation Name | Type | Related Table | Fields → References | Used in Queries |
|----------------|--------------|------|---------------|--------------------|-|
| companies | contacts | one-to-many | contacts | — | Yes (API joins) |
| companies | deals | one-to-many | deals | — | Yes |
| companies | leadScores | one-to-many | leadScores | — | UNKNOWN — leadScores orphaned from API |
| contacts | company | many-to-one | companies | companyId → id | Yes |
| contacts | activities | one-to-many | activities | — | Yes |
| deals | company | many-to-one | companies | companyId → id | Yes |
| deals | primaryContact | many-to-one | contacts | primaryContactId → id | Yes |
| deals | assignedAe | many-to-one | teamMembers | assignedAeId → id | Yes (relationName: "aeDeals") |
| deals | milestones | one-to-many | dealMilestones | — | UNKNOWN — dealMilestones orphaned from API |
| deals | meddpicc | one-to-one | meddpiccFields | id → dealId | Yes |
| deals | stageHistory | one-to-many | dealStageHistory | — | Yes |
| deals | activities | one-to-many | activities | — | Yes |
| deals | callTranscripts | one-to-many | callTranscripts | — | Yes |
| deals | notifications | one-to-many | notifications | — | Yes |
| teamMembers | aeDeals | one-to-many | deals | — (relationName: "aeDeals") | Yes |
| teamMembers | activities | one-to-many | activities | — | Yes |
| teamMembers | agentConfigs | one-to-many | agentConfigs | — | Yes |
| teamMembers | notifications | one-to-many | notifications | — | Yes |
| fieldQueries | cluster | many-to-one | observationClusters | clusterId → id | Yes |
| fieldQueries | questions | one-to-many | fieldQueryQuestions | — | Yes |
| fieldQueryQuestions | query | many-to-one | fieldQueries | queryId → id | Yes |
| fieldQueryQuestions | targetMember | many-to-one | teamMembers | targetMemberId → id | Yes |
| fieldQueryQuestions | deal | many-to-one | deals | dealId → id | Yes |
| fieldQueryQuestions | account | many-to-one | companies | accountId → id | Yes |
| knowledgeArticles | (empty) | — | — | — | N/A |
| customerMessages | company | many-to-one | companies | companyId → id | Yes |
| customerMessages | contact | many-to-one | contacts | contactId → id | Yes |
| customerMessages | deal | many-to-one | deals | dealId → id | Yes |
| accountHealth | company | many-to-one | companies | companyId → id | Yes |
| accountHealth | deal | many-to-one | deals | dealId → id | Yes |
| dealFitnessEvents | deal | many-to-one | deals | dealId → id | Yes |
| dealFitnessEvents | contact | many-to-one | contacts | contactId → id | UNKNOWN |
| dealFitnessScores | deal | many-to-one | deals | dealId → id | Yes |

**Tables with NO relations defined:** observationClusters, observations, supportFunctionMembers, observationRouting, crossAgentFeedback, systemIntelligence, managerDirectives, resources, playbookIdeas, influenceScores, agentActionsLog, emailSequences, emailSteps, callAnalyses, agentConfigs (has implicit via teamMembers), agentConfigVersions, feedbackRequests, leadScores (referenced IN companiesRelations but has no own relations), notifications (referenced IN dealsRelations/teamMembersRelations but has no own)

---

## Section 4: JSONB Column Inventory

60 JSONB columns across all tables. Key findings organized by severity:

### SHAPE DRIFT (Critical — different shapes between seed files or between seeds and API)

| Table.Column | Issue |
|-------------|-------|
| `callAnalyses.budgetSignals` | `Array<{ signal, strength }>` in seed.ts vs `string[]` in seed-transcripts-resources.ts |
| `callAnalyses.competitiveMentions` | `Array<{ competitor, context }>` in seed.ts vs `string[]` in seed-transcripts-resources.ts |
| `callAnalyses.questionQuality` | `{ openEnded, closedEnded, discovery }` in seed.ts vs `{ score, insights }` in seed-transcripts-resources.ts |
| `callAnalyses.meddpiccExtractions` | `{ painIdentified: bool, championSignal: bool, budgetDiscussed: bool }` in seed.ts vs `{ metrics?: string, economic_buyer?: string, ... }` in seed-transcripts-resources.ts |
| `callAnalyses.stakeholdersMentioned` | `Array<{ name, sentiment }>` in seed.ts vs `Array<{ name, title, sentiment }>` in seed-transcripts-resources.ts |
| `callTranscripts.participants` | `Array<{ name, role }>` in seed.ts vs `Array<{ name, role, company? }>` in seed-deal-fitness.ts; `role` values inconsistent ("AE" vs "Account Executive") |
| `activities.metadata` | Polymorphic: 7+ distinct shapes depending on activity type. `call_prep` ranges from `{ source: "call_prep" }` to a deeply nested brief object |
| `agentConfigVersions.outputPreferences` | Normal config shape vs cross-agent update shape `{ crossAgentUpdate: true, fromUser, fromRole }` |
| `observations.extractedEntities` | Array in observations API, empty object `{}` in playbook API |

### NEVER POPULATED (Dead columns)

| Table.Column | Notes |
|-------------|-------|
| `companies.enrichmentData` | Defined but never written in any seed or API |
| `agentActionsLog.inputData` | Dead table — never inserted into |
| `agentActionsLog.outputData` | Dead table — never inserted into |

### NO TYPESCRIPT TYPES

**0 out of 60 JSONB columns have formal TypeScript type/interface definitions.** All shapes are implicit, enforced only by the code that writes them (seeds or Claude AI output via prompts).

### Representative Shapes (selected key columns)

**deals.closeFactors:**
```ts
Array<{ id: string; label: string; category: string; source: "ai_suggested"|"rep_added"|"fixed_chip"; confirmed: boolean; evidence: string|null; repNote: string|null }>
```

**customerMessages.responseKit:**
```ts
{ message_analysis: { category: string; urgency: string; sentiment: string; underlying_concern: string }; similar_resolutions: Array<{ company: string; situation: string; outcome: string; relevance: string }>; recommended_resources: Array<{ title: string; reason: string }>; draft_reply: string; internal_notes: string }
```

**accountHealth.healthFactors:**
```ts
{ adoption: number; engagement: number; sentiment: number; support_health: number }
```

**dealFitnessScores.stakeholderEngagement:**
```ts
{ totalStakeholders: number; benchmark: { avgAtStage: number; wonDealAvg: number; position: string }; departmentsEngaged: number; departmentList: string[]; contactTimeline: Array<{ contactName: string; title: string; role: string; firstActiveWeek: number; weeksActive: number[]; callsJoined: number[]; emailsInvolved: number; introducedBy: string|null }> }
```

**observations.aiClassification:**
```ts
{ signals: Array<{ type: string; confidence: number; summary: string; competitor_name?: string }>; sentiment: string; urgency: string; entities?: Array<{ type: string; text: string; normalized: string; confidence: number }>; linked_accounts?: Array<{ name: string; confidence: number }>; linked_deals?: Array<{ name: string; confidence: number }>; needs_clarification?: boolean }
```

(Full shape details for all 60 columns were audited; only representative examples shown above to keep the document readable. Shapes for every column are documented in the subagent audit records.)

---

## Section 5: Schema Health Flags

### 1. Orphaned Tables (no API route references)

| Table | Seeded? | Notes |
|-------|---------|-------|
| `agentActionsLog` | DELETE only | Dead table. Never inserted into. Entire `agentActionTypeEnum` is dead code. |
| `emailSequences` | Yes | Likely read by outreach page server component directly |
| `emailSteps` | Yes | Same as emailSequences |
| `leadScores` | Yes | Seeded but never queried |
| `influenceScores` | Yes | Confirmed UI-only per CLAUDE.md |
| `dealMilestones` | Yes | May be read by server component (UNVERIFIED) |

### 2. Missing Foreign Keys

| Column | Probably References | Why No FK |
|--------|-------------------|-----------|
| `observationRouting.targetMemberId` | supportFunctionMembers.id | Intentional — comment in schema says "no FK since different table" |
| `fieldQueries.initiatedBy` | teamMembers.id OR supportFunctionMembers.id | Intentional — can reference either table |
| `playbookIdeas.approvedBy` | teamMembers.id | Stored as text, should probably be uuid with FK |
| `observations.linkedAccountIds` | companies.id | uuid[] with no FK (array FKs not supported in PG) |
| `observations.linkedDealIds` | deals.id | uuid[] with no FK |
| `knowledgeArticles.relatedCompanyIds` | companies.id | uuid[] with no FK |
| `playbookIdeas.testGroup` / `controlGroup` | teamMembers.id | text[] arrays storing user IDs |
| `playbookIdeas.testGroupDeals` / `controlGroupDeals` | deals.id | text[] arrays storing deal IDs |
| `systemIntelligence.vertical` | verticalEnum | Uses plain text instead of verticalEnum |
| `managerDirectives.priority` | priorityEnum | Uses plain text instead of priorityEnum |

### 3. Enum Mismatches

| Enum | Total Values | Used Values | Unused |
|------|-------------|-------------|--------|
| agentActionTypeEnum | 8 | 0 | ALL 8 (dead enum) |
| enrichmentSourceEnum | 3 | 1 | `apollo`, `clearbit` |
| transcriptSourceEnum | 3 | 1 | `uploaded`, `recorded` |
| transcriptStatusEnum | 4 | 1 | `pending`, `transcribing`, `analyzing` |
| activityTypeEnum | 15 | 12 | `task_completed`, `document_shared`, `agent_feedback` |
| configChangedByEnum | 3 | 2 | `ai` |
| feedbackStatusEnum | 4 | 3 | `rejected` |
| emailSequenceStatusEnum | 4 | 3 | `completed` |
| emailStepStatusEnum | 7 | 6 | `clicked` |
| fieldQueryQuestionStatusEnum | 4 | 3 | `skipped` |

### 4. JSONB Shape Drift

9 columns with confirmed shape drift between seed files or between seeds and API (detailed in Section 4). The most severe are in `callAnalyses` where the same column stores completely different structures depending on which seed populated it.

### 5. Missing Timestamps

Tables WITHOUT `updatedAt`:
- `dealStageHistory` — append-only, acceptable
- `activities` — append-only, acceptable
- `agentActionsLog` — dead table
- `agentConfigVersions` — append-only, acceptable
- `leadScores` — append-only, acceptable
- `notifications` — rarely updated, minor
- `observationRouting` — has acknowledgedAt/resolvedAt instead
- `crossAgentFeedback` — append-only, acceptable
- `managerDirectives` — has expiresAt but no updatedAt (could be an issue if directives are edited)
- `supportFunctionMembers` — reference data, minor
- `fieldQueryQuestions` — has respondedAt instead

Tables WITHOUT `createdAt`: None — all tables have createdAt.

### 6. Nullable Columns That Shouldn't Be

| Column | Always Populated In | Notes |
|--------|-------------------|-------|
| `deals.dealValue` | All seeds, all API writes | Marked nullable but always has a value |
| `deals.assignedAeId` | All seeds | Every deal has an AE |
| `deals.vertical` | Schema has `.notNull()` | Already correct |
| `contacts.email` | All seeds | Marked nullable but always populated in seeds |

### 7. Non-Nullable Columns With No Default

These columns require explicit values on INSERT:

| Table | Columns Without Default |
|-------|------------------------|
| teamMembers | name, email, role |
| companies | name, industry |
| contacts | firstName, lastName, companyId |
| deals | name, companyId, vertical |
| dealMilestones | dealId, milestoneKey |
| meddpiccFields | dealId |
| dealStageHistory | dealId, toStage, changedBy |
| activities | teamMemberId, type |
| emailSequences | dealId, contactId, assignedAeId, name |
| emailSteps | sequenceId, stepNumber, subject, body |
| callTranscripts | dealId, title, date |
| callAnalyses | transcriptId |
| agentConfigs | teamMemberId, agentName, roleType, instructions |
| agentConfigVersions | agentConfigId, version, instructions, changedBy |
| feedbackRequests | fromMemberId, fromAgentConfigId, targetRoleType, description, requestType |
| notifications | teamMemberId, type, title, message |
| observationClusters | title, signalType |
| observations | observerId, rawInput |
| supportFunctionMembers | name, role, function |
| observationRouting | observationId, targetFunction, signalType |
| fieldQueries | initiatedBy, rawQuestion, expiresAt |
| fieldQueryQuestions | queryId, targetMemberId, questionText, chips |
| crossAgentFeedback | sourceMemberId, targetMemberId, content |
| systemIntelligence | insightType, title, insight |
| managerDirectives | authorId, scope, directive, priority, category |
| resources | title, type |
| playbookIdeas | originatorId, title, hypothesis, category |
| knowledgeArticles | title, articleType, content |
| customerMessages | companyId, subject, body, channel, receivedAt |
| accountHealth | companyId, dealId, contractStatus |
| dealFitnessEvents | dealId, fitCategory, eventKey, eventLabel |
| dealFitnessScores | dealId |

### 8. Column Name Typo

`dealFitnessScores.readnessFitDetected` — should be `readinessFitDetected` (missing "i"). The schema column name is `readness_fit_detected` in the database.

---

## Section 6: Table Dependency Order (Topological Sort)

Tables listed in the order they must be seeded, respecting FK constraints:

```
1. teamMembers          — no FKs
2. supportFunctionMembers — no FKs
3. companies            — no FKs
4. contacts             — FK: companies
5. deals                — FK: companies, contacts, teamMembers
6. dealMilestones       — FK: deals
7. meddpiccFields       — FK: deals
8. dealStageHistory     — FK: deals
9. activities           — FK: deals, contacts, teamMembers
10. emailSequences      — FK: deals, contacts, teamMembers
11. emailSteps          — FK: emailSequences
12. callTranscripts     — FK: deals
13. callAnalyses        — FK: callTranscripts
14. agentConfigs        — FK: teamMembers
15. agentConfigVersions — FK: agentConfigs
16. feedbackRequests    — FK: teamMembers, agentConfigs
17. agentActionsLog     — FK: agentConfigs, deals
18. leadScores          — FK: companies, deals
19. notifications       — FK: teamMembers, deals
20. observationClusters — no FKs
21. observations        — FK: teamMembers, observationClusters
22. observationRouting  — FK: observations (targetMemberId has no FK)
23. fieldQueries        — FK: observationClusters (initiatedBy has no FK)
24. fieldQueryQuestions  — FK: fieldQueries, teamMembers, deals, companies
25. crossAgentFeedback  — FK: teamMembers, deals, companies
26. systemIntelligence  — FK: companies
27. managerDirectives   — FK: teamMembers
28. resources           — no FKs
29. playbookIdeas       — FK: teamMembers, observations
30. influenceScores     — FK: teamMembers
31. knowledgeArticles   — no FKs
32. customerMessages    — FK: companies, contacts, deals
33. accountHealth       — FK: companies, deals
34. dealFitnessEvents   — FK: deals, contacts
35. dealFitnessScores   — FK: deals
```

**No circular dependencies found.** The graph is a DAG (directed acyclic graph).

---

## Section 7: Summary Statistics

| Metric | Count |
|--------|-------|
| Total tables | 35 |
| Total enums | 25 |
| Total columns (all tables) | 352 |
| Total JSONB columns | 60 |
| Total FK relationships | 42 |
| Unique indexes (beyond PK) | 3 (meddpiccFields.dealId, callAnalyses.transcriptId, dealFitnessScores.dealId) |
| Tables with no API route references | 6 (agentActionsLog, emailSequences, emailSteps, leadScores, influenceScores, dealMilestones) |
| Tables with no seed script references | 0 (all tables are seeded, though agentActionsLog only has DELETE) |
| Dead tables (no seed INSERT + no API) | 1 (agentActionsLog) |
| Dead enums (no value ever written) | 1 (agentActionTypeEnum — all 8 values unused) |
| Enum values confirmed unused | 22 across 10 enums |
| JSONB columns with shape drift | 9 |
| JSONB columns never populated | 3 |
| JSONB columns with TypeScript types | 0 |
| Column name typos | 1 (readnessFitDetected) |

---

## Section 8: Files Phase 3 Should Read

Phase 3 (API Route & Claude AI Inventory) should prioritize these files:

### High Priority — Routes with complex JSONB writes + Claude AI generation

1. `apps/web/src/app/api/observations/route.ts` — Most complex route. Claude generates aiClassification, aiGiveback, extractedEntities. Creates clusters, routing, notifications, playbook ideas. Multiple Anthropic client instances.
2. `apps/web/src/app/api/deals/close-analysis/route.ts` — Claude generates closeAiAnalysis (complex JSONB). Module-level Anthropic client.
3. `apps/web/src/app/api/customer/response-kit/route.ts` — Claude generates responseKit JSONB. Cross-references knowledge articles and account health.
4. `apps/web/src/app/api/agent/call-prep/route.ts` — 8 intelligence layers. Largest prompt construction. maxDuration: 120s.
5. `apps/web/src/app/api/field-queries/route.ts` — 3 separate Anthropic client instances. Claude generates aiAnalysis, question distribution.
6. `apps/web/src/app/api/field-queries/respond/route.ts` — Claude generates giveBack, aggregatedAnswer.

### Medium Priority — Routes that read heavily from JSONB

7. `apps/web/src/app/api/agent/draft-email/route.ts` — Reads from many tables with JSONB columns to construct email context.
8. `apps/web/src/app/api/deals/stage/route.ts` — Writes closeFactors/winFactors, creates stage history and activities.
9. `apps/web/src/app/api/transcript-pipeline/route.ts` — Triggers pipeline, fetches full deal context.

### Actor Files (Claude API via raw fetch)

10. `apps/web/src/actors/transcript-pipeline.ts` — Parallel Claude calls, writes MEDDPICC + observations + learnings.
11. `apps/web/src/actors/intelligence-coordinator.ts` — Claude synthesis of cross-deal patterns.

### Post-Sale Routes

12. `apps/web/src/app/api/book/route.ts` — Complex joins across accountHealth, customerMessages, companies, deals.
13. `apps/web/src/app/api/customer/qbr-prep/route.ts` — Claude generates structured QBR agenda.
14. `apps/web/src/app/api/customer/outreach-email/route.ts` — Claude generates check-in emails.

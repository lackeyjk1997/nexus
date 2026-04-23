# 02 — Database Schema

> **Reconciliation banner (added 2026-04-22).** Status: **FROZEN v1 schema analysis.** 37 tables / 25 enums / no RLS / 4 unique indexes described here is the v1 baseline that v2 rebuilt against per §2.2 hygiene. v2 schema lives at `~/nexus-v2/packages/db/src/schema.ts` (41 tables as of migration 0005, RLS 4-pattern across all tables, all FKs with explicit ON DELETE semantics, all enum-shaped columns promoted to Postgres enums). Not load-bearing for Phase 3+; preserved as the "what v2 replaces" reference. Use only when researching why a specific v2 schema choice was made.

---

Schema at commit `c71d2b6` (2026-04-21). Single file: [packages/db/src/schema.ts](../../packages/db/src/schema.ts) (1110 lines). DB export: [packages/db/src/index.ts](../../packages/db/src/index.ts). Migrations: `packages/db/drizzle/0000_*.sql` through `0011_*.sql` plus `meta/` snapshots.

**Top-line facts:**
- 37 tables, 25 enums (matches 01-INVENTORY.md Section 3).
- **No RLS policies.** Every table's `isRLSEnabled` is `false` in the migration snapshots. Supabase default row-level security is off.
- **4 unique indexes total** (all on FKs for 1:1 relationships): `call_analyses_transcript_id_idx`, `meddpicc_deal_id_idx`, `deal_fitness_scores_deal_id_idx`, `deal_agent_states_deal_id_idx`. Plus one table-level unique constraint: `coordinator_patterns.pattern_id`.
- **No regular indexes** defined beyond PKs and the 4 unique indexes above. Every FK column is un-indexed — query performance under load will suffer.
- **All FK references use the Drizzle default ON DELETE NO ACTION** — no cascades, no `onDelete` specified anywhere. Demo reset relies on manual delete ordering instead of cascade.
- **All PKs are `uuid DEFAULT gen_random_uuid()`** — no sequential IDs.

---

## Section 1: Enums

25 enums. `verticalEnum` is by far the most-referenced (9 columns).

| # | Enum | PG name | Values | Tables/columns that use it |
|---|------|---------|--------|----------------------------|
| 1 | `roleEnum` | `role` | `AE`, `BDR`, `SA`, `CSM`, `MANAGER` | `team_members.role` |
| 2 | `verticalEnum` | `vertical` | `healthcare`, `financial_services`, `manufacturing`, `retail`, `technology`, `general` | `team_members.vertical_specialization`, `companies.industry`, `deals.vertical`, `cross_agent_feedback.vertical` |
| 3 | `pipelineStageEnum` | `pipeline_stage` | `new_lead`, `qualified`, `discovery`, `technical_validation`, `proposal`, `negotiation`, `closing`, `closed_won`, `closed_lost` | `deals.stage`, `deal_stage_history.from_stage`, `deal_stage_history.to_stage` |
| 4 | `forecastCategoryEnum` | `forecast_category` | `pipeline`, `upside`, `commit`, `closed` | `deals.forecast_category` |
| 5 | `productEnum` | `product` | `claude_api`, `claude_enterprise`, `claude_team` | `deals.product` |
| 6 | `leadSourceEnum` | `lead_source` | `inbound`, `outbound`, `plg_upgrade`, `partner`, `event` | `deals.lead_source` |
| 7 | `contactRoleEnum` | `contact_role` | `champion`, `economic_buyer`, `technical_evaluator`, `end_user`, `blocker`, `coach` | `contacts.role_in_deal` |
| 8 | `activityTypeEnum` | `activity_type` | `email_sent`, `email_received`, `call_completed`, `meeting_scheduled`, `meeting_completed`, `note_added`, `stage_changed`, `task_completed`, `document_shared`, `call_prep`, `email_draft`, `call_analysis`, `observation`, `agent_feedback`, `competitive_intel` | `activities.type` |
| 9 | `enrichmentSourceEnum` | `enrichment_source` | `apollo`, `clearbit`, `simulated` | `companies.enrichment_source` |
| 10 | `milestoneSourceEnum` | `milestone_source` | `manual`, `transcript`, `email`, `ai_detected` | `deal_milestones.source` |
| 11 | `stageChangedByEnum` | `stage_changed_by` | `ai`, `human` | `deal_stage_history.changed_by` |
| 12 | `emailSequenceStatusEnum` | `email_sequence_status` | `draft`, `active`, `paused`, `completed` | `email_sequences.status` |
| 13 | `emailStepStatusEnum` | `email_step_status` | `draft`, `approved`, `sent`, `opened`, `clicked`, `replied`, `bounced` | `email_steps.status` |
| 14 | `transcriptSourceEnum` | `transcript_source` | `uploaded`, `recorded`, `simulated` | `call_transcripts.source` |
| 15 | `transcriptStatusEnum` | `transcript_status` | `pending`, `transcribing`, `analyzing`, `complete` | `call_transcripts.status` |
| 16 | `agentRoleTypeEnum` | `agent_role_type` | `ae`, `bdr`, `sa`, `csm`, `manager` | `agent_configs.role_type`, `feedback_requests.target_role_type` |
| 17 | `configChangedByEnum` | `config_changed_by` | `user`, `ai`, `feedback_loop` | `agent_config_versions.changed_by` |
| 18 | `feedbackRequestTypeEnum` | `feedback_request_type` | `add_info`, `change_format`, `add_question`, `remove_field`, `process_change` | `feedback_requests.request_type` |
| 19 | `feedbackStatusEnum` | `feedback_status` | `pending`, `approved`, `rejected`, `auto_applied` | `feedback_requests.status` |
| 20 | `priorityEnum` | `priority` | `low`, `medium`, `high`, `urgent` | `feedback_requests.priority`, `notifications.priority` |
| 21 | `agentActionTypeEnum` | `agent_action_type` | `email_drafted`, `lead_scored`, `research_generated`, `transcript_analyzed`, `deal_stage_recommended`, `meeting_scheduled`, `feedback_processed`, `instruction_updated` | `agent_actions_log.action_type` |
| 22 | `notificationTypeEnum` | `notification_type` | `deal_at_risk`, `handoff_request`, `agent_recommendation`, `feedback_received`, `stage_change`, `meeting_reminder`, `approval_needed`, `system_intelligence` | `notifications.type` |
| 23 | `observationRoutingStatusEnum` | `observation_routing_status` | `sent`, `acknowledged`, `in_progress`, `resolved` | `observation_routing.status` |
| 24 | `fieldQueryStatusEnum` | `field_query_status` | `active`, `answered`, `expired` | `field_queries.status` |
| 25 | `fieldQueryQuestionStatusEnum` | `field_query_question_status` | `pending`, `answered`, `skipped`, `expired` | `field_query_questions.status` |

**Enum-shaped columns stored as plain `text` instead** (candidates for enum migration — see Section 4):
- `observation_clusters.signal_type`, `.severity`, `.resolution_status`, `.target_function`
- `observations.status`
- `observation_routing.signal_type`, `.target_function`
- `support_function_members.role`, `.function`
- `manager_directives.scope`, `.priority`, `.category`, `.target_role`, `.vertical`
- `system_intelligence.vertical`, `.insight_type`, `.status`
- `resources.type`
- `playbook_ideas.originated_from`, `.category`, `.status`, `.vertical`
- `influence_scores.dimension`, `.tier`, `.vertical`
- `knowledge_articles.article_type`
- `customer_messages.channel`, `.priority`, `.status`, `.ai_category`
- `account_health.health_trend`, `.contract_status`
- `deal_fitness_events.fit_category`, `.status`, `.lifecycle_phase`, `.detected_by`
- `deal_fitness_scores.velocity_trend`
- `deal_agent_states.pipeline_status`, `.pipeline_step`
- `coordinator_patterns.status`, `.signal_type`, `.vertical`
- `field_query_questions.response_type`

Every `text` column above has its allowed values inlined as code comments in `schema.ts`. This is Drizzle's documented pattern when the author didn't want to commit to an enum yet — and the cost is Postgres doesn't enforce any of them.

---

## Section 2: Tables (alphabetical)

Column format: `name (type, nullable?, default) — description`. "nullable?" shown only when `.notNull()` is NOT present (Drizzle default is nullable).

### `account_health`
**Purpose:** Post-close account state for Customer Success. One row per (company, deal) pair representing a closed-won contract. Tracks health score (0–100), contract stage, ARR, use-case adoption, expansion whitespace, renewal timing, and surfaces risk/expansion/proactive signals for Sarah Chen's "My Book" page. Populated by `seed-book.ts`; 18 real demo accounts seeded.

**Columns:**
- `id uuid PK` — `gen_random_uuid()`.
- `company_id uuid NOT NULL` — FK → `companies.id`.
- `deal_id uuid NOT NULL` — FK → `deals.id`. The closed_won deal this health record is tied to.
- `health_score integer DEFAULT 80` — 0–100 composite score.
- `health_trend text DEFAULT 'stable'` — `improving | stable | declining | critical` (text, not enum).
- `health_factors jsonb` — breakdown behind the score.
- `contract_status text NOT NULL` — `onboarding | active | renewal_window | at_risk | churned`.
- `contract_start timestamp` — contract start date.
- `renewal_date timestamp` — upcoming renewal date (drives renewal-window logic).
- `arr numeric(12,2)` — annual recurring revenue.
- `products_purchased text[]` — product list.
- `usage_metrics jsonb` — seats, API calls, trend data.
- `last_touch_date timestamp` — last AE contact.
- `days_since_touch integer` — days since last touch.
- `key_stakeholders jsonb` — array of `{ name, role, status (engaged/silent/new/departed) }`.
- `expansion_signals jsonb` — expansion opportunities.
- `risk_signals jsonb` — risk indicators.
- `contracted_use_cases jsonb` — per-team use-case adoption bars. Added in migration 0006.
- `expansion_map jsonb` — department whitespace + recommended products. Added in migration 0006.
- `proactive_signals jsonb` — product releases/industry/customer news relevant to the account. Added in migration 0006.
- `similar_situations jsonb` — cross-book pattern cards. Added in migration 0007.
- `recommended_resources jsonb` — KB article pointers. Added in migration 0007.
- `next_qbr_date timestamp` — scheduled QBR date.
- `onboarding_complete boolean DEFAULT false`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**PK:** `id`. **FKs:** `company_id → companies.id` (NO ACTION), `deal_id → deals.id` (NO ACTION). **Indexes:** none beyond PK. **Unique:** none. **RLS:** disabled.

### `activities`
**Purpose:** Unified activity timeline across a deal. Any action worth displaying to the AE — emails, calls, meetings, AI agent actions, observations — lands here. The `type` column uses `activity_type` enum; legacy rows were written as `type='note_added'` with `metadata.source='call_prep'` (etc.), which `apps/web/src/components/activity-feed.tsx:45` still compensates for via `getEffectiveType()`.

**Columns:**
- `id uuid PK`.
- `deal_id uuid` (nullable) — FK → `deals.id`. Nullable because some activities (agent actions like email drafts without a deal) are deal-less.
- `contact_id uuid` (nullable) — FK → `contacts.id`.
- `team_member_id uuid NOT NULL` — FK → `team_members.id`. Whose activity this is.
- `type activity_type NOT NULL` — enum value (see §1 #8).
- `subject text` — short title.
- `description text` — body.
- `metadata jsonb` — bag of extras; legacy `source` field lives here.
- `created_at timestamp NOT NULL DEFAULT now()`.

**PK:** `id`. **FKs:** `deal_id`, `contact_id`, `team_member_id`. **Indexes:** none. **Unique:** none.

### `agent_actions_log`
**Purpose:** Audit trail of every AI agent action (email drafted, call prep generated, MEDDPICC extracted, etc.). Records input, output, and whether the human overrode the result.

**Columns:**
- `id uuid PK`.
- `agent_config_id uuid NOT NULL` — FK → `agent_configs.id`.
- `action_type agent_action_type NOT NULL` — enum (see §1 #21).
- `description text`.
- `input_data jsonb`.
- `output_data jsonb`.
- `was_overridden boolean DEFAULT false`.
- `override_reason text`.
- `deal_id uuid` — FK → `deals.id`.
- `created_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `agent_config_id`, `deal_id`. **Indexes:** none.

### `agent_config_versions`
**Purpose:** Version history for an `agent_configs` row. Every change (user edit, AI suggestion applied, feedback loop commit) creates a row here so changes are auditable and reversible.

**Columns:**
- `id uuid PK`.
- `agent_config_id uuid NOT NULL` — FK → `agent_configs.id`.
- `version integer NOT NULL` — monotonic per config.
- `instructions text NOT NULL` — snapshot of the config at this version.
- `output_preferences jsonb` — snapshot.
- `changed_by config_changed_by NOT NULL` — `user | ai | feedback_loop` (see §1 #17).
- `change_reason text` — free text.
- `created_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `agent_config_id`.

### `agent_configs`
**Purpose:** Per-team-member AI agent configuration. One row per (team_member, agent). Holds the full natural-language instruction prompt and output preferences (verbose/terse, industry focus, tone) that customize how the AE's agent responds.

**Columns:**
- `id uuid PK`.
- `team_member_id uuid NOT NULL` — FK → `team_members.id`.
- `agent_name text NOT NULL`.
- `role_type agent_role_type NOT NULL` — `ae | bdr | sa | csm | manager` (see §1 #16).
- `instructions text NOT NULL` — the full prompt the agent uses.
- `output_preferences jsonb` — verbosity, industry focus (array), etc.
- `version integer DEFAULT 1`.
- `is_active boolean DEFAULT true`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `team_member_id`.

### `call_analyses`
**Purpose:** AI-extracted insights from a `call_transcripts` row. 1:1 with transcript (enforced by unique index). Stores summary, pain points, MEDDPICC extractions, coaching insights, talk ratio, question quality — the deliverable of the `/api/analyze` streaming endpoint.

**Columns:**
- `id uuid PK`.
- `transcript_id uuid NOT NULL` — FK → `call_transcripts.id`. **UNIQUE** via index.
- `summary text`.
- `pain_points jsonb`.
- `next_steps jsonb`.
- `stakeholders_mentioned jsonb`.
- `budget_signals jsonb`.
- `competitive_mentions jsonb`.
- `talk_ratio jsonb`.
- `question_quality jsonb`.
- `call_quality_score integer`.
- `meddpicc_extractions jsonb`.
- `coaching_insights jsonb`.
- `created_at timestamp NOT NULL DEFAULT now()`.

**Indexes:** `call_analyses_transcript_id_idx` (unique) on `transcript_id`.

### `call_transcripts`
**Purpose:** Raw call transcripts for a deal. One row per recorded call. The `pipeline_processed` flag gates whether `transcript-pipeline` actor has already run for this row (used by demo and deduplication logic).

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`.
- `title text NOT NULL`.
- `date timestamp NOT NULL`.
- `duration_seconds integer`.
- `participants jsonb` — array of `{ name, role }`.
- `transcript_text text` — raw transcript body.
- `source transcript_source DEFAULT 'simulated'` — enum (§1 #14).
- `status transcript_status DEFAULT 'complete'` — enum (§1 #15).
- `pipeline_processed boolean DEFAULT false`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `deal_id`.

### `companies`
**Purpose:** Account records. Every deal belongs to a company; post-close account health also keys off this table. `industry` uses `vertical` enum.

**Columns:**
- `id uuid PK`.
- `name text NOT NULL`.
- `domain text`.
- `industry vertical NOT NULL` — enum (§1 #2).
- `employee_count integer`.
- `annual_revenue text` — stored as string (formatted, not numeric).
- `tech_stack text[]`.
- `hq_location text`.
- `description text`.
- `enrichment_source enrichment_source DEFAULT 'simulated'` — enum (§1 #9).
- `enrichment_data jsonb`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `contacts`
**Purpose:** People at companies. FK-locked to exactly one company (no multi-company contact support). `role_in_deal` tags them against MEDDPICC slots.

**Columns:**
- `id uuid PK`.
- `first_name text NOT NULL`.
- `last_name text NOT NULL`.
- `email text`.
- `phone text`.
- `title text`.
- `linkedin_url text`.
- `company_id uuid NOT NULL` — FK → `companies.id`.
- `role_in_deal contact_role` — enum (§1 #7).
- `is_primary boolean DEFAULT false`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `company_id`.

### `coordinator_patterns`
**Purpose:** Persisted cross-deal patterns detected by the `intelligenceCoordinator` Rivet actor. Survives actor destruction and demo reset so the "Act 2" coordinator-detected intel card stays visible. Added in migration 0011.

**Columns:**
- `id uuid PK`.
- `pattern_id text NOT NULL UNIQUE` — the actor's internal pattern key (e.g. `healthcare:competitive_intel:microsoft-dax`). Unique constraint enforced at table level.
- `signal_type text NOT NULL`.
- `vertical text`.
- `competitor text` — non-null only for competitive-intel patterns.
- `deal_ids text[]`.
- `deal_names text[]`.
- `synthesis text` — Claude-written pattern summary.
- `recommendations jsonb`.
- `arr_impact integer DEFAULT 0`.
- `deal_count integer NOT NULL DEFAULT 0`.
- `status text DEFAULT 'active'`.
- `detected_at timestamp NOT NULL DEFAULT now()`.
- `synthesized_at timestamp`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**Unique:** `pattern_id`.

### `cross_agent_feedback`
**Purpose:** One team-member's recommendation TO another team-member (typically about a specific deal or account). Used by agent memory / call prep to include "Alex Kim says watch out for their CISO" style notes.

**Columns:**
- `id uuid PK`.
- `source_member_id uuid NOT NULL` — FK → `team_members.id`.
- `target_member_id uuid NOT NULL` — FK → `team_members.id`.
- `content text NOT NULL`.
- `deal_id uuid` — FK → `deals.id`.
- `account_id uuid` — FK → `companies.id`.
- `vertical vertical` — enum (§1 #2).
- `created_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `source_member_id`, `target_member_id`, `deal_id`, `account_id`.

### `customer_messages`
**Purpose:** Inbound post-close customer communications (email, support ticket, slack note, meeting note). Each gets AI-categorized and optionally augmented with a `responseKit` jsonb containing AI-generated response + similar resolutions + recommended resources.

**Columns:**
- `id uuid PK`.
- `company_id uuid NOT NULL` — FK → `companies.id`.
- `contact_id uuid` — FK → `contacts.id`.
- `deal_id uuid` — FK → `deals.id`.
- `subject text NOT NULL`.
- `body text NOT NULL`.
- `channel text NOT NULL` — `email | support_ticket | slack | meeting_note` (text).
- `received_at timestamp NOT NULL`.
- `priority text DEFAULT 'medium'`.
- `status text DEFAULT 'pending'` — `pending | kit_ready | responded | resolved`.
- `response_kit jsonb` — AI-generated kit.
- `responded_at timestamp`.
- `response_text text`.
- `ai_category text`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `company_id`, `contact_id`, `deal_id`.

### `deal_agent_states`
**Purpose:** Persistent Supabase-backed mirror of the `dealAgent` Rivet actor's state. One row per deal (unique index). Exists because Rivet in-memory state evaporates on actor destruction, serverless re-cold-start, or Rivet Cloud restart. Added in migration 0010; `intervention_dismissed` columns added in 0011.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`. **UNIQUE.**
- `interaction_count integer NOT NULL DEFAULT 0`.
- `last_interaction_date timestamp`.
- `last_interaction_summary text`.
- `learnings jsonb NOT NULL DEFAULT '[]'::jsonb` — array of strings.
- `risk_signals jsonb NOT NULL DEFAULT '[]'::jsonb` — array of strings.
- `competitive_context jsonb`.
- `coordinated_intel jsonb NOT NULL DEFAULT '[]'::jsonb` — pushed from coordinator actor.
- `brief_ready jsonb` — auto-generated call brief payload.
- `brief_pending boolean NOT NULL DEFAULT false`.
- `pipeline_status text NOT NULL DEFAULT 'idle'` — `idle | running | complete | failed` (text).
- `pipeline_step text` — current step name during processing.
- `pipeline_details text`.
- `intervention_dismissed boolean NOT NULL DEFAULT false`.
- `intervention_dismissed_at timestamp`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**Indexes:** `deal_agent_states_deal_id_idx` (unique) on `deal_id`.

### `deal_fitness_events`
**Purpose:** One row per inspectable event in the oDeal framework (25 events total per deal). Status `detected` / `not_yet` / `negative`. Detected events cite specific transcript/email evidence. Populated by `/api/deal-fitness/analyze`.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`.
- `fit_category text NOT NULL` — `business_fit | emotional_fit | technical_fit | readiness_fit`.
- `event_key text NOT NULL` — machine key (e.g. `champion_defined`).
- `event_label text NOT NULL` — human label.
- `event_description text`.
- `status text NOT NULL DEFAULT 'not_yet'` — `detected | not_yet | negative`.
- `detected_at timestamp` — null when status ≠ `detected`.
- `lifecycle_phase text NOT NULL DEFAULT 'pre_sale'` — `pre_sale | onboarding | active | renewal`.
- `detection_sources text[]`.
- `source_references jsonb` — array of `{ type: transcript|email, id }`.
- `evidence_snippets jsonb` — short quotes.
- `confidence numeric(3,2)` — 0.00–9.99.
- `detected_by text DEFAULT 'ai'`.
- `contact_id uuid` — FK → `contacts.id`.
- `contact_name text`.
- `notes text`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `deal_id`, `contact_id`.

### `deal_fitness_scores`
**Purpose:** Rolled-up oDeal fitness score for a deal. 1:1 with deal (unique index). Stores per-category scores (business/emotional/technical/readiness) plus cached narrative jsonb (`stakeholderEngagement`, `buyerMomentum`, `conversationSignals`) surfaced on the `/deal-fitness` page.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`. **UNIQUE.**
- `business_fit_score integer DEFAULT 0`, `_detected`, `_total`.
- `emotional_fit_score integer DEFAULT 0`, `_detected`, `_total`.
- `technical_fit_score integer DEFAULT 0`, `_detected`, `_total`.
- `readiness_fit_score integer DEFAULT 0`, `_detected`, `_total`. **NOTE:** the TypeScript field for `readiness_fit_detected` is declared as `readnessFitDetected` (typo — missing "i") at schema.ts:998. The SQL column is correct.
- `overall_fitness integer DEFAULT 0`.
- `velocity_trend text DEFAULT 'stable'` — `accelerating | stable | decelerating | stalled`.
- `last_event_at timestamp`.
- `days_since_last_event integer`.
- `fit_imbalance_flag boolean DEFAULT false` — true when any two category scores differ by ≥ 30 pts.
- `events_this_week integer DEFAULT 0`.
- `events_last_week integer DEFAULT 0`.
- `benchmark_vs_won jsonb`.
- `stakeholder_engagement jsonb` — contacts × weeks grid + benchmark.
- `buyer_momentum jsonb` — response time trend, buyer-initiated ratio, commitments.
- `conversation_signals jsonb` — ownership-language trajectory, sentiment profile, `dealInsight`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**Indexes:** `deal_fitness_scores_deal_id_idx` (unique) on `deal_id`.

### `deal_milestones`
**Purpose:** Buyer-journey milestone tracker for each deal (e.g. "champion_identified", "economic_buyer_engaged"). Source is either manually entered, extracted from transcript, from email, or AI-detected.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`.
- `milestone_key text NOT NULL`.
- `is_completed boolean DEFAULT false`.
- `completed_at timestamp`.
- `source milestone_source DEFAULT 'manual'` — enum (§1 #10).
- `evidence text` — quote or description.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `deal_stage_history`
**Purpose:** Audit log of every stage transition for a deal. `changed_by` distinguishes AI-driven vs. human moves. Deletes nothing — fully append-only.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`.
- `from_stage pipeline_stage` (nullable, first transition has no `from`).
- `to_stage pipeline_stage NOT NULL`.
- `changed_by stage_changed_by NOT NULL` — `ai | human`.
- `reason text`.
- `created_at timestamp NOT NULL DEFAULT now()`.

### `deals`
**Purpose:** The central pipeline entity. One row per opportunity. Holds standard CRM fields plus MEDDPICC-adjacent close-analysis jsonb that captures win/loss factors once the deal closes.

**Columns:**
- `id uuid PK`.
- `name text NOT NULL`.
- `company_id uuid NOT NULL` — FK → `companies.id`.
- `primary_contact_id uuid` — FK → `contacts.id`.
- `assigned_ae_id uuid` — FK → `team_members.id`.
- `assigned_bdr_id uuid` — FK → `team_members.id`.
- `assigned_sa_id uuid` — FK → `team_members.id`.
- `stage pipeline_stage NOT NULL DEFAULT 'new_lead'`.
- `deal_value numeric(12,2)`.
- `currency text DEFAULT 'EUR'`.
- `close_date timestamp`.
- `win_probability integer DEFAULT 0` (0–100).
- `forecast_category forecast_category DEFAULT 'pipeline'`.
- `vertical vertical NOT NULL` — denormalized from `companies.industry` (intentional; allows per-deal override).
- `product product`.
- `lead_source lead_source`.
- `competitor text` — free text.
- `loss_reason text`.
- `close_competitor text` — competitor at close.
- `close_notes text`.
- `close_improvement text` — what we'd do differently.
- `win_turning_point text`.
- `win_replicable text` — tactic repeatable elsewhere.
- `close_ai_analysis jsonb` — Claude's close analysis payload.
- `close_factors jsonb`.
- `win_factors jsonb`.
- `close_ai_ran_at_timestamp timestamp` — when the close AI analysis was generated.
- `closed_at timestamp`.
- `stage_entered_at timestamp DEFAULT now()` — when the deal entered its current stage.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `email_sequences`
**Purpose:** Multi-step outbound email campaign for a deal/contact.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`.
- `contact_id uuid NOT NULL` — FK → `contacts.id`.
- `assigned_ae_id uuid NOT NULL` — FK → `team_members.id`.
- `name text NOT NULL`.
- `status email_sequence_status DEFAULT 'draft'` — enum (§1 #12).
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `email_steps`
**Purpose:** Individual email within a sequence. Tracks delivery, open, click, reply state + timestamps.

**Columns:**
- `id uuid PK`.
- `sequence_id uuid NOT NULL` — FK → `email_sequences.id`.
- `step_number integer NOT NULL`.
- `subject text NOT NULL`.
- `body text NOT NULL`.
- `delay_days integer DEFAULT 0`.
- `status email_step_status DEFAULT 'draft'` — enum (§1 #13).
- `sent_at timestamp`.
- `opened_at timestamp`.
- `replied_at timestamp`.
- `ai_generated boolean DEFAULT false`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `feedback_requests`
**Purpose:** When one team-member (via their agent) wants another team-member's agent to change, they file a feedback request. Manager can approve/reject.

**Columns:**
- `id uuid PK`.
- `from_member_id uuid NOT NULL` — FK → `team_members.id`.
- `from_agent_config_id uuid NOT NULL` — FK → `agent_configs.id`.
- `target_role_type agent_role_type NOT NULL` — target role, not specific member (affects all agents of that role).
- `description text NOT NULL`.
- `request_type feedback_request_type NOT NULL` — enum (§1 #18).
- `status feedback_status DEFAULT 'pending'` — enum (§1 #19).
- `priority priority DEFAULT 'medium'` — enum (§1 #20).
- `approved_by_member_id uuid` — FK → `team_members.id`.
- `resolved_at timestamp`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `field_queries`
**Purpose:** Manager-initiated question directed at the field. The query itself is a single row; per-AE questions hang off `field_query_questions`. `initiated_by` deliberately has no FK so either a `team_members` or `support_function_members` row can initiate (heterogeneous FK).

**Columns:**
- `id uuid PK`.
- `initiated_by uuid NOT NULL` — **no FK** (either team_member or support_function_member).
- `raw_question text NOT NULL`.
- `ai_analysis jsonb` — Claude's decomposition of the question.
- `cluster_id uuid` — FK → `observation_clusters.id`. Optional back-link when query was sparked by a cluster.
- `aggregated_answer jsonb` — synthesized once enough AEs respond.
- `status field_query_status NOT NULL DEFAULT 'active'` — enum (§1 #24).
- `expires_at timestamp NOT NULL`.
- `initiated_at timestamp NOT NULL DEFAULT now()`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `cluster_id`. (No FK for `initiated_by` — intentional, heterogeneous.)

### `field_query_questions`
**Purpose:** Per-AE question instance spawned from a field_query. One row per (query, AE). Stores the generated chip-response prompt, the AE's response, and the AI-generated "give-back" insight.

**Columns:**
- `id uuid PK`.
- `query_id uuid NOT NULL` — FK → `field_queries.id`.
- `target_member_id uuid NOT NULL` — FK → `team_members.id`.
- `question_text text NOT NULL`.
- `chips text[] NOT NULL` — response chip options.
- `deal_id uuid` — FK → `deals.id` (optional deal scoping).
- `account_id uuid` — FK → `companies.id`.
- `response_text text`.
- `response_type text` — plain text, not enum.
- `responded_at timestamp`.
- `give_back jsonb` — AI-generated reward insight after response.
- `records_updated jsonb` — changes made to deal/contact records as result of response.
- `status field_query_question_status NOT NULL DEFAULT 'pending'` — enum (§1 #25).
- `created_at timestamp NOT NULL DEFAULT now()`.

### `influence_scores`
**Purpose:** Per-member, per-dimension, per-vertical influence score tracking how much the member's contributions (observations, playbook ideas, cross-agent feedback) have shaped the org's knowledge.

**Columns:**
- `id uuid PK`.
- `member_id uuid NOT NULL` — FK → `team_members.id`.
- `dimension text NOT NULL` — `process_innovation | competitive_intel | technical_expertise | deal_coaching | customer_insight`.
- `vertical text`.
- `score integer DEFAULT 0`.
- `tier text DEFAULT 'contributing'` — `high_impact | growing | contributing | new`.
- `attributions jsonb` — list of contributions that added to score.
- `last_contribution_at timestamp`.
- `decay_applied_at timestamp` — last time decay was applied.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `knowledge_articles`
**Purpose:** Internal knowledge base. Implementation guides, case studies, resolution histories, best practices. No FK to companies — `related_company_ids` is a loose uuid array used for pattern-matching search, not join.

**Columns:**
- `id uuid PK`.
- `title text NOT NULL`.
- `article_type text NOT NULL` — `implementation_guide | case_study | resolution_history | best_practice | faq | product_update`.
- `content text NOT NULL` — full body.
- `summary text`.
- `products text[]`.
- `verticals text[]`.
- `tags text[]`.
- `resolution_steps jsonb` — only for `resolution_history` articles.
- `related_company_ids uuid[]` — no FK.
- `effectiveness_score integer`.
- `view_count integer DEFAULT 0`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `lead_scores`
**Purpose:** ICP match / engagement / intent composite scoring for a company+deal.

**Columns:**
- `id uuid PK`.
- `company_id uuid NOT NULL` — FK → `companies.id`.
- `deal_id uuid` — FK → `deals.id`.
- `score integer DEFAULT 0`.
- `scoring_factors jsonb`.
- `icp_match_pct integer DEFAULT 0`.
- `engagement_score integer DEFAULT 0`.
- `intent_score integer DEFAULT 0`.
- `created_at timestamp NOT NULL DEFAULT now()`.

### `manager_directives`
**Purpose:** Leadership directives (company-wide, per-vertical, per-role, or targeted at a specific member). Injected into call prep as DIRECTIVE language.

**Columns:**
- `id uuid PK`.
- `author_id uuid NOT NULL` — FK → `team_members.id`.
- `scope text NOT NULL` — `org | vertical | role | member`.
- `vertical text`.
- `target_role text` — e.g. `AE`, when scope=`role`.
- `target_member_id uuid` — FK → `team_members.id` — when scope=`member`.
- `directive text NOT NULL`.
- `priority text NOT NULL` — `low | medium | high | urgent`.
- `category text NOT NULL`.
- `is_active boolean NOT NULL DEFAULT true`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `expires_at timestamp`.

**FKs:** `author_id`, `target_member_id`.

### `meddpicc_fields`
**Purpose:** MEDDPICC scoring per deal. 1:1 with deal (unique index). Each of the 7 dimensions has a text narrative + integer confidence (0–100). `ai_extracted` and `ae_confirmed` track provenance.

**Columns:**
- `id uuid PK`.
- `deal_id uuid NOT NULL` — FK → `deals.id`. **UNIQUE.**
- `metrics text`, `metrics_confidence integer DEFAULT 0`.
- `economic_buyer text`, `economic_buyer_confidence integer DEFAULT 0`.
- `decision_criteria text`, `decision_criteria_confidence integer DEFAULT 0`.
- `decision_process text`, `decision_process_confidence integer DEFAULT 0`.
- `identify_pain text`, `identify_pain_confidence integer DEFAULT 0`.
- `champion text`, `champion_confidence integer DEFAULT 0`.
- `competition text`, `competition_confidence integer DEFAULT 0`.
- `ai_extracted boolean DEFAULT true`.
- `ae_confirmed boolean DEFAULT false`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**Indexes:** `meddpicc_deal_id_idx` (unique) on `deal_id`.

### `notifications`
**Purpose:** Per-team-member notification feed. Priorities use `priority` enum; types use `notification_type` enum.

**Columns:**
- `id uuid PK`.
- `team_member_id uuid NOT NULL` — FK → `team_members.id`.
- `type notification_type NOT NULL` — enum (§1 #22).
- `title text NOT NULL`.
- `message text NOT NULL`.
- `deal_id uuid` — FK → `deals.id` (optional deal scoping).
- `is_read boolean DEFAULT false`.
- `priority priority DEFAULT 'medium'` — enum (§1 #20).
- `created_at timestamp NOT NULL DEFAULT now()`.

### `observation_clusters`
**Purpose:** Semantic groupings of observations. The clustering logic lives in `/api/observations/route.ts` (Claude call #3 in 01-INVENTORY). Stores aggregate metrics (count, ARR impact, verticals affected) and severity/resolution status.

**Columns:**
- `id uuid PK`.
- `title text NOT NULL`.
- `summary text`.
- `signal_type text NOT NULL` — one of the 9 observation signal types (text, not enum).
- `target_function text` — which support function owns it (text).
- `observation_count integer DEFAULT 1`.
- `observer_count integer DEFAULT 1` — distinct observers.
- `verticals_affected text[]`.
- `pipeline_impact jsonb`.
- `severity text DEFAULT 'informational'` — `informational | elevated | critical`.
- `resolution_status text DEFAULT 'emerging'` — `emerging | confirmed | action_taken | resolved`.
- `resolution_notes text`.
- `effectiveness_score integer`.
- `arr_impact_total numeric(12,2)` — sum across linked deals.
- `arr_impact_details jsonb`.
- `unstructured_quotes jsonb` — array of `{ quote, observation_id, date }`.
- `structured_summary jsonb`.
- `first_observed timestamp DEFAULT now()`.
- `last_observed timestamp DEFAULT now()`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

### `observation_routing`
**Purpose:** Routes an observation to a support function + target member (Enablement, PMM, Deal Desk, etc.). `target_member_id` intentionally has no FK because it points at `support_function_members`, which is a different table from `team_members`.

**Columns:**
- `id uuid PK`.
- `observation_id uuid NOT NULL` — FK → `observations.id`.
- `target_function text NOT NULL`.
- `target_member_id uuid` — **no FK** (points at `support_function_members` — comment says so at schema.ts:650).
- `signal_type text NOT NULL`.
- `status observation_routing_status NOT NULL DEFAULT 'sent'` — enum (§1 #23).
- `acknowledged_at timestamp`.
- `resolved_at timestamp`.
- `created_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `observation_id` only.

### `observations`
**Purpose:** Raw field observations captured via the Universal Agent Bar. The single most important capture surface in Nexus. Each row is AI-classified into one of 9 signal types, optionally linked to a cluster, routed to support functions, and produces a "give-back" insight shown to the reporter. Linked accounts/deals are uuid arrays (no FK enforcement, to keep the capture flow fast).

**Columns:**
- `id uuid PK`.
- `observer_id uuid NOT NULL` — FK → `team_members.id`. (**Named `observer_id`, NOT `reporter_id`.**)
- `raw_input text NOT NULL`. (**Named `raw_input`, NOT `content`.**)
- `source_context jsonb` — `{ page, dealId, trigger }` from whichever UI surface captured it.
- `ai_classification jsonb` — Claude's output: signals[], sentiment, follow_up fields.
- `ai_giveback jsonb` — insight returned to reporter.
- `status text DEFAULT 'submitted'`.
- `lifecycle_events jsonb` — timeline of state changes.
- `cluster_id uuid` — FK → `observation_clusters.id` (nullable).
- `follow_up_question text`, `follow_up_response text`, `follow_up_chips text[]`.
- `structured_data jsonb`.
- `arr_impact jsonb`.
- `linked_account_ids uuid[]` — **no FK enforcement**.
- `linked_deal_ids uuid[]` — **no FK enforcement**.
- `extracted_entities jsonb` — companies/people/products extracted from raw input.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `observer_id → team_members.id`, `cluster_id → observation_clusters.id`.

> NOTE vs. Prompt expectation: the prompt's verification step expects columns `deal_id`, `reporter_id`, `content`, `classification`. Actual names are `linked_deal_ids` (array, no deal_id), `observer_id`, `raw_input`, `ai_classification`. Behavior matches; names differ.

### `playbook_ideas`
**Purpose:** Experimental sales-process tactics with full lifecycle (proposed → testing → graduated/rejected/archived). Holds A/B group member IDs, success thresholds, current metrics, attribution, and deal-level evidence.

**Columns:**
- `id uuid PK`.
- `originator_id uuid NOT NULL` — FK → `team_members.id`.
- `originated_from text` — `observation | close_analysis | manual | system_detected | cross_agent`.
- `source_observation_id uuid` — FK → `observations.id`.
- `title text NOT NULL`.
- `hypothesis text NOT NULL`.
- `category text NOT NULL` — `process | messaging | positioning | discovery | closing | engagement`.
- `vertical text`.
- `status text NOT NULL DEFAULT 'proposed'` — `proposed | testing | graduated | rejected | archived`.
- `test_start_date timestamp`, `test_end_date timestamp`.
- `test_group_deals text[]`, `control_group_deals text[]`.
- `results jsonb`.
- `followers text[]`, `follower_count integer DEFAULT 0`.
- `test_group text[]` — AE user IDs assigned to test.
- `control_group text[]` — AE user IDs in control.
- `success_thresholds jsonb` — `{ velocity_pct, sentiment_pts, close_rate_pct }`.
- `current_metrics jsonb`.
- `approved_by text`, `approved_at timestamp`.
- `graduated_at timestamp`.
- `experiment_duration_days integer DEFAULT 30`.
- `experiment_start timestamp`, `experiment_end timestamp`.
- `attribution jsonb` — `{ proposed_by, proposed_at, approved_by, impact_arr, scaling_scope }`.
- `experiment_evidence jsonb` — per-deal comparison data.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `originator_id`, `source_observation_id`.

### `resources`
**Purpose:** Knowledge-hub asset catalog (one-pagers, battlecards, ROI calculators, security docs).

**Columns:**
- `id uuid PK`.
- `title text NOT NULL`.
- `type text NOT NULL` — `one_pager | case_study | whitepaper | faq | battlecard | roi_calculator | security_doc | template`.
- `description text`.
- `verticals text[]`, `tags text[]`.
- `url text`.
- `updated_at timestamp NOT NULL DEFAULT now()`.
- `created_at timestamp NOT NULL DEFAULT now()`.

### `support_function_members`
**Purpose:** Non-sales personas (Enablement, Product Marketing, Deal Desk, CS). Separate table from `team_members` because they have different roles and no deal assignments. Referenced by `observation_routing.target_member_id` WITHOUT an FK (intentional cross-table reference).

**Columns:**
- `id uuid PK`.
- `name text NOT NULL`.
- `role text NOT NULL`.
- `function text NOT NULL`.
- `email text`.
- `avatar_initials text`.
- `avatar_color text`.
- `verticals_covered text[]`.
- `created_at timestamp NOT NULL DEFAULT now()`.

### `system_intelligence`
**Purpose:** Pre-computed org-wide insights (pattern summaries, trend findings) injected into call prep as a distinct intelligence layer. Account-specific rows use `account_id`; cross-vertical rows use `vertical` without account.

**Columns:**
- `id uuid PK`.
- `vertical text`.
- `account_id uuid` — FK → `companies.id`.
- `insight_type text NOT NULL`.
- `title text NOT NULL`.
- `insight text NOT NULL`.
- `supporting_data jsonb`.
- `confidence numeric(3,2)`.
- `relevance_score numeric(3,2)`.
- `status text NOT NULL DEFAULT 'active'`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

**FKs:** `account_id`.

### `team_members`
**Purpose:** Sales team profiles. No auth — persona switching UI reads from this table. Includes AEs, BDRs, SAs, CSMs, and MANAGERs (roleEnum).

**Columns:**
- `id uuid PK`.
- `name text NOT NULL`.
- `email text NOT NULL` — not unique (duplicates allowed in demo data).
- `role role NOT NULL` — enum (§1 #1).
- `vertical_specialization vertical NOT NULL DEFAULT 'general'`.
- `is_active boolean NOT NULL DEFAULT true`.
- `avatar_url text`.
- `capacity_target integer DEFAULT 10`.
- `created_at timestamp NOT NULL DEFAULT now()`.
- `updated_at timestamp NOT NULL DEFAULT now()`.

---

## Section 3: Relationships

Indented plain text (not a code fence). FKs named `target_table.column → target_table.id` where `target_table` refers to the PG table name. Tables with no outgoing FKs are still listed.

  account_health
    - companies (company_id → companies.id)
    - deals (deal_id → deals.id)

  activities
    - deals (deal_id → deals.id)
    - contacts (contact_id → contacts.id)
    - team_members (team_member_id → team_members.id)

  agent_actions_log
    - agent_configs (agent_config_id → agent_configs.id)
    - deals (deal_id → deals.id)

  agent_config_versions
    - agent_configs (agent_config_id → agent_configs.id)

  agent_configs
    - team_members (team_member_id → team_members.id)

  call_analyses
    - call_transcripts (transcript_id → call_transcripts.id)

  call_transcripts
    - deals (deal_id → deals.id)

  companies
    - (no outgoing FKs; many inbound)

  contacts
    - companies (company_id → companies.id)

  coordinator_patterns
    - (no outgoing FKs; deal_ids / deal_names are plain text[] arrays — not enforced)

  cross_agent_feedback
    - team_members (source_member_id → team_members.id)
    - team_members (target_member_id → team_members.id)
    - deals (deal_id → deals.id)
    - companies (account_id → companies.id)

  customer_messages
    - companies (company_id → companies.id)
    - contacts (contact_id → contacts.id)
    - deals (deal_id → deals.id)

  deal_agent_states
    - deals (deal_id → deals.id)

  deal_fitness_events
    - deals (deal_id → deals.id)
    - contacts (contact_id → contacts.id)

  deal_fitness_scores
    - deals (deal_id → deals.id)

  deal_milestones
    - deals (deal_id → deals.id)

  deal_stage_history
    - deals (deal_id → deals.id)

  deals
    - companies (company_id → companies.id)
    - contacts (primary_contact_id → contacts.id)
    - team_members (assigned_ae_id → team_members.id)
    - team_members (assigned_bdr_id → team_members.id)
    - team_members (assigned_sa_id → team_members.id)

  email_sequences
    - deals (deal_id → deals.id)
    - contacts (contact_id → contacts.id)
    - team_members (assigned_ae_id → team_members.id)

  email_steps
    - email_sequences (sequence_id → email_sequences.id)

  feedback_requests
    - team_members (from_member_id → team_members.id)
    - agent_configs (from_agent_config_id → agent_configs.id)
    - team_members (approved_by_member_id → team_members.id)

  field_queries
    - observation_clusters (cluster_id → observation_clusters.id)
    - (initiated_by has NO FK — can be team_members OR support_function_members)

  field_query_questions
    - field_queries (query_id → field_queries.id)
    - team_members (target_member_id → team_members.id)
    - deals (deal_id → deals.id)
    - companies (account_id → companies.id)

  influence_scores
    - team_members (member_id → team_members.id)

  knowledge_articles
    - (no outgoing FKs; related_company_ids is a uuid[] without FK)

  lead_scores
    - companies (company_id → companies.id)
    - deals (deal_id → deals.id)

  manager_directives
    - team_members (author_id → team_members.id)
    - team_members (target_member_id → team_members.id)

  meddpicc_fields
    - deals (deal_id → deals.id)

  notifications
    - team_members (team_member_id → team_members.id)
    - deals (deal_id → deals.id)

  observation_clusters
    - (no outgoing FKs)

  observation_routing
    - observations (observation_id → observations.id)
    - (target_member_id has NO FK — points at support_function_members)

  observations
    - team_members (observer_id → team_members.id)
    - observation_clusters (cluster_id → observation_clusters.id)
    - (linked_account_ids and linked_deal_ids are uuid[] without FK)

  playbook_ideas
    - team_members (originator_id → team_members.id)
    - observations (source_observation_id → observations.id)
    - (test_group, control_group, followers are text[] of IDs without FK)

  resources
    - (no outgoing FKs)

  support_function_members
    - (no outgoing FKs)

  system_intelligence
    - companies (account_id → companies.id)

  team_members
    - (no outgoing FKs; heavily inbound)

### FK density & heterogeneous references
- **Most-referenced table:** `deals` (16 inbound FKs).
- **Second:** `team_members` (12 inbound FKs).
- **Third:** `companies` (7 inbound FKs).
- **Heterogeneous references (no FK, intentional):**
  - `field_queries.initiated_by` → `team_members.id` OR `support_function_members.id`.
  - `observation_routing.target_member_id` → `support_function_members.id`.
- **Loose uuid arrays (no FK):** `observations.linked_account_ids`, `observations.linked_deal_ids`, `coordinator_patterns.deal_ids`, `playbook_ideas.test_group`, `playbook_ideas.control_group`, `playbook_ideas.followers`, `playbook_ideas.test_group_deals`, `playbook_ideas.control_group_deals`, `knowledge_articles.related_company_ids`.

---

## Section 4: Known Schema Debt

### Debt 1: `getEffectiveType()` fallback in activity feed
**Location:** `apps/web/src/components/activity-feed.tsx:45-56` (called at lines 118, 339, 502, 540).

**What it does:** When an activity row has `type = 'note_added'`, the function inspects `metadata.source` and returns one of `call_prep | call_analysis | email_draft | agent_action` as the "effective" type, so the UI can render the right icon, color, and title. If `metadata.source` is missing, it falls through to `'note_added'`.

**Why it exists:** Early in the project, AI agent actions (call prep, email drafts, transcript analysis, observations) were all written to `activities.type = 'note_added'` with the real type stashed in `metadata.source`. Later, migration 0002 added real enum values — `call_prep`, `email_draft`, `call_analysis`, `observation`, `agent_feedback`, `competitive_intel` — so new rows now use the real type directly. But (a) old rows were never backfilled, and (b) one value the fallback still references — `agent_action` — was never added to `activity_type`, so it can't be used as a real type value.

**Current workaround:** Every read of `activity.type` goes through `getEffectiveType()`. The two-line doc comment at schema.ts activity_type enum makes no mention of this.

**Proper enum-migration fix:**
```sql
-- Step 1: Add the missing enum value
ALTER TYPE activity_type ADD VALUE 'agent_action';

-- Step 2: Backfill rows where type='note_added' + metadata has a source
UPDATE activities
SET type = (metadata->>'source')::activity_type
WHERE type = 'note_added'
  AND metadata->>'source' IN ('call_prep','call_analysis','email_draft','agent_action');

-- Step 3: Drop getEffectiveType() from activity-feed.tsx and use activity.type directly
```
Estimated scope: ~1 hour including migration, backfill verification, and component cleanup.

### Debt 2: `readnessFitDetected` typo in `deal_fitness_scores`
**Location:** `packages/db/src/schema.ts:998`.

The TypeScript field is declared `readnessFitDetected: integer("readiness_fit_detected")` — missing an "i" in "readiness". The SQL column name is correct (`readiness_fit_detected`), but every TS caller has to use the misspelled property. Low-impact but will bite anyone refactoring by name.

**Fix:** Rename the TS property to `readinessFitDetected` (keep the SQL column). Runtime no-op; type-only change.

### Debt 3: 20+ "enum-shaped" columns stored as plain `text`
See §1 "Enum-shaped columns stored as plain `text` instead" for the full list. Most carry inline comments listing the allowed values but Postgres enforces nothing. Under load, a typo'd value (`kit-ready` vs. `kit_ready`) will silently land.

High-value conversions:
- `observations.status` → enum (`submitted | classified | clustered | resolved | rejected`).
- `observation_clusters.signal_type` → enum (9 values — all defined in Claude prompt).
- `observation_clusters.severity` → enum (3 values).
- `account_health.contract_status` → enum (5 values).
- `customer_messages.channel`, `.status`, `.priority`, `.ai_category` → 4 enums.
- `deal_fitness_events.fit_category`, `.status`, `.lifecycle_phase` → 3 enums.

Lower priority (wider value sets, more frequent churn): `manager_directives.scope`, `playbook_ideas.category`, `knowledge_articles.article_type`, `system_intelligence.insight_type`.

### Debt 4: No indexes on FK columns
Only 4 unique indexes exist (all on FKs for 1:1 relationships). Regular FK lookups (`WHERE deal_id = ?`, `WHERE team_member_id = ?`) scan. The frequently-hit ones — `activities.deal_id`, `call_transcripts.deal_id`, `observations.observer_id`, `deal_stage_history.deal_id`, `notifications.team_member_id` — all need covering indexes before production traffic.

### Debt 5: No `ON DELETE` behavior set on any FK
Every FK falls back to Drizzle's default (NO ACTION). As a result, deleting a `deal` hard-fails if any child rows exist, and the demo reset code has to delete in a carefully ordered sequence (see `apps/web/src/app/api/demo/reset/route.ts`). Production should decide CASCADE vs. SET NULL vs. RESTRICT per relationship — the ad-hoc ordering in demo reset is a correctness hazard.

### Debt 6: Heterogeneous FKs (`initiated_by`, `target_member_id`)
- `field_queries.initiated_by` can be a `team_members.id` OR a `support_function_members.id`. No discriminator column, no FK, no runtime check. Callers have to know.
- `observation_routing.target_member_id` points at `support_function_members.id` always (but no FK). The comment says so; the schema doesn't.

Clean fix: either (a) unify into a single `members` table with a `kind` column, or (b) add two nullable FK columns (`initiated_by_team_member_id`, `initiated_by_support_member_id`) with a `CHECK` that exactly one is populated.

### Debt 7: Loose uuid arrays without FK enforcement
`observations.linked_deal_ids`, `observations.linked_account_ids`, `coordinator_patterns.deal_ids`, `playbook_ideas.test_group / control_group / followers / test_group_deals / control_group_deals`, `knowledge_articles.related_company_ids` — none of these are enforced. A deleted deal's ID can persist in these arrays indefinitely.

Clean fix: either introduce join tables (`observation_deals`, `playbook_idea_test_members`, etc.) with real FKs and cascades, or accept eventual consistency and add a cleanup sweep on demo reset (currently only `observations`-related orphans are cleaned).

### Debt 8: `email` on `team_members` and `contacts` is not unique
`team_members.email` and `contacts.email` can duplicate. No uniqueness, no auth enforcement. Fine for seeded demo data; blocks any real login/lookup flow.

### Debt 9: No RLS policies
Every table has `isRLSEnabled: false`. When auth is added, tenant isolation will need retroactive RLS across 37 tables. Easier to scaffold policies now against a single-tenant identity.

### Debt 10: `annual_revenue` stored as `text`
`companies.annual_revenue` (schema.ts:220) is declared `text` but holds currency amounts. Any filter/sort by revenue has to string-parse. Should be `numeric(14,2)`.

---

## Section 5: Source Files Copied

- `docs/handoff/source/schema/schema.ts` — the full schema file, identical to `packages/db/src/schema.ts`.

Migration SQL files under `packages/db/drizzle/` (`0000_*.sql` through `0011_*.sql` plus the `meta/` snapshot JSONs) will be copied in Session 8 as part of the broader source bundle, not here.

# 07B — CRM Data Boundary Mapping

## Preamble

**Purpose.** Definitive mapping from the 37 current Nexus tables (02-SCHEMA.md) to the v2 HubSpot/Nexus split mandated by DECISIONS.md 2.18 (CRM strategy) and 2.19 (data boundary). Every table is classified — HubSpot, Nexus, Split, or Drop — with full field-by-field destinations, sync direction, and an access pattern that the v2 codebase will use to read and write the data.

**Input.** Current state from 02-SCHEMA.md (37 tables, 25 enums, 4 unique indexes, no RLS, all FKs NO ACTION) plus the architectural decisions in DECISIONS.md (2.16 event-sourced intelligence, 2.17 coordinator wiring, 2.18 HubSpot hybrid, 2.19 data boundary, 2.21 applicability gating, 2.25 cross-flow debt eliminations).

**Output.** For each current table: (a) where its concept lives in v2, (b) which adapter/service surface exposes it, (c) what Codex must do during the rebuild to migrate the concept across the new boundary. Plus the production-ready `CrmAdapter` interface, the `people` table definition, the sync architecture, the field-naming conventions for HubSpot custom properties, the seed strategy across two systems, and the open questions for Prompt 7.7.

**Consumers.**
- **Prompt 7.7** (HubSpot Property and Integration Design) uses Section 1's HubSpot-bound fields and Section 5's property list to design the workspace.
- **Prompt 10** (Rebuild Plan) sequences Codex's work using Section 6's seed strategy and Section 1's per-table migration notes.
- **Codex** uses Section 2 (`CrmAdapter` interface), Section 3 (`people` table), and Section 4 (sync architecture) as build-from specifications.

**Scope of this document.** This session defines the BOUNDARY. Prompt 7.7 designs HubSpot's internal shape (pipeline stages, view configurations, exact property types, automation rules). Where this document picks a HubSpot property name (e.g. `nexus_meddpicc_score`), it is binding for the integration; where it asks "which pipeline stages?" the answer comes from Prompt 7.7.

---

## Section 1: Table-by-Table Classification

The 37 tables, alphabetical. Each entry follows the same template: Current Purpose → v2 Classification and Rationale → Field-by-Field Mapping → v2 Access Pattern → Migration Notes.

**Classification reminders (DECISIONS.md 2.19):**
- **HubSpot** — table's concept moves entirely to HubSpot.
- **Nexus** — table stays in Nexus Postgres.
- **Split** — parts of the table go to HubSpot, parts stay in Nexus.
- **Drop** — table is eliminated in v2 (subsumed, replaced, or dead-code per DECISIONS.md 1.10/2.16/2.24).

---

### `account_health` — Nexus

**Current Purpose**
Post-close account state for Customer Success: health score (0–100), contract status, ARR, use-case adoption, expansion whitespace, renewal timing, risk/expansion/proactive signals. Drives the My Book page (Flow 8 of 06-UI-STRUCTURE.md, Flow not in 07-DATA-FLOWS.md but sits adjacent to closed-won deals). Populated by `seed-book.ts`; 18 demo accounts.

**v2 Classification and Rationale**
Pure intelligence — every field except `arr` and `renewal_date` is AI- or analyst-derived. ARR and renewal date are HubSpot-native deal/company fields, but the bulk of the table is whitespace, risk signals, expansion mapping, and adoption analysis. Per DECISIONS.md 2.19, intelligence stays in Nexus. The few HubSpot-shaped fields read through the adapter at render time, not stored twice.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Nexus `account_health` | `id` | None | New UUID per row in v2 |
| `company_id` | Nexus `account_health` (FK) | `hubspot_company_id` | HubSpot→Nexus | Stored as HubSpot company ID (string), not local UUID |
| `deal_id` | Nexus `account_health` (FK) | `hubspot_deal_id` | HubSpot→Nexus | The closed-won deal that initiated the contract |
| `health_score` | Nexus | `health_score` | None | Computed locally |
| `health_trend` | Nexus | `health_trend` | None | Enum migration: `improving|stable|declining|critical` |
| `health_factors` | Nexus | `health_factors` (jsonb) | None | |
| `contract_status` | Nexus | `contract_status` | None | Enum migration: `onboarding|active|renewal_window|at_risk|churned` |
| `contract_start` | HubSpot Deal property (read-through) | `closedate` (native) or `nexus_contract_start` | HubSpot→Nexus | Nexus reads this from HubSpot at render time; do not store |
| `renewal_date` | HubSpot Deal property | `nexus_renewal_date` (custom) | Bidirectional | Custom property — HubSpot owns user edits, Nexus may write computed renewal projections |
| `arr` | HubSpot Deal property (read-through) | `amount` (native) | HubSpot→Nexus | Use HubSpot's deal amount; do not duplicate |
| `products_purchased` | HubSpot Deal property | `nexus_products_purchased` (custom enumeration multi) | Bidirectional | |
| `usage_metrics` | Nexus | `usage_metrics` (jsonb) | None | Telemetry never enters HubSpot |
| `last_touch_date` | Derived (HubSpot engagements) | — | HubSpot→Nexus | Computed from latest engagement timestamp; not stored as a column |
| `days_since_touch` | Derived | — | HubSpot→Nexus | Computed at query time |
| `key_stakeholders` | Nexus (engagement) + HubSpot (identity) | `key_stakeholders` (jsonb of HubSpot contact IDs + status) | Bidirectional | Identity → HubSpot contact records; status (`engaged|silent|new|departed`) → Nexus |
| `expansion_signals` | Nexus | `expansion_signals` (jsonb) | None | |
| `risk_signals` | Nexus | `risk_signals` (jsonb) | None | |
| `contracted_use_cases` | Nexus | `contracted_use_cases` (jsonb) | None | |
| `expansion_map` | Nexus | `expansion_map` (jsonb) | None | |
| `proactive_signals` | Nexus | `proactive_signals` (jsonb) | None | |
| `similar_situations` | Nexus | `similar_situations` (jsonb) | None | Cross-book pattern cards |
| `recommended_resources` | Nexus | `recommended_resources` (jsonb) | None | Pointers to `knowledge_articles` |
| `next_qbr_date` | HubSpot Deal property | `nexus_next_qbr_date` (custom) | Bidirectional | |
| `onboarding_complete` | HubSpot Deal property | `nexus_onboarding_complete` (custom boolean) | Bidirectional | |
| `created_at`, `updated_at` | Nexus | unchanged | None | |

**v2 Access Pattern**
- Read: `AccountHealthService.getForCompany(hubspotCompanyId)` returns the merged view — Nexus health row + `CrmAdapter.getDeal(hubspotDealId)` for ARR/renewal/products + `CrmAdapter.listEngagements(hubspotDealId)` for last-touch derivation.
- Write (Nexus side): `AccountHealthService.updateHealth(...)` — score, signals, use-cases.
- Write (HubSpot side): `CrmAdapter.updateDealCustomProperties(hubspotDealId, { nexus_renewal_date, nexus_next_qbr_date, ... })`.

**Migration Notes**
v2 starts with fresh seed data — no migration of existing rows. `seed-book.ts` is rewritten to (a) create 18 closed-won deals in HubSpot via `CrmAdapter.createDeal()`, then (b) insert account_health rows in Nexus keyed off the returned HubSpot deal IDs.

---

### `activities` — Split

**Current Purpose**
Unified timeline across deals: native CRM activities (emails, calls, meetings, notes) plus AI-generated activities (call_prep, email_draft, observation, agent_feedback, competitive_intel). 15 enum types. The legacy `getEffectiveType()` fallback on `activity-feed.tsx:45` exists because old rows wrote `type='note_added'` with `metadata.source` carrying the real type (02-SCHEMA debt #1).

**v2 Classification and Rationale**
Native CRM activities (email_sent, email_received, call_completed, meeting_scheduled, meeting_completed, note_added, task_completed, document_shared, stage_changed) belong in HubSpot as engagements — that's the system reps and CSMs see in Sales Hub. AI-generated activities (call_prep, email_draft, call_analysis, observation, agent_feedback, competitive_intel) are intelligence artifacts — they belong in Nexus's `deal_events` per DECISIONS.md 2.16. Splitting eliminates `getEffectiveType()` (cross-flow debt #1).

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Both | HubSpot engagement ID OR Nexus event UUID | — | Two ID spaces, never overlap |
| `deal_id` | HubSpot engagement (`hs_associations`) OR Nexus `deal_events.hubspot_deal_id` | — | HubSpot→Nexus | |
| `contact_id` | HubSpot engagement association OR Nexus `deal_events.hubspot_contact_id` | — | HubSpot→Nexus | |
| `team_member_id` | HubSpot owner OR Nexus `deal_events.actor_team_member_id` | — | None | |
| `type='email_sent'` etc. (native types) | HubSpot Engagement (Email) | native | None | |
| `type='email_received'` | HubSpot Engagement (Email, direction=incoming) | native | None | |
| `type='call_completed'` | HubSpot Engagement (Call) | native | None | |
| `type='meeting_scheduled' \| 'meeting_completed'` | HubSpot Engagement (Meeting) | native | None | |
| `type='note_added'` (real notes) | HubSpot Engagement (Note) | native | None | |
| `type='stage_changed'` | HubSpot Deal stage history (native) + Nexus `deal_events` (`stage_changed` event) | — | Bidirectional | HubSpot owns the stage; Nexus mirrors as event for intelligence |
| `type='task_completed'` | HubSpot Engagement (Task) | native | None | |
| `type='document_shared'` | HubSpot Engagement (Note + attachment) | native | None | |
| `type='call_prep'` | Nexus `deal_events` | event_type=`call_prep_generated` | None | AI artifact, never in HubSpot |
| `type='email_draft'` | Nexus `deal_events` | event_type=`email_drafted` | None | Drafts only; once sent → HubSpot Engagement |
| `type='call_analysis'` | Nexus `deal_events` | event_type=`call_analysis_completed` | None | |
| `type='observation'` | Nexus `deal_events` | event_type=`observation_logged` | None | Already in Nexus via `observations` table; deal_event is the cross-link |
| `type='agent_feedback'` | Nexus `deal_events` | event_type=`agent_feedback_recorded` | None | |
| `type='competitive_intel'` | Nexus `deal_events` | event_type=`competitive_intel_detected` | None | |
| `subject`, `description`, `metadata` | Same destination as the row | engagement body / event payload | — | |
| `created_at` | Same destination | | | |

**v2 Access Pattern**
- Read native activities: `CrmAdapter.listEngagements(hubspotDealId, { types? })` returns HubSpot engagements typed as `Activity`.
- Read AI events: `DealIntelligence.listEvents(hubspotDealId, { eventTypes? })`.
- Read merged timeline: `TimelineService.getForDeal(hubspotDealId)` — internally calls both, sorts by timestamp, returns a single sorted list with a `source: 'hubspot' | 'nexus'` discriminator. The deal detail page uses this.
- Write native: `CrmAdapter.logEngagement(hubspotDealId, { type, body, ... })`.
- Write AI event: `DealIntelligence.appendEvent(hubspotDealId, { eventType, payload })`.

**Migration Notes**
- Drop `getEffectiveType()` entirely. Each event has one canonical type at the source.
- Drop `activity_type='agent_action'` (unused enum value never written).
- Drop the `metadata.source` discriminator pattern — type is the type.
- Demo seed creates HubSpot engagements via `CrmAdapter.logEngagement()` for every native activity; calls `DealIntelligence.appendEvent()` for every AI activity.

---

### `agent_actions_log` — Drop

**Current Purpose**
Audit trail of every AI agent action with input, output, override flag, override reason. Written by /api/agent/configure, save-to-deal, etc.

**v2 Classification and Rationale**
Subsumed by `deal_events` per DECISIONS.md 2.16 (event-sourced intelligence). Every AI action becomes an event with full input/output payload; the override flag becomes a follow-up `agent_action_overridden` event. No separate audit table needed — `deal_events` IS the audit trail. Aligns with 2.25 #3 (config mutations are event-sourced proposals).

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `agent_config_id`, `action_type`, `description`, `input_data`, `output_data`, `was_overridden`, `override_reason`, `deal_id`, `created_at` | Nexus `deal_events` | event_type=`agent_action_*` per action_type, payload jsonb | None | |

**v2 Access Pattern**
`DealIntelligence.listEvents(dealId, { eventTypes: ['agent_action_*'] })` for per-deal audit. `AgentService.listActions(agentConfigId)` for per-config audit.

**Migration Notes**
v2 doesn't carry forward old rows. The `deal_events` schema must accommodate `agentConfigId` and `wasOverridden` fields in payload. Verify Codex includes both during DealEvent shape design.

---

### `agent_config_versions` — Nexus

**Current Purpose**
Version history for `agent_configs`. Every change snapshot is a row.

**v2 Classification and Rationale**
Pure Nexus — agent configuration is intelligence layer, not CRM data. Per DECISIONS.md 2.25 #3, AI-driven config mutations become event-sourced proposals (`agent_config_change_proposed` event), but human-applied versions still need a clean snapshot history. Keep this table.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus `agent_config_versions` | unchanged | None | |

**v2 Access Pattern**
`AgentService.listVersions(agentConfigId)`. `AgentService.applyVersion(versionId)` (replays a snapshot into the active config).

**Migration Notes**
None — table persists with same shape.

---

### `agent_configs` — Nexus

**Current Purpose**
Per-team-member AI agent configuration: instructions text, output preferences, version, role type.

**v2 Classification and Rationale**
Pure Nexus. HubSpot has no concept of per-rep AI agents.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `team_member_id`, `agent_name`, `role_type`, `instructions`, `output_preferences`, `version`, `is_active`, `created_at`, `updated_at` | Nexus `agent_configs` | unchanged | None | |

**v2 Access Pattern**
`AgentService.getForMember(teamMemberId)`, `AgentService.update(...)`, `AgentService.proposeChange(...)` (writes a `agent_config_change_proposed` deal_event for the manager to approve per 2.25 #3).

**Migration Notes**
v1 has auto-mutating writes (Flow 3 step 12, prompt #4). In v2 these become proposals — Codex must wire the approval flow and ensure no code path writes `agent_configs.instructions` directly without going through `AgentService.applyApprovedProposal()`.

---

### `call_analyses` — Nexus

**Current Purpose**
AI-extracted insights from a transcript (1:1 with `call_transcripts`): summary, pain points, MEDDPICC extractions, coaching insights, talk ratio.

**v2 Classification and Rationale**
Pure Nexus intelligence. HubSpot Conversation Intelligence exists but the v2 demo uses Claude end-to-end; we don't surrender this to HubSpot's product.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus `call_analyses` | unchanged; FK becomes `transcript_id → call_transcripts.id` (also Nexus) | None | |

**v2 Access Pattern**
`TranscriptService.getAnalysis(transcriptId)`. The transcript pipeline writes one row per analyzed transcript.

**Migration Notes**
Adopt the canonical analyzed-transcript object per Codex Guardrail #21 (one transcript preprocessing pass produces the canonical object). `call_analyses` becomes the durable persistence of that object.

---

### `call_transcripts` — Nexus

**Current Purpose**
Raw call transcripts per deal. Source of every signal detection, MEDDPICC extraction, fitness analysis. The `pipeline_processed` flag gates pipeline runs.

**v2 Classification and Rationale**
Pure Nexus. HubSpot stores call recordings via Calling Hub, but raw transcript text — what every Claude call reads — lives in Nexus. If the customer eventually wants HubSpot Conversation Intelligence to be the source-of-record for transcripts, the adapter can pull them from HubSpot's call engagement, but for v1 Nexus owns transcript ingestion.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Nexus `call_transcripts` | `id` | None | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | Reference becomes HubSpot deal ID string |
| `title`, `date`, `duration_seconds`, `participants`, `transcript_text`, `source`, `status`, `pipeline_processed`, `created_at`, `updated_at` | Nexus | unchanged | None | |
| (new) | Nexus | `hubspot_engagement_id` (text, nullable) | HubSpot→Nexus | Optional link to HubSpot Call engagement when transcript came from HubSpot Calling |

**v2 Access Pattern**
`TranscriptService.create(...)`, `TranscriptService.getForDeal(hubspotDealId)`, `TranscriptService.markProcessed(transcriptId)`.

**Migration Notes**
Add `hubspot_engagement_id` for forward compatibility with HubSpot Calling integration. v1 demos all transcripts as `source='simulated'`; v2 keeps the simulated source for demo data while leaving a hook for real HubSpot calls.

---

### `companies` — Split

**Current Purpose**
Account records. `name`, `industry` (vertical enum), `employee_count`, `annual_revenue` (text!), `tech_stack[]`, `hq_location`, `description`, `enrichment_source`, `enrichment_data`. 7 inbound FKs.

**v2 Classification and Rationale**
HubSpot owns company identity per DECISIONS.md 2.19 (book-of-business data). Industry, employee count, revenue, location, description are all HubSpot-native. Tech stack and AI-derived enrichment are intelligence — Nexus owns them via custom HubSpot properties. Split: identity in HubSpot, intelligence as `nexus_*` custom properties also on the HubSpot company record (so they're visible to anyone using HubSpot directly).

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | HubSpot company ID (string) | — | — | Nexus drops local UUID; everywhere a company is referenced, use HubSpot ID |
| `name` | HubSpot Company native | `name` | Bidirectional | |
| `domain` | HubSpot Company native | `domain` | Bidirectional | HubSpot uses this as primary identity key |
| `industry` (vertical enum) | HubSpot Company custom | `nexus_vertical` (enumeration: healthcare, financial_services, manufacturing, retail, technology, general) | Bidirectional | HubSpot's native `industry` is freeform; we maintain a Nexus-controlled enum |
| `employee_count` | HubSpot Company native | `numberofemployees` | Bidirectional | |
| `annual_revenue` (text) | HubSpot Company native | `annualrevenue` (numeric) | Bidirectional | TYPE FIX: HubSpot's field is numeric; v2 stops storing as text (02-SCHEMA debt #10 resolved) |
| `tech_stack` (text[]) | HubSpot Company custom | `nexus_tech_stack` (multiline text — comma-delimited) | Bidirectional | HubSpot doesn't natively support array properties on free tier; serialize as comma-delimited |
| `hq_location` | HubSpot Company native | `city` + `state` + `country` (split) OR `nexus_hq_location` if a single string is preferred | Bidirectional | |
| `description` | HubSpot Company native | `description` | Bidirectional | |
| `enrichment_source` | HubSpot Company custom | `nexus_enrichment_source` (enumeration: apollo, clearbit, simulated) | Bidirectional | |
| `enrichment_data` (jsonb) | Nexus `companies_intelligence` (new; one row per HubSpot company) | `enrichment_data jsonb` | None | Cache only; never to HubSpot |
| `created_at`, `updated_at` | HubSpot native | `createdate`, `hs_lastmodifieddate` | HubSpot→Nexus | |

**v2 Access Pattern**
- Read identity: `CrmAdapter.getCompany(hubspotCompanyId)` returns a typed `Company` object that includes `nexus_*` properties.
- Read intelligence-only fields: `CompanyIntelligenceService.getForCompany(hubspotCompanyId)` for `enrichment_data` jsonb.
- Write: `CrmAdapter.updateCompany(hubspotCompanyId, fields)` for native fields; `CrmAdapter.updateCompanyCustomProperties(...)` for `nexus_*` fields. Use the latter for AI-derived updates.

**Migration Notes**
- Drop the local `companies` table entirely; replace with `companies_intelligence` (HubSpot company ID + jsonb cache).
- `seed-book.ts` and `seed.ts` create companies via `CrmAdapter.createCompany()`, capturing the returned HubSpot ID for use in deal creation.
- All current code that joins on `companies.id` must be rewritten to query HubSpot via the adapter (with read-through cache per Section 4).

---

### `contacts` — Split

**Current Purpose**
People at companies. `first_name`, `last_name`, `email`, `phone`, `title`, `linkedin_url`, `company_id` (FK), `role_in_deal` (contact_role enum: champion, economic_buyer, technical_evaluator, end_user, blocker, coach), `is_primary`.

**v2 Classification and Rationale**
HubSpot owns contact identity (book-of-business). MEDDPICC role assignment (`role_in_deal`) is sales intelligence — store as a custom property on the HubSpot contact so it's visible to anyone in HubSpot AND Nexus. `is_primary` is also a HubSpot concept (primary contact on a deal association). Add a Nexus link to the `people` table (Section 3) for cross-account intelligence.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | HubSpot contact ID (string) | — | — | Drop local UUID |
| `first_name` | HubSpot Contact native | `firstname` | Bidirectional | |
| `last_name` | HubSpot Contact native | `lastname` | Bidirectional | |
| `email` | HubSpot Contact native | `email` | Bidirectional | HubSpot uses email as identity-resolution key |
| `phone` | HubSpot Contact native | `phone` | Bidirectional | |
| `title` | HubSpot Contact native | `jobtitle` | Bidirectional | |
| `linkedin_url` | HubSpot Contact custom | `nexus_linkedin_url` (single-line text) | Bidirectional | HubSpot's native `linkedinbio` exists but is clarification-prone; use a Nexus-owned property |
| `company_id` | HubSpot association (Contact↔Company) | native | HubSpot→Nexus | Use HubSpot's native association API |
| `role_in_deal` | HubSpot Contact custom | `nexus_role_in_deal` (enumeration: champion, economic_buyer, technical_evaluator, end_user, blocker, coach) | Bidirectional | Per-deal role lives on the deal-contact association, not the contact itself; use HubSpot association labels OR a Nexus-side `deal_contact_roles` table — see Notes |
| `is_primary` | HubSpot deal-contact association label | `primary_contact` | Bidirectional | HubSpot supports "Primary contact" association label |
| `created_at`, `updated_at` | HubSpot native | `createdate`, `lastmodifieddate` | HubSpot→Nexus | |
| (new) | Nexus `people` (Section 3) | `hubspot_contact_id` | HubSpot→Nexus | Identity link for cross-account intelligence |

**v2 Access Pattern**
- Read: `CrmAdapter.getContact(hubspotContactId)`.
- Read all contacts for a deal: `CrmAdapter.listDealContacts(hubspotDealId)` returns contacts with their per-deal role label.
- Write role-in-deal: this is per-deal, not per-contact. v2 needs `CrmAdapter.setContactRoleOnDeal(hubspotDealId, hubspotContactId, role)` which uses HubSpot's deal-contact association labels OR (fallback) writes to a Nexus side table `deal_contact_roles` if HubSpot's free tier doesn't expose association label writes via API.
- Write contact: `CrmAdapter.upsertContact(...)`.

**Migration Notes**
- Drop local `contacts` table.
- `role_in_deal` is the trickiest — it's per-deal, not per-contact, so it shouldn't be a contact-level custom property. Recommended: use HubSpot association labels if free tier permits. If not, store in Nexus `deal_contact_roles (hubspot_deal_id, hubspot_contact_id, role, is_primary)`. Flag for Prompt 7.7 to confirm HubSpot capability.
- Identity dedup: when HubSpot returns a contact by email match, link to existing `people` row (Section 3).

---

### `coordinator_patterns` — Nexus

**Current Purpose**
Persisted cross-deal patterns detected by intelligence coordinator. Survives actor destruction. Pattern ID is unique. (Migration 0011.)

**v2 Classification and Rationale**
Pure Nexus intelligence. Per DECISIONS.md 2.17, this is the authoritative coordinator table; v2 removes the parallel `dealAgentStates.coordinatedIntel` write path. Call prep queries `coordinator_patterns` directly.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `pattern_id`, `signal_type`, `vertical`, `competitor`, `synthesis`, `recommendations`, `arr_impact`, `deal_count`, `status`, `detected_at`, `synthesized_at`, `created_at`, `updated_at` | Nexus `coordinator_patterns` | unchanged | None | |
| `deal_ids` (text[]) | Nexus `coordinator_patterns` | `hubspot_deal_ids` (text[]) | HubSpot→Nexus | Reference becomes HubSpot deal IDs |
| `deal_names` (text[]) | Drop or derive on read | — | — | Pull live from HubSpot via adapter; don't store stale names |

**v2 Access Pattern**
`IntelligenceCoordinator.detect(...)`, `IntelligenceCoordinator.getPatternsForDeal(hubspotDealId)`, `IntelligenceCoordinator.synthesize(patternId)`.

**Migration Notes**
- Drop `deal_names`; resolve via `CrmAdapter.getDeal()` at render time (cached).
- Per DECISIONS.md 2.17, the coordinator code path no longer pushes to `dealAgentStates.coordinatedIntel` (since `dealAgentStates` is dropped). Call prep service queries `coordinator_patterns` directly.

---

### `cross_agent_feedback` — Nexus

**Current Purpose**
One team member's recommendation TO another about a specific deal/account/vertical. "Alex Kim says watch out for their CISO" notes.

**v2 Classification and Rationale**
Pure Nexus — feedback between AI agents is intelligence-layer, not CRM data.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `source_member_id`, `target_member_id`, `content`, `vertical`, `created_at` | Nexus `cross_agent_feedback` | unchanged | None | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | |
| `account_id` | Nexus | `hubspot_company_id` | HubSpot→Nexus | |

**v2 Access Pattern**
`AgentService.recordCrossAgentFeedback(...)`, `AgentService.listFeedbackFor(targetMemberId, { dealId?, accountId?, vertical? })`.

**Migration Notes**
None beyond the FK rewrites.

---

### `customer_messages` — Split

**Current Purpose**
Inbound post-close customer communications (email, support_ticket, slack, meeting_note). AI-categorized; optionally augmented with `responseKit` jsonb (similar resolutions, recommended resources, draft reply).

**v2 Classification and Rationale**
Channel-native messages (email, support tickets) belong in HubSpot as engagements OR HubSpot Service Hub tickets. AI categorization, response kit, and AI-classified priority are intelligence — Nexus owns them. Split: ingestion in HubSpot, intelligence overlay in Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Both | HubSpot engagement/ticket ID + Nexus `customer_messages.id` | — | Two IDs, linked |
| `company_id` | HubSpot association | native | HubSpot→Nexus | |
| `contact_id` | HubSpot association | native | HubSpot→Nexus | |
| `deal_id` | HubSpot association | native | HubSpot→Nexus | |
| `subject`, `body`, `received_at` | HubSpot Engagement (Email) or Service Hub Ticket | native | HubSpot→Nexus | Pull via webhook |
| `channel` | Derived from HubSpot type | — | HubSpot→Nexus | Email engagement → `email`, Ticket → `support_ticket`, etc. Slack/meeting_note may be Nexus-only ingestion |
| `priority` | HubSpot Ticket native (if ticket) OR `nexus_priority` custom prop | `hs_ticket_priority` or `nexus_priority` | Bidirectional | |
| `status` | HubSpot Ticket native (if ticket) + Nexus | `hs_pipeline_stage` + `nexus_response_kit_status` | Bidirectional | HubSpot status is the operational truth; Nexus tracks `pending|kit_ready|responded|resolved` separately |
| `response_kit` (jsonb) | Nexus `customer_messages` | `response_kit jsonb` | None | AI-generated; never to HubSpot |
| `responded_at`, `response_text` | HubSpot Engagement (outbound email) + Nexus link | native + `responded_engagement_id` | Bidirectional | |
| `ai_category` | Nexus + HubSpot custom | `nexus_ai_category` (enumeration) | Nexus→HubSpot | Write-back so HubSpot users see the AI label |
| `created_at`, `updated_at` | Both | | | |

**v2 Access Pattern**
- Inbound: webhook (HubSpot engagement.created or ticket.created) → adapter parses → calls `CustomerMessageService.ingest(hubspotId)`.
- Generate kit: `CustomerMessageService.generateResponseKit(messageId)` (Claude call, writes Nexus `response_kit`).
- Send response: `CustomerMessageService.sendResponse(messageId, body)` → `CrmAdapter.logEngagement(...)` to HubSpot, then update Nexus status.

**Migration Notes**
- v2 starts with seed data: `seed-book.ts` rewrites to create HubSpot tickets/engagements for the 8 demo customer messages, then inserts Nexus `customer_messages` rows linking back.
- Slack/meeting_note channels stay Nexus-only (no HubSpot equivalent for free tier ad-hoc notes).

---

### `deal_agent_states` — Drop

**Current Purpose**
Persistent Supabase mirror of Rivet `dealAgent` actor state. One row per deal. Holds learnings, risk signals, competitive context, coordinated intel, brief_pending, pipeline status, intervention dismissal.

**v2 Classification and Rationale**
Rivet is removed (DECISIONS.md 2.6). Per DECISIONS.md 2.16, intelligence state is event-sourced in `deal_events` with snapshots in `deal_snapshots`. Every column on `deal_agent_states` becomes either an event or a projection from events.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `deal_id` | — | — | — | Replaced by `hubspot_deal_id` everywhere |
| `interaction_count`, `last_interaction_date`, `last_interaction_summary` | Nexus `deal_snapshots` | derived from events | None | |
| `learnings` (jsonb) | Nexus `deal_events` (event_type=`learning_recorded`) + projected to `deal_snapshots.learnings` | None | |
| `risk_signals` (jsonb) | Nexus `deal_events` (event_type=`risk_signal_added` / `risk_signal_resolved`) + projected | None | |
| `competitive_context` (jsonb) | Nexus `deal_events` (event_type=`competitive_intel_recorded`) + projected | None | |
| `coordinated_intel` (jsonb) | Drop entirely | — | — | Per DECISIONS.md 2.17, call prep queries `coordinator_patterns` directly; this column is the broken-link from Flow 6 |
| `brief_ready` (jsonb), `brief_pending` (boolean) | Nexus `jobs` table (background brief generation per 2.6) | `briefs.status` + `briefs.payload` | None | |
| `pipeline_status`, `pipeline_step`, `pipeline_details` | Nexus `jobs` table | unchanged in spirit | None | |
| `intervention_dismissed`, `intervention_dismissed_at` | Nexus `deal_events` (event_type=`intervention_dismissed`) | None | Per DECISIONS.md 1.14, interventions are data-driven via applicability gating |
| `created_at`, `updated_at` | Implicit on `deal_events` | | | |

**v2 Access Pattern**
`DealIntelligence.getSnapshot(hubspotDealId)` returns the merged projection. `DealIntelligence.appendEvent(hubspotDealId, event)` writes new events.

**Migration Notes**
- Codex must build `deal_events` and `deal_snapshots` tables before this drop is safe (Phase 1 of the rebuild).
- Replay logic: `deal_snapshots` is rebuildable from `deal_events` via a fold function — store this fold separately (`services/intelligence/projections.ts`) and run periodically (pg_cron) to refresh snapshots.
- `dealAgentStates.healthScore` was promised in CLAUDE.md but never had a column. v2 implements real health scoring as a projection (per DECISIONS.md 1.14).

---

### `deal_fitness_events` — Nexus (subsumed into `deal_events` taxonomy)

**Current Purpose**
25 oDeal events per deal (Business/Emotional/Technical/Readiness Fit). `status: detected | not_yet | negative`. Citations to transcripts and emails.

**v2 Classification and Rationale**
Per DECISIONS.md 2.16, all intelligence is in `deal_events`. Fitness events are a subtype — events whose `event_type` is `fitness_*` and whose payload includes the oDeal category, key, evidence, and confidence. The 25-slot framework persists as an applicability rule (per 2.21): the Fitness UI queries `deal_events` filtered to fitness types and joins against a static `fitness_event_taxonomy` definition (which 25 keys exist per category).

Alternatively keep as a separate specialized table for query convenience. **Recommended:** keep separate. The 25-slot model is rich enough to deserve its own surface, queries are stage-based (often "all events for this deal grouped by category"), and forcing it through the generic event log makes the queries awkward. Flag this as a tradeoff: Codex reviews during build.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Nexus `deal_fitness_events` | `id` | None | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | |
| `fit_category` | Nexus | unchanged | None | Enum migration: `business_fit | emotional_fit | technical_fit | readiness_fit` |
| `event_key`, `event_label`, `event_description`, `status`, `detected_at`, `lifecycle_phase`, `detection_sources`, `source_references`, `evidence_snippets`, `confidence`, `detected_by`, `notes`, `created_at`, `updated_at` | Nexus | unchanged | None | |
| `contact_id` | Nexus | `hubspot_contact_id` | HubSpot→Nexus | |
| `contact_name` | Drop or derive | — | — | Pull from `CrmAdapter.getContact()` at render time |

**v2 Access Pattern**
`DealFitnessService.getEventsForDeal(hubspotDealId)`, `DealFitnessService.upsertEvents(hubspotDealId, events)`.

**Migration Notes**
- Either keep separate (recommended) or fold into `deal_events`. Decision deferred to Codex's first detailed Phase 2 review.
- Drop `contact_name`; resolve live.

---

### `deal_fitness_scores` — Nexus

**Current Purpose**
Rolled-up fitness score per deal (1:1 unique). Per-category scores + overall + velocity + benchmarks + cached jsonb (`stakeholderEngagement`, `buyerMomentum`, `conversationSignals`).

**v2 Classification and Rationale**
Pure Nexus. Snapshot table — derived from `deal_fitness_events` (or `deal_events`) by the analysis service. Doesn't go to HubSpot, but the overall score and velocity trend may be written back as HubSpot custom properties (`nexus_fitness_score`, `nexus_fitness_velocity`) so HubSpot users see them on the deal record.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Nexus | `id` | None | |
| `deal_id` | Nexus | `hubspot_deal_id` (UNIQUE) | HubSpot→Nexus | |
| `business_fit_score`, `emotional_fit_score`, `technical_fit_score`, `readiness_fit_score` (+ `_detected`, `_total`) | Nexus | unchanged; FIX `readnessFitDetected` typo to `readinessFitDetected` (02-SCHEMA debt #2) | None | |
| `overall_fitness` | Nexus + HubSpot custom | `nexus_fitness_score` (number 0-100) | Nexus→HubSpot | Surface on the HubSpot deal record |
| `velocity_trend` | Nexus + HubSpot custom | `nexus_fitness_velocity` (enumeration: accelerating, stable, decelerating, stalled) | Nexus→HubSpot | |
| `last_event_at`, `days_since_last_event`, `fit_imbalance_flag`, `events_this_week`, `events_last_week`, `benchmark_vs_won` | Nexus | unchanged | None | |
| `stakeholder_engagement`, `buyer_momentum`, `conversation_signals` (jsonb) | Nexus | unchanged | None | Heavy display payloads — Nexus-only |
| `created_at`, `updated_at` | Nexus | unchanged | None | |

**v2 Access Pattern**
`DealFitnessService.getScores(hubspotDealId)`, `DealFitnessService.recompute(hubspotDealId)` (recomputes from events + writes scores + writes back to HubSpot).

**Migration Notes**
- Fix `readnessFitDetected` typo on the way through.
- Add Nexus→HubSpot writeback for the two summary properties so HubSpot users see fitness without opening Nexus.

---

### `deal_milestones` — Nexus (or subsumed into `deal_events`)

**Current Purpose**
Buyer-journey milestone tracker per deal: "champion_identified", "economic_buyer_engaged", etc. Source: manual, transcript, email, ai_detected.

**v2 Classification and Rationale**
Recommended: subsume into `deal_events` per DECISIONS.md 2.16. A milestone IS an event with `event_type=milestone_completed` and `payload: { milestoneKey, evidence, source }`. Queries become "list events of type milestone_*". Eliminates a redundant table.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus `deal_events` | event_type=`milestone_completed`, payload jsonb | None | |

**v2 Access Pattern**
`DealIntelligence.listEvents(hubspotDealId, { eventTypes: ['milestone_completed'] })`. Optional `MilestoneService.getCompletedFor(hubspotDealId)` convenience wrapper.

**Migration Notes**
- Codex confirms during Phase 2 schema design whether milestones get a dedicated table for query convenience or fold into `deal_events`. Default: fold.

---

### `deal_stage_history` — Drop

**Current Purpose**
Audit log of stage transitions per deal. `from_stage`, `to_stage`, `changed_by` (ai|human), `reason`. Append-only.

**v2 Classification and Rationale**
HubSpot tracks deal stage history natively (deal property history is queryable via API). Nexus separately appends a `stage_changed` event to `deal_events` capturing the AI-vs-human discriminator (HubSpot doesn't natively know this). Drop the standalone table.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `deal_id`, `from_stage`, `to_stage` | HubSpot deal property history | native | HubSpot→Nexus | Read via `CrmAdapter.getDealStageHistory(hubspotDealId)` |
| `changed_by` | Nexus `deal_events` | event_type=`stage_changed`, payload.changedBy | None | |
| `reason` | Nexus `deal_events` | payload.reason | None | |
| `created_at` | Both | HubSpot timestamp + Nexus event timestamp | | |

**v2 Access Pattern**
- Stage history (operational): `CrmAdapter.getDealStageHistory(hubspotDealId)`.
- AI-vs-human attribution + reason: `DealIntelligence.listEvents(hubspotDealId, { eventTypes: ['stage_changed'] })`.

**Migration Notes**
Drop the table. Codex's call to `CrmAdapter.updateDealStage(...)` writes both HubSpot's stage AND a `stage_changed` event in Nexus — single operation.

---

### `deals` — Split

**Current Purpose**
Central pipeline entity. Standard CRM fields (name, value, stage, close_date, vertical, product, lead_source, competitor) + close-analysis fields (loss_reason, close_competitor, close_notes, close_improvement, win_turning_point, win_replicable, close_ai_analysis, close_factors, win_factors, close_ai_ran_at_timestamp, closed_at, stage_entered_at).

**v2 Classification and Rationale**
HubSpot owns deals — every standard CRM field is a HubSpot Deal property. AI-derived fields (close_ai_analysis, close_factors, win_factors) become Nexus-only intelligence (jsonb) since HubSpot has no good shape for them. Smaller AI-derived scalars (loss_reason, win_turning_point) become HubSpot custom properties so they're visible to anyone in HubSpot.

Per DECISIONS.md 1.13, deal creation is a Day-1 v2 feature with deal-creation UI in Nexus that writes through the adapter to HubSpot.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | HubSpot deal ID (string) | — | — | Drop local UUID |
| `name` | HubSpot Deal native | `dealname` | Bidirectional | |
| `company_id` | HubSpot association (Deal↔Company) | native | Bidirectional | |
| `primary_contact_id` | HubSpot association label | `primary_contact` | Bidirectional | |
| `assigned_ae_id` | HubSpot Deal native (owner) | `hubspot_owner_id` | Bidirectional | |
| `assigned_bdr_id` | HubSpot Deal custom | `nexus_bdr_owner_id` (single-line text, HubSpot owner ID) | Bidirectional | HubSpot has one native owner; secondary owners go in custom props |
| `assigned_sa_id` | HubSpot Deal custom | `nexus_sa_owner_id` | Bidirectional | |
| `stage` | HubSpot Deal native | `dealstage` (enumeration via pipeline) | Bidirectional | Stage values defined by HubSpot pipeline (Prompt 7.7) |
| `deal_value` | HubSpot Deal native | `amount` | Bidirectional | |
| `currency` | HubSpot Deal native | `deal_currency_code` | Bidirectional | |
| `close_date` | HubSpot Deal native | `closedate` | Bidirectional | |
| `win_probability` | HubSpot Deal native | `hs_deal_stage_probability` (or `nexus_win_probability` if HubSpot's auto-probability conflicts) | Bidirectional | |
| `forecast_category` | HubSpot Deal native or custom | `hs_forecast_category` (native) or `nexus_forecast_category` (custom enum) | Bidirectional | Free-tier feature gating may force custom |
| `vertical` | HubSpot Deal custom | `nexus_vertical` (enumeration) | Bidirectional | Denormalized from company; allows per-deal override |
| `product` | HubSpot Deal custom | `nexus_product` (enumeration: claude_api, claude_enterprise, claude_team) | Bidirectional | |
| `lead_source` | HubSpot Deal custom | `nexus_lead_source` (enumeration) | Bidirectional | |
| `competitor` | HubSpot Deal custom | `nexus_primary_competitor` (single-line text) | Bidirectional | |
| `loss_reason` | HubSpot Deal native | `closed_lost_reason` (HubSpot-native field) | Bidirectional | |
| `close_competitor` | HubSpot Deal custom | `nexus_close_competitor` | Bidirectional | |
| `close_notes` | HubSpot Deal custom | `nexus_close_notes` (multi-line text) | Bidirectional | |
| `close_improvement` | HubSpot Deal custom | `nexus_close_improvement` (multi-line text) | Bidirectional | |
| `win_turning_point` | HubSpot Deal custom | `nexus_win_turning_point` (multi-line text) | Bidirectional | |
| `win_replicable` | HubSpot Deal custom | `nexus_win_replicable` (multi-line text) | Bidirectional | |
| `close_ai_analysis` (jsonb) | Nexus `deal_intelligence` (new) | `close_ai_analysis jsonb` | None | Heavy payload, Nexus-only |
| `close_factors` (jsonb) | Nexus `deal_intelligence` | `close_factors jsonb` | None | |
| `win_factors` (jsonb) | Nexus `deal_intelligence` | `win_factors jsonb` | None | |
| `close_ai_ran_at_timestamp` | Both | `nexus_last_close_analysis_at` (HubSpot custom datetime) + `deal_intelligence.close_ai_ran_at` | Nexus→HubSpot | |
| `closed_at` | HubSpot Deal native | `closedate` (when stage = closed_*) | Bidirectional | |
| `stage_entered_at` | HubSpot Deal property history | derived from native | HubSpot→Nexus | Computed from deal property history |
| `created_at` | HubSpot Deal native | `createdate` | HubSpot→Nexus | |
| `updated_at` | HubSpot Deal native | `hs_lastmodifieddate` | HubSpot→Nexus | |

**v2 Access Pattern**
- Read: `CrmAdapter.getDeal(hubspotDealId)` returns merged Deal type (HubSpot fields + `nexus_*` custom props).
- Read intelligence overlay: `DealIntelligenceService.getOverlay(hubspotDealId)` returns `{ closeAiAnalysis, closeFactors, winFactors, ... }`.
- Read merged view: `DealService.get(hubspotDealId)` composes both.
- Create: `DealService.create({ name, companyId, primaryContactId, amount, stage, closeDate, vertical, ... })` — calls `CrmAdapter.createDeal()`, then initializes `deal_events` with `DealCreated` and `StageSet` per DECISIONS.md 1.13.
- Update field: `DealService.update(hubspotDealId, fields)`.
- Update stage: `DealService.updateStage(hubspotDealId, newStage, { reason, changedBy })` — writes HubSpot AND appends `stage_changed` event.

**Migration Notes**
- The `deals` table is dropped; `deal_intelligence` (new) holds the heavy jsonb close-analysis payloads keyed by HubSpot deal ID.
- All seeds (`seed.ts`, `seed-book.ts`, `seed-deal-fitness.ts`) rewrite to call `CrmAdapter.createDeal()` and capture HubSpot deal IDs.
- Per DECISIONS.md 1.13, MEDDPICC edit UI also ships Day-1 — see `meddpicc_fields` entry below.

---

### `email_sequences` — Nexus (with hooks for HubSpot Sequences)

**Current Purpose**
Multi-step outbound email campaigns per deal/contact.

**v2 Classification and Rationale**
HubSpot has Sequences (paid feature) but free tier doesn't. v2 keeps email sequences in Nexus for the demo, with each sent step logged as a HubSpot Engagement (Email). If a customer wants HubSpot Sequences integration later, the adapter pulls sequences via API.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `name`, `status`, `created_at`, `updated_at` | Nexus `email_sequences` | unchanged | None | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | |
| `contact_id` | Nexus | `hubspot_contact_id` | HubSpot→Nexus | |
| `assigned_ae_id` | Nexus | `team_member_id` | None | |

**v2 Access Pattern**
`OutreachService.createSequence(...)`, `OutreachService.listForDeal(hubspotDealId)`.

**Migration Notes**
None significant. Optional: flag for Prompt 7.7 — does Anthropic want HubSpot Sequences integration? If yes, abstract behind `OutreachAdapter` (separate from `CrmAdapter`).

---

### `email_steps` — Nexus

**Current Purpose**
Individual email within a sequence. Tracks delivery, open, click, reply state.

**v2 Classification and Rationale**
Same as `email_sequences` — Nexus owns drafted/staged steps; each `sent` step also creates a HubSpot Engagement (Email) so the rep sees it in HubSpot.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `step_number`, `subject`, `body`, `delay_days`, `status`, `sent_at`, `opened_at`, `replied_at`, `ai_generated`, `created_at`, `updated_at` | Nexus `email_steps` | unchanged | None | |
| `sequence_id` | Nexus | unchanged | None | |
| (new) | Nexus | `hubspot_engagement_id` (text, nullable) | Nexus→HubSpot | When step status = sent, link to the HubSpot Engagement created |

**v2 Access Pattern**
`OutreachService.sendStep(stepId)` → `CrmAdapter.logEngagement(...)` → updates `hubspot_engagement_id` and `sent_at`.

**Migration Notes**
None.

---

### `feedback_requests` — Nexus

**Current Purpose**
One team member's request to change another team member's agent. Manager can approve/reject.

**v2 Classification and Rationale**
Pure Nexus. Per DECISIONS.md 2.25 #3, this is the approval surface for AI-driven agent config mutations.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus `feedback_requests` | unchanged | None | |

**v2 Access Pattern**
`AgentService.requestFeedback(...)`, `AgentService.approveFeedback(requestId)`, `AgentService.listPendingFor(memberId)`.

**Migration Notes**
None beyond aligning with the event-sourced proposal pattern (an approved feedback request appends an `agent_config_change_applied` deal_event).

---

### `field_queries` — Nexus

**Current Purpose**
Manager-initiated questions to the field. `initiated_by` has no FK (heterogeneous: team_member or support_function_member).

**v2 Classification and Rationale**
Pure Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `raw_question`, `ai_analysis`, `aggregated_answer`, `status`, `expires_at`, `initiated_at`, `created_at`, `updated_at` | Nexus | unchanged | None | |
| `initiated_by` | Nexus | unchanged (still no FK; resolved by `kind` discriminator) | None | Per 02-SCHEMA debt #6 — Codex adds `initiated_by_kind text NOT NULL` discriminator (`team_member | support_function_member`) |
| `cluster_id` | Nexus | unchanged | None | |

**v2 Access Pattern**
`FieldQueryService.create(...)`, `FieldQueryService.list({ status })`, `FieldQueryService.aggregate(queryId)`.

**Migration Notes**
- Add `initiated_by_kind` discriminator to clean up heterogeneous FK (debt #6).
- No CRM reference; stays Nexus-pure.

---

### `field_query_questions` — Nexus

**Current Purpose**
Per-AE question instance spawned from a field_query. Stores chip prompt, AE response, AI-generated give-back.

**v2 Classification and Rationale**
Pure Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `query_id`, `target_member_id`, `question_text`, `chips`, `response_text`, `response_type`, `responded_at`, `give_back`, `records_updated`, `status`, `created_at` | Nexus | unchanged | None | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | |
| `account_id` | Nexus | `hubspot_company_id` | HubSpot→Nexus | |

**v2 Access Pattern**
`FieldQueryService.respond(questionId, response)`, `FieldQueryService.listForMember(memberId)`.

**Migration Notes**
None significant.

---

### `influence_scores` — Nexus

**Current Purpose**
Per-member, per-dimension, per-vertical influence score (process_innovation, competitive_intel, technical_expertise, deal_coaching, customer_insight).

**v2 Classification and Rationale**
Pure Nexus intelligence.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged | None | |

**v2 Access Pattern**
`InfluenceService.getForMember(memberId)`, `InfluenceService.recompute(memberId)`.

**Migration Notes**
None.

---

### `knowledge_articles` — Nexus

**Current Purpose**
Internal KB: implementation guides, case studies, resolution histories. No FK to companies (loose `related_company_ids` array).

**v2 Classification and Rationale**
Pure Nexus. HubSpot Knowledge Base exists (paid Service Hub) but v2 owns this for AI response kit generation.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged | None | |
| `related_company_ids` (uuid[]) | Nexus | `related_hubspot_company_ids` (text[]) | HubSpot→Nexus | Loose array — convert to HubSpot company IDs |

**v2 Access Pattern**
`KnowledgeService.search({ vertical?, products?, tags? })`, `KnowledgeService.get(articleId)`.

**Migration Notes**
None significant. Codex may want to add full-text search index; out of scope for boundary mapping.

---

### `lead_scores` — Nexus

**Current Purpose**
ICP match / engagement / intent composite scoring per company+deal.

**v2 Classification and Rationale**
Pure Nexus intelligence. Score may be written back to HubSpot deal as `nexus_lead_score` for visibility.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `score`, `scoring_factors`, `icp_match_pct`, `engagement_score`, `intent_score`, `created_at` | Nexus | unchanged | None | |
| `company_id` | Nexus | `hubspot_company_id` | HubSpot→Nexus | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | |
| (new write-back) | HubSpot Deal custom | `nexus_lead_score` (number) | Nexus→HubSpot | |

**v2 Access Pattern**
`LeadScoreService.recompute(companyId, dealId?)` writes Nexus row + writes back HubSpot summary score.

**Migration Notes**
None significant.

---

### `manager_directives` — Nexus

**Current Purpose**
Leadership directives (org/vertical/role/member scope). Injected into call prep as DIRECTIVE language.

**v2 Classification and Rationale**
Pure Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged | None | |

**v2 Access Pattern**
`DirectiveService.getActiveFor({ memberId, vertical, scope })` — returns applicable directives per applicability gating (DECISIONS.md 2.21).

**Migration Notes**
None.

---

### `meddpicc_fields` — Nexus

**Current Purpose**
MEDDPICC scoring per deal (1:1 unique). 7 dimensions × (text + confidence). `ai_extracted`, `ae_confirmed` flags.

**v2 Classification and Rationale**
Pure Nexus intelligence (event-sourced per DECISIONS.md 2.16). Per DECISIONS.md 1.13, MEDDPICC EDIT UI is a Day-1 feature — `ae_confirmed` finally gets used. Each dimension is updated via `meddpicc_updated` event; the table is the snapshot/projection. Optionally write back the 7 confidence scores to HubSpot as custom properties so HubSpot users can see them.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id` | Nexus | `id` | None | |
| `deal_id` | Nexus | `hubspot_deal_id` (UNIQUE) | HubSpot→Nexus | |
| `metrics`, `metrics_confidence` | Nexus + HubSpot custom | `metrics text` + `nexus_meddpicc_metrics_score` (number) | Nexus→HubSpot for score | |
| `economic_buyer`, `economic_buyer_confidence` | Same pattern | `nexus_meddpicc_eb_score` | Nexus→HubSpot for score | |
| `decision_criteria`, `decision_criteria_confidence` | Same | `nexus_meddpicc_dc_score` | Nexus→HubSpot | |
| `decision_process`, `decision_process_confidence` | Same | `nexus_meddpicc_dp_score` | Nexus→HubSpot | |
| `identify_pain`, `identify_pain_confidence` | Same | `nexus_meddpicc_pain_score` | Nexus→HubSpot | |
| `champion`, `champion_confidence` | Same | `nexus_meddpicc_champion_score` | Nexus→HubSpot | |
| `competition`, `competition_confidence` | Same | `nexus_meddpicc_competition_score` | Nexus→HubSpot | |
| (overall) | HubSpot Deal custom | `nexus_meddpicc_score` (number 0-100, average of 7) | Nexus→HubSpot | |
| `ai_extracted`, `ae_confirmed` | Nexus | unchanged | None | `ae_confirmed` finally used by Day-1 MEDDPICC edit UI |
| `created_at`, `updated_at` | Nexus | unchanged | None | |

**v2 Access Pattern**
- Read: `MeddpiccService.getForDeal(hubspotDealId)`.
- Update from transcript pipeline: `MeddpiccService.applyExtraction(hubspotDealId, dimensionUpdates)` — appends `meddpicc_updated` event, writes snapshot, writes back HubSpot scores.
- Manual edit (Day-1 UI): `MeddpiccService.setDimension(hubspotDealId, dimension, { text, score, aeConfirmed: true })` — same event-sourced path.

**Migration Notes**
- Codex builds MEDDPICC edit UI in Phase 2 (Core CRUD).
- Write-back to HubSpot is non-blocking — if HubSpot API errors, Nexus snapshot is still authoritative.

---

### `notifications` — Nexus

**Current Purpose**
Per-team-member notification feed.

**v2 Classification and Rationale**
Pure Nexus. HubSpot has its own notification system; we don't try to merge.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `team_member_id`, `type`, `title`, `message`, `is_read`, `priority`, `created_at` | Nexus | unchanged | None | |
| `deal_id` | Nexus | `hubspot_deal_id` | HubSpot→Nexus | |

**v2 Access Pattern**
`NotificationService.list(memberId)`, `NotificationService.markRead(notificationId)`, `NotificationService.create(...)` (called by intelligence services).

**Migration Notes**
None.

---

### `observation_clusters` — Nexus

**Current Purpose**
Semantic groupings of observations. Aggregate metrics, severity, ARR impact.

**v2 Classification and Rationale**
Pure Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged; convert text-stored enums (signal_type, severity, resolution_status) to real Postgres enums per 02-SCHEMA debt #3 | None | |

**v2 Access Pattern**
`ObservationService.listClusters({ vertical?, severity?, status? })`, `ObservationService.getClusterDetail(clusterId)`.

**Migration Notes**
- Migrate text-stored enums to real pgEnum types (debt #3 high-value targets).
- `arr_impact_total` references HubSpot deal values via the `linked_deal_ids` chain; recompute via adapter at refresh time.

---

### `observation_routing` — Nexus

**Current Purpose**
Routes observations to support functions + target members. `target_member_id` has no FK (points at `support_function_members`).

**v2 Classification and Rationale**
Pure Nexus. Per DECISIONS.md 1.10, the GET endpoint for this is dead code candidate — but the table itself stays since pipeline writes to it.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged; clean up heterogeneous FK per debt #6 | None | |

**v2 Access Pattern**
`ObservationService.listRoutingFor(targetMemberId)`. Read endpoint deprecated unless reused.

**Migration Notes**
- Add `target_member_kind` discriminator (debt #6).
- v2 review: if no consumer, drop the read API (DECISIONS.md 1.10) but keep the table since writes still happen.

---

### `observations` — Nexus

**Current Purpose**
Raw field observations. AI-classified into 9 signal types. The most important capture surface in Nexus.

**v2 Classification and Rationale**
Pure Nexus per DECISIONS.md 2.19. v2 cleans up the loose-uuid arrays.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `observer_id`, `raw_input`, `source_context`, `ai_classification`, `ai_giveback`, `status`, `lifecycle_events`, `cluster_id`, `follow_up_question`, `follow_up_response`, `follow_up_chips`, `structured_data`, `arr_impact`, `extracted_entities`, `created_at`, `updated_at` | Nexus | unchanged; migrate `status` text to enum (debt #3) | None | |
| `linked_account_ids` (uuid[]) | Nexus | `linked_hubspot_company_ids` (text[]) | HubSpot→Nexus | Per DECISIONS.md 2.3 (PENDING), may become a many-to-many join table; for now stay array-shaped |
| `linked_deal_ids` (uuid[]) | Nexus | `linked_hubspot_deal_ids` (text[]) | HubSpot→Nexus | Same |

**v2 Access Pattern**
- Capture: `ObservationService.create({ observerId, rawInput, sourceContext, ... })`.
- Read for deal: `ObservationService.listForDeal(hubspotDealId)`.
- Read clustered: `ObservationService.listByCluster(clusterId)`.

**Migration Notes**
- Convert text-stored signal types in `ai_classification` jsonb to canonical `SignalTaxonomy` enum (DECISIONS.md 2.13).
- DECISIONS.md 2.3 (observation→deal relationship) is PENDING; this mapping assumes the array shape persists. If 2.3 resolves to many-to-many, add `observation_deals` join table.

---

### `playbook_ideas` — Nexus (rename to `experiments`)

**Current Purpose**
Experimental sales-process tactics with full lifecycle. Holds A/B test groups, success thresholds, current metrics, attribution, deal-level evidence.

**v2 Classification and Rationale**
Pure Nexus per DECISIONS.md 2.19. Per DECISIONS.md 1.3, v2 ships POST endpoint (currently missing); per 2.21, every experiment carries structured `applicability` jsonb. Recommended rename: `experiments` matches the v2 vocabulary.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `originator_id`, `originated_from`, `source_observation_id`, `title`, `hypothesis`, `category`, `vertical`, `status`, `test_start_date`, `test_end_date`, `results`, `followers`, `follower_count`, `success_thresholds`, `current_metrics`, `approved_by`, `approved_at`, `graduated_at`, `experiment_duration_days`, `experiment_start`, `experiment_end`, `attribution`, `experiment_evidence`, `created_at`, `updated_at` | Nexus `experiments` | unchanged; migrate text-stored enums (originated_from, category, status, vertical) to real enums | None | |
| `test_group` (text[]), `control_group` (text[]) | Nexus | unchanged (member IDs) | None | |
| `test_group_deals` (text[]), `control_group_deals` (text[]) | Nexus | `test_group_hubspot_deal_ids`, `control_group_hubspot_deal_ids` | HubSpot→Nexus | |
| (new) | Nexus | `applicability jsonb` per DECISIONS.md 2.21 | None | Stage / temporal / precondition rules |

**v2 Access Pattern**
- `ExperimentService.create(...)` — Day-1 endpoint (DECISIONS.md 1.3).
- `ExperimentService.getApplicableForDeal(hubspotDealId)` — passes through applicability gate.
- `ExperimentService.transition(id, newStatus, ...)` — enforces lifecycle transitions per DECISIONS.md 1.5.

**Migration Notes**
- Rename table to `experiments`.
- Drop legacy `promoted` and `retired` statuses; consolidate into the `proposed | active | graduated | killed` lifecycle (DECISIONS.md 1.5).
- Add `applicability` jsonb column (Codex Phase 2).

---

### `resources` — Nexus

**Current Purpose**
Knowledge-hub asset catalog (one-pagers, battlecards, etc.).

**v2 Classification and Rationale**
Pure Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged | None | |

**v2 Access Pattern**
`ResourceService.list({ vertical?, type?, tags? })`.

**Migration Notes**
None.

---

### `support_function_members` — Nexus

**Current Purpose**
Non-sales personas (Enablement, PMM, Deal Desk, CS). Separate from `team_members` because they have no deal assignments.

**v2 Classification and Rationale**
Pure Nexus. HubSpot Owners doesn't model "Enablement" cleanly; keep distinct.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| All columns | Nexus | unchanged | None | |

**v2 Access Pattern**
`SupportFunctionService.list({ function?, vertical? })`.

**Migration Notes**
None. Per DECISIONS.md 1.9, the 14-person demo org is preserved.

---

### `system_intelligence` — Nexus

**Current Purpose**
Pre-computed org-wide insights (pattern summaries, trend findings) injected into call prep.

**v2 Classification and Rationale**
Pure Nexus.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `vertical`, `insight_type`, `title`, `insight`, `supporting_data`, `confidence`, `relevance_score`, `status`, `created_at`, `updated_at` | Nexus | unchanged | None | |
| `account_id` | Nexus | `hubspot_company_id` | HubSpot→Nexus | |

**v2 Access Pattern**
`SystemIntelligenceService.getApplicable({ vertical, accountId })` — passes through applicability gate.

**Migration Notes**
None.

---

### `team_members` — Nexus (linked to HubSpot Owners)

**Current Purpose**
Sales team profiles. No auth — persona switching reads from this table.

**v2 Classification and Rationale**
Per DECISIONS.md 2.19 "rep accounts" stay in Nexus. But HubSpot has Owners (system users). Nexus team_members link to HubSpot owner IDs so deal assignments map cleanly. Per DECISIONS.md 2.1 (PENDING), real auth may eventually replace persona switching — when it does, Nexus team_members ties to the auth identity.

**Field-by-Field Mapping**

| Current Field | v2 Destination | v2 Field Name | Sync Direction | Notes |
|---|---|---|---|---|
| `id`, `name`, `email`, `role`, `vertical_specialization`, `is_active`, `avatar_url`, `capacity_target`, `created_at`, `updated_at` | Nexus `team_members` | unchanged | None | |
| (new) | Nexus | `hubspot_owner_id` (text, unique nullable) | HubSpot→Nexus | Identity link to HubSpot Owner |

**v2 Access Pattern**
`TeamService.list()`, `TeamService.getByHubspotOwnerId(ownerId)` — used when webhook delivers a deal owned by a HubSpot owner ID.

**Migration Notes**
- Add `hubspot_owner_id` column.
- Seed creates HubSpot Owners (or maps to Anthropic-owned existing ones), captures IDs into team_members rows.
- 02-SCHEMA debt #8 (`email` not unique) persists for demo data; v2 add unique index when auth lands.

---

## Section 2: The `CrmAdapter` Interface

This is the production-ready TypeScript interface. Codex implements `HubSpotAdapter implements CrmAdapter` in v2. All methods are async; all errors are typed.

```typescript
// services/crm/types.ts

export type HubSpotId = string;          // HubSpot's numeric IDs as strings
export type Vertical = "healthcare" | "financial_services" | "manufacturing" | "retail" | "technology" | "general";
export type DealStage = string;           // Resolved by Prompt 7.7 from HubSpot pipeline config
export type ContactRole = "champion" | "economic_buyer" | "technical_evaluator" | "end_user" | "blocker" | "coach";
export type EngagementType = "email" | "call" | "meeting" | "note" | "task";

export interface Company {
  hubspotId: HubSpotId;
  name: string;
  domain: string | null;
  industry: string | null;       // HubSpot native (free text)
  vertical: Vertical | null;     // nexus_vertical custom
  employeeCount: number | null;
  annualRevenue: number | null;
  techStack: string[];           // serialized from nexus_tech_stack
  hqLocation: string | null;
  description: string | null;
  enrichmentSource: "apollo" | "clearbit" | "simulated" | null;
  createdAt: Date;
  updatedAt: Date;
  customProperties: Record<string, unknown>;  // any other nexus_* props
}

export interface Contact {
  hubspotId: HubSpotId;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedinUrl: string | null;
  companyId: HubSpotId | null;
  createdAt: Date;
  updatedAt: Date;
  customProperties: Record<string, unknown>;
}

export interface DealContactRole {
  hubspotContactId: HubSpotId;
  role: ContactRole | null;
  isPrimary: boolean;
}

export interface Deal {
  hubspotId: HubSpotId;
  name: string;
  companyId: HubSpotId;
  primaryContactId: HubSpotId | null;
  ownerId: HubSpotId | null;        // hubspot_owner_id
  bdrOwnerId: HubSpotId | null;     // nexus_bdr_owner_id
  saOwnerId: HubSpotId | null;      // nexus_sa_owner_id
  stage: DealStage;
  amount: number | null;
  currency: string | null;
  closeDate: Date | null;
  winProbability: number | null;
  forecastCategory: string | null;
  vertical: Vertical | null;
  product: string | null;
  leadSource: string | null;
  primaryCompetitor: string | null;
  lossReason: string | null;
  closeCompetitor: string | null;
  closeNotes: string | null;
  closeImprovement: string | null;
  winTurningPoint: string | null;
  winReplicable: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customProperties: Record<string, unknown>;
}

export interface Engagement {
  hubspotId: HubSpotId;
  type: EngagementType;
  subject: string | null;
  body: string | null;
  timestamp: Date;
  ownerId: HubSpotId | null;
  associations: {
    dealIds: HubSpotId[];
    contactIds: HubSpotId[];
    companyIds: HubSpotId[];
  };
  metadata: Record<string, unknown>;  // direction, duration, status, etc. by type
}

export interface DealStageTransition {
  fromStage: DealStage | null;
  toStage: DealStage;
  changedAt: Date;
  changedByOwnerId: HubSpotId | null;
}

export interface DealResolution {
  hubspotId: HubSpotId;
  name: string;
  companyName: string;
  stage: DealStage;
  matchScore: number;       // 0-1
}

export interface StakeholderResolution {
  hubspotContactId: HubSpotId | null;
  matchedName: string | null;
  confidence: number;       // 0-1
  reason: "exact_email" | "exact_name" | "fuzzy_name" | "title_match" | "no_match";
}

export interface WebhookEvent {
  eventType: string;        // 'deal.creation', 'deal.propertyChange', 'contact.creation', etc.
  objectType: "deal" | "contact" | "company" | "engagement";
  objectId: HubSpotId;
  propertyName?: string;
  newValue?: unknown;
  oldValue?: unknown;
  occurredAt: Date;
  portalId: HubSpotId;
}

// Error types
export class CrmAdapterError extends Error {
  constructor(message: string, public readonly cause?: unknown) { super(message); }
}
export class CrmNotFoundError extends CrmAdapterError {}
export class CrmAuthError extends CrmAdapterError {}
export class CrmRateLimitError extends CrmAdapterError { constructor(message: string, public readonly retryAfterSeconds: number) { super(message); } }
export class CrmValidationError extends CrmAdapterError {}
export class CrmTransientError extends CrmAdapterError {}    // network, 5xx
```

```typescript
// services/crm/adapter.ts

export interface CrmAdapter {
  // ─── Deal CRUD ───────────────────────────────────────

  /** Create a deal in HubSpot. Throws CrmValidationError if required fields missing. Returns the new deal with its HubSpot ID. Hits HubSpot API directly (no cache). */
  createDeal(input: {
    name: string;
    companyId: HubSpotId;
    primaryContactId?: HubSpotId;
    ownerId?: HubSpotId;
    stage: DealStage;
    amount?: number;
    closeDate?: Date;
    vertical?: Vertical;
    customProperties?: Record<string, unknown>;
  }): Promise<Deal>;

  /** Get a single deal by HubSpot ID. Reads cache first, falls back to API. Throws CrmNotFoundError if absent. */
  getDeal(hubspotId: HubSpotId): Promise<Deal>;

  /** Update one or more fields on a deal. Bidirectional fields use this; AI-generated nexus_* properties use updateDealCustomProperties. Hits API + invalidates cache. */
  updateDeal(hubspotId: HubSpotId, fields: Partial<Omit<Deal, "hubspotId" | "createdAt" | "updatedAt" | "customProperties">>): Promise<Deal>;

  /** Update HubSpot custom properties (nexus_*). Used for AI-derived field writes. Hits API + invalidates cache. */
  updateDealCustomProperties(hubspotId: HubSpotId, props: Record<string, unknown>): Promise<void>;

  /** List deals matching filter criteria. Cache-aware. */
  listDeals(filters?: {
    ownerId?: HubSpotId;
    stage?: DealStage | DealStage[];
    vertical?: Vertical;
    closedSince?: Date;
    limit?: number;
  }): Promise<Deal[]>;

  /** Delete a deal. Throws if HubSpot returns 4xx/5xx. Cascade behavior is HubSpot-defined. Hits API. */
  deleteDeal(hubspotId: HubSpotId): Promise<void>;

  /** Update deal stage with reason. Writes HubSpot stage AND optionally appends to deal_events upstream (caller's responsibility). Hits API + invalidates cache. */
  updateDealStage(hubspotId: HubSpotId, newStage: DealStage, options?: { reason?: string }): Promise<Deal>;

  /** Get full stage history for a deal. Reads HubSpot deal property history. Hits API; cached for 60s. */
  getDealStageHistory(hubspotId: HubSpotId): Promise<DealStageTransition[]>;

  // ─── Contact CRUD ────────────────────────────────────

  createContact(input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    title?: string;
    companyId?: HubSpotId;
    customProperties?: Record<string, unknown>;
  }): Promise<Contact>;

  getContact(hubspotId: HubSpotId): Promise<Contact>;

  /** Upsert a contact by email. Returns existing contact if email matches; otherwise creates. */
  upsertContact(input: { email: string; firstName: string; lastName: string; companyId?: HubSpotId; customProperties?: Record<string, unknown> }): Promise<Contact>;

  updateContact(hubspotId: HubSpotId, fields: Partial<Omit<Contact, "hubspotId" | "createdAt" | "updatedAt" | "customProperties">>): Promise<Contact>;

  updateContactCustomProperties(hubspotId: HubSpotId, props: Record<string, unknown>): Promise<void>;

  listContacts(filters?: { companyId?: HubSpotId; email?: string; limit?: number }): Promise<Contact[]>;

  /** List contacts associated with a deal, including per-deal role/primary metadata. */
  listDealContacts(hubspotDealId: HubSpotId): Promise<Array<Contact & { role: ContactRole | null; isPrimary: boolean }>>;

  /** Set the per-deal role and primary flag for a contact. Uses HubSpot association labels if available; falls back to Nexus deal_contact_roles table. */
  setContactRoleOnDeal(hubspotDealId: HubSpotId, hubspotContactId: HubSpotId, role: ContactRole | null, isPrimary?: boolean): Promise<void>;

  deleteContact(hubspotId: HubSpotId): Promise<void>;

  // ─── Company CRUD ────────────────────────────────────

  createCompany(input: {
    name: string;
    domain?: string;
    vertical?: Vertical;
    employeeCount?: number;
    annualRevenue?: number;
    customProperties?: Record<string, unknown>;
  }): Promise<Company>;

  getCompany(hubspotId: HubSpotId): Promise<Company>;

  upsertCompany(input: { domain: string; name: string; vertical?: Vertical; customProperties?: Record<string, unknown> }): Promise<Company>;

  updateCompany(hubspotId: HubSpotId, fields: Partial<Omit<Company, "hubspotId" | "createdAt" | "updatedAt" | "customProperties">>): Promise<Company>;

  updateCompanyCustomProperties(hubspotId: HubSpotId, props: Record<string, unknown>): Promise<void>;

  listCompanies(filters?: { vertical?: Vertical; domain?: string; limit?: number }): Promise<Company[]>;

  deleteCompany(hubspotId: HubSpotId): Promise<void>;

  // ─── Engagements (Activities) ────────────────────────

  /** Log an email/call/meeting/note/task engagement. Used for AI-sent emails, AI-recorded calls, etc. Hits API. */
  logEngagement(input: {
    type: EngagementType;
    subject?: string;
    body?: string;
    timestamp?: Date;             // defaults to now
    ownerId?: HubSpotId;
    associations: { dealIds?: HubSpotId[]; contactIds?: HubSpotId[]; companyIds?: HubSpotId[] };
    metadata?: Record<string, unknown>;
  }): Promise<Engagement>;

  getEngagement(hubspotId: HubSpotId): Promise<Engagement>;

  listEngagements(filters: {
    dealId?: HubSpotId;
    contactId?: HubSpotId;
    companyId?: HubSpotId;
    types?: EngagementType[];
    since?: Date;
    limit?: number;
  }): Promise<Engagement[]>;

  // ─── Resolution Helpers ──────────────────────────────

  /** Single canonical fuzzy deal resolver — replaces 4 duplicated copies (DECISIONS.md 2.25 #2). Matches deal name OR company name with ILIKE; ranks by exact-match-then-shortest-name. Returns top N matches. */
  resolveDeal(query: string, options?: { limit?: number; verticalFilter?: Vertical }): Promise<DealResolution[]>;

  /** Resolve a speaker name from a transcript to a HubSpot contact. Tries email match first, then exact name on deal contacts, then fuzzy name on company contacts, then no_match. */
  resolveStakeholder(speakerName: string, hubspotDealId: HubSpotId, options?: { speakerEmail?: string }): Promise<StakeholderResolution>;

  // ─── Bulk Sync ───────────────────────────────────────

  /** Pull all deals from HubSpot, hydrate cache, upsert any cached fields. Used by pg_cron periodic sync. Returns count synced. */
  bulkSyncDeals(options?: { since?: Date; pageSize?: number }): Promise<{ synced: number; failed: number }>;

  bulkSyncContacts(options?: { since?: Date; pageSize?: number }): Promise<{ synced: number; failed: number }>;

  bulkSyncCompanies(options?: { since?: Date; pageSize?: number }): Promise<{ synced: number; failed: number }>;

  bulkSyncEngagements(options?: { since?: Date; pageSize?: number }): Promise<{ synced: number; failed: number }>;

  // ─── Webhooks ────────────────────────────────────────

  /** Parse a raw HubSpot webhook payload into typed events. Validates signature against HUBSPOT_WEBHOOK_SECRET. Throws CrmAuthError on invalid signature. */
  parseWebhookPayload(rawBody: string, signature: string): Promise<WebhookEvent[]>;

  /** Called by the webhook receiver after parsing. Updates cache, emits Nexus deal_events where intelligence-relevant, triggers downstream jobs. */
  handleWebhookEvent(event: WebhookEvent): Promise<void>;

  // ─── Cache & Health ──────────────────────────────────

  /** Force a cache refresh for a single object. Used after Nexus writes to ensure subsequent reads see the change. */
  invalidateCache(objectType: "deal" | "contact" | "company" | "engagement", hubspotId: HubSpotId): Promise<void>;

  /** Health check — returns ok/degraded/down + latency. Used by /api/health. */
  healthCheck(): Promise<{ status: "ok" | "degraded" | "down"; latencyMs: number; rateLimitRemaining: number | null }>;
}
```

**Error semantics summary.** All methods throw `CrmAdapterError` subclasses on failure. Callers MUST distinguish:
- `CrmNotFoundError` — 404 from HubSpot. Caller decides whether to surface or treat as "deal was deleted upstream."
- `CrmAuthError` — 401/403. Caller surfaces to operations; demo mode falls through to in-memory dataset.
- `CrmRateLimitError` — 429. Caller respects `retryAfterSeconds` and queues. Background jobs auto-retry with exponential backoff.
- `CrmValidationError` — 400. Caller surfaces to UI as validation error.
- `CrmTransientError` — 5xx, network. Caller retries up to 3x with backoff.

---

## Section 3: The `people` Table

Per DECISIONS.md 2.19, the `people` table exists in Nexus v1 even though cross-account intelligence isn't built on day one. It's an identity-resolution layer — the same human across multiple HubSpot contact records (e.g., Amanda Chen at Acme; Amanda Chen at Beta after she moved jobs).

### Schema (Drizzle)

```typescript
// packages/db/src/schema.ts

export const people = pgTable("people", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Canonical identity
  fullName: text("full_name").notNull(),
  primaryEmail: text("primary_email"),       // current best-known email
  knownEmails: text("known_emails").array(), // every email we've seen for this person

  // Link to HubSpot — many contacts may resolve to one person
  // (this column is the inverse: people.id is referenced by people_contacts join below)

  // Current employment (latest known)
  currentTitle: text("current_title"),
  currentCompanyName: text("current_company_name"),  // free text — may not match any HubSpot company
  currentHubspotCompanyId: text("current_hubspot_company_id"),  // nullable; set when we can resolve

  // Demographics (rarely used; reserved for future intelligence)
  linkedinUrl: text("linkedin_url"),
  location: text("location"),

  // Lifecycle
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),

  // Identity confidence — how sure are we that all linked HubSpot contacts are the same person?
  identityConfidence: decimal("identity_confidence", { precision: 3, scale: 2 }),

  // Manual override flag — true if a human has confirmed/merged this identity
  manuallyConfirmed: boolean("manually_confirmed").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("people_primary_email_idx").on(table.primaryEmail),
]);

export const peopleContacts = pgTable("people_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: uuid("person_id").references(() => people.id).notNull(),
  hubspotContactId: text("hubspot_contact_id").notNull(),

  // When this link was established
  linkedAt: timestamp("linked_at").defaultNow().notNull(),
  linkMethod: text("link_method").notNull(),  // 'email_match' | 'name_company_match' | 'manual_merge'
  linkConfidence: decimal("link_confidence", { precision: 3, scale: 2 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("people_contacts_hubspot_id_idx").on(table.hubspotContactId),  // 1:1 — one HubSpot contact = one person
]);
```

### Indexes

- `people_primary_email_idx` (unique on `primary_email`) — fast email lookups during identity resolution.
- `people_contacts_hubspot_id_idx` (unique on `hubspot_contact_id`) — guarantees one HubSpot contact maps to exactly one person row.
- Recommended additional: `people_known_emails_gin` (GIN index on the array) for fast multi-email lookup.

### Relationship to `stakeholders`

Nexus does not have a `stakeholders` table per se — DECISIONS.md 2.19's mention of "stakeholders" refers to the conceptual entity. In v2:
- HubSpot `contacts` are the stakeholder identity records (book-of-business).
- Nexus `people` is the cross-account identity layer that joins stakeholders across accounts.
- Nexus `deal_events` with type `stakeholder_engagement_recorded` carry the engagement analysis (who joined which call, sentiment, weeks active).
- The `key_stakeholders` jsonb on `account_health` references HubSpot contact IDs; the `people` table resolves those contact IDs to canonical identities.

### Identity establishment and dedup

When a new HubSpot contact arrives via webhook:

1. **Email match (high confidence).** If the new contact's email matches `people.primary_email` OR `people.known_emails`, link to that person. Add the email to `known_emails` if new. `link_confidence = 1.0`.
2. **Name + company match (medium confidence).** If no email match, look for `people.full_name = newContact.firstName + ' ' + newContact.lastName` AND `people.current_hubspot_company_id != newContact.companyId` (different companies). If found, this is potentially a person who changed jobs — create a `people_contacts` link with `link_method = 'name_company_match'`, `link_confidence = 0.5`, and flag for manual review.
3. **No match.** Create a new `people` row. `identity_confidence = 1.0` (we're sure this is a new person until evidence suggests otherwise).
4. **Manual merge (UI, post-day-1).** A future UI lets an analyst merge two `people` rows — moves all `people_contacts` to the survivor, sets `manually_confirmed = true`, and writes a Nexus event for audit.

The `link_confidence` on `people_contacts` lets queries surface "fuzzy" identity matches without blocking on perfect resolution. For day 1, only exact email matches auto-link; everything else creates a new person row and the deduplication accumulates as users confirm or reject merges.

### v2 Access Pattern

- `PeopleService.resolveContact(hubspotContactId)` — returns the person row, creating it if absent.
- `PeopleService.linkContact(hubspotContactId, personId, method)` — explicit link.
- `PeopleService.mergePeople(survivorId, mergedId)` — manual merge.
- `PeopleService.findCandidateMerges()` — returns name+company collisions for review.

### Migration Notes

v1 has no `people` table. Codex creates it in migration `0012_add_people.sql`. Backfill: iterate every HubSpot contact, run identity resolution, populate `people` and `people_contacts`. Backfill is idempotent (re-runs are safe) since the unique index on `people_contacts.hubspot_contact_id` prevents duplicate links.

---

## Section 4: Sync Architecture

Concrete design for keeping HubSpot and Nexus in sync. Two directions, one cache layer, three failure modes.

### Read path: HubSpot → Nexus

**Trigger sources.**
1. **Webhooks** (primary) — HubSpot pushes events to `POST /api/hubspot/webhook`. Real-time for the events HubSpot supports.
2. **Periodic full sync** (safety net) — `pg_cron` job runs every 15 minutes calling `CrmAdapter.bulkSync*()` for each object type, scoped to `?since=<lastSyncTimestamp>`. Reconciles missed webhooks.
3. **On-demand pull** (cache miss) — `CrmAdapter.getDeal(id)` falls through to HubSpot API when cache is cold or stale.

**Subscribed webhook events.**
- `deal.creation` — new deal in HubSpot. Adapter creates Nexus cache row + appends `deal_events` `DealCreated`.
- `deal.propertyChange` (filtered to: `dealstage`, `amount`, `closedate`, `nexus_*`, `hubspot_owner_id`) — appends typed `deal_events` (`stage_changed`, `amount_updated`, etc.) and updates cache. Other property changes update cache only.
- `deal.deletion` — marks Nexus cache row tombstoned (does not cascade-delete intelligence; that's archived for retention).
- `contact.creation` — adds to cache + creates/links `people` row.
- `contact.propertyChange` (filtered to: `email`, `firstname`, `lastname`, `nexus_role_in_deal`) — updates cache + may trigger `people` re-resolution if email changed.
- `contact.deletion` — tombstone in cache.
- `company.creation`, `company.propertyChange`, `company.deletion` — same pattern.
- `engagement.creation` — for emails/calls/meetings/notes from HubSpot. Updates cache. If associated to a deal, may append `deal_events` (e.g., a logged customer email becomes `customer_message_received`).

**What Nexus does with incoming data.**
- Update read-through cache (Section 4 below).
- Emit Nexus `deal_events` where the event has intelligence consequences (per DECISIONS.md 2.16).
- Trigger downstream jobs via the `jobs` table (DECISIONS.md 2.6) — e.g., a stage change to `closed_lost` enqueues a close-analysis job.
- Broadcast to UI via Supabase Realtime if the affected deal page is open.

**Failure handling.**
- **Webhook signature invalid** → 401 + audit log; no cache update.
- **Webhook payload malformed** → 400 + audit log + Sentry alert.
- **Database write failure on webhook handler** → return 500 to HubSpot; HubSpot retries up to 10x over 24h. Periodic full sync also catches missed events.
- **Webhook delivery dropped entirely** → next periodic full sync reconciles. SLA: stale data window ≤ 15 min.

### Write path: Nexus → HubSpot

**When Nexus writes to HubSpot.**
1. **User-initiated CRUD via Nexus UI** — deal creation (DECISIONS.md 1.13), contact updates, MEDDPICC dimension edits, stage transitions. All go through `CrmAdapter.update*()`.
2. **AI-generated property updates** — pipeline writes `nexus_meddpicc_score`, `nexus_fitness_score`, `nexus_fitness_velocity`, `nexus_lead_score`, `nexus_ai_category`, `nexus_renewal_date`, etc. via `CrmAdapter.updateDealCustomProperties(...)`.
3. **AI-sent engagements** — when Nexus sends a customer email, it logs a HubSpot Engagement (Email) so the rep sees it in HubSpot.

**What Nexus never writes.**
- Native HubSpot fields the user owns: `dealname`, `dealstage` (only via explicit user action in Nexus UI), `amount` (same), `closedate` (same), `pipeline`, `dealtype`, contact `firstname`/`lastname`/`email` unless user-initiated edit.
- HubSpot system fields: `hs_*` namespace except those explicitly required (`hs_deal_stage_probability`, `hs_associations`, etc.).

**Write queuing and retry.**
- All Nexus→HubSpot writes go through the `jobs` table per DECISIONS.md 2.6. The job worker:
  - Carries an idempotency key (`nexus_write_id`) so retries don't double-apply.
  - On `CrmRateLimitError`, schedules retry at `now + retryAfterSeconds`.
  - On `CrmTransientError`, retries 3x with exponential backoff (5s, 25s, 125s).
  - On `CrmAuthError` or `CrmValidationError`, fails the job + alerts ops + leaves the underlying Nexus state unchanged (so a UI refresh shows the discrepancy).
- Synchronous writes (user clicks "Save") use the adapter directly and surface errors to the UI; the adapter optionally enqueues a retry job on transient failures.

### Cache layer

**Where it lives.** Postgres table, not Redis. Justification: (a) Postgres is already the primary store and the worker already connects to it, (b) we get atomic transactional consistency between cache writes and `deal_events` appends, (c) Redis adds an operational dependency for a v2 demo with predictable load. If the cache hit ratio becomes a bottleneck post-v2, swap to Redis behind the same cache interface.

**Schema.**

```typescript
export const hubspotCache = pgTable("hubspot_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectType: text("object_type").notNull(),  // 'deal' | 'contact' | 'company' | 'engagement'
  hubspotId: text("hubspot_id").notNull(),
  payload: jsonb("payload").notNull(),         // full HubSpot object as returned by API
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isTombstoned: boolean("is_tombstoned").notNull().default(false),
}, (table) => [
  uniqueIndex("hubspot_cache_object_idx").on(table.objectType, table.hubspotId),
]);
```

**TTL policy.**
- Deals: 60 minutes.
- Contacts: 60 minutes.
- Companies: 4 hours (changes rarely).
- Engagements: cached only for the duration of the request (read-through; not refreshed by webhooks since engagements are mostly add-only).

**Cache invalidation.**
- On webhook receipt, the cache row for the affected object is updated atomically (replace `payload`, push `synced_at`, push `expires_at`).
- On Nexus write, after successful HubSpot API call, `invalidateCache()` sets `expires_at = now()` to force the next read to refresh.
- On tombstone (deletion webhook), `is_tombstoned = true`. Reads return `CrmNotFoundError`.

**Staleness visibility in UI.**
- The `Deal` type returned by `getDeal()` includes a `_meta: { syncedAt, isStale }` field where `isStale = (now - syncedAt) > 5 minutes`.
- UI surfaces a subtle "Last synced 12 min ago" indicator in the deal header when stale. Reduces user confusion when HubSpot was updated externally but cache hasn't refreshed.
- Manual "Refresh from HubSpot" button on the deal detail page calls `invalidateCache()` + re-fetches.

### Demo-resilience

Per DECISIONS.md 2.18, the demo must remain runnable even if HubSpot is unavailable.

**Three modes:**

1. **Normal mode (default).** Webhooks active, cache fresh, all reads/writes hit HubSpot.
2. **Cache-only mode.** Detected when `CrmAdapter.healthCheck()` returns `down`. All reads serve from cache regardless of TTL. Writes are queued in the `jobs` table with `awaiting_hubspot_recovery` status; UI shows a banner ("Reading from cache; changes will sync when HubSpot reconnects").
3. **In-memory demo mode.** Detected when env var `NEXUS_DEMO_MODE=offline` OR `CrmAdapter.healthCheck()` has been `down` for > 10 minutes. The adapter short-circuits to an in-memory dataset loaded from `packages/db/src/seed-data/hubspot-demo.json`. Writes are accepted and persisted to the in-memory dataset; the dataset is rebuilt on next deploy.

**Cache pre-warming.** On v2 deploy, a startup task calls `CrmAdapter.bulkSyncDeals()` + `bulkSyncContacts()` + `bulkSyncCompanies()` to populate the cache before the first user request. Estimated initial sync time for the 10-deal demo dataset: < 30 seconds.

---

## Section 5: Field Name Conventions

### Naming rules for HubSpot custom properties

- **Prefix:** `nexus_` for all Nexus-owned custom properties.
- **Format:** lowercase snake_case (HubSpot's convention).
- **Reserved prefix:** `nexus_internal_` for properties that should NEVER appear in HubSpot UI (debugging, correlation IDs, sync state).
- **Type matching:** match HubSpot property types exactly — `string`, `number`, `datetime`, `enumeration`, `enumeration` (multi-select), `boolean`. Date fields use `datetime` not `date`.
- **Enumeration values:** match Nexus enum values exactly (lowercase snake_case). E.g., `nexus_vertical` accepts `healthcare | financial_services | manufacturing | retail | technology | general`.

### Initial custom properties for v2

Below: the canonical list of Nexus-owned HubSpot custom properties. Codex creates these via the HubSpot API on first deploy. Prompt 7.7 confirms type compatibility with HubSpot's free-tier limits.

#### On HubSpot Deal object

| Property name | Type | Written by | Read by |
|---|---|---|---|
| `nexus_vertical` | enumeration | DealService.create, AI vertical detection | Call prep, fitness analysis, coordinator |
| `nexus_product` | enumeration (claude_api, claude_enterprise, claude_team) | DealService.create | Call prep, intelligence dashboard |
| `nexus_lead_source` | enumeration | DealService.create | Analytics |
| `nexus_primary_competitor` | string (single-line text) | Pipeline (signal detection), user edit | Call prep, coordinator |
| `nexus_close_competitor` | string | Close-analysis service | Call prep for similar deals |
| `nexus_close_notes` | string (multi-line text) | Close-analysis service | Future-deal call prep |
| `nexus_close_improvement` | string (multi-line text) | Close-analysis service | Influence scoring |
| `nexus_win_turning_point` | string (multi-line text) | Close-analysis service | Future-deal call prep |
| `nexus_win_replicable` | string (multi-line text) | Close-analysis service | Experiments service |
| `nexus_meddpicc_score` | number (0-100) | MeddpiccService (avg of 7 dimensions) | HubSpot UI display, call prep |
| `nexus_meddpicc_metrics_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_meddpicc_eb_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_meddpicc_dc_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_meddpicc_dp_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_meddpicc_pain_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_meddpicc_champion_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_meddpicc_competition_score` | number (0-100) | MeddpiccService | HubSpot display |
| `nexus_fitness_score` | number (0-100) | DealFitnessService | HubSpot display, pipeline filtering |
| `nexus_fitness_velocity` | enumeration (accelerating, stable, decelerating, stalled) | DealFitnessService | HubSpot display |
| `nexus_lead_score` | number (0-100) | LeadScoreService | HubSpot display |
| `nexus_renewal_date` | datetime | AccountHealthService | Renewal management |
| `nexus_next_qbr_date` | datetime | User edit, AccountHealthService | QBR planning |
| `nexus_onboarding_complete` | boolean | AccountHealthService | Customer success |
| `nexus_products_purchased` | enumeration multi (claude_api, claude_enterprise, claude_team) | DealService on close-won | Account health, expansion |
| `nexus_bdr_owner_id` | string | DealService | Pipeline filtering |
| `nexus_sa_owner_id` | string | DealService | Pipeline filtering |
| `nexus_last_analysis_at` | datetime | TranscriptPipelineService | Cache freshness |
| `nexus_last_close_analysis_at` | datetime | Close-analysis service | UI badge |
| `nexus_internal_event_count` | number | DealIntelligence (after each event append) | Internal — debugging only |

#### On HubSpot Contact object

| Property name | Type | Written by | Read by |
|---|---|---|---|
| `nexus_role_in_deal` | enumeration (champion, economic_buyer, technical_evaluator, end_user, blocker, coach) | MEDDPICC edit UI, pipeline (stakeholder detection) | Call prep, fitness, MEDDPICC |
| `nexus_linkedin_url` | string | User edit, enrichment service | Profile display |
| `nexus_engagement_status` | enumeration (engaged, silent, new, departed) | Account health computation | Account health drawer |
| `nexus_first_observed_in_nexus` | datetime | First sync from HubSpot | Internal |
| `nexus_internal_person_id` | string | PeopleService.linkContact | Cross-account intelligence |

#### On HubSpot Company object

| Property name | Type | Written by | Read by |
|---|---|---|---|
| `nexus_vertical` | enumeration | Enrichment service, user edit | Vertical filtering everywhere |
| `nexus_tech_stack` | string (multi-line text, comma-delimited) | Enrichment service, observation extraction | Call prep, system intelligence |
| `nexus_enrichment_source` | enumeration (apollo, clearbit, simulated) | Enrichment service | Internal |
| `nexus_account_health_score` | number (0-100) | AccountHealthService | Pipeline / book filtering |
| `nexus_internal_company_intelligence_id` | string | First Nexus enrichment | Internal — joins to companies_intelligence |

**Total custom properties:** 28 on Deal, 5 on Contact, 5 on Company = 38 across the three object types. Prompt 7.7 confirms this fits HubSpot free tier (which allows up to ~250 custom properties per object).

---

## Section 6: Migration and Seed Strategy

v2 starts with no migrated production data. The 10-deal MedVista/HealthFirst/etc. dataset is recreated from scratch across HubSpot and Nexus. Deal Fitness's Horizon Health Partners dataset is recreated similarly.

### Seed structure

Each seed script splits its work into HubSpot creation + Nexus creation, in that order:

1. **HubSpot seed phase.** Calls `CrmAdapter.createCompany()`, `createContact()`, `createDeal()`, `logEngagement()` for every CRM-bound entity. Captures the returned HubSpot IDs into a local mapping `{ localKey: hubspotId }`.
2. **Nexus seed phase.** Inserts Nexus rows directly into Postgres, referencing the captured HubSpot IDs. Inserts `deal_events`, `observations`, `experiments`, `coordinator_patterns`, `meddpicc_fields`, `account_health`, `knowledge_articles`, `customer_messages`, `system_intelligence`, `manager_directives`, etc.

**Convention:** every seed script exports a `mapping` object after running so subsequent seed scripts can reference HubSpot IDs without re-querying.

```typescript
// packages/db/src/seed-deals.ts
import { CrmAdapter } from "@/services/crm/adapter";

export async function seedDeals(adapter: CrmAdapter) {
  const companies = {
    medvista: await adapter.createCompany({ name: "MedVista Health", domain: "medvista.example", vertical: "healthcare", customProperties: { nexus_tech_stack: "Epic, Dragon Medical, PACS" } }),
    nordicmed: await adapter.createCompany({ name: "NordicMed Group", domain: "nordicmed.example", vertical: "healthcare", customProperties: { nexus_tech_stack: "Cerner, PowerScribe" } }),
    // ...
  };
  const contacts = {
    medvista_champion: await adapter.createContact({ firstName: "Dr. Marcus", lastName: "Chen", email: "marcus@medvista.example", companyId: companies.medvista.hubspotId }),
    // ...
  };
  const deals = {
    medvista: await adapter.createDeal({
      name: "MedVista Discovery",
      companyId: companies.medvista.hubspotId,
      primaryContactId: contacts.medvista_champion.hubspotId,
      stage: "discovery",
      amount: 2_400_000,
      closeDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
      vertical: "healthcare",
      customProperties: { nexus_product: "claude_enterprise", nexus_lead_source: "outbound" },
    }),
    // ...
  };
  return { companies, contacts, deals };
}
```

### Demo reset procedure

Per DECISIONS.md 2.18 cache-resilience considerations, demo reset must work even when HubSpot is rate-limited mid-reset.

**Reset flow:**

1. **Mark reset in progress.** Set `nexus_demo_state.reset_at = now()` so concurrent UI requests show a loading state.
2. **Delete Nexus intelligence.** TRUNCATE all Nexus-owned tables (deal_events, observations, observation_clusters, observation_routing, experiments, coordinator_patterns, meddpicc_fields, account_health, customer_messages, deal_fitness_events, deal_fitness_scores, lead_scores, notifications, agent_actions_log [if kept], etc.). Preserve `team_members`, `support_function_members`, `knowledge_articles`, `resources`, `agent_configs`, `manager_directives`, `system_intelligence` (they're seed-data, not generated).
3. **Delete HubSpot data.** For each deal/contact/company in HubSpot whose ID matches the demo seed mapping, call `CrmAdapter.deleteDeal()` etc. Use `try/catch` per delete — if HubSpot returns 404 (already gone), continue.
4. **Re-seed HubSpot.** Run `seedDeals()`, `seedDealFitness()`, `seedBook()` against the adapter. Capture new HubSpot IDs.
5. **Re-seed Nexus.** Run Nexus-side seed scripts using the captured IDs.
6. **Refresh cache.** Call `bulkSync*()` to populate the cache with new HubSpot IDs.
7. **Clear reset state.** Unset `nexus_demo_state.reset_at`.

If step 3 or 4 fails on a HubSpot rate limit (`CrmRateLimitError`), the reset pauses, schedules retry per `retryAfterSeconds`, and the UI banner shows "Resetting demo (rate-limited; resuming in N seconds)..."

**Fallback for offline demos.** If `NEXUS_DEMO_MODE=offline`, demo reset skips HubSpot calls entirely and uses the in-memory dataset. Nexus seeds run as normal.

### Seed data files to recreate

**Currently TypeScript files in `packages/db/src/`:**
- `seed.ts` — main 10-deal seed.
- `seed-book.ts` — 18 post-close accounts.
- `seed-deal-fitness.ts` — Horizon Health Partners.
- `seed-playbook.ts` / `seed-playbook-lifecycle.ts` — 8 experiments.
- `seed-healthfirst-transcript.ts` — coordinator demo transcripts.
- `seed-data/*.json` — extracted playbook evidence.

**v2 split:**
- HubSpot creation logic moves into the same seed files but now calls `CrmAdapter.create*()` instead of `db.insert(...)` for CRM entities.
- Nexus-direct inserts remain for `observations`, `experiments`, `coordinator_patterns`, `account_health`, `knowledge_articles`, `manager_directives`, `system_intelligence`, `agent_configs`, etc.
- The 14-person demo org (`team_members` + `support_function_members`) per DECISIONS.md 1.9 stays in Nexus directly; HubSpot Owners are created separately and linked via `team_members.hubspot_owner_id`.

**Specific entity recreation requirements:**
- **MedVista, HealthFirst, NordicMed, TrustBank, etc. (10 deals)** — recreated as HubSpot Deals via `CrmAdapter.createDeal()`. Their close-state fields (`close_factors`, `win_factors`, `close_ai_analysis`) populate Nexus `deal_intelligence` table.
- **Horizon Health Partners (Deal Fitness demo)** — recreated as HubSpot deal + 7 contacts; the 5 transcripts and 14 emails recreated as HubSpot Engagements; the 25 fitness events populated in Nexus by running the analysis engine post-seed (so the events come from the actual Claude analysis, not pre-baked).
- **18 closed-won accounts (My Book)** — recreated as HubSpot Deals with `dealstage = closed_won`; account_health rows in Nexus.
- **8 customer messages** — recreated as HubSpot Tickets (Service Hub) OR HubSpot Engagements (Email); Nexus `customer_messages` rows link back; 6 of the 8 have pre-baked `response_kit` jsonb.
- **8 playbook experiments** — Nexus-only.
- **15 knowledge articles** — Nexus-only.

**Seed cost estimate for HubSpot API calls per full reset:**
- 28 companies + 30 contacts + 28 deals + ~80 engagements ≈ 170 API calls.
- HubSpot free tier: 100 calls/10s, 250k/day. Reset completes in ~17 seconds; well within rate budget.

---

## Section 7: Open Questions for Prompt 7.7

These need to be resolved before the HubSpot workspace can be designed.

1. **Pipeline stages.** Current Nexus uses 9 stages: `new_lead | qualified | discovery | technical_validation | proposal | negotiation | closing | closed_won | closed_lost`. Does v2 keep these exact names in HubSpot, or align to a HubSpot default pipeline (typically: Appointment Scheduled → Qualified to Buy → Presentation Scheduled → Decision Maker Bought-In → Contract Sent → Closed Won/Lost)? Demo data references "Discovery" and "Technical Validation" by name in transcripts and seed scripts — changing these requires either renaming demo references or remapping at the adapter layer.

2. **Custom property limits and types.** This document proposes 38 `nexus_*` custom properties across Deal/Contact/Company. HubSpot free tier reportedly allows ~250 per object. Does Anthropic's HubSpot account have any restrictions (e.g., sandbox account with stricter limits)? Are multi-line text fields and multi-select enumerations available on the tier we're using?

3. **Per-deal contact roles.** The `role_in_deal` (champion/EB/etc.) is logically per-deal, not per-contact (the same person may be champion on one deal, end-user on another). HubSpot supports association labels for deal-contact relationships, but free-tier capability and API access are unconfirmed. If association labels aren't usable, this document falls back to a Nexus-side `deal_contact_roles` join table — Prompt 7.7 needs to confirm which path.

4. **Webhook reliability and free-tier subscription scope.** Does HubSpot's free tier allow webhook subscriptions to all the events listed in Section 4 (deal/contact/company creation/propertyChange/deletion + engagement.creation)? If webhooks are restricted, do we need a polling fallback every N minutes? What's the latency budget?

5. **Rate limit budget under demo load.** Estimated steady-state: ~5 reads + ~2 writes per user action × ~50 actions per demo session = ~350 API calls per demo. Plus 170-call reset = ~520 calls per full demo cycle. HubSpot free tier: 100/10s burst, 250k/day. Concurrent demos (e.g., during a sales kickoff) could spike. Does Prompt 7.7 want to design a request-shaping layer (e.g., batch reads where possible)?

6. **Deal-contact association labels for "Primary contact."** Same question as #3 — HubSpot has a native concept; need to confirm free-tier API access for setting it programmatically.

7. **Sequences integration.** Section 1's `email_sequences` entry keeps sequences in Nexus. Does Anthropic want HubSpot Sequences integration (paid feature)? If yes, Prompt 7.7 should specify the integration shape.

8. **HubSpot owner provisioning.** Does Anthropic provision real HubSpot Owner records for the 14 demo personas, or do we point all assignments at a single shared owner ID? The latter is simpler for demos but loses the per-rep filtering story.

9. **`closed_lost_reason` HubSpot native vs. custom.** HubSpot has a native `closed_lost_reason` property (sometimes — depends on portal config). This document maps `loss_reason` to it; Prompt 7.7 should confirm it exists in the target portal or override to `nexus_loss_reason`.

10. **Service Hub vs. Engagement for customer messages.** Section 1's `customer_messages` entry suggests routing inbound messages to HubSpot Tickets (Service Hub). Free tier may not include Service Hub Tickets at the level we need. Fallback: log all inbound as Email Engagements with a custom `nexus_message_status` property. Prompt 7.7 picks the path.

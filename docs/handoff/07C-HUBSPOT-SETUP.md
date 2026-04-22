# 07C — HubSpot Workspace and Integration Setup

## Preamble

**Purpose.** Concrete HubSpot-side design for the CRM boundary defined in 07B. This document specifies the pipeline, stages, custom properties, association labels, webhook subscriptions, auth model, rate budget, and the setup playbook an operator runs against a fresh HubSpot workspace to produce the v2 demo environment.

**Inputs.** DECISIONS.md 2.18 (HubSpot hybrid strategy), 2.19 (data boundary), 1.13 (deal creation as Day-1), 07B-CRM-BOUNDARY.md (the 37-table mapping + `CrmAdapter` interface + 38-property list + 10 open questions).

**Consumers.**
- **Codex** — Section 8's playbook drives the first-deploy workspace setup. Sections 3, 5, 6 produce the literal API payloads Codex's `seed-hubspot.ts` script emits.
- **Jeff** — Section 8 steps that must be done manually (creating the HubSpot account, generating the private app token) call him out explicitly.
- **Future developers** — Sections 1, 2, 7, 10 document why the workspace is shaped the way it is, so the next person understands the trade-offs.

**Assumption baseline.** This document is written against HubSpot **Starter Customer Platform** (paid tier), per DECISIONS.md 2.18 (UPDATED). Jeff has committed to the ~$9/seat/month annual or $15/seat/month monthly pricing; one seat is sufficient for v2. The tier decision lifts the Free-tier 10-property-total cap that would otherwise force JSON-blob consolidation in Section 3, so all 38 custom properties from 07B Section 5 ship as first-class typed HubSpot fields. Rate limits, webhook availability, and auth model are identical to Free tier — all work in Sections 5, 6, 7 remains unchanged.

**What this document does not cover.** The `CrmAdapter` TypeScript interface (07B Section 2), the `people` table schema (07B Section 3), per-table field mapping (07B Section 1). Those are locked. This document designs HubSpot's internal shape; 07B designs the boundary.

---

## Section 1: HubSpot Starter Customer Platform Constraints and Confirmed Limits

Every design choice below rolls off one of these facts. Each limit is stated as: **our planned usage → the limit → headroom assessment**. All assessments below are against the Starter Customer Platform tier.

### 1.1 Pricing and seats

**Starter Customer Platform** — HubSpot's entry paid tier that unifies Sales/Marketing/Service/CMS/Operations Hubs at Starter level. Pricing per seat:
- **$9/seat/month** — annual commit, billed upfront.
- **$15/seat/month** — month-to-month.
- **One seat** provisioned for Jeff is sufficient for v2. Additional Nexus users read/write HubSpot through the private app token, not per-user HubSpot seats.

**Overage policy.** HubSpot monitors consumption against tier limits; if usage trips a cap (e.g., contact count, email sends), HubSpot's documented behavior is to auto-upgrade the account or surface a billing upgrade prompt rather than hard-block. For v2's demo scope (18 companies, 22 contacts, 18 deals) no limit is anywhere near its ceiling, but we flag this as a latent risk for unmonitored growth (Section 10). ASSUMPTION: exact overage mechanics should be confirmed against HubSpot's current commercial policy when the account is provisioned.

### 1.2 Custom properties

**Starter significantly relaxes the Free tier's 10-property-total ceiling.** On Starter, HubSpot allows on the order of **hundreds-to-thousands of custom properties per object type** (per-object, not per-account). The exact Starter number should be confirmed when the account is provisioned — widely-cited community and secondary sources report **1,000 custom properties per object** on Starter and above. ASSUMPTION: confirm the precise Starter Customer Platform cap in HubSpot's current pricing documentation before seeding; if the number diverges significantly we may need to revisit.

- **07B planned usage:** 38 custom properties (28 Deal + 5 Contact + 5 Company).
- **Starter limit (expected):** ~1,000 per object.
- **Headroom:** comfortable. All 38 properties ship as first-class typed HubSpot fields per Section 3. No JSON-blob consolidation is required.

### 1.3 API rate limits

**IDENTICAL to Free tier.** The tier upgrade does not change the rate budget. **100 requests per 10-second rolling window (burst); 250,000 requests per 24-hour rolling window (daily).** ([HubSpot: API usage guidelines and limits](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines) ↗, [HubSpot: Increasing our API limits](https://developers.hubspot.com/changelog/increasing-our-api-limits) ↗)

- **07B planned usage:**
  - Steady-state demo: ~350 calls/session (derived in Section 7.1).
  - Full demo reset: ~170-520 calls within ~20 seconds if issued naively; ~10 calls using batch endpoints (Section 7.5).
- **Starter burst limit:** 100/10s.
- **Headroom on burst:** tight during unbatched reset; **comfortable after batching** (Section 7.5).
- **Daily limit:** 250k.
- **Headroom on daily:** comfortable (5,000+ demo sessions/day possible).

All rate-budget calculations, batching logic, and cache TTLs in Section 7 carry over unchanged from the prior design.

### 1.4 Webhooks

**Available on Starter via private apps.** ([HubSpot: Create and edit webhook subscriptions in private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/create-and-edit-webhook-subscriptions-in-private-apps) ↗)

- Webhooks via the **Webhooks API** (not the "Send a Webhook" workflow action — the latter requires Operations Hub Professional).
- Supported subscription types cover `contact.*`, `company.*`, `deal.*`, `ticket.*`, `product.*`, `line_item.*`, `conversation.*`, plus `*.merge`, `*.restore`, `*.associationChange`. ([HubSpot: New subscription types for Webhooks](https://developers.hubspot.com/changelog/new-subscription-types-for-webhooks) ↗)
- **07B planned usage:** ~12 subscriptions (detailed Section 5). Event set unchanged by the tier upgrade.
- **Starter limit:** no documented per-app subscription cap.
- **Headroom:** comfortable.

### 1.5 Pipelines and stages

**Starter allows multiple custom deal pipelines** (Free was limited to the default pipeline only). ([HubSpot: Set up and manage object pipelines](https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines) ↗)

- **07B planned usage:** 1 pipeline ("Nexus Sales") with 9 stages.
- **Starter limit:** multiple pipelines allowed; no documented stage cap per pipeline.
- **Headroom:** comfortable.

**Design decision unchanged.** Section 2 still defines one pipeline for all verticals. Vertical is a deal property (`nexus_vertical`), not a pipeline dimension. Starter's capacity for additional pipelines is unused in v2 but available if a future vertical-specific process is introduced.

### 1.6 Association labels

**Custom association labels still require Professional tier or above** — not changed by the Starter upgrade. Starter has only HubSpot-defined default labels (most notably "Primary" for the contact↔company and contact↔deal relationships). ([HubSpot: Create and use association labels](https://knowledge.hubspot.com/object-settings/create-and-use-association-labels) ↗)

- **07B planned usage:** custom labels for `champion`, `economic_buyer`, `technical_evaluator`, `end_user`, `blocker`, `coach` on deal↔contact (per DECISIONS.md 2.19 stakeholder split).
- **Starter limit:** primary-only; no custom labels.
- **Headroom:** **over-limit**. Section 4 keeps the Nexus-side `deal_contact_roles` join table for role assignment; HubSpot's native "Primary" label covers the primary-contact concept. No design change from the prior revision.

### 1.7 Authentication model

**Private apps with access tokens available on Starter.** Super-admin access required to create. ([HubSpot: Legacy private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview) ↗, [SFAI Labs: How to Get Your HubSpot API Key (2026)](https://sfailabs.com/guides/how-to-get-hubspot-api-key) ↗)

- Private apps auth-gate the Anthropic demo-org's HubSpot. No multi-tenant OAuth required.
- Access token shown **once** at creation; Nexus stores it in env; rotation is a manual ops procedure.
- **Design consequence.** Section 6 specifies the private-app model; no OAuth flow to build.

### 1.8 Service Hub / tickets

**Starter Customer Platform includes Service Hub Starter**, but for inbound customer messages v2 still logs all messages as Email Engagements (not tickets) for consistency with DECISIONS.md 2.19 and to avoid dependence on ticket-pipeline configuration. Open question #10 resolution stands: engagements, not tickets.

### 1.9 Constraints that do NOT apply

**Contacts, deals, engagements, companies** — generous limits on Starter (typically 1,000-15,000+ for contacts depending on marketing-contact status; unlimited non-marketing contacts). No object-count caps constrain the 18-deal + 22-contact + 18-company demo dataset.

### 1.10 Ranked constraint summary

| Constraint | Starter limit | Our planned usage | Status |
|---|---|---|---|
| Custom properties (per object) | ~1,000 (ASSUMPTION; confirm) | 28 Deal / 5 Contact / 5 Company | comfortable |
| Deal pipelines | multiple allowed | 1 | comfortable |
| API burst | 100 req/10s | ~10 calls peak after batching | comfortable |
| API daily | 250k req/day | ~500/day | comfortable |
| Webhooks | no cap | 12 subscriptions | comfortable |
| Custom association labels | none (Pro+ only) | 6 planned | over → Nexus `deal_contact_roles` fallback |
| Service Hub automation | basic (Starter tier) | unused | n/a (engagements path) |
| Seats | 1 purchased | 1 used | comfortable |

---

## Section 2: Pipeline and Stage Design

### 2.1 One pipeline, not many

Nexus v2 uses **one deal pipeline** named **Nexus Sales**, serving all verticals.

**Why one pipeline.** Vertical is a property of the deal (`nexus_vertical`), not a structural dimension of the pipeline. Splitting by vertical would:
- Make cross-vertical pattern detection (coordinator service per DECISIONS.md 2.17) harder — coordinator currently queries deals regardless of pipeline.
- Force maintenance of N identical stage definitions.
- Add no demo value — the narrative is one org with deals in 5 verticals; one pipeline, filtered views.

### 2.2 Stages

Nine stages, preserving the current Nexus stage names used throughout seed data, call transcripts, and UI copy. Keeping the names identical resolves 07B open question #1 with the lowest-friction answer: no rename of demo content, no adapter-layer remapping.

| Order | Internal name | Display name | Default probability | Maps to current Nexus | Terminal? |
|---|---|---|---|---|---|
| 1 | `new_lead` | New Lead | 5% | `new_lead` | no |
| 2 | `qualified` | Qualified | 15% | `qualified` | no |
| 3 | `discovery` | Discovery | 30% | `discovery` | no |
| 4 | `technical_validation` | Technical Validation | 50% | `technical_validation` | no |
| 5 | `proposal` | Proposal | 65% | `proposal` | no |
| 6 | `negotiation` | Negotiation | 80% | `negotiation` | no |
| 7 | `closing` | Closing | 90% | `closing` | no |
| 8 | `closed_won` | Closed Won | 100% | `closed_won` | yes (won) |
| 9 | `closed_lost` | Closed Lost | 0% | `closed_lost` | yes (lost) |

**HubSpot-native closed stages.** HubSpot requires at least one `closedwon` and one `closedlost` semantic stage for its forecasting to work. The internal names `closed_won` / `closed_lost` carry HubSpot's `isClosed: true` and `probability: 1.0` / `0.0` respectively. Forecasts (`hs_forecast_category`) are set automatically when deals enter these stages.

### 2.3 Probability semantics

- `probability` is the default HubSpot auto-assigns to a deal entering the stage.
- Nexus may override per-deal via `hs_deal_stage_probability` (07B Deal mapping), e.g., a stage-5 deal with strong MEDDPICC overrides to 75%.
- Stage probabilities are used by HubSpot's native reporting; Nexus's own forecasting reads `overall_fitness` + MEDDPICC + stage as inputs and does not lean on these numbers for intelligence, only for display in HubSpot.

### 2.4 Applicability implications

Per DECISIONS.md 2.21, many Nexus surfaces are gated by stage. The stage-specific applicability rules stored in `experiments.applicability` and equivalent fields reference these internal names verbatim. Example:

```json
{
  "stages": ["discovery", "technical_validation", "proposal"],
  "minDaysInStage": 7,
  "requireMeddpicc": { "economic_buyer_confidence": "< 50" }
}
```

The internal names above are therefore a **contract** — Nexus code, Nexus seeds, and HubSpot all use the same nine strings.

### 2.5 API payload to create the pipeline

Codex's `seed-hubspot.ts` executes this once on first deploy. Idempotent via lookup-then-create.

```http
POST /crm/v3/pipelines/deals
Authorization: Bearer {NEXUS_HUBSPOT_TOKEN}
Content-Type: application/json

{
  "label": "Nexus Sales",
  "displayOrder": 0,
  "stages": [
    { "label": "New Lead", "displayOrder": 0, "metadata": { "probability": "0.05" } },
    { "label": "Qualified", "displayOrder": 1, "metadata": { "probability": "0.15" } },
    { "label": "Discovery", "displayOrder": 2, "metadata": { "probability": "0.30" } },
    { "label": "Technical Validation", "displayOrder": 3, "metadata": { "probability": "0.50" } },
    { "label": "Proposal", "displayOrder": 4, "metadata": { "probability": "0.65" } },
    { "label": "Negotiation", "displayOrder": 5, "metadata": { "probability": "0.80" } },
    { "label": "Closing", "displayOrder": 6, "metadata": { "probability": "0.90" } },
    { "label": "Closed Won", "displayOrder": 7, "metadata": { "probability": "1.00", "isClosed": "true" } },
    { "label": "Closed Lost", "displayOrder": 8, "metadata": { "probability": "0.00", "isClosed": "true" } }
  ]
}
```

HubSpot assigns a `pipelineId` and `stageId` per stage. Codex captures both into a `packages/db/src/seed-data/hubspot-pipeline-ids.json` artifact for the internal-name → HubSpot-ID mapping; the `CrmAdapter` resolves internal stage names through this mapping when writing `dealstage`.

### 2.6 Stage internal-name resolution in the adapter

The `CrmAdapter` stores the pipeline/stage IDs at construction time and exposes:

```typescript
interface HubSpotPipelineResolver {
  getStageId(internalName: DealStage): HubSpotId;      // "discovery" → "123456789"
  getInternalName(stageId: HubSpotId): DealStage;      // inverse
}
```

All `CrmAdapter.updateDealStage(...)` calls go through this resolver. Nexus never stores raw HubSpot stage IDs outside the mapping file.

---

## Section 3: Custom Property Specifications

All 38 custom properties from 07B Section 5 ship as individual first-class HubSpot properties per their natural types. No JSON-blob consolidation is required on Starter — the Free-tier consolidation pattern that would otherwise be forced by the 10-property cap is not used. Codex creates each property via the HubSpot Properties API on first deploy; a single seed definition file (`packages/seed-data/hubspot-properties.ts`) holds all 38 definitions.

The `nexus_internal_` prefix convention (per 07B Section 5) still applies to properties that should not surface in HubSpot UI (debugging, correlation IDs, sync state).

### 3.1 On HubSpot Deal object (28 properties)

| Property Name | HubSpot Type | Field Type | Description | Written By | Read By | Visibility |
|---|---|---|---|---|---|---|
| `nexus_vertical` | enumeration | select | Vertical enum | DealService, enrichment | Pipeline filtering, call prep | visible |
| `nexus_product` | enumeration | select | claude_api / claude_enterprise / claude_team | DealService.create | Forecasting, call prep | visible |
| `nexus_lead_source` | enumeration | select | inbound / outbound / plg_upgrade / partner / event | DealService.create | Analytics | visible |
| `nexus_primary_competitor` | string | single_line_text | Competitor name | Pipeline signal detection, user edit | Call prep, coordinator | visible |
| `nexus_close_competitor` | string | single_line_text | Competitor that won (if lost) | Close-analysis service | Future-deal call prep | visible |
| `nexus_close_notes` | string | multi_line_text | Freeform close notes | Close-analysis service | Future-deal call prep | visible |
| `nexus_close_improvement` | string | multi_line_text | What would have changed the outcome | Close-analysis service | Influence scoring | visible |
| `nexus_win_turning_point` | string | multi_line_text | The moment the deal turned | Close-analysis service | Future-deal call prep | visible |
| `nexus_win_replicable` | string | multi_line_text | What's replicable from this win | Close-analysis service | ExperimentService | visible |
| `nexus_meddpicc_score` | number | number | 0-100 average of 7 dimensions | MeddpiccService | HubSpot display, call prep, reports | visible |
| `nexus_meddpicc_metrics_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_meddpicc_eb_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_meddpicc_dc_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_meddpicc_dp_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_meddpicc_pain_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_meddpicc_champion_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_meddpicc_competition_score` | number | number | 0-100 | MeddpiccService | HubSpot display | visible |
| `nexus_fitness_score` | number | number | 0-100 oDeal composite | DealFitnessService | HubSpot display, pipeline filtering | visible |
| `nexus_fitness_velocity` | enumeration | select | accelerating / stable / decelerating / stalled | DealFitnessService | HubSpot display | visible |
| `nexus_lead_score` | number | number | 0-100 ICP+engagement+intent composite | LeadScoreService | HubSpot display | visible |
| `nexus_renewal_date` | datetime | datetime | Projected renewal date for closed-won deals | AccountHealthService | Renewal ops | visible |
| `nexus_next_qbr_date` | datetime | datetime | Next QBR date | User edit, AccountHealthService | QBR planning | visible |
| `nexus_onboarding_complete` | bool | booleancheckbox | Post-close onboarding flag | AccountHealthService | Customer success | visible |
| `nexus_products_purchased` | enumeration (multi) | checkbox | Set of products owned post-close | DealService on close-won | Account health, expansion | visible |
| `nexus_bdr_owner_id` | string | single_line_text | Secondary HubSpot owner (BDR) | DealService | Pipeline filtering | visible |
| `nexus_sa_owner_id` | string | single_line_text | Secondary HubSpot owner (SA) | DealService | Pipeline filtering | visible |
| `nexus_last_analysis_at` | datetime | datetime | Last transcript pipeline completion time | TranscriptPipelineService | Cache freshness badge | visible |
| `nexus_internal_event_count` | number | number | Nexus deal_events count — used for debug/QA | DealIntelligence | Internal only | admin-only (`nexus_internal_` naming) |

### 3.2 On HubSpot Contact object (5 properties)

| Property Name | HubSpot Type | Field Type | Description | Written By | Read By | Visibility |
|---|---|---|---|---|---|---|
| `nexus_role_in_deal` | enumeration | select | champion / economic_buyer / technical_evaluator / end_user / blocker / coach — applies to the contact's primary open deal only | MEDDPICC edit UI, pipeline | Call prep | visible |
| `nexus_linkedin_url` | string | single_line_text | LinkedIn URL | User edit, enrichment | Profile display | visible |
| `nexus_engagement_status` | enumeration | select | engaged / silent / new / departed | AccountHealthService | Account drawer | visible |
| `nexus_first_observed_in_nexus` | datetime | datetime | Timestamp of first Nexus-side sighting | First sync from HubSpot | Internal | visible |
| `nexus_internal_person_id` | string | single_line_text | Nexus people.id UUID for cross-account identity | PeopleService.linkContact | Cross-account intelligence | admin-only |

### 3.3 On HubSpot Company object (5 properties)

| Property Name | HubSpot Type | Field Type | Description | Written By | Read By | Visibility |
|---|---|---|---|---|---|---|
| `nexus_vertical` | enumeration | select | Vertical enum | Enrichment, user edit | Filtering | visible |
| `nexus_tech_stack` | string | multi_line_text | Comma-delimited tech stack | Enrichment, observation extraction | Call prep, system intel | visible |
| `nexus_enrichment_source` | enumeration | select | apollo / clearbit / simulated | Enrichment service | Internal | visible |
| `nexus_account_health_score` | number | number | 0-100 | AccountHealthService | Pipeline/book filtering | visible |
| `nexus_internal_company_intelligence_id` | string | single_line_text | Joins to Nexus `companies_intelligence` | First Nexus enrichment | Internal | admin-only |

### 3.4 Final totals

28 Deal custom properties + 5 Contact custom properties + 5 Company custom properties = **38 total**. Starter-tier custom property limits accommodate this comfortably. No consolidation is required; all properties ship as first-class HubSpot properties per their natural types.

### 3.5 Enumeration value formats

All `nexus_*` enumeration properties accept lowercase snake_case internal values matching the Nexus TypeScript enum definitions exactly:

- `nexus_vertical`: `healthcare`, `financial_services`, `manufacturing`, `retail`, `technology`, `general`
- `nexus_product`: `claude_api`, `claude_enterprise`, `claude_team`
- `nexus_lead_source`: `inbound`, `outbound`, `plg_upgrade`, `partner`, `event`
- `nexus_fitness_velocity`: `accelerating`, `stable`, `decelerating`, `stalled`
- `nexus_role_in_deal`: `champion`, `economic_buyer`, `technical_evaluator`, `end_user`, `blocker`, `coach`
- `nexus_engagement_status`: `engaged`, `silent`, `new`, `departed`
- `nexus_enrichment_source`: `apollo`, `clearbit`, `simulated`

Display labels are title-cased by the property definition (`Healthcare`, `Financial Services`, etc.).

### 3.6 API payload to create a single custom property

Identical pattern for Deal, Contact, Company — swap the URL path.

```http
POST /crm/v3/properties/deals
Authorization: Bearer {NEXUS_HUBSPOT_TOKEN}
Content-Type: application/json

{
  "name": "nexus_fitness_score",
  "label": "Nexus Fitness Score",
  "type": "number",
  "fieldType": "number",
  "groupName": "nexus_intelligence",
  "description": "0-100 oDeal composite fitness score computed by Nexus.",
  "displayOrder": 10,
  "hasUniqueValue": false,
  "formField": false
}
```

An `enumeration`:

```http
POST /crm/v3/properties/deals
{
  "name": "nexus_fitness_velocity",
  "label": "Nexus Fitness Velocity",
  "type": "enumeration",
  "fieldType": "select",
  "groupName": "nexus_intelligence",
  "options": [
    { "label": "Accelerating", "value": "accelerating", "displayOrder": 0 },
    { "label": "Stable", "value": "stable", "displayOrder": 1 },
    { "label": "Decelerating", "value": "decelerating", "displayOrder": 2 },
    { "label": "Stalled", "value": "stalled", "displayOrder": 3 }
  ]
}
```

### 3.7 Property groups

All `nexus_*` properties are grouped under a single custom group `nexus_intelligence` on each object. Creating the group is a one-time setup call per object:

```http
POST /crm/v3/properties/deals/groups
{ "name": "nexus_intelligence", "label": "Nexus Intelligence", "displayOrder": 10 }
```

This gives HubSpot users a single collapsible section in the deal sidebar labeled "Nexus Intelligence" containing all Nexus-written properties. Lead-ops experience: one group per object, nothing scattered.

---

## Section 4: Association Labels

### 4.1 What Starter supports

HubSpot's associations v4 API lets private apps read/write associations between objects. Default HubSpot-defined labels (notably **Primary**) are available on all tiers including Starter. Custom association labels (e.g., "Champion") require Professional tier or above and are therefore not available on Starter.

### 4.2 Associations used by Nexus

| Association | Labels used | Tier requirement | Nexus fallback |
|---|---|---|---|
| Deal ↔ Contact | Primary Contact (native) + role (champion/EB/etc.) | Primary: Starter; role labels: Professional+ | Role stored in Nexus `deal_contact_roles` (see 4.3) |
| Deal ↔ Company | Primary Company (native) | Starter | n/a |
| Contact ↔ Company | Primary Company (native) | Starter | n/a |

### 4.3 The `deal_contact_roles` fallback table

Per-deal contact role lives in Nexus, not HubSpot (custom association labels remain a Pro-tier feature). Migration 0013 (Codex Phase 1) adds:

```sql
CREATE TABLE deal_contact_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hubspot_deal_id TEXT NOT NULL,
  hubspot_contact_id TEXT NOT NULL,
  role TEXT NOT NULL,                      -- contact_role enum value
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (hubspot_deal_id, hubspot_contact_id)
);
CREATE INDEX deal_contact_roles_deal_idx ON deal_contact_roles (hubspot_deal_id);
CREATE INDEX deal_contact_roles_contact_idx ON deal_contact_roles (hubspot_contact_id);
```

**Write path.** `CrmAdapter.setContactRoleOnDeal(dealId, contactId, role, isPrimary)` (07B Section 2) writes:
1. The `deal_contact_roles` row in Nexus (always).
2. If `isPrimary = true`, also writes the **HubSpot native "Primary" association label** via the v4 associations API so HubSpot UI shows the primary contact badge correctly.

**Read path.** `CrmAdapter.listDealContacts(dealId)` returns contacts enriched with their `role` from Nexus + `isPrimary` from HubSpot's association label. Single SQL join.

### 4.4 Primary association write payload

Setting the primary contact association label (one of HubSpot's default labels, accessible on Starter):

```http
PUT /crm/v4/objects/deal/{dealId}/associations/default/contact/{contactId}
Authorization: Bearer {NEXUS_HUBSPOT_TOKEN}
```

The `default` type creates the standard (unlabeled) association. To explicitly set Primary:

```http
PUT /crm/v4/objects/deal/{dealId}/associations/contact/{contactId}
Content-Type: application/json

[
  { "associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 3 }
]
```

`associationTypeId: 3` is HubSpot's default id for "Deal to primary contact" (verify at seed time via `GET /crm/v4/associations/deal/contact/labels`). Codex's seed script reads the labels endpoint once, stores the Primary typeId in `seed-data/hubspot-association-ids.json`, and uses that ID for all subsequent Primary writes.

**07B open questions #3 and #6 resolution.** Per-deal contact roles → Nexus `deal_contact_roles` table (Section 4.3). Primary contact → HubSpot native Primary association label (Section 4.4). Both paths work on Starter.

---

## Section 5: Webhook Subscriptions

### 5.1 Subscribed events

Codex configures these 12 subscriptions in the Nexus private app. All available on Starter via the Webhooks API. ([HubSpot: Webhooks v3 API guide](https://developers.hubspot.com/docs/api-reference/legacy/webhooks/guide) ↗)

| # | HubSpot event type | Fires when | Nexus handler action | Relevant deal_events emitted |
|---|---|---|---|---|
| 1 | `deal.creation` | Any new deal created in HubSpot | Upsert `hubspot_cache` row; if not from Nexus (no idempotency key match), append `deal_created` event to `deal_events`; trigger downstream bootstrapping jobs | `deal_created` |
| 2 | `deal.propertyChange` — `dealstage` | Stage changes | Update cache; append `stage_changed` with from/to + `changedBy: "hubspot_user"`; if `closed_lost` / `closed_won`, enqueue close-analysis job | `stage_changed` |
| 3 | `deal.propertyChange` — `amount` | Amount changes | Update cache; append `amount_updated` event | `amount_updated` |
| 4 | `deal.propertyChange` — `closedate` | Close-date changes | Update cache; append `close_date_updated` event | `close_date_updated` |
| 5 | `deal.propertyChange` — `hubspot_owner_id` | Owner changes | Update cache; append `ownership_changed` | `ownership_changed` |
| 6 | `deal.propertyChange` — any `nexus_meddpicc_*` / `nexus_fitness_*` / other `nexus_*` | Nexus-written property changes | Update cache only (these are our own writes; we already know) | none |
| 7 | `deal.deletion` | Deal deleted in HubSpot | Set `hubspot_cache.is_tombstoned = true`; append `deal_deleted_upstream` event; do NOT cascade-delete Nexus intelligence (retained for audit) | `deal_deleted_upstream` |
| 8 | `contact.creation` | New contact | Upsert cache; run `PeopleService.resolveContact` to create/link `people` row | none (contact-level) |
| 9 | `contact.propertyChange` — filtered to `email`, `firstname`, `lastname`, `jobtitle`, `nexus_role_in_deal` | Contact edits | Update cache; if email changed, re-run `PeopleService` resolution | none |
| 10 | `contact.deletion` | Contact deleted | Tombstone cache row; flag related deals for re-resolution | none |
| 11 | `company.creation` | New company | Upsert cache | none |
| 12 | `company.propertyChange` — filtered to `name`, `domain`, `nexus_vertical`, `numberofemployees` | Company edits | Update cache | none |

**Deliberately NOT subscribed.** `engagement.creation` and `engagement.propertyChange` are skipped. Rationale: engagement creation in HubSpot typically flows FROM Nexus (Nexus writes emails/calls to HubSpot as engagements), so the webhook would cause feedback loops — the engagement we just wrote fires a webhook we then try to process. Engagements written in HubSpot directly by a rep using the HubSpot UI (out-of-band) are less common in v2's workflow, but are reconciled by the 15-minute periodic sync (Section 7.5). This resolves the part of open question #4 about engagement subscription scope.

### 5.2 Webhook endpoint

```
POST https://nexus-web-plum-iota.vercel.app/api/hubspot/webhook
```

`maxDuration: 30` on the Next.js route (webhook handler should return fast; the actual work happens via `jobs` table per DECISIONS.md 2.6).

### 5.3 Subscription API payload

One-time call per subscription:

```http
POST /webhooks/v3/{appId}/subscriptions
Authorization: Bearer {NEXUS_HUBSPOT_TOKEN}

{
  "eventType": "deal.propertyChange",
  "propertyName": "dealstage",
  "active": true
}
```

Codex iterates through the 12 subscriptions during first-deploy setup (Section 8 step 6).

### 5.4 Fallback when webhooks are missed

Per 07B Section 4, a `pg_cron` job runs every 15 minutes calling:
- `CrmAdapter.bulkSyncDeals({ since: lastSyncAt })`
- `CrmAdapter.bulkSyncContacts({ since: lastSyncAt })`
- `CrmAdapter.bulkSyncCompanies({ since: lastSyncAt })`

`lastSyncAt` stored in a single-row Nexus `sync_state` table. If a webhook is missed (HubSpot retries exhausted, Nexus route returned 5xx), this sync reconciles within 15 minutes — the stated SLA.

Engagement reconciliation fires the same cadence: `bulkSyncEngagements({ since: lastSyncAt, dealIds: activeDealsIds })` scoped to active deals only to keep the API volume reasonable.

### 5.5 Webhook signature verification

All incoming webhook requests are signed with `X-HubSpot-Signature-V3`. The v3 signature is an HMAC-SHA256 of `requestMethod + requestUri + requestBody + timestamp` using the private app **client secret** (not the access token). ([HubSpot: Validating Requests](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests) ↗)

Nexus's handler:
1. Reads `X-HubSpot-Signature-V3` and `X-HubSpot-Request-Timestamp` headers.
2. Rejects requests with timestamp > 5 minutes old (replay protection — HubSpot's documented requirement).
3. Computes expected signature and constant-time compares.
4. On mismatch: 401 + Sentry alert; no cache update.

Implementation resides in `CrmAdapter.parseWebhookPayload(body, signature)` (07B Section 2). Client secret stored as `NEXUS_HUBSPOT_WEBHOOK_SECRET` in Vercel env.

### 5.6 Event types NOT used

None that block v2. HubSpot's `engagement.creation` etc. are available on Starter; we choose not to subscribe for the reasons in 5.1. Workflow-driven webhooks (Ops Hub Professional only) are not used — we drive background work from Nexus's own `jobs` table, not HubSpot workflows.

---

## Section 6: Authentication and Security

### 6.1 Auth model: private app access token

Nexus uses a HubSpot **private app** with access token. Justification:
- Single-tenant (one Anthropic demo org). No OAuth multi-tenant flow needed.
- Starter supports private apps.
- Access token is long-lived (no refresh flow to build).
- Webhooks fire signed with the private app's client secret — same app identity end-to-end.

Public OAuth app is explicitly **not** used. No scenario in v2 requires installing into another customer's HubSpot.

### 6.2 Scopes required

Codex requests exactly these scopes at private-app creation (Section 8 step 3):

| Scope | Why |
|---|---|
| `crm.objects.deals.read` | Read deals via `CrmAdapter.getDeal()`, bulk sync |
| `crm.objects.deals.write` | Deal creation (1.13), stage changes, custom property writes |
| `crm.objects.contacts.read` | Read contacts |
| `crm.objects.contacts.write` | Contact creation, custom property writes |
| `crm.objects.companies.read` | Read companies |
| `crm.objects.companies.write` | Company creation, custom property writes |
| `crm.schemas.deals.write` | Create custom properties on Deal object |
| `crm.schemas.contacts.write` | Create custom properties on Contact object |
| `crm.schemas.companies.write` | Create custom properties on Company object |
| `crm.objects.owners.read` | Read HubSpot Owners for team_members → owner_id mapping |
| `crm.associations.read` | Read deal↔contact↔company associations |
| `crm.associations.write` | Set primary contact association label (Section 4.4) |
| `sales-email-read` | Read email engagements for timeline rendering (07B `activities` mapping) |
| `crm.objects.quotes.read` / `.write` | Not used in v2. Skip. |

**Not requested** (reduce attack surface):
- Marketing scopes (Nexus does not touch Marketing Hub).
- Service Hub scopes (we bypass tickets per Section 1.7).
- Files scopes (document sharing via engagement body text, not attached files).

### 6.3 Token storage and rotation

| Secret | Stored as | Consumer |
|---|---|---|
| Private app access token | `NEXUS_HUBSPOT_TOKEN` (Vercel environment variable, Production + Preview + Development scopes) | `CrmAdapter` HTTP client |
| Private app client secret (for webhook signature verification) | `NEXUS_HUBSPOT_WEBHOOK_SECRET` (Vercel env) | Webhook handler |
| HubSpot portal ID | `NEXUS_HUBSPOT_PORTAL_ID` (Vercel env, public-ish) | Webhook origin assertion |

**Rotation policy.** Tokens are rotated manually every 90 days by an operator:
1. Create a new private app token in HubSpot UI.
2. Update `NEXUS_HUBSPOT_TOKEN` in Vercel.
3. Trigger a Vercel redeploy.
4. Revoke the old token.

Client secret rotation is rarer (only if leaked) — same procedure, updates `NEXUS_HUBSPOT_WEBHOOK_SECRET`.

**Important.** HubSpot shows the full token only once at creation. If Jeff loses it, he must rotate (generate a new one) — not recover the old. Section 8 step 3 captures the token into a password manager before anything else.

### 6.4 Webhook signature validation

See Section 5.5. All webhook payloads verified before any processing; unverifiable requests reject with 401.

### 6.5 Rate limit handling

Per DECISIONS.md 2.6 / 2.9 / 07B Section 4:
- Synchronous reads/writes that hit `CrmRateLimitError` propagate to the caller. Route handlers with `maxDuration < retryAfter` surface an error banner; the job queue takes over for retries.
- Background jobs respect `retryAfterSeconds` in the error and schedule next-run at `now + retryAfterSeconds`. Exponential backoff (5s, 25s, 125s) on `CrmTransientError`.
- No silent retries hidden from metrics — every rate-limit hit logs a structured event for dashboards.

### 6.6 Demo-mode safety

Per 07B Section 4 demo-resilience modes: if `CrmAdapter.healthCheck()` returns `down` for >10 minutes, the adapter serves from the in-memory dataset and queues writes. **No partial writes.** If a write-queue item accumulates > 1 hour without reaching HubSpot, an alert fires; the team can choose to discard queued writes or retry at the next deploy.

---

## Section 7: Rate Budget and Caching Strategy

### 7.1 Read operations — API call estimates

| Operation | Per call | Cache hit? | Notes |
|---|---|---|---|
| Deal list page load (pipeline view) | 1 call (`listDeals` paginated 100/page) | Yes, 60-min TTL | 18 deals → 1 page |
| Deal detail page load | 0-1 calls | Yes if fresh | Cached deal + cached engagements + cached contacts. 1 call only if cache cold |
| Contact list for a deal | 0-1 calls | Yes | Cached with deal |
| Company detail | 0-1 calls | Yes, 4-hr TTL | |
| Intelligence dashboard | 0 HubSpot calls | n/a | Pure Nexus data |
| Pipeline stage recompute | 0 calls | n/a | Uses cached deal stage |
| Book page (18 closed-won deals) | 0-1 calls | Yes | Single `listDeals({ stage: closed_won })` |

**Per-session rough estimate:** 5 reads × 20 page navigations = 100 reads; 80% cache hit rate → **~20 API reads/session.**

### 7.2 Write operations — API call estimates

| Operation | API calls |
|---|---|
| Deal creation from Nexus UI | 1 (create deal) + 1 (associate primary contact) = **2** |
| Stage change from Nexus UI | 1 (update dealstage) |
| MEDDPICC edit (manual or pipeline) | 1 (`updateDealCustomProperties` with all 7 dimension scores batched into one call) |
| Fitness recompute | 1 (update fitness score + velocity) |
| Lead score recompute | 1 |
| Transcript pipeline run (per deal) | ~3 — MEDDPICC update + fitness update + lead score |
| Close won/lost capture | 2 — stage update + close fields |
| Engagement log (AI-sent email) | 1 |

**Per-session rough estimate:** ~10 writes × typical demo flow → **~10-15 writes/session.**

### 7.3 Webhook volume

| Event class | Per session | Per demo reset |
|---|---|---|
| `deal.propertyChange` (nexus_*) | ~15 (all self-triggered by our own writes) | ~60 (seed + reset) |
| `deal.creation` | 0 normally; ~20 during reset | 20 |
| `contact.creation` | 0 normally; ~25 during reset | 25 |
| `company.creation` | 0 normally; ~20 during reset | 20 |
| `deal.propertyChange` (stage/amount/closedate) | 2-3 per session | 0 (deals freshly created in expected stages) |

**Peak webhook rate:** during demo reset, ~85 webhooks fire over ~20 seconds. Nexus handler returns 200 inside 300ms (cache write + `jobs` enqueue) so HubSpot's retry budget is never stressed.

### 7.4 Rate budget vs. Starter limit

**Starter burst: 100 calls/10s.** **Starter daily: 250,000/day.** (Identical to Free tier — unchanged by the upgrade.)

| Scenario | Peak 10-s rate | Daily total |
|---|---|---|
| Steady-state 1 demo/hour | 5/10s | ~700 calls/day |
| 10 demos/hour | 50/10s | ~7,000 calls/day |
| Full reset (single) | ~90/10s during peak | ~200 burst calls |
| Reset + heavy demo session | ~95/10s momentarily | ~1,000 calls/day |
| 100 concurrent demos hypothetically | 500+/10s | ~50,000/day |

**Assessment:**
- **Daily:** comfortable through any realistic demo cadence.
- **Burst:** **tight during full reset.** Section 7.6 specifies batching to stay safe.

### 7.5 Batching and rate-aware queueing

To stay under 100/10s:

1. **Seed and reset scripts** — use the HubSpot **batch** endpoints wherever available:
   - `POST /crm/v3/objects/deals/batch/create` (up to 100 records per call)
   - `POST /crm/v3/objects/contacts/batch/create` (up to 100)
   - `POST /crm/v3/objects/companies/batch/create` (up to 100)
   - 28 deals + 22 contacts + 18 companies = 3 batch calls instead of 68 individual calls.
2. **Engagement logging** — batch the ~80 seed engagements into two `POST /crm/v3/objects/notes/batch/create` calls.
3. **Property-update writes** (AI pipeline) — debounced per deal: coalesce MEDDPICC + fitness + lead score updates into a single `updateDealCustomProperties(dealId, { ...allThree })` call within a 500ms window.
4. **Rate-aware job queue** — worker checks `healthCheck().rateLimitRemaining` before dispatching; if < 20 remaining in the current 10-s window, delays to the next window.

Full-reset API call count after batching: **~10 calls** instead of 170. Easily fits within 100/10s.

### 7.6 Cache layer (refined from 07B Section 4)

**Schema** (unchanged from 07B; restated here for setup completeness):

```typescript
export const hubspotCache = pgTable("hubspot_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  objectType: text("object_type").notNull(),
  hubspotId: text("hubspot_id").notNull(),
  payload: jsonb("payload").notNull(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isTombstoned: boolean("is_tombstoned").notNull().default(false),
}, (table) => [
  uniqueIndex("hubspot_cache_object_idx").on(table.objectType, table.hubspotId),
]);
```

**TTLs (refined):**

| Object type | TTL | Justification |
|---|---|---|
| Deal | 60 min | Stage / amount / closedate change often enough that stale data confuses reps; webhook invalidation handles most cases |
| Contact | 60 min | Contact edits rare; but matches Deal TTL for consistency |
| Company | 4 hr | Company attributes rarely change |
| Engagement | per-request only | Additive; no updates; fresh fetch cheap |

**Invalidation triggers:**
- **Webhook** — cache row atomically replaced with new payload, `synced_at` pushed, `expires_at` extended.
- **Nexus write** — after successful HubSpot API round-trip, `invalidateCache()` sets `expires_at = now()`.
- **Manual "Refresh from HubSpot" button** — UI button on deal detail page calls `invalidateCache()` then re-fetches.
- **Periodic sync** — every 15 minutes, refreshes the entire cache against HubSpot's last-modified filter.

**Pre-warm on deploy.** Post-deploy startup task runs `bulkSyncDeals() + bulkSyncContacts() + bulkSyncCompanies()` before taking first user request. For the 18-deal demo dataset, pre-warm completes in ~5 seconds (3 batch calls).

**Demo mode (`NEXUS_DEMO_MODE=offline`).** Cache TTL effectively infinite — no expiration, no periodic sync against HubSpot. Live HubSpot unavailability does not break the demo.

### 7.7 Staleness UI

Per 07B Section 4 — the `Deal` type returned by `getDeal()` includes `_meta: { syncedAt, isStale }` where `isStale = (now - syncedAt) > 5 minutes`. The deal detail page header shows "Last synced 12 min ago" subtly when stale, plus a "Refresh from HubSpot" button next to it.

---

## Section 8: Setup Playbook

Execute top-to-bottom. Each step is commandable. "Jeff" = manual operator action; "Codex" = executed by the `seed-hubspot.ts` script. Assumes a fresh HubSpot workspace; idempotent where possible.

### Step 1 — Sign up for HubSpot Starter Customer Platform (Jeff, manual, 5 min)

1. Go to https://www.hubspot.com/products/crm/starter.
2. Select the **Starter Customer Platform** plan — annual commit ($9/month/seat, billed upfront) is recommended; monthly ($15/month/seat) is acceptable if preferred.
3. One seat suffices. Sign up using a personal email if the business email is gated (easier to hand off control later than a corp SSO).
4. When prompted for role/company, enter "Founder / Anthropic Nexus Demo."
5. Skip the import wizard — the v2 seed script creates all demo data.
6. Capture the **Portal ID** from Settings → Account & Billing → Account Defaults. Save as `NEXUS_HUBSPOT_PORTAL_ID`.

### Step 2 — Create the private app (Jeff, manual, 5 min)

1. HubSpot → Settings (gear icon) → Integrations → Private Apps.
2. Click **Create a private app**.
3. **Basic info:**
   - Name: `Nexus`
   - Description: `Anthropic Nexus v2 integration. Reads/writes deals, contacts, companies, engagements.`
4. **Scopes tab:** select every scope listed in Section 6.2.
5. **Webhooks tab:** configure webhook target URL to `https://<your-vercel-domain>/api/hubspot/webhook`. Do NOT subscribe events here manually — Codex does that in Step 6 via API (so the subscription set is version-controlled).
6. Click **Create app** in the top right.
7. **Copy the access token** immediately. Save to a password manager. HubSpot will not show it again.
8. From the Auth tab, copy the **client secret**.
9. Save both to Vercel:
   ```
   NEXUS_HUBSPOT_TOKEN=<access token>
   NEXUS_HUBSPOT_WEBHOOK_SECRET=<client secret>
   NEXUS_HUBSPOT_PORTAL_ID=<portal id from step 1>
   NEXUS_HUBSPOT_PRIVATE_APP_ID=<private app id from the URL bar on the app settings page>
   ```

### Step 3 — Deploy v2 code to Vercel (Jeff, manual, 5 min)

Standard deploy. The webhook endpoint and the `CrmAdapter` must be reachable before step 4. If the private app is created before Vercel is deployed, webhook subscriptions in step 5 will target an endpoint that returns 404 — not harmful but generates HubSpot delivery errors in the logs.

### Step 4 — Create the deal pipeline (Codex, API, 2 s)

`packages/db/src/seed-hubspot.ts` step `ensurePipeline()`:

```typescript
// Idempotent: lookup-then-create
const existing = await adapter.listPipelines();
if (existing.find(p => p.label === "Nexus Sales")) {
  return existing.find(p => p.label === "Nexus Sales");
}
return await adapter.createPipeline({
  label: "Nexus Sales",
  stages: [ /* 9 stages from Section 2.2 */ ]
});
```

Writes resolved pipeline ID + 9 stage IDs to `packages/db/src/seed-data/hubspot-pipeline-ids.json`. This file is checked into Git (even though IDs are portal-specific) so the team sees the mapping; production reads it at runtime via the adapter initializer.

### Step 5 — Create the property group + custom properties (Codex, API, ~3 s)

`ensurePropertyGroups()` then `ensureCustomProperties()`:

```typescript
// 1. Create nexus_intelligence group on each of deals/contacts/companies
for (const objectType of ["deals", "contacts", "companies"]) {
  await adapter.createPropertyGroup(objectType, {
    name: "nexus_intelligence",
    label: "Nexus Intelligence",
    displayOrder: 10
  });
}

// 2. Create each of the 38 properties per Section 3 (28 Deal + 5 Contact + 5 Company).
//    Definitions live in packages/seed-data/hubspot-properties.ts as an array of
//    { objectType, definition } records, one entry per property. Each property is
//    first-class and typed (no JSON-packing).
for (const prop of HUBSPOT_CUSTOM_PROPERTIES) {
  await adapter.createOrSkipProperty(prop.objectType, prop.definition);
}
```

`HUBSPOT_CUSTOM_PROPERTIES` lives in `packages/seed-data/hubspot-properties.ts` and enumerates each property individually. Re-runs are safe: `createOrSkipProperty()` 409s are caught.

### Step 6 — Create webhook subscriptions (Codex, API, ~1 s)

`ensureWebhookSubscriptions()`:

```typescript
const subscriptions = [
  { eventType: "deal.creation", active: true },
  { eventType: "deal.propertyChange", propertyName: "dealstage", active: true },
  { eventType: "deal.propertyChange", propertyName: "amount", active: true },
  { eventType: "deal.propertyChange", propertyName: "closedate", active: true },
  { eventType: "deal.propertyChange", propertyName: "hubspot_owner_id", active: true },
  // nexus_* intelligence property changes (subscribe per property or use a broad filter)
  { eventType: "deal.deletion", active: true },
  { eventType: "contact.creation", active: true },
  { eventType: "contact.propertyChange", propertyName: "email", active: true },
  // ... etc, per Section 5.1
];

for (const sub of subscriptions) {
  await adapter.createWebhookSubscription(sub);
}
```

### Step 7 — Seed HubSpot data (Codex, API, ~20 s)

Runs `packages/db/src/seed.ts`, `seed-book.ts`, `seed-deal-fitness.ts`, using the `CrmAdapter` for all CRM entities. Writes captured HubSpot IDs back to a transient mapping used by step 8.

Per Section 7.5, uses batch endpoints: 3 batch calls for companies, 3 for contacts, 3 for deals, 2 for notes — ~10 API calls total. Well under the burst limit.

### Step 8 — Seed Nexus data (Codex, DB, ~5 s)

Runs `seedNexusDirect(mapping)` — inserts `deal_events`, `observations`, `experiments`, `meddpicc_fields`, `account_health`, `knowledge_articles`, `manager_directives`, `system_intelligence`, `agent_configs`, `team_members`, `support_function_members`, etc. No HubSpot calls.

### Step 9 — Pre-warm cache (Codex, API, ~5 s)

```typescript
await adapter.bulkSyncDeals();
await adapter.bulkSyncContacts();
await adapter.bulkSyncCompanies();
```

Populates `hubspot_cache` so the first browser request hits cache, not HubSpot.

### Step 10 — Verify (Codex + Jeff)

Codex emits a health check report:

```
Nexus HubSpot setup complete.
  Pipeline ID:             3214578901
  Stages created:          9/9
  Custom properties:       38 (28 Deal + 5 Contact + 5 Company)
  Webhook subscriptions:   12
  Seed companies:          18/18
  Seed contacts:           22/22
  Seed deals:              18/18 (in expected stages)
  Seed engagements:        ~80
  Cache rows:              58
  Webhook test signature:  ok
  Adapter healthCheck:     { status: "ok", latencyMs: 120, rateLimitRemaining: 98 }
```

Jeff opens HubSpot → Sales → Deals, confirms the 18 seed deals appear in the Nexus Sales pipeline with correct stages and owners.

### Step 11 — Smoke-test (Jeff, 2 min)

1. Nexus dashboard → create a test deal.
2. Confirm it appears in HubSpot within 5 seconds.
3. In HubSpot, update the deal stage to Proposal.
4. Confirm the change appears in Nexus within 15 seconds (via webhook).
5. Run a transcript pipeline on the test deal from Nexus UI.
6. Confirm the Nexus-written properties (`nexus_meddpicc_score`, `nexus_fitness_score`, etc.) populate on the deal in HubSpot.

### Step 12 — Enable `pg_cron` periodic sync (Codex)

Supabase SQL editor runs once:

```sql
SELECT cron.schedule(
  'hubspot-periodic-sync',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url := 'https://nexus-web-plum-iota.vercel.app/api/jobs/hubspot-sync',
       headers := '{"x-cron-secret": "<secret>"}'::jsonb
     ) $$
);
```

Job handler calls `bulkSync*` with `since: now() - 20 minutes` (some overlap for safety).

---

## Section 9: Demo Data Mapping

Maps every current Nexus demo deal to its v2 HubSpot shape.

### 9.1 Ten pipeline deals (from `seed.ts`)

| Current Nexus deal | HubSpot shape | Notes |
|---|---|---|
| **MedVista** (Sarah Chen, $2.4M, Discovery) | Company "MedVista Health" (vertical=healthcare, employeeCount=3200, techStack=[Epic, Dragon Medical, PACS]) · Contact "Dr. Marcus Chen" (primary) · Deal "MedVista Discovery" stage=discovery amount=2400000 closedate=today+55d owner=sarah.chen@... `nexus_vertical=healthcare` `nexus_product=claude_enterprise` | Transcript reference — `packages/db/src/seeds/seed-healthfirst-transcript.ts` re-keyed to the new HubSpot deal ID |
| **HealthFirst** (Sarah, $3.2M, Closed Lost) | Company "HealthFirst Medical" · Contacts · Deal stage=closed_lost `nexus_vertical=healthcare` `nexus_close_competitor="Microsoft DAX Copilot"` `nexus_close_notes="Lost on bundled pricing"` | Transcript with Microsoft competitor for coordinator pattern demo |
| **TrustBank** (Sarah, $950K, Technical Validation) | Company "TrustBank Financial" (financial_services) · Contact "Jennifer Cross" (primary) · Deal stage=technical_validation closedate=today+60d | |
| **NordicMed Group** (Ryan Foster, $1.6M, Proposal) | Company "NordicMed Group" · Contacts · Deal stage=proposal closedate=today+42d (intervention fires when close date < 70d) | Historically hardcoded-in-code; v2 uses applicability rules (DECISIONS.md 1.14) |
| **Atlas Capital** (David Park, $580K, Negotiation) | Company "Atlas Capital" (financial_services) · Contacts · Deal stage=negotiation closedate=today+30d | |
| **HealthBridge** (Sarah, $1.2M, Closed Lost) | Company "HealthBridge" (healthcare) · Deal stage=closed_lost | |
| **MedTech Solutions** (Ryan, $2.1M, Closed Won) | Company "MedTech Solutions" · Deal stage=closed_won `nexus_win_replicable="Security doc pre-delivery shortened validation from 8 to 3 weeks"` | |
| **NordicCare Patient Records** (Ryan, $1.8M, Closed Lost) | Company "NordicCare" · Deal stage=closed_lost | |
| **PharmaBridge** (Sarah, $340K, Discovery) | Company "PharmaBridge" · Deal stage=discovery closedate=today+90d | |
| **NordicCare API** (Sarah, $780K, Technical Validation) | Company "NordicCare" (re-used company) · Deal stage=technical_validation closedate=today+45d | Second deal at same company — associationv4 links both deals |

**Per-deal seed actions:**
1. Create HubSpot Company via `adapter.createCompany(...)` — capture `hubspotCompanyId`.
2. Create HubSpot Contact(s) via `adapter.createContact({ companyId: hubspotCompanyId, ... })` — capture per-contact `hubspotContactId`.
3. Create HubSpot Deal via `adapter.createDeal({ companyId: hubspotCompanyId, primaryContactId: champion.hubspotId, stage, amount, closeDate, ... })` — capture `hubspotDealId`.
4. Insert Nexus `deal_events` with the foundational events: `deal_created`, `stage_set`, `vertical_set`, initial `observation_logged` (for seeded observations), `stakeholder_added` per contact.
5. Insert Nexus `meddpicc_fields` per 07B mapping (keyed by `hubspotDealId`).
6. Insert Nexus `deal_contact_roles` rows (`role`, `is_primary`) per contact.
7. Insert Nexus `account_health` for closed-won deals.
8. For deals with transcripts (MedVista, NordicMed, HealthFirst): seed `call_transcripts` rows referencing `hubspotDealId`; run the transcript pipeline from Section 8's smoke test or via `seedFitnessAnalysisPostSeed()`.
9. Assign to Sarah Chen's (or applicable) HubSpot Owner ID, captured from step 11.

### 9.2 Horizon Health Partners (Deal Fitness demo, 7 contacts)

From `seed-deal-fitness.ts`. Creates:
- Company "Horizon Health Partners" (healthcare, 4,200 employees, $890M revenue)
- 7 contacts: Amanda Chen (champion), Priya Mehta (technical_evaluator), Robert Garrison (economic_buyer), Lisa Huang (end_user), James Whitfield (blocker), Mark Davidson (coach), Dr. Sarah Kim (coach)
- Deal "Horizon Health Expansion" — $1.8M, negotiation, owner=sarah.chen, SA=alex.kim
- 5 call transcripts as `call_transcripts` rows (Nexus side)
- 14 email activities as HubSpot Engagements — `adapter.logEngagement({ type: "email", ... })` batched
- MEDDPICC seeded per transcript evidence
- Deal milestones folded into `deal_events` per DECISIONS.md 2.16
- Post-seed: run the fitness analysis engine (`POST /api/deal-fitness/analyze`) to generate the 25 events + scores live — per 07B Section 6 the events come from actual Claude analysis, not pre-baked

### 9.3 18 closed-won accounts (My Book)

From `seed-book.ts`. For each of the 18 accounts:
- Company created in HubSpot with vertical.
- 1-2 contacts per company via `createContact()`.
- Deal with `stage=closed_won`, `amount=ARR`, `closeDate` set to 3-18 months ago.
- Nexus `account_health` row with full fields: `health_score`, `contract_status`, `renewal_date`, `contracted_use_cases`, `expansion_map`, `proactive_signals`, `similar_situations`, `recommended_resources`.
- `nexus_fitness_score`, `nexus_onboarding_complete`, `nexus_renewal_date` written back to HubSpot for rep visibility.

Full list (18 accounts, per CLAUDE.md Session 14): Meridian Health, Pacific Coast Medical, BrightPath Diagnostics, Cascadia Life Sciences, Summit Genomics (Healthcare); Redwood Capital, Harbor Compliance, Lighthouse Insurance, Apex Financial, Cornerstone Banking (FinServ); Vertex Pharma R&D, Pinnacle Biotech, GenePath Analytics (Technology/Life Sciences); Atlas Retail, Brightside Commerce, Metro Market, Cascade Supply Chain, Evolve Retail Tech (Retail).

### 9.4 Eight customer messages

Per 07B `customer_messages` mapping. Each seeds as:
- HubSpot Engagement (Email) via `adapter.logEngagement({ type: "email", ... associations: { dealIds, contactIds } })`.
- Nexus `customer_messages` row with `hubspot_engagement_id` link and (for 6/8) pre-baked `response_kit` jsonb.

Resolves open question #10: **Engagements not Tickets.**

### 9.5 Eight playbook experiments

Pure Nexus (no HubSpot). Seeded to `experiments` table with applicability jsonb (DECISIONS.md 2.21) and test/control groups keyed by `hubspotDealId` arrays.

### 9.6 14-person demo org

Nexus `team_members` + `support_function_members`. HubSpot side: create 14 HubSpot Owners via the team-members API (requires super admin). Capture each `hubspot_owner_id` into `team_members.hubspot_owner_id`.

**07B open question #8 resolution.** Provision all 14 as real HubSpot Owners. On Starter, paid seats are per-user (one seat purchased for Jeff); additional Owner records can be created without consuming seats when they're not assigned interactive login access — adequate for the demo-persona filter-by-AE story in HubSpot UI. If HubSpot's current seat policy requires all Owners to hold paid seats, fall back to provisioning a smaller set of real Owners and mapping multiple Nexus `team_members` rows to each (losing per-persona filtering in the HubSpot UI only; Nexus UI is unaffected).

### 9.7 Seed idempotency

Every seed step is lookup-then-create:
- `createCompany({ domain })` → HubSpot upserts by domain natively.
- `createContact({ email })` → HubSpot upserts by email natively.
- `createDeal(...)` → no natural key; we check via `resolveDeal(dealName)` first.

Re-runs are safe. The `hubspot-id-mapping.json` artifact is the linker — step 9 reads it to write Nexus rows against stable HubSpot IDs.

---

## Section 10: Risks, Gotchas, and Open Items

### 10.1 Starter-tier limitations worth watching

- **No custom association labels.** Custom association labels require Professional tier. The Nexus `deal_contact_roles` fallback works but means HubSpot UI cannot show per-contact role badges on the deal — reps must open Nexus to see champion/EB assignments. Upgrading to Pro purely for this is unlikely to be justified in v2.
- **Custom property ceiling.** Starter's per-object property limit (ASSUMPTION: ~1,000 per object; verify against HubSpot's current documentation at provision time) is comfortable for v2 but not unbounded. If v2.x adds many more AI-derived properties, watch headroom.
- **Seat economics if Nexus ever goes multi-user in HubSpot UI.** v2 uses one paid seat (Jeff). If multiple humans later need HubSpot UI access for read-only reasons, additional seats are $9-$15/month each. This is not a blocker but a recurring cost input for scaling.
- **Auto-upgrade on overage.** HubSpot's documented behavior on hitting contact, email, or marketing-contact limits is to prompt or auto-upgrade billing rather than hard-block. For v2's demo scope no cap is anywhere near its ceiling, but unmonitored growth (e.g., if Nexus starts auto-creating hundreds of contacts from observations) could trigger unexpected tier escalation. Monitor contact counts quarterly.

### 10.2 Webhook reliability caveats

- HubSpot retries failed webhook deliveries up to 10 times over 24 hours with exponential backoff. ([HubSpot Webhooks guide](https://developers.hubspot.com/docs/api-reference/legacy/webhooks/guide) ↗) If Nexus's webhook endpoint is down for > 24 hours, events are lost and the 15-min periodic sync reconciles.
- Self-triggered webhook feedback loops — when Nexus writes `nexus_fitness_score`, HubSpot fires `deal.propertyChange` for that property and sends it back. Handler filters self-writes by checking the most recent `deal_events` within the last 5 seconds; if a `nexus_fitness_score_updated` event exists at or after the webhook timestamp, treat the webhook as echo and skip.
- HubSpot webhooks come with no formal delivery-latency SLA on Starter — Anthropic should monitor delivery latency.

### 10.3 API version stability

- HubSpot CRM v3 API is GA and stable.
- Associations v4 API is GA as of 2025 and is the non-deprecated path; we use it exclusively (the v3 associations were deprecated).
- Webhooks v3 signatures are the current standard (v2 deprecated). ([Introducing version 3 of Webhook signatures](https://developers.hubspot.com/changelog/introducing-version-3-of-webhook-signatures) ↗)
- `hs_deal_stage_probability` and forecasting fields have occasionally been renamed — pin versions in `adapter.ts` integration tests.

### 10.4 Things that require manual intervention (Jeff, not Codex)

- **Step 1:** account creation.
- **Step 2:** tier choice.
- **Step 3:** private app creation + token capture (HubSpot shows once, not fetchable via API).
- **Step 4:** Vercel deploy.
- **Any token rotation** after 90 days.
- **Any future tier upgrade** (pricing page click-through) — Starter → Pro only if custom association labels or Sequences integration become required.
- **HubSpot Owner provisioning** — the admin step to add users requires the HubSpot UI (API route exists but requires additional admin scopes most private apps don't get).

### 10.5 Explicit deferrals to v2.1

- **HubSpot Sequences integration** (07B open question #7). Sequences require Sales Hub Pro; v2 keeps email sequences in Nexus. Resolution: **defer to v2.1.** If Anthropic upgrades to Sales Hub Pro later, introduce an `OutreachAdapter` abstraction and point Nexus's email sequences at HubSpot Sequences.
- **Advanced forecasting properties** (probability, forecast category) — use HubSpot's native `hs_deal_stage_probability` for v2; Nexus computes its own forecast from `overall_fitness` and displays in Nexus only. Defer HubSpot-native forecasting enhancements to v2.1.
- **Service Hub tickets for customer_messages** — deferred per Section 1.7 and open question #10. Engagements path ships in v2.

### 10.6 Outstanding assumptions to verify

- **`closed_lost_reason` native property.** Some HubSpot portals have it preset, others don't. Resolution: 07B open question #9 answered by using `nexus_close_notes` + `nexus_close_competitor` (Section 3.1) rather than depending on portal defaults. Native `closed_lost_reason` is not used.
- **Batch endpoint rate limits.** Batch endpoints count toward the 100/10s burst as 1 call each per HubSpot's documentation, but verify during seeding. If a batch of 100 counts as >1, throttle the batcher.
- **Per-app vs per-portal webhook delivery rate.** Documented behavior is per-portal; if HubSpot throttles our webhook endpoint under load, we learn this only by running. Mitigation: Nexus's webhook handler is under 300ms and returns 200 synchronously.
- **Super admin requirement for private apps.** If Jeff's account ends up as non-super-admin, step 3 fails. Verify early.

### 10.7 Resolution of 07B Section 7's 10 open questions

| # | Question | Resolution | Where |
|---|---|---|---|
| 1 | Pipeline stage names — keep Nexus names or align to HubSpot defaults? | Keep Nexus names verbatim (9 stages). No rename needed. | Section 2.2 |
| 2 | Custom property counts and types? | Starter tier accommodates all 38 properties comfortably (28 Deal + 5 Contact + 5 Company) as first-class typed fields. Free tier was ruled out per DECISIONS.md 2.18; this document ships the Starter design only. | Section 1.2, Section 3 |
| 3 | Per-deal contact roles — association labels or fallback table? | Custom association labels require Pro, not available on Starter. Starter uses Nexus `deal_contact_roles` join table. Primary contact still uses HubSpot's native Primary label. | Section 4.3 |
| 4 | Webhook reliability and Starter subscription scope? | Starter supports all 12 planned subscriptions via Webhooks API. Engagement.* intentionally NOT subscribed (feedback-loop risk); reconciled via 15-min periodic sync. | Section 5.1, Section 5.6 |
| 5 | Rate limit budget under demo load? | Rate limits identical to Free (100/10s, 250k/day). Steady-state ~20 calls/session well under daily cap; peak ~90/10s during full reset requires batching via batch endpoints (Section 7.5). After batching, reset uses ~10 calls. | Section 7.4, Section 7.5 |
| 6 | Primary-contact association label API access? | HubSpot-defined "Primary" label accessible on all tiers via `crm.associations.write` scope. | Section 4.4 |
| 7 | Sequences integration? | Deferred to v2.1 (requires Sales Hub Pro). Email sequences remain in Nexus for v2. | Section 10.5 |
| 8 | HubSpot Owner provisioning for 14 demo personas? | Provision real HubSpot Owners (14), link via `team_members.hubspot_owner_id`. | Section 9.6 |
| 9 | `closed_lost_reason` native vs custom? | Do not use native (portal-dependent). Use `nexus_close_notes` + `nexus_close_competitor` on Starter. | Section 3.1, Section 10.6 |
| 10 | Service Hub vs Engagement for customer messages? | Engagements (Email type) — ticket-pipeline automation not used. `nexus_message_status` carried in Nexus only. | Section 1.8, Section 9.4 |

---

**End of 07C.** Codex consumes Sections 2, 3, 5, 6, 7, 8 as the setup contract; Jeff executes Section 8 steps 1-3 manually (sign up, create private app, deploy Vercel); Section 9 seeds the demo environment; Section 10 flags the operational edges to watch during and after rollout.

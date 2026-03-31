import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

// Team member IDs
const SARAH = "ec26c991-f580-452c-ae60-14b94800e920";
const DAVID = "4443c9bb-5a4a-405a-9b99-f0e97e86b0d2";
const RYAN = "f7c15224-0883-46b7-affa-990eeedaac07";
const PRIYA = "5d30b930-f2e8-4939-b2e6-2220385bf0fd";
const JAMES = "0f98cede-0aab-44aa-964d-06d2c634019c";
const ELENA = "a9b8cf2c-ec9b-4abc-97f0-c7d6f6523298";
const MARCUS = "fcbfac19-88eb-4a34-8582-b1cdfa03055b";

// Deal IDs for evidence
const MEDVISTA_DEAL = "c0069b95-02dc-46db-bd04-aac69099ecfb";
const NORDICMED_DEAL = "3848a398-1850-4a8c-a44e-46aec01b6a24";
const HEALTHFIRST_DEAL = "f4fee3bc-b65c-49e8-a34f-0fab8b8724c9";
const ATLAS_DEAL = "0d0f187f-ee15-4baf-8ff5-08f88341eb1c";

// Evidence data for Post-discovery prototype delivery
const postDiscoEvidence = JSON.stringify({
  deals: [
    {
      deal_name: "MedVista Health Systems",
      deal_id: MEDVISTA_DEAL,
      owner_name: "Sarah Chen",
      owner_id: SARAH,
      group: "test",
      stage: "negotiation",
      amount: 2400000,
      days_in_stage: 8,
      avg_days_baseline: 20,
      sentiment_score: 85,
      avg_sentiment_baseline: 62,
      evidence: [
        { type: "transcript", date: "2026-03-18", source: "Discovery Call", excerpt: "After building the EHR integration prototype live on the call, Dr. Patel immediately asked to bring in their CTO for a follow-up within the week." },
        { type: "email", date: "2026-03-22", source: "Prospect follow-up", excerpt: "The prototype from our session is already being tested by two of our clinical teams — can we schedule the security review this week instead of next month?" },
      ],
    },
    {
      deal_name: "NordicMed Group Platform",
      deal_id: NORDICMED_DEAL,
      owner_name: "Ryan Foster",
      owner_id: RYAN,
      group: "test",
      stage: "proposal",
      amount: 1600000,
      days_in_stage: 10,
      avg_days_baseline: 20,
      sentiment_score: 78,
      avg_sentiment_baseline: 62,
      evidence: [
        { type: "transcript", date: "2026-03-20", source: "Discovery Call", excerpt: "When Ryan demonstrated the claims-processing prototype during the call, their VP of Operations said 'This is exactly what we described to three other vendors and none of them could show us a working version.'" },
        { type: "email", date: "2026-03-24", source: "Prospect follow-up", excerpt: "Our CTO reviewed the prototype and wants to discuss enterprise licensing. Can we move the technical review up to this Friday?" },
      ],
    },
    {
      deal_name: "PharmaBridge Analytics",
      deal_id: null,
      owner_name: "Sarah Chen",
      owner_id: SARAH,
      group: "test",
      stage: "discovery",
      amount: 340000,
      days_in_stage: 5,
      avg_days_baseline: 20,
      sentiment_score: 74,
      avg_sentiment_baseline: 62,
      evidence: [
        { type: "transcript", date: "2026-03-25", source: "Discovery Call", excerpt: "Built a quick lab-results summarization prototype during the session. Their Director of Clinical Ops immediately shared the screen with two colleagues who joined the call." },
      ],
    },
    {
      deal_name: "NordicCare API Integration",
      deal_id: null,
      owner_name: "Sarah Chen",
      owner_id: SARAH,
      group: "test",
      stage: "technical_validation",
      amount: 780000,
      days_in_stage: 12,
      avg_days_baseline: 20,
      sentiment_score: 80,
      avg_sentiment_baseline: 62,
      evidence: [
        { type: "transcript", date: "2026-03-19", source: "Technical Review", excerpt: "The patient-records API prototype we built last call cut their evaluation timeline — they skipped the usual 2-week internal review because the working demo answered their integration questions." },
      ],
    },
    {
      deal_name: "HealthFirst Medical",
      deal_id: HEALTHFIRST_DEAL,
      owner_name: "Sarah Chen",
      owner_id: SARAH,
      group: "control",
      stage: "closed_lost",
      amount: 3200000,
      days_in_stage: 22,
      avg_days_baseline: 20,
      sentiment_score: 48,
      avg_sentiment_baseline: 62,
      evidence: [],
    },
    {
      deal_name: "Atlas Capital Analytics",
      deal_id: ATLAS_DEAL,
      owner_name: "David Park",
      owner_id: DAVID,
      group: "control",
      stage: "negotiation",
      amount: 580000,
      days_in_stage: 18,
      avg_days_baseline: 20,
      sentiment_score: 58,
      avg_sentiment_baseline: 62,
      evidence: [],
    },
    {
      deal_name: "TrustBank Financial",
      deal_id: null,
      owner_name: "Sarah Chen",
      owner_id: SARAH,
      group: "control",
      stage: "technical_validation",
      amount: 950000,
      days_in_stage: 25,
      avg_days_baseline: 20,
      sentiment_score: 55,
      avg_sentiment_baseline: 62,
      evidence: [],
    },
    {
      deal_name: "GlobalTech Industries",
      deal_id: null,
      owner_name: "Priya Sharma",
      owner_id: PRIYA,
      group: "control",
      stage: "discovery",
      amount: 720000,
      days_in_stage: 19,
      avg_days_baseline: 20,
      sentiment_score: 61,
      avg_sentiment_baseline: 62,
      evidence: [],
    },
    {
      deal_name: "Meridian Health Network",
      deal_id: null,
      owner_name: "Ryan Foster",
      owner_id: RYAN,
      group: "test",
      stage: "technical_validation",
      amount: 1100000,
      days_in_stage: 9,
      avg_days_baseline: 20,
      sentiment_score: 82,
      avg_sentiment_baseline: 62,
      evidence: [
        { type: "transcript", date: "2026-03-26", source: "Discovery Call", excerpt: "Built a patient-intake automation prototype during the session. Their Head of Digital immediately asked to loop in procurement — 'We need this deployed before Q3.'" },
      ],
    },
  ],
});

// Evidence data for Multi-threaded stakeholder engagement
const multiThreadEvidence = JSON.stringify({
  deals: [
    {
      deal_name: "Atlas Capital Analytics",
      deal_id: ATLAS_DEAL,
      owner_name: "David Park",
      owner_id: DAVID,
      group: "test",
      stage: "negotiation",
      amount: 580000,
      days_in_stage: 18,
      avg_days_baseline: 22,
      sentiment_score: 68,
      avg_sentiment_baseline: 60,
      evidence: [
        { type: "transcript", date: "2026-03-14", source: "Multi-stakeholder Call", excerpt: "David brought in their CFO and Head of Risk together — the CFO immediately connected our pricing to their cost-of-compliance budget, which reframed the conversation from IT spend to risk mitigation." },
      ],
    },
    {
      deal_name: "Fintech Partners Group",
      deal_id: null,
      owner_name: "Elena Rodriguez",
      owner_id: ELENA,
      group: "test",
      stage: "proposal",
      amount: 490000,
      days_in_stage: 15,
      avg_days_baseline: 22,
      sentiment_score: 63,
      avg_sentiment_baseline: 60,
      evidence: [
        { type: "email", date: "2026-03-20", source: "Prospect reply", excerpt: "Good call bringing our COO into that last session — she's now the one pushing this through procurement. Timeline just moved up two weeks." },
      ],
    },
    {
      deal_name: "RegionBank Digital",
      deal_id: null,
      owner_name: "David Park",
      owner_id: DAVID,
      group: "test",
      stage: "technical_validation",
      amount: 380000,
      days_in_stage: 20,
      avg_days_baseline: 22,
      sentiment_score: 56,
      avg_sentiment_baseline: 60,
      evidence: [
        { type: "transcript", date: "2026-03-22", source: "Technical Review", excerpt: "Multi-threading backfired here — too many stakeholders in the room created conflicting priorities. Their CTO wanted speed, their compliance lead wanted thoroughness. Session ran over by 40 minutes." },
      ],
    },
    {
      deal_name: "MedVista Health Systems",
      deal_id: MEDVISTA_DEAL,
      owner_name: "Sarah Chen",
      owner_id: SARAH,
      group: "control",
      stage: "negotiation",
      amount: 2400000,
      days_in_stage: 20,
      avg_days_baseline: 22,
      sentiment_score: 72,
      avg_sentiment_baseline: 60,
      evidence: [],
    },
    {
      deal_name: "NordicMed Group Platform",
      deal_id: NORDICMED_DEAL,
      owner_name: "Ryan Foster",
      owner_id: RYAN,
      group: "control",
      stage: "proposal",
      amount: 1600000,
      days_in_stage: 24,
      avg_days_baseline: 22,
      sentiment_score: 58,
      avg_sentiment_baseline: 60,
      evidence: [],
    },
    {
      deal_name: "HealthBridge Analytics",
      deal_id: null,
      owner_name: "Priya Sharma",
      owner_id: PRIYA,
      group: "control",
      stage: "closed_lost",
      amount: 1200000,
      days_in_stage: 28,
      avg_days_baseline: 22,
      sentiment_score: 42,
      avg_sentiment_baseline: 60,
      evidence: [],
    },
  ],
});

async function seed() {
  console.log("Updating existing experiments with lifecycle fields...");

  // Ensure experiment_evidence column exists
  await db.execute(sql`
    ALTER TABLE playbook_ideas ADD COLUMN IF NOT EXISTS experiment_evidence jsonb
  `);
  console.log("  ✓ experiment_evidence column ensured");

  // Post-discovery prototype delivery (TESTING) — graduation-ready: 9 deals, meets 3/3 thresholds
  await db.execute(sql`
    UPDATE playbook_ideas SET
      test_group = ARRAY[${SARAH}, ${RYAN}]::text[],
      control_group = ARRAY[${DAVID}, ${PRIYA}, ${JAMES}, ${ELENA}]::text[],
      success_thresholds = '{"velocity_pct": 30, "sentiment_pts": 15, "close_rate_pct": 10}'::jsonb,
      current_metrics = '{"velocity_pct": 40, "sentiment_pts": 22, "close_rate_pct": 12, "deals_tested": 9}'::jsonb,
      approved_by = ${MARCUS},
      approved_at = '2026-03-16T09:00:00'::timestamp,
      experiment_start = '2026-03-16T09:00:00'::timestamp,
      experiment_duration_days = 30,
      experiment_end = '2026-04-15T09:00:00'::timestamp,
      attribution = ${'{"proposed_by": "' + SARAH + '", "proposed_at": "2026-03-15", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb,
      experiment_evidence = ${postDiscoEvidence}::jsonb
    WHERE title LIKE 'Post-discovery prototype%'
      AND status = 'testing'
  `);
  console.log("  ✓ Post-discovery prototype delivery (9 deals, graduation-ready)");

  // Multi-threaded stakeholder engagement (TESTING) — early stage: 6 deals, mixed results
  await db.execute(sql`
    UPDATE playbook_ideas SET
      test_group = ARRAY[${DAVID}, ${ELENA}]::text[],
      control_group = ARRAY[${SARAH}, ${RYAN}, ${PRIYA}, ${JAMES}]::text[],
      success_thresholds = '{"velocity_pct": 25, "sentiment_pts": 10, "close_rate_pct": 15}'::jsonb,
      current_metrics = '{"velocity_pct": 15, "sentiment_pts": 9, "close_rate_pct": 8, "deals_tested": 6}'::jsonb,
      approved_by = ${MARCUS},
      approved_at = '2026-02-28T09:00:00'::timestamp,
      experiment_start = '2026-02-28T09:00:00'::timestamp,
      experiment_duration_days = 30,
      experiment_end = '2026-03-30T09:00:00'::timestamp,
      attribution = ${'{"proposed_by": "' + MARCUS + '", "proposed_at": "2026-02-25", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb,
      experiment_evidence = ${multiThreadEvidence}::jsonb
    WHERE title LIKE 'Multi-threaded stakeholder%'
      AND status = 'testing'
  `);
  console.log("  ✓ Multi-threaded stakeholder engagement (6 deals, below threshold)");

  // Two-disco minimum (TESTING) — moderate: 5 deals, meeting thresholds but low confidence
  await db.execute(sql`
    UPDATE playbook_ideas SET
      test_group = ARRAY[${PRIYA}, ${JAMES}]::text[],
      control_group = ARRAY[${SARAH}, ${RYAN}, ${DAVID}, ${ELENA}]::text[],
      success_thresholds = '{"velocity_pct": 20, "sentiment_pts": 12, "close_rate_pct": 8}'::jsonb,
      current_metrics = '{"velocity_pct": 28, "sentiment_pts": 18, "close_rate_pct": 11, "deals_tested": 5}'::jsonb,
      approved_by = ${MARCUS},
      approved_at = '2026-03-09T09:00:00'::timestamp,
      experiment_start = '2026-03-09T09:00:00'::timestamp,
      experiment_duration_days = 30,
      experiment_end = '2026-04-08T09:00:00'::timestamp,
      attribution = ${'{"proposed_by": "' + "eae38d09-1cfb-4044-8a16-b839bcb7d5d7" + '", "proposed_at": "2026-03-07", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb
    WHERE title LIKE 'Two-disco minimum%'
      AND status = 'testing'
  `);
  console.log("  ✓ Two-disco minimum before demo (5 deals, meeting thresholds)");

  // Clean up any orphaned TESTING experiments (created via agent bar with no lifecycle data)
  await db.execute(sql`
    UPDATE playbook_ideas SET status = 'proposed'
    WHERE status = 'testing' AND test_group IS NULL
  `);
  console.log("  ✓ Reset orphaned TESTING experiments to proposed");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

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

async function seed() {
  console.log("Updating existing experiments with lifecycle fields...");

  // Post-discovery prototype delivery (TESTING) — meets thresholds
  await db.execute(sql`
    UPDATE playbook_ideas SET
      test_group = ARRAY[${SARAH}, ${RYAN}]::text[],
      control_group = ARRAY[${DAVID}, ${PRIYA}, ${JAMES}, ${ELENA}]::text[],
      success_thresholds = '{"velocity_pct": 30, "sentiment_pts": 15, "close_rate_pct": 10}'::jsonb,
      current_metrics = '{"velocity_pct": 40, "sentiment_pts": 22, "close_rate_pct": 12, "deals_tested": 4}'::jsonb,
      approved_by = ${MARCUS},
      approved_at = '2026-03-16T09:00:00'::timestamp,
      experiment_start = '2026-03-16T09:00:00'::timestamp,
      experiment_duration_days = 30,
      experiment_end = '2026-04-15T09:00:00'::timestamp,
      attribution = ${'{"proposed_by": "' + SARAH + '", "proposed_at": "2026-03-15", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb
    WHERE title LIKE 'Post-discovery prototype%'
      AND status = 'testing'
  `);
  console.log("  ✓ Post-discovery prototype delivery");

  // Multi-threaded stakeholder engagement (TESTING) — ends today, below threshold
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
      attribution = ${'{"proposed_by": "' + MARCUS + '", "proposed_at": "2026-02-25", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb
    WHERE title LIKE 'Multi-threaded stakeholder%'
      AND status = 'testing'
  `);
  console.log("  ✓ Multi-threaded stakeholder engagement");

  // Two-disco minimum (TESTING) — in progress, meeting thresholds
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
  console.log("  ✓ Two-disco minimum before demo");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

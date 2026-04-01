import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { playbookIdeas, deals } from "@nexus/db";
import { MEMBER_IDS, postDiscoveryEvidence, multiThreadedEvidence, twoDiscoEvidence, cisoEngagementEvidence, complianceDiscoveryEvidence, securityDocEvidence } from "@nexus/db/seed-data/playbook-evidence";
import { getBaseExperiments } from "@nexus/db/seed-data/playbook-experiments";
import { createClient } from "rivetkit/client";
import type { Registry } from "@/actors/registry";

export const dynamic = "force-dynamic";

const { SARAH, ALEX, RYAN, DAVID, MARCUS, PRIYA, JAMES, ELENA } = MEMBER_IDS;

export async function POST() {
  try {
    // 1. Reset MedVista to Discovery stage for demo flow
    await db.execute(sql`
      UPDATE deals SET
        stage = 'discovery',
        win_probability = 25,
        close_competitor = NULL,
        close_notes = NULL,
        close_improvement = NULL,
        win_turning_point = NULL,
        win_replicable = NULL,
        closed_at = NULL,
        close_ai_analysis = NULL,
        close_factors = NULL,
        win_factors = NULL,
        close_ai_ran_at_timestamp = NULL,
        loss_reason = NULL,
        stage_entered_at = NOW() - INTERVAL '3 days'
      WHERE name ILIKE '%MedVista%'
    `);

    // 2. Reset other deals to original seed win_probability values
    await db.execute(sql`UPDATE deals SET win_probability = 60 WHERE name ILIKE '%HealthFirst%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 45 WHERE name ILIKE '%TrustBank%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 35 WHERE name ILIKE '%PharmaBridge%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 50 WHERE name ILIKE '%NordicCare%' AND stage::text = 'technical_validation'`);
    await db.execute(sql`UPDATE deals SET win_probability = 55 WHERE name ILIKE '%NordicMed%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 40 WHERE name ILIKE '%Atlas%' AND stage::text NOT LIKE '%closed%'`);

    // 3. Reset playbook experiments BEFORE deleting observations (FK constraint)
    await resetPlaybookData();

    // 4. Delete very recent test observations (last 2 hours)
    await db.execute(sql`
      DELETE FROM observation_routing WHERE observation_id IN (
        SELECT id FROM observations WHERE created_at > NOW() - INTERVAL '4 hours'
      )
    `);
    await db.execute(sql`DELETE FROM observations WHERE created_at > NOW() - INTERVAL '4 hours'`);

    // 4. Delete recent test field queries and their questions
    await db.execute(sql`DELETE FROM field_query_questions WHERE created_at > NOW() - INTERVAL '4 hours'`);
    await db.execute(sql`DELETE FROM field_queries WHERE created_at > NOW() - INTERVAL '4 hours'`);

    // 5. Delete test activities
    await db.execute(sql`
      DELETE FROM activities
      WHERE created_at > NOW() - INTERVAL '4 hours'
      AND (
        subject ILIKE '%intelligence update%'
        OR subject ILIKE '%close%lost%'
        OR subject ILIKE '%field intel%'
        OR subject ILIKE '%stage change%'
        OR subject ILIKE '%deal closed%'
        OR subject ILIKE '%stage changed from closed%'
      )
    `);

    // 6. Mark all notifications as unread
    await db.execute(sql`UPDATE notifications SET is_read = false`);

    // 7. Recalculate observation cluster counts and ARR
    await db.execute(sql`
      UPDATE observation_clusters SET
        observation_count = sub.cnt,
        observer_count = sub.observers,
        arr_impact_total = COALESCE(sub.arr, arr_impact_total)
      FROM (
        SELECT
          o.cluster_id,
          COUNT(*)::int as cnt,
          COUNT(DISTINCT o.observer_id)::int as observers,
          SUM(DISTINCT d.deal_value)::numeric as arr
        FROM observations o
        LEFT JOIN LATERAL unnest(o.linked_deal_ids) AS lid(deal_id) ON true
        LEFT JOIN deals d ON d.id = lid.deal_id::uuid
        WHERE o.cluster_id IS NOT NULL
        GROUP BY o.cluster_id
      ) sub
      WHERE observation_clusters.id = sub.cluster_id
    `);

    // 8. Destroy all Rivet actors for a clean demo start
    try {
      const rivetEndpoint = process.env.RIVET_ENDPOINT || `${process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3001}`}/api/rivet`;
      const rivetClient = createClient<Registry>(rivetEndpoint);

      const allDeals = await db
        .select({ id: deals.id })
        .from(deals);

      for (const deal of allDeals) {
        try {
          const dealActor = rivetClient.dealAgent.getOrCreate([deal.id]);
          await dealActor.destroyActor();
        } catch {
          // Actor might not exist — that's fine
        }
      }

      // Destroy intelligence coordinator
      try {
        const coordinator = rivetClient.intelligenceCoordinator.getOrCreate(["default"]);
        await coordinator.destroyActor();
      } catch {
        // Actor might not exist
      }
    } catch (e) {
      console.error("Failed to destroy Rivet actors during demo reset:", e);
      // Non-fatal — actors will be recreated fresh
    }

    return NextResponse.json({ success: true, message: "Demo data reset to clean state" });
  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json(
      { success: false, message: "Reset failed", error: String(error) },
      { status: 500 }
    );
  }
}

// ── Playbook Reset ──────────────────────────────────────────────────────────

async function resetPlaybookData() {
  // Ensure experiment_evidence column exists
  await db.execute(sql`ALTER TABLE playbook_ideas ADD COLUMN IF NOT EXISTS experiment_evidence jsonb`);

  // Clear all playbook ideas (removes any demo-created experiments)
  await db.execute(sql`DELETE FROM playbook_ideas`);

  // Re-insert all 8 base experiments
  await db.insert(playbookIdeas).values(getBaseExperiments());

  // ── Apply lifecycle data to the 3 TESTING experiments ──

  const postDiscoEvidenceJson = JSON.stringify(postDiscoveryEvidence);
  await db.execute(sql`
    UPDATE playbook_ideas SET
      status = 'testing',
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
      experiment_evidence = ${postDiscoEvidenceJson}::jsonb
    WHERE title LIKE 'Post-discovery prototype%'
  `);

  const multiThreadEvidenceJson = JSON.stringify(multiThreadedEvidence);
  await db.execute(sql`
    UPDATE playbook_ideas SET
      status = 'testing',
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
      experiment_evidence = ${multiThreadEvidenceJson}::jsonb
    WHERE title LIKE 'Multi-threaded stakeholder%'
  `);

  const twoDiscoEvidenceJson = JSON.stringify(twoDiscoEvidence);
  await db.execute(sql`
    UPDATE playbook_ideas SET
      status = 'testing',
      test_group = ARRAY[${PRIYA}, ${JAMES}]::text[],
      control_group = ARRAY[${SARAH}, ${RYAN}, ${DAVID}, ${ELENA}]::text[],
      success_thresholds = '{"velocity_pct": 20, "sentiment_pts": 12, "close_rate_pct": 8}'::jsonb,
      current_metrics = '{"velocity_pct": 28, "sentiment_pts": 18, "close_rate_pct": 11, "deals_tested": 5}'::jsonb,
      approved_by = ${MARCUS},
      approved_at = '2026-03-09T09:00:00'::timestamp,
      experiment_start = '2026-03-09T09:00:00'::timestamp,
      experiment_duration_days = 30,
      experiment_end = '2026-04-08T09:00:00'::timestamp,
      attribution = ${'{"proposed_by": "' + ALEX + '", "proposed_at": "2026-03-07", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb,
      experiment_evidence = ${twoDiscoEvidenceJson}::jsonb
    WHERE title LIKE 'Two-disco minimum%'
  `);

  // ── Apply evidence data to PROMOTED experiments ──

  await db.execute(sql`
    UPDATE playbook_ideas SET
      experiment_evidence = ${JSON.stringify(cisoEngagementEvidence)}::jsonb
    WHERE title LIKE 'CISO engagement%' AND status = 'promoted'
  `);

  await db.execute(sql`
    UPDATE playbook_ideas SET
      experiment_evidence = ${JSON.stringify(complianceDiscoveryEvidence)}::jsonb
    WHERE title LIKE 'Compliance-led discovery%' AND status = 'promoted'
  `);

  await db.execute(sql`
    UPDATE playbook_ideas SET
      experiment_evidence = ${JSON.stringify(securityDocEvidence)}::jsonb
    WHERE title LIKE 'Security documentation%' AND status = 'promoted'
  `);
}

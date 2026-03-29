import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Reset MedVista to its original demo state
    await db.execute(sql`
      UPDATE deals SET
        stage = 'negotiation',
        win_probability = 65,
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
        loss_reason = NULL
      WHERE name ILIKE '%MedVista%'
    `);

    // 2. Reset other deals to original seed win_probability values
    await db.execute(sql`UPDATE deals SET win_probability = 60 WHERE name ILIKE '%HealthFirst%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 45 WHERE name ILIKE '%TrustBank%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 35 WHERE name ILIKE '%PharmaBridge%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 50 WHERE name ILIKE '%NordicCare%' AND stage::text = 'technical_validation'`);
    await db.execute(sql`UPDATE deals SET win_probability = 55 WHERE name ILIKE '%NordicMed%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 40 WHERE name ILIKE '%Atlas%' AND stage::text NOT LIKE '%closed%'`);

    // 3. Delete very recent test observations (last 2 hours)
    await db.execute(sql`
      DELETE FROM observation_routing WHERE observation_id IN (
        SELECT id FROM observations WHERE created_at > NOW() - INTERVAL '2 hours'
      )
    `);
    await db.execute(sql`DELETE FROM observations WHERE created_at > NOW() - INTERVAL '2 hours'`);

    // 4. Delete recent test field queries and their questions
    await db.execute(sql`DELETE FROM field_query_questions WHERE created_at > NOW() - INTERVAL '2 hours'`);
    await db.execute(sql`DELETE FROM field_queries WHERE created_at > NOW() - INTERVAL '2 hours'`);

    // 5. Delete test activities
    await db.execute(sql`
      DELETE FROM activities
      WHERE created_at > NOW() - INTERVAL '2 hours'
      AND (subject ILIKE '%intelligence update%' OR subject ILIKE '%close%lost%' OR subject ILIKE '%field intel%' OR subject ILIKE '%stage change%')
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

    return NextResponse.json({ success: true, message: "Demo data reset to clean state" });
  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json(
      { success: false, message: "Reset failed", error: String(error) },
      { status: 500 }
    );
  }
}

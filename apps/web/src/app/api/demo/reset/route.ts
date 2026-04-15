import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql, ilike, and, not } from "drizzle-orm";
import { playbookIdeas, deals } from "@nexus/db";
import { MEMBER_IDS, postDiscoveryEvidence, multiThreadedEvidence, twoDiscoEvidence, cisoEngagementEvidence, complianceDiscoveryEvidence, securityDocEvidence } from "@nexus/db/seed-data/playbook-evidence";
import { getBaseExperiments } from "@nexus/db/seed-data/playbook-experiments";
import { createClient } from "rivetkit/client";
import type { Registry } from "@/actors/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const { SARAH, ALEX, RYAN, DAVID, MARCUS, PRIYA, JAMES, ELENA } = MEMBER_IDS;

export async function POST() {
  try {
    // ── Phase 0: Reset post-sale data ────────────────────────────────
    // Reset customer message statuses back to seeded state (kit_ready → kit_ready, responded → kit_ready)
    // Messages with pre-generated kits go back to kit_ready; pending ones stay pending
    await db.execute(sql`
      UPDATE customer_messages SET status = 'kit_ready'
      WHERE status = 'responded' AND response_kit IS NOT NULL
    `);
    await db.execute(sql`
      UPDATE customer_messages SET status = 'pending'
      WHERE status = 'responded' AND response_kit IS NULL
    `);

    // ── Phase 0b: Clear fitness + transcript processed state + deal agent states ──
    await db.execute(sql`DELETE FROM deal_fitness_events`);
    await db.execute(sql`DELETE FROM deal_fitness_scores`);
    await db.execute(sql`DELETE FROM deal_agent_states`);
    await db.execute(sql`UPDATE call_transcripts SET pipeline_processed = false`);
    // Reset call analyses so transcripts show as unanalyzed (no quality score badge)
    await db.execute(sql`UPDATE call_analyses SET call_quality_score = NULL`);

    // ── Phase 1: Clean pipeline-generated data ─────────────────────────

    // 0c. Clear playbook_ideas FK to observations (prevents FK violation on observation delete)
    await db.execute(sql`UPDATE playbook_ideas SET source_observation_id = NULL WHERE source_observation_id IS NOT NULL`);

    // 1. Delete observation_routing for pipeline-created observations (FK first)
    await db.execute(sql`
      DELETE FROM observation_routing WHERE observation_id IN (
        SELECT id FROM observations
        WHERE source_context->>'trigger' = 'transcript_pipeline'
      )
    `);

    // 2. Delete pipeline-created observations (preserves seed observations)
    await db.execute(sql`
      DELETE FROM observations
      WHERE source_context->>'trigger' = 'transcript_pipeline'
    `);

    // 3. Delete observation clusters with zero remaining observations
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
    await db.execute(sql`
      DELETE FROM observation_clusters
      WHERE id NOT IN (
        SELECT DISTINCT cluster_id FROM observations WHERE cluster_id IS NOT NULL
      )
    `);

    // 4. Delete recent test field queries and their questions (keep 4-hour window — user-triggered)
    await db.execute(sql`DELETE FROM field_query_questions WHERE created_at > NOW() - INTERVAL '4 hours'`);
    await db.execute(sql`DELETE FROM field_queries WHERE created_at > NOW() - INTERVAL '4 hours'`);

    // 5. Delete pipeline-generated activities (expanded pattern matching)
    await db.execute(sql`
      DELETE FROM activities
      WHERE
        subject ILIKE 'transcript%'
        OR subject ILIKE 'meddpicc%'
        OR subject ILIKE 'observation%'
        OR subject ILIKE 'call prep%'
        OR subject ILIKE 'email draft%'
        OR subject ILIKE 'brief%'
        OR subject ILIKE 'agent%'
        OR subject ILIKE 'intelligence update%'
        OR subject ILIKE 'signal%'
        OR subject ILIKE '%close%lost%'
        OR subject ILIKE '%field intel%'
        OR subject ILIKE '%stage change%'
        OR subject ILIKE '%deal closed%'
        OR subject ILIKE '%stage changed from closed%'
    `);

    // 6. Delete ALL deal stage history (only populated by live stage changes)
    await db.execute(sql`DELETE FROM deal_stage_history`);

    // 7. Reset MEDDPICC fields — delete all, then re-insert seed values
    await db.execute(sql`DELETE FROM meddpicc_fields`);
    await resetMeddpiccData();

    // ── Phase 2: Reset demo environment ────────────────────────────────

    // 8. Reset MedVista to Discovery stage
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

    // 9. Reset other deals to original seed win_probability values
    await db.execute(sql`UPDATE deals SET win_probability = 60 WHERE name ILIKE '%HealthFirst%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 45 WHERE name ILIKE '%TrustBank%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 35 WHERE name ILIKE '%PharmaBridge%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 50 WHERE name ILIKE '%NordicCare%' AND stage::text = 'technical_validation'`);
    await db.execute(sql`UPDATE deals SET win_probability = 55 WHERE name ILIKE '%NordicMed%' AND stage::text NOT LIKE '%closed%'`);
    await db.execute(sql`UPDATE deals SET win_probability = 40 WHERE name ILIKE '%Atlas%' AND stage::text NOT LIKE '%closed%'`);

    // 10. Reset close dates to relative values (so interventions always trigger correctly)
    const relativeDate = (daysOut: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOut);
      return d.toISOString().split('T')[0];
    };
    const medVistaClose = relativeDate(55);
    const nordicMedClose = relativeDate(42);
    const trustBankClose = relativeDate(60);
    const pharmaBridgeClose = relativeDate(90);
    const nordicCareClose = relativeDate(45);
    const atlasClose = relativeDate(30);
    await db.execute(sql`UPDATE deals SET close_date = ${medVistaClose}::date WHERE name ILIKE '%MedVista%'`);
    await db.execute(sql`UPDATE deals SET close_date = ${nordicMedClose}::date WHERE name ILIKE '%NordicMed%' AND name NOT ILIKE '%NordicCare%'`);
    await db.execute(sql`UPDATE deals SET close_date = ${trustBankClose}::date WHERE name ILIKE '%TrustBank%'`);
    await db.execute(sql`UPDATE deals SET close_date = ${pharmaBridgeClose}::date WHERE name ILIKE '%PharmaBridge%'`);
    await db.execute(sql`UPDATE deals SET close_date = ${nordicCareClose}::date WHERE name ILIKE '%NordicCare%' AND stage::text = 'technical_validation'`);
    await db.execute(sql`UPDATE deals SET close_date = ${atlasClose}::date WHERE name ILIKE '%Atlas%'`);

    // 11. Reset playbook experiments
    await resetPlaybookData();

    // 12. Mark all notifications as unread
    await db.execute(sql`UPDATE notifications SET is_read = false`);

    // ── Phase 3: Destroy ALL Rivet actors ──────────────────────────────
    console.log('[Reset] Phase 3: Destroying all Rivet actors...');

    try {
      const rivetEndpoint = process.env.RIVET_ENDPOINT || `${process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`}/api/rivet`;
      const rivetClient = createClient<Registry>(rivetEndpoint);

      // Get ALL deal IDs from the database (not just a hardcoded list)
      const allDeals = await db
        .select({ id: deals.id })
        .from(deals);
      const dealIds = allDeals.map(d => d.id);

      // Destroy deal agents for ALL deals
      for (const dealId of dealIds) {
        try {
          const agent = rivetClient.dealAgent.getOrCreate([dealId]);
          await agent.destroyActor();
          console.log(`[Reset] Destroyed dealAgent: ${dealId}`);
        } catch (e) {
          console.log(`[Reset] dealAgent destroy failed for ${dealId}: ${(e as Error).message}`);
        }
      }

      // Destroy transcript pipelines for ALL deals
      for (const dealId of dealIds) {
        try {
          const pipeline = rivetClient.transcriptPipeline.getOrCreate([dealId]);
          await pipeline.destroyActor();
          console.log(`[Reset] Destroyed transcriptPipeline: ${dealId}`);
        } catch (e) {
          console.log(`[Reset] transcriptPipeline destroy failed for ${dealId}: ${(e as Error).message}`);
        }
      }

      // Destroy intelligence coordinator (single actor, key: ["default"])
      try {
        const coordinator = rivetClient.intelligenceCoordinator.getOrCreate(["default"]);
        await coordinator.destroyActor();
        console.log('[Reset] Destroyed intelligenceCoordinator');
      } catch (e) {
        console.log(`[Reset] intelligenceCoordinator destroy failed: ${(e as Error).message}`);
      }

      console.log('[Reset] Phase 3 complete — all actors destroyed');
    } catch (e) {
      console.error("Failed to destroy Rivet actors during demo reset:", e);
      // Non-fatal — actors will be recreated fresh
    }

    return NextResponse.json({
      success: true,
      phases: {
        pipeline_data: "done",
        agents: "done",
        demo_env: "done",
      },
    });
  } catch (error) {
    console.error("Demo reset error:", error);
    return NextResponse.json(
      { success: false, message: "Reset failed", error: String(error) },
      { status: 500 }
    );
  }
}

// ── MEDDPICC Seed Reset ──────────────────────────────────────────────────────

async function resetMeddpiccData() {
  // Re-insert seed MEDDPICC for MedVista (Discovery — low confidence, early stage)
  const [medvista] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(ilike(deals.name, '%MedVista%'))
    .limit(1);
  if (medvista) {
    await db.execute(sql`
      INSERT INTO meddpicc_fields (deal_id, metrics, metrics_confidence, economic_buyer, economic_buyer_confidence, decision_criteria, decision_criteria_confidence, decision_process, decision_process_confidence, identify_pain, identify_pain_confidence, champion, champion_confidence, competition, competition_confidence)
      VALUES (${medvista.id}, '$800K/month documentation costs, $2.1M compliance exposure', 35, 'CFO — not yet engaged directly', 15, 'GDPR compliance, Epic EHR integration, clinical accuracy', 30, 'Unknown — early discovery', 10, 'Physicians spending 3+ hours/day on documentation, compliance risk from manual processes', 55, 'Henrik Larsson — IT Director, personally driving AI evaluation', 40, 'Microsoft DAX Copilot in early evaluation — no formal RFP yet', 45)
    `);
  }

  // Re-insert seed MEDDPICC for NordicMed
  const [nordicmed] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(ilike(deals.name, '%NordicMed%'), not(ilike(deals.name, '%NordicCare%'))))
    .limit(1);
  if (nordicmed) {
    await db.execute(sql`
      INSERT INTO meddpicc_fields (deal_id, metrics, metrics_confidence, economic_buyer, economic_buyer_confidence, decision_criteria, decision_criteria_confidence, decision_process, decision_process_confidence, identify_pain, identify_pain_confidence, champion, champion_confidence, competition, competition_confidence)
      VALUES (${nordicmed.id}, 'Target: 35% reduction in clinical documentation time across 12 hospitals', 70, 'Anders Björk, CFO — engaged but cautious about implementation costs', 55, 'EU data residency, multi-language support, EHR integration, GDPR compliance', 75, 'CMO recommendation → IT security review → CFO approval → board vote', 60, 'Physicians spending 3+ hours/day on documentation, highest turnover in 5 years', 85, 'Dr. Eriksson — personally experienced documentation burden, presenting to board', 75, 'Microsoft Copilot in evaluation — Eriksson prefers Claude for healthcare specificity', 65)
    `);
  }

  // Re-insert seed MEDDPICC for Atlas Capital
  const [atlas] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(ilike(deals.name, '%Atlas%'))
    .limit(1);
  if (atlas) {
    await db.execute(sql`
      INSERT INTO meddpicc_fields (deal_id, metrics, metrics_confidence, economic_buyer, economic_buyer_confidence, decision_criteria, decision_criteria_confidence, decision_process, decision_process_confidence, identify_pain, identify_pain_confidence, champion, champion_confidence, competition, competition_confidence)
      VALUES (${atlas.id}, 'Target: 50% faster risk assessment turnaround, $2M annual savings', 65, 'Maria Santos, CFO — budget approved but hesitant on timeline', 50, 'SOC 2 Type II, real-time processing, integration with Bloomberg terminal', 80, 'VP Risk recommendation → compliance review → CFO sign-off', 70, 'Risk assessments taking 5 days, competitors doing it in 2', 90, 'James Chen — frustrated with current tools, wants to modernize', 70, 'CompetitorX offered 30% lower pricing with a free 90-day pilot', 85)
    `);
  }

  // Re-insert seed MEDDPICC for HealthBridge (Closed Lost)
  const [healthbridge] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(ilike(deals.name, '%HealthBridge%'))
    .limit(1);
  if (healthbridge) {
    await db.execute(sql`
      INSERT INTO meddpicc_fields (deal_id, metrics, metrics_confidence, economic_buyer, economic_buyer_confidence, identify_pain, identify_pain_confidence, champion, champion_confidence, competition, competition_confidence)
      VALUES (${healthbridge.id}, 'Target: 30% reduction in telemedicine wait times', 40, 'Unknown — never identified real budget holder', 15, 'Long telemedicine wait times driving patient complaints', 60, 'Dr. Sarah Park — left mid-cycle, single-threaded', 25, 'No active competitor — deal died from inaction', 20)
    `);
  }

  // Re-insert seed MEDDPICC for MedTech Solutions (Closed Won)
  const [medtech] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(ilike(deals.name, '%MedTech%'))
    .limit(1);
  if (medtech) {
    await db.execute(sql`
      INSERT INTO meddpicc_fields (deal_id, metrics, metrics_confidence, economic_buyer, economic_buyer_confidence, decision_criteria, decision_criteria_confidence, decision_process, decision_process_confidence, identify_pain, identify_pain_confidence, champion, champion_confidence, competition, competition_confidence)
      VALUES (${medtech.id}, '45% reduction in documentation time, $890K annual savings', 90, 'Robert Chang, CFO — approved after seeing pilot ROI', 90, 'EHR integration, documentation time reduction, HIPAA compliance', 85, 'VP Clinical Ops → CFO approval → board vote', 80, 'Physicians spending 40% of time on documentation, burnout driving turnover', 95, 'Jennifer Walsh — drove internal adoption, presented ROI deck to board', 95, 'No active competitor — won on compliance and champion strength', 50)
    `);
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

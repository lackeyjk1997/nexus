import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { playbookIdeas } from "@nexus/db";

export const dynamic = "force-dynamic";

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

    // 3. Delete very recent test observations (last 2 hours)
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

    // 8. Reset playbook experiments to seed state
    await resetPlaybookData();

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

// Team member IDs
const SARAH = "ec26c991-f580-452c-ae60-14b94800e920";
const ALEX = "eae38d09-1cfb-4044-8a16-b839bcb7d5d7";
const RYAN = "f7c15224-0883-46b7-affa-990eeedaac07";
const DAVID = "4443c9bb-5a4a-405a-9b99-f0e97e86b0d2";
const MARCUS = "fcbfac19-88eb-4a34-8582-b1cdfa03055b";
const TOM = "27cb3617-b187-40a5-9761-f878ce89f73d";
const PRIYA = "5d30b930-f2e8-4939-b2e6-2220385bf0fd";
const JAMES = "0f98cede-0aab-44aa-964d-06d2c634019c";
const ELENA = "a9b8cf2c-ec9b-4abc-97f0-c7d6f6523298";

const MEDVISTA = "c0069b95-02dc-46db-bd04-aac69099ecfb";
const NORDICMED = "3848a398-1850-4a8c-a44e-46aec01b6a24";
const HEALTHFIRST = "f4fee3bc-b65c-49e8-a34f-0fab8b8724c9";
const ATLAS = "0d0f187f-ee15-4baf-8ff5-08f88341eb1c";
const COMPLIANCE_OBS = "5a8be514-7236-42ed-8929-119a362ea14c";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function resetPlaybookData() {
  // Ensure experiment_evidence column exists
  await db.execute(sql`ALTER TABLE playbook_ideas ADD COLUMN IF NOT EXISTS experiment_evidence jsonb`);

  // Clear all playbook ideas (removes any demo-created experiments)
  await db.execute(sql`DELETE FROM playbook_ideas`);

  // Re-insert all 8 base experiments
  await db.insert(playbookIdeas).values([
    {
      originatorId: SARAH,
      originatedFrom: "observation",
      sourceObservationId: COMPLIANCE_OBS,
      title: "Compliance-led discovery in Healthcare",
      hypothesis: "Leading with compliance positioning (HIPAA, data residency, AI review boards) in the first 10 minutes of healthcare discovery calls produces higher engagement and faster stage progression than ROI-led approaches.",
      category: "positioning",
      vertical: "healthcare",
      status: "promoted",
      testStartDate: daysAgo(60),
      results: { stage_velocity_change: 43, sentiment_shift: 18, adoption_count: 3, deals_influenced: 5, arr_influenced: 8200000, close_rate_test: 67, close_rate_control: 25, confidence: "high", measurement_period_days: 45 },
      followers: [SARAH, RYAN],
      followerCount: 2,
      createdAt: daysAgo(65),
    },
    {
      originatorId: SARAH,
      originatedFrom: "observation",
      title: "Post-discovery prototype delivery",
      hypothesis: "Building a quick working prototype in Claude after each discovery call and sending it to the prospect within 24 hours of the call accelerates deals past Technical Validation.",
      category: "engagement",
      vertical: null,
      status: "testing",
      testStartDate: daysAgo(14),
      testGroupDeals: [MEDVISTA, NORDICMED],
      controlGroupDeals: [HEALTHFIRST, ATLAS],
      results: { stage_velocity_change: 40, sentiment_shift: 22, adoption_count: 2, deals_influenced: 2, arr_influenced: 4000000, close_rate_test: null, close_rate_control: null, confidence: "medium", measurement_period_days: 14 },
      followers: [SARAH],
      followerCount: 1,
      createdAt: daysAgo(14),
    },
    {
      originatorId: ALEX,
      originatedFrom: "observation",
      title: "Two-disco minimum before demo",
      hypothesis: "Running at least two discovery calls before scheduling a product demo results in more qualified opportunities and fewer demo-to-ghosting dropoffs.",
      category: "process",
      vertical: null,
      status: "testing",
      testStartDate: daysAgo(21),
      results: { stage_velocity_change: -5, sentiment_shift: 31, adoption_count: 2, deals_influenced: 3, arr_influenced: 2380000, close_rate_test: null, close_rate_control: null, confidence: "low", measurement_period_days: 21 },
      followers: [ALEX, RYAN],
      followerCount: 2,
      createdAt: daysAgo(21),
    },
    {
      originatorId: ALEX,
      originatedFrom: "close_analysis",
      title: "CISO engagement before Stage 3",
      hypothesis: "Engaging the CISO directly before Technical Validation prevents security review bottlenecks later in the cycle.",
      category: "process",
      vertical: "healthcare",
      status: "promoted",
      testStartDate: daysAgo(45),
      results: { stage_velocity_change: 55, sentiment_shift: 12, adoption_count: 3, deals_influenced: 4, arr_influenced: 5800000, close_rate_test: 75, close_rate_control: 33, confidence: "high", measurement_period_days: 40 },
      followers: [SARAH, RYAN, ALEX],
      followerCount: 3,
      createdAt: daysAgo(50),
    },
    {
      originatorId: DAVID,
      originatedFrom: "observation",
      title: "Competitive battlecard review before negotiation",
      hypothesis: "AEs who review the competitive battlecard within 24 hours of entering Negotiation stage close at higher rates.",
      category: "closing",
      vertical: "financial_services",
      status: "proposed",
      results: null,
      followers: [],
      followerCount: 0,
      createdAt: daysAgo(5),
    },
    {
      originatorId: RYAN,
      originatedFrom: "manual",
      title: "ROI-first messaging in Healthcare",
      hypothesis: "Leading with ROI and cost savings in healthcare discovery calls produces better engagement than compliance-led approaches.",
      category: "messaging",
      vertical: "healthcare",
      status: "retired",
      testStartDate: daysAgo(90),
      testEndDate: daysAgo(45),
      results: { stage_velocity_change: -12, sentiment_shift: -8, adoption_count: 2, deals_influenced: 3, arr_influenced: 0, close_rate_test: 0, close_rate_control: 50, confidence: "high", measurement_period_days: 45 },
      followers: [],
      followerCount: 0,
      createdAt: daysAgo(95),
    },
    {
      originatorId: MARCUS,
      originatedFrom: "system_detected",
      title: "Multi-threaded stakeholder engagement by Stage 2",
      hypothesis: "Deals where the AE engages 3+ stakeholders before the Proposal stage close 2x more often than single-threaded deals.",
      category: "process",
      vertical: null,
      status: "testing",
      testStartDate: daysAgo(30),
      results: { stage_velocity_change: 15, sentiment_shift: 9, adoption_count: 4, deals_influenced: 5, arr_influenced: 7300000, close_rate_test: null, close_rate_control: null, confidence: "medium", measurement_period_days: 30 },
      followers: [SARAH, DAVID, RYAN],
      followerCount: 3,
      createdAt: daysAgo(30),
    },
    {
      originatorId: TOM,
      originatedFrom: "cross_agent",
      title: "Security documentation pre-delivery for FinServ",
      hypothesis: "Proactively sending SOC 2 Type II documentation before the first technical meeting in Financial Services deals eliminates the security review bottleneck.",
      category: "process",
      vertical: "financial_services",
      status: "promoted",
      testStartDate: daysAgo(60),
      results: { stage_velocity_change: 62, sentiment_shift: 15, adoption_count: 2, deals_influenced: 3, arr_influenced: 2480000, close_rate_test: 100, close_rate_control: 50, confidence: "medium", measurement_period_days: 50 },
      followers: [DAVID, TOM],
      followerCount: 2,
      createdAt: daysAgo(65),
    },
  ]);

  // ── Apply lifecycle data to the 3 TESTING experiments ──

  // Post-discovery prototype — graduation-ready: 9 deals, meets 3/3 thresholds
  const postDiscoEvidence = JSON.stringify({ deals: [
    { deal_name: "MedVista Health Systems", deal_id: MEDVISTA, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "discovery", amount: 2400000, days_in_stage: 8, avg_days_baseline: 20, sentiment_score: 85, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-18", source: "Discovery Call with Dr. Patel", excerpt: "After building the EHR integration prototype live on the call, Dr. Patel immediately asked to bring in their CTO for a follow-up. She said: 'This is the first vendor who actually showed us what it would look like instead of just talking about it.'" },
      { type: "email", date: "2026-03-20", source: "Follow-up from Dr. Patel", excerpt: "The prototype from our session is already being reviewed by our compliance team. Can we schedule the security review this week instead of next month? We want to move quickly on this." },
    ]},
    { deal_name: "NordicMed Solutions", deal_id: NORDICMED, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "technical_validation", amount: 1100000, days_in_stage: 11, avg_days_baseline: 20, sentiment_score: 78, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-14", source: "Discovery Call with CTO Eriksson", excerpt: "When we built the patient data routing automation live, Eriksson stopped the call to pull in two of his engineering leads. He said: 'They need to see this — this changes our whole evaluation timeline.'" },
    ]},
    { deal_name: "PharmaBridge Analytics", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "proposal", amount: 890000, days_in_stage: 6, avg_days_baseline: 20, sentiment_score: 82, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-21", source: "Discovery Call with VP Clinical Ops", excerpt: "Built a clinical trial data aggregation prototype during the call. The VP said: 'We've been asking our current vendor for this for 18 months. You just built it in 20 minutes.'" },
    ]},
    { deal_name: "NordicCare Group", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "discovery", amount: 750000, days_in_stage: 10, avg_days_baseline: 20, sentiment_score: 71, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Meridian Health Network", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "technical_validation", amount: 1300000, days_in_stage: 9, avg_days_baseline: 20, sentiment_score: 88, avg_sentiment_baseline: 60, evidence: [
      { type: "email", date: "2026-03-25", source: "Email from CIO to internal team (forwarded)", excerpt: "Forwarding the prototype link from today's call with Anthropic. This is significantly ahead of what we saw from Microsoft and Google. Let's fast-track the security review." },
    ]},
    { deal_name: "Coastal Medical Partners", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "technical_validation", amount: 680000, days_in_stage: 22, avg_days_baseline: 20, sentiment_score: 55, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Summit Healthcare", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "proposal", amount: 920000, days_in_stage: 19, avg_days_baseline: 20, sentiment_score: 62, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Westlake Medical Group", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "discovery", amount: 540000, days_in_stage: 24, avg_days_baseline: 20, sentiment_score: 48, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Pacific Health Alliance", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "negotiation", amount: 1050000, days_in_stage: 18, avg_days_baseline: 20, sentiment_score: 65, avg_sentiment_baseline: 60, evidence: [] },
  ]});

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
    WHERE title LIKE 'Post-discovery prototype%' AND status = 'testing'
  `);

  // Multi-threaded stakeholder — 6 deals, mixed results, below threshold
  const multiThreadEvidence = JSON.stringify({ deals: [
    { deal_name: "TechFlow Systems", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "proposal", amount: 890000, days_in_stage: 15, avg_days_baseline: 18, sentiment_score: 65, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-10", source: "Multi-stakeholder meeting", excerpt: "Brought in VP Engineering and Director of Product early. While both engaged positively, the VP later told David: 'Involving us this early felt premature — we hadn't even defined our requirements yet.'" },
    ]},
    { deal_name: "Apex Financial Corp", deal_id: null, owner_name: "Elena Rodriguez", owner_id: ELENA, group: "test", stage: "technical_validation", amount: 1200000, days_in_stage: 12, avg_days_baseline: 18, sentiment_score: 72, avg_sentiment_baseline: 60, evidence: [
      { type: "email", date: "2026-03-15", source: "Email from Elena to team", excerpt: "Multi-threading worked here — getting the CFO involved at Stage 2 meant the budget conversation happened in parallel with technical eval. Saved us 2 weeks." },
    ]},
    { deal_name: "Granite Insurance Group", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "discovery", amount: 650000, days_in_stage: 20, avg_days_baseline: 18, sentiment_score: 52, avg_sentiment_baseline: 60, evidence: [
      { type: "transcript", date: "2026-03-22", source: "Discovery call debrief", excerpt: "Tried to multi-thread by asking for CISO access during first discovery. Champion pushed back hard — said 'we don't bring security into vendor conversations until we've decided to move forward.' Felt like we overstepped." },
    ]},
    { deal_name: "Sterling Wealth Management", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "proposal", amount: 780000, days_in_stage: 18, avg_days_baseline: 18, sentiment_score: 61, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Pinnacle Credit Union", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "technical_validation", amount: 950000, days_in_stage: 16, avg_days_baseline: 18, sentiment_score: 58, avg_sentiment_baseline: 60, evidence: [] },
    { deal_name: "Redwood Capital Partners", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "control", stage: "discovery", amount: 1100000, days_in_stage: 21, avg_days_baseline: 18, sentiment_score: 55, avg_sentiment_baseline: 60, evidence: [] },
  ]});

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
    WHERE title LIKE 'Multi-threaded stakeholder%' AND status = 'testing'
  `);

  // Two-disco minimum — 5 deals, meeting thresholds but low confidence
  const twoDiscoEvidence = JSON.stringify({ deals: [
    { deal_name: "CloudNine Logistics", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "test", stage: "technical_validation", amount: 720000, days_in_stage: 10, avg_days_baseline: 16, sentiment_score: 79, avg_sentiment_baseline: 62, evidence: [
      { type: "transcript", date: "2026-03-19", source: "Second discovery call", excerpt: "The second discovery uncovered that their real pain was in logistics routing, not the inventory management they initially mentioned. The demo we built targeted routing specifically and the CTO said: 'Finally, someone who actually listened before showing us slides.'" },
    ]},
    { deal_name: "DataVault Systems", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "test", stage: "proposal", amount: 880000, days_in_stage: 8, avg_days_baseline: 16, sentiment_score: 83, avg_sentiment_baseline: 62, evidence: [
      { type: "email", date: "2026-03-24", source: "Follow-up from VP Engineering", excerpt: "Appreciate the thorough discovery process. The fact that you came back for a second conversation before jumping to a demo tells me your team actually cares about solving our problem, not just selling." },
    ]},
    { deal_name: "Quantum Analytics", deal_id: null, owner_name: "Priya Sharma", owner_id: PRIYA, group: "test", stage: "discovery", amount: 560000, days_in_stage: 14, avg_days_baseline: 16, sentiment_score: 68, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Atlas Data Corp", deal_id: null, owner_name: "Elena Rodriguez", owner_id: ELENA, group: "control", stage: "proposal", amount: 690000, days_in_stage: 18, avg_days_baseline: 16, sentiment_score: 57, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Nexgen Solutions", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "control", stage: "technical_validation", amount: 840000, days_in_stage: 15, avg_days_baseline: 16, sentiment_score: 64, avg_sentiment_baseline: 62, evidence: [] },
  ]});

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
      attribution = ${'{"proposed_by": "' + ALEX + '", "proposed_at": "2026-03-07", "approved_by": "' + MARCUS + '", "impact_arr": 0}'}::jsonb,
      experiment_evidence = ${twoDiscoEvidence}::jsonb
    WHERE title LIKE 'Two-disco minimum%' AND status = 'testing'
  `);

  // ── Apply evidence data to PROMOTED experiments ──

  // CISO engagement before Stage 3 (PROMOTED)
  const cisoEvidence = JSON.stringify({ deals: [
    { deal_name: "Regional Health Network", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "closed_won", amount: 1800000, days_in_stage: 7, avg_days_baseline: 16, sentiment_score: 91, avg_sentiment_baseline: 65, evidence: [
      { type: "transcript", date: "2026-02-12", source: "CISO introduction call", excerpt: "Getting the CISO engaged before Technical Validation meant the security review ran in parallel instead of blocking. The CISO said: 'I wish more vendors brought us in early — it saves everyone time.'" },
    ]},
    { deal_name: "HealthFirst Clinical", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "closed_won", amount: 2200000, days_in_stage: 9, avg_days_baseline: 16, sentiment_score: 87, avg_sentiment_baseline: 65, evidence: [
      { type: "email", date: "2026-02-18", source: "Internal Slack from Ryan", excerpt: "CISO engagement at Stage 2 completely changed the dynamic. Instead of security being a gate, they became an advocate. They're now pushing procurement to accelerate." },
    ]},
    { deal_name: "Metro Health Systems", deal_id: null, owner_name: "Alex Kim", owner_id: ALEX, group: "test", stage: "closed_won", amount: 1400000, days_in_stage: 11, avg_days_baseline: 16, sentiment_score: 79, avg_sentiment_baseline: 65, evidence: [] },
    { deal_name: "Valley Medical Center", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "closed_lost", amount: 900000, days_in_stage: 14, avg_days_baseline: 16, sentiment_score: 58, avg_sentiment_baseline: 65, evidence: [] },
  ]});

  await db.execute(sql`
    UPDATE playbook_ideas SET
      experiment_evidence = ${cisoEvidence}::jsonb
    WHERE title LIKE 'CISO engagement%' AND status = 'promoted'
  `);

  // Compliance-led discovery in Healthcare (PROMOTED)
  const complianceEvidence = JSON.stringify({ deals: [
    { deal_name: "MedVista Health Systems", deal_id: MEDVISTA, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "discovery", amount: 2400000, days_in_stage: 6, avg_days_baseline: 14, sentiment_score: 88, avg_sentiment_baseline: 62, evidence: [
      { type: "transcript", date: "2026-01-22", source: "Discovery Call", excerpt: "Opening with HIPAA compliance positioning immediately changed the tone. Dr. Patel said: 'Finally — a vendor that understands healthcare isn't just another enterprise sale. Compliance is table stakes.'" },
    ]},
    { deal_name: "NordicMed Group Platform", deal_id: NORDICMED, owner_name: "Ryan Foster", owner_id: RYAN, group: "test", stage: "closed_won", amount: 1600000, days_in_stage: 8, avg_days_baseline: 14, sentiment_score: 82, avg_sentiment_baseline: 62, evidence: [
      { type: "email", date: "2026-01-28", source: "Follow-up from CTO", excerpt: "The fact that you led with data residency and AI governance — not features — made our compliance team comfortable from day one. That never happens with vendors." },
    ]},
    { deal_name: "Pacific Wellness Group", deal_id: null, owner_name: "Sarah Chen", owner_id: SARAH, group: "test", stage: "closed_won", amount: 1200000, days_in_stage: 9, avg_days_baseline: 14, sentiment_score: 79, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Eastside Medical", deal_id: null, owner_name: "Ryan Foster", owner_id: RYAN, group: "control", stage: "closed_lost", amount: 850000, days_in_stage: 18, avg_days_baseline: 14, sentiment_score: 51, avg_sentiment_baseline: 62, evidence: [] },
    { deal_name: "Lakeside Health Partners", deal_id: null, owner_name: "James Wilson", owner_id: JAMES, group: "control", stage: "proposal", amount: 960000, days_in_stage: 16, avg_days_baseline: 14, sentiment_score: 57, avg_sentiment_baseline: 62, evidence: [] },
  ]});

  await db.execute(sql`
    UPDATE playbook_ideas SET
      experiment_evidence = ${complianceEvidence}::jsonb
    WHERE title LIKE 'Compliance-led discovery%' AND status = 'promoted'
  `);

  // Security documentation pre-delivery for FinServ (PROMOTED)
  const secDocEvidence = JSON.stringify({ deals: [
    { deal_name: "Atlas Capital Analytics", deal_id: ATLAS, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "negotiation", amount: 580000, days_in_stage: 5, avg_days_baseline: 14, sentiment_score: 84, avg_sentiment_baseline: 58, evidence: [
      { type: "email", date: "2026-02-05", source: "Prospect CISO reply", excerpt: "Thank you for sending the SOC 2 Type II report ahead of our meeting. This is the first time a vendor has done this proactively — it saved us at least two weeks of back-and-forth." },
    ]},
    { deal_name: "TrustBank Financial", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "test", stage: "closed_won", amount: 950000, days_in_stage: 7, avg_days_baseline: 14, sentiment_score: 81, avg_sentiment_baseline: 58, evidence: [
      { type: "transcript", date: "2026-02-10", source: "Technical Review", excerpt: "Their Head of Security opened with: 'I already reviewed your SOC 2 docs — let's skip the security overview and go straight to architecture.' We saved 30 minutes." },
    ]},
    { deal_name: "Pinnacle Financial Group", deal_id: null, owner_name: "Tom Bradley", owner_id: TOM, group: "test", stage: "closed_won", amount: 720000, days_in_stage: 6, avg_days_baseline: 14, sentiment_score: 77, avg_sentiment_baseline: 58, evidence: [] },
    { deal_name: "Meridian Capital", deal_id: null, owner_name: "David Park", owner_id: DAVID, group: "control", stage: "technical_validation", amount: 680000, days_in_stage: 16, avg_days_baseline: 14, sentiment_score: 54, avg_sentiment_baseline: 58, evidence: [] },
    { deal_name: "Heritage Banking Corp", deal_id: null, owner_name: "Tom Bradley", owner_id: TOM, group: "control", stage: "proposal", amount: 830000, days_in_stage: 15, avg_days_baseline: 14, sentiment_score: 52, avg_sentiment_baseline: 58, evidence: [] },
  ]});

  await db.execute(sql`
    UPDATE playbook_ideas SET
      experiment_evidence = ${secDocEvidence}::jsonb
    WHERE title LIKE 'Security documentation%' AND status = 'promoted'
  `);
}

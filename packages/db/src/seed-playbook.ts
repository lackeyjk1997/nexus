import { db } from "./index";
import { playbookIdeas, influenceScores, systemIntelligence } from "./schema";

// Team member IDs
const SARAH = "ec26c991-f580-452c-ae60-14b94800e920";
const ALEX = "eae38d09-1cfb-4044-8a16-b839bcb7d5d7";
const RYAN = "f7c15224-0883-46b7-affa-990eeedaac07";
const DAVID = "4443c9bb-5a4a-405a-9b99-f0e97e86b0d2";
const MARCUS = "fcbfac19-88eb-4a34-8582-b1cdfa03055b";
const TOM = "27cb3617-b187-40a5-9761-f878ce89f73d";
const JORDAN = "57eda11d-6945-49fa-a701-e4f462efad65";

// Deal IDs
const MEDVISTA = "c0069b95-02dc-46db-bd04-aac69099ecfb";
const NORDICMED = "3848a398-1850-4a8c-a44e-46aec01b6a24";
const HEALTHFIRST = "f4fee3bc-b65c-49e8-a34f-0fab8b8724c9";
const ATLAS = "0d0f187f-ee15-4baf-8ff5-08f88341eb1c";

// Observation IDs
const COMPLIANCE_OBS = "5a8be514-7236-42ed-8929-119a362ea14c";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function seed() {
  console.log("Seeding playbook ideas...");

  await db.insert(playbookIdeas).values([
    // 1. PROMOTED — Compliance-led discovery
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
      results: {
        stage_velocity_change: 43,
        sentiment_shift: 18,
        adoption_count: 3,
        deals_influenced: 5,
        arr_influenced: 8200000,
        close_rate_test: 67,
        close_rate_control: 25,
        confidence: "high",
        measurement_period_days: 45,
      },
      followers: [SARAH, RYAN],
      followerCount: 2,
      createdAt: daysAgo(65),
    },
    // 2. TESTING — Post-discovery prototype
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
      results: {
        stage_velocity_change: 40,
        sentiment_shift: 22,
        adoption_count: 2,
        deals_influenced: 2,
        arr_influenced: 4000000,
        close_rate_test: null,
        close_rate_control: null,
        confidence: "medium",
        measurement_period_days: 14,
      },
      followers: [SARAH],
      followerCount: 1,
      createdAt: daysAgo(14),
    },
    // 3. TESTING — Two-disco minimum
    {
      originatorId: ALEX,
      originatedFrom: "observation",
      title: "Two-disco minimum before demo",
      hypothesis: "Running at least two discovery calls before scheduling a product demo results in more qualified opportunities and fewer demo-to-ghosting dropoffs.",
      category: "process",
      vertical: null,
      status: "testing",
      testStartDate: daysAgo(21),
      results: {
        stage_velocity_change: -5,
        sentiment_shift: 31,
        adoption_count: 2,
        deals_influenced: 3,
        arr_influenced: 2380000,
        close_rate_test: null,
        close_rate_control: null,
        confidence: "low",
        measurement_period_days: 21,
      },
      followers: [ALEX, RYAN],
      followerCount: 2,
      createdAt: daysAgo(21),
    },
    // 4. PROMOTED — CISO engagement before Stage 3
    {
      originatorId: ALEX,
      originatedFrom: "close_analysis",
      title: "CISO engagement before Stage 3",
      hypothesis: "Engaging the CISO directly before Technical Validation prevents security review bottlenecks later in the cycle.",
      category: "process",
      vertical: "healthcare",
      status: "promoted",
      testStartDate: daysAgo(45),
      results: {
        stage_velocity_change: 55,
        sentiment_shift: 12,
        adoption_count: 3,
        deals_influenced: 4,
        arr_influenced: 5800000,
        close_rate_test: 75,
        close_rate_control: 33,
        confidence: "high",
        measurement_period_days: 40,
      },
      followers: [SARAH, RYAN, ALEX],
      followerCount: 3,
      createdAt: daysAgo(50),
    },
    // 5. PROPOSED — Competitive battlecard
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
    // 6. RETIRED — ROI-first messaging
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
      results: {
        stage_velocity_change: -12,
        sentiment_shift: -8,
        adoption_count: 2,
        deals_influenced: 3,
        arr_influenced: 0,
        close_rate_test: 0,
        close_rate_control: 50,
        confidence: "high",
        measurement_period_days: 45,
      },
      followers: [],
      followerCount: 0,
      createdAt: daysAgo(95),
    },
    // 7. TESTING — Multi-threaded engagement
    {
      originatorId: MARCUS,
      originatedFrom: "system_detected",
      title: "Multi-threaded stakeholder engagement by Stage 2",
      hypothesis: "Deals where the AE engages 3+ stakeholders before the Proposal stage close 2x more often than single-threaded deals.",
      category: "process",
      vertical: null,
      status: "testing",
      testStartDate: daysAgo(30),
      results: {
        stage_velocity_change: 15,
        sentiment_shift: 9,
        adoption_count: 4,
        deals_influenced: 5,
        arr_influenced: 7300000,
        close_rate_test: null,
        close_rate_control: null,
        confidence: "medium",
        measurement_period_days: 30,
      },
      followers: [SARAH, DAVID, RYAN],
      followerCount: 3,
      createdAt: daysAgo(30),
    },
    // 8. PROMOTED — Security doc pre-delivery for FinServ
    {
      originatorId: TOM,
      originatedFrom: "cross_agent",
      title: "Security documentation pre-delivery for FinServ",
      hypothesis: "Proactively sending SOC 2 Type II documentation before the first technical meeting in Financial Services deals eliminates the security review bottleneck.",
      category: "process",
      vertical: "financial_services",
      status: "promoted",
      testStartDate: daysAgo(60),
      results: {
        stage_velocity_change: 62,
        sentiment_shift: 15,
        adoption_count: 2,
        deals_influenced: 3,
        arr_influenced: 2480000,
        close_rate_test: 100,
        close_rate_control: 50,
        confidence: "medium",
        measurement_period_days: 50,
      },
      followers: [DAVID, TOM],
      followerCount: 2,
      createdAt: daysAgo(65),
    },
  ]);
  console.log("  8 playbook ideas seeded");

  // ── Influence Scores ──
  console.log("Seeding influence scores...");

  await db.insert(influenceScores).values([
    // Sarah Chen
    {
      memberId: SARAH,
      dimension: "process_innovation",
      score: 85,
      tier: "high_impact",
      attributions: [
        { type: "idea_promoted", description: "Compliance-led discovery promoted — 43% velocity improvement", arr_impact: 8200000, date: daysAgo(15).toISOString().split("T")[0] },
        { type: "pattern_identified", description: "CompetitorX pricing cluster — 7 observations, €580K identified", arr_impact: 580000, date: daysAgo(20).toISOString().split("T")[0] },
        { type: "feedback_improved_deal", description: "Security review observation joined cluster affecting 3 deals", arr_impact: 2400000, date: daysAgo(25).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(5),
    },
    {
      memberId: SARAH,
      dimension: "competitive_intel",
      score: 72,
      tier: "growing",
      attributions: [
        { type: "pattern_identified", description: "CompetitorX free pilot pattern tracked across 3 deals", arr_impact: 1800000, date: daysAgo(10).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(10),
    },
    {
      memberId: SARAH,
      dimension: "customer_insight",
      score: 68,
      tier: "growing",
      attributions: [
        { type: "observation_led_to_cluster", description: "Healthcare compliance requirements pattern identified", arr_impact: 2400000, date: daysAgo(30).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(15),
    },
    // Alex Kim
    {
      memberId: ALEX,
      dimension: "technical_expertise",
      score: 90,
      tier: "high_impact",
      attributions: [
        { type: "feedback_improved_deal", description: "Compliance expertise injected into 4 healthcare call preps via cross-agent feedback", arr_impact: 9200000, date: daysAgo(10).toISOString().split("T")[0] },
        { type: "idea_promoted", description: "CISO engagement idea — 55% velocity improvement, learned from NordicCare loss", arr_impact: 5800000, date: daysAgo(15).toISOString().split("T")[0] },
        { type: "close_factor_prevented_loss", description: "NordicCare loss analysis insight prevented similar failure on MedVista", arr_impact: 2400000, date: daysAgo(20).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(5),
    },
    {
      memberId: ALEX,
      dimension: "process_innovation",
      score: 65,
      tier: "growing",
      attributions: [
        { type: "idea_promoted", description: "Two-disco minimum showing +31 sentiment shift", arr_impact: 2380000, date: daysAgo(21).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(15),
    },
    {
      memberId: ALEX,
      dimension: "deal_coaching",
      score: 78,
      tier: "high_impact",
      attributions: [
        { type: "feedback_improved_deal", description: "Cross-agent feedback on 3 healthcare deals improved AE approaches", arr_impact: 4800000, date: daysAgo(12).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(10),
    },
    // David Park
    {
      memberId: DAVID,
      dimension: "competitive_intel",
      score: 70,
      tier: "growing",
      attributions: [
        { type: "pattern_identified", description: "Atlas Capital CompetitorX observation contributed to competitive cluster", arr_impact: 580000, date: daysAgo(8).toISOString().split("T")[0] },
        { type: "observation_led_to_cluster", description: "FinServ pricing pattern identified across 2 deals", arr_impact: 1530000, date: daysAgo(15).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(8),
    },
    {
      memberId: DAVID,
      dimension: "process_innovation",
      score: 35,
      tier: "contributing",
      attributions: [
        { type: "pattern_identified", description: "Competitive battlecard review idea proposed", arr_impact: 0, date: daysAgo(5).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(5),
    },
    // Ryan Foster
    {
      memberId: RYAN,
      dimension: "customer_insight",
      score: 55,
      tier: "contributing",
      attributions: [
        { type: "close_factor_prevented_loss", description: "NordicCare Patient Records loss analysis — security review timing insight", arr_impact: 1800000, date: daysAgo(40).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(20),
    },
    {
      memberId: RYAN,
      dimension: "process_innovation",
      score: 30,
      tier: "contributing",
      attributions: [
        { type: "pattern_identified", description: "ROI-first approach tested and retired — data-driven learning", arr_impact: 0, date: daysAgo(45).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(30),
    },
    // Marcus Thompson
    {
      memberId: MARCUS,
      dimension: "deal_coaching",
      score: 82,
      tier: "high_impact",
      attributions: [
        { type: "idea_promoted", description: "Multi-threaded engagement directive — adopted by 4 reps, protecting €7.3M pipeline", arr_impact: 7300000, date: daysAgo(10).toISOString().split("T")[0] },
        { type: "pattern_identified", description: "Field queries identifying at-risk deals across verticals", arr_impact: 3200000, date: daysAgo(20).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(5),
    },
    {
      memberId: MARCUS,
      dimension: "process_innovation",
      score: 60,
      tier: "growing",
      attributions: [
        { type: "idea_promoted", description: "Multi-threaded stakeholder engagement pattern identified from deal data", arr_impact: 7300000, date: daysAgo(30).toISOString().split("T")[0] },
      ],
      lastContributionAt: daysAgo(10),
    },
  ]);
  console.log("  12 influence scores seeded");

  // ── Market Signals (system_intelligence with insight_type = market_signal) ──
  console.log("Seeding market signals...");

  await db.insert(systemIntelligence).values([
    {
      vertical: "healthcare",
      insightType: "market_signal",
      title: "AI governance board inquiry predicts close",
      insight: "Healthcare prospects who ask about AI governance boards in the first call close at 2.1x the rate of those who don't.",
      supportingData: { sample_size: 8, time_range: "90 days", metric: "2.1x close rate" },
      confidence: "0.82",
      relevanceScore: "0.90",
      status: "active",
    },
    {
      insightType: "market_signal",
      title: "Early CISO involvement accelerates deals",
      insight: "Prospects who involve their CISO before Stage 3 close 55% faster than those who introduce security review later.",
      supportingData: { sample_size: 6, time_range: "60 days", metric: "55% faster close" },
      confidence: "0.78",
      relevanceScore: "0.85",
      status: "active",
    },
    {
      vertical: "financial_services",
      insightType: "market_signal",
      title: "Competitive comparison requests signal incumbent preference",
      insight: "FinServ prospects who request competitive comparisons are 60% likely to go with the incumbent — focus on differentiation, not feature comparison.",
      supportingData: { sample_size: 5, time_range: "90 days", metric: "60% incumbent preference" },
      confidence: "0.71",
      relevanceScore: "0.80",
      status: "active",
    },
    {
      insightType: "market_signal",
      title: "Post-demo response speed predicts close",
      insight: "Prospects whose email response time drops below 24 hours after a demo have 3x the close rate of slower responders.",
      supportingData: { sample_size: 12, time_range: "120 days", metric: "3x close rate" },
      confidence: "0.85",
      relevanceScore: "0.88",
      status: "active",
    },
    {
      vertical: "healthcare",
      insightType: "market_signal",
      title: "Implementation timeline mentions signal readiness",
      insight: "Healthcare buyers mentioning 'implementation timeline' in discovery are signaling readiness — 78% advance to next stage within 2 weeks.",
      supportingData: { sample_size: 7, time_range: "90 days", metric: "78% advance in 2 weeks" },
      confidence: "0.75",
      relevanceScore: "0.82",
      status: "active",
    },
  ]);
  console.log("  5 market signals seeded");

  console.log("Playbook seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

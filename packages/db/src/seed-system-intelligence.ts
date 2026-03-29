import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  console.log("🧠 Seeding system intelligence, manager directives, and closed deals...\n");

  // ── Get team members ──
  const allMembers = await db.select().from(schema.teamMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name);
  const marcus = byName("Marcus Thompson");
  const sarah = byName("Sarah Chen");
  const ryan = byName("Ryan Foster");
  const david = byName("David Park");

  if (!marcus || !sarah || !ryan || !david) {
    console.error("Missing required team members");
    process.exit(1);
  }

  // ══════════════════════════════════════════════
  // PART 1: System Intelligence
  // ══════════════════════════════════════════════
  await db.delete(schema.systemIntelligence);
  console.log("  ✓ Cleared existing system intelligence");

  const insights = [
    // Healthcare (5)
    {
      vertical: "healthcare",
      insightType: "transcript_pattern",
      title: "EU data residency is the #1 objection in Healthcare",
      insight: "EU data residency requirements were raised in 9 of 12 analyzed Healthcare calls this quarter. Reps who addressed data residency proactively during discovery closed deals 2.1x faster than those who waited for the prospect to raise it.",
      supportingData: { sample_size: 12, time_range: "Q1 2026", metric: "Raised in 75% of calls", source_activities: 12 },
      confidence: "0.88",
      relevanceScore: "0.95",
    },
    {
      vertical: "healthcare",
      insightType: "stakeholder_pattern",
      title: "Economic Buyer engagement before Negotiation predicts close rate",
      insight: "Across 8 Healthcare enterprise deals, those where the CFO or budget holder had at least 2 logged touchpoints before entering Negotiation stage closed at a 62% rate. Deals without early EB engagement closed at only 18%.",
      supportingData: { sample_size: 8, time_range: "Last 6 months", metric: "62% vs 18% close rate", source_activities: 34 },
      confidence: "0.82",
      relevanceScore: "0.92",
    },
    {
      vertical: "healthcare",
      insightType: "competitive_pattern",
      title: "Win rate vs Microsoft Copilot in Healthcare: 35%",
      insight: "Microsoft Copilot was flagged as the primary competitor in 6 Healthcare deals. Win rate: 35%. Analysis of won deals shows that leading with compliance positioning (HIPAA, GDPR, data residency) doubles win probability vs Microsoft. Lost deals consistently cited pricing but also had weak compliance differentiation.",
      supportingData: { sample_size: 6, time_range: "Last 2 quarters", metric: "35% win rate, 70% when compliance-led", source_activities: 22 },
      confidence: "0.78",
      relevanceScore: "0.95",
    },
    {
      vertical: "healthcare",
      insightType: "loss_pattern",
      title: "Security review timeline is the top deal killer in Healthcare",
      insight: "3 Healthcare deals lost in Q1 cited security review delays as the primary or secondary reason. Average delay: 6.2 weeks. In each case, the security review was initiated AFTER the proposal was sent. Recommend: propose a parallel security track during discovery, not after.",
      supportingData: { sample_size: 3, time_range: "Q1 2026", metric: "6.2 week avg delay", source_activities: 9 },
      confidence: "0.85",
      relevanceScore: "0.93",
    },
    {
      vertical: "healthcare",
      insightType: "win_pattern",
      title: "Champion-driven CFO engagement closes Healthcare deals 3x faster",
      insight: "2 Healthcare deals (including MedTech Solutions, similar profile to MedVista) closed after the internal champion presented a compliance ROI case directly to the CFO without the vendor in the room. Average time from champion presentation to signed contract: 18 days vs 54 days for rep-driven CFO engagement.",
      supportingData: { sample_size: 2, time_range: "Q1 2026", metric: "18 vs 54 days to close", source_activities: 6 },
      confidence: "0.72",
      relevanceScore: "0.88",
    },
    // FinServ (2)
    {
      vertical: "financial_services",
      insightType: "transcript_pattern",
      title: "SOC 2 Type II is table stakes in FinServ",
      insight: "Every FinServ prospect (8 of 8) asked about SOC 2 Type II in the first meeting. It is no longer a differentiator — it is a prerequisite. Reps who pivot quickly from 'we have SOC 2' to 'here is what we do beyond SOC 2' maintain conversation momentum and reach technical evaluation 40% faster.",
      supportingData: { sample_size: 8, time_range: "Last 2 quarters", metric: "100% ask rate in first meeting", source_activities: 8 },
      confidence: "0.95",
      relevanceScore: "0.85",
    },
    {
      vertical: "financial_services",
      insightType: "velocity_pattern",
      title: "FinServ deals spend 2.3x longer in Proposal than Healthcare",
      insight: "Average time in Proposal stage: FinServ = 28 days, Healthcare = 12 days, Tech = 8 days. The bottleneck is compliance committee review. Deals that provided pre-built compliance documentation packages at the start of Proposal cut this to 16 days.",
      supportingData: { sample_size: 14, time_range: "Last 6 months", metric: "28 days avg in Proposal", comparison: "vs 12 days Healthcare" },
      confidence: "0.80",
      relevanceScore: "0.88",
    },
    // Tech (1)
    {
      vertical: "technology",
      insightType: "stakeholder_pattern",
      title: "Multi-threading is the strongest predictor of Tech deal velocity",
      insight: "Tech deals with 3+ stakeholder contacts engaged before Demo stage close 2.8x faster than single-threaded deals. Engineering leaders are the strongest champions but rarely have budget authority — always identify and engage the VP or Director with P&L ownership alongside the technical champion.",
      supportingData: { sample_size: 6, time_range: "Last 2 quarters", metric: "2.8x faster with 3+ stakeholders", source_activities: 28 },
      confidence: "0.85",
      relevanceScore: "0.90",
    },
    // Org-wide (2)
    {
      vertical: null,
      insightType: "meddpicc_pattern",
      title: "Weak Decision Process scores predict stalled deals",
      insight: "Across all verticals, deals where the Decision Process MEDDPICC score was below 40% at the Proposal stage had a 73% chance of stalling for 30+ days. The most common missing element: the rep could not articulate the customer's internal approval workflow. Ask early: 'Walk me through what happens after you decide you want to move forward.'",
      supportingData: { sample_size: 18, time_range: "Last 6 months", metric: "73% stall rate when DP < 40%", source_activities: 18 },
      confidence: "0.88",
      relevanceScore: "0.91",
    },
    {
      vertical: null,
      insightType: "process_insight",
      title: "Follow-up speed after demo is the #1 controllable conversion factor",
      insight: "Deals where the rep sent a follow-up email within 2 hours of the demo converted from Demo to Proposal at 78%. Deals with a follow-up delay over 24 hours converted at only 34%. This pattern is consistent across all verticals and deal sizes.",
      supportingData: { sample_size: 22, time_range: "Last 6 months", metric: "78% vs 34% conversion rate", source_activities: 22 },
      confidence: "0.90",
      relevanceScore: "0.94",
    },
  ];

  for (const ins of insights) {
    await db.insert(schema.systemIntelligence).values({
      vertical: ins.vertical,
      insightType: ins.insightType,
      title: ins.title,
      insight: ins.insight,
      supportingData: ins.supportingData,
      confidence: ins.confidence,
      relevanceScore: ins.relevanceScore,
      status: "active",
    });
  }
  console.log(`  ✓ Inserted ${insights.length} system intelligence records`);

  // ══════════════════════════════════════════════
  // PART 2: Manager Directives
  // ══════════════════════════════════════════════
  await db.delete(schema.managerDirectives);
  console.log("\n  ✓ Cleared existing manager directives");

  const directives = [
    {
      authorId: marcus.id,
      scope: "org_wide",
      directive: "No discounts exceeding 10% without written VP approval before presenting to the customer. This is non-negotiable for Q2.",
      priority: "mandatory",
      category: "pricing",
    },
    {
      authorId: marcus.id,
      scope: "org_wide",
      directive: "Every deal entering Proposal stage must have at least 2 stakeholder contacts engaged. Single-threaded deals should not advance past Discovery without a documented multi-threading plan.",
      priority: "strong",
      category: "process",
    },
    {
      authorId: marcus.id,
      scope: "org_wide",
      directive: "Lead with business outcomes and ROI, not feature lists. Our differentiation is intelligence, not functionality. Every call prep should include a quantified value proposition specific to the prospect's industry.",
      priority: "guidance",
      category: "messaging",
    },
    {
      authorId: marcus.id,
      scope: "vertical",
      vertical: "healthcare",
      directive: "Compliance positioning is our #1 competitive differentiator in Healthcare. Every Healthcare call prep must include compliance talking points. EU data residency, HIPAA, and AI review board readiness should be covered in the first 10 minutes of discovery calls.",
      priority: "strong",
      category: "positioning",
    },
    {
      authorId: marcus.id,
      scope: "vertical",
      vertical: "financial_services",
      directive: "All FinServ deals require a security documentation package delivered within 48 hours of first meeting. Do not wait for the prospect to request it. Proactively send SOC 2 Type II certificate, latest penetration test summary, and data handling policies.",
      priority: "mandatory",
      category: "process",
    },
    {
      authorId: marcus.id,
      scope: "vertical",
      vertical: "general",
      directive: "Government deals require minimum 6-month timeline assumptions. Do not promise delivery dates shorter than 6 months without consulting James Wilson. Budget cycles are annual — confirm the fiscal year alignment in the first call.",
      priority: "strong",
      category: "process",
    },
  ];

  for (const dir of directives) {
    await db.insert(schema.managerDirectives).values({
      authorId: dir.authorId,
      scope: dir.scope,
      vertical: dir.vertical || null,
      directive: dir.directive,
      priority: dir.priority,
      category: dir.category,
      isActive: true,
    });
  }
  console.log(`  ✓ Inserted ${directives.length} manager directives`);

  // ══════════════════════════════════════════════
  // PART 3: Closed Deals (seeded with outcome data)
  // ══════════════════════════════════════════════
  console.log("\n📊 Seeding closed deals...");

  // Get companies for reference — we need to create new ones for closed deals
  const existingCompanies = await db.select().from(schema.companies);

  // Create companies for closed deals
  const closedCompanies = [
    { name: "NordicCare Health", domain: "nordicarehealth.eu", industry: "healthcare" as const, employeeCount: 1800, annualRevenue: "€320M", hqLocation: "Copenhagen, Denmark", description: "Nordic healthcare network with 8 facilities" },
    { name: "Pacific Financial Group", domain: "pacificfinancial.com", industry: "financial_services" as const, employeeCount: 3200, annualRevenue: "€1.2B", hqLocation: "London, UK", description: "Pan-European financial advisory" },
    { name: "HealthBridge Medical", domain: "healthbridge.de", industry: "healthcare" as const, employeeCount: 950, annualRevenue: "€180M", hqLocation: "Berlin, Germany", description: "Digital health platform for telemedicine" },
    { name: "MedTech Solutions", domain: "medtechsol.eu", industry: "healthcare" as const, employeeCount: 2200, annualRevenue: "€400M", hqLocation: "Zurich, Switzerland", description: "Medical technology and clinical operations software" },
    { name: "Alpine Wealth Advisors", domain: "alpinewealth.ch", industry: "financial_services" as const, employeeCount: 450, annualRevenue: "€85M", hqLocation: "Geneva, Switzerland", description: "Private wealth management and advisory" },
  ];

  // Skip already-existing companies
  const newCompanies = closedCompanies.filter((c) => !existingCompanies.some((e) => e.name === c.name));
  const companyIds: Record<string, string> = {};

  for (const comp of newCompanies) {
    const [inserted] = await db.insert(schema.companies).values(comp).returning({ id: schema.companies.id });
    companyIds[comp.name] = inserted.id;
  }
  for (const e of existingCompanies) {
    companyIds[e.name] = e.id;
  }
  console.log(`  ✓ Created ${newCompanies.length} companies for closed deals`);

  // Create closed deals
  const closedDeals = [
    // Closed-Lost
    {
      name: "NordicCare — Claude Enterprise for Patient Records",
      companyId: companyIds["NordicCare Health"]!,
      assignedAeId: ryan.id,
      stage: "closed_lost" as const,
      dealValue: "1800000",
      vertical: "healthcare" as const,
      product: "claude_enterprise" as const,
      competitor: "Microsoft Copilot",
      lossReason: "security_compliance",
      closeCompetitor: "Microsoft Copilot",
      closeNotes: "Security review started in week 8 of a 10-week cycle. Compliance team could not complete review before fiscal year deadline. Microsoft offered a pre-certified package.",
      closeImprovement: "started_security_earlier",
      closedAt: daysAgo(28),
      closeDate: daysAgo(28),
      winProbability: 0,
      forecastCategory: "closed" as const,
    },
    {
      name: "Pacific Financial — Claude API for Risk Analysis",
      companyId: companyIds["Pacific Financial Group"]!,
      assignedAeId: david.id,
      stage: "closed_lost" as const,
      dealValue: "950000",
      vertical: "financial_services" as const,
      product: "claude_api" as const,
      competitor: "Microsoft Copilot",
      lossReason: "pricing",
      closeCompetitor: "Microsoft Copilot",
      closeNotes: "Microsoft undercut by 35%. We led with features instead of compliance differentiation. By the time we pivoted to compliance advantage, procurement had already shortlisted Microsoft.",
      closeImprovement: "addressed_pricing_earlier",
      closedAt: daysAgo(42),
      closeDate: daysAgo(42),
      winProbability: 0,
      forecastCategory: "closed" as const,
    },
    {
      name: "HealthBridge — Claude Team for Telemedicine",
      companyId: companyIds["HealthBridge Medical"]!,
      assignedAeId: sarah.id,
      stage: "closed_lost" as const,
      dealValue: "1200000",
      vertical: "healthcare" as const,
      product: "claude_team" as const,
      lossReason: "no_decision",
      closeNotes: "Champion was strong but could never get CFO meeting. Single-threaded through VP of Engineering. CFO eventually deprioritized the initiative.",
      closeImprovement: "engaged_exec_sooner",
      closedAt: daysAgo(14),
      closeDate: daysAgo(14),
      winProbability: 0,
      forecastCategory: "closed" as const,
    },
    // Closed-Won
    {
      name: "MedTech — Claude Enterprise for Clinical Ops",
      companyId: companyIds["MedTech Solutions"]!,
      assignedAeId: ryan.id,
      stage: "closed_won" as const,
      dealValue: "2100000",
      vertical: "healthcare" as const,
      product: "claude_enterprise" as const,
      winTurningPoint: "champion_sold_internally",
      winReplicable: "Champion (Dir of Clinical Ops) built a compliance ROI deck using our data residency docs and presented directly to CFO without us in the room. CFO approved budget within a week. Key: arm the champion with materials, do not try to sell the CFO yourself.",
      closedAt: daysAgo(21),
      closeDate: daysAgo(21),
      winProbability: 100,
      forecastCategory: "closed" as const,
    },
    {
      name: "Alpine Wealth — Claude API for Portfolio Analysis",
      companyId: companyIds["Alpine Wealth Advisors"]!,
      assignedAeId: david.id,
      stage: "closed_won" as const,
      dealValue: "780000",
      vertical: "financial_services" as const,
      product: "claude_api" as const,
      winTurningPoint: "compliance_advantage",
      winReplicable: "Led with SOC 2 plus private cloud deployment option in the very first meeting. Competitor could not match. By meeting two, compliance was off the table and we were discussing implementation timeline. Speed to compliance equals speed to close.",
      closedAt: daysAgo(35),
      closeDate: daysAgo(35),
      winProbability: 100,
      forecastCategory: "closed" as const,
    },
  ];

  // Skip already-existing deals
  const existingDeals = await db.select({ name: schema.deals.name }).from(schema.deals);
  const existingDealNames = new Set(existingDeals.map((d) => d.name));

  for (const deal of closedDeals) {
    if (existingDealNames.has(deal.name)) continue;
    await db.insert(schema.deals).values(deal);
  }
  console.log(`  ✓ Seeded ${closedDeals.length} closed deals`);

  console.log("\n✅ System intelligence seed complete!");
  process.exit(0);
}

seed().catch(console.error);

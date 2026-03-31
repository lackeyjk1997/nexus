import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, and, inArray } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsFromNow(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

// ── Deal IDs to KEEP ──
const KEEP_DEAL_NAMES = [
  "MedVista",
  "HealthFirst",
  "TrustBank",
  "PharmaBridge",
  "NordicCare — Claude Enterprise for Patient Records",
  "NordicCare — Claude API Integration",
  "HealthBridge",
  "MedTech",
];

async function run() {
  console.log("🔧 Final Demo Polish — Data Cleanup\n");

  // ── Step 0: Get team member IDs ──
  const allMembers = await db.select().from(schema.teamMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name);

  const sarahChen = byName("Sarah Chen")!;
  const davidPark = byName("David Park")!;
  const ryanFoster = byName("Ryan Foster")!;
  const marcusThompson = byName("Marcus Thompson")!;

  // ── Step 1a: Find deals to keep and delete ──
  const allDeals = await db.select().from(schema.deals);

  const keepDealIds = new Set<string>();
  for (const deal of allDeals) {
    if (KEEP_DEAL_NAMES.some((name) => deal.name.includes(name))) {
      keepDealIds.add(deal.id);
    }
  }

  const dealsToDelete = allDeals.filter((d) => !keepDealIds.has(d.id));
  console.log(`Keeping ${keepDealIds.size} deals, deleting ${dealsToDelete.length}\n`);

  // ── Step 1h: Reset MedVista to Discovery stage for demo flow ──
  console.log("── Resetting MedVista to Discovery ──");
  const medvista = allDeals.find((d) => d.name.includes("MedVista"));
  if (medvista) {
    await db
      .update(schema.deals)
      .set({
        stage: "discovery",
        winProbability: 25,
        closeCompetitor: null,
        closeNotes: null,
        closeImprovement: null,
        winTurningPoint: null,
        winReplicable: null,
        closedAt: null,
        closeAiAnalysis: null,
        closeFactors: null,
        winFactors: null,
        closeAiRanAtTimestamp: null,
      })
      .where(eq(schema.deals.id, medvista.id));
    console.log("  ✓ MedVista reset to discovery");

    // Delete close-related activities
    await db.execute(sql`
      DELETE FROM activities
      WHERE deal_id = ${medvista.id}
      AND (subject ILIKE '%close%lost%' OR subject ILIKE '%field intel%close%')
      AND created_at > '2026-03-28'
    `);
  } else {
    console.log("  ⚠ MedVista not found");
  }

  // ── Step 1e: Delete non-keeper deals and all related records ──
  console.log("\n── Deleting non-keeper deals ──");
  for (const deal of dealsToDelete) {
    // 1. field_query_questions
    await db.delete(schema.fieldQueryQuestions).where(eq(schema.fieldQueryQuestions.dealId, deal.id));

    // 2. activities
    await db.delete(schema.activities).where(eq(schema.activities.dealId, deal.id));

    // 3. deal_milestones
    await db.delete(schema.dealMilestones).where(eq(schema.dealMilestones.dealId, deal.id));

    // 4. deal_stage_history
    await db.delete(schema.dealStageHistory).where(eq(schema.dealStageHistory.dealId, deal.id));

    // 5. meddpicc_fields
    await db.delete(schema.meddpiccFields).where(eq(schema.meddpiccFields.dealId, deal.id));

    // 6. lead_scores
    await db.delete(schema.leadScores).where(eq(schema.leadScores.dealId, deal.id));

    // 7. email_sequences (and steps)
    const seqs = await db.select({ id: schema.emailSequences.id }).from(schema.emailSequences).where(eq(schema.emailSequences.dealId, deal.id));
    for (const seq of seqs) {
      await db.delete(schema.emailSteps).where(eq(schema.emailSteps.sequenceId, seq.id));
    }
    await db.delete(schema.emailSequences).where(eq(schema.emailSequences.dealId, deal.id));

    // 8. call_transcripts (and analyses)
    const txs = await db.select({ id: schema.callTranscripts.id }).from(schema.callTranscripts).where(eq(schema.callTranscripts.dealId, deal.id));
    for (const tx of txs) {
      await db.delete(schema.callAnalyses).where(eq(schema.callAnalyses.transcriptId, tx.id));
    }
    await db.delete(schema.callTranscripts).where(eq(schema.callTranscripts.dealId, deal.id));

    // 9. notifications
    await db.delete(schema.notifications).where(eq(schema.notifications.dealId, deal.id));

    // 10. Unlink observations (don't delete them)
    await db.execute(sql`
      UPDATE observations
      SET linked_deal_ids = array_remove(linked_deal_ids, ${deal.id}::uuid)
      WHERE ${deal.id}::uuid = ANY(linked_deal_ids)
    `);
    await db.execute(sql`
      UPDATE observations
      SET source_context = source_context - 'dealId'
      WHERE source_context->>'dealId' = ${deal.id}
    `);

    // 11. cross_agent_feedback
    await db.delete(schema.crossAgentFeedback).where(eq(schema.crossAgentFeedback.dealId, deal.id));

    // 12. Delete the deal
    await db.delete(schema.deals).where(eq(schema.deals.id, deal.id));

    console.log(`  ✓ Deleted: ${deal.name}`);
  }

  // Delete companies that have no remaining deals
  const remainingDealCompanyIds = (await db.select({ companyId: schema.deals.companyId }).from(schema.deals)).map((d) => d.companyId);
  const remainingCompanyIdSet = new Set(remainingDealCompanyIds);

  const allCompanies = await db.select().from(schema.companies);
  for (const company of allCompanies) {
    if (!remainingCompanyIdSet.has(company.id)) {
      // Delete email sequences referencing contacts from this company
      const companyContacts = await db.select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.companyId, company.id));
      for (const contact of companyContacts) {
        const contactSeqs = await db.select({ id: schema.emailSequences.id }).from(schema.emailSequences).where(eq(schema.emailSequences.contactId, contact.id));
        for (const seq of contactSeqs) {
          await db.delete(schema.emailSteps).where(eq(schema.emailSteps.sequenceId, seq.id));
        }
        await db.delete(schema.emailSequences).where(eq(schema.emailSequences.contactId, contact.id));
      }
      // Delete contacts for this company
      await db.delete(schema.contacts).where(eq(schema.contacts.companyId, company.id));
      // Delete lead scores for this company
      await db.delete(schema.leadScores).where(eq(schema.leadScores.companyId, company.id));
      // Unlink observations from this company
      await db.execute(sql`
        UPDATE observations
        SET linked_account_ids = array_remove(linked_account_ids, ${company.id}::uuid)
        WHERE ${company.id}::uuid = ANY(linked_account_ids)
      `);
      // Delete the company
      await db.delete(schema.companies).where(eq(schema.companies.id, company.id));
      console.log(`  ✓ Deleted company: ${company.name}`);
    }
  }

  // ── Step 1b: CREATE Ryan Foster's NordicMed deal ──
  console.log("\n── Creating NordicMed Group deal for Ryan Foster ──");

  const [nordicmedCompany] = await db
    .insert(schema.companies)
    .values({
      name: "NordicMed Group",
      domain: "nordicmed.com",
      industry: "healthcare",
      employeeCount: 2800,
      annualRevenue: "€450M",
      hqLocation: "Stockholm, Sweden",
      description: "Scandinavian healthcare technology group operating 12 hospitals and 40 clinics across the Nordics",
    })
    .returning();

  const [nordicmedDeal] = await db
    .insert(schema.deals)
    .values({
      name: "NordicMed Group — Clinical AI Platform",
      companyId: nordicmedCompany!.id,
      stage: "proposal",
      dealValue: "1600000",
      currency: "EUR",
      vertical: "healthcare",
      assignedAeId: ryanFoster.id,
      winProbability: 55,
      closeDate: monthsFromNow(3),
      competitor: "Microsoft Copilot",
      forecastCategory: "upside",
      leadSource: "inbound",
      product: "claude_enterprise",
    })
    .returning();

  // Contacts
  const nordicmedContacts = await db
    .insert(schema.contacts)
    .values([
      {
        firstName: "Lars",
        lastName: "Eriksson",
        title: "Chief Medical Officer",
        email: "l.eriksson@nordicmed.com",
        companyId: nordicmedCompany!.id,
        roleInDeal: "champion",
        isPrimary: true,
      },
      {
        firstName: "Katarina",
        lastName: "Holm",
        title: "VP IT Infrastructure",
        email: "k.holm@nordicmed.com",
        companyId: nordicmedCompany!.id,
        roleInDeal: "technical_evaluator",
      },
      {
        firstName: "Anders",
        lastName: "Björk",
        title: "CFO",
        email: "a.bjork@nordicmed.com",
        companyId: nordicmedCompany!.id,
        roleInDeal: "economic_buyer",
      },
    ])
    .returning();

  // MEDDPICC
  await db.insert(schema.meddpiccFields).values({
    dealId: nordicmedDeal!.id,
    metrics: "Target: 35% reduction in clinical documentation time across 12 hospitals",
    metricsConfidence: 70,
    economicBuyer: "Anders Björk, CFO — engaged but cautious about implementation costs",
    economicBuyerConfidence: 55,
    decisionCriteria: "EU data residency, multi-language support, EHR integration, GDPR compliance",
    decisionCriteriaConfidence: 75,
    decisionProcess: "CMO recommendation → IT security review → CFO approval → board vote",
    decisionProcessConfidence: 60,
    identifyPain: "Physicians spending 3+ hours/day on documentation, highest turnover in 5 years",
    identifyPainConfidence: 85,
    champion: "Dr. Eriksson — personally experienced documentation burden, presenting to board",
    championConfidence: 75,
    competition: "Microsoft Copilot in evaluation — Eriksson prefers Claude for healthcare specificity",
    competitionConfidence: 65,
  });

  // Activities
  await db.insert(schema.activities).values([
    {
      dealId: nordicmedDeal!.id,
      teamMemberId: ryanFoster.id,
      type: "call_completed",
      subject: "Discovery — Clinical Documentation Crisis",
      description: "Deep dive into documentation burden across 12 hospitals. Physicians reporting 3+ hours/day on paperwork. CMO personally frustrated. Identified key pain points in EHR workflow.",
      metadata: { callQualityScore: 78 },
      createdAt: daysAgo(30),
    },
    {
      dealId: nordicmedDeal!.id,
      teamMemberId: ryanFoster.id,
      type: "email_sent",
      subject: "Follow-up: ROI model for NordicMed documentation automation",
      description: "Sent customized ROI model showing projected 35% reduction in documentation time. Included case study from similar-sized healthcare network.",
      createdAt: daysAgo(22),
    },
    {
      dealId: nordicmedDeal!.id,
      teamMemberId: ryanFoster.id,
      type: "call_completed",
      subject: "Technical deep dive with IT team",
      description: "Katarina Holm led the session. Discussed EHR integration requirements, multi-language support for Swedish/Norwegian/Danish. IT team impressed with API architecture.",
      metadata: { callQualityScore: 81 },
      createdAt: daysAgo(15),
    },
    {
      dealId: nordicmedDeal!.id,
      teamMemberId: ryanFoster.id,
      type: "meeting_completed",
      subject: "Proposal presentation to CMO and CFO",
      description: "Presented full proposal to Dr. Eriksson and Anders Björk. CFO cautious on implementation timeline and costs. CMO enthusiastic. CFO requested competitive comparison with Microsoft Copilot.",
      createdAt: daysAgo(10),
    },
    {
      dealId: nordicmedDeal!.id,
      teamMemberId: ryanFoster.id,
      type: "note_added",
      subject: "CFO wants competitive comparison with Copilot before board presentation",
      description: "Anders Björk explicitly asked for a side-by-side comparison with Microsoft Copilot. Needs to present business case to board. Timeline: 3 weeks to board meeting.",
      createdAt: daysAgo(5),
    },
  ]);

  // Observation linked to NordicMed
  await db.insert(schema.observations).values({
    observerId: ryanFoster.id,
    rawInput: "NordicMed's CFO keeps comparing our pricing to Microsoft Copilot. Third healthcare prospect this quarter asking for competitive pricing analysis.",
    sourceContext: { dealId: nordicmedDeal!.id },
    linkedDealIds: [nordicmedDeal!.id],
    linkedAccountIds: [nordicmedCompany!.id],
    status: "submitted",
  });

  // Lead score
  await db.insert(schema.leadScores).values({
    companyId: nordicmedCompany!.id,
    dealId: nordicmedDeal!.id,
    score: 78,
    icpMatchPct: 88,
    engagementScore: 65,
    intentScore: 55,
  });

  // Deal milestones
  const milestoneKeys = [
    "first_meeting", "pain_identified", "champion_engaged",
    "decision_criteria_confirmed", "proposal_delivered", "verbal_agreement", "contract_signed",
  ];
  await db.insert(schema.dealMilestones).values(
    milestoneKeys.map((key, i) => ({
      dealId: nordicmedDeal!.id,
      milestoneKey: key,
      isCompleted: i < 5,
      completedAt: i < 5 ? daysAgo(30 - i * 5) : null,
      source: "manual" as const,
    }))
  );

  // Stage history
  await db.insert(schema.dealStageHistory).values([
    { dealId: nordicmedDeal!.id, fromStage: null, toStage: "new_lead", changedBy: "human" as const, reason: "Inbound lead from HIMSS conference" },
    { dealId: nordicmedDeal!.id, fromStage: "new_lead", toStage: "qualified", changedBy: "human" as const, reason: "CMO confirmed pain and budget" },
    { dealId: nordicmedDeal!.id, fromStage: "qualified", toStage: "discovery", changedBy: "human" as const, reason: "Discovery call completed" },
    { dealId: nordicmedDeal!.id, fromStage: "discovery", toStage: "technical_validation", changedBy: "human" as const, reason: "IT team deep dive scheduled" },
    { dealId: nordicmedDeal!.id, fromStage: "technical_validation", toStage: "proposal", changedBy: "human" as const, reason: "Proposal delivered to CMO and CFO" },
  ]);

  console.log("  ✓ Created NordicMed Group deal with contacts, MEDDPICC, activities, milestones");

  // ── Step 1c: CREATE David Park's Atlas Capital deal ──
  console.log("\n── Creating Atlas Capital deal for David Park ──");

  const [atlasCompany] = await db
    .insert(schema.companies)
    .values({
      name: "Atlas Capital Partners",
      domain: "atlascapital.com",
      industry: "financial_services",
      employeeCount: 450,
      annualRevenue: "$2.1B AUM",
      hqLocation: "New York, NY",
      description: "Mid-market private equity firm managing $2.1B in assets across technology and healthcare sectors",
    })
    .returning();

  const [atlasDeal] = await db
    .insert(schema.deals)
    .values({
      name: "Atlas Capital — Risk Analytics Platform",
      companyId: atlasCompany!.id,
      stage: "negotiation",
      dealValue: "580000",
      currency: "EUR",
      vertical: "financial_services",
      assignedAeId: davidPark.id,
      winProbability: 40,
      closeDate: monthsFromNow(2),
      competitor: "CompetitorX",
      forecastCategory: "upside",
      leadSource: "outbound",
      product: "claude_api",
    })
    .returning();

  // Contacts
  await db.insert(schema.contacts).values([
    {
      firstName: "James",
      lastName: "Chen",
      title: "VP Risk Analytics",
      email: "j.chen@atlascapital.com",
      companyId: atlasCompany!.id,
      roleInDeal: "champion",
      isPrimary: true,
    },
    {
      firstName: "Maria",
      lastName: "Santos",
      title: "CFO",
      email: "m.santos@atlascapital.com",
      companyId: atlasCompany!.id,
      roleInDeal: "economic_buyer",
    },
  ]);

  // MEDDPICC
  await db.insert(schema.meddpiccFields).values({
    dealId: atlasDeal!.id,
    metrics: "Target: 50% faster risk assessment turnaround, $2M annual savings",
    metricsConfidence: 65,
    economicBuyer: "Maria Santos, CFO — budget approved but hesitant on timeline",
    economicBuyerConfidence: 50,
    decisionCriteria: "SOC 2 Type II, real-time processing, integration with Bloomberg terminal",
    decisionCriteriaConfidence: 80,
    decisionProcess: "VP Risk recommendation → compliance review → CFO sign-off",
    decisionProcessConfidence: 70,
    identifyPain: "Risk assessments taking 5 days, competitors doing it in 2",
    identifyPainConfidence: 90,
    champion: "James Chen — frustrated with current tools, wants to modernize",
    championConfidence: 70,
    competition: "CompetitorX offered 30% lower pricing with a free 90-day pilot",
    competitionConfidence: 85,
  });

  // Activities
  await db.insert(schema.activities).values([
    {
      dealId: atlasDeal!.id,
      teamMemberId: davidPark.id,
      type: "call_completed",
      subject: "Discovery — Risk Analytics Pain Points",
      description: "James Chen walked us through their current risk assessment workflow. Taking 5 days per assessment, competitors at 2. Bloomberg integration critical. Strong pain, clear budget.",
      metadata: { callQualityScore: 74 },
      createdAt: daysAgo(25),
    },
    {
      dealId: atlasDeal!.id,
      teamMemberId: davidPark.id,
      type: "meeting_completed",
      subject: "Technical demo with risk team",
      description: "Demoed real-time risk scoring with Bloomberg data feed. Team impressed with latency. James very engaged. Maria Santos (CFO) joined for last 15 minutes.",
      createdAt: daysAgo(18),
    },
    {
      dealId: atlasDeal!.id,
      teamMemberId: davidPark.id,
      type: "competitive_intel",
      subject: "CompetitorX dropped pricing by 30% and offered free pilot",
      description: "James mentioned CompetitorX came back with 30% lower pricing and a free 90-day pilot. Maria wants to see pilot results before committing. We need to counter with value positioning.",
      createdAt: daysAgo(10),
    },
    {
      dealId: atlasDeal!.id,
      teamMemberId: davidPark.id,
      type: "note_added",
      subject: "James pushing internally but CFO wants to see CompetitorX pilot results first",
      description: "James is our champion but CFO Maria Santos wants to evaluate CompetitorX pilot results before final decision. Need to accelerate our technical differentiation story.",
      createdAt: daysAgo(5),
    },
  ]);

  // Observation linked to Atlas Capital
  await db.insert(schema.observations).values({
    observerId: davidPark.id,
    rawInput: "Atlas Capital mentioned CompetitorX dropped their price by 30%. Third time I've heard this in finserv this quarter.",
    sourceContext: { dealId: atlasDeal!.id },
    linkedDealIds: [atlasDeal!.id],
    linkedAccountIds: [atlasCompany!.id],
    status: "submitted",
  });

  // Lead score
  await db.insert(schema.leadScores).values({
    companyId: atlasCompany!.id,
    dealId: atlasDeal!.id,
    score: 72,
    icpMatchPct: 76,
    engagementScore: 60,
    intentScore: 70,
  });

  // Deal milestones
  await db.insert(schema.dealMilestones).values(
    milestoneKeys.map((key, i) => ({
      dealId: atlasDeal!.id,
      milestoneKey: key,
      isCompleted: i < 4,
      completedAt: i < 4 ? daysAgo(25 - i * 5) : null,
      source: "manual" as const,
    }))
  );

  // Stage history
  await db.insert(schema.dealStageHistory).values([
    { dealId: atlasDeal!.id, fromStage: null, toStage: "new_lead", changedBy: "human" as const, reason: "Outbound prospecting" },
    { dealId: atlasDeal!.id, fromStage: "new_lead", toStage: "qualified", changedBy: "human" as const, reason: "Budget confirmed" },
    { dealId: atlasDeal!.id, fromStage: "qualified", toStage: "discovery", changedBy: "human" as const, reason: "Discovery call completed" },
    { dealId: atlasDeal!.id, fromStage: "discovery", toStage: "technical_validation", changedBy: "human" as const, reason: "Technical demo delivered" },
    { dealId: atlasDeal!.id, fromStage: "technical_validation", toStage: "negotiation", changedBy: "human" as const, reason: "Pricing discussions started" },
  ]);

  console.log("  ✓ Created Atlas Capital deal with contacts, MEDDPICC, activities, milestones");

  // ── Step 1d: Fill gaps on closed deals ──
  console.log("\n── Filling gaps on closed deals ──");

  // HealthBridge — add contacts, activities, MEDDPICC
  const healthbridge = allDeals.find((d) => d.name.includes("HealthBridge"));
  if (healthbridge) {
    // Check if contacts exist for HealthBridge company
    const existingContacts = await db.select().from(schema.contacts).where(eq(schema.contacts.companyId, healthbridge.companyId));
    if (existingContacts.length === 0) {
      await db.insert(schema.contacts).values([
        {
          firstName: "Sarah",
          lastName: "Park",
          title: "VP Digital Health",
          email: "s.park@healthbridge.com",
          companyId: healthbridge.companyId,
          roleInDeal: "champion",
          isPrimary: true,
        },
        {
          firstName: "Michael",
          lastName: "Torres",
          title: "CTO",
          email: "m.torres@healthbridge.com",
          companyId: healthbridge.companyId,
          roleInDeal: "technical_evaluator",
        },
      ]);
      console.log("  ✓ Added HealthBridge contacts");
    }

    // Add activities if missing
    const hbActivities = await db.select().from(schema.activities).where(eq(schema.activities.dealId, healthbridge.id));
    if (hbActivities.length < 2) {
      await db.insert(schema.activities).values([
        {
          dealId: healthbridge.id,
          teamMemberId: sarahChen.id,
          type: "call_completed",
          subject: "Discovery — Telemedicine Platform Requirements",
          description: "Initial discovery with Dr. Sarah Park. Strong enthusiasm for AI-powered telemedicine triage. Budget exists but no timeline. Single-threaded through Dr. Park.",
          metadata: { callQualityScore: 65 },
          createdAt: daysAgo(60),
        },
        {
          dealId: healthbridge.id,
          teamMemberId: sarahChen.id,
          type: "email_sent",
          subject: "Follow-up with Dr. Park on integration requirements",
          description: "Sent integration architecture document and reference customer details. Awaiting feedback on technical requirements.",
          createdAt: daysAgo(45),
        },
        {
          dealId: healthbridge.id,
          teamMemberId: sarahChen.id,
          type: "note_added",
          subject: "Champion left company — deal at risk",
          description: "Dr. Sarah Park resigned from HealthBridge. No identified replacement champion. Deal is single-threaded and now orphaned.",
          createdAt: daysAgo(30),
        },
        {
          dealId: healthbridge.id,
          teamMemberId: sarahChen.id,
          type: "email_sent",
          subject: "Re-engagement attempt with CTO",
          description: "Reached out to Michael Torres (CTO) to re-establish connection. No response after 10 days.",
          createdAt: daysAgo(20),
        },
      ]);
      console.log("  ✓ Added HealthBridge activities");
    }

    // Add MEDDPICC if missing
    const hbMeddpicc = await db.select().from(schema.meddpiccFields).where(eq(schema.meddpiccFields.dealId, healthbridge.id));
    if (hbMeddpicc.length === 0) {
      await db.insert(schema.meddpiccFields).values({
        dealId: healthbridge.id,
        metrics: "Target: 30% reduction in telemedicine wait times",
        metricsConfidence: 40,
        economicBuyer: "Unknown — never identified real budget holder",
        economicBuyerConfidence: 15,
        identifyPain: "Long telemedicine wait times driving patient complaints",
        identifyPainConfidence: 60,
        champion: "Dr. Sarah Park — left mid-cycle, single-threaded",
        championConfidence: 25,
        competition: "No active competitor — deal died from inaction",
        competitionConfidence: 20,
      });
      console.log("  ✓ Added HealthBridge MEDDPICC");
    }
  }

  // MedTech — add contacts, activities, MEDDPICC
  const medtech = allDeals.find((d) => d.name.includes("MedTech"));
  if (medtech) {
    const existingContacts = await db.select().from(schema.contacts).where(eq(schema.contacts.companyId, medtech.companyId));
    if (existingContacts.length === 0) {
      await db.insert(schema.contacts).values([
        {
          firstName: "Jennifer",
          lastName: "Walsh",
          title: "VP Clinical Operations",
          email: "j.walsh@medtech.com",
          companyId: medtech.companyId,
          roleInDeal: "champion",
          isPrimary: true,
        },
        {
          firstName: "Robert",
          lastName: "Chang",
          title: "CFO",
          email: "r.chang@medtech.com",
          companyId: medtech.companyId,
          roleInDeal: "economic_buyer",
        },
      ]);
      console.log("  ✓ Added MedTech contacts");
    }

    const mtActivities = await db.select().from(schema.activities).where(eq(schema.activities.dealId, medtech.id));
    if (mtActivities.length < 2) {
      await db.insert(schema.activities).values([
        {
          dealId: medtech.id,
          teamMemberId: ryanFoster.id,
          type: "call_completed",
          subject: "Discovery — Clinical Ops Pain Points",
          description: "Jennifer Walsh shared frustrations with documentation overhead. Physicians spending 40% of time on paperwork. Clear budget authority through Robert Chang.",
          metadata: { callQualityScore: 82 },
          createdAt: daysAgo(45),
        },
        {
          dealId: medtech.id,
          teamMemberId: ryanFoster.id,
          type: "call_completed",
          subject: "Technical Deep Dive — EHR Integration",
          description: "Detailed integration architecture review. IT team confirmed compatibility. Jennifer Walsh building internal ROI case for board presentation.",
          metadata: { callQualityScore: 88 },
          createdAt: daysAgo(35),
        },
        {
          dealId: medtech.id,
          teamMemberId: ryanFoster.id,
          type: "meeting_completed",
          subject: "ROI Presentation to CFO",
          description: "Presented ROI model to Robert Chang. He challenged assumptions but agreed pilot results were compelling. Jennifer Walsh supporting internally.",
          createdAt: daysAgo(25),
        },
        {
          dealId: medtech.id,
          teamMemberId: ryanFoster.id,
          type: "note_added",
          subject: "Pilot results exceeded targets — 45% documentation reduction",
          description: "Pilot completed with 45% reduction in documentation time vs. 35% target. $890K projected annual savings. Jennifer Walsh presenting to board next week.",
          createdAt: daysAgo(15),
        },
      ]);
      console.log("  ✓ Added MedTech activities");
    }

    const mtMeddpicc = await db.select().from(schema.meddpiccFields).where(eq(schema.meddpiccFields.dealId, medtech.id));
    if (mtMeddpicc.length === 0) {
      await db.insert(schema.meddpiccFields).values({
        dealId: medtech.id,
        metrics: "45% reduction in documentation time, $890K annual savings",
        metricsConfidence: 90,
        economicBuyer: "Robert Chang, CFO — approved after seeing pilot ROI",
        economicBuyerConfidence: 90,
        decisionCriteria: "EHR integration, documentation time reduction, HIPAA compliance",
        decisionCriteriaConfidence: 85,
        decisionProcess: "VP Clinical Ops → CFO approval → board vote",
        decisionProcessConfidence: 80,
        identifyPain: "Physicians spending 40% of time on documentation, burnout driving turnover",
        identifyPainConfidence: 95,
        champion: "Jennifer Walsh — drove internal adoption, presented ROI deck to board",
        championConfidence: 95,
        competition: "No active competitor — won on compliance and champion strength",
        competitionConfidence: 50,
      });
      console.log("  ✓ Added MedTech MEDDPICC");
    }
  }

  // NordicCare Patient Records — add contacts
  const nordicarePatient = allDeals.find((d) => d.name.includes("NordicCare") && d.name.includes("Patient"));
  if (nordicarePatient) {
    const existingContacts = await db.select().from(schema.contacts).where(eq(schema.contacts.companyId, nordicarePatient.companyId));
    if (existingContacts.length === 0) {
      await db.insert(schema.contacts).values([
        {
          firstName: "Erik",
          lastName: "Lindgren",
          title: "VP IT",
          email: "e.lindgren@nordiccare.com",
          companyId: nordicarePatient.companyId,
          roleInDeal: "champion",
          isPrimary: true,
        },
        {
          firstName: "Ingrid",
          lastName: "Johansson",
          title: "CISO",
          email: "i.johansson@nordiccare.com",
          companyId: nordicarePatient.companyId,
          roleInDeal: "blocker",
        },
      ]);
      console.log("  ✓ Added NordicCare Patient contacts");
    }

    // Add activities if needed
    const ncActivities = await db.select().from(schema.activities).where(eq(schema.activities.dealId, nordicarePatient.id));
    if (ncActivities.length < 2) {
      await db.insert(schema.activities).values([
        {
          dealId: nordicarePatient.id,
          teamMemberId: ryanFoster.id,
          type: "call_completed",
          subject: "Discovery — Patient Records Modernization",
          description: "Erik Lindgren enthusiastic about AI-powered patient records. Budget available. CISO Ingrid Johansson raised EU data residency concerns early.",
          metadata: { callQualityScore: 72 },
          createdAt: daysAgo(50),
        },
        {
          dealId: nordicarePatient.id,
          teamMemberId: ryanFoster.id,
          type: "meeting_completed",
          subject: "Security Architecture Review with CISO",
          description: "Ingrid Johansson challenged our data residency architecture. Wants on-premises option that we don't offer. Erik trying to mediate.",
          createdAt: daysAgo(40),
        },
        {
          dealId: nordicarePatient.id,
          teamMemberId: ryanFoster.id,
          type: "note_added",
          subject: "CISO raised EU data residency concerns — blocking deal",
          description: "Ingrid insists on on-premises deployment. Our cloud-only architecture is a hard blocker. Erik can't override CISO on security decisions.",
          createdAt: daysAgo(30),
        },
        {
          dealId: nordicarePatient.id,
          teamMemberId: ryanFoster.id,
          type: "competitive_intel",
          subject: "Microsoft Copilot demo scheduled with NordicCare",
          description: "Erik mentioned NordicCare IT is evaluating Microsoft Copilot for patient records. Copilot has Azure-based EU residency story that CISO prefers.",
          createdAt: daysAgo(20),
        },
      ]);
      console.log("  ✓ Added NordicCare Patient activities");
    }
  }

  // ── Step 1f: Deduplicate observations ──
  console.log("\n── Deduplicating observations ──");

  const allObs = await db.select().from(schema.observations);
  const obsMap = new Map<string, typeof allObs>();

  for (const obs of allObs) {
    const key = `${obs.observerId}::${obs.rawInput.trim().toLowerCase()}`;
    if (!obsMap.has(key)) {
      obsMap.set(key, []);
    }
    obsMap.get(key)!.push(obs);
  }

  let dedupCount = 0;
  for (const [, dupes] of obsMap) {
    if (dupes.length > 1) {
      // Keep the one with a clusterId, or the earliest
      const keeper = dupes.find((d) => d.clusterId) || dupes[0]!;
      const toDelete = dupes.filter((d) => d.id !== keeper.id);
      for (const d of toDelete) {
        // Delete routing records first
        await db.delete(schema.observationRouting).where(eq(schema.observationRouting.observationId, d.id));
        await db.delete(schema.observations).where(eq(schema.observations.id, d.id));
        dedupCount++;
      }
    }
  }
  console.log(`  ✓ Removed ${dedupCount} duplicate observations`);

  // ── Step 1g: Recalculate cluster data ──
  console.log("\n── Recalculating cluster data ──");

  const clusters = await db.select().from(schema.observationClusters);
  const remainingObs = await db.select().from(schema.observations);
  const remainingDeals = await db.select({ id: schema.deals.id, dealValue: schema.deals.dealValue }).from(schema.deals);
  const dealValueMap = new Map(remainingDeals.map((d) => [d.id, Number(d.dealValue || 0)]));

  for (const cluster of clusters) {
    const clusterObs = remainingObs.filter((o) => o.clusterId === cluster.id);
    const observerIds = new Set(clusterObs.map((o) => o.observerId));

    // Calculate ARR from linked deals
    const dealIds = new Set<string>();
    for (const obs of clusterObs) {
      if (obs.linkedDealIds) obs.linkedDealIds.forEach((id) => dealIds.add(id));
      const ctx = obs.sourceContext as { dealId?: string } | null;
      if (ctx?.dealId) dealIds.add(ctx.dealId);
    }

    let totalArr = 0;
    for (const dealId of dealIds) {
      totalArr += dealValueMap.get(dealId) || 0;
    }

    await db
      .update(schema.observationClusters)
      .set({
        observationCount: clusterObs.length,
        observerCount: observerIds.size,
        arrImpactTotal: totalArr > 0 ? totalArr.toString() : cluster.arrImpactTotal,
      })
      .where(eq(schema.observationClusters.id, cluster.id));

    console.log(`  ✓ ${cluster.title}: ${clusterObs.length} obs, ${observerIds.size} observers, €${totalArr.toLocaleString()} ARR`);
  }

  // ── Final counts ──
  console.log("\n── Final verification ──");

  const finalDeals = await db.select({ name: schema.deals.name, stage: schema.deals.stage, dealValue: schema.deals.dealValue }).from(schema.deals);
  console.log(`\nTotal deals: ${finalDeals.length}`);
  for (const d of finalDeals) {
    console.log(`  ${d.stage} | €${Number(d.dealValue || 0).toLocaleString()} | ${d.name}`);
  }

  const finalObs = await db.select().from(schema.observations);
  console.log(`\nTotal observations: ${finalObs.length}`);

  const finalCompanies = await db.select().from(schema.companies);
  console.log(`Total companies: ${finalCompanies.length}`);

  console.log("\n✅ Final Demo Polish complete!");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

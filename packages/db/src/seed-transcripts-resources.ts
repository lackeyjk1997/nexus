import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  console.log("📞 Seeding transcripts & resources...");

  // ── Find deals by name ──
  const allDeals = await db.select().from(schema.deals);
  const allCompanies = await db.select().from(schema.companies);
  const allMembers = await db.select().from(schema.teamMembers);

  function findDeal(nameFragment: string) {
    return allDeals.find((d) => d.name.toLowerCase().includes(nameFragment.toLowerCase()));
  }
  function findMember(nameFragment: string) {
    return allMembers.find((m) => m.name.toLowerCase().includes(nameFragment.toLowerCase()));
  }

  const sarahChen = findMember("Sarah Chen");
  if (!sarahChen) {
    console.error("Sarah Chen not found");
    process.exit(1);
  }

  // ── 1. Seed Transcripts + Analyses ──

  const transcriptSeeds = [
    {
      dealFragment: "medvista",
      title: "Discovery Call — MedVista Health Systems",
      date: daysAgo(5),
      durationSeconds: 19 * 60,
      participants: [
        { name: "Sarah Chen", role: "AE" },
        { name: "Henrik Mueller", role: "CTO" },
      ],
      summary: "Dense discovery call with Henrik Mueller (CTO). Clinicians spending 25-30 hrs/week on documentation across 340 clinicians at $180/hr fully loaded = $800K/month. 8-12% error rate on clinical notes, two compliance incidents last quarter (coding error + medication reconciliation miss). Current stack: Epic Hyperspace on-prem, Dragon Medical dictation, SmartPhrase templates — Dragon transcribes but can't populate TNM staging, ICD-10 codes, or treatment protocol references. Internal build attempt shelved. Henrik already presented to CMO Dr. Patel (supportive). Microsoft DAX Copilot demoed 2 weeks ago — solid ambient listening but can't handle oncology specialty workflows; CISO flagged EU data residency gap. CFO Marcus Webb needs to approve >$500K, wants 12-month payback, not yet engaged. Security review bottleneck: CISO backed up, last 3 reviews took 6-8 weeks each. Henrik wants oncology POC with 15-20 clinicians: raw dictation → structured clinical note with ICD-10, TNM staging, medication reconciliation, treatment protocols, plus NAACCR tumor registry output.",
      painPoints: [
        "25-30 hours/week per clinician on documentation — 340 clinicians at $180/hr = $800K/month",
        "8-12% error rate on clinical notes, two compliance incidents last quarter",
        "Dragon Medical transcribes but can't auto-populate structured fields (ICD-10, TNM staging, treatment protocols)",
        "$2.1M spent on compliance remediation last year; potential CMS penalties / False Claims Act exposure",
      ],
      nextSteps: [
        "Send complete security package to CISO (SOC 2, pen test results, architecture docs) by Thursday",
        "Schedule technical demo with engineering team — bring SA Alex Kim",
        "Prepare ROI analysis with MedVista-specific metrics ($800K/month docs + $2.1M compliance)",
        "Prepare tailored brief and case study for CMO Dr. Patel",
        "Henrik to send security questionnaire and de-identified oncology sample notes",
      ],
      stakeholders: [
        { name: "Henrik Mueller", title: "CTO", sentiment: "very positive" },
        { name: "Dr. Patel", title: "Chief Medical Officer", sentiment: "supportive" },
        { name: "Marcus Webb", title: "CFO", sentiment: "unknown — not yet engaged" },
      ],
      budgetSignals: [
        "$800K/month in clinician documentation time",
        "$2.1M/year in compliance remediation costs",
        "CFO Marcus Webb approves anything over $500K annually — wants 12-month payback",
        "Formal RFP required for vendors over $200K; legal review 3-4 weeks after security",
      ],
      competitiveMentions: [
        "Microsoft DAX Copilot demoed 2 weeks ago — solid ambient listening but lacks oncology customization",
        "CISO shut down Microsoft conversation over EU data residency concerns",
      ],
      talkRatio: { ae: 35, prospect: 65 },
      callQualityScore: 85,
      meddpicc: {
        metrics: "340 clinicians, $180/hr, 25 hrs/week = $800K/month documentation cost. $2.1M/year compliance remediation. 8-12% error rate.",
        economic_buyer: "Marcus Webb (CFO) — approves >$500K, wants 12-month payback. NOT yet engaged.",
        decision_criteria: "Oncology specialty accuracy, EU data residency, HIPAA/SOC 2 compliance, Epic integration",
        decision_process: "Security review (6-8 weeks) → 30-day pilot (20 clinicians) → CFO business case → Board approval for AI/clinical",
        identify_pain: "Documentation burden ($800K/month), compliance exposure (CMS penalties, False Claims Act), clinician burnout",
        champion: "Henrik Mueller (CTO) — already presented to CMO Dr. Patel, actively building internal momentum",
        competition: "Microsoft DAX Copilot — ambient listening only, can't handle oncology workflows, EU data residency gap",
      },
      coaching: [
        "Excellent discovery — strong talk ratio (35/65), let the prospect drive",
        "Quantified pain comprehensively: $800K/month + $2.1M compliance + CMS penalty exposure",
        "Champion signal strong: Henrik already presented to CMO, asking for internal materials",
        "Gap: CFO Marcus Webb not yet engaged. Prioritize multi-threading after pilot results.",
        "Smart tactical move: proposed starting security review immediately to run parallel with evaluation",
        "Prototype ask is specific and actionable (oncology POC, 15-20 clinicians, ICD-10 + TNM + NAACCR)",
      ],
    },
    {
      dealFragment: "healthfirst",
      title: "Technical Deep-Dive with HealthFirst Engineering Team",
      date: daysAgo(3),
      durationSeconds: 45 * 60,
      participants: [
        { name: "Sarah Chen", role: "AE" },
        { name: "Alexander Goh", role: "VP of Engineering" },
        { name: "Jennifer Torres", role: "Compliance Lead" },
      ],
      summary: "Technical validation call with HealthFirst's engineering and compliance teams. Focused on Claude API integration for claims processing automation. Team is processing 50,000 claims monthly with 15% error rate. Primary concerns: model accuracy for medical coding, audit trail requirements, and integration with their existing Epic EHR system. Alexander Goh (Champion) is pushing hard but compliance team wants a dedicated security review before moving forward.",
      painPoints: [
        "50,000 claims/month with 15% error rate costing $2.1M annually",
        "Manual claims processing creates bottlenecks and compliance risk",
        "Epic EHR integration is a hard technical requirement",
        "Audit trail requirements for regulatory compliance",
      ],
      nextSteps: [
        "Schedule dedicated security review session with compliance team",
        "Prepare Epic EHR integration architecture document",
        "Share claims processing accuracy benchmarks",
        "Set up sandbox environment for technical POC",
      ],
      stakeholders: [
        { name: "Alexander Goh", title: "VP of Engineering", sentiment: "very positive" },
        { name: "Jennifer Torres", title: "Compliance Lead", sentiment: "cautious" },
      ],
      budgetSignals: [
        "$2.1M annual cost of claims processing errors",
        "Budget pre-approved for automation initiative",
      ],
      competitiveMentions: [],
      talkRatio: { ae: 40, prospect: 60 },
      callQualityScore: 82,
      meddpicc: {
        metrics: "50K claims/month, 15% error rate, $2.1M annual error cost",
        decision_process: "Security review required before procurement can proceed",
        identify_pain: "Manual claims processing errors and compliance risk",
      },
      coaching: [
        "Good technical depth — kept the conversation focused on their architecture",
        "Compliance blocker identified early. Schedule the security review ASAP.",
        "Alexander is a strong champion. Coach him on internal selling to compliance.",
        "Consider bringing an SA to the security review for credibility",
      ],
    },
    {
      dealFragment: "pharmabridge",
      title: "Initial Discovery — PharmaBridge Drug Interaction Analysis",
      date: daysAgo(2),
      durationSeconds: 28 * 60,
      participants: [
        { name: "Sarah Chen", role: "AE" },
        { name: "Anna Petrov", role: "VP of Engineering" },
      ],
      summary: "First call with PharmaBridge. Anna Petrov (VP Engineering) exploring Claude for drug interaction analysis and clinical trial data processing. Early stage — still scoping requirements. Currently using a mix of manual review and legacy ML models with high false positive rates. Interested in Claude's reasoning capabilities for complex multi-drug interactions.",
      painPoints: [
        "Legacy ML models have 30% false positive rate on drug interactions",
        "Manual review process for complex multi-drug interactions is slow",
        "Clinical trial data processing is largely manual and error-prone",
      ],
      nextSteps: [
        "Send Claude capabilities overview for healthcare/pharma use cases",
        "Schedule follow-up to discuss specific drug interaction use case",
        "Prepare accuracy comparison: Claude vs legacy ML for interaction analysis",
      ],
      stakeholders: [
        { name: "Anna Petrov", title: "VP of Engineering", sentiment: "curious" },
      ],
      budgetSignals: [
        "No specific budget discussed yet — early exploration",
      ],
      competitiveMentions: [
        "Google Med-PaLM being evaluated in parallel",
      ],
      talkRatio: { ae: 45, prospect: 55 },
      callQualityScore: 71,
      meddpicc: {
        identify_pain: "High false positive rate (30%) in drug interaction screening",
        competition: "Google Med-PaLM being evaluated",
      },
      coaching: [
        "Early-stage call — good job keeping it exploratory and not pushing too hard",
        "Watch for the Google Med-PaLM evaluation — get ahead of this competitive threat",
        "Next call should focus on quantifying the cost of false positives",
        "Consider sharing the Healthcare AI case study to build credibility",
      ],
    },
    {
      dealFragment: "nordiccare",
      title: "Integration Planning Call — NordicCare Claude API",
      date: daysAgo(8),
      durationSeconds: 38 * 60,
      participants: [
        { name: "Sarah Chen", role: "AE" },
        { name: "Henrik Lindgren", role: "CTO" },
        { name: "Maria Johansson", role: "Integration Lead" },
      ],
      summary: "Technical planning call with NordicCare's integration team. Discussed API architecture for patient communication automation. NordicCare wants to automate appointment scheduling, follow-up communications, and patient FAQ responses across 12 clinic locations. Key concern is multi-language support (Swedish, Norwegian, Finnish, English) and ensuring clinical accuracy in automated patient communications.",
      painPoints: [
        "Manual patient communication across 12 clinics costs €400K/year",
        "4-language requirement (Swedish, Norwegian, Finnish, English) complicates automation",
        "Clinical accuracy is a regulatory requirement for patient communications",
        "Current process causes appointment scheduling delays",
      ],
      nextSteps: [
        "Prepare multi-language support documentation and demo",
        "Share EU Data Residency & GDPR Compliance Guide",
        "Set up proof-of-concept with sample patient communication templates",
        "Schedule follow-up with NordicCare's regulatory team",
      ],
      stakeholders: [
        { name: "Henrik Lindgren", title: "CTO", sentiment: "positive" },
        { name: "Maria Johansson", title: "Integration Lead", sentiment: "positive" },
      ],
      budgetSignals: [
        "€400K annual cost of manual patient communications cited",
        "Budget allocated for 2026 automation initiative",
      ],
      competitiveMentions: [],
      talkRatio: { ae: 38, prospect: 62 },
      callQualityScore: 75,
      meddpicc: {
        metrics: "12 locations, 4 languages, €400K annual cost",
        decision_criteria: "Multi-language support, clinical accuracy, GDPR compliance",
      },
      coaching: [
        "Good discovery on the multi-language requirement — this differentiates us",
        "Consider highlighting Claude's strong multilingual capabilities as a competitive advantage",
        "The €400K pain point gives a solid ROI foundation",
        "Engage the regulatory team early to avoid late-stage blockers",
      ],
    },
  ];

  for (const ts of transcriptSeeds) {
    const deal = findDeal(ts.dealFragment);
    if (!deal) {
      console.log(`  ⚠ Deal "${ts.dealFragment}" not found, skipping`);
      continue;
    }

    // Check if transcript already exists
    const existing = await db
      .select({ id: schema.callTranscripts.id })
      .from(schema.callTranscripts)
      .where(
        and(
          eq(schema.callTranscripts.dealId, deal.id),
          eq(schema.callTranscripts.title, ts.title)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ↳ Transcript "${ts.title}" already exists, skipping`);
      continue;
    }

    // Insert transcript
    const [transcript] = await db
      .insert(schema.callTranscripts)
      .values({
        dealId: deal.id,
        title: ts.title,
        date: ts.date,
        durationSeconds: ts.durationSeconds,
        participants: ts.participants,
        source: "simulated",
        status: "complete",
      })
      .returning({ id: schema.callTranscripts.id });

    // Insert analysis
    await db.insert(schema.callAnalyses).values({
      transcriptId: transcript!.id,
      summary: ts.summary,
      painPoints: ts.painPoints,
      nextSteps: ts.nextSteps,
      stakeholdersMentioned: ts.stakeholders,
      budgetSignals: ts.budgetSignals,
      competitiveMentions: ts.competitiveMentions,
      talkRatio: ts.talkRatio,
      callQualityScore: ts.callQualityScore,
      meddpiccExtractions: ts.meddpicc,
      coachingInsights: ts.coaching,
      questionQuality: { score: Math.round(ts.callQualityScore * 0.9), insights: [] },
    });

    console.log(`  ✓ Seeded transcript + analysis: ${ts.title} → ${deal.name}`);
  }

  // ── 2. Seed Resources ──

  const resourceSeeds = [
    { title: "HIPAA Compliance FAQ", type: "faq", description: "One-pager answering the top 10 HIPAA questions from prospects", verticals: ["healthcare"], tags: ["hipaa", "compliance", "healthcare", "privacy"], url: "/resources/hipaa-compliance-faq" },
    { title: "SOC 2 Certification Summary", type: "security_doc", description: "Summary of Anthropic's SOC 2 Type II certification and controls", verticals: ["all"], tags: ["soc2", "security", "certification", "audit"], url: "/resources/soc2-certification" },
    { title: "Claude Enterprise Security Whitepaper", type: "whitepaper", description: "Comprehensive security architecture, data handling, and privacy controls", verticals: ["all"], tags: ["security", "enterprise", "privacy", "architecture"], url: "/resources/security-whitepaper" },
    { title: "Healthcare AI Case Study — Regional Health Network", type: "case_study", description: "How a 200-bed health network reduced documentation time by 60%", verticals: ["healthcare"], tags: ["healthcare", "case-study", "documentation", "roi"], url: "/resources/healthcare-case-study" },
    { title: "Financial Services Compliance Battlecard", type: "battlecard", description: "Regulatory compliance positioning for banking and insurance", verticals: ["financial_services"], tags: ["financial-services", "compliance", "battlecard", "regulatory"], url: "/resources/finserv-battlecard" },
    { title: "Claude vs Microsoft Copilot — Technical Comparison", type: "battlecard", description: "Feature-by-feature comparison with emphasis on data privacy and accuracy", verticals: ["all"], tags: ["competitive", "copilot", "microsoft", "comparison"], url: "/resources/claude-vs-copilot" },
    { title: "Claude vs Google Med-PaLM — Healthcare Positioning", type: "battlecard", description: "Positioning guide for healthcare accounts evaluating Google", verticals: ["healthcare"], tags: ["competitive", "google", "med-palm", "healthcare"], url: "/resources/claude-vs-medpalm" },
    { title: "Enterprise ROI Calculator", type: "roi_calculator", description: "Customizable spreadsheet for quantifying Claude implementation ROI", verticals: ["all"], tags: ["roi", "calculator", "enterprise", "value"], url: "/resources/roi-calculator" },
    { title: "Data Residency & EU Compliance Guide", type: "whitepaper", description: "EU data residency options, GDPR compliance, and data processing agreements", verticals: ["all"], tags: ["gdpr", "eu", "data-residency", "compliance", "privacy"], url: "/resources/eu-compliance-guide" },
    { title: "Clinical Documentation Automation — POC Template", type: "template", description: "Step-by-step POC plan template for clinical documentation use cases", verticals: ["healthcare"], tags: ["poc", "template", "healthcare", "documentation"], url: "/resources/clinical-poc-template" },
    { title: "Claims Processing AI — Implementation Guide", type: "whitepaper", description: "Technical guide for automating claims processing with Claude", verticals: ["healthcare", "financial_services"], tags: ["claims", "automation", "implementation", "healthcare"], url: "/resources/claims-processing-guide" },
    { title: "Board Presentation Deck Template", type: "template", description: "Customizable executive presentation for internal champion to present to board", verticals: ["all"], tags: ["board", "presentation", "template", "executive", "champion"], url: "/resources/board-deck-template" },
  ];

  // Check if resources already seeded
  const existingResources = await db.select({ id: schema.resources.id }).from(schema.resources).limit(1);
  if (existingResources.length === 0) {
    await db.insert(schema.resources).values(resourceSeeds);
    console.log(`  ✓ Seeded ${resourceSeeds.length} resources`);
  } else {
    console.log(`  ↳ Resources already seeded`);
  }

  // ── 3. Seed agent action activities on MedVista deal ──

  const medvistaDeal = findDeal("medvista");
  if (medvistaDeal && sarahChen) {
    // Check if already seeded
    const existingActions = await db
      .select({ id: schema.activities.id })
      .from(schema.activities)
      .where(
        and(
          eq(schema.activities.dealId, medvistaDeal.id),
          eq(schema.activities.subject, "AI Call Prep Generated")
        )
      )
      .limit(1);

    if (existingActions.length === 0) {
      await db.insert(schema.activities).values([
        {
          dealId: medvistaDeal.id,
          teamMemberId: sarahChen.id,
          type: "call_prep",
          subject: "AI Call Prep Generated",
          description: "Call prep brief for MedVista Health Systems. Key focus: Address GDPR compliance questions — 3 other reps hit the same wall this quarter. CompetitorX offering free pilots.",
          metadata: { source: "call_prep" },
          createdAt: daysAgo(1),
        },
        {
          dealId: medvistaDeal.id,
          teamMemberId: sarahChen.id,
          type: "email_draft",
          subject: "Follow-up email drafted for Oliver Laurent",
          description: "AI-drafted follow-up email. Subject: Next steps on Claude Enterprise integration",
          metadata: { source: "email_draft" },
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        },
      ]);
      console.log(`  ✓ Seeded agent action activities on MedVista deal`);
    } else {
      console.log(`  ↳ Agent action activities already seeded`);
    }
  }

  console.log("✅ Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

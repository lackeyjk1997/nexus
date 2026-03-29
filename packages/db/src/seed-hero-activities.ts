import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and, sql } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

async function seed() {
  console.log("🎯 Seeding hero deal activities...");

  const allDeals = await db.select().from(schema.deals);
  const allMembers = await db.select().from(schema.teamMembers);

  function findDeal(nameFragment: string) {
    return allDeals.find((d) => d.name.toLowerCase().includes(nameFragment.toLowerCase()));
  }
  function findMember(nameFragment: string) {
    return allMembers.find((m) => m.name.toLowerCase().includes(nameFragment.toLowerCase()));
  }

  const sarahChen = findMember("Sarah Chen");
  if (!sarahChen) { console.error("Sarah Chen not found"); process.exit(1); }

  const medvista = findDeal("medvista");
  const healthfirst = findDeal("healthfirst");
  const trustbank = findDeal("trustbank");

  if (!medvista) { console.error("MedVista deal not found"); process.exit(1); }
  if (!healthfirst) { console.error("HealthFirst deal not found"); process.exit(1); }
  if (!trustbank) { console.error("TrustBank deal not found"); process.exit(1); }

  console.log(`  MedVista: ${medvista.id}`);
  console.log(`  HealthFirst: ${healthfirst.id}`);
  console.log(`  TrustBank: ${trustbank.id}`);

  // ── Step 1: Deduplicate existing activities across ALL deals ──
  // Remove duplicate activities with same deal_id + subject + same day
  console.log("  🧹 Deduplicating activities...");
  const dupeResult = await db.execute(sql`
    DELETE FROM activities
    WHERE id NOT IN (
      SELECT DISTINCT ON (deal_id, DATE(created_at), subject)
        id FROM activities
      ORDER BY deal_id, DATE(created_at), subject, created_at DESC
    )
  `);
  console.log("  Deduplication complete");

  // ── Step 2: Delete existing activities for hero deals (we'll replace them) ──
  for (const deal of [medvista, healthfirst, trustbank]) {
    await db.delete(schema.activities).where(eq(schema.activities.dealId, deal.id));
    console.log(`  Cleared activities for ${deal.name}`);
  }

  // ── Step 3: Seed MedVista activities ──
  console.log("  📋 Seeding MedVista timeline...");
  await db.insert(schema.activities).values([
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "email_sent",
      subject: "Initial outreach to Oliver Laurent",
      description: "Cold email introducing Claude Enterprise for clinical documentation automation. Referenced MedVista's 12-facility network and Epic EHR integration.",
      createdAt: daysAgo(12),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "call_completed",
      subject: "Discovery call with Oliver Laurent",
      description: "45-min discovery. Oliver described 2+ hrs/day on clinical docs. Mentioned prior OpenAI eval dropped for privacy. Interested in POC.",
      metadata: { duration: "45m", participants: ["Sarah Chen", "Oliver Laurent"] },
      createdAt: daysAgo(10),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "call_analysis",
      subject: "Call Analyzed — Score: 75/100",
      description: "Strong discovery. Good talk ratio (35/65). Pain points identified around manual processing and scaling. Risk: CFO not yet engaged.",
      metadata: {
        source: "call_analysis",
        score: 75,
        painPoints: [
          "Manual document processing 30+ hrs/week across 200 clinicians",
          "High error rates in automated workflows",
          "Difficulty scaling with team growth",
          "EU data residency requirements for clinical data",
        ],
        nextSteps: [
          "Schedule technical demo with engineering team",
          "Share HIPAA and SOC 2 security documentation",
          "Prepare ROI analysis for CFO engagement",
        ],
      },
      createdAt: new Date(daysAgo(10).getTime() + 30 * 60 * 1000), // 30 min after call
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "email_sent",
      subject: "Security documentation sent to Oliver",
      description: "Sent SOC 2 summary and HIPAA compliance FAQ. Oliver forwarded to their compliance team.",
      createdAt: daysAgo(8),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "meeting_completed",
      subject: "Technical demo for MedVista engineering team",
      description: "Live demo of Claude API integration with clinical documentation workflow. 4 attendees including Emma Laurent (CTO).",
      metadata: { attendees: ["Oliver Laurent", "Emma Laurent", "Henrik Mueller", "Sarah Chen"] },
      createdAt: daysAgo(6),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "stage_changed",
      subject: "Stage changed from proposal to negotiation",
      description: "Strong technical validation. Moving to negotiation. Key risk: CFO Emma Mueller not yet engaged.",
      createdAt: daysAgo(5),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "note_added",
      subject: "Competitive intel update",
      description: "Oliver mentioned Microsoft Copilot team reached out last week with an aggressive pricing proposal. Need to differentiate on data privacy and EU data residency.",
      createdAt: daysAgo(3),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "call_prep",
      subject: "AI Call Prep — Negotiation / pricing discussion",
      description: "Economic Buyer confidence is 39% — CFO Emma Mueller hasn't been directly engaged yet.",
      metadata: {
        source: "call_prep",
        prepContext: "Negotiation / pricing discussion",
        attendees: [
          { name: "Oliver Laurent", title: "VP of Engineering", role: "Champion" },
          { name: "Emma Mueller", title: "CFO", role: "Economic Buyer" },
        ],
        brief: {
          headline: "Economic Buyer confidence is 39% — CFO Emma Mueller hasn't been directly engaged yet.",
          deal_snapshot: {
            stage: "Negotiation",
            value: "€2,400,000",
            days_in_stage: "5 days",
            health: "at_risk",
            health_reason: "CFO engagement is critical at this stage but hasn't occurred.",
          },
          stakeholders_in_play: [
            { name: "Oliver Laurent", title: "VP of Engineering", role: "Champion", engagement: "hot", last_contact: "3 days ago", notes: "Strong advocate internally. Forwarded security docs to compliance." },
            { name: "Emma Mueller", title: "CFO", role: "Economic Buyer", engagement: "cold", last_contact: null, notes: "No direct engagement yet — highest priority gap." },
            { name: "Emma Laurent", title: "CTO", role: "Technical Evaluator", engagement: "warm", last_contact: "6 days ago", notes: "Attended technical demo. Positive on API integration." },
          ],
          talking_points: [
            { topic: "ROI for clinical documentation automation", why: "CFO needs business case — 200 clinicians × 2+ hrs/day manual work", approach: "Lead with time savings: 30+ hrs/week recovered across the network" },
            { topic: "Data residency and EU compliance", why: "Oliver flagged EU data residency as a key requirement", approach: "Present Claude's EU data center options and GDPR compliance posture" },
            { topic: "Competitive differentiation vs Microsoft Copilot", why: "Copilot team sent aggressive pricing proposal last week", approach: "Emphasize privacy-first architecture, context window advantages, and HIPAA expertise" },
          ],
          questions_to_ask: [
            { question: "What does Emma Mueller need to see to approve the budget?", purpose: "Uncover CFO's decision criteria", meddpicc_gap: "Economic Buyer" },
            { question: "What's the timeline for the board review?", purpose: "Map the decision process", meddpicc_gap: "Decision Process" },
            { question: "How did the Copilot evaluation compare on clinical accuracy?", purpose: "Competitive intelligence", meddpicc_gap: "Competition" },
          ],
          risks_and_landmines: [
            { risk: "CFO not engaged — deal could stall at procurement", source: "crm", mitigation: "Request intro to Emma Mueller through Oliver. Prepare CFO-specific ROI one-pager." },
            { risk: "Microsoft Copilot aggressive pricing may undercut", source: "observations", mitigation: "Shift conversation from price to accuracy, privacy, and total cost of implementation failure." },
          ],
          team_intelligence: [
            "3 other healthcare deals report Copilot competitive pressure — pricing alone isn't winning them deals",
            "Security reviews are slowing enterprise deals across the board — proactive compliance doc sharing accelerates by 2 weeks",
          ],
          competitive_context: "Microsoft Copilot team sent aggressive pricing proposal. Key differentiation: Claude's privacy-first architecture, 200K context window for clinical docs, and HIPAA-specific training.",
          suggested_resources: [
            { title: "HIPAA Compliance FAQ", type: "compliance", why: "Address CFO's compliance concerns proactively" },
            { title: "Claude vs Copilot Comparison", type: "competitive", why: "Counter Copilot pricing pressure with accuracy and privacy data" },
          ],
          suggested_next_steps: [
            "Get intro to CFO Emma Mueller via Oliver — propose 20-min ROI walkthrough",
            "Send EU data residency architecture doc before the call",
            "Prepare 3-slide CFO deck: cost savings, compliance, competitive advantage",
          ],
        },
        generatedAt: new Date(daysAgo(1).getTime()).toISOString(),
      },
      createdAt: daysAgo(1),
    },
    {
      dealId: medvista.id,
      teamMemberId: sarahChen.id,
      type: "email_draft",
      subject: "Follow-up email drafted for Oliver Laurent",
      description: "Subject: Next steps — data residency docs + CFO intro",
      metadata: {
        source: "email_draft",
        to: "Oliver Laurent <oliver.laurent@medvista.eu>",
        subject: "Next steps — data residency docs + CFO intro",
        body: "Hi Oliver,\n\nGreat connecting on the technical demo last week — your team's questions on the API integration were spot on.\n\nI wanted to follow up on two items:\n\n1. **EU Data Residency** — I've attached our EU data center architecture overview and GDPR compliance documentation. This should address the concerns your compliance team raised.\n\n2. **CFO Engagement** — As we move into pricing discussions, it would be helpful to include Emma Mueller early. Would you be open to a brief intro call? I can prepare a 20-minute ROI walkthrough tailored to MedVista's 12-facility network.\n\nI also wanted to flag — we've seen similar healthcare orgs recover 30+ hours/week in clinical documentation time. Happy to share a case study if that would help the internal conversation.\n\nLooking forward to the next step.\n\nBest,\nSarah",
        notes: "References the technical demo, addresses data residency proactively, and uses Oliver as a path to the CFO.",
        generatedAt: new Date(daysAgo(1).getTime() + 20 * 60 * 1000).toISOString(),
      },
      createdAt: new Date(daysAgo(1).getTime() + 20 * 60 * 1000),
    },
  ]);
  console.log("  ✅ MedVista: 9 activities");

  // ── Step 4: Seed HealthFirst activities ──
  console.log("  📋 Seeding HealthFirst timeline...");
  await db.insert(schema.activities).values([
    {
      dealId: healthfirst.id,
      teamMemberId: sarahChen.id,
      type: "email_sent",
      subject: "Outreach to Alexander Laurent, VP Engineering",
      description: "Introduced Claude Enterprise for claims processing automation. Referenced 50K+ claims/month volume.",
      createdAt: daysAgo(14),
    },
    {
      dealId: healthfirst.id,
      teamMemberId: sarahChen.id,
      type: "call_completed",
      subject: "Discovery call — HealthFirst claims team",
      description: "Strong fit for claims triage automation. CTO wants Copilot comparison. Q3 budget cycle, decision by June.",
      metadata: { duration: "38m", participants: ["Sarah Chen", "Alexander Laurent", "Claims Team Lead"] },
      createdAt: daysAgo(11),
    },
    {
      dealId: healthfirst.id,
      teamMemberId: sarahChen.id,
      type: "note_added",
      subject: "Call Analyzed — Score: 68/100",
      description: "Good discovery but competitive risk. CTO is evaluating Microsoft Copilot. Oracle integration is a technical concern.",
      metadata: {
        source: "call_analysis",
        score: 68,
        painPoints: [
          "Legacy Oracle claims system integration complexity",
          "CTO wants competitive comparison vs Microsoft Copilot",
          "15-person triage team at capacity, manual review bottleneck",
        ],
        nextSteps: [
          "Build Claude vs Copilot comparison document",
          "Prepare Oracle integration architecture proposal",
          "Schedule dedicated CTO meeting",
        ],
      },
      createdAt: new Date(daysAgo(11).getTime() + 45 * 60 * 1000),
    },
    {
      dealId: healthfirst.id,
      teamMemberId: sarahChen.id,
      type: "email_sent",
      subject: "Competitive comparison: Claude vs Copilot",
      description: "Sent detailed comparison doc focusing on document understanding accuracy, data privacy, and context window advantages.",
      createdAt: daysAgo(8),
    },
    {
      dealId: healthfirst.id,
      teamMemberId: sarahChen.id,
      type: "meeting_completed",
      subject: "Technical deep dive — claims processing",
      description: "52-min deep dive with Alexander and claims team. Strong technical validation. Oracle integration is solvable via middleware.",
      metadata: { attendees: ["Alexander Laurent", "Claims Team Lead", "Oracle DBA", "Sarah Chen"] },
      createdAt: daysAgo(5),
    },
    {
      dealId: healthfirst.id,
      teamMemberId: sarahChen.id,
      type: "stage_changed",
      subject: "Stage changed from technical validation to negotiation",
      description: "Technical fit confirmed. CTO still wants competitive eval but Alexander is championing internally.",
      createdAt: daysAgo(3),
    },
  ]);
  console.log("  ✅ HealthFirst: 6 activities");

  // ── Step 5: Seed TrustBank activities ──
  console.log("  📋 Seeding TrustBank timeline...");
  await db.insert(schema.activities).values([
    {
      dealId: trustbank.id,
      teamMemberId: sarahChen.id,
      type: "call_completed",
      subject: "Security architecture review with CISO",
      description: "TrustBank CISO wants Claude for fraud detection. Needs SOC 2 Type II and private cloud option. Board-level priority.",
      metadata: { duration: "50m", participants: ["Sarah Chen", "TrustBank CISO", "Security Architect"] },
      createdAt: daysAgo(16),
    },
    {
      dealId: trustbank.id,
      teamMemberId: sarahChen.id,
      type: "note_added",
      subject: "Call Analyzed — Score: 65/100",
      description: "Strong intent but heavy compliance requirements. SOC 2 Type II is a blocker. Budget already allocated (€950K).",
      metadata: {
        source: "call_analysis",
        score: 65,
        painPoints: [
          "SOC 2 Type II certification required before procurement",
          "Need private cloud deployment option for sensitive data",
          "Current vendor expensive and slow — 3x the cost for worse accuracy",
        ],
        nextSteps: [
          "Provide SOC 2 Type II documentation",
          "Prepare private cloud architecture proposal",
          "Schedule compliance officer follow-up with Dr. Schmidt",
        ],
      },
      createdAt: new Date(daysAgo(16).getTime() + 60 * 60 * 1000),
    },
    {
      dealId: trustbank.id,
      teamMemberId: sarahChen.id,
      type: "email_sent",
      subject: "SOC 2 and deployment options for TrustBank",
      description: "Sent SOC 2 Type II documentation and private cloud deployment architecture proposal.",
      createdAt: daysAgo(12),
    },
    {
      dealId: trustbank.id,
      teamMemberId: sarahChen.id,
      type: "note_added",
      subject: "Compliance officer meeting scheduled",
      description: "TrustBank compliance officer Dr. Schmidt confirmed for next Thursday. Need to prepare detailed data handling walkthrough.",
      createdAt: daysAgo(8),
    },
  ]);
  console.log("  ✅ TrustBank: 4 activities");

  console.log("🎯 Hero deal activities seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

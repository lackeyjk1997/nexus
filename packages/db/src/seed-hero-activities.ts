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
      type: "note_added",
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
      type: "note_added",
      subject: "AI Call Prep Generated",
      description: "Call prep for MedVista negotiation. Key focus: engage CFO Emma Mueller, address data residency concerns, counter Copilot competitive pressure.",
      metadata: {
        source: "agent_action",
        headline: "Economic Buyer confidence is 39% — CFO Emma Mueller hasn't been directly engaged yet.",
      },
      createdAt: daysAgo(1),
    },
  ]);
  console.log("  ✅ MedVista: 8 activities");

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

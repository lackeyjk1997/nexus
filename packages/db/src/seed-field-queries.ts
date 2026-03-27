import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

async function seedFieldQueries() {
  console.log("🔍 Seeding field queries...");

  // Get team members
  const allMembers = await db.select().from(schema.teamMembers);
  const supportMembers = await db.select().from(schema.supportFunctionMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name);
  const supportByName = (name: string) => supportMembers.find((m) => m.name === name);

  const marcus = byName("Marcus Thompson");
  const sarah = byName("Sarah Chen");
  const david = byName("David Park");
  const priya = byName("Priya Sharma");
  const lisaPark = supportByName("Lisa Park");

  if (!marcus || !sarah || !priya) {
    console.log("  ⚠ Missing required team members, skipping field query seed");
    await client.end();
    return;
  }

  // Get some deals for context
  const allDeals = await db.select().from(schema.deals);
  const dealByCompanySubstring = (sub: string) =>
    allDeals.find((d) => d.name.toLowerCase().includes(sub.toLowerCase()));

  const medVista = dealByCompanySubstring("MedVista");
  const healthFirst = dealByCompanySubstring("HealthFirst");
  const cyberShield = dealByCompanySubstring("CyberShield");
  const nordicCare = dealByCompanySubstring("NordicCare");
  const trustBank = dealByCompanySubstring("TrustBank");
  const finLeap = dealByCompanySubstring("FinLeap");

  // Clear existing field queries
  await db.delete(schema.fieldQueryQuestions);
  await db.delete(schema.fieldQueries);

  // ── Query 1: Marcus asks about CompetitorX (partially answered) ──

  const query1Id = crypto.randomUUID();
  await db.insert(schema.fieldQueries).values({
    id: query1Id,
    initiatedBy: marcus.id,
    rawQuestion: "Are any of the CompetitorX deals recoverable if we adjust pricing?",
    aiAnalysis: {
      can_answer_now: false,
      immediate_answer: null,
      confidence: "low",
      data_gaps: ["Need direct rep assessment of pricing sensitivity per deal"],
      needs_input_from: {
        roles: ["AE"],
        verticals: ["Healthcare", "Financial Services"],
        deal_ids: [medVista?.id, healthFirst?.id, trustBank?.id].filter(Boolean),
        reason: "These deals have competitive pressure flagged",
      },
    },
    clusterId: null,
    aggregatedAnswer: {
      summary:
        "1 of 2 responding reps says pricing adjustments could help. One deal (HealthFirst) may be lost to CompetitorX. €2,400K in potentially recoverable pipeline (MedVista), €3,200K uncertain (HealthFirst).",
      response_count: 2,
      target_count: 3,
      updated_at: hoursAgo(6).toISOString(),
    },
    status: "active",
    expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000),
    initiatedAt: hoursAgo(12),
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(6),
  });

  // Question 1a: Sarah (answered - positive)
  if (medVista) {
    await db.insert(schema.fieldQueryQuestions).values({
      queryId: query1Id,
      targetMemberId: sarah.id,
      questionText: `Quick check on MedVista — would a pricing adjustment help counter the CompetitorX pressure you flagged?`,
      chips: ["Yes, could help close it", "Maybe, not the main blocker", "No, they've moved on", "Not sure"],
      dealId: medVista.id,
      accountId: medVista.companyId,
      responseText: "Yes, could help close it",
      responseType: "chip",
      respondedAt: hoursAgo(8),
      giveBack: {
        insight: "Reps who paired reference introductions with pricing adjustments saw 18% higher close rates in healthcare last year.",
        source: "Based on 12 closed deals in Healthcare vertical",
      },
      recordsUpdated: { deal_updates: [{ deal_id: medVista.id, field: "activity", value: "intelligence_update" }], observation_id: null },
      status: "answered",
      createdAt: hoursAgo(12),
    });
  }

  // Question 1b: Sarah for HealthFirst (answered - negative)
  if (healthFirst) {
    await db.insert(schema.fieldQueryQuestions).values({
      queryId: query1Id,
      targetMemberId: sarah.id,
      questionText: `Quick check on HealthFirst — is there still a path to win against CompetitorX if we adjust our pricing?`,
      chips: ["Yes, pricing is the main issue", "Maybe, but other factors too", "No, they've committed to CompetitorX", "Not sure"],
      dealId: healthFirst.id,
      accountId: healthFirst.companyId,
      responseText: "No, they've committed to CompetitorX",
      responseType: "chip",
      respondedAt: hoursAgo(6),
      giveBack: {
        insight: "When a deal shifts to a competitor, re-engaging the economic buyer with a strategic review has re-opened 1 in 4 deals historically.",
        source: "Based on win-back analysis across Healthcare vertical",
      },
      recordsUpdated: { deal_updates: [{ deal_id: healthFirst.id, field: "activity", value: "intelligence_update" }], observation_id: null },
      status: "answered",
      createdAt: hoursAgo(12),
    });
  }

  // Question 1c: Priya (still pending)
  if (cyberShield) {
    await db.insert(schema.fieldQueryQuestions).values({
      queryId: query1Id,
      targetMemberId: priya.id,
      questionText: `Quick check on CyberShield — is CompetitorX putting pricing pressure on this deal?`,
      chips: ["Yes, pricing is a factor", "No, different competitive dynamics", "Not sure"],
      dealId: cyberShield.id,
      accountId: cyberShield.companyId,
      status: "pending",
      createdAt: hoursAgo(12),
    });
  }

  console.log("  ✓ Query 1: CompetitorX pricing (Marcus, partially answered)");

  // ── Query 2: Lisa Park asks about battlecard (active, waiting) ──

  if (lisaPark) {
    const query2Id = crypto.randomUUID();
    await db.insert(schema.fieldQueries).values({
      id: query2Id,
      initiatedBy: lisaPark.id,
      rawQuestion: "Which teams are struggling most with the new competitive battlecard?",
      aiAnalysis: {
        can_answer_now: false,
        immediate_answer: null,
        confidence: "low",
        data_gaps: ["Need rep feedback on battlecard effectiveness per vertical"],
        needs_input_from: {
          roles: ["AE"],
          verticals: ["Healthcare", "Financial Services", "Technology"],
          deal_ids: [],
          reason: "Enablement needs to know where battlecard training should focus",
        },
      },
      clusterId: null,
      status: "active",
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
      initiatedAt: hoursAgo(2),
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2),
    });

    // Three pending questions
    if (nordicCare) {
      await db.insert(schema.fieldQueryQuestions).values({
        queryId: query2Id,
        targetMemberId: sarah.id,
        questionText: `Quick check — how useful has the new competitive battlecard been on the NordicCare deal?`,
        chips: ["Very helpful", "Somewhat helpful", "Haven't used it yet", "Not relevant to this deal"],
        dealId: nordicCare.id,
        accountId: nordicCare.companyId,
        status: "pending",
        createdAt: hoursAgo(2),
      });
    }

    if (trustBank) {
      await db.insert(schema.fieldQueryQuestions).values({
        queryId: query2Id,
        targetMemberId: sarah.id,
        questionText: `Quick check — has the competitive battlecard helped with TrustBank positioning?`,
        chips: ["Yes, it's been key", "Partially", "Not really", "Haven't tried it"],
        dealId: trustBank.id,
        accountId: trustBank.companyId,
        status: "pending",
        createdAt: hoursAgo(2),
      });
    }

    if (finLeap) {
      await db.insert(schema.fieldQueryQuestions).values({
        queryId: query2Id,
        targetMemberId: priya.id,
        questionText: `Quick check on FinLeap — is the new competitive battlecard relevant for tech vertical deals?`,
        chips: ["Yes, very relevant", "Somewhat", "Not really for tech deals", "Haven't seen it yet"],
        dealId: finLeap.id,
        accountId: finLeap.companyId,
        status: "pending",
        createdAt: hoursAgo(2),
      });
    }

    console.log("  ✓ Query 2: Battlecard effectiveness (Lisa Park, waiting)");
  }

  console.log("✅ Field queries seeded!");
  await client.end();
}

seedFieldQueries().catch(console.error);

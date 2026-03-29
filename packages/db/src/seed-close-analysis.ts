import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function seed() {
  console.log("📊 Seeding rich close analysis data on existing closed deals...\n");

  // Find existing closed-lost deals
  const closedLost = await db
    .select({ id: schema.deals.id, name: schema.deals.name })
    .from(schema.deals)
    .where(eq(schema.deals.stage, "closed_lost"));

  const closedWon = await db
    .select({ id: schema.deals.id, name: schema.deals.name })
    .from(schema.deals)
    .where(eq(schema.deals.stage, "closed_won"));

  console.log(`Found ${closedLost.length} closed-lost, ${closedWon.length} closed-won deals`);

  // Update the NordicCare Health deal (closed-lost, security_compliance)
  const nordicCare = closedLost.find((d) => d.name.includes("NordicCare"));
  if (nordicCare) {
    await db
      .update(schema.deals)
      .set({
        closeAiAnalysis: {
          summary: "This deal was lost primarily due to the security review process starting too late in the cycle. The compliance team could not complete their review before the fiscal year deadline. Microsoft Copilot offered a pre-certified package that bypassed the review entirely, giving them a decisive timeline advantage.",
          factors: [
            {
              id: "f1",
              label: "Security review started week 8 of 10",
              category: "process",
              evidence: "Security review was not initiated until the proposal was already sent. Average healthcare security review takes 6.2 weeks.",
              confidence: "high",
            },
            {
              id: "f2",
              label: "Microsoft offered pre-certified package",
              category: "competitor",
              evidence: "Competitor had existing HIPAA pre-certification that eliminated the review bottleneck entirely.",
              confidence: "high",
            },
            {
              id: "f3",
              label: "Fiscal year deadline pressure",
              category: "timing",
              evidence: "Deal needed to close before fiscal year end. 10-week cycle with 6-week review left no buffer.",
              confidence: "medium",
            },
          ],
          questions: [],
          meddpicc_gaps: ["Decision Process — security review not mapped early enough"],
          stakeholder_flags: ["Compliance team was engaged too late in the process"],
        },
        closeFactors: [
          { id: "f1", label: "Security review started week 8 of 10", category: "process", source: "ai_suggested", confirmed: true, evidence: "Security review was not initiated until the proposal was already sent", repNote: null },
          { id: "f2", label: "Microsoft offered pre-certified package", category: "competitor", source: "ai_suggested", confirmed: true, evidence: "Competitor had existing HIPAA pre-certification", repNote: null },
          { id: "f3", label: "Fiscal year deadline pressure", category: "timing", source: "ai_suggested", confirmed: true, evidence: "10-week cycle with 6-week review left no buffer", repNote: null },
          { id: "fixed_1", label: "Security / compliance", category: "process", source: "fixed_chip", confirmed: true, evidence: null, repNote: null },
        ],
        closeAiRanAtTimestamp: new Date(),
      })
      .where(eq(schema.deals.id, nordicCare.id));
    console.log("  ✓ Updated NordicCare Health with close analysis");
  }

  // Update the HealthBridge deal (closed-lost, no_decision)
  const healthBridge = closedLost.find((d) => d.name.includes("HealthBridge"));
  if (healthBridge) {
    await db
      .update(schema.deals)
      .set({
        closeAiAnalysis: {
          summary: "This deal stalled because the champion (VP of Engineering) could never secure a CFO meeting. The deal was single-threaded — all engagement flowed through one person who lacked budget authority. The CFO eventually deprioritized the initiative without ever being directly engaged by the sales team.",
          factors: [
            {
              id: "f1",
              label: "Single-threaded through VP Engineering",
              category: "stakeholder",
              evidence: "Only 1 stakeholder contact engaged. MEDDPICC Economic Buyer confidence was low — no direct CFO engagement logged.",
              confidence: "high",
            },
            {
              id: "f2",
              label: "CFO never directly engaged",
              category: "champion",
              evidence: "0 activities involving the CFO. Champion attempted 3 internal meetings that were cancelled.",
              confidence: "high",
            },
            {
              id: "f3",
              label: "Initiative deprioritized by leadership",
              category: "internal",
              evidence: "Deal went from 'negotiation' to 'closed_lost' without a formal competitor win. Internal decision to deprioritize.",
              confidence: "medium",
            },
          ],
          questions: [
            {
              id: "q1",
              question: "Was there internal resistance we couldn't see?",
              chips: ["Yes, politics killed it", "VP blocked it", "Budget was redirected", "No internal issues"],
              why: "Understanding if this was a budget issue vs political issue changes how we approach similar accounts",
            },
          ],
          meddpicc_gaps: ["Economic Buyer — never identified or engaged", "Champion — lacked sufficient organizational power"],
          stakeholder_flags: ["CFO — never met with the team", "VP of Engineering — engaged but lacked budget authority"],
        },
        closeFactors: [
          { id: "f1", label: "Single-threaded through VP Engineering", category: "stakeholder", source: "ai_suggested", confirmed: true, evidence: "Only 1 stakeholder contact engaged", repNote: null },
          { id: "f2", label: "CFO never directly engaged", category: "champion", source: "ai_suggested", confirmed: true, evidence: "0 activities involving the CFO", repNote: "I tried three times to get a meeting — Oliver kept saying she was too busy" },
          { id: "f3", label: "Initiative deprioritized by leadership", category: "internal", source: "ai_suggested", confirmed: true, evidence: "Internal decision to deprioritize", repNote: null },
          { id: "f4", label: "Internal politics", category: "internal", source: "rep_added", confirmed: true, evidence: null, repNote: "Their VP of Engineering wanted to build in-house and lobbied against us. Oliver told me off the record." },
          { id: "fixed_1", label: "No decision", category: "process", source: "fixed_chip", confirmed: true, evidence: null, repNote: null },
        ],
        closeAiRanAtTimestamp: new Date(),
      })
      .where(eq(schema.deals.id, healthBridge.id));
    console.log("  ✓ Updated HealthBridge Medical with close analysis");
  }

  // Update the MedTech deal (closed-won)
  const medtech = closedWon.find((d) => d.name.includes("MedTech"));
  if (medtech) {
    await db
      .update(schema.deals)
      .set({
        closeAiAnalysis: {
          summary: "This deal was won because the internal champion (Dir of Clinical Ops) built a compliance ROI deck using our data residency documentation and presented it directly to the CFO without the vendor in the room. The CFO approved budget within a week. The key was arming the champion with materials rather than trying to sell the CFO directly.",
          factors: [
            {
              id: "f1",
              label: "Champion built internal ROI case",
              category: "champion",
              evidence: "Dir of Clinical Ops created a compliance ROI presentation using our data residency docs. Presented to CFO independently.",
              confidence: "high",
            },
            {
              id: "f2",
              label: "Data residency locked out competitor",
              category: "competitive_wedge",
              evidence: "EU data residency capabilities were the primary differentiator vs Microsoft Copilot. Competitor could not match.",
              confidence: "high",
            },
            {
              id: "f3",
              label: "CFO approved budget in 1 week",
              category: "timeline",
              evidence: "After champion presented internally, CFO approved budget within 7 days — 3x faster than rep-driven CFO engagement.",
              confidence: "high",
            },
          ],
          questions: [],
          meddpicc_gaps: [],
          stakeholder_flags: [],
        },
        winFactors: [
          { id: "f1", label: "Champion built internal ROI case", category: "champion", source: "ai_suggested", confirmed: true, evidence: "Dir of Clinical Ops created compliance ROI presentation", repNote: null },
          { id: "f2", label: "Data residency locked out competitor", category: "competitive_wedge", source: "ai_suggested", confirmed: true, evidence: "EU data residency was primary differentiator", repNote: null },
          { id: "f3", label: "CFO approved budget in 1 week", category: "timeline", source: "ai_suggested", confirmed: true, evidence: "7 days from champion presentation to budget approval", repNote: null },
          { id: "fixed_1", label: "Champion sold it internally", category: "champion", source: "fixed_chip", confirmed: true, evidence: null, repNote: null },
        ],
        closeAiRanAtTimestamp: new Date(),
      })
      .where(eq(schema.deals.id, medtech.id));
    console.log("  ✓ Updated MedTech Solutions with win analysis");
  }

  console.log("\n✅ Close analysis seed complete!");
  process.exit(0);
}

seed().catch(console.error);

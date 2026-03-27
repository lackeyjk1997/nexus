import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  console.log("🧠 Seeding intelligence data...");

  // Seed support function members
  await db.delete(schema.supportFunctionMembers);
  await db.insert(schema.supportFunctionMembers).values([
    { name: "Lisa Park", role: "Enablement Lead", function: "enablement", email: "lisa.park@anthropic.com", avatarInitials: "LP", avatarColor: "#7C3AED", verticalsCovered: [] },
    { name: "Michael Torres", role: "Product Marketing Manager", function: "product_marketing", email: "michael.torres@anthropic.com", avatarInitials: "MT", avatarColor: "#2563EB", verticalsCovered: [] },
    { name: "Rachel Kim", role: "Deal Desk Lead", function: "deal_desk", email: "rachel.kim@anthropic.com", avatarInitials: "RK", avatarColor: "#D97706", verticalsCovered: [] },
  ]);
  console.log("  ✓ Seeded 3 support function members");

  // Update existing clusters with ARR impact and quotes
  const clusters = await db.select().from(schema.observationClusters);

  for (const cluster of clusters) {
    if (cluster.title.includes("CompetitorX")) {
      await db.update(schema.observationClusters).set({
        arrImpactTotal: "850000",
        arrImpactDetails: {
          deals: [
            { id: "atlas", name: "Atlas Capital Partners", value: 500000, stage: "Negotiation", observer: "AE" },
            { id: "meridian", name: "Meridian Capital Partners", value: 350000, stage: "Closing", observer: "AE" },
          ],
          by_stage: { Negotiation: { count: 2, value: 600000 }, Closing: { count: 1, value: 250000 } },
          by_vertical: { "Financial Services": { count: 2, value: 700000 }, "Media & Entertainment": { count: 1, value: 150000 } },
        },
        unstructuredQuotes: [
          { quote: "Atlas Capital mentioned CompetitorX dropped their price by 20%. Third time I've heard this in finserv.", role: "AE", vertical: "Financial Services", date: "2w ago" },
          { quote: "CompetitorX is positioning heavily in media now. They're offering a free pilot program.", role: "AE", vertical: "Media & Entertainment", date: "1w ago" },
          { quote: "Fourth rep confirming this. Atlas Capital is using it as leverage.", role: "AE", vertical: "Financial Services", date: "3d ago" },
        ],
        structuredSummary: { most_common_scope: "other_deals", avg_frequency: "most_deals", avg_severity: "blocking", has_workaround_pct: 0, top_affected_stages: ["Negotiation", "Closing"] },
      }).where(eq(schema.observationClusters.id, cluster.id));
    }

    if (cluster.title.includes("SOC 2")) {
      await db.update(schema.observationClusters).set({
        arrImpactTotal: "5600000",
        arrImpactDetails: {
          deals: [
            { id: "medcore", name: "MedVista Health Systems", value: 2400000, stage: "Proposal", observer: "AE" },
            { id: "nordic", name: "NordicCare Group", value: 780000, stage: "Technical Validation", observer: "AE" },
            { id: "healthfirst", name: "HealthFirst Insurance", value: 3200000, stage: "Negotiation", observer: "AE" },
          ],
          by_stage: { Proposal: { count: 1, value: 2400000 }, "Technical Validation": { count: 1, value: 780000 }, Negotiation: { count: 1, value: 3200000 } },
          by_vertical: { Healthcare: { count: 3, value: 5600000 } },
        },
        unstructuredQuotes: [
          { quote: "MedCore's IT team keeps asking about SOC 2 compliance. Had to wing it on the call.", role: "AE", vertical: "Healthcare", date: "3w ago" },
          { quote: "Same thing with BioGen — their compliance team wants SOC 2 documentation.", role: "AE", vertical: "Healthcare", date: "3w ago" },
        ],
        structuredSummary: { most_common_scope: "whole_vertical", avg_frequency: "every_deal", avg_severity: "slowing", has_workaround_pct: 0, top_affected_stages: ["Proposal", "Technical Validation"] },
      }).where(eq(schema.observationClusters.id, cluster.id));
    }

    if (cluster.title.includes("Legal Review")) {
      await db.update(schema.observationClusters).set({
        arrImpactTotal: "1200000",
        arrImpactDetails: {
          deals: [
            { id: "gov1", name: "Government Deal 1", value: 800000, stage: "Negotiation", observer: "AE" },
            { id: "gov2", name: "Government Deal 2", value: 400000, stage: "Proposal", observer: "AE" },
          ],
          by_stage: { Negotiation: { count: 1, value: 800000 }, Proposal: { count: 1, value: 400000 } },
          by_vertical: { Government: { count: 2, value: 1200000 } },
        },
        unstructuredQuotes: [
          { quote: "Legal review is taking 3 weeks on government contracts. Losing momentum every time.", role: "AE", vertical: "Government", date: "10d ago" },
        ],
        structuredSummary: { most_common_scope: "whole_vertical", avg_frequency: "every_deal", avg_severity: "blocking", has_workaround_pct: 0, top_affected_stages: ["Negotiation"] },
      }).where(eq(schema.observationClusters.id, cluster.id));
    }

    if (cluster.title.includes("Compliance-Led")) {
      await db.update(schema.observationClusters).set({
        unstructuredQuotes: [
          { quote: "Getting really good response rates when I lead with the compliance angle for healthcare prospects.", role: "SDR", vertical: "Healthcare", date: "12d ago" },
          { quote: "Post-sale, MedCore's team said the compliance documentation was the deciding factor.", role: "CSM", vertical: "Healthcare", date: "1d ago" },
        ],
        structuredSummary: { most_common_scope: "whole_vertical", avg_frequency: "most_deals", avg_severity: "informational", has_workaround_pct: 100, top_affected_stages: ["Prospecting", "Discovery"] },
      }).where(eq(schema.observationClusters.id, cluster.id));
    }

    if (cluster.title.includes("Demo Environment")) {
      await db.update(schema.observationClusters).set({
        arrImpactTotal: "580000",
        arrImpactDetails: {
          deals: [{ id: "stream", name: "StreamVision Deal", value: 580000, stage: "Technical Validation", observer: "SC" }],
          by_stage: { "Technical Validation": { count: 1, value: 580000 } },
          by_vertical: { "Media & Entertainment": { count: 1, value: 580000 } },
        },
        unstructuredQuotes: [
          { quote: "The demo environment keeps breaking for media prospects. Had to apologize twice to StreamVision.", role: "SC", vertical: "Media & Entertainment", date: "2d ago" },
        ],
        structuredSummary: { most_common_scope: "whole_vertical", avg_frequency: "occasional", avg_severity: "blocking", has_workaround_pct: 0, top_affected_stages: ["Technical Validation"] },
      }).where(eq(schema.observationClusters.id, cluster.id));
    }
  }
  console.log("  ✓ Updated clusters with ARR impact and quotes");

  // Update some observations with follow-up data and structured data
  const obs = await db.select().from(schema.observations);

  for (const o of obs) {
    if (o.rawInput.includes("SOC 2 compliance") && o.rawInput.includes("MedCore")) {
      await db.update(schema.observations).set({
        followUpQuestion: "Is this coming up on all your healthcare deals, or just MedCore?",
        followUpResponse: "Every single healthcare deal. It's the first question procurement asks.",
        followUpChips: ["Just MedCore", "Most HC deals", "Every HC deal"],
        structuredData: { scope: "whole_vertical", frequency: "every_deal", impact_severity: "slowing", content_type: "compliance one-pager", workaround_exists: false },
        arrImpact: { total_value: 2400000, deal_count: 1, deals: [{ name: "MedVista Health Systems", value: 2400000, stage: "Proposal" }] },
      }).where(eq(schema.observations.id, o.id));
    }

    if (o.rawInput.includes("CompetitorX dropped") && o.rawInput.includes("Atlas Capital")) {
      await db.update(schema.observations).set({
        followUpQuestion: "Is this just Atlas Capital, or are you hearing this on other deals too?",
        followUpResponse: "Atlas and Meridian. Meridian brought it up in our last negotiation call.",
        followUpChips: ["Just Atlas", "Other deals too", "Hearing it everywhere"],
        structuredData: { scope: "other_deals", frequency: "most_deals", confidence: "certain", source: "prospect_told_me", competitor_name: "CompetitorX", impact_severity: "blocking" },
        arrImpact: { total_value: 850000, deal_count: 2, deals: [{ name: "Atlas Capital Partners", value: 500000, stage: "Negotiation" }, { name: "Meridian Capital Partners", value: 350000, stage: "Closing" }] },
      }).where(eq(schema.observations.id, o.id));
    }

    if (o.rawInput.includes("Legal review is taking 3 weeks")) {
      await db.update(schema.observations).set({
        structuredData: { scope: "whole_vertical", frequency: "every_deal", impact_severity: "blocking", process_name: "legal review", estimated_delay_days: 21, workaround_exists: false },
        arrImpact: { total_value: 1200000, deal_count: 2, deals: [{ name: "Government Deal 1", value: 800000, stage: "Negotiation" }, { name: "Government Deal 2", value: 400000, stage: "Proposal" }] },
      }).where(eq(schema.observations.id, o.id));
    }
  }
  console.log("  ✓ Updated observations with structured data and ARR impact");

  console.log("\n✅ Intelligence seed complete!");
  process.exit(0);
}

main().catch(console.error);

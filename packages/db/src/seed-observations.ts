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

async function seedObservations() {
  console.log("👁️ Seeding observations...");

  const members = await db.select().from(schema.teamMembers);
  const byName = (name: string) => members.find((m) => m.name === name)!;

  // Clean existing
  await db.delete(schema.observations);
  await db.delete(schema.observationClusters);

  // Create clusters first
  const clusters = [
    {
      title: "SOC 2 Compliance Documentation Gaps",
      summary: "Multiple healthcare reps report prospects asking for SOC 2 documentation that doesn't exist or is inadequate.",
      signalType: "content_gap",
      targetFunction: "enablement",
      observationCount: 3,
      observerCount: 2,
      verticalsAffected: ["Healthcare"],
      severity: "resolved",
      resolutionStatus: "resolved",
      resolutionNotes: "Created SOC 2 one-pager and FAQ document",
      effectivenessScore: 85,
      firstObserved: daysAgo(18),
      lastObserved: daysAgo(14),
    },
    {
      title: "CompetitorX Aggressive Pricing Strategy",
      summary: "Multiple reps across FinServ and Media report CompetitorX dropping prices by 20% and offering free pilot programs.",
      signalType: "competitive_intel",
      targetFunction: "product_marketing",
      observationCount: 4,
      observerCount: 3,
      verticalsAffected: ["Financial Services", "Media & Entertainment"],
      severity: "critical",
      resolutionStatus: "acknowledged",
      pipelineImpact: { deals_affected: 3, total_value: 850000 },
      firstObserved: daysAgo(15),
      lastObserved: daysAgo(2),
    },
    {
      title: "Legal Review Bottleneck on Government Contracts",
      summary: "Government deal cycle times are extended by 3-week legal review process.",
      signalType: "process_friction",
      targetFunction: "deal_desk",
      observationCount: 2,
      observerCount: 2,
      verticalsAffected: ["Government"],
      severity: "concerning",
      resolutionStatus: "in_progress",
      firstObserved: daysAgo(10),
      lastObserved: daysAgo(6),
    },
    {
      title: "Compliance-Led Outreach Wins in Healthcare",
      summary: "Healthcare reps and SDRs report significantly better engagement when leading with compliance positioning.",
      signalType: "win_pattern",
      targetFunction: "enablement",
      observationCount: 3,
      observerCount: 3,
      verticalsAffected: ["Healthcare"],
      severity: "informational",
      resolutionStatus: "acknowledged",
      firstObserved: daysAgo(12),
      lastObserved: daysAgo(3),
    },
    {
      title: "Demo Environment Reliability Issues",
      summary: "SC teams report demo environment breaking during prospect presentations.",
      signalType: "process_friction",
      targetFunction: "leadership",
      observationCount: 2,
      observerCount: 2,
      verticalsAffected: ["Media & Entertainment", "Financial Services"],
      severity: "concerning",
      resolutionStatus: "emerging",
      firstObserved: daysAgo(5),
      lastObserved: daysAgo(3),
    },
  ];

  const clusterIds: string[] = [];
  for (const c of clusters) {
    const [inserted] = await db.insert(schema.observationClusters).values(c).returning();
    clusterIds.push(inserted!.id);
  }
  console.log(`  ✓ Created ${clusters.length} clusters`);

  // Create observations
  const observationData = [
    // Week 1
    { observer: "Sarah Chen", rawInput: "MedCore's IT team keeps asking about SOC 2 compliance. We don't have a good one-pager for this. Had to wing it on the call today.", status: "resolved", clusterId: clusterIds[0], classification: { signals: [{ type: "content_gap", confidence: 0.95, summary: "SOC 2 documentation missing" }, { type: "deal_blocker", confidence: 0.7, summary: "MedCore deal slowed by compliance gap" }], sentiment: "frustrated", urgency: "high" }, giveback: { acknowledgment: "Flagged the SOC 2 gap. I'll route this to Enablement.", related_observations_hint: "1 other rep has flagged similar compliance questions." }, createdAt: daysAgo(18) },
    { observer: "Ryan Foster", rawInput: "Same thing with BioGen — their compliance team wants SOC 2 documentation. Feels like every healthcare deal is hitting this.", status: "resolved", clusterId: clusterIds[0], classification: { signals: [{ type: "content_gap", confidence: 0.95, summary: "SOC 2 docs needed across HC" }], sentiment: "frustrated", urgency: "high" }, giveback: { acknowledgment: "This is the 2nd report about SOC 2 docs this week. Clustering with Sarah's observation and escalating to Enablement." }, createdAt: daysAgo(16) },
    { observer: "David Park", rawInput: "Atlas Capital mentioned CompetitorX dropped their price by 20%. Third time I've heard this in finserv.", status: "acknowledged", clusterId: clusterIds[1], classification: { signals: [{ type: "competitive_intel", confidence: 0.9, summary: "CompetitorX 20% price drop in FinServ" }], sentiment: "negative", urgency: "high" }, giveback: { acknowledgment: "Noted. This is the 3rd pricing signal on CompetitorX — Product Marketing has been notified." }, createdAt: daysAgo(15) },
    { observer: "Priya Sharma", rawInput: "The objection handling for 'we already have an internal solution' is terrible. The battlecard response doesn't address the integration angle at all.", status: "action_taken", clusterId: null, classification: { signals: [{ type: "content_gap", confidence: 0.85, summary: "Battlecard inadequate for internal solution objection" }, { type: "agent_tuning", confidence: 0.8, summary: "Improve objection handling responses" }], sentiment: "frustrated", urgency: "medium" }, giveback: { acknowledgment: "Updated your agent's objection handling and flagged the battlecard gap to Enablement." }, createdAt: daysAgo(14) },
    { observer: "Jordan Lee", rawInput: "Getting really good response rates when I lead with the compliance angle for healthcare prospects. Way better than the ROI-first approach.", status: "clustered", clusterId: clusterIds[3], classification: { signals: [{ type: "win_pattern", confidence: 0.9, summary: "Compliance-led outreach works better in HC" }], sentiment: "positive", urgency: "low" }, giveback: { acknowledgment: "Great insight. I'm seeing a pattern — compliance-first messaging is winning in Healthcare across the team." }, createdAt: daysAgo(12) },
    // Week 2
    { observer: "James Wilson", rawInput: "Legal review is taking 3 weeks on government contracts. Losing momentum every time.", status: "routed", clusterId: clusterIds[2], classification: { signals: [{ type: "process_friction", confidence: 0.95, summary: "3-week legal review bottleneck for gov" }], sentiment: "frustrated", urgency: "high" }, giveback: { acknowledgment: "Escalated to Deal Desk. This is the 2nd report about legal review delays in Government." }, createdAt: daysAgo(10) },
    { observer: "Elena Rodriguez", rawInput: "CompetitorX is positioning heavily in media now. They're offering a free pilot program. Lost the StreamVision deal partly because of this.", status: "acknowledged", clusterId: clusterIds[1], classification: { signals: [{ type: "competitive_intel", confidence: 0.9, summary: "CompetitorX free pilot in Media" }, { type: "deal_blocker", confidence: 0.7, summary: "StreamVision lost to CompetitorX" }], sentiment: "negative", urgency: "high" }, giveback: { acknowledgment: "Critical competitive intel. This clusters with 3 other CompetitorX pricing signals. Product Marketing is reviewing." }, createdAt: daysAgo(8) },
    { observer: "Alex Kim", rawInput: "The technical deep-dive deck is outdated — still shows last quarter's architecture diagram. Customers are noticing.", status: "routed", clusterId: null, classification: { signals: [{ type: "content_gap", confidence: 0.9, summary: "Technical deck has outdated architecture" }], sentiment: "negative", urgency: "medium" }, giveback: { acknowledgment: "Flagged to Enablement for deck update." }, createdAt: daysAgo(7) },
    { observer: "Casey Martinez", rawInput: "Cold outreach to government prospects gets way better engagement when I mention FedRAMP certification. Adding it to my sequences.", status: "clustered", clusterId: clusterIds[3], classification: { signals: [{ type: "win_pattern", confidence: 0.85, summary: "FedRAMP-led outreach works for gov" }], sentiment: "positive", urgency: "low" }, giveback: { acknowledgment: "Nice finding. Similar to the compliance-first pattern we're seeing in Healthcare." }, createdAt: daysAgo(6) },
    { observer: "Sarah Chen", rawInput: "The call prep agent suggested talking about our analytics module, but MedCore already has Tableau and made it clear they don't want to switch. Agent should know this from the last transcript.", status: "action_taken", clusterId: null, classification: { signals: [{ type: "agent_tuning", confidence: 0.95, summary: "Call prep ignoring existing prospect tooling" }, { type: "cross_agent", confidence: 0.7, summary: "SC should also have this context" }], sentiment: "frustrated", urgency: "medium" }, giveback: { acknowledgment: "Updated your agent to avoid suggesting analytics when prospects have existing BI tools. Also updated Alex Kim's context." }, createdAt: daysAgo(5) },
    // Week 3
    { observer: "David Park", rawInput: "CompetitorX definitely dropped pricing. Fourth rep confirming this. Atlas Capital is using it as leverage.", status: "clustered", clusterId: clusterIds[1], classification: { signals: [{ type: "competitive_intel", confidence: 0.95, summary: "CompetitorX pricing confirmed again" }], sentiment: "negative", urgency: "critical" }, giveback: { acknowledgment: "This is now the 4th signal on CompetitorX pricing. Cluster severity elevated to CRITICAL. Product Marketing has an action item." }, createdAt: daysAgo(3) },
    { observer: "Maya Johnson", rawInput: "Priya's agent keeps suggesting technical comparisons that don't match what customers care about. She needs more focus on integration stories, not feature lists.", status: "action_taken", clusterId: null, classification: { signals: [{ type: "cross_agent", confidence: 0.9, summary: "Update Priya's agent to focus on integration" }], sentiment: "neutral", urgency: "medium" }, giveback: { acknowledgment: "Updated Priya's agent to emphasize integration narratives. She'll be notified." }, createdAt: daysAgo(2) },
    { observer: "Nina Patel", rawInput: "Post-sale, MedCore's team said the compliance documentation was the deciding factor. Worth flagging as a win pattern for healthcare.", status: "submitted", clusterId: clusterIds[3], classification: { signals: [{ type: "win_pattern", confidence: 0.9, summary: "Compliance docs as deciding factor" }], sentiment: "positive", urgency: "low" }, giveback: { acknowledgment: "Great win signal! This confirms the compliance-first pattern. 3 team members have now flagged this." }, createdAt: daysAgo(1) },
    { observer: "Tom Bradley", rawInput: "The demo environment keeps breaking for media prospects. Had to apologize twice to StreamVision before we lost them.", status: "routed", clusterId: clusterIds[4], classification: { signals: [{ type: "process_friction", confidence: 0.9, summary: "Demo environment unreliable" }, { type: "deal_blocker", confidence: 0.7, summary: "Demo failures contributed to StreamVision loss" }], sentiment: "frustrated", urgency: "high" }, giveback: { acknowledgment: "Flagged demo environment reliability to Engineering leadership." }, createdAt: daysAgo(2) },
    { observer: "Chris Okafor", rawInput: "Government accounts are asking about our roadmap for AI governance features. This keeps coming up — might be a product opportunity.", status: "routed", clusterId: null, classification: { signals: [{ type: "field_intelligence", confidence: 0.85, summary: "Market demand for AI governance features" }], sentiment: "neutral", urgency: "medium" }, giveback: { acknowledgment: "Interesting product signal. Routing to Leadership for roadmap consideration." }, createdAt: daysAgo(1) },
  ];

  for (const obs of observationData) {
    const observer = byName(obs.observer);
    if (!observer) {
      console.log(`  ⚠ Observer not found: ${obs.observer}`);
      continue;
    }
    await db.insert(schema.observations).values({
      observerId: observer.id,
      rawInput: obs.rawInput,
      sourceContext: { page: "manual", trigger: "manual" },
      aiClassification: obs.classification,
      aiGiveback: obs.giveback,
      status: obs.status,
      clusterId: obs.clusterId,
      lifecycleEvents: [
        { status: "submitted", timestamp: obs.createdAt.toISOString() },
        ...(obs.status !== "submitted" ? [{ status: obs.status, timestamp: new Date(obs.createdAt.getTime() + 60000).toISOString() }] : []),
      ],
      createdAt: obs.createdAt,
    });
  }
  console.log(`  ✓ Created ${observationData.length} observations`);

  console.log("\n✅ Observations seed complete!");
  process.exit(0);
}

seedObservations().catch(console.error);

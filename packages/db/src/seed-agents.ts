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

async function seedAgents() {
  console.log("🤖 Seeding rich agent config data...");

  // Find Sarah Chen's team member and existing agent config
  const [sarah] = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.name, "Sarah Chen"))
    .limit(1);

  if (!sarah) {
    console.error("Sarah Chen not found in team_members");
    process.exit(1);
  }

  // Find Sarah's existing agent config
  const [existingConfig] = await db
    .select()
    .from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.teamMemberId, sarah.id))
    .limit(1);

  if (!existingConfig) {
    console.error("No agent config found for Sarah");
    process.exit(1);
  }

  const configId = existingConfig.id;

  // Update config with richer data
  await db
    .update(schema.agentConfigs)
    .set({
      agentName: "Sarah's Sales Agent",
      version: 4,
      instructions:
        "You are a consultative seller focused on building long-term relationships. You prioritize understanding the prospect's pain points before pitching solutions. You're data-driven and always reference relevant case studies. Professional but approachable — use clear, concise language. Lead with data and customer outcomes. Avoid jargon unless the prospect has demonstrated technical fluency.",
      outputPreferences: {
        format: "markdown",
        verbosity: "balanced",
        includeMetrics: true,
        industryFocus: [
          "Healthcare",
          "Financial Services",
          "Technology",
        ],
        communicationStyle:
          "Professional but approachable. Use clear, concise language. Lead with data and customer outcomes. Avoid jargon unless the prospect has demonstrated technical fluency.",
        guardrails: [
          "Never discount more than 15% without manager approval",
          "Never make promises about unreleased features",
          "Never disparage competitors by name — focus on our strengths",
          "Always confirm next steps before ending a call",
        ],
        toolsEnabled: [
          "email_drafting",
          "call_prep",
          "objection_handling",
          "deal_scoring",
          "research",
        ],
        dealStageRules: {
          discovery:
            "Focus on open-ended questions about current workflow pain points. Reference industry benchmarks.",
          qualification:
            "Validate budget authority using MEDDPICC framework. Identify all stakeholders early.",
          proposal:
            "Lead with ROI calculator. Include 2-3 relevant case studies from same vertical.",
          negotiation:
            "Anchor on value delivered, not price. Have 2 concession options pre-approved.",
          closing:
            "Create urgency with implementation timeline. Offer to connect with customer references.",
        },
        temperature: 0.7,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.agentConfigs.id, configId));

  console.log("  ✓ Updated Sarah's agent config to v4");

  // Clean existing versions for this config
  await db
    .delete(schema.agentConfigVersions)
    .where(eq(schema.agentConfigVersions.agentConfigId, configId));

  // Create version history
  const versions = [
    {
      version: 1,
      instructions:
        "You are a helpful sales assistant. Help draft emails, prepare for calls, and track deal progress.",
      outputPreferences: {
        format: "markdown",
        verbosity: "concise",
        includeMetrics: true,
        toolsEnabled: ["email_drafting", "deal_scoring"],
      },
      changedBy: "user" as const,
      changeReason: "Initial agent configuration",
      createdAt: daysAgo(21),
    },
    {
      version: 2,
      instructions:
        "You are a consultative seller who prioritizes understanding prospect pain points. Focus on healthcare and financial services verticals. Always reference case studies.",
      outputPreferences: {
        format: "markdown",
        verbosity: "concise",
        includeMetrics: true,
        industryFocus: ["Healthcare", "Financial Services"],
        toolsEnabled: ["email_drafting", "call_prep", "deal_scoring"],
      },
      changedBy: "user" as const,
      changeReason:
        "Added healthcare and financial services industry focus. Enabled call prep tool. Set consultative selling persona.",
      createdAt: daysAgo(14),
    },
    {
      version: 3,
      instructions:
        "You are a consultative seller focused on building long-term relationships. You prioritize understanding the prospect's pain points before pitching solutions. You're data-driven and always reference relevant case studies. Be professional but approachable. Tone down aggressive language in outreach.",
      outputPreferences: {
        format: "markdown",
        verbosity: "balanced",
        includeMetrics: true,
        industryFocus: ["Healthcare", "Financial Services", "Technology"],
        communicationStyle:
          "Professional but approachable. Avoid aggressive sales language. Lead with value.",
        toolsEnabled: [
          "email_drafting",
          "call_prep",
          "objection_handling",
          "deal_scoring",
        ],
      },
      changedBy: "feedback_loop" as const,
      changeReason:
        "Adjusted communication style to be less aggressive in initial outreach. Based on 3 feedback entries about tone being too pushy.",
      createdAt: daysAgo(7),
    },
    {
      version: 4,
      instructions:
        "You are a consultative seller focused on building long-term relationships. You prioritize understanding the prospect's pain points before pitching solutions. You're data-driven and always reference relevant case studies. Professional but approachable — use clear, concise language. Lead with data and customer outcomes. Avoid jargon unless the prospect has demonstrated technical fluency.",
      outputPreferences: {
        format: "markdown",
        verbosity: "balanced",
        includeMetrics: true,
        industryFocus: [
          "Healthcare",
          "Financial Services",
          "Technology",
        ],
        communicationStyle:
          "Professional but approachable. Use clear, concise language. Lead with data and customer outcomes. Avoid jargon unless the prospect has demonstrated technical fluency.",
        guardrails: [
          "Never discount more than 15% without manager approval",
          "Never make promises about unreleased features",
          "Never disparage competitors by name — focus on our strengths",
          "Always confirm next steps before ending a call",
        ],
        toolsEnabled: [
          "email_drafting",
          "call_prep",
          "objection_handling",
          "deal_scoring",
          "research",
        ],
        dealStageRules: {
          discovery: "Focus on open-ended questions about current workflow pain points.",
          qualification: "Validate budget authority using MEDDPICC framework.",
          proposal: "Lead with ROI calculator. Include case studies.",
          negotiation: "Anchor on value delivered, not price.",
          closing: "Create urgency with implementation timeline.",
        },
        temperature: 0.7,
      },
      changedBy: "user" as const,
      changeReason:
        "Added guardrails and deal stage-specific rules. Enabled research tool. Refined communication style.",
      createdAt: daysAgo(2),
    },
  ];

  for (const v of versions) {
    await db.insert(schema.agentConfigVersions).values({
      agentConfigId: configId,
      version: v.version,
      instructions: v.instructions,
      outputPreferences: v.outputPreferences,
      changedBy: v.changedBy,
      changeReason: v.changeReason,
      createdAt: v.createdAt,
    });
  }
  console.log("  ✓ Created 4 version history entries");

  // Create feedback entries using the existing feedback_requests table
  // We'll use feedbackRequests with added detail
  const kate = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.name, "Kate Jensen"))
    .limit(1)
    .then((r) => r[0]);

  // Clean old feedback for this config
  await db
    .delete(schema.feedbackRequests)
    .where(eq(schema.feedbackRequests.fromAgentConfigId, configId));

  const feedbackEntries = [
    {
      fromMemberId: sarah.id,
      description:
        "Email draft was too aggressive. Opening line 'I know you're busy' is overused. Should have referenced their recent product launch instead.",
      requestType: "change_format" as const,
      status: "auto_applied" as const,
      priority: "high" as const,
      createdAt: daysAgo(18),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Call prep notes were too generic. Didn't reference the prospect's specific tech stack or recent funding round. Need more personalization.",
      requestType: "add_info" as const,
      status: "auto_applied" as const,
      priority: "medium" as const,
      createdAt: daysAgo(16),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Deal score was accurate but the rationale was too brief. Need more detail on why MEDDPICC gaps are concerning.",
      requestType: "change_format" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(14),
    },
    {
      fromMemberId: sarah.id,
      description:
        "The objection response about pricing was too pushy. Instead of immediately justifying, it should acknowledge the concern first.",
      requestType: "change_format" as const,
      status: "auto_applied" as const,
      priority: "high" as const,
      createdAt: daysAgo(11),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Good improvement on the email tone! The consultative approach is much better. Keep this style.",
      requestType: "process_change" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(9),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Call prep for HealthFirst was excellent. Loved the industry-specific benchmarks and the pre-identified pain points.",
      requestType: "add_info" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(7),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Great coaching tip about asking about decision process early. This saved me 2 follow-up calls on the MedVista deal.",
      requestType: "process_change" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(5),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Proposal draft was well-structured. ROI calculation was spot-on and the case study selection was relevant.",
      requestType: "add_info" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(3),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Objection handling for 'we're already using OpenAI' was perfect. Led with differentiation without bashing the competitor.",
      requestType: "change_format" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(2),
    },
    {
      fromMemberId: sarah.id,
      description:
        "Deal scoring has become much more nuanced. The risk signal about missing executive sponsor was exactly right.",
      requestType: "add_info" as const,
      status: "approved" as const,
      priority: "low" as const,
      createdAt: daysAgo(1),
    },
  ];

  for (const fb of feedbackEntries) {
    await db.insert(schema.feedbackRequests).values({
      ...fb,
      fromAgentConfigId: configId,
      targetRoleType: "ae",
      approvedByMemberId:
        fb.status === "approved" ? kate?.id ?? sarah.id : null,
      resolvedAt:
        fb.status !== "pending" ? new Date(fb.createdAt.getTime() + 3600000) : null,
    });
  }
  console.log("  ✓ Created 10 feedback entries");

  console.log("\n✅ Agent seed complete!");
  process.exit(0);
}

seedAgents().catch(console.error);

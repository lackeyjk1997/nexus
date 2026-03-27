export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observations, observationClusters, teamMembers } from "@nexus/db";
import { eq, desc, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const observerId = searchParams.get("observerId");

  if (observerId) {
    const results = await db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        status: observations.status,
        aiClassification: observations.aiClassification,
        aiGiveback: observations.aiGiveback,
        clusterId: observations.clusterId,
        lifecycleEvents: observations.lifecycleEvents,
        createdAt: observations.createdAt,
        observerName: teamMembers.name,
      })
      .from(observations)
      .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
      .where(eq(observations.observerId, observerId))
      .orderBy(desc(observations.createdAt));

    return NextResponse.json(results);
  }

  const results = await db
    .select({
      id: observations.id,
      rawInput: observations.rawInput,
      status: observations.status,
      aiClassification: observations.aiClassification,
      aiGiveback: observations.aiGiveback,
      clusterId: observations.clusterId,
      createdAt: observations.createdAt,
      observerName: teamMembers.name,
    })
    .from(observations)
    .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
    .orderBy(desc(observations.createdAt));

  return NextResponse.json(results);
}

// Signal type to human-readable routing target
const SIGNAL_ROUTES: Record<string, string> = {
  competitive_intel: "Product Marketing (competitive intel)",
  content_gap: "Enablement (content gap)",
  deal_blocker: "Deal Page (blocker flagged)",
  win_pattern: "Enablement + Leadership (win pattern)",
  process_friction: "Deal Desk (process friction)",
  agent_tuning: "Your Agent (config updated)",
  cross_agent: "Team Agents (cross-agent update)",
  field_intelligence: "Leadership (field intelligence)",
};

export async function POST(request: Request) {
  const { rawInput, context, observerId } = await request.json();

  if (!rawInput || !observerId) {
    return NextResponse.json(
      { error: "rawInput and observerId are required" },
      { status: 400 }
    );
  }

  const inputLower = rawInput.toLowerCase();

  // Classify the signal type
  const signalType = inputLower.includes("competitor") || inputLower.includes("pricing") || inputLower.includes("price")
    ? "competitive_intel"
    : inputLower.includes("doc") || inputLower.includes("content") || inputLower.includes("battlecard") || inputLower.includes("template")
      ? "content_gap"
      : inputLower.includes("block") || inputLower.includes("stuck") || inputLower.includes("blocking")
        ? "deal_blocker"
        : inputLower.includes("working") || inputLower.includes("great") || inputLower.includes("win") || inputLower.includes("good response")
          ? "win_pattern"
          : inputLower.includes("slow") || inputLower.includes("legal") || inputLower.includes("process") || inputLower.includes("approval")
            ? "process_friction"
            : inputLower.includes("agent") || inputLower.includes("email draft") || inputLower.includes("call prep")
              ? "agent_tuning"
              : "field_intelligence";

  const classification = {
    signals: [
      {
        type: signalType,
        confidence: 0.8,
        summary: rawInput.slice(0, 100),
      },
    ],
    sentiment: inputLower.includes("!") || inputLower.includes("frustrat") || inputLower.includes("terrible")
      ? "frustrated"
      : inputLower.includes("great") || inputLower.includes("good") || inputLower.includes("love")
        ? "positive"
        : "neutral",
    urgency: inputLower.includes("block") || inputLower.includes("losing") || inputLower.includes("urgent")
      ? "high"
      : "medium",
  };

  // Search for related observations from OTHER team members
  const allRecent = await db
    .select({
      id: observations.id,
      rawInput: observations.rawInput,
      observerId: observations.observerId,
      aiClassification: observations.aiClassification,
    })
    .from(observations)
    .where(ne(observations.observerId, observerId))
    .orderBy(desc(observations.createdAt))
    .limit(50);

  // Find related by matching signal type or keyword overlap
  const keywords = inputLower
    .split(/\s+/)
    .filter((w: string) => w.length > 4)
    .slice(0, 10);

  const related = allRecent.filter((obs) => {
    const obsClassification = obs.aiClassification as { signals?: { type: string }[] } | null;
    const sameType = obsClassification?.signals?.some((s) => s.type === signalType);
    if (sameType) return true;
    const obsLower = obs.rawInput.toLowerCase();
    const matchCount = keywords.filter((k: string) => obsLower.includes(k)).length;
    return matchCount >= 2;
  });

  const uniqueObservers = new Set(related.map((r) => r.observerId)).size;

  // Build the acknowledgment based on what was shared
  const acknowledgments: Record<string, string> = {
    competitive_intel: "Competitive signal captured.",
    content_gap: "Content gap flagged.",
    deal_blocker: "Deal blocker identified and flagged.",
    win_pattern: "Win pattern noted — this helps the whole team.",
    process_friction: "Process friction logged.",
    agent_tuning: "Agent feedback received — your config will be refined.",
    cross_agent: "Cross-team insight captured.",
    field_intelligence: "Field intelligence logged.",
  };

  // Build routing line
  const routingTarget = SIGNAL_ROUTES[signalType] || "Field Intelligence";

  // Build related observations line
  const relatedLine = related.length > 0
    ? `${uniqueObservers} other rep${uniqueObservers === 1 ? " has" : "s have"} flagged similar patterns this quarter.`
    : "You're the first to flag this. We'll watch for similar signals from the team.";

  const giveback = {
    acknowledgment: acknowledgments[signalType] || "Observation captured.",
    related_observations_hint: relatedLine,
    routing: `Routed to: ${routingTarget}`,
  };

  const [inserted] = await db
    .insert(observations)
    .values({
      observerId,
      rawInput,
      sourceContext: context || { page: "manual", trigger: "manual" },
      aiClassification: classification,
      aiGiveback: giveback,
      status: "classified",
      lifecycleEvents: [
        { status: "submitted", timestamp: new Date().toISOString() },
        { status: "classified", timestamp: new Date().toISOString() },
      ],
    })
    .returning();

  return NextResponse.json({
    id: inserted!.id,
    giveback,
    classification,
  });
}

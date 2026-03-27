export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observations, observationClusters, teamMembers } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
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

export async function POST(request: Request) {
  const { rawInput, context, observerId } = await request.json();

  if (!rawInput || !observerId) {
    return NextResponse.json(
      { error: "rawInput and observerId are required" },
      { status: 400 }
    );
  }

  // For demo: generate a simple classification without calling Claude
  // (Claude API may not be configured)
  const classification = {
    signals: [
      {
        type: rawInput.toLowerCase().includes("competitor")
          ? "competitive_intel"
          : rawInput.toLowerCase().includes("doc") || rawInput.toLowerCase().includes("content")
            ? "content_gap"
            : rawInput.toLowerCase().includes("block") || rawInput.toLowerCase().includes("stuck")
              ? "deal_blocker"
              : rawInput.toLowerCase().includes("working") || rawInput.toLowerCase().includes("great")
                ? "win_pattern"
                : "field_intelligence",
        confidence: 0.8,
        summary: rawInput.slice(0, 100),
      },
    ],
    sentiment: rawInput.includes("!") || rawInput.toLowerCase().includes("frustrat")
      ? "frustrated"
      : rawInput.toLowerCase().includes("great") || rawInput.toLowerCase().includes("good")
        ? "positive"
        : "neutral",
    urgency: rawInput.toLowerCase().includes("block") || rawInput.toLowerCase().includes("losing")
      ? "high"
      : "medium",
  };

  const giveback = {
    acknowledgment: "Got it — your observation has been classified and routed.",
    related_observations_hint: "Checking for similar patterns across the team...",
    suggested_resource: null,
    cross_team_context: null,
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

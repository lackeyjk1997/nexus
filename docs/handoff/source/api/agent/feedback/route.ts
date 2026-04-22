export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { feedbackRequests, agentConfigs, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { agentConfigId, rating, feedbackText, sourceType, tags } = body;

  if (!agentConfigId || !rating) {
    return NextResponse.json(
      { error: "agentConfigId and rating are required" },
      { status: 400 }
    );
  }

  // Get the config's team member
  const [config] = await db
    .select({ teamMemberId: agentConfigs.teamMemberId })
    .from(agentConfigs)
    .where(eq(agentConfigs.id, agentConfigId))
    .limit(1);

  if (!config) {
    return NextResponse.json({ error: "Agent config not found" }, { status: 404 });
  }

  // Map rating to request type and priority
  const requestType =
    rating <= 2
      ? ("change_format" as const)
      : rating <= 3
        ? ("add_info" as const)
        : ("process_change" as const);

  const priority =
    rating <= 2
      ? ("high" as const)
      : rating <= 3
        ? ("medium" as const)
        : ("low" as const);

  const description = [
    feedbackText || (rating >= 4 ? "Positive feedback" : "Needs improvement"),
    tags?.length ? `Tags: ${tags.join(", ")}` : "",
    sourceType ? `Source: ${sourceType}` : "",
    `Rating: ${rating}/5`,
  ]
    .filter(Boolean)
    .join(". ");

  await db.insert(feedbackRequests).values({
    fromMemberId: config.teamMemberId,
    fromAgentConfigId: agentConfigId,
    targetRoleType: "ae",
    description,
    requestType,
    status: rating <= 2 ? "pending" : "approved",
    priority,
  });

  return NextResponse.json({ success: true });
}

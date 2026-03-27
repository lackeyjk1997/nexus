export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, dealStageHistory, activities, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { dealId, fromStage, toStage, reason } = body;

  if (!dealId || !toStage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Update deal stage
  await db
    .update(deals)
    .set({
      stage: toStage,
      stageEnteredAt: new Date(),
      updatedAt: new Date(),
      winProbability: toStage === "closed_won" ? 100 : toStage === "closed_lost" ? 0 : undefined,
      forecastCategory:
        toStage === "closed_won" || toStage === "closed_lost"
          ? "closed"
          : undefined,
    })
    .where(eq(deals.id, dealId));

  // Create stage history record
  await db.insert(dealStageHistory).values({
    dealId,
    fromStage: fromStage || null,
    toStage,
    changedBy: "human",
    reason: reason || null,
  });

  // Get the deal's AE to attribute the activity
  const [deal] = await db
    .select({ assignedAeId: deals.assignedAeId })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  // Create activity record
  if (deal?.assignedAeId) {
    await db.insert(activities).values({
      dealId,
      teamMemberId: deal.assignedAeId,
      type: "stage_changed",
      subject: `Stage changed from ${fromStage?.replace("_", " ") || "unknown"} to ${toStage.replace("_", " ")}`,
      description: reason || null,
    });
  }

  return NextResponse.json({ success: true });
}

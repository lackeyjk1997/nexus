export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, dealStageHistory, activities, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    dealId,
    fromStage,
    toStage,
    reason,
    // Close/Lost outcome fields
    lossReason,
    closeCompetitor,
    closeNotes,
    closeImprovement,
    // Close/Won outcome fields
    winTurningPoint,
    winReplicable,
  } = body;

  if (!dealId || !toStage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Build update set
  const updateSet: Record<string, unknown> = {
    stage: toStage,
    stageEnteredAt: new Date(),
    updatedAt: new Date(),
  };

  if (toStage === "closed_won") {
    updateSet.winProbability = 100;
    updateSet.forecastCategory = "closed";
    updateSet.closedAt = new Date();
    if (winTurningPoint) updateSet.winTurningPoint = winTurningPoint;
    if (winReplicable) updateSet.winReplicable = winReplicable;
  } else if (toStage === "closed_lost") {
    updateSet.winProbability = 0;
    updateSet.forecastCategory = "closed";
    updateSet.closedAt = new Date();
    if (lossReason) updateSet.lossReason = lossReason;
    if (closeCompetitor) updateSet.closeCompetitor = closeCompetitor;
    if (closeNotes) updateSet.closeNotes = closeNotes;
    if (closeImprovement) updateSet.closeImprovement = closeImprovement;
  } else {
    // Non-closed stages keep default probability handling
    updateSet.winProbability = undefined;
    updateSet.forecastCategory = undefined;
  }

  // Update deal stage
  await db
    .update(deals)
    .set(updateSet)
    .where(eq(deals.id, dealId));

  // Create stage history record
  await db.insert(dealStageHistory).values({
    dealId,
    fromStage: fromStage || null,
    toStage,
    changedBy: "human",
    reason: reason || closeNotes || null,
  });

  // Get the deal's AE to attribute the activity
  const [deal] = await db
    .select({ assignedAeId: deals.assignedAeId })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  // Create activity record
  if (deal?.assignedAeId) {
    const subject = toStage === "closed_won"
      ? `Deal closed won${winTurningPoint ? ` — turning point: ${winTurningPoint.replace("_", " ")}` : ""}`
      : toStage === "closed_lost"
        ? `Deal closed lost${lossReason ? ` — reason: ${lossReason.replace("_", " ")}` : ""}`
        : `Stage changed from ${fromStage?.replace("_", " ") || "unknown"} to ${toStage.replace("_", " ")}`;

    await db.insert(activities).values({
      dealId,
      teamMemberId: deal.assignedAeId,
      type: "stage_changed",
      subject,
      description: closeNotes || winReplicable || reason || null,
      metadata: toStage === "closed_lost"
        ? { lossReason, closeCompetitor, closeImprovement }
        : toStage === "closed_won"
          ? { winTurningPoint, winReplicable }
          : undefined,
    });
  }

  return NextResponse.json({ success: true });
}

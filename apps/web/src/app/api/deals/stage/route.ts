export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, dealStageHistory, activities, observations } from "@nexus/db";
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
    // AI analysis fields
    closeAiAnalysis,
    closeFactors,
    winFactors,
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
    if (closeAiAnalysis) updateSet.closeAiAnalysis = closeAiAnalysis;
    if (winFactors) updateSet.winFactors = winFactors;
    if (closeAiAnalysis) updateSet.closeAiRanAtTimestamp = new Date();
  } else if (toStage === "closed_lost") {
    updateSet.winProbability = 0;
    updateSet.forecastCategory = "closed";
    updateSet.closedAt = new Date();
    if (lossReason) updateSet.lossReason = lossReason;
    if (closeCompetitor) updateSet.closeCompetitor = closeCompetitor;
    if (closeNotes) updateSet.closeNotes = closeNotes;
    if (closeImprovement) updateSet.closeImprovement = closeImprovement;
    if (closeAiAnalysis) updateSet.closeAiAnalysis = closeAiAnalysis;
    if (closeFactors) updateSet.closeFactors = closeFactors;
    if (closeAiAnalysis) updateSet.closeAiRanAtTimestamp = new Date();
  } else {
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

  // Get the deal's AE and name for activities
  const [deal] = await db
    .select({ assignedAeId: deals.assignedAeId, name: deals.name, vertical: deals.vertical })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  // Create activity record
  if (deal?.assignedAeId) {
    const outcome = toStage === "closed_won" ? "won" : toStage === "closed_lost" ? "lost" : null;

    const subject = toStage === "closed_won"
      ? `Deal closed won${winTurningPoint ? ` — turning point: ${winTurningPoint.replace(/_/g, " ")}` : ""}`
      : toStage === "closed_lost"
        ? `Deal closed lost${lossReason ? ` — reason: ${lossReason.replace(/_/g, " ")}` : ""}`
        : `Stage changed from ${fromStage?.replace(/_/g, " ") || "unknown"} to ${toStage.replace(/_/g, " ")}`;

    const metadata: Record<string, unknown> = {};
    if (toStage === "closed_lost") {
      metadata.outcome = "lost";
      metadata.lossReason = lossReason;
      metadata.closeCompetitor = closeCompetitor;
      metadata.closeImprovement = closeImprovement;
      if (closeFactors) metadata.factors = closeFactors;
      if (closeAiAnalysis) metadata.aiSummary = closeAiAnalysis.summary;
    } else if (toStage === "closed_won") {
      metadata.outcome = "won";
      metadata.winTurningPoint = winTurningPoint;
      metadata.winReplicable = winReplicable;
      if (winFactors) metadata.factors = winFactors;
      if (closeAiAnalysis) metadata.aiSummary = closeAiAnalysis.summary;
    }

    await db.insert(activities).values({
      dealId,
      teamMemberId: deal.assignedAeId,
      type: "stage_changed",
      subject,
      description: closeAiAnalysis?.summary || closeNotes || winReplicable || reason || null,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    // ── Create observations from confirmed AI factors (Priority 5a) ──
    if (outcome && (closeFactors || winFactors)) {
      const factors = (closeFactors || winFactors) as Array<{
        id: string;
        label: string;
        category: string;
        source: string;
        confirmed: boolean;
        evidence: string | null;
        repNote: string | null;
      }>;

      try {
        for (const factor of factors) {
          if (!factor.confirmed || factor.source !== "ai_suggested" || !factor.evidence) continue;

          await db.insert(observations).values({
            observerId: deal.assignedAeId,
            rawInput: `[Close ${outcome} — ${deal.name}] ${factor.label}: ${factor.evidence}`,
            aiClassification: {
              signals: [{
                type: factor.category === "competitor" ? "competitive_intel"
                  : factor.category === "process" ? "process_friction"
                  : factor.category === "product" ? "product_gap"
                  : factor.category === "stakeholder" ? "deal_blocker"
                  : factor.category === "pricing" ? "competitive_intel"
                  : "deal_blocker",
                confidence: 0.9,
              }],
            },
            sourceContext: {
              page: "deal_close",
              dealId,
              trigger: outcome === "lost" ? "loss_debrief" : "win_debrief",
            },
            status: "processed",
          });
        }
      } catch (err) {
        console.error("Observation creation from close factors failed (non-fatal):", err);
      }
    }
  }

  return NextResponse.json({ success: true });
}

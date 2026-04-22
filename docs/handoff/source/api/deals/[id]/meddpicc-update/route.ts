export const dynamic = "force-dynamic";
export const maxDuration = 15;

import { db } from "@/lib/db";
import { meddpiccFields, activities, deals } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface MeddpiccUpdateEntry {
  score: number;
  evidence: string;
  delta: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;
  const { updates } = (await request.json()) as {
    updates: Record<string, MeddpiccUpdateEntry>;
  };

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  // Check deal exists
  const [deal] = await db
    .select({ id: deals.id, assignedAeId: deals.assignedAeId })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Map dimension names to DB column names
  const fieldMap: Record<string, { text: string; confidence: string }> = {
    metrics: { text: "metrics", confidence: "metricsConfidence" },
    economicBuyer: { text: "economicBuyer", confidence: "economicBuyerConfidence" },
    decisionCriteria: { text: "decisionCriteria", confidence: "decisionCriteriaConfidence" },
    decisionProcess: { text: "decisionProcess", confidence: "decisionProcessConfidence" },
    identifyPain: { text: "identifyPain", confidence: "identifyPainConfidence" },
    champion: { text: "champion", confidence: "championConfidence" },
    competition: { text: "competition", confidence: "competitionConfidence" },
  };

  // Check if a MEDDPICC record already exists
  const [existing] = await db
    .select({ id: meddpiccFields.id })
    .from(meddpiccFields)
    .where(eq(meddpiccFields.dealId, dealId))
    .limit(1);

  // Build the update object
  const updateValues: Record<string, unknown> = {
    aiExtracted: true,
    updatedAt: new Date(),
  };

  const changedFields: string[] = [];

  for (const [dimension, update] of Object.entries(updates)) {
    const mapping = fieldMap[dimension];
    if (!mapping) continue;
    // When inserting a new record, accept any field with a score > 0
    // (delta may be 0 if Claude couldn't compute change from "No existing scores")
    // When updating, skip fields with no change
    if (existing && update.delta === 0) continue;
    if (!existing && update.score === 0) continue;

    updateValues[mapping.confidence] = update.score;
    updateValues[mapping.text] = update.evidence;
    changedFields.push(`${dimension}: ${update.delta > 0 ? "+" : ""}${update.delta || update.score}`);
  }

  if (changedFields.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  if (existing) {
    await db
      .update(meddpiccFields)
      .set(updateValues)
      .where(eq(meddpiccFields.dealId, dealId));
  } else {
    await db.insert(meddpiccFields).values({
      dealId,
      ...updateValues,
    });
  }

  // Create activity record
  if (deal.assignedAeId) {
    await db.insert(activities).values({
      dealId,
      teamMemberId: deal.assignedAeId,
      type: "note_added",
      subject: "MEDDPICC updated from transcript analysis",
      description: `AI analysis updated ${changedFields.length} MEDDPICC field(s): ${changedFields.join(", ")}`,
      metadata: { source: "transcript_pipeline", updates },
    });
  }

  return NextResponse.json({
    success: true,
    updated: changedFields.length,
    fields: changedFields,
  });
}

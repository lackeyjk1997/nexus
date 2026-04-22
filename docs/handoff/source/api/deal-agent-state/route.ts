export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dealAgentStates } from "@nexus/db";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get("dealId");

  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(dealAgentStates)
    .where(eq(dealAgentStates.dealId, dealId))
    .limit(1);

  if (!row) {
    return NextResponse.json({
      exists: false,
      state: {
        learnings: [],
        riskSignals: [],
        competitiveContext: null,
        interactionCount: 0,
        coordinatedIntel: [],
        briefReady: null,
        briefPending: false,
        pipelineStatus: "idle",
        pipelineStep: null,
        pipelineDetails: null,
        lastInteractionDate: null,
        lastInteractionSummary: null,
      },
    });
  }

  return NextResponse.json({
    exists: true,
    state: {
      learnings: row.learnings ?? [],
      riskSignals: row.riskSignals ?? [],
      competitiveContext: row.competitiveContext ?? null,
      interactionCount: row.interactionCount,
      coordinatedIntel: row.coordinatedIntel ?? [],
      briefReady: row.briefReady ?? null,
      briefPending: row.briefPending,
      pipelineStatus: row.pipelineStatus,
      pipelineStep: row.pipelineStep,
      pipelineDetails: row.pipelineDetails,
      lastInteractionDate: row.lastInteractionDate?.toISOString() ?? null,
      lastInteractionSummary: row.lastInteractionSummary ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { dealId, updates } = body as {
    dealId: string;
    updates: Record<string, unknown>;
  };

  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  // Fetch existing row for merge logic
  const [existing] = await db
    .select()
    .from(dealAgentStates)
    .where(eq(dealAgentStates.dealId, dealId))
    .limit(1);

  // Merge arrays instead of replacing
  if (updates.learnings && Array.isArray(updates.learnings)) {
    const existingLearnings = (existing?.learnings as string[]) || [];
    updates.learnings = [...new Set([...existingLearnings, ...(updates.learnings as string[])])];
  }
  if (updates.riskSignals && Array.isArray(updates.riskSignals)) {
    const existingSignals = (existing?.riskSignals as string[]) || [];
    updates.riskSignals = [...new Set([...existingSignals, ...(updates.riskSignals as string[])])];
  }
  if (updates.coordinatedIntel && Array.isArray(updates.coordinatedIntel)) {
    const existingIntel = (existing?.coordinatedIntel as unknown[]) || [];
    updates.coordinatedIntel = [...existingIntel, ...(updates.coordinatedIntel as unknown[])];
  }

  // Handle interactionCount as increment
  if (updates.interactionCount && typeof updates.interactionCount === "number") {
    updates.interactionCount = (existing?.interactionCount ?? 0) + (updates.interactionCount as number);
  }

  // Build the set object for upsert
  const now = new Date();
  const setValues: Record<string, unknown> = { updatedAt: now };

  if (updates.learnings !== undefined) setValues.learnings = updates.learnings;
  if (updates.riskSignals !== undefined) setValues.riskSignals = updates.riskSignals;
  if (updates.competitiveContext !== undefined) setValues.competitiveContext = updates.competitiveContext;
  if (updates.coordinatedIntel !== undefined) setValues.coordinatedIntel = updates.coordinatedIntel;
  if (updates.interactionCount !== undefined) setValues.interactionCount = updates.interactionCount;
  if (updates.lastInteractionDate !== undefined) setValues.lastInteractionDate = updates.lastInteractionDate ? new Date(updates.lastInteractionDate as string) : null;
  if (updates.lastInteractionSummary !== undefined) setValues.lastInteractionSummary = updates.lastInteractionSummary;
  if (updates.briefReady !== undefined) setValues.briefReady = updates.briefReady;
  if (updates.briefPending !== undefined) setValues.briefPending = updates.briefPending;
  if (updates.pipelineStatus !== undefined) setValues.pipelineStatus = updates.pipelineStatus;
  if (updates.pipelineStep !== undefined) setValues.pipelineStep = updates.pipelineStep;
  if (updates.pipelineDetails !== undefined) setValues.pipelineDetails = updates.pipelineDetails;
  if (updates.interventionDismissed !== undefined) setValues.interventionDismissed = updates.interventionDismissed;
  if (updates.interventionDismissedAt !== undefined) setValues.interventionDismissedAt = updates.interventionDismissedAt ? new Date(updates.interventionDismissedAt as string) : null;

  // Upsert: insert if not exists, update if exists
  const [result] = await db
    .insert(dealAgentStates)
    .values({
      dealId,
      ...setValues,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: dealAgentStates.dealId,
      set: setValues,
    })
    .returning();

  return NextResponse.json({
    success: true,
    state: {
      learnings: result.learnings ?? [],
      riskSignals: result.riskSignals ?? [],
      competitiveContext: result.competitiveContext ?? null,
      interactionCount: result.interactionCount,
      coordinatedIntel: result.coordinatedIntel ?? [],
      briefReady: result.briefReady ?? null,
      briefPending: result.briefPending,
      pipelineStatus: result.pipelineStatus,
      pipelineStep: result.pipelineStep,
      pipelineDetails: result.pipelineDetails,
      lastInteractionDate: result.lastInteractionDate?.toISOString() ?? null,
      lastInteractionSummary: result.lastInteractionSummary ?? null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    },
  });
}

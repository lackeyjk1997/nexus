export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observationRouting, observations, teamMembers } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET: list routing records for a support function
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetFunction = searchParams.get("targetFunction");
  const targetMemberId = searchParams.get("targetMemberId");

  if (!targetFunction && !targetMemberId) {
    return NextResponse.json({ error: "targetFunction or targetMemberId required" }, { status: 400 });
  }

  const condition = targetFunction
    ? eq(observationRouting.targetFunction, targetFunction)
    : eq(observationRouting.targetMemberId, targetMemberId!);

  const records = await db
    .select({
      id: observationRouting.id,
      observationId: observationRouting.observationId,
      targetFunction: observationRouting.targetFunction,
      signalType: observationRouting.signalType,
      status: observationRouting.status,
      acknowledgedAt: observationRouting.acknowledgedAt,
      resolvedAt: observationRouting.resolvedAt,
      createdAt: observationRouting.createdAt,
      rawInput: observations.rawInput,
      observerName: teamMembers.name,
    })
    .from(observationRouting)
    .leftJoin(observations, eq(observationRouting.observationId, observations.id))
    .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
    .where(condition)
    .orderBy(desc(observationRouting.createdAt))
    .limit(50);

  return NextResponse.json(records);
}

// PATCH: update routing status
export async function PATCH(request: Request) {
  const { id, status } = await request.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const validStatuses = ["acknowledged", "in_progress", "resolved"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === "acknowledged") updates.acknowledgedAt = new Date();
  if (status === "resolved") updates.resolvedAt = new Date();

  await db
    .update(observationRouting)
    .set(updates)
    .where(eq(observationRouting.id, id));

  return NextResponse.json({ success: true });
}

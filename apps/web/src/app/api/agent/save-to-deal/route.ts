export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { activities } from "@nexus/db";
import { eq, and, gte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, memberId, title, description } = await request.json();

  if (!dealId || !memberId || !title) {
    return NextResponse.json({ error: "dealId, memberId, title are required" }, { status: 400 });
  }

  // Dedup: check if same subject+deal exists from the last hour — update instead of insert
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.dealId, dealId),
        eq(activities.subject, title),
        gte(activities.createdAt, oneHourAgo)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(activities)
      .set({ description, metadata: { source: "agent_action" }, createdAt: new Date() })
      .where(eq(activities.id, existing[0].id));
  } else {
    await db.insert(activities).values({
      dealId,
      teamMemberId: memberId,
      type: "note_added",
      subject: title,
      description,
      metadata: { source: "agent_action" },
    });
  }

  return NextResponse.json({ ok: true });
}

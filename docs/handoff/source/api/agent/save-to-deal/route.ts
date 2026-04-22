export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { activities } from "@nexus/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, memberId, title, description, fullMetadata, activityType } = await request.json();

  if (!dealId || !memberId || !title) {
    return NextResponse.json({ error: "dealId, memberId, title are required" }, { status: 400 });
  }

  // Determine real type — use provided activityType, or infer from metadata source
  const type = activityType || "note_added";

  // Use fullMetadata if provided (call prep / email draft with full brief), else default
  const metadata = fullMetadata || { source: "agent_action" };

  // Dedup: check for same type+deal from today
  const existing = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.dealId, dealId),
        eq(activities.type, type),
        eq(activities.subject, title),
        gte(activities.createdAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(activities)
      .set({ description, metadata, createdAt: new Date() })
      .where(eq(activities.id, existing[0].id));
  } else {
    await db.insert(activities).values({
      dealId,
      teamMemberId: memberId,
      type,
      subject: title,
      description,
      metadata,
    });
  }

  return NextResponse.json({ ok: true });
}

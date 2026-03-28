export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { activities } from "@nexus/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, memberId, title, description } = await request.json();

  if (!dealId || !memberId || !title) {
    return NextResponse.json({ error: "dealId, memberId, title are required" }, { status: 400 });
  }

  await db.insert(activities).values({
    dealId,
    teamMemberId: memberId,
    type: "note_added",
    subject: title,
    description,
    metadata: { source: "agent_action" },
  });

  return NextResponse.json({ ok: true });
}

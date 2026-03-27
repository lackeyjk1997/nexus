export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { activities, deals, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, analysis } = await request.json();

  if (!dealId || !analysis) {
    return NextResponse.json(
      { error: "dealId and analysis are required" },
      { status: 400 }
    );
  }

  // Get the deal's AE to attribute the activity
  const [deal] = await db
    .select({ assignedAeId: deals.assignedAeId })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Get a fallback team member if no AE assigned
  let memberId = deal.assignedAeId;
  if (!memberId) {
    const [first] = await db.select({ id: teamMembers.id }).from(teamMembers).limit(1);
    memberId = first?.id ?? null;
  }

  if (!memberId) {
    return NextResponse.json(
      { error: "No team member found" },
      { status: 500 }
    );
  }

  await db.insert(activities).values({
    dealId,
    teamMemberId: memberId,
    type: "note_added",
    subject: `AI Transcript Analysis — Deal Score: ${analysis.dealScore?.score ?? "N/A"}/100`,
    description: analysis.summary,
    metadata: analysis,
  });

  return NextResponse.json({ success: true });
}

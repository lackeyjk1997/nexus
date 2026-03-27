export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { activities, deals, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, companyId, analysis } = await request.json();

  if ((!dealId && !companyId) || !analysis) {
    return NextResponse.json(
      { error: "dealId or companyId, and analysis are required" },
      { status: 400 }
    );
  }

  // Get a team member to attribute the activity
  let memberId: string | null = null;

  if (dealId) {
    const [deal] = await db
      .select({ assignedAeId: deals.assignedAeId })
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);
    memberId = deal?.assignedAeId ?? null;
  }

  if (!memberId) {
    const [first] = await db.select({ id: teamMembers.id }).from(teamMembers).limit(1);
    memberId = first?.id ?? null;
  }

  if (!memberId) {
    return NextResponse.json({ error: "No team member found" }, { status: 500 });
  }

  await db.insert(activities).values({
    dealId: dealId || null,
    teamMemberId: memberId,
    type: "note_added",
    subject: `AI Transcript Analysis — Deal Score: ${analysis.dealScore?.score ?? "N/A"}/100`,
    description: analysis.summary,
    metadata: analysis,
  });

  return NextResponse.json({ success: true });
}

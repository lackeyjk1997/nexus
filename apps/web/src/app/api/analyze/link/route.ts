export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { activities, deals, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, companyId, analysis, transcriptText } = await request.json();

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
    type: "call_analysis",
    subject: `AI Transcript Analysis — Deal Score: ${analysis.dealScore?.score ?? "N/A"}/100`,
    description: analysis.summary,
    metadata: { ...analysis, source: "call_analysis" },
  });

  // Trigger the transcript pipeline if we have a deal and transcript text
  if (dealId && transcriptText) {
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3001");
      await fetch(`${appUrl}/api/transcript-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, transcriptText }),
      });
    } catch (e) {
      console.error("Failed to trigger transcript pipeline:", e);
      // Don't fail the link operation — pipeline is bonus, not required
    }
  }

  return NextResponse.json({ success: true });
}

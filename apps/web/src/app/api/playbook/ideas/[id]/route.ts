import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { playbookIdeas } from "@nexus/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(playbookIdeas)
      .where(eq(playbookIdeas.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingResults = (existing.results as Record<string, unknown>) || {};

    await db
      .update(playbookIdeas)
      .set({
        results: {
          ...existingResults,
          structured_feedback: body.structured_feedback,
        },
        ...(body.status ? { status: body.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(playbookIdeas.id, id));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("PATCH /api/playbook/ideas/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

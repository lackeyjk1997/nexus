import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { playbookIdeas } from "@nexus/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const updateData: Record<string, unknown> = {
    results: {
      ...existingResults,
      structured_feedback: body.structured_feedback,
    },
    updatedAt: new Date().toISOString(),
  };

  if (body.status) {
    updateData.status = body.status;
  }

  await db
    .update(playbookIdeas)
    .set(updateData)
    .where(eq(playbookIdeas.id, id));

  return NextResponse.json({ success: true, id });
}

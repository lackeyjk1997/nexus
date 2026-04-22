export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const EDITABLE_FIELDS = ["close_date", "stage", "win_probability"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        if (field === "close_date") {
          updates.closeDate = body.close_date ? new Date(body.close_date + "T00:00:00") : null;
        } else if (field === "win_probability") {
          updates.winProbability = body.win_probability;
        } else if (field === "stage") {
          updates.stage = body.stage;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(deals)
      .set(updates)
      .where(eq(deals.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[deals/update] Error:", error);
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

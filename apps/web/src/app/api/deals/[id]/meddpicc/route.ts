export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { meddpiccFields } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: dealId } = await params;

  const [result] = await db
    .select()
    .from(meddpiccFields)
    .where(eq(meddpiccFields.dealId, dealId))
    .limit(1);

  if (!result) {
    return NextResponse.json(null);
  }

  return NextResponse.json(result);
}

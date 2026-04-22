export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observationClusters } from "@nexus/db";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const clusters = await db
    .select()
    .from(observationClusters)
    .orderBy(desc(observationClusters.lastObserved));

  return NextResponse.json(clusters);
}

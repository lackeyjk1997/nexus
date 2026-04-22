export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { coordinatorPatterns } from "@nexus/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patternId,
      signalType,
      vertical,
      competitor,
      dealIds,
      dealNames,
      synthesis,
      recommendations,
      arrImpact,
      dealCount,
      detectedAt,
      synthesizedAt,
    } = body;

    if (!patternId || !signalType) {
      return Response.json(
        { error: "patternId and signalType are required" },
        { status: 400 }
      );
    }

    // Upsert: update if patternId exists, insert otherwise
    const existing = await db
      .select({ id: coordinatorPatterns.id })
      .from(coordinatorPatterns)
      .where(eq(coordinatorPatterns.patternId, patternId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(coordinatorPatterns)
        .set({
          signalType,
          vertical,
          competitor,
          dealIds,
          dealNames,
          synthesis,
          recommendations,
          arrImpact: arrImpact ?? 0,
          dealCount: dealCount ?? 0,
          synthesizedAt: synthesizedAt ? new Date(synthesizedAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(coordinatorPatterns.patternId, patternId));
    } else {
      await db.insert(coordinatorPatterns).values({
        patternId,
        signalType,
        vertical,
        competitor,
        dealIds,
        dealNames,
        synthesis,
        recommendations,
        arrImpact: arrImpact ?? 0,
        dealCount: dealCount ?? 0,
        detectedAt: detectedAt ? new Date(detectedAt) : new Date(),
        synthesizedAt: synthesizedAt ? new Date(synthesizedAt) : null,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to persist coordinator pattern:", error);
    return Response.json(
      { error: "Failed to persist pattern" },
      { status: 500 }
    );
  }
}

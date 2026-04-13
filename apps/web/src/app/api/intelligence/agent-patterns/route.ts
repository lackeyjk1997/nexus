export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { createClient } from "rivetkit/client";
import type { Registry } from "@/actors/registry";
import { db } from "@/lib/db";
import { coordinatorPatterns } from "@nexus/db";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  // Try the actor first (fast path, in-memory)
  try {
    const endpoint =
      process.env.RIVET_ENDPOINT ||
      `${process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3001}`}/api/rivet`;

    const client = createClient<Registry>(endpoint);
    const coordinator = client.intelligenceCoordinator.getOrCreate(["default"]);

    const patterns = await coordinator.getPatterns();
    const status = await coordinator.getStatus();

    // If the actor has synthesized patterns, return them
    if (patterns && patterns.length > 0) {
      return Response.json({ patterns, status });
    }
  } catch (e) {
    console.log("Actor unavailable, falling back to database:", (e as Error).message);
  }

  // Fallback: read persisted patterns from database
  try {
    const dbPatterns = await db
      .select()
      .from(coordinatorPatterns)
      .where(eq(coordinatorPatterns.status, "active"))
      .orderBy(desc(coordinatorPatterns.createdAt));

    // Map DB rows to the same shape the client expects
    const patterns = dbPatterns.map((row) => ({
      id: row.patternId,
      signalType: row.signalType,
      vertical: row.vertical,
      competitor: row.competitor,
      dealIds: row.dealIds || [],
      dealNames: row.dealNames || [],
      signals: [],
      signalCount: row.dealCount,
      synthesis: row.synthesis || "",
      recommendations: (row.recommendations as string[]) || [],
      arrImpact: row.arrImpact || 0,
      detectedAt: row.detectedAt?.toISOString() || "",
      synthesizedAt: row.synthesizedAt?.toISOString() || null,
      pushStatus: "pushed" as const,
    }));

    return Response.json({
      patterns,
      status: {
        totalSignalsReceived: 0,
        totalPatternsDetected: patterns.length,
        activePatterns: patterns.length,
        lastSynthesisRun: null,
        source: "database",
      },
    });
  } catch (dbErr) {
    console.error("Failed to fetch patterns from database:", dbErr);
    return Response.json({ patterns: [], status: null });
  }
}

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observationClusters } from "@nexus/db";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clusters = await db
      .select({
        id: observationClusters.id,
        title: observationClusters.title,
        severity: observationClusters.severity,
        resolutionStatus: observationClusters.resolutionStatus,
        observationCount: observationClusters.observationCount,
        arrImpactTotal: observationClusters.arrImpactTotal,
      })
      .from(observationClusters)
      .orderBy(desc(observationClusters.lastObserved))
      .limit(10);

    // Generate suggestions from active clusters with highest severity
    const suggestions: Array<{ question: string; fullQuestion: string; clusterId: string }> = [];

    const activeClusters = clusters.filter(
      (c) => c.resolutionStatus !== "resolved" && c.resolutionStatus !== "dismissed"
    );

    for (const cluster of activeClusters.slice(0, 5)) {
      const title = cluster.title || "";
      const arr = Number(cluster.arrImpactTotal || 0);
      const arrText = arr > 0 ? ` (${formatCompact(arr)} at risk)` : "";

      if (cluster.severity === "critical") {
        suggestions.push({
          question: `${shortTitle(title)} impact?`,
          fullQuestion: `What's the current impact of ${title.toLowerCase()} on our pipeline?`,
          clusterId: cluster.id,
        });
      } else if (cluster.severity === "concerning") {
        suggestions.push({
          question: `${shortTitle(title)} status?`,
          fullQuestion: `Are we making progress on ${title.toLowerCase()}?${arrText}`,
          clusterId: cluster.id,
        });
      } else {
        suggestions.push({
          question: `${shortTitle(title)} trend?`,
          fullQuestion: `Is ${title.toLowerCase()} getting better or worse?`,
          clusterId: cluster.id,
        });
      }

      if (suggestions.length >= 3) break;
    }

    return NextResponse.json(suggestions);
  } catch {
    return NextResponse.json([]);
  }
}

function shortTitle(title: string): string {
  // Take first 4-5 meaningful words
  const words = title.split(/\s+/).filter((w) => w.length > 2);
  return words.slice(0, 4).join(" ");
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n}`;
}

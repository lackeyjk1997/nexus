export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observationClusters, observations, teamMembers, observationRouting } from "@nexus/db";
import { desc, eq, isNotNull } from "drizzle-orm";
import { IntelligenceClient } from "./intelligence-client";

export default async function IntelligencePage() {
  const [clusters, allObservations, acknowledgedRoutings] = await Promise.all([
    db.select().from(observationClusters).orderBy(desc(observationClusters.lastObserved)),
    db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        status: observations.status,
        aiClassification: observations.aiClassification,
        clusterId: observations.clusterId,
        arrImpact: observations.arrImpact,
        structuredData: observations.structuredData,
        createdAt: observations.createdAt,
        observerRole: teamMembers.role,
      })
      .from(observations)
      .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
      .orderBy(desc(observations.createdAt)),
    db
      .select({
        createdAt: observationRouting.createdAt,
        acknowledgedAt: observationRouting.acknowledgedAt,
      })
      .from(observationRouting)
      .where(isNotNull(observationRouting.acknowledgedAt)),
  ]);

  // Calculate average response time
  let avgResponseText = "No data";
  if (acknowledgedRoutings.length > 0) {
    const totalMs = acknowledgedRoutings.reduce((sum, r) => {
      return sum + (new Date(r.acknowledgedAt!).getTime() - new Date(r.createdAt).getTime());
    }, 0);
    const avgHours = totalMs / acknowledgedRoutings.length / (1000 * 60 * 60);
    if (avgHours < 1) avgResponseText = `${Math.round(avgHours * 60)}m`;
    else if (avgHours < 24) avgResponseText = `${avgHours.toFixed(1)}h`;
    else avgResponseText = `${(avgHours / 24).toFixed(1)}d`;
  }

  return (
    <IntelligenceClient
      clusters={clusters}
      observations={allObservations}
      avgResponseTime={avgResponseText}
    />
  );
}

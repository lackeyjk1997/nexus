export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observationClusters, observations, teamMembers } from "@nexus/db";
import { desc, eq } from "drizzle-orm";
import { IntelligenceClient } from "./intelligence-client";

export default async function IntelligencePage() {
  const [clusters, allObservations] = await Promise.all([
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
  ]);

  return (
    <IntelligenceClient clusters={clusters} observations={allObservations} />
  );
}

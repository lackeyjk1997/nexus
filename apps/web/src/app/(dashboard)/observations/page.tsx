export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observations, observationClusters, teamMembers } from "@nexus/db";
import { desc, eq } from "drizzle-orm";
import { ObservationsClient } from "./observations-client";

export default async function ObservationsPage() {
  const allObservations = await db
    .select({
      id: observations.id,
      observerId: observations.observerId,
      rawInput: observations.rawInput,
      status: observations.status,
      aiClassification: observations.aiClassification,
      aiGiveback: observations.aiGiveback,
      clusterId: observations.clusterId,
      lifecycleEvents: observations.lifecycleEvents,
      createdAt: observations.createdAt,
      observerName: teamMembers.name,
      observerRole: teamMembers.role,
    })
    .from(observations)
    .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
    .orderBy(desc(observations.createdAt));

  const clusters = await db
    .select()
    .from(observationClusters)
    .orderBy(desc(observationClusters.lastObserved));

  return (
    <ObservationsClient
      observations={allObservations}
      clusters={clusters}
    />
  );
}

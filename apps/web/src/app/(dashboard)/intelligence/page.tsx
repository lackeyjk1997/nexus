export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observationClusters, observations, teamMembers, observationRouting, deals } from "@nexus/db";
import { desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { IntelligenceClient } from "./intelligence-client";

type CloseFactor = {
  id: string;
  label: string;
  category: string;
  source: string;
  confirmed: boolean;
  evidence: string | null;
  repNote: string | null;
};

export default async function IntelligencePage() {
  const [clusters, allObservations, acknowledgedRoutings, closedDeals] = await Promise.all([
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
        observerId: observations.observerId,
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
    // Close intelligence: deals with factors
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        vertical: deals.vertical,
        closeFactors: deals.closeFactors,
        winFactors: deals.winFactors,
        closeAiAnalysis: deals.closeAiAnalysis,
      })
      .from(deals)
      .where(
        or(
          isNotNull(deals.closeFactors),
          isNotNull(deals.winFactors)
        )
      ),
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

  // Aggregate close intelligence
  const lossFactors: Record<string, { count: number; totalArr: number; labels: string[] }> = {};
  const winFactors: Record<string, { count: number; totalArr: number; labels: string[] }> = {};
  let lostDealCount = 0;
  let wonDealCount = 0;
  let totalLostArr = 0;
  let totalWonArr = 0;

  for (const deal of closedDeals) {
    const value = Number(deal.dealValue || 0);
    if (deal.closeFactors) {
      lostDealCount++;
      totalLostArr += value;
      for (const factor of deal.closeFactors as CloseFactor[]) {
        if (!factor.confirmed) continue;
        const key = factor.category;
        if (!lossFactors[key]) lossFactors[key] = { count: 0, totalArr: 0, labels: [] };
        lossFactors[key].count++;
        lossFactors[key].totalArr += value;
        if (!lossFactors[key].labels.includes(factor.label)) {
          lossFactors[key].labels.push(factor.label);
        }
      }
    }
    if (deal.winFactors) {
      wonDealCount++;
      totalWonArr += value;
      for (const factor of deal.winFactors as CloseFactor[]) {
        if (!factor.confirmed) continue;
        const key = factor.category;
        if (!winFactors[key]) winFactors[key] = { count: 0, totalArr: 0, labels: [] };
        winFactors[key].count++;
        winFactors[key].totalArr += value;
        if (!winFactors[key].labels.includes(factor.label)) {
          winFactors[key].labels.push(factor.label);
        }
      }
    }
  }

  const closeIntelligence = (lostDealCount > 0 || wonDealCount > 0) ? {
    lostDealCount,
    wonDealCount,
    totalLostArr,
    totalWonArr,
    lossFactors: Object.entries(lossFactors)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalArr - a.totalArr),
    winFactors: Object.entries(winFactors)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalArr - a.totalArr),
  } : null;

  return (
    <IntelligenceClient
      clusters={clusters}
      observations={allObservations}
      avgResponseTime={avgResponseText}
      closeIntelligence={closeIntelligence}
    />
  );
}

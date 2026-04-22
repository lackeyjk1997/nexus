export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  playbookIdeas,
  influenceScores,
  teamMembers,
  systemIntelligence,
} from "@nexus/db";
import { desc, eq, sql } from "drizzle-orm";
import { PlaybookClient } from "./playbook-client";

type PlaybookResults = {
  stage_velocity_change?: number;
  sentiment_shift?: number;
  adoption_count?: number;
  deals_influenced?: number;
  arr_influenced?: number;
  close_rate_test?: number | null;
  close_rate_control?: number | null;
  confidence?: string;
  measurement_period_days?: number;
};

type Attribution = {
  type: string;
  description: string;
  arr_impact: number;
  date: string;
};

type SupportingData = {
  sample_size?: number;
  time_range?: string;
  metric?: string;
};

export default async function PlaybookPage() {
  const [rawIdeas, rawScores, members, rawSignals] = await Promise.all([
    db
      .select({
        id: playbookIdeas.id,
        originatorId: playbookIdeas.originatorId,
        originatedFrom: playbookIdeas.originatedFrom,
        title: playbookIdeas.title,
        hypothesis: playbookIdeas.hypothesis,
        category: playbookIdeas.category,
        vertical: playbookIdeas.vertical,
        status: playbookIdeas.status,
        testStartDate: playbookIdeas.testStartDate,
        testEndDate: playbookIdeas.testEndDate,
        testGroupDeals: playbookIdeas.testGroupDeals,
        controlGroupDeals: playbookIdeas.controlGroupDeals,
        results: playbookIdeas.results,
        followers: playbookIdeas.followers,
        followerCount: playbookIdeas.followerCount,
        testGroup: playbookIdeas.testGroup,
        controlGroup: playbookIdeas.controlGroup,
        successThresholds: playbookIdeas.successThresholds,
        currentMetrics: playbookIdeas.currentMetrics,
        approvedBy: playbookIdeas.approvedBy,
        approvedAt: playbookIdeas.approvedAt,
        graduatedAt: playbookIdeas.graduatedAt,
        experimentDurationDays: playbookIdeas.experimentDurationDays,
        experimentStart: playbookIdeas.experimentStart,
        experimentEnd: playbookIdeas.experimentEnd,
        attribution: playbookIdeas.attribution,
        createdAt: playbookIdeas.createdAt,
      })
      .from(playbookIdeas)
      .orderBy(desc(playbookIdeas.createdAt)),

    db
      .select({
        id: influenceScores.id,
        memberId: influenceScores.memberId,
        dimension: influenceScores.dimension,
        vertical: influenceScores.vertical,
        score: influenceScores.score,
        tier: influenceScores.tier,
        attributions: influenceScores.attributions,
        lastContributionAt: influenceScores.lastContributionAt,
      })
      .from(influenceScores),

    db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        role: teamMembers.role,
        verticalSpecialization: teamMembers.verticalSpecialization,
      })
      .from(teamMembers),

    db
      .select({
        id: systemIntelligence.id,
        vertical: systemIntelligence.vertical,
        title: systemIntelligence.title,
        insight: systemIntelligence.insight,
        confidence: systemIntelligence.confidence,
        supportingData: systemIntelligence.supportingData,
      })
      .from(systemIntelligence)
      .where(eq(systemIntelligence.insightType, "market_signal"))
      .orderBy(desc(systemIntelligence.relevanceScore)),
  ]);

  // Safely fetch experiment_evidence (column may not exist in older DBs)
  let evidenceMap = new Map<string, unknown>();
  try {
    const evidenceRows = await db.execute(
      sql`SELECT id, experiment_evidence FROM playbook_ideas WHERE experiment_evidence IS NOT NULL`
    ) as unknown as Array<{ id: string; experiment_evidence: unknown }>;
    for (const row of evidenceRows) {
      evidenceMap.set(row.id, row.experiment_evidence);
    }
  } catch {
    // Column doesn't exist yet — safe to ignore
  }

  // Cast jsonb columns to typed shapes
  const ideas = rawIdeas.map((row) => ({
    ...row,
    results: (row.results ?? null) as PlaybookResults | null,
    successThresholds: (row.successThresholds ?? null) as Record<string, number> | null,
    currentMetrics: (row.currentMetrics ?? null) as Record<string, number> | null,
    attribution: (row.attribution ?? null) as Record<string, unknown> | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    experimentEvidence: (evidenceMap.get(row.id) ?? null) as any,
  }));

  const scores = rawScores.map((row) => ({
    ...row,
    attributions: (row.attributions ?? null) as Attribution[] | null,
  }));

  const marketSignals = rawSignals.map((row) => ({
    ...row,
    supportingData: (row.supportingData ?? null) as SupportingData | null,
  }));

  return (
    <PlaybookClient
      ideas={ideas}
      scores={scores}
      members={members}
      marketSignals={marketSignals}
    />
  );
}

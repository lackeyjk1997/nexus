export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  deals,
  companies,
  teamMembers,
  contacts,
  meddpiccFields,
  dealMilestones,
  activities,
  callTranscripts,
  callAnalyses,
  dealStageHistory,
  observations,
  observationClusters,
} from "@nexus/db";
import { eq, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DealDetailClient } from "./deal-detail-client";

export default async function DealDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Fetch deal with company and AE
  const [deal] = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      dealValue: deals.dealValue,
      currency: deals.currency,
      closeDate: deals.closeDate,
      winProbability: deals.winProbability,
      forecastCategory: deals.forecastCategory,
      vertical: deals.vertical,
      product: deals.product,
      leadSource: deals.leadSource,
      competitor: deals.competitor,
      lossReason: deals.lossReason,
      closeCompetitor: deals.closeCompetitor,
      closeNotes: deals.closeNotes,
      closeImprovement: deals.closeImprovement,
      winTurningPoint: deals.winTurningPoint,
      winReplicable: deals.winReplicable,
      closeAiAnalysis: deals.closeAiAnalysis,
      closeFactors: deals.closeFactors,
      winFactors: deals.winFactors,
      closedAt: deals.closedAt,
      stageEnteredAt: deals.stageEnteredAt,
      createdAt: deals.createdAt,
      companyId: deals.companyId,
      companyName: companies.name,
      companyDomain: companies.domain,
      companyIndustry: companies.industry,
      companyEmployeeCount: companies.employeeCount,
      companyRevenue: companies.annualRevenue,
      companyHq: companies.hqLocation,
      companyTechStack: companies.techStack,
      companyDescription: companies.description,
      aeName: teamMembers.name,
      aeId: teamMembers.id,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id))
    .where(eq(deals.id, id))
    .limit(1);

  if (!deal) return notFound();

  // Fetch related data in parallel
  const [
    meddpicc,
    milestones,
    dealContacts,
    dealActivities,
    transcripts,
    stageHistory,
    dealObservations,
  ] = await Promise.all([
    db
      .select()
      .from(meddpiccFields)
      .where(eq(meddpiccFields.dealId, id))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(dealMilestones)
      .where(eq(dealMilestones.dealId, id))
      .orderBy(dealMilestones.createdAt),
    db
      .select()
      .from(contacts)
      .where(eq(contacts.companyId, deal.companyId)),
    db
      .select({
        id: activities.id,
        type: activities.type,
        subject: activities.subject,
        description: activities.description,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        teamMemberName: teamMembers.name,
        teamMemberRole: teamMembers.role,
      })
      .from(activities)
      .leftJoin(teamMembers, eq(activities.teamMemberId, teamMembers.id))
      .where(eq(activities.dealId, id))
      .orderBy(desc(activities.createdAt)),
    db
      .select({
        id: callTranscripts.id,
        title: callTranscripts.title,
        date: callTranscripts.date,
        durationSeconds: callTranscripts.durationSeconds,
        participants: callTranscripts.participants,
        transcriptText: callTranscripts.transcriptText,
        status: callTranscripts.status,
        analysisSummary: callAnalyses.summary,
        callQualityScore: callAnalyses.callQualityScore,
        painPoints: callAnalyses.painPoints,
        nextSteps: callAnalyses.nextSteps,
        talkRatio: callAnalyses.talkRatio,
        coachingInsights: callAnalyses.coachingInsights,
        pipelineProcessed: callTranscripts.pipelineProcessed,
      })
      .from(callTranscripts)
      .leftJoin(callAnalyses, eq(callTranscripts.id, callAnalyses.transcriptId))
      .where(eq(callTranscripts.dealId, id))
      .orderBy(desc(callTranscripts.date)),
    db
      .select()
      .from(dealStageHistory)
      .where(eq(dealStageHistory.dealId, id))
      .orderBy(desc(dealStageHistory.createdAt)),
    // Observations linked to this deal (via sourceContext.dealId OR entity-extracted linkedDealIds)
    db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        status: observations.status,
        aiClassification: observations.aiClassification,
        arrImpact: observations.arrImpact,
        clusterId: observations.clusterId,
        createdAt: observations.createdAt,
        observerName: teamMembers.name,
      })
      .from(observations)
      .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
      .where(
        sql`${observations.sourceContext}->>'dealId' = ${id} OR ${id} = ANY(${observations.linkedDealIds})`
      )
      .orderBy(desc(observations.createdAt)),
  ]);

  return (
    <DealDetailClient
      deal={deal}
      meddpicc={meddpicc}
      milestones={milestones}
      contacts={dealContacts}
      activities={dealActivities as import("@/components/activity-feed").ActivityItem[]}
      transcripts={transcripts}
      stageHistory={stageHistory}
      dealObservations={dealObservations}
    />
  );
}

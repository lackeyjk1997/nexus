export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  deals,
  companies,
  teamMembers,
  dealFitnessEvents,
  dealFitnessScores,
} from "@nexus/db";
import { eq, asc, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");

  // ── Portfolio view (all deals with fitness scores) ──
  if (!dealId) {
    const rows = await db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        vertical: deals.vertical,
        closeDate: deals.closeDate,
        companyName: companies.name,
        assignedAeName: teamMembers.name,
        businessFitScore: dealFitnessScores.businessFitScore,
        emotionalFitScore: dealFitnessScores.emotionalFitScore,
        technicalFitScore: dealFitnessScores.technicalFitScore,
        readinessFitScore: dealFitnessScores.readinessFitScore,
        overallFitness: dealFitnessScores.overallFitness,
        velocityTrend: dealFitnessScores.velocityTrend,
        daysSinceLastEvent: dealFitnessScores.daysSinceLastEvent,
        fitImbalanceFlag: dealFitnessScores.fitImbalanceFlag,
      })
      .from(dealFitnessScores)
      .innerJoin(deals, eq(dealFitnessScores.dealId, deals.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id));

    // Sort: imbalance flag first, then lowest overall fitness first (most concerning surface)
    const portfolio = rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        companyName: r.companyName,
        stage: r.stage,
        dealValue: r.dealValue,
        vertical: r.vertical,
        closeDate: r.closeDate,
        assignedAeName: r.assignedAeName,
        scores: {
          businessFitScore: r.businessFitScore,
          emotionalFitScore: r.emotionalFitScore,
          technicalFitScore: r.technicalFitScore,
          readinessFitScore: r.readinessFitScore,
          overallFitness: r.overallFitness,
          velocityTrend: r.velocityTrend,
          daysSinceLastEvent: r.daysSinceLastEvent,
          fitImbalanceFlag: r.fitImbalanceFlag,
        },
      }))
      .sort((a, b) => {
        const flagDiff =
          (b.scores.fitImbalanceFlag ? 1 : 0) - (a.scores.fitImbalanceFlag ? 1 : 0);
        if (flagDiff !== 0) return flagDiff;
        return (a.scores.overallFitness ?? 0) - (b.scores.overallFitness ?? 0);
      });

    return NextResponse.json({ deals: portfolio });
  }

  // ── Single-deal view ──
  const [dealRow] = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      dealValue: deals.dealValue,
      vertical: deals.vertical,
      closeDate: deals.closeDate,
      companyName: companies.name,
      assignedAeName: teamMembers.name,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id))
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!dealRow) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const [scoresRow] = await db
    .select()
    .from(dealFitnessScores)
    .where(eq(dealFitnessScores.dealId, dealId))
    .limit(1);

  const eventRows = await db
    .select()
    .from(dealFitnessEvents)
    .where(eq(dealFitnessEvents.dealId, dealId))
    .orderBy(asc(dealFitnessEvents.fitCategory), desc(dealFitnessEvents.detectedAt));

  // Group events by fit category. Inside each category: detected first
  // (chronological), then not_yet events.
  const grouped: Record<string, typeof eventRows> = {
    business_fit: [],
    emotional_fit: [],
    technical_fit: [],
    readiness_fit: [],
  };
  for (const e of eventRows) {
    if (grouped[e.fitCategory]) grouped[e.fitCategory].push(e);
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => {
      // detected (with detectedAt) before not_yet (null)
      if (a.detectedAt && !b.detectedAt) return -1;
      if (!a.detectedAt && b.detectedAt) return 1;
      if (a.detectedAt && b.detectedAt) {
        return a.detectedAt.getTime() - b.detectedAt.getTime();
      }
      return 0;
    });
  }

  // Velocity timeline = all detected events sorted by detectedAt asc
  const timeline = eventRows
    .filter((e) => e.detectedAt)
    .sort((a, b) => a.detectedAt!.getTime() - b.detectedAt!.getTime())
    .map((e) => ({
      date: e.detectedAt,
      eventKey: e.eventKey,
      eventLabel: e.eventLabel,
      fitCategory: e.fitCategory,
      contactName: e.contactName,
    }));

  return NextResponse.json({
    deal: dealRow,
    scores: scoresRow
      ? {
          businessFitScore: scoresRow.businessFitScore,
          businessFitDetected: scoresRow.businessFitDetected,
          businessFitTotal: scoresRow.businessFitTotal,
          emotionalFitScore: scoresRow.emotionalFitScore,
          emotionalFitDetected: scoresRow.emotionalFitDetected,
          emotionalFitTotal: scoresRow.emotionalFitTotal,
          technicalFitScore: scoresRow.technicalFitScore,
          technicalFitDetected: scoresRow.technicalFitDetected,
          technicalFitTotal: scoresRow.technicalFitTotal,
          readinessFitScore: scoresRow.readinessFitScore,
          readnessFitDetected: scoresRow.readnessFitDetected,
          readinessFitTotal: scoresRow.readinessFitTotal,
          overallFitness: scoresRow.overallFitness,
          velocityTrend: scoresRow.velocityTrend,
          lastEventAt: scoresRow.lastEventAt,
          daysSinceLastEvent: scoresRow.daysSinceLastEvent,
          fitImbalanceFlag: scoresRow.fitImbalanceFlag,
          eventsThisWeek: scoresRow.eventsThisWeek,
          eventsLastWeek: scoresRow.eventsLastWeek,
          benchmarkVsWon: scoresRow.benchmarkVsWon,
          stakeholderEngagement: scoresRow.stakeholderEngagement,
          buyerMomentum: scoresRow.buyerMomentum,
          conversationSignals: scoresRow.conversationSignals,
        }
      : null,
    events: grouped,
    timeline,
  });
}

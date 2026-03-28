export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  meddpiccFields,
  activities,
  teamMembers,
  observations,
  observationClusters,
  agentConfigs,
  callTranscripts,
  callAnalyses,
  resources,
} from "@nexus/db";
import { eq, desc, and, sql, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId: rawDealId, accountId: rawAccountId, memberId, rawQuery } = await request.json();

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // ── Resolve deal from rawQuery if no dealId provided ──
  let resolvedDealId = rawDealId as string | undefined;
  let resolvedAccountId = rawAccountId as string | undefined;

  if (!resolvedDealId && rawQuery) {
    const allDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        companyId: deals.companyId,
        companyName: companies.name,
        assignedAeId: deals.assignedAeId,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id));

    const lower = (rawQuery as string).toLowerCase();

    // Try to match by company name or deal name
    const match = allDeals.find((d) => {
      const companyWords = (d.companyName || "").toLowerCase().split(/\s+/);
      const dealWords = (d.name || "").toLowerCase().split(/\s+/);
      return (
        companyWords.some((w) => w.length >= 4 && lower.includes(w)) ||
        dealWords.some((w) => w.length >= 4 && lower.includes(w))
      );
    });

    if (match) {
      resolvedDealId = match.id;
      resolvedAccountId = match.companyId;
    } else {
      // Fall back to the AE's most recent deal
      const [latestDeal] = await db
        .select({ id: deals.id, companyId: deals.companyId })
        .from(deals)
        .where(eq(deals.assignedAeId, memberId))
        .orderBy(desc(deals.createdAt))
        .limit(1);
      if (latestDeal) {
        resolvedDealId = latestDeal.id;
        resolvedAccountId = latestDeal.companyId;
      }
    }
  }

  if (!resolvedDealId) {
    return NextResponse.json({ error: "Could not resolve deal" }, { status: 400 });
  }

  // ── Gather all context in parallel ──
  const [
    dealRow,
    meddpicc,
    dealContacts,
    recentActivities,
    dealObservations,
    activeClusters,
    agentConfigRow,
    dealTranscripts,
    rep,
    allResources,
  ] = await Promise.all([
    db
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
        competitor: deals.competitor,
        stageEnteredAt: deals.stageEnteredAt,
        companyName: companies.name,
        companyIndustry: companies.industry,
        companyEmployeeCount: companies.employeeCount,
        companyDescription: companies.description,
        companyHq: companies.hqLocation,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.id, resolvedDealId!))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select()
      .from(meddpiccFields)
      .where(eq(meddpiccFields.dealId, resolvedDealId!))
      .limit(1)
      .then((r) => r[0] ?? null),

    resolvedAccountId
      ? db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            title: contacts.title,
            roleInDeal: contacts.roleInDeal,
            email: contacts.email,
          })
          .from(contacts)
          .where(eq(contacts.companyId, resolvedAccountId!))
      : Promise.resolve([]),

    db
      .select({
        type: activities.type,
        subject: activities.subject,
        description: activities.description,
        createdAt: activities.createdAt,
        teamMemberName: teamMembers.name,
      })
      .from(activities)
      .leftJoin(teamMembers, eq(activities.teamMemberId, teamMembers.id))
      .where(eq(activities.dealId, resolvedDealId!))
      .orderBy(desc(activities.createdAt))
      .limit(10),

    db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        aiClassification: observations.aiClassification,
        createdAt: observations.createdAt,
      })
      .from(observations)
      .where(
        sql`${observations.sourceContext}->>'dealId' = ${resolvedDealId} OR ${resolvedDealId} = ANY(${observations.linkedDealIds})`
      )
      .orderBy(desc(observations.createdAt))
      .limit(10),

    db
      .select({
        title: observationClusters.title,
        summary: observationClusters.summary,
        signalType: observationClusters.signalType,
        severity: observationClusters.severity,
        observationCount: observationClusters.observationCount,
        verticalsAffected: observationClusters.verticalsAffected,
      })
      .from(observationClusters)
      .where(eq(observationClusters.resolutionStatus, "emerging"))
      .orderBy(desc(observationClusters.arrImpactTotal))
      .limit(8),

    db
      .select({
        instructions: agentConfigs.instructions,
        outputPreferences: agentConfigs.outputPreferences,
      })
      .from(agentConfigs)
      .where(
        and(
          eq(agentConfigs.teamMemberId, memberId),
          eq(agentConfigs.isActive, true)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        title: callTranscripts.title,
        date: callTranscripts.date,
        summary: callAnalyses.summary,
        painPoints: callAnalyses.painPoints,
        nextSteps: callAnalyses.nextSteps,
        coachingInsights: callAnalyses.coachingInsights,
        competitiveMentions: callAnalyses.competitiveMentions,
        callQualityScore: callAnalyses.callQualityScore,
      })
      .from(callTranscripts)
      .leftJoin(callAnalyses, eq(callTranscripts.id, callAnalyses.transcriptId))
      .where(eq(callTranscripts.dealId, resolvedDealId!))
      .orderBy(desc(callTranscripts.date))
      .limit(3),

    db
      .select({ name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        title: resources.title,
        type: resources.type,
        description: resources.description,
        verticals: resources.verticals,
      })
      .from(resources),
  ]);

  if (!dealRow) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const outputPrefs = agentConfigRow?.outputPreferences as {
    communicationStyle?: string;
    guardrails?: string[];
    dealStageRules?: Record<string, string>;
    industryFocus?: string[];
  } | null;

  const daysInStage = dealRow.stageEnteredAt
    ? Math.floor((Date.now() - new Date(dealRow.stageEnteredAt).getTime()) / 86400000)
    : 0;

  // ── Filter clusters relevant to this deal's vertical ──
  const verticalClusters = activeClusters.filter(
    (c) => !c.verticalsAffected || c.verticalsAffected.includes(dealRow.vertical || "")
  );

  // ── Filter resources relevant to this deal's vertical ──
  const relevantResources = allResources.filter(
    (r) => !r.verticals || r.verticals.includes(dealRow.vertical || "") || r.verticals.includes("all")
  );

  // ── Build context for Claude ──
  const context = {
    rep_name: rep?.name || "the rep",
    deal: {
      name: dealRow.name,
      stage: dealRow.stage,
      value: dealRow.dealValue ? `€${Number(dealRow.dealValue).toLocaleString()}` : "Unknown",
      currency: dealRow.currency || "EUR",
      close_date: dealRow.closeDate ? new Date(dealRow.closeDate).toLocaleDateString("en-GB") : null,
      win_probability: dealRow.winProbability,
      forecast_category: dealRow.forecastCategory,
      days_in_stage: daysInStage,
      competitor: dealRow.competitor,
      vertical: dealRow.vertical,
    },
    account: {
      name: dealRow.companyName,
      industry: dealRow.companyIndustry,
      employees: dealRow.companyEmployeeCount,
      hq: dealRow.companyHq,
      description: dealRow.companyDescription,
    },
    meddpicc: meddpicc
      ? {
          metrics: meddpicc.metrics,
          metrics_confidence: meddpicc.metricsConfidence,
          economic_buyer: meddpicc.economicBuyer,
          economic_buyer_confidence: meddpicc.economicBuyerConfidence,
          decision_criteria: meddpicc.decisionCriteria,
          decision_criteria_confidence: meddpicc.decisionCriteriaConfidence,
          decision_process: meddpicc.decisionProcess,
          decision_process_confidence: meddpicc.decisionProcessConfidence,
          identify_pain: meddpicc.identifyPain,
          identify_pain_confidence: meddpicc.identifyPainConfidence,
          champion: meddpicc.champion,
          champion_confidence: meddpicc.championConfidence,
          competition: meddpicc.competition,
          competition_confidence: meddpicc.competitionConfidence,
        }
      : null,
    contacts: dealContacts.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      title: c.title,
      role: c.roleInDeal,
    })),
    recent_activities: recentActivities.map((a) => ({
      type: a.type,
      subject: a.subject,
      description: a.description,
      date: new Date(a.createdAt).toLocaleDateString("en-GB"),
      by: a.teamMemberName,
    })),
    field_intelligence: dealObservations.map((o) => ({
      text: o.rawInput,
      date: new Date(o.createdAt).toLocaleDateString("en-GB"),
      signals: (o.aiClassification as { signals?: Array<{ type: string }> } | null)?.signals?.map((s) => s.type) || [],
    })),
    team_intelligence: verticalClusters.map((c) => ({
      title: c.title,
      summary: c.summary,
      signal_type: c.signalType,
      severity: c.severity,
      observation_count: c.observationCount,
    })),
    previous_calls: dealTranscripts.map((t) => ({
      title: t.title,
      date: t.date ? new Date(t.date).toLocaleDateString("en-GB") : null,
      quality_score: t.callQualityScore,
      summary: t.summary,
      pain_points: t.painPoints,
      next_steps: t.nextSteps,
      competitive_mentions: t.competitiveMentions,
    })),
  };

  const systemPrompt = `You are an AI sales agent preparing a call brief for ${rep?.name || "a sales rep"}. You have access to comprehensive CRM data, field intelligence from the team, and the rep's personal selling style.

Generate a call brief that the rep can read in 2 minutes and walk into the call prepared.

${agentConfigRow ? `AGENT CONFIGURATION:
Instructions: ${agentConfigRow.instructions}
Communication style: ${outputPrefs?.communicationStyle || "Professional and data-driven"}
Guardrails: ${JSON.stringify(outputPrefs?.guardrails || [])}
Deal stage rules for ${dealRow.stage}: ${outputPrefs?.dealStageRules?.[dealRow.stage] || "Standard approach"}

DO NOT include anything that violates the guardrails above.` : ""}

AVAILABLE RESOURCES FROM THE KNOWLEDGE BASE:
${relevantResources.map(r => `- "${r.title}" (${r.type}) — ${r.description}`).join("\n")}

When recommending talking points or next steps, reference specific resources by name. Don't say "send documentation" — say "share the HIPAA Compliance FAQ" or "attach the Claude vs Copilot comparison." Only recommend resources that are genuinely relevant to this deal.

Return ONLY valid JSON with this exact structure:
{
  "headline": "One sentence — the most important thing to know going into this call",
  "deal_snapshot": {
    "stage": "current stage label",
    "value": "formatted deal value",
    "days_in_stage": "N days",
    "health": "on_track | at_risk | needs_attention",
    "health_reason": "one sentence"
  },
  "stakeholders_in_play": [
    {
      "name": "Full name",
      "title": "Title",
      "role": "Champion | Economic Buyer | Technical Evaluator | Blocker | End User",
      "engagement": "hot | warm | cold",
      "last_contact": "date or null",
      "notes": "one sentence — what to know about this person"
    }
  ],
  "talking_points": [
    {
      "topic": "Short topic name",
      "why": "Why this matters for this specific call",
      "approach": "How to bring it up"
    }
  ],
  "questions_to_ask": [
    {
      "question": "The actual question to ask",
      "purpose": "What intelligence this extracts",
      "meddpicc_gap": "Which MEDDPICC field this fills, or null"
    }
  ],
  "risks_and_landmines": [
    {
      "risk": "What could go wrong",
      "source": "observations | cluster | transcript | crm",
      "mitigation": "How to handle it"
    }
  ],
  "team_intelligence": [
    "Insight from field intelligence relevant to this call"
  ],
  "competitive_context": "1-2 sentences about competitive situation if relevant, null otherwise",
  "suggested_resources": [
    {
      "title": "Exact resource title from the list above",
      "type": "resource type",
      "why": "One sentence — why this resource is relevant to this specific call"
    }
  ],
  "suggested_next_steps": [
    "What to propose at end of call"
  ]
}`;

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate a call brief for the ${dealRow.companyName} deal.\n\nContext:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
    }

    const brief = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      brief,
      dealId: resolvedDealId,
      dealName: dealRow.name,
      accountName: dealRow.companyName,
    });
  } catch (err) {
    console.error("Call prep error:", err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}

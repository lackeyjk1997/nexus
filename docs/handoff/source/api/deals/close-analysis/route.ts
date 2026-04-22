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
  observations,
  callTranscripts,
  callAnalyses,
  systemIntelligence,
  dealStageHistory,
} from "@nexus/db";
import { eq, desc, and, sql, or, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { dealId, outcome } = await request.json();

  if (!dealId || !outcome) {
    return NextResponse.json({ error: "dealId and outcome required" }, { status: 400 });
  }

  // ── Gather all deal context in parallel ──
  const [
    dealRow,
    meddpicc,
    dealContacts,
    recentActivities,
    dealObservations,
    transcriptData,
    stageHistory,
  ] = await Promise.all([
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        currency: deals.currency,
        vertical: deals.vertical,
        competitor: deals.competitor,
        companyId: deals.companyId,
        companyName: companies.name,
        companyIndustry: companies.industry,
        createdAt: deals.createdAt,
        stageEnteredAt: deals.stageEnteredAt,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.id, dealId))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select()
      .from(meddpiccFields)
      .where(eq(meddpiccFields.dealId, dealId))
      .limit(1)
      .then((r) => r[0] ?? null),

    // Contacts are on the company, not the deal directly
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        title: contacts.title,
        roleInDeal: contacts.roleInDeal,
      })
      .from(contacts)
      .then((all) => all), // We'll filter by companyId after deal loads

    db
      .select({
        type: activities.type,
        subject: activities.subject,
        description: activities.description,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
        contactId: activities.contactId,
      })
      .from(activities)
      .where(eq(activities.dealId, dealId))
      .orderBy(desc(activities.createdAt))
      .limit(20),

    db
      .select({
        rawInput: observations.rawInput,
        aiClassification: observations.aiClassification,
        createdAt: observations.createdAt,
      })
      .from(observations)
      .where(
        or(
          sql`${observations.sourceContext}->>'dealId' = ${dealId}`,
          sql`${dealId} = ANY(${observations.linkedDealIds})`
        )
      )
      .orderBy(desc(observations.createdAt))
      .limit(10),

    db
      .select({
        title: callTranscripts.title,
        date: callTranscripts.date,
        summary: callAnalyses.summary,
        painPoints: callAnalyses.painPoints,
        nextSteps: callAnalyses.nextSteps,
        competitiveMentions: callAnalyses.competitiveMentions,
        callQualityScore: callAnalyses.callQualityScore,
        coachingInsights: callAnalyses.coachingInsights,
      })
      .from(callTranscripts)
      .leftJoin(callAnalyses, eq(callTranscripts.id, callAnalyses.transcriptId))
      .where(eq(callTranscripts.dealId, dealId))
      .orderBy(desc(callTranscripts.date))
      .limit(5),

    db
      .select({
        fromStage: dealStageHistory.fromStage,
        toStage: dealStageHistory.toStage,
        reason: dealStageHistory.reason,
        createdAt: dealStageHistory.createdAt,
      })
      .from(dealStageHistory)
      .where(eq(dealStageHistory.dealId, dealId))
      .orderBy(desc(dealStageHistory.createdAt))
      .limit(10),
  ]);

  if (!dealRow) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Filter contacts to this deal's company
  const companyContacts = dealContacts.filter((c) => {
    // We need the companyId — re-query if needed
    return true; // We'll handle this below
  });

  // Re-query contacts for the deal's company specifically
  let relevantContacts: typeof dealContacts = [];
  try {
    if (dealRow.companyId) {
      relevantContacts = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          title: contacts.title,
          roleInDeal: contacts.roleInDeal,
        })
        .from(contacts)
        .where(eq(contacts.companyId, dealRow.companyId));
    }
  } catch (err) {
    console.error("Contact query error:", err);
  }

  // Count activities per contact for engagement analysis
  const contactEngagement = new Map<string, number>();
  for (const contact of relevantContacts) {
    const name = `${contact.firstName} ${contact.lastName}`;
    let count = 0;
    for (const act of recentActivities) {
      if (
        act.contactId === contact.id ||
        (act.description && act.description.toLowerCase().includes(name.toLowerCase())) ||
        (act.subject && act.subject.toLowerCase().includes(name.toLowerCase()))
      ) {
        count++;
      }
    }
    contactEngagement.set(name, count);
  }

  // Get system intelligence for this vertical
  let sysIntel: { title: string; insight: string }[] = [];
  try {
    sysIntel = await db
      .select({
        title: systemIntelligence.title,
        insight: systemIntelligence.insight,
      })
      .from(systemIntelligence)
      .where(
        and(
          eq(systemIntelligence.status, "active"),
          or(
            eq(systemIntelligence.vertical, dealRow.vertical || ""),
            isNull(systemIntelligence.vertical)
          )
        )
      )
      .orderBy(desc(systemIntelligence.relevanceScore))
      .limit(5);
  } catch (err) {
    console.error("System intelligence query error:", err);
  }

  // Calculate days in pipeline
  const daysInPipeline = dealRow.createdAt
    ? Math.floor((Date.now() - new Date(dealRow.createdAt).getTime()) / 86400000)
    : 0;

  // ── Build Claude prompt ──
  const systemPrompt = `You are analyzing a sales deal that just closed ${outcome === "lost" ? "lost" : "won"}.
You have access to the complete deal history — transcripts, observations from the field, MEDDPICC scores,
stakeholder engagement patterns, stage velocity, and competitive intelligence.

Your job is to produce THREE outputs:

1. ANALYSIS: A structured analysis of the key factors that led to this ${outcome}.
   Each factor must cite specific evidence from the data (a transcript quote, an observation,
   a MEDDPICC gap, a stakeholder pattern). Do not speculate beyond what the data shows.

2. DYNAMIC_CHIPS: Suggested ${outcome === "lost" ? "loss" : "win"} factors as tappable chips for the rep to confirm or dismiss.
   These should be specific to THIS deal, not generic. Examples for losses:
   - "CompetitorX undercut pricing by 20%" (from transcript mention)
   - "CFO disengaged after Technical Validation" (from contact engagement data)
   - "Security review added 6 weeks" (from observation)
   Examples for wins:
   - "Champion built internal ROI case" (from observation)
   - "Compliance positioning locked out competitor" (from transcript)
   - "Multi-threaded across 4 stakeholders" (from contact data)
   NOT generic things like "Lost to competitor" — those are the fixed chips the system already provides.

3. DYNAMIC_QUESTIONS: 0-2 questions about things you suspect but can't confirm from data alone.
   Each question should have 3-4 chip options for quick answers.
   Only ask questions where the answer would change how the ${outcome} is categorized.
   If the data already tells the full story, return zero questions.

Respond ONLY in this exact JSON format (no markdown, no backticks, no preamble):
{
  "summary": "2-3 sentence plain English summary of what happened",
  "factors": [
    {
      "id": "factor_1",
      "label": "Short chip label (under 8 words)",
      "category": "${outcome === "lost" ? "competitor|stakeholder|process|product|pricing|timing|internal|champion" : "champion|technical_fit|pricing|timeline|relationship|competitive_wedge"}",
      "evidence": "The specific data point that suggests this",
      "confidence": "high|medium|low"
    }
  ],
  "questions": [
    {
      "id": "q_1",
      "question": "The question text",
      "chips": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "why": "Why this question matters"
    }
  ],
  "meddpicc_gaps": ["List any MEDDPICC fields that were critically low and likely contributed"],
  "stakeholder_flags": ["List any stakeholder engagement issues"]
}`;

  const userPrompt = `DEAL: ${dealRow.name} — ${dealRow.companyName}
OUTCOME: Closed ${outcome}
AMOUNT: €${Number(dealRow.dealValue || 0).toLocaleString()}
VERTICAL: ${dealRow.vertical || "Unknown"}
COMPETITOR: ${dealRow.competitor || "None identified"}
DAYS IN PIPELINE: ${daysInPipeline}

STAGE HISTORY:
${stageHistory.map((sh) => `[${new Date(sh.createdAt).toLocaleDateString("en-GB")}] ${sh.fromStage || "start"} → ${sh.toStage}${sh.reason ? ` (${sh.reason})` : ""}`).join("\n") || "No stage history"}

MEDDPICC SCORES:
${meddpicc ? `Metrics: ${meddpicc.metrics || "N/A"} (confidence: ${meddpicc.metricsConfidence}%)
Economic Buyer: ${meddpicc.economicBuyer || "N/A"} (confidence: ${meddpicc.economicBuyerConfidence}%)
Decision Criteria: ${meddpicc.decisionCriteria || "N/A"} (confidence: ${meddpicc.decisionCriteriaConfidence}%)
Decision Process: ${meddpicc.decisionProcess || "N/A"} (confidence: ${meddpicc.decisionProcessConfidence}%)
Identify Pain: ${meddpicc.identifyPain || "N/A"} (confidence: ${meddpicc.identifyPainConfidence}%)
Champion: ${meddpicc.champion || "N/A"} (confidence: ${meddpicc.championConfidence}%)
Competition: ${meddpicc.competition || "N/A"} (confidence: ${meddpicc.competitionConfidence}%)` : "No MEDDPICC data available"}

STAKEHOLDERS:
${relevantContacts.map((c) => {
  const name = `${c.firstName} ${c.lastName}`;
  const engagement = contactEngagement.get(name) || 0;
  return `- ${name} (${c.title || "Unknown title"}, ${c.roleInDeal || "Unknown role"}) — ${engagement} logged interactions`;
}).join("\n") || "No contact data"}

TRANSCRIPT ANALYSES:
${transcriptData.map((t) => `[${t.date ? new Date(t.date).toLocaleDateString("en-GB") : "N/A"}] ${t.title} (Score: ${t.callQualityScore || "N/A"})
Summary: ${t.summary || "No summary"}
Pain points: ${JSON.stringify(t.painPoints || [])}
Competitive mentions: ${JSON.stringify(t.competitiveMentions || [])}
Next steps: ${JSON.stringify(t.nextSteps || [])}`).join("\n\n") || "No transcript analyses"}

FIELD OBSERVATIONS:
${dealObservations.map((o) => {
  const classification = o.aiClassification as { signals?: Array<{ type: string }> } | null;
  return `[${new Date(o.createdAt).toLocaleDateString("en-GB")}] "${o.rawInput}" — Signals: ${JSON.stringify(classification?.signals?.map((s) => s.type) || [])}`;
}).join("\n") || "No observations"}

RECENT ACTIVITIES:
${recentActivities.slice(0, 10).map((a) => `[${new Date(a.createdAt).toLocaleDateString("en-GB")}] ${a.type}: ${a.subject || a.description || ""}`).join("\n") || "No activities"}

SYSTEM INTELLIGENCE (patterns from similar deals):
${sysIntel.map((si) => `- ${si.title}: ${si.insight}`).join("\n") || "No system intelligence"}`;

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const cleanJson = text.replace(/```json\n?|```\n?/g, "").trim();

    let analysis;
    try {
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
    } catch {
      console.error("Failed to parse close analysis JSON");
      analysis = { summary: "", factors: [], questions: [], meddpicc_gaps: [], stakeholder_flags: [] };
    }

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Close analysis error:", err);
    return NextResponse.json(
      { summary: "", factors: [], questions: [], meddpicc_gaps: [], stakeholder_flags: [] },
      { status: 200 } // Return empty analysis, not an error — UI falls back to fixed chips
    );
  }
}

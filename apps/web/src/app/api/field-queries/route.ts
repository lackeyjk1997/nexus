export const dynamic = "force-dynamic";
export const maxDuration = 30;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  fieldQueries,
  fieldQueryQuestions,
  observationClusters,
  observations,
  deals,
  teamMembers,
  companies,
  meddpiccFields,
  activities,
  contacts,
  crossAgentFeedback,
} from "@nexus/db";
import { eq, desc, and, ne, isNotNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

// ── GET: list field queries for a user ──

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initiatedBy = searchParams.get("initiatedBy");
  const targetMemberId = searchParams.get("targetMemberId");

  if (targetMemberId) {
    // Get pending questions for an AE
    // First expire old ones
    await db
      .update(fieldQueryQuestions)
      .set({ status: "expired" })
      .where(
        and(
          eq(fieldQueryQuestions.status, "pending"),
          sql`${fieldQueryQuestions.createdAt} < NOW() - INTERVAL '24 hours'`
        )
      );

    const questions = await db
      .select({
        id: fieldQueryQuestions.id,
        queryId: fieldQueryQuestions.queryId,
        questionText: fieldQueryQuestions.questionText,
        chips: fieldQueryQuestions.chips,
        dealId: fieldQueryQuestions.dealId,
        accountId: fieldQueryQuestions.accountId,
        status: fieldQueryQuestions.status,
        createdAt: fieldQueryQuestions.createdAt,
        dealName: deals.name,
        dealStage: deals.stage,
        dealValue: deals.dealValue,
        companyName: companies.name,
      })
      .from(fieldQueryQuestions)
      .leftJoin(deals, eq(fieldQueryQuestions.dealId, deals.id))
      .leftJoin(companies, eq(fieldQueryQuestions.accountId, companies.id))
      .where(
        and(
          eq(fieldQueryQuestions.targetMemberId, targetMemberId),
          eq(fieldQueryQuestions.status, "pending")
        )
      )
      .orderBy(desc(fieldQueryQuestions.createdAt));

    return NextResponse.json(questions);
  }

  if (initiatedBy) {
    // Get queries initiated by a manager/support function
    const queries = await db
      .select()
      .from(fieldQueries)
      .where(eq(fieldQueries.initiatedBy, initiatedBy))
      .orderBy(desc(fieldQueries.createdAt));

    // For each query, get response counts AND individual responses
    const withCounts = await Promise.all(
      queries.map(async (q) => {
        const allQuestions = await db
          .select({
            status: fieldQueryQuestions.status,
            responseText: fieldQueryQuestions.responseText,
            targetMemberId: fieldQueryQuestions.targetMemberId,
            dealName: deals.name,
            memberName: teamMembers.name,
          })
          .from(fieldQueryQuestions)
          .leftJoin(deals, eq(fieldQueryQuestions.dealId, deals.id))
          .leftJoin(teamMembers, eq(fieldQueryQuestions.targetMemberId, teamMembers.id))
          .where(eq(fieldQueryQuestions.queryId, q.id));

        const targetCount = allQuestions.filter(
          (qu) => qu.status !== "expired"
        ).length;
        const responseCount = allQuestions.filter(
          (qu) => qu.status === "answered"
        ).length;

        const responses = allQuestions
          .filter((qu) => qu.status === "answered" && qu.responseText)
          .map((qu) => ({
            memberName: qu.memberName || "Unknown",
            dealName: qu.dealName || "Unknown deal",
            answer: qu.responseText || "",
          }));

        const waitingFor = allQuestions
          .filter((qu) => qu.status === "pending")
          .map((qu) => qu.memberName || "Unknown");

        return { ...q, targetCount, responseCount, responses, waitingFor };
      })
    );

    return NextResponse.json(withCounts);
  }

  return NextResponse.json({ error: "initiatedBy or targetMemberId required" }, { status: 400 });
}

// ── POST: create a new field query ──

export async function POST(request: Request) {
  const { rawQuestion, initiatedBy, clusterId, dealId } = await request.json();

  if (!rawQuestion || !initiatedBy) {
    return NextResponse.json(
      { error: "rawQuestion and initiatedBy are required" },
      { status: 400 }
    );
  }

  console.log("[Field Query] New query:", rawQuestion, "| clusterId:", clusterId || "none", "| dealId:", dealId || "none");

  // ── DEAL-SCOPED QUERY: answer from deal data + send to deal owner ──
  if (dealId) {
    return handleDealScopedQuery(rawQuestion, initiatedBy, dealId);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Gather context for AI analysis
  const [recentClusters, recentObs, allOpenDeals, closedDealsWithFactors] = await Promise.all([
    db.select().from(observationClusters).orderBy(desc(observationClusters.lastObserved)).limit(20),
    db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        structuredData: observations.structuredData,
        aiClassification: observations.aiClassification,
        arrImpact: observations.arrImpact,
        clusterId: observations.clusterId,
        linkedDealIds: observations.linkedDealIds,
        sourceContext: observations.sourceContext,
      })
      .from(observations)
      .orderBy(desc(observations.createdAt))
      .limit(50),
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        vertical: deals.vertical,
        competitor: deals.competitor,
        assignedAeId: deals.assignedAeId,
        companyId: deals.companyId,
      })
      .from(deals)
      .where(
        and(
          ne(deals.stage, "closed_won"),
          ne(deals.stage, "closed_lost")
        )
      ),
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        vertical: deals.vertical,
        closeFactors: deals.closeFactors,
        winFactors: deals.winFactors,
      })
      .from(deals)
      .where(isNotNull(deals.closeFactors)),
  ]);

  console.log("[Field Query] Context: clusters:", recentClusters.length, "| obs:", recentObs.length, "| open deals:", allOpenDeals.length, "| closed w/factors:", closedDealsWithFactors.length);

  // ── PATH 1: Try to answer from existing data ──
  let aiAnalysis: {
    can_answer_now: boolean;
    immediate_answer: string | null;
    confidence: string;
    data_gaps: string[];
    needs_input_from: {
      roles: string[];
      verticals: string[];
      deal_ids: string[];
      reason: string;
    } | null;
  };

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      aiAnalysis = await analyzeQuery(client, rawQuestion, recentClusters, recentObs, allOpenDeals, closedDealsWithFactors);
    } catch (err) {
      console.error("[Field Query] AI analysis failed:", err);
      aiAnalysis = fallbackAnalysis(rawQuestion, allOpenDeals);
    }
  } else {
    aiAnalysis = fallbackAnalysis(rawQuestion, allOpenDeals);
  }

  console.log("[Field Query] AI analysis:", JSON.stringify({
    can_answer: aiAnalysis.can_answer_now,
    confidence: aiAnalysis.confidence,
    gaps: aiAnalysis.data_gaps?.length || 0,
    ai_deal_ids: aiAnalysis.needs_input_from?.deal_ids?.length || 0,
    ai_verticals: aiAnalysis.needs_input_from?.verticals || [],
  }));

  // If existing data can fully answer with high confidence, return immediately
  if (aiAnalysis.can_answer_now && aiAnalysis.confidence === "high") {
    console.log("[Field Query] PATH 1 — answered from existing data");
    const [inserted] = await db
      .insert(fieldQueries)
      .values({
        initiatedBy,
        rawQuestion,
        aiAnalysis,
        clusterId: clusterId || null,
        aggregatedAnswer: {
          summary: aiAnalysis.immediate_answer,
          response_count: 0,
          target_count: 0,
          key_findings: [],
          answered_from_data: true,
          updated_at: new Date().toISOString(),
        },
        status: "answered",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning();

    return NextResponse.json({
      id: inserted!.id,
      status: "answered",
      immediate_answer: aiAnalysis.immediate_answer,
    });
  }

  // ── PATH 2: Targeted questions to specific AEs ──
  // Build target deal set from multiple paths
  const targetDealIdSet = new Set<string>();

  // 2a: AI-suggested deal IDs
  const aiDealIds = aiAnalysis.needs_input_from?.deal_ids || [];
  for (const id of aiDealIds) targetDealIdSet.add(id);
  console.log("[Field Query] Path 2a — AI deal IDs:", aiDealIds.length);

  // 2b: Cluster observation traversal — find deals linked from cluster observations
  let matchedClusterId = clusterId;
  if (!matchedClusterId) {
    // Try to match question to a cluster by title
    const qLower = rawQuestion.toLowerCase();
    for (const cluster of recentClusters) {
      const titleWords = (cluster.title || "").toLowerCase().split(/\s+/);
      const matchCount = titleWords.filter((w) => w.length > 3 && qLower.includes(w)).length;
      if (matchCount >= 2) {
        matchedClusterId = cluster.id;
        console.log("[Field Query] Auto-matched cluster:", cluster.title);
        break;
      }
    }
  }

  if (matchedClusterId) {
    try {
      const clusterObs = await db
        .select({
          sourceContext: observations.sourceContext,
          linkedDealIds: observations.linkedDealIds,
        })
        .from(observations)
        .where(eq(observations.clusterId, matchedClusterId));

      for (const obs of clusterObs) {
        const ctx = obs.sourceContext as { dealId?: string } | null;
        if (ctx?.dealId) targetDealIdSet.add(ctx.dealId);
        if (obs.linkedDealIds) obs.linkedDealIds.forEach((id) => targetDealIdSet.add(id));
      }
      console.log("[Field Query] Path 2b — cluster obs deal IDs:", targetDealIdSet.size, "from", clusterObs.length, "observations");
    } catch (err) {
      console.error("[Field Query] Cluster observation query failed (non-fatal):", err);
    }
  }

  // 2c: Observation text search — find deals mentioned in observations matching the query topic
  const qLower = rawQuestion.toLowerCase();
  const stopWords = ["deals", "about", "what", "with", "from", "they", "their", "have", "been", "this", "that", "these", "those", "which", "where", "when", "recoverable", "happening"];
  const topicWords = qLower.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.includes(w));

  for (const obs of recentObs) {
    const obsLower = (obs.rawInput || "").toLowerCase();
    const matches = topicWords.filter((w: string) => obsLower.includes(w)).length;
    if (matches >= 2 || (topicWords.length === 1 && matches === 1)) {
      if (obs.linkedDealIds) obs.linkedDealIds.forEach((id) => targetDealIdSet.add(id));
      const ctx = obs.sourceContext as { dealId?: string } | null;
      if (ctx?.dealId) targetDealIdSet.add(ctx.dealId);
    }
  }
  console.log("[Field Query] Path 2c — after obs text search:", targetDealIdSet.size, "deal IDs");

  // 2d: Keyword match — deals where competitor name appears in the question
  for (const deal of allOpenDeals) {
    if (deal.competitor && qLower.includes(deal.competitor.toLowerCase())) {
      targetDealIdSet.add(deal.id);
    }
  }
  console.log("[Field Query] Path 2d — after keyword match:", targetDealIdSet.size, "deal IDs");

  // Filter to only open deals
  let targetDeals = allOpenDeals.filter((d) => targetDealIdSet.has(d.id));
  console.log("[Field Query] Target deals after paths 2a-2d:", targetDeals.length);

  // ── PATH 3: Vertical fallback (last resort) ──
  if (targetDeals.length === 0) {
    const targetVerticals = aiAnalysis.needs_input_from?.verticals || [];
    console.log("[Field Query] PATH 3 — vertical fallback, verticals:", targetVerticals);

    if (targetVerticals.length > 0) {
      targetDeals = allOpenDeals.filter((d) => targetVerticals.includes(d.vertical));
    } else {
      // Broadest fallback — all open deals
      targetDeals = allOpenDeals;
    }

    // Pick highest-value deal per AE (max 8 total)
    const aeTopDeal = new Map<string, (typeof allOpenDeals)[0]>();
    for (const deal of targetDeals.sort((a, b) => Number(b.dealValue || 0) - Number(a.dealValue || 0))) {
      if (!deal.assignedAeId) continue;
      if (!aeTopDeal.has(deal.assignedAeId)) {
        aeTopDeal.set(deal.assignedAeId, deal);
      }
    }
    targetDeals = Array.from(aeTopDeal.values()).slice(0, 8);
    console.log("[Field Query] Vertical fallback targets:", targetDeals.length, "deals across", aeTopDeal.size, "AEs");
  }

  // Group by AE — one question per AE (pick highest value deal)
  const aeDealsMap = new Map<string, typeof targetDeals>();
  for (const deal of targetDeals) {
    if (!deal.assignedAeId) continue;
    const existing = aeDealsMap.get(deal.assignedAeId) || [];
    existing.push(deal);
    aeDealsMap.set(deal.assignedAeId, existing);
  }

  console.log("[Field Query] AEs to target:", Array.from(aeDealsMap.keys()).length);

  // Rate limit: max 3 pending per AE
  const aePendingCounts = await db
    .select({
      targetMemberId: fieldQueryQuestions.targetMemberId,
      count: sql<number>`count(*)::int`,
    })
    .from(fieldQueryQuestions)
    .where(eq(fieldQueryQuestions.status, "pending"))
    .groupBy(fieldQueryQuestions.targetMemberId);

  const pendingMap = new Map(aePendingCounts.map((r) => [r.targetMemberId, r.count]));

  // Build partial answer from existing data if available
  const partialAnswer = aiAnalysis.can_answer_now && aiAnalysis.immediate_answer
    ? aiAnalysis.immediate_answer
    : null;

  // Create the parent query
  const [query] = await db
    .insert(fieldQueries)
    .values({
      initiatedBy,
      rawQuestion,
      aiAnalysis,
      clusterId: matchedClusterId || null,
      aggregatedAnswer: partialAnswer ? {
        summary: partialAnswer + "\n\nSent targeted questions to reps for additional details.",
        response_count: 0,
        target_count: aeDealsMap.size,
        answered_from_data: false,
        updated_at: new Date().toISOString(),
      } : null,
      status: "active",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning();

  // Generate and save questions for each AE
  let questionCount = 0;
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  for (const [aeId, aeDeals] of aeDealsMap) {
    const pending = pendingMap.get(aeId) || 0;
    if (pending >= 3) {
      console.log("[Field Query] Rate limit hit for AE:", aeId, "pending:", pending);
      continue;
    }

    // Pick the highest-value deal for this AE
    const deal = aeDeals.sort((a, b) => Number(b.dealValue || 0) - Number(a.dealValue || 0))[0]!;

    // Get AE info
    let aeName = "Rep";
    try {
      const [ae] = await db
        .select({ name: teamMembers.name })
        .from(teamMembers)
        .where(eq(teamMembers.id, aeId))
        .limit(1);
      aeName = ae?.name || "Rep";
    } catch {}

    // Get company name
    let companyName = deal.name;
    try {
      const [company] = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, deal.companyId))
        .limit(1);
      companyName = company?.name || deal.name;
    } catch {}

    // Generate personalized question
    let questionText: string;
    let chips: string[];

    if (client) {
      try {
        const generated = await generateQuestion(
          client,
          rawQuestion,
          aiAnalysis.data_gaps[0] || rawQuestion,
          aeName,
          deal.name,
          companyName,
          deal.stage,
          String(deal.dealValue || 0)
        );
        questionText = generated.question_text;
        chips = generated.chips;
      } catch {
        const fb = fallbackQuestion(rawQuestion, deal.name);
        questionText = fb.question_text;
        chips = fb.chips;
      }
    } else {
      const fb = fallbackQuestion(rawQuestion, deal.name);
      questionText = fb.question_text;
      chips = fb.chips;
    }

    await db.insert(fieldQueryQuestions).values({
      queryId: query!.id,
      targetMemberId: aeId,
      questionText,
      chips,
      dealId: deal.id,
      accountId: deal.companyId,
      status: "pending",
    });
    questionCount++;
    console.log("[Field Query] Question sent to", aeName, "about", deal.name);
  }

  console.log("[Field Query] Total questions sent:", questionCount);

  return NextResponse.json({
    id: query!.id,
    status: questionCount === 0 ? "answered" : "active",
    questions_sent: questionCount,
    immediate_answer: partialAnswer,
  });
}

// ── AI: Analyze query against existing data ──

async function analyzeQuery(
  client: Anthropic,
  rawQuestion: string,
  clusters: Array<Record<string, unknown>>,
  recentObs: Array<Record<string, unknown>>,
  openDeals: Array<Record<string, unknown>>,
  closedDeals: Array<Record<string, unknown>>
) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are the query engine for a sales intelligence platform. A manager has asked a question about patterns they're seeing.

Your job is to determine:
1. Can the existing data FULLY answer this question? Only say "high" confidence if you have concrete numbers and clear patterns.
2. If partially, what specific data gaps remain?
3. Which OPEN deals (by ID) would give us the missing information?

IMPORTANT: When identifying deals to query, include ALL deals that could be affected by the pattern — not just one. Think broadly about which deals in which verticals would be relevant.

Return JSON only:
{
  "can_answer_now": true/false,
  "immediate_answer": "..." or null,
  "confidence": "high" | "medium" | "low",
  "data_gaps": ["what specific information is missing"],
  "needs_input_from": {
    "roles": ["AE"],
    "verticals": ["Healthcare", "Financial Services"],
    "deal_ids": ["id1", "id2", "id3"],
    "reason": "Why these people need to be asked"
  }
}

Use anonymized counts ("X reps") not names. Include as many relevant deal IDs as possible from the open deals list.`,
    messages: [
      {
        role: "user",
        content: `Question: "${rawQuestion}"

Active intelligence clusters:
${JSON.stringify(clusters.slice(0, 10).map((c) => ({ title: c.title, signalType: c.signalType, observationCount: c.observationCount, severity: c.severity, arrImpactTotal: c.arrImpactTotal })))}

Recent field observations:
${JSON.stringify(recentObs.slice(0, 20).map((o) => ({ rawInput: (o.rawInput as string)?.slice(0, 120), structuredData: o.structuredData })))}

Open deals (ask about THESE):
${JSON.stringify(openDeals.map((d) => ({ id: d.id, name: d.name, stage: d.stage, value: d.dealValue, vertical: d.vertical, competitor: d.competitor, aeId: d.assignedAeId })))}

Closed deals with loss/win factors (existing intel — DON'T ask about these):
${JSON.stringify(closedDeals.slice(0, 5).map((d) => ({ name: d.name, stage: d.stage, value: d.dealValue, vertical: d.vertical, closeFactors: d.closeFactors })))}

Return JSON only, no markdown fences.`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── AI: Generate personalized question for AE ──

async function generateQuestion(
  client: Anthropic,
  rawQuestion: string,
  dataGap: string,
  repName: string,
  dealName: string,
  accountName: string,
  stage: string,
  value: string
) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: `Generate a quick check question for a sales rep. It should:
1. Be one sentence, conversational, specific to THEIR deal
2. Reference the deal or account by name
3. Include 2-4 chip options, most positive first, "Not sure" last
4. Feel like a helpful system check-in, NOT like a manager interrogation
5. NEVER mention who asked or why

Return JSON only: { "question_text": "...", "chips": ["...", "...", "Not sure"] }`,
    messages: [
      {
        role: "user",
        content: `Original question: "${rawQuestion}"
Data gap: "${dataGap}"
Rep: ${repName}, Deal: ${dealName}, Account: ${accountName}, Stage: ${stage}, Value: €${value}

Return JSON only, no markdown fences.`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Fallback analysis (no API key) ──

function fallbackAnalysis(
  rawQuestion: string,
  allDeals: Array<{ id: string; name: string; stage: string; dealValue: string | null; vertical: string; competitor: string | null; assignedAeId: string | null }>
) {
  const qLower = rawQuestion.toLowerCase();
  const isCompetitive = qLower.includes("competitor") || qLower.includes("pricing") || qLower.includes("competitorx");
  const targetVerticals: string[] = [];
  if (qLower.includes("healthcare")) targetVerticals.push("healthcare");
  if (qLower.includes("finserv") || qLower.includes("financial")) targetVerticals.push("financial_services");

  // Find relevant deals
  const relevant = allDeals.filter((d) => {
    if (isCompetitive && d.competitor) return true;
    if (targetVerticals.length > 0) return targetVerticals.includes(d.vertical);
    return true;
  }).slice(0, 6);

  return {
    can_answer_now: false,
    immediate_answer: null,
    confidence: "low" as const,
    data_gaps: [rawQuestion],
    needs_input_from: {
      roles: ["AE"],
      verticals: targetVerticals,
      deal_ids: relevant.map((d) => d.id),
      reason: "Need direct input from reps managing these deals",
    },
  };
}

// ── Fallback question generation ──

function fallbackQuestion(rawQuestion: string, dealName: string) {
  const shortDeal = dealName.split(" ")[0] || dealName;
  return {
    question_text: `Quick check on ${shortDeal} — any updates on the situation you'd want leadership to know about?`,
    chips: ["Things are on track", "Could use some help", "Situation has changed", "Not sure"],
  };
}

// ── Deal-scoped query handler ──

async function handleDealScopedQuery(rawQuestion: string, initiatedBy: string, dealId: string) {
  console.log("[Deal Query] Processing deal-scoped query for deal:", dealId);

  // Gather rich deal context
  const [dealData, meddpiccData, dealContacts, dealActivitiesData, dealObs, teamFeedback] = await Promise.all([
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        vertical: deals.vertical,
        competitor: deals.competitor,
        assignedAeId: deals.assignedAeId,
        companyId: deals.companyId,
        stageEnteredAt: deals.stageEnteredAt,
        companyName: companies.name,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.id, dealId))
      .limit(1),
    db.select().from(meddpiccFields).where(eq(meddpiccFields.dealId, dealId)).limit(1),
    db.select().from(contacts).where(
      sql`company_id = (SELECT company_id FROM deals WHERE id = ${dealId})`
    ),
    db
      .select({ type: activities.type, subject: activities.subject, description: activities.description, createdAt: activities.createdAt })
      .from(activities)
      .where(eq(activities.dealId, dealId))
      .orderBy(desc(activities.createdAt))
      .limit(10),
    db
      .select({ rawInput: observations.rawInput, createdAt: observations.createdAt })
      .from(observations)
      .where(sql`source_context->>'dealId' = ${dealId} OR ${dealId}::uuid = ANY(linked_deal_ids)`)
      .orderBy(desc(observations.createdAt))
      .limit(5),
    db
      .select({ content: crossAgentFeedback.content, sourceName: teamMembers.name })
      .from(crossAgentFeedback)
      .leftJoin(teamMembers, eq(crossAgentFeedback.sourceMemberId, teamMembers.id))
      .where(eq(crossAgentFeedback.accountId, sql`(SELECT company_id FROM deals WHERE id = ${dealId})`))
      .limit(5),
  ]);

  const deal = dealData[0];
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const meddpicc = meddpiccData[0] || null;

  // Get AE name
  let aeName = "the deal owner";
  if (deal.assignedAeId) {
    const [ae] = await db.select({ name: teamMembers.name }).from(teamMembers).where(eq(teamMembers.id, deal.assignedAeId)).limit(1);
    aeName = ae?.name || aeName;
  }

  // Build answer from deal data
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let answer: string;
  let needsAeInput = false;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });

      const dealContext = {
        name: deal.name,
        stage: deal.stage,
        value: deal.dealValue,
        competitor: deal.competitor,
        ae: aeName,
        company: deal.companyName,
        meddpicc: meddpicc ? {
          metrics: { text: meddpicc.metrics, confidence: meddpicc.metricsConfidence },
          economicBuyer: { text: meddpicc.economicBuyer, confidence: meddpicc.economicBuyerConfidence },
          decisionCriteria: { text: meddpicc.decisionCriteria, confidence: meddpicc.decisionCriteriaConfidence },
          decisionProcess: { text: meddpicc.decisionProcess, confidence: meddpicc.decisionProcessConfidence },
          identifyPain: { text: meddpicc.identifyPain, confidence: meddpicc.identifyPainConfidence },
          champion: { text: meddpicc.champion, confidence: meddpicc.championConfidence },
          competition: { text: meddpicc.competition, confidence: meddpicc.competitionConfidence },
        } : null,
        contacts: dealContacts.map((c) => ({ name: `${c.firstName} ${c.lastName}`, title: c.title, role: c.roleInDeal })),
        recentActivities: dealActivitiesData.map((a) => ({ type: a.type, subject: a.subject, date: a.createdAt, description: a.description })),
        observations: dealObs.map((o) => ({ text: o.rawInput, date: o.createdAt })),
        teamFeedback: teamFeedback.map((f) => ({ from: f.sourceName, content: f.content })),
      };

      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `You are a sales intelligence system answering a manager's question about a specific deal.

DEAL DATA:
${JSON.stringify(dealContext, null, 2)}

MANAGER'S QUESTION: "${rawQuestion}"

Answer concisely using ONLY the deal data above. Include:
- Specific MEDDPICC scores and what they mean
- Contact engagement gaps (who hasn't been contacted recently)
- Relevant team intelligence
- Whether you have enough data to fully answer or need rep input

Format as plain text, 3-5 sentences. Include confidence levels and specific names/dates when available.
End with either "NEEDS_AE_INPUT: true" or "NEEDS_AE_INPUT: false" on its own line.`,
        }],
      });

      const responseText = (msg.content[0] as { type: string; text: string }).text;
      needsAeInput = responseText.includes("NEEDS_AE_INPUT: true");
      answer = responseText.replace(/NEEDS_AE_INPUT:\s*(true|false)/g, "").trim();
    } catch (err) {
      console.error("[Deal Query] AI failed:", err);
      answer = buildFallbackDealAnswer(rawQuestion, deal, meddpicc, dealContacts, dealActivitiesData);
      needsAeInput = true;
    }
  } else {
    answer = buildFallbackDealAnswer(rawQuestion, deal, meddpicc, dealContacts, dealActivitiesData);
    needsAeInput = true;
  }

  // Add team feedback to answer if available
  if (teamFeedback.length > 0) {
    const fbLines = teamFeedback.map((f) => `Team intel from ${f.sourceName}: "${f.content}"`);
    answer += "\n\n" + fbLines.join("\n");
  }

  // Create the query record
  const [query] = await db
    .insert(fieldQueries)
    .values({
      initiatedBy,
      rawQuestion,
      clusterId: null,
      aggregatedAnswer: {
        summary: answer,
        response_count: 0,
        target_count: needsAeInput ? 1 : 0,
        answered_from_data: !needsAeInput,
        updated_at: new Date().toISOString(),
      },
      status: needsAeInput ? "active" : "answered",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning();

  // Send targeted question to deal owner if needed
  let questionsSent = 0;
  if (needsAeInput && deal.assignedAeId) {
    const shortDeal = deal.name.split(" — ")[0] || deal.name;
    await db.insert(fieldQueryQuestions).values({
      queryId: query!.id,
      targetMemberId: deal.assignedAeId,
      questionText: `Quick check on ${shortDeal} — ${rawQuestion.charAt(0).toLowerCase() + rawQuestion.slice(1).replace(/\?$/, "")}? Any updates you'd want leadership to know?`,
      chips: ["Making progress", "Needs attention", "Situation changed", "On track"],
      dealId: deal.id,
      accountId: deal.companyId,
      status: "pending",
    });
    questionsSent = 1;
    console.log("[Deal Query] Question sent to", aeName);
  }

  return NextResponse.json({
    id: query!.id,
    status: needsAeInput ? "active" : "answered",
    immediate_answer: answer,
    questionsSent,
    targetName: aeName,
  });
}

function buildFallbackDealAnswer(
  question: string,
  deal: { name: string; stage: string; dealValue: string | null; competitor: string | null },
  meddpicc: { economicBuyerConfidence: number | null; championConfidence: number | null; identifyPainConfidence: number | null } | null,
  dealContacts: { firstName: string; lastName: string; title: string | null; roleInDeal: string | null }[],
  recentActivities: { type: string; subject: string | null; createdAt: Date }[],
): string {
  const parts: string[] = [];
  parts.push(`${deal.name} is in ${deal.stage.replace("_", " ")} stage (€${Number(deal.dealValue || 0).toLocaleString()}).`);

  if (meddpicc) {
    const gaps: string[] = [];
    if ((meddpicc.economicBuyerConfidence ?? 0) < 50) gaps.push(`Economic Buyer (${meddpicc.economicBuyerConfidence}%)`);
    if ((meddpicc.championConfidence ?? 0) < 50) gaps.push(`Champion (${meddpicc.championConfidence}%)`);
    if (gaps.length > 0) parts.push(`MEDDPICC gaps: ${gaps.join(", ")}.`);
  }

  if (deal.competitor) parts.push(`Active competitor: ${deal.competitor}.`);

  if (recentActivities.length > 0) {
    const latest = recentActivities[0]!;
    const daysAgo = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    parts.push(`Last activity: "${latest.subject}" (${daysAgo}d ago).`);
  }

  const eb = dealContacts.find((c) => c.roleInDeal === "economic_buyer");
  if (eb) parts.push(`Economic Buyer: ${eb.firstName} ${eb.lastName} (${eb.title}).`);

  return parts.join(" ");
}

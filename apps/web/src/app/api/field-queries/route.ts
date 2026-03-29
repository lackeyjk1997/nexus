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
} from "@nexus/db";
import { eq, desc, and, ne, inArray, sql } from "drizzle-orm";
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

    // For each query, get response counts
    const withCounts = await Promise.all(
      queries.map(async (q) => {
        const questions = await db
          .select({
            status: fieldQueryQuestions.status,
          })
          .from(fieldQueryQuestions)
          .where(eq(fieldQueryQuestions.queryId, q.id));

        const targetCount = questions.filter(
          (qu) => qu.status !== "expired"
        ).length;
        const responseCount = questions.filter(
          (qu) => qu.status === "answered"
        ).length;

        return { ...q, targetCount, responseCount };
      })
    );

    return NextResponse.json(withCounts);
  }

  return NextResponse.json({ error: "initiatedBy or targetMemberId required" }, { status: 400 });
}

// ── POST: create a new field query ──

export async function POST(request: Request) {
  const { rawQuestion, initiatedBy, clusterId } = await request.json();

  if (!rawQuestion || !initiatedBy) {
    return NextResponse.json(
      { error: "rawQuestion and initiatedBy are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Gather context for AI analysis
  const [recentClusters, recentObs, allDeals] = await Promise.all([
    db.select().from(observationClusters).orderBy(desc(observationClusters.lastObserved)).limit(20),
    db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        structuredData: observations.structuredData,
        aiClassification: observations.aiClassification,
        arrImpact: observations.arrImpact,
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
  ]);

  // Step 3a: Check if existing data can answer
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
      aiAnalysis = await analyzeQuery(client, rawQuestion, recentClusters, recentObs, allDeals);
    } catch (err) {
      console.error("Query analysis failed:", err);
      aiAnalysis = fallbackAnalysis(rawQuestion, allDeals);
    }
  } else {
    aiAnalysis = fallbackAnalysis(rawQuestion, allDeals);
  }

  // If existing data can fully answer with high confidence, return immediately
  if (aiAnalysis.can_answer_now && aiAnalysis.confidence === "high") {
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

  // Step 3b: Generate deal-specific questions for AEs
  // Multi-path targeting: AI deal IDs + cluster observations + competitor keyword match + vertical fallback
  const targetDealIdSet = new Set<string>(aiAnalysis.needs_input_from?.deal_ids || []);

  // Path 1: If a cluster is linked, find all deals referenced by cluster observations
  if (clusterId) {
    try {
      const clusterObs = await db
        .select({
          sourceContext: observations.sourceContext,
          linkedDealIds: observations.linkedDealIds,
        })
        .from(observations)
        .where(eq(observations.clusterId, clusterId));

      for (const obs of clusterObs) {
        const ctx = obs.sourceContext as { dealId?: string } | null;
        if (ctx?.dealId) targetDealIdSet.add(ctx.dealId);
        if (obs.linkedDealIds) obs.linkedDealIds.forEach((id) => targetDealIdSet.add(id));
      }
    } catch (err) {
      console.error("Cluster observation query failed (non-fatal):", err);
    }
  }

  // Path 2: Keyword match — search for deals where competitor name appears in the question
  const qLower = rawQuestion.toLowerCase();
  for (const deal of allDeals) {
    if (deal.competitor && qLower.includes(deal.competitor.toLowerCase())) {
      targetDealIdSet.add(deal.id);
    }
  }

  let targetDeals = allDeals.filter((d) => targetDealIdSet.has(d.id));

  // Path 3: Vertical fallback — if no specific deals found, use AI-suggested verticals
  if (targetDeals.length === 0) {
    const targetVerticals = aiAnalysis.needs_input_from?.verticals || [];
    targetDeals = allDeals.filter((d) => {
      if (targetVerticals.length > 0) return targetVerticals.includes(d.vertical);
      return true;
    }).slice(0, 8); // Cap at 8 deals max
  }

  // Group by AE and limit to one question per AE (pick highest value deal)
  const aeDealsMap = new Map<string, typeof targetDeals>();
  for (const deal of targetDeals) {
    if (!deal.assignedAeId) continue;
    const existing = aeDealsMap.get(deal.assignedAeId) || [];
    existing.push(deal);
    aeDealsMap.set(deal.assignedAeId, existing);
  }

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

  // Create the parent query
  const [query] = await db
    .insert(fieldQueries)
    .values({
      initiatedBy,
      rawQuestion,
      aiAnalysis,
      clusterId: clusterId || null,
      status: "active",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning();

  // Generate and save questions for each AE
  let questionCount = 0;
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  for (const [aeId, aeDeals] of aeDealsMap) {
    const pending = pendingMap.get(aeId) || 0;
    if (pending >= 3) continue; // Rate limit hit

    // Pick the highest-value deal for this AE
    const deal = aeDeals.sort((a, b) => Number(b.dealValue || 0) - Number(a.dealValue || 0))[0]!;

    // Get AE info
    const [ae] = await db
      .select({ name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.id, aeId))
      .limit(1);

    // Get company name
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, deal.companyId))
      .limit(1);

    // Generate personalized question
    let questionText: string;
    let chips: string[];

    if (client) {
      try {
        const generated = await generateQuestion(
          client,
          rawQuestion,
          aiAnalysis.data_gaps[0] || rawQuestion,
          ae?.name || "Rep",
          deal.name,
          company?.name || deal.name,
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
  }

  return NextResponse.json({
    id: query!.id,
    status: "active",
    questions_sent: questionCount,
  });
}

// ── AI: Analyze query against existing data ──

async function analyzeQuery(
  client: Anthropic,
  rawQuestion: string,
  clusters: Array<Record<string, unknown>>,
  observations: Array<Record<string, unknown>>,
  deals: Array<Record<string, unknown>>
) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are the query engine for a sales intelligence platform. A manager has asked a question about patterns they're seeing.

Determine if existing data can answer the question. If yes, provide a concise answer. If no, identify what data gaps exist and which AEs/deals should be queried.

Return JSON only:
{
  "can_answer_now": true/false,
  "immediate_answer": "..." or null,
  "confidence": "high" | "medium" | "low",
  "data_gaps": ["what's missing 1"],
  "needs_input_from": {
    "roles": ["AE"],
    "verticals": ["Healthcare"],
    "deal_ids": ["deal_id_1"],
    "reason": "Why these people need to be asked"
  }
}

Use anonymized counts ("X reps") not names. Include deal IDs from the data when relevant.`,
    messages: [
      {
        role: "user",
        content: `Question: "${rawQuestion}"

Active clusters: ${JSON.stringify(clusters.slice(0, 10).map((c) => ({ title: c.title, signalType: c.signalType, observationCount: c.observationCount, severity: c.severity, arrImpactTotal: c.arrImpactTotal, structuredSummary: c.structuredSummary })))}

Recent observations (structured data): ${JSON.stringify(observations.slice(0, 20).map((o) => ({ rawInput: o.rawInput?.toString().slice(0, 100), structuredData: o.structuredData })))}

Active deals: ${JSON.stringify(deals.map((d) => ({ id: d.id, name: d.name, stage: d.stage, value: d.dealValue, vertical: d.vertical, competitor: d.competitor, aeId: d.assignedAeId })))}

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

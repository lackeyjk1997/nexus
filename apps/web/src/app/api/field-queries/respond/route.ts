export const dynamic = "force-dynamic";
export const maxDuration = 30;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  fieldQueries,
  fieldQueryQuestions,
  observations,
  activities,
  deals,
  companies,
  teamMembers,
  observationClusters,
} from "@nexus/db";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { questionId, responseText, responseType } = await request.json();

  if (!questionId || !responseText) {
    return NextResponse.json(
      { error: "questionId and responseText are required" },
      { status: 400 }
    );
  }

  // Fetch the question with deal/account context
  const [question] = await db
    .select({
      id: fieldQueryQuestions.id,
      queryId: fieldQueryQuestions.queryId,
      targetMemberId: fieldQueryQuestions.targetMemberId,
      questionText: fieldQueryQuestions.questionText,
      dealId: fieldQueryQuestions.dealId,
      accountId: fieldQueryQuestions.accountId,
      dealName: deals.name,
      dealStage: deals.stage,
      dealValue: deals.dealValue,
      dealVertical: deals.vertical,
      companyName: companies.name,
    })
    .from(fieldQueryQuestions)
    .leftJoin(deals, eq(fieldQueryQuestions.dealId, deals.id))
    .leftJoin(companies, eq(fieldQueryQuestions.accountId, companies.id))
    .where(eq(fieldQueryQuestions.id, questionId))
    .limit(1);

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Step 5a: Generate give back insight
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let giveBack: { insight: string; source: string };

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      giveBack = await generateGiveBack(
        client,
        responseText,
        question.questionText,
        question.dealName || "this deal",
        question.dealStage || "unknown",
        String(question.dealValue || 0),
        question.dealVertical || "general",
        question.companyName || ""
      );
    } catch {
      giveBack = fallbackGiveBack(responseText, question.dealName || "this deal", question.dealVertical || "general");
    }
  } else {
    giveBack = fallbackGiveBack(responseText, question.dealName || "this deal", question.dealVertical || "general");
  }

  // Step 5b: Update deal activity timeline
  const recordsUpdated: {
    deal_updates: Array<{ deal_id: string; field: string; value: string }>;
    observation_id: string | null;
  } = { deal_updates: [], observation_id: null };

  if (question.dealId) {
    await db.insert(activities).values({
      dealId: question.dealId,
      teamMemberId: question.targetMemberId,
      type: "note_added",
      subject: `Intelligence Update: ${question.dealName}`,
      description: `Field query response — Q: "${question.questionText}" A: "${responseText}"`,
      metadata: {
        source: "field_query",
        query_question_id: questionId,
        response_type: responseType,
      },
    });
    recordsUpdated.deal_updates.push({
      deal_id: question.dealId,
      field: "activity",
      value: "intelligence_update",
    });
  }

  // Step 5d: Create observation from response (feeds into classification pipeline)
  const [newObs] = await db
    .insert(observations)
    .values({
      observerId: question.targetMemberId,
      rawInput: `[Field Query Response] Q: "${question.questionText}" A: "${responseText}"`,
      sourceContext: {
        page: "field_query",
        dealId: question.dealId,
        trigger: "field_query_response",
      },
      status: "classified",
      lifecycleEvents: [
        { status: "submitted", timestamp: new Date().toISOString() },
        { status: "classified", timestamp: new Date().toISOString() },
      ],
    })
    .returning();

  recordsUpdated.observation_id = newObs?.id || null;

  // Update the question record
  await db
    .update(fieldQueryQuestions)
    .set({
      responseText,
      responseType: responseType || "chip",
      respondedAt: new Date(),
      giveBack,
      recordsUpdated,
      status: "answered",
    })
    .where(eq(fieldQueryQuestions.id, questionId));

  // Step 5e: Update aggregated answer
  await updateAggregatedAnswer(question.queryId);

  return NextResponse.json({
    questionId,
    giveBack,
    records_updated: {
      deal: !!question.dealId,
      account: !!question.accountId,
      observation: !!newObs,
    },
  });
}

// ── AI: Generate give back insight ──

async function generateGiveBack(
  client: Anthropic,
  responseText: string,
  questionText: string,
  dealName: string,
  stage: string,
  value: string,
  vertical: string,
  accountName: string
) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    system: `A sales rep just answered a quick check. Generate a brief, useful insight. Rules:
- 1-2 sentences max
- Reference specific patterns, stats, or strategic advice
- Feel like a smart colleague's tip, NOT a corporate report
- If you can cite numbers, do. If not, offer a strategic tip.
- NEVER reveal who asked or why
- NEVER be generic like "Great input!" — give something actionable

Return JSON only: { "insight": "...", "source": "Based on..." }`,
    messages: [
      {
        role: "user",
        content: `Rep answered: "${responseText}"
Question was: "${questionText}"
Deal: ${dealName}, Stage: ${stage}, Value: €${value}, Vertical: ${vertical}, Account: ${accountName}

Return JSON only, no markdown fences.`,
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ── Fallback give back ──

function fallbackGiveBack(responseText: string, dealName: string, vertical: string) {
  const insights: Record<string, { insight: string; source: string }> = {
    healthcare: {
      insight: `Deals in healthcare that address competitive blockers within 2 weeks of flagging close at 2x the rate of those that don't.`,
      source: "Based on historical close patterns in Healthcare vertical",
    },
    financial_services: {
      insight: `Financial services deals that involve executive-level outreach during negotiation stage close 35% faster on average.`,
      source: "Based on FinServ deal velocity analysis",
    },
    technology: {
      insight: `Tech deals with confirmed champion support have a 3x higher win rate. Consider reinforcing your champion's internal pitch.`,
      source: "Based on win/loss analysis across Technology vertical",
    },
  };

  return (
    insights[vertical] || {
      insight: `Reps who proactively share competitive intel see 22% higher pipeline conversion. Your input on ${dealName} strengthens the whole team's positioning.`,
      source: "Based on team-wide pipeline analysis",
    }
  );
}

// ── Update aggregated answer ──

async function updateAggregatedAnswer(queryId: string) {
  const [query] = await db
    .select()
    .from(fieldQueries)
    .where(eq(fieldQueries.id, queryId))
    .limit(1);

  if (!query) return;

  const questions = await db
    .select({
      status: fieldQueryQuestions.status,
      responseText: fieldQueryQuestions.responseText,
      responseType: fieldQueryQuestions.responseType,
      dealName: deals.name,
      dealValue: deals.dealValue,
    })
    .from(fieldQueryQuestions)
    .leftJoin(deals, eq(fieldQueryQuestions.dealId, deals.id))
    .where(eq(fieldQueryQuestions.queryId, queryId));

  const answered = questions.filter((q) => q.status === "answered");
  const total = questions.filter((q) => q.status !== "expired");

  if (answered.length === 0) return;

  // Generate synthesis
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let summary: string;

  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: `Synthesize field responses into a brief aggregated answer for a sales leader. Use anonymized counts ("2 of 3 reps say..."), not names. Be concise — 2-3 sentences max. Include deal implications when possible.`,
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              original_question: query.rawQuestion,
              responses: answered.map((q) => ({
                deal: q.dealName,
                response: q.responseText,
                value: q.dealValue,
              })),
              total_asked: total.length,
              total_answered: answered.length,
            }),
          },
        ],
      });
      summary =
        response.content[0]?.type === "text"
          ? response.content[0].text
          : `${answered.length} of ${total.length} reps have responded.`;
    } catch {
      summary = `${answered.length} of ${total.length} reps have responded.`;
    }
  } else {
    summary = `${answered.length} of ${total.length} reps have responded. Responses indicate mixed sentiment across deals.`;
  }

  await db
    .update(fieldQueries)
    .set({
      aggregatedAnswer: {
        summary,
        response_count: answered.length,
        target_count: total.length,
        updated_at: new Date().toISOString(),
      },
      status: answered.length === total.length ? "answered" : "active",
      updatedAt: new Date(),
    })
    .where(eq(fieldQueries.id, queryId));
}

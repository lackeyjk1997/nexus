export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { companyName, qbrType, accountContext } = await request.json();

  if (!companyName || !qbrType || !accountContext) {
    return NextResponse.json(
      { error: "companyName, qbrType, and accountContext are required" },
      { status: 400 }
    );
  }

  const systemPrompt = `You are an AI assistant preparing a QBR (Quarterly Business Review) agenda for an Account Executive who manages 100+ enterprise AI accounts with no Customer Success team. Generate a structured, actionable QBR brief that the AE can use to run an effective meeting.

The AE sells Claude AI, Claude Code, and Cowork to mid-market companies (500-2500 employees) in regulated industries.

Use the account data to make every talking point specific — reference actual stakeholder names, actual usage metrics, actual use case adoption status, and actual expansion opportunities. Never be generic.

Respond with ONLY a JSON object (no markdown fences, no preamble):
{
  "qbr_type": "the selected focus area",
  "title": "QBR title including company name",
  "executive_summary": "2-3 sentences on account state and QBR objective",
  "agenda_items": [
    {
      "topic": "section name",
      "duration_minutes": number,
      "talking_points": ["specific point 1", "specific point 2"],
      "data_to_prepare": "what metrics or evidence to bring to the meeting",
      "desired_outcome": "what the AE wants to achieve in this section"
    }
  ],
  "stakeholder_strategy": "who to invite and why — use actual stakeholder names",
  "risk_to_address": "the elephant in the room if any — be direct",
  "success_metric": "how the AE knows the QBR was successful"
}`;

  const userMessage = `Generate a ${qbrType} QBR brief for ${companyName}.

Account context:
${JSON.stringify(accountContext, null, 2)}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const qbrBrief = JSON.parse(cleaned);

    return NextResponse.json({ success: true, qbrBrief });
  } catch (err) {
    console.error("[qbr-prep] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "QBR generation failed",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic();

const PURPOSE_GUIDANCE: Record<string, string> = {
  check_in:
    "Focus on how the team is doing, ask for candid feedback, offer to help remove blockers.",
  success_stories:
    "Lead with anonymized success metrics from similar verticals, suggest the team could achieve similar results with deeper adoption.",
  explore_new:
    "Reference the team's current use case success and suggest adjacent workflows Claude could help with — based on what similar organizations are doing.",
  health_check:
    "More formal, propose a structured review call, mention wanting to ensure they're getting full value before renewal.",
};

export async function POST(request: Request) {
  const body = await request.json();
  const {
    type,
    companyName,
    vertical,
    recipientName,
    recipientTitle,
    useCase,
    purpose,
    signal,
    accountContext,
  } = body;

  if (!type || !companyName || !accountContext) {
    return NextResponse.json(
      { error: "type, companyName, and accountContext are required" },
      { status: 400 }
    );
  }

  let systemPrompt: string;
  let userMessage: string;

  if (type === "use_case_checkin") {
    if (!useCase || !purpose) {
      return NextResponse.json(
        { error: "useCase and purpose are required for use_case_checkin" },
        { status: 400 }
      );
    }

    const purposeGuide = PURPOSE_GUIDANCE[purpose] ?? PURPOSE_GUIDANCE.check_in;

    systemPrompt = `You are an AI assistant drafting a proactive outreach email for an Account Executive who manages 100+ enterprise AI accounts. The AE is checking in with a specific team about their use case adoption.

Rules:
- Be warm, specific, and value-focused — never generic
- Reference the team's specific use case and current adoption numbers
- Share insights about similar success patterns in the same industry WITHOUT naming other customers (say 'similar organizations in ${vertical}' or 'teams in your industry')
- Based on the selected purpose, adjust the email tone and call-to-action
- Keep the email concise — 3-4 paragraphs max
- Sign off as Sarah

Purpose: ${purpose}
Guidance: ${purposeGuide}

Respond with ONLY a JSON object (no markdown, no preamble):
{
  "subject": "email subject line",
  "body": "full email text",
  "purpose_notes": "brief explanation of the approach taken"
}`;

    userMessage = `Draft a ${purpose.replace(/_/g, " ")} email to ${recipientName}${recipientTitle ? ` (${recipientTitle})` : ""} at ${companyName} (${vertical}).

Use case details:
- Team: ${useCase.team}
- Seats: ${useCase.seats} (${useCase.activeUsers} active)
- Product: ${useCase.product}
- Use case: ${useCase.useCase}
- Expected outcome: ${useCase.expectedOutcome}
- Adoption status: ${useCase.adoptionStatus}
- Notes: ${useCase.notes}

Account context:
- Health score: ${accountContext.healthScore}/100
- ARR: $${accountContext.arr}
- Products: ${accountContext.productsPurchased?.join(", ") ?? "N/A"}
- Contract status: ${accountContext.contractStatus}
- Days since last touch: ${accountContext.daysSinceTouch}${accountContext.renewalDate ? `\n- Renewal date: ${accountContext.renewalDate}` : ""}`;
  } else if (type === "proactive_signal") {
    if (!signal) {
      return NextResponse.json(
        { error: "signal is required for proactive_signal" },
        { status: 400 }
      );
    }

    systemPrompt = `You are an AI assistant drafting a proactive outreach email triggered by an external signal (product release, industry news, or customer news). The email should connect the signal to the customer's specific situation and propose a concrete next step.

Rules:
- Lead with the signal/news as the reason for reaching out — it should feel timely and relevant, not like a sales pitch
- Connect it specifically to their business and use cases
- Propose one clear next step
- Keep it concise — 2-3 paragraphs
- Sign off as Sarah

Respond with ONLY a JSON object (no markdown, no preamble):
{
  "subject": "email subject line",
  "body": "full email text",
  "signal_notes": "why this signal matters for this account"
}`;

    userMessage = `Draft an outreach email to ${recipientName}${recipientTitle ? ` (${recipientTitle})` : ""} at ${companyName} (${vertical}).

Signal:
- Type: ${signal.type}
- Signal: ${signal.signal}
- Relevance: ${signal.relevance}
- Suggested action: ${signal.action}

Account context:
- Health score: ${accountContext.healthScore}/100
- ARR: $${accountContext.arr}
- Products: ${accountContext.productsPurchased?.join(", ") ?? "N/A"}
- Contract status: ${accountContext.contractStatus}
- Days since last touch: ${accountContext.daysSinceTouch}${accountContext.renewalDate ? `\n- Renewal date: ${accountContext.renewalDate}` : ""}`;
  } else {
    return NextResponse.json(
      { error: `Unknown type: ${type}` },
      { status: 400 }
    );
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const email = JSON.parse(cleaned);

    return NextResponse.json({ success: true, email });
  } catch (err) {
    console.error("[outreach-email] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Email generation failed",
      },
      { status: 500 }
    );
  }
}

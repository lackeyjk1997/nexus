export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  customerMessages,
  companies,
  contacts,
  deals,
  accountHealth,
  knowledgeArticles,
  observations,
  systemIntelligence,
} from "@nexus/db";
import { eq, desc, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  let body: { messageId?: string; markResponded?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { messageId, markResponded } = body;
  if (!messageId) {
    return NextResponse.json(
      { success: false, error: "messageId is required" },
      { status: 400 }
    );
  }

  // ── Quick path: mark as responded ──
  if (markResponded) {
    await db
      .update(customerMessages)
      .set({ status: "responded", updatedAt: new Date() })
      .where(eq(customerMessages.id, messageId));
    return NextResponse.json({ success: true, status: "responded" });
  }

  // ── Step 1: Fetch the message with joins ──
  const [messageRow] = await db
    .select({
      message: {
        id: customerMessages.id,
        subject: customerMessages.subject,
        body: customerMessages.body,
        channel: customerMessages.channel,
        receivedAt: customerMessages.receivedAt,
        priority: customerMessages.priority,
        status: customerMessages.status,
        aiCategory: customerMessages.aiCategory,
        responseKit: customerMessages.responseKit,
        companyId: customerMessages.companyId,
      },
      company: {
        id: companies.id,
        name: companies.name,
        industry: companies.industry,
        employeeCount: companies.employeeCount,
        description: companies.description,
      },
      contact: {
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        title: contacts.title,
        email: contacts.email,
      },
      deal: {
        id: deals.id,
        name: deals.name,
        dealValue: deals.dealValue,
        closeDate: deals.closeDate,
      },
    })
    .from(customerMessages)
    .innerJoin(companies, eq(customerMessages.companyId, companies.id))
    .leftJoin(contacts, eq(customerMessages.contactId, contacts.id))
    .leftJoin(deals, eq(customerMessages.dealId, deals.id))
    .where(eq(customerMessages.id, messageId))
    .limit(1);

  if (!messageRow) {
    return NextResponse.json(
      { success: false, error: "Message not found" },
      { status: 404 }
    );
  }

  // ── Return cached kit if already generated (unless force=true) ──
  if (
    !force &&
    messageRow.message.status === "kit_ready" &&
    messageRow.message.responseKit
  ) {
    return NextResponse.json({
      success: true,
      responseKit: messageRow.message.responseKit,
      messageId,
      cached: true,
    });
  }

  const companyId = messageRow.company.id;
  const vertical = messageRow.company.industry;

  // ── Step 2: Gather context in parallel ──
  const [healthRows, allArticles, verticalAccounts, sysIntel, recentObs] =
    await Promise.all([
      // Account health for this company
      db
        .select()
        .from(accountHealth)
        .where(eq(accountHealth.companyId, companyId)),

      // All knowledge articles (filter in code)
      db.select().from(knowledgeArticles),

      // Other accounts in same vertical
      db
        .select({
          health: {
            healthScore: accountHealth.healthScore,
            healthTrend: accountHealth.healthTrend,
            contractStatus: accountHealth.contractStatus,
            arr: accountHealth.arr,
            riskSignals: accountHealth.riskSignals,
            expansionSignals: accountHealth.expansionSignals,
          },
          company: {
            id: companies.id,
            name: companies.name,
            industry: companies.industry,
          },
        })
        .from(accountHealth)
        .innerJoin(companies, eq(accountHealth.companyId, companies.id))
        .where(eq(companies.industry, vertical)),

      // System intelligence for this company or vertical
      db
        .select()
        .from(systemIntelligence)
        .where(
          or(
            eq(systemIntelligence.accountId, companyId),
            eq(systemIntelligence.vertical, vertical)
          )
        ),

      // Recent observations in this vertical
      db
        .select()
        .from(observations)
        .orderBy(desc(observations.createdAt))
        .limit(20),
    ]);

  const health = healthRows[0];

  // ── Filter knowledge articles by relevance ──
  const messageText =
    `${messageRow.message.subject} ${messageRow.message.body}`.toLowerCase();
  const relevantArticles = allArticles.filter((a) => {
    // Match by vertical
    const verticalMatch =
      !a.verticals ||
      a.verticals.length === 0 ||
      a.verticals.includes(vertical) ||
      a.verticals.length >= 3; // cross-vertical articles

    // Match by tags against message content
    const tagMatch = (a.tags || []).some((tag) =>
      messageText.includes(tag.toLowerCase())
    );

    // Resolution histories are always relevant
    const isResolution = a.articleType === "resolution_history";

    return verticalMatch || tagMatch || isResolution;
  });

  // ── Build the prompt ──
  const contactName = messageRow.contact?.firstName
    ? `${messageRow.contact.firstName} ${messageRow.contact.lastName}`
    : "Unknown Contact";
  const contactTitle = messageRow.contact?.title || "Unknown Title";

  const usageMetricsStr = health?.usageMetrics
    ? JSON.stringify(health.usageMetrics, null, 2)
    : "No usage data available";

  const stakeholdersStr = health?.keyStakeholders
    ? (health.keyStakeholders as Array<{ name: string; title: string; status: string }>)
        .map(
          (s) => `- ${s.name} (${s.title}) — Status: ${s.status}`
        )
        .join("\n")
    : "No stakeholder data";

  const riskSignalsStr =
    health?.riskSignals &&
    (health.riskSignals as Array<{ signal: string }>).length > 0
      ? (health.riskSignals as Array<{ signal: string; severity: string }>)
          .map((r) => `- [${r.severity}] ${r.signal}`)
          .join("\n")
      : "None detected";

  const expansionSignalsStr =
    health?.expansionSignals &&
    (health.expansionSignals as Array<{ signal: string }>).length > 0
      ? (health.expansionSignals as Array<{ signal: string; confidence: number; product: string; details: string }>)
          .map(
            (e) =>
              `- ${e.signal} (confidence: ${e.confidence}, product: ${e.product})`
          )
          .join("\n")
      : "None detected";

  const articlesStr = relevantArticles
    .map(
      (a) =>
        `### ${a.title}\nType: ${a.articleType}\nSummary: ${a.summary || "N/A"}\nTags: ${(a.tags || []).join(", ")}\n\n${a.content}`
    )
    .join("\n\n---\n\n");

  const otherAccounts = verticalAccounts
    .filter((a) => a.company.id !== companyId)
    .map(
      (a) =>
        `- ${a.company.name}: Health ${a.health.healthScore}/100, Status: ${a.health.contractStatus}, ARR: $${a.health.arr}`
    )
    .join("\n");

  const sysIntelStr =
    sysIntel.length > 0
      ? sysIntel
          .map((s) => `- [${s.insightType}] ${s.title}: ${s.insight}`)
          .join("\n")
      : "No system intelligence available";

  const systemPrompt = `You are an AI assistant for an enterprise Account Executive who manages 100+ accounts with no Customer Success team. Your job is to analyze an inbound customer message and generate a comprehensive Response Kit that arms the AE with everything they need to respond effectively in under 60 seconds.

You have access to:
- The customer's message and full account context
- An internal knowledge base of implementation guides, case studies, and resolution histories
- Data from other accounts in the same vertical (for cross-account pattern matching)
- System intelligence insights

Your response must be actionable, specific, and reference concrete data. Never be generic. Always reference the customer's specific situation, their usage data, their stakeholders, and lessons from other accounts.

Respond with ONLY a JSON object (no markdown fences, no preamble) in this exact structure:
{
  "message_analysis": {
    "category": "technical_issue | adoption_help | billing_question | feature_request | escalation | renewal_discussion",
    "urgency": "low | medium | high | critical",
    "sentiment": "positive | neutral | concerned | frustrated | angry",
    "key_issues": ["issue1", "issue2"],
    "underlying_concern": "what they're really worried about beyond the surface question"
  },
  "similar_resolutions": [
    {
      "account_name": "name of the account that had a similar situation",
      "situation": "what happened at that account",
      "resolution": "how it was resolved",
      "outcome": "the result",
      "relevance": "why this is relevant to the current message"
    }
  ],
  "recommended_resources": [
    {
      "title": "exact article title from the knowledge base",
      "relevance": "why this article helps with the current situation",
      "key_section": "the specific part of the article most relevant"
    }
  ],
  "draft_reply": {
    "subject": "Re: original subject",
    "body": "the full email draft",
    "tone_notes": "brief explanation of the tone chosen and why"
  },
  "internal_notes": {
    "risk_assessment": "churn risk level and reasoning",
    "recommended_follow_up": "specific next steps after sending the reply",
    "escalation_needed": false,
    "escalation_reason": "if escalation needed, why"
  }
}`;

  const userPrompt = `CUSTOMER MESSAGE:
From: ${contactName}, ${contactTitle} at ${messageRow.company.name}
Subject: ${messageRow.message.subject}
Channel: ${messageRow.message.channel}
Received: ${messageRow.message.receivedAt.toISOString().split("T")[0]}

${messageRow.message.body}

---

ACCOUNT CONTEXT:
Company: ${messageRow.company.name} | Vertical: ${vertical} | ARR: $${health?.arr || "N/A"}
Contract Status: ${health?.contractStatus || "N/A"} | Health Score: ${health?.healthScore || "N/A"}/100 (${health?.healthTrend || "N/A"})
Products: ${(health?.productsPurchased || []).join(", ") || "N/A"}
Renewal Date: ${health?.renewalDate ? new Date(health.renewalDate).toISOString().split("T")[0] : "N/A"}
Days Since Last Touch: ${health?.daysSinceTouch ?? "N/A"}

Usage Metrics:
${usageMetricsStr}

Key Stakeholders:
${stakeholdersStr}

Risk Signals:
${riskSignalsStr}

Expansion Signals:
${expansionSignalsStr}

---

RELEVANT KNOWLEDGE BASE ARTICLES:
${articlesStr || "No matching articles found"}

---

SIMILAR ACCOUNTS IN ${vertical.toUpperCase()}:
${otherAccounts || "No other accounts in this vertical"}

---

SYSTEM INTELLIGENCE:
${sysIntelStr}`;

  // ── Step 3: Call Claude ──
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // ── Step 4: Parse response ──
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { success: false, error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Strip markdown code fences if present
    let rawJson = textBlock.text.trim();
    if (rawJson.startsWith("```")) {
      rawJson = rawJson
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    let parsedKit;
    try {
      parsedKit = JSON.parse(rawJson);
    } catch {
      console.error(
        "[response-kit] Failed to parse Claude response:",
        rawJson.slice(0, 500)
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse AI response as JSON",
        },
        { status: 500 }
      );
    }

    // ── Step 5: Save to DB ──
    await db
      .update(customerMessages)
      .set({
        responseKit: parsedKit,
        status: "kit_ready",
        aiCategory: parsedKit.message_analysis?.category || null,
        updatedAt: new Date(),
      })
      .where(eq(customerMessages.id, messageId));

    // ── Step 6: Return the kit ──
    return NextResponse.json({
      success: true,
      responseKit: parsedKit,
      messageId,
    });
  } catch (err) {
    console.error("[response-kit] Claude API error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to generate response kit",
      },
      { status: 500 }
    );
  }
}

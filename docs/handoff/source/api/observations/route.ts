export const dynamic = "force-dynamic";
export const maxDuration = 30;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { observations, observationClusters, deals, teamMembers, notifications, observationRouting, supportFunctionMembers, agentConfigs, agentConfigVersions, companies } from "@nexus/db";
import { eq, desc, ne, sql, inArray, isNull, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// ── GET: list observations ──

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const observerId = searchParams.get("observerId");

  const baseSelect = {
    id: observations.id,
    rawInput: observations.rawInput,
    status: observations.status,
    aiClassification: observations.aiClassification,
    aiGiveback: observations.aiGiveback,
    clusterId: observations.clusterId,
    lifecycleEvents: observations.lifecycleEvents,
    createdAt: observations.createdAt,
    observerName: teamMembers.name,
  };

  if (observerId) {
    const results = await db
      .select(baseSelect)
      .from(observations)
      .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
      .where(eq(observations.observerId, observerId))
      .orderBy(desc(observations.createdAt));
    return NextResponse.json(results);
  }

  const results = await db
    .select(baseSelect)
    .from(observations)
    .leftJoin(teamMembers, eq(observations.observerId, teamMembers.id))
    .orderBy(desc(observations.createdAt));
  return NextResponse.json(results);
}

// ── Signal routing map ──

const SIGNAL_ROUTES: Record<string, string> = {
  competitive_intel: "Product Marketing (competitive intel)",
  content_gap: "Enablement (content gap)",
  deal_blocker: "Deal Page (blocker flagged)",
  win_pattern: "Enablement + Leadership (win pattern)",
  process_friction: "Deal Desk (process friction)",
  agent_tuning: "Your Agent (config updated)",
  cross_agent: "Team Agents (cross-agent update)",
  field_intelligence: "Leadership (field intelligence)",
  process_innovation: "Playbook (process idea captured)",
};

// ── POST: create observation ──

export async function POST(request: Request) {
  const { rawInput, context, observerId, preClassified, signalType: preSignalType, severity: preSeverity, aiClassification: preAiClassification } = await request.json();

  if (!rawInput || !observerId) {
    return NextResponse.json(
      { error: "rawInput and observerId are required" },
      { status: 400 }
    );
  }

  // Deduplication: if from transcript pipeline with a transcriptId, check for existing observation
  if (context?.trigger === "transcript_pipeline" && context?.transcriptId && context?.dealId) {
    const existing = await db
      .select({ id: observations.id })
      .from(observations)
      .where(
        and(
          eq(observations.observerId, observerId),
          sql`source_context->>'transcriptId' = ${context.transcriptId}`,
          sql`source_context->>'signalType' = ${context.signalType || ""}`,
          sql`source_context->>'dealId' = ${context.dealId}`,
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`[observations] Skipping duplicate: transcriptId=${context.transcriptId} signalType=${context.signalType}`);
      return NextResponse.json({ id: existing[0].id, duplicate: true });
    }
  }

  // Look up observer info for context
  const [observer] = await db
    .select({ name: teamMembers.name, role: teamMembers.role, verticalSpecialization: teamMembers.verticalSpecialization })
    .from(teamMembers)
    .where(eq(teamMembers.id, observerId))
    .limit(1);

  // Search for related observations from other team members
  const allRecent = await db
    .select({ id: observations.id, rawInput: observations.rawInput, observerId: observations.observerId, aiClassification: observations.aiClassification })
    .from(observations)
    .where(ne(observations.observerId, observerId))
    .orderBy(desc(observations.createdAt))
    .limit(50);

  // Fetch accounts and observer's deals for entity extraction
  const [allAccounts, observerDeals] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies),
    db
      .select({
        id: deals.id,
        name: deals.name,
        companyId: deals.companyId,
        companyName: companies.name,
        dealValue: deals.dealValue,
        stage: deals.stage,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.assignedAeId, observerId)),
  ]);

  // Try Claude API classification
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let classification: {
    signals: Array<{ type: string; confidence: number; summary: string; competitor_name?: string; content_type?: string; process_name?: string }>;
    sentiment: string;
    urgency: string;
    sensitivity?: string;
    entities?: Array<{ type: string; text: string; normalized: string; confidence: number; match_hint?: string }>;
    linked_accounts?: Array<{ name: string; confidence: number }>;
    linked_deals?: Array<{ name: string; confidence: number }>;
    needs_clarification?: boolean;
  };
  let followUp: { should_ask: boolean; question: string | null; chips: string[] | null; clarifies: string | null };
  let aiAcknowledgment: string | null = null;

  // Skip Claude re-classification when the pipeline already classified this signal
  if (preClassified && preSignalType && preAiClassification) {
    console.log(`[Observations] Skipping classification — pre-classified as ${preSignalType}`);
    classification = preAiClassification;
    followUp = { should_ask: false, question: null, chips: null, clarifies: null };
    aiAcknowledgment = null;
  } else if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const aiResult = await classifyWithClaude(client, rawInput, context, observer, allAccounts, observerDeals);
      classification = aiResult.classification;
      followUp = aiResult.followUp;
      aiAcknowledgment = aiResult.acknowledgment;

      // If Claude couldn't determine account/deal and it's deal-specific, override follow-up
      if (classification.needs_clarification && !context?.dealId && !followUp.should_ask) {
        const topDeals = observerDeals.sort((a, b) => Number(b.dealValue || 0) - Number(a.dealValue || 0)).slice(0, 4);
        if (topDeals.length > 0) {
          followUp = {
            should_ask: true,
            question: "Which deal is this about?",
            chips: topDeals.map((d) => d.companyName ? `${d.companyName} — ${d.name}` : d.name),
            clarifies: "deal_context",
          };
        }
      }
    } catch (err) {
      console.error("Claude classification failed, falling back:", err);
      const fallback = fallbackClassify(rawInput);
      classification = fallback.classification;
      followUp = fallback.followUp;
    }
  } else {
    const fallback = fallbackClassify(rawInput);
    classification = fallback.classification;
    followUp = fallback.followUp;
  }

  // Resolve entities to database IDs
  const resolved = resolveEntities(
    classification.entities || [],
    classification.linked_accounts || [],
    classification.linked_deals || [],
    allAccounts,
    observerDeals
  );

  // Include deal from page context
  if (context?.dealId && !resolved.dealIds.includes(context.dealId)) {
    resolved.dealIds.push(context.dealId);
  }
  if (context?.accountId && !resolved.accountIds.includes(context.accountId)) {
    resolved.accountIds.push(context.accountId);
  }

  const primarySignalType = classification.signals[0]?.type || "field_intelligence";

  // Find related observations by signal type + keyword overlap
  const inputLower = rawInput.toLowerCase();
  const keywords = inputLower.split(/\s+/).filter((w: string) => w.length > 4).slice(0, 10);
  const related = allRecent.filter((obs) => {
    const c = obs.aiClassification as { signals?: { type: string }[] } | null;
    if (c?.signals?.some((s) => s.type === primarySignalType)) return true;
    const ol = obs.rawInput.toLowerCase();
    return keywords.filter((k: string) => ol.includes(k)).length >= 2;
  });
  const uniqueObservers = new Set(related.map((r) => r.observerId)).size;

  // Build giveback
  const routingTarget = SIGNAL_ROUTES[primarySignalType] || "Field Intelligence";
  const relatedLine = related.length > 0
    ? `${uniqueObservers} other rep${uniqueObservers === 1 ? " has" : "s have"} flagged similar patterns this quarter.`
    : "You're the first to flag this. We'll watch for similar signals from the team.";

  const defaultAcks: Record<string, string> = {
    competitive_intel: "Competitive signal captured.",
    content_gap: "Content gap flagged.",
    deal_blocker: "Deal blocker identified and flagged.",
    win_pattern: "Win pattern noted — this helps the whole team.",
    process_friction: "Process friction logged.",
    agent_tuning: "Agent feedback received.",
    cross_agent: "Cross-team insight captured.",
    field_intelligence: "Field intelligence logged.",
  };

  const giveback = {
    acknowledgment: aiAcknowledgment || defaultAcks[primarySignalType] || "Observation captured.",
    related_observations_hint: relatedLine,
    routing: `Routed to: ${routingTarget}`,
  };

  // Calculate initial ARR impact from resolved deals
  const arrDealIds = resolved.dealIds.length > 0 ? resolved.dealIds : (context?.dealId ? [context.dealId] : []);
  let arrImpact: { total_value: number; deal_count: number; deals: Array<{ id: string; name: string; value: number; stage: string }> } | null = null;
  if (arrDealIds.length > 0) {
    arrImpact = await calculateArrImpactFromDeals(arrDealIds);
  }

  // Try to match to existing cluster using AI semantic matching
  const client = apiKey ? new Anthropic({ apiKey }) : null;
  const clusterId = await findMatchingCluster(rawInput, classification, client);

  const [inserted] = await db
    .insert(observations)
    .values({
      observerId,
      rawInput,
      sourceContext: context || { page: "manual", trigger: "manual" },
      aiClassification: classification,
      aiGiveback: giveback,
      status: "classified",
      followUpQuestion: followUp.should_ask ? followUp.question : null,
      followUpChips: followUp.should_ask && followUp.chips ? followUp.chips : null,
      arrImpact: arrImpact,
      clusterId: clusterId,
      linkedAccountIds: resolved.accountIds.length > 0 ? resolved.accountIds : null,
      linkedDealIds: resolved.dealIds.length > 0 ? resolved.dealIds : null,
      extractedEntities: classification.entities || null,
      lifecycleEvents: [
        { status: "submitted", timestamp: new Date().toISOString() },
        { status: "classified", timestamp: new Date().toISOString() },
        ...(clusterId ? [{ status: "clustered", timestamp: new Date().toISOString() }] : []),
      ],
    })
    .returning();

  // Update cluster counts if matched
  if (clusterId) {
    await updateClusterCounts(clusterId);
  }

  // If no follow-up, also extract structured data from the initial input
  if (!followUp.should_ask) {
    const structuredData = extractStructuredFromClassification(classification, context);
    if (Object.keys(structuredData).length > 0) {
      await db.update(observations).set({ structuredData, status: "routed" }).where(eq(observations.id, inserted!.id));
    }
  }

  // If no cluster matched, try to create a new one from unclustered observations
  if (!clusterId) {
    await checkAndCreateCluster(inserted!, classification, context, client);
  } else {
    // Append quote to existing cluster's unstructuredQuotes
    await appendQuoteToCluster(clusterId, rawInput, observer);
  }

  // Create routing records for support functions
  await createRoutingRecords(inserted!.id, classification);

  // Auto-create playbook idea for process_innovation signals
  let playbookIdeaId: string | null = null;
  try {
    const processSignal = classification.signals.find((s: { type: string; summary?: string }) => s.type === "process_innovation");
    if (processSignal) {
      const { playbookIdeas } = await import("@nexus/db");
      const [newIdea] = await db.insert(playbookIdeas).values({
        originatorId: observerId,
        originatedFrom: "observation",
        sourceObservationId: inserted!.id,
        title: processSignal.summary || rawInput.substring(0, 80),
        hypothesis: rawInput,
        category: "process",
        vertical: observer?.verticalSpecialization || null,
        status: "proposed",
      }).returning({ id: playbookIdeas.id });
      playbookIdeaId = newIdea?.id ?? null;
    }
  } catch (err) {
    console.error("Playbook idea creation failed (non-fatal):", err);
  }

  // Process agent signals (agent_tuning, cross_agent)
  if (client) {
    await processAgentSignals(inserted!, classification, client);
  }

  // Include ARR impact in giveback if available
  const givebackWithArr = arrImpact
    ? { ...giveback, arr_impact: { total_value: arrImpact.total_value, deal_count: arrImpact.deal_count } }
    : giveback;

  const isProcessInnovation = !!classification.signals.find(
    (s: { type: string }) => s.type === "process_innovation"
  );

  return NextResponse.json({
    id: inserted!.id,
    follow_up: followUp,
    giveback: givebackWithArr,
    classification,
    isProcessInnovation,
    playbookIdeaId,
  });
}

// ── Claude API Classification ──

async function classifyWithClaude(
  client: Anthropic,
  rawInput: string,
  context: { page?: string; dealId?: string; accountId?: string; trigger?: string } | null,
  observer: { name?: string; role?: string; verticalSpecialization?: string } | null | undefined,
  allAccounts: Array<{ id: string; name: string }>,
  observerDeals: Array<{ id: string; name: string; companyName: string | null; dealValue: string | null; stage: string }>
) {
  const systemPrompt = `You are the AI classification engine for Nexus, a sales intelligence platform. A sales rep has shared an observation. You must:

1. CLASSIFY the observation into one or more signal types:
- "competitive_intel": info about competitors (pricing, features, positioning, wins/losses)
- "content_gap": missing or inadequate sales content (docs, battlecards, case studies, templates, references)
- "deal_blocker": something actively blocking a deal from progressing
- "win_pattern": something that's working well and should be replicated
- "process_friction": internal process issues slowing deals (legal review, pricing approval, etc.)
- "agent_tuning": feedback about AI agent behavior
- "cross_agent": insight that should influence another team member's AI agent
- "field_intelligence": general market pattern or trend
- "process_innovation": a suggestion about how to change the sales process, try a new approach, or replicate something that worked. Examples: "We should hold two discos before demo", "I built a prototype after the call and sent it — they loved it", "Leading with compliance gets better engagement in healthcare"

2. For each signal, extract:
- type, confidence (0-1), summary (one sentence)
- competitor_name (if mentioned), content_type (if a content gap), process_name (if process friction)

3. Assess sentiment ("positive" | "negative" | "neutral" | "frustrated"), urgency ("low" | "medium" | "high" | "critical"), sensitivity ("normal" | "political" | "personnel")

4. DECIDE whether to ask ONE follow-up question:

Ask a follow-up ONLY when:
- The SCOPE is genuinely ambiguous (one deal vs many vs vertical-wide)
- The FREQUENCY is unknown AND would change the routing
- The observation is vague and a nudge would extract key structured data
- You cannot determine which account/deal this is about AND it's about a specific situation (not a general market trend) — ask which deal

Bias toward asking a follow-up question when the observation mentions a pattern across multiple deals. Even if the scope seems clear, asking about specific affected deals or the source of the information produces more valuable structured data.

Do NOT ask a follow-up when:
- The observation names a specific deal, competitor, AND dollar amount
- The observation describes a specific win/loss with details
- All key structured fields can be extracted from the input alone
- The input is a simple positive note or win pattern
- The rep provided the "what happened" AND the "why"

When asking about which account/deal, use the rep's deals as chip options. Only include top 4 deals by value.

BIAS TOWARD NOT ASKING. If in doubt, don't ask.

5. Generate a brief, warm acknowledgment (1 sentence, like a helpful colleague).

6. EXTRACT ENTITIES from the text. For each entity found, return:
{ "type": "account"|"deal"|"competitor"|"amount"|"timeline", "text": "exact text", "normalized": "cleaned version", "confidence": 0.0-1.0, "match_hint": "likely full name" }

Match partial references to known accounts: "MedCore" → "MedCore Health Systems", "the Atlas deal" → "Atlas Capital"

7. DETERMINE which accounts and deals this observation is about:
- Explicitly named accounts/deals
- Infer from the rep's deals if they say "my biggest deal" or "the enterprise deal"
- The page context deal is always relevant if present

Return JSON:
{
  "classification": {
    "signals": [{ "type": "...", "confidence": 0.85, "summary": "...", "competitor_name": null, "content_type": null, "process_name": null }],
    "sentiment": "neutral",
    "urgency": "medium",
    "sensitivity": "normal",
    "entities": [{ "type": "account", "text": "MedCore", "normalized": "MedCore Health Systems", "confidence": 0.9, "match_hint": "MedCore Health Systems" }],
    "linked_accounts": [{ "name": "MedCore Health Systems", "confidence": 0.9 }],
    "linked_deals": [{ "name": "MedCore Enterprise", "confidence": 0.7 }],
    "needs_clarification": false
  },
  "follow_up": {
    "should_ask": false,
    "question": null,
    "chips": null,
    "clarifies": null
  },
  "acknowledgment": "Got it — tracking this."
}

IMPORTANT: Chips should be plain language. The question should sound like a colleague, not a form.`;

  const accountNames = allAccounts.map((a) => a.name).join(", ");
  const dealLines = observerDeals.map((d) => `- ${d.name} (${d.companyName}, ${d.stage}, €${d.dealValue || 0})`).join("\n");

  const userPrompt = `Observer: ${observer?.name || "Unknown"} (${observer?.role || "Unknown"}, ${observer?.verticalSpecialization || "General"})
Context: page=${context?.page || "unknown"}, deal=${context?.dealId ? "yes" : "no"}, trigger=${context?.trigger || "manual"}

Known accounts in CRM: ${accountNames}

This rep's current deals:
${dealLines || "No deals assigned"}

Observation: "${rawInput}"

Classify, extract entities, and decide if a follow-up would add value. Return JSON only, no markdown fences.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);

  const classResult = parsed.classification || {
    signals: [{ type: "field_intelligence", confidence: 0.5, summary: rawInput.slice(0, 100) }],
    sentiment: "neutral",
    urgency: "medium",
  };

  return {
    classification: {
      ...classResult,
      entities: classResult.entities || parsed.entities || [],
      linked_accounts: classResult.linked_accounts || parsed.linked_accounts || [],
      linked_deals: classResult.linked_deals || parsed.linked_deals || [],
      needs_clarification: classResult.needs_clarification ?? parsed.needs_clarification ?? false,
    },
    followUp: parsed.follow_up || { should_ask: false, question: null, chips: null, clarifies: null },
    acknowledgment: parsed.acknowledgment || null,
  };
}

// ── Fallback classification (no API key or API failure) ──

function fallbackClassify(rawInput: string) {
  const inputLower = rawInput.toLowerCase();

  const signalType = inputLower.includes("competitor") || inputLower.includes("pricing") || inputLower.includes("price")
    ? "competitive_intel"
    : inputLower.includes("doc") || inputLower.includes("content") || inputLower.includes("battlecard") || inputLower.includes("template") || inputLower.includes("case study") || inputLower.includes("reference")
      ? "content_gap"
      : inputLower.includes("block") || inputLower.includes("stuck") || inputLower.includes("blocking")
        ? "deal_blocker"
        : inputLower.includes("working") || inputLower.includes("great") || inputLower.includes("win") || inputLower.includes("good response")
          ? "win_pattern"
          : inputLower.includes("slow") || inputLower.includes("legal") || inputLower.includes("process") || inputLower.includes("approval") || inputLower.includes("taking forever")
            ? "process_friction"
            : inputLower.includes("agent") || inputLower.includes("email draft") || inputLower.includes("call prep")
              ? "agent_tuning"
              : "field_intelligence";

  const sentiment = inputLower.includes("!") || inputLower.includes("frustrat") || inputLower.includes("terrible")
    ? "frustrated"
    : inputLower.includes("great") || inputLower.includes("good") || inputLower.includes("love")
      ? "positive"
      : "neutral";

  // Detect high-detail observations that don't need follow-up
  const hasDollarAmount = /\$[\d,.]+[kmb]?/i.test(rawInput) || /€[\d,.]+/i.test(rawInput);
  const hasSpecificDeal = /lost|won|closed|deal with|deal to/i.test(rawInput);
  const hasNamedEntity = /[A-Z][a-z]+(?:[A-Z][a-z]+)+/.test(rawInput); // CamelCase names like CompetitorX, AtlasCapital
  const isHighDetail = (rawInput.length > 80) && (
    (hasDollarAmount && hasSpecificDeal) ||
    (hasDollarAmount && hasNamedEntity) ||
    (hasSpecificDeal && hasNamedEntity && rawInput.split(/[—\-,.]/).length >= 3)
  );

  // Fallback: ask a follow-up unless high-detail, frustrated/positive sentiment, or agent_tuning
  const noFollowUpTypes = ["agent_tuning", "cross_agent"];
  const shouldAsk = sentiment === "neutral" && !noFollowUpTypes.includes(signalType) && !isHighDetail;

  const fallbackQuestions: Record<string, { question: string; chips: string[]; clarifies: string }> = {
    competitive_intel: { question: "How did you hear about this — did a prospect mention it directly?", chips: ["Prospect told me", "Saw it online", "Heard from another rep", "Lost a deal to them"], clarifies: "source" },
    content_gap: { question: "Is this coming up on just one deal, or across your pipeline?", chips: ["Just this deal", "A few deals", "Most of my deals", "Every deal in this vertical"], clarifies: "scope" },
    deal_blocker: { question: "How severe is this — completely blocking or just slowing things down?", chips: ["Completely blocked", "Significantly slowed", "Minor delay", "Just annoying"], clarifies: "impact" },
    win_pattern: { question: "Is this working across all your deals, or specific to certain types?", chips: ["All my deals", "This vertical only", "Certain deal sizes", "Just tried it once"], clarifies: "scope" },
    process_friction: { question: "How often does this happen — every deal or more occasional?", chips: ["Every deal", "Most deals", "Occasional", "First time"], clarifies: "frequency" },
    field_intelligence: { question: "Is this specific to one deal, or a broader pattern you're seeing?", chips: ["Just this deal", "A few deals", "Seeing it broadly", "Not sure yet"], clarifies: "scope" },
  };

  const template = fallbackQuestions[signalType];
  const followUp = shouldAsk && template
    ? { should_ask: true, question: template.question, chips: template.chips, clarifies: template.clarifies }
    : { should_ask: false, question: null, chips: null, clarifies: null };

  return {
    classification: {
      signals: [{ type: signalType, confidence: 0.7, summary: rawInput.slice(0, 100) }],
      sentiment,
      urgency: inputLower.includes("block") || inputLower.includes("losing") || inputLower.includes("urgent") ? "high" as const : "medium" as const,
    },
    followUp,
  };
}

// ── ARR Impact Calculation ──

async function calculateArrImpactFromDeals(dealIds: string[]) {
  if (dealIds.length === 0) return null;

  const matchedDeals = await db
    .select({ id: deals.id, name: deals.name, dealValue: deals.dealValue, stage: deals.stage })
    .from(deals)
    .where(inArray(deals.id, dealIds));

  if (matchedDeals.length === 0) return null;

  const dealResults = matchedDeals.map(d => ({
    id: d.id,
    name: d.name,
    value: Number(d.dealValue) || 0,
    stage: d.stage,
  }));

  return {
    total_value: dealResults.reduce((sum, d) => sum + d.value, 0),
    deal_count: dealResults.length,
    deals: dealResults,
  };
}

// ── Entity Resolution ──

function resolveEntities(
  entities: Array<{ type: string; text: string; normalized: string; confidence: number; match_hint?: string }>,
  linkedAccounts: Array<{ name: string; confidence: number }>,
  linkedDeals: Array<{ name: string; confidence: number }>,
  allAccounts: Array<{ id: string; name: string }>,
  observerDeals: Array<{ id: string; name: string; companyId: string; companyName: string | null }>
): { accountIds: string[]; dealIds: string[] } {
  const accountIds: string[] = [];
  const dealIds: string[] = [];

  function fuzzyMatch(haystack: string, needle: string): boolean {
    const h = haystack.toLowerCase();
    const n = needle.toLowerCase();
    return h.includes(n) || n.includes(h.split(" ")[0]!);
  }

  for (const linked of linkedAccounts) {
    if (linked.confidence < 0.5) continue;
    const match = allAccounts.find((a) => fuzzyMatch(a.name, linked.name));
    if (match && !accountIds.includes(match.id)) accountIds.push(match.id);
  }

  for (const linked of linkedDeals) {
    if (linked.confidence < 0.5) continue;
    const match = observerDeals.find((d) => fuzzyMatch(d.name, linked.name));
    if (match) {
      if (!dealIds.includes(match.id)) dealIds.push(match.id);
      if (match.companyId && !accountIds.includes(match.companyId)) accountIds.push(match.companyId);
    }
  }

  for (const entity of entities) {
    if (entity.type === "account" && entity.confidence >= 0.7) {
      const hint = entity.match_hint || entity.normalized;
      const match = allAccounts.find((a) => fuzzyMatch(a.name, hint));
      if (match && !accountIds.includes(match.id)) accountIds.push(match.id);
    }
  }

  return { accountIds, dealIds };
}

// ── Semantic Cluster Matching ──

async function findMatchingCluster(
  rawInput: string,
  classification: { signals: Array<{ type: string; summary?: string }> },
  client: Anthropic | null
): Promise<string | null> {
  const activeClusters = await db
    .select({
      id: observationClusters.id,
      title: observationClusters.title,
      summary: observationClusters.summary,
      signalType: observationClusters.signalType,
      unstructuredQuotes: observationClusters.unstructuredQuotes,
    })
    .from(observationClusters)
    .where(ne(observationClusters.resolutionStatus, "resolved"));

  if (activeClusters.length === 0) return null;

  if (!client) {
    // Fallback: simple signal type + title keyword match
    const signal = classification.signals[0];
    if (!signal) return null;
    for (const cluster of activeClusters) {
      if (cluster.signalType !== signal.type) continue;
      const titleWords = (cluster.title || "").toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
      const inputWords = rawInput.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
      const overlap = titleWords.filter((w) => inputWords.includes(w)).length;
      if (overlap >= 2) return cluster.id;
    }
    return null;
  }

  try {
    const clusterDescriptions = activeClusters.map((c) => {
      const quotes = (c.unstructuredQuotes as Array<{ quote: string }>) || [];
      const sampleQuotes = quotes.slice(0, 2).map((q) => `"${q.quote?.slice(0, 80)}"`).join(", ");
      return `- ID: ${c.id} | "${c.title}" | Type: ${c.signalType} | ${c.summary || ""} | Samples: ${sampleQuotes}`;
    }).join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: `You match sales observations to existing patterns. A match means the SAME underlying issue — even with different words. "GDPR compliance" matches "data privacy regulations". "Their pricing is killing us" matches "CompetitorX Aggressive Pricing". But "slow legal review" does NOT match "GDPR Compliance".

Return JSON: { "cluster_id": "ID" or null, "confidence": 0.0-1.0 }
If confidence < 0.6, return null. Return JSON only, no fences.`,
      messages: [{
        role: "user",
        content: `Observation: "${rawInput}"\nSignal: ${classification.signals[0]?.type || "unknown"}\n\nExisting patterns:\n${clusterDescriptions}`,
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const result = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

    if (result.cluster_id && result.confidence >= 0.6) {
      const exists = activeClusters.find((c) => c.id === result.cluster_id);
      if (exists) return result.cluster_id;
    }
    return null;
  } catch {
    return null;
  }
}

async function updateClusterCounts(clusterId: string) {
  // Count observations in this cluster
  const obsInCluster = await db
    .select({ observerId: observations.observerId })
    .from(observations)
    .where(eq(observations.clusterId, clusterId));

  const uniqueObservers = new Set(obsInCluster.map(o => o.observerId)).size;

  await db
    .update(observationClusters)
    .set({
      observationCount: obsInCluster.length,
      observerCount: uniqueObservers,
      lastObserved: new Date(),
      updatedAt: new Date(),
      // Escalate severity if threshold reached
      ...(obsInCluster.length >= 4 && uniqueObservers >= 3 ? { severity: "critical" } :
        obsInCluster.length >= 3 && uniqueObservers >= 2 ? { severity: "concerning" } :
          {}),
    })
    .where(eq(observationClusters.id, clusterId));
}

// ── Extract structured data when no follow-up ──

function extractStructuredFromClassification(
  classification: { signals: Array<{ type: string; competitor_name?: string; content_type?: string; process_name?: string }> },
  context: { dealId?: string } | null
) {
  const signal = classification.signals[0];
  const data: Record<string, unknown> = {};

  if (signal?.competitor_name) data.competitor_name = signal.competitor_name;
  if (signal?.content_type) data.content_type = signal.content_type;
  if (signal?.process_name) data.process_name = signal.process_name;
  if (context?.dealId) data.affected_deal_ids = [context.dealId];

  return data;
}

// ── Step 1: Observation Routing ──

const SIGNAL_TO_FUNCTION: Record<string, string> = {
  content_gap: "enablement",
  win_pattern: "enablement",
  competitive_intel: "product_marketing",
  field_intelligence: "product_marketing",
  process_friction: "deal_desk",
  deal_blocker: "deal_desk",
};

async function createRoutingRecords(observationId: string, classification: { signals: Array<{ type: string; summary?: string }> }) {
  const signals = classification.signals || [];

  for (const signal of signals) {
    const targetFunction = SIGNAL_TO_FUNCTION[signal.type];
    if (!targetFunction) continue;

    const [targetMember] = await db
      .select({ id: supportFunctionMembers.id })
      .from(supportFunctionMembers)
      .where(eq(supportFunctionMembers.function, targetFunction))
      .limit(1);

    await db.insert(observationRouting).values({
      observationId,
      targetFunction,
      targetMemberId: targetMember?.id || null,
      signalType: signal.type,
      status: "sent",
    });
  }
}

// ── Semantic Cluster Auto-Creation ──

async function checkAndCreateCluster(
  obs: { id: string; observerId: string; rawInput: string; aiClassification?: unknown },
  classification: { signals: Array<{ type: string; confidence: number; summary: string; competitor_name?: string; content_type?: string; process_name?: string }> },
  context: { dealId?: string } | null,
  client: Anthropic | null
) {
  const primarySignal = classification.signals[0];
  if (!primarySignal) return;

  // Find unclustered observations from last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const unclustered = await db
    .select({
      id: observations.id,
      observerId: observations.observerId,
      rawInput: observations.rawInput,
      aiClassification: observations.aiClassification,
      createdAt: observations.createdAt,
    })
    .from(observations)
    .where(
      and(
        isNull(observations.clusterId),
        ne(observations.id, obs.id),
        sql`${observations.createdAt} >= ${thirtyDaysAgo}`
      )
    )
    .orderBy(desc(observations.createdAt))
    .limit(30);

  if (unclustered.length === 0) return;

  if (!client) {
    // Fallback: keyword-based grouping
    const keywords = obs.rawInput.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
    const matching = unclustered.filter((o) => {
      const oKeywords = o.rawInput.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
      return keywords.filter((k) => oKeywords.includes(k)).length >= 2;
    });
    if (matching.length < 1) return;
    const allObs = [obs, ...matching];
    await createClusterFromObservations(allObs, primarySignal);
    return;
  }

  try {
    const obsDescriptions = unclustered.map((o) => {
      const oType = (o.aiClassification as { signals?: Array<{ type: string }> })?.signals?.[0]?.type || "unknown";
      return `- ID: ${o.id} | "${o.rawInput.slice(0, 120)}" | Signal: ${oType}`;
    }).join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: `You detect patterns in sales observations. Given a new observation and unclustered observations, find which are about the SAME topic. Focus on semantic meaning, not keywords. "GDPR compliance" and "data privacy regulations" are the same topic. Be selective — only group clearly related observations.

Return JSON: { "matching_ids": ["id1"], "pattern_title": "5-8 word title", "pattern_description": "one sentence" }
If < 1 match, return: { "matching_ids": [], "pattern_title": null, "pattern_description": null }
Return JSON only, no fences.`,
      messages: [{
        role: "user",
        content: `New observation (ID: ${obs.id}): "${obs.rawInput}"\nSignal: ${primarySignal.type}\n\nUnclustered observations:\n${obsDescriptions}`,
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const result = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

    if (!result.matching_ids || result.matching_ids.length === 0) return;

    const validMatches = unclustered.filter((o) => result.matching_ids.includes(o.id));
    if (validMatches.length === 0) return;

    const allObs = [obs, ...validMatches];
    await createClusterFromObservations(allObs, primarySignal, result.pattern_title, result.pattern_description);
  } catch (err) {
    console.error("Semantic cluster creation failed:", err);
  }
}

async function createClusterFromObservations(
  allObs: Array<{ id: string; observerId: string; rawInput: string }>,
  primarySignal: { type: string; competitor_name?: string; content_type?: string; process_name?: string },
  title?: string | null,
  description?: string | null
) {
  const uniqueObservers = new Set(allObs.map((o) => o.observerId)).size;
  const uniqueQuotes = [...new Map(allObs.map((o) => [o.rawInput, o])).values()];

  const [newCluster] = await db
    .insert(observationClusters)
    .values({
      title: title || `${primarySignal.type.replace(/_/g, " ")} pattern`,
      summary: description || `${allObs.length} observations flagging a ${primarySignal.type.replace(/_/g, " ")} pattern.`,
      signalType: primarySignal.type,
      targetFunction: SIGNAL_ROUTES[primarySignal.type] || "Field Intelligence",
      observationCount: allObs.length,
      observerCount: uniqueObservers,
      severity: allObs.length >= 4 ? "critical" : allObs.length >= 3 ? "concerning" : "notable",
      resolutionStatus: "emerging",
      unstructuredQuotes: uniqueQuotes.slice(0, 5).map((o) => ({
        quote: o.rawInput.slice(0, 200),
        role: "AE",
        vertical: "general",
        date: new Date().toISOString().split("T")[0],
      })),
      structuredSummary: {
        competitor_name: primarySignal.competitor_name || null,
        content_type: primarySignal.content_type || null,
        process_name: primarySignal.process_name || null,
      },
    })
    .returning();

  await db
    .update(observations)
    .set({ clusterId: newCluster!.id })
    .where(inArray(observations.id, allObs.map((o) => o.id)));
}

// ── Append quote to existing cluster ──

async function appendQuoteToCluster(
  clusterId: string,
  rawInput: string,
  observer: { name?: string; role?: string; verticalSpecialization?: string } | null | undefined
) {
  const [cluster] = await db
    .select({ unstructuredQuotes: observationClusters.unstructuredQuotes })
    .from(observationClusters)
    .where(eq(observationClusters.id, clusterId))
    .limit(1);

  const currentQuotes = (cluster?.unstructuredQuotes as Array<{ quote: string; role: string; vertical: string; date: string }>) || [];
  const newQuote = {
    quote: rawInput.slice(0, 200),
    role: observer?.role || "AE",
    vertical: observer?.verticalSpecialization || "general",
    date: new Date().toISOString().split("T")[0],
  };

  // Skip if this exact quote already exists
  if (currentQuotes.some((q) => q.quote === newQuote.quote)) return;
  const updatedQuotes = [newQuote, ...currentQuotes].slice(0, 10);

  await db
    .update(observationClusters)
    .set({ unstructuredQuotes: updatedQuotes, updatedAt: new Date() })
    .where(eq(observationClusters.id, clusterId));
}

// ── Step 5: Agent Signal Processing ──

async function processAgentSignals(
  obs: { id: string; observerId: string; rawInput: string },
  classification: { signals: Array<{ type: string; summary?: string }> },
  client: Anthropic
) {
  const signals = classification.signals || [];

  for (const signal of signals) {
    if (signal.type === "agent_tuning") {
      await applyAgentChange(client, obs.observerId, obs.rawInput, signal, obs.id);
    } else if (signal.type === "cross_agent") {
      // Find the observer's vertical and target AEs in that vertical
      const [observer] = await db
        .select({ verticalSpecialization: teamMembers.verticalSpecialization })
        .from(teamMembers)
        .where(eq(teamMembers.id, obs.observerId))
        .limit(1);

      const targets = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.role, "AE"),
            eq(teamMembers.isActive, true),
            ne(teamMembers.id, obs.observerId),
            eq(teamMembers.verticalSpecialization, observer?.verticalSpecialization || "general")
          )
        );

      for (const target of targets) {
        await applyAgentChange(client, target.id, obs.rawInput, signal, obs.id);
      }
    }
  }
}

async function applyAgentChange(
  client: Anthropic,
  targetMemberId: string,
  observationText: string,
  signal: { type: string; summary?: string },
  observationId: string
) {
  const [config] = await db
    .select()
    .from(agentConfigs)
    .where(and(eq(agentConfigs.teamMemberId, targetMemberId), eq(agentConfigs.isActive, true)))
    .limit(1);

  if (!config) return;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are an AI agent configuration advisor. A sales observation suggests a change to an AI agent's configuration.

The agent config has:
- instructions (text): full prompt/instructions for the agent
- outputPreferences (json): formatting and style preferences

Suggest a SPECIFIC, MINIMAL change. Prefer appending to instructions over rewriting. Never remove existing rules — only add.

Return JSON:
{
  "should_apply": true/false,
  "instruction_addition": "Text to append to instructions" or null,
  "output_preference_change": { key: value } or null,
  "summary": "Brief description of what changed"
}`,
      messages: [{
        role: "user",
        content: `Observation: "${observationText}"
Signal: ${signal.type} — ${signal.summary || "N/A"}

Current instructions: ${(config.instructions || "").slice(0, 500)}
Current output prefs: ${JSON.stringify(config.outputPreferences || {})}

Return JSON only, no markdown fences.`,
      }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());

    if (!parsed.should_apply) return;

    // Snapshot current config
    const prevInstructions = config.instructions;
    const prevPrefs = config.outputPreferences;
    const newVersion = (config.version || 1) + 1;

    // Build updates
    const newInstructions = parsed.instruction_addition
      ? `${config.instructions}\n\n[Auto-added from field intelligence] ${parsed.instruction_addition}`
      : undefined;
    const newPrefs = parsed.output_preference_change
      ? { ...(config.outputPreferences as Record<string, unknown> || {}), ...parsed.output_preference_change }
      : undefined;

    await db.update(agentConfigs).set({
      version: newVersion,
      updatedAt: new Date(),
      ...(newInstructions ? { instructions: newInstructions } : {}),
      ...(newPrefs ? { outputPreferences: newPrefs } : {}),
    }).where(eq(agentConfigs.id, config.id));

    // Create version record
    await db.insert(agentConfigVersions).values({
      agentConfigId: config.id,
      version: newVersion,
      instructions: newInstructions || config.instructions,
      outputPreferences: newPrefs || (config.outputPreferences as Record<string, unknown>),
      changedBy: "feedback_loop",
      changeReason: `[Field Intelligence] ${parsed.summary}`,
    });

    // Notify the affected person
    await db.insert(notifications).values({
      teamMemberId: targetMemberId,
      type: "agent_recommendation",
      title: "Agent Updated: " + (parsed.summary || "Configuration adjusted").slice(0, 60),
      message: `Your agent was updated based on field feedback: ${parsed.summary}. Based on feedback from: "${observationText.slice(0, 80)}…"`,
      priority: "medium",
    });
  } catch (err) {
    console.error("Agent change failed:", err);
  }
}

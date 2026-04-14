export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  callTranscripts,
  dealFitnessEvents,
  dealFitnessScores,
} from "@nexus/db";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ── Full list of oDeal inspectable events per fit category ──

const FIT_EVENT_COUNTS: Record<string, number> = {
  business_fit: 6,
  emotional_fit: 6,
  technical_fit: 6,
  readiness_fit: 7,
};

// Canonical list of all 25 oDeal inspectable events
const ALL_EVENTS: Array<{
  key: string;
  category: string;
  label: string;
  description: string;
}> = [
  { key: "buyer_shares_kpis", category: "business_fit", label: "Buyer volunteers business metrics", description: "The buyer voluntarily shared internal KPIs or quantifiable pain points, signaling genuine evaluation intent." },
  { key: "buyer_volunteers_metrics", category: "business_fit", label: "Buyer provides specific numbers unprompted", description: "The buyer provided specific numbers (cost, time, headcount) without being asked." },
  { key: "buyer_asks_pricing", category: "business_fit", label: "Buyer proactively asks about pricing", description: "The buyer proactively asked about pricing, packaging, or commercial terms." },
  { key: "buyer_introduces_economic_buyer", category: "business_fit", label: "Buyer brings in economic buyer", description: "The buyer brought in a CFO, VP Finance, or budget owner to the evaluation." },
  { key: "buyer_co_creates_business_case", category: "business_fit", label: "Buyer co-creates business case", description: "The buyer actively helped build or refine the ROI/business case." },
  { key: "buyer_references_competitors", category: "business_fit", label: "Buyer shares competitive context", description: "The buyer mentioned competitive alternatives they are evaluating." },
  { key: "buyer_initiates_contact", category: "emotional_fit", label: "Buyer initiates contact proactively", description: "The buyer reached out proactively rather than just responding to seller outreach." },
  { key: "buyer_response_accelerating", category: "emotional_fit", label: "Buyer response times accelerating", description: "The buyer's response times are getting shorter over time." },
  { key: "buyer_shares_personal_context", category: "emotional_fit", label: "Buyer shares personal context", description: "The buyer shared non-business context, personal motivation, or career stakes." },
  { key: "buyer_gives_coaching", category: "emotional_fit", label: "Buyer coaches on internal positioning", description: "The buyer coached the seller on internal politics or positioning." },
  { key: "buyer_uses_ownership_language", category: "emotional_fit", label: "Buyer uses ownership language", description: "The buyer shifted from \"your product\" to \"we/our implementation\" language." },
  { key: "buyer_follows_through", category: "emotional_fit", label: "Buyer follows through on commitments", description: "The buyer delivered on commitments made in previous calls." },
  { key: "buyer_shares_architecture", category: "technical_fit", label: "Buyer shares architecture details", description: "The buyer shared technical stack, architecture details, or integration requirements." },
  { key: "buyer_grants_access", category: "technical_fit", label: "Buyer grants sandbox/test access", description: "The buyer provided sandbox, test environment, or system access." },
  { key: "buyer_technical_team_joins", category: "technical_fit", label: "Buyer's technical team joins call", description: "The buyer's technical team (engineering, IT, security) joined a call." },
  { key: "buyer_asks_integration", category: "technical_fit", label: "Buyer asks integration questions", description: "The buyer asked specific integration questions (APIs, data formats, compatibility)." },
  { key: "buyer_security_review", category: "technical_fit", label: "Buyer initiates security review", description: "The buyer's security team initiated a formal review process." },
  { key: "buyer_shares_compliance", category: "technical_fit", label: "Buyer shares compliance requirements", description: "The buyer shared compliance requirements, security questionnaire, or regulatory constraints." },
  { key: "buyer_identifies_sponsor", category: "readiness_fit", label: "Buyer identifies executive sponsor", description: "The buyer identified an executive sponsor for the program." },
  { key: "buyer_discusses_rollout", category: "readiness_fit", label: "Buyer discusses rollout planning", description: "The buyer discussed change management, rollout plan, or adoption strategy." },
  { key: "buyer_asks_onboarding", category: "readiness_fit", label: "Buyer asks about onboarding/CSM", description: "The buyer asked about onboarding, training, CSM support, or implementation timeline." },
  { key: "buyer_shares_timeline", category: "readiness_fit", label: "Buyer shares timeline with milestones", description: "The buyer shared a timeline with internal milestones or deadlines." },
  { key: "buyer_introduces_implementation", category: "readiness_fit", label: "Buyer introduces implementation team", description: "The buyer introduced implementation team members or program owners." },
  { key: "buyer_addresses_blockers", category: "readiness_fit", label: "Buyer proactively resolves blockers", description: "The buyer proactively resolved internal blockers." },
  { key: "buyer_asks_references", category: "readiness_fit", label: "Buyer asks for customer references", description: "The buyer asked about other customers' success stories or references." },
];

const SYSTEM_PROMPT = `You are a deal intelligence analyst implementing Travis Bryant's oDeal framework. You analyze sales call transcripts to detect BUYER behavior — not seller behavior. You look for "inspectable events" that are binary, observable, and objective evidence of buyer engagement.

The oDeal framework organizes inspectable events into four "fits":

BUSINESS FIT — Does the buyer see quantifiable business value?
Events to detect:
1. buyer_shares_kpis: Buyer voluntarily shares business metrics, KPIs, or quantifiable pain points
2. buyer_volunteers_metrics: Buyer provides specific numbers (cost, time, headcount) without being asked
3. buyer_asks_pricing: Buyer proactively asks about pricing, packaging, or commercial terms
4. buyer_introduces_economic_buyer: Buyer brings in CFO, VP Finance, or budget owner
5. buyer_co_creates_business_case: Buyer actively helps build or refine the ROI/business case
6. buyer_references_competitors: Buyer mentions competitive alternatives they're evaluating

EMOTIONAL FIT — Is the buyer emotionally invested in this partnership?
Events to detect:
7. buyer_initiates_contact: Buyer reaches out proactively (not just responding to seller)
8. buyer_response_accelerating: Buyer's response times are getting shorter
9. buyer_shares_personal_context: Buyer shares non-business context, personal motivation, or career stakes
10. buyer_gives_coaching: Buyer coaches the seller on internal politics or positioning ("here's how to present this to my boss")
11. buyer_uses_ownership_language: Buyer shifts from "your product" to "we/our implementation"
12. buyer_follows_through: Buyer delivers on commitments made in previous calls (sent the doc, scheduled the meeting, got approval)

TECHNICAL FIT — Can we technically deliver?
Events to detect:
13. buyer_shares_architecture: Buyer shares technical stack, architecture details, or integration requirements
14. buyer_grants_access: Buyer provides sandbox, test environment, or system access
15. buyer_technical_team_joins: Buyer's technical team (engineering, IT, security) joins a call
16. buyer_asks_integration: Buyer asks specific integration questions (APIs, data formats, compatibility)
17. buyer_security_review: Buyer's security team initiates formal review process
18. buyer_shares_compliance: Buyer shares compliance requirements, security questionnaire, or regulatory constraints

READINESS FIT — Will this buyer be a successful customer?
Events to detect:
19. buyer_identifies_sponsor: Buyer identifies an executive sponsor for the program
20. buyer_discusses_rollout: Buyer discusses change management, rollout plan, or adoption strategy
21. buyer_asks_onboarding: Buyer asks about onboarding, training, CSM support, or implementation timeline
22. buyer_shares_timeline: Buyer shares timeline with internal milestones or deadlines
23. buyer_introduces_implementation: Buyer introduces implementation team members or program owners
24. buyer_addresses_blockers: Buyer proactively resolves internal blockers ("I talked to legal and they said...")
25. buyer_asks_references: Buyer asks about other customers' success stories or references

IMPORTANT RULES:
- Only detect events where there is CLEAR evidence in the transcript
- Each event must have a direct quote or specific moment as evidence
- Attribute each event to a specific speaker/contact when possible
- An event can only be detected once per deal — if it was already detected (listed in existing_events), do not re-detect it unless there is STRONGER evidence
- The confidence score (0.0-1.0) reflects how clear the evidence is. Direct quote = 0.85+. Inferred from context = 0.60-0.80.
- Also analyze ownership language patterns: track the percentage of "your/their" vs "we/our/us" language in the transcript

Return a JSON object with this exact structure:
{
  "detected_events": [
    {
      "event_key": "buyer_shares_kpis",
      "fit_category": "business_fit",
      "event_label": "Buyer volunteers business metrics",
      "status": "detected",
      "confidence": 0.92,
      "contact_name": "Dr. Amanda Chen",
      "detection_sources": ["transcript"],
      "evidence_snippets": [
        {
          "source": "Call 1 - Discovery",
          "quote": "Our physicians spend nearly two hours a day on clinical notes",
          "timestamp": "early in call"
        }
      ]
    }
  ],
  "ownership_language": {
    "your_product_pct": 65,
    "we_our_pct": 35,
    "sample_quotes": ["your AI solution", "how we would deploy this"]
  },
  "conversation_signals": {
    "sentiment": "engaged_with_healthy_skepticism",
    "commitment_follow_through": "Evidence of follow-through on previous commitments: [details or 'none observed']",
    "key_insight": "One sentence summary of the most important buyer behavior signal in this transcript"
  }
}

Return ONLY valid JSON, no markdown fences, no commentary.`;

// ── Event key → label/description mapping ──
const EVENT_LABELS: Record<string, { label: string; description: string }> = {
  buyer_shares_kpis: {
    label: "Buyer volunteers business metrics",
    description:
      "The buyer voluntarily shared internal KPIs or quantifiable pain points, signaling genuine evaluation intent.",
  },
  buyer_volunteers_metrics: {
    label: "Buyer provides specific numbers unprompted",
    description:
      "The buyer provided specific numbers (cost, time, headcount) without being asked.",
  },
  buyer_asks_pricing: {
    label: "Buyer proactively asks about pricing",
    description:
      "The buyer proactively asked about pricing, packaging, or commercial terms.",
  },
  buyer_introduces_economic_buyer: {
    label: "Buyer brings in economic buyer",
    description:
      "The buyer brought in a CFO, VP Finance, or budget owner to the evaluation.",
  },
  buyer_co_creates_business_case: {
    label: "Buyer co-creates business case",
    description:
      "The buyer actively helped build or refine the ROI/business case.",
  },
  buyer_references_competitors: {
    label: "Buyer shares competitive context",
    description:
      "The buyer mentioned competitive alternatives they are evaluating.",
  },
  buyer_initiates_contact: {
    label: "Buyer initiates contact proactively",
    description:
      "The buyer reached out proactively rather than just responding to seller outreach.",
  },
  buyer_response_accelerating: {
    label: "Buyer response times accelerating",
    description: "The buyer's response times are getting shorter over time.",
  },
  buyer_shares_personal_context: {
    label: "Buyer shares personal context",
    description:
      "The buyer shared non-business context, personal motivation, or career stakes.",
  },
  buyer_gives_coaching: {
    label: "Buyer coaches on internal positioning",
    description:
      "The buyer coached the seller on internal politics or positioning.",
  },
  buyer_uses_ownership_language: {
    label: "Buyer uses ownership language",
    description:
      'The buyer shifted from "your product" to "we/our implementation" language.',
  },
  buyer_follows_through: {
    label: "Buyer follows through on commitments",
    description:
      "The buyer delivered on commitments made in previous calls.",
  },
  buyer_shares_architecture: {
    label: "Buyer shares architecture details",
    description:
      "The buyer shared technical stack, architecture details, or integration requirements.",
  },
  buyer_grants_access: {
    label: "Buyer grants sandbox/test access",
    description:
      "The buyer provided sandbox, test environment, or system access.",
  },
  buyer_technical_team_joins: {
    label: "Buyer's technical team joins call",
    description:
      "The buyer's technical team (engineering, IT, security) joined a call.",
  },
  buyer_asks_integration: {
    label: "Buyer asks integration questions",
    description:
      "The buyer asked specific integration questions (APIs, data formats, compatibility).",
  },
  buyer_security_review: {
    label: "Buyer initiates security review",
    description:
      "The buyer's security team initiated a formal review process.",
  },
  buyer_shares_compliance: {
    label: "Buyer shares compliance requirements",
    description:
      "The buyer shared compliance requirements, security questionnaire, or regulatory constraints.",
  },
  buyer_identifies_sponsor: {
    label: "Buyer identifies executive sponsor",
    description:
      "The buyer identified an executive sponsor for the program.",
  },
  buyer_discusses_rollout: {
    label: "Buyer discusses rollout planning",
    description:
      "The buyer discussed change management, rollout plan, or adoption strategy.",
  },
  buyer_asks_onboarding: {
    label: "Buyer asks about onboarding/CSM",
    description:
      "The buyer asked about onboarding, training, CSM support, or implementation timeline.",
  },
  buyer_shares_timeline: {
    label: "Buyer shares timeline with milestones",
    description:
      "The buyer shared a timeline with internal milestones or deadlines.",
  },
  buyer_introduces_implementation: {
    label: "Buyer introduces implementation team",
    description:
      "The buyer introduced implementation team members or program owners.",
  },
  buyer_addresses_blockers: {
    label: "Buyer proactively resolves blockers",
    description:
      'The buyer proactively resolved internal blockers ("I talked to legal and they said...").',
  },
  buyer_asks_references: {
    label: "Buyer asks for customer references",
    description:
      "The buyer asked about other customers' success stories or references.",
  },
};

// ── Main handler ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, transcriptId } = body as { dealId?: string; transcriptId?: string };

    if (!dealId) {
      return NextResponse.json(
        { success: false, message: "dealId is required" },
        { status: 400 }
      );
    }

    // Mark this transcript as processed on callTranscripts (simple update, no JOIN needed)
    if (transcriptId) {
      await db
        .update(callTranscripts)
        .set({ pipelineProcessed: true })
        .where(eq(callTranscripts.id, transcriptId));
      console.log(`[deal-fitness] Marked transcript ${transcriptId} as processed`);
    }

    // ── Step A: Gather context ──

    const [dealRow] = await db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        closeDate: deals.closeDate,
        companyId: deals.companyId,
        companyName: companies.name,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!dealRow) {
      return NextResponse.json(
        { success: false, message: "Deal not found" },
        { status: 404 }
      );
    }

    const dealContacts = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        title: contacts.title,
        roleInDeal: contacts.roleInDeal,
      })
      .from(contacts)
      .where(eq(contacts.companyId, dealRow.companyId!));

    const transcripts = await db
      .select({
        id: callTranscripts.id,
        title: callTranscripts.title,
        date: callTranscripts.date,
        transcriptText: callTranscripts.transcriptText,
      })
      .from(callTranscripts)
      .where(
        and(
          eq(callTranscripts.dealId, dealId),
          eq(callTranscripts.pipelineProcessed, true)
        )
      );

    console.log(`[deal-fitness] Found ${transcripts.length} processed transcripts for deal ${dealId}`);

    if (transcripts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No transcripts to analyze",
      });
    }

    const existingEvents = await db
      .select({
        eventKey: dealFitnessEvents.eventKey,
        confidence: dealFitnessEvents.confidence,
      })
      .from(dealFitnessEvents)
      .where(
        and(
          eq(dealFitnessEvents.dealId, dealId),
          eq(dealFitnessEvents.status, "detected")
        )
      );

    const existingKeys = new Set(existingEvents.map((e) => e.eventKey));

    // ── Step B: Build Claude prompt ──

    const contactsText = dealContacts
      .map(
        (c) =>
          `- ${c.firstName} ${c.lastName}, ${c.title || "Unknown Title"} (${c.roleInDeal || "unknown role"})`
      )
      .join("\n");

    const existingKeysText =
      existingEvents.length > 0
        ? existingEvents.map((e) => `- ${e.eventKey}`).join("\n")
        : "None — this is the first analysis for this deal.";

    const transcriptsText = transcripts
      .map((t) => {
        const dateStr = t.date
          ? new Date(t.date).toLocaleDateString()
          : "Unknown date";
        return `Call: ${t.title} — ${dateStr}\n\n${t.transcriptText || "[No transcript text available]"}`;
      })
      .join("\n\n---\n\n");

    const userPrompt = `Deal: ${dealRow.name} — ${dealRow.companyName || "Unknown Company"}
Stage: ${dealRow.stage} | Value: $${Number(dealRow.dealValue || 0).toLocaleString()} | Close: ${dealRow.closeDate ? new Date(dealRow.closeDate).toLocaleDateString() : "Not set"}

Contacts in this deal:
${contactsText}

Previously detected fitness events (do NOT re-detect these unless stronger evidence found):
${existingKeysText}

Transcripts to analyze:
---
${transcriptsText}
---

Analyze all transcripts above for oDeal inspectable events. Return the JSON structure specified in your instructions.`;

    // ── Step C: Call Claude ──

    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      message.content.find((b) => b.type === "text")?.text || "";

    // Strip markdown fences if Claude wraps the JSON
    const cleanedText = responseText
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysisResult: any;
    try {
      analysisResult = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error(
        "[deal-fitness/analyze] Failed to parse Claude response:",
        parseErr
      );
      console.error("[deal-fitness/analyze] Raw response:", responseText.slice(0, 500));
      return NextResponse.json(
        {
          success: false,
          message: "Failed to parse AI analysis response",
        },
        { status: 500 }
      );
    }

    // ── Step D: Write events to database ──

    const detectedEvents = analysisResult.detected_events || [];
    let newEventsInserted = 0;
    let eventsUpdated = 0;

    for (const event of detectedEvents) {
      const eventKey = event.event_key as string;
      const labelInfo = EVENT_LABELS[eventKey];

      // Find matching contact ID
      let contactId: string | null = null;
      if (event.contact_name) {
        const match = dealContacts.find((c) => {
          const fullName = `${c.firstName} ${c.lastName}`;
          return (
            fullName.toLowerCase() === event.contact_name.toLowerCase() ||
            event.contact_name.toLowerCase().includes(c.lastName.toLowerCase())
          );
        });
        if (match) contactId = match.id;
      }

      if (existingKeys.has(eventKey)) {
        // Check if new evidence is stronger
        const existing = existingEvents.find((e) => e.eventKey === eventKey);
        const existingConf = existing?.confidence
          ? parseFloat(String(existing.confidence))
          : 0;
        const newConf = event.confidence || 0;

        if (newConf > existingConf) {
          await db
            .update(dealFitnessEvents)
            .set({
              confidence: String(newConf),
              evidenceSnippets: event.evidence_snippets,
              detectionSources: event.detection_sources || ["transcript"],
              contactId,
              contactName: event.contact_name || null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(dealFitnessEvents.dealId, dealId),
                eq(dealFitnessEvents.eventKey, eventKey)
              )
            );
          eventsUpdated++;
        }
      } else {
        // Insert new event
        await db.insert(dealFitnessEvents).values({
          dealId,
          fitCategory: event.fit_category,
          eventKey,
          eventLabel: labelInfo?.label || event.event_label || eventKey,
          eventDescription:
            labelInfo?.description || `Detected from transcript analysis.`,
          status: "detected",
          detectedAt: new Date(),
          lifecyclePhase: "pre_sale",
          detectionSources: event.detection_sources || ["transcript"],
          sourceReferences: event.evidence_snippets?.map(
            (s: { source: string }) => ({
              type: "transcript",
              id: transcripts[0]?.id || null,
              label: s.source,
            })
          ) || null,
          evidenceSnippets: event.evidence_snippets || null,
          confidence: String(event.confidence || 0.7),
          detectedBy: "ai",
          contactId,
          contactName: event.contact_name || null,
        });
        newEventsInserted++;
        existingKeys.add(eventKey);
      }
    }

    // ── Step D2: Insert not_yet rows for any canonical events not in DB ──
    // Query ALL existing event keys for this deal (detected + not_yet)
    const allExistingEventKeys = await db
      .select({ eventKey: dealFitnessEvents.eventKey })
      .from(dealFitnessEvents)
      .where(eq(dealFitnessEvents.dealId, dealId));
    const allExistingSet = new Set(allExistingEventKeys.map((e) => e.eventKey));

    for (const canonicalEvent of ALL_EVENTS) {
      if (!allExistingSet.has(canonicalEvent.key)) {
        await db.insert(dealFitnessEvents).values({
          dealId,
          fitCategory: canonicalEvent.category,
          eventKey: canonicalEvent.key,
          eventLabel: canonicalEvent.label,
          eventDescription: canonicalEvent.description,
          status: "not_yet",
          detectedAt: null,
          lifecyclePhase: "pre_sale",
          detectionSources: null,
          sourceReferences: null,
          evidenceSnippets: null,
          confidence: null,
          detectedBy: null,
          contactId: null,
          contactName: null,
        });
      }
    }

    // Also upgrade any not_yet events that were detected in this analysis
    for (const event of detectedEvents) {
      const eventKey = event.event_key as string;
      // If the event existed as not_yet (not in existingKeys = detected set, but in allExistingSet)
      if (!existingKeys.has(eventKey) && allExistingSet.has(eventKey)) {
        let contactId: string | null = null;
        if (event.contact_name) {
          const match = dealContacts.find((c) => {
            const fullName = `${c.firstName} ${c.lastName}`;
            return (
              fullName.toLowerCase() === event.contact_name.toLowerCase() ||
              event.contact_name.toLowerCase().includes(c.lastName.toLowerCase())
            );
          });
          if (match) contactId = match.id;
        }
        await db
          .update(dealFitnessEvents)
          .set({
            status: "detected",
            detectedAt: new Date(),
            confidence: String(event.confidence || 0.7),
            detectionSources: event.detection_sources || ["transcript"],
            sourceReferences: event.evidence_snippets?.map(
              (s: { source: string }) => ({
                type: "transcript",
                id: transcripts[0]?.id || null,
                label: s.source,
              })
            ) || null,
            evidenceSnippets: event.evidence_snippets || null,
            detectedBy: "ai",
            contactId,
            contactName: event.contact_name || null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(dealFitnessEvents.dealId, dealId),
              eq(dealFitnessEvents.eventKey, eventKey)
            )
          );
      }
    }

    // ── Step E: Compute and write scores ──

    const allEvents = await db
      .select({
        fitCategory: dealFitnessEvents.fitCategory,
        status: dealFitnessEvents.status,
        detectedAt: dealFitnessEvents.detectedAt,
      })
      .from(dealFitnessEvents)
      .where(eq(dealFitnessEvents.dealId, dealId));

    const categoryScores: Record<
      string,
      { detected: number; total: number; score: number }
    > = {};
    for (const cat of Object.keys(FIT_EVENT_COUNTS)) {
      const catEvents = allEvents.filter((e) => e.fitCategory === cat);
      const detected = catEvents.filter((e) => e.status === "detected").length;
      // Use the larger of canonical count or actual distinct events
      const total = Math.max(FIT_EVENT_COUNTS[cat], catEvents.length);
      categoryScores[cat] = {
        detected,
        total,
        score: total > 0 ? Math.min(100, Math.round((detected / total) * 100)) : 0,
      };
    }

    const scores = Object.values(categoryScores);
    const overallFitness = Math.round(
      scores.reduce((sum, s) => sum + s.score, 0) / scores.length
    );
    const maxScore = Math.max(...scores.map((s) => s.score));
    const minScore = Math.min(...scores.map((s) => s.score));
    const fitImbalanceFlag = maxScore - minScore > 30;

    // Velocity: events detected in last 7 days vs 7-14 days ago
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const eventsThisWeek = allEvents.filter(
      (e) => e.detectedAt && e.detectedAt >= weekAgo
    ).length;
    const eventsLastWeek = allEvents.filter(
      (e) => e.detectedAt && e.detectedAt >= twoWeeksAgo && e.detectedAt < weekAgo
    ).length;

    let velocityTrend: string = "stable";
    if (eventsThisWeek > eventsLastWeek + 1) velocityTrend = "accelerating";
    else if (eventsThisWeek < eventsLastWeek - 1) velocityTrend = "decelerating";
    else if (eventsThisWeek === 0 && eventsLastWeek === 0)
      velocityTrend = "stalled";

    // Last event
    const detectedDates = allEvents
      .filter((e) => e.detectedAt)
      .map((e) => e.detectedAt!.getTime());
    const lastEventAt =
      detectedDates.length > 0 ? new Date(Math.max(...detectedDates)) : null;
    const daysSinceLastEvent = lastEventAt
      ? Math.round(
          (now.getTime() - lastEventAt.getTime()) / (24 * 60 * 60 * 1000)
        )
      : null;

    // Build conversation signals from Claude response
    const conversationSignals = analysisResult.conversation_signals
      ? {
          ownershipLanguage: {
            trend: "detected",
            dataPoints: [
              {
                call: 1,
                label: "Latest Analysis",
                week: 0,
                yourProductPct:
                  analysisResult.ownership_language?.your_product_pct || 50,
                weOurPct: analysisResult.ownership_language?.we_our_pct || 50,
                sampleQuotes:
                  analysisResult.ownership_language?.sample_quotes || [],
              },
            ],
            insight: `Ownership language: ${analysisResult.ownership_language?.we_our_pct || 50}% "we/our" usage detected.`,
          },
          sentimentProfile: {
            type: analysisResult.conversation_signals.sentiment || "neutral",
            description:
              analysisResult.conversation_signals.commitment_follow_through ||
              "",
            keyMoments: [],
          },
          dealInsight:
            analysisResult.conversation_signals.key_insight || null,
        }
      : null;

    // UPSERT scores
    const [existingScoreRow] = await db
      .select({ id: dealFitnessScores.id })
      .from(dealFitnessScores)
      .where(eq(dealFitnessScores.dealId, dealId))
      .limit(1);

    const scoreData = {
      businessFitScore: categoryScores.business_fit.score,
      businessFitDetected: categoryScores.business_fit.detected,
      businessFitTotal: categoryScores.business_fit.total,
      emotionalFitScore: categoryScores.emotional_fit.score,
      emotionalFitDetected: categoryScores.emotional_fit.detected,
      emotionalFitTotal: categoryScores.emotional_fit.total,
      technicalFitScore: categoryScores.technical_fit.score,
      technicalFitDetected: categoryScores.technical_fit.detected,
      technicalFitTotal: categoryScores.technical_fit.total,
      readinessFitScore: categoryScores.readiness_fit.score,
      readnessFitDetected: categoryScores.readiness_fit.detected,
      readinessFitTotal: categoryScores.readiness_fit.total,
      overallFitness,
      velocityTrend,
      lastEventAt,
      daysSinceLastEvent,
      fitImbalanceFlag,
      eventsThisWeek,
      eventsLastWeek,
      conversationSignals,
      updatedAt: new Date(),
    };

    if (existingScoreRow) {
      await db
        .update(dealFitnessScores)
        .set(scoreData)
        .where(eq(dealFitnessScores.dealId, dealId));
    } else {
      await db.insert(dealFitnessScores).values({
        dealId,
        ...scoreData,
      });
    }

    // ── Step F: Return response ──

    return NextResponse.json({
      success: true,
      eventsDetected: newEventsInserted,
      eventsUpdated,
      eventsTotal: allEvents.filter((e) => e.status === "detected").length,
      scores: {
        businessFit: categoryScores.business_fit.score,
        emotionalFit: categoryScores.emotional_fit.score,
        technicalFit: categoryScores.technical_fit.score,
        readinessFit: categoryScores.readiness_fit.score,
        overall: overallFitness,
      },
    });
  } catch (err) {
    console.error("[deal-fitness/analyze] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

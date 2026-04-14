export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  activities,
  callTranscripts,
  dealFitnessEvents,
  dealFitnessScores,
} from "@nexus/db";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ── Canonical event counts per fit category ──

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
  { key: "buyer_uses_ownership_language", category: "emotional_fit", label: "Buyer uses ownership language", description: 'The buyer shifted from "your product" to "we/our implementation" language.' },
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
  { key: "buyer_addresses_blockers", category: "readiness_fit", label: "Buyer proactively resolves blockers", description: 'The buyer proactively resolved internal blockers.' },
  { key: "buyer_asks_references", category: "readiness_fit", label: "Buyer asks for customer references", description: "The buyer asked about other customers' success stories or references." },
];

// Event key → label/description mapping
const EVENT_LABELS: Record<string, { label: string; description: string }> = {};
for (const e of ALL_EVENTS) {
  EVENT_LABELS[e.key] = { label: e.label, description: e.description };
}

// ── System prompt ──

const SYSTEM_PROMPT = `You are an expert deal intelligence analyst implementing the oDeal framework — a methodology for measuring BUYER behavior in enterprise sales deals. You are NOT measuring seller behavior. You are looking for observable, objective evidence that the BUYER is engaged, invested, and moving toward a purchase decision.

You will receive a chronological timeline of sales call transcripts and email exchanges for a single deal. Your job is to analyze this timeline and detect which of 25 "inspectable events" have occurred, based on the buyer's words and actions.

CRITICAL PRINCIPLES:
1. You are measuring what the BUYER does, not what the seller does. The seller asking about budget is not an event. The buyer voluntarily sharing budget information IS an event.
2. Events must be supported by specific evidence — a quote, a described action, or an observable behavior. No assumptions.
3. Some events are PAIRS — a promise in one conversation and follow-through in a later conversation or email. Track both sides.
4. Language shifts matter. Track how the buyer's framing changes across conversations (evaluative → ownership, hedging → committing).
5. Confidence reflects evidence strength: 0.90-1.00 = explicit clear evidence, 0.70-0.89 = strong inference from context, 0.50-0.69 = moderate signal that could be interpreted differently.
6. For events not yet detected, provide a coaching recommendation — what should the seller do to cultivate this buyer behavior?

THE 25 INSPECTABLE EVENTS:

═══════════════════════════════════════
BUSINESS FIT — "Does the buyer see quantifiable value?"
═══════════════════════════════════════

1. buyer_shares_kpis — DETECT WHEN: The buyer voluntarily shares business metrics, KPIs, or quantifiable pain points without being directly asked. They offer internal numbers because they want you to understand the problem's scale. NOT THIS: Seller asks "what are your metrics?" and buyer gives a vague answer.

2. buyer_volunteers_metrics — DETECT WHEN: The buyer provides specific numbers — dollar amounts, headcount, time measurements, percentages — unprompted. They're quantifying their own pain because they've already done internal analysis. NOT THIS: Buyer says "it's a big problem" without numbers.

3. buyer_asks_pricing — DETECT WHEN: The buyer proactively asks about pricing, packaging, contract terms, or commercial structure. They're initiating the commercial conversation. NOT THIS: Seller presents pricing and buyer says "okay."

4. buyer_introduces_economic_buyer — DETECT WHEN: The buyer brings someone with budget authority into the conversation — via email introduction, adding them to a call, or scheduling a separate meeting. The introduction is buyer-initiated. NOT THIS: Seller asks "can we meet with your CFO?" and buyer agrees reluctantly.

5. buyer_co_creates_business_case — DETECT WHEN: The buyer actively helps build or refine the ROI model, business case, or value justification. They provide internal data, challenge assumptions constructively, or volunteer to present the case internally. NOT THIS: Buyer passively receives a business case and says "looks good."

6. buyer_references_competitors — DETECT WHEN: The buyer mentions competitive alternatives they're evaluating, competitive pricing, or vendor comparisons. NOT THIS: Seller asks "who else are you looking at?" and buyer deflects.

═══════════════════════════════════════
EMOTIONAL FIT — "Is the buyer emotionally invested?"
═══════════════════════════════════════

7. buyer_initiates_contact — DETECT WHEN: The buyer emails first, schedules a call, or reaches out without being prompted by the seller. Look at email chains — who sent the first message?

8. buyer_response_accelerating — DETECT WHEN: Email response times are consistently fast and/or accelerating over the deal lifecycle. A pattern of DECREASING response times is a strong signal.

9. buyer_shares_personal_context — DETECT WHEN: The buyer shares information beyond the strict business context — career goals, personal frustrations, organizational politics, team dynamics, or why this project matters to them personally.

10. buyer_gives_coaching — DETECT WHEN: The buyer advises the seller on how to navigate their organization — who to talk to, what to emphasize, what to avoid, how decisions get made. They're acting as an internal advocate.

11. buyer_uses_ownership_language — DETECT WHEN: The buyer's language shifts from evaluative ("your product," "this solution") to ownership ("our implementation," "when we go live"). Track this shift across conversations.

12. buyer_follows_through — DETECT WHEN: The buyer makes a promise in one conversation and follows through in a later one. Example: "I'll send the security questionnaire" → questionnaire arrives.

═══════════════════════════════════════
TECHNICAL FIT — "Can we technically deliver?"
═══════════════════════════════════════

13. buyer_shares_architecture — DETECT WHEN: The buyer shares details about their current technical environment — tech stack, infrastructure, data architecture, integration points, security requirements.

14. buyer_grants_access — DETECT WHEN: The buyer provides or commits to providing a test environment, sandbox, dev tenant, or POC infrastructure. This requires internal effort — it's a significant investment signal.

15. buyer_technical_team_joins — DETECT WHEN: The buyer's technical team (engineers, architects, IT directors, security) join calls or are introduced via email. Technical people have limited time — their involvement signals seriousness.

16. buyer_asks_integration — DETECT WHEN: The buyer asks specific questions about integration with their existing systems — API details, data formats, authentication, migration paths. These require homework on the buyer's part.

17. buyer_security_review — DETECT WHEN: The buyer starts their formal security review — sending a questionnaire, scheduling a security meeting, requesting SOC 2 reports, introducing their CISO/security team.

18. buyer_shares_compliance — DETECT WHEN: The buyer shares specific compliance requirements — regulatory frameworks (HIPAA, SOC 2, GDPR), internal policies, data handling requirements.

═══════════════════════════════════════
READINESS FIT — "Will this buyer be a successful customer?"
═══════════════════════════════════════

19. buyer_identifies_sponsor — DETECT WHEN: An executive who can champion the project at the leadership level is identified and engaged. They don't need to attend every call but need to be visibly backing the initiative.

20. buyer_discusses_rollout — DETECT WHEN: The buyer discusses implementation planning — phasing, timeline, resource allocation, change management, training needs, pilot scope. They're thinking about HOW to implement, not IF.

21. buyer_asks_onboarding — DETECT WHEN: The buyer asks about post-sale support — customer success, onboarding process, training programs, ongoing support models. They're thinking about life after signing.

22. buyer_shares_timeline — DETECT WHEN: The buyer shares a timeline with specific milestones — go-live dates, board presentation dates, budget cycle deadlines. These are dates THEY provide, not dates the seller proposes.

23. buyer_introduces_implementation — DETECT WHEN: The buyer brings in people who will be involved in day-to-day implementation — project managers, trainers, department leads, IT staff. Look for NEW people specifically brought in for implementation.

24. buyer_addresses_blockers — DETECT WHEN: The buyer takes action to remove obstacles — getting legal to approve terms, clearing budget with finance, resolving internal political resistance, fast-tracking security review.

25. buyer_asks_references — DETECT WHEN: The buyer asks about other customers' success stories, case studies, or references. They want social proof that this works elsewhere.

═══════════════════════════════════════

RESPONSE FORMAT — You MUST respond with valid JSON only, no markdown, no preamble:

{
  "events": [
    {
      "eventKey": "buyer_shares_kpis",
      "fitCategory": "business_fit",
      "status": "detected",
      "confidence": 0.92,
      "detectedAt": "2026-03-15",
      "contactName": "Dr. Amanda Chen",
      "contactTitle": "VP Clinical Innovation",
      "detectionSources": ["transcript"],
      "evidenceSnippets": [
        {
          "source": "Call 1: Initial Discovery",
          "sourceType": "transcript",
          "sourceId": "uuid-of-transcript",
          "quote": "Our physicians spend nearly two hours a day on clinical notes",
          "context": "Volunteered this metric unprompted when describing the problem"
        }
      ],
      "eventDescription": "Amanda shared specific KPIs about physician time spent on documentation.",
      "coachingNote": null
    },
    {
      "eventKey": "buyer_assigns_day_to_day_owner",
      "fitCategory": "readiness_fit",
      "status": "not_yet",
      "confidence": null,
      "detectedAt": null,
      "contactName": null,
      "contactTitle": null,
      "detectionSources": null,
      "evidenceSnippets": null,
      "eventDescription": null,
      "coachingNote": "No one has been identified to own the program post-launch. Ask the champion who would be the day-to-day owner once this is live."
    }
  ],
  "commitmentTracking": [
    {
      "promise": "I'll have the sandbox environment provisioned by Friday",
      "promisedBy": "Priya Mehta",
      "promisedOn": "2026-03-20",
      "promiseSource": "Call 2: Technical Deep Dive",
      "status": "kept",
      "resolution": "Sandbox confirmed in follow-up email",
      "resolutionSource": "Email from Priya Mehta"
    }
  ],
  "languageProgression": {
    "examples": [
      { "call": "Call 1", "phrase": "your AI solution", "framing": "evaluative" },
      { "call": "Call 3", "phrase": "when we implement this", "framing": "ownership" }
    ],
    "trend": "Strong progression from evaluative to ownership language",
    "ownershipPercentage": 75
  },
  "buyingCommitteeExpansion": {
    "contacts": [
      { "name": "Dr. Amanda Chen", "title": "VP Clinical Innovation", "firstAppearance": "Call 1", "introducedBy": "self", "role": "champion" }
    ],
    "expansionPattern": "1 → 3 → 5 → 7 over 8 weeks",
    "multithreadingScore": 7
  },
  "responseTimePattern": {
    "averageByWeek": [
      { "week": 1, "avgHours": 36 },
      { "week": 4, "avgHours": 8 }
    ],
    "trend": "accelerating",
    "insight": "Response times dropped significantly over the deal lifecycle"
  },
  "overallAssessment": "Brief 2-3 sentence assessment of deal health."
}`;

// ── Main handler ──

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dealId, transcriptId } = body as {
      dealId?: string;
      transcriptId?: string;
    };

    if (!dealId) {
      return NextResponse.json(
        { success: false, message: "dealId is required" },
        { status: 400 }
      );
    }

    // Mark this transcript as processed if specified (called from pipeline)
    if (transcriptId) {
      await db
        .update(callTranscripts)
        .set({ pipelineProcessed: true })
        .where(eq(callTranscripts.id, transcriptId));
      console.log(
        `[deal-fitness] Marked transcript ${transcriptId} as processed`
      );
    }

    // ── Step A: Gather context ──

    const [dealRow] = await db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        vertical: deals.vertical,
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

    // Fetch ALL transcripts for this deal (not just processed ones)
    const transcriptsAll = await db
      .select({
        id: callTranscripts.id,
        title: callTranscripts.title,
        date: callTranscripts.date,
        participants: callTranscripts.participants,
        transcriptText: callTranscripts.transcriptText,
      })
      .from(callTranscripts)
      .where(eq(callTranscripts.dealId, dealId));

    // Filter to those with actual text
    const transcriptsWithText = transcriptsAll.filter(
      (t) => t.transcriptText && t.transcriptText.length > 50
    );

    // Fetch email activities for this deal
    const emailActivities = await db
      .select({
        id: activities.id,
        type: activities.type,
        subject: activities.subject,
        description: activities.description,
        metadata: activities.metadata,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .where(
        and(
          eq(activities.dealId, dealId),
          inArray(activities.type, ["email_sent", "email_received"])
        )
      );

    console.log(
      `[deal-fitness] Found ${transcriptsWithText.length} transcripts and ${emailActivities.length} emails for deal ${dealId}`
    );

    if (transcriptsWithText.length === 0 && emailActivities.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No transcripts or emails to analyze",
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

    const existingDetectedKeys = new Set(
      existingEvents.map((e) => e.eventKey)
    );

    // ── Step B: Build chronological timeline ──

    type TimelineEntry = {
      date: Date;
      type: "transcript" | "email";
      sourceId: string;
      title: string;
      participants: string;
      content: string;
    };

    const timeline: TimelineEntry[] = [];

    for (const t of transcriptsWithText) {
      const parts = (
        t.participants as Array<{ name: string; role?: string }> | null
      )
        ?.map((p) => `${p.name}${p.role ? ` (${p.role})` : ""}`)
        .join(", ");

      timeline.push({
        date: t.date,
        type: "transcript",
        sourceId: t.id,
        title: t.title,
        participants: parts || "Unknown participants",
        content: t.transcriptText!,
      });
    }

    for (const e of emailActivities) {
      const meta = e.metadata as {
        direction?: string;
        from?: string;
        to?: string[];
        responseTimeHours?: number;
      } | null;

      const direction = meta?.direction || e.type;
      const from = meta?.from || "unknown";
      const to = meta?.to?.join(", ") || "unknown";
      const responseTime = meta?.responseTimeHours
        ? ` [Response time: ${meta.responseTimeHours}h]`
        : "";

      timeline.push({
        date: e.createdAt,
        type: "email",
        sourceId: e.id,
        title: e.subject || "Email",
        participants: `From: ${from} → To: ${to}`,
        content: `Subject: ${e.subject || "(no subject)"}\nDirection: ${direction}${responseTime}\n\n${e.description || ""}`,
      });
    }

    // Sort chronologically
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    // ── Step C: Build Claude prompt ──

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

    const timelineText = timeline
      .map((entry) => {
        const dateStr = entry.date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        return `[${dateStr}] [${entry.type.toUpperCase()}] ${entry.title}\nSource ID: ${entry.sourceId}\nParticipants: ${entry.participants}\n\n${entry.content}`;
      })
      .join("\n\n════════════════════════════════════════\n\n");

    const userPrompt = `Analyze this deal for oDeal fitness events.

DEAL: ${dealRow.name} | ${dealRow.companyName || "Unknown Company"} | ${dealRow.vertical || "general"} | Stage: ${dealRow.stage} | Value: $${Number(dealRow.dealValue || 0).toLocaleString()} | Close: ${dealRow.closeDate ? new Date(dealRow.closeDate).toLocaleDateString() : "Not set"}

EXISTING CONTACTS:
${contactsText}

PREVIOUSLY DETECTED FITNESS EVENTS (do NOT re-detect unless stronger evidence found):
${existingKeysText}

CHRONOLOGICAL TIMELINE:
════════════════════════════════════════

${timelineText}

════════════════════════════════════════

Return ALL 25 events. For events you detect, provide full evidence. For events not yet detected, provide coaching recommendations. For commitment tracking, match promises to follow-throughs across the timeline.

Respond with valid JSON only. No markdown. No preamble.`;

    // ── Step D: Call Claude ──

    const anthropic = new Anthropic();

    let message;
    try {
      message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
    } catch (apiErr) {
      console.error("[deal-fitness/analyze] Claude API error:", apiErr);
      return NextResponse.json(
        {
          success: false,
          message: `Claude API error: ${apiErr instanceof Error ? apiErr.message : "unknown"}`,
        },
        { status: 500 }
      );
    }

    const responseText =
      message.content.find((b) => b.type === "text")?.text || "";

    console.log(
      `[deal-fitness/analyze] Claude response length: ${responseText.length} chars, stop_reason: ${message.stop_reason}`
    );

    // Robust JSON extraction: try multiple strategies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let analysisResult: any;

    // Strategy 1: Try parsing the raw response directly
    try {
      analysisResult = JSON.parse(responseText.trim());
    } catch {
      // Strategy 2: Strip markdown fences
      const fenceMatch = responseText.match(
        /```(?:json)?\s*\n?([\s\S]*?)\n?```/
      );
      if (fenceMatch?.[1]) {
        try {
          analysisResult = JSON.parse(fenceMatch[1].trim());
        } catch {
          // continue to strategy 3
        }
      }

      // Strategy 3: Find the first { ... } block
      if (!analysisResult) {
        const firstBrace = responseText.indexOf("{");
        const lastBrace = responseText.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            analysisResult = JSON.parse(
              responseText.slice(firstBrace, lastBrace + 1)
            );
          } catch {
            // all strategies failed
          }
        }
      }
    }

    if (!analysisResult) {
      console.error(
        "[deal-fitness/analyze] Failed to parse. Length:",
        responseText.length,
        "Stop:",
        message.stop_reason
      );
      return NextResponse.json(
        {
          success: false,
          message: "Analysis failed — invalid response from AI",
        },
        { status: 500 }
      );
    }

    console.log(
      `[deal-fitness/analyze] Parsed successfully. Events: ${(analysisResult.events || []).length}, Commitments: ${(analysisResult.commitmentTracking || []).length}`
    );

    // ── Step E: Write events to database ──

    const detectedEvents = (analysisResult.events || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.status === "detected"
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notYetEvents = (analysisResult.events || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.status !== "detected"
    );

    let newEventsInserted = 0;
    let eventsUpdated = 0;

    // Helper: find contact ID from name
    function findContactId(name: string | null): string | null {
      if (!name) return null;
      const match = dealContacts.find((c) => {
        const fullName = `${c.firstName} ${c.lastName}`;
        return (
          fullName.toLowerCase() === name.toLowerCase() ||
          name.toLowerCase().includes(c.lastName.toLowerCase())
        );
      });
      return match?.id || null;
    }

    for (const event of detectedEvents) {
      const eventKey = event.eventKey as string;
      const labelInfo = EVENT_LABELS[eventKey];
      const contactId = findContactId(event.contactName);

      if (existingDetectedKeys.has(eventKey)) {
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
              evidenceSnippets: event.evidenceSnippets,
              detectionSources: event.detectionSources || ["transcript"],
              contactId,
              contactName: event.contactName || null,
              eventDescription:
                event.eventDescription ||
                labelInfo?.description ||
                null,
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
        // Insert new detected event
        await db.insert(dealFitnessEvents).values({
          dealId,
          fitCategory: event.fitCategory,
          eventKey,
          eventLabel: labelInfo?.label || event.eventLabel || eventKey,
          eventDescription:
            event.eventDescription ||
            labelInfo?.description ||
            "Detected from transcript analysis.",
          status: "detected",
          detectedAt: new Date(),
          lifecyclePhase: "pre_sale",
          detectionSources: event.detectionSources || ["transcript"],
          sourceReferences: event.evidenceSnippets
            ?.map(
              (s: { sourceId?: string; source?: string; sourceType?: string }) => ({
                type: s.sourceType || "transcript",
                id: s.sourceId || null,
                label: s.source || "Analysis",
              })
            ) || null,
          evidenceSnippets: event.evidenceSnippets || null,
          confidence: String(event.confidence || 0.7),
          detectedBy: "ai",
          contactId,
          contactName: event.contactName || null,
        });
        newEventsInserted++;
        existingDetectedKeys.add(eventKey);
      }
    }

    // Insert not_yet rows for events Claude identified as not_yet
    // AND for any canonical events not yet in the DB
    const allExistingEventKeys = await db
      .select({ eventKey: dealFitnessEvents.eventKey })
      .from(dealFitnessEvents)
      .where(eq(dealFitnessEvents.dealId, dealId));
    const allExistingSet = new Set(
      allExistingEventKeys.map((e) => e.eventKey)
    );

    // First handle Claude's not_yet events with coaching notes
    for (const event of notYetEvents) {
      const eventKey = event.eventKey as string;
      const labelInfo = EVENT_LABELS[eventKey];

      if (!allExistingSet.has(eventKey)) {
        await db.insert(dealFitnessEvents).values({
          dealId,
          fitCategory: event.fitCategory,
          eventKey,
          eventLabel: labelInfo?.label || event.eventLabel || eventKey,
          eventDescription: event.coachingNote || labelInfo?.description || null,
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
        allExistingSet.add(eventKey);
      } else if (event.coachingNote) {
        // Update existing not_yet event with coaching note if present
        await db
          .update(dealFitnessEvents)
          .set({
            eventDescription: event.coachingNote,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(dealFitnessEvents.dealId, dealId),
              eq(dealFitnessEvents.eventKey, eventKey),
              eq(dealFitnessEvents.status, "not_yet")
            )
          );
      }
    }

    // Fill in any remaining canonical events that Claude didn't mention
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

    // Upgrade any not_yet events that were detected in this analysis
    for (const event of detectedEvents) {
      const eventKey = event.eventKey as string;
      // If the event was already in DB as not_yet (not in detected set, but in allExisting set)
      if (
        !existingDetectedKeys.has(eventKey) &&
        allExistingSet.has(eventKey)
      ) {
        const contactId = findContactId(event.contactName);
        await db
          .update(dealFitnessEvents)
          .set({
            status: "detected",
            detectedAt: new Date(),
            confidence: String(event.confidence || 0.7),
            detectionSources: event.detectionSources || ["transcript"],
            sourceReferences: event.evidenceSnippets
              ?.map(
                (s: { sourceId?: string; source?: string; sourceType?: string }) => ({
                  type: s.sourceType || "transcript",
                  id: s.sourceId || null,
                  label: s.source || "Analysis",
                })
              ) || null,
            evidenceSnippets: event.evidenceSnippets || null,
            eventDescription:
              event.eventDescription ||
              EVENT_LABELS[eventKey]?.description ||
              null,
            detectedBy: "ai",
            contactId,
            contactName: event.contactName || null,
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

    // ── Step F: Compute and write scores ──

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
      const detected = catEvents.filter(
        (e) => e.status === "detected"
      ).length;
      const total = Math.max(FIT_EVENT_COUNTS[cat], catEvents.length);
      categoryScores[cat] = {
        detected,
        total,
        score:
          total > 0
            ? Math.min(100, Math.round((detected / total) * 100))
            : 0,
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
      (e) =>
        e.detectedAt && e.detectedAt >= twoWeeksAgo && e.detectedAt < weekAgo
    ).length;

    let velocityTrend: string = "stable";
    if (eventsThisWeek > eventsLastWeek + 1) velocityTrend = "accelerating";
    else if (eventsThisWeek < eventsLastWeek - 1)
      velocityTrend = "decelerating";
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

    // Build conversation signals from Claude's response
    const langProg = analysisResult.languageProgression;
    const conversationSignals = langProg
      ? {
          ownershipLanguage: {
            trend: langProg.trend || "detected",
            dataPoints: (langProg.examples || []).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (ex: any, i: number) => ({
                call: i + 1,
                label: ex.call || `Entry ${i + 1}`,
                week: i,
                yourProductPct:
                  ex.framing === "evaluative"
                    ? 100 - (langProg.ownershipPercentage || 50)
                    : 100 - (langProg.ownershipPercentage || 50),
                weOurPct: langProg.ownershipPercentage || 50,
                sampleQuotes: [ex.phrase],
              })
            ),
            insight: `Ownership language: ${langProg.ownershipPercentage || 50}% "we/our" usage. ${langProg.trend || ""}`,
          },
          sentimentProfile: {
            type:
              analysisResult.overallAssessment
                ? "engaged_with_healthy_skepticism"
                : "neutral",
            description:
              analysisResult.overallAssessment || "",
            keyMoments: [],
          },
          dealInsight: analysisResult.overallAssessment || null,
        }
      : null;

    // Build buyer momentum from Claude's response
    const respPattern = analysisResult.responseTimePattern;
    const commitTracking = analysisResult.commitmentTracking;
    const committeeExpansion = analysisResult.buyingCommitteeExpansion;

    const buyerMomentum =
      respPattern || commitTracking
        ? {
            responseTimeTrend: respPattern
              ? {
                  dataPoints: (respPattern.averageByWeek || []).map(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (w: any) => ({
                      week: w.week,
                      avgHours: w.avgHours,
                    })
                  ),
                  trend: respPattern.trend || "stable",
                  currentAvgHours:
                    respPattern.averageByWeek?.[
                      respPattern.averageByWeek.length - 1
                    ]?.avgHours || 0,
                  startingAvgHours:
                    respPattern.averageByWeek?.[0]?.avgHours || 0,
                }
              : null,
            emailDirectionality: committeeExpansion
              ? {
                  totalEmails: emailActivities.length,
                  buyerInitiated: emailActivities.filter(
                    (e) => e.type === "email_received"
                  ).length,
                  sellerInitiated: emailActivities.filter(
                    (e) => e.type === "email_sent"
                  ).length,
                  buyerInitiatedPct:
                    emailActivities.length > 0
                      ? Math.round(
                          (emailActivities.filter(
                            (e) => e.type === "email_received"
                          ).length /
                            emailActivities.length) *
                            100
                        )
                      : 0,
                  benchmark: { wonDealAvg: 60, lostDealAvg: 30 },
                  insight:
                    committeeExpansion.expansionPattern ||
                    "Committee expansion detected",
                }
              : null,
            commitmentFollowThrough: commitTracking
              ? {
                  totalCommitments: commitTracking.length,
                  fulfilled: commitTracking.filter(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (c: any) => c.status === "kept"
                  ).length,
                  fulfillmentRate:
                    commitTracking.length > 0
                      ? Math.round(
                          (commitTracking.filter(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (c: any) => c.status === "kept"
                          ).length /
                            commitTracking.length) *
                            100
                        )
                      : 0,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  commitments: commitTracking.map((c: any) => ({
                    madeBy: c.promisedBy || "unknown",
                    madeIn: c.promiseSource || "unknown",
                    week: 0,
                    commitment: c.promise || "",
                    fulfilled: c.status === "kept",
                    fulfilledHow: c.resolution || "",
                    fulfilledWeek: 0,
                  })),
                }
              : null,
          }
        : null;

    // Build stakeholder engagement from Claude's response
    const stakeholderEngagement = committeeExpansion
      ? {
          totalStakeholders: committeeExpansion.contacts?.length || 0,
          benchmark: {
            avgAtStage: 5,
            wonDealAvg: 5.8,
            position:
              (committeeExpansion.contacts?.length || 0) >= 6
                ? "above"
                : "at_or_below",
          },
          departmentsEngaged: new Set(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            committeeExpansion.contacts?.map((c: any) => c.role) || []
          ).size,
          departmentList: [
            ...new Set(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              committeeExpansion.contacts?.map((c: any) => c.role) || []
            ),
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contactTimeline: (committeeExpansion.contacts || []).map((c: any) => ({
            contactName: c.name,
            title: c.title || "",
            role: c.role || "unknown",
            firstActiveWeek: 0,
            weeksActive: [],
            callsJoined: [],
            emailsInvolved: 0,
            introducedBy: c.introducedBy || null,
          })),
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
      stakeholderEngagement,
      buyerMomentum,
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

    // ── Step G: Return response ──

    const totalDetected = allEvents.filter(
      (e) => e.status === "detected"
    ).length;
    const commitments = analysisResult.commitmentTracking || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keptCount = commitments.filter((c: any) => c.status === "kept").length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingCount = commitments.filter((c: any) => c.status === "pending").length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brokenCount = commitments.filter((c: any) => c.status === "broken").length;

    return NextResponse.json({
      success: true,
      dealId,
      eventsDetected: totalDetected,
      eventsTotal: 25,
      newEventsInserted,
      eventsUpdated,
      scores: {
        business: categoryScores.business_fit.score,
        emotional: categoryScores.emotional_fit.score,
        technical: categoryScores.technical_fit.score,
        readiness: categoryScores.readiness_fit.score,
        overall: overallFitness,
      },
      commitments: { kept: keptCount, pending: pendingCount, broken: brokenCount },
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

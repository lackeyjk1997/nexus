export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  activities,
  teamMembers,
  observations,
  agentConfigs,
  callTranscripts,
  callAnalyses,
  resources,
} from "@nexus/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const {
    type = "follow_up",
    dealId: rawDealId,
    accountId: rawAccountId,
    contactId: rawContactId,
    memberId,
    rawQuery,
    additionalContext,
  } = await request.json();

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // ── Resolve entities from rawQuery ──
  let resolvedDealId = rawDealId as string | undefined;
  let resolvedAccountId = rawAccountId as string | undefined;
  let resolvedContactId = rawContactId as string | undefined;

  if (!resolvedDealId && rawQuery) {
    const allDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        companyId: deals.companyId,
        companyName: companies.name,
        assignedAeId: deals.assignedAeId,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id));

    const lower = (rawQuery as string).toLowerCase();
    const match = allDeals.find((d) => {
      const companyWords = (d.companyName || "").toLowerCase().split(/\s+/);
      const dealWords = (d.name || "").toLowerCase().split(/\s+/);
      return (
        companyWords.some((w) => w.length >= 4 && lower.includes(w)) ||
        dealWords.some((w) => w.length >= 4 && lower.includes(w))
      );
    });

    if (match) {
      resolvedDealId = match.id;
      resolvedAccountId = match.companyId;
    } else {
      const [latest] = await db
        .select({ id: deals.id, companyId: deals.companyId })
        .from(deals)
        .where(eq(deals.assignedAeId, memberId))
        .orderBy(desc(deals.createdAt))
        .limit(1);
      if (latest) {
        resolvedDealId = latest.id;
        resolvedAccountId = latest.companyId;
      }
    }
  }

  // ── Gather context ──
  const [rep, agentConfigRow, dealRow, contactsForDeal, recentEmails, latestAnalysis, dealObs, allResources] =
    await Promise.all([
      db
        .select({ name: teamMembers.name, role: teamMembers.role })
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1)
        .then((r) => r[0] ?? null),

      db
        .select({
          instructions: agentConfigs.instructions,
          outputPreferences: agentConfigs.outputPreferences,
        })
        .from(agentConfigs)
        .where(
          and(eq(agentConfigs.teamMemberId, memberId), eq(agentConfigs.isActive, true))
        )
        .limit(1)
        .then((r) => r[0] ?? null),

      resolvedDealId
        ? db
            .select({
              id: deals.id,
              name: deals.name,
              stage: deals.stage,
              dealValue: deals.dealValue,
              vertical: deals.vertical,
              companyName: companies.name,
            })
            .from(deals)
            .leftJoin(companies, eq(deals.companyId, companies.id))
            .where(eq(deals.id, resolvedDealId!))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),

      resolvedAccountId
        ? db
            .select({
              id: contacts.id,
              firstName: contacts.firstName,
              lastName: contacts.lastName,
              title: contacts.title,
              roleInDeal: contacts.roleInDeal,
              email: contacts.email,
            })
            .from(contacts)
            .where(eq(contacts.companyId, resolvedAccountId!))
        : Promise.resolve([]),

      resolvedDealId
        ? db
            .select({
              type: activities.type,
              subject: activities.subject,
              description: activities.description,
              createdAt: activities.createdAt,
            })
            .from(activities)
            .where(
              and(
                eq(activities.dealId, resolvedDealId!),
                sql`${activities.type} IN ('email_sent', 'email_received')`
              )
            )
            .orderBy(desc(activities.createdAt))
            .limit(5)
        : Promise.resolve([]),

      resolvedDealId
        ? db
            .select({
              title: callTranscripts.title,
              date: callTranscripts.date,
              summary: callAnalyses.summary,
              painPoints: callAnalyses.painPoints,
              nextSteps: callAnalyses.nextSteps,
              coachingInsights: callAnalyses.coachingInsights,
            })
            .from(callTranscripts)
            .leftJoin(callAnalyses, eq(callTranscripts.id, callAnalyses.transcriptId))
            .where(eq(callTranscripts.dealId, resolvedDealId!))
            .orderBy(desc(callTranscripts.date))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),

      resolvedDealId
        ? db
            .select({ rawInput: observations.rawInput, createdAt: observations.createdAt })
            .from(observations)
            .where(
              sql`${observations.sourceContext}->>'dealId' = ${resolvedDealId} OR ${resolvedDealId} = ANY(${observations.linkedDealIds})`
            )
            .orderBy(desc(observations.createdAt))
            .limit(5)
        : Promise.resolve([]),

      db
        .select({
          title: resources.title,
          type: resources.type,
          description: resources.description,
          verticals: resources.verticals,
        })
        .from(resources),
    ]);

  // ── Filter resources by deal vertical ──
  const dealVertical = dealRow?.vertical || "";
  const relevantResources = allResources.filter(
    (r) => !r.verticals || r.verticals.includes(dealVertical) || r.verticals.includes("all")
  );

  // ── Pick primary contact ──
  const primaryContact = resolvedContactId
    ? contactsForDeal.find((c) => c.id === resolvedContactId) ?? contactsForDeal[0]
    : contactsForDeal.find((c) => c.roleInDeal === "champion") ??
      contactsForDeal.find((c) => c.roleInDeal === "economic_buyer") ??
      contactsForDeal[0];

  const outputPrefs = agentConfigRow?.outputPreferences as {
    communicationStyle?: string;
    guardrails?: string[];
    industryFocus?: string[];
  } | null;

  const systemPrompt = `You are an AI sales agent drafting an email for ${rep?.name || "a sales rep"}. Write in the rep's voice, following their communication style exactly.

REP DETAILS:
Name: ${rep?.name || "the rep"}
${agentConfigRow ? `Instructions: ${agentConfigRow.instructions}
Communication style: ${outputPrefs?.communicationStyle || "Professional and concise"}
Guardrails: ${JSON.stringify(outputPrefs?.guardrails || [])}` : "Communication style: Professional and concise"}

RULES:
- Write as if you ARE this rep. Use first person. Match their tone exactly.
- Follow all guardrails — if they say "never mention competitor pricing," don't.
- Keep it concise: 3-8 sentences max for the body.
- Include a clear call-to-action or next step.
- Reference specific things from recent activity to show you were listening.
- Do NOT write "I hope this email finds you well" or other generic openers.
- End with the rep's first name only.

EMAIL TYPE: ${type}
${type === "follow_up" && latestAnalysis ? `
This is a follow-up to a recent call. Reference specific points from the discussion.
Call summary: ${latestAnalysis.summary}
Pain points discussed: ${JSON.stringify(latestAnalysis.painPoints)}
Next steps identified: ${JSON.stringify(latestAnalysis.nextSteps)}
` : ""}
${type === "outreach" ? "This is an initial outreach email. The rep has not spoken with this person before." : ""}

AVAILABLE RESOURCES you can reference or suggest attaching:
${relevantResources.map(r => `- "${r.title}" (${r.type}) — ${r.description}`).join("\n")}

If the email calls for sharing documentation, use actual resource names. Instead of "I'll send some info," write "I'm attaching our HIPAA Compliance FAQ" or "I've included our Enterprise ROI Calculator."

${additionalContext ? `ADDITIONAL INSTRUCTIONS FROM THE REP:\n"${additionalContext}"\nIncorporate this naturally into the email. Weave it into the existing flow — don't treat it as a bolted-on paragraph.` : ""}

Return ONLY valid JSON:
{
  "subject": "Email subject line",
  "body": "The complete email body (use \\n for line breaks)",
  "to": "Recipient name and title (e.g. Oliver Laurent, VP of Engineering)",
  "notes_for_rep": "1-2 sentences of advice — why you wrote it this way or what to adjust"
}`;

  const userMessage = `Draft a ${type} email.

Deal: ${dealRow?.name || "Unknown deal"} — ${dealRow?.companyName || "Unknown company"}
Stage: ${dealRow?.stage || "unknown"}
Primary contact: ${primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}, ${primaryContact.title}` : "Unknown"}

Recent deal activity:
${recentEmails.map((e) => `- ${e.type}: ${e.subject} (${new Date(e.createdAt).toLocaleDateString("en-GB")})`).join("\n") || "No recent emails"}

Field intelligence:
${dealObs.map((o) => `- ${o.rawInput}`).join("\n") || "None"}

${additionalContext ? `Additional context: ${additionalContext}` : ""}
${rawQuery ? `Rep's request: ${rawQuery}` : ""}`;

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
    }

    const draft = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      draft,
      dealId: resolvedDealId,
      dealName: dealRow?.name,
      accountName: dealRow?.companyName,
      contactName: primaryContact
        ? `${primaryContact.firstName} ${primaryContact.lastName}`
        : null,
    });
  } catch (err) {
    console.error("Draft email error:", err);
    return NextResponse.json({ error: "Failed to generate draft" }, { status: 500 });
  }
}

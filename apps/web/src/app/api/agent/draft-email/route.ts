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
  crossAgentFeedback,
  systemIntelligence,
  managerDirectives,
} from "@nexus/db";
import { eq, desc, and, sql, ne, or, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

const VERTICAL_DISPLAY: Record<string, string[]> = {
  healthcare: ["Healthcare", "healthcare"],
  financial_services: ["Financial Services", "financial_services", "FinServ"],
  manufacturing: ["Manufacturing", "manufacturing"],
  retail: ["Retail", "retail"],
  technology: ["Technology", "technology"],
  general: ["General", "general"],
};

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

  // ── Team intelligence for email draft ──
  type TeamIntelItem = { name: string; role: string; guardrails: string[] };
  let teamIntel: TeamIntelItem[] = [];
  let crossFeedback: { content: string; sourceName: string }[] = [];

  try {
    if (dealVertical) {
      const verticalNames = VERTICAL_DISPLAY[dealVertical] || [dealVertical];
      const accountNameLower = (dealRow?.companyName || "").toLowerCase();

      const allOtherConfigs = await db
        .select({
          teamMemberId: agentConfigs.teamMemberId,
          instructions: agentConfigs.instructions,
          outputPreferences: agentConfigs.outputPreferences,
        })
        .from(agentConfigs)
        .where(
          and(
            ne(agentConfigs.teamMemberId, memberId),
            eq(agentConfigs.isActive, true)
          )
        );

      const verticalMembers = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            ne(teamMembers.id, memberId),
            eq(teamMembers.verticalSpecialization, dealVertical as typeof teamMembers.verticalSpecialization.enumValues[number])
          )
        );

      const allMembers = await db
        .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
        .from(teamMembers);
      const memberMap = new Map(allMembers.map((m) => [m.id, m]));

      const relevantMemberIds = new Set(verticalMembers.map((m) => m.id));
      for (const cfg of allOtherConfigs) {
        const prefs = cfg.outputPreferences as { industryFocus?: string[] } | null;
        if (prefs?.industryFocus?.some((f) => verticalNames.some((vn) => f.toLowerCase() === vn.toLowerCase()))) {
          relevantMemberIds.add(cfg.teamMemberId);
        }
      }

      for (const cfg of allOtherConfigs) {
        if (!relevantMemberIds.has(cfg.teamMemberId)) continue;
        const member = memberMap.get(cfg.teamMemberId);
        if (!member) continue;

        const prefs = cfg.outputPreferences as { guardrails?: string[] } | null;
        const guardrails = prefs?.guardrails || [];
        const relevantGuardrails = guardrails.filter((g) => {
          const lower = g.toLowerCase();
          return (
            verticalNames.some((vn) => lower.includes(vn.toLowerCase())) ||
            lower.includes(accountNameLower) ||
            lower.includes("compliance") ||
            lower.includes("always") ||
            lower.includes("never")
          );
        });

        const instrLower = (cfg.instructions || "").toLowerCase();
        if (
          verticalNames.some((vn) => instrLower.includes(vn.toLowerCase())) ||
          instrLower.includes(accountNameLower) ||
          relevantGuardrails.length > 0
        ) {
          teamIntel.push({
            name: member.name,
            role: member.role,
            guardrails: relevantGuardrails,
          });
        }
      }
    }
  } catch (err) {
    console.error("Email draft team intel query error (non-fatal):", err);
  }

  try {
    const rawFeedback = await db
      .select({
        content: crossAgentFeedback.content,
        sourceMemberId: crossAgentFeedback.sourceMemberId,
      })
      .from(crossAgentFeedback)
      .where(eq(crossAgentFeedback.targetMemberId, memberId))
      .orderBy(desc(crossAgentFeedback.createdAt))
      .limit(5);

    if (rawFeedback.length > 0) {
      const allMembers = await db
        .select({ id: teamMembers.id, name: teamMembers.name })
        .from(teamMembers);
      const nameMap = new Map(allMembers.map((m) => [m.id, m.name]));
      crossFeedback = rawFeedback.map((f) => ({
        content: f.content,
        sourceName: nameMap.get(f.sourceMemberId) || "a teammate",
      }));
    }
  } catch (err) {
    console.error("Email draft cross-feedback query error (non-fatal):", err);
  }

  // ── System intelligence + manager directives for email ──
  type SystemInsight = { title: string; insight: string };
  let emailSystemInsights: SystemInsight[] = [];
  try {
    if (dealVertical) {
      emailSystemInsights = await db
        .select({ title: systemIntelligence.title, insight: systemIntelligence.insight })
        .from(systemIntelligence)
        .where(
          and(
            eq(systemIntelligence.status, "active"),
            or(
              eq(systemIntelligence.vertical, dealVertical),
              isNull(systemIntelligence.vertical)
            ),
            or(
              eq(systemIntelligence.insightType, "competitive_pattern"),
              eq(systemIntelligence.insightType, "win_pattern"),
              eq(systemIntelligence.insightType, "loss_pattern")
            )
          )
        )
        .orderBy(desc(systemIntelligence.relevanceScore))
        .limit(3);
    }
  } catch (err) {
    console.error("Email system intel query error (non-fatal):", err);
  }

  type Directive = { directive: string; priority: string; category: string };
  let emailDirectives: Directive[] = [];
  try {
    emailDirectives = await db
      .select({
        directive: managerDirectives.directive,
        priority: managerDirectives.priority,
        category: managerDirectives.category,
      })
      .from(managerDirectives)
      .where(
        and(
          eq(managerDirectives.isActive, true),
          or(
            and(eq(managerDirectives.scope, "org_wide"), eq(managerDirectives.category, "messaging")),
            and(eq(managerDirectives.scope, "org_wide"), eq(managerDirectives.category, "positioning")),
            and(
              eq(managerDirectives.scope, "vertical"),
              eq(managerDirectives.vertical, dealVertical)
            )
          )
        )
      );
  } catch (err) {
    console.error("Email directives query error (non-fatal):", err);
  }

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

  // ── Build team intel prompt sections ──
  let teamIntelSection = "";
  if (teamIntel.length > 0) {
    teamIntelSection = `\n\nCONTEXT FROM YOUR TEAM (${dealVertical.toUpperCase().replace("_", " ")}):
Your teammates who specialize in this vertical have shared these insights. Include relevant ones naturally in the email — don't force them if they're not relevant to this specific follow-up.

${teamIntel.map((ti) => `From ${ti.name} (${ti.role}): ${ti.guardrails.join("; ") || "vertical specialist"}`).join("\n")}`;
  }

  let crossFeedbackSection = "";
  if (crossFeedback.length > 0) {
    crossFeedbackSection = `\n\nRECOMMENDATIONS FROM YOUR TEAMMATES:
${crossFeedback.map((f) => `- From ${f.sourceName}: ${f.content}`).join("\n")}

If any of these recommendations are relevant to this email, incorporate them naturally.`;
  }

  const systemPrompt = `You are an AI sales agent drafting an email for ${rep?.name || "a sales rep"}. Write in the rep's voice, following their communication style exactly.

${agentConfigRow ? `YOUR WRITING STYLE:
Persona & Instructions: ${agentConfigRow.instructions}
Communication Style: ${outputPrefs?.communicationStyle || "Professional and concise"}

Write this email in the style described above. Match the tone, sentence structure, and level of formality from the communication style. This email should sound like ${rep?.name || "the rep"}, not like a generic AI.

Guardrails (NEVER violate):
${(outputPrefs?.guardrails || []).map((g) => `- ${g}`).join("\n") || "- None"}` : `REP DETAILS:\nName: ${rep?.name || "the rep"}\nCommunication style: Professional and concise`}${teamIntelSection}${crossFeedbackSection}
${emailSystemInsights.length > 0 ? `\nSYSTEM INTELLIGENCE:\n${emailSystemInsights.map((si) => `📊 ${si.title}: ${si.insight}`).join("\n")}\nUse these insights to preemptively address common objections or position competitively.` : ""}
${emailDirectives.length > 0 ? `\nMANAGER DIRECTIVES:\n${emailDirectives.map((d) => {
  const label = d.priority === "mandatory" ? "🔴 MANDATORY" : d.priority === "strong" ? "🟡 STRONG" : "🟢 GUIDANCE";
  return `${label}: ${d.directive}`;
}).join("\n")}\nNEVER violate mandatory directives in the email content.` : ""}

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

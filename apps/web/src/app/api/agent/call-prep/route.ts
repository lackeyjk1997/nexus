export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  meddpiccFields,
  activities,
  teamMembers,
  observations,
  observationClusters,
  agentConfigs,
  callTranscripts,
  callAnalyses,
  resources,
  crossAgentFeedback,
  systemIntelligence,
  managerDirectives,
} from "@nexus/db";
import { eq, desc, and, sql, or, ne, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

// Map vertical enum values to display names for matching against industryFocus
const VERTICAL_DISPLAY: Record<string, string[]> = {
  healthcare: ["Healthcare", "healthcare"],
  financial_services: ["Financial Services", "financial_services", "FinServ"],
  manufacturing: ["Manufacturing", "manufacturing"],
  retail: ["Retail", "retail"],
  technology: ["Technology", "technology"],
  general: ["General", "general"],
};

export async function POST(request: Request) {
  const { dealId: rawDealId, accountId: rawAccountId, memberId, rawQuery, prepContext, attendeeIds } = await request.json();

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // ── Resolve deal from rawQuery if no dealId provided ──
  let resolvedDealId = rawDealId as string | undefined;
  let resolvedAccountId = rawAccountId as string | undefined;

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

    // Try to match by company name or deal name
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
      // Fall back to the AE's most recent deal
      const [latestDeal] = await db
        .select({ id: deals.id, companyId: deals.companyId })
        .from(deals)
        .where(eq(deals.assignedAeId, memberId))
        .orderBy(desc(deals.createdAt))
        .limit(1);
      if (latestDeal) {
        resolvedDealId = latestDeal.id;
        resolvedAccountId = latestDeal.companyId;
      }
    }
  }

  if (!resolvedDealId) {
    return NextResponse.json({ error: "Could not resolve deal" }, { status: 400 });
  }

  // ── Gather all context in parallel ──
  const [
    dealRow,
    meddpicc,
    dealContacts,
    recentActivities,
    dealObservations,
    activeClusters,
    agentConfigRow,
    dealTranscripts,
    rep,
    allResources,
  ] = await Promise.all([
    db
      .select({
        id: deals.id,
        name: deals.name,
        stage: deals.stage,
        dealValue: deals.dealValue,
        currency: deals.currency,
        closeDate: deals.closeDate,
        winProbability: deals.winProbability,
        forecastCategory: deals.forecastCategory,
        vertical: deals.vertical,
        competitor: deals.competitor,
        stageEnteredAt: deals.stageEnteredAt,
        companyName: companies.name,
        companyIndustry: companies.industry,
        companyEmployeeCount: companies.employeeCount,
        companyDescription: companies.description,
        companyHq: companies.hqLocation,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.id, resolvedDealId!))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select()
      .from(meddpiccFields)
      .where(eq(meddpiccFields.dealId, resolvedDealId!))
      .limit(1)
      .then((r) => r[0] ?? null),

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

    db
      .select({
        type: activities.type,
        subject: activities.subject,
        description: activities.description,
        createdAt: activities.createdAt,
        teamMemberName: teamMembers.name,
      })
      .from(activities)
      .leftJoin(teamMembers, eq(activities.teamMemberId, teamMembers.id))
      .where(eq(activities.dealId, resolvedDealId!))
      .orderBy(desc(activities.createdAt))
      .limit(10),

    db
      .select({
        id: observations.id,
        rawInput: observations.rawInput,
        aiClassification: observations.aiClassification,
        createdAt: observations.createdAt,
      })
      .from(observations)
      .where(
        sql`${observations.sourceContext}->>'dealId' = ${resolvedDealId} OR ${resolvedDealId} = ANY(${observations.linkedDealIds})`
      )
      .orderBy(desc(observations.createdAt))
      .limit(10),

    db
      .select({
        title: observationClusters.title,
        summary: observationClusters.summary,
        signalType: observationClusters.signalType,
        severity: observationClusters.severity,
        observationCount: observationClusters.observationCount,
        verticalsAffected: observationClusters.verticalsAffected,
      })
      .from(observationClusters)
      .where(eq(observationClusters.resolutionStatus, "emerging"))
      .orderBy(desc(observationClusters.arrImpactTotal))
      .limit(8),

    db
      .select({
        instructions: agentConfigs.instructions,
        outputPreferences: agentConfigs.outputPreferences,
      })
      .from(agentConfigs)
      .where(
        and(
          eq(agentConfigs.teamMemberId, memberId),
          eq(agentConfigs.isActive, true)
        )
      )
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        title: callTranscripts.title,
        date: callTranscripts.date,
        summary: callAnalyses.summary,
        painPoints: callAnalyses.painPoints,
        nextSteps: callAnalyses.nextSteps,
        coachingInsights: callAnalyses.coachingInsights,
        competitiveMentions: callAnalyses.competitiveMentions,
        callQualityScore: callAnalyses.callQualityScore,
      })
      .from(callTranscripts)
      .leftJoin(callAnalyses, eq(callTranscripts.id, callAnalyses.transcriptId))
      .where(eq(callTranscripts.dealId, resolvedDealId!))
      .orderBy(desc(callTranscripts.date))
      .limit(3),

    db
      .select({ name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1)
      .then((r) => r[0] ?? null),

    db
      .select({
        title: resources.title,
        type: resources.type,
        description: resources.description,
        verticals: resources.verticals,
      })
      .from(resources),
  ]);

  if (!dealRow) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const outputPrefs = agentConfigRow?.outputPreferences as {
    communicationStyle?: string;
    guardrails?: string[];
    dealStageRules?: Record<string, string>;
    industryFocus?: string[];
  } | null;

  // ── Team intelligence: query teammates' configs by vertical ──
  type TeamIntelItem = {
    name: string;
    role: string;
    instructions: string;
    guardrails: string[];
    dealStageRule: string | null;
    communicationStyle: string;
  };
  let teamIntel: TeamIntelItem[] = [];
  let crossFeedback: { content: string; sourceName: string }[] = [];

  const dealVertical = dealRow.vertical || "";

  try {
    if (dealVertical) {
      // Find team members who specialize in this vertical (excluding the current rep)
      const verticalMembers = await db
        .select({
          id: teamMembers.id,
          name: teamMembers.name,
          role: teamMembers.role,
          vertical: teamMembers.verticalSpecialization,
        })
        .from(teamMembers)
        .where(
          and(
            ne(teamMembers.id, memberId),
            eq(teamMembers.verticalSpecialization, dealVertical as typeof teamMembers.verticalSpecialization.enumValues[number])
          )
        );

      // Also find members whose industryFocus in agent config covers this vertical
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

      // Get all team members for name/role lookup
      const allMembers = await db
        .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
        .from(teamMembers);
      const memberMap = new Map(allMembers.map((m) => [m.id, m]));

      const verticalNames = VERTICAL_DISPLAY[dealVertical] || [dealVertical];
      const accountNameLower = (dealRow.companyName || "").toLowerCase();

      // Deduplicate: collect member IDs from both sources
      const relevantMemberIds = new Set<string>();
      for (const vm of verticalMembers) relevantMemberIds.add(vm.id);

      // Add members whose industryFocus covers this vertical
      for (const cfg of allOtherConfigs) {
        const prefs = cfg.outputPreferences as { industryFocus?: string[] } | null;
        if (prefs?.industryFocus?.some((f) => verticalNames.some((vn) => f.toLowerCase() === vn.toLowerCase()))) {
          relevantMemberIds.add(cfg.teamMemberId);
        }
      }

      // Build team intel from relevant configs
      for (const cfg of allOtherConfigs) {
        if (!relevantMemberIds.has(cfg.teamMemberId)) continue;
        const member = memberMap.get(cfg.teamMemberId);
        if (!member) continue;

        const prefs = cfg.outputPreferences as {
          communicationStyle?: string;
          guardrails?: string[];
          dealStageRules?: Record<string, string>;
          industryFocus?: string[];
        } | null;

        const instrLower = (cfg.instructions || "").toLowerCase();
        const guardrails = prefs?.guardrails || [];

        // Filter guardrails to vertical-relevant or universal ones
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

        // Include if they have relevant content
        const hasRelevantInstructions =
          verticalNames.some((vn) => instrLower.includes(vn.toLowerCase())) ||
          instrLower.includes(accountNameLower) ||
          instrLower.includes("hipaa") ||
          instrLower.includes("soc2") ||
          instrLower.includes("compliance");

        if (hasRelevantInstructions || relevantGuardrails.length > 0) {
          teamIntel.push({
            name: member.name,
            role: member.role,
            instructions: cfg.instructions,
            guardrails: relevantGuardrails,
            dealStageRule: prefs?.dealStageRules?.[dealRow.stage] || null,
            communicationStyle: prefs?.communicationStyle || "",
          });
        }
      }
    }
  } catch (err) {
    console.error("Team intelligence query error (non-fatal):", err);
  }

  // ── Cross-agent feedback directed at this rep ──
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
    console.error("Cross-agent feedback query error (non-fatal):", err);
  }

  // ── System intelligence for this vertical ──
  type SystemInsight = { title: string; insight: string; insightType: string; supportingData: unknown };
  let systemInsights: SystemInsight[] = [];
  try {
    systemInsights = await db
      .select({
        title: systemIntelligence.title,
        insight: systemIntelligence.insight,
        insightType: systemIntelligence.insightType,
        supportingData: systemIntelligence.supportingData,
      })
      .from(systemIntelligence)
      .where(
        and(
          eq(systemIntelligence.status, "active"),
          or(
            eq(systemIntelligence.vertical, dealVertical),
            isNull(systemIntelligence.vertical)
          )
        )
      )
      .orderBy(desc(systemIntelligence.relevanceScore))
      .limit(5);
  } catch (err) {
    console.error("System intelligence query error (non-fatal):", err);
  }

  // ── Manager directives ──
  type Directive = { directive: string; priority: string; category: string; scope: string; vertical: string | null };
  let directives: Directive[] = [];
  try {
    directives = await db
      .select({
        directive: managerDirectives.directive,
        priority: managerDirectives.priority,
        category: managerDirectives.category,
        scope: managerDirectives.scope,
        vertical: managerDirectives.vertical,
      })
      .from(managerDirectives)
      .where(
        and(
          eq(managerDirectives.isActive, true),
          or(
            eq(managerDirectives.scope, "org_wide"),
            and(
              eq(managerDirectives.scope, "vertical"),
              eq(managerDirectives.vertical, dealVertical)
            )
          ),
          or(
            isNull(managerDirectives.expiresAt),
            sql`${managerDirectives.expiresAt} >= NOW()`
          )
        )
      );
  } catch (err) {
    console.error("Manager directives query error (non-fatal):", err);
  }

  // ── Win/loss patterns from closed deals in this vertical ──
  type LossPattern = { reason: string | null; competitor: string | null; notes: string | null };
  type WinPattern = { turningPoint: string | null; replicable: string | null };
  let lossPatterns: LossPattern[] = [];
  let winPatterns: WinPattern[] = [];
  try {
    const closedDeals = await db
      .select({
        stage: deals.stage,
        lossReason: deals.lossReason,
        closeCompetitor: deals.closeCompetitor,
        closeNotes: deals.closeNotes,
        winTurningPoint: deals.winTurningPoint,
        winReplicable: deals.winReplicable,
      })
      .from(deals)
      .where(
        and(
          eq(deals.vertical, dealVertical as typeof deals.vertical.enumValues[number]),
          or(
            eq(deals.stage, "closed_won"),
            eq(deals.stage, "closed_lost")
          )
        )
      )
      .orderBy(desc(deals.closedAt))
      .limit(10);

    lossPatterns = closedDeals
      .filter((d) => d.stage === "closed_lost" && d.lossReason)
      .map((d) => ({ reason: d.lossReason, competitor: d.closeCompetitor, notes: d.closeNotes }));
    winPatterns = closedDeals
      .filter((d) => d.stage === "closed_won" && d.winTurningPoint)
      .map((d) => ({ turningPoint: d.winTurningPoint, replicable: d.winReplicable }));
  } catch (err) {
    console.error("Win/loss patterns query error (non-fatal):", err);
  }

  // ── Stakeholder engagement alerts ──
  type StakeholderAlert = { name: string; title: string | null; role: string | null; activityCount: number };
  let underEngagedStakeholders: StakeholderAlert[] = [];
  try {
    const keyRoles = ["economic_buyer", "champion"];
    const keyContacts = dealContacts.filter((c) => keyRoles.includes(c.roleInDeal || ""));

    for (const contact of keyContacts) {
      const contactName = `${contact.firstName} ${contact.lastName}`;
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.dealId, resolvedDealId!),
            or(
              sql`${activities.description} ILIKE ${"%" + contactName + "%"}`,
              sql`${activities.subject} ILIKE ${"%" + contactName + "%"}`,
              eq(activities.contactId, contact.id)
            )
          )
        );

      const count = Number(result[0]?.count || 0);
      if (count < 2) {
        underEngagedStakeholders.push({
          name: contactName,
          title: contact.title,
          role: contact.roleInDeal,
          activityCount: count,
        });
      }
    }
  } catch (err) {
    console.error("Stakeholder engagement query error (non-fatal):", err);
  }

  const daysInStage = dealRow.stageEnteredAt
    ? Math.floor((Date.now() - new Date(dealRow.stageEnteredAt).getTime()) / 86400000)
    : 0;

  // ── Filter clusters relevant to this deal's vertical ──
  const verticalClusters = activeClusters.filter(
    (c) => !c.verticalsAffected || c.verticalsAffected.includes(dealRow.vertical || "")
  );

  // ── Filter resources relevant to this deal's vertical ──
  const relevantResources = allResources.filter(
    (r) => !r.verticals || r.verticals.includes(dealRow.vertical || "") || r.verticals.includes("all")
  );

  // ── Build context for Claude ──
  const context = {
    rep_name: rep?.name || "the rep",
    deal: {
      name: dealRow.name,
      stage: dealRow.stage,
      value: dealRow.dealValue ? `€${Number(dealRow.dealValue).toLocaleString()}` : "Unknown",
      currency: dealRow.currency || "EUR",
      close_date: dealRow.closeDate ? new Date(dealRow.closeDate).toLocaleDateString("en-GB") : null,
      win_probability: dealRow.winProbability,
      forecast_category: dealRow.forecastCategory,
      days_in_stage: daysInStage,
      competitor: dealRow.competitor,
      vertical: dealRow.vertical,
    },
    account: {
      name: dealRow.companyName,
      industry: dealRow.companyIndustry,
      employees: dealRow.companyEmployeeCount,
      hq: dealRow.companyHq,
      description: dealRow.companyDescription,
    },
    meddpicc: meddpicc
      ? {
          metrics: meddpicc.metrics,
          metrics_confidence: meddpicc.metricsConfidence,
          economic_buyer: meddpicc.economicBuyer,
          economic_buyer_confidence: meddpicc.economicBuyerConfidence,
          decision_criteria: meddpicc.decisionCriteria,
          decision_criteria_confidence: meddpicc.decisionCriteriaConfidence,
          decision_process: meddpicc.decisionProcess,
          decision_process_confidence: meddpicc.decisionProcessConfidence,
          identify_pain: meddpicc.identifyPain,
          identify_pain_confidence: meddpicc.identifyPainConfidence,
          champion: meddpicc.champion,
          champion_confidence: meddpicc.championConfidence,
          competition: meddpicc.competition,
          competition_confidence: meddpicc.competitionConfidence,
        }
      : null,
    contacts: dealContacts.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      title: c.title,
      role: c.roleInDeal,
    })),
    recent_activities: recentActivities.map((a) => ({
      type: a.type,
      subject: a.subject,
      description: a.description,
      date: new Date(a.createdAt).toLocaleDateString("en-GB"),
      by: a.teamMemberName,
    })),
    field_intelligence: dealObservations.map((o) => ({
      text: o.rawInput,
      date: new Date(o.createdAt).toLocaleDateString("en-GB"),
      signals: (o.aiClassification as { signals?: Array<{ type: string }> } | null)?.signals?.map((s) => s.type) || [],
    })),
    team_intelligence: verticalClusters.map((c) => ({
      title: c.title,
      summary: c.summary,
      signal_type: c.signalType,
      severity: c.severity,
      observation_count: c.observationCount,
    })),
    previous_calls: dealTranscripts.map((t) => ({
      title: t.title,
      date: t.date ? new Date(t.date).toLocaleDateString("en-GB") : null,
      quality_score: t.callQualityScore,
      summary: t.summary,
      pain_points: t.painPoints,
      next_steps: t.nextSteps,
      competitive_mentions: t.competitiveMentions,
    })),
  };

  // ── Build attendee context if specific attendees selected ──
  let attendeeContext = "";
  if (attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0) {
    const selectedAttendees = dealContacts.filter((c) => attendeeIds.includes(c.id));
    if (selectedAttendees.length > 0) {
      attendeeContext = `\n\nMEETING ATTENDEES from the prospect side:\n${selectedAttendees.map((a) => `- ${a.firstName} ${a.lastName}, ${a.title || "Unknown title"} (${a.roleInDeal || "Stakeholder"})`).join("\n")}\n\nTailor talking points and questions to THESE specific people. For example, if the CFO is attending, include ROI and budget questions. If only engineers are attending, focus on technical depth.`;
    }
  }

  // ── Build prep context section ──
  let prepContextSection = "";
  if (prepContext) {
    prepContextSection = `\n\nThe rep is preparing for: "${prepContext}"\n\nTailor the entire brief to THIS specific type of meeting:\n- For discovery calls: focus on questions to ask, pain points to uncover, qualification gaps\n- For technical reviews: focus on technical talking points, demo flow, integration concerns\n- For executive meetings: focus on ROI, business case, competitive positioning, decision process\n- For negotiations: focus on pricing strategy, concession options, competitive pressure, closing tactics\n\nEvery section (talking points, questions, risks, suggested close) should be relevant to THIS meeting type, not generic deal overview.`;
  }

  // ── Build team intelligence prompt sections ──
  let teamIntelSection = "";
  if (teamIntel.length > 0) {
    teamIntelSection = `\n\nTEAM INTELLIGENCE FOR ${dealVertical.toUpperCase().replace("_", " ")}:
These insights come from your teammates who specialize in this vertical. They are experts. Weave relevant insights into your talking points and recommendations.

${teamIntel.map((ti) => `From ${ti.name} (${ti.role}):
Expertise: ${ti.instructions}${ti.guardrails.length > 0 ? `\nKey guidance:\n${ti.guardrails.map((g) => `  - ${g}`).join("\n")}` : ""}${ti.dealStageRule ? `\nFor ${dealRow.stage} stage: ${ti.dealStageRule}` : ""}`).join("\n\n")}`;
  }

  let crossFeedbackSection = "";
  if (crossFeedback.length > 0) {
    crossFeedbackSection = `\n\nRECOMMENDATIONS FROM YOUR TEAMMATES:
These are specific recommendations directed to you by colleagues who work alongside you.

${crossFeedback.map((f) => `- From ${f.sourceName}: ${f.content}`).join("\n")}`;
  }

  const teamIntelVisibilityInstruction = teamIntel.length > 0 || crossFeedback.length > 0
    ? `\n\nIMPORTANT — TEAM INTELLIGENCE VISIBILITY:
When team intelligence from teammates influences a talking point, risk assessment, or strategic recommendation, tag it clearly so the user can see where the insight came from. Use this format in relevant talking points or risks:
"📋 Team Intel from [Name] ([Role]): [the insight]"

Include 1-3 of the most relevant team intelligence items in the "team_intelligence" array, formatted as:
"📋 [Name] ([Role]): [concise insight relevant to this call]"

Do NOT include team intelligence that isn't relevant to this specific deal or meeting type. Only surface insights that would genuinely change how the AE approaches this particular conversation.`
    : "";

  const systemPrompt = `You are an AI sales agent preparing a call brief for ${rep?.name || "a sales rep"}. You have access to comprehensive CRM data, field intelligence from the team, and the rep's personal selling style.

Generate a call brief that the rep can read in 2 minutes and walk into the call prepared.${prepContextSection}${attendeeContext}

${agentConfigRow ? `YOUR AGENT CONFIGURATION:
Persona & Instructions: ${agentConfigRow.instructions}
Communication style: ${outputPrefs?.communicationStyle || "Professional and data-driven"}

Your Guardrails (NEVER violate these):
${(outputPrefs?.guardrails || []).map((g) => `- ${g}`).join("\n") || "- No guardrails set"}

${outputPrefs?.dealStageRules?.[dealRow.stage] ? `Stage-Specific Guidance for ${dealRow.stage}:\n${outputPrefs.dealStageRules[dealRow.stage]}` : ""}

Follow the persona and communication style above in the tone and approach of the brief. This brief should sound like it was written specifically for ${rep?.name || "this rep"}, not like a generic template.` : ""}${teamIntelSection}${crossFeedbackSection}${teamIntelVisibilityInstruction}

${systemInsights.length > 0 ? `SYSTEM INTELLIGENCE FOR ${dealVertical.toUpperCase().replace("_", " ")}:
These insights are derived from aggregated data across your team's deals, calls, and outcomes. They represent data-driven patterns. Use them to make your recommendations evidence-based.

${systemInsights.map((si) => {
  const sd = si.supportingData as { metric?: string; sample_size?: number; time_range?: string } | null;
  return `📊 ${si.title}\n${si.insight}${sd?.metric ? `\n(${sd.metric}, based on ${sd.sample_size || "multiple"} data points over ${sd.time_range || "recent period"})` : ""}`;
}).join("\n\n")}
` : ""}
${lossPatterns.length > 0 || winPatterns.length > 0 ? `WIN/LOSS INTELLIGENCE FOR ${dealVertical.toUpperCase().replace("_", " ")}:
Learn from recent outcomes in this vertical. Flag risks that match lost-deal patterns. Recommend tactics from won deals.

${lossPatterns.map((l) => `📉 Lost: ${l.reason?.replace("_", " ")}${l.competitor ? ` (to ${l.competitor})` : ""} — ${l.notes || "No details"}`).join("\n")}
${winPatterns.map((w) => `🏆 Won: ${w.turningPoint?.replace("_", " ")} — ${w.replicable || "No details"}`).join("\n")}
` : ""}
${underEngagedStakeholders.length > 0 ? `⚠️ STAKEHOLDER ENGAGEMENT ALERTS:
${underEngagedStakeholders.map((ue) => `⚠️ ${ue.name} (${ue.title || "Unknown title"}, ${ue.role?.replace("_", " ")}): Only ${ue.activityCount} logged interaction${ue.activityCount !== 1 ? "s" : ""}. ${ue.role === "economic_buyer" ? "Data shows deals without early Economic Buyer engagement close at only 18%." : ue.role === "champion" ? "Champions with fewer than 3 touchpoints rarely drive internal consensus." : "Consider scheduling a direct touchpoint."}`).join("\n")}
` : ""}
${directives.length > 0 ? `MANAGER DIRECTIVES (from leadership — carry authority):
${directives.map((d) => {
  const label = d.priority === "mandatory" ? "🔴 MANDATORY" : d.priority === "strong" ? "🟡 STRONG" : "🟢 GUIDANCE";
  return `${label}: ${d.directive}`;
}).join("\n")}

IMPORTANT: Mandatory directives are hard constraints. NEVER suggest actions that violate them (e.g., do not suggest discounts exceeding the stated limit). Strong directives should be followed. Guidance directives should inform your approach.
` : ""}
AVAILABLE RESOURCES FROM THE KNOWLEDGE BASE:
${relevantResources.map(r => `- "${r.title}" (${r.type}) — ${r.description}`).join("\n")}

When recommending talking points or next steps, reference specific resources by name. Don't say "send documentation" — say "share the HIPAA Compliance FAQ" or "attach the Claude vs Copilot comparison." Only recommend resources that are genuinely relevant to this deal.

Return ONLY valid JSON with this exact structure:
{
  "headline": "One sentence — the most important thing to know going into this call",
  "deal_snapshot": {
    "stage": "current stage label",
    "value": "formatted deal value",
    "days_in_stage": "N days",
    "health": "on_track | at_risk | needs_attention",
    "health_reason": "one sentence"
  },
  "stakeholders_in_play": [
    {
      "name": "Full name",
      "title": "Title",
      "role": "Champion | Economic Buyer | Technical Evaluator | Blocker | End User",
      "engagement": "hot | warm | cold",
      "last_contact": "date or null",
      "notes": "one sentence — what to know about this person"
    }
  ],
  "talking_points": [
    {
      "topic": "Short topic name",
      "why": "Why this matters for this specific call",
      "approach": "How to bring it up"
    }
  ],
  "questions_to_ask": [
    {
      "question": "The actual question to ask",
      "purpose": "What intelligence this extracts",
      "meddpicc_gap": "Which MEDDPICC field this fills, or null"
    }
  ],
  "risks_and_landmines": [
    {
      "risk": "What could go wrong",
      "source": "observations | cluster | transcript | crm | team_intel | system_intel | win_loss | directive",
      "mitigation": "How to handle it"
    }
  ],
  "team_intelligence": [
    "📋 [Name] ([Role]): Insight from teammate relevant to this call"
  ],
  "system_intelligence": [
    "📊 Data-driven insight from system analysis relevant to this call"
  ],
  "manager_directives": [
    "🔴 MANDATORY | 🟡 STRONG | 🟢 GUIDANCE: directive text"
  ],
  "competitive_context": "1-2 sentences about competitive situation if relevant, null otherwise",
  "suggested_resources": [
    {
      "title": "Exact resource title from the list above",
      "type": "resource type",
      "why": "One sentence — why this resource is relevant to this specific call"
    }
  ],
  "suggested_next_steps": [
    "What to propose at end of call"
  ]
}`;

  const client = new Anthropic();

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate a call brief for the ${dealRow.companyName} deal.\n\nContext:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
    }

    const brief = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      brief,
      dealId: resolvedDealId,
      dealName: dealRow.name,
      accountName: dealRow.companyName,
      dealStage: dealRow.stage,
      contacts: dealContacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        title: c.title,
        roleInDeal: c.roleInDeal,
        isPrimary: false, // not available in this select
      })),
    });
  } catch (err) {
    console.error("Call prep error:", err);
    return NextResponse.json({ error: "Failed to generate brief" }, { status: 500 });
  }
}

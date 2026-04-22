export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { observations, observationClusters, deals, teamMembers, notifications } from "@nexus/db";
import { eq, inArray, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// Map chip responses to structured data
const CHIP_TO_STRUCTURED: Record<string, Record<string, Record<string, unknown>>> = {
  scope: {
    "Just this deal": { scope: "this_deal" },
    "A few deals": { scope: "other_deals" },
    "Most of my deals": { scope: "whole_vertical", frequency: "most_deals" },
    "Every deal in this vertical": { scope: "whole_vertical", frequency: "every_deal" },
    "All my deals": { scope: "org_wide" },
    "This vertical only": { scope: "whole_vertical" },
    "Certain deal sizes": { scope: "other_deals" },
    "Just tried it once": { scope: "this_deal", frequency: "first_time" },
    "Seeing it broadly": { scope: "whole_vertical" },
    "Not sure yet": { scope: "other_deals" },
    "Across healthcare": { scope: "whole_vertical" },
    "Across the whole vertical": { scope: "whole_vertical", frequency: "most_deals" },
    "Other deals too": { scope: "other_deals" },
  },
  source: {
    "Prospect told me": { confidence: "certain", source: "prospect_told_me" },
    "Saw it online": { confidence: "moderate", source: "saw_online" },
    "Heard from another rep": { confidence: "moderate", source: "heard_from_rep" },
    "Lost a deal to them": { confidence: "certain", source: "lost_deal" },
  },
  impact: {
    "Completely blocked": { impact_severity: "blocking" },
    "Significantly slowed": { impact_severity: "slowing" },
    "Minor delay": { impact_severity: "annoying" },
    "Just annoying": { impact_severity: "informational" },
  },
  frequency: {
    "Every deal": { frequency: "every_deal" },
    "Most deals": { frequency: "most_deals" },
    "Occasional": { frequency: "occasional" },
    "First time": { frequency: "first_time" },
  },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { responseText, responseSource, selectedChip } = await request.json();

  if (!responseText) {
    return NextResponse.json({ error: "responseText is required" }, { status: 400 });
  }

  // Fetch the original observation
  const [obs] = await db.select().from(observations).where(eq(observations.id, id)).limit(1);
  if (!obs) {
    return NextResponse.json({ error: "Observation not found" }, { status: 404 });
  }

  // Determine which field the follow-up clarified
  const question = (obs.followUpQuestion || "").toLowerCase();
  let clarifies = "scope";
  if (question.includes("hear") || question.includes("source")) clarifies = "source";
  if (question.includes("severe") || question.includes("blocking") || question.includes("impact")) clarifies = "impact";
  if (question.includes("often") || question.includes("frequent")) clarifies = "frequency";

  // Build structured data from chip or free text
  let structuredData: Record<string, unknown> = {};

  if (responseSource === "chip" && selectedChip) {
    // Try exact match in the appropriate category
    structuredData = { ...(CHIP_TO_STRUCTURED[clarifies]?.[selectedChip] || {}) };
    // If no match found, try all categories
    if (Object.keys(structuredData).length === 0) {
      for (const category of Object.values(CHIP_TO_STRUCTURED)) {
        if (category[selectedChip]) {
          structuredData = { ...category[selectedChip] };
          break;
        }
      }
    }
  }

  // Free text parsing as fallback or supplement
  if (Object.keys(structuredData).length === 0 || responseSource === "text") {
    const textLower = responseText.toLowerCase();
    if (textLower.includes("every") || textLower.includes("all") || textLower.includes("across")) {
      structuredData.frequency = structuredData.frequency || "every_deal";
      structuredData.scope = structuredData.scope || "whole_vertical";
    } else if (textLower.includes("most") || textLower.includes("many") || textLower.includes("other deals")) {
      structuredData.frequency = structuredData.frequency || "most_deals";
      structuredData.scope = structuredData.scope || "other_deals";
    } else if (textLower.includes("just this") || textLower.includes("only this") || textLower.includes("one deal")) {
      structuredData.scope = structuredData.scope || "this_deal";
    }
    if (textLower.includes("prospect") || textLower.includes("customer") || textLower.includes("told me")) {
      structuredData.source = structuredData.source || "prospect_told_me";
      structuredData.confidence = structuredData.confidence || "certain";
    }
    if (textLower.includes("block") || textLower.includes("stuck") || textLower.includes("completely")) {
      structuredData.impact_severity = structuredData.impact_severity || "blocking";
    } else if (textLower.includes("slow") || textLower.includes("delay")) {
      structuredData.impact_severity = structuredData.impact_severity || "slowing";
    }
  }

  // Carry over deal context
  const sourceCtx = obs.sourceContext as { dealId?: string } | null;
  if (sourceCtx?.dealId) {
    structuredData.affected_deal_ids = structuredData.affected_deal_ids || [sourceCtx.dealId];
  }

  // Calculate ARR impact from linked deals
  const dealIds = (structuredData.affected_deal_ids as string[]) || [];
  let arrImpact: { total_value: number; deal_count: number; deals: Array<{ id: string; name: string; value: number; stage: string }> } | null = null;

  if (dealIds.length > 0) {
    const matchedDeals = await db
      .select({ id: deals.id, name: deals.name, dealValue: deals.dealValue, stage: deals.stage })
      .from(deals)
      .where(inArray(deals.id, dealIds));

    if (matchedDeals.length > 0) {
      const dealResults = matchedDeals.map(d => ({
        id: d.id,
        name: d.name,
        value: Number(d.dealValue) || 0,
        stage: d.stage,
      }));
      arrImpact = {
        total_value: dealResults.reduce((sum, d) => sum + d.value, 0),
        deal_count: dealResults.length,
        deals: dealResults,
      };
    }
  }

  // Update the observation
  const existingLifecycle = (obs.lifecycleEvents as Array<{ status: string; timestamp: string }>) || [];

  await db
    .update(observations)
    .set({
      followUpResponse: responseText,
      structuredData,
      arrImpact: arrImpact,
      status: "routed",
      lifecycleEvents: [
        ...existingLifecycle,
        { status: "follow_up_answered", timestamp: new Date().toISOString() },
        { status: "routed", timestamp: new Date().toISOString() },
      ],
      updatedAt: new Date(),
    })
    .where(eq(observations.id, id));

  // Update cluster ARR if observation belongs to one
  if (obs.clusterId) {
    await recalculateClusterArr(obs.clusterId);
  }

  // Fire notification chains if scope is broader than this_deal
  const scope = structuredData.scope as string | undefined;
  if (scope && scope !== "this_deal") {
    await fireNotificationChains(obs, structuredData, scope);
  }

  // Build enhanced give back
  const existingGiveback = obs.aiGiveback as { acknowledgment?: string; related_observations_hint?: string; routing?: string } | null;

  const scopeLabels: Record<string, string> = {
    this_deal: "this specific deal",
    other_deals: "multiple deals",
    whole_vertical: "the entire vertical",
    org_wide: "the whole org",
  };

  const scopeStr = scope ? ` across ${scopeLabels[scope] || scope}` : "";

  const enhancedGiveback = {
    acknowledgment: `${existingGiveback?.acknowledgment || "Got it."} Signal confirmed${scopeStr}.`,
    related_observations_hint: existingGiveback?.related_observations_hint || "We'll watch for similar signals from the team.",
    routing: existingGiveback?.routing || "Routed to: Field Intelligence",
    arr_impact: arrImpact ? { total_value: arrImpact.total_value, deal_count: arrImpact.deal_count } : null,
  };

  return NextResponse.json({
    id: obs.id,
    giveback: enhancedGiveback,
    structured_data: structuredData,
  });
}

// ── Recalculate cluster ARR ──

async function recalculateClusterArr(clusterId: string) {
  const obsInCluster = await db
    .select({ arrImpact: observations.arrImpact })
    .from(observations)
    .where(eq(observations.clusterId, clusterId));

  let total = 0;
  for (const obs of obsInCluster) {
    const impact = obs.arrImpact as { total_value?: number } | null;
    total += impact?.total_value || 0;
  }

  await db
    .update(observationClusters)
    .set({ arrImpactTotal: String(total), updatedAt: new Date() })
    .where(eq(observationClusters.id, clusterId));
}

// ── Notification Chains ──

async function fireNotificationChains(
  obs: typeof observations.$inferSelect,
  structuredData: Record<string, unknown>,
  scope: string
) {
  const classification = obs.aiClassification as { signals?: Array<{ type: string; summary?: string }> } | null;
  const signalSummary = classification?.signals?.[0]?.summary || obs.rawInput.slice(0, 80);
  const signalType = classification?.signals?.[0]?.type || "field_intelligence";

  // Get observer's info
  const [observer] = await db
    .select({ name: teamMembers.name, role: teamMembers.role, verticalSpecialization: teamMembers.verticalSpecialization })
    .from(teamMembers)
    .where(eq(teamMembers.id, obs.observerId))
    .limit(1);

  if (!observer) return;

  // Find other reps in the same vertical who should hear about this
  const targetReps = await db
    .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.verticalSpecialization, observer.verticalSpecialization || "general"),
        eq(teamMembers.isActive, true)
      )
    );

  const roleTitleMap: Record<string, string> = {
    AE: "Account Executive",
    BDR: "BDR",
    SA: "Solutions Consultant",
    CSM: "CSM",
    MANAGER: "Manager",
  };

  for (const rep of targetReps) {
    // Don't notify the observer themselves
    if (rep.id === obs.observerId) continue;

    try {
      await db.insert(notifications).values({
        teamMemberId: rep.id,
        type: "system_intelligence",
        title: `A teammate flagged a ${signalType.replace("_", " ")} signal`,
        message: `${roleTitleMap[observer.role || "AE"] || observer.role} in ${observer.verticalSpecialization || "your vertical"}: "${signalSummary}" — Are you seeing this too?`,
        priority: scope === "whole_vertical" || scope === "org_wide" ? "high" : "medium",
        isRead: false,
      });
    } catch (err) {
      console.error("Failed to create chain notification for", rep.id, err);
    }
  }
}

interface CoordinatedIntelItem {
  patternId?: string;
  signalType?: string;
  vertical?: string;
  competitor?: string;
  synthesis?: string;
  recommendations?: string[];
  affectedDeals?: string[];
  detectedAt?: string;
  receivedAt?: string;
}

export interface DealAgentStateData {
  dealId: string;
  dealName: string;
  companyName: string;
  learnings: string[];
  riskSignals: string[];
  competitiveContext: {
    competitors: string[];
    ourDifferentiators: string[];
    recentMentions: Array<{
      date: string;
      competitor: string;
      context: string;
    }>;
  } | null;
  interactionCount: number;
  lastInteractionDate: string | null;
  coordinatedIntel: CoordinatedIntelItem[];
  createdAt?: string | null;
}

export function formatMemoryForPrompt(state: DealAgentStateData): string {
  if (state.interactionCount === 0) {
    return "";
  }

  const sections: string[] = [];

  // Header
  const daysSinceCreation = state.createdAt
    ? Math.floor((Date.now() - new Date(state.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  sections.push(
    `This deal agent has been active for ${daysSinceCreation} day(s) with ${state.interactionCount} interaction(s).`
  );

  // Key learnings
  if (state.learnings.length > 0) {
    sections.push(
      `### Key Learnings\n${state.learnings.map((l) => `- ${l}`).join("\n")}`
    );
  }

  // Risk signals
  if (state.riskSignals.length > 0) {
    sections.push(
      `### Active Risk Signals\n${state.riskSignals.map((r) => `- ⚠️ ${r}`).join("\n")}`
    );
  }

  // Competitive context
  if (state.competitiveContext && state.competitiveContext.competitors.length > 0) {
    let compSection = `### Competitive Context\nCompetitors: ${state.competitiveContext.competitors.join(", ")}`;
    if (state.competitiveContext.ourDifferentiators.length > 0) {
      compSection += `\nOur differentiators: ${state.competitiveContext.ourDifferentiators.join(", ")}`;
    }
    if (state.competitiveContext.recentMentions.length > 0) {
      const recent = state.competitiveContext.recentMentions.slice(-3);
      compSection += `\nRecent mentions:\n${recent.map((m) => `- ${m.date}: ${m.competitor} — ${m.context}`).join("\n")}`;
    }
    sections.push(compSection);
  }

  // Cross-deal coordinated intelligence
  if (state.coordinatedIntel.length > 0) {
    sections.push(
      "### Cross-Deal Intelligence (from Nexus Intelligence Coordinator)"
    );
    for (const intel of state.coordinatedIntel) {
      const signalLabel = (intel.signalType || "unknown").replace(/_/g, " ").toUpperCase();
      const deals = intel.affectedDeals || [];
      sections.push(
        `**${signalLabel}** across ${deals.join(", ")}:`
      );
      if (intel.synthesis) sections.push(intel.synthesis);
      if (intel.recommendations && intel.recommendations.length > 0) {
        sections.push("Recommended actions:");
        intel.recommendations.forEach((r) => sections.push(`- ${r}`));
      }
      sections.push("");
    }
  }

  return sections.join("\n\n");
}

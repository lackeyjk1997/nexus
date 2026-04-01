import { actor, event } from "rivetkit";

// ── Types ──

export interface InteractionMemory {
  date: string;
  type:
    | "call_prep"
    | "transcript_analysis"
    | "email_draft"
    | "observation"
    | "feedback"
    | "stage_change";
  summary: string;
  insights?: string[];
  feedback?: { rating?: number; comment?: string };
}

export interface DealAgentState {
  dealId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  initialized: boolean;

  // Accumulated intelligence
  interactionMemory: InteractionMemory[];

  // Synthesized learnings
  learnings: string[];

  // Active signals
  riskSignals: string[];
  competitiveContext: {
    competitors: string[];
    ourDifferentiators: string[];
    recentMentions: Array<{
      date: string;
      competitor: string;
      context: string;
    }>;
  };

  // Agent health
  daysSinceCreation: number;
  totalInteractions: number;
  lastInteractionDate: string | null;
  lastCallPrepFeedback: {
    date: string;
    rating: number;
    comment: string;
  } | null;

  // Pipeline status
  currentStage: string;
  stageEnteredAt: string | null;
  lastCustomerResponseDate: string | null;
}

// ── Helper: format memory for prompt injection ──

export function formatMemoryForPrompt(state: DealAgentState): string {
  if (!state.initialized || state.totalInteractions === 0) {
    return "";
  }

  const sections: string[] = [];

  // Header
  sections.push(
    `This deal agent has been active for ${state.daysSinceCreation} day(s) with ${state.totalInteractions} interaction(s).`
  );

  // Key learnings
  if (state.learnings.length > 0) {
    sections.push(
      `### Key Learnings\n${state.learnings.map((l) => `- ${l}`).join("\n")}`
    );
  }

  // Recent interaction patterns
  const recentInteractions = state.interactionMemory.slice(-5);
  if (recentInteractions.length > 0) {
    const typeCount: Record<string, number> = {};
    for (const i of recentInteractions) {
      typeCount[i.type] = (typeCount[i.type] || 0) + 1;
    }
    const pattern = Object.entries(typeCount)
      .map(([t, c]) => `${c} ${t.replace(/_/g, " ")}(s)`)
      .join(", ");
    sections.push(`### Recent Activity Pattern\nLast 5 interactions: ${pattern}`);
  }

  // Last call prep feedback
  if (state.lastCallPrepFeedback) {
    const { rating, comment, date } = state.lastCallPrepFeedback;
    sections.push(
      `### Last Call Prep Feedback (${date})\nRating: ${rating}/5${comment ? `\nFeedback: "${comment}"` : ""}\n${rating <= 2 ? "⚠️ Previous brief was poorly rated — adjust approach significantly." : rating >= 4 ? "Previous brief was well received — maintain similar approach." : "Previous brief was acceptable but could improve."}`
    );
  }

  // Risk signals
  if (state.riskSignals.length > 0) {
    sections.push(
      `### Active Risk Signals\n${state.riskSignals.map((r) => `- ⚠️ ${r}`).join("\n")}`
    );
  }

  // Competitive context
  if (state.competitiveContext.competitors.length > 0) {
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

  return sections.join("\n\n");
}

// ── Actor Definition ──

const DEFAULT_STATE: DealAgentState = {
  dealId: "",
  dealName: "",
  companyName: "",
  vertical: "",
  initialized: false,
  interactionMemory: [],
  learnings: [],
  riskSignals: [],
  competitiveContext: {
    competitors: [],
    ourDifferentiators: [],
    recentMentions: [],
  },
  daysSinceCreation: 0,
  totalInteractions: 0,
  lastInteractionDate: null,
  lastCallPrepFeedback: null,
  currentStage: "",
  stageEnteredAt: null,
  lastCustomerResponseDate: null,
};

export const dealAgent = actor({
  state: { ...DEFAULT_STATE },

  events: {
    memoryUpdated: event<{ type: string; summary: string }>(),
    learningsUpdated: event<{ learnings: string[] }>(),
    riskDetected: event<{ signal: string; details: string }>(),
    workflowProgress: event<{
      step: string;
      status: "running" | "complete" | "error";
      details?: string;
    }>(),
    interventionReady: event<{
      type: string;
      summary: string;
      recommendation: string;
    }>(),
  },

  actions: {
    initialize: (
      c,
      data: {
        dealId: string;
        dealName: string;
        companyName: string;
        vertical: string;
        currentStage: string;
        stageEnteredAt: string | null;
      }
    ) => {
      c.state.dealId = data.dealId;
      c.state.dealName = data.dealName;
      c.state.companyName = data.companyName;
      c.state.vertical = data.vertical;
      c.state.currentStage = data.currentStage;
      c.state.stageEnteredAt = data.stageEnteredAt;
      c.state.initialized = true;
      c.state.daysSinceCreation = 0;
    },

    getState: (c) => {
      return c.state;
    },

    recordInteraction: (
      c,
      interaction: {
        type: InteractionMemory["type"];
        summary: string;
        insights?: string[];
        feedback?: { rating?: number; comment?: string };
      }
    ) => {
      const entry: InteractionMemory = {
        date: new Date().toISOString().split("T")[0],
        ...interaction,
      };

      c.state.interactionMemory.push(entry);
      // Keep last 50
      if (c.state.interactionMemory.length > 50) {
        c.state.interactionMemory = c.state.interactionMemory.slice(-50);
      }

      c.state.totalInteractions += 1;
      c.state.lastInteractionDate = entry.date;

      c.broadcast("memoryUpdated", {
        type: interaction.type,
        summary: interaction.summary,
      });
    },

    recordFeedback: (c, feedback: { rating: number; comment: string }) => {
      const date = new Date().toISOString().split("T")[0];
      c.state.lastCallPrepFeedback = { date, ...feedback };

      c.state.interactionMemory.push({
        date,
        type: "feedback",
        summary: `Call prep rated ${feedback.rating}/5: ${feedback.comment}`,
        feedback: { rating: feedback.rating, comment: feedback.comment },
      });
      if (c.state.interactionMemory.length > 50) {
        c.state.interactionMemory = c.state.interactionMemory.slice(-50);
      }

      c.state.totalInteractions += 1;
      c.state.lastInteractionDate = date;

      c.broadcast("memoryUpdated", {
        type: "feedback",
        summary: `Feedback: ${feedback.rating}/5`,
      });
    },

    updateLearnings: (c, newLearnings: string[]) => {
      const combined = [...c.state.learnings, ...newLearnings];
      // Deduplicate by lowercase comparison
      const seen = new Set<string>();
      const deduped: string[] = [];
      for (const l of combined) {
        const key = l.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(l);
        }
      }
      // Keep last 20
      c.state.learnings = deduped.slice(-20);
      c.broadcast("learningsUpdated", { learnings: c.state.learnings });
    },

    addCompetitiveIntel: (
      c,
      intel: {
        competitor: string;
        context: string;
        differentiators?: string[];
      }
    ) => {
      // Add competitor if new
      if (!c.state.competitiveContext.competitors.includes(intel.competitor)) {
        c.state.competitiveContext.competitors.push(intel.competitor);
      }

      // Add differentiators
      if (intel.differentiators) {
        for (const d of intel.differentiators) {
          if (!c.state.competitiveContext.ourDifferentiators.includes(d)) {
            c.state.competitiveContext.ourDifferentiators.push(d);
          }
        }
      }

      // Add recent mention
      c.state.competitiveContext.recentMentions.push({
        date: new Date().toISOString().split("T")[0],
        competitor: intel.competitor,
        context: intel.context,
      });
      // Keep last 10
      if (c.state.competitiveContext.recentMentions.length > 10) {
        c.state.competitiveContext.recentMentions =
          c.state.competitiveContext.recentMentions.slice(-10);
      }
    },

    addRiskSignal: (c, signal: string, _details: string) => {
      if (!c.state.riskSignals.includes(signal)) {
        c.state.riskSignals.push(signal);
        c.broadcast("riskDetected", { signal, details: _details });
      }
    },

    removeRiskSignal: (c, signal: string) => {
      c.state.riskSignals = c.state.riskSignals.filter((s) => s !== signal);
    },

    updateStage: (c, stage: string) => {
      const prevStage = c.state.currentStage;
      c.state.currentStage = stage;
      c.state.stageEnteredAt = new Date().toISOString();

      c.state.interactionMemory.push({
        date: new Date().toISOString().split("T")[0],
        type: "stage_change",
        summary: `Stage changed from ${prevStage} to ${stage}`,
      });
      if (c.state.interactionMemory.length > 50) {
        c.state.interactionMemory = c.state.interactionMemory.slice(-50);
      }

      c.state.totalInteractions += 1;
      c.state.lastInteractionDate =
        new Date().toISOString().split("T")[0];

      c.broadcast("memoryUpdated", {
        type: "stage_change",
        summary: `Stage: ${prevStage} → ${stage}`,
      });
    },

    getMemoryForPrompt: (c) => {
      return formatMemoryForPrompt(c.state);
    },
  },
});

import { actor, event } from "rivetkit";
import {
  normalizeCompetitorName,
  validateLearnings,
  consolidateLearnings,
} from "@/lib/validation";

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

export interface BriefReady {
  brief: unknown;
  generatedAt: string;
  context: string;
  dismissed: boolean;
}

export interface InterventionAction {
  type: 'update_field';
  field: string;              // Deal field: 'close_date', 'stage', 'win_probability'
  currentValue: string;
  suggestedValue: string;
  displayLabel: string;       // Human label: "Close Date", "Stage", "Win Probability"
}

export interface ActiveIntervention {
  type: string;               // 'timeline_risk', 'stall_detected', 'stage_advancement', etc.
  title: string;
  diagnosis: string;
  recommendation?: string;    // Optional — kept for backward compat with old interventions
  action?: InterventionAction; // Optional — some interventions are informational only
  detectedAt?: string;
  dismissed: boolean;
}

export interface CoordinatedIntel {
  patternId: string;
  signalType: string;
  vertical: string;
  competitor?: string;
  synthesis: string;
  recommendations: string[];
  affectedDeals: string[];
  detectedAt: string;
  receivedAt: string;
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

  // Cross-deal coordinated intelligence (pushed by coordinator)
  coordinatedIntel: CoordinatedIntel[];

  // Agent health
  createdAt: string | null;
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
  closeDate: string | null;

  // Prepared brief (auto-generated after transcript processing)
  briefReady: BriefReady | null;

  // Flag set by pipeline to indicate brief should be generated client-side
  briefPending: boolean;

  // Proactive interventions
  activeIntervention: ActiveIntervention | null;

  // Health check tracking
  lastHealthCheck: string | null;
  healthScore: number;
}

// ── Helper: format memory for prompt injection ──

export function formatMemoryForPrompt(state: DealAgentState): string {
  if (!state.initialized || state.totalInteractions === 0) {
    return "";
  }

  const sections: string[] = [];

  // Header
  const daysSinceCreation = state.createdAt
    ? Math.floor((Date.now() - new Date(state.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  sections.push(
    `This deal agent has been active for ${daysSinceCreation} day(s) with ${state.totalInteractions} interaction(s).`
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

  // Cross-deal coordinated intelligence
  if (state.coordinatedIntel.length > 0) {
    sections.push(
      "### Cross-Deal Intelligence (from Nexus Intelligence Coordinator)"
    );
    for (const intel of state.coordinatedIntel) {
      sections.push(
        `**${intel.signalType.replace(/_/g, " ").toUpperCase()}** across ${intel.affectedDeals.join(", ")}:`
      );
      sections.push(intel.synthesis);
      if (intel.recommendations.length > 0) {
        sections.push("Recommended actions:");
        intel.recommendations.forEach((r) => sections.push(`- ${r}`));
      }
      sections.push("");
    }
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
  coordinatedIntel: [],
  createdAt: null,
  totalInteractions: 0,
  lastInteractionDate: null,
  lastCallPrepFeedback: null,
  currentStage: "",
  stageEnteredAt: null,
  closeDate: null,
  briefReady: null,
  briefPending: false,
  activeIntervention: null,
  lastHealthCheck: null,
  healthScore: 100,
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
      title: string;
    }>(),
    briefReady: event<{ generatedAt: string }>(),
    briefPending: event<Record<string, never>>(),
    healthChecked: event<{ score: number; issues: string[] }>(),
    coordinatedIntelReceived: event<{
      signalType: string;
      synthesis: string;
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
        closeDate?: string | null;
      }
    ) => {
      c.state.dealId = data.dealId;
      c.state.dealName = data.dealName;
      c.state.companyName = data.companyName;
      c.state.vertical = data.vertical;
      c.state.currentStage = data.currentStage;
      c.state.stageEnteredAt = data.stageEnteredAt;
      c.state.closeDate = data.closeDate ?? null;
      c.state.initialized = true;
      c.state.createdAt = new Date().toISOString();

      // Schedule first health check after 30 seconds (demo timing)
      c.schedule.after(30000, "runHealthCheck");
    },

    getState: (c) => {
      return c.state;
    },

    destroyActor: (c) => {
      c.destroy();
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

      // Re-schedule health check if not recently run (10 sec delay for demo)
      if (!c.state.lastHealthCheck ||
          Date.now() - new Date(c.state.lastHealthCheck).getTime() > 60000) {
        c.schedule.after(10000, "runHealthCheck");
      }
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
      const validated = validateLearnings(newLearnings);
      c.state.learnings = consolidateLearnings(c.state.learnings, validated);
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
      const normalized = normalizeCompetitorName(intel.competitor);
      if (!normalized) {
        console.log(
          `[deal-agent] Rejected competitor name: "${intel.competitor}"`
        );
        return;
      }

      if (!c.state.competitiveContext.competitors.includes(normalized)) {
        c.state.competitiveContext.competitors.push(normalized);
      }

      if (intel.differentiators) {
        for (const d of intel.differentiators) {
          if (!c.state.competitiveContext.ourDifferentiators.includes(d)) {
            c.state.competitiveContext.ourDifferentiators.push(d);
          }
        }
      }

      c.state.competitiveContext.recentMentions = [
        ...c.state.competitiveContext.recentMentions.slice(-9),
        {
          date: new Date().toISOString().split("T")[0],
          competitor: normalized,
          context: intel.context,
        },
      ];
    },

    addRiskSignal: (c, signal: string, _details: string) => {
      if (!c.state.riskSignals.includes(signal)) {
        c.state.riskSignals.push(signal);
        c.broadcast("riskDetected", { signal, details: _details });

        // Check if this signal implies a timeline conflict with close date
        if (c.state.closeDate && (!c.state.activeIntervention || c.state.activeIntervention.dismissed)) {
          const lower = signal.toLowerCase();
          const isProcessSignal = lower.includes('security') || lower.includes('review') ||
            lower.includes('process_friction') || lower.includes('friction') ||
            lower.includes('timeline') || lower.includes('delay') ||
            lower.includes('blocker') || lower.includes('approval');

          if (isProcessSignal) {
            // Extract timeline from signal text (e.g., "6-8 weeks", "90 days")
            const weekMatch = signal.match(/(\d+)[\s-]*(?:to\s*)?(\d+)?\s*week/i);
            const dayMatch = signal.match(/(\d+)\s*day/i);
            let impliedDays = 56; // default 8 weeks if no timeline found
            let timelineDesc = 'process delays';

            if (weekMatch) {
              const weeks = weekMatch[2] ? parseInt(weekMatch[2]) : parseInt(weekMatch[1]);
              impliedDays = weeks * 7;
              timelineDesc = weekMatch[2]
                ? `${weekMatch[1]}-${weekMatch[2]} week timeline`
                : `${weekMatch[1]} week timeline`;
            } else if (dayMatch) {
              impliedDays = parseInt(dayMatch[1]);
              timelineDesc = `${dayMatch[1]} day timeline`;
            }

            const closeDate = new Date(c.state.closeDate + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysUntilClose = Math.round((closeDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

            if (impliedDays > daysUntilClose) {
              // Signal timeline pushes past close date — fire intervention
              const recommended = new Date(today);
              recommended.setDate(recommended.getDate() + impliedDays + 14); // timeline + 2 week buffer
              const recommendedStr = recommended.toISOString().split('T')[0];
              const closeDateDisplay = closeDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

              c.state.activeIntervention = {
                type: 'timeline_risk',
                title: `Close date at risk — ${daysUntilClose} days remaining`,
                diagnosis: `A ${timelineDesc} detected in this deal extends past your close date of ${closeDateDisplay}. With only ${daysUntilClose} days remaining, the deal needs more runway.`,
                action: {
                  type: 'update_field',
                  field: 'close_date',
                  currentValue: c.state.closeDate,
                  suggestedValue: recommendedStr,
                  displayLabel: 'Close Date',
                },
                dismissed: false,
              };

              c.broadcast("interventionReady", {
                type: 'timeline_risk',
                title: `Close date at risk — ${daysUntilClose} days remaining`,
              });
            }
          }
        }
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

    workflowProgress: (
      c,
      event: {
        step: string;
        status: "running" | "complete" | "error";
        details?: string;
      }
    ) => {
      c.broadcast("workflowProgress", event);
    },

    // ── Proactive Intelligence Actions ──

    setBriefReady: (c, data: { brief: unknown; generatedAt: string; context: string }) => {
      c.state.briefReady = { ...data, dismissed: false };
      c.broadcast("briefReady", { generatedAt: data.generatedAt });
    },

    dismissBrief: (c) => {
      if (c.state.briefReady) {
        c.state.briefReady.dismissed = true;
      }
    },

    getBriefReady: (c) => {
      return c.state.briefReady;
    },

    setBriefPending: (c, pending: boolean) => {
      c.state.briefPending = pending;
      if (pending) {
        c.broadcast("briefPending", {});
      }
    },

    getBriefPending: (c) => {
      return c.state.briefPending;
    },

    setIntervention: (c, intervention: ActiveIntervention | null) => {
      c.state.activeIntervention = intervention;
      if (intervention) {
        c.broadcast("interventionReady", {
          type: intervention.type,
          title: intervention.title,
        });
      }
    },

    dismissIntervention: (c) => {
      if (c.state.activeIntervention) {
        c.state.activeIntervention.dismissed = true;
        c.state.interactionMemory.push({
          date: new Date().toISOString().split("T")[0],
          type: "feedback",
          summary: `Dismissed intervention: ${c.state.activeIntervention.type}`,
        });
        if (c.state.interactionMemory.length > 50) {
          c.state.interactionMemory = c.state.interactionMemory.slice(-50);
        }
        c.state.totalInteractions++;
      }
    },

    addCoordinatedIntel: (
      c,
      intel: {
        patternId: string;
        signalType: string;
        vertical: string;
        competitor?: string;
        synthesis: string;
        recommendations: string[];
        affectedDeals: string[];
        detectedAt: string;
      }
    ) => {
      if (!intel.synthesis || intel.synthesis.length < 20) {
        console.log(
          `[deal-agent] Rejected coordinated intel (synthesis too short): "${intel.synthesis}"`
        );
        return;
      }
      if (!intel.recommendations || intel.recommendations.length < 1) {
        console.log(
          `[deal-agent] Rejected coordinated intel (no recommendations)`
        );
        return;
      }

      const existing = c.state.coordinatedIntel.findIndex(
        (i) => i.patternId === intel.patternId
      );

      const entry: CoordinatedIntel = {
        ...intel,
        receivedAt: new Date().toISOString(),
      };

      if (existing >= 0) {
        c.state.coordinatedIntel[existing] = entry;
      } else {
        c.state.coordinatedIntel = [
          ...c.state.coordinatedIntel.slice(-19),
          entry,
        ];
      }

      c.state.interactionMemory.push({
        date: new Date().toISOString().split("T")[0],
        type: "observation",
        summary: `Cross-deal intelligence: ${intel.synthesis.substring(0, 150)}`,
        insights: intel.recommendations,
      });
      if (c.state.interactionMemory.length > 50) {
        c.state.interactionMemory = c.state.interactionMemory.slice(-50);
      }
      c.state.totalInteractions++;
      c.state.lastInteractionDate = new Date().toISOString().split("T")[0];

      c.broadcast("coordinatedIntelReceived", {
        signalType: intel.signalType,
        synthesis: intel.synthesis,
      });

      console.log(
        `[deal-agent] Received coordinated intel: ${intel.signalType} — ${intel.synthesis.substring(0, 80)}`
      );
    },

    runHealthCheck: (c) => {
      c.state.lastHealthCheck = new Date().toISOString();

      let score = 100;
      const issues: string[] = [];

      // Check risk signals
      score -= c.state.riskSignals.length * 10;
      for (const signal of c.state.riskSignals) {
        issues.push(`Risk: ${signal}`);
      }

      // Check MEDDPICC gaps from learnings
      const gapLearnings = c.state.learnings.filter(l => {
        const lower = l.toLowerCase();
        return lower.includes("gap") || lower.includes("missing") ||
          lower.includes("needs engagement") || lower.includes("not been engaged");
      });
      if (gapLearnings.length > 0) { score -= gapLearnings.length * 5; }

      // Check competitive pressure
      if (c.state.competitiveContext.competitors.length > 0) {
        score -= 10;
        if (c.state.competitiveContext.recentMentions.length >= 3) {
          score -= 10;
          issues.push("High competitive pressure — multiple mentions");
        }
      }

      // Check stage age
      if (c.state.stageEnteredAt) {
        const daysInStage = Math.floor(
          (Date.now() - new Date(c.state.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        const stageThresholds: Record<string, number> = {
          new_lead: 7, qualified: 14, discovery: 21, technical_validation: 28,
          proposal: 14, negotiation: 21, closing: 14,
        };
        const threshold = stageThresholds[c.state.currentStage] || 21;
        if (daysInStage > threshold * 1.5) {
          score -= 15;
          issues.push(`In ${c.state.currentStage.replace(/_/g, " ")} for ${daysInStage} days (avg: ${threshold})`);
        }
      }

      c.state.healthScore = Math.max(0, Math.min(100, score));

      c.broadcast("healthChecked", { score: c.state.healthScore, issues });

      // Disabled for demo — generic stall interventions are not compelling.
      // Close date interventions now fire immediately from addRiskSignal instead.
    },
  },
});

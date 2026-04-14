import { actor, event } from "rivetkit";

// ── Types (kept for backward compatibility with imports) ──

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
  field: string;
  currentValue: string;
  suggestedValue: string;
  displayLabel: string;
}

export interface ActiveIntervention {
  type: string;
  title: string;
  diagnosis: string;
  recommendation?: string;
  action?: InterventionAction;
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
  interactionMemory: InteractionMemory[];
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
  };
  coordinatedIntel: CoordinatedIntel[];
  createdAt: string | null;
  totalInteractions: number;
  lastInteractionDate: string | null;
  lastCallPrepFeedback: {
    date: string;
    rating: number;
    comment: string;
  } | null;
  currentStage: string;
  stageEnteredAt: string | null;
  closeDate: string | null;
  briefReady: BriefReady | null;
  briefPending: boolean;
  activeIntervention: ActiveIntervention | null;
  lastHealthCheck: string | null;
  healthScore: number;
}

// ── Standalone formatMemoryForPrompt (now in lib/format-agent-memory.ts) ──
// Kept here as a no-op re-export for backward compatibility
export { formatMemoryForPrompt } from "@/lib/format-agent-memory";

// ── Minimal Actor — pure event relay, zero persistent state ──

export const dealAgent = actor({
  // EMPTY STATE — nothing to persist, nothing to deserialize, nothing to crash
  state: {},

  events: {
    workflowProgress: event<{
      step: string;
      status: "running" | "complete" | "error";
      details?: string;
    }>(),
  },

  actions: {
    // Relay pipeline progress to browser subscribers
    workflowProgress: (
      c,
      data: {
        step: string;
        status: "running" | "complete" | "error";
        details?: string;
      }
    ) => {
      c.broadcast("workflowProgress", data);
    },

    // Allow destruction from reset
    destroyActor: (c) => {
      c.destroy();
    },

    // Dummy actions — the pipeline still calls these via RPC.
    // They accept the call and do nothing. Real writes go to Supabase.
    recordInteraction: (_c, _data: unknown) => {
      console.log("[DealAgent] recordInteraction called — state now in Supabase, ignoring");
    },
    updateLearnings: (_c, _data: unknown) => {
      console.log("[DealAgent] updateLearnings called — state now in Supabase, ignoring");
    },
    addCompetitiveIntel: (_c, _data: unknown) => {
      console.log("[DealAgent] addCompetitiveIntel called — state now in Supabase, ignoring");
    },
    addRiskSignal: (_c, _data: unknown) => {
      console.log("[DealAgent] addRiskSignal called — state now in Supabase, ignoring");
    },
    removeRiskSignal: (_c, _data: unknown) => {
      console.log("[DealAgent] removeRiskSignal called — state now in Supabase, ignoring");
    },
    setBriefPending: (_c, _data: unknown) => {
      console.log("[DealAgent] setBriefPending called — state now in Supabase, ignoring");
    },
    setBriefReady: (_c, _data: unknown) => {
      console.log("[DealAgent] setBriefReady called — state now in Supabase, ignoring");
    },
    dismissBrief: (_c) => {
      console.log("[DealAgent] dismissBrief called — state now in Supabase, ignoring");
    },
    getBriefReady: (_c) => {
      return null;
    },
    getBriefPending: (_c) => {
      return false;
    },
    getState: (_c) => {
      return {};
    },
    getMemoryForPrompt: (_c) => {
      return "";
    },
    initialize: (_c, _data: unknown) => {
      // No-op
    },
    recordFeedback: (_c, _data: unknown) => {
      console.log("[DealAgent] recordFeedback called — state now in Supabase, ignoring");
    },
    updateStage: (_c, _data: unknown) => {
      console.log("[DealAgent] updateStage called — state now in Supabase, ignoring");
    },
    setIntervention: (_c, _data: unknown) => {
      console.log("[DealAgent] setIntervention called — state now in Supabase, ignoring");
    },
    dismissIntervention: (_c) => {
      console.log("[DealAgent] dismissIntervention called — state now in Supabase, ignoring");
    },
    addCoordinatedIntel: (_c, _data: unknown) => {
      console.log("[DealAgent] addCoordinatedIntel called — state now in Supabase, ignoring");
    },
    runHealthCheck: (_c) => {
      // No-op
    },
  },
});

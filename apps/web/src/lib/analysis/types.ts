export interface AnalysisResult {
  summary: string;
  sentimentArc: SentimentPoint[];
  keyMoments: KeyMoment[];
  talkRatio: { rep: number; prospect: number };
  riskSignals: RiskSignal[];
  coachingTips: CoachingTip[];
  dealScore: { score: number; rationale: string };
}

export interface SentimentPoint {
  position: number;
  sentiment: number;
  label: string;
  quote: string;
}

export interface KeyMoment {
  type:
    | "objection"
    | "commitment"
    | "question"
    | "competitive_mention"
    | "buying_signal"
    | "risk";
  title: string;
  detail: string;
  quote: string;
  position: number;
}

export interface RiskSignal {
  severity: "low" | "medium" | "high";
  signal: string;
  evidence: string;
  suggestion: string;
}

export interface CoachingTip {
  category:
    | "discovery"
    | "objection_handling"
    | "closing"
    | "rapport"
    | "presentation";
  tip: string;
  context: string;
}

"use client";

import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/analysis/types";
import { DealScore } from "./deal-score";
import { CallSummary } from "./call-summary";
import { SentimentArc } from "./sentiment-arc";
import { KeyMoments } from "./key-moments";
import { TalkRatio } from "./talk-ratio";
import { RiskSignals } from "./risk-signals";
import { CoachingTips } from "./coaching-tips";
import { LinkToDeal } from "./link-to-deal";

export function AnalysisStream({
  result,
  isStreaming,
  streamedText,
  error,
}: {
  result: AnalysisResult | null;
  isStreaming: boolean;
  streamedText: string;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-danger/30 p-6 text-center">
        <p className="text-sm font-medium text-danger mb-2">
          Analysis could not be completed
        </p>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        {streamedText && (
          <details className="text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Show raw response
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
              {streamedText}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="space-y-4">
        {/* Progress indicator */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-medium text-foreground">
              Analyzing transcript...
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full animate-pulse"
              style={{ width: `${Math.min(95, (streamedText.length / 30) + 5)}%`, transition: "width 0.5s ease-out" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {streamedText.length < 500
              ? "Evaluating conversation dynamics..."
              : streamedText.length < 1500
                ? "Analyzing sentiment and key moments..."
                : "Generating coaching insights..."}
          </p>
        </div>

        {/* Skeleton placeholders */}
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-6 animate-pulse"
          >
            <div className="h-4 bg-muted rounded w-1/4 mb-4" />
            <div className="h-3 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!result) return null;

  // Sections render with staggered animation
  const sections = [
    { key: "score", delay: 0 },
    { key: "summary", delay: 300 },
    { key: "sentiment", delay: 600 },
    { key: "moments", delay: 900 },
    { key: "ratio", delay: 1200 },
    { key: "risks", delay: 1500 },
    { key: "tips", delay: 1800 },
    { key: "link", delay: 2100 },
  ];

  return (
    <div className="space-y-4">
      {sections.map(({ key, delay }) => (
        <div
          key={key}
          className="animate-slideUp"
          style={{
            animationDelay: `${delay}ms`,
            animationFillMode: "both",
          }}
        >
          {key === "score" && (
            <DealScore
              score={result.dealScore.score}
              rationale={result.dealScore.rationale}
            />
          )}
          {key === "summary" && <CallSummary summary={result.summary} />}
          {key === "sentiment" && result.sentimentArc?.length > 0 && (
            <SentimentArc data={result.sentimentArc} />
          )}
          {key === "moments" && result.keyMoments?.length > 0 && (
            <KeyMoments moments={result.keyMoments} />
          )}
          {key === "ratio" && result.talkRatio && (
            <TalkRatio
              rep={result.talkRatio.rep}
              prospect={result.talkRatio.prospect}
            />
          )}
          {key === "risks" && result.riskSignals?.length > 0 && (
            <RiskSignals signals={result.riskSignals} />
          )}
          {key === "tips" && result.coachingTips?.length > 0 && (
            <CoachingTips tips={result.coachingTips} />
          )}
          {key === "link" && <LinkToDeal analysis={result} />}
        </div>
      ))}
    </div>
  );
}

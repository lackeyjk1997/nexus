"use client";

import { cn } from "@/lib/utils";
import type { CoachingTip } from "@/lib/analysis/types";
import { AgentFeedback } from "@/components/feedback/agent-feedback";

const CATEGORY_COLORS: Record<string, string> = {
  discovery: "bg-blue-50 text-blue-700",
  objection_handling: "bg-red-50 text-red-700",
  closing: "bg-emerald-50 text-emerald-700",
  rapport: "bg-violet-50 text-violet-700",
  presentation: "bg-amber-50 text-amber-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  discovery: "Discovery",
  objection_handling: "Objection Handling",
  closing: "Closing",
  rapport: "Rapport",
  presentation: "Presentation",
};

export function CoachingTips({
  tips,
  agentConfigId,
}: {
  tips: CoachingTip[];
  agentConfigId?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Coaching Tips
      </h3>
      <div className="space-y-3">
        {tips.map((tip, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50"
          >
            <span className="text-lg font-bold text-primary/20 shrink-0 leading-none mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="mb-1.5">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    CATEGORY_COLORS[tip.category] || "bg-muted text-muted-foreground"
                  )}
                >
                  {CATEGORY_LABELS[tip.category] || tip.category}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{tip.tip}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {tip.context}
              </p>
            </div>
          </div>
        ))}
      </div>
      {agentConfigId && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <AgentFeedback agentConfigId={agentConfigId} sourceType="coaching_tip" />
        </div>
      )}
    </div>
  );
}

"use client";

import {
  AlertTriangle,
  ThumbsUp,
  HelpCircle,
  Swords,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeyMoment } from "@/lib/analysis/types";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }
> = {
  objection: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Objection" },
  buying_signal: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Buying Signal" },
  question: { icon: HelpCircle, color: "text-blue-600", bg: "bg-blue-50", label: "Question" },
  competitive_mention: { icon: Swords, color: "text-amber-600", bg: "bg-amber-50", label: "Competitive" },
  commitment: { icon: ThumbsUp, color: "text-emerald-600", bg: "bg-emerald-50", label: "Commitment" },
  risk: { icon: ShieldAlert, color: "text-orange-600", bg: "bg-orange-50", label: "Risk" },
};

function positionLabel(pos: number): string {
  if (pos <= 25) return "Early in call";
  if (pos <= 75) return "Mid-call";
  return "Late in call";
}

export function KeyMoments({ moments }: { moments: KeyMoment[] }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Key Moments
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {moments.map((m, i) => {
            const config = TYPE_CONFIG[m.type] || TYPE_CONFIG.question!;
            const Icon = config.icon;
            return (
              <div
                key={i}
                className="relative flex items-start gap-4 pl-1"
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div
                  className={cn(
                    "relative z-10 h-[38px] w-[38px] rounded-lg flex items-center justify-center shrink-0",
                    config.bg,
                    config.color
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        config.bg,
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {positionLabel(m.position)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.detail}
                  </p>
                  {m.quote && (
                    <blockquote className="mt-2 pl-3 border-l-2 border-border text-xs text-muted-foreground italic">
                      &ldquo;{m.quote}&rdquo;
                    </blockquote>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

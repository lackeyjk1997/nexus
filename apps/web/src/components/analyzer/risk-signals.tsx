"use client";

import { ShieldCheck, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskSignal } from "@/lib/analysis/types";

const SEVERITY_CONFIG: Record<
  string,
  { bg: string; border: string; badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  high: {
    bg: "bg-red-50/60",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  medium: {
    bg: "bg-amber-50/60",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    icon: AlertTriangle,
  },
  low: {
    bg: "bg-muted/40",
    border: "border-border",
    badge: "bg-muted text-muted-foreground",
    icon: Info,
  },
};

export function RiskSignals({ signals }: { signals: RiskSignal[] }) {
  const hasHighRisk = signals.some((s) => s.severity === "high");

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Risk Signals
      </h3>

      {!hasHighRisk && signals.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <ShieldCheck className="h-4 w-4 text-success shrink-0" />
          <span className="text-xs text-success font-medium">
            No critical risks detected
          </span>
        </div>
      )}

      <div className="space-y-3">
        {signals.map((signal, i) => {
          const config =
            SEVERITY_CONFIG[signal.severity] || SEVERITY_CONFIG.low!;
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-4",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-inherit" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                        config.badge
                      )}
                    >
                      {signal.severity}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {signal.signal}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    &ldquo;{signal.evidence}&rdquo;
                  </p>
                  <p className="text-xs text-foreground mt-2">
                    <span className="font-medium">Suggestion:</span>{" "}
                    {signal.suggestion}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

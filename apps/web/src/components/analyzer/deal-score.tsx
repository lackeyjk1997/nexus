"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AgentFeedback } from "@/components/feedback/agent-feedback";

export function DealScore({
  score,
  rationale,
  agentConfigId,
}: {
  score: number;
  rationale: string;
  agentConfigId?: string;
}) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setTimeout(() => setShowRationale(true), 300);
      }
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const color =
    score >= 71 ? "#2D8A4E" : score >= 41 ? "#D4A843" : "#C74B3B";
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset =
    circumference - (animatedScore / 100) * circumference;

  return (
    <div className="bg-card rounded-xl border border-border p-6 flex items-center gap-6">
      {/* Ring */}
      <div className="relative shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128">
          {/* Glow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background ring */}
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="#E8E5E0"
            strokeWidth="8"
          />
          {/* Score ring */}
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 64 64)"
            filter="url(#glow)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color }}
          >
            {animatedScore}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Deal Score
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {score >= 71
            ? "Strong deal signals detected"
            : score >= 41
              ? "Mixed signals — needs attention"
              : "Significant risks identified"}
        </p>
        <p
          className={cn(
            "text-sm text-foreground leading-relaxed transition-opacity duration-500",
            showRationale ? "opacity-100" : "opacity-0"
          )}
        >
          {rationale}
        </p>
        {agentConfigId && (
          <AgentFeedback agentConfigId={agentConfigId} sourceType="deal_score" />
        )}
      </div>
    </div>
  );
}

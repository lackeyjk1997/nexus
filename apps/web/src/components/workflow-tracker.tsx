"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useActor } from "@/lib/rivet";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "running" | "complete" | "error";

interface StepState {
  status: StepStatus;
  details?: string;
}

const STEPS = [
  { key: "extract_actions", label: "Extract Actions" },
  { key: "score_meddpicc", label: "Score MEDDPICC" },
  { key: "detect_signals", label: "Detect Signals" },
  { key: "synthesize_learnings", label: "Synthesize" },
  { key: "draft_email", label: "Draft Email" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function WorkflowTracker({ dealId }: { dealId: string }) {
  const [steps, setSteps] = useState<Record<StepKey, StepState>>({
    extract_actions: { status: "pending" },
    score_meddpicc: { status: "pending" },
    detect_signals: { status: "pending" },
    synthesize_learnings: { status: "pending" },
    draft_email: { status: "pending" },
  });
  const [active, setActive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actor = useActor({
    name: "dealAgent",
    key: [dealId],
  });

  const handleProgress = useCallback(
    (event: { step: string; status: "running" | "complete" | "error"; details?: string }) => {
      const stepKey = event.step as StepKey;
      if (!STEPS.find((s) => s.key === stepKey)) return;

      setActive(true);
      setCollapsed(false);
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = null;
      }

      setSteps((prev) => ({
        ...prev,
        [stepKey]: { status: event.status, details: event.details },
      }));

      // Check if all steps are complete
      setSteps((prev) => {
        const allComplete = STEPS.every(
          (s) =>
            (s.key === stepKey ? event.status : prev[s.key].status) === "complete" ||
            (s.key === stepKey ? event.status : prev[s.key].status) === "error"
        );
        if (allComplete) {
          collapseTimer.current = setTimeout(() => {
            setCollapsed(true);
          }, 30000);
        }
        return prev;
      });
    },
    []
  );

  useEffect(() => {
    if (!actor.connection) return;
    const unsub = actor.connection.on("workflowProgress", handleProgress);
    return () => {
      unsub();
    };
  }, [actor.connection, handleProgress]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  if (!active) return null;

  const allComplete = STEPS.every((s) => steps[s.key].status === "complete");
  const hasError = STEPS.some((s) => steps[s.key].status === "error");

  // Build summary
  const summaryParts: string[] = [];
  if (steps.extract_actions.details) summaryParts.push(steps.extract_actions.details);
  if (steps.score_meddpicc.details) summaryParts.push(steps.score_meddpicc.details);
  if (steps.detect_signals.details) summaryParts.push(steps.detect_signals.details.split(",")[0]);
  if (steps.draft_email.status === "complete") summaryParts.push("email draft ready");

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full mt-3 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-[#F3EDE7] text-left"
      >
        <span style={{ color: allComplete ? "#0C7489" : "#E07A5F", fontSize: 14 }}>
          {allComplete ? "✦" : "◉"}
        </span>
        <span className="text-xs flex-1" style={{ color: "#8A8078", fontFamily: "'DM Sans', sans-serif" }}>
          {allComplete
            ? `Transcript processed · ${summaryParts.join(" · ")}`
            : hasError
              ? "Transcript processing encountered an error"
              : "Processing transcript..."}
        </span>
      </button>
    );
  }

  return (
    <div
      className="mt-3 bg-white rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${allComplete ? "rgba(12,116,137,0.2)" : hasError ? "rgba(220,38,38,0.2)" : "rgba(224,122,95,0.2)"}`,
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: allComplete
            ? "rgba(12,116,137,0.04)"
            : hasError
              ? "rgba(220,38,38,0.04)"
              : "rgba(224,122,95,0.04)",
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: allComplete ? "#0C7489" : "#E07A5F", fontSize: 14 }}>✦</span>
          <span className="text-sm font-semibold" style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}>
            {allComplete ? "Transcript processed" : hasError ? "Processing error" : "Processing transcript..."}
          </span>
        </div>
        {allComplete && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-[11px] px-2 py-0.5 rounded hover:bg-black/5 transition-colors"
            style={{ color: "#8A8078" }}
          >
            Collapse
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-1">
          {STEPS.map((step, i) => {
            const state = steps[step.key];
            const isLast = i === STEPS.length - 1;

            return (
              <div key={step.key} className="flex items-start flex-1 min-w-0">
                {/* Step indicator + label */}
                <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                  {/* Circle */}
                  <div className="relative flex items-center justify-center">
                    <span
                      className={cn(
                        "block w-3 h-3 rounded-full border-2 transition-colors",
                        state.status === "pending" && "border-[#D4C9BD] bg-transparent",
                        state.status === "running" && "border-[#E07A5F] bg-[#E07A5F] animate-pulse",
                        state.status === "complete" && "border-[#0C7489] bg-[#0C7489]",
                        state.status === "error" && "border-red-500 bg-red-500"
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] mt-1.5 text-center leading-tight",
                      state.status === "running" && "font-semibold"
                    )}
                    style={{
                      color:
                        state.status === "running"
                          ? "#E07A5F"
                          : state.status === "complete"
                            ? "#0C7489"
                            : state.status === "error"
                              ? "#DC2626"
                              : "#8A8078",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {step.label}
                  </span>

                  {/* Detail text */}
                  {state.details && state.status !== "pending" && (
                    <span
                      className="text-[9px] mt-0.5 text-center leading-tight max-w-[90px] truncate"
                      style={{ color: "#8A8078", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {state.details}
                    </span>
                  )}

                  {state.status === "running" && !state.details && (
                    <span
                      className="text-[9px] mt-0.5 text-center"
                      style={{ color: "#E07A5F", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Running...
                    </span>
                  )}
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="flex-1 flex items-center pt-1.5 px-1">
                    <div
                      className="h-[2px] w-full rounded-full transition-colors"
                      style={{
                        background:
                          state.status === "complete"
                            ? "#0C7489"
                            : state.status === "error"
                              ? "#DC2626"
                              : "#D4C9BD",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary (when complete) */}
      {allComplete && summaryParts.length > 0 && (
        <div
          className="px-4 pb-3 -mt-1"
        >
          <p
            className="text-[11px]"
            style={{ color: "#8A8078", fontFamily: "'DM Sans', sans-serif" }}
          >
            {summaryParts.join(" · ")}
          </p>
        </div>
      )}
    </div>
  );
}

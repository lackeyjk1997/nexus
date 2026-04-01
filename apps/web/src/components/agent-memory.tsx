"use client";

import { useState, useEffect, useCallback } from "react";
import { useActor } from "@/lib/rivet";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealAgentState } from "@/actors/deal-agent";

interface AgentMemoryProps {
  dealId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  currentStage: string;
  stageEnteredAt: string | null;
}

export function AgentMemory({
  dealId,
  dealName,
  companyName,
  vertical,
  currentStage,
  stageEnteredAt,
}: AgentMemoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [agentState, setAgentState] = useState<DealAgentState | null>(null);
  const [error, setError] = useState(false);

  const actor = useActor({
    name: "dealAgent",
    key: [dealId],
  });

  // Initialize actor and fetch state
  const initializeAgent = useCallback(async () => {
    if (!actor.connection) return;
    try {
      const state = await actor.connection.getState();
      if (!state.initialized) {
        await actor.connection.initialize({
          dealId,
          dealName,
          companyName,
          vertical,
          currentStage,
          stageEnteredAt,
        });
        const updatedState = await actor.connection.getState();
        setAgentState(updatedState);
      } else {
        setAgentState(state);
      }
    } catch (e) {
      console.log("Agent memory unavailable:", e);
      setError(true);
    }
  }, [actor.connection, dealId, dealName, companyName, vertical, currentStage, stageEnteredAt]);

  useEffect(() => {
    initializeAgent();
  }, [initializeAgent]);

  // Subscribe to events for live updates
  useEffect(() => {
    if (!actor.connection) return;

    const handleMemoryUpdate = async () => {
      try {
        const state = await actor.connection!.getState();
        setAgentState(state);
      } catch {}
    };

    // Listen for events on the already-connected actor connection
    actor.connection.on("memoryUpdated", handleMemoryUpdate);
    actor.connection.on("learningsUpdated", handleMemoryUpdate);
  }, [actor.connection]);

  // Graceful degradation — if Rivet is unavailable, render nothing
  if (error) return null;

  const isLoading = !agentState || actor.connStatus === "connecting" || actor.connStatus === "idle";
  const hasActivity = agentState && agentState.totalInteractions > 0;

  return (
    <div className="mt-3">
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left",
          expanded
            ? "bg-white border border-[rgba(0,0,0,0.06)]"
            : "hover:bg-[#F3EDE7]"
        )}
      >
        <span style={{ color: "#E07A5F", fontSize: 14 }}>{"\u2726"}</span>
        <span
          className="text-xs flex-1"
          style={{ color: "#8A8078", fontFamily: "'DM Sans', sans-serif" }}
        >
          {isLoading
            ? "Agent connecting..."
            : hasActivity
              ? `Agent active \u00B7 ${agentState.totalInteractions} interaction${agentState.totalInteractions !== 1 ? "s" : ""} \u00B7 ${agentState.learnings.length} learning${agentState.learnings.length !== 1 ? "s" : ""}`
              : "Agent initializing \u00B7 listening for deal activity"}
        </span>
        {hasActivity && (
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              expanded && "rotate-180"
            )}
            style={{ color: "#8A8078" }}
          />
        )}
      </button>

      {/* Expanded card */}
      {expanded && hasActivity && agentState && (
        <div
          className="mt-2 bg-white rounded-xl p-4 space-y-3"
          style={{
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: "#E07A5F", fontSize: 14 }}>{"\u2726"}</span>
            <h3
              className="text-sm font-semibold"
              style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
            >
              Agent Memory
            </h3>
          </div>

          {/* Learnings */}
          {agentState.learnings.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8078" }}
              >
                Learnings
              </p>
              <ul className="space-y-1">
                {agentState.learnings.map((l, i) => (
                  <li
                    key={i}
                    className="text-[13px] leading-snug"
                    style={{
                      color: "#3D3833",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Signals */}
          {agentState.riskSignals.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8078" }}
              >
                Risk Signals
              </p>
              <div className="flex flex-wrap gap-1.5">
                {agentState.riskSignals.map((r, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{
                      border: "1px solid #E07A5F",
                      color: "#E07A5F",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Competitive Context */}
          {agentState.competitiveContext.competitors.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8078" }}
              >
                Competitive Context
              </p>
              <p
                className="text-[13px]"
                style={{
                  color: "#3D3833",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Competitors:{" "}
                {agentState.competitiveContext.competitors.join(", ")}
                {agentState.competitiveContext.ourDifferentiators.length > 0 && (
                  <>
                    {" "}
                    | Differentiators:{" "}
                    {agentState.competitiveContext.ourDifferentiators.join(", ")}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Last Feedback */}
          {agentState.lastCallPrepFeedback && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8078" }}
              >
                Last Feedback
              </p>
              <p
                className="text-[13px]"
                style={{
                  color: "#3D3833",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {agentState.lastCallPrepFeedback.rating}/5
                {agentState.lastCallPrepFeedback.comment &&
                  ` — "${agentState.lastCallPrepFeedback.comment}"`}
              </p>
            </div>
          )}

          {/* Footer */}
          <p className="text-[11px] pt-1" style={{ color: "#8A8078" }}>
            Watching for {agentState.daysSinceCreation} day
            {agentState.daysSinceCreation !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

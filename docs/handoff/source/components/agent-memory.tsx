"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompetitiveContext {
  competitors: string[];
  ourDifferentiators: string[];
  recentMentions: Array<{ date: string; competitor: string; context: string }>;
}

interface CoordinatedIntelItem {
  patternId?: string;
  signalType: string;
  synthesis: string;
  recommendations: string[];
  affectedDeals: string[];
}

interface AgentStateData {
  learnings: string[];
  riskSignals: string[];
  competitiveContext: CompetitiveContext | null;
  interactionCount: number;
  coordinatedIntel: CoordinatedIntelItem[];
  lastInteractionDate: string | null;
  createdAt?: string | null;
}

interface AgentMemoryProps {
  dealId: string;
  triggerRefetch?: number;
}

export function AgentMemory({ dealId, triggerRefetch }: AgentMemoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [agentState, setAgentState] = useState<AgentStateData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/deal-agent-state?dealId=${dealId}`);
      if (res.ok) {
        const data = await res.json();
        setAgentState(data.state);
      }
    } catch (e) {
      console.error("[AgentMemory] Failed to fetch state:", e);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchState();
  }, [fetchState, triggerRefetch]);

  const isLoading = loading && !agentState;
  const hasActivity = agentState && agentState.interactionCount > 0;

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
              ? `Agent active \u00B7 ${agentState.interactionCount} interaction${agentState.interactionCount !== 1 ? "s" : ""} \u00B7 ${agentState.learnings.length} learning${agentState.learnings.length !== 1 ? "s" : ""}${agentState.riskSignals.length > 0 ? ` \u00B7 ${agentState.riskSignals.length} signal${agentState.riskSignals.length !== 1 ? "s" : ""}` : ""}`
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
              <div>
                {agentState.learnings.map((l, i) => (
                  <div
                    key={i}
                    className="text-[13px] leading-snug py-2"
                    style={{
                      color: "#3D3833",
                      fontFamily: "'DM Sans', sans-serif",
                      borderBottom: i < agentState.learnings.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
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
          {agentState.competitiveContext && agentState.competitiveContext.competitors.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8078" }}
              >
                Competitive Context
              </p>
              <div className="flex items-start gap-2">
                <Swords className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "#E07A5F" }} />
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
            </div>
          )}

          {/* Cross-Deal Intelligence */}
          {agentState.coordinatedIntel && agentState.coordinatedIntel.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: "#8A8078" }}
              >
                Cross-Deal Intelligence
              </p>
              <div className="space-y-2">
                {agentState.coordinatedIntel.map((intel, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3"
                    style={{
                      background: "rgba(224,122,95,0.04)",
                      borderLeft: "3px solid #E07A5F",
                      borderTop: "1px solid rgba(224,122,95,0.1)",
                      borderRight: "1px solid rgba(224,122,95,0.1)",
                      borderBottom: "1px solid rgba(224,122,95,0.1)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span style={{ color: "#E07A5F", fontSize: 13 }}>{"\u2726"}</span>
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: "#3D3833" }}
                      >
                        {intel.signalType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(224,122,95,0.12)", color: "#E07A5F" }}>
                        {intel.affectedDeals.length} deals
                      </span>
                    </div>
                    <p
                      className="text-[13px] leading-snug mb-2"
                      style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {intel.synthesis}
                    </p>
                    {intel.recommendations.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8A8078" }}>
                          Recommendations
                        </p>
                        <ul className="space-y-1">
                          {intel.recommendations.map((rec, j) => (
                            <li
                              key={j}
                              className="text-[12px] leading-snug flex items-start gap-1.5"
                              style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
                            >
                              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-[#E07A5F]" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-[11px] pt-1" style={{ color: "#8A8078" }}>
            {(() => {
              const days = agentState.createdAt
                ? Math.floor((Date.now() - new Date(agentState.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return days === 0
                ? "Watching since today"
                : `Watching for ${days} day${days !== 1 ? "s" : ""}`;
            })()}
          </p>
        </div>
      )}
    </div>
  );
}

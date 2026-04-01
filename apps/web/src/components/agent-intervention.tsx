"use client";

import { useState, useEffect, useCallback } from "react";
import { useActor } from "@/lib/rivet";
import type { DealAgentState } from "@/actors/deal-agent";

interface AgentInterventionProps {
  dealId: string;
}

export function AgentIntervention({ dealId }: AgentInterventionProps) {
  const [intervention, setIntervention] = useState<DealAgentState["activeIntervention"]>(null);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  const actor = useActor({
    name: "dealAgent",
    key: [dealId],
  });

  const fetchState = useCallback(async () => {
    if (!actor.connection) return;
    try {
      const state = await actor.connection.getState();
      if (state.activeIntervention && !state.activeIntervention.dismissed) {
        setIntervention(state.activeIntervention);
        setHealthScore(state.healthScore);
        setVisible(true);
        // Trigger animation after mount
        requestAnimationFrame(() => setAnimateIn(true));
      }
    } catch {}
  }, [actor.connection]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Listen for real-time intervention events
  useEffect(() => {
    if (!actor.connection) return;

    const handleIntervention = async () => {
      try {
        const state = await actor.connection!.getState();
        if (state.activeIntervention && !state.activeIntervention.dismissed) {
          setIntervention(state.activeIntervention);
          setHealthScore(state.healthScore);
          setVisible(true);
          requestAnimationFrame(() => setAnimateIn(true));
        }
      } catch {}
    };

    const handleHealthCheck = async () => {
      try {
        const state = await actor.connection!.getState();
        setHealthScore(state.healthScore);
        if (state.activeIntervention && !state.activeIntervention.dismissed) {
          setIntervention(state.activeIntervention);
          setVisible(true);
          requestAnimationFrame(() => setAnimateIn(true));
        }
      } catch {}
    };

    actor.connection.on("interventionReady", handleIntervention);
    actor.connection.on("healthChecked", handleHealthCheck);
  }, [actor.connection]);

  async function handleDismiss() {
    try {
      if (actor.connection) {
        await actor.connection.dismissIntervention();
      }
    } catch {}
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      setIntervention(null);
    }, 300);
  }

  async function handleAcknowledge() {
    // Mark as acknowledged (same as dismiss but records it)
    handleDismiss();
  }

  if (!visible || !intervention) return null;

  // Health score bar color: coral (low) to teal (high)
  const barColor = healthScore >= 70 ? "#0C7489" : healthScore >= 40 ? "#D4A843" : "#E07A5F";
  const barWidth = Math.max(0, Math.min(100, healthScore));

  return (
    <div
      className="mt-3 transition-all duration-300 ease-out"
      style={{
        opacity: animateIn ? 1 : 0,
        transform: animateIn ? "translateY(0)" : "translateY(-8px)",
      }}
    >
      <div
        className="bg-white rounded-xl p-4"
        style={{
          borderLeft: "3px solid #E07A5F",
          border: "1px solid rgba(0,0,0,0.06)",
          borderLeftWidth: "3px",
          borderLeftColor: "#E07A5F",
          boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span style={{ color: "#E07A5F", fontSize: 14 }}>{"\u2726"}</span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
          >
            Your deal agent noticed something
          </span>
        </div>

        {/* Title */}
        <p
          className="text-[15px] font-semibold mb-1.5"
          style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
        >
          {intervention.title}
        </p>

        {/* Diagnosis */}
        <p
          className="text-[13px] leading-[1.6] mb-3"
          style={{ color: "#8A8078", fontFamily: "'DM Sans', sans-serif" }}
        >
          {intervention.diagnosis}
        </p>

        {/* Health Score Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[11px] font-medium"
              style={{ color: "#8A8078", fontFamily: "'DM Sans', sans-serif" }}
            >
              Health Score
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: barColor, fontFamily: "'DM Sans', sans-serif" }}
            >
              {healthScore}/100
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full"
            style={{ background: "#F3EDE7" }}
          >
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${barWidth}%`,
                background: barColor,
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleAcknowledge}
            className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: "#0C7489",
              border: "1px solid rgba(12,116,137,0.3)",
              background: "transparent",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(12,116,137,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Acknowledge
          </button>
          <button
            onClick={handleDismiss}
            className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: "#8A8078",
              background: "transparent",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#3D3833";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#8A8078";
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

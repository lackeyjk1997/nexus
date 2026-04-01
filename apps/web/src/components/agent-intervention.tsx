"use client";

import { useState, useEffect, useCallback } from "react";
import { useActor } from "@/lib/rivet";
import type { DealAgentState } from "@/actors/deal-agent";

interface AgentInterventionProps {
  dealId: string;
  onCloseDateChange?: (newDate: string) => void;
}

export function AgentIntervention({ dealId, onCloseDateChange }: AgentInterventionProps) {
  const [intervention, setIntervention] = useState<DealAgentState["activeIntervention"]>(null);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Action state
  const [adjustedDate, setAdjustedDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionConfirmed, setActionConfirmed] = useState(false);

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
        if (state.activeIntervention.action?.suggestedValue) {
          setAdjustedDate(state.activeIntervention.action.suggestedValue);
        }
        setVisible(true);
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
          if (state.activeIntervention.action?.suggestedValue) {
            setAdjustedDate(state.activeIntervention.action.suggestedValue);
          }
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
          if (state.activeIntervention.action?.suggestedValue && !adjustedDate) {
            setAdjustedDate(state.activeIntervention.action.suggestedValue);
          }
          setVisible(true);
          requestAnimationFrame(() => setAnimateIn(true));
        }
      } catch {}
    };

    actor.connection.on("interventionReady", handleIntervention);
    actor.connection.on("healthChecked", handleHealthCheck);
  }, [actor.connection, adjustedDate]);

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
      setActionConfirmed(false);
    }, 300);
  }

  async function handleAction() {
    if (!intervention?.action) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [intervention.action.field]: adjustedDate }),
      });

      if (res.ok) {
        // Notify parent to update header
        if (intervention.action.field === "close_date" && onCloseDateChange) {
          onCloseDateChange(adjustedDate);
        }
        setActionConfirmed(true);
        // Dismiss the intervention on the actor
        try {
          if (actor.connection) {
            await actor.connection.dismissIntervention();
          }
        } catch {}
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          setAnimateIn(false);
          setTimeout(() => {
            setVisible(false);
            setIntervention(null);
            setActionConfirmed(false);
          }, 300);
        }, 3000);
      }
    } catch {} finally {
      setActionLoading(false);
    }
  }

  if (!visible || !intervention) return null;

  // Health score bar color
  const barColor = healthScore >= 70 ? "#0C7489" : healthScore >= 40 ? "#D4A843" : "#E07A5F";
  const barWidth = Math.max(0, Math.min(100, healthScore));

  const formattedAdjustedDate = adjustedDate
    ? new Date(adjustedDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

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

        {actionConfirmed ? (
          /* Confirmation state */
          <p
            className="text-[13px] leading-[1.6]"
            style={{ color: "#0C7489", fontFamily: "'DM Sans', sans-serif" }}
          >
            {"\u2713"} {intervention.action?.displayLabel || "Field"} updated to {formattedAdjustedDate}
          </p>
        ) : (
          <>
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

            {/* Action section (if intervention has an action) */}
            {intervention.action && (
              <div className="mb-3">
                <p
                  className="text-[12px] font-medium mb-1.5"
                  style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
                >
                  Suggested {intervention.action.displayLabel.toLowerCase()}:
                </p>
                <input
                  type="date"
                  value={adjustedDate}
                  onChange={(e) => setAdjustedDate(e.target.value)}
                  className="text-[13px] px-2.5 py-1.5 rounded-lg w-full"
                  style={{
                    border: "1px solid #E8E5E0",
                    color: "#3D3833",
                    fontFamily: "'DM Sans', sans-serif",
                    background: "#FAF9F6",
                    outline: "none",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0C7489"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E8E5E0"; }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              {intervention.action ? (
                <button
                  onClick={handleAction}
                  disabled={actionLoading || !adjustedDate}
                  className="text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{
                    background: actionLoading ? "#D4A08A" : "#E07A5F",
                    color: "#FFFFFF",
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: actionLoading || !adjustedDate ? 0.7 : 1,
                    cursor: actionLoading || !adjustedDate ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? "Updating..." : `Update ${intervention.action.displayLabel}`}
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
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
              )}
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
          </>
        )}
      </div>
    </div>
  );
}

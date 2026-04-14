"use client";

import { useState } from "react";

interface AgentInterventionProps {
  dealId: string;
  deal: { closeDate: string | null; stage: string; name: string };
  onCloseDateChange?: (newDate: string) => void;
}

export function AgentIntervention({ dealId, deal, onCloseDateChange }: AgentInterventionProps) {
  const [visible, setVisible] = useState(true);
  const [animateIn, setAnimateIn] = useState(true);
  const [adjustedDate, setAdjustedDate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionConfirmed, setActionConfirmed] = useState(false);

  if (!deal.closeDate) return null;

  // Compute close date risk
  const daysRemaining = Math.ceil(
    (new Date(deal.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Only show if close date is within 90 days and deal isn't closed
  const isAtRisk = daysRemaining > 0 && daysRemaining < 90 &&
    !["closed_won", "closed_lost"].includes(deal.stage);

  if (!isAtRisk || !visible) return null;

  // Suggest extending by 2 weeks
  const suggestedDate = new Date(new Date(deal.closeDate).getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];
  const displayDate = adjustedDate || suggestedDate;

  const formattedAdjustedDate = displayDate
    ? new Date(displayDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  function handleDismiss() {
    setAnimateIn(false);
    setTimeout(() => {
      setVisible(false);
      setActionConfirmed(false);
    }, 300);
  }

  async function handleAction() {
    const dateToSet = adjustedDate || suggestedDate;
    if (!dateToSet) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close_date: dateToSet }),
      });

      if (res.ok) {
        if (onCloseDateChange) {
          onCloseDateChange(dateToSet);
        }
        setActionConfirmed(true);
        setTimeout(() => {
          setAnimateIn(false);
          setTimeout(() => {
            setVisible(false);
            setActionConfirmed(false);
          }, 300);
        }, 3000);
      }
    } catch {} finally {
      setActionLoading(false);
    }
  }

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
          <p
            className="text-[13px] leading-[1.6]"
            style={{ color: "#0C7489", fontFamily: "'DM Sans', sans-serif" }}
          >
            {"\u2713"} Close Date updated to {formattedAdjustedDate}
          </p>
        ) : (
          <>
            {/* Title */}
            <p
              className="text-[15px] font-semibold mb-3"
              style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
            >
              Close date at risk — {daysRemaining} days remaining
            </p>

            {/* Date picker */}
            <div className="mb-3">
              <p
                className="text-[12px] font-medium mb-1.5"
                style={{ color: "#3D3833", fontFamily: "'DM Sans', sans-serif" }}
              >
                Suggested close date:
              </p>
              <input
                type="date"
                value={adjustedDate || suggestedDate}
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

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className="text-[13px] font-medium px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: actionLoading ? "#D4A08A" : "#E07A5F",
                  color: "#FFFFFF",
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: actionLoading ? 0.7 : 1,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {actionLoading ? "Updating..." : "Update Close Date"}
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
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, User, Trophy, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@nexus/shared";

const STAGES: PipelineStage[] = [
  "new_lead",
  "qualified",
  "discovery",
  "technical_validation",
  "proposal",
  "negotiation",
  "closing",
  "closed_won",
  "closed_lost",
];

const LOSS_REASONS = [
  { value: "pricing", label: "Pricing" },
  { value: "competitor", label: "Competitor won" },
  { value: "timing", label: "Timing / budget" },
  { value: "no_decision", label: "No decision" },
  { value: "champion_left", label: "Champion left" },
  { value: "security_compliance", label: "Security / compliance" },
  { value: "went_dark", label: "Went dark" },
  { value: "product_gaps", label: "Product gaps" },
];

const IMPROVEMENTS = [
  { value: "engaged_exec_sooner", label: "Engaged exec sooner" },
  { value: "addressed_pricing_earlier", label: "Addressed pricing earlier" },
  { value: "started_security_earlier", label: "Started security review earlier" },
  { value: "better_multi_threading", label: "Better multi-threading" },
  { value: "nothing_unwinnable", label: "Nothing — unwinnable" },
];

const WIN_TURNING_POINTS = [
  { value: "champion_sold_internally", label: "Champion sold it internally" },
  { value: "compliance_advantage", label: "Compliance advantage" },
  { value: "roi_cost_savings", label: "ROI / cost savings" },
  { value: "technical_superiority", label: "Technical superiority" },
  { value: "timing_urgency", label: "Timing / urgency" },
  { value: "relationship_trust", label: "Relationship / trust" },
];

function Chip({
  label,
  selected,
  onClick,
  index,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all"
      style={{
        background: selected ? "#3D3833" : "#F5F3EF",
        color: selected ? "white" : "#3D3833",
      }}
      onMouseEnter={(e) => {
        if (!selected) (e.target as HTMLElement).style.background = "#E8DDD3";
      }}
      onMouseLeave={(e) => {
        if (!selected) (e.target as HTMLElement).style.background = "#F5F3EF";
      }}
    >
      <span
        className="flex items-center justify-center shrink-0 text-[11px] font-semibold"
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "5px",
          border: `1.5px solid ${selected ? "rgba(255,255,255,0.4)" : "#D4C9BD"}`,
          color: selected ? "white" : "#8A8078",
        }}
      >
        {index + 1}
      </span>
      {label}
    </button>
  );
}

export function StageChangeModal({
  open,
  onClose,
  dealId,
  companyName,
  currentStage,
}: {
  open: boolean;
  onClose: () => void;
  dealId: string;
  companyName: string;
  currentStage: PipelineStage;
}) {
  const [targetStage, setTargetStage] = useState<PipelineStage | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Close/Lost state
  const [lossReason, setLossReason] = useState("");
  const [closeCompetitor, setCloseCompetitor] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [closeImprovement, setCloseImprovement] = useState("");

  // Close/Won state
  const [winTurningPoint, setWinTurningPoint] = useState("");
  const [winReplicable, setWinReplicable] = useState("");

  if (!open) return null;

  const isClosingLost = targetStage === "closed_lost";
  const isClosingWon = targetStage === "closed_won";
  const isClosing = isClosingLost || isClosingWon;

  const canSubmit = (() => {
    if (!targetStage || targetStage === currentStage) return false;
    if (isClosingLost && !lossReason) return false;
    if (isClosingWon && !winTurningPoint) return false;
    return true;
  })();

  async function handleConfirm() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        dealId,
        fromStage: currentStage,
        toStage: targetStage,
        reason: reason || undefined,
      };

      if (isClosingLost) {
        payload.lossReason = lossReason;
        payload.closeCompetitor = closeCompetitor || undefined;
        payload.closeNotes = closeNotes || undefined;
        payload.closeImprovement = closeImprovement || undefined;
      } else if (isClosingWon) {
        payload.winTurningPoint = winTurningPoint;
        payload.winReplicable = winReplicable || undefined;
      }

      const res = await fetch("/api/deals/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
        onClose();
        setTargetStage("");
        setReason("");
        setLossReason("");
        setCloseCompetitor("");
        setCloseNotes("");
        setCloseImprovement("");
        setWinTurningPoint("");
        setWinReplicable("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold text-foreground mb-1">
          {isClosingWon ? "Close Deal — Won" : isClosingLost ? "Close Deal — Lost" : "Change Deal Stage"}
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          {isClosing ? `Record outcome for ${companyName}` : `Move ${companyName} to a new stage`}
        </p>

        {/* Current → New */}
        <div className="flex items-center gap-3 mb-5">
          <span className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium text-muted-foreground">
            {STAGE_LABELS[currentStage]}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <select
            value={targetStage}
            onChange={(e) => {
              setTargetStage(e.target.value as PipelineStage);
              // Reset outcome fields when stage changes
              setLossReason("");
              setCloseCompetitor("");
              setCloseNotes("");
              setCloseImprovement("");
              setWinTurningPoint("");
              setWinReplicable("");
            }}
            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select stage...</option>
            {STAGES.filter((s) => s !== currentStage).map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* ── Closed-Lost Capture ── */}
        {isClosingLost && (
          <div className="space-y-4 mb-5 animate-[fadeSlideUp_0.2s_ease]">
            <div
              className="rounded-lg p-4"
              style={{ background: "rgba(199,75,59,0.06)", border: "1px solid rgba(199,75,59,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4" style={{ color: "#C74B3B" }} />
                <span className="text-[13px] font-semibold" style={{ color: "#C74B3B" }}>
                  Loss Capture
                </span>
              </div>

              {/* Loss reason */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#8A8078" }}>
                Primary reason
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {LOSS_REASONS.map((r, i) => (
                  <Chip
                    key={r.value}
                    label={r.label}
                    selected={lossReason === r.value}
                    onClick={() => setLossReason(r.value)}
                    index={i}
                  />
                ))}
              </div>

              {/* Competitor (shown if "competitor" selected) */}
              {lossReason === "competitor" && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "#8A8078" }}>
                    Which competitor?
                  </p>
                  <input
                    type="text"
                    value={closeCompetitor}
                    onChange={(e) => setCloseCompetitor(e.target.value)}
                    placeholder="e.g. Microsoft Copilot"
                    className="w-full px-3 py-2 rounded-lg border text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ borderColor: "#E8E5E0", color: "#3D3833" }}
                  />
                </div>
              )}

              {/* What decided it */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "#8A8078" }}>
                What ultimately decided it?
              </p>
              <textarea
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="1-2 sentences on what happened"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
                style={{ borderColor: "#E8E5E0", color: "#3D3833" }}
              />

              {/* What could we have done differently */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#8A8078" }}>
                What could we have done differently?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {IMPROVEMENTS.map((imp, i) => (
                  <Chip
                    key={imp.value}
                    label={imp.label}
                    selected={closeImprovement === imp.value}
                    onClick={() => setCloseImprovement(imp.value)}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Closed-Won Capture ── */}
        {isClosingWon && (
          <div className="space-y-4 mb-5 animate-[fadeSlideUp_0.2s_ease]">
            <div
              className="rounded-lg p-4"
              style={{ background: "rgba(45,138,78,0.06)", border: "1px solid rgba(45,138,78,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4" style={{ color: "#2D8A4E" }} />
                <span className="text-[13px] font-semibold" style={{ color: "#2D8A4E" }}>
                  Win Capture
                </span>
              </div>

              {/* Turning point */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#8A8078" }}>
                What was the turning point?
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {WIN_TURNING_POINTS.map((tp, i) => (
                  <Chip
                    key={tp.value}
                    label={tp.label}
                    selected={winTurningPoint === tp.value}
                    onClick={() => setWinTurningPoint(tp.value)}
                    index={i}
                  />
                ))}
              </div>

              {/* Replicable */}
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: "#8A8078" }}>
                What worked that other reps should replicate?
              </p>
              <textarea
                value={winReplicable}
                onChange={(e) => setWinReplicable(e.target.value)}
                placeholder="What approach or tactic made this deal happen?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ borderColor: "#E8E5E0", color: "#3D3833" }}
              />
            </div>
          </div>
        )}

        {/* Standard reason (for non-closing stages) */}
        {!isClosing && (
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this deal moving stages?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {/* Changed by badge */}
        <div className="flex items-center gap-1.5 mb-5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Changed by:</span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-light text-primary">
            Human
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              canSubmit
                ? isClosingWon
                  ? "text-white hover:opacity-90"
                  : isClosingLost
                    ? "text-white hover:opacity-90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            style={
              canSubmit
                ? isClosingWon
                  ? { background: "#2D8A4E" }
                  : isClosingLost
                    ? { background: "#C74B3B" }
                    : undefined
                : undefined
            }
          >
            {submitting
              ? "Saving..."
              : isClosingWon
                ? "Save & Close Deal"
                : isClosingLost
                  ? "Save & Close Deal"
                  : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

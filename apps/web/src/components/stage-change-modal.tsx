"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, User } from "lucide-react";
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

  if (!open) return null;

  async function handleConfirm() {
    if (!targetStage || targetStage === currentStage) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/deals/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          fromStage: currentStage,
          toStage: targetStage,
          reason: reason || undefined,
        }),
      });
      if (res.ok) {
        router.refresh();
        onClose();
        setTargetStage("");
        setReason("");
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
      <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold text-foreground mb-1">
          Change Deal Stage
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Move {companyName} to a new stage
        </p>

        {/* Current → New */}
        <div className="flex items-center gap-3 mb-5">
          <span className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium text-muted-foreground">
            {STAGE_LABELS[currentStage]}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <select
            value={targetStage}
            onChange={(e) => setTargetStage(e.target.value as PipelineStage)}
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

        {/* Reason */}
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
            disabled={!targetStage || targetStage === currentStage || submitting}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              targetStage && targetStage !== currentStage
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {submitting ? "Updating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

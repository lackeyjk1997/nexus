"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const NEGATIVE_TAGS = [
  "Too aggressive",
  "Wrong tone",
  "Inaccurate",
  "Too generic",
  "Missing context",
  "Too long",
  "Too short",
];

const POSITIVE_TAGS = [
  "Tone was right",
  "Good insights",
  "Saved me time",
  "Accurate info",
];

export function AgentFeedback({
  agentConfigId,
  sourceType,
}: {
  agentConfigId: string;
  sourceType: string;
}) {
  const [state, setState] = useState<
    "idle" | "positive" | "negative" | "submitted"
  >("idle");
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(r: number, tags: string[], text: string) {
    setSubmitting(true);
    try {
      await fetch("/api/agent/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentConfigId,
          rating: r,
          feedbackText: text,
          sourceType,
          tags,
        }),
      });
      setState("submitted");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  if (state === "submitted") {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-success animate-slideUp">
        <Check className="h-3.5 w-3.5" />
        <span>Feedback saved — your agent is learning</span>
      </div>
    );
  }

  if (state === "positive") {
    return (
      <div className="py-2 space-y-2 animate-slideUp">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ThumbsUp className="h-3.5 w-3.5 text-success" />
          <span>What was good about this?</span>
          <button
            onClick={() => setState("idle")}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POSITIVE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full border transition-colors",
                selectedTags.includes(tag)
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "border-border text-muted-foreground hover:border-emerald-200"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
        <button
          onClick={() => submit(5, selectedTags, "")}
          disabled={submitting}
          className="text-xs px-3 py-1.5 rounded-lg bg-success text-white hover:bg-success/90 transition-colors"
        >
          {submitting ? "Saving..." : "Submit"}
        </button>
      </div>
    );
  }

  if (state === "negative") {
    return (
      <div className="py-2 space-y-3 animate-slideUp">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            What went wrong?
          </span>
          <button
            onClick={() => setState("idle")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((r) => (
            <button
              key={r}
              onClick={() => setRating(r)}
              className={cn(
                "h-6 w-6 rounded-full text-[10px] font-medium border transition-colors",
                rating === r
                  ? "bg-secondary text-secondary-foreground border-secondary"
                  : "border-border text-muted-foreground hover:border-secondary"
              )}
            >
              {r}
            </button>
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">
            {rating === 1
              ? "Poor"
              : rating === 2
                ? "Below average"
                : rating === 3
                  ? "Needs work"
                  : "Select rating"}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {NEGATIVE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "text-[10px] px-2 py-1 rounded-full border transition-colors",
                selectedTags.includes(tag)
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "border-border text-muted-foreground hover:border-red-200"
              )}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Text */}
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="How should it have been different?"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <button
          onClick={() => submit(rating || 2, selectedTags, feedbackText)}
          disabled={submitting}
          className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors"
        >
          {submitting ? "Saving..." : "Submit Feedback"}
        </button>
      </div>
    );
  }

  // Idle state — compact toolbar
  return (
    <div className="flex items-center gap-1 py-1">
      <button
        onClick={() => setState("positive")}
        className="p-1.5 rounded-md text-muted-foreground hover:text-success hover:bg-emerald-50 transition-colors"
        title="Good output"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => setState("negative")}
        className="p-1.5 rounded-md text-muted-foreground hover:text-secondary hover:bg-secondary-light transition-colors"
        title="Needs improvement"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

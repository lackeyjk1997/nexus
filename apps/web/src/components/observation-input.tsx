"use client";

import { useState } from "react";
import { Sparkles, Send, Check, X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/components/providers";

interface ObservationInputProps {
  context: {
    page: string;
    dealId?: string;
    accountId?: string;
    analysisId?: string;
    trigger?: string;
    vertical?: string;
  };
  variant?: "inline" | "sidebar" | "post-action";
  autoOpen?: boolean;
  placeholder?: string;
}

export function ObservationInput({
  context,
  variant = "inline",
  autoOpen = false,
  placeholder,
}: ObservationInputProps) {
  const [expanded, setExpanded] = useState(autoOpen);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    acknowledgment: string;
    related_observations_hint?: string;
  } | null>(null);
  const { currentUser } = usePersona();

  const defaultPlaceholder =
    placeholder ||
    (context.page === "deal_detail"
      ? "What are you noticing about this deal?"
      : context.page === "pipeline"
        ? "What are you noticing across your pipeline?"
        : context.page === "analyze"
          ? "Anything the analysis missed, or patterns you're seeing?"
          : context.page === "outreach"
            ? "What are you noticing about prospect responses?"
            : context.page === "prospects"
              ? "What are you noticing about this prospect/market?"
              : "What are you noticing?");

  async function handleSubmit() {
    if (!input.trim() || !currentUser) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: input.trim(),
          context,
          observerId: currentUser.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.giveback);
        setInput("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Submitted state — show give back, then auto-dismiss
  if (result) {
    return (
      <div className="sticky bottom-0 z-30 bg-background/80 backdrop-blur-sm border-t border-border px-4 py-3">
        <div className="max-w-4xl mx-auto bg-primary-light/50 border border-primary/20 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-foreground flex-1">
              {result.acknowledgment}
            </p>
            <button
              onClick={() => {
                setResult(null);
                setExpanded(false);
              }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {result.related_observations_hint && (
            <p className="text-xs text-muted-foreground mt-1 ml-7">
              {result.related_observations_hint}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Expanded state — slides up from the bottom bar
  if (expanded) {
    return (
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-4xl mx-auto p-4 space-y-3 animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">
                Share an observation
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSubmit();
            }}
            placeholder="Share what you're seeing — patterns, blockers, wins, competitive intel, anything. AI will handle the rest."
            rows={3}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />

          <div className="flex items-center justify-between">
            {/* Context chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {context.page.replace("_", " ")}
              </span>
              {context.dealId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary">
                  Deal context
                </span>
              )}
              {context.trigger && context.trigger !== "manual" && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {context.trigger.replace("_", " ")}
                </span>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Collapsed state — persistent bottom bar
  return (
    <div className="sticky bottom-0 z-30 bg-background/80 backdrop-blur-sm border-t border-border">
      <div className="max-w-4xl mx-auto px-4 py-2.5">
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left group"
        >
          <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">
            {defaultPlaceholder}
          </span>
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </button>
      </div>
    </div>
  );
}

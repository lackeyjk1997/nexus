"use client";

import { useState } from "react";
import { Sparkles, Send, Check, X } from "lucide-react";
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

  // Submitted state — show give back
  if (result) {
    return (
      <div className="animate-slideUp">
        <div className="bg-primary-light/50 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{result.acknowledgment}</p>
              {result.related_observations_hint && (
                <p className="text-xs text-muted-foreground mt-1">
                  {result.related_observations_hint}
                </p>
              )}
            </div>
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
        </div>
      </div>
    );
  }

  // Collapsed state
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-all text-left group",
          "border-border hover:border-primary/30 hover:bg-primary-light/20"
        )}
      >
        <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {defaultPlaceholder}
        </span>
      </button>
    );
  }

  // Expanded state
  return (
    <div className="bg-card rounded-xl border border-border p-4 animate-slideUp space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">Share an observation</span>
        <button
          onClick={() => setExpanded(false)}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Share what you're seeing — patterns, blockers, wins, competitive intel, anything. AI will handle the rest."
        rows={3}
        autoFocus
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

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

      <div className="flex justify-end">
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
  );
}

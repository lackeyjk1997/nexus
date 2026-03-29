"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, ChevronUp, ChevronDown, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/components/providers";

type AskPhase = "collapsed" | "expanded" | "submitting" | "answered";

type DealForSuggestions = {
  id: string;
  name: string;
  competitor: string | null;
  stage: string;
  stageEnteredAt: Date | null;
};

type MeddpiccForSuggestions = {
  economicBuyerConfidence: number | null;
  championConfidence: number | null;
  decisionProcessConfidence: number | null;
  metricsConfidence: number | null;
} | null;

type AnswerData = {
  immediate_answer?: string;
  questionsSent?: number;
  targetName?: string;
};

function generateSuggestions(deal: DealForSuggestions, meddpicc: MeddpiccForSuggestions): string[] {
  const suggestions: string[] = [];

  if (meddpicc) {
    if ((meddpicc.economicBuyerConfidence ?? 0) < 50) {
      suggestions.push("Is the Economic Buyer engaged?");
    }
    if ((meddpicc.championConfidence ?? 0) < 50) {
      suggestions.push("Has the champion gone quiet?");
    }
    if ((meddpicc.decisionProcessConfidence ?? 0) < 50) {
      suggestions.push("Do we understand the decision process?");
    }
  }

  if (deal.competitor) {
    suggestions.push(`What's the competitive situation with ${deal.competitor}?`);
  }

  if (deal.stageEnteredAt) {
    const daysInStage = Math.floor((Date.now() - new Date(deal.stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysInStage > 30) {
      suggestions.push("What's holding this deal up?");
    }
  }

  suggestions.push("What's the biggest risk on this deal?");

  return suggestions.slice(0, 3);
}

export function DealQuestionInput({
  deal,
  meddpicc,
}: {
  deal: DealForSuggestions;
  meddpicc: MeddpiccForSuggestions;
}) {
  const { currentUser } = usePersona();
  const [phase, setPhase] = useState<AskPhase>("collapsed");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerData | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = generateSuggestions(deal, meddpicc);

  useEffect(() => {
    if (phase === "expanded" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [phase]);

  async function handleSubmit(q: string) {
    if (!q.trim() || !currentUser) return;
    setQuestion(q.trim());
    setPhase("submitting");

    try {
      const res = await fetch("/api/field-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawQuestion: q.trim(),
          initiatedBy: currentUser.id,
          dealId: deal.id,
        }),
      });
      const data = await res.json();

      setAnswer({
        immediate_answer: data.immediate_answer || data.aggregatedAnswer?.summary,
        questionsSent: data.questionsSent ?? 0,
        targetName: data.targetName,
      });
      setPhase("answered");
    } catch {
      setAnswer({ immediate_answer: "Unable to process this question right now." });
      setPhase("answered");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(question);
    }
    if (e.key >= "1" && e.key <= "3" && question === "") {
      const idx = parseInt(e.key) - 1;
      if (suggestions[idx]) {
        e.preventDefault();
        handleSubmit(suggestions[idx]);
      }
    }
    if (e.key === "Escape") {
      setPhase("collapsed");
      setQuestion("");
    }
  }

  // Collapsed
  if (phase === "collapsed") {
    return (
      <button
        onClick={() => setPhase("expanded")}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all hover:border-[#E07A5F]/40 group"
        style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FAFAF8" }}
      >
        <span className="flex items-center gap-2 text-sm" style={{ color: "#8A8078" }}>
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#E07A5F" }} />
          Ask about this deal
        </span>
        <ChevronUp className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#8A8078" }} />
      </button>
    );
  }

  // Submitting
  if (phase === "submitting") {
    return (
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FAFAF8" }}>
        {/* User question bubble */}
        <div className="flex justify-end">
          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm" style={{ background: "#3D3833", color: "#FFFFFF" }}>
            {question}
          </div>
        </div>
        {/* Loading */}
        <div className="flex items-center gap-2 text-sm" style={{ color: "#8A8078" }}>
          <div className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: "#E8DDD3", borderTopColor: "#E07A5F" }} />
          Checking deal data and team intelligence...
        </div>
      </div>
    );
  }

  // Answered
  if (phase === "answered" && answer) {
    return (
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FAFAF8" }}>
        {/* User question bubble */}
        <div className="flex justify-end">
          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm" style={{ background: "#3D3833", color: "#FFFFFF" }}>
            {question}
          </div>
        </div>
        {/* Sparkle response card */}
        <div className="rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FFFFFF", boxShadow: "0 2px 12px rgba(107,79,57,0.06)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "#E07A5F" }} />
            <span className="text-xs font-semibold" style={{ color: "#3D3833" }}>Nexus Intelligence</span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#3D3833" }}>
            {answer.immediate_answer}
          </div>
          {(answer.questionsSent ?? 0) > 0 && (
            <div className="mt-3 pt-3 border-t text-xs flex items-center gap-1.5" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#8A8078" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              A question has been sent to {answer.targetName || "the deal owner"} for an update.
            </div>
          )}
          {(answer.questionsSent ?? 0) === 0 && (
            <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#8A8078" }}>
              Answered from existing deal data
            </div>
          )}
        </div>
        {/* Dismiss */}
        <div className="flex justify-end">
          <button
            onClick={() => { setPhase("collapsed"); setQuestion(""); setAnswer(null); }}
            className="text-xs flex items-center gap-1 hover:underline"
            style={{ color: "#8A8078" }}
          >
            <X className="h-3 w-3" /> Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Expanded
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "rgba(0,0,0,0.06)", background: "#FAFAF8" }}>
      <p className="text-sm font-medium" style={{ color: "#3D3833" }}>
        What do you want to know about {deal.name.split(" — ")[0]}?
      </p>

      <textarea
        ref={textareaRef}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., Is the CFO engaged? What's blocking this? Has the champion gone quiet?"
        className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm placeholder:text-[#B5ADA5] focus:outline-none focus:ring-1 focus:ring-[#E07A5F]/30 focus:border-[#E07A5F]/40"
        style={{ borderColor: "rgba(0,0,0,0.08)", background: "#FFFFFF", color: "#3D3833" }}
        rows={2}
      />

      {/* Suggestions — only when textarea is empty */}
      {question === "" && suggestions.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.06)" }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "#B5ADA5" }}>Suggested questions</span>
            <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.06)" }} />
          </div>

          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(s)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[#E8DDD3]/50"
                style={{ background: "#F5F3EF" }}
              >
                <span className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "#3D3833", color: "#FFFFFF" }}>
                  {i + 1}
                </span>
                <span className="text-sm" style={{ color: "#3D3833" }}>{s}</span>
              </button>
            ))}
          </div>

          <p className="text-[10px] text-center" style={{ color: "#B5ADA5" }}>
            1-{suggestions.length} select · or type your own question
          </p>
        </>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setPhase("collapsed"); setQuestion(""); }}
          className="text-xs hover:underline"
          style={{ color: "#8A8078" }}
        >
          Cancel
        </button>
        <button
          onClick={() => handleSubmit(question)}
          disabled={!question.trim()}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            question.trim()
              ? "text-white"
              : "text-[#B5ADA5] cursor-not-allowed"
          )}
          style={{ background: question.trim() ? "#E07A5F" : "#F0EBE5" }}
        >
          Ask Nexus <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

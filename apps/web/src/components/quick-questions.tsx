"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, X, Check, Lightbulb, ArrowRight, CornerDownLeft } from "lucide-react";
import { usePersona } from "@/components/providers";

type PendingQuestion = {
  id: string;
  queryId: string;
  questionText: string;
  chips: string[];
  dealId: string | null;
  accountId: string | null;
  dealName: string | null;
  dealStage: string | null;
  dealValue: string | null;
  companyName: string | null;
};

type GiveBack = {
  insight: string;
  source: string;
};

type Phase = "loading" | "question" | "submitting" | "giveback" | "hidden";

interface QuickQuestionsProps {
  filterDealId?: string; // Only show questions for this deal (deal detail page)
}

export function QuickQuestions({ filterDealId }: QuickQuestionsProps) {
  const { currentUser } = usePersona();
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [highlightedOption, setHighlightedOption] = useState(-1);
  const [freeTextInput, setFreeTextInput] = useState("");
  const [giveBack, setGiveBack] = useState<GiveBack | null>(null);
  const [dealName, setDealName] = useState<string>("");

  // Only show for AEs
  const isAE = currentUser?.role === "AE";

  useEffect(() => {
    if (!currentUser?.id || !isAE) return;

    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/field-queries?targetMemberId=${currentUser!.id}`);
        if (!res.ok) return;
        const data = await res.json();

        const filtered = filterDealId
          ? data.filter((q: PendingQuestion) => q.dealId === filterDealId)
          : data;

        if (filtered.length > 0) {
          setQuestions(filtered);
          setPhase("question");
        } else {
          setPhase("hidden");
        }
      } catch {
        setPhase("hidden");
      }
    }

    fetchQuestions();
  }, [currentUser?.id, isAE, filterDealId]);

  const current = questions[currentIndex];

  async function handleRespond(text: string, type: "chip" | "text", selectedChip?: string) {
    if (!current || !text.trim()) return;
    setDealName(current.dealName || "the deal");
    setPhase("submitting");

    try {
      const res = await fetch("/api/field-queries/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: current.id,
          responseText: text.trim(),
          responseType: type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGiveBack(data.giveBack);
        setPhase("giveback");
        setFreeTextInput("");
        setHighlightedOption(-1);

        // Auto-advance after 4 seconds
        setTimeout(() => {
          advanceToNext();
        }, 4000);
      } else {
        setPhase("question");
      }
    } catch {
      setPhase("question");
    }
  }

  function advanceToNext() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setPhase("question");
      setGiveBack(null);
      setHighlightedOption(-1);
      setFreeTextInput("");
    } else {
      setPhase("hidden");
    }
  }

  function handleDismiss() {
    // Mark as skipped
    if (current) {
      fetch("/api/field-queries/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: current.id,
          responseText: "[Skipped]",
          responseType: "skip",
        }),
      }).catch(() => {});
    }
    advanceToNext();
  }

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== "question" || !current?.chips) return;
      const chipCount = current.chips.length;

      const num = parseInt(e.key);
      if (num >= 1 && num <= chipCount) {
        e.preventDefault();
        handleRespond(current.chips[num - 1]!, "chip", current.chips[num - 1]);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedOption((h) => (h <= 0 ? chipCount - 1 : h - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedOption((h) => (h >= chipCount - 1 ? 0 : h + 1));
      } else if (e.key === "Enter" && highlightedOption >= 0 && !freeTextInput) {
        e.preventDefault();
        handleRespond(current.chips[highlightedOption]!, "chip", current.chips[highlightedOption]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, current, highlightedOption, freeTextInput]
  );

  useEffect(() => {
    if (phase === "question") {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [phase, handleKeyDown]);

  if (!isAE || phase === "hidden" || phase === "loading" || !current) return null;

  // ─── Submitting state ───
  if (phase === "submitting") {
    return (
      <div
        className="mb-4 animate-[fadeSlideUp_0.3s_ease]"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: "12px",
          boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        }}
      >
        <div className="px-5 py-4 flex items-center gap-2.5">
          <span
            className="h-4 w-4 rounded-full border-2 animate-spin shrink-0"
            style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }}
          />
          <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>
            Processing…
          </span>
        </div>
      </div>
    );
  }

  // ─── Give back state ───
  if (phase === "giveback" && giveBack) {
    return (
      <div
        className="mb-4 animate-[fadeSlideUp_0.4s_ease]"
        style={{
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: "12px",
          boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-[18px] py-3"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
          <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>
            Nexus Intelligence
          </span>
          <button
            onClick={advanceToNext}
            className="ml-auto p-0.5 transition-colors hover:opacity-70"
            style={{ color: "#8A8078" }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Body rows */}
        <div className="px-[18px] py-3.5 flex flex-col gap-3">
          {/* Acknowledgment */}
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center shrink-0 mt-0.5"
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                background: "rgba(224,122,95,0.08)",
              }}
            >
              <Check className="h-3 w-3" style={{ color: "#E07A5F" }} />
            </div>
            <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>
              Got it — {dealName} deal updated.
            </p>
          </div>

          {/* Insight */}
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center shrink-0 mt-0.5"
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                background: "rgba(224,122,95,0.08)",
              }}
            >
              <Lightbulb className="h-3 w-3" style={{ color: "#E07A5F" }} />
            </div>
            <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>
              {giveBack.insight}
            </p>
          </div>

          {/* Transparency */}
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center shrink-0 mt-0.5"
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "6px",
                background: "rgba(224,122,95,0.08)",
              }}
            >
              <ArrowRight className="h-3 w-3" style={{ color: "#E07A5F" }} />
            </div>
            <p className="text-[13.5px] leading-[1.5]" style={{ color: "#8A8078" }}>
              Updated: deal record, account profile, team intel
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Question state ───
  return (
    <div
      className="mb-4 animate-[fadeSlideUp_0.35s_ease]"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: "12px",
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
        <span className="text-[13px] font-medium tracking-[0.01em]" style={{ color: "#3D3833" }}>
          Quick check from Nexus Intelligence
        </span>
        {questions.length > 1 && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full ml-1"
            style={{ background: "#F3EDE7", color: "#8A8078" }}
          >
            {currentIndex + 1} of {questions.length}
          </span>
        )}
        <button
          onClick={handleDismiss}
          className="ml-auto p-0.5 transition-colors hover:opacity-70"
          style={{ color: "#8A8078" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Question */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[14px] leading-[1.55]" style={{ color: "#3D3833" }}>
          {current.questionText}
        </p>
      </div>

      <div className="mx-5" style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />

      {/* Numbered options */}
      {current.chips && current.chips.length > 0 && (
        <div className="px-2 pt-2 pb-1">
          {current.chips.map((chip, i) => (
            <button
              key={chip}
              onClick={() => handleRespond(chip, "chip", chip)}
              onMouseEnter={() => setHighlightedOption(i)}
              onMouseLeave={() => setHighlightedOption(-1)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150"
              style={{
                background: highlightedOption === i ? "#F3EDE7" : "transparent",
              }}
            >
              <span
                className="flex items-center justify-center shrink-0 text-[12px] font-semibold transition-all duration-150"
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  border: `1.5px solid ${highlightedOption === i ? "#E07A5F" : "#D4C9BD"}`,
                  color: highlightedOption === i ? "#E07A5F" : "#8A8078",
                }}
              >
                {i + 1}
              </span>
              <span className="text-[14px] flex-1 text-left" style={{ color: "#3D3833" }}>
                {chip}
              </span>
              {highlightedOption === i && (
                <CornerDownLeft className="h-3 w-3 shrink-0" style={{ color: "rgba(138,128,120,0.6)" }} />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mx-5" style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />

      {/* Free text input */}
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="text"
          value={freeTextInput}
          onChange={(e) => {
            setFreeTextInput(e.target.value);
            setHighlightedOption(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && freeTextInput.trim()) {
              e.stopPropagation();
              handleRespond(freeTextInput, "text");
            }
          }}
          placeholder="Or tell us more…"
          className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder:text-[#8A8078]/60"
          style={{ color: "#3D3833" }}
        />
        <button
          onClick={() => {
            if (freeTextInput.trim()) handleRespond(freeTextInput, "text");
          }}
          className="transition-all duration-200"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: freeTextInput.trim() ? "#E07A5F" : "transparent",
            opacity: freeTextInput.trim() ? 1 : 0,
            pointerEvents: freeTextInput.trim() ? "auto" : "none",
          }}
        >
          <ArrowRight className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="px-5 pb-2.5">
        <p className="text-[11px]" style={{ color: "rgba(138,128,120,0.5)" }}>
          ↑↓ navigate · 1-{current.chips?.length || 0} select · enter confirm
        </p>
      </div>
    </div>
  );
}

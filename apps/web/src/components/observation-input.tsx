"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, Check, X, ChevronUp, ArrowRight, Users, CornerDownLeft } from "lucide-react";
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

type FollowUp = {
  should_ask: boolean;
  question: string | null;
  chips: string[] | null;
  clarifies: string | null;
};

type Giveback = {
  acknowledgment: string;
  related_observations_hint?: string;
  routing?: string;
  arr_impact?: { total_value: number; deal_count: number } | null;
};

type Phase =
  | "collapsed"
  | "expanded"
  | "submitting"
  | "follow_up"
  | "follow_up_submitting"
  | "giveback";

export function ObservationInput({
  context,
  variant = "inline",
  autoOpen = false,
  placeholder,
}: ObservationInputProps) {
  const [phase, setPhase] = useState<Phase>(autoOpen ? "expanded" : "collapsed");
  const [input, setInput] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpResponseText, setFollowUpResponseText] = useState("");
  const [observationId, setObservationId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [giveback, setGiveback] = useState<Giveback | null>(null);
  const [highlightedOption, setHighlightedOption] = useState(-1);
  const followUpRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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

  function reset() {
    setPhase("collapsed");
    setInput("");
    setSubmittedText("");
    setFollowUpInput("");
    setFollowUpResponseText("");
    setObservationId(null);
    setFollowUp(null);
    setGiveback(null);
    setHighlightedOption(-1);
  }

  async function handleSubmit() {
    if (!input.trim() || !currentUser) return;
    setSubmittedText(input.trim());
    setPhase("submitting");

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
        setObservationId(data.id);

        if (data.follow_up?.should_ask && data.follow_up.question) {
          setFollowUp(data.follow_up);
          setGiveback(data.giveback);
          setPhase("follow_up");
          setTimeout(() => followUpRef.current?.focus(), 100);
        } else {
          setGiveback(data.giveback);
          setPhase("giveback");
          setTimeout(() => {
            setPhase((p) => (p === "giveback" ? "collapsed" : p));
          }, 15000);
        }
        setInput("");
      } else {
        setPhase("expanded");
      }
    } catch {
      setPhase("expanded");
    }
  }

  async function handleFollowUpSubmit(responseText: string, source: "chip" | "text", selectedChip?: string) {
    if (!responseText.trim() || !observationId) return;
    setFollowUpResponseText(responseText.trim());
    setPhase("follow_up_submitting");

    try {
      const res = await fetch(`/api/observations/${observationId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseText: responseText.trim(),
          responseSource: source,
          selectedChip: selectedChip || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGiveback(data.giveback);
        setPhase("giveback");
        setFollowUpInput("");
        setTimeout(() => {
          setPhase((p) => (p === "giveback" ? "collapsed" : p));
        }, 15000);
      } else {
        setPhase("follow_up");
      }
    } catch {
      setPhase("follow_up");
    }
  }

  // Keyboard navigation for follow-up options
  const handleFollowUpKeyDown = useCallback((e: KeyboardEvent) => {
    if (phase !== "follow_up" || !followUp?.chips) return;
    const chipCount = followUp.chips.length;

    // Number keys 1-N select directly
    const num = parseInt(e.key);
    if (num >= 1 && num <= chipCount) {
      e.preventDefault();
      handleFollowUpSubmit(followUp.chips[num - 1], "chip", followUp.chips[num - 1]);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedOption((h) => (h <= 0 ? chipCount - 1 : h - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedOption((h) => (h >= chipCount - 1 ? 0 : h + 1));
    } else if (e.key === "Enter" && highlightedOption >= 0 && !followUpInput) {
      e.preventDefault();
      handleFollowUpSubmit(followUp.chips[highlightedOption], "chip", followUp.chips[highlightedOption]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, followUp, highlightedOption, followUpInput]);

  useEffect(() => {
    if (phase === "follow_up") {
      window.addEventListener("keydown", handleFollowUpKeyDown);
      return () => window.removeEventListener("keydown", handleFollowUpKeyDown);
    }
  }, [phase, handleFollowUpKeyDown]);

  // ─── Conversation states (submitting, follow_up, follow_up_submitting, giveback) ───
  const isConversationActive = phase === "submitting" || phase === "follow_up" || phase === "follow_up_submitting" || phase === "giveback";

  if (isConversationActive) {
    return (
      <div className="sticky bottom-0 z-30">
        {/* Conversation area */}
        <div className="border-t" style={{ borderColor: "rgba(0,0,0,0.06)", background: "rgba(253,250,247,0.92)", backdropFilter: "blur(12px)" }}>
          <div className="max-w-[600px] mx-auto px-4 py-4 flex flex-col gap-4">

            {/* User's original message — right-aligned sand bubble */}
            {submittedText && (
              <div className="flex justify-end animate-[fadeSlideUp_0.3s_ease]">
                <div
                  className="max-w-[85%] px-4 py-2.5 text-[14px] leading-[1.55]"
                  style={{
                    background: "#E8DDD3",
                    color: "#3D3833",
                    borderRadius: "16px 16px 4px 16px",
                  }}
                >
                  {submittedText}
                </div>
              </div>
            )}

            {/* Submitting spinner */}
            {phase === "submitting" && (
              <div className="flex items-center gap-2.5 animate-[fadeSlideUp_0.25s_ease]">
                <span
                  className="h-4 w-4 rounded-full border-2 animate-spin shrink-0"
                  style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }}
                />
                <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>
                  Classifying and routing…
                </span>
              </div>
            )}

            {/* Follow-up card */}
            {phase === "follow_up" && followUp?.question && (
              <div
                ref={cardRef}
                className="animate-[fadeSlideUp_0.35s_ease]"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
                }}
              >
                {/* Question */}
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[14px] leading-[1.55]" style={{ color: "#3D3833" }}>
                    {followUp.question}
                  </p>
                </div>

                <div className="mx-5" style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />

                {/* Numbered options */}
                {followUp.chips && followUp.chips.length > 0 && (
                  <div className="px-2 pt-2 pb-1">
                    {followUp.chips.map((chip, i) => (
                      <button
                        key={chip}
                        onClick={() => handleFollowUpSubmit(chip, "chip", chip)}
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
                    ref={followUpRef}
                    type="text"
                    value={followUpInput}
                    onChange={(e) => {
                      setFollowUpInput(e.target.value);
                      setHighlightedOption(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && followUpInput.trim()) {
                        e.stopPropagation();
                        handleFollowUpSubmit(followUpInput, "text");
                      }
                    }}
                    placeholder="Or type your answer…"
                    className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder:text-[#8A8078]/60"
                    style={{ color: "#3D3833" }}
                  />
                  <button
                    onClick={() => {
                      if (followUpInput.trim()) handleFollowUpSubmit(followUpInput, "text");
                    }}
                    className="transition-all duration-200"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: followUpInput.trim() ? "#E07A5F" : "transparent",
                      opacity: followUpInput.trim() ? 1 : 0,
                      pointerEvents: followUpInput.trim() ? "auto" : "none",
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>

                {/* Keyboard hints */}
                <div className="px-5 pb-2.5">
                  <p className="text-[11px]" style={{ color: "rgba(138,128,120,0.5)" }}>
                    ↑↓ navigate · 1-{followUp.chips?.length || 0} select · enter confirm
                  </p>
                </div>
              </div>
            )}

            {/* Follow-up submitting — show user response + spinner */}
            {phase === "follow_up_submitting" && (
              <>
                {followUpResponseText && (
                  <div className="flex justify-end animate-[fadeSlideUp_0.25s_ease]">
                    <div
                      className="max-w-[85%] px-3.5 py-2 text-[13px] leading-[1.55]"
                      style={{
                        background: "#E8DDD3",
                        color: "#3D3833",
                        borderRadius: "14px 14px 4px 14px",
                      }}
                    >
                      {followUpResponseText}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5 animate-[fadeSlideUp_0.25s_ease]">
                  <span
                    className="h-4 w-4 rounded-full border-2 animate-spin shrink-0"
                    style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }}
                  />
                  <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>
                    Processing…
                  </span>
                </div>
              </>
            )}

            {/* Give back card */}
            {phase === "giveback" && giveback && (
              <>
                {/* Show follow-up response bubble if it came from a follow-up */}
                {followUpResponseText && (
                  <div className="flex justify-end animate-[fadeSlideUp_0.25s_ease]">
                    <div
                      className="max-w-[85%] px-3.5 py-2 text-[13px] leading-[1.55]"
                      style={{
                        background: "#E8DDD3",
                        color: "#3D3833",
                        borderRadius: "14px 14px 4px 14px",
                      }}
                    >
                      {followUpResponseText}
                    </div>
                  </div>
                )}

                <div
                  className="animate-[fadeSlideUp_0.4s_ease]"
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
                    <span
                      className="text-[13px] font-semibold tracking-[0.01em]"
                      style={{ color: "#3D3833" }}
                    >
                      Nexus Intelligence
                    </span>
                    <button onClick={reset} className="ml-auto p-0.5 transition-colors hover:opacity-70" style={{ color: "#8A8078" }}>
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
                        {giveback.acknowledgment}
                      </p>
                    </div>

                    {/* Related observations */}
                    {giveback.related_observations_hint && (
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
                          <Users className="h-3 w-3" style={{ color: "#E07A5F" }} />
                        </div>
                        <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>
                          {giveback.related_observations_hint}
                        </p>
                      </div>
                    )}

                    {/* ARR impact */}
                    {giveback.arr_impact && giveback.arr_impact.total_value > 0 && (
                      <div className="flex items-start gap-3">
                        <div
                          className="flex items-center justify-center shrink-0 mt-0.5 text-[11px]"
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "6px",
                            background: "rgba(224,122,95,0.08)",
                            color: "#E07A5F",
                          }}
                        >
                          €
                        </div>
                        <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>
                          Pipeline impact: €{(giveback.arr_impact.total_value / 1000).toFixed(0)}K across {giveback.arr_impact.deal_count} deal{giveback.arr_impact.deal_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}

                    {/* Routing */}
                    {giveback.routing && (
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
                          {giveback.routing}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dimmed bottom bar during giveback */}
          {phase === "giveback" && (
            <div className="max-w-4xl mx-auto px-4 pb-2.5 pt-0 opacity-40 pointer-events-none">
              <div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border" style={{ borderColor: "#E8E5E0" }}>
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#9B9B9B" }} />
                <span className="text-sm flex-1" style={{ color: "#9B9B9B" }}>
                  {defaultPlaceholder}
                </span>
                <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "#9B9B9B" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Expanded State ───
  if (phase === "expanded") {
    return (
      <div className="sticky bottom-0 z-30 border-t" style={{ borderColor: "rgba(0,0,0,0.06)", background: "rgba(253,250,247,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-4xl mx-auto p-4 space-y-3 animate-[fadeSlideUp_0.3s_ease]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#E07A5F" }} />
              <span className="text-xs font-medium" style={{ color: "#3D3833" }}>
                Share an observation
              </span>
            </div>
            <button
              onClick={() => setPhase("collapsed")}
              className="p-1 transition-colors hover:opacity-70"
              style={{ color: "#8A8078" }}
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
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
            style={{
              border: "1px solid #E8E5E0",
              background: "#FFFFFF",
              color: "#3D3833",
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#F3EDE7", color: "#8A8078" }}>
                {context.page.replace("_", " ")}
              </span>
              {context.dealId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}>
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
              disabled={!input.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                input.trim()
                  ? "text-white hover:opacity-90"
                  : "cursor-not-allowed"
              )}
              style={{
                background: input.trim() ? "#E07A5F" : "#D4C9BD",
                color: input.trim() ? "#FFFFFF" : "#8A8078",
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Collapsed State ───
  return (
    <div className="sticky bottom-0 z-30 border-t" style={{ borderColor: "rgba(0,0,0,0.06)", background: "rgba(253,250,247,0.8)", backdropFilter: "blur(12px)" }}>
      <div className="max-w-4xl mx-auto px-4 py-2.5">
        <button
          onClick={() => setPhase("expanded")}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white text-left group transition-all duration-200"
          style={{
            border: "1px solid #E8E5E0",
            boxShadow: "0 1px 3px rgba(107,79,57,0.04)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(224,122,95,0.3)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(107,79,57,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#E8E5E0";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(107,79,57,0.04)";
          }}
        >
          <Sparkles className="h-4 w-4 shrink-0 transition-colors duration-200 text-[#D4C9BD] group-hover:text-[#E07A5F]" />
          <span className="text-sm flex-1 transition-colors duration-200 text-[#8A8078] group-hover:text-[#3D3833]">
            {defaultPlaceholder}
          </span>
          <ChevronUp className="h-3.5 w-3.5 shrink-0 transition-colors duration-200 text-[#D4C9BD] group-hover:text-[#E07A5F]" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Send, Check, X, ChevronUp, ArrowRight, Users, CornerDownLeft,
  Lightbulb, Copy, RotateCcw, AlertTriangle, ChevronDown, Phone, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/components/providers";

// ── Types ──────────────────────────────────────────────────────────────────────

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

type PendingQuestion = {
  id: string;
  queryId: string;
  questionText: string;
  chips: string[];
  dealId: string | null;
  dealName: string | null;
};

type QuickCheckGiveBack = {
  insight: string;
  source: string;
};

type CallBrief = {
  headline: string;
  deal_snapshot: {
    stage: string;
    value: string;
    days_in_stage: string;
    health: string;
    health_reason: string;
  };
  stakeholders_in_play: Array<{
    name: string;
    title: string;
    role: string;
    engagement: string;
    last_contact: string | null;
    notes: string;
  }>;
  talking_points: Array<{ topic: string; why: string; approach: string }>;
  questions_to_ask: Array<{ question: string; purpose: string; meddpicc_gap: string | null }>;
  risks_and_landmines: Array<{ risk: string; source: string; mitigation: string }>;
  team_intelligence: string[];
  competitive_context: string | null;
  suggested_resources?: Array<{ title: string; type: string; why: string }>;
  suggested_next_steps: string[];
};

type EmailDraft = {
  subject: string;
  body: string;
  to: string;
  notes_for_rep: string;
};

type Phase =
  | "collapsed"
  | "expanded"
  | "submitting"
  | "follow_up"
  | "follow_up_submitting"
  | "giveback"
  | "quick_check"
  | "quick_check_submitting"
  | "quick_check_giveback"
  | "call_prep_loading"
  | "call_prep_result"
  | "draft_loading"
  | "draft_result";

// ── Intent Detection ───────────────────────────────────────────────────────────

function detectIntent(input: string): "observe" | "call_prep" | "draft_email" {
  const lower = input.toLowerCase();
  if (
    lower.match(
      /\b(prep|prepare|brief|get ready for|upcoming call|before my call|call with|meeting with)\b/
    )
  )
    return "call_prep";
  if (
    lower.match(/\b(draft|write|compose|email|follow.?up|reply|message to|reach out)\b/) &&
    !lower.match(/\b(noticing|seeing|hearing|pattern|observed)\b/)
  )
    return "draft_email";
  return "observe";
}

// ── Collapsible Section ────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2"
        style={{ color: accent ? "#E07A5F" : "#3D3833" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">{title}</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open ? "rotate-180" : "")}
          style={{ color: "#8A8078" }}
        />
      </button>
      {open && children}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ObservationInput({
  context,
  variant = "inline",
  autoOpen = false,
  placeholder,
}: ObservationInputProps) {
  // Observation state
  const [phase, setPhase] = useState<Phase>(autoOpen ? "expanded" : "collapsed");
  const [input, setInput] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpResponseText, setFollowUpResponseText] = useState("");
  const [observationId, setObservationId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [giveback, setGiveback] = useState<Giveback | null>(null);
  const [highlightedOption, setHighlightedOption] = useState(-1);

  // Quick check state
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [quickCheckIndex, setQuickCheckIndex] = useState(0);
  const [quickCheckHighlight, setQuickCheckHighlight] = useState(-1);
  const [quickCheckFreeText, setQuickCheckFreeText] = useState("");
  const [quickCheckGiveBack, setQuickCheckGiveBack] = useState<QuickCheckGiveBack | null>(null);
  const [quickCheckDealName, setQuickCheckDealName] = useState("");

  // Call prep state
  const [callBrief, setCallBrief] = useState<CallBrief | null>(null);
  const [callBriefDealId, setCallBriefDealId] = useState<string | null>(null);
  const [callBriefDealName, setCallBriefDealName] = useState<string | null>(null);

  // Email draft state
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [emailDealId, setEmailDealId] = useState<string | null>(null);
  const [emailContactName, setEmailContactName] = useState<string | null>(null);
  const [emailContext, setEmailContext] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"email" | "brief" | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<"email" | "brief" | null>(null);

  const followUpRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { currentUser } = usePersona();

  const isAE = currentUser?.role === "AE";

  const defaultPlaceholder =
    placeholder ||
    (context.page === "deal_detail"
      ? "Ask Nexus — prep this call, draft a follow-up, or share intel"
      : context.page === "pipeline"
        ? "Ask Nexus — prep a call, draft an email, or share what you're seeing"
        : context.page === "analyze"
          ? "Anything the analysis missed, or patterns you're seeing?"
          : context.page === "outreach"
            ? "What are you noticing about prospect responses?"
            : context.page === "prospects"
              ? "What are you noticing about this prospect/market?"
              : "Ask Nexus anything — share intel, prep a call, draft an email…");

  // ── Fetch pending quick check questions on mount ──
  useEffect(() => {
    if (!currentUser?.id || !isAE) return;
    fetch(`/api/field-queries?targetMemberId=${currentUser.id}`)
      .then((r) => r.json())
      .then((data: PendingQuestion[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setPendingQuestions(data);
        }
      })
      .catch(() => {});
  }, [currentUser?.id, isAE]);

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
    setCallBrief(null);
    setEmailDraft(null);
    setSaveFeedback(null);
  }

  // ── Observation submit ──
  async function handleObservationSubmit() {
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

  // ── Call prep submit ──
  async function handleCallPrep(userInput: string) {
    if (!currentUser) return;
    setSubmittedText(userInput);
    setInput("");
    setPhase("call_prep_loading");

    try {
      const res = await fetch("/api/agent/call-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: currentUser.id,
          rawQuery: userInput,
          dealId: context.dealId,
          accountId: context.accountId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCallBrief(data.brief);
        setCallBriefDealId(data.dealId ?? null);
        setCallBriefDealName(data.dealName ?? data.accountName ?? null);
        setPhase("call_prep_result");
      } else {
        setPhase("expanded");
      }
    } catch {
      setPhase("expanded");
    }
  }

  // ── Draft email submit ──
  async function handleDraftEmail(userInput: string) {
    if (!currentUser) return;
    setSubmittedText(userInput);
    setInput("");
    setPhase("draft_loading");

    try {
      const res = await fetch("/api/agent/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "follow_up",
          memberId: currentUser.id,
          rawQuery: userInput,
          dealId: context.dealId,
          accountId: context.accountId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data.draft);
        setEditedSubject(data.draft.subject);
        setEditedBody(data.draft.body);
        setEmailDealId(data.dealId ?? null);
        setEmailContactName(data.contactName ?? null);
        setPhase("draft_result");
      } else {
        setPhase("expanded");
      }
    } catch {
      setPhase("expanded");
    }
  }

  // ── Master submit — route by intent ──
  async function handleSubmit() {
    if (!input.trim() || !currentUser) return;
    const intent = detectIntent(input.trim());
    if (intent === "call_prep") return handleCallPrep(input.trim());
    if (intent === "draft_email") return handleDraftEmail(input.trim());
    return handleObservationSubmit();
  }

  // ── Follow-up submit ──
  async function handleFollowUpSubmit(
    responseText: string,
    source: "chip" | "text",
    selectedChip?: string
  ) {
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

  // ── Quick check handlers ──
  async function handleQuickCheckRespond(
    text: string,
    type: "chip" | "text",
    selectedChip?: string
  ) {
    const current = pendingQuestions[quickCheckIndex];
    if (!current || !text.trim()) return;
    setQuickCheckDealName(current.dealName || "the deal");
    setPhase("quick_check_submitting");

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
        setQuickCheckGiveBack(data.giveBack);
        setPhase("quick_check_giveback");
        setQuickCheckFreeText("");
        setQuickCheckHighlight(-1);
        setTimeout(() => advanceQuickCheck(), 4000);
      } else {
        setPhase("quick_check");
      }
    } catch {
      setPhase("quick_check");
    }
  }

  function advanceQuickCheck() {
    if (quickCheckIndex + 1 < pendingQuestions.length) {
      setQuickCheckIndex((i) => i + 1);
      setQuickCheckGiveBack(null);
      setQuickCheckHighlight(-1);
      setQuickCheckFreeText("");
      setPhase("quick_check");
    } else {
      setPendingQuestions([]);
      setPhase("collapsed");
    }
  }

  function handleQuickCheckDismiss() {
    const current = pendingQuestions[quickCheckIndex];
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
    advanceQuickCheck();
  }

  // ── Save actions ──
  async function saveToDeals(title: string, description: string, dealId: string | null, type: "email" | "brief" = "brief") {
    if (!dealId || !currentUser) return;
    await fetch("/api/agent/save-to-deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId,
        memberId: currentUser.id,
        title,
        description,
      }),
    }).catch(() => {});
    setSaveFeedback(type);
  }

  async function copyToClipboard(text: string, type: "email" | "brief") {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopyFeedback(type);
    setTimeout(() => setCopyFeedback(null), 2000);
  }

  // ── Keyboard navigation: follow-up ──
  const handleFollowUpKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase !== "follow_up" || !followUp?.chips) return;
      const chipCount = followUp.chips.length;
      const num = parseInt(e.key);
      if (num >= 1 && num <= chipCount) {
        e.preventDefault();
        handleFollowUpSubmit(followUp.chips[num - 1]!, "chip", followUp.chips[num - 1]);
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
        handleFollowUpSubmit(followUp.chips[highlightedOption]!, "chip", followUp.chips[highlightedOption]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, followUp, highlightedOption, followUpInput]
  );

  useEffect(() => {
    if (phase === "follow_up") {
      window.addEventListener("keydown", handleFollowUpKeyDown);
      return () => window.removeEventListener("keydown", handleFollowUpKeyDown);
    }
  }, [phase, handleFollowUpKeyDown]);

  // ── Keyboard navigation: quick check ──
  const handleQuickCheckKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const current = pendingQuestions[quickCheckIndex];
      if (phase !== "quick_check" || !current?.chips) return;
      const chipCount = current.chips.length;
      const num = parseInt(e.key);
      if (num >= 1 && num <= chipCount) {
        e.preventDefault();
        handleQuickCheckRespond(current.chips[num - 1]!, "chip", current.chips[num - 1]);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setQuickCheckHighlight((h) => (h <= 0 ? chipCount - 1 : h - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setQuickCheckHighlight((h) => (h >= chipCount - 1 ? 0 : h + 1));
      } else if (e.key === "Enter" && quickCheckHighlight >= 0 && !quickCheckFreeText) {
        e.preventDefault();
        handleQuickCheckRespond(current.chips[quickCheckHighlight]!, "chip", current.chips[quickCheckHighlight]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, pendingQuestions, quickCheckIndex, quickCheckHighlight, quickCheckFreeText]
  );

  useEffect(() => {
    if (phase === "quick_check") {
      window.addEventListener("keydown", handleQuickCheckKeyDown);
      return () => window.removeEventListener("keydown", handleQuickCheckKeyDown);
    }
  }, [phase, handleQuickCheckKeyDown]);

  const currentQuickCheck = pendingQuestions[quickCheckIndex];

  // ── Conversation active states ──
  const isConversationActive =
    phase === "submitting" ||
    phase === "follow_up" ||
    phase === "follow_up_submitting" ||
    phase === "giveback";

  const isQuickCheckActive =
    phase === "quick_check" ||
    phase === "quick_check_submitting" ||
    phase === "quick_check_giveback";

  const isAgentActionActive =
    phase === "call_prep_loading" ||
    phase === "call_prep_result" ||
    phase === "draft_loading" ||
    phase === "draft_result";

  // ── RENDER: Observation conversation ──
  if (isConversationActive) {
    return (
      <div className="sticky bottom-0 z-30">
        <div
          className="border-t"
          style={{
            borderColor: "rgba(0,0,0,0.06)",
            background: "rgba(253,250,247,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-[600px] mx-auto px-4 py-4 flex flex-col gap-4">
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
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[14px] leading-[1.55]" style={{ color: "#3D3833" }}>
                    {followUp.question}
                  </p>
                </div>
                <div className="mx-5" style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />
                {followUp.chips && followUp.chips.length > 0 && (
                  <div className="px-2 pt-2 pb-1">
                    {followUp.chips.map((chip, i) => (
                      <button
                        key={chip}
                        onClick={() => handleFollowUpSubmit(chip, "chip", chip)}
                        onMouseEnter={() => setHighlightedOption(i)}
                        onMouseLeave={() => setHighlightedOption(-1)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150"
                        style={{ background: highlightedOption === i ? "#F3EDE7" : "transparent" }}
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
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    ref={followUpRef}
                    type="text"
                    value={followUpInput}
                    onChange={(e) => { setFollowUpInput(e.target.value); setHighlightedOption(-1); }}
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
                    onClick={() => { if (followUpInput.trim()) handleFollowUpSubmit(followUpInput, "text"); }}
                    className="transition-all duration-200"
                    style={{
                      width: "28px", height: "28px", borderRadius: "8px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: followUpInput.trim() ? "#E07A5F" : "transparent",
                      opacity: followUpInput.trim() ? 1 : 0,
                      pointerEvents: followUpInput.trim() ? "auto" : "none",
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
                <div className="px-5 pb-2.5">
                  <p className="text-[11px]" style={{ color: "rgba(138,128,120,0.5)" }}>
                    ↑↓ navigate · 1-{followUp.chips?.length || 0} select · enter confirm
                  </p>
                </div>
              </div>
            )}

            {phase === "follow_up_submitting" && (
              <>
                {followUpResponseText && (
                  <div className="flex justify-end animate-[fadeSlideUp_0.25s_ease]">
                    <div
                      className="max-w-[85%] px-3.5 py-2 text-[13px] leading-[1.55]"
                      style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "14px 14px 4px 14px" }}
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
                  <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>Processing…</span>
                </div>
              </>
            )}

            {phase === "giveback" && giveback && (
              <>
                {followUpResponseText && (
                  <div className="flex justify-end animate-[fadeSlideUp_0.25s_ease]">
                    <div
                      className="max-w-[85%] px-3.5 py-2 text-[13px] leading-[1.55]"
                      style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "14px 14px 4px 14px" }}
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
                  <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
                    <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>Nexus Intelligence</span>
                    <button onClick={reset} className="ml-auto p-0.5 transition-colors hover:opacity-70" style={{ color: "#8A8078" }}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="px-[18px] py-3.5 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)" }}>
                        <Check className="h-3 w-3" style={{ color: "#E07A5F" }} />
                      </div>
                      <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{giveback.acknowledgment}</p>
                    </div>
                    {giveback.related_observations_hint && (
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)" }}>
                          <Users className="h-3 w-3" style={{ color: "#E07A5F" }} />
                        </div>
                        <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{giveback.related_observations_hint}</p>
                      </div>
                    )}
                    {giveback.arr_impact && giveback.arr_impact.total_value > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center shrink-0 mt-0.5 text-[11px]" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)", color: "#E07A5F" }}>€</div>
                        <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>
                          Pipeline impact: €{(giveback.arr_impact.total_value / 1000).toFixed(0)}K across {giveback.arr_impact.deal_count} deal{giveback.arr_impact.deal_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                    {giveback.routing && (
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)" }}>
                          <ArrowRight className="h-3 w-3" style={{ color: "#E07A5F" }} />
                        </div>
                        <p className="text-[13.5px] leading-[1.5]" style={{ color: "#8A8078" }}>{giveback.routing}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {phase === "giveback" && (
            <div className="max-w-4xl mx-auto px-4 pb-2.5 pt-0 opacity-40 pointer-events-none">
              <div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border" style={{ borderColor: "#E8E5E0" }}>
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#9B9B9B" }} />
                <span className="text-sm flex-1" style={{ color: "#9B9B9B" }}>{defaultPlaceholder}</span>
                <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "#9B9B9B" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Quick check ──
  if (isQuickCheckActive && currentQuickCheck) {
    return (
      <div className="sticky bottom-0 z-30">
        <div
          className="border-t"
          style={{
            borderColor: "rgba(0,0,0,0.06)",
            background: "rgba(253,250,247,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="max-w-[600px] mx-auto px-4 py-4">
            {/* Submitting */}
            {phase === "quick_check_submitting" && (
              <div className="flex items-center gap-2.5 animate-[fadeSlideUp_0.3s_ease]">
                <span className="h-4 w-4 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }} />
                <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>Processing…</span>
              </div>
            )}

            {/* Giveback */}
            {phase === "quick_check_giveback" && quickCheckGiveBack && (
              <div
                className="animate-[fadeSlideUp_0.4s_ease]"
                style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
              >
                <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
                  <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>Nexus Intelligence</span>
                  <button onClick={advanceQuickCheck} className="ml-auto p-0.5 hover:opacity-70" style={{ color: "#8A8078" }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="px-[18px] py-3.5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)" }}>
                      <Check className="h-3 w-3" style={{ color: "#E07A5F" }} />
                    </div>
                    <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>Got it — {quickCheckDealName} updated.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)" }}>
                      <Lightbulb className="h-3 w-3" style={{ color: "#E07A5F" }} />
                    </div>
                    <p className="text-[13.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{quickCheckGiveBack.insight}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center shrink-0 mt-0.5" style={{ width: "22px", height: "22px", borderRadius: "6px", background: "rgba(224,122,95,0.08)" }}>
                      <ArrowRight className="h-3 w-3" style={{ color: "#E07A5F" }} />
                    </div>
                    <p className="text-[13.5px] leading-[1.5]" style={{ color: "#8A8078" }}>Updated: deal record, account profile, team intel</p>
                  </div>
                </div>
              </div>
            )}

            {/* Question card */}
            {phase === "quick_check" && (
              <div
                className="animate-[fadeSlideUp_0.35s_ease]"
                style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
              >
                <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
                  <span className="text-[13px] font-medium tracking-[0.01em]" style={{ color: "#3D3833" }}>Quick check from Nexus Intelligence</span>
                  {pendingQuestions.length > 1 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full ml-1" style={{ background: "#F3EDE7", color: "#8A8078" }}>
                      {quickCheckIndex + 1} of {pendingQuestions.length}
                    </span>
                  )}
                  <button onClick={handleQuickCheckDismiss} className="ml-auto p-0.5 hover:opacity-70" style={{ color: "#8A8078" }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[14px] leading-[1.55]" style={{ color: "#3D3833" }}>{currentQuickCheck.questionText}</p>
                </div>
                <div className="mx-5" style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />
                {currentQuickCheck.chips && currentQuickCheck.chips.length > 0 && (
                  <div className="px-2 pt-2 pb-1">
                    {currentQuickCheck.chips.map((chip, i) => (
                      <button
                        key={chip}
                        onClick={() => handleQuickCheckRespond(chip, "chip", chip)}
                        onMouseEnter={() => setQuickCheckHighlight(i)}
                        onMouseLeave={() => setQuickCheckHighlight(-1)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150"
                        style={{ background: quickCheckHighlight === i ? "#F3EDE7" : "transparent" }}
                      >
                        <span
                          className="flex items-center justify-center shrink-0 text-[12px] font-semibold transition-all duration-150"
                          style={{
                            width: "24px", height: "24px", borderRadius: "6px",
                            border: `1.5px solid ${quickCheckHighlight === i ? "#E07A5F" : "#D4C9BD"}`,
                            color: quickCheckHighlight === i ? "#E07A5F" : "#8A8078",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-[14px] flex-1 text-left" style={{ color: "#3D3833" }}>{chip}</span>
                        {quickCheckHighlight === i && (
                          <CornerDownLeft className="h-3 w-3 shrink-0" style={{ color: "rgba(138,128,120,0.6)" }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mx-5" style={{ height: "1px", background: "rgba(0,0,0,0.06)" }} />
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="text"
                    value={quickCheckFreeText}
                    onChange={(e) => { setQuickCheckFreeText(e.target.value); setQuickCheckHighlight(-1); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && quickCheckFreeText.trim()) {
                        e.stopPropagation();
                        handleQuickCheckRespond(quickCheckFreeText, "text");
                      }
                    }}
                    placeholder="Or tell us more…"
                    className="flex-1 bg-transparent border-none outline-none text-[13px] placeholder:text-[#8A8078]/60"
                    style={{ color: "#3D3833" }}
                  />
                  <button
                    onClick={() => { if (quickCheckFreeText.trim()) handleQuickCheckRespond(quickCheckFreeText, "text"); }}
                    className="transition-all duration-200"
                    style={{
                      width: "28px", height: "28px", borderRadius: "8px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: quickCheckFreeText.trim() ? "#E07A5F" : "transparent",
                      opacity: quickCheckFreeText.trim() ? 1 : 0,
                      pointerEvents: quickCheckFreeText.trim() ? "auto" : "none",
                    }}
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
                <div className="px-5 pb-2.5">
                  <p className="text-[11px]" style={{ color: "rgba(138,128,120,0.5)" }}>
                    ↑↓ navigate · 1-{currentQuickCheck.chips?.length || 0} select · enter confirm
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Agent action (call prep / draft email) ──
  if (isAgentActionActive) {
    return (
      <div className="sticky bottom-0 z-30">
        <div
          className="border-t"
          style={{
            borderColor: "rgba(0,0,0,0.06)",
            background: "rgba(253,250,247,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            className="max-w-[680px] mx-auto px-4 py-4"
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
            {/* User message bubble */}
            {submittedText && (
              <div className="flex justify-end mb-4 animate-[fadeSlideUp_0.3s_ease]">
                <div
                  className="max-w-[85%] px-4 py-2.5 text-[14px] leading-[1.55]"
                  style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "16px 16px 4px 16px" }}
                >
                  {submittedText}
                </div>
              </div>
            )}

            {/* Loading */}
            {(phase === "call_prep_loading" || phase === "draft_loading") && (
              <div className="flex items-center gap-2.5 animate-[fadeSlideUp_0.25s_ease]">
                <span className="h-4 w-4 rounded-full border-2 animate-spin shrink-0" style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }} />
                <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>
                  {phase === "call_prep_loading" ? "Preparing your call brief…" : "Drafting your email…"}
                </span>
              </div>
            )}

            {/* Call Prep Brief */}
            {phase === "call_prep_result" && callBrief && (
              <div
                className="animate-[fadeSlideUp_0.4s_ease]"
                style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
                  <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>
                    Call Brief{callBriefDealName ? ` — ${callBriefDealName}` : ""}
                  </span>
                  <button onClick={reset} className="ml-auto p-0.5 hover:opacity-70" style={{ color: "#8A8078" }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Headline */}
                <div
                  className="px-5 py-4"
                  style={{ borderLeft: "3px solid #E07A5F", margin: "0 12px 0 12px", borderRadius: "0 8px 8px 0", background: "rgba(224,122,95,0.04)", marginTop: "12px" }}
                >
                  <p className="text-[14px] font-medium leading-[1.5]" style={{ color: "#3D3833" }}>
                    {callBrief.headline}
                  </p>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Deal Snapshot */}
                  <CollapsibleSection title="Deal Snapshot">
                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      <span className="text-[13px]" style={{ color: "#3D3833" }}>{callBrief.deal_snapshot.stage}</span>
                      <span className="text-[13px] font-semibold" style={{ color: "#3D3833" }}>{callBrief.deal_snapshot.value}</span>
                      <span className="text-[13px]" style={{ color: "#8A8078" }}>{callBrief.deal_snapshot.days_in_stage}</span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: callBrief.deal_snapshot.health === "on_track" ? "rgba(45,138,78,0.1)" : callBrief.deal_snapshot.health === "at_risk" ? "rgba(212,168,67,0.1)" : "rgba(199,75,59,0.1)",
                          color: callBrief.deal_snapshot.health === "on_track" ? "#2D8A4E" : callBrief.deal_snapshot.health === "at_risk" ? "#D4A843" : "#C74B3B",
                        }}
                      >
                        {callBrief.deal_snapshot.health.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-[12px] mt-1.5" style={{ color: "#8A8078" }}>{callBrief.deal_snapshot.health_reason}</p>
                  </CollapsibleSection>

                  {/* Stakeholders */}
                  {callBrief.stakeholders_in_play.length > 0 && (
                    <CollapsibleSection title="Stakeholders">
                      <div className="space-y-2 mt-1">
                        {callBrief.stakeholders_in_play.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div
                              className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold"
                              style={{
                                background: s.engagement === "hot" ? "rgba(224,122,95,0.12)" : s.engagement === "warm" ? "rgba(212,168,67,0.12)" : "rgba(107,107,107,0.1)",
                                color: s.engagement === "hot" ? "#E07A5F" : s.engagement === "warm" ? "#D4A843" : "#6B6B6B",
                              }}
                            >
                              {s.name.split(" ").map((n: string) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>
                                {s.name}
                                <span className="font-normal ml-1" style={{ color: "#8A8078" }}>· {s.role}</span>
                              </p>
                              <p className="text-[12px]" style={{ color: "#8A8078" }}>{s.title}{s.last_contact ? ` · ${s.last_contact}` : ""}</p>
                              {s.notes && <p className="text-[12px] mt-0.5" style={{ color: "#6B6B6B" }}>{s.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Talking Points */}
                  {callBrief.talking_points.length > 0 && (
                    <CollapsibleSection title="Talking Points">
                      <div className="space-y-2.5 mt-1">
                        {callBrief.talking_points.map((tp, i) => (
                          <div key={i} className="flex gap-2.5">
                            <span className="text-[12px] font-semibold shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>{i + 1}.</span>
                            <div>
                              <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{tp.topic}</p>
                              <p className="text-[12px]" style={{ color: "#8A8078" }}>{tp.approach}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Questions to Ask */}
                  {callBrief.questions_to_ask.length > 0 && (
                    <CollapsibleSection title="Questions to Ask">
                      <div className="space-y-2.5 mt-1">
                        {callBrief.questions_to_ask.map((q, i) => (
                          <div key={i} className="flex gap-2.5">
                            <span className="text-[12px] font-semibold shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>{i + 1}.</span>
                            <div>
                              <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>"{q.question}"</p>
                              <p className="text-[12px]" style={{ color: "#8A8078" }}>
                                {q.purpose}
                                {q.meddpicc_gap && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "rgba(12,116,137,0.1)", color: "#0C7489" }}>
                                    → {q.meddpicc_gap}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Risks */}
                  {callBrief.risks_and_landmines.length > 0 && (
                    <CollapsibleSection title="⚠ Risks">
                      <div className="space-y-2 mt-1">
                        {callBrief.risks_and_landmines.map((r, i) => (
                          <div key={i} className="rounded-lg p-3" style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.2)" }}>
                            <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{r.risk}</p>
                            <p className="text-[12px] mt-0.5" style={{ color: "#8A8078" }}>{r.mitigation}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Team Intelligence */}
                  {callBrief.team_intelligence.length > 0 && (
                    <CollapsibleSection title="💡 Team Intelligence">
                      <div className="space-y-1.5 mt-1">
                        {callBrief.team_intelligence.map((intel, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>·</span>
                            <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{intel}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Competitive Context */}
                  {callBrief.competitive_context && (
                    <div className="rounded-lg p-3" style={{ background: "rgba(199,75,59,0.05)", border: "1px solid rgba(199,75,59,0.15)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: "#C74B3B" }}>Competitive</p>
                      <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{callBrief.competitive_context}</p>
                    </div>
                  )}

                  {/* Next Steps */}
                  {callBrief.suggested_next_steps.length > 0 && (
                    <CollapsibleSection title="Suggested Close">
                      <div className="space-y-1 mt-1">
                        {callBrief.suggested_next_steps.map((step, i) => (
                          <div key={i} className="flex gap-2">
                            <Check className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#2D8A4E" }} />
                            <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{step}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
                >
                  <button
                    onClick={() => copyToClipboard(
                      `CALL BRIEF — ${callBriefDealName}\n\n${callBrief.headline}\n\nTalking Points:\n${callBrief.talking_points.map((tp, i) => `${i + 1}. ${tp.topic}: ${tp.approach}`).join("\n")}\n\nQuestions:\n${callBrief.questions_to_ask.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`,
                      "brief"
                    )}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      background: copyFeedback === "brief" ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                      color: copyFeedback === "brief" ? "#2D8A4E" : "#8A8078",
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === "brief" ? "Copied!" : "Copy brief"}
                  </button>
                  {callBriefDealId && (
                    <button
                      onClick={() => saveToDeals(
                        `AI Call Prep — ${callBriefDealName}`,
                        `Call brief generated. Key focus: ${callBrief.headline}`,
                        callBriefDealId,
                        "brief"
                      )}
                      disabled={saveFeedback === "brief"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                      style={{
                        background: saveFeedback === "brief" ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                        color: saveFeedback === "brief" ? "#2D8A4E" : "#8A8078",
                      }}
                    >
                      <Check className="h-3 w-3" />
                      {saveFeedback === "brief" ? "Saved ✓" : "Save to deal"}
                    </button>
                  )}
                  <button
                    onClick={reset}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors"
                    style={{ color: "#8A8078" }}
                  >
                    <X className="h-3 w-3" />
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Email Draft */}
            {phase === "draft_result" && emailDraft && (
              <div
                className="animate-[fadeSlideUp_0.4s_ease]"
                style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <Mail className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
                  <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>
                    Draft Email{emailContactName ? ` — ${emailContactName}` : ""}
                  </span>
                  <button onClick={reset} className="ml-auto p-0.5 hover:opacity-70" style={{ color: "#8A8078" }}>
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="px-5 pt-4 pb-3 space-y-3">
                  {/* To */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-14 shrink-0" style={{ color: "#8A8078" }}>To</span>
                    <span className="text-[13px]" style={{ color: "#3D3833" }}>{emailDraft.to}</span>
                  </div>
                  <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />

                  {/* Subject — editable */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-14 shrink-0" style={{ color: "#8A8078" }}>Subject</span>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none text-[13px]"
                      style={{ color: "#3D3833" }}
                    />
                  </div>
                  <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />

                  {/* Body — editable */}
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    rows={8}
                    className="w-full bg-transparent border-none outline-none text-[13px] leading-[1.6] resize-none"
                    style={{ color: "#3D3833" }}
                  />
                </div>

                {/* Notes for rep */}
                {emailDraft.notes_for_rep && (
                  <div
                    className="mx-5 mb-3 px-3 py-2 rounded-lg flex items-start gap-2"
                    style={{ background: "rgba(224,122,95,0.05)", border: "1px solid rgba(224,122,95,0.15)" }}
                  >
                    <Lightbulb className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#E07A5F" }} />
                    <p className="text-[11.5px] leading-[1.5]" style={{ color: "#8A8078" }}>{emailDraft.notes_for_rep}</p>
                  </div>
                )}

                {/* Context input for regeneration */}
                <div className="mx-5 mb-3">
                  <input
                    type="text"
                    value={emailContext}
                    onChange={(e) => setEmailContext(e.target.value)}
                    placeholder="e.g., mention the security review Tuesday, include the ROI calculator, softer tone..."
                    className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
                    style={{ background: "#F9F7F4", border: "1px solid rgba(0,0,0,0.06)", color: "#3D3833" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && emailContext.trim()) {
                        setPhase("draft_loading");
                        const dealId = emailDealId || context.dealId;
                        fetch("/api/agent/draft-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: "follow_up",
                            memberId: currentUser?.id,
                            rawQuery: submittedText,
                            dealId,
                            additionalContext: emailContext.trim(),
                          }),
                        }).then(async (res) => {
                          if (res.ok) {
                            const data = await res.json();
                            setEmailDraft(data.draft);
                            setEditedSubject(data.draft.subject);
                            setEditedBody(data.draft.body);
                            setEmailContext("");
                            setSaveFeedback(null);
                          }
                          setPhase("draft_result");
                        }).catch(() => setPhase("draft_result"));
                      }
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <button
                    onClick={() => copyToClipboard(`Subject: ${editedSubject}\n\n${editedBody}`, "email")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      background: copyFeedback === "email" ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                      color: copyFeedback === "email" ? "#2D8A4E" : "#8A8078",
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    {copyFeedback === "email" ? "Copied!" : "Copy email"}
                  </button>
                  <button
                    onClick={async () => {
                      const dealId = emailDealId || context.dealId;
                      if (dealId) {
                        await saveToDeals(
                          `Follow-up email drafted${emailContactName ? ` for ${emailContactName}` : ""}`,
                          `Subject: ${editedSubject}`,
                          dealId,
                          "email"
                        );
                      }
                    }}
                    disabled={saveFeedback === "email"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      background: saveFeedback === "email" ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                      color: saveFeedback === "email" ? "#2D8A4E" : "#8A8078",
                    }}
                  >
                    <Check className="h-3 w-3" />
                    {saveFeedback === "email" ? "Saved ✓" : "Save to deal"}
                  </button>
                  <button
                    onClick={async () => {
                      setPhase("draft_loading");
                      setSaveFeedback(null);
                      const dealId = emailDealId || context.dealId;
                      const extraCtx = emailContext.trim() || undefined;
                      try {
                        const res = await fetch("/api/agent/draft-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: "follow_up",
                            memberId: currentUser?.id,
                            rawQuery: submittedText,
                            dealId,
                            additionalContext: extraCtx,
                          }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setEmailDraft(data.draft);
                          setEditedSubject(data.draft.subject);
                          setEditedBody(data.draft.body);
                          setEmailContext("");
                        }
                        setPhase("draft_result");
                      } catch {
                        setPhase("draft_result");
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ background: "#F3EDE7", color: "#8A8078" }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {emailContext.trim() ? "Regenerate with context" : "Regenerate"}
                  </button>
                  <button onClick={reset} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors" style={{ color: "#8A8078" }}>
                    <X className="h-3 w-3" />
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dimmed bar below the result */}
          {(phase === "call_prep_result" || phase === "draft_result") && (
            <div className="max-w-4xl mx-auto px-4 pb-2.5 pt-0 opacity-40 pointer-events-none">
              <div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border" style={{ borderColor: "#E8E5E0" }}>
                <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#9B9B9B" }} />
                <span className="text-sm flex-1" style={{ color: "#9B9B9B" }}>{defaultPlaceholder}</span>
                <ChevronUp className="h-3.5 w-3.5 shrink-0" style={{ color: "#9B9B9B" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Expanded ──
  if (phase === "expanded") {
    return (
      <div
        className="sticky bottom-0 z-30 border-t"
        style={{
          borderColor: "rgba(0,0,0,0.06)",
          background: "rgba(253,250,247,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-4xl mx-auto p-4 space-y-3 animate-[fadeSlideUp_0.3s_ease]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "#E07A5F" }} />
              <span className="text-xs font-medium" style={{ color: "#3D3833" }}>Ask Nexus</span>
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
            placeholder="Share an observation, prep a call, or draft an email — AI routes to the right action."
            rows={3}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
            style={{ border: "1px solid #E8E5E0", background: "#FFFFFF", color: "#3D3833" }}
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
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(12,116,137,0.08)", color: "#0C7489" }}>
                observe · prep · draft
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                input.trim() ? "text-white hover:opacity-90" : "cursor-not-allowed"
              )}
              style={{
                background: input.trim() ? "#E07A5F" : "#D4C9BD",
                color: input.trim() ? "#FFFFFF" : "#8A8078",
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Collapsed ──
  const hasPendingChecks = isAE && pendingQuestions.length > 0;

  return (
    <div
      className="sticky bottom-0 z-30 border-t"
      style={{
        borderColor: "rgba(0,0,0,0.06)",
        background: "rgba(253,250,247,0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-2.5">
        <button
          onClick={() =>
            hasPendingChecks ? setPhase("quick_check") : setPhase("expanded")
          }
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
          <Sparkles
            className="h-4 w-4 shrink-0 transition-colors duration-200"
            style={{ color: hasPendingChecks ? "#E07A5F" : "#D4C9BD" }}
          />
          {hasPendingChecks ? (
            <>
              <span className="text-sm flex-1 font-medium transition-colors duration-200" style={{ color: "#3D3833" }}>
                {pendingQuestions.length} quick check{pendingQuestions.length > 1 ? "s" : ""} waiting
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full mr-1 font-medium"
                style={{ background: "rgba(224,122,95,0.1)", color: "#E07A5F" }}
              >
                View
              </span>
            </>
          ) : (
            <span className="text-sm flex-1 transition-colors duration-200 text-[#8A8078] group-hover:text-[#3D3833]">
              {defaultPlaceholder}
            </span>
          )}
          <ChevronUp
            className="h-3.5 w-3.5 shrink-0 transition-colors duration-200"
            style={{ color: hasPendingChecks ? "#E07A5F" : "#D4C9BD" }}
          />
        </button>
      </div>
    </div>
  );
}

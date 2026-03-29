"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, Send } from "lucide-react";
import { usePersona } from "@/components/providers";

// ── Step definitions ────────────────────────────────────────────────────────────

interface StepConfig {
  route: string | null;
  title: string;
  body: string;
  highlightSelector: string | null;
  buttonText: string;
  personaSwitch?: string;
  autoAdvanceOnClick?: boolean;
  subStep?: {
    waitForSelector: string;
    title: string;
    body: string;
    highlightSelector: string | null;
    buttonText: string;
    nextRoute: string | null;
  };
}

const MEDVISTA_DEAL_ID = "c0069b95-02dc-46db-bd04-aac69099ecfb";
const TOTAL_STEPS = 6;

function setTourStepStorage(value: string) {
  try {
    localStorage.setItem("nexus_demo_step", value);
    window.dispatchEvent(new Event("nexus-tour-update"));
  } catch {}
}

const STEPS: StepConfig[] = [
  {
    route: "/pipeline",
    title: "Click into MedVista Health Systems",
    body: "This is Sarah\u2019s biggest deal in negotiation \u2014 \u20ac2.4M. The deal workspace shows everything the AI knows: MEDDPICC gaps, stakeholder engagement, transcript analyses, and AI actions \u2014 all in one place.",
    highlightSelector: "[data-tour='deal-medvista']",
    buttonText: "Next",
    autoAdvanceOnClick: true,
  },
  {
    route: `/pipeline/${MEDVISTA_DEAL_ID}`,
    title: 'Click "Prep Call" to generate a brief',
    body: "The AI pulls from 7 intelligence layers \u2014 her SA\u2019s compliance expertise, manager pricing directives, competitive patterns from closed deals, MEDDPICC gap warnings, transcript analyses, field observations, and team resources. Watch what a 30-second prep looks like.",
    highlightSelector: "[data-tour='prep-call']",
    buttonText: "Next",
    subStep: {
      waitForSelector: "[data-tour='call-brief']",
      title: "Look at what just happened",
      body: "Notice the Team Intelligence section \u2014 Alex Kim\u2019s compliance expertise was injected automatically. The Manager Directives section enforces Marcus\u2019s pricing constraints. The MEDDPICC Questions map to scoring gaps on this deal. Every section pulls from a different intelligence layer.",
      highlightSelector: "[data-tour='call-brief']",
      buttonText: "Next: Share Field Intel",
      nextRoute: "/pipeline",
    },
  },
  {
    route: "/pipeline",
    title: "Share an observation",
    body: "Type something in the bar below \u2014 try: \u201csecurity reviews are adding 3 weeks to every enterprise deal\u201d \u2014 and watch what happens. The AI classifies it, may ask a follow-up, clusters it with similar reports, and gives you something useful back.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next: VP View",
  },
  {
    route: "/intelligence",
    personaSwitch: "Marcus Thompson",
    title: "Now you\u2019re Marcus Thompson, VP of Sales",
    body: "Everything your team shared is structured here \u2014 patterns with ARR impact, severity levels, field voices, and suggested actions. Each cluster is intelligence that would normally be scattered across Slack and 1:1s. Click \u201cAsk about what you\u2019re seeing\u201d to query your team \u2014 the system answers from existing data or sends targeted questions to the right AEs.",
    highlightSelector: "[data-tour='ask-input']",
    buttonText: "Next",
  },
  {
    route: "/pipeline",
    personaSwitch: "Sarah Chen",
    title: "Sarah just got a quick check",
    body: "The question Marcus asked was turned into a deal-specific quick check for Sarah. Look for the \u201c\u2726 Quick check waiting\u201d badge in the agent bar at the bottom. This is how intelligence flows bidirectionally \u2014 VP asks, system routes to the right AE, AE answers with one tap, VP gets the aggregated answer.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next",
  },
  {
    route: null,
    title: "The system compounds",
    body: "Every action makes every other action smarter. Sarah\u2019s observation from Step 3 is already part of a cluster. Her next call prep will include it. When a deal closes, the AI pre-populates the loss analysis from everything the system captured. The team\u2019s collective intelligence grows with every interaction, without anyone doing extra work.",
    highlightSelector: null,
    buttonText: "Explore on your own",
  },
];

// ── Contextual hints ────────────────────────────────────────────────────────────

function getContextualHint(pathname: string, persona: string): string | null {
  if (pathname === "/pipeline") return "Try: Click into MedVista to explore the deal workspace";
  if (pathname.startsWith("/pipeline/")) return 'Try: Click "Prep Call" to see 7 intelligence layers converge';
  if (pathname === "/intelligence" && persona === "Marcus Thompson") return 'Try: Check the Patterns tab, then explore Field Feed and Close Intelligence';
  if (pathname === "/intelligence") return "Try: Switch to Marcus Thompson to see directives and field queries";
  if (pathname === "/agent-config") return 'Try: Type "Never mention competitor pricing" to configure the agent';
  if (pathname === "/outreach") return "Try: Check the Intelligence Brief at the top for messaging guidance";
  if (pathname === "/command-center") return "Try: Click Pipeline to see the deal board";
  return null;
}

// ── Chat message type ───────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function DemoGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const { allUsers, setCurrentUser, personaName, currentUser } = usePersona();

  // Tour state
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [inSubStep, setInSubStep] = useState(false);
  const [visible, setVisible] = useState(false);
  const subStepObserverRef = useRef<MutationObserver | null>(null);

  // Assistant state
  const [assistantMode, setAssistantMode] = useState(false);
  const [assistantDismissed, setAssistantDismissed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ── Initialize from localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexus_demo_step");
      if (saved) {
        const n = parseInt(saved, 10);
        if (n >= 1 && n <= TOTAL_STEPS) {
          setStep(n);
          setDismissed(false);
        } else if (saved === "done") {
          setAssistantMode(true);
        }
      }
    } catch {}
  }, []);

  // ── Entrance animation ──
  useEffect(() => {
    if (step >= 1 && step <= TOTAL_STEPS && !dismissed) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [step, dismissed]);

  // ── Auto-scroll chat ──
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  // ── Highlight management ──
  const applyHighlight = useCallback((selector: string | null) => {
    document.querySelectorAll(".demo-highlight").forEach((el) => {
      el.classList.remove("demo-highlight");
    });
    if (!selector) return;
    let attempts = 0;
    const tryHighlight = () => {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.add("demo-highlight");
        try {
          let parent = el.parentElement;
          while (parent) {
            const style = getComputedStyle(parent);
            if (style.overflowX === "auto" || style.overflowX === "scroll") {
              const elRect = el.getBoundingClientRect();
              const parentRect = parent.getBoundingClientRect();
              if (elRect.left < parentRect.left || elRect.right > parentRect.right) {
                parent.scrollLeft += elRect.left - parentRect.left - (parentRect.width / 2 - elRect.width / 2);
              }
              break;
            }
            parent = parent.parentElement;
          }
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch {}
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryHighlight, 500);
      }
    };
    tryHighlight();
  }, []);

  const removeHighlight = useCallback(() => {
    document.querySelectorAll(".demo-highlight").forEach((el) => {
      el.classList.remove("demo-highlight");
    });
  }, []);

  // ── Apply highlight when step or pathname changes ──
  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS || dismissed) {
      removeHighlight();
      return;
    }
    const config = STEPS[step - 1]!;
    if (config.route && pathname !== config.route) return;
    const selector = inSubStep && config.subStep ? config.subStep.highlightSelector : config.highlightSelector;
    const t = setTimeout(() => applyHighlight(selector), 600);
    return () => clearTimeout(t);
  }, [step, pathname, dismissed, inSubStep, applyHighlight, removeHighlight]);

  // ── Watch for sub-step trigger ──
  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS || dismissed || inSubStep) return;
    const config = STEPS[step - 1]!;
    if (!config.subStep) return;
    const waitSelector = config.subStep.waitForSelector;
    if (document.querySelector(waitSelector)) { setInSubStep(true); return; }
    const observer = new MutationObserver(() => {
      if (document.querySelector(waitSelector)) { setInSubStep(true); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    subStepObserverRef.current = observer;
    return () => observer.disconnect();
  }, [step, dismissed, inSubStep]);

  // ── Auto-advance on click ──
  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS || dismissed) return;
    const config = STEPS[step - 1]!;
    if (!config.autoAdvanceOnClick || !config.highlightSelector) return;
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const highlighted = document.querySelector(config.highlightSelector!);
      if (highlighted && (highlighted === target || highlighted.contains(target))) {
        setTimeout(() => advanceStep(), 500);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, dismissed]);

  // ── Step navigation ──
  const advanceStep = useCallback(() => {
    removeHighlight();
    setInSubStep(false);
    if (subStepObserverRef.current) { subStepObserverRef.current.disconnect(); subStepObserverRef.current = null; }
    const nextStep = step + 1;
    if (nextStep > TOTAL_STEPS) {
      setStep(0);
      setDismissed(false);
      setAssistantMode(true);
      setTourStepStorage("done");
      return;
    }
    const config = STEPS[nextStep - 1]!;
    if (config.personaSwitch) {
      const user = allUsers.find((u) => u.name === config.personaSwitch);
      if (user) setCurrentUser(user);
    }
    if (config.route && pathname !== config.route) router.push(config.route);
    setStep(nextStep);
    setTourStepStorage(String(nextStep));
  }, [step, pathname, allUsers, setCurrentUser, router, removeHighlight]);

  const handleNext = useCallback(() => {
    const config = STEPS[step - 1]!;
    if (inSubStep && config.subStep?.nextRoute) {
      removeHighlight();
      setInSubStep(false);
      router.push(config.subStep.nextRoute);
      const nextStep = step + 1;
      const nextConfig = STEPS[nextStep - 1];
      if (nextConfig?.personaSwitch) {
        const user = allUsers.find((u) => u.name === nextConfig.personaSwitch);
        if (user) setCurrentUser(user);
      }
      setStep(nextStep);
      setTourStepStorage(String(nextStep));
      return;
    }
    if (step === TOTAL_STEPS) {
      removeHighlight();
      setStep(0);
      setAssistantMode(true);
      setTourStepStorage("done");
      return;
    }
    advanceStep();
  }, [step, inSubStep, advanceStep, removeHighlight, router, allUsers, setCurrentUser]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setAssistantMode(true);
    removeHighlight();
  }, [removeHighlight]);

  // ── Chat ──
  async function handleAsk() {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/demo/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          currentPage: pathname,
          currentPersona: currentUser?.name || "Sarah Chen",
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I couldn\u2019t process that." }]);
    }
    setChatLoading(false);
  }

  // ── Render: Assistant mode ──
  if (assistantMode && !assistantDismissed && step === 0) {
    const hint = getContextualHint(pathname, personaName);

    return (
      <div
        className="fixed z-[9999]"
        style={{ bottom: 24, left: 24 }}
      >
        <div
          style={{
            background: "#3D3833",
            color: "#FFFFFF",
            width: 360,
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            fontFamily: "'DM Sans', sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{ padding: "14px 16px 10px" }}
          >
            <span className="text-[12px] font-semibold tracking-[0.05em]" style={{ color: "rgba(255,255,255,0.6)" }}>
              <span style={{ color: "#E07A5F" }}>{"\u2726"} </span>
              Nexus Assistant
            </span>
            <button
              onClick={() => setAssistantDismissed(true)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
          </div>

          {/* Contextual hint */}
          {hint && (
            <div style={{ padding: "0 16px 8px" }}>
              <div
                className="flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <span style={{ color: "#E07A5F", flexShrink: 0 }}>{"\u2726"}</span>
                {hint}
              </div>
            </div>
          )}

          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div
              ref={chatScrollRef}
              style={{
                maxHeight: 200,
                overflowY: "auto",
                padding: "4px 16px 8px",
              }}
            >
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "8px 12px",
                      borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                      background: msg.role === "user" ? "rgba(255,255,255,0.1)" : "transparent",
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: msg.role === "user" ? "#FFFFFF" : "rgba(255,255,255,0.85)",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: 4, padding: "8px 0" }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: "#E07A5F",
                        animation: `demo-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 16px" }} />

          {/* Input */}
          <div style={{ padding: "10px 16px 14px", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
              placeholder="Ask about how Nexus works..."
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                color: "#FFFFFF",
                padding: "8px 12px",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
              }}
            />
            {chatInput.trim() && (
              <button
                onClick={handleAsk}
                disabled={chatLoading}
                className="transition-opacity hover:opacity-80"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                <Send className="h-4 w-4" style={{ color: "#E07A5F" }} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Tour mode ──
  if (step < 1 || step > TOTAL_STEPS || dismissed) return null;

  const config = STEPS[step - 1]!;
  const displayTitle = inSubStep && config.subStep ? config.subStep.title : config.title;
  const displayBody = inSubStep && config.subStep ? config.subStep.body : config.body;
  const displayButton = inSubStep && config.subStep ? config.subStep.buttonText : config.buttonText;

  return (
    <div
      className="fixed z-[9999] transition-all duration-300"
      style={{
        bottom: 24,
        left: 24,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <div
        style={{
          background: "#3D3833",
          color: "#FFFFFF",
          maxWidth: 380,
          borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          padding: 24,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-[11px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <span style={{ color: "#E07A5F" }}>{"\u2726"} </span>
            STEP {step} OF {TOTAL_STEPS}
          </span>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        <h3 className="text-[16px] font-semibold mb-2 leading-snug">{displayTitle}</h3>

        <p className="text-[13.5px] leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.8)" }}>
          {displayBody}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: i <= step ? "#E07A5F" : "rgba(255,255,255,0.2)",
                  opacity: i < step ? 0.5 : 1,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="text-[13px] font-semibold text-white transition-colors hover:opacity-90"
            style={{
              background: "#E07A5F",
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
            }}
          >
            {displayButton} {step < TOTAL_STEPS ? "\u2192" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tour state hook ─────────────────────────────────────────────────────────────

export function useTourState() {
  const [tourStep, setTourStep] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTourStep(localStorage.getItem("nexus_demo_step"));
    } catch {}
    const handler = () => {
      try { setTourStep(localStorage.getItem("nexus_demo_step")); } catch {}
    };
    window.addEventListener("storage", handler);
    window.addEventListener("nexus-tour-update", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("nexus-tour-update", handler);
    };
  }, []);

  const isActive = tourStep !== null && tourStep !== "done" && parseInt(tourStep, 10) >= 1;
  const isComplete = tourStep === "done";

  return { tourStep, isActive, isComplete, setTourStep };
}

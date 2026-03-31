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
const TOTAL_STEPS = 8;

function setTourStepStorage(value: string) {
  try {
    localStorage.setItem("nexus_demo_step", value);
    window.dispatchEvent(new Event("nexus-tour-update"));
  } catch {}
}

const STEPS: StepConfig[] = [
  // Step 1: Start with an idea from the field
  {
    route: "/playbook",
    title: "Start with an idea from the field",
    body: "AEs share process improvements right from where they work. Type an idea like \u201cextend discovery calls to 60 minutes and build live prototypes\u201d \u2014 the system captures, classifies, and proposes it automatically.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next",
  },
  // Step 2: Leadership reviews and approves experiments
  {
    route: "/playbook",
    title: "Leadership reviews and approves experiments",
    body: "Sales leadership sees proposed ideas from the field. A manager can approve an experiment, select which AEs will test it, and set success thresholds \u2014 all without leaving the Playbook. Switch to Marcus Thompson to see the approval controls.",
    highlightSelector: null,
    buttonText: "Next",
  },
  // Step 3: Experiments run with real measurement
  {
    route: "/playbook",
    title: "Experiments run with real measurement",
    body: "Active experiments track velocity, sentiment, and close rate against a control group. Click any metric to see deal-level evidence \u2014 actual transcript excerpts and email quotes that show WHY the experiment is working.",
    highlightSelector: null,
    buttonText: "Next",
  },
  // Step 4: Proven plays scale across the org
  {
    route: "/playbook",
    title: "Proven plays scale across the org",
    body: "When experiments meet their thresholds, leadership graduates them to \u201cWhat\u2019s Working\u201d and scales the methodology \u2014 by vertical or company-wide. Every play has an attribution trail back to the rep who proposed it.",
    highlightSelector: null,
    buttonText: "Next: See a deal",
  },
  // Step 5: AI-powered call prep
  {
    route: `/pipeline/${MEDVISTA_DEAL_ID}`,
    title: "AI-powered call prep for every meeting",
    body: "Sarah\u2019s biggest deal in negotiation \u2014 \u20ac2.4M. The AI knows the full deal context: MEDDPICC gaps, stakeholder engagement, competitive landscape, and any active experiments she\u2019s testing. Type \u201cprep call\u201d in the bar below to generate a brief.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next",
  },
  // Step 6: Every deal tells a complete story
  {
    route: `/pipeline/${MEDVISTA_DEAL_ID}`,
    title: "Every deal tells a complete story",
    body: "The deal workspace surfaces everything the AI knows \u2014 stakeholder maps with engagement gaps, MEDDPICC scoring with specific warnings, sentiment trajectory over time, and the full activity history. No tab-switching between five different tools.",
    highlightSelector: null,
    buttonText: "Next: Intelligence",
  },
  // Step 7: Field intelligence connects everything
  {
    route: "/intelligence",
    title: "Field intelligence connects everything",
    body: "Every observation, experiment result, and competitive signal flows here. Filter by signal type \u2014 Competitive, Process, Content Gaps, or Playbook experiments. This is where leadership sees patterns that no single rep could see alone.",
    highlightSelector: null,
    buttonText: "Next",
  },
  // Step 8: Explore on your own
  {
    route: null,
    title: "Explore on your own",
    body: "That\u2019s the core loop: field ideas \u2192 experiments \u2192 measurement \u2192 scaling. But there\u2019s much more \u2014 agent configuration, outreach intelligence, prospect analytics. Ask the Nexus Assistant any question, or explore on your own.",
    highlightSelector: null,
    buttonText: "Got it",
  },
];

// ── Contextual hints ────────────────────────────────────────────────────────────

function getContextualHint(pathname: string, persona: string): string | null {
  if (pathname === "/playbook") return 'Try: Click "Velocity" on any experiment to see the evidence trail';
  if (pathname === "/pipeline") return "Try: Click into MedVista to explore the deal workspace";
  if (pathname.startsWith("/pipeline/")) return 'Try: Type "prep call" in the bar below to generate a brief';
  if (pathname === "/intelligence" && persona === "Marcus Thompson") return 'Try: Click the "Playbook" filter to see experiment-originated signals';
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

  const handleBack = useCallback(() => {
    if (step <= 1) return;
    removeHighlight();
    setInSubStep(false);
    const prevStep = step - 1;
    const config = STEPS[prevStep - 1]!;
    if (config.personaSwitch) {
      const user = allUsers.find((u) => u.name === config.personaSwitch);
      if (user) setCurrentUser(user);
    }
    if (config.route && pathname !== config.route) router.push(config.route);
    setStep(prevStep);
    setTourStepStorage(String(prevStep));
  }, [step, pathname, allUsers, setCurrentUser, router, removeHighlight]);

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
                  width: 6,
                  height: 6,
                  background: i <= step ? "#E07A5F" : "rgba(255,255,255,0.2)",
                  opacity: i < step ? 0.5 : 1,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="text-[12px] font-medium transition-colors hover:opacity-80"
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "8px 10px" }}
              >
                {"\u2190"} Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="text-[13px] font-semibold text-white transition-colors hover:opacity-90"
              style={{
                background: "#E07A5F",
                padding: "8px 20px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
              }}
            >
              {displayButton} {step < TOTAL_STEPS ? "\u2192" : ""}
            </button>
          </div>
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

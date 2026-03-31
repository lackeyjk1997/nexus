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
  scrollToSelector?: string;
  clickSelector?: string;
  autoAdvance?: {
    type: "route" | "element" | "mutation";
    match: string; // route prefix, element selector, or mutation target
  };
}

const MEDVISTA_DEAL_ID = "c0069b95-02dc-46db-bd04-aac69099ecfb";
const TOTAL_STEPS = 10;

function setTourStepStorage(value: string) {
  try {
    localStorage.setItem("nexus_demo_step", value);
    window.dispatchEvent(new Event("nexus-tour-update"));
  } catch {}
}

const STEPS: StepConfig[] = [
  // Step 1: Field ideas start here
  {
    route: "/playbook",
    title: "Field ideas start here",
    body: "AEs share process improvements right where they work. The agent bar captures ideas, classifies them with AI, and proposes them as experiments \u2014 all from a single sentence.\n\nTry typing: \u201cWe should build a quick prototype during every discovery call to show immediate value\u201d",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next",
    personaSwitch: "Sarah Chen",
  },
  // Step 2: Leadership reviews from the field
  {
    route: "/playbook",
    title: "Leadership reviews from the field",
    body: "Marcus sees proposed ideas from his team. He can approve experiments, select which AEs will test it, and set measurable success thresholds. Click \u2018Approve & Start Testing\u2019 to see the controls, or click Next.",
    highlightSelector: "[data-tour='approve-button']",
    buttonText: "Next",
    personaSwitch: "Marcus Thompson",
    scrollToSelector: "[data-section='proposed']",
  },
  // Step 3: Experiments run with real evidence
  {
    route: "/playbook",
    title: "Experiments run with real evidence",
    body: "Active experiments track velocity, sentiment, and close rate against a control group. Click any metric to see deal-level evidence \u2014 transcript excerpts and email quotes that show WHY it\u2019s working. Try clicking \u2018Velocity\u2019 now.",
    highlightSelector: "[data-tour='velocity-metric']",
    buttonText: "Next",
    scrollToSelector: "[data-section='testing']",
  },
  // Step 4: Scale what works
  {
    route: "/playbook",
    title: "Scale what works",
    body: "When experiments meet their thresholds with enough data, Marcus can graduate them and scale the methodology across the team \u2014 by vertical or company-wide. Click \u2018Graduate & Scale\u2019 to promote this experiment.",
    highlightSelector: "[data-tour='graduate-button']",
    buttonText: "Next",
  },
  // Step 5: Proven plays with attribution
  {
    route: "/playbook",
    title: "Proven plays with attribution",
    body: "Every proven play shows its full results \u2014 velocity improvement, sentiment lift, close rate, and the attribution trail from who proposed it to who approved it. These methodologies now influence call prep for the entire team.",
    highlightSelector: "[data-tour='proven-card']",
    buttonText: "Next: See a deal",
    clickSelector: "[data-tab='whats-working']",
  },
  // Step 6: The deal workspace
  {
    route: "/pipeline",
    title: "The deal workspace",
    body: "Sarah\u2019s biggest opportunity \u2014 MedVista Health Systems, \u20ac2.4M in Discovery. The deal workspace shows everything the AI knows. Click into MedVista to see the full context.",
    highlightSelector: "[data-tour='deal-medvista']",
    buttonText: "Next",
    personaSwitch: "Sarah Chen",
    autoAdvance: { type: "route", match: `/pipeline/${MEDVISTA_DEAL_ID}` },
  },
  // Step 7: Call prep that knows everything
  {
    route: `/pipeline/${MEDVISTA_DEAL_ID}`,
    title: "Call prep that knows everything",
    body: "Generate a call brief and watch the AI incorporate deal context, stakeholder insights, MEDDPICC gaps, competitive intel \u2014 and the proven play methodology that was just graduated. Click \u2018Prep Call\u2019 to generate.",
    highlightSelector: "[data-tour='prep-call']",
    buttonText: "Next",
    autoAdvance: { type: "element", match: "[data-tour='call-prep-result']" },
  },
  // Step 8: Intelligence from every system, in one brief
  {
    route: `/pipeline/${MEDVISTA_DEAL_ID}`,
    title: "Intelligence from every system, in one brief",
    body: "This call brief pulls from the team\u2019s proven playbook, competitive intelligence, stakeholder engagement data, MEDDPICC gaps, and insights from SCs and CSMs \u2014 all synthesized into talking points, questions to ask, and next steps specific to this deal. Look for the \ud83d\udccb Proven Play badge showing methodologies tested across 9 deals.",
    highlightSelector: "[data-tour='call-prep-result']",
    buttonText: "Next: Intelligence",
  },
  // Step 9: Field intelligence dashboard
  {
    route: "/intelligence",
    title: "Field intelligence dashboard",
    body: "Every observation, experiment result, and competitive signal flows here. Clusters group related field signals by theme with ARR impact. This is where leadership sees patterns no single rep could see alone.",
    highlightSelector: "[data-tour='all-signals']",
    buttonText: "Next",
  },
  // Step 10: Keep exploring
  {
    route: null,
    title: "Keep exploring",
    body: "That\u2019s the core loop: field ideas \u2192 experiments \u2192 evidence \u2192 scaling \u2192 deal prep. There\u2019s much more to explore \u2014 agent configuration, outreach analytics, close analysis, and the field query system.\n\nAsk the Nexus Assistant:\n\u2022 \u201cHow does the playbook system work?\u201d\n\u2022 \u201cWhat experiments are currently running?\u201d\n\u2022 \u201cShow me Sarah\u2019s pipeline\u201d",
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
  const [visible, setVisible] = useState(false);
  const autoAdvancedRef = useRef<number>(0); // tracks which step we last auto-advanced FROM

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
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {}
      } else if (attempts < 20) {
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
    // For steps with routes, only apply highlight if we're on the right page
    if (config.route && pathname !== config.route) return;
    const t = setTimeout(() => applyHighlight(config.highlightSelector), 600);
    return () => clearTimeout(t);
  }, [step, pathname, dismissed, applyHighlight, removeHighlight]);

  // ── Auto-advance: route-based ──
  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS || dismissed) return;
    const config = STEPS[step - 1]!;
    if (!config.autoAdvance || config.autoAdvance.type !== "route") return;
    if (autoAdvancedRef.current === step) return;

    if (pathname.startsWith(config.autoAdvance.match)) {
      autoAdvancedRef.current = step;
      const timer = setTimeout(() => {
        removeHighlight();
        const nextStep = step + 1;
        if (nextStep > TOTAL_STEPS) return;
        const nextConfig = STEPS[nextStep - 1]!;
        if (nextConfig.personaSwitch) {
          const user = allUsers.find((u) => u.name === nextConfig.personaSwitch);
          if (user) {
            setCurrentUser(user);
            setTimeout(() => router.refresh(), 300);
          }
        }
        if (nextConfig.clickSelector) {
          setTimeout(() => {
            const el = document.querySelector(nextConfig.clickSelector!) as HTMLElement;
            if (el) el.click();
          }, 200);
        }
        setStep(nextStep);
        setTourStepStorage(String(nextStep));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, pathname, dismissed, allUsers, setCurrentUser, removeHighlight, router]);

  // ── Auto-advance: element-based (poll for element appearance) ──
  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS || dismissed) return;
    const config = STEPS[step - 1]!;
    if (!config.autoAdvance || config.autoAdvance.type !== "element") return;
    if (autoAdvancedRef.current === step) return;

    let cancelled = false;
    const checkInterval = setInterval(() => {
      if (cancelled) return;
      const selectors = config.autoAdvance!.match.split(",").map(s => s.trim());
      const found = selectors.some(sel => document.querySelector(sel));
      if (found) {
        clearInterval(checkInterval);
        if (autoAdvancedRef.current === step) return;
        autoAdvancedRef.current = step;
        setTimeout(() => {
          removeHighlight();
          const nextStep = step + 1;
          if (nextStep > TOTAL_STEPS) return;
          const nextConfig = STEPS[nextStep - 1]!;
          if (nextConfig.personaSwitch) {
            const user = allUsers.find((u) => u.name === nextConfig.personaSwitch);
            if (user) {
              setCurrentUser(user);
              setTimeout(() => router.refresh(), 300);
            }
          }
          if (nextConfig.clickSelector) {
            setTimeout(() => {
              const el = document.querySelector(nextConfig.clickSelector!) as HTMLElement;
              if (el) el.click();
            }, 200);
          }
          if (nextConfig.route && pathname !== nextConfig.route) router.push(nextConfig.route);
          if (nextConfig.scrollToSelector) {
            setTimeout(() => {
              const el = document.querySelector(nextConfig.scrollToSelector!);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 800);
          }
          setStep(nextStep);
          setTourStepStorage(String(nextStep));
        }, 2000);
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(checkInterval);
    };
  }, [step, pathname, dismissed, allUsers, setCurrentUser, router, removeHighlight]);

  // ── Auto-advance: custom event for Step 2→3 (experiment started) ──
  useEffect(() => {
    if (step !== 2 || dismissed) return;
    if (autoAdvancedRef.current >= 2) return;

    const handler = () => {
      if (autoAdvancedRef.current >= 2) return;
      autoAdvancedRef.current = 2;
      setTimeout(() => {
        removeHighlight();
        const nextStep = 3;
        const nextConfig = STEPS[nextStep - 1]!;
        if (nextConfig.scrollToSelector) {
          setTimeout(() => {
            const el = document.querySelector(nextConfig.scrollToSelector!);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 800);
        }
        setStep(nextStep);
        setTourStepStorage(String(nextStep));
      }, 1500);
    };

    window.addEventListener("nexus-experiment-started", handler);
    return () => window.removeEventListener("nexus-experiment-started", handler);
  }, [step, dismissed, removeHighlight]);

  // ── Auto-advance: custom event for Step 4→5 (experiment graduated) ──
  useEffect(() => {
    if (step !== 4 || dismissed) return;
    if (autoAdvancedRef.current >= 4) return;

    const handler = () => {
      if (autoAdvancedRef.current >= 4) return;
      autoAdvancedRef.current = 4;
      setTimeout(() => {
        removeHighlight();
        // Click the What's Working tab
        const whatsWorkingTab = document.querySelector("[data-tab='whats-working']") as HTMLElement;
        if (whatsWorkingTab) whatsWorkingTab.click();
        // Wait for tab to render, then advance to Step 5
        setTimeout(() => {
          setStep(5);
          setTourStepStorage(String(5));
        }, 800);
      }, 1000);
    };

    window.addEventListener("nexus-experiment-graduated", handler);
    return () => window.removeEventListener("nexus-experiment-graduated", handler);
  }, [step, dismissed, removeHighlight]);

  // ── Helper: get persona for a given step (walks back to find the last personaSwitch) ──
  const getPersonaForStep = useCallback((targetStep: number): string | undefined => {
    for (let s = targetStep; s >= 1; s--) {
      const cfg = STEPS[s - 1];
      if (cfg?.personaSwitch) return cfg.personaSwitch;
    }
    return undefined;
  }, []);

  // ── Step navigation ──
  const advanceStep = useCallback(() => {
    removeHighlight();
    const nextStep = step + 1;
    if (nextStep > TOTAL_STEPS) {
      setStep(0);
      setDismissed(false);
      setAssistantMode(true);
      setTourStepStorage("done");
      return;
    }
    const config = STEPS[nextStep - 1]!;

    // Persona switch
    if (config.personaSwitch) {
      const user = allUsers.find((u) => u.name === config.personaSwitch);
      if (user) {
        setCurrentUser(user);
        setTimeout(() => router.refresh(), 300);
      }
    }

    // Click a tab/element before rendering this step
    if (config.clickSelector) {
      setTimeout(() => {
        const el = document.querySelector(config.clickSelector!) as HTMLElement;
        if (el) el.click();
      }, 200);
    }

    // Route change
    if (config.route && pathname !== config.route) router.push(config.route);

    // Scroll to section
    if (config.scrollToSelector) {
      setTimeout(() => {
        const el = document.querySelector(config.scrollToSelector!);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 800);
    }

    setStep(nextStep);
    setTourStepStorage(String(nextStep));
  }, [step, pathname, allUsers, setCurrentUser, router, removeHighlight]);

  const handleNext = useCallback(() => {
    if (step === TOTAL_STEPS) {
      removeHighlight();
      setStep(0);
      setAssistantMode(true);
      setTourStepStorage("done");
      return;
    }
    advanceStep();
  }, [step, advanceStep, removeHighlight]);

  const handleBack = useCallback(() => {
    if (step <= 1) return;
    removeHighlight();
    const prevStep = step - 1;
    const config = STEPS[prevStep - 1]!;

    // Restore the correct persona for the target step
    const targetPersona = getPersonaForStep(prevStep);
    if (targetPersona) {
      const user = allUsers.find((u) => u.name === targetPersona);
      if (user) {
        setCurrentUser(user);
        setTimeout(() => router.refresh(), 300);
      }
    }

    // Click a tab if the target step needs one
    if (config.clickSelector) {
      setTimeout(() => {
        const el = document.querySelector(config.clickSelector!) as HTMLElement;
        if (el) el.click();
      }, 200);
    }

    if (config.route && pathname !== config.route) router.push(config.route);

    // Scroll to section
    if (config.scrollToSelector) {
      setTimeout(() => {
        const el = document.querySelector(config.scrollToSelector!);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 800);
    }

    setStep(prevStep);
    setTourStepStorage(String(prevStep));
  }, [step, pathname, allUsers, setCurrentUser, router, removeHighlight, getPersonaForStep]);

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
        data-tour="assistant-widget"
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

        <h3 className="text-[16px] font-semibold mb-2 leading-snug">{config.title}</h3>

        <p className="text-[13.5px] leading-relaxed mb-5 whitespace-pre-line" style={{ color: "rgba(255,255,255,0.8)" }}>
          {config.body}
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
              {config.buttonText} {step < TOTAL_STEPS ? "\u2192" : ""}
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
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
  // Step 1 — Pipeline → MedVista
  {
    route: "/pipeline",
    title: "Click into MedVista Health Systems",
    body: "This is Sarah\u2019s biggest deal in negotiation \u2014 \u20ac2.4M. The deal workspace shows everything the AI knows: MEDDPICC gaps, stakeholder engagement, transcript analyses, and AI actions \u2014 all in one place.",
    highlightSelector: "[data-tour='deal-medvista']",
    buttonText: "Next",
    autoAdvanceOnClick: true,
  },
  // Step 2 — Deal Page → Prep Call
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
  // Step 3 — Pipeline → Agent Bar → Observation
  {
    route: "/pipeline",
    title: "Share an observation",
    body: "Type something in the bar below \u2014 try: \u201csecurity reviews are adding 3 weeks to every enterprise deal\u201d \u2014 and watch what happens. The AI classifies it, may ask a follow-up, clusters it with similar reports, and gives you something useful back.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next: VP View",
  },
  // Step 4 — Intelligence Dashboard (as Marcus)
  {
    route: "/intelligence",
    personaSwitch: "Marcus Thompson",
    title: "Now you\u2019re Marcus Thompson, VP of Sales",
    body: "Everything your team shared is structured here \u2014 patterns with ARR impact, severity levels, field voices, and suggested actions. Each cluster is intelligence that would normally be scattered across Slack and 1:1s. Click \u201cAsk about what you\u2019re seeing\u201d to query your team \u2014 the system answers from existing data or sends targeted questions to the right AEs.",
    highlightSelector: "[data-tour='ask-input']",
    buttonText: "Next",
  },
  // Step 5 — Sarah's quick check (new step 4b)
  {
    route: "/pipeline",
    personaSwitch: "Sarah Chen",
    title: "Sarah just got a quick check",
    body: "The question Marcus asked was turned into a deal-specific quick check for Sarah. Look for the \u201c\u2726 Quick check waiting\u201d badge in the agent bar at the bottom. This is how intelligence flows bidirectionally \u2014 VP asks, system routes to the right AE, AE answers with one tap, VP gets the aggregated answer.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next",
  },
  // Step 6 — Wrap-up
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
  if (pathname === "/pipeline") {
    return "Try: Click into MedVista Health Systems to explore the deal workspace";
  }
  if (pathname.startsWith("/pipeline/")) {
    return 'Try: Click "Prep Call" to see 7 intelligence layers converge into one brief';
  }
  if (pathname === "/intelligence" && persona !== "Marcus Thompson") {
    return "Try: Switch to Marcus Thompson to see the VP intelligence view";
  }
  if (pathname === "/intelligence" && persona === "Marcus Thompson") {
    return 'Try: Ask "Are CompetitorX deals recoverable?" to see targeted field queries';
  }
  if (pathname === "/agent-config") {
    return 'Try: Type "Never mention competitor pricing" to see agent configuration';
  }
  if (pathname === "/analyze") {
    return "Try: Run a demo transcript analysis to see AI coaching insights";
  }
  return null;
}

// ── Main Component ──────────────────────────────────────────────────────────────

export function DemoGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const { allUsers, setCurrentUser, personaName } = usePersona();
  const [step, setStep] = useState(0); // 0 = inactive, 1-6 = active steps
  const [dismissed, setDismissed] = useState(false);
  const [inSubStep, setInSubStep] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintDismissedPages, setHintDismissedPages] = useState<Set<string>>(new Set());
  const subStepObserverRef = useRef<MutationObserver | null>(null);

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
          setShowHint(true);
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
      } else {
        console.warn(`[DemoGuide] Could not find element: ${selector}`);
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

    if (config.route && pathname !== config.route) {
      return;
    }

    const selector = inSubStep && config.subStep
      ? config.subStep.highlightSelector
      : config.highlightSelector;

    const t = setTimeout(() => applyHighlight(selector), 600);
    return () => clearTimeout(t);
  }, [step, pathname, dismissed, inSubStep, applyHighlight, removeHighlight]);

  // ── Watch for sub-step trigger (call brief appearing) ──
  useEffect(() => {
    if (step < 1 || step > TOTAL_STEPS || dismissed || inSubStep) return;
    const config = STEPS[step - 1]!;
    if (!config.subStep) return;

    const waitSelector = config.subStep.waitForSelector;
    if (document.querySelector(waitSelector)) {
      setInSubStep(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(waitSelector)) {
        setInSubStep(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    subStepObserverRef.current = observer;

    return () => observer.disconnect();
  }, [step, dismissed, inSubStep]);

  // ── Auto-advance when highlighted element is clicked ──
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

    if (subStepObserverRef.current) {
      subStepObserverRef.current.disconnect();
      subStepObserverRef.current = null;
    }

    const nextStep = step + 1;

    if (nextStep > TOTAL_STEPS) {
      // Tour complete — transition to contextual hints
      setStep(0);
      setDismissed(false);
      setShowHint(true);
      setTourStepStorage("done");
      return;
    }

    const config = STEPS[nextStep - 1]!;

    if (config.personaSwitch) {
      const user = allUsers.find((u) => u.name === config.personaSwitch);
      if (user) setCurrentUser(user);
    }

    if (config.route && pathname !== config.route) {
      router.push(config.route);
    }

    setStep(nextStep);
    setTourStepStorage(String(nextStep));
  }, [step, pathname, allUsers, setCurrentUser, router, removeHighlight]);

  const handleNext = useCallback(() => {
    const config = STEPS[step - 1]!;

    // If in sub-step, navigate to sub-step's nextRoute
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

    // Last step — transition to hints
    if (step === TOTAL_STEPS) {
      removeHighlight();
      setStep(0);
      setShowHint(true);
      setTourStepStorage("done");
      return;
    }

    advanceStep();
  }, [step, inSubStep, advanceStep, removeHighlight, router, allUsers, setCurrentUser]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    removeHighlight();
  }, [removeHighlight]);

  // ── Contextual hint after tour completion ──
  if (showHint && !dismissed && step === 0) {
    const hint = getContextualHint(pathname, personaName);
    if (!hint || hintDismissedPages.has(pathname)) return null;

    return (
      <div
        className="fixed z-[9999] transition-all duration-300"
        style={{
          bottom: 24,
          left: 24,
          opacity: 1,
          transform: "translateY(0)",
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            background: "#3D3833",
            color: "#FFFFFF",
            maxWidth: 340,
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            padding: "12px 16px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
          }}
        >
          <span style={{ color: "#E07A5F", flexShrink: 0 }}>{"\u2726"}</span>
          <span style={{ flex: 1, color: "rgba(255,255,255,0.9)" }}>{hint}</span>
          <button
            onClick={() => {
              setHintDismissedPages((prev) => new Set(prev).add(pathname));
            }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="h-3 w-3" style={{ color: "rgba(255,255,255,0.4)" }} />
          </button>
        </div>
      </div>
    );
  }

  // ── Don't render if inactive ──
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
        {/* Header */}
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

        {/* Title */}
        <h3 className="text-[16px] font-semibold mb-2 leading-snug">{displayTitle}</h3>

        {/* Body */}
        <p
          className="text-[13.5px] leading-relaxed mb-5"
          style={{ color: "rgba(255,255,255,0.8)" }}
        >
          {displayBody}
        </p>

        {/* Progress dots + button */}
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

// ── Tour state hook (used in top bar) ────────────────────────────────────────────

export function useTourState() {
  const [tourStep, setTourStep] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTourStep(localStorage.getItem("nexus_demo_step"));
    } catch {}

    const handler = () => {
      try {
        setTourStep(localStorage.getItem("nexus_demo_step"));
      } catch {}
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

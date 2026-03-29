"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ArrowRight } from "lucide-react";
import { usePersona } from "@/components/providers";

// ── Step definitions ────────────────────────────────────────────────────────────

interface StepConfig {
  route: string | null;
  title: string;
  body: string;
  highlightSelector: string | null;
  buttonText: string;
  personaSwitch?: string;
  /** If true, clicking the highlighted element auto-advances */
  autoAdvanceOnClick?: boolean;
  /** A sub-step that replaces the card content after a DOM event */
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

function setTourStep(value: string) {
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
    buttonText: "Next \u2192",
    autoAdvanceOnClick: true,
  },
  {
    route: `/pipeline/${MEDVISTA_DEAL_ID}`,
    title: 'Click "Prep Call" to generate a brief',
    body: "The AI pulls from 7 intelligence layers \u2014 her SA\u2019s compliance expertise, manager pricing directives, competitive patterns from closed deals, MEDDPICC gap warnings, transcript analyses, field observations, and team resources. Watch what a 30-second prep looks like.",
    highlightSelector: "[data-tour='prep-call']",
    buttonText: "Next \u2192",
    subStep: {
      waitForSelector: "[data-tour='call-brief']",
      title: "Look at what just happened",
      body: "Notice the Team Intelligence section \u2014 Alex Kim\u2019s compliance expertise was injected automatically. The Manager Directives section enforces Marcus\u2019s pricing constraints. The MEDDPICC Questions map to scoring gaps on this deal. Every section pulls from a different intelligence layer.",
      highlightSelector: "[data-tour='call-brief']",
      buttonText: "Next: Share Field Intel \u2192",
      nextRoute: "/pipeline",
    },
  },
  {
    route: "/pipeline",
    title: "Share an observation",
    body: "Type something in the bar below \u2014 try: \u201csecurity reviews are adding 3 weeks to every enterprise deal\u201d \u2014 and watch what happens. The AI classifies it, may ask a follow-up, clusters it with similar reports, and gives you something useful back.",
    highlightSelector: "[data-tour='agent-bar']",
    buttonText: "Next: VP View \u2192",
  },
  {
    route: "/intelligence",
    personaSwitch: "Marcus Thompson",
    title: "Now you\u2019re Marcus Thompson, VP of Sales",
    body: "Everything your team shared is structured here \u2014 patterns with ARR impact, severity levels, field voices, and suggested actions. Each cluster is intelligence that would normally be scattered across Slack and 1:1s. Click \u201cAsk about what you\u2019re seeing\u201d to query your team \u2014 the system answers from existing data or sends targeted questions to the right AEs.",
    highlightSelector: "[data-tour='ask-input']",
    buttonText: "Next \u2192",
  },
  {
    route: null,
    title: "The system compounds",
    body: "Every action makes every other action smarter. Sarah\u2019s observation from Step 3 is already part of a cluster. Her next call prep will include it. When a deal closes, the AI pre-populates the loss analysis from everything the system captured. The team\u2019s collective intelligence grows with every interaction, without anyone doing extra work.",
    highlightSelector: null,
    buttonText: "Explore on your own",
  },
];

// ── Component ───────────────────────────────────────────────────────────────────

export function DemoGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const { allUsers, setCurrentUser } = usePersona();
  const [step, setStep] = useState(0); // 0 = inactive, 1-5 = active steps
  const [dismissed, setDismissed] = useState(false);
  const [inSubStep, setInSubStep] = useState(false);
  const [visible, setVisible] = useState(false); // for entrance animation
  const subStepObserverRef = useRef<MutationObserver | null>(null);

  // ── Initialize from localStorage ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexus_demo_step");
      if (saved) {
        const n = parseInt(saved, 10);
        if (n >= 1 && n <= 5) {
          setStep(n);
          setDismissed(false);
        }
      }
    } catch {}
  }, []);

  // ── Show with entrance animation when step becomes active ──
  useEffect(() => {
    if (step >= 1 && step <= 5 && !dismissed) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [step, dismissed]);

  // ── Highlight management ──
  const applyHighlight = useCallback((selector: string | null) => {
    // Remove old highlight
    document.querySelectorAll(".demo-highlight").forEach((el) => {
      el.classList.remove("demo-highlight");
    });
    if (!selector) return;
    // Retry a few times for elements that render async
    let attempts = 0;
    const tryHighlight = () => {
      const el = document.querySelector(selector);
      if (el) {
        el.classList.add("demo-highlight");
        // Scroll both the element and any overflow parent into view
        try {
          // Find scrollable ancestor (for kanban horizontal scroll)
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
    if (step < 1 || step > 5 || dismissed) {
      removeHighlight();
      return;
    }

    const config = STEPS[step - 1]!;

    // If we need to navigate to the right route first
    if (config.route && pathname !== config.route) {
      return; // Wait until we're on the correct route
    }

    const selector = inSubStep && config.subStep
      ? config.subStep.highlightSelector
      : config.highlightSelector;

    const t = setTimeout(() => applyHighlight(selector), 600);
    return () => clearTimeout(t);
  }, [step, pathname, dismissed, inSubStep, applyHighlight, removeHighlight]);

  // ── Watch for sub-step trigger (call brief appearing) ──
  useEffect(() => {
    if (step < 1 || step > 5 || dismissed || inSubStep) return;
    const config = STEPS[step - 1]!;
    if (!config.subStep) return;

    const waitSelector = config.subStep.waitForSelector;
    // Check if already present
    if (document.querySelector(waitSelector)) {
      setInSubStep(true);
      return;
    }

    // Watch for it
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
    if (step < 1 || step > 5 || dismissed) return;
    const config = STEPS[step - 1]!;
    if (!config.autoAdvanceOnClick || !config.highlightSelector) return;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const highlighted = document.querySelector(config.highlightSelector!);
      if (highlighted && (highlighted === target || highlighted.contains(target))) {
        // Auto-advance after a brief delay to let navigation happen
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

    if (nextStep > 5) {
      // Tour complete
      setStep(0);
      setDismissed(false);
      setTourStep("done");
      return;
    }

    const config = STEPS[nextStep - 1]!;

    // Switch persona if needed
    if (config.personaSwitch) {
      const user = allUsers.find((u) => u.name === config.personaSwitch);
      if (user) setCurrentUser(user);
    }

    // Navigate if needed
    if (config.route && pathname !== config.route) {
      router.push(config.route);
    }

    setStep(nextStep);
    setTourStep(String(nextStep));
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
      setTourStep(String(nextStep));
      return;
    }

    // Last step — dismiss
    if (step === 5) {
      removeHighlight();
      setStep(0);
      setTourStep("done");
      return;
    }

    advanceStep();
  }, [step, inSubStep, advanceStep, removeHighlight, router, allUsers, setCurrentUser]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    removeHighlight();
  }, [removeHighlight]);

  // ── Don't render if inactive ──
  if (step < 1 || step > 5 || dismissed) return null;

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
            STEP {step} OF 5
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
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: i === step ? "#E07A5F" : i < step ? "#E07A5F" : "rgba(255,255,255,0.2)",
                  opacity: i < step ? 0.5 : 1,
                }}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-white transition-colors hover:opacity-90"
            style={{
              background: "#E07A5F",
              padding: "8px 20px",
              borderRadius: 6,
              border: "none",
            }}
          >
            {displayButton}
            {step < 5 && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Resume Tour Button (used in top bar) ──

export function useTourState() {
  const [tourStep, setTourStep] = useState<string | null>(null);

  useEffect(() => {
    try {
      setTourStep(localStorage.getItem("nexus_demo_step"));
    } catch {}

    // Listen for storage changes (cross-tab) and custom tour events (same-tab)
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

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, Check, Compass, Copy } from "lucide-react";

const NORDICMED_DEAL_ID = "3848a398-1850-4a8c-a44e-46aec01b6a24";
const MEDVISTA_DEAL_ID = "c0069b95-02dc-46db-bd04-aac69099ecfb";

type StepDef = {
  title: string;
  instruction: string;
  detection: "url" | "element" | "manual";
  /** For url detection: substring to match in pathname */
  urlMatch?: string;
  /** For element detection: CSS selector to poll for */
  selector?: string;
  /** Copyable example text (for step 9) */
  exampleText?: string;
};

const STEPS: StepDef[] = [
  {
    title: "Open NordicMed Group",
    instruction: "Click NordicMed Group on the pipeline board",
    detection: "url",
    urlMatch: `/pipeline/${NORDICMED_DEAL_ID}`,
  },
  {
    title: "Process the transcript",
    instruction: "Go to the Calls tab and click Process Transcript",
    detection: "element",
    selector: "[data-workflow-tracker]",
  },
  {
    title: "Watch the pipeline",
    instruction:
      "The system is analyzing the call in parallel \u2014 extracting actions, scoring MEDDPICC, detecting signals",
    detection: "element",
    selector: "[data-workflow-complete]",
  },
  {
    title: "Review agent intelligence",
    instruction: "Click the Agent Memory bar to see what the agent learned",
    detection: "manual",
  },
  {
    title: "Prep for the next call",
    instruction:
      "Click Prep Call, select a meeting type, choose stakeholders, and generate a brief",
    detection: "manual",
  },
  {
    title: "Handle the intervention",
    instruction:
      "The agent detected a timeline risk \u2014 review and update the close date",
    detection: "manual",
  },
  {
    title: "Open MedVista Health Systems",
    instruction: "Navigate back to Pipeline and click MedVista",
    detection: "url",
    urlMatch: `/pipeline/${MEDVISTA_DEAL_ID}`,
  },
  {
    title: "Process MedVista\u2019s transcript",
    instruction: "Go to the Calls tab and click Process Transcript",
    detection: "element",
    selector: "[data-workflow-tracker]",
  },
  {
    title: "Submit a process improvement",
    instruction:
      "While the pipeline processes, type a process improvement in the agent bar:",
    detection: "manual",
    exampleText:
      "Send technical leaders a working product built by Claude Code within 3 hours of the meeting ending",
  },
  {
    title: "Review cross-deal intelligence",
    instruction:
      "Click the Agent Memory bar to see cross-deal patterns pulled from NordicMed",
    detection: "manual",
  },
  {
    title: "Explore the Playbook",
    instruction:
      "Click Playbook in the sidebar to see experiments and proven plays",
    detection: "url",
    urlMatch: "/playbook",
  },
  {
    title: "Approve new experiments",
    instruction:
      "Switch to Marcus Thompson (VP), scroll to the bottom to find the proposed process improvements, click Approve & Start Testing, select the test group, and click Start Experiment",
    detection: "manual",
  },
  {
    title: "Graduate a proven play",
    instruction:
      "Find the completed experiment, click Graduate & Scale, and confirm graduation",
    detection: "manual",
  },
  {
    title: "See what\u2019s working",
    instruction:
      "Navigate to the What\u2019s Working tab to see the promoted play being scaled across the org",
    detection: "manual",
  },
  {
    title: "Measure influence",
    instruction:
      "Click the Influence tab to see team influence and market signals",
    detection: "manual",
  },
  {
    title: "Explore the Intelligence dashboard",
    instruction: "Click Intelligence in the sidebar to see org-wide patterns",
    detection: "url",
    urlMatch: "/intelligence",
  },
  {
    title: "Review signal patterns",
    instruction:
      "See different signals from emails, calls, and field observations with the compound ARR associated with each grouped signal",
    detection: "manual",
  },
  {
    title: "Switch back to Sarah Chen",
    instruction: "Change user back to Sarah Chen\u2019s view",
    detection: "manual",
  },
  {
    title: "Customize your agent",
    instruction:
      "Navigate to Agent Config to review how you can customize your agent\u2019s persona, guardrails, and evolution",
    detection: "url",
    urlMatch: "/agent-config",
  },
];

export function DemoGuide() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const isActive = localStorage.getItem("demoGuideActive") === "true";
    const step = parseInt(localStorage.getItem("demoGuideStep") || "0", 10);
    setActive(isActive);
    setVisible(isActive);
    setCurrentStep(step);
  }, []);

  // Persist step changes
  useEffect(() => {
    if (active) {
      localStorage.setItem("demoGuideStep", String(currentStep));
    }
  }, [currentStep, active]);

  // Scroll active step into view
  useEffect(() => {
    if (activeStepRef.current && scrollContainerRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentStep, visible]);

  // URL-based detection
  useEffect(() => {
    if (!active || currentStep >= STEPS.length) return;
    const step = STEPS[currentStep];
    if (
      step.detection === "url" &&
      step.urlMatch &&
      pathname.includes(step.urlMatch)
    ) {
      setCurrentStep((s) => s + 1);
    }
  }, [pathname, currentStep, active]);

  // Element-based detection (polling)
  useEffect(() => {
    if (!active || currentStep >= STEPS.length) return;
    const step = STEPS[currentStep];
    if (step.detection !== "element" || !step.selector) return;

    const interval = setInterval(() => {
      if (document.querySelector(step.selector!)) {
        setCurrentStep((s) => s + 1);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [currentStep, active]);

  const advanceManual = useCallback(() => {
    setCurrentStep((s) => s + 1);
  }, []);

  const toggleVisible = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const restartGuide = useCallback(() => {
    setCurrentStep(0);
    localStorage.setItem("demoGuideStep", "0");
  }, []);

  const copyExample = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  if (!active) return null;

  // Floating toggle button when panel is hidden
  if (!visible) {
    return (
      <button
        onClick={toggleVisible}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: "#FFFFFF",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 20,
          boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "#3D3833",
          zIndex: 9998,
        }}
      >
        <Compass size={14} style={{ color: "#E07A5F" }} />
        Guide
      </button>
    );
  }

  const allDone = currentStep >= STEPS.length;

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        top: "50%",
        transform: "translateY(-50%)",
        width: 280,
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        zIndex: 9998,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header (fixed) */}
      <div style={{ padding: "16px 16px 0 16px", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#E07A5F", fontSize: 14 }}>&#10022;</span>
            <span
              style={{ fontSize: 14, fontWeight: 600, color: "#3D3833" }}
            >
              Demo Guide
            </span>
          </div>
          <button
            onClick={close}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              color: "#8A8078",
            }}
          >
            <X size={14} />
          </button>
        </div>
        <p
          style={{
            fontSize: 11,
            color: "#8A8078",
            margin: "0 0 12px 0",
          }}
        >
          {allDone
            ? "All steps complete!"
            : `Step ${currentStep + 1} of ${STEPS.length}`}
        </p>
      </div>

      {/* Steps (scrollable) */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px 16px 16px",
        }}
      >
        {allDone ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#3D3833",
                margin: "0 0 8px 0",
              }}
            >
              &#10022; Demo Complete
            </p>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "#8A8078",
                margin: "0 0 16px 0",
              }}
            >
              You&apos;ve seen how Nexus turns one conversation into
              organizational intelligence.
            </p>
            <button
              onClick={restartGuide}
              style={{
                background: "none",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                color: "#3D3833",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Restart Guide
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {STEPS.map((step, i) => {
              const isComplete = i < currentStep;
              const isCurrent = i === currentStep;

              return (
                <div
                  key={i}
                  ref={isCurrent ? activeStepRef : undefined}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "6px 0",
                    borderLeft: isCurrent
                      ? "3px solid #E07A5F"
                      : "3px solid transparent",
                    paddingLeft: 10,
                  }}
                >
                  {/* Indicator */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      ...(isComplete
                        ? { background: "#4A9E6B" }
                        : isCurrent
                          ? {
                              background: "#E07A5F",
                              animation:
                                "guide-pulse 2s ease-in-out infinite",
                            }
                          : {
                              background: "transparent",
                              border: "1.5px solid #D0CBC5",
                            }),
                    }}
                  >
                    {isComplete && (
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    )}
                    {isCurrent && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#FFFFFF",
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12.5,
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? "#3D3833" : "#8A8078",
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {step.title}
                    </p>
                    {isCurrent && (
                      <>
                        <p
                          style={{
                            fontSize: 11.5,
                            color: "#8A8078",
                            margin: "4px 0 0 0",
                            lineHeight: 1.45,
                          }}
                        >
                          {step.instruction}
                        </p>
                        {step.exampleText && (
                          <div
                            style={{
                              marginTop: 6,
                              background: "#F5F3EF",
                              borderRadius: 6,
                              padding: "8px 10px",
                              position: "relative",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 11,
                                lineHeight: 1.45,
                                color: "#3D3833",
                                margin: 0,
                                paddingRight: 24,
                                fontStyle: "italic",
                              }}
                            >
                              &ldquo;{step.exampleText}&rdquo;
                            </p>
                            <button
                              onClick={() => copyExample(step.exampleText!)}
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: copied ? "#4A9E6B" : "#8A8078",
                              }}
                              title="Copy to clipboard"
                            >
                              {copied ? (
                                <Check size={12} strokeWidth={3} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        )}
                        {step.detection === "manual" && (
                          <button
                            onClick={advanceManual}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              marginTop: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#E07A5F",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Done &#10003;
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes guide-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

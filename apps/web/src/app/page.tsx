"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const LOADING_STEPS = [
  "Preparing fresh demo...",
  "Clearing AI agents...",
  "Resetting pipeline data...",
];

const STEP_DURATION = 1500;
const DONE_DISPLAY = 1000;

export default function LandingPage() {
  const router = useRouter();
  const [resetState, setResetState] = useState<
    "idle" | "loading" | "done"
  >("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const apiDoneRef = useRef(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishAndNavigate = useCallback(() => {
    setResetState("done");
    setTimeout(() => {
      localStorage.clear();
      localStorage.setItem("demoGuideActive", "true");
      localStorage.setItem("demoGuideStep", "0");
      router.push("/pipeline");
    }, DONE_DISPLAY);
  }, [router]);

  const runReset = useCallback(async () => {
    if (resetState !== "idle") return;
    setResetState("loading");
    setStepIndex(0);
    apiDoneRef.current = false;

    fetch("/api/demo/reset", { method: "POST" })
      .then(() => {
        apiDoneRef.current = true;
      })
      .catch(() => {
        apiDoneRef.current = true;
      });

    let current = 0;
    const advanceStep = () => {
      current++;
      if (current < LOADING_STEPS.length) {
        setStepIndex(current);
        stepTimerRef.current = setTimeout(() => {
          if (apiDoneRef.current) {
            finishAndNavigate();
          } else {
            advanceStep();
          }
        }, STEP_DURATION);
      } else {
        const poll = () => {
          if (apiDoneRef.current) {
            finishAndNavigate();
          } else {
            stepTimerRef.current = setTimeout(poll, 200);
          }
        };
        stepTimerRef.current = setTimeout(poll, 500);
      }
    };

    stepTimerRef.current = setTimeout(() => {
      if (apiDoneRef.current) {
        setTimeout(finishAndNavigate, 500);
      } else {
        advanceStep();
      }
    }, STEP_DURATION);
  }, [resetState, finishAndNavigate]);

  const autoResetRef = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !autoResetRef.current) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "true") {
        autoResetRef.current = true;
        window.history.replaceState({}, document.title, "/");
        setTimeout(() => runReset(), 50);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, []);

  const isLoading = resetState === "loading";
  const isDone = resetState === "done";
  const isActive = isLoading || isDone;

  return (
    <div
      style={{
        height: "100vh",
        background: "#FDFAF7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1200, width: "100%", padding: "0 32px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span style={{ color: "#E07A5F", fontSize: 22 }}>&#10022;</span>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#3D3833",
                margin: 0,
              }}
            >
              Nexus
            </h1>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "#8A8078",
              letterSpacing: "0.08em",
              margin: "0 0 6px 0",
              textTransform: "uppercase",
            }}
          >
            AI Sales Orchestration
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#3D3833",
              margin: 0,
            }}
          >
            Designed by an enterprise AE. Built entirely with Claude.
          </p>
        </div>

        {/* Release cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 18,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 12,
              padding: "14px 18px",
              boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: "#E07A5F",
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
                marginBottom: 8,
                letterSpacing: "0.03em",
                alignSelf: "flex-start",
              }}
            >
              New
            </span>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#3D3833",
                margin: "0 0 6px 0",
              }}
            >
              Persistent Deal Agents
            </h3>
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "#8A8078",
                margin: 0,
                flex: 1,
              }}
            >
              Every deal gets its own AI agent that learns from every transcript,
              remembers every interaction, and coordinates intelligence across
              deals. Your 7th call prep knows everything from the first
              6&nbsp;&mdash; without a single data point re-entered.
            </p>
          </div>
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 12,
              padding: "14px 18px",
              boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: "#E07A5F",
                color: "#FFFFFF",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 10,
                marginBottom: 8,
                letterSpacing: "0.03em",
                alignSelf: "flex-start",
              }}
            >
              New
            </span>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#3D3833",
                margin: "0 0 6px 0",
              }}
            >
              Smart Interventions
            </h3>
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "#8A8078",
                margin: 0,
                flex: 1,
              }}
            >
              The agent caught a close date that doesn&apos;t match the
              procurement timeline discussed on the last call. One click to fix
              it. The agent prepares, the human decides.
            </p>
          </div>
        </div>

        {/* Thesis */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: "#3D3833",
              margin: "0 0 8px 0",
              lineHeight: 1.3,
            }}
          >
            Your AEs don&apos;t have an information problem&nbsp;&mdash; they
            have a time problem.
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "#3D3833",
              margin: "0 auto 6px auto",
              maxWidth: 900,
            }}
          >
            Nexus puts AI agents alongside every deal to handle the repeatable
            work&nbsp;&mdash; transcript analysis, MEDDPICC scoring, competitive
            tracking, call prep&nbsp;&mdash; so your reps spend time selling,
            not updating Salesforce.
          </p>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "#3D3833",
              margin: "0 auto",
              maxWidth: 900,
            }}
          >
            AEs get time back. Leadership gets visibility into what&apos;s
            actually happening in the field&nbsp;&mdash; without asking.
          </p>
        </div>

        {/* Pillars */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
            marginBottom: 18,
          }}
        >
          {[
            {
              title: "One Conversation. Zero Updates.",
              body: (
                <>
                  One call. The pipeline extracts action items, scores MEDDPICC,
                  detects competitive signals, synthesizes learnings, and drafts
                  a follow-up&nbsp;&mdash; all in parallel. No forms. No CRM
                  tabs. No data entry.
                </>
              ),
            },
            {
              title: "Capture What Evaporates.",
              body: (
                <>
                  Competitive intel, process friction, product
                  gaps&nbsp;&mdash; the signal buried in customer conversations
                  and team threads that never reaches the people who can act on
                  it. Nexus captures it, clusters it by ARR impact, routes it to
                  Enablement or Product, and tracks it to resolution. When reps
                  discover what works, the playbook engine tests it as an A/B
                  experiment and scales proven plays across the org.
                </>
              ),
            },
            {
              title: "Agents That Anticipate.",
              body: (
                <>
                  Deal agents don&apos;t wait. They flag timeline risks, surface
                  cross-deal patterns, and prepare call briefs before the rep
                  opens the app. One click to act on what they find.
                </>
              ),
            },
          ].map((pillar, i) => (
            <div
              key={i}
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(0,0,0,0.06)",
                borderTop: "3px solid #E07A5F",
                borderRadius: 12,
                padding: "20px 20px",
                boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
              }}
            >
              <h3
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#3D3833",
                  margin: "0 0 6px 0",
                }}
              >
                {pillar.title}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "#8A8078",
                  margin: 0,
                }}
              >
                {pillar.body}
              </p>
            </div>
          ))}
        </div>

        {/* Context line */}
        <p
          style={{
            fontSize: 12,
            color: "#8A8078",
            fontStyle: "italic",
            textAlign: "center",
            margin: "0 0 10px 0",
          }}
        >
          You&apos;ll trigger each step during this demo to see the system in
          real time. In deployment, these processes run automatically as calls
          end.
        </p>

        {/* Footer line */}
        <p
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "#3D3833",
            textAlign: "center",
            margin: "0 0 14px 0",
          }}
        >
          Built for the enterprise sales motion you're scaling right now.
        </p>

        {/* Enter button */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={runReset}
            disabled={isActive}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minWidth: 240,
              background: isActive ? "#F5F3EF" : "#E07A5F",
              color: isDone ? "#4A9E6B" : isLoading ? "#8A8078" : "#FFFFFF",
              padding: "12px 36px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: isActive ? "not-allowed" : "pointer",
              border: isActive ? "1px solid rgba(0,0,0,0.06)" : "none",
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseOver={(e) => {
              if (!isActive) e.currentTarget.style.background = "#D06A4F";
            }}
            onMouseOut={(e) => {
              if (!isActive) e.currentTarget.style.background = "#E07A5F";
            }}
          >
            {isDone ? (
              <>
                <span style={{ color: "#4A9E6B", fontSize: 18 }}>&#10003;</span>
                <span style={{ color: "#3D3833" }}>Demo Ready</span>
              </>
            ) : isLoading ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    border: "2px solid #E07A5F",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "nexus-spin 0.8s linear infinite",
                  }}
                />
                {LOADING_STEPS[stepIndex]}
              </>
            ) : (
              "Enter Demo \u2192"
            )}
          </button>
          <style>{`@keyframes nexus-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );
}

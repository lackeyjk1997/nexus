"use client";

import { useEffect, useState } from "react";

export default function LandingPage() {
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "true") {
        // Call the reset API, then clear localStorage
        fetch("/api/demo/reset", { method: "POST" })
          .catch(() => {})
          .finally(() => {
            localStorage.clear();
            window.history.replaceState({}, "", "/");
          });
      }
    }
  }, []);

  function handleEnter() {
    // Clear saved persona so PersonaProvider defaults to Sarah Chen
    try {
      localStorage.removeItem("nexus_persona_id");
      localStorage.removeItem("nexus_walkthrough_seen");
      localStorage.setItem("nexus_demo_step", "1");
    } catch {}
    window.location.href = "/pipeline";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          maxWidth: 640,
          width: "100%",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(107,79,57,0.12)",
          padding: "48px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span style={{ color: "#E07A5F", fontSize: 24 }}>✦</span>
            <h1
              style={{
                fontSize: 28,
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
              fontSize: 14,
              color: "#8A8078",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            AI SALES ORCHESTRATION
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(0,0,0,0.06)",
            marginBottom: 28,
          }}
        />

        {/* Thesis */}
        <div style={{ fontSize: 15, lineHeight: 1.75, color: "#3D3833" }}>
          <p style={{ marginBottom: 16 }}>
            Your AEs spend 60% of their week assembling information instead of selling.
          </p>
          <p style={{ marginBottom: 16 }}>
            Prepping a call means digging through Slack, chasing the SA for competitive intel, re-reading old transcripts, and hoping someone updated the CRM. Writing a follow-up means reconstructing what was said from memory. Reporting a loss means picking a dropdown value that tells leadership nothing useful.
          </p>
          <p style={{ marginBottom: 16 }}>
            Meanwhile, the knowledge that would actually help — what the SA learned about compliance, what three other reps noticed about a competitor&apos;s pricing, what worked on the deal you won last quarter — lives in people&apos;s heads and dies in Slack threads.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>Nexus makes that knowledge usable.</strong>
          </p>
          <p style={{ marginBottom: 16 }}>
            When Sarah preps a call, the brief already knows her SA recommends leading with compliance, that the CFO hasn&apos;t been engaged in 45 days, that a competitor undercut pricing on three similar deals, and that her manager prohibits discounts over 10%. She didn&apos;t assemble any of it — seven intelligence layers converged in 30 seconds.
          </p>
          <p style={{ marginBottom: 16 }}>
            When she notices something on a call — &ldquo;CompetitorX is offering free pilots&rdquo; — she types one sentence. The system classifies it, links it to affected deals, clusters it with reports from two other reps, calculates &euro;850K in pipeline at risk, and routes it to Product Marketing. A Slack message that would have died becomes structured intelligence.
          </p>
          <p style={{ marginBottom: 16 }}>
            When a deal closes, the AI reads every transcript, observation, and MEDDPICC gap to pre-populate the loss analysis before anyone fills out a form. When Marcus has a question about his pipeline, the system answers from data or sends targeted one-tap questions to the right AEs — not a Monday morning Slack broadcast.
          </p>
          <p style={{ marginBottom: 24 }}>
            Every action makes every other action smarter. The SA&apos;s expertise feeds the AE&apos;s call prep. The AE&apos;s observation feeds the VP&apos;s dashboard. The VP&apos;s question feeds back to the AE with a give-back insight. Nobody does extra work. The intelligence just compounds.
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(0,0,0,0.06)",
            margin: "28px 0",
          }}
        />

        {/* Demo context */}
        <p
          style={{
            fontSize: 13.5,
            color: "#8A8078",
            lineHeight: 1.6,
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          You&apos;ll enter as{" "}
          <strong style={{ color: "#3D3833" }}>Sarah Chen</strong>, Account
          Executive selling Claude to Healthcare and Financial Services
          accounts. Use the user switcher (top right) to experience the system
          as a VP of Sales, Solutions Architect, or Support Function lead.
        </p>

        {/* Enter button */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <button
            onClick={handleEnter}
            style={{
              display: "inline-block",
              background: "#E07A5F",
              color: "#FFFFFF",
              padding: "14px 36px",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              border: "none",
              transition: "background 0.2s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "#D06A4F")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "#E07A5F")
            }
          >
            Enter Demo →
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "#8A8078", margin: "0 0 4px 0" }}>
            Built by Jeff Lackey
          </p>
          <p style={{ fontSize: 12, color: "#8A8078", margin: "0 0 12px 0" }}>
            <a
              href="mailto:jeff.lackey97@gmail.com"
              style={{ color: "#8A8078", textDecoration: "none" }}
            >
              jeff.lackey97@gmail.com
            </a>
            {" · "}
            <a
              href="tel:6028450394"
              style={{ color: "#8A8078", textDecoration: "none" }}
            >
              (602) 845-0394
            </a>
            {" · "}
            <a
              href="https://linkedin.com/in/jeffreylackey"
              target="_blank"
              rel="noopener"
              style={{ color: "#8A8078", textDecoration: "none" }}
            >
              LinkedIn
            </a>
          </p>
          <button
            onClick={async () => {
              setResetting(true);
              try {
                await fetch("/api/demo/reset", { method: "POST" });
                localStorage.clear();
                window.location.reload();
              } catch {
                setResetting(false);
              }
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: 11,
              color: resetting ? "#E07A5F" : "#D4C9BD",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "color 0.2s ease",
            }}
            onMouseOver={(e) => { if (!resetting) e.currentTarget.style.color = "#E07A5F"; }}
            onMouseOut={(e) => { if (!resetting) e.currentTarget.style.color = "#D4C9BD"; }}
          >
            {resetting ? "Resetting..." : "\u21BB Reset Demo Data"}
          </button>
        </div>
      </div>
    </div>
  );
}

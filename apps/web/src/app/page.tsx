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
            Your AEs know things that never make it into your CRM.
          </p>
          <p style={{ marginBottom: 16 }}>
            They&apos;re telling each other in Slack that CompetitorX dropped
            pricing, that security reviews are killing deal velocity, that the
            only case study you have is 18 months old. By the time that reaches
            you, it&apos;s too late, it&apos;s distorted, or it&apos;s lost.
          </p>
          <p style={{ marginBottom: 16 }}>
            Nexus is what happens when you build AI into the sales workflow
            instead of bolting it on top. Every action makes the system smarter:
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>A rep preps a call</strong> — the brief pulls from 14 data
            sources including teammate expertise, competitive patterns, manager
            directives, and win/loss intelligence from closed deals. Not a
            generic template. A brief that knows the CFO hasn&apos;t been
            engaged, that a competitor undercut pricing on 3 similar deals, and
            that the SA recommends leading with compliance.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>A rep shares a 10-second observation</strong> — the AI
            classifies it, links it to affected deals, clusters it with reports
            from other reps, calculates pipeline at risk, routes it to the right
            support function, and gives the rep something useful back. No forms.
            No categories. No routing.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>A deal closes</strong> — the AI reads every transcript,
            observation, and MEDDPICC gap to pre-populate the loss analysis. The
            rep confirms what&apos;s right, adds what only they know. Every
            factor becomes intelligence that feeds future deal warnings across
            the org.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>A VP asks a question</strong> — the system checks if it
            already knows the answer. If not, it sends targeted questions to the
            specific AEs with affected deals. Not a broadcast. Deal-specific
            questions that take one tap to answer.
          </p>
          <p style={{ marginBottom: 24 }}>
            The result: your team&apos;s collective intelligence compounds with
            every interaction, without anyone doing extra work.
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "rgba(0,0,0,0.06)",
            marginBottom: 24,
          }}
        />

        {/* What to try */}
        <div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "#8A8078",
              marginBottom: 16,
            }}
          >
            WHAT TO TRY
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 14, color: "#3D3833", lineHeight: 1.6 }}>
              <strong style={{ color: "#E07A5F" }}>1.</strong>{" "}
              <strong>Prep a Call</strong> — Click Pipeline → MedVista Health
              Systems → &ldquo;Prep Call.&rdquo; Pick Negotiation, select
              stakeholders, generate. Watch 7 intelligence layers converge —
              your SA&apos;s compliance expertise, your manager&apos;s pricing
              directives, competitive patterns from closed deals, and MEDDPICC
              gap warnings — into one brief.
            </div>
            <div style={{ fontSize: 14, color: "#3D3833", lineHeight: 1.6 }}>
              <strong style={{ color: "#E07A5F" }}>2.</strong>{" "}
              <strong>Share Field Intel</strong> — Type anything in the bar at
              the bottom of any page. Try: &ldquo;security reviews are slowing
              down every enterprise deal.&rdquo; Watch the AI classify it, ask a
              smart follow-up, cluster it with similar reports, and give you
              something useful back — all inline, no page change.
            </div>
            <div style={{ fontSize: 14, color: "#3D3833", lineHeight: 1.6 }}>
              <strong style={{ color: "#E07A5F" }}>3.</strong>{" "}
              <strong>See the VP View</strong> — Switch to Marcus Thompson (top
              right). Explore the Intelligence dashboard — real patterns with ARR
              impact, field voices, and suggested actions. Click &ldquo;Ask about
              what you&apos;re seeing&rdquo; and ask a question. Or click into
              any deal and ask about it directly.
            </div>
            <div style={{ fontSize: 14, color: "#3D3833", lineHeight: 1.6 }}>
              <strong style={{ color: "#E07A5F" }}>4.</strong>{" "}
              <strong>Close a Deal</strong> — As any AE, change a deal to
              &ldquo;Closed Lost.&rdquo; The AI pre-populates the loss analysis
              from deal history before you type a word. Confirm what&apos;s
              right, correct what&apos;s wrong, add what only you know.
            </div>
          </div>
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
          Executive on a 14-person enterprise sales team. Use the user switcher
          (top right) to see the system from different perspectives — AE, VP,
          Solutions Architect, and Support Functions.
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

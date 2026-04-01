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
    } catch {}
    window.location.href = "/playbook";
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

        {/* What's New Banner */}
        <div
          style={{
            background: "#F3EDE7",
            borderTop: "2px solid #E07A5F",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 28,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#E07A5F",
              margin: "0 0 8px 0",
            }}
          >
            What&apos;s New in Nexus
          </p>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#3D3833", margin: 0 }}>
            <strong>Playbook Intelligence</strong> — AEs propose process improvements from the field. Leadership approves A/B experiments with test and control groups. The system measures velocity, sentiment, and close rate with deal-level evidence. Proven methodologies graduate and automatically influence call prep across the org. The team gets smarter every quarter without anyone filling out a form.
          </p>
        </div>

        {/* Thesis */}
        <div style={{ fontSize: 15, lineHeight: 1.75, color: "#3D3833" }}>
          <p style={{ marginBottom: 16 }}>
            <strong>Your AEs don&apos;t have an information problem. They have a leverage problem.</strong>
          </p>
          <p style={{ marginBottom: 16 }}>
            They&apos;re doing the same discovery call 200 times a year, and the difference between a rep who closes at 35% and one who closes at 20% is usually one insight they picked up three deals ago — an objection they learned to preempt, a stakeholder they learned to engage earlier, a demo format that landed better.
          </p>
          <p style={{ marginBottom: 16 }}>
            That insight lives in their head. It helps them. It doesn&apos;t help anyone else.
          </p>
          <p style={{ marginBottom: 16 }}>
            Meanwhile, leadership knows the playbook needs to evolve, but the feedback loop is broken. Reps share what&apos;s working in Slack. It gets a few emoji reactions. Nobody measures it. Nobody scales it. Next quarter, new hires make the same mistakes the team already solved.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>Nexus closes the loop.</strong>
          </p>
          <p style={{ marginBottom: 16 }}>
            When Sarah preps for a call, the brief doesn&apos;t just pull deal context — it pulls the team&apos;s proven playbook. If an experiment showed that building a prototype live during discovery accelerated deals by 40% across nine tested deals, Sarah&apos;s brief tells her to do exactly that, with specific guidance for this prospect&apos;s pain points. She didn&apos;t go searching. The org&apos;s best thinking found her.
          </p>
          <p style={{ marginBottom: 16 }}>
            When she notices something on a call — a competitor offering free pilots, a procurement process that&apos;s changed — she types one sentence. It gets classified, tied to active deals, grouped with similar signals from other reps, sized against pipeline impact, and routed to the team that can act on it. What used to evaporate now compounds.
          </p>
          <p style={{ marginBottom: 16 }}>
            When a rep notices something working — building a prototype live during discovery calls instead of just talking about capabilities — she types one sentence. Leadership doesn&apos;t just take her word for it. They turn it into an experiment: two AEs test the new approach for 30 days while the rest run standard discovery. The system tracks velocity, sentiment, and close rate with deal-level evidence. Transcript excerpts show the prospect saying &ldquo;this is the first vendor who actually showed us what it would look like.&rdquo; When it proves out across nine deals, leadership scales it to the whole team with one click. When it doesn&apos;t, they archive it with learnings and move on. The playbook evolves because reps are selling, not because someone updated a wiki.
          </p>
          <p style={{ marginBottom: 16 }}>
            <strong>The system improves because your team is doing their job — not because you asked them to do more.</strong>
          </p>
          <p style={{ marginBottom: 24, fontSize: 15.5 }}>
            Every observation feeds Intelligence. Every experiment feeds the Playbook. Every proven play feeds Call Prep. The SA sharpens the AE. The AE gives leadership real signal. Leadership tests and scales what works. It&apos;s a flywheel, not a dashboard.
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
          accounts. The guided tour walks you through the core loop: field ideas → experiments → evidence → scaling → deal prep. Use the user switcher (top right) to experience the system as a VP of Sales.
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

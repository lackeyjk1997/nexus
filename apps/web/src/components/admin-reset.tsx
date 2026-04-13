"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export function AdminReset() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "running" | "done">("idle");

  const runReset = useCallback(async () => {
    setState("running");
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      setState("done");
      setTimeout(() => {
        setState("idle");
        router.push("/pipeline");
        router.refresh();
      }, 1000);
    } catch (e) {
      console.log("Reset failed:", e);
      setState("idle");
    }
  }, [router]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "X") {
        e.preventDefault();
        setState((s) => (s === "idle" ? "confirm" : s));
      }
      if (e.key === "Escape" && state === "confirm") {
        setState("idle");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state]);

  if (state === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        fontFamily: "'DM Sans', sans-serif",
      }}
      onClick={() => state === "confirm" && setState("idle")}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: "24px 32px",
          maxWidth: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {state === "confirm" && (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#3D3833", margin: "0 0 8px 0" }}>
              Reset demo environment?
            </h3>
            <p style={{ fontSize: 13, color: "#8A8078", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              This will re-seed all data and destroy Rivet actors. Takes about 60 seconds.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setState("idle")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "#F5F3EF",
                  color: "#3D3833",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={runReset}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#E07A5F",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            </div>
          </>
        )}
        {state === "running" && (
          <p style={{ fontSize: 14, color: "#8A8078", margin: 0 }}>
            Resetting demo data...
          </p>
        )}
        {state === "done" && (
          <p style={{ fontSize: 14, color: "#4A9E6B", margin: 0, fontWeight: 500 }}>
            Reset complete. Redirecting...
          </p>
        )}
      </div>
    </div>
  );
}

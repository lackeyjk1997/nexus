"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, ArrowRight, HelpCircle } from "lucide-react";
import { usePersona } from "@/components/providers";

type WalkthroughStep = {
  title: string;
  body: string[];
  navigateTo?: string;
  switchToPersona?: string;
  cta: string;
  showTryIt?: boolean;
};

const STEPS: WalkthroughStep[] = [
  {
    title: "AI Call Prep in 30 Seconds",
    body: [
      "Sarah has a negotiation call with MedVista in an hour. Click \"Prep Call\" → pick \"Negotiation\" → select stakeholders → generate.",
      "The AI pulls from 9 sources: deal history, MEDDPICC gaps, transcript analyses, field observations, her SC's expertise, competitive intelligence, manager directives, and resources — to build a brief tailored to THIS meeting.",
    ],
    navigateTo: "medvista",
    showTryIt: true,
    cta: "Next",
  },
  {
    title: "Share Intel, Get Intel Back",
    body: [
      "Sarah types \"security reviews are slowing down every enterprise deal\" in the bar at the bottom. No forms, no categories, no routing.",
      "The AI classifies the signal, asks one follow-up, clusters it with reports from 2 other reps, calculates pipeline at risk, and routes it to Enablement — in 30 seconds.",
    ],
    navigateTo: "/pipeline",
    showTryIt: true,
    cta: "Next",
  },
  {
    title: "Your VP Sees the Pattern",
    body: [
      "Marcus sees real-time patterns from field observations — CompetitorX pricing: CRITICAL. He asks \"Are these deals recoverable?\" and targeted questions go to the 3 AEs with affected deals.",
      "He can also click into any deal and ask deal-specific questions. The system answers from existing data or sends a quick check to the deal owner.",
    ],
    navigateTo: "/intelligence",
    switchToPersona: "Marcus Thompson",
    showTryIt: true,
    cta: "Next",
  },
  {
    title: "Deals Close, the System Learns",
    body: [
      "When NordicCare was lost to Microsoft, the AI read every transcript, observation, and MEDDPICC gap to produce this analysis. Ryan confirmed what was right, added what only he knew.",
      "Every confirmed factor becomes intelligence that feeds future deal warnings, competitive playbooks, and team coaching across the org.",
    ],
    navigateTo: "nordiccare_patient",
    switchToPersona: "Ryan Foster",
    cta: "Explore Nexus",
  },
];

export function WalkthroughOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(-1); // -1 = welcome screen
  const router = useRouter();
  const { allUsers, setCurrentUser } = usePersona();

  useEffect(() => {
    try {
      const seen = localStorage.getItem("nexus_walkthrough_seen");
      if (!seen) setVisible(true);
    } catch {}
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem("nexus_walkthrough_seen", "true"); } catch {}
  }, []);

  const switchPersona = useCallback((name: string) => {
    const user = allUsers.find((u) => u.name === name);
    if (user) setCurrentUser(user);
  }, [allUsers, setCurrentUser]);

  const handleNavigate = useCallback(async (stepData: WalkthroughStep) => {
    if (stepData.switchToPersona) {
      switchPersona(stepData.switchToPersona);
    }

    if (stepData.navigateTo) {
      if (stepData.navigateTo === "medvista" || stepData.navigateTo === "nordiccare_patient") {
        // Resolve deal ID
        try {
          const keyword = stepData.navigateTo === "medvista" ? "MedVista" : "NordicCare — Claude Enterprise for Patient";
          const res = await fetch(`/api/deals/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: keyword }),
          });
          const data = await res.json();
          if (data.deal?.id) {
            router.push(`/pipeline/${data.deal.id}`);
          }
        } catch {
          router.push("/pipeline");
        }
      } else {
        router.push(stepData.navigateTo);
      }
    }
  }, [router, switchPersona]);

  if (!visible) return null;

  // Welcome screen
  if (step === -1) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div
          className="relative w-full max-w-[560px] mx-4 rounded-2xl p-8"
          style={{ background: "#FFFFFF", boxShadow: "0 8px 32px rgba(107,79,57,0.15)" }}
        >
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F5F3EF] transition-colors"
          >
            <X className="h-4 w-4" style={{ color: "#8A8078" }} />
          </button>

          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5" style={{ color: "#E07A5F" }} />
            <span className="text-xl font-semibold" style={{ color: "#3D3833", fontFamily: "DM Sans, sans-serif" }}>
              Welcome to Nexus
            </span>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-sm leading-relaxed" style={{ color: "#3D3833" }}>
              The AI sales platform that turns your team&apos;s hallway conversations into structured organizational intelligence — without anyone filling out a form.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#3D3833" }}>
              One rep input. Multiple downstream effects.{" "}
              <span className="font-medium">Same effort. 10x the organizational value.</span>
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#8A8078" }}>
              You&apos;re viewing a live demo as Sarah Chen, Account Executive on Anthropic&apos;s enterprise sales team.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#8A8078" }}>
              Use the user switcher (top right) to see the same system from different roles — AE, VP, Solutions Architect, and Support Functions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: "#E07A5F" }}
            >
              Take the Tour — 2 min <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={dismiss}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-[#F5F3EF]"
              style={{ color: "#8A8078" }}
            >
              Explore on my own
            </button>
          </div>

          <p className="mt-6 text-xs" style={{ color: "#B5ADA5" }}>
            Built by Jeff Lackey · jefflackey@gmail.com
          </p>
        </div>
      </div>
    );
  }

  // Tour step
  const currentStep = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="relative w-full max-w-[560px] mx-4 rounded-2xl p-8"
        style={{ background: "#FFFFFF", boxShadow: "0 8px 32px rgba(107,79,57,0.15)" }}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F5F3EF] transition-colors"
        >
          <X className="h-4 w-4" style={{ color: "#8A8078" }} />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          <span className="text-xs font-medium" style={{ color: "#8A8078" }}>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <h2 className="text-lg font-semibold mb-4" style={{ color: "#3D3833", fontFamily: "DM Sans, sans-serif" }}>
          {currentStep.title}
        </h2>

        <div className="space-y-3 mb-8">
          {currentStep.body.map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: "#3D3833" }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 16 : 6,
                background: i === step ? "#E07A5F" : i < step ? "#E07A5F" : "#E8E5E0",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {currentStep.showTryIt && (
            <button
              onClick={() => {
                handleNavigate(currentStep);
                dismiss();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ background: "#E07A5F" }}
            >
              Try It <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              handleNavigate(currentStep);
              if (isLast) {
                dismiss();
              } else {
                setStep(step + 1);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentStep.showTryIt ? "hover:bg-[#F5F3EF]" : "text-white hover:opacity-90"
            }`}
            style={currentStep.showTryIt ? { color: "#8A8078" } : { background: "#E07A5F" }}
          >
            {currentStep.cta} {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TourButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem("nexus_walkthrough_seen");
      if (seen) setVisible(true);
    } catch {}
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => {
        try { localStorage.removeItem("nexus_walkthrough_seen"); } catch {}
        window.location.reload();
      }}
      className="p-2 rounded-lg hover:bg-[#F5F3EF] transition-colors"
      title="Restart Tour"
    >
      <HelpCircle className="h-4 w-4" style={{ color: "#8A8078" }} />
    </button>
  );
}

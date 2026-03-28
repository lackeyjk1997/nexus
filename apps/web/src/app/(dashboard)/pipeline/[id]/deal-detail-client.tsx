"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Mail,
  MessageSquare,
  Clock,
  Globe,
  Building2,
  Users,
  MapPin,
  Cpu,
  FileText,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Bot,
  ChevronRight,
  Phone,
  Star,
  AlertTriangle,
  Trophy,
  Banknote,
  Target,
  Swords,
  Search,
  UserCheck,
  Sparkles,
  X,
  Copy,
  Check,
  ChevronDown,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { cn, formatCurrency, daysAgo, getHealthColor, getVerticalColor } from "@/lib/utils";
import { STAGE_LABELS, PRODUCT_LABELS, type PipelineStage } from "@nexus/shared";
import { ActivityFeed, type ActivityItem } from "@/components/activity-feed";
import { StageChangeModal } from "@/components/stage-change-modal";
import { ObservationInput } from "@/components/observation-input";
import { usePersona } from "@/components/providers";

// ── Types ──

type Deal = {
  id: string;
  name: string;
  stage: string;
  dealValue: string | null;
  currency: string | null;
  closeDate: Date | null;
  winProbability: number | null;
  forecastCategory: string | null;
  vertical: string;
  product: string | null;
  leadSource: string | null;
  competitor: string | null;
  stageEnteredAt: Date | null;
  createdAt: Date;
  companyId: string;
  companyName: string | null;
  companyDomain: string | null;
  companyIndustry: string | null;
  companyEmployeeCount: number | null;
  companyRevenue: string | null;
  companyHq: string | null;
  companyTechStack: string[] | null;
  companyDescription: string | null;
  aeName: string | null;
  aeId: string | null;
};

type Meddpicc = {
  id: string;
  metrics: string | null;
  metricsConfidence: number | null;
  economicBuyer: string | null;
  economicBuyerConfidence: number | null;
  decisionCriteria: string | null;
  decisionCriteriaConfidence: number | null;
  decisionProcess: string | null;
  decisionProcessConfidence: number | null;
  identifyPain: string | null;
  identifyPainConfidence: number | null;
  champion: string | null;
  championConfidence: number | null;
  competition: string | null;
  competitionConfidence: number | null;
  aiExtracted: boolean | null;
  aeConfirmed: boolean | null;
} | null;

type Milestone = {
  id: string;
  milestoneKey: string;
  isCompleted: boolean | null;
  completedAt: Date | null;
  source: string | null;
  evidence: string | null;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  roleInDeal: string | null;
  isPrimary: boolean | null;
};

type Transcript = {
  id: string;
  title: string;
  date: Date;
  durationSeconds: number | null;
  participants: unknown;
  status: string | null;
  analysisSummary: string | null;
  callQualityScore: number | null;
  painPoints: unknown;
  nextSteps: unknown;
  talkRatio: unknown;
  coachingInsights: unknown;
};

type StageHistoryItem = {
  id: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string;
  reason: string | null;
  createdAt: Date;
};

type TabKey = "overview" | "meddpicc" | "stakeholders" | "activity" | "calls";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "meddpicc", label: "MEDDPICC" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "activity", label: "Activity" },
  { key: "calls", label: "Calls" },
];

const STAGES_ORDER: PipelineStage[] = [
  "new_lead", "qualified", "discovery", "technical_validation",
  "proposal", "negotiation", "closing", "closed_won", "closed_lost",
];

// ── Call Brief Types ──

type CallBrief = {
  headline: string;
  deal_snapshot: { stage: string; value: string; days_in_stage: string; health: string; health_reason: string };
  stakeholders_in_play: Array<{ name: string; title: string; role: string; engagement: string; last_contact: string | null; notes: string }>;
  talking_points: Array<{ topic: string; why: string; approach: string }>;
  questions_to_ask: Array<{ question: string; purpose: string; meddpicc_gap: string | null }>;
  risks_and_landmines: Array<{ risk: string; source: string; mitigation: string }>;
  team_intelligence: string[];
  competitive_context: string | null;
  suggested_resources?: Array<{ title: string; type: string; why: string }>;
  suggested_next_steps: string[];
};

// ── Collapsible Section ──

function BriefSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2"
        style={{ color: "#3D3833" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">{title}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open ? "rotate-180" : "")} style={{ color: "#8A8078" }} />
      </button>
      {open && children}
    </div>
  );
}

// ── Main Component ──

type DealObservation = {
  id: string;
  rawInput: string;
  status: string | null;
  aiClassification: unknown;
  arrImpact: unknown;
  clusterId: string | null;
  createdAt: Date;
  observerName: string | null;
};

export function DealDetailClient({
  deal,
  meddpicc,
  milestones,
  contacts,
  activities,
  transcripts,
  stageHistory,
  dealObservations = [],
}: {
  deal: Deal;
  meddpicc: Meddpicc;
  milestones: Milestone[];
  contacts: Contact[];
  activities: ActivityItem[];
  transcripts: Transcript[];
  stageHistory: StageHistoryItem[];
  dealObservations?: DealObservation[];
}) {
  // Merge observations into the activity list
  const observationActivities: ActivityItem[] = dealObservations.map((obs) => {
    const classification = obs.aiClassification as { signals?: Array<{ type: string }> } | null;
    const signalType = classification?.signals?.[0]?.type || "field_intelligence";
    const arrData = obs.arrImpact as { total_value?: number } | null;
    const arrText = arrData?.total_value ? ` — €${(arrData.total_value / 1000).toFixed(0)}K at risk` : "";

    return {
      id: `obs-${obs.id}`,
      type: "observation" as string,
      subject: `Field Intel: ${obs.rawInput.slice(0, 80)}${obs.rawInput.length > 80 ? "…" : ""}`,
      description: `Signal: ${signalType.replace(/_/g, " ")}${arrText}`,
      createdAt: obs.createdAt,
      teamMemberName: obs.observerName,
    };
  });

  const mergedActivities = [...activities, ...observationActivities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [callPrepPhase, setCallPrepPhase] = useState<"hidden" | "loading" | "result" | "error">("hidden");
  const [callBrief, setCallBrief] = useState<CallBrief | null>(null);
  const [callPrepSections, setCallPrepSections] = useState<Record<string, boolean>>({});
  const [briefCopied, setBriefCopied] = useState(false);
  const [briefSaved, setBriefSaved] = useState(false);

  // Email draft state
  const [draftPhase, setDraftPhase] = useState<"hidden" | "loading" | "result" | "error">("hidden");
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string; to: string; notes_for_rep: string } | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [draftContext, setDraftContext] = useState("");

  const { currentUser } = usePersona();

  const daysInStage = deal.stageEnteredAt ? daysAgo(deal.stageEnteredAt) : 0;
  const health = getHealthColor(daysInStage, deal.stage);
  const vertColor = getVerticalColor(deal.vertical);
  const winProb = deal.winProbability ?? 0;

  async function handlePrepCall() {
    if (!currentUser) return;
    setCallPrepPhase("loading");
    try {
      const res = await fetch("/api/agent/call-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          accountId: deal.companyId,
          memberId: currentUser.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCallBrief(data.brief);
        setCallPrepPhase("result");
      } else {
        setCallPrepPhase("error");
      }
    } catch {
      setCallPrepPhase("error");
    }
  }

  async function saveBriefToDeal() {
    if (!currentUser || !callBrief || briefSaved) return;
    await fetch("/api/agent/save-to-deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: deal.id,
        memberId: currentUser.id,
        title: `AI Call Prep — ${deal.companyName}`,
        description: `Call brief generated. Key focus: ${callBrief.headline}`,
      }),
    }).catch(() => {});
    setBriefSaved(true);
  }

  async function handleDraftFollowUp(additionalCtx?: string) {
    if (!currentUser) return;
    setDraftPhase("loading");
    setEmailSaved(false);

    // Build context from the most recent transcript analysis
    const latestTranscript = transcripts[0];
    const analysisContext = latestTranscript?.analysisSummary
      ? `Call: ${latestTranscript.title}. Summary: ${latestTranscript.analysisSummary}. Pain points: ${JSON.stringify(latestTranscript.painPoints || [])}. Next steps: ${JSON.stringify(latestTranscript.nextSteps || [])}`
      : undefined;

    try {
      const res = await fetch("/api/agent/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "follow_up",
          dealId: deal.id,
          accountId: deal.companyId,
          memberId: currentUser.id,
          additionalContext: [analysisContext, additionalCtx].filter(Boolean).join(". ") || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data.draft);
        setEditedSubject(data.draft.subject);
        setEditedBody(data.draft.body);
        setDraftPhase("result");
        setDraftContext("");
      } else {
        setDraftPhase("error");
      }
    } catch {
      setDraftPhase("error");
    }
  }

  async function handleDraftForTranscript(transcript: Transcript) {
    if (!currentUser) return;
    setDraftPhase("loading");
    setEmailSaved(false);

    const analysisContext = transcript.analysisSummary
      ? `Call: ${transcript.title}. Summary: ${transcript.analysisSummary}. Pain points: ${JSON.stringify(transcript.painPoints || [])}. Next steps: ${JSON.stringify(transcript.nextSteps || [])}`
      : `Call: ${transcript.title}`;

    try {
      const res = await fetch("/api/agent/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "follow_up",
          dealId: deal.id,
          accountId: deal.companyId,
          memberId: currentUser.id,
          additionalContext: analysisContext,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data.draft);
        setEditedSubject(data.draft.subject);
        setEditedBody(data.draft.body);
        setDraftPhase("result");
        setDraftContext("");
      } else {
        setDraftPhase("error");
      }
    } catch {
      setDraftPhase("error");
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`).catch(() => {});
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  async function saveEmailToDeal() {
    if (!currentUser || !emailDraft || emailSaved) return;
    await fetch("/api/agent/save-to-deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealId: deal.id,
        memberId: currentUser.id,
        title: `Follow-up email drafted${emailDraft.to ? ` for ${emailDraft.to}` : ""}`,
        description: `Subject: ${editedSubject}`,
      }),
    }).catch(() => {});
    setEmailSaved(true);
  }

  async function copyBrief() {
    if (!callBrief) return;
    const text = `CALL BRIEF — ${deal.companyName}\n\n${callBrief.headline}\n\nTalking Points:\n${callBrief.talking_points.map((tp, i) => `${i + 1}. ${tp.topic}: ${tp.approach}`).join("\n")}\n\nQuestions:\n${callBrief.questions_to_ask.map((q, i) => `${i + 1}. ${q.question}`).join("\n")}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setBriefCopied(true);
    setTimeout(() => setBriefCopied(false), 2000);
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Back button */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      {/* Header Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">
                {deal.companyName}
              </h1>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: vertColor + "15",
                  color: vertColor,
                }}
              >
                {deal.vertical.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{deal.name}</p>

            <div className="flex items-center gap-6 mt-4 flex-wrap">
              {/* Deal Value */}
              <div>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(Number(deal.dealValue || 0), deal.currency || "EUR")}
                </p>
              </div>

              {/* Stage Badge — clickable */}
              <button
                onClick={() => setStageModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-primary-light text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {STAGE_LABELS[deal.stage as PipelineStage] ?? deal.stage}
              </button>

              {/* Win Probability */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: winProb >= 70 ? "#2D8A4E" : winProb >= 40 ? "#D4A843" : "#C74B3B",
                    color: winProb >= 70 ? "#2D8A4E" : winProb >= 40 ? "#D4A843" : "#C74B3B",
                  }}
                >
                  <span className="text-xs font-bold">{winProb}</span>
                </div>
                <span className="text-xs text-muted-foreground">Win %</span>
              </div>

              {/* Health */}
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    health === "success" && "bg-success",
                    health === "warning" && "bg-warning",
                    health === "danger" && "bg-danger"
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {daysInStage}d in stage
                </span>
              </div>

              {/* AE */}
              {deal.aeName && (
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-primary">
                      {deal.aeName.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{deal.aeName}</span>
                </div>
              )}

              {/* Close Date */}
              {deal.closeDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Close{" "}
                    {new Date(deal.closeDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handlePrepCall}
              disabled={callPrepPhase === "loading"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: callPrepPhase === "error" ? "rgba(199,75,59,0.1)" : callPrepPhase !== "hidden" ? "rgba(224,122,95,0.12)" : "#F3EDE7",
                color: callPrepPhase === "error" ? "#C74B3B" : callPrepPhase !== "hidden" ? "#E07A5F" : "#8A8078",
                border: "1px solid " + (callPrepPhase === "error" ? "rgba(199,75,59,0.3)" : callPrepPhase !== "hidden" ? "rgba(224,122,95,0.3)" : "#E8E5E0"),
              }}
            >
              {callPrepPhase === "loading" ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }} />
                  Prepping…
                </>
              ) : callPrepPhase === "error" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed — try again
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Prep Call
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (transcripts.length === 0) return;
                handleDraftFollowUp();
              }}
              disabled={draftPhase === "loading" || transcripts.length === 0}
              title={transcripts.length === 0 ? "No recent calls to reference" : "Draft a follow-up email"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: draftPhase === "error" ? "rgba(199,75,59,0.1)" : draftPhase !== "hidden" ? "rgba(224,122,95,0.12)" : "#F3EDE7",
                color: transcripts.length === 0 ? "#C4BDB5" : draftPhase === "error" ? "#C74B3B" : draftPhase !== "hidden" ? "#E07A5F" : "#8A8078",
                border: "1px solid " + (draftPhase === "error" ? "rgba(199,75,59,0.3)" : draftPhase !== "hidden" ? "rgba(224,122,95,0.3)" : "#E8E5E0"),
                cursor: transcripts.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {draftPhase === "loading" ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }} />
                  Drafting…
                </>
              ) : draftPhase === "error" ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed — try again
                </>
              ) : (
                <>
                  <Mail className="h-3.5 w-3.5" />
                  Draft Follow-Up
                </>
              )}
            </button>
            {[
              { icon: Calendar, label: "Schedule Meeting" },
              { icon: MessageSquare, label: "Add Note" },
            ].map((action) => (
              <button
                key={action.label}
                title={action.label}
                className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
              >
                <action.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="mt-6 flex items-center gap-1">
          {STAGES_ORDER.filter((s) => s !== "closed_lost").map((stage) => {
            const currentIdx = STAGES_ORDER.indexOf(deal.stage as PipelineStage);
            const stageIdx = STAGES_ORDER.indexOf(stage);
            const isActive = stageIdx <= currentIdx;
            const isCurrent = stage === deal.stage;
            return (
              <div key={stage} className="flex-1 relative group">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    isCurrent
                      ? "bg-primary"
                      : isActive
                        ? "bg-primary/40"
                        : "bg-border"
                  )}
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Call Prep Panel */}
      {callPrepPhase === "result" && callBrief && (
        <div
          className="bg-card rounded-xl border overflow-hidden animate-[fadeSlideUp_0.35s_ease]"
          style={{ borderColor: "rgba(224,122,95,0.2)" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid rgba(224,122,95,0.12)", background: "rgba(224,122,95,0.04)" }}
          >
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#E07A5F" }} />
            <span className="text-sm font-semibold" style={{ color: "#3D3833" }}>
              Call Brief — {deal.companyName}
            </span>
            <button
              onClick={() => { setCallPrepPhase("hidden"); setCallBrief(null); }}
              className="ml-auto p-0.5 hover:opacity-70"
              style={{ color: "#8A8078" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Headline */}
          <div
            className="mx-5 mt-4 px-4 py-3 rounded-lg"
            style={{ borderLeft: "3px solid #E07A5F", background: "rgba(224,122,95,0.04)" }}
          >
            <p className="text-sm font-medium leading-[1.5]" style={{ color: "#3D3833" }}>
              {callBrief.headline}
            </p>
          </div>

          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Deal Snapshot */}
              <BriefSection title="Deal Snapshot">
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[13px]" style={{ color: "#3D3833" }}>{callBrief.deal_snapshot.stage}</span>
                  <span className="text-[13px] font-semibold" style={{ color: "#3D3833" }}>{callBrief.deal_snapshot.value}</span>
                  <span className="text-[13px]" style={{ color: "#8A8078" }}>{callBrief.deal_snapshot.days_in_stage}</span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: callBrief.deal_snapshot.health === "on_track" ? "rgba(45,138,78,0.1)" : callBrief.deal_snapshot.health === "at_risk" ? "rgba(212,168,67,0.1)" : "rgba(199,75,59,0.1)",
                      color: callBrief.deal_snapshot.health === "on_track" ? "#2D8A4E" : callBrief.deal_snapshot.health === "at_risk" ? "#D4A843" : "#C74B3B",
                    }}
                  >
                    {callBrief.deal_snapshot.health.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[12px] mt-1" style={{ color: "#8A8078" }}>{callBrief.deal_snapshot.health_reason}</p>
              </BriefSection>

              {/* Stakeholders */}
              {callBrief.stakeholders_in_play.length > 0 && (
                <BriefSection title="Stakeholders">
                  <div className="space-y-2 mt-1">
                    {callBrief.stakeholders_in_play.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold"
                          style={{
                            background: s.engagement === "hot" ? "rgba(224,122,95,0.12)" : s.engagement === "warm" ? "rgba(212,168,67,0.12)" : "rgba(107,107,107,0.1)",
                            color: s.engagement === "hot" ? "#E07A5F" : s.engagement === "warm" ? "#D4A843" : "#6B6B6B",
                          }}
                        >
                          {s.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>
                            {s.name} <span className="font-normal" style={{ color: "#8A8078" }}>· {s.role}</span>
                          </p>
                          <p className="text-[12px]" style={{ color: "#8A8078" }}>{s.title}</p>
                          {s.notes && <p className="text-[12px] mt-0.5" style={{ color: "#6B6B6B" }}>{s.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {/* Team Intelligence */}
              {callBrief.team_intelligence.length > 0 && (
                <BriefSection title="💡 Team Intelligence">
                  <div className="space-y-1.5 mt-1">
                    {callBrief.team_intelligence.map((intel, i) => (
                      <div key={i} className="flex gap-2">
                        <span style={{ color: "#E07A5F" }}>·</span>
                        <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{intel}</p>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {/* Competitive */}
              {callBrief.competitive_context && (
                <div className="rounded-lg p-3" style={{ background: "rgba(199,75,59,0.05)", border: "1px solid rgba(199,75,59,0.15)" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: "#C74B3B" }}>Competitive</p>
                  <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{callBrief.competitive_context}</p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Talking Points */}
              {callBrief.talking_points.length > 0 && (
                <BriefSection title="Talking Points">
                  <div className="space-y-2.5 mt-1">
                    {callBrief.talking_points.map((tp, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="text-[12px] font-semibold shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>{i + 1}.</span>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{tp.topic}</p>
                          <p className="text-[12px]" style={{ color: "#8A8078" }}>{tp.approach}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {/* Questions */}
              {callBrief.questions_to_ask.length > 0 && (
                <BriefSection title="Questions to Ask">
                  <div className="space-y-2.5 mt-1">
                    {callBrief.questions_to_ask.map((q, i) => (
                      <div key={i} className="flex gap-2.5">
                        <span className="text-[12px] font-semibold shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>{i + 1}.</span>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>"{q.question}"</p>
                          {q.meddpicc_gap && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(12,116,137,0.1)", color: "#0C7489" }}>
                              → {q.meddpicc_gap}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {/* Risks */}
              {callBrief.risks_and_landmines.length > 0 && (
                <BriefSection title="⚠ Risks">
                  <div className="space-y-2 mt-1">
                    {callBrief.risks_and_landmines.map((r, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.2)" }}>
                        <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{r.risk}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: "#8A8078" }}>{r.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {/* Suggested Resources */}
              {callBrief.suggested_resources && callBrief.suggested_resources.length > 0 && (
                <BriefSection title="Suggested Resources">
                  <div className="space-y-2 mt-1">
                    {callBrief.suggested_resources.map((r, i) => (
                      <div key={i} className="flex gap-2.5 items-start">
                        <FileText className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#0C7489" }} />
                        <div>
                          <p className="text-[12.5px] font-medium" style={{ color: "#0C7489" }}>{r.title}</p>
                          <p className="text-[11px]" style={{ color: "#8A8078" }}>{r.why}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}

              {/* Next Steps */}
              {callBrief.suggested_next_steps.length > 0 && (
                <BriefSection title="Suggested Close">
                  <div className="space-y-1 mt-1">
                    {callBrief.suggested_next_steps.map((step, i) => (
                      <div key={i} className="flex gap-2">
                        <Check className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#2D8A4E" }} />
                        <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </BriefSection>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              onClick={copyBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: briefCopied ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                color: briefCopied ? "#2D8A4E" : "#8A8078",
              }}
            >
              <Copy className="h-3 w-3" />
              {briefCopied ? "Copied!" : "Copy brief"}
            </button>
            <button
              onClick={saveBriefToDeal}
              disabled={briefSaved}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: briefSaved ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                color: briefSaved ? "#2D8A4E" : "#8A8078",
              }}
            >
              <Check className="h-3 w-3" />
              {briefSaved ? "Saved ✓" : "Save to timeline"}
            </button>
            <button
              onClick={handlePrepCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors"
              style={{ color: "#8A8078" }}
            >
              <RotateCcw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Email Draft Panel */}
      {draftPhase === "result" && emailDraft && (
        <div
          className="bg-card rounded-xl border overflow-hidden animate-[fadeSlideUp_0.35s_ease]"
          style={{ borderColor: "rgba(224,122,95,0.2)" }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid rgba(224,122,95,0.12)", background: "rgba(224,122,95,0.04)" }}
          >
            <Mail className="h-4 w-4 shrink-0" style={{ color: "#E07A5F" }} />
            <span className="text-sm font-semibold" style={{ color: "#3D3833" }}>
              Draft Follow-Up{emailDraft.to ? ` — ${emailDraft.to}` : ""}
            </span>
            <button
              onClick={() => { setDraftPhase("hidden"); setEmailDraft(null); }}
              className="ml-auto p-0.5 hover:opacity-70"
              style={{ color: "#8A8078" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-14 shrink-0" style={{ color: "#8A8078" }}>To</span>
              <span className="text-[13px]" style={{ color: "#3D3833" }}>{emailDraft.to}</span>
            </div>
            <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-14 shrink-0" style={{ color: "#8A8078" }}>Subject</span>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[13px]"
                style={{ color: "#3D3833" }}
              />
            </div>
            <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={8}
              className="w-full bg-transparent border-none outline-none text-[13px] leading-[1.6] resize-none"
              style={{ color: "#3D3833" }}
            />
          </div>

          {emailDraft.notes_for_rep && (
            <div
              className="mx-5 mb-3 px-3 py-2 rounded-lg flex items-start gap-2"
              style={{ background: "rgba(224,122,95,0.05)", border: "1px solid rgba(224,122,95,0.15)" }}
            >
              <Lightbulb className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#E07A5F" }} />
              <p className="text-[11.5px] leading-[1.5]" style={{ color: "#8A8078" }}>{emailDraft.notes_for_rep}</p>
            </div>
          )}

          {/* Context input for regeneration */}
          <div className="mx-5 mb-3">
            <input
              type="text"
              value={draftContext}
              onChange={(e) => setDraftContext(e.target.value)}
              placeholder="e.g., mention the security review Tuesday, include the ROI calculator, softer tone..."
              className="w-full px-3 py-2 rounded-lg text-[12px] outline-none"
              style={{ background: "#F9F7F4", border: "1px solid rgba(0,0,0,0.06)", color: "#3D3833" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draftContext.trim()) {
                  handleDraftFollowUp(draftContext.trim());
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: emailCopied ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                color: emailCopied ? "#2D8A4E" : "#8A8078",
              }}
            >
              <Copy className="h-3 w-3" />
              {emailCopied ? "Copied!" : "Copy email"}
            </button>
            <button
              onClick={() => handleDraftFollowUp(draftContext.trim() || undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ background: "#F3EDE7", color: "#8A8078" }}
            >
              <RotateCcw className="h-3 w-3" />
              {draftContext.trim() ? "Regenerate with context" : "Regenerate"}
            </button>
            <button
              onClick={saveEmailToDeal}
              disabled={emailSaved}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: emailSaved ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                color: emailSaved ? "#2D8A4E" : "#8A8078",
              }}
            >
              <Check className="h-3 w-3" />
              {emailSaved ? "Saved ✓" : "Save to deal"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.key === "activity" && activities.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
              {tab.key === "calls" && transcripts.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {transcripts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab deal={deal} milestones={milestones} />
      )}
      {activeTab === "meddpicc" && <MeddpiccTab meddpicc={meddpicc} />}
      {activeTab === "stakeholders" && <StakeholdersTab contacts={contacts} />}
      {activeTab === "activity" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <ActivityFeed activities={mergedActivities} showFilters maxItems={50} />
        </div>
      )}
      {activeTab === "calls" && <CallsTab transcripts={transcripts} onDraftFollowUp={handleDraftForTranscript} />}

      {/* Stage Change Modal */}
      <StageChangeModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        dealId={deal.id}
        companyName={deal.companyName || ""}
        currentStage={deal.stage as PipelineStage}
      />

      {/* Observation Input */}
      <ObservationInput
        context={{
          page: "deal_detail",
          dealId: deal.id,
          accountId: deal.companyId,
          trigger: "manual",
        }}
      />
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ deal, milestones }: { deal: Deal; milestones: Milestone[] }) {
  const MILESTONE_LABELS: Record<string, string> = {
    initial_meeting: "Initial Meeting",
    pain_identified: "Pain Identified",
    champion_identified: "Champion Identified",
    technical_demo: "Technical Demo",
    security_review: "Security Review",
    proposal_sent: "Proposal Sent",
    contract_negotiation: "Contract Negotiation",
  };

  const SOURCE_COLORS: Record<string, string> = {
    manual: "bg-muted text-muted-foreground",
    transcript: "bg-violet-50 text-violet-600",
    email: "bg-blue-50 text-blue-600",
    ai_detected: "bg-primary-light text-primary",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Company Details */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Company Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Globe} label="Domain" value={deal.companyDomain} />
            <InfoRow icon={Building2} label="Industry" value={deal.companyIndustry?.replace("_", " ")} />
            <InfoRow icon={Users} label="Employees" value={deal.companyEmployeeCount?.toLocaleString()} />
            <InfoRow icon={Banknote} label="Revenue" value={deal.companyRevenue} />
            <InfoRow icon={MapPin} label="HQ" value={deal.companyHq} />
          </div>
          {deal.companyTechStack && deal.companyTechStack.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Tech Stack</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deal.companyTechStack.map((tech) => (
                  <span key={tech} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
          {deal.companyDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {deal.companyDescription}
            </p>
          )}
        </div>

        {/* Deal Details */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Deal Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              icon={Target}
              label="Product"
              value={deal.product ? PRODUCT_LABELS[deal.product as keyof typeof PRODUCT_LABELS] : null}
            />
            <InfoRow icon={Search} label="Lead Source" value={deal.leadSource?.replace("_", " ")} />
            <InfoRow icon={Swords} label="Competitor" value={deal.competitor || "None identified"} />
            <InfoRow icon={Target} label="Forecast" value={deal.forecastCategory} />
            <InfoRow icon={Banknote} label="Currency" value={deal.currency} />
            <InfoRow
              icon={Calendar}
              label="Created"
              value={new Date(deal.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Deal Milestones
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                m.isCompleted ? "bg-emerald-50/50" : "bg-muted/30"
              )}
            >
              {m.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium",
                    m.isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {MILESTONE_LABELS[m.milestoneKey] || m.milestoneKey}
                </span>
                {m.evidence && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {m.evidence}
                  </p>
                )}
              </div>
              {m.completedAt && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(m.completedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
              {m.source && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                    SOURCE_COLORS[m.source] || "bg-muted text-muted-foreground"
                  )}
                >
                  {m.source.replace("_", " ")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground capitalize">
        {value || "—"}
      </p>
    </div>
  );
}

// ── MEDDPICC Tab ──

const MEDDPICC_FIELDS = [
  { key: "metrics", confKey: "metricsConfidence", label: "Metrics", icon: Target, description: "Quantifiable measures of the customer's desired business outcome" },
  { key: "economicBuyer", confKey: "economicBuyerConfidence", label: "Economic Buyer", icon: UserCheck, description: "The person with the authority to approve spending" },
  { key: "decisionCriteria", confKey: "decisionCriteriaConfidence", label: "Decision Criteria", icon: FileText, description: "The formal criteria used to evaluate and compare solutions" },
  { key: "decisionProcess", confKey: "decisionProcessConfidence", label: "Decision Process", icon: ArrowLeft, description: "The process the organization uses to make a buying decision" },
  { key: "identifyPain", confKey: "identifyPainConfidence", label: "Identify Pain", icon: AlertTriangle, description: "The primary business pain driving the evaluation" },
  { key: "champion", confKey: "championConfidence", label: "Champion", icon: Star, description: "Internal advocate who sells on your behalf" },
  { key: "competition", confKey: "competitionConfidence", label: "Competition", icon: Swords, description: "Competitive landscape and positioning" },
] as const;

function MeddpiccTab({ meddpicc }: { meddpicc: Meddpicc }) {
  if (!meddpicc) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No MEDDPICC data for this deal yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          MEDDPICC fields will be populated as the deal progresses through discovery.
        </p>
      </div>
    );
  }

  const filledCount = MEDDPICC_FIELDS.filter(
    (f) => meddpicc[f.key as keyof typeof meddpicc]
  ).length;
  const avgConfidence = Math.round(
    MEDDPICC_FIELDS.reduce(
      (sum, f) => sum + Number(meddpicc[f.confKey as keyof typeof meddpicc] || 0),
      0
    ) / MEDDPICC_FIELDS.length
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Fields Completed</p>
            <p className="text-lg font-bold text-foreground">{filledCount}/7</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
            <p className="text-lg font-bold text-foreground">{avgConfidence}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                meddpicc.aeConfirmed
                  ? "bg-emerald-50 text-success"
                  : "bg-primary-light text-primary"
              )}
            >
              {meddpicc.aeConfirmed ? (
                <>
                  <ShieldCheck className="h-3 w-3" /> AE Confirmed
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3" /> AI Extracted
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {MEDDPICC_FIELDS.map((field) => {
          const value = meddpicc[field.key as keyof typeof meddpicc] as string | null;
          const confidence = Number(meddpicc[field.confKey as keyof typeof meddpicc] || 0);
          const Icon = field.icon;
          const isLow = confidence > 0 && confidence < 50;

          return (
            <div
              key={field.key}
              className={cn(
                "bg-card rounded-xl border p-4",
                isLow ? "border-warning/40 bg-amber-50/20" : "border-border"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">
                    {field.label}
                  </h4>
                  {isLow && (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {confidence}%
                  </span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        confidence >= 70
                          ? "bg-success"
                          : confidence >= 40
                            ? "bg-warning"
                            : "bg-danger"
                      )}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              </div>
              {value ? (
                <p className="text-sm text-foreground leading-relaxed">{value}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Not yet captured — {field.description.toLowerCase()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stakeholders Tab ──

const ROLE_COLORS: Record<string, string> = {
  champion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  economic_buyer: "bg-violet-50 text-violet-700 border-violet-200",
  technical_evaluator: "bg-blue-50 text-blue-700 border-blue-200",
  end_user: "bg-cyan-50 text-cyan-700 border-cyan-200",
  blocker: "bg-red-50 text-red-700 border-red-200",
  coach: "bg-amber-50 text-amber-700 border-amber-200",
};

const ROLE_LABELS: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic Buyer",
  technical_evaluator: "Technical Evaluator",
  end_user: "End User",
  blocker: "Blocker",
  coach: "Coach",
};

function StakeholdersTab({ contacts }: { contacts: Contact[] }) {
  const grouped: Record<string, Contact[]> = {};
  contacts.forEach((c) => {
    const role = c.roleInDeal || "unknown";
    if (!grouped[role]) grouped[role] = [];
    grouped[role]!.push(c);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={cn(
              "bg-card rounded-xl border p-4",
              contact.isPrimary ? "border-primary/40 ring-1 ring-primary/10" : "border-border"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.isPrimary && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-light text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{contact.title}</p>
                </div>
              </div>
              {contact.roleInDeal && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    ROLE_COLORS[contact.roleInDeal] || "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {ROLE_LABELS[contact.roleInDeal] || contact.roleInDeal}
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{contact.phone}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calls Tab ──

function CallsTab({ transcripts, onDraftFollowUp }: { transcripts: Transcript[]; onDraftFollowUp: (t: Transcript) => void }) {
  if (transcripts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No call transcripts for this deal yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcripts.map((t) => {
        const duration = t.durationSeconds
          ? `${Math.floor(t.durationSeconds / 60)}m ${t.durationSeconds % 60}s`
          : "—";
        const participants = (t.participants as { name: string; role: string }[]) || [];
        const painPoints = (t.painPoints as string[]) || [];
        const nextSteps = (t.nextSteps as string[]) || [];
        const talkRatio = t.talkRatio as { ae?: number; prospect?: number } | null;
        const coaching = (t.coachingInsights as string[]) || [];

        return (
          <div key={t.id} className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Call Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {duration}
                    </span>
                    <div className="flex items-center gap-1">
                      {participants.map((p, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.callQualityScore != null && (
                    <div
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-sm font-bold",
                        t.callQualityScore >= 80
                          ? "bg-emerald-50 text-success"
                          : t.callQualityScore >= 60
                            ? "bg-amber-50 text-warning"
                            : "bg-red-50 text-danger"
                      )}
                    >
                      {t.callQualityScore}
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      t.status === "complete"
                        ? "bg-emerald-50 text-success"
                        : "bg-amber-50 text-warning"
                    )}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis */}
            {t.analysisSummary && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-foreground leading-relaxed">
                  {t.analysisSummary}
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {/* Talk Ratio */}
                  {talkRatio && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Talk Ratio</p>
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary"
                          style={{ width: `${talkRatio.ae || 50}%` }}
                        />
                        <div
                          className="bg-warning"
                          style={{ width: `${talkRatio.prospect || 50}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-primary">AE {talkRatio.ae}%</span>
                        <span className="text-[10px] text-warning">Prospect {talkRatio.prospect}%</span>
                      </div>
                    </div>
                  )}

                  {/* Pain Points */}
                  {painPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Pain Points</p>
                      <ul className="space-y-1">
                        {painPoints.slice(0, 3).map((p, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1">
                            <span className="text-danger mt-0.5">·</span>
                            <span className="line-clamp-2">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next Steps */}
                  {nextSteps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Next Steps</p>
                      <ul className="space-y-1">
                        {nextSteps.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1">
                            <ChevronRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Coaching Insights */}
                {coaching.length > 0 && (
                  <div className="bg-primary-light/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      Coaching Insights
                    </p>
                    <ul className="space-y-1">
                      {coaching.map((c, i) => (
                        <li key={i} className="text-xs text-foreground">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <button
                    onClick={() => onDraftFollowUp(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                    style={{ background: "rgba(224,122,95,0.08)", color: "#E07A5F", border: "1px solid rgba(224,122,95,0.2)" }}
                  >
                    <Sparkles className="h-3 w-3" />
                    Draft Follow-Up
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

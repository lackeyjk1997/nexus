"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  FileText,
  Share2,
  Sparkles,
  Eye,
  AudioLines,
  ChevronDown,
  ExternalLink,
  X,
  Check,
  Lightbulb,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  type: string;
  subject: string | null;
  description: string | null;
  createdAt: Date | string;
  teamMemberName: string | null;
  teamMemberRole?: string | null;
  dealName?: string | null;
  companyName?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ActivityMeta = Record<string, unknown>;

/**
 * Fallback for old data that hasn't been migrated.
 * New data uses real enum types directly — no translation needed.
 */
function getEffectiveType(activity: ActivityItem): string {
  // If the type is already a real enum value (post-migration), use it directly
  if (activity.type !== "note_added") return activity.type;

  // Fallback: old data stored as note_added with metadata.source
  const meta = activity.metadata as ActivityMeta | null;
  if (meta?.source === "call_prep") return "call_prep";
  if (meta?.source === "call_analysis") return "call_analysis";
  if (meta?.source === "email_draft") return "email_draft";
  if (meta?.source === "agent_action") return "agent_action";
  return "note_added";
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  email_sent: Mail,
  email_received: Mail,
  call_completed: Phone,
  meeting_scheduled: Calendar,
  meeting_completed: Calendar,
  note_added: MessageSquare,
  stage_changed: ArrowRight,
  task_completed: CheckCircle,
  document_shared: Share2,
  observation: Eye,
  call_analysis: AudioLines,
  call_prep: Sparkles,
  agent_action: Sparkles,
  agent_feedback: Sparkles,
  competitive_intel: AlertTriangle,
  email_draft: Sparkles,
};

const ACTIVITY_COLORS: Record<string, string> = {
  email_sent: "bg-blue-50 text-blue-600",
  email_received: "bg-blue-50 text-blue-600",
  call_completed: "bg-emerald-50 text-emerald-600",
  meeting_scheduled: "bg-[#E6F4F7] text-[#0C7489]",
  meeting_completed: "bg-[#E6F4F7] text-[#0C7489]",
  note_added: "bg-stone-100 text-stone-500",
  stage_changed: "bg-amber-50 text-amber-600",
  task_completed: "bg-emerald-50 text-emerald-600",
  document_shared: "bg-cyan-50 text-cyan-600",
  observation: "bg-[#FDF0ED] text-[#D4735E]",
  call_analysis: "bg-[#FDF0ED] text-[#D4735E]",
  call_prep: "bg-[#FDF0ED] text-[#D4735E]",
  agent_action: "bg-[#FDF0ED] text-[#D4735E]",
  agent_feedback: "bg-[#FDF0ED] text-[#D4735E]",
  competitive_intel: "bg-[#FDF0ED] text-[#D4735E]",
  email_draft: "bg-[#FDF0ED] text-[#D4735E]",
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "email", label: "Emails" },
  { key: "call", label: "Calls" },
  { key: "meeting", label: "Meetings" },
  { key: "note", label: "Notes" },
  { key: "ai", label: "AI" },
] as const;

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function isExpandable(activity: ActivityItem): boolean {
  const t = getEffectiveType(activity);
  const expandableTypes = [
    "call_completed", "email_sent", "email_received", "note_added",
    "call_analysis", "call_prep", "agent_action", "email_draft",
    "observation", "agent_feedback", "competitive_intel",
  ];
  if (expandableTypes.includes(t)) return true;
  if (activity.description && activity.description.length > 60) return true;
  return false;
}

// ── Call Brief type for the full brief modal ──
type CallBriefData = {
  headline?: string;
  deal_snapshot?: { stage: string; value: string; days_in_stage: string; health: string; health_reason: string };
  stakeholders_in_play?: Array<{ name: string; title: string; role: string; engagement: string; last_contact: string | null; notes: string }>;
  talking_points?: Array<{ topic: string; why?: string; approach?: string }>;
  questions_to_ask?: Array<{ question: string; purpose?: string; meddpicc_gap?: string | null }>;
  risks_and_landmines?: Array<{ risk: string; source?: string; mitigation?: string }>;
  team_intelligence?: string[];
  competitive_context?: string | null;
  suggested_resources?: Array<{ title: string; type?: string; why?: string }>;
  suggested_next_steps?: string[];
};

// ── Full Brief Modal ──
function FullBriefModal({ brief, prepContext, onClose }: { brief: CallBriefData; prepContext?: string; onClose: () => void }) {
  const hasSections = brief.stakeholders_in_play?.length || brief.talking_points?.length || brief.questions_to_ask?.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        style={{ border: "1px solid rgba(224,122,95,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-5 py-3 rounded-t-xl" style={{ borderBottom: "1px solid rgba(224,122,95,0.12)", background: "#FFFBF9" }}>
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#E07A5F" }} />
          <span className="text-sm font-semibold" style={{ color: "#3D3833" }}>
            Call Brief{prepContext ? ` — ${prepContext}` : ""}
          </span>
          <button onClick={onClose} className="ml-auto p-1 hover:opacity-70 rounded-lg hover:bg-[#F3EDE7]" style={{ color: "#8A8078" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Headline */}
        {brief.headline && (
          <div className="mx-5 mt-4 px-4 py-3 rounded-lg" style={{ borderLeft: "3px solid #E07A5F", background: "rgba(224,122,95,0.04)" }}>
            <p className="text-sm font-medium leading-[1.5]" style={{ color: "#3D3833" }}>{brief.headline}</p>
          </div>
        )}

        {!hasSections && !brief.headline && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm" style={{ color: "#8A8078" }}>Full brief not available for older entries</p>
          </div>
        )}

        <div className="px-5 py-4 space-y-5">
          {/* Deal Snapshot */}
          {brief.deal_snapshot && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Deal Snapshot</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-[13px]" style={{ color: "#3D3833" }}>{brief.deal_snapshot.stage}</span>
                <span className="text-[13px] font-semibold" style={{ color: "#3D3833" }}>{brief.deal_snapshot.value}</span>
                <span className="text-[13px]" style={{ color: "#8A8078" }}>{brief.deal_snapshot.days_in_stage}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{
                  background: brief.deal_snapshot.health === "on_track" ? "rgba(45,138,78,0.1)" : brief.deal_snapshot.health === "at_risk" ? "rgba(212,168,67,0.1)" : "rgba(199,75,59,0.1)",
                  color: brief.deal_snapshot.health === "on_track" ? "#2D8A4E" : brief.deal_snapshot.health === "at_risk" ? "#D4A843" : "#C74B3B",
                }}>{brief.deal_snapshot.health.replace("_", " ")}</span>
              </div>
              <p className="text-[12px] mt-1" style={{ color: "#8A8078" }}>{brief.deal_snapshot.health_reason}</p>
            </div>
          )}

          {/* Stakeholders */}
          {brief.stakeholders_in_play && brief.stakeholders_in_play.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Stakeholders</p>
              <div className="space-y-2">
                {brief.stakeholders_in_play.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-semibold" style={{
                      background: s.engagement === "hot" ? "rgba(224,122,95,0.12)" : s.engagement === "warm" ? "rgba(212,168,67,0.12)" : "rgba(107,107,107,0.1)",
                      color: s.engagement === "hot" ? "#E07A5F" : s.engagement === "warm" ? "#D4A843" : "#6B6B6B",
                    }}>
                      {s.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{s.name} <span className="font-normal" style={{ color: "#8A8078" }}>· {s.role}</span></p>
                      <p className="text-[12px]" style={{ color: "#8A8078" }}>{s.title}</p>
                      {s.notes && <p className="text-[12px] mt-0.5" style={{ color: "#6B6B6B" }}>{s.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Talking Points */}
          {brief.talking_points && brief.talking_points.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Talking Points</p>
              <div className="space-y-2.5">
                {brief.talking_points.map((tp, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="text-[12px] font-semibold shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>{i + 1}.</span>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{tp.topic}</p>
                      {tp.approach && <p className="text-[12px]" style={{ color: "#8A8078" }}>{tp.approach}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions to Ask */}
          {brief.questions_to_ask && brief.questions_to_ask.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Questions to Ask</p>
              <div className="space-y-2.5">
                {brief.questions_to_ask.map((q, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="text-[12px] font-semibold shrink-0 mt-0.5" style={{ color: "#E07A5F" }}>{i + 1}.</span>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>"{q.question}"</p>
                      {q.meddpicc_gap && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(12,116,137,0.1)", color: "#0C7489" }}>→ {q.meddpicc_gap}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {brief.risks_and_landmines && brief.risks_and_landmines.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Risks</p>
              <div className="space-y-2">
                {brief.risks_and_landmines.map((r, i) => (
                  <div key={i} className="rounded-lg p-3" style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.2)" }}>
                    <p className="text-[13px] font-medium" style={{ color: "#3D3833" }}>{r.risk}</p>
                    {r.mitigation && <p className="text-[12px] mt-0.5" style={{ color: "#8A8078" }}>{r.mitigation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Intelligence */}
          {brief.team_intelligence && brief.team_intelligence.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Team Intelligence</p>
              <div className="space-y-1.5">
                {brief.team_intelligence.map((intel, i) => (
                  <div key={i} className="flex gap-2">
                    <span style={{ color: "#E07A5F" }}>·</span>
                    <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{intel}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitive Context */}
          {brief.competitive_context && (
            <div className="rounded-lg p-3" style={{ background: "rgba(199,75,59,0.05)", border: "1px solid rgba(199,75,59,0.15)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1" style={{ color: "#C74B3B" }}>Competitive</p>
              <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{brief.competitive_context}</p>
            </div>
          )}

          {/* Suggested Resources */}
          {brief.suggested_resources && brief.suggested_resources.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Suggested Resources</p>
              <div className="space-y-2">
                {brief.suggested_resources.map((r, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <FileText className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#0C7489" }} />
                    <div>
                      <p className="text-[12.5px] font-medium" style={{ color: "#0C7489" }}>{r.title}</p>
                      {r.why && <p className="text-[11px]" style={{ color: "#8A8078" }}>{r.why}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Next Steps */}
          {brief.suggested_next_steps && brief.suggested_next_steps.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "#3D3833" }}>Suggested Close</p>
              <div className="space-y-1">
                {brief.suggested_next_steps.map((step, i) => (
                  <div key={i} className="flex gap-2">
                    <Check className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#2D8A4E" }} />
                    <p className="text-[12.5px] leading-[1.5]" style={{ color: "#3D3833" }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity Detail ──

function ActivityDetail({ activity, onViewBrief }: { activity: ActivityItem; onViewBrief?: (brief: CallBriefData, prepContext?: string) => void }) {
  const meta = activity.metadata as ActivityMeta | null;
  const t = getEffectiveType(activity);

  switch (t) {
    case "call_analysis": {
      const painPoints = meta?.painPoints as string[] | undefined;
      const nextSteps = meta?.nextSteps as string[] | undefined;
      const score = meta?.score as number | undefined;
      return (
        <div className="space-y-3">
          {score && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#6B6B6B]">Call Score</span>
              <span className={cn("text-sm font-semibold", score >= 70 ? "text-[#2D8A4E]" : score >= 50 ? "text-[#D4A843]" : "text-[#C74B3B]")}>
                {score}/100
              </span>
            </div>
          )}
          {activity.description && <p className="text-sm text-[#3D3833]">{activity.description}</p>}
          {painPoints && painPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6B6B6B] mb-1">Pain Points</p>
              <ul className="space-y-1">
                {painPoints.map((p, i) => (
                  <li key={i} className="text-sm text-[#3D3833] flex items-start gap-2">
                    <span className="text-[#D4735E] mt-1 shrink-0">•</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {nextSteps && nextSteps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6B6B6B] mb-1">Next Steps</p>
              <ul className="space-y-1">
                {nextSteps.map((s, i) => (
                  <li key={i} className="text-sm text-[#3D3833] flex items-start gap-2">
                    <span className="text-[#0C7489] mt-1 shrink-0">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case "call_prep": {
      const brief = meta?.brief as CallBriefData | undefined;
      const prepCtx = meta?.prepContext as string | undefined;
      const hasBrief = brief && (brief.talking_points?.length || brief.stakeholders_in_play?.length || brief.questions_to_ask?.length);
      return (
        <div className="space-y-3">
          {prepCtx && <p className="text-xs text-[#8A8078]">Prep for: {prepCtx}</p>}
          {brief?.headline && <p className="text-sm font-medium text-[#3D3833]">{brief.headline}</p>}
          {brief?.talking_points && brief.talking_points.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6B6B6B] mb-1">Key Talking Points</p>
              <ul className="space-y-1">
                {brief.talking_points.slice(0, 3).map((tp, i) => (
                  <li key={i} className="text-sm text-[#3D3833] flex items-start gap-2">
                    <span className="text-[#E07A5F] mt-0.5 shrink-0 text-xs font-semibold">{i + 1}.</span>{tp.topic}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief?.risks_and_landmines?.[0] && (
            <p className="text-sm text-[#C74B3B] flex items-start gap-1.5">
              <span className="shrink-0">⚠</span>{brief.risks_and_landmines[0].risk}
            </p>
          )}
          {hasBrief && onViewBrief && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewBrief(brief, prepCtx); }}
              className="flex items-center gap-1.5 text-[12px] font-medium mt-1 transition-colors hover:opacity-80"
              style={{ color: "#E07A5F" }}
            >
              View full brief <ExternalLink className="h-3 w-3" />
            </button>
          )}
          {!brief && activity.description && <p className="text-sm text-[#3D3833]">{activity.description}</p>}
        </div>
      );
    }

    case "agent_action": {
      const headline = meta?.headline as string | undefined;
      return (
        <div className="space-y-2">
          {headline && <p className="text-sm text-[#D4735E] font-medium">{headline}</p>}
          {activity.description && <p className="text-sm text-[#3D3833]">{activity.description}</p>}
        </div>
      );
    }

    case "email_draft": {
      const emailSubject = meta?.subject as string | undefined;
      const emailBody = meta?.body as string | undefined;
      const emailTo = meta?.to as string | undefined;
      return (
        <div className="space-y-2">
          {emailTo && <p className="text-xs text-[#8A8078]">To: {emailTo}</p>}
          {emailSubject && <p className="text-sm font-medium text-[#3D3833]">Subject: {emailSubject}</p>}
          {emailBody ? (
            <div className="max-h-[400px] overflow-y-auto">
              <p className="text-sm text-[#3D3833] whitespace-pre-line leading-relaxed">{emailBody}</p>
            </div>
          ) : activity.description ? (
            <p className="text-sm text-[#3D3833]">{activity.description}</p>
          ) : null}
        </div>
      );
    }

    case "call_completed": {
      const duration = meta?.duration as string | undefined;
      const participants = meta?.participants as string[] | undefined;
      return (
        <div className="space-y-2">
          {(duration || participants) && (
            <div className="flex items-center gap-3 text-xs text-[#6B6B6B]">
              {duration && <span>Duration: {duration}</span>}
              {participants && <span>• {participants.join(", ")}</span>}
            </div>
          )}
          {activity.description && <p className="text-sm text-[#3D3833]">{activity.description}</p>}
        </div>
      );
    }

    case "meeting_scheduled":
    case "meeting_completed": {
      const attendees = meta?.attendees as string[] | undefined;
      return (
        <div className="space-y-2">
          {attendees && <div className="text-xs text-[#6B6B6B]">Attendees: {attendees.join(", ")}</div>}
          {activity.description && <p className="text-sm text-[#3D3833]">{activity.description}</p>}
        </div>
      );
    }

    default:
      return activity.description ? <p className="text-sm text-[#3D3833]">{activity.description}</p> : null;
  }
}

export function ActivityFeed({
  activities,
  showFilters = false,
  showCompany = false,
  maxItems,
}: {
  activities: ActivityItem[];
  showFilters?: boolean;
  showCompany?: boolean;
  maxItems?: number;
}) {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [briefModal, setBriefModal] = useState<{ brief: CallBriefData; prepContext?: string } | null>(null);

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    const t = getEffectiveType(a);
    if (filter === "email") return t === "email_sent" || t === "email_received" || t === "email_draft";
    if (filter === "call") return t === "call_completed" || t === "call_analysis";
    if (filter === "meeting") return t === "meeting_scheduled" || t === "meeting_completed";
    if (filter === "note") return t === "note_added";
    if (filter === "ai") return ["call_prep", "email_draft", "call_analysis", "agent_action", "agent_feedback", "observation", "competitive_intel"].includes(t);
    return true;
  });

  const displayed = maxItems ? filtered.slice(0, maxItems) : filtered;

  return (
    <div>
      {showFilters && (
        <div className="flex items-center gap-1.5 mb-4">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === opt.key
                  ? "bg-[#3D3833] text-white"
                  : "bg-[#F5F3EF] text-[#6B6B6B] hover:bg-[#E8DDD3] hover:text-[#3D3833]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-[#E8E5E0]" />

        <div className="space-y-0">
          {displayed.map((activity) => {
            const t = getEffectiveType(activity);
            const Icon = ACTIVITY_ICONS[t] || FileText;
            const colorClass = ACTIVITY_COLORS[t] || "bg-stone-100 text-stone-400";
            const canExpand = isExpandable(activity);
            const isExpanded = expandedId === activity.id;

            return (
              <div
                key={activity.id}
                className={cn(
                  "relative flex flex-col py-3 px-1 rounded-lg transition-colors",
                  canExpand && "cursor-pointer hover:bg-[#F5F3EF]/60",
                  isExpanded && "bg-[#F5F3EF]/40"
                )}
                onClick={() => canExpand && setExpandedId(isExpanded ? null : activity.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("relative z-10 h-[38px] w-[38px] rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-[#1A1A1A] leading-snug">
                      {activity.subject || activity.description || "Activity"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {activity.teamMemberName && <span className="text-xs text-[#6B6B6B]">{activity.teamMemberName}</span>}
                      {showCompany && activity.companyName && (
                        <>
                          <span className="text-xs text-[#6B6B6B]">·</span>
                          <span className="text-xs text-[#0C7489] font-medium">{activity.companyName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    <span className="text-xs text-[#9B9B9B]">{timeAgo(activity.createdAt)}</span>
                    {canExpand && (
                      <ChevronDown className={cn("h-3.5 w-3.5 text-[#9B9B9B] transition-transform duration-200", isExpanded && "rotate-180")} />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                <div className={cn("overflow-hidden transition-all duration-200 ease-in-out", isExpanded ? "max-h-[800px] opacity-100 mt-3" : "max-h-0 opacity-0")}>
                  <div className="ml-[50px] pl-3 border-l-2 border-[#E8E5E0]">
                    <ActivityDetail
                      activity={activity}
                      onViewBrief={(brief, ctx) => setBriefModal({ brief, prepContext: ctx })}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {displayed.length === 0 && (
            <p className="text-sm text-[#9B9B9B] text-center py-8">No activities found</p>
          )}
        </div>
      </div>

      {/* Full Brief Modal */}
      {briefModal && (
        <FullBriefModal
          brief={briefModal.brief}
          prepContext={briefModal.prepContext}
          onClose={() => setBriefModal(null)}
        />
      )}
    </div>
  );
}

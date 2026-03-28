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

function getEffectiveType(activity: ActivityItem): string {
  const meta = activity.metadata as ActivityMeta | null;
  if (meta?.source === "call_analysis") return "call_analysis";
  if (meta?.source === "email_draft") return "email_draft";
  if (meta?.source === "agent_action") return "agent_action";
  return activity.type;
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
  agent_action: Sparkles,
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
  agent_action: "bg-[#FDF0ED] text-[#D4735E]",
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
  const effectiveType = getEffectiveType(activity);
  const expandableTypes = [
    "call_completed",
    "email_sent",
    "email_received",
    "note_added",
    "call_analysis",
    "agent_action",
    "email_draft",
    "observation",
  ];
  if (expandableTypes.includes(effectiveType)) return true;
  if (activity.description && activity.description.length > 60) return true;
  return false;
}

function ActivityDetail({ activity }: { activity: ActivityItem }) {
  const meta = activity.metadata as ActivityMeta | null;
  const effectiveType = getEffectiveType(activity);

  switch (effectiveType) {
    case "call_analysis": {
      const painPoints = meta?.painPoints as string[] | undefined;
      const nextSteps = meta?.nextSteps as string[] | undefined;
      const score = meta?.score as number | undefined;
      return (
        <div className="space-y-3">
          {score && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#6B6B6B]">Call Score</span>
              <span className={cn(
                "text-sm font-semibold",
                score >= 70 ? "text-[#2D8A4E]" : score >= 50 ? "text-[#D4A843]" : "text-[#C74B3B]"
              )}>
                {score}/100
              </span>
            </div>
          )}
          {activity.description && (
            <p className="text-sm text-[#3D3833]">{activity.description}</p>
          )}
          {painPoints && painPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6B6B6B] mb-1">Pain Points</p>
              <ul className="space-y-1">
                {painPoints.map((p, i) => (
                  <li key={i} className="text-sm text-[#3D3833] flex items-start gap-2">
                    <span className="text-[#D4735E] mt-1 shrink-0">•</span>
                    {p}
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
                    <span className="text-[#0C7489] mt-1 shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case "agent_action": {
      const headline = meta?.headline as string | undefined;
      return (
        <div className="space-y-2">
          {headline && (
            <p className="text-sm text-[#D4735E] font-medium">{headline}</p>
          )}
          {activity.description && (
            <p className="text-sm text-[#3D3833]">{activity.description}</p>
          )}
        </div>
      );
    }

    case "email_draft": {
      return (
        <div className="space-y-2">
          {activity.description && (
            <p className="text-sm text-[#3D3833]">{activity.description}</p>
          )}
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
          {activity.description && (
            <p className="text-sm text-[#3D3833]">{activity.description}</p>
          )}
        </div>
      );
    }

    case "meeting_scheduled":
    case "meeting_completed": {
      const attendees = meta?.attendees as string[] | undefined;
      return (
        <div className="space-y-2">
          {attendees && (
            <div className="text-xs text-[#6B6B6B]">
              Attendees: {attendees.join(", ")}
            </div>
          )}
          {activity.description && (
            <p className="text-sm text-[#3D3833]">{activity.description}</p>
          )}
        </div>
      );
    }

    default:
      return activity.description ? (
        <p className="text-sm text-[#3D3833]">{activity.description}</p>
      ) : null;
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

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    const effectiveType = getEffectiveType(a);
    if (filter === "email") return a.type.startsWith("email");
    if (filter === "call") return a.type.includes("call") || effectiveType === "call_analysis";
    if (filter === "meeting") return a.type.includes("meeting");
    if (filter === "note") return a.type === "note_added" && !["call_analysis", "agent_action", "email_draft"].includes(effectiveType);
    if (filter === "ai") return ["call_analysis", "agent_action", "email_draft", "observation"].includes(effectiveType);
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
                  ? "bg-[#0C7489] text-white"
                  : "bg-[#F5F3EF] text-[#6B6B6B] hover:text-[#1A1A1A]"
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
            const effectiveType = getEffectiveType(activity);
            const Icon = ACTIVITY_ICONS[effectiveType] || FileText;
            const colorClass = ACTIVITY_COLORS[effectiveType] || "bg-stone-100 text-stone-400";
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
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "relative z-10 h-[38px] w-[38px] rounded-lg flex items-center justify-center shrink-0",
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-[#1A1A1A] leading-snug">
                      {activity.subject || activity.description || "Activity"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {activity.teamMemberName && (
                        <span className="text-xs text-[#6B6B6B]">
                          {activity.teamMemberName}
                        </span>
                      )}
                      {showCompany && activity.companyName && (
                        <>
                          <span className="text-xs text-[#6B6B6B]">·</span>
                          <span className="text-xs text-[#0C7489] font-medium">
                            {activity.companyName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    <span className="text-xs text-[#9B9B9B]">
                      {timeAgo(activity.createdAt)}
                    </span>
                    {canExpand && (
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-[#9B9B9B] transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200 ease-in-out",
                    isExpanded ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="ml-[50px] pl-3 border-l-2 border-[#E8E5E0]">
                    <ActivityDetail activity={activity} />
                  </div>
                </div>
              </div>
            );
          })}

          {displayed.length === 0 && (
            <p className="text-sm text-[#9B9B9B] text-center py-8">
              No activities found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

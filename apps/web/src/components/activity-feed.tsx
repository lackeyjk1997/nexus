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
};

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
};

const ACTIVITY_COLORS: Record<string, string> = {
  email_sent: "bg-blue-50 text-blue-600",
  email_received: "bg-blue-50 text-blue-600",
  call_completed: "bg-emerald-50 text-emerald-600",
  meeting_scheduled: "bg-violet-50 text-violet-600",
  meeting_completed: "bg-violet-50 text-violet-600",
  note_added: "bg-amber-50 text-amber-600",
  stage_changed: "bg-primary-light text-primary",
  task_completed: "bg-emerald-50 text-emerald-600",
  document_shared: "bg-cyan-50 text-cyan-600",
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "email", label: "Emails" },
  { key: "call", label: "Calls" },
  { key: "meeting", label: "Meetings" },
  { key: "note", label: "Notes" },
] as const;

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
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

  const filtered = activities.filter((a) => {
    if (filter === "all") return true;
    if (filter === "email") return a.type.startsWith("email");
    if (filter === "call") return a.type.includes("call");
    if (filter === "meeting") return a.type.includes("meeting");
    if (filter === "note") return a.type === "note_added";
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
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

        <div className="space-y-0">
          {displayed.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type] || FileText;
            const colorClass = ACTIVITY_COLORS[activity.type] || "bg-muted text-muted-foreground";

            return (
              <div
                key={activity.id}
                className="relative flex items-start gap-3 py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors"
              >
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
                  <p className="text-sm text-foreground leading-snug">
                    {activity.subject || activity.description || "Activity"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {activity.teamMemberName && (
                      <span className="text-xs text-muted-foreground">
                        {activity.teamMemberName}
                      </span>
                    )}
                    {showCompany && activity.companyName && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-primary font-medium">
                          {activity.companyName}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground shrink-0 pt-1">
                  {timeAgo(activity.createdAt)}
                </span>
              </div>
            );
          })}

          {displayed.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activities found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

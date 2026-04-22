"use client";

import {
  TrendingUp,
  Calendar,
  Target,
  DollarSign,
  Mail,
  Phone,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Bell,
  Bot,
  Users,
  Zap,
} from "lucide-react";
import { usePersona } from "@/components/providers";
import { cn, formatCurrency, formatCompactNumber } from "@/lib/utils";
import { ActivityFeed } from "@/components/activity-feed";
import Link from "next/link";

type Deal = {
  id: string;
  name: string;
  stage: string;
  dealValue: string | null;
  winProbability: number | null;
  forecastCategory: string | null;
  closeDate: Date | null;
  vertical: string;
  companyName: string | null;
  aeName: string | null;
  aeId: string | null;
};

type Activity = {
  id: string;
  type: string;
  subject: string | null;
  description: string | null;
  createdAt: Date;
  teamMemberName: string | null;
  teamMemberRole: string | null;
  dealName: string | null;
  companyName: string | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean | null;
  priority: string | null;
  createdAt: Date;
  teamMemberId: string;
  teamMemberName: string | null;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  deal_at_risk: AlertTriangle,
  handoff_request: Users,
  agent_recommendation: Bot,
  feedback_received: MessageSquare,
  stage_change: ArrowRight,
  meeting_reminder: Calendar,
  approval_needed: Bell,
  system_intelligence: Zap,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-secondary",
  urgent: "text-danger",
};

export function CommandCenterClient({
  deals,
  activities,
  notifications,
  teamMembers,
}: {
  deals: Deal[];
  activities: Activity[];
  notifications: Notification[];
  teamMembers: TeamMember[];
}) {
  const { personaName, role } = usePersona();

  const activeDeals = deals.filter(
    (d) => !["closed_won", "closed_lost"].includes(d.stage)
  );
  const totalPipeline = activeDeals.reduce(
    (sum, d) => sum + Number(d.dealValue || 0),
    0
  );
  const commitDeals = activeDeals.filter(
    (d) => d.forecastCategory === "commit"
  );
  const commitValue = commitDeals.reduce(
    (s, d) => s + Number(d.dealValue || 0),
    0
  );

  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const closingThisMonth = activeDeals.filter(
    (d) => d.closeDate && new Date(d.closeDate) <= thirtyDaysOut
  );

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  function timeAgo(date: Date) {
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back, {personaName.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s your {role === "MANAGER" ? "team" : "sales"} overview for today
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Pipeline Value"
          value={formatCurrency(totalPipeline)}
          subtitle={`${activeDeals.length} active deals`}
          color="text-primary"
        />
        <MetricCard
          icon={Target}
          label="Commit Forecast"
          value={formatCurrency(commitValue)}
          subtitle={`${commitDeals.length} deals in commit`}
          color="text-success"
        />
        <MetricCard
          icon={Calendar}
          label="Closing This Month"
          value={closingThisMonth.length.toString()}
          subtitle={formatCurrency(
            closingThisMonth.reduce((s, d) => s + Number(d.dealValue || 0), 0)
          )}
          color="text-warning"
        />
        <MetricCard
          icon={Bell}
          label="Notifications"
          value={unreadNotifications.length.toString()}
          subtitle={`${notifications.filter((n) => n.priority === "high" || n.priority === "urgent").length} high priority`}
          color="text-secondary"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h2>
            <Link
              href="/pipeline"
              className="text-xs text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="px-3 py-1">
            <ActivityFeed activities={activities} showCompany maxItems={8} />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Notifications
              {unreadNotifications.length > 0 && (
                <span className="ml-2 text-xs font-normal bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                  {unreadNotifications.length}
                </span>
              )}
            </h2>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {notifications.slice(0, 10).map((notif) => {
              const Icon = NOTIFICATION_ICONS[notif.type] || Bell;
              const priorityColor = PRIORITY_COLORS[notif.priority || "medium"];
              return (
                <div
                  key={notif.id}
                  className={cn(
                    "px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer",
                    !notif.isRead && "bg-primary-light/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        notif.type === "deal_at_risk"
                          ? "bg-secondary-light"
                          : "bg-primary-light"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          notif.type === "deal_at_risk"
                            ? "text-secondary"
                            : "text-primary"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-[10px] font-medium uppercase", priorityColor)}>
                          {notif.priority}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!notif.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "View Pipeline", href: "/pipeline", icon: TrendingUp },
          { label: "Review Calls", href: "/calls", icon: Phone },
          { label: "Check Outreach", href: "/outreach", icon: Mail },
          { label: "Agent Config", href: "/agent-config", icon: Bot },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-primary-light flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <action.icon className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary-light flex items-center justify-center">
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

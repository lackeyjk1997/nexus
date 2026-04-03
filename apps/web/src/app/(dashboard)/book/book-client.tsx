"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Mail,
  Clock,
  Building2,
  TrendingDown,
  Users,
  Sparkles,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { usePersona } from "@/components/providers";
import { ResponseKitModal } from "@/components/response-kit-modal";

// ── Types ──

type Message = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  receivedAt: string;
  priority: string | null;
  status: string | null;
  aiCategory: string | null;
  responseKit: unknown;
  companyId: string;
  contact: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    email: string | null;
  };
};

type Account = {
  company: {
    id: string;
    name: string;
    industry: string;
    employeeCount: number | null;
    description: string | null;
  };
  deal: {
    id: string;
    name: string;
    dealValue: string | null;
    closeDate: string | null;
    companyId: string;
  };
  health: {
    healthScore: number | null;
    healthTrend: string | null;
    contractStatus: string | null;
    arr: string | null;
    productsPurchased: string[] | null;
    usageMetrics: unknown;
    lastTouchDate: string | null;
    daysSinceTouch: number | null;
    renewalDate: string | null;
    keyStakeholders: Array<{ name: string; title: string; status: string }> | null;
    expansionSignals: Array<{ signal: string }> | null;
    riskSignals: Array<{ signal: string; severity: string }> | null;
    healthFactors: unknown;
    onboardingComplete: boolean | null;
  };
  messages: Message[];
  priorityScore: number;
};

type BookData = {
  accounts: Account[];
  metrics: {
    totalAccounts: number;
    totalArr: number;
    healthyCount: number;
    atRiskCount: number;
    pendingMessages: number;
    upcomingRenewals: number;
  };
};

const VERTICAL_LABELS: Record<string, string> = {
  healthcare: "Healthcare",
  financial_services: "Financial Services",
  technology: "Life Sciences",
  retail: "Retail",
  manufacturing: "Manufacturing",
};

const VERTICAL_FILTERS = [
  { key: "all", label: "All" },
  { key: "healthcare", label: "Healthcare" },
  { key: "financial_services", label: "Financial Services" },
  { key: "technology", label: "Life Sciences" },
  { key: "retail", label: "Retail" },
];

const CONTRACT_STATUS_STYLES: Record<string, string> = {
  active: "bg-muted text-muted-foreground",
  onboarding: "bg-primary/10 text-primary",
  renewal_window: "bg-warning/10 text-warning",
  at_risk: "bg-destructive/10 text-destructive",
  churned: "bg-destructive/10 text-destructive",
};

function getHealthDot(score: number | null) {
  const s = score ?? 100;
  if (s < 50) return "bg-danger";
  if (s < 70) return "bg-warning";
  return "bg-success";
}

function getTrendIcon(trend: string | null) {
  switch (trend) {
    case "improving":
      return <ArrowUpRight className="h-3.5 w-3.5 text-success" />;
    case "declining":
      return <ArrowDownRight className="h-3.5 w-3.5 text-warning" />;
    case "critical":
      return <ArrowDownRight className="h-3.5 w-3.5 text-danger font-bold" />;
    default:
      return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  return `${diffWeeks} weeks ago`;
}

export function BookClient() {
  const { currentUser } = usePersona();
  const [data, setData] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<{
    message: Message;
    account: Account;
  } | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    fetch(`/api/book?aeId=${currentUser.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load book");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser]);

  const filteredAccounts = useMemo(() => {
    if (!data) return [];
    if (verticalFilter === "all") return data.accounts;
    return data.accounts.filter(
      (a) => a.company.industry === verticalFilter
    );
  }, [data, verticalFilter]);

  const priorityAccounts = useMemo(() => {
    if (!data) return [];
    return data.accounts.slice(0, 5);
  }, [data]);

  // Mark a message as responded — update local state
  const handleMarkResponded = (messageId: string) => {
    if (!data) return;
    setData({
      ...data,
      accounts: data.accounts.map((a) => ({
        ...a,
        messages: a.messages.map((m) =>
          m.id === messageId ? { ...m, status: "responded" } : m
        ),
      })),
      metrics: {
        ...data.metrics,
        pendingMessages: Math.max(0, data.metrics.pendingMessages - 1),
      },
    });
    setSelectedMessage(null);
  };

  if (!currentUser || currentUser.role !== "AE") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">
            No post-close accounts assigned
          </p>
          <p className="text-sm text-muted-foreground">
            Switch to an AE persona to view account book
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Book</h1>
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-4 animate-pulse"
            >
              <div className="h-8 bg-muted rounded w-12 mb-2" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-6 animate-pulse"
            >
              <div className="h-5 bg-muted rounded w-48 mb-3" />
              <div className="h-4 bg-muted rounded w-72" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertTriangle className="h-10 w-10 text-danger mx-auto" />
          <p className="text-danger">{error || "Failed to load data"}</p>
        </div>
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Book</h1>
        <p className="text-sm text-muted-foreground">
          Managing {metrics.totalAccounts} accounts &middot;{" "}
          {formatCurrency(metrics.totalArr)} ARR
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard value={metrics.totalAccounts} label="Accounts" />
        <MetricCard
          value={formatCurrency(metrics.totalArr)}
          label="Total ARR"
        />
        <MetricCard
          value={metrics.healthyCount}
          label="Healthy"
          valueColor="text-success"
        />
        <MetricCard
          value={metrics.atRiskCount}
          label="At Risk"
          valueColor="text-danger"
        />
        <MetricCard
          value={metrics.pendingMessages}
          label="Messages"
          valueColor={
            metrics.pendingMessages > 0
              ? "text-secondary"
              : "text-foreground"
          }
        />
      </div>

      {/* Priority Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Needs Your Attention
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-3">
          {priorityAccounts.map((account) => (
            <PriorityCard
              key={account.company.id}
              account={account}
              onViewKit={(msg) =>
                setSelectedMessage({ message: msg, account })
              }
            />
          ))}
        </div>
      </div>

      {/* All Accounts Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            All Accounts
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Vertical Filters */}
        <div className="flex items-center gap-2 mb-4">
          {VERTICAL_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setVerticalFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                verticalFilter === f.key
                  ? "bg-foreground text-white"
                  : "bg-muted text-foreground hover:bg-border"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Accounts Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Account
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Vertical
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  ARR
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Health
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Days Since Touch
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                  Messages
                </th>
              </tr>
            </thead>
            <tbody>
              {[...filteredAccounts]
                .sort(
                  (a, b) =>
                    (a.health.healthScore ?? 100) -
                    (b.health.healthScore ?? 100)
                )
                .map((account) => {
                  const score = account.health.healthScore ?? 100;
                  const pendingMsgs = account.messages.filter(
                    (m) =>
                      m.status === "pending" || m.status === "kit_ready"
                  );
                  const status = account.health.contractStatus ?? "active";
                  return (
                    <tr
                      key={account.company.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {account.company.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${getVerticalBg(account.company.industry)}20`,
                            color: getVerticalBg(account.company.industry),
                          }}
                        >
                          {VERTICAL_LABELS[account.company.industry] ??
                            account.company.industry}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(
                          parseFloat(account.health.arr || "0")
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-block h-2 w-2 rounded-full",
                              getHealthDot(score)
                            )}
                          />
                          <span className="font-medium">{score}</span>
                          {getTrendIcon(account.health.healthTrend)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded text-xs font-medium capitalize",
                            CONTRACT_STATUS_STYLES[status] ??
                              CONTRACT_STATUS_STYLES.active
                          )}
                        >
                          {status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {account.health.daysSinceTouch ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pendingMsgs.length > 0 ? (
                          <button
                            onClick={() =>
                              setSelectedMessage({
                                message: pendingMsgs[0],
                                account,
                              })
                            }
                            className="inline-flex items-center gap-1 text-secondary hover:text-secondary/80 font-medium"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {pendingMsgs.length}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Response Kit Modal */}
      {selectedMessage && (
        <ResponseKitModal
          message={selectedMessage.message}
          account={selectedMessage.account}
          onClose={() => setSelectedMessage(null)}
          onMarkResponded={handleMarkResponded}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function MetricCard({
  value,
  label,
  valueColor = "text-foreground",
}: {
  value: string | number;
  label: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className={cn("text-2xl font-semibold", valueColor)}>{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function PriorityCard({
  account,
  onViewKit,
}: {
  account: Account;
  onViewKit: (msg: Message) => void;
}) {
  const score = account.health.healthScore ?? 100;
  const riskSignals = account.health.riskSignals ?? [];
  const pendingMessages = account.messages.filter(
    (m) => m.status === "pending" || m.status === "kit_ready"
  );
  const topMessage = pendingMessages[0];

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full mt-0.5",
              getHealthDot(score)
            )}
          />
          <h3 className="font-semibold text-foreground">
            {account.company.name}
          </h3>
          <span className="text-sm text-muted-foreground">
            {VERTICAL_LABELS[account.company.industry] ??
              account.company.industry}{" "}
            &middot; {formatCurrency(parseFloat(account.health.arr || "0"))}{" "}
            ARR
          </span>
        </div>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {account.health.daysSinceTouch ?? 0} days since touch
        </span>
      </div>

      {/* Health + Status */}
      <div className="flex items-center gap-2 mb-3 ml-[18px]">
        <span className="text-sm text-muted-foreground">
          Health: {score}/100
        </span>
        {getTrendIcon(account.health.healthTrend)}
        <span
          className={cn(
            "text-xs font-medium",
            score < 50
              ? "text-danger"
              : score < 70
                ? "text-warning"
                : "text-success"
          )}
        >
          {account.health.healthTrend ?? "stable"}
        </span>
      </div>

      {/* Risk Signals */}
      {riskSignals.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 ml-[18px]">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          <span className="text-sm text-muted-foreground">
            {riskSignals.map((r) => r.signal).join(" · ")}
          </span>
        </div>
      )}

      {/* Customer Message */}
      {topMessage && (
        <div className="bg-muted rounded-lg p-3 ml-[18px] flex items-start justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                &ldquo;{topMessage.subject}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {topMessage.contact.firstName} {topMessage.contact.lastName}
                {topMessage.contact.title
                  ? `, ${topMessage.contact.title}`
                  : ""}{" "}
                &middot; via {topMessage.channel} &middot;{" "}
                {timeAgo(topMessage.receivedAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewKit(topMessage)}
            className={cn(
              "shrink-0 ml-4 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              topMessage.status === "kit_ready"
                ? "bg-secondary text-white hover:bg-secondary/90"
                : "bg-primary text-white hover:bg-primary/90"
            )}
          >
            {topMessage.status === "kit_ready"
              ? "View Response Kit"
              : "Generate Response Kit"}
          </button>
        </div>
      )}
    </div>
  );
}

function getVerticalBg(industry: string): string {
  const map: Record<string, string> = {
    healthcare: "#3B82F6",
    financial_services: "#10B981",
    technology: "#06B6D4",
    retail: "#8B5CF6",
    manufacturing: "#F59E0B",
  };
  return map[industry] ?? "#6B7280";
}

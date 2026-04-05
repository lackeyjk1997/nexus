"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  MessageSquare,
  CalendarDays,
  Copy,
  Check,
  Loader2,
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

type HealthFactors = {
  adoption: number;
  engagement: number;
  sentiment: number;
  support_health: number;
};

type UsageMetrics = {
  api_calls_30d: number;
  trend_pct: number;
  seats_active: number;
  seats_total: number;
};

type UseCase = {
  team: string;
  seats: number;
  product: string;
  useCase: string;
  expectedOutcome: string;
  adoptionStatus: "on_track" | "needs_attention" | "at_risk";
  activeUsers: number;
  notes: string;
};

type ExpansionOpportunity = {
  department: string;
  headcount: number;
  currentProduct: string | null;
  recommendedProduct: string;
  opportunityArr: number;
  rationale: string;
};

type ProactiveSignal = {
  type: "product_release" | "industry_news" | "customer_news";
  signal: string;
  relevance: string;
  action: string;
  daysAgo: number;
};

type QbrBrief = {
  qbr_type: string;
  title: string;
  executive_summary: string;
  agenda_items: Array<{
    topic: string;
    duration_minutes: number;
    talking_points: string[];
    data_to_prepare: string;
    desired_outcome: string;
  }>;
  stakeholder_strategy: string;
  risk_to_address: string;
  success_metric: string;
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
    keyStakeholders:
      | Array<{ name: string; title: string; status: string }>
      | null;
    expansionSignals:
      | Array<{
          signal: string;
          confidence?: number;
          product?: string;
          details?: string;
        }>
      | null;
    riskSignals:
      | Array<{ signal: string; severity: string; detected_at?: string }>
      | null;
    contractedUseCases: UseCase[] | null;
    expansionMap: ExpansionOpportunity[] | null;
    proactiveSignals: ProactiveSignal[] | null;
    similarSituations:
      | Array<{
          accountName: string;
          vertical: string;
          situation: string;
          resolution: string;
          outcome: string;
          relevance: string;
        }>
      | null;
    recommendedResources:
      | Array<{
          title: string;
          type: string;
          relevance: string;
          keySection: string;
        }>
      | null;
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

const PRODUCT_LABELS: Record<string, string> = {
  claude_api: "Claude API",
  claude_enterprise: "Claude Enterprise",
  claude_code: "Claude Code",
  cowork: "Cowork",
};

// ── Cross-Book Intelligence (hardcoded) ──

const CROSS_BOOK_INSIGHTS = [
  {
    icon: "\u26A0\uFE0F",
    title: "Renewal Wave",
    description:
      "3 accounts renewing within 90 days. 2 showing declining engagement. Combined ARR at risk.",
    impact: "$1.09M ARR at risk",
    impactType: "risk" as const,
    accounts: [
      "Harbor Compliance Group",
      "Lighthouse Insurance",
      "Brightside Commerce",
    ],
    action:
      "Coordinate renewal outreach strategy \u2014 don\u2019t let them negotiate independently.",
  },
  {
    icon: "\uD83D\uDD27",
    title: "Integration Pattern",
    description:
      "4 accounts across healthcare and life sciences raised integration issues this quarter. Common root cause: data format incompatibility with legacy systems.",
    impact: "4 accounts affected",
    impactType: "action" as const,
    accounts: [
      "Pinnacle Biotech",
      "Cascadia Life Sciences",
      "Cascade Supply Chain",
      "BrightPath Diagnostics",
    ],
    action:
      "Build a standard middleware template. One fix resolves 4 accounts.",
  },
  {
    icon: "\uD83D\uDCC8",
    title: "Expansion Cluster",
    description:
      "3 accounts showing Claude Code expansion readiness based on API usage patterns and team requests.",
    impact: "$285K potential ARR",
    impactType: "opportunity" as const,
    accounts: [
      "Summit Genomics",
      "Cornerstone Banking",
      "Atlas Retail Group",
    ],
    action:
      "Schedule expansion discovery calls. Lead with department-specific use cases.",
  },
  {
    icon: "\uD83D\uDEA8",
    title: "Onboarding Risk",
    description:
      "2 accounts in first 30 days below adoption benchmarks. Accounts below 40% adoption at day 21 churn at 3x the normal rate.",
    impact: "2 accounts at risk",
    impactType: "risk" as const,
    accounts: ["Pinnacle Biotech", "Cascadia Life Sciences"],
    action:
      "Schedule hands-on onboarding sessions. Assign department champions.",
  },
];

// ── Hardcoded Draft Check-in Emails ──

const DRAFT_EMAILS: Record<
  string,
  { subject: string; body: string }
> = {
  "Harbor Compliance Group": {
    subject: "Harbor Compliance \u2014 Usage Insights & Strategic Review",
    body: `Hi Amanda,

I wanted to follow up on our earlier conversation and share some data I've pulled together on your team's usage of Claude Enterprise.

Your compliance analysts have processed over 2,400 regulatory reviews through Claude this quarter \u2014 a 340% increase from manual baseline. The average review completion time has decreased from 45 minutes to 12 minutes, representing roughly 1,320 hours saved across your team this quarter alone.

I'd love to schedule 30 minutes to walk through these metrics in detail and discuss how we can help your team get even more value. I can also share how similar financial services organizations are using Claude for additional compliance workflows.

Would Thursday or Friday afternoon work for you?

Best,
Sarah`,
  },
  "Pinnacle Biotech": {
    subject: "Pinnacle Biotech \u2014 Integration Support & Next Steps",
    body: `Hi Jake,

I wanted to check in on the LIMS integration progress. I know the data format compatibility issue has been frustrating, and I want to make sure we're giving your team the support you need to get this resolved.

I've connected with our integration team, and they've prepared a middleware architecture document based on a nearly identical LIMS integration we completed with BrightPath Diagnostics. Their pipeline is now running at 99.7% accuracy with 45-second processing times.

Can we schedule a call this week with our integration engineer to walk through the approach? I want to get this resolved for your team as quickly as possible.

Best,
Sarah`,
  },
  "Evolve Retail Tech": {
    subject: "Evolve Retail Tech \u2014 Check-in & Support",
    body: `Hi Rachel,

I hope things are going well. I wanted to reach out because I noticed your team's engagement has shifted recently, and I want to make sure we're providing the right level of support.

We've seen great results with other retail technology teams who've adopted Claude for POS data analysis and inventory optimization. I'd love to share some of those patterns and see if there are workflows where Claude could add more value for your product team.

Would you have 20\u201330 minutes this week for a quick catch-up? I want to make sure we're aligned on how to get the most out of your investment.

Best,
Sarah`,
  },
};

function getDefaultDraftEmail(
  companyName: string,
  contactName: string
): { subject: string; body: string } {
  return {
    subject: `${companyName} \u2014 Quarterly Check-in`,
    body: `Hi ${contactName},

I hope things are going well with your team's use of Claude. I wanted to reach out for a quick check-in and see how everything is going.

A few things I'd love to discuss:
\u2022 How your team is using Claude day-to-day and any workflows you've found particularly valuable
\u2022 Any challenges or friction points we can help address
\u2022 Upcoming goals where Claude might be able to help

Would you have 20\u201330 minutes this week or next for a quick catch-up?

Best,
Sarah`,
  };
}

// ── Utility Functions ──

function getHealthDot(score: number | null) {
  const s = score ?? 100;
  if (s < 50) return "bg-danger";
  if (s < 70) return "bg-warning";
  return "bg-success";
}

function getHealthColor(score: number | null) {
  const s = score ?? 100;
  if (s < 50) return "#ef4444";
  if (s < 70) return "#f59e0b";
  return "#22c55e";
}

function getTrendIcon(trend: string | null) {
  switch (trend) {
    case "improving":
      return <ArrowUpRight className="h-3.5 w-3.5 text-success" />;
    case "declining":
      return <ArrowDownRight className="h-3.5 w-3.5 text-warning" />;
    case "critical":
      return (
        <ArrowDownRight className="h-3.5 w-3.5 text-danger font-bold" />
      );
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

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
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

function getStakeholderDotColor(status: string): string {
  switch (status) {
    case "engaged":
      return "bg-success";
    case "silent":
      return "bg-warning";
    case "new":
      return "bg-primary";
    case "departed":
      return "bg-danger";
    default:
      return "bg-muted-foreground";
  }
}

function getProductPillStyle(product: string): string {
  const p = product.toLowerCase();
  if (p.includes("enterprise")) return "bg-purple-100 text-purple-700";
  if (p.includes("code")) return "bg-emerald-100 text-emerald-700";
  if (p.includes("cowork")) return "bg-amber-100 text-amber-700";
  if (p.includes("team")) return "bg-teal-100 text-teal-700";
  return "bg-blue-100 text-blue-700"; // Claude API default
}

function getAdoptionStatusStyle(status: string): {
  bg: string;
  text: string;
  label: string;
  barColor: string;
} {
  switch (status) {
    case "on_track":
      return { bg: "bg-success/10", text: "text-success", label: "On Track", barColor: "bg-success" };
    case "needs_attention":
      return { bg: "bg-warning/10", text: "text-warning", label: "Needs Attention", barColor: "bg-warning" };
    case "at_risk":
      return { bg: "bg-danger/10", text: "text-danger", label: "At Risk", barColor: "bg-danger" };
    default:
      return { bg: "bg-muted", text: "text-muted-foreground", label: status, barColor: "bg-muted-foreground" };
  }
}

function getSignalIcon(type: string): string {
  switch (type) {
    case "product_release": return "\uD83D\uDE80";
    case "industry_news": return "\uD83D\uDCF0";
    case "customer_news": return "\uD83C\uDFE2";
    default: return "\uD83D\uDD14";
  }
}

function getSignalTypeLabel(type: string): string {
  switch (type) {
    case "product_release": return "Product Release";
    case "industry_news": return "Industry News";
    case "customer_news": return "Customer News";
    default: return type;
  }
}

// ── Main Component ──

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
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(
    null
  );
  const [briefCollapsed, setBriefCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexus_brief_collapsed") === "true";
    }
    return false;
  });
  const [emailDraftAccount, setEmailDraftAccount] =
    useState<Account | null>(null);

  useEffect(() => {
    localStorage.setItem(
      "nexus_brief_collapsed",
      briefCollapsed.toString()
    );
  }, [briefCollapsed]);

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

  const handleOpenDrawer = useCallback((account: Account) => {
    setSelectedAccount(account);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedAccount(null);
  }, []);

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
          <p className="text-sm text-muted-foreground">
            Loading accounts...
          </p>
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

      {/* Morning Brief */}
      <MorningBrief
        collapsed={briefCollapsed}
        onToggle={() => setBriefCollapsed(!briefCollapsed)}
      />

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

      {/* Priority Section — hidden for demo (entry point is now the account table) */}
      {false && (
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
      )}

      {/* Cross-Book Intelligence */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Cross-Book Intelligence
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {CROSS_BOOK_INSIGHTS.map((insight) => (
            <CrossBookCard
              key={insight.title}
              insight={insight}
              onAccountClick={(name) => {
                const acct = data.accounts.find(
                  (a) => a.company.name === name
                );
                if (acct) handleOpenDrawer(acct);
              }}
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
                  const status =
                    account.health.contractStatus ?? "active";
                  return (
                    <tr
                      key={account.company.id}
                      onClick={() => handleOpenDrawer(account)}
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {account.company.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${getVerticalBg(account.company.industry)}20`,
                            color: getVerticalBg(
                              account.company.industry
                            ),
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
                        {account.health.daysSinceTouch ?? "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pendingMsgs.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessage({
                                message: pendingMsgs[0],
                                account,
                              });
                            }}
                            className="inline-flex items-center gap-1 text-secondary hover:text-secondary/80 font-medium"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {pendingMsgs.length}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">
                            \u2014
                          </span>
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

      {/* Account Detail Drawer */}
      {selectedAccount && (
        <AccountDetailDrawer
          account={selectedAccount}
          onClose={handleCloseDrawer}
          onViewKit={(msg) =>
            setSelectedMessage({ message: msg, account: selectedAccount })
          }
          onDraftEmail={() => setEmailDraftAccount(selectedAccount)}
        />
      )}

      {/* Draft Email Modal */}
      {emailDraftAccount && (
        <DraftEmailModal
          account={emailDraftAccount}
          onClose={() => setEmailDraftAccount(null)}
        />
      )}
    </div>
  );
}

// ── Morning Brief ──

function MorningBrief({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg border-l-4 border-l-secondary overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          <span className="font-semibold text-foreground text-sm">
            Monday Morning Brief
          </span>
        </div>
        {collapsed ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">View Brief</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Collapse</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-3 text-sm text-foreground leading-relaxed">
          <p>
            Good morning, Sarah. Here&apos;s your portfolio at a glance:
          </p>
          <p>
            {"\uD83D\uDD34"} <strong>3 accounts need urgent attention.</strong>{" "}
            Harbor Compliance&apos;s new COO is reviewing all vendor contracts
            &mdash; your champion David Liu departed 6 weeks ago, and Amanda
            Chen doesn&apos;t have context on the value your team delivers. Get
            in front of her within 5 business days with concrete ROI numbers.
            Pinnacle Biotech&apos;s LIMS integration has been failing for 3 days
            &mdash; their VP Engineering is questioning Claude&apos;s
            reliability. The BrightPath middleware playbook resolves this exact
            issue. Evolve Retail Tech&apos;s key stakeholder Rachel Kim has been
            silent for 3 weeks with usage down 35%.
          </p>
          <p>
            {"\uD83D\uDCC5"}{" "}
            <strong>Renewal wave incoming:</strong> Pacific Coast Medical ($280K,
            45 days), Lighthouse Insurance ($290K, 60 days), and Brightside
            Commerce ($260K, 90 days) all renew in the next quarter. Combined
            ARR at risk: $830K. Pacific Coast and Lighthouse are showing
            declining engagement &mdash; schedule proactive QBRs.
          </p>
          <p>
            {"\uD83D\uDCC8"}{" "}
            <strong>Expansion opportunity:</strong> Summit Genomics, Cornerstone
            Banking, and Atlas Retail Group are all showing usage patterns
            consistent with Claude Code expansion. Combined potential: ~$285K
            additional ARR.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Metric Card ──

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

// ── Priority Card ──

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

      {riskSignals.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 ml-[18px]">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
          <span className="text-sm text-muted-foreground">
            {riskSignals.map((r) => r.signal).join(" \u00B7 ")}
          </span>
        </div>
      )}

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

// ── Cross-Book Intelligence Card ──

function CrossBookCard({
  insight,
  onAccountClick,
}: {
  insight: (typeof CROSS_BOOK_INSIGHTS)[number];
  onAccountClick: (name: string) => void;
}) {
  const impactColor =
    insight.impactType === "risk"
      ? "text-danger"
      : insight.impactType === "opportunity"
        ? "text-success"
        : "text-primary";

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{insight.icon}</span>
        <h4 className="font-semibold text-foreground text-sm">
          {insight.title}
        </h4>
      </div>
      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
        {insight.description}
      </p>
      <p className={cn("text-xs font-semibold mb-3", impactColor)}>
        {insight.impact}
      </p>
      <div className="flex flex-wrap gap-1 mb-3">
        {insight.accounts.map((name) => (
          <button
            key={name}
            onClick={() => onAccountClick(name)}
            className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-border hover:text-foreground transition-colors"
          >
            {name}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground italic mt-auto">
        {insight.action}
      </p>
    </div>
  );
}

// ── Account Detail Drawer ──

function AccountDetailDrawer({
  account,
  onClose,
  onViewKit,
  onDraftEmail,
}: {
  account: Account;
  onClose: () => void;
  onViewKit: (msg: Message) => void;
  onDraftEmail: () => void;
}) {
  const { currentUser } = usePersona();
  const score = account.health.healthScore ?? 100;
  const healthFactors = account.health.healthFactors as
    | HealthFactors
    | undefined;
  const usageMetrics = account.health.usageMetrics as
    | UsageMetrics
    | undefined;
  const stakeholders = account.health.keyStakeholders ?? [];
  const riskSignals = account.health.riskSignals ?? [];
  const expansionSignals = account.health.expansionSignals ?? [];
  const contractedUseCases = account.health.contractedUseCases ?? [];
  const expansionMap = account.health.expansionMap ?? [];
  const proactiveSignals = account.health.proactiveSignals ?? [];
  const similarSituations = account.health.similarSituations ?? [];
  const recommendedResources = account.health.recommendedResources ?? [];
  const products = account.health.productsPurchased ?? [];
  const messages = account.messages.filter(
    (m) => m.status === "pending" || m.status === "kit_ready"
  );
  const renewalDays = daysUntil(account.health.renewalDate);

  // Observation state
  const [obsExpanded, setObsExpanded] = useState(false);
  const [obsText, setObsText] = useState("");
  const [obsLoading, setObsLoading] = useState(false);
  const [obsResult, setObsResult] = useState<"success" | "error" | null>(null);

  // QBR state
  const [qbrExpanded, setQbrExpanded] = useState(false);
  const [qbrType, setQbrType] = useState<string | null>(null);
  const [qbrLoading, setQbrLoading] = useState(false);
  const [qbrBrief, setQbrBrief] = useState<QbrBrief | null>(null);
  const [qbrError, setQbrError] = useState<string | null>(null);
  const [qbrCopied, setQbrCopied] = useState(false);

  // Email generation state (shared across use case cards and signal cards)
  const [activeEmailCard, setActiveEmailCard] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<{ subject: string; body: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailPurposes, setEmailPurposes] = useState<Set<string>>(new Set());
  const [emailFreeText, setEmailFreeText] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);

  // Reset obs success message
  useEffect(() => {
    if (obsResult === "success") {
      const t = setTimeout(() => {
        setObsResult(null);
        setObsExpanded(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [obsResult]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleObsSubmit = async () => {
    if (!obsText.trim()) return;
    setObsLoading(true);
    setObsResult(null);
    try {
      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observerId: currentUser?.id,
          rawInput: obsText.trim(),
          context: {
            source: "book_drawer",
            companyId: account.company.id,
            companyName: account.company.name,
            dealId: account.deal.id,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setObsText("");
      setObsResult("success");
    } catch {
      setObsResult("error");
    } finally {
      setObsLoading(false);
    }
  };

  const handleQbrGenerate = async (type: string) => {
    setQbrType(type);
    setQbrLoading(true);
    setQbrBrief(null);
    setQbrError(null);
    try {
      const accountContext = {
        healthScore: account.health.healthScore,
        healthTrend: account.health.healthTrend,
        contractStatus: account.health.contractStatus,
        renewalDate: account.health.renewalDate,
        arr: account.health.arr,
        productsPurchased: account.health.productsPurchased,
        usageMetrics: account.health.usageMetrics,
        keyStakeholders: account.health.keyStakeholders,
        contractedUseCases: account.health.contractedUseCases,
        expansionMap: account.health.expansionMap,
        riskSignals: account.health.riskSignals,
        expansionSignals: account.health.expansionSignals,
        recentMessages: account.messages
          .filter((m) => m.status === "pending" || m.status === "kit_ready")
          .map((m) => m.subject),
      };

      const res = await fetch("/api/customer/qbr-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: account.company.id,
          companyName: account.company.name,
          qbrType: type,
          accountContext,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "QBR generation failed");
      }
      setQbrBrief(data.qbrBrief);
    } catch (err) {
      setQbrError(err instanceof Error ? err.message : "QBR generation failed");
    } finally {
      setQbrLoading(false);
    }
  };

  const handleCopyQbr = () => {
    if (!qbrBrief) return;
    const lines = [
      qbrBrief.title,
      "",
      qbrBrief.executive_summary,
      "",
      "AGENDA",
      ...qbrBrief.agenda_items.flatMap((item, i) => [
        "",
        `${i + 1}. ${item.topic} (${item.duration_minutes} min)`,
        ...item.talking_points.map((tp) => `   - ${tp}`),
        `   Prepare: ${item.data_to_prepare}`,
        `   Goal: ${item.desired_outcome}`,
      ]),
      "",
      `Invite: ${qbrBrief.stakeholder_strategy}`,
      "",
      `Risk: ${qbrBrief.risk_to_address}`,
      "",
      `Success: ${qbrBrief.success_metric}`,
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    setQbrCopied(true);
    setTimeout(() => setQbrCopied(false), 2000);
  };

  const getRecipientForTeam = (_teamName: string): { name: string; title: string } => {
    if (stakeholders.length > 0) {
      return { name: stakeholders[0].name, title: stakeholders[0].title };
    }
    return { name: "Team Lead", title: "" };
  };

  const buildAccountContext = () => ({
    healthScore: account.health.healthScore ?? 0,
    arr: parseFloat(account.health.arr || "0"),
    productsPurchased: account.health.productsPurchased ?? [],
    contractStatus: account.health.contractStatus ?? "active",
    renewalDate: account.health.renewalDate ?? undefined,
    daysSinceTouch: account.health.daysSinceTouch ?? 0,
  });

  const handleUseCaseEmail = async (uc: UseCase, ucIndex: number) => {
    const cardId = `usecase-${ucIndex}`;
    setActiveEmailCard(cardId);
    setEmailResult(null);
    setEmailLoading(true);

    const recipient = getRecipientForTeam(uc.team);
    const purpose = Array.from(emailPurposes).join(", ");
    const additionalContext = emailFreeText.trim() || null;

    try {
      const res = await fetch("/api/customer/outreach-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "use_case_checkin",
          companyName: account.company.name,
          companyId: account.company.id,
          vertical: VERTICAL_LABELS[account.company.industry] ?? account.company.industry,
          recipientName: recipient.name,
          recipientTitle: recipient.title,
          useCase: uc,
          purpose,
          additionalContext,
          accountContext: buildAccountContext(),
        }),
      });
      const data = await res.json();
      if (data.success && data.email) {
        setEmailResult({ subject: data.email.subject, body: data.email.body });
      } else {
        setEmailResult(null);
        setActiveEmailCard(null);
      }
    } catch {
      setEmailResult(null);
      setActiveEmailCard(null);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSignalEmail = async (ps: ProactiveSignal, signalIndex: number) => {
    const cardId = `signal-${signalIndex}`;
    setActiveEmailCard(cardId);
    setEmailResult(null);
    setEmailLoading(true);
    setEmailPurposes(new Set());
    setEmailFreeText("");

    const recipient = stakeholders.length > 0
      ? { name: stakeholders[0].name, title: stakeholders[0].title }
      : { name: "Team Lead", title: "" };

    try {
      const res = await fetch("/api/customer/outreach-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "proactive_signal",
          companyName: account.company.name,
          companyId: account.company.id,
          vertical: VERTICAL_LABELS[account.company.industry] ?? account.company.industry,
          recipientName: recipient.name,
          recipientTitle: recipient.title,
          signal: ps,
          accountContext: buildAccountContext(),
        }),
      });
      const data = await res.json();
      if (data.success && data.email) {
        setEmailResult({ subject: data.email.subject, body: data.email.body });
      } else {
        setEmailResult(null);
        setActiveEmailCard(null);
      }
    } catch {
      setEmailResult(null);
      setActiveEmailCard(null);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleDismissEmail = () => {
    setActiveEmailCard(null);
    setEmailResult(null);
    setEmailLoading(false);
    setEmailPurposes(new Set());
    setEmailFreeText("");
    setEmailCopied(false);
  };

  const handleCopyEmail = () => {
    if (!emailResult) return;
    navigator.clipboard.writeText(`Subject: ${emailResult.subject}\n\n${emailResult.body}`);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const totalExpansionArr = expansionMap.reduce(
    (sum, e) => sum + e.opportunityArr,
    0
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[480px] bg-card border-l border-border shadow-xl z-40 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="p-6 space-y-5">
          {/* 1. Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {account.company.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {VERTICAL_LABELS[account.company.industry] ??
                  account.company.industry}{" "}
                &middot;{" "}
                {formatCurrency(parseFloat(account.health.arr || "0"))} ARR
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* 2. Health Overview */}
          <DrawerSection title="Health Overview">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getHealthColor(score),
                    }}
                  />
                </div>
                <span className="text-sm font-semibold min-w-[60px] text-right">
                  {score}/100
                </span>
                <span
                  className={cn(
                    "text-xs font-medium capitalize",
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

              {healthFactors && (
                <div className="space-y-3 pt-1">
                  {(
                    [
                      ["Seat Utilization", "Active vs. purchased seats", healthFactors.adoption],
                      ["Usage Trend", "Month-over-month volume change", healthFactors.engagement],
                      ["Stakeholder Health", "Champion status and contact stability", healthFactors.sentiment],
                    ] as const
                  ).map(([label, subtitle, val]) => (
                    <div key={label}>
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                          <span className="text-xs text-foreground font-medium">
                            {label}
                          </span>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {subtitle}
                          </p>
                        </div>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-foreground/40"
                            style={{ width: `${val}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {val}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Engagement Recency — show days instead of percentage */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <span className="text-xs text-foreground font-medium">
                          Engagement Recency
                        </span>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Days since last meaningful interaction
                        </p>
                      </div>
                      <div className="flex-1" />
                      <span className={cn(
                        "text-xs font-semibold",
                        (account.health.daysSinceTouch ?? 0) <= 7 ? "text-success" :
                        (account.health.daysSinceTouch ?? 0) <= 14 ? "text-muted-foreground" :
                        (account.health.daysSinceTouch ?? 0) <= 21 ? "text-warning" :
                        "text-danger"
                      )}>
                        {account.health.daysSinceTouch ?? 0} days
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DrawerSection>

          {/* 3. Contracted Use Cases */}
          <DrawerSection title="Contracted Use Cases">
            {contractedUseCases.length > 0 ? (
              <div className="space-y-3">
                {contractedUseCases.map((uc, i) => {
                  const status = getAdoptionStatusStyle(uc.adoptionStatus);
                  const utilPct = Math.round((uc.activeUsers / uc.seats) * 100);
                  const cardId = `usecase-${i}`;
                  const isActiveCard = activeEmailCard === cardId;
                  const showPurposeChips = isActiveCard && !emailLoading && !emailResult;
                  const showEmailLoading = isActiveCard && emailLoading;
                  const showEmailResult = isActiveCard && emailResult;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {uc.team} &middot; {uc.seats} seats
                            </p>
                            <span
                              className={cn(
                                "inline-block mt-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                                getProductPillStyle(uc.product)
                              )}
                            >
                              {uc.product}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[11px] font-medium",
                                status.bg,
                                status.text
                              )}
                            >
                              {status.label}
                            </span>
                            <button
                              onClick={() => {
                                if (isActiveCard) {
                                  handleDismissEmail();
                                } else {
                                  setActiveEmailCard(cardId);
                                  setEmailResult(null);
                                  setEmailLoading(false);
                                  setEmailPurposes(new Set());
                                  setEmailFreeText("");
                                }
                              }}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                            >
                              {isActiveCard ? "Cancel" : "\uD83D\uDCE7 Check In"}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-foreground">{uc.useCase}</p>
                        <p className="text-xs text-muted-foreground">
                          Goal: {uc.expectedOutcome}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                status.barColor
                              )}
                              style={{ width: `${utilPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {uc.activeUsers}/{uc.seats} active
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {uc.notes}
                        </p>
                      </div>

                      {/* Purpose chip selector (multi-select) */}
                      {showPurposeChips && (
                        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            What&apos;s the goal of this outreach?
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              ["check_in", "Check in on adoption"],
                              ["success_stories", "Share success stories"],
                              ["explore_new", "Explore new use cases"],
                              ["health_check", "Schedule health check"],
                            ] as const).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  setEmailPurposes((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(key)) next.delete(key);
                                    else next.add(key);
                                    return next;
                                  });
                                }}
                                className={cn(
                                  "px-3 py-2 rounded-md text-xs font-medium transition-colors",
                                  emailPurposes.has(key)
                                    ? "bg-[#3D3833] text-white"
                                    : "bg-muted hover:bg-border text-foreground"
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={emailFreeText}
                            onChange={(e) => setEmailFreeText(e.target.value)}
                            placeholder="Anything specific to mention? e.g., they mentioned opening a new office..."
                            rows={2}
                            className="w-full rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleUseCaseEmail(uc, i)}
                              disabled={emailPurposes.size === 0}
                              className="px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-white hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Generate Email
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Loading state */}
                      {showEmailLoading && (
                        <div className="bg-card border border-border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Drafting outreach email...
                          </p>
                        </div>
                      )}

                      {/* Generated email */}
                      {showEmailResult && emailResult && (
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-secondary" />
                            <p className="text-xs font-semibold text-secondary">
                              Generated Outreach
                            </p>
                          </div>
                          <p className="text-xs font-medium text-foreground">
                            Subject: {emailResult.subject}
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                            {emailResult.body}
                          </p>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={handleDismissEmail}
                              className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-border transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={handleCopyEmail}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors"
                            >
                              {emailCopied ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {emailCopied ? "Copied" : "Copy Email"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No use cases documented &mdash; schedule discovery check-in
              </p>
            )}
          </DrawerSection>

          {/* 4. Contract */}
          <DrawerSection title="Contract">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium capitalize",
                    CONTRACT_STATUS_STYLES[
                      account.health.contractStatus ?? "active"
                    ] ?? CONTRACT_STATUS_STYLES.active
                  )}
                >
                  {(account.health.contractStatus ?? "active").replace(
                    /_/g,
                    " "
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renewal</span>
                <span className="text-foreground">
                  {formatDate(account.health.renewalDate)}
                  {renewalDays !== null && (
                    <span className="text-muted-foreground ml-1">
                      ({renewalDays} days)
                    </span>
                  )}
                </span>
              </div>
              {products.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Products</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {products.map((p) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground"
                      >
                        {PRODUCT_LABELS[p] ?? p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DrawerSection>

          {/* 5. Usage Metrics */}
          {usageMetrics && (
            <DrawerSection title="Usage Metrics">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    API Calls (30d)
                  </span>
                  <span className="text-foreground font-medium">
                    {usageMetrics.api_calls_30d.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trend</span>
                  <span
                    className={cn(
                      "font-medium flex items-center gap-1",
                      usageMetrics.trend_pct >= 0
                        ? "text-success"
                        : "text-danger"
                    )}
                  >
                    {usageMetrics.trend_pct >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {usageMetrics.trend_pct > 0 ? "+" : ""}
                    {usageMetrics.trend_pct}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Active Seats
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">
                      {usageMetrics.seats_active} /{" "}
                      {usageMetrics.seats_total}
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground/40"
                        style={{
                          width: `${(usageMetrics.seats_active / usageMetrics.seats_total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </DrawerSection>
          )}

          {/* 6. Key Stakeholders */}
          {stakeholders.length > 0 && (
            <DrawerSection title="Key Stakeholders">
              <div className="space-y-2">
                {stakeholders.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full shrink-0",
                        getStakeholderDotColor(s.status)
                      )}
                    />
                    <span className="text-foreground font-medium">
                      {s.name}
                    </span>
                    <span className="text-muted-foreground">
                      &mdash; {s.title}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto capitalize">
                      ({s.status})
                    </span>
                  </div>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* 7. Expansion Map */}
          <DrawerSection title="Expansion Map">
            {expansionMap.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-success">
                  Total whitespace: {formatCurrency(totalExpansionArr)} additional ARR
                </p>
                {expansionMap.map((e, i) => (
                  <div
                    key={i}
                    className="bg-muted/50 rounded-lg p-3 space-y-1"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {e.department} &middot; {e.headcount} people
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        No Claude today &rarr;
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[11px] font-medium",
                          getProductPillStyle(e.recommendedProduct)
                        )}
                      >
                        {e.recommendedProduct}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(e.opportunityArr)}/yr potential
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.rationale}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No expansion opportunities mapped
              </p>
            )}
          </DrawerSection>

          {/* 8. Risk Signals */}
          <DrawerSection title="Risk Signals">
            {riskSignals.length > 0 ? (
              <div className="space-y-2">
                {riskSignals.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      {r.signal}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No risk signals detected
              </p>
            )}
          </DrawerSection>

          {/* 9. Expansion Signals */}
          <DrawerSection title="Expansion Signals">
            {expansionSignals.length > 0 ? (
              <div className="space-y-2">
                {expansionSignals.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    <div>
                      <span className="text-foreground">{s.signal}</span>
                      {s.product && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {PRODUCT_LABELS[s.product] ?? s.product}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No expansion signals detected
              </p>
            )}
          </DrawerSection>

          {/* 10. Proactive Signals */}
          <DrawerSection title="Proactive Signals">
            {proactiveSignals.length > 0 ? (
              <div className="space-y-3">
                {proactiveSignals.map((ps, i) => {
                  const cardId = `signal-${i}`;
                  const isActiveCard = activeEmailCard === cardId;
                  const showEmailLoading = isActiveCard && emailLoading;
                  const showEmailResult = isActiveCard && emailResult;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                        <p className="text-sm font-medium text-foreground">
                          {getSignalIcon(ps.type)} {getSignalTypeLabel(ps.type)} &middot;{" "}
                          <span className="text-muted-foreground font-normal">
                            {ps.daysAgo} days ago
                          </span>
                        </p>
                        <p className="text-sm text-foreground">{ps.signal}</p>
                        <p className="text-xs text-muted-foreground">
                          Relevance: {ps.relevance}
                        </p>
                        <button
                          onClick={() => handleSignalEmail(ps, i)}
                          className="text-xs font-medium text-secondary hover:underline cursor-pointer transition-colors"
                        >
                          &rarr; {ps.action}
                        </button>
                      </div>

                      {/* Loading state */}
                      {showEmailLoading && (
                        <div className="bg-card border border-border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Drafting outreach email...
                          </p>
                        </div>
                      )}

                      {/* Generated email */}
                      {showEmailResult && emailResult && (
                        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-secondary" />
                            <p className="text-xs font-semibold text-secondary">
                              Generated Outreach
                            </p>
                          </div>
                          <p className="text-xs font-medium text-foreground">
                            Subject: {emailResult.subject}
                          </p>
                          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                            {emailResult.body}
                          </p>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={handleDismissEmail}
                              className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-border transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={handleCopyEmail}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors"
                            >
                              {emailCopied ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              {emailCopied ? "Copied" : "Copy Email"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No proactive signals detected
              </p>
            )}
          </DrawerSection>

          {/* 11. Similar Situations */}
          <DrawerSection title="Similar Situations">
            {similarSituations.length > 0 ? (
              <div className="space-y-3">
                {similarSituations.map((sit, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      🔗 {sit.accountName} &middot;{" "}
                      <span className="font-normal text-muted-foreground">{sit.vertical}</span>
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {sit.situation}
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-medium">Resolution:</span> {sit.resolution}
                    </p>
                    <p className="text-sm text-success font-medium">
                      &#10003; {sit.outcome}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Why this applies: {sit.relevance}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No similar patterns identified
              </p>
            )}
          </DrawerSection>

          {/* 12. Recommended Resources */}
          <DrawerSection title="Recommended Resources">
            {recommendedResources.length > 0 ? (
              <div className="space-y-3">
                {recommendedResources.map((res, i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-sm">📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {res.title}
                        </p>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
                          {res.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {res.relevance}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Key section: {res.keySection}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No resources matched
              </p>
            )}
          </DrawerSection>

          {/* 13. Recent Messages */}
          {messages.length > 0 && (
            <DrawerSection title="Recent Messages">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-muted rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {"\uD83D\uDCE9"} &ldquo;{msg.subject}&rdquo;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {msg.contact.firstName} {msg.contact.lastName}{" "}
                          &middot; {timeAgo(msg.receivedAt)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[11px] px-1.5 py-0.5 rounded font-medium",
                          msg.status === "kit_ready"
                            ? "bg-secondary/10 text-secondary"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {msg.status === "kit_ready"
                          ? "Kit Ready"
                          : "Pending"}
                      </span>
                    </div>
                    <button
                      onClick={() => onViewKit(msg)}
                      className="mt-2 text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
                    >
                      View Response Kit &rarr;
                    </button>
                  </div>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* 14. Actions */}
          <DrawerSection title="Actions">
            <div className="space-y-3">
              {/* Log Observation */}
              {!obsExpanded ? (
                <button
                  onClick={() => setObsExpanded(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-border text-sm font-medium text-foreground transition-colors"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Log Observation
                </button>
              ) : (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Log Observation
                  </p>
                  <textarea
                    value={obsText}
                    onChange={(e) => setObsText(e.target.value)}
                    placeholder="What are you noticing about this account?"
                    rows={3}
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    disabled={obsLoading}
                  />
                  {obsResult === "success" && (
                    <p className="text-xs text-success font-medium">
                      &#10003; Observation captured and classified
                    </p>
                  )}
                  {obsResult === "error" && (
                    <p className="text-xs text-danger font-medium">
                      Couldn&apos;t save observation. Try again.
                    </p>
                  )}
                  {obsLoading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Capturing observation...
                    </p>
                  )}
                  {!obsResult && !obsLoading && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setObsExpanded(false);
                          setObsText("");
                          setObsResult(null);
                        }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-border transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleObsSubmit}
                        disabled={!obsText.trim()}
                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50 transition-colors"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QBR Prep */}
              {!qbrExpanded ? (
                <button
                  onClick={() => setQbrExpanded(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-border text-sm font-medium text-foreground transition-colors"
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Prep for QBR
                </button>
              ) : qbrBrief ? (
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    <p className="text-sm font-semibold text-secondary">
                      QBR Brief: {qbrBrief.qbr_type}
                    </p>
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {account.company.name}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {qbrBrief.executive_summary}
                  </p>

                  <div>
                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-2">
                      Agenda
                    </p>
                    <div className="space-y-3">
                      {qbrBrief.agenda_items.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {i + 1}. {item.topic}{" "}
                            <span className="text-muted-foreground font-normal">
                              ({item.duration_minutes} min)
                            </span>
                          </p>
                          <ul className="space-y-0.5 ml-4">
                            {item.talking_points.map((tp, j) => (
                              <li
                                key={j}
                                className="text-xs text-foreground list-disc"
                              >
                                {tp}
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-muted-foreground ml-4">
                            Prepare: {item.data_to_prepare}
                          </p>
                          <p className="text-[11px] text-muted-foreground ml-4">
                            Goal: {item.desired_outcome}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-foreground">
                    <span className="font-medium">Invite:</span>{" "}
                    {qbrBrief.stakeholder_strategy}
                  </p>

                  {qbrBrief.risk_to_address && (
                    <div className="bg-warning/10 rounded-md p-2">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">&#9888; Risk:</span>{" "}
                        {qbrBrief.risk_to_address}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Success:</span>{" "}
                    {qbrBrief.success_metric}
                  </p>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        setQbrBrief(null);
                        setQbrType(null);
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-border transition-colors"
                    >
                      New QBR Type
                    </button>
                    <button
                      onClick={handleCopyQbr}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-white hover:bg-foreground/90 transition-colors"
                    >
                      {qbrCopied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {qbrCopied ? "Copied" : "Copy Brief"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    What&apos;s the focus for this QBR?
                  </p>
                  {qbrLoading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 py-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating QBR agenda...
                    </p>
                  ) : qbrError ? (
                    <div className="space-y-2">
                      <p className="text-xs text-danger">{qbrError}</p>
                      <button
                        onClick={() => {
                          setQbrError(null);
                          setQbrType(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "Renewal Defense",
                          "Expansion Pitch",
                          "Usage Review",
                          "Executive Re-engagement",
                        ].map((type) => (
                          <button
                            key={type}
                            onClick={() => handleQbrGenerate(type)}
                            className={cn(
                              "px-3 py-2 rounded-md text-xs font-medium transition-colors",
                              qbrType === type
                                ? "bg-foreground text-white"
                                : "bg-muted hover:bg-border text-foreground"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setQbrExpanded(false);
                          setQbrType(null);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Draft Check-in Email */}
              <button
                onClick={onDraftEmail}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-muted hover:bg-border text-sm font-medium text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground" />
                Draft Check-in Email
              </button>
            </div>
          </DrawerSection>
        </div>
      </div>
    </>
  );
}

// ── Drawer Section ──

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

// ── Draft Email Modal ──

function DraftEmailModal({
  account,
  onClose,
}: {
  account: Account;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const companyName = account.company.name;
  const contact = account.health.keyStakeholders?.[0];
  const contactFirstName = contact?.name?.split(" ")[0] ?? "there";

  const email =
    DRAFT_EMAILS[companyName] ??
    getDefaultDraftEmail(companyName, contactFirstName);

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[60]"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] max-h-[80vh] bg-card border border-border rounded-xl shadow-2xl z-[70] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="font-semibold text-sm text-foreground">
              Draft Check-in Email
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-muted hover:bg-border text-muted-foreground transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Email content */}
        <div className="p-5 overflow-y-auto space-y-3">
          <div>
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Subject
            </span>
            <p className="text-sm font-medium text-foreground mt-0.5">
              {email.subject}
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {email.body}
          </div>
        </div>
      </div>
    </>
  );
}

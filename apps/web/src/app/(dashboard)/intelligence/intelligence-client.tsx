"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Swords,
  FileX,
  AlertTriangle,
  Trophy,
  Shield,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  Sparkles,
  Send,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { usePersona } from "@/components/providers";

type Cluster = {
  id: string;
  title: string;
  summary: string | null;
  signalType: string;
  targetFunction: string | null;
  observationCount: number | null;
  observerCount: number | null;
  verticalsAffected: string[] | null;
  severity: string | null;
  resolutionStatus: string | null;
  resolutionNotes: string | null;
  effectivenessScore: number | null;
  arrImpactTotal: string | null;
  arrImpactDetails: unknown;
  unstructuredQuotes: unknown;
  structuredSummary: unknown;
  pipelineImpact: unknown;
  firstObserved: Date | null;
  lastObserved: Date | null;
};

type Observation = {
  id: string;
  rawInput: string;
  status: string | null;
  aiClassification: unknown;
  clusterId: string | null;
  arrImpact: unknown;
  structuredData: unknown;
  createdAt: Date;
  observerId: string;
  observerName: string | null;
  observerRole: string | null;
  observerVertical: string | null;
};

type Directive = {
  id: string;
  scope: string;
  vertical: string | null;
  directive: string;
  priority: string;
  category: string;
  isActive: boolean;
};

type TabKey = "patterns" | "feed" | "close";

type Classification = {
  signals?: { type: string; confidence: number; summary: string }[];
  sentiment?: string;
  urgency?: string;
};

const SIGNAL_COLORS: Record<string, string> = {
  competitive_intel: "bg-red-50 text-red-700",
  content_gap: "bg-amber-50 text-amber-700",
  deal_blocker: "bg-red-50 text-red-700",
  win_pattern: "bg-emerald-50 text-emerald-700",
  process_friction: "bg-orange-50 text-orange-700",
  agent_tuning: "bg-violet-50 text-violet-700",
  cross_agent: "bg-blue-50 text-blue-700",
  field_intelligence: "bg-cyan-50 text-cyan-700",
};

type Quote = { quote: string; role: string; vertical: string; date: string };
type CloseFactorRow = { category: string; count: number; totalArr: number; labels: string[] };
type CloseIntelligence = {
  lostDealCount: number;
  wonDealCount: number;
  totalLostArr: number;
  totalWonArr: number;
  lossFactors: CloseFactorRow[];
  winFactors: CloseFactorRow[];
} | null;
type ArrDetails = {
  deals?: { name: string; value: number; stage: string }[];
  by_stage?: Record<string, { count: number; value: number }>;
  by_vertical?: Record<string, { count: number; value: number }>;
};
type StructuredSummary = {
  most_common_scope?: string;
  avg_frequency?: string;
  avg_severity?: string;
  has_workaround_pct?: number;
  top_affected_stages?: string[];
};

const SIGNAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  competitive_intel: Swords,
  content_gap: FileX,
  deal_blocker: AlertTriangle,
  win_pattern: Trophy,
  process_friction: Shield,
  field_intelligence: Eye,
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700", label: "CRITICAL" },
  concerning: { bg: "bg-amber-100", text: "text-amber-700", label: "CONCERNING" },
  notable: { bg: "bg-blue-100", text: "text-blue-700", label: "NOTABLE" },
  informational: { bg: "bg-muted", text: "text-muted-foreground", label: "INFO" },
  resolved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "RESOLVED" },
};

const STATUS_STYLES: Record<string, string> = {
  emerging: "bg-muted text-muted-foreground",
  acknowledged: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  dismissed: "bg-muted text-muted-foreground",
};

function timeAgo(d: Date | string | null): string {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function IntelligenceClient({
  clusters,
  observations,
  avgResponseTime = "No data",
  closeIntelligence = null,
  directives = [],
}: {
  clusters: Cluster[];
  observations: Observation[];
  avgResponseTime?: string;
  closeIntelligence?: CloseIntelligence;
  directives?: Directive[];
}) {
  const { currentUser } = usePersona();
  const [signalFilter, setSignalFilter] = useState("all");
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabKey) || "patterns";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const isSupport = (currentUser?.role as string) === "SUPPORT";
  const isAE = currentUser?.role === "AE" || currentUser?.role === "SA" || currentUser?.role === "BDR" || currentUser?.role === "CSM";
  const userFunction = isSupport ? currentUser?.verticalSpecialization : null;

  // Default filter based on support function
  const defaultSignalFilter = useMemo(() => {
    if (userFunction === "enablement") return "content_gap";
    if (userFunction === "product_marketing") return "competitive_intel";
    if (userFunction === "deal_desk") return "process_friction";
    return "all";
  }, [userFunction]);

  const activeFilter = signalFilter === "all" && isSupport ? defaultSignalFilter : signalFilter;

  // Metrics
  const activeClusters = clusters.filter((c) => c.resolutionStatus !== "resolved" && c.resolutionStatus !== "dismissed");
  const totalArrAtRisk = activeClusters.reduce((s, c) => s + Number(c.arrImpactTotal || 0), 0);
  const obsThisMonth = observations.filter((o) => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const resolvedCount = clusters.filter((c) => c.resolutionStatus === "resolved").length;
  const resolutionRate = clusters.length > 0 ? Math.round((resolvedCount / clusters.length) * 100) : 0;

  // Filtered clusters
  const filtered = clusters.filter((c) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "content_gap") return c.signalType === "content_gap" || c.signalType === "win_pattern";
    if (activeFilter === "competitive_intel") return c.signalType === "competitive_intel";
    if (activeFilter === "process_friction") return c.signalType === "process_friction" || c.signalType === "deal_blocker";
    return c.signalType === activeFilter;
  }).sort((a, b) => Number(b.arrImpactTotal || 0) - Number(a.arrImpactTotal || 0));

  const subtitle = isSupport
    ? userFunction === "enablement"
      ? "Content gaps and winning patterns from the field"
      : userFunction === "product_marketing"
        ? "Competitive intelligence from frontline conversations"
        : "Process friction and deal blockers impacting velocity"
    : "Real-time insights from the field, powered by your team's observations";

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Field Intelligence Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-6" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: 24 }}>
        {([
          { key: "patterns" as TabKey, label: "Patterns" },
          { key: "feed" as TabKey, label: "Field Feed" },
          { key: "close" as TabKey, label: "Close Intelligence" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className="pb-3 text-sm transition-colors"
            style={{
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#3D3833" : "#8A8078",
              borderBottom: activeTab === tab.key ? "2px solid #E07A5F" : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Patterns Tab ── */}
      {activeTab === "patterns" && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-5 gap-4">
            <MetricCard icon={Eye} label="Active Patterns" value={activeClusters.length.toString()} />
            <MetricCard icon={DollarSign} label="Total ARR at Risk" value={formatCurrency(totalArrAtRisk)} color="text-danger" />
            <MetricCard icon={MessageSquare} label="Observations" value={obsThisMonth.toString()} subtitle="this month" />
            <MetricCard icon={Clock} label="Avg Response" value={avgResponseTime} />
            <MetricCard icon={CheckCircle} label="Resolution Rate" value={`${resolutionRate}%`} color="text-success" />
          </div>

          {/* AE Impact Card — visible to AEs/SAs/BDRs/CSMs only */}
          {isAE && currentUser && (
            <AeImpactCard currentUser={currentUser} observations={observations} />
          )}

          {/* Ask Your Team — visible to MANAGER and SUPPORT only */}
          {(currentUser?.role === "MANAGER" || (currentUser?.role as string) === "SUPPORT") && (
            <AskTeamInput currentUser={currentUser} />
          )}

          {/* Your Queries — visible to MANAGER and SUPPORT only */}
          {(currentUser?.role === "MANAGER" || (currentUser?.role as string) === "SUPPORT") && (
            <YourQueries currentUser={currentUser} />
          )}

          {/* Your Directives — visible to MANAGER only */}
          {currentUser?.role === "MANAGER" && directives.length > 0 && (
            <DirectivesSection directives={directives} />
          )}

          {/* Filters */}
          <div className="flex items-center gap-2">
            {[
              { key: "all", label: "All Signals" },
              { key: "competitive_intel", label: "Competitive" },
              { key: "content_gap", label: "Content Gaps" },
              { key: "process_friction", label: "Process" },
              { key: "win_pattern", label: "Win Patterns" },
              { key: "process_innovation", label: "Playbook" },
            ].map((f) => (
              <button
                key={f.key}
                data-tour={f.key === "process_innovation" ? "playbook-filter" : undefined}
                onClick={() => setSignalFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  (signalFilter === f.key || (signalFilter === "all" && activeFilter === f.key))
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Pattern Cards */}
          <div className="space-y-4">
            {filtered.map((cluster) => (
              <PatternCard key={cluster.id} cluster={cluster} observations={observations} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No patterns match the current filter
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Field Feed Tab ── */}
      {activeTab === "feed" && (
        <FieldFeedTab observations={observations} clusters={clusters} onClusterClick={(clusterId) => {
          handleTabChange("patterns");
        }} />
      )}

      {/* ── Close Intelligence Tab ── */}
      {activeTab === "close" && (
        closeIntelligence ? (
          <CloseIntelligenceSection data={closeIntelligence} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No close intelligence data yet. Close deals to see win/loss patterns here.
          </div>
        )
      )}
    </div>
  );
}

function PatternCard({ cluster, observations }: { cluster: Cluster; observations: Observation[] }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = SIGNAL_ICONS[cluster.signalType] || Eye;
  const severity = SEVERITY_STYLES[cluster.severity || "informational"] || SEVERITY_STYLES.informational!;
  const status = STATUS_STYLES[cluster.resolutionStatus || "emerging"] || STATUS_STYLES.emerging!;
  const rawQuotes = (cluster.unstructuredQuotes as Quote[]) || [];
  const quotes = Array.from(new Map(rawQuotes.map((q) => [q.quote, q])).values());
  const arrDetails = cluster.arrImpactDetails as ArrDetails | null;
  const structSummary = cluster.structuredSummary as StructuredSummary | null;
  const arrTotal = Number(cluster.arrImpactTotal || 0);

  // Mini sparkline data (fake for demo — based on observation dates in cluster)
  const clusterObs = observations.filter((o) => o.clusterId === cluster.id);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left flex items-start gap-4"
      >
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", severity.bg)}>
          <Icon className={cn("h-5 w-5", severity.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">{cluster.title}</h3>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", severity.bg, severity.text)}>
              {severity.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{cluster.targetFunction?.replace("_", " ")}</span>
            <span>·</span>
            <span>{cluster.observationCount} observations</span>
            <span>·</span>
            <span>{cluster.observerCount} team members</span>
            {arrTotal > 0 && (
              <>
                <span>·</span>
                <span className="font-semibold text-danger">{formatCurrency(arrTotal)} at risk</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", status)}>
            {(cluster.resolutionStatus || "emerging").replace("_", " ")}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Analytics Section */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Analytics</p>

            <div className="grid grid-cols-3 gap-4">
              {arrTotal > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline at Risk</p>
                  <p className="text-lg font-bold text-danger">{formatCurrency(arrTotal)}</p>
                  {arrDetails?.deals && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {arrDetails.deals.length} deal{arrDetails.deals.length !== 1 && "s"}: {arrDetails.deals.map((d) => d.stage).join(", ")}
                    </p>
                  )}
                </div>
              )}
              {cluster.verticalsAffected && cluster.verticalsAffected.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Verticals</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cluster.verticalsAffected.map((v) => (
                      <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary">{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {structSummary && (
                <div>
                  <p className="text-xs text-muted-foreground">Signal Profile</p>
                  <div className="mt-1 space-y-0.5 text-xs text-foreground">
                    {structSummary.avg_severity && <p>Severity: <span className="font-medium">{structSummary.avg_severity}</span></p>}
                    {structSummary.avg_frequency && <p>Frequency: <span className="font-medium">{structSummary.avg_frequency}</span></p>}
                    {structSummary.has_workaround_pct !== undefined && <p>Workaround: <span className="font-medium">{structSummary.has_workaround_pct}%</span></p>}
                  </div>
                </div>
              )}
            </div>

            {/* Frequency sparkline */}
            {clusterObs.length > 1 && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Signal frequency:</p>
                <Sparkline data={clusterObs.map((o) => new Date(o.createdAt).getTime())} />
                <span className="text-[10px] text-muted-foreground">
                  {clusterObs.length > 2 ? "accelerating" : "steady"}
                </span>
              </div>
            )}
          </div>

          {/* Field Voices */}
          {quotes.length > 0 && (
            <div className="bg-muted/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Field Voices</p>
              <div className="space-y-3">
                {quotes.slice(0, 3).map((q, i) => (
                  <div key={i} className="pl-3 border-l-2 border-primary/30">
                    <p className="text-sm text-foreground italic">&ldquo;{q.quote}&rdquo;</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      — {q.role}, {q.vertical}, {q.date}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution */}
          {cluster.resolutionNotes && (
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="h-3.5 w-3.5 text-success" />
              <span className="text-success font-medium">Resolution:</span>
              <span className="text-foreground">{cluster.resolutionNotes}</span>
              {cluster.effectivenessScore != null && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                  Effectiveness: {cluster.effectivenessScore}/100
                </span>
              )}
            </div>
          )}

          {/* Action Recommendation */}
          {(() => {
            const action = getRecommendedAction(cluster);
            return action ? (
              <div className="flex items-start gap-2 text-xs pt-1" style={{ color: "#8A8078" }}>
                <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{action}</span>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 16;
  const points = data
    .sort((a, b) => a - b)
    .map((d, i) => `${(i / (data.length - 1)) * w},${h - ((d - min) / range) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke="#0C7489" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; subtitle?: string; color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", color || "text-foreground")}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Conversational Ask Input ──

type Suggestion = { question: string; fullQuestion: string; clusterId: string };
type AskPhase = "collapsed" | "expanded" | "submitting" | "sent" | "answered";
type AskResult = { status: string; questions_sent?: number; immediate_answer?: string | null };

function AskTeamInput({ currentUser }: { currentUser: { id: string; name: string; role: string; verticalSpecialization: string } | null }) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<AskPhase>("collapsed");
  const [result, setResult] = useState<AskResult | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);

  // Load suggestions when expanded
  useEffect(() => {
    if (phase === "expanded" && suggestions.length === 0) {
      fetch("/api/field-queries/suggestions")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setSuggestions(data); })
        .catch(() => {});
    }
  }, [phase, suggestions.length]);

  async function handleSubmit(question?: string, clusterId?: string) {
    const q = question || input.trim();
    if (!q || !currentUser) return;
    setSubmittedQuestion(q);
    setPhase("submitting");

    try {
      const res = await fetch("/api/field-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawQuestion: q,
          initiatedBy: currentUser.id,
          clusterId: clusterId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setPhase(data.status === "answered" ? "answered" : "sent");
        setInput("");
      } else {
        setPhase("expanded");
      }
    } catch {
      setPhase("expanded");
    }
  }

  function handleReset() {
    setPhase("collapsed");
    setInput("");
    setResult(null);
    setSubmittedQuestion("");
    setHighlightedSuggestion(-1);
  }

  // ── Collapsed state ──
  if (phase === "collapsed") {
    return (
      <button
        data-tour="ask-input"
        onClick={() => setPhase("expanded")}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E5E0",
          boxShadow: "0 2px 8px rgba(107,79,57,0.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(224,122,95,0.3)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(107,79,57,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#E8E5E0";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(107,79,57,0.04)";
        }}
      >
        <Sparkles className="h-4 w-4 shrink-0" style={{ color: "#E07A5F" }} />
        <span className="text-[13.5px] flex-1 text-left" style={{ color: "#8A8078" }}>
          Ask about what you&apos;re seeing
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 rotate-180" style={{ color: "#D4C9BD" }} />
      </button>
    );
  }

  // ── Submitting state ──
  if (phase === "submitting") {
    return (
      <div
        className="rounded-xl overflow-hidden animate-[fadeSlideUp_0.3s_ease]"
        style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
      >
        <div className="p-5 space-y-3">
          {/* User question bubble */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] px-4 py-2.5 text-[14px] leading-[1.55]"
              style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "16px 16px 4px 16px" }}
            >
              {submittedQuestion}
            </div>
          </div>
          {/* Loading */}
          <div className="flex items-center gap-2.5">
            <span
              className="h-4 w-4 rounded-full border-2 animate-spin shrink-0"
              style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }}
            />
            <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>
              Checking existing intelligence…
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Answered state (from existing data) ──
  if (phase === "answered" && result?.immediate_answer) {
    return (
      <div
        className="rounded-xl overflow-hidden animate-[fadeSlideUp_0.4s_ease]"
        style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
      >
        <div className="p-5 space-y-3">
          {/* User question bubble */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] px-4 py-2.5 text-[14px] leading-[1.55]"
              style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "16px 16px 4px 16px" }}
            >
              {submittedQuestion}
            </div>
          </div>
          {/* Sparkle response card */}
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px" }}>
            <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
              <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>
                Nexus Intelligence
              </span>
              <button onClick={handleReset} className="ml-auto p-0.5 transition-colors hover:opacity-70" style={{ color: "#8A8078" }}>
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="px-[18px] py-3.5">
              <p className="text-[13.5px] leading-[1.55]" style={{ color: "#3D3833" }}>
                {result.immediate_answer}
              </p>
              <p className="text-[11px] mt-3 pt-2" style={{ color: "#8A8078", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                Answered from existing data
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Sent state (questions dispatched to AEs) ──
  if (phase === "sent" && result) {
    return (
      <div
        className="rounded-xl overflow-hidden animate-[fadeSlideUp_0.4s_ease]"
        style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
      >
        <div className="p-5 space-y-3">
          {/* User question bubble */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] px-4 py-2.5 text-[14px] leading-[1.55]"
              style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "16px 16px 4px 16px" }}
            >
              {submittedQuestion}
            </div>
          </div>
          {/* Sparkle response card */}
          <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px" }}>
            <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
              <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>
                Nexus Intelligence
              </span>
              <button onClick={handleReset} className="ml-auto p-0.5 transition-colors hover:opacity-70" style={{ color: "#8A8078" }}>
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="px-[18px] py-3.5">
              {result.immediate_answer && (
                <p className="text-[13.5px] leading-[1.55] mb-3" style={{ color: "#3D3833" }}>
                  {result.immediate_answer}
                </p>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#2D8A4E" }} />
                <p className="text-[13px]" style={{ color: "#3D3833" }}>
                  Sent targeted questions to {result.questions_sent} rep{result.questions_sent !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-[11px] mt-2" style={{ color: "#8A8078" }}>
                Responses will appear in Your Queries below. Questions expire in 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded state (input form) ──
  return (
    <div
      className="rounded-xl overflow-hidden animate-[fadeSlideUp_0.3s_ease]"
      style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "#E07A5F" }} />
            <span className="text-[13px] font-medium" style={{ color: "#3D3833" }}>
              What patterns are you curious about?
            </span>
          </div>
          <button onClick={handleReset} className="p-0.5 transition-colors hover:opacity-70" style={{ color: "#8A8078" }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder='e.g., "Are CompetitorX deals recoverable? Is compliance slowing healthcare?"'
          rows={2}
          autoFocus
          className="w-full px-3 py-2.5 rounded-lg text-[14px] resize-none focus:outline-none"
          style={{
            border: "1px solid #E8E5E0",
            background: "#FFFFFF",
            color: "#3D3833",
            maxHeight: "120px",
          }}
        />

        {/* Quick suggestions */}
        {suggestions.length > 0 && !input.trim() && (
          <>
            <div className="flex items-center gap-2 mt-4 mb-2">
              <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.06)" }} />
              <span className="text-[11px] px-2" style={{ color: "#8A8078" }}>
                Suggested from dashboard
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(0,0,0,0.06)" }} />
            </div>

            <div className="space-y-0.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(s.fullQuestion, s.clusterId)}
                  onMouseEnter={() => setHighlightedSuggestion(i)}
                  onMouseLeave={() => setHighlightedSuggestion(-1)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150"
                  style={{ background: highlightedSuggestion === i ? "#F3EDE7" : "transparent" }}
                >
                  <span
                    className="flex items-center justify-center shrink-0 text-[12px] font-semibold transition-all duration-150"
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      border: `1.5px solid ${highlightedSuggestion === i ? "#E07A5F" : "#D4C9BD"}`,
                      color: highlightedSuggestion === i ? "#E07A5F" : "#8A8078",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[14px] flex-1 text-left" style={{ color: "#3D3833" }}>
                    {s.question}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-[11px] mt-2 px-3" style={{ color: "rgba(138,128,120,0.5)" }}>
              1-{suggestions.length} select · or type your own question
            </p>
          </>
        )}

        {/* Submit button */}
        <div className="flex justify-end mt-3">
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200"
            style={{
              background: input.trim() ? "#E07A5F" : "#D4C9BD",
              color: input.trim() ? "#FFFFFF" : "#8A8078",
              opacity: input.trim() ? 1 : 0.6,
              cursor: input.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Send className="h-3.5 w-3.5" />
            Ask Nexus
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Your Queries Section ──

type QueryResponse = { memberName: string; dealName: string; answer: string };

type QueryResult = {
  id: string;
  rawQuestion: string;
  status: string;
  aggregatedAnswer: {
    summary?: string;
    response_count?: number;
    target_count?: number;
    answered_from_data?: boolean;
    updated_at?: string;
  } | null;
  createdAt: string;
  targetCount: number;
  responseCount: number;
  responses?: QueryResponse[];
  waitingFor?: string[];
};

function YourQueries({ currentUser }: { currentUser: { id: string } | null }) {
  const [queries, setQueries] = useState<QueryResult[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    async function fetchQueries() {
      try {
        const res = await fetch(`/api/field-queries?initiatedBy=${currentUser!.id}`);
        if (res.ok) {
          const data = await res.json();
          setQueries(data);
        }
      } catch {}
    }
    fetchQueries();
    const interval = setInterval(fetchQueries, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  if (queries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Your Queries</h2>
      {queries.map((q) => (
        <QueryCard key={q.id} query={q} />
      ))}
    </div>
  );
}

function QueryCard({ query }: { query: QueryResult }) {
  const hasResponses = query.responseCount > 0;
  const allResponded = query.responseCount >= query.targetCount && query.targetCount > 0;
  const answer = query.aggregatedAnswer;
  const isDataAnswer = answer?.answered_from_data || query.targetCount === 0;
  const responses = query.responses || [];
  const waitingFor = query.waitingFor || [];

  // Calculate hours remaining
  const expiresIn = (() => {
    const created = new Date(query.createdAt);
    const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
    return hoursLeft;
  })();

  return (
    <div className="space-y-3">
      {/* User question bubble */}
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-4 py-2.5 text-[14px] leading-[1.55]"
          style={{ background: "#E8DDD3", color: "#3D3833", borderRadius: "16px 16px 4px 16px" }}
        >
          {query.rawQuestion}
        </div>
      </div>

      {/* Sparkle response card */}
      <div style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px", boxShadow: "0 2px 12px rgba(107,79,57,0.04)" }}>
        <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "#E07A5F" }} />
          <span className="text-[13px] font-semibold tracking-[0.01em]" style={{ color: "#3D3833" }}>
            Nexus Intelligence
          </span>
          <span className="text-[11px] ml-auto" style={{ color: "#8A8078" }}>
            {timeAgo(query.createdAt)}
          </span>
        </div>

        <div className="px-[18px] py-3.5 space-y-3">
          {/* Summary / answer */}
          {answer?.summary && (
            <p className="text-[13.5px] leading-[1.55]" style={{ color: "#3D3833" }}>
              {answer.summary}
            </p>
          )}

          {/* Progress bar (if questions were sent) */}
          {query.targetCount > 0 && (
            <div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#F3EDE7" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${query.targetCount > 0 ? Math.round((query.responseCount / query.targetCount) * 100) : 0}%`,
                    background: allResponded ? "#2D8A4E" : "#E07A5F",
                    minWidth: query.responseCount > 0 ? "8px" : "0",
                  }}
                />
              </div>
              <span className="text-[11px] mt-1 inline-block" style={{ color: "#8A8078" }}>
                {query.responseCount} of {query.targetCount} responded
              </span>
            </div>
          )}

          {/* Individual responses */}
          {responses.length > 0 && (
            <div className="space-y-2">
              {responses.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[11px] mt-0.5" style={{ color: "#8A8078" }}>📋</span>
                  <p className="text-[13px] leading-[1.5]" style={{ color: "#3D3833" }}>
                    <span className="font-medium">{r.memberName}</span>
                    <span style={{ color: "#8A8078" }}> ({r.dealName})</span>: &ldquo;{r.answer}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Waiting for */}
          {waitingFor.length > 0 && !allResponded && (
            <p className="text-[11px]" style={{ color: "#8A8078" }}>
              ⏳ Waiting: {waitingFor.join(", ")} · {expiresIn > 0 ? `expires in ${expiresIn}h` : "expired"}
            </p>
          )}

          {/* Footer */}
          {isDataAnswer && (
            <p className="text-[11px] pt-1" style={{ color: "#8A8078", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
              Answered from existing data
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Action Recommendations (P5) ──

function getRecommendedAction(cluster: Cluster): string | null {
  if (cluster.resolutionStatus === "resolved" && (cluster.effectivenessScore || 0) > 70) {
    return null;
  }
  if (cluster.severity === "critical" && cluster.resolutionStatus !== "resolved") {
    return "Suggested: Schedule team huddle this week to develop response strategy";
  }
  if (cluster.severity === "concerning" && cluster.resolutionStatus === "emerging") {
    return "Suggested: Assign an owner to investigate and propose a fix";
  }
  if (cluster.severity === "concerning" && cluster.resolutionStatus === "in_progress") {
    return "In progress — check back in 1 week for effectiveness data";
  }
  if (
    (cluster.observationCount || 0) >= 3 &&
    (cluster.signalType === "content_gap" || cluster.signalType === "process_friction")
  ) {
    return "Suggested: Create or update documentation to address this pattern";
  }
  if (cluster.signalType === "win_pattern") {
    return "Suggested: Document this approach and share with the team as a playbook";
  }
  if (cluster.resolutionStatus === "acknowledged") {
    return "Acknowledged but no action taken yet — consider next steps";
  }
  return null;
}

// ── Close Intelligence Section (P4) ──

function CloseIntelligenceSection({ data }: { data: NonNullable<CloseIntelligence> }) {
  const categoryLabels: Record<string, string> = {
    competitor: "Competitor",
    stakeholder: "Stakeholder",
    process: "Process",
    product: "Product",
    pricing: "Pricing",
    timing: "Timing",
    internal: "Internal",
    champion: "Champion",
    competitive_wedge: "Competitive wedge",
    technical_fit: "Technical fit",
    timeline: "Timeline",
    relationship: "Relationship",
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Lost card */}
      {data.lostDealCount > 0 && (
        <div
          className="bg-card rounded-xl border border-border p-5"
          style={{ borderLeft: "3px solid #C74B3B" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: "#3D3833" }}>
              Deals Lost
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "#8A8078" }}>
            {data.lostDealCount} deal{data.lostDealCount !== 1 ? "s" : ""} · {formatCurrency(data.totalLostArr)} total
          </p>
          <div className="space-y-2">
            {data.lossFactors.slice(0, 5).map((f) => (
              <div key={f.category} className="flex items-center justify-between text-xs">
                <span style={{ color: "#3D3833" }}>
                  {categoryLabels[f.category] || f.category} ({f.count})
                </span>
                <span className="font-medium" style={{ color: "#C74B3B" }}>
                  {formatCurrency(f.totalArr)}
                </span>
              </div>
            ))}
          </div>
          {data.lossFactors[0] && (
            <p className="text-[11px] mt-3 pt-2" style={{ color: "#8A8078", borderTop: "1px solid #E8E5E0" }}>
              Top factor: {data.lossFactors[0].labels[0]}
            </p>
          )}
        </div>
      )}

      {/* Won card */}
      {data.wonDealCount > 0 && (
        <div
          className="bg-card rounded-xl border border-border p-5"
          style={{ borderLeft: "3px solid #2D8A4E" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: "#3D3833" }}>
              Deals Won
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: "#8A8078" }}>
            {data.wonDealCount} deal{data.wonDealCount !== 1 ? "s" : ""} · {formatCurrency(data.totalWonArr)} total
          </p>
          <div className="space-y-2">
            {data.winFactors.slice(0, 5).map((f) => (
              <div key={f.category} className="flex items-center justify-between text-xs">
                <span style={{ color: "#3D3833" }}>
                  {categoryLabels[f.category] || f.category} ({f.count})
                </span>
                <span className="font-medium" style={{ color: "#2D8A4E" }}>
                  {formatCurrency(f.totalArr)}
                </span>
              </div>
            ))}
          </div>
          {data.winFactors[0] && (
            <p className="text-[11px] mt-3 pt-2" style={{ color: "#8A8078", borderTop: "1px solid #E8E5E0" }}>
              Top factor: {data.winFactors[0].labels[0]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── AE Impact Card (P7) ──

function AeImpactCard({
  currentUser,
  observations,
}: {
  currentUser: { id: string; name: string; role: string };
  observations: Observation[];
}) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch(`/api/field-queries?targetMemberId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data.length);
        }
      } catch {}
    }
    fetchPending();
  }, [currentUser.id]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const myObs = observations.filter(
    (o) => o.observerId === currentUser.id && new Date(o.createdAt) >= startOfMonth
  );
  const inClusters = myObs.filter((o) => o.clusterId).length;

  return (
    <div
      className="bg-card rounded-xl border border-border p-5"
      style={{ boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
    >
      <p className="text-sm font-semibold mb-3" style={{ color: "#3D3833" }}>
        Your Impact This Month
      </p>
      <div className="flex items-center gap-6 text-xs" style={{ color: "#3D3833" }}>
        <span>
          <span className="font-medium">{myObs.length}</span>{" "}
          <span style={{ color: "#8A8078" }}>observations shared</span>
        </span>
        <span>
          <span className="font-medium">{inClusters}</span>{" "}
          <span style={{ color: "#8A8078" }}>became patterns</span>
        </span>
        {pendingCount > 0 && (
          <span>
            <span className="font-medium" style={{ color: "#E07A5F" }}>{pendingCount}</span>{" "}
            <span style={{ color: "#8A8078" }}>pending quick checks</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Field Feed Tab ──

function FieldFeedTab({
  observations,
  clusters,
  onClusterClick,
}: {
  observations: Observation[];
  clusters: Cluster[];
  onClusterClick: (clusterId: string) => void;
}) {
  const clusterMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clusters) m.set(c.id, c.title);
    return m;
  }, [clusters]);

  const STATUS_FLOW: Record<string, { label: string; color: string }> = {
    submitted: { label: "Shared", color: "bg-muted text-muted-foreground" },
    classified: { label: "Classified", color: "bg-muted text-muted-foreground" },
    clustered: { label: "Clustered", color: "bg-violet-50 text-violet-700" },
    routed: { label: "Routed", color: "bg-blue-50 text-blue-700" },
    acknowledged: { label: "Acknowledged", color: "bg-indigo-50 text-indigo-700" },
    in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-700" },
    resolved: { label: "Resolved", color: "bg-emerald-50 text-emerald-700" },
    action_taken: { label: "Action Taken", color: "bg-emerald-50 text-emerald-700" },
    escalated: { label: "Escalated", color: "bg-red-50 text-red-700" },
  };

  return (
    <div className="space-y-3">
      {observations.map((obs) => {
        const classification = obs.aiClassification as Classification | null;
        const signals = classification?.signals || [];
        const clusterTitle = obs.clusterId ? clusterMap.get(obs.clusterId) : null;
        const statusInfo = STATUS_FLOW[obs.status || "submitted"] || STATUS_FLOW.submitted!;

        // Anonymize for support functions: show role + vertical instead of name
        const displayName = obs.observerRole === "SUPPORT"
          ? `${obs.observerRole}, ${obs.observerVertical || "General"}`
          : obs.observerName || "Unknown";

        return (
          <div key={obs.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {/* Observer info */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium" style={{ color: "#3D3833" }}>
                    {displayName}
                  </span>
                  {obs.observerRole && obs.observerRole !== "SUPPORT" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {obs.observerRole}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(obs.createdAt)}
                  </span>
                </div>

                {/* Raw text */}
                <p className="text-sm text-foreground mb-2">{obs.rawInput}</p>

                {/* Classification + cluster + status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {signals.map((s, i) => {
                    const Icon = SIGNAL_ICONS[s.type] || Eye;
                    return (
                      <span
                        key={i}
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                          SIGNAL_COLORS[s.type] || "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {s.type.replace(/_/g, " ")}
                      </span>
                    );
                  })}
                  {clusterTitle && (
                    <button
                      onClick={() => obs.clusterId && onClusterClick(obs.clusterId)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-light text-primary hover:underline"
                    >
                      {clusterTitle}
                    </button>
                  )}
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusInfo.color)}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {observations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No observations yet. Share what you&apos;re noticing from any page.
        </div>
      )}
    </div>
  );
}

// ── Directives Section (MANAGER only) ──

function DirectivesSection({ directives }: { directives: Directive[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, Directive[]> = { mandatory: [], strong: [], guidance: [] };
    for (const d of directives) {
      if (groups[d.priority]) groups[d.priority]!.push(d);
    }
    return groups;
  }, [directives]);

  const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    mandatory: { label: "MANDATORY", color: "#E07A5F", icon: "\uD83D\uDD34" },
    strong: { label: "STRONG", color: "#D4A853", icon: "\uD83D\uDFE1" },
    guidance: { label: "GUIDANCE", color: "#6B9E6B", icon: "\uD83D\uDFE2" },
  };

  return (
    <div
      className="bg-card rounded-xl border border-border p-5"
      style={{ boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
    >
      <p className="text-base font-semibold mb-1" style={{ color: "#3D3833" }}>
        Your Directives
      </p>
      <p className="text-[13px] mb-5" style={{ color: "#8A8078" }}>
        These automatically flow into every AE&apos;s call prep and email draft.
      </p>

      <div className="space-y-5">
        {(["mandatory", "strong", "guidance"] as const).map((priority) => {
          const items = grouped[priority];
          if (!items || items.length === 0) return null;
          const config = PRIORITY_CONFIG[priority]!;

          return (
            <div key={priority}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: config.color }}>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: config.color }}
                />
                {config.label}
              </p>
              <div className="space-y-1.5">
                {items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "#3D3833" }}>{d.directive}</span>
                    <span className="text-xs shrink-0 ml-4" style={{ color: "#8A8078" }}>
                      {d.scope === "org_wide" ? "org-wide" : d.vertical?.replace("_", " ") || d.scope}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

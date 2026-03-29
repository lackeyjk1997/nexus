"use client";

import { useMemo, useState, useEffect } from "react";
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
  Loader2,
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
  observerRole: string | null;
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
}: {
  clusters: Cluster[];
  observations: Observation[];
  avgResponseTime?: string;
  closeIntelligence?: CloseIntelligence;
}) {
  const { currentUser } = usePersona();
  const [signalFilter, setSignalFilter] = useState("all");

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

      {/* Close Intelligence — visible to MANAGER and SUPPORT */}
      {closeIntelligence && (currentUser?.role === "MANAGER" || (currentUser?.role as string) === "SUPPORT") && (
        <CloseIntelligenceSection data={closeIntelligence} />
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "All Signals" },
          { key: "competitive_intel", label: "Competitive" },
          { key: "content_gap", label: "Content Gaps" },
          { key: "process_friction", label: "Process" },
          { key: "win_pattern", label: "Win Patterns" },
        ].map((f) => (
          <button
            key={f.key}
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

// ── Ask Your Team Input ──

type AskPhase = "idle" | "submitting" | "sent" | "answered";

function AskTeamInput({ currentUser }: { currentUser: { id: string; name: string; role: string; verticalSpecialization: string } | null }) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<AskPhase>("idle");
  const [result, setResult] = useState<{ status: string; questions_sent?: number; immediate_answer?: string } | null>(null);

  const placeholders: Record<string, string> = {
    MANAGER: 'e.g. "Are any of the CompetitorX deals recoverable if we adjust pricing?"',
    enablement: 'e.g. "Which reps are struggling most with the new competitive battlecard?"',
    product_marketing: 'e.g. "Is CompetitorX\'s free pilot actually winning deals or just delaying decisions?"',
    deal_desk: 'e.g. "Is the legal review delay specific to healthcare or happening everywhere?"',
  };

  const placeholderKey = currentUser?.role === "MANAGER" ? "MANAGER" : currentUser?.verticalSpecialization || "MANAGER";
  const placeholder = placeholders[placeholderKey] || placeholders.MANAGER!;

  async function handleSubmit() {
    if (!input.trim() || !currentUser) return;
    setPhase("submitting");

    try {
      const res = await fetch("/api/field-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawQuestion: input.trim(),
          initiatedBy: currentUser.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setPhase(data.status === "answered" ? "answered" : "sent");
        setTimeout(() => {
          setPhase("idle");
          setInput("");
          setResult(null);
        }, 8000);
      } else {
        setPhase("idle");
      }
    } catch {
      setPhase("idle");
    }
  }

  return (
    <div
      className="bg-card rounded-xl border border-border p-5"
      style={{ boxShadow: "0 4px 24px rgba(107,79,57,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4" style={{ color: "#E07A5F" }} />
        <span className="text-[13px] font-medium" style={{ color: "#3D3833" }}>
          Ask about what you&apos;re seeing
        </span>
      </div>

      {phase === "submitting" && (
        <div className="flex items-center gap-2.5 py-3">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#E07A5F" }} />
          <span className="text-[13px] animate-pulse" style={{ color: "#8A8078" }}>
            Checking existing data…
          </span>
        </div>
      )}

      {phase === "sent" && result && (
        <div className="py-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4" style={{ color: "#2D8A4E" }} />
            <span className="text-[13px] font-medium" style={{ color: "#3D3833" }}>
              Questions sent to {result.questions_sent} rep{result.questions_sent !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[12px]" style={{ color: "#8A8078" }}>
            Responses will appear below as they come in. Questions expire in 24 hours.
          </p>
        </div>
      )}

      {phase === "answered" && result?.immediate_answer && (
        <div className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4" style={{ color: "#2D8A4E" }} />
            <span className="text-[13px] font-medium" style={{ color: "#3D3833" }}>
              Answered from existing data
            </span>
          </div>
          <p className="text-[13px] leading-[1.55]" style={{ color: "#3D3833" }}>
            {result.immediate_answer}
          </p>
        </div>
      )}

      {phase === "idle" && (
        <>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSubmit();
            }}
            placeholder={placeholder}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg text-sm resize-none focus:outline-none focus:ring-2"
            style={{
              border: "1px solid #E8E5E0",
              background: "#FFFFFF",
              color: "#3D3833",
              maxHeight: "120px",
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: input.trim() ? "#E07A5F" : "#D4C9BD",
                color: input.trim() ? "#FFFFFF" : "#8A8078",
                opacity: input.trim() ? 1 : 0.6,
                cursor: input.trim() ? "pointer" : "not-allowed",
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Ask
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Your Queries Section ──

type QueryResult = {
  id: string;
  rawQuestion: string;
  status: string;
  aggregatedAnswer: {
    summary?: string;
    response_count?: number;
    target_count?: number;
    updated_at?: string;
  } | null;
  createdAt: string;
  targetCount: number;
  responseCount: number;
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
    // Refresh every 30 seconds
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
  const age = timeAgo(query.createdAt);
  const answer = query.aggregatedAnswer;

  return (
    <div className="bg-card rounded-xl border border-border p-4" style={{ boxShadow: "0 2px 8px rgba(107,79,57,0.04)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium" style={{ color: "#3D3833" }}>
            &ldquo;{query.rawQuestion}&rdquo;
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{
                background: allResponded ? "#2D8A4E" : hasResponses ? "#D4A843" : "#D4C9BD",
                animation: !allResponded && query.targetCount > 0 ? "pulse 2s infinite" : "none",
              }}
            />
            <span className="text-[12px]" style={{ color: "#8A8078" }}>
              {query.targetCount === 0
                ? "Answered from existing data"
                : hasResponses
                  ? `${query.responseCount} of ${query.targetCount} responded`
                  : `Waiting for responses (${query.targetCount} sent)`}
            </span>
          </div>

          {/* Progress bar */}
          {query.targetCount > 0 && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8E5E0" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((query.responseCount / query.targetCount) * 100)}%`,
                  background: allResponded ? "#2D8A4E" : "#D4A843",
                  minWidth: query.responseCount > 0 ? "8px" : "0",
                }}
              />
            </div>
          )}

          {answer?.summary && (
            <p className="text-[13.5px] leading-[1.5] mt-3" style={{ color: "#3D3833" }}>
              {answer.summary}
            </p>
          )}
        </div>

        <span className="text-[12px] shrink-0" style={{ color: "#8A8078" }}>
          {age}
        </span>
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

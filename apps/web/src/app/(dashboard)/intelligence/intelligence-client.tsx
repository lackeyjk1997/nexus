"use client";

import { useMemo, useState } from "react";
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
  observerRole: string | null;
};

type Quote = { quote: string; role: string; vertical: string; date: string };
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
}: {
  clusters: Cluster[];
  observations: Observation[];
}) {
  const { currentUser } = usePersona();
  const [signalFilter, setSignalFilter] = useState("all");

  const isSupport = (currentUser?.role as string) === "SUPPORT";
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
        <MetricCard icon={Clock} label="Avg Response" value="2.3d" />
        <MetricCard icon={CheckCircle} label="Resolution Rate" value={`${resolutionRate}%`} color="text-success" />
      </div>

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
  const quotes = (cluster.unstructuredQuotes as Quote[]) || [];
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

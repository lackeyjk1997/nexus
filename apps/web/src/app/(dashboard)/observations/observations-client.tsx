"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  Eye,
  Users,
  TrendingUp,
  Shield,
  Swords,
  FileX,
  AlertTriangle,
  Trophy,
  Zap,
  Clock,
  Check,
  DollarSign,
} from "lucide-react";
import { cn, getVerticalColor, formatCurrency } from "@/lib/utils";
import { usePersona } from "@/components/providers";

type Observation = {
  id: string;
  observerId: string;
  rawInput: string;
  status: string | null;
  aiClassification: unknown;
  aiGiveback: unknown;
  clusterId: string | null;
  lifecycleEvents: unknown;
  followUpQuestion: string | null;
  followUpResponse: string | null;
  arrImpact: unknown;
  createdAt: Date;
  observerName: string | null;
  observerRole: string | null;
};

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
  unstructuredQuotes: unknown;
  pipelineImpact: unknown;
  firstObserved: Date | null;
  lastObserved: Date | null;
};

type Classification = {
  signals?: { type: string; confidence: number; summary: string }[];
  sentiment?: string;
  urgency?: string;
};

type TabKey = "mine" | "patterns" | "impact";

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  classified: "bg-muted text-muted-foreground",
  routed: "bg-blue-50 text-blue-700",
  acknowledged: "bg-indigo-50 text-indigo-700",
  clustered: "bg-violet-50 text-violet-700",
  action_taken: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
  escalated: "bg-red-50 text-red-700",
};

const SIGNAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  competitive_intel: Swords,
  content_gap: FileX,
  deal_blocker: AlertTriangle,
  win_pattern: Trophy,
  process_friction: Shield,
  agent_tuning: Zap,
  cross_agent: Users,
  field_intelligence: Eye,
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

const SEVERITY_COLORS: Record<string, string> = {
  informational: "bg-muted",
  notable: "bg-blue-100",
  concerning: "bg-amber-100",
  critical: "bg-red-100",
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function ObservationsClient({
  observations,
  clusters,
}: {
  observations: Observation[];
  clusters: Cluster[];
}) {
  const [tab, setTab] = useState<TabKey>("mine");
  const { currentUser } = usePersona();

  const myObservations = observations.filter(
    (o) => o.observerId === currentUser?.id
  );

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "mine", label: "My Observations", icon: Eye },
    { key: "patterns", label: "Team Patterns", icon: Users },
    { key: "impact", label: "Impact", icon: TrendingUp },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Field Intelligence
        </h1>
        <p className="text-sm text-muted-foreground">
          Your observations and team patterns
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === "mine" && myObservations.length > 0 && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                {myObservations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "mine" && <MyObservationsTab observations={myObservations} />}
      {tab === "patterns" && <PatternsTab clusters={clusters} />}
      {tab === "impact" && (
        <ImpactTab observations={myObservations} clusters={clusters} />
      )}
    </div>
  );
}

function MyObservationsTab({ observations }: { observations: Observation[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {observations.map((obs) => {
        const classification = obs.aiClassification as Classification | null;
        const signals: { type: string; confidence: number; summary: string }[] = classification?.signals || [];
        const isExpanded = expandedId === obs.id;

        return (
          <div
            key={obs.id}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : obs.id)}
              className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">
                    {obs.rawInput}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {obs.status && (
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          STATUS_COLORS[obs.status] || STATUS_COLORS.submitted
                        )}
                      >
                        {obs.status.replace("_", " ")}
                      </span>
                    )}
                    {signals.map((s, i) => {
                      const Icon = SIGNAL_ICONS[s.type] || Sparkles;
                      return (
                        <span
                          key={i}
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1",
                            SIGNAL_COLORS[s.type] || "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {s.type.replace("_", " ")}
                        </span>
                      );
                    })}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(obs.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border mt-0 pt-3">
                {/* Full text */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Full observation
                  </p>
                  <p className="text-sm text-foreground">{obs.rawInput}</p>
                </div>

                {/* Classification */}
                {signals.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      AI Classification
                    </p>
                    <div className="space-y-1">
                      {signals.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-foreground capitalize">
                            {s.type.replace("_", " ")}
                          </span>
                          <span className="text-muted-foreground">
                            ({Math.round(s.confidence * 100)}% confidence)
                          </span>
                          <span className="text-muted-foreground">— {s.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Q&A */}
                {obs.followUpQuestion && (
                  <div className="space-y-2">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up</p>
                      <p className="text-sm text-foreground">{obs.followUpQuestion}</p>
                    </div>
                    {obs.followUpResponse && (
                      <div className="bg-primary-light/30 rounded-lg p-3 ml-4">
                        <p className="text-xs font-medium text-primary mb-1">Your response</p>
                        <p className="text-sm text-foreground">{obs.followUpResponse}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ARR Impact */}
                {obs.arrImpact != null && (
                  <div className="flex items-center gap-2 text-xs">
                    <DollarSign className="h-3.5 w-3.5 text-danger" />
                    <span className="font-medium text-danger">
                      Pipeline impact: €{((obs.arrImpact as { total_value: number }).total_value / 1000).toFixed(0)}K
                    </span>
                    <span className="text-muted-foreground">
                      across {(obs.arrImpact as { deal_count: number }).deal_count} deal(s)
                    </span>
                  </div>
                )}

                {/* Giveback */}
                {obs.aiGiveback != null && (
                  <div className="bg-primary-light/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1">AI Response</p>
                    <p className="text-sm text-foreground">
                      {(obs.aiGiveback as { acknowledgment: string }).acknowledgment}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {observations.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No observations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Share what you&apos;re noticing from any page in the app
          </p>
        </div>
      )}
    </div>
  );
}

function PatternsTab({ clusters }: { clusters: Cluster[] }) {
  return (
    <div className="space-y-4">
      {clusters.map((cluster) => {
        const Icon = SIGNAL_ICONS[cluster.signalType] || Sparkles;
        const arrTotal = Number(cluster.arrImpactTotal || 0);
        const quotes = (cluster.unstructuredQuotes as { quote: string; role: string; vertical: string; date: string }[]) || [];

        return (
          <div key={cluster.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", SIGNAL_COLORS[cluster.signalType] || "bg-muted text-muted-foreground")}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{cluster.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {cluster.observerCount} team members · {cluster.observationCount} observations
                    </span>
                    {arrTotal > 0 && (
                      <span className="text-xs font-semibold text-danger">
                        · {formatCurrency(arrTotal)} at risk
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cluster.severity && (
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", SEVERITY_COLORS[cluster.severity] || "bg-muted")}>
                    {cluster.severity}
                  </span>
                )}
                {cluster.resolutionStatus && (
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[cluster.resolutionStatus] || "bg-muted text-muted-foreground")}>
                    {cluster.resolutionStatus.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>

            {cluster.summary && (
              <p className="text-sm text-muted-foreground mb-3">{cluster.summary}</p>
            )}

            {/* Field Voices */}
            {quotes.length > 0 && (
              <div className="mb-3 space-y-2">
                {quotes.slice(0, 2).map((q, i) => (
                  <div key={i} className="pl-3 border-l-2 border-primary/20">
                    <p className="text-xs text-foreground italic">&ldquo;{q.quote.slice(0, 120)}...&rdquo;</p>
                    <p className="text-[10px] text-muted-foreground">— {q.role}, {q.vertical}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              {cluster.verticalsAffected?.map((v) => (
                <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-light text-primary">
                  {v}
                </span>
              ))}
              {cluster.resolutionNotes && (
                <span className="text-xs text-success flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {cluster.resolutionNotes}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImpactTab({ observations, clusters }: { observations: Observation[]; clusters: Cluster[] }) {
  const total = observations.length;
  const agentUpdates = observations.filter((o) => {
    const c = o.aiClassification as Classification | null;
    return c?.signals?.some((s) => s.type === "agent_tuning" || s.type === "cross_agent");
  }).length;
  const clustered = observations.filter((o) => o.clusterId).length;
  const resolved = observations.filter((o) => o.status === "resolved" || o.status === "action_taken").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <ImpactCard label="Observations Shared" value={total.toString()} icon={Eye} />
        <ImpactCard label="Agent Updates" value={agentUpdates.toString()} icon={Zap} color="text-violet-600" />
        <ImpactCard label="Clustered into Patterns" value={clustered.toString()} icon={Users} color="text-primary" />
        <ImpactCard label="Actions Taken" value={resolved.toString()} icon={Check} color="text-success" />
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Your observations are making a difference
        </h3>
        <div className="space-y-3">
          {observations.filter((o) => o.status === "resolved" || o.status === "action_taken").map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/30 border border-emerald-100">
              <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground">{obs.rawInput.slice(0, 100)}...</p>
                <p className="text-xs text-success mt-1">
                  Action taken · {timeAgo(obs.createdAt)}
                </p>
              </div>
            </div>
          ))}
          {resolved === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keep sharing — your observations are being classified and routed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ImpactCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", color || "text-foreground")}>{value}</p>
    </div>
  );
}

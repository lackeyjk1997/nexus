"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Star,
  Users,
  X,
  ExternalLink,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { usePersona } from "@/components/providers";

// ── Types ────────────────────────────────────────────────────────────────────

type SuccessThresholds = {
  velocity_pct?: number;
  sentiment_pts?: number;
  close_rate_pct?: number;
};

type CurrentMetrics = {
  velocity_pct?: number;
  sentiment_pts?: number;
  close_rate_pct?: number;
  deals_tested?: number;
};

type PlaybookIdea = {
  id: string;
  originatorId: string;
  originatedFrom: string | null;
  title: string;
  hypothesis: string;
  category: string;
  vertical: string | null;
  status: string;
  testStartDate: Date | null;
  testEndDate: Date | null;
  testGroupDeals: string[] | null;
  controlGroupDeals: string[] | null;
  results: {
    stage_velocity_change?: number;
    sentiment_shift?: number;
    adoption_count?: number;
    deals_influenced?: number;
    arr_influenced?: number;
    close_rate_test?: number | null;
    close_rate_control?: number | null;
    confidence?: string;
    measurement_period_days?: number;
  } | null;
  followers: string[] | null;
  followerCount: number | null;
  testGroup: string[] | null;
  controlGroup: string[] | null;
  successThresholds: SuccessThresholds | null;
  currentMetrics: CurrentMetrics | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  graduatedAt: Date | null;
  experimentDurationDays: number | null;
  experimentStart: Date | null;
  experimentEnd: Date | null;
  attribution: Record<string, unknown> | null;
  experimentEvidence: {
    deals: Array<{
      deal_name: string;
      deal_id: string | null;
      owner_name: string;
      owner_id: string;
      group: "test" | "control";
      stage: string;
      amount: number;
      days_in_stage: number;
      avg_days_baseline: number;
      sentiment_score: number;
      avg_sentiment_baseline: number;
      evidence: Array<{
        type: string;
        date: string;
        source: string;
        excerpt: string;
      }>;
    }>;
  } | null;
  createdAt: Date;
};

type InfluenceScore = {
  id: string;
  memberId: string;
  dimension: string;
  vertical: string | null;
  score: number | null;
  tier: string | null;
  attributions: Array<{
    type: string;
    description: string;
    arr_impact: number;
    date: string;
  }> | null;
  lastContributionAt: Date | null;
};

type Member = {
  id: string;
  name: string;
  role: string;
  verticalSpecialization: string;
};

type MarketSignal = {
  id: string;
  vertical: string | null;
  title: string;
  insight: string;
  confidence: string | null;
  supportingData: {
    sample_size?: number;
    time_range?: string;
    metric?: string;
  } | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(date: Date | null): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function relativeDate(date: string): string {
  const d = new Date(date);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function formatVertical(v: string | null): string {
  if (!v) return "All Verticals";
  return v
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDimension(d: string): string {
  return d
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function confidencePct(confidence: string | undefined): number {
  if (!confidence) return 0;
  const map: Record<string, number> = { low: 33, medium: 66, high: 100 };
  return map[confidence] ?? 0;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricBox({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div
      style={{
        background: "#F5F3EF",
        borderRadius: 8,
        padding: "8px 12px",
        minWidth: 90,
        flex: 1,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#8A8078",
          fontWeight: 500,
          marginBottom: 2,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color:
            positive === true
              ? "#2D8A4E"
              : positive === false
              ? "#C74B3B"
              : "#3D3833",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ConfidenceBar({ level }: { level: string | undefined }) {
  const pct = confidencePct(level);
  const color =
    level === "high"
      ? "#2D8A4E"
      : level === "medium"
      ? "#D4A843"
      : "#C74B3B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "#E8DDD3",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          textTransform: "capitalize",
        }}
      >
        {level ?? "—"} confidence
      </span>
    </div>
  );
}

// ── Confidence Band ──────────────────────────────────────────────────────────

const MIN_DEALS_FOR_GRADUATION = 8;

function getConfidenceBand(dealsTested: number) {
  if (dealsTested >= 13) return { label: "Statistically Significant", color: "#0C7489", pct: 100 };
  if (dealsTested >= 9) return { label: "High Confidence", color: "#2D8A4E", pct: 85 };
  if (dealsTested >= 5) return { label: "Medium Confidence", color: "#D4A843", pct: 55 };
  return { label: "Low Confidence", color: "#B45309", pct: 30 };
}

function ConfidenceBand({ dealsTested }: { dealsTested: number }) {
  const band = getConfidenceBand(dealsTested);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 4, background: "#E8DDD3", borderRadius: 2, overflow: "hidden", maxWidth: 120 }}>
        <div style={{ width: `${band.pct}%`, height: "100%", background: band.color, borderRadius: 2, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: band.color }}>
        {band.label} ({dealsTested} deals)
      </span>
    </div>
  );
}

// ── Metric Drill-Down Modal ──────────────────────────────────────────────────

type EvidenceDeal = {
  deal_name: string;
  deal_id: string | null;
  owner_name: string;
  group: "test" | "control";
  stage: string;
  amount: number;
  days_in_stage: number;
  avg_days_baseline: number;
  sentiment_score: number;
  avg_sentiment_baseline: number;
  evidence: Array<{ type: string; date: string; source: string; excerpt: string }>;
};

function MetricDrillDownModal({
  metricType,
  idea,
  onClose,
}: {
  metricType: "velocity" | "sentiment" | "close_rate";
  idea: PlaybookIdea;
  onClose: () => void;
}) {
  const metrics = idea.currentMetrics as CurrentMetrics | null;
  const evidence = idea.experimentEvidence as { deals: EvidenceDeal[] } | null;
  const deals = evidence?.deals ?? [];
  const testDeals = deals.filter((d) => d.group === "test");
  const controlDeals = deals.filter((d) => d.group === "control");

  const titles: Record<string, string> = {
    velocity: `Velocity: +${metrics?.velocity_pct ?? 0}%`,
    sentiment: `Sentiment: +${metrics?.sentiment_pts ?? 0} pts`,
    close_rate: `Close Rate: +${metrics?.close_rate_pct ?? 0}%`,
  };
  const descriptions: Record<string, string> = {
    velocity: `Test group deals move through stages ${metrics?.velocity_pct ?? 0}% faster than control`,
    sentiment: `Test group prospect sentiment is ${metrics?.sentiment_pts ?? 0} points higher`,
    close_rate: `Test group close rate is ${metrics?.close_rate_pct ?? 0} percentage points higher`,
  };

  function getMetricValue(deal: EvidenceDeal): string {
    if (metricType === "velocity") {
      const delta = deal.avg_days_baseline > 0
        ? Math.round(((deal.avg_days_baseline - deal.days_in_stage) / deal.avg_days_baseline) * 100)
        : 0;
      return delta > 0 ? `↑ ${delta}% faster` : delta < 0 ? `↓ ${Math.abs(delta)}% slower` : "baseline";
    }
    if (metricType === "sentiment") {
      const delta = deal.sentiment_score - deal.avg_sentiment_baseline;
      return delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : "baseline";
    }
    return "";
  }

  function getDaysStat(deal: EvidenceDeal): string {
    if (metricType === "velocity") return `${deal.days_in_stage} days`;
    if (metricType === "sentiment") return `Score: ${deal.sentiment_score}`;
    return formatStage(deal.stage);
  }

  function formatStage(s: string): string {
    return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  const dealsTested = metrics?.deals_tested ?? deals.length;
  const band = getConfidenceBand(dealsTested);

  const avgTestDays = testDeals.length > 0
    ? Math.round(testDeals.reduce((s, d) => s + d.days_in_stage, 0) / testDeals.length)
    : 0;
  const avgControlDays = controlDeals.length > 0
    ? Math.round(controlDeals.reduce((s, d) => s + d.days_in_stage, 0) / controlDeals.length)
    : 0;

  const allEvidence = testDeals.flatMap((d) =>
    d.evidence.map((e) => ({ ...e, dealName: d.deal_name }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          maxWidth: 700,
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>{titles[metricType]}</div>
            <div style={{ fontSize: 12, color: "#8A8078", marginTop: 2 }}>{descriptions[metricType]}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#8A8078" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Confidence */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.08em", marginBottom: 6 }}>CONFIDENCE</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 120, height: 6, background: "#E8DDD3", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${band.pct}%`, height: "100%", background: band.color, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: band.color }}>{band.label} ({dealsTested} deals)</span>
            </div>
          </div>

          {/* Deal Comparisons */}
          {testDeals.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.08em", marginBottom: 8 }}>
                TEST GROUP {metricType === "velocity" ? `(avg ${avgTestDays} days)` : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {testDeals.map((deal, i) => (
                  <div
                    key={i}
                    onClick={() => deal.deal_id && (window.location.href = `/pipeline/${deal.deal_id}`)}
                    style={{
                      background: "#F5F3EF",
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: deal.deal_id ? "pointer" : "default",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", display: "flex", alignItems: "center", gap: 4 }}>
                        {deal.deal_name}
                        {deal.deal_id && <ExternalLink size={11} color="#8A8078" />}
                      </div>
                      <div style={{ fontSize: 11, color: "#8A8078" }}>{deal.owner_name} · {formatStage(deal.stage)} · €{(deal.amount / 1000).toFixed(0)}K</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3833" }}>{getDaysStat(deal)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#2D8A4E" }}>{getMetricValue(deal)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {controlDeals.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.08em", marginBottom: 8 }}>
                CONTROL GROUP {metricType === "velocity" ? `(avg ${avgControlDays} days)` : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {controlDeals.map((deal, i) => (
                  <div
                    key={i}
                    onClick={() => deal.deal_id && (window.location.href = `/pipeline/${deal.deal_id}`)}
                    style={{
                      background: "#FAF9F6",
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: deal.deal_id ? "pointer" : "default",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#6B6B6B", display: "flex", alignItems: "center", gap: 4 }}>
                        {deal.deal_name}
                        {deal.deal_id && <ExternalLink size={11} color="#9B9B9B" />}
                      </div>
                      <div style={{ fontSize: 11, color: "#9B9B9B" }}>{deal.owner_name} · {formatStage(deal.stage)} · €{(deal.amount / 1000).toFixed(0)}K</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#6B6B6B" }}>{getDaysStat(deal)}</div>
                      <div style={{ fontSize: 11, color: "#9B9B9B" }}>baseline</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Field Evidence */}
          {allEvidence.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.08em", marginBottom: 8, borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 16 }}>
                FIELD EVIDENCE
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {allEvidence.slice(0, 4).map((ev, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, marginTop: 1 }}>{ev.type === "transcript" ? "📞" : "📧"}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#3D3833" }}>
                        {ev.dealName} — {ev.source} · {ev.date}
                      </div>
                      <p style={{ fontSize: 12, color: "#6B6B6B", margin: "4px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>
                        &ldquo;{ev.excerpt}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deals.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#9B9B9B", fontSize: 13 }}>
              No deal-level evidence data available yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    testing: {
      background: "#FFFBEB",
      color: "#B45309",
      border: "1px solid #FDE68A",
    },
    proposed: {
      background: "#F3EDE7",
      color: "#8A8078",
      border: "1px solid #E8DDD3",
    },
    promoted: {
      background: "#ECFDF5",
      color: "#065F46",
      border: "1px solid #A7F3D0",
    },
    graduated: {
      background: "#ECFDF5",
      color: "#065F46",
      border: "1px solid #A7F3D0",
    },
    retired: {
      background: "#FEF2F2",
      color: "#991B1B",
      border: "1px solid #FECACA",
    },
    rejected: {
      background: "#FEF2F2",
      color: "#991B1B",
      border: "1px solid #FECACA",
    },
    archived: {
      background: "#F5F3EF",
      color: "#6B6B6B",
      border: "1px solid #E8DDD3",
    },
  };
  const labels: Record<string, string> = {
    testing: "TESTING",
    proposed: "PROPOSED",
    promoted: "PROMOTED",
    graduated: "GRADUATED",
    retired: "RETIRED",
    rejected: "DECLINED",
    archived: "ARCHIVED",
  };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        padding: "2px 7px",
        borderRadius: 4,
        ...(styles[status] ?? {}),
      }}
    >
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}

// ── Testing Card ──────────────────────────────────────────────────────────────

function ThresholdRow({ label, current, target }: { label: string; current?: number; target?: number }) {
  const met = current !== undefined && target !== undefined && current >= target;
  const hasData = current !== undefined && target !== undefined;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      <span style={{ color: "#6B6B6B", minWidth: 80 }}>{label}</span>
      <span style={{ fontWeight: 600, color: met ? "#2D8A4E" : "#3D3833" }}>
        {current !== undefined ? `+${current}${label.includes("Sentiment") ? " pts" : "%"}` : "—"}
      </span>
      <span style={{ color: "#9B9B9B" }}>/</span>
      <span style={{ color: "#9B9B9B" }}>
        +{target ?? "—"}{label.includes("Sentiment") ? " pts" : "%"} target
      </span>
      {hasData && (
        <span style={{ color: met ? "#2D8A4E" : "#9B9B9B", fontWeight: 600 }}>
          {met ? "✓" : "—"}
        </span>
      )}
    </div>
  );
}

function TestingCard({
  idea,
  members,
  isManager,
  currentUserId,
  onStatusChange,
}: {
  idea: PlaybookIdea;
  members: Member[];
  isManager: boolean;
  currentUserId: string | undefined;
  onStatusChange: () => void;
}) {
  const originator = members.find((m) => m.id === idea.originatorId);
  const daysActive = daysAgo(idea.experimentStart ?? idea.testStartDate);
  const r = idea.results;
  const metrics = idea.currentMetrics as CurrentMetrics | null;
  const thresholds = idea.successThresholds as SuccessThresholds | null;

  const [drillDownMetric, setDrillDownMetric] = useState<"velocity" | "sentiment" | "close_rate" | null>(null);
  const [showGraduation, setShowGraduation] = useState(false);
  const [scalingScope, setScalingScope] = useState<string>("vertical");
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>(idea.vertical ? [idea.vertical] : []);
  const [graduating, setGraduating] = useState(false);

  // Test group member names
  const testGroupNames = (idea.testGroup ?? [])
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean) as string[];

  // Days remaining
  const expEnd = idea.experimentEnd ? new Date(idea.experimentEnd) : null;
  const daysRemaining = expEnd ? Math.max(0, Math.ceil((expEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  // Threshold counting
  const thresholdsMet = metrics && thresholds ? [
    metrics.velocity_pct !== undefined && thresholds.velocity_pct !== undefined && metrics.velocity_pct >= thresholds.velocity_pct,
    metrics.sentiment_pts !== undefined && thresholds.sentiment_pts !== undefined && metrics.sentiment_pts >= thresholds.sentiment_pts,
    metrics.close_rate_pct !== undefined && thresholds.close_rate_pct !== undefined && metrics.close_rate_pct >= thresholds.close_rate_pct,
  ].filter(Boolean).length : 0;
  const totalThresholds = thresholds ? Object.keys(thresholds).length : 3;

  const dealsTested = metrics?.deals_tested ?? 0;
  const graduationReady = thresholdsMet >= 2 && dealsTested >= MIN_DEALS_FOR_GRADUATION;
  const thresholdsMetButLowData = thresholdsMet >= 2 && dealsTested < MIN_DEALS_FOR_GRADUATION;

  async function handleGraduate() {
    if (!currentUserId) return;
    setGraduating(true);
    try {
      const scopeValue = scalingScope === "vertical" && idea.vertical
        ? idea.vertical
        : scalingScope === "all"
        ? "all"
        : selectedVerticals;
      const res = await fetch(`/api/playbook/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "graduated",
          attribution: {
            ...(idea.attribution as Record<string, unknown> ?? {}),
            graduated_by: currentUserId,
            scaling_scope: scopeValue,
            impact_arr: idea.results?.arr_influenced ?? 0,
          },
        }),
      });
      if (res.ok) onStatusChange();
    } catch { /* non-fatal */ }
    setGraduating(false);
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E8E5E0",
        padding: 20,
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <TrendingUp size={15} color="#D4A843" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}>
            {idea.title}
          </span>
        </div>
        <StatusBadge status="testing" />
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#8A8078", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 500, color: "#6B6B6B" }}>{originator?.name ?? "Unknown"}</span>
        <span>·</span>
        <span><Clock size={11} style={{ display: "inline", marginRight: 3 }} />{daysActive}d active</span>
        {metrics?.deals_tested != null && (
          <><span>·</span><span>{metrics.deals_tested} deals tested</span></>
        )}
        {idea.vertical && (
          <><span>·</span><span>{formatVertical(idea.vertical)}</span></>
        )}
      </div>

      {/* Hypothesis */}
      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
        {idea.hypothesis}
      </p>

      {/* Test group */}
      {testGroupNames.length > 0 && (
        <div style={{ fontSize: 12, color: "#6B6B6B" }}>
          <span style={{ fontWeight: 600, color: "#3D3833" }}>Test group:</span>{" "}
          {testGroupNames.join(", ")}
        </div>
      )}

      {/* Threshold progress — clickable metric labels */}
      {metrics && thresholds && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.08em", marginBottom: 2 }}>
            THRESHOLD PROGRESS
          </div>
          {([
            { key: "velocity" as const, label: "Velocity", current: metrics.velocity_pct, target: thresholds.velocity_pct, suffix: "%" },
            { key: "sentiment" as const, label: "Sentiment", current: metrics.sentiment_pts, target: thresholds.sentiment_pts, suffix: " pts" },
            { key: "close_rate" as const, label: "Close Rate", current: metrics.close_rate_pct, target: thresholds.close_rate_pct, suffix: "%" },
          ]).map((row) => {
            const met = row.current !== undefined && row.target !== undefined && row.current >= row.target;
            const hasData = row.current !== undefined && row.target !== undefined;
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span
                  onClick={() => setDrillDownMetric(row.key)}
                  style={{ color: "#6B6B6B", minWidth: 80, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}
                >
                  {row.label}
                </span>
                <span style={{ fontWeight: 600, color: met ? "#2D8A4E" : "#3D3833" }}>
                  {row.current !== undefined ? `+${row.current}${row.suffix}` : "—"}
                </span>
                <span style={{ color: "#9B9B9B" }}>/</span>
                <span style={{ color: "#9B9B9B" }}>+{row.target ?? "—"}{row.suffix} target</span>
                {hasData && (
                  <span style={{ color: met ? "#2D8A4E" : "#9B9B9B", fontWeight: 600 }}>{met ? "✓" : "—"}</span>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 12, fontWeight: 600, color: thresholdsMet >= 2 ? "#2D8A4E" : "#D4A843", marginTop: 4 }}>
            {thresholdsMet} of {totalThresholds} thresholds met
          </div>
          {/* Confidence band */}
          {dealsTested > 0 && <ConfidenceBand dealsTested={dealsTested} />}
          {thresholdsMetButLowData && (
            <div style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>
              Thresholds met but more data needed ({dealsTested}/{MIN_DEALS_FOR_GRADUATION} minimum deals)
            </div>
          )}
        </div>
      )}

      {/* Fallback: old-style results if no new metrics */}
      {!metrics && r && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.08em", marginBottom: 8 }}>
            EARLY RESULTS
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MetricBox
              label="Velocity"
              value={r.stage_velocity_change !== undefined ? `${r.stage_velocity_change > 0 ? "+" : ""}${r.stage_velocity_change}%` : "—"}
              positive={r.stage_velocity_change !== undefined ? r.stage_velocity_change > 0 : undefined}
            />
            <MetricBox
              label="Sentiment"
              value={r.sentiment_shift !== undefined ? `${r.sentiment_shift > 0 ? "+" : ""}${r.sentiment_shift} pts` : "—"}
              positive={r.sentiment_shift !== undefined ? r.sentiment_shift > 0 : undefined}
            />
            <MetricBox
              label="Adoption"
              value={r.adoption_count !== undefined ? `${r.adoption_count} reps` : "—"}
            />
          </div>
          <ConfidenceBar level={r.confidence} />
        </div>
      )}

      {/* Manager: Graduate & Scale button */}
      {isManager && graduationReady && !showGraduation && (
        <button
          onClick={() => setShowGraduation(true)}
          style={{
            background: "#4A7C59",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            alignSelf: "flex-start",
          }}
        >
          Graduate &amp; Scale
        </button>
      )}

      {/* Manager: Graduation inline expansion */}
      {isManager && showGraduation && (
        <div style={{ background: "#F5F3EF", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#3D3833" }}>
            This experiment met {thresholdsMet}/{totalThresholds} thresholds across {dealsTested} deals over {daysActive} days.
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3D3833", marginBottom: 8 }}>Select Scaling Scope</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "vertical", label: `${formatVertical(idea.vertical ?? "")} AEs only` },
                { key: "all", label: "All verticals immediately" },
                { key: "custom", label: "Custom — select verticals" },
              ].map((opt, i) => (
                <button
                  key={opt.key}
                  onClick={() => setScalingScope(opt.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: scalingScope === opt.key ? "#3D3833" : "#FFFFFF",
                    color: scalingScope === opt.key ? "white" : "#3D3833",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `1.5px solid ${scalingScope === opt.key ? "white" : "#D4C9BD"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {i + 1}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>

            {scalingScope === "custom" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {["healthcare", "financial_services", "technology", "manufacturing", "retail"].map((v) => {
                  const selected = selectedVerticals.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => setSelectedVerticals((prev) => selected ? prev.filter((x) => x !== v) : [...prev, v])}
                      style={{
                        padding: "4px 10px", borderRadius: 6, border: "none",
                        background: selected ? "#3D3833" : "#FFFFFF",
                        color: selected ? "white" : "#3D3833",
                        fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {formatVertical(v)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleGraduate}
              disabled={graduating || (scalingScope === "custom" && selectedVerticals.length === 0)}
              style={{
                background: "#4A7C59", color: "white", border: "none", borderRadius: 8,
                padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: graduating ? "not-allowed" : "pointer",
                opacity: graduating ? 0.6 : 1, fontFamily: "DM Sans, sans-serif",
              }}
            >
              {graduating ? "Graduating..." : "Confirm Graduation"}
            </button>
            <button
              onClick={() => setShowGraduation(false)}
              style={{ background: "none", border: "none", color: "#8A8078", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Time remaining + footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#8A8078" }}>
        {daysRemaining !== null && (
          <span style={{ fontWeight: 500, color: daysRemaining === 0 ? "#C74B3B" : "#6B6B6B" }}>
            {daysRemaining === 0 ? "Experiment complete" : `${daysRemaining} days remaining`}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <Users size={13} />
          {idea.followerCount ?? 0} {(idea.followerCount ?? 0) === 1 ? "follower" : "followers"}
        </span>
      </div>

      {/* Drill-down modal */}
      {drillDownMetric && (
        <MetricDrillDownModal
          metricType={drillDownMetric}
          idea={idea}
          onClose={() => setDrillDownMetric(null)}
        />
      )}
    </div>
  );
}

// ── Proposed Card ─────────────────────────────────────────────────────────────

function ProposedCard({
  idea,
  members,
  isManager,
  currentUserId,
  onStatusChange,
}: {
  idea: PlaybookIdea;
  members: Member[];
  isManager: boolean;
  currentUserId: string | undefined;
  onStatusChange: () => void;
}) {
  const originator = members.find((m) => m.id === idea.originatorId);
  const days = daysAgo(idea.createdAt);
  const [showApproval, setShowApproval] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // AE selection for test group
  const allAEs = members.filter((m) => m.role === "AE");
  const [selectedAEs, setSelectedAEs] = useState<string[]>(() => {
    // Pre-select 2 random AEs
    const shuffled = [...allAEs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map((m) => m.id);
  });

  // Threshold inputs
  const [velocityTarget, setVelocityTarget] = useState(30);
  const [sentimentTarget, setSentimentTarget] = useState(15);
  const [closeRateTarget, setCloseRateTarget] = useState(10);
  const [durationDays, setDurationDays] = useState(30);

  const controlAEs = allAEs.filter((m) => !selectedAEs.includes(m.id)).map((m) => m.id);

  async function handleApprove() {
    if (!currentUserId || selectedAEs.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/playbook/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "testing",
          test_group: selectedAEs,
          control_group: controlAEs,
          success_thresholds: {
            velocity_pct: velocityTarget,
            sentiment_pts: sentimentTarget,
            close_rate_pct: closeRateTarget,
          },
          approved_by: currentUserId,
          experiment_duration_days: durationDays,
          attribution: {
            proposed_by: idea.originatorId,
            proposed_at: idea.createdAt,
            approved_by: currentUserId,
            impact_arr: 0,
          },
        }),
      });
      if (res.ok) {
        onStatusChange();
      }
    } catch { /* handled by giveback */ }
    setSubmitting(false);
  }

  async function handleDecline() {
    if (!currentUserId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/playbook/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          structured_feedback: declineReason ? { decline_reason: declineReason } : undefined,
        }),
      });
      if (res.ok) {
        onStatusChange();
      }
    } catch { /* handled by giveback */ }
    setSubmitting(false);
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E8E5E0",
        padding: 20,
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <Sparkles size={14} color="#8A8078" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}>
            {idea.title}
          </span>
        </div>
        <StatusBadge status="proposed" />
      </div>

      <div style={{ fontSize: 12, color: "#8A8078", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontWeight: 500, color: "#6B6B6B" }}>{originator?.name ?? "Unknown"}</span>
        {idea.vertical && (<><span>·</span><span>{formatVertical(idea.vertical)}</span></>)}
        <span>·</span>
        <span>Proposed {days}d ago</span>
      </div>

      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
        {idea.hypothesis}
      </p>

      {!isManager && (
        <div style={{ fontSize: 12, color: "#9B9B9B", fontStyle: "italic" }}>No test data yet</div>
      )}

      {/* Manager approval buttons */}
      {isManager && !showApproval && !showDecline && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowApproval(true)}
            style={{
              background: "#3D3833",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Approve & Start Testing
          </button>
          <button
            onClick={() => setShowDecline(true)}
            style={{
              background: "none",
              border: "none",
              color: "#8A8078",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Decline
          </button>
        </div>
      )}

      {/* Decline inline form */}
      {showDecline && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason (optional)"
            style={{
              border: "1px solid #E8E5E0",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              outline: "none",
              color: "#3D3833",
              fontFamily: "DM Sans, sans-serif",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDecline}
              disabled={submitting}
              style={{
                background: "#C74B3B",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {submitting ? "Declining..." : "Confirm Decline"}
            </button>
            <button
              onClick={() => { setShowDecline(false); setDeclineReason(""); }}
              style={{ background: "none", border: "none", color: "#8A8078", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Approval inline expansion */}
      {showApproval && (
        <div
          style={{
            background: "#FAFAF8",
            borderRadius: 10,
            border: "1px solid #E8E5E0",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Test Group Selection */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3D3833", marginBottom: 8 }}>
              Select Test Group
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {allAEs.map((ae, i) => {
                const selected = selectedAEs.includes(ae.id);
                return (
                  <button
                    key={ae.id}
                    onClick={() =>
                      setSelectedAEs((prev) =>
                        selected ? prev.filter((id) => id !== ae.id) : [...prev, ae.id]
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: selected ? "#3D3833" : "#F5F3EF",
                      color: selected ? "white" : "#3D3833",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "DM Sans, sans-serif",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `1.5px solid ${selected ? "white" : "#D4C9BD"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: selected ? "white" : "#8A8078",
                      }}
                    >
                      {i + 1}
                    </span>
                    {ae.name}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "#8A8078", marginTop: 6 }}>
              Control group: {controlAEs.length > 0
                ? allAEs.filter((m) => controlAEs.includes(m.id)).map((m) => m.name).join(", ")
                : "none"} will use standard process
            </div>
          </div>

          {/* Success Thresholds */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3D3833", marginBottom: 8 }}>
              Success Thresholds
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Velocity improvement", value: velocityTarget, set: setVelocityTarget, suffix: "%" },
                { label: "Sentiment improvement", value: sentimentTarget, set: setSentimentTarget, suffix: " pts" },
                { label: "Close rate improvement", value: closeRateTarget, set: setCloseRateTarget, suffix: "%" },
                { label: "Experiment duration", value: durationDays, set: setDurationDays, suffix: " days" },
              ].map((field) => (
                <div key={field.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11, color: "#8A8078" }}>{field.label}</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {field.label !== "Experiment duration" && <span style={{ fontSize: 12, color: "#8A8078" }}>+</span>}
                    <input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.set(Number(e.target.value))}
                      style={{
                        width: 60,
                        border: "1px solid #E8E5E0",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 12,
                        outline: "none",
                        color: "#3D3833",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "#8A8078" }}>{field.suffix}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleApprove}
              disabled={submitting || selectedAEs.length === 0}
              style={{
                background: "#E07A5F",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: submitting || selectedAEs.length === 0 ? "not-allowed" : "pointer",
                opacity: submitting || selectedAEs.length === 0 ? 0.6 : 1,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {submitting ? "Starting..." : "Start Experiment"}
            </button>
            <button
              onClick={() => setShowApproval(false)}
              style={{ background: "none", border: "none", color: "#8A8078", fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Promoted Card ─────────────────────────────────────────────────────────────

function PromotedCard({
  idea,
  members,
}: {
  idea: PlaybookIdea;
  members: Member[];
}) {
  const originator = members.find((m) => m.id === idea.originatorId);
  const isGraduated = idea.status === "graduated";
  const days = daysAgo(idea.graduatedAt ?? idea.testEndDate ?? idea.createdAt);
  const r = idea.results;
  const metrics = idea.currentMetrics as CurrentMetrics | null;
  const followerNames = (idea.followers ?? [])
    .map((fid) => members.find((m) => m.id === fid)?.name)
    .filter(Boolean) as string[];

  const [drillDownMetric, setDrillDownMetric] = useState<"velocity" | "sentiment" | "close_rate" | null>(null);

  // Attribution
  const attribution = idea.attribution as {
    proposed_by?: string;
    approved_by?: string;
    impact_arr?: number;
  } | null;
  const approverName = attribution?.approved_by
    ? members.find((m) => m.id === attribution.approved_by)?.name
    : null;
  const allAEs = members.filter((m) => m.role === "AE");

  return (
    <>
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E8E5E0",
        borderLeft: `3px solid ${isGraduated ? "#0C7489" : "#2D8A4E"}`,
        padding: 20,
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {isGraduated ? (
            <span style={{ fontSize: 14 }}>🎯</span>
          ) : (
            <CheckCircle size={15} color="#2D8A4E" />
          )}
          <span
            style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}
          >
            {idea.title}
          </span>
        </div>
        <StatusBadge status={idea.status} />
      </div>

      {/* Meta */}
      <div
        style={{
          fontSize: 12,
          color: "#8A8078",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 500, color: "#6B6B6B" }}>
          Proposed by {originator?.name ?? "Unknown"}
        </span>
        {idea.vertical && (
          <><span>·</span><span>{formatVertical(idea.vertical)}</span></>
        )}
      </div>

      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
        {idea.hypothesis}
      </p>

      {/* Results — prefer currentMetrics for graduated, fall back to results */}
      {(metrics || r) && (
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#8A8078",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            RESULTS
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div onClick={() => setDrillDownMetric("velocity")} style={{ cursor: "pointer" }}>
              <MetricBox
                label="Velocity"
                value={
                  metrics?.velocity_pct !== undefined
                    ? `+${metrics.velocity_pct}%`
                    : r?.stage_velocity_change !== undefined
                    ? `+${r.stage_velocity_change}%`
                    : "—"
                }
                positive
              />
            </div>
            {(metrics?.sentiment_pts !== undefined || r?.sentiment_shift !== undefined) && (
              <div onClick={() => setDrillDownMetric("sentiment")} style={{ cursor: "pointer" }}>
                <MetricBox
                  label="Sentiment"
                  value={`+${metrics?.sentiment_pts ?? r?.sentiment_shift} pts`}
                  positive
                />
              </div>
            )}
            {metrics?.close_rate_pct !== undefined ? (
              <div onClick={() => setDrillDownMetric("close_rate")} style={{ cursor: "pointer" }}>
                <MetricBox label="Close Rate" value={`+${metrics.close_rate_pct}%`} positive />
              </div>
            ) : r?.close_rate_test != null && r?.close_rate_control != null ? (
              <div onClick={() => setDrillDownMetric("close_rate")} style={{ cursor: "pointer" }}>
                <MetricBox
                  label="Close Rate"
                  value={`${r.close_rate_test}% vs ${r.close_rate_control}%`}
                  positive
                />
              </div>
            ) : null}
            {(metrics?.deals_tested || r?.deals_influenced) && (
              <MetricBox
                label="Deals"
                value={`${metrics?.deals_tested ?? r?.deals_influenced}`}
              />
            )}
            {r?.arr_influenced !== undefined && r.arr_influenced > 0 && (
              <MetricBox label="ARR Impact" value={formatCurrency(r.arr_influenced)} positive />
            )}
          </div>
        </div>
      )}

      {/* Graduated: NOW SCALING TO + Attribution trail */}
      {isGraduated && (
        <>
          <div
            style={{
              background: "#E6F4F7",
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#0C7489", letterSpacing: "0.06em", marginBottom: 4 }}>
              NOW SCALING TO
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0C7489" }}>
              All AEs · Started{" "}
              {idea.graduatedAt
                ? new Date(idea.graduatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                : "recently"}
            </div>
            <div style={{ fontSize: 11, color: "#6B6B6B", marginTop: 2 }}>
              Adopted by {allAEs.length} of {allAEs.length} AEs
            </div>
          </div>

          {(originator || approverName) && (
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8A8078", letterSpacing: "0.06em", marginBottom: 6 }}>
                ATTRIBUTION
              </div>
              <div style={{ fontSize: 12, color: "#6B6B6B", lineHeight: 1.6 }}>
                {originator?.name && (
                  <><span style={{ color: "#3D3833", fontWeight: 600 }}>{originator.name}</span> proposed</>
                )}
                {approverName && (
                  <> → <span style={{ color: "#3D3833", fontWeight: 600 }}>{approverName}</span> approved</>
                )}
                {attribution?.impact_arr && attribution.impact_arr > 0 && (
                  <> → <span style={{ color: "#2D8A4E", fontWeight: 600 }}>{formatCurrency(attribution.impact_arr)}</span> pipeline influenced</>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Promoted (non-graduated) specific */}
      {!isGraduated && (
        <>
          {idea.vertical && (
            <div style={{ fontSize: 12, color: "#2D8A4E", fontWeight: 500 }}>
              Now part of the standard {formatVertical(idea.vertical)} playbook
            </div>
          )}
          {followerNames.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8A8078" }}>
              <Users size={13} />
              <span>{followerNames.join(", ")}</span>
            </div>
          )}
        </>
      )}
    </div>
    {/* Drill-down modal */}
    {drillDownMetric && (
      <MetricDrillDownModal
        metricType={drillDownMetric}
        idea={idea}
        onClose={() => setDrillDownMetric(null)}
      />
    )}
    </>
  );
}

// ── Retired Card ──────────────────────────────────────────────────────────────

function RetiredCard({
  idea,
  ideas,
  members,
}: {
  idea: PlaybookIdea;
  ideas: PlaybookIdea[];
  members: Member[];
}) {
  const originator = members.find((m) => m.id === idea.originatorId);
  const days = daysAgo(idea.testEndDate ?? idea.createdAt);
  const r = idea.results;

  // Find promoted idea in same vertical to reference as replacement
  const replacement = ideas.find(
    (i) =>
      i.status === "promoted" &&
      i.vertical === idea.vertical &&
      i.id !== idea.id
  );

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E8E5E0",
        borderLeft: "3px solid #C74B3B",
        padding: 20,
        boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <XCircle size={15} color="#C74B3B" />
          <span
            style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}
          >
            {idea.title}
          </span>
        </div>
        <StatusBadge status="retired" />
      </div>

      {/* Meta */}
      <div
        style={{
          fontSize: 12,
          color: "#8A8078",
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 500, color: "#6B6B6B" }}>
          {originator?.name ?? "Unknown"}
        </span>
        <span>·</span>
        <span>Retired {days}d ago</span>
      </div>

      {/* Replacement reference */}
      {replacement && (
        <div
          style={{
            fontSize: 12,
            color: "#6B6B6B",
            background: "#F5F3EF",
            borderRadius: 6,
            padding: "6px 10px",
          }}
        >
          <span style={{ color: "#8A8078" }}>Replaced by: </span>
          <span style={{ fontWeight: 600, color: "#3D3833" }}>
            {replacement.title}
          </span>
          {replacement.results?.stage_velocity_change != null && (
            <span style={{ color: "#2D8A4E", marginLeft: 4 }}>
              ({replacement.results.stage_velocity_change}% better velocity)
            </span>
          )}
        </div>
      )}

      {r && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {r.close_rate_test != null && r.close_rate_control != null && (
            <MetricBox
              label="Close Rate"
              value={`${r.close_rate_test}% vs ${r.close_rate_control}%`}
              positive={false}
            />
          )}
          {r.sentiment_shift !== undefined && (
            <MetricBox
              label="Sentiment"
              value={`${r.sentiment_shift} pts`}
              positive={r.sentiment_shift > 0}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Influence Tab ─────────────────────────────────────────────────────────────

function TierIcon({ tier }: { tier: string | null }) {
  if (tier === "high_impact")
    return <Star size={13} fill="#E07A5F" color="#E07A5F" />;
  if (tier === "growing")
    return (
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#D4A853",
        }}
      />
    );
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        border: "1.5px solid #8A8078",
      }}
    />
  );
}

function TierLabel({ tier }: { tier: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    high_impact: { label: "High Impact", color: "#E07A5F" },
    growing: { label: "Growing", color: "#D4A853" },
    contributing: { label: "Contributing", color: "#8A8078" },
    new: { label: "New", color: "#9B9B9B" },
  };
  const t = map[tier ?? "contributing"] ?? map.contributing;
  return (
    <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────────

type Props = {
  ideas: PlaybookIdea[];
  scores: InfluenceScore[];
  members: Member[];
  marketSignals: MarketSignal[];
};

export function PlaybookClient({ ideas: initialIdeas, scores, members, marketSignals }: Props) {
  const { currentUser } = usePersona();
  const [activeTab, setActiveTab] = useState<
    "experiments" | "whats_working" | "influence"
  >("experiments");
  const [ideas, setIdeas] = useState(initialIdeas);
  const [refreshKey, setRefreshKey] = useState(0);

  const isManager = currentUser?.role === "MANAGER";

  function handleStatusChange() {
    // Trigger page refresh to get updated data
    window.location.reload();
  }

  // ── Tab 1: Active Experiments ──────────────────────────────────────────────
  const testingIdeas = useMemo(
    () =>
      ideas
        .filter((i) => i.status === "testing")
        .sort((a, b) => {
          const aTime = a.experimentStart ?? a.testStartDate;
          const bTime = b.experimentStart ?? b.testStartDate;
          return (aTime ? new Date(aTime).getTime() : 0) - (bTime ? new Date(bTime).getTime() : 0);
        }),
    [ideas]
  );
  const proposedIdeas = useMemo(
    () => ideas.filter((i) => i.status === "proposed"),
    [ideas]
  );

  // ── Tab 2: What's Working ──────────────────────────────────────────────────
  const promotedIdeas = useMemo(
    () => ideas.filter((i) => i.status === "promoted" || i.status === "graduated"),
    [ideas]
  );
  const retiredIdeas = useMemo(
    () => ideas.filter((i) => i.status === "retired" || i.status === "archived"),
    [ideas]
  );

  // ── Tab 3: Influence ───────────────────────────────────────────────────────
  // Group scores by member, compute total ARR
  const memberInfluence = useMemo(() => {
    const map = new Map<
      string,
      { member: Member | undefined; scores: InfluenceScore[]; totalArr: number }
    >();
    for (const score of scores) {
      if (!map.has(score.memberId)) {
        map.set(score.memberId, {
          member: members.find((m) => m.id === score.memberId),
          scores: [],
          totalArr: 0,
        });
      }
      const entry = map.get(score.memberId)!;
      entry.scores.push(score);
      const arrFromScore = (score.attributions ?? []).reduce(
        (sum, a) => sum + (a.arr_impact ?? 0),
        0
      );
      entry.totalArr += arrFromScore;
    }
    return Array.from(map.values())
      .filter((e) => e.member !== undefined)
      .sort((a, b) => b.totalArr - a.totalArr);
  }, [scores, members]);

  // Per-member experiment stats derived from ideas
  const memberExperimentStats = useMemo(() => {
    const map = new Map<
      string,
      { proposed: number; testing: number; graduated: number; arrInfluenced: number; velocityImpact: number }
    >();
    for (const idea of ideas) {
      const oid = idea.originatorId;
      if (!oid) continue;
      if (!map.has(oid)) {
        map.set(oid, { proposed: 0, testing: 0, graduated: 0, arrInfluenced: 0, velocityImpact: 0 });
      }
      const entry = map.get(oid)!;
      if (idea.status === "proposed" || idea.status === "rejected") {
        entry.proposed++;
      } else if (idea.status === "testing") {
        entry.testing++;
      } else if (idea.status === "graduated" || idea.status === "promoted") {
        entry.graduated++;
        entry.arrInfluenced += idea.results?.arr_influenced ?? 0;
        entry.velocityImpact += idea.results?.stage_velocity_change ?? 0;
      } else if (idea.status === "retired" || idea.status === "archived") {
        entry.proposed++;
      }
    }
    return map;
  }, [ideas]);

  // All attributions sorted by date desc
  const allAttributions = useMemo(() => {
    const list: Array<{
      type: string;
      description: string;
      arr_impact: number;
      date: string;
      memberName: string;
    }> = [];
    for (const score of scores) {
      const memberName =
        members.find((m) => m.id === score.memberId)?.name ?? "Unknown";
      for (const attr of score.attributions ?? []) {
        list.push({ ...attr, memberName });
      }
    }
    return list
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [scores, members]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const tabs: Array<{
    key: "experiments" | "whats_working" | "influence";
    label: string;
  }> = [
    { key: "experiments", label: "Active Experiments" },
    { key: "whats_working", label: "What's Working" },
    { key: "influence", label: "Influence" },
  ];

  return (
    <div
      style={{
        padding: "32px 32px 80px",
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Sparkles size={20} color="#E07A5F" />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            Playbook Intelligence
          </h1>
        </div>
        <p style={{ fontSize: 14, color: "#6B6B6B", margin: 0 }}>
          Field experiments, proven plays, and the reps shaping how your team sells.
        </p>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          marginBottom: 24,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "10px 20px",
              fontSize: 14,
              fontFamily: "DM Sans, sans-serif",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#3D3833" : "#8A8078",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid #E07A5F"
                  : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Active Experiments ─────────────────────────────────────── */}
      {activeTab === "experiments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {testingIdeas.length === 0 && proposedIdeas.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#8A8078",
                padding: "48px 0",
                fontSize: 14,
              }}
            >
              No active experiments yet.
            </div>
          )}

          {testingIdeas.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8A8078",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                In Progress — {testingIdeas.length}
              </div>
              {testingIdeas.map((idea) => (
                <TestingCard
                  key={idea.id}
                  idea={idea}
                  members={members}
                  isManager={isManager}
                  currentUserId={currentUser?.id}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </>
          )}

          {proposedIdeas.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8A8078",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginTop: testingIdeas.length > 0 ? 8 : 0,
                  marginBottom: 4,
                }}
              >
                Proposed — {proposedIdeas.length}
              </div>
              {proposedIdeas.map((idea) => (
                <ProposedCard
                  key={idea.id}
                  idea={idea}
                  members={members}
                  isManager={isManager}
                  currentUserId={currentUser?.id}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Tab 2: What's Working ─────────────────────────────────────────── */}
      {activeTab === "whats_working" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {promotedIdeas.length === 0 && retiredIdeas.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: "#8A8078",
                padding: "48px 0",
                fontSize: 14,
              }}
            >
              No promoted or retired plays yet.
            </div>
          )}

          {promotedIdeas.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#2D8A4E",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Promoted Plays — {promotedIdeas.length}
              </div>
              {promotedIdeas.map((idea) => (
                <PromotedCard key={idea.id} idea={idea} members={members} />
              ))}
            </>
          )}

          {retiredIdeas.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#C74B3B",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginTop: promotedIdeas.length > 0 ? 8 : 0,
                  marginBottom: 4,
                }}
              >
                Retired Plays — {retiredIdeas.length}
              </div>
              {retiredIdeas.map((idea) => (
                <RetiredCard
                  key={idea.id}
                  idea={idea}
                  ideas={ideas}
                  members={members}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Tab 3: Influence ─────────────────────────────────────────────── */}
      {activeTab === "influence" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

          {/* Section 1 — Team Influence */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#8A8078",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Team Influence
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {memberInfluence.map(({ member, scores: memberScores, totalArr }) => {
                if (!member) return null;
                const sortedScores = [...memberScores].sort(
                  (a, b) => (b.score ?? 0) - (a.score ?? 0)
                );
                const expStats = memberExperimentStats.get(member.id);
                const totalExpProposed = expStats
                  ? expStats.proposed + expStats.testing + expStats.graduated
                  : 0;
                return (
                  <div
                    key={member.id}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: 12,
                      border: "1px solid #E8E5E0",
                      padding: 16,
                      boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#1A1A1A",
                          }}
                        >
                          {member.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#8A8078" }}>
                          {formatVertical(member.verticalSpecialization)} · {member.role}
                        </div>
                      </div>
                      {totalArr > 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#2D8A4E",
                            textAlign: "right",
                          }}
                        >
                          {formatCurrency(totalArr)}
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 400,
                              color: "#8A8078",
                            }}
                          >
                            ARR influenced
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Experiment stats */}
                    {expStats && totalExpProposed > 0 && (
                      <div
                        style={{
                          background: "#F5F3EF",
                          borderRadius: 8,
                          padding: "8px 12px",
                          marginBottom: 8,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          fontSize: 11,
                          color: "#6B6B6B",
                        }}
                      >
                        <span>
                          <span style={{ fontWeight: 700, color: "#3D3833" }}>{totalExpProposed}</span> proposed
                        </span>
                        {expStats.graduated > 0 && (
                          <span style={{ color: "#2D8A4E" }}>
                            <span style={{ fontWeight: 700 }}>{expStats.graduated}</span> graduated
                          </span>
                        )}
                        {expStats.testing > 0 && (
                          <span style={{ color: "#B45309" }}>
                            <span style={{ fontWeight: 700 }}>{expStats.testing}</span> testing
                          </span>
                        )}
                        {expStats.velocityImpact > 0 && (
                          <span style={{ color: "#2D8A4E", marginLeft: "auto" }}>
                            +{expStats.velocityImpact}% velocity
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      style={{ display: "flex", flexDirection: "column", gap: 6 }}
                    >
                      {sortedScores.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            fontSize: 12,
                          }}
                        >
                          <TierIcon tier={s.tier} />
                          <span style={{ color: "#3D3833", flex: 1 }}>
                            {formatDimension(s.dimension)}
                          </span>
                          <TierLabel tier={s.tier} />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#3D3833",
                              minWidth: 26,
                              textAlign: "right",
                            }}
                          >
                            {s.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2 — Market Signals */}
          {marketSignals.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8A8078",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Market Signals
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {marketSignals.map((signal) => {
                  const isWarning =
                    signal.insight.toLowerCase().includes("incumbent") ||
                    signal.insight.toLowerCase().includes("negative") ||
                    signal.insight.toLowerCase().includes("60% likely");
                  const confidencePctVal = signal.confidence
                    ? Math.round(parseFloat(signal.confidence) * 100)
                    : null;
                  return (
                    <div
                      key={signal.id}
                      style={{
                        background: "#FFFFFF",
                        borderRadius: 10,
                        border: "1px solid #E8E5E0",
                        padding: "14px 16px",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        boxShadow: "0 2px 8px rgba(107,79,57,0.05)",
                      }}
                    >
                      <div style={{ marginTop: 2 }}>
                        {isWarning ? (
                          <AlertTriangle size={15} color="#D4A843" />
                        ) : (
                          <BarChart3 size={15} color="#0C7489" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1A1A1A",
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {signal.title}
                          {signal.vertical && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#8A8078",
                                background: "#F5F3EF",
                                padding: "1px 6px",
                                borderRadius: 4,
                              }}
                            >
                              {formatVertical(signal.vertical)}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: "#6B6B6B",
                            margin: "0 0 8px",
                            lineHeight: 1.5,
                          }}
                        >
                          {signal.insight}
                        </p>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#9B9B9B",
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          {confidencePctVal !== null && (
                            <span>Confidence: {confidencePctVal}%</span>
                          )}
                          {signal.supportingData?.sample_size != null && (
                            <>
                              <span>·</span>
                              <span>
                                {signal.supportingData.sample_size} deals
                              </span>
                            </>
                          )}
                          {signal.supportingData?.time_range && (
                            <>
                              <span>·</span>
                              <span>{signal.supportingData.time_range}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3 — Attribution Trail */}
          {allAttributions.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8A8078",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Attribution Trail
              </div>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E8E5E0",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(107,79,57,0.08)",
                }}
              >
                {allAttributions.map((attr, i) => (
                  <div
                    key={`${attr.date}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom:
                        i < allAttributions.length - 1
                          ? "1px solid rgba(0,0,0,0.04)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9B9B9B",
                        minWidth: 52,
                        paddingTop: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {relativeDate(attr.date)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#3D3833",
                          marginBottom: 2,
                        }}
                      >
                        {attr.memberName}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B6B6B" }}>
                        {attr.description}
                      </div>
                    </div>
                    {attr.arr_impact > 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#2D8A4E",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(attr.arr_impact)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

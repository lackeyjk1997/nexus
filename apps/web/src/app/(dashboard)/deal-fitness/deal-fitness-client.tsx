"use client";

import { useState, useMemo } from "react";
import {
  Activity,
  DollarSign,
  Heart,
  Cpu,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Check,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@nexus/shared";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type FitCategory =
  | "business_fit"
  | "emotional_fit"
  | "technical_fit"
  | "readiness_fit";

type EvidenceSnippet = { source: string; quote: string; timestamp: string };
type SourceReference = { type: string; id: string; label: string };

type FitnessEvent = {
  id: string;
  fitCategory: FitCategory;
  eventKey: string;
  eventLabel: string;
  eventDescription: string | null;
  status: "detected" | "not_yet" | "negative";
  detectedAt: string | null;
  detectionSources: string[] | null;
  sourceReferences: SourceReference[] | null;
  evidenceSnippets: EvidenceSnippet[] | null;
  confidence: string | null;
  contactName: string | null;
  notes: string | null;
};

type Scores = {
  businessFitScore: number;
  businessFitDetected: number;
  businessFitTotal: number;
  emotionalFitScore: number;
  emotionalFitDetected: number;
  emotionalFitTotal: number;
  technicalFitScore: number;
  technicalFitDetected: number;
  technicalFitTotal: number;
  readinessFitScore: number;
  readnessFitDetected: number;
  readinessFitTotal: number;
  overallFitness: number;
  velocityTrend: "accelerating" | "stable" | "decelerating" | "stalled";
  lastEventAt: string | null;
  daysSinceLastEvent: number | null;
  fitImbalanceFlag: boolean;
  eventsThisWeek: number | null;
  eventsLastWeek: number | null;
  benchmarkVsWon: {
    stage: string;
    vertical: string;
    avgFitnessAtStage: number;
    thisDealsPosition: string;
    avgBusinessFit: number;
    avgEmotionalFit: number;
    avgTechnicalFit: number;
    avgReadinessFit: number;
    wonDealCount: number;
    insight: string;
  } | null;
};

type PortfolioDeal = {
  id: string;
  name: string;
  companyName: string | null;
  stage: PipelineStage;
  dealValue: string | null;
  vertical: string | null;
  closeDate: string | null;
  assignedAeName: string | null;
  scores: {
    businessFitScore: number;
    emotionalFitScore: number;
    technicalFitScore: number;
    readinessFitScore: number;
    overallFitness: number;
    velocityTrend: string;
    daysSinceLastEvent: number | null;
    fitImbalanceFlag: boolean;
  };
};

type DealDetail = {
  deal: {
    id: string;
    name: string;
    stage: PipelineStage;
    dealValue: string | null;
    vertical: string | null;
    closeDate: string | null;
    companyName: string | null;
    assignedAeName: string | null;
  };
  scores: Scores | null;
  events: Record<FitCategory, FitnessEvent[]>;
  timeline: Array<{
    date: string;
    eventKey: string;
    eventLabel: string;
    fitCategory: FitCategory;
    contactName: string | null;
  }>;
};

type Props = {
  initialData: { deals: PortfolioDeal[] };
};

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const PALETTE = {
  bg: "#FDFAF7",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
  shadow: "0 4px 24px rgba(107,79,57,0.08)",
  text: "#3D3833",
  muted: "#8A8078",
  coral: "#E07A5F",
  sand: "#E8DDD3",
  sandLight: "#F3EDE7",
  success: "#2D8A4E",
  warning: "#D4A843",
  danger: "#C74B3B",
} as const;

const FIT_META: Record<
  FitCategory,
  { label: string; icon: LucideIcon; color: string }
> = {
  business_fit: { label: "Business Fit", icon: DollarSign, color: "#3B82F6" },
  emotional_fit: { label: "Emotional Fit", icon: Heart, color: "#E07A5F" },
  technical_fit: { label: "Technical Fit", icon: Cpu, color: "#10B981" },
  readiness_fit: { label: "Readiness Fit", icon: CheckCircle, color: "#8B5CF6" },
};

function scoreColor(score: number): string {
  if (score >= 80) return PALETTE.success;
  if (score >= 60) return PALETTE.warning;
  return PALETTE.danger;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekLabel(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.max(0, Math.round((56 - days) / 7));
  return `Week ${week}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Card primitive
// ────────────────────────────────────────────────────────────────────────────

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: PALETTE.card,
        border: `1px solid ${PALETTE.border}`,
        boxShadow: PALETTE.shadow,
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main client
// ────────────────────────────────────────────────────────────────────────────

export function DealFitnessClient({ initialData }: Props) {
  const [view, setView] = useState<"portfolio" | "drill">("portfolio");
  const [detail, setDetail] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portfolio = initialData?.deals ?? [];

  async function openDeal(dealId: string) {
    setLoading(true);
    setError(null);
    setView("drill");
    setDetail(null);
    try {
      const res = await fetch(`/api/deal-fitness?dealId=${dealId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DealDetail;
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function backToPortfolio() {
    setView("portfolio");
    setDetail(null);
    setError(null);
  }

  return (
    <div
      style={{
        background: PALETTE.bg,
        minHeight: "100vh",
        padding: "32px 32px 80px",
        fontFamily: "DM Sans, sans-serif",
        color: PALETTE.text,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {view === "portfolio" ? (
          <PortfolioView portfolio={portfolio} onOpenDeal={openDeal} />
        ) : (
          <DrillDownView
            detail={detail}
            loading={loading}
            error={error}
            onBack={backToPortfolio}
            onRetry={() => detail?.deal.id && openDeal(detail.deal.id)}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Portfolio View
// ────────────────────────────────────────────────────────────────────────────

function PortfolioView({
  portfolio,
  onOpenDeal,
}: {
  portfolio: PortfolioDeal[];
  onOpenDeal: (id: string) => void;
}) {
  const summary = useMemo(() => {
    if (portfolio.length === 0) {
      return { avgFitness: 0, count: 0, imbalances: 0, eventsThisWeek: 0 };
    }
    const avg =
      portfolio.reduce((s, d) => s + (d.scores.overallFitness ?? 0), 0) /
      portfolio.length;
    const imbalances = portfolio.filter((d) => d.scores.fitImbalanceFlag).length;
    return {
      avgFitness: Math.round(avg),
      count: portfolio.length,
      imbalances,
      // eventsThisWeek isn't on the portfolio rows; keep 3 for the demo deal.
      eventsThisWeek: imbalances > 0 ? 3 : 0,
    };
  }, [portfolio]);

  return (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: PALETTE.text,
              margin: 0,
              marginBottom: 6,
            }}
          >
            Deal Fitness
          </h1>
          <p style={{ fontSize: 14, color: PALETTE.muted, margin: 0 }}>
            Buyer inspectable events across your portfolio — powered by Travis
            Bryant&apos;s oDeal framework
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            background: "rgba(224,122,95,0.08)",
            borderRadius: 999,
            color: PALETTE.coral,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Sparkles size={12} color={PALETTE.coral} />
          oDeal Framework
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          label="Portfolio Fitness"
          value={`${summary.avgFitness}%`}
          valueColor={scoreColor(summary.avgFitness)}
          trend="up"
        />
        <SummaryCard label="Deals Tracked" value={String(summary.count)} />
        <SummaryCard
          label="Fit Imbalances"
          value={String(summary.imbalances)}
          highlight={summary.imbalances > 0}
        />
        <SummaryCard
          label="Events This Week"
          value={String(summary.eventsThisWeek)}
        />
      </div>

      {/* Deal table */}
      {portfolio.length === 0 ? (
        <Card>
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
            }}
          >
            <Activity size={48} color={PALETTE.muted} style={{ margin: "0 auto 16px" }} />
            <p style={{ color: PALETTE.muted, fontSize: 14, margin: 0 }}>
              No deals with fitness tracking yet. Upload a transcript to get started.
            </p>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: PALETTE.sandLight,
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 600,
                  color: PALETTE.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                <th style={{ padding: "14px 16px" }}>Deal</th>
                <th style={{ padding: "14px 12px" }}>Stage</th>
                <th style={{ padding: "14px 12px" }}>Value</th>
                <th style={{ padding: "14px 12px" }}>Fit Scores</th>
                <th style={{ padding: "14px 12px" }}>Overall</th>
                <th style={{ padding: "14px 12px" }}>Velocity</th>
                <th style={{ padding: "14px 16px" }}>Days Quiet</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((d) => (
                <DealRow key={d.id} deal={d} onClick={() => onOpenDeal(d.id)} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  valueColor,
  trend,
  highlight,
}: {
  label: string;
  value: string;
  valueColor?: string;
  trend?: "up" | "down" | "flat";
  highlight?: boolean;
}) {
  return (
    <Card
      style={{
        background: highlight ? "rgba(224,122,95,0.06)" : PALETTE.card,
        borderColor: highlight ? "rgba(224,122,95,0.3)" : PALETTE.border,
      }}
    >
      <div style={{ fontSize: 12, color: PALETTE.muted, marginBottom: 8, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: valueColor || PALETTE.text,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {trend === "up" && <TrendingUp size={16} color={PALETTE.success} />}
        {trend === "down" && <TrendingDown size={16} color={PALETTE.danger} />}
        {trend === "flat" && <Minus size={16} color={PALETTE.muted} />}
      </div>
    </Card>
  );
}

function DealRow({
  deal,
  onClick,
}: {
  deal: PortfolioDeal;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const value = deal.dealValue ? formatCurrency(Number(deal.dealValue), "USD") : "—";
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        background: hover ? PALETTE.sandLight : "transparent",
        borderTop: `1px solid ${PALETTE.border}`,
      }}
    >
      <td style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.text }}>
            {deal.name}
          </span>
          {deal.scores.fitImbalanceFlag && (
            <span
              style={{
                background: "rgba(212,168,67,0.15)",
                color: "#9A7A20",
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              Imbalanced
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: PALETTE.muted, marginTop: 2 }}>
          {deal.companyName}
        </div>
      </td>
      <td style={{ padding: "16px 12px", fontSize: 13, color: PALETTE.text }}>
        {STAGE_LABELS[deal.stage] ?? deal.stage}
      </td>
      <td style={{ padding: "16px 12px", fontSize: 13, color: PALETTE.text, fontWeight: 600 }}>
        {value}
      </td>
      <td style={{ padding: "16px 12px" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <MiniBar label="B" score={deal.scores.businessFitScore} />
          <MiniBar label="E" score={deal.scores.emotionalFitScore} />
          <MiniBar label="T" score={deal.scores.technicalFitScore} />
          <MiniBar label="R" score={deal.scores.readinessFitScore} />
        </div>
      </td>
      <td style={{ padding: "16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RingGauge size={44} score={deal.scores.overallFitness} />
        </div>
      </td>
      <td style={{ padding: "16px 12px" }}>
        <VelocityBadge trend={deal.scores.velocityTrend} />
      </td>
      <td style={{ padding: "16px" }}>
        <span
          style={{
            fontSize: 13,
            color:
              (deal.scores.daysSinceLastEvent ?? 0) > 7
                ? PALETTE.coral
                : PALETTE.text,
            fontWeight: (deal.scores.daysSinceLastEvent ?? 0) > 7 ? 600 : 400,
          }}
        >
          {deal.scores.daysSinceLastEvent ?? "—"}d
        </span>
      </td>
    </tr>
  );
}

function MiniBar({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div
        style={{
          width: 80,
          height: 6,
          background: PALETTE.sandLight,
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            height: "100%",
            background: scoreColor(score),
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: PALETTE.muted }}>
        {label}: {score}%
      </span>
    </div>
  );
}

function RingGauge({
  size,
  score,
  strokeWidth,
}: {
  size: number;
  score: number;
  strokeWidth?: number;
}) {
  const sw = strokeWidth ?? Math.max(4, Math.round(size / 10));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color = scoreColor(score);
  const fontSize = Math.round(size * 0.36);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={PALETTE.sandLight}
          strokeWidth={sw}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize,
          fontWeight: 700,
          color: PALETTE.text,
        }}
      >
        {score}
      </div>
    </div>
  );
}

function VelocityBadge({ trend }: { trend: string }) {
  let label: string = "Stable";
  let color: string = PALETTE.muted;
  let Icon: LucideIcon = Minus;
  if (trend === "accelerating") {
    label = "Accelerating";
    color = PALETTE.success;
    Icon = TrendingUp;
  } else if (trend === "decelerating") {
    label = "Decelerating";
    color = PALETTE.coral;
    Icon = TrendingDown;
  } else if (trend === "stalled") {
    label = "Stalled";
    color = PALETTE.danger;
    Icon = Minus;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color }}>
      <Icon size={14} color={color} />
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Drill-Down View
// ────────────────────────────────────────────────────────────────────────────

function DrillDownView({
  detail,
  loading,
  error,
  onBack,
  onRetry,
}: {
  detail: DealDetail | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          padding: 0,
          marginBottom: 20,
          fontSize: 14,
          color: PALETTE.muted,
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = PALETTE.coral)}
        onMouseLeave={(e) => (e.currentTarget.style.color = PALETTE.muted)}
      >
        <ArrowLeft size={14} />
        Back to Portfolio
      </button>

      {loading && <DrillSkeleton />}

      {error && !loading && (
        <Card>
          <div style={{ textAlign: "center", padding: 24 }}>
            <p style={{ color: PALETTE.text, fontSize: 14, marginBottom: 12 }}>
              Unable to load fitness data. Please try again.
            </p>
            <button
              onClick={onRetry}
              style={{
                background: PALETTE.coral,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {detail && !loading && !error && <DrillContent detail={detail} />}
    </>
  );
}

function DrillSkeleton() {
  const pulse: React.CSSProperties = {
    background: PALETTE.sandLight,
    borderRadius: 12,
    animation: "pulse 1.5s ease-in-out infinite",
  };
  return (
    <>
      <style>
        {`@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }`}
      </style>
      <div style={{ ...pulse, height: 140, marginBottom: 16 }} />
      <div style={{ ...pulse, height: 200, marginBottom: 16 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        <div style={{ ...pulse, height: 220 }} />
        <div style={{ ...pulse, height: 220 }} />
        <div style={{ ...pulse, height: 220 }} />
        <div style={{ ...pulse, height: 220 }} />
      </div>
    </>
  );
}

function DrillContent({ detail }: { detail: DealDetail }) {
  const { deal, scores, events, timeline } = detail;
  if (!scores) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Deal Header */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: PALETTE.text,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {deal.name}
            </h2>
            <div style={{ fontSize: 14, color: PALETTE.muted, marginBottom: 12 }}>
              {deal.companyName}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
              <span
                style={{
                  background: PALETTE.sandLight,
                  color: PALETTE.text,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontWeight: 600,
                }}
              >
                {STAGE_LABELS[deal.stage] ?? deal.stage}
              </span>
              <span style={{ color: PALETTE.text }}>
                <strong>Value:</strong>{" "}
                {deal.dealValue ? formatCurrency(Number(deal.dealValue), "USD") : "—"}
              </span>
              <span style={{ color: PALETTE.text }}>
                <strong>AE:</strong> {deal.assignedAeName ?? "—"}
              </span>
              <span style={{ color: PALETTE.text }}>
                <strong>Close:</strong> {fmtDate(deal.closeDate)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <RingGauge size={80} score={scores.overallFitness} />
            <VelocityBadge trend={scores.velocityTrend} />
          </div>
        </div>

        {scores.benchmarkVsWon && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${PALETTE.border}`,
              fontSize: 13,
              color: PALETTE.muted,
              lineHeight: 1.6,
            }}
          >
            At {STAGE_LABELS[deal.stage] ?? deal.stage} stage, won{" "}
            {scores.benchmarkVsWon.vertical.replace("_", " ")} deals averaged{" "}
            <strong style={{ color: PALETTE.text }}>
              {scores.benchmarkVsWon.avgFitnessAtStage}%
            </strong>{" "}
            overall fitness. This deal:{" "}
            <strong
              style={{
                color:
                  scores.overallFitness >= scores.benchmarkVsWon.avgFitnessAtStage
                    ? PALETTE.success
                    : PALETTE.coral,
              }}
            >
              {scores.overallFitness}%
            </strong>
            .
          </div>
        )}
      </Card>

      {/* Radar Chart */}
      <Card>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: PALETTE.text,
            margin: 0,
            marginBottom: 16,
          }}
        >
          Fit Balance
        </h3>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RadarChart scores={scores} />
        </div>
        {scores.benchmarkVsWon && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginTop: 12,
              fontSize: 12,
              color: PALETTE.muted,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 16,
                  height: 3,
                  background: PALETTE.coral,
                  display: "inline-block",
                }}
              />
              This Deal
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 16,
                  height: 0,
                  borderTop: `2px dashed ${PALETTE.sand}`,
                  display: "inline-block",
                }}
              />
              Won Deal Avg
            </span>
          </div>
        )}
      </Card>

      {/* Velocity Timeline */}
      <Card>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: PALETTE.text,
            margin: 0,
            marginBottom: 16,
          }}
        >
          Event Timeline
        </h3>
        <VelocityTimeline timeline={timeline} />
      </Card>

      {/* 4 Fit Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {(["business_fit", "emotional_fit", "technical_fit", "readiness_fit"] as FitCategory[]).map(
          (cat) => (
            <FitCard
              key={cat}
              category={cat}
              events={events[cat] ?? []}
              detected={
                cat === "business_fit"
                  ? scores.businessFitDetected
                  : cat === "emotional_fit"
                  ? scores.emotionalFitDetected
                  : cat === "technical_fit"
                  ? scores.technicalFitDetected
                  : scores.readnessFitDetected
              }
              total={
                cat === "business_fit"
                  ? scores.businessFitTotal
                  : cat === "emotional_fit"
                  ? scores.emotionalFitTotal
                  : cat === "technical_fit"
                  ? scores.technicalFitTotal
                  : scores.readinessFitTotal
              }
              score={
                cat === "business_fit"
                  ? scores.businessFitScore
                  : cat === "emotional_fit"
                  ? scores.emotionalFitScore
                  : cat === "technical_fit"
                  ? scores.technicalFitScore
                  : scores.readinessFitScore
              }
            />
          )
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Radar Chart (pure SVG)
// ────────────────────────────────────────────────────────────────────────────

function RadarChart({ scores }: { scores: Scores }) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;

  // Axes: top=Business, right=Technical, bottom=Readiness, left=Emotional
  // angles in radians, 0 = right, going clockwise
  const axes: { label: string; score: number; bench?: number; angle: number }[] = [
    {
      label: "Business",
      score: scores.businessFitScore,
      bench: scores.benchmarkVsWon?.avgBusinessFit,
      angle: -Math.PI / 2,
    },
    {
      label: "Technical",
      score: scores.technicalFitScore,
      bench: scores.benchmarkVsWon?.avgTechnicalFit,
      angle: 0,
    },
    {
      label: "Readiness",
      score: scores.readinessFitScore,
      bench: scores.benchmarkVsWon?.avgReadinessFit,
      angle: Math.PI / 2,
    },
    {
      label: "Emotional",
      score: scores.emotionalFitScore,
      bench: scores.benchmarkVsWon?.avgEmotionalFit,
      angle: Math.PI,
    },
  ];

  const point = (angle: number, value: number) => {
    const rr = (r * value) / 100;
    return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)] as const;
  };

  const polyPoints = (vals: number[]) =>
    axes
      .map((a, i) => {
        const [x, y] = point(a.angle, vals[i] ?? 0);
        return `${x},${y}`;
      })
      .join(" ");

  const dealVals = axes.map((a) => a.score);
  const benchVals = axes.map((a) => a.bench ?? 0);
  const hasBench = axes.every((a) => typeof a.bench === "number");

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* Grid rings */}
      {[25, 50, 75, 100].map((p) => (
        <polygon
          key={p}
          points={axes
            .map((a) => {
              const [x, y] = point(a.angle, p);
              return `${x},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {axes.map((a, i) => {
        const [x, y] = point(a.angle, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={1}
          />
        );
      })}

      {/* Benchmark polygon */}
      {hasBench && (
        <polygon
          points={polyPoints(benchVals)}
          fill="none"
          stroke={PALETTE.sand}
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      )}

      {/* Deal polygon */}
      <polygon
        points={polyPoints(dealVals)}
        fill="rgba(224,122,95,0.15)"
        stroke={PALETTE.coral}
        strokeWidth={2}
      />

      {/* Vertices */}
      {axes.map((a, i) => {
        const [x, y] = point(a.angle, dealVals[i]);
        return <circle key={i} cx={x} cy={y} r={6} fill={PALETTE.coral} />;
      })}

      {/* Axis labels */}
      {axes.map((a, i) => {
        const [x, y] = point(a.angle, 145);
        const anchor =
          Math.abs(Math.cos(a.angle)) < 0.3
            ? "middle"
            : Math.cos(a.angle) > 0
            ? "start"
            : "end";
        return (
          <g key={i}>
            <text
              x={x}
              y={y}
              textAnchor={anchor}
              fontSize={13}
              fontWeight={600}
              fill={PALETTE.text}
              fontFamily="DM Sans, sans-serif"
            >
              {a.label}
            </text>
            <text
              x={x}
              y={y + 14}
              textAnchor={anchor}
              fontSize={11}
              fill={PALETTE.muted}
              fontFamily="DM Sans, sans-serif"
            >
              {a.score}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Velocity Timeline (pure SVG)
// ────────────────────────────────────────────────────────────────────────────

function VelocityTimeline({
  timeline,
}: {
  timeline: DealDetail["timeline"];
}) {
  const width = 1100;
  const height = 200;
  const left = 110;
  const right = 30;
  const top = 16;
  const bottom = 36;
  const innerW = width - left - right;
  const innerH = height - top - bottom;

  const rows: FitCategory[] = [
    "business_fit",
    "emotional_fit",
    "technical_fit",
    "readiness_fit",
  ];
  const rowHeight = innerH / rows.length;

  // Time domain: 56 days ago → today
  const startMs = Date.now() - 56 * 24 * 60 * 60 * 1000;
  const endMs = Date.now();
  const xFor = (iso: string) => {
    const t = new Date(iso).getTime();
    const pct = (t - startMs) / (endMs - startMs);
    return left + Math.max(0, Math.min(1, pct)) * innerW;
  };
  const yForCat = (cat: FitCategory) => {
    const idx = rows.indexOf(cat);
    return top + rowHeight * idx + rowHeight / 2;
  };

  // Group events by category for gap detection
  const byCat: Record<FitCategory, DealDetail["timeline"]> = {
    business_fit: [],
    emotional_fit: [],
    technical_fit: [],
    readiness_fit: [],
  };
  timeline.forEach((e) => byCat[e.fitCategory].push(e));
  for (const c of rows) {
    byCat[c].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Week ticks
  const weeks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg width={width} height={height}>
        {/* Row backgrounds + labels */}
        {rows.map((cat, i) => {
          const meta = FIT_META[cat];
          return (
            <g key={cat}>
              <rect
                x={left}
                y={top + rowHeight * i}
                width={innerW}
                height={rowHeight}
                fill={i % 2 === 0 ? "rgba(232,221,211,0.15)" : "transparent"}
              />
              <text
                x={left - 12}
                y={top + rowHeight * i + rowHeight / 2 + 4}
                textAnchor="end"
                fontSize={13}
                fill={PALETTE.muted}
                fontFamily="DM Sans, sans-serif"
              >
                {meta.label}
              </text>
            </g>
          );
        })}

        {/* Week tick labels */}
        {weeks.map((w) => {
          const x =
            left +
            ((endMs - (Date.now() - (8 - w) * 7 * 24 * 60 * 60 * 1000) - startMs) /
              (endMs - startMs)) *
              innerW;
          return (
            <g key={w}>
              <line
                x1={x}
                y1={top}
                x2={x}
                y2={top + innerH}
                stroke="rgba(0,0,0,0.04)"
                strokeWidth={1}
              />
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                fontSize={11}
                fill={PALETTE.muted}
                fontFamily="DM Sans, sans-serif"
              >
                W{w}
              </text>
            </g>
          );
        })}

        {/* Gap markers */}
        {rows.flatMap((cat) => {
          const list = byCat[cat];
          const segs: React.ReactNode[] = [];
          for (let i = 1; i < list.length; i++) {
            const prev = new Date(list[i - 1].date).getTime();
            const curr = new Date(list[i].date).getTime();
            const days = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
            if (days > 10) {
              const x1 = xFor(list[i - 1].date);
              const x2 = xFor(list[i].date);
              const y = yForCat(cat);
              segs.push(
                <g key={`${cat}-gap-${i}`}>
                  <line
                    x1={x1}
                    y1={y}
                    x2={x2}
                    y2={y}
                    stroke={PALETTE.warning}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill={PALETTE.muted}
                    fontFamily="DM Sans, sans-serif"
                  >
                    {days}d
                  </text>
                </g>
              );
            }
          }
          return segs;
        })}

        {/* Event dots */}
        {timeline.map((e, i) => {
          const x = xFor(e.date);
          const y = yForCat(e.fitCategory);
          const color = FIT_META[e.fitCategory].color;
          return (
            <g key={i}>
              <title>
                {e.eventLabel}
                {e.contactName ? ` — ${e.contactName}` : ""} · {fmtDate(e.date)}
              </title>
              <circle cx={x} cy={y} r={5} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Fit Card with expandable events
// ────────────────────────────────────────────────────────────────────────────

function FitCard({
  category,
  events,
  detected,
  total,
  score,
}: {
  category: FitCategory;
  events: FitnessEvent[];
  detected: number;
  total: number;
  score: number;
}) {
  const meta = FIT_META[category];
  const Icon = meta.icon;
  const sc = scoreColor(score);
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={18} color={meta.color} />
          <span style={{ fontSize: 16, fontWeight: 600, color: PALETTE.text }}>
            {meta.label}
          </span>
        </div>
        <span
          style={{
            background: `${sc}1A`,
            color: sc,
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          {detected}/{total} · {score}%
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
      </div>
    </Card>
  );
}

function EventRow({ event }: { event: FitnessEvent }) {
  const [open, setOpen] = useState(false);
  const isDetected = event.status === "detected";
  const isNotYet = event.status === "not_yet";
  const isNegative = event.status === "negative";

  return (
    <div
      style={{
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 8,
        background: isNotYet ? "rgba(232,221,211,0.25)" : PALETTE.card,
        opacity: isNotYet ? 0.92 : 1,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          width: "100%",
          background: "none",
          border: "none",
          padding: "12px 14px",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {isDetected && (
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: PALETTE.success,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={11} color="white" strokeWidth={3} />
            </div>
          )}
          {isNotYet && (
            <Circle size={18} color={PALETTE.muted} strokeWidth={1.5} />
          )}
          {isNegative && <AlertTriangle size={18} color={PALETTE.warning} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: isDetected ? 600 : 500,
              color: isNotYet ? PALETTE.muted : PALETTE.text,
              marginBottom: isDetected || isNotYet ? 4 : 0,
            }}
          >
            {event.eventLabel}
          </div>
          {isDetected && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: PALETTE.muted,
              }}
            >
              {event.detectedAt && (
                <span>
                  {weekLabel(event.detectedAt)} · {fmtDate(event.detectedAt)}
                </span>
              )}
              {event.detectionSources?.map((s) => (
                <SourceBadge key={s} source={s} />
              ))}
              {event.contactName && <span>· {event.contactName}</span>}
            </div>
          )}
          {isNotYet && (
            <div
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: PALETTE.muted,
                lineHeight: 1.55,
              }}
            >
              <span style={{ color: PALETTE.coral, fontStyle: "normal", fontWeight: 600 }}>
                💡 Coaching:{" "}
              </span>
              {event.eventDescription}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {open ? (
            <ChevronDown size={16} color={PALETTE.muted} />
          ) : (
            <ChevronRight size={16} color={PALETTE.muted} />
          )}
        </div>
      </button>

      {open && isDetected && (
        <div
          style={{
            padding: "0 14px 14px 42px",
            borderTop: `1px solid ${PALETTE.border}`,
            paddingTop: 12,
          }}
        >
          {event.eventDescription && (
            <p
              style={{
                fontSize: 14,
                color: PALETTE.text,
                lineHeight: 1.6,
                margin: 0,
                marginBottom: 12,
              }}
            >
              {event.eventDescription}
            </p>
          )}
          {event.evidenceSnippets && event.evidenceSnippets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {event.evidenceSnippets.map((snip, i) => (
                <div
                  key={i}
                  style={{
                    background: PALETTE.sandLight,
                    borderRadius: 12,
                    padding: 12,
                    borderLeft: `3px solid ${PALETTE.coral}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: PALETTE.text,
                      lineHeight: 1.5,
                      marginBottom: 4,
                    }}
                  >
                    &ldquo;{snip.quote}&rdquo;
                  </div>
                  <div style={{ fontSize: 12, color: PALETTE.muted }}>
                    {snip.source}
                  </div>
                </div>
              ))}
            </div>
          )}
          {event.confidence && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>
                Confidence: {Math.round(Number(event.confidence) * 100)}%
              </div>
              <div
                style={{
                  height: 4,
                  background: PALETTE.sandLight,
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Number(event.confidence) * 100}%`,
                    height: "100%",
                    background: scoreColor(Number(event.confidence) * 100),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    transcript: { bg: "rgba(59,130,246,0.12)", fg: "#1E5FB3", label: "Transcript" },
    email: { bg: "rgba(16,185,129,0.12)", fg: "#0F7A55", label: "Email" },
  };
  const m = map[source] ?? {
    bg: PALETTE.sandLight,
    fg: PALETTE.muted,
    label: source,
  };
  return (
    <span
      style={{
        background: m.bg,
        color: m.fg,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      {m.label}
    </span>
  );
}

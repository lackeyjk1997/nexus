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
  stakeholderEngagement: StakeholderEngagement | null;
  buyerMomentum: BuyerMomentum | null;
  conversationSignals: ConversationSignals | null;
};

type StakeholderContact = {
  contactName: string;
  title: string;
  role: string;
  firstActiveWeek: number;
  weeksActive: number[];
  callsJoined: number[];
  emailsInvolved: number;
  introducedBy: string | null;
};

type StakeholderEngagement = {
  totalStakeholders: number;
  benchmark: { avgAtStage: number; wonDealAvg: number; position: string };
  departmentsEngaged: number;
  departmentList: string[];
  contactTimeline: StakeholderContact[];
};

type Commitment = {
  madeBy: string;
  madeIn: string;
  week: number;
  commitment: string;
  fulfilled: boolean;
  fulfilledHow: string;
  fulfilledWeek: number;
};

type BuyerMomentum = {
  responseTimeTrend: {
    dataPoints: { week: number; avgHours: number }[];
    trend: string;
    currentAvgHours: number;
    startingAvgHours: number;
  };
  emailDirectionality: {
    totalEmails: number;
    buyerInitiated: number;
    sellerInitiated: number;
    buyerInitiatedPct: number;
    benchmark: { wonDealAvg: number; lostDealAvg: number };
    insight: string;
  };
  commitmentFollowThrough: {
    totalCommitments: number;
    fulfilled: number;
    fulfillmentRate: number;
    commitments: Commitment[];
  };
};

type LanguagePoint = {
  call: number;
  label: string;
  week: number;
  yourProductPct: number;
  weOurPct: number;
  sampleQuotes: string[];
};

type KeyMoment = {
  call: number;
  speaker: string;
  moment: string;
  signal: string;
  why: string;
};

type ConversationSignals = {
  ownershipLanguage: {
    trend: string;
    dataPoints: LanguagePoint[];
    insight: string;
  };
  sentimentProfile: {
    type: string;
    description: string;
    keyMoments: KeyMoment[];
  };
  dealInsight: string;
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
  const { deal, scores, events } = detail;
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

      {/* Three analysis cards: Stakeholder Engagement | Buyer Momentum + Conversation Signals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {scores.stakeholderEngagement && (
          <StakeholderEngagementCard data={scores.stakeholderEngagement} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {scores.buyerMomentum && <BuyerMomentumCard data={scores.buyerMomentum} />}
          {scores.conversationSignals && (
            <ConversationSignalsCard data={scores.conversationSignals} />
          )}
        </div>
      </div>

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

      {/* Bottom Nexus Intelligence insight */}
      {scores.conversationSignals?.dealInsight && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} color={PALETTE.coral} />
            <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.coral, letterSpacing: 0.3 }}>
              NEXUS INTELLIGENCE
            </span>
          </div>
          <p
            style={{
              fontSize: 14,
              color: PALETTE.text,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {scores.conversationSignals.dealInsight}
          </p>
        </Card>
      )}
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
// Stakeholder Engagement Card
// ────────────────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  champion: { bg: "rgba(224,122,95,0.15)", fg: "#B5543A", label: "Champion" },
  economic_buyer: { bg: "rgba(59,130,246,0.12)", fg: "#1E5FB3", label: "Economic Buyer" },
  technical_evaluator: { bg: "rgba(16,185,129,0.12)", fg: "#0F7A55", label: "Technical" },
  blocker: { bg: "rgba(212,168,67,0.18)", fg: "#7A5C10", label: "CISO" },
  end_user: { bg: "rgba(139,92,246,0.12)", fg: "#5B3D9E", label: "Operations" },
  coach: { bg: "rgba(99,102,241,0.12)", fg: "#3D3D9E", label: "Executive" },
};

function StakeholderEngagementCard({ data }: { data: StakeholderEngagement }) {
  const sorted = [...data.contactTimeline].sort(
    (a, b) => a.firstActiveWeek - b.firstActiveWeek
  );
  const weeks = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const above = data.totalStakeholders >= data.benchmark.wonDealAvg;

  return (
    <Card style={{ height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: PALETTE.text,
            margin: 0,
          }}
        >
          Buying Committee
        </h3>
        <span
          style={{
            background: PALETTE.sandLight,
            color: PALETTE.text,
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          {data.totalStakeholders} stakeholders · {data.departmentsEngaged} departments
        </span>
      </div>
      <div
        style={{
          fontSize: 13,
          color: PALETTE.muted,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        Won Healthcare deals at Negotiation stage average{" "}
        <strong style={{ color: PALETTE.text }}>{data.benchmark.wonDealAvg}</strong>{" "}
        stakeholders. This deal:{" "}
        <strong style={{ color: above ? PALETTE.success : PALETTE.coral }}>
          {data.totalStakeholders}
        </strong>
        .
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 12,
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 8px 8px 0", fontWeight: 600, color: PALETTE.muted }}>
                Stakeholder
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  style={{
                    textAlign: "center",
                    padding: "4px 0 8px",
                    fontWeight: 600,
                    color: PALETTE.muted,
                    width: 22,
                  }}
                >
                  W{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const badge = ROLE_BADGE[c.role] ?? {
                bg: PALETTE.sandLight,
                fg: PALETTE.muted,
                label: c.role,
              };
              const callWeeks = new Set<number>();
              // weeks where they joined a call: any week in weeksActive that corresponds to a call week
              // We approximate by saying if weeksActive contains the week AND callsJoined is non-empty
              // Use a simple rule: a call-week dot is solid; otherwise outlined.
              const callWeekSet = new Set([1, 3, 4, 6, 8]); // calls 1..5
              for (const w of c.weeksActive) {
                if (callWeekSet.has(w) && c.callsJoined.length > 0) {
                  callWeeks.add(w);
                }
              }
              const activeSet = new Set(c.weeksActive);
              return (
                <tr key={c.contactName} style={{ borderTop: `1px solid ${PALETTE.border}` }}>
                  <td style={{ padding: "10px 12px 10px 0", verticalAlign: "top" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: PALETTE.text }}>
                      {c.contactName}
                    </div>
                    <div style={{ fontSize: 11, color: PALETTE.muted, marginBottom: 4 }}>
                      {c.title}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        background: badge.bg,
                        color: badge.fg,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: 999,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  {weeks.map((w) => {
                    const isActive = activeSet.has(w);
                    const isCall = callWeeks.has(w);
                    return (
                      <td
                        key={w}
                        style={{
                          textAlign: "center",
                          padding: "10px 0",
                          background: isActive ? "transparent" : "rgba(243,237,231,0.4)",
                        }}
                      >
                        {isActive && (
                          <span
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: isCall ? PALETTE.coral : "transparent",
                              border: `2px solid ${PALETTE.coral}`,
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: PALETTE.muted,
          fontStyle: "italic",
          lineHeight: 1.5,
        }}
      >
        All 7 stakeholders were introduced by Dr. Amanda Chen — strong champion-led expansion.
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: PALETTE.muted,
          display: "flex",
          gap: 14,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: PALETTE.coral,
              display: "inline-block",
            }}
          />
          Joined call
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              border: `2px solid ${PALETTE.coral}`,
              display: "inline-block",
            }}
          />
          Email only
        </span>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Buyer Momentum Card
// ────────────────────────────────────────────────────────────────────────────

function BuyerMomentumCard({ data }: { data: BuyerMomentum }) {
  const [showAll, setShowAll] = useState(false);
  const rt = data.responseTimeTrend;
  const ed = data.emailDirectionality;
  const cf = data.commitmentFollowThrough;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: PALETTE.text, margin: 0 }}>
          Buyer Momentum
        </h3>
        <span
          style={{
            background: "rgba(45,138,78,0.12)",
            color: PALETTE.success,
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Strong <TrendingUp size={12} color={PALETTE.success} />
        </span>
      </div>

      {/* Row 1: Response Time */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr auto",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, color: PALETTE.muted }}>Response Time</span>
        <Sparkline points={rt.dataPoints.map((p) => p.avgHours)} />
        <span
          style={{
            fontSize: 13,
            color: PALETTE.text,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          36h → 45min
          <TrendingDown size={14} color={PALETTE.success} />
        </span>
      </div>

      {/* Row 2: Buyer-Initiated */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr auto",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, color: PALETTE.muted }}>Buyer-Initiated</span>
        <div
          style={{
            position: "relative",
            height: 22,
            background: PALETTE.sandLight,
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${ed.buyerInitiatedPct}%`,
              height: "100%",
              background: PALETTE.coral,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "white",
              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {ed.buyerInitiated} of {ed.totalEmails}
          </div>
        </div>
        <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: PALETTE.text, lineHeight: 1 }}>
            {ed.buyerInitiatedPct}%
          </div>
          <div style={{ fontSize: 10, color: PALETTE.muted, marginTop: 2 }}>
            vs {ed.benchmark.wonDealAvg}% won avg
          </div>
        </div>
      </div>

      {/* Row 3: Commitments Kept */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 1fr auto",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 13, color: PALETTE.muted }}>Promises Kept</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: PALETTE.success }}>
          {cf.fulfilled} of {cf.totalCommitments}
        </span>
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: "none",
            border: "none",
            color: PALETTE.coral,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {showAll ? "Hide" : "View all →"}
        </button>
      </div>

      {showAll && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${PALETTE.border}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {cf.commitments.map((c, i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: PALETTE.success,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <Check size={10} color="white" strokeWidth={3} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: PALETTE.text, lineHeight: 1.4 }}>
                  {c.commitment}
                </div>
                <div style={{ fontSize: 12, color: PALETTE.muted, marginTop: 2 }}>
                  Made by {c.madeBy} in {c.madeIn} · Fulfilled {c.fulfilledHow.toLowerCase()} (Week {c.fulfilledWeek})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 200;
  const h = 30;
  if (points.length === 0) return <svg width={w} height={h} />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (w - 4) + 2);
  const ys = points.map((v) => h - 2 - ((v - min) / range) * (h - 4));
  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const areaPath = `${linePath} L${xs[xs.length - 1]},${h} L${xs[0]},${h} Z`;
  return (
    <svg width={w} height={h}>
      <path d={areaPath} fill="rgba(224,122,95,0.12)" />
      <path d={linePath} fill="none" stroke={PALETTE.coral} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Conversation Signals Card
// ────────────────────────────────────────────────────────────────────────────

function ConversationSignalsCard({ data }: { data: ConversationSignals }) {
  const lang = data.ownershipLanguage;
  const sent = data.sentimentProfile;
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
        <h3 style={{ fontSize: 16, fontWeight: 600, color: PALETTE.text, margin: 0 }}>
          Conversation Signals
        </h3>
        <span
          style={{
            background: "rgba(45,138,78,0.12)",
            color: PALETTE.success,
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          Ownership Shift <TrendingUp size={12} color={PALETTE.success} />
        </span>
      </div>

      {/* Language ownership bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lang.dataPoints.map((p) => (
          <div
            key={p.call}
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 36px",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: PALETTE.muted }}>Call {p.call}</span>
            <div
              style={{
                height: 22,
                background: PALETTE.sandLight,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${p.weOurPct}%`,
                  height: "100%",
                  background: PALETTE.coral,
                  transition: "width 0.4s",
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: PALETTE.text, textAlign: "right" }}>
              {p.weOurPct}%
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: PALETTE.muted,
          fontStyle: "italic",
          lineHeight: 1.5,
          marginTop: 12,
        }}
      >
        {lang.insight}
      </div>

      {/* Sentiment profile */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${PALETTE.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: PALETTE.text }}>
            Deal Temperament
          </span>
          <span
            style={{
              background: "rgba(45,138,78,0.12)",
              color: PALETTE.success,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              textTransform: "capitalize",
            }}
          >
            {sent.type.replace(/_/g, " ")}
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: PALETTE.text,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: 12,
          }}
        >
          {sent.description}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sent.keyMoments.map((m, i) => (
            <KeyMomentRow key={i} moment={m} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function KeyMomentRow({ moment }: { moment: KeyMoment }) {
  const [open, setOpen] = useState(false);
  const borderColor =
    moment.signal === "strong_positive"
      ? "#1F6638"
      : moment.signal === "positive"
      ? PALETTE.success
      : PALETTE.muted;
  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: "rgba(45,138,78,0.04)",
        borderRadius: 4,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          width: "100%",
          padding: "8px 10px",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted }}>
          Call {moment.call}
        </span>
        <span style={{ fontSize: 12, color: PALETTE.text, flex: 1 }}>
          <strong>{moment.speaker}:</strong> {moment.moment}
        </span>
        {open ? (
          <ChevronDown size={14} color={PALETTE.muted} />
        ) : (
          <ChevronRight size={14} color={PALETTE.muted} />
        )}
      </button>
      {open && (
        <div
          style={{
            padding: "0 10px 10px 10px",
            fontSize: 12,
            color: PALETTE.muted,
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          Why it matters: {moment.why}
        </div>
      )}
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

  // Last event in this category
  const detectedDates = events
    .filter((e) => e.detectedAt)
    .map((e) => new Date(e.detectedAt!).getTime());
  const lastTs = detectedDates.length ? Math.max(...detectedDates) : null;
  const daysAgo = lastTs
    ? Math.max(0, Math.floor((Date.now() - lastTs) / (1000 * 60 * 60 * 24)))
    : null;
  const lastBadge = (() => {
    if (daysAgo == null) return null;
    let bg: string = "transparent";
    let fg: string = PALETTE.muted;
    let border: string = "transparent";
    if (daysAgo > 14) {
      bg = "rgba(199,75,59,0.10)";
      fg = PALETTE.danger;
      border = "rgba(199,75,59,0.25)";
    } else if (daysAgo >= 7) {
      bg = "rgba(212,168,67,0.15)";
      fg = "#9A7A20";
      border = "rgba(212,168,67,0.30)";
    }
    return (
      <span
        style={{
          background: bg,
          color: fg,
          border: `1px solid ${border}`,
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        {daysAgo}d ago
      </span>
    );
  })();

  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={18} color={meta.color} />
          <span style={{ fontSize: 16, fontWeight: 600, color: PALETTE.text }}>
            {meta.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {lastBadge}
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

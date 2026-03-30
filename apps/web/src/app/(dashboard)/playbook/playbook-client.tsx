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
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { usePersona } from "@/components/providers";

// ── Types ────────────────────────────────────────────────────────────────────

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
    retired: {
      background: "#FEF2F2",
      color: "#991B1B",
      border: "1px solid #FECACA",
    },
  };
  const labels: Record<string, string> = {
    testing: "TESTING",
    proposed: "PROPOSED",
    promoted: "PROMOTED",
    retired: "RETIRED",
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

function TestingCard({
  idea,
  members,
}: {
  idea: PlaybookIdea;
  members: Member[];
}) {
  const originator = members.find((m) => m.id === idea.originatorId);
  const daysActive = daysAgo(idea.testStartDate);
  const dealCount =
    (idea.testGroupDeals?.length ?? 0) +
    (idea.controlGroupDeals?.length ?? 0);
  const r = idea.results;

  const velocityPositive =
    r?.stage_velocity_change !== undefined
      ? r.stage_velocity_change > 0
      : undefined;

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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <TrendingUp size={15} color="#D4A843" />
          <span
            style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}
          >
            {idea.title}
          </span>
        </div>
        <StatusBadge status="testing" />
      </div>

      {/* Meta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 12,
          color: "#8A8078",
        }}
      >
        <span style={{ fontWeight: 500, color: "#6B6B6B" }}>
          {originator?.name ?? "Unknown"}
        </span>
        <span>·</span>
        <span>
          <Clock size={11} style={{ display: "inline", marginRight: 3 }} />
          {daysActive}d active
        </span>
        {dealCount > 0 && (
          <>
            <span>·</span>
            <span>{dealCount} deals</span>
          </>
        )}
        {idea.vertical && (
          <>
            <span>·</span>
            <span>{formatVertical(idea.vertical)}</span>
          </>
        )}
      </div>

      {/* Hypothesis */}
      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
        {idea.hypothesis}
      </p>

      {r && (
        <>
          {/* Early Results */}
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
              EARLY RESULTS
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <MetricBox
                label="Velocity"
                value={
                  r.stage_velocity_change !== undefined
                    ? `${r.stage_velocity_change > 0 ? "+" : ""}${r.stage_velocity_change}%`
                    : "—"
                }
                positive={velocityPositive}
              />
              <MetricBox
                label="Sentiment"
                value={
                  r.sentiment_shift !== undefined
                    ? `${r.sentiment_shift > 0 ? "+" : ""}${r.sentiment_shift} pts`
                    : "—"
                }
                positive={
                  r.sentiment_shift !== undefined
                    ? r.sentiment_shift > 0
                    : undefined
                }
              />
              <MetricBox
                label="Adoption"
                value={
                  r.adoption_count !== undefined
                    ? `${r.adoption_count} reps`
                    : "—"
                }
              />
            </div>
          </div>

          {/* Confidence bar */}
          <ConfidenceBar level={r.confidence} />
        </>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "#8A8078",
        }}
      >
        <Users size={13} />
        <span>
          {idea.followerCount ?? 0}{" "}
          {(idea.followerCount ?? 0) === 1 ? "follower" : "followers"}
        </span>
      </div>
    </div>
  );
}

// ── Proposed Card ─────────────────────────────────────────────────────────────

function ProposedCard({
  idea,
  members,
}: {
  idea: PlaybookIdea;
  members: Member[];
}) {
  const originator = members.find((m) => m.id === idea.originatorId);
  const days = daysAgo(idea.createdAt);

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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <Sparkles size={14} color="#8A8078" />
          <span
            style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}
          >
            {idea.title}
          </span>
        </div>
        <StatusBadge status="proposed" />
      </div>

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
        {idea.vertical && (
          <>
            <span>·</span>
            <span>{formatVertical(idea.vertical)}</span>
          </>
        )}
        <span>·</span>
        <span>Proposed {days}d ago</span>
      </div>

      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
        {idea.hypothesis}
      </p>

      <div
        style={{
          fontSize: 12,
          color: "#9B9B9B",
          fontStyle: "italic",
        }}
      >
        No test data yet
      </div>
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
  const days = daysAgo(idea.testEndDate ?? idea.createdAt);
  const r = idea.results;
  const followerNames = (idea.followers ?? [])
    .map((fid) => members.find((m) => m.id === fid)?.name)
    .filter(Boolean) as string[];

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        border: "1px solid #E8E5E0",
        borderLeft: "3px solid #2D8A4E",
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
          <CheckCircle size={15} color="#2D8A4E" />
          <span
            style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", flex: 1 }}
          >
            {idea.title}
          </span>
        </div>
        <StatusBadge status="promoted" />
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
        <span>Promoted {days}d ago</span>
      </div>

      <p style={{ fontSize: 13, color: "#6B6B6B", margin: 0, lineHeight: 1.5 }}>
        {idea.hypothesis}
      </p>

      {r && (
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
            PROVEN RESULTS
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <MetricBox
              label="Velocity"
              value={
                r.stage_velocity_change !== undefined
                  ? `+${r.stage_velocity_change}%`
                  : "—"
              }
              positive
            />
            {r.close_rate_test != null && r.close_rate_control != null && (
              <MetricBox
                label="Close Rate"
                value={`${r.close_rate_test}% vs ${r.close_rate_control}%`}
                positive
              />
            )}
            {r.arr_influenced !== undefined && r.arr_influenced > 0 && (
              <MetricBox
                label="ARR Impact"
                value={formatCurrency(r.arr_influenced)}
                positive
              />
            )}
            {r.sentiment_shift !== undefined && (
              <MetricBox
                label="Sentiment"
                value={`+${r.sentiment_shift} pts`}
                positive
              />
            )}
          </div>
        </div>
      )}

      {idea.vertical && (
        <div
          style={{
            fontSize: 12,
            color: "#2D8A4E",
            fontWeight: 500,
          }}
        >
          Now part of the standard {formatVertical(idea.vertical)} playbook
        </div>
      )}

      {followerNames.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#8A8078",
          }}
        >
          <Users size={13} />
          <span>{followerNames.join(", ")}</span>
        </div>
      )}
    </div>
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

export function PlaybookClient({ ideas, scores, members, marketSignals }: Props) {
  const { currentUser } = usePersona();
  const [activeTab, setActiveTab] = useState<
    "experiments" | "whats_working" | "influence"
  >("experiments");

  // ── Tab 1: Active Experiments ──────────────────────────────────────────────
  const testingIdeas = useMemo(
    () =>
      ideas
        .filter((i) => i.status === "testing")
        .sort((a, b) => (a.testStartDate?.getTime() ?? 0) - (b.testStartDate?.getTime() ?? 0)),
    [ideas]
  );
  const proposedIdeas = useMemo(
    () => ideas.filter((i) => i.status === "proposed"),
    [ideas]
  );

  // ── Tab 2: What's Working ──────────────────────────────────────────────────
  const promotedIdeas = useMemo(
    () => ideas.filter((i) => i.status === "promoted"),
    [ideas]
  );
  const retiredIdeas = useMemo(
    () => ideas.filter((i) => i.status === "retired"),
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
                <TestingCard key={idea.id} idea={idea} members={members} />
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
                <ProposedCard key={idea.id} idea={idea} members={members} />
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
                          {member.role}
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

"use client";

import { useMemo, useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Trophy,
  BarChart3,
} from "lucide-react";
import { cn, formatCurrency, daysAgo, getVerticalColor } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@nexus/shared";
import { usePersona } from "@/components/providers";
import Link from "next/link";

type Deal = {
  id: string;
  name: string;
  stage: string;
  dealValue: string | null;
  winProbability: number | null;
  forecastCategory: string | null;
  vertical: string;
  closeDate: Date | null;
  stageEnteredAt: Date | null;
  createdAt: Date;
  companyName: string | null;
  aeName: string | null;
  aeId: string | null;
};

type Activity = {
  id: string;
  type: string;
  createdAt: Date;
  teamMemberId: string;
};

type Member = {
  id: string;
  name: string;
  role: string;
};

const ACTIVE_STAGES: PipelineStage[] = [
  "new_lead", "qualified", "discovery", "technical_validation", "proposal", "negotiation", "closing",
];

export function AnalyticsClient({
  deals,
  activities,
  members,
}: {
  deals: Deal[];
  activities: Activity[];
  members: Member[];
}) {
  const { role } = usePersona();
  const isManager = role === "MANAGER";

  const activeDeals = deals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const lostDeals = deals.filter((d) => d.stage === "closed_lost");

  const totalPipeline = activeDeals.reduce((s, d) => s + Number(d.dealValue || 0), 0);
  const totalWon = wonDeals.reduce((s, d) => s + Number(d.dealValue || 0), 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
    : 0;
  const avgCycleDays = wonDeals.length > 0
    ? Math.round(wonDeals.reduce((s, d) => {
        const close = d.closeDate ? new Date(d.closeDate).getTime() : Date.now();
        return s + (close - new Date(d.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / wonDeals.length)
    : 0;

  // Pipeline by stage
  const stageData = ACTIVE_STAGES.map((stage) => {
    const stageDeals = activeDeals.filter((d) => d.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      value: stageDeals.reduce((s, d) => s + Number(d.dealValue || 0), 0),
      count: stageDeals.length,
    };
  }).filter((s) => s.count > 0);

  const maxStageValue = Math.max(...stageData.map((s) => s.value), 1);

  // AE performance
  const aes = members.filter((m) => m.role === "AE");
  const aePerformance = aes.map((ae) => {
    const aeDeals = deals.filter((d) => d.aeId === ae.id);
    const aeWon = aeDeals.filter((d) => d.stage === "closed_won");
    const aePipeline = aeDeals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage));
    return {
      id: ae.id,
      name: ae.name,
      won: aeWon.reduce((s, d) => s + Number(d.dealValue || 0), 0),
      pipeline: aePipeline.reduce((s, d) => s + Number(d.dealValue || 0), 0),
      dealCount: aeDeals.length,
    };
  }).sort((a, b) => b.pipeline - a.pipeline);

  const maxAeValue = Math.max(...aePerformance.map((a) => a.pipeline), 1);

  // Vertical breakdown
  const verticals = ["healthcare", "financial_services", "manufacturing", "retail", "technology"];
  const verticalLabels: Record<string, string> = {
    healthcare: "Healthcare", financial_services: "Financial Services",
    manufacturing: "Manufacturing", retail: "Retail", technology: "Technology",
  };
  const verticalData = verticals.map((v) => {
    const vDeals = activeDeals.filter((d) => d.vertical === v);
    const vWon = wonDeals.filter((d) => d.vertical === v);
    const vLost = lostDeals.filter((d) => d.vertical === v);
    return {
      vertical: v,
      label: verticalLabels[v] || v,
      pipeline: vDeals.reduce((s, d) => s + Number(d.dealValue || 0), 0),
      won: vWon.reduce((s, d) => s + Number(d.dealValue || 0), 0),
      winRate: vWon.length + vLost.length > 0
        ? Math.round((vWon.length / (vWon.length + vLost.length)) * 100)
        : 0,
      dealCount: vDeals.length,
    };
  }).filter((v) => v.dealCount > 0);

  // Deal aging
  const agingDeals = activeDeals
    .map((d) => ({
      ...d,
      daysInStage: d.stageEnteredAt ? daysAgo(d.stageEnteredAt) : 0,
      totalAge: daysAgo(d.createdAt),
    }))
    .sort((a, b) => b.daysInStage - a.daysInStage)
    .slice(0, 10);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {isManager ? "Team performance overview" : "Your performance overview"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Pipeline" value={formatCurrency(totalPipeline)} subtitle={`${activeDeals.length} active deals`} color="text-primary" />
        <KpiCard icon={Trophy} label="Won" value={formatCurrency(totalWon)} subtitle={`${wonDeals.length} deals closed`} color="text-success" />
        <KpiCard icon={Target} label="Win Rate" value={`${winRate}%`} subtitle={`${wonDeals.length}W / ${lostDeals.length}L`} color={winRate >= 30 ? "text-success" : "text-danger"} />
        <KpiCard icon={Clock} label="Avg Cycle" value={`${avgCycleDays}d`} subtitle="Creation to close" color="text-primary" />
      </div>

      {/* Pipeline by Stage */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline by Stage</h3>
        <div className="space-y-3">
          {stageData.map((s) => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{s.label}</span>
              <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden relative">
                <AnimatedBar width={(s.value / maxStageValue) * 100} />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-foreground">
                  {formatCurrency(s.value)} · {s.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* AE Performance */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {isManager ? "Rep Pipeline" : "Pipeline Breakdown"}
          </h3>
          <div className="space-y-3">
            {aePerformance.map((ae) => (
              <div key={ae.id} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-medium text-primary">
                    {ae.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <span className="text-xs text-foreground w-24 shrink-0 truncate">{ae.name}</span>
                <div className="flex-1 h-5 bg-muted rounded-lg overflow-hidden relative">
                  <AnimatedBar width={(ae.pipeline / maxAeValue) * 100} color="bg-primary" />
                </div>
                <span className="text-xs font-semibold text-foreground w-16 text-right">{formatCurrency(ae.pipeline)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Performance */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Pipeline by Vertical</h3>
          <div className="space-y-3">
            {verticalData.map((v) => (
              <div key={v.vertical}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getVerticalColor(v.vertical) }} />
                    <span className="text-xs font-medium text-foreground">{v.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{v.dealCount} deals</span>
                    <span className="font-semibold text-foreground">{formatCurrency(v.pipeline)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((v.pipeline / totalPipeline) * 100, 100)}%`, backgroundColor: getVerticalColor(v.vertical) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deal Aging */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Deal Aging — Needs Attention</h3>
        </div>
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Deal</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">Stage</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase">Value</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">Days in Stage</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground uppercase">Total Age</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase">AE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agingDeals.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => window.location.href = `/pipeline/${d.id}`}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getVerticalColor(d.vertical) }} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.companyName}</p>
                      <p className="text-[10px] text-muted-foreground">{d.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary">
                    {STAGE_LABELS[d.stage as PipelineStage] || d.stage}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold">{formatCurrency(Number(d.dealValue || 0))}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={cn("text-sm font-medium", d.daysInStage > 14 ? "text-danger" : d.daysInStage > 7 ? "text-warning" : "text-foreground")}>
                    {d.daysInStage}d
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center text-sm text-muted-foreground">{d.totalAge}d</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">{d.aeName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, subtitle, color }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; subtitle: string; color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary-light flex items-center justify-center">
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function AnimatedBar({ width, color = "bg-primary" }: { width: number; color?: string }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(width), 100);
    return () => clearTimeout(t);
  }, [width]);
  return (
    <div className={cn("h-full rounded-lg transition-all duration-1000 ease-out", color)} style={{ width: `${animated}%` }} />
  );
}

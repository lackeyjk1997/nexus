"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Kanban, Table, BarChart3, Filter, ChevronDown } from "lucide-react";
import { cn, formatCurrency, daysAgo, getHealthColor, getVerticalColor } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@nexus/shared";
import { ObservationInput } from "@/components/observation-input";
import { QuickQuestions } from "@/components/quick-questions";

type Deal = {
  id: string;
  name: string;
  stage: string;
  dealValue: string | null;
  currency: string | null;
  closeDate: Date | null;
  winProbability: number | null;
  forecastCategory: string | null;
  vertical: string;
  product: string | null;
  leadSource: string | null;
  competitor: string | null;
  stageEnteredAt: Date | null;
  createdAt: Date;
  companyName: string | null;
  companyDomain: string | null;
  aeName: string | null;
  aeId: string | null;
};

type TeamMember = {
  id: string;
  name: string;
  role: string;
};

type ViewMode = "kanban" | "table" | "forecast";

const ACTIVE_STAGES: PipelineStage[] = [
  "new_lead", "qualified", "discovery", "technical_validation",
  "proposal", "negotiation", "closing",
];

export function PipelineClient({ deals, teamMembers }: { deals: Deal[]; teamMembers: TeamMember[] }) {
  const [view, setView] = useState<ViewMode>("kanban");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [aeFilter, setAeFilter] = useState<string>("all");
  const [forecastFilter, setForecastFilter] = useState<string>("all");

  const aes = teamMembers.filter((m) => m.role === "AE");

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (verticalFilter !== "all" && d.vertical !== verticalFilter) return false;
      if (aeFilter !== "all" && d.aeId !== aeFilter) return false;
      if (forecastFilter !== "all" && d.forecastCategory !== forecastFilter) return false;
      return true;
    });
  }, [deals, verticalFilter, aeFilter, forecastFilter]);

  const totalPipeline = filteredDeals
    .filter((d) => !["closed_won", "closed_lost"].includes(d.stage))
    .reduce((sum, d) => sum + Number(d.dealValue || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(totalPipeline)} total active pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            {([
              { key: "kanban", icon: Kanban, label: "Kanban" },
              { key: "table", icon: Table, label: "Table" },
              { key: "forecast", icon: BarChart3, label: "Forecast" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  view === key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <SelectFilter
          value={verticalFilter}
          onChange={setVerticalFilter}
          options={[
            { value: "all", label: "All Verticals" },
            { value: "healthcare", label: "Healthcare" },
            { value: "financial_services", label: "Financial Services" },
            { value: "manufacturing", label: "Manufacturing" },
            { value: "retail", label: "Retail" },
            { value: "technology", label: "Technology" },
          ]}
        />
        <SelectFilter
          value={aeFilter}
          onChange={setAeFilter}
          options={[
            { value: "all", label: "All AEs" },
            ...aes.map((ae) => ({ value: ae.id, label: ae.name })),
          ]}
        />
        <SelectFilter
          value={forecastFilter}
          onChange={setForecastFilter}
          options={[
            { value: "all", label: "All Forecast" },
            { value: "pipeline", label: "Pipeline" },
            { value: "upside", label: "Upside" },
            { value: "commit", label: "Commit" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </div>

      {/* View */}
      {view === "kanban" && <KanbanView deals={filteredDeals} />}
      {view === "table" && <TableView deals={filteredDeals} />}
      {view === "forecast" && <ForecastView deals={filteredDeals} aes={aes} />}

      {/* Quick Check Questions for AEs */}
      <QuickQuestions />

      {/* Observation Input */}
      <ObservationInput context={{ page: "pipeline", trigger: "pipeline_review" }} />
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-card border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function KanbanView({ deals }: { deals: Deal[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {ACTIVE_STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const stageTotal = stageDeals.reduce(
          (sum, d) => sum + Number(d.dealValue || 0),
          0
        );
        return (
          <div
            key={stage}
            className="flex-shrink-0 w-72 bg-muted/50 rounded-xl"
          >
            {/* Column Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {STAGE_LABELS[stage]}
                </h3>
                <span className="text-xs font-medium text-muted-foreground bg-card px-2 py-0.5 rounded-full">
                  {stageDeals.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(stageTotal)}
              </p>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[200px]">
              {stageDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
              {stageDeals.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No deals
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const days = deal.stageEnteredAt ? daysAgo(deal.stageEnteredAt) : 0;
  const health = getHealthColor(days, deal.stage);
  const vertColor = getVerticalColor(deal.vertical);

  return (
    <Link href={`/pipeline/${deal.id}`} className="block bg-card rounded-lg border border-border p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden" data-tour={deal.companyName?.includes("MedVista") ? "deal-medvista" : undefined}>
      {/* Vertical color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: vertColor }}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {deal.companyName}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {deal.name}
            </p>
          </div>
          {/* Health indicator */}
          <div
            className={cn(
              "h-2 w-2 rounded-full mt-1 shrink-0",
              health === "success" && "bg-success",
              health === "warning" && "bg-warning",
              health === "danger" && "bg-danger"
            )}
          />
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-primary">
            {formatCurrency(Number(deal.dealValue || 0))}
          </span>
          <span className="text-xs text-muted-foreground">
            {days}d in stage
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-[10px] font-medium text-primary">
                {deal.aeName?.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{deal.aeName}</span>
          </div>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: vertColor + "15",
              color: vertColor,
            }}
          >
            {deal.vertical.replace("_", " ")}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TableView({ deals }: { deals: Deal[] }) {
  const [sortKey, setSortKey] = useState<string>("dealValue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      switch (sortKey) {
        case "dealValue":
          aVal = Number(a.dealValue || 0);
          bVal = Number(b.dealValue || 0);
          break;
        case "companyName":
          aVal = a.companyName || "";
          bVal = b.companyName || "";
          break;
        case "winProbability":
          aVal = a.winProbability || 0;
          bVal = b.winProbability || 0;
          break;
        case "closeDate":
          aVal = a.closeDate ? new Date(a.closeDate).getTime() : 0;
          bVal = b.closeDate ? new Date(b.closeDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [deals, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const SortHeader = ({ k, label }: { k: string; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === k && (
        <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <SortHeader k="companyName" label="Company" />
              <SortHeader k="dealValue" label="Deal Value" />
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vertical</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">AE</th>
              <SortHeader k="closeDate" label="Close Date" />
              <SortHeader k="winProbability" label="Win %" />
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Days in Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((deal) => {
              const days = deal.stageEnteredAt ? daysAgo(deal.stageEnteredAt) : 0;
              const health = getHealthColor(days, deal.stage);
              return (
                <tr key={deal.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/pipeline/${deal.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-1 rounded-full"
                        style={{ backgroundColor: getVerticalColor(deal.vertical) }}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{deal.companyName}</p>
                        <p className="text-xs text-muted-foreground">{deal.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">
                    {formatCurrency(Number(deal.dealValue || 0))}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-light text-primary">
                      {STAGE_LABELS[deal.stage as PipelineStage] ?? deal.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: getVerticalColor(deal.vertical) + "15",
                        color: getVerticalColor(deal.vertical),
                      }}
                    >
                      {deal.vertical.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{deal.aeName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {deal.closeDate
                      ? new Date(deal.closeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[60px]">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${deal.winProbability || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{deal.winProbability}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          health === "success" && "bg-success",
                          health === "warning" && "bg-warning",
                          health === "danger" && "bg-danger"
                        )}
                      />
                      <span className="text-sm text-muted-foreground">{days}d</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ForecastView({ deals, aes }: { deals: Deal[]; aes: TeamMember[] }) {
  const activeDeals = deals.filter(
    (d) => !["closed_won", "closed_lost"].includes(d.stage)
  );

  const totalPipeline = activeDeals.reduce(
    (sum, d) => sum + Number(d.dealValue || 0),
    0
  );
  const commit = activeDeals
    .filter((d) => d.forecastCategory === "commit")
    .reduce((sum, d) => sum + Number(d.dealValue || 0), 0);
  const upside = activeDeals
    .filter((d) => d.forecastCategory === "upside")
    .reduce((sum, d) => sum + Number(d.dealValue || 0), 0);
  const closedWon = deals
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + Number(d.dealValue || 0), 0);

  const verticals = ["healthcare", "financial_services", "manufacturing", "retail", "technology"];
  const verticalLabels: Record<string, string> = {
    healthcare: "Healthcare",
    financial_services: "Financial Services",
    manufacturing: "Manufacturing",
    retail: "Retail",
    technology: "Technology",
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Pipeline", value: totalPipeline, color: "text-primary" },
          { label: "Commit", value: commit, color: "text-success" },
          { label: "Upside", value: upside, color: "text-warning" },
          { label: "Closed Won", value: closedWon, color: "text-success" },
        ].map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={cn("text-2xl font-bold mt-1", card.color)}>
              {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* AE Breakdown */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Forecast by AE</h3>
        </div>
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">AE</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Pipeline</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Commit</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Upside</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Avg Win %</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Deals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {aes.map((ae) => {
              const aeDeals = activeDeals.filter((d) => d.aeId === ae.id);
              const aePipeline = aeDeals.reduce((s, d) => s + Number(d.dealValue || 0), 0);
              const aeCommit = aeDeals.filter((d) => d.forecastCategory === "commit").reduce((s, d) => s + Number(d.dealValue || 0), 0);
              const aeUpside = aeDeals.filter((d) => d.forecastCategory === "upside").reduce((s, d) => s + Number(d.dealValue || 0), 0);
              const avgWin = aeDeals.length
                ? Math.round(aeDeals.reduce((s, d) => s + (d.winProbability || 0), 0) / aeDeals.length)
                : 0;
              return (
                <tr key={ae.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {ae.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{ae.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold">{formatCurrency(aePipeline)}</td>
                  <td className="px-4 py-3 text-right text-sm text-success font-medium">{formatCurrency(aeCommit)}</td>
                  <td className="px-4 py-3 text-right text-sm text-warning font-medium">{formatCurrency(aeUpside)}</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">{avgWin}%</td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground">{aeDeals.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Vertical Breakdown */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Pipeline by Vertical</h3>
        </div>
        <div className="p-4 space-y-3">
          {verticals.map((v) => {
            const vDeals = activeDeals.filter((d) => d.vertical === v);
            const vTotal = vDeals.reduce((s, d) => s + Number(d.dealValue || 0), 0);
            const pct = totalPipeline ? Math.round((vTotal / totalPipeline) * 100) : 0;
            const color = getVerticalColor(v);
            return (
              <div key={v}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-foreground">
                      {verticalLabels[v]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{vDeals.length} deals</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(vTotal)}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

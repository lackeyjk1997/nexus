"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  X,
  ChevronDown,
  ExternalLink,
  Building2,
  User,
  Star,
  Clock,
} from "lucide-react";
import { cn, formatCurrency, getVerticalColor } from "@/lib/utils";
import { STAGE_LABELS, type PipelineStage } from "@nexus/shared";
import { ObservationInput } from "@/components/observation-input";
import Link from "next/link";

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  roleInDeal: string | null;
  isPrimary: boolean | null;
  companyId: string;
  companyName: string | null;
  companyIndustry: string | null;
  createdAt: Date;
};

type Deal = {
  id: string;
  name: string;
  companyId: string;
  stage: string;
  dealValue: string | null;
};

type Activity = {
  id: string;
  type: string;
  subject: string | null;
  contactId: string | null;
  dealId: string | null;
  createdAt: Date;
  teamMemberName: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  champion: "bg-emerald-50 text-emerald-700",
  economic_buyer: "bg-violet-50 text-violet-700",
  technical_evaluator: "bg-blue-50 text-blue-700",
  end_user: "bg-cyan-50 text-cyan-700",
  blocker: "bg-red-50 text-red-700",
  coach: "bg-amber-50 text-amber-700",
};

const ROLE_LABELS: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Econ. Buyer",
  technical_evaluator: "Tech Eval",
  end_user: "End User",
  blocker: "Blocker",
  coach: "Coach",
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ProspectsClient({
  contacts,
  deals,
  activities,
}: {
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
}) {
  const [search, setSearch] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build enriched contacts with deal + activity info
  const enriched = useMemo(() => {
    return contacts.map((c) => {
      const companyDeals = deals.filter((d) => d.companyId === c.companyId);
      const contactActivities = activities.filter(
        (a) => a.contactId === c.id || companyDeals.some((d) => d.id === a.dealId)
      );
      const lastActivity = contactActivities[0];
      const daysSinceContact = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Simple score based on role + activity recency
      let score = 30;
      if (c.roleInDeal === "champion") score = 85;
      else if (c.roleInDeal === "economic_buyer") score = 75;
      else if (c.roleInDeal === "technical_evaluator") score = 60;
      else if (c.isPrimary) score = 70;
      if (daysSinceContact < 3) score = Math.min(score + 15, 95);
      if (daysSinceContact > 14) score = Math.max(score - 20, 10);

      return {
        ...c,
        deals: companyDeals,
        activities: contactActivities,
        lastActivity,
        daysSinceContact,
        score,
      };
    });
  }, [contacts, deals, activities]);

  const filtered = useMemo(() => {
    return enriched.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !`${c.firstName} ${c.lastName}`.toLowerCase().includes(q) &&
          !(c.companyName || "").toLowerCase().includes(q) &&
          !(c.title || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (verticalFilter !== "all" && c.companyIndustry !== verticalFilter) return false;
      if (roleFilter !== "all" && c.roleInDeal !== roleFilter) return false;
      return true;
    });
  }, [enriched, search, verticalFilter, roleFilter]);

  const selected = selectedId ? enriched.find((c) => c.id === selectedId) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Prospects</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} contacts across {new Set(filtered.map((c) => c.companyId)).size} companies
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or title..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
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
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: "all", label: "All Roles" },
            { value: "champion", label: "Champion" },
            { value: "economic_buyer", label: "Economic Buyer" },
            { value: "technical_evaluator", label: "Technical Evaluator" },
            { value: "end_user", label: "End User" },
          ]}
        />
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className={cn("bg-card rounded-xl border border-border overflow-hidden transition-all", selected ? "flex-1" : "w-full")}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Last Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Deal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => {
                  const deal = c.deals[0];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer",
                        selectedId === c.id && "bg-primary-light/30"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-primary">
                              {c.firstName[0]}{c.lastName[0]}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {c.firstName} {c.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getVerticalColor(c.companyIndustry || "general") }} />
                          <span className="text-sm text-foreground">{c.companyName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{c.title || "—"}</td>
                      <td className="px-4 py-3">
                        {c.roleInDeal ? (
                          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", ROLE_COLORS[c.roleInDeal])}>
                            {ROLE_LABELS[c.roleInDeal] || c.roleInDeal}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "text-xs font-bold",
                          c.score >= 70 ? "text-success" : c.score >= 40 ? "text-warning" : "text-muted-foreground"
                        )}>
                          {c.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {c.daysSinceContact > 14 && <Clock className="h-3 w-3 text-warning" />}
                          <span className={cn(
                            "text-xs",
                            c.daysSinceContact > 14 ? "text-warning" : "text-muted-foreground"
                          )}>
                            {c.lastActivity ? timeAgo(c.lastActivity.createdAt) : "No activity"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {deal ? (
                          <Link
                            href={`/pipeline/${deal.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:underline"
                          >
                            {formatCurrency(Number(deal.dealValue || 0))} {STAGE_LABELS[deal.stage as PipelineStage] || deal.stage}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Drawer */}
        {selected && (
          <div className="w-96 bg-card rounded-xl border border-border overflow-hidden shrink-0 animate-slideUp">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {selected.firstName} {selected.lastName}
              </h3>
              <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Contact Info */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{selected.title}</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{selected.companyName}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: getVerticalColor(selected.companyIndustry || "general") + "15", color: getVerticalColor(selected.companyIndustry || "general") }}>
                    {(selected.companyIndustry || "").replace("_", " ")}
                  </span>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {selected.email}
                  </div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {selected.phone}
                  </div>
                )}
              </div>

              {/* Score + Role */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={cn("text-lg font-bold", selected.score >= 70 ? "text-success" : selected.score >= 40 ? "text-warning" : "text-muted-foreground")}>
                    {selected.score}
                  </span>
                  <span className="text-xs text-muted-foreground">score</span>
                </div>
                {selected.roleInDeal && (
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", ROLE_COLORS[selected.roleInDeal])}>
                    {ROLE_LABELS[selected.roleInDeal]}
                  </span>
                )}
                {selected.isPrimary && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-light text-primary">Primary</span>
                )}
              </div>

              {/* Associated Deals */}
              {selected.deals.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deals</h4>
                  {selected.deals.map((d) => (
                    <Link
                      key={d.id}
                      href={`/pipeline/${d.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {STAGE_LABELS[d.stage as PipelineStage] || d.stage}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {formatCurrency(Number(d.dealValue || 0))}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Recent Activity */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity</h4>
                <div className="space-y-2">
                  {selected.activities.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-xs">
                      <ActivityIcon type={a.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{a.subject || a.type.replace("_", " ")}</p>
                        <p className="text-muted-foreground">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {selected.activities.length === 0 && (
                    <p className="text-xs text-muted-foreground">No activities recorded</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ObservationInput context={{ page: "prospects", trigger: "manual" }} />
    </div>
  );
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    email_sent: Mail,
    email_received: Mail,
    call_completed: Phone,
    meeting_scheduled: Calendar,
    meeting_completed: Calendar,
    note_added: MessageSquare,
  };
  const Icon = icons[type] || MessageSquare;
  return <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Mail,
  MessageSquare,
  Clock,
  Globe,
  Building2,
  Users,
  MapPin,
  Cpu,
  FileText,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Bot,
  ChevronRight,
  Phone,
  Star,
  AlertTriangle,
  Trophy,
  Banknote,
  Target,
  Swords,
  Search,
  UserCheck,
} from "lucide-react";
import { cn, formatCurrency, daysAgo, getHealthColor, getVerticalColor } from "@/lib/utils";
import { STAGE_LABELS, PRODUCT_LABELS, type PipelineStage } from "@nexus/shared";
import { ActivityFeed, type ActivityItem } from "@/components/activity-feed";
import { StageChangeModal } from "@/components/stage-change-modal";
import { ObservationInput } from "@/components/observation-input";

// ── Types ──

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
  companyId: string;
  companyName: string | null;
  companyDomain: string | null;
  companyIndustry: string | null;
  companyEmployeeCount: number | null;
  companyRevenue: string | null;
  companyHq: string | null;
  companyTechStack: string[] | null;
  companyDescription: string | null;
  aeName: string | null;
  aeId: string | null;
};

type Meddpicc = {
  id: string;
  metrics: string | null;
  metricsConfidence: number | null;
  economicBuyer: string | null;
  economicBuyerConfidence: number | null;
  decisionCriteria: string | null;
  decisionCriteriaConfidence: number | null;
  decisionProcess: string | null;
  decisionProcessConfidence: number | null;
  identifyPain: string | null;
  identifyPainConfidence: number | null;
  champion: string | null;
  championConfidence: number | null;
  competition: string | null;
  competitionConfidence: number | null;
  aiExtracted: boolean | null;
  aeConfirmed: boolean | null;
} | null;

type Milestone = {
  id: string;
  milestoneKey: string;
  isCompleted: boolean | null;
  completedAt: Date | null;
  source: string | null;
  evidence: string | null;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  roleInDeal: string | null;
  isPrimary: boolean | null;
};

type Transcript = {
  id: string;
  title: string;
  date: Date;
  durationSeconds: number | null;
  participants: unknown;
  status: string | null;
  analysisSummary: string | null;
  callQualityScore: number | null;
  painPoints: unknown;
  nextSteps: unknown;
  talkRatio: unknown;
  coachingInsights: unknown;
};

type StageHistoryItem = {
  id: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string;
  reason: string | null;
  createdAt: Date;
};

type TabKey = "overview" | "meddpicc" | "stakeholders" | "activity" | "calls";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "meddpicc", label: "MEDDPICC" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "activity", label: "Activity" },
  { key: "calls", label: "Calls" },
];

const STAGES_ORDER: PipelineStage[] = [
  "new_lead", "qualified", "discovery", "technical_validation",
  "proposal", "negotiation", "closing", "closed_won", "closed_lost",
];

// ── Main Component ──

type DealObservation = {
  id: string;
  rawInput: string;
  status: string | null;
  aiClassification: unknown;
  arrImpact: unknown;
  clusterId: string | null;
  createdAt: Date;
  observerName: string | null;
};

export function DealDetailClient({
  deal,
  meddpicc,
  milestones,
  contacts,
  activities,
  transcripts,
  stageHistory,
  dealObservations = [],
}: {
  deal: Deal;
  meddpicc: Meddpicc;
  milestones: Milestone[];
  contacts: Contact[];
  activities: ActivityItem[];
  transcripts: Transcript[];
  stageHistory: StageHistoryItem[];
  dealObservations?: DealObservation[];
}) {
  // Merge observations into the activity list
  const observationActivities: ActivityItem[] = dealObservations.map((obs) => {
    const classification = obs.aiClassification as { signals?: Array<{ type: string }> } | null;
    const signalType = classification?.signals?.[0]?.type || "field_intelligence";
    const arrData = obs.arrImpact as { total_value?: number } | null;
    const arrText = arrData?.total_value ? ` — €${(arrData.total_value / 1000).toFixed(0)}K at risk` : "";

    return {
      id: `obs-${obs.id}`,
      type: "observation" as string,
      subject: `Field Intel: ${obs.rawInput.slice(0, 80)}${obs.rawInput.length > 80 ? "…" : ""}`,
      description: `Signal: ${signalType.replace(/_/g, " ")}${arrText}`,
      createdAt: obs.createdAt,
      teamMemberName: obs.observerName,
    };
  });

  const mergedActivities = [...activities, ...observationActivities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [stageModalOpen, setStageModalOpen] = useState(false);

  const daysInStage = deal.stageEnteredAt ? daysAgo(deal.stageEnteredAt) : 0;
  const health = getHealthColor(daysInStage, deal.stage);
  const vertColor = getVerticalColor(deal.vertical);
  const winProb = deal.winProbability ?? 0;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Back button */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pipeline
      </Link>

      {/* Header Card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-semibold text-foreground">
                {deal.companyName}
              </h1>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: vertColor + "15",
                  color: vertColor,
                }}
              >
                {deal.vertical.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{deal.name}</p>

            <div className="flex items-center gap-6 mt-4 flex-wrap">
              {/* Deal Value */}
              <div>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(Number(deal.dealValue || 0), deal.currency || "EUR")}
                </p>
              </div>

              {/* Stage Badge — clickable */}
              <button
                onClick={() => setStageModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-primary-light text-primary text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {STAGE_LABELS[deal.stage as PipelineStage] ?? deal.stage}
              </button>

              {/* Win Probability */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: winProb >= 70 ? "#2D8A4E" : winProb >= 40 ? "#D4A843" : "#C74B3B",
                    color: winProb >= 70 ? "#2D8A4E" : winProb >= 40 ? "#D4A843" : "#C74B3B",
                  }}
                >
                  <span className="text-xs font-bold">{winProb}</span>
                </div>
                <span className="text-xs text-muted-foreground">Win %</span>
              </div>

              {/* Health */}
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    health === "success" && "bg-success",
                    health === "warning" && "bg-warning",
                    health === "danger" && "bg-danger"
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {daysInStage}d in stage
                </span>
              </div>

              {/* AE */}
              {deal.aeName && (
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-primary">
                      {deal.aeName.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{deal.aeName}</span>
                </div>
              )}

              {/* Close Date */}
              {deal.closeDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Close{" "}
                    {new Date(deal.closeDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {[
              { icon: Calendar, label: "Schedule Meeting" },
              { icon: Mail, label: "Draft Email" },
              { icon: MessageSquare, label: "Add Note" },
            ].map((action) => (
              <button
                key={action.label}
                title={action.label}
                className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
              >
                <action.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div className="mt-6 flex items-center gap-1">
          {STAGES_ORDER.filter((s) => s !== "closed_lost").map((stage) => {
            const currentIdx = STAGES_ORDER.indexOf(deal.stage as PipelineStage);
            const stageIdx = STAGES_ORDER.indexOf(stage);
            const isActive = stageIdx <= currentIdx;
            const isCurrent = stage === deal.stage;
            return (
              <div key={stage} className="flex-1 relative group">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    isCurrent
                      ? "bg-primary"
                      : isActive
                        ? "bg-primary/40"
                        : "bg-border"
                  )}
                />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.key === "activity" && activities.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
              {tab.key === "calls" && transcripts.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {transcripts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab deal={deal} milestones={milestones} />
      )}
      {activeTab === "meddpicc" && <MeddpiccTab meddpicc={meddpicc} />}
      {activeTab === "stakeholders" && <StakeholdersTab contacts={contacts} />}
      {activeTab === "activity" && (
        <div className="bg-card rounded-xl border border-border p-5">
          <ActivityFeed activities={mergedActivities} showFilters maxItems={50} />
        </div>
      )}
      {activeTab === "calls" && <CallsTab transcripts={transcripts} />}

      {/* Stage Change Modal */}
      <StageChangeModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        dealId={deal.id}
        companyName={deal.companyName || ""}
        currentStage={deal.stage as PipelineStage}
      />

      {/* Observation Input */}
      <ObservationInput
        context={{
          page: "deal_detail",
          dealId: deal.id,
          accountId: deal.companyId,
          trigger: "manual",
        }}
      />
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ deal, milestones }: { deal: Deal; milestones: Milestone[] }) {
  const MILESTONE_LABELS: Record<string, string> = {
    initial_meeting: "Initial Meeting",
    pain_identified: "Pain Identified",
    champion_identified: "Champion Identified",
    technical_demo: "Technical Demo",
    security_review: "Security Review",
    proposal_sent: "Proposal Sent",
    contract_negotiation: "Contract Negotiation",
  };

  const SOURCE_COLORS: Record<string, string> = {
    manual: "bg-muted text-muted-foreground",
    transcript: "bg-violet-50 text-violet-600",
    email: "bg-blue-50 text-blue-600",
    ai_detected: "bg-primary-light text-primary",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Company Details */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Company Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Globe} label="Domain" value={deal.companyDomain} />
            <InfoRow icon={Building2} label="Industry" value={deal.companyIndustry?.replace("_", " ")} />
            <InfoRow icon={Users} label="Employees" value={deal.companyEmployeeCount?.toLocaleString()} />
            <InfoRow icon={Banknote} label="Revenue" value={deal.companyRevenue} />
            <InfoRow icon={MapPin} label="HQ" value={deal.companyHq} />
          </div>
          {deal.companyTechStack && deal.companyTechStack.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Tech Stack</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deal.companyTechStack.map((tech) => (
                  <span key={tech} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
          {deal.companyDescription && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {deal.companyDescription}
            </p>
          )}
        </div>

        {/* Deal Details */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Deal Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow
              icon={Target}
              label="Product"
              value={deal.product ? PRODUCT_LABELS[deal.product as keyof typeof PRODUCT_LABELS] : null}
            />
            <InfoRow icon={Search} label="Lead Source" value={deal.leadSource?.replace("_", " ")} />
            <InfoRow icon={Swords} label="Competitor" value={deal.competitor || "None identified"} />
            <InfoRow icon={Target} label="Forecast" value={deal.forecastCategory} />
            <InfoRow icon={Banknote} label="Currency" value={deal.currency} />
            <InfoRow
              icon={Calendar}
              label="Created"
              value={new Date(deal.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          Deal Milestones
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {milestones.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                m.isCompleted ? "bg-emerald-50/50" : "bg-muted/30"
              )}
            >
              {m.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-border shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium",
                    m.isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {MILESTONE_LABELS[m.milestoneKey] || m.milestoneKey}
                </span>
                {m.evidence && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {m.evidence}
                  </p>
                )}
              </div>
              {m.completedAt && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(m.completedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
              {m.source && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                    SOURCE_COLORS[m.source] || "bg-muted text-muted-foreground"
                  )}
                >
                  {m.source.replace("_", " ")}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium text-foreground capitalize">
        {value || "—"}
      </p>
    </div>
  );
}

// ── MEDDPICC Tab ──

const MEDDPICC_FIELDS = [
  { key: "metrics", confKey: "metricsConfidence", label: "Metrics", icon: Target, description: "Quantifiable measures of the customer's desired business outcome" },
  { key: "economicBuyer", confKey: "economicBuyerConfidence", label: "Economic Buyer", icon: UserCheck, description: "The person with the authority to approve spending" },
  { key: "decisionCriteria", confKey: "decisionCriteriaConfidence", label: "Decision Criteria", icon: FileText, description: "The formal criteria used to evaluate and compare solutions" },
  { key: "decisionProcess", confKey: "decisionProcessConfidence", label: "Decision Process", icon: ArrowLeft, description: "The process the organization uses to make a buying decision" },
  { key: "identifyPain", confKey: "identifyPainConfidence", label: "Identify Pain", icon: AlertTriangle, description: "The primary business pain driving the evaluation" },
  { key: "champion", confKey: "championConfidence", label: "Champion", icon: Star, description: "Internal advocate who sells on your behalf" },
  { key: "competition", confKey: "competitionConfidence", label: "Competition", icon: Swords, description: "Competitive landscape and positioning" },
] as const;

function MeddpiccTab({ meddpicc }: { meddpicc: Meddpicc }) {
  if (!meddpicc) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No MEDDPICC data for this deal yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          MEDDPICC fields will be populated as the deal progresses through discovery.
        </p>
      </div>
    );
  }

  const filledCount = MEDDPICC_FIELDS.filter(
    (f) => meddpicc[f.key as keyof typeof meddpicc]
  ).length;
  const avgConfidence = Math.round(
    MEDDPICC_FIELDS.reduce(
      (sum, f) => sum + Number(meddpicc[f.confKey as keyof typeof meddpicc] || 0),
      0
    ) / MEDDPICC_FIELDS.length
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Fields Completed</p>
            <p className="text-lg font-bold text-foreground">{filledCount}/7</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
            <p className="text-lg font-bold text-foreground">{avgConfidence}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                meddpicc.aeConfirmed
                  ? "bg-emerald-50 text-success"
                  : "bg-primary-light text-primary"
              )}
            >
              {meddpicc.aeConfirmed ? (
                <>
                  <ShieldCheck className="h-3 w-3" /> AE Confirmed
                </>
              ) : (
                <>
                  <Bot className="h-3 w-3" /> AI Extracted
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {MEDDPICC_FIELDS.map((field) => {
          const value = meddpicc[field.key as keyof typeof meddpicc] as string | null;
          const confidence = Number(meddpicc[field.confKey as keyof typeof meddpicc] || 0);
          const Icon = field.icon;
          const isLow = confidence > 0 && confidence < 50;

          return (
            <div
              key={field.key}
              className={cn(
                "bg-card rounded-xl border p-4",
                isLow ? "border-warning/40 bg-amber-50/20" : "border-border"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-foreground">
                    {field.label}
                  </h4>
                  {isLow && (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {confidence}%
                  </span>
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        confidence >= 70
                          ? "bg-success"
                          : confidence >= 40
                            ? "bg-warning"
                            : "bg-danger"
                      )}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                </div>
              </div>
              {value ? (
                <p className="text-sm text-foreground leading-relaxed">{value}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Not yet captured — {field.description.toLowerCase()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stakeholders Tab ──

const ROLE_COLORS: Record<string, string> = {
  champion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  economic_buyer: "bg-violet-50 text-violet-700 border-violet-200",
  technical_evaluator: "bg-blue-50 text-blue-700 border-blue-200",
  end_user: "bg-cyan-50 text-cyan-700 border-cyan-200",
  blocker: "bg-red-50 text-red-700 border-red-200",
  coach: "bg-amber-50 text-amber-700 border-amber-200",
};

const ROLE_LABELS: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic Buyer",
  technical_evaluator: "Technical Evaluator",
  end_user: "End User",
  blocker: "Blocker",
  coach: "Coach",
};

function StakeholdersTab({ contacts }: { contacts: Contact[] }) {
  const grouped: Record<string, Contact[]> = {};
  contacts.forEach((c) => {
    const role = c.roleInDeal || "unknown";
    if (!grouped[role]) grouped[role] = [];
    grouped[role]!.push(c);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={cn(
              "bg-card rounded-xl border p-4",
              contact.isPrimary ? "border-primary/40 ring-1 ring-primary/10" : "border-border"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {contact.firstName[0]}{contact.lastName[0]}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {contact.firstName} {contact.lastName}
                    </p>
                    {contact.isPrimary && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary-light text-primary">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{contact.title}</p>
                </div>
              </div>
              {contact.roleInDeal && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    ROLE_COLORS[contact.roleInDeal] || "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {ROLE_LABELS[contact.roleInDeal] || contact.roleInDeal}
                </span>
              )}
            </div>
            <div className="mt-3 space-y-1">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{contact.email}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{contact.phone}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Calls Tab ──

function CallsTab({ transcripts }: { transcripts: Transcript[] }) {
  if (transcripts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No call transcripts for this deal yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transcripts.map((t) => {
        const duration = t.durationSeconds
          ? `${Math.floor(t.durationSeconds / 60)}m ${t.durationSeconds % 60}s`
          : "—";
        const participants = (t.participants as { name: string; role: string }[]) || [];
        const painPoints = (t.painPoints as string[]) || [];
        const nextSteps = (t.nextSteps as string[]) || [];
        const talkRatio = t.talkRatio as { ae?: number; prospect?: number } | null;
        const coaching = (t.coachingInsights as string[]) || [];

        return (
          <div key={t.id} className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Call Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {duration}
                    </span>
                    <div className="flex items-center gap-1">
                      {participants.map((p, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.callQualityScore != null && (
                    <div
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-sm font-bold",
                        t.callQualityScore >= 80
                          ? "bg-emerald-50 text-success"
                          : t.callQualityScore >= 60
                            ? "bg-amber-50 text-warning"
                            : "bg-red-50 text-danger"
                      )}
                    >
                      {t.callQualityScore}
                    </div>
                  )}
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      t.status === "complete"
                        ? "bg-emerald-50 text-success"
                        : "bg-amber-50 text-warning"
                    )}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Analysis */}
            {t.analysisSummary && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-foreground leading-relaxed">
                  {t.analysisSummary}
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {/* Talk Ratio */}
                  {talkRatio && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Talk Ratio</p>
                      <div className="flex h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary"
                          style={{ width: `${talkRatio.ae || 50}%` }}
                        />
                        <div
                          className="bg-warning"
                          style={{ width: `${talkRatio.prospect || 50}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-primary">AE {talkRatio.ae}%</span>
                        <span className="text-[10px] text-warning">Prospect {talkRatio.prospect}%</span>
                      </div>
                    </div>
                  )}

                  {/* Pain Points */}
                  {painPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Pain Points</p>
                      <ul className="space-y-1">
                        {painPoints.slice(0, 3).map((p, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1">
                            <span className="text-danger mt-0.5">·</span>
                            <span className="line-clamp-2">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Next Steps */}
                  {nextSteps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Next Steps</p>
                      <ul className="space-y-1">
                        {nextSteps.slice(0, 3).map((s, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-1">
                            <ChevronRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Coaching Insights */}
                {coaching.length > 0 && (
                  <div className="bg-primary-light/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      Coaching Insights
                    </p>
                    <ul className="space-y-1">
                      {coaching.map((c, i) => (
                        <li key={i} className="text-xs text-foreground">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

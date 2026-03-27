"use client";

import { useState } from "react";
import {
  Bot,
  Send,
  Shield,
  Zap,
  MessageSquare,
  History,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Clock,
  TrendingUp,
  AlertTriangle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

type AgentConfig = {
  id: string;
  agentName: string;
  roleType: string;
  instructions: string;
  outputPreferences: unknown;
  version: number | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

type Version = {
  id: string;
  version: number;
  instructions: string;
  outputPreferences: unknown;
  changedBy: string;
  changeReason: string | null;
  createdAt: Date;
};

type FeedbackEntry = {
  id: string;
  description: string;
  requestType: string;
  status: string | null;
  priority: string | null;
  createdAt: Date;
};

type OutputPrefs = {
  industryFocus?: string[];
  communicationStyle?: string;
  guardrails?: string[];
  toolsEnabled?: string[];
  dealStageRules?: Record<string, string>;
  verbosity?: string;
  temperature?: number;
  format?: string;
  includeMetrics?: boolean;
};

type TabKey = "configure" | "timeline" | "feedback";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "configure", label: "Configure", icon: MessageSquare },
  { key: "timeline", label: "Evolution", icon: History },
  { key: "feedback", label: "Feedback", icon: BarChart3 },
];

const TOOL_LABELS: Record<string, string> = {
  email_drafting: "Email Drafting",
  call_prep: "Call Prep",
  objection_handling: "Objection Handling",
  deal_scoring: "Deal Scoring",
  research: "Research",
};

export function AgentConfigClient({
  config,
  versions,
  feedback,
  userName,
}: {
  config: AgentConfig;
  versions: Version[];
  feedback: FeedbackEntry[];
  userName: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("configure");
  const prefs = (config.outputPreferences as OutputPrefs) || {};

  return (
    <div className="max-w-6xl space-y-6">
      {/* Agent Identity Header */}
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {config.agentName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {userName}&apos;s personal AI sales agent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-success" />
            Active
          </span>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary-light text-primary">
            v{config.version}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === "feedback" && (
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                {feedback.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "configure" && (
        <ConfigureTab config={config} prefs={prefs} />
      )}
      {activeTab === "timeline" && (
        <TimelineTab versions={versions} />
      )}
      {activeTab === "feedback" && (
        <FeedbackTab feedback={feedback} />
      )}
    </div>
  );
}

// ── Configure Tab ──

function ConfigureTab({
  config,
  prefs,
}: {
  config: AgentConfig;
  prefs: OutputPrefs;
}) {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    summary: string;
    fullConfig: Record<string, unknown>;
  } | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const router = useRouter();

  async function handleSend() {
    if (!input.trim() || sending) return;
    const instruction = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: instruction }]);
    setSending(true);

    try {
      const res = await fetch("/api/agent/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          currentConfig: {
            instructions: config.instructions,
            outputPreferences: config.outputPreferences,
          },
          configId: config.id,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else if (data.clarification) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.clarification },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `I'll update: **${data.changeSummary}**`,
          },
        ]);
        setPendingChange({
          summary: data.changeSummary,
          fullConfig: data.fullConfig,
        });
        setHighlightedFields(
          Object.keys(data.updatedFields || {})
        );
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Failed to process instruction. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function confirmChange() {
    if (!pendingChange) return;
    const fc = pendingChange.fullConfig;
    try {
      await fetch("/api/agent/configure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configId: config.id,
          instructions: fc.instructions || config.instructions,
          outputPreferences: fc.outputPreferences || config.outputPreferences,
          changeSummary: pendingChange.summary,
          changedBy: "user",
        }),
      });
      setPendingChange(null);
      setMessages((m) => [...m, { role: "assistant", content: "Configuration updated successfully." }]);
      setTimeout(() => {
        setHighlightedFields([]);
        router.refresh();
      }, 2000);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Failed to save. Please try again." },
      ]);
    }
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Chat — left 3 cols */}
      <div className="col-span-3 bg-card rounded-xl border border-border flex flex-col h-[500px]">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Configure Your Agent
          </h3>
          <p className="text-xs text-muted-foreground">
            Describe changes in natural language
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Try: &ldquo;Focus on healthcare deals&rdquo; or &ldquo;Never mention competitor pricing&rdquo;
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-2xl bg-muted rounded-bl-md">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Pending change confirmation */}
          {pendingChange && (
            <div className="bg-primary-light border border-primary/20 rounded-xl p-4 animate-slideUp">
              <p className="text-sm font-medium text-foreground mb-3">
                Apply this change?
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {pendingChange.summary}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmChange}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Check className="h-3 w-3" /> Confirm
                </button>
                <button
                  onClick={() => setPendingChange(null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" /> Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Tell your agent what to change..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile Card — right 2 cols */}
      <div className="col-span-2 space-y-4">
        {/* Persona */}
        <ProfileSection
          title="Persona"
          icon={Bot}
          highlighted={highlightedFields.includes("instructions")}
        >
          <p className="text-sm text-foreground leading-relaxed">
            {config.instructions}
          </p>
        </ProfileSection>

        {/* Industry Focus */}
        {prefs.industryFocus && prefs.industryFocus.length > 0 && (
          <ProfileSection
            title="Industry Focus"
            icon={Zap}
            highlighted={highlightedFields.includes("outputPreferences")}
          >
            <div className="flex flex-wrap gap-1.5">
              {prefs.industryFocus.map((ind) => (
                <span
                  key={ind}
                  className="text-xs px-2.5 py-1 rounded-full bg-primary-light text-primary font-medium"
                >
                  {ind}
                </span>
              ))}
            </div>
          </ProfileSection>
        )}

        {/* Guardrails */}
        {prefs.guardrails && prefs.guardrails.length > 0 && (
          <ProfileSection title="Guardrails" icon={Shield} highlighted={highlightedFields.includes("outputPreferences")}>
            <div className="space-y-1.5">
              {prefs.guardrails.map((g, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-foreground p-2 rounded-lg bg-red-50/50 border border-red-100"
                >
                  <Shield className="h-3 w-3 text-danger shrink-0 mt-0.5" />
                  {g}
                </div>
              ))}
            </div>
          </ProfileSection>
        )}

        {/* Tools */}
        {prefs.toolsEnabled && (
          <ProfileSection title="Enabled Tools" icon={Zap} highlighted={false}>
            <div className="flex flex-wrap gap-1.5">
              {prefs.toolsEnabled.map((tool) => (
                <span
                  key={tool}
                  className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {TOOL_LABELS[tool] || tool}
                </span>
              ))}
            </div>
          </ProfileSection>
        )}

        {/* Deal Stage Rules */}
        {prefs.dealStageRules && (
          <DealStageRulesSection rules={prefs.dealStageRules} />
        )}
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  icon: Icon,
  highlighted,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  highlighted: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border p-4 transition-all duration-500",
        highlighted
          ? "border-primary ring-2 ring-primary/10"
          : "border-border"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function DealStageRulesSection({ rules }: { rules: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(rules);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
          Deal Stage Rules
        </h4>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {entries.map(([stage, rule]) => (
            <div key={stage} className="text-xs">
              <span className="font-medium text-primary capitalize">
                {stage.replace("_", " ")}
              </span>
              <p className="text-muted-foreground mt-0.5">{rule}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Timeline Tab ──

const SOURCE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  user: { bg: "bg-blue-50", text: "text-blue-700", label: "Manual" },
  feedback_loop: { bg: "bg-violet-50", text: "text-violet-700", label: "Feedback Loop" },
  ai: { bg: "bg-primary-light", text: "text-primary", label: "AI" },
  system: { bg: "bg-muted", text: "text-muted-foreground", label: "System" },
};

function TimelineTab({ versions }: { versions: Version[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Agent Evolution Timeline
      </h3>
      <div className="relative">
        <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />
        <div className="space-y-4">
          {versions.map((v) => {
            const badge = SOURCE_BADGES[v.changedBy] || SOURCE_BADGES.system!;
            return (
              <div key={v.id} className="relative flex items-start gap-4 pl-1">
                <div className="relative z-10 h-[38px] w-[38px] rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    v{v.version}
                  </span>
                </div>
                <div className="flex-1 bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          badge.bg,
                          badge.text
                        )}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(v.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">
                    {v.changeReason || "Configuration updated"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Feedback Tab ──

function FeedbackTab({ feedback }: { feedback: FeedbackEntry[] }) {
  // Compute stats
  const total = feedback.length;
  const recentPositive = feedback.filter(
    (f) => f.priority === "low"
  ).length;
  const recentNegative = feedback.filter(
    (f) => f.priority === "high"
  ).length;

  // Simple rating distribution based on priority
  const ratingDist = {
    positive: feedback.filter((f) => f.priority === "low").length,
    mixed: feedback.filter((f) => f.priority === "medium").length,
    negative: feedback.filter((f) => f.priority === "high" || f.priority === "urgent").length,
  };
  const maxDist = Math.max(ratingDist.positive, ratingDist.mixed, ratingDist.negative, 1);

  // Trend: compare first half vs second half
  const half = Math.ceil(feedback.length / 2);
  const firstHalfNeg = feedback.slice(half).filter((f) => f.priority === "high").length;
  const secondHalfNeg = feedback.slice(0, half).filter((f) => f.priority === "high").length;
  const improving = secondHalfNeg <= firstHalfNeg;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Feedback"
          value={total.toString()}
          icon={MessageSquare}
        />
        <StatCard
          label="Positive"
          value={recentPositive.toString()}
          icon={Star}
          color="text-success"
        />
        <StatCard
          label="Needs Work"
          value={recentNegative.toString()}
          icon={AlertTriangle}
          color="text-secondary"
        />
        <StatCard
          label="Trend"
          value={improving ? "Improving" : "Declining"}
          icon={TrendingUp}
          color={improving ? "text-success" : "text-danger"}
        />
      </div>

      {/* Rating Distribution */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4">
          Feedback Distribution
        </h4>
        <div className="space-y-3">
          {[
            { label: "Positive", count: ratingDist.positive, color: "bg-success" },
            { label: "Mixed", count: ratingDist.mixed, color: "bg-warning" },
            { label: "Negative", count: ratingDist.negative, color: "bg-danger" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16">
                {item.label}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", item.color)}
                  style={{ width: `${(item.count / maxDist) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground w-6 text-right">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Feedback List */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground">
            Recent Feedback
          </h4>
        </div>
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {feedback.slice(0, 10).map((fb) => (
            <div key={fb.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    fb.priority === "high" || fb.priority === "urgent"
                      ? "bg-red-50 text-red-700"
                      : fb.priority === "medium"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                  )}
                >
                  {fb.priority}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full",
                    fb.status === "auto_applied"
                      ? "bg-violet-50 text-violet-700"
                      : fb.status === "approved"
                        ? "bg-primary-light text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {fb.status?.replace("_", " ")}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(fb.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">
                {fb.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-xl font-bold", color || "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

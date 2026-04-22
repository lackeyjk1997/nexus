"use client";

import { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Mail,
  FileText,
  AlertTriangle,
  Sparkles,
  Link2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  receivedAt: string;
  priority: string | null;
  status: string | null;
  aiCategory: string | null;
  responseKit: unknown;
  companyId: string;
  contact: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    email: string | null;
  };
};

type Account = {
  company: {
    id: string;
    name: string;
    industry: string;
  };
  health: {
    arr: string | null;
    healthScore: number | null;
  };
};

// Kit can come from seed data (simpler format) or Claude API (structured format)
// We handle both gracefully
type ResponseKit = {
  message_analysis: {
    category: string;
    urgency: string;
    sentiment: string;
    key_issues?: string[];
    underlying_concern: string;
  };
  similar_resolutions: Array<{
    account_name?: string;
    company?: string;
    situation: string;
    resolution?: string;
    outcome?: string;
    relevance?: string;
  }>;
  recommended_resources: Array<{
    title: string;
    relevance?: string;
    reason?: string;
    key_section?: string;
  }>;
  // Can be a string (seed data) or structured object (Claude API)
  draft_reply: string | {
    subject: string;
    body: string;
    tone_notes: string;
  };
  // Can be a string (seed data) or structured object (Claude API)
  internal_notes: string | {
    risk_assessment: string;
    recommended_follow_up: string;
    escalation_needed: boolean;
    escalation_reason?: string;
  };
};

const LOADING_STEPS = [
  "Analyzing customer message...",
  "Searching knowledge base...",
  "Finding similar situations...",
  "Drafting response...",
];

const URGENCY_BARS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "1 week ago";
  return `${diffWeeks} weeks ago`;
}

export function ResponseKitModal({
  message,
  account,
  onClose,
  onMarkResponded,
}: {
  message: Message;
  account: Account;
  onClose: () => void;
  onMarkResponded: (messageId: string) => void;
}) {
  const [kit, setKit] = useState<ResponseKit | null>(
    message.status === "kit_ready" && message.responseKit
      ? (message.responseKit as ResponseKit)
      : null
  );
  const [loading, setLoading] = useState(!kit);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [markingResponded, setMarkingResponded] = useState(false);

  // Generate kit if not already ready
  useEffect(() => {
    if (kit) return;

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1200);

    fetch("/api/customer/response-kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: message.id }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to generate response kit");
        return r.json();
      })
      .then((d) => {
        if (d.success && d.responseKit) {
          setKit(d.responseKit as ResponseKit);
        } else {
          throw new Error(d.error || "Failed to generate response kit");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        clearInterval(stepInterval);
        setLoading(false);
      });

    return () => clearInterval(stepInterval);
  }, [kit, message.id]);

  const getDraftBody = () => {
    if (!kit) return "";
    if (typeof kit.draft_reply === "string") return kit.draft_reply;
    return kit.draft_reply.body;
  };

  const getDraftSubject = () => {
    if (!kit) return "";
    if (typeof kit.draft_reply === "string") return `Re: ${message.subject}`;
    return kit.draft_reply.subject;
  };

  const getDraftTone = () => {
    if (!kit) return "";
    if (typeof kit.draft_reply === "string") return "";
    return kit.draft_reply.tone_notes;
  };

  const handleCopyDraft = async () => {
    if (!kit) return;
    await navigator.clipboard.writeText(getDraftBody());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkResponded = async () => {
    setMarkingResponded(true);
    try {
      await fetch("/api/customer/response-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          markResponded: true,
        }),
      });
      onMarkResponded(message.id);
    } catch {
      setMarkingResponded(false);
    }
  };

  const urgencyLevel = kit
    ? URGENCY_BARS[kit.message_analysis.urgency] ?? 1
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-border mx-4">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-secondary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Response Kit
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {account.company.name} &middot;{" "}
                {account.company.industry === "financial_services"
                  ? "Financial Services"
                  : account.company.industry === "healthcare"
                    ? "Healthcare"
                    : account.company.industry === "technology"
                      ? "Life Sciences"
                      : account.company.industry.charAt(0).toUpperCase() +
                        account.company.industry.slice(1)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {LOADING_STEPS.map((step, i) => (
                <p
                  key={step}
                  className={cn(
                    "text-sm transition-opacity duration-500",
                    i <= loadingStep
                      ? "text-foreground opacity-100"
                      : "text-muted-foreground opacity-30"
                  )}
                >
                  {step}
                </p>
              ))}
              <div className="h-1 w-32 bg-muted rounded-full overflow-hidden mt-2">
                <div className="h-full bg-secondary rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <AlertTriangle className="h-8 w-8 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Kit Content */}
          {kit && !loading && (
            <>
              {/* Customer Message */}
              <section>
                <SectionHeader label="Customer Message" />
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    From:{" "}
                    <span className="text-foreground font-medium">
                      {message.contact.firstName}{" "}
                      {message.contact.lastName}
                      {message.contact.title
                        ? `, ${message.contact.title}`
                        : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Via: {message.channel} &middot; Received{" "}
                    {timeAgo(message.receivedAt)}
                  </p>
                  <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">
                    {message.body}
                  </p>
                </div>
              </section>

              {/* AI Analysis */}
              <section>
                <SectionHeader label="AI Analysis" />
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm">
                    <span className="text-muted-foreground">Category: </span>
                    <span className="font-medium text-foreground capitalize">
                      {kit.message_analysis.category.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span className="text-sm flex items-center gap-1.5">
                    <span className="text-muted-foreground">Urgency: </span>
                    <span className="flex gap-0.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "inline-block h-3 w-1.5 rounded-sm",
                            i < urgencyLevel
                              ? urgencyLevel >= 3
                                ? "bg-danger"
                                : urgencyLevel >= 2
                                  ? "bg-warning"
                                  : "bg-success"
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </span>
                    <span className="font-medium capitalize">
                      {kit.message_analysis.urgency}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm">
                    <span className="text-muted-foreground">Sentiment: </span>
                    <span className="font-medium text-foreground capitalize">
                      {kit.message_analysis.sentiment}
                    </span>
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {kit.message_analysis.underlying_concern}
                </p>
              </section>

              {/* Similar Resolutions */}
              {kit.similar_resolutions.length > 0 && (
                <section>
                  <SectionHeader label="Similar Situations" />
                  <div className="space-y-2">
                    {kit.similar_resolutions.map((res, i) => (
                      <div
                        key={i}
                        className="bg-muted/50 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Link2 className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            {res.account_name || res.company}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {res.situation}
                        </p>
                        {res.resolution && (
                          <p className="text-sm text-foreground mt-1">
                            {res.resolution}
                          </p>
                        )}
                        {res.outcome && (
                          <p className="text-sm text-success mt-1">
                            Result: {res.outcome}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recommended Resources */}
              {kit.recommended_resources.length > 0 && (
                <section>
                  <SectionHeader label="Recommended Resources" />
                  <div className="space-y-2">
                    {kit.recommended_resources.map((res, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {res.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {res.relevance || res.reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Draft Reply */}
              <section>
                <SectionHeader label="Draft Reply" />
                <div className="bg-muted rounded-lg p-4 border border-border">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Subject: {getDraftSubject()}
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {getDraftBody()}
                  </p>
                </div>
                {getDraftTone() && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Tone: {getDraftTone()}
                  </p>
                )}
              </section>

              {/* Internal Notes */}
              <section>
                <SectionHeader label="Internal Notes" />
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  {typeof kit.internal_notes === "string" ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground">
                        {kit.internal_notes}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-foreground">
                          Risk: {kit.internal_notes.risk_assessment}
                        </p>
                      </div>
                      {kit.internal_notes.recommended_follow_up && (
                        <div className="ml-6 mt-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            Next Steps
                          </p>
                          <div className="space-y-1">
                            {kit.internal_notes.recommended_follow_up
                              .split(/\n|(?:\d+\.\s)/)
                              .filter(Boolean)
                              .map((step, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-1.5"
                                >
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                                  <p className="text-sm text-foreground">
                                    {step.trim()}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  onClick={handleCopyDraft}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-muted hover:bg-border transition-colors text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Draft
                    </>
                  )}
                </button>
                <button
                  onClick={handleMarkResponded}
                  disabled={markingResponded}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {markingResponded ? (
                    "Updating..."
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Mark as Responded
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

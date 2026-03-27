"use client";

import { useState } from "react";
import { Mail, MessageSquare, Phone, Clock, ChevronDown, CheckCircle2, Circle, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { ObservationInput } from "@/components/observation-input";

type Sequence = {
  id: string;
  name: string;
  status: string | null;
  dealId: string;
  contactId: string;
  createdAt: Date;
  dealName: string | null;
  companyName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  aeName: string | null;
};

type Step = {
  id: string;
  sequenceId: string;
  stepNumber: number;
  subject: string;
  body: string;
  delayDays: number | null;
  status: string | null;
  sentAt: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  aiGenerated: boolean | null;
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: "text-success", bg: "bg-emerald-50", label: "Active" },
  draft: { color: "text-muted-foreground", bg: "bg-muted", label: "Draft" },
  paused: { color: "text-warning", bg: "bg-amber-50", label: "Paused" },
  completed: { color: "text-primary", bg: "bg-primary-light", label: "Completed" },
};

const STEP_STATUS_ICON: Record<string, "sent" | "opened" | "replied" | "pending"> = {
  sent: "sent",
  opened: "opened",
  clicked: "opened",
  replied: "replied",
  bounced: "pending",
  draft: "pending",
  approved: "pending",
};

export function OutreachClient({ sequences, steps }: { sequences: Sequence[]; steps: Step[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSeqId, setSelectedSeqId] = useState<string | null>(null);

  const filtered = sequences.filter((s) => statusFilter === "all" || s.status === statusFilter);

  // Group steps by sequence
  const stepsBySeq = new Map<string, Step[]>();
  for (const step of steps) {
    if (!stepsBySeq.has(step.sequenceId)) stepsBySeq.set(step.sequenceId, []);
    stepsBySeq.get(step.sequenceId)!.push(step);
  }

  const selectedSeq = selectedSeqId ? sequences.find((s) => s.id === selectedSeqId) : null;
  const selectedSteps = selectedSeqId ? stepsBySeq.get(selectedSeqId) || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Outreach</h1>
          <p className="text-sm text-muted-foreground">
            {sequences.length} sequences · {steps.length} total steps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SelectFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "paused", label: "Paused" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </div>
      </div>

      {selectedSeq ? (
        <SequenceDetail
          sequence={selectedSeq}
          steps={selectedSteps}
          onBack={() => setSelectedSeqId(null)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((seq) => {
            const seqSteps = stepsBySeq.get(seq.id) || [];
            const sentCount = seqSteps.filter((s) => s.sentAt).length;
            const repliedCount = seqSteps.filter((s) => s.repliedAt).length;
            const status = STATUS_CONFIG[seq.status || "draft"] || STATUS_CONFIG.draft!;
            const progress = seqSteps.length ? Math.round((sentCount / seqSteps.length) * 100) : 0;

            return (
              <button
                key={seq.id}
                onClick={() => setSelectedSeqId(seq.id)}
                className="text-left bg-card rounded-xl border border-border p-5 hover:shadow-sm hover:border-primary/20 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{seq.name}</h3>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", status.bg, status.color)}>
                    {status.label}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  {seq.companyName && `${seq.companyName} · `}
                  {seq.contactFirstName && `${seq.contactFirstName} ${seq.contactLastName}`}
                  {seq.aeName && ` · ${seq.aeName}`}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>{seqSteps.length} steps</span>
                  <span>{sentCount} sent</span>
                  <span>{repliedCount} replied</span>
                </div>

                {/* Step progress dots */}
                <div className="flex items-center gap-1.5 mb-2">
                  {seqSteps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-1">
                      <div className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        step.repliedAt ? "bg-success" : step.sentAt ? "bg-primary" : "bg-border"
                      )} />
                      {i < seqSteps.length - 1 && <div className="w-3 h-px bg-border" />}
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              No sequences found
            </div>
          )}
        </div>
      )}

      <ObservationInput context={{ page: "outreach", trigger: "manual" }} />
    </div>
  );
}

function SequenceDetail({ sequence, steps, onBack }: { sequence: Sequence; steps: Step[]; onBack: () => void }) {
  const status = STATUS_CONFIG[sequence.status || "draft"] || STATUS_CONFIG.draft!;
  const sentCount = steps.filter((s) => s.sentAt).length;
  const repliedCount = steps.filter((s) => s.repliedAt).length;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Sequences
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">{sequence.name}</h2>
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", status.bg, status.color)}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span>{steps.length} steps</span>
          <span>{sentCount} sent</span>
          <span className="text-success">{repliedCount} replied</span>
          {sequence.companyName && <span>{sequence.companyName}</span>}
        </div>
      </div>

      {/* Steps flow */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Sequence Steps</h3>
        <div className="space-y-0">
          {steps.map((step, i) => {
            const isSent = !!step.sentAt;
            const isReplied = !!step.repliedAt;
            const isOpened = !!step.openedAt;

            return (
              <div key={step.id}>
                <div className={cn(
                  "p-4 rounded-xl border transition-colors",
                  isReplied ? "border-emerald-200 bg-emerald-50/30" : isSent ? "border-primary/20 bg-primary-light/20" : "border-border"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center",
                        isSent ? "bg-primary-light text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <Mail className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Step {step.stepNumber}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Day {steps.slice(0, i).reduce((sum, s) => sum + (s.delayDays || 0), 0) + (step.delayDays || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.aiGenerated && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">AI</span>
                      )}
                      {isReplied ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Replied</span>
                      ) : isOpened ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Opened</span>
                      ) : isSent ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-light text-primary">Sent</span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Pending</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">{step.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{step.body}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex items-center gap-2 py-2 pl-3.5">
                    <div className="w-px h-4 bg-border" />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      wait {steps[i + 1]?.delayDays || 0} days
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
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

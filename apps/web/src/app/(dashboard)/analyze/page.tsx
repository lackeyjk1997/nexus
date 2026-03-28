"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, RotateCcw, FileText, Sparkles, Mail, Copy, Check, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { TranscriptInput } from "@/components/analyzer/transcript-input";
import { ObservationInput } from "@/components/observation-input";
import { AnalysisStream } from "@/components/analyzer/analysis-stream";
import { parseAnalysisJson } from "@/lib/analysis/parse-stream";
import type { AnalysisResult } from "@/lib/analysis/types";
import { usePersona } from "@/components/providers";

type Phase = "input" | "analyzing" | "complete";
type DraftPhase = "hidden" | "loading" | "result";

type EmailDraft = {
  subject: string;
  body: string;
  to: string;
  notes_for_rep: string;
};

export default function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  // Email draft state
  const [draftPhase, setDraftPhase] = useState<DraftPhase>("hidden");
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);

  const { currentUser } = usePersona();

  const handleAnalyze = useCallback(async (transcript: string) => {
    setPhase("analyzing");
    setResult(null);
    setStreamedText("");
    setError(null);
    setCharCount(transcript.length);
    setDraftPhase("hidden");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Request failed" }));
        setError(errBody.error || `HTTP ${res.status}`);
        setPhase("complete");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Failed to read response stream");
        setPhase("complete");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                setPhase("complete");
                return;
              }
              if (parsed.text) {
                buffer += parsed.text;
                setStreamedText(buffer);
              }
            } catch {
              // Ignore parse errors on individual chunks
            }
          }
        }
      }

      const analysisResult = parseAnalysisJson(buffer);
      if (analysisResult) {
        setResult(analysisResult);
      } else {
        setError("Could not parse analysis results. The AI response may have been malformed.");
      }
      setPhase("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setPhase("complete");
    }
  }, []);

  function handleReset() {
    setPhase("input");
    setResult(null);
    setStreamedText("");
    setError(null);
    setDraftPhase("hidden");
    setEmailDraft(null);
  }

  async function handleDraftFollowUp() {
    if (!currentUser) return;
    setDraftPhase("loading");

    // Build additional context from analysis result
    const additionalContext = result
      ? `Call analysis summary: ${(result as { summary?: string }).summary || ""}. Next steps: ${JSON.stringify((result as { nextSteps?: unknown }).nextSteps || [])}. Pain points: ${JSON.stringify((result as { painPoints?: unknown }).painPoints || [])}`
      : undefined;

    try {
      const res = await fetch("/api/agent/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "follow_up",
          memberId: currentUser.id,
          rawQuery: "draft a follow-up email from this call analysis",
          additionalContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data.draft);
        setEditedSubject(data.draft.subject);
        setEditedBody(data.draft.body);
        setDraftPhase("result");
      } else {
        setDraftPhase("hidden");
      }
    } catch {
      setDraftPhase("hidden");
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        {phase !== "input" ? (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Transcript Analysis
                </h1>
                <p className="text-xs text-muted-foreground">
                  {charCount.toLocaleString()} characters analyzed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {phase === "complete" && result && (
                <button
                  onClick={handleDraftFollowUp}
                  disabled={draftPhase === "loading"}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: draftPhase !== "hidden" ? "rgba(224,122,95,0.12)" : "#F3EDE7",
                    color: draftPhase !== "hidden" ? "#E07A5F" : "#8A8078",
                    border: "1px solid " + (draftPhase !== "hidden" ? "rgba(224,122,95,0.3)" : "#E8E5E0"),
                  }}
                >
                  {draftPhase === "loading" ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "#D4C9BD", borderTopColor: "#E07A5F" }} />
                      Drafting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Draft Follow-Up Email
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                New Analysis
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground">
              Transcript Analyzer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a sales call and get instant AI-powered insights
            </p>
          </>
        )}
      </div>

      {/* Email Draft Panel */}
      {draftPhase === "result" && emailDraft && (
        <div
          className="bg-card rounded-xl overflow-hidden animate-[fadeSlideUp_0.35s_ease]"
          style={{ border: "1px solid rgba(224,122,95,0.2)" }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid rgba(224,122,95,0.12)", background: "rgba(224,122,95,0.04)" }}
          >
            <Mail className="h-4 w-4 shrink-0" style={{ color: "#E07A5F" }} />
            <span className="text-sm font-semibold" style={{ color: "#3D3833" }}>
              Draft Follow-Up Email{emailDraft.to ? ` — ${emailDraft.to}` : ""}
            </span>
            <button
              onClick={() => { setDraftPhase("hidden"); setEmailDraft(null); }}
              className="ml-auto p-0.5 hover:opacity-70"
              style={{ color: "#8A8078" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-14 shrink-0" style={{ color: "#8A8078" }}>To</span>
              <span className="text-[13px]" style={{ color: "#3D3833" }}>{emailDraft.to}</span>
            </div>
            <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] w-14 shrink-0" style={{ color: "#8A8078" }}>Subject</span>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-[13px]"
                style={{ color: "#3D3833" }}
              />
            </div>
            <div className="h-px" style={{ background: "rgba(0,0,0,0.06)" }} />
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={8}
              className="w-full bg-transparent border-none outline-none text-[13px] leading-[1.6] resize-none"
              style={{ color: "#3D3833" }}
            />
          </div>

          {emailDraft.notes_for_rep && (
            <div
              className="mx-5 mb-3 px-3 py-2 rounded-lg flex items-start gap-2"
              style={{ background: "rgba(224,122,95,0.05)", border: "1px solid rgba(224,122,95,0.15)" }}
            >
              <Lightbulb className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "#E07A5F" }} />
              <p className="text-[11.5px] leading-[1.5]" style={{ color: "#8A8078" }}>{emailDraft.notes_for_rep}</p>
            </div>
          )}

          <div className="flex items-center gap-3 px-5 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background: copied ? "rgba(45,138,78,0.1)" : "#F3EDE7",
                color: copied ? "#2D8A4E" : "#8A8078",
              }}
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied!" : "Copy email"}
            </button>
            <button
              onClick={handleDraftFollowUp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors"
              style={{ color: "#8A8078" }}
            >
              <RotateCcw className="h-3 w-3" />
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {phase === "input" && (
        <TranscriptInput
          onTranscriptReady={handleAnalyze}
          isAnalyzing={false}
        />
      )}

      {(phase === "analyzing" || phase === "complete") && (
        <AnalysisStream
          result={result}
          isStreaming={phase === "analyzing"}
          streamedText={streamedText}
          error={error}
        />
      )}

      {phase === "complete" && result && (
        <ObservationInput
          context={{ page: "analyze", trigger: "post_call" }}
          variant="post-action"
          autoOpen
          placeholder="Anything the analysis missed, or patterns you're seeing?"
        />
      )}
    </div>
  );
}

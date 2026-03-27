"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, RotateCcw, FileText } from "lucide-react";
import Link from "next/link";
import { TranscriptInput } from "@/components/analyzer/transcript-input";
import { ObservationInput } from "@/components/observation-input";
import { AnalysisStream } from "@/components/analyzer/analysis-stream";
import { parseAnalysisJson } from "@/lib/analysis/parse-stream";
import type { AnalysisResult } from "@/lib/analysis/types";

type Phase = "input" | "analyzing" | "complete";

export default function AnalyzePage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState(0);

  const handleAnalyze = useCallback(async (transcript: string) => {
    setPhase("analyzing");
    setResult(null);
    setStreamedText("");
    setError(null);
    setCharCount(transcript.length);

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

      // Parse the complete response
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
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Analysis
            </button>
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

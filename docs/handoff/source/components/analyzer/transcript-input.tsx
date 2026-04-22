"use client";

import { useState, useRef, type DragEvent } from "react";
import { Upload, FileText, Sparkles, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_TRANSCRIPTS } from "@/lib/analysis/demo-transcripts";

type Tab = "upload" | "paste" | "demo";

export function TranscriptInput({
  onTranscriptReady,
  isAnalyzing,
}: {
  onTranscriptReady: (text: string) => void;
  isAnalyzing: boolean;
}) {
  const [tab, setTab] = useState<Tab>("demo");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const isShort = charCount > 0 && charCount < 200;
  const canAnalyze = charCount > 0 && !isAnalyzing;

  function handleFile(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum 5MB.");
      return;
    }
    const validExts = [".txt", ".md", ".vtt", ".srt"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExts.includes(ext)) {
      setError("Unsupported file type. Use .txt, .md, .vtt, or .srt");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setText(content);
      setFileName(file.name);
      setTab("upload");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function loadDemo(filename: string) {
    setError(null);
    try {
      const res = await fetch(`/demo-transcripts/${filename}`);
      const content = await res.text();
      setText(content);
      setFileName(filename);
    } catch {
      setError("Failed to load demo transcript");
    }
  }

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex items-center gap-6 border-b border-border">
        {([
          { key: "upload" as Tab, label: "Upload File", icon: Upload },
          { key: "paste" as Tab, label: "Paste Text", icon: FileText },
          { key: "demo" as Tab, label: "Demo Transcripts", icon: Sparkles },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
              tab === key
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {tab === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
              dragActive
                ? "border-secondary bg-secondary-light"
                : fileName
                  ? "border-primary/30 bg-primary-light/30"
                  : "border-border hover:border-secondary/50 hover:bg-muted/30"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.vtt,.srt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {fileName ? (
              <div className="space-y-2">
                <FileText className="h-10 w-10 text-primary mx-auto" />
                <p className="text-sm font-medium text-foreground">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {charCount.toLocaleString()} characters loaded
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setText("");
                    setFileName(null);
                  }}
                  className="text-xs text-secondary hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium text-foreground">
                  Drop your transcript here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  .txt, .md, .vtt, .srt — max 5MB
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "paste" && (
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName(null);
              }}
              placeholder="Paste your sales call transcript here..."
              className="w-full min-h-[300px] p-4 rounded-xl border border-border bg-card text-sm font-mono text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {charCount.toLocaleString()} chars
            </span>
          </div>
        )}

        {tab === "demo" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMO_TRANSCRIPTS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => loadDemo(demo.filename)}
                className={cn(
                  "text-left p-5 rounded-xl border transition-all",
                  fileName === demo.filename
                    ? "border-primary bg-primary-light ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <p className="text-sm font-semibold text-foreground mb-1">
                  {demo.title}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  {demo.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-primary">
                    {demo.personas.rep}
                  </span>
                  <span>→</span>
                  <span>{demo.personas.prospect}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {demo.company}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Short warning */}
      {isShort && (
        <p className="text-xs text-warning">
          Short transcript — analysis results may be limited.
        </p>
      )}

      {/* Analyze Button */}
      <button
        onClick={() => onTranscriptReady(text)}
        disabled={!canAnalyze}
        className={cn(
          "w-full py-3.5 rounded-xl text-sm font-semibold transition-all",
          canAnalyze
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : (
          "Analyze Transcript"
        )}
      </button>
    </div>
  );
}

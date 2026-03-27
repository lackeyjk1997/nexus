"use client";

import { FileText } from "lucide-react";

export function CallSummary({ summary }: { summary: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 border-l-4 border-l-secondary">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-secondary" />
        <h3 className="text-sm font-semibold text-foreground">Call Summary</h3>
      </div>
      <p className="text-[15px] text-foreground leading-relaxed">{summary}</p>
    </div>
  );
}

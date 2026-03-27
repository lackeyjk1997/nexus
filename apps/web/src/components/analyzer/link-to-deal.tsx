"use client";

import { useState, useEffect } from "react";
import { X, Search, Check, ExternalLink } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/analysis/types";

type Deal = {
  id: string;
  name: string;
  companyName: string | null;
  dealValue: string | null;
  stage: string;
};

export function LinkToDeal({
  analysis,
}: {
  analysis: AnalysisResult;
}) {
  const [open, setOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkedDealId, setLinkedDealId] = useState<string | null>(null);
  const [linkedDealName, setLinkedDealName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/deals")
        .then((r) => r.json())
        .then(setDeals)
        .catch(() => {});
    }
  }, [open]);

  const filtered = deals.filter(
    (d) =>
      (d.companyName?.toLowerCase() || "").includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase())
  );

  async function linkDeal(deal: Deal) {
    setSaving(true);
    try {
      const res = await fetch("/api/analyze/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, analysis }),
      });
      if (res.ok) {
        setLinkedDealId(deal.id);
        setLinkedDealName(deal.companyName || deal.name);
      }
    } finally {
      setSaving(false);
    }
  }

  if (linkedDealId) {
    return (
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Check className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Analysis linked to {linkedDealName}
            </p>
            <p className="text-xs text-muted-foreground">
              Saved to the deal&apos;s activity timeline
            </p>
          </div>
        </div>
        <Link
          href={`/pipeline/${linkedDealId}`}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View Deal <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
      >
        Link this analysis to a deal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-card rounded-xl border border-border shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Link to Deal
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search deals..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {filtered.map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => linkDeal(deal)}
                  disabled={saving}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {deal.companyName}
                    </p>
                    <p className="text-xs text-muted-foreground">{deal.name}</p>
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {formatCurrency(Number(deal.dealValue || 0))}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No deals found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

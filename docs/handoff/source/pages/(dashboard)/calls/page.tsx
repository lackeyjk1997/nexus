export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { callTranscripts, callAnalyses, deals, companies } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Phone, Clock, BarChart3 } from "lucide-react";

export default async function CallsPage() {
  const transcripts = await db
    .select({
      id: callTranscripts.id,
      title: callTranscripts.title,
      date: callTranscripts.date,
      durationSeconds: callTranscripts.durationSeconds,
      participants: callTranscripts.participants,
      status: callTranscripts.status,
      dealId: callTranscripts.dealId,
      dealName: deals.name,
      companyName: companies.name,
      callQualityScore: callAnalyses.callQualityScore,
      summary: callAnalyses.summary,
    })
    .from(callTranscripts)
    .leftJoin(deals, eq(callTranscripts.dealId, deals.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(callAnalyses, eq(callTranscripts.id, callAnalyses.transcriptId))
    .orderBy(desc(callTranscripts.date));

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Calls</h1>
        <p className="text-sm text-muted-foreground">
          {transcripts.length} call transcripts
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Call</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Company</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Duration</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Quality</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transcripts.map((t) => {
              const duration = t.durationSeconds
                ? `${Math.floor(t.durationSeconds / 60)}m ${t.durationSeconds % 60}s`
                : "—";
              return (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.title}</p>
                        {t.dealName && (
                          <Link href={`/pipeline/${t.dealId}`} className="text-xs text-primary hover:underline">
                            {t.dealName}
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{t.companyName || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{duration}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.callQualityScore != null ? (
                      <span className={cn(
                        "text-sm font-bold",
                        t.callQualityScore >= 80 ? "text-success" : t.callQualityScore >= 60 ? "text-warning" : "text-danger"
                      )}>
                        {t.callQualityScore}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.summary ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-success flex items-center gap-1 w-fit">
                        <BarChart3 className="h-3 w-3" /> Analyzed
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {transcripts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No call transcripts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

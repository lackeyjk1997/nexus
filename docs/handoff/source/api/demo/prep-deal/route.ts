export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { db } from "@/lib/db";
import { callTranscripts } from "@nexus/db";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  try {
    const { dealId } = await request.json();

    if (!dealId) {
      return NextResponse.json(
        { error: "dealId is required" },
        { status: 400 }
      );
    }

    // Fetch all unprocessed transcripts for this deal
    const transcripts = await db
      .select({
        id: callTranscripts.id,
        title: callTranscripts.title,
        transcriptText: callTranscripts.transcriptText,
        pipelineProcessed: callTranscripts.pipelineProcessed,
      })
      .from(callTranscripts)
      .where(
        and(
          eq(callTranscripts.dealId, dealId),
          eq(callTranscripts.pipelineProcessed, false)
        )
      )
      .orderBy(callTranscripts.date);

    if (transcripts.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "All transcripts already processed",
      });
    }

    // Determine the app URL for internal API calls
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:${process.env.PORT || 3000}`);

    const total = transcripts.length;
    let processed = 0;

    for (const t of transcripts) {
      if (!t.transcriptText) {
        console.log(`[Prep] Skipping transcript ${t.title} — no text`);
        continue;
      }

      console.log(
        `[Prep] Processing transcript ${processed + 1}/${total}: ${t.title}`
      );

      // Fire the pipeline (same payload as the "Process Transcript" button)
      await fetch(`${appUrl}/api/transcript-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          transcriptText: t.transcriptText,
          transcriptId: t.id,
        }),
      });

      processed++;

      // Wait between transcripts to let the pipeline complete.
      // The pipeline runs async via Rivet — 90s is enough for
      // parallel-analysis + MEDDPICC + signals + fitness.
      if (processed < total) {
        console.log(`[Prep] Waiting 90s before next transcript...`);
        await sleep(90_000);
      }
    }

    console.log(`[Prep] Done — ${processed} transcripts processed for deal ${dealId}`);
    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("[Prep] Error:", error);
    return NextResponse.json(
      { error: "Prep failed" },
      { status: 500 }
    );
  }
}

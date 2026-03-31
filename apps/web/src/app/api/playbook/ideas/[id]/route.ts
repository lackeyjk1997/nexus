import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { playbookIdeas, observations, teamMembers } from "@nexus/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  proposed: ["testing", "rejected"],
  testing: ["graduated", "archived"],
  rejected: [], // terminal
  graduated: [], // terminal
  archived: [], // terminal
  // Legacy statuses for backward compat
  promoted: [],
  retired: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing idea ID" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(playbookIdeas)
      .where(eq(playbookIdeas.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: `Not found: ${id}` }, { status: 404 });
    }

    // Validate status transition if status is being changed
    if (body.status && body.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid transition: ${existing.status} → ${body.status}. Allowed: ${allowed.join(", ") || "none"}` },
          { status: 400 }
        );
      }

      // Validate required fields for specific transitions
      if (body.status === "testing") {
        if (!body.test_group?.length || !body.success_thresholds || !body.approved_by) {
          return NextResponse.json(
            { error: `Testing requires test_group (got ${body.test_group?.length ?? 0}), success_thresholds (${!!body.success_thresholds}), and approved_by (${!!body.approved_by})` },
            { status: 400 }
          );
        }
      }
    }

    // Build typed update
    const existingResults = (existing.results as Record<string, unknown>) || {};
    const now = new Date();

    await db
      .update(playbookIdeas)
      .set({
        ...(body.status ? { status: body.status } : {}),
        ...(body.structured_feedback
          ? { results: { ...existingResults, structured_feedback: body.structured_feedback } }
          : {}),
        ...(body.test_group ? { testGroup: body.test_group } : {}),
        ...(body.control_group ? { controlGroup: body.control_group } : {}),
        ...(body.success_thresholds ? { successThresholds: body.success_thresholds } : {}),
        ...(body.current_metrics ? { currentMetrics: body.current_metrics } : {}),
        ...(body.approved_by ? { approvedBy: body.approved_by } : {}),
        ...(body.approved_at ? { approvedAt: new Date(body.approved_at) } : {}),
        ...(body.experiment_start ? { experimentStart: new Date(body.experiment_start) } : {}),
        ...(body.experiment_end ? { experimentEnd: new Date(body.experiment_end) } : {}),
        ...(body.experiment_duration_days ? { experimentDurationDays: body.experiment_duration_days } : {}),
        ...(body.attribution ? { attribution: body.attribution } : {}),
        // Auto-set fields on transitions
        ...(body.status === "testing" ? {
          approvedAt: now,
          experimentStart: now,
          experimentEnd: new Date(now.getTime() + (body.experiment_duration_days ?? 30) * 24 * 60 * 60 * 1000),
        } : {}),
        ...(body.status === "graduated" ? { graduatedAt: now } : {}),
        updatedAt: now,
      })
      .where(eq(playbookIdeas.id, id));

    // ── On graduation, create a process_innovation observation for Intelligence dashboard ──
    if (body.status === "graduated") {
      try {
        const metrics = existing.currentMetrics as {
          velocity_pct?: number;
          sentiment_pts?: number;
          close_rate_pct?: number;
          deals_tested?: number;
        } | null;

        const velocityStr = metrics?.velocity_pct ? `Velocity improved ${metrics.velocity_pct}% for test group.` : "";
        const sentimentStr = metrics?.sentiment_pts ? `Sentiment +${metrics.sentiment_pts} pts.` : "";

        const [originator] = await db
          .select({ name: teamMembers.name })
          .from(teamMembers)
          .where(eq(teamMembers.id, existing.originatorId))
          .limit(1);

        const rawInput = `Playbook experiment "${existing.title}" graduated after meeting success thresholds. ${velocityStr} ${sentimentStr} Proposed by ${originator?.name ?? "a team member"}. Now scaling to all AEs.`.trim();

        await db.insert(observations).values({
          observerId: existing.originatorId,
          rawInput,
          aiClassification: {
            signals: [{ type: "process_innovation", confidence: 0.95 }],
            scope: "team",
            urgency: "medium",
            impact_severity: "high",
            source: "playbook_experiment",
            experiment_id: id,
            experiment_outcome: "graduated",
          },
          extractedEntities: {},
        });
      } catch (obsErr) {
        console.error("Failed to create graduation observation (non-fatal):", obsErr);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("PATCH /api/playbook/ideas/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

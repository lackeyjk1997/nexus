import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, sql, and, ne, or, isNull } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

async function seedFixes() {
  console.log("🔧 Running intelligence data fixes...\n");

  // ── P1: Deduplicate observations ──
  console.log("── P1: Deduplicating observations ──");

  const dupes = await db.execute(sql`
    WITH ranked AS (
      SELECT id, raw_input, observer_id, created_at,
             ROW_NUMBER() OVER (PARTITION BY raw_input, observer_id ORDER BY created_at ASC) as rn
      FROM observations
    )
    SELECT id FROM ranked WHERE rn > 1
  `);

  const dupeIds = (dupes.rows || dupes) as Array<{ id: string }>;
  if (dupeIds.length > 0) {
    for (const row of dupeIds) {
      // Delete routing records that reference this observation first
      await db.delete(schema.observationRouting).where(eq(schema.observationRouting.observationId, row.id));
      await db.delete(schema.observations).where(eq(schema.observations.id, row.id));
    }
    console.log(`  ✓ Removed ${dupeIds.length} duplicate observations (and their routing records)`);
  } else {
    console.log("  ✓ No duplicate observations found");
  }

  // ── P2: Seed acknowledged_at on routing records ──
  console.log("\n── P2: Seeding acknowledged_at on routing records ──");

  const routingRecords = await db
    .select({ id: schema.observationRouting.id, status: schema.observationRouting.status, createdAt: schema.observationRouting.createdAt })
    .from(schema.observationRouting)
    .where(isNull(schema.observationRouting.acknowledgedAt))
    .limit(15);

  let ackCount = 0;
  for (let i = 0; i < routingRecords.length; i++) {
    const r = routingRecords[i]!;
    // Simulate varying response times: 1-8 hours
    const delayHours = 1 + (i * 0.5) + Math.random() * 3;
    const ackAt = new Date(new Date(r.createdAt).getTime() + delayHours * 60 * 60 * 1000);

    // Set different statuses based on index
    const newStatus = i < 5 ? "acknowledged" : i < 10 ? "in_progress" : "resolved";

    await db
      .update(schema.observationRouting)
      .set({
        acknowledgedAt: ackAt,
        status: newStatus as "acknowledged" | "in_progress" | "resolved",
      })
      .where(eq(schema.observationRouting.id, r.id));
    ackCount++;
  }
  console.log(`  ✓ Updated ${ackCount} routing records with acknowledged_at`);

  // ── P3: Recalculate ARR on all clusters ──
  console.log("\n── P3: Recalculating ARR on clusters ──");

  const allClusters = await db.select().from(schema.observationClusters);
  const allDeals = await db
    .select({ id: schema.deals.id, dealValue: schema.deals.dealValue, stage: schema.deals.stage, name: schema.deals.name })
    .from(schema.deals);
  const dealMap = new Map(allDeals.map((d) => [d.id, d]));

  for (const cluster of allClusters) {
    const clusterObs = await db
      .select({
        sourceContext: schema.observations.sourceContext,
        linkedDealIds: schema.observations.linkedDealIds,
      })
      .from(schema.observations)
      .where(eq(schema.observations.clusterId, cluster.id));

    const dealIds = new Set<string>();
    for (const obs of clusterObs) {
      const ctx = obs.sourceContext as { dealId?: string } | null;
      if (ctx?.dealId) dealIds.add(ctx.dealId);
      if (obs.linkedDealIds) obs.linkedDealIds.forEach((id) => dealIds.add(id));
    }

    let totalArr = 0;
    const dealDetails: Array<{ name: string; value: number; stage: string }> = [];

    for (const dealId of dealIds) {
      const deal = dealMap.get(dealId);
      if (deal) {
        const value = Number(deal.dealValue || 0);
        totalArr += value;
        dealDetails.push({ name: deal.name, value, stage: deal.stage });
      }
    }

    // Only update if we found deals (don't zero out seeded values)
    if (totalArr > 0) {
      await db
        .update(schema.observationClusters)
        .set({
          arrImpactTotal: totalArr.toString(),
          arrImpactDetails: { deals: dealDetails },
        })
        .where(eq(schema.observationClusters.id, cluster.id));
    }

    console.log(`  ✓ ${cluster.title}: €${totalArr.toLocaleString()} (${dealIds.size} deals)`);
  }

  // ── P0: Update field query seed for multi-AE targeting ──
  console.log("\n── P0: Updating field query seed for multi-AE targeting ──");

  const allMembers = await db.select().from(schema.teamMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name);

  const marcus = byName("Marcus Thompson");
  const sarah = byName("Sarah Chen");
  const david = byName("David Park");
  const elena = byName("Elena Rodriguez");
  const ryan = byName("Ryan Foster");
  const james = byName("James Wilson");

  if (marcus && sarah && david) {
    // Find the CompetitorX query
    const competitorXQuery = await db
      .select()
      .from(schema.fieldQueries)
      .where(
        and(
          eq(schema.fieldQueries.initiatedBy, marcus.id),
          sql`${schema.fieldQueries.rawQuestion} ILIKE '%CompetitorX%'`
        )
      )
      .limit(1);

    if (competitorXQuery.length > 0) {
      const queryId = competitorXQuery[0]!.id;

      // Check what questions already exist for this query
      const existingQs = await db
        .select({ targetMemberId: schema.fieldQueryQuestions.targetMemberId })
        .from(schema.fieldQueryQuestions)
        .where(eq(schema.fieldQueryQuestions.queryId, queryId));

      const existingAeIds = new Set(existingQs.map((q) => q.targetMemberId));

      // Find deals for David Park that have CompetitorX
      const davidDeals = await db
        .select({ id: schema.deals.id, name: schema.deals.name, companyId: schema.deals.companyId })
        .from(schema.deals)
        .where(eq(schema.deals.assignedAeId, david.id));

      // Add question for David if not already present
      if (!existingAeIds.has(david.id) && davidDeals.length > 0) {
        const deal = davidDeals[0]!;
        await db.insert(schema.fieldQueryQuestions).values({
          queryId,
          targetMemberId: david.id,
          questionText: `Quick check on ${deal.name} — is CompetitorX putting pricing pressure on this deal?`,
          chips: ["Yes, pricing is a factor", "No, different competitive dynamics", "They haven't come up", "Not sure"],
          dealId: deal.id,
          accountId: deal.companyId,
          status: "pending",
          createdAt: hoursAgo(12),
        });
        console.log(`  ✓ Added CompetitorX question for David Park (${deal.name})`);
      }

      // Add question for Elena if she has deals
      if (elena && !existingAeIds.has(elena.id)) {
        const elenaDeals = await db
          .select({ id: schema.deals.id, name: schema.deals.name, companyId: schema.deals.companyId })
          .from(schema.deals)
          .where(eq(schema.deals.assignedAeId, elena.id));

        if (elenaDeals.length > 0) {
          const deal = elenaDeals[0]!;
          await db.insert(schema.fieldQueryQuestions).values({
            queryId,
            targetMemberId: elena.id,
            questionText: `Quick check on ${deal.name} — have you seen any CompetitorX pricing pressure in this deal?`,
            chips: ["Yes, it's a factor", "Somewhat, but manageable", "No, not relevant here", "Not sure"],
            dealId: deal.id,
            accountId: deal.companyId,
            status: "pending",
            createdAt: hoursAgo(12),
          });
          console.log(`  ✓ Added CompetitorX question for Elena Rodriguez (${deal.name})`);
        }
      }

      // Add question for Ryan if he has deals
      if (ryan && !existingAeIds.has(ryan.id)) {
        const ryanDeals = await db
          .select({ id: schema.deals.id, name: schema.deals.name, companyId: schema.deals.companyId })
          .from(schema.deals)
          .where(eq(schema.deals.assignedAeId, ryan.id));

        if (ryanDeals.length > 0) {
          const deal = ryanDeals[0]!;
          await db.insert(schema.fieldQueryQuestions).values({
            queryId,
            targetMemberId: ryan.id,
            questionText: `Quick check on ${deal.name} — is CompetitorX showing up in this account?`,
            chips: ["Yes, they're competing", "Mentioned but not serious", "No, haven't seen them", "Not sure"],
            dealId: deal.id,
            accountId: deal.companyId,
            status: "pending",
            createdAt: hoursAgo(12),
          });
          console.log(`  ✓ Added CompetitorX question for Ryan Foster (${deal.name})`);
        }
      }

      // Update the query's target count in aggregated answer
      const allQs = await db
        .select({ status: schema.fieldQueryQuestions.status })
        .from(schema.fieldQueryQuestions)
        .where(eq(schema.fieldQueryQuestions.queryId, queryId));

      const totalTarget = allQs.filter((q) => q.status !== "expired").length;
      const totalResponded = allQs.filter((q) => q.status === "answered").length;

      await db
        .update(schema.fieldQueries)
        .set({
          aggregatedAnswer: {
            summary: `${totalResponded} of ${totalTarget} reps have responded. Initial responses suggest pricing adjustments could help recover some CompetitorX-affected deals.`,
            response_count: totalResponded,
            target_count: totalTarget,
            updated_at: new Date().toISOString(),
          },
        })
        .where(eq(schema.fieldQueries.id, queryId));

      console.log(`  ✓ Updated CompetitorX query: ${totalTarget} targeted, ${totalResponded} responded`);
    } else {
      console.log("  ⚠ CompetitorX query not found — run seed-field-queries.ts first");
    }
  }

  console.log("\n✅ Intelligence data fixes complete!");
  process.exit(0);
}

seedFixes().catch(console.error);

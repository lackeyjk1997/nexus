import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

const SIGNAL_TO_FUNCTION: Record<string, string> = {
  content_gap: "enablement",
  win_pattern: "enablement",
  competitive_intel: "product_marketing",
  field_intelligence: "product_marketing",
  process_friction: "deal_desk",
  deal_blocker: "deal_desk",
};

async function backfill() {
  console.log("🔄 Backfilling observation routing records...");

  // Get all support function members
  const supportMembers = await db.select().from(schema.supportFunctionMembers);
  const memberByFunction = new Map(supportMembers.map((m) => [m.function, m]));

  // Get all observations with classification
  const allObs = await db.select().from(schema.observations);

  // Check existing routing records to avoid duplicates
  const existingRouting = await db.select().from(schema.observationRouting);
  const routedObsIds = new Set(existingRouting.map((r) => r.observationId));

  let created = 0;
  for (const obs of allObs) {
    if (routedObsIds.has(obs.id)) continue;

    const classification = obs.aiClassification as { signals?: Array<{ type: string }> } | null;
    const signals = classification?.signals || [];

    for (const signal of signals) {
      const targetFunction = SIGNAL_TO_FUNCTION[signal.type];
      if (!targetFunction) continue;

      const targetMember = memberByFunction.get(targetFunction);

      await db.insert(schema.observationRouting).values({
        observationId: obs.id,
        targetFunction,
        targetMemberId: targetMember?.id || null,
        signalType: signal.type,
        status: "sent",
      });
      created++;
    }
  }

  console.log(`  ✓ Created ${created} routing records from ${allObs.length} observations`);
  console.log("✅ Backfill complete!");
  await client.end();
}

backfill().catch(console.error);

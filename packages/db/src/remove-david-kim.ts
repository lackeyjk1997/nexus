import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function main() {
  const [davidKim] = await db
    .select()
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.name, "David Kim"));

  if (!davidKim) {
    console.log("David Kim not found — already removed.");
    process.exit(0);
  }

  console.log(`Found David Kim: ${davidKim.id} (${davidKim.role}, ${davidKim.verticalSpecialization})`);

  // Clear FK references
  await db.update(schema.feedbackRequests).set({ approvedByMemberId: null }).where(eq(schema.feedbackRequests.approvedByMemberId, davidKim.id));
  await db.update(schema.deals).set({ assignedAeId: null }).where(eq(schema.deals.assignedAeId, davidKim.id));
  await db.update(schema.deals).set({ assignedBdrId: null }).where(eq(schema.deals.assignedBdrId, davidKim.id));
  await db.update(schema.deals).set({ assignedSaId: null }).where(eq(schema.deals.assignedSaId, davidKim.id));

  // Delete related records
  const configs = await db.select().from(schema.agentConfigs).where(eq(schema.agentConfigs.teamMemberId, davidKim.id));
  for (const c of configs) {
    await db.delete(schema.agentConfigVersions).where(eq(schema.agentConfigVersions.agentConfigId, c.id));
    await db.delete(schema.feedbackRequests).where(eq(schema.feedbackRequests.fromAgentConfigId, c.id));
    await db.delete(schema.agentActionsLog).where(eq(schema.agentActionsLog.agentConfigId, c.id));
  }
  await db.delete(schema.agentConfigs).where(eq(schema.agentConfigs.teamMemberId, davidKim.id));
  await db.delete(schema.notifications).where(eq(schema.notifications.teamMemberId, davidKim.id));
  await db.delete(schema.feedbackRequests).where(eq(schema.feedbackRequests.fromMemberId, davidKim.id));
  await db.delete(schema.activities).where(eq(schema.activities.teamMemberId, davidKim.id));
  await db.delete(schema.observations).where(eq(schema.observations.observerId, davidKim.id));

  // Delete the member
  await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, davidKim.id));
  console.log("✓ Removed David Kim and all references");

  // Verify SCs
  const scs = await db.select({ name: schema.teamMembers.name, role: schema.teamMembers.role }).from(schema.teamMembers).where(eq(schema.teamMembers.role, "SA"));
  console.log("Remaining SCs:", scs.map(s => s.name).join(", "));

  process.exit(0);
}

main().catch(console.error);

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function backfillEntities() {
  console.log("🔗 Backfilling entity links on existing observations...");

  const allAccounts = await db.select({ id: schema.companies.id, name: schema.companies.name }).from(schema.companies);
  const allDeals = await db
    .select({
      id: schema.deals.id,
      name: schema.deals.name,
      companyId: schema.deals.companyId,
      assignedAeId: schema.deals.assignedAeId,
    })
    .from(schema.deals);

  const allObs = await db.select().from(schema.observations);

  let updated = 0;
  for (const obs of allObs) {
    if (obs.linkedAccountIds && obs.linkedAccountIds.length > 0) continue; // already has entities

    const text = obs.rawInput.toLowerCase();
    const accountIds: string[] = [];
    const dealIds: string[] = [];

    // Fuzzy match accounts
    for (const account of allAccounts) {
      const firstName = account.name.split(" ")[0]!.toLowerCase();
      if (firstName.length >= 4 && text.includes(firstName)) {
        accountIds.push(account.id);
      }
    }

    // Fuzzy match deals
    for (const deal of allDeals) {
      const firstName = deal.name.split(" ")[0]!.toLowerCase();
      if (firstName.length >= 4 && text.includes(firstName)) {
        dealIds.push(deal.id);
        if (!accountIds.includes(deal.companyId)) {
          accountIds.push(deal.companyId);
        }
      }
    }

    // Also include deal from sourceContext
    const ctx = obs.sourceContext as { dealId?: string } | null;
    if (ctx?.dealId && !dealIds.includes(ctx.dealId)) {
      dealIds.push(ctx.dealId);
      const deal = allDeals.find((d) => d.id === ctx.dealId);
      if (deal && !accountIds.includes(deal.companyId)) {
        accountIds.push(deal.companyId);
      }
    }

    if (accountIds.length > 0 || dealIds.length > 0) {
      await db
        .update(schema.observations)
        .set({
          linkedAccountIds: accountIds.length > 0 ? accountIds : null,
          linkedDealIds: dealIds.length > 0 ? dealIds : null,
        })
        .where(eq(schema.observations.id, obs.id));
      updated++;
    }
  }

  console.log(`  ✓ Updated ${updated} of ${allObs.length} observations with entity links`);
  console.log("✅ Entity backfill complete!");
  await client.end();
}

backfillEntities().catch(console.error);

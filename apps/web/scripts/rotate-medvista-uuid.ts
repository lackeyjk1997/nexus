/**
 * Rotate MedVista's deal UUID to a fresh value.
 *
 * Why: a zombie dealAgent on Rivet Cloud is permanently bound to MedVista's
 * current UUID and cannot be destroyed (Rivet's destroy API hangs). Changing
 * the UUID in Supabase makes the pipeline call dealAgent.getOrCreate(...)
 * with a NEW key, spawning a fresh actor and bypassing the zombie entirely.
 *
 * What it does (one transaction):
 *   1. Find MedVista by company name "MedVista Health Systems"
 *   2. Clone the deal row with a fresh UUID (crypto.randomUUID)
 *   3. Repoint every FK column on 16 child tables OLD → NEW
 *   4. Repoint deal IDs inside 4 jsonb/text array columns OLD → NEW
 *   5. Delete the old MedVista deal row
 *
 * Run:
 *   cd apps/web && npm run rotate-medvista
 */

import "dotenv/config";
import crypto from "node:crypto";
import { db, deals, companies } from "@nexus/db";
import { eq, sql } from "drizzle-orm";

const COMPANY_NAME = "MedVista Health Systems";

async function main() {
  const newUuid = crypto.randomUUID();

  await db.transaction(async (tx) => {
    // 1. Resolve MedVista company → deal
    const [company] = await tx
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.name, COMPANY_NAME))
      .limit(1);
    if (!company) {
      throw new Error(`Company not found: "${COMPANY_NAME}"`);
    }

    const [oldDeal] = await tx
      .select()
      .from(deals)
      .where(eq(deals.companyId, company.id))
      .limit(1);
    if (!oldDeal) {
      throw new Error(`Deal not found for company "${COMPANY_NAME}" (id=${company.id})`);
    }

    const oldUuid = oldDeal.id;
    if (oldUuid === newUuid) {
      // Astronomically unlikely with crypto.randomUUID, but guard anyway.
      throw new Error("Generated UUID matches current UUID — aborting");
    }

    console.log(`\n=== Rotating MedVista deal UUID ===`);
    console.log(`  Company: ${company.name}`);
    console.log(`  OLD: ${oldUuid}`);
    console.log(`  NEW: ${newUuid}\n`);

    // 2. Clone the deal row with the new UUID. Strip id/createdAt/updatedAt
    // so DB defaults regenerate timestamps; everything else copied verbatim.
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...dealData } = oldDeal;
    void _id; void _createdAt; void _updatedAt;
    await tx.insert(deals).values({ id: newUuid, ...dealData });
    console.log(`  ✓ Cloned deal row (new UUID inserted)`);

    // 3. Repoint every FK column on 16 child tables.
    //    RETURNING id makes the result row count countable as result.length.
    const fkUpdates: Array<{ table: string; sqlText: ReturnType<typeof sql> }> = [
      { table: "deal_milestones",       sqlText: sql`UPDATE deal_milestones       SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "meddpicc_fields",       sqlText: sql`UPDATE meddpicc_fields       SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "deal_stage_history",    sqlText: sql`UPDATE deal_stage_history    SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "activities",            sqlText: sql`UPDATE activities            SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "email_sequences",       sqlText: sql`UPDATE email_sequences       SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "call_transcripts",      sqlText: sql`UPDATE call_transcripts      SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "agent_actions_log",     sqlText: sql`UPDATE agent_actions_log     SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "lead_scores",           sqlText: sql`UPDATE lead_scores           SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "notifications",         sqlText: sql`UPDATE notifications         SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "field_query_questions", sqlText: sql`UPDATE field_query_questions SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "cross_agent_feedback",  sqlText: sql`UPDATE cross_agent_feedback  SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "customer_messages",     sqlText: sql`UPDATE customer_messages     SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "account_health",        sqlText: sql`UPDATE account_health        SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "deal_fitness_events",   sqlText: sql`UPDATE deal_fitness_events   SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "deal_fitness_scores",   sqlText: sql`UPDATE deal_fitness_scores   SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
      { table: "deal_agent_states",     sqlText: sql`UPDATE deal_agent_states     SET deal_id = ${newUuid}::uuid WHERE deal_id = ${oldUuid}::uuid RETURNING id` },
    ];

    console.log(`  Repointing FK columns:`);
    for (const { table, sqlText } of fkUpdates) {
      const result = (await tx.execute(sqlText)) as unknown as { length: number };
      const count = result.length ?? 0;
      console.log(`    ${table.padEnd(24)} ${count} row(s)`);
    }

    // 4. Repoint deal IDs inside array columns (no FK constraint, but stale
    //    values would still confuse queries).
    console.log(`  Repointing array columns:`);
    const arrayUpdates: Array<{ table: string; sqlText: ReturnType<typeof sql> }> = [
      {
        table: "observations.linked_deal_ids",
        sqlText: sql`UPDATE observations
          SET linked_deal_ids = array_replace(linked_deal_ids, ${oldUuid}::uuid, ${newUuid}::uuid)
          WHERE ${oldUuid}::uuid = ANY(linked_deal_ids)
          RETURNING id`,
      },
      {
        table: "playbook_ideas.test_group_deals",
        sqlText: sql`UPDATE playbook_ideas
          SET test_group_deals = array_replace(test_group_deals, ${oldUuid}, ${newUuid})
          WHERE ${oldUuid} = ANY(test_group_deals)
          RETURNING id`,
      },
      {
        table: "playbook_ideas.control_group_deals",
        sqlText: sql`UPDATE playbook_ideas
          SET control_group_deals = array_replace(control_group_deals, ${oldUuid}, ${newUuid})
          WHERE ${oldUuid} = ANY(control_group_deals)
          RETURNING id`,
      },
      {
        table: "coordinator_patterns.deal_ids",
        sqlText: sql`UPDATE coordinator_patterns
          SET deal_ids = array_replace(deal_ids, ${oldUuid}, ${newUuid})
          WHERE ${oldUuid} = ANY(deal_ids)
          RETURNING id`,
      },
    ];
    for (const { table, sqlText } of arrayUpdates) {
      const result = (await tx.execute(sqlText)) as unknown as { length: number };
      const count = result.length ?? 0;
      console.log(`    ${table.padEnd(40)} ${count} row(s)`);
    }

    // 5. Delete the old MedVista deal row. All FKs now point to the new UUID,
    //    so this succeeds cleanly.
    await tx.execute(sql`DELETE FROM deals WHERE id = ${oldUuid}::uuid`);
    console.log(`  ✓ Deleted old deal row\n`);
  });

  console.log(`=== Rotation complete ===`);
  console.log(`MedVista's new UUID: ${newUuid}\n`);
  console.log(`Next steps:`);
  console.log(`  1. Set the env var on Vercel AND in apps/web/.env.local:`);
  console.log(`       MEDVISTA_DEAL_ID=${newUuid}`);
  console.log(`  2. Redeploy / restart so seed-data picks up the new UUID.`);
  console.log(`  3. The zombie dealAgent on key c0069b95-... is now orphaned`);
  console.log(`     and will never be hit by the pipeline again.\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n[rotate-medvista] FATAL:", err);
  process.exit(1);
});

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client);

async function main() {
  // 1. Dedup notifications (keep most recent per title+message+member)
  const dupResult = await db.execute(sql`
    DELETE FROM notifications n1
    USING notifications n2
    WHERE n1.id < n2.id
    AND n1.team_member_id = n2.team_member_id
    AND n1.title = n2.title
    AND n1.message = n2.message
  `);
  console.log("Deduped notifications:", dupResult.length, "removed");

  // 2. Delete test close/reopen activities on MedVista
  const medvista = await db.execute(sql`
    SELECT id FROM deals WHERE name ILIKE '%MedVista%' LIMIT 1
  `);
  if (medvista.length > 0) {
    const dealId = medvista[0].id;
    const delResult = await db.execute(sql`
      DELETE FROM activities
      WHERE deal_id = ${dealId}
      AND (
        subject ILIKE '%close%lost%'
        OR subject ILIKE '%field intel%close%'
        OR subject ILIKE '%stage changed from closed%'
        OR subject ILIKE '%deal closed lost%'
      )
      AND created_at > '2026-03-28'
    `);
    console.log("Deleted test activities on MedVista:", delResult.length, "removed");
  } else {
    console.log("MedVista deal not found — skipping activity cleanup");
  }

  // 3. Reset MedVista if still closed
  const resetResult = await db.execute(sql`
    UPDATE deals
    SET stage = 'negotiation',
        close_competitor = NULL, close_notes = NULL, close_improvement = NULL,
        win_turning_point = NULL, win_replicable = NULL, closed_at = NULL,
        close_ai_analysis = NULL, close_factors = NULL, win_factors = NULL,
        close_ai_ran_at_timestamp = NULL, loss_reason = NULL
    WHERE name ILIKE '%MedVista%' AND stage::text ILIKE '%closed%'
  `);
  console.log("Reset MedVista (if closed):", resetResult.length, "rows updated");

  await client.end();
  console.log("Done!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

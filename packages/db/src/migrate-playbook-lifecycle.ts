import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function migrate() {
  console.log("Adding playbook lifecycle columns...");

  await db.execute(sql`
    ALTER TABLE playbook_ideas
    ADD COLUMN IF NOT EXISTS test_group text[],
    ADD COLUMN IF NOT EXISTS control_group text[],
    ADD COLUMN IF NOT EXISTS success_thresholds jsonb,
    ADD COLUMN IF NOT EXISTS current_metrics jsonb,
    ADD COLUMN IF NOT EXISTS approved_by text,
    ADD COLUMN IF NOT EXISTS approved_at timestamp,
    ADD COLUMN IF NOT EXISTS graduated_at timestamp,
    ADD COLUMN IF NOT EXISTS experiment_duration_days integer DEFAULT 30,
    ADD COLUMN IF NOT EXISTS experiment_start timestamp,
    ADD COLUMN IF NOT EXISTS experiment_end timestamp,
    ADD COLUMN IF NOT EXISTS attribution jsonb
  `);

  console.log("Migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

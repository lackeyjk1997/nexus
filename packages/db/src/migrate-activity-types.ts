import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client);

async function migrate() {
  console.log("🔄 Migrating activity types from metadata.source to real enum values...");

  // Idempotent: only updates rows that still have the old type
  const callPrep = await db.execute(sql`
    UPDATE activities SET type = 'call_prep'
    WHERE type = 'note_added' AND metadata->>'source' = 'call_prep'
  `);
  console.log(`  call_prep: migrated`);

  const emailDraft = await db.execute(sql`
    UPDATE activities SET type = 'email_draft'
    WHERE type = 'note_added' AND metadata->>'source' = 'email_draft'
  `);
  console.log(`  email_draft: migrated`);

  const callAnalysis = await db.execute(sql`
    UPDATE activities SET type = 'call_analysis'
    WHERE type = 'note_added' AND metadata->>'source' = 'call_analysis'
  `);
  console.log(`  call_analysis: migrated`);

  const agentAction = await db.execute(sql`
    UPDATE activities SET type = 'call_prep'
    WHERE type = 'note_added' AND metadata->>'source' = 'agent_action'
      AND (subject ILIKE '%call prep%' OR subject ILIKE '%AI Call Prep%')
  `);
  console.log(`  agent_action (call prep): migrated`);

  const agentEmail = await db.execute(sql`
    UPDATE activities SET type = 'email_draft'
    WHERE type = 'note_added' AND metadata->>'source' = 'agent_action'
      AND (subject ILIKE '%email draft%' OR subject ILIKE '%follow-up email%')
  `);
  console.log(`  agent_action (email draft): migrated`);

  // Verify
  const counts = await db.execute(sql`
    SELECT type, count(*) as cnt FROM activities GROUP BY type ORDER BY type
  `);
  console.log("\n📊 Activity type distribution:");
  for (const row of counts) {
    console.log(`  ${row.type}: ${row.cnt}`);
  }

  // Check for remaining metadata.source workarounds
  const remaining = await db.execute(sql`
    SELECT type, metadata->>'source' as source, count(*) as cnt
    FROM activities
    WHERE type = 'note_added' AND metadata->>'source' IS NOT NULL
    GROUP BY type, metadata->>'source'
    ORDER BY cnt DESC
  `);
  if (remaining.length > 0) {
    console.log("\n⚠ Remaining note_added with metadata.source:");
    for (const row of remaining) {
      console.log(`  source=${row.source}: ${row.cnt}`);
    }
  } else {
    console.log("\n✅ No remaining metadata.source workarounds!");
  }

  console.log("\n🔄 Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

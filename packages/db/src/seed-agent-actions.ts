import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, ilike, and } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function seedAgentActions() {
  console.log("🤖 Seeding agent action activities on MedCore Enterprise deal...");

  // Find Sarah Chen
  const [sarah] = await db
    .select({ id: schema.teamMembers.id, name: schema.teamMembers.name })
    .from(schema.teamMembers)
    .where(ilike(schema.teamMembers.name, "%sarah%"))
    .limit(1);

  if (!sarah) {
    console.log("  ⚠ Could not find Sarah Chen — trying any AE...");
  }

  // Find MedCore Enterprise deal
  // Try MedVista (actual seeded company for healthcare) or first healthcare deal
  const [medcoreDeal] = await db
    .select({ id: schema.deals.id, name: schema.deals.name, companyName: schema.companies.name })
    .from(schema.deals)
    .leftJoin(schema.companies, eq(schema.deals.companyId, schema.companies.id))
    .where(ilike(schema.companies.name, "%med%"))
    .limit(1);

  if (!medcoreDeal) {
    console.log("  ⚠ Could not find MedCore deal — skipping.");
    await client.end();
    return;
  }

  console.log(`  Found deal: ${medcoreDeal.name} (${medcoreDeal.companyName})`);

  const memberId = sarah?.id || (
    await db
      .select({ id: schema.teamMembers.id })
      .from(schema.teamMembers)
      .where(eq(schema.teamMembers.role, "AE"))
      .limit(1)
  )[0]?.id;

  if (!memberId) {
    console.log("  ⚠ No AE found. Skipping seed.");
    await client.end();
    return;
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  // Insert call prep activity
  await db.insert(schema.activities).values({
    dealId: medcoreDeal.id,
    teamMemberId: memberId,
    type: "note_added",
    subject: "AI Call Prep Generated",
    description:
      "Call prep brief for MedCore Health Systems. Key focus: Address GDPR compliance questions — 3 other reps hit the same wall this quarter. CompetitorX is offering free pilots.",
    metadata: { source: "agent_action", action: "call_prep" },
    createdAt: oneDayAgo,
  });

  // Insert email draft activity
  await db.insert(schema.activities).values({
    dealId: medcoreDeal.id,
    teamMemberId: memberId,
    type: "note_added",
    subject: "Follow-up email drafted for Oliver Laurent",
    description:
      "AI-drafted follow-up email. Subject: Next steps on Claude Enterprise integration",
    metadata: { source: "agent_action", action: "email_draft" },
    createdAt: twelveHoursAgo,
  });

  console.log("  ✓ Created call prep activity (1 day ago)");
  console.log("  ✓ Created email draft activity (12 hours ago)");
  console.log("✅ Agent action seed complete!");

  await client.end();
}

seedAgentActions().catch(console.error);

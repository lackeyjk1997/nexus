import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

async function seedCrossFeedback() {
  console.log("🔄 Seeding cross-agent feedback and enriching configs...\n");

  // Get all team members
  const allMembers = await db.select().from(schema.teamMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name);

  const sarah = byName("Sarah Chen");
  const alex = byName("Alex Kim");
  const ryan = byName("Ryan Foster");
  const maya = byName("Maya Johnson");
  const tom = byName("Tom Bradley");
  const nina = byName("Nina Patel");
  const chris = byName("Chris Okafor");
  const priya = byName("Priya Sharma");
  const david = byName("David Park");

  if (!sarah || !alex || !ryan || !maya || !tom || !nina || !chris) {
    console.error("Missing required team members");
    process.exit(1);
  }

  // ── Clear existing cross-agent feedback ──
  await db.delete(schema.crossAgentFeedback);
  console.log("  ✓ Cleared existing cross-agent feedback");

  // ── Insert cross-agent feedback records ──
  const feedbackRecords = [
    // Alex Kim → Sarah Chen
    {
      sourceMemberId: alex.id,
      targetMemberId: sarah.id,
      content: "Always introduce compliance and AI review board processes early in healthcare deals — customers expect this before procurement discussions. Delays of 4-6 weeks are common when compliance is raised late.",
      vertical: "healthcare" as const,
    },
    // Alex Kim → Sarah Chen (account-specific)
    {
      sourceMemberId: alex.id,
      targetMemberId: sarah.id,
      content: "For MedVista specifically, anchor on EU data residency as the key competitive differentiator against Microsoft Copilot. Their CFO Emma Mueller cares deeply about GDPR compliance.",
      vertical: "healthcare" as const,
    },
    // Alex Kim → Ryan Foster
    {
      sourceMemberId: alex.id,
      targetMemberId: ryan.id,
      content: "HealthFirst has strict HIPAA requirements beyond the standard — make sure to mention our FedRAMP authorization path in initial conversations. Their compliance team will ask about it.",
      vertical: "healthcare" as const,
    },
    // Maya Johnson → Priya Sharma
    ...(priya ? [{
      sourceMemberId: maya.id,
      targetMemberId: priya.id,
      content: "Tech vertical prospects respond better to architecture deep-dives than slide decks. Adjust call prep to include more technical depth and fewer marketing messages.",
      vertical: "technology" as const,
    }] : []),
    // Nina Patel → Ryan Foster (account-specific)
    {
      sourceMemberId: nina.id,
      targetMemberId: ryan.id,
      content: "HealthFirst has had 3 support escalations about API response times in the last quarter. Proactively mention our performance monitoring roadmap — don't wait for them to bring it up.",
      vertical: "healthcare" as const,
    },
    // Tom Bradley → David Park
    ...(david ? [{
      sourceMemberId: tom.id,
      targetMemberId: david.id,
      content: "FinServ compliance teams want to see SOC 2 Type II documentation before even having a pricing conversation. Lead with security credentials, not product features.",
      vertical: "financial_services" as const,
    }] : []),
    // Nina Patel → Sarah Chen (implementation timeline)
    {
      sourceMemberId: nina.id,
      targetMemberId: sarah.id,
      content: "Healthcare customers consistently underestimate implementation timelines — expect 2 weeks but it's always 6-8. Set realistic expectations early in the negotiation stage to avoid post-sale friction.",
      vertical: "healthcare" as const,
    },
    // Chris Okafor → Priya Sharma
    ...(priya ? [{
      sourceMemberId: chris.id,
      targetMemberId: priya.id,
      content: "Tech accounts expect rapid deployment timelines under 30 days. If you can't commit to that, flag it early — don't let it surface during procurement.",
      vertical: "technology" as const,
    }] : []),
  ];

  for (const record of feedbackRecords) {
    await db.insert(schema.crossAgentFeedback).values(record);
  }
  console.log(`  ✓ Inserted ${feedbackRecords.length} cross-agent feedback records`);

  // ── Enrich SC/CSM agent configs with vertical-specific insights ──
  console.log("\n📝 Enriching agent configs...");

  // Alex Kim — verify his config already has the Sarah Chen note
  const [alexConfig] = await db
    .select()
    .from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.teamMemberId, alex.id))
    .limit(1);

  if (alexConfig && !alexConfig.instructions.includes("Special note for Sarah Chen")) {
    await db
      .update(schema.agentConfigs)
      .set({
        instructions: alexConfig.instructions + " Special note for Sarah Chen: Proactively introduce compliance topics and AI review board processes early in the sales cycle with healthcare customers.",
        updatedAt: new Date(),
      })
      .where(eq(schema.agentConfigs.id, alexConfig.id));
    console.log("  ✓ Added Sarah Chen note to Alex Kim's config");
  } else {
    console.log("  ✓ Alex Kim's config already has Sarah Chen note");
  }

  // Maya Johnson (SA, Technology + Government)
  const [mayaConfig] = await db
    .select()
    .from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.teamMemberId, maya.id))
    .limit(1);

  if (mayaConfig) {
    const enrichedInstructions = "Technical pre-sales for Technology and Government. Expert in API architecture, security, and large-scale deployments. For tech vertical deals, always recommend live architecture demos over slide presentations. For government deals, emphasize FedRAMP authorization status and data sovereignty capabilities.";
    await db
      .update(schema.agentConfigs)
      .set({ instructions: enrichedInstructions, updatedAt: new Date() })
      .where(eq(schema.agentConfigs.id, mayaConfig.id));
    console.log("  ✓ Enriched Maya Johnson's config with vertical insights");
  }

  // Tom Bradley (SA, Media & FinServ)
  const [tomConfig] = await db
    .select()
    .from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.teamMemberId, tom.id))
    .limit(1);

  if (tomConfig) {
    const enrichedInstructions = "Technical pre-sales spanning Media & Entertainment and Financial Services. Focus on creative workflows and data security. FinServ customers prioritize security certifications above all else — SOC 2 Type II, ISO 27001, and private cloud options must be discussed in the first two meetings. For media deals, focus on content processing scale and real-time capabilities.";
    await db
      .update(schema.agentConfigs)
      .set({ instructions: enrichedInstructions, updatedAt: new Date() })
      .where(eq(schema.agentConfigs.id, tomConfig.id));
    console.log("  ✓ Enriched Tom Bradley's config with vertical insights");
  }

  // Nina Patel (CSM, Healthcare + FinServ)
  const [ninaConfig] = await db
    .select()
    .from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.teamMemberId, nina.id))
    .limit(1);

  if (ninaConfig) {
    const enrichedInstructions = "Post-sale success for Healthcare and Financial Services. Monitor health scores, prepare QBRs, identify expansion opportunities. Flag implementation timeline risks early. Healthcare accounts are highly sensitive to downtime — always have SLA documentation ready. HealthFirst has had recent API latency issues. TrustBank requires quarterly compliance reviews.";
    await db
      .update(schema.agentConfigs)
      .set({ instructions: enrichedInstructions, updatedAt: new Date() })
      .where(eq(schema.agentConfigs.id, ninaConfig.id));
    console.log("  ✓ Enriched Nina Patel's config with vertical insights");
  }

  // Chris Okafor (CSM, Technology + Government + Media)
  const [chrisConfig] = await db
    .select()
    .from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.teamMemberId, chris.id))
    .limit(1);

  if (chrisConfig) {
    const enrichedInstructions = "Post-sale success for Technology, Government, and Media. Focus on adoption metrics, technical support escalation, and renewal preparation. Government customers require extended procurement timelines — budget 6-9 months for enterprise deals. Always identify the contracting officer early. Tech accounts expect rapid deployment timelines under 30 days.";
    await db
      .update(schema.agentConfigs)
      .set({ instructions: enrichedInstructions, updatedAt: new Date() })
      .where(eq(schema.agentConfigs.id, chrisConfig.id));
    console.log("  ✓ Enriched Chris Okafor's config with vertical insights");
  }

  console.log("\n✅ Cross-agent feedback seed complete!");
  process.exit(0);
}

seedCrossFeedback().catch(console.error);

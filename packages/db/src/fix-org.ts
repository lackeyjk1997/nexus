import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, inArray, and } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function fixOrg() {
  console.log("🔧 Fixing org roster...");

  const allMembers = await db.select().from(schema.teamMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name);

  // 1. Remove duplicate/extra members not on the target roster
  const toRemove = ["Kate Jensen", "Jake Morrison", "Amara Okafor", "Rachel Torres", "Liam Foster"];

  for (const name of toRemove) {
    const member = byName(name);
    if (!member) continue;

    // Clear FK references pointing TO this member
    await db.update(schema.feedbackRequests).set({ approvedByMemberId: null }).where(eq(schema.feedbackRequests.approvedByMemberId, member.id));
    await db.update(schema.deals).set({ assignedAeId: null }).where(eq(schema.deals.assignedAeId, member.id));
    await db.update(schema.deals).set({ assignedBdrId: null }).where(eq(schema.deals.assignedBdrId, member.id));
    await db.update(schema.deals).set({ assignedSaId: null }).where(eq(schema.deals.assignedSaId, member.id));

    // Delete agent config versions, feedback, notifications, configs for this member
    const configs = await db.select().from(schema.agentConfigs).where(eq(schema.agentConfigs.teamMemberId, member.id));
    for (const c of configs) {
      await db.delete(schema.agentConfigVersions).where(eq(schema.agentConfigVersions.agentConfigId, c.id));
      await db.delete(schema.feedbackRequests).where(eq(schema.feedbackRequests.fromAgentConfigId, c.id));
      await db.delete(schema.agentActionsLog).where(eq(schema.agentActionsLog.agentConfigId, c.id));
    }
    await db.delete(schema.agentConfigs).where(eq(schema.agentConfigs.teamMemberId, member.id));
    await db.delete(schema.notifications).where(eq(schema.notifications.teamMemberId, member.id));
    await db.delete(schema.feedbackRequests).where(eq(schema.feedbackRequests.fromMemberId, member.id));

    // Remove activities referencing this member
    await db.delete(schema.activities).where(eq(schema.activities.teamMemberId, member.id));

    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, member.id));
    console.log(`  ✓ Removed ${name}`);
  }

  // 2. Rename "Marcus Rodriguez" to "David Park" and change to Financial Services AE
  const marcusR = byName("Marcus Rodriguez");
  if (marcusR) {
    await db.update(schema.teamMembers).set({
      name: "David Park",
      email: "david.park@anthropic.com",
      verticalSpecialization: "financial_services",
    }).where(eq(schema.teamMembers.id, marcusR.id));

    // Update agent config name
    await db.update(schema.agentConfigs).set({
      agentName: "David's AE Agent",
      instructions: "Enterprise financial services seller. Deep knowledge of banking regulations, SOC2 compliance, and fintech adoption patterns. Lead with risk reduction and regulatory compliance.",
      outputPreferences: {
        industryFocus: ["Financial Services"],
        communicationStyle: "Formal, data-driven, compliance-aware",
        toolsEnabled: ["email_drafting", "call_prep", "deal_scoring", "research"],
        guardrails: ["Always reference SOC2/PCI compliance", "Never promise integration timelines without SC confirmation"],
        verbosity: "balanced",
      },
      version: 3,
    }).where(eq(schema.agentConfigs.teamMemberId, marcusR.id));

    console.log("  ✓ Renamed Marcus Rodriguez → David Park (AE, Financial Services)");
  }

  // Refresh member list after changes
  const updatedMembers = await db.select().from(schema.teamMembers);
  const by = (name: string) => updatedMembers.find((m) => m.name === name)!;

  // 3. Fix James Wilson vertical to "general" (Government not in enum, use general)
  const james = by("James Wilson");
  if (james) {
    await db.update(schema.teamMembers).set({ verticalSpecialization: "general" }).where(eq(schema.teamMembers.id, james.id));
  }

  // 4. Fix Elena Rodriguez vertical
  const elena = by("Elena Rodriguez");
  if (elena) {
    await db.update(schema.teamMembers).set({ verticalSpecialization: "general" }).where(eq(schema.teamMembers.id, elena.id));
  }

  // 5. Now add rich cross-agent version history for more connections
  const allConfigs = await db.select().from(schema.agentConfigs);
  const configFor = (memberName: string) => {
    const member = by(memberName);
    return member ? allConfigs.find((c) => c.teamMemberId === member.id) : null;
  };

  const crossAgentUpdates = [
    // Nina (CSM) → David Park (AE) — implementation timeline
    {
      configName: "David Park",
      version: 4,
      fromUser: "Nina Patel",
      fromRole: "CSM",
      changeReason: "Added implementation timeline discussion to proposal stage. Based on feedback from Nina Patel (CSM): 'Financial services clients need realistic implementation expectations — they budget 2 months but it always takes 4'",
      createdAt: daysAgo(5),
    },
    // Maya (SC) → Priya (AE) — competitor positioning
    {
      configName: "Priya Sharma",
      version: 2,
      fromUser: "Maya Johnson",
      fromRole: "SC",
      changeReason: "Added competitor X technical differentiation points. Based on feedback from Maya Johnson (SC): 'Tech prospects always benchmark against competitor X — need API latency and context window comparisons ready'",
      createdAt: daysAgo(4),
    },
    // Maya (SC) → James Wilson (AE) — FedRAMP
    {
      configName: "James Wilson",
      version: 3,
      fromUser: "Maya Johnson",
      fromRole: "SC",
      changeReason: "Added FedRAMP authorization status to all government call prep. Based on feedback from Maya Johnson (SC): 'Government prospects ask about FedRAMP in every single call — AEs need this upfront'",
      createdAt: daysAgo(4),
    },
    // Jordan (SDR) → Sarah (AE) — lead quality
    {
      configName: "Sarah Chen",
      version: 7,
      fromUser: "Jordan Lee",
      fromRole: "SDR",
      changeReason: "Enhanced lead qualification criteria for healthcare. Based on feedback from Jordan Lee (SDR): 'Healthcare leads that mention EHR integration are 3x more likely to close — flagging these in handoff notes'",
      createdAt: daysAgo(3),
    },
    // Chris (CSM) → Priya (AE) — onboarding expectations
    {
      configName: "Priya Sharma",
      version: 3,
      fromUser: "Chris Okafor",
      fromRole: "CSM",
      changeReason: "Added developer onboarding timeline to proposals. Based on feedback from Chris Okafor (CSM): 'Tech customers expect self-serve but still need 2-week guided onboarding — set this expectation during negotiation'",
      createdAt: daysAgo(2),
    },
    // Tom (SC) → Elena (AE) — creative workflow demos
    {
      configName: "Elena Rodriguez",
      version: 3,
      fromUser: "Tom Bradley",
      fromRole: "SC",
      changeReason: "Added creative workflow demo preparation to technical validation. Based on feedback from Tom Bradley (SC): 'Media prospects need to see content generation speed — always include a live demo of editorial workflow'",
      createdAt: daysAgo(3),
    },
    // Tom (SC) → David Park (AE) — data residency
    {
      configName: "David Park",
      version: 5,
      fromUser: "Tom Bradley",
      fromRole: "SC",
      changeReason: "Added EU data residency talking points. Based on feedback from Tom Bradley (SC): 'European financial services prospects always ask about data residency — need prepared answers about EU data centers'",
      createdAt: daysAgo(2),
    },
    // Casey (SDR) → James Wilson (AE) — gov procurement
    {
      configName: "James Wilson",
      version: 4,
      fromUser: "Casey Martinez",
      fromRole: "SDR",
      changeReason: "Added fiscal year budget cycle awareness. Based on feedback from Casey Martinez (SDR): 'Government leads that come in Q3-Q4 need different urgency messaging because of fiscal year budget deadlines'",
      createdAt: daysAgo(1),
    },
    // Sarah (AE) → Jordan (SDR) — qualification criteria
    {
      configName: "Jordan Lee",
      version: 4,
      fromUser: "Sarah Chen",
      fromRole: "AE",
      changeReason: "Added HIPAA readiness as a qualification criterion. Based on feedback from Sarah Chen (AE): 'Don't pass me healthcare leads that haven't confirmed they have a compliance team — it wastes a discovery call'",
      createdAt: daysAgo(2),
    },
    // David Park (AE) → Casey (SDR) — budget qualification
    {
      configName: "Casey Martinez",
      version: 4,
      fromUser: "David Park",
      fromRole: "AE",
      changeReason: "Added earlier budget qualification for financial services. Based on feedback from David Park (AE): 'FS leads need budget confirmed before handoff — too many discovery calls with no budget authority'",
      createdAt: daysAgo(3),
    },
  ];

  for (const update of crossAgentUpdates) {
    const config = configFor(update.configName);
    if (!config) {
      console.log(`  ⚠ Config not found for ${update.configName}`);
      continue;
    }

    await db.insert(schema.agentConfigVersions).values({
      agentConfigId: config.id,
      version: update.version,
      instructions: `Updated via cross-agent feedback from ${update.fromUser}`,
      outputPreferences: {
        crossAgentUpdate: true,
        fromUser: update.fromUser,
        fromRole: update.fromRole,
      },
      changedBy: "feedback_loop",
      changeReason: update.changeReason,
      createdAt: update.createdAt,
    });
  }
  console.log(`  ✓ Added ${crossAgentUpdates.length} cross-agent version entries`);

  // Update version numbers on affected configs
  const versionUpdates: Record<string, number> = {
    "David Park": 5,
    "Priya Sharma": 3,
    "James Wilson": 4,
    "Sarah Chen": 7,
    "Elena Rodriguez": 3,
    "Jordan Lee": 4,
    "Casey Martinez": 4,
  };

  for (const [name, version] of Object.entries(versionUpdates)) {
    const config = configFor(name);
    if (config) {
      await db.update(schema.agentConfigs).set({ version }).where(eq(schema.agentConfigs.id, config.id));
    }
  }
  console.log("  ✓ Updated version numbers on affected configs");

  // Verify final state
  const finalMembers = await db.select().from(schema.teamMembers);
  console.log(`\n=== FINAL ROSTER (${finalMembers.length} members) ===`);
  finalMembers.forEach((m) =>
    console.log(`  ${m.role.padEnd(8)} ${m.name.padEnd(22)} ${m.verticalSpecialization}`)
  );

  const finalVersions = await db.select().from(schema.agentConfigVersions);
  const crossCount = finalVersions.filter((v) => {
    const prefs = v.outputPreferences as Record<string, unknown> | null;
    return prefs?.crossAgentUpdate;
  }).length;
  console.log(`\nCross-agent connections: ${crossCount}`);

  process.exit(0);
}

fixOrg().catch(console.error);

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, inArray } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function uuid() { return crypto.randomUUID(); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

async function seedOrg() {
  console.log("🏢 Seeding expanded org...");

  // Get existing team members
  const existing = await db.select().from(schema.teamMembers);
  const existingNames = new Set(existing.map((m) => m.name));

  // New team members to add (keeping existing ones)
  const newMembers = [
    { name: "Marcus Thompson", email: "marcus.thompson@anthropic.com", role: "MANAGER" as const, verticalSpecialization: "general" as const, capacityTarget: 0 },
    { name: "Ryan Foster", email: "ryan.foster@anthropic.com", role: "AE" as const, verticalSpecialization: "healthcare" as const, capacityTarget: 12 },
    { name: "James Wilson", email: "james.wilson@anthropic.com", role: "AE" as const, verticalSpecialization: "general" as const, capacityTarget: 10 },
    { name: "Elena Rodriguez", email: "elena.rodriguez@anthropic.com", role: "AE" as const, verticalSpecialization: "general" as const, capacityTarget: 10 },
    { name: "Alex Kim", email: "alex.kim@anthropic.com", role: "SA" as const, verticalSpecialization: "healthcare" as const, capacityTarget: 8 },
    { name: "Maya Johnson", email: "maya.johnson@anthropic.com", role: "SA" as const, verticalSpecialization: "technology" as const, capacityTarget: 8 },
    { name: "Tom Bradley", email: "tom.bradley@anthropic.com", role: "SA" as const, verticalSpecialization: "general" as const, capacityTarget: 8 },
    { name: "Jordan Lee", email: "jordan.lee@anthropic.com", role: "BDR" as const, verticalSpecialization: "healthcare" as const, capacityTarget: 25 },
    { name: "Casey Martinez", email: "casey.martinez@anthropic.com", role: "BDR" as const, verticalSpecialization: "financial_services" as const, capacityTarget: 25 },
    { name: "Nina Patel", email: "nina.patel@anthropic.com", role: "CSM" as const, verticalSpecialization: "healthcare" as const, capacityTarget: 15 },
    { name: "Chris Okafor", email: "chris.okafor@anthropic.com", role: "CSM" as const, verticalSpecialization: "technology" as const, capacityTarget: 15 },
  ].filter((m) => !existingNames.has(m.name));

  if (newMembers.length > 0) {
    await db.insert(schema.teamMembers).values(newMembers);
    console.log(`  ✓ Added ${newMembers.length} new team members`);
  }

  // Get all members now
  const allMembers = await db.select().from(schema.teamMembers);
  const byName = (name: string) => allMembers.find((m) => m.name === name)!;

  // Existing members from session 1 that map to our org:
  // Sarah Chen = AE Healthcare (existing)
  // Priya Sharma = AE Technology (existing)
  // David Kim = SA (existing, now renamed role-wise to "David Park" conceptually - we'll use existing)
  // The new members fill out the org

  const sarah = byName("Sarah Chen");
  const priya = byName("Priya Sharma");
  const marcus = byName("Marcus Thompson") || byName("Kate Jensen"); // VP
  const ryan = byName("Ryan Foster");
  const james = byName("James Wilson");
  const elena = byName("Elena Rodriguez");
  const alex = byName("Alex Kim");
  const maya = byName("Maya Johnson");
  const tom = byName("Tom Bradley");
  const jordan = byName("Jordan Lee");
  const casey = byName("Casey Martinez");
  const nina = byName("Nina Patel");
  const chris = byName("Chris Okafor");

  // Create agent configs for new members (if they don't have one)
  const existingConfigs = await db.select().from(schema.agentConfigs);
  const configuredMembers = new Set(existingConfigs.map((c) => c.teamMemberId));

  const newAgentConfigs: {
    memberId: string;
    name: string;
    roleType: (typeof schema.agentRoleTypeEnum.enumValues)[number];
    instructions: string;
    outputPreferences: Record<string, unknown>;
    version: number;
  }[] = [];

  if (ryan && !configuredMembers.has(ryan.id)) {
    newAgentConfigs.push({
      memberId: ryan.id,
      name: "Ryan's Sales Agent",
      roleType: "ae",
      instructions: "Consultative healthcare seller. Focus on health systems and clinical workflow automation. Lead with patient outcome data.",
      outputPreferences: { industryFocus: ["Healthcare"], communicationStyle: "Data-driven, clinical precision", toolsEnabled: ["email_drafting", "call_prep", "deal_scoring"], guardrails: ["Never promise HIPAA compliance without legal review"], verbosity: "balanced" },
      version: 3,
    });
  }

  if (james && !configuredMembers.has(james.id)) {
    newAgentConfigs.push({
      memberId: james.id,
      name: "James's Gov Agent",
      roleType: "ae",
      instructions: "Government sales specialist. Understand procurement cycles, FedRAMP requirements, and public sector budget processes.",
      outputPreferences: { industryFocus: ["Government"], communicationStyle: "Formal, compliance-aware", toolsEnabled: ["email_drafting", "call_prep", "research"], guardrails: ["Always reference FedRAMP status"], verbosity: "detailed" },
      version: 2,
    });
  }

  if (elena && !configuredMembers.has(elena.id)) {
    newAgentConfigs.push({
      memberId: elena.id,
      name: "Elena's Media Agent",
      roleType: "ae",
      instructions: "Creative industry seller. Focus on content creation workflows, production efficiency, and creative team adoption.",
      outputPreferences: { industryFocus: ["Media & Entertainment"], communicationStyle: "Creative, energetic, outcome-focused", toolsEnabled: ["email_drafting", "call_prep", "objection_handling"], verbosity: "compact" },
      version: 2,
    });
  }

  if (alex && !configuredMembers.has(alex.id)) {
    newAgentConfigs.push({
      memberId: alex.id,
      name: "Alex's SC Agent",
      roleType: "sa",
      instructions: "Technical pre-sales for Healthcare and Financial Services. Deep knowledge of compliance (HIPAA, SOC2), data residency, and enterprise integration patterns.",
      outputPreferences: { industryFocus: ["Healthcare", "Financial Services"], communicationStyle: "Technical depth, compliance-aware", toolsEnabled: ["call_prep", "objection_handling", "research"], guardrails: ["Always include compliance checklist in demo prep"], dealStageRules: { technical_validation: "Prepare HIPAA/SOC2 readiness matrix", proposal: "Include integration architecture diagram" }, verbosity: "detailed" },
      version: 6,
    });
  }

  if (maya && !configuredMembers.has(maya.id)) {
    newAgentConfigs.push({
      memberId: maya.id,
      name: "Maya's SC Agent",
      roleType: "sa",
      instructions: "Technical pre-sales for Technology and Government. Expert in API architecture, security, and large-scale deployments.",
      outputPreferences: { industryFocus: ["Technology", "Government"], communicationStyle: "Developer-friendly, technical precision", toolsEnabled: ["call_prep", "research", "objection_handling"], verbosity: "detailed" },
      version: 3,
    });
  }

  if (tom && !configuredMembers.has(tom.id)) {
    newAgentConfigs.push({
      memberId: tom.id,
      name: "Tom's SC Agent",
      roleType: "sa",
      instructions: "Technical pre-sales spanning Media & Entertainment and Financial Services. Focus on creative workflows and data security.",
      outputPreferences: { industryFocus: ["Media & Entertainment", "Financial Services"], communicationStyle: "Adaptable, clear explanations", toolsEnabled: ["call_prep", "research"], verbosity: "balanced" },
      version: 2,
    });
  }

  if (jordan && !configuredMembers.has(jordan.id)) {
    newAgentConfigs.push({
      memberId: jordan.id,
      name: "Jordan's SDR Agent",
      roleType: "bdr",
      instructions: "Outbound prospecting for Healthcare and Technology verticals. Research-heavy, personalized outreach. Qualify on budget and timeline.",
      outputPreferences: { industryFocus: ["Healthcare", "Technology"], communicationStyle: "Concise, value-first", toolsEnabled: ["email_drafting", "research"], verbosity: "compact" },
      version: 3,
    });
  }

  if (casey && !configuredMembers.has(casey.id)) {
    newAgentConfigs.push({
      memberId: casey.id,
      name: "Casey's SDR Agent",
      roleType: "bdr",
      instructions: "Outbound prospecting for Financial Services, Government, and Media. Compliance-aware messaging. Earlier budget qualification for FS.",
      outputPreferences: { industryFocus: ["Financial Services", "Government", "Media & Entertainment"], communicationStyle: "Professional, compliance-aware", toolsEnabled: ["email_drafting", "research"], guardrails: ["Follow 3-touch minimum sequence"], verbosity: "compact" },
      version: 3,
    });
  }

  if (nina && !configuredMembers.has(nina.id)) {
    newAgentConfigs.push({
      memberId: nina.id,
      name: "Nina's CSM Agent",
      roleType: "csm",
      instructions: "Post-sale success for Healthcare and Financial Services. Monitor health scores, prepare QBRs, identify expansion opportunities. Flag implementation timeline risks early.",
      outputPreferences: { industryFocus: ["Healthcare", "Financial Services"], communicationStyle: "Empathetic, proactive", toolsEnabled: ["deal_scoring", "research"], verbosity: "balanced" },
      version: 3,
    });
  }

  if (chris && !configuredMembers.has(chris.id)) {
    newAgentConfigs.push({
      memberId: chris.id,
      name: "Chris's CSM Agent",
      roleType: "csm",
      instructions: "Post-sale success for Technology, Government, and Media. Focus on adoption metrics, technical support escalation, and renewal preparation.",
      outputPreferences: { industryFocus: ["Technology", "Government", "Media & Entertainment"], communicationStyle: "Technical, solutions-oriented", toolsEnabled: ["deal_scoring", "research"], verbosity: "balanced" },
      version: 2,
    });
  }

  // Marcus/VP config
  if (marcus && !configuredMembers.has(marcus.id)) {
    newAgentConfigs.push({
      memberId: marcus.id,
      name: "Marcus's VP Agent",
      roleType: "manager",
      instructions: "Sales leadership agent. Monitor pipeline health, forecast accuracy, team capacity, and cross-vertical patterns. Surface coaching opportunities.",
      outputPreferences: { industryFocus: ["All"], communicationStyle: "Executive, data-driven", toolsEnabled: ["deal_scoring", "research"], verbosity: "compact" },
      version: 2,
    });
  }

  const configIds: Record<string, string> = {};
  for (const ac of newAgentConfigs) {
    const id = uuid();
    configIds[ac.memberId] = id;
    await db.insert(schema.agentConfigs).values({
      id,
      teamMemberId: ac.memberId,
      agentName: ac.name,
      roleType: ac.roleType,
      instructions: ac.instructions,
      outputPreferences: ac.outputPreferences,
      version: ac.version,
      isActive: true,
    });
  }
  console.log(`  ✓ Created ${newAgentConfigs.length} new agent configs`);

  // Map all config IDs
  const allConfigs = await db.select().from(schema.agentConfigs);
  for (const c of allConfigs) {
    configIds[c.teamMemberId] = c.id;
  }

  // ── Cross-agent version history ──
  // Alex's feedback flowing to Sarah and Ryan
  if (alex && sarah && configIds[sarah.id]) {
    await db.insert(schema.agentConfigVersions).values({
      agentConfigId: configIds[sarah.id]!,
      version: 5,
      instructions: sarah ? "Updated with HIPAA prep" : "",
      outputPreferences: { crossAgentUpdate: true, fromUser: "Alex Kim", fromRole: "SC" },
      changedBy: "feedback_loop",
      changeReason: "Added HIPAA compliance prep to discovery stage. Based on feedback from Alex Kim (SC): 'Every healthcare prospect asks about HIPAA in first 5 minutes'",
      createdAt: daysAgo(3),
    });
  }

  if (ryan && configIds[ryan.id]) {
    await db.insert(schema.agentConfigVersions).values({
      agentConfigId: configIds[ryan.id]!,
      version: 4,
      instructions: "Updated with HIPAA prep",
      outputPreferences: { crossAgentUpdate: true, fromUser: "Alex Kim", fromRole: "SC" },
      changedBy: "feedback_loop",
      changeReason: "Added HIPAA compliance prep to discovery stage. Based on feedback from Alex Kim (SC): 'Every healthcare prospect asks about HIPAA in first 5 minutes'",
      createdAt: daysAgo(3),
    });
  }

  // Nina's feedback flowing to AEs
  if (nina && sarah && configIds[sarah.id]) {
    await db.insert(schema.agentConfigVersions).values({
      agentConfigId: configIds[sarah.id]!,
      version: 6,
      instructions: "Updated with implementation timeline guidance",
      outputPreferences: { crossAgentUpdate: true, fromUser: "Nina Patel", fromRole: "CSM" },
      changedBy: "feedback_loop",
      changeReason: "Added implementation timeline discussion to negotiation stage. Based on feedback from Nina Patel (CSM): 'Healthcare customers underestimate implementation — expect 2 weeks but it's always 6-8'",
      createdAt: daysAgo(2),
    });
  }

  console.log("  ✓ Created cross-agent version history");

  // ── Notifications ──
  const notifData: {
    memberId: string;
    type: (typeof schema.notificationTypeEnum.enumValues)[number];
    title: string;
    message: string;
    priority: (typeof schema.priorityEnum.enumValues)[number];
    isRead: boolean;
    createdAt: Date;
  }[] = [];

  if (sarah) {
    notifData.push({
      memberId: sarah.id,
      type: "agent_recommendation",
      title: "Agent Updated: HIPAA Prep Added",
      message: "Your agent now includes HIPAA compliance preparation in discovery stage. Based on feedback from Alex Kim (SC). [Undo]",
      priority: "medium",
      isRead: false,
      createdAt: daysAgo(3),
    });
    notifData.push({
      memberId: sarah.id,
      type: "agent_recommendation",
      title: "Agent Updated: Implementation Timeline",
      message: "Your agent now discusses implementation timelines in negotiation. Based on feedback from Nina Patel (CSM): customers underestimate the timeline.",
      priority: "medium",
      isRead: false,
      createdAt: daysAgo(2),
    });
    notifData.push({
      memberId: sarah.id,
      type: "feedback_received",
      title: "Your Feedback Applied",
      message: "Your feedback about discovery call structure has been applied to your agent (v4).",
      priority: "low",
      isRead: true,
      createdAt: daysAgo(5),
    });
  }

  if (alex) {
    notifData.push({
      memberId: alex.id,
      type: "system_intelligence",
      title: "Your Feedback Helped 2 Teammates",
      message: "Your HIPAA compliance feedback was applied to Sarah Chen's and Ryan Foster's agents. Both Healthcare AEs now prep for HIPAA questions.",
      priority: "low",
      isRead: false,
      createdAt: daysAgo(3),
    });
    notifData.push({
      memberId: alex.id,
      type: "system_intelligence",
      title: "Data Residency Feedback Applied",
      message: "Your data residency feedback was applied to 3 agents. David Park undid the change (prefers ad-hoc handling).",
      priority: "low",
      isRead: false,
      createdAt: daysAgo(1),
    });
  }

  if (marcus) {
    notifData.push({
      memberId: marcus.id,
      type: "system_intelligence",
      title: "Pattern Detected: Data Residency Concerns",
      message: "3 feedback entries across Healthcare and Financial Services mention data residency. Consider creating an org-wide FAQ.",
      priority: "high",
      isRead: false,
      createdAt: daysAgo(1),
    });
    notifData.push({
      memberId: marcus.id,
      type: "approval_needed",
      title: "Playbook Conflict: 3-Touch Minimum",
      message: "Casey Martinez (SDR) suggests skipping the 3-touch minimum for warm referrals. This conflicts with the Outbound Prospecting Standards playbook.",
      priority: "high",
      isRead: false,
      createdAt: daysAgo(1),
    });
  }

  if (ryan) {
    notifData.push({
      memberId: ryan.id,
      type: "agent_recommendation",
      title: "Agent Updated: HIPAA Prep Added",
      message: "Your agent now includes HIPAA compliance preparation in discovery stage. Based on feedback from Alex Kim (SC). [Undo]",
      priority: "medium",
      isRead: false,
      createdAt: daysAgo(3),
    });
  }

  if (casey) {
    notifData.push({
      memberId: casey.id,
      type: "agent_recommendation",
      title: "Agent Updated: Budget Qualification",
      message: "Your agent now includes earlier budget qualification for Financial Services leads. Based on feedback from David Park (AE).",
      priority: "medium",
      isRead: false,
      createdAt: daysAgo(2),
    });
    notifData.push({
      memberId: casey.id,
      type: "approval_needed",
      title: "Playbook Conflict Flagged",
      message: "Your feedback about skipping 3-touch minimum conflicts with the Outbound Prospecting Standards playbook. Flagged for VP review.",
      priority: "high",
      isRead: false,
      createdAt: daysAgo(1),
    });
  }

  if (priya) {
    notifData.push({
      memberId: priya.id,
      type: "system_intelligence",
      title: "Competitive Pressure Detected",
      message: "Multiple Technology deals mention competitor X. Your agent has been updated with competitive positioning talking points.",
      priority: "medium",
      isRead: false,
      createdAt: daysAgo(2),
    });
  }

  for (const n of notifData) {
    await db.insert(schema.notifications).values({
      teamMemberId: n.memberId,
      type: n.type,
      title: n.title,
      message: n.message,
      priority: n.priority,
      isRead: n.isRead,
      createdAt: n.createdAt,
    });
  }
  console.log(`  ✓ Created ${notifData.length} notifications`);

  console.log("\n✅ Org seed complete!");
  process.exit(0);
}

seedOrg().catch(console.error);

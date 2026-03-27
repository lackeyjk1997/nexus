export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  agentConfigs,
  agentConfigVersions,
  feedbackRequests,
  teamMembers,
} from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { AgentConfigClient } from "./agent-config-client";

export default async function AgentConfigPage() {
  const [sarah] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.name, "Sarah Chen"))
    .limit(1);

  if (!sarah) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No team member found</p>
      </div>
    );
  }

  const [config] = await db
    .select()
    .from(agentConfigs)
    .where(eq(agentConfigs.teamMemberId, sarah.id))
    .limit(1);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">No agent configured</p>
      </div>
    );
  }

  const [versions, feedback] = await Promise.all([
    db
      .select()
      .from(agentConfigVersions)
      .where(eq(agentConfigVersions.agentConfigId, config.id))
      .orderBy(desc(agentConfigVersions.version)),
    db
      .select()
      .from(feedbackRequests)
      .where(eq(feedbackRequests.fromAgentConfigId, config.id))
      .orderBy(desc(feedbackRequests.createdAt)),
  ]);

  return (
    <AgentConfigClient
      config={config}
      versions={versions}
      feedback={feedback}
      userName={sarah.name}
    />
  );
}

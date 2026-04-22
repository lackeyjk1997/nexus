export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  agentConfigs,
  agentConfigVersions,
  feedbackRequests,
  teamMembers,
} from "@nexus/db";
import { desc } from "drizzle-orm";
import { AgentConfigClient } from "./agent-config-client";

export default async function AgentConfigPage() {
  const [allConfigs, allVersions, allFeedback, allMembers] = await Promise.all([
    db.select().from(agentConfigs),
    db
      .select()
      .from(agentConfigVersions)
      .orderBy(desc(agentConfigVersions.version)),
    db
      .select()
      .from(feedbackRequests)
      .orderBy(desc(feedbackRequests.createdAt)),
    db.select().from(teamMembers),
  ]);

  return (
    <AgentConfigClient
      allConfigs={allConfigs}
      allVersions={allVersions}
      allFeedback={allFeedback}
      allMembers={allMembers}
    />
  );
}

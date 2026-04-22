export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, companies, teamMembers, activities } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const allDeals = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      dealValue: deals.dealValue,
      winProbability: deals.winProbability,
      forecastCategory: deals.forecastCategory,
      vertical: deals.vertical,
      closeDate: deals.closeDate,
      stageEnteredAt: deals.stageEnteredAt,
      createdAt: deals.createdAt,
      companyName: companies.name,
      aeName: teamMembers.name,
      aeId: teamMembers.id,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id));

  const allActivities = await db
    .select({
      id: activities.id,
      type: activities.type,
      createdAt: activities.createdAt,
      teamMemberId: activities.teamMemberId,
    })
    .from(activities)
    .orderBy(desc(activities.createdAt));

  const members = await db
    .select({ id: teamMembers.id, name: teamMembers.name, role: teamMembers.role })
    .from(teamMembers);

  return (
    <AnalyticsClient deals={allDeals} activities={allActivities} members={members} />
  );
}

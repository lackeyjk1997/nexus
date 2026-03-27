export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, companies, activities, teamMembers, notifications, contacts } from "@nexus/db";
import { eq, desc, sql, and, not, inArray } from "drizzle-orm";
import { CommandCenterClient } from "./command-center-client";

export default async function CommandCenterPage() {
  // Pipeline metrics
  const allDeals = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      dealValue: deals.dealValue,
      winProbability: deals.winProbability,
      forecastCategory: deals.forecastCategory,
      closeDate: deals.closeDate,
      vertical: deals.vertical,
      companyName: companies.name,
      aeName: teamMembers.name,
      aeId: teamMembers.id,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id));

  // Recent activities
  const recentActivities = await db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      description: activities.description,
      createdAt: activities.createdAt,
      teamMemberName: teamMembers.name,
      teamMemberRole: teamMembers.role,
      dealName: deals.name,
      companyName: companies.name,
    })
    .from(activities)
    .leftJoin(teamMembers, eq(activities.teamMemberId, teamMembers.id))
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .orderBy(desc(activities.createdAt))
    .limit(10);

  // Notifications
  const allNotifications = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      isRead: notifications.isRead,
      priority: notifications.priority,
      createdAt: notifications.createdAt,
      teamMemberId: notifications.teamMemberId,
      teamMemberName: teamMembers.name,
    })
    .from(notifications)
    .leftJoin(teamMembers, eq(notifications.teamMemberId, teamMembers.id))
    .orderBy(desc(notifications.createdAt));

  // Team members
  const members = await db.select().from(teamMembers);

  return (
    <CommandCenterClient
      deals={allDeals}
      activities={recentActivities}
      notifications={allNotifications}
      teamMembers={members}
    />
  );
}

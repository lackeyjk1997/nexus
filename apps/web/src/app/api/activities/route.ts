import { db } from "@/lib/db";
import { activities, deals, companies, teamMembers, contacts } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const recentActivities = await db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      description: activities.description,
      createdAt: activities.createdAt,
      dealName: deals.name,
      companyName: companies.name,
      teamMemberName: teamMembers.name,
      teamMemberRole: teamMembers.role,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(activities)
    .leftJoin(deals, eq(activities.dealId, deals.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(activities.teamMemberId, teamMembers.id))
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .orderBy(desc(activities.createdAt))
    .limit(20);

  return NextResponse.json(recentActivities);
}

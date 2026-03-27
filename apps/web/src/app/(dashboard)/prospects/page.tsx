export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { contacts, companies, deals, activities, teamMembers } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { ProspectsClient } from "./prospects-client";

export default async function ProspectsPage() {
  const allContacts = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      roleInDeal: contacts.roleInDeal,
      isPrimary: contacts.isPrimary,
      companyId: contacts.companyId,
      companyName: companies.name,
      companyIndustry: companies.industry,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));

  const allDeals = await db
    .select({
      id: deals.id,
      name: deals.name,
      companyId: deals.companyId,
      stage: deals.stage,
      dealValue: deals.dealValue,
    })
    .from(deals);

  const recentActivities = await db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      contactId: activities.contactId,
      dealId: activities.dealId,
      createdAt: activities.createdAt,
      teamMemberName: teamMembers.name,
    })
    .from(activities)
    .leftJoin(teamMembers, eq(activities.teamMemberId, teamMembers.id))
    .orderBy(desc(activities.createdAt));

  return (
    <ProspectsClient
      contacts={allContacts}
      deals={allDeals}
      activities={recentActivities}
    />
  );
}

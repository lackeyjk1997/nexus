export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { emailSequences, emailSteps, deals, companies, contacts, teamMembers } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { OutreachClient } from "./outreach-client";

export default async function OutreachPage() {
  const sequences = await db
    .select({
      id: emailSequences.id,
      name: emailSequences.name,
      status: emailSequences.status,
      dealId: emailSequences.dealId,
      contactId: emailSequences.contactId,
      assignedAeId: emailSequences.assignedAeId,
      createdAt: emailSequences.createdAt,
      dealName: deals.name,
      companyName: companies.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      aeName: teamMembers.name,
    })
    .from(emailSequences)
    .leftJoin(deals, eq(emailSequences.dealId, deals.id))
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(contacts, eq(emailSequences.contactId, contacts.id))
    .leftJoin(teamMembers, eq(emailSequences.assignedAeId, teamMembers.id))
    .orderBy(desc(emailSequences.createdAt));

  const steps = await db.select().from(emailSteps).orderBy(emailSteps.stepNumber);

  return <OutreachClient sequences={sequences} steps={steps} />;
}

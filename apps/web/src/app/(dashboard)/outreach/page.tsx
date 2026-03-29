export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { emailSequences, emailSteps, deals, companies, contacts, teamMembers, observationClusters, managerDirectives } from "@nexus/db";
import { eq, desc, and, or } from "drizzle-orm";
import { OutreachClient } from "./outreach-client";

export default async function OutreachPage() {
  const [sequences, steps, competitiveClusters, winClusters, messagingDirectives] = await Promise.all([
    db
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
      .orderBy(desc(emailSequences.createdAt)),
    db.select().from(emailSteps).orderBy(emailSteps.stepNumber),
    db
      .select({
        title: observationClusters.title,
        summary: observationClusters.summary,
        observationCount: observationClusters.observationCount,
        arrImpactTotal: observationClusters.arrImpactTotal,
      })
      .from(observationClusters)
      .where(eq(observationClusters.signalType, "competitive_intel"))
      .orderBy(desc(observationClusters.arrImpactTotal))
      .limit(2),
    db
      .select({
        title: observationClusters.title,
        summary: observationClusters.summary,
        observationCount: observationClusters.observationCount,
      })
      .from(observationClusters)
      .where(eq(observationClusters.signalType, "win_pattern"))
      .limit(2),
    db
      .select({
        directive: managerDirectives.directive,
        scope: managerDirectives.scope,
        vertical: managerDirectives.vertical,
      })
      .from(managerDirectives)
      .where(
        and(
          eq(managerDirectives.isActive, true),
          or(
            eq(managerDirectives.category, "messaging"),
            eq(managerDirectives.category, "positioning"),
            eq(managerDirectives.category, "competitive")
          )
        )
      ),
  ]);

  const intelligenceBrief = {
    competitive: competitiveClusters,
    wins: winClusters,
    directives: messagingDirectives,
  };

  return <OutreachClient sequences={sequences} steps={steps} intelligenceBrief={intelligenceBrief} />;
}

import { db } from "@/lib/db";
import { deals, companies, teamMembers, contacts } from "@nexus/db";
import { eq } from "drizzle-orm";
import { PipelineClient } from "./pipeline-client";

export default async function PipelinePage() {
  const allDeals = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      dealValue: deals.dealValue,
      currency: deals.currency,
      closeDate: deals.closeDate,
      winProbability: deals.winProbability,
      forecastCategory: deals.forecastCategory,
      vertical: deals.vertical,
      product: deals.product,
      leadSource: deals.leadSource,
      competitor: deals.competitor,
      stageEnteredAt: deals.stageEnteredAt,
      createdAt: deals.createdAt,
      companyName: companies.name,
      companyDomain: companies.domain,
      aeName: teamMembers.name,
      aeId: teamMembers.id,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id));

  const members = await db.select().from(teamMembers);

  return <PipelineClient deals={allDeals} teamMembers={members} />;
}

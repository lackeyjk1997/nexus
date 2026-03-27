export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, companies, teamMembers, contacts } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
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
      companyIndustry: companies.industry,
      aeName: teamMembers.name,
      aeId: teamMembers.id,
      primaryContactName: contacts.firstName,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .leftJoin(teamMembers, eq(deals.assignedAeId, teamMembers.id))
    .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
    .orderBy(deals.createdAt);

  return NextResponse.json(allDeals);
}

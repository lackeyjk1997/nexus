export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { companies } from "@nexus/db";
import { NextResponse } from "next/server";

export async function GET() {
  const allCompanies = await db
    .select({
      id: companies.id,
      name: companies.name,
      industry: companies.industry,
    })
    .from(companies)
    .orderBy(companies.name);

  return NextResponse.json(allCompanies);
}

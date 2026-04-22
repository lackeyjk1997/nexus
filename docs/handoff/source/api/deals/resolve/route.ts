export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { deals, companies, contacts } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Resolve a deal by name fragment (for agent bar prep context).
 * Returns deal info + contacts for the attendee picker.
 */
export async function POST(request: Request) {
  const { rawQuery, dealId } = await request.json();

  let resolvedDealId = dealId as string | undefined;
  let resolvedAccountId: string | undefined;

  if (!resolvedDealId && rawQuery) {
    const allDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        companyId: deals.companyId,
        companyName: companies.name,
        stage: deals.stage,
      })
      .from(deals)
      .leftJoin(companies, eq(deals.companyId, companies.id));

    const lower = (rawQuery as string).toLowerCase();
    const match = allDeals.find((d) => {
      const companyWords = (d.companyName || "").toLowerCase().split(/\s+/);
      const dealWords = (d.name || "").toLowerCase().split(/\s+/);
      return (
        companyWords.some((w) => w.length >= 4 && lower.includes(w)) ||
        dealWords.some((w) => w.length >= 4 && lower.includes(w))
      );
    });

    if (match) {
      resolvedDealId = match.id;
      resolvedAccountId = match.companyId;
    }
  }

  if (!resolvedDealId) {
    return NextResponse.json({ error: "Could not resolve deal" }, { status: 400 });
  }

  // Get deal + contacts
  const [dealRow] = await db
    .select({
      id: deals.id,
      name: deals.name,
      stage: deals.stage,
      companyId: deals.companyId,
      companyName: companies.name,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .where(eq(deals.id, resolvedDealId))
    .limit(1);

  if (!dealRow) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const dealContacts = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      title: contacts.title,
      roleInDeal: contacts.roleInDeal,
      isPrimary: contacts.isPrimary,
    })
    .from(contacts)
    .where(eq(contacts.companyId, dealRow.companyId));

  return NextResponse.json({
    dealId: dealRow.id,
    dealName: dealRow.name,
    dealStage: dealRow.stage,
    accountName: dealRow.companyName,
    accountId: dealRow.companyId,
    contacts: dealContacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      title: c.title,
      roleInDeal: c.roleInDeal,
      isPrimary: c.isPrimary,
    })),
  });
}

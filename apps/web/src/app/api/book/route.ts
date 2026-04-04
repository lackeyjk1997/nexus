export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  accountHealth,
  companies,
  deals,
  customerMessages,
  contacts,
} from "@nexus/db";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aeId = searchParams.get("aeId");

  if (!aeId) {
    return NextResponse.json(
      { error: "aeId query parameter is required" },
      { status: 400 }
    );
  }

  // 1. Get all closed-won deals for this AE with company + health data
  const dealRows = await db
    .select({
      deal: {
        id: deals.id,
        name: deals.name,
        dealValue: deals.dealValue,
        closeDate: deals.closeDate,
        companyId: deals.companyId,
      },
      company: {
        id: companies.id,
        name: companies.name,
        industry: companies.industry,
        employeeCount: companies.employeeCount,
        description: companies.description,
      },
      health: {
        healthScore: accountHealth.healthScore,
        healthTrend: accountHealth.healthTrend,
        contractStatus: accountHealth.contractStatus,
        arr: accountHealth.arr,
        productsPurchased: accountHealth.productsPurchased,
        usageMetrics: accountHealth.usageMetrics,
        lastTouchDate: accountHealth.lastTouchDate,
        daysSinceTouch: accountHealth.daysSinceTouch,
        renewalDate: accountHealth.renewalDate,
        keyStakeholders: accountHealth.keyStakeholders,
        expansionSignals: accountHealth.expansionSignals,
        riskSignals: accountHealth.riskSignals,
        contractedUseCases: accountHealth.contractedUseCases,
        expansionMap: accountHealth.expansionMap,
        proactiveSignals: accountHealth.proactiveSignals,
        healthFactors: accountHealth.healthFactors,
        onboardingComplete: accountHealth.onboardingComplete,
      },
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .innerJoin(
      accountHealth,
      and(
        eq(accountHealth.companyId, companies.id),
        eq(accountHealth.dealId, deals.id)
      )
    )
    .where(
      and(eq(deals.assignedAeId, aeId), eq(deals.stage, "closed_won"))
    );

  // 2. Get all customer messages for these companies
  const companyIds = dealRows.map((r) => r.company.id);

  let messageRows: Array<{
    message: {
      id: string;
      subject: string;
      body: string;
      channel: string;
      receivedAt: Date;
      priority: string | null;
      status: string | null;
      aiCategory: string | null;
      responseKit: unknown;
      companyId: string;
    };
    contact: {
      id: string | null;
      firstName: string | null;
      lastName: string | null;
      title: string | null;
      email: string | null;
    } | null;
  }> = [];

  if (companyIds.length > 0) {
    // Fetch messages for each company — drizzle doesn't support inArray on uuid[] easily
    // so we query all customer messages and filter
    const allMessages = await db
      .select({
        message: {
          id: customerMessages.id,
          subject: customerMessages.subject,
          body: customerMessages.body,
          channel: customerMessages.channel,
          receivedAt: customerMessages.receivedAt,
          priority: customerMessages.priority,
          status: customerMessages.status,
          aiCategory: customerMessages.aiCategory,
          responseKit: customerMessages.responseKit,
          companyId: customerMessages.companyId,
        },
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          title: contacts.title,
          email: contacts.email,
        },
      })
      .from(customerMessages)
      .leftJoin(contacts, eq(customerMessages.contactId, contacts.id))
      .orderBy(desc(customerMessages.receivedAt));

    const companyIdSet = new Set(companyIds);
    messageRows = allMessages.filter((m) =>
      companyIdSet.has(m.message.companyId)
    );
  }

  // 3. Build account objects with messages and priority scores
  const now = new Date();
  const ninetyDaysFromNow = new Date(
    now.getTime() + 90 * 24 * 60 * 60 * 1000
  );

  const accounts = dealRows.map((row) => {
    const companyMessages = messageRows.filter(
      (m) => m.message.companyId === row.company.id
    );

    // Calculate priority score
    let priorityScore = 0;

    // Message priority
    for (const m of companyMessages) {
      const st = m.message.status;
      if (st === "pending" || st === "kit_ready") {
        if (m.message.priority === "urgent") priorityScore += 100;
        else if (m.message.priority === "high") priorityScore += 80;
        else if (m.message.priority === "medium") priorityScore += 50;
      }
    }

    // Health score
    const hs = row.health.healthScore ?? 100;
    if (hs < 50) priorityScore += 90;
    else if (hs < 70) priorityScore += 40;

    // Contract status
    if (row.health.contractStatus === "at_risk") priorityScore += 70;
    if (row.health.contractStatus === "renewal_window") priorityScore += 60;

    // Days since touch
    if ((row.health.daysSinceTouch ?? 0) > 20) priorityScore += 30;

    return {
      company: row.company,
      deal: row.deal,
      health: row.health,
      messages: companyMessages.map((m) => ({
        ...m.message,
        contact: m.contact,
      })),
      priorityScore,
    };
  });

  // Sort by priority descending
  accounts.sort((a, b) => b.priorityScore - a.priorityScore);

  // 4. Calculate metrics
  const totalArr = accounts.reduce(
    (sum, a) => sum + parseFloat(a.health.arr || "0"),
    0
  );
  const healthyCount = accounts.filter(
    (a) => (a.health.healthScore ?? 100) >= 70
  ).length;
  const atRiskCount = accounts.filter(
    (a) => (a.health.healthScore ?? 100) < 60
  ).length;
  const pendingMessages = messageRows.filter(
    (m) => m.message.status === "pending" || m.message.status === "kit_ready"
  ).length;
  const upcomingRenewals = accounts.filter((a) => {
    if (!a.health.renewalDate) return false;
    const rd = new Date(a.health.renewalDate);
    return rd <= ninetyDaysFromNow;
  }).length;

  return NextResponse.json({
    accounts,
    metrics: {
      totalAccounts: accounts.length,
      totalArr,
      healthyCount,
      atRiskCount,
      pendingMessages,
      upcomingRenewals,
    },
  });
}

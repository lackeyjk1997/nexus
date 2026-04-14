export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { db } from "@/lib/db";
import {
  deals,
  companies,
  contacts,
  meddpiccFields,
  agentConfigs,
  playbookIdeas,
  teamMembers,
} from "@nexus/db";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createClient } from "rivetkit/client";
import type { Registry } from "@/actors/registry";

export async function POST(request: Request) {
  const { dealId, transcriptText, transcriptId } = await request.json();

  if (!dealId || !transcriptText) {
    return NextResponse.json(
      { error: "dealId and transcriptText are required" },
      { status: 400 }
    );
  }

  // Fetch deal context from Supabase
  const [deal] = await db
    .select({
      id: deals.id,
      name: deals.name,
      vertical: deals.vertical,
      assignedAeId: deals.assignedAeId,
      companyId: deals.companyId,
      companyName: companies.name,
    })
    .from(deals)
    .leftJoin(companies, eq(deals.companyId, companies.id))
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch MEDDPICC
  const [meddpicc] = await db
    .select()
    .from(meddpiccFields)
    .where(eq(meddpiccFields.dealId, dealId))
    .limit(1);

  // Fetch contacts
  const dealContacts = await db
    .select({
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      title: contacts.title,
      roleInDeal: contacts.roleInDeal,
    })
    .from(contacts)
    .where(eq(contacts.companyId, deal.companyId));

  // Fetch agent config for the assigned AE
  let agentInstructions = "";
  if (deal.assignedAeId) {
    const [config] = await db
      .select({ instructions: agentConfigs.instructions })
      .from(agentConfigs)
      .where(eq(agentConfigs.teamMemberId, deal.assignedAeId))
      .limit(1);
    agentInstructions = config?.instructions || "";
  }

  // Build MEDDPICC context
  const currentMeddpicc = meddpicc
    ? {
        metricsConfidence: meddpicc.metricsConfidence,
        economicBuyerConfidence: meddpicc.economicBuyerConfidence,
        decisionCriteriaConfidence: meddpicc.decisionCriteriaConfidence,
        decisionProcessConfidence: meddpicc.decisionProcessConfidence,
        identifyPainConfidence: meddpicc.identifyPainConfidence,
        championConfidence: meddpicc.championConfidence,
        competitionConfidence: meddpicc.competitionConfidence,
      }
    : null;

  // Fetch active experiments where the assigned AE is in the test group
  let activeExperiments: Array<{ id: string; title: string; hypothesis: string | null; category: string | null; experimentEvidence: unknown }> = [];
  if (deal.assignedAeId) {
    activeExperiments = await db
      .select({
        id: playbookIdeas.id,
        title: playbookIdeas.title,
        hypothesis: playbookIdeas.hypothesis,
        category: playbookIdeas.category,
        experimentEvidence: playbookIdeas.experimentEvidence,
      })
      .from(playbookIdeas)
      .where(
        sql`${playbookIdeas.status} = 'testing' AND ${deal.assignedAeId} = ANY(${playbookIdeas.testGroup})`
      );
  }

  // Fetch assigned AE name
  let assignedAeName = "";
  if (deal.assignedAeId) {
    const [ae] = await db
      .select({ name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.id, deal.assignedAeId))
      .limit(1);
    assignedAeName = ae?.name || "";
  }

  // Determine app URL for internal API calls from the actor
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3001}`);

  // Send to Rivet pipeline actor
  const rivetEndpoint = process.env.RIVET_ENDPOINT || `${process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`}/api/rivet`;
  const rivetClient = createClient<Registry>(rivetEndpoint);
  const pipeline = rivetClient.transcriptPipeline.getOrCreate([dealId]);

  await pipeline.send("process", {
    dealId,
    transcriptText,
    transcriptId: transcriptId || "",
    dealName: deal.name,
    companyName: deal.companyName || "",
    vertical: deal.vertical,
    currentMeddpicc,
    existingContacts: dealContacts.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      title: c.title || "",
      role: c.roleInDeal || "",
    })),
    agentConfigInstructions: agentInstructions,
    assignedAeId: deal.assignedAeId || "",
    assignedAeName,
    appUrl,
    activeExperiments: activeExperiments.map((e) => ({
      id: e.id,
      title: e.title,
      hypothesis: e.hypothesis || "",
      category: e.category || "",
      existingEvidence: e.experimentEvidence,
    })),
  });

  return NextResponse.json({ status: "processing", dealId });
}

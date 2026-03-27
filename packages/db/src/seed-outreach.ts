import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const client = postgres(process.env.DIRECT_URL!, { max: 1 });
const db = drizzle(client, { schema });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seedOutreach() {
  console.log("📧 Seeding outreach data...");

  const members = await db.select().from(schema.teamMembers);
  const deals = await db.select().from(schema.deals);
  const contacts = await db.select().from(schema.contacts);

  const sarah = members.find((m) => m.name === "Sarah Chen")!;
  const priya = members.find((m) => m.name === "Priya Sharma")!;

  // Pick deals and contacts for sequences
  const healthDeals = deals.filter((d) => d.vertical === "healthcare").slice(0, 3);
  const techDeals = deals.filter((d) => d.vertical === "technology").slice(0, 2);

  const sequences = [
    {
      dealId: healthDeals[0]?.id,
      contactId: contacts.find((c) => c.companyId === healthDeals[0]?.companyId)?.id,
      assignedAeId: sarah.id,
      name: "Healthcare Q1 Enterprise Outreach",
      status: "active" as const,
      steps: [
        { stepNumber: 1, subject: "Quick question about clinical workflows at {{company}}", body: "Hi {{name}},\n\nI noticed {{company}} recently expanded your outpatient network — congratulations on the growth.\n\nI work with healthcare organizations like yours to streamline clinical documentation using AI. Our customers typically see a 40% reduction in documentation time for their physicians.\n\nWould you be open to a brief conversation about how this might help {{company}}?\n\nBest,\nSarah", delayDays: 0, status: "sent" as const, sentAt: daysAgo(10), openedAt: daysAgo(9) },
        { stepNumber: 2, subject: "Re: Clinical documentation at {{company}}", body: "Hi {{name}},\n\nFollowing up on my note about clinical documentation automation. I wanted to share a brief case study from a similar health system that reduced physician burnout scores by 35% while improving documentation quality.\n\nWould 15 minutes next week work to discuss?\n\nSarah", delayDays: 3, status: "sent" as const, sentAt: daysAgo(7), openedAt: daysAgo(6) },
        { stepNumber: 3, subject: "One more thought on {{company}}'s documentation workflow", body: "Hi {{name}},\n\nLast touch — I spoke with our VP of Healthcare Solutions and he mentioned we just completed a similar implementation at a 12-facility system like yours.\n\nThe ROI analysis showed €2.4M in annual savings from reduced documentation overhead alone.\n\nHappy to share the details if useful. No worries if the timing isn't right.\n\nBest,\nSarah", delayDays: 4, status: "draft" as const },
      ],
    },
    {
      dealId: healthDeals[1]?.id,
      contactId: contacts.find((c) => c.companyId === healthDeals[1]?.companyId)?.id,
      assignedAeId: sarah.id,
      name: "Post-HIMSS Conference Follow-Up",
      status: "active" as const,
      steps: [
        { stepNumber: 1, subject: "Great meeting you at HIMSS, {{name}}", body: "Hi {{name}},\n\nIt was great connecting at HIMSS last week. Our conversation about AI-assisted clinical documentation really resonated — I hear the same challenges from health systems across Europe.\n\nAs promised, here's the whitepaper on our approach to HIPAA-compliant AI: [link]\n\nWould love to continue the conversation. How does next Thursday look?\n\nSarah", delayDays: 0, status: "sent" as const, sentAt: daysAgo(5), openedAt: daysAgo(4), repliedAt: daysAgo(3) },
        { stepNumber: 2, subject: "Technical deep-dive: Claude for healthcare", body: "Hi {{name}},\n\nThanks for your interest! I'd love to arrange a technical session with our Solutions Architect, Alex Kim, who specializes in healthcare deployments.\n\nHe can walk through our data residency architecture and HIPAA compliance framework in detail.\n\nWould a 45-minute session work for your team?\n\nSarah", delayDays: 2, status: "sent" as const, sentAt: daysAgo(3) },
        { stepNumber: 3, subject: "Resources for your team", body: "Sharing some resources ahead of our technical session...", delayDays: 3, status: "draft" as const },
        { stepNumber: 4, subject: "Next steps after our session", body: "Following up on our technical deep-dive...", delayDays: 5, status: "draft" as const },
      ],
    },
    {
      dealId: healthDeals[2]?.id,
      contactId: contacts.find((c) => c.companyId === healthDeals[2]?.companyId)?.id,
      assignedAeId: sarah.id,
      name: "Clinical Operations Leaders",
      status: "draft" as const,
      steps: [
        { stepNumber: 1, subject: "Reducing documentation burden at {{company}}", body: "Hi {{name}},\n\nI help clinical operations leaders at health systems reduce physician documentation time by 40-60% using AI-assisted workflows.\n\nWould you be open to exploring how this could work for {{company}}?", delayDays: 0, status: "draft" as const },
        { stepNumber: 2, subject: "Case study: 35% reduction in burnout scores", body: "Hi {{name}}, sharing a relevant case study...", delayDays: 4, status: "draft" as const },
        { stepNumber: 3, subject: "Quick question about your EHR stack", body: "One more thought — understanding your EHR integration needs...", delayDays: 5, status: "draft" as const },
      ],
    },
    {
      dealId: null,
      contactId: contacts[contacts.length - 1]?.id,
      assignedAeId: sarah.id,
      name: "Re-engagement: Ghosted Prospects",
      status: "paused" as const,
      steps: [
        { stepNumber: 1, subject: "Checking in, {{name}}", body: "Hi {{name}},\n\nIt's been a while since we last connected. I wanted to reach out because we've made significant improvements to our platform since we last spoke.\n\nNo pressure — just wanted to keep you in the loop.\n\nSarah", delayDays: 0, status: "sent" as const, sentAt: daysAgo(14) },
        { stepNumber: 2, subject: "New capabilities you might find relevant", body: "Hi {{name}},\n\nQuick update: we've recently launched new capabilities specifically designed for organizations like {{company}}...", delayDays: 7, status: "draft" as const },
      ],
    },
    {
      dealId: techDeals[0]?.id,
      contactId: contacts.find((c) => c.companyId === techDeals[0]?.companyId)?.id,
      assignedAeId: priya.id,
      name: "Technology Platform Outreach",
      status: "active" as const,
      steps: [
        { stepNumber: 1, subject: "API-first AI for {{company}}'s platform", body: "Hi {{name}},\n\nI noticed {{company}} recently scaled your developer platform. Curious if you've explored embedding AI capabilities via API.\n\nOur customers in the developer tools space are seeing 3x improvement in code analysis quality using Claude.\n\nWorth a quick chat?\n\nPriya", delayDays: 0, status: "sent" as const, sentAt: daysAgo(8), openedAt: daysAgo(7) },
        { stepNumber: 2, subject: "Re: Developer experience with Claude API", body: "Following up with a live benchmark comparison...", delayDays: 3, status: "sent" as const, sentAt: daysAgo(5) },
        { stepNumber: 3, subject: "Custom model fine-tuning options", body: "One more resource about our fine-tuning capabilities...", delayDays: 4, status: "draft" as const },
      ],
    },
  ];

  // Clean existing sequences
  await db.delete(schema.emailSteps);
  await db.delete(schema.emailSequences);

  for (const seq of sequences) {
    if (!seq.contactId) continue;

    const [inserted] = await db
      .insert(schema.emailSequences)
      .values({
        dealId: seq.dealId || deals[0]!.id,
        contactId: seq.contactId,
        assignedAeId: seq.assignedAeId,
        name: seq.name,
        status: seq.status,
      })
      .returning();

    for (const step of seq.steps) {
      await db.insert(schema.emailSteps).values({
        sequenceId: inserted!.id,
        stepNumber: step.stepNumber,
        subject: step.subject,
        body: step.body,
        delayDays: step.delayDays,
        status: step.status,
        sentAt: (step as any).sentAt || null,
        openedAt: (step as any).openedAt || null,
        repliedAt: (step as any).repliedAt || null,
        aiGenerated: step.stepNumber > 1,
      });
    }
  }

  console.log(`  ✓ Created ${sequences.length} sequences with steps`);
  console.log("\n✅ Outreach seed complete!");
  process.exit(0);
}

seedOutreach().catch(console.error);

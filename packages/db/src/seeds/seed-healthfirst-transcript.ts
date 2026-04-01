/**
 * Seed: NordicMed Group transcript with transcript_text populated
 * This enables the "Process Transcript" button for the cross-deal intelligence demo.
 * NordicMed is Ryan Foster's healthcare deal (Proposal stage) — combined with
 * MedVista (Sarah's healthcare deal), this creates the cross-deal pattern.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { eq, and, ilike } from "drizzle-orm";

const TRANSCRIPT_TEXT = `PARTICIPANTS:
- Ryan Foster (Account Executive, Anthropic)
- Katarina Holm (VP IT Infrastructure, NordicMed Group)
- Dr. Lars Eriksson (Chief Medical Officer, NordicMed Group)

---

Ryan Foster: Thanks for taking the time today, Katarina, Dr. Eriksson. I know you're juggling a lot across the 12 hospitals. Last time we discussed the clinical documentation burden at a high level — today I'd love to dig into the technical requirements and talk about how we can get this moving for your board presentation.

Katarina Holm: Good timing, Ryan. We've been doing some internal benchmarking since our last call. Lars, do you want to give the clinical perspective first?

Dr. Lars Eriksson: Sure. The core problem hasn't changed — our physicians are spending over three hours a day on documentation. That's time they're not spending with patients. We've measured it across all 12 hospitals and the average is 3.2 hours per physician per day. At our scale, that's roughly 28,000 physician-hours per month lost to paperwork. We need to cut that by at least 35 percent to stop the attrition.

Ryan Foster: That's a staggering number. What's the current documentation workflow look like?

Katarina Holm: We run Epic across all sites with a custom middleware layer. Clinical notes come in as a mix of free-text dictation and structured FHIR resources. The problem is the unstructured dictation — it needs to be coded, summarized, and cross-referenced against patient history before it's usable. Our current NLP system handles maybe 60 percent accurately, and the rest requires manual physician review.

Dr. Lars Eriksson: Which is exactly why the documentation takes so long. Physicians dictate, then spend another 45 minutes reviewing and correcting what the system produced. It's demoralizing. Our turnover is at a five-year high and exit interviews consistently cite documentation burden as the top reason.

Ryan Foster: That's exactly the pattern we see across Scandinavian health systems. Claude's clinical reasoning capability is fundamentally different from traditional NLP — it understands medical context rather than pattern-matching. In our deployments, we're consistently seeing 94 percent accuracy on first-pass documentation, which means physicians only need to review edge cases.

Katarina Holm: That accuracy number is important to us. Now I should be transparent — we've been evaluating Microsoft's Azure AI Health services in parallel. They've been pushing hard on their Copilot integration with our existing Microsoft 365 stack, and their pricing came in about 25 percent below what we expected. But Lars has concerns.

Dr. Lars Eriksson: My concern with Microsoft is specificity. Their demos looked polished, but when we tested Copilot on actual Swedish-language clinical notes with ICD-10-SE codes, the accuracy dropped significantly. They're optimizing for English-language US healthcare. Our needs are different — multi-language support across Swedish, Norwegian, and Finnish clinical terminology is non-negotiable.

Ryan Foster: That's a critical differentiator. Claude's multi-language clinical reasoning is trained on medical literature across all those languages. We can demonstrate that in the pilot. And on the pricing question — I'd encourage looking at total cost of ownership rather than per-API-call pricing. Microsoft's model requires you to host within Azure, which means infrastructure migration costs on top of the license fees.

Katarina Holm: That's actually a major sticking point for us. We're on AWS and migrating to Azure just for one AI service isn't realistic. We spent two years getting our current infrastructure stable after the last migration.

Ryan Foster: Understood. Claude is fully cloud-agnostic — same API, same performance regardless of where you host. No infrastructure lock-in.

Katarina Holm: Good. Now on the compliance side — our security review process is extensive. Typically 4 to 6 weeks minimum. We need GDPR compliance documentation, EU data residency guarantees, penetration test results, and our CISO needs to conduct a full architecture review. This is a hard gate — nothing moves to procurement without security sign-off.

Ryan Foster: We anticipated that. I can have our full GDPR compliance package, including EU data residency certifications and pen test results, to your CISO by end of this week. Starting the security review now means it can run in parallel with the technical pilot — that way you're not waiting sequentially.

Dr. Lars Eriksson: Smart approach. On the budget side — I control the AI transformation budget for the organization. The board approved 4.2 million euros for this initiative last quarter, so funding isn't the blocker. What I need is proof that the accuracy holds on our actual clinical data. If it does, I'll present the recommendation to the board myself.

Ryan Foster: That's great to hear. Would it make sense to structure a 30-day pilot across two of your hospitals? We'd process real de-identified clinical notes through Claude and measure accuracy, time savings, and physician satisfaction against your current system.

Katarina Holm: A two-hospital pilot is exactly what we've been discussing internally. We'd want to use Karolinska and Uppsala — they have the highest documentation volumes and the most engaged physician champions.

Dr. Lars Eriksson: There's one thing that really caught my attention from your last demo, Ryan. When you showed the real-time clinical note generation from that sample patient encounter — the way it structured the assessment and plan section with proper ICD-10 codes and cross-referenced the medication list — that was the moment I thought, this is actually different. Our physicians have never seen an AI tool produce output that clean. Can we set up a live demonstration with our clinical informatics team?

Ryan Foster: Absolutely. Let's schedule that for next week. I'd like to bring our Solutions Architect, Alex Kim — he's worked on three Scandinavian health system deployments and can speak directly to the Epic integration architecture.

Katarina Holm: Perfect. One more thing — Anders Bjork, our CFO, wants to see a formal TCO comparison before the board presentation. He's been leaning toward Microsoft purely on initial pricing, so we need to make the infrastructure and accuracy case clearly.

Ryan Foster: I'll prepare a detailed TCO analysis that factors in infrastructure costs, accuracy-driven time savings, and the multi-language advantage. We can walk Anders through it separately if that helps.

Dr. Lars Eriksson: That would help enormously. Anders respects data. If we can show that the total cost is competitive and the clinical accuracy is measurably better, he'll support it.

Katarina Holm: Let me summarize our action items. Ryan sends the GDPR compliance package this week. We schedule the live clinical demo with our informatics team next week. Ryan prepares the TCO comparison for Anders. And we aim to have the pilot proposal ready for the board meeting on the 15th.

Ryan Foster: That all tracks. I'll also include our EU healthcare customer reference list — four health systems in the Nordics and DACH region that went live in the last 12 months. That tends to address board concerns about proven deployments.

Dr. Lars Eriksson: References from other Scandinavian health systems would be very compelling. Thank you, Ryan. I'm cautiously optimistic about this.

Ryan Foster: Thank you both. I'll have everything to you by Friday.`;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Seeding NordicMed Group transcript with transcript_text...");

  // Find the NordicMed Group deal
  const [deal] = await db
    .select({ id: schema.deals.id, name: schema.deals.name })
    .from(schema.deals)
    .where(ilike(schema.deals.name, "%NordicMed%Clinical%"))
    .limit(1);

  if (!deal) {
    console.error("NordicMed Group deal not found");
    await client.end();
    process.exit(1);
  }

  console.log(`  Found deal: ${deal.name} (${deal.id})`);

  // Check if there's already a transcript for this deal
  const [existing] = await db
    .select({ id: schema.callTranscripts.id, title: schema.callTranscripts.title })
    .from(schema.callTranscripts)
    .where(eq(schema.callTranscripts.dealId, deal.id))
    .limit(1);

  if (existing) {
    // Update existing transcript to add transcript_text
    await db
      .update(schema.callTranscripts)
      .set({
        transcriptText: TRANSCRIPT_TEXT,
        title: "Proposal Review with NordicMed Clinical & IT Leadership",
        participants: [
          { name: "Ryan Foster", role: "AE" },
          { name: "Katarina Holm", role: "VP IT Infrastructure" },
          { name: "Dr. Lars Eriksson", role: "Chief Medical Officer" },
        ],
      })
      .where(eq(schema.callTranscripts.id, existing.id));
    console.log(`  Updated existing transcript with transcript_text`);
  } else {
    // Insert new transcript
    await db.insert(schema.callTranscripts).values({
      dealId: deal.id,
      title: "Proposal Review with NordicMed Clinical & IT Leadership",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      durationSeconds: 38 * 60,
      participants: [
        { name: "Ryan Foster", role: "AE" },
        { name: "Katarina Holm", role: "VP IT Infrastructure" },
        { name: "Dr. Lars Eriksson", role: "Chief Medical Officer" },
      ],
      transcriptText: TRANSCRIPT_TEXT,
      source: "simulated",
      status: "complete",
    });
    console.log("  Inserted new transcript with transcript_text");
  }

  // Also clear transcript_text from HealthFirst if it was previously seeded
  await db
    .update(schema.callTranscripts)
    .set({ transcriptText: null })
    .where(
      and(
        ilike(schema.callTranscripts.title, "%HealthFirst%"),
        eq(schema.callTranscripts.dealId, "f4fee3bc-b65c-49e8-a34f-0fab8b8724c9")
      )
    );
  console.log("  Cleared transcript_text from HealthFirst transcript");

  console.log("Done!");
  await client.end();
}

main().catch(console.error);

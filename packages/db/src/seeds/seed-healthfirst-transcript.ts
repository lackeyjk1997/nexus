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

// ── MedVista transcript — Sarah Chen's healthcare deal ──
const MEDVISTA_TRANSCRIPT = `PARTICIPANTS:
- Sarah Chen (Account Executive, Anthropic)
- Oliver Laurent (VP of Engineering, MedVista Health Systems)
- Dr. Henrik Svensson (Head of Clinical Informatics, MedVista Health Systems)

---

Sarah Chen: Thanks for joining, Oliver, Dr. Svensson. I know you're working toward the August board presentation, so I want to make sure we cover everything you need for the POC proposal.

Oliver Laurent: Appreciated, Sarah. Henrik, do you want to start with the clinical perspective?

Dr. Henrik Svensson: Sure. The core issue is our clinicians are spending over 2 hours daily on documentation. Across 200 clinicians, that's 400 hours per day lost to paperwork. We've quantified the cost at roughly 850,000 euros annually in productivity loss alone.

Sarah Chen: That's a significant number. What does the current workflow look like?

Oliver Laurent: We run a custom EHR built on FHIR standards with a React frontend. Clinical notes come in as dictation, get transcribed, then go through a rules engine for coding. The bottleneck is the coding step — our current NLP handles maybe 65 percent accurately.

Dr. Henrik Svensson: And HIPAA compliance is non-negotiable. Every piece of clinical documentation has to meet audit trail requirements. We also have EU data residency requirements since we operate across three countries.

Sarah Chen: We're fully HIPAA compliant with SOC 2 Type II, and all EU data stays in our Frankfurt region. I'll send the compliance documentation today.

Oliver Laurent: Good. Now I need to be direct — we previously evaluated Microsoft Copilot for this. The data privacy concerns were significant. Microsoft wanted us to route clinical data through their Azure infrastructure, and their data processing agreement didn't meet our EU residency requirements. We ended that evaluation three months ago. But our CFO Emma Mueller still asks about Microsoft because their pricing looked attractive on paper.

Sarah Chen: That's an important distinction. Our architecture keeps data processing entirely within your infrastructure boundary. No data leaves your region. And on pricing — Microsoft's model requires Azure hosting, which adds infrastructure costs that don't show up in the per-seat price.

Dr. Henrik Svensson: The data residency point is critical. GDPR compliance is a hard gate for us. We chose to evaluate Anthropic specifically because of your data privacy controls. Emma needs to understand that the Microsoft comparison isn't apples-to-apples once you factor in the infrastructure requirements.

Oliver Laurent: On the technical side, we need the API to handle FHIR R4 resources natively. Our integration team has been asking for documentation on FHIR bundle processing. Do you have that?

Sarah Chen: Yes, I'll include our FHIR R4 integration guide with the compliance docs. It covers the exact REST API patterns for clinical document processing.

Oliver Laurent: Our security review process is going to be a challenge. The security team requires SOC 2 Type II, penetration test results, and a full architecture review. That process typically takes 4 to 6 weeks, and we need the POC running by July for the August board presentation.

Sarah Chen: Let's start the security review this week then. I'll have the full package — SOC 2, pen test results, and architecture documentation — to your security team by Thursday. That way the review runs in parallel with the technical evaluation.

Dr. Henrik Svensson: Budget authority sits with Emma Mueller, our CFO. She hasn't been fully engaged yet but Oliver and I believe the ROI case is strong. If we can show a 35 percent reduction in documentation time across the POC, Emma will support the full rollout.

Oliver Laurent: The decision process is: Henrik and I recommend to Emma, Emma takes it to the board in August. Any AI vendor needs board approval. The technology review committee meets monthly.

Sarah Chen: Would it help to schedule a brief call with Emma? I can walk her through the TCO analysis and address the Microsoft comparison directly with the data residency facts.

Oliver Laurent: That would be very helpful. Let me set that up for next week.

Dr. Henrik Svensson: One thing that impressed me in your last demo — when Sarah showed the real-time clinical note generation from a sample patient encounter, the structured output with proper ICD-10 codes was remarkably accurate. Our team was excited by the potential. Can we do a larger test with our actual de-identified patient records?

Sarah Chen: Absolutely. I'll set up a sandbox environment this week. You send us 500 de-identified records and we'll process them with accuracy metrics.

Oliver Laurent: Let me summarize. Sarah sends compliance docs and FHIR guide by Thursday. Security review starts immediately. Sandbox test with 500 records next week. Sarah meets with Emma to address the Microsoft TCO comparison. Target: POC proposal ready for July, board presentation in August.

Sarah Chen: Perfect. I'll also bring our SA Alex Kim to the next technical session — he's done similar healthcare deployments and can speak to the integration specifics.

Dr. Henrik Svensson: That would be valuable. Thank you, Sarah.`;

// ── NordicMed transcript — Ryan Foster's healthcare deal ──
const TRANSCRIPT_TEXT = `PARTICIPANTS:
- Ryan Foster (Account Executive, Anthropic)
- Katarina Holm (VP IT Infrastructure, NordicMed Group)
- Dr. Lars Eriksson (Chief Medical Officer, NordicMed Group)
- Anders Bjork (CFO, NordicMed Group — joined for final 10 minutes)

---

Ryan Foster: Thanks for making time today, Katarina, Dr. Eriksson. Last time we discussed the clinical documentation burden at a high level. Today I'd love to dig into the technical requirements and talk about how we position this for the board.

Katarina Holm: Good timing, Ryan. We've been doing internal benchmarking since our last call. Lars, do you want to give the clinical perspective first?

Dr. Lars Eriksson: Sure. The numbers are stark. We process about 50,000 patient records monthly across our 12 hospitals. The manual review step takes roughly 2 minutes per record, and we need to get that under 30 seconds to hit our Q3 targets. Our physicians are spending 3.2 hours per day on documentation. That's 28,000 physician-hours per month lost to paperwork.

Ryan Foster: Those are significant numbers. What does the current architecture look like?

Katarina Holm: We run Epic across all sites with a custom middleware layer. Clinical notes come in as a mix of free-text dictation and structured FHIR resources. The bottleneck is unstructured data extraction. Our current NLP system handles about 60 percent accurately.

Dr. Lars Eriksson: Which is exactly why documentation takes so long. Physicians dictate, then spend 45 minutes reviewing and correcting. Our turnover is at a five-year high and exit interviews consistently cite documentation burden as the top reason.

Ryan Foster: That pattern is consistent across Scandinavian health systems we work with. Claude's clinical reasoning is fundamentally different from traditional NLP — it understands medical context rather than pattern-matching. We're seeing 94 percent accuracy on first-pass documentation.

Katarina Holm: Now I should be transparent — we've been evaluating Microsoft's Azure AI services as well. They've been pushing their compliance certifications and pricing is competitive. Their pricing came in about 25 percent below what we expected. But we have concerns about clinical accuracy with their models. When we tested Microsoft Copilot on actual Swedish-language clinical notes with ICD-10-SE codes, the accuracy dropped significantly compared to English.

Dr. Lars Eriksson: My concern with Microsoft is specificity. They're optimizing for English-language US healthcare. Multi-language support across Swedish, Norwegian, and Finnish clinical terminology is non-negotiable for us.

Ryan Foster: That's a critical differentiator. Claude handles all three languages natively in clinical contexts. And on pricing — Microsoft's model requires hosting within Azure, which means infrastructure migration costs on top of license fees. We're fully cloud-agnostic.

Katarina Holm: That's a major sticking point. We're on AWS and migrating to Azure for one AI service isn't realistic. We spent two years stabilizing after the last migration.

Katarina Holm: Now on compliance — our security review process is a real bottleneck. It typically takes 4 to 6 weeks minimum. Our CISO Dr. Andersson insists on a full architecture review before any AI system processes patient data. We need GDPR compliance documentation, EU data residency guarantees, and penetration test results. We've had vendors pull out rather than go through it. Nothing moves to procurement without security sign-off.

Ryan Foster: We anticipated that. I can have our full GDPR compliance package to Dr. Andersson by end of this week. Starting the security review now means it runs in parallel with the technical pilot.

Katarina Holm: One thing — when we asked Microsoft for HL7 FHIR integration documentation, they had it ready within 24 hours. Do you have equivalent documentation for the FHIR data format integration? Our integration team needs this before we can proceed with the technical evaluation.

Ryan Foster: Yes, we have a comprehensive FHIR integration guide. I'll send that along with the compliance package. It covers the exact JSON schema mapping for clinical data and the Epic middleware integration patterns.

Dr. Lars Eriksson: On the budget side — I have budget authority for the AI transformation initiative. The board approved 4.2 million euros last quarter. If the accuracy holds on our actual clinical data, I'll personally champion this to the board. But I need proof first.

Ryan Foster: Would a 30-day pilot across two hospitals make sense? De-identified clinical notes through Claude, measuring accuracy and time savings against your current system.

Katarina Holm: Exactly what we've been discussing. We'd use Karolinska and Uppsala — highest documentation volumes.

Dr. Lars Eriksson: There's one thing that really caught my attention from your last demo. When Ryan demonstrated the real-time clinical document extraction on our sample discharge summary — the way it structured the assessment and plan section with proper ICD-10 codes and cross-referenced the medication list — our engineering team visibly reacted. Katarina said afterward that the accuracy on Swedish clinical terminology was exactly what we needed. Microsoft couldn't match that level of accuracy in our testing.

Ryan Foster: That's great to hear. Let me bring our Solutions Architect Alex Kim to a live demo with your clinical informatics team next week. He's done three Scandinavian health system deployments.

[Anders Bjork joins the call]

Anders Bjork: Sorry I'm late. Katarina briefed me. I need to see a formal TCO comparison before the board presentation. The technology review board meets monthly, and any AI vendor needs board approval plus CISO sign-off. I've been leaning toward Microsoft on initial pricing, so make the case clearly.

Ryan Foster: Absolutely, Anders. I'll prepare a detailed TCO analysis factoring in infrastructure costs, accuracy-driven time savings, and the multi-language advantage. The key insight is that Microsoft's lower API pricing is offset by Azure migration costs and lower clinical accuracy requiring more physician review time.

Anders Bjork: I respect data. If the total cost is competitive and clinical accuracy is measurably better, I'll support it.

Katarina Holm: Let me summarize. Ryan sends GDPR compliance package and FHIR documentation this week. Live clinical demo with Alex Kim next week. TCO comparison for Anders before the board meeting on the 15th. Pilot proposal ready for board review.

Ryan Foster: I'll also include our EU healthcare customer reference list — four health systems in the Nordics that went live in the last 12 months.

Dr. Lars Eriksson: References from other Scandinavian systems would be very compelling. Thank you, Ryan.

Ryan Foster: Thank you all. Everything by Friday.`;

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

  // ── Also seed MedVista transcript_text for cross-deal demo ──
  console.log("\nSeeding MedVista transcript with transcript_text...");

  const [medvistaDeal] = await db
    .select({ id: schema.deals.id, name: schema.deals.name })
    .from(schema.deals)
    .where(ilike(schema.deals.name, "%MedVista%"))
    .limit(1);

  if (medvistaDeal) {
    const [mvExisting] = await db
      .select({ id: schema.callTranscripts.id })
      .from(schema.callTranscripts)
      .where(eq(schema.callTranscripts.dealId, medvistaDeal.id))
      .limit(1);

    if (mvExisting) {
      await db
        .update(schema.callTranscripts)
        .set({ transcriptText: MEDVISTA_TRANSCRIPT })
        .where(eq(schema.callTranscripts.id, mvExisting.id));
      console.log(`  Updated MedVista transcript with transcript_text`);
    }
  }

  console.log("Done!");
  await client.end();
}

main().catch(console.error);

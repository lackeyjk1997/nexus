/**
 * Seed: HealthFirst transcript with transcript_text populated
 * This enables the "Process Transcript" button for the cross-deal intelligence demo.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { eq, and, ilike } from "drizzle-orm";

const TRANSCRIPT_TEXT = `PARTICIPANTS:
- Sarah Chen (Account Executive, Anthropic)
- Alexander Goh (VP of Engineering, HealthFirst Insurance)
- Priya Mehta (Senior Data Engineer, HealthFirst Insurance)

---

Sarah Chen: Thanks for making time today, Alexander, Priya. I know your schedules are packed. Last time we talked about the claims processing automation at a high level — today I'd love to go deeper on the technical architecture and integration requirements.

Alexander Goh: Absolutely. We've actually been doing some internal evaluation since our last call. Priya, do you want to walk through where we are?

Priya Mehta: Sure. So right now we process about 50,000 patient records monthly through our claims pipeline. The manual review step takes roughly 2 minutes per record on average, and we need to get that under 30 seconds to hit our Q3 targets. We've been looking at a few options.

Sarah Chen: That's a significant volume. What does the current architecture look like?

Priya Mehta: We run on GCP, Python microservices, MongoDB for document storage. The claims come in as HL7 FHIR data, get normalized, then go through our rules engine. The bottleneck is the unstructured data extraction — discharge summaries, clinical notes, that kind of thing. Our current NLP models catch maybe 70% of the relevant codes.

Alexander Goh: Which is why we're looking at LLMs for this. We need something that can handle the nuance of medical terminology without requiring us to retrain models every time CMS updates their coding guidelines.

Sarah Chen: That's exactly the use case where Claude excels. The ability to reason about medical context rather than pattern-matching against a fixed vocabulary — that's a fundamental architectural difference. How are you thinking about the integration?

Priya Mehta: We'd need the API to handle HL7 FHIR data formats natively, or at least be able to parse the JSON FHIR bundles without us having to pre-process everything. Is that something Claude can do out of the box?

Sarah Chen: Yes, Claude handles FHIR bundles directly. I can share our healthcare integration guide that walks through the exact API patterns. Let me also mention — we've been working with several healthcare organizations on exactly this kind of pipeline, and the extraction accuracy is consistently above 95%.

Alexander Goh: That's promising. Now, I should mention — we've been evaluating Microsoft's Azure AI services as well. They've been pushing their compliance certifications and pricing is competitive. But we have concerns about vendor lock-in with Azure. Their solution requires us to deploy within their ecosystem, and we're already heavily invested in GCP.

Sarah Chen: That's an important consideration. With Claude, you maintain full platform independence — our API works identically regardless of your cloud provider. There's no infrastructure lock-in. And on pricing, while I can't speak to Microsoft's specific numbers, our customers consistently see better total cost of ownership over a 3-year horizon because there's no hidden infrastructure markup.

Priya Mehta: The vendor lock-in concern is real for us. We spent 18 months migrating off a proprietary system two years ago. Nobody wants to repeat that.

Alexander Goh: Agreed. Now, the compliance side — HIPAA is non-negotiable for us. We also need BAA signing capability. And our security review process is pretty involved. Typically 4-6 weeks. We need SOC 2 Type II, penetration test results, and our CISO has to do a full architecture review before we can proceed.

Sarah Chen: We have all of those ready. SOC 2 Type II, HIPAA compliance with BAA signing — I can get those documents to you this week so your CISO can start the review in parallel with our technical evaluation. The earlier we start that clock, the better.

Alexander Goh: Smart. Dr. Williams — she's our Chief Medical Officer — she controls the AI budget for the organization. She's been pushing for this automation initiative since last year, so the budget is pre-approved. But she'll want to see the accuracy numbers before she signs off on the final vendor selection.

Sarah Chen: Understood. Would it be possible to set up a brief session with Dr. Williams? Even 20 minutes to walk through our accuracy benchmarks and customer case studies would help her feel confident in the recommendation.

Alexander Goh: I can arrange that. She's on the technology review board too — they meet monthly, and any AI vendor needs board approval. The next meeting is in three weeks.

Priya Mehta: On the technical side, can we talk about the live demo you showed us last time? When you showed the real-time extraction on that sample discharge summary, that was the moment our team got excited. Can we do a larger-scale test with our actual documents?

Sarah Chen: Absolutely. We can set up a sandbox environment with a dedicated API endpoint. You'd send us a batch of de-identified records, and we'll process them through our healthcare-specific pipeline. You'll get back structured extractions with confidence scores for each field.

Priya Mehta: That would be exactly what we need. The engineering team has been asking for this. If the accuracy holds up on our actual data, I think we can move fast on the recommendation.

Alexander Goh: One more thing — we have a technology review board that meets monthly. Any AI vendor needs board approval. I want to make sure we have everything lined up for the next board meeting. What materials would you suggest we prepare?

Sarah Chen: I'd recommend three things: first, the accuracy results from the sandbox test — that's your hard evidence. Second, a TCO comparison showing the 3-year cost differential. Third, our compliance documentation package so the security team can confirm everything checks out. I'll help you put together a concise board brief that covers all three.

Alexander Goh: Perfect. Priya, can you own the sandbox test setup?

Priya Mehta: Already on it. Sarah, if you can send me the API documentation and the sandbox credentials, I'll have our test pipeline ready within a week. We have about 500 de-identified records we can use.

Sarah Chen: I'll send those over today. And I'll include our FHIR integration guide — it covers the exact JSON schema mapping for claims data.

Alexander Goh: Great. I think we have a clear path forward. Let me summarize: Priya runs the sandbox test, I'll schedule the Dr. Williams meeting, and we'll target the board review in three weeks. Sarah, anything else from your side?

Sarah Chen: Just one thing — I'd like to bring our Solutions Architect, Alex Kim, to the Dr. Williams meeting. He specializes in healthcare implementations and can speak to the clinical accuracy in detail.

Alexander Goh: That would be great. Let's plan on it.

Sarah Chen: Excellent. Thanks Alexander, Priya. I'll have the sandbox credentials and compliance docs to you by end of day.`;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Seeding HealthFirst transcript with transcript_text...");

  // Find the HealthFirst deal
  const [deal] = await db
    .select({ id: schema.deals.id, name: schema.deals.name })
    .from(schema.deals)
    .where(ilike(schema.deals.name, "%healthfirst%"))
    .limit(1);

  if (!deal) {
    console.error("HealthFirst deal not found");
    await client.end();
    process.exit(1);
  }

  console.log(`  Found deal: ${deal.name} (${deal.id})`);

  // Check if there's already a transcript with transcript_text
  const [existing] = await db
    .select({ id: schema.callTranscripts.id, title: schema.callTranscripts.title })
    .from(schema.callTranscripts)
    .where(
      and(
        eq(schema.callTranscripts.dealId, deal.id),
        ilike(schema.callTranscripts.title, "%Technical Deep-Dive%")
      )
    )
    .limit(1);

  if (existing) {
    // Update existing transcript to add transcript_text
    await db
      .update(schema.callTranscripts)
      .set({ transcriptText: TRANSCRIPT_TEXT })
      .where(eq(schema.callTranscripts.id, existing.id));
    console.log(`  Updated existing transcript "${existing.title}" with transcript_text`);
  } else {
    // Insert new transcript
    await db.insert(schema.callTranscripts).values({
      dealId: deal.id,
      title: "Technical Deep-Dive with HealthFirst Engineering Team",
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      durationSeconds: 35 * 60,
      participants: [
        { name: "Sarah Chen", role: "AE" },
        { name: "Alexander Goh", role: "VP of Engineering" },
        { name: "Priya Mehta", role: "Senior Data Engineer" },
      ],
      transcriptText: TRANSCRIPT_TEXT,
      source: "simulated",
      status: "complete",
    });
    console.log("  Inserted new transcript with transcript_text");
  }

  console.log("Done!");
  await client.end();
}

main().catch(console.error);

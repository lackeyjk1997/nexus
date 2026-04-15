/**
 * Seed: Dense 15-minute transcripts for cross-deal intelligence demo
 * MedVista (Sarah Chen, Discovery) + NordicMed (Ryan Foster, Technical Validation)
 * Both mention Microsoft/DAX Copilot and security review friction (6-8 weeks)
 * for intelligence coordinator cross-deal pattern detection.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";
import { eq, and, ilike } from "drizzle-orm";

// ── MedVista transcript — Sarah Chen's healthcare deal (Discovery) ──
const MEDVISTA_TRANSCRIPT = `Sarah Chen: Henrik, thanks for making time today. I really appreciated the walkthrough you gave me last week on MedVista's clinical documentation challenges. I wanted to pick up right where we left off — you mentioned you'd been thinking more about AI for clinical documentation since our intro call.

Henrik Mueller: Yeah, I have, Sarah. Quite a lot actually. I pulled together some internal data after we spoke and the picture is honestly worse than I initially described. We've been tracking clinician time allocation for the past two quarters and the documentation burden is… it's significant.

Sarah Chen: Tell me what you found.

Henrik Mueller: So our clinicians — and I'm talking across all departments, not just primary care — they're spending somewhere between 25 and 30 hours per week on documentation. Per clinician. That's effectively three full working days out of five just doing paperwork. And it's not like they're being slow about it, the workflows are just inherently manual.

Sarah Chen: That's higher than the industry benchmarks I typically see. Is that including the review and co-sign cycle or just the initial note creation?

Henrik Mueller: Everything. Initial dictation, structured field entry, review, corrections, co-signature by the attending. The whole chain. And here's what really worries me — our error rate on clinical notes is running between 8 and 12 percent. That means roughly one in ten clinical notes has some kind of documentation error. Could be a wrong code, a missed medication interaction, an incomplete procedure note.

Sarah Chen: What kind of downstream impact are you seeing from those errors?

Henrik Mueller: We had two compliance incidents last quarter directly attributable to documentation errors. One was a coding error on an oncology treatment plan that triggered a payer audit. The other was a medication reconciliation miss that, thankfully, was caught before it reached the patient. But both went through our compliance review process and consumed enormous internal resources to remediate.

Sarah Chen: That's the kind of thing that keeps compliance officers up at night. Walk me through the current workflow — like, step by step, what happens from the moment a clinician finishes seeing a patient?

Henrik Mueller: Sure. So our EHR is Epic — Hyperspace specifically, hosted on-prem in our data center. After a patient encounter, the clinician dictates their notes using Dragon Medical. Dragon does the speech-to-text transcription and that output goes into an Epic SmartPhrase template. So you've got this structured template with fields for diagnosis codes, medication lists, procedure notes, assessment and plan — and the clinician has to manually review and edit every one of those structured fields.

Sarah Chen: So Dragon gets the dictation right but doesn't understand the clinical context?

Henrik Mueller: Exactly. Dragon will accurately transcribe "patient presents with stage 3B non-small cell lung carcinoma" but it can't auto-populate the TNM staging fields, it can't map to the right ICD-10 codes, it can't pull the treatment protocol references. The clinician ends up doing data entry from their own dictation. It's absurd when you think about it.

Sarah Chen: They're essentially translating their own words into structured data.

Henrik Mueller: Right. And for oncology specifically, it gets worse. We also feed into our tumor registry system — NAACCR format — and that's a completely separate data entry step. The oncology nurses spend probably an additional 45 minutes per patient just handling the registry submission.

Sarah Chen: What about your broader data infrastructure? Where does all this live?

Henrik Mueller: Epic is on-prem, as I said. Our analytics platform is Azure-based — we use Snowflake as our data warehouse. Interoperability is through HL7 FHIR interfaces. But all PHI stays within our data center currently. We haven't approved any cloud PHI processing. That's been a firm boundary for our CISO.

Sarah Chen: And you mentioned your IT team looked at building something internally?

Henrik Mueller: Yeah, we explored it. Had a few engineers prototype some NLP-based extraction tools. But we don't have the ML expertise in-house, and honestly our IT team is already underwater maintaining the Epic integrations and the HL7 interfaces. Adding a custom AI project on top of that wasn't realistic. We shelved it after about six weeks.

Sarah Chen: That's a common pattern I see — the internal build looks attractive until you realize the ongoing maintenance and model improvement cycle.

Henrik Mueller: Exactly. So let me give you the hard numbers because I know you'll want them. We have 340 clinicians. Average fully loaded cost is about $180 an hour. Documentation eats 25 hours a week per clinician. You do the math — that's roughly $800,000 a month in clinician time spent on paperwork. And that's before you factor in the compliance costs. We spent $2.1 million last year on compliance remediation related to documentation errors.

Sarah Chen: $800K monthly in documentation time plus $2.1 million in compliance costs. Those are compelling numbers for building an ROI case.

Henrik Mueller: And I should tell you — I've already started socializing this internally. I presented the AI documentation concept to our Chief Medical Officer, Dr. Patel, about three weeks ago. She's supportive. She's seen the clinician burnout data and she's concerned about the compliance exposure. She actually asked me to accelerate the evaluation.

Sarah Chen: That's great to hear. Is Dr. Patel someone who would champion this at the executive level?

Henrik Mueller: She's the clinical champion for sure. She carries a lot of weight with the board on anything clinical. What I need from you is — what materials can I share internally? I want to keep the momentum going. If I can get Dr. Patel a one-pager on Claude's clinical documentation capabilities and maybe a case study from a similar health system, that would help her socialize it with the other department heads.

Sarah Chen: I'll put together a tailored brief for Dr. Patel this week. We have a case study from a 300-bed health system that reduced documentation time by 62 percent — very similar profile to MedVista.

Henrik Mueller: Perfect. Now I should be transparent about something. We saw a demo of DAX Copilot from the Microsoft team about two weeks ago. It looked solid for ambient listening — the idea of passively capturing the patient encounter and generating notes automatically. But we had real concerns about customization for our specialty workflows. Oncology documentation is very different from general practice. The TNM staging, the treatment protocol cross-referencing, the NAACCR formatting — DAX couldn't handle any of that out of the box.

Sarah Chen: That's a critical distinction. DAX Copilot is designed for general ambient documentation — it's good at capturing conversational flow but it doesn't do the structured clinical reasoning that specialty workflows require. Claude is fundamentally different because it understands clinical context. It can extract TNM staging from a dictation, map it to the correct ICD-10 codes, cross-reference treatment protocols, and generate the structured output your Epic templates need.

Henrik Mueller: That's exactly what our CISO flagged too — the data residency question. When we asked the Microsoft team about EU data residency, they couldn't give us a clear answer. They kept talking about Azure regions but couldn't confirm that PHI processing would stay within our compliance boundary. Our CISO basically shut the conversation down at that point.

Sarah Chen: Our architecture is different. Claude's API can be configured for data residency requirements — processing stays within your specified region. And we support BAA agreements for healthcare customers. I'll include the data residency documentation in the package for your CISO.

Henrik Mueller: Good, because that's going to come up again. Our CFO, Marcus Webb, will need to approve anything over $500,000 annually. Marcus is very ROI-focused — he wants to see payback within 12 months. I haven't brought Marcus into this yet. I wanted to make sure the technical fit was there before I involved him. No point getting the CFO excited about something that doesn't work.

Sarah Chen: That's a smart approach. When you're ready, I can prepare a TCO analysis tailored to your numbers — the $800K monthly documentation cost, the $2.1 million compliance spend — that should make the payback period very clear.

Henrik Mueller: Let me walk you through what the approval process looks like. First, our CISO team does a security review. And I'll be honest — this has been a bottleneck. Our security team is backed up. Their last three vendor reviews each took 6 to 8 weeks. They require SOC 2 Type II, penetration test results, architecture review, data flow diagrams, the works.

Sarah Chen: We can front-load that. I'll have our complete security package to your CISO by end of this week — SOC 2, pen test results, architecture docs, data flow diagrams, all of it.

Henrik Mueller: Good. After security clears, step two is a technical evaluation. I want to run a pilot group — maybe 20 clinicians in oncology — for 30 days. Measure accuracy, time savings, clinician satisfaction. Step three is the CFO business case presentation with Marcus. And step four is board approval — anything classified as AI touching clinical data requires board sign-off.

Sarah Chen: So the security review is the critical path. If we start that this week, even at 6 to 8 weeks, you'd have clearance by mid-June. That gives you time for a 30-day pilot in July and the business case in August.

Henrik Mueller: That's exactly my timeline.

Sarah Chen: Let me connect something you mentioned earlier. You said the documentation errors aren't just a time problem — you had two compliance incidents last quarter. What happens if you get audited and those incidents come up? Is there regulatory exposure beyond the remediation costs?

Henrik Mueller: That's actually what got Dr. Patel's attention. We could be looking at CMS penalties. The coding error on the oncology treatment plan — if that had been flagged in a CMS audit rather than caught internally, we're talking about potential False Claims Act exposure. Our compliance counsel estimated the worst case at $1.5 to $3 million in penalties per incident. That's what moved this from a "nice to have" to an urgent priority.

Sarah Chen: So the risk isn't just operational — it's existential from a compliance standpoint.

Henrik Mueller: Correct. And on the procurement side, our process runs through a formal RFP for any vendor engagement over $200,000. Legal review takes 3 to 4 weeks after security clears. We need a standard MSA with a BAA — the BAA is non-negotiable for healthcare data.

Sarah Chen: Understood. We have standard BAA templates that most health systems approve quickly.

Henrik Mueller: Now, here's what I really want to explore. Could we start with a small proof of concept? Forget the full rollout for now. Could we get Claude running on just the oncology department first? Maybe 15 to 20 clinicians? I'd rather show results to Marcus than show him a slide deck.

Sarah Chen: Absolutely. A targeted POC is the fastest path to internal buy-in.

Henrik Mueller: Let me be specific about what I'd want the prototype to do. Take a clinician's raw dictation — or their session notes, whatever format they're working in — and output a structured clinical note. I want it to auto-populate the ICD-10 codes, the TNM staging fields, medication reconciliation, and treatment protocol references. All formatted to drop directly into our Epic SmartPhrase template. No manual data entry by the clinician.

Sarah Chen: That's exactly what Claude excels at — structured extraction with clinical reasoning.

Henrik Mueller: And it has to handle oncology-specific terminology correctly. I don't want it guessing on staging or treatment protocols. If it's uncertain about something, I'd rather it flag it for human review than populate the wrong code. A wrong ICD-10 code is worse than a blank field.

Sarah Chen: That's how we've designed it. Claude generates confidence scores for every extracted field. Anything below a configurable threshold gets flagged for clinician review rather than auto-populated. Your clinicians stay in control.

Henrik Mueller: Good. And one more thing — ideally the system would also generate the NAACCR tumor registry submission as a secondary output. Right now that's a completely separate manual step and it's a huge time sink for the oncology nurses.

Sarah Chen: We can absolutely include NAACCR output in the prototype scope. Would you be able to share some sample de-identified notes? Maybe 10 to 15 examples across different oncology scenarios — staging, treatment planning, follow-up visits? That would let us build the prototype against your actual documentation patterns.

Henrik Mueller: I can have those to you by next Wednesday. We have a de-identification pipeline so that shouldn't be an issue.

Sarah Chen: Perfect. So let me propose next steps. First, I'll send the complete security package to your CISO this week to kick off the security review. Second, I'll schedule a technical demo with your engineering team — I'd like to bring our Solutions Architect, Alex Kim, who's done similar healthcare deployments. Third, I'll prepare the ROI analysis with your specific metrics for when you're ready to engage Marcus. And once I have the de-identified sample notes, we'll build the oncology prototype.

Henrik Mueller: That works for me. I'll send you our security questionnaire — it's a 200-question monster but at least you'll know exactly what they're looking for. And I'll set up the engineering team demo for early next week. My integration lead, James, will want to see the FHIR compatibility and the Epic template mapping.

Sarah Chen: Sounds good. I'll have the security package and the Dr. Patel brief out by Thursday.

Henrik Mueller: Thanks, Sarah. I have a good feeling about this. The Microsoft demo left us underwhelmed — this feels like it could actually solve the problem rather than just partially address it.

Sarah Chen: I appreciate that, Henrik. We'll make sure the technical reality matches the vision. Talk to you next week.

Henrik Mueller: Looking forward to it.`;

// ── NordicMed transcript — Ryan Foster's healthcare deal (Technical Validation) ──
const NORDICMED_TRANSCRIPT = `Ryan Foster: Dr. Larsson, thanks for making time. It's been three weeks since we kicked off the pilot and I've been looking forward to hearing how it's going. How are things on your end?

Dr. Ingrid Larsson: Ryan, good to connect. Things have been busy — we've been collecting a lot of data from the pilot group and I have both good news and some things we need to discuss.

Ryan Foster: Let's hear it all. Start with the good news.

Dr. Ingrid Larsson: So we had 22 clinicians using Claude for radiology report generation over the three-week period. The results are frankly better than we expected on the core metrics. Turnaround time for a finalized radiology report dropped from an average of 4 hours to 45 minutes. That's the full cycle — from the initial dictation through structured report generation to radiologist sign-off.

Ryan Foster: That's an 81 percent reduction. How did the radiologists feel about the quality?

Dr. Ingrid Larsson: We had three senior radiologists independently review a random sample of 200 AI-generated draft reports against the source imaging and dictation. They rated overall accuracy at 94 percent. Which is genuinely impressive — our current manual process runs about 91 percent accuracy, so Claude is actually outperforming human-only workflows on first-pass accuracy.

Ryan Foster: That's a strong result. You said there were things to discuss though?

Dr. Ingrid Larsson: Yes. We identified two edge cases where Claude hallucinated findings. In one case, it described a 3-millimeter nodule in a chest CT that wasn't present in the imaging. In the second, it overstated the BI-RADS category on a mammography report — classified a BI-RADS 3 finding as BI-RADS 4, which would have triggered an unnecessary biopsy recommendation.

Ryan Foster: Were those caught before they reached patients?

Dr. Ingrid Larsson: Yes, both were caught during the radiologist review step. That's by design — nothing goes out without a radiologist sign-off. But it raised a legitimate concern from my clinical leads. They want to understand what guardrails exist to prevent these kinds of errors at scale. If we roll this out to 200-plus radiologists, the review burden has to be manageable.

Ryan Foster: Absolutely. Those are exactly the kind of edge cases our clinical team specializes in. We have a structured approach — confidence scoring on every generated finding, mandatory flagging when confidence is below a configurable threshold, and we can implement specific guardrails for high-stakes classifications like BI-RADS and Lung-RADS scoring. I'd like to get our clinical AI team on a call with your radiologists to walk through the specific hallucination cases and show how the guardrails would have caught them.

Dr. Ingrid Larsson: That would be helpful. Now, I should mention something else that's come up. Our board asked us to also evaluate Microsoft's solution. Their team came in last week with a presentation on DAX Copilot. They're offering pretty aggressive pricing — it's bundled with our existing Azure Enterprise Agreement, so the incremental cost looks very attractive on paper.

Ryan Foster: That's not uncommon. We see Microsoft bundling AI services into existing Enterprise Agreements at a lot of healthcare organizations. What was the board's reaction to the actual product capabilities?

Dr. Ingrid Larsson: Mixed, honestly. The DAX ambient listening demo was polished. But when we asked about structured radiology report generation specifically — auto-populating BI-RADS scores, Lung-RADS classifications, generating standardized findings and impressions — they acknowledged that's not where DAX is strongest. Their sweet spot is ambient encounter documentation for primary care, not specialty radiology workflows.

Ryan Foster: Right. DAX Copilot is fundamentally an ambient listening tool. It's good at capturing conversational clinical encounters. But radiology is a completely different workflow — you're not capturing patient conversations, you're generating structured diagnostic reports from imaging findings and dictated impressions. Claude is built for that kind of clinical reasoning.

Dr. Ingrid Larsson: The accuracy difference was noticeable. When we ran the same set of test cases through both systems, Claude was significantly more accurate on structured output. But the board sees the bundling savings and they want a formal comparison. My CTO is supportive of Claude based on the pilot results, but the financial argument for Microsoft is compelling from a pure cost perspective.

Ryan Foster: I'll prepare a detailed TCO analysis that factors in the full picture — not just API pricing but implementation costs, accuracy-driven rework time, and the operational impact of lower accuracy on radiologist review burden. When you factor in that Claude reduces review time while a less accurate system increases it, the economics shift significantly.

Dr. Ingrid Larsson: That's exactly the argument I need to make. Now, here's my bigger headache. Our CISO has been reviewing Anthropic's security documentation for five weeks now. I started the process the day after our second call and I still don't have a timeline for completion. Every vendor review seems to take longer than the last — he told me security reviews are running 6 to 8 weeks minimum now. He's got three other vendor evaluations in the queue ahead of us.

Ryan Foster: That's frustrating, especially with the pilot showing strong results. Would it help if we set up a direct call between our security team and your CISO? Sometimes a 30-minute conversation resolves more questions than weeks of document exchange.

Dr. Ingrid Larsson: Yes, I'd appreciate that. Dr. Nilsson — that's our CISO — he's thorough but reasonable. A direct technical conversation with your security architects would probably accelerate things. He has specific questions about data processing locations and encryption at rest that he says aren't fully addressed in the documentation we received.

Ryan Foster: I'll set that up this week. Our head of healthcare security can do a dedicated session with Dr. Nilsson. Now, tell me more about your current infrastructure. I want to make sure we're designing the production integration correctly.

Dr. Ingrid Larsson: Sure. Our EHR is Cerner Millennium — we migrated from a legacy system about two years ago. The radiology workflow goes like this: an imaging study comes in, the radiologist opens PowerScribe for dictation, transcription happens, the report gets finalized in our PACS — we use Sectra — and then results flow back to Cerner through an HL7 interface.

Ryan Foster: And where does Claude sit in that flow during the pilot?

Dr. Ingrid Larsson: Right now, Claude sits between the PowerScribe output and the final report. It takes the raw dictation from PowerScribe and generates a structured radiology report with standardized findings, impressions, and — where applicable — BI-RADS or Lung-RADS scoring. The radiologist reviews the AI-generated draft in Sectra and either approves or edits before it flows to Cerner.

Ryan Foster: Got it. What's your cloud infrastructure like?

Dr. Ingrid Larsson: We're Azure-based. We have a private VNET dedicated to PHI workloads — all clinical data processing happens within that boundary. Every third-party clinical integration routes through our API gateway — we use Kong — and there are strict mTLS requirements for anything touching patient data.

Ryan Foster: So for production, the integration would go through Kong with mTLS, processing within your Azure VNET.

Dr. Ingrid Larsson: Exactly. And here's an important question — can Claude be deployed within our Azure tenant? Or do API calls go to Anthropic's infrastructure? This matters for our data processing agreement. Our legal team needs to understand exactly where PHI is processed.

Ryan Foster: Currently, Claude API calls go to Anthropic's infrastructure, but we offer data residency guarantees — processing stays within specified regions, and we have a comprehensive BAA that covers the data flow. For customers with strict in-tenant requirements, we're also developing private deployment options. I'll get you the specific details on both approaches so your legal team can evaluate.

Dr. Ingrid Larsson: Good. One more infrastructure point — we're building a clinical data lake on Databricks. We want the AI-structured output from radiology reports to feed directly into Databricks for research analytics. Can Claude's output be configured as a structured data feed — JSON or Parquet — that plugs into our data pipeline?

Ryan Foster: Absolutely. Claude's output is natively structured — we can format it as JSON with whatever schema your Databricks pipeline expects. We've done similar integrations with other health systems feeding AI-structured data into analytics platforms.

Dr. Ingrid Larsson: Now I have some technical questions that came up from my engineering team. First — model updates and version control. How does Anthropic handle model changes for clinical deployments? If we deploy Claude Sonnet today and you release a new version next month, does our output format change? Our downstream systems — Sectra, Cerner, the Databricks pipeline — they all depend on consistent structured output.

Ryan Foster: Great question. We offer pinned model versions for clinical customers. When you deploy, you pin to a specific model version. That version doesn't change unless you explicitly choose to upgrade. When a new version is released, we provide a migration guide and a parallel testing period where you can run both versions side by side and validate output consistency before switching.

Dr. Ingrid Larsson: What about audit trails? Our compliance team needs a complete audit trail for every AI-generated report — what input went in, what output came out, what model version generated it, and whether a radiologist modified the output.

Ryan Foster: Full audit logging is built in. Every API call is logged with input, output, model version, timestamps, and a unique request ID. We can also integrate with your existing audit infrastructure through webhook events or direct log forwarding.

Dr. Ingrid Larsson: And latency. Our radiologists need reports generated in under 30 seconds to maintain workflow efficiency. During the pilot, we saw average response times around 12 seconds, which was great. But there were a few instances during peak hours where it spiked to 45 seconds. Can you guarantee consistent latency at scale?

Ryan Foster: The 12-second average is typical. The spikes you saw were likely due to the pilot running on shared infrastructure. For production clinical deployments, we offer dedicated throughput guarantees with SLA-backed latency targets. I'll include the specific SLA terms in the proposal.

Dr. Ingrid Larsson: OK. Switching topics — stakeholder dynamics. My CTO, Dr. Anders Berg, is fully supportive. He's seen the pilot data and he's convinced. But our CMO, Dr. Kristina Holm, has concerns about AI liability. Specifically — if an AI-generated report contains an error that affects patient care, where does the liability sit? Our legal counsel wants specific contractual language about AI-generated content disclaimers.

Ryan Foster: That's a conversation we've had with every healthcare customer. We have standard liability frameworks and indemnification language that we've developed with input from healthcare legal experts. I'll send those to your legal team this week. The short answer is that the radiologist review and sign-off step keeps the clinical liability where it belongs — with the reviewing physician. Claude is a drafting tool, not a diagnostic tool.

Dr. Ingrid Larsson: That's the right framing. Dr. Holm will want to see that in writing though.

Ryan Foster: Understood. Now, what's the timeline pressure? You mentioned the board earlier.

Dr. Ingrid Larsson: We need to make a decision within 6 weeks. The current pilot budget expires at the end of May, and our board review is scheduled for the May meeting. If we don't have a recommendation by then, we lose the budget allocation and have to re-request in the next fiscal cycle. Which effectively delays this by 6 months.

Ryan Foster: So the critical path is: security review completion, TCO comparison with Microsoft, and legal framework — all within 6 weeks.

Dr. Ingrid Larsson: Correct. And the security review is the bottleneck. If Dr. Nilsson's review drags past week 8, we won't have time for the other steps before the board meeting.

Ryan Foster: Let's make sure that doesn't happen. Here's what I propose. First, I'll set up the CISO-to-CISO security call this week — that should unblock the specific questions Dr. Nilsson has. Second, I'll send the edge case analysis from our clinical team addressing the two hallucination instances from the pilot, with specific guardrail recommendations. Third, I'll prepare the TCO comparison showing the full cost picture versus Microsoft's bundled pricing, including the accuracy-driven productivity differential. And fourth, I'll send the liability framework and indemnification language for your legal counsel.

Dr. Ingrid Larsson: That covers everything I need. Can I also get the full pilot report in a format I can present directly to the board? The raw data is good but I need a polished executive summary with the key metrics — time reduction, accuracy improvement, cost projections.

Ryan Foster: I'll prepare a board-ready executive summary alongside the detailed pilot report. We can co-develop it if you want — make sure it addresses the specific questions your board is likely to ask.

Dr. Ingrid Larsson: That would be great. Let me also share our side — I'll send you the complete quantitative pilot report by end of this week. 22 clinicians, 200 reviewed reports, all the accuracy and timing data. You'll have everything you need to build the TCO comparison.

Ryan Foster: Perfect. I'll have the security call set up and all the documents to you within a week. Let's sync again next Tuesday to make sure everything's on track for the board timeline.

Dr. Ingrid Larsson: Sounds good, Ryan. The pilot results are strong — I just need to clear these remaining hurdles. If the security review and the Microsoft comparison both go our way, I think we have a compelling case.

Ryan Foster: I agree. The 94 percent accuracy and the 81 percent time reduction speak for themselves. Let's make sure the board sees the full picture.

Dr. Ingrid Larsson: Thanks, Ryan. Talk to you Tuesday.

Ryan Foster: Thanks, Dr. Larsson. I'll have everything moving by tomorrow.`;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  // ── Seed MedVista transcript_text ──
  console.log("Seeding MedVista transcript with dense transcript_text...");

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
        .set({
          transcriptText: MEDVISTA_TRANSCRIPT,
          title: "Discovery Call — MedVista Health Systems",
          durationSeconds: 19 * 60,
          participants: [
            { name: "Sarah Chen", role: "AE" },
            { name: "Henrik Mueller", role: "CTO" },
          ],
        })
        .where(eq(schema.callTranscripts.id, mvExisting.id));
      console.log(`  Updated MedVista transcript: ${medvistaDeal.name}`);
    } else {
      await db.insert(schema.callTranscripts).values({
        dealId: medvistaDeal.id,
        title: "Discovery Call — MedVista Health Systems",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        durationSeconds: 19 * 60,
        participants: [
          { name: "Sarah Chen", role: "AE" },
          { name: "Henrik Mueller", role: "CTO" },
        ],
        transcriptText: MEDVISTA_TRANSCRIPT,
        source: "simulated",
        status: "complete",
      });
      console.log(`  Inserted new MedVista transcript`);
    }
  } else {
    console.error("MedVista deal not found");
  }

  // ── Seed NordicMed transcript_text ──
  console.log("\nSeeding NordicMed transcript with dense transcript_text...");

  const [nordicmedDeal] = await db
    .select({ id: schema.deals.id, name: schema.deals.name })
    .from(schema.deals)
    .where(ilike(schema.deals.name, "%NordicMed%"))
    .limit(1);

  if (!nordicmedDeal) {
    console.error("NordicMed deal not found");
    await client.end();
    process.exit(1);
  }

  console.log(`  Found deal: ${nordicmedDeal.name} (${nordicmedDeal.id})`);

  const [existing] = await db
    .select({ id: schema.callTranscripts.id, title: schema.callTranscripts.title })
    .from(schema.callTranscripts)
    .where(eq(schema.callTranscripts.dealId, nordicmedDeal.id))
    .limit(1);

  if (existing) {
    await db
      .update(schema.callTranscripts)
      .set({
        transcriptText: NORDICMED_TRANSCRIPT,
        title: "Technical Validation — NordicMed Group",
        durationSeconds: 18 * 60,
        participants: [
          { name: "Ryan Foster", role: "AE" },
          { name: "Dr. Ingrid Larsson", role: "VP of Digital Health" },
        ],
      })
      .where(eq(schema.callTranscripts.id, existing.id));
    console.log(`  Updated existing transcript with new dense transcript_text`);
  } else {
    await db.insert(schema.callTranscripts).values({
      dealId: nordicmedDeal.id,
      title: "Technical Validation — NordicMed Group",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      durationSeconds: 18 * 60,
      participants: [
        { name: "Ryan Foster", role: "AE" },
        { name: "Dr. Ingrid Larsson", role: "VP of Digital Health" },
      ],
      transcriptText: NORDICMED_TRANSCRIPT,
      source: "simulated",
      status: "complete",
    });
    console.log("  Inserted new NordicMed transcript with transcript_text");
  }

  // ── Seed deterministic contacts for MedVista (from transcript) ──
  console.log("\nSeeding MedVista transcript contacts...");
  if (medvistaDeal) {
    // Find the MedVista company
    const [mvDealFull] = await db
      .select({ companyId: schema.deals.companyId })
      .from(schema.deals)
      .where(eq(schema.deals.id, medvistaDeal.id))
      .limit(1);

    if (mvDealFull?.companyId) {
      // Delete existing random contacts for MedVista and re-insert deterministic ones
      await db.delete(schema.contacts).where(eq(schema.contacts.companyId, mvDealFull.companyId));

      await db.insert(schema.contacts).values([
        {
          firstName: "Henrik",
          lastName: "Mueller",
          title: "IT Director",
          email: "henrik.mueller@medvista.com",
          companyId: mvDealFull.companyId,
          roleInDeal: "champion",
          isPrimary: true,
        },
        {
          firstName: "Dr. Rajesh",
          lastName: "Patel",
          title: "Chief Medical Officer",
          email: "r.patel@medvista.com",
          companyId: mvDealFull.companyId,
          roleInDeal: "end_user",
        },
        {
          firstName: "Marcus",
          lastName: "Webb",
          title: "Chief Financial Officer",
          email: "m.webb@medvista.com",
          companyId: mvDealFull.companyId,
          roleInDeal: "economic_buyer",
        },
        {
          firstName: "James",
          lastName: "Hoffmann",
          title: "Integration Lead",
          email: "j.hoffmann@medvista.com",
          companyId: mvDealFull.companyId,
          roleInDeal: "technical_evaluator",
        },
      ]);
      console.log("  ✓ MedVista contacts: Henrik Mueller, Dr. Patel, Marcus Webb, James Hoffmann");
    }
  }

  // ── Seed deterministic contacts for NordicMed (from transcript) ──
  console.log("Seeding NordicMed transcript contacts...");
  if (nordicmedDeal) {
    const [nmDealFull] = await db
      .select({ companyId: schema.deals.companyId })
      .from(schema.deals)
      .where(eq(schema.deals.id, nordicmedDeal.id))
      .limit(1);

    if (nmDealFull?.companyId) {
      // Delete existing contacts and re-insert transcript-matching ones
      await db.delete(schema.contacts).where(eq(schema.contacts.companyId, nmDealFull.companyId));

      await db.insert(schema.contacts).values([
        {
          firstName: "Dr. Ingrid",
          lastName: "Larsson",
          title: "VP of Digital Health",
          email: "i.larsson@nordicmed.com",
          companyId: nmDealFull.companyId,
          roleInDeal: "champion",
          isPrimary: true,
        },
        {
          firstName: "Dr. Anders",
          lastName: "Berg",
          title: "Chief Technology Officer",
          email: "a.berg@nordicmed.com",
          companyId: nmDealFull.companyId,
          roleInDeal: "technical_evaluator",
        },
        {
          firstName: "Dr. Kristina",
          lastName: "Holm",
          title: "Chief Medical Officer",
          email: "k.holm@nordicmed.com",
          companyId: nmDealFull.companyId,
          roleInDeal: "end_user",
        },
        {
          firstName: "Dr. Erik",
          lastName: "Nilsson",
          title: "Chief Information Security Officer",
          email: "e.nilsson@nordicmed.com",
          companyId: nmDealFull.companyId,
          roleInDeal: "technical_evaluator",
        },
        {
          firstName: "Anders",
          lastName: "Björk",
          title: "Chief Financial Officer",
          email: "a.bjork@nordicmed.com",
          companyId: nmDealFull.companyId,
          roleInDeal: "economic_buyer",
        },
      ]);
      console.log("  ✓ NordicMed contacts: Dr. Larsson, Dr. Berg, Dr. Holm, Dr. Nilsson, Björk");
    }
  }

  console.log("\nDone!");
  await client.end();
}

main().catch(console.error);

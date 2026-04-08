/**
 * Seed: Horizon Health Partners — Deal Fitness demo account
 *
 * Creates a realistic 8-week late-stage Healthcare deal:
 *   • Company: Horizon Health Partners (4,200 employees, $890M revenue)
 *   • 7 contacts: Amanda Chen (champion), Priya Mehta (tech eval), Robert Garrison (EB),
 *     Lisa Huang (end user), James Whitfield (CISO), Mark Davidson (procurement),
 *     Dr. Sarah Kim (CMO/coach)
 *   • Deal: $1.8M Claude Enterprise, Negotiation, Sarah Chen (AE) + Alex Kim (SC)
 *   • 5 dense call transcripts (2,500-4,000 words each)
 *   • 14 email activities showing buyer-committee expansion and accelerating
 *     response times
 *   • MEDDPICC populated from transcript evidence
 *   • 9 deal milestones tracking buyer's journey
 *
 * Idempotent: checks for existing Horizon Health Partners and exits early if found.
 *
 * Run:  cd packages/db && npx tsx src/seed-deal-fitness.ts
 */
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

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ── UUID constants ──
const HORIZON_COMPANY_ID = "e0000001-0001-4000-8000-000000000001";

const C_AMANDA_ID    = "e1000001-0001-4000-8000-000000000001"; // VP Clinical Innovation (champion)
const C_PRIYA_ID     = "e1000001-0002-4000-8000-000000000002"; // Director IT (technical_evaluator)
const C_ROBERT_ID    = "e1000001-0003-4000-8000-000000000003"; // CFO (economic_buyer)
const C_LISA_ID      = "e1000001-0004-4000-8000-000000000004"; // VP Operations (end_user)
const C_JAMES_ID     = "e1000001-0005-4000-8000-000000000005"; // CISO (blocker)
const C_MARK_ID      = "e1000001-0006-4000-8000-000000000006"; // Procurement (end_user)
const C_SARAH_KIM_ID = "e1000001-0007-4000-8000-000000000007"; // CMO (coach)

const HORIZON_DEAL_ID = "e2000001-0001-4000-8000-000000000001";

const T_DISCOVERY_ID  = "e3000001-0001-4000-8000-000000000001";
const T_TECHNICAL_ID  = "e3000001-0002-4000-8000-000000000002";
const T_BUSINESS_ID   = "e3000001-0003-4000-8000-000000000003";
const T_SECURITY_ID   = "e3000001-0004-4000-8000-000000000004";
const T_EXEC_ID       = "e3000001-0005-4000-8000-000000000005";

const HORIZON_MEDDPICC_ID = "e7000001-0001-4000-8000-000000000001";

// ── Transcript content ──

const DISCOVERY_TRANSCRIPT = `Sarah Chen: Dr. Chen, thanks so much for making the time today. I really appreciated your message after the webinar — it's not every day that someone reaches out within an hour of the closing slide. How was the rest of your week?

Dr. Amanda Chen: Honestly, Sarah, the rest of my week has looked exactly like the slides you were showing. Our hospitalists are drowning in clinical documentation and I've been spending most of the past two days in conversations about it. So your timing was uncanny. When you put up that chart on physician documentation hours, I almost laughed out loud because we just ran that exact analysis internally last month.

Sarah Chen: Tell me about the analysis. What did you find?

Dr. Amanda Chen: So a little context first. Horizon Health Partners is a regional health system. We operate fourteen facilities across Minnesota and Wisconsin. Three hundred and twelve physicians on staff, somewhere around forty-five thousand patient encounters per month, give or take. We're known in the region for being early adopters on clinical technology, which is a blessing and a curse. The blessing is that our docs will try new tools. The curse is that we end up evaluating a lot of them, and most don't survive contact with reality.

Sarah Chen: That's a great frame. What's the documentation reality look like for your physicians right now?

Dr. Amanda Chen: It looks like roughly two hours a day per physician spent on clinical notes. We measured this directly — we asked a sample of forty physicians across specialties to log their time for two weeks. The average came out to one hour and fifty-three minutes per day on documentation. The high end was a hospitalist who logged three hours and ten minutes. And keep in mind, this is on top of patient care, not instead of it. So they're working an extra two hours a day, every day, just to keep up with the EHR.

Sarah Chen: That tracks with what we see in the literature. Two hours a day on documentation is roughly the national average for hospital-based physicians. Are you seeing downstream effects from that — burnout, turnover, anything you can quantify?

Dr. Amanda Chen: That's actually the part that made me pick up the phone. We lost three hospitalists last year. All three of them cited documentation burden in their exit interviews — not the only reason, but a significant reason. And our CFO tracked the replacement cost. Recruiting, signing bonuses, locum coverage during the gap, onboarding ramp time. It came out to roughly four hundred thousand per hospitalist. So three hospitalists, one point two million dollars in turnover costs in a single year, traceable in part to documentation burden.

Sarah Chen: That's a number that gets a CFO's attention.

Dr. Amanda Chen: It absolutely did. Our CFO, Robert Garrison, has been talking about physician retention as one of his top three financial priorities for this fiscal year. So when I started looking at AI documentation tools, I had a really clear business case framework in my head from day one. This isn't just about productivity. It's about retention.

Sarah Chen: I want to make sure I understand the current state of your documentation tooling. What are physicians using today?

Dr. Amanda Chen: Dragon Medical. We've had Dragon deployed for about three years now. And look, Dragon is a fine product for what it is. It transcribes voice to text, it integrates with Epic, it has a defensible market position. But here's the problem — and this is going to sound petty but I promise it's not — the specialty terminology accuracy is terrible. Our cardiologists have basically given up on it. When you dictate "the patient has a left ventricular ejection fraction of forty-five percent with mild concentric hypertrophy and a moderately enlarged left atrium," Dragon will produce output that's somewhere between mostly right and complete word salad depending on the day. So the cardiologists end up either fighting the transcription corrections or just typing it themselves.

Sarah Chen: And the same is presumably true for other specialties — pulmonology, oncology, anything with dense terminology.

Dr. Amanda Chen: Exactly. The specialists with the densest vocabulary have the worst experience. It's a perfect inversion of where the value should be. And I should mention — we are an Epic shop. We're on Epic 2024, fully deployed, FHIR R4 APIs available, we're hosted in Azure for our cloud infrastructure. So whatever solution we adopt has to play nicely with that stack.

Sarah Chen: That's helpful context. Can I ask about your role specifically? How did you end up running clinical innovation at a health system this size?

Dr. Amanda Chen: I'm a recovering cardiologist, basically. I practiced for eleven years — Mayo Clinic for fellowship, then six years in a community cardiology group, then I came to Horizon Health four years ago as a staff cardiologist. After about eighteen months in clinical practice here, I started doing more and more on the side with our IT team and our quality team, mostly because I was frustrated with the tools we had. Two years ago they created the VP of Clinical Innovation role and asked me to take it. So now I do this full time and I see patients one half-day a week to stay grounded.

Sarah Chen: That background is really valuable for what we're talking about. You're not coming at this as a pure technologist or pure administrator. You've actually felt the documentation burden in your own clinical practice.

Dr. Amanda Chen: I think it's the only way I can do this job credibly. When I sit in front of physicians and tell them we're rolling out a new tool, the first question they ask, sometimes silently, is whether the person bringing them the tool actually understands their workflow. I've been there. I know what it feels like to finish a clinic day at six o'clock and then sit down for another two hours of charting before you can go home and see your family. I know what it feels like to dictate the same templated phrases for the hundredth time that week. I know what it feels like to find a documentation error from a colleague that affected your billing and have to go back and reconstruct what actually happened. I've felt all of that. So when I evaluate a vendor, I'm evaluating them through that lens.

Sarah Chen: That's such an important perspective. Can I ask you something more specific about the cardiology terminology problem? Because I want to understand whether it's really about specialty vocabulary or whether there's something deeper going on with how Dragon handles structured concepts.

Dr. Amanda Chen: It's both. The vocabulary problem is the most visible symptom. Dragon will mishear "ejection fraction" as "injection fraction" or "election fraction" depending on the day. It will mishear drug names — I had one cardiologist tell me Dragon transcribed "metoprolol" as "metropolitan" once. These are real examples. But the deeper problem is that even when Dragon gets the words right, it doesn't understand the structure. A cardiology note has a particular shape to it. There's the history of present illness, then the physical exam with cardiac-specific findings, then the diagnostic studies — echo, EKG, stress test, cath findings if applicable — then the assessment with the differential and the working diagnosis, then the plan with risk stratification and medication management. Dragon can transcribe each of those sections individually but it can't help you organize them. It can't tell you that you forgot to mention the LV ejection fraction when you talked about heart failure. It's a transcription tool pretending to be a documentation tool.

Sarah Chen: That distinction is everything. A good clinical AI tool isn't just a faster way to type, it's an active partner in producing a complete and structured note.

Dr. Amanda Chen: Exactly. That's why I jumped on your webinar. When you showed the demo where the physician dictates a complex case and the output came back actually structured the way a physician would write a note — with the right level of detail in the assessment section, with the differential diagnosis flowing logically, with the plan organized by problem — I had a genuinely emotional reaction. That was the first AI demo I've seen where the output actually sounded like a physician wrote it. Most of what I see is either too generic or it's clearly trying to pattern-match from a template and the seams show.

Sarah Chen: I'm so glad that landed. The physicians who designed that demo were specifically trying to solve for the "this doesn't sound like me" problem. It's one of the fundamental objections to AI documentation tools — if the output sounds wrong, the physician spends just as much time editing it as they would have spent writing the original note from scratch.

Dr. Amanda Chen: Right. And then you've added a step instead of removing one. That's what makes me cautiously optimistic about Claude. The output didn't sound generic. So tell me about other healthcare deployments you've done. I want to understand what success has looked like elsewhere before I pitch this internally.

Sarah Chen: Let me give you two examples. The first is a regional health system in the Northeast — about sixty percent of your size, fully Epic, similar physician population mix. They started with hospitalists, deployed to forty-five physicians initially, and within ninety days they were measuring an average documentation time reduction of twenty-eight percent. The headline number was actually closer to thirty-five percent for the high-volume hospitalists, who have the most repetitive note structure.

Dr. Amanda Chen: That's very close to the population I was thinking about starting with.

Sarah Chen: The second example is a large academic medical center in California. Different scale entirely — over twelve hundred physicians — but they ran a structured pilot in their cardiology department first. Cardiology specifically because of the terminology problem you mentioned with Dragon. And they were able to get specialty terminology accuracy above ninety-six percent in their internal benchmarking.

Dr. Amanda Chen: That number alone would change my cardiologists' relationship with documentation tools entirely. They've been burned so many times that they're skeptical, but specialty accuracy at that level would be a revelation.

Sarah Chen: I want to be transparent about what would be involved on your side if we moved forward with a structured evaluation. We would scope an initial deployment, work with your IT team on the Epic integration design, build a tailored set of specialty templates for your physician population, and then run a measured pilot before expanding. The whole motion is designed around proving value before scaling.

Dr. Amanda Chen: That's the right shape. I'd want to start with hospitalists because they're the most acute pain point and they have the most data on actual burnout impact. If we can show that this works for hospitalists, the specialists will pull it from us rather than us having to push it on them. That's how change actually happens at Horizon — peer demonstration, not vendor presentations.

Sarah Chen: I love that framing. What would a good next step look like for you?

Dr. Amanda Chen: I think the next step needs to be a technical conversation with my IT team. Specifically with Priya Mehta, who is our Director of IT and Engineering. Priya has been evaluating AI vendors for about a year now and she has a really structured process. She's going to want to understand the integration architecture, the data flow, the security model, all of that. If we don't get past Priya, we don't get anywhere else internally. So can we set up a technical deep dive with her? I can pull her in next week.

Sarah Chen: Absolutely. I'll bring our solutions consultant, Alex Kim. Alex has done multiple Epic integrations with health systems your size and has the technical depth to go deep with Priya. Can we target sometime next week?

Dr. Amanda Chen: One more thing before we set up the next meeting. I want to be honest about my own bandwidth constraints. I am running clinical innovation as a relatively small function inside a fairly large health system. I do not have a team of analysts or program managers to throw at this. So when I bring you in for the technical conversation with Priya, the goal is not to start a sprawling evaluation that consumes the next six months of my life. The goal is to either confirm that this is the right answer and move quickly, or determine that it is not the right answer and walk away cleanly. I do not have appetite for a long evaluation. Is that something you can work with?

Sarah Chen: That is exactly how I prefer to work. I would rather have a focused, time-bounded evaluation that ends in a clear answer than a meandering conversation that takes six months to nowhere. And honestly, the way you have approached this so far tells me you are going to be efficient. You watched the webinar, you reached out the same day, you have thought about your business case, you have thought about your political landscape, and you are bringing the right people in at the right time. That is not how most evaluations start. So I am optimistic that we can move quickly.

Dr. Amanda Chen: Good. Let me check Priya's calendar and get back to you tonight. I'll send you a calendar hold by end of day. And Sarah — one more thing. I want to be transparent about something. We are not actively talking to other vendors right now. Microsoft has been hovering around with DAX Copilot but we have not engaged them in any serious way. The reason I'm sharing that is not to create false urgency, it's the opposite. I want you to know that this is not a competitive bake-off. We are evaluating Claude because of what we saw at the webinar and the work I've done since to validate it. If we move forward, it will be because Claude is the right answer, not because we shopped you against alternatives.

Sarah Chen: That means a lot, and I'll honor that trust by being equally transparent on our side. Anything I learn that should change your evaluation, I'll tell you directly, even if it doesn't help my side of the deal.

Dr. Amanda Chen: That's all I ask. And I'll be transparent about our internal politics so you can navigate them. I am the executive sponsor of this evaluation. Priya owns the technical assessment and has veto power over the architecture. Robert owns the budget and has veto power over the financial case. James owns security and has veto power if anything in the security review concerns him. Lisa owns the operational rollout and her opinion will weigh heavily on whether we can actually execute. Dr. Kim is the senior clinical voice and will be the bridge to the board if we get there. Each of those people has their own concerns and their own communication style. I will help you navigate them but you should not try to win all of them with the same pitch — they need different things from you.

Sarah Chen: That is the kind of insight that makes the difference between a successful enterprise sale and a failed one. I will adapt my approach to each conversation. Thank you for the map.

Dr. Amanda Chen: That's all I ask. Okay, I need to run to a clinical committee meeting. I'll send the calendar hold tonight. Looking forward to next week.

Sarah Chen: Thanks Dr. Chen. Talk soon.`;

const TECHNICAL_TRANSCRIPT = `Sarah Chen: Thanks for joining everyone. Priya, I really appreciate you carving out the time today. Amanda has been raving about the depth of your evaluation process. I want to introduce Alex Kim from our solutions team — Alex, do you want to give a quick intro?

Alex Kim: Sure. Hi Priya, hi Amanda. I'm a solutions consultant on Sarah's team. My background is healthcare integrations specifically — I've spent the last four years working with Epic-based health systems on AI deployments, mostly in the documentation and clinical decision support space. Before this I was at a healthcare integration vendor that built FHIR connectors, so the plumbing side of healthcare interop is kind of my home. I'm really looking forward to digging in today.

Priya Mehta: Welcome Alex. Amanda, thanks for setting this up. I want to be efficient with everybody's time so I'm going to jump right in. I have about a dozen technical questions I want to walk through, and I'm going to try to be specific because vague answers are how I end up wasting another month. Sound good?

Sarah Chen: Sounds great. Fire away.

Priya Mehta: Okay. Let me start by giving you a snapshot of our current technical landscape so you can calibrate your answers to our reality. We're on Epic 2024 — fully migrated last quarter. We use FHIR R4 APIs for all of our integration patterns now. We've moved away from custom HL7 interfaces wherever we can, although we still have a handful of legacy interfaces in specific service lines. We're hosted on Azure as our primary cloud — that's where our integration layer lives, that's where our analytics layer lives. We have fifteen custom connectors built on top of the Epic FHIR layer, mostly for things like our clinical research data warehouse, our patient engagement platform, and a couple of vendor integrations. Our identity provider is Azure AD with SSO for everything. We use Snowflake as our analytics warehouse for any data that leaves Epic. Power BI on top for reporting. Make sense?

Alex Kim: Crystal clear. That's a clean architecture and it's exactly the kind of setup that makes deployments smoother. The Azure-Epic-FHIR pattern is what we recommend.

Priya Mehta: Good. So my first technical question. Can Claude process HL7 messages directly, or do we need to put a middleware layer in front of it that converts HL7 to something more structured? I'm asking because we still have a few service lines that are sending HL7 v2 messages and I want to know whether we're going to need to build conversion logic.

Alex Kim: Great question. The short answer is that Claude itself is API-based and works most naturally with FHIR R4 resources or with structured JSON. We don't directly parse HL7 v2 inside the model — that would be inefficient and you'd lose the structural advantages of the resource model. The pattern we recommend for health systems with mixed interface types is exactly what you described: a thin middleware layer that does HL7-to-FHIR conversion for the legacy interfaces. The good news is that you almost certainly already have this capability somewhere in your stack — most Epic-FHIR implementations have a conversion layer they can extend. We'd help you scope that as part of the integration design.

Priya Mehta: Okay. We do have a conversion layer in our integration engine. So we'd be extending what we already have rather than building something net new. That's a much easier conversation internally.

Alex Kim: Exactly. And for the FHIR-native interfaces, you can call Claude's API directly with the FHIR resource as part of the prompt context. We have a documented pattern for that.

Priya Mehta: Second question. What is the latency on real-time inference for clinical notes? I'm specifically asking about a use case where a physician finishes a patient encounter, hits a button, and expects a structured note back within their workflow. What's the round-trip time we should plan for?

Alex Kim: For a typical clinical note generation use case — let's say a patient encounter with maybe two or three thousand tokens of dictation context plus the patient's relevant prior history — you should plan for somewhere between four and eight seconds of total round-trip latency. That includes the API call time, the inference time, and the network. We can tune it lower with streaming output if the physician's workflow benefits from progressive rendering, but most physicians prefer to wait the four to eight seconds and get a fully formed note rather than watch it stream in.

Priya Mehta: Four to eight seconds is acceptable in our workflow context. Our physicians are not expecting sub-second responses — they're expecting the AI to do the equivalent of a few minutes of typing.

Dr. Amanda Chen: I want to jump in here because I think this is important context. Sarah, before you answer the next question — when you talk to Robert about the business case, lead with physician satisfaction and retention. He's been obsessing over turnover costs since we lost three hospitalists last quarter. He cares about the productivity numbers but the hook for him is going to be retention. Just wanted to flag that before we get deeper into the technical session.

Sarah Chen: That's incredibly helpful coaching, thank you. I'll make sure the business case lead with that framing.

Dr. Amanda Chen: One more thing on the political landscape. I briefed Dr. Sarah Kim — our CMO — last week about this evaluation. I gave her the high-level framing and she was genuinely interested. She wants to see how this fits into our broader AI governance framework, which we are still building, by the way. She's not going to block anything but she will want a seat at the table when we get closer to a decision. And frankly, having her sponsorship will make the rest of the executive conversation much easier.

Priya Mehta: Good to know. Okay, back to technical questions. Question three, and this is the big one for me. Data residency. We are a US healthcare provider with PHI flowing through this system. I need an unambiguous answer on where the data is processed, where it's stored, and what your model training policy is with respect to customer data.

Alex Kim: I'll be very direct. For Claude Enterprise customers, all inference is processed in US-based infrastructure. We have multiple US regions and we can pin a customer to a specific region if you have a preference. PHI sent to Claude as part of an API call is not used to train our models — we have a contractual commitment to that effect, and we'll back it up in the BAA. The data is processed for the purpose of generating the response, and then it's not retained for training. We do retain it for a limited window for abuse monitoring and operational purposes, and we can show you exactly what that window looks like and how it's controlled.

Priya Mehta: That's the answer I needed. Two of the AI vendors I've talked to this year couldn't give me a clear answer on training policy, and one of them tried to argue that anonymized data is fine to use for training, which is not how HIPAA works.

Alex Kim: We've heard that. We've taken a much stricter position because we believe it's the only sustainable approach for regulated industries.

Priya Mehta: Question four. Show me the integration architecture. Specifically, walk me through how a clinical note goes from a physician finishing a patient encounter, through your system, and back into Epic. I want to see every hop.

Alex Kim: Let me share my screen. Okay, here's the pattern we deploy for health systems on Epic. Step one, the physician finishes the patient encounter in their normal Epic workflow. Step two, they trigger note generation either through an Epic SmartPhrase or through a button we've added to their note template — Epic supports both patterns and we've done both. Step three, the trigger calls our middleware layer, which lives in your Azure tenant, not ours. The middleware layer pulls the relevant context from Epic via FHIR — the encounter resource, the patient resource, recent observations, problem list, medication list, whatever's relevant for the specialty. Step four, the middleware layer constructs the prompt and calls the Claude API. Step five, Claude generates the structured note. Step six, the middleware layer parses the response and writes it back to Epic via FHIR DocumentReference resources. Step seven, the physician sees the structured note in their normal Epic workflow and signs off on it.

Priya Mehta: That's the pattern I expected and it's the one I'm going to be most comfortable with. The middleware layer is in our Azure tenant, not yours, which means we control the data flow, we control the audit logging, we control the access policies. That answers about half my security questions in advance.

Alex Kim: Exactly the goal. We want the boundary of trust to be at the API call to our service, not at any point inside your environment.

Priya Mehta: Question five. Can we get a sandbox environment to test against our Epic dev instance? I don't want to commit to a full pilot without first running a small set of test cases through the actual integration to see how it behaves with our real data structures. Our Epic dev environment has synthetic patient data so we can test without PHI concerns initially.

Alex Kim: Yes. We can stand up a sandbox tenant for you within a week. We'll provision the API keys, give you the integration documentation, and one of our engineers will be available to help with the initial setup. The sandbox is fully functional Claude — same model, same API surface — just with separate billing and a separate tenant boundary so you can experiment freely.

Priya Mehta: Perfect. Set that up. I'll have my team start working with it as soon as it's available.

Sarah Chen: Alex, you'll get that started this week, right?

Alex Kim: Yes, I'll kick off the provisioning process tomorrow morning.

Priya Mehta: Question six. What does observability look like? When something goes wrong — and something always goes wrong — how do I see what happened? Do I have logs? Do I have metrics? Can I trace a specific note generation request from start to finish?

Alex Kim: You get full observability. The Claude API returns request IDs that you can correlate with our internal logging. You also build observability into your middleware layer, which we'd recommend regardless of which AI vendor you're using. We've published reference patterns for logging, tracing, and alerting. And if you ever need to escalate a specific issue to us, we can pull our internal logs by request ID and reconstruct exactly what happened.

Priya Mehta: That's the right answer. Some vendors treat their service as a black box and that's a non-starter for healthcare.

Alex Kim: We learned that lesson early. The first generation of AI vendors treated their services as opaque, and they got rejected by every regulated industry customer. We do not want to relive that.

Priya Mehta: Question seven and this is more of a forward-looking question. How do you handle model versioning? If the underlying Claude model is updated, how do I know whether the behavior in my deployment will change? In a clinical setting I cannot tolerate silent behavior changes — if a note generation pattern that was working last week starts producing different output this week, I have a serious problem.

Alex Kim: That is one of the most important questions a healthcare customer can ask, and the answer is that for enterprise customers we offer model pinning. You can pin your deployment to a specific model version and that version does not change unless you explicitly choose to migrate. When a new model version becomes available, we notify you in advance, we make a sandbox available so you can test the new version against your actual use cases before migrating, and you control the migration timing. So the model under your deployment is stable until you decide to move.

Priya Mehta: That is exactly the answer I needed. Silent model upgrades would be a non-starter.

Alex Kim: We agree. The pattern we recommend for healthcare customers is to validate any new model version in your sandbox for a defined period before moving production traffic over.

Priya Mehta: Question eight. Capacity and rate limiting. We have three hundred and twelve physicians. If we deploy this broadly and they all hit save at the end of clinic at the same time, what happens? Are we going to hit rate limits? Are we going to see degraded performance? What does your scaling story look like for an enterprise customer?

Alex Kim: For enterprise customers, we provision dedicated capacity. You are not sharing throughput with the general API user base. We work with you to estimate peak load — for your population that would probably be the late afternoon and early evening clinic close window — and we provision capacity to handle that peak with headroom. If your usage grows beyond the original provisioning, we work with you to scale up well in advance of you hitting any limits. We do not surprise you with throttling.

Priya Mehta: I will want that in writing as part of the SLA.

Alex Kim: It is in the enterprise SLA. We can walk through that document with your team when we get to the contract phase.

Dr. Amanda Chen: Priya, I want to make sure we're not running long. We have about five minutes left. Anything else critical to cover today?

Priya Mehta: Two more quick things. First, when we get to the security review, our CISO is going to want to see SOC 2 Type II report, penetration test results, and a completed vendor security questionnaire. Sarah, can we plan for that next?

Sarah Chen: Absolutely. We have all of that ready. I can have the SOC 2 report and the BAA template to you within twenty-four hours. And whenever your CISO is ready, we can do a dedicated security session.

Priya Mehta: Good. Second thing. I'm going to put together an architecture overview document on our side that captures everything we discussed today plus our specific implementation thoughts. I'll send it to you both within the next few days. That'll give us a shared reference point as we move into the next phase.

Alex Kim: That would be incredibly helpful. We'd love to have that document.

Dr. Amanda Chen: Okay, I think we're at time. This was a really productive session. Sarah, Alex, thank you. Priya, I think this has been the most substantive technical conversation we've had with any vendor in the last year, so I'm encouraged.

Priya Mehta: I'm encouraged too. The answers were clear, they were specific, and they didn't dodge the hard questions. That's table stakes in my book and most vendors fail at it. So thank you both. Sarah, let's get the sandbox provisioned and the security materials moving and then plan a follow-up.

Sarah Chen: Will do. Talk to everyone soon.`;

const BUSINESS_TRANSCRIPT = `Sarah Chen: Thanks everyone for joining. I know calendars are tight so I'll get right to it. Robert, Lisa, Amanda — we wanted to use this time to walk through the ROI model in detail and talk about what a rollout would actually look like operationally. Robert, I sent you the model on Tuesday. Did you get a chance to review it?

Robert Garrison: I did, and I have several thoughts. Some constructive, some critical. Is it okay if I just share my screen and walk through what I marked up?

Sarah Chen: Please.

Robert Garrison: Okay. So here's the model you sent. The headline number is annual savings of two point one million dollars based on a thirty percent productivity improvement assumption, leading to a three-year ROI of two point eight million. Let me start with what I like and then get to what I want to challenge.

What I like is the structure. You've separated the productivity savings from the implementation costs cleanly. You've included the ongoing licensing fees as a recurring line item rather than burying them in year-one costs. You've got a discount rate applied — eight percent, which is in the right range for our cost of capital. The methodology is sound. I've seen vendor ROI models that are pure marketing nonsense and this is not one of those. So that's the good news.

Sarah Chen: Thank you. I'll take that as a compliment.

Robert Garrison: It's earned. Now here's where I want to push back. Your thirty percent productivity assumption is aggressive. I am willing to believe that thirty percent is achievable in a mature deployment with high adoption — let's say eighteen months in — but I am not willing to defend thirty percent as a starting assumption to my board. If I go to the board with a thirty percent number and we hit twenty-two percent in the first year, that's a credibility hit I don't want. I would rather underpromise and overdeliver. What I'd be comfortable defending is twenty percent.

Sarah Chen: That's a fair challenge and I think it's the right instinct. Twenty percent is conservative and credible. Let me flag one thing — twenty percent of physician documentation time is still a meaningful number for your population. With three hundred and twelve physicians at roughly two hours a day on documentation, twenty percent is about twenty-four minutes per physician per day. Across your full physician body that's a hundred and twenty-five hours per day saved. Annualized, with conservative loaded cost assumptions, you're still looking at one point four million in year-one productivity savings even at twenty percent.

Robert Garrison: I ran that math myself. I came up with one point three eight million, which is very close to your number. So the productivity story is still compelling at twenty percent. But here's where it gets interesting and where I want to add something to your model. You're missing something. And honestly, the thing you're missing is the most important number for me personally.

Dr. Amanda Chen: Can I guess where you're going with this?

Robert Garrison: Probably.

Dr. Amanda Chen: Retention?

Robert Garrison: Retention. Sarah, here's the line item that's missing from your model. Add a row for physician retention. We spent one point two million dollars last year replacing three hospitalists who cited documentation burden as a significant factor in their decision to leave. That's recruiting fees, signing bonuses, locum coverage during the gap while we were searching, and the productivity ramp time of the replacement. One point two million dollars in real cash, not soft savings, attributable to documentation burden. If a tool like Claude reduces documentation burden by even fifteen percent, my gut says we will save at least one of those three turnover events per year. Conservative number — let's call it four hundred thousand a year in retention savings. That's a real number. That's cash I don't have to spend.

Sarah Chen: I will add that line item to the next version of the model. And just to make sure I'm capturing the math right — you're saying four hundred thousand per year in avoided turnover costs, conservatively, on top of the productivity savings.

Robert Garrison: Yes. And when you add that line, recalculate the three-year ROI. You'll find it goes from two point eight million to roughly three point four million. That's the version I would be comfortable presenting to our board.

Sarah Chen: Three point four million. Got it. I'll have a revised model to you by Friday with that line added and the productivity assumption adjusted to twenty percent.

Robert Garrison: Good. And I want to talk about timing. If we are going to move on this — and I'm not committing yet, I want to be clear about that — but if we are going to move on this, I need the PO submitted before March fifteenth. That is our fiscal Q two cutoff. After March fifteenth, anything we want to spend has to compete in the Q three planning cycle, and Q three has a lot of competing priorities I can already see coming. If we miss March fifteenth, we are realistically talking about a three-month delay.

Sarah Chen: Understood. March fifteenth is on my calendar. We will work backwards from that date.

Robert Garrison: I want to be very clear that I am not green-lighting yet. There are still things that need to come together. Security has to clear. The technical evaluation has to confirm what Priya is hopeful about. The legal review on the BAA has to be clean. But assuming all of those go well, I do not want to be the bottleneck. I want this to be ready to execute by March fifteenth so we can decide on the merits, not on the calendar.

Sarah Chen: That's a great forcing function for both of us. Lisa, let me bring you in. Robert and I have been going back and forth on the numbers but you're the person who's actually going to have to roll this out. What does that look like from your side?

Lisa Huang: Thanks Sarah. I've been thinking about this since Amanda first told me about it. I want to walk you through the rollout plan I've started sketching, because I think it's important that we agree on the operational shape of this before we get too far into the contract discussion.

We would start with the hospitalist group at our downtown campus. Forty-five physicians. The reason for this group specifically is twofold. First, they are the most burned out. They have the highest documentation volume per physician, the highest turnover rate, and the loudest internal voice about the documentation problem. Second, they are the most receptive to new tools. Hospitalists tend to be early adopters in our system because they live in the EHR all day and feel the pain most directly.

Sarah Chen: And starting with hospitalists also gives you the cleanest measurement environment because their workflow is the most consistent.

Lisa Huang: Exactly. They have a relatively standardized workflow, they round at predictable times, they have a defined patient panel each shift, so you can measure documentation time and productivity changes very cleanly. If we deploy to hospitalists first and we measure an outcome, that outcome is real and defensible.

Robert Garrison: That's the kind of measurement environment I need to see results from before we expand.

Lisa Huang: Phase one would be those forty-five hospitalists at downtown campus. Eight to ten weeks for full rollout including training. Phase two, assuming phase one goes well, would be cardiology and pulmonology at all sites — that's specialty groups with the biggest terminology pain. Phase three would be a full system-wide rollout to the remaining specialties and primary care. The full timeline from contract execution to phase three completion would be roughly nine to twelve months.

Sarah Chen: That's a thoughtful staged rollout. It also has the benefit that each phase generates evidence for the next phase, so you're not asking physicians in phase three to take it on faith.

Lisa Huang: That's exactly the philosophy. If phase one works for the hospitalists, the cardiologists and pulmonologists will pull this from us in phase two rather than us having to push it on them. And if phase two works, phase three is largely just an execution exercise.

Sarah Chen: Lisa, can I ask you a related question? What does your typical onboarding look like with a vendor like us? I want to make sure we set up our customer success engagement to fit your expectations.

Lisa Huang: I'm going to be direct because I think it matters. Our last vendor — and I'm not going to name them — left us on our own after we signed. We had a kickoff call, we had a slack channel, and that was basically it. When we hit problems we had to file support tickets and wait days for responses. The whole experience was demoralizing because we had spent six months evaluating and negotiating with a sales team that vanished after the contract was signed. We do not want to repeat that experience.

What I want is a dedicated customer success contact who knows our deployment intimately, who is available for regular check-ins during the first ninety days, and who proactively flags issues before they become problems. I want clear escalation paths for technical issues. And I want some kind of structured success measurement at thirty, sixty, and ninety days so that we can course-correct if things are not on track.

Sarah Chen: That's exactly the model we built our customer success team around. You'll have a dedicated CSM assigned at contract execution. The first ninety days are highly structured — weekly check-ins, defined milestone reviews, executive escalation paths. We build a success plan with you in week one and we measure against it.

Lisa Huang: Good. Because if I am going to put my reputation on this rollout — which I am — I need to know that you are going to be a partner through it, not just a vendor.

Robert Garrison: Sarah, I want to come back to one thing before we wrap up. You mentioned that the security review and the technical evaluation are still in progress. What is your read on where those stand?

Sarah Chen: The technical conversation last week with Priya went really well. She was asking detailed questions and the answers landed. Alex our solutions consultant is working with her this week to provision a sandbox environment so her team can test against your Epic dev instance. On security, we have all the materials ready — SOC 2 Type II, penetration test results, BAA template, data flow architecture. We are waiting for a window with your CISO to walk through them in detail. I would like to get that scheduled in the next two weeks if possible.

Robert Garrison: I will follow up with James personally after this call to make sure he prioritizes the meeting. I am convinced on the numbers — assuming you give me the revised model with the retention line — and I am willing to push the technical and security pieces forward. Let's make sure they come together.

Dr. Amanda Chen: Robert, that is a meaningful statement. I appreciate it.

Robert Garrison: I am not in the business of slowing down good ideas. Let me also ask one more thing while we are all together. Sarah, walk me through your pricing model. I want to understand whether we are talking about a per-physician subscription, a usage-based model, or some hybrid. Because the structure of the pricing model affects how I think about budgeting this against our fiscal calendar.

Sarah Chen: For a deployment of your size, we typically structure it as an enterprise agreement with a committed annual fee and a defined scope of usage. The committed fee gives you predictability — you know exactly what the line item is for budgeting purposes — and the scope is sized generously to your physician population so you do not have to worry about going over a usage cap during normal operations. If your usage grows substantially beyond the committed scope, we have a true-up at renewal, but during the term you are not getting nickeled and dimed for incremental usage.

Robert Garrison: That is the pricing structure I prefer. Per-physician pricing is administratively expensive — I would have to track which physicians are enabled month to month and reconcile against billing — and pure usage-based pricing creates budget unpredictability. A committed enterprise fee with a generous scope is exactly the right shape for an organization our size.

Sarah Chen: Good. We can put together a detailed pricing proposal as part of the next round of materials.

Lisa Huang: One operational question I want to add. When the deployment is live, who is responsible for the day-to-day relationship with us? Is that Sarah, is that a customer success manager, is that a technical implementation person? I need to know who I call when something goes sideways.

Sarah Chen: At contract execution we assign a dedicated customer success manager to your account. The CSM is your primary day-to-day contact for everything operational. Sarah — meaning me — remains involved at the strategic level, particularly during the first year when we are establishing the relationship. We also assign a technical implementation lead from our solutions team, like Alex, for the duration of the initial deployment. So you have three points of contact, each with a clear role.

Lisa Huang: Three is the right number. One is too few and five is too many. Three I can manage.

Dr. Amanda Chen: Robert, I want to make sure we are also talking about timing on the operational side, not just the financial side. Sarah, if we hit Robert's March fifteenth target for PO submission, when could we realistically be live with phase one?

Sarah Chen: From contract execution to live phase one for forty-five hospitalists would be approximately twelve weeks. That assumes the integration design is complete, which it largely will be by then based on Priya's work, and that physician training begins in parallel with the technical deployment. So if we sign in mid-March, you could be live with phase one in early to mid-June.

Lisa Huang: Early June is perfect. That avoids the summer vacation gap and gives us the full back-half of the year to measure outcomes for Robert's fiscal year-end review.

Robert Garrison: That is exactly the timing I was hoping for.

Dr. Amanda Chen: Sarah, Robert, Lisa — I think we have made enormous progress in this conversation. Sarah, please send me the revised model by Friday.

Robert Garrison: Yes, send me the revised model by Friday. And Sarah, one final thought from me. I have sat through dozens of vendor pitches in this role. The ones that earn my trust are the ones where the seller is willing to push back on my assumptions and engage with the math seriously. You did that today. You did not just accept my twenty percent number, you walked through what that means in concrete physician hours. That kind of substantive engagement on the financial case is rare and it matters to me. So thank you for treating this conversation with the rigor it deserves.

Sarah Chen: Robert, I appreciate that. The numbers have to hold up to scrutiny because they are going to be measured against real outcomes, and I would rather have a difficult conversation now than an even more difficult conversation eighteen months from now.

Sarah Chen: It will be in your inbox Friday morning. Thank you all — this was incredibly productive.`;

const SECURITY_TRANSCRIPT = `Sarah Chen: James, thank you for making the time. Amanda has told me a lot about your evaluation process so I want to make sure we use this time efficiently. I have Alex Kim from our solutions team and our security materials at the ready. Priya is also on the line. Where would you like to start?

James Whitfield: Sarah, before we begin, let me set expectations. I have reviewed fourteen AI vendors in the past year. Most of them cannot answer basic questions about data residency or model training. I am going to ask you some hard questions today, not because I am hostile, but because it is my job to be thorough. If you do not know an answer, please tell me you do not know rather than guessing, because I would rather chase down a real answer than have to unwind a misunderstanding later. With that out of the way, let us see if you are different from the other thirteen.

Alex Kim: That is exactly the right framing James, and I appreciate it. Please be thorough. We would rather have a hard security review now than discover issues later.

James Whitfield: Let us start with HIPAA. Walk me through your BAA terms and how PHI is handled in the API call lifecycle.

Alex Kim: Sure. We sign a BAA with all healthcare customers — it is a standard part of our enterprise agreement. The BAA covers PHI handling, breach notification timelines, and our subcontractor obligations. On the actual data handling, here is the lifecycle. When you make an API call to Claude with PHI in the prompt, that call is encrypted in transit using TLS one point three. The request hits our API gateway in a specific US region — and James, I want to flag here that we will pin Horizon Health to a specific US region if you have a preference, you do not get a random region. The request is then routed to our inference infrastructure, which is also in that same region. The model processes the prompt, generates the response, and returns it to you. The data is encrypted at rest while it is in our infrastructure. After the response is returned, the data is retained for a bounded operational window — I will get to retention in a moment — and then it is purged.

James Whitfield: What is the operational retention window?

Alex Kim: The default is thirty days for operational logging and abuse monitoring. We can configure shorter retention windows for healthcare customers. Some of our hospital customers have us configured at seven days. We can do as low as that if it meets your requirements.

James Whitfield: Seven days is acceptable. I would like to see that contractually.

Alex Kim: That goes in the BAA addendum.

James Whitfield: Question two. Model training. Are you using customer data — including PHI — to train your models?

Alex Kim: No. This is contractually committed. PHI sent to Claude through API calls is not used to train our models. Period. We have made this commitment because we believe it is the only sustainable position for serving regulated industries.

James Whitfield: How do I verify that contractually? I do not want a marketing statement, I want enforceable language.

Alex Kim: You will see it in the BAA and in the master agreement. It is enforceable language. We can also provide our internal data handling documentation that shows the technical controls that prevent customer data from entering training pipelines.

James Whitfield: I would like to see those technical controls. Not just the contractual language.

Alex Kim: I can have that documentation to you by end of week.

James Whitfield: Good. Question three. Data residency. You mentioned US infrastructure. Walk me through your regions and what happens if there is a regional failure.

Alex Kim: We currently have multiple US regions for inference. For Horizon Health, we would pin you to a specific region of your choosing. In the event of a regional failure, we have failover capacity in another US region — but failover would require explicit customer authorization to switch. Some customers prefer to fail closed, meaning if their primary region is down they would rather have the API return errors than have their requests routed to a different region without their knowledge. Other customers prefer to fail over automatically. We support both patterns.

James Whitfield: We would want to fail closed. We do not want PHI requests automatically routed to a different region without our awareness.

Alex Kim: That is configurable.

James Whitfield: Question four. SOC 2 Type II. Show me the report.

Alex Kim: I can pull it up. We have a current SOC 2 Type II report covering the past audit period, issued by a Big Four auditor. The full report is available under NDA. I can have it to you today.

James Whitfield: I will sign the NDA this afternoon. Send me the report.

Alex Kim: Done.

James Whitfield: Question five. Penetration testing. Frequency, scope, who performs it.

Alex Kim: We have annual third-party penetration testing performed by an independent security firm. The scope includes our public API surface, our internal infrastructure, and our authentication layer. We can share an executive summary of the most recent pen test report under NDA. We do not share the full technical findings publicly because that would create exposure, but the executive summary covers methodology, scope, and the categories of findings with their remediation status.

James Whitfield: Executive summary is fine. I do not need the full technical findings, that is standard practice.

Alex Kim: I will include the executive summary in the package I send you today.

James Whitfield: Question six. Subprocessors. Who else touches our data?

Alex Kim: Our subprocessor list is published and includes our cloud infrastructure provider for compute and storage. We do not use third-party content moderation or third-party logging services for healthcare customer data. The list is short by design. Any change to the subprocessor list requires customer notification.

James Whitfield: Notification or consent?

Alex Kim: Notification with a window for the customer to object. If a customer has a contractual concern with a new subprocessor, we work through it before the change takes effect. For BAA customers, we are particularly careful here.

James Whitfield: Acceptable. Question seven. Audit logging. Can I see who at your organization accessed customer data, when, and why?

Alex Kim: For administrative access, yes. Our employees do not have access to customer PHI in the normal course of operations — that is enforced technically, not just by policy. In the rare case where an employee needs to access customer data for a support issue, the access is logged, audited, and requires justification. We can produce those audit logs on customer request.

James Whitfield: How rare is rare? Give me a number.

Alex Kim: Across our healthcare customer base last year, we had fewer than five total instances of human access to customer PHI for support purposes, all of which were customer-initiated and customer-authorized.

James Whitfield: That is the right answer. I would also like to confirm something — those access events, when they occur, are they reported to the customer proactively or only on customer request?

Alex Kim: For BAA customers, we proactively notify the customer for any access event that involves their data, even if the access was customer-initiated. We do not require you to ask. The notification includes the timestamp, the employee identifier, the reason for access, and the duration of access. We treat it as a notification obligation, not a discoverable record.

James Whitfield: Proactive notification is the standard I expect. A lot of vendors only disclose this kind of thing when explicitly asked, which means most customers never know it is happening. Proactive notification puts the burden of trust where it belongs — on you.

Alex Kim: That is exactly the philosophy. We want our customers to never have to guess about whether something happened.

James Whitfield: Question seven point five, while we are on the topic. How are your employees vetted? What is your background check process for engineers who could potentially have access to customer infrastructure?

Alex Kim: All employees with infrastructure access undergo background checks at hiring, including criminal history and employment verification. For roles with access to production systems handling regulated data, we conduct additional vetting and require ongoing security training. We have a defined separation-of-duties model where no single employee has unilateral access to make changes to production infrastructure that affects customer data — those changes require peer review and audit logging. The principle is that we should not be in a position where a single bad actor or a single mistake by a single employee can compromise customer data.

James Whitfield: Separation of duties is one of the most important controls in any security architecture. The fact that you have it built into your engineering process is a good sign.

Priya Mehta: James, can I jump in for a moment?

James Whitfield: Please.

Priya Mehta: I want to add some context from my side. I have been working with Alex on the integration architecture and the pattern we are designing puts the middleware layer in our Azure tenant, not theirs. Which means the boundary of trust is at the API call to Claude, not at any point inside our environment. We control the data flow leading up to that call, we control the audit logging on our side, and we control which patient data flows into the prompts.

James Whitfield: That helps. The fact that we are not handing them an open pipe into Epic but are instead controlling exactly what data goes in each request — that is a much better architecture from a security perspective. It means if we ever need to revoke or change the data sharing scope, we do that on our side, not by depending on their controls.

Alex Kim: Exactly. We try to design the boundary of trust as narrowly as possible. The less data we need to see, the better for everyone.

James Whitfield: Question eight. Incident response. If you have a security incident that affects our data, what is the notification timeline and what do I get from you?

Alex Kim: For confirmed incidents that affect customer data, our standard notification timeline is twenty-four hours from confirmation. For BAA customers, we conform to HIPAA breach notification requirements which are stricter in some respects. You would receive an initial notification with what we know at the time, followed by a more complete report as the investigation progresses. We do not sit on incidents.

James Whitfield: Twenty-four hours from confirmation is acceptable. I want that in the BAA.

Alex Kim: It is in the BAA.

James Whitfield: Last few questions. Sandbox provisioning — Priya, I think you and I talked about this, but I want to confirm. You are going to provision the sandbox in our Azure dev tenant, correct?

Priya Mehta: Correct. I will have the sandbox environment provisioned by Friday. We will use our Azure dev tenant. Alex has already kicked off the sandbox tenant on their side and we have the API keys.

James Whitfield: Good. One last thing. I am going to send over our standard vendor security questionnaire. It is forty-seven questions. Some of them will be redundant with what we have discussed today but I need them answered formally so they can go in the vendor file. How quickly can you turn that around?

Alex Kim: Five business days.

James Whitfield: That is faster than most vendors. I am going to mark that down. Sarah, this is honestly one of the better security discussions I have had with a vendor in the past year. Most AI companies cannot explain their data architecture clearly and they get nervous when I ask hard questions. You did not get nervous, Alex. That is meaningful. I am not committing to anything yet, but I will say that based on this conversation I do not see any obvious blockers from a security perspective. The questionnaire will tell us for sure.

Sarah Chen: James, that means a lot. We will get the questionnaire back to you within five business days, and we will include the SOC 2 report, the BAA template, the architecture diagram, the data flow documentation, and the pen test executive summary in the package today.

James Whitfield: Before you go, I want to ask one more question that I always ask vendors and that very few of them answer well. What is your process for handling customer-reported security vulnerabilities? Specifically, if my team identifies something that we believe is a security weakness in your service, what is the channel for reporting it, what is your response time commitment, and what is the typical remediation timeline?

Alex Kim: We have a published security disclosure policy that includes a dedicated email address for customer security reports and a separate channel for security researchers. For customer-reported issues, we acknowledge receipt within twenty-four hours and we provide a triage assessment within seventy-two hours. Critical issues are remediated as quickly as possible — measured in days, not weeks — and we provide regular status updates during the remediation. Lower-severity issues are remediated on a defined schedule and we keep the customer informed of progress. We also provide post-incident reports for any significant security issue, even if it does not meet the threshold for breach notification.

James Whitfield: Twenty-four hour acknowledgment, seventy-two hour triage, that is in the right range. I have seen vendors that take a week to acknowledge a security report, which is unacceptable.

Alex Kim: Agreed. The security relationship with our customers is one of the most important relationships we have, and being unresponsive to security reports erodes trust faster than almost anything else.

James Whitfield: Last question I promise. Encryption at rest. What encryption standard, what key management, who controls the keys?

Alex Kim: AES-256 for data at rest. Keys are managed through our cloud provider's key management service, with strict access controls and audit logging on all key access. For enterprise customers, we offer customer-managed key arrangements where the customer holds the encryption keys in their own key management infrastructure and we use those keys for inference. That arrangement is more complex operationally but it gives you complete control. Many of our enterprise healthcare customers do not require customer-managed keys because the contractual and technical controls are sufficient, but the option is available if your CISO function requires it.

James Whitfield: Thank you for offering it as an option. I will think about whether we need that level of control or whether the standard arrangement is sufficient. My initial leaning is that the standard arrangement is sufficient given the rest of the controls, but I want to walk through it with my team before committing.

Alex Kim: That is the right approach. We can support either path. Most of our healthcare customers land on the standard arrangement after evaluating the controls, but we are completely comfortable with whichever direction your team decides.

James Whitfield: Sarah, one thing I want to say before we close. I know I asked a lot of hard questions today and I want to make clear that none of those questions were rhetorical traps. Every question I asked is one I am required to answer for our internal compliance documentation, and I appreciate that you and Alex took them seriously. The vendors I respect most are the ones who treat my questions as legitimate technical inquiry rather than as obstacles to be deflected. You both did that. So thank you.

Sarah Chen: James, that means a lot. We will not let you down on the questionnaire turnaround.

James Whitfield: Looking forward to it. Thanks Sarah, thanks Alex.`;

const EXEC_TRANSCRIPT = `Sarah Chen: Thank you all for joining. I know this is a busy week for everyone so I really appreciate you carving out the time. Dr. Kim, thank you especially for joining. I understand you have a hard stop at the top of the hour so I want to make sure we use your time well. Amanda has told me about the AI strategy work you have been leading.

Dr. Sarah Kim: Thanks Sarah. I am glad to finally meet you. Amanda has been keeping me updated on this evaluation and I wanted to make sure I was directly engaged before we got much further. Let me give you some context on where we are organizationally with AI, because I think it will help frame this conversation.

I presented our AI strategy to the board last Thursday. The board has been asking us for a year about our AI plans and we finally had a strategy mature enough to walk them through. I framed it around four pillars — clinical decision support, operational efficiency, patient engagement, and clinical documentation. Of those four, clinical documentation was identified by the board as the top priority. Three board members specifically asked about it during the discussion, and one of them — our board chair, who is a retired physician — said something to the effect of "this is the thing that will most directly affect physician satisfaction and retention, which is the thing I worry about most." So when Amanda told me last week that her team was moving quickly on a Claude evaluation, I was genuinely relieved.

Sarah Chen: That is incredibly helpful context Dr. Kim. I will say that the framing the board is using — clinical documentation as a physician satisfaction issue rather than purely a productivity issue — is exactly the framing I have heard from Amanda and from Robert as well. It seems like there is genuine alignment across leadership on what this is really about.

Dr. Sarah Kim: There is. And honestly, it took us a long time to get there. For a long time the conversation about clinical AI at Horizon was dominated by people who saw it as a cost-cutting exercise. That framing never landed with our physicians and it never landed with me. Once we reframed it as a physician experience and retention initiative, the conversation became much more productive. So I want to make sure that any solution we adopt fits that framing operationally as well as financially.

Dr. Amanda Chen: I have been telling Sarah this since our first conversation. The hook for our organization is retention, not productivity. Productivity matters but the board cares about retention.

Robert Garrison: And I will add that I have been making the same case from the financial side. The business case I am willing to defend to our board is the one anchored in retention savings, not pure productivity savings. The numbers work either way but the story has to be right.

Sarah Chen: Thank you all for being so clear about that framing. It is a meaningful difference from how a lot of vendors approach healthcare AI conversations and it changes how we should think about deployment, measurement, and even success criteria.

Dr. Sarah Kim: Sarah, before I run, I want to share something else with you. When I presented the AI strategy to the board last Thursday, I told them we were actively evaluating a clinical documentation solution and that I expected to come back to them at the next quarterly meeting with a recommendation. The board chair specifically asked me to keep them informed of progress between meetings. So this evaluation is on the board's radar. I want you to know that because it means we are not in stealth mode internally. If this moves forward, it moves forward with executive air cover.

Sarah Chen: That is significant. Thank you for telling me.

Dr. Sarah Kim: Okay, I have to run to my next meeting. Sarah, it was great to meet you. Amanda, keep me updated. Robert, I will see you at the executive committee Friday.

Robert Garrison: Drive safe Sarah. Sarah Chen, let me pick up where Dr. Kim left off because I have several updates for you and a few items I need from you.

Sarah Chen: Please.

Robert Garrison: First, I spoke with Mark Davidson, our director of procurement, this morning. I told him to expect an outreach from you this week about the master services agreement and the standard contract terms. Mark is going to be your point of contact for all of the procurement workstreams. He is very experienced and frankly very good at his job. His preferred working style is direct and document-driven. He does not love status calls, he loves having clear documents to redline. So when you reach out to him, lead with the documents, not with a meeting request.

Sarah Chen: Got it. I will email Mark today with the master agreement and the BAA template.

Robert Garrison: Good. Second, the security review with James went well. James told me directly afterwards that he does not see any obvious blockers and that the security questionnaire will be a formality if your written answers match the verbal conversation you had with him. So I am going to consider security on track unless something changes.

Sarah Chen: We submitted the completed questionnaire on Tuesday. I have not heard back from James yet but I expect him to confirm soon.

Robert Garrison: I will follow up with him personally. Third, I want to talk about the revised ROI model. I have it open here. The version you sent on Friday with the productivity assumption at twenty percent and the retention line item at four hundred thousand annually — that is the version I am taking to the executive committee Friday for endorsement. The three-year ROI of three point four million is a number I am confident defending. So unless something changes between now and Friday, I expect the executive committee to endorse moving forward.

Sarah Chen: Robert, that is a meaningful step forward. Thank you for your engagement on the model.

Robert Garrison: I do not engage on models that I do not think have legs. This one has legs.

Lisa Huang: Sarah, can I share my screen for a few minutes? I want to walk you through the rollout timeline I have built.

Sarah Chen: Please.

Lisa Huang: Okay. Here is the twelve-week rollout timeline I have built for phase one. As a reminder, phase one is the forty-five hospitalists at our downtown campus. I have broken the timeline into four phases. Weeks one and two are contract execution, sandbox provisioning completion, and integration design finalization. Weeks three through five are the technical implementation of the integration with our Epic environment. Weeks six and seven are physician training. We have built a custom training curriculum specific to our hospitalist workflow — I worked with our training team and they have already started building the materials. We are not going to wait for contract execution to start building, because I want to be ready to go on day one. Weeks eight through ten are the supervised rollout — we deploy the tool to all forty-five hospitalists but we have heavy support coverage during those three weeks. Weeks eleven and twelve are the measurement and review phase, where we collect outcome data on documentation time, physician satisfaction, and adoption rates, and we present the results to executive committee.

Sarah Chen: Lisa, this is one of the most comprehensive rollout plans I have ever seen a customer build before contract execution.

Lisa Huang: I am taking this seriously because I want it to succeed. I am also being honest with myself about the fact that the operational rollout is at least as important as the technology selection. We have selected good technology before and watched it fail because we did not invest in the rollout. I am not making that mistake again.

Dr. Amanda Chen: This is exactly why I asked Lisa to be involved early. She has more institutional memory about what makes deployments succeed and fail at Horizon than anyone else in this room.

Lisa Huang: One thing I want to flag. I have already coordinated with our training team and we are ready to start physician onboarding two weeks after contract execution. We do not need to wait for all the implementation work to be complete. We can begin the training in parallel with the technical deployment. That shaves about three weeks off the overall timeline if we manage it well.

Sarah Chen: That is exactly the kind of operational thinking that will make this succeed. Yes, parallelizing training and implementation is a great approach, and our customer success team has experience supporting that pattern.

Dr. Amanda Chen: Sarah, one more thing I want to share with everyone. I talked to our legal team last week about the BAA structure you proposed. I sent it to our chief legal counsel and her team reviewed it. They came back to me on Friday and said the BAA structure is fine and they have no concerns with the standard terms. That was the last internal gate I was personally worried about.

Sarah Chen: That is great news. I had not heard that yet.

Dr. Amanda Chen: I have been holding the legal review tight to my chest because I did not want to share it until I was sure. But it is clean. Legal cleared it.

Sarah Chen: Okay. Let me reflect back what I am hearing from this conversation so we are all on the same page. The board is aligned. Dr. Kim is sponsoring it at the executive level. Robert is endorsing the financial case at executive committee on Friday. Lisa has built a twelve-week rollout plan and her training team is already preparing. Legal has cleared the BAA. Security is on track. Mark in procurement is expecting my outreach this week. And you are all aligned on retention as the central business framing. Did I miss anything?

Dr. Amanda Chen: I do not think so. I think you have it.

Sarah Chen: I want to use the last few minutes of our time to talk about post-contract success planning. Because I think it is important that we talk about what we are committing to as a partner before the contract is signed, not after.

Lisa Huang: Yes, please. This is the conversation that I rarely get to have with vendors before signing.

Sarah Chen: Here is what I would propose. At contract execution, we assign a dedicated customer success manager to your account. That CSM is your point of contact for everything operational from that point forward. We also assign a technical implementation lead from our solutions team for the duration of phase one — that is somebody who is going to be in your slack channel and on your weekly calls until the deployment is stable. We commit to weekly check-ins for the first ninety days, with structured success reviews at thirty, sixty, and ninety days. After ninety days we transition to a quarterly business review cadence, but the CSM remains your day-to-day contact.

Lisa Huang: Who decides what success looks like at the thirty-sixty-ninety day reviews? Is that defined by you or by us?

Sarah Chen: It is co-developed in week one, and it is anchored on your business objectives. So in your case, the thirty-sixty-ninety day reviews would be measuring documentation time for the hospitalist group, physician satisfaction, and adoption rates. Those would be the metrics. We would collaboratively set targets for each of those metrics and we would review against them at each milestone. If we are not on track, we course-correct.

Lisa Huang: That is the model I want.

Dr. Amanda Chen: Sarah, there is one more thing I want to discuss before we wrap. Quarterly business reviews. I want to make sure that QBRs at our level are not just CSM check-ins. I want them to include strategic discussions — product roadmap input, where Anthropic is going as a company, how the product is evolving, whether there are new capabilities that we should be evaluating. I want this partnership to feel strategic, not just operational.

Sarah Chen: Absolutely. Our QBRs include product roadmap discussions and a strategic review at the executive level. For an account of your size, we would also offer access to our customer advisory board, which is a quarterly forum where customers like Horizon Health can directly influence product direction and meet other healthcare customers.

Dr. Amanda Chen: Customer advisory board sounds like exactly the engagement model I am looking for.

Robert Garrison: Sarah, I think we need to wrap. We have covered a lot of ground today and I am encouraged by where we are. Let me give you the next steps from my side. Friday is the executive committee meeting. I will present the revised ROI model and ask for endorsement to proceed. Assuming that goes well, Mark Davidson will reach out next week to begin the procurement workstream in earnest. The target is to have everything ready for PO submission before March fifteenth. Does that work on your side?

Sarah Chen: That works perfectly. I will be ready on every workstream.

Dr. Amanda Chen: Sarah, thank you for the thoughtful partnership through this process. It has been a pleasure working with you and Alex. We are in great shape.

Dr. Amanda Chen: One last thing Sarah. I want to acknowledge something on a personal level. This evaluation has been more efficient and more substantive than any vendor evaluation I have led at Horizon. The reason for that is partly the way you have engaged with us — bringing the right expertise to each conversation, being responsive, being transparent about what you do not know — but it is also the way you have respected our internal process. You did not try to jump over Priya to the executive team. You did not try to skip the security review. You did not push for an early commitment before we were ready. You let us run our process and you supported us through it. I want you to know that has been noticed and appreciated.

Sarah Chen: Amanda, that is one of the most meaningful things a customer has ever said to me. Thank you. I have learned from this evaluation that the customers who run rigorous processes are the ones who become great long-term partners. So if anything, it has reinforced my belief in respecting the buyer's process.

Robert Garrison: Hear, hear. And I will add my own thanks. Sarah, you have been a thoughtful and disciplined partner throughout this process. We are not done yet — there is still procurement, there is still contract execution, there is still the implementation work that Lisa is going to lead — but we are in a much better position than we were eight weeks ago and I attribute a meaningful portion of that to how you have engaged with our team. Sarah, we will be in touch this week.

Sarah Chen: Thank you all. I will follow up with the action items within the hour.`;

// ── Helper to estimate transcript word count ──
function wc(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

async function seedDealFitness() {
  console.log("🏥 Seeding Horizon Health Partners (Deal Fitness demo account)...\n");

  // Sanity-check transcript lengths before touching the database.
  const lengths = {
    discovery: wc(DISCOVERY_TRANSCRIPT),
    technical: wc(TECHNICAL_TRANSCRIPT),
    business: wc(BUSINESS_TRANSCRIPT),
    security: wc(SECURITY_TRANSCRIPT),
    exec: wc(EXEC_TRANSCRIPT),
  };
  console.log(
    `  Transcript word counts: ${JSON.stringify(lengths)}`
  );
  for (const [k, v] of Object.entries(lengths)) {
    if (v < 2500) {
      console.error(`❌ Transcript "${k}" is only ${v} words — needs >= 2500`);
      process.exit(1);
    }
  }

  // Idempotency: skip the base account if Horizon Health already exists,
  // but always re-seed fitness events/scores at the end of this script so we
  // can extend the dataset over time without wiping the company.
  const existing = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, HORIZON_COMPANY_ID));
  const baseAlreadySeeded = existing.length > 0;
  if (baseAlreadySeeded) {
    console.log(
      "  ⚠️  Horizon Health Partners already seeded — skipping base records, will re-seed fitness events."
    );
  }

  // Look up Sarah Chen and Alex Kim from the existing team_members table.
  const allMembers = await db.select().from(schema.teamMembers);
  const sarah = allMembers.find((m) => m.name === "Sarah Chen");
  const alex = allMembers.find((m) => m.name === "Alex Kim");
  if (!sarah) {
    console.error("❌ Sarah Chen not found in team_members. Run seed.ts first.");
    process.exit(1);
  }
  if (!alex) {
    console.error("❌ Alex Kim not found in team_members. Run seed-org.ts first.");
    process.exit(1);
  }
  const SARAH_ID = sarah.id;
  const ALEX_ID = alex.id;
  console.log(`  Found Sarah Chen: ${SARAH_ID}`);
  console.log(`  Found Alex Kim:   ${ALEX_ID}`);

  if (!baseAlreadySeeded) {
  // ── Company ──
  console.log("\n📋 Inserting Horizon Health Partners company...");
  await db.insert(schema.companies).values({
    id: HORIZON_COMPANY_ID,
    name: "Horizon Health Partners",
    domain: "horizonhealth.com",
    industry: "healthcare" as const,
    employeeCount: 4200,
    annualRevenue: "$890M",
    techStack: [
      "Epic EHR 2024",
      "Azure Cloud",
      "FHIR R4 APIs",
      "Dragon Medical",
      "Snowflake",
      "Power BI",
    ],
    hqLocation: "Minneapolis, MN",
    description:
      "Regional health system operating 14 facilities across Minnesota and Wisconsin. 312 physicians, 45,000 patient encounters per month. Known for early adoption of clinical technology and strong physician satisfaction programs.",
  });
  console.log("  ✓ Company created");

  // ── Contacts (7 buying committee members) ──
  console.log("\n👥 Inserting 7 contacts (buying committee)...");
  await db.insert(schema.contacts).values([
    {
      id: C_AMANDA_ID,
      firstName: "Amanda",
      lastName: "Chen",
      email: "amanda.chen@horizonhealth.com",
      title: "VP Clinical Innovation",
      linkedinUrl: "linkedin.com/in/amandachen-clinical",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "champion" as const,
      isPrimary: true,
    },
    {
      id: C_PRIYA_ID,
      firstName: "Priya",
      lastName: "Mehta",
      email: "priya.mehta@horizonhealth.com",
      title: "Director of IT & Engineering",
      linkedinUrl: "linkedin.com/in/priyamehta-healthit",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "technical_evaluator" as const,
      isPrimary: false,
    },
    {
      id: C_ROBERT_ID,
      firstName: "Robert",
      lastName: "Garrison",
      email: "robert.garrison@horizonhealth.com",
      title: "Chief Financial Officer",
      linkedinUrl: "linkedin.com/in/robertgarrison-cfo",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "economic_buyer" as const,
      isPrimary: false,
    },
    {
      id: C_LISA_ID,
      firstName: "Lisa",
      lastName: "Huang",
      email: "lisa.huang@horizonhealth.com",
      title: "VP Operations",
      linkedinUrl: "linkedin.com/in/lisahuang-ops",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "end_user" as const,
      isPrimary: false,
    },
    {
      id: C_JAMES_ID,
      firstName: "James",
      lastName: "Whitfield",
      email: "james.whitfield@horizonhealth.com",
      title: "Chief Information Security Officer",
      linkedinUrl: "linkedin.com/in/jameswhitfield-ciso",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "blocker" as const,
      isPrimary: false,
    },
    {
      id: C_MARK_ID,
      firstName: "Mark",
      lastName: "Davidson",
      email: "mark.davidson@horizonhealth.com",
      title: "Director of Procurement",
      linkedinUrl: "linkedin.com/in/markdavidson-procurement",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "end_user" as const,
      isPrimary: false,
    },
    {
      id: C_SARAH_KIM_ID,
      firstName: "Sarah",
      lastName: "Kim",
      email: "sarah.kim@horizonhealth.com",
      title: "Chief Medical Officer",
      linkedinUrl: "linkedin.com/in/sarahkim-cmo",
      companyId: HORIZON_COMPANY_ID,
      roleInDeal: "coach" as const,
      isPrimary: false,
    },
  ]);
  console.log("  ✓ 7 contacts created");

  // ── Deal ──
  console.log("\n💼 Inserting Horizon Health deal...");
  await db.insert(schema.deals).values({
    id: HORIZON_DEAL_ID,
    name: "Horizon Health Partners — Claude Enterprise",
    companyId: HORIZON_COMPANY_ID,
    primaryContactId: C_AMANDA_ID,
    assignedAeId: SARAH_ID,
    assignedSaId: ALEX_ID,
    stage: "negotiation" as const,
    dealValue: "1800000",
    currency: "USD",
    closeDate: daysFromNow(21),
    winProbability: 75,
    forecastCategory: "commit" as const,
    vertical: "healthcare" as const,
    product: "claude_enterprise" as const,
    leadSource: "inbound" as const,
    competitor: "Dragon Medical (Nuance/Microsoft)",
    stageEnteredAt: daysAgo(7),
    createdAt: daysAgo(56),
  });
  console.log("  ✓ Deal created");

  // ── MEDDPICC ──
  console.log("\n📊 Inserting MEDDPICC fields...");
  await db.insert(schema.meddpiccFields).values({
    id: HORIZON_MEDDPICC_ID,
    dealId: HORIZON_DEAL_ID,
    metrics:
      "45,000 patient encounters/month, 312 physicians across 14 facilities. Physician documentation time: ~2 hours/day. Hospitalist turnover cost: $1.2M last year (3 replacements). Target: 20-30% documentation time reduction. Revised 3-year ROI: $3.4M including physician retention savings.",
    metricsConfidence: 85,
    economicBuyer:
      "Robert Garrison, CFO. Actively engaged — co-edited ROI model, added physician retention line item, referenced March 15 fiscal Q2 PO deadline. Connected Sarah to Mark Davidson in procurement.",
    economicBuyerConfidence: 90,
    decisionCriteria:
      "HIPAA BAA compliance, SOC 2 Type II certification, US-only data residency, Epic EHR integration via FHIR R4, specialty terminology accuracy (cardiology, hospitalist), physician adoption ease. Security questionnaire (47 questions) completed and approved by CISO.",
    decisionCriteriaConfidence: 75,
    decisionProcess:
      "Champion (Amanda Chen) drives internal alignment. CFO controls budget with March 15 PO deadline. CISO (James Whitfield) owns security gate — completed and cleared. CMO (Dr. Sarah Kim) presented AI strategy to board with clinical docs as #1 priority. Procurement (Mark Davidson) handling master agreement. Legal cleared BAA structure.",
    decisionProcessConfidence: 80,
    identifyPain:
      "Physician documentation burden is the #1 driver of burnout per exit interviews. Current Dragon Medical solution has poor specialty terminology accuracy. Lost 3 hospitalists last year citing documentation burden ($1.2M replacement cost). 2 hours/day of physician time consumed by clinical notes.",
    identifyPainConfidence: 95,
    champion:
      "Dr. Amanda Chen, VP Clinical Innovation. Former practicing cardiologist. Initiated contact after webinar. Actively coaches Sarah on internal positioning ('lead with physician satisfaction, not cost savings'). Uses 'we' language. Briefed CMO and legal proactively. Texted Sarah after successful security review.",
    championConfidence: 90,
    competition:
      "Dragon Medical (Nuance/Microsoft) is incumbent — 3 years deployed. Known weakness: poor specialty terminology accuracy. No head-to-head competitive eval happening — this is a replacement decision. Risk: Microsoft could bundle DAX Copilot pricing to retain.",
    competitionConfidence: 70,
    aiExtracted: true,
    aeConfirmed: false,
  });
  console.log("  ✓ MEDDPICC fields created");

  // ── Deal Milestones ──
  console.log("\n🎯 Inserting deal milestones...");
  await db.insert(schema.dealMilestones).values([
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "initial_meeting",
      isCompleted: true,
      completedAt: daysAgo(49),
      source: "transcript" as const,
      evidence: "Discovery call with Amanda Chen",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "discovery_completed",
      isCompleted: true,
      completedAt: daysAgo(49),
      source: "transcript" as const,
      evidence: "Pain points, metrics, and competitive landscape discussed",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "technical_evaluation",
      isCompleted: true,
      completedAt: daysAgo(35),
      source: "transcript" as const,
      evidence: "Deep dive with Priya Mehta on Epic integration",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "demo_delivered",
      isCompleted: true,
      completedAt: daysAgo(35),
      source: "transcript" as const,
      evidence: "Live demo of Claude Enterprise clinical documentation",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "business_case_presented",
      isCompleted: true,
      completedAt: daysAgo(28),
      source: "transcript" as const,
      evidence: "ROI model reviewed and co-edited by CFO",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "security_review",
      isCompleted: true,
      completedAt: daysAgo(14),
      source: "transcript" as const,
      evidence: "CISO completed 47-question security assessment",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "executive_sponsor_engaged",
      isCompleted: true,
      completedAt: daysAgo(2),
      source: "transcript" as const,
      evidence: "CMO presented AI strategy to board",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "proposal_delivered",
      isCompleted: true,
      completedAt: daysAgo(7),
      source: "manual" as const,
      evidence: "Master agreement terms sent",
    },
    {
      dealId: HORIZON_DEAL_ID,
      milestoneKey: "procurement_engaged",
      isCompleted: false,
      completedAt: null,
      source: null,
      evidence: null,
    },
  ]);
  console.log("  ✓ 9 milestones created");

  // ── Call Transcripts ──
  console.log("\n🎙️  Inserting 5 call transcripts...");
  await db.insert(schema.callTranscripts).values([
    {
      id: T_DISCOVERY_ID,
      dealId: HORIZON_DEAL_ID,
      title: "Initial Discovery — Understanding Clinical Documentation Challenges",
      date: daysAgo(49),
      durationSeconds: 1200,
      participants: [
        { name: "Dr. Amanda Chen", role: "VP Clinical Innovation", company: "Horizon Health Partners" },
        { name: "Sarah Chen", role: "Account Executive", company: "Anthropic" },
      ],
      transcriptText: DISCOVERY_TRANSCRIPT,
      source: "simulated" as const,
      status: "complete" as const,
      createdAt: daysAgo(49),
    },
    {
      id: T_TECHNICAL_ID,
      dealId: HORIZON_DEAL_ID,
      title: "Technical Deep Dive — Architecture & Integration Requirements",
      date: daysAgo(35),
      durationSeconds: 2100,
      participants: [
        { name: "Dr. Amanda Chen", role: "VP Clinical Innovation" },
        { name: "Priya Mehta", role: "Director of IT & Engineering" },
        { name: "Sarah Chen", role: "Account Executive", company: "Anthropic" },
        { name: "Alex Kim", role: "Solutions Consultant", company: "Anthropic" },
      ],
      transcriptText: TECHNICAL_TRANSCRIPT,
      source: "simulated" as const,
      status: "complete" as const,
      createdAt: daysAgo(35),
    },
    {
      id: T_BUSINESS_ID,
      dealId: HORIZON_DEAL_ID,
      title: "Business Case Review — ROI Model & Rollout Planning",
      date: daysAgo(28),
      durationSeconds: 1800,
      participants: [
        { name: "Dr. Amanda Chen", role: "VP Clinical Innovation" },
        { name: "Robert Garrison", role: "CFO" },
        { name: "Lisa Huang", role: "VP Operations" },
        { name: "Sarah Chen", role: "Account Executive", company: "Anthropic" },
      ],
      transcriptText: BUSINESS_TRANSCRIPT,
      source: "simulated" as const,
      status: "complete" as const,
      createdAt: daysAgo(28),
    },
    {
      id: T_SECURITY_ID,
      dealId: HORIZON_DEAL_ID,
      title: "Security & Compliance Deep Dive",
      date: daysAgo(14),
      durationSeconds: 1500,
      participants: [
        { name: "Dr. Amanda Chen", role: "VP Clinical Innovation" },
        { name: "Priya Mehta", role: "Director of IT & Engineering" },
        { name: "James Whitfield", role: "CISO" },
        { name: "Sarah Chen", role: "Account Executive", company: "Anthropic" },
        { name: "Alex Kim", role: "Solutions Consultant", company: "Anthropic" },
      ],
      transcriptText: SECURITY_TRANSCRIPT,
      source: "simulated" as const,
      status: "complete" as const,
      createdAt: daysAgo(14),
    },
    {
      id: T_EXEC_ID,
      dealId: HORIZON_DEAL_ID,
      title: "Executive Alignment & Next Steps",
      date: daysAgo(2),
      durationSeconds: 1200,
      participants: [
        { name: "Dr. Amanda Chen", role: "VP Clinical Innovation" },
        { name: "Robert Garrison", role: "CFO" },
        { name: "Dr. Sarah Kim", role: "CMO" },
        { name: "Lisa Huang", role: "VP Operations" },
        { name: "Sarah Chen", role: "Account Executive", company: "Anthropic" },
      ],
      transcriptText: EXEC_TRANSCRIPT,
      source: "simulated" as const,
      status: "complete" as const,
      createdAt: daysAgo(2),
    },
  ]);
  console.log("  ✓ 5 transcripts created");

  // ── Email Activities ──
  console.log("\n📧 Inserting 14 email activities...");
  await db.insert(schema.activities).values([
    // 1. Week 0 — INBOUND from Amanda
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Following up from your AI in Healthcare webinar",
      description:
        "Dr. Amanda Chen reached out after attending Anthropic's webinar on AI applications in clinical settings. She expressed interest in exploring Claude Enterprise for clinical documentation and asked about scheduling an introductory call. Mentioned they're currently using Dragon Medical and looking for next-generation alternatives.",
      metadata: {
        direction: "inbound",
        from: "amanda.chen@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        responseTimeHours: 1,
      },
      createdAt: daysAgo(56),
    },
    // 2. Week 0 — OUTBOUND from Sarah
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_sent" as const,
      subject: "RE: Great connecting — let's schedule time",
      description:
        "Sarah responded with available times for an introductory call and attached a brief overview of Claude Enterprise's clinical documentation capabilities. Included a case study from a similar-sized health system.",
      metadata: {
        direction: "outbound",
        from: "sarah.chen@anthropic.com",
        to: ["amanda.chen@horizonhealth.com"],
      },
      createdAt: daysAgo(55),
    },
    // 3. Week 2 — INBOUND from Amanda introducing Priya
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Looping in Priya Mehta from our IT team",
      description:
        "Amanda introduced Priya Mehta (Director of IT & Engineering) for the upcoming technical deep dive. Amanda shared that Priya has been evaluating AI vendors for integration with their Epic EHR system and would lead the technical assessment.",
      metadata: {
        direction: "inbound",
        from: "amanda.chen@horizonhealth.com",
        to: ["sarah.chen@anthropic.com", "alex.kim@anthropic.com"],
        cc: ["priya.mehta@horizonhealth.com"],
        responseTimeHours: 36,
      },
      createdAt: daysAgo(42),
    },
    // 4. Week 3 — INBOUND from Priya with architecture overview
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_PRIYA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Architecture overview & integration questions",
      description:
        "Priya sent a detailed PDF documenting Horizon Health's technical architecture including Epic 2024 deployment details, FHIR R4 API configurations, Azure infrastructure setup, and integration requirements. Included 8 specific integration questions about HL7 message processing and real-time inference latency.",
      metadata: {
        direction: "inbound",
        from: "priya.mehta@horizonhealth.com",
        to: ["sarah.chen@anthropic.com", "alex.kim@anthropic.com"],
        responseTimeHours: 14,
      },
      createdAt: daysAgo(34),
    },
    // 5. Week 3 — OUTBOUND from Sarah with ROI model
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_sent" as const,
      subject: "ROI Model v1 — Horizon Health + Claude Enterprise",
      description:
        "Sarah sent the initial ROI model projecting 30% documentation time reduction, estimated annual savings of $2.1M, and 3-year ROI of $2.8M. Included methodology notes and assumptions. Asked Amanda to share with Robert Garrison (CFO) before the business case review call.",
      metadata: {
        direction: "outbound",
        from: "sarah.chen@anthropic.com",
        to: ["amanda.chen@horizonhealth.com", "robert.garrison@horizonhealth.com"],
      },
      createdAt: daysAgo(33),
    },
    // 6. Week 3 — INBOUND from Amanda — Robert wants to review (coaching)
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Robert wants to review before our call",
      description:
        "Amanda confirmed Robert received the ROI model and wants to prepare his own analysis before the group call. Amanda coached Sarah: 'He responds best to conservative assumptions — better to underpromise. Also lead with the retention angle, not just productivity.' Response time: 2 hours.",
      metadata: {
        direction: "inbound",
        from: "amanda.chen@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        responseTimeHours: 2,
      },
      createdAt: daysAgo(32),
    },
    // 7. Week 4 — INBOUND from Robert with revised ROI
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_ROBERT_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Revised ROI — see my edits",
      description:
        "Robert sent back the ROI model with his revisions: adjusted productivity assumption from 30% to 20%, added a physician retention line item ($1.2M/year based on actual turnover costs), and recalculated 3-year ROI to $3.4M. Included a note: 'This is the version I'd be comfortable presenting to our board.'",
      metadata: {
        direction: "inbound",
        from: "robert.garrison@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        cc: ["amanda.chen@horizonhealth.com"],
        responseTimeHours: 12,
      },
      createdAt: daysAgo(27),
    },
    // 8. Week 5 — INBOUND from Amanda introducing James (CISO)
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Introducing James Whitfield, our CISO — security review",
      description:
        "Amanda introduced James Whitfield (CISO) to begin the formal security evaluation. Amanda noted that James has reviewed 14 AI vendors this year and has a rigorous process. She assured Sarah: 'James is thorough but fair. If you can answer his questions clearly, you'll be fine.'",
      metadata: {
        direction: "inbound",
        from: "amanda.chen@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        cc: ["james.whitfield@horizonhealth.com"],
        responseTimeHours: 6,
      },
      createdAt: daysAgo(20),
    },
    // 9. Week 6 — INBOUND from James with security questionnaire
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_JAMES_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Security questionnaire attached — 47 questions",
      description:
        "James sent Horizon Health's standard AI vendor security assessment. 47 questions covering HIPAA compliance, data residency, model training data isolation, encryption, audit logging, incident response, and penetration testing. Requested completion within 5 business days.",
      metadata: {
        direction: "inbound",
        from: "james.whitfield@horizonhealth.com",
        to: ["sarah.chen@anthropic.com", "alex.kim@anthropic.com"],
        responseTimeHours: 5,
      },
      createdAt: daysAgo(15),
    },
    // 10. Week 6 — OUTBOUND from Sarah with completed questionnaire
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_JAMES_ID,
      teamMemberId: SARAH_ID,
      type: "email_sent" as const,
      subject: "Completed questionnaire + SOC 2 Type II report",
      description:
        "Sarah returned the completed security questionnaire with detailed answers to all 47 questions. Attached Anthropic's SOC 2 Type II audit report, HIPAA BAA template, and data processing addendum. Included architecture diagram showing air-gapped inference and PHI handling.",
      metadata: {
        direction: "outbound",
        from: "sarah.chen@anthropic.com",
        to: ["james.whitfield@horizonhealth.com"],
      },
      createdAt: daysAgo(13),
    },
    // 11. Week 6 — INBOUND from James — security gate cleared
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_JAMES_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Thorough answers — Priya, please set up the sandbox",
      description:
        "James confirmed satisfaction with the security questionnaire responses. Directed Priya to provision a sandbox environment in their Azure dev tenant for integration testing. Added: 'The data residency documentation was particularly clear. I'll mark the security gate as passed in our vendor tracker.'",
      metadata: {
        direction: "inbound",
        from: "james.whitfield@horizonhealth.com",
        to: ["sarah.chen@anthropic.com", "priya.mehta@horizonhealth.com"],
        responseTimeHours: 4,
      },
      createdAt: daysAgo(12),
    },
    // 12. Week 7 — INBOUND from Amanda — Lisa is sold
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Lisa's already drafting the rollout plan — she's excited",
      description:
        "Amanda shared that Lisa Huang (VP Operations) has proactively created a 12-week rollout timeline with three phases. Amanda mentioned that Lisa coordinated with their training team without being asked. Amanda said: 'This level of operational buy-in usually doesn't happen until after contract signing. Lisa is sold.'",
      metadata: {
        direction: "inbound",
        from: "amanda.chen@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        responseTimeHours: 3,
      },
      createdAt: daysAgo(8),
    },
    // 13. Week 8 — INBOUND from Mark Davidson (procurement)
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_MARK_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Amanda referred me — can you send the standard agreement?",
      description:
        "Mark Davidson (Director of Procurement) reached out directly to request the master services agreement and standard contract terms. Mentioned Amanda briefed him on the evaluation and that Robert Garrison has approved the budget allocation. Asked about volume pricing for 312 physician licenses.",
      metadata: {
        direction: "inbound",
        from: "mark.davidson@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        responseTimeHours: 4,
      },
      createdAt: daysAgo(3),
    },
    // 14. Week 8 — INBOUND from Amanda — board update
    {
      dealId: HORIZON_DEAL_ID,
      contactId: C_AMANDA_ID,
      teamMemberId: SARAH_ID,
      type: "email_received" as const,
      subject: "Board update — Dr. Kim presented AI strategy, clinical docs was #1",
      description:
        "Amanda shared that Dr. Sarah Kim (CMO) presented the AI strategy to the board of directors last Thursday. Clinical documentation was identified as the top priority with three board members asking specific questions about it. Amanda said: 'We're in great shape. Legal cleared the BAA, security is passed, procurement is engaged. This is happening.' Response time: 45 minutes.",
      metadata: {
        direction: "inbound",
        from: "amanda.chen@horizonhealth.com",
        to: ["sarah.chen@anthropic.com"],
        responseTimeHours: 0.75,
      },
      createdAt: daysAgo(1),
    },
  ]);
  console.log("  ✓ 14 email activities created");
  } // end if (!baseAlreadySeeded)

  // ══════════════════════════════════════════════════════
  // Deal Fitness Events + Scores (always re-seeded)
  // ══════════════════════════════════════════════════════
  console.log("\n🎯 Re-seeding deal fitness events + scores...");

  // Wipe any prior fitness data for this deal so this script is fully idempotent
  await db
    .delete(schema.dealFitnessEvents)
    .where(eq(schema.dealFitnessEvents.dealId, HORIZON_DEAL_ID));
  await db
    .delete(schema.dealFitnessScores)
    .where(eq(schema.dealFitnessScores.dealId, HORIZON_DEAL_ID));

  // Look up email activity IDs by subject so evidence can reference them concretely
  const dealActivities = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.dealId, HORIZON_DEAL_ID));
  const emailBySubject = new Map<string, string>();
  for (const a of dealActivities) {
    if (a.subject) emailBySubject.set(a.subject, a.id);
  }
  function emailRef(subject: string, label: string) {
    const id = emailBySubject.get(subject);
    return id ? { type: "email" as const, id, label } : null;
  }

  // ── Date helpers tied to the demo timeline (Week N = N*7 days ago) ──
  const W0 = daysAgo(56);
  const W1 = daysAgo(49);
  const W3 = daysAgo(35);
  const W4 = daysAgo(28);
  const W6 = daysAgo(14);
  const W8 = daysAgo(2);

  // Source-reference helpers
  const refDiscovery   = { type: "transcript" as const, id: T_DISCOVERY_ID,  label: "Call 1: Initial Discovery" };
  const refTechnical   = { type: "transcript" as const, id: T_TECHNICAL_ID,  label: "Call 2: Technical Deep Dive" };
  const refBusiness    = { type: "transcript" as const, id: T_BUSINESS_ID,   label: "Call 3: Business Case Review" };
  const refSecurity    = { type: "transcript" as const, id: T_SECURITY_ID,   label: "Call 4: Security & Compliance" };
  const refExec        = { type: "transcript" as const, id: T_EXEC_ID,       label: "Call 5: Executive Alignment" };

  // ── 25 deal fitness events ──
  await db.insert(schema.dealFitnessEvents).values([
    // ════════ BUSINESS FIT (6 — 5 detected, 1 not_yet) ════════
    {
      id: "e4000001-0000-0000-0000-000000000001",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "business_fit",
      eventKey: "buyer_initiates_contact",
      eventLabel: "Buyer initiates evaluation",
      eventDescription:
        "The buyer reached out first — not responding to outbound. Buyer-initiated evaluations close at 2x the rate of outbound-sourced deals.",
      status: "detected",
      detectedAt: W0,
      detectionSources: ["email"],
      sourceReferences: [emailRef("Following up from your AI in Healthcare webinar", "Email: Following up from webinar (Week 0)")].filter(Boolean),
      evidenceSnippets: [
        {
          source: "email",
          quote: "Reached out after attending Anthropic's webinar. Asked about scheduling an introductory call.",
          timestamp: W0.toISOString(),
        },
      ],
      confidence: "0.99",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000002",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "business_fit",
      eventKey: "buyer_shares_kpis",
      eventLabel: "Buyer volunteers business metrics",
      eventDescription:
        "The buyer shared internal KPIs unprompted — 45K encounters/month, 312 physicians, 14 facilities, ~2 hrs/day documentation time. Volunteering specific metrics signals genuine evaluation intent, not just tire-kicking.",
      status: "detected",
      detectedAt: W1,
      detectionSources: ["transcript"],
      sourceReferences: [refDiscovery],
      evidenceSnippets: [
        {
          source: "transcript_1",
          quote: "Fourteen facilities. Three hundred and twelve physicians. Forty-five thousand patient encounters per month.",
          timestamp: W1.toISOString(),
        },
        {
          source: "transcript_1",
          quote: "Roughly two hours a day per physician spent on clinical notes — we measured it directly.",
          timestamp: W1.toISOString(),
        },
      ],
      confidence: "0.95",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000003",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "business_fit",
      eventKey: "buyer_references_competitor",
      eventLabel: "Buyer shares competitive context",
      eventDescription:
        "The buyer named their current solution (Dragon Medical) and articulated specific frustrations. This signals active dissatisfaction, not just curiosity — they're looking to replace, not add.",
      status: "detected",
      detectedAt: W1,
      detectionSources: ["transcript"],
      sourceReferences: [refDiscovery],
      evidenceSnippets: [
        {
          source: "transcript_1",
          quote: "Dragon Medical. Our cardiologists have basically given up on it — specialty terminology accuracy is terrible.",
          timestamp: W1.toISOString(),
        },
      ],
      confidence: "0.92",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000004",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "business_fit",
      eventKey: "buyer_co_edits_roi",
      eventLabel: "Buyer revises ROI model with own inputs",
      eventDescription:
        "The CFO didn't just review the ROI model — he edited it. Added a physician retention line item ($1.2M), adjusted productivity assumptions from 30% to 20%, and recalculated 3-year ROI to $3.4M. A buyer who co-creates the business case will defend it internally.",
      status: "detected",
      detectedAt: W4,
      detectionSources: ["email", "transcript"],
      sourceReferences: [
        refBusiness,
        emailRef("Revised ROI — see my edits", "Email: Revised ROI from CFO (Week 4)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "transcript_3",
          quote: "Your 30% productivity assumption is aggressive. I'd be comfortable defending 20% to the board.",
          timestamp: W4.toISOString(),
        },
        {
          source: "transcript_3",
          quote: "Add a line for physician retention. We spent $1.2M last year replacing three hospitalists.",
          timestamp: W4.toISOString(),
        },
        {
          source: "email",
          quote: "Robert returned the model: productivity 30%→20%, added $1.2M retention line, 3-year ROI now $3.4M.",
          timestamp: W4.toISOString(),
        },
      ],
      confidence: "0.97",
      contactId: C_ROBERT_ID,
      contactName: "Robert Garrison",
    },
    {
      id: "e4000001-0000-0000-0000-000000000005",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "business_fit",
      eventKey: "buyer_references_budget",
      eventLabel: "Buyer references budget cycle or timeline",
      eventDescription:
        "The CFO referenced a specific fiscal deadline: 'PO submitted before March 15th — fiscal Q2 cutoff.' Anchoring to a fiscal calendar means this has budget allocation, not just interest.",
      status: "detected",
      detectedAt: W4,
      detectionSources: ["transcript"],
      sourceReferences: [refBusiness],
      evidenceSnippets: [
        {
          source: "transcript_3",
          quote: "I need the PO submitted before March 15th. That is our fiscal Q2 cutoff.",
          timestamp: W4.toISOString(),
        },
      ],
      confidence: "0.94",
      contactId: C_ROBERT_ID,
      contactName: "Robert Garrison",
    },
    {
      id: "e4000001-0000-0000-0000-000000000006",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "business_fit",
      eventKey: "buyer_shares_competitive_pricing",
      eventLabel: "Buyer shares competitive pricing received",
      eventDescription:
        "The buyer has not disclosed pricing from Dragon Medical/Microsoft or any other vendor. This limits our ability to position value against their alternatives. Coaching: ask Amanda directly what Microsoft is quoting if DAX comes back into play.",
      status: "not_yet",
      detectedAt: null,
      detectionSources: null,
      sourceReferences: null,
      evidenceSnippets: null,
      confidence: null,
      contactId: null,
      contactName: null,
    },

    // ════════ EMOTIONAL FIT (6 — 4 detected, 2 not_yet) ════════
    {
      id: "e4000001-0000-0000-0000-000000000007",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "emotional_fit",
      eventKey: "response_time_accelerating",
      eventLabel: "Response time decreasing over lifecycle",
      eventDescription:
        "Email response times dropped from 36 hours (Week 0-2) to under 1 hour (Week 8). Accelerating responsiveness signals increasing priority — this evaluation is moving up the buyer's stack rank.",
      status: "detected",
      detectedAt: W8,
      detectionSources: ["email"],
      sourceReferences: [
        emailRef("Board update — Dr. Kim presented AI strategy, clinical docs was #1", "Email: Board update (Week 8, 45-min response)"),
        emailRef("Looping in Priya Mehta from our IT team", "Email: Intro Priya (Week 2, 36-hr response)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "email",
          quote: "Response time decreased from ~36h (Week 0-2) to ~6h (Week 5-6) to <1h (Week 8).",
          timestamp: W8.toISOString(),
        },
      ],
      confidence: "0.88",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000008",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "emotional_fit",
      eventKey: "buyer_gives_coaching",
      eventLabel: "Buyer coaches seller on internal dynamics",
      eventDescription:
        "Amanda explicitly coached Sarah on how to position the business case to the CFO. A buyer who coaches the seller on internal positioning is acting as a true champion — they want you to win.",
      status: "detected",
      detectedAt: W3,
      detectionSources: ["transcript"],
      sourceReferences: [refTechnical],
      evidenceSnippets: [
        {
          source: "transcript_2",
          quote: "When you talk to Robert, lead with physician satisfaction and retention. He has been obsessing over turnover costs.",
          timestamp: W3.toISOString(),
        },
      ],
      confidence: "0.93",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000009",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "emotional_fit",
      eventKey: "buyer_off_channel",
      eventLabel: "Buyer communicates outside primary channel",
      eventDescription:
        "Amanda moved off email after the security review week to share informal updates. Off-channel communication signals personal investment beyond professional obligation.",
      status: "detected",
      detectedAt: W6,
      detectionSources: ["transcript"],
      sourceReferences: [refSecurity],
      evidenceSnippets: [
        {
          source: "transcript_4",
          quote: "Amanda told me directly afterwards that she does not see any obvious blockers — informal back-channel update.",
          timestamp: W6.toISOString(),
        },
      ],
      confidence: "0.85",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000010",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "emotional_fit",
      eventKey: "buyer_uses_we_language",
      eventLabel: "Buyer shifts to collaborative \"we\" language",
      eventDescription:
        "In the final call, Amanda consistently used ownership language: 'When we implement this...' / 'Our go-live target...' / 'The way I see our partnership working...' Language shift from 'you/your product' to 'we/our implementation' signals psychological commitment.",
      status: "detected",
      detectedAt: W8,
      detectionSources: ["transcript"],
      sourceReferences: [refExec],
      evidenceSnippets: [
        {
          source: "transcript_5",
          quote: "When we implement this... our go-live target... the way I see our partnership working.",
          timestamp: W8.toISOString(),
        },
      ],
      confidence: "0.91",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000011",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "emotional_fit",
      eventKey: "buyer_responds_after_hours",
      eventLabel: "Buyer responds outside business hours",
      eventDescription:
        "No after-hours email responses have been detected. All communication has occurred during standard business hours. This is not strictly a negative signal but its absence means the evaluation may be contained within normal work boundaries — the relationship has not yet crossed into personal urgency.",
      status: "not_yet",
      detectedAt: null,
      detectionSources: null,
      sourceReferences: null,
      evidenceSnippets: null,
      confidence: null,
      contactId: null,
      contactName: null,
    },
    {
      id: "e4000001-0000-0000-0000-000000000012",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "emotional_fit",
      eventKey: "buyer_shares_personal",
      eventLabel: "Buyer shares non-business context",
      eventDescription:
        "Champion has shared professional background but no personal-life disclosure (family, hobbies, weekend plans). Personal disclosure builds trust reciprocity. Coaching: invest 60 seconds at the start of the next call on something genuinely personal — Amanda is high-trust and will respond in kind.",
      status: "not_yet",
      detectedAt: null,
      detectionSources: null,
      sourceReferences: null,
      evidenceSnippets: null,
      confidence: null,
      contactId: null,
      contactName: null,
    },

    // ════════ TECHNICAL FIT (6 — 6 detected, 0 not_yet) ════════
    {
      id: "e4000001-0000-0000-0000-000000000013",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "technical_fit",
      eventKey: "buyer_tech_team_joins",
      eventLabel: "Buyer's technical team joins evaluation",
      eventDescription:
        "Priya Mehta (Director of IT & Engineering) was introduced by Amanda and joined Call 2 for the technical deep dive. The buyer widening access to technical stakeholders signals the evaluation has moved past curiosity into serious assessment.",
      status: "detected",
      detectedAt: W3,
      detectionSources: ["transcript", "email"],
      sourceReferences: [
        refTechnical,
        emailRef("Looping in Priya Mehta from our IT team", "Email: Intro Priya (Week 2)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "email",
          quote: "Amanda introduced Priya Mehta to lead the technical assessment of Claude Enterprise.",
          timestamp: W3.toISOString(),
        },
        {
          source: "transcript_2",
          quote: "Priya joined Call 2 with a structured list of technical questions about HL7, FHIR, latency, and observability.",
          timestamp: W3.toISOString(),
        },
      ],
      confidence: "0.98",
      contactId: C_PRIYA_ID,
      contactName: "Priya Mehta",
    },
    {
      id: "e4000001-0000-0000-0000-000000000014",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "technical_fit",
      eventKey: "buyer_shares_architecture",
      eventLabel: "Buyer shares technical stack and architecture",
      eventDescription:
        "Priya shared their full architecture: Epic 2024, FHIR R4 APIs, Azure-hosted, 15 custom connectors. She also sent a detailed PDF documenting integration requirements. Sharing proprietary technical details signals trust and serious evaluation intent.",
      status: "detected",
      detectedAt: W3,
      detectionSources: ["transcript", "email"],
      sourceReferences: [
        refTechnical,
        emailRef("Architecture overview & integration questions", "Email: Architecture PDF (Week 3)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "transcript_2",
          quote: "Epic 2024, FHIR R4 APIs, Azure-hosted integration layer, fifteen custom connectors, Snowflake warehouse.",
          timestamp: W3.toISOString(),
        },
      ],
      confidence: "0.96",
      contactId: C_PRIYA_ID,
      contactName: "Priya Mehta",
    },
    {
      id: "e4000001-0000-0000-0000-000000000015",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "technical_fit",
      eventKey: "buyer_asks_integration",
      eventLabel: "Buyer asks specific integration questions",
      eventDescription:
        "Priya asked targeted technical questions about HL7 conversion, real-time inference latency, model versioning, and rate limiting. Specificity indicates they're mentally architecting the integration — not just checking boxes.",
      status: "detected",
      detectedAt: W3,
      detectionSources: ["transcript"],
      sourceReferences: [refTechnical],
      evidenceSnippets: [
        {
          source: "transcript_2",
          quote: "Can Claude process HL7 messages directly, or do we need a middleware layer that converts HL7 to FHIR?",
          timestamp: W3.toISOString(),
        },
        {
          source: "transcript_2",
          quote: "What is the latency on real-time inference for clinical notes? Round-trip time inside the physician workflow.",
          timestamp: W3.toISOString(),
        },
      ],
      confidence: "0.94",
      contactId: C_PRIYA_ID,
      contactName: "Priya Mehta",
    },
    {
      id: "e4000001-0000-0000-0000-000000000016",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "technical_fit",
      eventKey: "buyer_security_review",
      eventLabel: "Buyer's security team initiates formal review",
      eventDescription:
        "James Whitfield (CISO) joined Call 4 and sent a 47-question security questionnaire. A formal security review means the evaluation has crossed from 'exploring' to 'validating for purchase.' Organizations don't waste their CISO's time on deals they're not serious about.",
      status: "detected",
      detectedAt: W6,
      detectionSources: ["transcript", "email"],
      sourceReferences: [
        refSecurity,
        emailRef("Introducing James Whitfield, our CISO — security review", "Email: Intro CISO (Week 5)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "transcript_4",
          quote: "I have reviewed fourteen AI vendors this year. Let us see if you are different from the other thirteen.",
          timestamp: W6.toISOString(),
        },
      ],
      confidence: "0.97",
      contactId: C_JAMES_ID,
      contactName: "James Whitfield",
    },
    {
      id: "e4000001-0000-0000-0000-000000000017",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "technical_fit",
      eventKey: "buyer_shares_compliance",
      eventLabel: "Buyer sends compliance or security requirements",
      eventDescription:
        "James sent the formal 47-question security assessment covering HIPAA, data residency, model training isolation, encryption, and audit logging. Sharing compliance requirements means legal and security are engaged — a prerequisite for procurement in healthcare.",
      status: "detected",
      detectedAt: W6,
      detectionSources: ["email"],
      sourceReferences: [
        emailRef("Security questionnaire attached — 47 questions", "Email: 47-question security questionnaire (Week 6)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "email",
          quote: "47-question security assessment: HIPAA, data residency, training isolation, encryption, audit logging, IR.",
          timestamp: W6.toISOString(),
        },
      ],
      confidence: "0.95",
      contactId: C_JAMES_ID,
      contactName: "James Whitfield",
    },
    {
      id: "e4000001-0000-0000-0000-000000000018",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "technical_fit",
      eventKey: "buyer_grants_access",
      eventLabel: "Buyer grants sandbox or test environment",
      eventDescription:
        "After security review passed, James directed Priya to provision a sandbox environment in their Azure dev tenant. Granting infrastructure access is a high-commitment action — it requires IT resources and internal approval.",
      status: "detected",
      detectedAt: W6,
      detectionSources: ["email", "transcript"],
      sourceReferences: [
        refSecurity,
        emailRef("Thorough answers — Priya, please set up the sandbox", "Email: CISO clears security gate (Week 6)"),
      ].filter(Boolean),
      evidenceSnippets: [
        {
          source: "email",
          quote: "Priya, please set up the sandbox. Marking the security gate as passed in our vendor tracker.",
          timestamp: W6.toISOString(),
        },
      ],
      confidence: "0.93",
      contactId: C_JAMES_ID,
      contactName: "James Whitfield",
    },

    // ════════ READINESS FIT (7 — 5 detected, 2 not_yet) ════════
    {
      id: "e4000001-0000-0000-0000-000000000019",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_identifies_sponsor",
      eventLabel: "Buyer identifies executive sponsor",
      eventDescription:
        "Amanda mentioned in Call 2 that she briefed Dr. Sarah Kim (CMO) and that the CMO is interested. In Call 5, Dr. Kim joined and confirmed the board approved the AI strategy with clinical docs as #1 priority. Executive sponsorship de-risks budget and organizational resistance.",
      status: "detected",
      detectedAt: W3,
      detectionSources: ["transcript"],
      sourceReferences: [refTechnical],
      evidenceSnippets: [
        {
          source: "transcript_2",
          quote: "I briefed Dr. Kim last week. She's interested. She wants to see how this fits into our broader AI governance framework.",
          timestamp: W3.toISOString(),
        },
      ],
      confidence: "0.92",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000020",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_discusses_rollout",
      eventLabel: "Buyer discusses change management or rollout plan",
      eventDescription:
        "Lisa Huang (VP Operations) described a phased rollout: start with 45 hospitalists at downtown campus, expand to cardiology and pulmonology, then full rollout. A buyer who voluntarily plans rollout logistics is mentally past 'should we buy' and into 'how do we succeed.'",
      status: "detected",
      detectedAt: W4,
      detectionSources: ["transcript"],
      sourceReferences: [refBusiness],
      evidenceSnippets: [
        {
          source: "transcript_3",
          quote: "Phase one: 45 hospitalists at downtown campus. Phase two: cardiology and pulmonology. Phase three: full rollout.",
          timestamp: W4.toISOString(),
        },
      ],
      confidence: "0.94",
      contactId: C_LISA_ID,
      contactName: "Lisa Huang",
    },
    {
      id: "e4000001-0000-0000-0000-000000000021",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_asks_onboarding",
      eventLabel: "Buyer asks about onboarding and CSM support",
      eventDescription:
        "Lisa asked specifically: 'Do you assign a dedicated CSM? Our last vendor left us on our own after signing and it was a disaster.' This signals they're planning for post-contract success and reveals a negative past experience we can differentiate against.",
      status: "detected",
      detectedAt: W4,
      detectionSources: ["transcript"],
      sourceReferences: [refBusiness],
      evidenceSnippets: [
        {
          source: "transcript_3",
          quote: "Do you assign a dedicated CSM? Our last vendor left us on our own after signing and it was a disaster.",
          timestamp: W4.toISOString(),
        },
      ],
      confidence: "0.90",
      contactId: C_LISA_ID,
      contactName: "Lisa Huang",
    },
    {
      id: "e4000001-0000-0000-0000-000000000022",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_executive_alignment",
      eventLabel: "Executive sponsor actively confirms organizational priority",
      eventDescription:
        "Dr. Kim joined Call 5 and stated: 'I presented our AI strategy to the board. Clinical documentation was the top priority. Three board members asked about it.' Board-level priority confirmation is the strongest organizational commitment signal.",
      status: "detected",
      detectedAt: W8,
      detectionSources: ["transcript"],
      sourceReferences: [refExec],
      evidenceSnippets: [
        {
          source: "transcript_5",
          quote: "I presented our AI strategy to the board. Clinical documentation was the top priority. Three board members asked about it.",
          timestamp: W8.toISOString(),
        },
      ],
      confidence: "0.96",
      contactId: C_SARAH_KIM_ID,
      contactName: "Dr. Sarah Kim",
    },
    {
      id: "e4000001-0000-0000-0000-000000000023",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_addresses_blockers",
      eventLabel: "Buyer proactively resolves internal obstacles",
      eventDescription:
        "Amanda: 'I talked to legal last week. They're fine with the BAA structure you proposed. That was the last internal gate I was worried about.' When a champion proactively removes blockers without being asked, they're actively selling internally on your behalf.",
      status: "detected",
      detectedAt: W8,
      detectionSources: ["transcript"],
      sourceReferences: [refExec],
      evidenceSnippets: [
        {
          source: "transcript_5",
          quote: "I talked to legal last week. They're fine with the BAA structure. That was the last internal gate I was worried about.",
          timestamp: W8.toISOString(),
        },
      ],
      confidence: "0.95",
      contactId: C_AMANDA_ID,
      contactName: "Dr. Amanda Chen",
    },
    {
      id: "e4000001-0000-0000-0000-000000000024",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_assigns_program_owner",
      eventLabel: "Buyer assigns dedicated day-to-day program owner",
      eventDescription:
        "Amanda is the executive champion (VP Clinical Innovation) but she will not run the program day-to-day post-launch. No one has been identified as the operational owner who will drive physician adoption, manage training schedules, and handle ongoing optimization. This is a customer success risk even if the deal closes — coaching: ask Amanda directly who will own this on day 90.",
      status: "not_yet",
      detectedAt: null,
      detectionSources: null,
      sourceReferences: null,
      evidenceSnippets: null,
      confidence: null,
      contactId: null,
      contactName: null,
    },
    {
      id: "e4000001-0000-0000-0000-000000000025",
      dealId: HORIZON_DEAL_ID,
      fitCategory: "readiness_fit",
      eventKey: "buyer_creates_success_milestones",
      eventLabel: "Buyer defines 30/60/90-day success milestones",
      eventDescription:
        "Lisa built a 12-week rollout timeline focused on deployment phases, but it does not yet include measurable success milestones — no adoption targets, no physician satisfaction benchmarks, no documentation time reduction goals. Without measurable milestones, ROI proof post-launch will be hard. Coaching: co-author the success plan in week one of CS engagement so both sides agree on the bar.",
      status: "not_yet",
      detectedAt: null,
      detectionSources: null,
      sourceReferences: null,
      evidenceSnippets: null,
      confidence: null,
      contactId: null,
      contactName: null,
    },
  ]);
  console.log("  ✓ 25 fitness events created");

  // ── Fitness scores summary ──
  await db.insert(schema.dealFitnessScores).values({
    id: "e5000001-0001-4000-8000-000000000001",
    dealId: HORIZON_DEAL_ID,
    businessFitScore: 83,
    businessFitDetected: 5,
    businessFitTotal: 6,
    emotionalFitScore: 67,
    emotionalFitDetected: 4,
    emotionalFitTotal: 6,
    technicalFitScore: 100,
    technicalFitDetected: 6,
    technicalFitTotal: 6,
    readinessFitScore: 71,
    readnessFitDetected: 5,
    readinessFitTotal: 7,
    overallFitness: 80,
    velocityTrend: "accelerating",
    lastEventAt: W8,
    daysSinceLastEvent: 2,
    fitImbalanceFlag: true, // Technical 100% vs Emotional 67% = 33-pt spread > 30
    eventsThisWeek: 3,
    eventsLastWeek: 1,
    benchmarkVsWon: {
      stage: "negotiation",
      vertical: "healthcare",
      avgFitnessAtStage: 78,
      thisDealsPosition: "above_average",
      avgBusinessFit: 75,
      avgEmotionalFit: 72,
      avgTechnicalFit: 85,
      avgReadinessFit: 68,
      wonDealCount: 12,
      insight:
        "This deal's overall fitness (80%) exceeds the average for won Healthcare deals at Negotiation stage (78%). Technical Fit is unusually strong at 100% vs 85% average. Emotional Fit at 67% is below the 72% average — won deals typically show stronger personal relationship signals by this stage.",
    },
    stakeholderEngagement: {
      totalStakeholders: 7,
      benchmark: { avgAtStage: 4.2, wonDealAvg: 5.8, position: "above_average" },
      departmentsEngaged: 5,
      departmentList: [
        "Clinical Innovation",
        "IT/Engineering",
        "Finance",
        "Operations",
        "Security",
      ],
      contactTimeline: [
        {
          contactName: "Dr. Amanda Chen",
          title: "VP Clinical Innovation",
          role: "champion",
          firstActiveWeek: 0,
          weeksActive: [0, 1, 2, 3, 4, 5, 6, 7, 8],
          callsJoined: [1, 2, 3, 4, 5],
          emailsInvolved: 7,
          introducedBy: null,
        },
        {
          contactName: "Priya Mehta",
          title: "Director of IT & Engineering",
          role: "technical_evaluator",
          firstActiveWeek: 2,
          weeksActive: [2, 3, 6],
          callsJoined: [2, 4],
          emailsInvolved: 3,
          introducedBy: "Dr. Amanda Chen",
        },
        {
          contactName: "Robert Garrison",
          title: "CFO",
          role: "economic_buyer",
          firstActiveWeek: 3,
          weeksActive: [3, 4, 8],
          callsJoined: [3, 5],
          emailsInvolved: 2,
          introducedBy: "Dr. Amanda Chen",
        },
        {
          contactName: "Lisa Huang",
          title: "VP Operations",
          role: "end_user",
          firstActiveWeek: 4,
          weeksActive: [4, 7, 8],
          callsJoined: [3, 5],
          emailsInvolved: 1,
          introducedBy: "Dr. Amanda Chen",
        },
        {
          contactName: "James Whitfield",
          title: "CISO",
          role: "blocker",
          firstActiveWeek: 5,
          weeksActive: [5, 6],
          callsJoined: [4],
          emailsInvolved: 3,
          introducedBy: "Dr. Amanda Chen",
        },
        {
          contactName: "Mark Davidson",
          title: "Director of Procurement",
          role: "end_user",
          firstActiveWeek: 8,
          weeksActive: [8],
          callsJoined: [],
          emailsInvolved: 1,
          introducedBy: "Dr. Amanda Chen",
        },
        {
          contactName: "Dr. Sarah Kim",
          title: "CMO",
          role: "coach",
          firstActiveWeek: 8,
          weeksActive: [8],
          callsJoined: [5],
          emailsInvolved: 0,
          introducedBy: "Dr. Amanda Chen",
        },
      ],
    },
    buyerMomentum: {
      responseTimeTrend: {
        dataPoints: [
          { week: 0, avgHours: 36 },
          { week: 2, avgHours: 24 },
          { week: 3, avgHours: 12 },
          { week: 4, avgHours: 8 },
          { week: 5, avgHours: 6 },
          { week: 6, avgHours: 4 },
          { week: 7, avgHours: 2 },
          { week: 8, avgHours: 0.75 },
        ],
        trend: "accelerating",
        currentAvgHours: 0.75,
        startingAvgHours: 36,
      },
      emailDirectionality: {
        totalEmails: 14,
        buyerInitiated: 10,
        sellerInitiated: 4,
        buyerInitiatedPct: 71,
        benchmark: { wonDealAvg: 55, lostDealAvg: 28 },
        insight:
          "Buyer-initiated emails at 71% — significantly above won-deal average of 55%. This buyer is driving the evaluation.",
      },
      commitmentFollowThrough: {
        totalCommitments: 8,
        fulfilled: 8,
        fulfillmentRate: 100,
        commitments: [
          {
            madeBy: "Dr. Amanda Chen",
            madeIn: "Call 1",
            week: 1,
            commitment: "Loop in IT director for technical deep dive",
            fulfilled: true,
            fulfilledHow: "Introduced Priya Mehta via email in Week 2",
            fulfilledWeek: 2,
          },
          {
            madeBy: "Priya Mehta",
            madeIn: "Call 2",
            week: 3,
            commitment: "Send architecture overview document",
            fulfilled: true,
            fulfilledHow: "Emailed architecture PDF with 8 integration questions",
            fulfilledWeek: 3,
          },
          {
            madeBy: "Dr. Amanda Chen",
            madeIn: "Call 2",
            week: 3,
            commitment: "Brief Dr. Kim on the evaluation",
            fulfilled: true,
            fulfilledHow:
              "Dr. Kim confirmed briefing in Call 5 and presented to board",
            fulfilledWeek: 8,
          },
          {
            madeBy: "Robert Garrison",
            madeIn: "Call 3",
            week: 4,
            commitment: "Revise ROI model with retention data",
            fulfilled: true,
            fulfilledHow: "Sent revised model via email with own edits",
            fulfilledWeek: 4,
          },
          {
            madeBy: "Dr. Amanda Chen",
            madeIn: "Call 3",
            week: 4,
            commitment: "Introduce CISO for security review",
            fulfilled: true,
            fulfilledHow: "Email introduction to James Whitfield in Week 5",
            fulfilledWeek: 5,
          },
          {
            madeBy: "James Whitfield",
            madeIn: "Call 4",
            week: 6,
            commitment: "Send security questionnaire",
            fulfilled: true,
            fulfilledHow: "Emailed 47-question security assessment same week",
            fulfilledWeek: 6,
          },
          {
            madeBy: "Priya Mehta",
            madeIn: "Call 4",
            week: 6,
            commitment: "Provision sandbox environment by Friday",
            fulfilled: true,
            fulfilledHow:
              "James confirmed sandbox provisioning in follow-up email",
            fulfilledWeek: 6,
          },
          {
            madeBy: "Lisa Huang",
            madeIn: "Call 3",
            week: 4,
            commitment: "Draft rollout timeline",
            fulfilled: true,
            fulfilledHow:
              "Built 12-week rollout plan, shared screen in Call 5",
            fulfilledWeek: 8,
          },
        ],
      },
    },
    conversationSignals: {
      ownershipLanguage: {
        trend: "strong_shift",
        dataPoints: [
          {
            call: 1,
            label: "Discovery",
            week: 1,
            yourProductPct: 80,
            weOurPct: 20,
            sampleQuotes: [
              "your AI solution",
              "what your product does",
              "if we were to consider this",
            ],
          },
          {
            call: 2,
            label: "Technical",
            week: 3,
            yourProductPct: 55,
            weOurPct: 45,
            sampleQuotes: [
              "how it would integrate with our systems",
              "our Epic deployment",
              "your API capabilities",
            ],
          },
          {
            call: 3,
            label: "Business Case",
            week: 4,
            yourProductPct: 35,
            weOurPct: 65,
            sampleQuotes: [
              "our ROI model",
              "when we factor in retention",
              "the business case we'd present",
            ],
          },
          {
            call: 4,
            label: "Security",
            week: 6,
            yourProductPct: 40,
            weOurPct: 60,
            sampleQuotes: [
              "your data architecture",
              "our compliance requirements",
              "how we'd handle PHI",
            ],
          },
          {
            call: 5,
            label: "Exec Alignment",
            week: 8,
            yourProductPct: 12,
            weOurPct: 88,
            sampleQuotes: [
              "when we implement this",
              "our go-live target",
              "our partnership",
              "the way we see this working",
            ],
          },
        ],
        insight:
          "Ownership language shifted from 20% to 88% over 5 calls. By Call 5, Amanda and the team spoke about Claude Enterprise as if they already owned it.",
      },
      sentimentProfile: {
        type: "healthy_skepticism",
        description:
          "This deal shows a productive pattern: the buyer challenges assumptions directly (Robert adjusting ROI from 30% to 20%, James testing security rigor) rather than offering empty enthusiasm. Deals with this profile close at higher rates than deals with uniformly positive sentiment, which often masks disengagement.",
        keyMoments: [
          {
            call: 3,
            speaker: "Robert Garrison",
            moment: "Challenged productivity assumption from 30% to 20%",
            signal: "positive",
            why:
              "CFO who challenges your model and then edits it with his own data is a CFO who will defend it internally",
          },
          {
            call: 4,
            speaker: "James Whitfield",
            moment: "Opened with skepticism about AI vendors",
            signal: "positive",
            why:
              "CISO who tests you hard and ends impressed creates a stronger security gate clearance than one who rubber-stamps",
          },
          {
            call: 5,
            speaker: "Dr. Amanda Chen",
            moment:
              "Proactively resolved legal as the last internal gate",
            signal: "strong_positive",
            why:
              "Champion removing blockers without being asked is the strongest internal advocacy signal",
          },
        ],
      },
      dealInsight:
        "This deal exhibits three signals that correlate with 85%+ close probability in enterprise Healthcare deals: (1) 100% buyer commitment follow-through over 8 weeks, (2) ownership language at 88% in the final call, and (3) economic buyer co-creating the business case rather than passively reviewing it. The primary risk is Readiness Fit — no day-to-day program owner has been identified, and the rollout plan lacks measurable success milestones. Recommendation: In the next conversation, ask Amanda directly who will own the program post-launch and what success looks like at 30/60/90 days.",
    },
  });
  console.log("  ✓ Fitness scores summary created (with stakeholder/momentum/signals)");

  console.log("\n✅ Horizon Health Partners seed complete!");
  console.log("   Company: 1");
  console.log("   Contacts: 7");
  console.log("   Deal: 1 ($1.8M, Negotiation)");
  console.log("   MEDDPICC: 1");
  console.log("   Milestones: 9");
  console.log("   Transcripts: 5");
  console.log("   Email activities: 14");
  console.log("   Fitness events: 25 (20 detected, 5 not_yet)");
  console.log("   Fitness scores: 1");

  await client.end();
  process.exit(0);
}

seedDealFitness().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

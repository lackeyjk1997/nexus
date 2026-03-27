# Discovery Call Transcript — MedCore Health Systems
## Claude API for Clinical Documentation

**Date:** March 14, 2026
**Duration:** 28 minutes
**Participants:**
- Sarah Chen (Anthropic, Mid-Market AE — Healthcare)
- Dr. Raj Patel (MedCore Health Systems, VP of Engineering)
- Karen Liu (MedCore Health Systems, Director of Clinical Informatics)

---

**Sarah Chen:** Thanks for making the time today, Raj and Karen. I know you're both pulled in a lot of directions. Before we dive in, I'd love to understand what prompted the conversation — what's happening at MedCore that made evaluating Claude a priority right now?

**Dr. Raj Patel:** Sure. So MedCore operates twelve outpatient facilities across the Southeast. We have about 1,200 employees, roughly 340 of those are clinicians. The biggest pain point we're hearing from our clinical staff — and this has been consistent for the last eighteen months — is documentation burden. Our physicians are spending, on average, two hours per day on clinical notes after patient visits. That's time they're not seeing patients, and frankly, it's a burnout driver. We lost four physicians last year and exit interviews all mentioned documentation load.

**Sarah Chen:** That's significant. Two hours per day across 340 clinicians — that's a massive amount of time. Karen, is that consistent with what you're seeing from the informatics side?

**Karen Liu:** It is, and it's actually worse in some specialties. Our cardiologists and neurologists are closer to three hours because of the complexity of their notes. We've been looking at AI-assisted documentation for about six months now. We did a small pilot with GPT-4 through Azure OpenAI back in October, and the results were... mixed.

**Sarah Chen:** Tell me more about that. What worked and what didn't?

**Karen Liu:** The summarization quality was decent for straightforward encounters. But we ran into three problems. First, accuracy on medical terminology — it would hallucinate drug interactions that didn't exist, which is obviously a non-starter in clinical settings. Second, the output format didn't match our EHR templates. We use Epic, and the notes need to conform to specific structured formats for billing and compliance. Third — and this was the dealbreaker — the Azure deployment didn't meet our security team's requirements for PHI handling. We couldn't get comfortable with how patient data was being processed.

**Dr. Raj Patel:** And that last point is really the gate. We're a HIPAA-covered entity. Any AI solution that touches patient data needs a BAA in place, and we need to be confident that patient information isn't being used to train models or retained beyond the processing window. Our Chief Compliance Officer, Dr. Amanda Torres, has been very clear about that.

**Sarah Chen:** That makes complete sense, and I appreciate you being direct about the security requirements because that's actually where Claude's architecture is fundamentally different. Let me ask — when you say the Azure deployment didn't meet your security requirements, was that specifically around data residency, model training, or both?

**Dr. Raj Patel:** Both. We couldn't get a clear answer on whether conversation data was being used for model improvement, and the data residency story was vague. Our compliance team needs specificity.

**Sarah Chen:** Got it. So Claude's API has a zero data retention option — we don't train on any API inputs or outputs, and we can contractually commit to that through a BAA. We have HIPAA-compliant deployment options specifically designed for healthcare organizations like MedCore. I'll make sure our SA, David Kim, walks through the full security architecture with your compliance team — he works with healthcare orgs on this every week. Would Dr. Torres need to be in that conversation?

**Dr. Raj Patel:** Absolutely. Amanda would need to sign off before we could move to any kind of technical evaluation. Can we get that scheduled in the next two weeks?

**Sarah Chen:** Definitely. I'll coordinate with David to find a time that works. Karen, let me come back to the clinical workflow side. If you could wave a magic wand, what does the ideal documentation solution look like for MedCore?

**Karen Liu:** In a perfect world, the clinician finishes a patient encounter, dictates or types a brief summary, and the AI generates a complete note in the correct Epic template format — SOAP notes for primary care, procedure notes for specialists, discharge summaries for our urgent care facilities. The physician reviews it, makes minor edits, and signs off. We'd want it to pull in relevant patient history from the EHR context, flag any potential drug interactions from the actual medication list, and conform to CMS documentation requirements for billing.

**Sarah Chen:** And what does success look like in terms of metrics? If we could reduce that two-hour documentation burden, what's the target?

**Dr. Raj Patel:** If we could get it under 45 minutes, that would be transformational. That's an hour and fifteen minutes back per clinician per day. Multiply that across 340 clinicians — you're looking at 425 additional patient-hours per day across our system. At our average reimbursement rate, that's roughly $850K in additional annual revenue capacity. Plus the retention impact — if we can reduce burnout-driven turnover even partially, the ROI is substantial. Replacing a single physician costs us between $500K and $1M when you factor in recruiting, credentialing, and ramp-up time.

**Sarah Chen:** Those are compelling numbers. Let me make sure I understand the full picture. You've got 340 clinicians across twelve facilities, documentation burden of two-plus hours daily, a failed GPT-4 pilot due to accuracy and security concerns, Epic as your EHR, and a hard requirement for HIPAA compliance with a BAA. The success metric is getting documentation time under 45 minutes, with the revenue upside being $850K annually plus retention savings. Is there anything I'm missing?

**Karen Liu:** One thing — timeline matters. We're presenting our 2027 clinical technology roadmap to the board in August. If we're going to include AI-assisted documentation as a funded initiative, we need to have completed a proof of concept by July so we have real data to present. That gives us roughly four months.

**Sarah Chen:** That's helpful to know. A typical POC with our healthcare customers runs six to eight weeks, so a May kickoff would align well with your August board presentation. In terms of budget, has there been any preliminary sizing for this initiative?

**Dr. Raj Patel:** We have $400K allocated in our 2026 innovation budget for AI initiatives, but that's not all earmarked for documentation. We're also looking at AI for claims processing and patient scheduling. Realistically, we could dedicate $250K to $300K for the documentation solution in year one, with expansion budget available if the POC demonstrates clear ROI.

**Sarah Chen:** That's very helpful. And in terms of the decision process — once David walks through the security architecture with Dr. Torres and the compliance team, and assuming that goes well, what are the steps from there to getting a POC in the ground?

**Dr. Raj Patel:** If compliance gives the green light, Karen and I would define the POC scope — probably starting with primary care across two or three facilities. We'd need sign-off from our CMO, Dr. Brian Walsh, on the clinical workflow design. Then it goes to procurement for contract review. Procurement typically takes three to four weeks once they have a statement of work.

**Karen Liu:** And I'd want to involve our Epic integration team early. We have a contract with Capgemini for our EHR customization work, so they'd need to be looped in on the integration approach.

**Sarah Chen:** Perfect. So the stakeholder map is you two, Dr. Torres on compliance, Dr. Walsh as CMO for clinical sign-off, and procurement. Plus Capgemini on the integration side. Is there anyone else who could influence or block the decision?

**Dr. Raj Patel:** Our CFO, Michael Chen, would need to approve anything over $200K. But if we can show the revenue capacity numbers and the retention impact, I don't anticipate pushback. He's been vocal about wanting to see AI ROI across the organization.

**Sarah Chen:** Great. Here's what I'd suggest for next steps. First, I'll get David Kim connected with your team and Dr. Torres for the security deep-dive — ideally within the next two weeks. Second, I'll put together a preliminary POC proposal that outlines scope, timeline, and expected outcomes based on what you've shared today. Third, I'd love to share a case study from a similar healthcare system that deployed Claude for clinical documentation — they saw a 68% reduction in documentation time within the first six weeks. Would that be helpful?

**Dr. Raj Patel:** Absolutely. If you have a reference customer we could speak with directly, that would carry a lot of weight with our CMO.

**Sarah Chen:** I'll check on a direct reference — we have a couple of health systems in a similar profile that have offered to speak with prospective customers. Karen, anything else from your side?

**Karen Liu:** Just one question — can Claude handle the Epic FHIR API integration natively, or would that require custom development on our side?

**Sarah Chen:** Great question. David can go deep on that in the technical session, but the short answer is we have several customers running Claude with Epic through FHIR, and our forward-deployed engineering team can support the integration design. It's not a custom build from scratch — there's a proven pattern.

**Dr. Raj Patel:** This has been really productive, Sarah. I feel like you understand our situation well. Let's get that security session on the calendar and go from there.

**Sarah Chen:** Absolutely. I'll send over a summary of today's conversation along with the case study and POC outline by end of week. Thanks for the time, both of you — I'm excited about the potential here.

**Karen Liu:** Thanks, Sarah. Looking forward to the next steps.

---

*[Call ends]*

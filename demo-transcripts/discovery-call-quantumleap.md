# Discovery Call Transcript — QuantumLeap Software
## Claude Enterprise Replacing In-House LLM

**Date:** March 11, 2026
**Duration:** 31 minutes
**Participants:**
- Priya Sharma (Anthropic, Mid-Market AE — Technology)
- Alex Drummond (QuantumLeap Software, VP of AI/ML)
- Yuki Tanaka (QuantumLeap Software, Senior Director of Engineering)

---

**Priya Sharma:** Alex, Yuki — great to connect. I understand QuantumLeap has been running an in-house LLM for some of your product features. I'd love to understand what's working, what's not, and what brought you to exploring external options.

**Alex Drummond:** Yeah, happy to get into it. So QuantumLeap is a developer tools company — we make IDE plugins and code analysis platforms. About 1,600 employees, and we've been building AI features into our products for the last two years. We initially fine-tuned an open-source model — started with LLaMA, moved to Mistral — and we've been running it on our own GPU infrastructure.

**Priya Sharma:** Got it. And what's driving the conversation about potentially moving away from that approach?

**Alex Drummond:** Cost and capability gap, honestly. We have a six-person ML team maintaining this infrastructure. GPU costs are running about $45K per month on AWS. And despite all that investment, the quality of our code analysis features is falling behind competitors who are using frontier models. Our churn data is showing it — we lost 340 enterprise seats last quarter, and in exit surveys, 60% cited "AI feature quality" as a factor.

**Yuki Tanaka:** I can add some technical context. We're running Mistral on eight A100s. The model handles basic code completion and simple refactoring suggestions well enough. But for the features our customers actually care about — complex code review with architectural suggestions, security vulnerability detection with remediation guidance, multi-file refactoring across large codebases — our fine-tuned model just can't match what Claude or GPT-4 produce. We've benchmarked internally, and Claude Sonnet scores 40% higher on our code review evaluation suite than our current model.

**Priya Sharma:** A 40% quality improvement is substantial, especially when you're already seeing churn tied to feature quality. Tell me more about the competitive landscape — who are your customers leaving for?

**Alex Drummond:** Mostly for tools that are already using Claude or GPT-4 under the hood. Cursor has been eating our lunch in the IDE space. Our enterprise customers — we're talking engineering teams at companies with 500 to 5,000 developers — they're comparing our AI features side-by-side with competitors every quarter. When the gap is visible, the procurement decision is easy for them.

**Priya Sharma:** Makes sense. So the strategic question is really: continue investing in an in-house model that's falling behind, or redirect that investment toward building better product experiences on top of a frontier model?

**Alex Drummond:** Exactly. And it's not just the quality gap. My six-person ML team is spending 80% of their time on infrastructure — model serving, GPU optimization, fine-tuning pipelines, monitoring. Only 20% of their time goes toward actually building features. If we move to Claude's API, those six engineers can flip that ratio. They become a product feature team, not an infrastructure team.

**Priya Sharma:** That's a significant unlock. Yuki, what does the technical migration look like from your perspective? What are the concerns?

**Yuki Tanaka:** A few things. Latency is critical for IDE features — code completion needs to be sub-200ms. We're currently at around 150ms because we're running on dedicated GPUs. I need to understand what Claude's API latency looks like for our use case. Second, we process about 2 million API calls per day across our user base. That's significant volume, and I need to understand the rate limits and pricing at that scale. Third, we have custom fine-tuning on our current model for specific programming languages and frameworks that our enterprise customers use. I need to know how we maintain that specialization with Claude — whether that's through prompt engineering, few-shot examples, or if Anthropic offers fine-tuning.

**Priya Sharma:** All great questions. On latency — Claude Haiku is specifically designed for speed-critical use cases like code completion. Our enterprise customers in developer tools are typically seeing sub-100ms response times for short completions. For the more complex features — code review, security analysis — you'd use Sonnet, which is closer to 500ms to 1 second, but those aren't latency-critical in the same way. On volume — 2 million calls per day is well within our enterprise tier capacity. We can set up dedicated throughput if needed. I'd want to connect you with our solutions architect, Rachel Torres, to go deep on the architecture and pricing model at your scale.

**Yuki Tanaka:** That latency profile actually works well for our product architecture. The completion features need speed, and the analysis features can tolerate a second or two.

**Priya Sharma:** On the specialization question — most of our developer tools customers get the specialization they need through system prompts and well-structured context windows rather than fine-tuning. Claude is already very strong on code across major languages. But if there are specific domains where you need customization, we can discuss options. Rachel can benchmark your specific evaluation suite against Claude out of the box to see where the gaps are, if any.

**Alex Drummond:** Let's talk money. We're spending $45K per month on GPU infrastructure, plus the fully-loaded cost of six ML engineers — call it $150K per month when you include salaries, benefits, and management overhead. So our total AI cost is roughly $195K per month, or $2.3 million annually. If we move to Claude, I'd want to redirect the GPU savings and at least two of those ML engineering roles toward product development. The remaining four engineers would focus on building features on top of Claude's API.

**Priya Sharma:** So you're looking at replacing $2.3 million in annual infrastructure and team cost with an API spend that would need to come in well under that to make the business case work. At 2 million calls per day, depending on the token volume per call, you're likely looking at $500K to $800K annually for Claude API usage. That would free up roughly $1.5 million to redirect toward product development.

**Alex Drummond:** That math works. If the quality is 40% better and we're saving $1.5 million, the ROI story writes itself. My CEO, Raj Malhotra, is already bought into the "build on foundations, don't build foundations" philosophy. He's been pushing for this move for months.

**Priya Sharma:** That's great that you have executive alignment. What's the decision process from here?

**Alex Drummond:** Raj and I are aligned. Yuki needs to validate the technical migration path. Our VP of Product, Lisa Chang, needs to see a product roadmap that shows how Claude enables features we can't build with our current model. And our legal team needs to review the API terms — specifically around whether our customers' code that passes through Claude is protected.

**Yuki Tanaka:** I'd also want to run a parallel deployment for two weeks — our current model and Claude side by side — and let our internal QA team blind-evaluate the outputs. If Claude matches or beats our model on every category in that evaluation, I'm sold.

**Priya Sharma:** That's a fair approach. Here's what I'd suggest: let me get Rachel on a technical deep-dive with Yuki within the next week to design the parallel evaluation. I'll put together a business case document that Raj and your CFO can review — total cost comparison, feature velocity unlock, competitive positioning impact. And I'll send over our enterprise API terms with specific language around customer code protection for your legal team. Sound good?

**Alex Drummond:** Sounds great. One more thing — timing. We're releasing our next major version in September. If we're going to ship Claude-powered features in that release, we need to start the integration work by June. That means we need to make the go/no-go decision by mid-May.

**Priya Sharma:** That gives us about six weeks to get through evaluation and contracting. Aggressive but doable if we move quickly on the technical validation. I'll have Rachel reach out to Yuki by end of week to kick off the parallel eval. Thanks, both — this is exactly the kind of partnership where Claude delivers the most impact.

**Yuki Tanaka:** Looking forward to the eval. Thanks, Priya.

**Alex Drummond:** Great call. Talk soon.

---

*[Call ends]*

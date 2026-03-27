# Discovery Call Transcript — Atlas Capital Partners
## Claude Enterprise for Compliance Document Analysis

**Date:** March 7, 2026
**Duration:** 34 minutes
**Participants:**
- Sarah Chen (Anthropic, Mid-Market AE — Financial Services)
- James Whitfield (Atlas Capital Partners, CTO)
- Natasha Okonkwo (Atlas Capital Partners, Head of Compliance Technology)

---

**Sarah Chen:** James, Natasha — thanks for carving out time. I saw your team signed up for Claude Team about three months ago. Before we talk about what an enterprise deployment could look like, I'd love to understand how things have been going and what's driving the conversation about scaling up.

**James Whitfield:** Yeah, so we have about eighteen people on the Claude Team plan right now — mostly our compliance analysts and a few of the quant research folks. The adoption has been... honestly, faster than I expected. The compliance team in particular has basically made Claude part of their daily workflow for reviewing regulatory filings.

**Sarah Chen:** That's great to hear. Natasha, what does that workflow look like day to day?

**Natasha Okonkwo:** So we're an SEC-registered investment advisor. We manage about $4.2 billion in assets across institutional and high-net-worth clients. My team of twelve analysts is responsible for reviewing every piece of client communication for compliance — emails, marketing materials, investor reports, trade rationale documentation. Before Claude, each analyst could review maybe 40 to 50 documents per day. With Claude Team, they're reviewing 120 to 150. The accuracy has been impressive — it catches things my senior analysts miss. Subtle disclosure language issues, consistency problems across documents, references to performance figures that need specific disclaimers.

**Sarah Chen:** A 3x throughput increase is significant. So what's the limitation that's pushing you toward Enterprise?

**James Whitfield:** A few things. First, we're hitting the usage limits on Team. Our heaviest users are burning through their allocation by Wednesday each week. Second — and this is the bigger issue — we need SSO integration. Our CISO won't let us expand beyond the current eighteen users without SAML-based SSO through our Okta instance. It's a hard policy. Third, we want to use the API to build internal tools. Natasha's team has a vision for an automated pre-trade compliance check that would flag potential issues before trades execute, not after. That requires API access with the right data handling guarantees.

**Sarah Chen:** Makes sense. Natasha, tell me more about the pre-trade compliance vision. That sounds like it could be transformative.

**Natasha Okonkwo:** It would be. Right now, our compliance review is post-trade. An analyst reviews the trade rationale documentation after the trade has already been executed. If there's an issue — a concentration violation, a restricted security, a deviation from the investment mandate — we're in remediation mode. It's costly and it's stressful. What I want to build is a system where the portfolio manager inputs their trade rationale into our order management system, and Claude analyzes it in real-time against the client's investment policy statement, our restricted list, and regulatory requirements. Green light means the trade proceeds automatically. Yellow or red means it gets routed to a compliance analyst for human review before execution.

**Sarah Chen:** That's a compelling use case. What's the volume we're talking about?

**Natasha Okonkwo:** We execute roughly 800 to 1,200 trades per day across all strategies. Each trade has an associated rationale document that ranges from a paragraph to two pages. So we're looking at significant API throughput.

**James Whitfield:** And that's actually where the competitive conversation comes in. We've been talking to a company called Cohere about their enterprise offering. Their pitch is that they can deploy a model on our infrastructure — fully on-prem — which appeals to our CISO. But the quality gap is noticeable. We ran a blind evaluation last month where we had both Claude and Cohere's model review the same set of 200 compliance documents. Claude caught 94% of the issues our senior analysts identified. Cohere was at 76%.

**Sarah Chen:** That's an 18-point accuracy gap on a use case where accuracy is literally the product. Can I ask — what's driving the on-prem appeal? Is it a data residency requirement, a regulatory mandate, or more of a security comfort level preference?

**James Whitfield:** It's mostly comfort level. Our CISO, Robert Huang, comes from a traditional infrastructure background. The idea of sending client data to an external API makes him nervous. But I've been pushing back on that because on-prem means we own the model hosting, the scaling, the maintenance — and frankly, we don't have the ML infrastructure team for that.

**Natasha Okonkwo:** And the accuracy difference isn't trivial. In compliance, a missed violation can mean SEC enforcement action. We're not going to sacrifice 18 points of accuracy for deployment topology preferences.

**Sarah Chen:** That's exactly the right way to frame it. Let me address the security concern directly because it's the most common objection we hear in financial services. Claude's Enterprise plan includes SOC 2 Type II certification, and we offer a zero data retention API option where your data is never stored or used for training. We can provide a DPA that addresses SEC Rule 206(4)-7 requirements specifically. I'd suggest we get David Kim, our solutions architect who specializes in financial services, on a call with Robert to walk through the security architecture in detail. David has done this with a dozen RIAs and broker-dealers — he speaks the language.

**James Whitfield:** That would help. Robert respects technical depth. If your SA can go architecture-diagram-deep with him, that's the fastest path to getting him comfortable.

**Sarah Chen:** Consider it done. Now, in terms of budget and timeline — what are you thinking?

**James Whitfield:** We're looking at $400K to $600K annually for the enterprise deployment. That covers the API usage for pre-trade compliance, the Team-to-Enterprise upgrade for the existing eighteen users, and room to expand to maybe 40 or 50 users across the firm — including our research analysts and client reporting team. My CFO, Diana Park, has already approved the budget range. The question is whether we go with Claude or Cohere.

**Sarah Chen:** And what would tip the decision definitively?

**Natasha Okonkwo:** Three things. One, Robert signs off on security. Two, we need to see Claude handle our specific compliance scenarios — not generic demos, but our actual IPS templates, our restricted list format, our regulatory framework. Three, pricing needs to be competitive. Cohere quoted us $380K for the on-prem deployment.

**Sarah Chen:** Understood. Here's what I'd propose. We set up the security deep-dive with David and Robert within the next ten days. In parallel, I'll work with Natasha's team to design a two-week proof of concept using your actual compliance documents — we'll process a representative sample through Claude and benchmark accuracy against your senior analysts and against the Cohere results you already have. And I'll come back with pricing that reflects the full scope you've described. Does that work?

**James Whitfield:** That works. Let's get it moving. We want to make a decision by end of April so we can start the API integration build in Q2.

**Sarah Chen:** Perfect. I'll send a recap and proposed timeline by end of day tomorrow. Natasha, can you start pulling together a sample document set for the POC? Fifty to a hundred documents across different compliance categories would be ideal.

**Natasha Okonkwo:** I can have that ready within a week.

**Sarah Chen:** Great. Thanks, both. This is exactly the kind of deployment where Claude shines — high-stakes accuracy requirements where the cost of being wrong is orders of magnitude higher than the cost of the tool.

**James Whitfield:** Agreed. Talk soon, Sarah.

---

*[Call ends]*

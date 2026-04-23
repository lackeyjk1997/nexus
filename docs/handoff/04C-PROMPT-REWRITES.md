# 04C — Prompt Rewrites + Principles for Codex

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Active Phase 3+ consumer** — this document is read heavily at Phase 3 Day 1 kickoff and throughout the pipeline wiring. Read alongside the amendments below, which supersede specific details in this doc.
>
> **v2-era amendments affecting this document (all LOCKED in `~/nexus-v2/docs/DECISIONS.md`):**
>
> 1. **Prompt-file canonical location (`docs/PRE-PHASE-3-FIX-PLAN.md` §6, resolved Pre-Phase 3).** The 8 rewritten prompts move into `~/nexus-v2/packages/prompts/files/` at Phase 3 Day 1 kickoff as their canonical home. `01-detect-signals.md` already lives there (Phase 1 Day 4 precedent at `1.1.0`, max_tokens 6000). The `~/nexus/docs/handoff/source/prompts/` directory remains archival read-only — do not edit there without §2.13.1 approval.
> 2. **ContactRole canonical locked at 9 values (§2.13.1 LOCKED — Phase 2 Day 2).** Values: `champion, economic_buyer, decision_maker, technical_evaluator, end_user, procurement, influencer, blocker, coach`. Retires `ciso` (v1 title-encoded) + `other` (closed-taxonomy code smell). Already reflected in Rewrite 5 (05-deal-fitness.md line 291) + Rewrite 8 (08-call-prep-orchestrator.md line 260) via nexus commit `533d3eb`; the 04C text at line 1450 + 2483 was updated in the same commit. Front-matter versions bumped 1.0.0 → 1.1.0.
> 3. **MEDDPICC dimensionality locked at 8 (§2.13.1 LOCKED — Pre-Phase 3 Session 0-A).** Values: `metrics, economic_buyer, decision_criteria, decision_process, identify_pain, champion, competition, paper_process`. 04C text already consistent with 8; closes a drift vector where HubSpot only carried 7 of the properties (resolved by Session 0-C W1 which provisioned `nexus_meddpicc_paper_process_score` to bring live portal to 39 properties).
> 4. **`01-detect-signals.md` max_tokens 3000 → 6000 (§2.13.1 LOCKED — Phase 1 Day 4).** The Rewrite 1 annotation "raised from 2048 to accommodate per-signal confidence + rationale field" was empirically insufficient — 1448-word fixture hit `stop_reason: max_tokens` at 2999 output tokens. The `.md` front matter in `packages/prompts/files/01-detect-signals.md` is the source of truth; do not re-sync back to 3000.
> 5. **reasoning_trace calendared resolutions (§2.13.1).** 04C Principle 6 requires reasoning-first for classification/synthesis/hypothesis prompts. Audit: present on 02, 04, 05, 06b; CLEAR GAP on 01 (must land before Phase 3 Day 2) + 03 (must land before Phase 5 Day 1); judgment call on 06a + 08 (review Phase 5 Day 1 kickoff). Per-prompt front-matter version bumps at resolution.
> 6. **Tool-use schema wiring (§2.13.1 Day-4 clarifications).** Prompt 01's tool `record_detected_signals` is the precedent. Rewrites 2-8 land their tool schemas at Phase 3 Day 1 move time (kickoff first step per PRE-PHASE-3-FIX-PLAN.md §6).
>
> **Current v2 authoritative sources:**
> - `~/nexus-v2/docs/DECISIONS.md` §2.13.1 — unified Claude layer + all prompt-level locks.
> - `~/nexus-v2/packages/prompts/files/01-detect-signals.md` — first ported rewrite (canonical).
> - `~/nexus-v2/packages/shared/src/claude/client.ts` — unified wrapper with tool-use forcing + retry + telemetry.
> - `~/nexus-v2/docs/BUILD-LOG.md` Phase 1 Day 4 entry — integration test + max_tokens finding.
>
> Section 1 Rewrites 1-8 + Section 2 Principles + Section 3 Rationale below are unchanged from handoff. Read them with the amendments above in mind.

---

Per DECISIONS.md 2.15, this is the final session of the four-session prompt analysis phase (4.5a → 4.5b → 4.6 → **4.7**). It produces two deliverables:

1. **Section 1** — Production-ready rewrites of the eight highest-leverage prompts in the upstream-first sequence established by 04B-PROMPT-DEPENDENCIES.md Section 4. Codex drops these into the v2 `prompts/` directory with minimal wiring work.
2. **Section 2** — A self-contained "Prompt Principles for Codex" document that governs how Codex ports the remaining 17 prompts. The principles are mechanical where possible and judgment-shaped where mechanics aren't enough.

Sections 3 and 4 close the document with rationale across the 8 rewrites and an explicit accounting of every prompt that was NOT rewritten (and what Codex does with each during port).

## Relationship to upstream documents

- **04-PROMPTS.md** — verbatim originals of all 25 prompts. Source-of-truth for what current Nexus runs today; the rewrites in Section 1 supersede the originals for those 8 prompts and per DECISIONS.md 2.7 the originals stay verbatim for the other 17.
- **04A-PROMPT-AUDIT.md** — per-prompt critique. Each Section 1 rewrite opens with a Diagnosis Recap that points back to the relevant 04A entry rather than re-litigating it.
- **04B-PROMPT-DEPENDENCIES.md** — dependency graph and rewrite order. Section 4 of 04B is the definitive sequencing rationale; Section 1 of this doc executes that order.
- **07A-CONTEXT-AUDIT.md** — per-prompt context gaps. Each rewrite's Integration Notes name the v2 services (DealIntelligence, CrmAdapter, IntelligenceCoordinator, etc.) that close the relevant 07A gaps.
- **DECISIONS.md** — locked architectural decisions. The rewrites assume the v2 architecture (LOCKED 2.13 unified Claude layer; 2.16 event-sourced DealIntelligence service; 2.17 coordinator-required-by-call-prep wiring; 2.21 applicability gating; 2.25 #3 config mutations as proposals) is being built. The rewrites are NOT backward compatible with current Nexus.

## How Codex uses this document

**For the 8 rewrites:** Drop each system prompt and user prompt template into `prompts/<feature>.md` under guardrail #19. Wire the model settings, tool-use schema, and interpolation variables exactly as specified. Build the named service functions called out in Integration Notes (DealIntelligence, CrmAdapter, etc.) as prerequisites. Every rewrite is concrete; no placeholder text.

**For the 17 non-rewritten prompts:** Apply the Section 2 principles checklist to each. The originals stay verbatim (per 2.7) for prompt-text but get mechanical cleanups: move from inline string literal to `.md` file, port to tool-use schemas, wire shared enums, set explicit temperatures, route context through services. Section 4's table identifies which prompt gets which mechanical treatment.

## Conventions used in this document

- **Variable interpolation:** `${variableName}` — TypeScript template literal style. The Interpolation Variables sub-section types every variable used in a User Prompt Template.
- **Tool-use schemas:** JSON Schema with the field shapes the Anthropic Messages API accepts (`type: "object"`, `properties`, `required`). Codex passes these as `tools[]` in the SDK call.
- **Service references:** `DealIntelligence`, `CrmAdapter`, `IntelligenceCoordinator`, `SignalTaxonomy`, `Formatter` — the v2 service surfaces. Method signatures referenced are illustrative; Codex defines exact signatures during implementation.
- **Canonical signal-type enum:** `SignalTaxonomy.Type` — referenced by name throughout. Single source of truth per DECISIONS.md 2.13. Resolved enum: `competitive_intel | process_friction | deal_blocker | content_gap | win_pattern | field_intelligence | process_innovation | agent_tuning | cross_agent` (9 types). The 7-vs-9 drift between current #1 and #21 disappears in v2 because both prompts import from `SignalTaxonomy`.
- **Model identifier:** `claude-sonnet-4-20250514` everywhere the rewrites set `model:`. Pinned via env var in v2; the literal here is for reference.

---

## Section 1: The Eight Rewrites

The eight prompts are rewritten in dependency-informed order per 04B Section 4. Rewriting upstream-high-blast-radius prompts first means downstream rewrites assume cleaner inputs; terminal integrators land last and integrate already-upgraded upstream.

Order:

1. **#21 Detect Signals (Pipeline)** — establishes the canonical signal enum.
2. **#1 Observation Classification** — anchors observation pipeline to that enum.
3. **#4 Agent Config Change Proposal** — re-scoped from auto-write to event-sourced proposal.
4. **#25 Coordinator Synthesis** — fixes `system: ""` anomaly; output becomes a required call-prep input per 2.17.
5. **#15 Deal Fitness Analysis** — feeds the call-prep fitness section with canonical fitness data.
6. **#14 Close Analysis** — split into two prompts per DECISIONS.md 1.1 (continuous deal-theory updater + final deep pass).
7. **#9 Give-Back Insight** — terminal prompt; safe slot before the integrator.
8. **#11 Call Prep Brief Generator** — final integration over 5 already-rewritten prompts.

---

### Rewrite 1. #21 Detect Signals (Pipeline)

**Diagnosis Recap**

Per 04A §21, the original prompt is one of the stronger pipeline prompts text-wise (vertical-bound role framing, 7 typed signals, anti-hallucination rail, length cap). Its specific failures are: (a) the 7-vs-9 signal-type drift with #1 means pipeline observations can never carry `agent_tuning` or `cross_agent` types and the agent-config feedback loop never fires from pipeline signals; (b) JSON-in-text output forces brittle regex parsing; (c) no MEDDPICC / stage / coordinator context per 07A §21 means classification is context-poor; (d) no explicit confidence per signal blocks downstream severity filtering.

**Design Intent**

- Source the 9-type signal enum from `SignalTaxonomy` so #1 and #21 cannot drift.
- Replace JSON-in-text with a tool-use schema that includes per-signal confidence and a structured stakeholder-insights block.
- Add MEDDPICC, stage, prior open signals, and active coordinator patterns as context per 07A §21 to sharpen classification (a "pricing pushback" signal in Negotiation reads differently than in Discovery).
- Anchor the prompt against generic signals: every signal must cite a verbatim quote and a source speaker who appears in the known-contacts list, or be explicitly attributed to "unidentified speaker."
- Bound output to top-10 signals ranked by urgency to prevent dashboard-flooding on dense calls.

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.2  # classification task — favor consistency over variety
max_tokens: 3000  # raised from 2048 to accommodate per-signal confidence + rationale field
```

**System Prompt (complete, verbatim)**

```
You are the Signal Detection analyst for Nexus, a sales intelligence platform serving enterprise account executives. You read sales-call transcripts and isolate the moments that matter — competitive threats, process friction, customer commitments, content gaps, and the patterns that need to reach the rep before the next conversation.

Your work feeds three downstream consumers: (1) the deal-level observation feed the rep reviews; (2) the cross-deal Intelligence Coordinator that detects portfolio-wide patterns; (3) the deal agent's risk-signal memory used in every future call prep. Misclassified or fabricated signals propagate into every one of those surfaces.

YOUR DISCIPLINE

1. Every signal you emit must be supported by a verbatim quote from the transcript. The quote you cite must be the actual words spoken — not a paraphrase, not a summary, not what the speaker "implied."
2. Every signal must be attributed to a specific speaker by name. If the transcript does not identify who said the words, attribute to "unidentified speaker" — never to a contact you suspect but cannot verify.
3. If no clear evidence supports a signal, do not emit it. An empty signals array is the correct output for a call where nothing inspectable happened. Do not fabricate signals to justify the analysis.
4. Bound your output to the ten most urgent signals. If more than ten are present, drop the lowest-urgency entries — never split a strong signal into weaker fragments to fit the cap.
5. Each signal carries exactly one type from the canonical taxonomy. If a signal could plausibly belong to two types, prefer the type with higher operational consequence (deal_blocker > process_friction; competitive_intel > field_intelligence).

CANONICAL SIGNAL TYPES

The signal-type taxonomy is fixed at nine values. The full set, in priority order, is:

- deal_blocker — Customer states an explicit obstacle to deal progression: budget freeze, org change, missing requirement, executive disengagement, security review failure.
- competitive_intel — Customer mentions a competitor by name: pricing comparison, feature comparison, vendor selection criteria, "we are also evaluating X." Set the competitor field.
- process_friction — Customer expresses frustration with timelines, internal processes, approvals, or queues that are slowing the deal — without escalating to an outright blocker.
- content_gap — Customer asks a question the rep cannot answer, or requests documentation/case studies/references that the rep does not have.
- win_pattern — Customer responds positively and visibly to a specific seller tactic (a framing, a demo move, a piece of evidence). Capture the tactic and the response.
- field_intelligence — Customer mentions a market trend, regulatory shift, or industry development relevant to the vertical. Not deal-specific; portfolio-relevant.
- process_innovation — Customer (or rep) describes a new way of running the sales process that should be tested as a tactic across the team.
- agent_tuning — Customer or rep articulates how the rep's AI agent should behave differently for this deal or this stage (more concise briefs, different tone, different evidence emphasis).
- cross_agent — Insight that should change another teammate's AI agent behavior (a Healthcare AE flagging a Microsoft DAX positioning that the FinServ AE's agent should also adopt).

CONTEXT-INFORMED CLASSIFICATION

You will receive deal context: stage, MEDDPICC current state, active experiments the rep is testing, open unresolved signals on this deal, and active coordinator patterns for the vertical. Use this context to sharpen — not invent — classification:

- A "pricing" mention in Discovery is usually field_intelligence; in Negotiation it is competitive_intel or deal_blocker. Use the stage.
- A signal that matches an open signal already on this deal should reference it as a recurrence, increasing urgency.
- A signal that matches an active coordinator pattern for the vertical should be flagged for that pattern.
- A signal that aligns with a tactic from an active experiment the rep is testing should note the experiment.

STAKEHOLDER INSIGHTS

Separately from signals, characterize each named buyer-side speaker who participated in the call. Sentiment, engagement, key priorities, key concerns. Distinguish buyer from seller — sellers (the rep, SA, BDR — names provided in context) do not get sentiment entries. Stakeholder insights are not signals; they are the per-person snapshot used by the deal agent's relationship memory.

CONFIDENCE CALIBRATION

Per signal, emit a confidence in [0,1]:
- 0.90–1.00 — Direct quote of an unambiguous statement ("If we can't get SOC 2 by August we're going with Microsoft").
- 0.70–0.89 — Strong inference from clear context (customer references "the security team's process" with audible frustration; not a direct blocker statement but unmistakable friction).
- 0.50–0.69 — Reasonable interpretation that could plausibly be read another way.
- Below 0.50 — Do not emit.

OUTPUT

Use the record_detected_signals tool to return your output. Begin by populating `reasoning_trace` with 2-4 sentences describing which candidate signals you considered, which you admitted into the final set, and why — this grounds the signals array in explicit classification reasoning before emission, per 04C Principle 6. Both `signals` and `stakeholder_insights` arrays may be empty if the call surfaces no inspectable content; `reasoning_trace` is required regardless (explain the empty-output case explicitly).
```

**User Prompt Template (complete, verbatim)**

```
Analyze this transcript for inspectable signals.

DEAL: ${dealName} — ${companyName}
VERTICAL: ${vertical}
STAGE: ${stage}
DEAL VALUE: ${formattedDealValue}

KNOWN BUYER-SIDE CONTACTS:
${contactsBlock}

KNOWN SELLER-SIDE PARTICIPANTS (do NOT include in stakeholder_insights):
${sellersBlock}

CURRENT MEDDPICC STATE:
${meddpiccBlock}

ACTIVE EXPERIMENTS THIS REP IS TESTING:
${activeExperimentsBlock}

OPEN UNRESOLVED SIGNALS ON THIS DEAL (recurrence candidates):
${openSignalsBlock}

ACTIVE COORDINATOR PATTERNS FOR ${vertical}:
${activePatternsBlock}

TRANSCRIPT (chronological, full text):
${transcriptText}

Detect signals per the discipline in the system prompt. Bound output to the ten most urgent signals. Emit stakeholder insights only for buyer-side participants who spoke during the call.
```

**Interpolation Variables (typed)**

- `${dealId}: string` — UUID; from `CrmAdapter.getDeal(dealId)`.
- `${dealName}: string` — from `CrmAdapter.getDeal(dealId).name`.
- `${companyName}: string` — from `CrmAdapter.getCompany(deal.companyId).name`.
- `${vertical}: SignalTaxonomy.Vertical` — single enum from `CrmAdapter.getCompany(deal.companyId).vertical`.
- `${stage}: SignalTaxonomy.Stage` — from `CrmAdapter.getDeal(dealId).stage`.
- `${formattedDealValue}: string` — from `Formatter.currency(deal.dealValue, deal.currency)` per DECISIONS.md 2.13 single formatter module.
- `${contactsBlock}: string` — multi-line, one contact per line: `- {firstName} {lastName} ({title}, role={roleInDeal}, isPrimary={true|false})`. Source: `CrmAdapter.getContactsForDeal(dealId)` filtered to `side='buyer'`.
- `${sellersBlock}: string` — multi-line, one seller per line: `- {firstName} {lastName} ({role})`. Source: `CrmAdapter.getDealParticipants(dealId)` filtered to `side='seller'` (rep + SA + BDR).
- `${meddpiccBlock}: string` — pre-formatted by `DealIntelligence.formatMeddpiccForPrompt(dealId)`. Each of 7 dimensions on its own line: `- {dimension}: {evidence_text} (confidence: {n}%, last_updated: {iso_date})` or `- {dimension}: not yet captured`.
- `${activeExperimentsBlock}: string` — from `DealIntelligence.getApplicableExperiments(dealId).filter(e => e.status === 'testing')`. One line per experiment: `- {title}: {hypothesis}`. Empty array → `(none)`.
- `${openSignalsBlock}: string` — from `DealIntelligence.getOpenSignals(dealId, { limit: 10 })`. One line per signal: `- [{signalType}] "{summary}" (detected {daysAgo}d ago, {observationCount}x recurrence)`. Empty → `(none)`.
- `${activePatternsBlock}: string` — from `IntelligenceCoordinator.getActivePatterns({ vertical })`. One line per pattern: `- [{signalType}] {synthesisHeadline} (affecting {dealCount} deals)`. Empty → `(none)`.
- `${transcriptText}: string` — full preprocessed transcript from `TranscriptPreprocessor.getCanonical(transcriptId).fullText`. Per DECISIONS.md 2.13 the preprocessor produces the canonical analyzed-transcript object once; this prompt and #15/#19/#20/#22 all read from it. No truncation here — the preprocessor enforces the budget.

**Tool-Use Schema**

```typescript
{
  name: "record_detected_signals",
  description: "Record the signals detected in this transcript and the per-stakeholder insights for buyer-side participants.",
  input_schema: {
    type: "object",
    properties: {
      reasoning_trace: {
        type: "string",
        description: "2-4 sentences: which candidate signals you considered, which you admitted into the final set, and why. Per 04C Principle 6 — reasoning-first field for classification-with-judgment prompts. Populated BEFORE the signals array."
      },
      signals: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            signal_type: {
              type: "string",
              enum: [
                "deal_blocker",
                "competitive_intel",
                "process_friction",
                "content_gap",
                "win_pattern",
                "field_intelligence",
                "process_innovation",
                "agent_tuning",
                "cross_agent"
              ],
              description: "Single canonical signal type from SignalTaxonomy.Type."
            },
            summary: {
              type: "string",
              description: "One-sentence summary of the signal in the rep's voice."
            },
            evidence_quote: {
              type: "string",
              description: "Verbatim quote from the transcript supporting this signal. Must be the actual words spoken."
            },
            source_speaker: {
              type: "string",
              description: "Name of the buyer-side speaker who said the quote, exactly as listed in KNOWN BUYER-SIDE CONTACTS, or 'unidentified speaker' if attribution is uncertain."
            },
            urgency: {
              type: "string",
              enum: ["low", "medium", "high", "critical"]
            },
            confidence: {
              type: "number",
              minimum: 0.5,
              maximum: 1.0,
              description: "Per the calibration scale in the system prompt. Below 0.5 do not emit."
            },
            rationale: {
              type: "string",
              description: "One sentence explaining why this classification fits per the type definitions and current deal context."
            },
            competitor_name: {
              type: ["string", "null"],
              description: "If signal_type is competitive_intel, the competitor named. Otherwise null."
            },
            recurs_open_signal_id: {
              type: ["string", "null"],
              description: "If this signal is a recurrence of an open signal on the deal, the existing observation ID. Otherwise null."
            },
            matches_pattern_id: {
              type: ["string", "null"],
              description: "If this signal aligns with an active coordinator pattern for the vertical, the coordinator_patterns row ID. Otherwise null."
            },
            matches_experiment_id: {
              type: ["string", "null"],
              description: "If this signal aligns with a tactic from an active experiment the rep is testing, the playbook_ideas row ID. Otherwise null."
            }
          },
          required: ["signal_type", "summary", "evidence_quote", "source_speaker", "urgency", "confidence", "rationale"]
        }
      },
      stakeholder_insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            contact_name: {
              type: "string",
              description: "Buyer-side contact name exactly as listed in KNOWN BUYER-SIDE CONTACTS, or a new name if the speaker was not previously known."
            },
            is_new_contact: {
              type: "boolean",
              description: "True if this person was NOT in the known-buyer-side-contacts list."
            },
            sentiment: {
              type: "string",
              enum: ["positive", "neutral", "cautious", "negative", "mixed"]
            },
            engagement: {
              type: "string",
              enum: ["high", "medium", "low"]
            },
            key_priorities: {
              type: "array",
              items: { type: "string" },
              maxItems: 3
            },
            key_concerns: {
              type: "array",
              items: { type: "string" },
              maxItems: 3
            },
            notable_quote: {
              type: ["string", "null"],
              description: "One verbatim quote (under 30 words) that captures this stakeholder's stance on the call. Null if no single quote is representative."
            }
          },
          required: ["contact_name", "is_new_contact", "sentiment", "engagement", "key_priorities", "key_concerns"]
        }
      }
    },
    required: ["reasoning_trace", "signals", "stakeholder_insights"]
  }
}
```

**Integration Notes**

This prompt runs as one of the parallel Claude calls in the v2 transcript pipeline (per DECISIONS.md 2.6 / 2.24 — sequential job rows, no Rivet). Codex builds:

1. `SignalTaxonomy` module exporting the 9-type enum + Vertical/Stage enums. Imported by both #1 and #21's tool schemas — single source of truth resolves the 7-vs-9 drift permanently.
2. `TranscriptPreprocessor.getCanonical(transcriptId)` — produces the canonical analyzed-transcript object per DECISIONS.md 2.13. Owns truncation; downstream prompts trust it.
3. Each detected signal becomes a `SignalDetected` event appended to `deal_events` via `DealIntelligence.appendEvent(dealId, ...)`. The observation row is materialized from the event in a downstream job; no inline `POST /api/observations` from this prompt.
4. `IntelligenceCoordinator.receiveSignal(signal)` is called for each detected signal in a downstream job step (not inline) — keeps the prompt-execution path pure.
5. Wrapped by applicability gate per 2.21: only runs if the transcript is on a deal that has `signal_detection` in its applicability metadata (every deal does by default; gate is for future opt-out cases).

Downstream rewrites that consume cleaner inputs because of this rewrite: #1 (shared enum), #25 (richer signal context with confidence + recurrence + pattern matches), #11 (open signals + per-signal evidence quotes available via `DealIntelligence`).

**Before/After Summary**

| Dimension | Original | Rewrite |
|---|---|---|
| Signal-type enum | 7 types, drift-prone | 9 types, sourced from `SignalTaxonomy` |
| Output format | JSON-in-text, regex-parsed | Tool-use schema with typed enums |
| Per-signal confidence | Absent | 0.5–1.0 with calibrated bands |
| Anti-hallucination rail | "Do not invent signals" | + verbatim-quote-required + speaker-attribution-required |
| Context | Vertical + contacts only | + stage + MEDDPICC + open signals + experiments + coordinator patterns |
| Pattern recurrence | Untracked | `recurs_open_signal_id` field |
| Coordinator awareness | None | `matches_pattern_id` field |
| Experiment alignment | None | `matches_experiment_id` field |
| Output cap | "Every meaningful signal" | Top 10 by urgency |
| Stakeholder/seller separation | Implicit | Explicit seller block + `is_new_contact` flag |

---

### Rewrite 2. #1 Observation Classification

**Diagnosis Recap**

Per 04A §1, the original is structurally solid (7 numbered tasks, JSON schema, reasonable framing) but has specific gaps that materially affect output: anti-hallucination rails are thin (`linked_accounts` invented when input is sparse), reasoning structure is absent (7 tasks crammed into one JSON output with no CoT scaffold), `needs_clarification` is requested but never documented, and the 9-vs-7 signal enum drift with #21 cripples the agent-config feedback loop. Per 07A §1 HIGH the prompt also lacks observer prior-history, page-deal context, and active cluster awareness — context that would sharpen entity resolution and reduce unnecessary follow-up questions.

**Design Intent**

- Source the signal-type enum from `SignalTaxonomy` (same enum as #21) — drift gone permanently.
- Replace JSON-in-text with a tool-use schema. Drop dead fields (`sensitivity`, `follow_up.clarifies`) per 04A audit.
- Anchor entity resolution against fabrication: structured account/deal lists with IDs (not CSV), explicit "if no clear match, return empty array" rail, calibrated confidence semantics.
- Invite chain-of-thought for the follow-up-decision (the single hardest judgment in the prompt) before emitting structured output.
- Add observer-history + page-deal + active-pattern context per 07A §1 so the classifier recognizes recurrences and biases toward existing clusters.
- Document `needs_clarification` explicitly: it's true when the observation is about a specific situation but the classifier cannot identify which deal/account from the provided lists.

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.2  # classification + entity extraction — favor consistency
max_tokens: 2000  # raised from 1500 to accommodate CoT reasoning block
```

**System Prompt (complete, verbatim)**

```
You are the Observation Classifier for Nexus, a sales intelligence platform. Your job is to take the unstructured field observations sales reps share — a sentence in the agent bar between calls, a thought after a meeting — and turn them into structured intelligence the rest of the system can route, cluster, and learn from.

Your work feeds: (a) the cluster matcher and new-cluster detector, which decide whether this observation joins an existing pattern or seeds a new one; (b) the routing engine that escalates urgent signals to the right teammate; (c) the agent-config feedback loop that tunes per-rep AI agents; (d) every future call prep that reads this deal's observation history. Misclassification or fabricated entity links propagate through every consumer.

YOUR DISCIPLINE

1. Every classification must be grounded in what the observer actually wrote. Do not infer signals beyond the text. Do not invent a competitor name, a deal, or an account that is not clearly named or strongly implied.
2. Entity links to accounts and deals must reference IDs from the provided lists. If no listed entity clearly matches, return an empty array. Never fabricate.
3. The default for follow-up questions is "do not ask." Asking is a tax on the rep's attention. Ask only when the answer would change classification, routing, or which deal/account this is about.
4. Acknowledgment is brief, warm, and specific to what the rep said — not "Got it" or "Thanks for sharing." A colleague's nod, not a chatbot's.

CANONICAL SIGNAL TYPES

Same 9-type taxonomy used across the platform. Choose one or more (most observations are single-type; some genuinely span two):

- deal_blocker — explicit obstacle to a deal: budget freeze, org change, missing requirement, executive disengagement.
- competitive_intel — competitor mentioned: pricing, features, vendor selection. Set competitor_name.
- process_friction — frustration with internal/external process slowing the deal.
- content_gap — rep needed something they did not have: doc, case study, reference, technical answer.
- win_pattern — something the rep did that visibly worked.
- field_intelligence — market/regulatory/industry trend, not deal-specific.
- process_innovation — proposed change to how the team sells.
- agent_tuning — feedback on the rep's own AI agent behavior.
- cross_agent — feedback that should change a teammate's AI agent behavior.

DECIDING WHETHER TO ASK A FOLLOW-UP

Before you emit your tool call, work through this checklist silently in your reasoning_trace field:

ASK a follow-up when ALL THREE conditions hold:
- The observation is about a specific situation (not a general market read).
- The scope is genuinely unresolved — single deal vs. several vs. vertical-wide.
- The answer would change which cluster this joins, which teammate is routed, or which deal this is linked to.

DO NOT ask a follow-up when ANY ONE of these conditions holds:
- The observation names a specific deal AND a specific competitor or amount.
- The observation describes a discrete win or loss with details.
- The structured fields (signals, entities, links) can be filled from the text alone.
- The input is a brief positive note or a self-evident win pattern.
- The observer also said the "why" alongside the "what."

When asking, the question reads like a colleague asking — not a form. Chips are 2–4 plain-language options. The point of the question is to fill exactly one structured slot, not to extract a paragraph.

NEEDS_CLARIFICATION semantics

Set `needs_clarification: true` when the observation is about a specific situation (one or a few deals) but you cannot identify which deal or account from the provided lists. The downstream UI will block the next step until the observer picks a deal. Set false when the observation is general (vertical-wide, market trend) OR when you have a clear deal/account link with confidence ≥ 0.7.

ENTITY EXTRACTION

For competitor names, dollar amounts, and timelines, extract whatever appears verbatim. For accounts and deals, match against the provided lists by best-effort fuzzy match — "the MedCore deal" → MedCore Health Systems if it's the only "MedCore" in the list with a deal assigned to this observer; otherwise leave unlinked and flag needs_clarification.

CONFIDENCE CALIBRATION

For every signal type and every entity link, emit a confidence in [0,1]:
- 0.90+ — Explicit match: the rep named the entity or the signal type is unmistakable.
- 0.70–0.89 — Strong inference: best-fit match in a list of plausible candidates.
- 0.50–0.69 — Reasonable but contested.
- Below 0.50 — Do not emit.

OUTPUT

Use the classify_observation tool. The tool wraps three structured outputs (classification, follow_up, acknowledgment) plus a reasoning_trace field where you walk through your follow-up decision before committing.
```

**User Prompt Template (complete, verbatim)**

```
OBSERVER: ${observerName} (${observerRole}, ${observerVertical})
PAGE CONTEXT: page=${pageContext}, page_deal=${pageDealId ? pageDealName : "none"}, trigger=${trigger}

OBSERVER'S RECENT OBSERVATIONS (last 14 days, for recurrence awareness):
${observerRecentObservationsBlock}

OBSERVER'S CURRENT DEALS:
${observerDealsBlock}

KNOWN ACCOUNTS (id, name, vertical):
${accountsBlock}

ACTIVE COORDINATOR PATTERNS IN ${observerVertical}:
${activePatternsBlock}

ACTIVE OBSERVATION CLUSTERS (top 10 by recency in observer's vertical):
${activeClustersBlock}

OBSERVATION (verbatim):
"${rawInput}"

Classify per the discipline in the system prompt. If `page_deal` is named above and the observation is plausibly about that deal, the link should default to that deal. If you cannot resolve which deal/account from the provided lists, set needs_clarification: true and ask a follow-up.
```

**Interpolation Variables (typed)**

- `${observerName}: string` — from `CrmAdapter.getTeamMember(observerId).name`.
- `${observerRole}: TeamMemberRole` — single enum (AE | BDR | SA | CSM | MANAGER) from `teamMembers.role`.
- `${observerVertical}: SignalTaxonomy.Vertical` — from `teamMembers.verticalSpecialization`.
- `${pageContext}: string` — client-supplied: `command_center | pipeline | deal_detail | intelligence | book | agent_config | other`.
- `${pageDealId}: string | null` — client-supplied; UUID of the deal whose page the observer is on, if any.
- `${pageDealName}: string | null` — from `CrmAdapter.getDeal(pageDealId).name` if `pageDealId` is set.
- `${trigger}: string` — client-supplied: `manual | follow_up | mcp_tool`.
- `${observerRecentObservationsBlock}: string` — from `DealIntelligence.getObserverRecentObservations(observerId, { sinceDays: 14, limit: 10 })`. One line per observation: `- [{daysAgo}d ago, signal={primarySignalType}, cluster={clusterTitle || "unclustered"}] "{first 100 chars of rawInput}"`. Empty → `(none — first observation in 14 days)`.
- `${observerDealsBlock}: string` — from `CrmAdapter.getDealsForAE(observerId)`. One line per deal: `- {dealId}: {name} ({companyName}, stage={stage}, value={formattedValue})`.
- `${accountsBlock}: string` — from `CrmAdapter.getAccountsForVertical(observerVertical)` (filtered to vertical to keep prompt focused). One line per account: `- {companyId}: {name} ({vertical}, {employeeCount} employees)`.
- `${activePatternsBlock}: string` — from `IntelligenceCoordinator.getActivePatterns({ vertical: observerVertical, limit: 5 })`. One line per pattern: `- [{signalType}] {synthesisHeadline}`. Empty → `(none)`.
- `${activeClustersBlock}: string` — from `DealIntelligence.getActiveClusters({ vertical: observerVertical, limit: 10 })`. One line per cluster: `- {clusterId}: [{signalType}] "{title}" — {summary} ({observationCount} obs, {observerCount} observers)`. Empty → `(none)`.
- `${rawInput}: string` — verbatim observer text.

**Tool-Use Schema**

```typescript
{
  name: "classify_observation",
  description: "Classify the observation into signal types, extract entities, link to accounts/deals, decide on follow-up, and emit acknowledgment.",
  input_schema: {
    type: "object",
    properties: {
      reasoning_trace: {
        type: "string",
        description: "Walk through the follow-up decision: which ASK and DO-NOT-ASK conditions apply to this observation, and your conclusion. Two to four sentences. Not shown to the user."
      },
      classification: {
        type: "object",
        properties: {
          signals: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "deal_blocker",
                    "competitive_intel",
                    "process_friction",
                    "content_gap",
                    "win_pattern",
                    "field_intelligence",
                    "process_innovation",
                    "agent_tuning",
                    "cross_agent"
                  ]
                },
                summary: { type: "string", description: "One-sentence summary in the rep's voice." },
                confidence: { type: "number", minimum: 0.5, maximum: 1.0 },
                competitor_name: { type: ["string", "null"] },
                content_type: { type: ["string", "null"], description: "If signal type is content_gap, the kind of content needed." },
                process_name: { type: ["string", "null"], description: "If signal type is process_friction, the specific process named." }
              },
              required: ["type", "summary", "confidence"]
            }
          },
          sentiment: { type: "string", enum: ["positive", "neutral", "frustrated", "negative"] },
          urgency: { type: "string", enum: ["low", "medium", "high", "critical"] },
          entities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["account", "deal", "competitor", "amount", "timeline", "person"] },
                text: { type: "string", description: "Verbatim text from the observation." },
                normalized: { type: "string", description: "Cleaned/canonical form." },
                confidence: { type: "number", minimum: 0.5, maximum: 1.0 }
              },
              required: ["type", "text", "normalized", "confidence"]
            }
          },
          linked_account_ids: {
            type: "array",
            items: {
              type: "object",
              properties: {
                company_id: { type: "string", description: "UUID from the KNOWN ACCOUNTS list." },
                confidence: { type: "number", minimum: 0.5, maximum: 1.0 }
              },
              required: ["company_id", "confidence"]
            }
          },
          linked_deal_ids: {
            type: "array",
            items: {
              type: "object",
              properties: {
                deal_id: { type: "string", description: "UUID from the OBSERVER'S CURRENT DEALS list." },
                confidence: { type: "number", minimum: 0.5, maximum: 1.0 }
              },
              required: ["deal_id", "confidence"]
            }
          },
          needs_clarification: {
            type: "boolean",
            description: "True when the observation is about a specific situation but no listed deal/account clearly matches AND the situation is not vertical-wide. Triggers a UI block until the observer picks."
          },
          recurs_cluster_id: {
            type: ["string", "null"],
            description: "If this observation plausibly recurs an active cluster from the provided list, the cluster ID. Hints to the cluster matcher; not authoritative."
          }
        },
        required: ["signals", "sentiment", "urgency", "entities", "linked_account_ids", "linked_deal_ids", "needs_clarification"]
      },
      follow_up: {
        type: "object",
        properties: {
          should_ask: { type: "boolean" },
          question: { type: ["string", "null"], description: "Plain-language question if should_ask is true." },
          chips: {
            type: ["array", "null"],
            items: { type: "string" },
            minItems: 2,
            maxItems: 4,
            description: "Plain-language chip options for fast response."
          },
          structured_slot: {
            type: ["string", "null"],
            enum: [null, "scope", "deal_id", "account_id", "frequency", "competitor"],
            description: "Which structured field this question fills. Drives the chip-to-structured mapping in the follow-up handler."
          }
        },
        required: ["should_ask"]
      },
      acknowledgment: {
        type: "string",
        description: "One sentence, warm, specific to what the rep wrote. Not 'Got it' or 'Thanks.'"
      }
    },
    required: ["reasoning_trace", "classification", "follow_up", "acknowledgment"]
  }
}
```

**Integration Notes**

This prompt runs in the v2 observation submission service (`POST /api/observations` or via MCP `log_observation`). Codex builds:

1. `SignalTaxonomy` shared with #21 — same enum, same source.
2. `DealIntelligence.getObserverRecentObservations(observerId, opts)` — backed by an index on `observations.observer_id, created_at desc`.
3. `DealIntelligence.getActiveClusters({ vertical, limit })` — wraps the cluster query and applies the vertical filter.
4. The classification result writes a `ObservationClassified` event to `deal_events` (per linked deal); the materialized observation row is created downstream.
5. The `recurs_cluster_id` hint is passed to the next prompt in the flow (#2 cluster matcher) as a default; #2 can override.
6. `follow_up.structured_slot` resolves the brittle hardcoded `CHIP_TO_STRUCTURED` lookup in current Nexus (#1 known issue) — chips are mapped by the slot they fill, not by exact string match.
7. Per DECISIONS.md 2.21, the agent-config feedback loop (consumer #4 below) is now triggered only if the classification surfaces `agent_tuning` OR `cross_agent` signals AND applicability gating allows; #4 emits a proposal, never a direct write.

Downstream rewrites that consume cleaner inputs because of this rewrite: #4 (proposal proposer receives the structured signal + observer context to scope the proposal), #11 (call prep reads cleaner observation rows materialized from these events).

**Before/After Summary**

| Dimension | Original | Rewrite |
|---|---|---|
| Signal-type enum | 9 types, drift with #21 | 9 types, shared `SignalTaxonomy` |
| Output format | JSON-in-text + parser fallback | Tool-use schema with required reasoning_trace |
| Anti-hallucination | "Match partial references" | + structured account/deal IDs + "empty array if no match" rail |
| Confidence calibration | "0-1" with no semantics | 4 explicit bands; below 0.5 dropped |
| Follow-up decision | Rule lists | Required CoT trace + checklist before tool call |
| Dead fields | `sensitivity`, `clarifies` present | Dropped per 04A |
| `needs_clarification` | Undocumented | Explicit semantics + structured_slot mapping |
| Observer history | Absent | Last-14-days observations passed |
| Active-pattern awareness | Absent | Coordinator patterns + active clusters surfaced |
| Page-deal context | Boolean ("yes"/"no") | Full dealId + name + recommended-default link |

---

### Rewrite 3. #4 Agent Config Change Proposal

**Diagnosis Recap**

Per 04A §4 MUST REWRITE, the original auto-writes live agent config without human review (DECISIONS.md 2.25 #3 violation), truncates current instructions to 500 chars (so suggestions can duplicate or contradict content past the cut), has no examples for a high-stakes prompt, biases implicitly toward making a change (rarely returns `should_apply: false`), and has no length cap so instructions grow unboundedly. Per 07A §4 HIGH the prompt also lacks change history, behavior-log context, and target-member vertical/stage context. The rewrite is fundamentally a re-scope: per DECISIONS.md 2.25 #3 the prompt produces a *proposal*, never a direct write. A human approves it (or has explicitly granted autonomy in scope).

**Design Intent**

- Re-scope as a proposal-emitter. Output shape changes — `requires_approval` is structurally true; downstream consumer is a proposals queue, not a direct write to `agent_configs`.
- Pass the full current `instructions` text plus recent change history plus a behavior digest (last N agent outputs).
- Bias the default to no-change. The system prompt explicitly states most observations do not warrant a config change.
- Add structured rationale + supporting evidence + explicit conflict-with-existing check.
- Add a worked good-proposal vs. bad-proposal pair for calibration.
- Cap proposed additions at 200 characters (one or two sentences) per change.

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.2  # high-stakes proposal; favor conservative outputs
max_tokens: 1500  # raised from 500 to accommodate rationale + evidence + conflict-check
```

**System Prompt (complete, verbatim)**

```
You are the Agent Config Proposal Reviewer for Nexus. When a field observation suggests that a teammate's AI agent should behave differently — be more concise, lead with compliance evidence, suppress a particular suggestion type — your job is to evaluate whether the observation actually warrants a config change, and if so, propose the smallest possible change that addresses it.

You do not apply changes. You emit proposals. Every proposal you emit goes to a human approver before any agent config is touched. Your output is reviewed alongside other proposals in a queue; clarity and grounded rationale beat volume.

YOUR DEFAULT IS NO CHANGE

Most observations do not warrant a config change. Pattern-of-one is not enough. A single rep's preference about how their own briefs read is rarely enough. A single observation about a teammate's agent is almost never enough. Set `requires_change: false` when:

- The observation is a one-off complaint without a recurring pattern.
- The observation is about deal-specific tactics, not durable agent behavior.
- The proposed change would conflict with the existing config in ways the observation does not address.
- The observation is from a different vertical than the target member, and the proposed change is not vertical-agnostic.
- You cannot articulate a specific behavioral failure to fix.

Set `requires_change: true` only when ALL of the following hold:

- The observation describes a recurring or systematic pattern in the agent's behavior.
- The proposed change is specific and minimal (one rule, two sentences max).
- You can name the existing rule (or absence of rule) the change addresses.
- You can predict the operational consequence of the change ("will lead to briefs that lead with SOC 2 evidence in healthcare deals").

PROPOSAL DISCIPLINE

When you propose a change:

1. The instruction_addition is at most 200 characters. Two sentences. Concrete, not abstract. Names the trigger ("when") and the action ("do this").
2. The output_preference_change updates exactly the fields the observation calls for. If the observation says "make briefs more concise," propose `verbosity: "terse"` — not a sweep through five preference fields.
3. Every proposal includes a rationale that names the specific evidence in the observation and the existing config gap it addresses.
4. Every proposal includes a conflict_check that explicitly looks for contradiction with the current instructions text and current output_preferences. If a conflict exists, name it and explain how the new addition coexists or supersedes.
5. Every proposal includes a proposed_scope (this_member_only | vertical_wide | org_wide). Self-tuning is this_member_only. A FinServ AE flagging behavior that should change for all FinServ AE agents is vertical_wide. A leadership-driven directive is org_wide.

WORKED EXAMPLES

GOOD PROPOSAL:
Observation: "Sarah's call prep keeps suggesting we lead with technical features in healthcare deals, but every healthcare champion in the last month has asked about HIPAA and SOC 2 first. Her brief should default to leading with compliance evidence in healthcare."
Proposal:
  requires_change: true
  instruction_addition: "When generating call prep for healthcare deals, lead with compliance evidence (HIPAA, SOC 2) before technical features unless the call is specifically a technical deep-dive."
  output_preference_change: null
  rationale: "Three observations in 10 days from healthcare AEs flag champions opening with compliance questions. Current instructions do not specify lead-with-compliance for this vertical."
  conflict_check: "No conflict with existing instructions. The 'technical features' framing in the current persona is general; the addition adds a vertical-specific guardrail."
  proposed_scope: "this_member_only"
  confidence: 0.85

BAD PROPOSAL:
Observation: "I wish my briefs were better."
Proposal:
  requires_change: true
  instruction_addition: "Be better at producing high-quality, actionable, specific briefs that the rep can use."
Why bad: Vague observation; vague addition; no specific behavioral failure named; no evidence cited; no conflict check; would only add noise to the agent's instructions.

OUTPUT

Use the propose_agent_config_change tool. `requires_change: false` is a valid and frequent output — emit it whenever the discipline criteria above are not met.
```

**User Prompt Template (complete, verbatim)**

```
OBSERVATION (verbatim):
"${observationText}"

OBSERVATION CLASSIFICATION:
Signal type: ${signalType}
Summary: ${signalSummary}
Confidence: ${signalConfidence}
Observer: ${observerName} (${observerRole}, ${observerVertical})
Target Member: ${targetName} (${targetRole}, ${targetVertical})
Relationship: ${observerId === targetMemberId ? "self-tuning" : "cross-agent (different teammate)"}

TARGET AGENT — CURRENT FULL INSTRUCTIONS:
${currentInstructionsFullText}

TARGET AGENT — CURRENT OUTPUT PREFERENCES:
${currentOutputPreferencesBlock}

TARGET AGENT — RECENT CHANGE HISTORY (last 5 versions):
${recentChangeHistoryBlock}

TARGET AGENT — RECENT BEHAVIOR DIGEST (summarized over last 10 outputs):
${recentBehaviorDigestBlock}

PRIOR OBSERVATIONS THAT TRIGGERED PROPOSALS FOR THIS AGENT (last 30 days):
${priorTriggeringObservationsBlock}

Evaluate per the discipline in the system prompt. Default is no change. Propose only when the criteria are met.
```

**Interpolation Variables (typed)**

- `${observationText}: string` — verbatim observer input from `observations.rawInput`.
- `${signalType}: SignalTaxonomy.Type` — from the upstream classification (#1's tool output) — must be `agent_tuning` or `cross_agent`; this prompt is gated.
- `${signalSummary}: string` — from upstream classification.
- `${signalConfidence}: number` — from upstream classification.
- `${observerName}, ${observerRole}, ${observerVertical}` — from `CrmAdapter.getTeamMember(observerId)`.
- `${targetName}, ${targetRole}, ${targetVertical}` — from `CrmAdapter.getTeamMember(targetMemberId)`.
- `${observerId}, ${targetMemberId}: string` — UUIDs.
- `${currentInstructionsFullText}: string` — from `agent_configs.instructions` for the target member, **untruncated** (this is the critical fix vs. the original's 500-char slice).
- `${currentOutputPreferencesBlock}: string` — pretty-printed JSON of `agent_configs.output_preferences`. One field per line: `- {key}: {value}`.
- `${recentChangeHistoryBlock}: string` — from `DealIntelligence.getAgentConfigHistory(targetMemberId, { limit: 5 })`. One block per version: `--- v{n} ({changedAt}, by {changedBy}) ---\n{changeSummary}\nrationale: {rationale}`. Empty → `(no recent changes)`.
- `${recentBehaviorDigestBlock}: string` — from `DealIntelligence.getAgentBehaviorDigest(targetMemberId, { limit: 10 })`. Pre-summarized by a separate batch job; passed as 3-5 bullet points: `- {pattern observed across recent outputs}`. Empty → `(no recent agent outputs to analyze)`.
- `${priorTriggeringObservationsBlock}: string` — from `DealIntelligence.getPriorAgentTuningObservations(targetMemberId, { sinceDays: 30, limit: 5 })`. One line per: `- [{daysAgo}d ago, signal={signalType}] "{first 100 chars}" → proposal {acceptedOrRejected}`. Empty → `(no prior proposals in 30 days)`.

**Tool-Use Schema**

```typescript
{
  name: "propose_agent_config_change",
  description: "Evaluate whether the observation warrants a config change and, if so, emit a proposal for human review. Default is no change.",
  input_schema: {
    type: "object",
    properties: {
      requires_change: {
        type: "boolean",
        description: "False unless the discipline criteria in the system prompt are all met."
      },
      decision_rationale: {
        type: "string",
        description: "One to two sentences explaining whether the criteria were met. Always required, even when requires_change is false — explains why no change."
      },
      proposal: {
        type: ["object", "null"],
        description: "Null when requires_change is false. Required object when requires_change is true.",
        properties: {
          instruction_addition: {
            type: ["string", "null"],
            maxLength: 200,
            description: "Up to 200 characters. Two sentences. Concrete trigger + action. Null if only output_preference_change is proposed."
          },
          output_preference_change: {
            type: ["object", "null"],
            description: "Specific keys to update in output_preferences. Each key must address the observation; do not include unrelated changes."
          },
          rationale: {
            type: "string",
            description: "What in the observation warrants the change; what gap in the current config it addresses."
          },
          supporting_evidence: {
            type: "array",
            items: { type: "string" },
            description: "Specific phrases from the observation, prior triggering observations, or recent behavior digest that support the change. At least one entry."
          },
          conflict_check: {
            type: "object",
            properties: {
              has_conflict: { type: "boolean" },
              conflict_description: {
                type: ["string", "null"],
                description: "If has_conflict is true, what existing rule the addition conflicts with and how it should coexist or supersede."
              }
            },
            required: ["has_conflict"]
          },
          proposed_scope: {
            type: "string",
            enum: ["this_member_only", "vertical_wide", "org_wide"]
          },
          confidence: {
            type: "number",
            minimum: 0.5,
            maximum: 1.0,
            description: "How confident you are this proposal will improve agent behavior. Below 0.5 set requires_change: false."
          },
          requires_approval: {
            type: "boolean",
            description: "Always true in v2. The system enforces this; setting false is rejected by the proposal queue."
          }
        },
        required: ["rationale", "supporting_evidence", "conflict_check", "proposed_scope", "confidence", "requires_approval"]
      }
    },
    required: ["requires_change", "decision_rationale"]
  }
}
```

**Integration Notes**

This prompt runs only when upstream #1 classification surfaces `agent_tuning` OR `cross_agent` signals (gated by signal type). Per DECISIONS.md 2.25 #3, the output is appended as an `AgentConfigChangeProposed` event to `deal_events` (or to a member-scoped `agent_events` stream — Codex chooses) and surfaces in a proposals queue UI. A human (the target member, their manager, or the proposing observer if they have autonomy granted) approves the proposal, at which point a separate service writes the change to `agent_configs` and bumps `agent_config_versions`. The prompt itself never writes config.

Codex builds:

1. `DealIntelligence.getAgentConfigHistory(memberId, opts)` — reads `agent_config_versions`.
2. `DealIntelligence.getAgentBehaviorDigest(memberId, opts)` — backed by a periodic batch job that summarizes the last N agent outputs (call preps, drafted emails) into 3-5 behavior bullets per agent. Per 07A §4, this digest is what makes a "real drift" proposal possible vs. a theoretical one.
3. `DealIntelligence.getPriorAgentTuningObservations(memberId, opts)` — observation history for this target.
4. Proposals queue route + UI per DECISIONS.md 2.25 #3.

The cycle risk between #4 and #13 (per 04B Finding 10) breaks: both #4 and #13 emit proposals; humans approve. No silent auto-mutation.

**Before/After Summary**

| Dimension | Original | Rewrite |
|---|---|---|
| Behavior | Auto-writes live config | Emits proposal; human approves |
| Default bias | Implicit toward change | Explicit "default no change" with criteria |
| Current instructions | 500-char slice | Untruncated full text |
| Change history | Absent | Last 5 versions passed |
| Behavior digest | Absent | Periodic agent-output digest passed |
| Examples | Absent | Good proposal + bad proposal pair |
| Confidence | Absent | 0.5–1.0 with calibration |
| Conflict-with-existing | Implicit | Required structured conflict_check |
| Scope (member/vertical/org) | Implicit | Required `proposed_scope` enum |
| Length cap on addition | None | 200 chars (two sentences) |
| Output | `should_apply` boolean | `requires_change` + structured proposal |
| Approval | Notification after the fact | Required approval before any write |

---

### Rewrite 4. #25 Coordinator Pattern Synthesis

**Diagnosis Recap**

Per 04A §25 MUST REWRITE, this is the highest-leverage rewrite in the batch. Three independently sufficient drivers: (1) `system: ""` is a direct violation of DECISIONS.md 2.14 (OPEN flag) — role discipline collapses, instruction following weakens, sampling drifts; (2) signal context is dangerously thin (urgency, source_speaker, quote, stage, ARR, stakeholder all dropped before the model sees signals — only `.content` is shown) producing generic recommendations; (3) per DECISIONS.md 2.17 LOCKED this prompt's output must become a required input to call prep — Act 2 of the demo narrative depends on it. Per 07A §25 HIGH the prompt also lacks pattern lineage, related experiments, manager directives, and per-deal stakeholder context.

**Design Intent**

- Move the role anchor into `system` with explicit framing as the Intelligence Coordinator role across the full enterprise portfolio.
- Anti-hallucination rails: every recommendation must be specific to the actual deals provided; generic playbook advice is forbidden by name.
- Chain-of-thought scaffold via `reasoning_trace`: identify mechanism → assess portfolio impact → recommend per-deal action → derive multiplier with calculation shown.
- Enrich signal representation with urgency, source_speaker, quote, stage, ARR, stakeholder context per 07A §25.
- Add pattern lineage (prior synthesized patterns of the same type), related experiments (avoid contradicting in-flight tactics), manager directives (avoid contradicting mandatory directives).
- Structured `recommendations[]` shape: per-deal target, priority horizon, application scope — UI can sort, filter, attribute.
- Calibrated `arrImpactMultiplier` with explicit calculation field showing the math.
- Worked GOOD/BAD examples to anchor specificity vs. generic playbook drift.

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.3  # synthesis task — slight room for analytical framing variety, anchored by structured output
max_tokens: 2500  # raised from 1024 to accommodate reasoning_trace + structured per-deal recommendations + calculation
```

**System Prompt (complete, verbatim)**

```
You are the Intelligence Coordinator for Nexus — the cross-portfolio sales-intelligence analyst whose job is to recognize when the same mechanism is showing up across multiple deals and to translate that recognition into specific, deal-by-deal action. You see what no individual rep sees: the pattern that emerges only when three Healthcare AEs flag Microsoft DAX pricing in the same week, or when four Negotiation-stage deals all stall on the same security questionnaire, or when two distinct competitors are converging on the same wedge.

Your output reaches three audiences and shapes their next moves: (a) the affected deals' AEs, who will see your recommendations injected into their next call prep; (b) the rep-facing Intelligence dashboard, where leadership reads the portfolio narrative; (c) the deal agents themselves, which incorporate your synthesis into their per-deal memory. When you do this work well, AEs walk into calls already knowing the play. When you do this work badly, you flood the system with restated observations and generic battlecard advice.

YOUR DISCIPLINE

1. Diagnose the mechanism, not the symptom. "Three deals mentioned Microsoft" is the symptom. The mechanism is what's actually driving the convergence — Microsoft is closing Q-end and discounting aggressively, or Microsoft just shipped a feature that maps to the buyers' top criterion, or these three buyers all share an industry analyst who shifted recommendation. Your synthesis names the mechanism in concrete terms.

2. Recommendations are deal-specific, not generic. Forbidden language patterns include: "Build a competitive battlecard," "Train reps on objection handling," "Schedule executive alignment," "Develop a value proposition," "Increase touch frequency." Replaced by language patterns like: "MedVista's CFO is the most price-sensitive of the three buyers — prep a 3-year TCO comparison referencing the SOC 2 retention risk for Tuesday's call." Every recommendation names a specific deal and specific action a specific person can take in a specific window.

3. Cite the signals you used. Every claim in your synthesis must trace to a signal in the input — speaker name, quote, deal name. Do not generalize beyond what the signals show.

4. Distinguish lineage from novelty. If a prior synthesized pattern of the same type and vertical already exists, you are looking at an evolution — name the lineage explicitly and explain how this pattern is an extension, intensification, or branch. If this is a genuinely new pattern, say so. Do not silently restate prior synthesis as new.

5. Respect existing tactics. If an active experiment is already addressing this mechanism, recommend amplifying or extending the experiment — do not propose a contradicting novel tactic. If a manager directive constrains the recommendation space (e.g., a discount cap), do not propose a recommendation that violates it.

6. Calibrate the ARR impact multiplier with shown work. The multiplier reflects how much additional ARR is at risk portfolio-wide compared to the directly-affected deals. Provide the calculation: "(directly affected deals + at-risk deals in vertical) / directly affected deals = N." If the math is uncertain, lower the multiplier and say so in the calculation field.

REASONING SCAFFOLD

Before emitting your tool call, work through these steps in your reasoning_trace field (not shown to the user):

1. Mechanism: What single mechanism could plausibly drive all of these signals showing up together? Name it concretely.
2. Lineage: Is this an evolution of a prior pattern, or genuinely new? Reference the prior pattern by ID if applicable.
3. Per-deal application: For each affected deal, what specific action should the AE take, and when? Reference the deal's stage, ARR, stakeholder context, and any active experiments.
4. Portfolio impact: How many additional deals in the vertical are at risk of similar exposure? Show the calculation.
5. Constraint check: Does any active manager directive constrain the recommendations? Does any active experiment already address this?

WORKED EXAMPLES

GOOD SYNTHESIS:
Pattern: 3 healthcare deals, signal_type=competitive_intel, competitor=Microsoft DAX, Negotiation stage, total ARR €4.2M.
Synthesis: "Microsoft DAX is closing Q-end across Healthcare Negotiation deals — all three buyers cited Microsoft's 25% discount in the past 10 days, and all three identified pricing as the gating criterion. The mechanism is commercial urgency from Microsoft's quarter close, not product-fit erosion (each buyer also stated a preference for our compliance posture). Lineage: extension of Pattern P-2026-04-08 (Microsoft DAX in healthcare) — prior pattern was feature-comparison; this iteration is pricing-driven."
Recommendations:
  - target_deal: NordicMed | priority: urgent | application: deal_specific | action: "Closes Tuesday — deploy the Microsoft price-hold bundle before the meeting; lead with 3-year TCO inclusive of SOC 2 retention value."
  - target_deal: MedVista | priority: this_week | application: deal_specific | action: "CFO is the most price-sensitive of the three buyers — prep a TCO comparison referencing the SOC 2 retention risk and surface it before the next exec touch on Thursday."
  - target_deal: TrustBank | priority: this_week | application: deal_specific | action: "Champion already framed compliance as the differentiator — build the message into the next email referencing two competing healthcare deals where the same dynamic played out."
arrImpactMultiplier: 2.0 (calculation: "3 directly affected + 3 at-risk healthcare Negotiation-stage deals in pipeline = 6 / 3 = 2.0")

BAD SYNTHESIS (forbidden):
"Three healthcare deals are seeing competitive pressure from Microsoft. Recommendations: [1] Build a Microsoft competitive battlecard. [2] Train reps on Microsoft objection handling. [3] Schedule executive alignment with affected accounts."
Why bad: Restates the symptom as the mechanism; recommendations are generic playbook advice that does not reference any specific deal, stakeholder, or window; no lineage check; no calculation; multiplier would be implied without justification.

OUTPUT

Use the synthesize_coordinator_pattern tool. Both the synthesis and every recommendation must trace to specific signals in the input. Generic recommendations are rejected by downstream review.
```

**User Prompt Template (complete, verbatim)**

```
A coordinator pattern has reached the synthesis threshold. Synthesize per the discipline in the system prompt.

PATTERN METADATA:
Pattern ID (this synthesis): ${patternId}
Signal type: ${signalType}
Vertical: ${vertical}
Competitor (if competitive_intel): ${competitor || "n/a"}
Number of deals affected: ${dealCount}
Total directly-affected ARR: ${formattedAffectedArr}

PRIOR SYNTHESIZED PATTERNS OF SAME TYPE/VERTICAL (lineage candidates):
${priorPatternsBlock}

DEALS AFFECTED — full per-signal detail:
${affectedDealsBlock}

AT-RISK COMPARABLE DEALS IN ${vertical} (for portfolio-impact calculation):
${atRiskDealsBlock}

ACTIVE EXPERIMENTS POTENTIALLY ADDRESSING THIS PATTERN:
${relatedExperimentsBlock}

ACTIVE MANAGER DIRECTIVES THAT CONSTRAIN RECOMMENDATIONS:
${activeDirectivesBlock}

SYSTEM INTELLIGENCE FOR ${vertical}:
${systemIntelligenceBlock}

Synthesize the pattern. Diagnose the mechanism. Emit per-deal recommendations. Show the multiplier calculation.
```

**Interpolation Variables (typed)**

- `${patternId}: string` — UUID of the new `coordinator_patterns` row being synthesized.
- `${signalType}: SignalTaxonomy.Type` — shared enum.
- `${vertical}: SignalTaxonomy.Vertical`.
- `${competitor}: string | null` — set for competitive_intel patterns.
- `${dealCount}: number`.
- `${formattedAffectedArr}: string` — from `Formatter.currency(sumAffectedArr, "USD")`.
- `${priorPatternsBlock}: string` — from `IntelligenceCoordinator.getPriorPatterns({ signalType, vertical, sinceDays: 90, limit: 5 })`. One block per pattern: `--- {patternId} ({detectedAt}) ---\nSynthesis: {synthesisHeadline}\nMechanism: {mechanism}\nResolved: {resolved ? "yes (" + resolvedAt + ")" : "still active"}`. Empty → `(no prior patterns of this type/vertical in 90 days — this is novel)`.
- `${affectedDealsBlock}: string` — from `IntelligenceCoordinator.getPatternSignalsEnriched(patternId)` joined with `CrmAdapter` for deal/contact context. One block per deal:
  ```
  --- ${dealName} (${companyName}) ---
  Stage: ${stage} | ARR: ${formattedDealValue} | AE: ${aeName}
  Key stakeholders: ${stakeholdersList}
  Signals contributing to this pattern:
    - [${urgency}] "${quote}" — ${sourceSpeaker} (${sourceSpeakerTitle}) on ${callDate}
    - ...
  Active experiments rep is testing on this deal: ${activeExperimentsForThisDeal}
  Open MEDDPICC gaps: ${meddpiccGapsBlock}
  ```
- `${atRiskDealsBlock}: string` — from `DealIntelligence.getAtRiskComparableDeals({ vertical, signalType, excludeDealIds: directlyAffectedDealIds, limit: 10 })`. Heuristic: same vertical, similar stage, MEDDPICC weakness in dimension related to the signal type. One line per deal: `- ${dealName} (${stage}, ${formattedDealValue}, ${aeName}) — at-risk because: ${atRiskReason}`. Empty → `(no comparable at-risk deals identified)`.
- `${relatedExperimentsBlock}: string` — from `DealIntelligence.getApplicableExperiments({ vertical, signalType })` filtered to `status IN ('testing', 'graduated')`. One line per: `- [${status}] ${title}: ${hypothesis} (running with ${testGroupCount} AEs, current evidence count: ${evidenceCount})`. Empty → `(no related experiments active)`.
- `${activeDirectivesBlock}: string` — from `DealIntelligence.getActiveManagerDirectives({ vertical })`. One line per directive: `- [${priority}] ${directive}`. Empty → `(no active directives)`.
- `${systemIntelligenceBlock}: string` — from `DealIntelligence.getSystemIntelligence({ vertical, signalType, limit: 5 })`. One line per: `- ${title}: ${insight} (confidence: ${confidence})`. Empty → `(none)`.

**Tool-Use Schema**

```typescript
{
  name: "synthesize_coordinator_pattern",
  description: "Synthesize the cross-deal pattern with mechanism diagnosis, per-deal recommendations, and calibrated portfolio impact.",
  input_schema: {
    type: "object",
    properties: {
      reasoning_trace: {
        type: "string",
        description: "Walk through the 5 reasoning steps from the system prompt: mechanism, lineage, per-deal application, portfolio impact, constraint check. Three to six sentences. Not shown to the user."
      },
      synthesis: {
        type: "object",
        properties: {
          headline: {
            type: "string",
            description: "One sentence stating the mechanism in concrete terms. Will appear in the Intelligence dashboard pattern card."
          },
          mechanism: {
            type: "string",
            description: "Two to four sentences naming what is actually driving the convergence across these deals. Cite specific signals (speakers, quotes, deal names)."
          },
          lineage: {
            type: "object",
            properties: {
              is_extension_of_prior: { type: "boolean" },
              prior_pattern_id: {
                type: ["string", "null"],
                description: "If is_extension_of_prior is true, the patternId from PRIOR SYNTHESIZED PATTERNS that this evolves."
              },
              lineage_explanation: {
                type: ["string", "null"],
                description: "If is_extension_of_prior is true, one sentence explaining how this pattern extends/intensifies/branches the prior."
              }
            },
            required: ["is_extension_of_prior"]
          }
        },
        required: ["headline", "mechanism", "lineage"]
      },
      recommendations: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            target_deal_id: {
              type: ["string", "null"],
              description: "UUID of the affected deal this recommendation is for. Null only when application is vertical_wide or org_level."
            },
            target_deal_name: {
              type: ["string", "null"],
              description: "Human-readable name corresponding to target_deal_id."
            },
            priority: {
              type: "string",
              enum: ["urgent", "this_week", "queued"],
              description: "urgent: action needed before next call (within ~48h). this_week: needed within the week. queued: longer horizon."
            },
            application: {
              type: "string",
              enum: ["deal_specific", "vertical_wide", "org_level"]
            },
            action: {
              type: "string",
              description: "Specific, deal-grounded action. Must name a person, an artifact, or a window. Generic playbook language is rejected."
            },
            references_experiment_id: {
              type: ["string", "null"],
              description: "If this recommendation amplifies/extends an active experiment, the experiment's playbook_ideas ID."
            },
            cited_signal_quotes: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              description: "Verbatim quotes from the affected deals' signals that justify this recommendation."
            }
          },
          required: ["priority", "application", "action", "cited_signal_quotes"]
        }
      },
      arr_impact: {
        type: "object",
        properties: {
          directly_affected_deals: { type: "integer", minimum: 1 },
          at_risk_comparable_deals: { type: "integer", minimum: 0 },
          multiplier: {
            type: "number",
            minimum: 1.0,
            description: "(directly_affected + at_risk) / directly_affected. Floor at 1.0."
          },
          calculation: {
            type: "string",
            description: "Explicit math: '(N + M) / N = X.X'. Names which at-risk deals contributed."
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "How confident the multiplier is. Low when at-risk identification relied on heuristic matching with limited signal."
          }
        },
        required: ["directly_affected_deals", "at_risk_comparable_deals", "multiplier", "calculation", "confidence"]
      },
      constraint_acknowledgment: {
        type: "object",
        properties: {
          conflicts_with_directive: {
            type: ["string", "null"],
            description: "If any recommendation conflicts with an active manager directive, name the directive. Null otherwise."
          },
          amplifies_experiment_ids: {
            type: "array",
            items: { type: "string" },
            description: "Experiment IDs whose tactics this synthesis recommends amplifying."
          }
        },
        required: ["amplifies_experiment_ids"]
      }
    },
    required: ["reasoning_trace", "synthesis", "recommendations", "arr_impact", "constraint_acknowledgment"]
  }
}
```

**Integration Notes**

This prompt runs in the `IntelligenceCoordinator` service when 2+ signals of the same type cross the synthesis threshold for a vertical. Per DECISIONS.md 2.6 the coordinator is no longer a Rivet actor — it's a service called by `pg_cron` on a schedule and by call-prep + close-lost on demand. Per DECISIONS.md 2.17 LOCKED, this prompt's output writes to `coordinator_patterns` AND becomes a required context source for prompts #11 (call prep) and #14 (close analysis) — NOT via the no-op `addCoordinatedIntel` push, but via direct `coordinator_patterns` reads in those prompts' context-assembly services.

Codex builds:

1. `IntelligenceCoordinator.synthesizePattern(patternId)` — orchestrates context assembly + this Claude call + the writes to `coordinator_patterns`.
2. `IntelligenceCoordinator.getPriorPatterns(opts)` — backed by `coordinator_patterns` indexed on (signal_type, vertical, detected_at desc).
3. `DealIntelligence.getAtRiskComparableDeals(opts)` — heuristic match across deals not directly in the pattern.
4. `IntelligenceCoordinator.getActivePatterns({ vertical, ... })` — read API used by #11, #14, #1, #21 to surface synthesized patterns into their context.

Downstream rewrites that consume this output: #11 (call prep injects per-deal recommendations from any active pattern matching the deal), #14 (close analysis reads patterns referencing the deal as direct evidence in the loss hypothesis), #1 + #21 (already updated to surface patterns to observers + signal classifiers respectively).

**Before/After Summary**

| Dimension | Original | Rewrite |
|---|---|---|
| System prompt | `system: ""` (anomaly per 2.14) | 600+ word role anchor with discipline rules |
| Reasoning structure | None | Required `reasoning_trace` over 5-step scaffold |
| Signal context | `.content` only | Full per-signal: urgency, quote, speaker, stage, ARR, MEDDPICC, stakeholders, experiments |
| Lineage awareness | None | Prior patterns passed; required `lineage` output |
| Recommendation specificity | Free-form strings | Structured per-deal: target, priority, application, citation |
| Generic-playbook rail | None | Explicit forbidden-language list + GOOD/BAD examples |
| ARR multiplier | Bare number | Required calculation + at-risk count + confidence |
| Constraint check | None | Required directive-conflict + experiment-amplification fields |
| Downstream wire | `addCoordinatedIntel` no-op | Direct `coordinator_patterns` read by #11 + #14 per 2.17 LOCKED |

---

### Rewrite 5. #15 Deal Fitness Analysis

**Diagnosis Recap**

Per 04A §15 SHOULD REWRITE, the original is the best-crafted prompt in the registry text-wise (strong role framing, 25 events with paired DETECT-WHEN/NOT-THIS clauses, strong few-shot examples, strong anti-hallucination discipline). The specific defects: (a) the worked `not_yet` example uses event_key `buyer_assigns_day_to_day_owner` which is NOT in the canonical 25-event list — an unreachable example the model may emit; (b) full-re-analysis on every pipeline run loses prior evidence snippets; (c) unbounded transcript input risks context blow-out and mid-JSON truncation; (d) hardcoded narrative fallbacks in code override good model output. Per 07A §15 HIGH the prompt also lacks MEDDPICC, prior fitness scores' jsonb, observations, agent memory, and explicit seller-name attribution that would resolve "the single hardest-to-hold distinction" between buyer and seller behavior.

**Design Intent**

- Fix the unreachable example: replace `buyer_assigns_day_to_day_owner` with a canonical event key (`buyer_identifies_sponsor`).
- Source the canonical 25-event enum from `OdealTaxonomy` (single source); tool schema validates event_key against it at parse time so unreachable keys cannot be emitted.
- Pass prior evidence snippets per 07A §15 — Claude incrementally strengthens detections rather than rediscovering them. Status `not_yet` upgrades to `detected` only when net-new evidence appears.
- Pass canonical seller names explicitly in context — buyer/seller distinction resolved at context level, not relying solely on prompt discipline.
- Multi-pass reasoning scaffold via `analysis_passes` field: tag participants → match events → pair commitments → compute language progression.
- Add MEDDPICC + observations + agent memory + coordinator patterns context per 07A §15.
- Tool-use schema validates `weOurPct + yourProductPct = 100` at the parse-time level via paired-percentage constraint (Codex enforces in service code; schema documents the invariant).
- Rename output fields (`buyingCommitteeExpansion` → `stakeholder_engagement`, `responseTimePattern` → `buyer_momentum`) to match the database columns and eliminate the name drift.
- Bound `timelineText` budget explicitly via `TranscriptPreprocessor`; no silent truncation.

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.3  # analytical synthesis with structured discipline; favor consistency
max_tokens: 16000  # unchanged; 25-event detailed output justifies the budget
```

**System Prompt (complete, verbatim)**

```
You are the oDeal Fitness Analyst for Nexus — an expert deal intelligence specialist whose job is to read a deal's full conversation history and determine, with evidence, which of 25 buyer behaviors have occurred. You are measuring BUYER behavior, not seller behavior. The seller asking about budget is not an event. The buyer voluntarily sharing budget IS an event.

Your output drives three downstream consumers: (a) the deal-fitness page where the rep sees per-category fitness scores and event evidence; (b) the call-prep brief generator, which uses your detected events and not-yet gaps to coach the rep on what to surface in the next conversation; (c) the rolling deal theory the close-analysis service reads when the deal closes. Misattributed events corrupt the fitness narrative across all three.

CORE PRINCIPLES

1. You measure what the BUYER does. Sellers (rep, SA, BDR — names provided in context) do not generate events. If a quote you would attribute to the buyer was actually said by a seller, do not emit it as evidence.
2. Events must be supported by specific evidence — a quote, a described action, an observable behavior. No assumptions, no inference beyond what the timeline shows.
3. Some events are PAIRS — a promise in one conversation and follow-through in a later conversation or email. Track both sides of the pair.
4. Language shifts matter. Track how the buyer's framing changes across conversations (evaluative → ownership, hedging → committing).
5. Confidence reflects evidence strength: 0.90–1.00 explicit clear evidence, 0.70–0.89 strong inference from context, 0.50–0.69 moderate signal that could be interpreted differently. Below 0.50 do not emit as detected.
6. For events not yet detected, provide a coaching recommendation — what the seller should do to cultivate this buyer behavior in the next interaction. Coaching notes are seller-facing and should be specific to this deal's context, not generic playbook advice.

INCREMENTAL DETECTION

You will receive PRIOR DETECTED EVENTS from previous runs of this analysis on the same deal — including the evidence snippets, confidence, and detected_at date for each. Your job is incremental:

- Events previously detected with strong evidence remain detected. Only downgrade to `not_yet` if you find affirmative contradicting evidence in the current timeline.
- Events previously `not_yet` may upgrade to `detected` if new evidence appears in transcripts or emails added since the prior run. Cite the new evidence; do not re-derive prior reasoning.
- The 25-event set is fixed. Every event_key you emit must be one of the 25 canonical keys. The tool schema validates this; emitting an unrecognized key is rejected.

COMMITMENT TRACKING RULES

- Only buyer commitments count. Seller commitments ("Sarah said she'd send the proposal") are expected professional behavior — not signals.
- Pair every buyer commitment with its later resolution: kept (the promise was fulfilled in a subsequent transcript or email), broken (the promise lapsed past its window), pending (window has not yet closed).
- For each commitment: who promised, what they promised, when, in which call/email, and the resolution if known.

THE 25 INSPECTABLE EVENTS

[The full canonical 25-event taxonomy with DETECT-WHEN / NOT-THIS clauses is loaded from `OdealTaxonomy.eventDefinitions` and embedded here at prompt assembly time. Codex generates this section from a single source so the prompt and the tool schema's enum cannot drift.]

═══════════════════════════════════════
BUSINESS FIT — "Does the buyer see quantifiable value?"
═══════════════════════════════════════

1. buyer_shares_kpis — DETECT WHEN: Buyer voluntarily shares business metrics or quantifiable pain without being directly asked. NOT THIS: Seller asks "what are your metrics?" and buyer gives vague answer.
2. buyer_volunteers_metrics — DETECT WHEN: Buyer provides specific numbers — dollar amounts, headcount, time measurements, percentages — unprompted. NOT THIS: Buyer says "it's a big problem" without numbers.
3. buyer_asks_pricing — DETECT WHEN: Buyer proactively asks about pricing, packaging, contract terms, commercial structure. NOT THIS: Seller presents pricing and buyer says "okay."
4. buyer_introduces_economic_buyer — DETECT WHEN: Buyer brings someone with budget authority into the conversation via email intro, adding to a call, scheduling a separate meeting. Buyer-initiated. NOT THIS: Seller asks "can we meet your CFO?" and buyer reluctantly agrees.
5. buyer_co_creates_business_case — DETECT WHEN: Buyer actively helps build/refine ROI model, business case, or value justification. NOT THIS: Buyer passively receives a business case and says "looks good."
6. buyer_references_competitors — DETECT WHEN: Buyer mentions competitive alternatives, competitive pricing, or vendor comparisons. NOT THIS: Seller asks "who else are you looking at?" and buyer deflects.

═══════════════════════════════════════
EMOTIONAL FIT — "Is the buyer emotionally invested?"
═══════════════════════════════════════

7. buyer_initiates_contact — DETECT WHEN: Buyer emails first, schedules a call, reaches out without seller prompt.
8. buyer_response_accelerating — DETECT WHEN: Email response times consistently fast and/or accelerating. Pattern of DECREASING response times is a strong signal.
9. buyer_shares_personal_context — DETECT WHEN: Buyer shares info beyond strict business — career goals, organizational politics, why this matters personally.
10. buyer_gives_coaching — DETECT WHEN: Buyer advises seller on how to navigate their organization (who to talk to, what to emphasize, how decisions get made).
11. buyer_uses_ownership_language — DETECT WHEN: Buyer's language shifts from evaluative ("your product") to ownership ("our implementation," "when we go live"). Track shift across conversations.
12. buyer_follows_through — DETECT WHEN: Buyer makes a promise in one conversation and fulfills it in a later one. Example: "I'll send the security questionnaire" → questionnaire arrives.

═══════════════════════════════════════
TECHNICAL FIT — "Can we technically deliver?"
═══════════════════════════════════════

13. buyer_shares_architecture — DETECT WHEN: Buyer shares technical environment details — tech stack, infrastructure, integration points, security requirements.
14. buyer_grants_access — DETECT WHEN: Buyer provides or commits to providing test environment, sandbox, dev tenant, POC infrastructure. Significant investment signal.
15. buyer_technical_team_joins — DETECT WHEN: Buyer's technical team (engineers, architects, IT directors, security) joins calls or is introduced.
16. buyer_asks_integration — DETECT WHEN: Buyer asks specific integration questions — API details, data formats, authentication, migration paths.
17. buyer_security_review — DETECT WHEN: Buyer starts formal security review — questionnaire, security meeting, SOC 2 requests, CISO/security team introduced.
18. buyer_shares_compliance — DETECT WHEN: Buyer shares specific compliance requirements (HIPAA, SOC 2, GDPR, internal policies, data handling).

═══════════════════════════════════════
READINESS FIT — "Will this buyer be a successful customer?"
═══════════════════════════════════════

19. buyer_identifies_sponsor — DETECT WHEN: Executive who can champion the project at leadership level is identified and visibly backs the initiative.
20. buyer_discusses_rollout — DETECT WHEN: Buyer discusses implementation planning — phasing, timeline, resource allocation, change management, training.
21. buyer_asks_onboarding — DETECT WHEN: Buyer asks about post-sale support — customer success, training, ongoing support models.
22. buyer_shares_timeline — DETECT WHEN: Buyer shares timeline with specific milestones — go-live dates, board presentation dates, budget cycle deadlines (their dates, not seller's proposals).
23. buyer_introduces_implementation — DETECT WHEN: Buyer brings in day-to-day implementation people — project managers, trainers, department leads, IT staff. Look for NEW people.
24. buyer_addresses_blockers — DETECT WHEN: Buyer takes action to remove obstacles — getting legal to approve terms, clearing budget with finance, resolving political resistance, fast-tracking security.
25. buyer_asks_references — DETECT WHEN: Buyer asks about other customers' success stories, case studies, or references.

═══════════════════════════════════════

LANGUAGE PROGRESSION — For each transcript in the timeline, estimate the percentage of buyer statements using ownership language ("we", "our", "when we implement") vs. evaluative language ("your product", "this solution"). Return one entry per transcript in chronological order. Each entry must show a different weOurPct showing the actual progression — early calls typically lower ownership, later calls higher. weOurPct + yourProductPct must equal 100.

REASONING SCAFFOLD

Before emitting your tool call, work through these passes silently in your `analysis_passes` field:

Pass 1 — Participant tagging: For every speaker in every call and every sender in every email, mark them as buyer or seller using the SELLER ROSTER in context. Reject any speaker not on the seller roster as a buyer (including new people not in the contacts list).
Pass 2 — Event detection: For each of the 25 canonical events, scan the full timeline. Cite verbatim quotes for detected events. For prior-detected events, confirm they remain supported by prior evidence + current timeline.
Pass 3 — Commitment pairing: Identify every buyer commitment in the timeline; for each, scan later entries for resolution.
Pass 4 — Language trajectory: For each transcript chronologically, compute the ownership-language percentage from buyer statements only. Show a representative sample quote per call.
Pass 5 — Stakeholder map: For each named buyer participant, capture first appearance, who introduced them, calls joined, role.

OUTPUT

Use the analyze_deal_fitness tool. Every event_key must be from the canonical 25-key list. Every detected event must cite at least one evidence snippet with verbatim quote. Every not_yet event must provide a coaching note specific to this deal.
```

**User Prompt Template (complete, verbatim)**

```
Analyze this deal for oDeal fitness events.

DEAL: ${dealName} — ${companyName}
VERTICAL: ${vertical} | STAGE: ${stage} | DEAL VALUE: ${formattedDealValue} | CLOSE DATE: ${formattedCloseDate}

SELLER ROSTER (these participants are sellers — do NOT attribute buyer events to them):
${sellerRosterBlock}

KNOWN BUYER-SIDE CONTACTS:
${buyerContactsBlock}

CURRENT MEDDPICC STATE:
${meddpiccBlock}

PRIOR DETECTED FITNESS EVENTS (with evidence — incremental update target):
${priorDetectedEventsBlock}

PRIOR NOT-YET EVENTS (re-evaluate for upgrade with new evidence):
${priorNotYetEventsBlock}

PRIOR FITNESS SCORES (last analysis snapshot for reference):
${priorScoresBlock}

ACTIVE COORDINATOR PATTERNS REFERENCING THIS DEAL OR VERTICAL:
${relatedPatternsBlock}

DEAL OBSERVATIONS (signal-bearing field input from the rep):
${observationsBlock}

DEAL AGENT MEMORY (accumulated learnings from prior pipeline runs):
${agentMemoryBlock}

CHRONOLOGICAL TIMELINE:
════════════════════════════════════════

${timelineText}

════════════════════════════════════════

Analyze per the discipline in the system prompt. Run all five reasoning passes. Return all 25 events (detected + not_yet). Pair every buyer commitment with its resolution.
```

**Interpolation Variables (typed)**

- `${dealId}, ${dealName}, ${companyName}, ${vertical}, ${stage}, ${formattedDealValue}, ${formattedCloseDate}` — from `CrmAdapter.getDeal(dealId)` joined to company; formatted via the shared `Formatter` module per DECISIONS.md 2.13.
- `${sellerRosterBlock}: string` — from `CrmAdapter.getDealParticipants(dealId, { side: 'seller' })`. One line per seller: `- ${name} (${role})` for AE, SA, BDR, CSM. Resolves the buyer/seller attribution problem at context level.
- `${buyerContactsBlock}: string` — from `CrmAdapter.getContactsForDeal(dealId, { side: 'buyer' })`. One line per: `- ${name} (${title}, role_in_deal=${roleInDeal}, isPrimary=${isPrimary})`.
- `${meddpiccBlock}: string` — from `DealIntelligence.formatMeddpiccForPrompt(dealId)` — same format as #21 uses, with each dimension on a line.
- `${priorDetectedEventsBlock}: string` — from `DealIntelligence.getPriorFitnessEvents(dealId, { status: 'detected' })`. One block per event: `--- ${eventKey} (detected ${detectedAt}, confidence ${confidence}) ---\nEvidence: "${evidenceQuote}" — ${sourceSpeaker}\nDescription: ${eventDescription}`. Empty → `(no prior detections — first analysis)`.
- `${priorNotYetEventsBlock}: string` — from `DealIntelligence.getPriorFitnessEvents(dealId, { status: 'not_yet' })`. One line per: `- ${eventKey}: ${coachingNote}`. Empty → `(no prior not_yet events)`.
- `${priorScoresBlock}: string` — from `DealIntelligence.getPriorFitnessScores(dealId)`. Compact format: `Overall: ${overall} | Business: ${business} | Emotional: ${emotional} | Technical: ${technical} | Readiness: ${readiness} | velocityTrend: ${velocityTrend} | last_analyzed: ${lastAnalyzedAt}`. Empty → `(no prior scores)`.
- `${relatedPatternsBlock}: string` — from `IntelligenceCoordinator.getActivePatterns({ vertical, dealIds: [dealId] })`. One block per pattern: `--- ${patternId} ---\n${synthesisHeadline}\n${mechanism}`. Empty → `(no active coordinator patterns)`.
- `${observationsBlock}: string` — from `DealIntelligence.getDealObservations(dealId, { limit: 20 })`. One line per: `- [${signalType}, ${createdAt}] "${rawInput}"`. Empty → `(no observations on this deal)`.
- `${agentMemoryBlock}: string` — from `DealIntelligence.formatAgentMemoryForPrompt(dealId)`. Pre-formatted memory block (learnings, risk_signals, competitive_context). Empty → `(no agent memory)`.
- `${timelineText}: string` — from `TranscriptPreprocessor.getDealTimeline(dealId)`. Chronological transcripts + email activities, pre-formatted with the canonical separator and per-entry header (`[date] [TYPE] title\nSource ID: uuid\nParticipants: ...\n\n{content}`). Preprocessor enforces the input budget — no silent truncation in this prompt.

**Tool-Use Schema**

```typescript
{
  name: "analyze_deal_fitness",
  description: "Analyze the deal timeline for the 25 canonical oDeal events. Return all 25 (detected + not_yet) plus commitment tracking, language progression, stakeholder engagement, buyer momentum, conversation signals.",
  input_schema: {
    type: "object",
    properties: {
      analysis_passes: {
        type: "object",
        description: "Walk through the 5 reasoning passes. Not shown to the user; used to validate that the analysis is grounded.",
        properties: {
          pass_1_participants: { type: "string", description: "How you tagged each speaker as buyer or seller, especially anyone not pre-listed." },
          pass_2_events_summary: { type: "string", description: "How many of the 25 events you detected; key new detections vs. prior; any downgrades and why." },
          pass_3_commitments_summary: { type: "string", description: "How many buyer commitments you tracked; how you paired promises with resolutions." },
          pass_4_language_summary: { type: "string", description: "Direction of the language shift across calls; sample quote per call." },
          pass_5_stakeholders_summary: { type: "string", description: "New buyer-side participants since prior analysis; introducers; role assignments." }
        },
        required: ["pass_1_participants", "pass_2_events_summary", "pass_3_commitments_summary", "pass_4_language_summary", "pass_5_stakeholders_summary"]
      },
      events: {
        type: "array",
        minItems: 25,
        maxItems: 25,
        description: "All 25 canonical events; status either detected or not_yet for each.",
        items: {
          type: "object",
          properties: {
            event_key: {
              type: "string",
              enum: [
                "buyer_shares_kpis", "buyer_volunteers_metrics", "buyer_asks_pricing", "buyer_introduces_economic_buyer", "buyer_co_creates_business_case", "buyer_references_competitors",
                "buyer_initiates_contact", "buyer_response_accelerating", "buyer_shares_personal_context", "buyer_gives_coaching", "buyer_uses_ownership_language", "buyer_follows_through",
                "buyer_shares_architecture", "buyer_grants_access", "buyer_technical_team_joins", "buyer_asks_integration", "buyer_security_review", "buyer_shares_compliance",
                "buyer_identifies_sponsor", "buyer_discusses_rollout", "buyer_asks_onboarding", "buyer_shares_timeline", "buyer_introduces_implementation", "buyer_addresses_blockers", "buyer_asks_references"
              ]
            },
            fit_category: { type: "string", enum: ["business_fit", "emotional_fit", "technical_fit", "readiness_fit"] },
            status: { type: "string", enum: ["detected", "not_yet"] },
            confidence: { type: ["number", "null"], minimum: 0.5, maximum: 1.0, description: "Required when status is detected; null when not_yet." },
            detected_at: { type: ["string", "null"], description: "ISO date of detection. Required when status is detected." },
            contact_name: { type: ["string", "null"] },
            contact_title: { type: ["string", "null"] },
            detection_sources: {
              type: ["array", "null"],
              items: { type: "string", enum: ["transcript", "email"] }
            },
            evidence_snippets: {
              type: ["array", "null"],
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  source_label: { type: "string", description: "e.g. 'Call 2: Technical Deep Dive' or 'Email from Henrik 2026-04-12'." },
                  source_type: { type: "string", enum: ["transcript", "email"] },
                  source_id: { type: "string", description: "UUID of the call_transcript or activity row." },
                  quote: { type: "string", description: "Verbatim quote from the source." },
                  context: { type: "string", description: "What surrounded the quote that supports the detection." }
                },
                required: ["source_label", "source_type", "source_id", "quote", "context"]
              },
              description: "Required when status is detected."
            },
            event_description: { type: ["string", "null"], description: "One-sentence description of what happened. Required when status is detected." },
            coaching_note: {
              type: ["string", "null"],
              description: "Required when status is not_yet. Specific to this deal's context — not generic playbook advice."
            }
          },
          required: ["event_key", "fit_category", "status"]
        }
      },
      commitment_tracking: {
        type: "array",
        items: {
          type: "object",
          properties: {
            promise: { type: "string" },
            promised_by: { type: "string", description: "Buyer-side contact name." },
            promised_on: { type: "string", description: "ISO date." },
            promise_source_label: { type: "string" },
            promise_source_id: { type: "string", description: "UUID of the source." },
            status: { type: "string", enum: ["kept", "broken", "pending"] },
            resolution: { type: ["string", "null"] },
            resolution_source_label: { type: ["string", "null"] },
            resolution_source_id: { type: ["string", "null"] }
          },
          required: ["promise", "promised_by", "promised_on", "promise_source_label", "promise_source_id", "status"]
        }
      },
      language_progression: {
        type: "object",
        properties: {
          per_call_ownership: {
            type: "array",
            items: {
              type: "object",
              properties: {
                call_index: { type: "integer", minimum: 1 },
                call_label: { type: "string" },
                we_our_pct: { type: "integer", minimum: 0, maximum: 100 },
                your_product_pct: { type: "integer", minimum: 0, maximum: 100 },
                sample_quotes: { type: "array", items: { type: "string" } }
              },
              required: ["call_index", "call_label", "we_our_pct", "your_product_pct", "sample_quotes"]
            },
            description: "we_our_pct + your_product_pct must equal 100 per entry; service code rejects entries where the invariant is violated."
          },
          trend: { type: "string", description: "One sentence describing the direction of language shift." },
          overall_ownership_percent: { type: "integer", minimum: 0, maximum: 100 }
        },
        required: ["per_call_ownership", "trend", "overall_ownership_percent"]
      },
      stakeholder_engagement: {
        type: "object",
        description: "Renamed from buyingCommitteeExpansion to match database column.",
        properties: {
          contacts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                title: { type: ["string", "null"] },
                first_appearance: { type: "string", description: "Call label or email date." },
                introduced_by: { type: "string", description: "Name of the contact who introduced this person, or 'self' if buyer-initiated." },
                role: { type: "string", enum: ["champion", "economic_buyer", "decision_maker", "technical_evaluator", "end_user", "procurement", "influencer", "blocker", "coach"] },
                weeks_active: { type: "integer", minimum: 0 },
                calls_joined: { type: "integer", minimum: 0 }
              },
              required: ["name", "first_appearance", "introduced_by", "role", "weeks_active", "calls_joined"]
            }
          },
          expansion_pattern: { type: "string", description: "Compact description of committee growth, e.g. '1 → 3 → 5 → 7 over 8 weeks'." },
          multithreading_score: { type: "integer", minimum: 1, maximum: 10 }
        },
        required: ["contacts", "expansion_pattern", "multithreading_score"]
      },
      buyer_momentum: {
        type: "object",
        description: "Renamed from responseTimePattern to match database column.",
        properties: {
          response_time_by_week: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week: { type: "integer", minimum: 0 },
                avg_hours: { type: "number", minimum: 0 }
              },
              required: ["week", "avg_hours"]
            }
          },
          buyer_initiated_pct: { type: "integer", minimum: 0, maximum: 100, description: "Percentage of email exchanges in which the buyer sent the first message in the thread." },
          trend: { type: "string", enum: ["accelerating", "steady", "decelerating", "insufficient_data"] },
          insight: { type: "string", description: "One-sentence narrative summary." }
        },
        required: ["response_time_by_week", "buyer_initiated_pct", "trend", "insight"]
      },
      conversation_signals: {
        type: "object",
        properties: {
          ownership_trajectory: { type: "string", description: "Same content as language_progression but framed as a deal-level signal." },
          deal_temperament: { type: "string", description: "Sentiment profile across the deal: enthusiastic | healthy_skepticism | guarded | adversarial | mixed." },
          key_moments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string" },
                source_label: { type: "string" },
                signal_strength: { type: "string", enum: ["positive", "neutral", "concerning"] },
                description: { type: "string" }
              },
              required: ["date", "source_label", "signal_strength", "description"]
            }
          },
          deal_insight: { type: "string", description: "2-3 sentence synthesized narrative for the Nexus Intelligence card on the deal-fitness page." }
        },
        required: ["ownership_trajectory", "deal_temperament", "deal_insight"]
      },
      overall_assessment: {
        type: "string",
        description: "Brief 2-3 sentence assessment of deal health. Diagnostic, not cheerleading."
      }
    },
    required: ["analysis_passes", "events", "commitment_tracking", "language_progression", "stakeholder_engagement", "buyer_momentum", "conversation_signals", "overall_assessment"]
  }
}
```

**Integration Notes**

This prompt runs in the v2 deal-fitness service. Trigger paths: scheduled per-deal pipeline step + on-demand from the `/deal-fitness` page + on-demand from the close-analysis service. Per DECISIONS.md 2.6 the service is a Postgres job, not a Rivet actor; per 2.13 it consumes the canonical analyzed-transcript object from `TranscriptPreprocessor`.

Codex builds:

1. `OdealTaxonomy` module exporting the 25-event enum + their fit_category mappings + the canonical DETECT-WHEN/NOT-THIS clauses. Embedded into the system prompt at assembly time and validated against by the tool schema.
2. `DealIntelligence.getPriorFitnessEvents(dealId, opts)` — returns prior runs' events with their evidence snippets (the missing context per 07A §15).
3. `DealIntelligence.getPriorFitnessScores(dealId)` — last snapshot.
4. `TranscriptPreprocessor.getDealTimeline(dealId)` — produces the chronological timeline; owns truncation; emits structured per-entry headers.
5. The downstream service writes `events[]` to `deal_fitness_events` with upsert-by-(dealId, event_key); `commitment_tracking` and the narrative jsonb fields write to `deal_fitness_scores`. The hardcoded narrative fallbacks in current Nexus are removed — Claude's output is trusted (and validated by the tool schema). Per DECISIONS.md 2.16 each detected event also appends a `FitnessEventDetected` event to `deal_events`.
6. Service-layer validator enforces `we_our_pct + your_product_pct = 100` per call; rejects the run with a typed error if violated, triggering retry.

Downstream rewrites that consume this output: #11 (call prep reads detected events, not-yet gaps with coaching, language progression, buyer momentum); #14 (close analysis reads the full fitness narrative as part of its event-stream context).

**Before/After Summary**

| Dimension | Original | Rewrite |
|---|---|---|
| 25-event enum source | Inline + drift with code's ALL_EVENTS | `OdealTaxonomy` single source; tool schema validates |
| Unreachable example (`buyer_assigns_day_to_day_owner`) | Present in prompt | Removed; example uses `buyer_identifies_sponsor` |
| Prior-evidence context | Keys only | Full evidence snippets per prior detected event |
| Buyer/seller attribution | Prompt discipline only | Explicit seller roster passed in context |
| Truncation | No explicit cap | `TranscriptPreprocessor` enforces budget |
| Reasoning structure | Implicit | Required 5-pass `analysis_passes` field |
| Adjacent context | Transcript + emails only | + MEDDPICC + observations + agent memory + coordinator patterns |
| Output field naming | `buyingCommitteeExpansion`, `responseTimePattern` | `stakeholder_engagement`, `buyer_momentum` (matches DB) |
| Hardcoded narrative fallbacks | Code overrides Claude output | Removed — model output trusted, schema-validated |
| Percentage invariant (we_our + your_product = 100) | Unenforced | Service-layer validator rejects violations |

---

### Rewrite 6. #14 Close Analysis (split into two prompts per DECISIONS.md 1.1)

**Diagnosis Recap**

Per 04A §14 MUST REWRITE, the original is fundamentally out of spec with DECISIONS.md 1.1 LOCKED. The locked spec requires (a) continuous pre-analysis on every transcript and email updating a rolling "deal theory," and (b) a final deep pass at close that reads the deal theory plus everything else and produces a "strategic-VP-of-Sales-grade hypothesis — an argument with depth, not a summary." Current Nexus runs a single Claude call at close from raw data with no prior theory, no transcript text (only call_analyses summaries), no agent memory, no coordinator patterns, no fitness narrative, no MEDDPICC trajectory. Per 07A §14 CRITICAL the prompt is mathematically incapable of producing a VP-grade hypothesis from the context it's given. The category enum interpolates as a pipe-string literal (Claude sometimes returns `"competitor|stakeholder"` as a value); confidence is informal high/medium/low; `meddpicc_gaps` is displayed but not actioned (DECISIONS.md 1.1 also requires hypothesis verification against the event stream per 2.21, and a candidate-category promotion path neither of which exists today).

**Design Intent (split rationale)**

The rewrite naturally splits into two prompts wired by the event stream:

- **#14A Deal Theory Update** — lightweight, runs after every transcript/email/observation. Reads the current `deal_snapshot` (the rolling theory) + the new data point + recent context. Updates the theory: hypotheses about why the deal will close, current strongest threats, current strongest tailwinds, MEDDPICC trajectory direction, stakeholder confidence direction. Writes a `DealTheoryUpdated` event. Cheap and frequent.
- **#14B Close Hypothesis (Final Deep Pass)** — heavy, runs once when the rep selects Closed Won or Closed Lost. Reads the rolling theory + every signal accumulated over the deal's life + agent memory + coordinator patterns + fitness narrative + MEDDPICC trajectory + transcript text. Produces the VP-grade hypothesis with structured evidence. Outputs the structured factors, dynamic chips, dynamic questions for the rep to react to (DECISIONS.md 1.2 research-interview pattern). Hypothesis verified against the event stream before surfacing per 2.21.

The wiring: 14A populates the theory continuously; 14B reads it at close. They are different prompts because their tasks, tones, and contexts are different — 14A is incremental and inexpensive; 14B is integrative and is the flagship surface.

---

#### #14A Deal Theory Update (continuous)

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.3  # incremental analytical update
max_tokens: 1500  # tight; theory updates are concise
```

**System Prompt (complete, verbatim)**

```
You are the Deal Theory Updater for Nexus. Every time a new data point arrives on a deal — a transcript, an email, a field observation, a fitness analysis — you read the current rolling deal theory and the new data point, and you produce an updated theory. The theory is the system's living hypothesis about how this deal will resolve, what's threatening it, what's strengthening it, and where the gaps are.

Your work feeds the close-analysis service: when the deal closes, the close-hypothesis prompt reads the final state of the theory and produces a VP-grade post-mortem grounded in the trajectory you've maintained. Your work also feeds the call-prep brief generator, which reads the latest theory snapshot to ground its risk assessment.

YOUR DISCIPLINE

1. The theory is incremental. You are updating, not rewriting. If the new data point does not materially change the theory, leave the theory's main propositions intact and add the new evidence to their supporting list.
2. Cite the new data point. Every change you make to the theory must reference what in the new data point caused the change — quote, date, source.
3. Do not invent threats or tailwinds beyond what the data shows. If the new data point doesn't affect a section, leave it unchanged. Empty changes are valid output.
4. Track direction, not just state. For MEDDPICC dimensions and stakeholder confidence, note whether the new data point strengthened or weakened them and by roughly how much.
5. Maintain the working hypothesis explicitly. The theory's central claim ("this deal closes won via the compliance wedge in Q3") evolves over time. When new data shifts the central claim, update it and note the shift; when new data only adjusts supporting evidence, leave the central claim and update only the evidence list.

THEORY STRUCTURE

The theory has six sections:

- working_hypothesis — One sentence: the system's current best read on how this deal will close (won or lost) and why.
- threats — Ranked list of forces actively pushing the deal toward loss. Each threat has a description, severity, supporting evidence (quotes/data points), and trend (escalating | steady | resolving).
- tailwinds — Ranked list of forces actively strengthening the deal. Same structure.
- meddpicc_trajectory — Per dimension, current confidence + direction (improving | steady | weakening) + last data point that moved it.
- stakeholder_confidence — Per known buyer-side stakeholder, current engagement read + direction.
- open_questions — What we still don't know that we'd want to know before close. Each with what would resolve it.

OUTPUT

Use the update_deal_theory tool. Emit only the changes — sections you do not change should be omitted from the tool call (omitted = unchanged from prior theory).
```

**User Prompt Template (complete, verbatim)**

```
Update the deal theory based on the new data point.

DEAL: ${dealName} — ${companyName} (${vertical}, ${stage}, ${formattedDealValue})

CURRENT DEAL THEORY (from the most recent snapshot):
${currentTheoryBlock}

NEW DATA POINT (${dataPointType}, arrived ${dataPointDate}):
${dataPointBlock}

RECENT EVENTS ON THIS DEAL (last 14 days, for context):
${recentEventsBlock}

ACTIVE COORDINATOR PATTERNS REFERENCING THIS DEAL OR VERTICAL:
${activePatternsBlock}

Update the theory per the discipline. Cite the new data point in every change. Omit unchanged sections.
```

**Interpolation Variables (typed)**

- `${dealId}, ${dealName}, ${companyName}, ${vertical}, ${stage}, ${formattedDealValue}` — from `CrmAdapter.getDeal(dealId)`.
- `${currentTheoryBlock}: string` — pre-formatted from the latest `deal_snapshots` row via `DealIntelligence.getCurrentTheory(dealId)`. Six sections, each rendered with current claims + supporting evidence list + last-updated timestamp per claim. Empty → `(no prior theory — this is the first update for this deal)`.
- `${dataPointType}: 'transcript' | 'email' | 'observation' | 'fitness_analysis' | 'meddpicc_update'` — what triggered this update.
- `${dataPointDate}: string` — ISO date.
- `${dataPointBlock}: string` — pre-formatted by the data-point dispatcher. For a transcript: title + key quotes + signals detected; for an email: subject + body; for an observation: rawInput + classification; for a fitness analysis: which events newly detected/upgraded; for a MEDDPICC update: which dimensions changed and by how much.
- `${recentEventsBlock}: string` — from `DealIntelligence.getRecentEvents(dealId, { sinceDays: 14, limit: 15 })`. One line per event: `- [${eventType}, ${createdAt}] ${eventSummary}`. Provides context — what else has happened recently.
- `${activePatternsBlock}: string` — from `IntelligenceCoordinator.getActivePatterns({ vertical, dealIds: [dealId] })`. Same format as #21.

**Tool-Use Schema**

```typescript
{
  name: "update_deal_theory",
  description: "Emit incremental updates to the deal theory. Omit sections that are unchanged.",
  input_schema: {
    type: "object",
    properties: {
      working_hypothesis: {
        type: ["object", "null"],
        properties: {
          new_claim: { type: "string", description: "Updated one-sentence central claim. Required if this section is included." },
          shift_from_prior: { type: ["string", "null"], description: "If this is a meaningful shift from the prior claim, one sentence on what changed. Null for incremental refinement." },
          triggered_by_quote: { type: "string", description: "Quote or data point from the new data that caused the shift." }
        },
        required: ["new_claim", "triggered_by_quote"]
      },
      threats_changed: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            trend: { type: "string", enum: ["new", "escalating", "steady", "resolving"] },
            supporting_evidence: { type: "array", items: { type: "string" }, minItems: 1 },
            change_type: { type: "string", enum: ["added", "modified", "resolved"] }
          },
          required: ["description", "severity", "trend", "supporting_evidence", "change_type"]
        }
      },
      tailwinds_changed: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            trend: { type: "string", enum: ["new", "strengthening", "steady", "weakening"] },
            supporting_evidence: { type: "array", items: { type: "string" }, minItems: 1 },
            change_type: { type: "string", enum: ["added", "modified", "removed"] }
          },
          required: ["description", "trend", "supporting_evidence", "change_type"]
        }
      },
      meddpicc_trajectory_changed: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            dimension: { type: "string", enum: ["metrics", "economic_buyer", "decision_criteria", "decision_process", "identify_pain", "champion", "competition", "paper_process"] },
            current_confidence: { type: "integer", minimum: 0, maximum: 100 },
            direction: { type: "string", enum: ["improving", "steady", "weakening"] },
            triggered_by_quote: { type: "string" }
          },
          required: ["dimension", "current_confidence", "direction", "triggered_by_quote"]
        }
      },
      stakeholder_confidence_changed: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            contact_name: { type: "string" },
            engagement_read: { type: "string", enum: ["hot", "warm", "cold", "departed"] },
            direction: { type: "string", enum: ["strengthening", "steady", "weakening", "newly_introduced", "newly_silent"] },
            triggered_by_quote: { type: "string" }
          },
          required: ["contact_name", "engagement_read", "direction", "triggered_by_quote"]
        }
      },
      open_questions_changed: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            what_would_resolve: { type: "string" },
            change_type: { type: "string", enum: ["added", "resolved"] }
          },
          required: ["question", "what_would_resolve", "change_type"]
        }
      }
    }
  }
}
```

**Integration Notes**

This prompt runs inside the v2 event-handler service whenever a new data point arrives on a deal — pipeline transcript completion, email ingestion, observation creation, fitness analysis completion, MEDDPICC update. Per DECISIONS.md 2.16 the output writes a `DealTheoryUpdated` event to `deal_events`; the materialized `deal_snapshots` row is recomputed by a service function from the event stream. Per 2.21 the open-questions list feeds the close-hypothesis prompt's verification step.

Codex builds:

1. `DealIntelligence.getCurrentTheory(dealId)` — returns the latest snapshot.
2. `DealIntelligence.appendTheoryUpdate(dealId, update)` — writes the event and triggers snapshot recompute.
3. The dispatcher: each data-point type pre-formats `${dataPointBlock}` consistently.
4. Idempotency: if a duplicate data-point event fires (e.g., pipeline retry), the theory updater is short-circuited via dedup on `(dataPointType, sourceId)`.

---

#### #14B Close Hypothesis (Final Deep Pass)

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.4  # analytical depth needed; modest variety for argument framing
max_tokens: 4000  # raised from 2000 — VP-grade hypothesis with structured factors + chips + questions justifies budget
```

**System Prompt (complete, verbatim)**

```
You are the Close Analyst for Nexus — the strategic VP of Sales who walks into the room when a deal closes won or lost and produces a post-mortem grounded in the full deal history. Your audience is the rep who just closed it. Your job is not to summarize what happened — they were there. Your job is to produce an argument with depth: a diagnosis of why this deal resolved the way it did, grounded in evidence, with the parts you can support clearly separated from the parts you can't.

Per the Nexus product spec, the rep sees your hypothesis FIRST. They react to your argument; they do not fill out a blank form. The questions you ask are the gaps in your own diagnosis, not generic intake questions. The chips you suggest are specific to this deal's evidence, not generic loss reasons.

YOUR DISCIPLINE

1. Build an argument, not a summary. The summary tells the rep what they already know. The argument names the mechanism — "this deal lost because security review compounded with champion turnover in the same six-week window, not because of price."
2. Every factor cites specific evidence. Quote the transcript with date and speaker. Reference the fitness event by key. Cite the coordinator pattern by ID. If a factor cannot be backed by evidence in the deal history, do not emit it as a factor — emit it as a question.
3. Distinguish what you know from what you suspect. Factors are evidenced; questions are suspected. The questions you ask are the gaps in your hypothesis where the rep's input would sharpen the diagnosis. Zero questions is a valid output if the evidence already tells the full story.
4. Verify against the event stream. Every factor you emit must trace to at least one event in the provided EVENT STREAM. The verification field per factor lists the event IDs. Factors that fail verification are dropped before emit.
5. Surface lineage. If this deal is part of a pattern the coordinator already identified (Microsoft DAX in Healthcare Negotiation; security-review compounding across FinServ deals), name the pattern by ID and frame this loss/win as part of it.
6. Propose taxonomy candidates when needed. If the best category for a factor doesn't fit the canonical enum, set category: "candidate" and propose a name in candidate_name. The system promotes candidates when 3+ deals accumulate similar uncategorized reasons.

REASONING SCAFFOLD

Before emitting your tool call, work through these steps in your `analytical_passes` field:

Pass 1 — Theory state at close: What did the rolling deal theory say at the moment of close? What were the threats, tailwinds, and open questions?
Pass 2 — Trajectory: How did the theory evolve over the deal's life? Where were the major shifts and what triggered them?
Pass 3 — Mechanism: What is the single most plausible story of why this deal closed the way it did? Name the mechanism in concrete terms.
Pass 4 — Evidence map: For each component of the mechanism, list the events in the stream that back it. Where the evidence is thin, mark for a question instead of a factor.
Pass 5 — Lineage and patterns: Is this loss/win an instance of a coordinator pattern? Is it the 4th healthcare loss to Microsoft this quarter? Frame the diagnosis in that context.
Pass 6 — Replicability (for wins) or Avoidance (for losses): What's the takeaway that future deals in this vertical should inherit?

OUTPUT

Use the produce_close_hypothesis tool. Every factor must be evidence-backed and verified against the event stream. Questions are for genuine gaps in the hypothesis — not standard intake fields.
```

**User Prompt Template (complete, verbatim)**

```
Produce the close hypothesis for this deal.

DEAL: ${dealName} — ${companyName}
OUTCOME: Closed ${outcome}
AMOUNT: ${formattedDealValue}
VERTICAL: ${vertical}
COMPETITOR (if known): ${competitor || "none identified"}
DAYS IN PIPELINE: ${daysInPipeline}
CLOSED BY: ${closedByRepName}

ROLLING DEAL THEORY AT CLOSE (the system's accumulated hypothesis):
${currentTheoryBlock}

DEAL THEORY HISTORY (major shifts over the life of the deal):
${theoryHistoryBlock}

EVENT STREAM (chronological — every signal, transcript, email, observation, fitness event, MEDDPICC update):
${eventStreamBlock}

MEDDPICC TRAJECTORY (per-dimension confidence over time):
${meddpiccTrajectoryBlock}

DEAL FITNESS NARRATIVE (final state):
${fitnessNarrativeBlock}

AGENT MEMORY (accumulated learnings, risk signals, competitive context):
${agentMemoryBlock}

COORDINATOR PATTERNS REFERENCING THIS DEAL OR VERTICAL:
${coordinatorPatternsBlock}

PRIOR CLOSE HYPOTHESES IN THIS VERTICAL (last 90 days, for lineage and comparison):
${priorCloseHypothesesBlock}

CANONICAL FACTOR CATEGORIES FOR ${outcome}:
${categoryEnumBlock}

Produce the close hypothesis per the discipline. Run the six analytical passes. Verify every factor against the event stream. Ask questions only where evidence is thin and the rep's input would sharpen the diagnosis.
```

**Interpolation Variables (typed)**

- `${dealId}, ${dealName}, ${companyName}, ${vertical}, ${stage}, ${formattedDealValue}, ${competitor}` — from `CrmAdapter`.
- `${outcome}: 'won' | 'lost'`.
- `${daysInPipeline}: number` — derived from stage history.
- `${closedByRepName}: string` — `CrmAdapter.getTeamMember(deal.assignedAeId).name`.
- `${currentTheoryBlock}: string` — full theory at close from `DealIntelligence.getCurrentTheory(dealId)`. All six sections rendered.
- `${theoryHistoryBlock}: string` — from `DealIntelligence.getTheoryHistory(dealId, { majorShiftsOnly: true })`. One block per major shift: `--- ${shiftDate} ---\nFrom: "${priorClaim}"\nTo: "${newClaim}"\nTriggered by: ${triggerEventSummary}`. Empty → `(no major shifts; theory was steady throughout)`.
- `${eventStreamBlock}: string` — from `DealIntelligence.getEventStream(dealId, { types: ['SignalDetected', 'TranscriptProcessed', 'EmailExchanged', 'ObservationCreated', 'FitnessEventDetected', 'MeddpiccUpdated', 'StageChanged'] })`. Pre-formatted chronologically with verbatim quote excerpts. Per DECISIONS.md 2.13 the formatter is shared with #11.
- `${meddpiccTrajectoryBlock}: string` — from `DealIntelligence.getMeddpiccTrajectory(dealId)`. Per dimension, time series of (date, confidence, evidence_text). Sparkline-style ASCII representation OK.
- `${fitnessNarrativeBlock}: string` — from the latest `deal_fitness_scores` row's narrative jsonb (`stakeholder_engagement`, `buyer_momentum`, `conversation_signals`) plus per-category scores.
- `${agentMemoryBlock}: string` — from `DealIntelligence.formatAgentMemoryForPrompt(dealId)`. Same format as #15.
- `${coordinatorPatternsBlock}: string` — from `IntelligenceCoordinator.getActivePatterns({ dealIds: [dealId], includeHistorical: true, sinceDays: 180 })`. Includes patterns the deal contributed to even if those patterns have since resolved.
- `${priorCloseHypothesesBlock}: string` — from `DealIntelligence.getPriorCloseHypotheses({ vertical, outcome, sinceDays: 90, limit: 5, excludeDealId: dealId })`. One block per: `--- ${dealName} (closed ${closeDate}) ---\nWorking hypothesis: ${hypothesis}\nFactors: ${factorsSummary}`.
- `${categoryEnumBlock}: string` — from `CloseFactorTaxonomy.getEnumForOutcome(outcome)`. Multi-line list with each canonical category + when to use it. For lost: `competitor | stakeholder | process | product | pricing | timing | internal | champion`. For won: `champion | technical_fit | pricing | timeline | relationship | competitive_wedge`. Plus `candidate` as the always-available promotion target.

**Tool-Use Schema**

```typescript
{
  name: "produce_close_hypothesis",
  description: "Produce the VP-grade close hypothesis with summary, evidence-backed factors, gap-driven questions, MEDDPICC + stakeholder flags, and lineage acknowledgment.",
  input_schema: {
    type: "object",
    properties: {
      analytical_passes: {
        type: "object",
        properties: {
          pass_1_theory_at_close: { type: "string" },
          pass_2_trajectory: { type: "string" },
          pass_3_mechanism: { type: "string" },
          pass_4_evidence_map: { type: "string" },
          pass_5_lineage: { type: "string" },
          pass_6_replicability_or_avoidance: { type: "string" }
        },
        required: ["pass_1_theory_at_close", "pass_2_trajectory", "pass_3_mechanism", "pass_4_evidence_map", "pass_5_lineage", "pass_6_replicability_or_avoidance"]
      },
      summary: {
        type: "string",
        description: "2-3 sentences: the central diagnosis. Names the mechanism in concrete terms. NOT a recap of what the rep already knows."
      },
      factors: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            label: { type: "string", description: "Short chip label, under 12 words. Specific to this deal — not 'Lost to competitor'." },
            category: { type: "string", enum: ["competitor", "stakeholder", "process", "product", "pricing", "timing", "internal", "champion", "technical_fit", "timeline", "relationship", "competitive_wedge", "candidate"] },
            candidate_name: { type: ["string", "null"], description: "If category is 'candidate', the proposed new category name. Promoted by separate workflow when 3+ deals accumulate similar." },
            evidence: {
              type: "object",
              properties: {
                description: { type: "string", description: "Plain-language description of the evidence." },
                citations: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    properties: {
                      source_type: { type: "string", enum: ["transcript", "email", "observation", "meddpicc_update", "fitness_event", "coordinator_pattern", "stage_history"] },
                      source_id: { type: "string" },
                      quote_or_summary: { type: "string", description: "Verbatim quote when source has speech; structured summary otherwise." },
                      date: { type: "string" }
                    },
                    required: ["source_type", "source_id", "quote_or_summary", "date"]
                  }
                }
              },
              required: ["description", "citations"]
            },
            confidence: { type: "number", minimum: 0.5, maximum: 1.0 },
            verification: {
              type: "object",
              properties: {
                event_ids: { type: "array", items: { type: "string" }, minItems: 1, description: "deal_events row IDs that back this factor. Service rejects factors with empty event_ids." },
                verified: { type: "boolean", description: "True only when event_ids resolve to actual events; service may set false to drop the factor." }
              },
              required: ["event_ids", "verified"]
            }
          },
          required: ["id", "label", "category", "evidence", "confidence", "verification"]
        }
      },
      questions: {
        type: "array",
        maxItems: 3,
        description: "Genuine gaps in the hypothesis where the rep's input would sharpen the diagnosis. Zero questions is valid.",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            question: { type: "string", description: "Specific to this deal's evidence gap. NOT a standard intake field." },
            chips: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 4, description: "Plain-language chip options." },
            why: { type: "string", description: "What the answer would clarify in the diagnosis." },
            would_change_factor_id: { type: ["string", "null"], description: "If the answer would adjust an emitted factor, which factor's ID." }
          },
          required: ["id", "question", "chips", "why"]
        }
      },
      meddpicc_gaps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dimension: { type: "string", enum: ["metrics", "economic_buyer", "decision_criteria", "decision_process", "identify_pain", "champion", "competition", "paper_process"] },
            final_confidence: { type: "integer", minimum: 0, maximum: 100 },
            concern: { type: "string", description: "How this dimension's weakness contributed to the outcome." }
          },
          required: ["dimension", "final_confidence", "concern"]
        }
      },
      stakeholder_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            contact_name: { type: "string" },
            issue: { type: "string", enum: ["disengaged_mid_deal", "champion_departed", "EB_never_engaged", "blocker_emerged_late", "other"] },
            description: { type: "string" }
          },
          required: ["contact_name", "issue", "description"]
        }
      },
      lineage: {
        type: "object",
        properties: {
          part_of_pattern: { type: "boolean" },
          pattern_id: { type: ["string", "null"] },
          lineage_note: { type: ["string", "null"], description: "If part_of_pattern, one sentence framing this loss/win in the pattern's context." }
        },
        required: ["part_of_pattern"]
      },
      replicability_or_avoidance: {
        type: "string",
        description: "For wins: what made it replicable. For losses: what should future deals in this vertical do differently. One paragraph."
      }
    },
    required: ["analytical_passes", "summary", "factors", "questions", "meddpicc_gaps", "stakeholder_flags", "lineage", "replicability_or_avoidance"]
  }
}
```

**Integration Notes**

This prompt runs in the close-analysis service when the rep selects Closed Won or Closed Lost. Per DECISIONS.md 1.2 the rep sees the hypothesis FIRST and reacts; the modal renders summary + factors + questions inline. Confirmed factors persist to `deals.close_factors`/`win_factors`; rep responses to questions persist alongside as the reconciliation data DECISIONS.md 1.1 names as the learning signal. Per 2.21, after Claude returns, the service-layer verifier walks every factor's `verification.event_ids` and confirms each event exists in `deal_events` for this deal — factors that fail verification are stripped before the modal renders.

Codex builds:

1. `DealIntelligence.getEventStream(dealId, opts)` — typed event reader.
2. `DealIntelligence.getTheoryHistory(dealId, opts)` — major-shifts filter on `deal_snapshots`.
3. `DealIntelligence.getMeddpiccTrajectory(dealId)` — derived from MEDDPICC update events.
4. `DealIntelligence.getPriorCloseHypotheses(opts)` — read access to past `deals.close_ai_analysis`.
5. `CloseFactorTaxonomy` — single source of canonical categories per outcome + the `candidate` promotion path.
6. The taxonomy-promotion job per DECISIONS.md 1.1: a scheduled service that reads `candidate_name` accumulations across recent close hypotheses and surfaces the "name a new pattern?" prompt to leadership when 3+ deals share a candidate name.
7. Hypothesis verification per 2.21: post-call service step that filters factors with `verification.verified = false`.

Downstream rewrites that consume this output: #11 (call prep reads `deals.win_factors`/`close_factors` per vertical for win/loss intelligence — and now reads the structured citations not just the label).

**Before/After Summary (#14A + #14B together vs. original)**

| Dimension | Original (single pass) | Rewrite (split: 14A + 14B) |
|---|---|---|
| Architecture | Single Claude call at close | Continuous theory updater + final deep pass |
| Theory continuity | None — re-derived at close | Rolling theory updated per data point; final pass reads it |
| Role framing | "You are analyzing a sales deal that just closed" | "Strategic VP of Sales producing an argument with depth" |
| Reasoning structure | None | Required 6-pass `analytical_passes` |
| Transcript text | Summaries only | Full event stream with quotes |
| Evidence per factor | Plain string | Structured citations with source_type + source_id + quote + date |
| Verification against event stream | None | Required `verification.event_ids`; service drops unverified factors |
| Category enum | Pipe-string interpolation, drift | Tool-schema enum + `candidate` promotion path |
| Coordinator patterns in context | None | Required input |
| Fitness narrative in context | None | Required input |
| MEDDPICC trajectory | Snapshot only | Time series across deal life |
| Agent memory | None | Required input |
| Prior close hypotheses | None | Last 90 days same vertical, for lineage |
| Lineage awareness | None | Structured `lineage` output linking to coordinator patterns |
| Taxonomy promotion | None | Candidate categories tracked; promotion job |
| Output `meddpicc_gaps` actionability | Display-only prose | Structured per-dimension with concern + score |
| Confidence | Informal high/medium/low | Numeric 0.5–1.0 |

---

### Rewrite 7. #9 Give-Back Insight

**Diagnosis Recap**

Per 04A §9 SHOULD REWRITE, the original demands "cite numbers" but receives no numbers in context — model fills the gap with fabricated stats ("68% of healthcare deals at this stage..." with no grounding). Per 07A §9 HIGH the prompt also has no peer-response context (the most powerful give-back — "3 of your peers flagged the same pattern" — is unreachable), no coordinator pattern, no system intelligence. The role framing is absent; the prompt opens with the task. Voice control is strong ("smart colleague's tip") but voice without grounding produces confident-sounding generic advice.

**Design Intent**

- Replace "cite numbers" with conditional rail: cite numbers only when the context provides them; otherwise offer a strategic observation grounded in the rep's response and deal context.
- Add peer responses, coordinator patterns, system intelligence, and MEDDPICC per 07A §9 — turns the prompt from "could feel smart" into one that consistently is.
- Add `applies` opt-out: when the rep's response is hostile or there's truly nothing useful to say, emit `applies: false` rather than forcing a tip.
- Restructure `source` field as `cited_data: { type, ref_id, summary }[]` — structured grounding, not voice convention.
- Worked examples: one good (peer-grounded), one bad (fabricated stat).
- Role-frame as a peer, not a system.

**Model Settings**

```
model: claude-sonnet-4-20250514
temperature: 0.5  # voice-driven output; some variety for natural feel
max_tokens: 600  # raised from 256 to accommodate cited_data structure + opt-out
```

**System Prompt (complete, verbatim)**

```
You are a knowledgeable peer at the rep's company, sending a private 1-2 sentence tip after they answered a quick check on a deal. Your tip is the system's reward for the rep's response — it should feel like a colleague slipping past their desk with a useful read, not a corporate dashboard alert.

YOUR DISCIPLINE

1. Ground every claim in something specific from the context provided. If the context includes peer responses to the same question, cite the peer count ("3 of 4 reps flagged the same competitor"). If the context includes a coordinator pattern, reference it ("matches the Microsoft DAX pattern across healthcare Negotiation deals"). If the context includes system intelligence, draw on it. If the context provides none of these, offer a strategic observation grounded in what the rep said + the deal stage/MEDDPICC — never invent statistics or peer behavior.
2. Voice: a peer, not a system. First sentence states the read; second sentence (optional) connects it to the rep's next move. Do not write "Based on..." preambles or "Hope this helps!" sign-offs. Get to the read.
3. Anonymity: never name another rep, never reveal who asked the original question. Aggregated peer counts ("3 of 4 reps") are fine.
4. Length: 1–2 sentences. Hard cap.
5. Opt out gracefully. If the rep's response is hostile, evasive, or simply "not sure," and you have no concrete grounding to offer back, set applies: false and provide a brief reason. The system suppresses the give-back rather than forcing a generic tip.

WORKED EXAMPLES

GOOD (peer-grounded):
Rep response: "Compliance is the wedge — Henrik kept coming back to SOC 2."
Context: 3 other healthcare reps flagged compliance-as-wedge in the past 14 days; coordinator pattern P-2026-04-15 (Compliance-led wins in Healthcare Negotiation, +18% velocity).
Insight: "Three other healthcare reps flagged compliance-as-wedge in the past two weeks — the pattern's already showing +18% velocity in Negotiation, so leading the next conversation with the SOC 2 retention story should compound."
Cited data: peer_response_count=3, coordinator_pattern_id=P-2026-04-15.
Applies: true.

GOOD (strategic observation when no peer/pattern context):
Rep response: "CFO went silent after Tech Val."
Context: No peer responses yet; no matching coordinator pattern; deal MEDDPICC shows EB confidence dropped from 60 → 25 over 3 weeks.
Insight: "EB silence after Tech Val with confidence drop 60→25 is the trajectory healthcare deals at this stage usually need to interrupt directly — propose a 20-min EB-only sync this week framed as 'compliance certification readiness check.'"
Cited data: meddpicc_dimension=economic_buyer, prior_score=60, current_score=25.
Applies: true.

BAD (fabricated stat):
Rep response: "Compliance is the wedge."
Insight: "68% of healthcare deals close on compliance positioning — keep leading with it."
Why bad: "68%" is invented. The system has no record of this number. Reps catch it; trust erodes.

BAD (forced tip on hostile input):
Rep response: "I have no idea, stop asking me."
Insight: "Healthcare deals often close on compliance — consider..."
Why bad: Generic, ignores the hostility, makes the system feel obtuse. Correct output: applies: false, reason: "rep response was hostile; no useful give-back in this turn."

OUTPUT

Use the emit_giveback tool. applies: false is a valid and frequent output.
```

**User Prompt Template (complete, verbatim)**

```
The rep just answered a quick check. Generate a peer-tip per the discipline.

ORIGINAL MANAGER QUESTION (the field query that spawned this AE question):
"${originalManagerQuestion}"

QUESTION ASKED OF THIS REP:
"${questionText}"

REP'S RESPONSE:
"${responseText}"

DEAL CONTEXT:
${dealName} | ${companyName} | ${vertical} | Stage: ${stage} | Value: ${formattedDealValue}

REP'S MEDDPICC ON THIS DEAL:
${meddpiccBlock}

PEER RESPONSES TO THE SAME FIELD QUERY (anonymized):
${peerResponsesBlock}

ACTIVE COORDINATOR PATTERNS MATCHING THIS QUESTION'S SIGNAL TYPE/VERTICAL:
${coordinatorPatternsBlock}

SYSTEM INTELLIGENCE FOR ${vertical}:
${systemIntelligenceBlock}

ACTIVE EXPERIMENTS THIS REP IS TESTING:
${activeExperimentsBlock}

PRIOR GIVE-BACKS ON SIMILAR SIGNAL TYPES (avoid restating these):
${priorGivebacksBlock}

Generate per the discipline. If grounding is thin and the rep's response is sparse or hostile, set applies: false.
```

**Interpolation Variables (typed)**

- `${originalManagerQuestion}: string` — from `field_queries.rawQuestion` joined via `field_query_questions.queryId`.
- `${questionText}: string` — from the `field_query_questions` row.
- `${responseText}: string` — the rep's response.
- `${dealName}, ${companyName}, ${vertical}, ${stage}, ${formattedDealValue}` — from `CrmAdapter.getDeal(dealId)`.
- `${meddpiccBlock}: string` — from `DealIntelligence.formatMeddpiccForPrompt(dealId)`. Same format used elsewhere.
- `${peerResponsesBlock}: string` — from `DealIntelligence.getPeerResponsesToFieldQuery(queryId, { excludeQuestionId, anonymize: true })`. One line per peer response: `- [${verticalAnonTag}, ${stage}, ${formattedValue}] "${responseText}"`. Vertical-anon-tag is "Healthcare-AE-A" / "Healthcare-AE-B" — preserves vertical pattern visibility while never naming reps. Empty → `(no peer responses yet)`.
- `${coordinatorPatternsBlock}: string` — from `IntelligenceCoordinator.getActivePatterns({ vertical, signalType: derivedFromQuestion })`. One line per: `- ${patternId}: ${synthesisHeadline} (${dealCount} deals affected)`. Empty → `(no matching coordinator patterns)`.
- `${systemIntelligenceBlock}: string` — from `DealIntelligence.getSystemIntelligence({ vertical, limit: 3 })`. One line per: `- ${title}: ${insight} (confidence: ${confidence})`. Empty → `(none)`.
- `${activeExperimentsBlock}: string` — from `DealIntelligence.getApplicableExperiments({ aeId: repId, status: 'testing' })`. One line per: `- ${title}: ${hypothesis}`. Empty → `(none)`.
- `${priorGivebacksBlock}: string` — from `DealIntelligence.getPriorGivebacks({ aeId: repId, signalType, sinceDays: 30, limit: 5 })`. One line per: `- "${insight}"`. Empty → `(no prior give-backs in 30 days)`. Used to avoid restating recent tips.

**Tool-Use Schema**

```typescript
{
  name: "emit_giveback",
  description: "Emit the peer-tip insight or opt out when grounding is thin / response is hostile.",
  input_schema: {
    type: "object",
    properties: {
      applies: {
        type: "boolean",
        description: "True when a useful give-back can be grounded; false when the rep's response is hostile/evasive/null AND no concrete context grounding is available."
      },
      insight: {
        type: ["string", "null"],
        description: "1-2 sentences. Required when applies is true; null when applies is false. Voice = peer, not system. No 'Based on...' preamble."
      },
      cited_data: {
        type: "array",
        description: "Structured grounding for the insight. Required to have at least one entry when applies is true.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["peer_response_count", "coordinator_pattern", "system_intelligence", "meddpicc_dimension", "active_experiment", "deal_context"]
            },
            ref_id: {
              type: ["string", "null"],
              description: "ID of the cited entity when applicable (pattern_id, experiment_id, etc.). Null for type=peer_response_count or deal_context."
            },
            summary: {
              type: "string",
              description: "What was drawn from this source for the insight."
            }
          },
          required: ["type", "summary"]
        }
      },
      opt_out_reason: {
        type: ["string", "null"],
        description: "Required when applies is false; null when applies is true. One short phrase explaining why no give-back fired."
      }
    },
    required: ["applies", "cited_data"]
  }
}
```

**Integration Notes**

This prompt runs in the v2 field-query response service when an AE submits a chip response. Per DECISIONS.md 1.2 it remains a small surface — but with rich grounding, it consistently delivers the "smart colleague's tip" promise.

Codex builds:

1. `DealIntelligence.getPeerResponsesToFieldQuery(queryId, opts)` — pulls answered `field_query_questions` for the same `queryId`, excludes the current question, anonymizes via vertical-anon-tag.
2. `DealIntelligence.getPriorGivebacks(opts)` — last 30 days of give-backs to this AE, for dedup.
3. The give-back persists to `field_query_questions.give_back` jsonb. The `cited_data[]` is rendered in the UI as small chip-style citations under the insight.
4. When `applies: false`, the UI shows nothing — no give-back card. The acknowledgment from #1's flow already greets the rep; double-acknowledgment is forbidden.

This rewrite consumes coordinator patterns from #25, peer responses from #7's persisted questions, and active experiments from the experiment store — fully integrated with the upstream rewrites.

**Before/After Summary**

| Dimension | Original | Rewrite |
|---|---|---|
| Role framing | "A sales rep just answered a quick check" | "Knowledgeable peer at the rep's company sending a private tip" |
| "Cite numbers" rail | "If you can cite numbers, do" | Conditional: only when context provides them; never invent |
| Peer-response context | Absent | Anonymized peer responses to same query |
| Coordinator pattern context | Absent | Matching active patterns surfaced |
| System intelligence context | Absent | Vertical-relevant rows passed |
| MEDDPICC context | Absent | Per-deal MEDDPICC passed |
| Prior give-back dedup | Absent | Last 30 days passed |
| Opt-out | None — forced tip | `applies: false` with reason |
| Source field | Free-form "Based on..." string | Structured `cited_data[]` |
| Examples | Absent | Good (peer-grounded), good (no-peer strategic), bad (fabricated), bad (forced) |

---

### Rewrite 8. #11 Call Prep Brief Generator

**Diagnosis Recap**

Per 04A §11 MUST REWRITE, the original is the flagship surface and the most complex prompt. CRITICAL drivers: (a) coordinator wiring is broken — prompt expects coordinated intel via `formatMemoryForPrompt`, but coordinator output never reaches `dealAgentStates.coordinatedIntel` (Flow 6 BROKEN); per DECISIONS.md 2.17 LOCKED v2 must read `coordinator_patterns` directly; (b) the 200-line conditional system prompt assembled by string concatenation is whitespace-sensitive, fragile, and resists evolution; (c) MEDDPICC trajectory + prior briefs + full fitness jsonb are absent (07A §11 CRITICAL); (d) "MANDATORY proven plays" framing still permits omission; (e) deeply nested optional sections cascade parse errors; (f) emoji-prefixed fields drift unpredictably. The rewrite per DECISIONS.md 2.13 decomposes the monolith into composable sub-prompts orchestrated by the call-prep service; this final rewrite is the integration layer.

**Design Intent**

- Decompose into composable sub-prompts. The orchestrator (a TypeScript service in `services/call-prep/`) decides which sub-prompts to run based on applicability gates per DECISIONS.md 2.21. Each sub-prompt is its own `.md` file with its own tool schema, runs in parallel where independent, and produces a typed output. The orchestrator assembles the final brief from the sub-prompt outputs.
- This rewrite specifies the **orchestrator prompt** that synthesizes the headline + final structured brief, plus the canonical sub-prompt list. The sub-prompts are listed with their I/O contracts; their full `.md` files are derived mechanically from this contract during port.
- Read coordinator patterns directly per DECISIONS.md 2.17 LOCKED. No `addCoordinatedIntel` no-op path.
- Read the canonical analyzed-transcript object + prior briefs + full fitness jsonb + MEDDPICC trajectory per 07A §11.
- Replace "MANDATORY proven plays" framing with deterministic post-check: if the orchestrator emits a brief and any applicable proven plays are missing from talking_points, the orchestrator re-runs just the proven-plays sub-prompt with stronger anchoring.
- Per-section length budgets. Headline 1 sentence (15 words). Talking points 2–4. Questions 3–5. Next steps 2–4.
- Drop emoji prefixes from output. Icons are rendered by the UI from typed `source` enums, not from the model's text.
- Source agent config via `DealIntelligence.getAgentConfig(memberId)` so the fallback ("Professional and data-driven") is in one place.

**Sub-prompt list (each gets its own `prompts/call-prep-<section>.md` file derived from this contract)**

| Sub-prompt | Triggered when | Reads | Returns |
|---|---|---|---|
| **call-prep-headline** | Always | Deal snapshot, theory at close-of-day, top-priority threat from theory | `{ headline: string }` (1 sentence) |
| **call-prep-talking-points** | Always | Theory, agent memory, fitness gaps, prior briefs, agent config voice | `{ points: { topic, why, approach }[] }` (2–4) |
| **call-prep-questions** | Always | MEDDPICC + open theory questions | `{ questions: { question, purpose, meddpicc_gap }[] }` (3–5) |
| **call-prep-fitness-insights** | If `DealIntelligence.getDealFitness(dealId)` returns events | Fitness events + scores + jsonb narratives + applicable plays | `{ summary, gaps[], pending_commitments[] }` |
| **call-prep-proven-plays** | If `DealIntelligence.getApplicablePlays({ dealId, prepContext })` non-empty | Applicable graduated experiments + theory | `{ plays: { name, talking_point, close_action }[] }` (1+ if applicable) |
| **call-prep-coordinator-intel** | If `IntelligenceCoordinator.getActivePatterns({ dealIds: [dealId] })` non-empty | Patterns referencing this deal (per DECISIONS.md 2.17 LOCKED) | `{ patterns: { pattern_id, recommendation_for_this_deal }[] }` |
| **call-prep-risks** | Always | Theory threats + open signals + stakeholder confidence direction | `{ risks: { risk, source, mitigation }[] }` (1–4) |
| **call-prep-stakeholders** | Always | Contacts + engagement scores + theory stakeholder direction | `{ stakeholders: { name, title, role, engagement, last_contact, notes }[] }` |
| **call-prep-directives** | If `DealIntelligence.getActiveDirectives({ vertical })` non-empty | Manager directives | `{ directives: { priority, directive }[] }` |
| **call-prep-next-steps** | Always | Theory open questions + fitness pending commitments + applicable plays | `{ next_steps: string[] }` (2–4) |
| **call-prep-orchestrator** | After sub-prompts return | All sub-prompt outputs | Final structured brief (the schema below) |

The orchestrator prompt below is the integration step — it takes the sub-prompt outputs and produces the final brief that the rep sees. The orchestrator's job is light: validate cross-section coherence, ensure deterministic-post-check on proven plays, emit the final shape. Most of the analytical work lives in the sub-prompts.

**Model Settings (orchestrator)**

```
model: claude-sonnet-4-20250514
temperature: 0.3  # integration with light synthesis; favor consistency
max_tokens: 4000  # raised from 3000 to accommodate richer per-section output
```

**System Prompt — Call Prep Orchestrator (complete, verbatim)**

```
You are the Call Prep Orchestrator for Nexus, integrating the outputs of specialized analysis sub-prompts into a single brief that ${repName} can read in two minutes and walk into the call prepared.

You did NOT do the analytical work — sub-prompts already produced talking points, questions, fitness insights, proven plays, coordinator intel, risks, stakeholders, directives, and next steps. Your job is to integrate them into a coherent brief, validate cross-section coherence, and emit the final structured output the UI renders.

YOUR DISCIPLINE

1. Trust the sub-prompts' content. Do not re-analyze; do not second-guess. If a sub-prompt emitted three talking points, your output has three talking points (not five, not one).
2. Enforce cross-section coherence. The headline names the most important thing for this call. The talking points should flow toward the questions. The next steps should reference at least one talking point or one fitness pending commitment. If the sub-prompts produced incoherence (e.g., headline says "compliance is the wedge" but no talking point covers compliance), surface the incoherence in the integration_notes field — do NOT silently fabricate.
3. Voice: per the rep's agent config (provided in context). The persona binding came from agent config; reflect it in transitions and phrasing. If no agent config exists, default to professional and data-driven without hedging.
4. The headline is one sentence, fifteen words or fewer, and names the single most important thing for this specific call given the rep, the attendees, the prep context, and the theory's top-priority threat. Not a summary; a directive.
5. Snapshot fields (deal_snapshot, stakeholders_in_play) come pre-computed from the sub-prompts; you only validate.
6. The output uses the structured shape below. Do not add fields. Do not omit required fields. Do not embed emojis — UI renders icons from the structured `source` enums.

PROVEN PLAYS DETERMINISTIC CHECK

The proven-plays sub-prompt either returned plays or returned an empty list. If it returned plays, each play's talking_point and close_action MUST appear in the final brief — talking_point in the talking_points array, close_action in the next_steps array. The orchestrator's job is to merge the sub-prompt outputs without dropping these. The service layer will detect and reject briefs that violate this and re-run.

OUTPUT

Use the assemble_call_brief tool. Field shapes are validated; required fields cannot be empty. Cross-section incoherence flagged in integration_notes triggers a warning to the rep but does not block the brief.
```

**User Prompt Template — Call Prep Orchestrator (complete, verbatim)**

```
Assemble the final call brief for ${repName}'s upcoming call on ${dealName} (${companyName}).

PREP CONTEXT (call type, attendees, prep notes from rep):
${prepContextBlock}

REP AGENT CONFIG (voice, guardrails, stage rules):
${agentConfigBlock}

DEAL SNAPSHOT (pre-computed):
${dealSnapshotBlock}

SUB-PROMPT OUTPUTS:

— headline:
${headlineSubpromptOutput}

— talking_points:
${talkingPointsSubpromptOutput}

— questions:
${questionsSubpromptOutput}

— fitness_insights (only if applicable):
${fitnessInsightsSubpromptOutput || "(not applicable — no fitness data)"}

— proven_plays (only if applicable):
${provenPlaysSubpromptOutput || "(not applicable — no proven plays match this deal/context)"}

— coordinator_intel (only if applicable):
${coordinatorIntelSubpromptOutput || "(not applicable — no active coordinator patterns reference this deal)"}

— risks:
${risksSubpromptOutput}

— stakeholders_in_play:
${stakeholdersSubpromptOutput}

— manager_directives (only if applicable):
${directivesSubpromptOutput || "(none)"}

— next_steps:
${nextStepsSubpromptOutput}

PRIOR BRIEF FOR THIS DEAL (most recent, for continuity awareness):
${priorBriefBlock || "(no prior brief)"}

Integrate per the discipline. Validate proven-plays deterministic check. Surface incoherence in integration_notes; do not fabricate to mask it.
```

**Interpolation Variables (typed)**

- `${repName}: string` — `CrmAdapter.getTeamMember(repId).name`.
- `${dealName}, ${companyName}, ${dealId}` — `CrmAdapter.getDeal(dealId)`.
- `${prepContextBlock}: string` — pre-formatted from request: prep type (discovery / tech_validation / executive / negotiation / other), attendees with role, rep's free-text prep notes.
- `${agentConfigBlock}: string` — from `DealIntelligence.getAgentConfig(repId)`. Pre-formatted: persona instructions, communication style, guardrails list, stage rules for current stage. Empty config → `(no agent config; default voice = professional and data-driven)`.
- `${dealSnapshotBlock}: string` — from `DealIntelligence.getDealSnapshotForBrief(dealId)`. Stage, value, days in stage, health score from theory, health reason.
- `${headlineSubpromptOutput}, ${talkingPointsSubpromptOutput}, ...` — JSON-serialized outputs from each sub-prompt. The orchestrator service runs sub-prompts in parallel via `Promise.all` and feeds the results in here.
- `${priorBriefBlock}: string` — from `DealIntelligence.getMostRecentBrief(dealId, { excludeCurrentSession: true })`. Pre-formatted: prep date, summary of key talking points, summary of next steps. Empty → `(no prior brief)`.

**Tool-Use Schema — Call Prep Orchestrator**

```typescript
{
  name: "assemble_call_brief",
  description: "Integrate sub-prompt outputs into the final structured call brief. Field shapes are strictly enforced; cross-section incoherence is flagged in integration_notes.",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        maxLength: 200,
        description: "One sentence, 15 words or fewer. The single most important thing for this specific call."
      },
      proven_plays: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            talking_point: { type: "string", description: "Specific to this deal — must appear verbatim or near-verbatim in talking_points." },
            close_action: { type: "string", description: "Specific to this deal — must appear in next_steps." }
          },
          required: ["name", "talking_point", "close_action"]
        },
        description: "Pass through from proven-plays sub-prompt. Empty if not applicable."
      },
      talking_points: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Short topic name." },
            why: { type: "string", description: "Why this matters for this specific call." },
            approach: { type: "string", description: "How to bring it up." },
            from_proven_play: { type: ["string", "null"], description: "Name of the proven play this talking point applies, or null." }
          },
          required: ["topic", "why", "approach"]
        }
      },
      questions_to_ask: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            purpose: { type: "string", description: "What intelligence this question extracts." },
            meddpicc_gap: { type: ["string", "null"], enum: [null, "metrics", "economic_buyer", "decision_criteria", "decision_process", "identify_pain", "champion", "competition", "paper_process"] }
          },
          required: ["question", "purpose"]
        }
      },
      deal_fitness_insights: {
        type: ["object", "null"],
        description: "Pass-through from fitness sub-prompt. Null if no fitness data.",
        properties: {
          summary: { type: "string" },
          gaps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event_key: { type: "string" },
                fit_category: { type: "string", enum: ["business_fit", "emotional_fit", "technical_fit", "readiness_fit"] },
                coaching: { type: "string" },
                matched_play: {
                  type: ["object", "null"],
                  properties: {
                    name: { type: "string" },
                    evidence: { type: "string" }
                  }
                }
              },
              required: ["event_key", "fit_category", "coaching"]
            }
          },
          pending_commitments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                promise: { type: "string" },
                promised_by: { type: "string" },
                suggested_follow_up: { type: "string" }
              },
              required: ["promise", "promised_by", "suggested_follow_up"]
            }
          }
        },
        required: ["summary", "gaps", "pending_commitments"]
      },
      coordinator_intel: {
        type: ["array", "null"],
        description: "Cross-deal patterns affecting this deal (per DECISIONS.md 2.17 LOCKED). Null if none.",
        items: {
          type: "object",
          properties: {
            pattern_id: { type: "string" },
            pattern_headline: { type: "string", description: "From coordinator synthesis." },
            recommendation_for_this_deal: { type: "string", description: "From coordinator's per-deal recommendation array." },
            priority: { type: "string", enum: ["urgent", "this_week", "queued"] }
          },
          required: ["pattern_id", "pattern_headline", "recommendation_for_this_deal", "priority"]
        }
      },
      risks_and_landmines: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            risk: { type: "string" },
            source: { type: "string", enum: ["theory_threat", "open_signal", "fitness_gap", "stakeholder_silence", "win_loss_pattern", "directive", "coordinator_pattern"] },
            mitigation: { type: "string" }
          },
          required: ["risk", "source", "mitigation"]
        }
      },
      next_steps: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        items: { type: "string" }
      },
      deal_snapshot: {
        type: "object",
        properties: {
          stage: { type: "string" },
          value: { type: "string", description: "Pre-formatted by Formatter." },
          days_in_stage: { type: "string" },
          health: { type: "string", enum: ["on_track", "at_risk", "needs_attention"] },
          health_reason: { type: "string", description: "One sentence; sourced from theory." }
        },
        required: ["stage", "value", "days_in_stage", "health", "health_reason"]
      },
      stakeholders_in_play: {
        type: "array",
        items: {
          type: "object",
          properties: {
            contact_id: { type: "string", description: "UUID of the contact for downstream linking." },
            name: { type: "string" },
            title: { type: "string" },
            role: { type: "string", enum: ["champion", "economic_buyer", "decision_maker", "technical_evaluator", "end_user", "procurement", "influencer", "blocker", "coach"] },
            engagement: { type: "string", enum: ["hot", "warm", "cold", "departed"] },
            last_contact: { type: ["string", "null"], description: "ISO date or null." },
            notes: { type: "string", description: "One sentence." }
          },
          required: ["contact_id", "name", "title", "role", "engagement", "notes"]
        }
      },
      manager_directives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["mandatory", "strong", "guidance"] },
            directive: { type: "string" }
          },
          required: ["priority", "directive"]
        }
      },
      integration_notes: {
        type: "array",
        description: "If sub-prompt outputs are incoherent, surface here. Empty array means clean integration.",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["incoherence", "missing_proven_play", "missing_fitness_match", "other"] },
            description: { type: "string" }
          },
          required: ["type", "description"]
        }
      }
    },
    required: ["headline", "proven_plays", "talking_points", "questions_to_ask", "risks_and_landmines", "next_steps", "deal_snapshot", "stakeholders_in_play", "manager_directives", "integration_notes"]
  }
}
```

**Integration Notes**

This is the integration point for every prior rewrite. Codex builds:

1. `services/call-prep/orchestrator.ts` — runs the sub-prompts in parallel via `Promise.all`, feeds results into the orchestrator prompt, runs the deterministic proven-plays post-check, returns the final structured brief.
2. The 10 sub-prompts as `prompts/call-prep-<section>.md` files. Each has its own tool schema (single-section shape) and runs against `DealIntelligence.getDealContext(dealId)` plus section-specific augments.
3. `DealIntelligence.getDealContext(dealId)` — central context-assembly method. Returns deal + MEDDPICC with evidence + contacts with engagement + stage history + transcripts + fitness scores + agent memory + coordinator patterns + system intelligence + manager directives + applicable experiments. Per 07A §11 this collapses 14+ parallel queries into one canonical call.
4. `DealIntelligence.getApplicablePlays({ dealId, prepContext })` — applies the applicability gate per DECISIONS.md 2.21 (only plays whose `applicability` JSONB matches the deal's stage / temporal / preconditions surface).
5. `IntelligenceCoordinator.getActivePatterns({ dealIds })` — read access to `coordinator_patterns`. Per DECISIONS.md 2.17 LOCKED this is the wiring fix; the broken `addCoordinatedIntel` path is removed entirely.
6. `DealIntelligence.getMostRecentBrief(dealId, opts)` — reads prior `call_prep` activities for continuity context.
7. Service-layer post-check: walks `proven_plays[]` and confirms each play's `talking_point` and `close_action` appear in `talking_points[]` and `next_steps[]`. If a play is dropped, the orchestrator runs again with explicit instruction to include it.
8. Brief persistence per DECISIONS.md 2.16: emits a `CallPrepGenerated` event to `deal_events`; the materialized `activities` row (type='call_prep') is created downstream from the event.

The orchestrator + sub-prompts pattern means evolution is per-section, not per-monolith. Adding a new section (e.g., a "competitor pricing intel" section drawing from coordinator patterns) is one new sub-prompt + one orchestrator schema field, not a 200-line conditional refactor.

**Before/After Summary**

| Dimension | Original (monolith) | Rewrite (orchestrator + 10 sub-prompts) |
|---|---|---|
| Architecture | 200-line conditional system prompt assembled by string concat | Orchestrator + 10 typed sub-prompts running in parallel |
| Coordinator wiring | Broken via `addCoordinatedIntel` no-op | Direct `IntelligenceCoordinator.getActivePatterns()` query per 2.17 LOCKED |
| Context assembly | 14+ parallel queries inline in route | Single `DealIntelligence.getDealContext(dealId)` call |
| MEDDPICC trajectory | Snapshot only | Full trajectory via DealIntelligence |
| Prior briefs | Absent | Most recent passed for continuity |
| Full fitness jsonb | Overall + not_yet only | Full `stakeholder_engagement` + `buyer_momentum` + `conversation_signals` via fitness sub-prompt |
| Proven plays enforcement | "MANDATORY" prose framing | Deterministic post-check with re-run if dropped |
| Output emojis | 📊/🔴/📋 etc. drift unpredictably | Removed; UI renders icons from typed `source` enums |
| Section evolution | Whitespace-sensitive monolith refactor | Per-sub-prompt change |
| Applicability gating | None | Per DECISIONS.md 2.21 — sub-prompts only run when applicable |
| Per-section length budgets | None (overall token cap only) | Headline 15w; talking points 2–4; questions 3–5; next steps 2–4 |
| Cross-section coherence | Implicit | `integration_notes[]` surfaces incoherence rather than masking |
| Stakeholder linking | Hardcoded `is_primary: false` | Structured `contact_id` for downstream linking |

---

## Section 2: Prompt Principles for Codex

This section is self-contained. Codex applies it to every one of the 17 non-rewritten prompts during port. Each principle has a one-sentence statement, a rationale grounded in audit findings, a mechanical application Codex executes, an anti-example from current Nexus to calibrate against, and a positive example from the 8 rewrites in Section 1.

The principles are mechanical where possible. Where judgment is required (which sub-prompt to split, which examples to add), the principle names the trigger and Codex makes the call.

### Principle 1 — Every prompt has explicit role framing grounded in sales expertise.

- **Rationale.** 04A Cross-Cutting found 8/25 prompts have weak or absent role framing (#9 absent, #25 absent at system level). Empirical observation: prompts with strong role framing produce more consistent outputs across calls because the model anchors to a stable identity rather than treating each call as a standalone request.
- **Mechanical application.** Every `prompts/<feature>.md` file opens its system prompt with a sentence in the form "You are the [Role] for Nexus, [function and audience]." Roles invoke domain expertise specifically — not "AI assistant" or "classifier engine," but "Signal Detection analyst," "Close Analyst," "Intelligence Coordinator." If Codex cannot name the role in concrete sales terms, the prompt's purpose is unclear and Codex stops to ask.
- **Anti-example.** Current #25 has `system: ""` with role declaration buried in user message. Current #4 opens "You are an AI agent configuration advisor" — functional but no anchor in why this work matters or what discipline it requires.
- **Positive example.** Rewrite #25's system prompt: "You are the Intelligence Coordinator for Nexus — the cross-portfolio sales-intelligence analyst whose job is to recognize when the same mechanism is showing up across multiple deals and to translate that recognition into specific, deal-by-deal action."

### Principle 2 — Every prompt that produces structured output uses tool-use schemas, not JSON-in-text parsing.

- **Rationale.** 04A Anti-pattern #1 ("JSON as text" is universal across 24/25 current prompts; only #5 streams). Anti-pattern #4 ("Silent fallback on parse failure = silent failure") affects #14, #19, #20, #21, #22, #24. Anti-pattern #7 (4 different fence-strip regex patterns across the codebase). Tool-use schemas (per DECISIONS.md guardrail #17) eliminate parse fragility, enforce typed enums at the API boundary, and remove the regex-and-hope code path entirely.
- **Mechanical application.** Every prompt's `.md` file names a single tool the model invokes. The TypeScript route validates the tool's `input_schema` via Zod or the SDK's built-in validation; parse errors surface as typed exceptions, not silent fallbacks. Free-form content (email body, give-back insight) wraps in a structured envelope (subject + body + cited_data; insight + applies + opt_out_reason).
- **Anti-example.** Current #15 emits 16K tokens of JSON-in-text with a 3-strategy regex extractor (direct → fence → first-brace-to-last-brace) — the most robust extractor in the codebase, but it cannot recover from mid-JSON truncation when output exceeds budget.
- **Positive example.** Rewrite #15's `analyze_deal_fitness` tool with `event_key` enum-validated against the canonical 25-key list at parse time — the unreachable example (`buyer_assigns_day_to_day_owner`) becomes structurally impossible to emit.

### Principle 3 — Every prompt that makes claims about a deal cites evidence from provided data.

- **Rationale.** 04A Anti-pattern #1 ("Cite-evidence-but-no-evidence-provided") affects #9 ("cite numbers" with no numbers passed), #11 (proven plays "specific to THIS deal" with thin per-deal context), #14 ("cite specific evidence" with summaries-of-summaries instead of transcript text). When the prompt demands evidence and the context lacks it, the model fabricates. The fix is BOTH sides: prompts require citations AND context provides the source material.
- **Mechanical application.** Every signal-, factor-, or claim-emitting prompt requires a structured citation in the tool schema: `evidence_quote` + `source_speaker` + `source_id` + `date`. The route's context assembler MUST load enough source material that citations are possible. If a citation field is required by schema but the model emits an empty string, the service rejects and re-runs with a stronger anchor.
- **Anti-example.** Current #14 receives `call_analyses.summary` (summaries of summaries) and is asked to cite "specific evidence from the data (a transcript quote, an observation, a MEDDPICC gap)" — the transcript text isn't passed; quotes are unrecoverable; model fabricates plausible-sounding evidence.
- **Positive example.** Rewrite #14B requires per-factor `verification.event_ids` — unverified factors are dropped by the service before the modal renders; the integration is closed-loop.

### Principle 4 — Temperature is set explicitly per task type.

- **Rationale.** Current Nexus has `temperature: not set` on 25/25 prompts (default 1.0). DECISIONS.md guardrail #18 mandates explicit temperature per call by task type. Classification tasks benefit from low temperature (consistency); analytical synthesis from low-medium (some variety in framing); voice-driven generation from medium (natural feel); creative tasks from medium-high. Defaults are a hidden lever.
- **Mechanical application.** Every prompt file has a `temperature:` line in its model settings:
  - **Classification, entity extraction, structured output:** 0.2.
  - **Analytical synthesis, factor extraction, theory updates:** 0.3.
  - **Integrative synthesis (orchestrators, brief assemblers):** 0.3.
  - **Argument construction with depth (close hypothesis, coordinator synthesis):** 0.4.
  - **Voice-driven generation (give-back, email drafts):** 0.5–0.7.
- **Anti-example.** Current #25 (coordinator synthesis) runs at default 1.0, contributing to the "arbitrary `arrImpactMultiplier`" problem flagged in 07-DATA-FLOWS Flow 6.
- **Positive example.** Rewrite #25 sets `temperature: 0.3` — analytical task; favor consistency anchored by structured output schema.

### Principle 5 — System prompts are never empty.

- **Rationale.** 04A §25 documented in detail why `system: ""` damages output quality: role discipline collapses, sampling drifts, instruction following weakens, safety and style anchors loosen. DECISIONS.md 2.14 OPEN flagged this. Current #25 had `system: ""`; current #8 had system prompt omitted (effectively empty).
- **Mechanical application.** Every `prompts/<feature>.md` file has a non-empty system block. If the original prompt had role declaration in the user message, Codex moves it to the system block and adjusts the user message to reference the system frame. Lint rule: a `.md` prompt file with empty `system:` fails CI.
- **Anti-example.** Current #25's user message opens "You are an AI sales intelligence analyst." — a system-prompt sentence misplaced in the user turn.
- **Positive example.** Every rewrite in Section 1 has a substantive system prompt; #25's runs 600+ words to compensate for and replace the prior anomaly.

### Principle 6 — Reasoning is invited before answer for analytical prompts.

- **Rationale.** 04A Cross-Cutting found 23/25 prompts lack reasoning structure entirely — model jumps from task statement to JSON answer with no intermediate scaffolding. For analytical prompts (#11, #14, #15, #25) this is the largest single output-quality lever. Chain-of-thought via a `reasoning_trace` field in the tool schema (not a separate call) costs tokens but compounds into sharper analysis.
- **Mechanical application.** Prompts whose task involves multi-step reasoning (synthesis, hypothesis, classification with judgment) MUST include a `reasoning_trace` or `analysis_passes` or equivalent field as the first property in the tool schema. The system prompt names the steps to walk through. The trace is not shown to the user; it conditions the model's structured output.
- **Anti-example.** Current #14 asks for summary + factors + questions + meddpicc_gaps + stakeholder_flags in a single shot with no scaffolding for argument construction.
- **Positive example.** Rewrite #14B's `analytical_passes` field over six explicit passes (theory state at close → trajectory → mechanism → evidence map → lineage → replicability/avoidance). Rewrite #15's `analysis_passes` over five passes for fitness analysis.

### Principle 7 — Shared vocabulary references canonical enums, never duplicates them.

- **Rationale.** 04A Anti-pattern #2 ("Enum interpolated into prompt text as pipe-separated literal") affects #14 (factors category), #15 (status enum), #11 (fitness category in multiple places). The 7-vs-9 signal-type drift between #1 and #21 is the systemic version of this — same task, two different enum sources. DECISIONS.md guardrail #22 mandates a single source-of-truth enum for signal types; this principle generalizes.
- **Mechanical application.** Codex creates enum modules: `SignalTaxonomy.Type` (9 values), `OdealTaxonomy.eventDefinitions` (25 events), `CloseFactorTaxonomy.categoriesForOutcome(outcome)`, `Stage` (pipeline stages), `Vertical`, `MeddpiccDimension` (8 dimensions). Every prompt that references an enum imports it from the canonical module — both the system prompt's enumeration and the tool schema's `enum:` field. Lint rule: no inline pipe-string enums in prompt text.
- **Anti-example.** Current #14 interpolates `"competitor|stakeholder|process|product|pricing|timing|internal|champion"` directly into the spec line. Model sometimes returns the literal pipe string.
- **Positive example.** Rewrite #21 and Rewrite #1 both reference `SignalTaxonomy` for the 9-type enum; the drift cannot recur because both sides import from the same module.

### Principle 8 — Edge cases (empty data, conflicting evidence, low confidence) have explicit handling in the prompt.

- **Rationale.** 04A Cross-Cutting found 17/25 prompts WEAK on edge-case coverage, 4/25 ABSENT. Empty-data cases produce hallucination (#9 fabricates stats when no numbers passed). Conflicting-evidence cases produce arbitrary tiebreaks (#2 cluster matcher when two clusters tie). Low-confidence cases produce confident-sounding low-quality output (#1 entities at confidence 0.9 with thin grounding).
- **Mechanical application.** Every prompt's system block addresses three explicit edge cases: (a) what to emit when input is empty / not enough evidence, (b) what to emit when evidence conflicts, (c) what to emit when confidence is below the floor. The tool schema either enforces empty arrays where appropriate OR provides an `applies: false` / `requires_change: false` opt-out path.
- **Anti-example.** Current #9: "Cite numbers — never be generic" with no numbers in context and no opt-out. Forced output → fabricated stats.
- **Positive example.** Rewrite #9: explicit `applies: false` opt-out with reason; the system prompt names the conditions (rep response is hostile, no concrete grounding available); UI renders no give-back card when applies is false.

### Principle 9 — Prompts live as `.md` files in `prompts/`, not string literals in routes.

- **Rationale.** 04A Anti-pattern #6 (24/25 prompts are template literals inside TypeScript route files; only #5 lives as an imported module). DECISIONS.md guardrail #19 mandates `.md` prompt files loaded at runtime. Inline prompts conflate prompt content with code, make diffs noisy when prompt text changes, prevent non-engineer review, and resist evolution.
- **Mechanical application.** Every prompt is `prompts/<feature>.md` with a YAML front-matter block declaring `name`, `version`, `model`, `temperature`, `max_tokens`, `tool_name`. The `.md` body has two sections: `## SYSTEM` and `## USER_TEMPLATE`. A loader (`prompts/index.ts`) reads files at build time, validates front-matter, exposes typed accessors. Routes call `loadPrompt('call-prep-orchestrator').run({ context })`.
- **Anti-example.** Current `apps/web/src/app/api/agent/call-prep/route.ts` line 787 has the 200-line conditional system prompt assembled by string concatenation inside the route handler.
- **Positive example.** Section 1 of this document presents every rewrite as a complete system prompt + user template ready to drop into a `.md` file.

### Principle 10 — Context assembly happens in services, not inside the prompt.

- **Rationale.** 04A Anti-pattern #8 ("JSON.stringify as a cross-prompt handoff format") affects #22 (receives `JSON.stringify(actions) + JSON.stringify(meddpicc) + ...`), #8, #10. Wall-of-JSON inputs burn tokens and force the model to re-parse. Per DECISIONS.md 2.16 the `DealIntelligence` service is the only interface for intelligence data; per 2.13 the context-assembly pattern lives in service functions.
- **Mechanical application.** Every prompt receives pre-assembled, pre-formatted context blocks from named service methods. No `JSON.stringify` of upstream tool outputs. Service methods like `DealIntelligence.formatMeddpiccForPrompt(dealId)`, `IntelligenceCoordinator.getActivePatterns(opts)`, `TranscriptPreprocessor.getCanonical(transcriptId)` produce typed prompt-ready blocks. Routes call services to assemble the context map, then pass it to the prompt loader.
- **Anti-example.** Current #22's user prompt: `Action items found: ${JSON.stringify(actions)} / MEDDPICC updates: ${JSON.stringify(meddpicc)} / Signals detected: ${JSON.stringify(signals.signals)}` — wall of JSON.
- **Positive example.** Rewrite #15's `${meddpiccBlock}` is sourced from `DealIntelligence.formatMeddpiccForPrompt(dealId)` — pre-formatted, named, typed; service swaps freely.

### Principle 11 — Output schema fields must have downstream consumers; no bloat.

- **Rationale.** 04A Anti-pattern #9 ("Schema fields present but unread") affects #1 (`sensitivity`, `follow_up.clarifies`), #12 (`notes_for_rep` not persisted structurally), #14 (`meddpicc_gaps[]` displayed but not written back). Bloat fields cost tokens, drift over time, and signal that the prompt's spec is stale.
- **Mechanical application.** Every field in every tool schema must have a documented downstream consumer (UI render, DB write, downstream prompt input, audit log). During port, Codex traces each schema field to its consumer; fields with no consumer are dropped. New fields require a consumer named in the integration notes.
- **Anti-example.** Current #1's `sensitivity: "normal" | "political" | "personnel"` is requested but no code reads it — pure bloat.
- **Positive example.** Rewrite #1 drops `sensitivity` and `follow_up.clarifies`; the rewrite's `follow_up.structured_slot` field is added with the explicit consumer (chip-to-structured mapping in the follow-up handler).

### Principle 12 — Conceptually similar tasks have the same output shape.

- **Rationale.** 04A Anti-pattern #3 ("Same task, different system prompts across call sites") affects #12 + #24 + #18 (three email drafters with different shapes), #5 + #19-22 (transcript analysis variants), #1 + #21 (signal classifiers with different enum sizes). DECISIONS.md 2.13 LOCKED mandates "one email-drafting service," "one transcript preprocessing pass," "single signal-type enum." Cross-prompt consistency is a code-quality + UX-quality lever simultaneously.
- **Mechanical application.** Codex identifies prompt clusters during port and consolidates each cluster behind a single core prompt with input variants. Three email-drafting paths become one `prompts/email-draft.md` invoked with `{ trigger: 'on_demand' | 'post_pipeline' | 'post_sale_outreach' }`. Three transcript-analysis paths share `TranscriptPreprocessor`. Two signal classifiers (#1 inline rep flow, #21 pipeline) share `SignalTaxonomy` even though their prompts differ in framing.
- **Anti-example.** Current #12's `to: "Oliver Laurent, VP of Engineering"` (formatted string) vs. current #24's stakeholder names list — same conceptual task, two output shapes.
- **Positive example.** Rewrites #1 and #21 both reference `SignalTaxonomy.Type` enum; they remain separate prompts (different tasks: classify-rep-input vs. detect-from-transcript) but share the vocabulary so consumer code reads them uniformly.

### Principle 13 — Anti-hallucination patterns are explicit, not implicit.

- **Rationale.** 04A Cross-Cutting: 10/25 prompts WEAK on anti-hallucination, 4/25 ABSENT. The highest-consequence paths (#4 writing live config, #11 the rep-facing brief, #20 MEDDPICC writes) had the WEAKEST anti-hallucination — an inverted correlation that is specifically dangerous. DECISIONS.md 2.21 LOCKED mandates hypothesis verification against the event stream for close-lost; this principle generalizes.
- **Mechanical application.** Every analytical prompt includes explicit "if evidence is absent, say so" instructions paired with structured opt-out fields in the tool schema. Where applicable, the service layer adds a verification step that walks emitted citations and rejects/re-runs if citations don't resolve. The forbidden-language pattern (Rewrite #25's "Forbidden language patterns include: 'Build a competitive battlecard,' ...") is a stronger version applicable when the failure mode is well-known.
- **Anti-example.** Current #11: `stakeholders_in_play` invites invention if the contact list is thin; `next_steps` has no grounding rail.
- **Positive example.** Rewrite #11's stakeholders schema requires a `contact_id` UUID — invention becomes structurally impossible because the ID must come from the provided contacts list.

### Principle 14 — Voice and tone are specified for user-facing outputs.

- **Rationale.** 04A Cross-Cutting: 4/25 prompts ABSENT on tone control, 9/25 WEAK. Rep-facing surfaces (call prep, give-back, email drafts) carry the product's voice; lacking tone discipline produces "smart-sounding generic" output. Per DECISIONS.md guardrail #8 the Nexus voice is consistent across all AI outputs — never as a person, always as "Nexus Intelligence."
- **Mechanical application.** Every user-facing prompt explicitly names the voice ("smart colleague's tip," "strategic VP of Sales," "knowledgeable peer at the rep's company") and constrains forbidden patterns ("no 'Hope this helps' sign-offs," "no 'Based on...' preambles," "no exclamation points"). Where rep voice transfer is required (call prep, email drafts), the prompt binds to the rep's `agent_config` voice fields with explicit fallback.
- **Anti-example.** Current #10 (aggregated answer): one-sentence system prompt naming the audience but no tone control; outputs read as data rollups.
- **Positive example.** Rewrite #9 system prompt: "Voice: a peer, not a system. First sentence states the read; second sentence (optional) connects it to the rep's next move. Do not write 'Based on...' preambles or 'Hope this helps!' sign-offs."

### Principle 15 — Length and verbosity are explicitly bounded per output section.

- **Rationale.** 04A Cross-Cutting: 11/25 prompts STRONG and 10/25 ADEQUATE on length control — but the controls are usually overall (max_tokens) not per-section. #11 is the case in point: max_tokens 3000 with no section budgets means the model allocates tokens unpredictably across 10+ sections.
- **Mechanical application.** Tool schemas specify per-section bounds via `minItems` / `maxItems` for arrays and `maxLength` for strings where length matters. Where the model can produce variable-count output (talking points, factors, recommendations), the prompt names the cap. Headlines: max 200 chars. Per-item descriptions: bounded sentences. Length is enforced at the schema level, not by prompt prose alone.
- **Anti-example.** Current #11 talking_points has no bound — model emits anywhere from 1 to 10 across calls.
- **Positive example.** Rewrite #11 orchestrator: `talking_points` minItems 2 maxItems 4; `questions_to_ask` minItems 3 maxItems 5; `next_steps` minItems 2 maxItems 4; `headline` maxLength 200.

### Principle 16 — Every prompt file has a version stamp.

- **Rationale.** Prompts evolve. Without versioning, regressions are invisible: a prompt change deploys, output quality drops, and there's no breadcrumb to diff against. Operators see degraded UX with no diagnostic.
- **Mechanical application.** Every `prompts/<feature>.md` front-matter includes `version: <semver>`. The loader logs the version on every run via `agent_actions_log.prompt_version`. UI surfaces emitting AI content (call prep brief, close hypothesis, give-back) include the prompt version in the activity metadata so post-hoc diffs are possible. Bumps follow semver: patch for typo / clarification, minor for added capability or new field, major for incompatible schema change.
- **Anti-example.** Current Nexus: prompt changes ship inside route refactor commits; no version log; regressions diagnosed by reading git blame.
- **Positive example.** Each rewrite's `.md` file in `prompts/` will carry `version: 2.0.0` on initial port (the Section 1 rewrites) and `version: 1.0.0` for the 17 ported originals (mechanical port; same semantics).

---

### Port checklist for the remaining 17 prompts

For each non-rewritten prompt during port:

```
[ ] Moved from inline string literal to `prompts/<feature>.md` (Principle 9)
[ ] System prompt is non-empty (Principle 5)
[ ] Front-matter declares model, temperature, max_tokens, tool_name, version (Principles 4, 16)
[ ] Model pinned via env var, not string literal in prompt
[ ] Temperature set explicitly per task type (classification 0.2, synthesis 0.3, voice 0.5-0.7) (Principle 4)
[ ] Output ported to tool-use schema (no JSON-in-text + regex parser) (Principle 2)
[ ] Shared enums (SignalTaxonomy, OdealTaxonomy, CloseFactorTaxonomy, MeddpiccDimension, Stage, Vertical) imported from canonical source (Principle 7)
[ ] Context gathered by a service function (DealIntelligence, CrmAdapter, IntelligenceCoordinator, TranscriptPreprocessor) (Principle 10)
[ ] No JSON.stringify of upstream tool outputs as user-message context (Principle 10)
[ ] Edge-case handling explicit in the prompt (empty data, conflicting evidence, low confidence) (Principle 8)
[ ] Anti-hallucination pattern explicit; opt-out field added where applicable (Principle 13)
[ ] Voice and tone named for user-facing outputs (Principle 14)
[ ] Length bounds at section level via tool schema minItems/maxItems/maxLength (Principle 15)
[ ] Every output field has a named downstream consumer (Principle 11)
[ ] Reasoning trace field included for analytical prompts (Principle 6)
[ ] Version stamp added at top of .md file (Principle 16)
[ ] Cross-prompt consistency checked: same conceptual task = same output shape (Principle 12)
[ ] Role framing rewritten to invoke domain expertise if originally generic (Principle 1)
```

---

## Section 3: Rewrite Rationale Summary

The eight rewrites land in dependency-informed order so that downstream rewrites consume already-upgraded inputs. The rationale unfolds in five layers.

**Why upstream-first sequencing matters.** A naive 04A-priority ordering (#4, #11, #14, #25, #1, #9, #15, #21) would put #11 second — meaning #11's rewrite would happen against the OLD #25/#15/#4/#1/#21 outputs and need a second pass once upstream rewrites land. The dependency-informed order avoids that re-work. Each rewrite assumes the prior ones have shipped and integrates against their typed outputs, not their pre-rewrite prose.

**Which rewrites unlock which others.** The chain is concrete: #21 (Detect Signals) establishes the canonical 9-type signal enum sourced from `SignalTaxonomy` — once that lands, #1's rewrite can reference the same enum and the 7-vs-9 drift dies permanently, which in turn means the agent-config feedback loop (#4) can finally fire from pipeline-detected signals. #4's rewrite from auto-write to event-sourced proposal (DECISIONS.md 2.25 #3) means downstream prompts (#11 call prep, #12 email draft, #13 NL config interp) consume an `agent_configs` row that wasn't silently mutated since their last call — the cycle risk between #4 and #13 (04B Finding 10) breaks. #25's coordinator synthesis fix is load-bearing for #11: per DECISIONS.md 2.17 LOCKED call prep MUST query the coordinator, but only after #25's `system: ""` anomaly is fixed and its output gains the structured per-deal recommendations the call-prep orchestrator's `coordinator-intel` sub-prompt consumes. #15 (Deal Fitness) feeds #11's fitness-insights sub-prompt; without #15's rewrite (renamed output fields matching DB columns; full narrative jsonb trusted not overridden), #11 inherits the same downstream issues. #14 splits into two prompts, with #14B reading from the rolling theory #14A maintains — both depend on the event-sourced architecture (DECISIONS.md 2.16) being built. #9 is the safe slot: terminal prompt with no downstream prompt consumers; rewriting it before #11 lets us validate the new context-assembly patterns (peer responses, coordinator patterns, system intelligence) on a small surface before integrating them in the integrator. #11 lands last because it integrates over five already-rewritten prompts.

**What the Nexus experience feels like after all 8 rewrites + 17 ports are in place.** Reps experience three durable changes. First, the agent bar's classification feels lighter — fewer follow-up questions because the classifier sees observer history + page deal + active patterns and resolves entities cleanly; when a follow-up does fire, it's because the system genuinely needs one structured slot filled. Second, the call-prep brief is rebuilt around the rep's actual deal trajectory — not just current MEDDPICC and a list of open signals, but the rolling theory, the coordinator patterns referencing this deal, the fitness narrative with specific evidence, the peer reps' current findings filtered through anonymized aggregates. Third, when a deal closes lost, the modal opens with a VP-grade hypothesis grounded in the full event stream and asks the rep two pointed questions — not a blank loss-reason form. The Act 2 narrative (cross-deal coordinator intelligence reaching the next call prep) finally works end-to-end because the broken `addCoordinatedIntel` no-op path is replaced by direct `coordinator_patterns` queries.

**Risks and caveats.** The rewrites are not patches; they are re-architectures. Each rewrite assumes named v2 services (`DealIntelligence`, `CrmAdapter`, `IntelligenceCoordinator`, `TranscriptPreprocessor`, `SignalTaxonomy`, `OdealTaxonomy`, `CloseFactorTaxonomy`, `Formatter`) exist before the prompt is wired. Codex must build those services before porting the dependent prompts. Specifically: #11 cannot be ported before `DealIntelligence.getDealContext(dealId)` exists; #14B cannot be ported before the event-sourced `deal_events` + `deal_snapshots` tables and `DealIntelligence.getEventStream(dealId, opts)` exist; #25 cannot be ported before `IntelligenceCoordinator.getActivePatterns(opts)` is a real read API. The port order in v2 implementation should mirror the rewrite order in this document; trying to ship #11 first will fail because four upstream services aren't yet built.

The cost of these rewrites is also concrete: token usage rises (richer context, reasoning traces, structured outputs) and per-prompt latency rises modestly (some prompts gain max_tokens budget). DECISIONS.md guardrail #10 ("cost is not a constraint in this phase") authorizes this. Output quality compounds because the structured outputs feed downstream prompts cleanly — every prompt benefits from every prior rewrite, not just text-level improvements.

---

## Section 4: What Was NOT Rewritten and Why

The 17 prompts not in the Top 8 stay verbatim per DECISIONS.md 2.7 — but "verbatim" applies to prompt text, not to wiring. Codex applies the Section 2 port checklist to each. The table below names the priority from 04A, the reason this prompt didn't make the Top 8, and the specific port treatment Codex applies.

| # | Prompt | 04A Priority | Reason not in Top 8 | Codex port treatment |
|---|---|---|---|---|
| 2 | Cluster Semantic Match | PRESERVE WITH MINOR EDITS | Strong shape, low blast radius (terminal cluster-assignment surface), 2 quotes-per-cluster shape problem fixable via richer context per 07A §2 | Mechanical port + add `severity`, `arr_impact_total`, full `unstructured_quotes`, `verticals_affected[]`, `structured_summary` to context. Tool-use schema with `cluster_id` enum-validated against active clusters. |
| 3 | New Cluster Detection | SHOULD REWRITE | Lower blast radius than #1; same architectural improvements as #1 apply mechanically; not in Top 8 because text-level improvements are smaller leverage than #1's | Mechanical port + add observer_id, linked_deals, ARR per unclustered observation per 07A §3. Tool-use schema. Same `SignalTaxonomy` enum as #1, #21. |
| 5 | Streaming Transcript Analysis | PRESERVE WITH MINOR EDITS | Strong text already; isolated surface (`/analyze` page side tool); per 07A §5 main upgrade is optional dealId context which is feature work, not prompt rewrite | Mechanical port (already `.md` file as `apps/web/src/lib/analysis/prompts.ts` SYSTEM_PROMPT — easiest port). Add optional dealId-to-context expansion in route. Streaming preserved. |
| 6 | Field Query Analysis (Org-Wide) | SHOULD REWRITE | Schema conflict between direct-answer and fanout cases is real (04A); priority below #11/#14/#25 because field-query flow is a smaller surface | Mechanical port + add coordinator patterns, prior field queries, system intelligence per 07A §6. Split tool schema into `direct_answer` and `fanout_targets` variants — not a rewrite, a schema refactor. |
| 7 | Personalized AE Question Generator | SHOULD REWRITE | Voice-critical (per-AE personalization) but standalone within field-query flow; not Top 8 because field-query flow rebuilds happen below the call-prep + close-lost integrator priorities | Mechanical port + add MEDDPICC and active experiments to per-AE context. Tool-use schema with structured chips (`structured_slot` mapping like #1's). Add a worked good-question/bad-question example pair. |
| 8 | Deal-Scoped Manager Question Answer | SHOULD REWRITE | Second `system: ""` anomaly per 04A (tied with #25); same fix mechanically applies; not Top 8 because deal-scoped Q&A feeds no downstream prompts | Mechanical port + non-empty system prompt addressing the anomaly. Replace plain-text+sentinel parsing with tool-use schema (`{ summary, needs_ae_input, suggested_chips_for_ae }`). Add MEDDPICC + agent memory + coordinator patterns context per 07A §8. |
| 10 | Aggregated Answer Synthesis | SHOULD REWRITE | 1-sentence system prompt is the central defect; prompt-text fix is mechanical; not Top 8 because terminal field-query rollup with no downstream consumers | Mechanical port + role framing per Principle 1. Tool-use schema: `{ summary, key_findings, agreement_level, dissent_notes, confidence, recommended_next_step }` per 04A suggestion. Add per-response AE context, prior aggregated answers, coordinator patterns per 07A §10. |
| 12 | Email Draft Generator | SHOULD REWRITE | Strong existing voice-control; main fixes are context-shape (prior email bodies missing) and consolidation with #24/#18; not Top 8 because consolidation is a code refactor, not a prompt rewrite | Consolidation port: this and #24 and #18 merge into `prompts/email-draft.md` with input variants (`trigger: 'on_demand' | 'post_pipeline' | 'post_sale_outreach'`). Add prior email bodies, MEDDPICC, agent memory, fitness gaps, coordinator patterns to context. Single tool schema. |
| 13 | NL Agent Config Interpretation | SHOULD REWRITE | Strong anti-hallucination already; structurally sound; cycle risk with #4 breaks once #4 becomes a proposal (no longer racing); not Top 8 because the cycle-risk fix lands when #4 lands | Mechanical port + manager directives, change history, role-framing, examples per 07A §13. Tool-use schema preserves `{ changeSummary, updatedFields, fullConfig, clarification }`. |
| 16 | Customer Response Kit | SHOULD REWRITE | Hardcoded role + invented account names + missing prior conversations; fixable mechanically; not Top 8 because post-sale Book is a separate surface from the deal pipeline pipeline-and-close-lost rewrites prioritize | Mechanical port + de-hardcode role (parameterize); ground similar_resolutions in actual `account_health` records (no invention); pass prior `customer_messages` thread for the contact. Tool-use schema. |
| 17 | QBR Agenda Generator | SHOULD REWRITE | Client-trusted context (no DB query) is a security smell; product hardcoding ("Claude AI, Claude Code, Cowork") is a reusability blocker; not Top 8 because QBR surface is post-sale-only | Mechanical port + server-side context query (no client-trusted account context). De-hardcode product list. Tool-use schema with structured agenda items. |
| 18 | Customer Outreach Email | SHOULD REWRITE | Sarah-hardcoded sign-off; consolidation with #12/#24 (per Principle 12 + DECISIONS.md 2.13); not Top 8 because consolidation lands when #12 ports | Consolidation port into `prompts/email-draft.md` with `trigger: 'post_sale_outreach'` variant. Parameterize sender. Add recipient engagement history. |
| 19 | Pipeline Step — Extract Actions | SHOULD REWRITE | Direct consumer of #22 + #24 (high direct blast); but text-level fixes are mechanical and the canonical analyzed-transcript object resolves the truncation drift; not Top 8 because the architectural fix is the preprocessor (DECISIONS.md 2.13), not the prompt rewrite itself | Mechanical port + read from `TranscriptPreprocessor.getCanonical()` (canonical analyzed-transcript) instead of raw transcript text. Tool-use schema. Distinguish buyer vs. seller actions explicitly per 07A §19. |
| 20 | Pipeline Step — Score MEDDPICC | SHOULD REWRITE | High transitive blast (3 surfaces, 3 transitive consumers, score 9 in 04B) but principal fix is context-shape (pass existing evidence text per 07A §20) — text-only rewrite gives modest gains; flagged 04B Finding 7 as next-tier behind Top 8 | Mechanical port + pass current MEDDPICC evidence text per dimension (not just score). Tool-use schema with per-dimension contradiction-handling instruction. Same canonical analyzed-transcript input as #19/#21. |
| 22 | Pipeline Step — Synthesize Learnings | SHOULD REWRITE | Strong existing examples + evidence-citation discipline; fixes are truncation consistency + prior-learnings + structured upstream inputs; not Top 8 because the per-prompt blast is bounded to deal_agent_states.learnings | Mechanical port + match upstream truncation via `TranscriptPreprocessor`; pass existing learnings; replace JSON.stringify upstream-output blobs with structured sections; tool-use schema with `learnings[].{ evidence, context, action, scope }` per Principle 11. |
| 23 | Pipeline Step — Experiment Attribution | SHOULD REWRITE | Conditional pipeline step; medium blast; not Top 8 because attribution lands cleanly after the applicability gate (DECISIONS.md 2.21) is built — bigger lift than this prompt's text rewrite | Mechanical port + applicability gate per DECISIONS.md 2.21 (only run against experiments whose applicability matches the deal's state). Pass existing experiment_evidence for dedup. Tool-use schema. |
| 24 | Pipeline Step — Draft Follow-Up Email | SHOULD REWRITE | Consolidation target with #12/#18 per DECISIONS.md 2.13; not Top 8 because the consolidation work is captured in #12's port treatment | Consolidation port into `prompts/email-draft.md` with `trigger: 'post_pipeline'` variant. Pass full stakeholder details, prior emails, MEDDPICC, agent memory per 07A §24. |

The seventeen prompts above ship to v2 with cleaner context, typed outputs, shared enums, and explicit edge-case handling — all without changing the prompt text's semantic intent. "Preserve verbatim" means "preserve the model's instructions"; the surrounding wiring is rebuilt to match the v2 architecture.












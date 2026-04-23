# 04A — Prompt Quality Audit

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Historical v1 audit + input to 04C rewrites.** Phase 3+ sessions rarely read this directly; 04C's Section 1 (8 rewrites) + Section 2 (16 principles) already operationalized this audit's findings. Read as the "why" behind 04C's per-prompt disposition (MUST REWRITE / SHOULD REWRITE / PRESERVE).
>
> **v2-era resolutions for findings in this doc:**
> - 4 MUST REWRITE prompts (#4, #11, #14, #25) — all covered by 04C Rewrites 3/4/6/8.
> - `reasoning_trace` absent on 23/25 — §2.13.1 calendars per-prompt resolutions: 02 + 04 + 05 + 06b have it; 01 + 03 land before Phase 3 Day 2 / Phase 5 Day 1 respectively; 06a + 08 reviewed at Phase 5 Day 1 kickoff.
> - JSON-in-text parsing anti-pattern — resolved by §2.13 + Guardrails 16-18 (tool-use schemas forced via the Claude wrapper).
> - Signal-type enum drift (9 in #1 vs 7 in #21) — closed by single-sourced `SIGNAL_TAXONOMY` tuple imported by both schema pgEnum + tool-use schema + Rewrite 1.
> - `preClassified: true` trust flag (#4 upstream) — resolved by §2.11 + Guardrail 14.
>
> Current v2 authoritative sources: `~/nexus-v2/docs/DECISIONS.md` §2.13 / §2.13.1; `~/nexus/docs/handoff/04C-PROMPT-REWRITES.md` Section 1. Handoff-edit policy per §2.13.1.

---

## Preamble

This document evaluates the **text** of each Claude prompt in Nexus for structural quality, output schema fitness, known failure modes, and rewrite priority. It is the complement to [07A-CONTEXT-AUDIT.md](./07A-CONTEXT-AUDIT.md), which evaluated what context each prompt receives. Together, the two documents diagnose why the current prompts produce the output they do — and what to change.

**Scope:** Per DECISIONS.md 2.15, this audit runs across two sessions.
- **This session (4.5a)** covers prompts 1 through 13 from [04-PROMPTS.md](./04-PROMPTS.md).
- **The next session (4.5b)** will append entries 14 through 25 and a full Cross-Cutting Analysis section.

**How to read an entry:**
- "Task Summary" sets up what the prompt is for.
- "Engineering Quality Assessment" scores it across 9 dimensions (role framing, task specificity, reasoning structure, output structure, examples, edge cases, anti-hallucination, tone, length).
- "Output Schema Quality" evaluates the requested output shape against what downstream code actually consumes.
- "Known Failure Modes" lists observable problems.
- "Rewrite Priority" puts each prompt into one of four buckets — MUST REWRITE, SHOULD REWRITE, PRESERVE WITH MINOR EDITS, PRESERVE AS-IS — with justification.
- "Specific Improvement Suggestions" gives 3-6 concrete directions (not rewrites; rewrites are Prompt 4.7's job).
- "Blast Radius Recap" notes downstream dependencies.

**How this audit feeds later sessions:**
- **Prompt 4.6** builds the full prompt dependency graph using the Blast Radius notes here.
- **Prompt 4.7** writes the actual rewrites for every prompt marked MUST REWRITE or SHOULD REWRITE.
- **Prompt 9** (critique) uses the ranking + failure modes to sharpen the rebuild narrative.

**Ground rules used:**
- Quote the actual prompt text when criticizing it. Cite 04-PROMPTS.md line numbers where relevant.
- When a problem stems from missing context rather than bad prompt text, flag it and cross-reference 07A.
- No full rewrites — direction only.
- "Strong/adequate/weak/absent" ratings are grounded in observable prompt properties, not generic best-practice opinions.

---

## 1. Observation Classification

**Task Summary**

Given a raw field observation from a sales rep (typed into the Universal Agent Bar), classify it into one or more of 9 signal types, extract entities, link to CRM accounts and deals, assess sentiment/urgency/sensitivity, decide whether to ask a follow-up question, and produce a warm acknowledgment. Runs on every observation (rep-initiated) plus every pipeline-generated signal (with `preClassified: true` skipping this call). Output flows into the observation row, the cluster matcher (prompt #2), the new-cluster detector (prompt #3), and the agent-config suggester (prompt #4). This is the front door to the entire intelligence-capture system and — per DECISIONS.md 1.2 LOCKED "Research-Interview Pattern" — is one of the few prompts that already implements the "ask the user to react, don't give them a form" pattern.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. Opens with "You are the AI classification engine for Nexus, a sales intelligence platform." Functional but generic — doesn't evoke domain expertise. Contrast with prompt #15's opening ("expert deal intelligence analyst implementing the oDeal framework") which anchors the model in a richer frame.
- **Task specificity.** STRONG. Seven numbered tasks with explicit sub-instructions per task. "Ask a follow-up ONLY when..." gives 4 specific conditions; "Do NOT ask a follow-up when..." gives 5 more. Few prompts in the registry are this precise about task shape.
- **Reasoning structure.** WEAK. The prompt asks for 7 outputs in a single JSON blob but does not invite intermediate reasoning (no "first think about X, then Y"). Claude has to hold all seven sub-tasks simultaneously and emit a single structured response — for complex observations, this invites shortcutting on one of them.
- **Output structure.** STRONG on format specification (literal JSON schema with example values), WEAK on type discipline. `"needs_clarification"` is requested but the prompt never describes when to set it true (07A §1 failure mode). `entities[].type` is an inline enum in quotes ("account"|"deal"|"competitor"|"amount"|"timeline") — the model interprets it loosely.
- **Examples / few-shot.** ADEQUATE. Inline examples for entity matching ("MedCore" → "MedCore Health Systems") and chip tone ("plain language...not a form"). No example of a good classification-with-follow-up vs. classification-without-follow-up pair — which is exactly the judgment the prompt most wants to guide.
- **Edge-case coverage.** PARTIAL. Handles "can't determine which account/deal" with an explicit ask-which-deal instruction. Does not address: what if the observation mentions multiple competitors? What if sentiment is mixed (positive toward Anthropic, negative toward internal process)? What if the 9 signal types don't fit (the 10th "unknown" case)?
- **Anti-hallucination.** WEAK. The prompt instructs entity matching ("Match partial references to known accounts") but provides `accountNames` as a comma-joined blob (07A §1 shape risk). There's no instruction like "if the deal/account isn't in the provided list, do not invent one." `linked_accounts[].confidence` is requested but without calibration guidance — a confidence of 0.9 on an inferred account is a lie the prompt doesn't guard against.
- **Tone / voice control.** ADEQUATE. "Like a helpful colleague" for the acknowledgment, "sound like a colleague, not a form" for follow-up questions. Not specified for the classification block itself (which is structured, so tone matters less there).
- **Length / verbosity control.** ADEQUATE. 1-sentence acknowledgment, one-sentence summaries per signal — explicit. No length cap on follow-up questions.

**Output Schema Quality**

Three top-level keys: `classification` (rich nested object with signals, sentiment, urgency, sensitivity, entities, linked_accounts, linked_deals, needs_clarification), `follow_up` (should_ask, question, chips, clarifies), `acknowledgment` (string). Matches downstream consumer shape loosely — `classification.signals[0].type` is read by routing; `entities` is written to `extractedEntities`; `linked_accounts`/`linked_deals` are read by `resolveEntities()`; follow_up drives UI; acknowledgment flows into giveback.

Schema problems:
- `entities`, `linked_accounts`, `linked_deals` are both at top-level AND inside `classification` in the parser fallback code (`parsed.entities || classResult.entities`) — the prompt's single location invites ambiguity when the model nests inconsistently.
- `sensitivity` ("normal" | "political" | "personnel") is requested but I cannot find any code that reads it. Potential dead field — bloat.
- `follow_up.clarifies` is in the schema but its purpose is undocumented (what does it "clarify"?). Likely dead.
- `signals[].competitor_name`, `.content_type`, `.process_name` are optional per-signal hints — fine.

Under v2 tool-use (DECISIONS.md 2.13), this becomes a tool-call with 3 top-level fields and typed sub-shapes. `sensitivity` and `clarifies` can be dropped unless explicitly used.

**Known Failure Modes**

- **Silent classifier fallback.** If `JSON.parse` succeeds but `classification` key is missing, code falls through to `{ signals: [{ type: "field_intelligence", confidence: 0.5, summary: first-100-chars }], sentiment: "neutral", urgency: "medium" }`. The observation is saved but lands in the low-signal "field_intelligence" bucket — a parse quirk becomes a systematic mis-routing.
- **9-vs-7 signal-type drift.** Observations classifier lists 9 types (includes `agent_tuning`, `cross_agent`); pipeline signal detector (#21) lists 7. Pipeline observations can never be `agent_tuning`, so the agent-config auto-mutation path (#4) never fires from pipeline signals. This is cross-prompt debt; fixing it is trivial once both prompts source from a single enum (DECISIONS.md 2.13 "Single signal-type enum").
- **Chip-response brittleness.** The prompt says "chips should be plain language" but the downstream follow-up handler `observations/[id]/follow-up/route.ts` has a hardcoded lookup `CHIP_TO_STRUCTURED` expecting specific strings like "Just this deal". A chip worded as "Only this one" won't match. Documented in 04-PROMPTS.md #1 known issues.
- **`needs_clarification` is never explicitly documented.** Prompt outputs it; UI forces a follow-up when it's true; prompt never says when to set it. Model behavior is model-determined.
- **Entity hallucination on sparse input.** Raw observation "the big healthcare deal is stalling" with only `accountNames` as a CSV produces `linked_accounts: [{ name: "<best guess>", confidence: 0.9 }]` confidently — the model has no instruction to abstain when evidence is thin.
- **Entities classified as `amount` or `timeline` are extracted but not consumed.** `extractedEntities` jsonb stores them; no downstream code surfaces them.

**Rewrite Priority**

**SHOULD REWRITE.** Prompt is structurally solid (7 tasks, explicit JSON schema, reasonable framing) but has specific gaps that materially affect output quality: no anti-hallucination instruction, no reasoning scaffolding, `needs_clarification` undocumented, signal-type enum drift with prompt #21, example asymmetry (entity-matching examples present but no classify-follow-up example pairs). Adequate for a v1 demo; not VP-of-Sales-grade and not aligned with DECISIONS.md 2.13's structured-output direction.

**Specific Improvement Suggestions**

1. **Restructure as tool-use (per 2.13).** Replace the "Return JSON:" block with a typed tool schema. Make `sensitivity` and `follow_up.clarifies` optional-and-documented OR drop them.
2. **Add anti-hallucination rails.** Instruction: "If no account/deal in the provided list clearly matches, return an empty `linked_accounts`/`linked_deals` array. Do not invent entities." Calibrate confidence semantics explicitly ("0.9+ means explicit name match; 0.5-0.8 inference from context; below 0.5 exclude from array").
3. **Add one worked example of the follow-up decision.** A dense observation that should get a follow-up (ambiguous scope) and one that shouldn't (single deal named + amount + competitor). This is the single hardest judgment the prompt makes; examples outperform rule lists.
4. **Document `needs_clarification` explicitly.** When is it true? What does downstream UI do with it? Align prompt with code.
5. **Source the 9 signal types from a single enum** rather than re-enumerating in prompt text. Critical for closing the 9-vs-7 drift with #21.
6. **Break "decide if follow-up" into a distinct reasoning step.** Instruction: "Before emitting your JSON, enumerate the 4 ask-when conditions and the 5 don't-ask conditions against this specific observation, then decide." This invites CoT reasoning without requiring a separate call.

**Blast Radius Recap**

Output seeds prompts #2 (cluster match — `primarySignalType` is the first signal's type), #3 (new cluster detection — same), and #4 (agent config suggestion when signal type is `agent_tuning` or `cross_agent`). Classification errors propagate forward. Per 07A §1 HIGH rating, tightening this prompt tightens the whole observation pipeline.

---

## 2. Cluster Semantic Match

**Task Summary**

Given a raw observation and its primary signal type, decide which existing `observation_clusters` row (if any) is the semantically matching pattern — where "match" means "same underlying issue, even with different words." Returns `{ cluster_id, confidence }` with confidence ≥ 0.6 required to accept the match. Runs inline in `POST /api/observations` after prompt #1. Writes to `observations.cluster_id` and appends to the cluster's `unstructured_quotes` jsonb.

**Engineering Quality Assessment**

- **Role framing.** WEAK. "You match sales observations to existing patterns." Functional but no expertise framing. Cluster matching is nuanced work (GDPR = data privacy; pricing != legal delay) — the prompt could invoke "expert pattern analyst" framing.
- **Task specificity.** ADEQUATE. Two concrete examples: "GDPR compliance" matches "data privacy regulations"; "slow legal review" does NOT match "GDPR Compliance." Defines the threshold ("< 0.6, return null"). Doesn't address ties or near-matches.
- **Reasoning structure.** ABSENT. Direct question → JSON answer. No "consider the primary signal type, then inspect quotes, then decide" scaffold.
- **Output structure.** STRONG. `{ "cluster_id": "ID" or null, "confidence": 0.0-1.0 }` is a minimal, well-typed shape. Downstream code handles the `cluster_id: null` vs. literal `null` ambiguity noted in 04-PROMPTS #2.
- **Examples / few-shot.** STRONG for size. Two match examples + one non-match example in ~3 lines of prompt text. Maximum signal density for the token cost.
- **Edge-case coverage.** WEAK. What if multiple clusters match with similar confidence? Prompt doesn't say "pick the highest" or "pick the one with the same primary signal type." What if the observation is ambiguous about its primary issue? The prompt gives no tiebreaker beyond confidence.
- **Anti-hallucination.** ADEQUATE. The prompt constrains the model to existing clusters by providing them explicitly. A model can't invent a cluster ID outside the list. However, nothing prevents it from over-matching (returning `confidence: 0.8` for a loose match).
- **Tone / voice control.** N/A. Internal structured output.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 200` is appropriate for the output shape.

**Output Schema Quality**

Two-field object. Schema matches the single consumer in code. Low bloat. The threshold (0.6) is enforced in code, not prompt — documented tradeoff (04-PROMPTS #2: "Threshold `0.6` is hardcoded in code; prompt just says 'if < 0.6, return null' — two places to change"). Under v2 tool-use, the threshold should be prompt-side (model emits "MATCH" | "NO_MATCH") OR a single field with a specific semantic. Making the model return `null` + confidence + then code re-enforces the threshold is slightly awkward but not broken.

**Known Failure Modes**

- **Cluster under-representation drives false negatives.** Per 07A §2, each cluster is shown with only the top 2 `unstructured_quotes`. A cluster matching the new observation on its 5th quote won't match because the model never saw it.
- **No severity/ARR tiebreak** when two clusters match at similar confidence — model picks arbitrarily.
- **Vertical mismatch isn't penalized.** A Healthcare cluster matching a Financial Services observation should score lower; the prompt has no such instruction.
- **Signal-type mismatch isn't enforced.** The primary signal type is passed in but the prompt says nothing about respecting it ("return match only if cluster has same signal type"). A Technical fit cluster could match a Readiness fit observation.
- **Silent low-confidence matches.** When no cluster matches, code creates a new cluster via prompt #3. When the match is borderline (confidence 0.55, just below threshold), an essentially-valid cluster is rejected and a duplicate cluster is created.

**Rewrite Priority**

**PRESERVE WITH MINOR EDITS.** The prompt is small, tightly focused, and does its one job. The principal problems are context problems (per 07A §2: 2-quote truncation, no severity/ARR/vertical/full-quotes) rather than prompt-text problems. Fixing the context shape closes most of the quality gaps. Prompt-text edits are second-order.

**Specific Improvement Suggestions**

1. **Add a tiebreak rule to the prompt text.** "If multiple clusters match with similar confidence, prefer the one with matching signal type, then matching vertical, then highest observation count."
2. **Add a respect-signal-type instruction.** "The new observation's primary signal is `{type}`. A cluster with a different signal type should score below 0.6 unless the semantic match is exceptionally strong."
3. **Calibrate confidence explicitly.** Replace "0.0-1.0" with a rubric ("0.9+ same words or trivial paraphrase; 0.7-0.9 same concept different wording; 0.6-0.7 adjacent but not identical; below 0.6 treat as different pattern").
4. **Upgrade to tool-use** per DECISIONS.md 2.13 with `match_decision: "match" | "no_match"` instead of null-string trickery.
5. **Pair with the context fix.** The bigger lift is in 07A §2: pass all unstructured_quotes (not top 2), pass severity/arr_impact/observation_count, pass verticals_affected.

**Blast Radius Recap**

Output writes `observations.cluster_id` when confidence ≥ 0.6. Feeds prompt #3 (new cluster detection) via the fall-through path when no match is found. Feeds the Intelligence Patterns tab via cluster composition. Direct impact on dashboard coherence and `observation_clusters.unstructured_quotes` signal quality over time.

---

## 3. New Cluster Detection

**Task Summary**

When prompt #2 finds no existing cluster match above the 0.6 threshold, this prompt examines the new observation + up to 30 recent unclustered observations and decides whether at least one existing unclustered observation forms a pattern with the new one. If yes, it proposes a new cluster title + description and returns the matching IDs. The code then creates a new `observation_clusters` row and updates all matched observations to point at it. Runs inline in `POST /api/observations`.

**Engineering Quality Assessment**

- **Role framing.** WEAK. "You detect patterns in sales observations." One sentence. No expertise anchor, no emphasis on the cost of false patterns (clutters the dashboard) vs. false negatives (misses real trends).
- **Task specificity.** ADEQUATE. Instruction to focus on "semantic meaning, not keywords" is stated plus one match example (GDPR = data privacy). Threshold behavior specified ("If < 1 match, return empty...").
- **Reasoning structure.** ABSENT. Single question → answer. For a 30-observation comparison task, this is a meaningful miss — a "compare new observation to each candidate, note which share the same issue, then select" structure would produce more defensible groupings.
- **Output structure.** STRONG for size. `{ matching_ids, pattern_title, pattern_description }` is exactly what the consumer writes to the new cluster row.
- **Examples / few-shot.** WEAK. One inline example (GDPR). No example of a good pattern_title ("5-8 word title") vs. a vague one. No example of the "< 1 match, return empty" case.
- **Edge-case coverage.** WEAK. What if the new observation is the only one about its topic (the common case)? Prompt implies the right answer is empty `matching_ids` but doesn't explicitly say "it is correct to return no matches if the observation is unique." What if 2-3 disjoint sub-patterns exist among the candidates? The prompt implicitly asks for one cluster.
- **Anti-hallucination.** ADEQUATE. The candidates are listed with IDs; model returns IDs from the list. No path to invent an ID.
- **Tone / voice control.** WEAK. `pattern_title` is user-facing (rendered on Intelligence Patterns tab) but no tone guidance beyond "5-8 words." A title like "PROBLEMS" is 1 word and conforms to no other rule.
- **Length / verbosity control.** STRONG. 5-8 word title, one-sentence description, `max_tokens: 300`.

**Output Schema Quality**

`{ matching_ids: string[], pattern_title: string | null, pattern_description: string | null }` matches consumer needs. One schema quirk: the prompt says "If < 1 match, return: { matching_ids: [], pattern_title: null, pattern_description: null }" but the downstream code checks `matching_ids.length >= 1` and skips cluster creation when empty, making the null title/description handling redundant. Not broken, just bloated.

**Known Failure Modes**

- **120-char truncation on `rawInput` per candidate** (07A §3 shape risk). Long observations get cut mid-idea; pattern detection on the preserved first 120 chars is brittle. At 30 candidates × 120 chars that's 3.6K chars of context; budget easily accommodates 500+ per observation.
- **No observer diversity check.** A "pattern" of 4 observations all from one rep about one deal is dashboard noise. Prompt has no guidance to prefer cross-observer patterns.
- **Competes with prompt #2.** When #2 returns confidence 0.55 (just below threshold), the observation flows into #3 with 30 unclustered candidates — none of which are the near-miss cluster from #2. So a borderline match becomes a duplicate cluster. This is a system-level failure, not a prompt-text failure.
- **Cluster title quality drifts.** Without an explicit tone/style guide, `pattern_title` values range from "Pricing competitive pressure" to "Microsoft DAX."
- **Empty-array output is specified but unused.** See schema note above.

**Rewrite Priority**

**SHOULD REWRITE.** Two specific text-level problems (no reasoning structure over 30 candidates, thin examples) and three context problems (120-char truncation, no observer info, no linked-deal info per 07A §3). Together they leave too much of pattern-detection quality to model whim. Context fixes are load-bearing; prompt-text fixes are upgrades.

**Specific Improvement Suggestions**

1. **Add a compare-then-decide reasoning step.** "For each candidate observation, briefly consider whether it shares the same underlying issue as the new one. Then select the IDs that clearly match."
2. **Add an observer-diversity instruction.** "Prefer patterns where matched observations come from different observers or different deals. A cluster of 4 observations from one rep about one deal is usually noise, not a pattern."
3. **Add a clear anti-match example.** Paired with the GDPR match example: show a pair of candidates the model should NOT cluster even though they share keywords.
4. **Calibrate pattern_title style.** "5-8 words; describe the pattern, not one observation. Example: 'Microsoft DAX pricing pressure in healthcare' — describes what's recurring. Bad: 'Microsoft' — too vague; 'We lost MedCore to Microsoft last Tuesday' — that's the observation, not the pattern."
5. **Pass full rawInput (500 chars min)** per 07A §3 and pass `observer_id`, `linked_deal_ids` per candidate — structured, not plaintext.
6. **Consider a "new cluster needed?" boolean** separate from `matching_ids` so the prompt can explicitly say "the new observation is unique, no pattern yet" rather than back-deriving this from an empty array.

**Blast Radius Recap**

Output creates new `observation_clusters` rows that persist indefinitely. Each cluster is a first-class object on the Intelligence dashboard and downstream inputs to field queries, system intelligence, and routing. Bad cluster titles live forever; duplicate clusters fragment signal. Context audit rated MEDIUM; prompt-text improvements stack on context fixes.

---

## 4. Agent Config Change Suggestion

**Task Summary**

When an observation's classification includes `agent_tuning` or `cross_agent` signal types, this prompt suggests a minimal, append-only change to the target agent's config. The output is then written **directly to `agent_configs.instructions` and `output_preferences` without human review** (07-DATA-FLOWS Flow 3 issue #2; DECISIONS.md 2.25 #3). A notification is sent to the target member, but the change is live. Runs in `applyAgentChange()` inside `POST /api/observations`. This is the silent auto-tuning path DECISIONS.md flags as violating the soft-mode experiment spirit.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. "You are an AI agent configuration advisor." Functional. Nothing anchors the model in the gravity of the task (writing live configuration that will shape every future output of the target agent).
- **Task specificity.** ADEQUATE. Two rules — "Prefer appending to instructions over rewriting" and "Never remove existing rules — only add" — are specific and load-bearing. But the task itself ("Suggest a SPECIFIC, MINIMAL change") is vague: what defines "minimal"? A single sentence? A section? A single word tweak?
- **Reasoning structure.** ABSENT. No "first understand the observation, then inspect the current config, then decide if an edit is warranted, then formulate it." The `should_apply: true/false` field is the model's only explicit decision point.
- **Output structure.** ADEQUATE. `{ should_apply, instruction_addition, output_preference_change, summary }` matches consumer needs. However, `should_apply: false` combined with non-null `instruction_addition` is ambiguous — code behavior unclear.
- **Examples / few-shot.** ABSENT. No example of a good suggestion ("add: 'When the customer mentions HIPAA, always lead with the SOC 2 compliance doc'") vs. a bad one ("add: 'be better at objection handling'"). For a high-stakes prompt this is a significant miss.
- **Edge-case coverage.** WEAK. What if the observation contradicts an existing rule in the config (past the 500-char truncation)? What if multiple sequential observations have suggested conflicting additions? What if the observation is from an AE complaining about their OWN agent (self-tuning) vs. about a teammate's agent (cross-agent)? Different scopes, same prompt.
- **Anti-hallucination.** WEAK. No "if the observation doesn't warrant a change, return `should_apply: false`" anchoring. The prompt reads as if a change is the expected output.
- **Tone / voice control.** ABSENT. `instruction_addition` is appended to the agent's persona — which is in turn rendered in every future call prep. No tone-match instruction means the auto-added text can collide stylistically with the existing config.
- **Length / verbosity control.** ABSENT. `instruction_addition` has no length cap. Over time, the agent's `instructions` field can grow unboundedly.

**Output Schema Quality**

Four-field object. Matches consumer code loosely — code spreads `output_preference_change` into existing outputPreferences (if the model returns `{ verbosity: "terse" }` that's fine; if it returns `{ toolsEnabled: ["objection_handling"] }` it OVERWRITES the previous list because JS spread is shallow). No schema validation at the prompt boundary.

The biggest schema problem is what's missing: no `confidence` field, no `reason` for the change separate from the summary, no explicit scope ("org_wide" | "this_agent_only" | "vertical_wide"). The observation system's taxonomy (DECISIONS.md 1.1 dimensions) isn't available to this prompt.

Under v2 tool-use per DECISIONS.md 2.13 AND the proposed event-sourced proposal model (DECISIONS.md 2.25 #3: "any AI-driven config mutation is an event-sourced proposal, not a direct write"), this prompt's entire output shape changes — it produces a *proposal* that the target member or a manager approves. New fields: `proposal_id`, `proposed_change`, `target_member_id`, `rationale`, `supporting_evidence`, `requires_approval: true`.

**Known Failure Modes**

- **Silent auto-mutation of live config without human review.** Flagged in 04-PROMPTS #4 known issues AND 07-DATA-FLOWS Flow 3 issue #2 AND DECISIONS.md 2.25 #3. The prompt is doing what it's asked to do — but the shape of the output assumes the caller will apply it; in fact the caller DOES apply it automatically. This is a system-level correctness failure rooted in a product decision that needs to be reversed for v2.
- **500-char instruction truncation.** Per 07A §4. Model can suggest additions that duplicate or contradict content past the cut. Critical for a live-write path.
- **Unbounded instruction growth.** Every observation that triggers this prompt appends text. There's no instruction to summarize, consolidate, or prune. Over a year of operation, instructions could become incoherent.
- **"should_apply: false" is rarely returned.** The prompt implicitly biases toward a change. There's no framing like "most observations do NOT warrant a config change; the default is should_apply: false."
- **No guardrail on targeting.** The prompt receives `config` for the target member but doesn't know whether the observer is the target or a different member. A Healthcare AE complaining about a FinServ AE's agent behavior gets the same prompt as a FinServ AE self-tuning their own agent.

**Rewrite Priority**

**MUST REWRITE.** Two independent reasons. (1) The auto-apply behavior is product-broken per DECISIONS.md 2.25 #3 — v2 converts this to an event-sourced proposal flow; the prompt output schema fundamentally changes. (2) Even setting aside the auto-apply issue, the prompt is thin: no examples, no confidence/rationale fields, no scope handling, 500-char instruction truncation poisons suggestions, unbounded growth has no guard. This is the highest-risk prompt in the batch — it writes live configuration that shapes every future prompt for the target member.

**Specific Improvement Suggestions**

1. **Re-scope as a proposal.** Per DECISIONS.md 2.25 #3, output is a proposal with `{ proposed_change, rationale, supporting_evidence, requires_approval }`. The system stores it in an events table; a human approves or the target member has explicitly granted autonomy. Prompt text follows from this re-scope.
2. **Pass the full current `instructions` string**, not a 500-char slice (per 07A §4). Instruction-addition quality is unverifiable otherwise.
3. **Bias the default toward no-change.** "Most observations do not warrant a config change. Default `requires_approval: true` and `should_apply: false`. Only propose a change when the observation reveals a systematic gap that will recur."
4. **Add a confidence and rationale field.** "Why should this change be made? What evidence in this observation plus the current config supports it?"
5. **Add examples, explicitly.** Provide one good proposal (specific, evidence-based, scoped) and one bad proposal (vague, sweeping, un-evidenced). For a live-write prompt, this is not optional.
6. **Add a tone-match instruction.** "Match the existing style of `instructions` — if the persona is written in first person, continue in first person."
7. **Add a "conflicts with existing rule" check** now that the full instructions are passed. Instruction: "If the proposed addition contradicts something already in the config, flag the conflict in `rationale` and set `requires_approval: true`."

**Blast Radius Recap**

Writes `agent_configs.instructions` + `output_preferences` + creates a new `agent_config_versions` row + sends a notification. Every subsequent call prep (#11), draft email (#12), and NL config interpretation (#13) for the target member reads the mutated config. Per 07A §4 HIGH rating, this is the single prompt whose output can silently degrade every other prompt's output for the affected member.

---

## 5. Streaming Transcript Analysis

**Task Summary**

Given a pasted call transcript (up to 100K chars), produce a structured analysis with summary, sentiment arc, key moments, talk ratio, risk signals, coaching tips, and a deal score. Unique in the registry for streaming (`client.messages.stream(...)`) — the output is rendered live in the `/analyze` page as text chunks arrive. Optionally saved to a deal as a `call_analysis` activity. This is the only prompt that lives as an imported module (`apps/web/src/lib/analysis/prompts.ts` `SYSTEM_PROMPT`) rather than inline — a structural head start for the DECISIONS.md 2.13 "prompts as `.md` files" goal.

**Engineering Quality Assessment**

- **Role framing.** STRONG. "You are an elite sales coach and conversation analyst." Domain-specific, evocative, sets a clear bar.
- **Task specificity.** STRONG. Seven output fields each have explicit sub-rules (e.g., "sentimentArc: 8-12 data points...track how the BUYER's sentiment shifts"; "keyMoments: 5-10 moments. Types: ..."; "talkRatio: rep + prospect must equal 100"). Specifies the audience ("BUYER's sentiment") which most other prompts omit.
- **Reasoning structure.** ABSENT. Structured output is requested directly; no "first skim the call, then identify key moments, then..." scaffold. For a 100K-char transcript this is a real miss — model has to allocate attention across 7 outputs without guidance on ordering.
- **Output structure.** STRONG. Detailed JSON schema with field-level expectations (position 0-100, sentiment -1.0 to 1.0, severity low/medium/high, category enums). Every field has semantic meaning in the UI.
- **Examples / few-shot.** WEAK. Schema contains example values ("Short title", "What happened", "short excerpt") but they are placeholders, not exemplars. No good/bad pair for a coaching tip or a key moment.
- **Edge-case coverage.** PARTIAL. "rep + prospect must equal 100" handles the multi-speaker edge. Does NOT address: what if the transcript is a monologue? What if speakers aren't labeled? What if it's a non-English call? What if `prospect` is multiple people?
- **Anti-hallucination.** WEAK. "Each tip must be specific to THIS call, not generic sales advice" is the only anti-hallucination guardrail. There's no "quote the transcript to support risk signals" requirement, even though `keyMoments[].quote` exists — model provides quotes or summaries interchangeably.
- **Tone / voice control.** ADEQUATE. "Be honest and calibrated" for dealScore; "Be specific, not generic" for riskSignals. Not addressed for summary or coachingTips.
- **Length / verbosity control.** STRONG. Explicit counts (8-12 sentiment points, 5-10 key moments, 2-5 risk signals, 3-5 coaching tips) and max_tokens 4096.

**Output Schema Quality**

Seven fields with strong typing. `talkRatio.rep + prospect = 100` invariant noted but not enforced client-side. `dealScore.score` is 0-100 (different from MEDDPICC's 0-100 confidence; different from fitness's 0-100 score; different from lead_scores; no unified scoring convention in the system). Each `keyMoments[].type` enum is documented but not validated at parse time.

Schema matches the `/analyze` page renderer closely. When saved via `/api/analyze/link` the entire JSON lands in `activities.metadata` — no transformation, no downstream typed consumer.

Under v2 tool-use: straightforward conversion. Every field is already structured.

**Known Failure Modes**

- **Streaming parse states.** Per 04-PROMPTS #5, client must handle partial JSON states until accumulation completes. 429 errors are differentiated; other errors collapse to generic messages.
- **Hallucinated quotes.** With no instruction to ground `keyMoments[].quote` in the transcript, the model sometimes paraphrases what was said as a "verbatim excerpt." Users who rely on quotes for evidence get burned.
- **Sentiment arc feels manufactured for short calls.** "8-12 data points" is enforced even when the call is 10 minutes. Model generates positions 0, 12, 25, 37...100 with interpolated sentiment, giving the illusion of a sentiment arc where there isn't one.
- **Coaching tips generic despite the instruction.** "specific to THIS call, not generic sales advice" is stated but not backed by examples. Output quality depends entirely on model behavior on the day.
- **DealScore is not calibrated against outcomes.** 72 means what, specifically? "Above 75 = strong deal" but with no reference distribution. When this is saved to an activity, there's no downstream use (no calibration loop).
- **No deal context.** Per 07A §5 (MEDIUM). The standalone `/analyze` page accepts only transcript text — no dealId, no MEDDPICC, no prior transcripts. Model analyzes in a vacuum.

**Rewrite Priority**

**PRESERVE WITH MINOR EDITS.** The prompt is one of the stronger ones in the registry — strong role framing, tight output spec, length controls. Its principal improvements are (a) adding a chain-of-thought phase for long transcripts, (b) anti-hallucination grounding on quotes, and (c) the context-side addition of optional dealId (07A §5). Structurally sound; doesn't need re-scoping.

**Specific Improvement Suggestions**

1. **Add a "first identify, then structure" reasoning phase.** For transcripts >5K chars, instruct: "Before emitting JSON, silently scan for: turning points, objections, commitments, moments of buyer engagement shift. Then assemble the output." Chain-of-thought invitation without adding round trips.
2. **Ground quotes.** "For each key moment and risk signal, the `quote` field must be a verbatim excerpt from the transcript. If you cannot find a verbatim quote, use `quote: null` and describe the moment in `detail`."
3. **Relax sentiment arc density for short calls.** "8-12 data points for calls >20 min; scale down proportionally for shorter calls, minimum 4 points."
4. **Add optional deal context support** (context-side fix per 07A §5): when called with a `dealId`, inject deal stage + MEDDPICC + prior calls into the prompt to enable continuity.
5. **Calibrate dealScore rubric more concretely.** Move from "0-100, honest and calibrated" to a 4-tier rubric with specific criteria ("80+ requires: champion engaged, economic buyer identified, timeline committed; 60-79 requires...").
6. **Port to `.md` file per DECISIONS.md 2.13.** This prompt is already separated out; finish the job.

**Blast Radius Recap**

Output is rendered on `/analyze` and optionally saved as a `call_analysis` activity with the full JSON in metadata. Does NOT feed the transcript pipeline or call prep — isolated from the core deal workflow. A bad analysis is a bad analysis; it doesn't compound. Lowest blast radius of any prompt in the batch.

---

## 6. Field Query Analysis (Org-Wide)

**Task Summary**

When a manager asks a free-form question about patterns across their org, this prompt decides: (a) can the system answer from existing data with high confidence; (b) if not, what data is missing; (c) which OPEN deals, which AEs (by vertical + role), should be queried for the missing data. Output drives the field-query fan-out: either a direct answer is written to `field_queries.aggregated_answer`, or prompt #7 runs per-AE to generate personalized questions. First of three Claude calls that make up the Field Query flow (prompts #6 → #7 → #9/#10).

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. "You are the query engine for a sales intelligence platform." Functional. Doesn't invoke the strategic-read-of-the-field framing the task actually calls for.
- **Task specificity.** ADEQUATE. Three numbered decisions are spelled out. "IMPORTANT: When identifying deals to query, include ALL deals that could be affected by the pattern — not just one" is a targeted nudge against a known model weakness.
- **Reasoning structure.** WEAK. Three decisions but no "first assess what data you have, then identify gaps, then map gaps to reps" chain. The model emits a JSON answer without a scratchpad.
- **Output structure.** STRONG on shape, WEAK on semantics. `confidence: "high" | "medium" | "low"` is a loose category ("Only say 'high' confidence if you have concrete numbers and clear patterns" is the only discipline).
- **Examples / few-shot.** ABSENT. For "use anonymized counts ('X reps') not names," one example would eliminate ambiguity.
- **Edge-case coverage.** WEAK. What if the question is un-answerable even with perfect field input (e.g., "what will Q3 look like?")? What if the question is ambiguous ("how is healthcare doing?")? What if no deals are affected? Prompt doesn't enumerate.
- **Anti-hallucination.** WEAK. The prompt constrains deal IDs to the provided list ("include as many relevant deal IDs as possible from the open deals list") but has no fallback for "no deals are relevant." `needs_input_from.roles` has no constrained enum — model can return "Product Marketing" when only sales roles are in scope.
- **Tone / voice control.** PARTIAL. "Use anonymized counts ('X reps') not names" is the primary voice rule; otherwise silent.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 1024` appropriate for the output shape.

**Output Schema Quality**

`{ can_answer_now, immediate_answer, confidence, data_gaps[], needs_input_from: { roles[], verticals[], deal_ids[], reason } }`. Schema has a latent conflict: when `can_answer_now: true`, `data_gaps` and `needs_input_from` still have values from the model; code ignores them. When `can_answer_now: false`, `immediate_answer` still has a value; code treats it as null. Every path parses valid JSON but the semantics diverge from what the model emits.

Under v2 tool-use, conditional schemas (two tool variants for answered-directly vs. needs-fan-out) or a discriminated union (`mode: "answer" | "fanout"` with distinct sub-shapes) would fix this.

**Known Failure Modes**

- **"Anonymized counts" instruction partially ignored.** Prompt says "Use anonymized counts ('X reps') not names" but the same prompt tells the model to return explicit deal IDs. Claude routinely returns both. Downstream fan-out works either way; operator-facing output (`immediate_answer`) can leak rep names.
- **Over-broad fan-out.** "include ALL deals that could be affected" biases toward fan-out — a 30-AE org query generates 30 personalized-question calls (prompt #7, per-AE loop) which pushes against the `maxDuration=30` on the route (04-PROMPTS #7 known issue).
- **Confidence inflation.** "Only say 'high' confidence" nudge isn't enough. Model returns "high" for answers built on 2 observations if those observations are worded confidently.
- **Data gap descriptions are vague.** Without an example or structure, `data_gaps[0]` reads as "We don't know how many AEs are seeing this pattern" — which is tautological (asking is how you'd know).
- **Coordinator patterns not consulted.** Per 07A §6 HIGH. The prompt's first job is "can existing data answer this?" — and `coordinator_patterns` (purpose-built for cross-deal patterns) is not in the context. Many answerable questions are not answered because the prompt doesn't see the already-synthesized patterns.
- **Closed deals contribute shallow context.** `closeFactors` jsonb stringified without schema hint; model parses variably.

**Rewrite Priority**

**SHOULD REWRITE.** Both text and context problems are material. The LOCKED 2.17 architecture makes coordinator-pattern consultation table-stakes for this prompt; the prompt text also needs sharper confidence calibration, schema discrimination, and chain-of-thought structure. Not MUST REWRITE because the prompt's core job is well-defined and achievable — the rewrite is a refinement, not a re-scoping.

**Specific Improvement Suggestions**

1. **Add coordinator patterns + prior field queries + system intelligence to context** (07A §6). The prompt's first question ("can we answer this?") is unanswerable without these.
2. **Discriminate the schema.** Two tool variants: `AnsweredDirectly { immediate_answer, confidence, supporting_data[] }` and `RequiresFanout { data_gaps[], needs_input_from, reason }`. Eliminates the semantic conflict when fields contradict each other.
3. **Add a chain-of-thought scaffold.** "Before deciding, work through: (1) what concrete data do the active clusters + recent observations + coordinator patterns already show? (2) what specific gap prevents a confident answer? (3) which reps' input would close that gap?"
4. **Calibrate confidence explicitly.** "high = a specific number or pattern with ≥3 supporting data points and no contradicting evidence. medium = directional read with 1-2 data points or some noise. low = speculation."
5. **Add one worked example** of `can_answer_now: true` and one of `can_answer_now: false`, each with a short rationale showing the confidence calibration in action.
6. **Enumerate `roles` to a closed set.** AE | MANAGER | SA | BDR | CSM plus support function names. Prevents drift into made-up roles.

**Blast Radius Recap**

Per 04-PROMPTS #6 downstream effects: when `can_answer_now && confidence === "high"`, writes `field_queries` with `immediate_answer` and fan-out is skipped. Otherwise, `needs_input_from.deal_ids` seeds prompt #7 (per-AE question). A confidence-inflated "high" call produces a confidently wrong aggregated answer surfaced to the manager; a confidence-deflated "low" call triggers unnecessary fan-out.

---

## 7. Personalized AE Question Generator

**Task Summary**

Given a manager's original question, the data gap from prompt #6, and one deal assigned to a target AE, generate a one-sentence conversational check-in question plus 2-4 chip responses for the AE. Runs in a per-AE loop (one Claude call per AE, up to ~8 AEs per field query). Output becomes a `field_queries.field_query_questions` row rendered in the AE's Quick Check UI. Output quality is the primary lever for the Field Query flow's research-interview bar (DECISIONS.md 1.2).

**Engineering Quality Assessment**

- **Role framing.** ABSENT. Prompt opens with "Generate a quick check question for a sales rep." Task-first, no persona.
- **Task specificity.** STRONG. Five numbered rules specify tone ("conversational"), scope ("specific to THEIR deal"), personalization ("Reference the deal or account by name"), chip ordering ("most positive first, 'Not sure' last"), and forbidden behavior ("NEVER mention who asked or why").
- **Reasoning structure.** ABSENT. Generation is one-shot.
- **Output structure.** STRONG. `{ question_text: string, chips: string[] }` is the minimal correct shape.
- **Examples / few-shot.** ABSENT. A single worked example showing a good question + chip set would dramatically tighten output consistency. None present.
- **Edge-case coverage.** WEAK. What if the deal's stage is `closed_lost` (shouldn't get a question)? What if the data gap is about the rep's process, not the deal? What if the rep has no active deals? Prompt doesn't enumerate.
- **Anti-hallucination.** WEAK. Nothing instructs the model to confine to data it was given. "Reference the deal or account by name" can produce invented stakeholder names if the prompt didn't include contacts (and it doesn't).
- **Tone / voice control.** STRONG. "Feel like a helpful system check-in, NOT like a manager interrogation" is specific and operative. Most tone-controlled prompt in the batch.
- **Length / verbosity control.** ADEQUATE. "One sentence" + `max_tokens: 256`.

**Output Schema Quality**

Two-field object. Matches consumer: question text renders, chips become the response options. One schema miss — no field for "no question needed" (e.g., when the rep has no relevant deal). Code uses `fallbackQuestion(rawQuestion, deal.name)` on Claude errors; a structured "opt out" would let the model declare it appropriately.

Under v2 tool-use with `getApplicable*()` gating (DECISIONS.md 2.21), many of today's fan-outs would be filtered out before this prompt runs — reducing the need for an opt-out but making the remaining generations more relevant.

**Known Failure Modes**

- **Genericity.** Per 07A §7 HIGH. The prompt has only deal header data — no MEDDPICC, no last-transcript summary, no active experiments. Questions read as generic because the input IS generic.
- **Looped per-AE burden on maxDuration.** Per 04-PROMPTS #7 known issue: up to 8 Claude calls in a route with 30s timeout. A 25% stale-latency rate tips the whole flow over.
- **Highest-value-deal hardcoding.** Per 07A §7, only the AE's top-value open deal feeds the prompt; the manager question may be about a different deal.
- **Chip labels inconsistent.** Without an example, chip style drifts across questions ("Yes / No / Not sure" vs. "Making progress / Needs attention / Unsure"). Downstream `CHIP_TO_STRUCTURED` lookup depends on specific strings matching (prompt #1 failure mode #3).
- **No graceful "not applicable" output.** If the AE's highest-value deal is irrelevant to the question, the prompt still emits a question anyway. The AE sees a check-in about the wrong deal.

**Rewrite Priority**

**SHOULD REWRITE.** Both text and context problems matter. Text problems: no role framing, no examples, no anti-hallucination rail, no opt-out path. Context problems: no MEDDPICC, no active experiments, one-deal hardcoding (07A §7). Rewrite consolidates both — the prompt is small enough that the upgrade is surgical, and the downstream impact (one prompt per AE per query, HIGH blast radius per 07A) justifies the investment.

**Specific Improvement Suggestions**

1. **Pass the AE's top 3 deals, not top 1** (context fix per 07A §7), and let the prompt select the most relevant to the question. Add a selection step: "First, pick which of the AE's deals this question best applies to, or say no deal applies."
2. **Add MEDDPICC snapshot + last-transcript summary** for the selected deal. Turns "How's MedVista going?" into "Your Economic Buyer confidence on MedVista dropped from 60% to 20% last week — is the CFO still engaged?"
3. **Add two worked examples.** One generic ("How's MedVista going?") as the bad case, one specific ("On MedVista, your Economic Buyer confidence is 20% and the CFO hasn't been on a call in 3 weeks — is that still tracking?") as the good case. Show the difference explicitly.
4. **Add an opt-out field.** `{ question_text, chips, applies: boolean, reason_if_not: string }`. Lets the model cleanly say "no question applies" rather than invent one.
5. **Add a role-framing opener.** "You are a helpful peer asking a sales rep about their deal in a one-sentence check-in."
6. **Constrain chips to a small set of archetypes.** E.g., "4 chips total. Positive-first: the first chip affirms, the second gives partial affirmation, the third flags an issue, the fourth is 'Not sure' (always last)." Makes chip labels predictable for downstream `CHIP_TO_STRUCTURED`.

**Blast Radius Recap**

Output is the primary AE-facing surface in Field Query flow. Chip response flows into prompt #9 (give-back) and prompt #10 (aggregated synthesis). A generic question → vague response → vague synthesis. Per 07A §7 HIGH, upgrades here compound through the whole flow.

---

## 8. Deal-Scoped Manager Question Answer

**Task Summary**

When a manager asks a question about a specific deal, this prompt answers using a pre-assembled `dealContext` JSON object (deal, company, AE, MEDDPICC, contacts, recent activities, observations, team feedback). Returns plain text (not JSON) with a trailing `NEEDS_AE_INPUT: true|false` sentinel. When `true`, a fixed-chip follow-up question fires to the deal's assigned AE. Runs in the deal-scoped path of `/api/field-queries/route.ts`. Notably: **this is the only prompt in the registry with `system: ""`** — the entire instruction is in the user message. (The prompt #25 coordinator synthesis also uses `system: ""` but that's in session 4.5b.)

**Engineering Quality Assessment**

- **Role framing.** WEAK. The user prompt opens with "You are a sales intelligence system answering a manager's question about a specific deal" — this IS a role framing, but placing it in the user message (not the system prompt) reduces role-discipline per model behavior norms.
- **Task specificity.** ADEQUATE. Asks for "Specific MEDDPICC scores and what they mean" / "Contact engagement gaps (who hasn't been contacted recently)" / "Relevant team intelligence" / "Whether you have enough data". Task dimensions are enumerated but their ordering or weighting isn't.
- **Reasoning structure.** ABSENT. One-shot generation from a dumped JSON.
- **Output structure.** WEAK. Plain text + trailing sentinel. `NEEDS_AE_INPUT: true|false` on its own line is parsed via exact substring match (04-PROMPTS #8 known issue #2) — case-sensitive. Model drift on the sentinel silently defaults `needsAeInput` to false.
- **Examples / few-shot.** ABSENT.
- **Edge-case coverage.** WEAK. What if the deal has no contacts? No MEDDPICC? No activities? Prompt says "Include confidence levels and specific names/dates when available" — "when available" acknowledges missing data but doesn't specify how to handle it (skip silently? flag?).
- **Anti-hallucination.** WEAK. "Answer concisely using ONLY the deal data above" is stated, but no further reinforcement. No instruction to refuse to speculate when data is missing.
- **Tone / voice control.** WEAK. No tone specified beyond "Format as plain text, 3-5 sentences." Output reads as mechanical summary; doesn't invoke the "strategic read" framing the task calls for.
- **Length / verbosity control.** ADEQUATE. "3-5 sentences" + max_tokens 600.

**Output Schema Quality**

Plain text with a trailing sentinel. The worst output shape in the batch for engineering robustness. Sentinel parsing is fragile — `NEEDS_AE_INPUT: true` must match exactly; `needs_ae_input: true` or `NEEDS AE INPUT: true` are silent defaults to false. Moreover, the 5 keys in `field_queries.aggregated_answer` (`summary`, `key_findings`, `response_count`, etc.) can't be extracted from plain text — they're hand-set in code, so the prompt only produces the `summary` field.

Under v2 tool-use per DECISIONS.md 2.13, this prompt trivially becomes a typed tool call with `{ answer: string, needs_ae_input: boolean, confidence: "high"|"medium"|"low", gaps: string[] }`. Eliminates the sentinel entirely.

**Known Failure Modes**

- **Empty system prompt reduces role discipline.** Flagged in 04-PROMPTS #8 known issue #1. System prompts anchor persona for the conversation; user messages are treated as input to respond to. Putting the persona in the user message blurs the boundary.
- **Sentinel fragility.** Per known issue #2: case-sensitive, position-sensitive exact substring match. A reasonable failure mode tested by real operation.
- **Hardcoded downstream chips.** Per known issue #3: chip options for the AE follow-up are hardcoded in code (`["Making progress", "Needs attention", "Situation changed", "On track"]`), not generated. Tight coupling; can't adapt per deal.
- **Thin context.** Per 07A §8 HIGH. Missing: transcripts, fitness scores, agent memory, coordinator patterns, system intelligence, manager directives, stage history, close analyses for similar deals. "Strategic read" isn't achievable from the pre-assembled context shape.
- **No confidence field.** Model emits plaintext "I'm fairly confident..." wording vs. "I'm uncertain..." unpredictably. No structured confidence extraction is possible.

**Rewrite Priority**

**SHOULD REWRITE.** Two urgent specifics: (a) move role framing into `system` so the prompt behaves consistently with the other 23 non-empty-system prompts (and the coordinator #25 in 4.5b); (b) replace the sentinel trickery with tool-use per 2.13. Context gaps (07A §8) compound both. Not MUST REWRITE because the task itself is well-scoped — it's a text-and-schema upgrade plus a context expansion.

**Specific Improvement Suggestions**

1. **Move role framing to `system`.** Add a system prompt anchoring the model as a strategic analyst of a specific deal. Keep the task structure in the user message.
2. **Replace plaintext-plus-sentinel with typed tool-use.** Schema: `{ answer: string (3-5 sentences), needs_ae_input: boolean, confidence: "high" | "medium" | "low", gaps_requiring_ae: string[] }`.
3. **Add context per 07A §8:** transcripts (or at least the most recent call summary with quotes), fitness scores, agent memory, coordinator patterns for the deal, stage history, manager directives.
4. **Add a worked example** of a high-confidence answer and a low-confidence-with-needs-AE answer, so the model calibrates when to set `needs_ae_input: true`.
5. **Constrain speculation.** "If the provided data does not support a confident answer, say so explicitly and identify what specifically the AE would need to confirm."
6. **Generate the AE follow-up chips** dynamically instead of hardcoding them. With MEDDPICC in context, "Economic Buyer still engaged? / Lost momentum / Still tracking" becomes a possible deal-specific chip set.

**Blast Radius Recap**

Output writes `field_queries.aggregated_answer.summary` (overwriting the summary when the deal-scoped path is used vs. the org-wide path). If `needsAeInput`, a `field_query_questions` row fires to the deal's assigned AE. Per 07A §8 HIGH, context upgrade here unlocks real deal-inspection behavior.

---

## 9. Give-Back Insight

**Task Summary**

After a rep answers a Quick Check question (prompt #7 output), this prompt generates a 1-2 sentence insight rendered inline as a reward for responding. Conceived as the "smart colleague's tip" — not a corporate report, not a generic "thanks." Runs in `POST /api/field-queries/respond`. Writes to `field_query_questions.give_back` jsonb; rendered in Quick Questions UI. Supports DECISIONS.md 1.2 research-interview pattern by making the capture surface feel rewarding rather than extractive.

**Engineering Quality Assessment**

- **Role framing.** ABSENT. Prompt opens with "A sales rep just answered a quick check. Generate a brief, useful insight." No persona.
- **Task specificity.** STRONG. Six explicit rules: 1-2 sentences max, reference specific patterns/stats, smart-colleague tone, cite numbers if you have them, never reveal who asked or why, never be generic. Most specific per-word in the registry.
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ insight: string, source: "Based on..." }` is the minimum shape. `source` is an odd field — always prefixed "Based on..." per the prompt, which is a voice hint, not a separate semantic field.
- **Examples / few-shot.** ABSENT. The prompt forbids generic outputs ("NEVER be generic like 'Great input!'") but doesn't provide a specific example to anchor the model.
- **Edge-case coverage.** WEAK. What if the rep's response is hostile ("I have no idea, stop asking me")? What if the response contradicts CRM data? What if there's nothing useful to say back? The fallback code has per-vertical hardcoded insights (`fallbackGiveBack`) — the prompt doesn't consider the null case.
- **Anti-hallucination.** WEAK. "If you can cite numbers, do" invites fabrication when numbers aren't passed. Current prompt has zero stats in context (only deal header + response text) — so "2 of 3 other reps say the same" has no grounding.
- **Tone / voice control.** STRONG. "Feel like a smart colleague's tip, NOT a corporate report" is operative and distinctive. One of the few prompts where voice is the centerpiece.
- **Length / verbosity control.** STRONG. "1-2 sentences max" + max_tokens 256.

**Output Schema Quality**

Two fields, one of which is a naming convention ("source: 'Based on...'") rather than a distinct slot. Under v2 tool-use the `source` field should either become `cited_data: { type, value }[]` (structured) or be dropped and folded into `insight`.

**Known Failure Modes**

- **Hallucinated stats.** Per 07A §9 HIGH. Prompt demands "cite numbers" and receives no numbers to cite. Model fills the gap confidently. Observed behavior: generates plausible-sounding "68% of healthcare deals at this stage..." values that have no grounding.
- **Generic when no handle.** For sparse responses ("Not sure"), the insight has nothing to respond to. The hardcoded `fallbackGiveBack` is per-vertical generic advice — but the prompt itself will produce similarly generic output silently.
- **Source field format variance.** "Based on..." vs. "Drawing from..." vs. no prefix at all. Model drift. Code stores whatever the model emits.
- **Never-reveal-who-asked leaks.** Prompt says "NEVER reveal who asked or why" — generally holds but model occasionally emits "Your manager is tracking..." or similar.
- **No peer responses visible.** Per 07A §9 HIGH. Other AEs' responses to the same field query exist in the database; this prompt doesn't see them. The most powerful give-back ("3 of your peers flagged the same pattern") is un-achievable without context wiring.

**Rewrite Priority**

**SHOULD REWRITE.** Anchoring the prompt against hallucination (the "cite numbers" instruction is malignant without actual numbers in context) is a text-level fix that's urgent. Beyond that, the prompt is thin on context per 07A §9 — adding peer responses, coordinator patterns, and system intelligence converts a "could feel smart" prompt into one that consistently is.

**Specific Improvement Suggestions**

1. **Add context per 07A §9:** peer responses to the same query, related coordinator patterns, system intelligence for the vertical, MEDDPICC for the deal, relevant active experiments.
2. **Replace "cite numbers" with conditional instruction.** "If peer responses or system intelligence provide concrete numbers, cite them. If not, offer a strategic observation grounded in the rep's response and deal context. Never invent statistics."
3. **Add worked examples.** One good ("Three other healthcare reps flagged Microsoft DAX as a hard gate in the last 2 weeks — your champion's framing here matches the pattern") and one bad ("Great input! Healthcare deals often face regulatory challenges") — show the difference.
4. **Drop the `source` field** OR restructure as `cited_data: { type: "peer_response" | "coordinator_pattern" | "system_intel", ref_id: string, summary: string }[]`. Either cleaner.
5. **Add an opt-out.** `{ insight, applies: boolean }` — when the rep's response is hostile or there's truly nothing useful to say, emit `applies: false` rather than a forced tip.
6. **Role-frame as a peer, not a system.** "You are a knowledgeable peer sending a private tip after a colleague answered a quick check."

**Blast Radius Recap**

Writes to `field_query_questions.give_back` jsonb; UI-render only. Doesn't feed other prompts. Self-contained surface, per 07A §9.

---

## 10. Aggregated Answer Synthesis

**Task Summary**

When enough AEs have responded to a field query, synthesize their responses into a brief aggregated answer for the manager. Rolls up per-AE responses + deal values + counts into a 2-3 sentence summary using anonymized counts ("2 of 3 reps say..."). Runs in `POST /api/field-queries/respond` when response threshold is crossed. Writes plain text to `field_queries.aggregated_answer.summary`. Flips query status to `answered`. This is the terminal prompt in the Field Query flow (#6 → #7 → rep responses → #9 per response → #10 rollup).

**Engineering Quality Assessment**

- **Role framing.** ABSENT. System prompt is a single sentence: "Synthesize field responses into a brief aggregated answer for a sales leader."
- **Task specificity.** WEAK. "Use anonymized counts ('X reps'), not names. Be concise — 2-3 sentences max. Include deal implications when possible." Functional for length and anonymization; silent on everything else (confidence? agreement vs. disagreement? what counts as a meaningful deal implication?).
- **Reasoning structure.** ABSENT. One-shot text generation from JSON input.
- **Output structure.** WEAK. Plain text. No structure. `field_queries.aggregated_answer.{summary, key_findings, response_count, ...}` — only `summary` is populated by this prompt; the other fields are set in code. The prompt's output is entirely unstructured.
- **Examples / few-shot.** ABSENT.
- **Edge-case coverage.** WEAK. What if all responses say the same thing? What if they disagree? What if 1 of 8 responded? What if responses are ambiguous ("Not sure" chosen by all)? Prompt doesn't enumerate.
- **Anti-hallucination.** ABSENT. No "ground in the actual responses" instruction. The prompt receives response text verbatim but nothing anchors the model against inventing patterns across them.
- **Tone / voice control.** PARTIAL. "Sales leader" audience is named. "Concise" is stated. No "strategic" or "operational" framing.
- **Length / verbosity control.** STRONG. "2-3 sentences max" + max_tokens 300.

**Output Schema Quality**

Plain text. Loses all structure the input had (per-deal, per-response mapping). Worst output shape in the batch alongside #8. The `aggregated_answer` jsonb column can hold structured data but this prompt emits a string that's slotted into `.summary`; the other fields (`key_findings`, `response_count`) are computed in code — meaning the model's semantic work is thrown away if it's embedded in prose.

Under v2 tool-use: `{ summary, key_findings: string[], agreement_level: "consensus" | "majority" | "split", dissent_notes: string[], confidence: "high" | "medium" | "low" }`. Fixes everything.

**Known Failure Modes**

- **Generic rollups.** Per 07A §10 HIGH. "2 of 3 reps say X" without context: X is what they responded, but the synthesis should be "the portfolio signal," not a tally. Current prompt produces tallies.
- **No confidence signal for the manager.** Plain-text output can hide whether the rollup is actionable or noise.
- **Disagreement is flattened.** When responses diverge ("Making progress" / "Situation changed" / "Not sure"), the summary can read "reps report mixed views" without surfacing which view came from which deal value/stage — losing the critical specificity.
- **Thin context.** Per 07A §10: no AE role/vertical, no deal stage, no prior aggregated answer on similar questions, no original prompt #6 data_gaps, no coordinator patterns. Synthesis is unanchored.
- **Response-text quality bottleneck.** Prompt inherits whatever text reps typed into a chip response or free-text follow-up. If chip labels are vague (known issue on #7), the aggregated answer inherits the vagueness.

**Rewrite Priority**

**SHOULD REWRITE.** Both text and schema need to change. Prompt is too thin to produce the strategic read the task calls for, output shape throws away structure, context is sparse per 07A §10. Consolidation with tool-use schema + context expansion converts this from a counter into a synthesis. Not MUST REWRITE because the flow itself works mechanically; it's the quality bar that fails.

**Specific Improvement Suggestions**

1. **Upgrade to structured tool-use.** Schema: `{ summary, key_findings, agreement_level, dissent_notes, confidence, recommended_next_step }`. Populate from model instead of hand-setting in code.
2. **Add role-framing opener** — "You are a strategic analyst synthesizing field input for a sales leader."
3. **Add context per 07A §10:** AE role/vertical/stage per response, original prompt #6 data_gaps, coordinator patterns matching the signal type, prior aggregated answers on similar questions (stylistic + substantive reference).
4. **Add a worked example** of a consensus synthesis and a split synthesis — show how to frame each differently.
5. **Enumerate the agreement typology.** "Distinguish consensus (all responses point to the same pattern), majority-with-dissent (most agree but note the exceptions), and split (no dominant pattern — recommend the manager look at specific deals)."
6. **Weight responses by deal value and stage.** "A response from a $2M Negotiation deal weighs more than one from a $100K Discovery deal. Let the synthesis reflect this without naming the deal."

**Blast Radius Recap**

Terminal prompt in the Field Query flow; output is the manager's answer. Does not feed other prompts directly, but feeds stylistic and substantive conventions the next aggregated answer will unknowingly reference (if context is wired per suggestion #3).

---

## 11. Call Prep Brief Generator (The Big One)

**Task Summary**

Given a deal context assembled from 14+ parallel queries plus agent memory + fitness data + agent config + system intelligence + win/loss patterns + stakeholder alerts + manager directives + playbook experiments + proven plays, generate a 2-minute call brief the rep can read walking in. Output is a 10+ section JSON (headline, proven_plays, talking_points, questions_to_ask, deal_fitness_insights, risks_and_landmines, next_steps, deal_snapshot, stakeholders_in_play, competitive_context, system_intelligence, manager_directives). Fired three ways: manually from the deal detail page; automatically after the transcript pipeline when `briefPending=true` (via browser polling, not the pipeline itself — 05 §4.2); via MCP tool `generate_call_prep`. This is the flagship surface in Nexus — the promise of "your AEs walk in prepared by the agent, not the CRM" lives here. Rated CRITICAL in 07A §11.

**Engineering Quality Assessment**

- **Role framing.** STRONG. Opens with "You are an AI sales agent preparing a call brief for ${rep.name}. You have access to comprehensive CRM data, field intelligence from the team, and the rep's personal selling style." Rep-name binding personalizes the framing. Good anchor.
- **Task specificity.** STRONG. The brief's purpose ("read in 2 minutes and walk into the call prepared") is crisp. Many sections have detailed sub-instructions. The proven-plays section is the most specific block in the registry ("MANDATORY INSTRUCTIONS...These are not suggestions — they are requirements").
- **Reasoning structure.** ABSENT. 12 conditional sections of context + a 10+ section output — no chain-of-thought between. Model allocates attention across sections without guidance.
- **Output structure.** STRONG on shape, weak on discipline. Detailed JSON schema with nested objects. But the schema has `null otherwise` annotations mixed with required arrays, optional sub-sections (`matched_play: null` vs. omitted), and emoji-prefixed string fields that Claude drops unpredictably (04-PROMPTS #11 known issue #4).
- **Examples / few-shot.** ABSENT. With a 200-line conditional system prompt, you'd expect a worked example brief. None present.
- **Edge-case coverage.** PARTIAL. Many sections are conditional ("if prepContext provided"; "if fitness data provided"; "if proven plays exist"). Implicit edge coverage by section omission. Doesn't address: what if the deal has no contacts? No prior calls? What if EB is in the meeting AND the fitness gap is "introduce EB" (one of the few explicit edge cases — "don't surface it as a gap — instead note their presence is a positive signal")?
- **Anti-hallucination.** ADEQUATE. Per-section grounding ("citing specific evidence from the data"). Proven plays require "SPECIFIC, ACTIONABLE guidance for THIS deal" and "Add at least one entry that applies a proven play to THIS prospect's specific situation." But `stakeholders_in_play` invites invention if the contact list is thin; `next_steps` has no grounding.
- **Tone / voice control.** STRONG. Agent config section binds tone to the rep's persona + communication style. When agent config is missing, falls back to "Professional and data-driven."
- **Length / verbosity control.** WEAK. No length cap on individual sections. No overall word/sentence budget. max_tokens 3000 is a hard ceiling but gives no shape.

**Output Schema Quality**

Large (~35 keys across nested objects). Almost every field has a downstream UI consumer. Schema problems:

- `proven_plays` is required to have "at least one entry if proven plays exist" — conditional-required with no enforcement in code. Model sometimes skips; UI just renders empty.
- `deal_fitness_insights.gaps[].matched_play` nests optionally (`null` when no match); parse errors on this nested shape cascade (04-PROMPTS #11 known issue #3).
- `active_experiments` appears in two places: at the top level AND inside `deal_fitness_insights`. Model picks one or both; code reads both.
- Emoji prefixes (📊, 🔴, 📋) are prescribed in the prompt for some fields and stripped by model unpredictably. Downstream UI renders whatever comes in.
- `deal_snapshot.health` is `"on_track | at_risk | needs_attention"` but computed from `health_reason` prose — no schema validation, no connection to `account_health.health_score` or `dealAgentStates` risk signals.
- `stakeholders_in_play[].is_primary` — hardcoded `false` in the consuming code (07-DATA-FLOWS Flow 2 issue #6); the prompt isn't asked to populate it.

Under v2 tool-use with DECISIONS.md 2.13 + `.md` file prompts + the DealIntelligence service: this prompt becomes a thin orchestrator over typed sub-tool calls. One tool per major section (proven_plays, talking_points, fitness_insights, etc.) enables per-section reasoning, per-section length control, and the ability to re-run individual sections.

**Known Failure Modes**

- **Coordinator intel never arrives.** DECISIONS.md 2.17 LOCKED mandates "call prep MUST query the coordinator." The prompt has an `agentMemory` section expecting coordinated intel via `formatMemoryForPrompt` — but `dealAgentStates.coordinatedIntel` is never written by the coordinator (07-DATA-FLOWS Flow 6 BROKEN). The promise of Act 2 demo narrative is blocked here, on context not prompt-text.
- **Proven plays skipped despite MANDATORY framing.** Per 04-PROMPTS #11 known issue #2. Aggressive framing ("These are not suggestions — they are requirements") still permits model omission. No deterministic post-check.
- **Emoji drift.** Per known issue #4: prompt uses emojis in both input context and expected output; model drops them inconsistently. UI doesn't degrade but visual brand suffers.
- **Deep nesting parse errors cascade.** Per known issue #3: `deal_fitness_insights.gaps[].matched_play` is 3-levels deep. A trailing comma or missing brace in Claude's output trashes the whole section; the 3-strategy JSON extraction in prompt #15 is not used here (simpler single-strategy parse).
- **Whitespace-sensitive section assembly.** Per known issue #1: ~200 conditional lines concatenated by string template. A minor refactor that changes whitespace order changes the prompt Claude sees.
- **N+1 stakeholder engagement loop** in context assembly; approximate ILIKE substring counting (07-DATA-FLOWS Flow 2 issue #4).
- **No MEDDPICC trajectory; no prior briefs; no full transcripts.** 07A §11 CRITICAL gaps, context-side.
- **Fitness context ignores rich jsonb.** Overall scores + not-yet events + commitments are passed; the full `stakeholder_engagement` / `buyer_momentum` / `conversation_signals` jsonb are not. The richest analyzed data in the system is nearest-to-this-prompt and mostly ignored.

**Rewrite Priority**

**MUST REWRITE.** The prompt is CRITICAL-rated in 07A §11 for context and — separately — has structural prompt-text problems the context fix alone doesn't solve. Both the prompt and the assembly flow need rework for v2. Specific MUST-REWRITE drivers: (a) fix the coordinator wiring to satisfy DECISIONS.md 2.17 LOCKED; (b) break the monolithic 200-line conditional system prompt into composable sub-prompts (tool-use per 2.13); (c) add MEDDPICC trajectory + prior briefs + full fitness jsonb to context per 07A §11; (d) eliminate the N+1 engagement loop by deriving from structured fitness data. This is the centerpiece prompt of the v2 rebuild and must be rebuilt, not patched.

**Specific Improvement Suggestions**

1. **Break into composable sub-prompts.** Per DECISIONS.md 2.13: one section, one tool call, one `.md` file. Assembly orchestrator decides which sub-tools to run based on applicability gates (DECISIONS.md 2.21). Fitness-insights runs only if fitness data is present; proven-plays runs only if applicable plays exist; etc. Eliminates the whitespace-sensitive 200-line concatenation.
2. **Wire coordinator per DECISIONS.md 2.17.** Query `coordinator_patterns` directly (not via the broken `dealAgentStates.coordinatedIntel` path). Add a top-level "cross_deal_intelligence" section.
3. **Add MEDDPICC trajectory + prior briefs + full fitness jsonb** per 07A §11.
4. **Replace the "MANDATORY proven plays" framing with deterministic post-check.** If the model's output doesn't include a proven play when the input said it should, re-run just that section. Stops relying on aggressive all-caps framing.
5. **Add a chain-of-thought scaffold per section.** "For talking_points, first identify: what's the most important thing for this meeting type with these attendees? Then write the topic + why + approach."
6. **Add per-section length budgets.** Headline: 1 sentence, 15 words max. Talking points: 2-4 items. Questions: 3-5. Next steps: 2-4. Rather than trust the overall 3000-token cap to enforce brevity.
7. **Add a worked-example brief** for a typical healthcare Discovery call and a typical Negotiation call. Show the voice + section weighting.
8. **Drop the `null otherwise` string annotations** for `competitive_context`. Use proper schema optional fields in tool-use.
9. **Source agent config via DealIntelligence service** per 2.13/2.16 so the fallback ("Professional and data-driven") is one known-source, not inline in the prompt.

**Blast Radius Recap**

No prompts consume this output directly — it's rendered inline + saved to `activities` with `type='call_prep'`. But it IS the rep-facing surface that most directly embodies the product's value promise. Every upstream prompt (#1 observations seeding coordinator, #19-#21 pipeline signals, #15 fitness events, #20 MEDDPICC scores) feeds into #11 context. Quality here is the system's external proof.

---

## 12. Email Draft Generator

**Task Summary**

Given a deal, a contact, a draft type (follow_up | outreach), optional rep additional context, and the rep's agent config voice, generate an email draft in the rep's voice. Output includes subject, body, recipient, and advisory notes. Runs in `POST /api/agent/draft-email` (on-demand from Universal Agent Bar's "Draft email" command). Output saved as `email_draft` activity. **Note the duplication with prompt #24** (pipeline's draft-follow-up step) — two email-drafting paths with different system prompts and different output shapes; DECISIONS.md 2.13 LOCKED calls for "one email-drafting service."

**Engineering Quality Assessment**

- **Role framing.** STRONG. "You are an AI sales agent drafting an email for ${rep.name}. Write in the rep's voice, following their communication style exactly." Rep-name binding + voice-matching is the most deliberate persona framing in the batch.
- **Task specificity.** STRONG. Six explicit rules: first-person as the rep, follow guardrails, 3-8 sentence body cap, include CTA, reference recent activity specifics, no "hope this email finds you well," end with first name only. Highly specific for a v1 prompt.
- **Reasoning structure.** ABSENT. One-shot.
- **Output structure.** ADEQUATE. `{ subject, body, to, notes_for_rep }`. Matches consumer. `notes_for_rep` is an unusual meta-field — prompt explicitly separates "what I wrote" from "why I wrote it this way."
- **Examples / few-shot.** ABSENT. For voice-matching, one example of a generic-sounding email vs. a rep-voice email would anchor the model.
- **Edge-case coverage.** PARTIAL. `type === "follow_up"` with no `latestAnalysis` — prompt omits the follow-up-context section; still generates. Reasonable. Doesn't address: what if the contact has never been emailed before on an "outreach" type? What if the most recent activity was a negative exchange?
- **Anti-hallucination.** ADEQUATE. "Reference specific things from recent activity to show you were listening" invites grounding. "If the email calls for sharing documentation, use actual resource names" references `resources` by name — decent anti-fabrication. But model can still invent "I noticed you mentioned X" if `recentEmails` is thin.
- **Tone / voice control.** STRONG. Per-rep voice via agent config, fallback to "Professional and concise." Style vs. content decoupled well.
- **Length / verbosity control.** ADEQUATE. "3-8 sentences" explicit. max_tokens 1000. No subject-line cap.

**Output Schema Quality**

Four-field object. One oddity: `to` is a formatted string ("Oliver Laurent, VP of Engineering") not a structured contact reference. Downstream rendering just displays the string — no email address, no contact ID for linking. Under v2 tool-use, `to: { contact_id, display_name, email }` is the cleaner shape.

`body` uses `\\n` for line breaks per the prompt; model inconsistently emits literal `\n` vs. real newlines (04-PROMPTS #12 known issue) — downstream UI must handle both.

**Known Failure Modes**

- **`\n` inconsistency.** Noted above.
- **Two drafting paths.** DECISIONS.md 2.13 duplication between this prompt and #24 — different system prompts, different shapes.
- **Thin prior-email context.** Per 07A §12 HIGH: subject + date only; no email body. A "follow-up" is supposed to reference the thread; prompt has no thread.
- **No MEDDPICC, no agent memory, no deal fitness gaps, no coordinator patterns.** All listed in 07A §12. Email is generic-for-the-stage rather than specific-to-the-moment.
- **Team intel mislabeled.** Per 07A §12 shape risk: `teamIntel` renders teammates' **guardrails** as "insights." Actual teammate insights live in `cross_agent_feedback` (which IS separately passed). Two labels point at two different data sources, one of which is misleadingly named.
- **Resource list by title only.** Works for the prompt's purpose but a resource summary would help the model pick the right document. Also no popularity/recency signal on resources.
- **Guardrails enforced by prompt, not by output validation.** If the guardrail says "never mention competitor pricing" and the draft does, the prompt's rule is violated silently.

**Rewrite Priority**

**SHOULD REWRITE.** Structurally sound and persona-strong but thin on context per 07A §12 HIGH. Also needs consolidation with prompt #24 per DECISIONS.md 2.13 LOCKED. Not MUST REWRITE because the prompt text itself is one of the better-crafted ones; the failures are almost all context-shape and downstream duplication, not prompt quality.

**Specific Improvement Suggestions**

1. **Consolidate with prompt #24.** One email-drafting service per 2.13. Both on-demand and post-pipeline invoke the same underlying prompt, possibly with different pre-assembled context.
2. **Add prior email bodies** (not just subjects) per 07A §12. A "follow-up" should see the last message.
3. **Add MEDDPICC + agent memory + fitness gaps per 07A §12.** Raises voice-aware emails from "generic for the stage" to "specific to this buyer."
4. **Rename/restructure `teamIntel`.** Drop the guardrail rendering; use `cross_agent_feedback` as the sole teammate-insight channel. Or rename the field to "team guardrails" with a clear intent.
5. **Add a guardrail-check instruction.** "Before returning, re-read the email against each guardrail listed above. If it violates any, rewrite it." An in-prompt self-check is cheaper than output-validation plumbing.
6. **Structure the `to` field** for future linking (contact_id + display_name + email).
7. **Add a worked example** showing the voice transfer from a persona description to an actual email.

**Blast Radius Recap**

Saved as `email_draft` activity; rendered inline; editable before send. Does not feed other prompts. Direct product surface for the "agents write in your voice" promise. Consolidation with #24 (per 2.13) is the biggest downstream upgrade.

---

## 13. Natural-Language Agent Config Interpretation

**Task Summary**

Given a user's free-form natural-language instruction (e.g., "make my briefs shorter and more data-driven") and their current agent config (instructions + outputPreferences), emit a structured proposal for what fields should change and what the updated config should look like. User reviews and confirms; a separate PUT request persists. Runs in `POST /api/agent/configure`. Low-volume surface but HIGH blast radius — every config change here shapes future prompt #4/#11/#12 outputs for that member.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. "You are an AI agent configuration interpreter." Functional. Anchors interpreter role but doesn't invoke "careful editor" or "conservative default" framing the task calls for.
- **Task specificity.** STRONG. Detailed field schema for the config (instructions, outputPreferences with 7 sub-fields including specific enum values). Three rules: "Only change what the user explicitly asked for," "Be conservative — don't modify unrelated fields," "If ambiguous, include a 'clarification' field." Task is tight.
- **Reasoning structure.** ABSENT. One-shot JSON generation.
- **Output structure.** STRONG. `{ changeSummary, updatedFields, fullConfig, clarification? }`. Three-form output (summary for humans, delta for auditing, full state for replacement) covers the UX needs.
- **Examples / few-shot.** ABSENT. For a prompt that explicitly mentions an "ambiguous" case, a paired example would be invaluable.
- **Edge-case coverage.** PARTIAL. "clarification" field handles one edge. Doesn't address: what if the instruction asks for a capability that doesn't exist? What if it contradicts a mandatory manager directive (if manager_directives were passed — they're not)? What if the current config is empty (new member)?
- **Anti-hallucination.** STRONG. "Only change what the user explicitly asked for" + "Preserve all existing values in fields you don't change" is one of the strongest anti-fabrication instructions in the registry.
- **Tone / voice control.** N/A (structured output).
- **Length / verbosity control.** ADEQUATE. max_tokens 2048. No per-field caps.

**Output Schema Quality**

Three-or-four field object. Well-formed. `clarification` is optional — when present, treated as abort + ask user. Consumer code first strips fences, then finds first-brace-to-last-brace extraction — robust parser. `fullConfig` is redundant with `currentConfig + updatedFields` but the redundancy simplifies consumer logic (just replace state with `fullConfig`).

One ambiguity: when the model returns `clarification` AND `updatedFields`, what happens? The code path handling this isn't documented in the prompt — model behavior default.

Under v2 tool-use, straightforward: a tool with typed parameters, enum for verbosity, calibrated number for temperature, stricter validation at the tool boundary.

**Known Failure Modes**

- **No schema validation on input `currentConfig`.** Per 04-PROMPTS #13 known issue: malformed input cascades into garbage output. A corrupted config passed in → a corrupted config proposed.
- **No role/vertical context.** Per 07A §13 MEDIUM. "Make my briefs more aggressive on closing" means different things for an AE vs. a BDR. Prompt doesn't see role.
- **No history.** `agent_config_versions` exists; not consulted. User asks for change X; the agent already had change X reverted last week; this prompt can't know.
- **No directive contradiction check.** A user instruction that conflicts with a mandatory manager directive is silently applied.
- **temperature field in output preferences is a number 0-1** but the prompt doesn't document what values correspond to what behavior — model can set temperature 0.85 without understanding consequences.
- **toolsEnabled enum is a fixed 5-value list** in the prompt but no consumer enforces it — model could add a 6th tool name.

**Rewrite Priority**

**SHOULD REWRITE.** Two specific improvements that compound: (a) context expansion per 07A §13 (history + role + directives); (b) add a worked example of an ambiguous case to anchor the clarification behavior. Not MUST REWRITE because the prompt's text is already among the more discipline-enforcing in the batch — "only change what was asked, preserve existing values" is strong. The gaps are around the edges.

**Specific Improvement Suggestions**

1. **Add agent config version history** per 07A §13. "Here are the last 5 changes to this agent's config. If the current request would revert or conflict with a recent change, flag it in the clarification field."
2. **Add target member role + vertical + active manager directives** per 07A §13. Role-calibrates interpretation; directive check prevents silent violations.
3. **Add worked examples.** One clear instruction → clear change; one ambiguous instruction → clarification-only output; one instruction that contradicts a directive → declines with explanation.
4. **Add anti-hallucination for tool names.** "`toolsEnabled` may only contain values from: email_drafting, call_prep, objection_handling, deal_scoring, research. Do not invent tool names."
5. **Document temperature semantics.** "temperature 0.0-0.3: deterministic, formulaic; 0.4-0.7: balanced; 0.8-1.0: creative. Use 0.3 default unless the user asks for more variety."
6. **Port to typed tool-use per 2.13.** Enforces the enum values, the numeric ranges, and the field presence automatically rather than relying on model discipline.

**Blast Radius Recap**

Writes `agent_configs` + `agent_config_versions`. Every call-prep (#11), draft-email (#12), and config-change-suggestion (#4) for this member reads the mutated config. Per 07A §13 MEDIUM, low-frequency but high per-mutation impact.

---

## Interim Cross-Cutting Observations (Prompts 1-13)

Early patterns observed across the first 13 prompts. A full cross-cutting analysis will follow in 4.5b after prompts 14-25 are audited.

**Consistently weak engineering dimensions:**

1. **Reasoning structure is ABSENT in 11 of 13 prompts.** Only prompts #5 (streaming analysis) and #11 (call prep) even partially invite structured reasoning, and both implicitly rather than explicitly. Nothing in this batch uses "first do X, then Y, then emit the JSON" scaffolding — which is the single most consistent gap in the registry's first half.
2. **Examples / few-shot are ABSENT or WEAK in 10 of 13 prompts.** Only prompts #2 (cluster match) and #5 (streaming analysis) have usable inline examples. Anti-hallucination instructions without paired examples (as in #4, #9, #14 ahead) consistently under-perform.
3. **Anti-hallucination rails are WEAK in 7 of 13 prompts.** The worst cases are #4 (agent config change — writes live config with no "abstain if unclear" instruction), #9 (give-back — instructed to "cite numbers" when no numbers are in context), and #7 (personalized question — can invent stakeholders). The best is #13 (NL config interpretation) with its "only change what was asked, preserve existing values" discipline.
4. **Role framing is ADEQUATE but rarely STRONG.** Functional openers ("You are the query engine," "You are an AI agent advisor") dominate. Strong framing (#5's "elite sales coach," #11's rep-name binding, #12's rep-voice binding) appears only when the task is voice-critical.

**Consistently strong engineering dimensions:**

1. **Length/verbosity control is generally STRONG.** Almost every prompt constrains output length via max_tokens + explicit sentence/item counts. #9's "1-2 sentences max" and #7's "one sentence, conversational" stand out.
2. **Output structure (shape) is generally specified.** Every prompt emits JSON with a literal schema block. The quality of the schema varies, but the intent is clear.

**Prompts that stand out:**

- **#5 (Streaming Transcript Analysis)** — best-crafted prompt in the batch. Strong role framing, detailed per-field rules, explicit length budgets, separated into its own `.md`-adjacent module. Rewrite priority: PRESERVE WITH MINOR EDITS.
- **#4 (Agent Config Change Suggestion)** — highest-risk prompt in the batch. Writes live config with no human review; 500-char context truncation; unbounded instruction growth over time. Product-broken per DECISIONS.md 2.25 #3. Rewrite priority: MUST REWRITE.
- **#11 (Call Prep)** — most architecturally ambitious prompt; CRITICAL-rated per 07A §11. Strong framing and task discipline but monolithic structure (200-line conditional concatenation) blocks evolution. Rewrite priority: MUST REWRITE.
- **#8 (Deal-Scoped Question Answer)** — anomaly: `system: ""`. Text-and-schema-upgrade candidate (sentinel string fragility + missing role framing in system prompt).
- **#2 and #9** — the smallest prompts in the batch; both score best-in-class on task specificity and voice, worst on context richness. Prompt-text is fine; context bottleneck is the lift.

**Early patterns to carry into 4.5b (prompts 14-25):**

1. **Auto-persistence prompts are systematically under-guarded.** #4 writes live config without review. Expect similar patterns in pipeline prompts (14-25) that write to live tables — verify anti-hallucination rails and "abstain if unclear" paths.
2. **JSON-in-text parsing with regex is the default.** Expect the same in 14-25; each is an opportunity to migrate to tool-use per DECISIONS.md 2.13.
3. **Context-shape problems dominate over prompt-text problems in this batch.** 7 of 13 prompts would benefit more from the DealIntelligence service (07A cross-cutting #2) than from text rewrites. Watch whether the same holds for the pipeline prompts (which have tighter prescribed input shapes) and for the heavy prompts (#14 close analysis, #15 fitness) where the prompt text itself is longer and more consequential.
4. **Emoji drift in #11 previews emoji handling in the pipeline prompts.** Check whether 14-25 use emojis in output specs; note drop-rate expectations.
5. **Signal-type enum drift (9 vs. 7) first surfaces here.** Confirm in #21 (pipeline signal detector) and propose the single-source enum per DECISIONS.md 2.13 once both call sites are audited.
6. **The research-interview pattern (DECISIONS.md 1.2) is partially implemented in #1 and #14.** Watch for where it SHOULD be implemented but isn't — especially in close analysis and any capture surface in 14-25.

---

END OF 4.5a. Entries 14-25 and full Cross-Cutting Analysis continue below.

---

## Transition Note (4.5b)

The audit below was produced by session 4.5b. It covers prompts 14-25 using the same structure as 4.5a, then replaces the Interim Cross-Cutting Observations section with the full Cross-Cutting Analysis at the end of the document. The interim section above stays in place as a record of mid-audit thinking; the authoritative cross-cutting view is the final section below.

Special items in this batch: prompt #15 (Deal Fitness) gets a proportionally longer treatment given its 250-line scope and 16K output cap; prompt #25 (Coordinator Synthesis) gets a substantive improvement block to address the `system: ""` anomaly; prompts #12 and #24 are cross-flagged as the "two email drafters" per DECISIONS.md 2.13 LOCKED.

---

## 14. Close Analysis (Win/Loss)

**Task Summary**

When a rep selects Closed Won or Closed Lost in the stage modal, this prompt analyzes the full deal history (MEDDPICC, contacts + engagement, transcripts + analyses, observations, recent activities, stage history, system intelligence) and produces three outputs: (a) a structured `summary` + `factors[]` array of specific win/loss factors with evidence and confidence, (b) 0-2 `questions[]` about things the AI suspects but can't confirm from data, with chip options, (c) `meddpicc_gaps[]` and `stakeholder_flags[]`. Drives the close-capture modal's research-interview UX (DECISIONS.md 1.2 LOCKED) and seeds `deals.closeFactors`/`winFactors` + feeds win/loss patterns to every future call prep (#11). **Per DECISIONS.md 1.1 LOCKED, the current single-pass implementation does NOT meet v2's spec** — v2 requires continuous pre-analysis on every transcript/email plus a final deep pass. Rated CRITICAL in 07A §14.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. "You are analyzing a sales deal that just closed ${outcome}. You have access to the complete deal history — transcripts, observations from the field, MEDDPICC scores, stakeholder engagement patterns, stage velocity, and competitive intelligence." Task-first, doesn't invoke "strategic VP of Sales conducting a post-mortem" framing despite that being the LOCKED target per 1.1 ("a strategic-VP-of-Sales-grade hypothesis — an argument with depth, not a summary").
- **Task specificity.** STRONG. Three numbered outputs, each with explicit sub-rules. "Each factor must cite specific evidence from the data (a transcript quote, an observation, a MEDDPICC gap, a stakeholder pattern). Do not speculate beyond what the data shows." Clear success criteria.
- **Reasoning structure.** ABSENT. Three outputs, one JSON. No "first inspect the evidence, hypothesize causes, then validate each against the data" scaffolding — ironic given DECISIONS.md 1.1 describes this prompt's target as "an argument with depth."
- **Output structure.** ADEQUATE on shape, WEAK on type discipline. `factors[].category` interpolates the pipe-separated enum literal (`"competitor|stakeholder|process|product|pricing|timing|internal|champion"`) directly into the spec line — model sometimes returns the pipe string itself as the value (04-PROMPTS #14 known issue #2). `confidence` is an informal "high|medium|low" string — no evidence-strength calibration beyond the three buckets.
- **Examples / few-shot.** ADEQUATE. Inline examples for DYNAMIC_CHIPS ("CompetitorX undercut pricing by 20% (from transcript mention)") and anti-examples ("NOT generic things like 'Lost to competitor'"). Decent density, but no example of the full three-output structure — the hardest-to-reproduce part.
- **Edge-case coverage.** WEAK. What if the deal has zero transcripts? Zero observations? The prompt explicitly asks for evidence citation but the user-message fallbacks are plain strings ("No transcript analyses", "No observations") — model can produce factors without evidence when the whole deal has no data. Doesn't address: won deal closed by a teammate (who gets credit?), deal that bounced between stages repeatedly, deal that was closed_lost and reopened.
- **Anti-hallucination.** ADEQUATE. "Do not speculate beyond what the data shows" is the load-bearing rail. But the model is explicitly asked to propose DYNAMIC_QUESTIONS about "things you suspect but can't confirm from data alone" — which sanctions a carefully-scoped form of speculation. No instruction for "if the evidence for a factor is thin, set confidence: low rather than omitting the factor." A factor with confidence: high and a vague evidence field is technically valid output.
- **Tone / voice control.** WEAK. Two-to-three-sentence `summary` is specified but no tone ("strategic and direct, not cheerleading"). Factor `label`s should be "Short chip label (under 8 words)" — length but no voice. For a VP-grade hypothesis, the voice target matters.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 2000`, summary "2-3 sentences," factors labels "under 8 words," questions "0-2 questions with 3-4 chip options." Per-item sized but no structural cap on factor count — prompt doesn't say "2-6 factors" so model emits anywhere from 1 to 15.

**Output Schema Quality**

Five top-level fields: `summary` (string), `factors[]` (id + label + category + evidence + confidence), `questions[]` (id + question + chips[] + why), `meddpicc_gaps[]` (string array), `stakeholder_flags[]` (string array). Schema matches downstream consumers loosely — `factors[].category` flows into observations' `aiClassification.signals[0].type` via a category-to-signal-type map; `questions[]` drives UI chips; `summary` renders in the modal.

Schema issues:
- `category` string literal enum is interpolated by outcome ("lost" → 8-value enum, "won" → 6-value enum). Valid v1 shortcut; brittle for tool-use.
- `meddpicc_gaps` is narrative text (e.g., "Economic Buyer confidence was only 20%"), not structured (e.g., `{ dimension: "economic_buyer", score: 20, issue: "unclear" }`) — downstream code can only display, not act.
- Per 07-DATA-FLOWS Flow 8 issue #2, `meddpicc_gaps` are DISPLAYED and that's all — not written back to `meddpiccFields`, not captured as observations. Output field with no action.
- `stakeholder_flags[]` is similarly prose-only; no dimension or contactId to act on.
- No overall `confidence` at the analysis level — just per-factor confidence. The "am I confident in my overall story?" signal that a VP would want is absent.

Under v2 tool-use per DECISIONS.md 2.13, the schema becomes typed: `factors[].{id, label, category: enum, evidence: {source: "transcript"|"observation"|"meddpicc"|"activity", ref_id: string, quote: string}, confidence: number 0-1}`. Questions become `questions[].{id, question, chips: string[], why, dimension: meddpicc_key | null}`. MEDDPICC gaps become `meddpicc_gaps[].{dimension: enum, current_score, concern}`. Every field actionable.

**Known Failure Modes**

- **Single-pass analysis violates DECISIONS.md 1.1 LOCKED.** The LOCKED spec requires continuous pre-analysis on every transcript/email updating a rolling "deal theory," plus a final deep pass at close. Current prompt runs once at close from raw data with no theory to build on. 04-PROMPTS #14 known issue #1 notes this; 07A §14 rates it CRITICAL.
- **Taxonomy promotion logic absent.** DECISIONS.md 1.1 requires: "When hypotheses surface uncategorized reasons, flag as candidates. If 3+ deals accumulate similar uncategorized reasons, surface to Jeff/Marcus." No code implements this. Model is forced to pick from the hardcoded category enum every time.
- **Hypothesis verification against event stream absent.** DECISIONS.md 2.21 LOCKED requires hypotheses be verified against the event stream before surfacing. Today the factors are returned verbatim to the UI.
- **Transcript TEXT not passed.** Per 07A §14: prompt receives `call_analyses.summary`/`painPoints`/`competitiveMentions`/`nextSteps` — summaries of summaries — but not the raw transcript text. The quotes that would ground a factor ("Henrik said: 'If security takes another month, we go with Microsoft'") are absent. Model makes up plausible-sounding evidence fields.
- **Category enum pipe-string drift.** Per 04-PROMPTS #14 known issue #2: the literal `"competitor|stakeholder|process|..."` line sometimes returned as a value.
- **MEDDPICC trajectory missing.** Per 07A §14: current score snapshot only, no delta arc. "Economic Buyer confidence dropped 60→20 two weeks before close" is the story the loss analysis is supposed to tell; the prompt doesn't see the arc.
- **No prior briefs, no agent memory, no coordinator patterns.** Per 07A §14. Each loss analysis treats the deal as if it had never been analyzed before — even though the system has been analyzing it continuously for months.
- **Fallback returns empty at 200 status.** Claude parse failure returns `{ summary: "", factors: [], ... }` at success code. UI renders the empty modal; rep doesn't know the analysis failed.

**Rewrite Priority**

**MUST REWRITE.** Two independent reasons. (1) Current implementation fundamentally does not match DECISIONS.md 1.1 LOCKED spec. Re-scoping (not patching) is required: the continuous-pre-analysis pipeline step + a final-pass prompt that reads the rolling deal theory. (2) The prompt's text itself lacks role framing worthy of "VP-grade hypothesis," lacks chain-of-thought structure, has category pipe-drift issues, and the `meddpicc_gaps[]` output field is dead weight (displayed, not acted on). The hero surface for DECISIONS.md's flagship research-interview product pattern is the prompt most out-of-spec with the LOCKED plan.

**Specific Improvement Suggestions**

1. **Re-scope into two prompts.** A lightweight "deal theory update" prompt runs on every transcript/email (part of the pipeline or an event handler per 2.16) and updates a rolling `deal_events` / `deal_snapshot`. A final "deep close analysis" prompt reads the theory + final context and produces the three-output hypothesis. Current prompt becomes the latter.
2. **Upgrade role framing.** "You are a strategic VP of Sales conducting a deal post-mortem with the full history of this opportunity at your disposal. Your goal is to produce an argument with depth — a diagnosis grounded in evidence — not a summary."
3. **Add chain-of-thought scaffolding.** "Before emitting JSON, silently work through: (1) what is the single most plausible story of what happened? (2) what evidence in the provided data supports each step? (3) where is the evidence thin enough that a question to the rep would sharpen the diagnosis?"
4. **Pass full transcript text per 07A §14** — the quotes are the argument.
5. **Pass deal theory + MEDDPICC trajectory + prior briefs + agent memory + coordinator patterns** per 07A §14. Without the arc, depth is impossible.
6. **Upgrade schema to typed tool-use.** Structured `evidence` object per factor (source + ref_id + quote), numeric confidence, structured `meddpicc_gaps[]`. Eliminates category pipe-drift.
7. **Add taxonomy-promotion awareness.** "If the best category for a factor doesn't fit the enum, use `category: 'candidate'` and provide a proposed new category name in `candidate_name`." A separate job promotes candidates when 3+ deals accumulate similar ones (DECISIONS.md 1.1).
8. **Add hypothesis-verification hook per 2.21.** Before the hypothesis surfaces, a verification pass checks each factor against `deal_events`. Low-verification factors are filtered or flagged.

**Blast Radius Recap**

Confirmed factors write to `deals.closeFactors`/`winFactors` AND create `observations` rows AND feed `/api/intelligence` Close Intelligence tab AND feed prompt #11's Win/Loss Intelligence section for every future deal in the same vertical. A weak close analysis propagates into every future call prep. Per 07A §14 CRITICAL, this is one of the highest-leverage prompts in the system — only #11 comes close in downstream reach.

---

## 15. Deal Fitness Analysis (The oDeal Framework)

**Task Summary**

Given a chronological timeline of a deal's transcripts + emails, detect which of 25 canonical "inspectable events" (buyer behaviors in four fit categories: business, emotional, technical, readiness) have occurred, with status `detected | not_yet | negative`. Also produce: commitment tracking (promise → follow-through pairs), language progression (ownership-language % per call), buying committee expansion, response-time pattern, overall assessment. **Longest prompt in the registry at ~250 lines; highest max_tokens at 16,000.** Feeds `deal_fitness_events` (25 rows per deal, delete-and-re-insert per analysis) and `deal_fitness_scores` (per-category + overall scores, plus jsonb narratives). Output is consumed by the `/deal-fitness` page + prompt #11's fitness-context section. Triggered by `/api/deal-fitness/analyze` after transcript pipeline completion or on-demand. Rated HIGH in 07A §15.

**Engineering Quality Assessment**

- **Role framing.** STRONG. "You are an expert deal intelligence analyst implementing the oDeal framework — a methodology for measuring BUYER behavior in enterprise sales deals." Domain-specific, methodology-anchored, establishes the single hardest-to-hold distinction (buyer vs. seller behavior) up front. One of the strongest openers in the registry.
- **Task specificity.** STRONG. 6 "Critical Principles" numbered explicitly, 4 "Commitment Tracking Rules" separately, 25 events enumerated with paired DETECT-WHEN / NOT-THIS clauses, language-progression methodology specified, schema example with realistic data. More structural discipline than any other prompt.
- **Reasoning structure.** PARTIAL. The 25-event enumeration is itself a kind of scaffolding — model processes each event in turn. But no explicit "first pass: scan timeline; second pass: match events; third pass: track commitments across calls; fourth pass: compute language progression" chain. For 16K output + 25 events + commitment pairing + language trajectory, more explicit multi-pass structure would tighten consistency.
- **Output structure.** STRONG. Detailed nested JSON schema with concrete example values. `events[]` structure is uniform per event; `commitmentTracking[]`, `languageProgression`, `buyingCommitteeExpansion`, `responseTimePattern`, `overallAssessment` are each distinct shapes. Downstream code writes 25 rows to `deal_fitness_events` and the narrative jsonb to `deal_fitness_scores`.
- **Examples / few-shot.** STRONG. One full worked event (buyer_shares_kpis with evidence snippet + quote + context + description) and one not_yet event (`buyer_assigns_day_to_day_owner` with coaching note). Commitment tracking example with promise → resolution. Language progression example with actual call labels + percentages + sample quotes. Committee expansion example with introducer tracking. Few-shot density is the highest in the registry. **Critical defect, however:** the worked not_yet example uses `buyer_assigns_day_to_day_owner` — an event key that is NOT in the canonical 25-event list (04-PROMPTS #15 known issue). An unreachable example the model may still emit.
- **Edge-case coverage.** PARTIAL. Handles empty-history explicitly (`existingKeysText` falls back to "None — this is the first analysis"). 6 confidence bands for evidence strength. But does NOT address: what if a transcript has no clear buyer speakers? What if participants list is wrong? What if a commitment was made by a seller listed in participants (edge case: some teams have the CSM on the buyer side)? What about cross-cultural language patterns (ownership language in non-English)?
- **Anti-hallucination.** STRONG. "Events must be supported by specific evidence — a quote, a described action, or an observable behavior. No assumptions." Paired with DETECT-WHEN / NOT-THIS clauses per event. Commitment rules explicitly separate buyer from seller. Language progression methodology is quantitative. Best anti-hallucination discipline in the registry.
- **Tone / voice control.** ADEQUATE. "Brief 2-3 sentence assessment of deal health" for `overallAssessment`; `coachingNote` for not_yet events are seller-facing prose. No explicit voice (e.g., "crisp, diagnostic, not cheerleading") — some coaching notes drift into generic advice when the seller could benefit from tactic-specific framing.
- **Length / verbosity control.** ADEQUATE. 16K output cap; counts per category (6-7 events each); 2-3 sentence overallAssessment. Per-event structure bounds length implicitly. But the timeline input has no explicit truncation — a 6-transcript, 50-email deal at 3K chars per transcript + 1K per email = 68K input chars; plus the 250-line system prompt = context blow-out risk (04-PROMPTS #15 known issue "silent truncation").

**Output Schema Quality**

Five top-level structured fields: `events[]` (uniform shape), `commitmentTracking[]`, `languageProgression.{perCallOwnership, trend, overallOwnershipPercent}`, `buyingCommitteeExpansion.{contacts, expansionPattern, multithreadingScore}`, `responseTimePattern.{averageByWeek, trend, insight}`, `overallAssessment` (string).

Schema matches consumer needs heavily — `events` → 25 `deal_fitness_events` rows, narrative jsonb columns written to `deal_fitness_scores.{stakeholderEngagement, buyerMomentum, conversationSignals}`. But:
- **Narrative field drift.** The prompt's output has `buyingCommitteeExpansion` + `responseTimePattern`; the database writes `stakeholderEngagement` + `buyerMomentum`. Names differ; code maps them. Confusion hazard when reading either side.
- **Hardcoded fallbacks poison good output.** Per 04-PROMPTS #15 known issue #4: code fills in `week: 0`, `benchmark.wonDealAvg: 60` defaults when Claude provided richer data. The output schema trusted the model; code overrode it.
- **25-event count enforced by fallback.** Model instructed to "Return ALL 25 events." If it omits some, code inserts canonical `not_yet` defaults. Silent: the model's "I couldn't determine" becomes indistinguishable from "this event has no evidence."
- **The unreachable example (`buyer_assigns_day_to_day_owner`) can be emitted.** Delete-then-insert writes arbitrary event_key values; downstream UI renders whatever key comes in.
- `languageProgression.perCallOwnership[].weOurPct + yourProductPct` should sum to 100 but isn't enforced. Model sometimes violates.

Under v2 tool-use per 2.13: typed sub-tools per section. `events` schema validates the event_key against the canonical 25-key enum, rejecting `buyer_assigns_day_to_day_owner` at parse time. Percentage sums enforced via constrained parameters.

**Known Failure Modes**

- **Silent input truncation under long histories.** Per 04-PROMPTS #15: no explicit cap on `timelineText`. Long-history deals silently hit model context limits; output `stop_reason` becomes `max_tokens` and the final 25-event JSON is truncated mid-stream. The 3-strategy JSON extraction (direct parse → fence extraction → first-brace-to-last-brace) is the most robust in the registry but cannot recover from mid-JSON truncation.
- **Unreachable example emitted.** Known issue #3 above.
- **Omitted events become silent "not_yet" defaults.** Known issue #2 above.
- **Hardcoded narrative fallbacks override good output.** Known issue #4 above.
- **Full-re-analysis drift on each pipeline run.** Per 07A §15: delete-then-insert means every run re-derives everything. Evidence snippets from prior runs are lost; score drift between runs is invisible to the user. `existingKeysText` lists keys but not evidence, so Claude re-reads the whole timeline and may judge previous strong detections as weaker.
- **Context gaps per 07A §15:** no MEDDPICC, no deal stage history, no prior fitness scores' narrative jsonb, no observations, no agent memory, no coordinator patterns. Adjacent data that would sharpen detection is absent.
- **Language-progression percentage arithmetic.** Model sometimes emits `weOurPct + yourProductPct != 100`. Percentages become decorative, not calculable.
- **Seller/buyer attribution errors.** The prompt acknowledges this is "the single hardest-to-hold distinction" but the context-side fix (pass seller names explicitly per 07A §15) is not implemented.
- **`negative` status defined but rarely emitted.** Schema supports `detected | not_yet | negative` but the prompt's 25-event definitions emphasize detect vs. not-detect; the contradictory-evidence case is underspecified.

**Rewrite Priority**

**SHOULD REWRITE.** This is the best-crafted prompt in the registry text-wise — strong role framing, strong task specificity, strong few-shot examples, strong anti-hallucination. But specific issues are worth addressing: the unreachable example, the hardcoded fallbacks in downstream code, the full-re-analysis pattern that loses evidence continuity, the input truncation risk under long histories, the context gaps. A targeted rewrite (fix the known defects, tighten context, move to tool-use) beats a full rebuild. Not MUST REWRITE because the core prompt design is sound — no structural re-scoping is needed, unlike #14.

**Specific Improvement Suggestions**

1. **Fix the unreachable example.** Replace `buyer_assigns_day_to_day_owner` with a real canonical event key (e.g., `buyer_identifies_sponsor`). Trivial text change; prevents downstream garbage-key writes.
2. **Add explicit input budget and truncation policy.** "The timeline below may contain up to N characters. Process chronologically; if the timeline is long, prioritize the most recent entries for events you've not yet detected."
3. **Pass prior evidence snippets, not just keys** per 07A §15. Lets Claude incrementally strengthen detections rather than rediscover them.
4. **Pass the canonical seller names** (rep + SA + BDR) per 07A §15. Resolves the hardest-to-hold buyer/seller distinction at context level rather than relying solely on prompt discipline.
5. **Add a multi-pass reasoning scaffold.** "Before emitting JSON, work through four passes: (1) identify every participant in every call and mark each as buyer or seller; (2) for each of the 25 events, scan the timeline for evidence; (3) pair buyer commitments with later follow-through events; (4) compute ownership-language percentages per call."
6. **Upgrade to typed tool-use.** `events[].event_key` validated against the canonical 25-key enum. Percentage sums constrained. `status` as enum including explicit `negative` handling guidance.
7. **Rename output fields to match database columns** (stakeholderEngagement, buyerMomentum, conversationSignals) OR update database column names to match output. The inconsistency is unnecessary and confusing.
8. **Pass MEDDPICC + observations + agent memory** per 07A §15. Adjacent context raises detection quality on events like `buyer_introduces_economic_buyer` (MEDDPICC has this) and signal-bearing observations (e.g., "CFO pulled out of the deal" directly disqualifies some events).

**Blast Radius Recap**

Writes `deal_fitness_events` (delete-then-insert 25 rows per run) + `deal_fitness_scores` (upsert). Feeds `/deal-fitness` page, feeds prompt #11's fitness-context section, should feed DECISIONS.md 2.16 event stream. Per 07A §15 HIGH: the best input-data quality of any pipeline prompt (full transcripts passed) but the full-re-analysis pattern means improvements compound slowly across runs. Moving to incremental updates (strengthen evidence rather than rediscover) would dramatically amplify the return on every pipeline run.

---

## 16. Customer Response Kit

**Task Summary**

Given an inbound customer message (email/support ticket/Slack/meeting note), generate a comprehensive "response kit" arming the AE to respond in under 60 seconds: message analysis, similar resolutions from other accounts, recommended knowledge-base articles, draft reply, and internal notes (risk assessment, follow-up recommendation, escalation flag). Runs in `POST /api/customer/response-kit` once per inbound message. Writes to `customer_messages.response_kit` jsonb + flips status to `kit_ready`. Core surface of the My Book feature. Rated HIGH in 07A §16.

**Engineering Quality Assessment**

- **Role framing.** STRONG. "You are an AI assistant for an enterprise Account Executive who manages 100+ accounts with no Customer Success team. Your job is to analyze an inbound customer message and generate a comprehensive Response Kit that arms the AE with everything they need to respond effectively in under 60 seconds." Anchors the time constraint, the role constraint (no CSM backstop), the output purpose. Strong.
- **Task specificity.** STRONG. Five numbered data sources listed ("customer's message and full account context," "internal knowledge base," "data from other accounts in the same vertical," "system intelligence"). "Actionable, specific, and reference concrete data. Never be generic. Always reference the customer's specific situation, their usage data, their stakeholders, and lessons from other accounts." Crisp.
- **Reasoning structure.** ABSENT. Five-section output requested directly without intermediate scaffolding.
- **Output structure.** STRONG. Nested JSON with 5 sections: `message_analysis` (category + urgency + sentiment + key_issues + underlying_concern), `similar_resolutions[]`, `recommended_resources[]`, `draft_reply` (subject + body + tone_notes), `internal_notes` (risk + follow_up + escalation). Aligned with My Book UI. Typed enums for category/urgency/sentiment/escalation_needed.
- **Examples / few-shot.** ABSENT. For a kit that cross-references other accounts and KB articles, an example showing how "similar_resolutions" should cite a specific resolution would tighten the output.
- **Edge-case coverage.** WEAK. What if no similar resolutions exist? Schema admits empty array but prompt doesn't say "return empty array rather than invent an account." What if no KB articles match? What if the message is auto-generated noise (a bounce notification)?
- **Anti-hallucination.** WEAK. "Never be generic" is the primary rail. But per 04-PROMPTS #16 known issue #3: `similar_resolutions[].account_name` is free-form — model invents account names. The prompt doesn't constrain the model to choose from the `otherAccounts` list supplied in context. Also no rail against inventing KB article titles.
- **Tone / voice control.** ADEQUATE. `draft_reply.tone_notes` is a meta-field explaining the tone chosen. Implicit that the reply itself matches the tone described. No explicit "match Sarah Chen's voice" (contrast with prompts #11 and #12).
- **Length / verbosity control.** ADEQUATE. `max_tokens: 2048`. No per-section word caps. `key_issues[]` and `similar_resolutions[]` have no item count.

**Output Schema Quality**

Five top-level sections, typed enums for category / urgency / sentiment / escalation_needed. Matches consumer closely: kit jsonb written verbatim to `customer_messages.response_kit`; rendered in the Response Kit modal.

Schema issues:
- `similar_resolutions[].account_name` is free-form (hallucination risk). Should be `account_id` or a constrained selector.
- `recommended_resources[].title` is also free-form — model can invent KB article titles. Should be `article_id` or a constrained selector.
- `message_analysis.underlying_concern` is one of the most valuable fields (what the customer is really worried about beyond the surface question) but is prose only, not linked to any structured classification.
- `internal_notes.escalation_reason` only populated when `escalation_needed: true` — conditional field; straightforward.

Under v2 tool-use per 2.13: sub-tool calls for similar-resolutions-lookup + resource-recommendation could ground those fields against the actual database. Schema becomes typed IDs + lookups.

**Known Failure Modes**

- **Hallucinated account names.** Per 04-PROMPTS #16 known issue #3. Documented failure.
- **Role hardcoded.** Per 04-PROMPTS #16 known issue #1: "100+ accounts with no Customer Success team" + hardcoded sign-off are Sarah Chen-specific. Reuse blocker.
- **KB article filtering happens in code before prompt.** Per 04-PROMPTS #16 known issue #2: route fetches all articles, filters by vertical/tags/type, passes pre-filtered list. Means prompt can't surface a relevant article outside the filter. If the filter is miscalibrated, relevance suffers silently.
- **Cross-book context gaps per 07A §16:** no prior customer messages for this account, no prior response kits, no contracted_use_cases, no expansion_map, no proactive_signals, no linked observations, no similar_situations jsonb. The adjacent data already on `account_health` is mostly unconsumed.
- **Full KB article text unverified.** 07A §16 notes worth verifying whether `content` or just `summary` is in `articlesStr` — low confidence check. A summary-only pass could produce recommendations that don't address the issue.
- **Draft reply voice drift.** No per-rep agent config consulted (vs. prompt #12 which does). "Sign off as Sarah" is hardcoded but style beyond that is model default.

**Rewrite Priority**

**SHOULD REWRITE.** Structurally solid but specific problems: hallucinated account names in similar_resolutions, hardcoded role, missing prior-conversation history, missing adjacent account_health jsonb, no agent voice. Rewrite consolidates anti-hallucination (constrain account/article selection to provided lists) + context expansion + voice parameterization. Not MUST REWRITE because the core output shape works and the hero surface renders useful kits today; the upgrades compound rather than re-scope.

**Specific Improvement Suggestions**

1. **Constrain similar_resolutions and recommended_resources to provided lists.** "`similar_resolutions[].account_name` must exactly match one of the accounts listed under SIMILAR ACCOUNTS. If no account has a clearly similar situation, return an empty array. Do not invent account names." Same for article titles.
2. **Pass prior customer messages + prior response kits** per 07A §16. Conversation continuity is the single biggest quality gap.
3. **Pass the adjacent account_health jsonb** (contracted_use_cases, expansion_map, proactive_signals, similar_situations, recommended_resources) per 07A §16. Already computed, already stored, not consumed.
4. **Parameterize role framing.** "You are an AI assistant for {rep.name}, an Account Executive managing {bookSize} accounts..." instead of Sarah-hardcoded.
5. **Consult the rep's agent config for voice.** Parallel to prompt #12's approach.
6. **Add worked example** of a good similar_resolution citation (account-specific, with concrete outcome) vs. a bad one (generic "another healthcare account resolved this").
7. **Upgrade to tool-use per 2.13** with typed account_id / article_id references — eliminates hallucination at schema level.

**Blast Radius Recap**

Kit saved to `customer_messages.response_kit` jsonb; cached on repeat opens. Rendered in Response Kit modal; feeds My Book priority scoring indirectly. Kit quality across accounts seeds "similar_resolutions" pattern-matching for future kits — one round of low-quality kits pollutes the pattern library.

---

## 17. QBR Agenda Generator

**Task Summary**

Given a QBR type (Renewal Defense | Expansion Pitch | Usage Review | Executive Re-engagement), a company name, and a client-supplied accountContext blob, generate a structured QBR brief: executive summary, agenda items with durations and talking points, stakeholder strategy, risk to address, success metric. Runs in `POST /api/customer/qbr-prep`. Not persisted — rendered inline in the My Book drawer. Rated MEDIUM in 07A §17.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. "You are an AI assistant preparing a QBR (Quarterly Business Review) agenda for an Account Executive who manages 100+ enterprise AI accounts with no Customer Success team." Same hardcoded role as #16. Anchors the task but not the strategic framing ("prepping a QBR is about shifting the relationship, not running through slides").
- **Task specificity.** ADEQUATE. "Use the account data to make every talking point specific — reference actual stakeholder names, actual usage metrics, actual use case adoption status, and actual expansion opportunities. Never be generic." Direct. Four QBR types implicitly require different structures, but prompt doesn't enumerate how they differ.
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ qbr_type, title, executive_summary, agenda_items[] (topic + duration_minutes + talking_points[] + data_to_prepare + desired_outcome), stakeholder_strategy, risk_to_address, success_metric }`. Reasonable shape.
- **Examples / few-shot.** ABSENT. Four QBR types with four distinct structural emphases would each benefit from an example.
- **Edge-case coverage.** WEAK. What if the account has no usage metrics? No stakeholders listed? Prompt assumes the accountContext blob is rich.
- **Anti-hallucination.** PARTIAL. "Never be generic" + "reference actual stakeholder names, actual usage metrics" implies grounding but doesn't constrain inputs. If accountContext is thin, model invents numbers.
- **Tone / voice control.** WEAK. No tone guidance. A renewal defense QBR should sound different from an expansion pitch; prompt treats them uniformly.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 2048`. "2-3 sentences" executive summary. `agenda_items.duration_minutes` as a number implicitly bounds the meeting.

**Output Schema Quality**

Seven top-level fields, one nested array. Matches consumer (rendered inline). `duration_minutes` sum implies a meeting length but isn't constrained. `talking_points` is a string array without structure — no evidence pointers, no owner per point.

Under v2 tool-use: typed, but structurally similar. The QBR-type branching is the main shape opportunity — four sub-tools rather than one prompt with 4-way branching would enforce each QBR type's structural emphasis.

**Known Failure Modes**

- **Client-trusted accountContext.** Per DECISIONS.md 2.11 LOCKED ("No client-controlled flags gate server-side trust decisions") spirit. Route performs no DB reads; server trusts whatever the client sends. A stale UI state poisons the brief. 07A §17 flags this — not strictly a trust-flag violation but close.
- **Product-hardcoded prompt.** "Claude AI, Claude Code, and Cowork to mid-market companies (500-2500 employees) in regulated industries" is Anthropic-specific. Reuse blocker.
- **Not persisted.** Prompt regenerates each time rendered; no caching, no continuity across QBRs for the same account.
- **Context gaps per 07A §17:** no server-side account_health fetch, no customer_messages, no observations, no deal history, no health_factors trajectory, no competitive context.
- **QBR types under-differentiated.** Same prompt structure for all 4 types; model differentiates based on `qbrType` string alone.
- **Escalation and risk framing flat.** `risk_to_address` is "the elephant in the room if any — be direct" — good instruction but no example of how to frame directness vs. diplomacy.

**Rewrite Priority**

**SHOULD REWRITE.** Context fix is the biggest lever (server-side authoritative fetch + add adjacent account_health fields + prior QBRs if persisted). QBR-type branching needs structural support (4 sub-prompts OR explicit type-specific emphasis sections). Product hardcoding needs parameterization. Not MUST REWRITE because the shape works; the upgrades are refinements.

**Specific Improvement Suggestions**

1. **Re-fetch accountContext server-side.** Per DECISIONS.md 2.11 spirit — don't trust the client. Load from `account_health` + `companies` + `contacts` + `customer_messages` + `observations`.
2. **Persist QBR output.** `qbr_briefs` table keyed by `{companyId, qbrType, createdAt}`. Enables continuity ("last QBR's risk was X; has it resolved?").
3. **Branch the prompt by QBR type.** Four distinct agenda-shape emphases — at minimum pull them into named sections within the system prompt; ideally as sub-tools per 2.13.
4. **Parameterize products.** "Products sold: {products.join(', ')}" instead of "Claude AI, Claude Code, and Cowork."
5. **Add context per 07A §17:** health_factors trajectory, similar_situations, proactive_signals, recent customer_messages.
6. **Add worked examples** for Renewal Defense vs. Expansion Pitch — show the structural + voice differences.

**Blast Radius Recap**

Not persisted; rendered inline; self-contained. No downstream prompts consume. Lowest-blast-radius heavy prompt in the batch. Upgrades here improve UX quality per-session but don't compound across the system.

---

## 18. Customer Outreach Email

**Task Summary**

Given a customer outreach type (`use_case_checkin` or `proactive_signal`), purpose tags (for check-in: `check_in | success_stories | explore_new | health_check`), a recipient, a specific use case OR signal, and accountContext, generate a concise outreach email (3-4 paragraphs max for check-in; 2-3 for signal-driven). Two-branch prompt; same input/output shape; different system prompts per branch. Runs in `POST /api/customer/outreach-email`. Not persisted; rendered inline in My Book drawer. Rated MEDIUM in 07A §18.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. Same pattern as #16/#17. "You are an AI assistant drafting a proactive outreach email for an Account Executive who manages 100+ enterprise AI accounts." Functional, Sarah-hardcoded.
- **Task specificity.** STRONG. Per-branch rules:
  - check-in: "Be warm, specific, and value-focused — never generic. Reference the team's specific use case and current adoption numbers. Share insights about similar success patterns in the same industry WITHOUT naming other customers."
  - signal-driven: "Lead with the signal/news as the reason for reaching out — it should feel timely and relevant, not like a sales pitch. Connect it specifically to their business and use cases. Propose one clear next step."
  - Plus per-purpose guidance lookup table injected into the check-in prompt.
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ subject, body, purpose_notes | signal_notes }`. Simple, matches consumer.
- **Examples / few-shot.** ABSENT.
- **Edge-case coverage.** WEAK. What if the recipient has never been contacted before? What if the signal is stale? What if multiple purposes conflict (check_in + success_stories)? Prompt says "weave them together naturally" but doesn't show how.
- **Anti-hallucination.** PARTIAL. "WITHOUT naming other customers" constrains one source of fabrication. "similar organizations in {vertical}" is a permissible anonymization. But no rail against inventing customer wins or specific numbers.
- **Tone / voice control.** STRONG. "warm, specific, value-focused" + "not like a sales pitch" for signal-driven. Per-branch tone baked in. "Sign off as Sarah" — hardcoded but explicit.
- **Length / verbosity control.** STRONG. 3-4 paragraphs (check-in) or 2-3 (signal); `max_tokens: 1024`.

**Output Schema Quality**

Three-field object. Branch-dependent third field name (`purpose_notes` vs. `signal_notes`). Technically fine for the renderer; slight schema polymorphism is awkward for typing.

Under v2 tool-use: two typed tools, one per branch. Or unified `notes` field with an additional `notes_type` discriminator.

**Known Failure Modes**

- **Hardcoded "Sign off as Sarah."** Per 04-PROMPTS #18 known issue. Reuse blocker when another AE gets a book.
- **Product-hardcoded.** Same as #16/#17.
- **DB-less context.** Everything client-passed. 07A §18 MEDIUM: no recipient engagement history, no prior outreach emails sent to this contact, no prior customer messages from them, no agent config for voice.
- **Multi-purpose conflict unguided.** "Weave them together naturally" without an example produces a kitchen-sink email that feels like every purpose at once.
- **Signal-driven path assumes signal is non-stale.** No date check in the prompt; a 60-day-old product release still fires as "timely."

**Rewrite Priority**

**SHOULD REWRITE.** Same pattern as #16/#17: context expansion + role parameterization + consolidation with other email-drafting paths. Not MUST REWRITE — the output shape is small and the issues are all refinements. Per 07A §18 and per DECISIONS.md 2.13's "one email-drafting service": this prompt, #12, and #24 should eventually consolidate.

**Specific Improvement Suggestions**

1. **Consolidate with #12 and #24 per DECISIONS.md 2.13.** One email-drafting service, three entry points (outbound to open-deal contact via #12; follow-up after transcript via #24; customer outreach via #18). Shared voice calibration, shared guardrails.
2. **Parameterize the sign-off** — pull from `team_members.name` for the sending AE, not hardcoded Sarah.
3. **Add recipient context per 07A §18:** engagement history, prior outreach, prior customer messages.
4. **Add agent config voice consultation.** Each AE's agent_config.instructions applies here too.
5. **Guard against stale signals.** "If `signal.daysAgo` exceeds 30, reframe the opener away from 'timely' language."
6. **Add worked example** of a multi-purpose email (e.g., check_in + explore_new) vs. a single-purpose one, demonstrating the "weave" operation.

**Blast Radius Recap**

Not persisted; rendered inline; self-contained. No downstream prompts. Same UX-only blast radius as #17.

---

## 19. Pipeline Step — Extract Actions (Actor)

**Task Summary**

First of three parallel Claude calls in the transcript pipeline's `parallel-analysis` step. Given a transcript (truncated at 15K chars) and a company name, extract all action items, commitments, and key decisions. Output feeds prompt #22 (synthesize learnings), prompt #24 (draft follow-up email), and the `deal-agent-state` `lastInteractionSummary`. Runs in the Rivet actor via `callClaude()` helper (not SDK). Rated MEDIUM in 07A §19 — low cost to fix, moderate impact.

**Engineering Quality Assessment**

- **Role framing.** WEAK. "You are a sales call analyst. Extract all action items, commitments, and key decisions from the transcript. Return valid JSON only — no markdown, no explanation." Single-sentence role; no expertise anchor.
- **Task specificity.** WEAK. "Extract all action items, commitments, and key decisions" — three categories bundled. Differences between "commitment" and "action item" unspecified; the model treats them interchangeably and emits only `actionItems[]`.
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ actionItems: [{ item, owner, deadline }] }`. Simple, matches consumer.
- **Examples / few-shot.** ABSENT.
- **Edge-case coverage.** WEAK. What if no action items in the call? Model emits `actionItems: []` (implicit). What if the owner isn't identifiable ("someone will check")? What if a commitment is conditional ("if pricing lands, we'll proceed")? Unspecified.
- **Anti-hallucination.** ABSENT. No "only extract explicit commitments" rail. Model routinely infers action items from discussion without explicit assignment.
- **Tone / voice control.** N/A.
- **Length / verbosity control.** ADEQUATE. Default 4096 max tokens from callClaude helper — ample for the output shape.

**Output Schema Quality**

Two-field nested object. Downstream consumers: #22 gets `JSON.stringify(actions)` for synthesis; #24 gets `JSON.stringify(actions)` for email drafting; `deal-agent-state` records count-only. No consumer reads `owner` or `deadline` structurally — both are passed as stringified blobs into downstream prompts. Means the typed fields exist for model discipline but add no structural value beyond that.

Under v2 tool-use per 2.13: straightforward typed conversion. Could add `commitment_type: "seller" | "buyer" | "mutual"` to align with fitness prompt #15's commitment tracking.

**Known Failure Modes**

- **Buyer/seller attribution conflated.** Unlike prompt #15 which explicitly separates buyer commitments (engagement signal) from seller commitments (expected behavior), this prompt's `actionItems[].owner` is free-text and treated uniformly downstream. Valuable signal lost.
- **15K-char truncation drops late-transcript content.** Per 07A §19. Action items often appear in the final minutes ("here's what we'll do next...") — truncation risk on long calls.
- **No prior-action-items context** per 07A §19. Prior action items not-yet-closed are never passed; every call re-extracts from zero. Actions never close.
- **Context gaps per 07A §19:** no deal stage, no MEDDPICC, no existing contacts structure, no active experiments. All available in `input` (other parallel calls use them) — just not passed to this call.
- **Thin role framing reduces model discipline.** Paired with absent CoT, output is sometimes over-inclusive (extracts vague statements as action items).

**Rewrite Priority**

**SHOULD REWRITE.** Small prompt, multiple low-cost wins: role framing upgrade, buyer/seller attribution, prior action items context, anti-hallucination rail. Not MUST REWRITE because the prompt is functional and the transcript-pipeline architecture (per DECISIONS.md 2.13 "One transcript preprocessing pass") will consolidate #19/#20/#21/#22 into a shared preprocessing step anyway.

**Specific Improvement Suggestions**

1. **Strengthen role framing.** "You are an expert deal analyst extracting explicit commitments and action items from a sales call transcript. You distinguish buyer commitments (engagement signals) from seller commitments (professional defaults)."
2. **Split commitment types.** `actionItems[].type: "action_item" | "buyer_commitment" | "seller_commitment" | "decision"` with definitions.
3. **Pass deal stage + MEDDPICC + prior-open-actions + contacts** per 07A §19. All free from `input`.
4. **Add anti-hallucination rail.** "Only extract items with explicit commitments. If an owner is unclear, set `owner: 'unassigned'`. Do not infer action items from discussion."
5. **Dedup against prior actions.** "If an action item in this call matches a prior-open action, mark `fulfills_prior: <id>` rather than re-extracting."
6. **Consolidate truncation via DECISIONS.md 2.13 canonical preprocessing.** One transcript-processing pass feeds #19/#20/#21/#22 from shared structured output; eliminates varied truncation.

**Blast Radius Recap**

Output feeds #22 (synthesize learnings), #24 (draft email), deal-agent-state. A missed action item becomes a missed follow-up email item becomes a missed learning becomes a missed call-prep item. Per 07A §19 MEDIUM, low-cost fix compounds downstream.

---

## 20. Pipeline Step — Score MEDDPICC (Actor)

**Task Summary**

Second of three parallel Claude calls in the pipeline's parallel-analysis step. Given current MEDDPICC scores (confidence-only, comma-separated) and a truncated transcript (15K chars), return delta updates per dimension where new evidence exists. Output PATCHed to `/api/deals/[id]/meddpicc-update` which writes `meddpicc_fields` + logs a delta activity. Rated HIGH in 07A §20.

**Engineering Quality Assessment**

- **Role framing.** ADEQUATE. "You are a MEDDPICC scoring expert for enterprise sales." Method-anchored. Reasonable.
- **Task specificity.** ADEQUATE. "Only update dimensions where the transcript provides NEW evidence" is the critical instruction. Per-dimension output fields listed. "Only include dimensions with new evidence" re-emphasized — the single most important behavioral guardrail in the prompt.
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ updates: Record<dimensionName, { score, evidence, delta }> }`. Dimension keys are the 7 MEDDPICC fields. `delta` is "change from current score" — implies signed integer. Downstream code re-validates via `validateMeddpiccScore`.
- **Examples / few-shot.** ABSENT. For "NEW evidence" the distinction between "fresh information" and "same information restated" is the prompt's hardest call — examples would help.
- **Edge-case coverage.** WEAK. What if the transcript mentions a dimension but adds nothing new? Prompt implies skip, but without examples the model sometimes re-scores anyway. What if two dimensions are jointly relevant? What if evidence contradicts an existing score (should lower it)?
- **Anti-hallucination.** WEAK. "Only include dimensions with new evidence" is the rail but the prompt only shows Claude the current confidence numbers, not the existing evidence text (07A §20). So Claude can't reliably judge "new vs. same" — leading to re-scoring of dimensions based on quotes already in the DB.
- **Tone / voice control.** N/A.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 4096` default. Per-dimension evidence is "quote or observation from the transcript" — no explicit cap.

**Output Schema Quality**

Record-valued jsonb with dimension-name keys. Matches consumer. `delta` vs. `score` redundancy (delta = score - currentScore) — one derivable from the other; code uses delta to decide whether to upsert.

Under v2 tool-use: typed dimension enum, numeric score bounds 0-100. The Record shape is awkward for tool schemas — convert to `updates: [{ dimension: enum, score, evidence, delta }]` array.

**Known Failure Modes**

- **Re-scoring dimensions based on already-recorded quotes** — the biggest quality issue. Per 07A §20 HIGH: current evidence text not passed; Claude can't judge "new" vs. "same." Every pipeline run may produce duplicate deltas.
- **Contradictory evidence handling.** If a transcript contradicts a prior score, should delta be negative? Prompt permits it ("positive or negative") but offers no discipline — model routinely emits only positive deltas, creating ratcheting-up bias.
- **Contact role context missing.** Per 07A §20: a statement from an `economic_buyer` role scores Economic Buyer differently from the same statement by an `end_user`. Context doesn't include contact roles.
- **15K truncation same as #19.**
- **No manager-directive awareness.** Per 07A §20: some directives specify minimum thresholds; model doesn't know.

**Rewrite Priority**

**SHOULD REWRITE.** Evidence-aware context fix is load-bearing. Prompt text upgrades (contradiction handling, example of new vs. same) compound. Per 07A §20 HIGH, MEDDPICC is the core qualification object; quality drift here degrades every downstream prompt. Not MUST REWRITE because consolidation via DECISIONS.md 2.13 preprocessing pass will naturally fold this with #19/#21.

**Specific Improvement Suggestions**

1. **Pass existing evidence text per dimension**, not just confidence. Per 07A §20. Single biggest fix.
2. **Add contradiction handling.** "If new evidence contradicts the existing score (e.g., champion defined → champion disengaged), emit a negative delta with evidence citing both the prior signal and the new contradiction."
3. **Pass contact roles + deal stage** per 07A §20.
4. **Add new-vs-same example.** "`currentEvidence: 'CTO Priya stated 2h/physician/day documentation burden'`. If transcript mentions 'physicians spend 2 hours on notes' — NO new evidence (same quote). If transcript mentions 'CFO backed the 2h finding and added $400/hr opportunity cost' — NEW evidence (economic framing)."
5. **Consolidate via canonical preprocessing per 2.13.** Shared transcript analysis emits structured extracts per dimension; this prompt scores against the extract + existing evidence.
6. **Switch Record to array shape** for typed tool-use.

**Blast Radius Recap**

Writes `meddpicc_fields` (upsert) + `activities` (delta). Read by prompts #8, #11, #14, MCP tools, `/intelligence`, UI. Per 07A §20 HIGH, every downstream prompt that relies on MEDDPICC confidence reads the output of this prompt. Quality drift here propagates silently across the system.

---

## 21. Pipeline Step — Detect Signals (Actor)

**Task Summary**

Third of three parallel Claude calls in the pipeline's parallel-analysis step. Given a transcript (15K truncated), deal vertical, deal name, and known contacts, classify every meaningful signal into 7 types (competitive_intel, process_friction, deal_blocker, content_gap, win_pattern, field_intelligence, process_innovation) and extract per-stakeholder sentiment/engagement/priorities. Output feeds observation creation (one observation per signal via `/api/observations` with `preClassified: true`) and is forwarded to the intelligence coordinator actor for cross-deal pattern detection. Rated HIGH in 07A §21.

**Engineering Quality Assessment**

- **Role framing.** STRONG. "You are analyzing a sales call transcript for a deal in the ${input.vertical} vertical. Extract every meaningful signal from this conversation." Vertical-binding is strong. Task specificity framing via the 7-type enumeration is detailed.
- **Task specificity.** STRONG. 7 signal types each with a crisp definition ("competitive_intel: Any mention of competitors, competitive positioning, pricing comparisons, feature comparisons"). Second output (stakeholder sentiment) also well-specified (sentiment/engagement/keyPriorities/concerns/notableQuotes).
- **Reasoning structure.** ABSENT.
- **Output structure.** STRONG. Two top-level arrays, each with uniform per-item shape. Typed enums for type/urgency/sentiment/engagement.
- **Examples / few-shot.** ABSENT. Per-type definitions are specific but no worked example showing the JSON shape populated.
- **Edge-case coverage.** WEAK. What if the transcript has no signals? Empty arrays (implicit OK). What if the signal fits two types? Prompt says "exactly one" — model picks one but without guidance on tiebreaks. What if a stakeholder sentiment is mixed within the call? Unspecified.
- **Anti-hallucination.** ADEQUATE. "Only include signals where there is clear evidence in the transcript. Do not invent or infer signals that aren't supported by what was said." Strong rail. But per 07A §21 notes: without MEDDPICC context, a signal like "pricing pushback" can be mis-categorized in a Discovery vs. Negotiation deal.
- **Tone / voice control.** N/A for machine-consumed output. Stakeholder insights' `keyPriorities[]` feel mechanical when surfaced in UI.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 2048` (explicitly set higher than the parallel-analysis default). `quote` field capped at "under 30 words."

**Output Schema Quality**

Two arrays:
- `signals[].{type (enum of 7), content, context, urgency, source_speaker, quote}`
- `stakeholderInsights[].{name, title, sentiment, engagement, keyPriorities[], concerns[], notableQuotes[]}`

Both well-formed. Downstream code writes one observation per signal via `POST /api/observations` with `preClassified: true` (bypassing prompt #1's classifier). Stakeholder insights recorded via `dealAgent.recordInteraction` per matched stakeholder. No consumer reads `context` field structurally — passes through as observation metadata.

Under v2 tool-use: typed. Signal-type enum should source from a single shared enum (per DECISIONS.md 2.13).

**Known Failure Modes**

- **7-vs-9 signal-type drift with prompt #1.** Flagged multiple times (07-DATA-FLOWS Flow 1 issue #3; 04-PROMPTS #21 known issue #1). Pipeline observations can NEVER have signal type `agent_tuning` or `cross_agent` — so the agent-config auto-mutation path (#4) never fires from pipeline-detected signals. Lost functionality by enum drift.
- **Signal misattribution when speaker isn't in known contacts.** `source_speaker: "Name of person who said it"` — but `validateSignal()` (in `lib/validation.ts`) maps this against known contacts; unknown speakers are dropped or genericized. Per CLAUDE.md S13 note on field mapping.
- **Same 15K truncation.**
- **Context gaps per 07A §21:** no MEDDPICC, no deal stage, no active experiments, no existing open signals, no coordinator patterns. Signal classification is context-poor.
- **Over-enumeration on high-density calls.** Prompt says "every meaningful signal" — a dense transcript produces 15+ signals, each written as an observation. Intelligence dashboard flooded.
- **Stakeholder insights duplicate across pipeline runs.** Each transcript for the same deal re-derives sentiment for the same stakeholders; no incremental update.

**Rewrite Priority**

**SHOULD REWRITE.** Two specific drivers: (a) close the 7-vs-9 enum drift with prompt #1 per DECISIONS.md 2.13 — single source of truth enum; (b) add MEDDPICC + stage + coordinator context per 07A §21 — sharpens classification. Not MUST REWRITE because the prompt text itself is one of the stronger actor prompts. Upgrades are surgical.

**Specific Improvement Suggestions**

1. **Source signal-type enum from single location per 2.13.** Include all 9 types + align with `/api/observations` classifier.
2. **Add MEDDPICC + stage + active experiments + open signals** per 07A §21.
3. **Add a per-signal confidence field** to enable downstream severity filtering.
4. **Add coordinator pattern awareness.** "If this signal matches an existing active coordinator pattern for this vertical, set `matches_pattern: <pattern_id>`." Lets downstream routing skip or batch.
5. **Add worked example** of a signal that tightroeps between two types (e.g., competitive_intel vs. deal_blocker for "CFO said Microsoft is cheaper and we need to revisit") with the tiebreak rationale.
6. **Bound signal count by severity** — "Return up to 10 signals ranked by urgency. Lower-urgency signals beyond 10 can be omitted."
7. **Incremental stakeholder sentiment** — pass prior-transcript stakeholder sentiment as baseline; model emits only changes.

**Blast Radius Recap**

Per signal: one `observations` row → one `observation_routing` row → possibly one `observation_clusters` match/creation → possibly one `coordinator_patterns` signal → possibly surfaced in every future call prep in the vertical. Per 07A §21 HIGH: "Highest blast radius per-output-item of any pipeline step."

---

## 22. Pipeline Step — Synthesize Learnings (Actor)

**Task Summary**

After the parallel-analysis step completes (#19/#20/#21 outputs available), this prompt synthesizes strategic learnings from the parsed outputs + a shorter transcript excerpt (8K chars). Specifies that each learning must combine specific evidence (name/number/quote) + broader context (why it matters + how to act). Output feeds `deal_agent_states.learnings` jsonb — the agent's long-term memory. Rated HIGH in 07A §22.

**Engineering Quality Assessment**

- **Role framing.** WEAK. "You are a deal strategist. Synthesize the transcript analysis into key learnings. Return valid JSON only." Two-sentence system prompt; "deal strategist" anchors the task but not the target quality bar.
- **Task specificity.** STRONG. User-prompt specifies the compound requirement: "Each learning MUST combine: (1) Specific evidence from the transcript (a person's name, a number, a stated preference, a direct quote); (2) Broader context explaining WHY this matters and HOW to act on it." Good example + two anti-examples demonstrate the distinction. Plus focus areas ("stakeholder preferences, decision criteria, competitive positioning, relationship dynamics, process obstacles"), output count (3-7), length (1-2 sentences each).
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ learnings: string[] }`. Simple. Per-learning shape enforced by the "must combine" instruction + examples.
- **Examples / few-shot.** STRONG. Good example ("GDPR compliance is a hard gate — Henrik stated it is non-negotiable, and the team chose Anthropic over OpenAI specifically because of data privacy controls. Lead with compliance positioning in all stakeholder conversations.") + two bad examples ("The customer cares about compliance" / "Henrik said GDPR is important"). Strong pattern of show-the-shape discipline.
- **Edge-case coverage.** WEAK. What if upstream parsed outputs are empty (no actions, no meddpicc, no signals)? What if they contradict each other? Prompt assumes synthesis succeeds.
- **Anti-hallucination.** ADEQUATE. Evidence-citation requirement + 8K truncated transcript + upstream structured outputs. But without access to existing learnings, model can re-emit the same learning paraphrased differently — duplicates accumulate.
- **Tone / voice control.** WEAK. Learnings are the deal agent's memory surfaced in call prep. No voice specified — output reads as analytical rather than strategic.
- **Length / verbosity control.** STRONG. 3-7 learnings, 1-2 sentences each. Tight.

**Output Schema Quality**

Single-field object with string array. Matches consumer — `deal_agent_states.learnings` stored as jsonb string array. Per-learning structure (evidence + context + action) is enforced by prompt discipline, not schema. Under v2 tool-use: `learnings[].{evidence: string, context: string, action: string, scope: enum}` — structured per-element schema would enforce the compound requirement.

**Known Failure Modes**

- **8K truncation is smaller than the 15K upstream steps.** Per 04-PROMPTS #22 known issue + 07A §22: synthesis sees LESS context than the step it synthesizes from. Absurd. A learning about late-transcript content is lost.
- **Prior learnings not passed.** Per 07A §22. Duplicates accumulate; merge happens via string equality — paraphrased duplicates bypass dedup.
- **Upstream outputs JSON-stringified.** Per 07A §22: wall of JSON text; model re-parses and re-prioritizes instead of consuming structured input. Better as named sections.
- **parseJSON fallback to `{ learnings: [] }` on failure.** 04-PROMPTS Gaps section: silent failure indistinguishable from "no learnings."
- **Context gaps per 07A §22:** no prior risk signals, no existing MEDDPICC evidence text, no observation cluster memberships for the deal, no stage history.
- **Thin role framing + absent CoT** means learning quality depends on the upstream parsed outputs being rich — when they're sparse, learnings are generic.

**Rewrite Priority**

**SHOULD REWRITE.** Strong existing examples + evidence-citation discipline mean the prompt text is reasonable; the fixes are: truncation consistency (match upstream 15K), prior-learnings dedup, upstream outputs as structured sections not JSON blobs, context expansion. Not MUST REWRITE — the prompt is one of the better-specified actor prompts; upgrades compound rather than re-scope.

**Specific Improvement Suggestions**

1. **Match upstream truncation (15K or canonical preprocessing per 2.13).** Synthesis should see at least as much context as detection did.
2. **Pass existing `deal_agent_states.learnings`** per 07A §22. "Do not re-emit learnings already in the existing set. Only add net-new strategic insights."
3. **Pass existing risk_signals + MEDDPICC evidence text** per 07A §22.
4. **Render upstream outputs as structured sections**, not JSON.stringify blobs. Named headers per category.
5. **Upgrade role framing.** "You are a strategic deal analyst translating call evidence into durable deal intelligence. Each learning you emit becomes part of the agent's long-term memory used in every future call prep."
6. **Structured per-learning schema** — `{ evidence, context, action, scope }` — enforces the compound requirement at parse time.
7. **Distinguish failure from no-learnings.** Return `{ learnings: [], reason: "no new insights" }` vs. `{ learnings: [], reason: "parse error" }`.

**Blast Radius Recap**

Writes `deal_agent_states.learnings`; directly consumed by prompt #11 (call prep) via `formatMemoryForPrompt`. Persistent across sessions. Per 07A §22 HIGH: low-quality learnings degrade every future call prep for this deal. Duplicate-accumulation problem is especially insidious — memory grows even when quality plateaus.

---

## 23. Pipeline Step — Experiment Attribution (Actor, Conditional)

**Task Summary**

Conditional pipeline step. When the AE is in the test_group of one or more active (`status='testing'`) experiments, this prompt analyzes the transcript (12K truncated) for evidence that the rep used the experiment's tactics. For each active experiment, returns whether evidence was found, the tactic used, customer response, and sentiment. Output PATCHes `/api/playbook/ideas/[experimentId]` with appended `experiment_evidence[]`. Evidence accumulation drives graduation decisions (DECISIONS.md 1.3-1.6 experiment lifecycle). Rated MEDIUM in 07A §23 (becomes HIGH in v2 context with applicability gating).

**Engineering Quality Assessment**

- **Role framing.** WEAK. "You are checking whether a sales call transcript contains evidence relevant to active A/B experiments." Task-first, no persona.
- **Task specificity.** ADEQUATE. Three numbered sub-questions: "Did the rep use any of the tactics? What specific evidence supports or contradicts? What was the customer's response?" Experiments enumerated with `id`, `title`, `hypothesis`, `category`.
- **Reasoning structure.** ABSENT.
- **Output structure.** ADEQUATE. `{ attributions: [{ experimentId, evidenceFound, tacticUsed, evidence, customerResponse, sentiment }] }`. Clean shape.
- **Examples / few-shot.** ABSENT. Applying an experiment hypothesis to a transcript is judgment-heavy work; an example showing a match vs. a near-miss would sharpen attribution.
- **Edge-case coverage.** WEAK. What if the experiment's hypothesis is vague ("close more aggressively")? What if the rep used a related-but-different tactic? What if evidence partially supports it? The prompt offers no guidance.
- **Anti-hallucination.** ADEQUATE. "Only include experiments where you found clear evidence. Do not guess." Clear rail. Holds reasonably well in practice.
- **Tone / voice control.** N/A (machine-consumed).
- **Length / verbosity control.** ADEQUATE. Default 4096 max_tokens; per-experiment evidence is a description, no explicit cap.

**Output Schema Quality**

Per-attribution fields cover the "did the tactic appear, and what happened" question. No confidence field — "evidenceFound: true" is binary. No `applicability` check — the prompt runs against all active experiments for the AE regardless of deal stage or vertical fit.

Under v2 tool-use with DECISIONS.md 2.21 applicability gating: this prompt shouldn't even see experiments whose `applicability.stage` doesn't include the current deal's stage. Context-side fix more than prompt-side.

**Known Failure Modes**

- **No applicability gate per DECISIONS.md 2.21 LOCKED.** All active experiments the AE is in test_group for are checked, regardless of deal stage, vertical, or precondition fit. Attribution is polluted with experiments that can't apply.
- **12K truncation middle-ground.** Smaller than signal detection (15K), larger than learnings (8K). Consistency debt.
- **Experiment format bare.** `- "${title}" (ID: ${id}): ${hypothesis} (Category: ${category})` — no success_thresholds, no current_metrics, no per-experiment test instructions. Model infers from hypothesis alone.
- **Context gaps per 07A §23:** no prior experiment evidence for dedup, no deal contact roles (attribution sometimes depends on who's in the meeting), no AE's prior attributions across other deals.
- **Conditional presence creates UX inconsistency.** Pipeline UI shows different step counts when experiments are present vs. absent.
- **Non-deterministic graduation decision.** Prompt outputs evidence; graduation is manual (manager clicks Graduate). No automatic threshold evaluation.

**Rewrite Priority**

**SHOULD REWRITE.** Core issue is applicability gating (context fix per DECISIONS.md 2.21) + prior-evidence dedup. Prompt text upgrades are secondary. Not MUST REWRITE — the prompt's task is well-scoped; the v2 architectural shift (2.21 + 2.16) does the heavy lifting.

**Specific Improvement Suggestions**

1. **Apply 2.21 applicability gating upstream.** Only experiments whose `applicability.{stage, vertical, precondition}` matches the current deal's state reach this prompt. Eliminates polluted attributions.
2. **Pass existing experiment_evidence** per 07A §23. "If similar evidence already exists for an experiment, only emit if this call provides materially new information."
3. **Add success_thresholds + current_metrics** to per-experiment context. Lets the attribution note calibrate ("this gets us closer to the 20% velocity threshold").
4. **Add per-experiment worked example** — one evidenceFound=true case and one evidenceFound=false-because-near-miss case.
5. **Confidence field per attribution** — enables downstream filtering of weak attributions from graduation calculations.
6. **Pass contact roles.** Some experiments depend on stakeholder presence ("build prototype during Discovery with Technical Evaluator").

**Blast Radius Recap**

Writes `playbook_ideas.experiment_evidence` jsonb. Evidence aggregation drives graduation decisions → graduated experiments inject into prompt #11's proven-plays section → shape every future call prep. Per 07A §23: MEDIUM today (relatively low frequency), HIGH in v2 context once applicability gating makes attribution trustworthy.

---

## 24. Pipeline Step — Draft Follow-Up Email (Actor)

**Task Summary**

Last content-generation step in the pipeline. Given action items (from #19), stakeholder insights (from #21), and the rep's agent config instructions, draft a professional follow-up email. Output stored on `loopCtx.state.followUpEmail`; rendered in workflow tracker; NOT persisted unless the rep saves. **Schema-conflicts with prompt #12** (on-demand email drafting) — per DECISIONS.md 2.13 LOCKED: "One email-drafting service." Wrapped in try/catch so pipeline continues on failure. Rated HIGH in 07A §24.

**Engineering Quality Assessment**

- **Role framing.** WEAK. "You are a sales email writer. Draft a professional follow-up email incorporating key action items from the call. Return valid JSON only." Generic. No rep-voice binding (contrast with prompt #12's strong "Write in the rep's voice, following their communication style exactly").
- **Task specificity.** WEAK. "Keep it professional, concise, and reference specific commitments from the call." One sentence of direction. No length target, no CTA requirement, no opener guidance.
- **Reasoning structure.** ABSENT.
- **Output structure.** WEAK. `{ subject, body }`. Two fields. Compare to prompt #12's `{ subject, body, to, notes_for_rep }` — missing `to` (recipient) and `notes_for_rep` (advisory meta-field). Downstream consumer stores subject + body only; the advisory value of `notes_for_rep` is lost.
- **Examples / few-shot.** ABSENT.
- **Edge-case coverage.** WEAK. What if no action items? What if stakeholder insights is empty? Prompt doesn't handle.
- **Anti-hallucination.** WEAK. No grounding rails. Model can invent content not in the passed actions/stakeholders.
- **Tone / voice control.** PARTIAL. `input.agentConfigInstructions` passed conditionally with "Rep's communication style preferences:" prefix — better than nothing. But "follow this rep's voice" isn't emphasized as in #12.
- **Length / verbosity control.** WEAK. Default 4096 max_tokens. No sentence/paragraph target. Output can run long.

**Output Schema Quality**

Two fields. Matches consumer (subject + body written to activity metadata). Schema inconsistency with #12 violates DECISIONS.md 2.13 LOCKED. Fallback on parse failure returns `{ subject: "Follow-up: ${dealName} Discussion", body: "Thank you for taking the time to meet today." }` — generic placeholder that masks Claude outages.

Under v2 consolidation with #12 + #18 per 2.13: one shared email-drafting service, three invocation contexts. Shared schema, shared voice calibration, shared guardrails.

**Known Failure Modes**

- **Duplication with prompt #12.** Per 04-PROMPTS #24 known issue. Same conceptual task, different system prompts, different output shapes. DECISIONS.md 2.13 explicit violation.
- **Stakeholders reduced to names only.** Per 07A §24: `signals.stakeholderInsights.map(s => s.name)` — titles/roles/priorities dropped. Email can't target specific stakeholders meaningfully.
- **Action items passed as JSON.stringify blob.** Per 07A §24. Structured owner → commitment → deadline would read more clearly.
- **No recipient context** per 07A §24: no existing contacts, no prior email thread, no engagement history, no MEDDPICC, no agent memory, no manager directives, no relevant resources.
- **Generic fallback masks outages.** Reps see "Thank you for taking the time to meet today." as a valid draft when the API actually failed.
- **No guardrail check.** Prompt #12 has guardrails from agent config; this prompt doesn't consult them.

**Rewrite Priority**

**SHOULD REWRITE.** Consolidation with prompt #12 (and #18) per DECISIONS.md 2.13 LOCKED is the load-bearing change. Once consolidated, this becomes "pipeline-invocation context of the shared email service" rather than a standalone prompt. Not MUST REWRITE in isolation — the consolidation IS the rewrite.

**Specific Improvement Suggestions**

1. **Consolidate with prompts #12 and #18 per DECISIONS.md 2.13.** Shared email-drafting service; pipeline invokes it with pipeline-specific pre-assembled context.
2. **Align output schema with #12.** `{ subject, body, to, notes_for_rep }` — already a proven schema.
3. **Pass rich stakeholder data** (titles/roles/concerns) not just names.
4. **Pass recipient context** per 07A §24: existing contacts (with engagement), prior email thread, MEDDPICC, agent memory, manager directives, relevant resources.
5. **Parameterize length + tone** via agent config.
6. **Remove generic fallback; surface error.** Let the workflow tracker show "email draft unavailable" when it actually failed, rather than a misleading placeholder.

**Blast Radius Recap**

Rendered in workflow tracker; not persisted unless rep saves. Self-contained surface today. Post-consolidation per 2.13, this path folds into the shared email service — quality compounds with #12 and #18.

---

## 25. Coordinator Pattern Synthesis (Actor)

**Task Summary**

When the intelligence coordinator actor detects 2+ signals of the same type (+ same competitor for competitive_intel) across different deals in the same vertical, this prompt synthesizes the pattern: a 2-3 sentence summary of what's happening across these deals, 2-3 specific actionable recommendations, and an estimated ARR impact multiplier. Output persists to `coordinator_patterns` table AND is pushed to affected deal agents via `addCoordinatedIntel()` (broken no-op per 07-DATA-FLOWS Flow 6). Surfaces on Intelligence dashboard "Agent-Detected Patterns" section. **THIS IS THE LARGEST `system: ""` ANOMALY in the registry** — flagged in DECISIONS.md 2.14 OPEN. The coordinator is Act 2 of the demo narrative; this prompt's quality determines whether cross-deal intelligence reads as meaningful or noise. Rated HIGH in 07A §25.

**Engineering Quality Assessment**

- **Role framing.** ABSENT at the system level (`system: ""`). The role declaration is in the user message: "You are an AI sales intelligence analyst." One-sentence role, placed AFTER the vertical/signal-type framing of the request — structurally the model reads "the task is this, oh and by the way you're an analyst" rather than "you are an analyst doing this task." Weakest role framing in the entire registry, not by omission but by placement.
- **Task specificity.** ADEQUATE. Three numbered outputs: "concise synthesis (2-3 sentences)," "2-3 specific, actionable recommendations," "estimated ARR impact multiplier." Output is structured but the synthesis quality bar ("what's the pattern and why does it matter?") is named without examples or rubric.
- **Reasoning structure.** ABSENT. For a cross-deal synthesis task — which is inherently multi-step reasoning (identify shared mechanism → assess portfolio impact → recommend action) — the absence is especially damaging.
- **Output structure.** ADEQUATE. `{ synthesis, recommendations[], arrImpactMultiplier: number }`. Matches consumer. `arrImpactMultiplier` is an unusual field — documented as "how many times the individual deal ARR is the total portfolio risk" — but without calibration.
- **Examples / few-shot.** ABSENT.
- **Edge-case coverage.** WEAK. What if the 2+ signals are superficially similar but mechanistically different (two deals flagged competitive_intel about two unrelated competitors in the same vertical)? What if the pattern is already-known and just a restatement of an existing `coordinator_patterns` row for this signal type? What if the signals are from an anomaly spike that won't repeat?
- **Anti-hallucination.** WEAK. No "ground recommendations in the specific signals provided" instruction. Recommendations routinely are generic playbook advice ("build a competitive battlecard for Microsoft") rather than specific to the portfolio pattern ("all three deals mentioned pricing in Negotiation; prepare the Microsoft price-hold bundle for the NordicMed close meeting Tuesday").
- **Tone / voice control.** WEAK. Recommendations are rep-facing (surfaced in Intelligence dashboard + should-be-in call prep per 2.17 LOCKED) but no tone specified.
- **Length / verbosity control.** ADEQUATE. `max_tokens: 1024`; explicit 2-3 sentences synthesis + 2-3 recommendations.

**Output Schema Quality**

Three fields. `synthesis` is prose; `recommendations` is string array; `arrImpactMultiplier` is a number. No confidence field — pattern synthesis quality is invisible. No `pattern_type` or classification beyond the already-known `signalType` from the coordinator state. The rich per-signal detail (urgency, sourceSpeaker, quote) from prompt #21 is stripped before this prompt sees it — per 07A §25: "only `.content` is shown."

Under v2 tool-use: typed synthesis schema with structured recommendations (including `priority`, `time_horizon`, `owner_role`), structured ARR impact ({individual_deal_average, portfolio_multiplier, confidence}), pattern classification ({type, lineage_from_pattern_id, severity_trend}).

**Known Failure Modes — including the `system: ""` anomaly investigation**

**Why `system: ""` specifically hurts this prompt:**

The Anthropic Claude API treats the `system` parameter as conversation-level framing — it tells the model "this is your persistent identity" separate from the turn-by-turn dialogue. The `messages[]` parameter is what the user says THIS turn. When `system: ""`:
1. **Role discipline collapses.** Without system framing, the model treats the user message as a standalone request. The "You are an AI sales intelligence analyst" sentence at the top of the user message is structurally weaker — it reads as "context the user provided about themselves" rather than "the identity the assistant holds."
2. **Temperature-style sampling increases.** Absent a system-anchored identity, the model samples more variably across calls — synthesis quality becomes inconsistent across pattern types.
3. **Instruction following weakens.** The prompt's numbered outputs (1, 2, 3) compete with the surrounding data (signal summary, deal names). With system framing, task instructions dominate; without it, data can dominate.
4. **Safety and style constraints drift.** Anthropic's post-training anchors "you are a helpful assistant" discipline at the system level. Empty system = weaker anchor for the broader assistant behavior (helpfulness, grounding, refusal patterns).

**Empirical effects observed in output quality per 07-DATA-FLOWS Flow 6:**
- Generic recommendations unmoored from the specific signals (the "build a battlecard" problem).
- Arbitrary `arrImpactMultiplier` values — 1.5, 2.0, 3.0 without evident calibration.
- Synthesis text that paraphrases the signals rather than synthesizing a mechanism.

**Other known failure modes:**
- **Thin signal representation.** Per 07A §25: each signal rendered as `"- ${dealName} (${companyName}): ${content}"` — urgency, speaker, quote dropped. Model has less to work with than the per-signal detection produced.
- **No stage context per signal.** A pattern across 3 Discovery deals is a different beast than one across 3 Negotiation deals.
- **No ARR per deal.** Model asked for ARR impact multiplier but not given individual ARRs. Guessing.
- **No stakeholder context per deal.** Pattern where CFOs pushed back vs. end users complained — indistinguishable in current context.
- **No prior synthesized patterns** per 07A §25. Pattern lineage ("this is a re-emergence of last week's pattern") invisible.
- **No existing playbook experiments** addressing the pattern. Recommendations can contradict already-in-flight tactics.
- **Broken downstream wire.** Per 07-DATA-FLOWS Flow 6 BROKEN + DECISIONS.md 2.17 LOCKED: `addCoordinatedIntel` is a no-op on the deal agent; `dealAgentStates.coordinatedIntel` never gets written; call prep reads from that unwritten column. So even perfect synthesis here doesn't reach call prep until the wiring is fixed.

**Rewrite Priority**

**MUST REWRITE.** Three independent reasons, each sufficient on its own. (1) The `system: ""` anomaly is a direct violation of DECISIONS.md 2.14 (OPEN flag) and undermines the prompt's output quality in model-behavior-predictable ways. (2) The context is dangerously thin — urgency/speaker/quote/stage/ARR/stakeholder all dropped before the model sees signals — and the prompt has no rails against generic recommendations. (3) This is Act 2 of the demo narrative and per DECISIONS.md 2.17 LOCKED this prompt's output must become a required input to call prep; quality here is load-bearing for the system's external story.

**Specific Improvement Suggestions (substantive — this prompt is highest-leverage MUST REWRITE in the batch)**

1. **Move role framing into `system` with stronger anchoring.**
   > "You are the Intelligence Coordinator for Nexus — a sales-intelligence analyst with visibility across an entire enterprise sales portfolio. When a pattern appears across multiple deals, you diagnose the underlying mechanism and recommend specific actions each affected deal's AE should take. Your recommendations are specific to the actual deals involved, grounded in the signals provided. You do not restate surface observations as insights. You do not offer generic playbook advice."

2. **Add chain-of-thought scaffolding.**
   > "Before emitting JSON, silently work through: (1) what specific mechanism is common across these deals? (Competitive pressure from the same vendor? Process friction with the same regulatory framework? Content gap on the same artifact?) (2) what would change if each AE applied a different tactic? (3) what is the portfolio-level lesson vs. the per-deal application?"

3. **Enrich signal representation.** Per 07A §25: include urgency, source_speaker, quote, deal stage, deal ARR, deal stakeholder context. Currently only `.content`.

4. **Pass prior synthesized patterns** for lineage-awareness. "If this pattern is an extension or re-emergence of an existing pattern, note the lineage in your synthesis and adjust recommendations accordingly."

5. **Pass related existing experiments.** "If an active experiment addresses this pattern, recommend amplifying/extending it rather than proposing a novel tactic."

6. **Add worked examples** paired:
   - **Good:** "Microsoft DAX pricing pushback across 3 healthcare Negotiation-stage deals (total €4.2M). All three buyers cited Microsoft's aggressive discount in the past 10 days. The mechanism is not product-fit but commercial urgency — Microsoft appears to be closing Q-end. Recommendations: [1] NordicMed closes Tuesday — deploy the Microsoft price-hold bundle before the meeting. [2] MedVista's CFO is the most price-sensitive; prep a 3-year TCO comparison referencing SOC 2 compliance retained value. [3] Escalate pricing authority to Marcus for same-quarter matchmaking."
   - **Bad:** "Three healthcare deals are mentioning Microsoft competitively. Recommendations: [1] Build a Microsoft competitive battlecard. [2] Train reps on Microsoft positioning. [3] Flag to leadership." (Generic; not actioned on specific deals; multiplier implied not justified.)

7. **Structure `recommendations[]` as objects.** `{ priority: "urgent" | "this_week" | "queued", application: "deal_specific" | "vertical_wide" | "org_level", target_deal: deal_id | null, action: string }`. Enables UI to sort, filter, and attribute.

8. **Calibrate `arrImpactMultiplier`.** "Multiplier should reflect HOW MUCH additional ARR is at risk portfolio-wide compared to a single affected deal. Example: if 3 deals at $500K each are affected by the pattern and 4 more deals in the vertical are at risk of similar exposure, multiplier ≈ (3+4)/3 = 2.3. Provide calculation in `arrImpactCalculation` field."

9. **Wire to call prep per DECISIONS.md 2.17 LOCKED.** Separate from prompt text, but the synthesis IS useless until call prep reads it. Either fix `coordinator → addCoordinatedIntel → dealAgentStates` wire (per 07-DATA-FLOWS Flow 6 SHOULD BE) or have call prep query `coordinator_patterns` directly.

**Blast Radius Recap**

Output persists to `coordinator_patterns` (working) + should flow into every affected deal's call prep per 2.17 (broken today). Intelligence dashboard renders the synthesized patterns as the Act 2 demo narrative. Per 07A §25 HIGH: when the downstream wire is fixed per 2.17, this prompt's output shapes every future call prep for every deal in the affected pattern — CRITICAL blast radius. Fixing the `system: ""` anomaly + context + downstream wire is the single highest-leverage rewrite in the entire system.

---

## Cross-Cutting Analysis (Full — supersedes the Interim Observations above)

This analysis spans all 25 prompts. It builds on 4.5a's Interim Observations (mid-audit thinking about prompts 1-13) but is the authoritative cross-cutting view.

### 1. Engineering Dimensions Patterns Across All 25 Prompts

Ratings were assigned on a four-point scale per dimension: STRONG, ADEQUATE, WEAK, ABSENT. Counts below are approximations collapsed across all 25 entries.

| Dimension | STRONG | ADEQUATE | WEAK | ABSENT |
|---|---|---|---|---|
| Role framing | 5 | 12 | 6 | 2 |
| Task specificity | 11 | 10 | 4 | 0 |
| Reasoning structure | 0 | 2 | 0 | 23 |
| Output structure | 10 | 11 | 4 | 0 |
| Examples / few-shot | 3 | 4 | 5 | 13 |
| Edge-case coverage | 0 | 4 | 17 | 4 |
| Anti-hallucination | 2 | 9 | 10 | 4 |
| Tone / voice control | 5 | 7 | 9 | 4 |
| Length / verbosity control | 11 | 10 | 3 | 1 |

**Consistently strong dimensions:**
- **Task specificity (11/25 STRONG, 10/25 ADEQUATE).** Most prompts specify what they want with decent precision. This is Nexus's foundational prompt-engineering strength — the model usually knows the task.
- **Length/verbosity control (11/25 STRONG, 10/25 ADEQUATE).** Explicit sentence counts, item counts, and max_tokens budgets are applied defensively almost everywhere.
- **Output structure (10/25 STRONG, 11/25 ADEQUATE).** Every prompt emits a literal JSON schema block; quality varies but the intent is universal.

**Consistently weak or absent dimensions:**
- **Reasoning structure (23/25 ABSENT).** The single most consistent gap. Almost every prompt jumps from task statement to JSON answer with no intermediate scaffolding. Only #5 and #11 partially invite structured reasoning. For the heavy analytical prompts (#11, #14, #15, #25) this is a structural miss worth a category in the principles section.
- **Examples / few-shot (13/25 ABSENT, 5/25 WEAK).** Over 70% of prompts lack usable examples. The best-performing prompts on this dimension (#5, #15, #22, and partially #2) show it can be done without token bloat.
- **Edge-case coverage (4/25 ABSENT, 17/25 WEAK).** Empty-data cases, ambiguous-data cases, conflicting-evidence cases are systematically underspecified.
- **Anti-hallucination (10/25 WEAK, 4/25 ABSENT).** Only #15 and #22 score STRONG. Many prompts ask the model to cite evidence ("reference specific data") without providing data to cite (#9 "cite numbers" with no numbers passed; #12 "reference recent activity" with subject-only activity list).

**Correlations observed:**
- **Prompts with strong role framing tend to have stronger few-shot examples** (#5, #15, #22). Suggests role + example are co-invested by prompt authors.
- **Prompts that write to live persistent state (#4, #11, #20, #22) have weaker anti-hallucination** than prompts with human-in-the-loop confirmation (#13, #14's close modal). The highest-consequence paths are the least-guarded — an inverted correlation that is specifically dangerous.
- **Pipeline actor prompts (#19-#25) have uniformly weaker role framing** than SDK route prompts — they're often just 1-2 sentence openers. The callClaude helper's minimal-config style invited minimal framing.
- **Context-rich prompts don't correlate with higher anti-hallucination discipline.** #11 receives 14+ parallel queries and still has "stakeholders_in_play" invention risk when contact list is thin.

### 2. Prompt Engineering Anti-Patterns Recurring Across the Codebase

Patterns observed in 3+ prompts:

1. **Cite-evidence-but-no-evidence-provided.** Present in #9 ("cite numbers"), #11 (proven plays "specific to THIS deal"), #14 ("cite specific evidence"). The prompt text demands grounding; the context doesn't include the material to ground in. Model fills the gap with plausible-sounding fabrications.

2. **Enum interpolated into prompt text as pipe-separated literal.** Present in #14 (`"competitor|stakeholder|process|..."` as category spec), #15 (status enum), #11 (fitness category in multiple places). Model occasionally returns the literal pipe-string as a value. Fix: tool-use enums OR explicit "choose one of: A | B | C".

3. **Same task, different system prompts across call sites.** #12 + #24 + #18 are all email drafting; #5 + #19-22 all analyze transcripts; #1 and #21 both classify signals with different enum sizes (9 vs. 7). DECISIONS.md 2.13 LOCKED calls for one service per task.

4. **Silent fallback on parse failure = silent failure.** #14 returns empty analysis at 200 status; #19/#20/#21/#22 have parseJSON fallbacks to `{}` or `[]`; #24 returns a generic "Thank you" email. In no case does the UI distinguish "model returned nothing actionable" from "model call failed." Operators see degraded-but-live UX with no diagnostic.

5. **Chain-of-thought not invited.** 23/25 prompts jump to JSON. For analytical prompts this is the single largest output-quality lever.

6. **Inline prompts in route handlers rather than .md files.** 24/25 prompts are template literals inside TypeScript (#5 is the exception). DECISIONS.md Guardrail #4 flags this universally.

7. **Fence-strip-and-JSON-parse fragility.** At least 4 different regex patterns for stripping Markdown fences across the codebase (documented in 04-PROMPTS.md Prompt Engineering Patterns). Only #15 has the 3-strategy robust extractor. Everywhere else: regex-and-hope.

8. **JSON.stringify as a cross-prompt handoff format.** #22 receives `JSON.stringify(actions)` + `JSON.stringify(meddpicc)` + `JSON.stringify(signals)` from upstream; #8 stringifies the whole dealContext; #10 stringifies the entire input. Wall-of-JSON inputs burn tokens and force the model to re-parse rather than reason.

9. **Schema fields present but unread.** #1's `sensitivity`, `follow_up.clarifies`; #12's `notes_for_rep` (read but not persisted structurally); #14's `meddpicc_gaps[]` (displayed, not written back); #11's `competitive_context` (rendered if present but no enforcement). Bloat that should be pruned in 4.7.

10. **Varied transcript truncation across pipeline steps.** 15K for #19/#20/#21, 12K for #23, 8K for #22. Downstream synthesis sees LESS context than upstream detection — an absurd gradient. Fix: DECISIONS.md 2.13 "One transcript preprocessing pass."

11. **Currency/date format drift.** `€` in #1, #7, #9, #14; `$` in #15, #16, #18; `en-GB` in #11, #14; `en-US`/ISO in #15, #16. No shared formatter.

12. **Emoji-prefixed output fields.** #11 uses 📊/🔴/🟡/🟢/📋/📉/🏆/⚠️; Claude drops unpredictably. Decorative, not load-bearing, but when code downstream expects prefixes for icon rendering it degrades.

13. **`system: ""` anomaly.** Present in #25 (explicit empty) and #8 (omitted, equivalent). Flagged in DECISIONS.md 2.14 OPEN. Role discipline weakens; instruction following drifts.

14. **Auto-persistence without human review.** #4 auto-writes to `agent_configs`. Only confirmed in this audit batch, but the pattern risks replication elsewhere when prompts move from "draft for review" to "apply automatically."

15. **Hardcoded product/role names in reusable prompts.** #16/#17/#18 all hardcode "Sarah," "100+ accounts," "Claude AI, Claude Code, Cowork." Reuse blockers when another AE or another product context emerges.

### 3. Tiered Rewrite Priority Summary

All 25 prompts grouped by rewrite priority.

**MUST REWRITE (4):**
- **#4 Agent Config Change Suggestion** — auto-writes live config without review (DECISIONS.md 2.25 #3 violation); 500-char truncation; unbounded instruction growth.
- **#11 Call Prep Brief Generator** — CRITICAL-rated per 07A §11; coordinator gap blocks Act 2 (DECISIONS.md 2.17 LOCKED); monolithic 200-line conditional structure blocks evolution.
- **#14 Close Analysis** — fundamentally does not meet DECISIONS.md 1.1 LOCKED spec (single-pass vs. required continuous pre-analysis + final deep pass); no VP-grade hypothesis possible from current context.
- **#25 Coordinator Pattern Synthesis** — `system: ""` anomaly (DECISIONS.md 2.14); thin signal representation; recommendations mostly generic; downstream wire broken per 2.17.

**SHOULD REWRITE (19):**
- **#1 Observation Classification** — anti-hallucination rails thin; reasoning structure absent; 9-vs-7 signal enum drift with #21.
- **#3 New Cluster Detection** — 120-char truncation; no observer diversity context.
- **#6 Field Query Analysis** — missing coordinator + prior field queries; schema conflict between direct-answer and fanout cases.
- **#7 AE Question Generator** — no MEDDPICC; one-deal hardcoding; no examples for a voice-critical prompt.
- **#8 Deal-Scoped Manager Question** — second `system: ""` anomaly (role framing in user message); plain-text + sentinel parsing fragile.
- **#9 Give-Back Insight** — "cite numbers" rail without numbers in context; hallucinated stats; no peer responses visible.
- **#10 Aggregated Answer Synthesis** — 1-sentence system prompt; plain-text output throws away structure; thin context.
- **#12 Email Draft Generator** — prior email bodies missing; duplication with #24 per DECISIONS.md 2.13.
- **#13 NL Agent Config Interpretation** — no history/role/directives context; no worked examples.
- **#15 Deal Fitness Analysis** — unreachable example in prompt; full-re-analysis drift; input truncation risk; specific hardcoded fallbacks override good output.
- **#16 Customer Response Kit** — hallucinated account names in similar_resolutions; hardcoded role; missing prior-conversation history.
- **#17 QBR Agenda Generator** — client-trusted context; product-hardcoded; not persisted.
- **#18 Customer Outreach Email** — Sarah-hardcoded sign-off; no recipient engagement history.
- **#19 Pipeline Extract Actions** — thin role framing; buyer/seller attribution conflated; 15K truncation.
- **#20 Pipeline Score MEDDPICC** — existing evidence text not passed; contradiction handling absent.
- **#21 Pipeline Detect Signals** — 7-vs-9 signal enum drift with #1; highest per-output-item blast.
- **#22 Pipeline Synthesize Learnings** — 8K truncation smaller than upstream; no prior learnings context.
- **#23 Pipeline Experiment Attribution** — no applicability gating (DECISIONS.md 2.21); no prior-evidence dedup.
- **#24 Pipeline Draft Follow-Up Email** — schema conflict with #12; duplicate drafting path per 2.13.

**PRESERVE WITH MINOR EDITS (2):**
- **#2 Cluster Semantic Match** — small, tightly focused; core issues are context-shaped (07A §2), not prompt-text.
- **#5 Streaming Transcript Analysis** — strongest prompt in the registry; minor additions (chain-of-thought scaffold for long transcripts, quote grounding, optional dealId context).

**PRESERVE AS-IS (0):**
No prompt survives the audit without recommended changes. Every prompt at minimum benefits from tool-use schema migration per DECISIONS.md 2.13.

**Total: 4 + 19 + 2 + 0 = 25.** ✓

### 4. Top 8 Candidates for Full Rewrite in Prompt 4.7

Selected using the combined criterion (priority + blast radius + demo-criticality + text-shape fixability). Prompt 4.7 will produce full rewrites of exactly these 8.

1. **#4 Agent Config Change Suggestion.** MUST REWRITE. Highest-risk prompt in the registry — writes live agent config without human review, degrading every future #11 and #12 output for the affected member. DECISIONS.md 2.25 #3 mandates re-scoping as an event-sourced proposal. Text rewrite: re-shape output to proposal + approval fields; add anti-hallucination "default to requires_approval: true"; pass full instructions + history + directives; add worked examples of good/bad proposals. **Rewrite should accomplish:** convert auto-apply path into a guarded proposal emitter that targets real gaps with evidence and rationale.

2. **#11 Call Prep Brief Generator.** MUST REWRITE. Hero surface of the product; CRITICAL-rated in 07A §11. The 200-line conditional system prompt resists evolution; the coordinator gap blocks Act 2; MEDDPICC trajectory + prior briefs + full fitness jsonb are absent. Text rewrite: decompose into composable sub-prompts (per DECISIONS.md 2.13), wire coordinator per 2.17 LOCKED, add chain-of-thought per section, add per-section length budgets. **Rewrite should accomplish:** a composable brief generator where each section is a typed sub-call with applicability gating — call prep becomes orchestration of smaller diagnosable prompts, not a monolith.

3. **#14 Close Analysis.** MUST REWRITE. Fundamentally does not meet DECISIONS.md 1.1 LOCKED spec — single-pass vs. required continuous pre-analysis + final deep pass. The flagship research-interview prompt cannot produce VP-grade hypotheses from a one-shot pass on summaries. Text rewrite: re-scope into two prompts — a rolling deal-theory updater running per transcript/email, and a final deep-pass prompt reading the theory. Add hypothesis-verification hook per 2.21. Strengthen role framing ("strategic VP conducting a post-mortem"). Add taxonomy-promotion awareness per 1.1. **Rewrite should accomplish:** an evidenced, depth-first hypothesis that earns the "argument not summary" bar DECISIONS.md 1.1 demands.

4. **#25 Coordinator Pattern Synthesis.** MUST REWRITE. `system: ""` anomaly (DECISIONS.md 2.14) + thin signal representation (urgency/speaker/quote/stage/ARR dropped) + generic recommendations + broken downstream wire. Act 2 of demo narrative. Text rewrite: move role framing to `system` with strong anchoring; add chain-of-thought; enrich signal shape; add worked examples (good specific-to-deals vs. bad generic); structure recommendations as objects. Wire to call prep per 2.17 LOCKED (architectural follow-through, not prompt-text). **Rewrite should accomplish:** portfolio-level diagnoses that name the mechanism, tie to specific deals, and drive specific AE actions — stopping the "build a battlecard" generic-recommendation problem.

5. **#1 Observation Classification.** SHOULD REWRITE — front-door to the entire intelligence-capture system; HIGH blast per 07A §1; issues are text-shaped. Text rewrite: add anti-hallucination rails ("if no entity clearly matches, return empty array"); source the 9 signal types from the shared enum per 2.13 (resolves drift with #21); document `needs_clarification` explicitly; break "decide follow-up" into a reasoning step; add worked examples of should-ask vs. shouldn't-ask. **Rewrite should accomplish:** a classification layer that grounds its entity links in provided data and produces deterministic, tool-use-validated structured output.

6. **#9 Give-Back Insight.** SHOULD REWRITE — hero surface for the "smart colleague tip" voice. Text-shaped problem: prompt asks to "cite numbers" with no numbers in context → consistent hallucinated stats. Text rewrite: replace "cite numbers" with conditional instruction ("cite if provided, else strategic observation grounded in context"); add worked examples of good vs. generic; drop `source` field or restructure as cited_data; add opt-out `applies: boolean`; role-frame as peer. Context fix (peer responses, coordinator patterns, system intelligence) compounds. **Rewrite should accomplish:** give-backs that either cite real cross-portfolio data or provide strategic observations grounded in the deal — never invent statistics.

7. **#15 Deal Fitness Analysis.** SHOULD REWRITE — longest prompt (250 lines, 16K output cap), most ambitious schema, specific known text defects (unreachable example key, percentage arithmetic not enforced, full-re-analysis pattern loses prior evidence). Downstream through #11's fitness-context section makes this a leverage point. Text rewrite: fix unreachable example; add explicit input budget + truncation policy; add multi-pass reasoning scaffold; pass canonical seller names; pass prior evidence snippets for incremental update; rename output fields to match DB columns. **Rewrite should accomplish:** an incrementally-updating oDeal analysis that strengthens evidence rather than rediscovering it, with deterministic schema validation.

8. **#21 Pipeline Detect Signals.** SHOULD REWRITE — "highest blast radius per-output-item" per 07A §21; text-fixable 7-vs-9 signal enum drift directly breaks the agent-config auto-mutation path (#4). Signal detection seeds observations + coordinator + routing + future call prep. Text rewrite: source signal-type enum from shared location per 2.13; add MEDDPICC + stage + coordinator context; add per-signal confidence; add worked example of tiebreak. **Rewrite should accomplish:** signal classification that respects the system-wide enum, anchors severity via confidence, and surfaces the right signals to the right downstream consumers.

**Close misses (not in top 8 but meaningful 4.7 candidates if slack exists):**
- **#8 Deal-Scoped Manager Question** — second `system: ""` anomaly + sentinel parsing. Text-only fix; moderate blast.
- **#20 Pipeline Score MEDDPICC** — highest-downstream-reach pipeline prompt (feeds #8, #11, #14, UI, MCP) but principal fix is context-shaped (pass existing evidence), less of a 4.7 text lift.

### 5. Prompt Engineering Principles Emerging from the Audit

Eight principles seeded by the audit. These will be refined into the "Prompt Principles for Codex" section in Prompt 4.7.

1. **Every analytical prompt opens with a `system` role framing that invokes domain expertise.** "You are a strategic VP of Sales," "you are an expert deal intelligence analyst," "you are the Intelligence Coordinator." Never `system: ""`. Never defer role to the user message. Rationale: the `system: ""` anomaly in #25 and the structural equivalent in #8 measurably weakens role discipline and instruction following.

2. **Every analytical prompt invites structured intermediate reasoning.** Either an explicit chain-of-thought scaffold ("first identify X, then Y, then emit JSON") or a multi-pass structure. 23/25 current prompts omit this — the single most consistent gap in the registry.

3. **Every prompt that produces structured output uses tool-use schemas, not JSON-in-text.** Ties to DECISIONS.md 2.13 LOCKED. Schema validation at the tool boundary eliminates enum drift, field-omission ambiguity, and 4 different fence-strip regexes across the codebase.

4. **Every prompt that makes claims about a deal cites evidence from provided data; never asserts freely.** Evidence means a transcript quote (verbatim), an observation ID, a MEDDPICC dimension + score, or a named stakeholder action. The "cite evidence" instruction is paired with context that contains the evidence to cite — inverse of #9's "cite numbers" problem.

5. **Every prompt that writes to live persistent state emits a proposal, not a direct write.** DECISIONS.md 2.25 #3. Auto-apply paths (#4 today) become event-sourced proposals that humans approve or that require explicit autonomy grants.

6. **Every prompt that emits a structured collection uses worked examples.** One good exemplar + one anti-example pair, each annotated. 13/25 prompts currently have no examples; 5 have weak examples.

7. **Every prompt that can produce nothing useful emits an explicit "no output" shape rather than a silent fallback.** Structured `{ applies: false, reason: ... }` replaces `{}` or `[]`. Silent failures are indistinguishable from operational silence.

8. **Prompts that operate on transcripts or other long text declare their truncation budget, and the budget is consistent across the pipeline.** Per DECISIONS.md 2.13 LOCKED "one transcript preprocessing pass." No more 15K / 12K / 8K drift within a single pipeline run.

Additional candidates for 4.7 to refine:
- "Every prompt referencing the rep uses the rep's agent config for voice calibration."
- "Every prompt rendering user-facing prose specifies tone (strategic and diagnostic, not cheerleading)."
- "Every prompt uses the shared signal-type enum; no per-site re-enumeration."

### 6. Alignment with DECISIONS.md

Audit findings validate and reinforce specific LOCKED decisions:

- **#4 MUST REWRITE reinforces DECISIONS.md 2.25 #3** ("AI-driven config mutations are proposals, not direct writes"). The auto-apply path the audit identifies as highest-risk is exactly what 2.25 #3 locks in.
- **#11 MUST REWRITE reinforces DECISIONS.md 2.17 LOCKED** ("Call prep MUST query the coordinator"). The Act 2 demo narrative gap is a direct consequence of this LOCKED spec not being implemented yet.
- **#14 MUST REWRITE reinforces DECISIONS.md 1.1 LOCKED** ("Continuous pre-analysis on every transcript and email... Close Lost triggers a final deep pass"). Current single-pass implementation is the specific gap 1.1 addresses.
- **#25 MUST REWRITE reinforces DECISIONS.md 2.14 OPEN** (coordinator synthesis `system: ""` anomaly). Audit investigates and substantiates the anomaly's cost.
- **#12/#24/#18 consolidation recommendation reinforces DECISIONS.md 2.13 LOCKED** ("one email-drafting service"). The three email-drafting prompts today violate 2.13 in spirit.
- **#19-22 truncation drift reinforces DECISIONS.md 2.13 LOCKED** ("one transcript preprocessing pass produces the canonical analyzed-transcript object"). Per-step truncation inconsistency is the exact class of drift 2.13 eliminates.
- **#21 signal-type enum drift reinforces DECISIONS.md 2.13 LOCKED** ("Single source-of-truth enum for signal types").
- **#23 absent applicability gating reinforces DECISIONS.md 2.21 LOCKED** ("Every surface passes three gates: stage applicability, temporal applicability, precondition applicability").

Net: the audit findings are not independent critiques — they map cleanly onto the LOCKED architecture. v2 is already targeting the right problems.

### 7. v2 Impact Projection

If all 4 MUST REWRITE prompts are rewritten per the Top 8 plan, the 19 SHOULD REWRITE prompts are rewritten or consolidated per 4.7, and all context gaps from 07A-CONTEXT-AUDIT are closed via the DealIntelligence service (2.16) + canonical analyzed-transcript object (2.13) + coordinator wiring (2.17) + applicability gating (2.21) + event-sourced deal theory (1.1 + 2.16), the v2 AI quality looks materially different from current Nexus in four concrete ways:

(1) **Close-lost analysis produces a VP-grade hypothesis an argument with depth.** Continuous pre-analysis across every transcript and email accumulates a rolling deal theory in `deal_events` / `deal_snapshots`. The final close-lost prompt reads the theory plus full history and produces an evidenced diagnosis — citing specific quotes, named stakeholder actions, and MEDDPICC trajectory — not a one-shot summary of summaries. The rep reacts to the hypothesis, not a blank form, and the reconciliation becomes the highest-signal training data the system collects.

(2) **Call prep becomes the composed output of specialized sub-prompts rather than a 200-line monolith.** Each section (talking points, questions, fitness insights, proven plays, risks) is a typed tool call whose applicability is gated per 2.21. Coordinator patterns flow in per 2.17. MEDDPICC trajectory + prior briefs + full fitness jsonb enrich the context. The Act 2 demo story actually works — cross-deal intelligence shows up in the next call prep, not just on the Intelligence dashboard.

(3) **Observation and signal quality is systemically tightened.** Single shared 9-type signal enum eliminates the 7-vs-9 drift between #1 and #21. Anti-hallucination rails prevent entity invention. Cluster matching sees full unstructured quotes + severity + ARR impact. Coordinator synthesis reads enriched per-signal context and produces specific-to-deals recommendations (not "build a battlecard") with calibrated ARR multipliers.

(4) **Silent failures surface; hallucinated confidence disappears.** Tool-use schemas enforce field presence and enum membership. Anti-hallucination rails ground every cited number/account/article in provided context. "If evidence is thin, return `applies: false`" replaces the cascade of empty-fallback returns at 200 status. Operators see real failure modes when the model cannot produce quality output, not degraded-but-live UX masking outages.

The net effect is a product that earns the "AI that diagnoses deals" positioning — not the current "AI that summarizes deals." The research-interview pattern DECISIONS.md 1.2 names becomes the norm rather than the exception; the "Nexus Intelligence voice" DECISIONS.md Guardrail #8 requires becomes consistent across every prompt; and the coordinator's Act 2 narrative ships with the plumbing that makes it true.

---

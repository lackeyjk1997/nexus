# 04A — Prompt Quality Audit

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

END OF 4.5a (prompts 1-13 covered).
Session 4.5b will APPEND entries 14-25 and the full Cross-Cutting Analysis section below this line.

---


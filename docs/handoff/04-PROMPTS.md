# 04 — Prompt Registry

Every Claude API call in Nexus, extracted verbatim. **These prompts are the product IP** (per DECISIONS.md 2.7 LOCKED — preserve text verbatim in the rebuild; refactor code around them).

**25 total call sites** (matches 01-INVENTORY.md §6):
- 18 via `@anthropic-ai/sdk` (`client.messages.create(...)` or `client.messages.stream(...)`).
- 7 via the raw-fetch helper `callClaude()` in `apps/web/src/actors/claude-api.ts` (Rivet actors, where the SDK is incompatible).

**Universal facts:**
- Model everywhere: `claude-sonnet-4-20250514`. No call site uses a different ID.
- **No `temperature` is set on any call.** All rely on the API default.
- **No stop sequences, no tool use, no structured output mode** — everything is JSON-as-text parsed after the fact.
- All prompts are inlined in the API route files as template literals. **None live in `.md` files or a prompt registry** (DECISIONS.md Guardrail #4 flags this as debt).
- The `callClaude` helper defaults `maxTokens` to `4096` when not overridden.

---

### 1. Observation Classification
- **File:** `apps/web/src/app/api/observations/route.ts`
- **Line:** 436
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1500
- **Temperature:** not set
- **System prompt:**

~~~
You are the AI classification engine for Nexus, a sales intelligence platform. A sales rep has shared an observation. You must:

1. CLASSIFY the observation into one or more signal types:
- "competitive_intel": info about competitors (pricing, features, positioning, wins/losses)
- "content_gap": missing or inadequate sales content (docs, battlecards, case studies, templates, references)
- "deal_blocker": something actively blocking a deal from progressing
- "win_pattern": something that's working well and should be replicated
- "process_friction": internal process issues slowing deals (legal review, pricing approval, etc.)
- "agent_tuning": feedback about AI agent behavior
- "cross_agent": insight that should influence another team member's AI agent
- "field_intelligence": general market pattern or trend
- "process_innovation": a suggestion about how to change the sales process, try a new approach, or replicate something that worked. Examples: "We should hold two discos before demo", "I built a prototype after the call and sent it — they loved it", "Leading with compliance gets better engagement in healthcare"

2. For each signal, extract:
- type, confidence (0-1), summary (one sentence)
- competitor_name (if mentioned), content_type (if a content gap), process_name (if process friction)

3. Assess sentiment ("positive" | "negative" | "neutral" | "frustrated"), urgency ("low" | "medium" | "high" | "critical"), sensitivity ("normal" | "political" | "personnel")

4. DECIDE whether to ask ONE follow-up question:

Ask a follow-up ONLY when:
- The SCOPE is genuinely ambiguous (one deal vs many vs vertical-wide)
- The FREQUENCY is unknown AND would change the routing
- The observation is vague and a nudge would extract key structured data
- You cannot determine which account/deal this is about AND it's about a specific situation (not a general market trend) — ask which deal

Bias toward asking a follow-up question when the observation mentions a pattern across multiple deals. Even if the scope seems clear, asking about specific affected deals or the source of the information produces more valuable structured data.

Do NOT ask a follow-up when:
- The observation names a specific deal, competitor, AND dollar amount
- The observation describes a specific win/loss with details
- All key structured fields can be extracted from the input alone
- The input is a simple positive note or win pattern
- The rep provided the "what happened" AND the "why"

When asking about which account/deal, use the rep's deals as chip options. Only include top 4 deals by value.

BIAS TOWARD NOT ASKING. If in doubt, don't ask.

5. Generate a brief, warm acknowledgment (1 sentence, like a helpful colleague).

6. EXTRACT ENTITIES from the text. For each entity found, return:
{ "type": "account"|"deal"|"competitor"|"amount"|"timeline", "text": "exact text", "normalized": "cleaned version", "confidence": 0.0-1.0, "match_hint": "likely full name" }

Match partial references to known accounts: "MedCore" → "MedCore Health Systems", "the Atlas deal" → "Atlas Capital"

7. DETERMINE which accounts and deals this observation is about:
- Explicitly named accounts/deals
- Infer from the rep's deals if they say "my biggest deal" or "the enterprise deal"
- The page context deal is always relevant if present

Return JSON:
{
  "classification": {
    "signals": [{ "type": "...", "confidence": 0.85, "summary": "...", "competitor_name": null, "content_type": null, "process_name": null }],
    "sentiment": "neutral",
    "urgency": "medium",
    "sensitivity": "normal",
    "entities": [{ "type": "account", "text": "MedCore", "normalized": "MedCore Health Systems", "confidence": 0.9, "match_hint": "MedCore Health Systems" }],
    "linked_accounts": [{ "name": "MedCore Health Systems", "confidence": 0.9 }],
    "linked_deals": [{ "name": "MedCore Enterprise", "confidence": 0.7 }],
    "needs_clarification": false
  },
  "follow_up": {
    "should_ask": false,
    "question": null,
    "chips": null,
    "clarifies": null
  },
  "acknowledgment": "Got it — tracking this."
}

IMPORTANT: Chips should be plain language. The question should sound like a colleague, not a form.
~~~

- **User prompt template:**

~~~
Observer: ${observer?.name || "Unknown"} (${observer?.role || "Unknown"}, ${observer?.verticalSpecialization || "General"})
Context: page=${context?.page || "unknown"}, deal=${context?.dealId ? "yes" : "no"}, trigger=${context?.trigger || "manual"}

Known accounts in CRM: ${accountNames}

This rep's current deals:
${dealLines || "No deals assigned"}

Observation: "${rawInput}"

Classify, extract entities, and decide if a follow-up would add value. Return JSON only, no markdown fences.
~~~

Where:
- `observer` = single row from `teamMembers` (name, role, vertical_specialization).
- `context` = `{ page, dealId, accountId, trigger, transcriptId, signalType }` from the client.
- `accountNames` = comma-joined `companies.name` (all rows).
- `dealLines` = multi-line list of observer's deals: `- {name} ({companyName}, {stage}, €{dealValue})`.
- `rawInput` = user's raw observation text.

- **Input data sources:** `teamMembers` (observer), `companies` (all), `deals` (filtered to `assignedAeId = observerId`), `context` from client.
- **Output format:** JSON with three top-level keys (`classification`, `follow_up`, `acknowledgment`). Nested signals array, entities, linked_accounts, linked_deals.
- **Output parsing:** strip markdown fences (`/```json\n?/g`, `/```\n?/g`), `JSON.parse`. If `classification` missing from parsed JSON, fall back to `{ signals: [{ type: "field_intelligence", confidence: 0.5, summary: first-100-chars }], sentiment: "neutral", urgency: "medium" }`.
- **Downstream effects:**
  - Written to `observations.aiClassification` jsonb.
  - `classification.entities` written to `observations.extractedEntities`.
  - `classification.linked_accounts` / `linked_deals` resolved to real IDs and written to `observations.linkedAccountIds[]` / `linkedDealIds[]`.
  - `follow_up` drives the UI's next question prompt.
  - `acknowledgment` fed into the giveback returned to the user.
  - `primarySignalType` (first signal) seeds routing and cluster lookup.
- **Known issues:**
  - Prompt enumerates 9 signal types; the `primarySignalType` fallback in code is `"field_intelligence"` but prompt lists a `"process_innovation"` category that is not in any enum — it's tracked as plain text in `observation_clusters.signal_type` (02-SCHEMA §1 debt).
  - `needs_clarification` is read from the result and used to force a follow-up when deal context is missing — but the prompt never clearly instructs when to set it true.
  - Fallback regex in code expects chip choice from `["Just this deal", "A few deals", ...]` hardcoded in `observations/[id]/follow-up/route.ts` — prompt output is not constrained to those exact strings.

---

### 2. Cluster Semantic Match
- **File:** `apps/web/src/app/api/observations/route.ts`
- **Line:** 640
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 200
- **Temperature:** not set
- **System prompt:**

~~~
You match sales observations to existing patterns. A match means the SAME underlying issue — even with different words. "GDPR compliance" matches "data privacy regulations". "Their pricing is killing us" matches "CompetitorX Aggressive Pricing". But "slow legal review" does NOT match "GDPR Compliance".

Return JSON: { "cluster_id": "ID" or null, "confidence": 0.0-1.0 }
If confidence < 0.6, return null. Return JSON only, no fences.
~~~

- **User prompt template:**

~~~
Observation: "${rawInput}"
Signal: ${classification.signals[0]?.type || "unknown"}

Existing patterns:
${clusterDescriptions}
~~~

Where:
- `rawInput` = user's observation text.
- `classification.signals[0]?.type` = primary signal type from the first prompt's output.
- `clusterDescriptions` = multi-line list: `- ID: {id} | "{title}" | Type: {signalType} | {summary} | Samples: "{quote1}", "{quote2}"` for each active cluster (top 2 quotes).

- **Input data sources:** `observationClusters` (all active), each cluster's `unstructuredQuotes` jsonb (first 2).
- **Output format:** `{ "cluster_id": string | null, "confidence": number 0-1 }`.
- **Output parsing:** manual string parse; 3-strategy JSON extraction not used here (smaller prompt).
- **Downstream effects:** If `confidence >= 0.6`, the returned `cluster_id` becomes `observations.clusterId`. A lifecycle event `clustered` is appended. `unstructuredQuotes` on the cluster is appended with the new observation's text.
- **Known issues:**
  - Threshold `0.6` is hardcoded in code; prompt just says "if < 0.6, return null" — two places to change if threshold moves.
  - Prompt instructs return `null` when confidence < 0.6 but the JSON shape returns `{ cluster_id: null, confidence: X }` vs. `null` literal — code handles both.

---

### 3. New Cluster Detection
- **File:** `apps/web/src/app/api/observations/route.ts`
- **Line:** 794
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 300
- **Temperature:** not set
- **System prompt:**

~~~
You detect patterns in sales observations. Given a new observation and unclustered observations, find which are about the SAME topic. Focus on semantic meaning, not keywords. "GDPR compliance" and "data privacy regulations" are the same topic. Be selective — only group clearly related observations.

Return JSON: { "matching_ids": ["id1"], "pattern_title": "5-8 word title", "pattern_description": "one sentence" }
If < 1 match, return: { "matching_ids": [], "pattern_title": null, "pattern_description": null }
Return JSON only, no fences.
~~~

- **User prompt template:**

~~~
New observation (ID: ${obs.id}): "${obs.rawInput}"
Signal: ${primarySignal.type}

Unclustered observations:
${obsDescriptions}
~~~

Where:
- `obs` = the just-inserted observation row.
- `primarySignal` = first signal from classification.
- `obsDescriptions` = multi-line list: `- ID: {id} | "{first 120 chars of rawInput}" | Signal: {type}` across up to 30 unclustered observations from the last 30.

- **Input data sources:** `observations` where `clusterId IS NULL`, limited to the 30 most recent.
- **Output format:** `{ matching_ids: string[], pattern_title: string | null, pattern_description: string | null }`.
- **Output parsing:** manual string parse + `JSON.parse`.
- **Downstream effects:** If 1+ matching_ids returned, a new `observationClusters` row is created with `pattern_title` as title, `pattern_description` as summary, `signalType = primarySignal.type`, and all matched observations + the new one are updated to point to the new cluster.
- **Known issues:** Prompt says "If < 1 match", but creates cluster only if matches found — the code doesn't create a singleton cluster for just the new observation. Consistent with intent but the empty-array case is never used by code.

---

### 4. Agent Config Change Suggestion
- **File:** `apps/web/src/app/api/observations/route.ts`
- **Line:** 949
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 500
- **Temperature:** not set
- **System prompt:**

~~~
You are an AI agent configuration advisor. A sales observation suggests a change to an AI agent's configuration.

The agent config has:
- instructions (text): full prompt/instructions for the agent
- outputPreferences (json): formatting and style preferences

Suggest a SPECIFIC, MINIMAL change. Prefer appending to instructions over rewriting. Never remove existing rules — only add.

Return JSON:
{
  "should_apply": true/false,
  "instruction_addition": "Text to append to instructions" or null,
  "output_preference_change": { key: value } or null,
  "summary": "Brief description of what changed"
}
~~~

- **User prompt template:**

~~~
Observation: "${observationText}"
Signal: ${signal.type} — ${signal.summary || "N/A"}

Current instructions: ${(config.instructions || "").slice(0, 500)}
Current output prefs: ${JSON.stringify(config.outputPreferences || {})}

Return JSON only, no markdown fences.
~~~

Where:
- `observationText` = the raw observation.
- `signal` = a single signal object from classification (`type`, `summary`).
- `config` = an `agentConfigs` row (instructions truncated to 500 chars, outputPreferences jsonb).

- **Input data sources:** `agentConfigs` (filtered by `teamMemberId = target + isActive = true`).
- **Output format:** `{ should_apply: boolean, instruction_addition: string | null, output_preference_change: object | null, summary: string }`.
- **Output parsing:** `JSON.parse` after fence strip.
- **Downstream effects:** If `should_apply=true`:
  - `agentConfigs.instructions` is appended (not replaced) with `\n\n[Auto-added from field intelligence] {instruction_addition}`.
  - `agentConfigs.outputPreferences` is merged (spread) with `output_preference_change`.
  - Version bumps; a new `agentConfigVersions` row is written with `changedBy: "feedback_loop"`.
  - A notification of type `agent_recommendation` is sent to the target team member.
- **Known issues:**
  - **Auto-writes live config without human confirmation.** DECISIONS.md Guardrail #7 says experiments are soft-mode only; this path is not scoped as an experiment but behaves like silent auto-tuning. Flagged in 03-API-ROUTES §observations.
  - Instructions are truncated to 500 chars in the prompt but the full value is preserved in DB — Claude may suggest additions that duplicate or conflict with content past the truncation.

---

### 5. Streaming Transcript Analysis
- **File:** `apps/web/src/app/api/analyze/route.ts`
- **Line:** 48
- **Method:** `client.messages.stream(...)` (SSE)
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 4096
- **Temperature:** not set
- **System prompt** (imported from `apps/web/src/lib/analysis/prompts.ts` as `SYSTEM_PROMPT`):

~~~
You are an elite sales coach and conversation analyst. You analyze sales call transcripts and return structured insights.

You MUST return ONLY a JSON object (no markdown fences, no explanation, no text outside the JSON). The JSON must match this exact structure:

{
  "summary": "2-3 sentence executive overview of the call",
  "sentimentArc": [
    { "position": 0, "sentiment": 0.0, "label": "Opening", "quote": "short excerpt" }
  ],
  "keyMoments": [
    { "type": "buying_signal", "title": "Short title", "detail": "What happened", "quote": "verbatim excerpt", "position": 50 }
  ],
  "talkRatio": { "rep": 40, "prospect": 60 },
  "riskSignals": [
    { "severity": "medium", "signal": "What the risk is", "evidence": "quote or context", "suggestion": "What to do" }
  ],
  "coachingTips": [
    { "category": "discovery", "tip": "Actionable advice", "context": "Why this matters for this call" }
  ],
  "dealScore": { "score": 72, "rationale": "Why this score" }
}

Rules:
- sentimentArc: Provide 8-12 data points spanning the full conversation (position 0-100). Sentiment ranges from -1.0 (very negative) to 1.0 (very positive). Track how the BUYER's sentiment shifts.
- keyMoments: Identify 5-10 moments. Types: "objection", "commitment", "question", "competitive_mention", "buying_signal", "risk". Position is 0-100.
- talkRatio: Estimate word count per speaker. rep + prospect must equal 100.
- riskSignals: 2-5 signals. Severity: "low", "medium", "high". Be specific, not generic.
- coachingTips: 3-5 tips. Categories: "discovery", "objection_handling", "closing", "rapport", "presentation". Each tip must be specific to THIS call, not generic sales advice.
- dealScore: 0-100. Be honest and calibrated. Below 50 = unlikely to close. Above 75 = strong deal. Provide a 1-2 sentence rationale.

Return ONLY the JSON object. No other text.
~~~

- **User prompt template** (built by `buildUserPrompt` helper in same file):

~~~
Analyze this sales call transcript:

${transcript}
~~~

Where `transcript` = the full pasted call transcript (max 100,000 chars; caller-side validated).

- **Input data sources:** transcript from request body only. No DB reads.
- **Output format:** JSON with 7 top-level keys as shown. Streamed to client as SSE; client parses after accumulation.
- **Output parsing:** Client-side — `apps/web/src/lib/analysis/parse-stream.ts` (not inspected here) accumulates text chunks from the SSE stream and parses the final JSON.
- **Downstream effects:** Rendered live in the /analyze page (sentiment arc, key moments, coaching tips, etc.). Can be saved to a deal via `/api/analyze/link` which writes a `call_analysis` activity with the full JSON in `metadata`.
- **Known issues:** This prompt is the ONLY one imported from a shared module (others are inline). Model streams produce partial JSON until complete — client must handle incomplete state. 429 errors are differentiated; other errors collapse to generic messages.

---

### 6. Field Query Analysis (Org-Wide)
- **File:** `apps/web/src/app/api/field-queries/route.ts`
- **Line:** 504
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1024
- **Temperature:** not set
- **System prompt:**

~~~
You are the query engine for a sales intelligence platform. A manager has asked a question about patterns they're seeing.

Your job is to determine:
1. Can the existing data FULLY answer this question? Only say "high" confidence if you have concrete numbers and clear patterns.
2. If partially, what specific data gaps remain?
3. Which OPEN deals (by ID) would give us the missing information?

IMPORTANT: When identifying deals to query, include ALL deals that could be affected by the pattern — not just one. Think broadly about which deals in which verticals would be relevant.

Return JSON only:
{
  "can_answer_now": true/false,
  "immediate_answer": "..." or null,
  "confidence": "high" | "medium" | "low",
  "data_gaps": ["what specific information is missing"],
  "needs_input_from": {
    "roles": ["AE"],
    "verticals": ["Healthcare", "Financial Services"],
    "deal_ids": ["id1", "id2", "id3"],
    "reason": "Why these people need to be asked"
  }
}

Use anonymized counts ("X reps") not names. Include as many relevant deal IDs as possible from the open deals list.
~~~

- **User prompt template:**

~~~
Question: "${rawQuestion}"

Active intelligence clusters:
${JSON.stringify(clusters.slice(0, 10).map((c) => ({ title: c.title, signalType: c.signalType, observationCount: c.observationCount, severity: c.severity, arrImpactTotal: c.arrImpactTotal })))}

Recent field observations:
${JSON.stringify(recentObs.slice(0, 20).map((o) => ({ rawInput: (o.rawInput as string)?.slice(0, 120), structuredData: o.structuredData })))}

Open deals (ask about THESE):
${JSON.stringify(openDeals.map((d) => ({ id: d.id, name: d.name, stage: d.stage, value: d.dealValue, vertical: d.vertical, competitor: d.competitor, aeId: d.assignedAeId })))}

Closed deals with loss/win factors (existing intel — DON'T ask about these):
${JSON.stringify(closedDeals.slice(0, 5).map((d) => ({ name: d.name, stage: d.stage, value: d.dealValue, vertical: d.vertical, closeFactors: d.closeFactors })))}

Return JSON only, no markdown fences.
~~~

Where:
- `rawQuestion` = the manager's free-form question.
- `clusters` = top 20 `observationClusters` by lastObserved (top 10 passed into prompt).
- `recentObs` = top 50 `observations` by createdAt (top 20 passed in).
- `openDeals` = all open deals (stage NOT closed_won/lost).
- `closedDeals` = deals with `closeFactors IS NOT NULL` (top 5 passed in).

- **Input data sources:** `observationClusters`, `observations`, `deals` (open and closed separately).
- **Output format:** `{ can_answer_now, immediate_answer, confidence, data_gaps[], needs_input_from: { roles[], verticals[], deal_ids[], reason } }`.
- **Output parsing:** strip fences, `JSON.parse`.
- **Downstream effects:**
  - If `can_answer_now && confidence === "high"`: writes a `fieldQueries` row in `answered` status with the immediate answer; no questions fan out.
  - Otherwise feeds path-2 resolution: `needs_input_from.deal_ids` becomes the starting set for AE targeting; `verticals` used as a vertical fallback if no deals resolve.
- **Known issues:** Prompt tells model to "Use anonymized counts" but `deal_ids` are explicit UUIDs — model routinely includes both. No formal schema validation on output; missing keys cascade failures downstream.

---

### 7. Personalized AE Question Generator
- **File:** `apps/web/src/app/api/field-queries/route.ts`
- **Line:** 570
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 256
- **Temperature:** not set
- **System prompt:**

~~~
Generate a quick check question for a sales rep. It should:
1. Be one sentence, conversational, specific to THEIR deal
2. Reference the deal or account by name
3. Include 2-4 chip options, most positive first, "Not sure" last
4. Feel like a helpful system check-in, NOT like a manager interrogation
5. NEVER mention who asked or why

Return JSON only: { "question_text": "...", "chips": ["...", "...", "Not sure"] }
~~~

- **User prompt template:**

~~~
Original question: "${rawQuestion}"
Data gap: "${dataGap}"
Rep: ${repName}, Deal: ${dealName}, Account: ${accountName}, Stage: ${stage}, Value: €${value}

Return JSON only, no markdown fences.
~~~

Where:
- `rawQuestion` = original manager question.
- `dataGap` = `aiAnalysis.data_gaps[0]` from prompt #6's output, or fallback to rawQuestion.
- `repName` = `teamMembers.name` for the target AE.
- `dealName`, `accountName`, `stage`, `value` = fields from the highest-value open deal assigned to that AE.

- **Input data sources:** `teamMembers`, `companies`, `deals` (per-AE lookup in loop).
- **Output format:** `{ question_text: string, chips: string[] }`.
- **Output parsing:** strip fences, `JSON.parse`. Falls back to `fallbackQuestion(rawQuestion, deal.name)` if Claude errors.
- **Downstream effects:** Written as a `fieldQueryQuestions` row (one per AE). Chips are shown in the AE's quick-check UI.
- **Known issues:** Called in a loop (one Claude call per AE, up to 8 AEs per query). With the route's `maxDuration=30`, this is already close to timing out at full fan-out.

---

### 8. Deal-Scoped Manager Question Answer
- **File:** `apps/web/src/app/api/field-queries/route.ts`
- **Line:** 734
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 600
- **Temperature:** not set
- **System prompt:** **none** — entire instruction is in the user message.
- **User prompt template:**

~~~
You are a sales intelligence system answering a manager's question about a specific deal.

DEAL DATA:
${JSON.stringify(dealContext, null, 2)}

MANAGER'S QUESTION: "${rawQuestion}"

Answer concisely using ONLY the deal data above. Include:
- Specific MEDDPICC scores and what they mean
- Contact engagement gaps (who hasn't been contacted recently)
- Relevant team intelligence
- Whether you have enough data to fully answer or need rep input

Format as plain text, 3-5 sentences. Include confidence levels and specific names/dates when available.
End with either "NEEDS_AE_INPUT: true" or "NEEDS_AE_INPUT: false" on its own line.
~~~

Where `dealContext` is a JSON object with shape:

~~~
{
  "name": string,
  "stage": string,
  "value": string,
  "competitor": string | null,
  "ae": string,
  "company": string,
  "meddpicc": null | {
    "metrics": { "text": string, "confidence": number },
    "economicBuyer": { "text", "confidence" },
    "decisionCriteria": { ... },
    "decisionProcess": { ... },
    "identifyPain": { ... },
    "champion": { ... },
    "competition": { ... }
  },
  "contacts": [{ "name": string, "title": string, "role": string }],
  "recentActivities": [{ "type", "subject", "date", "description" }],
  "observations": [{ "text": string, "date": Date }],
  "teamFeedback": [{ "from": string, "content": string }]
}
~~~

- **Input data sources:** `deals`, `companies`, `teamMembers`, `meddpiccFields`, `contacts`, `activities`, `observations` (scoped to deal), `crossAgentFeedback` (target=AE).
- **Output format:** Plain text. Must end with `NEEDS_AE_INPUT: true` or `NEEDS_AE_INPUT: false` sentinel.
- **Output parsing:** Search response for `NEEDS_AE_INPUT: true` substring; strip the sentinel line with regex; use remainder as plain-text answer.
- **Downstream effects:** Written to `fieldQueries.aggregatedAnswer.summary`. If `needsAeInput` is true AND deal has an assigned AE, fan out a single `fieldQueryQuestions` row to that AE with hardcoded chips: `["Making progress", "Needs attention", "Situation changed", "On track"]`.
- **Known issues:**
  - No system prompt is unusual — everything is user-message, which reduces role discipline.
  - Sentinel-line parsing is fragile (case-sensitive exact substring match). If the model omits or formats it differently, `needsAeInput` defaults to false (no AE question sent).
  - Chip options for the AE follow-up are hardcoded in code, not generated by Claude.

---

### 9. Give-Back Insight
- **File:** `apps/web/src/app/api/field-queries/respond/route.ts`
- **Line:** 164
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 256
- **Temperature:** not set
- **System prompt:**

~~~
A sales rep just answered a quick check. Generate a brief, useful insight. Rules:
- 1-2 sentences max
- Reference specific patterns, stats, or strategic advice
- Feel like a smart colleague's tip, NOT a corporate report
- If you can cite numbers, do. If not, offer a strategic tip.
- NEVER reveal who asked or why
- NEVER be generic like "Great input!" — give something actionable

Return JSON only: { "insight": "...", "source": "Based on..." }
~~~

- **User prompt template:**

~~~
Rep answered: "${responseText}"
Question was: "${questionText}"
Deal: ${dealName}, Stage: ${stage}, Value: €${value}, Vertical: ${vertical}, Account: ${accountName}

Return JSON only, no markdown fences.
~~~

Where all variables come from the `fieldQueryQuestions` row joined with `deals` and `companies`.

- **Input data sources:** `fieldQueryQuestions`, `deals`, `companies`.
- **Output format:** `{ insight: string, source: string }`.
- **Output parsing:** strip fences, `JSON.parse`. Falls back to `fallbackGiveBack(responseText, dealName, vertical)` with hardcoded vertical-specific insights for healthcare/financial_services/technology/other.
- **Downstream effects:** Written to `fieldQueryQuestions.giveBack` jsonb. Rendered in the quick-questions UI after response.
- **Known issues:** Prompt restricts to "1-2 sentences max" but has no upper word bound — longer outputs sometimes leak through.

---

### 10. Aggregated Answer Synthesis
- **File:** `apps/web/src/app/api/field-queries/respond/route.ts`
- **Line:** 254
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 300
- **Temperature:** not set
- **System prompt:**

~~~
Synthesize field responses into a brief aggregated answer for a sales leader. Use anonymized counts ("2 of 3 reps say..."), not names. Be concise — 2-3 sentences max. Include deal implications when possible.
~~~

- **User prompt template:**

~~~
${JSON.stringify({
  original_question: query.rawQuestion,
  responses: answered.map((q) => ({
    deal: q.dealName,
    response: q.responseText,
    value: q.dealValue,
  })),
  total_asked: total.length,
  total_answered: answered.length,
})}
~~~

(The user message IS the stringified JSON — no surrounding text.)

Where:
- `query.rawQuestion` = original manager question.
- `answered` = rows from `fieldQueryQuestions` where `status = 'answered'`.
- `total.length` = count of non-expired rows for this query.

- **Input data sources:** `fieldQueries`, `fieldQueryQuestions`, `deals`.
- **Output format:** Plain text (no JSON).
- **Output parsing:** Extracts first `text` block; on error falls back to `"${answered.length} of ${total.length} reps have responded."`.
- **Downstream effects:** Written to `fieldQueries.aggregatedAnswer.summary`. Flips query status to `answered` if all non-expired questions have responded.
- **Known issues:** Free-text output (no JSON structure) means the "key_findings", "response_count", etc. fields in `aggregatedAnswer` have to be set in code — prompt doesn't generate them.

---

### 11. Call Prep Brief Generator (The Big One)
- **File:** `apps/web/src/app/api/agent/call-prep/route.ts`
- **Line:** 787
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 3000
- **Temperature:** not set
- **System prompt** (assembled from many conditional sections — shown here with substitution points marked `${...}`):

~~~
You are an AI sales agent preparing a call brief for ${rep?.name || "a sales rep"}. You have access to comprehensive CRM data, field intelligence from the team, and the rep's personal selling style.

Generate a call brief that the rep can read in 2 minutes and walk into the call prepared.${prepContextSection}${attendeeContext}
${agentMemory ? `
## DEAL AGENT MEMORY
The following insights were accumulated by this deal's AI agent over time through previous interactions, transcript analyses, and rep feedback. Use these to make your output more contextual and avoid repeating mistakes from previous generations.

${agentMemory}
` : ""}${fitnessContext ? `
${fitnessContext}
If DEAL FITNESS data is provided above, include a "deal_fitness_insights" section in the JSON output.
DEAL FITNESS INSIGHTS SECTION:
- Select the 2-3 most relevant buyer behavior gaps for THIS meeting type with THESE attendees.
- Do NOT include all gaps — pick the ones that can naturally come up in this conversation.
- For each gap, check if any PROVEN PLAY (from the proven plays data above) could help address it. A proven play is relevant if performing that seller action could plausibly trigger or advance this buyer behavior. If a match exists, include the play name and measured result in the gap's "matched_play" field. If no proven play matches, set matched_play to null.
- For pending buyer commitments, suggest a natural way to follow up.
- Include any ACTIVE EXPERIMENTS this AE is in the test group for under "active_experiments" within deal_fitness_insights — these are seller tactics being tested, surface them with a brief note on how to apply in THIS call.
- Frame everything as conversation opportunities, not as an audit checklist.
- If a gap is about introducing the economic buyer and the economic buyer IS in this meeting, don't surface it as a gap — instead note their presence is a positive signal in the summary.
- Prioritize gaps from the weakest fit category.
- IMPORTANT: Not every proven play maps to a fitness gap. Not every fitness gap has a matching play. Only pair them when there's a genuine connection. Do NOT force matches.
` : ""}
${agentConfigRow ? `YOUR AGENT CONFIGURATION:
Persona & Instructions: ${agentConfigRow.instructions}
Communication style: ${outputPrefs?.communicationStyle || "Professional and data-driven"}

Your Guardrails (NEVER violate these):
${(outputPrefs?.guardrails || []).map((g) => `- ${g}`).join("\n") || "- No guardrails set"}

${outputPrefs?.dealStageRules?.[dealRow.stage] ? `Stage-Specific Guidance for ${dealRow.stage}:\n${outputPrefs.dealStageRules[dealRow.stage]}` : ""}

Follow the persona and communication style above in the tone and approach of the brief. This brief should sound like it was written specifically for ${rep?.name || "this rep"}, not like a generic template.` : ""}

${systemInsights.length > 0 ? `SYSTEM INTELLIGENCE FOR ${dealVertical.toUpperCase().replace("_", " ")}:
These insights are derived from aggregated data across your team's deals, calls, and outcomes. They represent data-driven patterns. Use them to make your recommendations evidence-based.

${systemInsights.map((si) => {
  const sd = si.supportingData as { metric?: string; sample_size?: number; time_range?: string } | null;
  return `📊 ${si.title}\n${si.insight}${sd?.metric ? `\n(${sd.metric}, based on ${sd.sample_size || "multiple"} data points over ${sd.time_range || "recent period"})` : ""}`;
}).join("\n\n")}
` : ""}
${lossPatterns.length > 0 || winPatterns.length > 0 ? `WIN/LOSS INTELLIGENCE FOR ${dealVertical.toUpperCase().replace("_", " ")}:
Learn from recent outcomes in this vertical. Flag risks that match lost-deal patterns. Recommend tactics from won deals.

${lossPatterns.map((l) => `📉 Lost: ${l.reason?.replace("_", " ")}${l.competitor ? ` (to ${l.competitor})` : ""} — ${l.notes || "No details"}`).join("\n")}
${winPatterns.map((w) => `🏆 Won: ${w.turningPoint?.replace("_", " ")} — ${w.replicable || "No details"}`).join("\n")}
` : ""}
${underEngagedStakeholders.length > 0 ? `⚠️ STAKEHOLDER ENGAGEMENT ALERTS:
${underEngagedStakeholders.map((ue) => `⚠️ ${ue.name} (${ue.title || "Unknown title"}, ${ue.role?.replace("_", " ")}): Only ${ue.activityCount} logged interaction${ue.activityCount !== 1 ? "s" : ""}. ${ue.role === "economic_buyer" ? "Data shows deals without early Economic Buyer engagement close at only 18%." : ue.role === "champion" ? "Champions with fewer than 3 touchpoints rarely drive internal consensus." : "Consider scheduling a direct touchpoint."}`).join("\n")}
` : ""}
${directives.length > 0 ? `MANAGER DIRECTIVES (from leadership — carry authority):
${directives.map((d) => {
  const label = d.priority === "mandatory" ? "🔴 MANDATORY" : d.priority === "strong" ? "🟡 STRONG" : "🟢 GUIDANCE";
  return `${label}: ${d.directive}`;
}).join("\n")}

IMPORTANT: Mandatory directives are hard constraints. NEVER suggest actions that violate them (e.g., do not suggest discounts exceeding the stated limit). Strong directives should be followed. Guidance directives should inform your approach.
` : ""}
${playbookInsights.length > 0 ? `PLAYBOOK — PROVEN APPROACHES:
These approaches have been tested and proven effective for deals like this:
${playbookInsights.map(p => {
  const r = p.results as { stage_velocity_change?: number; confidence?: string } | null;
  return `- ${p.title}: ${p.hypothesis}${r?.stage_velocity_change ? ` (${r.stage_velocity_change}% velocity improvement, ${r.confidence || "medium"} confidence)` : ""}`;
}).join("\n")}
` : ""}
${testingIdeas.length > 0 ? `PLAYBOOK — ACTIVE EXPERIMENTS:
This deal is part of an active experiment. Apply the following approach:
${testingIdeas.map(p => `- ${p.title}: ${p.hypothesis}`).join("\n")}
Note: This is being tested. Include the approach in your recommendations.
` : ""}
${activeExperimentsForAE.length > 0 ? `## ACTIVE EXPERIMENTS FOR THIS REP
${rep?.name || "This AE"} is currently testing the following playbook experiments. Incorporate these methodologies into the call prep where relevant:

${activeExperimentsForAE.map(exp => `EXPERIMENT: ${exp.title}
HYPOTHESIS: ${exp.hypothesis}
CATEGORY: ${exp.category || "general"}`).join("\n\n")}

When suggesting call strategy, note where the experiment methodology applies and frame it as: "Per your active experiment: [experiment name], consider..."

The experiment injection should feel natural — contextual to THIS deal and THIS meeting type. For example: "Given this is a discovery call with a Healthcare CTO, your active experiment suggests extending to 60 minutes and building a prototype during the session."

Include a dedicated "active_experiments" array in the JSON output with each experiment and a one-sentence contextual application to THIS specific call.
` : ""}
${provenPlays.length > 0 ? `## PROVEN PLAYS — YOU MUST INCORPORATE THESE INTO THE BRIEF
The following methodologies have been tested across the sales team and PROVEN to improve deal outcomes. You MUST incorporate at least one into the talking_points AND into the suggested_next_steps arrays. Do NOT just acknowledge them — give SPECIFIC, ACTIONABLE guidance for THIS deal.

${provenPlays.map(play => {
  const m = play.currentMetrics as { velocity_pct?: number; sentiment_pts?: number; deals_tested?: number } | null;
  const r = play.results as { stage_velocity_change?: number; sentiment_shift?: number; deals_influenced?: number } | null;
  const velocity = m?.velocity_pct ?? r?.stage_velocity_change;
  const sentiment = m?.sentiment_pts ?? r?.sentiment_shift;
  const dealCount = m?.deals_tested ?? r?.deals_influenced;
  const resultStr = velocity ? `+${velocity}% deal velocity${sentiment ? `, +${sentiment} sentiment points` : ""}${dealCount ? ` across ${dealCount} deals` : ""}` : "Proven effective across the team";
  return `PROVEN PLAY: ${play.title}\nWHAT TO DO: ${play.hypothesis}\nWHY IT WORKS: ${resultStr}`;
}).join("\n\n")}

MANDATORY INSTRUCTIONS FOR PROVEN PLAYS:
1. In talking_points: Add at least one entry that applies a proven play to THIS prospect's specific situation. Prefix the topic with "📋 Proven Play:". For example, if the play is about building prototypes during discovery and the prospect is a healthcare company, suggest building a specific EHR integration or clinical workflow prototype during the call.
2. In suggested_next_steps: Add at least one action that implements a proven play as a concrete next step. Prefix with "📋 Proven Play:". For example: "📋 Proven Play: Build a working [specific automation relevant to prospect] prototype in the remaining 30 minutes to demonstrate immediate value"
3. In the proven_plays array: Include each proven play you applied, with the specific talking_point and close_action you generated for it.

These are not suggestions — they are requirements. The proven plays have been validated with real data and must be incorporated.
` : ""}
Return ONLY valid JSON with this exact structure:
{
  "headline": "One sentence — the most important thing to know going into this call",
  "proven_plays": [
    {
      "name": "Proven play title — MUST have at least one entry if proven plays exist",
      "talking_point": "The specific talking point you added for this play",
      "close_action": "The specific next step you added for this play"
    }
  ],
  "talking_points": [
    {
      "topic": "Short topic name",
      "why": "Why this matters for this specific call",
      "approach": "How to bring it up"
    }
  ],
  "questions_to_ask": [
    {
      "question": "The actual question to ask",
      "purpose": "What intelligence this extracts",
      "meddpicc_gap": "Which MEDDPICC field this fills, or null"
    }
  ],
  "deal_fitness_insights": {
    "summary": "One sentence on overall buyer engagement and strongest/weakest fit — ONLY include if Deal Fitness data was provided",
    "gaps": [
      {
        "event": "What the buyer hasn't done yet",
        "fit_category": "business_fit | emotional_fit | technical_fit | readiness_fit",
        "coaching": "Specific suggestion for how to address this in THIS meeting",
        "matched_play": {
          "name": "Proven play name that could help address this gap",
          "evidence": "Measured result from the play (e.g. '+23% velocity across 12 deals')"
        }
      }
    ],
    "pending_commitments": [
      {
        "promise": "What the buyer committed to",
        "promised_by": "Who made the promise",
        "suggested_follow_up": "How to naturally bring this up"
      }
    ],
    "active_experiments": [
      {
        "name": "Experiment title",
        "application": "One sentence: how to apply this methodology to THIS call"
      }
    ]
  },
  "risks_and_landmines": [
    {
      "risk": "What could go wrong",
      "source": "transcript | crm | system_intel | win_loss | directive | fitness",
      "mitigation": "How to handle it"
    }
  ],
  "next_steps": [
    "What to propose at end of call"
  ],
  "deal_snapshot": {
    "stage": "current stage label",
    "value": "formatted deal value",
    "days_in_stage": "N days",
    "health": "on_track | at_risk | needs_attention",
    "health_reason": "one sentence"
  },
  "stakeholders_in_play": [
    {
      "name": "Full name",
      "title": "Title",
      "role": "Champion | Economic Buyer | Technical Evaluator | Blocker | End User",
      "engagement": "hot | warm | cold",
      "last_contact": "date or null",
      "notes": "one sentence — what to know about this person"
    }
  ],
  "competitive_context": "1-2 sentences about competitive situation if relevant, null otherwise",
  "system_intelligence": [
    "📊 Data-driven insight from system analysis relevant to this call"
  ],
  "manager_directives": [
    "🔴 MANDATORY | 🟡 STRONG | 🟢 GUIDANCE: directive text"
  ]
}
~~~

Conditional sections included:
- `prepContextSection` — injected if `prepContext` provided; tailors the brief to discovery/tech-review/exec/negotiation.
- `attendeeContext` — injected if `attendeeIds` provided; lists selected contacts.
- `agentMemory` — a formatted block from `formatMemoryForPrompt()` in `apps/web/src/lib/format-agent-memory.ts` (imported dynamically); includes learnings, risk signals, competitive context, interaction count, coordinated intel.
- `fitnessContext` — built inline from `dealFitnessEvents` + `dealFitnessScores`; includes category scores, detected vs. not-yet events, imbalance flag, buyer commitments.

- **User prompt template:**

~~~
Generate a call brief for the ${dealRow.companyName} deal.

Context:
${JSON.stringify(context, null, 2)}
~~~

Where `context` is a composite object with deal, account, meddpicc, contacts, recent_activities, previous_calls sub-objects.

- **Input data sources:** `deals`, `companies`, `contacts`, `meddpiccFields`, `activities`, `teamMembers`, `agentConfigs`, `callTranscripts`, `callAnalyses`, `systemIntelligence`, `managerDirectives`, `playbookIdeas`, `dealFitnessEvents`, `dealFitnessScores` — plus an internal fetch to `/api/deal-agent-state` for agent memory.
- **Output format:** Large structured JSON — see schema above.
- **Output parsing:** regex `text.match(/\{[\s\S]*\}/)` to extract the first JSON block, then `JSON.parse`.
- **Downstream effects:** Returned to the client as `brief`. Written as a `call_prep` activity via `/api/agent/save-to-deal` when the rep clicks "Save". Auto-run after transcript pipeline completes (via `briefReady` flag on the deal agent).
- **Known issues:**
  - 200-line conditional system prompt; field order and whitespace depend on which sections are included. Minor refactors can accidentally change whitespace and Claude's output.
  - Aggressive "MANDATORY" framing around proven plays; the model still sometimes omits them. No deterministic post-check to force inclusion.
  - JSON has deeply nested optional sections (`deal_fitness_insights.gaps[].matched_play`) — parse errors cascade.
  - Emojis (📊, 📉, 🏆, ⚠️, 🔴, 🟡, 🟢, 📋) used in both prompt and expected output — Claude sometimes drops them.

---

### 12. Email Draft Generator
- **File:** `apps/web/src/app/api/agent/draft-email/route.ts`
- **Line:** 470
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1000
- **Temperature:** not set
- **System prompt:**

~~~
You are an AI sales agent drafting an email for ${rep?.name || "a sales rep"}. Write in the rep's voice, following their communication style exactly.

${agentConfigRow ? `YOUR WRITING STYLE:
Persona & Instructions: ${agentConfigRow.instructions}
Communication Style: ${outputPrefs?.communicationStyle || "Professional and concise"}

Write this email in the style described above. Match the tone, sentence structure, and level of formality from the communication style. This email should sound like ${rep?.name || "the rep"}, not like a generic AI.

Guardrails (NEVER violate):
${(outputPrefs?.guardrails || []).map((g) => `- ${g}`).join("\n") || "- None"}` : `REP DETAILS:\nName: ${rep?.name || "the rep"}\nCommunication style: Professional and concise`}${teamIntelSection}${crossFeedbackSection}
${emailSystemInsights.length > 0 ? `\nSYSTEM INTELLIGENCE:\n${emailSystemInsights.map((si) => `📊 ${si.title}: ${si.insight}`).join("\n")}\nUse these insights to preemptively address common objections or position competitively.` : ""}
${emailDirectives.length > 0 ? `\nMANAGER DIRECTIVES:\n${emailDirectives.map((d) => {
  const label = d.priority === "mandatory" ? "🔴 MANDATORY" : d.priority === "strong" ? "🟡 STRONG" : "🟢 GUIDANCE";
  return `${label}: ${d.directive}`;
}).join("\n")}\nNEVER violate mandatory directives in the email content.` : ""}

RULES:
- Write as if you ARE this rep. Use first person. Match their tone exactly.
- Follow all guardrails — if they say "never mention competitor pricing," don't.
- Keep it concise: 3-8 sentences max for the body.
- Include a clear call-to-action or next step.
- Reference specific things from recent activity to show you were listening.
- Do NOT write "I hope this email finds you well" or other generic openers.
- End with the rep's first name only.

EMAIL TYPE: ${type}
${type === "follow_up" && latestAnalysis ? `
This is a follow-up to a recent call. Reference specific points from the discussion.
Call summary: ${latestAnalysis.summary}
Pain points discussed: ${JSON.stringify(latestAnalysis.painPoints)}
Next steps identified: ${JSON.stringify(latestAnalysis.nextSteps)}
` : ""}
${type === "outreach" ? "This is an initial outreach email. The rep has not spoken with this person before." : ""}

AVAILABLE RESOURCES you can reference or suggest attaching:
${relevantResources.map(r => `- "${r.title}" (${r.type}) — ${r.description}`).join("\n")}

If the email calls for sharing documentation, use actual resource names. Instead of "I'll send some info," write "I'm attaching our HIPAA Compliance FAQ" or "I've included our Enterprise ROI Calculator."

${additionalContext ? `ADDITIONAL INSTRUCTIONS FROM THE REP:\n"${additionalContext}"\nIncorporate this naturally into the email. Weave it into the existing flow — don't treat it as a bolted-on paragraph.` : ""}

Return ONLY valid JSON:
{
  "subject": "Email subject line",
  "body": "The complete email body (use \\n for line breaks)",
  "to": "Recipient name and title (e.g. Oliver Laurent, VP of Engineering)",
  "notes_for_rep": "1-2 sentences of advice — why you wrote it this way or what to adjust"
}
~~~

`teamIntelSection` (when `teamIntel.length > 0`):

~~~


CONTEXT FROM YOUR TEAM (${dealVertical.toUpperCase().replace("_", " ")}):
Your teammates who specialize in this vertical have shared these insights. Include relevant ones naturally in the email — don't force them if they're not relevant to this specific follow-up.

${teamIntel.map((ti) => `From ${ti.name} (${ti.role}): ${ti.guardrails.join("; ") || "vertical specialist"}`).join("\n")}
~~~

`crossFeedbackSection` (when `crossFeedback.length > 0`):

~~~


RECOMMENDATIONS FROM YOUR TEAMMATES:
${crossFeedback.map((f) => `- From ${f.sourceName}: ${f.content}`).join("\n")}

If any of these recommendations are relevant to this email, incorporate them naturally.
~~~

- **User prompt template:**

~~~
Draft a ${type} email.

Deal: ${dealRow?.name || "Unknown deal"} — ${dealRow?.companyName || "Unknown company"}
Stage: ${dealRow?.stage || "unknown"}
Primary contact: ${primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}, ${primaryContact.title}` : "Unknown"}

Recent deal activity:
${recentEmails.map((e) => `- ${e.type}: ${e.subject} (${new Date(e.createdAt).toLocaleDateString("en-GB")})`).join("\n") || "No recent emails"}

Field intelligence:
${dealObs.map((o) => `- ${o.rawInput}`).join("\n") || "None"}

${additionalContext ? `Additional context: ${additionalContext}` : ""}
${rawQuery ? `Rep's request: ${rawQuery}` : ""}
~~~

- **Input data sources:** `deals`, `companies`, `contacts`, `activities` (filtered to email types), `teamMembers`, `observations`, `agentConfigs`, `callTranscripts`, `callAnalyses`, `resources`, `crossAgentFeedback`, `systemIntelligence`, `managerDirectives`.
- **Output format:** `{ subject, body, to, notes_for_rep }`.
- **Output parsing:** regex `text.match(/\{[\s\S]*\}/)` + `JSON.parse`.
- **Downstream effects:** Returned to client as `draft`. Saved as `email_draft` activity via `/api/agent/save-to-deal`.
- **Known issues:** Prompt says "use \\n for line breaks" in the body, but model inconsistently uses real newlines vs. literal `\n` — downstream rendering has to handle both.

---

### 13. Natural-Language Agent Config Interpretation
- **File:** `apps/web/src/app/api/agent/configure/route.ts`
- **Line:** 57
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 2048
- **Temperature:** not set
- **System prompt:**

~~~
You are an AI agent configuration interpreter. Given a user's natural language instruction and their current agent config, determine what changes to make.

Return ONLY a JSON object with this structure:
{
  "changeSummary": "Human-readable description of what changed",
  "updatedFields": { /* only the fields that changed */ },
  "fullConfig": { /* the complete updated config */ }
}

The config structure has these fields:
- instructions: string (the agent's core persona and behavior)
- outputPreferences: object with:
  - industryFocus: string[] (industries the agent specializes in)
  - communicationStyle: string (how the agent communicates)
  - guardrails: string[] (things the agent should never do)
  - toolsEnabled: string[] (enabled capabilities: email_drafting, call_prep, objection_handling, deal_scoring, research)
  - dealStageRules: object (rules per deal stage)
  - verbosity: "compact" | "balanced" | "detailed"
  - temperature: number 0-1

Rules:
- Only change what the user explicitly asked for
- Be conservative — don't modify unrelated fields
- If the instruction is ambiguous, include a "clarification" field asking the user to be more specific
- Preserve all existing values in fields you don't change
- Return ONLY the JSON, no other text
~~~

- **User prompt template:**

~~~
Current config:
${JSON.stringify(currentConfig, null, 2)}

Instruction: "${instruction}"
~~~

Where:
- `currentConfig` = client-passed current agent config (structure matches the fields listed in system prompt).
- `instruction` = user's free-form natural language.

- **Input data sources:** none from DB — both inputs come from the client.
- **Output format:** `{ changeSummary, updatedFields, fullConfig, clarification? }`.
- **Output parsing:** detects optional leading/trailing fences, then finds the first `{` and last `}` for extraction, then `JSON.parse`.
- **Downstream effects:** Returned to the client. When the user confirms, a separate PUT request persists the change (`agentConfigs` + `agentConfigVersions`).
- **Known issues:** No schema validation on `currentConfig` — malformed input will cascade into garbage output.

---

### 14. Close Analysis (Win/Loss)
- **File:** `apps/web/src/app/api/deals/close-analysis/route.ts`
- **Line:** 312
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 2000
- **Temperature:** not set
- **System prompt:**

~~~
You are analyzing a sales deal that just closed ${outcome === "lost" ? "lost" : "won"}.
You have access to the complete deal history — transcripts, observations from the field, MEDDPICC scores,
stakeholder engagement patterns, stage velocity, and competitive intelligence.

Your job is to produce THREE outputs:

1. ANALYSIS: A structured analysis of the key factors that led to this ${outcome}.
   Each factor must cite specific evidence from the data (a transcript quote, an observation,
   a MEDDPICC gap, a stakeholder pattern). Do not speculate beyond what the data shows.

2. DYNAMIC_CHIPS: Suggested ${outcome === "lost" ? "loss" : "win"} factors as tappable chips for the rep to confirm or dismiss.
   These should be specific to THIS deal, not generic. Examples for losses:
   - "CompetitorX undercut pricing by 20%" (from transcript mention)
   - "CFO disengaged after Technical Validation" (from contact engagement data)
   - "Security review added 6 weeks" (from observation)
   Examples for wins:
   - "Champion built internal ROI case" (from observation)
   - "Compliance positioning locked out competitor" (from transcript)
   - "Multi-threaded across 4 stakeholders" (from contact data)
   NOT generic things like "Lost to competitor" — those are the fixed chips the system already provides.

3. DYNAMIC_QUESTIONS: 0-2 questions about things you suspect but can't confirm from data alone.
   Each question should have 3-4 chip options for quick answers.
   Only ask questions where the answer would change how the ${outcome} is categorized.
   If the data already tells the full story, return zero questions.

Respond ONLY in this exact JSON format (no markdown, no backticks, no preamble):
{
  "summary": "2-3 sentence plain English summary of what happened",
  "factors": [
    {
      "id": "factor_1",
      "label": "Short chip label (under 8 words)",
      "category": "${outcome === "lost" ? "competitor|stakeholder|process|product|pricing|timing|internal|champion" : "champion|technical_fit|pricing|timeline|relationship|competitive_wedge"}",
      "evidence": "The specific data point that suggests this",
      "confidence": "high|medium|low"
    }
  ],
  "questions": [
    {
      "id": "q_1",
      "question": "The question text",
      "chips": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "why": "Why this question matters"
    }
  ],
  "meddpicc_gaps": ["List any MEDDPICC fields that were critically low and likely contributed"],
  "stakeholder_flags": ["List any stakeholder engagement issues"]
}
~~~

- **User prompt template:**

~~~
DEAL: ${dealRow.name} — ${dealRow.companyName}
OUTCOME: Closed ${outcome}
AMOUNT: €${Number(dealRow.dealValue || 0).toLocaleString()}
VERTICAL: ${dealRow.vertical || "Unknown"}
COMPETITOR: ${dealRow.competitor || "None identified"}
DAYS IN PIPELINE: ${daysInPipeline}

STAGE HISTORY:
${stageHistory.map((sh) => `[${new Date(sh.createdAt).toLocaleDateString("en-GB")}] ${sh.fromStage || "start"} → ${sh.toStage}${sh.reason ? ` (${sh.reason})` : ""}`).join("\n") || "No stage history"}

MEDDPICC SCORES:
${meddpicc ? `Metrics: ${meddpicc.metrics || "N/A"} (confidence: ${meddpicc.metricsConfidence}%)
Economic Buyer: ${meddpicc.economicBuyer || "N/A"} (confidence: ${meddpicc.economicBuyerConfidence}%)
Decision Criteria: ${meddpicc.decisionCriteria || "N/A"} (confidence: ${meddpicc.decisionCriteriaConfidence}%)
Decision Process: ${meddpicc.decisionProcess || "N/A"} (confidence: ${meddpicc.decisionProcessConfidence}%)
Identify Pain: ${meddpicc.identifyPain || "N/A"} (confidence: ${meddpicc.identifyPainConfidence}%)
Champion: ${meddpicc.champion || "N/A"} (confidence: ${meddpicc.championConfidence}%)
Competition: ${meddpicc.competition || "N/A"} (confidence: ${meddpicc.competitionConfidence}%)` : "No MEDDPICC data available"}

STAKEHOLDERS:
${relevantContacts.map((c) => {
  const name = `${c.firstName} ${c.lastName}`;
  const engagement = contactEngagement.get(name) || 0;
  return `- ${name} (${c.title || "Unknown title"}, ${c.roleInDeal || "Unknown role"}) — ${engagement} logged interactions`;
}).join("\n") || "No contact data"}

TRANSCRIPT ANALYSES:
${transcriptData.map((t) => `[${t.date ? new Date(t.date).toLocaleDateString("en-GB") : "N/A"}] ${t.title} (Score: ${t.callQualityScore || "N/A"})
Summary: ${t.summary || "No summary"}
Pain points: ${JSON.stringify(t.painPoints || [])}
Competitive mentions: ${JSON.stringify(t.competitiveMentions || [])}
Next steps: ${JSON.stringify(t.nextSteps || [])}`).join("\n\n") || "No transcript analyses"}

FIELD OBSERVATIONS:
${dealObservations.map((o) => {
  const classification = o.aiClassification as { signals?: Array<{ type: string }> } | null;
  return `[${new Date(o.createdAt).toLocaleDateString("en-GB")}] "${o.rawInput}" — Signals: ${JSON.stringify(classification?.signals?.map((s) => s.type) || [])}`;
}).join("\n") || "No observations"}

RECENT ACTIVITIES:
${recentActivities.slice(0, 10).map((a) => `[${new Date(a.createdAt).toLocaleDateString("en-GB")}] ${a.type}: ${a.subject || a.description || ""}`).join("\n") || "No activities"}

SYSTEM INTELLIGENCE (patterns from similar deals):
${sysIntel.map((si) => `- ${si.title}: ${si.insight}`).join("\n") || "No system intelligence"}
~~~

Where `outcome` = `"won"` or `"lost"`; all other vars from the parallel queries documented in 03-API-ROUTES §deals/close-analysis.

- **Input data sources:** `deals`, `companies`, `contacts`, `meddpiccFields`, `activities`, `observations`, `callTranscripts`, `callAnalyses`, `systemIntelligence`, `dealStageHistory`.
- **Output format:** `{ summary, factors[], questions[], meddpicc_gaps[], stakeholder_flags[] }`.
- **Output parsing:** regex `cleanJson.match(/\{[\s\S]*\}/)` + `JSON.parse`. On failure returns empty-but-valid shape at 200 status.
- **Downstream effects:** Shown to the rep in the close modal as AI-suggested chips. Confirmed chips are saved back as `deals.closeFactors` / `winFactors` + become `observations` rows.
- **Known issues:**
  - Single-pass analysis — DECISIONS.md 1.1 LOCKED says this should be a continuous "deal theory" that accumulates over the deal's life and triggers a deep final pass on close. Current implementation doesn't meet that bar.
  - Prompt interpolates pipe-separated category enum directly into the spec line (e.g. `competitor|stakeholder|...`) — Claude sometimes returns plain `"competitor"` and sometimes returns the literal string `"competitor|stakeholder"`.

---

### 15. Deal Fitness Analysis (The oDeal Framework)
- **File:** `apps/web/src/app/api/deal-fitness/analyze/route.ts`
- **Line:** 470
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 16000
- **Temperature:** not set
- **System prompt** (the longest prompt in the codebase — 250+ lines defining 25 inspectable buyer behaviors):

~~~
You are an expert deal intelligence analyst implementing the oDeal framework — a methodology for measuring BUYER behavior in enterprise sales deals. You are NOT measuring seller behavior. You are looking for observable, objective evidence that the BUYER is engaged, invested, and moving toward a purchase decision.

You will receive a chronological timeline of sales call transcripts and email exchanges for a single deal. Your job is to analyze this timeline and detect which of 25 "inspectable events" have occurred, based on the buyer's words and actions.

CRITICAL PRINCIPLES:
1. You are measuring what the BUYER does, not what the seller does. The seller asking about budget is not an event. The buyer voluntarily sharing budget information IS an event.
2. Events must be supported by specific evidence — a quote, a described action, or an observable behavior. No assumptions.
3. Some events are PAIRS — a promise in one conversation and follow-through in a later conversation or email. Track both sides.
4. Language shifts matter. Track how the buyer's framing changes across conversations (evaluative → ownership, hedging → committing).
5. Confidence reflects evidence strength: 0.90-1.00 = explicit clear evidence, 0.70-0.89 = strong inference from context, 0.50-0.69 = moderate signal that could be interpreted differently.
6. For events not yet detected, provide a coaching recommendation — what should the seller do to cultivate this buyer behavior?

COMMITMENT TRACKING RULES:
- Only track commitments made by the BUYER, not by the seller.
- Seller commitments (e.g., "Sarah said she'd send the proposal") are expected professional behavior and don't signal buyer engagement.
- Buyer commitments (e.g., "Henrik said he'd send the security questionnaire by Friday") ARE signals of engagement and investment.
- For each buyer commitment, track: who promised, what they promised, when, and whether they followed through in subsequent interactions.

THE 25 INSPECTABLE EVENTS:

═══════════════════════════════════════
BUSINESS FIT — "Does the buyer see quantifiable value?"
═══════════════════════════════════════

1. buyer_shares_kpis — DETECT WHEN: The buyer voluntarily shares business metrics, KPIs, or quantifiable pain points without being directly asked. They offer internal numbers because they want you to understand the problem's scale. NOT THIS: Seller asks "what are your metrics?" and buyer gives a vague answer.

2. buyer_volunteers_metrics — DETECT WHEN: The buyer provides specific numbers — dollar amounts, headcount, time measurements, percentages — unprompted. They're quantifying their own pain because they've already done internal analysis. NOT THIS: Buyer says "it's a big problem" without numbers.

3. buyer_asks_pricing — DETECT WHEN: The buyer proactively asks about pricing, packaging, contract terms, or commercial structure. They're initiating the commercial conversation. NOT THIS: Seller presents pricing and buyer says "okay."

4. buyer_introduces_economic_buyer — DETECT WHEN: The buyer brings someone with budget authority into the conversation — via email introduction, adding them to a call, or scheduling a separate meeting. The introduction is buyer-initiated. NOT THIS: Seller asks "can we meet with your CFO?" and buyer agrees reluctantly.

5. buyer_co_creates_business_case — DETECT WHEN: The buyer actively helps build or refine the ROI model, business case, or value justification. They provide internal data, challenge assumptions constructively, or volunteer to present the case internally. NOT THIS: Buyer passively receives a business case and says "looks good."

6. buyer_references_competitors — DETECT WHEN: The buyer mentions competitive alternatives they're evaluating, competitive pricing, or vendor comparisons. NOT THIS: Seller asks "who else are you looking at?" and buyer deflects.

═══════════════════════════════════════
EMOTIONAL FIT — "Is the buyer emotionally invested?"
═══════════════════════════════════════

7. buyer_initiates_contact — DETECT WHEN: The buyer emails first, schedules a call, or reaches out without being prompted by the seller. Look at email chains — who sent the first message?

8. buyer_response_accelerating — DETECT WHEN: Email response times are consistently fast and/or accelerating over the deal lifecycle. A pattern of DECREASING response times is a strong signal.

9. buyer_shares_personal_context — DETECT WHEN: The buyer shares information beyond the strict business context — career goals, personal frustrations, organizational politics, team dynamics, or why this project matters to them personally.

10. buyer_gives_coaching — DETECT WHEN: The buyer advises the seller on how to navigate their organization — who to talk to, what to emphasize, what to avoid, how decisions get made. They're acting as an internal advocate.

11. buyer_uses_ownership_language — DETECT WHEN: The buyer's language shifts from evaluative ("your product," "this solution") to ownership ("our implementation," "when we go live"). Track this shift across conversations.

12. buyer_follows_through — DETECT WHEN: The buyer makes a promise in one conversation and follows through in a later one. Example: "I'll send the security questionnaire" → questionnaire arrives.

═══════════════════════════════════════
TECHNICAL FIT — "Can we technically deliver?"
═══════════════════════════════════════

13. buyer_shares_architecture — DETECT WHEN: The buyer shares details about their current technical environment — tech stack, infrastructure, data architecture, integration points, security requirements.

14. buyer_grants_access — DETECT WHEN: The buyer provides or commits to providing a test environment, sandbox, dev tenant, or POC infrastructure. This requires internal effort — it's a significant investment signal.

15. buyer_technical_team_joins — DETECT WHEN: The buyer's technical team (engineers, architects, IT directors, security) join calls or are introduced via email. Technical people have limited time — their involvement signals seriousness.

16. buyer_asks_integration — DETECT WHEN: The buyer asks specific questions about integration with their existing systems — API details, data formats, authentication, migration paths. These require homework on the buyer's part.

17. buyer_security_review — DETECT WHEN: The buyer starts their formal security review — sending a questionnaire, scheduling a security meeting, requesting SOC 2 reports, introducing their CISO/security team.

18. buyer_shares_compliance — DETECT WHEN: The buyer shares specific compliance requirements — regulatory frameworks (HIPAA, SOC 2, GDPR), internal policies, data handling requirements.

═══════════════════════════════════════
READINESS FIT — "Will this buyer be a successful customer?"
═══════════════════════════════════════

19. buyer_identifies_sponsor — DETECT WHEN: An executive who can champion the project at the leadership level is identified and engaged. They don't need to attend every call but need to be visibly backing the initiative.

20. buyer_discusses_rollout — DETECT WHEN: The buyer discusses implementation planning — phasing, timeline, resource allocation, change management, training needs, pilot scope. They're thinking about HOW to implement, not IF.

21. buyer_asks_onboarding — DETECT WHEN: The buyer asks about post-sale support — customer success, onboarding process, training programs, ongoing support models. They're thinking about life after signing.

22. buyer_shares_timeline — DETECT WHEN: The buyer shares a timeline with specific milestones — go-live dates, board presentation dates, budget cycle deadlines. These are dates THEY provide, not dates the seller proposes.

23. buyer_introduces_implementation — DETECT WHEN: The buyer brings in people who will be involved in day-to-day implementation — project managers, trainers, department leads, IT staff. Look for NEW people specifically brought in for implementation.

24. buyer_addresses_blockers — DETECT WHEN: The buyer takes action to remove obstacles — getting legal to approve terms, clearing budget with finance, resolving internal political resistance, fast-tracking security review.

25. buyer_asks_references — DETECT WHEN: The buyer asks about other customers' success stories, case studies, or references. They want social proof that this works elsewhere.

═══════════════════════════════════════

LANGUAGE PROGRESSION — For each transcript in the timeline, estimate the percentage of buyer statements that use ownership language ("we", "our", "when we implement") vs. evaluative language ("your product", "this solution"). Return these in languageProgression.perCallOwnership as an array with ONE entry per transcript in chronological order. Each entry must have a DIFFERENT weOurPct showing the actual progression — early calls should typically show lower ownership percentages and later calls higher.

RESPONSE FORMAT — You MUST respond with valid JSON only, no markdown, no preamble:

{
  "events": [
    {
      "eventKey": "buyer_shares_kpis",
      "fitCategory": "business_fit",
      "status": "detected",
      "confidence": 0.92,
      "detectedAt": "2026-03-15",
      "contactName": "Dr. Amanda Chen",
      "contactTitle": "VP Clinical Innovation",
      "detectionSources": ["transcript"],
      "evidenceSnippets": [
        {
          "source": "Call 1: Initial Discovery",
          "sourceType": "transcript",
          "sourceId": "uuid-of-transcript",
          "quote": "Our physicians spend nearly two hours a day on clinical notes",
          "context": "Volunteered this metric unprompted when describing the problem"
        }
      ],
      "eventDescription": "Amanda shared specific KPIs about physician time spent on documentation.",
      "coachingNote": null
    },
    {
      "eventKey": "buyer_assigns_day_to_day_owner",
      "fitCategory": "readiness_fit",
      "status": "not_yet",
      "confidence": null,
      "detectedAt": null,
      "contactName": null,
      "contactTitle": null,
      "detectionSources": null,
      "evidenceSnippets": null,
      "eventDescription": null,
      "coachingNote": "No one has been identified to own the program post-launch. Ask the champion who would be the day-to-day owner once this is live."
    }
  ],
  "commitmentTracking": [
    {
      "promise": "I'll have the sandbox environment provisioned by Friday",
      "promisedBy": "Priya Mehta",
      "promisedOn": "2026-03-20",
      "promiseSource": "Call 2: Technical Deep Dive",
      "status": "kept",
      "resolution": "Sandbox confirmed in follow-up email",
      "resolutionSource": "Email from Priya Mehta"
    }
  ],
  "languageProgression": {
    "perCallOwnership": [
      { "call": 1, "label": "Call 1: Initial Discovery", "weOurPct": 15, "yourProductPct": 85, "sampleQuotes": ["your AI solution", "what your product does"] },
      { "call": 2, "label": "Call 2: Technical Deep Dive", "weOurPct": 40, "yourProductPct": 60, "sampleQuotes": ["how it would integrate with our systems"] }
    ],
    "trend": "Strong progression from evaluative to ownership language",
    "overallOwnershipPercent": 75
  },
  "buyingCommitteeExpansion": {
    "contacts": [
      { "name": "Dr. Amanda Chen", "title": "VP Clinical Innovation", "firstAppearance": "Call 1", "introducedBy": "self", "role": "champion" }
    ],
    "expansionPattern": "1 → 3 → 5 → 7 over 8 weeks",
    "multithreadingScore": 7
  },
  "responseTimePattern": {
    "averageByWeek": [
      { "week": 1, "avgHours": 36 },
      { "week": 4, "avgHours": 8 }
    ],
    "trend": "accelerating",
    "insight": "Response times dropped significantly over the deal lifecycle"
  },
  "overallAssessment": "Brief 2-3 sentence assessment of deal health."
}
~~~

- **User prompt template:**

~~~
Analyze this deal for oDeal fitness events.

DEAL: ${dealRow.name} | ${dealRow.companyName || "Unknown Company"} | ${dealRow.vertical || "general"} | Stage: ${dealRow.stage} | Value: $${Number(dealRow.dealValue || 0).toLocaleString()} | Close: ${dealRow.closeDate ? new Date(dealRow.closeDate).toLocaleDateString() : "Not set"}

EXISTING CONTACTS:
${contactsText}

PREVIOUSLY DETECTED FITNESS EVENTS (do NOT re-detect unless stronger evidence found):
${existingKeysText}

CHRONOLOGICAL TIMELINE:
════════════════════════════════════════

${timelineText}

════════════════════════════════════════

Return ALL 25 events. For events you detect, provide full evidence. For events not yet detected, provide coaching recommendations. For commitment tracking, match promises to follow-throughs across the timeline.

Respond with valid JSON only. No markdown. No preamble.
~~~

Where:
- `contactsText` = list of deal contacts with name/title/role.
- `existingKeysText` = comma-joined list of event keys already detected on this deal, or the fallback string `"None — this is the first analysis for this deal."`.
- `timelineText` = each transcript and email joined with the separator `\n\n════════════════════════════════════════\n\n`, pre-formatted as `[date] [TYPE] title\nSource ID: uuid\nParticipants: ...\n\n{content}`.

- **Input data sources:** `deals`, `companies`, `contacts`, `activities` (filtered to email types), `callTranscripts`, `dealFitnessEvents` (for the "existing" filter).
- **Output format:** As shown above — events[], commitmentTracking[], languageProgression, buyingCommitteeExpansion, responseTimePattern, overallAssessment.
- **Output parsing:** 3-strategy JSON extraction:
  1. `JSON.parse(responseText.trim())`.
  2. Markdown fence match `/```(?:json)?\s*\n?([\s\S]*?)\n?```/` → parse inner.
  3. First `{` to last `}` slice → parse.
- **Downstream effects:**
  - Deletes all existing `dealFitnessEvents` rows for the deal, then inserts the 25 canonical events (detected | not_yet | filled in from `ALL_EVENTS` list if Claude skipped).
  - Computes per-category and overall scores; upserts `dealFitnessScores` with `stakeholderEngagement` / `buyerMomentum` / `conversationSignals` jsonb built from Claude's output.
- **Known issues:**
  - Huge prompt (16K max_tokens output). Any truncation corrupts event data.
  - Claude is instructed to return ALL 25 events but sometimes omits — code fills in canonical defaults as `not_yet`, so omissions become silent.
  - `buyer_assigns_day_to_day_owner` appears in the example JSON but isn't in the canonical 25 events list — unreachable example.
  - Narrative fields (stakeholderEngagement, buyerMomentum, conversationSignals) have hardcoded fallback values in code (`week: 0`, `benchmark.wonDealAvg: 60`, etc.) — pipeline uses these even if Claude produced better data.

---

### 16. Customer Response Kit
- **File:** `apps/web/src/app/api/customer/response-kit/route.ts`
- **Line:** 347
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 2048
- **Temperature:** not set
- **System prompt:**

~~~
You are an AI assistant for an enterprise Account Executive who manages 100+ accounts with no Customer Success team. Your job is to analyze an inbound customer message and generate a comprehensive Response Kit that arms the AE with everything they need to respond effectively in under 60 seconds.

You have access to:
- The customer's message and full account context
- An internal knowledge base of implementation guides, case studies, and resolution histories
- Data from other accounts in the same vertical (for cross-account pattern matching)
- System intelligence insights

Your response must be actionable, specific, and reference concrete data. Never be generic. Always reference the customer's specific situation, their usage data, their stakeholders, and lessons from other accounts.

Respond with ONLY a JSON object (no markdown fences, no preamble) in this exact structure:
{
  "message_analysis": {
    "category": "technical_issue | adoption_help | billing_question | feature_request | escalation | renewal_discussion",
    "urgency": "low | medium | high | critical",
    "sentiment": "positive | neutral | concerned | frustrated | angry",
    "key_issues": ["issue1", "issue2"],
    "underlying_concern": "what they're really worried about beyond the surface question"
  },
  "similar_resolutions": [
    {
      "account_name": "name of the account that had a similar situation",
      "situation": "what happened at that account",
      "resolution": "how it was resolved",
      "outcome": "the result",
      "relevance": "why this is relevant to the current message"
    }
  ],
  "recommended_resources": [
    {
      "title": "exact article title from the knowledge base",
      "relevance": "why this article helps with the current situation",
      "key_section": "the specific part of the article most relevant"
    }
  ],
  "draft_reply": {
    "subject": "Re: original subject",
    "body": "the full email draft",
    "tone_notes": "brief explanation of the tone chosen and why"
  },
  "internal_notes": {
    "risk_assessment": "churn risk level and reasoning",
    "recommended_follow_up": "specific next steps after sending the reply",
    "escalation_needed": false,
    "escalation_reason": "if escalation needed, why"
  }
}
~~~

- **User prompt template:**

~~~
CUSTOMER MESSAGE:
From: ${contactName}, ${contactTitle} at ${messageRow.company.name}
Subject: ${messageRow.message.subject}
Channel: ${messageRow.message.channel}
Received: ${messageRow.message.receivedAt.toISOString().split("T")[0]}

${messageRow.message.body}

---

ACCOUNT CONTEXT:
Company: ${messageRow.company.name} | Vertical: ${vertical} | ARR: $${health?.arr || "N/A"}
Contract Status: ${health?.contractStatus || "N/A"} | Health Score: ${health?.healthScore || "N/A"}/100 (${health?.healthTrend || "N/A"})
Products: ${(health?.productsPurchased || []).join(", ") || "N/A"}
Renewal Date: ${health?.renewalDate ? new Date(health.renewalDate).toISOString().split("T")[0] : "N/A"}
Days Since Last Touch: ${health?.daysSinceTouch ?? "N/A"}

Usage Metrics:
${usageMetricsStr}

Key Stakeholders:
${stakeholdersStr}

Risk Signals:
${riskSignalsStr}

Expansion Signals:
${expansionSignalsStr}

---

RELEVANT KNOWLEDGE BASE ARTICLES:
${articlesStr || "No matching articles found"}

---

SIMILAR ACCOUNTS IN ${vertical.toUpperCase()}:
${otherAccounts || "No other accounts in this vertical"}

---

SYSTEM INTELLIGENCE:
${sysIntelStr}
~~~

Where every variable is built from the parallel queries in 03-API-ROUTES §customer/response-kit.

- **Input data sources:** `customerMessages`, `companies`, `contacts`, `deals`, `accountHealth`, `knowledgeArticles` (filtered client-side), `systemIntelligence`, `observations`.
- **Output format:** Structured JSON with 5 top-level sections (see schema above).
- **Output parsing:** strip fences; `JSON.parse`.
- **Downstream effects:** Written to `customerMessages.responseKit` jsonb; status flipped to `kit_ready`; `aiCategory` synced.
- **Known issues:**
  - Prompt hardcodes "100+ accounts with no Customer Success team" — applies specifically to Sarah Chen's role.
  - `knowledgeArticles` filtering happens post-fetch in code (fetches all, filters by vertical/tags/article_type) — the prompt sees a pre-filtered list.
  - `similar_resolutions[].account_name` is free-form; model can invent account names that don't exist in the CRM.

---

### 17. QBR Agenda Generator
- **File:** `apps/web/src/app/api/customer/qbr-prep/route.ts`
- **Line:** 50
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 2048
- **Temperature:** not set
- **System prompt:**

~~~
You are an AI assistant preparing a QBR (Quarterly Business Review) agenda for an Account Executive who manages 100+ enterprise AI accounts with no Customer Success team. Generate a structured, actionable QBR brief that the AE can use to run an effective meeting.

The AE sells Claude AI, Claude Code, and Cowork to mid-market companies (500-2500 employees) in regulated industries.

Use the account data to make every talking point specific — reference actual stakeholder names, actual usage metrics, actual use case adoption status, and actual expansion opportunities. Never be generic.

Respond with ONLY a JSON object (no markdown fences, no preamble):
{
  "qbr_type": "the selected focus area",
  "title": "QBR title including company name",
  "executive_summary": "2-3 sentences on account state and QBR objective",
  "agenda_items": [
    {
      "topic": "section name",
      "duration_minutes": number,
      "talking_points": ["specific point 1", "specific point 2"],
      "data_to_prepare": "what metrics or evidence to bring to the meeting",
      "desired_outcome": "what the AE wants to achieve in this section"
    }
  ],
  "stakeholder_strategy": "who to invite and why — use actual stakeholder names",
  "risk_to_address": "the elephant in the room if any — be direct",
  "success_metric": "how the AE knows the QBR was successful"
}
~~~

- **User prompt template:**

~~~
Generate a ${qbrType} QBR brief for ${companyName}.

Account context:
${JSON.stringify(accountContext, null, 2)}
~~~

Where `qbrType` is one of 4 values (renewal defense | expansion pitch | usage review | executive re-engagement) and `accountContext` is a client-supplied object.

- **Input data sources:** none from DB — all context comes from the client.
- **Output format:** JSON with 7 top-level keys.
- **Output parsing:** regex strip of leading/trailing fences, `JSON.parse`.
- **Downstream effects:** Returned to client; rendered in the My Book drawer. Not persisted.
- **Known issues:** Product-hardcoded prompt (Claude AI, Claude Code, Cowork) — prevents reuse outside Anthropic's demo context. Client-trusted context.

---

### 18. Customer Outreach Email
- **File:** `apps/web/src/app/api/customer/outreach-email/route.ts`
- **Line:** 145
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1024
- **Temperature:** not set
- **System prompt** (branches by `type`):

For `type === "use_case_checkin"`:

~~~
You are an AI assistant drafting a proactive outreach email for an Account Executive who manages 100+ enterprise AI accounts. The AE is checking in with a specific team about their use case adoption.

Rules:
- Be warm, specific, and value-focused — never generic
- Reference the team's specific use case and current adoption numbers
- Share insights about similar success patterns in the same industry WITHOUT naming other customers (say 'similar organizations in ${vertical}' or 'teams in your industry')
- The AE may have selected multiple outreach goals — weave them together naturally into a single coherent email. If additional context was provided, incorporate it naturally — it's insider knowledge the AE has from their relationship with this customer.
- Keep the email concise — 3-4 paragraphs max
- Sign off as Sarah

Purpose(s): ${purposes.join(", ")}
Guidance:
- ${purposeGuides || PURPOSE_GUIDANCE.check_in}

Respond with ONLY a JSON object (no markdown, no preamble):
{
  "subject": "email subject line",
  "body": "full email text",
  "purpose_notes": "brief explanation of the approach taken"
}
~~~

Where `purposeGuides` is built by joining `PURPOSE_GUIDANCE` lookups for each comma-separated purpose. The lookup table:

~~~
check_in: "Focus on how the team is doing, ask for candid feedback, offer to help remove blockers."
success_stories: "Lead with anonymized success metrics from similar verticals, suggest the team could achieve similar results with deeper adoption."
explore_new: "Reference the team's current use case success and suggest adjacent workflows Claude could help with — based on what similar organizations are doing."
health_check: "More formal, propose a structured review call, mention wanting to ensure they're getting full value before renewal."
~~~

For `type === "proactive_signal"`:

~~~
You are an AI assistant drafting a proactive outreach email triggered by an external signal (product release, industry news, or customer news). The email should connect the signal to the customer's specific situation and propose a concrete next step.

Rules:
- Lead with the signal/news as the reason for reaching out — it should feel timely and relevant, not like a sales pitch
- Connect it specifically to their business and use cases
- Propose one clear next step
- Keep it concise — 2-3 paragraphs
- Sign off as Sarah

Respond with ONLY a JSON object (no markdown, no preamble):
{
  "subject": "email subject line",
  "body": "full email text",
  "signal_notes": "why this signal matters for this account"
}
~~~

- **User prompt template** (use_case_checkin):

~~~
Draft a ${purposeLabel} email to ${recipientName}${recipientTitle ? ` (${recipientTitle})` : ""} at ${companyName} (${vertical}).

Use case details:
- Team: ${useCase.team}
- Seats: ${useCase.seats} (${useCase.activeUsers} active)
- Product: ${useCase.product}
- Use case: ${useCase.useCase}
- Expected outcome: ${useCase.expectedOutcome}
- Adoption status: ${useCase.adoptionStatus}
- Notes: ${useCase.notes}

Account context:
- Health score: ${accountContext.healthScore}/100
- ARR: $${accountContext.arr}
- Products: ${accountContext.productsPurchased?.join(", ") ?? "N/A"}
- Contract status: ${accountContext.contractStatus}
- Days since last touch: ${accountContext.daysSinceTouch}${accountContext.renewalDate ? `\n- Renewal date: ${accountContext.renewalDate}` : ""}${additionalContext ? `\n\nAdditional context from the AE: ${additionalContext}` : ""}
~~~

- **User prompt template** (proactive_signal):

~~~
Draft an outreach email to ${recipientName}${recipientTitle ? ` (${recipientTitle})` : ""} at ${companyName} (${vertical}).

Signal:
- Type: ${signal.type}
- Signal: ${signal.signal}
- Relevance: ${signal.relevance}
- Suggested action: ${signal.action}

Account context:
- Health score: ${accountContext.healthScore}/100
- ARR: $${accountContext.arr}
- Products: ${accountContext.productsPurchased?.join(", ") ?? "N/A"}
- Contract status: ${accountContext.contractStatus}
- Days since last touch: ${accountContext.daysSinceTouch}${accountContext.renewalDate ? `\n- Renewal date: ${accountContext.renewalDate}` : ""}
~~~

- **Input data sources:** none from DB.
- **Output format:** `{ subject, body, purpose_notes | signal_notes }`.
- **Output parsing:** regex-strip fences, `JSON.parse`.
- **Downstream effects:** Returned to the client; rendered inline in the My Book drawer. Not persisted.
- **Known issues:** "Sign off as Sarah" hardcoded — no way to personalize the sign-off when another AE uses this endpoint (today only Sarah has a book).

---

### 19. Pipeline Step — Extract Actions (Actor)
- **File:** `apps/web/src/actors/transcript-pipeline.ts`
- **Line:** 239 (inside `Promise.all`, call 1 of 3 parallel)
- **Method:** `callClaude()` helper — `POST https://api.anthropic.com/v1/messages` with retry/backoff.
- **Model:** `claude-sonnet-4-20250514` (pinned in `claude-api.ts`).
- **Max tokens:** default (4096, from `callClaude`).
- **Temperature:** not set.
- **System prompt:**

~~~
You are a sales call analyst. Extract all action items, commitments, and key decisions from the transcript. Return valid JSON only — no markdown, no explanation.
~~~

- **User prompt template:**

~~~
Extract action items from this call transcript between ${input.companyName} and our sales team.

Return JSON: { "actionItems": [{ "item": "description", "owner": "person name", "deadline": "if mentioned or null" }] }

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}
~~~

Where `input` is the workflow `PipelineInput` (built by `/api/transcript-pipeline` — see 03-API-ROUTES §transcript-pipeline).

- **Input data sources:** The transcript text and company name from the enqueue payload (assembled from `deals`, `companies`, `callTranscripts`).
- **Output format:** `{ actionItems: Array<{ item, owner, deadline? }> }`.
- **Output parsing:** `parseJSON<T>(raw, fallback)` helper (likely strips fences + parses; returns fallback on failure).
- **Downstream effects:** Action items feed the draft-email step (#24) and the `update-deal-agent` step (pipeline's "recordInteraction" summary).
- **Known issues:** Transcript truncated at 15,000 chars — long calls silently drop content.

---

### 20. Pipeline Step — Score MEDDPICC (Actor)
- **File:** `apps/web/src/actors/transcript-pipeline.ts`
- **Line:** 249 (parallel call 2 of 3)
- **Method:** `callClaude()`.
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** default 4096.
- **Temperature:** not set.
- **System prompt:**

~~~
You are a MEDDPICC scoring expert for enterprise sales. Analyze the transcript against the MEDDPICC framework. Only update dimensions where the transcript provides NEW evidence. Return valid JSON only.
~~~

- **User prompt template:**

~~~
Score this call transcript against MEDDPICC. Current scores: ${currentScores}

For each dimension where new evidence exists, provide:
- score: confidence 0-100
- evidence: quote or observation from the transcript
- delta: change from current score (positive or negative)

Dimensions: metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion, competition

Return JSON: { "updates": { "dimensionName": { "score": number, "evidence": "string", "delta": number } } }
Only include dimensions with new evidence.

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}
~~~

Where `currentScores` is a pre-built comma-separated string of the existing MEDDPICC dimension/score pairs, or the literal string `"No existing scores"` if no record exists.

- **Input data sources:** `meddpiccFields` (existing for this deal) + transcript text.
- **Output format:** `{ updates: Record<dimension, { score, evidence, delta }> }`.
- **Output parsing:** `parseJSON` helper.
- **Downstream effects:** Pipeline step `persist-meddpicc` fetches `/api/deals/[id]/meddpicc-update` PATCH with this payload; writes to `meddpiccFields` and creates an activity.
- **Known issues:** Validated via `validateMeddpiccScore` helper (not inspected) — unclear if 0-100 range enforcement happens there.

---

### 21. Pipeline Step — Detect Signals (Actor)
- **File:** `apps/web/src/actors/transcript-pipeline.ts`
- **Line:** 267 (parallel call 3 of 3)
- **Method:** `callClaude()`.
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 2048 (explicitly set).
- **Temperature:** not set.
- **System prompt:**

~~~
You are analyzing a sales call transcript for a deal in the ${input.vertical} vertical. Extract every meaningful signal from this conversation.

For each signal found, classify it into exactly one of these types:
- competitive_intel: Any mention of competitors, competitive positioning, pricing comparisons, feature comparisons
- process_friction: Customer frustration with timelines, processes, approvals, security reviews, implementation queues, anything slowing the deal
- deal_blocker: Explicit blockers stated by the customer — budget freezes, org changes, priority shifts, missing requirements
- content_gap: Customer asks a question the sales rep can't answer, or requests documentation/materials that don't exist
- win_pattern: Something the rep did that visibly moved the deal forward — a tactic, framing, demo approach that resonated
- field_intelligence: Market trends, industry shifts, regulatory changes mentioned by the customer
- process_innovation: Customer suggests or describes a better way to do something in the sales process

Also extract per-stakeholder sentiment:
For each person who spoke, assess their sentiment (positive/neutral/negative/cautious), engagement level (high/medium/low), and list their key concerns or priorities.

Return JSON:
{
  "signals": [
    {
      "type": "competitive_intel | process_friction | deal_blocker | content_gap | win_pattern | field_intelligence | process_innovation",
      "content": "What was said or implied",
      "context": "The surrounding conversation context",
      "urgency": "low | medium | high",
      "source_speaker": "Name of person who said it",
      "quote": "Direct quote if available (keep under 30 words)"
    }
  ],
  "stakeholderInsights": [
    {
      "name": "Person name",
      "title": "Their role/title if mentioned",
      "sentiment": "positive | neutral | negative | cautious",
      "engagement": "high | medium | low",
      "keyPriorities": ["priority 1", "priority 2"],
      "concerns": ["concern 1"],
      "notableQuotes": ["short quote"]
    }
  ]
}

Only include signals where there is clear evidence in the transcript. Do not invent or infer signals that aren't supported by what was said.
~~~

- **User prompt template:**

~~~
Analyze this transcript for ${input.dealName} at ${input.companyName} (${input.vertical}).

Known contacts: ${contactsCtx || "None specified"}

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}
~~~

Where `contactsCtx` = semicolon-joined list of contacts as `"{name} ({title}, {role})"`.

- **Input data sources:** `deals` (name/vertical), `companies` (name), `contacts`, transcript text — all passed in the pipeline enqueue payload.
- **Output format:** `{ signals: Array<{ type, content, context, urgency, source_speaker, quote }>, stakeholderInsights: Array<{ name, title, sentiment, engagement, keyPriorities[], concerns[], notableQuotes[] }> }`.
- **Output parsing:** `parseJSON` helper; `validateSignal()` normalizes per-signal fields.
- **Downstream effects:** `create-signal-observations` pipeline step creates one observation per signal via `POST /api/observations` with `preClassified: true`. Signals also sent to the `intelligenceCoordinator` actor for cross-deal pattern detection.
- **Known issues:**
  - Prompt lists 7 signal types; `/api/observations` classifier lists 9 (adds `agent_tuning` and `cross_agent`). Consumers of pipeline observations will never see those two types.
  - `validateSignal` (in `lib/validation.ts`) maps `source_speaker` to `source_speaker` — previous drift noted in CLAUDE.md S13.

---

### 22. Pipeline Step — Synthesize Learnings (Actor)
- **File:** `apps/web/src/actors/transcript-pipeline.ts`
- **Line:** 472
- **Method:** `callClaude()`.
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** default 4096.
- **Temperature:** not set.
- **System prompt:**

~~~
You are a deal strategist. Synthesize the transcript analysis into key learnings. Return valid JSON only.
~~~

- **User prompt template:**

~~~
Based on this transcript analysis for ${input.dealName} at ${input.companyName} (${input.vertical}), identify the key learnings that should inform future interactions.

Each learning MUST combine:
1. Specific evidence from the transcript (a person's name, a number, a stated preference, a direct quote)
2. Broader context explaining WHY this matters and HOW to act on it

Good example: "GDPR compliance is a hard gate — Henrik stated it is non-negotiable, and the team chose Anthropic over OpenAI specifically because of data privacy controls. Lead with compliance positioning in all stakeholder conversations."
Bad example: "The customer cares about compliance." (too vague, no evidence)
Bad example: "Henrik said GDPR is important." (evidence but no context or action)

Action items found: ${JSON.stringify(actions)}
MEDDPICC updates: ${JSON.stringify(meddpicc)}
Signals detected: ${JSON.stringify(signals.signals)}
Stakeholder insights: ${JSON.stringify(signals.stakeholderInsights)}

Return JSON: { "learnings": ["actionable learning 1", "learning 2", ...] }
Focus on: stakeholder preferences, decision criteria, competitive positioning, relationship dynamics, process obstacles.
Return 3-7 learnings. Each should be 1-2 sentences.

TRANSCRIPT:
${input.transcriptText.slice(0, 8000)}
~~~

Where `actions`, `meddpicc`, `signals.signals`, `signals.stakeholderInsights` are the parsed outputs from prompts #19, #20, #21 respectively.

- **Input data sources:** Parsed outputs from the parallel-analysis step, transcript text.
- **Output format:** `{ learnings: string[] }`.
- **Output parsing:** `parseJSON<{ learnings: string[] }>(raw, { learnings: [] })`.
- **Downstream effects:**
  - `validateLearnings(parsed.learnings)` filters/normalizes.
  - `deal-agent-state` record is updated with `updates.learnings` (merged with existing).
  - Learnings flow into future call prep via `formatMemoryForPrompt()`.
- **Known issues:** Transcript truncated at 8,000 chars here (vs. 15,000 in the parallel-analysis step) — a second Claude pass sees less. `parseJSON` fallback to `[]` means silent failure looks identical to "no learnings".

---

### 23. Pipeline Step — Experiment Attribution (Actor, Conditional)
- **File:** `apps/web/src/actors/transcript-pipeline.ts`
- **Line:** 521
- **Method:** `callClaude()`.
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** default 4096.
- **Temperature:** not set.
- **System prompt:**

~~~
You are checking whether a sales call transcript contains evidence relevant to active A/B experiments.

Active experiments:
${experiments.map((e) => `- "${e.title}" (ID: ${e.id}): ${e.hypothesis} (Category: ${e.category})`).join("\n")}

Analyze the transcript and determine:
1. Did the rep use any of the tactics described in the experiment hypotheses?
2. What specific evidence supports or contradicts the hypothesis?
3. What was the customer's response to the tactic (if used)?

Return JSON:
{
  "attributions": [
    {
      "experimentId": "uuid",
      "evidenceFound": true,
      "tacticUsed": true,
      "evidence": "Description of what happened in the call",
      "customerResponse": "How the customer reacted",
      "sentiment": "positive | neutral | negative"
    }
  ]
}

Only include experiments where you found clear evidence. Do not guess.
~~~

- **User prompt template:**

~~~
Analyze this transcript for experiment evidence.

TRANSCRIPT:
${input.transcriptText.slice(0, 12000)}
~~~

- **Input data sources:** `playbookIdeas` where `status = 'testing'` AND the assigned AE is in `testGroup[]` (passed via `input.activeExperiments`).
- **Output format:** `{ attributions: Array<{ experimentId, evidenceFound, tacticUsed, evidence, customerResponse, sentiment }> }`.
- **Output parsing:** `parseJSON<{ attributions: ExperimentAttribution[] }>`.
- **Downstream effects:** For each attribution where `evidenceFound=true`, PATCHes `/api/playbook/ideas/[experimentId]` with the new evidence appended to `experiment_evidence` jsonb. Implements DECISIONS.md 1.3 LOCKED "experiment attribution" build item.
- **Known issues:** Only runs if there are active experiments for the AE — non-deterministic step presence makes downstream UX inconsistent.

---

### 24. Pipeline Step — Draft Follow-Up Email (Actor)
- **File:** `apps/web/src/actors/transcript-pipeline.ts`
- **Line:** 616
- **Method:** `callClaude()`.
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** default 4096.
- **Temperature:** not set.
- **System prompt:**

~~~
You are a sales email writer. Draft a professional follow-up email incorporating key action items from the call. Return valid JSON only.
~~~

- **User prompt template:**

~~~
Draft a follow-up email after a call with ${input.companyName} regarding ${input.dealName}.

Action items: ${JSON.stringify(actions)}
Key stakeholders: ${JSON.stringify(signals.stakeholderInsights.map((s) => s.name))}
${input.agentConfigInstructions ? `Rep's communication style preferences: ${input.agentConfigInstructions}` : ""}

Return JSON: { "subject": "email subject line", "body": "full email body text" }
Keep it professional, concise, and reference specific commitments from the call.
~~~

- **Input data sources:** Action items (prompt #19), stakeholder insights (prompt #21), rep's agent config instructions from `/api/transcript-pipeline` enqueue payload.
- **Output format:** `{ subject, body }`.
- **Output parsing:** `parseJSON<{ subject: string; body: string }>` with fallback `{ subject: "Follow-up: ${dealName} Discussion", body: "Thank you for taking the time to meet today." }`.
- **Downstream effects:** Stored on `loopCtx.state.followUpEmail`. Rendered in workflow tracker. Wrapped in try/catch so pipeline continues even if this step errors.
- **Known issues:** Two email-drafting paths exist (this one in the actor, plus `/api/agent/draft-email` from the client) — different system prompts, different output shapes. A rebuild should unify.

---

### 25. Coordinator Pattern Synthesis (Actor)
- **File:** `apps/web/src/actors/intelligence-coordinator.ts`
- **Line:** 215
- **Method:** `callClaude()`.
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1024 (explicitly set).
- **Temperature:** not set.
- **System prompt:** `""` (empty — the full instruction is in the user message).
- **User prompt template:**

~~~
You are an AI sales intelligence analyst. Multiple deals in the ${pattern.vertical} vertical are experiencing the same ${pattern.signalType.replace(/_/g, " ")} pattern.

Signals from across the portfolio:
${signalSummary}

${pattern.competitor ? `Competitor involved: ${pattern.competitor}` : ""}
Number of deals affected: ${pattern.dealIds.length}
Deal names: ${pattern.dealNames.join(", ")}

Provide:
1. A concise synthesis (2-3 sentences) of what's happening across these deals — what's the pattern and why does it matter?
2. 2-3 specific, actionable recommendations for AEs working these deals
3. An estimated ARR impact multiplier (how many times the individual deal ARR is the total portfolio risk)

Return JSON:
{
  "synthesis": "...",
  "recommendations": ["...", "..."],
  "arrImpactMultiplier": 1.5
}
~~~

Where `signalSummary` = multi-line list `- {dealName} ({companyName}): {content}` for each signal in the pattern.

- **Input data sources:** Coordinator actor's in-memory `patterns[]` state, populated by `receiveSignal` from the transcript pipeline.
- **Output format:** `{ synthesis: string, recommendations: string[], arrImpactMultiplier: number }`.
- **Output parsing:** `text.match(/\{[\s\S]*\}/)` + `JSON.parse`; on failure sets `pattern.pushStatus = "failed"`.
- **Downstream effects:**
  - Pattern is enriched with synthesis + recommendations in coordinator state.
  - Coordinator pushes `addCoordinatedIntel()` to each affected deal's `dealAgent` actor — flows into their call prep through `formatMemoryForPrompt()`.
  - Pattern is persisted to `coordinatorPatterns` table via `POST /api/intelligence/persist-pattern` so it survives actor destruction.
  - Visible in Intelligence dashboard's "Agent-Detected Patterns" tab.
- **Known issues:**
  - Empty system prompt is anomalous — all other callers set one.
  - `pattern.dealIds.length` and `pattern.dealNames.join(", ")` — both are plain arrays without FK enforcement (see 02-SCHEMA.md §4.7). Stale deal IDs can persist and show up here.

---

## Prompt Engineering Patterns

### Consistent structures
- **JSON as text.** 24 of 25 prompts instruct "Return JSON only" / "Return ONLY valid JSON" and provide a literal schema block. None use tool_use / structured outputs — every response is parsed as free text.
- **No XML tags.** Not a single prompt uses `<foo>` tag delimiting for sections. Structure is done via Markdown headers (`##`, `═══════`) and `ALL CAPS` section labels inside the prompt.
- **Negative exemplar pattern.** Several prompts include "Good example / Bad example" pairs (prompts #22, #15). This is a recurring technique in the codebase.
- **Prompt numbering.** Some prompts use enumerated rules (`1.`, `2.`, `- `); most mix.
- **Persona framing.** Most prompts open with "You are a/an [X]" — only one deviates (prompt #25 with empty system). Prompts #11, #12 bind the persona to `${rep.name}` to produce rep-specific voice.

### Inconsistencies
- **Transcript truncation limits vary:** 15,000 chars (prompts #19, #20, #21), 12,000 (#23), 8,000 (#22). One deal's transcript analysis by the same pipeline sees different cut-offs for different prompts. Prompt #22 in particular uses a smaller window than the prompts whose output it's synthesizing.
- **Signal type lists drift:** `/api/observations` classifier (prompt #1) lists 9 signal types. Transcript pipeline signal extractor (prompt #21) lists 7 — missing `agent_tuning` and `cross_agent`. Fallback code in `observations/route.ts` lists only 7 matching pipeline.
- **Currency formatting varies:** `$` in prompts #15, #16, #18; `€` in prompts #7, #9, #14. Deal values are stored with a `currency` column but prompts hardcode the symbol.
- **Date formatting varies:** `en-GB` in prompts #11, #12, #14; `en-US`/ISO in prompts #15, #16. Consistency would require a shared helper.
- **Model config inconsistency:** Max tokens range from 200 (prompt #2) to 16,000 (prompt #15). Many prompts don't set max_tokens explicitly, inheriting the helper's 4096 default.
- **Temperature uniformly unset.** No prompt uses temperature — all rely on API defaults (1.0 for Sonnet 4). This means even "structured" prompts sample more broadly than needed.
- **Nesting and fence-strip regex variants.** At least 4 different regex patterns across the codebase for stripping Markdown fences: `/^```(?:json)?\s*/i` + `/\s*```\s*$/`, `/```json\n?/g + /```\n?/g`, `text.match(/\{[\s\S]*\}/)`, and the 3-strategy fallback in prompt #15.
- **Empty system prompt (#25).** Only prompt #25 uses `system: ""`. Every other caller sets one.

### Token budget patterns
- Max-tokens are set defensively on most prompts, but the choices are ad hoc:
  - Tiny (200-300): match / cluster-detect / synthesis (#2, #3, #7, #9, #10).
  - Small (500-1000): config suggestion, email draft, give-back (#4, #12, #18, #24, #25).
  - Medium (1024-2048): field-query analyze, config interpretation, response kit, QBR, outreach (#6, #13, #16, #17, #21).
  - Large (3000+): call-prep brief (#11, 3000), close analysis (#14, 2000), **fitness analysis (#15, 16000)**.
- Fitness analysis at 16K tokens is 8× the next-largest — any truncation silently corrupts the 25-event structure.
- No prompt uses token-streaming except `/api/analyze` (prompt #5) for the standalone transcript analyzer. The pipeline and fitness-analyze jobs block for the full response.

### Error handling patterns
- **Fence-strip + JSON.parse** is the dominant pattern. Errors throw and the caller either catches-and-returns-empty (`/api/deals/close-analysis` returns 200 with empty analysis; `/api/field-queries` falls back to `fallbackAnalysis`) or catches-and-500s.
- **Triple-strategy JSON extraction** (prompt #15) is the most robust pattern in the codebase. Everything else is regex-and-hope.
- **Fallback text ladders** — prompt #9 has per-vertical hardcoded fallback insights (`fallbackGiveBack`). Prompt #24 has a fallback email (`"Thank you for taking the time to meet today."`). These mask Claude outages as degraded but live UX.
- **Silent truncation.** When the model response is clipped by max_tokens, parse fails and the code falls through to `{}` or `[]`. No distinction between "model said nothing matters" and "model was cut off mid-JSON."
- **No retries beyond `callClaude`.** The 7 actor-side prompts retry on 429/500/502/503/529 with exponential backoff. All 18 SDK-side prompts do not retry — a single 429 kills the Claude call entirely.

### Gaps vs. DECISIONS.md Guardrails
- **Guardrail #4 (prompts as .md files):** Violated universally. All 25 prompts are template-literal string concatenation inside TypeScript route handlers. Refactoring the prompt to a .md file without breaking any interpolation would be Codex's first "preserve prompts verbatim" task.
- **Guardrail #1 (research-interview pattern):** Prompt #1 implements it for observations. Prompt #14 (close analysis) partially implements it (returns dynamic chips + dynamic questions). Others are form-completion patterns that the guardrail says should move toward the research-interview style.
- **Guardrail #8 (Nexus Intelligence voice):** Prompts mostly succeed ("AI sales intelligence analyst", "AI agent preparing a call brief") but some frame themselves as a person ("You are a deal strategist", "a sales email writer", "Sarah Chen" sign-offs in prompt #18). Needs audit to make voice consistent.

### Summary
- **Total Claude call sites:** 25 (confirmed match with 01-INVENTORY.md §6).
- **Model:** single version across all 25 — `claude-sonnet-4-20250514`.
- **Longest prompt:** #15 (Deal Fitness Analysis) at ~250 lines including 25-event definitions.
- **Most expensive prompt by default token budget:** #15 at 16K output.
- **Prompts preserved verbatim here:** all 25.

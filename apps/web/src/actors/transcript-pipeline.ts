import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";
import {
  validateSignal,
  validateLearnings,
  validateMeddpiccScore,
  normalizeCompetitorName,
  findCompetitorInText,
  type ValidatedSignal,
} from "@/lib/validation";
import { callClaude } from "./claude-api";

// ── Types ──

interface ActiveExperiment {
  id: string;
  title: string;
  hypothesis: string;
  category: string;
  existingEvidence: unknown;
}

interface PipelineInput {
  dealId: string;
  transcriptText: string;
  transcriptId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  currentMeddpicc: Record<string, unknown> | null;
  existingContacts: Array<{ name: string; title: string; role: string }>;
  agentConfigInstructions: string;
  assignedAeId: string;
  assignedAeName: string;
  appUrl: string;
  activeExperiments?: ActiveExperiment[];
}

interface ActionItem {
  item: string;
  owner: string;
  deadline?: string;
}

interface MeddpiccUpdate {
  score: number;
  evidence: string;
  delta: number;
}

interface DetectedSignal {
  type: string;
  content: string;
  context: string;
  urgency: string;
  source_speaker: string;
  quote: string;
}

interface StakeholderInsight {
  name: string;
  title?: string;
  sentiment: string;
  engagement: string;
  keyPriorities: string[];
  concerns: string[];
  notableQuotes: string[];
}

interface ExperimentAttribution {
  experimentId: string;
  evidenceFound: boolean;
  tacticUsed: boolean;
  evidence: string;
  customerResponse: string;
  sentiment: string;
}

export interface TranscriptPipelineState {
  dealId: string;
  status: "idle" | "running" | "complete" | "error";
  currentStep: string;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  actionItems: ActionItem[];
  meddpiccUpdates: Record<string, MeddpiccUpdate>;
  detectedSignals: DetectedSignal[];
  stakeholderInsights: StakeholderInsight[];
  newLearnings: string[];
  followUpEmail: { subject: string; body: string } | null;
  experimentAttributions: ExperimentAttribution[];
}


function parseJSON<T>(text: string, fallback: T): T {
  // Strategy 1: Extract from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (e) {
      console.log(`[pipeline] parseJSON fence extraction failed: ${(e as Error).message}`);
    }
  }

  // Strategy 2: Find outermost { ... } or [ ... ]
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch (e) {
      console.log(`[pipeline] parseJSON brace extraction failed: ${(e as Error).message}`);
    }
  }

  // Strategy 3: Try raw text directly
  try {
    return JSON.parse(text.trim());
  } catch {}

  // Strategy 4: Try to repair truncated JSON (close open brackets/braces)
  if (braceMatch) {
    try {
      let json = braceMatch[0];
      // Count open/close brackets and braces
      let openBraces = 0, openBrackets = 0;
      let inString = false, escape = false;
      for (const ch of json) {
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === "{") openBraces++;
        if (ch === "}") openBraces--;
        if (ch === "[") openBrackets++;
        if (ch === "]") openBrackets--;
      }
      // If we're inside a string, close it
      if (inString) json += '"';
      // Close any unclosed arrays and objects
      while (openBrackets > 0) { json += "]"; openBrackets--; }
      while (openBraces > 0) { json += "}"; openBraces--; }
      const repaired = JSON.parse(json);
      console.log("[pipeline] parseJSON repaired truncated JSON successfully");
      return repaired;
    } catch (e2) {
      console.log(`[pipeline] parseJSON repair failed: ${(e2 as Error).message}`);
    }
  }

  console.log(`[pipeline] parseJSON all strategies failed, text length: ${text.length}, first 200: "${text.substring(0, 200)}"`);
  return fallback;
}

// ── Helpers ──

function findCompetitorInSignal(signal: ValidatedSignal): string | null {
  if (signal.competitor) return signal.competitor; // already normalized by validateSignal
  return findCompetitorInText(signal.content);
}

// ── Actor Definition ──

export const transcriptPipeline = actor({
  state: {
    dealId: "",
    status: "idle" as TranscriptPipelineState["status"],
    currentStep: "",
    startedAt: null as string | null,
    completedAt: null as string | null,
    error: null as string | null,
    actionItems: [] as ActionItem[],
    meddpiccUpdates: {} as Record<string, MeddpiccUpdate>,
    detectedSignals: [] as DetectedSignal[],
    stakeholderInsights: [] as StakeholderInsight[],
    newLearnings: [] as string[],
    followUpEmail: null as { subject: string; body: string } | null,
    experimentAttributions: [] as ExperimentAttribution[],
  },

  queues: {
    process: queue<PipelineInput>(),
  },

  actions: {
    getState: (c) => c.state,
    destroyActor: (c) => { c.destroy(); },
  },

  run: workflow(async (ctx) => {
    await ctx.loop("pipeline-loop", async (loopCtx) => {
      const message = await loopCtx.queue.next("wait-process", {
        names: ["process"],
      });
      const input = message.body as PipelineInput;

      // Helper: get deal agent handle (must be called inside steps)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getDealActor = () => (loopCtx.client() as any).dealAgent.getOrCreate([input.dealId]);

      await loopCtx.step("init-pipeline", async () => {
        loopCtx.state.dealId = input.dealId;
        loopCtx.state.status = "running";
        loopCtx.state.startedAt = new Date().toISOString();
        loopCtx.state.completedAt = null;
        loopCtx.state.error = null;
        loopCtx.state.actionItems = [];
        loopCtx.state.meddpiccUpdates = {};
        loopCtx.state.detectedSignals = [];
        loopCtx.state.stakeholderInsights = [];
        loopCtx.state.newLearnings = [];
        loopCtx.state.followUpEmail = null;
        loopCtx.state.experimentAttributions = [];
      });

      let currentStepName = "init-pipeline";
      try {
      try {
        // STEP 1: Parallel analysis — extract actions, score MEDDPICC, detect signals simultaneously
        currentStepName = "parallel_analysis";
        const parallelResults = await loopCtx.step({ name: "parallel-analysis", timeout: 180_000, run: async () => {
          loopCtx.state.currentStep = "parallel_analysis";
          await getDealActor().workflowProgress({ step: "parallel_analysis", status: "running" });

          const currentScores = input.currentMeddpicc
            ? Object.entries(input.currentMeddpicc)
                .filter(([k]) => k.endsWith("Confidence"))
                .map(([k, v]) => `${k.replace("Confidence", "")}: ${v ?? 0}`)
                .join(", ")
            : "No existing scores";

          const contactsCtx = input.existingContacts
            .map((c) => `${c.name} (${c.title}, ${c.role})`)
            .join("; ");

          const [actionsRaw, meddpiccRaw, signalsRaw] = await Promise.all([
            // Call 1: Extract actions
            callClaude({
              system: "You are a sales call analyst. Extract all action items, commitments, and key decisions from the transcript. Return valid JSON only — no markdown, no explanation.",
              userMessage: `Extract action items from this call transcript between ${input.companyName} and our sales team.

Return JSON: { "actionItems": [{ "item": "description", "owner": "person name", "deadline": "if mentioned or null" }] }

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`,
            }),
            // Call 2: Score MEDDPICC
            callClaude({
              system: "You are a MEDDPICC scoring expert for enterprise sales. Analyze the transcript against the MEDDPICC framework. Only update dimensions where the transcript provides NEW evidence. Return valid JSON only.",
              userMessage: `Score this call transcript against MEDDPICC. Current scores: ${currentScores}

For each dimension where new evidence exists, provide:
- score: confidence 0-100
- evidence: quote or observation from the transcript
- delta: change from current score (positive or negative)

Dimensions: metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion, competition

Return JSON: { "updates": { "dimensionName": { "score": number, "evidence": "string", "delta": number } } }
Only include dimensions with new evidence.

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`,
            }),
            // Call 3: Detect signals
            callClaude({
              system: `You are analyzing a sales call transcript for a deal in the ${input.vertical} vertical. Extract every meaningful signal from this conversation.

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

Only include signals where there is clear evidence in the transcript. Do not invent or infer signals that aren't supported by what was said.`,
              userMessage: `Analyze this transcript for ${input.dealName} at ${input.companyName} (${input.vertical}).

Known contacts: ${contactsCtx || "None specified"}

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`,
              maxTokens: 2048,
            }),
          ]);

          // Parse actions
          const parsedActions = parseJSON<{ actionItems: ActionItem[] }>(actionsRaw, { actionItems: [] });
          loopCtx.state.actionItems = parsedActions.actionItems;

          // Parse and validate MEDDPICC
          const parsedMeddpicc = parseJSON<{ updates: Record<string, MeddpiccUpdate> }>(meddpiccRaw, { updates: {} });
          for (const [field, update] of Object.entries(parsedMeddpicc.updates)) {
            if (!update) continue;
            const validated = validateMeddpiccScore(field, update.score, update.evidence);
            update.score = validated.score;
            update.evidence = validated.evidence;
          }
          loopCtx.state.meddpiccUpdates = parsedMeddpicc.updates;

          // Parse and validate signals
          const parsedSignals = parseJSON<{
            signals: DetectedSignal[];
            stakeholderInsights: StakeholderInsight[];
          }>(signalsRaw, { signals: [], stakeholderInsights: [] });

          const contactNames = input.existingContacts.map((c) => c.name);
          const validatedSignals = parsedSignals.signals
            .map((s) => validateSignal(s, contactNames))
            .filter((s): s is ValidatedSignal => s !== null);

          console.log(
            `[pipeline] Signal validation: ${parsedSignals.signals.length} raw → ${validatedSignals.length} validated`
          );

          loopCtx.state.detectedSignals = validatedSignals as DetectedSignal[];
          loopCtx.state.stakeholderInsights = parsedSignals.stakeholderInsights;

          const updatedMeddpiccFields = Object.keys(parsedMeddpicc.updates).filter((k) => {
            const entry = parsedMeddpicc.updates[k];
            return entry && (entry.delta !== 0 || entry.score > 0);
          });

          await getDealActor().workflowProgress({
            step: "parallel_analysis",
            status: "complete",
            details: `${parsedActions.actionItems.length} actions, ${updatedMeddpiccFields.length} fields, ${validatedSignals.length} signals`,
          });

          return {
            actions: parsedActions.actionItems,
            meddpicc: parsedMeddpicc.updates,
            signals: { signals: validatedSignals, stakeholderInsights: parsedSignals.stakeholderInsights },
          };
        }});

        const typedResults = parallelResults as {
          actions: ActionItem[];
          meddpicc: Record<string, MeddpiccUpdate>;
          signals: { signals: ValidatedSignal[]; stakeholderInsights: StakeholderInsight[] };
        };
        const actions = typedResults.actions;
        const meddpicc = typedResults.meddpicc;
        const signals = typedResults.signals;

        // Persist MEDDPICC updates to Supabase + create observations
        // Include fields with score > 0, not just delta !== 0 — handles first-time MEDDPICC creation
        const updatedFields = Object.keys(meddpicc).filter((k) => {
          const entry = meddpicc[k];
          return entry && (entry.delta !== 0 || entry.score > 0);
        });
        currentStepName = "update_scores";
        await loopCtx.step("progress-update-scores-start", async () => {
          await getDealActor().workflowProgress({ step: "update_scores", status: "running" });
        });

        if (updatedFields.length > 0) {
          await loopCtx.step("persist-meddpicc", async () => {
            try {
              const resp = await fetch(`${input.appUrl}/api/deals/${input.dealId}/meddpicc-update`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates: meddpicc }),
              });
              if (!resp.ok) {
                const body = await resp.text();
                console.error(`[pipeline] MEDDPICC persist failed (${resp.status}): ${body}`);
              }
            } catch (e) {
              console.error("[pipeline] Failed to persist MEDDPICC updates:", e);
            }
          });
        }

        // Create observations for ALL detected signals (fire-and-forget, don't block pipeline)
        if (signals.signals.length > 0) {
          await loopCtx.step("create-signal-observations", async () => {
            console.log(`[pipeline] Creating observations for ${signals.signals.length} signals`);
            // Fire all observation creates in parallel, don't await individually
            const promises = signals.signals.map((signal) =>
              fetch(`${input.appUrl}/api/observations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  rawInput: signal.content,
                  context: {
                    page: "pipeline",
                    dealId: input.dealId,
                    trigger: "transcript_pipeline",
                    transcriptId: input.transcriptId,
                    signalType: signal.type,
                    urgency: signal.urgency,
                    sourceSpeaker: signal.source_speaker,
                  },
                  observerId: input.assignedAeId,
                  preClassified: true,
                  signalType: signal.type,
                  severity: signal.urgency,
                  aiClassification: {
                    signals: [{
                      type: signal.type,
                      confidence: 0.9,
                      summary: signal.content,
                      ...(signal.type === "competitive_intel" && findCompetitorInSignal(signal as ValidatedSignal)
                        ? { competitor_name: findCompetitorInSignal(signal as ValidatedSignal) }
                        : {}),
                    }],
                    sentiment: "neutral",
                    urgency: signal.urgency || "medium",
                    sensitivity: "normal",
                    entities: [],
                    linked_accounts: [],
                    linked_deals: [],
                    needs_clarification: false,
                  },
                }),
              }).catch((e) => {
                console.error(`Failed to create observation for signal: ${signal.type}`, e);
              })
            );
            await Promise.all(promises);
            console.log(`[pipeline] All observation creates finished`);
          });
        }

        await loopCtx.step("progress-update-scores-done", async () => {
          await getDealActor().workflowProgress({
            step: "update_scores",
            status: "complete",
            details: `${updatedFields.length} MEDDPICC fields, ${signals.signals.length} observations`,
          });
        });

        // STEP 4: Synthesize learnings for the deal agent
        currentStepName = "synthesize_learnings";
        console.log("[pipeline] Starting synthesize-learnings step");
        const synthesis = await loopCtx.step("synthesize-learnings", async () => {
          loopCtx.state.currentStep = "synthesize_learnings";
          await getDealActor().workflowProgress({ step: "synthesize_learnings", status: "running" });

          const raw = await callClaude({
            system: "You are a deal strategist. Synthesize the transcript analysis into key learnings. Return valid JSON only.",
            userMessage: `Based on this transcript analysis for ${input.dealName} at ${input.companyName} (${input.vertical}), identify the key learnings that should inform future interactions.

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
${input.transcriptText.slice(0, 8000)}`,
          });
          const parsed = parseJSON<{ learnings: string[] }>(raw, { learnings: [] });
          const validatedLearnings = validateLearnings(parsed.learnings);
          console.log(
            `[pipeline] Learning validation: ${parsed.learnings.length} raw → ${validatedLearnings.length} validated`
          );
          loopCtx.state.newLearnings = validatedLearnings;

          await getDealActor().workflowProgress({
            step: "synthesize_learnings",
            status: "complete",
            details: `${parsed.learnings.length} new learnings`,
          });
          return parsed.learnings;
        });

        // STEP 4b: Check active experiments for attribution
        const experiments = input.activeExperiments || [];
        if (experiments.length > 0) {
          await loopCtx.step("progress-check-experiments-start", async () => {
            await getDealActor().workflowProgress({ step: "check_experiments", status: "running" });
          });
          currentStepName = "check_experiments";
          await loopCtx.step("check-experiments", async () => {
            loopCtx.state.currentStep = "check_experiments";

            const raw = await callClaude({
              system: `You are checking whether a sales call transcript contains evidence relevant to active A/B experiments.

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

Only include experiments where you found clear evidence. Do not guess.`,
              userMessage: `Analyze this transcript for experiment evidence.

TRANSCRIPT:
${input.transcriptText.slice(0, 12000)}`,
            });
            const parsed = parseJSON<{ attributions: ExperimentAttribution[] }>(raw, { attributions: [] });
            loopCtx.state.experimentAttributions = parsed.attributions;

            // Update experiments with new evidence
            for (const attr of parsed.attributions) {
              if (!attr.evidenceFound) continue;
              try {
                const currentExp = experiments.find((e) => e.id === attr.experimentId);
                if (!currentExp) continue;

                const existingEvidence = (currentExp.existingEvidence as Array<unknown>) || [];
                const newEvidence = [
                  ...existingEvidence,
                  {
                    dealId: input.dealId,
                    dealName: input.dealName,
                    date: new Date().toISOString(),
                    source: "transcript_analysis",
                    tacticUsed: attr.tacticUsed,
                    evidence: attr.evidence,
                    customerResponse: attr.customerResponse,
                    sentiment: attr.sentiment,
                  },
                ];

                await fetch(`${input.appUrl}/api/playbook/ideas/${attr.experimentId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    experiment_evidence: newEvidence,
                  }),
                });
              } catch (e) {
                console.error(`Failed to update experiment ${attr.experimentId}:`, e);
              }
            }
          });
          await loopCtx.step("progress-check-experiments-done", async () => {
            await getDealActor().workflowProgress({
              step: "check_experiments",
              status: "complete",
              details: `${loopCtx.state.experimentAttributions.filter((a) => a.evidenceFound).length} experiments matched`,
            });
          });
        } else {
          // No experiments to check — mark step as complete (skipped)
          await loopCtx.step("progress-check-experiments-skip", async () => {
            await getDealActor().workflowProgress({ step: "check_experiments", status: "complete", details: "No active experiments" });
          });
        }

        // FINALIZE: draft email + update deal agent + send signals + auto-call-prep
        currentStepName = "finalize";
        await loopCtx.step("progress-finalize-start", async () => {
          await getDealActor().workflowProgress({ step: "finalize", status: "running" });
        });

        // STEP 5: Draft follow-up email (graceful — pipeline continues if this fails)
        currentStepName = "draft_email";
        console.log("[pipeline] Starting draft-email step");
        await loopCtx.step("draft-email", async () => {
          try {
            loopCtx.state.currentStep = "draft_email";

            const raw = await callClaude({
              system: "You are a sales email writer. Draft a professional follow-up email incorporating key action items from the call. Return valid JSON only.",
              userMessage: `Draft a follow-up email after a call with ${input.companyName} regarding ${input.dealName}.

Action items: ${JSON.stringify(actions)}
Key stakeholders: ${JSON.stringify(signals.stakeholderInsights.map((s) => s.name))}
${input.agentConfigInstructions ? `Rep's communication style preferences: ${input.agentConfigInstructions}` : ""}

Return JSON: { "subject": "email subject line", "body": "full email body text" }
Keep it professional, concise, and reference specific commitments from the call.`,
            });
            const parsed = parseJSON<{ subject: string; body: string }>(raw, {
              subject: `Follow-up: ${input.dealName} Discussion`,
              body: "Thank you for taking the time to meet today.",
            });
            loopCtx.state.followUpEmail = parsed;
          } catch (error) {
            console.error('[pipeline] Draft email failed, continuing:', error);
            loopCtx.state.followUpEmail = null;
          }
        });

        // FINALIZE STEP 1: Update deal agent with accumulated intelligence
        currentStepName = "update_deal_agent";
        console.log("[pipeline] Starting update-deal-agent step");
        await loopCtx.step("update-deal-agent", async () => {
          const dealActor = getDealActor();
          await dealActor.recordInteraction({
            type: "transcript_analysis",
            summary: `Analyzed call transcript: ${actions.length} action items, ${updatedFields.length} MEDDPICC updates, ${signals.signals.length} signals detected`,
            insights: synthesis,
          });

          await dealActor.updateLearnings(synthesis);

          // Update competitive intel from validated competitive mentions
          const competitiveMentions = signals.signals.filter(
            (s) => s.type === "competitive_intel"
          );
          for (const mention of competitiveMentions) {
            const competitor = findCompetitorInSignal(mention as ValidatedSignal);
            if (competitor) {
              console.log(`[pipeline] Competitor extracted: ${competitor}`);
              await dealActor.addCompetitiveIntel({
                competitor,
                context: mention.content,
              });
            } else {
              console.log(
                `[pipeline] No valid competitor found in signal, skipping addCompetitiveIntel`
              );
            }
          }

          // Add risk signals from deal blockers and high-urgency process friction
          const riskSignals = signals.signals.filter(
            (s) => s.type === "deal_blocker" || (s.type === "process_friction" && s.urgency === "high")
          );
          for (const risk of riskSignals) {
            await dealActor.addRiskSignal(
              risk.type === "deal_blocker" ? "blocker_detected" : "process_friction",
              risk.content
            );
          }

          // Record stakeholder engagement in deal agent
          for (const stakeholder of signals.stakeholderInsights) {
            const matchedContact = input.existingContacts.find(
              (c) =>
                c.name.toLowerCase().includes(stakeholder.name.toLowerCase()) ||
                stakeholder.name.toLowerCase().includes(c.name.split(" ")[0].toLowerCase())
            );
            if (matchedContact) {
              await dealActor.recordInteraction({
                type: "observation",
                summary: `${stakeholder.name}: sentiment ${stakeholder.sentiment}, engagement ${stakeholder.engagement}. Priorities: ${stakeholder.keyPriorities.join(", ")}`,
              });
            }
          }
          console.log("[pipeline] Deal agent updated with intelligence");
        });

        // FINALIZE STEP 1b: Send signals to intelligence coordinator (separate step for durability)
        await loopCtx.step({ name: "send-signals-to-coordinator", timeout: 180_000, run: async () => {
          try {
            const detectedSignals = loopCtx.state.detectedSignals || [];
            console.log(`[pipeline-coordinator] Preparing to send ${detectedSignals.length} signals`);
            if (detectedSignals.length === 0) {
              console.log("[pipeline-coordinator] No signals to send to coordinator");
              return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const coordClient = loopCtx.client() as any;
            const coordinator = coordClient.intelligenceCoordinator.getOrCreate(["default"]);

            for (const signal of detectedSignals) {
              const competitor =
                signal.type === "competitive_intel"
                  ? findCompetitorInSignal(signal as ValidatedSignal)
                  : undefined;

              console.log(`[pipeline-coordinator] Signal sent: ${signal.type} for ${input.dealName}${competitor ? ` (competitor: ${competitor})` : ""}`);
              await coordinator.receiveSignal({
                id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                dealId: input.dealId,
                dealName: input.dealName,
                companyName: input.companyName,
                vertical: input.vertical,
                signalType: signal.type,
                content: signal.content,
                competitor: competitor ?? undefined,
                urgency: signal.urgency || "medium",
                receivedAt: new Date().toISOString(),
                sourceAeId: input.assignedAeId || "",
                sourceAeName: input.assignedAeName || "",
              });
            }

            console.log(
              `[pipeline-coordinator] All ${detectedSignals.length} signals sent to intelligence coordinator`
            );
          } catch (e) {
            console.error(
              "[pipeline-coordinator] ERROR:",
              e
            );
          }
        }});

        // FINALIZE STEP 2: Flag brief for client-side generation (decoupled from pipeline)
        // Previously this step called /api/agent/call-prep directly from the pipeline actor,
        // which created a Rivet Cloud → Vercel → Claude chain that timed out on production.
        // Now we just set a flag — the deal detail page generates the brief client-side.
        currentStepName = "flag_brief_pending";
        console.log("[pipeline] Setting briefPending flag on deal agent (decoupled from pipeline)");
        await loopCtx.step("flag-brief-pending", async () => {
          try {
            const dealActor = getDealActor();
            await dealActor.setBriefPending(true);
            console.log("[pipeline] briefPending flag set — brief will generate on next page load");
          } catch (error) {
            console.error('[pipeline] Failed to set briefPending flag, continuing:', error);
          }
        });

        // FINALIZE STEP 3: Analyze deal fitness (oDeal framework)
        currentStepName = "analyze_deal_fitness";
        await loopCtx.step({ name: "analyze-deal-fitness", timeout: 180_000, run: async () => {
          try {
            console.log("[pipeline] Running deal fitness analysis (oDeal framework)...");
            await getDealActor().workflowProgress({ step: "deal_fitness", status: "running" });
            const fitnessResp = await fetch(`${input.appUrl}/api/deal-fitness/analyze`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dealId: input.dealId, transcriptId: input.transcriptId }),
            });
            if (fitnessResp.ok) {
              const result = await fitnessResp.json();
              console.log(`[pipeline] Deal Fitness: ${result.eventsDetected} events detected, overall ${result.scores?.overall}%`);
              await getDealActor().workflowProgress({ step: "deal_fitness", status: "complete", details: `${result.eventsDetected} events, ${result.scores?.overall}% fitness` });
            } else {
              const errText = await fitnessResp.text();
              console.error("[pipeline] Deal fitness analysis returned non-OK:", fitnessResp.status, errText.substring(0, 200));
              await getDealActor().workflowProgress({ step: "deal_fitness", status: "complete", details: "Skipped (non-blocking)" });
            }
          } catch (e) {
            console.error("[pipeline] Deal fitness analysis failed (non-blocking):", e);
            try {
              await getDealActor().workflowProgress({ step: "deal_fitness", status: "complete", details: "Skipped (non-blocking)" });
            } catch {}
          }
        }});

        // FINALIZE STEP 4: Mark pipeline complete
        await loopCtx.step("mark-complete", async () => {
          loopCtx.state.status = "complete";
          loopCtx.state.completedAt = new Date().toISOString();
          await getDealActor().workflowProgress({ step: "finalize", status: "complete", details: "Pipeline complete" });
          console.log("[pipeline] Pipeline complete!");
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[pipeline] ERROR at step ${currentStepName}:`, errorMsg, error);
        await loopCtx.step("handle-error", async () => {
          loopCtx.state.status = "error";
          loopCtx.state.error = errorMsg;
          try {
            await getDealActor().workflowProgress({
              step: currentStepName,
              status: "error",
              details: errorMsg,
            });
          } catch {}
        });
      }
      } catch (fatalError) {
        console.error('[pipeline] FATAL:', fatalError);
      }
    });
  }),
});

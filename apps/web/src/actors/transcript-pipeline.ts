import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";

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

// ── Claude API helper ──

const MODEL = "claude-sonnet-4-20250514";

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  return textBlock?.text || "";
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    // Extract JSON from possible markdown code fences
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    return JSON.parse(jsonMatch[1]!.trim());
  } catch {
    return fallback;
  }
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

      try {
        // STEP 1: Extract action items and commitments
        const actions = await loopCtx.step("extract-actions", async () => {
          loopCtx.state.currentStep = "extract_actions";
          await getDealActor().workflowProgress({ step: "extract_actions", status: "running" });

          const raw = await callClaude(
            "You are a sales call analyst. Extract all action items, commitments, and key decisions from the transcript. Return valid JSON only — no markdown, no explanation.",
            `Extract action items from this call transcript between ${input.companyName} and our sales team.

Return JSON: { "actionItems": [{ "item": "description", "owner": "person name", "deadline": "if mentioned or null" }] }

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`
          );
          const parsed = parseJSON<{ actionItems: ActionItem[] }>(raw, { actionItems: [] });
          loopCtx.state.actionItems = parsed.actionItems;

          await getDealActor().workflowProgress({
            step: "extract_actions",
            status: "complete",
            details: `${parsed.actionItems.length} action items found`,
          });
          return parsed.actionItems;
        });

        // STEP 2: Score MEDDPICC with evidence
        const meddpicc = await loopCtx.step("score-meddpicc", async () => {
          loopCtx.state.currentStep = "score_meddpicc";
          await getDealActor().workflowProgress({ step: "score_meddpicc", status: "running" });

          const currentScores = input.currentMeddpicc
            ? Object.entries(input.currentMeddpicc)
                .filter(([k]) => k.endsWith("Confidence"))
                .map(([k, v]) => `${k.replace("Confidence", "")}: ${v ?? 0}`)
                .join(", ")
            : "No existing scores";

          const raw = await callClaude(
            "You are a MEDDPICC scoring expert for enterprise sales. Analyze the transcript against the MEDDPICC framework. Only update dimensions where the transcript provides NEW evidence. Return valid JSON only.",
            `Score this call transcript against MEDDPICC. Current scores: ${currentScores}

For each dimension where new evidence exists, provide:
- score: confidence 0-100
- evidence: quote or observation from the transcript
- delta: change from current score (positive or negative)

Dimensions: metrics, economicBuyer, decisionCriteria, decisionProcess, identifyPain, champion, competition

Return JSON: { "updates": { "dimensionName": { "score": number, "evidence": "string", "delta": number } } }
Only include dimensions with new evidence.

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`
          );
          const parsed = parseJSON<{ updates: Record<string, MeddpiccUpdate> }>(raw, { updates: {} });
          loopCtx.state.meddpiccUpdates = parsed.updates;

          const updatedFields = Object.keys(parsed.updates).filter((k) => parsed.updates[k]?.delta !== 0);
          await getDealActor().workflowProgress({
            step: "score_meddpicc",
            status: "complete",
            details: `${updatedFields.length} fields updated`,
          });
          return parsed.updates;
        });

        // Persist MEDDPICC updates to Supabase
        const updatedFields = Object.keys(meddpicc).filter((k) => meddpicc[k]?.delta !== 0);
        if (updatedFields.length > 0) {
          await loopCtx.step("persist-meddpicc", async () => {
            try {
              await fetch(`${input.appUrl}/api/deals/${input.dealId}/meddpicc-update`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates: meddpicc }),
              });
            } catch (e) {
              console.error("Failed to persist MEDDPICC updates:", e);
            }
          });
        }

        // STEP 3: Detect ALL signal types + stakeholder sentiment
        const signals = await loopCtx.step("detect-signals", async () => {
          loopCtx.state.currentStep = "detect_signals";
          await getDealActor().workflowProgress({ step: "detect_signals", status: "running" });

          const contactsCtx = input.existingContacts
            .map((c) => `${c.name} (${c.title}, ${c.role})`)
            .join("; ");

          const raw = await callClaude(
            `You are analyzing a sales call transcript for a deal in the ${input.vertical} vertical. Extract every meaningful signal from this conversation.

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
            `Analyze this transcript for ${input.dealName} at ${input.companyName} (${input.vertical}).

Known contacts: ${contactsCtx || "None specified"}

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`
          );
          const parsed = parseJSON<{
            signals: DetectedSignal[];
            stakeholderInsights: StakeholderInsight[];
          }>(raw, { signals: [], stakeholderInsights: [] });

          loopCtx.state.detectedSignals = parsed.signals;
          loopCtx.state.stakeholderInsights = parsed.stakeholderInsights;

          await getDealActor().workflowProgress({
            step: "detect_signals",
            status: "complete",
            details: `${parsed.signals.length} signals, ${parsed.stakeholderInsights.length} stakeholders`,
          });
          return parsed;
        });

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
                  rawInput: `[From transcript] ${signal.content}`,
                  context: {
                    page: "pipeline",
                    dealId: input.dealId,
                    trigger: "transcript_pipeline",
                    signalType: signal.type,
                    urgency: signal.urgency,
                    sourceSpeaker: signal.source_speaker,
                  },
                  observerId: input.assignedAeId,
                }),
              }).catch((e) => {
                console.error(`Failed to create observation for signal: ${signal.type}`, e);
              })
            );
            await Promise.all(promises);
            console.log(`[pipeline] All observation creates finished`);
          });
        }

        // STEP 4: Synthesize learnings for the deal agent
        console.log("[pipeline] Starting synthesize-learnings step");
        const synthesis = await loopCtx.step("synthesize-learnings", async () => {
          loopCtx.state.currentStep = "synthesize_learnings";
          await getDealActor().workflowProgress({ step: "synthesize_learnings", status: "running" });

          const raw = await callClaude(
            "You are a deal strategist. Synthesize the transcript analysis into key learnings that should inform future interactions. Return valid JSON only.",
            `Based on this transcript analysis for ${input.dealName} at ${input.companyName} (${input.vertical}), what are the key learnings?

Action items found: ${JSON.stringify(actions)}
MEDDPICC updates: ${JSON.stringify(meddpicc)}
Signals detected: ${JSON.stringify(signals.signals)}
Stakeholder insights: ${JSON.stringify(signals.stakeholderInsights)}

Return JSON: { "learnings": ["concise actionable learning statement 1", "learning 2", ...] }
Focus on: stakeholder preferences, decision criteria, competitive positioning, relationship dynamics, process obstacles.
Maximum 5 learnings.

TRANSCRIPT:
${input.transcriptText.slice(0, 8000)}`
          );
          const parsed = parseJSON<{ learnings: string[] }>(raw, { learnings: [] });
          loopCtx.state.newLearnings = parsed.learnings;

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
          await loopCtx.step("check-experiments", async () => {
            loopCtx.state.currentStep = "check_experiments";

            const raw = await callClaude(
              `You are checking whether a sales call transcript contains evidence relevant to active A/B experiments.

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
              `Analyze this transcript for experiment evidence.

TRANSCRIPT:
${input.transcriptText.slice(0, 12000)}`
            );
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
        }

        // STEP 5: Draft follow-up email
        console.log("[pipeline] Starting draft-email step");
        await loopCtx.step("draft-email", async () => {
          loopCtx.state.currentStep = "draft_email";
          await getDealActor().workflowProgress({ step: "draft_email", status: "running" });

          const raw = await callClaude(
            "You are a sales email writer. Draft a professional follow-up email incorporating key action items from the call. Return valid JSON only.",
            `Draft a follow-up email after a call with ${input.companyName} regarding ${input.dealName}.

Action items: ${JSON.stringify(actions)}
Key stakeholders: ${JSON.stringify(signals.stakeholderInsights.map((s) => s.name))}
${input.agentConfigInstructions ? `Rep's communication style preferences: ${input.agentConfigInstructions}` : ""}

Return JSON: { "subject": "email subject line", "body": "full email body text" }
Keep it professional, concise, and reference specific commitments from the call.`
          );
          const parsed = parseJSON<{ subject: string; body: string }>(raw, {
            subject: `Follow-up: ${input.dealName} Discussion`,
            body: "Thank you for taking the time to meet today.",
          });
          loopCtx.state.followUpEmail = parsed;

          await getDealActor().workflowProgress({
            step: "draft_email",
            status: "complete",
            details: "Email draft ready",
          });
        });

        // FINALIZE STEP 1: Update deal agent with accumulated intelligence
        console.log("[pipeline] Starting update-deal-agent step");
        await loopCtx.step("update-deal-agent", async () => {
          const dealActor = getDealActor();
          await dealActor.recordInteraction({
            type: "transcript_analysis",
            summary: `Analyzed call transcript: ${actions.length} action items, ${updatedFields.length} MEDDPICC updates, ${signals.signals.length} signals detected`,
            insights: synthesis,
          });

          await dealActor.updateLearnings(synthesis);

          // Update competitive intel from all competitive mentions
          const competitiveMentions = signals.signals.filter((s) => s.type === "competitive_intel");
          for (const mention of competitiveMentions) {
            await dealActor.addCompetitiveIntel({
              competitor: mention.source_speaker || "Unknown",
              context: mention.content,
            });
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

        // FINALIZE STEP 2: Auto-generate call prep (separate step — this calls Claude and can take 20s+)
        console.log("[pipeline] Starting auto-call-prep step");
        await loopCtx.step({ name: "auto-call-prep", timeout: 60000, run: async () => {
          try {
            const prepResponse = await fetch(`${input.appUrl}/api/agent/call-prep`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealId: input.dealId,
                memberId: input.assignedAeId,
                prepContext: "follow_up",
                autoGenerated: true,
              }),
            });

            if (prepResponse.ok) {
              const briefData = await prepResponse.json();
              const dealActor = getDealActor();
              await dealActor.setBriefReady({
                brief: briefData.brief,
                generatedAt: new Date().toISOString(),
                context: "post_transcript_analysis",
              });
              console.log("[pipeline] Brief ready set on deal agent");
            } else {
              console.error("[pipeline] Call prep returned", prepResponse.status);
            }
          } catch (e) {
            console.error("[pipeline] Failed to auto-generate call prep:", e);
          }
        }});

        // FINALIZE STEP 3: Mark pipeline complete
        await loopCtx.step("mark-complete", async () => {
          loopCtx.state.status = "complete";
          loopCtx.state.completedAt = new Date().toISOString();
          console.log("[pipeline] Pipeline complete!");
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[pipeline] ERROR at step ${loopCtx.state.currentStep}:`, errorMsg, error);
        await loopCtx.step("handle-error", async () => {
          loopCtx.state.status = "error";
          loopCtx.state.error = errorMsg;
          try {
            await getDealActor().workflowProgress({
              step: loopCtx.state.currentStep,
              status: "error",
              details: errorMsg,
            });
          } catch {}
        });
      }
    });
  }),
});

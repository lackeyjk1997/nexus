import { actor, queue } from "rivetkit";
import { workflow } from "rivetkit/workflow";

// ── Types ──

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

interface CompetitiveMention {
  competitor: string;
  context: string;
  sentiment: string;
}

interface StakeholderInsight {
  name: string;
  sentiment: string;
  keyQuotes: string[];
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
  competitiveMentions: CompetitiveMention[];
  stakeholderInsights: StakeholderInsight[];
  newLearnings: string[];
  followUpEmail: { subject: string; body: string } | null;
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
    competitiveMentions: [] as CompetitiveMention[],
    stakeholderInsights: [] as StakeholderInsight[],
    newLearnings: [] as string[],
    followUpEmail: null as { subject: string; body: string } | null,
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

      await loopCtx.step("init-pipeline", async () => {
        ctx.state.dealId = input.dealId;
        ctx.state.status = "running";
        ctx.state.startedAt = new Date().toISOString();
        ctx.state.completedAt = null;
        ctx.state.error = null;
        ctx.state.actionItems = [];
        ctx.state.meddpiccUpdates = {};
        ctx.state.competitiveMentions = [];
        ctx.state.stakeholderInsights = [];
        ctx.state.newLearnings = [];
        ctx.state.followUpEmail = null;
      });

      // Get handle to the deal agent for broadcasting progress
      // Use ctx.client() for actor-to-actor communication (untyped to avoid circular import)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = loopCtx.client() as any;
      const dealActor = client.dealAgent.getOrCreate([input.dealId]);

      try {
        // STEP 1: Extract action items and commitments
        await dealActor.workflowProgress({
          step: "extract_actions",
          status: "running",
        });

        const actions = await loopCtx.step("extract-actions", async () => {
          ctx.state.currentStep = "extract_actions";
          const raw = await callClaude(
            "You are a sales call analyst. Extract all action items, commitments, and key decisions from the transcript. Return valid JSON only — no markdown, no explanation.",
            `Extract action items from this call transcript between ${input.companyName} and our sales team.

Return JSON: { "actionItems": [{ "item": "description", "owner": "person name", "deadline": "if mentioned or null" }] }

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`
          );
          const parsed = parseJSON<{ actionItems: ActionItem[] }>(raw, {
            actionItems: [],
          });
          return parsed.actionItems;
        });

        await loopCtx.step("save-actions", async () => {
          ctx.state.actionItems = actions;
        });

        await dealActor.workflowProgress({
          step: "extract_actions",
          status: "complete",
          details: `${actions.length} action items found`,
        });

        // STEP 2: Score MEDDPICC with evidence
        await dealActor.workflowProgress({
          step: "score_meddpicc",
          status: "running",
        });

        const meddpicc = await loopCtx.step("score-meddpicc", async () => {
          ctx.state.currentStep = "score_meddpicc";
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
          const parsed = parseJSON<{
            updates: Record<string, MeddpiccUpdate>;
          }>(raw, { updates: {} });
          return parsed.updates;
        });

        await loopCtx.step("save-meddpicc", async () => {
          ctx.state.meddpiccUpdates = meddpicc;
        });

        const updatedFields = Object.keys(meddpicc).filter(
          (k) => meddpicc[k]?.delta !== 0
        );
        await dealActor.workflowProgress({
          step: "score_meddpicc",
          status: "complete",
          details: `${updatedFields.length} fields updated`,
        });

        // Write MEDDPICC updates back to Supabase
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

        // STEP 3: Detect competitive mentions + stakeholder sentiment
        await dealActor.workflowProgress({
          step: "detect_signals",
          status: "running",
        });

        const signals = await loopCtx.step("detect-signals", async () => {
          ctx.state.currentStep = "detect_signals";
          const contactsCtx = input.existingContacts
            .map((c) => `${c.name} (${c.title}, ${c.role})`)
            .join("; ");

          const raw = await callClaude(
            "You are a sales intelligence analyst. Extract competitive mentions and per-stakeholder sentiment from the call. Return valid JSON only.",
            `Analyze this transcript for competitive intelligence and stakeholder dynamics.

Known contacts: ${contactsCtx || "None specified"}
Deal: ${input.dealName} at ${input.companyName} (${input.vertical})

Return JSON:
{
  "competitiveMentions": [{ "competitor": "name", "context": "what was said", "sentiment": "positive|neutral|negative" }],
  "stakeholderInsights": [{ "name": "person name", "sentiment": "champion|supporter|neutral|skeptic|blocker", "keyQuotes": ["quote1"] }]
}

TRANSCRIPT:
${input.transcriptText.slice(0, 15000)}`
          );
          const parsed = parseJSON<{
            competitiveMentions: CompetitiveMention[];
            stakeholderInsights: StakeholderInsight[];
          }>(raw, { competitiveMentions: [], stakeholderInsights: [] });
          return parsed;
        });

        await loopCtx.step("save-signals", async () => {
          ctx.state.competitiveMentions = signals.competitiveMentions;
          ctx.state.stakeholderInsights = signals.stakeholderInsights;
        });

        await dealActor.workflowProgress({
          step: "detect_signals",
          status: "complete",
          details: `${signals.competitiveMentions.length} competitive mentions, ${signals.stakeholderInsights.length} stakeholders analyzed`,
        });

        // Create observations from competitive mentions
        if (signals.competitiveMentions.length > 0) {
          await loopCtx.step("create-observations", async () => {
            for (const mention of signals.competitiveMentions) {
              try {
                await fetch(`${input.appUrl}/api/observations`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    rawInput: `Competitive mention from transcript: ${mention.competitor} — ${mention.context}`,
                    context: {
                      page: "pipeline",
                      dealId: input.dealId,
                      trigger: "transcript_pipeline",
                    },
                    observerId: input.assignedAeId,
                  }),
                });
              } catch (e) {
                console.error("Failed to create observation:", e);
              }
            }
          });
        }

        // STEP 4: Synthesize learnings for the deal agent
        await dealActor.workflowProgress({
          step: "synthesize_learnings",
          status: "running",
        });

        const synthesis = await loopCtx.step(
          "synthesize-learnings",
          async () => {
            ctx.state.currentStep = "synthesize_learnings";
            const raw = await callClaude(
              "You are a deal strategist. Synthesize the transcript analysis into key learnings that should inform future interactions. Return valid JSON only.",
              `Based on this transcript analysis for ${input.dealName} at ${input.companyName} (${input.vertical}), what are the key learnings?

Action items found: ${JSON.stringify(actions)}
MEDDPICC updates: ${JSON.stringify(meddpicc)}
Competitive mentions: ${JSON.stringify(signals.competitiveMentions)}
Stakeholder insights: ${JSON.stringify(signals.stakeholderInsights)}

Return JSON: { "learnings": ["concise actionable learning statement 1", "learning 2", ...] }
Focus on: stakeholder preferences, decision criteria, competitive positioning, relationship dynamics, process obstacles.
Maximum 5 learnings.

TRANSCRIPT:
${input.transcriptText.slice(0, 8000)}`
            );
            const parsed = parseJSON<{ learnings: string[] }>(raw, {
              learnings: [],
            });
            return parsed.learnings;
          }
        );

        await loopCtx.step("save-learnings", async () => {
          ctx.state.newLearnings = synthesis;
        });

        await dealActor.workflowProgress({
          step: "synthesize_learnings",
          status: "complete",
          details: `${synthesis.length} new learnings`,
        });

        // STEP 5: Draft follow-up email
        await dealActor.workflowProgress({
          step: "draft_email",
          status: "running",
        });

        const email = await loopCtx.step("draft-email", async () => {
          ctx.state.currentStep = "draft_email";
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
          return parsed;
        });

        await loopCtx.step("save-email", async () => {
          ctx.state.followUpEmail = email;
        });

        await dealActor.workflowProgress({
          step: "draft_email",
          status: "complete",
          details: "Email draft ready",
        });

        // ALL STEPS COMPLETE — update the deal agent with accumulated intelligence
        await loopCtx.step("finalize", async () => {
          ctx.state.status = "complete";
          ctx.state.completedAt = new Date().toISOString();
        });

        await dealActor.recordInteraction({
          type: "transcript_analysis",
          summary: `Analyzed call transcript: ${actions.length} action items, ${updatedFields.length} MEDDPICC updates, ${signals.competitiveMentions.length} competitive mentions`,
          insights: synthesis,
        });

        await dealActor.updateLearnings(synthesis);

        for (const mention of signals.competitiveMentions) {
          await dealActor.addCompetitiveIntel({
            competitor: mention.competitor,
            context: mention.context,
          });
        }
      } catch (error) {
        await loopCtx.step("handle-error", async () => {
          ctx.state.status = "error";
          ctx.state.error =
            error instanceof Error ? error.message : "Unknown error";
        });
        try {
          await dealActor.workflowProgress({
            step: ctx.state.currentStep,
            status: "error",
            details: ctx.state.error || "Unknown error",
          });
        } catch {}
      }
    });
  }),
});

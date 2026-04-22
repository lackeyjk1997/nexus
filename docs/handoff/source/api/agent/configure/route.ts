export const dynamic = "force-dynamic";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { agentConfigs, agentConfigVersions } from "@nexus/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an AI agent configuration interpreter. Given a user's natural language instruction and their current agent config, determine what changes to make.

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
- Return ONLY the JSON, no other text`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { instruction, currentConfig, configId } = await request.json();

  if (!instruction || !currentConfig) {
    return NextResponse.json(
      { error: "instruction and currentConfig are required" },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current config:\n${JSON.stringify(currentConfig, null, 2)}\n\nInstruction: "${instruction}"`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Configuration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // Save a confirmed config update
  const { configId, instructions, outputPreferences, changeSummary, changedBy } =
    await request.json();

  if (!configId) {
    return NextResponse.json({ error: "configId required" }, { status: 400 });
  }

  // Get current version
  const [current] = await db
    .select({ version: agentConfigs.version })
    .from(agentConfigs)
    .where(eq(agentConfigs.id, configId))
    .limit(1);

  const newVersion = (current?.version ?? 0) + 1;

  // Update the config
  await db
    .update(agentConfigs)
    .set({
      instructions,
      outputPreferences,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(agentConfigs.id, configId));

  // Create version history entry
  await db.insert(agentConfigVersions).values({
    agentConfigId: configId,
    version: newVersion,
    instructions,
    outputPreferences,
    changedBy: changedBy || "user",
    changeReason: changeSummary || "Configuration updated",
  });

  return NextResponse.json({ success: true, version: newVersion });
}

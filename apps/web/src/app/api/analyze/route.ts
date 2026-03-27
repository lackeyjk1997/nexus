export const dynamic = "force-dynamic";
export const maxDuration = 60;

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/analysis/prompts";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "ANTHROPIC_API_KEY is not configured. Add it to your .env file.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { transcript: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { transcript } = body;
  if (!transcript || transcript.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Transcript cannot be empty" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (transcript.length > 100_000) {
    return new Response(
      JSON.stringify({
        error: "Transcript is too long. Maximum 100,000 characters.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(transcript) }],
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Stream error";
          const statusCode =
            err instanceof Anthropic.APIError ? err.status : undefined;

          if (statusCode === 429) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Rate limited — please try again in a moment" })}\n\n`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: message })}\n\n`
              )
            );
          }
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Analysis failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

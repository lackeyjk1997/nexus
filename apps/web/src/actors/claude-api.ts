// Shared Claude API helper with retry + exponential backoff for Rivet actors.
// Actors can't use @anthropic-ai/sdk (Rivet runtime), so we use raw fetch.

const MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 529]);

export async function callClaude(options: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const { system, userMessage, maxTokens = 4096, temperature } = options;

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: userMessage }],
  };
  if (system) body.system = system;
  if (temperature !== undefined) body.temperature = temperature;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const textBlock = data.content?.find(
        (b: { type: string }) => b.type === "text"
      );
      return textBlock?.text || "";
    }

    // Non-retryable status — fail immediately
    if (!RETRYABLE_STATUSES.has(res.status)) {
      const err = await res.text();
      throw new Error(`Claude API error ${res.status}: ${err}`);
    }

    // Retryable — compute delay
    if (attempt < MAX_RETRIES) {
      let delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s

      // Honor retry-after header for 429s
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          const seconds = parseFloat(retryAfter);
          if (!isNaN(seconds)) delay = seconds * 1000;
        }
      }

      console.log(
        `[Claude API] Retry ${attempt + 1}/${MAX_RETRIES} after ${res.status} — waiting ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      const err = await res.text();
      lastError = new Error(
        `Claude API error ${res.status} after ${MAX_RETRIES} retries: ${err}`
      );
    }
  }

  throw lastError ?? new Error("Claude API call failed after retries");
}

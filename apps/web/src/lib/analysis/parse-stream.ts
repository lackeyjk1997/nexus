import type { AnalysisResult } from "./types";

export function parseAnalysisJson(raw: string): AnalysisResult | null {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Find the first { and last } to extract JSON
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  cleaned = cleaned.slice(start, end + 1);

  try {
    const parsed = JSON.parse(cleaned) as AnalysisResult;

    // Basic validation
    if (!parsed.summary || !parsed.dealScore) return null;

    // Ensure talkRatio sums to ~100
    if (parsed.talkRatio) {
      const total = parsed.talkRatio.rep + parsed.talkRatio.prospect;
      if (total > 0 && Math.abs(total - 100) > 5) {
        const factor = 100 / total;
        parsed.talkRatio.rep = Math.round(parsed.talkRatio.rep * factor);
        parsed.talkRatio.prospect = 100 - parsed.talkRatio.rep;
      }
    }

    // Sort risk signals by severity
    if (parsed.riskSignals) {
      const order = { high: 0, medium: 1, low: 2 };
      parsed.riskSignals.sort(
        (a, b) => (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
      );
    }

    return parsed;
  } catch {
    return null;
  }
}

import { actor, event } from "rivetkit";
import {
  validateSignal,
  normalizeCompetitorName,
  findCompetitorInText,
} from "@/lib/validation";

// ── Types ──

interface Signal {
  id: string;
  dealId: string;
  dealName: string;
  companyName: string;
  vertical: string;
  signalType: string;
  content: string;
  competitor?: string;
  urgency: string;
  receivedAt: string;
  sourceAeId: string;
  sourceAeName: string;
}

interface Pattern {
  id: string;
  signalType: string;
  vertical: string;
  competitor?: string;
  dealIds: string[];
  dealNames: string[];
  signals: Signal[];
  signalCount: number;
  synthesis: string;
  recommendations: string[];
  arrImpact: number;
  detectedAt: string;
  synthesizedAt: string | null;
  pushStatus: "pending" | "pushed" | "failed";
}

interface CoordinatorState {
  signals: Signal[];
  patterns: Pattern[];
  lastSynthesisRun: string | null;
  totalSignalsReceived: number;
  totalPatternsDetected: number;
}

// ── Actor Definition ──

export const intelligenceCoordinator = actor({
  state: {
    signals: [],
    patterns: [],
    lastSynthesisRun: null,
    totalSignalsReceived: 0,
    totalPatternsDetected: 0,
  } as CoordinatorState,

  events: {
    patternDetected: event<{
      patternId: string;
      signalType: string;
      vertical: string;
      dealCount: number;
    }>(),
    patternSynthesized: event<{
      patternId: string;
      synthesis: string;
    }>(),
  },

  actions: {
    receiveSignal: (c, signal: Signal) => {
      // Validate signal — adapt Signal fields to what validateSignal expects
      const validated = validateSignal({
        type: signal.signalType,
        content: signal.content,
        context: signal.content, // use content as context for validation
        urgency: signal.urgency,
        source_speaker: signal.sourceAeName || "",
      });
      if (!validated) {
        console.log(
          `[coordinator] Rejected invalid signal from ${signal.dealName}: type=${signal.signalType}`
        );
        return;
      }

      // Normalize competitor name for competitive_intel
      if (signal.signalType === "competitive_intel") {
        const normalized = normalizeCompetitorName(signal.competitor || "");
        if (normalized) {
          signal.competitor = normalized;
        } else {
          const fromContent = findCompetitorInText(signal.content);
          if (fromContent) {
            signal.competitor = fromContent;
          } else {
            console.log(
              `[coordinator] competitive_intel signal has no valid competitor, storing without competitor match`
            );
          }
        }
      }

      console.log(
        `[coordinator] Received signal: ${signal.signalType} from ${signal.dealName}${signal.competitor ? ` (competitor: ${signal.competitor})` : ""}`
      );

      // Store signal (keep last 200)
      c.state.signals = [...c.state.signals.slice(-199), signal];
      c.state.totalSignalsReceived++;

      // Check for patterns: 2+ signals of same type in same vertical from different deals
      const matchingSignals = c.state.signals.filter(
        (s) =>
          s.signalType === signal.signalType &&
          s.vertical === signal.vertical &&
          s.dealId !== signal.dealId
      );

      // For competitive_intel, also match on competitor name
      const relevantMatches =
        signal.signalType === "competitive_intel" && signal.competitor
          ? matchingSignals.filter(
              (s) =>
                s.competitor?.toLowerCase() ===
                signal.competitor?.toLowerCase()
            )
          : matchingSignals;

      if (relevantMatches.length >= 1) {
        const allPatternSignals = [signal, ...relevantMatches];
        const dealIds = [...new Set(allPatternSignals.map((s) => s.dealId))];
        const dealNames = [
          ...new Set(allPatternSignals.map((s) => s.dealName)),
        ];

        // Check for existing pattern
        const existingPattern = c.state.patterns.find(
          (p) =>
            p.signalType === signal.signalType &&
            p.vertical === signal.vertical &&
            (signal.signalType !== "competitive_intel" ||
              p.competitor?.toLowerCase() === signal.competitor?.toLowerCase())
        );

        if (existingPattern) {
          existingPattern.signals = allPatternSignals;
          existingPattern.dealIds = dealIds;
          existingPattern.dealNames = dealNames;
          existingPattern.signalCount = allPatternSignals.length;
          existingPattern.pushStatus = "pending";

          console.log(
            `[coordinator] Updated existing pattern: ${existingPattern.id} (${dealIds.length} deals)`
          );

          c.schedule.after(3000, "synthesizePattern", existingPattern.id);
        } else {
          const patternId = `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const newPattern: Pattern = {
            id: patternId,
            signalType: signal.signalType,
            vertical: signal.vertical,
            competitor: signal.competitor,
            dealIds,
            dealNames,
            signals: allPatternSignals,
            signalCount: allPatternSignals.length,
            synthesis: "",
            recommendations: [],
            arrImpact: 0,
            detectedAt: new Date().toISOString(),
            synthesizedAt: null,
            pushStatus: "pending",
          };

          c.state.patterns.push(newPattern);
          c.state.totalPatternsDetected++;

          console.log(
            `[coordinator] NEW PATTERN DETECTED: ${patternId} — ${signal.signalType} in ${signal.vertical} across ${dealIds.length} deals`
          );

          c.broadcast("patternDetected", {
            patternId,
            signalType: signal.signalType,
            vertical: signal.vertical,
            dealCount: dealIds.length,
          });

          c.schedule.after(3000, "synthesizePattern", patternId);
        }
      }
    },

    synthesizePattern: async (c, patternId: string) => {
      console.log(`[coordinator] Synthesizing pattern: ${patternId}`);

      const pattern = c.state.patterns.find((p) => p.id === patternId);
      if (!pattern) {
        console.error(`[coordinator] Pattern not found: ${patternId}`);
        return;
      }

      const signalSummary = pattern.signals
        .map((s) => `- ${s.dealName} (${s.companyName}): ${s.content}`)
        .join("\n");

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY || "",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `You are an AI sales intelligence analyst. Multiple deals in the ${pattern.vertical} vertical are experiencing the same ${pattern.signalType.replace(/_/g, " ")} pattern.

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
}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          console.error(
            `[coordinator] Claude API error: ${response.status}`
          );
          pattern.pushStatus = "failed";
          return;
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || "";

        let parsed: {
          synthesis?: string;
          recommendations?: string[];
          arrImpactMultiplier?: number;
        } | null;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          console.error(
            "[coordinator] Failed to parse Claude response:",
            text.substring(0, 200)
          );
          pattern.pushStatus = "failed";
          return;
        }

        if (!parsed) {
          pattern.pushStatus = "failed";
          return;
        }

        // Update pattern with synthesis
        pattern.synthesis = parsed.synthesis || "";
        pattern.recommendations = parsed.recommendations || [];
        pattern.arrImpact =
          (parsed.arrImpactMultiplier || 1) * pattern.dealIds.length;
        pattern.synthesizedAt = new Date().toISOString();

        console.log(
          `[coordinator] Synthesis complete: "${pattern.synthesis.substring(0, 100)}..."`
        );

        // Push to affected deal agents
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = c.client() as any;
        for (const dealId of pattern.dealIds) {
          try {
            const dealActor = client.dealAgent.getOrCreate([dealId]);
            await dealActor.addCoordinatedIntel({
              patternId: pattern.id,
              signalType: pattern.signalType,
              vertical: pattern.vertical,
              competitor: pattern.competitor,
              synthesis: pattern.synthesis,
              recommendations: pattern.recommendations,
              affectedDeals: pattern.dealNames,
              detectedAt: pattern.detectedAt,
            });
            console.log(
              `[coordinator] Pushed insight to deal agent: ${dealId}`
            );
          } catch (e) {
            console.error(
              `[coordinator] Failed to push to deal agent ${dealId}:`,
              e
            );
          }
        }

        pattern.pushStatus = "pushed";

        c.broadcast("patternSynthesized", {
          patternId: pattern.id,
          synthesis: pattern.synthesis,
        });

        c.state.lastSynthesisRun = new Date().toISOString();
      } catch (e) {
        console.error("[coordinator] Synthesis failed:", e);
        pattern.pushStatus = "failed";
      }
    },

    getPatterns: (c) => {
      return c.state.patterns;
    },

    getPatternsForDeal: (c, dealId: string) => {
      return c.state.patterns.filter((p) => p.dealIds.includes(dealId));
    },

    getStatus: (c) => {
      return {
        totalSignalsReceived: c.state.totalSignalsReceived,
        totalPatternsDetected: c.state.totalPatternsDetected,
        activePatterns: c.state.patterns.length,
        lastSynthesisRun: c.state.lastSynthesisRun,
      };
    },

    destroyActor: (c) => {
      c.destroy();
    },
  },
});

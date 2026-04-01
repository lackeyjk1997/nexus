// ── Data validation for AI-generated content ──
// Pure functions — no DB calls, no API calls, just string processing.

// ── Competitor Name Normalization ──

const COMPETITOR_CANONICAL: Record<string, string[]> = {
  Microsoft: [
    "azure", "microsoft azure", "azure ai", "msft", "microsoft copilot",
    "copilot", "microsoft 365", "microsoft", "ms copilot", "azure health",
  ],
  OpenAI: ["gpt", "chatgpt", "gpt-4", "gpt-5", "openai", "gpt4", "gpt5"],
  Google: ["gemini", "google ai", "google cloud", "gcp", "vertex ai", "bard", "google"],
  Amazon: ["aws", "amazon", "bedrock", "amazon bedrock"],
  IBM: ["ibm", "watson", "ibm watson"],
  Salesforce: ["salesforce", "einstein", "salesforce einstein"],
  Oracle: ["oracle"],
  SAP: ["sap"],
};

const REJECTED_COMPETITOR_TERMS = new Set([
  "prospect", "customer", "client", "vendor", "competitor", "they", "them",
  "the company", "unknown", "the prospect", "the customer", "the client",
  "our competitor", "another vendor", "n/a", "none", "na", "null", "undefined",
  "the vendor", "other", "others", "their", "someone", "somebody",
]);

export function normalizeCompetitorName(
  raw: string,
  knownContactNames?: string[]
): string | null {
  if (!raw || !raw.trim()) return null;

  const cleaned = raw.trim();
  const lower = cleaned.toLowerCase();

  // Reject generic terms
  if (REJECTED_COMPETITOR_TERMS.has(lower)) {
    console.log(`[validation] Rejected competitor name (generic): "${raw}"`);
    return null;
  }

  // Reject person names from known contacts
  if (knownContactNames) {
    for (const name of knownContactNames) {
      const nameLower = name.toLowerCase();
      if (
        lower.includes(nameLower) ||
        nameLower.includes(lower) ||
        nameLower.split(" ").some((part) => part.length > 2 && lower === part)
      ) {
        console.log(`[validation] Rejected competitor name (contact match "${name}"): "${raw}"`);
        return null;
      }
    }
  }

  // Check canonical mapping
  for (const [canonical, aliases] of Object.entries(COMPETITOR_CANONICAL)) {
    if (aliases.includes(lower) || lower === canonical.toLowerCase()) {
      return canonical;
    }
  }

  // No canonical match — return capitalized if it looks like a real name
  if (cleaned.length < 2 || /^\d+$/.test(cleaned)) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ── Find competitor in free text ──

export function findCompetitorInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [canonical, aliases] of Object.entries(COMPETITOR_CANONICAL)) {
    for (const alias of aliases) {
      // Match whole word or phrase
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (regex.test(lower)) return canonical;
    }
  }
  return null;
}

// ── Signal Validation ──

const VALID_SIGNAL_TYPES = new Set([
  "competitive_intel", "process_friction", "deal_blocker", "content_gap",
  "win_pattern", "agent_tuning", "cross_agent", "field_intelligence",
  "process_innovation",
]);

export interface ValidatedSignal {
  type: string;
  content: string;
  context: string;
  urgency: "low" | "medium" | "high";
  source_speaker: string;
  competitor?: string;
  quote?: string;
}

export function validateSignal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signal: any,
  knownContactNames?: string[]
): ValidatedSignal | null {
  if (!signal) return null;

  const type = signal.type;
  if (!type || !VALID_SIGNAL_TYPES.has(type)) {
    console.log(`[validation] Rejected signal (invalid type): "${type}"`);
    return null;
  }

  const content = (signal.content || "").trim();
  if (content.length < 15) {
    console.log(`[validation] Rejected signal (content too short): "${content}"`);
    return null;
  }

  const urgency =
    signal.urgency === "low" || signal.urgency === "high"
      ? signal.urgency
      : "medium";

  let competitor: string | undefined;
  if (type === "competitive_intel") {
    // Try signal.competitor first, then scan content
    if (signal.competitor) {
      competitor = normalizeCompetitorName(signal.competitor, knownContactNames) ?? undefined;
    }
    if (!competitor) {
      competitor = findCompetitorInText(content) ?? undefined;
    }
  }

  return {
    type,
    content,
    context: (signal.context || "").trim(),
    urgency,
    source_speaker: (signal.source_speaker || "").trim(),
    competitor,
    quote: signal.quote ? (signal.quote as string).trim() : undefined,
  };
}

// ── Learning Validation ──

const GENERIC_LEARNING_PATTERNS = [
  /^the (customer|prospect|client) (is|was|seems?) (interested|positive|engaged|excited|receptive)\.?$/i,
  /^good (conversation|call|meeting|discussion)\.?$/i,
  /^follow up needed\.?$/i,
  /^positive (sentiment|feedback|response) (overall|generally)\.?$/i,
  /^(need to|should) follow up\.?$/i,
  /^(strong|good|positive) (relationship|rapport)\.?$/i,
];

function hasSpecificEvidence(learning: string): boolean {
  // Check for numbers/metrics
  if (/\d+/.test(learning)) return true;
  // Check for quoted speech or direct references
  if (/["']/.test(learning)) return true;
  // Check for proper nouns (capitalized words not at start of sentence, excluding common filler)
  const words = learning.split(/\s+/);
  const skipWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "has", "have", "had",
    "will", "would", "could", "should", "may", "might", "can", "do", "does",
    "did", "not", "no", "but", "and", "or", "if", "for", "with", "from",
    "to", "in", "on", "at", "by", "about", "into", "through", "during",
    "before", "after", "above", "below", "between", "under", "their",
    "they", "them", "our", "we", "us", "this", "that", "these", "those",
    "it", "its", "be", "been", "being",
  ]);
  for (let i = 1; i < words.length; i++) {
    const w = words[i].replace(/[^a-zA-Z]/g, "");
    if (w.length > 2 && /^[A-Z]/.test(w) && !skipWords.has(w.toLowerCase())) {
      return true; // Likely a proper noun (person, company, technology)
    }
  }
  // Check for specific tech/process terms
  if (/\b(API|SDK|FHIR|HL7|GDPR|HIPAA|SOC|EHR|Epic|Azure|AWS|GCP|CISO|CFO|CMO|CTO|CEO)\b/.test(learning)) {
    return true;
  }
  return false;
}

export function validateLearnings(learnings: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of learnings) {
    const learning = raw.trim();

    // Skip short learnings
    if (learning.length < 20) {
      console.log(`[validation] Rejected learning (too short): "${learning}"`);
      continue;
    }

    // Skip exact duplicates
    const key = learning.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Skip purely generic learnings
    if (GENERIC_LEARNING_PATTERNS.some((p) => p.test(learning))) {
      console.log(`[validation] Rejected learning (generic pattern): "${learning}"`);
      continue;
    }

    // Check for specific evidence
    if (!hasSpecificEvidence(learning)) {
      console.log(`[validation] Rejected learning (no specific evidence): "${learning}"`);
      continue;
    }

    result.push(learning);
  }

  return result.slice(0, 20);
}

// ── Learning Consolidation ──

function extractKeyTerms(text: string): Set<string> {
  const terms = new Set<string>();
  // Extract capitalized proper nouns
  const matches = text.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
  for (const m of matches) terms.add(m.toLowerCase());
  // Extract key topic words
  const topicWords = [
    "compliance", "pricing", "security", "competitive", "budget", "timeline",
    "integration", "migration", "pilot", "demo", "accuracy", "champion",
    "blocker", "friction", "GDPR", "HIPAA", "SOC", "CISO", "CFO",
  ];
  const lower = text.toLowerCase();
  for (const w of topicWords) {
    if (lower.includes(w.toLowerCase())) terms.add(w.toLowerCase());
  }
  return terms;
}

export function consolidateLearnings(
  existing: string[],
  newLearnings: string[]
): string[] {
  const all = [...existing, ...newLearnings];
  if (all.length <= 20) {
    // Simple dedup
    const seen = new Set<string>();
    return all.filter((l) => {
      const key = l.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Group by shared key terms, keep the longer (more detailed) one
  const groups: Map<string, string[]> = new Map();
  for (const learning of all) {
    const terms = extractKeyTerms(learning);
    let foundGroup = false;
    for (const [groupKey, members] of groups) {
      const groupTerms = extractKeyTerms(groupKey);
      const overlap = [...terms].filter((t) => groupTerms.has(t));
      if (overlap.length >= 2) {
        members.push(learning);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups.set(learning, [learning]);
    }
  }

  // From each group, keep the longest
  const consolidated: string[] = [];
  for (const members of groups.values()) {
    const best = members.reduce((a, b) => (a.length >= b.length ? a : b));
    consolidated.push(best);
  }

  // Dedup and cap
  const seen = new Set<string>();
  return consolidated
    .filter((l) => {
      const key = l.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-20);
}

// ── MEDDPICC Validation ──

const GENERIC_EVIDENCE = new Set([
  "mentioned in call", "discussed", "came up", "talked about",
  "referenced", "brought up", "noted", "mentioned",
]);

export function validateMeddpiccScore(
  field: string,
  score: number,
  evidence: string
): { score: number; evidence: string } {
  let adjusted = Math.max(0, Math.min(100, score));
  const trimmed = (evidence || "").trim();

  if (adjusted > 30 && trimmed.length < 10) {
    console.log(
      `[validation] Reduced MEDDPICC ${field} score ${adjusted}→30 (insufficient evidence)`
    );
    adjusted = 30;
  }

  if (GENERIC_EVIDENCE.has(trimmed.toLowerCase())) {
    const reduced = Math.max(0, adjusted - 20);
    console.log(
      `[validation] Reduced MEDDPICC ${field} score ${adjusted}→${reduced} (generic evidence: "${trimmed}")`
    );
    adjusted = reduced;
  }

  return { score: adjusted, evidence: trimmed };
}

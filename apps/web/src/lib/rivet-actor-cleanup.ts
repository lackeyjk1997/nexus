// Rivet actor cleanup helpers — calls the Rivet Engine REST API directly.
//
// Why direct REST? The in-actor `destroyActor` action requires the actor to
// wake successfully to receive the call. Crashed/orphaned actors can't wake,
// so action-based destruction hangs. The Engine REST API destroys at the
// scheduler level, the same way the Rivet dashboard's "Destroy Actor" button
// works. Endpoints verified against rivetkit@2.2.0 source:
//   GET    {endpoint}/actors?name={name}   → list actors of a type
//   DELETE {endpoint}/actors/{actorId}     → destroy one actor by ID

const ACTOR_NAMES = [
  "dealAgent",
  "transcriptPipeline",
  "intelligenceCoordinator",
] as const;

export type ActorName = (typeof ACTOR_NAMES)[number];

export interface RivetActorSummary {
  id: string;
  name?: string;
  key?: string[];
  destroyTs?: number | null;
  raw?: unknown;
}

export interface DestructionResult {
  actorId: string;
  actorName: ActorName;
  key?: string[];
  ok: boolean;
  status?: number;
  error?: string;
}

export interface NukeSummary {
  byName: Record<ActorName, { listed: number; destroyed: number; failed: number }>;
  results: DestructionResult[];
  totalListed: number;
  totalDestroyed: number;
  totalFailed: number;
}

interface EngineConfig {
  endpoint: string;
  token?: string;
  namespace?: string;
}

/**
 * Resolve Rivet engine config from env. Supports two formats:
 *  1. RIVET_ENDPOINT alone (e.g. http://127.0.0.1:6420 for local dev)
 *  2. RIVET_ENDPOINT with embedded credentials: https://namespace:token@host
 *  3. Separate RIVET_TOKEN / RIVET_NAMESPACE env vars
 */
export function resolveEngineConfig(): EngineConfig {
  const raw =
    process.env.RIVET_ENDPOINT ||
    process.env.RIVET_PUBLIC_ENDPOINT ||
    "http://127.0.0.1:6420";

  let endpoint = raw;
  let token = process.env.RIVET_TOKEN;
  let namespace = process.env.RIVET_NAMESPACE;

  try {
    const url = new URL(raw);
    if (url.username || url.password) {
      // namespace:token@host
      namespace = namespace || decodeURIComponent(url.username);
      token = token || decodeURIComponent(url.password);
      url.username = "";
      url.password = "";
      endpoint = url.toString().replace(/\/$/, "");
    } else {
      endpoint = raw.replace(/\/$/, "");
    }
  } catch {
    // not a URL (shouldn't happen, but don't crash)
    endpoint = raw.replace(/\/$/, "");
  }

  return { endpoint, token, namespace };
}

function buildHeaders(cfg: EngineConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  return headers;
}

function buildUrl(cfg: EngineConfig, path: string, extraQuery?: Record<string, string>): string {
  const url = new URL(cfg.endpoint + path);
  if (cfg.namespace) url.searchParams.set("namespace", cfg.namespace);
  if (extraQuery) {
    for (const [k, v] of Object.entries(extraQuery)) url.searchParams.set(k, v);
  }
  return url.toString();
}

/**
 * Per-request timeout for engine API calls. The engine occasionally hangs
 * on broken actors (e.g. unreachable runners, stuck destroy operations). A
 * 5-second timeout means a single bad actor can't block the whole reset.
 */
const REQUEST_TIMEOUT_MS = 5_000;

/** List all actors of a given type from the Rivet engine. */
export async function listActorsByName(
  name: ActorName,
  cfg: EngineConfig = resolveEngineConfig()
): Promise<RivetActorSummary[]> {
  const url = buildUrl(cfg, "/actors", { name });
  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(cfg),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`listActors(${name}) failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { actors?: unknown[] } | unknown[];
  const list = Array.isArray(json) ? json : (json.actors ?? []);
  return list.map((a) => {
    const obj = a as Record<string, unknown>;
    return {
      id: String(obj.actor_id ?? obj.id ?? ""),
      name: typeof obj.name === "string" ? obj.name : undefined,
      key: Array.isArray(obj.key) ? (obj.key as string[]) : undefined,
      destroyTs:
        typeof obj.destroy_ts === "number"
          ? (obj.destroy_ts as number)
          : typeof obj.destroyTs === "number"
            ? (obj.destroyTs as number)
            : null,
      raw: obj,
    };
  });
}

/** Destroy one actor by ID. Returns true on success. */
export async function destroyActorById(
  actorId: string,
  cfg: EngineConfig = resolveEngineConfig()
): Promise<{ ok: boolean; status: number; error?: string }> {
  const url = buildUrl(cfg, `/actors/${encodeURIComponent(actorId)}`);
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: buildHeaders(cfg),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body.slice(0, 300) };
  } catch (e) {
    // AbortSignal.timeout throws DOMException("...", "TimeoutError") on timeout.
    const err = e as Error;
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: isTimeout ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : err.message,
    };
  }
}

/**
 * Nuke every actor across all 3 actor types. Errors on individual actors are
 * caught and reported in the summary — the function never throws.
 */
export async function nukeAllActors(
  cfg: EngineConfig = resolveEngineConfig(),
  log: (msg: string) => void = (m) => console.log(m)
): Promise<NukeSummary> {
  const results: DestructionResult[] = [];
  const byName = {
    dealAgent: { listed: 0, destroyed: 0, failed: 0 },
    transcriptPipeline: { listed: 0, destroyed: 0, failed: 0 },
    intelligenceCoordinator: { listed: 0, destroyed: 0, failed: 0 },
  } as NukeSummary["byName"];

  for (const name of ACTOR_NAMES) {
    let actors: RivetActorSummary[] = [];
    try {
      actors = await listActorsByName(name, cfg);
      byName[name].listed = actors.length;
      log(`[nuke] ${name}: found ${actors.length} actor(s)`);
    } catch (e) {
      log(`[nuke] ${name}: list FAILED — ${(e as Error).message}`);
      continue;
    }

    for (const a of actors) {
      if (!a.id) {
        log(`[nuke] ${name}: skipping actor with no id`);
        continue;
      }
      if (a.destroyTs) {
        log(`[nuke] ${name}: actor ${a.id} already destroyed (destroy_ts=${a.destroyTs}), skipping`);
        continue;
      }
      const r = await destroyActorById(a.id, cfg);
      const result: DestructionResult = {
        actorId: a.id,
        actorName: name,
        key: a.key,
        ok: r.ok,
        status: r.status,
        error: r.error,
      };
      results.push(result);
      if (r.ok) {
        byName[name].destroyed++;
        log(`[nuke] ${name}: destroyed ${a.id}${a.key ? ` key=[${a.key.join(",")}]` : ""}`);
      } else {
        byName[name].failed++;
        log(`[nuke] ${name}: destroy FAILED ${a.id} → ${r.status} ${r.error ?? ""}`);
      }
    }
  }

  const totalListed = Object.values(byName).reduce((s, v) => s + v.listed, 0);
  const totalDestroyed = Object.values(byName).reduce((s, v) => s + v.destroyed, 0);
  const totalFailed = Object.values(byName).reduce((s, v) => s + v.failed, 0);

  return { byName, results, totalListed, totalDestroyed, totalFailed };
}

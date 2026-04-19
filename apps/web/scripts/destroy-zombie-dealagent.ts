/**
 * Surgically destroy the known zombie dealAgent that's blocking the
 * transcript pipeline.
 *
 *   actor_id  = 5786guy9p0wdoavdlqth3hn0gadl00
 *   actor_key = c0069b95-02dc-46db-bd04-aac69099ecfb  (= a deal UUID)
 *
 * Tries DELETE by actor_id first (preferred — works even when the actor
 * won't wake). If that fails, lists dealAgents and tries to find the actor
 * by key as a fallback.
 *
 * Usage:
 *   cd apps/web && npm run destroy-zombie
 *
 * Required env: same as nuke-actors (RIVET_ENDPOINT etc.).
 */

import {
  destroyActorById,
  listActorsByName,
  resolveEngineConfig,
} from "../src/lib/rivet-actor-cleanup";

const ZOMBIE_ID = "5786guy9p0wdoavdlqth3hn0gadl00";
const ZOMBIE_KEY = "c0069b95-02dc-46db-bd04-aac69099ecfb";

async function main() {
  const cfg = resolveEngineConfig();
  console.log(
    `[zombie] Engine endpoint: ${cfg.endpoint}` +
      `${cfg.namespace ? ` ns=${cfg.namespace}` : " (no namespace)"}` +
      `${cfg.token ? " (token: present)" : " (no token)"}`
  );

  console.log(`[zombie] Attempt 1: DELETE /actors/${ZOMBIE_ID}`);
  const byId = await destroyActorById(ZOMBIE_ID, cfg);
  if (byId.ok) {
    console.log(`[zombie] SUCCESS — destroyed by id (status ${byId.status})`);
    return;
  }
  console.log(
    `[zombie] DELETE by id failed (status ${byId.status}): ${byId.error ?? "unknown"}`
  );

  console.log(`[zombie] Attempt 2: list dealAgents and match by key=${ZOMBIE_KEY}`);
  let actors;
  try {
    actors = await listActorsByName("dealAgent", cfg);
  } catch (e) {
    console.error(`[zombie] List failed: ${(e as Error).message}`);
    printFallback();
    process.exit(1);
  }

  const match = actors.find(
    (a) => a.id === ZOMBIE_ID || (a.key && a.key.includes(ZOMBIE_KEY))
  );

  if (!match) {
    console.log(
      `[zombie] No matching actor found in list of ${actors.length} dealAgent(s). ` +
        `It may already be gone — verify in the dashboard.`
    );
    return;
  }

  if (match.id !== ZOMBIE_ID) {
    console.log(`[zombie] Found by key, actor_id=${match.id}`);
  }

  const second = await destroyActorById(match.id, cfg);
  if (second.ok) {
    console.log(`[zombie] SUCCESS — destroyed via list lookup (status ${second.status})`);
    return;
  }

  console.log(
    `[zombie] Second DELETE also failed (status ${second.status}): ${second.error ?? "unknown"}`
  );
  printFallback();
  process.exit(1);
}

function printFallback() {
  console.log(`
[zombie] LAST-RESORT FALLBACK
─────────────────────────────────────────────────────────────────
Both API attempts failed. Try one of these:

1. From the Rivet dashboard (https://hub.rivet.dev), open the dealAgent
   list, find actor id ${ZOMBIE_ID},
   and click "Destroy Actor". (Note: this hangs sometimes.)

2. Force-destroy via raw curl with a force flag (verify the exact flag
   name with your Rivet support contact — common names are ?force=true
   or ?hard=true):
     curl -X DELETE \\
       -H "Authorization: Bearer $RIVET_TOKEN" \\
       "$RIVET_ENDPOINT/actors/${ZOMBIE_ID}?namespace=$RIVET_NAMESPACE&force=true"

3. Contact Rivet support / open a ticket — they can purge a stuck actor
   from the engine database directly.
─────────────────────────────────────────────────────────────────
`);
}

main().catch((err) => {
  console.error("[zombie] FATAL:", err);
  process.exit(2);
});

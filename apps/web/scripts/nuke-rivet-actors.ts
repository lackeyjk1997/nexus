/**
 * Nuke every Rivet actor across dealAgent, transcriptPipeline, and
 * intelligenceCoordinator. Uses the Rivet Engine REST API directly so it
 * works on crashed/orphaned actors (the in-actor `destroyActor` action can't
 * be called on actors that won't wake).
 *
 * Usage:
 *   pnpm --filter @nexus/web nuke-actors
 *     # or
 *   cd apps/web && npm run nuke-actors
 *
 * Env vars (required to target production Rivet Cloud):
 *   RIVET_ENDPOINT   — full Rivet engine URL (may embed namespace:token@host)
 *   RIVET_TOKEN      — bearer token (skip if embedded in endpoint)
 *   RIVET_NAMESPACE  — namespace (skip if embedded in endpoint)
 *
 * If RIVET_ENDPOINT is not set, defaults to http://127.0.0.1:6420 (local dev).
 */

import { nukeAllActors, resolveEngineConfig } from "../src/lib/rivet-actor-cleanup";

async function main() {
  const cfg = resolveEngineConfig();
  console.log(
    `[nuke] Engine endpoint: ${cfg.endpoint}` +
      `${cfg.namespace ? ` ns=${cfg.namespace}` : " (no namespace)"}` +
      `${cfg.token ? " (token: present)" : " (no token)"}`
  );
  if (!process.env.RIVET_ENDPOINT) {
    console.warn(
      "[nuke] WARNING: RIVET_ENDPOINT is not set. Using local dev default. " +
        "If you meant to target production, export RIVET_ENDPOINT first."
    );
  }

  const summary = await nukeAllActors(cfg);

  console.log("\n[nuke] Summary:");
  for (const [name, counts] of Object.entries(summary.byName)) {
    console.log(
      `  ${name.padEnd(24)} listed=${counts.listed}  destroyed=${counts.destroyed}  failed=${counts.failed}`
    );
  }
  console.log(
    `  ${"TOTAL".padEnd(24)} listed=${summary.totalListed}  destroyed=${summary.totalDestroyed}  failed=${summary.totalFailed}`
  );

  if (summary.totalFailed > 0) {
    console.log(
      "\n[nuke] Some actors failed to destroy. Re-run, or use destroy-zombie " +
        "for stubborn ones. Failures:"
    );
    for (const r of summary.results.filter((r) => !r.ok)) {
      console.log(`  - ${r.actorName} ${r.actorId}: ${r.status} ${r.error ?? ""}`);
    }
    process.exit(1);
  }
  console.log("\n[nuke] Done.");
}

main().catch((err) => {
  console.error("[nuke] FATAL:", err);
  process.exit(2);
});

export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { createClient } from "rivetkit/client";
import type { Registry } from "@/actors/registry";

export async function GET() {
  try {
    const endpoint =
      process.env.RIVET_ENDPOINT ||
      `${process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3001}`}/api/rivet`;

    const client = createClient<Registry>(endpoint);
    const coordinator = client.intelligenceCoordinator.getOrCreate(["default"]);

    const patterns = await coordinator.getPatterns();
    const status = await coordinator.getStatus();

    return Response.json({ patterns, status });
  } catch (e) {
    console.error("Failed to fetch agent patterns:", e);
    return Response.json({ patterns: [], status: null });
  }
}

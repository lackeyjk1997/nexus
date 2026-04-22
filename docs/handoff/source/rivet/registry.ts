import { setup } from "rivetkit";
import { dealAgent } from "./deal-agent";
import { transcriptPipeline } from "./transcript-pipeline";
import { intelligenceCoordinator } from "./intelligence-coordinator";

export const registry = setup({
  use: { dealAgent, transcriptPipeline, intelligenceCoordinator },
});

export type Registry = typeof registry;

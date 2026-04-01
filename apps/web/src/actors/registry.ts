import { setup } from "rivetkit";
import { dealAgent } from "./deal-agent";
import { transcriptPipeline } from "./transcript-pipeline";

export const registry = setup({
  use: { dealAgent, transcriptPipeline },
});

export type Registry = typeof registry;

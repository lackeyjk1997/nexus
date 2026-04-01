import { setup } from "rivetkit";
import { dealAgent } from "./deal-agent";

export const registry = setup({
  use: { dealAgent },
});

export type Registry = typeof registry;

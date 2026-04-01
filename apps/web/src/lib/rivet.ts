"use client";

import { createRivetKit } from "@rivetkit/react";
import type { Registry } from "@/actors/registry";

export const { useActor } = createRivetKit<Registry>();

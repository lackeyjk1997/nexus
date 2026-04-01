"use client";

import { createRivetKit } from "@rivetkit/react";
import type { Registry } from "@/actors/registry";

const endpoint =
  process.env.NEXT_PUBLIC_RIVET_ENDPOINT ??
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/rivet`
    : "/api/rivet");

export const { useActor } = createRivetKit<Registry>(endpoint);

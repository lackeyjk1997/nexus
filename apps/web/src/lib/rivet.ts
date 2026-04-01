"use client";

import { createRivetKit } from "@rivetkit/react";
import type { Registry } from "@/actors/registry";

const endpoint =
  process.env.NEXT_PUBLIC_RIVET_ENDPOINT ??
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/rivet`
    : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/api/rivet`);

export const { useActor } = createRivetKit<Registry>(endpoint);

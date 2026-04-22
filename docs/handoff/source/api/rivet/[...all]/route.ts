import { toNextHandler } from "@rivetkit/next-js";
import { registry } from "@/actors/registry";

export const maxDuration = 300;

export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = toNextHandler(registry);

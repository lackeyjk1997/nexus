import { registry } from "@/actors/registry";

const handler = (req: Request) => registry.handler(req);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;

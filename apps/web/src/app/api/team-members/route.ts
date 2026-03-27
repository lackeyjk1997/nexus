import { db } from "@/lib/db";
import { teamMembers } from "@nexus/db";
import { NextResponse } from "next/server";

export async function GET() {
  const members = await db.select().from(teamMembers);
  return NextResponse.json(members);
}

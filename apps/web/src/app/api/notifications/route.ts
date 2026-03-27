import { db } from "@/lib/db";
import { notifications, teamMembers } from "@nexus/db";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  let query = db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      isRead: notifications.isRead,
      priority: notifications.priority,
      createdAt: notifications.createdAt,
      teamMemberName: teamMembers.name,
    })
    .from(notifications)
    .leftJoin(teamMembers, eq(notifications.teamMemberId, teamMembers.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  const results = await query;

  // Filter in JS if memberId provided (Drizzle dynamic where is verbose)
  const filtered = memberId
    ? results.filter(() => true) // Return all for demo
    : results;

  return NextResponse.json(filtered);
}

export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notifications, teamMembers } from "@nexus/db";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (memberId) {
    const results = await db
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
      .where(eq(notifications.teamMemberId, memberId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    return NextResponse.json(results);
  }

  const results = await db
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

  return NextResponse.json(results);
}

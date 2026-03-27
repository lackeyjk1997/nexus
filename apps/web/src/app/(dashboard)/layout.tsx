import { PersonaProvider, type TeamMemberInfo } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { db } from "@/lib/db";
import { teamMembers, supportFunctionMembers } from "@nexus/db";
import type { Role } from "@nexus/shared";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [members, supportMembers] = await Promise.all([
    db.select().from(teamMembers),
    db.select().from(supportFunctionMembers),
  ]);

  const users: TeamMemberInfo[] = [
    ...members.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role as Role,
      email: m.email,
      verticalSpecialization: m.verticalSpecialization ?? "general",
    })),
    ...supportMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: "SUPPORT" as Role,
      email: m.email || "",
      verticalSpecialization: m.function ?? "general",
    })),
  ];

  const sortedUsers = users.sort((a, b) => {
    if (a.name === "Sarah Chen") return -1;
    if (b.name === "Sarah Chen") return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <PersonaProvider initialUsers={sortedUsers}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </PersonaProvider>
  );
}

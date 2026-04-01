import { PersonaProvider, type TeamMemberInfo } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { LayoutAgentBar } from "@/components/layout-agent-bar";
import { DemoGuide } from "@/components/demo-guide";
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

  // Demo-curated user order: primary AEs → manager → SA → support functions
  const DEMO_ORDER = [
    "Sarah Chen",
    "David Park",
    "Ryan Foster",
    "Marcus Thompson",
    "Alex Kim",
    "Lisa Park",
    "Michael Torres",
    "Rachel Kim",
  ];
  const demoSet = new Set(DEMO_ORDER);
  const sortedUsers = users
    .filter((u) => demoSet.has(u.name))
    .sort((a, b) => DEMO_ORDER.indexOf(a.name) - DEMO_ORDER.indexOf(b.name));

  return (
    <PersonaProvider initialUsers={sortedUsers}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 pb-0 flex flex-col">
            <div className="flex-1">{children}</div>
            <LayoutAgentBar />
          </main>
        </div>
      </div>
      <DemoGuide />
    </PersonaProvider>
  );
}

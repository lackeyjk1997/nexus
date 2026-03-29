"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  Mail,
  Phone,
  UsersRound,
  BarChart3,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  AudioWaveform,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/components/providers";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Kanban,
  Users,
  Mail,
  Phone,
  UsersRound,
  BarChart3,
  Bot,
  Settings,
  AudioWaveform,
  Sparkles,
};

const NAV_ITEMS = [
  { label: "Command Center", href: "/command-center", icon: "LayoutDashboard", roles: ["AE", "BDR", "SA", "CSM", "MANAGER", "SUPPORT"] },
  { label: "Pipeline", href: "/pipeline", icon: "Kanban", roles: ["AE", "BDR", "SA", "CSM", "MANAGER", "SUPPORT"] },
  { label: "Intelligence", href: "/intelligence", icon: "BarChart3", roles: ["AE", "BDR", "SA", "CSM", "MANAGER", "SUPPORT"] },
  { label: "Outreach", href: "/outreach", icon: "Mail", roles: ["AE", "BDR", "SA", "CSM", "MANAGER", "SUPPORT"] },
  { label: "Agent Config", href: "/agent-config", icon: "Bot", roles: ["AE", "BDR", "SA", "CSM", "MANAGER", "SUPPORT"] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { role } = usePersona();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar border-r border-border flex flex-col transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <span className="text-xl font-semibold text-primary tracking-tight">
            Nexus
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-primary-light text-muted-foreground hover:text-primary transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = ICONS[item.icon];
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary-light hover:text-primary"
              )}
              title={collapsed ? item.label : undefined}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        {!collapsed && (
          <p className="text-xs text-muted-foreground">
            AI Sales Orchestration
          </p>
        )}
      </div>
    </aside>
  );
}

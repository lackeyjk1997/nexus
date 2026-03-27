"use client";

import { Bell, ChevronDown, User, X, Undo2, Clock } from "lucide-react";
import { usePersona, type TeamMemberInfo } from "@/components/providers";
import { useState, useRef, useEffect } from "react";
import type { Role } from "@nexus/shared";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  AE: "Account Executive",
  BDR: "Business Development Rep",
  SA: "Solutions Architect",
  CSM: "Customer Success Manager",
  MANAGER: "Sales Manager",
  SUPPORT: "Support Function",
};

const VERTICAL_SHORT: Record<string, string> = {
  healthcare: "HC",
  financial_services: "FS",
  technology: "Tech",
  manufacturing: "Mfg",
  retail: "Retail",
  general: "",
};

export function TopBar() {
  const { role, personaName, currentUser, setCurrentUser, allUsers } =
    usePersona();
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    { id: string; type: string; title: string; message: string; isRead: boolean | null; priority: string | null; createdAt: string }[]
  >([]);
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch notifications for current user
  useEffect(() => {
    if (currentUser) {
      fetch(`/api/notifications?memberId=${currentUser.id}`)
        .then((r) => r.json())
        .then(setNotifications)
        .catch(() => {});
    }
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function timeAgo(date: string) {
    const seconds = Math.floor(
      (Date.now() - new Date(date).getTime()) / 1000
    );
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // Group users by role for the switcher
  const roleGroups: Record<string, typeof allUsers> = {};
  for (const u of allUsers) {
    if (!roleGroups[u.role]) roleGroups[u.role] = [];
    roleGroups[u.role]!.push(u);
  }

  return (
    <>
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">Nexus</span>
          <span className="text-xs text-muted-foreground bg-primary-light px-2 py-0.5 rounded-full">
            Demo
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* User Switcher */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
            >
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-[10px] font-medium text-primary-foreground">
                  {personaName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium leading-none">
                  {personaName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[role]}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {userOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-card rounded-lg border border-border shadow-lg z-50 max-h-[70vh] overflow-y-auto">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Switch User
                  </p>
                </div>
                {(["MANAGER", "AE", "SA", "BDR", "CSM"] as Role[]).map(
                  (r) =>
                    roleGroups[r] && (
                      <div key={r}>
                        <div className="px-3 pt-2 pb-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {ROLE_LABELS[r]}
                          </p>
                        </div>
                        {roleGroups[r]!.map((user) => (
                          <UserButton key={user.id} user={user} currentUser={currentUser} setCurrentUser={setCurrentUser} setUserOpen={setUserOpen} />
                        ))}
                      </div>
                    )
                )}
                {/* Support Functions */}
                {roleGroups["SUPPORT"] && roleGroups["SUPPORT"].length > 0 && (
                  <div>
                    <div className="px-3 pt-3 pb-1 border-t border-border mt-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Support Functions
                      </p>
                    </div>
                    {roleGroups["SUPPORT"]!.map((user) => (
                      <UserButton key={user.id} user={user} currentUser={currentUser} setCurrentUser={setCurrentUser} setUserOpen={setUserOpen} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground px-1">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-96 bg-card rounded-lg border border-border shadow-lg z-50 max-h-[70vh] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                          !n.isRead && "bg-primary-light/20"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                              n.type === "approval_needed"
                                ? "bg-amber-50 text-warning"
                                : n.type === "agent_recommendation"
                                  ? "bg-violet-50 text-violet-600"
                                  : "bg-primary-light text-primary"
                            )}
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeAgo(n.createdAt)}
                              </span>
                              {n.message.includes("[Undo]") && (
                                <button className="text-[10px] text-secondary hover:underline flex items-center gap-0.5">
                                  <Undo2 className="h-3 w-3" />
                                  Undo
                                </button>
                              )}
                            </div>
                          </div>
                          {!n.isRead && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* User switcher banner */}
      {currentUser && currentUser.name !== "Sarah Chen" && (
        <div className="h-8 bg-muted/70 border-b border-border flex items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">
            Viewing as:{" "}
            <span className="font-medium text-foreground">
              {currentUser.name}
            </span>{" "}
            ({ROLE_LABELS[currentUser.role]}
            {currentUser.verticalSpecialization !== "general" &&
              ` — ${currentUser.verticalSpecialization.replace("_", " ")}`}
            )
          </span>
          <button
            onClick={() => {
              const sarah = allUsers.find((u) => u.name === "Sarah Chen");
              if (sarah) setCurrentUser(sarah);
            }}
            className="text-primary hover:underline"
          >
            Switch back
          </button>
        </div>
      )}
    </>
  );
}

function UserButton({ user, currentUser, setCurrentUser, setUserOpen }: {
  user: TeamMemberInfo;
  currentUser: TeamMemberInfo | null;
  setCurrentUser: (u: TeamMemberInfo) => void;
  setUserOpen: (v: boolean) => void;
}) {
  const FUNCTION_LABELS: Record<string, string> = {
    enablement: "Enablement",
    product_marketing: "Product Marketing",
    deal_desk: "Deal Desk",
  };

  return (
    <button
      onClick={() => { setCurrentUser(user); setUserOpen(false); }}
      className={cn(
        "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between",
        currentUser?.id === user.id && "bg-primary-light text-primary"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-[10px] font-medium text-primary">
            {user.name.split(" ").map((n) => n[0]).join("")}
          </span>
        </div>
        <div>
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {(user.role as string) === "SUPPORT"
              ? FUNCTION_LABELS[user.verticalSpecialization] || user.verticalSpecialization
              : user.verticalSpecialization !== "general"
                ? user.verticalSpecialization.replace("_", " ")
                : ""}
          </p>
        </div>
      </div>
      {currentUser?.id === user.id && <div className="h-2 w-2 rounded-full bg-primary" />}
    </button>
  );
}

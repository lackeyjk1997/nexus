"use client";

import { Bell, ChevronDown, User } from "lucide-react";
import { usePersona } from "@/components/providers";
import { useState, useRef, useEffect } from "react";
import type { Role } from "@nexus/shared";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<Role, string> = {
  AE: "Account Executive",
  BDR: "Business Development Rep",
  SA: "Solutions Architect",
  CSM: "Customer Success Manager",
  MANAGER: "Sales Manager",
};

const ROLES: Role[] = ["AE", "BDR", "SA", "CSM", "MANAGER"];

export function TopBar() {
  const { role, setRole, personaName } = usePersona();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-primary">Nexus</span>
        <span className="text-xs text-muted-foreground bg-primary-light px-2 py-0.5 rounded-full">
          Demo
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Persona Switcher */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
          >
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium leading-none">{personaName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card rounded-lg border border-border shadow-lg z-50 py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Switch Persona
                </p>
              </div>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between",
                    r === role && "bg-primary-light text-primary"
                  )}
                >
                  <div>
                    <p className="font-medium">{r}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[r]}
                    </p>
                  </div>
                  {r === role && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary" />
        </button>
      </div>
    </header>
  );
}

"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Role } from "@nexus/shared";

export interface TeamMemberInfo {
  id: string;
  name: string;
  role: Role;
  email: string;
  verticalSpecialization: string;
}

interface PersonaContextType {
  role: Role;
  setRole: (role: Role) => void;
  personaName: string;
  currentUser: TeamMemberInfo | null;
  setCurrentUser: (user: TeamMemberInfo) => void;
  allUsers: TeamMemberInfo[];
  setAllUsers: (users: TeamMemberInfo[]) => void;
}

const PersonaContext = createContext<PersonaContextType>({
  role: "AE",
  setRole: () => {},
  personaName: "Sarah Chen",
  currentUser: null,
  setCurrentUser: () => {},
  allUsers: [],
  setAllUsers: () => {},
});

export function usePersona() {
  return useContext(PersonaContext);
}

function getInitialUser(users: TeamMemberInfo[]): TeamMemberInfo | null {
  if (users.length === 0) return null;
  // Check localStorage for saved persona
  if (typeof window !== "undefined") {
    try {
      const savedId = localStorage.getItem("nexus_persona_id");
      if (savedId) {
        const found = users.find((u) => u.id === savedId);
        if (found) return found;
      }
    } catch {}
  }
  // Default to Sarah Chen
  return users.find((u) => u.name === "Sarah Chen") || users[0] || null;
}

export function PersonaProvider({
  children,
  initialUsers,
}: {
  children: ReactNode;
  initialUsers?: TeamMemberInfo[];
}) {
  const [allUsers, setAllUsers] = useState<TeamMemberInfo[]>(initialUsers || []);
  const [currentUser, setCurrentUser] = useState<TeamMemberInfo | null>(
    () => getInitialUser(initialUsers || [])
  );

  const role = currentUser?.role || "AE";
  const personaName = currentUser?.name || "Sarah Chen";

  function setRole(r: Role) {
    const match = allUsers.find((u) => u.role === r);
    if (match) handleSetUser(match);
  }

  function handleSetUser(user: TeamMemberInfo) {
    setCurrentUser(user);
    try {
      localStorage.setItem("nexus_persona_id", user.id);
    } catch {}
  }

  return (
    <PersonaContext.Provider
      value={{
        role,
        setRole,
        personaName,
        currentUser,
        setCurrentUser: handleSetUser,
        allUsers,
        setAllUsers,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

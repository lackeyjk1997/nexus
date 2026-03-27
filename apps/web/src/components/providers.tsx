"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
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

export function PersonaProvider({
  children,
  initialUsers,
}: {
  children: ReactNode;
  initialUsers?: TeamMemberInfo[];
}) {
  const [allUsers, setAllUsers] = useState<TeamMemberInfo[]>(initialUsers || []);
  const [currentUser, setCurrentUser] = useState<TeamMemberInfo | null>(
    initialUsers?.[0] || null
  );

  const role = currentUser?.role || "AE";
  const personaName = currentUser?.name || "Sarah Chen";

  function setRole(r: Role) {
    const match = allUsers.find((u) => u.role === r);
    if (match) setCurrentUser(match);
  }

  function handleSetUser(user: TeamMemberInfo) {
    setCurrentUser(user);
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

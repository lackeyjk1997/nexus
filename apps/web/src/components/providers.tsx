"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Role } from "@nexus/shared";

interface PersonaContextType {
  role: Role;
  setRole: (role: Role) => void;
  personaName: string;
}

const PERSONA_NAMES: Record<Role, string> = {
  AE: "Sarah Chen",
  BDR: "Jake Morrison",
  SA: "David Kim",
  CSM: "Liam Foster",
  MANAGER: "Kate Jensen",
};

const PersonaContext = createContext<PersonaContextType>({
  role: "AE",
  setRole: () => {},
  personaName: "Sarah Chen",
});

export function usePersona() {
  return useContext(PersonaContext);
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("AE");

  return (
    <PersonaContext.Provider
      value={{ role, setRole, personaName: PERSONA_NAMES[role] }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

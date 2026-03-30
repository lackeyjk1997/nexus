"use client";

import { usePathname } from "next/navigation";
import { ObservationInput } from "@/components/observation-input";

function getContextFromPathname(pathname: string): {
  page: string;
  dealId?: string;
  trigger?: string;
} {
  if (pathname.startsWith("/pipeline/") && pathname !== "/pipeline") {
    const dealId = pathname.split("/")[2];
    return { page: "deal_detail", dealId, trigger: "manual" };
  }
  if (pathname === "/pipeline") return { page: "pipeline", trigger: "pipeline_review" };
  if (pathname === "/outreach") return { page: "outreach", trigger: "manual" };
  if (pathname === "/intelligence") return { page: "intelligence" };
  if (pathname === "/playbook") return { page: "playbook" };
  if (pathname === "/command-center") return { page: "command_center" };
  if (pathname === "/agent-config") return { page: "agent_config" };
  if (pathname === "/prospects") return { page: "prospects", trigger: "manual" };
  if (pathname === "/analyze") return { page: "analyze" };
  return { page: pathname.replace(/^\//, "") || "dashboard" };
}

function getPlaceholder(pathname: string): string {
  if (pathname === "/command-center") {
    return "Ask Nexus — prep a call, draft an email, or share intel";
  }
  if (pathname === "/pipeline") {
    return "Ask Nexus — prep a call, draft an email, or share what you're noticing";
  }
  if (pathname.startsWith("/pipeline/")) {
    return "Ask Nexus about this deal — prep a call, draft a follow-up, or share intel";
  }
  if (pathname === "/intelligence") {
    return "Share what you're seeing in the field, or ask a question";
  }
  if (pathname === "/playbook") {
    return "Have an idea for how we should sell? Share a process improvement here";
  }
  if (pathname === "/outreach") {
    return "Ask Nexus — draft an email or share what you're seeing";
  }
  if (pathname === "/agent-config") {
    return "Tell your agent what to do differently";
  }
  return "Ask Nexus — prep a call, draft an email, or share intel";
}

export function LayoutAgentBar() {
  const pathname = usePathname();

  // Agent Config has its own input — don't show the global agent bar
  if (pathname === "/agent-config") return null;

  const context = getContextFromPathname(pathname);
  const placeholder = getPlaceholder(pathname);

  return <ObservationInput context={context} placeholder={placeholder} />;
}

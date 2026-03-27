export const ROLES = ["AE", "BDR", "SA", "CSM", "MANAGER"] as const;
export type Role = (typeof ROLES)[number];

export const VERTICALS = [
  "healthcare",
  "financial_services",
  "manufacturing",
  "retail",
  "technology",
  "general",
] as const;
export type Vertical = (typeof VERTICALS)[number];

export const PIPELINE_STAGES = [
  "new_lead",
  "qualified",
  "discovery",
  "technical_validation",
  "proposal",
  "negotiation",
  "closing",
  "closed_won",
  "closed_lost",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  new_lead: "New Lead",
  qualified: "Qualified",
  discovery: "Discovery",
  technical_validation: "Technical Validation",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closing: "Closing",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const FORECAST_CATEGORIES = [
  "pipeline",
  "upside",
  "commit",
  "closed",
] as const;
export type ForecastCategory = (typeof FORECAST_CATEGORIES)[number];

export const PRODUCTS = [
  "claude_api",
  "claude_enterprise",
  "claude_team",
] as const;
export type Product = (typeof PRODUCTS)[number];

export const PRODUCT_LABELS: Record<Product, string> = {
  claude_api: "Claude API",
  claude_enterprise: "Claude Enterprise",
  claude_team: "Claude Team",
};

export const LEAD_SOURCES = [
  "inbound",
  "outbound",
  "plg_upgrade",
  "partner",
  "event",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CONTACT_ROLES = [
  "champion",
  "economic_buyer",
  "technical_evaluator",
  "end_user",
  "blocker",
  "coach",
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const ACTIVITY_TYPES = [
  "email_sent",
  "email_received",
  "call_completed",
  "meeting_scheduled",
  "meeting_completed",
  "note_added",
  "stage_changed",
  "task_completed",
  "document_shared",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const VERTICAL_COLORS: Record<string, string> = {
  healthcare: "#3B82F6",
  financial_services: "#10B981",
  manufacturing: "#F59E0B",
  retail: "#8B5CF6",
  technology: "#06B6D4",
  general: "#6B7280",
};

export const NAV_ITEMS = [
  { label: "Command Center", href: "/command-center", icon: "LayoutDashboard", roles: ["AE", "BDR", "SA", "CSM", "MANAGER"] },
  { label: "Pipeline", href: "/pipeline", icon: "Kanban", roles: ["AE", "MANAGER"] },
  { label: "Prospects", href: "/prospects", icon: "Users", roles: ["AE", "BDR", "MANAGER"] },
  { label: "Outreach", href: "/outreach", icon: "Mail", roles: ["AE", "BDR", "MANAGER"] },
  { label: "Calls", href: "/calls", icon: "Phone", roles: ["AE", "SA", "MANAGER"] },
  { label: "Team", href: "/team", icon: "UsersRound", roles: ["MANAGER"] },
  { label: "Analytics", href: "/analytics", icon: "BarChart3", roles: ["AE", "MANAGER"] },
  { label: "Agent Config", href: "/agent-config", icon: "Bot", roles: ["AE", "BDR", "SA", "CSM", "MANAGER"] },
  { label: "Agent Admin", href: "/agent-admin", icon: "Settings", roles: ["MANAGER"] },
] as const;

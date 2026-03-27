import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export function daysAgo(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function getHealthColor(daysInStage: number, stage: string): string {
  const thresholds: Record<string, number[]> = {
    new_lead: [7, 14],
    qualified: [10, 21],
    discovery: [14, 30],
    technical_validation: [21, 45],
    proposal: [14, 30],
    negotiation: [21, 45],
    closing: [7, 21],
  };
  const [yellow, red] = thresholds[stage] ?? [14, 30];
  if (daysInStage >= red) return "danger";
  if (daysInStage >= yellow) return "warning";
  return "success";
}

export function getVerticalColor(vertical: string): string {
  const colors: Record<string, string> = {
    healthcare: "#3B82F6",
    financial_services: "#10B981",
    manufacturing: "#F59E0B",
    retail: "#8B5CF6",
    technology: "#06B6D4",
    general: "#6B7280",
  };
  return colors[vertical] ?? "#6B7280";
}

# NEXUS — AI Sales Orchestration Platform

## Project Overview
Nexus is a full-cycle AI sales orchestration platform where human AEs direct AI agents to automate key elements of the buyer's journey. Built as a functional demo for Anthropic's mid-market sales leadership. Every person in the sales cycle gets their own configurable AI agent connected through an organizational learning loop — feedback from downstream roles reshapes upstream agent behavior.

## Tech Stack
- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **UI:** shadcn/ui + Tailwind CSS + Tremor (charts/data viz)
- **Database:** Supabase PostgreSQL + Drizzle ORM
- **AI:** Claude API (later sessions)
- **Hosting:** Vercel (frontend)
- **Auth:** None (public demo)

## Code Conventions
- TypeScript strict mode everywhere
- ES modules (import/export, no require)
- React: functional components only
- Styling: Tailwind utility classes only
- Components: shadcn/ui as base, customize with Anthropic brand tokens
- API routes: Next.js App Router route handlers
- Database: Drizzle ORM with typed queries, no raw SQL
- Naming: camelCase variables/functions, PascalCase components/types, kebab-case files
- Default exports for pages, named exports for utilities

## Anthropic Brand Palette
--bg-primary: #FAF9F6 (warm cream background)
--bg-card: #FFFFFF (card background)
--bg-sidebar: #F5F3EF (sidebar)
--accent-teal: #0C7489 (primary accent)
--accent-teal-light: #E6F4F7 (teal hover)
--accent-coral: #D4735E (secondary accent, alerts)
--accent-coral-light: #FDF0ED (coral highlight)
--text-primary: #1A1A1A
--text-secondary: #6B6B6B
--text-muted: #9B9B9B
--border: #E8E5E0
--success: #2D8A4E
--warning: #D4A843
--danger: #C74B3B

## Vertical Colors
Healthcare: #3B82F6 (blue)
Financial Services: #10B981 (emerald)
Manufacturing: #F59E0B (amber)
Retail: #8B5CF6 (violet)
Technology: #06B6D4 (cyan)

## Pipeline Stages
New Lead → Qualified → Discovery → Technical Validation → Proposal → Negotiation → Closing → Closed Won / Closed Lost

## Session History
- Follow-up fix: Removed keyword gating for follow-up decisions. Claude API now controls whether to ask follow-ups. Strengthened prompt to skip follow-ups on highly specific observations (named deal + competitor + dollar amount). Added isHighDetail fallback heuristic. Confirmed restyled inline UI was already in place — chat bubbles, numbered follow-up card, sparkle give-back card all rendering correctly. No toasts.

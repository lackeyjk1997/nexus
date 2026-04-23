# Handoff Notes — For Jeff

> **Reconciliation banner (added 2026-04-22 during the Pre-Phase 3 reconciliation pass).** Status: **Historical — superseded by the v2 oversight rhythm.** These notes were for handing the package to Codex as an external rebuilder. The actual rebuild runs via Claude Code in `~/nexus-v2/` with oversight via a separate chat — rhythm captured in `~/nexus-v2/docs/OVERSIGHT-META.md`. The "First Codex prompt" template below is **not** the current kickoff shape.
>
> **Current kickoff rhythm:** `~/nexus-v2/docs/OVERSIGHT-META.md` "Handoff prompt for a fresh oversight chat" section. Oversight reads META → CLAUDE.md → DECISIONS → BUILD-LOG → PRODUCTIZATION → FOUNDATION-REVIEW → PRE-PHASE-3-FIX-PLAN; per-session kickoff prompts are drafted from the fix plan or rebuild plan sections.
>
> **What's still useful here:** the "If Codex goes off-script" guardrails (conceptually apply to any Claude Code session — redirect to LOCKED decisions, don't re-litigate); the Mode 2 design-session discipline (Mode 1 shipped Phase 2 Day 1 via `docs/design/DESIGN-SYSTEM.md`; Mode 2 hero-page sessions remain per §3.2).

---

These are the notes you use when you upload this package to Codex. Not for Codex — for you. Keep them tight and actionable.

---

## One-line pitch to Codex

> "You are rebuilding a production-grade AI sales orchestration platform from a documented, critiqued, and re-architected spec. Every decision is already locked. Your job is to execute, not re-plan."

---

## First Codex prompt (paste this verbatim to kick off session 1)

```
Read docs/handoff/DECISIONS.md in full.
Then docs/handoff/10-REBUILD-PLAN.md.
Then docs/handoff/09-CRITIQUE.md.
Then docs/handoff/README.md.

Do not write any code yet. When you're done reading, reply with:
  1. A 10-bullet restatement of the three pillars, the stack, and what's explicitly out of scope.
  2. Any decision in DECISIONS.md you think is wrong, with evidence. (If none, say so.)
  3. Confirm you understand Phase 1 Day 1 from 10-REBUILD-PLAN.md Section 8 and are ready to execute it.

After I reply "go," execute Phase 1 Day 1. Report when done. Do not proceed to Day 2 without my approval.
```

---

## Phase kickoff prompts (reuse pattern for Phase 2–6)

**Phase 2 kickoff:**

```
Phase 1 complete. DESIGN-SYSTEM.md is attached — read it and populate Tailwind tokens.
Execute Phase 2 per 10-REBUILD-PLAN.md Section 6. Deliverables 1–8.
Exit criteria: every bullet under Phase 2 exit criteria. Report when you hit each one.
Flag any surface that needs a Mode 2 design session before you build it.
```

**Phase 3 kickoff:**

```
Phase 2 complete. Execute Phase 3 per 10-REBUILD-PLAN.md Section 6.
Port the 8 rewritten prompts in docs/handoff/source/prompts/ to packages/prompts/ verbatim.
Port the remaining 17 using the checklist in 04C-PROMPT-REWRITES.md Section 2.
Every prompt response must be parsed via tool-use. No regex JSON extraction anywhere.
```

**Phase 4 kickoff:**

```
Phase 3 complete. Execute Phase 4 per 10-REBUILD-PLAN.md Section 6.
Freeze the deal_events schema before any intelligence surface reads it.
Build the surfaces registry exactly as written in Section 6 (call_prep_brief, intelligence_dashboard_patterns, daily_digest, deal_detail_intelligence).
Every surface must render through SurfaceAdmission.admit().
```

**Phase 5 kickoff:**

```
Phase 4 complete. Execute Phase 5 per 10-REBUILD-PLAN.md Section 6.
Close-lost is the hero moment. Get 1.1 (research-interview pattern) and 2.21 (applicability gating) right before anything else.
Hypotheses surface FIRST, then dynamic questions, then the open narrative — never a blank form.
```

**Phase 6 kickoff:**

```
Phase 5 complete. Execute Phase 6 per 10-REBUILD-PLAN.md Section 6.
Per-feature Mode 2 design artifacts for the 5 hero pages are attached.
Rehearse the three-act demo end-to-end. No manual narration filling gaps.
Zero console errors, zero broken empty states, zero "this is wrong" surfacing that shouldn't surface.
```

---

## What YOU do manually (not Codex)

1. **Before Phase 1 Day 5 — provision HubSpot Starter Customer Platform.**
   Follow `07C-HUBSPOT-SETUP.md` Section 8. Create portal, private app, 38 custom properties, seed companies/deals. Drop credentials into Codex's env when you hand it off on Day 5.

2. **Between Phase 1 and Phase 2 — the design-system chat session.**
   Open a separate Claude chat. Brief: "In the spirit of OpenAI's aesthetic, not a clone. Do NOT copy `#10A37F`." Output: `docs/handoff/DESIGN-SYSTEM.md` with tokens, primitives, Framework 21 re-skinned. Drop into the v2 repo before Phase 2 starts.

3. **During Phase 2–6 — per-feature design sessions (Mode 2).**
   Codex will flag when it needs one. Hero pages at minimum: close-lost, intelligence dashboard, call prep brief, observation capture, deal detail, daily digest. Also the empty-state treatments and score/reasoning surfaces (per DECISIONS.md 1.15–1.18 additions). Output: `docs/design/<page-name>.md` + artifact. Hand to Codex when the phase reaches that page.

4. **Review after each phase.**
   Codex reports exit-criteria completion. You verify by clicking through the built feature. Sign off before the next phase kicks off.

---

## If Codex goes off-script

- It re-litigates a LOCKED decision → "That decision is locked in DECISIONS.md Section X. Do not re-open it. Proceed."
- It asks for clarification on something already answered → Point it to the relevant doc and section.
- It proposes to add a library not in 10-REBUILD-PLAN.md Section 2 → Say no unless it's solving something Section 2 didn't anticipate.
- It wants to skip schema hygiene ("we can do it later") → Hard no. DECISIONS.md 2.2 is full-scope at v2 genesis.
- It builds a feature that's explicitly out of scope (multi-tenancy, role permissions, tour) → Revert and redirect.

---

## Package contents reminder

- 18 markdown docs (`docs/handoff/*.md`) + this file + VALIDATION.md
- `source/` with current Nexus code as read-only reference (1.8MB, 138 files)
- `source/prompts/` with 9 rewritten prompt `.md` files ready to drop into `packages/prompts/` on Phase 1 Day 3
- Zip artifact at repo root: `nexus-codex-handoff-39bd044.zip`

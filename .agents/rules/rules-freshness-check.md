<!-- coalmine: verified 2026-08-05 · exemplar this project's own MEMORY.md status-tracking convention · revalidate 90d -->

# Rules Freshness Check

> **Problem this solves**: a new binding rule lands in `AGENTS.md`/`.agents/rules/**`, but an agent already mid-session (or one that skims instead of reading) never picks it up and keeps working against the old rule set. This is the cheap tripwire that catches that before it causes a bad edit — not a full re-read every time, just a two-number comparison that tells you whether a full re-read is owed.

## The check (do this before any code edit, every session)

1. Open `AGENTS.md`. Read the `RULES_VERSION:` line at the top.
2. Open `MEMORY.md`. Find the `RULES_VERSION last synced:` line in the status section.
3. **Compare the two numbers.**
   - **Equal** → rules are current as far as this project's memory knows. Proceed normally (still subject to the normal "read MEMORY.md first" law).
   - **`AGENTS.md`'s number is higher** → a rule changed since the last session recorded it. Before any other action: fully read `AGENTS.md` top to bottom and every file under `.agents/rules/**` (not a skim — a new MUST-HAVE could be anywhere). Then update `MEMORY.md`'s `RULES_VERSION last synced:` to match, with the usual identity stamp.
   - **`MEMORY.md`'s number is higher than `AGENTS.md`'s** → inconsistent state (someone edited `MEMORY.md`'s counter by hand, or a merge went wrong). Flag it to the human present; don't guess which is right.

## Who bumps `RULES_VERSION`

Whoever edits `AGENTS.md`, adds/removes/materially changes a file under `.agents/rules/**`, or changes `.agents/rules/ring0-authority.md`'s precedence order increments `RULES_VERSION` by 1 in the same edit. Typo fixes, comment tweaks, and stamp-date-only re-validations do **not** bump it — only changes that could alter what an agent does.

## The entry gate — what a new rule must carry before it may be written

<!-- coalmine: verified 2026-08-12 · exemplar Vite CONTRIBUTING.md "Think Before Adding Yet Another Option" (four criteria gate an addition at entry, not at review) · revalidate 90d -->

Added 2026-08-12 from a gold-standard audit against Vite, Kubernetes, Godot, Svelte, Mindustry, Veloren, Excalidraw and TanStack Query. The measurement that produced it: this repo carries **~498 KB of mandatory-read governance prose against 1.67 MB of source** — roughly 1:3.4, where Vite's contributor rule surface is one file. Every duplication and dead-code finding in that audit happened _while_ 23 rules and 59 rule files were in force. Rules were being added faster than anything could enforce them, and rule 21 — retired 2026-08-12 as the first removal in this file's history — was the proof: it stood for four days, was never obeyed once, and its own epitaph states the principle this gate makes binding.

Before a new rule is written into `AGENTS.md` or `.agents/rules/**`, it must name all three:

1. **The incident it prevents.** Something that actually happened in this repo, not something conceivable. "Has this been reproduced?" is the test, not "could this occur?"
2. **The mechanism that enforces it** — a lint rule, a test, a CI check, or a tool. _A rule an agent must volunteer to obey is not a rule; it is a wish._ If nothing can enforce it, the honest options are to build the enforcement first, or to write the fix instead of the rule.
3. **The condition under which it retires.** A rule with no exit is a rule that outlives its reason.

A proposal missing any of the three does not get written. Prefer, in this order: **delete the problem** · **a check that fails** · **a one-line rule** · and only then a rule file.

This gate binds additions, not the rules already standing — those are reviewed by the normal `revalidate` stamps. It exists because the cheapest governance is the governance nobody has to read.

## Why a plain counter, not a content hash

A hash would catch every keystroke, including ones that don't change meaning (whitespace, comment fixes) — that's noise, not signal, and it invites agents to bump it reflexively without thinking about whether the change was substantive. A hand-incremented counter forces the editor to make the "does this actually change agent behavior?" judgment once, at edit time, instead of every reader re-deriving it.

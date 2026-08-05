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

## Why a plain counter, not a content hash

A hash would catch every keystroke, including ones that don't change meaning (whitespace, comment fixes) — that's noise, not signal, and it invites agents to bump it reflexively without thinking about whether the change was substantive. A hand-incremented counter forces the editor to make the "does this actually change agent behavior?" judgment once, at edit time, instead of every reader re-deriving it.

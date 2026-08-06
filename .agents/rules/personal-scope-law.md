# Project Law: Personal / Off-Project Content Stays Out of MEMORY.md

> **Target Workspace**: `LegendOfSoulTH` (LegendofSoulTH)
> **Operator / Human User Identity**: `HetCreep`
> **Scope**: Binding for ALL AI agents, subagents, and automated assistants operating on this codebase.

---

## The rule

`MEMORY.md` is mandatory reading for every agent, every session (`agent-memory-law.md` §1) —
that makes it a shared, token-costly resource. Content that has nothing to do with this
project (personal reminders, unrelated errands, notes about other repos/tools, anything
HetCreep just wants remembered but that doesn't inform work on `LegendOfSoulTH` itself)
**must never be written into `MEMORY.md`**, even if it seems harmless or brief.

**Why**: every future agent — on this machine or any other clone — reads `MEMORY.md` in
full before doing anything (§1 of `agent-memory-law.md`). Personal content sitting in
there gets re-read and re-processed by every one of those sessions forever, burning
tokens on context those agents have no use for and didn't ask to carry.

## Where personal content actually goes instead

`MEMORY.local.md` at the repo root — gitignored (see `.gitignore`), never pushed, never
read as part of the mandatory-memory protocol. Write personal/off-project notes there
instead of `MEMORY.md`. It's local-only, same pattern as `.agents/ring0.local`
(`.coalmine.json` was moved to this same local-only model earlier — see `MEMORY.md`
Past Summary for that precedent).

If `MEMORY.local.md` doesn't exist yet on a given machine, create it — don't ask
permission first, it's inert until something is written to it, and it's gitignored so
creating it has no shared-repo effect.

## What still belongs in MEMORY.md

Anything that actually informs work on this project: decisions, architecture, open
items, session history, status. The bar is "would a future agent working on
`LegendOfSoulTH` need this to do its job correctly" — not "did HetCreep say it during
a `LegendOfSoulTH` session." A personal aside said *during* a project session is still
personal; it doesn't become project-relevant just because of when it was said.

When genuinely unsure which bucket something belongs in, ask rather than guess — a
wrongly-omitted project fact is easy to re-add next session, but a personal note
leaked into the shared file stays there burning tokens until someone notices and
manually cleans it out.

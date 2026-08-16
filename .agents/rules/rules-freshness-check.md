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

Whoever edits `AGENTS.md`, adds/removes/materially changes a file under `.agents/rules/**`, or changes the rule-precedence order in `AGENTS.md`'s ⚖️ header increments `RULES_VERSION` by 1 in the same edit. Typo fixes, comment tweaks, and stamp-date-only re-validations do **not** bump it — only changes that could alter what an agent does.

## The entry gate — what a new rule must carry before it may be written

<!-- coalmine: verified 2026-08-12 · exemplar Vite CONTRIBUTING.md "Think Before Adding Yet Another Option" (four criteria gate an addition at entry, not at review) · revalidate 90d -->

Added 2026-08-12 from a gold-standard audit against Vite, Kubernetes, Godot, Svelte, Mindustry, Veloren, Excalidraw and TanStack Query. The measurement that produced it: this repo carries **~498 KB of mandatory-read governance prose against 1.67 MB of source** — roughly 1:3.4, where Vite's contributor rule surface is one file. Every duplication and dead-code finding in that audit happened _while_ 23 rules and 59 rule files were in force. Rules were being added faster than anything could enforce them, and rule 21 — retired 2026-08-12 as the first removal in this file's history — was the proof: it stood for four days, was never obeyed once, and its own epitaph states the principle this gate makes binding.

Before a new rule is written into `AGENTS.md` or `.agents/rules/**`, it must name all three:

1. **The incident it prevents.** Something that actually happened in this repo, not something conceivable. "Has this been reproduced?" is the test, not "could this occur?"
2. **The mechanism that enforces it** — a lint rule, a test, a CI check, or a tool. _A rule an agent must volunteer to obey is not a rule; it is a wish._ If nothing can enforce it, the honest options are to build the enforcement first, or to write the fix instead of the rule.
3. **The condition under which it retires.** A rule with no exit is a rule that outlives its reason.

A proposal missing any of the three does not get written. Prefer, in this order: **delete the problem** · **a check that fails** · **a one-line rule** · and only then a rule file.

This gate binds additions, not the rules already standing — those are reviewed by the normal `revalidate` stamps. It exists because the cheapest governance is the governance nobody has to read.

<!-- coalmine: verified 2026-08-16 · exemplar OpenSSF Scorecard (a check scores on re-measurement, never on re-dating) + this law's own entry-gate criterion 2, applied to the rules already standing · revalidate 90d -->

## Three integrity requirements the date-based check cannot see (2026-08-16)

A 2026-08-16 gold-standard audit scored a new lane — rules-estate integrity — at **36.8%**,
the lowest of eleven, and every failure in it was the same shape: **a document asserting
something outside itself that nothing re-checks.** The counter above catches a rule that
CHANGED. These three catch a rule that stayed still while the world moved.

### 1. A status list inside a binding document carries a dated snapshot banner

**A status list, gap register, or open-questions section inside a binding document carries
a dated banner naming it a snapshot and pointing at where current status lives** — and the
pointer names the section that answers it, never leaving the reader to discover it.

This is not hypothetical and it is not cheap. `GACHA-RATE-DESIGN-LOCK.md` §8 listed twelve
questions as open while §11 and §12 had answered all twelve; an agent read the list as
current state and wrote a gacha price **6.25× the ratified one** into a sibling document
(`master-blueprint-law.md`, "A value in code is not a decision"). Eleven more stale `OPEN`
markers were found in the same file the next day. **The cure was already written in this
repo** — the same file banners its own other section correctly.

The estate has the identical defect: `gold-standard-baseline.md`'s gap register is undated,
and **two of its four MUST rows are now false** (component tests read "4/58", measured 34/66;
"no enforced bundle-size budget" against `tools/check-bundle-size.mjs` setting
`process.exitCode = 1`), with `AGENTS.md` propagating the framing to the entry point every
agent reads first.

### 2. A stamp names the command that re-proves it

**Every `coalmine:` stamp names the one command that re-proves its claim, and revalidation
means running that command.** A stamp whose claim cannot be re-measured mechanically does
not get a date — it gets rewritten until it can.

**A false rule at high precedence is worse than a missing one, because it is obeyed.**
`.agents/rules/ecc/PROJECT-OVERRIDES.md` wins precedence on toolchain conflicts, sits
**twenty days inside the shortest revalidate window in the estate**, and is wrong on four
measurable counts — it tells every agent Prettier is not installed (it runs on every
commit) and that the repo has one test file and no coverage tool (135 files, 1185 tests,
coverage in CI). Four of five audit scouts caught it independently. Both existing
governance mechanisms measure **time**; neither can see in-window-and-wrong.

**Any change to `package.json` dependencies or scripts re-checks `PROJECT-OVERRIDES.md` in
the same commit** — the same event-binding `security-doc-sync-law.md` already uses for
`SECURITY.md`, which is the template worth generalising.

### 3. Every rule states its own enforcement

**Every file under `.agents/rules/` states its enforcement in its own header — the check
that fails, or the word ADVISORY.**

The entry gate above (criterion 2) binds additions only, and says so. Rules written before
it were never held to it: **7 of 15 project laws have nothing that can enforce them**,
which this file's own words call a wish rather than a rule. The honest move is not to build
seven mechanisms — it is to let a reader tell a checked rule from an uncheckable one at a
glance, so nobody mistakes advisory prose for a gate.

**And a law this project authored carries a well-formed stamp.** `agent-memory-law.md` (the
most-cited law in the estate), `mutation-verified-fix-law.md` and `personal-scope-law.md`
have none, so the freshness system cannot see its own newest and most load-bearing rules.
`ecc/web/observability.md`'s `2026-08-07b` has no computable deadline. Vendored ECC files
are exempt by provenance.

**Enforcement**: ADVISORY. The mechanical half is a stamp-well-formedness pass, which
`node scripts/consistency.mjs` already describes as its job in the CoalMine contract; the
snapshot-banner and enforcement-header halves are read by a human or an agent.

## Why a plain counter, not a content hash

A hash would catch every keystroke, including ones that don't change meaning (whitespace, comment fixes) — that's noise, not signal, and it invites agents to bump it reflexively without thinking about whether the change was substantive. A hand-incremented counter forces the editor to make the "does this actually change agent behavior?" judgment once, at edit time, instead of every reader re-deriving it.

<!-- coalmine: verified 2026-08-06 · exemplar this session's own 10-system CoalBoard opinion-lane pass · revalidate 90d -->
# Project Law: New Systems Get Routed Through CoalBoard's "ask CB"

> **Target Workspace**: `LegendOfSoulTH` (LegendofSoulTH)
> **Operator / Human User Identity**: `HetCreep`
> **Scope**: Ring 0 (this machine) only — a standing operating preference for
> sessions HetCreep runs directly, not a mandate imposed on Ring 1 contributors'
> own agents. See `.agents/rules/ring0-authority.md` for what Ring 0/Ring 1 mean here.

---

## The rule

When a genuinely **new system or subsystem** is added to this project (not a
small fix or a tweak to something that already exists — see "What counts"
below), **offer to send it through CoalBoard's opinion lane ("ask CB")**
before considering the work finished. The question each new system gets asked
is the same one HetCreep asked for the 2026-08-06 pass across all 10
subsystems that existed at the time:

> How should this be modernized to international standards, stay updatable
> as the era moves on, and keep long-term maintenance cost as low as possible?

## Why this exists

The first full pass (`MEMORY.md`, item — the 10-system CoalBoard run,
2026-08-06) surfaced real, actionable findings across every system it
touched — a real bias-doubled UID bug, dead CI cost shipping unused GLB
assets to production, a battle-skill dispatch shape that was already
straining, zero test coverage on deterministic combat/dialogue logic, and
more — using only 4 cheap, blind, equal-tier seats per system (no fable, no
big spend). That's a cheap, repeatable check with a good hit rate. Systems
added *after* that pass don't get this scrutiny for free — someone has to
ask for it.

## What counts as "a new system"

Roughly the same granularity as the 10 systems in the 2026-08-06 pass —
Auth, Economy, Roster, Rendering, Battle, Exploration, Dialogue, UI/HUD,
Asset pipelines, Platform/Infra. A new system is something that would earn
its **own line** in a breakdown like that one: a new gameplay mechanic, a
new data/content pipeline, a new integration, a new cross-cutting concern
(e.g. a notifications system, a save-slot system, a crafting system). It is
**not**: a new component inside an existing system, a bug fix, a new
character/item/dialogue tree using an existing pipeline, a style pass, a new
test file. Use judgment — the bar is "does this deserve its own
DECISION FRAME," not "did any file get added."

## How to apply it

1. **Notice** when work in progress amounts to standing up a new system by
   the definition above.
2. **Offer, don't auto-run** — CoalBoard's own consent discipline applies in
   full here (see the `coalboard` skill): render the cost (~4 seats + judge,
   same shape as every prior run) and ask before spending. This law creates
   the *obligation to offer*, not a license to skip the ask.
3. On acceptance, run the opinion lane exactly as documented in the
   `coalboard` skill (`references/opinion-board.md`) — DECISION FRAME + BARE
   FRAME, 4 seats (realtime/reality/feeling/outdim), judge synthesis,
   disposition presented in chat.
4. Treat the verdict as a **default recommendation**, per the opinion lane's
   own disposition rule — HetCreep's call on what to actually apply, not a
   binding CONFORM pass.

## What this law does NOT do

- It does not make CoalBoard mandatory for small work — see "What counts."
- It does not authorize auto-spending on the board without asking each time
  (P3/G1 in the `coalboard` skill still bind).
- It does not bind Ring 1 sessions — a contributor's own agent is free to
  adopt this practice but isn't obligated to by this file (see the Ring
  System's own carve-out for Ring-1-owned operating choices).
- It is not retroactive busywork — the 10 systems already covered
  2026-08-06 don't need re-running unless something about them changes
  significantly enough to count as "new" again.

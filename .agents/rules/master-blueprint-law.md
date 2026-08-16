<!-- coalmine: verified 2026-08-07 · exemplar docs/MASTER_BLUEPRINT_v3.0.md · revalidate 90d -->

# Project Law: Master Blueprint Authority

> HetCreep / SOL WORK command, 2026-08-07. Updated for v3.0 baseline lock. `RULES_VERSION` bump in `AGENTS.md`.

## The rule

**`docs/MASTER_BLUEPRINT_v3.0.md` is the Product North Star for Legend of Soul TH.**

Blueprint v1.0, the v1.0-era gap analysis, and any v2.0 in-flight draft are **SUPERSEDED** and deleted — `docs/MASTER_BLUEPRINT_v3.0.md` is the only blueprint file in the repo (2026-08-07 consolidation).

Agents must treat locked decisions in v3.0 as binding product direction.

## What this means

1. Before gameplay/systems work, read Master Blueprint v3.0 (`docs/MASTER_BLUEPRINT_v3.0.md`) in full.
2. Conflicting code → **CURRENT / LEGACY / SUPERSEDED / DEFERRED** — document; do not silently match code to old blueprints.
3. **Docs/audit PRs** classify only — no combat, stage, gacha, PvP, or loot implementation.
4. Implementation PRs name blueprint section + roadmap priority (P1–P15); **one topic = one PR**.
5. **CUT/DEFERRED** items (loot RPG, affix, set bonus, dash button, skill-4, talent, awakening) must not be built without explicit HetCreep approval.
6. After a docs PR: **stop for human review**.

## What this does not license

- Rewriting the blueprint to excuse existing code without HetCreep decision.
- Mass-deleting LEGACY in a docs PR.
- Treating the practice fork as product baseline remote.
- Reverting to v1/v2 assumptions (4 skills, separate dash, early loot RPG, Ramakien-only ceiling).

<!-- coalmine: verified 2026-08-16 · exemplar this law's own §"What this means" rule 2 (CURRENT/LEGACY/SUPERSEDED/DEFERRED) extended to the design locks + MASTER_BLUEPRINT_v3.0.md §7.1's existing gacha deferral + the 2026-08-15 incident recorded below · revalidate 90d -->

## The design locks are binding the same way this blueprint is (2026-08-16)

**`docs/ECONOMY-DESIGN-LOCK.md` and `docs/GACHA-RATE-DESIGN-LOCK.md` are binding for every
game-economy number** — gacha rates, pity thresholds, per-pull price, currency topology,
exchange rates, reward formulas, drop tables. The blueprint sets product direction; the
locks set the numbers underneath it. Both are read before economy or gacha work, in full.

**Where code and a lock disagree, the lock wins and the difference is a migration item.**
Never the reverse, and never a tie.

### A value in code is not a decision

**A constant sitting in the repository is not evidence that anyone chose it.** It has two
possible meanings that look identical from the file — someone ratified it, or nobody has
migrated it yet — and defaulting to the first is what makes a stale value
self-perpetuating, because each reader ratifies the previous reader's assumption.

Before citing any economy or gacha constant as a decision, **find the sentence that
ratified it.** Grep the governing lock for the identifier and read the LAST place it
appears, not the first. If the only evidence is that the value exists in code, say
"currently shipped, provenance unknown" — never "decided".

**A long design document is not a queue.** Its early "open questions" section is a
snapshot from the day it was written; the answers accumulate later under different
headings. Check whether the same file resolves an item before answering it.

**The incident this is written from (2026-08-15).** An agent read `costSingle: 100` out of
`src/game/gacha/gachaConfig.ts`, treated the shipped constant as ratified, cited
`GACHA-RATE-DESIGN-LOCK.md` §8's open-questions list, and wrote `c = 100` into
`ECONOMY-DESIGN-LOCK.md` as a new ruling — **6.25× the `c = 16` that §11.8 derived from a
nine-game wage-burden comparison and the owner confirmed on 2026-08-12**, with §11.9
listing it as closed. HetCreep caught it on the next turn. The correction and the
anti-trap banner are commits `f20c3d3` and `5f5a932`.

**Still true at the time of writing, and it is the same class:** `gachaConfig.ts` ships
`costSingle: 100` / `costMulti: 900` against the locked `c = 16` / `cost_multi = 160`, and
`src/data/accountRepository.shared.ts` hardcodes ฿30/฿150/฿450 with three gold packages
implying exchange rates 10% apart — the third founding defect `ECONOMY-DESIGN-LOCK.md`
opens by citing. Both are un-migrated past, not decisions.

**Enforcement**: ADVISORY — no check exists. The closest mechanism,
`tools/check-blueprint-citations.mjs`, is scoped to `docs/agent-blueprint` and would cover
this if widened (audit item B4).

### A lock states its own licensing before it is committed

**A design lock carrying ratified numbers is licensed by an explicit `LICENSE` carve-out,
or by an explicit in-file note that it is MIT on purpose — no lock ships with its licensing
unstated.**

`LICENSE` carries **three** carve-outs: the sprite datum, `GACHA-RATE-DESIGN-LOCK.md`, and —
since 2026-08-16, HetCreep's ruling — `ECONOMY-DESIGN-LOCK.md`. All three are CC BY-NC-ND 4.0
with the same standing grant to Katomnoi Studio.

**The gap this rule was written from, and what it cost.** `ECONOMY-DESIGN-LOCK.md` had
neither a carve-out nor a stated MIT decision, so 133 KB of ratified THB pricing,
exchange-rate derivations and drop economics was freely sublicensable and commercially
usable — the exact thing the two existing carve-outs were written to prevent for siblings of
lesser value. By `LICENSE`'s own scope-limit clause a carve-out only reaches forward, so
**every copy taken between the file's first commit and 2026-08-16 stays under MIT
permanently**. That is the price of a lock shipping with its licensing unstated, and it is
why this rule is a MUST rather than a nicety. It is written into the new carve-out itself so
nobody later mistakes the carve-out for retroactive.

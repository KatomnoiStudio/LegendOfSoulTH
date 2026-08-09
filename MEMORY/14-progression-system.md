# MEMORY/14 — Progression System (caretaker)

Contract: `docs/agent-blueprint/14-progression-system.md`. Owns: Hero Level EXP curve
(legacy `applyBattleExp` in `RewardSystem.ts` + current `progressionService.applyHeroExp`/
`heroExpService.ts` path), Skill Level data model + level-up flow, Talent/Awakening
(un-deferred, fully built, UI hidden). Never touch: Star Ascension (#15), reward/EXP
generation (#18), stage/difficulty tuning (#16), Equipment/Loot, PvP normalization logic
(#20 — only expose read shape). Sensitive edge: progression persistence / `0008` migration —
no delegate-down there.

## Live state (2026-08-10)

Graduated 🟢 100% (TASKS.md row 21 / DF21, 2026-08-08), 1,868 lines in `src/game/progression/`.
Ring-0 balance lock (2026-08-09) fixed a non-monotonic Lv10/11 EXP seam
(`10n²+10n+100` continues the locked Lv1-10 table exactly, replacing the old
`100 + level*80`). #20 (PvP normalization) reads this system, zero production callers yet —
normal, waiting on #19's P13 build.

## First dispatch (2026-08-10) — citation-rot fix, design-lock 11.a

Contract had drifted from an earlier refactor (the guard-loop / curve math got split out of
`applyBattleExp` into a standalone `applyAccountExp`, and `player.ts` grew new fields pushing
`Player`'s own interface down). Re-derived every citation by grep, not by trusting the old
numbers. Corrected in the contract:

- `applyBattleExp`: `RewardSystem.ts:96-128` → **`:127-149`** (function now calls
  `applyAccountExp` first, does its own char-level guard loop after).
- `teamSlots.find` lead-hero resolve: `:109` → **`:130`**.
- Guard-loop citation (was one range `:101-107,116-122` from the pre-split function) → now
  correctly **two** blocks: `applyAccountExp`'s guard `:111-117` + `applyBattleExp`'s own
  char-level guard `:138-144`.
- `BattleReward` interface: `:14-18` → **`:15-19`**.
- `* 1.2` curve constant occurrences: `:105,120` → **`:115,142`**.
- "ห้าม RNG" doc-comment: `:9` → **`:10`**; "pure/dependency-free" comment: `line 11` →
  **`line 12`**.
- `Player` interface (account `level/exp/expToNext`): `player.ts:37-76` → **`:69-113`**
  (`:37` was stale — now points at `OwnedCharacter.skillLevels`, a different field entirely,
  after `OwnedCharacter` grew talent/awakening/star fields and pushed `Player` down).
- `SKILL_PROGRESSION_FIXTURES`: `progressionConfig.ts:63-146` → **`:77-146`** (end line was
  already correct by coincidence, start was off by 14).
- Second Supabase mirror block: `accountRepository.supabase.ts:454-456,593-595` → **second
  range `:598-600`** (first range `454-456` was already correct).
- Back-compat-read pattern citation pointed at the wrong FILE, not just wrong lines:
  `player.ts:57-64` (that span is `FriendCandidate`'s start, unrelated) → the actual
  `inventory ?? []`/`friends ?? []` pattern lives in **`src/data/accountRepository.ts:314-315`**
  (`normalizePlayer`); `player.ts` only has doc-comments _mentioning_ the pattern, at lines
  90 and 96.
- `AGENT_BLUEPRINT.md:32` (both occurrences — Scope para + Stay-current note) → **`:85`**
  (item 32 in the file today is the #14 status-summary bullet under Tier 1, not the P1-P15
  "locks architecturally" list entry; that entry moved to line 85 as the file grew).
- `docs/MASTER_BLUEPRINT_v3.0.md:364` → **`:365`** (off by one).

`progressionService.ts` upgradeSkill `:113-224`, `player.ts:12-23,37` (SkillLevels type +
field), `accountRepository.supabase.ts:454-456` (first block) — all verified exact, no
change. `SkillProgressionSystem.ts` lives at `src/game/realtimeBattle/` not
`src/game/progression/` and `PLACEHOLDER_HERO_EXP_TABLE`/the Lv11+ formula live in
`progressionConfig.ts` — but the contract's own prose never actually cited a directory path
for either, so nothing to fix there (a prior blueprint-check turn had flagged these as
"stale path" against citations that don't exist in this doc's text).

**Lesson**: a function getting split into two (curve math moved from `applyBattleExp` into a
new `applyAccountExp`) silently invalidates every citation into the old single-function
range — always grep the actual symbol, never assume a line range that "looks close enough"
still covers the same logic.

## Flagged, not edited (substance, not citation)

None — every claim substance checked against current code held (curve formula, table Lv1-10,
Talent/Awakening un-deferred status, Skill Level shipped shape, Supabase mirror columns).
Scope/ownership boundaries untouched this dispatch.

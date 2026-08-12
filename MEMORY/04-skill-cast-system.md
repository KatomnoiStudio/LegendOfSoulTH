# 04 — skill-cast-system (system-owner memory)

## Scope (from contract)

Own: skill1/skill2/skill3/ultimate cast lifecycle (`Input → Cast/Wind-up → AttackActive → Recovery`), cooldown/ultimate-gauge gating, i-frame windows, kit→hitbox mapping. `SkillSystem.ts`, `skills.ts`, `RealtimeSkillDefinition`/`SkillState` schema.
Never touch: `HitboxSystem.ts` collision (#basic-attack neighborhood), `DamageSystem.ts` damage math (#6), `ComboSystem.ts` chaining (#3), `EnemyAISystem.ts`, hero roster/leveling. `attacks.ts` move-timing data is shared source-of-truth, not mine to fork.

## Live state

- Five hero kits shipped (`monkey-king`, `pig-warrior`, `celestial-archer`, `nezha-warden`, `sand-sage`) via `HERO_SKILL_KITS` (`heroes/kits/index.ts:10-16`), re-exported `REALTIME_CHARACTER_KITS` (`skills.ts:34`). §3.6.7 schema fields (`castDelayMs`/`interruptible`/`movementDuringCast`/`lungeDistance`/`hitstunMs`/`knockdown`/`multiTarget`/`effects[]`) all live as optional fields (`attacks.ts:54-82`), with real runtime consumers confirmed in `RealtimeBattleRuntime.ts:163` and `HitboxSystem.ts:152` — not just designed, actually wired.
- `effects[]` (heal/buff/cc/summon) has schema but no resolver yet — §3.8.3 blocked on it, tracked as open, not a scar.

## Citation-rot fixed 2026-08-10 (first work dispatch)

Contract's file:line citations drift when files get edited elsewhere — re-derived every one against live source, never trusted the old number:

- `SkillSystem.ts:37-40` → `SkillSystem.ts:44-67`. Old range pointed at `isCastingSkill` (lines 40-42), not the actual gate function. `canStartSkill` (the function done-criterion 1 is about) spans 44-67; dead/hitstun route through `isControlLocked` at `combatReaction.ts:109`, not inline in `SkillSystem.ts`.
- `docs/MASTER_BLUEPRINT_v3.0.md` lines 318/320 → 317/319 for the `targetLock` Monkey King Ultimate references. Off-by-one: 318/320 land on blank lines; the real content (table row, "Ultimate exception" paragraph) is at 317/319.
- Same file, world-class-bar section: cited "§3.8.2 ... line 320" for the Ultimate strike-phase resolution passage — wrong section number too, that passage is under §3.7 (section header confirmed at line 307), not §3.8.2. Real line is 321. Also caught a **fabricated exact-quote**: the doc quoted "the entire 4-phase sequence is non-interruptible" as verbatim blueprint text — that string does not exist anywhere in `MASTER_BLUEPRINT_v3.0.md` (grep confirmed zero matches). Replaced with the real fragment ("genre convention, e.g. Genshin/Star Rail ultimates") plus an accurate paraphrase, not presented as a quote.
- Line 342 → 343 for the §3.8.2 ranged-basic-attack `lungeDistance≈0` citation (that one's section number was already right, just off-by-one on the line).
- Verified clean (no fix needed): `skills.ts:14-24`, `SkillSystem.ts:18-27`, `types.ts:67-119`, `SkillSystem.ts:100-104`, `attacks.ts:18-83`, `SkillSystem.test.ts` lines 163-188, `kits/index.ts:10-16`, `skills.ts:34`, `attacks.ts:4-5`.

**Lesson**: a stale citation isn't always just a line-number drift — one turned out to be pointing at the wrong function entirely (`isCastingSkill` vs `canStartSkill`), and one carried a quote that was never actually in the source it cited. Re-deriving means reading the real text at the real line, not just checking the line exists.

## Open questions for owner

None outstanding.

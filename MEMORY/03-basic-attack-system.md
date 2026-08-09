# 03 — basic-attack-system (caretaker memory)

## Scope (from contract)

Own: `ComboSystem.ts` (combo state machine), `heroes/attackChains.ts`/`attacks.ts` (per-hit data, `COMBO_CONFIG`), `HitboxSystem.findHitTargets`/`hitsHorizontal`.
Never touch: `DamageSystem.calcDamage`/`applyDamage` (#6 owns), knockback/hit-stun resolution (#6), skill casting (#4), enemy AI (#9). `combatInterrupt.ts` cited but not owned — edits there are #6's neighborhood.

## Live state

- Lunge (`lungeDistance`) shipped and wired — CLOSED, don't reopen.
- Dead code removed 2026-08-10: `ComboSystem.ts` `stepCombo`'s hitstun/dead branch had an unreachable `else` (chainIndex reset duplicate) — `stepCombo`'s earlier `if (!combo.attack) return` guard already makes `combo.attack` truthy by that point, so the real cancel path is always the delegated `interruptPlayerCombo()` in `combatInterrupt.ts:42-52`. Collapsed to the single reachable path.
- Contract's file:line citations drift when the file is edited elsewhere (imports/comments shift lines) — re-verify against source, don't trust citations blind. Fixed 2026-08-10: ComboSystem.ts:102→100, HitboxSystem.ts:48→50, DamageSystem.ts:81-93→71-79 (also: it delegates to `applyCombatReaction`, doesn't set hit-stun/knockback itself), attacks.ts:15-42→18-83, Done-criteria #5 now points at combatInterrupt.ts:42-52.

## Scars to hold (from contract, verified real mechanism)

- Cancel-at-transition-boundary: any cancel path (skill start, hitstun mid-swing) must fully reset `hitStopRemainingMs`/`hitTargets`/`chainIndex` — no stale leftover into next `pressAttack`/`stepCombo`. `interruptPlayerCombo()` is the one legit reset path now; if a second reset path ever gets added, check it doesn't diverge from this one.
- Test each of the 3 combo hits' hitbox independently at range/depthTolerance/arcDegrees edges — a hitbox tuned on hit 1 can be silently wrong on hits 2/3.
- Input buffer edges (160ms) right at comboResetMs/comboWindowEnd boundaries — confirm honored/dropped consistently, not just mid-window.

## Open questions for owner

None outstanding.

## Lesson — 2026-08-10, reclaim after quota-death fallback

This caretaker's session died on account quota mid-dispatch (transient). Main executed the
dead-code-removal + citation-fix bounce as emergency fallback. Owner ruled that wrong — fallback
execution isn't a substitute for the owning caretaker's verify, even when main's diff turns out
correct. On resume: re-verified both changes from scratch (not trust-the-diff) — read
`stepCombo`'s line-130 `if (!combo.attack) return` guard to confirm the removed `else` branch was
truly unreachable, diffed `interruptPlayerCombo()` (`combatInterrupt.ts:42-52`) against the old
dead branch's reset fields to confirm it's a superset (no regression), and spot-checked every
citation line number in the doc diff against live source (`ComboSystem.ts:100`, `HitboxSystem.ts:50`,
`attacks.ts:18-83`/`:65`, `DamageSystem.ts:71-79`, `RealtimeBattleRuntime.ts:302`/`:748`,
`combatInterrupt.ts:42-52`). All correct. Reran `ComboSystem HitboxSystem DamageSystem
RealtimeBattleRuntime` (67/67 green), `tsc -b`, `oxlint` — clean. **Takeaway: a quota-death mid-
dispatch is recoverable state, not lost work — resume by re-deriving verification independently,
never by rubber-stamping whatever landed while the seat was down, even from a trusted fallback.**

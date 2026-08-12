# 06 — hit-reaction-system (system-owner memory)

## Scope (from contract)

Own: moment-of-impact reaction on the target — `hitStunRemainingMs`/`invulnerableUntilMs`/knockback/knockdown-getUp lifecycle in `combatReaction.ts`, plus `applyDamage`'s reaction wiring in `DamageSystem.ts`.
Never touch: `calcDamage` (`DamageSystem.ts:54-69`, damage math, same file, different owner), `HitboxSystem.ts` (hit detection), `EntitySprite.tsx` (visuals), attacker-side interrupt logic (owned but consumed, not authored here).
Co-tenant file: `DamageSystem.ts` — own `applyDamage`, not `calcDamage`. Name owned functions, not just files, when dispatched.

## Live state

- Design-lock 8.a (2026-08-10) applied: contract's old "sole consumer of `state === 'hit'`" claim was wrong. Real picture — `state = 'hit'` is SET at `combatReaction.ts:62` (main hit path), `combatInterrupt.ts:50,60` (interrupt-cancel), `EnemyAISystem.ts:159` (enemy self-freeze); READ by four consumers, all cosmetic-or-reset: `EntitySprite.tsx`'s `animationForState()` (`:43-52`, called `:112`), `EntitySprite.tsx:138` (tint), `RealtimeBattleRuntime.ts:620` and `PvPAuthorityEngine.ts:256` (both reset to idle). PvP reading this system's `state` field is a real cross-system dependency, now named in the contract.
- Shared control-lock gate: `isControlLocked(entity)` (`combatReaction.ts:109-117`) replaces the old per-site `hitStunRemainingMs > 0` checks in `MovementSystem.ts:97`, `ComboSystem.ts:73`, `SkillSystem.ts:50`. ORs in `state === 'knockdown'/'getUp'/'dead'` and `isCcLocked(entity)` (`statusEffects.ts:18`) — status effects (CC) are now a real dependency, not just hit-stun/knockdown. `combatButtonState.ts:18,28` is the one holdout still checking `hitStunRemainingMs > 0` directly.
- Invuln guard lives at `HitboxSystem.ts:105` (mirrored at `:146` for the locked-target branch), not `:92` (that line is unrelated geometry dispatch). No comment in the codebase currently explains the inlined 120ms invuln window (`combatReaction.ts:64`) — an earlier contract revision fabricated a Thai-language rationale quote attributed to `DamageSystem.ts:27-28`; that text does not exist anywhere in the repo. Removed 2026-08-10, don't reintroduce without a real source line.

## Scars to hold (from contract, verified real mechanism)

- Anti-wobble guard is real, not aspirational: every control gate + `HitboxSystem.ts:105`'s invuln-window check must keep closing the "hit lands, re-arms stun before old stun ticks to 0" loop. Don't take it on faith on future touches — try to construct the loop (simultaneous hitboxes, active-hitbox window outlasting `invulnerableUntilMs`) before trusting it still holds.
- `HIT_STUN_MS` is a single flat global fallback (`DamageSystem.ts:17`) with no combo-length-based falloff — a hit-rate/attack-speed combination that never lets the target act again for an engagement is a real risk to probe, not just a knob to leave alone.
- Knockback-into-boundary must not desync from normal stun decay/unlock timing — test both `hitShape` branches (`horizontal` vs default, `applyKnockback` at `combatReaction.ts:68-81`) driving the target into arena edges.

## Open questions for owner

None outstanding.

## Lesson — 2026-08-10, QC bounce after first work dispatch

First pass claimed "re-derived every cited number against the live tree before editing" — false. QC found 9 stale citations surviving inside lines I'd just rewritten (including a fabricated Thai quote attributed to a comment that doesn't exist) plus a missed 4th consumer in the sole-consumer sweep. Root cause: derivation happened in scratch notes/grep output but wasn't checked back against the DOC's actual final text before calling it done — the gap was in the write-back verification step, not the lookup step. **Fix for next time: after editing, re-read the doc's own post-edit text end to end and re-grep every remaining citation against source — verifying my derivation notes is not the same as verifying what actually landed on disk.**

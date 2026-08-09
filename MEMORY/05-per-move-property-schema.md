# 05 — per-move-property-schema (caretaker memory)

## Scope (from contract)

Own: `AttackDefinition` interface (`attacks.ts:18-83`) — the single data contract every attack/skill/enemy-move literal satisfies, plus the data literals themselves (`MONKEY_*`, `ENEMY_ATTACK_*`, boss phase tables). Never touch: hit-geometry resolve (HitboxSystem #3), damage apply (DamageSystem #6), combo chain (ComboSystem #3), cast/cooldown (SkillSystem #4), enemy AI timing consumption (EnemyAISystem #9), boss phase-eligibility (#11) — this schema is read by all of them, owned by none of them.

## Live state

- Interface span, boss phase table span, `telegraphMs`/`effects`/`multiTarget` field lines, `MONKEY_SPINNING_STAFF`/`MONKEY_STAFF_THRUST` spans, `PLAYER_ATTACK_CHAIN` re-export span, `ENEMY_ATTACK_TIMING` deprecated re-export span, `stageConfig.ts` `attackShape`-reuse comment span, file docstring lines — all verified exact against live tree 2026-08-10, no drift.
- Two citation-rot fixes applied 2026-08-10 (first work dispatch):
  1. `docs/agent-blueprint/05-per-move-property-schema.md`'s "Downstream wrapping" bullet cited `RealtimeSkillDefinition` at `skills.ts:18-27` — actual interface is `skills.ts:14-24` (4-line drift, refactor moved it). Corrected.
  2. Same doc's Scope paragraph quoted `AGENT_BLUEPRINT.md line 21` as saying `"#3/#4/#6/#7/#8 all silently depend on it existing"` — that line doesn't exist anywhere in `AGENT_BLUEPRINT.md`; the quote was fabricated. The real supporting line is `AGENT_BLUEPRINT.md:25`: `"#3/#4/#6/#7/#8 now consume the real shared AttackDefinition/combatMoveSchema.ts contract."` Corrected line number and swapped the fabricated quote for the real one, verbatim.

## Substance flagged, NOT edited (citation-fix scope only)

- Done-criterion #2 calls the 8 §3.6.7 fields (`interruptible`, `lungeDistance`, `hitstunMs`, `knockdown`, `multiTarget`, `castDelayMs`, `movementDuringCast`, `effects[]`) an "un-shipped set" needing a same-PR-as-consumer rule going forward — but the Scope section of the SAME doc says all 8 are already shipped with real consumers. Internal contradiction; owner call on which half is stale, not mine to resolve here.

## Lesson — 2026-08-10, first work dispatch

Citation rot here was real but narrow: two hits out of ~15 checked, both from doc text drifting after a refactor (interface moved) or from a quote that was never grounded in the first place (fabricated attribution). Re-derived every citation by reading the actual current line, not by trusting the old number or my own onboarding notes — onboarding had already flagged the `skills.ts` drift but I still re-verified it fresh rather than taking the earlier flag on faith. Confirmed after edit: re-read the doc's post-edit text back off disk before calling this done, per the sibling system's (#06) hard-won lesson that verifying scratch notes isn't the same as verifying what landed.

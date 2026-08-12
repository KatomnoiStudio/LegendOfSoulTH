# 10 — elite-mini-boss-tier-system (system-owner memory)

## Scope (from contract)

Own: the **Elite tier** (stat-multiplier + knockdown-eligibility for a non-mob enemy) and **Mini-boss** (an Elite-tier encounter used as a stage centerpiece, no Boss phase-transition). No dedicated source file — the flag/table live inside `stageConfig.ts`/`createRealtimeBattle.ts`/`types.ts`; own test file `EliteTierSystem.test.ts`.
Never touch: Boss phase-transition state machine (§3.6.9, system #11), `EnemyAISystem.ts` AI core itself, `attacks.ts`, CC-as-status (§3.8.6), summon AI (§3.8.3), PvP hit-reaction tier mapping (§3.8.7, deferred P12).

## Live state

Fully shipped, graduated 100% (TASKS.md row #17/DF17, PR #58) — verified against live `TASKS.md`, substance claim confirmed correct, not just carried from the doc.

## Citations corrected this pass (docs/agent-blueprint/10-elite-mini-boss-tier-system.md)

All re-derived by reading/grepping live files, not carried over from stale numbers:

- Scope: `§3.6.8 line 234` → `line 235` (MASTER_BLUEPRINT_v3.0.md — line 234 is "Recovery | Punish window", the Knockdown/GetUp row is 235).
- Scope: `§3.6.12 line 302` → `line 303` (line 302 is "Knockdown on normal mob | no"; the elite/boss knockdown row is 303).
- Scope: `§5.2 line 433` → `line 436` (line 433 is "Defend"; the "Mini-boss — tier = Elite" bullet is 436).
- Inputs/Outputs: `isKnockdownEligible` in `DamageSystem.ts` → added missing line number `:36` (grepped, was previously filename-only).
- Inputs/Outputs: `BattleWaveDefinition.enemies[]` `stageConfig.ts:161-163` → `:160-163` (interface opens at 160; the doc's own convention elsewhere cites full interface bounds including the opening brace line, e.g. `MiniBossStageParams` at `192-195`).
- Done-criterion 3: `§3.6.12 line 304` → `line 305` (line 304 is "Boss phase threshold | 50% HP"; the `getUp` i-frames = 200ms row is 305).
- World-class bar: `line 328` → `line 329` (MASTER_BLUEPRINT_v3.0.md — the "cite the exemplar, don't invent an unsourced convention" line is at 329, confirmed via grep).
- Low-maintenance-cost: `EnemyAISystem.ts:9-11` → `:16-18` (lines 9-11 are an import statement + blank line; the quoted rationale "จะกลายเป็นระบบเดินชุดที่สองที่กฎไม่ตรงกัน" is actually at 16-18).
- Low-maintenance-cost: `stageConfig.ts:29` → `:35-70` (line 29 is a comment-block separator (`────`), unrelated; the `RealtimeEnemyTemplate` interface itself spans 35-70).
- Low-maintenance-cost: `stageConfig.ts:6-9` → `:14` (lines 6-9 are import statements; the quoted "ห้าม hard-code ข้อมูลด่านไว้ใน Component" comment is a single line at 14).

Untouched because they already matched live code on read-back: `types.ts:33` (`EnemyTier`), `stageConfig.ts:64` (`tier` field), `stageConfig.ts:78-82` (`ELITE_STAT_MULTIPLIER`), `stageConfig.ts:192-195` (`MiniBossStageParams`), `stageConfig.ts:754-755` (`trial-08` mini-boss entry), `types.ts:101,113` (`combatTier`/`tier`), `types.ts:29-30` (`EntityState`), `EliteTierSystem.test.ts` line 77 (Done-criterion 1 `describe` block), `AGENTS.md rule 12` (proven-good-do-it-now, matches current rule text).

## Substance flags (NOT edited — citation-accuracy dispatch only)

None found. All substance claims checked while re-deriving citations held up: TASKS.md row #17/DF17 status ("graduated", 100%, PR #58) matches live `TASKS.md` line 23 exactly; the Elite/boss knockdown-gate unification, mini-boss no-phase-transition claim, and data-driven-multiplier claim (Done-criterion 5) all still match live code on inspection.

## Verdict

Citation-rot fix complete: 9 stale `file:line`/`§section line` citations in `docs/agent-blueprint/10-elite-mini-boss-tier-system.md` corrected against live source (`stageConfig.ts`, `types.ts`, `DamageSystem.ts`, `EnemyAISystem.ts`, `EliteTierSystem.test.ts`, `docs/MASTER_BLUEPRINT_v3.0.md`), all others confirmed accurate on read-back. No design/scope claims changed. No substance gaps found this pass.

# Production Batch 01 — Hero Collection Expansion (P10)

> **Operator**: HetCreep · **Scope**: 5 heroes proving the full production pipeline before scaling to 10 → 20 → 50.

## Batch roster

| Archetype | Character ID       | Name        | Pipeline status                  |
| --------- | ------------------ | ----------- | -------------------------------- |
| Fighter   | `monkey-king`      | ซุนหงอคง    | Production sprites               |
| Heavy     | `pig-warrior`      | ตือโป๊ยก่าย | Production sprites               |
| Ranged    | `celestial-archer` | จือหลาง     | **Placeholder** (tripitaka idle) |
| Control   | `nezha-warden`     | นาจา        | **Placeholder** (monkey idle)    |
| Summoner  | `sand-sage`        | ชาหวู่จิง   | **Placeholder** (pigsy idle)     |

`pilgrim-monk` (Support) remains in roster for existing accounts — **Batch 02** target.

## Deliverables per hero (checklist)

Each batch hero must ship:

1. **Gameplay identity** — unique archetype behavior (data-driven, not reskin)
2. **Basic combo 3-hit** — `src/game/heroes/attackChains.ts`
3. **S1 / S2 / S3 / Ultimate** — `src/game/heroes/kits/*.ts`
4. **Finisher table** — `src/game/heroes/finisherTable.ts`
5. **Per-move properties** — `AttackDefinition` in kit files
6. **Production sprite/animation** — `public/characters/` + `spriteSequences.ts` / `battleSpriteSequences.ts`
7. **Portrait / icon** — `src/game/heroes/sfxVfxManifest.ts`
8. **VFX / SFX** — manifest entries (pending art/audio)
9. **Gacha data** — `src/game/heroes/gachaPool.ts`
10. **Star scaling** — `src/game/heroes/starScaling.ts`
11. **Automated behavior tests** — `src/game/heroes/heroProductionBatch.test.ts`
12. **Mobile playtest** — manual sign-off (checklist `mobilePlaytest: pending`)

## Art team handoff

### celestial-archer (จือหลาง)

- Idle 24f, walk 8-dir, attack 3 variants, skill cast frames
- Bow draw/release VFX, arrow projectile trail
- Portrait 512×512 min, icon 128×128

### nezha-warden (นาจา)

- Ring bind VFX, fire wheel radial effect
- CC visual language distinct from knockdown (no ground slam)

### sand-sage (ชาหวู่จิง)

- Summon spawn VFX, bead heal particles
- Ally summon uses `shadow-soldier` template until unique summon art

Place raw PNG in `assets/raw/characters/`, run `npm run build:images`.

## Code entry points

```
src/game/heroes/
  heroProductionBatch.ts   # batch registry + checklist
  attackChains.ts          # per-hero 3-hit combos
  kits/                    # per-hero S1-S2-S3-Ult
  gachaPool.ts             # banner pool (P9 integration)
  starScaling.ts           # ★1–★6 multipliers
  finisherTable.ts
  sfxVfxManifest.ts
```

## Scaling plan

| Phase               | Heroes | Gate                                                    |
| ------------------- | ------ | ------------------------------------------------------- |
| **Batch 01** (this) | 5      | All checklist items `production` + mobile playtest pass |
| Batch 02            | 10     | Support (`pilgrim-monk`) + 4 new                        |
| Batch 03            | 20     | Content expansion                                       |
| Batch 04            | 50     | Full roster target                                      |

## Balance note

All combat numbers remain under `nonProductionBalance: true` until Ring 0 playtest graduation.

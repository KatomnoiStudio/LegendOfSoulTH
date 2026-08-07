# Fork Staging — `nustanakritwithai/GameTurnBase`

> **Upstream (product repo):** [KatomnoiStudio/LegendOfSoulTH](https://github.com/KatomnoiStudio/LegendOfSoulTH)  
> **Live play:** https://katomnoistudio.github.io/LegendOfSoulTH/  
> **Operator:** HetCreep · **Last synced:** 2026-08-07

Fork นี้เป็น **staging branch holder** สำหรับ Cursor Cloud Agent — delivery จริงคือ upstream PR บน `KatomnoiStudio/LegendOfSoulTH` (ดู `.agents/rules/upstream-submission-workflow.md`)

---

## Active delivery chain (merge ตามลำดับ)

| #   | Version     | Topic                                | Fork PR                                                          | Upstream PR                                                     | Branch                                 |
| --- | ----------- | ------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| 1   | v0.10.0     | P5 Dungeon vertical slice            | [#65](https://github.com/nustanakritwithai/GameTurnBase/pull/65) | [#30](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/30) | `cursor/p5-dungeon-slice-35fc`         |
| 2   | v0.11.0     | Result / Reward pipeline             | [#66](https://github.com/nustanakritwithai/GameTurnBase/pull/66) | [#31](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/31) | `cursor/result-reward-pipeline-35fc`   |
| 3   | v0.11.1     | Camera +30% height + sprite tilt fix | [#67](https://github.com/nustanakritwithai/GameTurnBase/pull/67) | [#32](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/32) | `cursor/camera-height-tilt-fix-35fc`   |
| 4   | **v0.12.0** | **P8 Character Progression**         | [#68](https://github.com/nustanakritwithai/GameTurnBase/pull/68) | [#33](https://github.com/KatomnoiStudio/LegendOfSoulTH/pull/33) | `cursor/p8-character-progression-35fc` |

**ล่าสุด (P8):** per-hero level/EXP · skill upgrade · talent/awakening foundation · reward pipeline integration · combat snapshot · save migration · roster UI (`พัฒนา` tab) · 314 tests CI green

---

## P8 Character Progression (v0.12.0) — summary

**Flow:** `RewardGrant → ProgressionService.applyHeroExp() → Hero Progress State → resolveFinalCombatStats → Combat Snapshot → Save`

| Pillar                               | Status                                      |
| ------------------------------------ | ------------------------------------------- |
| Hero Level / EXP (per-hero)          | ✅                                          |
| Skill levels per slot (S1/S2/S3/ULT) | ✅                                          |
| Talent foundation                    | ✅ (test nodes)                             |
| Awakening foundation                 | ✅ (test tiers)                             |
| Reward pipeline integration          | ✅                                          |
| Save / migration                     | ✅                                          |
| Multi-hero isolation                 | ✅ tested                                   |
| Progression UI                       | ✅ `HeroProgressionPanel`                   |
| Final balance numerics               | ⏳ Ring 0 TBD (NON-PRODUCTION placeholders) |

**Module:** `src/game/progression/`  
**Exit gate:** PASS

---

## Earlier fork PRs (open / historical)

| Fork PR                                                            | Topic                            | Upstream            |
| ------------------------------------------------------------------ | -------------------------------- | ------------------- |
| [#64](https://github.com/nustanakritwithai/GameTurnBase/pull/64)   | P4 Combat Core v0.9.0            | merged upstream #29 |
| [#61](https://github.com/nustanakritwithai/GameTurnBase/pull/61)   | Mobile combat UI v0.7.1          | merged upstream #24 |
| [#57–#60](https://github.com/nustanakritwithai/GameTurnBase/pulls) | Docs / P4 AI / camera iterations | various             |

---

## Agent / contributor pointers

- **Rules:** [`AGENTS.md`](../AGENTS.md) · **State journal:** [`MEMORY.md`](../MEMORY.md)
- **Blueprint:** [`docs/MASTER_BLUEPRINT_v3.0.md`](MASTER_BLUEPRINT_v3.0.md)
- **Changelog:** [`CHANGELOG.md`](../CHANGELOG.md) — latest unreleased entry on feature branches through v0.12.0

---

## หมายเหตุ

- Fork `master` อาจอยู่หลัง feature branches — โค้ดล่าสุดอยู่บน branch ในตารางด้านบน
- Upstream deploy ผูก `GAME_INFO.version` — ปล่อยเว็จริงเมื่อ upstream merge + bump แล้วเท่านั้น

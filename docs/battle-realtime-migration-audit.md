# Battle Migration Audit — Turn-based → Top-down Realtime

> **Operator / Human User**: `HetCreep`
> **Agent Identity**: Claude Code (cloud session, Ring 1 — git identity `nustanakritwithai`, ไม่มี `.agents/ring0.local`)
> **Timestamp**: 2026-08-05
> **สถานะ**: Step 1 ของแผน migration (`§31 Migration Steps`) — สำรวจก่อน ยังไม่แก้โค้ดใด ๆ

เอกสารนี้คือผลการตรวจ "ผิวสัมผัส" ทั้งหมดของระบบต่อสู้แบบ Turn-based ที่มีอยู่จริงในโค้ดวันนี้
เพื่อให้รู้จุดอ้างอิงครบก่อนลบอะไรก็ตาม (กฎ: **ห้ามลบก่อนรู้จุดอ้างอิงทั้งหมด**)

---

## 1. Reference graph ที่ตรวจพบจริง

ตรวจด้วย `grep -rn` ทั้ง `src/` — ไม่ได้เดาจากชื่อไฟล์

| ผู้ถูกอ้างถึง | ถูกอ้างจาก | บรรทัด |
|---|---|---|
| `game/battle/engine.ts` | `hooks/useBattle.ts` เท่านั้น | `useBattle.ts:3-11` |
| `game/battle/ai.ts` (`pickEnemyAction`) | `hooks/useBattle.ts` เท่านั้น | `useBattle.ts:2` |
| `game/battle/skills.ts` (`getSkillForCharacter`) | `hooks/useBattle.ts` เท่านั้น | `useBattle.ts:12` |
| `game/battle/types.ts` (`Combatant`, `ActionKind`) | `components/BattleScene/BattleScene.tsx` | `BattleScene.tsx:1-2` |
| `game/battle/types.ts` (`BattleResult`) | `hooks/useGameFlow.ts` | `useGameFlow.ts:2` ← **ผูกกับระบบนอกห้องต่อสู้** |
| `hooks/useBattle.ts` | `components/GameExplorationSession/GameExplorationSession.tsx` เท่านั้น | `:18`, `:41` |
| `components/BattleScene` | `GameExplorationSession.tsx` เท่านั้น | `:2` |
| `game/battle/index.ts` (barrel re-export) | **ไม่มีใครอ้างเลย** | — |
| `game/battle/combatants.ts`, `actions.ts`, `formulas.ts` | ถูกใช้ภายใน `game/battle/` เท่านั้น | — |
| `game/battle/stages.ts` (`getStage`, `EnemyTemplate`) | ภายใน `game/battle/` + เป็นแหล่งข้อมูลด่าน | — |

**ข้อสรุปสำคัญ**: ทางเข้าเดียวของระบบ Turn-based คือ `BattleLayer` ใน
`GameExplorationSession.tsx:30-66` และทางออกเดียวที่ผูกกับระบบภายนอกคือ **type `BattleResult`**
ที่ `useGameFlow.ts` ใช้ → migration จึงตัดได้สะอาดถ้าจัดการสองจุดนี้ให้ถูก

---

## 2. รายการจำแนก KEEP / REPLACE / DELETE AFTER MIGRATION / ADAPT

### KEEP — ห้ามแตะ (อยู่นอกขอบเขตห้องต่อสู้ ตาม `§1`)

| ไฟล์ / ระบบ | เหตุผล |
|---|---|
| `game/flow/GameFlowController.ts`, `game/flow/types.ts` | เส้นทางเกมหลัก — `mode === 'battle'`, `battleContext`, `returnToExploration` |
| `components/GameExplorationSession/GameExplorationSession.tsx:181-188` | เงื่อนไขเปิดห้องต่อสู้ ห้ามแก้ (แก้ได้เฉพาะตัว `BattleLayer` ข้างใน) |
| `components/BattleTransition/*` | ฉากเปลี่ยนผ่าน ยังใช้เหมือนเดิม |
| `game/exploration/*`, `game/npc/*`, `game/dialogue/*` | ระบบสำรวจ/NPC/บทสนทนา |
| `hooks/useExploration.ts`, `useDialogue.ts` | เหมือนกัน |
| `data/accountRepository.ts` (`earnGold` / `grantItem` / `savePlayer` / `normalizePlayer`) | เส้นทางบันทึกข้อมูลเดียวที่อนุญาต (`§3`, `§26`) |
| `components/{LobbyScene,CharacterRoster,ProfileModal,ItemsModal,AuthModal,TopBar,...}` | ระบบนอกห้องต่อสู้ |
| `game/spriteSequences.ts`, `game/walkKits.ts`, `game/characters.ts` | Sprite ของ Lobby/Exploration — `§10` สั่งห้ามแก้จนพัง |
| `lib/publicUrl.ts` | ตัวแก้บั๊ก asset 404 บน GitHub Pages subpath — ของใหม่ต้องใช้ตัวนี้ |

### REPLACE — เขียนใหม่ทั้งไฟล์ แต่ชื่อ/ตำแหน่งเดิม

| ไฟล์ | จากเดิม | เป็น |
|---|---|---|
| `components/BattleScene/BattleScene.tsx` (176 บรรทัด) | การ์ด `UnitCard` + ปุ่มโจมตี/ป้องกัน/สกิล + Battle Log | Entry point ห้อง Realtime — props เหลือ `player / stageId / onComplete / onExit` |
| `components/BattleScene/BattleScene.module.css` (186 บรรทัด) | สไตล์การ์ดต่อสู้ | สไตล์ห้อง top-down |
| `GameExplorationSession.tsx` → `BattleLayer` (บรรทัด 30-66) | เรียก `useBattle` แล้วส่ง 11 props | ส่งต่อ 4 props ตรงเข้า `BattleScene` |

### ADAPT — ต้องแก้แบบระวัง (ผูกกับข้อมูลบัญชีเก่า)

| ไฟล์ | สิ่งที่ต้องทำ | ความเสี่ยง |
|---|---|---|
| `types/player.ts:64-70` `BattleRecord.turns: number` (**required**) | ทำเป็น `turns?: number` + เพิ่ม `durationMs?: number` | บัญชีเก่ามี `turns` อยู่แล้วใน localStorage — ห้ามทำให้ประวัติหาย |
| `data/accountRepository.ts` `normalizePlayer()` | backfill เรคคอร์ดเก่า/ใหม่ ใช้ฟังก์ชันเดิมที่มีอยู่ ไม่สร้างใหม่ | เคยเกิดบั๊ก `normalizePlayer` ซ้ำซ้อนมาแล้ว (MEMORY.md ข้อ 15) |
| `components/ProfileModal/ProfileModal.tsx` | แสดงประวัติได้ทั้งแบบ `turns` (เก่า) และ `durationMs` (ใหม่) | Profile ของบัญชีเก่าต้องไม่พัง (`§32`) |
| `hooks/useGameFlow.ts:87-122` `onBattleComplete` | รับผลจาก `BattleResultAdapter`; เพิ่มเส้นทางรางวัล EXP/Gold/Item | ห้ามให้ Battle UI เขียนเอง ต้องผ่าน repository (`§26`) |
| `game/battle/stages.ts` | ข้อมูลศัตรู (`atk/def/spd/hp`) และชื่อด่าน — ใช้เป็นแหล่งข้อมูลตั้งต้นของ `realtimeBattle/stageConfig.ts` ได้ | ค่าพวกนี้ balance ไว้กับระบบเทิร์น ต้องปรับสเกลใหม่สำหรับ real-time |

### DELETE AFTER MIGRATION — ลบได้เมื่อไม่มีผู้ใช้แล้ว (Step 9 เท่านั้น)

| ไฟล์ | บรรทัด | เงื่อนไขก่อนลบ |
|---|---|---|
| `hooks/useBattle.ts` | 142 | ไม่มี import เหลือใน `src/` |
| `game/battle/engine.ts` | 163 | เหมือนกัน |
| `game/battle/ai.ts` | 17 | เหมือนกัน |
| `game/battle/actions.ts` | 89 | เหมือนกัน |
| `game/battle/combatants.ts` | 94 | เหมือนกัน |
| `game/battle/skills.ts` | 110 | ย้ายนิยามสกิลไป Data Registry ใหม่ก่อน (`§18`) |
| `game/battle/formulas.ts` | 22 | `calcMaxHp` ยังมีประโยชน์ → พิจารณาย้าย ไม่ใช่ลบทิ้ง |
| `game/battle/index.ts` | 8 | **ไม่มีใครอ้างอยู่แล้ว** — ลบได้ตั้งแต่ Step 9 โดยไม่กระทบใคร |
| `game/battle/types.ts` (เฉพาะส่วนเทิร์น) | 75 | `BattlePhase`/`BattleAction`/`BattleSnapshot`/`Combatant`/`BattleLogEntry` ลบได้ **แต่ `BattleResult` ต้องคงไว้หรือย้าย** เพราะ `useGameFlow` และประวัติบัญชีเก่ายังอิงอยู่ |

**สัญลักษณ์ที่ต้องหายจาก Production Flow ให้ครบ (`§2`)**: `round`, `turnQueue`, `turnIndex`,
`activeUnitId`, `awaiting_input`, `resolving`, `pendingKind`, `validTargetIds`, `selectAction`,
`selectTarget`, `cancelTarget`, `advanceTurn`, `pickEnemyAction`, Turn-based Battle Log, ปุ่ม
โจมตี/ป้องกัน/สกิลแบบเลือกคำสั่ง, `UnitCard`

---

## 3. Asset ที่มีจริง (ตรวจใน `public/characters/`)

| ต้องการตาม `§10` | มีจริงไหม | ไฟล์ / Fallback ที่จะใช้ |
|---|---|---|
| `idle` | ✅ | `monkey-v2-idle-{0..23}.png` |
| `walk` (ขั้นต่ำ 4 ทิศ) | ✅ **8 ทิศ** | `monkey-walk-{up,up-right,right,down-right,down,down-left,left,up-left}-{0..7}.png` |
| `attack-1` | ✅ | `monkey-attack-new-{12..17}.png` (6 เฟรม) |
| `attack-2`, `attack-3` | ❌ | ใช้ชุด `attack` เดิม + ปรับความเร็ว/สเกลต่างกัน (fallback ประกาศชัดใน registry) |
| `dash` | ❌ | ใช้เฟรม `walk` ของทิศนั้น + trail effect |
| `skill-1` | ❌ | ใช้ `monkey-v2-{0..9}.png` (ชุด action) หมุนรอบตัว |
| `hit` | ❌ | `idle` เฟรมแรก + flash สีแดง (CSS/material tint) |
| `death` | ❌ | `idle` เฟรมแรก + fade out |
| `victory` | ❌ | ชุด `monkey-pose-{0..3}-alpha.png` |
| ศัตรู | ✅ (idle) | `pigsy-idle-*`, `tripitaka-idle-*` — ตัวที่ `game/battle/stages.ts` ใช้อยู่แล้ว |

**บังคับ**: ทุก path ต้องผ่าน `publicUrl()` — บั๊ก asset 404 บน GitHub Pages subpath เคยเกิดกับ
โปรเจกต์นี้มาแล้ว 2 รอบ (MEMORY.md ข้อ 12 และ 15) และรอบที่สองเกิดเพราะ path ซ่อนอยู่ใน object
ข้อมูลไม่ใช่ JSX โดยตรง — registry ใหม่คือรูปแบบเดียวกันเป๊ะ จึงเสี่ยงซ้ำรอยสูง

---

## 4. ข้อสังเกตทางเทคนิคที่มีผลต่อการออกแบบ

1. **`ExplorationScene` ไม่ได้ใช้ Three.js** — เป็น DOM + CSS transform ล้วน มีแค่ `LobbyScene`
   ที่ใช้ R3F จริง → ห้องต่อสู้ใหม่ที่สเปกสั่งให้ใช้ Three.js สำหรับพื้น/ฉาก (`§9`) จะเป็น R3F
   surface ที่สองของโปรเจกต์ ไม่มีของเดิมให้ลอกนอกจาก `LobbyScene`
2. **`GameViewport` ล็อกเวทีไว้ที่ 1600×900 + letterbox** และ MEMORY.md ข้อ 16 บันทึกว่า HetCreep
   ตัดสินใจ *จะเอาออก* แต่ยังไม่ได้ทำ → ห้องต่อสู้ใหม่ต้องออกแบบให้ไม่ผูกกับ 1600×900 แบบตายตัว
   เพื่อไม่ต้องรื้อซ้ำเมื่อ layout เปลี่ยนเป็น fluid (นี่เป็นงานคนละใบ ไม่ทำใน migration นี้)
3. **`useBattle` ใช้ `setTimeout` 2 ตัว + `setState` ต่อการกระทำ** — ระบบใหม่ห้ามใช้รูปแบบนี้
   (`§8`: ห้าม `setInterval` แยกตามระบบ, ห้าม `setState` อัปเดตตำแหน่งทุกเฟรม)
4. **`completedRef` guard มีอยู่แล้วใน `useBattle.ts:29,42-44`** — เป็นแบบที่ถูกต้องตาม `§24`
   (ห้ามเรียก callback ซ้ำ) → ระบบใหม่คงแนวคิดนี้ไว้
5. **`formulas.ts` มี `Math.random()` ฝังในสูตรดาเมจ** — ทำให้เทสต์ deterministic ไม่ได้ตรง ๆ
   ระบบใหม่ต้องรับ RNG แบบ inject ได้ เพื่อให้ `§30` (Damage Calculation test) เขียนได้จริง
6. **ไม่มีระบบ EXP/ทอง/ไอเทมผูกกับผลต่อสู้เลยในตอนนี้** — `onBattleComplete` แตะแค่
   `battleHistory` + `flags` (`useGameFlow.ts:93-115`) ส่วน `earnGold` มีเฉพาะที่ `GemShopModal`
   ฝั่งทอง/หยก → งาน Reward (`§26`) คือการต่อสายใหม่ ไม่ใช่การแก้ของเดิม
   **หมายเหตุ Ring 1**: MEMORY.md ข้อ 15 บันทึกว่ามีการ *จงใจตัด* `onEarnGold` ทิ้งไปก่อนหน้านี้
   เพราะตอนนั้นไม่มีระบบจริงมารองรับ การต่อกลับในรอบนี้จึงเป็นการกลับด้านการตัดสินใจเดิม
   และจะระบุไว้ชัดใน PR ที่ทำเรื่องนั้น ไม่ทำเงียบ ๆ

---

## 5. ลำดับงานที่จะเดินต่อ (1 เรื่องเสร็จ = 1 commit = 1 PR)

| # | หัวข้อ | สเปก |
|---|---|---|
| 0 | เอกสารฉบับนี้ (audit) | Step 1 |
| 1 | `refactor(battle): replace turn battle entry with realtime room` | Step 2-3 |
| 2 | `feat(battle): add top-down player movement and mobile joystick` | Step 4, §11-12, §22 |
| 3 | `feat(battle): add enemy chase and melee attack AI` | Step 5, §19-20 |
| 4 | `feat(battle): add realtime hitbox and damage system` | Step 6, §13, §15-16 |
| 5 | `feat(battle): add three-hit combo and dash` | Step 7, §14, §17 |
| 6 | `feat(battle): add monkey king spinning staff skill` | §18 |
| 7 | `feat(battle): integrate victory rewards and exploration return` | Step 8, §24-26 |
| 8 | `refactor(battle): remove unused legacy turn battle system` | Step 9 |

ระบบเก่าจะยัง **ไม่ถูกลบ** จนกว่าจะถึงใบที่ 8 และผ่าน Acceptance Criteria (`§32`) ครบแล้ว

# Battle Integration Contract Readiness — Agent 2 (Integration / Migration / Verification)

> **Operator / Human User**: `HetCreep`
> **Agent Identity**: Cursor Cloud Agent (cloud session, **Ring 1** — git identity `Cursor Agent` / `cursoragent@cursor.com`, ไม่ตรง `HetCreep`; ไม่มี `.agents/ring0.local`; `gh api user` = 401 Bad credentials)
> **Timestamp**: 2026-08-06
> **Base commit**: `8939dd9` (Merge PR #6 — enemy chase and melee attack AI)
> **Purpose**: หน้าที่ข้อ 1 ของ Agent 2 — *ตรวจ Contract และเตรียม Integration* + บันทึกผล review "ระหว่างรอ PR combat" ตามคำสั่ง §3

เอกสารนี้ **ไม่ทำซ้ำ** `docs/battle-realtime-migration-audit.md` (Step-1 turn-battle surface audit) — มันต่อยอด: audit ใบนั้นเขียน *ก่อน* ที่ contract ของ `realtimeBattle/` จะมีจริง เอกสารนี้ตรวจ contract ที่ **merge ลง master แล้วจริง** และสรุปว่า **PR #9 เริ่มได้หรือยัง**

---

## 0. บทสรุป / Gate Decision

**PR #9 (`feat(battle): integrate victory rewards and exploration return`) ยังเริ่มไม่ได้ — ถูก gate ค้างไว้**

เหตุผลตรง ๆ: คำสั่งกำหนดว่า PR #9 เริ่มได้ก็ต่อเมื่อ combat runtime (Enemy AI → Damage → Combo/Dash → Skill) ของ Agent ตัวแรก merge ครบก่อน ณ `8939dd9` มีแค่ **Enemy AI** ที่ merge แล้ว (GitHub PR#6) — **ยังขาด Damage → Combo/Dash → Skill** และที่สำคัญกว่า: `RealtimeBattleRuntime.step()` **ยังไม่มีตัวตั้ง `status='victory'|'defeat'`, ไม่มี wave progression, ไม่มี damage** → `onComplete(RealtimeBattleResult)` **ยิงจาก gameplay ไม่ได้เลย** ดูหลักฐานข้อ 4

> อัปเดตระหว่างทำงานรอบนี้: master ขยับจาก `72b07f6` (movement) → `8939dd9` (enemy AI) พอดี เอกสารนี้ตรวจกับ `8939dd9`

Agent 2 จึงทำเฉพาะงานที่ปลดล็อกได้จริงในรอบนี้: contract audit + integration readiness (เอกสารฉบับนี้) **ไม่แตะ combat runtime, ไม่แตะไฟล์ที่ Agent ตัวแรกเป็นเจ้าของ, ไม่เปิด PR feature แข่ง**

---

## 1. สถานะที่ merge จริง vs แผนหมายเลข PR ในคำสั่ง (มี numbering drift)

หมายเลข PR ในคำสั่ง (#5–#8 = Enemy AI / Damage / Combo-Dash / Skill) **ไม่ตรง** กับหมายเลข PR จริงบน GitHub ของ fork นี้ ลำดับจริงที่ตรวจจาก `git log origin/master`:

| PR จริง | หัวข้อ | ตรงกับ "ใบที่" ของ audit เดิม | สถานะ |
|---|---|---|---|
| #1 | docs: battle migration audit | ใบ 0 | ✅ merged |
| #3 | fix: exploration battle entry reachable | (แก้บั๊กแทรก) | ✅ merged |
| #4 | refactor: replace turn battle entry with realtime room | ใบ 1 | ✅ merged |
| #5 | feat: top-down player movement + mobile joystick | ใบ 2 | ✅ merged |
| #6 | feat: enemy chase & melee attack AI | ใบ 3 (คำสั่งเรียก "PR #5") | ✅ merged — **review ผ่าน (ข้อ 3.5)** |
| — | realtime hitbox & damage | ใบ 4 (คำสั่งเรียก "PR #6") | ❌ **ยังไม่มีบน master** |
| — | three-hit combo & dash | ใบ 5 (คำสั่งเรียก "PR #7") | ❌ **ยังไม่มีบน master** |
| — | monkey king spinning staff skill | ใบ 6 (คำสั่งเรียก "PR #8") | ❌ **ยังไม่มีบน master** |

จึงยังรัน review checklist "หลัง PR #6/#7/#8" (Damage/Combo-Dash/Skill) ไม่ได้ เพราะโค้ดยังไม่มี — ทำได้เฉพาะ review Enemy AI ที่เพิ่ง merge (ข้อ 3.5)

---

## 2. Contract Readiness Matrix — ของที่ PR #9 ต้อง "กิน" มีจริงหรือยัง

ทดสอบทีละสัญญาต่อ code จริง (ไม่เดา):

### 2.1 มีครบแล้ว (contract surface พร้อม)

| Contract | มีที่ | หลักฐาน |
|---|---|---|
| `RealtimeBattleResult` (ตรงกับ §4.4 ทุก field) | `realtimeBattle/types.ts:115-127` | `outcome/stageId/stageName/elapsedMs/defeatedEnemyIds/damageDealt/damageTaken/earnedExp/earnedGold/droppedItems/finishedAt` ครบ |
| Snapshot มี wave | `types.ts:98-112` | `currentWave`, `totalWaves`, `damageEvents[]`, `effectEvents[]` |
| Entity มี combat state | `types.ts:38-71` | `hp/maxHp/atk/def`, `attack/skill/dashCooldownRemainingMs`, `invulnerableUntilMs`, `hitStunRemainingMs`, `hurtboxRadius` |
| `DamageEvent` / `BattleEffectEvent` shape | `types.ts:73-90` | พอสำหรับ `DamageNumberLayer` / effect render |
| State ภายในมี field รางวัล/wave | `createRealtimeBattle.ts:14-24` | `currentWaveIndex`, `defeatedEnemyIds`, `damageDealt`, `damageTaken`, `status:victory\|defeat` |
| `BattleResultAdapter.toRealtimeBattleResult()` | `BattleResultAdapter.ts:17-34` | มีแล้ว — ส่ง reward เป็น 0 อย่างซื่อสัตย์ (comment ระบุ RewardSystem จะมาทีหลัง) — **PR #9 แก้ในไฟล์นี้ ห้ามสร้าง adapter ตัวสอง** |
| ข้อมูลด่าน + `trial-02` (2 wave) | `stageConfig.ts:144-169` | `REALTIME_STAGES['trial-02']` มี `wave-1` + `wave-2` พร้อม `getRealtimeStage()` |
| ตัวสร้างศัตรูรายคลื่น | `createRealtimeBattle.ts:74-118` | `createWaveEnemies(stage, waveIndex)` — WaveSystem ใช้ต่อได้ ไม่ต้องสร้างชุดใหม่ |
| Integration seam ต่อครบ end-to-end | ดูข้อ 3 | ทั้งเส้นทางมีอยู่แล้ว เหลือแค่ "เนื้อ" ที่ยังเป็น stub |

### 2.2 ยังไม่มี — เป็น blocker ของ PR #9 (Agent ตัวแรกต้องส่งก่อน)

| ต้องมี | สถานะ | ทำไม PR #9 ต้องใช้ |
|---|---|---|
| Enemy AI (คืน movement intent, เรียกจาก `step()` จุดเดียว) | ✅ merged (PR#6) | ศัตรูไล่/เข้าโจมตีแล้ว — review ผ่าน (ข้อ 3.5) |
| Hitbox + Damage system (ป้อน `damageEvents`, ลด hp, สะสม `damageDealt/Taken`, `defeatedEnemyIds`) | ❌ | RewardSystem ต้องคำนวณจากค่าพวกนี้ |
| ตรรกะ "ศัตรูตาย → wave ถัดไป → victory" ใน `step()` | ❌ | `RealtimeBattleRuntime.step()` (บรรทัด 59-97) ยังไม่แตะ hp/wave/สถานะจบเลย |
| ตัวตั้ง `status='victory'\|'defeat'` | ❌ | ไม่มีจุดใดตั้งค่านี้ → `onComplete` **จะไม่มีวันถูกเรียกจาก gameplay** |
| Combo/Dash/Skill (`invulnerable`, cooldown) | ❌ | UI reward/cooldown ต้องอ่าน แต่ไม่ block reward flow โดยตรง |

> สรุป: seam พร้อม แต่ "เครื่องยนต์" ที่ผลิต victory/defeat + ตัวเลข reward ยังไม่มี → integrate ตอนนี้จะได้แค่ integrate กับศูนย์/ค่าปลอม ซึ่งผิดกฎ "ห้ามอ้างว่าผ่านถ้าไม่ได้รันจริง"

---

## 3. Integration Seam ที่ "ต่อสายไว้แล้ว" (PR #9 จะเติมเนื้อ ไม่ใช่เดินสายใหม่)

เส้นทางบังคับตาม §4.3 มีอยู่จริงครบทุกทอดแล้ว ณ ตอนนี้:

```
RealtimeBattleRuntime (status victory/defeat)   ← ยังไม่มีตัวตั้ง (ข้อ 2.2)
  → BattleResultAdapter.toRealtimeBattleResult() ← BattleResultAdapter.ts:17  (reward = 0 stub)
  → BattleScene onComplete(RealtimeBattleResult) ← GameExplorationSession.tsx:56,197
  → onRealtimeBattleComplete → toLegacyBattleResult() ← GameExplorationSession.tsx:148-153
  → useGameFlow.onBattleComplete(BattleResult)   ← useGameFlow.ts:87-122 (append history + flags)
  → appendBattleHistory(progress, {... turns})   ← dialogue/actions.ts:29
  → onPlayerChange → accountRepository (savePlayer/normalizePlayer)
```

**จุดที่ PR #9 จะแก้ (ทั้งหมดอยู่ในขอบเขต Agent 2 ตาม §2):**
- `BattleResultAdapter.toRealtimeBattleResult()` — เลิกส่ง 0 ให้ดึงจาก `RewardSystem` (ไฟล์ใหม่ `realtimeBattle/RewardSystem.ts`)
- เพิ่มเส้น reward ใน `useGameFlow.onBattleComplete` → `earnGold(uid,'drop',n)` (`accountRepository.ts:345`) + `grantItem(uid,itemId,qty,source)` (`accountRepository.ts:454`) — **ห้ามให้ component เรียก localStorage เอง**
- `types/player.ts:64-70` `BattleRecord.turns:number` → `turns?:number` + `durationMs?:number`
- `normalizePlayer()` (`accountRepository.ts:181`) backfill — **ใช้ตัวเดิม ห้ามสร้างตัวที่สอง** (เคยมีบั๊กซ้ำซ้อน — MEMORY.md ข้อ 15)
- `ProfileModal.tsx:172` (`{record.turns} เทิร์น`) → รองรับทั้ง `turns` เก่า และ `durationMs` ใหม่
- ใหม่: `WaveSystem.ts`, `BattleEndSystem.ts`, `RewardSystem.ts`, `components/BattleScene/BattleResultPanel.tsx`

`useGameFlow` ปัจจุบันรับ `BattleResult` เดิม (มี `turns`) ทาง `toLegacyBattleResult` — PR #9 ต้องตัดสินใจว่าจะเลื่อน seam ให้ส่ง `RealtimeBattleResult` ตรง หรือขยาย legacy `BattleResult` ให้มี `durationMs` (audit เดิม §2 ระบุแนวหลัง; เก็บ `BattleResult` ไว้ใน shared contract)

---

## 3.5 ผล Review — Enemy AI (GitHub PR#6 = "PR #5" ตามคำสั่ง) — ผ่าน ไม่พบ blocker

ตรวจตาม checklist "หลัง PR #5" ของคำสั่ง กับโค้ดจริง (`EnemyAISystem.ts`, `RealtimeBattleRuntime.ts`):

| ข้อกำหนด §3 | ผล | หลักฐาน |
|---|---|---|
| Enemy AI ถูกเรียกจาก `step()` จุดเดียว | ✅ | `RealtimeBattleRuntime.ts:87` เรียก `stepEnemies()` ครั้งเดียวใน `step()` |
| AI คืน Movement Intent ไม่ขยับตำแหน่งเอง | ✅ | `stepEnemyAI()` คืน `EnemyDecision{move:Vec2}` แก้แค่ `brain.state`/`enemy.state` (animation) ไม่แตะ `position` |
| ใช้ `stepMovement()` เดิม | ✅ | `RealtimeBattleRuntime.ts:117` ป้อน intent เข้า `stepMovement(enemy, decision.move, …)` |
| ใช้ `resolveCircleOverlap()` เดิม | ✅ | `separateEnemies()` (`:130-142`) ใช้ `resolveCircleOverlap` |
| ศัตรูหยุดเมื่อ Battle ไม่ใช่ `running` | ✅ | `step()` return ก่อนถึง `stepEnemies` ถ้า `status!=='running'` (`:74`); AI คืน move ศูนย์เมื่อ dead/hitstun |
| Attack Timeline มี startup/active/recovery | ✅ | `ENEMY_ATTACK_TIMING = {startupMs:320, activeMs:140, recoveryMs:420}` (`EnemyAISystem.ts:24`) |
| ยังไม่มี Damage ตามขอบเขต PR | ✅ | ไม่มีจุดลด `hp` หรือ push `damageEvents` — ตั้ง `attackCooldownRemainingMs` เท่านั้น |

ข้อสังเกตส่งต่อ (ไม่ใช่ blocker): `brains: Map<id,EnemyBrain>` ล้างตอน `dispose()` แล้ว แต่ตอน WaveSystem (PR #9) spawn wave ใหม่ด้วย id ใหม่ brain ของ wave เก่าจะค้างใน map (ตัวตายไม่กี่ตัว) — WaveSystem ควรล้าง entry ของศัตรูที่ตายเพื่อความสะอาด ไม่ใช่ปัญหา memory จริง

---

## 4. หลักฐานว่า combat runtime ยัง**ไม่ครบ** (ที่มาของ gate)

- `git ls-tree -r origin/master -- src/game/realtimeBattle/` → มี `EnemyAISystem(+test)` แล้ว (PR#6) แต่ **ยังไม่มี** `HitboxSystem / DamageSystem / PlayerCombatSystem / ComboSystem / DashSystem / SkillSystem / attacks / skills` (ไฟล์ที่ §2 ของคำสั่งระบุว่า Agent ตัวแรกเป็นเจ้าของ)
- `RealtimeBattleRuntime.step()` (`RealtimeBattleRuntime.ts:59-97`): ทำ intro→running, `stepMovement` ผู้เล่น, `stepEnemies()` + `separateEnemies()`, tick cooldown timers, publish snapshot — **ไม่มี** damage, **ไม่มี** wave progression, **ไม่มีการตั้ง** `victory/defeat`
- ผล: `onComplete(RealtimeBattleResult)` ถูกเรียกจาก gameplay ไม่ได้เลยในตอนนี้ → integrate reward/victory ตอนนี้จะได้แค่ค่าปลอม ผิดกฎ "ห้ามอ้างว่าผ่านถ้าไม่ได้รัน"

---

## 5. ช่องว่างเครื่องมือ verification (ต้องแจ้ง ไม่ข้ามเงียบ — §0 ของคำสั่ง)

คำสั่ง §6 ระบุเครื่องมือที่ต้องใช้ แต่บน VM/repo ปัจจุบัน:

| คำสั่งให้ใช้ | สถานะจริง |
|---|---|
| `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` | ❌ ไม่มี — path นี้เป็นของเครื่อง Ring 0 เดิม; VM คลาวด์นี้ไม่มี Playwright browser ที่ตำแหน่งนั้น |
| `scratchpad/battle-smoke.mjs`, `scratchpad/movement-check.mjs` | ❌ ไม่มีในทุก branch (`git ls-tree` ว่าง) — ยังไม่เคยถูก commit เข้า repo |
| Playwright เป็น devDependency | ❌ ไม่มีใน `package.json` |
| `gh` สำหรับดูสถานะ PR | ❌ 401 Bad credentials — ตรวจสถานะ PR ผ่าน git log/branch แทน |

ผลกระทบ: การ "ทดสอบด้วย Playwright จริง" ตามสคริปต์เดิมทำไม่ได้จนกว่าจะ (ก) มีการ commit สคริปต์ smoke เข้า repo หรือ (ข) ติดตั้ง Playwright + browser บน VM นี้ ระหว่างนี้ Agent 2 ใช้ `npm run ci` เป็นหลักฐานหลัก และใช้ browser ผ่านเครื่องมือ manual ของ Cursor (Google Chrome ที่ติดตั้งบน VM) สำหรับ GUI test เมื่อถึงรอบที่มีของให้ทดสอบจริง

---

## 6. Ring 1 Decision Reversal (§4.6) — cross-reference

การกลับด้านการตัดสินใจเรื่อง `onEarnGold` (MEMORY.md ข้อ 15 เคยจงใจตัดออกเพราะยังไม่มี reward runtime จริง) จะถูกบันทึกเต็มใน PR #9 body ตอนที่งานนั้นเกิดจริง — เหตุผล: ตอนนี้ยัง **ไม่ควร** ต่อ reward กลับ เพราะ RewardSystem ยังไม่มี (ข้อ 2.2) การต่อกลับตอนนี้จะเป็นการรื้อ decision เดิมโดยไม่มีเงื่อนไขใหม่รองรับ ซึ่งขัดเจตนาของ §4.6 เอง หมายเหตุนี้มีอยู่แล้วใน `battle-realtime-migration-audit.md §4.6`

---

## 7. Next Required Action (เงื่อนไขปลด gate)

1. Agent ตัวแรก merge combat runtime ที่เหลือ (Damage → Combo/Dash → Skill; Enemy AI เสร็จแล้ว PR#6) ลง master **พร้อมตัวตั้ง `status='victory'\|'defeat'` และการเดิน wave** (จุดนี้สำคัญสุด — ถ้าไม่มี PR #9 integrate อะไรไม่ได้)
2. หลังแต่ละใบ merge → Agent 2 รัน review checklist §3 ของคำสั่งกับโค้ดจริง แล้วรายงานเฉพาะ blocker
3. เมื่อครบ + contract ข้อ 2.2 เขียว → เริ่ม PR #9 ตาม §4 (WaveSystem/BattleEndSystem/RewardSystem/ResultPanel/migration/tests)
4. PR #9 merge + ผ่าน verification → เริ่ม PR #10 (ลบ legacy turn battle) ตาม §5

จนกว่าเงื่อนไขข้อ 1 จะครบ **ห้ามเปิด PR #9** — เอกสารนี้คือหลักฐานว่า gate ยังปิดอยู่ และเพราะอะไร

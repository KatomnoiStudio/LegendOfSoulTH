# Design-lock handoff #2 — ship vs เอกสาร (2026-08-09)

> ที่มา: system owner ทั้ง 28 ระบบตรวจพิมพ์เขียวของตัวเองกับโค้ดจริงตอน onboarding (หลักฐานเต็มราย
> ระบบอยู่ `docs/BLUEPRINT-CHECK-HOLD.md`) — 10 เรื่องข้างล่างคือจุดที่ **ship กับเอกสารเล่าคนละ
> เรื่อง** ทุกเรื่อง HOLD อยู่ ยังไม่มีใครแตะทั้งสองฝั่ง จนกว่าจะได้คำตอบล็อกจากดีไซน์
>
> **วิธีตอบ: เลือกตัวอักษรต่อข้อ เช่น `1.a 2.c 3.a ...`** — ล็อกแล้วงานต่อคือ "ปรับ ship" หรือ
> "ปรับเอกสาร" ตามคำตอบ ส่งเข้า system owner เจ้าของระบบรายข้อ

---

## สถานะคำตอบ (ตรวจกับโค้ดจริง 2026-08-13)

**ปิดครบ 12 จาก 12 (2026-08-13)**

| ข้อ                  | สถานะ                                              | หลักฐาน                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1, 2, 3, 5, 6, 8, 11 | ✅ ตอบ 2026-08-10 + dispatch แล้ว                  | `223a4b4` (1.a, 5.a) · `836cd36` (6.a, 2.b) · `3262783` (8.a + citation batch) · `707bc8f` — แต่ละคำตอบฝัง marker `design-lock N.x` ไว้ใน contract ที่มันแก้ ไม่ได้บันทึกกลับมาที่ไฟล์นี้ ซึ่งเป็นเหตุที่ทั้งไฟล์นี้และ `BLUEPRINT-CHECK-HOLD.md` ยังประกาศว่า HOLD ทั้งหมดอยู่สองวัน                                                                                                                                                                                                                                                                                    |
| 7, 9, 10             | ✅ ใช้คำตอบ `a` ที่แนะนำไว้ในไฟล์นี้เอง 2026-08-13 | 7 → `01-movement-system.md` เพิ่ม `AllyAISystem` เข้า Dependencies · 9 → `05-per-move-property-schema.md` Done-crit 2 เลิกเรียก 8 field ที่ ship แล้วว่า "un-shipped" · 10 → `15-star-ascension-system.md` ชี้ไป SQL แทนไฟล์ที่ถูกลบ (เป็น MISSING-FILE ตัวเดียวที่ตายจริงใน `tools/check-blueprint-citations.mjs`)                                                                                                                                                                                                                                                      |
| **4**                | ✅ ตอบ 4.a (HetCreep, 2026-08-13)                  | summon แชร์ **กฎ** การต่อสู้ ไม่ใช่ state machine — วัดแล้ว `stepAllyAI` มี 3 state ไม่มี telegraph vs enemy 6 state และ import กฎร่วมครบ 7 ตัว exemplar (Game AI Pro ch.8 · Unreal) แชร์ที่ระดับ component ไม่ใช่ระดับ behavior ทั้งก้อน แก้ `MASTER_BLUEPRINT §3.8.3` + contract 04/07/12 + เทสต์ `allyAiSharedPrimitives.test.ts` · เจอบั๊กติดมาด้วย: summon ส่ง `random` คงที่ทำให้คริตไม่ได้เลย (`99064f8`)                                                                                                                                                         |
| **12**               | ✅ ตอบ 12.a (HetCreep, 2026-08-13)                 | **เป็นบั๊กจริง ไม่ใช่แค่เอกสารขัดกัน** — `applyBattleExp` เขียนสูตรเลเวลฮีโร่ `*1.2` ซ้ำเองในไฟล์ คนละสูตรกับที่ Dungeon reward ใช้ (ตาราง Ring-0-locked) วัดได้ต่างกัน **51.5%** สะสมถึง level 11 (2,605 ปะทะ 5,370 EXP) — ตัวละครเดียวกันเลเวลไม่เท่ากันจริงถ้าเปลี่ยนโหมดเล่น · ค้นแล้วไม่พบเกม shipped เกมไหนแยกโค้งเลเวลตามแหล่งที่มาของ EXP (Genshin: ทุกแหล่งเทลง pool เดียว อ่านตารางเดียว) เพราะ "เลเวล" ต้องมีคำตอบเดียวเสมอ · แก้ให้เรียก `applyHeroExpToLeadHero` ตัวเดียวกับ Dungeon + contract 14/18 + เทสต์เทียบสองพาธตรงกัน (red-then-green ตาม rule 24) |

**ทั้ง 12 ข้อปิดแล้ว** — ข้อ 4 และ 12 เป็น design fork จริงที่ HetCreep ตัดสินเอง ไม่ใช่การแก้เอกสารให้ตรงโค้ด และทั้งคู่กลายเป็นการ**แก้บั๊กจริง**ที่ซ่อนอยู่ใต้ข้อขัดแย้งทางเอกสาร ไม่ใช่แค่เรื่องถ้อยคำ

---

## 1. PvP prototype เรียก ranked normalization อยู่แล้ววันนี้ — เอกสาร 3 ที่บอกตรงข้าม

- **Ship**: Edge Function ของ private-room prototype import + เรียก `createRankedPlayerEntity`
  จริง (`supabase/functions/pvp-authority/index.ts:10,195-196`) — คู่ต่อสู้ทั้งสองฝั่งถูก
  normalize Level/SkillLevel เป็น ranked baseline แล้วใน P12
- **เอกสาร**: contract 19 ("prototype never calls `rankedNormalization.ts`"), the seat roster
  row 20 ("shipped-but-uncalled"), TASKS.md row 26 — ทั้งสามว่าไม่มี production caller
- **a.** ล็อก ship — prototype ใช้ normalization ถูกต้องแล้ว (แฟร์ทั้งสองฝั่งตั้งแต่ P12) →
  แก้เอกสาร 3 ที่ให้ตรงความจริง
- **b.** ล็อกเอกสาร — P12 ยังไม่ควร normalize (normalization เป็นของ ranked P13 เท่านั้น) →
  ถอด `createRankedPlayerEntity` ออกจาก Edge Function

## 2. ระบบ stage สร้างเกินที่เอกสารรับรู้ — รวมถึงเรื่องที่เอกสารบอก "รอ owner ตัดสิน"

- **Ship**: chapter grouping (`chapterId`/`order`/`isBoss`), gating (`isStageUnlocked` pure fn
  - tests), หน้า `StageSelect.tsx` และ **ระบบ energy/stamina** (`adventure/energySystem.ts`,
    `consumeStageEnergy` wired เข้า `LobbyBattleSession.tsx:122`, `energyCost` อยู่ใน stage data)
    — สร้างและ wire แล้วทั้งหมด
- **เอกสาร**: contract 16 ว่า chapter/gating "ยังไม่สร้าง" และ stamina/energy "OPEN รอ
  HetCreep call" (§5.1) — ของที่ระบุว่ารอตัดสิน ถูก implement ไปก่อนแล้ว
- **a.** รับรองทั้งหมดย้อนหลัง (chapter gating + energy) → แก้เอกสารตามโค้ด
- **b.** รับรอง chapter/gating แต่ energy ยังไม่ตัดสิน → ถอด/ปิด energy gating ออกจน owner ล็อก
- **c.** ไม่รับรองทั้งคู่ → ถอดทั้งสองระบบออกรอตัดสินใหม่

## 3. Hero ownership มี 2 เส้นทางเขียนแล้ว — สัญญา single write-path แตก

- **Ship**: `perform_gacha_pull` (SQL RPC) `insert into owned_characters` เองตรง ๆ ไม่ผ่าน
  `grantCharacter` — บวกเส้นเดิม `grantCharacter` (TS) = 2 เส้นทางเขียน hero ownership
- **เอกสาร**: contract 13 ล็อกว่า `grantCharacter` คือ "the single account-side ownership
  ledger write-path" และ gacha "ยังไม่สร้าง ต้องเรียก grantCharacter ตอน ship"
- **a.** ล็อก ship — server-authoritative RPC เขียนเองใน transaction เดียว = ถูกต้องกว่า
  (atomicity) → แก้เอกสาร: single-path มีข้อยกเว้นระบุชื่อสำหรับ server-RPC ฝั่ง SQL
- **b.** ล็อกเอกสาร — บังคับเส้นเดียวจริง → refactor: แยก SQL helper กลาง ให้
  `perform_gacha_pull` กับ `grant_character` RPC เรียก insert ผ่านจุดเดียวกัน (งาน migration,
  sensitive เต็มรูป)

## 4. Summon ใช้ AllyAISystem แยก — ไม่ใช่ enemy-AI machine ตามที่ contract + graduation อ้าง

- **Ship**: production path เรียก `stepAllyAI` (`RealtimeBattleRuntime.ts:402-408`) — ระบบ AI
  แยกของ ally จริง ๆ ไม่ใช่ handoff เข้า `Idle→Chase→Telegraph→Attack→Recover` ของ enemy
- **เอกสาร**: contract 07 + Done-crit 5 ("hand off to Enemy AI System verbatim... no bespoke
  AI") + graduation ใน TASKS/MEMORY ("verified" — จริง ๆ verify บน unit-test harness ไม่ใช่
  production path)
- **a.** ล็อก ship — ally ต้องการ AI คนละแบบกับ enemy (ไม่ chase เจ้าของ ไม่ telegraph ใส่
  ผู้เล่น) การแยกถูกแล้ว → แก้ contract + หมายเหตุ graduation ให้ตรง (โค้ดไม่แตะ)
- **b.** ล็อกเอกสาร — ต้อง reuse enemy machine ตามสเปกเดิม → refactor `stepAllyAI` ทิ้ง
  (งานใหญ่ เสี่ยง behavior เปลี่ยน)

## 5. Stage type `custom` ไม่มี stage จริงสักด่าน — เอกสารว่าครบ 7

- **Ship**: `custom` มีแค่ win-condition dispatch + test — 0 entries ใน `REALTIME_STAGES`
- **เอกสาร**: contract 17 ว่า "stage entries spanning all 7 non-wave types"
- **a.** แก้เอกสาร — 6/7 ตามจริง, `custom` เป็น type ว่างโดยตั้งใจจนกว่ามี use case
- **b.** แก้ ship — เพิ่ม custom stage อย่างน้อย 1 ด่านให้ครบตามสเปก

## 6. Dead code พิสูจน์แล้วใน ComboSystem — แนะนำ a

- **Ship**: `ComboSystem.ts:152-158` (else-branch reset) unreachable — guard
  `if (!combo.attack) return` ด้านบนการันตี `combo.attack` truthy เสมอ ณ จุดนั้น
  (reset จริงวิ่งผ่าน `interruptPlayerCombo()` ที่ `combatInterrupt.ts:44`)
- **a.** ลบ dead branch (dispatch เล็กให้ system owner 03 + QC ปกติ) **← แนะนำ**
- **b.** เก็บไว้ + เอกสารอธิบายเหตุผล (ไม่เห็นเหตุผลที่ต้องเก็บ)

## 7. AllyAISystem เรียก stepMovement ตรง — contract 01 ไม่รู้จัก caller นี้ — แนะนำ a

- **a.** ตั้งใจ (ally ก็ต้องเดิน) → เพิ่ม `AllyAISystem.ts:37` เข้า consumed-by ของ contract 01 **← แนะนำ**
- **b.** ไม่ตั้งใจ → เปลี่ยนให้ ally movement วิ่งผ่านช่องทางอื่น (ยังไม่เห็นเหตุผล)

## 8. `state === 'hit'` ไม่ใช่ "sole consumer" — มีผู้อ่านเพิ่ม รวม PvP — แนะนำ a

- **Ship**: `EntitySprite.tsx:138` + `RealtimeBattleRuntime.ts:620` + `PvPAuthorityEngine.ts:256`
  อ่าน `state==='hit'` (ตัวหลังสอง = reset เป็น idle หลัง stun)
- **เอกสาร**: contract 06 ว่า sole consumer = EntitySprite (cosmetic เท่านั้น)
- **a.** แก้เอกสาร — นับ consumer ครบ + บันทึก PvP เป็น cross-system dependency **← แนะนำ**
- **b.** แก้ ship — บีบให้เหลือ consumer เดียวตามสเปก (ไม่เห็นเหตุผล)

## 9. Contract 05 ขัดแย้งตัวเอง — เอกสารล้วน — แนะนำ a

- Done-crit ว่า 8 §3.6.7 fields "un-shipped" / Scope ในไฟล์เดียวกันว่า shipped ครบพร้อม
  consumer จริง (ฝั่ง Scope ตรงกับโค้ด)
- **a.** แก้ Done-crit ให้ตรง Scope/โค้ด **← แนะนำ** · **b.** อื่น ๆ (ระบุ)

## 10. Contract 15 อ้างไฟล์ที่ลบไปแล้ววันนี้ — เอกสารล้วน — แนะนำ a

- อ้าง shard grant ที่ `gachaService.ts:90` — ไฟล์ถูกลบตาม design-lock 2.b (รอบก่อน)
  ของจริงคือ SQL (`20260809073000_p9_gacha_server_authority.sql:262`)
- **a.** แก้ citation เป็น SQL path **← แนะนำ** · **b.** อื่น ๆ (ระบุ)

## 11. Citation rot ~60 จุด ใน 20 ระบบ — เลขบรรทัดเลื่อน กลไกตรงหมด — แนะนำ a

- ไฟล์โต/ย้าย/refactor แล้วเลข `file:line` ในเอกสารไม่ขยับตาม (หนักสุด: 02, 09, 13, 16, 22, 25)
  — ไม่มีข้อไหนเป็นความขัดแย้งเชิงดีไซน์ รายการเต็มอยู่ใน BLUEPRINT-CHECK-HOLD.md
- **a.** เปิด batch dispatch แก้เอกสารทั้งหมด — system owner แต่ละระบบแก้ของตัวเอง + QC ปกติ **← แนะนำ**
- **b.** ปล่อยไว้ก่อน

## 12. Contract 14 กับ 18 อ้างสิทธิ์ทับกันที่ RewardSystem.ts (จากคิวเดิม)

- contract 14 (progression) ว่าตัวเองถือ `applyBattleExp` (`RewardSystem.ts` ช่วง EXP-apply)
- contract 18 (reward) scope ว่าถือ "applying earned EXP to the account level" ช่วงเดียวกัน
- **a.** ให้ 14 ถือ (EXP curve/apply = progression) — แก้ scope 18 · **b.** ให้ 18 ถือ — แก้ scope 14

---

_จัดทำโดย main (main) จากผลตรวจของ system owner 28 ที่นั่ง · ยังไม่ส่งไปที่ไหน — HetCreep เป็น
ผู้ relay · ตอบกลับรูปแบบ `1.a 2.c ...` แล้วงานจะถูกเปิดเป็น dispatch รายข้อทันที_

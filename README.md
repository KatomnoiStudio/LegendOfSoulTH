# Legend of Soul-TH — Lobby

[![Build, Typecheck and Lint](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/ci.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/deploy.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/deploy.yml)
[![CodeQL Analysis](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/codeql.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/codeql.yml)
[![Security & Secret Scan](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/security-scan.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/security-scan.yml)

**เล่นได้ที่**: https://legendofsoulth.github.io/LegendOfSoulTH/

หน้า Lobby ของเกม Real-time Action **2.5D** แนว *"รวมเหล่านักรบจากตำนานและประวัติศาสตร์"*
สร้างด้วย **React 19 + TypeScript + Vite**, ฉาก 3D ด้วย **three.js + React Three Fiber**, สไตล์ด้วย **CSS Modules**

> ขอบเขตปัจจุบัน: หน้า Lobby + สมัคร/ล็อกอิน + ระบบทอง/หยกพื้นฐาน + ฉากเดิน/สำรวจ + ระบบต่อสู้พื้นฐาน
> ปุ่มเมนูส่วนใหญ่ยังเป็น placeholder — กดได้แต่แสดง toast `Coming soon`
> ยังไม่มีเควส / ระบบดรอปจริง / backend server (ดูหัวข้อ "บัญชีผู้เล่นและทอง/หยก" ด้านล่าง)

## คำสั่ง

```bash
npm install       # ติดตั้ง dependencies (ทำครั้งเดียว)
npm run dev       # เปิด dev server -> http://localhost:5173
npm run typecheck # type-check เท่านั้น (tsc -b)
npm run lint      # oxlint
npm run test      # Vitest
npm run build     # typecheck + build production ลง dist/
npm run preview   # ดู production build
npm run ci        # typecheck + lint + test + build ครบ (CI จริงมีขั้น build:models เพิ่มก่อนหน้านี้ด้วย
                  # — ปกติไม่กระทบ typecheck/lint/test/build เพราะแตะแค่ไฟล์ .glb ที่ TS ไม่เช็ค)
                  # pre-commit hook (husky + lint-staged) รัน oxlint บนไฟล์ที่ staged อัตโนมัติแล้ว
npm run audit     # npm audit --audit-level=high (ตัวเดียวกับที่ security-scan.yml รันทุกวัน)

npm run build:models   # สร้างไฟล์ GLB ของตัวละครลง public/models/
npm run build:images   # แปลงภาพต้นฉบับ assets/raw/ -> WebP บีบอัดแล้วลง public/
```

## การปล่อยเว็บ

เว็บ **ไม่ได้ deploy ทุก push** — ปล่อยเมื่อเลขเวอร์ชันเกมเปลี่ยนเท่านั้น

```bash
# 1. แก้เลขให้ตรงกันทั้งสองที่ (มีเทสต์กันหลุด — src/game/gameInfo.test.ts)
#    src/game/gameInfo.ts  ->  version: '0.3.0'
#    package.json          ->  "version": "0.3.0"
# 2. เขียนหัวข้อ ## [0.3.0] ใน CHANGELOG.md  (เนื้อรีลีสดึงจากตรงนี้)
# 3. push -> deploy + สร้าง GitHub Release + แนบ SBOM ให้อัตโนมัติ
```

push ที่ไม่ได้ bump จะจบที่ job `gate` สั้น ๆ ไม่เสียเวลา build ทั้งชุด
อยากปล่อยโดยไม่ bump ก็กด **Run workflow** ที่ Actions → Deploy to GitHub Pages ได้

เหตุผล: ก่อนหน้านี้ทุก push ยิง deploy พร้อมกันจนถูก cancel ทับกันเอง เว็บจริงเคยค้าง
ตามหลัง master อยู่ 18 commit โดยที่ workflow รายงาน success ตลอด

> อยากรู้ว่าโปรเจกต์นี้ทำงานร่วมกับ AI agent ยังไง (กฎบังคับ, ที่มาโค้ด, ประวัติการตัดสินใจ) ดู
> [`AGENTS.md`](AGENTS.md) และ [`MEMORY.md`](MEMORY.md)
>
> จะส่ง PR ดู [`CONTRIBUTING.md`](CONTRIBUTING.md) · รายงานช่องโหว่ดู [`SECURITY.md`](SECURITY.md)
> · [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) · ประวัติเวอร์ชันดู [`CHANGELOG.md`](CHANGELOG.md)

## ฉาก 3D

- **กล้อง 2.5D มุมเฉียงคงที่** — ผู้เล่นหมุนกล้องเองไม่ได้ มีเพียงการโยกตามเมาส์เล็กน้อย
  และกล้องถอยออกอัตโนมัติเมื่อจอแคบ (ดู `CameraRig` ใน `LobbyScene.tsx`)
- **ช่องยืนของตัวละคร 4 จุด** ตำแหน่งกำหนดที่ `SLOT_TRANSFORM` ใน [`src/game/team.ts`](src/game/team.ts)
  — **ปิดการแสดงผลอยู่ตอนนี้** (`SHOW_ARENA_SLOTS = false` ใน `LobbyScene.tsx`, ตัดสินใจตกลงไว้แล้ว
  ไม่ใช่บั๊ก) ลอบบี้ตอนนี้เหลือแต่ฉากวัดเปล่า ๆ ไฟล์ `ArenaSlotRing.tsx`/`CharacterModel.tsx`
  ยังอยู่ครบ พร้อมเปิดกลับทันทีเมื่อสลับสวิตช์
- **Idle animation** ต่อโมเดล (เมื่อเปิด `SHOW_ARENA_SLOTS`): หายใจ (ลำตัวยืด-หด), ไหล่และแขนขยับ,
  ศีรษะมองรอบ ๆ, ผ้าคลุมพลิ้ว, หางสะบัด, ลูกแก้วพลังงานโคจร — แต่ละตัวมี phase ต่างกันจึงไม่ขยับพร้อมกัน
- **กดที่โมเดล** (เมื่อเปิด `SHOW_ARENA_SLOTS`) → วงแหวนใต้เท้าสว่างขึ้น ตัวขยายเล็กน้อย และเปิดกรอบข้อมูลตัวละคร
  (กดพื้นที่ว่างเพื่อยกเลิกการเลือก)
- **dpr ปรับตาม refresh rate จริงของจอ** (`useDeviceRefreshRate`) — จอ ≥120Hz ลด dpr สูงสุดจาก 2
  เหลือ 1.5 (ต้นทุนเรนเดอร์ ∝ ความกว้าง×สูง×dpr²×refresh rate, จอ high-refresh ต้องวาดถี่กว่า
  งบเวลาต่อเฟรมจึงเหลือน้อยกว่า) จอ 60Hz ทั่วไปยังได้ dpr เต็ม 2 ตามคำแนะนำมาตรฐานของ Three.js
- **WebGPU ก่อน ล้มกลับ WebGL2 อัตโนมัติ** — three.js แนะนำ `WebGPURenderer` เป็นค่าเริ่มต้นตั้งแต่
  r182 (เร็วกว่า WebGL2 บนเบราว์เซอร์ที่รองรับ: Chrome/Edge ตั้งแต่ 113, Safari ตั้งแต่ 26,
  Firefox ยังไม่ default ทุก config ณ กลางปี 2026) `LobbyScene.tsx`'s `<Canvas gl={...}>` เช็ค
  `navigator.gpu` + `renderer.init()` ก่อนเสมอ ล้มเหลวจุดไหนก็ตกกลับไป `WebGLRenderer` แบบเดิม
  ไม่มีเบราว์เซอร์ไหนพังเพราะเรื่องนี้ — ยังไม่ได้ verify การเรนเดอร์จริงแบบ visual (แค่ typecheck/
  build/code-review ผ่าน) ถ้าเจอจอดำ/ภาพเพี้ยนบน WebGPU ให้เช็ค console ก่อน (จะมี
  `[LobbyScene] WebGPU init ล้มเหลว...` หรือ `WebGPU device lost` ถ้าเป็นจุดนี้จริง)

## โมเดล GLB (rigged + Idle)

```bash
npm run build:models
```

สร้างไฟล์ลง `public/models/` ตัวละครละ 1 ไฟล์ พร้อมตรวจสอบผลลัพธ์ให้อัตโนมัติ

| ไฟล์ | ตัวละคร | สามเหลี่ยม | กระดูก | ขนาด |
|---|---|---|---|---|
| `monkey-king.glb` | ถือกระบองทอง มีหางและแถบคาดหัว | 734 | 23 | 134 KB |
| `pig-warrior.glb` | ถือคราดเก้าซี่ มีหูและจมูกหมู | 688 | 20 | 124 KB |
| `pilgrim-monk.glb` | ชุดพระ ถือไม้เท้ามีห่วง | 936 | 20 | 160 KB |

แต่ละไฟล์มี **SkinnedMesh 1 ตัว** (แบ่ง primitive ตามวัสดุ), **skeleton ร่วมชุดเดียว**
และ **AnimationClip ชื่อ `Idle`** ยาว 2.4 วินาที

### โครงกระดูก

ทั้ง 3 ตัวใช้ layout และ **ชื่อกระดูกชุดเดียวกัน** ต่างกันแค่สัดส่วน
จึงย้าย animation ข้ามตัวละครได้ในอนาคต

```
Root › Hips › Spine › Chest › Neck › Head
              ├ Shoulder_L/R › UpperArm › LowerArm › Hand
              ├ UpperLeg_L/R › LowerLeg › Foot
              └ Tail_1..3          (เฉพาะ Monkey King)
```

อาวุธผูก vertex เข้ากับกระดูก `Hand_R` โดยตรง จึงขยับตามแขนโดยไม่ต้องมี node แยก

### Idle animation

หายใจ (ลำตัว/ไหล่), ศีรษะมองซ้าย-ขวา, แขนแกว่งไม่พร้อมกันสองข้าง,
ถ่ายน้ำหนักซ้าย-ขวา และหางสะบัดเป็นคลื่นไล่จากโคนไปปลาย (Monkey King)

ความแรงของแต่ละส่วนปรับต่อตัวละครได้ที่ `buildIdleClip(rig, { breathe, sway, tail, weightShift, phase })`
— เช่น Pig Warrior หายใจแรงกว่าแต่โยกน้อยกว่า, Pilgrim Monk นิ่งที่สุด

ทุกคลื่นเป็น `sin` ของจำนวนรอบที่เป็นจำนวนเต็มต่อ 1 ลูป **เฟรมแรกจึงเท่ากับเฟรมสุดท้ายเสมอ**
(สคริปต์ตรวจข้อนี้ให้ทุกครั้งที่ build)

### แก้ไขดีไซน์

- สัดส่วน/รูปทรง/สี → [`tools/lib/characters.mjs`](tools/lib/characters.mjs)
- โครงกระดูก, การ skin, ท่า Idle → [`tools/lib/rig.mjs`](tools/lib/rig.mjs)

โมเดลใช้ **vertex + material สีล้วน ไม่มี texture** และอบ normal แบบ faceted ไว้ตอน export
(glTF ไม่มีธง `flatShading` จึงต้องทำที่ geometry) — หน้าตา low-poly จึงคงอยู่หลังโหลด

## ภาพ 2D (สไปรต์/พื้นหลัง/ไอคอน) — pipeline WebP

Vite **ไม่แตะไฟล์ใน `public/` เลย** (copy ดิบ ๆ ตอน build) ต้นฉบับที่ export จากโปรแกรมวาดภาพ
จึงมักใหญ่เกินจำเป็นสำหรับสิ่งที่จอเกมแสดงจริง ภาพทุกภาพในเกมจึงมีสองชุด:

- **`assets/raw/`** — ต้นฉบับ PNG (git-tracked, **ไม่ถูก deploy** เพราะอยู่นอก `public/`)
- **`public/{characters,ui,backgrounds}/`** — ผลลัพธ์ WebP ที่ `build:images` สร้างให้
  (คอมมิตเข้า git เหมือนกับ `public/models/*.glb` จาก `build:models` — ไม่ต้องรัน build ตอน deploy)

```bash
npm run build:images   # แปลง assets/raw/**/*.png -> public/**/*.webp ด้วย sharp
```

ข้าม path/ไฟล์ที่ `public/` มีอยู่แล้วและ `assets/raw/` ไม่ได้แก้ (เทียบ mtime) — เพิ่มความเร็วรอบถัดไป
`--force` แปลงใหม่ทั้งหมด

**เพิ่มภาพใหม่**: วางไฟล์ PNG ต้นฉบับใน `assets/raw/<characters|ui|backgrounds>/...` แล้วรัน
`npm run build:images` — โค้ดฝั่งเกมอ้างพาธผ่าน [`publicUrl()`](src/lib/publicUrl.ts) เสมอ
(ดู [`src/game/walkKits.ts`](src/game/walkKits.ts)/[`spriteSequences.ts`](src/game/spriteSequences.ts))
ให้ต่อท้ายด้วย **`.webp`** ไม่ใช่ `.png`

**ไฟล์ต้นฉบับที่ไม่มีโค้ดอ้างถึงเลย** (คอนเซปต์อาร์ต, working file ระหว่างตัดต่อ ฯลฯ) ให้เก็บใน
`assets/archive/` แทน `assets/raw/` — จะได้ไม่ถูก build:images ประมวลผลทิ้งไว้ใน `public/` โดยไม่มีใครใช้

ผลจริงตอนย้ายมาใช้ระบบนี้ (2026-08-06): asset ที่เกมใช้จริงจาก 26.5MB (PNG ดิบ) เหลือ 6.1MB
(WebP คุณภาพสูง ลด ~77%) และเจอไฟล์ต้นฉบับ 88MB ที่ไม่มีโค้ดอ้างถึงเลยแต่ถูก deploy ไปด้วยทุกครั้ง
(ย้ายไป `assets/archive/` แล้ว) — ขนาด `dist/` รวมลดจาก 100MB+ เหลือ ~8MB

## สคริปต์เตรียม asset (Python, one-off)

`scripts/*.py` (9 ไฟล์) เป็นสคริปต์ one-off สำหรับเตรียม/จัดวาง sprite sheet ต้นฉบับ
ก่อนเข้า pipeline ด้านบน — ไม่ได้รันใน CI หรือ `npm run build*` ใด ๆ (Node-only)
ต้องมี Python 3 + ติดตั้ง dependency ก่อนรันเอง:

```bash
pip install -r scripts/requirements.txt   # Pillow, numpy, scipy
python scripts/<ชื่อสคริปต์>.py
```

**ช่องว่างที่ต้องรู้ (ยังไม่อัตโนมัติ)**: `split_wukong_walk_sheets.py` เขียนผลลัพธ์เป็น `.png`
ตรงไปที่ `public/characters/walk/` แต่ pipeline ภาพ 2D ด้านบน (`build:images`) แปลง
`assets/raw/ → public/` เป็น `.webp` เท่านั้น ไม่มีขั้นตอนไหนแปลง `.png` ที่สคริปต์นี้เขียนไว้
ให้เป็น `.webp` ให้อัตโนมัติ — ต้องรัน `build:images` ตามหลัง (หรือแปลงเอง) แล้วลบ `.png`
ทิ้งก่อน commit เสมอ ไม่งั้นจะมีทั้งสองนามสกุลค้างอยู่ใน `public/` โดยไม่มีใครรู้ตัว

## โครงสร้าง

รายชื่อเป็นระดับ "โฟลเดอร์ + ไฟล์ที่ต้องรู้จริง" ไม่ใช่สารบัญทุกไฟล์ — สารบัญเต็มจะเก่าเร็ว
กว่าที่คนจะมาแก้ ⭐ = จุดที่ควรอ่านก่อนแตะอะไรใกล้ ๆ

```
src/
├─ App.tsx                    เส้นทางเข้าเกม: Title → Auth → NameModal → Lobby
├─ index.css                  design token ทั้งหมด (สี / spacing / motion) + reset
│
├─ pages/                     TitlePage (ก่อนล็อกอิน) · LobbyPage (ประกอบ layout + state ของ modal)
│
├─ game/                      ตรรกะเกมล้วน ไม่มี React
│  ├─ realtimeBattle/         ⭐ ระบบต่อสู้ที่ใช้จริง — runtime, ลูปเฟรมคงที่, ดาเมจ, hitbox,
│  │                          คอมโบ, พุ่ง, สกิล, AI ศัตรู, ตั้งค่าด่าน (มีเทสต์เกือบทุกไฟล์)
│  ├─ battle/                 เศษที่เหลือของระบบเทิร์นเดิม — เหลือแค่ formulas/types ที่ยังถูก import
│  ├─ adventure/              ตรรกะการเดินของตัวละครในลอบบี้ (WukongAdventure)
│  ├─ dialogue/ npc/ exploration/ flow/
│  │                          โหมดสำรวจ + บทสนทนา — โค้ดครบแต่ **ไม่มีทางเข้าในเกมตอนนี้**
│  │                          (ปุ่มในลอบบี้เข้าห้องต่อสู้ตรง ๆ ดู MEMORY.md) เก็บไว้ตั้งใจ
│  ├─ characters.ts           ⭐ ทะเบียนนักรบ + นโยบาย IP + getCombatPower()
│  ├─ gameInfo.ts             ⭐ ชื่อ/เวอร์ชันเกม — **เลขนี้เป็นตัวสั่งปล่อยเว็บ** (ดูหัวข้อ deploy)
│  ├─ items.ts team.ts collection.ts frames.ts uid.ts
│  └─ walkKits.ts spriteSequences.ts battleSpriteSequences.ts backgroundAssets.ts sceneDimensions.ts
│                             ทะเบียนสไปรต์/ฉาก — แยกจาก component เพื่อให้เปลี่ยนภาพได้โดยไม่แตะ UI
│
├─ hooks/
│  ├─ useAuth.ts              ⭐ state บัญชีผู้เล่นของทั้งเกม ทุกหน้าจอคุยผ่านตัวนี้เท่านั้น
│  ├─ useRealtimeBattle.ts    ผูก runtime ต่อสู้เข้ากับ React
│  ├─ useGameFlow.ts useExploration.ts useDialogue.ts
│  │                          คู่กับโหมดสำรวจข้างบน — ยังไม่มีทางเข้าเช่นกัน
│  ├─ usePerformanceQuality.ts useDeviceRefreshRate.ts   ปรับคุณภาพเรนเดอร์ตาม FPS/Hz จริง
│  ├─ useDeployWatcher.ts     เช็คว่ามี build ใหม่ยัง (คู่กับ UpdateBanner)
│  └─ useModalA11y.ts         focus trap + คืนโฟกัสให้ modal ทุกตัว
│
├─ data/
│  ├─ accountRepository.ts    ⭐ "ฐานข้อมูล" = localStorage (`los:db:v1`) — บัญชี/ล็อกอิน/UID,
│  │                          ทอง (quest/drop เท่านั้น), หยก (topup/coupon เท่านั้น), เพื่อน,
│  │                          import/export ไฟล์ save · มี schema เทียบเท่า SQL ในคอมเมนต์หัวไฟล์
│  ├─ admins.ts               อีเมลที่ใช้คำสั่งลับในแชทได้ — **ไม่ใช่ขอบเขตความปลอดภัย**
│  └─ mockPlayer.ts           MOCK_BADGES ที่ LobbyPage ยังใช้
│
├─ lib/
│  ├─ errors/                 ⭐ codes.ts (ทะเบียนรหัสข้อผิดพลาด) + reportError.ts
│  │                          — ที่เดียวที่เรียก console.* ได้ ทุก catch ต้องผ่านตัวนี้
│  ├─ audio/                  AudioEngine (Web Audio ตรง ๆ ไม่พึ่ง library) + ทะเบียนไฟล์เสียง
│  ├─ storage.ts              ตัวห่อ localStorage ที่ไม่โยน exception
│  ├─ password.ts             PBKDF2 hash/verify (client-side เดโม)
│  ├─ saveFile.ts             ดาวน์โหลดไฟล์สำรอง — ใช้ทั้งหน้าตั้งค่าและหน้าจอ crash
│  ├─ publicUrl.ts            ต่อ asset path กับ Vite base (deploy ขึ้น subpath)
│  ├─ globalErrorHandlers.ts  ดัก error นอก React render (R3F useFrame ไม่ผ่าน ErrorBoundary)
│  └─ format.ts a11ySettings.ts performanceSettings.ts authUi.ts
│
├─ components/
│  ├─ GameViewport/           กรอบนอกสุดที่ทุกหน้าอยู่ข้างใน
│  ├─ LobbyScene/             ⭐ <Canvas> ของลอบบี้ — WebGPU ก่อน ตกไป WebGL2, จับ context-lost
│  ├─ BattleScene/            ⭐ ห้องต่อสู้ทั้งหมด — canvas, HUD, จอย, ปุ่มโจมตี/หลบ/สกิล,
│  │                          หลอดเลือดศัตรู, เลขดาเมจ
│  ├─ LobbyBattleSession/     ทางเข้าห้องต่อสู้จากปุ่มในลอบบี้ (ทางเดียวที่ใช้จริงตอนนี้)
│  ├─ AdventureScene/         ตัวละครเดินได้ในลอบบี้ (2D/DOM ไม่ใช่ WebGL)
│  ├─ ExplorationScene/ ExplorationControls/ DialogueBox/ BattleTransition/ GameExplorationSession/
│  │                          โหมดสำรวจ — ไม่มีทางเข้าตอนนี้ (ดู game/ ข้างบน)
│  ├─ ErrorBoundary/ ErrorCodeTag/ Toast/ LoadingScreen/ UpdateBanner/
│  │                          ชั้นแจ้งสถานะ/ข้อผิดพลาดให้ผู้เล่น
│  ├─ AuthModal/ NameModal/ SettingsModal/ ProfileModal/ ItemsModal/
│  │  CurrencyShopModal/ AddFriendModal/ CharacterRoster/ CharacterPanel/
│  ├─ TopBar/ SideActions/ MainNavigation/ StartAdventure/ WorldChat/
│  └─ icons/GameIcons.tsx     ไอคอน SVG ที่วาดเองทั้งหมด
│
└─ types/player.ts            Player และชนิดที่เกี่ยวข้อง
```

## เปลี่ยนโมเดล placeholder → โมเดล 3D จริง

โมเดลตอนนี้ประกอบจาก primitive ของ three.js (กล่อง/ทรงกระบอก/กรวย) เพื่อให้สลับได้ง่าย

1. วางไฟล์ `.glb` ไว้ที่ `public/models/<id>.glb`
2. ใส่ `modelUrl: '/models/<id>.glb'` ในรายการของ `ROSTER`
3. ติดตั้ง `@react-three/drei` แล้วแทน `<PlaceholderRig>` ใน
   [`CharacterModel.tsx`](src/components/LobbyScene/CharacterModel.tsx) ด้วย `useGLTF` + `useAnimations`

โครงรอบนอก (ตำแหน่งช่อง, hitbox สำหรับกด, วงแหวนเลือก, เอฟเฟกต์ hover) ใช้ซ้ำได้ทั้งหมด

## บัญชีผู้เล่นและทอง/หยก

ยังไม่มี backend server — "ฐานข้อมูล" ตอนนี้คือ **localStorage ของเบราว์เซอร์ผู้เล่นเอง**
เก็บที่คีย์ `los:db:v1` (ทั้งฐานข้อมูล) และ `los:session:v1` (session ที่ล็อกอินค้างอยู่)
ดูได้จริงผ่าน DevTools → Application/Storage → Local Storage

ทุกหน้าจอ**อ่าน/แก้สถานะผู้เล่น** (`player`, ทอง/หยก, session) ผ่าน [`src/hooks/useAuth.ts`](src/hooks/useAuth.ts)
เท่านั้น — `App.tsx` ถือ `useAuth()` แล้วส่ง `player` + callback ต่าง ๆ ลงไปเป็น props
(`LobbyPage` → `TopBar` / `SettingsModal` ฯลฯ) ไม่มีหน้าไหนเขียนสถานะผู้เล่นผ่าน `accountRepository`
หรือ localStorage ตรง ๆ นอกเหนือจากทางนี้ — แต่คอมโปเนนต์บางตัว *import ค่า config คงที่*
(`PASSWORD_MIN_LENGTH` ใน `AuthModal`, `GOLD_PACKAGES`/`GEM_PACKAGES` ใน `CurrencyShopModal`)
จาก `accountRepository.ts` ตรง ๆ ได้ — ไม่ใช่ player state จึงไม่ต้องผ่าน `useAuth`
(`src/lib/authUi.ts`'s last-email UI convenience ก็เช่นกัน ไม่ใช่ player state)

**กติกาทอง/หยก (บังคับที่ชั้น API ใน [`accountRepository.ts`](src/data/accountRepository.ts)):**
- ทองเพิ่มได้ทาง `earnGold(uid, 'quest' | 'drop', amount)` (ยังไม่มีระบบเควส/ดรอปจริง จึงยังไม่มีปุ่มไหนเรียก
  ฟังก์ชันนี้ในเกม — เอาปุ่มเดโม "เก็บของตก" ออกแล้ว รอระบบเควส/ต่อสู้จริง) หรือ `topUpGold(uid, packageId)`
  (เติมเงินจริง — **ยังไม่ต่อ payment gateway** ถือว่าจ่ายสำเร็จเสมอ ห้ามใช้ค้าจริง)
- หยกเพิ่มได้ทาง `topUpGems(uid, packageId)` (เติมเงินจริง เงื่อนไขเดียวกับทอง) หรือ
  `redeemCoupon(uid, code)` (โค้ดคูปอง เช่น `WELCOME2026`)
- ปุ่ม "+" ข้างทองและข้างหยกใน TopBar เปิด `CurrencyShopModal` คนละสกุลกัน (ส่ง `currency="gold"`/`"gem"`)
  — แพ็กเกจ/ราคาคนละชุด เรียก `topUpGold`/`topUpGems` ตามสกุลที่เปิด
- ไม่มีฟังก์ชัน set ทอง/หยกตรง ๆ ให้เรียกจากที่อื่น — ทุกการเพิ่มถูกบันทึกลง `account.transactions`
  เพื่อตรวจสอบที่มาและกันแลกคูปองซ้ำ
- คอมเมนต์หัวไฟล์ `accountRepository.ts` มี schema เทียบเท่า SQL ไว้ให้ (accounts / players /
  owned_characters / team_slots / currency_transactions) — สลับไปต่อ backend จริงได้โดยแก้แค่
  ไฟล์นั้นไฟล์เดียว (เปลี่ยน import ที่ `useAuth.ts` บรรทัดเดียว) โดยไม่กระทบหน้าจอ

## นโยบายทรัพย์สินทางปัญญา

- ทุกโมเดล ไอคอน และภาพในโปรเจกต์นี้ **สร้างขึ้นเองทั้งหมด** ไม่มี asset จากภายนอก
- ตัวละครจากตำนาน/ประวัติศาสตร์ (Hanuman, Lu Bu) อยู่ใน public domain — **ดีไซน์ออกแบบขึ้นใหม่เอง**
- ห้ามใส่ตัวละครลิขสิทธิ์ตรง ๆ ในโปรเจกต์นี้จึงตีความใหม่เป็น **"Astra Vale — Cosmic Force Warrior"**
  ซึ่งเป็นตัวละครออริจินัล
- รายละเอียดเต็มอยู่ในหัวไฟล์ [`src/game/characters.ts`](src/game/characters.ts)

## หมายเหตุ

- ฉาก 3D ถูกแยกเป็น chunk แยกและโหลดแบบ lazy (HUD ~85 kB gzip, ฉาก ~235 kB gzip)
- รองรับ `prefers-reduced-motion` (ปิด animation และการโยกกล้อง)
- รองรับ safe-area ของมือถือ และ breakpoint ที่ 720px / 900px

## GitHub Repository Settings Guide

เพื่อให้การทำงานของ CI/CD และความปลอดภัยครอบคลุม 100% ให้เปิดใช้งานการตั้งค่าบน GitHub Web UI ดังนี้:

1. **GitHub Pages (`Settings -> Pages`)**:
   - Source: เลือก **GitHub Actions**
2. **Branch Protection (`Settings -> Branches`)**:
   - เพิ่ม protection rule สำหรับ branch `main`:
     - [x] **Require a pull request before merging**
     - [x] **Require status checks to pass before merging** (เลือก `Continuous Integration`)
     - [x] **Require branches to be up to date before merging**
3. **Code Security and Analysis (`Settings -> Code security and analysis`)**:
   - [x] **Dependabot alerts**: Enabled
   - [x] **Dependabot security updates**: Enabled
   - [x] **Secret scanning**: Enabled
   - [x] **CodeQL analysis**: Enabled (via `.github/workflows/codeql.yml`)

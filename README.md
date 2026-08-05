# Legend of Soul-TH — Lobby

[![Build, Typecheck and Lint](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/ci.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/deploy.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/deploy.yml)
[![CodeQL Analysis](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/codeql.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/codeql.yml)
[![Security & Secret Scan](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/security-scan.yml/badge.svg)](https://github.com/LegendofSoulTH/LegendOfSoulTH/actions/workflows/security-scan.yml)

**เล่นได้ที่**: https://legendofsoulth.github.io/LegendOfSoulTH/

หน้า Lobby ของเกม Turn-based **2.5D** แนว *"รวมเหล่านักรบจากตำนานและประวัติศาสตร์"*
สร้างด้วย **React 19 + TypeScript + Vite**, ฉาก 3D ด้วย **three.js + React Three Fiber**, สไตล์ด้วย **CSS Modules**

> ขอบเขตปัจจุบัน: หน้า Lobby + สมัคร/ล็อกอิน + ระบบทอง/หยกพื้นฐาน
> ปุ่มเมนูส่วนใหญ่ยังเป็น placeholder — กดได้แต่แสดง toast `Coming soon`
> ยังไม่มีหน้าต่อสู้จริง / เควส / ระบบดรอปจริง / backend server (ดูหัวข้อ "บัญชีผู้เล่นและทอง/หยก" ด้านล่าง)

## คำสั่ง

```bash
npm install       # ติดตั้ง dependencies (ทำครั้งเดียว)
npm run dev       # เปิด dev server -> http://localhost:5173
npm run typecheck # type-check เท่านั้น (tsc -b)
npm run lint      # oxlint
npm run test      # Vitest
npm run build     # typecheck + build production ลง dist/
npm run preview   # ดู production build
npm run ci        # typecheck + lint + test + build ครบ (เหมือนที่ CI รัน)
                  # pre-commit hook (husky + lint-staged) รัน oxlint บนไฟล์ที่ staged อัตโนมัติแล้ว

npm run build:models   # สร้างไฟล์ GLB ของตัวละครลง public/models/
npm run build:images   # แปลงภาพต้นฉบับ assets/raw/ -> WebP บีบอัดแล้วลง public/
```

> อยากรู้ว่าโปรเจกต์นี้ทำงานร่วมกับ AI agent ยังไง (กฎบังคับ, ที่มาโค้ด, ประวัติการตัดสินใจ) ดู
> [`AGENTS.md`](AGENTS.md) และ [`MEMORY.md`](MEMORY.md)
>
> จะส่ง PR ดู [`CONTRIBUTING.md`](CONTRIBUTING.md) · รายงานช่องโหว่ดู [`SECURITY.md`](SECURITY.md)
> · [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) · ประวัติเวอร์ชันดู [`CHANGELOG.md`](CHANGELOG.md)

## ฉาก 3D

- **กล้อง 2.5D มุมเฉียงคงที่** — ผู้เล่นหมุนกล้องเองไม่ได้ มีเพียงการโยกตามเมาส์เล็กน้อย
  และกล้องถอยออกอัตโนมัติเมื่อจอแคบ (ดู `CameraRig` ใน `LobbyScene.tsx`)
- **ช่องยืนของตัวละคร 3 จุด**: `left` / `center` / `right`
  ตำแหน่งกำหนดที่ `SLOT_TRANSFORM` ใน [`src/game/characters.ts`](src/game/characters.ts)
- **Idle animation** ต่อโมเดล: หายใจ (ลำตัวยืด-หด), ไหล่และแขนขยับ, ศีรษะมองรอบ ๆ,
  ผ้าคลุมพลิ้ว, หางสะบัด, ลูกแก้วพลังงานโคจร — แต่ละตัวมี phase ต่างกันจึงไม่ขยับพร้อมกัน
- **กดที่โมเดล** → วงแหวนใต้เท้าสว่างขึ้น ตัวขยายเล็กน้อย และเปิดกรอบข้อมูลตัวละคร
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

## โครงสร้าง

```
src/
├─ App.tsx                        เส้นทางเข้าเกม: Title → Auth → NameModal → Lobby (ดู useAuth)
├─ index.css                      design token ทั้งหมด (สี / spacing / motion) + reset
├─ game/characters.ts             ⭐ ทะเบียนนักรบ + ตำแหน่งช่องยืน + นโยบาย IP + getCombatPower()
├─ pages/
│  ├─ TitlePage.tsx               หน้าแรกก่อนล็อกอิน
│  └─ LobbyPage.tsx               ประกอบ layout, ถือ state การเลือกตัวละคร/modal ต่าง ๆ
├─ hooks/
│  ├─ useAuth.ts                  ⭐ state บัญชีผู้เล่นของทั้งเกม — ทุกหน้าจอคุยผ่าน hook นี้เท่านั้น
│  │                               (register/login/logout/updatePlayer/earnGold/topUpGold/topUpGems/redeemCoupon)
│  ├─ useDeployWatcher.ts         เช็คทุก 5 นาที + ตอนกลับมาโฟกัสแท็บ ว่ามี build ใหม่ deploy หรือยัง
│  │                               (เทียบชื่อไฟล์ entry script ที่มี hash — ดู UpdateBanner/)
│  └─ useDeviceRefreshRate.ts     วัด Hz จริงของจอผ่าน requestAnimationFrame (ปัดเข้าค่ามาตรฐาน
│                                  30/60/90/120/144/165/240) ใช้ปรับ dpr สูงสุดของ Canvas ใน LobbyScene
├─ data/
│  ├─ accountRepository.ts        ⭐ "ฐานข้อมูล" ตอนนี้ = localStorage (คีย์ `los:db:v1`)
│  │                               บัญชี/ล็อกอิน/UID + ทอง (เฉพาะ quest/drop) + หยก (เฉพาะ topup/coupon)
│  │                               มี schema เทียบเท่า SQL ไว้ในคอมเมนต์หัวไฟล์ สำหรับย้ายไป backend จริง
│  └─ mockPlayer.ts               mock data (MOCK_BADGES — ใช้ใน LobbyPage.tsx)
├─ lib/
│  ├─ storage.ts                  ตัวห่อ localStorage ที่ไม่โยน exception (log ก่อน fallback ทุกจุด)
│  ├─ password.ts                 hash/verify รหัสผ่าน (client-side เดโม ยังไม่ใช่ระดับ production)
│  ├─ format.ts                   formatNumber / formatBadge / clampRatio (มี unit test)
│  ├─ publicUrl.ts                ต่อ asset path ใน public/ กับ Vite base — จำเป็นเพราะ deploy จริง
│  │                               ขึ้น subpath (`/LegendOfSoulTH/`) ไม่ใช่ root
│  └─ globalErrorHandlers.ts      window 'error'/'unhandledrejection' — ดัก error นอก React render
│                                  (Phaser/R3F loop ไม่ผ่าน ErrorBoundary)
├─ components/
│  ├─ ErrorBoundary/              จับ crash ระดับ render ทั้งแอป, แสดงปุ่ม "โหลดใหม่"
│  ├─ LobbyScene/
│  │  ├─ LobbyScene.tsx           <Canvas>, กล้อง, แสง, หมอก, เช็ค WebGL2 ก่อน mount + จับ context-lost
│  │  ├─ ArenaStage.tsx           ลานหิน เสา ธง กระถางไฟ
│  │  └─ CharacterModel.tsx       ⭐ โมเดล low-poly + idle animation + วงเลือก
│  ├─ AuthModal/                  ฟอร์มสมัคร/เข้าสู่ระบบ
│  ├─ NameModal/                  ตั้งชื่อตัวละครครั้งแรกหลังสมัคร (2–10 ตัวอักษร)
│  ├─ TopBar/                     avatar, ชื่อ, พลังรบ, แถบ EXP, ปุ่ม + ของ Gold/Gem เปิดหน้าเติมเงินตามสกุลที่กด
│  ├─ CurrencyShopModal/           เลือกแพ็กเกจเติมทอง/หยก (เดโม ยังไม่ผูก payment gateway จริง)
│  ├─ SettingsModal/               แท็บข้อมูลเกม / เสียง / คูปอง (แลกโค้ดหยกจริงผ่าน redeemCoupon)
│  ├─ ProfileModal/                รายละเอียดผู้เล่น
│  ├─ CharacterRoster/             ทำเนียบวีรชน (การ์ด/พรีวิวตัวละครที่ครอบครอง)
│  ├─ CharacterPanel/              กรอบข้อมูลตัวละคร (ข้อมูล placeholder)
│  ├─ StartAdventure/              ปุ่มหลัก
│  ├─ MainNavigation/              Battle / Heroes / Barracks / Summon / Guild
│  ├─ SideActions/                 Mail / Mission / Settings (มี badge)
│  ├─ Toast/                       ระบบ toast + `useToast().comingSoon()`
│  ├─ UpdateBanner/                แถบเตือนลอยด้านบน โผล่เมื่อ useDeployWatcher เจอ build ใหม่
│  └─ icons/GameIcons.tsx          ไอคอน SVG ที่วาดเองทั้งหมด
└─ types/player.ts                Player, PlayerBadges, PlayerState
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

ทุกหน้าจอคุยกับสถานะผู้เล่นผ่าน [`src/hooks/useAuth.ts`](src/hooks/useAuth.ts) เท่านั้น
ไม่มีหน้าไหนเรียก localStorage หรือ `accountRepository` ตรง ๆ — `App.tsx` ถือ `useAuth()`
แล้วส่ง `player` + callback ต่าง ๆ ลงไปเป็น props (`LobbyPage` → `TopBar` / `SettingsModal` ฯลฯ)

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

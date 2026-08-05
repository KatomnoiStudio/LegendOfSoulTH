# GameTurnBase — Lobby

หน้า Lobby ของเกม Turn-based **2.5D** แนว *"รวมเหล่านักรบจากตำนานและประวัติศาสตร์"*
สร้างด้วย **React 19 + TypeScript + Vite**, ฉาก 3D ด้วย **three.js + React Three Fiber**, สไตล์ด้วย **CSS Modules**

> ขอบเขตปัจจุบัน: หน้า Lobby + สมัคร/ล็อกอิน + ระบบทอง/หยกพื้นฐาน
> ปุ่มเมนูส่วนใหญ่ยังเป็น placeholder — กดได้แต่แสดง toast `Coming soon`
> ยังไม่มีหน้าต่อสู้จริง / เควส / ระบบดรอปจริง / backend server (ดูหัวข้อ "บัญชีผู้เล่นและทอง/หยก" ด้านล่าง)

## คำสั่ง

```bash
npm install     # ติดตั้ง dependencies (ทำครั้งเดียว)
npm run dev     # เปิด dev server -> http://localhost:5173
npm run build   # type-check (tsc -b) + build production ลง dist/
npm run preview # ดู production build
npm run lint    # oxlint

npm run build:models   # สร้างไฟล์ GLB ของตัวละครลง public/models/
```

## ฉาก 3D

- **กล้อง 2.5D มุมเฉียงคงที่** — ผู้เล่นหมุนกล้องเองไม่ได้ มีเพียงการโยกตามเมาส์เล็กน้อย
  และกล้องถอยออกอัตโนมัติเมื่อจอแคบ (ดู `CameraRig` ใน `LobbyScene.tsx`)
- **ช่องยืนของตัวละคร 3 จุด**: `left` / `center` / `right`
  ตำแหน่งกำหนดที่ `SLOT_TRANSFORM` ใน [`src/game/characters.ts`](src/game/characters.ts)
- **Idle animation** ต่อโมเดล: หายใจ (ลำตัวยืด-หด), ไหล่และแขนขยับ, ศีรษะมองรอบ ๆ,
  ผ้าคลุมพลิ้ว, หางสะบัด, ลูกแก้วพลังงานโคจร — แต่ละตัวมี phase ต่างกันจึงไม่ขยับพร้อมกัน
- **กดที่โมเดล** → วงแหวนใต้เท้าสว่างขึ้น ตัวขยายเล็กน้อย และเปิดกรอบข้อมูลตัวละคร
  (กดพื้นที่ว่างเพื่อยกเลิกการเลือก)

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
│  │                               (register/login/logout/updatePlayer/earnGold/topUpGems/redeemCoupon)
│  └─ usePlayer.ts                ⚠️ ไม่ได้ใช้งานจริงแล้ว (เหลือไว้เป็นตัวอย่าง mock hook เดิม)
├─ data/
│  ├─ accountRepository.ts        ⭐ "ฐานข้อมูล" ตอนนี้ = localStorage (คีย์ `los:db:v1`)
│  │                               บัญชี/ล็อกอิน/UID + ทอง (เฉพาะ quest/drop) + หยก (เฉพาะ topup/coupon)
│  │                               มี schema เทียบเท่า SQL ไว้ในคอมเมนต์หัวไฟล์ สำหรับย้ายไป backend จริง
│  └─ mockPlayer.ts               mock data (ใช้เฉพาะ MOCK_BADGES และใน usePlayer.ts เดิม)
├─ lib/
│  ├─ storage.ts                  ตัวห่อ localStorage ที่ไม่โยน exception
│  ├─ password.ts                 hash/verify รหัสผ่าน (client-side เดโม ยังไม่ใช่ระดับ production)
│  └─ format.ts                   formatNumber / formatBadge / clampRatio
├─ components/
│  ├─ LobbyScene/
│  │  ├─ LobbyScene.tsx           <Canvas>, กล้อง, แสง, หมอก
│  │  ├─ ArenaStage.tsx           ลานหิน เสา ธง กระถางไฟ
│  │  └─ CharacterModel.tsx       ⭐ โมเดล low-poly + idle animation + วงเลือก
│  ├─ AuthModal/                  ฟอร์มสมัคร/เข้าสู่ระบบ
│  ├─ NameModal/                  ตั้งชื่อตัวละครครั้งแรกหลังสมัคร (2–10 ตัวอักษร)
│  ├─ TopBar/                     avatar, ชื่อ, พลังรบ, แถบ EXP, Gold/Gem + ปุ่ม + (เก็บของตก / เติมหยก)
│  ├─ GemShopModal/                เลือกแพ็กเกจเติมหยก (เดโม ยังไม่ผูก payment gateway จริง)
│  ├─ SettingsModal/               แท็บข้อมูลเกม / เสียง / คูปอง (แลกโค้ดหยกจริงผ่าน redeemCoupon)
│  ├─ ProfileModal/                รายละเอียดผู้เล่น
│  ├─ CharacterRoster/             ทำเนียบวีรชน (การ์ด/พรีวิวตัวละครที่ครอบครอง)
│  ├─ CharacterPanel/              กรอบข้อมูลตัวละคร (ข้อมูล placeholder)
│  ├─ StartAdventure/              ปุ่มหลัก
│  ├─ MainNavigation/              Battle / Heroes / Barracks / Summon / Guild
│  ├─ SideActions/                 Mail / Mission / Settings (มี badge)
│  ├─ Toast/                       ระบบ toast + `useToast().comingSoon()`
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
- ทองเพิ่มได้ทาง `earnGold(uid, 'quest' | 'drop', amount)` เท่านั้น — ยังไม่มีระบบเควส/ดรอปจริง
  ปุ่ม "+" ข้างทองใน TopBar ตอนนี้เป็นตัวจำลอง "เก็บของตก" (สุ่ม 20–80) ไว้ก่อน
- หยกเพิ่มได้ทาง `topUpGems(uid, packageId)` (เติมเงินจริง — **ยังไม่ต่อ payment gateway**
  ถือว่าจ่ายสำเร็จเสมอ ห้ามใช้ค้าจริง) หรือ `redeemCoupon(uid, code)` (โค้ดคูปอง เช่น `WELCOME2026`)
- ไม่มีฟังก์ชัน set ทอง/หยกตรง ๆ ให้เรียกจากที่อื่น — ทุกการเพิ่มถูกบันทึกลง `account.transactions`
  เพื่อตรวจสอบที่มาและกันแลกคูปองซ้ำ
- คอมเมนต์หัวไฟล์ `accountRepository.ts` มี schema เทียบเท่า SQL ไว้ให้ (accounts / players /
  owned_characters / team_slots / currency_transactions) — สลับไปต่อ backend จริงได้โดยแก้แค่
  ไฟล์นั้นไฟล์เดียว (เปลี่ยน import ที่ `useAuth.ts` บรรทัดเดียว) โดยไม่กระทบหน้าจอ

⚠️ `src/hooks/usePlayer.ts` เป็นโค้ดตัวอย่าง/mock hook เดิมที่ **ไม่ได้ถูกใช้งานจริงแล้ว**
(ของจริงไหลผ่าน `useAuth` ตามข้างต้น) เหลือไว้เผื่ออ้างอิงรูปแบบ `PlayerState` เท่านั้น

## นโยบายทรัพย์สินทางปัญญา

- ทุกโมเดล ไอคอน และภาพในโปรเจกต์นี้ **สร้างขึ้นเองทั้งหมด** ไม่มี asset จากภายนอก
- ตัวละครจากตำนาน/ประวัติศาสตร์ (Hanuman, Lu Bu) อยู่ใน public domain — **ดีไซน์ออกแบบขึ้นใหม่เอง**
- ห้ามใส่ตัวละครลิขสิทธิ์ตรง ๆ ในโปรเจกต์นี้จึงตีความใหม่เป็น **"Astra Vale — Cosmic Force Warrior"**
  ซึ่งเป็นตัวละครออริจินัล
- รายละเอียดเต็มอยู่ในหัวไฟล์ [`src/game/characters.ts`](src/game/characters.ts)

## หมายเหตุ

- ฉาก 3D ถูกแยกเป็น chunk แยกและโหลดแบบ lazy (HUD ~66 kB gzip, ฉาก ~237 kB gzip)
- รองรับ `prefers-reduced-motion` (ปิด animation และการโยกกล้อง)
- รองรับ safe-area ของมือถือ และ breakpoint ที่ 720px / 900px

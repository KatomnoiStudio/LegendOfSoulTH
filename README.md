# GameTurnBase — Lobby

หน้า Lobby ของเกม Turn-based **2.5D** แนว *"รวมเหล่านักรบจากตำนานและประวัติศาสตร์"*
สร้างด้วย **React 19 + TypeScript + Vite**, ฉาก 3D ด้วย **three.js + React Three Fiber**, สไตล์ด้วย **CSS Modules**

> ขอบเขตปัจจุบัน: หน้า Lobby เท่านั้น
> ปุ่มเมนูทั้งหมดเป็น placeholder — กดได้แต่แสดง toast `Coming soon`
> ยังไม่มีหน้าต่อสู้ / ระบบตัวละคร / ล็อกอิน / หลังบ้าน

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
├─ App.tsx                        ครอบ LobbyPage ด้วย ToastProvider
├─ index.css                      design token ทั้งหมด (สี / spacing / motion) + reset
├─ game/characters.ts             ⭐ ทะเบียนนักรบ + ตำแหน่งช่องยืน + นโยบาย IP
├─ pages/LobbyPage.tsx            ประกอบ layout และถือ state การเลือกตัวละคร
├─ components/
│  ├─ LobbyScene/
│  │  ├─ LobbyScene.tsx           <Canvas>, กล้อง, แสง, หมอก
│  │  ├─ ArenaStage.tsx           ลานหิน เสา ธง กระถางไฟ
│  │  └─ CharacterModel.tsx       ⭐ โมเดล low-poly + idle animation + วงเลือก
│  ├─ CharacterPanel/             กรอบข้อมูลตัวละคร (ข้อมูล placeholder)
│  ├─ TopBar/                     avatar, ชื่อ, เลเวล, แถบ EXP, Gold/Gem + ปุ่ม +
│  ├─ StartAdventure/             ปุ่มหลัก
│  ├─ MainNavigation/             Battle / Heroes / Barracks / Summon / Guild
│  ├─ SideActions/                Mail / Mission / Settings (มี badge)
│  ├─ Toast/                      ระบบ toast + `useToast().comingSoon()`
│  └─ icons/GameIcons.tsx         ไอคอน SVG ที่วาดเองทั้งหมด
├─ hooks/usePlayer.ts             จุดเดียวที่ป้อนข้อมูลผู้เล่นให้ UI
├─ types/player.ts                Player, PlayerBadges, PlayerState
├─ data/mockPlayer.ts             mock data (ลบทิ้งเมื่อต่อ API)
└─ lib/format.ts                  formatNumber / formatBadge / clampRatio
```

## เปลี่ยนโมเดล placeholder → โมเดล 3D จริง

โมเดลตอนนี้ประกอบจาก primitive ของ three.js (กล่อง/ทรงกระบอก/กรวย) เพื่อให้สลับได้ง่าย

1. วางไฟล์ `.glb` ไว้ที่ `public/models/<id>.glb`
2. ใส่ `modelUrl: '/models/<id>.glb'` ในรายการของ `ROSTER`
3. ติดตั้ง `@react-three/drei` แล้วแทน `<PlaceholderRig>` ใน
   [`CharacterModel.tsx`](src/components/LobbyScene/CharacterModel.tsx) ด้วย `useGLTF` + `useAnimations`

โครงรอบนอก (ตำแหน่งช่อง, hitbox สำหรับกด, วงแหวนเลือก, เอฟเฟกต์ hover) ใช้ซ้ำได้ทั้งหมด

## เปลี่ยนจาก mock เป็นข้อมูลจริง

แก้ไฟล์เดียวคือ [`src/hooks/usePlayer.ts`](src/hooks/usePlayer.ts) ให้ดึงข้อมูลจาก API
แล้ว return เป็น `PlayerState` เหมือนเดิม — ทุก component ทำงานต่อได้ทันที

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

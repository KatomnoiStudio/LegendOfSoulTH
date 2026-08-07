# Changelog

รูปแบบอิง [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/)
เวอร์ชันอิง [Semantic Versioning 2.0.0](https://semver.org/)

## [Unreleased]

ยังไม่มี

## [0.3.1] - 2026-08-07

### Fixed

- **Session ไม่มีวันหมดอายุ** — ล็อกอินครั้งเดียวเข้าเกมได้ตลอดไป ปิดแท็บทิ้งไว้กี่ปีก็ไม่เด้ง
  ออก ตอนนี้หมดอายุแบบ sliding window 30 วัน (เข้าเล่นต่อเนื่องไม่โดนเตะกลางเกม แต่แท็บที่
  ทิ้งไว้เกิน 30 วันจริง ๆ ต้องล็อกอินใหม่)

## [0.3.0] - 2026-08-07

รอบต่อจาก 0.2.0 (ที่ยังไม่เคยปล่อยจริง — run deploy ของ commit ที่ bump ไว้ถูก cancel
ก่อนตัด release ได้ กติกาเวอร์ชันเปลี่ยนถึงปล่อยจึง skip ทุกครั้งหลังจากนั้นถูกต้องแล้ว
เพราะเลขไม่เคยขยับ) เวอร์ชันนี้ปล่อยของทั้งสองรอบรวมกัน

### Fixed

- **`requestExit` ทับผลตัดสินการต่อสู้** — กดออกจากห้องพอดีเฟรมที่ชนะ/แพ้ตัดสินแล้ว
  ทำให้สถานะกลายเป็น "กำลังออก" แทนผลจริง ตอนนี้ผลที่ตัดสินแล้วแก้ไม่ได้อีก
- **บันทึกชนกันข้ามแท็บ** — เปิดเกมสองแท็บพร้อมกันแล้วบันทึกไล่กัน แท็บที่บันทึกทีหลัง
  เคยทับข้อมูลของแท็บแรกเงียบ ๆ เพิ่มตัวนับรุ่น (`rev`) เทียบก่อนเขียนทุกครั้ง

### Added

- Property-based fuzz testing ด้วย `fast-check` — ครอบสูตรดาเมจ/ป้องกัน/HP สูงสุด/สัดส่วนหลอดเลือด
- เทสต์ระดับ component ชุดแรก (`AuthModal`/`ErrorBoundary`/`GlobalErrorBanner`/`EnemyHealthBar`)
  — แต่ละตัวล็อกบั๊กที่โปรเจกต์นี้เจอจริง ไม่ใช่เขียนตามสเปก
- Prettier ผูกกับ pre-commit (`.prettierrc.json`) ให้ไฟล์ที่แก้ค่อย ๆ เป็นรูปแบบเดียวกัน
- CI รัน Node 22 และ 24 คู่ขนาน (`engines.node >=22` ของ `package.json`)
- `CONTRIBUTING.md` หัวข้อ Release process

### Changed

- แยก `vendor-react` chunk ออกจากโค้ดแอป — ผู้เล่นกลับมาเล่นได้ใช้ cache เดิมของ react
  ในดีพลอยที่ไม่ได้แตะ react
- บีบภาพตัวละครที่เกินเพดานการแสดงผลจริงก่อนแปลง WebP (`tools/optimize-images.mjs`)

## [0.2.0] - 2026-08-07

รวมงานทั้งหมดตั้งแต่ 0.1.0 — เว็บจริงตามหลัง 18 commit อยู่ก่อนหน้านี้ เพราะทุก push
ยิง deploy พร้อมกันจนถูก cancel ทับกันเอง เวอร์ชันนี้เป็นรอบแรกที่ปล่อยด้วยกติกาใหม่
(ปล่อยเมื่อเลขเวอร์ชันเกมเปลี่ยนเท่านั้น — ดู `.github/workflows/deploy.yml`)

### Fixed

- **นำเข้าไฟล์ save ที่ไม่มีข้อมูลผู้เล่นแล้วเกมเปิดไม่ได้ถาวร** — ตัวตรวจไม่ได้ดู `player`
  และฟังก์ชันเขียนบัญชีกับ session ลง localStorage สำเร็จ _ก่อน_ จะพัง ทำให้ทุกครั้งที่โหลดหน้า
  เจอข้อผิดพลาดเดิมซ้ำ กู้ได้ทางเดียวคือล้าง localStorage เอง
- **ล็อกอินแล้วเกมค้างยาว** — `renderer.init()` ของ WebGPU ไม่มี timeout ถ้าการเจรจา adapter
  ค้าง (เจอจริงบน GPU/ไดรเวอร์บางตัว) จะไม่ resolve ไม่ reject จึงไม่ตกไป WebGL2 เลย
- **สเกลพังบนมือถือแนวนอน** — กฎ CSS สามไฟล์เช็คแต่ `max-width` ไม่เช็ค `max-height`
  จอกว้างแต่เตี้ยจึงยังใช้ layout เดสก์ท็อป ปุ่ม "เริ่มการผจญภัย" ทับแถบเมนูล่าง
- สมัครสมาชิกตอนพื้นที่เก็บข้อมูลเต็มแล้วระบบบอกว่าล้มเหลว แต่ login ครั้งถัดไปกลับผ่าน
  เพราะ `loadDb()` คืนค่าคงที่ตัวเดียวร่วมกันแทนที่จะเป็นอ็อบเจ็กต์ใหม่
- กล่องเข้าสู่ระบบค้างใช้ต่อไม่ได้เมื่อ promise ถูก reject — ปุ่มถูก disable ทั้งหมดโดยไม่มีข้อความบอก
- พิมพ์ในช่องคูปองและช่องรหัสเพื่อนไม่ได้ — ตัวเดินในลอบบี้ดักคีย์บอร์ดจากทั้งหน้าต่าง
  ทำให้ w/a/s/d เดินตัวละครหลังโมดัล และลูกศร/เว้นวรรคถูกกิน
- จำนวนรอบ PBKDF2 ที่อ่านจากแฮชไม่ถูกตรวจ — ไฟล์ save ปลอมสั่งให้คำนวณจนค้างทั้งแท็บได้
- หลอดเลือดศัตรูไม่พอตั้งแต่คลื่นสอง และด่านที่หาศัตรูไม่เจอเลยกลายเป็นห้องที่ชนะก็ไม่ได้ แพ้ก็ไม่ได้
- ตัวเลขดาเมจสะสมหน่วยความจำไม่มีเพดานตลอดการต่อสู้

### Added

- สกิล "กระบวนทองคำ" ของหงอคง พร้อมปุ่มสกิลบนจอ คูลดาวน์ และช่วงอมตะ
- ปุ่ม "ต่อสู้" กับ "เริ่มการผจญภัย" เข้าห้องต่อสู้ตรง ๆ ไม่ต้องเดินหา NPC
- สไปรต์ตือโป๊ยก่ายชุด v7 ครบ 8 ทิศ พร้อมท่ายืนหายใจและท่าทางประจำตัว
- เทสต์ครอบ `accountRepository` กับ `password` (สองไฟล์นี้เคยไม่มีเทสต์เลย) และเทสต์กัน
  เลขเวอร์ชันเกมกับ `package.json` หลุดจากกัน — รวม 21 ไฟล์ / 176 เทสต์
- `.github/workflows/upstream-skill-watch.yml` — เฝ้าแหล่ง skill ต้นทาง เปิด issue เมื่อมีของใหม่

### Changed

- **deploy ผูกกับเลขเวอร์ชันเกม** ไม่ใช่ทุก push อีกต่อไป และตัด GitHub Release
  พร้อมแนบ SBOM ให้อัตโนมัติเมื่อปล่อย
- deploy รันเทสต์ก่อน build แล้ว (ก่อนหน้านี้ commit ที่เทสต์แดงขึ้น production ได้)
- Lobby arena-slot rendering (character models + idle animation, added in 0.1.0 below) switched off via `SHOW_ARENA_SLOTS = false` in `LobbyScene.tsx` — an agreed toggle, not a removal; the lobby currently shows the empty temple scene only. Flip the constant to restore it.
- แก้กฎใน `.agents/rules/**` เจ็ดข้อที่อ้างข้อเท็จจริงซึ่งไม่จริงแล้ว (`RULES_VERSION` 12)

## [0.1.0] - 2026-08-06

เวอร์ชันแรกที่ tag/release อย่างเป็นทางการ

### Added

- หน้า Lobby, สมัคร/เข้าสู่ระบบ, ตั้งชื่อตัวละครครั้งแรก
- ฉาก 3D Lobby (React Three Fiber) พร้อม idle animation ต่อตัวละคร
- ระบบทอง/หยก (เควส/ดรอปเท่านั้นสำหรับทอง, เติมเงินจริง/คูปองสำหรับหยก) ผ่าน `accountRepository.ts`
- ระบบเติมทอง/หยกด้วยเงินจริง (`CurrencyShopModal`) — เดโม ยังไม่ต่อ payment gateway จริง
- ฉากเดิน/สำรวจ + ระบบต่อสู้พื้นฐาน (`src/game/battle/`, `src/game/exploration/`)
- WebGPU เป็น renderer หลัก ล้มกลับ WebGL2 อัตโนมัติ
- ภาพทั้งหมดแปลงเป็น WebP ผ่าน pipeline `assets/raw/` → `npm run build:images`
- Governance: `AGENTS.md`, `MEMORY.md`, `.agents/rules/**`, `SECURITY.md`

[Unreleased]: https://github.com/LegendofSoulTH/LegendOfSoulTH/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/LegendofSoulTH/LegendOfSoulTH/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/LegendofSoulTH/LegendOfSoulTH/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/LegendofSoulTH/LegendOfSoulTH/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/LegendofSoulTH/LegendOfSoulTH/releases/tag/v0.1.0

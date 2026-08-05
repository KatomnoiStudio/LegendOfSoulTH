# Changelog

รูปแบบอิง [Keep a Changelog 2.0.0](https://keepachangelog.com/en/2.0.0/)
เวอร์ชันอิง [Semantic Versioning 2.0.0](https://semver.org/)

## [Unreleased]

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

[Unreleased]: https://github.com/LegendofSoulTH/LegendOfSoulTH/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LegendofSoulTH/LegendOfSoulTH/releases/tag/v0.1.0

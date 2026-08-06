# Contributing

โปรเจกต์นี้เปิดรับ PR แต่ maintain แบบ solo-maintained (best-effort) — ดู [`SECURITY.md`](SECURITY.md)

## เริ่มต้น

```bash
npm install
npm run dev       # http://localhost:5173
npm run ci        # typecheck + lint + test + build — รันให้ผ่านก่อนส่ง PR เสมอ
```

รายละเอียดคำสั่ง/โครงสร้างโปรเจกต์ทั้งหมด → [`README.md`](README.md)

## ก่อนส่ง PR

1. `npm run ci` ต้องผ่านทั้งหมด (typecheck/lint/test/build) — CI จะรันซ้ำอีกทีอยู่แล้ว แต่เช็คก่อนส่งเร็วกว่า
2. ทำตาม [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)
3. commit message อธิบาย "ทำไม" ไม่ใช่แค่ "อะไร" — ดูสไตล์จาก `git log` ที่ผ่านมา

## รายงานบั๊ก / เสนอฟีเจอร์

ใช้ GitHub Issues — มี template ให้เลือก ([bug report](.github/ISSUE_TEMPLATE/bug_report.yml) /
[feature request](.github/ISSUE_TEMPLATE/feature_request.yml))

รายงานช่องโหว่ความปลอดภัย **ห้าม**เปิด public issue — ดูขั้นตอนที่ [`SECURITY.md`](SECURITY.md)

## ถ้าใช้ AI agent ช่วยเขียนโค้ด

โปรเจกต์นี้มีกฎบังคับสำหรับ AI agent ที่ทำงานในนี้ (memory protocol, coding standard,
ring-authority policy) — อ่าน [`AGENTS.md`](AGENTS.md) และ [`MEMORY.md`](MEMORY.md) ก่อนเริ่ม
ถ้า agent ของคุณไม่รองรับการอ่านไฟล์เหล่านี้อัตโนมัติ ให้สั่งตรง ๆ ให้อ่านก่อนแก้โค้ดใด ๆ

## Code of Conduct

โปรเจกต์นี้ยึด [Contributor Covenant](CODE_OF_CONDUCT.md)

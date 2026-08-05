/**
 * สร้าง public/{characters,ui,backgrounds}/ จาก assets/raw/ (ต้นฉบับ) ผ่าน sharp
 *
 *   npm run build:images
 *
 * ทำไมต้องมีสองชุด: Vite ไม่แตะไฟล์ใน public/ เลย (copy ดิบ ๆ ตอน build) ต้นฉบับที่ export
 * มาจากโปรแกรมวาดภาพจึงมักใหญ่เกินจำเป็นสำหรับสิ่งที่จอเกมแสดงจริง — สคริปต์นี้บีบอัด/แปลง
 * เป็น WebP (คุณภาพสูง มองไม่ออกว่าต่างจากต้นฉบับ แต่เบากว่ามาก) ให้ครั้งเดียว แล้วค่อย commit
 * ผลลัพธ์เข้า public/ เหมือนกับที่ tools/build-models.mjs ทำกับโมเดล 3D
 *
 * รันใหม่ทุกครั้งที่เพิ่ม/แก้ไฟล์ภาพใน assets/raw/ — ไฟล์ที่ public/ ยังไม่มีคู่จะถูกสร้างให้,
 * ไฟล์ที่มีอยู่แล้วและ raw ไม่ได้แก้ (mtime ไม่เปลี่ยน) จะข้ามเพื่อความเร็ว (--force ข้ามการเช็คนี้)
 */

import { mkdir, readdir, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RAW_DIR = join(ROOT, 'assets', 'raw')
const OUT_DIR = join(ROOT, 'public')
const FORCE = process.argv.includes('--force')

/** ตัวละครมีเฟรมนิ่ง ๆ เยอะ (walk/turnaround/idle) ต้องคมเวลาซูม — คุณภาพสูงกว่า UI ทั่วไป */
const QUALITY_BY_DIR = {
  characters: 90,
  ui: 88,
  backgrounds: 85,
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.png') out.push(full)
  }
  return out
}

async function main() {
  const files = await walk(RAW_DIR)
  let converted = 0
  let skipped = 0
  let bytesIn = 0
  let bytesOut = 0

  for (const src of files) {
    const rel = relative(RAW_DIR, src)
    const topDir = rel.split(/[\\/]/)[0]
    const quality = QUALITY_BY_DIR[topDir] ?? 88
    // นามสกุลปลายทางเป็น .webp เสมอ (เว็บรองรับทุกเบราว์เซอร์ที่ project นี้ target อยู่แล้ว —
    // ดู browserslist ใน package.json) โค้ดฝั่งเกมอ้างพาธแบบไม่มีนามสกุลผ่าน publicUrl() บวกปลาย
    // ชื่อไฟล์เองเสมอ (ดู src/game/walkKits.ts, spriteSequences.ts) — เปลี่ยนแค่ตรงนี้ที่เดียว
    const dest = join(OUT_DIR, rel).replace(/\.png$/i, '.webp')

    if (!FORCE) {
      try {
        const [srcStat, destStat] = await Promise.all([stat(src), stat(dest)])
        if (destStat.mtimeMs >= srcStat.mtimeMs) {
          skipped++
          continue
        }
      } catch {
        // dest ยังไม่มี — ทำต่อไปเป็นปกติ
      }
    }

    await mkdir(dirname(dest), { recursive: true })
    await sharp(src).webp({ quality }).toFile(dest)

    const [srcStat, destStat] = await Promise.all([stat(src), stat(dest)])
    bytesIn += srcStat.size
    bytesOut += destStat.size
    converted++
  }

  const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)
  console.log(`แปลงแล้ว ${converted} ไฟล์, ข้าม ${skipped} ไฟล์ (ไม่เปลี่ยนตั้งแต่รันล่าสุด)`)
  if (converted > 0) {
    const saved = bytesIn > 0 ? (100 * (1 - bytesOut / bytesIn)).toFixed(0) : 0
    console.log(`ขนาดไฟล์ที่แปลง: ${mb(bytesIn)}MB → ${mb(bytesOut)}MB (ลด ${saved}%)`)
  }
}

await main()

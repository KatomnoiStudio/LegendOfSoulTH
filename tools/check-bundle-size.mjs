/**
 * เพดานขนาด bundle จริง (แทนการยกเพดาน warning ของ Vite ให้เงียบเฉย ๆ)
 *
 * รัน "npm run build" ก่อนสคริปต์นี้เสมอ (ต่อกันใน "ci") — อ่าน dist/assets/*.js
 * แล้ว gzip เทียบเพดาน 2 ระดับ: chunk ของ vendor/three.js (ใหญ่โดยธรรมชาติ ยอมรับแล้ว
 * ดูเหตุผลใน vite.config.ts) เพดานสูงกว่า ส่วนโค้ดแอปเพดานต่ำกว่า
 *
 * เพดานเป็น "ratchet" คือตั้งเหนือค่าที่วัดได้จริงพอประมาณ ให้โตได้ตามปกติแต่สะดุดเมื่อมี
 * อะไรผิดปกติหลุดเข้ามา (เช่น lib ก้อนใหญ่ถูก bundle เข้า chunk ของแอปโดยไม่ตั้งใจ)
 * ไม่ใช่ตั้งสูงลิ่วจนไม่มีวันแดง
 *
 * วัดจริงจาก build วันที่ 2026-08-10 (`npm run build` แล้วรันสคริปต์นี้):
 *   vendor สูงสุด 154.0 KB gzip (three.webgpu-*.js) → เพดาน 200 KB (เผื่อ ~30%)
 *   แอปสูงสุด     47.4 KB gzip (App-*.js)           → เพดาน  70 KB (เผื่อ ~48%)
 *
 * เพดานแอปเดิมคือ 300 KB ซึ่งสูงกว่าเพดาน vendor ทั้งที่คอมเมนต์บอกว่าต้องต่ำกว่า และห่างจาก
 * ค่าจริง 6 เท่า — เป็นเพดานที่ไม่มีวันบังคับอะไรได้ (ตัวเลข "~85 KB" ในคอมเมนต์เดิมก็ค้างมาจาก
 * build เก่าเช่นกัน) ขยับเพดานเมื่อการโตนั้นตั้งใจ และแก้ตัวเลขที่วัดได้ในคอมเมนต์นี้พร้อมกัน
 *
 *   node tools/check-bundle-size.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(ROOT, 'dist', 'assets')

// ponytail: regex ทายจากชื่อไฟล์ที่ Vite/Rollup ตั้งให้ chunk ของ three.js กับ react
// (ดู manualChunks ใน vite.config.ts + การแยก chunk ภายในของแพ็กเกจ three)
// ไม่ตรงกับ chunk ใหม่ที่ตั้งชื่อไม่เข้าแพทเทิร์นนี้ → แก้ regex ตอนนั้น
const VENDOR_PATTERN = /^(vendor-|three\.|WebGL-)/
const BUDGETS_KB_GZIP = { vendor: 200, app: 70 }

async function main() {
  let files
  try {
    files = (await readdir(ASSETS_DIR)).filter((f) => f.endsWith('.js'))
  } catch {
    console.error(`ไม่เจอ ${ASSETS_DIR} — รัน "npm run build" ก่อน`)
    process.exitCode = 1
    return
  }

  const overBudget = []
  const rows = []
  for (const file of files) {
    const buf = await readFile(join(ASSETS_DIR, file))
    const gzipKB = gzipSync(buf).length / 1024
    const tier = VENDOR_PATTERN.test(file) ? 'vendor' : 'app'
    const budget = BUDGETS_KB_GZIP[tier]
    rows.push({ file, tier, gzipKB, budget })
    if (gzipKB > budget) overBudget.push({ file, tier, gzipKB, budget })
  }

  rows.sort((a, b) => b.gzipKB - a.gzipKB)
  for (const r of rows) {
    const mark = r.gzipKB > r.budget ? '✗' : '✓'
    console.log(
      `${mark} [${r.tier}] ${r.file} — ${r.gzipKB.toFixed(1)} KB gzip (เพดาน ${r.budget} KB)`,
    )
  }

  if (overBudget.length > 0) {
    console.error(`\nเกินเพดาน ${overBudget.length} ไฟล์ — ดูรายการ ✗ ด้านบน`)
    process.exitCode = 1
    return
  }
  console.log(`\nผ่านทั้งหมด (${rows.length} ไฟล์)`)
}

await main()

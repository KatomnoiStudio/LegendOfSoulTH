/**
 * เพดานขนาด bundle จริง (แทนการยกเพดาน warning ของ Vite ให้เงียบเฉย ๆ)
 *
 * รัน "npm run build" ก่อนสคริปต์นี้เสมอ (ต่อกันใน "ci") — อ่าน dist/assets/*.js
 * แล้ว gzip เทียบเพดาน 2 ระดับ: chunk ของ vendor/three.js (ใหญ่โดยธรรมชาติ ยอมรับแล้ว
 * ดูเหตุผลใน vite.config.ts) เพดานสูงกว่า ส่วนโค้ดแอปเพดานต่ำกว่า
 *
 * เพดานตั้งจาก breakdown จริงของ build วันที่ 2026-08-08 (ดู MEMORY.md):
 *   vendor สูงสุดตอนนี้ ~159 KB gzip (three.webgpu) → เพดาน 200 KB (~เผื่อ 25%)
 *   แอปสูงสุดตอนนี้ ~85 KB gzip (App-*.js)         → เพดาน 300 KB (เผื่อโตได้อีกมาก)
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
const BUDGETS_KB_GZIP = { vendor: 200, app: 300 }

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

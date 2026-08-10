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
 * วัดจริงจาก build วันที่ 2026-08-10, master @ 51728f2 — ตัวเลขทุกตัวด้านล่างคัดลอกจาก
 * output ของ `node tools/check-bundle-size.mjs` เอง (ไม่ใช่ log ของ vite ตอน build) เพราะ
 * สองอย่างต่างกัน: log ของ vite รายงานก่อนจัด tier/ปัดทศนิยมของสคริปต์นี้ — ครั้งก่อนคอมเมนต์
 * นี้เอาเลขจาก log ของ vite มา ตัวเลขเลยไม่ตรงกับที่สคริปต์รายงานจริง (ดูวิธีวัดด้านล่าง —
 * ต้องตั้ง env ก่อน ไม่งั้นเลขหลอก):
 *   vendor สูงสุด 228.4 KB gzip (WebGL-*.js)   → เพดาน 300 KB (เผื่อ 31.3%)
 *   แอปสูงสุด     60.3 KB gzip (App-*.js)      → เพดาน  70 KB (เผื่อ 16.1% — แคบ ตัวเลขจริง
 *                                                 ไม่ได้ปัดให้ดูดี ดู follow-up #1 ใน
 *                                                 MEMORY/aide-ci-pipeline.md ว่าทำไมยังไม่ขยับ)
 *   (accountRepository.supabase-*.js 57.6 KB นับเป็น app แล้ว ไม่ใช่ vendor — ดูเหตุผลที่
 *   isVendorChunk ด้านล่าง; WebGL-*.js เดิมเคยเป็น WebGL+three.core แยก 2 chunk วันนี้ Rollup
 *   รวมเป็นก้อนเดียว ไม่ใช่โค้ดโตขึ้น — เนื้อในเหมือนเดิม แค่แบ่ง chunk ต่างไป)
 *
 * เพดานแอปเดิมคือ 300 KB ซึ่งสูงกว่าเพดาน vendor ทั้งที่คอมเมนต์บอกว่าต้องต่ำกว่า และห่างจาก
 * ค่าจริง 6 เท่า — เป็นเพดานที่ไม่มีวันบังคับอะไรได้ (ตัวเลข "~85 KB" ในคอมเมนต์เดิมก็ค้างมาจาก
 * build เก่าเช่นกัน) ขยับเพดานเมื่อการโตนั้นตั้งใจ และแก้ตัวเลขที่วัดได้ในคอมเมนต์นี้พร้อมกัน
 *
 * วิธีวัดใหม่ให้ตรงกับ CI — ต้องมี VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ตอน build:
 *
 *   VITE_SUPABASE_URL=https://ci-placeholder.supabase.co \
 *   VITE_SUPABASE_ANON_KEY=ci-build-placeholder-anon-key \
 *   npm run build && node tools/check-bundle-size.mjs
 *
 * ถ้าไม่ตั้งสองค่านี้ ตัวเลขที่ได้จะ "หลอก" อย่างเงียบ ๆ: src/lib/supabaseClient.ts throw ทันที
 * เมื่อ env ว่าง Vite แทน import.meta.env ตอน build แล้ว Rollup เห็นว่าเงื่อนไข throw เป็นจริง
 * เสมอ จึง tree-shake @supabase/supabase-js ทิ้งเกือบทั้งก้อน — chunk accountRepository.supabase
 * เหลือ 5.9 KB แทนที่จะเป็น 57.6 KB (ci.yml step "Prepare Supabase env for CI" ใส่ placeholder
 * ให้เสมอ CI จึงเห็นก้อนเต็ม — สองตัวเลขนี้ก็มาจาก output ของสคริปต์นี้เอง วัดคนละรอบ build)
 *
 *   node tools/check-bundle-size.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS_DIR = join(ROOT, 'dist', 'assets')

// chunk ที่ manualChunks ใน vite.config.ts ตั้งชื่อเอง (`vendor-*`) กับ chunk ภายในของ three
// ที่ Rollup แตกออกมาเองโดยชื่อไม่มีคำว่า three (`WebGL-*` = WebGLRenderer ของ three)
const STATIC_VENDOR_PATTERN = /^(vendor-|WebGL-)/
// token ที่ generic เกินกว่าจะบอกได้ว่า chunk เป็นของ lib — `app`, `client`, `core` ฯลฯ โผล่ใน
// ชื่อโมดูลของเราเองพอ ๆ กับในชื่อ dependency
const GENERIC_TOKENS = new Set(['app', 'client', 'core', 'dom', 'lib', 'node', 'web'])
const BUDGETS_KB_GZIP = { vendor: 300, app: 70 }

// manualChunks ใน vite.config.ts (บรรทัด 71-74) ดึงออกมาเป็น chunk แยกแค่ react เท่านั้น
// lib ที่เหลือ Rollup จึงตั้งชื่อ chunk ตาม "โมดูลของแอปที่เป็นคนลากมัน entry เข้ามา" —
// @supabase/supabase-js ทั้งก้อนเคยไปโผล่ในชื่อ `supabaseClient-*.js` มาก่อน (ชื่อไฟล์
// src/lib/supabaseClient.ts) จึง DERIVE รายการ token จาก dependencies ใน package.json แทนการ
// hardcode ชื่อ chunk — เพิ่ม dependency ใหม่แล้วรายการนี้โตตามเองโดยไม่ต้องกลับมาแก้ไฟล์นี้
function vendorTokensFromDependencies(pkg) {
  return [
    ...new Set(
      Object.keys(pkg.dependencies ?? {})
        .flatMap((dep) => dep.replace(/^@/, '').split(/[/\-.]/))
        .map((token) => token.toLowerCase())
        .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token)),
    ),
  ]
}

// ตัด hash ที่ Vite ต่อท้าย (`App-Dd3br6FU.js` → `app`) ก่อนเทียบ token — ไม่งั้น hash สุ่ม
// ที่บังเอิญมีตัวอักษรเรียงเป็น token จะจัด chunk ผิดชั้นแบบสุ่มไปตาม build
function chunkBaseName(file) {
  return file.replace(/-[A-Za-z0-9_-]{8,}\.js$/, '').toLowerCase()
}

// token ต้องอยู่ตำแหน่ง "หัวชื่อ" ของ chunk เท่านั้น (ทั้งชื่อ = token เป๊ะ, หรือ token
// ตามด้วยตัวคั่นที่ไม่ใช่ a-z0-9 ทันที) — ไม่ใช่แค่ substring ที่ไหนก็ได้ พิสูจน์แล้วว่าจำเป็น
// จาก 2 เคสจริงบน build เดียวกัน:
//   - `three.webgpu` ต้องติด vendor: ขึ้นต้นด้วย token "three" ตามด้วย "." (ตัวคั่น) → ผ่าน
//   - `accountRepository.supabase` ต้องเป็น app (โค้ดแอปที่ import supabase ไม่ใช่ตัว SDK):
//     ไม่ได้ "ขึ้นต้น" ด้วย token "supabase" (ขึ้นต้นด้วย "accountrepository") → ไม่ผ่าน ถูกต้อง
// substring แบบเดิม (`base.includes(token)`) จะติด vendor ทั้งคู่ผิด ๆ เพราะ "supabase" เป็น
// substring ของ "accountrepository.supabase" — และเผลอ ๆ ยังจับ "reaction"/"reactive"/
// "reactor" (มี "react" เป็น substring) ผิดไปด้วย ซึ่งกฎ prefix+ตัวคั่นนี้ปฏิเสธเองในตัว เพราะ
// ตัวอักษรหลัง "react" ใน "reaction" คือ "i" (a-z) ไม่ใช่ตัวคั่น
//
// ทิศทางที่ยอมพลาด: โมดูลแอปที่ตั้งชื่อขึ้นต้นด้วย token พอดี (เช่น `threeDPreview.ts` →
// "threedpreview" ขึ้นต้นด้วย "three" ตามด้วย "d" ซึ่งเป็น a-z — กรณีนี้จริง ๆ ไม่ผ่านกฎตัวคั่น
// จึงเป็น app ถูก; แต่ `three-preview.ts` → "three-preview" ขึ้นต้นด้วย "three" ตามด้วย "-" ซึ่ง
// เป็นตัวคั่น → จะติด vendor ผิด) ยอมทางนี้เพราะพลาดอีกทาง (lib จริงหลุดไปกินเพดานแอป) คือบั๊ก
// ที่เพิ่งเจอสองเคสรวด ถ้าเกิดเคสนั้นให้เปลี่ยนชื่อไฟล์หรือใส่ chunk นั้นเข้า manualChunks ตรง ๆ
function isVendorChunk(file, vendorTokens) {
  if (STATIC_VENDOR_PATTERN.test(file)) return true
  const base = chunkBaseName(file)
  return vendorTokens.some((token) => {
    if (base === token) return true
    if (!base.startsWith(token)) return false
    return !/[a-z0-9]/.test(base[token.length] ?? '')
  })
}

async function main() {
  let files
  try {
    files = (await readdir(ASSETS_DIR)).filter((f) => f.endsWith('.js'))
  } catch {
    console.error(`ไม่เจอ ${ASSETS_DIR} — รัน "npm run build" ก่อน`)
    process.exitCode = 1
    return
  }

  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
  const vendorTokens = vendorTokensFromDependencies(pkg)

  const overBudget = []
  const rows = []
  for (const file of files) {
    const buf = await readFile(join(ASSETS_DIR, file))
    const gzipKB = gzipSync(buf).length / 1024
    const tier = isVendorChunk(file, vendorTokens) ? 'vendor' : 'app'
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

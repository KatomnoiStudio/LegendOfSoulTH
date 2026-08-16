/**
 * เช็คว่า Lighthouse วัด "แอปที่บูตขึ้นจริง" ไม่ใช่หน้า error ของ bootstrap
 *
 *   node tools/check-lighthouse-target.mjs
 *
 * ทำไมต้องมี (audit item B20, 2026-08-16)
 *
 * รอบแรกของ job `lighthouse` (commit 25d5c93) ได้ performance 100 · accessibility 100 ·
 * SEO 100 · LCP 526ms — เขียวสวยทุกช่อง แล้วมันวัดหน้า error
 *
 * build ตอนนั้นไม่มี VITE_SUPABASE_* เลย initAuthCache() ใน src/main.tsx จึงโยน error
 * .catch เขียน innerHTML ทับ #root เป็นกล่อง "โหลดเกมไม่สำเร็จ" แล้ว Lighthouse ก็ให้คะแนน
 * กล่องนั้น — LCP element คือ <p> "กรุณาลองรีเฟรชหน้านี้อีกครั้ง" โหลด 13 requests 198 KB
 * ไม่มีรูปสักไฟล์
 *
 * **หน้า error ทำคะแนนได้เต็มเสมอ** ข้อความสองบรรทัดไม่มีรูป ไม่มี JS ให้รัน ไม่มี layout
 * shift — ยิ่งแอปพังเร็วเท่าไหร่คะแนนยิ่งสวยเท่านั้น เกตนี้จึงกลับด้านของสัญญาณ: คะแนนดีที่
 * มาจากหน้าที่ไม่ใช่แอป = แดง
 *
 * สิ่งที่เช็คคือ LCP element ตรง ๆ ไม่ใช่ grep ทั้งไฟล์ — สตริงพวกนี้อยู่ในบันเดิล JS ด้วย
 * และ audit บางตัวของ Lighthouse แนบ source มาใน LHR การ grep ทั้งไฟล์จะแดงหลอกตอนแอปปกติ
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/*
  `.lighthouseci` มาก่อน — treosh/lighthouse-ci-action จัดการ output เอง และ **ไม่สน**
  `upload.outputDir` ใน lighthouserc.json (มันตั้ง upload ของมันเป็น artifact) ผลลัพธ์ดิบจึงลง
  ที่ .lighthouseci/ เสมอ: "Dumping 3 reports to disk at .../.lighthouseci"

  reports/lighthouse ยังอยู่ในรายการเพราะคนที่รัน `lhci autorun` เองบนเครื่องจะได้ตาม config
  ในไฟล์นั้นจริง — สองที่นี้คือสองวิธีรัน ไม่ใช่การเดาเผื่อ
*/
const REPORT_DIRS = [
  join(process.cwd(), '.lighthouseci'),
  join(process.cwd(), 'reports', 'lighthouse'),
]

/** ข้อความใน .catch ของ src/main.tsx — เจอใน LCP element เมื่อไหร่แปลว่าแอปไม่ได้บูต */
const BOOTSTRAP_FAIL_MARKERS = ['โหลดเกมไม่สำเร็จ', 'กรุณาลองรีเฟรชหน้านี้อีกครั้ง']

function lcpText(report) {
  const item = report.audits?.['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]
  const node = item?.node
  return `${node?.nodeLabel ?? ''} ${node?.snippet ?? ''}`.trim()
}

function findReports() {
  for (const dir of REPORT_DIRS) {
    let names
    try {
      names = readdirSync(dir).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'))
    } catch {
      continue
    }
    if (names.length > 0) return { dir, names }
  }
  return null
}

const found = findReports()
if (!found) {
  console.error('ไม่พบ lhr-*.json ในที่ใดเลย — Lighthouse ไม่ได้เขียนผลลัพธ์ออกมา')
  for (const dir of REPORT_DIRS) console.error(`  หาแล้วที่: ${dir}`)
  process.exit(1)
}

const { dir: REPORT_DIR, names: reports } = found
console.log(`อ่านผลจาก ${REPORT_DIR} (${reports.length} รอบ)\n`)

let failed = 0
for (const file of reports) {
  const report = JSON.parse(readFileSync(join(REPORT_DIR, file), 'utf8'))
  const text = lcpText(report)
  const hit = BOOTSTRAP_FAIL_MARKERS.find((marker) => text.includes(marker))
  const score = Math.round((report.categories?.performance?.score ?? 0) * 100)

  if (hit) {
    failed += 1
    console.error(`✗ ${file}: LCP element เป็นหน้า error ของ bootstrap (performance ${score})`)
    console.error(`    พบ: ${hit}`)
    console.error(`    LCP element: ${text.slice(0, 160)}`)
  } else {
    console.log(
      `✓ ${file}: performance ${score} · LCP element: ${text.slice(0, 80) || '(ไม่ระบุ)'}`,
    )
  }
}

if (failed > 0) {
  console.error('')
  console.error(`Lighthouse วัดหน้า error ${failed} จาก ${reports.length} รอบ — คะแนนใช้ไม่ได้`)
  console.error('ดู src/main.tsx: .catch ของ bootstrap เขียนทับ #root เมื่อ import แรกโยน error')
  console.error(
    'สาเหตุที่เจอมาแล้ว: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ไม่ถูกส่งเข้า build',
  )
  process.exit(1)
}

console.log(`\nครบ ${reports.length} รอบ ไม่มีรอบไหนวัดหน้า error`)

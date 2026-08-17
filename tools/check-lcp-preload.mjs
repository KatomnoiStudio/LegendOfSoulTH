/**
 * เช็คว่า <link rel="preload"> ใน index.html ยังชี้ไปที่ไฟล์ที่มีอยู่จริง และยังเป็นรูปเดียวกับ
 * ที่โค้ดใช้เป็น LCP element อยู่
 *
 *   node tools/check-lcp-preload.mjs
 *
 * ทำไม preload บรรทัดนั้นถึงมีอยู่ (audit item B23, 2026-08-16)
 *
 * องค์ประกอบ LCP ของหน้าแรกคือ div.battleArt ใน src/pages/TitlePage.tsx ซึ่งใช้รูปเป็น CSS
 * background ที่ส่ง URL เข้าไปทาง custom property ใน inline style ของ React (ทำแบบนั้นเพราะ
 * url() ใน .css ชี้ผิดที่เมื่อ deploy ลง subpath ของ GitHub Pages — ดู src/lib/publicUrl.ts)
 * preload scanner ของเบราว์เซอร์จึงมองไม่เห็นรูปนี้: มันโผล่หลัง React เรนเดอร์เท่านั้น
 *
 * **ได้เท่าไหร่: ~20 ms** — วัดจริง ไม่ใช่ประมาณ (Lighthouse audit `prioritize-lcp-image`
 * คะแนน 0.5 "Est savings of 20 ms" จาก run ของ commit a8f1c95) การแยกเฟสของ LCP 720 ms
 * รอบเดียวกันบอกว่าทำไมถึงได้แค่นั้น:
 *
 *     TTFB 128 ms · Load Delay 30 ms · Load Time 4 ms · Render Delay 557 ms
 *
 * รูปใช้เวลาโหลด 4 ms ตัวถ่วงจริงคือ Render Delay 557 ms (77% ของ LCP) = เวลาที่ JS ต้องบูต
 * React ให้เสร็จก่อน element จะมีตัวตน preload แตะส่วนนั้นไม่ได้เลย **ใครจะไล่ LCP ต่อ ให้ไป
 * ที่ Render Delay ไม่ใช่มาเพิ่ม preload อีกบรรทัด**
 *
 * fetchpriority (ที่ audit item เสนอมาคู่กัน) ใช้ที่นี่ไม่ได้ — มันมีผลกับ <img>/<link>
 * ไม่ใช่ CSS background
 *
 * ทำไมต้องมีเช็คนี้
 *
 * preload ที่ชี้ผิดไฟล์ **ไม่พังอะไรเลย** หน้าเว็บยังขึ้นปกติ ไม่มี error ไม่มีจอขาว มีแค่
 * บรรทัดเตือนใน console ของเบราว์เซอร์ที่ไม่มีใครเปิดดู — สิ่งที่เสียคือได้โหลดไฟล์ที่ไม่มีใคร
 * ใช้มาฟรี ๆ แล้ว "การ optimize" ที่ตั้งใจทำก็หายไปเงียบ ๆ
 *
 * ความผิดพลาดที่กันคือการเปลี่ยนชื่อ/ย้ายไฟล์รูป: BATTLE_ART_BG ใน src/game/backgroundAssets.ts
 * แก้แล้วจบ แต่ index.html เป็นสตริงดิบ ไม่มี compiler ตัวไหนตามให้ (path ตายตัวได้เพราะ
 * public/ ไม่ถูกใส่ content hash — ดู tools/check-bundle-size.mjs, B24)
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const source = readFileSync(join(ROOT, 'src', 'game', 'backgroundAssets.ts'), 'utf8')

const preloaded = [...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g)]
  .map((tag) => /\bhref="([^"]+)"/.exec(tag[0])?.[1])
  .filter((href) => href !== undefined)

if (preloaded.length === 0) {
  console.error('index.html ไม่มี <link rel="preload"> เลย — ถ้าตั้งใจถอดออก ให้ลบเช็คนี้ด้วย')
  process.exit(1)
}

/** URL ที่โค้ดใช้จริง เช่น publicUrl('backgrounds/x.webp') */
const usedByCode = new Set(
  [...source.matchAll(/publicUrl\(\s*'([^']+)'\s*\)/g)].map((m) => `/${m[1].replace(/^\//, '')}`),
)

let failed = 0
for (const href of preloaded) {
  const relative = href.replace(/^\//, '')
  const onDisk = join(ROOT, 'public', relative)

  if (!existsSync(onDisk)) {
    failed += 1
    console.error(`✗ preload ชี้ไปที่ไฟล์ที่ไม่มีอยู่: ${href}`)
    console.error(`    หาที่: ${onDisk}`)
    continue
  }

  if (!usedByCode.has(href)) {
    failed += 1
    console.error(`✗ preload ${href} ไม่ตรงกับรูปไหนใน src/game/backgroundAssets.ts`)
    console.error(`    โค้ดใช้อยู่: ${[...usedByCode].join(', ') || '(ไม่พบ publicUrl เลย)'}`)
    console.error('    preload รูปที่ไม่มีใครใช้ = โหลดฟรีทิ้ง')
    continue
  }

  console.log(`✓ ${href} — มีไฟล์จริง และโค้ดใช้รูปนี้อยู่`)
}

if (failed > 0) {
  console.error('')
  console.error('ดูคอมเมนต์เหนือ <link rel="preload"> ใน index.html ว่าบรรทัดนั้นมีไว้ทำไม')
  process.exit(1)
}

/**
 * เช็คว่า CSP ใน index.html ยังเป็นนโยบายที่เราตั้งใจ ไม่ใช่สตริงที่ค่อย ๆ ผ่อนลงโดยไม่มีใครเห็น
 *
 *   node tools/check-csp.mjs
 *   node tools/check-csp.mjs --selftest
 *
 * ทำไมต้องมี
 *
 * CSP ของโปรเจกต์นี้เป็นสตริงเดียวใน index.html ที่ไม่มี compiler ตัวไหนอ่าน ไม่มี type
 * ไม่มีเทสต์ — เพื่อนบ้านที่ห่างไปสองบรรทัดคือ `<link rel="preload">` ซึ่งมี
 * tools/check-lcp-preload.mjs เฝ้าอยู่แล้วตั้งแต่ 2026-08-16 ส่วน CSP ไม่มีอะไรเลย
 * (gold-standard audit 2026-08-19, rank 13)
 *
 * การผ่อน CSP **ไม่ทำให้อะไรพัง** — หน้าเว็บยังขึ้นปกติ เทสต์ยังเขียว build ยังผ่าน สิ่งที่หายไป
 * คือการป้องกัน และมันหายเงียบสนิท เหมือนกับ preload ที่ชี้ผิดไฟล์ ต่างกันตรงที่อันนี้เป็นเรื่อง
 * ความปลอดภัย
 *
 * สี่อย่างที่เช็ค
 *
 *   1. directive ที่ประกาศไว้ต้องอยู่ครบ — ลบตัวไหนออกต้องล้ม ไม่ใช่ผ่านเงียบ
 *   2. script-src ห้ามมี 'unsafe-inline' หรือ 'unsafe-eval'
 *      (style-src มี 'unsafe-inline' อยู่จริงและตั้งใจ — CSS-in-JS ของ React ใส่ style ตรง ๆ
 *      ที่ element ตัวเลือกที่ถูกกว่าคือ nonce ซึ่ง static host ออกให้ไม่ได้)
 *   3. ทุก host ต้องเป็น https:// หรือ wss:// — http:// ธรรมดาคือช่องให้ดักกลางทาง
 *   4. **ห้ามมี directive ที่ meta tag บังคับไม่ได้** — frame-ancestors, report-uri, sandbox
 *      MDN ระบุว่าสามตัวนี้ถูกเพิกเฉยเมื่อส่งผ่าน <meta> และ
 *      .agents/rules/gold-standard-baseline.md เขียนไว้ตรง ๆ ว่า "don't try to fake
 *      clickjacking protection this way" ข้อนี้คือครึ่งที่เป็นกลไกของประโยคนั้น — การมีอยู่ของ
 *      มันแย่กว่าการไม่มี เพราะอ่านแล้วเข้าใจว่าป้องกันอยู่ทั้งที่ไม่
 *      (form-action ใช้ได้ ยืนยันกับ MDN 2026-08-19: หน้าของ directive นั้นมีตัวอย่าง meta tag
 *      ของตัวเอง จึงอยู่ในรายการที่ต้องมี ไม่ใช่รายการที่ห้ามมี)
 *
 * เพดานของเช็คนี้: มันตรวจ **รูป** ของนโยบาย ไม่ได้ตรวจว่านโยบายนั้นพอสำหรับภัยจริงไหม
 * host ที่เพิ่มเข้ามาใหม่ใน connect-src จะผ่านฉลุยถ้าเป็น https — การตัดสินว่าควรเชื่อ host นั้น
 * ไหมเป็นงานของคน
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** directive ที่ต้องมี — ลบออกจาก index.html แล้วเช็คนี้ต้องล้ม */
const REQUIRED = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'connect-src',
  'frame-src',
  'object-src',
  'base-uri',
  'form-action',
]

/** meta tag บังคับไม่ได้ — มีไว้ก็หลอกตัวเอง */
const INERT_IN_META = ['frame-ancestors', 'report-uri', 'sandbox']

export const parseCsp = (html) => {
  const tag = /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/i.exec(html)
  if (!tag) return null
  const content = /content="([^"]*)"/i.exec(tag[0])
  if (!content) return null

  const directives = new Map()
  for (const part of content[1].split(';')) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (name) directives.set(name.toLowerCase(), values)
  }
  return directives
}

export const checkCsp = (html) => {
  const directives = parseCsp(html)
  if (!directives)
    return ['ไม่พบ <meta http-equiv="Content-Security-Policy"> ที่มี content ใน index.html']

  const problems = []

  const missing = REQUIRED.filter((name) => !directives.has(name))
  if (missing.length > 0) {
    problems.push(`directive หายไป: ${missing.join(', ')}`)
  }

  const inert = INERT_IN_META.filter((name) => directives.has(name))
  if (inert.length > 0) {
    problems.push(
      `directive ที่ meta tag บังคับไม่ได้ แต่ถูกประกาศไว้: ${inert.join(', ')}`,
      '    เบราว์เซอร์เพิกเฉยทั้งตัว การมีอยู่จึงหลอกคนอ่านว่าป้องกันอยู่ — ต้องใช้ HTTP header จริงเท่านั้น',
    )
  }

  const scriptSrc = directives.get('script-src') ?? []
  for (const unsafe of ["'unsafe-inline'", "'unsafe-eval'"]) {
    if (scriptSrc.includes(unsafe)) problems.push(`script-src มี ${unsafe}`)
  }

  for (const [name, values] of directives) {
    for (const value of values) {
      if (/^http:\/\//i.test(value) || /^ws:\/\//i.test(value)) {
        problems.push(`${name} มี host ที่ไม่เข้ารหัส: ${value}`)
      }
    }
  }

  return problems
}

// --- selftest — เช็คที่ผ่านแบบว่างเปล่าได้คะแนนเท่ากับเช็คที่ทำงาน ---

const OK = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://x.test wss://x.test; frame-src https://x.test; object-src 'none'; base-uri 'none'; form-action 'self';" />`

const selftest = () => {
  const cases = [
    ['ไม่มี meta tag เลย', () => checkCsp('<html></html>')],
    [
      'directive หาย',
      () => checkCsp(OK.replace("form-action 'self'; ", '').replace("form-action 'self';", '')),
    ],
    [
      'frame-ancestors ที่ meta บังคับไม่ได้',
      () => checkCsp(OK.replace('object-src', "frame-ancestors 'none'; object-src")),
    ],
    [
      'report-uri ที่ meta บังคับไม่ได้',
      () => checkCsp(OK.replace('object-src', 'report-uri /r; object-src')),
    ],
    [
      "script-src มี 'unsafe-inline'",
      () => checkCsp(OK.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")),
    ],
    [
      "script-src มี 'unsafe-eval'",
      () => checkCsp(OK.replace("script-src 'self'", "script-src 'self' 'unsafe-eval'")),
    ],
    ['host เป็น http://', () => checkCsp(OK.replace('https://x.test', 'http://x.test'))],
    /*
      OK มี style-src 'unsafe-inline' อยู่ในตัว เคสนี้จึงยืนยันสองอย่างพร้อมกัน: นโยบายที่ถูกต้อง
      ต้องเงียบ และ 'unsafe-inline' ที่ style-src ต้องไม่ถูกฟ้อง (มันตั้งใจ ต่างจากที่ script-src)
      เคยแยกเป็นสองเคยที่เนื้อในเหมือนกันคำต่อคำ — เคสที่สองไม่ได้พิสูจน์อะไรเพิ่ม
    */
    [
      'นโยบายที่ถูกต้องต้องเงียบ (รวม style-src ที่ตั้งใจผ่อน)',
      () => (checkCsp(OK).length === 0 ? ['ok'] : []),
    ],
  ]

  let failed = 0
  for (const [label, run] of cases) {
    const fired = run().length > 0
    console.log(`${fired ? '✓' : '✗'} ${label}`)
    if (!fired) failed += 1
  }

  if (failed > 0) {
    console.error(`\n${failed} เช็คไม่ยิงกับ input ที่ต้องพัง`)
    process.exit(1)
  }
  console.log('\nทุกเช็คยิงจริงกับ input ที่ต้องพัง')
}

if (process.argv.includes('--selftest')) {
  selftest()
} else {
  const problems = checkCsp(readFileSync(join(process.cwd(), 'index.html'), 'utf8'))

  if (problems.length === 0) {
    const directives = parseCsp(readFileSync(join(process.cwd(), 'index.html'), 'utf8'))
    console.log(`✓ CSP ครบตามที่ประกาศไว้ — ${directives.size} directive`)
  } else {
    console.error('✗ CSP ใน index.html ผ่อนลงจากที่ตั้งใจไว้')
    for (const line of problems) console.error(`  ${line}`)
    console.error('')
    console.error(
      'ดูคอมเมนต์เหนือ <meta http-equiv="Content-Security-Policy"> ใน index.html ว่าแต่ละ directive มีไว้ทำไม',
    )
    process.exit(1)
  }
}

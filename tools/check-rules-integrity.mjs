/**
 * เช็คความสอดคล้องเชิงกลของ rules estate — ห้าอย่างที่ `.agents/rules/rules-freshness-check.md`
 * สั่งไว้เอง แล้วไม่มีอะไรบังคับ
 *
 *   node tools/check-rules-integrity.mjs
 *   node tools/check-rules-integrity.mjs --selftest
 *
 * ทำไมต้องมีไฟล์นี้
 *
 * `rules-freshness-check.md` §"Three integrity requirements the date check cannot see"
 * (2026-08-16) เขียนข้อกำหนดสามข้อไว้ครบ แล้วปิดท้ายด้วย **Enforcement: ADVISORY** โดยอ้างว่า
 * "the mechanical half is a stamp-well-formedness pass, which `node scripts/consistency.mjs`
 * already describes as its job" — สคริปต์ตัวนั้นเป็นของ CoalMine ไม่ใช่ของรีโปนี้ และโฟลเดอร์
 * `scripts/` ที่นี่ว่างเปล่า **ครึ่งที่เป็นกลไกจึงไม่เคยมีอยู่จริง**
 *
 * ผลคือกฎที่วินิจฉัยตัวเองไว้แม่นแล้วไม่มีอะไรเกิดขึ้น: 2026-08-19 ตรวจซ้ำพบว่าข้อบกพร่องทุกข้อ
 * ที่กฎข้อนั้นระบุชื่อไว้เป๊ะ ยังอยู่ที่เดิม ครบสามวัน สามสิบเก้า commit
 *
 * entry gate ของ `rules-freshness-check.md` เองบอกว่า "a rule an agent must volunteer to obey
 * is not a rule; it is a wish" และให้เรียงลำดับทางเลือกว่า **delete the problem · a check that
 * fails · a one-line rule · แล้วค่อยเป็นไฟล์กฎ** ไฟล์นี้คือขั้น "a check that fails" ของกฎที่มี
 * อยู่แล้ว ไม่ใช่กฎใหม่
 *
 * ห้าข้อที่เช็ค — ทุกข้อ drift มาแล้วจริง ไม่ใช่ข้อที่นึกออกว่าเป็นไปได้
 *
 *   1. RULES_VERSION ของ AGENTS.md ตรงกับ "last synced" ของ MEMORY.md
 *      เจอจริงสองครั้ง: 37/38 (2026-08-13, item 218) และ 39/38 (2026-08-19, ค้าง 3 วัน)
 *      ไม่ตรง = ตาม AGENTS.md rule 1 ทุก session ต้องอ่าน AGENTS.md + .agents/rules/** เต็ม
 *      ก่อนทำอะไร นั่นคือภาษีที่เก็บจากทุก session ถัดไป ไม่ใช่ session ที่ทำพลาด
 *
 *   2. project law ทุกไฟล์มีบรรทัด **Enforcement** ประกาศว่าอะไรบังคับมัน หรือคำว่า ADVISORY
 *      rules-freshness-check.md §3 สั่งไว้ วัด 2026-08-16 ได้ 7/15 ไม่มี วัดซ้ำ 2026-08-19
 *      ได้ 9/16 ไม่มี — แย่ลง ไม่ใช่ดีขึ้น
 *
 *   3. project law ทุกไฟล์มี coalmine stamp ที่ parse วันที่ได้
 *      rules-freshness-check.md §2 สั่งไว้ stamp ที่วันที่คำนวณไม่ได้ = ระบบ freshness
 *      มองไม่เห็นกฎของตัวเอง
 *
 *   4. เลขกฎที่เอกสารอื่นอ้าง ตรงกับเลขที่ AGENTS.md ให้จริง
 *      เจอจริง: MEMORY.md เขียน "rule 24, `mutation-verified-fix-law.md`" ขณะที่ AGENTS.md
 *      ให้เลข 23 มาตั้งแต่ commit แรกที่กฎนั้นลง (58e1403) — 24 เป็น epitaph ของกฎที่ถูก
 *      retired ไปแล้ว การอ้างผิดพากันไปแก้ฝั่งที่ถูก
 *      กฎหนึ่งไฟล์ถูกอ้างได้หลายเลข (rule 15 กับ 25 อ้าง master-blueprint-law.md ทั้งคู่)
 *      เช็คนี้จึงยอมรับเลขใดก็ได้ที่ AGENTS.md อ้างไฟล์นั้นจริง
 *
 *   5. CHANGELOG: ทุกหัวข้อเวอร์ชันมี link definition และ [Unreleased] เทียบกับเวอร์ชันปัจจุบัน
 *      Keep a Changelog 2.0.0 นับ link block เป็นส่วนหนึ่งของรูปแบบ วัด 2026-08-19: หัวข้อ 37
 *      ตัว มี link 7 ตัว **ตาย 30** และ [Unreleased] ยังเทียบ v0.20.0 ขณะ package.json เป็น
 *      0.21.0 — ข้ามมาสิบหกรุ่นติด ไม่มีใครเห็นเพราะ Markdown ลิงก์ที่ไม่มีปลายทางไม่ error
 *
 * ขอบเขต
 *
 * `.agents/rules/ecc/**` ยกเว้นด้วยที่มา — vendor มาจาก affaan-m/ECC เราไม่ใช่คนเขียน
 * (rules-freshness-check.md §3 ระบุข้อยกเว้นนี้ไว้เอง)
 *
 * `MEMORY/archive/**` ไม่อยู่ในเช็คข้อ 4 — archive คือบันทึกประวัติศาสตร์ สิ่งที่เขียนไว้ตอนนั้น
 * คือสิ่งที่เชื่อกันตอนนั้น การไปแก้ย้อนหลังทำลายคุณค่าของการเป็นบันทึก ที่ต้องถูกคือเอกสารที่
 * ยังบังคับใช้อยู่
 *
 * ข้อยกเว้นนั้นถูกวัดก่อนตัดสิน ไม่ได้อนุมานเอา: รันเช็คข้อ 4 ทับ archive ทั้งชุด 2026-08-19 ได้
 * สองจุด จริงหนึ่ง (item 217 อ้าง rule 24 — แก้ด้วยมือแล้ว) และ **เท็จหนึ่ง** ซึ่งเปิดข้อจำกัดที่
 * ควรรู้ไว้: `AGENTS.md` มีรายการเลขสองชุด — §0 "Before anything else" กับ ⚖️ MANDATORY LAW —
 * ที่ต่างเริ่มนับจาก 1 `ruleNumbersByLaw` รวมทั้งสองชุดเป็นแผนที่เดียว กฎหนึ่งไฟล์จึงถือได้ทั้ง
 * เลขของ §0 และของ ⚖️ (เช่น rules-freshness-check.md ได้ทั้ง 1 และ 27 ซึ่งบังเอิญถูกทั้งคู่)
 * ผลคือเช็คนี้ผ่อนปรนไปทางไม่ฟ้อง ไม่ใช่ทางฟ้องเกิน — เลขผิดที่บังเอิญตรงกับเลขในอีกชุดหนึ่งจะ
 * รอดไปได้ ยอมแลกเพราะทางกลับกันคือฟ้องผิดใส่การอ้างอิงที่ถูกต้อง ซึ่งแพงกว่า
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const RULES_DIR = join(ROOT, '.agents', 'rules')

const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8')

/** project law = .agents/rules/*.md ชั้นเดียว — ecc/ เป็น vendor ไม่นับ */
const projectLaws = () =>
  readdirSync(RULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .toSorted()

/**
 * แผนที่ชื่อไฟล์กฎ -> เลขกฎทุกตัวใน AGENTS.md ที่อ้างไฟล์นั้น
 * รูปที่จับ: บรรทัดขึ้นต้นด้วย "NN. " แล้วมี `.agents/rules/xxx.md` อยู่ในบรรทัดเดียวกัน
 */
const ruleNumbersByLaw = (agentsMd) => {
  const map = new Map()
  for (const line of agentsMd.split(/\r?\n/)) {
    const numbered = /^(\d+)\.\s/.exec(line)
    if (!numbered) continue
    const number = Number(numbered[1])
    for (const cited of line.matchAll(/\.agents\/rules\/([A-Za-z0-9._-]+\.md)/g)) {
      const name = cited[1]
      if (!map.has(name)) map.set(name, new Set())
      map.get(name).add(number)
    }
  }
  return map
}

// --- the five checks -------------------------------------------------------
// แต่ละตัวคืน array ของข้อความที่พัง (ว่าง = ผ่าน) เพื่อให้ --selftest ป้อน input ปลอมได้

export const checkRulesVersionPair = (agentsMd, memoryMd) => {
  const declared = /RULES_VERSION:\s*(\d+)/.exec(agentsMd)
  const synced = /RULES_VERSION last synced:\s*(\d+)/.exec(memoryMd)

  if (!declared) return ['AGENTS.md ไม่มีบรรทัด RULES_VERSION: <เลข>']
  if (!synced) return ['MEMORY.md ไม่มีบรรทัด RULES_VERSION last synced: <เลข>']
  if (declared[1] === synced[1]) return []

  return [
    `RULES_VERSION ไม่ตรง — AGENTS.md = ${declared[1]}, MEMORY.md last synced = ${synced[1]}`,
    '    ตาม AGENTS.md rule 1 สภาพนี้สั่งให้ทุก session อ่าน AGENTS.md + .agents/rules/** เต็มก่อนทำอะไร',
    '    ถ้ากฎเปลี่ยนจริง: อ่านแล้วอัปเดตบรรทัดใน MEMORY.md พร้อม identity stamp',
    '    ถ้าเลขถูกบัมพ์โดยไม่ได้เปลี่ยนกฎ: แก้เลขใน AGENTS.md กลับ',
  ]
}

export const checkEnforcementDeclared = (laws) => {
  const missing = laws
    .filter(({ text }) => !/\*\*Enforcement\*\*/.test(text))
    .map(({ name }) => name)
  if (missing.length === 0) return []

  return [
    `${missing.length} project law ไม่ประกาศว่าอะไรบังคับมัน (rules-freshness-check.md §3)`,
    ...missing.map((name) => `    .agents/rules/${name}`),
    '    เพิ่มบรรทัด "**Enforcement**: <คำสั่งที่ล้มเมื่อผิด>" หรือ "**Enforcement**: ADVISORY"',
    '    ประโยชน์ของ ADVISORY คือคนอ่านแยกกฎที่มีเครื่องบังคับออกจากกฎที่ไม่มีได้ทันที',
  ]
}

export const checkStampsParse = (laws) => {
  const problems = []
  for (const { name, text } of laws) {
    const stamp = /coalmine:\s*verified\s*(\S+)/.exec(text)
    if (!stamp) {
      problems.push(`    .agents/rules/${name} — ไม่มี coalmine stamp`)
      continue
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stamp[1])) {
      problems.push(`    .agents/rules/${name} — วันที่ "${stamp[1]}" คำนวณ deadline ไม่ได้`)
    }
  }
  if (problems.length === 0) return []

  return [
    `${problems.length} project law มี stamp ที่ระบบ freshness อ่านไม่ได้ (rules-freshness-check.md §2)`,
    ...problems,
  ]
}

/**
 * หน้าต่างรอบชื่อไฟล์ที่ถือว่า "rule N" กำลังตั้งชื่อให้ไฟล์นั้น ไม่ใช่แค่อยู่บรรทัดเดียวกัน
 *
 * กว้างกว่านี้แล้วพัง — วัดจริง 2026-08-19: ทั้งบรรทัดจับ false positive สามจุด ที่ล้วนเป็น
 * การอ้างอิงข้ามกฎที่ถูกต้อง เช่น AGENTS.md rule 10 ที่ในเนื้อชี้ไปหา rule 12, และ MEMORY.md
 * ที่พูดถึง rule 21 ซึ่ง retired ไปแล้ว โดยบังเอิญอยู่บรรทัดเดียวกับชื่อไฟล์กฎอื่น
 * รูปที่ drift จริงคือ apposition — เลขกับชื่อไฟล์ติดกัน คั่นด้วยวรรคตอนเท่านั้น
 */
const CITATION_WINDOW = 30

export const checkRuleNumberCitations = (sources, numbersByLaw) => {
  const problems = []
  for (const { path, text } of sources) {
    text.split(/\r?\n/).forEach((line, index) => {
      for (const [name, valid] of numbersByLaw) {
        let at = line.indexOf(name)
        while (at !== -1) {
          const window =
            line.slice(Math.max(0, at - CITATION_WINDOW), at) +
            line.slice(at + name.length, at + name.length + CITATION_WINDOW)
          const cited = /\brule (\d+)\b/i.exec(window)
          if (cited && !valid.has(Number(cited[1]))) {
            problems.push(
              `    ${path}:${index + 1} — อ้าง "rule ${cited[1]}" ติดกับ ${name}, AGENTS.md ให้เลข ${[...valid].join('/')}`,
            )
          }
          at = line.indexOf(name, at + 1)
        }
      }
    })
  }
  if (problems.length === 0) return []

  return [
    `${problems.length} จุดอ้างเลขกฎไม่ตรงกับ AGENTS.md`,
    ...problems,
    '    AGENTS.md เป็นฝั่งที่ถูก — เลขกฎที่ retired ไปแล้วไม่ถูกนำกลับมาใช้ซ้ำ',
  ]
}

/**
 * เวอร์ชันที่ CHANGELOG ประกาศว่าออกแล้ว แต่ไม่เคยมี git tag — วัด 2026-08-19 (`git tag -l "v*"`
 * ให้ 32 tag ต่อ 37 หัวข้อ) เวอร์ชันพวกนี้จึงเขียน compare link ให้ไม่ได้อย่างซื่อสัตย์: ปลายทาง
 * ไม่มีอยู่ ลิงก์จะขึ้น 404 เหมือนที่ `[0.2.0]` กับ `[0.3.0]` เดิมเป็นมาตลอด
 *
 * ไม่ยิง `git tag` จากที่นี่โดยตั้งใจ — `actions/checkout` ตั้ง `fetch-depth: 1` เป็นค่าเริ่มต้น
 * และไม่ดึง tag มาด้วย เช็คที่ถาม git จึงจะเห็น 0 tag บน CI แล้วสรุปผิดทั้งกระดาน
 *
 * รายการนี้รอตัวไม่ได้ทั้งสามทาง เหมือน POST_SPLIT_EDITS ใน tools/verify-memory-archive.mjs:
 * หัวข้อที่ไม่มีลิงก์และไม่อยู่ในรายการ = พัง · เวอร์ชันในรายการที่ได้ลิงก์แล้ว = พังฐานะรายการ
 * เก่า (แปลว่ามัน tag แล้ว) · เวอร์ชันในรายการที่ไม่มีหัวข้อจริง = พังฐานะชี้ไปที่ไม่มีอยู่
 *
 * ปิดรายการนี้ได้ด้วยการตัดสินใจของเจ้าของเท่านั้น — tag ย้อนหลังบน commit เก่า หรือรับสภาพว่า
 * เจ็ดรุ่นนี้ไม่มี tag ไม่ใช่สิ่งที่ agent ตัดสินเอง
 */
const KNOWN_UNTAGGED = ['0.2.0', '0.7.2', '0.7.3', '0.8.3', '0.10.0', '0.11.0', '0.11.1']

export const checkChangelogLinks = (changelog, packageVersion, untagged = KNOWN_UNTAGGED) => {
  const headings = [...changelog.matchAll(/^## \[([^\]]+)\]/gm)].map((match) => match[1])
  const defined = new Set(
    [...changelog.matchAll(/^\[([^\]]+)\]:\s*http/gm)].map((match) => match[1]),
  )
  const exempt = new Set(untagged)
  const problems = []

  const dangling = headings.filter((version) => !defined.has(version) && !exempt.has(version))
  if (dangling.length > 0) {
    problems.push(
      `${dangling.length} หัวข้อเวอร์ชันใน CHANGELOG.md ไม่มี link definition (Keep a Changelog 2.0.0)`,
      `    ${dangling.join(', ')}`,
    )
  }

  const nowLinked = untagged.filter((version) => defined.has(version))
  if (nowLinked.length > 0) {
    problems.push(
      `${nowLinked.length} เวอร์ชันใน KNOWN_UNTAGGED มีลิงก์แล้ว — แปลว่ามันถูก tag ไปแล้ว`,
      `    ${nowLinked.join(', ')} — เอาออกจากรายการใน tools/check-rules-integrity.mjs`,
    )
  }

  const unreachable = untagged.filter((version) => !headings.includes(version))
  if (unreachable.length > 0) {
    problems.push(
      `${unreachable.length} เวอร์ชันใน KNOWN_UNTAGGED ไม่มีหัวข้อใน CHANGELOG.md เลย`,
      `    ${unreachable.join(', ')} — พิมพ์เลขผิด หรือหัวข้อถูกลบไปแล้ว`,
    )
  }

  const unreleased = /^\[Unreleased\]:\s*\S*compare\/v([^.\s]+(?:\.[^.\s]+)*)\.\.\./m.exec(
    changelog,
  )
  if (unreleased && unreleased[1] !== packageVersion) {
    problems.push(
      `[Unreleased] เทียบกับ v${unreleased[1]} แต่ package.json เป็น ${packageVersion}`,
      '    ทุกครั้งที่บัมพ์เวอร์ชัน: เพิ่ม link ของเวอร์ชันใหม่ แล้วเลื่อน [Unreleased] ไปเทียบกับมัน',
    )
  }

  return problems
}

// --- selftest --------------------------------------------------------------
// ตอบข้อค้นพบ "the gates are themselves untested" ตรง ๆ: gate ที่ผ่านแบบว่างเปล่าได้คะแนน
// เท่ากับ gate ที่ทำงาน ป้อน input ที่ต้องพังให้ทุกเช็ค แล้วยืนยันว่ามันพังจริง

const selftest = () => {
  const cases = [
    [
      'RULES_VERSION mismatch',
      () => checkRulesVersionPair('RULES_VERSION: 39', 'RULES_VERSION last synced: 38'),
    ],
    [
      'RULES_VERSION match ต้องเงียบ',
      () =>
        checkRulesVersionPair('RULES_VERSION: 39', 'RULES_VERSION last synced: 39').length === 0
          ? ['ok']
          : [],
    ],
    [
      'enforcement หาย',
      () => checkEnforcementDeclared([{ name: 'x.md', text: '# no declaration' }]),
    ],
    [
      'stamp วันที่เพี้ยน',
      () => checkStampsParse([{ name: 'x.md', text: '<!-- coalmine: verified 2026-08-07b -->' }]),
    ],
    ['stamp หายทั้งอัน', () => checkStampsParse([{ name: 'x.md', text: '# nothing' }])],
    [
      'เลขกฎอ้างผิด',
      () =>
        checkRuleNumberCitations(
          [{ path: 'MEMORY.md', text: 'rule 24, `mutation-verified-fix-law.md`: ...' }],
          new Map([['mutation-verified-fix-law.md', new Set([23])]]),
        ),
    ],
    [
      'เลขกฎอ้างถูกต้องเงียบ',
      () =>
        checkRuleNumberCitations(
          [{ path: 'MEMORY.md', text: 'rule 23, `mutation-verified-fix-law.md`: ...' }],
          new Map([['mutation-verified-fix-law.md', new Set([23])]]),
        ).length === 0
          ? ['ok']
          : [],
    ],
    [
      'อ้างข้ามกฎในบรรทัดเดียวกันต้องเงียบ',
      () =>
        checkRuleNumberCitations(
          [
            {
              path: 'AGENTS.md',
              // รูปจริงจาก AGENTS.md rule 10 — กฎหนึ่งพูดถึงเลขของอีกกฎหนึ่งกลางประโยคยาว
              text: '10. **Gold-standard baseline** (`.agents/rules/gold-standard-baseline.md`): from the AUDIT. CSP, LICENSE and hooks are closed; amended so a test pinning a real bug is proven-good, so write it (rule 12).',
            },
          ],
          new Map([['gold-standard-baseline.md', new Set([10])]]),
        ).length === 0
          ? ['ok']
          : [],
    ],
    [
      'changelog link ตาย',
      () => checkChangelogLinks('## [0.9.0]\n\n[0.1.0]: http://x', '0.9.0', []),
    ],
    [
      'unreleased ชี้เวอร์ชันเก่า',
      () => checkChangelogLinks('[Unreleased]: http://x/compare/v0.20.0...HEAD', '0.21.0', []),
    ],
    [
      'เวอร์ชันที่ยกเว้นไว้ ถ้ามีลิงก์แล้วต้องพัง',
      () => checkChangelogLinks('## [0.2.0]\n\n[0.2.0]: http://x', '0.2.0', ['0.2.0']),
    ],
    [
      'เวอร์ชันที่ยกเว้นไว้ ถ้าไม่มีหัวข้อจริงต้องพัง',
      () => checkChangelogLinks('## [0.9.0]\n\n[0.9.0]: http://x', '0.9.0', ['0.2.0']),
    ],
    [
      'เวอร์ชันที่ยกเว้นไว้อย่างถูกต้องต้องเงียบ',
      () => (checkChangelogLinks('## [0.2.0]\n', '0.2.0', ['0.2.0']).length === 0 ? ['ok'] : []),
    ],
  ]

  let failed = 0
  for (const [label, run] of cases) {
    const fired = run().length > 0
    console.log(`${fired ? '✓' : '✗'} ${label}`)
    if (!fired) failed += 1
  }

  if (failed > 0) {
    console.error(`\n${failed} เช็คไม่ยิงกับ input ที่ต้องพัง — เช็คนั้นผ่านแบบว่างเปล่า`)
    process.exit(1)
  }
  console.log('\nทุกเช็คยิงจริงกับ input ที่ต้องพัง')
}

// --- main ------------------------------------------------------------------

if (process.argv.includes('--selftest')) {
  selftest()
} else {
  const agentsMd = read('AGENTS.md')
  const memoryMd = read('MEMORY.md')
  const laws = projectLaws().map((name) => ({
    name,
    text: readFileSync(join(RULES_DIR, name), 'utf8'),
  }))
  const numbersByLaw = ruleNumbersByLaw(agentsMd)

  const citationSources = [
    { path: 'AGENTS.md', text: agentsMd },
    { path: 'MEMORY.md', text: memoryMd },
    ...laws.map(({ name, text }) => ({ path: `.agents/rules/${name}`, text })),
  ]

  const results = [
    ['RULES_VERSION ตรงกันสองฝั่ง', checkRulesVersionPair(agentsMd, memoryMd)],
    ['ทุกกฎประกาศเครื่องบังคับ', checkEnforcementDeclared(laws)],
    ['ทุกกฎมี stamp ที่อ่านได้', checkStampsParse(laws)],
    ['เลขกฎที่อ้างตรงกับ AGENTS.md', checkRuleNumberCitations(citationSources, numbersByLaw)],
    [
      'CHANGELOG link ครบ',
      checkChangelogLinks(read('CHANGELOG.md'), JSON.parse(read('package.json')).version),
    ],
  ]

  let failed = 0
  for (const [label, problems] of results) {
    if (problems.length === 0) {
      console.log(`✓ ${label}`)
      continue
    }
    failed += 1
    console.error(`✗ ${label}`)
    for (const line of problems) console.error(`  ${line}`)
  }

  console.log(`\nกฎที่ตรวจ: ${laws.length} ไฟล์ (.agents/rules/ecc/** ยกเว้นด้วยที่มา)`)

  if (failed > 0) {
    console.error('')
    console.error(
      'ทั้งห้าข้อนี้ .agents/rules/rules-freshness-check.md สั่งไว้เอง ไฟล์นี้คือครึ่งที่เป็นกลไกของมัน',
    )
    process.exit(1)
  }
}

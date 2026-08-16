import { describe, expect, it } from 'vitest'
import { assert, property, string, stringMatching } from 'fast-check'
import { resolveBasePath } from './vite.config.ts'

/*
  ค่าตายตัวในไฟล์พี่น้อง (vite.config.test.ts) ตรวจ "LegendofSoulTH/LegendOfSoulTH" ตรง ๆ
  ไฟล์นี้ตรวจว่า **ไม่ว่าชื่อ owner/repo จะเป็นอะไร** (fork ในอนาคตที่ตั้งชื่อแปลก ๆ ก็ตาม)
  ผลลัพธ์ต้องยังเป็น path ที่ Vite ใช้ได้เสมอ — กัน regression แบบ "หน้าขาวสนิท" ที่คอมเมนต์
  หัวไฟล์ vite.config.ts พูดถึง กลับมาในรูปแบบที่ไม่มีใครคิดเทสต์เจาะจงไว้ก่อน
*/

// ตัวอักษรที่ใช้ได้จริงใน GitHub owner/repo name (ตัดอักขระพิเศษที่ทำให้ regex ใน resolveBasePath งง)
const segment = stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,38}$/).filter((s) => s.length > 0)

describe('resolveBasePath — คุณสมบัติที่ต้องเป็นจริงเสมอ', () => {
  it('GITHUB_REPOSITORY รูปแบบ owner/repo ใด ๆ ให้ base ที่ขึ้นต้นและลงท้ายด้วย / เสมอ', () => {
    assert(
      property(segment, segment, (owner, repo) => {
        const base = resolveBasePath({ GITHUB_REPOSITORY: `${owner}/${repo}` })
        expect(base.startsWith('/')).toBe(true)
        expect(base.endsWith('/')).toBe(true)
        expect(base).toBe(`/${repo}/`)
      }),
    )
  })

  it('BASE_PATH ที่ตั้งเองชนะเสมอ ไม่ว่า GITHUB_REPOSITORY จะมีค่าไหน', () => {
    /*
      fast-check เจอ edge case จริงตอนเขียนเทสต์นี้ครั้งแรก: BASE_PATH='' (string ว่าง)

      โค้ดใช้ `if (env.BASE_PATH) return ...` ซึ่ง string ว่างเป็น falsy ใน JS จึงตกไปใช้
      GITHUB_REPOSITORY แทน — เป็นพฤติกรรมที่ตั้งใจ (string ว่าง = เหมือนไม่ได้ตั้งค่า
      ตรงกับที่ shell/CI มักส่ง env ว่างมาแทนที่จะไม่ส่งเลย) ไม่ใช่บั๊ก จึงตัด string ว่าง
      ออกจากช่วงที่ทดสอบตรงนี้ ไม่ใช่แก้โค้ดให้ตามเทสต์
    */
    assert(
      property(string({ minLength: 1 }), segment, segment, (basePath, owner, repo) => {
        const base = resolveBasePath({
          BASE_PATH: basePath,
          GITHUB_REPOSITORY: `${owner}/${repo}`,
        })
        expect(base).toBe(basePath)
      }),
    )
  })

  it('BASE_PATH เป็น string ว่างเท่ากับไม่ได้ตั้งค่า — ตกไปใช้ GITHUB_REPOSITORY แทน', () => {
    assert(
      property(segment, segment, (owner, repo) => {
        const base = resolveBasePath({ BASE_PATH: '', GITHUB_REPOSITORY: `${owner}/${repo}` })
        expect(base).toBe(`/${repo}/`)
      }),
    )
  })

  it('ไม่มีตัวแปรเลย (build นอก CI) คืนค่าสำรองเสมอ ไม่ throw', () => {
    expect(() => resolveBasePath({})).not.toThrow()
    expect(resolveBasePath({})).toBe('/LegendOfSoulTH/')
  })
})

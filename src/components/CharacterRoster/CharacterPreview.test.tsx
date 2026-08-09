/// <reference types="node" />
// ไฟล์นี้เดียวที่ต้องใช้ node:fs (อ่านซอร์ส CSS ตรง ๆ ดูเทสต์ล็อกสเกลด้านล่าง) — reference
// แบบนี้ดึง type ของ node มาเฉพาะไฟล์นี้ ไม่ไปเปลี่ยน types ของทั้ง src/ ใน tsconfig.app.json
// (@types/node มีอยู่แล้วใน node_modules สำหรับ vite.config.ts แต่ tsconfig.app.json ตั้งใจ
// จำกัด types ไว้แค่ vite/client เพราะนี่คือโค้ดฝั่ง browser)
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CharacterPreview } from './CharacterPreview'
import { ROSTER } from '../../game/characters'

/*
  ล็อกบั๊กจริงที่เจอวันที่แก้ไฟล์นี้ (2026-08-08):
  1. auto-rotate ต้องหยุดทันทีเมื่อผู้เล่นเริ่มลาก — เดิม useEffect ไม่มี autoRotating ใน
     deps จึงไม่ re-run ไป cleanup rAF loop เดิม (หมุนทับกับที่ผู้เล่นลากเอง, ขัด WCAG 2.2.2)
  2. window.matchMedia ไม่มีในบางสภาพแวดล้อม (jsdom, เบราว์เซอร์เก่า) — เรียกตรง ๆ ทำ mount พังทั้งกล่อง
*/

function mockMatchMedia(reducedMotion: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reducedMotion,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const character = ROSTER[0]

describe('CharacterPreview', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  afterEach(() => {
    // @ts-expect-error -- คืนเป็น undefined เหมือนสภาพ jsdom ปกติ ไม่ให้เทสต์อื่นเห็น mock ค้าง
    delete window.matchMedia
  })

  test('mount ได้ไม่พัง แม้ window.matchMedia ไม่มีอยู่จริง (จำลองสภาพ jsdom/เบราว์เซอร์เก่า)', () => {
    // @ts-expect-error -- จำลองสภาพแวดล้อมที่ไม่มี matchMedia เลย
    delete window.matchMedia

    expect(() => render(<CharacterPreview character={character} />)).not.toThrow()
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  test('prefers-reduced-motion เปิดอยู่ — ไม่หมุนอัตโนมัติเลย (มุมเริ่มต้นค้างที่ 0)', () => {
    mockMatchMedia(true)
    render(<CharacterPreview character={character} />)

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0')
  })

  test('ลากเริ่มต้น (pointerdown) ต้องหยุด auto-rotate ทันที ไม่ทับกับมุมที่ผู้เล่นลากเอง', () => {
    render(<CharacterPreview character={character} />)
    const slider = screen.getByRole('slider')

    slider.setPointerCapture = vi.fn()
    slider.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, bubbles: true }),
    )

    const angleAfterPointerDown = Number(slider.getAttribute('aria-valuenow'))

    // ปล่อยเวลาผ่านไปเท่ากับ AUTO_ROTATE_MS เต็ม ๆ — ถ้าบั๊กเดิมกลับมา มุมจะขยับต่อเองจน
    // ใกล้ 360 แม้ไม่มี pointermove เพิ่ม เพราะ rAF loop เดิมยังไม่ถูกยกเลิก
    return new Promise((resolve) => {
      window.setTimeout(() => {
        expect(Number(slider.getAttribute('aria-valuenow'))).toBe(angleAfterPointerDown)
        resolve(undefined)
      }, 400)
    })
  })

  /*
    ล็อกไว้ไม่ให้บั๊กเดิมย้อนกลับมา — เคยมี transform: scale(1.82) กับ scale(1.55) แยกกันคนละที่
    (desktop vs @media max-width:900px) แก้แล้วเหลือ scale(var(--sprite-zoom)) จุดเดียว
    (ดูคอมเมนต์ที่มาเต็ม ๆ ใน .tsx และ MEMORY.md item 121, 2026-08-08)

    เทสต์นี้อ่านซอร์ส CSS ตรง ๆ (ไม่ใช่ computed style) — จับได้ทันทีถ้ามีใครเพิ่ม
    transform: scale(ตัวเลข) กลับเข้ามาที่ไหนก็ตามในไฟล์นี้ ไม่ว่าจะเป็น media query ใหม่
    breakpoint ใหม่ หรือ selector อื่น ไม่ต้องรอให้มีคนสังเกตเห็นตอน review
  */
  test('CSS ต้องมี transform: scale() แค่จุดเดียว (ผ่าน --sprite-zoom) ห้ามมีเลขตายตัวแอบแฝงที่ไหนอีก', () => {
    const css = readFileSync('src/components/CharacterRoster/CharacterPreview.module.css', 'utf8')
    // [^()]|\([^()]*\) รองรับวงเล็บซ้อนชั้นเดียว (เช่น var(--x)) ไม่ตัดจบตั้งแต่ ) ตัวแรกข้างใน
    const scaleDeclarations = css.match(/transform:\s*scale\((?:[^()]|\([^()]*\))*\)/g) ?? []

    expect(scaleDeclarations).toEqual(['transform: scale(var(--sprite-zoom))'])
  })
})

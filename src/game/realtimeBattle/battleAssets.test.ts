import { describe, expect, it } from 'vitest'
import { collectCriticalTextureUrls, collectDeferredTextureUrls } from '../battleSpriteSequences'
import type { CharacterModelKind } from '../characters'
import { REALTIME_STAGES } from './stageConfig'

/**
 * ยืนยันว่าทุกภาพที่ห้องต่อสู้อ้างถึง "มีไฟล์อยู่จริง" ในโฟลเดอร์ที่ deploy
 *
 * ── ทำไมต้องมีเทสต์แบบนี้ ──────────────────────────────────
 * โปรเจกต์นี้โดนบั๊ก asset path มาแล้วสามรอบ (MEMORY.md ข้อ 12, 15 และรอบ sync กับ upstream
 * ที่ย้ายภาพทั้งหมดเป็น WebP) ทุกรอบเป็นชนิดเดียวกัน: โค้ดอ้างพาธที่ไม่มีไฟล์อยู่จริง แล้ว
 * **typecheck / lint / build ผ่านหมด** เพราะพาธเป็นแค่สตริง กว่าจะรู้ก็ตอนเปิดเกมแล้วจอโล่ง
 *
 * เทสต์นี้จับได้ตั้งแต่ `npm run test` ไม่ต้องรอเปิดเบราว์เซอร์
 * ถ้าแดง แปลว่ายังไม่ได้วางต้นฉบับใน assets/raw/ หรือยังไม่ได้รัน `npm run build:images`
 *
 * ใช้ `import.meta.glob` ของ Vite อ่านรายชื่อไฟล์ ไม่ใช้ `node:fs` เพราะ tsconfig.app.json
 * ตั้งใจไม่ให้ชนิดข้อมูลของ Node เข้ามาในโค้ดฝั่งแอป (`types: ["vite/client"]`)
 * ────────────────────────────────────────────────────────────
 */

const ALL_KINDS: CharacterModelKind[] = [
  'monkey-king',
  'pig-warrior',
  'pilgrim-monk',
  'spear-warrior',
]

/** รายชื่อไฟล์ภาพที่มีอยู่จริงใต้ public/ — glob ถูกคลี่ตอน build ไม่ได้อ่านดิสก์ตอนรัน */
const EXISTING_FILES = new Set(
  Object.keys(import.meta.glob('../../../public/**/*.webp', { eager: false })).map((path) =>
    path.replace(/^.*\/public\//, ''),
  ),
)

/** แปลง URL ที่ผ่าน publicUrl() แล้ว กลับเป็นพาธที่เทียบกับ public/ ได้ */
function toPublicRelative(url: string): string {
  const base = import.meta.env.BASE_URL
  return (url.startsWith(base) ? url.slice(base.length) : url).replace(/^\//, '')
}

describe('ภาพของห้องต่อสู้มีอยู่จริง', () => {
  const spriteUrls = [
    ...collectCriticalTextureUrls(ALL_KINDS),
    ...collectDeferredTextureUrls(ALL_KINDS),
  ]

  it('อ่านรายชื่อไฟล์จาก public/ ได้จริง (กันเทสต์ผ่านฟรีเพราะ glob ว่าง)', () => {
    expect(EXISTING_FILES.size).toBeGreaterThan(100)
  })

  it('มีเฟรมให้ตรวจจริง ไม่ใช่รายการว่าง', () => {
    expect(spriteUrls.length).toBeGreaterThan(100)
  })

  it('ทุกเฟรมใน battleSpriteSequences ชี้ไปยังไฟล์ที่มีอยู่', () => {
    const missing = spriteUrls.filter((url) => !EXISTING_FILES.has(toPublicRelative(url)))
    expect(missing).toEqual([])
  })

  it('ทุกเฟรมเป็น .webp ตาม pipeline ของโปรเจกต์', () => {
    expect(spriteUrls.filter((url) => !url.endsWith('.webp'))).toEqual([])
  })

  it('ภาพฉากหลังของทุกด่านมีอยู่จริง', () => {
    const missing = Object.values(REALTIME_STAGES)
      .map((stage) => stage.backgroundAsset)
      .filter((asset): asset is string => Boolean(asset))
      .filter((asset) => !EXISTING_FILES.has(toPublicRelative(asset)))

    expect(missing).toEqual([])
  })
})

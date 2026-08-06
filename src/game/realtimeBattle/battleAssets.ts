import { SRGBColorSpace, TextureLoader, type Texture } from 'three'
import { reportError } from '../../lib/errors/reportError'

/**
 * ตัวโหลด/แคชภาพของห้องต่อสู้
 *
 * ทำไมต้องโหลดล่วงหน้าเอง แทนที่จะใช้ useLoader ของ R3F:
 * สเปกข้อ 27 บังคับว่า "ห้ามให้เริ่ม Simulation ก่อน Asset สำคัญพร้อม" และถ้าโหลดล้มเหลว
 * ต้องมี Error UI ที่ระบุไฟล์ชัด ไม่ใช่จอดำ — useLoader โยน promise เข้า Suspense
 * ซึ่งจับ error ยากและไม่ให้เรารู้ว่าไฟล์ไหนพัง จึงโหลดเองแล้วค่อยเริ่ม runtime
 *
 * แคชอยู่ระดับโมดูลโดยตั้งใจ: ชุดภาพมีจำนวนจำกัดตายตัวตาม battleSpriteSequences.ts
 * การเก็บไว้ข้ามการเข้าห้องต่อสู้แต่ละรอบจึงไม่ใช่ memory leak แต่เป็นการกันไม่ให้
 * โหลด/ถอดรหัส PNG ชุดเดิมซ้ำทุกครั้งที่เข้าห้อง (§28 ห้าม texture โหลดซ้ำทุก render)
 */

const cache = new Map<string, Texture>()
const loader = new TextureLoader()

export class BattleAssetError extends Error {
  // ประกาศฟิลด์แยกจาก constructor เพราะ tsconfig เปิด erasableSyntaxOnly
  // (parameter property เป็นไวยากรณ์ที่ลบทิ้งเฉย ๆ ไม่ได้ ต้องมีโค้ดสร้างจริง)
  readonly url: string

  constructor(url: string) {
    super(`โหลดภาพของห้องต่อสู้ไม่สำเร็จ: ${url}`)
    this.name = 'BattleAssetError'
    this.url = url
  }
}

async function loadOne(url: string): Promise<Texture> {
  const cached = cache.get(url)
  if (cached) return cached

  try {
    const texture = await loader.loadAsync(url)
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    cache.set(url, texture)
    return texture
  } catch (cause) {
    reportError('BATTLE_ASSET_LOAD_FAIL', 'visible', cause, { url })
    throw new BattleAssetError(url)
  }
}

/** โหลดภาพทุกใบที่ห้องต่อสู้ต้องใช้ให้ครบก่อนเริ่มจำลอง */
export async function preloadBattleTextures(urls: string[]): Promise<void> {
  await Promise.all(urls.map((url) => loadOne(url)))
}

/**
 * หยิบภาพที่โหลดไว้แล้ว — คืน null ถ้ายังไม่ได้โหลด
 *
 * ชั้นวาดเรียกตัวนี้แบบ synchronous ได้เพราะ preloadBattleTextures ทำงานจบไปก่อนแล้ว
 */
export function getBattleTexture(url: string): Texture | null {
  return cache.get(url) ?? null
}

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

/**
 * เพดานเวลาของการ preload ทั้งชุด — ไม่ใช่ต่อใบ
 *
 * `TextureLoader.loadAsync` ของ three ไม่มี timeout ในตัว และไม่ได้อยู่ใต้ `createDeadlineFetch`
 * (ตัวนั้นติดไว้เฉพาะ Supabase client) ก่อนหน้านี้ใบเดียวที่ค้างจึงทำให้ `Promise.all` ค้างทั้งชุด
 * แล้ว `phase` ค้างที่ `'loading'` ตลอดกาล
 *
 * 15 วินาทีเลือกจากฝั่งผู้เล่น ไม่ใช่จากฝั่งเครือข่าย: เกินกว่านี้คนกดไปแล้วก็สรุปว่าเกมค้าง
 * ไม่ว่าจะโหลดเสร็จทีหลังหรือไม่ **ยังไม่ได้วัดกับเน็ตจริงบนเครื่องจริง** — ถ้ามีตัวเลขจากสนาม
 * เมื่อไหร่ ให้แก้ตรงนี้ที่เดียว ทุกจุดเรียกอ่านค่าเดียวกัน
 */
export const BATTLE_TEXTURE_TIMEOUT_MS = 15_000

export class BattleAssetTimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`เตรียมภาพห้องต่อสู้ไม่เสร็จภายใน ${Math.round(timeoutMs / 1000)} วินาที`)
    this.name = 'BattleAssetTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/**
 * โหลดภาพทุกใบที่ห้องต่อสู้ต้องใช้ให้ครบก่อนเริ่มจำลอง
 *
 * timeout เป็นการ **เลิกรอ** ไม่ใช่การยกเลิก — `loadAsync` ยกเลิกไม่ได้ ใบที่ยังวิ่งอยู่ก็ปล่อยให้
 * วิ่งต่อและลงแคชถ้ามันมาถึง สิ่งที่เปลี่ยนคือมันไม่กั้นผู้เล่นไว้กลางจออีก
 */
export async function preloadBattleTextures(
  urls: string[],
  timeoutMs: number = BATTLE_TEXTURE_TIMEOUT_MS,
): Promise<void> {
  const all = Promise.all(urls.map((url) => loadOne(url)))
  if (timeoutMs <= 0) {
    await all
    return
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new BattleAssetTimeoutError(timeoutMs)), timeoutMs)
  })

  try {
    // ทั้งสองฝั่งถูก race แนบ handler ไว้แล้ว ฝั่งที่แพ้จึงไม่กลายเป็น unhandled rejection
    await Promise.race([all, deadline])
  } catch (cause) {
    if (cause instanceof BattleAssetTimeoutError) {
      reportError('BATTLE_ASSET_LOAD_TIMEOUT', 'visible', cause, { urls: urls.length, timeoutMs })
    }
    throw cause
  } finally {
    clearTimeout(timer)
  }
}

/**
 * หยิบภาพที่โหลดไว้แล้ว — คืน null ถ้ายังไม่ได้โหลด
 *
 * ชั้นวาดเรียกตัวนี้แบบ synchronous ได้เพราะ preloadBattleTextures ทำงานจบไปก่อนแล้ว
 */
export function getBattleTexture(url: string): Texture | null {
  return cache.get(url) ?? null
}

/**
 * แฮชรหัสผ่านด้วย PBKDF2 (WebCrypto ที่มีในเบราว์เซอร์ ไม่ต้องลง library)
 *
 * ─── สิ่งที่ระบบนี้ทำได้และทำไม่ได้ ────────────────────────
 * ทำได้:  รหัสผ่านจริงไม่ถูกเก็บลง localStorage เลย เก็บแค่ผลแฮชกับ salt
 *         ถ้าผู้เล่นใช้รหัสซ้ำกับเว็บอื่น รหัสนั้นก็ไม่รั่วจากเกมนี้
 * ทำไม่ได้: กันเจ้าของเครื่องไม่ได้ ใครเปิด DevTools ก็แก้ข้อมูลในเบราว์เซอร์
 *         ตัวเองได้อยู่ดี การยืนยันตัวตนที่เชื่อถือได้ต้องทำฝั่งเซิร์ฟเวอร์
 *         (ดู src/data/accountRepository.ts สำหรับจุดสลับไปใช้ของจริง)
 * ───────────────────────────────────────────────────────────
 */

// OWASP Password Storage Cheat Sheet ปัจจุบันแนะนำ 600,000 รอบสำหรับ PBKDF2-HMAC-SHA256
// (ยืนยันสดจาก cheatsheetseries.owasp.org 2026-08-06 — ไม่ใช้เลขจากความจำ)
const ITERATIONS = 600_000
const KEY_BITS = 256
const SALT_BYTES = 16

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * คืน Uint8Array ที่ผูกกับ ArrayBuffer ธรรมดา (ไม่ใช่ SharedArrayBuffer)
 * เพราะ WebCrypto รับเฉพาะแบบนี้ตามนิยามชนิดของ TypeScript
 */
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function createSalt(): string {
  const salt = new Uint8Array(SALT_BYTES)
  crypto.getRandomValues(salt)
  return toBase64(salt)
}

/**
 * แฮชค่าเก็บเป็น "<รอบ>:<แฮช base64>" — ฝังจำนวนรอบไว้ในสตริงเดียวกับแฮชเอง
 * แทนที่จะเพิ่มคอลัมน์ใหม่ในบัญชี เพื่อให้ verifyPassword ยืนยันแฮชเก่า (รอบน้อยกว่า)
 * ได้ต่อไปแม้ ITERATIONS ด้านบนถูกปรับขึ้นในอนาคต โดยไม่ล็อกผู้เล่นเดิมออก
 */
async function derive(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations,
      hash: 'SHA-256',
    },
    key,
    KEY_BITS,
  )

  return toBase64(new Uint8Array(bits))
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  return `${ITERATIONS}:${await derive(password, salt, ITERATIONS)}`
}

/**
 * เทียบรหัสผ่านแบบใช้เวลาคงที่
 * (เทียบด้วย === จะหยุดทันทีที่เจอตัวต่างกัน ซึ่งรั่วข้อมูลผ่านเวลาที่ใช้)
 */
export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const separator = expectedHash.indexOf(':')
  const iterations = separator === -1 ? 120_000 : Number(expectedHash.slice(0, separator))
  const expectedDigest = separator === -1 ? expectedHash : expectedHash.slice(separator + 1)

  const actual = await derive(password, salt, iterations)
  if (actual.length !== expectedDigest.length) return false

  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedDigest.charCodeAt(i)
  }
  return diff === 0
}

/** true เมื่อแฮชที่เก็บไว้ใช้รอบน้อยกว่าค่าปัจจุบัน — เรียกหลัง verifyPassword ผ่านเพื่อรีแฮชอัปเกรด */
export function needsRehash(storedHash: string): boolean {
  const separator = storedHash.indexOf(':')
  const iterations = separator === -1 ? 120_000 : Number(storedHash.slice(0, separator))
  return iterations < ITERATIONS
}

/**
 * ระบบ UID ผู้เล่น — เลข 10 หลักที่ใช้อ้างถึงผู้เล่นแบบสาธารณะ
 * (ใช้สำหรับ "เพิ่มเพื่อน" — ผู้เล่นบอก UID ให้เพื่อนค้นหาได้ โดยไม่ต้องเปิดเผยชื่อบัญชี)
 *
 * ─── สถานะปัจจุบัน ────────────────────────────────────────
 * ยังไม่ต่อฐานข้อมูล UID จึงถูกสุ่มขึ้นที่ฝั่งผู้เล่นและกันซ้ำได้
 * เฉพาะเท่าที่เครื่องนี้เคยออกให้ (ดู issuedUids ด้านล่าง)
 *
 * ─── เมื่อต่อฐานข้อมูลจริง ────────────────────────────────
 * ความไม่ซ้ำที่เชื่อถือได้ต้องมาจากฐานข้อมูล ไม่ใช่จากฝั่งผู้เล่น
 * ให้ทำสองอย่าง:
 *   1. ตั้ง UNIQUE index บนคอลัมน์ uid
 *   2. ส่งฟังก์ชันเช็คของจริงเข้า generateUid() เช่น
 *      await generateUid((uid) => db.players.exists({ uid }))
 *      แล้ววนสุ่มใหม่จนกว่าจะได้ค่าที่ยังว่าง (INSERT ที่ชนก็ให้สุ่มใหม่อีกชั้น)
 * ───────────────────────────────────────────────────────────
 */

/** ความยาว UID — ตัวเลข 10 หลักพอดี */
export const UID_LENGTH = 10

/** จำนวนครั้งสูงสุดที่ยอมสุ่มใหม่เมื่อเจอค่าซ้ำ */
const MAX_ATTEMPTS = 20

/** UID ที่เครื่องนี้เคยออกให้ไปแล้ว ใช้กันซ้ำภายในเซสชัน */
const issuedUids = new Set<string>()

/**
 * สุ่มตัวเลข 0–9 จำนวน count ตัวจากแหล่งสุ่มของระบบ
 *
 * 256 หารด้วย 10 ไม่ลงตัว การ %10 ตรง ๆ จะทำให้เลข 0–5 ออกบ่อยกว่าเลขอื่น
 * จึงทิ้งค่า 250–255 แล้วสุ่มใหม่ (rejection sampling) ให้ทุกหลักมีโอกาสเท่ากันจริง
 */
function randomDigits(count: number): number[] {
  const digits: number[] = []

  while (digits.length < count) {
    const bytes = new Uint8Array(count - digits.length)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte < 250) digits.push(byte % 10)
    }
  }

  return digits
}

/** สร้าง UID ดิบหนึ่งค่า — หลักแรกเป็น 1–9 เสมอ จึงได้ 10 หลักครบทุกครั้ง */
function draw(): string {
  const digits = randomDigits(UID_LENGTH)
  digits[0] = (digits[0] % 9) + 1
  return digits.join('')
}

/**
 * ออก UID ใหม่ที่ยังไม่ถูกใช้
 *
 * @param isTaken ฟังก์ชันตรวจว่า UID ถูกใช้ไปแล้วหรือยัง
 *                ตอนนี้ค่าเริ่มต้นเช็คเฉพาะที่เครื่องนี้เคยออกให้
 *                เมื่อมีฐานข้อมูลให้ส่งฟังก์ชันที่ถามฐานข้อมูลจริงเข้ามาแทน
 */
export function generateUid(isTaken: (uid: string) => boolean = (uid) => issuedUids.has(uid)): string {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const uid = draw()
    if (!isTaken(uid)) {
      issuedUids.add(uid)
      return uid
    }
  }

  // ในทางปฏิบัติแทบเป็นไปไม่ได้ (โอกาสชน 20 ครั้งติดจาก 9 พันล้านค่า)
  // แต่ถ้าเกิดขึ้นจริงแปลว่า isTaken ผิดปกติ จึงให้ล้มดัง ๆ ดีกว่าคืน UID ซ้ำ
  throw new Error(`ออก UID ไม่สำเร็จหลังพยายาม ${MAX_ATTEMPTS} ครั้ง`)
}

/** จัดรูปให้อ่าน/จำง่ายเวลาโชว์บนหน้าจอ: 1234567890 → 1234 567 890 */
export function formatUid(uid: string): string {
  return `${uid.slice(0, 4)} ${uid.slice(4, 7)} ${uid.slice(7)}`
}

/** ตรวจรูปแบบ UID ที่ผู้เล่นพิมพ์เข้ามา (เช่น ช่องค้นหาเพื่อน) */
export function isValidUid(value: string): boolean {
  return new RegExp(`^[1-9][0-9]{${UID_LENGTH - 1}}$`).test(value)
}

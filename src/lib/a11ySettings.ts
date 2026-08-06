import { readJson, writeJson } from './storage'

/**
 * ค่าตั้งค่าการเข้าถึง (accessibility) — เก็บ/อ่านผ่าน localStorage แบบเดียวกับ AudioEngine
 * (ดู src/lib/audio/AudioEngine.ts) แยกไฟล์ต่างหากเพราะไม่เกี่ยวกับเสียงเลย
 *
 * เริ่มจากปุ่มเดียว (บังคับลดการเคลื่อนไหวในแอป โดยไม่ต้องพึ่ง OS-level
 * prefers-reduced-motion อย่างเดียว) — เพิ่มค่าอื่นทีหลังได้ (ขนาดตัวอักษร/contrast/
 * colorblind mode ฯลฯ) โดยขยาย interface นี้ + เพิ่ม control ใน SettingsModal's
 * AccessibilityPanel เท่านั้น ไม่ต้องแก้ที่อื่น
 */
export interface A11ySettings {
  /** true = บังคับลดการเคลื่อนไหวทั้งแอป ไม่ว่า OS จะตั้งค่าไว้ยังไง */
  reduceMotion: boolean
}

export const DEFAULT_A11Y_SETTINGS: A11ySettings = {
  reduceMotion: false,
}

const SETTINGS_KEY = 'los:a11y:v1'

export function getA11ySettings(): A11ySettings {
  return readJson<A11ySettings>(SETTINGS_KEY) ?? DEFAULT_A11Y_SETTINGS
}

/** บันทึกค่า + ใช้ผลทันที (เรียก applyA11ySettings ให้อัตโนมัติ) */
export function setA11ySettings(next: A11ySettings): void {
  writeJson(SETTINGS_KEY, next)
  applyA11ySettings(next)
}

/**
 * ใส่ค่าลง <html> เป็น data attribute ให้ CSS อ่านได้ (ดู src/index.css's
 * :root[data-reduce-motion="true"] selector) — เรียกครั้งแรกตอนแอปเริ่มทำงาน (main.tsx)
 * เพื่อให้ค่าที่เคยตั้งไว้มีผลตั้งแต่เฟรมแรก ไม่ต้องรอเปิด SettingsModal ก่อน
 */
export function applyA11ySettings(settings: A11ySettings): void {
  document.documentElement.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false'
}

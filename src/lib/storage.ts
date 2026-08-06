import { reportError } from './errors/reportError'

/**
 * ตัวห่อ localStorage ที่ไม่โยน exception
 *
 * localStorage พังได้หลายทางที่ไม่ใช่ความผิดของโค้ดเรา เช่น
 * โหมดส่วนตัวของ Safari, พื้นที่เต็ม, ผู้ใช้ปิดคุกกี้, หรือข้อมูลเก่าที่ parse ไม่ผ่าน
 * ทุกกรณีต้องไม่ทำให้เกมล่ม — คืน null แล้วให้ผู้เรียกตัดสินใจแทน
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch (err) {
    // ข้อมูลเสียหรืออ่านไม่ได้ — ถือว่ายังไม่มีข้อมูล
    reportError('STORAGE_READ_FAIL', 'silent', err)
    return null
  }
}

/** คืน false เมื่อเขียนไม่สำเร็จ (พื้นที่เต็ม / โหมดส่วนตัว) */
export function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    reportError('STORAGE_WRITE_FAIL', 'silent', err)
    return false
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch (err) {
    // ลบไม่ได้ก็ปล่อยผ่าน ไม่มีอะไรให้กู้
    reportError('STORAGE_REMOVE_FAIL', 'silent', err)
  }
}

/** เช็กว่าเบราว์เซอร์นี้ใช้ localStorage ได้จริงหรือไม่ */
export function isStorageAvailable(): boolean {
  try {
    const probe = '__los_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

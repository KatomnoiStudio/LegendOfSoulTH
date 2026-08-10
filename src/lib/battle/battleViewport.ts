/**
 * Fullscreen + orientation helpers for combat viewport (pure, testable).
 *
 * ทุก catch ที่นี่ degrade แล้วเล่นต่อได้จริง (เกมยังเล่นได้ในหน้าต่างปกติ) แต่ต้องไม่เงียบสนิท —
 * กฎของโปรเจกต์เองบังคับให้ทุก catch เดินผ่าน reportError ไม่ใช่ `catch {}` เปล่า
 * (ดู .agents/rules/ecc/web/observability.md หัวข้อ Try/catch convention) เดิมทั้งสี่จุดเป็น
 * catch เปล่า ทำให้ "ปุ่มเต็มจอกดแล้วไม่มีอะไรเกิดขึ้น" บนบางเครื่องไม่มีร่องรอยให้ตามเลย
 */
import { reportError } from '../errors/reportError'

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false
  return Boolean(document.documentElement.requestFullscreen)
}

export function isPortraitViewport(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false
  return height > width
}

export function readViewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }
}

export async function requestBattleFullscreen(
  element: Element = document.documentElement,
): Promise<boolean> {
  if (!isFullscreenSupported()) return false
  if (document.fullscreenElement) return true
  try {
    await element.requestFullscreen()
    return Boolean(document.fullscreenElement)
  } catch (error) {
    reportError('VIEWPORT_FULLSCREEN_FAIL', 'silent', error)
    return false
  }
}

export async function exitBattleFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return
  try {
    await document.exitFullscreen()
  } catch (error) {
    // ยังกลืนไว้เหมือนเดิม — ออกจากห้องต่อสู้ต้องไม่โยน แต่ตอนนี้มีร่องรอยให้ตามแล้ว
    reportError('VIEWPORT_FULLSCREEN_EXIT_FAIL', 'silent', error)
  }
}

type OrientationLockable = ScreenOrientation & {
  lock?: (orientation: OrientationLockType) => Promise<void>
}

export async function lockLandscapeOrientation(): Promise<boolean> {
  if (typeof screen === 'undefined') return false
  const orientation = screen.orientation as OrientationLockable | undefined
  if (!orientation?.lock) return false
  try {
    await orientation.lock('landscape')
    return true
  } catch (error) {
    reportError('VIEWPORT_ORIENTATION_LOCK_FAIL', 'silent', error)
    return false
  }
}

export async function unlockOrientation(): Promise<void> {
  if (typeof screen === 'undefined') return
  const orientation = screen.orientation as OrientationLockable | undefined
  try {
    await orientation?.unlock?.()
  } catch (error) {
    reportError('VIEWPORT_ORIENTATION_UNLOCK_FAIL', 'silent', error)
  }
}

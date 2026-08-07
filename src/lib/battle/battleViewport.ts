/** Fullscreen + orientation helpers for combat viewport (pure, testable). */

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
  } catch {
    return false
  }
}

export async function exitBattleFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return
  try {
    await document.exitFullscreen()
  } catch {
    /* ignore — leaving combat should not throw */
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
  } catch {
    return false
  }
}

export async function unlockOrientation(): Promise<void> {
  if (typeof screen === 'undefined') return
  const orientation = screen.orientation as OrientationLockable | undefined
  try {
    await orientation?.unlock?.()
  } catch {
    /* ignore */
  }
}

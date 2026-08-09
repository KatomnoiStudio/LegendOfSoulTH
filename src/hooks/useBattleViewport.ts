import { useCallback, useEffect, useRef, useState } from 'react'
import {
  exitBattleFullscreen,
  isFullscreenSupported,
  isPortraitViewport,
  lockLandscapeOrientation,
  readViewportSize,
  requestBattleFullscreen,
  unlockOrientation,
} from '../lib/battle/battleViewport'

export interface BattleViewportState {
  isPortrait: boolean
  isFullscreen: boolean
  showFullscreenPrompt: boolean
  inputBlocked: boolean
  requestFullscreenFromGesture: () => Promise<void>
}

/**
 * Combat viewport — fullscreen attempt, landscape lock, portrait guard.
 * Does not block game entry when APIs are unavailable.
 */
export function useBattleViewport(enabled: boolean): BattleViewportState {
  const [isPortrait, setIsPortrait] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false)
  const triedAutoFullscreen = useRef(false)

  const syncViewport = useCallback(() => {
    const { width, height } = readViewportSize()
    setIsPortrait(isPortraitViewport(width, height))
    setIsFullscreen(Boolean(document.fullscreenElement))
  }, [])

  const enterFullscreen = useCallback(async () => {
    if (!enabled) return
    const ok = await requestBattleFullscreen()
    if (ok) {
      setShowFullscreenPrompt(false)
      await lockLandscapeOrientation()
    }
    syncViewport()
  }, [enabled, syncViewport])

  useEffect(() => {
    if (!enabled) return

    syncViewport()

    const onChange = () => syncViewport()
    window.addEventListener('resize', onChange)
    window.addEventListener('orientationchange', onChange)
    document.addEventListener('fullscreenchange', onChange)
    window.visualViewport?.addEventListener('resize', onChange)

    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('orientationchange', onChange)
      document.removeEventListener('fullscreenchange', onChange)
      window.visualViewport?.removeEventListener('resize', onChange)
    }
  }, [enabled, syncViewport])

  useEffect(() => {
    if (!enabled || triedAutoFullscreen.current) return
    triedAutoFullscreen.current = true

    if (!isFullscreenSupported()) return

    void (async () => {
      const ok = await requestBattleFullscreen()
      if (ok) {
        await lockLandscapeOrientation()
        setShowFullscreenPrompt(false)
      } else {
        setShowFullscreenPrompt(true)
      }
      syncViewport()
    })()
  }, [enabled, syncViewport])

  useEffect(() => {
    if (!enabled) return
    return () => {
      void unlockOrientation()
      void exitBattleFullscreen()
    }
  }, [enabled])

  const inputBlocked = isPortrait

  return {
    isPortrait,
    isFullscreen,
    showFullscreenPrompt: showFullscreenPrompt && !isFullscreen && isFullscreenSupported(),
    inputBlocked,
    requestFullscreenFromGesture: enterFullscreen,
  }
}

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PVP_BACKEND_DEPLOYED } from './featureFlags'

/*
  MEMORY.md item 176: v0.15.0 shipped the Lobby PvP button to production while its room RPCs and
  the `pvp-authority` Edge Function were still undeployed, so every tap raised an RPC-not-found
  error. v0.15.1 gated the nav button — but the gate lived inside `MainNavigation`, while
  `LobbyPage` opens the same modal from a second path (`?modal=pvp` read straight off
  `window.location.search`, live in production). A rot-canary pass caught the leak.

  These tests pin the property that actually matters: EVERY path that can mount `PvPRoomModal`
  consults the same flag. They are source-level assertions on purpose — a behavioural test would
  only cover the one path a future edit happens to remember.
*/

// resolve from the repo root — vitest serves modules over http, so import.meta.url is not a file: URL
const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), 'utf8')
const lobbyPage = read('src/pages/LobbyPage.tsx')
const mainNav = read('src/components/MainNavigation/MainNavigation.tsx')

describe('PVP_BACKEND_DEPLOYED gate', () => {
  test('ยังปิดอยู่ตราบใดที่ migration + Edge Function ยังไม่ deploy จริง', () => {
    expect(PVP_BACKEND_DEPLOYED).toBe(false)
  })

  test('ทุกจุดที่ตั้ง pvpOpen เป็น true ต้องผ่าน flag เดียวกัน — กันรูแบบ ?modal=pvp กลับมาอีก', () => {
    const opensPvp = lobbyPage.split(/\r?\n/).filter((line) => /previewModal === 'pvp'/.test(line))

    // both the useState initializer and the effect must be present, and both must be gated
    expect(opensPvp.length).toBeGreaterThanOrEqual(2)
    for (const line of opensPvp) {
      expect(line).toContain('PVP_BACKEND_DEPLOYED')
    }
  })

  test('ทั้ง LobbyPage และ MainNavigation อ่าน flag จาก featureFlags ไม่ประกาศเองซ้ำ', () => {
    for (const source of [lobbyPage, mainNav]) {
      expect(source).toMatch(/from '.*game\/featureFlags'/)
      // a local re-declaration is what let the first gate leak — forbid it outright
      expect(source).not.toMatch(/const PVP_BACKEND_DEPLOYED\s*=/)
    }
  })
})

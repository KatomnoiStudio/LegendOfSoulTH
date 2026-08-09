import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STANDARD_BANNER } from './gacha/gachaConfig'
import { isHeroProductionReady } from './heroes/heroProductionBatch'
import { GACHA_PRODUCTION_CONTENT_READY, PVP_BACKEND_DEPLOYED } from './featureFlags'

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

/** every line in LobbyPage that can put the summon modal on screen, render guard included */
const OPENS_SUMMON = /previewModal === 'summon'|setSummonOpen\(true\)|summonOpen \? \(/

/*
  The Gacha gate is the same shape as the PvP one but for a different reason: the backend IS
  deployed and working, while the Standard Banner's Heroes have not cleared the Production Asset
  Contract. Same lesson applies — the flag lives in featureFlags.ts so every entry point reads
  one copy, and these tests pin the property (every summon-opening site consults it, including
  the render guard) rather than whichever code path a future edit happens to remember.
*/
describe('GACHA_PRODUCTION_CONTENT_READY gate', () => {
  test('ยังปิดอยู่ตราบใดที่ตู้มีฮีโร่ซึ่ง Asset Contract ยังไม่ผ่าน Production', () => {
    const unreadyHeroIds = STANDARD_BANNER.pool
      .map((entry) => entry.characterId)
      .filter((characterId) => !isHeroProductionReady(characterId))

    expect(unreadyHeroIds).toEqual([
      'monkey-king',
      'pig-warrior',
      'celestial-archer',
      'nezha-warden',
      'sand-sage',
    ])
    expect(GACHA_PRODUCTION_CONTENT_READY).toBe(false)
  })

  test('ทุกจุดที่เปิด summon modal ต้องผ่าน flag เดียวกัน — รวม ?modal=summon และ render guard', () => {
    const opensSummon = lobbyPage.split(/\r?\n/).filter((line) => OPENS_SUMMON.test(line))

    // useState initializer, the ?modal= effect, the MainNavigation handler, AND the render
    // ternary that actually mounts GachaModal — gating the three setters but not the render
    // would still leave the modal reachable through any state path added later
    expect(opensSummon.length).toBeGreaterThanOrEqual(4)
    for (const line of opensSummon) {
      expect(line).toContain('GACHA_PRODUCTION_CONTENT_READY')
    }
  })

  test('ทั้ง LobbyPage และ MainNavigation อ่าน flag จาก featureFlags ไม่ประกาศเองซ้ำ', () => {
    for (const source of [lobbyPage, mainNav]) {
      // positive first — an absence-only check passes even if the gate is deleted outright
      expect(source).toContain('GACHA_PRODUCTION_CONTENT_READY')
      expect(source).toMatch(/from '.*game\/featureFlags'/)
      expect(source).not.toMatch(/const GACHA_PRODUCTION_CONTENT_READY\s*=/)
    }
    // ...and `toContain` alone is still satisfied by the import line, so pin MainNavigation's
    // actual guard: the negated form only ever appears in a real branch, never in an import
    expect(mainNav).toMatch(/!GACHA_PRODUCTION_CONTENT_READY/)
  })
})

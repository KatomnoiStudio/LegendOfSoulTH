import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { ERROR_CODES } from './lib/errors/codes'

/*
  ── 2026-08-19 gold-standard audit, rank 3 — the screen that asks for a report it cannot give ──

  `main.tsx`'s bootstrap `.catch` calls reportError at tier 'visible' and then overwrites
  `#root` wholesale. On that path 'visible' has **zero subscribers**: GlobalErrorBanner is
  never mounted — React failing to boot is why we are in the catch at all — and the innerHTML
  assignment would wipe it regardless. The fallback markup is the only thing a player ever
  sees, and it told them to "แจ้งผู้ดูแลระบบ" while handing them nothing to report.

  Source-level rather than behavioural, deliberately: `main.tsx` self-executes on import, so
  driving the catch means booting the real module against a broken environment and reaching
  into a global side effect. The defect is a string missing from a template literal; reading
  the literal tests exactly that, with no environment to stage.
*/
describe('the bootstrap failure screen carries the code it reports', () => {
  const source = readFileSync(join(process.cwd(), 'src/main.tsx'), 'utf8')
  const fallback = source.slice(source.indexOf('.catch('))

  test('the catch block reports a code that exists in the registry', () => {
    const reported = /reportError\(\s*'([A-Z_]+)'/.exec(fallback)?.[1]

    expect(reported).toBeDefined()
    expect(Object.keys(ERROR_CODES)).toContain(reported)
  })

  /*
    The expected code is READ from the reportError call rather than typed in here. Hardcoding
    it would let a rename desync the screen from the log silently — the two would drift apart
    and this test would keep passing against whichever one it happened to name.
  */
  test('the markup shown to the player contains that same code', () => {
    const reported = /reportError\(\s*'([A-Z_]+)'/.exec(fallback)?.[1]
    const markup = fallback.slice(fallback.indexOf('innerHTML'))

    // Pre-fix: the markup held a heading and a "refresh, then tell an admin" line, and no code.
    expect(markup).toContain(reported)
  })

  test('the code is selectable, so a player on a phone can actually copy it', () => {
    const markup = fallback.slice(fallback.indexOf('innerHTML'))

    expect(markup).toContain('user-select:all')
  })

  /*
    The raw error stays out of the DOM on purpose. reportError already put it in the console,
    and a crashed page is the worst place to render internals — a stack trace here is readable
    by anyone looking over the player's shoulder and tells them nothing they can act on.
  */
  test('the raw error object is not interpolated into the markup', () => {
    const markup = fallback.slice(fallback.indexOf('innerHTML'), fallback.lastIndexOf('`'))

    expect(markup).not.toMatch(/\$\{\s*(err|error)\b/)
  })
})

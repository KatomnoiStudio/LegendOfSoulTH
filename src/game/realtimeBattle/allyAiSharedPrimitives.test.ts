import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Design-lock item 4.a (2026-08-13). Contract 07 used to require that summons "hand off to the
// enemy AI state machine verbatim, no bespoke AI". The ship never matched that, and forcing it
// would make summons worse at their job — they would telegraph before every swing.
//
// What the contract was really guarding against is the combat RULES existing twice and drifting
// apart. That risk is closed by composition, not by a shared state machine: the ally loop imports
// the same movement, collision, hit-detection and damage-reaction functions everything else uses.
//
// So the invariant to pin is "shares the rules", not "shares the decisions". It is checked against
// the module's own import list rather than by exercising behaviour, for the same reason the
// duplicate-flag-write guard in the reward pipeline is structural: the failure mode here is a
// future edit quietly reimplementing one of these locally, which produces identical output on the
// day it is written and diverges later. There is no input that turns red on that.

const ALLY_SOURCE = join(process.cwd(), 'src/game/realtimeBattle/AllyAISystem.ts')

// Each entry is a rule that, if reimplemented locally, would let ally combat drift away from
// enemy and player combat without any test noticing.
const SHARED_PRIMITIVES = [
  { symbol: 'stepMovement', from: './MovementSystem', governs: 'speed, collision push-out' },
  { symbol: 'clampToArena', from: './MovementSystem', governs: 'arena bounds' },
  { symbol: 'findHitTargets', from: './HitboxSystem', governs: 'what a swing connects with' },
  { symbol: 'applyCombatReaction', from: './combatReaction', governs: 'damage and hit-stun' },
  { symbol: 'faceTargetHorizontally', from: './combatFacing', governs: 'facing' },
  { symbol: 'findNearestLivingEnemy', from: './softTarget', governs: 'target selection' },
  { symbol: 'ENEMY_ATTACK_MELEE', from: './attacks', governs: 'the attack definition itself' },
]

describe('AllyAISystem shares combat rules with every other combatant', () => {
  const source = readFileSync(ALLY_SOURCE, 'utf8')

  it.each(SHARED_PRIMITIVES)(
    'imports $symbol from $from — it governs $governs',
    ({ symbol, from }) => {
      // Matches an import of this symbol from this module, allowing other symbols alongside it
      // and either quote style. A local re-declaration would not satisfy it.
      const importsIt = new RegExp(
        `import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from\\s*['"]${from}['"]`,
      ).test(source)

      expect(importsIt).toBe(true)
    },
  )

  it('does not define its own version of a shared rule', () => {
    // The drift this whole lock exists to prevent, stated as its own assertion: a local function
    // with one of these names would shadow the import and silently fork the rules.
    const localDefinitions = SHARED_PRIMITIVES.filter(({ symbol }) =>
      new RegExp(`^\\s*(?:export\\s+)?(?:function|const|let)\\s+${symbol}\\b`, 'm').test(source),
    ).map(({ symbol }) => symbol)

    expect(localDefinitions).toEqual([])
  })

  it('is a separate decision loop on purpose, and says so where someone will read it', () => {
    // The docstring claimed for months that this used "the same state machine as the enemy",
    // which was false and is exactly how a reader concludes the difference is an oversight worth
    // "fixing". Replacing the docstring with that claim again removes this phrase, so the
    // positive check catches it.
    //
    // A `not.toMatch` on the old wording was written here first and had to come out: the current
    // docstring QUOTES the retired claim while explaining the correction, so the guard fired on
    // its own historical note. Keeping the history in the file is worth more than a check that
    // cannot tell an assertion from a citation of a withdrawn one.
    expect(source).toMatch(/decision loop ของตัวเอง/)
  })
})

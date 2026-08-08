import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COMBAT_BUTTON_SIZES,
  DEFAULT_COMBAT_UI_LAYOUT,
  MIN_BUTTON_GAP_PX,
  layoutCssVars,
  resolveCombatClusterMetrics,
  resolveCombatScreenLayout,
  type CombatActionId,
  type CombatButtonCircle,
  type CombatSafeAreaInsets,
  type CombatViewport,
} from './combatUILayout'

const ACTION_IDS: CombatActionId[] = ['skill1', 'skill2', 'skill3', 'ultimate', 'basic-attack']

const VIEWPORT_CASES: Array<{
  name: string
  viewport: CombatViewport
  safeArea: CombatSafeAreaInsets
}> = [
  {
    name: 'iPhone landscape with sensor housing',
    viewport: { width: 844, height: 390 },
    safeArea: { top: 0, right: 47, bottom: 21, left: 47 },
  },
  {
    name: 'compact Android landscape',
    viewport: { width: 667, height: 375 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'short 16:9 landscape',
    viewport: { width: 568, height: 320 },
    safeArea: { top: 0, right: 24, bottom: 16, left: 24 },
  },
  {
    name: 'wide Android landscape',
    viewport: { width: 915, height: 412 },
    safeArea: { top: 0, right: 32, bottom: 16, left: 32 },
  },
]

function edgeGap(a: CombatButtonCircle, b: CombatButtonCircle): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - a.size / 2 - b.size / 2
}

describe('combatUILayout curved Combat Cluster', () => {
  it('uses rendered touch-target sizes in the layout geometry', () => {
    const metrics = resolveCombatClusterMetrics()

    expect(metrics.attackSize).toBeGreaterThan(metrics.skillSize)
    expect(metrics.skillSize).toBeGreaterThanOrEqual(COMBAT_BUTTON_SIZES.minTouchTarget)
    expect(metrics.ultimateSize).toBeGreaterThanOrEqual(COMBAT_BUTTON_SIZES.minTouchTarget)
    expect(metrics.gap).toBeGreaterThanOrEqual(MIN_BUTTON_GAP_PX)
  })

  it('places S1, S2, S3, and ULT in order around ATK without collisions', () => {
    const metrics = resolveCombatClusterMetrics()
    const buttons = ACTION_IDS.map((actionId) => metrics.buttons[actionId])

    expect(metrics.buttons.skill1.x).toBeLessThan(metrics.buttons.skill2.x)
    expect(metrics.buttons.skill2.y).toBeGreaterThan(metrics.buttons.skill3.y)
    expect(metrics.buttons.skill3.x).toBeLessThan(metrics.buttons.ultimate.x)
    expect(metrics.buttons.ultimate.y).toBeLessThan(metrics.buttons['basic-attack'].y)

    for (let first = 0; first < buttons.length; first += 1) {
      for (let second = first + 1; second < buttons.length; second += 1) {
        expect(edgeGap(buttons[first], buttons[second])).toBeGreaterThanOrEqual(
          MIN_BUTTON_GAP_PX - 0.001,
        )
      }
    }
  })

  it('emits one geometry source for every rendered button slot', () => {
    const vars = layoutCssVars()

    for (const variable of [
      '--combat-cluster-width',
      '--combat-cluster-height',
      '--combat-s1-x',
      '--combat-s1-y',
      '--combat-s2-x',
      '--combat-s2-y',
      '--combat-s3-x',
      '--combat-s3-y',
      '--combat-ultimate-x',
      '--combat-ultimate-y',
      '--combat-attack-x',
      '--combat-attack-y',
    ]) {
      expect(vars[variable]).toMatch(/px$/)
    }
  })

  it.each(VIEWPORT_CASES)(
    'stays inside safe areas and clear of the joystick on $name',
    ({ viewport, safeArea }) => {
      const screen = resolveCombatScreenLayout(viewport, safeArea)

      for (const actionId of ACTION_IDS) {
        const button = screen.buttons[actionId]
        const radius = button.size / 2
        expect(button.x - radius).toBeGreaterThanOrEqual(safeArea.left)
        expect(button.x + radius).toBeLessThanOrEqual(viewport.width - safeArea.right)
        expect(button.y - radius).toBeGreaterThanOrEqual(safeArea.top)
        expect(button.y + radius).toBeLessThanOrEqual(viewport.height - safeArea.bottom)
        expect(edgeGap(button, screen.joystick)).toBeGreaterThanOrEqual(MIN_BUTTON_GAP_PX)
      }

      const joystickRadius = screen.joystick.size / 2
      expect(screen.joystick.x - joystickRadius).toBeGreaterThanOrEqual(safeArea.left)
      expect(screen.joystick.x + joystickRadius).toBeLessThanOrEqual(
        viewport.width - safeArea.right,
      )
      expect(screen.joystick.y - joystickRadius).toBeGreaterThanOrEqual(safeArea.top)
      expect(screen.joystick.y + joystickRadius).toBeLessThanOrEqual(
        viewport.height - safeArea.bottom,
      )
    },
  )

  it('keeps the rendered stylesheet on absolute arc slots and safe-area clamps', () => {
    const cssPath = resolve(process.cwd(), 'src/components/BattleScene/BattleScene.module.css')
    const css = readFileSync(cssPath, 'utf8')

    expect(css).toContain('.combatSlotS1')
    expect(css).toContain('.combatSlotUltimate')
    expect(css).toContain('.combatSlotAttack')
    expect(css).toContain('env(safe-area-inset-right')
    expect(css).toContain('env(safe-area-inset-bottom')
    expect(css).not.toContain('.combatSkillsRow')
  })

  it('keeps the joystick clear of the bottom edge on short landscape screens', () => {
    expect(DEFAULT_COMBAT_UI_LAYOUT.joystickAnchorYPercent).toBeLessThanOrEqual(76)
  })
})

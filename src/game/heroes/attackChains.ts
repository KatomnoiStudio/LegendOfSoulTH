import type { AttackDefinition } from '../realtimeBattle/attacks'
import { COMBO_CONFIG } from '../realtimeBattle/attacks'

/** สร้างคอมโบ 3 ไม้จาก template — ลด duplication ระหว่างฮีโร่ */
function buildMeleeCombo(
  prefix: string,
  base: {
    range: number
    depthTolerance: number
    lunge: [number, number, number]
    multipliers: [number, number, number]
    knockback: [number, number, number]
    finisherKnockdown?: boolean
    finisherEffects?: AttackDefinition['effects']
  },
): AttackDefinition[] {
  const windows = [
    { startup: 110, active: 90, recovery: 180, comboEnd: 700 },
    { startup: 100, active: 90, recovery: 190, comboEnd: 700 },
    { startup: 150, active: 120, recovery: 320, comboEnd: 0 },
  ] as const

  return windows.map((timing, index) => ({
    id: `${prefix}-attack-${index + 1}`,
    animationId: `attack-${index + 1}` as AttackDefinition['animationId'],
    startupMs: timing.startup,
    activeMs: timing.active,
    recoveryMs: timing.recovery,
    comboWindowStartMs: index < 2 ? timing.startup : 0,
    comboWindowEndMs: timing.comboEnd,
    damageMultiplier: base.multipliers[index],
    range: base.range + index * 8,
    hitShape: 'horizontal' as const,
    arcDegrees: 0,
    depthTolerance: base.depthTolerance + index * 5,
    knockback: base.knockback[index],
    hitstunMs: 200,
    lungeDistance: base.lunge[index],
    ...(index === 2 && base.finisherKnockdown ? { knockdown: true } : {}),
    ...(index === 2 && base.finisherEffects ? { effects: base.finisherEffects } : {}),
  }))
}

function buildRangedCombo(prefix: string): AttackDefinition[] {
  return [
    {
      id: `${prefix}-attack-1`,
      animationId: 'attack-1',
      startupMs: 90,
      activeMs: 60,
      recoveryMs: 200,
      comboWindowStartMs: 90,
      comboWindowEndMs: 600,
      damageMultiplier: 0.9,
      range: 420,
      hitShape: 'horizontal',
      arcDegrees: 0,
      depthTolerance: 60,
      knockback: 20,
      hitstunMs: 180,
      lungeDistance: 0,
    },
    {
      id: `${prefix}-attack-2`,
      animationId: 'attack-2',
      startupMs: 100,
      activeMs: 70,
      recoveryMs: 210,
      comboWindowStartMs: 100,
      comboWindowEndMs: 600,
      damageMultiplier: 1.05,
      range: 440,
      hitShape: 'horizontal',
      arcDegrees: 0,
      depthTolerance: 65,
      knockback: 30,
      hitstunMs: 180,
      lungeDistance: 0,
    },
    {
      id: `${prefix}-attack-3`,
      animationId: 'attack-3',
      startupMs: 130,
      activeMs: 90,
      recoveryMs: 300,
      comboWindowStartMs: 0,
      comboWindowEndMs: 0,
      damageMultiplier: 1.35,
      range: 480,
      hitShape: 'horizontal',
      arcDegrees: 0,
      depthTolerance: 70,
      knockback: 50,
      hitstunMs: 220,
      lungeDistance: 0,
    },
  ]
}

export const MONKEY_KING_ATTACK_CHAIN = buildMeleeCombo('monkey', {
  range: 120,
  depthTolerance: 95,
  lunge: [32, 36, 44],
  multipliers: [1, 1.15, 1.55],
  knockback: [60, 80, 210],
  finisherKnockdown: true,
})

export const PIG_WARRIOR_ATTACK_CHAIN = buildMeleeCombo('pig', {
  range: 115,
  depthTolerance: 100,
  lunge: [24, 28, 36],
  multipliers: [1.05, 1.2, 1.7],
  knockback: [90, 120, 260],
  finisherKnockdown: true,
})

export const CELESTIAL_ARCHER_ATTACK_CHAIN = buildRangedCombo('archer')

export const NEZHA_WARDEN_ATTACK_CHAIN = buildMeleeCombo('nezha', {
  range: 118,
  depthTolerance: 92,
  lunge: [28, 32, 38],
  multipliers: [0.95, 1.1, 1.25],
  knockback: [50, 70, 100],
  finisherKnockdown: false,
  finisherEffects: [{ kind: 'cc', target: 'nearestEnemy', ccType: 'root', ccDurationMs: 1200 }],
})

export const SAND_SAGE_ATTACK_CHAIN = buildMeleeCombo('sage', {
  range: 130,
  depthTolerance: 88,
  lunge: [20, 24, 28],
  multipliers: [0.85, 0.95, 1.2],
  knockback: [40, 55, 80],
  finisherKnockdown: false,
})

export const HERO_ATTACK_CHAINS: Record<string, AttackDefinition[]> = {
  'monkey-king': MONKEY_KING_ATTACK_CHAIN,
  'pig-warrior': PIG_WARRIOR_ATTACK_CHAIN,
  'celestial-archer': CELESTIAL_ARCHER_ATTACK_CHAIN,
  'nezha-warden': NEZHA_WARDEN_ATTACK_CHAIN,
  'sand-sage': SAND_SAGE_ATTACK_CHAIN,
}

const DEFAULT_CHAIN = MONKEY_KING_ATTACK_CHAIN

export function getPlayerAttackChain(characterId: string | undefined): AttackDefinition[] {
  if (!characterId) return DEFAULT_CHAIN
  return HERO_ATTACK_CHAINS[characterId] ?? DEFAULT_CHAIN
}

/** @deprecated ใช้ getPlayerAttackChain('monkey-king') — คงไว้เพื่อ backward compat */
export const PLAYER_ATTACK_CHAIN = MONKEY_KING_ATTACK_CHAIN

export { COMBO_CONFIG }

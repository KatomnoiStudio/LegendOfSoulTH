import { describe, expect, it } from 'vitest'
import { getRealtimeSkillKit } from '../../realtimeBattle/skills'

describe('Erlang Shen combat kit', () => {
  it('registers the lightning strike and the three-hound Skill 2 for the real battle runtime', () => {
    const kit = getRealtimeSkillKit('spear-warrior')

    expect(kit?.skill1.attack.animationId).toBe('skill-1')
    expect(kit?.skill2.attack.animationId).toBe('skill-2')
    expect(kit?.skill2.attack.startupMs).toBeGreaterThanOrEqual(1400)
    expect(kit?.skill2.targetLock).toBe('nearest')
  })
})

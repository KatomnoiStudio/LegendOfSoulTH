import { describe, expect, it } from 'vitest'
import {
  getBattleSpriteSet,
  selectNormalAttackAnimation,
  selectNormalAttackPreviewAnimation,
} from './battleSpriteSequences'

describe('selectNormalAttackPreviewAnimation', () => {
  it('cycles through all three Erlang attacks in a predictable test order', () => {
    expect([1, 2, 3, 4, 5, 6].map(selectNormalAttackPreviewAnimation)).toEqual([
      'attack-1',
      'attack-2',
      'attack-3',
      'attack-1',
      'attack-2',
      'attack-3',
    ])
  })
})

describe('selectNormalAttackAnimation', () => {
  it('สุ่ม Normal Attack เก่าของ Erlang เมื่อค่าสุ่มอยู่ครึ่งล่าง', () => {
    expect(selectNormalAttackAnimation('spear-warrior', () => 0.32)).toBe('attack-1')
  })

  it('สุ่ม Normal Attack ใหม่ของ Erlang เมื่อค่าสุ่มอยู่ครึ่งบน', () => {
    expect(selectNormalAttackAnimation('spear-warrior', () => 0.5)).toBe('attack-2')
  })

  it('สุ่ม Normal Attack ท่าที่สามของ Erlang จากช่วงบนสุด', () => {
    expect(selectNormalAttackAnimation('spear-warrior', () => 0.9)).toBe('attack-3')
  })

  it('ท่าที่สามมีเฉพาะเฟรม 0 ถึง 7 โดยไม่มีเฟรมขาดหรือเกิน', () => {
    const frames = getBattleSpriteSet('spear-warrior')['attack-3'].frames.right

    expect(frames).toHaveLength(8)
    expect(frames.map((url) => url.match(/-(\d+)\.webp$/)?.[1])).toEqual([
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ])
  })

  it('ตัวละครอื่นยังใช้ Normal Attack เดิมโดยไม่เรียกตัวสุ่ม', () => {
    let randomCalls = 0
    const animation = selectNormalAttackAnimation('monkey-king', () => {
      randomCalls += 1
      return 0.9
    })

    expect(animation).toBe('attack-1')
    expect(randomCalls).toBe(0)
  })
})

describe('Erlang Shen Skill 1 sprites', () => {
  it('uses exactly 16 ordered fixed-grid frames with no missing or extra frame', () => {
    const skill = getBattleSpriteSet('spear-warrior')['skill-1']
    const skillFrames = skill.frames.right
    expect(skillFrames).toHaveLength(16)
    expect(skillFrames.map((url) => url.match(/-(\d+)\.webp$/)?.[1])).toEqual(
      Array.from({ length: 16 }, (_, index) => String(index)),
    )
    expect(skill.rate).toBe(14)
  })
})

describe('Erlang Shen Skill 2 sprites', () => {
  it('uses the six-frame casting body, then leaves recovery to return to Idle', () => {
    const skill = getBattleSpriteSet('spear-warrior')['skill-2']
    const skillFrames = skill.frames.right
    expect(skillFrames).toHaveLength(6)
    expect(skillFrames.map((url) => url.match(/-(\d+)\.webp$/)?.[1])).toEqual(
      Array.from({ length: 6 }, (_, index) => String(index)),
    )
    expect(skillFrames.every((url) => url.includes('erlang-shen-skill-2-cast-'))).toBe(true)
    expect(skill.rate).toBe(10)
  })
})

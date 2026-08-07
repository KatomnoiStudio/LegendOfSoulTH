import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LobbyBattleSession } from './LobbyBattleSession'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

/**
 * เทสต์ตาม Done-criteria #3 (docs/agent-blueprint/16-stage-adventure-system.md):
 * "rejects a locked stageId before BattleScene mounts"
 *
 * ตัว gating logic เองเทสต์เป็น pure predicate แล้วที่ stageConfig.test.ts —
 * ไฟล์นี้ปักหมุดจุดที่เรียกมันจริง: LobbyBattleSession ต้องไม่ mount BattleScene
 * จนกว่าจะมีด่านที่ปลดล็อกถูกเลือกก่อน
 */

function makePlayer(): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'ผู้ทดสอบ',
    title: 'นักเดินทาง',
    level: 10,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 12,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: ['monkey-king', null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
  }
}

describe('LobbyBattleSession', () => {
  it('เริ่มที่หน้าเลือกด่านเสมอ — ไม่ mount BattleScene จนกว่าจะเลือกด่านที่ปลดล็อกแล้ว', () => {
    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={vi.fn()}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'เลือกด่าน' })).toBeInTheDocument()
    expect(screen.queryByText('กำลังเตรียมห้องต่อสู้…')).not.toBeInTheDocument()
  })

  it('ด่านที่ยังไม่ปลดล็อก (trial-02) กดไม่ได้จากหน้าเลือกด่าน', () => {
    render(
      <LobbyBattleSession
        player={makePlayer()}
        onPlayerChange={vi.fn()}
        onEarnGold={vi.fn()}
        onGrantItem={vi.fn()}
        onExit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /ประตูปีศาจ/ })).toBeDisabled()
  })
})

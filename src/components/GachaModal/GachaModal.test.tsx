import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GachaPullResult } from '../../data/accountRepository.shared'
import type { Player } from '../../types/player'
import { GachaModal } from './GachaModal'

const player: Player = {
  id: 'profile-1',
  uid: 'LOS-1111-1111',
  name: 'ผู้ทดสอบ',
  title: 'ผู้จาริก',
  level: 1,
  exp: 0,
  expToNext: 100,
  currency: { gold: 500, gem: 1_000 },
  ownedCharacters: [],
  teamSlots: [null, null, null, null],
  inventory: [],
  friends: [],
  frameId: 'arcane',
  progress: { flags: {}, defeatedNpcIds: [], battleHistory: [] },
  gachaPity: { 'standard-banner': 12 },
}

function success(): Extract<GachaPullResult, { ok: true }> {
  return {
    ok: true,
    player: { ...player, currency: { ...player.currency, gem: 900 } },
    results: [
      {
        characterId: 'nezha-warden',
        rarity: 'rare',
        isPity: false,
        isNew: true,
        shardsGranted: 0,
      },
    ],
    cost: 100,
    currencyUsed: 'gem',
    newPity: 13,
    replayed: false,
  }
}

describe('GachaModal lobby wiring', () => {
  it('shows five playstyles and renders only the server result', async () => {
    const onPull = vi.fn().mockResolvedValue(success())
    render(<GachaModal player={player} onPull={onPull} onClose={vi.fn()} />)

    expect(screen.getByText('นักรบกองหน้า')).toBeInTheDocument()
    expect(screen.getByText('นักธนูระยะไกล')).toBeInTheDocument()
    expect(screen.getByText('ผู้ควบคุมสมรภูมิ')).toBeInTheDocument()
    expect(screen.getByText('ผู้เรียกวิญญาณ')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /อัญเชิญ 1 ครั้ง/ }))

    expect(onPull).toHaveBeenCalledWith('standard-banner', 1, expect.any(String))
    expect(await screen.findByText('วีรชนใหม่')).toBeInTheDocument()
    expect(screen.getAllByText('นาจา')).toHaveLength(2)
  })

  it('reuses the same request id when retrying a lost/failed response', async () => {
    const onPull = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'เครือข่ายขัดข้อง' })
      .mockResolvedValueOnce(success())
    render(<GachaModal player={player} onPull={onPull} onClose={vi.fn()} />)

    const button = screen.getByRole('button', { name: /อัญเชิญ 1 ครั้ง/ })
    await userEvent.click(button)
    await screen.findByRole('alert')
    await userEvent.click(button)

    expect(onPull).toHaveBeenCalledTimes(2)
    expect(onPull.mock.calls[0]?.[2]).toBe(onPull.mock.calls[1]?.[2])
  })
})

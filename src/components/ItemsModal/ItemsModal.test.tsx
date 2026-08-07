import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemsModal } from './ItemsModal'
import { EMPTY_PROGRESS } from '../../types/player'
import type { Player } from '../../types/player'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'acc-1',
    uid: '1234567890',
    name: 'ผู้ทดสอบ',
    title: 'นักเดินทาง',
    level: 10,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [],
    inventory: [
      {
        itemId: 'healing-peach',
        quantity: 3,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        obtainedFrom: 'quest',
      },
      {
        itemId: 'iron-essence',
        quantity: 12,
        obtainedAt: '2026-01-01T00:00:00.000Z',
        obtainedFrom: 'drop',
      },
    ],
    friends: [],
    teamSlots: [null, null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
    ...overrides,
  }
}

describe('ItemsModal', () => {
  test('render กระเป๋าที่มีของจริง แสดงชื่อ จำนวน และยอดรวมถูกต้อง', () => {
    render(<ItemsModal player={makePlayer()} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'ไอเทม' })).toBeInTheDocument()
    expect(screen.getByText('ท้อสวรรค์')).toBeInTheDocument()
    expect(screen.getByText('×3')).toBeInTheDocument()
    expect(screen.getByText('แก่นเหล็กพันปี')).toBeInTheDocument()
    expect(screen.getByText('2 ชนิด')).toBeInTheDocument()
  })

  test('ช่องที่อ้าง itemId ที่ไม่มีในทะเบียนถูกข้าม ไม่ทำให้พัง', () => {
    const player = makePlayer({
      inventory: [
        {
          itemId: 'ghost-item',
          quantity: 1,
          obtainedAt: '2026-01-01T00:00:00.000Z',
          obtainedFrom: 'drop',
        },
      ],
    })

    render(<ItemsModal player={player} onClose={vi.fn()} />)

    expect(screen.getByText('0 ชนิด')).toBeInTheDocument()
    expect(
      screen.getByText(
        'กระเป๋ายังว่างเปล่า — ไอเทมได้จากการทำภารกิจและของที่ดรอประหว่างเล่นเท่านั้น',
      ),
    ).toBeInTheDocument()
  })

  test('ปุ่มปิดและแท็บกรองมี label ที่เข้าถึงได้ครบ', () => {
    render(<ItemsModal player={makePlayer()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'ปิด' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'ทั้งหมด' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'วัตถุดิบ' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'ของใช้' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'ของล้ำค่า' })).toBeInTheDocument()
  })

  test('กดแท็บ "วัตถุดิบ" กรองให้เหลือเฉพาะหมวดนั้น และกดปุ่มปิดเรียก onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ItemsModal player={makePlayer()} onClose={onClose} />)

    await user.click(screen.getByRole('tab', { name: 'วัตถุดิบ' }))

    expect(screen.getByRole('tab', { name: 'วัตถุดิบ' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('แก่นเหล็กพันปี')).toBeInTheDocument()
    expect(screen.queryByText('ท้อสวรรค์')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

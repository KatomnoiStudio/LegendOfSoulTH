import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddFriendModal } from './AddFriendModal'
import { ToastProvider } from '../Toast/ToastProvider'
import type { FriendCandidate, Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

/*
  ค้นหาเพื่อนมีสามสถานะ (found/not-found/error-ทางอ้อมผ่าน onAddFriend คืน false) —
  จุดที่พังเงียบง่ายที่สุดคือ handler คืนค่าไม่ตรงกับ UI ที่โชว์ เทสต์นี้ยืนยัน flow
  ค้นหา→เจอ→เพิ่มเพื่อนจริง และ flow ค้นหา→ไม่เจอ ไม่ทำให้พังหรือค้าง
*/

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    uid: '1234567890',
    name: 'นักผจญภัย',
    title: 'มือใหม่',
    level: 1,
    exp: 0,
    expToNext: 100,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [],
    inventory: [],
    friends: [],
    teamSlots: [null, null, null, null],
    frameId: 'default',
    progress: EMPTY_PROGRESS,
    ...overrides,
  }
}

const candidate: FriendCandidate = {
  uid: '9876543210',
  name: 'เพื่อนซี้',
  level: 5,
  title: 'นักดาบ',
}

function renderModal(props: Partial<Parameters<typeof AddFriendModal>[0]> = {}) {
  const player = props.player ?? makePlayer()
  return render(
    <ToastProvider>
      <AddFriendModal
        player={player}
        onPlayerChange={vi.fn().mockResolvedValue(true)}
        onSearch={vi.fn().mockResolvedValue(null)}
        onClose={vi.fn()}
        {...props}
      />
    </ToastProvider>,
  )
}

describe('AddFriendModal', () => {
  test('เรนเดอร์ dialog พร้อมสามแท็บ และช่องค้นหา UID ที่มี label ถูกต้อง', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'เพิ่มเพื่อน' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'เพิ่มเพื่อน' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'รายชื่อเพื่อน' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'บล็อค' })).toBeInTheDocument()
    expect(screen.getByLabelText('รหัสผู้เล่น (UID)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ปิด' })).toBeInTheDocument()
  })

  test('ค้นหา UID เจอผู้เล่น แล้วกดเพิ่มเพื่อน — เรียก onPlayerChange พร้อมรายชื่อเพื่อนใหม่', async () => {
    const user = userEvent.setup()
    const player = makePlayer()
    const onSearch = vi.fn().mockResolvedValue(candidate)
    const onPlayerChange = vi.fn().mockResolvedValue(true)

    renderModal({ player, onSearch, onPlayerChange })

    await user.type(screen.getByLabelText('รหัสผู้เล่น (UID)'), candidate.uid)
    await user.click(screen.getByRole('button', { name: 'ค้นหา' }))

    expect(await screen.findByText('เพื่อนซี้')).toBeInTheDocument()
    expect(onSearch).toHaveBeenCalledWith(candidate.uid)

    await user.click(screen.getByRole('button', { name: 'เพิ่มเพื่อน' }))

    expect(onPlayerChange).toHaveBeenCalledWith({ ...player, friends: [candidate] })
    expect(await screen.findByText('เพิ่มเพื่อนซี้เป็นเพื่อนแล้ว')).toBeInTheDocument()
  })

  test('ค้นหา UID ไม่เจอ — แสดงข้อความไม่พบ ไม่เรียก onPlayerChange', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn().mockResolvedValue(null)
    const onPlayerChange = vi.fn()

    renderModal({ onSearch, onPlayerChange })

    await user.type(screen.getByLabelText('รหัสผู้เล่น (UID)'), '1111111111')
    await user.click(screen.getByRole('button', { name: 'ค้นหา' }))

    expect(
      await screen.findByText('ไม่พบผู้เล่นรหัสนี้ ลองตรวจสอบ UID อีกครั้ง'),
    ).toBeInTheDocument()
    expect(onPlayerChange).not.toHaveBeenCalled()
  })

  test('สลับไปแท็บ "รายชื่อเพื่อน" แสดงรายชื่อเพื่อนที่มีอยู่แล้วของผู้เล่น', async () => {
    const user = userEvent.setup()
    renderModal({ player: makePlayer({ friends: [candidate] }) })

    await user.click(screen.getByRole('tab', { name: 'รายชื่อเพื่อน' }))

    const panel = screen.getByRole('tabpanel', { name: 'รายชื่อเพื่อน' })
    expect(panel).toBeInTheDocument()
    expect(screen.getByText('เพื่อนซี้')).toBeInTheDocument()
  })

  test('กดปุ่มปิด — เรียก onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderModal({ onClose })

    await user.click(screen.getByRole('button', { name: 'ปิด' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

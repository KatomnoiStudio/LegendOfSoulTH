import { describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileModal } from './ProfileModal'
import { ToastProvider } from '../Toast/ToastProvider'
import { ROSTER } from '../../game/characters'
import { createDefaultSkillLevels } from '../../game/realtimeBattle/SkillProgressionSystem'
import type { Player } from '../../types/player'

/*
  ProfileModal เข้าถึงได้จากปุ่มอวตารบน TopBar ทุกเซสชัน — เทสต์นี้ล็อกว่าข้อมูลผู้เล่นจริง
  แสดงถูกช่อง ปุ่ม/แท็บมี label ที่ screen reader ใช้ได้ และเส้นทางโต้ตอบหลัก (สลับแท็บ,
  เปิดตัวเลือก "เดินชมจันทร์" แล้วเลือกตัวละคร, คัดลอก UID) ทำงานจริง
*/

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    uid: '1234567890',
    name: 'นักผจญภัย',
    title: 'ผู้กล้าฝึกหัด',
    level: 12,
    exp: 300,
    expToNext: 1000,
    currency: { gold: 0, gem: 0 },
    ownedCharacters: [
      {
        characterId: 'monkey-king',
        level: 5,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01',
        skillLevels: createDefaultSkillLevels(),
      },
      {
        characterId: 'pig-warrior',
        level: 3,
        exp: 0,
        expToNext: 100,
        obtainedAt: '2026-01-01',
        skillLevels: createDefaultSkillLevels(),
      },
    ],
    inventory: [],
    friends: [],
    teamSlots: [null, null, null, null],
    frameId: 'novice',
    progress: {
      flags: {},
      defeatedNpcIds: [],
      battleHistory: [
        {
          id: 'b1',
          opponent: 'ปีศาจทดสอบ',
          result: 'win',
          finishedAt: '2026-01-02',
          durationMs: 65000,
        },
      ],
    },
    ...overrides,
  }
}

function renderModal(overrides: Partial<Parameters<typeof ProfileModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSelectWalkCharacter = vi.fn()
  render(
    <ToastProvider>
      <ProfileModal
        player={buildPlayer()}
        onClose={onClose}
        walkableCharacters={ROSTER.slice(0, 2)}
        activeWalkCharacterId={ROSTER[0].id}
        onSelectWalkCharacter={onSelectWalkCharacter}
        {...overrides}
      />
    </ToastProvider>,
  )
  return { onClose, onSelectWalkCharacter }
}

const panel = () => screen.getByRole('tabpanel')

describe('ProfileModal', () => {
  test('เรนเดอร์ข้อมูลผู้เล่นจริงและปุ่ม/แท็บสำคัญมี label ที่เข้าถึงได้', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'โปรไฟล์ผู้เล่น' })).toBeInTheDocument()
    expect(screen.getByText('นักผจญภัย')).toBeInTheDocument()
    expect(screen.getByText('เลเวล 12')).toBeInTheDocument()
    // formatUid: 1234567890 -> "1234 567 890"
    expect(screen.getByText('1234 567 890')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'ปิด' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'คัดลอกรหัสผู้เล่น' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เดินชมจันทร์ — เลือกตัวละคร/ })).toBeInTheDocument()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual([
      'ตัวละครทั้งหมด(2)',
      'สัตว์เลี้ยงทั้งหมด(0)',
      'ประวัติการต่อสู้(1)',
    ])
  })

  test('สลับแท็บแล้วเนื้อหาที่แสดงตรงกับแท็บนั้นจริง', async () => {
    const user = userEvent.setup()
    renderModal()

    // เริ่มที่แท็บตัวละคร (default) — เห็นจำนวนรวม
    expect(within(panel()).getByText('ตัวละครทั้งหมด')).toBeInTheDocument()
    expect(within(panel()).getByText('2')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /ประวัติการต่อสู้/ }))
    expect(screen.getByRole('tab', { name: /ประวัติการต่อสู้/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(panel()).getByText('ปีศาจทดสอบ')).toBeInTheDocument()
    expect(within(panel()).getByText(/ชนะ/)).toBeInTheDocument()
    expect(within(panel()).getByText(/1:05/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /สัตว์เลี้ยงทั้งหมด/ }))
    expect(within(panel()).getByText('ยังไม่มีสัตว์เลี้ยง')).toBeInTheDocument()
  })

  test('เปิดตัวเลือกเดินชมจันทร์แล้วเลือกตัวละคร เรียก onSelectWalkCharacter ด้วย id ที่ถูกต้อง', async () => {
    const user = userEvent.setup()
    const { onSelectWalkCharacter } = renderModal()

    const walkButton = screen.getByRole('button', { name: /เดินชมจันทร์ — เลือกตัวละคร/ })
    expect(walkButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(walkButton)
    expect(walkButton).toHaveAttribute('aria-expanded', 'true')

    const group = screen.getByRole('group', { name: 'เลือกตัวละครที่จะพาไปเดินชมจันทร์' })
    const target = ROSTER[1]
    await user.click(within(group).getByRole('button', { name: new RegExp(target.name) }))

    expect(onSelectWalkCharacter).toHaveBeenCalledWith(target.id)
  })

  test('กดปุ่มปิด เรียก onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('คัดลอก UID สำเร็จ — รหัสดิบ (ไม่ใช่รูปแบบที่จัดช่องว่างแล้ว) ลง clipboard และแจ้งเตือนผล', async () => {
    // userEvent.setup() ติดตั้ง clipboard stub ของตัวเองให้แล้ว (เห็นได้จริงผ่าน readText) —
    // ไม่ต้อง mock navigator.clipboard เอง
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole('button', { name: 'คัดลอกรหัสผู้เล่น' }))

    expect(await navigator.clipboard.readText()).toBe('1234567890')
    expect(await screen.findByText('คัดลอกรหัสผู้เล่นแล้ว')).toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorldChat } from './WorldChat'
import type { CharacterGrantResult } from '../../data/accountRepository.shared'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

/*
  254 บรรทัด รวมคำสั่งลับผู้ดูแล (/givecharacter) ที่ตั้งใจไม่ใบ้อะไรใน UI เลย — ถ้า
  parsing/render พังตรงนี้ blast radius สูง: ผู้เล่นทั่วไปอาจเห็นคำสั่งหลุดเข้าแชทจริง
  หรือผู้ดูแลมอบตัวละครไม่ได้/มอบซ้ำโดยไม่รู้ตัว เทสต์นี้ล็อกทั้งเส้นทางแชทปกติและ
  เส้นทางคำสั่งลับ ว่าไม่ข้ามเส้นแบ่งกัน
*/

beforeEach(() => {
  // ข้อความแชทเก็บจริงใน localStorage (chatStorage.ts) — ล้างกันเทสต์ก่อนหน้ากระทบกัน
  localStorage.clear()
  // jsdom ไม่มี scrollIntoView จริง — component เรียกทุกครั้งที่ฟีดอัปเดต (ดู WorldChat.tsx)
  Element.prototype.scrollIntoView = vi.fn()
})

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    uid: '1234567890',
    name: 'ผู้ดูแล',
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

// ตัวคำสั่งลับ /givecharacter คืน player ที่อัปเดตแล้วมาด้วย (accountRepository.shared.ts) —
// เทสต์นี้แค่เช็ค UI ผลลัพธ์/ข้อความ ไม่ได้อ่านฟิลด์ player ต่อ ใส่ mock ผู้เล่นเปล่า ๆ พอ
function grantOk(characterId: string): CharacterGrantResult {
  return { ok: true, characterId, player: makePlayer() }
}

describe('WorldChat', () => {
  test('เริ่มต้นแบบปิด แสดงแค่ปุ่มเปิดแชทที่มี label ให้ screen reader', () => {
    render(<WorldChat playerName="นักเดินทาง" isAdmin={false} onGiveCharacter={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'เปิดช่องแชท' })).toBeInTheDocument()
    // แผงแชทยังไม่ถูก render เลยตอนปิดอยู่
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  test('เปิดแชทแล้วเห็นแท็บ ช่องพิมพ์ และปุ่มปิด ครบตาม role/label', async () => {
    const user = userEvent.setup()
    render(<WorldChat playerName="นักเดินทาง" isAdmin={false} onGiveCharacter={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))

    expect(screen.getByRole('region', { name: 'ช่องแชท' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แชทโลก' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แชทส่วนตัว' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แชทกิลด์' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ปิดช่องแชท' })).toBeInTheDocument()
    expect(screen.getByRole('log')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('พิมพ์ข้อความ...')).toBeInTheDocument()
  })

  test('พิมพ์ข้อความแล้วส่ง — ข้อความขึ้นในฟีดพร้อมชื่อผู้เล่น และช่องพิมพ์ถูกล้าง', async () => {
    const user = userEvent.setup()
    render(<WorldChat playerName="นักเดินทาง" isAdmin={false} onGiveCharacter={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    const input = screen.getByPlaceholderText('พิมพ์ข้อความ...')
    await user.type(input, 'สวัสดีชาวโลก')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(await screen.findByText('สวัสดีชาวโลก')).toBeInTheDocument()
    expect(screen.getByText('นักเดินทาง')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  test('ผู้เล่นทั่วไปพิมพ์ /givecharacter — ไม่เรียก onGiveCharacter ถูกส่งเป็นแชทธรรมดาแทน พร้อมแจ้งเตือนส่วนตัว', async () => {
    const user = userEvent.setup()
    const onGiveCharacter = vi.fn()
    render(<WorldChat playerName="นักเดินทาง" isAdmin={false} onGiveCharacter={onGiveCharacter} />)

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/givecharacter pig-warrior')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(onGiveCharacter).not.toHaveBeenCalled()
    // ข้อความหลุดเข้าแชทจริงเหมือนข้อความปกติทุกอย่าง (ตั้งใจไม่ใบ้)
    expect(await screen.findByText('/givecharacter pig-warrior')).toBeInTheDocument()
    expect(
      screen.getByText('ข้อความขึ้นต้นด้วย / ถูกส่งเป็นแชทปกติแล้ว (ไม่ถูกตีความเป็นคำสั่ง)'),
    ).toBeInTheDocument()
  })

  test('ผู้ดูแลพิมพ์ /givecharacter ตัวละครที่รู้จัก — เรียก onGiveCharacter และแสดงผลลัพธ์เฉพาะฝั่งตัวเอง ไม่โพสต์เข้าแชท', async () => {
    const user = userEvent.setup()
    const onGiveCharacter = vi.fn().mockResolvedValue(grantOk('pig-warrior'))
    render(<WorldChat playerName="ผู้ดูแล" isAdmin onGiveCharacter={onGiveCharacter} />)

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/givecharacter pig-warrior')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(onGiveCharacter).toHaveBeenCalledWith('pig-warrior')
    expect(await screen.findByText('ได้รับ ตือโป๊ยก่าย แล้ว')).toBeInTheDocument()
    // คำสั่งเองต้องไม่ถูกโพสต์เข้าแชทให้คนอื่นเห็น
    expect(screen.queryByText('/givecharacter pig-warrior')).not.toBeInTheDocument()
  })

  test('สลับไปแท็บแชทส่วนตัว — เห็นข้อความ "เร็ว ๆ นี้" ไม่มีฟอร์มพิมพ์', async () => {
    const user = userEvent.setup()
    render(<WorldChat playerName="นักเดินทาง" isAdmin={false} onGiveCharacter={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.click(screen.getByRole('button', { name: 'แชทส่วนตัว' }))

    expect(screen.getByText('ฟีเจอร์นี้ยังไม่เปิดให้บริการ — เร็ว ๆ นี้')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('พิมพ์ข้อความ...')).not.toBeInTheDocument()
  })
})

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorldChat } from './WorldChat'
import { loadWorldChat, postWorldChatMessage } from './chatStorage'
import type {
  CharacterGrantResult,
  CurrencyResult,
  ItemResult,
} from '../../data/accountRepository.shared'
import type { Player } from '../../types/player'
import { EMPTY_PROGRESS } from '../../types/player'

/*
  254 บรรทัด รวมคำสั่งลับผู้ดูแล (/givecharacter, /givegold, /giveitem) ที่ตั้งใจไม่ใบ้อะไร
  ใน UI เลย และคำสั่งสาธารณะ (/block, /unblock, /blocklist) ที่ตั้งใจใบ้ได้ปกติ — ถ้า
  parsing/render พังตรงนี้ blast radius สูง: ผู้เล่นทั่วไปอาจเห็นคำสั่งลับหลุดเข้าแชทจริง
  หรือผู้ดูแลมอบของไม่ได้/มอบซ้ำโดยไม่รู้ตัว เทสต์นี้ล็อกทั้งเส้นทางแชทปกติ เส้นทางคำสั่งลับ
  และเส้นทางคำสั่งสาธารณะ ว่าไม่ข้ามเส้นแบ่งกัน
*/

beforeEach(() => {
  // ข้อความแชท/บล็อกลิสต์เก็บจริงใน localStorage (chatStorage.ts/blockList.ts) — ล้างกัน
  // เทสต์ก่อนหน้ากระทบกัน
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
function currencyOk(): CurrencyResult {
  return { ok: true, amount: 0, player: makePlayer() }
}
function itemOk(): ItemResult {
  return { ok: true, player: makePlayer() }
}

/** ค่าเริ่มต้นของ prop ทั้งชุด — เทสต์แต่ละอันแค่ override เฉพาะที่สนใจ */
function renderChat(overrides: Partial<Parameters<typeof WorldChat>[0]> = {}) {
  return render(
    <WorldChat
      playerName="นักเดินทาง"
      isAdmin={false}
      onGiveCharacter={vi.fn()}
      onGiveGoldAdmin={vi.fn()}
      onGiveItemAdmin={vi.fn()}
      {...overrides}
    />,
  )
}

describe('WorldChat', () => {
  test('เริ่มต้นแบบปิด แสดงแค่ปุ่มเปิดแชทที่มี label ให้ screen reader', () => {
    renderChat()

    expect(screen.getByRole('button', { name: 'เปิดช่องแชท' })).toBeInTheDocument()
    // แผงแชทยังไม่ถูก render เลยตอนปิดอยู่
    expect(screen.queryByRole('log')).not.toBeInTheDocument()
  })

  test('เปิดแชทแล้วเห็นแท็บ ช่องพิมพ์ และปุ่มปิด ครบตาม role/label', async () => {
    const user = userEvent.setup()
    renderChat()

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
    renderChat()

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
    renderChat({ onGiveCharacter })

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
    renderChat({ playerName: 'ผู้ดูแล', isAdmin: true, onGiveCharacter })

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/givecharacter pig-warrior')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(onGiveCharacter).toHaveBeenCalledWith('pig-warrior')
    expect(await screen.findByText('ได้รับ ตือโป๊ยก่าย แล้ว')).toBeInTheDocument()
    // คำสั่งเองต้องไม่ถูกโพสต์เข้าแชทให้คนอื่นเห็น
    expect(screen.queryByText('/givecharacter pig-warrior')).not.toBeInTheDocument()
  })

  test('ผู้ดูแลพิมพ์ /givegold — เรียก onGiveGoldAdmin ด้วยจำนวนที่ถูกต้อง', async () => {
    const user = userEvent.setup()
    const onGiveGoldAdmin = vi.fn().mockResolvedValue(currencyOk())
    renderChat({ playerName: 'ผู้ดูแล', isAdmin: true, onGiveGoldAdmin })

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/givegold 500')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(onGiveGoldAdmin).toHaveBeenCalledWith(500)
    expect(await screen.findByText('เสกทอง 500 แล้ว')).toBeInTheDocument()
  })

  test('ผู้เล่นทั่วไปพิมพ์ /givegold — ไม่เรียก onGiveGoldAdmin ถูกส่งเป็นแชทธรรมดาแทน', async () => {
    const user = userEvent.setup()
    const onGiveGoldAdmin = vi.fn()
    renderChat({ onGiveGoldAdmin })

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/givegold 500')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(onGiveGoldAdmin).not.toHaveBeenCalled()
    expect(await screen.findByText('/givegold 500')).toBeInTheDocument()
  })

  test('ผู้ดูแลพิมพ์ /giveitem — เรียก onGiveItemAdmin ด้วย item_id และจำนวนที่ถูกต้อง', async () => {
    const user = userEvent.setup()
    const onGiveItemAdmin = vi.fn().mockResolvedValue(itemOk())
    renderChat({ playerName: 'ผู้ดูแล', isAdmin: true, onGiveItemAdmin })

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/giveitem spirit-incense 5')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(onGiveItemAdmin).toHaveBeenCalledWith('spirit-incense', 5)
    expect(await screen.findByText('เสก spirit-incense x5 แล้ว')).toBeInTheDocument()
  })

  test('ผู้เล่นทั่วไปพิมพ์ /block — ทำงานได้ปกติ (คำสั่งสาธารณะ ไม่ใช่ความลับ)', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/block SomePlayer')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(
      await screen.findByText('บล็อก "SomePlayer" แล้ว — ไม่แสดงข้อความจากชื่อนี้อีก'),
    ).toBeInTheDocument()
    // คำสั่งเองต้องไม่ถูกโพสต์เข้าแชทเหมือนคำสั่งลับ
    expect(screen.queryByText('/block SomePlayer')).not.toBeInTheDocument()
  })

  test('บล็อกแล้วข้อความจากชื่อนั้นหายจากฟีดทันที (แม้เป็นข้อความเก่าที่มีอยู่แล้ว)', async () => {
    const user = userEvent.setup()
    // ฝังข้อความเก่าจาก "ตัวป่วน" ไว้ล่วงหน้าใน localStorage เหมือนมันเคยทักมาก่อนเราเปิดแชท
    localStorage.setItem(
      'los:worldchat:v1',
      JSON.stringify([
        { id: '1', authorName: 'ตัวป่วน', text: 'สแปม', createdAt: '2026-01-01T00:00:00.000Z' },
      ]),
    )
    renderChat()

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    expect(await screen.findByText('สแปม')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/block ตัวป่วน')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(screen.queryByText('สแปม')).not.toBeInTheDocument()
  })

  test('/unblock เอาชื่อออกจากบล็อกลิสต์ — ข้อความกลับมาเห็นได้ (re-render/re-post)', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/block ตัวป่วน')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))
    expect(
      await screen.findByText('บล็อก "ตัวป่วน" แล้ว — ไม่แสดงข้อความจากชื่อนี้อีก'),
    ).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/unblock ตัวป่วน')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(await screen.findByText('เลิกบล็อก "ตัวป่วน" แล้ว')).toBeInTheDocument()
  })

  test('/blocklist แสดงรายชื่อที่บล็อกไว้', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/block A')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))
    await user.type(screen.getByPlaceholderText('พิมพ์ข้อความ...'), '/blocklist')
    await user.click(screen.getByRole('button', { name: 'ส่ง' }))

    expect(await screen.findByText('บล็อกไว้: A')).toBeInTheDocument()
  })

  test('สลับไปแท็บแชทส่วนตัว — เห็นข้อความ "เร็ว ๆ นี้" ไม่มีฟอร์มพิมพ์', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'เปิดช่องแชท' }))
    await user.click(screen.getByRole('button', { name: 'แชทส่วนตัว' }))

    expect(screen.getByText('ฟีเจอร์นี้ยังไม่เปิดให้บริการ — เร็ว ๆ นี้')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('พิมพ์ข้อความ...')).not.toBeInTheDocument()
  })
})

// ─── Known Scars (Guardian Tales Social & Chat incident precedents) ───

describe('Scar 1: Chat message persistence & reload consistency (Guardian Tales Nov 2021)', () => {
  test('messages posted during sessions persist in localStorage and restore upon reload', async () => {
    await postWorldChatMessage('ผู้กล้า', 'ข้อความทดสอบที่ 1')
    await postWorldChatMessage('ผู้ช่วย', 'ข้อความทดสอบที่ 2')

    const loaded = loadWorldChat()
    expect(loaded).toHaveLength(2)
    expect(loaded[0].text).toBe('ข้อความทดสอบที่ 1')
    expect(loaded[1].text).toBe('ข้อความทดสอบที่ 2')
  })
})

describe('Scar 2: Unbounded chat storage protection & 200-message FIFO cap (Guardian Tales Nov 2021)', () => {
  test('rapid flood of messages is strictly capped at latest 200 items without unbounded growth', async () => {
    // โพสต์ข้อความจำลอง 210 ข้อความ
    const promises: Promise<unknown>[] = []
    for (let i = 1; i <= 210; i++) {
      promises.push(postWorldChatMessage('Spammer', `Message #${i}`))
    }
    await Promise.all(promises)

    const finalMessages = loadWorldChat()
    expect(finalMessages).toHaveLength(200)
    // 10 ข้อความแรกต้องถูกเลื่อนออก ข้อความแรกที่เหลือต้องเป็น Message #11
    expect(finalMessages[0].text).toBe('Message #11')
    expect(finalMessages[199].text).toBe('Message #210')
  })
})

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCharacter } from '../../game/characters'
import type {
  CharacterGrantResult,
  CurrencyResult,
  ItemResult,
} from '../../data/accountRepository.shared'
import { ADMIN_COMMAND_HELP, COMMAND_HELP, resolveCommandForSender } from './commands'
import { loadWorldChat, postWorldChatMessage, subscribeToWorldChat } from './chatStorage'
import type { ChatMessage } from './chatStorage'
import { blockName, loadBlockedNames, unblockName } from './blockList'
import { reportError } from '../../lib/errors/reportError'
import styles from './WorldChat.module.css'

/**
 * ช่องแชทมุมซ้ายล่างของลอบบี้ — ผู้เล่นทุกคนเห็นและใช้ได้ ไม่จำกัดเฉพาะผู้ดูแล
 *
 * "แชทโลก" เก็บข้อความส่วนกลางใน Supabase และรับข้อความใหม่ผ่าน Realtime ชื่อผู้ส่งกับ
 * timestamp มาจาก session/profile ฝั่ง server ไม่เชื่อค่าที่ client ส่งมา
 * ส่วน "แชทส่วนตัว"/"แชทกิลด์" ยังเป็นแค่แท็บที่บอกว่าเร็ว ๆ นี้ เพราะเกมยังไม่มีระบบ
 * เพื่อน-แบบเรียลไทม์/กิลด์รองรับ
 *
 * คำสั่งผู้ดูแล (เช่น /givecharacter) ยังทำงานอยู่เบื้องหลังสำหรับบัญชีที่เป็นผู้ดูแล
 * เท่านั้น (ดู supabase/migrations/0004_admin_accounts.sql) แต่ตั้งใจไม่ใบ้อะไรใน UI เลย — ผู้เล่นทั่วไปเห็น
 * เป็นช่องแชทธรรมดา 100% ผลลัพธ์ของคำสั่งก็แสดงเฉพาะฝั่งผู้พิมพ์เอง ไม่ถูกโพสต์เข้า
 * แชทโลกให้คนอื่นเห็น — ถ้าบัญชีที่พิมพ์ "ดูเหมือน" คำสั่ง (ขึ้นต้น /) แต่ไม่ใช่ผู้ดูแล
 * (หรือเป็นผู้ดูแลแต่สลับไปอยู่บัญชีอื่นโดยไม่ทันสังเกต) ข้อความจะถูกส่งเป็นแชทธรรมดา
 * ตามปกติ — เพิ่มการแจ้งเตือนส่วนตัว (เห็นเฉพาะฝั่งผู้พิมพ์) กันเคสนี้ไว้ ไม่เปลี่ยน
 * พฤติกรรมที่คนอื่นเห็น
 */

/** ผู้เล่นเห็นบรรทัดนี้ตรง ๆ ทุกครั้งที่เปิดแท็บโลก — ไม่ใช่แค่ตอน feed ว่าง */
const SCOPE_NOTE = 'แชทโลกส่วนกลาง — ผู้เล่นที่เข้าสู่ระบบเห็นข้อความร่วมกันทุกอุปกรณ์'

type Tab = 'world' | 'private' | 'guild'

interface WorldChatProps {
  /** ใช้คำสั่งลับได้ไหม (ดู supabase/migrations/0004_admin_accounts.sql) — ไม่มีผลต่อหน้าตา UI เลย */
  isAdmin: boolean
  /** มอบตัวละครให้บัญชีที่ล็อกอินอยู่ (ดู useAuth.grantCharacter) — เรียกเฉพาะตอน isAdmin */
  onGiveCharacter: (characterId: string) => Promise<CharacterGrantResult>
  /** เสกทองให้บัญชีที่ล็อกอินอยู่ (ดู useAuth.grantGoldAdmin) — เรียกเฉพาะตอน isAdmin */
  onGiveGoldAdmin: (amount: number) => Promise<CurrencyResult>
  /** เสกไอเทมให้บัญชีที่ล็อกอินอยู่ (ดู useAuth.grantItemAdmin) — เรียกเฉพาะตอน isAdmin */
  onGiveItemAdmin: (itemId: string, quantity: number) => Promise<ItemResult>
}

interface SystemEntry {
  id: string
  kind: 'system'
  text: string
  tone: 'ok' | 'error'
  createdAt: string
}

type FeedEntry = (ChatMessage & { kind: 'message' }) | SystemEntry

const TABS: { id: Tab; label: string }[] = [
  { id: 'world', label: 'แชทโลก' },
  { id: 'private', label: 'แชทส่วนตัว' },
  { id: 'guild', label: 'แชทกิลด์' },
]

let systemEntrySeq = 0

export function WorldChat({
  isAdmin,
  onGiveCharacter,
  onGiveGoldAdmin,
  onGiveItemAdmin,
}: WorldChatProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('world')
  const [value, setValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // ผลลัพธ์คำสั่งผู้ดูแล เห็นเฉพาะฝั่งตัวเอง ไม่ถูกเขียนลง storage ที่คนอื่นอ่านได้
  const [systemEntries, setSystemEntries] = useState<SystemEntry[]>([])
  // รายชื่อที่บล็อกไว้ — client-local เหมือนแชทเอง (ดู blockList.ts)
  const [blockedNames, setBlockedNames] = useState<string[]>(() => loadBlockedNames())
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const refresh = () => {
      void loadWorldChat().then((nextMessages) => {
        if (active) setMessages(nextMessages)
        return undefined
      })
    }

    refresh()
    const unsubscribe = subscribeToWorldChat(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open, tab])

  const feed = useMemo<FeedEntry[]>(() => {
    const chatEntries: FeedEntry[] = messages
      .filter((message) => !blockedNames.includes(message.authorName))
      .map((message) => ({ ...message, kind: 'message' }))
    return [...chatEntries, ...systemEntries].toSorted((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )
  }, [messages, systemEntries, blockedNames])

  // เลื่อนลงล่างสุดเสมอเมื่อมีข้อความใหม่หรือเพิ่งเปิดแท็บโลก
  useEffect(() => {
    if (open && tab === 'world') feedEndRef.current?.scrollIntoView({ block: 'end' })
  }, [feed, open, tab])

  const pushSystemEntry = useCallback((text: string, tone: SystemEntry['tone']) => {
    systemEntrySeq += 1
    setSystemEntries((previous) =>
      [
        ...previous,
        {
          id: `sys-${systemEntrySeq}`,
          kind: 'system' as const,
          text,
          tone,
          createdAt: new Date().toISOString(),
        },
      ].slice(-20),
    )
  }, [])

  const send = useCallback(async () => {
    const text = value.trim()
    if (text.length === 0) return
    setValue('')

    // คำสั่งลับใช้ได้เฉพาะบัญชีผู้ดูแล — ผู้เล่นทั่วไปพิมพ์ "/อะไรก็ตาม" แล้วมันจะถูกส่ง
    // เป็นข้อความแชทปกติเสมอ ไม่มีการแจ้งว่ามันคือคำสั่งที่รู้จักไม่รู้จัก (ตั้งใจไม่ใบ้)
    const parsed = resolveCommandForSender(isAdmin, text)
    if (parsed) {
      if (parsed.kind === 'help') {
        for (const line of COMMAND_HELP) pushSystemEntry(line, 'ok')
        if (isAdmin) for (const line of ADMIN_COMMAND_HELP) pushSystemEntry(line, 'ok')
        return
      }
      if (parsed.kind === 'error') {
        pushSystemEntry(parsed.message, 'error')
        return
      }
      if (parsed.kind === 'block') {
        setBlockedNames(blockName(parsed.name))
        pushSystemEntry(`บล็อก "${parsed.name}" แล้ว — ไม่แสดงข้อความจากชื่อนี้อีก`, 'ok')
        return
      }
      if (parsed.kind === 'unblock') {
        setBlockedNames(unblockName(parsed.name))
        pushSystemEntry(`เลิกบล็อก "${parsed.name}" แล้ว`, 'ok')
        return
      }
      if (parsed.kind === 'blocklist') {
        pushSystemEntry(
          blockedNames.length === 0
            ? 'ยังไม่ได้บล็อกใครไว้'
            : `บล็อกไว้: ${blockedNames.join(', ')}`,
          'ok',
        )
        return
      }
      setBusy(true)
      try {
        if (parsed.kind === 'give-character') {
          const result = await onGiveCharacter(parsed.characterId)
          if (result.ok) {
            const character = getCharacter(result.characterId)
            pushSystemEntry(`ได้รับ ${character?.name ?? result.characterId} แล้ว`, 'ok')
          } else {
            pushSystemEntry(result.error, 'error')
          }
        } else if (parsed.kind === 'give-gold') {
          const result = await onGiveGoldAdmin(parsed.amount)
          pushSystemEntry(
            result.ok ? `เสกทอง ${parsed.amount} แล้ว` : result.error,
            result.ok ? 'ok' : 'error',
          )
        } else if (parsed.kind === 'give-item') {
          const result = await onGiveItemAdmin(parsed.itemId, parsed.quantity)
          pushSystemEntry(
            result.ok ? `เสก ${parsed.itemId} x${parsed.quantity} แล้ว` : result.error,
            result.ok ? 'ok' : 'error',
          )
        }
      } finally {
        setBusy(false)
      }
      return
    }

    // ขึ้นต้นด้วย / แต่ไม่ถูกตีความเป็นคำสั่ง (ไม่ใช่ผู้ดูแล หรือผู้ดูแลพลาดสลับบัญชี) —
    // ข้อความยังถูกส่งเป็นแชทปกติเหมือนเดิมทุกอย่าง (คนอื่นเห็นข้อความเฉย ๆ ไม่รู้ว่ามันคือ
    // คำสั่งที่พลาด) แค่แจ้งเตือนส่วนตัวให้ผู้พิมพ์เองรู้ตัว กันเคสผู้ดูแลพิมพ์คำสั่งลับ
    // ผิดบัญชีแล้วข้อความหลุดไปเป็นแชทถาวรโดยไม่รู้ตัว
    if (text.startsWith('/')) {
      pushSystemEntry(
        'ข้อความขึ้นต้นด้วย / ถูกส่งเป็นแชทปกติแล้ว (ไม่ถูกตีความเป็นคำสั่ง)',
        'error',
      )
    }

    setBusy(true)
    try {
      setMessages(await postWorldChatMessage(text))
    } catch (error) {
      // รหัสนี้มีในทะเบียนมาตั้งแต่ต้นแต่ไม่เคยถูกเรียกจากที่นี่ — การส่งแชทที่ล้ม (โดนแบน,
      // RLS ปฏิเสธ, เน็ตหลุด) จึงแยกสาเหตุไม่ได้เลย เห็นแต่ข้อความเดียวกันหมดบนจอผู้เล่น
      reportError('WORLD_CHAT_SEND_FAIL', 'silent', error)
      pushSystemEntry('ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error')
    } finally {
      setBusy(false)
    }
  }, [
    isAdmin,
    onGiveCharacter,
    onGiveGoldAdmin,
    onGiveItemAdmin,
    pushSystemEntry,
    blockedNames,
    value,
  ])

  if (!open) {
    return (
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-label="เปิดช่องแชท"
      >
        <span className={styles.launcherIcon} aria-hidden="true" />
        แชท
      </button>
    )
  }

  return (
    <section className={styles.panel} aria-label="ช่องแชท">
      <header className={styles.tabs}>
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={tab === entry.id ? styles.tabActive : styles.tab}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="ปิดช่องแชท"
        >
          ×
        </button>
      </header>

      {tab === 'world' ? (
        <>
          <p className={styles.scopeNote}>{SCOPE_NOTE}</p>
          <ol className={styles.feed} role="log" aria-live="polite">
            {feed.length === 0 ? (
              <li className={styles.hint}>ยังไม่มีข้อความ — ทักทายกันก่อนเลย</li>
            ) : null}
            {feed.map((entry) =>
              entry.kind === 'message' ? (
                <li key={entry.id} className={styles.message}>
                  <span className={styles.author}>{entry.authorName}</span>
                  <span className={styles.text}>{entry.text}</span>
                </li>
              ) : (
                <li
                  key={entry.id}
                  className={entry.tone === 'ok' ? styles.systemOk : styles.systemError}
                >
                  {entry.text}
                </li>
              ),
            )}
            <div ref={feedEndRef} />
          </ol>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              if (!busy) void send()
            }}
          >
            <input
              ref={inputRef}
              className={styles.input}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                // Esc ปิดช่อง และหยุดไม่ให้ลอยไปโดนคีย์เดิน (WASD/ลูกศร) ของฉากเดินด้านหลัง
                if (event.key === 'Escape') setOpen(false)
                event.stopPropagation()
              }}
              placeholder="พิมพ์ข้อความ..."
              maxLength={280}
              disabled={busy}
              autoComplete="off"
            />
            <button
              type="submit"
              className={styles.send}
              disabled={busy || value.trim().length === 0}
            >
              ส่ง
            </button>
          </form>
        </>
      ) : (
        <p className={styles.hint}>ฟีเจอร์นี้ยังไม่เปิดให้บริการ — เร็ว ๆ นี้</p>
      )}
    </section>
  )
}

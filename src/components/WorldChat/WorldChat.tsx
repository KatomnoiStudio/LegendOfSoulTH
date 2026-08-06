import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCharacter } from '../../game/characters'
import type { CharacterGrantResult } from '../../data/accountRepository'
import { COMMAND_HELP, parseCommand } from './commands'
import { loadWorldChat, postWorldChatMessage, WORLD_CHAT_STORAGE_KEY } from './chatStorage'
import type { ChatMessage } from './chatStorage'
import styles from './WorldChat.module.css'

/**
 * ช่องแชทมุมซ้ายล่างของลอบบี้ — ผู้เล่นทุกคนเห็นและใช้ได้ ไม่จำกัดเฉพาะผู้ดูแล
 *
 * "แชทโลก" ทำงานจริง (เก็บ/อ่านผ่าน localStorage — ดูข้อจำกัดเรื่องไม่มี backend ใน
 * chatStorage.ts) ส่วน "แชทส่วนตัว"/"แชทกิลด์" ยังเป็นแค่แท็บที่บอกว่าเร็ว ๆ นี้
 * เพราะเกมยังไม่มีระบบเพื่อน-แบบเรียลไทม์/กิลด์รองรับ
 *
 * คำสั่งผู้ดูแล (เช่น /givecharacter) ยังทำงานอยู่เบื้องหลังสำหรับบัญชีที่เป็นผู้ดูแล
 * เท่านั้น (ดู src/data/admins.ts) แต่ตั้งใจไม่ใบ้อะไรใน UI เลย — ผู้เล่นทั่วไปเห็น
 * เป็นช่องแชทธรรมดา 100% ผลลัพธ์ของคำสั่งก็แสดงเฉพาะฝั่งผู้พิมพ์เอง ไม่ถูกโพสต์เข้า
 * แชทโลกให้คนอื่นเห็น
 */

type Tab = 'world' | 'private' | 'guild'

interface WorldChatProps {
  /** ชื่อที่จะแปะไว้หน้าข้อความ */
  playerName: string
  /** ใช้คำสั่งลับได้ไหม (ดู src/data/admins.ts) — ไม่มีผลต่อหน้าตา UI เลย */
  isAdmin: boolean
  /** มอบตัวละครให้บัญชีที่ล็อกอินอยู่ (ดู useAuth.grantCharacter) — เรียกเฉพาะตอน isAdmin */
  onGiveCharacter: (characterId: string) => Promise<CharacterGrantResult>
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

export function WorldChat({ playerName, isAdmin, onGiveCharacter }: WorldChatProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('world')
  const [value, setValue] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadWorldChat())
  // ผลลัพธ์คำสั่งผู้ดูแล เห็นเฉพาะฝั่งตัวเอง ไม่ถูกเขียนลง storage ที่คนอื่นอ่านได้
  const [systemEntries, setSystemEntries] = useState<SystemEntry[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)

  // รับข้อความจากแท็บ/บัญชีอื่นบนเครื่องเดียวกันแบบเรียลไทม์ (ดูข้อจำกัดใน chatStorage.ts —
  // 'storage' event ยิงเฉพาะข้ามแท็บ ไม่ยิงในแท็บที่เขียนเอง จึงต้องอัปเดต state ตรง ๆ
  // ตอนโพสต์ข้อความของตัวเองด้วย ไม่ได้พึ่ง event นี้อย่างเดียว)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WORLD_CHAT_STORAGE_KEY) setMessages(loadWorldChat())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open, tab])

  const feed = useMemo<FeedEntry[]>(() => {
    const chatEntries: FeedEntry[] = messages.map((message) => ({ ...message, kind: 'message' }))
    return [...chatEntries, ...systemEntries].toSorted((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [messages, systemEntries])

  // เลื่อนลงล่างสุดเสมอเมื่อมีข้อความใหม่หรือเพิ่งเปิดแท็บโลก
  useEffect(() => {
    if (open && tab === 'world') feedEndRef.current?.scrollIntoView({ block: 'end' })
  }, [feed, open, tab])

  const pushSystemEntry = useCallback((text: string, tone: SystemEntry['tone']) => {
    systemEntrySeq += 1
    setSystemEntries((previous) =>
      [
        ...previous,
        { id: `sys-${systemEntrySeq}`, kind: 'system' as const, text, tone, createdAt: new Date().toISOString() },
      ].slice(-20),
    )
  }, [])

  const send = useCallback(async () => {
    const text = value.trim()
    if (text.length === 0) return
    setValue('')

    // คำสั่งลับใช้ได้เฉพาะบัญชีผู้ดูแล — ผู้เล่นทั่วไปพิมพ์ "/อะไรก็ตาม" แล้วมันจะถูกส่ง
    // เป็นข้อความแชทปกติเสมอ ไม่มีการแจ้งว่ามันคือคำสั่งที่รู้จักไม่รู้จัก (ตั้งใจไม่ใบ้)
    const parsed = isAdmin ? parseCommand(text) : null
    if (parsed) {
      if (parsed.kind === 'help') {
        for (const line of COMMAND_HELP) pushSystemEntry(line, 'ok')
        return
      }
      if (parsed.kind === 'error') {
        pushSystemEntry(parsed.message, 'error')
        return
      }
      setBusy(true)
      try {
        const result = await onGiveCharacter(parsed.characterId)
        if (result.ok) {
          const character = getCharacter(result.characterId)
          pushSystemEntry(`ได้รับ ${character?.name ?? result.characterId} แล้ว`, 'ok')
        } else {
          pushSystemEntry(result.error, 'error')
        }
      } finally {
        setBusy(false)
      }
      return
    }

    setMessages(postWorldChatMessage(playerName, text))
  }, [isAdmin, onGiveCharacter, playerName, pushSystemEntry, value])

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
          <ol className={styles.feed}>
            {feed.length === 0 ? <li className={styles.hint}>ยังไม่มีข้อความ — ทักทายกันก่อนเลย</li> : null}
            {feed.map((entry) =>
              entry.kind === 'message' ? (
                <li key={entry.id} className={styles.message}>
                  <span className={styles.author}>{entry.authorName}</span>
                  <span className={styles.text}>{entry.text}</span>
                </li>
              ) : (
                <li key={entry.id} className={entry.tone === 'ok' ? styles.systemOk : styles.systemError}>
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
            <button type="submit" className={styles.send} disabled={busy || value.trim().length === 0}>
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

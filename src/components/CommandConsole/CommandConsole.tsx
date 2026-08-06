import { useCallback, useEffect, useRef, useState } from 'react'
import { getCharacter } from '../../game/characters'
import type { CharacterGrantResult } from '../../data/accountRepository'
import { COMMAND_HELP, parseCommand } from './commands'
import styles from './CommandConsole.module.css'

/**
 * ช่องพิมพ์คำสั่งผู้ดูแล มุมซ้ายล่างของลอบบี้
 *
 * ⚠️ ไม่ใช่ระบบความปลอดภัย — ดูคำเตือนเต็มใน src/data/admins.ts
 * component นี้ถูก render เฉพาะเมื่อ isAdmin เป็น true เท่านั้น (ดู LobbyPage)
 * ผู้เล่นทั่วไปจึงไม่เห็นช่องนี้เลย แต่คนที่แก้ localStorage เป็นก็เปิดใช้ได้อยู่ดี
 */

interface CommandConsoleProps {
  /** มอบตัวละครให้บัญชีที่ล็อกอินอยู่ (ดู useAuth.grantCharacter) */
  onGiveCharacter: (characterId: string) => Promise<CharacterGrantResult>
}

interface LogLine {
  id: number
  text: string
  /* 'echo' ไม่ใช่ 'input' เพราะชื่อคลาสจะไปชนกับ .input ของช่องพิมพ์ใน CSS module
     (styles[line.tone] จะหยิบสไตล์ผิดตัวทันที) */
  tone: 'echo' | 'ok' | 'error' | 'info'
}

const MAX_LOG_LINES = 8

export function CommandConsole({ onGiveCharacter }: CommandConsoleProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [log, setLog] = useState<LogLine[]>([])
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextIdRef = useRef(0)

  const append = useCallback((text: string, tone: LogLine['tone']) => {
    setLog((previous) => {
      nextIdRef.current += 1
      // เก็บเฉพาะบรรทัดล่าสุด กันประวัติยาวจนดันฉากเกม
      return [...previous, { id: nextIdRef.current, text, tone }].slice(-MAX_LOG_LINES)
    })
  }, [])

  // โฟกัสให้อัตโนมัติตอนเปิด จะได้พิมพ์ต่อได้เลยไม่ต้องคลิกซ้ำ
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const run = useCallback(async () => {
    const parsed = parseCommand(value)
    if (!parsed) return

    append(value.trim(), 'echo')
    setValue('')

    if (parsed.kind === 'help') {
      for (const line of COMMAND_HELP) append(line, 'info')
      return
    }

    if (parsed.kind === 'error') {
      append(parsed.message, 'error')
      return
    }

    setBusy(true)
    try {
      const result = await onGiveCharacter(parsed.characterId)
      if (result.ok) {
        const character = getCharacter(result.characterId)
        append(`ได้รับ ${character?.name ?? result.characterId} แล้ว`, 'ok')
      } else {
        append(result.error, 'error')
      }
    } finally {
      setBusy(false)
    }
  }, [append, onGiveCharacter, value])

  if (!open) {
    return (
      <button type="button" className={styles.launcher} onClick={() => setOpen(true)}>
        <span aria-hidden="true">/</span> คำสั่ง
      </button>
    )
  }

  return (
    <section className={styles.console} aria-label="ช่องคำสั่งผู้ดูแล">
      <header className={styles.header}>
        <span className={styles.title}>คำสั่งผู้ดูแล</span>
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="ปิดช่องคำสั่ง"
        >
          ×
        </button>
      </header>

      {log.length > 0 ? (
        <ol className={styles.log}>
          {log.map((line) => (
            <li key={line.id} className={styles[line.tone]}>
              {line.tone === 'echo' ? '› ' : ''}
              {line.text}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.hint}>พิมพ์ /help เพื่อดูคำสั่งทั้งหมด</p>
      )}

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy) void run()
        }}
      >
        <span className={styles.prompt} aria-hidden="true">
          /
        </span>
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
          placeholder="givecharacter pig"
          disabled={busy}
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </section>
  )
}

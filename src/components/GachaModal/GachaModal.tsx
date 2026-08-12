import { useRef, useState } from 'react'
import type { GachaPullResult } from '../../data/accountRepository.shared'
import { getCharacter, RARITY_LABEL } from '../../game/characters'
import { STANDARD_BANNER } from '../../game/gacha/gachaConfig'
import { useModalA11y } from '../../hooks/useModalA11y'
import { reportError } from '../../lib/errors/reportError'
import type { Player } from '../../types/player'
import styles from './GachaModal.module.css'

interface GachaModalProps {
  player: Player
  onPull: (bannerId: string, pullCount: 1 | 10, requestId: string) => Promise<GachaPullResult>
  onClose: () => void
}

interface PendingRequest {
  id: string
  count: 1 | 10
}

/** Lobby entry point for P9. Results are rendered only from the authenticated server RPC. */
export function GachaModal({ player, onPull, onClose }: GachaModalProps) {
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onClose)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<Extract<GachaPullResult, { ok: true }> | null>(null)
  const pendingRequest = useRef<PendingRequest | null>(null)

  const pity = player.gachaPity?.[STANDARD_BANNER.id] ?? 0

  const handlePull = async (count: 1 | 10) => {
    if (busy) return
    setBusy(true)
    setError(null)

    const request =
      pendingRequest.current?.count === count
        ? pendingRequest.current
        : { id: globalThis.crypto.randomUUID(), count }
    pendingRequest.current = request

    try {
      const result = await onPull(STANDARD_BANNER.id, count, request.id)
      if (!result.ok) {
        // เซิร์ฟเวอร์ปฏิเสธ (ทรัพยากรไม่พอ, แบนเนอร์ปิด, requestId ซ้ำ) — ผู้เล่นเห็นข้อความแล้ว
        // แต่ถ้าไม่รายงานด้วย ฝั่งเราจะไม่รู้เลยว่ามีคนกดอัญเชิญแล้วโดนปฏิเสธรัว ๆ อยู่หรือเปล่า
        reportError('GACHA_PULL_REJECTED', 'silent', result.error, { pullCount: count })
        setError(result.error)
        return
      }

      pendingRequest.current = null
      setLastResult(result)
    } catch (cause) {
      reportError('GACHA_PULL_FAIL', 'silent', cause, { pullCount: count })
      setError('เชื่อมต่อระบบอัญเชิญไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.backdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gacha-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>STANDARD BANNER</p>
            <h2 id="gacha-title" className={styles.title}>
              {STANDARD_BANNER.name}
            </h2>
            <p className={styles.description}>{STANDARD_BANNER.description}</p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="ปิดหน้าอัญเชิญ"
          >
            ×
          </button>
        </header>

        <div className={styles.summary}>
          <span>หยกคงเหลือ {player.currency.gem.toLocaleString('th-TH')}</span>
          <span>
            การันตี {pity}/{STANDARD_BANNER.pityThreshold}
          </span>
        </div>

        <section className={styles.pool} aria-label="วีรชนในตู้">
          {STANDARD_BANNER.pool.map((entry) => {
            const character = getCharacter(entry.characterId)
            if (!character) return null
            return (
              <article key={entry.characterId} className={styles.poolCard}>
                <img
                  src={character.model.spriteUrl}
                  alt=""
                  width={396}
                  height={376}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <div>
                  <strong>{character.name}</strong>
                  <span>{character.role}</span>
                  <small>{RARITY_LABEL[entry.rarity]}</small>
                </div>
              </article>
            )
          })}
        </section>

        {lastResult ? (
          <section className={styles.results} aria-live="polite" aria-label="ผลการอัญเชิญ">
            <h3>ผลการอัญเชิญ</h3>
            <ul>
              {lastResult.results.map((item, index) => {
                const character = getCharacter(item.characterId)
                return (
                  <li key={`${item.characterId}-${index}`}>
                    <strong>{character?.name ?? item.characterId}</strong>
                    <span>
                      {item.isNew ? 'วีรชนใหม่' : `ตัวซ้ำ +${item.shardsGranted} ชิ้นส่วน`}
                    </span>
                    {item.isPity ? <small>การันตี</small> : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <footer className={styles.actions}>
          <button type="button" disabled={busy} onClick={() => void handlePull(1)}>
            {busy ? 'กำลังอัญเชิญ…' : `อัญเชิญ 1 ครั้ง · ${STANDARD_BANNER.costSingle} หยก`}
          </button>
          <button type="button" disabled={busy} onClick={() => void handlePull(10)}>
            {busy ? 'กำลังอัญเชิญ…' : `อัญเชิญ 10 ครั้ง · ${STANDARD_BANNER.costMulti} หยก`}
          </button>
        </footer>

        <p className={styles.disclosure}>
          อัตรา: ตำนาน 5% · มหากาพย์ 25% · หายาก 70% · การตัดหยก ผลสุ่ม การันตี และชิ้นส่วน
          ยืนยันในธุรกรรมฝั่งเซิร์ฟเวอร์เดียวกัน
        </p>
      </div>
    </div>
  )
}

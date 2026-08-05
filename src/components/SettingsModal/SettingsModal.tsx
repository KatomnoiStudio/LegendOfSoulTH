import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { CurrencyResult } from '../../data/accountRepository'
import { GAME_INFO } from '../../game/gameInfo'
import {
  CouponIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  SettingsIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import styles from './SettingsModal.module.css'

type TabId = 'info' | 'audio' | 'coupon'

/** ปรับเสียงทีละ 2% */
const VOLUME_STEP = 2

/** โค้ดคูปองใช้ได้เฉพาะ A–Z และตัวเลข */
const COUPON_DISALLOWED = /[^A-Z0-9]/g
const COUPON_MIN_LENGTH = 4
const COUPON_MAX_LENGTH = 16

/** ช่องเสียงที่ปรับแยกกันได้ */
export type AudioChannel = 'master' | 'music' | 'sfx'

export interface AudioSettings {
  /** ระดับเสียงของแต่ละช่อง 0–100 */
  master: number
  music: number
  sfx: number
  /** ปิดเสียงทั้งหมด — ทับค่าทั้งสามช่องโดยไม่ลบค่าที่ตั้งไว้ */
  muted: boolean
}

const CHANNELS: { id: AudioChannel; label: string }[] = [
  { id: 'master', label: 'เสียงหลัก' },
  { id: 'music', label: 'เพลงประกอบ' },
  { id: 'sfx', label: 'เอฟเฟกต์เสียง (SFX)' },
]

interface SettingsModalProps {
  audio: AudioSettings
  onAudioChange: (next: AudioSettings) => void
  /** ออกจากบัญชี — กลับไปหน้าสมัคร/เข้าสู่ระบบ */
  onLogout: () => Promise<void>
  /** แลกโค้ดคูปองเป็นหยก */
  onRedeemCoupon: (code: string) => Promise<CurrencyResult>
  /** จำนวนตัวละครที่ผู้เล่นครอบครองแล้ว — ให้ตรงกับตัวเลขใน CharacterRosterModal */
  ownedCharacterCount: number
  onClose: () => void
}

/**
 * หน้าต่างตั้งค่า — แบ่งเป็นสองหมวด อยู่คนละหน้ากัน สลับด้วยแท็บ
 *
 * หน้า "เสียง"  : เพิ่ม/ลด/ปิดเสียง
 * หน้า "คูปอง" : กรอกโค้ดแลกของรางวัล
 *
 * ค่าเสียงถูกยกไปเก็บที่ LobbyPage เพื่อให้ค่าคงอยู่เมื่อปิดแล้วเปิดใหม่
 * และพร้อมส่งต่อให้ระบบเสียงจริงเมื่อมีการเชื่อมต่อ
 */
export function SettingsModal({
  audio,
  onAudioChange,
  onLogout,
  onRedeemCoupon,
  ownedCharacterCount,
  onClose,
}: SettingsModalProps) {
  const { showToast } = useToast()
  const [tab, setTab] = useState<TabId>('info')
  const dialogRef = useRef<HTMLDivElement>(null)

  // ปิดด้วยปุ่ม Esc และย้ายโฟกัสเข้ามาในหน้าต่างเมื่อเปิด
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const setChannel = (channel: AudioChannel, value: number) => {
    const clamped = Math.min(100, Math.max(0, value))
    // ปรับเสียงขึ้นขณะปิดเสียงอยู่ ถือว่าผู้เล่นต้องการเลิกปิดเสียง
    const unmute = clamped > audio[channel]
    onAudioChange({ ...audio, [channel]: clamped, muted: unmute ? false : audio.muted })
  }

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'info', label: 'ข้อมูลเกม', icon: <InfoIcon /> },
    { id: 'audio', label: 'เสียง', icon: <VolumeIcon /> },
    { id: 'coupon', label: 'คูปอง', icon: <CouponIcon /> },
  ]

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="ตั้งค่า"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <SettingsIcon className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>ตั้งค่า</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </header>

        <div className={styles.tabs} role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={styles.tab}
              onClick={() => setTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* key บังคับให้ animation เล่นใหม่ทุกครั้งที่สลับหมวด */}
        {tab === 'info' ? (
          <GameInfoPanel key="info" onLogout={onLogout} ownedCharacterCount={ownedCharacterCount} />
        ) : null}
        {tab === 'audio' ? (
          <AudioPanel
            key="audio"
            audio={audio}
            onChannelChange={setChannel}
            onToggleMute={() => onAudioChange({ ...audio, muted: !audio.muted })}
          />
        ) : null}
        {tab === 'coupon' ? (
          <CouponPanel
            key="coupon"
            onRedeem={async (code) => {
              const result = await onRedeemCoupon(code)
              showToast(result.ok ? `แลกโค้ดสำเร็จ ได้หยก +${result.amount}` : result.error)
              return result.ok
            }}
          />
        ) : null}
      </div>
    </div>
  )
}

/**
 * หน้าที่ 1 — ข้อมูลเกม
 *
 * ทุกค่าอ่านจากแหล่งจริง (src/game/gameInfo.ts และ player.ownedCharacters)
 * ไม่มีตัวเลขที่เขียนตายไว้ในหน้านี้ เพื่อไม่ให้ข้อมูลเพี้ยนเมื่อเกมโตขึ้น
 */
function GameInfoPanel({
  onLogout,
  ownedCharacterCount,
}: {
  onLogout: () => Promise<void>
  ownedCharacterCount: number
}) {
  const rows: { label: string; value: string }[] = [
    { label: 'ชื่อเกม', value: GAME_INFO.name },
    { label: 'ประเภท', value: GAME_INFO.genre },
    { label: 'เวอร์ชัน', value: `v${GAME_INFO.version}` },
    { label: 'สถานะ', value: GAME_INFO.stage },
    { label: 'ตัวละครที่ครอบครอง', value: `${ownedCharacterCount} ตัว` },
  ]

  return (
    <section className={styles.panel} role="tabpanel" aria-label="ข้อมูลเกม">
      <div className={styles.infoBanner}>
        <span className={styles.infoName}>{GAME_INFO.name}</span>
        <span className={styles.infoVersion}>
          {GAME_INFO.nameEn} · v{GAME_INFO.version}
        </span>
      </div>

      <dl className={styles.infoList}>
        {rows.map((row) => (
          <div key={row.label} className={styles.infoRow}>
            <dt className={styles.infoLabel}>{row.label}</dt>
            <dd className={styles.infoValue}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className={styles.panelNote}>
        ตัวละคร ไอคอน และโมเดลทั้งหมดในเกมนี้ออกแบบขึ้นเองใหม่ทั้งหมด
        ตัวละครที่อ้างอิงวรรณกรรมใช้เฉพาะเรื่องที่เป็นสมบัติสาธารณะเท่านั้น
      </p>

      <button type="button" className={styles.logout} onClick={() => void onLogout()}>
        ออกจากบัญชี
      </button>
    </section>
  )
}

/** หน้าที่ 2 — เสียง (สามช่องปรับแยกกัน) */
function AudioPanel({
  audio,
  onChannelChange,
  onToggleMute,
}: {
  audio: AudioSettings
  onChannelChange: (channel: AudioChannel, value: number) => void
  onToggleMute: () => void
}) {
  return (
    <section className={styles.panel} role="tabpanel" aria-label="ตั้งค่าเสียง">
      {CHANNELS.map((channel) => (
        <ChannelRow
          key={channel.id}
          label={channel.label}
          value={audio[channel.id]}
          muted={audio.muted}
          onChange={(next) => onChannelChange(channel.id, next)}
        />
      ))}

      <button
        type="button"
        className={styles.muteButton}
        data-muted={audio.muted}
        aria-pressed={audio.muted}
        onClick={onToggleMute}
      >
        {/* ไอคอนบอกผลของการกด ไม่ใช่สถานะปัจจุบัน */}
        {audio.muted ? <VolumeIcon /> : <VolumeMuteIcon />}
        {audio.muted ? 'เปิดเสียงอีกครั้ง' : 'ปิดเสียงทั้งหมด'}
      </button>

      <p className={styles.panelNote}>
        {audio.muted
          ? 'ปิดเสียงอยู่ ทั้งสามช่องถูกปิดชั่วคราว ค่าที่ตั้งไว้ยังถูกจำไว้ให้'
          : 'ระบบเสียงยังไม่เชื่อมต่อ ค่าที่ตั้งไว้จะถูกนำไปใช้ทันทีเมื่อระบบเสียงเปิดให้บริการ'}
      </p>
    </section>
  )
}

/**
 * หนึ่งช่องเสียง — แถบระดับ + ปุ่มลด/เพิ่มที่มีข้อความกำกับชัดเจน
 *
 * ขณะปิดเสียงทั้งหมด แถบจะแสดงเป็น 0% แต่ค่าจริงยังถูกเก็บไว้
 * เพื่อให้กลับมาที่ระดับเดิมทันทีเมื่อเปิดเสียงอีกครั้ง
 */
function ChannelRow({
  label,
  value,
  muted,
  onChange,
}: {
  label: string
  value: number
  muted: boolean
  onChange: (next: number) => void
}) {
  const shown = muted ? 0 : value

  return (
    <div className={styles.volumeRow} data-muted={muted}>
      <span className={styles.volumeLabel}>
        {label}
        <span className={styles.volumeValue}>{shown}%</span>
      </span>

      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
      >
        <div className={styles.fill} style={{ width: `${shown}%` }} />
      </div>

      <div className={styles.stepper}>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChange(value - VOLUME_STEP)}
          disabled={value === 0}
        >
          <MinusIcon />
          ลดเสียง
        </button>

        <button
          type="button"
          className={styles.step}
          onClick={() => onChange(value + VOLUME_STEP)}
          disabled={value === 100 && !muted}
        >
          <PlusIcon />
          เพิ่มเสียง
        </button>
      </div>
    </div>
  )
}

/** หน้าที่ 3 — คูปอง */
function CouponPanel({ onRedeem }: { onRedeem: (code: string) => Promise<boolean> }) {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isValid = code.length >= COUPON_MIN_LENGTH

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid || submitting) return
    setSubmitting(true)
    const ok = await onRedeem(code)
    setSubmitting(false)
    // เคลียร์ช่องกรอกเฉพาะตอนแลกสำเร็จ — แลกไม่ผ่านให้แก้โค้ดเดิมต่อได้เลย
    if (ok) setCode('')
  }

  return (
    <section className={styles.panel} role="tabpanel" aria-label="กรอกคูปอง">
      <form className={styles.couponForm} onSubmit={handleSubmit}>
        <label className={styles.couponLabel} htmlFor="coupon-code">
          โค้ดคูปอง
        </label>
        <input
          id="coupon-code"
          className={styles.couponInput}
          type="text"
          value={code}
          maxLength={COUPON_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          placeholder="พิมพ์โค้ดคูปองที่นี่..."
          aria-describedby="coupon-hint"
          // แปลงเป็นตัวพิมพ์ใหญ่และตัดอักขระพิเศษออกทันทีที่พิมพ์
          onChange={(event) =>
            setCode(event.target.value.toUpperCase().replace(COUPON_DISALLOWED, ''))
          }
        />
        <span className={styles.couponHint} id="coupon-hint">
          ตัวอักษรอังกฤษและตัวเลขเท่านั้น ({COUPON_MIN_LENGTH}–{COUPON_MAX_LENGTH} ตัว)
        </span>

        <button type="submit" className={styles.redeem} disabled={!isValid || submitting}>
          {submitting ? 'กำลังแลก...' : 'แลกรางวัล'}
        </button>
      </form>

      <p className={styles.panelNote}>
        คูปองที่ใช้ไปแล้วจะไม่สามารถใช้ซ้ำได้ และแต่ละโค้ดมีวันหมดอายุกำกับไว้
      </p>
    </section>
  )
}

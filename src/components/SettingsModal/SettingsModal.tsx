import { useState, type FormEvent, type ReactNode } from 'react'
import type { CurrencyResult } from '../../data/accountRepository.shared'
import { useModalA11y } from '../../hooks/useModalA11y'
import { GAME_INFO } from '../../game/gameInfo'
import { getA11ySettings, setA11ySettings, type A11ySettings } from '../../lib/a11ySettings'
import { type AudioChannel, type AudioSettings } from '../../lib/audio/AudioEngine'
import type { QualityOverride } from '../../hooks/usePerformanceQuality'
import {
  AccessibilityIcon,
  CouponIcon,
  GraphicsIcon,
  InfoIcon,
  MinusIcon,
  PlusIcon,
  SettingsIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import styles from './SettingsModal.module.css'

type TabId = 'info' | 'audio' | 'graphics' | 'accessibility' | 'coupon'

const QUALITY_OPTIONS: { id: QualityOverride; label: string }[] = [
  { id: 'auto', label: 'อัตโนมัติ' },
  { id: 'high', label: 'สูง' },
  { id: 'medium', label: 'กลาง' },
  { id: 'low', label: 'ต่ำ' },
]

/** ปรับเสียงทีละ 2% */
const VOLUME_STEP = 2

/** โค้ดคูปองใช้ได้เฉพาะ A–Z และตัวเลข */
const COUPON_DISALLOWED = /[^A-Z0-9]/g
const COUPON_MIN_LENGTH = 4
const COUPON_MAX_LENGTH = 16

export type { AudioChannel, AudioSettings }

const CHANNELS: { id: AudioChannel; label: string }[] = [
  { id: 'master', label: 'เสียงหลัก' },
  { id: 'music', label: 'เพลงประกอบ' },
  { id: 'sfx', label: 'เอฟเฟกต์เสียง (SFX)' },
]

interface SettingsModalProps {
  audio: AudioSettings
  onAudioChange: (next: AudioSettings) => void
  /** ระดับคุณภาพเรนเดอร์ที่ผู้เล่นล็อกเอง — ยกไปเก็บที่ LobbyPage เพราะ LobbyScene ต้องอ่าน
   * ค่านี้แบบเรียลไทม์ (เหมือน AudioSettings) ไม่ใช่ค่า local แบบ a11y */
  performanceOverride: QualityOverride
  onPerformanceOverrideChange: (next: QualityOverride) => void
  /** ออกจากบัญชี — กลับไปหน้าสมัคร/เข้าสู่ระบบ */
  onLogout: () => Promise<void>
  /** แลกโค้ดคูปองเป็นหยก */
  onRedeemCoupon: (code: string) => Promise<CurrencyResult>
  /** จำนวนตัวละครที่ผู้เล่นครอบครองแล้ว — ให้ตรงกับตัวเลขใน CharacterRosterModal */
  ownedCharacterCount: number
  onClose: () => void
  /** ส่งออก save เป็นไฟล์ JSON — คืน null เมื่อสำเร็จ (ดาวน์โหลดแล้ว) คืนข้อความเมื่อผิดพลาด */
  onExportSave: () => Promise<string | null>
}

/**
 * หน้าต่างตั้งค่า — แบ่งเป็นสองหมวด อยู่คนละหน้ากัน สลับด้วยแท็บ
 *
 * หน้า "เสียง"  : เพิ่ม/ลด/ปิดเสียง
 * หน้า "คูปอง" : กรอกโค้ดแลกของรางวัล
 *
 * ค่าเสียงถูกยกไปเก็บที่ LobbyPage ซึ่งอ่าน/บันทึกผ่าน AudioEngine จริง
 * (src/lib/audio/AudioEngine.ts, persist ผ่าน localStorage) เพื่อให้ค่าคงอยู่ข้ามการปิดเปิดหน้าต่างและรีโหลดหน้า
 */
export function SettingsModal({
  audio,
  onAudioChange,
  performanceOverride,
  onPerformanceOverrideChange,
  onLogout,
  onRedeemCoupon,
  ownedCharacterCount,
  onClose,
  onExportSave,
}: SettingsModalProps) {
  const { showToast } = useToast()
  const [tab, setTab] = useState<TabId>('info')
  // Esc, backdrop-click, focus trap, คืนโฟกัสตอนปิด — รวมไว้ที่ useModalA11y ตัวเดียว
  const { shellRef: dialogRef, backdropProps } = useModalA11y<HTMLDivElement>(onClose)
  // ค่าตั้งค่าการเข้าถึง — เก็บ local ในนี้พอ เพราะ source of truth จริงคือ data attribute
  // บน <html> ที่ setA11ySettings อัปเดตให้เองอยู่แล้ว (ดู src/lib/a11ySettings.ts)
  // ไม่ต้องส่งผ่าน prop จาก LobbyPage เหมือน AudioSettings เพราะไม่มีที่อื่นต้องอ่านค่านี้
  const [a11y, setA11y] = useState<A11ySettings>(() => getA11ySettings())
  const handleA11yChange = (next: A11ySettings) => {
    setA11ySettings(next)
    setA11y(next)
  }

  const setChannel = (channel: AudioChannel, value: number) => {
    const clamped = Math.min(100, Math.max(0, value))
    // ปรับเสียงขึ้นขณะปิดเสียงอยู่ ถือว่าผู้เล่นต้องการเลิกปิดเสียง
    const unmute = clamped > audio[channel]
    onAudioChange({ ...audio, [channel]: clamped, muted: unmute ? false : audio.muted })
  }

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: 'info', label: 'ข้อมูลเกม', icon: <InfoIcon /> },
    { id: 'audio', label: 'เสียง', icon: <VolumeIcon /> },
    { id: 'graphics', label: 'กราฟิก', icon: <GraphicsIcon /> },
    { id: 'accessibility', label: 'การเข้าถึง', icon: <AccessibilityIcon /> },
    { id: 'coupon', label: 'คูปอง', icon: <CouponIcon /> },
  ]

  return (
    <div className={styles.backdrop} {...backdropProps}>
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
          <GameInfoPanel
            key="info"
            onLogout={onLogout}
            ownedCharacterCount={ownedCharacterCount}
            onExportSave={onExportSave}
          />
        ) : null}
        {tab === 'audio' ? (
          <AudioPanel
            key="audio"
            audio={audio}
            onChannelChange={setChannel}
            onToggleMute={() => onAudioChange({ ...audio, muted: !audio.muted })}
          />
        ) : null}
        {tab === 'graphics' ? (
          <GraphicsPanel
            key="graphics"
            value={performanceOverride}
            onChange={onPerformanceOverrideChange}
          />
        ) : null}
        {tab === 'accessibility' ? (
          <AccessibilityPanel key="accessibility" settings={a11y} onChange={handleA11yChange} />
        ) : null}
        {tab === 'coupon' ? (
          <CouponPanel
            key="coupon"
            onRedeem={async (code) => {
              const result = await onRedeemCoupon(code)
              if (result.ok) {
                showToast(`แลกโค้ดสำเร็จ ได้หยก +${result.amount}`, 'currency')
              } else {
                showToast(result.error, 'error')
              }
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
  onExportSave,
}: {
  onLogout: () => Promise<void>
  ownedCharacterCount: number
  onExportSave: () => Promise<string | null>
}) {
  const { showToast } = useToast()
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

      <p className={styles.panelNote}>
        เกมนี้ไม่มีเซิร์ฟเวอร์ — ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น
        เปลี่ยนเครื่อง/เบราว์เซอร์ ต้องส่งออกไฟล์ save ไปนำเข้าเองที่ปลายทาง (ไม่มีการ sync
        อัตโนมัติ)
      </p>

      <button
        type="button"
        className={styles.exportSave}
        onClick={async () => {
          const error = await onExportSave()
          if (error) showToast(error, 'error')
        }}
      >
        ส่งออก save เป็นไฟล์
      </button>

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
          : 'ค่าที่ตั้งไว้มีผลทันทีและถูกบันทึกไว้ในเครื่องนี้'}
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

/**
 * หน้าที่ 3 — กราฟิก (ระดับคุณภาพเรนเดอร์ของฉากลอบบี้ 3D)
 *
 * ค่าเริ่มต้น "อัตโนมัติ" ให้ usePerformanceQuality วัด FPS จริงระหว่างเล่นแล้วปรับเอง
 * เลือกระดับใดระดับหนึ่งเอง = ล็อกค่านั้นตายตัว ปิดการวัดอัตโนมัติทั้งหมดทันที (ไม่ใช่แค่
 * เมินผลวัด) กันไม่ให้ค่าที่เลือกไว้ถูกแทนที่แบบไม่มีคำอธิบาย (ask-CB opinion lane, 2026-08-06)
 */
function GraphicsPanel({
  value,
  onChange,
}: {
  value: QualityOverride
  onChange: (next: QualityOverride) => void
}) {
  return (
    <section className={styles.panel} role="tabpanel" aria-label="กราฟิก">
      <div className={styles.qualityRow} role="radiogroup" aria-label="ระดับคุณภาพเรนเดอร์">
        {QUALITY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={styles.qualityOption}
            data-active={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className={styles.panelNote}>
        {value === 'auto'
          ? 'ปรับความละเอียด/เงาให้อัตโนมัติตามความลื่นจริงระหว่างเล่น'
          : 'ล็อกระดับนี้ตายตัว ไม่ปรับอัตโนมัติอีกจนกว่าจะเปลี่ยนกลับเป็น "อัตโนมัติ"'}
      </p>

      <p className={styles.panelNote}>
        ตอนนี้ฉากลอบบี้ยังไม่มีตัวละคร/ลานประลองแสดงอยู่ ผลของการปรับจะเห็นชัดขึ้นมากเมื่อเปิดใช้งาน
        ส่วนนั้นเต็มรูปแบบ
      </p>
    </section>
  )
}

/**
 * หน้าที่ 4 — การเข้าถึง (accessibility)
 *
 * ตอนนี้มีสวิตช์เดียว (ลดการเคลื่อนไหว) — เพิ่มค่าอื่นทีหลังได้ (ขนาดตัวอักษร/contrast/
 * colorblind mode) แค่ขยาย A11ySettings ใน src/lib/a11ySettings.ts + เพิ่ม control ที่นี่
 * (gold-standard UX audit, 2026-08-06: WCAG 2.2 AA ไม่มีสวิตช์นี้ในแอปมาก่อนเลย พึ่ง
 * OS-level prefers-reduced-motion อย่างเดียว — เกม HoYoverse ที่เทียบ genre กัน
 * (Genshin/HSR) มีแท็บนี้ในเมนูตั้งค่าเสมอ)
 */
function AccessibilityPanel({
  settings,
  onChange,
}: {
  settings: A11ySettings
  onChange: (next: A11ySettings) => void
}) {
  return (
    <section className={styles.panel} role="tabpanel" aria-label="การเข้าถึง">
      <button
        type="button"
        className={styles.a11yToggle}
        data-active={settings.reduceMotion}
        aria-pressed={settings.reduceMotion}
        onClick={() => onChange({ ...settings, reduceMotion: !settings.reduceMotion })}
      >
        <AccessibilityIcon />
        {settings.reduceMotion ? 'เปิดการเคลื่อนไหวอีกครั้ง' : 'ลดการเคลื่อนไหวในเกม'}
      </button>

      <p className={styles.panelNote}>
        มีผลทันทีทั่วทั้งเกม ไม่ต้องพึ่งการตั้งค่าของระบบปฏิบัติการ/เบราว์เซอร์
        (ถ้าระบบตั้งค่าลดการเคลื่อนไหวไว้อยู่แล้ว เกมจะลดให้เองโดยอัตโนมัติเช่นกัน)
      </p>

      <p className={styles.panelNote}>
        กำลังทยอยเพิ่มตัวเลือกอื่น ๆ (ขนาดตัวอักษร, ความคมชัดของสี, โหมดสำหรับตาบอดสี)
      </p>
    </section>
  )
}

/** หน้าที่ 5 — คูปอง */
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

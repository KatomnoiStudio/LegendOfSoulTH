import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BATTLE_HISTORY, PETS } from '../../game/collection'
import { ROSTER } from '../../game/characters'
import { formatUid } from '../../game/uid'
import { clampRatio, formatNumber } from '../../lib/format'
import type { Player } from '../../types/player'
import {
  CopyIcon,
  FrameIcon,
  MoonWalkIcon,
  HeroesIcon,
  HistoryIcon,
  PawIcon,
  PhotoIcon,
  RenameIcon,
} from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import { AvatarFrame } from '../TopBar/AvatarFrame'
import { CommanderAvatar } from '../TopBar/CommanderAvatar'
import styles from './ProfileModal.module.css'

type TabId = 'characters' | 'pets' | 'history'

interface ProfileModalProps {
  player: Player
  /** พาตัวละครออกไปเดินเล่นในลานวัดใต้แสงจันทร์ */
  onMoonWalk: () => void
  onClose: () => void
}

/**
 * หน้าต่างโปรไฟล์ผู้เล่น
 *
 * จำนวนในแท็บดึงจากข้อมูลจริงทั้งหมด:
 * - ตัวละคร มาจาก ROSTER (src/game/characters.ts)
 * - สัตว์เลี้ยงและประวัติการต่อสู้ มาจาก src/game/collection.ts ซึ่งยังว่างจริง
 *   เพราะยังไม่มีระบบทั้งสองอย่าง จึงแสดงสถานะว่างแทนการใส่ข้อมูลปลอม
 */
export function ProfileModal({ player, onMoonWalk, onClose }: ProfileModalProps) {
  const { comingSoon } = useToast()
  const [tab, setTab] = useState<TabId>('characters')
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

  const expRatio = clampRatio(player.exp, player.expToNext)

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'characters', label: 'ตัวละครทั้งหมด', count: ROSTER.length },
    { id: 'pets', label: 'สัตว์เลี้ยงทั้งหมด', count: PETS.length },
    { id: 'history', label: 'ประวัติการต่อสู้', count: BATTLE_HISTORY.length },
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
        aria-label="โปรไฟล์ผู้เล่น"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <AvatarFrame frameId={player.frameId} className={styles.bigFrame}>
            <CommanderAvatar />
          </AvatarFrame>

          <div className={styles.headerText}>
            <div className={styles.nameRow}>
              <h2 className={styles.name}>{player.name}</h2>
              <span className={styles.levelChip}>เลเวล {player.level}</span>
            </div>
            <span className={styles.title}>{player.title}</span>
            <UidRow uid={player.uid} />

            <div className={styles.expRow}>
              <div
                className={styles.expTrack}
                role="progressbar"
                aria-label="ค่าประสบการณ์"
                aria-valuemin={0}
                aria-valuemax={player.expToNext}
                aria-valuenow={player.exp}
              >
                <div className={styles.expFill} style={{ width: `${expRatio * 100}%` }} />
              </div>
              <span className={styles.expText}>
                {formatNumber(player.exp)} / {formatNumber(player.expToNext)}
              </span>
            </div>
          </div>

          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </header>

        <div className={styles.editRow}>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => comingSoon('เปลี่ยนรูปโปรไฟล์')}
          >
            <PhotoIcon />
            เปลี่ยนรูป
          </button>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => comingSoon('เปลี่ยนกรอบโปรไฟล์')}
          >
            <FrameIcon />
            เปลี่ยนกรอบ
          </button>
          <button
            type="button"
            className={`${styles.editButton} ${styles.moonWalk}`}
            onClick={onMoonWalk}
          >
            <MoonWalkIcon />
            เดินชมจันทร์
          </button>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => comingSoon('เปลี่ยนชื่อผู้เล่น')}
          >
            <RenameIcon />
            เปลี่ยนชื่อ
          </button>
        </div>

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
              {item.label}
              <span className={styles.count}>({item.count})</span>
            </button>
          ))}
        </div>

        <div className={styles.body} role="tabpanel">
          {tab === 'characters' ? <CharacterCount /> : null}
          {tab === 'pets' ? (
            <EmptyState
              icon={<PawIcon className={styles.emptyIcon} />}
              title="ยังไม่มีสัตว์เลี้ยง"
              text="ระบบสัตว์เลี้ยงยังไม่เปิดให้บริการ เมื่อเปิดแล้วสัตว์เลี้ยงที่คุณเก็บได้จะแสดงที่นี่"
            />
          ) : null}
          {tab === 'history' ? (
            <EmptyState
              icon={<HistoryIcon className={styles.emptyIcon} />}
              title="ยังไม่มีประวัติการต่อสู้"
              text="ระบบต่อสู้ยังไม่เปิดให้บริการ เมื่อคุณเริ่มออกรบ ผลการต่อสู้ย้อนหลังจะถูกบันทึกไว้ที่นี่"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * แถบรหัสผู้เล่น (UID) พร้อมปุ่มคัดลอก
 * เป็นรหัสที่ผู้เล่นส่งให้เพื่อนใช้ค้นหาเพื่อเพิ่มเพื่อน จึงต้องคัดลอกได้ง่าย
 */
function UidRow({ uid }: { uid: string }) {
  const { showToast } = useToast()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uid)
      showToast('คัดลอกรหัสผู้เล่นแล้ว')
    } catch (err) {
      // เบราว์เซอร์บางตัวไม่ให้สิทธิ์คลิปบอร์ด — บอกให้ผู้เล่นคัดลอกเองแทน
      console.warn('[ProfileModal] clipboard write failed', err)
      showToast('คัดลอกอัตโนมัติไม่ได้ กรุณาจดรหัสด้วยตนเอง')
    }
  }

  return (
    <span className={styles.uidRow}>
      <span className={styles.uidLabel}>UID</span>
      <span className={styles.uidValue}>{formatUid(uid)}</span>
      <button type="button" className={styles.uidCopy} onClick={copy} aria-label="คัดลอกรหัสผู้เล่น">
        <CopyIcon />
      </button>
    </span>
  )
}

/**
 * สรุปจำนวนตัวละครที่มีอยู่จริงในเกม (นับจาก ROSTER)
 * แสดงเฉพาะตัวเลขรวม ไม่ลงรายชื่อหรือช่องของแต่ละตัว
 */
function CharacterCount() {
  if (ROSTER.length === 0) {
    return (
      <EmptyState
        icon={<HeroesIcon className={styles.emptyIcon} />}
        title="ยังไม่มีตัวละคร"
        text="เมื่อคุณอัญเชิญตัวละครได้ จำนวนจะแสดงที่นี่"
      />
    )
  }

  return (
    <div className={styles.stat}>
      <HeroesIcon className={styles.statIcon} />
      <span className={styles.statValue}>{formatNumber(ROSTER.length)}</span>
      <span className={styles.statLabel}>ตัวละครทั้งหมด</span>
    </div>
  )
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className={styles.empty}>
      {icon}
      <span className={styles.emptyTitle}>{title}</span>
      <p className={styles.emptyText}>{text}</p>
    </div>
  )
}

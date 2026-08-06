import { useState, type ReactNode } from 'react'
import { useModalA11y } from '../../hooks/useModalA11y'
import type { Character } from '../../game/characters'
import { PETS } from '../../game/collection'
import { formatUid } from '../../game/uid'
import { clampRatio, formatNumber } from '../../lib/format'
import type { Player } from '../../types/player'
import {
  CopyIcon,
  FrameIcon,
  HeroesIcon,
  HistoryIcon,
  MoonWalkIcon,
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
  onClose: () => void
  /** ตัวละครที่ครอบครองและมีชุดเฟรมเดินจริง — ตัวเลือกในตัวเลือก "เดินชมจันทร์" (ดู src/game/walkKits.ts) */
  walkableCharacters: Character[]
  /** ตัวที่กำลังเดินอยู่ในลอบบี้ตอนนี้ — null คือยังไม่เคยเลือก (ใช้ตัวแรกเป็นค่าเริ่มต้น) */
  activeWalkCharacterId: string | null
  /** เลือกตัวใหม่ให้ไปเดินในลอบบี้ — ปิดหน้าต่างนี้ให้เองหลังเลือก จะได้เห็นตัวละครเดินทันที */
  onSelectWalkCharacter: (characterId: string) => void
}

/**
 * หน้าต่างโปรไฟล์ผู้เล่น
 *
 * จำนวนในแท็บดึงจากข้อมูลจริงทั้งหมด:
 * - ตัวละคร มาจาก ROSTER (src/game/characters.ts)
 * - สัตว์เลี้ยงและประวัติการต่อสู้ มาจาก src/game/collection.ts ซึ่งยังว่างจริง
 *   เพราะยังไม่มีระบบทั้งสองอย่าง จึงแสดงสถานะว่างแทนการใส่ข้อมูลปลอม
 */
export function ProfileModal({
  player,
  onClose,
  walkableCharacters,
  activeWalkCharacterId,
  onSelectWalkCharacter,
}: ProfileModalProps) {
  const { comingSoon } = useToast()
  const [tab, setTab] = useState<TabId>('characters')
  const [walkPickerOpen, setWalkPickerOpen] = useState(false)
  // Esc, backdrop-click, focus trap, คืนโฟกัสตอนปิด — รวมไว้ที่ useModalA11y ตัวเดียว
  const { shellRef: dialogRef, backdropProps } = useModalA11y<HTMLDivElement>(onClose)

  const expRatio = clampRatio(player.exp, player.expToNext)

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'characters', label: 'ตัวละครทั้งหมด', count: player.ownedCharacters.length },
    { id: 'pets', label: 'สัตว์เลี้ยงทั้งหมด', count: PETS.length },
    { id: 'history', label: 'ประวัติการต่อสู้', count: player.progress.battleHistory.length },
  ]

  return (
    <div className={styles.backdrop} {...backdropProps}>
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
            className={styles.editButton}
            aria-expanded={walkPickerOpen}
            aria-label="เดินชมจันทร์ — เลือกตัวละครที่จะพาไปเดินในลอบบี้"
            onClick={() => setWalkPickerOpen((open) => !open)}
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

        {walkPickerOpen ? (
          <WalkPicker
            characters={walkableCharacters}
            activeId={activeWalkCharacterId}
            lockedCount={player.ownedCharacters.length - walkableCharacters.length}
            onSelect={onSelectWalkCharacter}
          />
        ) : null}

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
          {tab === 'characters' ? <CharacterCount count={player.ownedCharacters.length} /> : null}
          {tab === 'pets' ? (
            <EmptyState
              icon={<PawIcon className={styles.emptyIcon} />}
              title="ยังไม่มีสัตว์เลี้ยง"
              text="ระบบสัตว์เลี้ยงยังไม่เปิดให้บริการ เมื่อเปิดแล้วสัตว์เลี้ยงที่คุณเก็บได้จะแสดงที่นี่"
            />
          ) : null}
          {tab === 'history' ? (
            player.progress.battleHistory.length === 0 ? (
              <EmptyState
                icon={<HistoryIcon className={styles.emptyIcon} />}
                title="ยังไม่มีประวัติการต่อสู้"
                text="เมื่อคุณเริ่มออกรบ ผลการต่อสู้ย้อนหลังจะถูกบันทึกไว้ที่นี่"
              />
            ) : (
              <ul className={styles.historyList}>
                {player.progress.battleHistory.map((record) => (
                  <li key={record.id}>
                    <strong>{record.opponent}</strong> — {record.result === 'win' ? 'ชนะ' : 'แพ้'} (
                    {record.turns} เทิร์น)
                  </li>
                ))}
              </ul>
            )
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
function CharacterCount({ count }: { count: number }) {
  if (count === 0) {
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
      <span className={styles.statValue}>{formatNumber(count)}</span>
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

/**
 * ตัวเลือกตัวละครสำหรับปุ่ม "เดินชมจันทร์" — เลือกแล้วพาไปเดินในลานพระจันทร์ที่ลอบบี้ทันที
 *
 * แสดงเฉพาะตัวที่มีชุดเฟรมเดินจริง (walkableCharacters ที่กรองมาจาก LobbyPage แล้ว —
 * เกณฑ์เดียวกับ WukongAdventure's castBar) ตัวที่ครอบครองแต่ยังไม่มีท่าเดินจะไม่ขึ้นในนี้
 * แต่บอกจำนวนตรง ๆ แทนการซ่อนเงียบ ๆ (ตาม convention ของ walkKits.ts — "UI จะบอกผู้เล่น
 * ตามตรงว่ายังไม่มีชุดเฟรมเดิน")
 */
function WalkPicker({
  characters,
  activeId,
  lockedCount,
  onSelect,
}: {
  characters: Character[]
  activeId: string | null
  lockedCount: number
  onSelect: (characterId: string) => void
}) {
  if (characters.length === 0) {
    return (
      <div className={styles.walkPicker}>
        <p className={styles.walkPickerHint}>ยังไม่มีตัวละครที่มีท่าเดิน รอการอัปเดตเพิ่มเติม</p>
      </div>
    )
  }

  return (
    <div className={styles.walkPicker}>
      <div className={styles.walkPickerGrid} role="group" aria-label="เลือกตัวละครที่จะพาไปเดินชมจันทร์">
        {characters.map((character) => (
          <button
            key={character.id}
            type="button"
            className={styles.walkPickerItem}
            aria-pressed={character.id === activeId}
            onClick={() => onSelect(character.id)}
          >
            <img src={character.model.spriteUrl} alt="" draggable={false} />
            <span>{character.name}</span>
          </button>
        ))}
      </div>
      {lockedCount > 0 ? (
        <p className={styles.walkPickerHint}>
          ตัวละครที่ครอบครองอีก {lockedCount} ตัวยังไม่มีท่าเดิน จะเลือกได้เมื่อมีการอัปเดตเพิ่มเติม
        </p>
      ) : null}
    </div>
  )
}

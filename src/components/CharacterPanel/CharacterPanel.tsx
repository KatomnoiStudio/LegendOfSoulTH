import type { CSSProperties } from 'react'
import type { Character } from '../../game/characters'
import { ORIGIN_LABEL, RARITY_COLOR, RARITY_LABEL } from '../../game/characters'
import { useToast } from '../Toast/useToast'
import styles from './CharacterPanel.module.css'

/** เพดานของค่าสถานะ ใช้คำนวณความยาวแถบ */
const STAT_MAX = 120

interface CharacterPanelProps {
  character: Character | null
  onClose: () => void
}

/** กรอบข้อมูลตัวละครที่โผล่ขึ้นเมื่อกดโมเดลในฉาก (ข้อมูลยังเป็น placeholder) */
export function CharacterPanel({ character, onClose }: CharacterPanelProps) {
  const { comingSoon } = useToast()
  if (!character) return null

  const rarityStyle = { '--rarity': RARITY_COLOR[character.rarity] } as CSSProperties

  return (
    <div className={styles.panel}>
      <article className={styles.card} style={rarityStyle} key={character.id}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
          ×
        </button>

        <div className={styles.header}>
          <h2 className={styles.name}>{character.name}</h2>
          <span className={styles.rarity}>{RARITY_LABEL[character.rarity]}</span>
        </div>
        <p className={styles.epithet}>{character.epithet}</p>

        <div className={styles.tags}>
          <span className={styles.tag}>เลเวล {character.level}</span>
          <span className={styles.tag}>{character.role}</span>
          <span className={styles.tag}>ธาตุ{character.element}</span>
          <span className={styles.tag}>{ORIGIN_LABEL[character.origin]}</span>
        </div>

        <div className={styles.stats}>
          <Stat label="พลังโจมตี" value={character.stats.atk} />
          <Stat label="พลังป้องกัน" value={character.stats.def} />
          <Stat label="ความเร็ว" value={character.stats.spd} />
        </div>

        <p className={styles.lore}>{character.lore}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.action}
            onClick={() => comingSoon(`รายละเอียดของ${character.name}`)}
          >
            รายละเอียด
          </button>
          <button
            type="button"
            className={`${styles.action} ${styles.actionPrimary}`}
            onClick={() => comingSoon(`จัดลงทัพ ${character.name}`)}
          >
            จัดลงทัพ
          </button>
        </div>
      </article>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      <div className={styles.statTrack}>
        <div
          className={styles.statFill}
          style={{ width: `${Math.min(100, (value / STAT_MAX) * 100)}%` }}
        />
      </div>
    </div>
  )
}

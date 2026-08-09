import type { CSSProperties } from 'react'
import { ORIGIN_LABEL, RARITY_COLOR, RARITY_LABEL, type Character } from '../../game/characters'
import { clampRatio, formatNumber } from '../../lib/format'
import type { SkillLevels } from '../../types/player'
import { useToast } from '../Toast/useToast'
import styles from './CharacterStats.module.css'

/** ป้ายชื่อช่องสกิลแสดงผล — เรียงตามลำดับ skill1 → skill2 → skill3 → ultimate เสมอ */
const SKILL_SLOT_LABELS: { slot: keyof SkillLevels; label: string }[] = [
  { slot: 'skill1', label: 'สกิล 1' },
  { slot: 'skill2', label: 'สกิล 2' },
  { slot: 'skill3', label: 'สกิล 3' },
  { slot: 'ultimate', label: 'ท่าไม้ตาย' },
]

interface CharacterStatsProps {
  character: Character & { skillLevels: SkillLevels }
}

/** แผงข้อมูลของตัวละครที่เลือก — ประวัติ ค่าสถานะ EXP และปุ่มจัดการ */
export function CharacterStats({ character }: CharacterStatsProps) {
  const { showToast } = useToast()

  const style = { '--rarity-color': RARITY_COLOR[character.rarity] } as CSSProperties
  const expRatio = clampRatio(character.exp, character.expToNext)

  // แสดงเป็นตัวเลขล้วน ไม่มีหลอด — หลอดกินพื้นที่จนเลขถูกบีบ (โดยเฉพาะ HP ที่เป็นเลข 4 หลัก)
  const stats: { label: string; value: number }[] = [
    { label: 'พลังชีวิต', value: character.stats.hp },
    { label: 'พลังโจมตี', value: character.stats.atk },
    { label: 'พลังป้องกัน', value: character.stats.def },
    { label: 'ความเร็ว', value: character.stats.spd },
  ]

  return (
    <div className={styles.panel} style={style}>
      <div className={styles.identity}>
        <h3 className={styles.name}>{character.name}</h3>
        <span className={styles.epithet}>{character.epithet}</span>

        <div className={styles.chips}>
          <span className={`${styles.chip} ${styles.chipRarity}`}>
            {RARITY_LABEL[character.rarity]}
          </span>
          <span className={styles.chip}>ธาตุ{character.element}</span>
          <span className={styles.chip}>{character.role}</span>
          <span className={styles.chip}>{ORIGIN_LABEL[character.origin]}</span>
        </div>
      </div>

      <p className={styles.lore}>{character.lore}</p>

      <div>
        <span className={styles.sectionTitle}>ค่าสถานะ</span>
        <dl className={styles.statList}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statRow}>
              <dt className={styles.statLabel}>{stat.label}</dt>
              <dd className={styles.statValue}>{formatNumber(stat.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <span className={styles.sectionTitle}>ประสบการณ์</span>
        <div className={styles.expHead}>
          <span>เลเวล {character.level}</span>
          <span className={styles.expNumbers}>
            {formatNumber(character.exp)} / {formatNumber(character.expToNext)}
          </span>
        </div>
        <div
          className={styles.expTrack}
          role="progressbar"
          aria-label={`ค่าประสบการณ์ของ${character.name}`}
          aria-valuemin={0}
          aria-valuemax={character.expToNext}
          aria-valuenow={character.exp}
        >
          <div className={styles.expFill} style={{ width: `${expRatio * 100}%` }} />
        </div>
      </div>

      <div>
        <span className={styles.sectionTitle}>เลเวลสกิล</span>
        <dl className={styles.statList}>
          {SKILL_SLOT_LABELS.map(({ slot, label }) => (
            <div key={slot} className={styles.statRow}>
              <dt className={styles.statLabel}>{label}</dt>
              <dd className={styles.statValue}>เลเวล {character.skillLevels[slot].level}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.action} ${styles.upgrade}`}
          onClick={() => showToast('ระบบกำลังพัฒนา')}
        >
          อัปเกรด
        </button>
        <button
          type="button"
          className={`${styles.action} ${styles.enlist}`}
          onClick={() => showToast('ระบบกำลังพัฒนา')}
        >
          จัดเข้าทีม
        </button>
      </div>
    </div>
  )
}

import type { CSSProperties } from 'react'
import {
  ORIGIN_LABEL,
  RARITY_COLOR,
  RARITY_LABEL,
  type Character,
} from '../../game/characters'
import { clampRatio, formatNumber } from '../../lib/format'
import { useToast } from '../Toast/useToast'
import styles from './CharacterStats.module.css'

/** เพดานอ้างอิงของค่าสถานะ ใช้คำนวณความยาวแถบให้เทียบกันได้ระหว่างตัวละคร */
const STAT_MAX = 120

interface CharacterStatsProps {
  character: Character
}

/** แผงข้อมูลของตัวละครที่เลือก — ประวัติ ค่าสถานะ EXP และปุ่มจัดการ */
export function CharacterStats({ character }: CharacterStatsProps) {
  const { showToast } = useToast()

  const style = { '--rarity-color': RARITY_COLOR[character.rarity] } as CSSProperties
  const expRatio = clampRatio(character.exp, character.expToNext)

  const stats: { label: string; value: number }[] = [
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
              <dd
                className={styles.statTrack}
                role="meter"
                aria-label={stat.label}
                aria-valuemin={0}
                aria-valuemax={STAT_MAX}
                aria-valuenow={stat.value}
              >
                <div
                  className={styles.statFill}
                  style={{ width: `${clampRatio(stat.value, STAT_MAX) * 100}%` }}
                />
              </dd>
              <dd className={styles.statValue}>{stat.value}</dd>
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

import type { CSSProperties } from 'react'
import { RARITY_COLOR, RARITY_LABEL, type Character } from '../../game/characters'
import styles from './CharacterCard.module.css'

interface CharacterCardProps {
  character: Character
  selected: boolean
  onSelect: (id: string) => void
}

/**
 * การ์ดตัวละครหนึ่งใบในรายชื่อทำเนียบวีรชน
 *
 * รูปย่อครอปจากเฟรมแรกของชุด idle เดิม (ขยายแล้วเลื่อนขึ้นให้เห็นช่วงหัว-ไหล่)
 * จึงไม่ต้องมีไฟล์ภาพใบหน้าชุดใหม่
 */
export function CharacterCard({ character, selected, onSelect }: CharacterCardProps) {
  const style = {
    '--card-accent': character.model.accent,
    '--rarity-color': RARITY_COLOR[character.rarity],
  } as CSSProperties

  return (
    <button
      type="button"
      className={styles.card}
      style={style}
      aria-pressed={selected}
      aria-label={`${character.name} เลเวล ${character.level} ระดับ${RARITY_LABEL[character.rarity]} ธาตุ${character.element}`}
      onClick={() => onSelect(character.id)}
    >
      <span className={styles.portrait}>
        <img src={character.model.spriteUrl} alt="" draggable={false} />
        <span className={styles.rarityPip} />
      </span>

      <span className={styles.body}>
        <span className={styles.topRow}>
          <span className={styles.name}>{character.name}</span>
          <span className={styles.level}>Lv.{character.level}</span>
        </span>

        {/* บทบาท (นักรบกองหน้า ฯลฯ) ไม่แสดงบนการ์ด — ดูได้จากแผงรายละเอียดด้านขวา */}
        <span className={styles.tags}>
          <span className={`${styles.tag} ${styles.tagRarity}`}>
            {RARITY_LABEL[character.rarity]}
          </span>
          <span className={styles.tag}>ธาตุ{character.element}</span>
        </span>
      </span>
    </button>
  )
}

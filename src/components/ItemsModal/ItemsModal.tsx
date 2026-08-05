import { useEffect, useState, type CSSProperties } from 'react'
import {
  ITEM_CATEGORY_LABEL,
  ITEM_RARITY_COLOR,
  ITEM_RARITY_LABEL,
  getItem,
  type ItemCategory,
  type ItemDefinition,
} from '../../game/items'
import { formatNumber } from '../../lib/format'
import type { InventoryItem, Player } from '../../types/player'
import { ItemBagIcon } from '../icons/GameIcons'
import styles from './ItemsModal.module.css'

interface ItemsModalProps {
  player: Player
  onClose: () => void
}

/** ไอเทมหนึ่งช่องที่จับคู่กับข้อมูลไอเทมจริงแล้ว */
interface ResolvedItem {
  slot: InventoryItem
  definition: ItemDefinition
}

type FilterId = 'all' | ItemCategory

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'consumable', label: ITEM_CATEGORY_LABEL.consumable },
  { id: 'material', label: ITEM_CATEGORY_LABEL.material },
  { id: 'treasure', label: ITEM_CATEGORY_LABEL.treasure },
]

/**
 * หน้ากระเป๋าไอเทมของผู้เล่น
 *
 * อ่านจาก player.inventory ตรง ๆ — ยังไม่มีระบบเควส/ดรอปที่แจกไอเทม กระเป๋าจึงว่าง
 * อยู่ตอนนี้ พอ grantItem ถูกเรียกจริงเมื่อไหร่ รายการจะขึ้นเองทันทีโดยไม่ต้องแก้หน้านี้
 */
export function ItemsModal({ player, onClose }: ItemsModalProps) {
  const [filter, setFilter] = useState<FilterId>('all')

  // ปิดด้วยปุ่ม Esc เหมือน modal อื่น ๆ ในเกม
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // ข้ามช่องที่อ้าง itemId ที่ไม่มีในทะเบียนแล้ว (เช่น ไอเทมถูกถอดออกจากเกม)
  const owned: ResolvedItem[] = (player.inventory ?? []).flatMap((slot) => {
    const definition = getItem(slot.itemId)
    return definition ? [{ slot, definition }] : []
  })

  const shown = filter === 'all' ? owned : owned.filter((it) => it.definition.category === filter)

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="ไอเทม">
        <header className={styles.header}>
          <ItemBagIcon className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>ไอเทม</h2>
          <span className={styles.count}>{formatNumber(owned.length)} ชนิด</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </header>

        <div className={styles.tabs} role="tablist">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              className={styles.tab}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className={styles.panel} role="tabpanel" aria-label="รายการไอเทม">
          {shown.length > 0 ? (
            <ul className={styles.grid}>
              {shown.map(({ slot, definition }) => (
                <li
                  key={slot.itemId}
                  className={styles.item}
                  style={{ '--item-rarity': ITEM_RARITY_COLOR[definition.rarity] } as CSSProperties}
                >
                  <span className={styles.itemHead}>
                    <strong className={styles.itemName}>{definition.name}</strong>
                    <span className={styles.itemQty}>×{formatNumber(slot.quantity)}</span>
                  </span>
                  <span className={styles.itemRarity}>
                    {ITEM_RARITY_LABEL[definition.rarity]} · {ITEM_CATEGORY_LABEL[definition.category]}
                  </span>
                  <p className={styles.itemDesc}>{definition.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              {owned.length === 0
                ? 'กระเป๋ายังว่างเปล่า — ไอเทมได้จากการทำภารกิจและของที่ดรอประหว่างเล่นเท่านั้น'
                : 'ไม่มีไอเทมในหมวดนี้'}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

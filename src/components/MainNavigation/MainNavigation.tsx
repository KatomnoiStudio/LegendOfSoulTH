import type { ReactNode } from 'react'
import { publicUrl } from '../../lib/publicUrl'
import { PawIcon, TeamFormationIcon } from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import styles from './MainNavigation.module.css'

interface NavItem {
  id: string
  label: string
  accent: string
  /** ภาพวาดมือของเมนู (ถ้ายังไม่มีไฟล์ ให้ใช้ icon แทน) */
  image?: string
  /** ไอคอน SVG สำรอง สำหรับเมนูที่ยังไม่มีภาพวาด */
  icon?: ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { id: 'battle', label: 'ต่อสู้', image: publicUrl('ui/navigation/battle.png'), accent: '#f2a443' },
  { id: 'heroes', label: 'ตัวละคร', image: publicUrl('ui/navigation/heroes.png'), accent: '#f0c35e' },
  { id: 'pets', label: 'สัตว์เลี้ยง', icon: <PawIcon />, accent: '#e58fb4' },
  { id: 'training', label: 'ค่ายฝึก', image: publicUrl('ui/navigation/training.png'), accent: '#77b9db' },
  { id: 'team', label: 'จัดทีม', icon: <TeamFormationIcon />, accent: '#8fa9f0' },
  { id: 'summon', label: 'อัญเชิญ', image: publicUrl('ui/navigation/summon.png'), accent: '#67d6a0' },
  { id: 'guild', label: 'กิลด์', image: publicUrl('ui/navigation/guild.png'), accent: '#7ad1b0' },
]

interface MainNavigationProps {
  /** เปิดหน้าทำเนียบวีรชน — ผูกกับปุ่ม id="heroes" เท่านั้น */
  onOpenHeroes: () => void
}

export function MainNavigation({ onOpenHeroes }: MainNavigationProps) {
  const { comingSoon } = useToast()

  const handleSelect = (id: string, label: string) => {
    if (id === 'heroes') {
      onOpenHeroes()
      return
    }
    comingSoon(label)
  }

  return (
    <nav className={styles.nav} aria-label="เมนูหลัก">
      <div className={styles.rail}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.item}
            style={{ '--nav-accent': item.accent } as React.CSSProperties}
            aria-label={item.label}
            data-menu-id={item.id}
            onClick={() => handleSelect(item.id, item.label)}
          >
            <span className={styles.art}>
              {item.image ? (
                <img src={item.image} alt="" draggable={false} />
              ) : (
                item.icon
              )}
            </span>
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

import type { ReactNode } from 'react'
import type { PlayerBadges } from '../../types/player'
import { playSfx } from '../../lib/audio/AudioEngine'
import { formatBadge } from '../../lib/format'
import { publicUrl } from '../../lib/publicUrl'
import { useToast } from '../Toast/useToast'
import styles from './SideActions.module.css'

interface SideActionsProps {
  badges: PlayerBadges
  onOpenSettings: () => void
  onOpenAddFriend: () => void
}

interface SideAction {
  id: string
  label: string
  icon: ReactNode
  count?: number
  onClick: () => void
}

export function SideActions({ badges, onOpenSettings, onOpenAddFriend }: SideActionsProps) {
  const { comingSoon } = useToast()
  const actions: SideAction[] = [
    { id: 'settings', label: 'ตั้งค่า', icon: <img src={publicUrl('ui/thai/settings.webp')} alt="" width={38} height={38} loading="eager" decoding="async" draggable={false} />, onClick: onOpenSettings },
    { id: 'mail', label: 'จดหมาย', icon: <img src={publicUrl('ui/thai/mail.webp')} alt="" width={38} height={38} loading="eager" decoding="async" draggable={false} />, count: badges.mail, onClick: () => comingSoon('จดหมาย') },
    { id: 'mission', label: 'ภารกิจ', icon: <img src={publicUrl('ui/thai/mission.webp')} alt="" width={38} height={38} loading="eager" decoding="async" draggable={false} />, count: badges.mission, onClick: () => comingSoon('ภารกิจ') },
    { id: 'add-friend', label: 'เพิ่มเพื่อน', icon: <img src={publicUrl('ui/thai/add-friend.webp')} alt="" width={38} height={38} loading="eager" decoding="async" draggable={false} />, onClick: onOpenAddFriend },
  ]

  return (
    <aside className={styles.column} aria-label="เมนูลัด">
      <span className={styles.railTitle}>เมนูด่วน</span>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={styles.action}
          data-action={action.id}
          onClick={() => {
            void playSfx('buttonClick')
            action.onClick()
          }}
          aria-label={action.count ? `${action.label} มี ${action.count} รายการใหม่` : action.label}
        >
          <span className={styles.actionLabel}>{action.label}</span>
          <span className={styles.iconPlate}>{action.icon}</span>
          {action.count ? <span className={styles.badge}>{formatBadge(action.count)}</span> : null}
        </button>
      ))}
    </aside>
  )
}

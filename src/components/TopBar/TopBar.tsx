import { useEffect, useState, type ReactNode } from 'react'
import type { Player } from '../../types/player'
import { clampRatio, formatNumber } from '../../lib/format'
import { PlusIcon } from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import { AvatarFrame } from './AvatarFrame'
import { CommanderAvatar } from './CommanderAvatar'
import styles from './TopBar.module.css'

interface TopBarProps {
  player: Player
  /** กดที่โปรไฟล์เพื่อเปิดหน้าต่างรายละเอียด */
  onOpenProfile: () => void
}

export function TopBar({ player, onOpenProfile }: TopBarProps) {
  const { comingSoon } = useToast()
  const expRatio = clampRatio(player.exp, player.expToNext)

  // เติมแถบ EXP จาก 0 ตอนเข้าหน้า ให้รู้สึกมีชีวิต
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(expRatio))
    return () => cancelAnimationFrame(id)
  }, [expRatio])

  return (
    <header className={styles.bar}>
      <button
        type="button"
        className={styles.profile}
        onClick={onOpenProfile}
        aria-label={`เปิดโปรไฟล์ของ ${player.name}`}
      >
        <span className={styles.profileTag}>ผู้พิทักษ์ตำนาน</span>
        <div className={styles.avatarWrap}>
          <AvatarFrame frameId={player.frameId} className={styles.avatarFrame}>
            <CommanderAvatar />
          </AvatarFrame>
          <span className={styles.levelBadge}>Lv.{player.level}</span>
        </div>

        <div className={styles.identity}>
          <p className={styles.name}>{player.name}</p>
          <span className={styles.title}>{player.title}</span>
          <div className={styles.expRow}>
            <div
              className={styles.expTrack}
              role="progressbar"
              aria-label="ค่าประสบการณ์"
              aria-valuemin={0}
              aria-valuemax={player.expToNext}
              aria-valuenow={player.exp}
            >
              <div className={styles.expFill} style={{ width: `${fill * 100}%` }} />
            </div>
            <span className={styles.expText}>
              {formatNumber(player.exp)} / {formatNumber(player.expToNext)}
            </span>
          </div>
        </div>
      </button>

      <div className={styles.wallet}>
        <span className={styles.walletLabel}>คลังสมบัติ</span>
        <CurrencyPill
          tone={styles.gold}
          icon={<img className={styles.currencyIcon} src="/ui/thai/gold-ingot.png" alt="" draggable={false} />}
          label="ทอง"
          value={player.currency.gold}
          onAdd={() => comingSoon('ร้านค้าเหรียญทอง')}
        />
        <CurrencyPill
          tone={styles.gem}
          icon={<img className={styles.currencyIcon} src="/ui/thai/jade.png" alt="" draggable={false} />}
          label="หยก"
          value={player.currency.gem}
          onAdd={() => comingSoon('ร้านค้าอัญมณี')}
        />
      </div>
    </header>
  )
}

interface CurrencyPillProps {
  tone: string
  icon: ReactNode
  label: string
  value: number
  onAdd: () => void
}

function CurrencyPill({ tone, icon, label, value, onAdd }: CurrencyPillProps) {
  return (
    <div className={`${styles.currency} ${tone}`}>
      <span className={styles.currencyGlow} aria-hidden="true" />
      {icon}
      <span className={styles.amount} aria-label={`${label} ${value}`}>
        {formatNumber(value)}
      </span>
      <button
        type="button"
        className={styles.addButton}
        onClick={onAdd}
        aria-label={`เติม${label}`}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

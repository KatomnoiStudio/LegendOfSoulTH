import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { CurrencyResult } from '../../data/accountRepository.shared'
import type { Player } from '../../types/player'
import { getCombatPower } from '../../game/characters'
import { clampRatio, formatNumber } from '../../lib/format'
import { publicUrl } from '../../lib/publicUrl'
import { CurrencyShopModal, type ShopCurrency } from '../CurrencyShopModal/CurrencyShopModal'
import { PlusIcon } from '../icons/GameIcons'
import { AvatarFrame } from './AvatarFrame'
import { CommanderAvatar } from './CommanderAvatar'
import styles from './TopBar.module.css'

// url('/ui/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_NAGA_STYLE: CSSProperties = {
  ['--bg-naga' as string]: `url(${publicUrl('ui/thai/naga-profile-frame.webp')})`,
}

interface TopBarProps {
  player: Player
  /** กดที่โปรไฟล์เพื่อเปิดหน้าต่างรายละเอียด */
  onOpenProfile: () => void
  /** เติมทองด้วยเงินจริง */
  onTopUpGold: (packageId: string) => Promise<CurrencyResult>
  /** เติมหยกด้วยเงินจริง */
  onTopUpGems: (packageId: string) => Promise<CurrencyResult>
}

export function TopBar({ player, onOpenProfile, onTopUpGold, onTopUpGems }: TopBarProps) {
  const expRatio = clampRatio(player.exp, player.expToNext)
  const combatPower = getCombatPower(player.ownedCharacters)
  /** currency ที่กำลังเติมอยู่ — null แปลว่าปิด modal */
  const [shopCurrency, setShopCurrency] = useState<ShopCurrency | null>(null)

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
        style={BG_NAGA_STYLE}
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
          <span className={styles.power}>พลังรบ {formatNumber(combatPower)}</span>
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
          icon={
            <img
              className={styles.currencyIcon}
              src={publicUrl('ui/thai/gold-ingot.webp')}
              alt=""
              width={32}
              height={32}
              loading="eager"
              decoding="async"
              draggable={false}
            />
          }
          label="ทอง"
          value={player.currency.gold}
          addLabel="เติมทอง"
          onAdd={() => setShopCurrency('gold')}
        />
        <CurrencyPill
          tone={styles.gem}
          icon={
            <img
              className={styles.currencyIcon}
              src={publicUrl('ui/thai/jade.webp')}
              alt=""
              width={32}
              height={32}
              loading="eager"
              decoding="async"
              draggable={false}
            />
          }
          label="หยก"
          value={player.currency.gem}
          addLabel="เติมหยก"
          onAdd={() => setShopCurrency('gem')}
        />
      </div>

      {shopCurrency ? (
        <CurrencyShopModal
          currency={shopCurrency}
          onBuy={shopCurrency === 'gold' ? onTopUpGold : onTopUpGems}
          onClose={() => setShopCurrency(null)}
        />
      ) : null}
    </header>
  )
}

interface CurrencyPillProps {
  tone: string
  icon: ReactNode
  label: string
  value: number
  /** ข้อความอธิบายปุ่มบวก เช่น "เติมหยก" — ไม่ส่งมาพร้อมกับ onAdd แปลว่าค่านี้เพิ่มเองไม่ได้ */
  addLabel?: string
  pending?: boolean
  onAdd?: () => void
}

function CurrencyPill({ tone, icon, label, value, addLabel, pending, onAdd }: CurrencyPillProps) {
  return (
    <div className={`${styles.currency} ${tone}`}>
      <span className={styles.currencyGlow} aria-hidden="true" />
      {icon}
      <span className={styles.amount} aria-label={`${label} ${value}`}>
        {formatNumber(value)}
      </span>
      {onAdd ? (
        <button
          type="button"
          className={styles.addButton}
          onClick={onAdd}
          disabled={pending}
          aria-label={addLabel}
          title={addLabel}
        >
          <PlusIcon />
        </button>
      ) : null}
    </div>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import type { CurrencyResult, GoldSource } from '../../data/accountRepository'
import type { Player } from '../../types/player'
import { getCombatPower } from '../../game/characters'
import { clampRatio, formatNumber } from '../../lib/format'
import { GemShopModal } from '../GemShopModal/GemShopModal'
import { PlusIcon } from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import { AvatarFrame } from './AvatarFrame'
import { CommanderAvatar } from './CommanderAvatar'
import styles from './TopBar.module.css'

/** ช่วงทองที่ได้ต่อครั้งจากของตกระหว่างเล่น (เดโม — ยังไม่มีระบบดรอปจริง) */
const DROP_GOLD_MIN = 20
const DROP_GOLD_MAX = 80

function rollDropGold(): number {
  return DROP_GOLD_MIN + Math.floor(Math.random() * (DROP_GOLD_MAX - DROP_GOLD_MIN + 1))
}

interface TopBarProps {
  player: Player
  /** กดที่โปรไฟล์เพื่อเปิดหน้าต่างรายละเอียด */
  onOpenProfile: () => void
  /** ให้ทองจากการเล่นเท่านั้น — ทำเควสสำเร็จหรือของดรอป */
  onEarnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  /** เติมหยกด้วยเงินจริง */
  onTopUpGems: (packageId: string) => Promise<CurrencyResult>
}

export function TopBar({ player, onOpenProfile, onEarnGold, onTopUpGems }: TopBarProps) {
  const { showToast } = useToast()
  const expRatio = clampRatio(player.exp, player.expToNext)
  const combatPower = getCombatPower(player.ownedCharacters)
  const [collectingGold, setCollectingGold] = useState(false)
  const [gemShopOpen, setGemShopOpen] = useState(false)

  // เติมแถบ EXP จาก 0 ตอนเข้าหน้า ให้รู้สึกมีชีวิต
  const [fill, setFill] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(expRatio))
    return () => cancelAnimationFrame(id)
  }, [expRatio])

  /** จำลอง "เก็บของตก" — ของจริงจะถูกเรียกจากระบบเควส/ต่อสู้เมื่อมีระบบนั้นแล้ว */
  const handleCollectGoldDrop = async () => {
    if (collectingGold) return
    setCollectingGold(true)
    const amount = rollDropGold()
    const result = await onEarnGold('drop', amount)
    setCollectingGold(false)
    showToast(result.ok ? `เก็บของตกได้ทอง +${formatNumber(result.amount)}` : result.error)
  }

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
          icon={<img className={styles.currencyIcon} src="/ui/thai/gold-ingot.png" alt="" draggable={false} />}
          label="ทอง"
          value={player.currency.gold}
          addLabel="เก็บของตก"
          pending={collectingGold}
          onAdd={() => void handleCollectGoldDrop()}
        />
        <CurrencyPill
          tone={styles.gem}
          icon={<img className={styles.currencyIcon} src="/ui/thai/jade.png" alt="" draggable={false} />}
          label="หยก"
          value={player.currency.gem}
          addLabel="เติมหยก"
          onAdd={() => setGemShopOpen(true)}
        />
      </div>

      {gemShopOpen ? (
        <GemShopModal onBuy={onTopUpGems} onClose={() => setGemShopOpen(false)} />
      ) : null}
    </header>
  )
}

interface CurrencyPillProps {
  tone: string
  icon: ReactNode
  label: string
  value: number
  /** ข้อความอธิบายปุ่มบวก เช่น "เก็บของตก" หรือ "เติมหยก" */
  addLabel: string
  pending?: boolean
  onAdd: () => void
}

function CurrencyPill({ tone, icon, label, value, addLabel, pending, onAdd }: CurrencyPillProps) {
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
        disabled={pending}
        aria-label={addLabel}
        title={addLabel}
      >
        <PlusIcon />
      </button>
    </div>
  )
}

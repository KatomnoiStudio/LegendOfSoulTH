import { useEffect, useState } from 'react'
import {
  GOLD_PACKAGES,
  GEM_PACKAGES,
  type CurrencyResult,
  type GoldPackage,
  type GemPackage,
} from '../../data/accountRepository'
import { formatNumber } from '../../lib/format'
import { useToast } from '../Toast/useToast'
import styles from './CurrencyShopModal.module.css'

export type ShopCurrency = 'gold' | 'gem'

interface CurrencyShopModalProps {
  /** เติมทองหรือเติมหยก — เลือกแพ็กเกจ/ข้อความ/สีให้ตรงกันตามนี้ */
  currency: ShopCurrency
  onBuy: (packageId: string) => Promise<CurrencyResult>
  onClose: () => void
}

const COPY: Record<ShopCurrency, { title: string; unit: string; tone: string }> = {
  gold: { title: 'เติมทอง', unit: 'ทอง', tone: 'gold' },
  gem: { title: 'เติมหยก', unit: 'หยก', tone: 'gem' },
}

/** หน้าต่างเติมทอง/หยก — เลือกแพ็กเกจแล้วซื้อได้ทันที (เดโม ยังไม่ผูกการชำระเงินจริง) */
export function CurrencyShopModal({ currency, onBuy, onClose }: CurrencyShopModalProps) {
  const { showToast } = useToast()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const copy = COPY[currency]
  const packages: (GoldPackage | GemPackage)[] = currency === 'gold' ? GOLD_PACKAGES : GEM_PACKAGES

  // ปิดด้วยปุ่ม Esc เหมือน modal อื่น ๆ ในเกม
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleBuy = async (pack: GoldPackage | GemPackage) => {
    if (pendingId) return
    setPendingId(pack.id)
    const result = await onBuy(pack.id)
    setPendingId(null)

    if (result.ok) {
      showToast(`${copy.title}สำเร็จ +${formatNumber(result.amount)}`)
      onClose()
    } else {
      showToast(result.error)
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={copy.title}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
          ×
        </button>

        <h2 className={styles.title}>{copy.title}</h2>
        <p className={styles.subtitle}>ยังไม่ต่อระบบชำระเงินจริง — ใช้ทดสอบเท่านั้น</p>

        <div className={styles.packages}>
          {packages.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={styles.package}
              disabled={pendingId !== null}
              onClick={() => void handleBuy(pack)}
            >
              <span className={`${styles.packageAmount} ${styles[copy.tone]}`}>
                {formatNumber(pack.amount)} {copy.unit}
              </span>
              <span className={styles.packagePrice}>
                {pendingId === pack.id ? 'กำลังเติม...' : pack.priceLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

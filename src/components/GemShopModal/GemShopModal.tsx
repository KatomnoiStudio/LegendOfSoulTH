import { useState } from 'react'
import { GEM_PACKAGES, type CurrencyResult, type GemPackage } from '../../data/accountRepository'
import { formatNumber } from '../../lib/format'
import { useToast } from '../Toast/useToast'
import styles from './GemShopModal.module.css'

interface GemShopModalProps {
  /** เติมหยกด้วยเงินจริง — ยังไม่ต่อ payment gateway จริง (ดู accountRepository.topUpGems) */
  onBuy: (packageId: string) => Promise<CurrencyResult>
  onClose: () => void
}

/** หน้าต่างเติมหยก — เลือกแพ็กเกจแล้วซื้อได้ทันที (เดโม ยังไม่ผูกการชำระเงินจริง) */
export function GemShopModal({ onBuy, onClose }: GemShopModalProps) {
  const { showToast } = useToast()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleBuy = async (pack: GemPackage) => {
    if (pendingId) return
    setPendingId(pack.id)
    const result = await onBuy(pack.id)
    setPendingId(null)

    if (result.ok) {
      showToast(`เติมหยกสำเร็จ +${formatNumber(result.amount)}`)
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
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="เติมหยก">
        <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
          ×
        </button>

        <h2 className={styles.title}>เติมหยก</h2>
        <p className={styles.subtitle}>ยังไม่ต่อระบบชำระเงินจริง — ใช้ทดสอบเท่านั้น</p>

        <div className={styles.packages}>
          {GEM_PACKAGES.map((pack) => (
            <button
              key={pack.id}
              type="button"
              className={styles.package}
              disabled={pendingId !== null}
              onClick={() => void handleBuy(pack)}
            >
              <span className={styles.packageGem}>{formatNumber(pack.gem)} หยก</span>
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

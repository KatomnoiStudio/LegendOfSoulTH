import { useEffect, useState } from 'react'
import type { FriendCandidate } from '../../data/accountRepository'
import { AddFriendIcon, BlockIcon, HeroesIcon } from '../icons/GameIcons'
import { AddFriendPanel } from './AddFriendPanel'
import styles from './AddFriendModal.module.css'

interface AddFriendModalProps {
  /** ค้นหาผู้เล่นจาก UID — คืน null ถ้าไม่พบ */
  onSearch: (uid: string) => Promise<FriendCandidate | null>
  onClose: () => void
}

type TabId = 'friend' | 'list' | 'block'

/**
 * หน้าต่างเพิ่มเพื่อน — เปิดจากไอคอนแถบข้าง โครงหน้าต่างเหมือน SettingsModal
 * (header + แถบแท็บ + block เนื้อหา) มีสามแท็บ: "เพิ่มเพื่อน" / "รายชื่อเพื่อน" / "บล็อค"
 */
export function AddFriendModal({ onSearch, onClose }: AddFriendModalProps) {
  const [tab, setTab] = useState<TabId>('friend')

  // ปิดด้วยปุ่ม Esc เหมือน modal อื่น ๆ ในเกม
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
  // ยังไม่มีระบบรายชื่อเพื่อน/บล็อคผู้เล่นจริง (ไม่มีที่เก็บถาวรเลย) จึงว่างเสมอตอนนี้
  // เมื่อมีระบบแล้วให้เติมรายชื่อจริงตรงนี้ — มีแล้วค่อยแสดงรายการ ไม่มีก็ปล่อยว่างไว้
  const friendsList: FriendCandidate[] = []
  const blockedPlayers: FriendCandidate[] = []

  const tabs: { id: TabId; label: string; icon: typeof AddFriendIcon }[] = [
    { id: 'friend', label: 'เพิ่มเพื่อน', icon: AddFriendIcon },
    { id: 'list', label: 'รายชื่อเพื่อน', icon: HeroesIcon },
    { id: 'block', label: 'บล็อค', icon: BlockIcon },
  ]

  return (
    <div
      className={styles.backdrop}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="เพิ่มเพื่อน">
        <header className={styles.header}>
          <AddFriendIcon className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>เพิ่มเพื่อน</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </header>

        <div className={styles.tabs} role="tablist">
          {tabs.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={styles.tab}
                onClick={() => setTab(item.id)}
              >
                <Icon />
                {item.label}
              </button>
            )
          })}
        </div>

        {tab === 'friend' ? (
          <section className={styles.panel} role="tabpanel" aria-label="เพิ่มเพื่อน" key="friend">
            <div className={styles.block}>
              <AddFriendPanel onSearch={onSearch} />
            </div>
          </section>
        ) : null}

        {tab === 'list' ? (
          <section className={styles.panel} role="tabpanel" aria-label="รายชื่อเพื่อน" key="list">
            {friendsList.length > 0 ? (
              <div className={styles.block}>
                {friendsList.map((player) => (
                  <div key={player.uid} className={styles.resultCard}>
                    <div className={styles.resultInfo}>
                      <strong className={styles.resultName}>{player.name}</strong>
                      <span className={styles.resultMeta}>
                        เลเวล {player.level} · {player.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'block' ? (
          <section className={styles.panel} role="tabpanel" aria-label="บล็อค" key="block">
            {blockedPlayers.length > 0 ? (
              <div className={styles.block}>
                {blockedPlayers.map((player) => (
                  <div key={player.uid} className={styles.resultCard}>
                    <div className={styles.resultInfo}>
                      <strong className={styles.resultName}>{player.name}</strong>
                      <span className={styles.resultMeta}>
                        เลเวล {player.level} · {player.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}

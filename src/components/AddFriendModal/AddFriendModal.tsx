import { useState } from 'react'
import type { FriendCandidate, Player } from '../../types/player'
import { useModalA11y } from '../../hooks/useModalA11y'
import { AddFriendIcon, BlockIcon, HeroesIcon } from '../icons/GameIcons'
import { AddFriendPanel } from './AddFriendPanel'
import styles from './AddFriendModal.module.css'

interface AddFriendModalProps {
  player: Player
  /** บันทึกรายชื่อเพื่อนกลับลงฐานข้อมูล */
  onPlayerChange: (next: Player) => Promise<void>
  /** ค้นหาผู้เล่นจาก UID — คืน null ถ้าไม่พบ */
  onSearch: (uid: string) => Promise<FriendCandidate | null>
  onClose: () => void
}

type TabId = 'friend' | 'list' | 'block'

/**
 * หน้าต่างเพิ่มเพื่อน — เปิดจากไอคอนแถบข้าง โครงหน้าต่างเหมือน SettingsModal
 * (header + แถบแท็บ + block เนื้อหา) มีสามแท็บ: "เพิ่มเพื่อน" / "รายชื่อเพื่อน" / "บล็อค"
 */
export function AddFriendModal({ player, onPlayerChange, onSearch, onClose }: AddFriendModalProps) {
  const [tab, setTab] = useState<TabId>('friend')

  // Esc, backdrop-click, focus trap, คืนโฟกัสตอนปิด — รวมไว้ที่ useModalA11y ตัวเดียว
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onClose)
  const friendsList = player.friends ?? []
  // ยังไม่มีระบบบล็อคผู้เล่นจริง (ไม่มีปุ่ม/action ให้เรียกเลย) จึงว่างเสมอตอนนี้ —
  // เมื่อมีระบบแล้วให้เก็บ blockedUids บน Player แบบเดียวกับ friends แล้วเติมรายชื่อจริงตรงนี้
  const blockedPlayers: FriendCandidate[] = []

  // คืน promise ให้ผู้เรียกรอได้ ไม่ใช่ยิงทิ้ง — ปุ่มเพิ่มเพื่อนต้องรู้ว่าเขียนเสร็จแล้ว
  // ค่อยบอกผู้เล่นว่าสำเร็จ (ดูคอมเมนต์ใน AddFriendPanel.handleAdd)
  const handleAddFriend = (candidate: FriendCandidate) =>
    onPlayerChange({ ...player, friends: [...friendsList, candidate] })

  const tabs: { id: TabId; label: string; icon: typeof AddFriendIcon }[] = [
    { id: 'friend', label: 'เพิ่มเพื่อน', icon: AddFriendIcon },
    { id: 'list', label: 'รายชื่อเพื่อน', icon: HeroesIcon },
    { id: 'block', label: 'บล็อค', icon: BlockIcon },
  ]

  return (
    <div className={styles.backdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="เพิ่มเพื่อน"
        tabIndex={-1}
      >
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
              <AddFriendPanel
                onSearch={onSearch}
                isFriend={(uid) => friendsList.some((friend) => friend.uid === uid)}
                onAddFriend={handleAddFriend}
              />
            </div>
          </section>
        ) : null}

        {tab === 'list' ? (
          <section className={styles.panel} role="tabpanel" aria-label="รายชื่อเพื่อน" key="list">
            {friendsList.length > 0 ? (
              <div className={styles.block}>
                {friendsList.map((friend) => (
                  <div key={friend.uid} className={styles.resultCard}>
                    <div className={styles.resultInfo}>
                      <strong className={styles.resultName}>{friend.name}</strong>
                      <span className={styles.resultMeta}>
                        เลเวล {friend.level} · {friend.title}
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
                {blockedPlayers.map((blocked) => (
                  <div key={blocked.uid} className={styles.resultCard}>
                    <div className={styles.resultInfo}>
                      <strong className={styles.resultName}>{blocked.name}</strong>
                      <span className={styles.resultMeta}>
                        เลเวล {blocked.level} · {blocked.title}
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

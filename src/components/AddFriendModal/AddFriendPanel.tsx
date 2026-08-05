import { useState, type FormEvent } from 'react'
import type { FriendCandidate } from '../../data/accountRepository'
import { formatUid, isValidUid, UID_LENGTH } from '../../game/uid'
import { AddFriendIcon } from '../icons/GameIcons'
import { useToast } from '../Toast/useToast'
import styles from './AddFriendModal.module.css'

interface AddFriendPanelProps {
  /** ค้นหาผู้เล่นจาก UID — คืน null ถ้าไม่พบ */
  onSearch: (uid: string) => Promise<FriendCandidate | null>
}

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; player: FriendCandidate }
  | { status: 'not-found' }

/**
 * เนื้อหาค้นหา+เพิ่มเพื่อนด้วย UID — แยกออกมาจากตัวหน้าต่างเพื่อใช้ซ้ำได้ทั้งใน
 * AddFriendModal (เปิดจากไอคอนลัด) และแท็บ "เพิ่มเพื่อน" ใน SettingsModal
 *
 * ค้นหาด้วย UID เท่านั้น (ไม่ใช้ชื่อ/อีเมล กันเดาชื่อคนอื่นมั่ว ๆ)
 * ยังไม่มีระบบ "รายชื่อเพื่อน" จริง เพราะยังไม่มีการร้องขอมา — กด "เพิ่มเพื่อน" แล้วแจ้งผลผ่าน toast เท่านั้น
 */
export function AddFriendPanel({ onSearch }: AddFriendPanelProps) {
  const { showToast } = useToast()
  const [uidInput, setUidInput] = useState('')
  const [search, setSearch] = useState<SearchState>({ status: 'idle' })

  const isValid = isValidUid(uidInput)

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid || search.status === 'loading') return

    setSearch({ status: 'loading' })
    const player = await onSearch(uidInput)
    setSearch(player ? { status: 'found', player } : { status: 'not-found' })
  }

  const handleAdd = (player: FriendCandidate) => {
    showToast(`เพิ่ม${player.name}เป็นเพื่อนแล้ว`)
    setUidInput('')
    setSearch({ status: 'idle' })
  }

  return (
    <>
      <form className={styles.searchForm} onSubmit={(event) => void handleSearch(event)}>
        <label className={styles.searchLabel} htmlFor="friend-uid">
          รหัสผู้เล่น (UID)
        </label>
        <input
          id="friend-uid"
          className={styles.searchInput}
          type="text"
          inputMode="numeric"
          value={uidInput}
          maxLength={UID_LENGTH}
          autoComplete="off"
          placeholder="กรอกรหัส 10 หลักของเพื่อน..."
          aria-describedby="friend-uid-hint"
          onChange={(event) => {
            setUidInput(event.target.value.replace(/[^0-9]/g, ''))
            setSearch({ status: 'idle' })
          }}
        />
        <span className={styles.searchHint} id="friend-uid-hint">
          ค้นหาได้ด้วยรหัส UID เท่านั้น — ไม่รองรับค้นหาด้วยชื่อ
        </span>

        <button type="submit" className={styles.searchButton} disabled={!isValid || search.status === 'loading'}>
          {search.status === 'loading' ? 'กำลังค้นหา...' : 'ค้นหา'}
        </button>
      </form>

      {search.status === 'found' ? (
        <div className={styles.resultCard}>
          <div className={styles.resultInfo}>
            <strong className={styles.resultName}>{search.player.name}</strong>
            <span className={styles.resultMeta}>
              เลเวล {search.player.level} · {search.player.title}
            </span>
            <span className={styles.resultUid}>UID {formatUid(search.player.uid)}</span>
          </div>
          <button type="button" className={styles.addButton} onClick={() => handleAdd(search.player)}>
            <AddFriendIcon />
            เพิ่มเพื่อน
          </button>
        </div>
      ) : null}

      {search.status === 'not-found' ? (
        <p className={styles.notFound}>ไม่พบผู้เล่นรหัสนี้ ลองตรวจสอบ UID อีกครั้ง</p>
      ) : null}
    </>
  )
}

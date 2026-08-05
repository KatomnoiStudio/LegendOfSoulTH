import { Suspense, lazy, useMemo, useState } from 'react'
import { getCharacter } from '../game/characters'
import { WukongAdventure } from '../components/AdventureScene/WukongAdventure'
import { GameExplorationSession } from '../components/GameExplorationSession/GameExplorationSession'
import { CharacterRosterModal } from '../components/CharacterRoster/CharacterRosterModal'
import { MainNavigation } from '../components/MainNavigation/MainNavigation'
import { ProfileModal } from '../components/ProfileModal/ProfileModal'
import {
  SettingsModal,
  type AudioSettings,
} from '../components/SettingsModal/SettingsModal'
import { SideActions } from '../components/SideActions/SideActions'
import { StartAdventure } from '../components/StartAdventure/StartAdventure'
import { TopBar } from '../components/TopBar/TopBar'
import { MOCK_BADGES } from '../data/mockPlayer'
import type { CurrencyResult } from '../data/accountRepository'
import type { Player } from '../types/player'
import styles from './LobbyPage.module.css'

/** โหลดฉาก 3D แยก chunk เพื่อให้ HUD ขึ้นก่อน (three.js มีขนาดใหญ่) */
const LobbyScene = lazy(() =>
  import('../components/LobbyScene/LobbyScene').then((m) => ({ default: m.LobbyScene })),
)

interface LobbyPageProps {
  /** ผู้เล่นที่ล็อกอินอยู่ — มาจากฐานข้อมูล ไม่ใช่ mock อีกแล้ว */
  player: Player
  /** บันทึกความคืบหน้ากลับลงฐานข้อมูล */
  onPlayerChange: (next: Player) => Promise<void>
  onLogout: () => Promise<void>
  /** เติมหยกด้วยเงินจริง */
  onTopUpGems: (packageId: string) => Promise<CurrencyResult>
  /** แลกโค้ดคูปองเป็นหยก */
  onRedeemCoupon: (code: string) => Promise<CurrencyResult>
}

export function LobbyPage({
  player,
  onPlayerChange,
  onLogout,
  onTopUpGems,
  onRedeemCoupon,
}: LobbyPageProps) {
  // แจ้งเตือนจดหมาย/ภารกิจยังเป็น mock เพราะยังไม่มีระบบทั้งสองอย่าง
  const badges = MOCK_BADGES

  /** ตัวละครที่บัญชีนี้ครอบครองจริง — ใช้เป็นตัวเลือกในฉากเดิน */
  const ownedCharacters = useMemo(
    () =>
      player.ownedCharacters.flatMap((owned) => {
        const character = getCharacter(owned.characterId)
        return character
          ? [{ ...character, level: owned.level, exp: owned.exp, expToNext: owned.expToNext }]
          : []
      }),
    [player.ownedCharacters],
  )
  /**
   * ตัวละครที่ถูกแตะในฉาก — ตอนนี้ใช้แค่แสดงวงแหวนใต้เท้าและกระตุ้นท่าประจำตัว
   * (แผงข้อมูลตอนแตะโมเดลถูกถอดออกไว้ก่อน รอดูว่าจะใส่อะไรแทนในอนาคต)
   */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rosterOpen, setRosterOpen] = useState(false)
  const [explorationOpen, setExplorationOpen] = useState(false)
  // เก็บค่าเสียงไว้ที่นี่เพื่อให้ค่าคงอยู่หลังปิดหน้าต่างตั้งค่า
  const [audio, setAudio] = useState<AudioSettings>({
    master: 70,
    music: 60,
    sfx: 80,
    muted: false,
  })

  return (
    <main className={styles.page}>
      <Suspense fallback={<div className={styles.sceneFallback}>กำลังเข้าสู่ลานประลอง…</div>}>
        <LobbyScene
          teamSlots={player.teamSlots}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </Suspense>

      <TopBar
        player={player}
        onOpenProfile={() => setProfileOpen(true)}
        onTopUpGems={onTopUpGems}
      />

      <div className={styles.stage}>
        <SideActions badges={badges} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      <div className={styles.startRow}>
        <StartAdventure onStart={() => setExplorationOpen(true)} />
      </div>

      <MainNavigation
        onOpenHeroes={() => setRosterOpen(true)}
        onOpenBattle={() => setExplorationOpen(true)}
      />

      {explorationOpen ? (
        <GameExplorationSession
          player={player}
          onPlayerChange={onPlayerChange}
          onExit={() => setExplorationOpen(false)}
        />
      ) : null}

      {/*
        เดินชมจันทร์เปิดอยู่ตลอดเวลาที่อยู่ในลอบบี้ ไม่ต้องกดปุ่มเปิดจากโปรไฟล์อีกต่อไป
        คุมทิศทางด้วย WASD/คลิกพื้นได้เหมือนเดิม เลือกตัวที่จะเดินได้จากแถบเลือกขุนพล
        (ตำแหน่งที่เดินอยู่ยังคงอยู่แม้สลับตัวละคร เพราะ component ไม่ถูก mount ใหม่)
      */}
      <WukongAdventure mode="moonlight" characters={ownedCharacters} />

      {/* หน้า Lobby ยังคง mount อยู่ข้างหลัง ฉาก 3D และแอนิเมชันตัวละครจึงไม่รีเซ็ต */}
      {rosterOpen ? <CharacterRosterModal player={player} onClose={() => setRosterOpen(false)} /> : null}

      {profileOpen ? <ProfileModal player={player} onClose={() => setProfileOpen(false)} /> : null}

      {settingsOpen ? (
        <SettingsModal
          audio={audio}
          onAudioChange={setAudio}
          onLogout={onLogout}
          onRedeemCoupon={onRedeemCoupon}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </main>
  )
}

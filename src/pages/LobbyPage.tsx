import { Suspense, lazy, useMemo, useState } from 'react'
import { getCharacter } from '../game/characters'
import { AddFriendModal } from '../components/AddFriendModal/AddFriendModal'
import { WukongAdventure } from '../components/AdventureScene/WukongAdventure'
import { WorldChat } from '../components/WorldChat/WorldChat'
import { GameExplorationSession } from '../components/GameExplorationSession/GameExplorationSession'
import { CharacterRosterModal } from '../components/CharacterRoster/CharacterRosterModal'
import { ItemsModal } from '../components/ItemsModal/ItemsModal'
import { MainNavigation } from '../components/MainNavigation/MainNavigation'
import { ProfileModal } from '../components/ProfileModal/ProfileModal'
import {
  SettingsModal,
  type AudioSettings,
} from '../components/SettingsModal/SettingsModal'
import { getAudioSettings, setAudioSettings } from '../lib/audio/AudioEngine'
import { SideActions } from '../components/SideActions/SideActions'
import { StartAdventure } from '../components/StartAdventure/StartAdventure'
import { TopBar } from '../components/TopBar/TopBar'
import { MOCK_BADGES } from '../data/mockPlayer'
import type {
  CharacterGrantResult,
  CurrencyResult,
  FriendCandidate,
} from '../data/accountRepository'
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
  /** เติมทองด้วยเงินจริง */
  onTopUpGold: (packageId: string) => Promise<CurrencyResult>
  /** เติมหยกด้วยเงินจริง */
  onTopUpGems: (packageId: string) => Promise<CurrencyResult>
  /** แลกโค้ดคูปองเป็นหยก */
  onRedeemCoupon: (code: string) => Promise<CurrencyResult>
  /** ค้นหาผู้เล่นจาก UID เพื่อเพิ่มเพื่อน */
  onFindFriend: (uid: string) => Promise<FriendCandidate | null>
  /** บัญชีนี้ใช้คำสั่งลับในแชทได้ไหม — ไม่มีผลต่อหน้าตา UI เลย (ดู src/data/admins.ts) */
  isAdmin: boolean
  /** มอบตัวละครให้บัญชีนี้ — เรียกจากคำสั่งลับในแชท (ดู WorldChat.tsx) */
  onGiveCharacter: (characterId: string) => Promise<CharacterGrantResult>
  /** ส่งออก save เป็นไฟล์ JSON — คืน null เมื่อสำเร็จ (ดาวน์โหลดแล้ว) คืนข้อความเมื่อผิดพลาด */
  onExportSave: () => Promise<string | null>
}

export function LobbyPage({
  player,
  onPlayerChange,
  onLogout,
  onTopUpGold,
  onTopUpGems,
  onRedeemCoupon,
  onFindFriend,
  isAdmin,
  onGiveCharacter,
  onExportSave,
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
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [itemsOpen, setItemsOpen] = useState(false)
  // ค่าเริ่มต้นอ่านจาก engine (persist ผ่าน localStorage) — เก็บ mirror ไว้ที่นี่แค่ให้ React re-render
  const [audio, setAudio] = useState<AudioSettings>(getAudioSettings())
  const handleAudioChange = (next: AudioSettings) => {
    setAudioSettings(next)
    setAudio(next)
  }

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
        onTopUpGold={onTopUpGold}
        onTopUpGems={onTopUpGems}
      />

      <div className={styles.stage}>
        <SideActions
          badges={badges}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenAddFriend={() => setAddFriendOpen(true)}
        />
      </div>

      <div className={styles.startRow}>
        <StartAdventure onStart={() => setExplorationOpen(true)} />
      </div>

      <MainNavigation
        onOpenHeroes={() => setRosterOpen(true)}
        onOpenBattle={() => setExplorationOpen(true)}
        onOpenItems={() => setItemsOpen(true)}
      />

      {/*
        แชทเห็นได้ทุกบัญชีตั้งใจ (ไม่ใช่ dev-only/admin-only gate อีกต่อไป — คำสั่งลับ
        ผู้ดูแลซ่อนอยู่ข้างในโดยไม่ใบ้อะไรใน UI เลย ดู WorldChat.tsx). แทนที่ CommandConsole
        เดิม (ซึ่งอีกเครื่องเพิ่งใส่ import.meta.env.DEV gate ไว้พร้อมกัน — ไม่ต้องแล้วเพราะ
        component เปลี่ยนชื่อ/พฤติกรรมไปคนละแบบ ไม่ใช่คอนโซลลับอีกต่อไป)
      */}
      <WorldChat playerName={player.name} isAdmin={isAdmin} onGiveCharacter={onGiveCharacter} />

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

      {addFriendOpen ? (
        <AddFriendModal onSearch={onFindFriend} onClose={() => setAddFriendOpen(false)} />
      ) : null}

      {itemsOpen ? <ItemsModal player={player} onClose={() => setItemsOpen(false)} /> : null}

      {settingsOpen ? (
        <SettingsModal
          audio={audio}
          onAudioChange={handleAudioChange}
          onLogout={onLogout}
          onRedeemCoupon={onRedeemCoupon}
          ownedCharacterCount={ownedCharacters.length}
          onClose={() => setSettingsOpen(false)}
          onExportSave={onExportSave}
        />
      ) : null}
    </main>
  )
}

import { useState } from 'react'
import { AuthModal } from './components/AuthModal/AuthModal'
import { GameViewport } from './components/GameViewport/GameViewport'
import { NameModal } from './components/NameModal/NameModal'
import { ToastProvider } from './components/Toast/ToastProvider'
import { UpdateBanner } from './components/UpdateBanner/UpdateBanner'
import { useAuth } from './hooks/useAuth'
import { LobbyPage } from './pages/LobbyPage'
import { TitlePage } from './pages/TitlePage'

/**
 * เส้นทางเข้าเกม
 *
 *   ยังไม่ล็อกอิน            → หน้าเริ่มเกม → กดแล้วขึ้นหน้าสมัคร/เข้าสู่ระบบ
 *   ล็อกอินแล้วแต่ยังไม่ตั้งชื่อ → หน้าตั้งชื่อตัวละคร
 *   ครบแล้ว                  → ลอบบี้
 *
 * ผู้เล่นที่เคยล็อกอินไว้จะเข้าลอบบี้ทันทีโดยไม่ต้องผ่านสองหน้าแรก
 * (session ถูกกู้จากฐานข้อมูลใน useAuth)
 */
export default function App() {
  const {
    status,
    player,
    register,
    login,
    loginWithGoogle,
    loginAsGuest,
    logout,
    hasGoogleLinked,
    linkGoogleAccount,
    isGuest,
    updatePlayer,
    earnGold,
    topUpGold,
    topUpGems,
    redeemCoupon,
    findFriendByUid,
    isAdmin,
    grantCharacter,
    grantGoldAdmin,
    grantItemAdmin,
    grantItem,
    commitLobbyBattleProgression,
    upsertPendingLobbyReward,
    clearPendingLobbyReward,
    getPendingLobbyRewards,
    pullGacha,
    spendProgressionUpgrade,
  } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  const isDevPreview =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === 'lobby'

  const activePlayer = isDevPreview
    ? {
        id: 'dev-preview-player',
        uid: 'LOS-8888-8888',
        name: 'ราชาวานร',
        title: 'ผู้พิชิตสวรรค์',
        level: 45,
        exp: 3400,
        expToNext: 5000,
        currency: {
          gold: 88888,
          gem: 3500,
        },
        energy: 120,
        maxEnergy: 120,
        ownedCharacters: [
          {
            characterId: 'monkey-king',
            level: 45,
            exp: 1200,
            expToNext: 3000,
            obtainedAt: new Date().toISOString(),
            star: 5,
            shards: 40,
            skillLevels: {
              skill1: { level: 10, exp: 0, expToNext: 500 },
              skill2: { level: 10, exp: 0, expToNext: 500 },
              skill3: { level: 10, exp: 0, expToNext: 500 },
              ultimate: { level: 10, exp: 0, expToNext: 500 },
            },
          },
          {
            characterId: 'pig-warrior',
            level: 40,
            exp: 800,
            expToNext: 2500,
            obtainedAt: new Date().toISOString(),
            star: 4,
            shards: 15,
            skillLevels: {
              skill1: { level: 8, exp: 0, expToNext: 400 },
              skill2: { level: 8, exp: 0, expToNext: 400 },
              skill3: { level: 8, exp: 0, expToNext: 400 },
              ultimate: { level: 8, exp: 0, expToNext: 400 },
            },
          },
          {
            characterId: 'pilgrim-monk',
            level: 38,
            exp: 500,
            expToNext: 2000,
            obtainedAt: new Date().toISOString(),
            star: 4,
            shards: 10,
            skillLevels: {
              skill1: { level: 7, exp: 0, expToNext: 350 },
              skill2: { level: 7, exp: 0, expToNext: 350 },
              skill3: { level: 7, exp: 0, expToNext: 350 },
              ultimate: { level: 7, exp: 0, expToNext: 350 },
            },
          },
        ],
        teamSlots: ['monkey-king', 'pig-warrior', 'pilgrim-monk', null],

        friends: [],
        frameId: 'naga-frame',
        inventory: [
          {
            itemId: 'hp-potion-small',
            quantity: 25,
            obtainedAt: new Date().toISOString(),
            obtainedFrom: 'quest',
          },
          {
            itemId: 'upgrade-stone-low',
            quantity: 150,
            obtainedAt: new Date().toISOString(),
            obtainedFrom: 'drop',
          },
        ],
        progress: {
          flags: { stage_forest_cleared: true, 'stage-1-1': true, 'stage-1-2': true },
          defeatedNpcIds: ['bandit-scout', 'forest-wolf'],
          battleHistory: [],
          energy: {
            current: 120,
            max: 120,
            lastRegenAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          },
        },

        badges: { mail: 2, mission: 4 },
      }
    : player

  const handlePlayerChange = isDevPreview ? async () => true : updatePlayer

  // ล็อกอินแล้วและตั้งชื่อแล้ว หรืออยู่ใน dev preview → เข้าลอบบี้
  if (
    (status === 'signed-in' && player && player.name.length > 0) ||
    (isDevPreview && activePlayer)
  ) {
    return (
      <GameViewport>
        <UpdateBanner />
        <ToastProvider>
          <LobbyPage
            player={activePlayer!}
            onPlayerChange={handlePlayerChange}
            onUpgrade={spendProgressionUpgrade}
            onEarnGold={earnGold}
            onGrantItem={grantItem}
            onCommitProgression={commitLobbyBattleProgression}
            onRecordPending={upsertPendingLobbyReward}
            onClearPending={clearPendingLobbyReward}
            onGetPendingRewards={getPendingLobbyRewards}
            onPullGacha={pullGacha}
            onLogout={logout}
            onTopUpGold={topUpGold}
            onTopUpGems={topUpGems}
            onRedeemCoupon={redeemCoupon}
            onFindFriend={findFriendByUid}
            isAdmin={isAdmin}
            onGiveCharacter={grantCharacter}
            onGiveGoldAdmin={grantGoldAdmin}
            onGiveItemAdmin={grantItemAdmin}
            hasGoogleLinked={hasGoogleLinked}
            onLinkGoogleAccount={linkGoogleAccount}
            isGuest={isGuest}
          />
        </ToastProvider>
      </GameViewport>
    )
  }

  const needsName = status === 'signed-in' && player !== null && player.name.length === 0

  return (
    <GameViewport>
      <UpdateBanner />
      <ToastProvider>
        {/* หน้าเริ่มเกมเป็นฉากหลังตลอดช่วงก่อนเข้าลอบบี้ */}
        <TitlePage onStart={() => setAuthOpen(true)} />

        {status === 'guest' && authOpen ? (
          <AuthModal
            onRegister={register}
            onLogin={login}
            onLoginWithGoogle={loginWithGoogle}
            onLoginAsGuest={loginAsGuest}
          />
        ) : null}

        {needsName && player ? (
          <NameModal
            onConfirm={(characterName) => updatePlayer({ ...player, name: characterName })}
          />
        ) : null}
      </ToastProvider>
    </GameViewport>
  )
}

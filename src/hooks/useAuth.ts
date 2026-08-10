import { useCallback, useEffect, useState } from 'react'
import * as accounts from '../data/accountRepository.supabase'
import type {
  CharacterGrantResult,
  CurrencyResult,
  FriendCandidate,
  GoldSource,
  ItemResult,
  ItemSource,
  GachaPullResult,
} from '../data/accountRepository.supabase'
import { reportError } from '../lib/errors/reportError'
import type { Player } from '../types/player'

/**
 * สถานะบัญชีผู้เล่นของทั้งเกม
 *
 * ทุกหน้าจอคุยกับ hook นี้เท่านั้น ไม่เรียก localStorage ตรง ๆ
 * เปลี่ยนไปใช้ฐานข้อมูลจริงเมื่อไหร่ ให้แก้ import ด้านบนบรรทัดเดียว
 * (ดู src/data/accountRepository.ts)
 */

export type AuthStatus = 'loading' | 'guest' | 'signed-in'

export interface AuthState {
  status: AuthStatus
  player: Player | null
  register: (email: string, password: string, captchaToken?: string) => Promise<string | null>
  login: (email: string, password: string, captchaToken?: string) => Promise<string | null>
  /**
   * เริ่ม OAuth flow กับ Google — เปลี่ยนหน้าออกไปทันทีเมื่อสำเร็จ (ไม่มีทาง resolve กลับมา
   * ที่นี่ในเคสนั้น) คืนข้อความเฉพาะตอนยิง redirect เองไม่สำเร็จ (เช่น provider ปิดอยู่)
   */
  loginWithGoogle: () => Promise<string | null>
  /**
   * เข้าเล่นทันทีแบบ guest (signInAnonymously) ไม่ต้องกรอกอะไรเลย — status จะกลายเป็น
   * 'signed-in' เหมือนบัญชีปกติทุกประการ (ไม่ใช่ AuthStatus 'guest' ที่แปลว่า "ยังไม่ล็อกอิน"
   * — ดู `isGuest` ด้านล่างสำหรับแยกแยะว่าบัญชีที่ signed-in อยู่นี้เป็น guest หรือไม่)
   */
  loginAsGuest: (captchaToken?: string) => Promise<string | null>
  logout: () => Promise<void>
  /** เชื่อมบัญชีนี้ (ไม่ว่าล็อกอินด้วย email หรือ Google) เข้ากับ Google — ต้อง signed-in อยู่แล้ว */
  hasGoogleLinked: boolean
  /** บัญชีที่ signed-in อยู่นี้เป็น guest (ยังไม่เคยอัพเกรด) ไหม — คนละความหมายกับ AuthStatus 'guest' */
  isGuest: boolean
  /** เริ่มเชื่อมบัญชี Google — เปลี่ยนหน้าออกไปทันทีเมื่อสำเร็จ เหมือน loginWithGoogle */
  linkGoogleAccount: () => Promise<string | null>
  /** บันทึกความคืบหน้า เช่น ตั้งชื่อตัวละคร จัดทีม อัปเกรด */
  /** คืน true เมื่อบันทึกลงที่เก็บข้อมูลจริง — false แปลว่าหน้าจอถูกย้อนกลับแล้ว */
  updatePlayer: (next: Player) => Promise<boolean>
  /** ให้ทองจากการเล่นเท่านั้น — ทำเควสสำเร็จหรือของดรอป (ดู accountRepository.earnGold) */
  earnGold: (source: GoldSource, amount: number, refId?: string) => Promise<CurrencyResult>
  /** เติมทองด้วยเงินจริง (ดู accountRepository.topUpGold) */
  topUpGold: (packageId: string) => Promise<CurrencyResult>
  /** เติมหยกด้วยเงินจริง (ดู accountRepository.topUpGems) */
  topUpGems: (packageId: string) => Promise<CurrencyResult>
  /** แลกโค้ดคูปองเป็นหยก (ดู accountRepository.redeemCoupon) */
  redeemCoupon: (code: string) => Promise<CurrencyResult>
  /** ค้นหาผู้เล่นจาก UID เพื่อเพิ่มเพื่อน — คืน null ถ้าไม่พบ (ดู accountRepository.findPlayerByUid) */
  findFriendByUid: (uid: string) => Promise<FriendCandidate | null>
  /**
   * บัญชีนี้ใช้คำสั่งผู้ดูแลได้ไหม — มาจากตาราง admin_accounts ฝั่ง Supabase
   * (ดู supabase/migrations/0004_admin_accounts.sql) ไม่มีทาง insert/update ให้ authenticated
   * role เลย ตั้งค่าได้ทาง Supabase dashboard เท่านั้น — เป็นขอบเขตความปลอดภัยจริงแล้ว
   * (ต่างจาก static list เดิมใน src/data/admins.ts ที่เป็นแค่ client-side convenience)
   */
  isAdmin: boolean
  /** มอบตัวละครให้บัญชีนี้ — ตอนนี้เรียกจากช่องคำสั่งผู้ดูแลเท่านั้น */
  grantCharacter: (characterId: string) => Promise<CharacterGrantResult>
  /** เสกทองให้บัญชีนี้ (ผู้ดูแลเท่านั้น) — ดู accountRepository.grantGoldAdmin */
  grantGoldAdmin: (amount: number) => Promise<CurrencyResult>
  /** เสกไอเทมให้บัญชีนี้ (ผู้ดูแลเท่านั้น) — ดู accountRepository.grantItemAdmin */
  grantItemAdmin: (itemId: string, quantity: number) => Promise<ItemResult>
  /** ให้ไอเทมจากการเล่น (ดรอป/เควส) — ดู accountRepository.grantItem */
  grantItem: (
    itemId: string,
    quantity: number,
    source: ItemSource,
    refId?: string,
  ) => Promise<ItemResult>
  /** บันทึก progression ล็อบบี้แบบ atomic (profile flags + hero EXP + battle history) */
  commitLobbyBattleProgression: (
    payload: accounts.LobbyBattleProgressionRpcPayload,
  ) => Promise<{ ok: true; player: Player } | { ok: false; error: string }>
  upsertPendingLobbyReward: (
    result: import('../game/realtimeBattle/types').RealtimeBattleResult,
    transactionId: string,
  ) => Promise<boolean>
  /** คืน false เมื่อลบแถวรางวัลค้างไม่สำเร็จ — ผู้เรียกต้องไม่ทิ้งค่านี้ (ดู accountRepository) */
  clearPendingLobbyReward: (transactionId: string) => Promise<boolean>
  getPendingLobbyRewards: () => Promise<accounts.PendingLobbyRewardRow[]>
  /** อัญเชิญผ่าน atomic Supabase RPC — Client ไม่มีสิทธิ์ตัด Gem/RNG/เพิ่ม Hero เอง */
  pullGacha: (bannerId: string, pullCount: 1 | 10, requestId: string) => Promise<GachaPullResult>
}

export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [player, setPlayer] = useState<Player | null>(null)
  // อีเมล/isAdmin ไม่ได้อยู่ใน Player (เป็นข้อมูลบัญชี ไม่ใช่ของตัวละคร) จึงเก็บแยก
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasGoogleLinked, setHasGoogleLinked] = useState(false)
  const [isGuest, setIsGuest] = useState(false)

  const refreshLinkedProviders = useCallback(async () => {
    const providers = await accounts.getLinkedProviders()
    setHasGoogleLinked(providers.includes('google'))
  }, [])

  /*
    กู้ session ตอนเปิดเกม เพื่อไม่ต้องล็อกอินซ้ำทุกครั้ง

    .catch() ตรงนี้ห้ามหาย: 'loading' เป็นสถานะที่ไม่มี UI ไหนรับเลย (App.tsx เช็ค 'signed-in'
    กับ 'guest' เท่านั้น) ถ้า promise นี้ reject แล้วไม่มีใครจับ status จะค้างที่ 'loading'
    ตลอดไป ผู้เล่นเห็นหน้าไตเติลปกติทุกอย่าง กดปุ่มเริ่มเกมแล้วไม่มีอะไรเกิดขึ้น ไม่มีข้อความ
    ไม่มีปุ่มลองใหม่ — เน็ตกระตุกครั้งเดียวตอนบูตเท่ากับเข้าเกมไม่ได้จนกว่าจะรีเฟรชเอง

    ตกลงไปที่ 'guest' (= ยังไม่ล็อกอิน) เพราะเป็นสถานะที่ "ลองใหม่ได้" — ผู้เล่นกดเริ่มเกมแล้ว
    เจอกล่องล็อกอินตามปกติ ส่วนรหัส error ขึ้นผ่าน GlobalErrorBanner ให้รู้ว่าไม่ใช่การถูกเด้งออก
  */
  useEffect(() => {
    let cancelled = false

    accounts
      .getSessionPlayer()
      .then((restored) => {
        if (cancelled) return
        setPlayer(restored)
        setIsAdmin(restored ? accounts.getSessionIsAdmin() : false)
        setIsGuest(restored ? accounts.getSessionIsGuest() : false)
        setStatus(restored ? 'signed-in' : 'guest')
        if (restored) void refreshLinkedProviders()
        return undefined
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        reportError('AUTH_SESSION_RESTORE_FAIL', 'visible', cause)
        setStatus('guest')
      })

    return () => {
      cancelled = true
    }
  }, [refreshLinkedProviders])

  /** คืน null เมื่อสำเร็จ คืนข้อความเมื่อผิดพลาด */
  const register = useCallback(
    async (nextEmail: string, password: string, captchaToken?: string) => {
      const result = await accounts.register(nextEmail, password, captchaToken)
      if (!result.ok) return result.error
      setPlayer(result.player)
      setIsAdmin(accounts.getSessionIsAdmin())
      setIsGuest(false)
      setStatus('signed-in')
      void refreshLinkedProviders()
      return null
    },
    [refreshLinkedProviders],
  )

  const login = useCallback(
    async (nextEmail: string, password: string, captchaToken?: string) => {
      const result = await accounts.login(nextEmail, password, captchaToken)
      if (!result.ok) return result.error
      setPlayer(result.player)
      setIsAdmin(accounts.getSessionIsAdmin())
      setIsGuest(false)
      setStatus('signed-in')
      void refreshLinkedProviders()
      return null
    },
    [refreshLinkedProviders],
  )

  const loginAsGuest = useCallback(
    async (captchaToken?: string) => {
      const result = await accounts.signInAsGuest(captchaToken)
      if (!result.ok) return result.error
      setPlayer(result.player)
      setIsAdmin(false)
      setIsGuest(true)
      setStatus('signed-in')
      void refreshLinkedProviders()
      return null
    },
    [refreshLinkedProviders],
  )

  const loginWithGoogle = useCallback(async () => {
    const result = await accounts.signInWithGoogle()
    if (result.ok) return null
    reportError('AUTH_OAUTH_FAIL', 'silent')
    return result.error ?? 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'
  }, [])

  const linkGoogleAccount = useCallback(async () => {
    const result = await accounts.linkGoogleIdentity()
    if (result.ok) return null
    reportError('AUTH_OAUTH_FAIL', 'silent')
    return result.error ?? 'เชื่อมบัญชี Google ไม่สำเร็จ'
  }, [])

  const logout = useCallback(async () => {
    await accounts.logout()
    setPlayer(null)
    setIsAdmin(false)
    setHasGoogleLinked(false)
    setIsGuest(false)
    setStatus('guest')
  }, [])

  /*
    เขียนความคืบหน้าผู้เล่นลงที่เก็บข้อมูล — คืน true เมื่อบันทึกลงจริง

    เดิมทิ้งค่าที่ savePlayer คืนมาโดยไม่ดู ทั้งที่ทุกฟังก์ชันพี่น้องใน accountRepository
    (register/login/earnGold/...) เช็คค่าเดียวกันนี้แล้วขึ้นข้อความบอกผู้ใช้
    และนี่คือเส้นทางเขียนของความคืบหน้าทั้งเกม — ทีม อัปเกรด เงิน ผลต่อสู้ เพื่อน
    ผลคือพื้นที่เก็บข้อมูลเต็มแล้วหน้าจอยังโชว์เหมือนเซฟติด ผู้เล่นเล่นต่อจนปิดแท็บ
    แล้วของหายทั้งหมดโดยไม่เคยมีสัญญาณอะไรเลย

    ที่นี่ประกาศผลด้วยการ "ย้อนหน้าจอกลับ" ไม่ใช่ toast เพราะ useAuth ถูกเรียกเหนือ
    ToastProvider ใน App.tsx จึงเรียก useToast ไม่ได้ และการโชว์ค่าเดิมที่เป็นความจริง
    ดีกว่าโชว์ค่าใหม่ที่ไม่ได้ถูกบันทึก

    คืน boolean ให้ผู้เรียกตัดสินใจต่อได้ — ปุ่มเพิ่มเพื่อนเป็นรายแรกที่ต้องใช้จริง
    (ก่อนหน้านี้ตัดค่าคืนทิ้งเพราะยังไม่มีใครใช้ แล้วผู้ใช้ก็โผล่มาจริงในวันเดียวกัน)

    ── การย้อนกลับตอนล้ม: ทำไมไม่ setPlayer(previous) ตรง ๆ อีกแล้ว ──────────────
    savePlayer เขียนหลายตารางเรียงกัน (profiles → owned_characters → friends → team_slots)
    แต่ละขั้นคอมมิตของตัวเองทันที ไม่มี transaction ครอบ การล้มที่ขั้นหลังจึงแปลว่า "บางส่วน
    ลงจริงไปแล้ว" การย้อนหน้าจอกลับไปเป็นค่าก่อนหน้าทั้งก้อนจึงแสดงของที่บันทึกสำเร็จว่ายังไม่
    บันทึก แล้วการเซฟครั้งถัดไปก็เอาค่าเก่านั้นเขียนทับของใหม่ที่ลงไปแล้วอีกที

    อ่านค่าจริงจากเซิร์ฟเวอร์กลับมาแทน (getSessionPlayer อ่านครบทุกตารางอยู่แล้ว) — หน้าจอจึง
    ตรงกับฐานข้อมูลเสมอไม่ว่าล้มที่ขั้นไหน อ่านไม่ได้ค่อยตกกลับไปใช้ค่าก่อนหน้าแบบเดิม

    และย้อนแบบมีเงื่อนไข (setPlayer(current => ...)) ไม่ใช่เขียนทับดื้อ ๆ: `previous` มาจาก
    closure ของ render นั้น ถ้ามีการเซฟอีกครั้งที่สำเร็จแทรกเข้ามาระหว่างรอ การย้อนแบบเดิมจะ
    ลบผลของการเซฟที่สำเร็จนั้นทิ้ง ตัวเทียบ `current === next` ทำหน้าที่เป็น generation token:
    ย้อนได้ต่อเมื่อบนจอยังเป็นค่าที่เรา set ไปเองเท่านั้น
  */
  const updatePlayer = useCallback(
    async (next: Player): Promise<boolean> => {
      const previous = player
      // อัปเดตหน้าจอทันที แล้วค่อยเขียนลงฐานข้อมูล
      setPlayer(next)

      if (await accounts.savePlayer(next)) return true

      reportError('PLAYER_SAVE_FAIL', 'visible')

      let authoritative: Player | null = null
      try {
        authoritative = await accounts.getSessionPlayer()
      } catch (cause: unknown) {
        reportError('PLAYER_LOAD_FAIL', 'silent', cause)
      }

      setPlayer((current) => (current === next ? (authoritative ?? previous) : current))
      return false
    },
    [player],
  )

  // สี่ฟังก์ชันด้านล่างคุยกับ accountRepository ที่บังคับระบุแหล่งที่มาของทอง/หยกเสมอ
  // (ดูคอมเมนต์หัวไฟล์ accountRepository.ts) จึงไม่มี setGold/setGem ตรง ๆ ให้เรียกจากที่อื่น

  const earnGold = useCallback(
    async (source: GoldSource, amount: number, refId?: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.earnGold(player.uid, source, amount, refId)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const topUpGold = useCallback(
    async (packageId: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.topUpGold(player.uid, packageId)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const topUpGems = useCallback(
    async (packageId: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.topUpGems(player.uid, packageId)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const redeemCoupon = useCallback(
    async (code: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.redeemCoupon(player.uid, code)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  /** ค้นหาไม่ต้องล็อกอินก็เรียกได้จริง แต่ล็อกไว้เผื่อผู้เล่นเรียกจากหน้าที่ต้องล็อกอินก่อนเสมออยู่แล้ว */
  const findFriendByUid = useCallback(async (uid: string) => accounts.findPlayerByUid(uid), [])

  const grantCharacter = useCallback(
    async (characterId: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.grantCharacter(player.uid, characterId)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const grantGoldAdmin = useCallback(
    async (amount: number) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.grantGoldAdmin(amount)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const grantItemAdmin = useCallback(
    async (itemId: string, quantity: number) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.grantItemAdmin(itemId, quantity)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const grantItem = useCallback(
    async (itemId: string, quantity: number, source: ItemSource, refId?: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.grantItem(player.uid, itemId, quantity, source, refId)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const commitLobbyBattleProgression = useCallback(
    async (payload: accounts.LobbyBattleProgressionRpcPayload) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.commitLobbyBattleProgression(payload)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  const upsertPendingLobbyReward = useCallback(
    async (
      result: import('../game/realtimeBattle/types').RealtimeBattleResult,
      transactionId: string,
    ) => accounts.upsertPendingLobbyReward(result, transactionId),
    [],
  )

  const clearPendingLobbyReward = useCallback(
    async (transactionId: string) => accounts.clearPendingLobbyReward(transactionId),
    [],
  )

  const getPendingLobbyRewards = useCallback(async () => accounts.getPendingLobbyRewards(), [])

  const pullGacha = useCallback(
    async (bannerId: string, pullCount: 1 | 10, requestId: string) => {
      if (!player) return { ok: false, error: 'ยังไม่ได้ล็อกอิน' } as const
      const result = await accounts.pullGacha(bannerId, pullCount, requestId)
      if (result.ok) setPlayer(result.player)
      return result
    },
    [player],
  )

  return {
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
  }
}

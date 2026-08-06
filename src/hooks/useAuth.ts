import { useCallback, useEffect, useState } from 'react'
import * as accounts from '../data/accountRepository'
import type {
  CharacterGrantResult,
  CurrencyResult,
  FriendCandidate,
  GoldSource,
} from '../data/accountRepository'
import { isAdminEmail } from '../data/admins'
import { reportError } from '../lib/errors/reportError'
import { downloadSaveJson } from '../lib/saveFile'
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
  register: (email: string, password: string) => Promise<string | null>
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  /** บันทึกความคืบหน้า เช่น ตั้งชื่อตัวละคร จัดทีม อัปเกรด */
  updatePlayer: (next: Player) => Promise<void>
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
   * บัญชีนี้ใช้คำสั่งผู้ดูแลได้ไหม (ดู src/data/admins.ts)
   * ⚠️ ไม่ใช่ขอบเขตความปลอดภัย — เช็คฝั่ง client กับข้อมูลที่ผู้เล่นแก้เองได้
   */
  isAdmin: boolean
  /** มอบตัวละครให้บัญชีนี้ — ตอนนี้เรียกจากช่องคำสั่งผู้ดูแลเท่านั้น */
  grantCharacter: (characterId: string) => Promise<CharacterGrantResult>
  /** ส่งออก save เป็นไฟล์ JSON ไว้สำรอง/ย้ายเครื่อง — คืน null เมื่อสำเร็จ (ไฟล์ถูกดาวน์โหลดแล้ว) */
  exportSave: () => Promise<string | null>
  /** นำเข้าไฟล์ save ที่ export ไว้ — คืน null เมื่อสำเร็จ คืนข้อความเมื่อผิดพลาด */
  importSave: (json: string) => Promise<string | null>
}

export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [player, setPlayer] = useState<Player | null>(null)
  // อีเมลไม่ได้อยู่ใน Player (เป็นข้อมูลบัญชี ไม่ใช่ของตัวละคร) จึงเก็บแยกไว้ตรวจสิทธิ์ผู้ดูแล
  const [email, setEmail] = useState<string | null>(null)

  // กู้ session ตอนเปิดเกม เพื่อไม่ต้องล็อกอินซ้ำทุกครั้ง
  useEffect(() => {
    let cancelled = false

    accounts.getSessionPlayer().then((restored) => {
      if (cancelled) return
      setPlayer(restored)
      setEmail(restored ? accounts.getSessionEmail() : null)
      setStatus(restored ? 'signed-in' : 'guest')
      return undefined
    })

    return () => {
      cancelled = true
    }
  }, [])

  /** คืน null เมื่อสำเร็จ คืนข้อความเมื่อผิดพลาด */
  const register = useCallback(async (nextEmail: string, password: string) => {
    const result = await accounts.register(nextEmail, password)
    if (!result.ok) return result.error
    setPlayer(result.player)
    setEmail(accounts.getSessionEmail())
    setStatus('signed-in')
    return null
  }, [])

  const login = useCallback(async (nextEmail: string, password: string) => {
    const result = await accounts.login(nextEmail, password)
    if (!result.ok) return result.error
    setPlayer(result.player)
    setEmail(accounts.getSessionEmail())
    setStatus('signed-in')
    return null
  }, [])

  const logout = useCallback(async () => {
    await accounts.logout()
    setPlayer(null)
    setEmail(null)
    setStatus('guest')
  }, [])

  /*
    เขียนความคืบหน้าผู้เล่นลงที่เก็บข้อมูล — คืน true เมื่อบันทึกลงจริง

    เดิมทิ้งค่าที่ savePlayer คืนมาโดยไม่ดู ทั้งที่ทุกฟังก์ชันพี่น้องใน accountRepository
    (register/login/importSave/earnGold/...) เช็คค่าเดียวกันนี้แล้วขึ้นข้อความบอกผู้ใช้
    และนี่คือเส้นทางเขียนของความคืบหน้าทั้งเกม — ทีม อัปเกรด เงิน ผลต่อสู้ เพื่อน
    ผลคือพื้นที่เก็บข้อมูลเต็มแล้วหน้าจอยังโชว์เหมือนเซฟติด ผู้เล่นเล่นต่อจนปิดแท็บ
    แล้วของหายทั้งหมดโดยไม่เคยมีสัญญาณอะไรเลย

    ที่นี่ประกาศผลด้วยการ "ย้อนหน้าจอกลับ" ไม่ใช่ toast เพราะ useAuth ถูกเรียกเหนือ
    ToastProvider ใน App.tsx จึงเรียก useToast ไม่ได้ และการโชว์ค่าเดิมที่เป็นความจริง
    ดีกว่าโชว์ค่าใหม่ที่ไม่ได้ถูกบันทึก

    ไม่คืนค่า boolean ออกไปทั้งที่รู้ผล เพราะยังไม่มีผู้เรียกรายไหนต้องใช้ — การเปลี่ยน
    ชนิดที่คืนต้องไล่แก้ prop ของผู้เรียกอีกสี่ไฟล์เพื่อค่าที่ไม่มีใครอ่าน ถ้าวันหลังมีที่ที่
    อยากบอกผู้เล่นละเอียดกว่านี้ ค่อยเปิดค่าคืนตอนนั้น
  */
  const updatePlayer = useCallback(
    async (next: Player) => {
      const previous = player
      // อัปเดตหน้าจอทันที แล้วค่อยเขียนลงฐานข้อมูล
      setPlayer(next)

      if (!(await accounts.savePlayer(next))) {
        reportError('PLAYER_SAVE_FAIL', 'visible')
        setPlayer(previous)
      }
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

  const exportSave = useCallback(async () => {
    const result = await accounts.exportSave()
    if (!result.ok) return result.error

    // ดาวน์โหลดเป็นไฟล์ .json — ไม่มี backend ให้ส่งไปเก็บ ผู้เล่นต้องเก็บไฟล์เอง
    downloadSaveJson(result.json)
    return null
  }, [])

  const importSave = useCallback(async (json: string) => {
    const result = await accounts.importSave(json)
    if (!result.ok) return result.error
    setPlayer(result.player)
    setEmail(accounts.getSessionEmail())
    setStatus('signed-in')
    return null
  }, [])

  return {
    status,
    player,
    register,
    login,
    logout,
    updatePlayer,
    earnGold,
    topUpGold,
    topUpGems,
    redeemCoupon,
    findFriendByUid,
    isAdmin: isAdminEmail(email),
    grantCharacter,
    exportSave,
    importSave,
  }
}

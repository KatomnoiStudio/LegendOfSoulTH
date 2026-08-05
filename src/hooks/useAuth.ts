import { useCallback, useEffect, useState } from 'react'
import * as accounts from '../data/accountRepository'
import type { CurrencyResult, GoldSource } from '../data/accountRepository'
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
  /** เติมหยกด้วยเงินจริง (ดู accountRepository.topUpGems) */
  topUpGems: (packageId: string) => Promise<CurrencyResult>
  /** แลกโค้ดคูปองเป็นหยก (ดู accountRepository.redeemCoupon) */
  redeemCoupon: (code: string) => Promise<CurrencyResult>
}

export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [player, setPlayer] = useState<Player | null>(null)

  // กู้ session ตอนเปิดเกม เพื่อไม่ต้องล็อกอินซ้ำทุกครั้ง
  useEffect(() => {
    let cancelled = false

    accounts.getSessionPlayer().then((restored) => {
      if (cancelled) return
      setPlayer(restored)
      setStatus(restored ? 'signed-in' : 'guest')
    })

    return () => {
      cancelled = true
    }
  }, [])

  /** คืน null เมื่อสำเร็จ คืนข้อความเมื่อผิดพลาด */
  const register = useCallback(async (email: string, password: string) => {
    const result = await accounts.register(email, password)
    if (!result.ok) return result.error
    setPlayer(result.player)
    setStatus('signed-in')
    return null
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await accounts.login(email, password)
    if (!result.ok) return result.error
    setPlayer(result.player)
    setStatus('signed-in')
    return null
  }, [])

  const logout = useCallback(async () => {
    await accounts.logout()
    setPlayer(null)
    setStatus('guest')
  }, [])

  const updatePlayer = useCallback(async (next: Player) => {
    // อัปเดตหน้าจอทันที แล้วค่อยเขียนลงฐานข้อมูล
    setPlayer(next)
    await accounts.savePlayer(next)
  }, [])

  // สามฟังก์ชันด้านล่างคุยกับ accountRepository ที่บังคับระบุแหล่งที่มาของทอง/หยกเสมอ
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

  return { status, player, register, login, logout, updatePlayer, earnGold, topUpGems, redeemCoupon }
}

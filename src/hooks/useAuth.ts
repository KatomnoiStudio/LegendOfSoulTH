import { useCallback, useEffect, useState } from 'react'
import * as accounts from '../data/accountRepository'
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

  return { status, player, register, login, logout, updatePlayer }
}

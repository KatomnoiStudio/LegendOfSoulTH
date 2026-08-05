import { MOCK_BADGES, MOCK_PLAYER } from '../data/mockPlayer'
import type { PlayerState } from '../types/player'

/**
 * แหล่งข้อมูลผู้เล่นเพียงจุดเดียวของหน้า Lobby
 *
 * ตอนนี้คืนค่า mock แบบ synchronous แต่ signature เป็น PlayerState
 * (มี isLoading อยู่แล้ว) เพื่อให้เปลี่ยนไปใช้ข้อมูลจริงได้โดยไม่กระทบ UI
 * เช่น:
 *
 *   const { data, isPending } = useQuery({ queryKey: ['player'], queryFn: fetchPlayer })
 *   return { player: data ?? MOCK_PLAYER, badges: ..., isLoading: isPending }
 *
 * @param characterName ชื่อที่ผู้เล่นตั้งไว้ในหน้าเริ่มเกม (ถ้ามี จะทับชื่อใน mock)
 * @param uid รหัสผู้เล่น 10 หลักที่ออกให้ตอนสร้างตัวละคร (ถ้ามี จะทับ uid ใน mock)
 */
export function usePlayer(characterName?: string, uid?: string): PlayerState {
  return {
    player: {
      ...MOCK_PLAYER,
      ...(characterName ? { name: characterName } : {}),
      ...(uid ? { uid } : {}),
    },
    badges: MOCK_BADGES,
    isLoading: false,
  }
}

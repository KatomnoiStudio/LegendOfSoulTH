import { generateUid } from '../game/uid'
import type { Player, PlayerBadges } from '../types/player'

/**
 * Mock data ชั่วคราว — จุดเดียวที่ต้องลบเมื่อต่อ API จริง
 * (ดู src/hooks/usePlayer.ts สำหรับจุดสลับ)
 */
export const MOCK_PLAYER: Player = {
  id: 'local-captain',
  // สุ่มไว้เป็นค่าตั้งต้น — ของจริงจะถูกออกใหม่ตอนสร้างตัวละคร (ดู App.tsx)
  uid: generateUid(),
  name: 'กัปตันเรย์',
  title: 'ผู้พิทักษ์ลานประลอง',
  level: 12,
  exp: 6420,
  expToNext: 9000,
  currency: {
    gold: 12450,
    gem: 320,
  },
  ownedCharacters: [
    { characterId: 'monkey-king', level: 40, exp: 7320, expToNext: 12000, obtainedAt: '2026-08-01T00:00:00.000Z' },
    { characterId: 'pig-warrior', level: 38, exp: 5140, expToNext: 11000, obtainedAt: '2026-08-02T00:00:00.000Z' },
    { characterId: 'pilgrim-monk', level: 36, exp: 8960, expToNext: 10500, obtainedAt: '2026-08-03T00:00:00.000Z' },
  ],
  // บัญชีนี้ครอบครอง 3 ตัว จึงเหลือช่องสุดท้ายว่างไว้
  // (บัญชีที่เพิ่งสมัครจะมีตัวเดียว เช่น ['monkey-king', null, null, null])
  teamSlots: ['monkey-king', 'pig-warrior', 'pilgrim-monk', null],
  frameId: 'arcane',
}

export const MOCK_BADGES: PlayerBadges = {
  mail: 3,
  mission: 2,
}

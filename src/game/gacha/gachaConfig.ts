import type { Rarity } from '../characters'

export interface GachaPoolEntry {
  characterId: string
  rarity: Rarity
  /** น้ำหนักสุ่มภายในกลุ่ม Rarity เดียวกัน (ค่าเริ่มต้น 1) */
  weight?: number
}

export interface GachaRateEntry {
  rarity: Rarity
  /** อัตราออก (สัดส่วนระหว่าง 0 ถึง 1.0 เช่น 0.05 = 5%) */
  rate: number
}

export interface BannerConfig {
  id: string
  name: string
  description: string
  currencyType: 'gem' | 'gold'
  costSingle: number
  costMulti: number
  /** จำนวนครั้งที่เปิดเพื่อการันตีตัวละครระดับสูงสุดของแบนเนอร์ */
  pityThreshold: number
  /** ระดับความหายากที่การันตีเมื่อถึง Hard Pity */
  pityGuaranteedRarity: Rarity
  rates: GachaRateEntry[]
  pool: GachaPoolEntry[]
}

/**
 * แบนเนอร์อัญเชิญมาตรฐาน (Standard Banner)
 * อัตราและตัวเลขออกแบบตาม Roadmap P9 และ Master Blueprint §4.3
 */
export const STANDARD_BANNER: BannerConfig = {
  id: 'standard-banner',
  name: 'อัญเชิญวีรชนศิลาวิญญาณ',
  description: 'รวบรวมเหล่าเทพและผู้กล้าแห่งตำนานเพื่อร่วมเดินทางสู่อภิมหาแดนประลอง',
  currencyType: 'gem',
  costSingle: 100,
  costMulti: 900,
  pityThreshold: 30,
  pityGuaranteedRarity: 'legendary',
  rates: [
    { rarity: 'legendary', rate: 0.05 },
    { rarity: 'epic', rate: 0.25 },
    { rarity: 'rare', rate: 0.7 },
  ],
  pool: [
    { characterId: 'monkey-king', rarity: 'legendary', weight: 1 },
    { characterId: 'pig-warrior', rarity: 'epic', weight: 1 },
    { characterId: 'celestial-archer', rarity: 'epic', weight: 1 },
    { characterId: 'nezha-warden', rarity: 'rare', weight: 1 },
    { characterId: 'sand-sage', rarity: 'rare', weight: 1 },
  ],
}

export const BANNERS: Record<string, BannerConfig> = {
  [STANDARD_BANNER.id]: STANDARD_BANNER,
}

/**
 * ตรวจสอบความถูกต้องของ Banner Config
 * ตรวจสอบว่าผลรวมของเรตทุกระดับรวมกันได้ 100% (1.00) พอดี
 */
export function validateBannerConfig(banner: BannerConfig): { valid: boolean; error?: string } {
  if (!banner.id || !banner.name) {
    return { valid: false, error: 'แบนเนอร์ต้องมี id และ name' }
  }

  if (banner.costSingle <= 0 || banner.costMulti <= 0) {
    return { valid: false, error: 'ราคาเปิดกาชาต้องมากกว่า 0' }
  }

  if (banner.pityThreshold <= 0) {
    return { valid: false, error: 'เพดานการันตี (pityThreshold) ต้องมากกว่า 0' }
  }

  const totalRate = banner.rates.reduce((sum, entry) => sum + entry.rate, 0)
  // อนุญาตความคลาดเคลื่อนทางคณิตศาสตร์ floating point ไม่เกิน 0.0001
  if (Math.abs(totalRate - 1.0) > 0.0001) {
    return {
      valid: false,
      error: `ผลรวมอัตราการออกสุ่มต้องเท่ากับ 1.0 (100%) พอดี แต่ได้ ${totalRate}`,
    }
  }

  if (banner.pool.length === 0) {
    return { valid: false, error: 'รายการตัวละครในตู้สุ่มต้องไม่ว่างเปล่า' }
  }

  return { valid: true }
}

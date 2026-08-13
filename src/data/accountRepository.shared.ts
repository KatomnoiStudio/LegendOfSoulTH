import type { Player, FriendCandidate } from '../types/player'

/**
 * ชนิด/ค่าคงที่/ตัวตรวจสอบที่ใช้ร่วมกันระหว่างทุก backend ของบัญชีผู้เล่น
 *
 * แยกจาก accountRepository.ts (backend localStorage เดิม ตอนนี้ dormant — useAuth.ts
 * ไม่ import แล้ว) เพราะของในไฟล์นี้ยังใช้งานจริงทั้งฝั่ง accountRepository.supabase.ts
 * (backend จริงที่ useAuth.ts ใช้) และหน้าจอต่าง ๆ ที่ import type ตรง ๆ
 * (AuthModal, TopBar, LobbyPage, ฯลฯ) ส่วน login/register/session ที่ผูกกับ localStorage
 * โดยเฉพาะยังอยู่ใน accountRepository.ts เหมือนเดิม (ดูคอมเมนต์หัวไฟล์นั้น)
 */

/** ทองได้จากการเล่น (เควส/ดรอป) หรือเติมเงินจริงก็ได้ */
export type GoldSource = 'quest' | 'drop' | 'topup'
/** หยกได้จากการเติมเงินจริง หรือแลกคูปองเท่านั้น — ห้ามมีทางอื่น */
export type GemSource = 'topup' | 'coupon'

/**
 * แถวหนึ่งรายการได้/เสียทอง-หยก — getTransactions คืนเฉพาะช่วง "ร้อน" เท่านั้น
 * (currency_transactions บน Supabase; ดู accountRepository.supabase.ts) รายการเก่ากว่า 12
 * เดือนย้ายไป currency_transactions_archive อัตโนมัติทุกเดือน (ไม่เคยลบทิ้ง — ดู
 * .agents/rules/currency-ledger-retention.md) แต่ยังไม่ union เข้ามาที่ฟังก์ชันนี้ ตัวเลขรวม
 * ที่ตรงเสมอไม่ว่ารายการย่อยจะถูกย้ายไปกี่รอบคือ profiles.lifetime_gold_earned/
 * lifetime_gem_earned — ไม่ใช่การนับ length ของอาร์เรย์นี้ source 'coupon'/'topup' ไม่ถูกย้าย
 * ออกจากช่วงร้อนเด็ดขาดไม่ว่าจะเก่าแค่ไหน (redeem_coupon กันแลกซ้ำด้วยการสแกนตารางนี้ตรง ๆ)
 */
export interface CurrencyTransaction {
  id: string
  currency: 'gold' | 'gem'
  source: GoldSource | GemSource
  amount: number
  createdAt: string
  /** อ้างอิงที่มา เช่น questId, dropId, รหัสคูปอง, หรือ id แพ็กเกจเติมหยก */
  refId?: string
}

export interface GemPackage {
  id: string
  amount: number
  /** ราคาที่แสดงผล — ยังไม่ผูกกับ payment gateway จริง */
  priceLabel: string
}

export const GEM_PACKAGES: GemPackage[] = [
  { id: 'gem-small', amount: 60, priceLabel: '฿30' },
  { id: 'gem-medium', amount: 320, priceLabel: '฿150' },
  { id: 'gem-large', amount: 980, priceLabel: '฿450' },
]

export interface GoldPackage {
  id: string
  amount: number
  /** ราคาที่แสดงผล — ยังไม่ผูกกับ payment gateway จริง */
  priceLabel: string
}

/** ราคาต่อหน่วยถูกกว่าเติมหยก — ทองเป็นสกุลเงินพื้นฐานที่ควรหาได้ง่ายกว่า */
export const GOLD_PACKAGES: GoldPackage[] = [
  { id: 'gold-small', amount: 1000, priceLabel: '฿30' },
  { id: 'gold-medium', amount: 5500, priceLabel: '฿150' },
  { id: 'gold-large', amount: 18000, priceLabel: '฿450' },
]

export type AuthResult = { ok: true; player: Player } | { ok: false; error: string }

export type CurrencyResult =
  { ok: true; player: Player; amount: number } | { ok: false; error: string }

/** ไอเทมได้จากการเล่นเท่านั้น — ทำเควสสำเร็จ หรือของดรอป (กติกาเดียวกับทอง) */
export type ItemSource = GoldSource

export type ItemResult = { ok: true; player: Player } | { ok: false; error: string }

export type CharacterGrantResult =
  { ok: true; player: Player; characterId: string } | { ok: false; error: string }

export type StarAscensionResult =
  | {
      ok: true
      newStar: number
      shardsRemaining: number
      shardsSpent: number
      replayed: boolean
    }
  | { ok: false; error: string }

export interface GachaPullItemResult {
  characterId: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  isPity: boolean
  isNew: boolean
  shardsGranted: number
}

export type GachaPullResult =
  | {
      ok: true
      player: Player
      results: GachaPullItemResult[]
      cost: number
      currencyUsed: 'gem' | 'gold'
      newPity: number
      replayed: boolean
    }
  | { ok: false; error: string }

/** ตรวจรูปแบบอีเมลแบบพอดี ๆ — ไม่เข้มจนบล็อกอีเมลที่ใช้ได้จริง */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const PASSWORD_MIN_LENGTH = 8

export function validateEmail(email: string): string | null {
  const value = email.trim()
  if (value.length === 0) return 'กรุณากรอกอีเมล'
  if (!EMAIL_PATTERN.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง'
  return null
}

// รหัสผ่านที่พบบ่อยที่สุดจนไม่ป้องกันอะไรเลย แม้ยาวพอตาม PASSWORD_MIN_LENGTH ก็ตาม
// (รายการเล็ก ๆ พอกันกรณีชัดเจนที่สุด ไม่ใช่ dictionary attack เต็มรูปแบบ — ไม่ต้องพึ่ง library ภายนอก)
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwertyui',
  'letmein1',
  'iloveyou',
  'admin123',
  'welcome1',
  '11111111',
  '00000000',
  'abc12345',
  'changeme',
])

export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'กรุณากรอกรหัสผ่าน'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'รหัสผ่านนี้ถูกใช้ทั่วไปมากเกินไป กรุณาตั้งรหัสอื่น'
  }
  return null
}

/**
 * อินเตอร์เฟสแสดงฟังก์ชันที่ต้องมีร่วมกันในทั้งสอง Repository
 * (localStorage vs Supabase) เพื่อความสม่ำเสมอของโครงสร้างข้อมูลและการเรียกใช้งาน
 * ไม่รวม importSave/exportSave เนื่องจากมีความเป็นเอกเทศของแต่ละระบบ
 */
export interface AccountRepositorySubset {
  // `captchaToken` is part of the contract, not an implementation detail of one backend. It was
  // missing here while the Supabase implementation took it and `useAuth` passed it, and the
  // conformance assertion below could not catch that: a function with an extra OPTIONAL
  // parameter is assignable to a signature without it. Nothing broke only because useAuth
  // imports the concrete module rather than this interface — route a caller through here, or
  // swap in the localStorage implementation, and signup would have lost its anti-abuse gate
  // with a green typecheck.
  register(email: string, password: string, captchaToken?: string): Promise<AuthResult>
  login(email: string, password: string): Promise<AuthResult>
  logout(): Promise<void>
  getSessionPlayer(): Promise<Player | null>
  getSessionEmail(): string | null
  findPlayerByUid(uid: string): Promise<FriendCandidate | null>
  savePlayer(player: Player): Promise<boolean>
  earnGold(uid: string, source: GoldSource, amount: number, refId?: string): Promise<CurrencyResult>
  redeemCoupon(uid: string, code: string): Promise<CurrencyResult>
  topUpGold(uid: string, packageId: string): Promise<CurrencyResult>
  topUpGems(uid: string, packageId: string): Promise<CurrencyResult>
  getTransactions(uid: string): Promise<CurrencyTransaction[]>
  grantItem(
    uid: string,
    itemId: string,
    quantity: number,
    source: ItemSource,
    refId?: string,
  ): Promise<ItemResult>
  grantCharacter(uid: string, characterId: string): Promise<CharacterGrantResult>
}

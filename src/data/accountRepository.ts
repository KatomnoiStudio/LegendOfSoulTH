import { getItem } from '../game/items'
import { generateUid } from '../game/uid'
import { TEAM_SIZE } from '../game/team'
import { createSalt, hashPassword, verifyPassword } from '../lib/password'
import { isStorageAvailable, readJson, removeKey, writeJson } from '../lib/storage'
import type { Player } from '../types/player'

/**
 * ฐานข้อมูลผู้เล่น (เวอร์ชันเก็บใน localStorage)
 *
 * ─── จุดสลับไปใช้ฐานข้อมูลจริง ────────────────────────────
 * ทุกฟังก์ชันที่ export เป็น async อยู่แล้ว และหน้าจอเรียกผ่าน interface นี้
 * เท่านั้น เมื่อมีเซิร์ฟเวอร์จริงให้เขียนไฟล์ใหม่ที่ export ชื่อเดียวกัน
 * แล้วเปลี่ยน import ที่ src/hooks/useAuth.ts จุดเดียว หน้าจอไม่ต้องแก้เลย
 *
 * ตารางที่เทียบเท่าใน SQL:
 *   accounts(uid PK, email UNIQUE, password_hash, password_salt, created_at)
 *   players(uid PK/FK, name, title, level, exp, exp_to_next, gold, gem, frame_id)
 *   owned_characters(uid FK, character_id, level, exp, exp_to_next, obtained_at)
 *   team_slots(uid FK, slot_index, character_id NULL)
 *   inventory(uid FK, item_id, quantity, obtained_at, obtained_from)
 *     — ไอเทมเพิ่มได้ผ่าน grantItem (source 'quest'/'drop') เท่านั้น กติกาเดียวกับทอง
 *   currency_transactions(id PK, uid FK, currency enum('gold','gem'),
 *     source enum('quest','drop','topup','coupon'), amount, ref_id, created_at)
 *     — ชั้นแอปบังคับว่า gold มาจาก source 'quest'/'drop' เท่านั้น
 *       และ gem มาจาก 'topup'/'coupon' เท่านั้น (ดู earnGold/topUpGems/redeemCoupon
 *       ด้านล่าง — ไม่มีฟังก์ชันเซตทอง/หยกตรง ๆ ให้เรียกจากที่อื่นโดยไม่ระบุแหล่งที่มา)
 *
 * ─── ข้อจำกัดที่ต้องรู้ ────────────────────────────────────
 * ข้อมูลอยู่ในเบราว์เซอร์ของผู้เล่นเอง จึงแก้ได้ด้วย DevTools
 * ระบบนี้ใช้ "จำผู้เล่นบนเครื่องนี้" ได้ แต่ยังไม่ใช่การยืนยันตัวตนที่เชื่อถือได้
 * การ "จ่ายเงินจริง" ใน topUpGems ยังไม่ต่อ payment gateway — ถือว่าจ่ายสำเร็จเสมอ
 * (ใช้ทดสอบ/เดโมเท่านั้น ห้ามใช้ค้าจริงจนกว่าจะต่อระบบชำระเงินที่ตรวจสอบได้จริง)
 * ───────────────────────────────────────────────────────────
 */

const DB_KEY = 'los:db:v1'
const SESSION_KEY = 'los:session:v1'

/** ตัวละครที่ได้ฟรีตอนสมัครบัญชีใหม่ */
const STARTER_CHARACTER_ID = 'monkey-king'

/** ทองหาได้จากการเล่นเท่านั้น — ทำเควสสำเร็จ หรือของดรอประหว่างเล่น */
export type GoldSource = 'quest' | 'drop'
/** หยกได้จากการเติมเงินจริง หรือแลกคูปองเท่านั้น — ห้ามมีทางอื่น */
export type GemSource = 'topup' | 'coupon'

export interface CurrencyTransaction {
  id: string
  currency: 'gold' | 'gem'
  source: GoldSource | GemSource
  amount: number
  createdAt: string
  /** อ้างอิงที่มา เช่น questId, dropId, รหัสคูปอง, หรือ id แพ็กเกจเติมหยก */
  refId?: string
}

interface StoredAccount {
  uid: string
  email: string
  passwordHash: string
  passwordSalt: string
  createdAt: string
  player: Player
  /** ประวัติการได้ทอง/หยกทุกครั้ง — ใช้ตรวจสอบที่มาและกันแลกคูปองซ้ำ */
  transactions: CurrencyTransaction[]
}

interface Database {
  version: 1
  /** คีย์เป็นอีเมลตัวพิมพ์เล็ก — บังคับความไม่ซ้ำของอีเมลโดยตัวโครงสร้างเอง */
  accounts: Record<string, StoredAccount>
}

const EMPTY_DB: Database = { version: 1, accounts: {} }

function loadDb(): Database {
  const db = readJson<Database>(DB_KEY)
  if (!db || db.version !== 1 || typeof db.accounts !== 'object') return EMPTY_DB
  return db
}

function saveDb(db: Database): boolean {
  return writeJson(DB_KEY, db)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function findAccountEntry(db: Database, uid: string): [string, StoredAccount] | undefined {
  return Object.entries(db.accounts).find(([, account]) => account.uid === uid)
}

/**
 * เติมฟิลด์ที่เพิ่มเข้ามาทีหลังให้บัญชีเก่า
 *
 * ข้อมูลใน localStorage ถูกเขียนไว้ตั้งแต่ตอนที่ Player ยังไม่มีฟิลด์นั้น การอ่านตรง ๆ
 * จึงได้ undefined แล้วหน้าจอที่วนลูป (เช่น inventory.map) จะพังทันที
 * ทุกทางที่อ่านผู้เล่นออกจากฐานข้อมูลต้องผ่านฟังก์ชันนี้เสมอ
 */
function normalizePlayer(player: Player): Player {
  return { ...player, inventory: player.inventory ?? [] }
}

/** เพิ่มรายการธุรกรรมและอัปเดตยอดทอง/หยกไปพร้อมกัน — จุดเดียวที่แก้ currency ได้ */
function appendTransaction(
  account: StoredAccount,
  entry: Omit<CurrencyTransaction, 'id' | 'createdAt'>,
): StoredAccount {
  const transaction: CurrencyTransaction = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  const currency = { ...account.player.currency }
  if (transaction.currency === 'gold') currency.gold += transaction.amount
  else currency.gem += transaction.amount

  return {
    ...account,
    player: { ...account.player, currency },
    transactions: [...(account.transactions ?? []), transaction],
  }
}

/* ---------------- ตารางคูปอง / แพ็กเกจเติมหยก ---------------- */

interface CouponDefinition {
  gem: number
  /** จำนวนครั้งสูงสุดที่แลกได้รวมทุกบัญชี — ไม่ระบุ = ไม่จำกัด */
  maxRedemptions?: number
  expiresAt?: string
}

/** โค้ดคูปอง — คีย์เป็นตัวพิมพ์ใหญ่เสมอ (ดู redeemCoupon ที่ normalize ก่อนเทียบ) */
const COUPONS: Record<string, CouponDefinition> = {
  WELCOME2026: { gem: 50 },
}

export interface GemPackage {
  id: string
  gem: number
  /** ราคาที่แสดงผล — ยังไม่ผูกกับ payment gateway จริง */
  priceLabel: string
}

export const GEM_PACKAGES: GemPackage[] = [
  { id: 'gem-small', gem: 60, priceLabel: '฿30' },
  { id: 'gem-medium', gem: 320, priceLabel: '฿150' },
  { id: 'gem-large', gem: 980, priceLabel: '฿450' },
]

/* ---------------- ผลลัพธ์ ---------------- */

export type AuthResult =
  | { ok: true; player: Player }
  | { ok: false; error: string }

/* ---------------- ตรวจข้อมูลก่อนบันทึก ---------------- */

/** ตรวจรูปแบบอีเมลแบบพอดี ๆ — ไม่เข้มจนบล็อกอีเมลที่ใช้ได้จริง */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const PASSWORD_MIN_LENGTH = 8

export function validateEmail(email: string): string | null {
  const value = email.trim()
  if (value.length === 0) return 'กรุณากรอกอีเมล'
  if (!EMAIL_PATTERN.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง'
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'กรุณากรอกรหัสผ่าน'
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`
  }
  return null
}

/* ---------------- ผู้เล่นเริ่มต้น ---------------- */

function createNewPlayer(uid: string): Player {
  return {
    id: uid,
    uid,
    // ยังไม่ตั้งชื่อ — หน้าตั้งชื่อตัวละครจะเติมให้หลังสมัครเสร็จ
    name: '',
    title: 'ผู้จาริกหน้าใหม่',
    level: 1,
    exp: 0,
    expToNext: 100,
    // ของขวัญตอนสมัครบัญชี — ข้อยกเว้นเดียวที่ตั้งค่าทอง/หยกตรง ๆ ได้
    // (เกิดครั้งเดียวตอนสร้างบัญชี ไม่ใช่ endpoint ที่เรียกซ้ำได้ระหว่างเล่น)
    // หลังจากนี้ทองต้องผ่าน earnGold และหยกต้องผ่าน topUpGems/redeemCoupon เท่านั้น
    currency: { gold: 500, gem: 20 },
    // สมัครใหม่ได้ตัวละครฟรี 1 ตัว ยืนช่องแรก อีก 3 ช่องว่าง
    ownedCharacters: [
      {
        characterId: STARTER_CHARACTER_ID,
        level: 1,
        exp: 0,
        expToNext: 500,
        obtainedAt: new Date().toISOString(),
      },
    ],
    teamSlots: Array.from({ length: TEAM_SIZE }, (_, index) =>
      index === 0 ? STARTER_CHARACTER_ID : null,
    ),
    // กระเป๋าเริ่มต้นว่างเปล่า — ไอเทมต้องได้จากการเล่นเท่านั้น (ดู grantItem)
    inventory: [],
    frameId: 'arcane',
  }
}

/* ---------------- คำสั่งหลัก ---------------- */

export async function register(email: string, password: string): Promise<AuthResult> {
  if (!isStorageAvailable()) {
    return { ok: false, error: 'เบราว์เซอร์นี้บันทึกข้อมูลไม่ได้ (อาจอยู่ในโหมดส่วนตัว)' }
  }

  const emailError = validateEmail(email)
  if (emailError) return { ok: false, error: emailError }

  const passwordError = validatePassword(password)
  if (passwordError) return { ok: false, error: passwordError }

  const db = loadDb()
  const key = normalizeEmail(email)
  if (db.accounts[key]) {
    return { ok: false, error: 'อีเมลนี้ถูกใช้สมัครไปแล้ว' }
  }

  // ออก UID ที่ไม่ซ้ำกับบัญชีอื่นในฐานข้อมูลนี้จริง ๆ
  const takenUids = new Set(Object.values(db.accounts).map((account) => account.uid))
  const uid = generateUid((candidate) => takenUids.has(candidate))

  const passwordSalt = createSalt()
  const passwordHash = await hashPassword(password, passwordSalt)

  const account: StoredAccount = {
    uid,
    email: email.trim(),
    passwordHash,
    passwordSalt,
    createdAt: new Date().toISOString(),
    player: createNewPlayer(uid),
    transactions: [],
  }

  db.accounts[key] = account
  if (!saveDb(db)) {
    return { ok: false, error: 'บันทึกข้อมูลไม่สำเร็จ พื้นที่เก็บข้อมูลอาจเต็ม' }
  }

  writeJson(SESSION_KEY, { uid, email: key })
  return { ok: true, player: account.player }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const db = loadDb()
  const key = normalizeEmail(email)
  const account = db.accounts[key]

  // ข้อความเดียวกันทั้งกรณีไม่มีบัญชีและรหัสผิด
  // เพื่อไม่ให้เดาได้ว่าอีเมลไหนสมัครไว้แล้ว
  const failure: AuthResult = { ok: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
  if (!account) return failure

  const matched = await verifyPassword(password, account.passwordSalt, account.passwordHash)
  if (!matched) return failure

  writeJson(SESSION_KEY, { uid: account.uid, email: key })
  return { ok: true, player: normalizePlayer(account.player) }
}

export async function logout(): Promise<void> {
  removeKey(SESSION_KEY)
}

/** อ่านผู้เล่นของ session ที่ค้างอยู่ — ใช้ตอนเปิดเกมเพื่อไม่ต้องล็อกอินซ้ำ */
export async function getSessionPlayer(): Promise<Player | null> {
  const session = readJson<{ uid: string; email: string }>(SESSION_KEY)
  if (!session) return null

  const account = loadDb().accounts[session.email]
  if (!account || account.uid !== session.uid) {
    // session ชี้ไปยังบัญชีที่ไม่มีแล้ว — ล้างทิ้งเพื่อไม่ให้ค้าง
    removeKey(SESSION_KEY)
    return null
  }

  return normalizePlayer(account.player)
}

export interface FriendCandidate {
  uid: string
  name: string
  level: number
  title: string
}

/**
 * ค้นหาผู้เล่นจาก UID เพื่อเพิ่มเป็นเพื่อน — ใช้ UID เท่านั้น ไม่ใช้ชื่อ/อีเมล
 * (กันเดาชื่อคนอื่นมั่ว ๆ และไม่เปิดเผยอีเมลของเจ้าของบัญชี)
 *
 * ข้อจำกัดของ localStorage: หาเจอเฉพาะบัญชีที่เคยสมัครบนเบราว์เซอร์นี้เครื่องเดียวกัน
 * เท่านั้น (ยังไม่มีฐานข้อมูลกลางให้ค้นข้ามเครื่อง) — ดูหมายเหตุหัวไฟล์
 */
export async function findPlayerByUid(uid: string): Promise<FriendCandidate | null> {
  const db = loadDb()
  const entry = findAccountEntry(db, uid)
  if (!entry) return null

  const { player } = entry[1]
  return { uid: player.uid, name: player.name, level: player.level, title: player.title }
}

/** บันทึกความคืบหน้าของผู้เล่นกลับลงฐานข้อมูล */
export async function savePlayer(player: Player): Promise<boolean> {
  const db = loadDb()
  const entry = findAccountEntry(db, player.uid)
  if (!entry) return false

  const [key, account] = entry
  db.accounts[key] = { ...account, player }
  return saveDb(db)
}

/* ---------------- ทอง/หยก — ต้องผ่านฟังก์ชันที่ระบุแหล่งที่มาเท่านั้น ---------------- */

export type CurrencyResult =
  | { ok: true; player: Player; amount: number }
  | { ok: false; error: string }

/** ให้ทองจากการเล่นเท่านั้น — ทำเควสสำเร็จ หรือของดรอประหว่างเล่น */
export async function earnGold(
  uid: string,
  source: GoldSource,
  amount: number,
  refId?: string,
): Promise<CurrencyResult> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: 'จำนวนทองไม่ถูกต้อง' }
  }

  const db = loadDb()
  const entry = findAccountEntry(db, uid)
  if (!entry) return { ok: false, error: 'ไม่พบบัญชีผู้เล่น' }

  const [key, account] = entry
  const updated = appendTransaction(account, { currency: 'gold', source, amount, refId })
  db.accounts[key] = updated

  if (!saveDb(db)) return { ok: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }
  return { ok: true, player: updated.player, amount }
}

/** เติมหยกด้วยเงินจริง — ยังไม่ต่อ payment gateway จริง ถือว่าจ่ายสำเร็จเสมอ (ใช้เดโม) */
export async function topUpGems(uid: string, packageId: string): Promise<CurrencyResult> {
  const pack = GEM_PACKAGES.find((item) => item.id === packageId)
  if (!pack) return { ok: false, error: 'ไม่พบแพ็กเกจหยกนี้' }

  const db = loadDb()
  const entry = findAccountEntry(db, uid)
  if (!entry) return { ok: false, error: 'ไม่พบบัญชีผู้เล่น' }

  const [key, account] = entry
  const updated = appendTransaction(account, {
    currency: 'gem',
    source: 'topup',
    amount: pack.gem,
    refId: pack.id,
  })
  db.accounts[key] = updated

  if (!saveDb(db)) return { ok: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }
  return { ok: true, player: updated.player, amount: pack.gem }
}

/** แลกโค้ดคูปองเป็นหยก — แลกได้บัญชีละ 1 ครั้งต่อโค้ด และเช็กโควตารวมถ้ากำหนดไว้ */
export async function redeemCoupon(uid: string, code: string): Promise<CurrencyResult> {
  const normalized = code.trim().toUpperCase()
  const coupon = COUPONS[normalized]
  if (!coupon) return { ok: false, error: 'โค้ดนี้ไม่ถูกต้องหรือหมดอายุแล้ว' }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: 'โค้ดนี้หมดอายุแล้ว' }
  }

  const db = loadDb()
  const entry = findAccountEntry(db, uid)
  if (!entry) return { ok: false, error: 'ไม่พบบัญชีผู้เล่น' }
  const [key, account] = entry

  const alreadyRedeemed = (account.transactions ?? []).some(
    (tx) => tx.source === 'coupon' && tx.refId === normalized,
  )
  if (alreadyRedeemed) return { ok: false, error: 'ใช้โค้ดนี้ไปแล้ว' }

  if (coupon.maxRedemptions !== undefined) {
    const totalRedeemed = Object.values(db.accounts).reduce(
      (count, other) =>
        count +
        (other.transactions ?? []).filter((tx) => tx.source === 'coupon' && tx.refId === normalized).length,
      0,
    )
    if (totalRedeemed >= coupon.maxRedemptions) {
      return { ok: false, error: 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว' }
    }
  }

  const updated = appendTransaction(account, {
    currency: 'gem',
    source: 'coupon',
    amount: coupon.gem,
    refId: normalized,
  })
  db.accounts[key] = updated

  if (!saveDb(db)) return { ok: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }
  return { ok: true, player: updated.player, amount: coupon.gem }
}

/** ประวัติทอง/หยกทั้งหมดของบัญชี เรียงเก่า→ใหม่ — ใช้แสดงหน้าประวัติการทำรายการ */
export async function getTransactions(uid: string): Promise<CurrencyTransaction[]> {
  const db = loadDb()
  const entry = findAccountEntry(db, uid)
  return entry ? (entry[1].transactions ?? []) : []
}

/* ---------------- ไอเทม ---------------- */

/** ไอเทมได้จากการเล่นเท่านั้น — ทำเควสสำเร็จ หรือของดรอป (กติกาเดียวกับทอง) */
export type ItemSource = GoldSource

export type ItemResult =
  | { ok: true; player: Player }
  | { ok: false; error: string }

/**
 * เพิ่มไอเทมเข้ากระเป๋าผู้เล่น — มีอยู่แล้วให้บวกจำนวน ไม่มีให้สร้างช่องใหม่
 *
 * ยังไม่มีหน้าจอไหนเรียกฟังก์ชันนี้ (ตั้งใจ — ไอเทมต้องมาจากเควส/ดรอปของจริงเท่านั้น
 * ไม่ใช่ปุ่มกดแจกเอง) เตรียมไว้ให้ระบบเควส/ต่อสู้เรียกใช้เมื่อสร้างเสร็จ
 */
export async function grantItem(
  uid: string,
  itemId: string,
  quantity: number,
  source: ItemSource,
): Promise<ItemResult> {
  if (!getItem(itemId)) return { ok: false, error: 'ไม่พบไอเทมนี้' }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, error: 'จำนวนไอเทมไม่ถูกต้อง' }
  }

  const db = loadDb()
  const entry = findAccountEntry(db, uid)
  if (!entry) return { ok: false, error: 'ไม่พบบัญชีผู้เล่น' }

  const [key, account] = entry
  const inventory = account.player.inventory ?? []
  const existing = inventory.find((slot) => slot.itemId === itemId)

  const nextInventory = existing
    ? inventory.map((slot) =>
        slot.itemId === itemId ? { ...slot, quantity: slot.quantity + quantity } : slot,
      )
    : [
        ...inventory,
        { itemId, quantity, obtainedAt: new Date().toISOString(), obtainedFrom: source },
      ]

  const updated: StoredAccount = {
    ...account,
    player: { ...account.player, inventory: nextInventory },
  }
  db.accounts[key] = updated

  if (!saveDb(db)) return { ok: false, error: 'บันทึกข้อมูลไม่สำเร็จ' }
  return { ok: true, player: updated.player }
}

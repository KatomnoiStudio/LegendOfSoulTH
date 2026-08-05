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
 *
 * ─── ข้อจำกัดที่ต้องรู้ ────────────────────────────────────
 * ข้อมูลอยู่ในเบราว์เซอร์ของผู้เล่นเอง จึงแก้ได้ด้วย DevTools
 * ระบบนี้ใช้ "จำผู้เล่นบนเครื่องนี้" ได้ แต่ยังไม่ใช่การยืนยันตัวตนที่เชื่อถือได้
 * ───────────────────────────────────────────────────────────
 */

const DB_KEY = 'los:db:v1'
const SESSION_KEY = 'los:session:v1'

/** ตัวละครที่ได้ฟรีตอนสมัครบัญชีใหม่ */
const STARTER_CHARACTER_ID = 'monkey-king'

interface StoredAccount {
  uid: string
  email: string
  passwordHash: string
  passwordSalt: string
  createdAt: string
  player: Player
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
  return { ok: true, player: account.player }
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

  return account.player
}

/** บันทึกความคืบหน้าของผู้เล่นกลับลงฐานข้อมูล */
export async function savePlayer(player: Player): Promise<boolean> {
  const db = loadDb()
  const entry = Object.entries(db.accounts).find(([, account]) => account.uid === player.uid)
  if (!entry) return false

  const [key, account] = entry
  db.accounts[key] = { ...account, player }
  return saveDb(db)
}

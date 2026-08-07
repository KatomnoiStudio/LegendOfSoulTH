import { publicUrl } from '../lib/publicUrl'
import type { CharacterModelKind } from './characters'
import type { Direction8 } from './realtimeBattle/types'

/**
 * ชุดเฟรมภาพเฉพาะของห้องต่อสู้ real-time — แยกจาก src/game/spriteSequences.ts โดยตั้งใจ
 *
 * ทำไมต้องแยก: ไฟล์เดิมเป็นของฉาก Lobby และหน้าทำเนียบวีรชน ซึ่งเล่นเฟรมแบบวนลูป
 * ตลอดเวลา (หายใจ/ท่าอัตโนมัติ) ส่วนห้องต่อสู้ต้องการชุดเฟรมต่อ "สถานะ" และต่อ "ทิศ"
 * แถมสเปกสั่งชัดว่าห้ามแก้ระบบ sprite ของ Lobby จนพัง (§10)
 *
 * ── Fallback ที่ประกาศไว้ชัดเจน ────────────────────────────
 * asset ที่มีจริงในโปรเจกต์ตอนนี้มี idle / walk 8 ทิศ (หงอคง + ตือโป๊ยก่าย) / attack ของหงอคง
 * ท่าที่เหลือจึงถูก map ไปยังเฟรมที่ใกล้เคียงที่สุดอย่างจงใจ ไม่ปล่อยภาพหาย:
 *   attack-2 / attack-3 → ชุด attack เดียวกัน (ต่างที่จังหวะและ knockback ไม่ใช่ที่ภาพ)
 *   dash                → เฟรม walk ของทิศนั้น (เอฟเฟกต์เส้นลากทำด้วย effect layer)
 *   skill-1             → ชุด action ของตัวละคร (หงอคง = monkey-v2 10 เฟรม)
 *   hit / death         → เฟรม idle แรก แล้วให้ material จัดการ flash/fade
 *   victory             → ชุด pose ของหงอคง, ตัวอื่นใช้ idle
 * ตัวละครที่ไม่มีชุดเดิน (พระถัง) ใช้ idle เป็นเฟรมเดิน — ประกาศไว้ตรงนี้
 * เพื่อให้รู้ว่าเป็นการตัดสินใจ ไม่ใช่ asset หาย
 * ───────────────────────────────────────────────────────────
 *
 * ทุก path ผ่าน publicUrl() เสมอ — เคยพลาดเรื่องนี้มาแล้วสองรอบเพราะ path ซ่อนอยู่ใน
 * object ข้อมูลแบบนี้ ไม่ใช่ JSX ตรง ๆ (ดู MEMORY.md ข้อ 12 และ 15)
 *
 * ── นามสกุลไฟล์ ────────────────────────────────────────────
 * ต้องเป็น .webp เท่านั้น: โปรเจกต์ย้ายไป pipeline ที่แปลงต้นฉบับ PNG ใน `assets/raw/`
 * ด้วย `npm run build:images` แล้วออกมาเป็น WebP ใน `public/` (README หัวข้อ "ภาพ 2D")
 * ตอนนี้ไม่มีไฟล์ .png เหลืออยู่ใน `public/` เลยแม้แต่ไฟล์เดียว
 * เพิ่มเฟรมใหม่ = วางต้นฉบับใน `assets/raw/characters/` แล้วรัน build:images ก่อนอ้างถึง
 * (เทสต์ `realtimeBattle/battleAssets.test.ts` จะจับให้ถ้าอ้างพาธที่ไม่มีไฟล์จริง)
 */

export type BattleAnimationId =
  | 'idle'
  | 'walk'
  | 'attack-1'
  | 'attack-2'
  | 'attack-3'
  | 'dash'
  | 'skill-1'
  | 'hit'
  | 'death'
  | 'victory'

/** ทิศที่มีเฟรมภาพจริง — walk/dash ใช้ 8 ทิศจากชีต, ท่าอื่นใช้ 4 ทิศหรือชุดเดียว */
export type SpriteDirection4 = 'up' | 'down' | 'left' | 'right'

const DIRECTIONS_8: Direction8[] = [
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
]

export interface BattleAnimation {
  /** เฟรมต่อทิศ — walk/dash มีครบ 8 ทิศ, ท่าอื่นมักใช้ชุดเดียวทุกทิศ */
  frames: Partial<Record<Direction8, string[]>>
  /** เฟรมต่อวินาที */
  rate: number
  /** เล่นวนหรือเล่นจบแล้วค้างเฟรมสุดท้าย */
  loop: boolean
}

export type BattleSpriteSet = Record<BattleAnimationId, BattleAnimation>

function frames(prefix: string, count: number, start = 0): string[] {
  return Array.from({ length: count }, (_, index) =>
    publicUrl(`characters/${prefix}-${index + start}.webp`),
  )
}

function walkFrames8(prefix: 'monkey-walk' | 'pigsy-walk'): Partial<Record<Direction8, string[]>> {
  const result: Partial<Record<Direction8, string[]>> = {}
  for (const direction of DIRECTIONS_8) {
    result[direction] = Array.from({ length: 8 }, (_, index) =>
      publicUrl(`characters/walk/${prefix}-${direction}-${index}.webp`),
    )
  }
  return result
}

/** ชุดเฟรมเดียวใช้ทุกทิศ (idle / attack / skill ฯลฯ) */
function allDirections(urls: string[]): Partial<Record<Direction8, string[]>> {
  const result: Partial<Record<Direction8, string[]>> = {}
  for (const direction of DIRECTIONS_8) {
    result[direction] = urls
  }
  return result
}

const MONKEY_IDLE = frames('monkey-v2-idle', 24)
const MONKEY_ATTACK = frames('monkey-attack-new', 6, 12)
const MONKEY_ACTION = frames('monkey-v2', 10)
const MONKEY_VICTORY = Array.from({ length: 4 }, (_, index) =>
  publicUrl(`characters/monkey-pose-${index}-alpha.webp`),
)
const PIGSY_IDLE = frames('pigsy-idle', 24)
const PIGSY_ACTION = frames('pigsy-team', 8)
const TRIPITAKA_IDLE = frames('tripitaka-idle', 24)

const MONKEY_KING_SET: BattleSpriteSet = {
  idle: { frames: allDirections(MONKEY_IDLE), rate: 8, loop: true },
  walk: { frames: walkFrames8('monkey-walk'), rate: 12, loop: true },
  'attack-1': { frames: allDirections(MONKEY_ATTACK), rate: 16, loop: false },
  'attack-2': { frames: allDirections(MONKEY_ATTACK), rate: 18, loop: false },
  'attack-3': { frames: allDirections(MONKEY_ATTACK), rate: 14, loop: false },
  dash: { frames: walkFrames8('monkey-walk'), rate: 20, loop: false },
  'skill-1': { frames: allDirections(MONKEY_ACTION), rate: 16, loop: false },
  hit: { frames: allDirections([MONKEY_IDLE[0]]), rate: 1, loop: false },
  death: { frames: allDirections([MONKEY_IDLE[0]]), rate: 1, loop: false },
  victory: { frames: allDirections(MONKEY_VICTORY), rate: 5, loop: false },
}

const PIG_WARRIOR_SET: BattleSpriteSet = {
  idle: { frames: allDirections(PIGSY_IDLE), rate: 8, loop: true },
  walk: { frames: walkFrames8('pigsy-walk'), rate: 12, loop: true },
  'attack-1': { frames: allDirections(PIGSY_ACTION), rate: 12, loop: false },
  'attack-2': { frames: allDirections(PIGSY_ACTION), rate: 12, loop: false },
  'attack-3': { frames: allDirections(PIGSY_ACTION), rate: 12, loop: false },
  dash: { frames: walkFrames8('pigsy-walk'), rate: 16, loop: false },
  'skill-1': { frames: allDirections(PIGSY_ACTION), rate: 12, loop: false },
  hit: { frames: allDirections([PIGSY_IDLE[0]]), rate: 1, loop: false },
  death: { frames: allDirections([PIGSY_IDLE[0]]), rate: 1, loop: false },
  victory: { frames: allDirections(PIGSY_ACTION), rate: 6, loop: false },
}

const PILGRIM_MONK_SET: BattleSpriteSet = {
  idle: { frames: allDirections(TRIPITAKA_IDLE), rate: 8, loop: true },
  walk: { frames: allDirections(TRIPITAKA_IDLE), rate: 12, loop: true },
  'attack-1': { frames: allDirections(TRIPITAKA_IDLE), rate: 10, loop: false },
  'attack-2': { frames: allDirections(TRIPITAKA_IDLE), rate: 10, loop: false },
  'attack-3': { frames: allDirections(TRIPITAKA_IDLE), rate: 10, loop: false },
  dash: { frames: allDirections(TRIPITAKA_IDLE), rate: 16, loop: false },
  'skill-1': { frames: allDirections(TRIPITAKA_IDLE), rate: 10, loop: false },
  hit: { frames: allDirections([TRIPITAKA_IDLE[0]]), rate: 1, loop: false },
  death: { frames: allDirections([TRIPITAKA_IDLE[0]]), rate: 1, loop: false },
  victory: { frames: allDirections(TRIPITAKA_IDLE), rate: 6, loop: false },
}

/**
 * ใช้ Record ที่ต้องมีครบทุก kind แทนการ if แล้ว fallback เงียบ ๆ
 * เพิ่มตัวละครใหม่เมื่อไหร่ TypeScript จะฟ้องทันทีว่ายังไม่ได้ใส่ชุดเฟรมของห้องต่อสู้
 */
const BATTLE_SPRITE_SETS: Record<CharacterModelKind, BattleSpriteSet> = {
  'monkey-king': MONKEY_KING_SET,
  'pig-warrior': PIG_WARRIOR_SET,
  'pilgrim-monk': PILGRIM_MONK_SET,
}

export function getBattleSpriteSet(kind: CharacterModelKind): BattleSpriteSet {
  return BATTLE_SPRITE_SETS[kind]
}

/** ย่อ 8 ทิศของ runtime ให้เหลือ 4 ทิศเมื่อไม่มีเฟรมเฉียง */
export function toSpriteDirection(facing: Direction8): SpriteDirection4 {
  switch (facing) {
    case 'up':
    case 'up-left':
    case 'up-right':
      return 'up'
    case 'down':
    case 'down-left':
    case 'down-right':
      return 'down'
    case 'left':
      return 'left'
    case 'right':
      return 'right'
  }
}

/** เลือกเฟรมตามทิศ — ใช้เฟรมเฉียงจากชีตก่อน แล้วค่อย fallback เป็น 4 ทิศ */
export function resolveBattleFrames(animation: BattleAnimation, facing: Direction8): string[] {
  const direct = animation.frames[facing]
  if (direct && direct.length > 0) return direct
  const fallback = animation.frames[toSpriteDirection(facing)]
  return fallback ?? []
}

function urlsFor(kinds: CharacterModelKind[], animations: BattleAnimationId[]): string[] {
  const urls = new Set<string>()
  for (const kind of kinds) {
    const set = getBattleSpriteSet(kind)
    for (const animationId of animations) {
      for (const directionFrames of Object.values(set[animationId].frames)) {
        if (!directionFrames) continue
        for (const url of directionFrames) urls.add(url)
      }
    }
  }
  return [...urls]
}

const ALL_ANIMATIONS: BattleAnimationId[] = [
  'idle',
  'walk',
  'attack-1',
  'attack-2',
  'attack-3',
  'dash',
  'skill-1',
  'hit',
  'death',
  'victory',
]

/**
 * ภาพที่ต้องพร้อมก่อนเริ่มจำลองจริง ๆ (§27)
 *
 * ชุดเฟรมทั้งหมดของการต่อสู้หนึ่งครั้งรวมกันราว 16 MB (วัดจากไฟล์จริงใน public/characters)
 * ถ้ารอให้ครบก่อนเปิดห้อง ผู้เล่นจะค้างที่หน้า "กำลังเตรียมห้องต่อสู้…" นานมาก — เจอจริง
 * ตอนทดสอบบนจอมือถือแนวนอน 844×390 แล้วห้องยังโหลดไม่เสร็จหลังผ่านไปหลายวินาที
 *
 * ท่าที่จำเป็นตอนเปิดห้องมีแค่ idle (ทุกตัวยืนนิ่งช่วงฉากเปิด และผู้เล่นยังกดอะไรไม่ได้)
 * ที่เหลือจึงโหลดต่อเบื้องหลังหลังห้องเปิดแล้ว
 */
export function collectCriticalTextureUrls(kinds: CharacterModelKind[]): string[] {
  return urlsFor(kinds, ['idle'])
}

/** ภาพที่เหลือ — โหลดเบื้องหลังหลังห้องเปิดแล้ว */
export function collectDeferredTextureUrls(kinds: CharacterModelKind[]): string[] {
  const critical = new Set(collectCriticalTextureUrls(kinds))
  return urlsFor(kinds, ALL_ANIMATIONS).filter((url) => !critical.has(url))
}

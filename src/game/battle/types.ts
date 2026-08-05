import type { Character } from '../characters'

export type BattlePhase =
  | 'intro'
  | 'awaiting_input'
  | 'resolving'
  | 'victory'
  | 'defeat'

export type ActionKind = 'attack' | 'defend' | 'skill'

export interface BattleAction {
  kind: ActionKind
  actorId: string
  /** เป้าหมายเดียว — skill บางแบบอาจขยายเป็น AoE ใน engine */
  targetId: string
}

export interface Combatant {
  id: string
  name: string
  spriteUrl: string
  accent: string
  isAlly: boolean
  slot: number
  atk: number
  def: number
  spd: number
  hp: number
  maxHp: number
  /** ลดดาเมจรอบถัดไปเมื่อเลือกป้องกัน */
  defending: boolean
  characterId?: string
  enemyId?: string
}

export type LogTone = 'normal' | 'damage' | 'heal' | 'buff' | 'system'

export interface BattleLogEntry {
  id: string
  text: string
  tone: LogTone
}

export interface BattleSnapshot {
  stageId: string
  stageName: string
  round: number
  phase: BattlePhase
  allies: Combatant[]
  enemies: Combatant[]
  /** ลำดับเทิร์นรอบนี้ — id ของ combatant */
  turnQueue: string[]
  /** ดัชนีใน turnQueue ของหน่วยที่กำลังเล่น */
  turnIndex: number
  /** หน่วยที่กำลังเล่นเทิร์น */
  activeUnitId: string | null
  log: BattleLogEntry[]
  result: 'ongoing' | 'victory' | 'defeat'
  /** จำนวนเทิร์นที่ผ่านไปแล้ว (นับทุกการกระทำ) */
  turnCount: number
}

export interface BattleSetupUnit {
  character: Character
  slot: number
}

export interface BattleResult {
  outcome: 'victory' | 'defeat'
  stageId: string
  stageName: string
  turns: number
  finishedAt: string
}

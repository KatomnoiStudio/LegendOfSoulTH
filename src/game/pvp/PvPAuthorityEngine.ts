import { applyAttackEffects } from '../realtimeBattle/battleEffects'
import { applyCombatReaction, tickKnockdownState } from '../realtimeBattle/combatReaction'
import { combatFacingFromVector } from '../realtimeBattle/combatFacing'
import {
  allowsMovementDuringCast,
  isFullMoveActiveWindow,
} from '../realtimeBattle/combatMoveSchema'
import {
  applyHitStop,
  cancelCombo,
  createComboState,
  isAttacking,
  pressAttack,
  stepCombo,
  type ComboState,
} from '../realtimeBattle/ComboSystem'
import { getPlayerAttackChain } from '../heroes/attackChains'
import { stepAllyAI } from '../realtimeBattle/AllyAISystem'
import { findHitTargets } from '../realtimeBattle/HitboxSystem'
import { clampToArena, stepMovement } from '../realtimeBattle/MovementSystem'
import { createEmptyPlayerInputState } from '../realtimeBattle/playerInput'
import { getRealtimeStage } from '../realtimeBattle/stageConfig'
import { getRealtimeSkillKit, getSkillFromKit, type SkillSlot } from '../realtimeBattle/skills'
import {
  canStartSkill,
  createSkillState,
  isCastingSkill,
  startSkill,
  stepSkill,
  type SkillState,
} from '../realtimeBattle/SkillSystem'
import { tickStatusEffects } from '../realtimeBattle/statusEffects'
import { addUltimateGauge, ULTIMATE_GAUGE_CONFIG } from '../realtimeBattle/ultimateGauge'
import type { RealtimeBattleEntity, Vec2 } from '../realtimeBattle/types'
import type {
  PvPAuthorityState,
  PvPInputFrame,
  PvPParticipantState,
  RealtimePvPResult,
  SerializableComboState,
  SerializableSkillState,
} from './pvpTypes'

export const PVP_FIXED_TICK_MS = 50
export const PVP_RECONNECT_GRACE_MS = 10_000
export const PVP_MAX_PENDING_ACTIONS = 4
export const PVP_STAGE_ID = 'trial-01'

function serializeCombo(combo: ComboState): SerializableComboState {
  return {
    attackId: combo.attack?.id ?? null,
    chainIndex: combo.chainIndex,
    sinceStartMs: combo.sinceStartMs,
    sinceLastFinishMs: combo.sinceLastFinishMs,
    bufferedInputAgeMs: combo.bufferedInputAgeMs,
    hitTargetIds: [...combo.hitTargets].toSorted(),
    hitStopRemainingMs: combo.hitStopRemainingMs,
  }
}

function hydrateCombo(participant: PvPParticipantState): ComboState {
  const saved = participant.combo
  const chain = getPlayerAttackChain(participant.entity.characterId)
  return {
    attack: saved.attackId
      ? (chain.find((definition) => definition.id === saved.attackId) ?? null)
      : null,
    chainIndex: saved.chainIndex,
    sinceStartMs: saved.sinceStartMs,
    sinceLastFinishMs: saved.sinceLastFinishMs,
    bufferedInputAgeMs: saved.bufferedInputAgeMs,
    hitTargets: new Set(saved.hitTargetIds),
    hitStopRemainingMs: saved.hitStopRemainingMs,
  }
}

function serializeSkill(skill: SkillState): SerializableSkillState {
  return {
    slot: skill.definition?.slot ?? null,
    sinceStartMs: skill.sinceStartMs,
    hitTargetIds: [...skill.hitTargets].toSorted(),
    strikeHitIds: [...skill.strikeHits].toSorted(),
    lockedTargetId: skill.lockedTargetId,
    sideEffectsApplied: skill.sideEffectsApplied,
  }
}

function hydrateSkill(participant: PvPParticipantState): SkillState {
  const saved = participant.skill
  const kit = getRealtimeSkillKit(participant.entity.characterId)
  return {
    definition: saved.slot && kit ? getSkillFromKit(kit, saved.slot) : null,
    sinceStartMs: saved.sinceStartMs,
    hitTargets: new Set(saved.hitTargetIds),
    strikeHits: new Set(saved.strikeHitIds),
    lockedTargetId: saved.lockedTargetId,
    sideEffectsApplied: saved.sideEffectsApplied,
  }
}

function cloneEntity(entity: RealtimeBattleEntity): RealtimeBattleEntity {
  return {
    ...entity,
    position: { ...entity.position },
    velocity: { ...entity.velocity },
    skillCooldownsMs: { ...entity.skillCooldownsMs },
    activeBuffs: entity.activeBuffs?.map((buff) => ({ ...buff })),
    activeCc: entity.activeCc?.map((cc) => ({ ...cc })),
  }
}

function cloneParticipant(participant: PvPParticipantState): PvPParticipantState {
  return {
    ...participant,
    entity: cloneEntity(participant.entity),
    summons: participant.summons.map(cloneEntity),
    combo: { ...participant.combo, hitTargetIds: [...participant.combo.hitTargetIds] },
    skill: {
      ...participant.skill,
      hitTargetIds: [...participant.skill.hitTargetIds],
      strikeHitIds: [...participant.skill.strikeHitIds],
    },
    latestInput: { ...participant.latestInput },
    pendingActions: [...participant.pendingActions],
  }
}

function prepareCombatant(
  entity: RealtimeBattleEntity,
  playerId: string,
  position: Vec2,
  facing: 'left' | 'right',
): RealtimeBattleEntity {
  return {
    ...cloneEntity(entity),
    id: `pvp:${playerId}`,
    entityType: 'pvp-player',
    controllerId: playerId,
    position: { ...position },
    facing,
    combatFacing: facing,
    state: 'idle',
    hp: entity.maxHp,
    combatTier: 'elite',
  }
}

function createParticipant(
  playerId: string,
  entity: RealtimeBattleEntity,
  position: Vec2,
  facing: 'left' | 'right',
  nowMs: number,
): PvPParticipantState {
  const combatant = prepareCombatant(entity, playerId, position, facing)
  return {
    playerId,
    heroId: combatant.characterId ?? 'unknown',
    entity: combatant,
    summons: [],
    combo: serializeCombo(createComboState()),
    skill: serializeSkill(createSkillState()),
    latestInput: createEmptyPlayerInputState(),
    pendingActions: [],
    lastProcessedSequence: 0,
    connected: true,
    lastSeenAtMs: nowMs,
    disconnectedAtMs: null,
  }
}

export function createPvPAuthorityState(
  matchId: string,
  host: { playerId: string; entity: RealtimeBattleEntity },
  guest: { playerId: string; entity: RealtimeBattleEntity },
  nowMs = 0,
): PvPAuthorityState {
  const stage = getRealtimeStage(PVP_STAGE_ID)
  if (!stage) throw new Error(`PvP stage not found: ${PVP_STAGE_ID}`)

  const state: PvPAuthorityState = {
    matchId,
    stageId: stage.id,
    tick: 0,
    elapsedMs: 0,
    lastAdvancedAtMs: nowMs,
    status: 'active',
    participants: [
      createParticipant(
        host.playerId,
        host.entity,
        { x: stage.width * 0.34, y: stage.height * 0.5 },
        'right',
        nowMs,
      ),
      createParticipant(
        guest.playerId,
        guest.entity,
        { x: stage.width * 0.66, y: stage.height * 0.5 },
        'left',
        nowMs,
      ),
    ],
    winnerPlayerId: null,
    loserPlayerId: null,
    resultReason: null,
    finishedAt: null,
    rngSeed: 0x51f15e,
    stateHash: '',
  }
  state.stateHash = hashPvPAuthorityState(state)
  return state
}

function actionFromInput(input: PvPInputFrame['input']): PvPParticipantState['pendingActions'] {
  const actions: PvPParticipantState['pendingActions'] = []
  if (input.basicAttackPressed) actions.push('attack')
  if (input.skill1Pressed) actions.push('skill1')
  if (input.skill2Pressed) actions.push('skill2')
  if (input.skill3Pressed) actions.push('skill3')
  if (input.ultimatePressed) actions.push('ultimate')
  return actions
}

function ingestFrames(state: PvPAuthorityState, frames: PvPInputFrame[], nowMs: number): void {
  const ordered = frames.toSorted(
    (left, right) =>
      left.clientTick - right.clientTick ||
      left.playerId.localeCompare(right.playerId) ||
      left.sequence - right.sequence,
  )
  for (const frame of ordered) {
    const participant = state.participants.find((entry) => entry.playerId === frame.playerId)
    if (!participant || frame.sequence <= participant.lastProcessedSequence) continue
    participant.lastProcessedSequence = frame.sequence
    participant.lastSeenAtMs = nowMs
    participant.connected = true
    participant.disconnectedAtMs = null
    participant.latestInput = { ...frame.input }
    participant.pendingActions.push(...actionFromInput(frame.input))
    participant.pendingActions = participant.pendingActions.slice(0, PVP_MAX_PENDING_ACTIONS)
  }
}

function tickEntityTimers(entity: RealtimeBattleEntity, deltaMs: number, elapsedMs: number): void {
  if (entity.state === 'dead') return
  entity.attackCooldownRemainingMs = Math.max(0, entity.attackCooldownRemainingMs - deltaMs)
  entity.skillCooldownsMs.skill1 = Math.max(0, entity.skillCooldownsMs.skill1 - deltaMs)
  entity.skillCooldownsMs.skill2 = Math.max(0, entity.skillCooldownsMs.skill2 - deltaMs)
  entity.skillCooldownsMs.skill3 = Math.max(0, entity.skillCooldownsMs.skill3 - deltaMs)
  entity.hitStunRemainingMs = Math.max(0, entity.hitStunRemainingMs - deltaMs)
  tickKnockdownState(entity, deltaMs, elapsedMs)
  tickStatusEffects(entity, deltaMs)
  if (entity.hitStunRemainingMs <= 0 && entity.state === 'hit') entity.state = 'idle'
}

function processAction(
  participant: PvPParticipantState,
  opponent: PvPParticipantState,
  combo: ComboState,
  skill: SkillState,
  elapsedMs: number,
): void {
  const action = participant.pendingActions.shift()
  if (!action) return
  const entity = participant.entity
  if (action === 'attack') {
    entity.combatFacing = combatFacingFromVector(
      { x: participant.latestInput.moveX, y: participant.latestInput.moveDepth },
      entity.combatFacing,
    )
    pressAttack(entity, combo)
    return
  }

  const kit = getRealtimeSkillKit(entity.characterId)
  if (!kit) return
  const definition = getSkillFromKit(kit, action as SkillSlot)
  if (!canStartSkill(entity, skill, definition, isAttacking(combo))) return
  cancelCombo(entity, combo)
  const lockedTargetId = definition.targetLock === 'nearest' ? opponent.entity.id : null
  if (lockedTargetId) {
    entity.combatFacing = opponent.entity.position.x >= entity.position.x ? 'right' : 'left'
  }
  startSkill(entity, skill, definition, elapsedMs, lockedTargetId)
}

interface HitIntent {
  attacker: PvPParticipantState
  target: PvPParticipantState
  attack: NonNullable<ReturnType<typeof stepCombo>['attack']>
  combo: ComboState | null
  source: 'basic' | 'skill'
}

function collectParticipantIntents(
  participant: PvPParticipantState,
  opponent: PvPParticipantState,
  combo: ComboState,
  skill: SkillState,
  deltaMs: number,
  elapsedMs: number,
): HitIntent[] {
  const entity = participant.entity
  const skillTick = stepSkill(entity, skill, deltaMs)
  const comboTick = isCastingSkill(skill)
    ? { hitboxActive: false, attack: null }
    : stepCombo(entity, combo, deltaMs)

  const activeAttack = skillTick.attack ?? comboTick.attack
  const activeCombo = comboTick.attack
  const activeHit = activeAttack
    ? isFullMoveActiveWindow(
        activeAttack,
        skillTick.attack ? skill.sinceStartMs : combo.sinceStartMs,
      )
    : false
  const mayMove = !activeHit && (!isCastingSkill(skill) || allowsMovementDuringCast(activeAttack!))
  if (mayMove) {
    const moved = stepMovement(
      entity,
      { x: participant.latestInput.moveX, y: participant.latestInput.moveDepth },
      deltaMs,
      { stage: getRealtimeStage(PVP_STAGE_ID)!, blockers: [opponent.entity] },
    )
    if ((entity.state === 'idle' || entity.state === 'walk') && moved) entity.state = 'walk'
    else if (entity.state === 'walk' && !moved) entity.state = 'idle'
  }

  const intents: HitIntent[] = []
  if (comboTick.hitboxActive && activeCombo) {
    const targets = findHitTargets([opponent.entity], {
      attacker: entity,
      attack: activeCombo,
      alreadyHit: combo.hitTargets,
      elapsedMs,
    })
    if (targets.length > 0) {
      combo.hitTargets.add(opponent.entity.id)
      intents.push({
        attacker: participant,
        target: opponent,
        attack: activeCombo,
        combo,
        source: 'basic',
      })
    }
  }

  if (skillTick.hitboxActive && skillTick.attack) {
    const alreadyHit = skillTick.strikeIndex >= 0 ? skill.strikeHits : skill.hitTargets
    const targets = findHitTargets([opponent.entity], {
      attacker: entity,
      attack: skillTick.attack,
      alreadyHit,
      elapsedMs,
      lockedTargetId: skill.lockedTargetId ?? undefined,
    })
    if (targets.length > 0) {
      if (skillTick.strikeIndex >= 0) {
        const strikeKey = `${opponent.entity.id}:${skillTick.strikeIndex}`
        if (skill.strikeHits.has(strikeKey)) return intents
        skill.strikeHits.add(strikeKey)
      } else {
        skill.hitTargets.add(opponent.entity.id)
      }
      intents.push({
        attacker: participant,
        target: opponent,
        attack: skillTick.attack,
        combo: null,
        source: 'skill',
      })
    }

    if (!skill.sideEffectsApplied && skillTick.attack.effects?.length) {
      skill.sideEffectsApplied = true
      const summons = applyAttackEffects(
        skillTick.attack,
        { owner: entity, allies: participant.summons, enemies: [opponent.entity] },
        `pvp-${participant.playerId}-${elapsedMs}`,
      )
      for (const summon of summons) {
        summon.position = {
          x: entity.position.x + (entity.combatFacing === 'right' ? 48 : -48),
          y: entity.position.y,
        }
        participant.summons.push(summon)
      }
    }
  }
  return intents
}

function nextRandom(state: PvPAuthorityState): number {
  state.rngSeed = (Math.imul(state.rngSeed, 1_664_525) + 1_013_904_223) >>> 0
  return state.rngSeed / 0x1_0000_0000
}

function applyIntents(state: PvPAuthorityState, intents: HitIntent[]): void {
  const stage = getRealtimeStage(PVP_STAGE_ID)!
  for (const intent of intents.toSorted((a, b) =>
    a.attacker.playerId.localeCompare(b.attacker.playerId),
  )) {
    const outcome = applyCombatReaction({
      attacker: intent.attacker.entity,
      target: intent.target.entity,
      attack: intent.attack,
      elapsedMs: state.elapsedMs,
      random: () => nextRandom(state),
    })
    intent.target.entity.position = clampToArena(
      intent.target.entity.position,
      intent.target.entity.collisionRadius,
      stage,
    )
    const gauge =
      intent.source === 'basic'
        ? ULTIMATE_GAUGE_CONFIG.gainOnBasicHit
        : ULTIMATE_GAUGE_CONFIG.gainOnSkillHit
    intent.attacker.entity.ultimateGauge = addUltimateGauge(
      intent.attacker.entity.ultimateGauge,
      gauge + (outcome.defeated ? ULTIMATE_GAUGE_CONFIG.gainOnKill : 0),
    )
    if (intent.combo) applyHitStop(intent.combo)
  }
}

function stepSummons(state: PvPAuthorityState, deltaMs: number): void {
  const stage = getRealtimeStage(PVP_STAGE_ID)!
  for (let index = 0; index < state.participants.length; index += 1) {
    const owner = state.participants[index]
    const opponent = state.participants[index === 0 ? 1 : 0]
    for (const summon of owner.summons) {
      tickEntityTimers(summon, deltaMs, state.elapsedMs)
      stepAllyAI(summon, [opponent.entity], stage, deltaMs, state.elapsedMs, () => undefined)
    }
    owner.summons = owner.summons.filter((summon) => summon.state !== 'dead' && summon.hp > 0)
  }
}

function finishIfNeeded(state: PvPAuthorityState, nowMs: number): void {
  const [host, guest] = state.participants
  const hostDead = host.entity.hp <= 0 || host.entity.state === 'dead'
  const guestDead = guest.entity.hp <= 0 || guest.entity.state === 'dead'
  if (!hostDead && !guestDead) return
  state.status = 'completed'
  state.finishedAt = new Date(nowMs).toISOString()
  if (hostDead && guestDead) {
    state.winnerPlayerId = null
    state.loserPlayerId = null
    state.resultReason = 'simultaneous-knockout'
  } else {
    state.winnerPlayerId = hostDead ? guest.playerId : host.playerId
    state.loserPlayerId = hostDead ? host.playerId : guest.playerId
    state.resultReason = 'knockout'
  }
}

function finishExpiredDisconnect(state: PvPAuthorityState, nowMs: number): boolean {
  if (state.status === 'completed') return true
  const disconnected = state.participants.filter(
    (participant) =>
      !participant.connected &&
      participant.disconnectedAtMs !== null &&
      nowMs - participant.disconnectedAtMs >= PVP_RECONNECT_GRACE_MS,
  )
  if (disconnected.length === 0) return false
  if (disconnected.length === 2) {
    state.status = 'completed'
    state.finishedAt = new Date(nowMs).toISOString()
    state.winnerPlayerId = null
    state.loserPlayerId = null
    state.resultReason = 'double-forfeit'
    return true
  }
  const loser = disconnected[0]
  const winner = state.participants.find((participant) => participant.playerId !== loser.playerId)!
  state.status = 'completed'
  state.finishedAt = new Date(nowMs).toISOString()
  state.winnerPlayerId = winner.playerId
  state.loserPlayerId = loser.playerId
  state.resultReason = 'forfeit'
  return true
}

export function advancePvPAuthority(
  source: PvPAuthorityState,
  frames: PvPInputFrame[],
  deltaMs = PVP_FIXED_TICK_MS,
  nowMs = source.elapsedMs + deltaMs,
): PvPAuthorityState {
  const state: PvPAuthorityState = {
    ...source,
    participants: [
      cloneParticipant(source.participants[0]),
      cloneParticipant(source.participants[1]),
    ],
  }
  if (state.status === 'completed') return state
  ingestFrames(state, frames, nowMs)
  if (finishExpiredDisconnect(state, nowMs)) {
    state.stateHash = hashPvPAuthorityState(state)
    return state
  }

  state.status = state.participants.every((participant) => participant.connected)
    ? 'active'
    : 'reconnecting'
  if (deltaMs < PVP_FIXED_TICK_MS) {
    state.stateHash = hashPvPAuthorityState(state)
    return state
  }
  state.tick += 1
  state.elapsedMs += deltaMs
  state.lastAdvancedAtMs = nowMs

  const combos = state.participants.map(hydrateCombo) as [ComboState, ComboState]
  const skills = state.participants.map(hydrateSkill) as [SkillState, SkillState]
  for (const participant of state.participants) {
    tickEntityTimers(participant.entity, deltaMs, state.elapsedMs)
  }

  processAction(state.participants[0], state.participants[1], combos[0], skills[0], state.elapsedMs)
  processAction(state.participants[1], state.participants[0], combos[1], skills[1], state.elapsedMs)

  const intents = [
    ...collectParticipantIntents(
      state.participants[0],
      state.participants[1],
      combos[0],
      skills[0],
      deltaMs,
      state.elapsedMs,
    ),
    ...collectParticipantIntents(
      state.participants[1],
      state.participants[0],
      combos[1],
      skills[1],
      deltaMs,
      state.elapsedMs,
    ),
  ]
  applyIntents(state, intents)
  stepSummons(state, deltaMs)
  finishIfNeeded(state, nowMs)

  state.participants[0].combo = serializeCombo(combos[0])
  state.participants[1].combo = serializeCombo(combos[1])
  state.participants[0].skill = serializeSkill(skills[0])
  state.participants[1].skill = serializeSkill(skills[1])
  state.stateHash = hashPvPAuthorityState(state)
  return state
}

export function markPvPParticipantDisconnected(
  source: PvPAuthorityState,
  playerId: string,
  nowMs: number,
): PvPAuthorityState {
  const state = advancePvPAuthority(source, [], 0, nowMs)
  const participant = state.participants.find((entry) => entry.playerId === playerId)
  if (!participant || state.status === 'completed') return state
  participant.connected = false
  participant.disconnectedAtMs = nowMs
  state.status = 'reconnecting'
  state.stateHash = hashPvPAuthorityState(state)
  return state
}

export function markPvPParticipantConnected(
  source: PvPAuthorityState,
  playerId: string,
  nowMs: number,
): PvPAuthorityState {
  const state: PvPAuthorityState = {
    ...source,
    participants: [
      cloneParticipant(source.participants[0]),
      cloneParticipant(source.participants[1]),
    ],
  }
  const participant = state.participants.find((entry) => entry.playerId === playerId)
  if (!participant || state.status === 'completed') return state
  participant.connected = true
  participant.disconnectedAtMs = null
  participant.lastSeenAtMs = nowMs
  state.status = state.participants.every((entry) => entry.connected) ? 'active' : 'reconnecting'
  state.stateHash = hashPvPAuthorityState(state)
  return state
}

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function hashableEntity(entity: RealtimeBattleEntity): unknown {
  return {
    id: entity.id,
    entityType: entity.entityType,
    characterId: entity.characterId,
    controllerId: entity.controllerId,
    enemyId: entity.enemyId,
    x: rounded(entity.position.x),
    y: rounded(entity.position.y),
    vx: rounded(entity.velocity.x),
    vy: rounded(entity.velocity.y),
    facing: entity.facing,
    combatFacing: entity.combatFacing,
    state: entity.state,
    hp: entity.hp,
    maxHp: entity.maxHp,
    atk: entity.atk,
    def: entity.def,
    speed: entity.speed,
    attackCooldown: entity.attackCooldownRemainingMs,
    skillCooldowns: {
      skill1: entity.skillCooldownsMs.skill1,
      skill2: entity.skillCooldownsMs.skill2,
      skill3: entity.skillCooldownsMs.skill3,
    },
    ultimateGauge: entity.ultimateGauge,
    invulnerableUntilMs: entity.invulnerableUntilMs,
    hitStunRemainingMs: entity.hitStunRemainingMs,
    knockdownRemainingMs: entity.knockdownRemainingMs,
    getUpRemainingMs: entity.getUpRemainingMs,
    combatTier: entity.combatTier,
    activeBuffs: entity.activeBuffs ?? [],
    activeCc: entity.activeCc ?? [],
  }
}

export function hashPvPAuthorityState(state: PvPAuthorityState): string {
  const canonical = JSON.stringify({
    matchId: state.matchId,
    tick: state.tick,
    elapsedMs: state.elapsedMs,
    status: state.status,
    winner: state.winnerPlayerId,
    loser: state.loserPlayerId,
    reason: state.resultReason,
    finishedAt: state.finishedAt,
    rngSeed: state.rngSeed,
    participants: state.participants.map((participant) => ({
      playerId: participant.playerId,
      sequence: participant.lastProcessedSequence,
      connected: participant.connected,
      disconnectedAtMs: participant.disconnectedAtMs,
      entity: hashableEntity(participant.entity),
      summons: participant.summons
        .toSorted((left, right) => left.id.localeCompare(right.id))
        .map(hashableEntity),
      combo: participant.combo,
      skill: participant.skill,
      latestInput: participant.latestInput,
      pendingActions: participant.pendingActions,
    })),
  })
  let hash = 0x811c9dc5
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function toRealtimePvPResult(state: PvPAuthorityState): RealtimePvPResult | null {
  if (state.status !== 'completed' || !state.resultReason || !state.finishedAt) return null
  return {
    matchId: state.matchId,
    participants: [state.participants[0].playerId, state.participants[1].playerId],
    winnerPlayerId: state.winnerPlayerId,
    loserPlayerId: state.loserPlayerId,
    reason: state.resultReason,
    finalStateHash: state.stateHash,
    elapsedMs: state.elapsedMs,
    finishedAt: state.finishedAt,
  }
}

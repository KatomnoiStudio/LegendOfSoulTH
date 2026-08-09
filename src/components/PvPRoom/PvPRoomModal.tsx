import { useMemo, useState } from 'react'
import { getCharacter } from '../../game/characters'
import { getRealtimeStage } from '../../game/realtimeBattle/stageConfig'
import type { Player } from '../../types/player'
import { useModalA11y } from '../../hooks/useModalA11y'
import { usePvPRoom } from '../../hooks/usePvPRoom'
import { BattleJoystick } from '../BattleScene/BattleJoystick'
import styles from './PvPRoomModal.module.css'

interface PvPRoomModalProps {
  player: Player
  onClose: () => void
}

function healthPercent(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0
  return Math.max(0, Math.min(100, (hp / maxHp) * 100))
}

export function PvPRoomModal({ player, onClose }: PvPRoomModalProps) {
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onClose)
  const controller = usePvPRoom(player)
  const heroes = useMemo(
    () =>
      player.ownedCharacters.flatMap((owned) => {
        const character = getCharacter(owned.characterId)
        return character ? [{ id: character.id, name: character.name }] : []
      }),
    [player.ownedCharacters],
  )
  const defaultHeroId =
    player.teamSlots.find((heroId): heroId is string => heroId !== null) ?? heroes[0]?.id ?? ''
  const [heroId, setHeroId] = useState(defaultHeroId)
  const [roomCode, setRoomCode] = useState('')

  const authority = controller.state
  const local = authority?.participants.find((participant) => participant.playerId === player.id)
  const opponent = authority?.participants.find((participant) => participant.playerId !== player.id)
  const stage = authority ? getRealtimeStage(authority.stageId) : null
  const stageWidth = stage?.width ?? 1600
  const stageHeight = stage?.height ?? 900

  return (
    <div className={styles.backdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="ห้อง PvP 1 ต่อ 1"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>P12 PRIVATE PROTOTYPE</p>
            <h2>ห้อง PvP 1 ต่อ 1</h2>
          </div>
          <span className={controller.connected ? styles.online : styles.offline}>
            {controller.connected ? 'Realtime เชื่อมต่อ' : 'กำลังเชื่อมต่อ'}
          </span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </header>

        {!controller.room ? (
          <section className={styles.setup}>
            <label>
              ฮีโร่
              <select value={heroId} onChange={(event) => setHeroId(event.target.value)}>
                {heroes.map((hero) => (
                  <option key={hero.id} value={hero.id}>
                    {hero.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.primary}
              disabled={controller.busy || !heroId}
              onClick={() => void controller.createRoom(heroId)}
            >
              สร้างห้องใหม่
            </button>
            <div className={styles.divider}>หรือเข้าด้วยรหัส</div>
            <label>
              รหัสห้อง 6 ตัว
              <input
                value={roomCode}
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, ''))
                }
              />
            </label>
            <button
              type="button"
              className={styles.secondary}
              disabled={controller.busy || roomCode.length !== 6 || !heroId}
              onClick={() => void controller.joinRoom(roomCode, heroId)}
            >
              เข้าห้อง
            </button>
          </section>
        ) : null}

        {controller.room && !authority ? (
          <section className={styles.waiting} aria-live="polite">
            <p>รหัสห้อง</p>
            <strong>{controller.room.roomCode}</strong>
            <span>
              {controller.room.status === 'waiting'
                ? 'รอผู้เล่นคนที่สองเข้าห้อง…'
                : 'ผู้เล่นครบแล้ว กำลังเริ่ม authority…'}
            </span>
          </section>
        ) : null}

        {authority && local && opponent ? (
          <section className={styles.match} aria-label="สถานะการต่อสู้ PvP">
            <div className={styles.scoreboard}>
              {[local, opponent].map((participant) => (
                <div key={participant.playerId} className={styles.fighterCard}>
                  <span>{getCharacter(participant.heroId)?.name ?? participant.heroId}</span>
                  <div className={styles.healthTrack}>
                    <div
                      className={styles.healthFill}
                      style={{
                        width: `${healthPercent(participant.entity.hp, participant.entity.maxHp)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {participant.entity.hp}/{participant.entity.maxHp}
                  </small>
                </div>
              ))}
            </div>

            <div className={styles.arena} aria-label="สนามต่อสู้แบบ authority">
              {authority.participants.map((participant) => (
                <div
                  key={participant.playerId}
                  className={
                    participant.playerId === player.id ? styles.localFighter : styles.remoteFighter
                  }
                  style={{
                    left: `${(participant.entity.position.x / stageWidth) * 100}%`,
                    top: `${(participant.entity.position.y / stageHeight) * 100}%`,
                  }}
                >
                  {getCharacter(participant.heroId)?.name.slice(0, 2) ?? 'P'}
                </div>
              ))}
              <span className={styles.hash}>
                tick {authority.tick} · {authority.stateHash}
              </span>
            </div>

            {authority.status === 'reconnecting' ? (
              <p className={styles.reconnecting} role="status" aria-live="polite">
                {!opponent.connected
                  ? 'คู่ต่อสู้ขาดการเชื่อมต่อ — รอกลับเข้าห้องภายใน 10 วินาที'
                  : 'การเชื่อมต่อของคุณสะดุด — กำลังกลับเข้าห้อง'}
              </p>
            ) : null}

            {authority.status !== 'completed' ? (
              <div className={styles.controls}>
                <BattleJoystick onChange={controller.setMovement} />
                <div className={styles.actions}>
                  <button type="button" onClick={controller.pressAttack}>
                    ATK
                  </button>
                  <button type="button" onClick={() => controller.pressSkill('skill1')}>
                    S1
                  </button>
                  <button type="button" onClick={() => controller.pressSkill('skill2')}>
                    S2
                  </button>
                  <button type="button" onClick={() => controller.pressSkill('skill3')}>
                    S3
                  </button>
                  <button type="button" onClick={() => controller.pressSkill('ultimate')}>
                    ULT
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.result} role="status">
                {controller.result?.winnerPlayerId === player.id
                  ? 'ชนะ'
                  : controller.result?.winnerPlayerId
                    ? 'แพ้'
                    : 'เสมอ'}
                <small>ผลยืนยันโดย server authority · {authority.resultReason}</small>
              </div>
            )}
          </section>
        ) : null}

        {controller.error ? (
          <p className={styles.error} role="alert">
            {controller.error}
          </p>
        ) : null}
        <footer>ไม่มี Matchmaking · Rank · MMR · รางวัล ใน P12</footer>
      </div>
    </div>
  )
}

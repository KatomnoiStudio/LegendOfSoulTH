import type { CSSProperties } from 'react'
import type { Combatant } from '../../game/battle/types'
import type { ActionKind } from '../../game/battle/types'
import { publicUrl } from '../../lib/publicUrl'
import styles from './BattleScene.module.css'

// url('/ui/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_TEMPLE_STYLE: CSSProperties = {
  ['--bg-temple' as string]: `url(${publicUrl('ui/thai/thai-temple-lobby.webp')})`,
}

function HpBar({ unit }: { unit: Combatant }) {
  const ratio = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0
  return (
    <div className={styles.hpWrap}>
      <div className={styles.hpTrack}>
        <div
          className={styles.hpFill}
          style={{
            width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
            background: unit.accent,
          }}
        />
      </div>
      <span className={styles.hpText}>
        {unit.hp}/{unit.maxHp}
      </span>
    </div>
  )
}

function UnitCard({
  unit,
  active,
  selectable,
  onSelect,
}: {
  unit: Combatant
  active: boolean
  selectable: boolean
  onSelect?: () => void
}) {
  const defeated = unit.hp <= 0
  return (
    <button
      type="button"
      className={styles.unitCard}
      data-active={active}
      data-defeated={defeated}
      data-selectable={selectable}
      disabled={!selectable || defeated}
      onClick={onSelect}
    >
      <img src={unit.spriteUrl} alt="" className={styles.unitSprite} draggable={false} />
      <span className={styles.unitName}>{unit.name}</span>
      <HpBar unit={unit} />
      {unit.defending ? <span className={styles.defendTag}>ป้องกัน</span> : null}
    </button>
  )
}

interface BattleSceneProps {
  snapshot: import('../../game/battle/types').BattleSnapshot
  activeUnit: Combatant | null
  pendingKind: ActionKind | null
  validTargetIds: string[]
  skill?: { name: string; description: string }
  onAttack: () => void
  onDefend: () => void
  onSkill: () => void
  onSelectTarget: (targetId: string) => void
  onCancelTarget: () => void
  onExit: () => void
}

export function BattleScene({
  snapshot,
  activeUnit,
  pendingKind,
  validTargetIds,
  skill,
  onAttack,
  onDefend,
  onSkill,
  onSelectTarget,
  onCancelTarget,
  onExit,
}: BattleSceneProps) {
  const isPlayerTurn = activeUnit?.isAlly && snapshot.phase === 'awaiting_input'
  const finished = snapshot.phase === 'victory' || snapshot.phase === 'defeat'
  const targetSet = new Set(validTargetIds)

  return (
    <div className={styles.scene} role="dialog" aria-label="ฉากต่อสู้" style={BG_TEMPLE_STYLE}>
      <header className={styles.header}>
        <span className={styles.stageName}>{snapshot.stageName}</span>
        <span className={styles.round}>รอบ {snapshot.round}</span>
      </header>

      <div className={styles.field}>
        <div className={styles.row}>
          <h2 className={styles.rowTitle}>พันธมิตร</h2>
          <div className={styles.unitRow}>
            {snapshot.allies.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                active={unit.id === snapshot.activeUnitId}
                selectable={Boolean(pendingKind && targetSet.has(unit.id))}
                onSelect={() => onSelectTarget(unit.id)}
              />
            ))}
          </div>
        </div>

        <div className={styles.vs}>VS</div>

        <div className={styles.row}>
          <h2 className={styles.rowTitle}>ศัตรู</h2>
          <div className={styles.unitRow}>
            {snapshot.enemies.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                active={unit.id === snapshot.activeUnitId}
                selectable={Boolean(pendingKind && targetSet.has(unit.id))}
                onSelect={() => onSelectTarget(unit.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.log} aria-live="polite">
        {snapshot.log.slice(-4).map((entry) => (
          <p key={entry.id} data-tone={entry.tone}>
            {entry.text}
          </p>
        ))}
      </div>

      {finished ? (
        <div className={styles.result}>
          <strong>{snapshot.phase === 'victory' ? 'ชนะ!' : 'แพ้...'}</strong>
          <button type="button" className={styles.exitBtn} onClick={onExit}>
            กลับ
          </button>
        </div>
      ) : (
        <footer className={styles.actions}>
          {pendingKind ? (
            <>
              <span className={styles.prompt}>เลือกเป้าหมาย</span>
              <button type="button" className={styles.cancelBtn} onClick={onCancelTarget}>
                ยกเลิก
              </button>
            </>
          ) : isPlayerTurn ? (
            <>
              <button type="button" className={styles.actionBtn} onClick={onAttack}>
                โจมตี
              </button>
              <button type="button" className={styles.actionBtn} onClick={onDefend}>
                ป้องกัน
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={onSkill}
                disabled={!skill}
                title={skill?.description}
              >
                {skill?.name ?? 'สกิล'}
              </button>
            </>
          ) : (
            <span className={styles.waiting}>รอเทิร์นศัตรู…</span>
          )}
        </footer>
      )}
    </div>
  )
}

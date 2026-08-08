import { useMemo } from 'react'
import { useModalA11y } from '../../hooks/useModalA11y'
import { playSfx } from '../../lib/audio/AudioEngine'
import {
  canAffordStageEnergy,
  normalizeEnergy,
  tickEnergyRegen,
} from '../../game/adventure/energySystem'
import {
  formatStageLabel,
  getAdventureChapters,
  isStageUnlocked,
  STAGE_TYPE_LABELS,
  type RealtimeBattleStage,
} from '../../game/realtimeBattle/stageConfig'
import type { PlayerProgress } from '../../types/player'
import styles from './StageSelect.module.css'

interface StageSelectProps {
  progress: PlayerProgress
  onSelect: (stageId: string) => void
  onClose: () => void
}

function stageMetaLine(
  stage: RealtimeBattleStage,
  cleared: boolean,
  unlocked: boolean,
  affordable: boolean,
) {
  const parts = [STAGE_TYPE_LABELS[stage.stageType]]
  if (stage.isBoss) parts.push('บอส')
  if (cleared) parts.push('ผ่านแล้ว')
  if (!unlocked) parts.push('ล็อกอยู่')
  if (unlocked && !affordable) parts.push('พลังงานไม่พอ')
  return parts.join(' · ')
}

/**
 * หน้าเลือกด่านเนื้อเรื่อง — เรนเดอร์จาก `stageConfig.ts` + `ADVENTURE_CHAPTERS`
 * กดด่านแล้ว LobbyBattleSession ค่อย mount BattleScene (ไม่เข้าสนามต่อสู้ตรง)
 */
export function StageSelect({ progress, onSelect, onClose }: StageSelectProps) {
  const { shellRef, backdropProps } = useModalA11y<HTMLDivElement>(onClose)

  const chapters = useMemo(() => getAdventureChapters(), [])
  const energy = useMemo(() => tickEnergyRegen(normalizeEnergy(progress.energy)), [progress.energy])

  const handlePick = (stage: RealtimeBattleStage) => {
    void playSfx('buttonClick')
    onSelect(stage.id)
  }

  return (
    <div className={styles.backdrop} {...backdropProps}>
      <div
        ref={shellRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="เลือกด่าน"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.headerTitle}>เลือกด่าน</h2>
            <p className={styles.headerHint}>เลือกด่านแล้วเข้าสนามต่อสู้</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="ปิด">
            ×
          </button>
        </header>

        <section className={styles.panel}>
          {chapters.map(({ chapterId, title, subtitle, stages }) => (
            <article key={chapterId} className={styles.chapter}>
              <header className={styles.chapterHeader}>
                <h3 className={styles.chapterTitle}>{title}</h3>
                {subtitle ? <p className={styles.chapterSubtitle}>{subtitle}</p> : null}
              </header>
              <ul className={styles.list}>
                {stages.map((stage) => {
                  const unlocked = isStageUnlocked(stage.id, progress.flags)
                  const affordable = canAffordStageEnergy(energy, stage)
                  const cleared = progress.flags[`trial_cleared_${stage.id}`] === true
                  const selectable = unlocked && affordable
                  const label = formatStageLabel(stage)
                  return (
                    <li key={stage.id}>
                      <button
                        type="button"
                        className={styles.stage}
                        disabled={!selectable}
                        onClick={() => handlePick(stage)}
                      >
                        <span className={styles.stageRow}>
                          <span className={styles.stageLabel}>{label}</span>
                          <span className={styles.stageName}>{stage.name}</span>
                        </span>
                        <span className={styles.stageMeta}>
                          {stageMetaLine(stage, cleared, unlocked, affordable)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}

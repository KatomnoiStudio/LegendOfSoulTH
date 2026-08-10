import { useMemo } from 'react'
import type { Player } from '../../types/player'
import type { SkillSlotId } from '../../game/progression/progressionSchema'
import { progressionConfig } from '../../game/progression/progressionConfig'
import { buildHeroProgressionViewModel } from '../../game/progression/progressionViewModel'
import { planUpgrade, type UpgradeTarget } from '../../game/progression/progressionUpgradeRequest'
import type { ProgressionUpgradeRequest } from '../../data/accountRepository.supabase'
import { reportError } from '../../lib/errors/reportError'
import type { ErrorCode } from '../../lib/errors/codes'
import { clampRatio, formatNumber } from '../../lib/format'
import { useToast } from '../Toast/useToast'
import styles from './HeroProgressionPanel.module.css'

interface HeroProgressionPanelProps {
  player: Player
  heroId: string
  /**
   * ยิง RPC `spend_progression_upgrade` — หักทองและเขียนผลพร้อมกันฝั่งเซิร์ฟเวอร์
   *
   * เดิมพร็อพนี้เป็น `onPlayerChange` แล้วไฟล์นี้คำนวณผลอัปเกรดเองในหน่วยความจำ ก่อนส่งไป
   * savePlayer — ซึ่งเขียน "ผล" ลงได้แต่เขียน "ค่าใช้จ่าย" ไม่ได้ (ทองถูก column-lock) จึงกลาย
   * เป็นอัปเกรดฟรีไม่จำกัด (task #26/#35) ตอนนี้ทั้งสองฝั่งอยู่ใน transaction เดียวของเซิร์ฟเวอร์
   */
  onUpgrade: (request: ProgressionUpgradeRequest) => Promise<{ ok: boolean; error?: string }>
}

export function HeroProgressionPanel({ player, heroId, onUpgrade }: HeroProgressionPanelProps) {
  const { showToast } = useToast()
  const viewModel = useMemo(() => buildHeroProgressionViewModel(player, heroId), [player, heroId])

  if (!viewModel) return null

  const expRatio = clampRatio(viewModel.currentExp, viewModel.expToNext)

  /*
    ทุกทางที่พังในไฟล์นี้เคยลงเอยที่ toast อย่างเดียว

    ผลคือการอัปสกิล/พรสวรรค์/ปลุกพลังที่ถูกปฏิเสธ — ซึ่งกินทรัพยากรของผู้เล่นจริง — มองไม่เห็น
    จากฝั่งเราเลยแม้แต่ครั้งเดียว ทั้งกรณีกติกาปฏิเสธและกรณีบันทึกไม่ลง
  */
  /**
   * ประกอบคำขอ → ยิง RPC → แจ้งผล
   *
   * ราคาไม่เดินทางไปกับคำขอ เซิร์ฟเวอร์อ่านจากตารางของตัวเอง และเป็นคนตัดสินว่าอัปได้ไหม
   * ที่นี่ปฏิเสธล่วงหน้าได้เฉพาะกรณีที่ประกอบคำขอไม่ขึ้นจริง ๆ (ไม่มีตารางอัปเกรด, ถึง MAX,
   * ราคามีวัสดุซึ่งยังไม่รองรับ) — ประหยัดหนึ่ง round trip เท่านั้น ไม่ใช่ชั้นความปลอดภัย
   */
  async function runUpgrade(target: UpgradeTarget, code: ErrorCode, successMessage: string) {
    const plan = planUpgrade(player, heroId, target)
    if (!plan.ok) {
      reportError(code, 'silent', plan.error, { heroId })
      showToast(plan.error)
      return
    }

    const result = await onUpgrade({
      requestId: crypto.randomUUID(),
      characterId: plan.characterId,
      kind: plan.kind,
      upgradeKey: plan.upgradeKey,
      fromLevel: plan.fromLevel,
    })

    if (!result.ok) {
      reportError(code, 'silent', result.error, { heroId })
      showToast(result.error ?? 'อัปเกรดไม่สำเร็จ')
      return
    }
    showToast(successMessage)
  }

  async function handleSkillUpgrade(slot: SkillSlotId) {
    await runUpgrade(
      { kind: 'skill', slot },
      'HERO_SKILL_UPGRADE_REJECTED',
      `${viewModel?.heroName} — ${slot} อัปเกรดแล้ว`,
    )
  }

  async function handleTalentUnlock(nodeId: string) {
    await runUpgrade(
      { kind: 'talent', nodeId },
      'HERO_TALENT_UNLOCK_REJECTED',
      'ปลดล็อกพรสวรรค์แล้ว',
    )
  }

  async function handleAwakening() {
    await runUpgrade({ kind: 'awakening' }, 'HERO_AWAKENING_REJECTED', 'ปลุกพลังสำเร็จ')
  }

  return (
    <div className={styles.panel}>
      {viewModel.nonProductionBalance ? (
        <p className={styles.balanceNote}>NON-PRODUCTION BALANCE — ตัวเลขทดสอบเท่านั้น</p>
      ) : null}

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>เลเวล / EXP</h4>
        <div className={styles.expHead}>
          <span>Lv.{viewModel.level}</span>
          <span>
            {viewModel.atMaxLevel
              ? 'MAX'
              : `${formatNumber(viewModel.currentExp)} / ${formatNumber(viewModel.expToNext)}`}
          </span>
        </div>
        <div
          className={styles.expTrack}
          role="progressbar"
          aria-label={`EXP ${viewModel.heroName}`}
          aria-valuemin={0}
          aria-valuemax={viewModel.atMaxLevel ? 1 : viewModel.expToNext}
          aria-valuenow={viewModel.atMaxLevel ? viewModel.expToNext : viewModel.currentExp}
        >
          <div
            className={styles.expFill}
            style={{ width: `${(viewModel.atMaxLevel ? 1 : expRatio) * 100}%` }}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>ค่าสถานะ (จากเลเวล)</h4>
        <dl className={styles.statGrid}>
          <div>
            <dt>HP</dt>
            <dd>{formatNumber(viewModel.stats.hp)}</dd>
          </div>
          <div>
            <dt>ATK</dt>
            <dd>{formatNumber(viewModel.stats.atk)}</dd>
          </div>
          <div>
            <dt>DEF</dt>
            <dd>{formatNumber(viewModel.stats.def)}</dd>
          </div>
          <div>
            <dt>SPD</dt>
            <dd>{formatNumber(viewModel.stats.spd)}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>สกิล</h4>
        <ul className={styles.skillList}>
          {viewModel.skills.map((skill) => (
            <li key={skill.skillSlot} className={styles.skillRow}>
              <div className={styles.skillInfo}>
                <span className={styles.skillName}>{skill.skillName}</span>
                <span className={styles.skillLevel}>
                  Lv.{skill.currentLevel}
                  {skill.nextLevel ? ` → ${skill.nextLevel}` : ' (MAX)'}
                </span>
                <span className={styles.skillCost}>{skill.costLabel}</span>
              </div>
              <button
                type="button"
                className={styles.upgradeBtn}
                disabled={!skill.canUpgrade}
                onClick={() => handleSkillUpgrade(skill.skillSlot)}
              >
                {skill.reason === 'MAX' ? 'MAX' : 'อัปเกรด'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {progressionConfig.showTalentAwakeningUi && viewModel.talentNodes.length > 0 ? (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>พรสวรรค์</h4>
          <ul className={styles.talentList}>
            {viewModel.talentNodes.map((node) => (
              <li key={node.id} className={styles.talentRow}>
                <span className={node.unlocked ? styles.unlocked : styles.locked}>{node.name}</span>
                <span className={styles.skillCost}>{node.costLabel}</span>
                <button
                  type="button"
                  className={styles.upgradeBtn}
                  disabled={!node.canUnlock}
                  onClick={() => handleTalentUnlock(node.id)}
                >
                  {node.unlocked ? 'ปลดแล้ว' : 'ปลดล็อก'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {progressionConfig.showTalentAwakeningUi ? (
        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>ปลุกพลัง</h4>
          <p className={styles.awakeningSummary}>
            {viewModel.awakening.summary}
            {viewModel.awakening.tier >= viewModel.awakening.maxTier ? '' : ' (TBD content)'}
          </p>
          <button
            type="button"
            className={styles.upgradeBtn}
            disabled={!viewModel.awakening.canAdvance}
            onClick={handleAwakening}
          >
            {viewModel.awakening.tier >= viewModel.awakening.maxTier ? 'MAX' : 'ปลุกขั้นถัดไป'}
          </button>
        </section>
      ) : null}
    </div>
  )
}

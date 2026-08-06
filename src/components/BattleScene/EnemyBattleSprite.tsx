import { getEnemyTemplate } from '../../game/realtimeBattle/stageConfig'
import type { RealtimeBattleRuntime } from '../../game/realtimeBattle/RealtimeBattleRuntime'
import type { RealtimeBattleEntity } from '../../game/realtimeBattle/types'
import { EntitySprite } from './EntitySprite'

/** ศัตรูหนึ่งตัวในห้องต่อสู้ — ชุดเฟรมและสีประจำตัวมาจากแม่แบบใน stageConfig */
export function EnemyBattleSprite({
  runtime,
  enemy,
}: {
  runtime: RealtimeBattleRuntime
  enemy: RealtimeBattleEntity
}) {
  const template = enemy.enemyId ? getEnemyTemplate(enemy.enemyId) : null
  if (!template) return null

  return (
    <EntitySprite
      runtime={runtime}
      entityId={enemy.id}
      kind={template.spriteKind}
      accent={template.accent}
    />
  )
}

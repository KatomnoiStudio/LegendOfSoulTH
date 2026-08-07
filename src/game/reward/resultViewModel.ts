import { formatDurationMs } from '../../lib/format'
import { getItem } from '../items'
import type { DungeonDefinition } from '../dungeon/dungeonSchema'
import type {
  DungeonResult,
  ResolvedReward,
  ResultViewModel,
  RewardDisplayEntry,
} from './rewardSchema'

function formatRewardEntry(
  entry: RewardDisplayEntry['kind'],
  label: string,
  value: number,
): RewardDisplayEntry {
  return {
    kind: entry,
    label,
    amount: entry === 'item' ? `×${value}` : `+${value}`,
  }
}

export function buildRewardDisplayEntries(resolved: ResolvedReward): RewardDisplayEntry[] {
  return resolved.entries.map((entry) => {
    switch (entry.type) {
      case 'currency':
        return formatRewardEntry(
          'currency',
          entry.currencyId === 'gold' ? 'ทอง' : entry.currencyId,
          entry.amount,
        )
      case 'item': {
        const item = getItem(entry.itemId)
        return formatRewardEntry('item', item?.name ?? entry.itemId, entry.quantity)
      }
      case 'heroExp':
        return formatRewardEntry('heroExp', 'Hero EXP', entry.amount)
      case 'accountExp':
        return formatRewardEntry('accountExp', 'EXP', entry.amount)
      case 'resource':
        return formatRewardEntry('resource', entry.resourceId, entry.amount)
      default:
        return { kind: 'currency', label: 'Unknown', amount: '0' }
    }
  })
}

const FAILURE_LABELS: Record<string, string> = {
  playerDefeated: 'ผู้เล่นพ่ายแพ้',
  objectiveFailed: 'วัตถุประสงค์ล้มเหลว',
  timeout: 'หมดเวลา',
  targetEscaped: 'เป้าหมายหลุดรอด',
  aborted: 'ยกเลิกการเล่น',
  invalidState: 'สถานะไม่ถูกต้อง',
}

export function buildResultViewModel(
  result: DungeonResult,
  dungeon: DungeonDefinition,
  resolved: ResolvedReward | null,
  grantSuccess: boolean,
  nonProductionBalance: boolean,
): ResultViewModel {
  const stagesCleared = result.stageResults.filter((s) => s.success).length
  const stageSummary = result.stageResults.map((sr) => {
    const def = dungeon.stages.find((s) => s.id === sr.stageId)
    return {
      stageId: sr.stageId,
      stageName: def?.name ?? sr.stageId,
      success: sr.success,
      clearTimeLabel: formatDurationMs(sr.clearTimeMs),
    }
  })

  const rewards = resolved ? buildRewardDisplayEntries(resolved) : []

  return {
    status: result.success ? 'clear' : 'failed',
    dungeonName: dungeon.metadata?.name ?? result.dungeonId,
    clearTimeLabel: formatDurationMs(result.clearTimeMs),
    stagesCleared,
    stagesTotal: dungeon.stages.length,
    stageSummary,
    rewards,
    failureLabel: result.failureReason
      ? (FAILURE_LABELS[result.failureReason] ?? result.failureReason)
      : undefined,
    canContinue: grantSuccess || !result.success,
    nonProductionBalance,
  }
}

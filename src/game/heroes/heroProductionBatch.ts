import type { HeroArchetype } from './heroArchetypes'

/** สถานะ pipeline ต่อ deliverable — ทีมภาพ/เสียงอัปเดตเมื่อ asset พร้อม */
export type PipelineAssetStatus = 'production' | 'placeholder' | 'pending'

export interface HeroPipelineChecklist {
  gameplayIdentity: PipelineAssetStatus
  basicCombo3Hit: PipelineAssetStatus
  skillsS1S2S3Ult: PipelineAssetStatus
  finisherTable: PipelineAssetStatus
  perMoveProperties: PipelineAssetStatus
  productionSprite: PipelineAssetStatus
  portraitIcon: PipelineAssetStatus
  vfxSfx: PipelineAssetStatus
  gachaData: PipelineAssetStatus
  starScaling: PipelineAssetStatus
  behaviorTests: PipelineAssetStatus
  mobilePlaytest: PipelineAssetStatus
}

export interface ProductionBatchHero {
  characterId: string
  archetype: HeroArchetype
  batchId: 'batch-01'
  /** ชื่อแสดงสำหรับทีมภาพ */
  productionName: string
  checklist: HeroPipelineChecklist
}

/** Production Batch แรก — 5 archetype หลัก (P10) ก่อนขยาย 10 → 20 → 50 */
export const PRODUCTION_BATCH_01: ProductionBatchHero[] = [
  {
    characterId: 'monkey-king',
    archetype: 'fighter',
    batchId: 'batch-01',
    productionName: 'ซุนหงอคง',
    checklist: {
      gameplayIdentity: 'production',
      basicCombo3Hit: 'production',
      skillsS1S2S3Ult: 'production',
      finisherTable: 'production',
      perMoveProperties: 'production',
      productionSprite: 'production',
      portraitIcon: 'production',
      vfxSfx: 'placeholder',
      gachaData: 'production',
      starScaling: 'production',
      behaviorTests: 'production',
      mobilePlaytest: 'pending',
    },
  },
  {
    characterId: 'pig-warrior',
    archetype: 'heavy',
    batchId: 'batch-01',
    productionName: 'ตือโป๊ยก่าย',
    checklist: {
      gameplayIdentity: 'production',
      basicCombo3Hit: 'production',
      skillsS1S2S3Ult: 'production',
      finisherTable: 'production',
      perMoveProperties: 'production',
      productionSprite: 'production',
      portraitIcon: 'production',
      vfxSfx: 'placeholder',
      gachaData: 'production',
      starScaling: 'production',
      behaviorTests: 'production',
      mobilePlaytest: 'pending',
    },
  },
  {
    characterId: 'celestial-archer',
    archetype: 'ranged',
    batchId: 'batch-01',
    productionName: 'จือหลาง',
    checklist: {
      gameplayIdentity: 'production',
      basicCombo3Hit: 'production',
      skillsS1S2S3Ult: 'production',
      finisherTable: 'production',
      perMoveProperties: 'production',
      productionSprite: 'placeholder',
      portraitIcon: 'placeholder',
      vfxSfx: 'pending',
      gachaData: 'production',
      starScaling: 'production',
      behaviorTests: 'production',
      mobilePlaytest: 'pending',
    },
  },
  {
    characterId: 'nezha-warden',
    archetype: 'control',
    batchId: 'batch-01',
    productionName: 'นาจา',
    checklist: {
      gameplayIdentity: 'production',
      basicCombo3Hit: 'production',
      skillsS1S2S3Ult: 'production',
      finisherTable: 'production',
      perMoveProperties: 'production',
      productionSprite: 'placeholder',
      portraitIcon: 'placeholder',
      vfxSfx: 'pending',
      gachaData: 'production',
      starScaling: 'production',
      behaviorTests: 'production',
      mobilePlaytest: 'pending',
    },
  },
  {
    characterId: 'sand-sage',
    archetype: 'summoner',
    batchId: 'batch-01',
    productionName: 'ชาหวู่จิง',
    checklist: {
      gameplayIdentity: 'production',
      basicCombo3Hit: 'production',
      skillsS1S2S3Ult: 'production',
      finisherTable: 'production',
      perMoveProperties: 'production',
      productionSprite: 'placeholder',
      portraitIcon: 'placeholder',
      vfxSfx: 'pending',
      gachaData: 'production',
      starScaling: 'production',
      behaviorTests: 'production',
      mobilePlaytest: 'pending',
    },
  },
]

export const BATCH_01_CHARACTER_IDS = PRODUCTION_BATCH_01.map((hero) => hero.characterId)

export function getBatch01Hero(characterId: string): ProductionBatchHero | undefined {
  return PRODUCTION_BATCH_01.find((hero) => hero.characterId === characterId)
}

/**
 * Production exposure is stricter than "implemented": every Asset Contract item, including
 * VFX/SFX and the measured mobile playtest, must be signed off before a Hero can enter a live
 * acquisition pool.
 */
export function isHeroProductionReady(characterId: string): boolean {
  const hero = getBatch01Hero(characterId)
  return (
    hero !== undefined && Object.values(hero.checklist).every((status) => status === 'production')
  )
}

export function isBatch01Hero(characterId: string): boolean {
  return BATCH_01_CHARACTER_IDS.includes(characterId)
}

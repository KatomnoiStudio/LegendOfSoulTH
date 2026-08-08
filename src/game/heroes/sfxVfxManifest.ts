/**
 * VFX/SFX manifest สำหรับ Production Batch 01 — ทีมภาพ/เสียงเติม asset ตามรายการนี้
 *
 * path ทั้งหมด relative จาก public/ — ใช้ publicUrl() ตอน runtime
 */
export interface HeroMediaManifest {
  characterId: string
  portrait: string
  icon: string
  vfx: {
    basicHit: string | null
    skill1: string | null
    skill2: string | null
    skill3: string | null
    ultimate: string | null
  }
  sfx: {
    basicHit: string | null
    skill1: string | null
    skill2: string | null
    skill3: string | null
    ultimate: string | null
  }
}

export const BATCH_01_MEDIA_MANIFEST: HeroMediaManifest[] = [
  {
    characterId: 'monkey-king',
    portrait: 'characters/monkey-v2-idle-0.webp',
    icon: 'characters/monkey-v2-idle-0.webp',
    vfx: {
      basicHit: 'fx/spark-gold.webp',
      skill1: null,
      skill2: null,
      skill3: null,
      ultimate: null,
    },
    sfx: {
      basicHit: null,
      skill1: null,
      skill2: null,
      skill3: null,
      ultimate: null,
    },
  },
  {
    characterId: 'pig-warrior',
    portrait: 'characters/pigsy-idle-0.webp',
    icon: 'characters/pigsy-idle-0.webp',
    vfx: {
      basicHit: null,
      skill1: null,
      skill2: null,
      skill3: null,
      ultimate: null,
    },
    sfx: { basicHit: null, skill1: null, skill2: null, skill3: null, ultimate: null },
  },
  {
    characterId: 'celestial-archer',
    portrait: 'characters/tripitaka-idle-0.webp',
    icon: 'characters/tripitaka-idle-0.webp',
    vfx: {
      basicHit: null,
      skill1: null,
      skill2: null,
      skill3: null,
      ultimate: null,
    },
    sfx: { basicHit: null, skill1: null, skill2: null, skill3: null, ultimate: null },
  },
  {
    characterId: 'nezha-warden',
    portrait: 'characters/monkey-v2-idle-0.webp',
    icon: 'characters/monkey-v2-idle-0.webp',
    vfx: {
      basicHit: null,
      skill1: null,
      skill2: null,
      skill3: null,
      ultimate: null,
    },
    sfx: { basicHit: null, skill1: null, skill2: null, skill3: null, ultimate: null },
  },
  {
    characterId: 'sand-sage',
    portrait: 'characters/pigsy-idle-0.webp',
    icon: 'characters/pigsy-idle-0.webp',
    vfx: {
      basicHit: null,
      skill1: null,
      skill2: null,
      skill3: null,
      ultimate: null,
    },
    sfx: { basicHit: null, skill1: null, skill2: null, skill3: null, ultimate: null },
  },
]

export function getHeroMediaManifest(characterId: string): HeroMediaManifest | undefined {
  return BATCH_01_MEDIA_MANIFEST.find((row) => row.characterId === characterId)
}

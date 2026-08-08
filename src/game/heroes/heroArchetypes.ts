/**
 * Hero archetypes — Blueprint §4.1 / P10 Production Batch
 *
 * แต่ละ archetype ต้องมี gameplay identity ต่างกันจริง ไม่ใช่ reskin
 */

export const HERO_ARCHETYPES = [
  'fighter',
  'ranged',
  'control',
  'summoner',
  'heavy',
  'support',
] as const

export type HeroArchetype = (typeof HERO_ARCHETYPES)[number]

export const HERO_ARCHETYPE_LABEL: Record<HeroArchetype, string> = {
  fighter: 'นักรบกองหน้า',
  ranged: 'นักธนูระยะไกล',
  control: 'ผู้ควบคุมสมรภูมิ',
  summoner: 'ผู้เรียกวิญญาณ',
  heavy: 'นักรบหนัก',
  support: 'ผู้สนับสนุน',
}

/** จุดประสงค์ของ archetype ใน Production Batch — ใช้ตรวจ pipeline */
export const HERO_ARCHETYPE_PURPOSE: Record<HeroArchetype, string> = {
  fighter: 'ตัวมาตรฐานสำหรับวัด Balance',
  ranged: 'พิสูจน์ Projectile และระยะโจมตี',
  control: 'พิสูจน์ CC โดยไม่ใช้ Knockdown ผิดกติกา',
  summoner: 'พิสูจน์ Summon ที่ใช้ Enemy AI Core',
  heavy: 'พิสูจน์ Heavy Finisher',
  support: 'พิสูจน์ Self-support / Heal',
}

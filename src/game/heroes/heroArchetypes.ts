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
  'assassin',
  'berserker',
] as const

export type HeroArchetype = (typeof HERO_ARCHETYPES)[number]

export const HERO_ARCHETYPE_LABEL: Record<HeroArchetype, string> = {
  fighter: 'นักรบกองหน้า',
  ranged: 'นักธนูระยะไกล',
  control: 'ผู้ควบคุมสมรภูมิ',
  summoner: 'ผู้เรียกวิญญาณ',
  heavy: 'นักรบหนัก',
  support: 'ผู้สนับสนุน',
  assassin: 'นักลอบสังหาร',
  berserker: 'นักรบพลังบ้าคลั่ง',
}

/** จุดประสงค์ของ archetype ใน Production Batch — ใช้ตรวจ pipeline */
export const HERO_ARCHETYPE_PURPOSE: Record<HeroArchetype, string> = {
  fighter: 'ตัวมาตรฐานสำหรับวัด Balance',
  ranged: 'พิสูจน์ Projectile และระยะโจมตี',
  control: 'พิสูจน์ CC โดยไม่ใช้ Knockdown ผิดกติกา',
  summoner: 'พิสูจน์ Summon ที่ใช้ Enemy AI Core',
  heavy: 'พิสูจน์ Heavy Finisher',
  support: 'พิสูจน์ Self-support / Heal',
  // Blueprint §4.1 ระบุ Assassin ไว้ในรายชื่อ archetype เป้าหมายอยู่แล้ว (บรรทัด 388)
  // ยังไม่มีฮีโร่ตัวไหนถือจนกระทั่งเอ้อหลางเสิน — ทุกท่าล็อกศัตรูใกล้สุดตัวเดียว
  // แลกดาเมจก้อนใหญ่กับ startup ที่ยาวผิดปกติ (Skill 2 = 1450ms) ต่างจากอีกหกตัวชัดเจน
  assassin: 'พิสูจน์ Burst เป้าหมายเดียวที่แลกมาด้วย startup ยาว',
  // เพิ่มใหม่สำหรับหนุมาน (2026-08-12, HetCreep ยืนยันเพิ่ม archetype ที่ 8 แทนการ reskin)
  // ต่างจาก support ตรงที่ buff ตัวเอง ไม่ใช่ heal/buff เพื่อน — ยิ่งไฟต์ยืดยิ่งแรงขึ้น
  berserker: 'พิสูจน์ Self-buff ที่ทวีพลังขึ้นเรื่อย ๆ กลางไฟต์ ไม่ใช่การ heal/buff พรรคพวก',
}

/**
 * ดีไซน์ตัวละคร 3 ตัว (แรงบันดาลใจจากวรรณกรรมไซอิ๋ว ซึ่งอยู่ใน public domain)
 *
 * ─── นโยบายทรัพย์สินทางปัญญา ───────────────────────────────
 * ทุกสัดส่วน รูปทรง และชุดสี ในไฟล์นี้ออกแบบขึ้นใหม่ทั้งหมดจาก primitive พื้นฐาน
 * ไม่มีการอ้างอิง ลอก หรือดัดแปลงโมเดล/ภาพ/ดีไซน์จากเกม อนิเมะ หรือสื่อที่มีลิขสิทธิ์ใด ๆ
 * ชื่อที่ใช้เป็นคำบรรยายทั่วไป (Monkey King / Pig Warrior / Pilgrim Monk)
 * ไม่ใช่ชื่อเฉพาะจากผลงานที่มีลิขสิทธิ์
 * ───────────────────────────────────────────────────────────
 */

import { PartSet, buildIdleClip, buildSkeleton, prim } from './rig.mjs'

const HALF_PI = Math.PI / 2

/* ------------------------------------------------------------------ */
/* ชิ้นส่วนที่ใช้ร่วมกันทั้ง 3 ตัว                                        */
/* ------------------------------------------------------------------ */

/** แขน ขา และมือ — โครงพื้นฐานที่ทุกตัวมีเหมือนกัน ต่างแค่ความหนา */
function addLimbs(set, p, { armR, legR, handR, skinKey = 'skin', limbKey = 'primary' }) {
  set.addMirrored(
    (s) =>
      prim.box(armR * 2, p.shoulderY - p.elbowY, armR * 2, {
        pos: [s * p.shoulderX, (p.shoulderY + p.elbowY) / 2, 0],
      }),
    'UpperArm_%s',
    limbKey,
  )
  set.addMirrored(
    (s) =>
      prim.box(armR * 1.8, p.elbowY - p.handY, armR * 1.8, {
        pos: [s * p.shoulderX, (p.elbowY + p.handY) / 2, 0],
      }),
    'LowerArm_%s',
    skinKey,
  )
  set.addMirrored(
    (s) =>
      prim.box(handR * 2, handR * 2, handR * 2.2, { pos: [s * p.shoulderX, p.handY - handR, 0] }),
    'Hand_%s',
    skinKey,
  )
  set.addMirrored(
    (s) =>
      prim.box(legR * 2, p.hipsY - p.kneeY, legR * 2, {
        pos: [s * p.hipX, (p.hipsY - 0.05 + p.kneeY) / 2, 0],
      }),
    'UpperLeg_%s',
    limbKey,
  )
  set.addMirrored(
    (s) =>
      prim.box(legR * 1.8, p.kneeY - p.footY, legR * 1.8, {
        pos: [s * p.hipX, (p.kneeY + p.footY) / 2, 0],
      }),
    'LowerLeg_%s',
    limbKey,
  )
  set.addMirrored(
    (s) => prim.box(legR * 2.2, 0.1, legR * 3, { pos: [s * p.hipX, p.footY - 0.02, 0.04] }),
    'Foot_%s',
    'boot',
  )
}

/* ------------------------------------------------------------------ */
/* 1) Monkey King — ถือกระบองทอง มีหางและแถบคาดหัว                     */
/* ------------------------------------------------------------------ */

const MONKEY_PROFILE = {
  hipsY: 0.86,
  spineY: 1.02,
  chestY: 1.2,
  neckY: 1.4,
  headY: 1.52,
  shoulderY: 1.35,
  elbowY: 1.05,
  handY: 0.78,
  shoulderX: 0.26,
  hipX: 0.11,
  kneeY: 0.44,
  footY: 0.06,
}

function buildMonkeyKing() {
  const p = MONKEY_PROFILE
  const rig = buildSkeleton(p, true)
  const set = new PartSet(rig, {
    skin: { color: '#c98b5c', roughness: 0.85 },
    primary: { color: '#d44835', roughness: 0.8 },
    secondary: { color: '#f3c64b', roughness: 0.35, metalness: 0.7 },
    accent: {
      color: '#ffd765',
      roughness: 0.25,
      metalness: 0.85,
      emissive: { color: '#6b4a08', intensity: 0.45 },
    },
    boot: { color: '#7a2f22', roughness: 0.7 },
    dark: { color: '#2c1a12', roughness: 0.9 },
  })

  // ลำตัว: เสื้อคลุมสั้นทรงสอบ
  set.add(prim.cyl(0.25, 0.2, 0.34, 7, { pos: [0, p.chestY - 0.08, 0] }), 'Chest', 'primary')
  set.add(prim.cyl(0.2, 0.19, 0.24, 7, { pos: [0, p.spineY - 0.06, 0] }), 'Spine', 'primary')
  set.add(prim.cyl(0.21, 0.23, 0.16, 7, { pos: [0, p.hipsY - 0.04, 0] }), 'Hips', 'primary')
  // เกราะอกและเข็มขัดทอง
  set.add(prim.box(0.34, 0.1, 0.26, { pos: [0, p.chestY + 0.02, 0.02] }), 'Chest', 'secondary')
  set.add(prim.box(0.42, 0.08, 0.28, { pos: [0, p.hipsY + 0.02, 0] }), 'Hips', 'secondary')
  // สนับไหล่
  set.addMirrored(
    (s) =>
      prim.sphere(0.12, 6, 4, {
        pos: [s * p.shoulderX, p.shoulderY + 0.02, 0],
        scale: [1, 0.8, 1],
      }),
    'Shoulder_%s',
    'secondary',
  )

  addLimbs(set, p, { armR: 0.065, legR: 0.075, handR: 0.075 })

  // ศีรษะ + ปาก + หู (ทรงวานร)
  set.add(prim.box(0.25, 0.26, 0.24, { pos: [0, p.headY + 0.1, 0] }), 'Head', 'skin')
  set.add(prim.box(0.15, 0.11, 0.09, { pos: [0, p.headY + 0.04, 0.14] }), 'Head', 'skin')
  set.add(prim.box(0.09, 0.03, 0.02, { pos: [0, p.headY + 0.01, 0.19] }), 'Head', 'dark')
  set.addMirrored(
    (s) => prim.sphere(0.055, 5, 4, { pos: [s * 0.14, p.headY + 0.13, 0], scale: [0.6, 1, 1] }),
    'Head',
    'skin',
  )
  // ดวงตา
  set.addMirrored(
    (s) => prim.box(0.045, 0.035, 0.02, { pos: [s * 0.06, p.headY + 0.13, 0.122] }),
    'Head',
    'dark',
  )
  // แถบคาดหัวทอง — ลักษณะเด่นของตัวละคร
  set.add(
    prim.torus(0.135, 0.026, 4, 10, { pos: [0, p.headY + 0.17, 0], rot: [HALF_PI, 0, 0] }),
    'Head',
    'accent',
  )
  set.add(prim.box(0.05, 0.05, 0.03, { pos: [0, p.headY + 0.17, 0.13] }), 'Head', 'accent')

  // หาง 3 ข้อ ผูกกับกระดูกหางคนละข้อ เพื่อให้สะบัดเป็นคลื่นได้
  const tailSegments = [
    { bone: 'Tail_1', from: [0, p.hipsY - 0.02, -0.16], to: [0, p.hipsY + 0.06, -0.36], r: 0.05 },
    { bone: 'Tail_2', from: [0, p.hipsY + 0.06, -0.36], to: [0, p.hipsY + 0.16, -0.52], r: 0.042 },
    { bone: 'Tail_3', from: [0, p.hipsY + 0.16, -0.52], to: [0, p.hipsY + 0.3, -0.6], r: 0.034 },
  ]
  for (const seg of tailSegments) {
    set.add(prim.segment(seg.from, seg.to, seg.r * 0.85, seg.r), seg.bone, 'skin')
  }
  set.add(prim.sphere(0.04, 5, 4, { pos: [0, p.hipsY + 0.31, -0.61] }), 'Tail_3', 'secondary')

  // กระบองทอง — ผูกกับกระดูกมือขวา จึงขยับตามแขนโดยไม่ต้องมี node แยก
  const staffX = -p.shoulderX
  // ยกด้ามขึ้นเล็กน้อยไม่ให้ปลายล่างจมทะลุพื้นลาน
  const staffY = p.handY + 0.04
  set.add(
    prim.cyl(0.032, 0.032, 1.5, 8, { pos: [staffX - 0.02, staffY, 0.09], rot: [0, 0, 0.06] }),
    'Hand_R',
    'accent',
  )
  set.add(
    prim.cyl(0.05, 0.05, 0.1, 8, { pos: [staffX + 0.02, staffY + 0.73, 0.09] }),
    'Hand_R',
    'secondary',
  )
  set.add(
    prim.cyl(0.05, 0.05, 0.1, 8, { pos: [staffX - 0.06, staffY - 0.73, 0.09] }),
    'Hand_R',
    'secondary',
  )

  return {
    id: 'monkey-king',
    mesh: set.toSkinnedMesh('MonkeyKing'),
    clip: buildIdleClip(rig, { breathe: 1.15, sway: 1.3, tail: 1, weightShift: 1.1 }),
  }
}

/* ------------------------------------------------------------------ */
/* 2) Pig Warrior — ถือคราดเก้าซี่ มีหูและจมูกหมู                        */
/* ------------------------------------------------------------------ */

const PIG_PROFILE = {
  hipsY: 0.8,
  spineY: 0.95,
  chestY: 1.13,
  neckY: 1.32,
  headY: 1.42,
  shoulderY: 1.28,
  elbowY: 1.0,
  handY: 0.74,
  shoulderX: 0.34,
  hipX: 0.15,
  kneeY: 0.4,
  footY: 0.06,
}

function buildPigWarrior() {
  const p = PIG_PROFILE
  const rig = buildSkeleton(p, false)
  const set = new PartSet(rig, {
    skin: { color: '#e8a7a4', roughness: 0.85 },
    primary: { color: '#31547a', roughness: 0.65, metalness: 0.3 },
    secondary: { color: '#d9a640', roughness: 0.35, metalness: 0.7 },
    accent: {
      color: '#7ee0ff',
      roughness: 0.3,
      metalness: 0.4,
      emissive: { color: '#12414f', intensity: 0.5 },
    },
    boot: { color: '#243d59', roughness: 0.7 },
    dark: { color: '#2a2018', roughness: 0.9 },
    wood: { color: '#6b4a2c', roughness: 0.9 },
    metal: { color: '#b9c3d1', roughness: 0.3, metalness: 0.9 },
  })

  // พุงใหญ่ — ลักษณะเด่นของตัวละคร
  set.add(
    prim.sphere(0.36, 8, 6, { pos: [0, p.spineY - 0.02, 0.02], scale: [1, 0.9, 0.92] }),
    'Spine',
    'skin',
  )
  set.add(prim.cyl(0.32, 0.3, 0.3, 8, { pos: [0, p.chestY + 0.02, 0] }), 'Chest', 'primary')
  // เกราะอกและเข็มขัดใหญ่
  set.add(prim.box(0.5, 0.14, 0.34, { pos: [0, p.chestY + 0.08, 0.02] }), 'Chest', 'secondary')
  set.add(prim.cyl(0.34, 0.34, 0.12, 8, { pos: [0, p.hipsY, 0] }), 'Hips', 'secondary')
  set.add(prim.box(0.14, 0.14, 0.06, { pos: [0, p.hipsY, 0.32] }), 'Hips', 'accent')
  set.add(prim.cyl(0.3, 0.32, 0.2, 8, { pos: [0, p.hipsY - 0.12, 0] }), 'Hips', 'primary')
  // สนับไหล่หนา
  set.addMirrored(
    (s) =>
      prim.sphere(0.16, 6, 5, {
        pos: [s * p.shoulderX, p.shoulderY + 0.03, 0],
        scale: [1, 0.75, 1],
      }),
    'Shoulder_%s',
    'secondary',
  )

  addLimbs(set, p, { armR: 0.085, legR: 0.095, handR: 0.09 })

  // ศีรษะทรงหมู
  set.add(prim.box(0.3, 0.27, 0.27, { pos: [0, p.headY + 0.11, 0] }), 'Head', 'skin')
  // จมูกหมู — ทรงกระบอกแบนหันหน้าออก พร้อมรูจมูก 2 รู
  set.add(
    prim.cyl(0.09, 0.1, 0.11, 8, { pos: [0, p.headY + 0.05, 0.17], rot: [HALF_PI, 0, 0] }),
    'Head',
    'skin',
  )
  set.addMirrored(
    (s) => prim.box(0.025, 0.04, 0.02, { pos: [s * 0.035, p.headY + 0.05, 0.225] }),
    'Head',
    'dark',
  )
  // หูหมู — กรวยแบนเอียงห้อยลง
  set.addMirrored(
    (s) =>
      prim.cone(0.1, 0.22, 4, {
        pos: [s * 0.17, p.headY + 0.2, -0.01],
        rot: [0.3, 0, s * 2.5],
        scale: [1, 1, 0.4],
      }),
    'Head',
    'skin',
  )
  // ดวงตาและเขี้ยว
  set.addMirrored(
    (s) => prim.box(0.05, 0.03, 0.02, { pos: [s * 0.075, p.headY + 0.15, 0.137] }),
    'Head',
    'dark',
  )
  set.addMirrored(
    (s) =>
      prim.cone(0.028, 0.08, 4, { pos: [s * 0.075, p.headY - 0.02, 0.1], rot: [0, 0, Math.PI] }),
    'Head',
    'metal',
  )

  // คราดเก้าซี่ — ด้ามไม้ + หัวคราด + ซี่ 9 ซี่
  const rakeX = -p.shoulderX - 0.04
  const rakeY = p.handY + 0.12
  set.add(prim.cyl(0.035, 0.038, 1.5, 7, { pos: [rakeX, rakeY, 0.1] }), 'Hand_R', 'wood')
  set.add(prim.box(0.62, 0.07, 0.07, { pos: [rakeX, rakeY + 0.76, 0.1] }), 'Hand_R', 'metal')
  set.add(prim.box(0.1, 0.12, 0.09, { pos: [rakeX, rakeY + 0.68, 0.1] }), 'Hand_R', 'secondary')
  for (let i = 0; i < 9; i++) {
    const x = rakeX + (i - 4) * 0.07
    set.add(prim.cone(0.022, 0.16, 4, { pos: [x, rakeY + 0.86, 0.1] }), 'Hand_R', 'metal')
  }

  return {
    id: 'pig-warrior',
    mesh: set.toSkinnedMesh('PigWarrior'),
    clip: buildIdleClip(rig, { breathe: 1.5, sway: 0.75, weightShift: 0.8, phase: 1.1 }),
  }
}

/* ------------------------------------------------------------------ */
/* 3) Pilgrim Monk — ชุดพระ ถือไม้เท้า                                  */
/* ------------------------------------------------------------------ */

const MONK_PROFILE = {
  hipsY: 0.92,
  spineY: 1.09,
  chestY: 1.28,
  neckY: 1.5,
  headY: 1.63,
  shoulderY: 1.43,
  elbowY: 1.11,
  handY: 0.82,
  shoulderX: 0.24,
  hipX: 0.1,
  kneeY: 0.47,
  footY: 0.06,
}

function buildPilgrimMonk() {
  const p = MONK_PROFILE
  const rig = buildSkeleton(p, false)
  const set = new PartSet(rig, {
    skin: { color: '#e2b998', roughness: 0.85 },
    primary: { color: '#d87836', roughness: 0.85 },
    secondary: { color: '#f2d27a', roughness: 0.6 },
    accent: { color: '#9a3f3b', roughness: 0.8 },
    boot: { color: '#8a6a44', roughness: 0.8 },
    dark: { color: '#2e2318', roughness: 0.9 },
    metal: { color: '#e0c063', roughness: 0.3, metalness: 0.85 },
  })

  // จีวรคลุมยาว — ทรงสอบออกด้านล่างจนคลุมช่วงขา
  set.add(prim.cyl(0.24, 0.26, 0.34, 8, { pos: [0, p.chestY - 0.06, 0] }), 'Chest', 'primary')
  set.add(prim.cyl(0.26, 0.3, 0.26, 8, { pos: [0, p.spineY - 0.06, 0] }), 'Spine', 'primary')
  set.add(prim.cyl(0.3, 0.4, 0.56, 8, { pos: [0, p.hipsY - 0.24, 0] }), 'Hips', 'primary')
  // ผ้าสังฆาฏิพาดเฉียง + ขอบผ้า
  set.add(
    prim.box(0.44, 0.13, 0.3, { pos: [0, p.chestY + 0.04, 0.01], rot: [0, 0, 0.42] }),
    'Chest',
    'accent',
  )
  set.add(prim.cyl(0.31, 0.31, 0.05, 8, { pos: [0, p.hipsY + 0.04, 0] }), 'Hips', 'accent')
  set.add(prim.cyl(0.405, 0.405, 0.06, 8, { pos: [0, p.hipsY - 0.5, 0] }), 'Hips', 'secondary')

  addLimbs(set, p, { armR: 0.055, legR: 0.06, handR: 0.065, limbKey: 'primary' })

  // ศีรษะโล้น
  set.add(prim.box(0.24, 0.26, 0.24, { pos: [0, p.headY + 0.1, 0] }), 'Head', 'skin')
  set.add(
    prim.sphere(0.125, 7, 5, { pos: [0, p.headY + 0.21, 0], scale: [1, 0.75, 1] }),
    'Head',
    'skin',
  )
  set.addMirrored(
    (s) => prim.box(0.045, 0.03, 0.02, { pos: [s * 0.06, p.headY + 0.13, 0.122] }),
    'Head',
    'dark',
  )
  set.addMirrored(
    (s) => prim.sphere(0.04, 5, 4, { pos: [s * 0.13, p.headY + 0.09, 0], scale: [0.6, 1, 1] }),
    'Head',
    'skin',
  )
  // หมวกนักแสวงบุญ — ปีกกว้างกันแดด
  set.add(prim.cyl(0.1, 0.3, 0.14, 10, { pos: [0, p.headY + 0.29, 0] }), 'Head', 'secondary')
  set.add(
    prim.torus(0.29, 0.02, 4, 10, { pos: [0, p.headY + 0.23, 0], rot: [HALF_PI, 0, 0] }),
    'Head',
    'accent',
  )

  // ลูกประคำรอบคอ
  set.add(
    prim.torus(0.13, 0.022, 4, 9, { pos: [0, p.chestY + 0.1, 0.02], rot: [HALF_PI - 0.25, 0, 0] }),
    'Chest',
    'dark',
  )

  // ไม้เท้า — ด้ามยาว + หัวห่วงโลหะ + ห่วงเล็ก 3 วง
  const staffX = -p.shoulderX - 0.02
  const staffY = p.handY + 0.16
  set.add(prim.cyl(0.028, 0.032, 1.66, 7, { pos: [staffX, staffY, 0.1] }), 'Hand_R', 'boot')
  set.add(prim.torus(0.085, 0.022, 4, 10, { pos: [staffX, staffY + 0.92, 0.1] }), 'Hand_R', 'metal')
  set.add(prim.cyl(0.03, 0.03, 0.1, 6, { pos: [staffX, staffY + 0.83, 0.1] }), 'Hand_R', 'metal')
  // ห่วงเล็กห้อยบนหัวไม้เท้า (เสียงกรุ๊งกริ๊งของไม้เท้าพระธุดงค์)
  for (let i = 0; i < 3; i++) {
    set.add(
      prim.torus(0.034, 0.01, 3, 8, { pos: [staffX + (i - 1) * 0.055, staffY + 1.0, 0.1] }),
      'Hand_R',
      'metal',
    )
  }

  return {
    id: 'pilgrim-monk',
    mesh: set.toSkinnedMesh('PilgrimMonk'),
    clip: buildIdleClip(rig, { breathe: 0.8, sway: 0.6, weightShift: 0.5, phase: 2.2 }),
  }
}

export const BUILDERS = [buildMonkeyKing, buildPigWarrior, buildPilgrimMonk]

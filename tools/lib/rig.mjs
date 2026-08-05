/**
 * เครื่องมือประกอบโมเดล low-poly แบบ rigged สำหรับ export เป็น GLB
 *
 * แนวคิด
 * - โครงกระดูก (skeleton) ใช้ layout เดียวกันทั้ง 3 ตัว ต่างกันแค่สัดส่วน (profile)
 *   ทำให้ animation clip ใช้ชื่อกระดูกชุดเดียวกัน และนำ animation มาแชร์กันได้ในอนาคต
 * - ชิ้นส่วนกาย (part) สร้างเป็น primitive แล้ววางในตำแหน่ง "rest pose" ตรง ๆ
 *   จากนั้นผูกทุก vertex ของชิ้นนั้นเข้ากับกระดูกเดียว (rigid skinning, weight = 1)
 *   ซึ่งเหมาะกับงาน low-poly แบบหุ่นไม้ และไม่มีปัญหา weight เพี้ยน
 * - รวมทุกชิ้นเป็น SkinnedMesh เดียว โดยแบ่ง group ตามวัสดุ → GLB ได้ 1 mesh หลาย primitive
 */

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/* ------------------------------------------------------------------ */
/* primitive helpers — ทุกตัวคืน BufferGeometry ที่วางในตำแหน่งแล้ว      */
/* ------------------------------------------------------------------ */

function place(geometry, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    new THREE.Vector3(...scale),
  )
  geometry.applyMatrix4(m)
  return geometry
}

export const prim = {
  box: (w, h, d, t) => place(new THREE.BoxGeometry(w, h, d), t),
  /** ทรงกระบอก/กรวยตัด — segments น้อย ๆ เพื่อความ low-poly */
  cyl: (rTop, rBottom, h, seg, t) =>
    place(new THREE.CylinderGeometry(rTop, rBottom, h, seg), t),
  cone: (r, h, seg, t) => place(new THREE.ConeGeometry(r, h, seg), t),
  sphere: (r, wSeg, hSeg, t) => place(new THREE.SphereGeometry(r, wSeg, hSeg), t),
  torus: (r, tube, radialSeg, tubularSeg, t) =>
    place(new THREE.TorusGeometry(r, tube, radialSeg, tubularSeg), t),

  /**
   * ทรงกระบอกที่ลากจากจุด `from` ไป `to` (ใช้กับข้อหาง)
   * หมุนด้วย quaternion โดยตรง เพื่อเลี่ยงความกำกวมของลำดับแกนใน Euler
   */
  segment: (from, to, rTop, rBottom, seg = 6) => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const geometry = new THREE.CylinderGeometry(rTop, rBottom, dir.length(), seg)
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    )
    geometry.applyMatrix4(
      new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), quat, new THREE.Vector3(1, 1, 1)),
    )
    return geometry
  },
}

/* ------------------------------------------------------------------ */
/* โครงกระดูก                                                          */
/* ------------------------------------------------------------------ */

/**
 * สร้างกระดูกจาก "ตำแหน่งในโลก" ของแต่ละข้อ แล้วแปลงเป็น local offset ให้อัตโนมัติ
 * @param {object} p profile สัดส่วนของตัวละคร
 * @param {boolean} hasTail สร้างกระดูกหางหรือไม่
 */
export function buildSkeleton(p, hasTail) {
  /** @type {{name:string,parent:string|null,world:[number,number,number]}[]} */
  const layout = [
    { name: 'Root', parent: null, world: [0, 0, 0] },
    { name: 'Hips', parent: 'Root', world: [0, p.hipsY, 0] },
    { name: 'Spine', parent: 'Hips', world: [0, p.spineY, 0] },
    { name: 'Chest', parent: 'Spine', world: [0, p.chestY, 0] },
    { name: 'Neck', parent: 'Chest', world: [0, p.neckY, 0] },
    { name: 'Head', parent: 'Neck', world: [0, p.headY, 0] },
  ]

  for (const [side, sign] of [
    ['L', 1],
    ['R', -1],
  ]) {
    layout.push(
      { name: `Shoulder_${side}`, parent: 'Chest', world: [sign * p.shoulderX * 0.45, p.shoulderY, 0] },
      { name: `UpperArm_${side}`, parent: `Shoulder_${side}`, world: [sign * p.shoulderX, p.shoulderY, 0] },
      { name: `LowerArm_${side}`, parent: `UpperArm_${side}`, world: [sign * p.shoulderX, p.elbowY, 0] },
      { name: `Hand_${side}`, parent: `LowerArm_${side}`, world: [sign * p.shoulderX, p.handY, 0] },
      { name: `UpperLeg_${side}`, parent: 'Hips', world: [sign * p.hipX, p.hipsY - 0.05, 0] },
      { name: `LowerLeg_${side}`, parent: `UpperLeg_${side}`, world: [sign * p.hipX, p.kneeY, 0] },
      { name: `Foot_${side}`, parent: `LowerLeg_${side}`, world: [sign * p.hipX, p.footY, 0] },
    )
  }

  if (hasTail) {
    layout.push(
      { name: 'Tail_1', parent: 'Hips', world: [0, p.hipsY - 0.02, -0.16] },
      { name: 'Tail_2', parent: 'Tail_1', world: [0, p.hipsY + 0.06, -0.36] },
      { name: 'Tail_3', parent: 'Tail_2', world: [0, p.hipsY + 0.16, -0.52] },
    )
  }

  const byName = new Map()
  const bones = []

  for (const node of layout) {
    const bone = new THREE.Bone()
    bone.name = node.name
    const parentWorld = node.parent ? byName.get(node.parent).userData.world : [0, 0, 0]
    bone.position.set(
      node.world[0] - parentWorld[0],
      node.world[1] - parentWorld[1],
      node.world[2] - parentWorld[2],
    )
    bone.userData.world = node.world
    if (node.parent) byName.get(node.parent).add(bone)
    byName.set(node.name, bone)
    bones.push(bone)
  }

  const root = bones[0]
  root.updateMatrixWorld(true)

  return { root, bones, byName, boneIndex: new Map(bones.map((b, i) => [b.name, i])) }
}

/* ------------------------------------------------------------------ */
/* ตัวเก็บชิ้นส่วน + การ skin                                            */
/* ------------------------------------------------------------------ */

export class PartSet {
  constructor(rig, palette) {
    this.rig = rig
    this.palette = palette
    /** @type {{geometry:THREE.BufferGeometry,bone:string,material:string}[]} */
    this.parts = []
  }

  /**
   * เพิ่มชิ้นส่วน 1 ชิ้น ผูกกับกระดูก 1 ชิ้น
   * @param {THREE.BufferGeometry} geometry วางในตำแหน่ง rest pose แล้ว
   * @param {string} bone ชื่อกระดูกที่ชิ้นนี้ติดตาม
   * @param {string} material key ใน palette
   */
  add(geometry, bone, material) {
    if (!this.rig.boneIndex.has(bone)) throw new Error(`unknown bone: ${bone}`)
    if (!this.palette[material]) throw new Error(`unknown material: ${material}`)
    this.parts.push({ geometry, bone, material })
    return this
  }

  /** เพิ่มชิ้นส่วนคู่ ซ้าย/ขวา โดยสะท้อนแกน X ให้อัตโนมัติ */
  addMirrored(makeGeometry, boneTemplate, material) {
    for (const [side, sign] of [
      ['L', 1],
      ['R', -1],
    ]) {
      this.add(makeGeometry(sign), boneTemplate.replace('%s', side), material)
    }
    return this
  }

  /**
   * รวมทุกชิ้นเป็น SkinnedMesh เดียว
   * - แต่ละ material กลายเป็น 1 group (1 primitive ใน GLB)
   * - ทำ non-indexed + คำนวณ normal ใหม่ เพื่อให้ได้หน้าตาแบบ flat shading
   *   (glTF ไม่มีธง flatShading จึงต้องอบความ faceted ลงใน normal ตั้งแต่ตอน export)
   */
  toSkinnedMesh(name) {
    const groups = new Map()
    for (const part of this.parts) {
      const flat = part.geometry.toNonIndexed()
      flat.deleteAttribute('uv')
      flat.computeVertexNormals()

      const count = flat.attributes.position.count
      const boneIdx = this.rig.boneIndex.get(part.bone)
      const skinIndex = new Uint16Array(count * 4)
      const skinWeight = new Float32Array(count * 4)
      for (let i = 0; i < count; i++) {
        skinIndex[i * 4] = boneIdx
        skinWeight[i * 4] = 1
      }
      flat.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4))
      flat.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4))

      if (!groups.has(part.material)) groups.set(part.material, [])
      groups.get(part.material).push(flat)
    }

    const materialKeys = [...groups.keys()]
    const perMaterial = materialKeys.map((key) => mergeGeometries(groups.get(key), false))
    const geometry = mergeGeometries(perMaterial, true)
    geometry.name = `${name}_geometry`

    const materials = materialKeys.map((key) => {
      const { color, metalness = 0.05, roughness = 0.75, emissive } = this.palette[key]
      const material = new THREE.MeshStandardMaterial({
        name: key,
        color: new THREE.Color(color),
        metalness,
        roughness,
      })
      if (emissive) {
        material.emissive = new THREE.Color(emissive.color)
        material.emissiveIntensity = emissive.intensity ?? 1
      }
      return material
    })

    const mesh = new THREE.SkinnedMesh(geometry, materials)
    mesh.name = name
    mesh.add(this.rig.root)
    mesh.bind(new THREE.Skeleton(this.rig.bones))
    return mesh
  }
}

/* ------------------------------------------------------------------ */
/* Idle animation                                                      */
/* ------------------------------------------------------------------ */

const IDLE_DURATION = 2.4
const IDLE_FPS = 12

/**
 * สร้าง AnimationClip ชื่อ "Idle" ที่วนลูปได้เนียน
 *
 * ทุกฟังก์ชันเคลื่อนไหวใช้ sin/cos ของ (2π · k · t / duration) โดย k เป็นจำนวนเต็ม
 * ค่าที่เฟรมสุดท้ายจึงเท่ากับเฟรมแรกเสมอ — วนลูปแล้วไม่มีอาการกระตุก
 *
 * @param {object} rig
 * @param {object} options ปรับความแรงของแต่ละส่วนต่อตัวละคร
 */
export function buildIdleClip(rig, options = {}) {
  const {
    breathe = 1, // ความแรงของการหายใจ
    sway = 1, // การโยกตัว/แขน
    tail = 0, // ความแรงของหาง (0 = ไม่มีหาง)
    weightShift = 1, // การถ่ายน้ำหนักซ้าย-ขวา
    phase = 0,
  } = options

  const frames = Math.round(IDLE_DURATION * IDLE_FPS)
  const times = Array.from({ length: frames + 1 }, (_, i) => (i / frames) * IDLE_DURATION)

  /** คลื่นที่วนครบรอบพอดีใน 1 ลูป */
  const wave = (t, cycles, offset = 0) =>
    Math.sin((2 * Math.PI * cycles * t) / IDLE_DURATION + offset + phase)

  const tracks = []

  const rotate = (boneName, fn) => {
    if (!rig.byName.has(boneName)) return
    const bone = rig.byName.get(boneName)
    const values = []
    const euler = new THREE.Euler()
    const quat = new THREE.Quaternion()
    const base = bone.quaternion.clone()
    for (const t of times) {
      const [x, y, z] = fn(t)
      quat.setFromEuler(euler.set(x, y, z))
      quat.premultiply(base)
      values.push(quat.x, quat.y, quat.z, quat.w)
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values))
  }

  const translate = (boneName, fn) => {
    if (!rig.byName.has(boneName)) return
    const base = rig.byName.get(boneName).position
    const values = []
    for (const t of times) {
      const [x, y, z] = fn(t)
      values.push(base.x + x, base.y + y, base.z + z)
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${boneName}.position`, times, values))
  }

  // สะโพก: ยุบ-ยืดตามลมหายใจ + ถ่ายน้ำหนักซ้ายขวาช้ากว่าครึ่งหนึ่ง
  translate('Hips', (t) => [wave(t, 1) * 0.012 * weightShift, wave(t, 2) * 0.016 * breathe, 0])
  rotate('Hips', (t) => [0, wave(t, 1, 0.6) * 0.03 * sway, wave(t, 1) * 0.035 * weightShift])

  // ลำตัว: หายใจเข้า-ออก (2 รอบต่อลูป)
  rotate('Spine', (t) => [wave(t, 2, Math.PI) * 0.03 * breathe, 0, wave(t, 1, 0.4) * -0.02 * sway])
  rotate('Chest', (t) => [wave(t, 2, Math.PI + 0.3) * 0.035 * breathe, 0, 0])

  // คอและศีรษะ: มองซ้าย-ขวาช้า ๆ พร้อมพยักหน้าตามจังหวะหายใจ
  rotate('Neck', (t) => [wave(t, 2, 0.5) * -0.02 * breathe, wave(t, 1, 1.1) * 0.05 * sway, 0])
  rotate('Head', (t) => [wave(t, 2, 0.9) * -0.025 * breathe, wave(t, 1, 1.4) * 0.11 * sway, 0])

  // ไหล่ยกตามลมหายใจ
  rotate('Shoulder_L', (t) => [0, 0, wave(t, 2, Math.PI) * 0.045 * breathe])
  rotate('Shoulder_R', (t) => [0, 0, wave(t, 2, Math.PI) * -0.045 * breathe])

  // แขนแกว่งเบา ๆ ไม่พร้อมกันซ้าย-ขวา
  rotate('UpperArm_L', (t) => [wave(t, 1, 0.2) * 0.045 * sway, 0, 0.06 + wave(t, 2) * 0.035 * sway])
  rotate('UpperArm_R', (t) => [wave(t, 1, 0.9) * 0.04 * sway, 0, -0.06 - wave(t, 2, 0.4) * 0.035 * sway])
  rotate('LowerArm_L', (t) => [wave(t, 1, 0.8) * 0.05 * sway, 0, 0])
  rotate('LowerArm_R', (t) => [wave(t, 1, 1.5) * 0.045 * sway, 0, 0])

  // ขา: ขยับน้อยมาก แค่รับน้ำหนักที่ถ่ายไปมา
  rotate('UpperLeg_L', (t) => [0, 0, wave(t, 1) * -0.02 * weightShift])
  rotate('UpperLeg_R', (t) => [0, 0, wave(t, 1) * -0.02 * weightShift])

  // หาง: คลื่นไล่จากโคนไปปลาย (หน่วงเฟสทีละข้อ)
  if (tail > 0) {
    rotate('Tail_1', (t) => [wave(t, 1, 0.0) * 0.10 * tail, wave(t, 1, 0.3) * 0.16 * tail, 0])
    rotate('Tail_2', (t) => [wave(t, 1, 0.5) * 0.13 * tail, wave(t, 1, 0.8) * 0.20 * tail, 0])
    rotate('Tail_3', (t) => [wave(t, 1, 1.0) * 0.16 * tail, wave(t, 1, 1.3) * 0.24 * tail, 0])
  }

  return new THREE.AnimationClip('Idle', IDLE_DURATION, tracks)
}

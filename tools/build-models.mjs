/**
 * สร้างโมเดล 3D low-poly แบบ rigged + animation "Idle" แล้ว export เป็น GLB
 *
 *   npm run build:models
 *
 * ผลลัพธ์: public/models/<id>.glb ตัวละครละ 1 ไฟล์
 * แต่ละไฟล์ประกอบด้วย SkinnedMesh 1 ตัว, skeleton, และ AnimationClip ชื่อ "Idle"
 *
 * สคริปต์นี้รันตอน build asset เท่านั้น ไม่ถูกรวมเข้าไปใน bundle ของเกม
 *
 * สถานะ (2026-08-06): เกมจริงตอนนี้เรนเดอร์ตัวละครด้วย sprite sheet 2D ผ่าน SpriteRig
 * (ดู src/components/LobbyScene/CharacterModel.tsx) ไม่มีจุดไหนใน src/ โหลด .glb พวกนี้ใช้
 * (grep useGLTF/GLTFLoader/@react-three/drei = ไม่พบ) — pipeline นี้เป็น groundwork ไว้ล่วงหน้า
 * เผื่อ migrate ไปโมเดล 3D จริงในอนาคต เก็บไว้ตั้งใจ ไม่ใช่ของค้าง/ลืมลบ
 */

import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BUILDERS } from './lib/characters.mjs'
import { sweepStaleTemps, tempPathFor } from './lib/atomic-write.mjs'

// GLTFExporter เรียก FileReader ตอน export แบบ binary ซึ่ง Node ไม่มีให้
// จึง shim เฉพาะเมธอดที่มันใช้จริง (readAsArrayBuffer + onloadend)
if (!('FileReader' in globalThis)) {
  globalThis.FileReader = class FileReaderShim {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buffer) => {
          this.result = buffer
          this.onloadend?.()
          return undefined
        })
        .catch((error) => this.onerror?.(error))
    }
  }
}

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  // temp ของรอบที่ถูกฆ่าไปก่อนหน้าจะนอนอยู่ใน OUT_DIR ซึ่ง Vite copy ดิบ ๆ เข้า bundle
  const swept = await sweepStaleTemps(OUT_DIR)
  if (swept > 0) console.log(`กวาดไฟล์ชั่วคราวค้างจากรอบก่อน ${swept} ไฟล์`)

  const results = []

  for (const build of BUILDERS) {
    const { id, mesh, clip } = build()

    const scene = new THREE.Scene()
    scene.name = id
    scene.add(mesh)
    scene.updateMatrixWorld(true)

    const glb = await new GLTFExporter().parseAsync(scene, {
      binary: true,
      animations: [clip],
      // จำเป็นสำหรับ skinned mesh: ไม่อย่างนั้น exporter จะ bake การเคลื่อนไหวผิด
      onlyVisible: false,
    })

    /*
      เขียนลง temp ก่อน แล้วค่อย promote ทั้งชุดหลัง validate ผ่านหมด — audit 2026-08-12 §0b.3

      เดิมเขียน .glb ทุกตัวลงปลายทางจริงก่อน แล้วค่อย validate ทีหลัง build ที่ตรวจไม่ผ่านจึง
      ทับชุดที่ใช้งานได้อยู่แล้วไปเรียบร้อยก่อนจะตั้ง exitCode = 1 — รายงานว่าล้มเหลว แต่ของ
      บนดิสก์เป็นของเสียไปแล้ว ตัวนี้เป็น all-or-nothing: ทั้งชุดผ่านถึงจะขึ้นแทนที่
    */
    const file = resolve(OUT_DIR, `${id}.glb`)
    const temp = tempPathFor(file)
    await writeFile(temp, Buffer.from(glb))
    results.push({ id, file: temp, finalFile: file, bytes: glb.byteLength })
  }

  // ---- ตรวจสอบผลลัพธ์ด้วยการโหลดไฟล์กลับเข้ามาใหม่ ----
  console.log('')
  let failures = 0

  for (const result of results) {
    const buffer = await readFile(result.file)
    const gltf = await new GLTFLoader().parseAsync(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      '',
    )

    // GLTFLoader แตก 1 mesh หลาย primitive ออกเป็น SkinnedMesh หลายตัวที่ใช้
    // vertex buffer ร่วมกัน — จึงต้องนับสามเหลี่ยมจาก index ของแต่ละตัว ไม่ใช่ position.count
    const skinnedMeshes = []
    gltf.scene.traverse((object) => {
      if (object.isSkinnedMesh) skinnedMeshes.push(object)
    })

    let triangles = 0
    const materials = new Set()
    for (const mesh of skinnedMeshes) {
      const geometry = mesh.geometry
      triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
      for (const material of [].concat(mesh.material)) materials.add(material.uuid)
    }

    const problems = []
    if (skinnedMeshes.length === 0) problems.push('ไม่พบ SkinnedMesh')

    const skeletons = new Set(skinnedMeshes.map((m) => m.skeleton?.uuid))
    if (skinnedMeshes.length > 0 && (skeletons.size !== 1 || skeletons.has(undefined))) {
      problems.push('primitive ไม่ได้ใช้ skeleton เดียวกัน')
    }
    if (skinnedMeshes.some((m) => !m.geometry.attributes.skinIndex)) {
      problems.push('บาง primitive ไม่มี skinIndex')
    }

    const idle = gltf.animations.find((a) => a.name === 'Idle')
    if (!idle) {
      const names = gltf.animations.map((a) => a.name).join(', ') || 'ไม่มีเลย'
      problems.push(`ไม่พบ animation ชื่อ "Idle" (มี: ${names})`)
    } else {
      if (idle.duration <= 0) problems.push('Idle ความยาวเป็น 0')
      // ต้องมีอย่างน้อย 1 track ที่ค่าเปลี่ยนจริง ไม่ใช่ท่านิ่งค้าง
      const moves = idle.tracks.some((track) => {
        const v = track.values
        for (let i = 0; i < v.length; i++)
          if (Math.abs(v[i] - v[i % track.getValueSize()]) > 1e-4) return true
        return false
      })
      if (!moves) problems.push('Idle ไม่มีการเคลื่อนไหวจริง')
      // เฟรมแรกกับเฟรมสุดท้ายต้องตรงกัน ไม่งั้นลูปแล้วกระตุก
      const seamless = idle.tracks.every((track) => {
        const size = track.getValueSize()
        const v = track.values
        for (let i = 0; i < size; i++) {
          if (Math.abs(v[i] - v[v.length - size + i]) > 1e-3) return false
        }
        return true
      })
      if (!seamless) problems.push('Idle วนลูปไม่เนียน (เฟรมแรก ≠ เฟรมสุดท้าย)')
    }

    const box = new THREE.Box3().setFromObject(gltf.scene)
    const height = box.max.y - box.min.y

    const status = problems.length === 0 ? 'OK ' : 'FAIL'
    if (problems.length > 0) failures++

    console.log(`[${status}] ${result.id}.glb`)
    console.log(`        ขนาดไฟล์      ${(result.bytes / 1024).toFixed(1)} KB`)
    console.log(`        สามเหลี่ยม    ${triangles}`)
    console.log(`        primitive     ${skinnedMeshes.length} (วัสดุ ${materials.size})`)
    console.log(`        กระดูก        ${skinnedMeshes[0]?.skeleton?.bones.length ?? 0}`)
    console.log(
      `        Idle          ${idle ? `${idle.duration.toFixed(2)}s / ${idle.tracks.length} tracks` : '—'}`,
    )
    console.log(`        ความสูงรวม    ${height.toFixed(2)} units`)
    for (const problem of problems) console.log(`        ⚠ ${problem}`)
  }

  console.log('')
  if (failures > 0) {
    // ทิ้ง temp ทั้งชุด ชุดเดิมบน public/models/ ยังอยู่ครบและใช้งานได้เหมือนเดิม
    await Promise.all(results.map((result) => unlink(result.file).catch(() => {})))
    console.error(`มีโมเดลที่ตรวจไม่ผ่าน ${failures} ตัว — ไม่ได้แทนที่ไฟล์เดิมใน public/models/`)
    process.exitCode = 1
    return
  }

  /*
    promote ทีละไฟล์ — และตรงนี้ **ไม่ใช่ atomic ข้ามไฟล์** ระบุไว้ตรง ๆ ดีกว่าปล่อยให้คำว่า
    all-or-nothing ข้างบนคลุมมาถึงด้วย: validate เป็น all-or-nothing จริง แต่ถ้า rename ตัวที่ 2
    จาก 3 ล้ม (ไฟล์ถูกล็อก ดิสก์เต็ม) จะได้ชุดผสมของใหม่กับของเก่า

    ไม่แก้ด้วยการสลับทั้งโฟลเดอร์ เพราะจะพัง dev server ที่ถือ handle ไฟล์ใน public/ อยู่ และ
    จำนวนโมเดลมีแค่หลักหน่วย ทางที่เลือกคือ **รายงานให้เห็น** ไม่ใช่แกล้งว่าไม่มีช่องนี้ —
    exit code จะเป็น 1 พร้อมบอกว่าตัวไหนขึ้นแล้วตัวไหนยัง เพื่อให้รันซ้ำได้อย่างรู้ตัว
  */
  const promoted = []
  try {
    for (const result of results) {
      await rename(result.file, result.finalFile)
      promoted.push(result.id)
    }
  } catch (cause) {
    const pending = results.filter((r) => !promoted.includes(r.id)).map((r) => r.id)
    await Promise.all(results.map((result) => unlink(result.file).catch(() => {})))
    console.error(`แทนที่ไฟล์ไม่ครบ — ขึ้นแล้ว: ${promoted.join(', ') || '(ไม่มี)'}`)
    console.error(`ยังเป็นของเดิม: ${pending.join(', ')}`)
    console.error('รัน npm run build:models ใหม่เพื่อให้ครบทั้งชุด')
    throw cause
  }

  console.log(`สร้างโมเดลครบ ${results.length} ตัว → public/models/`)
}

/*
  เดิม `await main()` เปล่า ๆ — throw กลางทาง (export พัง, ดิสก์เต็ม) จะทิ้ง .tmp ค้างไว้ใน
  public/models/ และจบด้วย unhandled rejection ที่ exit code เอาแน่ไม่ได้ ตอนนี้ temp ถูกเก็บ
  กวาดเสมอ และ CI เห็น exit 1 ที่ตั้งใจ
*/
try {
  await main()
} catch (cause) {
  console.error('สร้างโมเดลไม่สำเร็จ:', cause)
  process.exitCode = 1
}

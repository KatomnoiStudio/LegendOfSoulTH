/**
 * สร้างโมเดล 3D low-poly แบบ rigged + animation "Idle" แล้ว export เป็น GLB
 *
 *   npm run build:models
 *
 * ผลลัพธ์: public/models/<id>.glb ตัวละครละ 1 ไฟล์
 * แต่ละไฟล์ประกอบด้วย SkinnedMesh 1 ตัว, skeleton, และ AnimationClip ชื่อ "Idle"
 *
 * สคริปต์นี้รันตอน build asset เท่านั้น ไม่ถูกรวมเข้าไปใน bundle ของเกม
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BUILDERS } from './lib/characters.mjs'

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

    const file = resolve(OUT_DIR, `${id}.glb`)
    await writeFile(file, Buffer.from(glb))
    results.push({ id, file, bytes: glb.byteLength })
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
        for (let i = 0; i < v.length; i++) if (Math.abs(v[i] - v[i % track.getValueSize()]) > 1e-4) return true
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
    console.log(`        Idle          ${idle ? `${idle.duration.toFixed(2)}s / ${idle.tracks.length} tracks` : '—'}`)
    console.log(`        ความสูงรวม    ${height.toFixed(2)} units`)
    for (const problem of problems) console.log(`        ⚠ ${problem}`)
  }

  console.log('')
  if (failures > 0) {
    console.error(`มีโมเดลที่ตรวจไม่ผ่าน ${failures} ตัว`)
    process.exitCode = 1
  } else {
    console.log(`สร้างโมเดลครบ ${results.length} ตัว → public/models/`)
  }
}

await main()

/**
 * ลบ "จุดดำ/สีลอยหลุด" ที่ tools/find-stray-alpha-artifacts.mjs เจอ — เซต alpha=0 ให้กลุ่ม
 * พิกเซลที่แยกจาก silhouette หลักของตัวละคร แล้วเขียนไฟล์ raw png ทับที่เดิม
 *
 *   node tools/remove-stray-alpha-artifacts.mjs [glob-dir]
 *
 * รัน npm run build:images ต่อหลังจากนี้เพื่อ sync public/
 */
import { readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { produceFileAtomic } from './lib/atomic-write.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET_DIRS = process.argv[2]
  ? [process.argv[2]]
  : [
      join(ROOT, 'assets', 'raw', 'characters', 'walk'),
      join(ROOT, 'assets', 'raw', 'characters', 'turnaround'),
    ]

async function listPngs(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.png'))
    .filter((e) => e.name.startsWith('pigsy'))
    .map((e) => join(dir, e.name))
}

function labelComponents(alpha, width, height, threshold) {
  const labels = new Int32Array(width * height).fill(-1)
  const sizes = []
  const pixelIds = []
  const stack = []

  for (let start = 0; start < width * height; start++) {
    if (labels[start] !== -1 || alpha[start] <= threshold) continue
    const id = sizes.length
    labels[start] = id
    stack.push(start)
    let size = 0
    const members = [start]
    while (stack.length) {
      const idx = stack.pop()
      size++
      const x = idx % width
      const y = (idx / width) | 0
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < width - 1 ? idx + 1 : -1,
        y > 0 ? idx - width : -1,
        y < height - 1 ? idx + width : -1,
      ]
      for (const n of neighbors) {
        if (n >= 0 && labels[n] === -1 && alpha[n] > threshold) {
          labels[n] = id
          stack.push(n)
          members.push(n)
        }
      }
    }
    sizes.push(size)
    pixelIds.push(members)
  }
  return { sizes, pixelIds }
}

async function fixFile(file) {
  const img = sharp(file)
  const { width, height } = await img.metadata()
  const { data } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const alpha = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3]

  const { sizes, pixelIds } = labelComponents(alpha, width, height, 10)
  if (sizes.length <= 1) return false

  const maxSize = Math.max(...sizes)
  let removed = 0
  sizes.forEach((size, id) => {
    if (size === maxSize) return
    if (size < maxSize / 200 && size < 400) {
      for (const idx of pixelIds[id]) {
        data[idx * 4 + 0] = 0
        data[idx * 4 + 1] = 0
        data[idx * 4 + 2] = 0
        data[idx * 4 + 3] = 0
      }
      removed += size
    }
  })
  if (removed === 0) return false

  /*
    เขียนทับต้นฉบับใน assets/raw/ จึงต้อง atomic — audit 2026-08-12 §0b.3

    ข้อควรรู้เรื่องความรุนแรง: audit เขียนว่าไฟล์ที่เสียคือ "unreproducible" ซึ่ง **ไม่ตรงกับ
    ของจริง** — วัดแล้ว assets/raw/ ถูก track ใน git ครบ (walk 128/128, turnaround 36/36)
    `git checkout` กู้ได้ทันที ตัวนี้จึงเบากว่า optimize-images ที่ mtime logic ทำให้ไฟล์เสีย
    ค้างเงียบ ๆ โดย git ช่วยไม่ได้ ถึงอย่างนั้น rename ก็ยังถูกกว่าการต้องรู้ว่าต้อง checkout
  */
  await produceFileAtomic(file, (temp) =>
    sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(temp),
  )
  return removed
}

async function main() {
  let fixedCount = 0
  for (const dir of TARGET_DIRS) {
    const files = await listPngs(dir)
    for (const file of files) {
      const removed = await fixFile(file)
      if (removed) {
        console.log(`fixed ${file.replace(ROOT + '\\', '')} (ลบ ${removed}px)`)
        fixedCount++
      }
    }
  }
  console.log(`\nแก้แล้ว ${fixedCount} ไฟล์`)
}

await main()

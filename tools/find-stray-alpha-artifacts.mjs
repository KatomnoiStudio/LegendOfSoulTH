/**
 * ตรวจหา "จุดดำ/สีลอยหลุด" ในสไปรต์ pigsy — คือกลุ่มพิกเซลที่ alpha > 0 แต่ไม่เชื่อมกับ
 * silhouette หลักของตัวละคร (เศษจากขั้นตอนตัดพื้นหลัง) หาด้วย connected-component labeling
 * บนช่อง alpha แล้วรายงานกลุ่มที่เล็กกว่า silhouette หลักมาก ๆ พร้อมตำแหน่ง/ขนาด
 *
 *   node tools/find-stray-alpha-artifacts.mjs [glob-dir]
 */
import { readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

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
  const bboxes = []
  const stack = []

  for (let start = 0; start < width * height; start++) {
    if (labels[start] !== -1 || alpha[start] <= threshold) continue
    const id = sizes.length
    labels[start] = id
    stack.push(start)
    let size = 0
    let minX = width, maxX = 0, minY = height, maxY = 0
    while (stack.length) {
      const idx = stack.pop()
      size++
      const x = idx % width
      const y = (idx / width) | 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
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
        }
      }
    }
    sizes.push(size)
    bboxes.push({ minX, maxX, minY, maxY })
  }
  return { sizes, bboxes }
}

async function checkFile(file) {
  const img = sharp(file)
  const { width, height } = await img.metadata()
  const { data } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const alpha = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3]

  const { sizes, bboxes } = labelComponents(alpha, width, height, 10)
  if (sizes.length <= 1) return null

  const maxSize = Math.max(...sizes)
  const strays = []
  sizes.forEach((size, id) => {
    if (size === maxSize) return
    // เศษที่เล็กกว่า main blob เกิน 200 เท่า และเล็กกว่า 400px ถือว่าน่าสงสัย
    if (size < maxSize / 200 && size < 400) {
      strays.push({ size, ...bboxes[id] })
    }
  })
  if (strays.length === 0) return null
  return { file, width, height, mainSize: maxSize, strays }
}

async function main() {
  const results = []
  for (const dir of TARGET_DIRS) {
    const files = await listPngs(dir)
    for (const file of files) {
      const res = await checkFile(file)
      if (res) results.push(res)
    }
  }
  if (results.length === 0) {
    console.log('ไม่เจอจุดลอยหลุด — สะอาดทุกไฟล์')
    return
  }
  for (const r of results) {
    console.log(`\n${r.file.replace(ROOT + '\\', '')}`)
    for (const s of r.strays) {
      console.log(
        `  stray ${s.size}px at (${s.minX},${s.minY})-(${s.maxX},${s.maxY})`
      )
    }
  }
  console.log(`\nรวม ${results.length} ไฟล์ที่มีจุดลอยหลุด`)
}

await main()

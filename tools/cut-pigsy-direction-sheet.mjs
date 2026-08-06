/**
 * ตัดเฟรมเดินของตือโป๊ยก่ายจาก "ชีตทิศเดียว" ความละเอียดสูง
 *
 *   node tools/cut-pigsy-direction-sheet.mjs --sheet=<ไฟล์> --direction=<ทิศ> [--preview]
 *
 * ตัวอย่าง
 *   node tools/cut-pigsy-direction-sheet.mjs  *     --sheet=assets/archive/characters/pigsy-v7-left.png --direction=left
 *
 * ทิศที่รับ: down, down-left, down-right, left, right, up-left, up-right, up
 *
 * ─── ทำไมต้องแยกภาพทีละทิศ ─────────────────────────────────
 * เกมแสดงตัวละครสูงราว 273px บนจอ ถ้ายัด 8 ทิศ x 8 เฟรมลงภาพ 1536x1024 ภาพเดียว
 * ตัวละครจะเหลือสูงแค่ ~119px ต้องขยาย 2.3 เท่าตอนเอาไปใช้ ภาพเลยแตก
 * ชีตทิศเดียวใส่ได้ 8 เฟรมที่ตัวสูง ~270px ซึ่งพอดีกับที่ใช้จริง ไม่ต้องขยายเลย
 * ───────────────────────────────────────────────────────────
 *
 * สคริปต์นี้ตรวจจับแถวและคอลัมน์เองทั้งหมด จึงใช้กับเลย์เอาต์ไหนก็ได้ (4x2, 3x3, 4x3)
 * ข้อความหัวเรื่องและเลขกำกับเฟรมถูกคัดออกด้วยขนาด — ต้องเล็กกว่าตัวละครมากพอ
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--') && arg.includes('='))
    .map((arg) => arg.slice(2).split('=')),
)

const VALID_DIRECTIONS = [
  'down',
  'down-left',
  'down-right',
  'left',
  'right',
  'up-left',
  'up-right',
  'up',
]
/** ลำดับต้องตรงกับ TURN_INDEX ใน WukongAdventure.tsx เป๊ะ ๆ */
const TURN_ORDER = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left']

const DIRECTION = args.get('direction')
if (!VALID_DIRECTIONS.includes(DIRECTION)) {
  console.error(`ต้องระบุ --direction เป็นหนึ่งใน: ${VALID_DIRECTIONS.join(', ')}`)
  process.exit(1)
}
const SHEET = resolve(ROOT, args.get('sheet') ?? '')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const TURN_DIR = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const PREVIEW = process.argv.includes('--preview')


const BG = [0, 0, 0]
const BG_TOLERANCE = 26
const EDGE_FULL_DISTANCE = 70
const CLOSE_RADIUS = 3
const FILLED_BG_LIMIT = 12
const FILLED_BG_MIN_AREA = 25

const CANVAS_W = 640
const CANVAS_H = 512
/** ค่าอ้างอิงเดียวกับชุด v4 เพื่อให้ทิศขวาขนาดเท่าทิศอื่นและเท้าอยู่ระดับเดียวกัน */
const TARGET_HEAD_HEIGHT = 60
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 349.5

const FRAME_COUNT = 8
function bgDistance(data, index, channels) {
  const dr = data[index * channels] - BG[0]
  const dg = data[index * channels + 1] - BG[1]
  const db = data[index * channels + 2] - BG[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function extractCell(data, W, channels, box) {
  const { x0, y0, x1, y1 } = box
  const w = x1 - x0
  const h = y1 - y0
  const at = (x, y) => (y0 + y) * W + (x0 + x)

  const seed = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bgDistance(data, at(x, y), channels) > BG_TOLERANCE) seed[y * w + x] = 1
    }
  }

  const morph = (input, radius, horizontal, wantAll) => {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let result = wantAll ? 1 : 0
        for (let d = -radius; d <= radius; d++) {
          const nx = horizontal ? x + d : x
          const ny = horizontal ? y : y + d
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const value = input[ny * w + nx]
          if (wantAll && !value) {
            result = 0
            break
          }
          if (!wantAll && value) {
            result = 1
            break
          }
        }
        out[y * w + x] = result
      }
    }
    return out
  }

  let mask = morph(morph(seed, CLOSE_RADIUS, true, false), CLOSE_RADIUS, false, false)
  mask = morph(morph(mask, CLOSE_RADIUS, true, true), CLOSE_RADIUS, false, true)
  for (let i = 0; i < mask.length; i++) if (seed[i]) mask[i] = 1

  const outside = new Uint8Array(w * h)
  const stack = []
  const pushOutside = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const local = y * w + x
    if (outside[local] || mask[local]) return
    outside[local] = 1
    stack.push(local)
  }
  for (let x = 0; x < w; x++) {
    pushOutside(x, 0)
    pushOutside(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    pushOutside(0, y)
    pushOutside(w - 1, y)
  }
  while (stack.length > 0) {
    const local = stack.pop()
    const x = local % w
    const y = (local / w) | 0
    pushOutside(x + 1, y)
    pushOutside(x - 1, y)
    pushOutside(x, y + 1)
    pushOutside(x, y - 1)
  }

  // คืนความโปร่งให้ช่องว่างที่ closing ถมทึบเกิน (ลบเป็นหย่อม ไม่ใช่รายพิกเซล
  // ไม่งั้นเงาเข้มในชุดจะถูกเจาะจนตัวพรุน)
  {
    const isFilledBg = (i) =>
      !outside[i] && !seed[i] && bgDistance(data, at(i % w, (i / w) | 0), channels) <= FILLED_BG_LIMIT
    const seen = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || !isFilledBg(i)) continue
      const blob = [i]
      seen[i] = 1
      const queue = [i]
      while (queue.length > 0) {
        const current = queue.pop()
        const x = current % w
        const y = (current / w) | 0
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const next = ny * w + nx
          if (seen[next] || !isFilledBg(next)) continue
          seen[next] = 1
          blob.push(next)
          queue.push(next)
        }
      }
      if (blob.length >= FILLED_BG_MIN_AREA) for (const p of blob) outside[p] = 1
    }
  }

  const componentOf = new Int32Array(w * h).fill(-1)
  const components = []
  for (let i = 0; i < w * h; i++) {
    if (componentOf[i] !== -1 || outside[i]) continue
    const id = components.length
    const pixels = [i]
    componentOf[i] = id
    const queue = [i]
    let minX = w
    let minY = h
    let maxX = -1
    let maxY = -1
    while (queue.length > 0) {
      const current = queue.pop()
      const x = current % w
      const y = (current / w) | 0
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const next = ny * w + nx
        if (componentOf[next] !== -1 || outside[next]) continue
        componentOf[next] = id
        pixels.push(next)
        queue.push(next)
      }
    }
    components.push({ pixels, minX, minY, maxX, maxY })
  }
  if (components.length === 0) return null
  components.sort((a, b) => b.pixels.length - a.pixels.length)
  const body = components[0]

  const inBody = new Uint8Array(w * h)
  for (const local of body.pixels) inBody[local] = 1

  const out = Buffer.alloc(w * h * 4)
  for (const local of body.pixels) {
    const x = local % w
    const y = (local / w) | 0
    const onEdge =
      x === 0 ||
      y === 0 ||
      x === w - 1 ||
      y === h - 1 ||
      !inBody[local - 1] ||
      !inBody[local + 1] ||
      !inBody[local - w] ||
      !inBody[local + w]
    const distance = bgDistance(data, at(x, y), channels)
    const alpha = onEdge ? Math.min(255, Math.round((distance / EDGE_FULL_DISTANCE) * 255)) : 255
    const source = at(x, y) * channels
    const target = local * 4
    out[target] = data[source]
    out[target + 1] = data[source + 1]
    out[target + 2] = data[source + 2]
    out[target + 3] = alpha
  }

  return {
    buffer: out,
    width: w,
    height: h,
    bbox: { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
  }
}

/** วัดหัวหมูจากพิกเซลสีเนื้อก้อนใหญ่สุด — ไม้บรรทัดที่ขนาดคงที่ทุกท่า */
function measureHead(rgba, w, h) {
  const isSkin = (i) => {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    return rgba[i * 4 + 3] > 128 && r > 150 && r - b > 30 && r - g > 15
  }
  const seen = new Uint8Array(w * h)
  let best = null
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || !isSkin(i)) continue
    const queue = [i]
    seen[i] = 1
    let count = 0
    let minY = h
    let maxY = -1
    while (queue.length > 0) {
      const current = queue.pop()
      count++
      const y = (current / w) | 0
      const x = current % w
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const next = ny * w + nx
        if (seen[next] || !isSkin(next)) continue
        seen[next] = 1
        queue.push(next)
      }
    }
    if (!best || count > best.count) best = { count, height: maxY - minY + 1 }
  }
  return best
}

/** ระดับเท้า + กึ่งกลางเท้า — รอแถวที่กว้างพอเพื่อข้ามปลายด้ามคราด/ชายผ้าคลุมที่บาง */
function measureFeet(rgba, w, h) {
  for (let y = h - 1; y >= 0; y--) {
    let first = -1
    let last = -1
    let count = 0
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > 128) {
        if (first === -1) first = x
        last = x
        count++
      }
    }
    if (count >= 8) return { y, centerX: (first + last) / 2 }
  }
  return { y: h - 1, centerX: w / 2 }
}

/** เลือก n เฟรมกระจายทั่ววงจร ไม่ใช่ตัด n ตัวแรก จะได้ครบรอบก้าวขา */
function sampleEvenly(list, n) {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / n)])
}

/** หาช่วง x ของตัวละครแต่ละตัวในแถว โดยข้ามหัวเรื่องที่แคบกว่า */
function findSpriteColumns(data, W, channels, y0, y1) {
  const runs = []
  let start = -1
  for (let x = 0; x < W; x++) {
    let has = false
    for (let y = y0; y <= y1; y++) {
      if (bgDistance(data, y * W + x, channels) > BG_TOLERANCE) {
        has = true
        break
      }
    }
    if (has && start === -1) start = x
    else if (!has && start !== -1) {
      runs.push([start, x - 1])
      start = -1
    }
  }
  if (start !== -1) runs.push([start, W - 1])

  // เกณฑ์ความกว้างปรับตามชีตเอง ไม่ใช่ค่าตายตัว — เลย์เอาต์ต่างกันตัวละครกว้างไม่เท่ากัน
  // กลุ่มที่แคบกว่าครึ่งหนึ่งของกลุ่มที่กว้างสุด = หัวเรื่อง/ป้ายชื่อ ไม่ใช่ตัวละคร
  const widest = Math.max(...runs.map(([a, b]) => b - a + 1), 0)
  return runs.filter(([a, b]) => b - a + 1 >= widest * 0.5)
}

/**
 * หาแถวของตัวละครเอง — ไม่ต้องวัดพิกัดมาใส่เองทุกชีต
 * แถวที่เตี้ยกว่าครึ่งของแถวที่สูงสุดคือเลขกำกับเฟรม/ข้อความ ไม่ใช่ตัวละคร
 */
function findRowBands(data, W, H, channels) {
  const bands = []
  let start = -1
  for (let y = 0; y <= H; y++) {
    let has = false
    if (y < H) {
      let count = 0
      for (let x = 0; x < W; x++) {
        if (bgDistance(data, y * W + x, channels) > BG_TOLERANCE) count++
      }
      has = count > W * 0.01
    }
    if (has && start === -1) start = y
    else if (!has && start !== -1) {
      bands.push([start, y - 1])
      start = -1
    }
  }
  const tallest = Math.max(...bands.map(([a, b]) => b - a + 1), 0)
  return bands.filter(([a, b]) => b - a + 1 >= tallest * 0.5)
}

async function main() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels } = info

  const rowBands = findRowBands(data, W, H, channels)
  const cells = []
  for (const [y0, y1] of rowBands) {
    const columns = findSpriteColumns(data, W, channels, y0, y1)
    for (const [cx0, cx1] of columns) {
      const cell = extractCell(data, W, channels, { x0: cx0 - 5, y0: y0 - 5, x1: cx1 + 6, y1: y1 + 6 })
      if (cell) {
        cells.push({
          cell,
          head: measureHead(cell.buffer, cell.width, cell.height),
          feet: measureFeet(cell.buffer, cell.width, cell.height),
        })
      }
    }
  }
  console.log(`ทิศ ${DIRECTION}: พบ ${rowBands.length} แถว ตัดได้ ${cells.length} เฟรม`)
  if (cells.length === 0) {
    console.error('ไม่พบตัวละครในชีตเลย — ตรวจว่าพื้นหลังเป็นสีดำและไม่มีกรอบล้อมรอบภาพ')
    process.exit(1)
  }

  const heads = cells
    .map((entry) => entry.head?.height)
    .filter(Boolean)
    .toSorted((a, b) => a - b)
  const medianHead = heads[Math.floor(heads.length / 2)]
  const scale = TARGET_HEAD_HEIGHT / medianHead
  console.log(`หัวในชีต (มัธยฐาน) ${medianHead}px → สเกล ${scale.toFixed(4)}`)

  const render = async ({ cell, feet }, file) => {
    const { bbox } = cell
    const cropW = bbox.maxX - bbox.minX + 1
    const cropH = bbox.maxY - bbox.minY + 1
    const scaledW = Math.max(1, Math.round(cropW * scale))
    const scaledH = Math.max(1, Math.round(cropH * scale))

    const sprite = await sharp(cell.buffer, {
      raw: { width: cell.width, height: cell.height, channels: 4 },
    })
      .extract({ left: bbox.minX, top: bbox.minY, width: cropW, height: cropH })
      .resize(scaledW, scaledH, { kernel: 'lanczos3' })
      .png()
      .toBuffer()

    await sharp({
      create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: sprite,
          left: Math.round(TARGET_FEET_CENTER_X - (feet.centerX - bbox.minX) * scale),
          top: Math.round(TARGET_FEET_Y - (feet.y - bbox.minY + 0.5) * scale),
        },
      ])
      .png()
      .toFile(file)
  }

  await mkdir(WALK_DIR, { recursive: true })
  await mkdir(TURN_DIR, { recursive: true })

  const picked = sampleEvenly(cells, FRAME_COUNT)
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    await render(picked[frame], join(WALK_DIR, `pigsy-walk-${DIRECTION}-${frame}.png`))
  }
  console.log(`เขียนเฟรมเดินแล้ว ${FRAME_COUNT} ไฟล์`)

  const turnIndex = TURN_ORDER.indexOf(DIRECTION)
  await render(cells[0], join(TURN_DIR, `pigsy-turn-${turnIndex}.png`))
  console.log(`อัปเดตเฟรมหันทิศ (pigsy-turn-${turnIndex}.png) แล้ว`)

  if (PREVIEW) {
    const tiles = []
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      tiles.push({
        input: await sharp(join(WALK_DIR, `pigsy-walk-${DIRECTION}-${frame}.png`)).resize(240, 192).png().toBuffer(),
        left: (frame % 4) * 240,
        top: ((frame / 4) | 0) * 192,
      })
    }
    const previewPath = join(ROOT, `pigsy-${DIRECTION}-preview.png`)
    await sharp({
      create: { width: 960, height: 384, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
    })
      .composite(tiles)
      .png()
      .toFile(previewPath)
    console.log(`พรีวิว: ${previewPath}`)
  }
}

await main()

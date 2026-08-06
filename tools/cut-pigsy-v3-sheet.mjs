/**
 * ตัดสไปรต์ตือโป๊ยก่ายชุด v3 จาก assets/archive/characters/pigsy-v3-walk-sheet.png
 *
 *   node tools/cut-pigsy-v3-sheet.mjs [--preview]
 *
 * ชีตนี้ดีที่สุดเท่าที่ได้มา: 8 แถว (ทิศ) x 8 คอลัมน์ (เฟรม) = ครบ 64 เฟรมพอดีกับที่เกมใช้
 * มีภาพด้านข้างแท้ ๆ (LEFT/RIGHT) และทแยงครบทุกมุม จึงไม่ต้องพลิกกระจกสร้างทิศไหนขึ้นมาเลย
 * ต่างจากชีต v1/v2 ที่มีแค่มุมหน้ากับหลัง
 *
 * ─── ต่างจากชีตก่อนหน้าตรงไหน ────────────────────────────────
 * พื้นหลัง "ขาว" ไม่ใช่ดำ จึงต้องระวังคนละเรื่อง: ขอบตัวละครที่เบลนด์กับพื้นขาว
 * ถ้าเหมาทึบหมดจะเห็นเป็นขอบขาวเรืองรอบตัว (white halo) จึงไล่ alpha ตามระยะห่าง
 * จากสีขาวเฉพาะพิกเซลริมขอบ ส่วนข้างในบังคับทึบเต็มเพื่อไม่ให้ตัวโปร่ง
 *
 * ชีตมีเงาใต้เท้าเป็นสีเทาอ่อน ซึ่งไม่เอา เพราะฉากในเกมวาดเงาให้เองอยู่แล้ว
 * (ถ้าติดมาจะเห็นเงาซ้อนสองชั้น) เกณฑ์ WHITE_TOLERANCE ตัดเงาอ่อนออกไปพร้อมพื้นหลัง
 * ───────────────────────────────────────────────────────────
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(ROOT, 'assets', 'archive', 'characters', 'pigsy-v3-walk-sheet.png')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const TURN_DIR = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const IDLE_DIR = join(ROOT, 'assets', 'raw', 'characters')
const PREVIEW = process.argv.includes('--preview')

/**
 * แถวในชีตเรียงตามป้ายกำกับฝั่งซ้าย แม็ปเป็นชื่อทิศที่เกมใช้
 * ป้ายในชีตใช้ทิศเข็มทิศ (NORTH = ขึ้นบนจอ) ส่วนเกมใช้ up/down/left/right
 */
const ROWS = [
  { band: [13, 149], direction: 'down' }, // FRONT (SOUTH)
  { band: [157, 276], direction: 'up' }, // BACK (NORTH)
  { band: [283, 411], direction: 'left' }, // LEFT (WEST)
  { band: [414, 536], direction: 'right' }, // RIGHT (EAST)
  { band: [544, 656], direction: 'up-right' }, // NORTH-EAST
  { band: [665, 784], direction: 'up-left' }, // NORTH-WEST
  { band: [786, 902], direction: 'down-right' }, // SOUTH-EAST
  { band: [904, 1013], direction: 'down-left' }, // SOUTH-WEST
]

/** ขอบซ้าย-ขวาของทั้ง 8 คอลัมน์ (วัดจากโปรไฟล์แนวตั้ง) */
const COLUMNS = [
  [215, 330],
  [390, 509],
  [559, 682],
  [726, 848],
  [891, 1012],
  [1049, 1171],
  [1204, 1326],
  [1358, 1481],
]

const WHITE = [255, 255, 255]
/** ห่างจากสีขาวไม่ถึงเท่านี้ = พื้นหลังหรือเงาจาง ๆ ใต้เท้า ซึ่งไม่เอาทั้งคู่ */
const WHITE_TOLERANCE = 48
/** ห่างจากขาวเกินเท่านี้ = ทึบเต็ม ระหว่างกลางไล่ alpha ให้ขอบเนียนไม่เกิดขอบขาว */
const EDGE_FULL_DISTANCE = 95
/** สีเทาที่อิ่มสีไม่เกินนี้และไม่มืดเกิน SHADOW_MAX_DISTANCE = เงาที่วาดมาในชีต ไม่ใช่ตัวละคร */
const SHADOW_MAX_SATURATION = 18
const SHADOW_MAX_DISTANCE = 200
const CLOSE_RADIUS = 3

const CANVAS_W = 640
const CANVAS_H = 512
/**
 * ค่าอ้างอิงที่วัดจากสไปรต์ชุดก่อนหน้า ใช้ให้ตัวละครขึ้นจอขนาดเท่าเดิมหลังเปลี่ยนอาร์ต
 * canvas ยังเป็น 640x512 เท่าสไปรต์ตัวอื่นทุกตัวในเกม (ซุนหงอคง พระถัง) จะได้สเกลตรงกัน
 */
const TARGET_HEAD_HEIGHT = 60
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 349.5

const FRAME_COUNT = 8
const IDLE_FRAME_COUNT = 24

/** ลำดับเฟรมหันทิศต้องตรงกับ TURN_INDEX ใน WukongAdventure.tsx เป๊ะ ๆ */
const TURN_ORDER = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left']

function whiteDistance(data, index, channels) {
  const dr = data[index * channels] - WHITE[0]
  const dg = data[index * channels + 1] - WHITE[1]
  const db = data[index * channels + 2] - WHITE[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * เงาใต้เท้าที่วาดมาในชีต — ต้องตัดทิ้ง เพราะฉากในเกมวาดเงาให้เองแล้ว
 * (ดู .shadow ใน WukongAdventure.module.css) ถ้าเก็บไว้จะเห็นเงาซ้อนสองชั้น
 *
 * แยกด้วย "ความอิ่มสี" ไม่ใช่ความสว่าง: เงาเป็นสีเทาล้วน (วัดได้ 2-6) ส่วนส่วนที่สว่าง
 * ของตัวละคร (ผิวหมู ท้อง) เป็นสีชมพู/ส้มจึงอิ่มสีสูง (68-142) — ใช้ความสว่างอย่างเดียว
 * แยกไม่ได้เพราะเงากับผิวหมูสว่างพอ ๆ กัน
 *
 * จำกัดเฉพาะโทนสว่างด้วย (เงาวัดได้ห่างจากขาว ~135) เพื่อไม่ให้ไปโดนชุดสีกรมท่าเข้ม
 * ซึ่งอิ่มสีต่ำเหมือนกันแต่มืดกว่ามาก (ห่างจากขาว ~289)
 */
function isPaintedShadow(data, index, channels) {
  const r = data[index * channels]
  const g = data[index * channels + 1]
  const b = data[index * channels + 2]
  const saturation = Math.max(r, g, b) - Math.min(r, g, b)
  if (saturation > SHADOW_MAX_SATURATION) return false
  return whiteDistance(data, index, channels) <= SHADOW_MAX_DISTANCE
}

function extractCell(data, W, channels, box) {
  const { x0, y0, x1, y1 } = box
  const w = x1 - x0
  const h = y1 - y0
  const at = (x, y) => (y0 + y) * W + (x0 + x)

  const seed = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = at(x, y)
      if (whiteDistance(data, index, channels) <= WHITE_TOLERANCE) continue
      if (isPaintedShadow(data, index, channels)) continue
      seed[y * w + x] = 1
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

  // closing เชื่อมส่วนที่สีอ่อน (ท้อง ผิว) เกือบกลืนพื้นขาวจนขาดออกจากกัน
  let mask = morph(morph(seed, CLOSE_RADIUS, true, false), CLOSE_RADIUS, false, false)
  mask = morph(morph(mask, CLOSE_RADIUS, true, true), CLOSE_RADIUS, false, true)
  for (let i = 0; i < mask.length; i++) if (seed[i]) mask[i] = 1

  // เติมรูที่ตัวละครล้อมไว้ (ช่องว่างจริงเปิดออกสู่ขอบกรอบ จึงไม่โดนเติม)
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

  // ช่องว่างสีขาวที่ถูกถมทึบตอน closing (เช่นระหว่างคราดกับหัว) ต้องคืนความโปร่ง
  {
    const isFilledWhite = (i) => {
      if (outside[i] || seed[i]) return false
      const index = at(i % w, (i / w) | 0)
      return whiteDistance(data, index, channels) <= WHITE_TOLERANCE || isPaintedShadow(data, index, channels)
    }
    const seen = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || !isFilledWhite(i)) continue
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
          if (seen[next] || !isFilledWhite(next)) continue
          seen[next] = 1
          blob.push(next)
          queue.push(next)
        }
      }
      if (blob.length >= 25) for (const p of blob) outside[p] = 1
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

  // alpha: ข้างในทึบเต็ม ส่วนพิกเซลริมขอบไล่ตามระยะห่างจากสีขาว
  // ถ้าเหมาทึบหมดจะได้ขอบขาวเรือง ๆ รอบตัว เพราะพิกเซลริมขอบเบลนด์กับพื้นขาวมาแล้ว
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
    const distance = whiteDistance(data, at(x, y), channels)
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

/** วัดหัวหมูจากพิกเซลสีเนื้อก้อนใหญ่สุด — ขนาดคงที่ทุกท่า ต่างจากกรอบภาพที่คราดทำให้เพี้ยน */
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
      const x = current % w
      const y = (current / w) | 0
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

/** ระดับเท้า + กึ่งกลางเท้า — ข้ามปลายด้ามคราดที่บางด้วยการรอแถวที่กว้างพอ */
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

async function main() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, channels } = info

  const frames = []
  for (const { band, direction } of ROWS) {
    const [y0, y1] = band
    const cells = []
    for (const [cx0, cx1] of COLUMNS) {
      const cell = extractCell(data, W, channels, { x0: cx0 - 4, y0: y0 - 4, x1: cx1 + 5, y1: y1 + 5 })
      if (!cell) continue
      cells.push({
        cell,
        head: measureHead(cell.buffer, cell.width, cell.height),
        feet: measureFeet(cell.buffer, cell.width, cell.height),
      })
    }
    console.log(`${direction.padEnd(11)} ตัดได้ ${cells.length} เฟรม`)
    frames.push({ direction, cells })
  }

  const heads = frames
    .flatMap((row) => row.cells)
    .map((entry) => entry.head?.height)
    .filter(Boolean)
    .toSorted((a, b) => a - b)
  const medianHead = heads[Math.floor(heads.length / 2)]
  const scale = TARGET_HEAD_HEIGHT / medianHead
  console.log(`\nหัวในชีต (มัธยฐาน) ${medianHead}px → สเกล ${scale.toFixed(4)}`)

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

  for (const { direction, cells } of frames) {
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      await render(cells[frame % cells.length], join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`))
    }
  }
  console.log(`เขียนเฟรมเดินแล้ว ${ROWS.length * FRAME_COUNT} ไฟล์`)

  const byDirection = new Map(frames.map((row) => [row.direction, row.cells]))
  for (const [index, direction] of TURN_ORDER.entries()) {
    await render(byDirection.get(direction)[0], join(TURN_DIR, `pigsy-turn-${index}.png`))
  }
  console.log(`เขียนเฟรมหันทิศแล้ว ${TURN_ORDER.length} ไฟล์`)

  // ชีตนี้เป็นชุดเดินล้วน ไม่มีแถวท่านิ่ง — ใช้ท่าหันหน้าเฟรมแรกยืนนิ่งไว้ก่อน
  // (ปล่อยให้ idle เป็นอาร์ตชุดเก่าไม่ได้ เพราะคนละดีไซน์ ตัวจะเปลี่ยนหน้าตาตอนหยุดเดิน)
  const idlePose = byDirection.get('down')[0]
  for (let frame = 0; frame < IDLE_FRAME_COUNT; frame++) {
    await render(idlePose, join(IDLE_DIR, `pigsy-idle-${frame}.png`))
  }
  console.log(`เขียนเฟรมยืนเฉยแล้ว ${IDLE_FRAME_COUNT} ไฟล์ (ท่าเดียวซ้ำ — ชีตยังไม่มีท่าหายใจ)`)

  if (PREVIEW) {
    const tiles = []
    for (const [row, { direction }] of ROWS.entries()) {
      for (let frame = 0; frame < FRAME_COUNT; frame++) {
        tiles.push({
          input: await sharp(join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`))
            .resize(180, 144)
            .png()
            .toBuffer(),
          left: frame * 180,
          top: row * 144,
        })
      }
    }
    const previewPath = join(ROOT, 'pigsy-v3-preview.png')
    await sharp({
      create: {
        width: 180 * FRAME_COUNT,
        height: 144 * ROWS.length,
        channels: 4,
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      },
    })
      .composite(tiles)
      .png()
      .toFile(previewPath)
    console.log(`พรีวิว: ${previewPath} (แถวเรียงตาม ${ROWS.map((r) => r.direction).join(', ')})`)
  }
}

await main()

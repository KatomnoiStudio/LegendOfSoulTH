/**
 * ตัดสไปรต์ตือโป๊ยก่ายชุด v4 จาก assets/archive/characters/pigsy-v4-walk-sheet.png
 *
 *   node tools/cut-pigsy-v4-sheet.mjs [--preview]
 *
 * ชีตนี้เป็นตาราง 8 แถว (ทิศ) x 11 คอลัมน์ (เฟรม) บนพื้นดำสนิท มีป้ายชื่อทิศเป็น
 * ตัวอักษรอยู่คอลัมน์ซ้ายสุด (x < 95) ซึ่งต้องไม่ติดมา
 *
 * วาดมาครบ 8 ทิศจริงทุกมุม รวมทั้งด้านข้างแท้ (LEFT/RIGHT) จึงไม่ต้องพลิกกระจก
 * สร้างทิศไหนขึ้นมาเอง เกมใช้ทิศละ 8 เฟรม จึงเลือก 8 จาก 11 แบบกระจายทั่ววงจรก้าว
 * (ไม่ใช่ตัด 8 ตัวแรก ไม่งั้นจะได้แค่ครึ่งวงจรแล้ววนกลับ ดูกระตุก)
 *
 * วิธีแยกพื้นหลังเหมือนชุดก่อน ๆ: closing เชื่อมส่วนที่เงาเข้มตัดขาด แล้วเติมรูข้างใน
 * ปิดท้ายด้วยการกวาดหย่อมสีดำที่ถูกถมทึบเกินออก (ดูเหตุผลแต่ละขั้นในโค้ด)
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(ROOT, 'assets', 'archive', 'characters', 'pigsy-v4-walk-sheet.png')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const TURN_DIR = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const IDLE_DIR = join(ROOT, 'assets', 'raw', 'characters')
const PREVIEW = process.argv.includes('--preview')

/** แถวเรียงตามป้ายกำกับในชีต แม็ปเป็นชื่อทิศที่เกมใช้ */
const ROWS = [
  { band: [18, 122], direction: 'down' }, // DOWN (FRONT)
  { band: [143, 244], direction: 'down-left' }, // DOWN-LEFT
  { band: [265, 365], direction: 'down-right' }, // DOWN-RIGHT
  { band: [388, 489], direction: 'left' }, // LEFT
  { band: [511, 610], direction: 'right' }, // RIGHT
  { band: [625, 724], direction: 'up-left' }, // UP-LEFT
  { band: [741, 841], direction: 'up-right' }, // UP-RIGHT
  { band: [860, 959], direction: 'up' }, // UP (BACK)
]

/**
 * ขอบซ้าย-ขวาของทั้ง 11 คอลัมน์
 * คอลัมน์แรกเริ่มที่ 100 เพราะป้ายชื่อทิศกินพื้นที่ถึง x=79 — ถ้าเริ่มซ้ายกว่านี้
 * ตัวอักษรจะติดมาในเฟรม (ตรวจแล้ว: ป้าย x=16-79, สไปรต์ตัวแรกเริ่ม x=105)
 */
const COLUMNS = [
  [100, 220],
  [232, 345],
  [358, 472],
  [484, 600],
  [611, 728],
  [739, 850],
  [865, 975],
  [989, 1102],
  [1115, 1228],
  [1240, 1351],
  [1367, 1479],
]

const BG = [0, 0, 0]
/** ห่างจากดำไม่ถึงเท่านี้ = พื้นหลัง */
const BG_TOLERANCE = 26
/** ห่างจากดำเกินเท่านี้ = ทึบเต็ม ระหว่างกลางไล่ alpha ให้ขอบเนียนไม่เกิดขอบดำ */
const EDGE_FULL_DISTANCE = 70
const CLOSE_RADIUS = 3
/** พิกเซลที่ closing เติมเข้ามาและดำเกือบสนิท = สะพาน/ช่องว่างที่ถูกถม ไม่ใช่ตัวละคร */
const FILLED_BG_LIMIT = 12
/** หย่อมที่ถูกถมทึบและใหญ่ถึงเท่านี้ = ช่องว่างจริง (เล็กกว่านี้คือเงาในชุด ต้องเก็บไว้) */
const FILLED_BG_MIN_AREA = 25

const CANVAS_W = 640
const CANVAS_H = 512
/** ค่าอ้างอิงจากสไปรต์ชุดก่อน ใช้ให้ตัวละครขึ้นจอขนาดเท่าเดิมและเท้าอยู่ระดับเดิม */
const TARGET_HEAD_HEIGHT = 60
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 349.5

const FRAME_COUNT = 8
const IDLE_FRAME_COUNT = 24

/** ลำดับเฟรมหันทิศต้องตรงกับ TURN_INDEX ใน WukongAdventure.tsx เป๊ะ ๆ */
const TURN_ORDER = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left']

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

  // closing เชื่อมส่วนที่เงาเข้มเกือบกลืนพื้นดำจนตัวละครขาดออกเป็นชิ้น ๆ
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

  // คืนความโปร่งให้ช่องว่างที่ถูกถมทึบเกิน (เช่นระหว่างคราดกับหัว ที่ถูกล้อมจนนับเป็นรู)
  // ลบเป็นหย่อม ไม่ใช่รายพิกเซล เพราะจุดดำเล็ก ๆ กระจัดกระจายคือเงาในชุด ลบแล้วตัวจะพรุน
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

  // alpha: ข้างในทึบเต็ม ริมขอบไล่ตามระยะห่างจากพื้นหลัง เพื่อไม่ให้เกิดขอบดำแข็ง ๆ
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

/**
 * หาขอบซ้ายจริงของสไปรต์ในคอลัมน์แรก โดยข้ามป้ายชื่อทิศที่อยู่ติดกัน
 *
 * ใช้ค่าคงที่ตายตัวไม่ได้ เพราะป้ายแต่ละแถวยาวไม่เท่ากัน ("DOWN-RIGHT" ยาวจนชิดสไปรต์
 * เหลือช่องว่างแค่ 1px — พอ closing รัศมี 3 ทำงาน ตัวอักษรจะถูกเชื่อมติดเข้ากับตัวละคร
 * กลายเป็นก้อนเดียวจนคัดออกทีหลังไม่ได้)
 *
 * แยกด้วย "ความสูงของเนื้อหาในคอลัมน์นั้น": ตัวอักษรสูงราว 13px ส่วนตัวละครสูงเกือบ
 * เต็มแถว จึงหาคอลัมน์แรกที่มีเนื้อหาสูงเกิน 40% ของความสูงแถวเป็นขอบซ้ายของสไปรต์
 */
function findSpriteLeftEdge(data, W, channels, searchFrom, searchTo, y0, y1) {
  const bandHeight = y1 - y0 + 1
  for (let x = searchFrom; x <= searchTo; x++) {
    let top = -1
    let bottom = -1
    for (let y = y0; y <= y1; y++) {
      if (bgDistance(data, y * W + x, channels) > BG_TOLERANCE) {
        if (top === -1) top = y
        bottom = y
      }
    }
    if (top !== -1 && bottom - top + 1 > bandHeight * 0.4) return x
  }
  return searchTo
}

/** เลือก n เฟรมกระจายทั่ววงจร ไม่ใช่ตัด n ตัวแรก จะได้ครบรอบก้าวขา */
function sampleEvenly(list, n) {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / n)])
}

async function main() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, channels } = info

  const rows = []
  for (const { band, direction } of ROWS) {
    const [y0, y1] = band
    const cells = []
    for (const [index, [cx0, cx1]] of COLUMNS.entries()) {
      // คอลัมน์แรกเท่านั้นที่ติดกับป้ายชื่อทิศ จึงต้องหาขอบซ้ายจริงเป็นแถว ๆ ไป
      const left = index === 0 ? findSpriteLeftEdge(data, W, channels, 82, cx1, y0, y1) - 2 : cx0 - 4
      const cell = extractCell(data, W, channels, { x0: left, y0: y0 - 5, x1: cx1 + 5, y1: y1 + 6 })
      if (cell) cells.push({ cell, head: measureHead(cell.buffer, cell.width, cell.height), feet: measureFeet(cell.buffer, cell.width, cell.height) })
    }
    console.log(`${direction.padEnd(11)} ตัดได้ ${cells.length} เฟรม`)
    rows.push({ direction, cells })
  }

  const heads = rows
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

  for (const { direction, cells } of rows) {
    const picked = sampleEvenly(cells, FRAME_COUNT)
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      await render(picked[frame % picked.length], join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`))
    }
  }
  console.log(`เขียนเฟรมเดินแล้ว ${ROWS.length * FRAME_COUNT} ไฟล์`)

  const byDirection = new Map(rows.map((row) => [row.direction, row.cells]))
  for (const [index, direction] of TURN_ORDER.entries()) {
    await render(byDirection.get(direction)[0], join(TURN_DIR, `pigsy-turn-${index}.png`))
  }
  console.log(`เขียนเฟรมหันทิศแล้ว ${TURN_ORDER.length} ไฟล์`)

  // ชีตเป็นชุดเดินล้วน ไม่มีแถวท่าหายใจ — ใช้ท่าหันหน้าเฟรมแรกยืนนิ่งไว้ก่อน
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
          input: await sharp(join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`)).resize(180, 144).png().toBuffer(),
          left: frame * 180,
          top: row * 144,
        })
      }
    }
    const previewPath = join(ROOT, 'pigsy-v4-preview.png')
    await sharp({
      create: { width: 180 * FRAME_COUNT, height: 144 * ROWS.length, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
    })
      .composite(tiles)
      .png()
      .toFile(previewPath)
    console.log(`พรีวิว: ${previewPath} (แถวเรียงตาม ${ROWS.map((r) => r.direction).join(', ')})`)
  }
}

await main()

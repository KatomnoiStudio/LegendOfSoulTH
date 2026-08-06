/**
 * ตัดสไปรต์ตือโป๊ยก่ายชุดใหม่ (v2) จาก assets/archive/characters/pigsy-v2-sheet.png
 *
 *   node tools/cut-pigsy-v2-sheet.mjs [--preview]
 *
 * ชีตเป็นตาราง 9 แถวบนพื้นดำสนิท ไม่มีเส้นกริด ไม่มีเลขกำกับเฟรม
 *   แถว 1  หน้าตรง          (13 เฟรม)  → ทิศ down
 *   แถว 2  หลัง 3/4 เอียงซ้าย            → ทิศ up-left (+ พลิกกระจกเป็น up-right)
 *   แถว 3  หลังตรง                       → ทิศ up
 *   แถว 4  หน้า 3/4 เอียงซ้าย            → ทิศ down-left, left (+ พลิกเป็น down-right, right)
 *   แถว 5  ท่านิ่ง/ท่าทาง                 → เฟรมยืนเฉย (idle) และเฟรมหันทิศ (turnaround)
 *   แถว 6  ควันแปลงร่าง                   ← ยังไม่ได้ใช้ในเกม เก็บไว้ในชีต
 *   แถว 7-9 ร่างมนุษย์                    ← ยังไม่ได้ใช้ในเกม เก็บไว้ในชีต
 *
 * ชีตมีมุมมองจริง 4 มุม (หน้า, หน้า 3/4, หลัง 3/4, หลัง) ไม่มีภาพด้านข้างแท้ ๆ
 * จึงประกอบครบ 8 ทิศด้วยการพลิกกระจกฝั่งซ้ายไปเป็นฝั่งขวา ซึ่งเป็นวิธีมาตรฐานของเกม 2D
 *
 * วิธีแยกพื้นหลังใช้ชุดเดียวกับ tools/cut-pigsy-walk-sheet.mjs (closing + ลบสะพาน +
 * เติมรู + เก็บก้อนใหญ่สุด) เพราะชุดสีของตัวละครมีส่วนเข้มจนเกือบกลืนพื้นหลังเหมือนกัน
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(ROOT, 'assets', 'archive', 'characters', 'pigsy-v2-sheet.png')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const TURN_DIR = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const IDLE_DIR = join(ROOT, 'assets', 'raw', 'characters')
const PREVIEW = process.argv.includes('--preview')

/** ขอบบน-ล่างของแต่ละแถวในชีต (วัดจากโปรไฟล์ความสว่าง) */
const ROW_BANDS = [
  [17, 102], // 1 หน้าตรง
  [116, 200], // 2 หลัง 3/4
  [207, 290], // 3 หลังตรง
  [302, 385], // 4 หน้า 3/4
  [404, 489], // 5 ท่านิ่ง/ท่าทาง
]

const BG = [0, 0, 0]
const BG_TOLERANCE = 26
const CLOSE_RADIUS = 3
const BRIDGE_BG_LIMIT = 10
// ตั้งต่ำกว่าชีตเก่า (40) ได้ เพราะชีตนี้พื้นหลังดำสนิทจริง ๆ พิกเซลที่ "ใกล้ดำมาก"
// จึงเป็นพื้นหลังแทบแน่นอน ไม่ใช่เงาในชุดตัวละคร — กวาดจุดดำเล็ก ๆ ตามขอบได้หมด
const BRIDGE_MAX_AREA = 8
/** ช่องว่างที่ถูกถมทึบและใหญ่ถึงเท่านี้ = พื้นหลังจริง ต้องคืนความโปร่ง (เล็กกว่านี้คือเงาในชุด) */
const FILLED_BG_MIN_AREA = 25

const CANVAS_W = 640
const CANVAS_H = 512
/**
 * ค่าอ้างอิงที่วัดจากสไปรต์ตือโป๊ยก่ายชุดเดิม (ก่อนเปลี่ยนเป็น v2)
 * ใช้เพื่อให้ตัวละครขึ้นจอ "ขนาดเท่าเดิมเป๊ะ" หลังเปลี่ยนอาร์ต ผู้เล่นจะไม่รู้สึกว่าตัวโตขึ้น/เล็กลง
 * และตำแหน่งเท้ายังตรงกับเงาและระบบความลึกในฉากเหมือนเดิม
 */
const TARGET_HEAD_HEIGHT = 60
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 349.5

/** เกมใช้ 8 เฟรมต่อทิศ (ดู FRAME_COUNT ใน WukongAdventure.tsx) */
const WALK_FRAME_COUNT = 8
/** เกมใช้ 24 เฟรมสำหรับท่ายืนเฉย (ดู idleCount ใน walkKits.ts) */
const IDLE_FRAME_COUNT = 24

/**
 * ทิศไหนเอาภาพจากแถวไหน และต้องพลิกกระจกหรือไม่
 * ชีตไม่มีภาพด้านข้างแท้ ๆ 'left'/'right' จึงใช้มุมหน้า 3/4 ซึ่งใกล้เคียงที่สุด
 */
const DIRECTION_SOURCE = {
  down: { row: 0, mirror: false },
  'down-left': { row: 3, mirror: false },
  left: { row: 3, mirror: false },
  'up-left': { row: 1, mirror: false },
  up: { row: 2, mirror: false },
  'up-right': { row: 1, mirror: true },
  right: { row: 3, mirror: true },
  'down-right': { row: 3, mirror: true },
}

/** ลำดับเฟรมหันทิศต้องตรงกับ TURN_INDEX ใน WukongAdventure.tsx เป๊ะ ๆ */
const TURN_ORDER = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left']

function colorDistance(data, index, channels) {
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
      if (colorDistance(data, at(x, y), channels) > BG_TOLERANCE) seed[y * w + x] = 1
    }
  }

  const box1D = (input, radius, horizontal, wantAll) => {
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

  let mask = box1D(box1D(seed, CLOSE_RADIUS, true, false), CLOSE_RADIUS, false, false)
  mask = box1D(box1D(mask, CLOSE_RADIUS, true, true), CLOSE_RADIUS, false, true)
  for (let i = 0; i < mask.length; i++) if (seed[i]) mask[i] = 1

  // ลบแผ่นที่ closing ถมช่องว่างจริง (เช่นระหว่างคราดกับหัว) แต่เก็บเส้นเชื่อมบาง ๆ ไว้
  {
    const isBridge = (i) =>
      mask[i] && !seed[i] && colorDistance(data, at(i % w, (i / w) | 0), channels) <= BRIDGE_BG_LIMIT
    const seen = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      if (seen[i] || !isBridge(i)) continue
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
          if (seen[next] || !isBridge(next)) continue
          seen[next] = 1
          blob.push(next)
          queue.push(next)
        }
      }
      if (blob.length >= BRIDGE_MAX_AREA) for (const p of blob) mask[p] = 0
    }
  }

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

  // กวาดพื้นหลังที่หลุดเข้ามาตอน closing/เติมรูออกให้หมด
  //
  // ทำได้ตรง ๆ กับชีตนี้เพราะพื้นหลังดำสนิทจริง: พิกเซลที่ "ไม่ได้อยู่ในเมล็ดเริ่มต้น"
  // (คือไม่ผ่านเกณฑ์ว่าสว่างพอจะเป็นตัวละคร) และ "ดำเกือบสนิท" = พื้นหลังแน่นอน
  // ส่วนที่มืดของตัวละครเอง (ชุดน้ำเงินเข้ม เกราะในเงา) สว่างพอจะอยู่ในเมล็ดอยู่แล้ว
  //
  // จำเป็นต้องทำหลังเติมรู เพราะช่องว่างระหว่างหัวกับคราดถูกตัวละครล้อมจนนับเป็น
  // "รูข้างใน" แล้วโดนถมทึบ กลายเป็นลิ่มดำที่ไม่มีในต้นฉบับ
  // ลบเป็น "หย่อม" ไม่ใช่รายพิกเซล: หย่อมใหญ่คือช่องว่างจริงที่ถูกถม ส่วนจุดดำเล็ก ๆ
  // กระจัดกระจายคือรายละเอียดเงาในชุด ถ้าลบด้วยจะกลายเป็นตัวพรุนเป็นจุด ๆ
  {
    const isFilledBg = (i) =>
      !outside[i] && !seed[i] && colorDistance(data, at(i % w, (i / w) | 0), channels) <= BRIDGE_BG_LIMIT
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

  // เก็บก้อนใหญ่สุด = ตัวละคร (ชีตนี้ไม่มีเลขกำกับเฟรม แต่ยังกันเศษข้างเคียงไว้)
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

  const out = Buffer.alloc(w * h * 4)
  for (const local of body.pixels) {
    const x = local % w
    const y = (local / w) | 0
    const source = at(x, y) * channels
    const target = local * 4
    out[target] = data[source]
    out[target + 1] = data[source + 1]
    out[target + 2] = data[source + 2]
    out[target + 3] = 255
  }

  return {
    buffer: out,
    width: w,
    height: h,
    bbox: { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
  }
}

/** วัดหัวหมูจากพิกเซลสีเนื้อก้อนใหญ่สุด — ไม้บรรทัดที่ขนาดคงที่ทุกท่า ต่างจากกรอบภาพที่คราดทำให้เพี้ยน */
function measureHead(rgba, w, h) {
  const isSkin = (i) => {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    return rgba[i * 4 + 3] > 128 && r > 140 && r - b > 35 && r - g > 20
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

/** ระดับเท้า + กึ่งกลางเท้า — ไล่จากล่างขึ้นจนเจอแถวที่กว้างพอ เพื่อข้ามปลายด้ามคราดที่บาง */
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

/** หาขอบซ้าย-ขวาของแต่ละเฟรมในแถว จากช่องว่างพื้นหลังที่คั่นอยู่ */
function findColumns(data, W, channels, y0, y1) {
  const occupied = []
  for (let x = 6; x < W - 6; x++) {
    let has = false
    for (let y = y0; y <= y1; y++) {
      if (colorDistance(data, y * W + x, channels) > BG_TOLERANCE) {
        has = true
        break
      }
    }
    occupied.push(has)
  }
  const segments = []
  let start = -1
  for (let i = 0; i <= occupied.length; i++) {
    if (i < occupied.length && occupied[i]) {
      if (start === -1) start = i
    } else if (start !== -1) {
      if (i - start >= 15) segments.push({ x0: Math.max(0, start + 6 - 3), x1: i + 6 + 3 })
      start = -1
    }
  }
  return segments
}

/** เลือก n เฟรมกระจายทั่วรอบการเดิน ไม่ใช่ตัด n ตัวแรก จะได้ครบวงจรก้าวขา */
function sampleEvenly(list, n) {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / n)])
}

async function main() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, channels } = info

  // ตัดทุกเฟรมของ 5 แถวแรกเก็บไว้ก่อน แล้วค่อยแจกจ่ายไปตามทิศ
  const rows = []
  for (const [index, [y0, y1]] of ROW_BANDS.entries()) {
    const columns = findColumns(data, W, channels, y0, y1)
    const cells = []
    for (const column of columns) {
      const cell = extractCell(data, W, channels, { x0: column.x0, y0: y0 - 3, x1: column.x1, y1: y1 + 4 })
      if (!cell) continue
      cells.push({
        cell,
        head: measureHead(cell.buffer, cell.width, cell.height),
        feet: measureFeet(cell.buffer, cell.width, cell.height),
      })
    }
    console.log(`แถว ${index + 1}: ตัดได้ ${cells.length} เฟรม`)
    rows.push(cells)
  }

  // สเกลเดียวใช้ร่วมทุกเฟรม เทียบจากขนาดหัว ให้ตัวขึ้นจอเท่าสไปรต์ชุดเดิมเป๊ะ ๆ
  const heads = rows
    .flat()
    .map((entry) => entry.head?.height)
    .filter(Boolean)
    .toSorted((a, b) => a - b)
  const medianHead = heads[Math.floor(heads.length / 2)]
  const scale = TARGET_HEAD_HEIGHT / medianHead
  console.log(`\nหัวในชีต (มัธยฐาน) ${medianHead}px → สเกล ${scale.toFixed(4)} (เป้าหมาย ${TARGET_HEAD_HEIGHT}px)`)

  /** วางตัวละครลง canvas 640x512 โดยยึดระดับเท้าให้ตรงกันทุกเฟรม */
  const render = async ({ cell, feet }, mirror, file) => {
    const { bbox } = cell
    const cropW = bbox.maxX - bbox.minX + 1
    const cropH = bbox.maxY - bbox.minY + 1
    const scaledW = Math.max(1, Math.round(cropW * scale))
    const scaledH = Math.max(1, Math.round(cropH * scale))

    const base = sharp(cell.buffer, { raw: { width: cell.width, height: cell.height, channels: 4 } })
      .extract({ left: bbox.minX, top: bbox.minY, width: cropW, height: cropH })
      .resize(scaledW, scaledH, { kernel: 'lanczos3' })
    const sprite = await (mirror ? base.flop() : base).png().toBuffer()

    const feetY = (feet.y - bbox.minY + 0.5) * scale
    const rawCenter = (feet.centerX - bbox.minX) * scale
    const feetCenter = mirror ? scaledW - rawCenter : rawCenter

    await sharp({
      create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: sprite,
          left: Math.round(TARGET_FEET_CENTER_X - feetCenter),
          top: Math.round(TARGET_FEET_Y - feetY),
        },
      ])
      .png()
      .toFile(file)
  }

  await mkdir(WALK_DIR, { recursive: true })
  await mkdir(TURN_DIR, { recursive: true })

  // เฟรมเดิน 8 ทิศ
  for (const [direction, source] of Object.entries(DIRECTION_SOURCE)) {
    const picked = sampleEvenly(rows[source.row], WALK_FRAME_COUNT)
    for (let frame = 0; frame < WALK_FRAME_COUNT; frame++) {
      const entry = picked[frame % picked.length]
      await render(entry, source.mirror, join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`))
    }
  }
  console.log(`เขียนเฟรมเดินแล้ว ${Object.keys(DIRECTION_SOURCE).length * WALK_FRAME_COUNT} ไฟล์`)

  // เฟรมหันทิศ — ลำดับต้องตรงกับ TURN_INDEX ในเกม ไม่งั้นหยุดแล้วจะหันผิดด้าน
  for (const [index, direction] of TURN_ORDER.entries()) {
    const source = DIRECTION_SOURCE[direction]
    await render(rows[source.row][0], source.mirror, join(TURN_DIR, `pigsy-turn-${index}.png`))
  }
  console.log(`เขียนเฟรมหันทิศแล้ว ${TURN_ORDER.length} ไฟล์`)

  // เฟรมยืนเฉย — แถวท่านิ่งมีไม่ถึง 24 เฟรม เดินหน้า-ถอยหลังให้ครบรอบแบบไม่กระตุก
  const idleSource = rows[4]
  const pingPong = [...idleSource, ...idleSource.slice(1, -1).toReversed()]
  for (let frame = 0; frame < IDLE_FRAME_COUNT; frame++) {
    await render(pingPong[frame % pingPong.length], false, join(IDLE_DIR, `pigsy-idle-${frame}.png`))
  }
  console.log(`เขียนเฟรมยืนเฉยแล้ว ${IDLE_FRAME_COUNT} ไฟล์`)

  if (PREVIEW) {
    const tiles = []
    const directions = Object.keys(DIRECTION_SOURCE)
    for (const [row, direction] of directions.entries()) {
      for (let frame = 0; frame < WALK_FRAME_COUNT; frame++) {
        tiles.push({
          input: await sharp(join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`))
            .resize(160, 128)
            .png()
            .toBuffer(),
          left: frame * 160,
          top: row * 128,
        })
      }
    }
    const previewPath = join(ROOT, 'pigsy-v2-preview.png')
    await sharp({
      create: {
        width: 160 * WALK_FRAME_COUNT,
        height: 128 * directions.length,
        channels: 4,
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      },
    })
      .composite(tiles)
      .png()
      .toFile(previewPath)
    console.log(`พรีวิว: ${previewPath} (เรียงแถวตาม ${directions.join(', ')})`)
  }
}

await main()

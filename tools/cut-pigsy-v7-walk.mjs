/**
 * ตัดเฟรมเดินตือโป๊ยก่ายชุด v7 จาก assets/archive/characters/pigsy-v7-walk-sheet.png
 *
 *   node tools/cut-pigsy-v7-walk.mjs [--preview]
 *
 * ชีตนี้มี 5 ทิศ x 7 เฟรม — วาดเฉพาะฝั่งซ้ายกับหน้า/หลัง อีก 3 ทิศฝั่งขวาพลิกกระจกเอา
 * ตัวละครสูงราว 193px ดีกว่าชุด v6 ที่สูงแค่ 119px (เกมแสดงจริงราว 273px จึงเบลอน้อยลง)
 *
 * เกมใช้ทิศละ 8 เฟรม แต่ชีตให้มา 7 จึงรีแซมเปิลแบบกระจายทั่ววงจร (ได้ 0,1,2,3,3,4,5,6)
 * แทนการวนกลับไปเฟรม 0 ซึ่งจะเห็นเป็นสะดุดตอนจบรอบ
 *
 * สไปรต์บางแถวติดกัน (ผ้าคลุมยื่นไปทับเฟรมข้าง ๆ) ไล่หาช่องว่างจึงแยกไม่ออก
 * ต้องแบ่งตามจำนวนคอลัมน์ แล้วหาจุดที่เนื้อหาบางที่สุดใกล้เส้นแบ่งในอุดมคติ
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(ROOT, 'assets', 'archive', 'characters', 'pigsy-v7-walk-sheet.png')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const TURN_DIR = join(ROOT, 'assets', 'raw', 'characters', 'turnaround')
const IDLE_DIR = join(ROOT, 'assets', 'raw', 'characters')
const PREVIEW = process.argv.includes('--preview')

/** แถวเรียงตามป้ายกำกับในชีต แม็ปเป็นชื่อทิศที่เกมใช้ */
const ROWS = [
  { band: [32, 224], direction: 'down' }, // หน้าตรง
  { band: [279, 459], direction: 'up' }, // หลังตรง
  { band: [495, 679], direction: 'left' }, // ด้านข้างซ้าย
  { band: [734, 904], direction: 'up-left' }, // หลังเฉียงซ้าย
  { band: [962, 1146], direction: 'down-left' }, // หน้าเฉียงซ้าย
]

/** จำนวนเฟรมต่อทิศในชีต (ต้องบอกเพราะสไปรต์บางแถวติดกันจนหาช่องว่างไม่ได้) */
const COLUMN_COUNT = 7

/**
 * ขอบซ้าย-ขวาของทั้ง 11 คอลัมน์
 * คอลัมน์แรกเริ่มที่ 100 เพราะป้ายชื่อทิศกินพื้นที่ถึง x=79 — ถ้าเริ่มซ้ายกว่านี้
 * ตัวอักษรจะติดมาในเฟรม (ตรวจแล้ว: ป้าย x=16-79, สไปรต์ตัวแรกเริ่ม x=105)
 */

const BG = [0, 0, 0]
/** ห่างจากดำไม่ถึงเท่านี้ = พื้นหลัง */
const BG_TOLERANCE = 26
/** ห่างจากดำเกินเท่านี้ = ทึบเต็ม ระหว่างกลางไล่ alpha ให้ขอบเนียนไม่เกิดขอบดำ */
const EDGE_FULL_DISTANCE = 70
/*
   รัศมีใหญ่กว่าชีตก่อน ๆ (3) เพราะอาร์ตชุดนี้เข้มกว่ามาก — วัดแล้วมีพิกเซลดำสนิท
   (0,0,0) อยู่ในตัวละครเท่าพื้นหลังเป๊ะ ๆ เป็นหย่อมกว้าง ต้องเชื่อมช่องที่กว้างขึ้นตาม
*/
const CLOSE_RADIUS = 6
/** พิกเซลที่ closing เติมเข้ามาและดำเกือบสนิท = สะพาน/ช่องว่างที่ถูกถม ไม่ใช่ตัวละคร */
const FILLED_BG_LIMIT = 12
/** หย่อมที่ถูกถมทึบและใหญ่ถึงเท่านี้ = ช่องว่างจริง (เล็กกว่านี้คือเงาในชุด ต้องเก็บไว้) */
/*
   เกณฑ์สูงกว่าชีตก่อน ๆ (25) มาก เพราะเงาในชุดชีตนี้ดำสนิทเป็นหย่อมใหญ่
   ถ้าใช้เกณฑ์เดิมจะเจาะเงาในตัวละครเป็นรูพรุนทั้งตัว เหลือเจาะเฉพาะช่องว่างจริง ๆ
   ที่ใหญ่มากพอ เช่นช่องระหว่างขากับผ้าคลุม
*/
const FILLED_BG_MIN_AREA = 400

const CANVAS_W = 640
const CANVAS_H = 512
/** ค่าอ้างอิงจากสไปรต์ชุดก่อน ใช้ให้ตัวละครขึ้นจอขนาดเท่าเดิมและเท้าอยู่ระดับเดิม */
/** ความสูงตัวละครบน canvas ที่ชุดสไปรต์ก่อนหน้าใช้ — คงไว้เท่าเดิมเพื่อไม่ให้ตัวโตขึ้น/เล็กลง */
const TARGET_BODY_HEIGHT = 333
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 349.5

const FRAME_COUNT = 8
const IDLE_FRAME_COUNT = 24

/**
 * ทิศฝั่งขวาสร้างจากการพลิกกระจกฝั่งซ้าย ไม่ได้ใช้แถวฝั่งขวาในชีต
 *
 * ชีตมีแถว RIGHT / UP-RIGHT / DOWN-RIGHT ก็จริง แต่วาดหันไปทางเดียวกับฝั่งซ้ายทั้งหมด
 * (วัดแล้ว: เทียบกับฝั่งซ้ายตรง ๆ ต่างกัน 41-64% แต่เทียบกับภาพพลิกกระจกต่างกัน 82-99%
 * ยิ่งต่างมากยิ่งไม่ใช่คู่กระจก) ใช้ตามชีตจะกลายเป็นเดินไปขวาแต่หันหน้าไปซ้าย
 *
 * ทำไมพลิกตอนตัดไฟล์ ไม่ใช่พลิกตอนแสดงผล: โปรเจกต์นี้ไม่ได้ใช้ Phaser จึงไม่มี flipX —
 * ตัวเรนเดอร์เป็น <img> ที่สลับ src ตามทิศเท่านั้น ถ้าจะพลิกตอนแสดงผลต้องเพิ่ม CSS
 * transform พร้อมเงื่อนไข "ตัวละครตัวไหนต้องพลิกบ้าง" เข้าไปใน component ที่ใช้ร่วมกับ
 * ซุนหงอคง ซึ่งมีภาพฝั่งขวาของจริงอยู่แล้ว — อบเข้าไปในไฟล์ตรงนี้จบกว่าและไม่แตะของตัวอื่น
 */
const MIRROR_FROM = {
  right: 'left',
  'up-right': 'up-left',
  'down-right': 'down-left',
}

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
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / (n - 1))])
}

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
  if (runs.length === 0) return []

  /*
     ในชีตท่าทาง ผ้าคลุมกับคราดของเฟรมหนึ่งมักยื่นไปทับเฟรมข้าง ๆ จนตัวละครติดกันหมด
     (วัดจากชีตจริง: ทั้งแถวกลายเป็นก้อนเดียวยาว 1493px) การไล่หาช่องว่างจึงแยกไม่ออก
     ต้องแบ่งตามจำนวนคอลัมน์ที่รู้อยู่แล้วแทน — แต่ไม่ได้หั่นเท่า ๆ กันแบบตายตัว
     ยังหาจุดที่ "เนื้อหาบางที่สุด" ใกล้ ๆ เส้นแบ่งในอุดมคติก่อน จะได้ไม่ตัดกลางตัวละคร
  */
  const contentStart = runs[0][0]
  const contentEnd = runs[runs.length - 1][1]
  const span = contentEnd - contentStart + 1
  const step = span / COLUMN_COUNT

  const density = Array.from({ length: W }, () => 0)
  for (let x = 0; x < W; x++) {
    let count = 0
    for (let y = y0; y <= y1; y++) {
      if (bgDistance(data, y * W + x, channels) > BG_TOLERANCE) count++
    }
    density[x] = count
  }

  const cuts = [contentStart]
  for (let i = 1; i < COLUMN_COUNT; i++) {
    const ideal = Math.round(contentStart + i * step)
    const window = Math.round(step * 0.22)
    let bestX = ideal
    let bestDensity = Infinity
    for (let x = Math.max(contentStart + 1, ideal - window); x <= Math.min(contentEnd - 1, ideal + window); x++) {
      if (density[x] < bestDensity) {
        bestDensity = density[x]
        bestX = x
      }
    }
    cuts.push(bestX)
  }
  cuts.push(contentEnd + 1)

  return Array.from({ length: COLUMN_COUNT }, (_, i) => [cuts[i], cuts[i + 1] - 1])
}

async function main() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, channels } = info

  const rows = []
  for (const { band, direction } of ROWS) {
    const [y0, y1] = band
    const cells = []
    for (const [cx0, cx1] of findSpriteColumns(data, W, channels, y0, y1)) {
      const boxTop = y0 - 5
      const cell = extractCell(data, W, channels, { x0: cx0, y0: boxTop, x1: cx1 + 1, y1: y1 + 6 })
      if (cell) cells.push({ cell, boxTop, feet: measureFeet(cell.buffer, cell.width, cell.height) })
    }
    /*
       เส้นพื้นร่วมของทั้งแถว แทนการวัดเท้าทีละเฟรม
       ตัวตรวจจับเท้าไล่จากล่างขึ้นจนเจอแถวที่กว้างพอ แต่ชุดนี้ผ้าคลุมสะบัดกว้างและต่ำ
       กว่าเท้าในบางเฟรม จึงถูกนับเป็นเท้า ทำให้ระดับพื้นเพี้ยนไปถึง 15px ตัวจะเด้งตอนเดิน
       ต้นฉบับวาดทุกเฟรมยืนบนเส้นพื้นเดียวกันอยู่แล้ว ใช้จุดต่ำสุดของทั้งแถวเป็นพื้นจึงตรงกว่า
    */
    const groundSheetY = Math.max(...cells.map((entry) => entry.boxTop + entry.cell.bbox.maxY))
    for (const entry of cells) entry.groundLocalY = groundSheetY - entry.boxTop
    console.log(`${direction.padEnd(11)} ตัดได้ ${cells.length} เฟรม`)
    rows.push({ direction, cells })
  }

  /*
     เทียบสเกลจาก "ความสูงตัวละคร" ไม่ใช่ขนาดหัวแบบสคริปต์ชุดก่อน
     เพราะอาร์ตชุดนี้วาดหัวเล็กลงเมื่อเทียบกับลำตัว (หัว 29px ต่อตัว 193px = 15%
     ส่วนชุดเดิมราว 18%) ถ้ายังวัดจากหัว ตัวจะโตขึ้น 25% จนดูใหญ่กว่าซุนหงอคงผิดสัดส่วน
     วัดจากความสูงตัว (มัธยฐาน กันเฟรมที่ผ้าคลุมสะบัดสูงผิดปกติ) จึงตรงกับของเดิมกว่า
  */
  const bodyHeights = rows
    .flatMap((row) => row.cells)
    .map((entry) => entry.cell.bbox.maxY - entry.cell.bbox.minY + 1)
    .toSorted((a, b) => a - b)
  const medianBody = bodyHeights[Math.floor(bodyHeights.length / 2)]
  const scale = TARGET_BODY_HEIGHT / medianBody
  console.log(`\nตัวละครในชีต (มัธยฐาน) ${medianBody}px → สเกล ${scale.toFixed(4)}`)

  const render = async ({ cell, feet, groundLocalY }, file, mirror = false) => {
    const { bbox } = cell
    const cropW = bbox.maxX - bbox.minX + 1
    const cropH = bbox.maxY - bbox.minY + 1
    const scaledW = Math.max(1, Math.round(cropW * scale))
    const scaledH = Math.max(1, Math.round(cropH * scale))

    const base = sharp(cell.buffer, {
      raw: { width: cell.width, height: cell.height, channels: 4 },
    })
      .extract({ left: bbox.minX, top: bbox.minY, width: cropW, height: cropH })
      .resize(scaledW, scaledH, { kernel: 'lanczos3' })
    const sprite = await (mirror ? base.flop() : base).png().toBuffer()

    // ภาพที่พลิกกระจกแล้ว จุดกึ่งกลางเท้าย้ายไปอยู่อีกฝั่งของภาพ ต้องกลับด้านตาม
    const rawFeetCenter = (feet.centerX - bbox.minX) * scale
    const feetCenter = mirror ? scaledW - rawFeetCenter : rawFeetCenter

    await sharp({
      create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: sprite,
          left: Math.round(TARGET_FEET_CENTER_X - feetCenter),
          top: Math.round(TARGET_FEET_Y - (groundLocalY - bbox.minY + 0.5) * scale),
        },
      ])
      .png()
      .toFile(file)
  }

  await mkdir(WALK_DIR, { recursive: true })
  await mkdir(TURN_DIR, { recursive: true })

  const byDirection = new Map(rows.map((row) => [row.direction, row.cells]))
  /** ทิศนี้เอาภาพจากแถวไหน และต้องพลิกกระจกไหม (ดูเหตุผลที่ MIRROR_FROM) */
  const sourceFor = (direction) => {
    const from = MIRROR_FROM[direction]
    return from ? { cells: byDirection.get(from), mirror: true } : { cells: byDirection.get(direction), mirror: false }
  }

  // วนตาม "ทิศปลายทางที่เกมต้องการครบ 8 ทิศ" ไม่ใช่ตามแถวในชีต (ชีตมีแค่ 5 แถว) —
  // ไม่งั้นทิศฝั่งขวาที่ต้องพลิกกระจกจะไม่ถูกสร้างเลย
  const outputDirections = [...ROWS.map((row) => row.direction), ...Object.keys(MIRROR_FROM)]
  for (const direction of outputDirections) {
    const { cells, mirror } = sourceFor(direction)
    const picked = sampleEvenly(cells, FRAME_COUNT)
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      await render(picked[frame], join(WALK_DIR, `pigsy-walk-${direction}-${frame}.png`), mirror)
    }
  }
  console.log(
    `เขียนเฟรมเดินแล้ว ${outputDirections.length * FRAME_COUNT} ไฟล์ (ฝั่งขวา 3 ทิศพลิกจากฝั่งซ้าย)`,
  )

  for (const [index, direction] of TURN_ORDER.entries()) {
    const { cells, mirror } = sourceFor(direction)
    await render(cells[0], join(TURN_DIR, `pigsy-turn-${index}.png`), mirror)
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
    const previewPath = join(ROOT, 'pigsy-v7-preview.png')
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

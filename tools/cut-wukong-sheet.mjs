/**
 * ตัดเฟรมซุนหงอคงชุดใหม่จาก assets/archive/characters/wukong-new-sheet.png
 *
 *   node tools/cut-wukong-sheet.mjs [--preview]
 *
 * ชีตนี้มี 5 แถว (Walk Cycle / Arm Movement / Leg Movement / Idle Breathing / Gesture-Pose)
 * แถวละ 8 คอลัมน์ — ใช้จริงแค่ 3 แถว: Walk Cycle (เดินครบวงจรอยู่แล้ว ไม่ต้องประกอบจาก
 * Arm+Leg แยก) / Idle Breathing / Gesture-Pose แถว Arm/Leg Movement เป็นภาพอ้างอิงแยกส่วน
 * ที่ไม่ได้ใช้ตรง ๆ ในเกม (ข้ามไป)
 *
 * ตัวละครหันขวาเป็นทิศเดียว (side-view) — โปรเจกต์นี้ไม่มี flipX ตอนแสดงผล (คอมโพเนนต์
 * สลับ src รูปเท่านั้น ดู tools/cut-pigsy-v7-walk.mjs) จึงต้องเบคภาพพลิกกระจกลงไฟล์จริง
 * สำหรับทิศฝั่งซ้าย ส่วนทิศที่เหลือ (บน/ล่าง/เฉียง) ไม่มีมุมภาพจริงให้ตัด — ใช้ภาพหันขวา/
 * ซ้ายชุดเดียวกันซ้ำทุกทิศตามที่ตกลง (เกมนี้เป็นมุมมอง 2.5D side-view จริง ๆ)
 */

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(ROOT, 'assets', 'archive', 'characters', 'wukong-new-sheet.png')
const RAW_DIR = join(ROOT, 'assets', 'raw', 'characters')
const WALK_DIR = join(RAW_DIR, 'walk')
const TURN_DIR = join(RAW_DIR, 'turnaround')
const PREVIEW = process.argv.includes('--preview')

/**
 * ขอบเขต y ของเนื้อหาจริงแต่ละแถว (วัดจากชีตจริงด้วยสแกนพิกเซล ไม่ใช่หารเท่ากันตายตัว)
 * contentBand ใช้หาช่วงคอลัมน์เท่านั้น (ให้แคบ แม่นยำ ไม่ปนป้ายชื่อแถว) ส่วน boxTop คือขอบบน
 * จริงตอนตัดเฟรม (ใช้จุดเริ่มแถว/หลังเส้นแบ่งของชีต) เผื่อป้ายชื่อ + ริบบิ้นที่ชี้สูงไว้เต็มที่
 * แล้วปล่อยให้ extractCell() เลือกก้อนต่อเนื่องที่ใหญ่ที่สุด (ตัวละคร) ทิ้งป้ายซึ่งเป็นก้อนเล็ก
 * แยกต่างหากไปเอง — ไม่งั้นถ้าตัดขอบบนตื้นเกิน ป้ายชื่อบางคอลัมน์จะติดเข้ามาในเฟรม (ระยะห่าง
 * จากตัวละครแค่ ~7px แคบกว่า padding เดิมที่เคยใช้กับชีตตือโป๊ยก่าย)
 */
const ROWS = {
  walk: { contentBand: [16, 207], boxTop: 0 },
  idle: { contentBand: [649, 831], boxTop: 635 },
  gesture: { contentBand: [855, 1076], boxTop: 841 },
}
const COLUMN_COUNT = 8

const BG = [0, 0, 0]
const BG_TOLERANCE = 26
const EDGE_FULL_DISTANCE = 70
/** เล็กกว่าชุดตือโป๊ยก่ายมาก (6) เพราะพื้นหลังชีตนี้สะอาด ไม่มีเงาดำสนิทในตัวละคร —
    ค่าที่ใหญ่กว่านี้จะเชื่อมป้ายชื่อแถว (ห่างจากตัวละครแค่ ~7px) เข้ากับตัวละครเป็นก้อนเดียว */
const CLOSE_RADIUS = 2
const FILLED_BG_LIMIT = 12
const FILLED_BG_MIN_AREA = 100000

const CANVAS_W = 640
const CANVAS_H = 512
/** อ้างอิงจาก public/characters/monkey-v2-idle-0.webp ตัวเดิม ให้ตัวละครขึ้นจอขนาด/ระดับเท้าเดิม */
const TARGET_BODY_HEIGHT = 318
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 354.5

const FRAME_COUNT = 8

/** ทิศที่ใช้ภาพหันขวาต้นฉบับตรง ๆ กับทิศที่ต้องพลิกกระจก (ชีตมีแค่มุมหันขวา) */
/**
 * walk มีจริงแค่ 2 ทิศ (side-view เดียว ไม่มีมุมหน้า/หลัง) — เดิมเบคซ้ำ 8 ทิศให้ระบบเดินอิสระ
 * ของฉาก WukongAdventure ใช้ แต่ทิศอื่นแค่ซ้ำภาพเดิม ไม่มีมุมภาพจริง เปลืองพื้นที่ดิสก์เปล่า ๆ
 * (WukongAdventure.tsx คำนวณ facing ซ้าย/ขวาจาก inputX เองแล้ว ไม่ต้องมีไฟล์ทิศอื่น)
 *
 * turnaround ยังต้องครบ 8 ทิศ — ใช้แสดงตัวละครหมุนโชว์ในหน้า Lobby/ทำเนียบวีรชน
 * (src/game/spriteSequences.ts) ซึ่งเป็นคนละระบบจากการเดินอิสระ
 */
const WALK_DIRECTIONS = ['right', 'left']
const TURN_ORDER = ['down', 'down-right', 'right', 'up-right', 'up', 'up-left', 'left', 'down-left']
const isLeftSide = (direction) => direction.includes('left')

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
    /*
       ขอบพิกเซลที่ alpha ไม่เต็ม (onEdge) สีที่วัดได้จากชีตยังเจือดำของพื้นหลังอยู่ (ต้นฉบับ
       antialias เข้ากับพื้นดำมาก่อนแล้ว) ถ้าเอาสีดิบไปตรง ๆ พอคอมโพสิตทับพื้นอื่นในเกมจะเห็น
       เป็นขอบดำคล้ำรอบตัวละคร (ยิ่งชัดตรงคอ/ข้อต่อที่โค้งแคบ) ต้อง "ถอนสีพื้นหลัง" ออกจากขอบ
       ก่อนด้วยสูตร unpremultiply: fg = (blended - (1-a)*bg) / a
    */
    let r = data[source]
    let g = data[source + 1]
    let b = data[source + 2]
    if (onEdge && alpha > 0 && alpha < 255) {
      const a = alpha / 255
      r = Math.min(255, Math.max(0, Math.round((r - (1 - a) * BG[0]) / a)))
      g = Math.min(255, Math.max(0, Math.round((g - (1 - a) * BG[1]) / a)))
      b = Math.min(255, Math.max(0, Math.round((b - (1 - a) * BG[2]) / a)))
    }
    out[target] = r
    out[target + 1] = g
    out[target + 2] = b
    out[target + 3] = alpha
  }

  return {
    buffer: out,
    width: w,
    height: h,
    bbox: { minX: body.minX, minY: body.minY, maxX: body.maxX, maxY: body.maxY },
  }
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

/**
 * จุดอ้างอิงกึ่งกลางลำตัวจากแถบระดับเอว (42-58% ของความสูง) — ระดับที่กระบอง/ชายผ้าคลุม
 * กวนน้อยที่สุด ใช้เป็นจุดยึดกันช่วงค้นหาเท้าหลุดไปทางด้ามกระบองที่ยื่นไกลออกนอกตัว
 */
function bodyAnchorX(rgba, w, h) {
  const y0 = Math.round(h * 0.42)
  const y1 = Math.round(h * 0.58)
  let sumX = 0
  let count = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > 128) {
        sumX += x
        count++
      }
    }
  }
  return count > 0 ? sumX / count : w / 2
}

/**
 * เดิมใช้ midpoint ของขอบซ้าย-ขวาสุดของแถวที่เนื้อพอ — พังเมื่อกระบองยื่นลงต่ำเกือบเท่าเท้า
 * เพราะ midpoint ลากจากปลายกระบองไปอีกฝั่งทำให้จุดกึ่งกลางเพี้ยนไปหลายสิบพิกเซล (เห็นชัดตอน
 * idle เฟรม 3/6 ตัวละครกระโดดไปทางซ้าย ~40px ตอนเล่นลูป) ตอนนี้จำกัดช่วงค้นหาให้อยู่ใกล้
 * แนวกลางลำตัว (bodyAnchorX) และใช้ค่าเฉลี่ยถ่วงน้ำหนัก ไม่ใช่ midpoint ของขอบสุด
 */
function measureFeet(rgba, w, h) {
  const anchor = bodyAnchorX(rgba, w, h)
  const halfWindow = w * 0.24
  const xMin = Math.max(0, Math.round(anchor - halfWindow))
  const xMax = Math.min(w - 1, Math.round(anchor + halfWindow))
  const band = 6
  for (let y = h - 1; y >= band; y--) {
    let sumX = 0
    let count = 0
    for (let yy = y - band + 1; yy <= y; yy++) {
      for (let x = xMin; x <= xMax; x++) {
        if (rgba[(yy * w + x) * 4 + 3] > 128) {
          sumX += x
          count++
        }
      }
    }
    if (count >= 30) return { y, centerX: sumX / count }
  }
  return { y: h - 1, centerX: anchor }
}

async function main() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, channels } = info

  const rows = {}
  for (const [name, { contentBand: [y0, y1], boxTop }] of Object.entries(ROWS)) {
    const cells = []
    for (const [cx0, cx1] of findSpriteColumns(data, W, channels, y0, y1)) {
      const cell = extractCell(data, W, channels, { x0: cx0, y0: boxTop, x1: cx1 + 1, y1: y1 + 6 })
      if (cell) cells.push({ cell, boxTop, feet: measureFeet(cell.buffer, cell.width, cell.height) })
    }
    const groundSheetY = Math.max(...cells.map((entry) => entry.boxTop + entry.cell.bbox.maxY))
    for (const entry of cells) entry.groundLocalY = groundSheetY - entry.boxTop
    console.log(`${name.padEnd(8)} ตัดได้ ${cells.length} เฟรม`)
    rows[name] = cells
  }

  const bodyHeights = Object.values(rows)
    .flat()
    .map((entry) => entry.cell.bbox.maxY - entry.cell.bbox.minY + 1)
    .toSorted((a, b) => a - b)
  const medianBody = bodyHeights[Math.floor(bodyHeights.length / 2)]
  const scale = TARGET_BODY_HEIGHT / medianBody
  console.log(`\nตัวละครในชีต (มัธยฐาน) ${medianBody}px → สเกล ${scale.toFixed(4)} (ใช้ค่าเดียวกันทุกแอนิเมชันกันเท้ากระโดด/ตัวยืด)`)

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

  await mkdir(RAW_DIR, { recursive: true })
  await mkdir(WALK_DIR, { recursive: true })
  await mkdir(TURN_DIR, { recursive: true })

  // idle (หายใจ) — ชุดเดียวใช้ร่วมกันทุกทิศอยู่แล้วในทั้งสองระบบ (battle allDirections / lobby loop)
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    await render(rows.idle[frame], join(RAW_DIR, `wukong-idle-${frame}.png`))
  }
  console.log(`เขียนเฟรม idle แล้ว ${FRAME_COUNT} ไฟล์`)

  // gesture (ท่าทาง) — ชุดเดียวใช้ทุกทิศ (แทน skill-1 / victory เดิม)
  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    await render(rows.gesture[frame], join(RAW_DIR, `wukong-gesture-${frame}.png`))
  }
  console.log(`เขียนเฟรม gesture แล้ว ${FRAME_COUNT} ไฟล์`)

  // walk — มีจริงแค่ซ้าย/ขวา (ดูคอมเมนต์ที่ WALK_DIRECTIONS)
  for (const direction of WALK_DIRECTIONS) {
    const mirror = isLeftSide(direction)
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      await render(rows.walk[frame], join(WALK_DIR, `wukong-walk-${direction}-${frame}.png`), mirror)
    }
  }
  console.log(`เขียนเฟรมเดินแล้ว ${WALK_DIRECTIONS.length * FRAME_COUNT} ไฟล์ (ซ้าย/ขวา)`)

  // turnaround (ท่ายืนต่อทิศ) — ใช้เฟรมแรกของ idle (breathing เริ่มต้น) เป็นท่ายืนนิ่ง
  for (const [index, direction] of TURN_ORDER.entries()) {
    await render(rows.idle[0], join(TURN_DIR, `wukong-turn-${index}.png`), isLeftSide(direction))
  }
  console.log(`เขียนเฟรมหันทิศแล้ว ${TURN_ORDER.length} ไฟล์`)

  if (PREVIEW) {
    const tiles = []
    const previewRows = [
      { label: 'idle', frames: Array.from({ length: FRAME_COUNT }, (_, i) => join(RAW_DIR, `wukong-idle-${i}.png`)) },
      { label: 'gesture', frames: Array.from({ length: FRAME_COUNT }, (_, i) => join(RAW_DIR, `wukong-gesture-${i}.png`)) },
      { label: 'walk-right', frames: Array.from({ length: FRAME_COUNT }, (_, i) => join(WALK_DIR, `wukong-walk-right-${i}.png`)) },
      { label: 'walk-left', frames: Array.from({ length: FRAME_COUNT }, (_, i) => join(WALK_DIR, `wukong-walk-left-${i}.png`)) },
    ]
    for (const [row, { frames: fileList }] of previewRows.entries()) {
      for (const [frame, file] of fileList.entries()) {
        tiles.push({
          input: await sharp(file).resize(180, 144).png().toBuffer(),
          left: frame * 180,
          top: row * 144,
        })
      }
    }
    const previewPath = join(ROOT, 'wukong-preview.png')
    await sharp({
      create: { width: 180 * FRAME_COUNT, height: 144 * previewRows.length, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
    })
      .composite(tiles)
      .png()
      .toFile(previewPath)
    console.log(`พรีวิว: ${previewPath} (แถวเรียงตาม ${previewRows.map((r) => r.label).join(', ')})`)
  }
}

await main()

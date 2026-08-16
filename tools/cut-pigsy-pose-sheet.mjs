/**
 * ตัดชีต "ท่าทาง" ของตือโป๊ยก่าย (gesture / idle) ที่มีทิศเดียวแต่หลายท่า
 *
 *   node tools/cut-pigsy-pose-sheet.mjs --sheet=<ไฟล์> --animation=gesture|idle [--preview]
 *
 * ต่างจาก tools/cut-pigsy-direction-sheet.mjs สองเรื่อง:
 *
 * 1) เก็บชิ้นส่วนที่แยกออกจากตัวละครด้วย — ชีตท่าทางมีเฟรมที่วางคราดลงกับพื้นแล้ว
 *    ปล่อยมือ คราดจึงกลายเป็นก้อนที่ไม่ต่อกับตัว ถ้าใช้กติกา "เก็บก้อนใหญ่สุดก้อนเดียว"
 *    แบบสคริปต์เดินจะทำคราดหายไปเลย จึงเก็บทุกก้อนที่ใหญ่พอ (>=3% ของก้อนหลัก)
 *
 * 2) เขียนไปที่ชุดไฟล์ของท่าทาง ไม่ใช่ชุดเดิน
 *      gesture → characters/pigsy-team-{0..7}   (เกมใช้เป็น actionUrls — ท่าประจำตัว
 *                ที่เล่นเองเป็นระยะในฉากลอบบี้และหน้าทำเนียบวีรชน ดู spriteSequences.ts)
 *      idle    → characters/pigsy-idle-{0..N}   (ท่ายืนหายใจ)
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

const VALID_ANIMATIONS = ['gesture', 'idle']
const ANIMATION = args.get('animation')
if (!VALID_ANIMATIONS.includes(ANIMATION)) {
  console.error(`ต้องระบุ --animation เป็นหนึ่งใน: ${VALID_ANIMATIONS.join(', ')}`)
  process.exit(1)
}
const SHEET = resolve(ROOT, args.get('sheet') ?? '')
const OUT_DIR = join(ROOT, 'assets', 'raw', 'characters')
/** gesture ลงชุด pigsy-team-* เพราะเกมผูก actionUrls ไว้กับชื่อนี้อยู่แล้ว */
const FILE_PREFIX = ANIMATION === 'gesture' ? 'pigsy-team' : 'pigsy-idle'
/** จำนวนคอลัมน์ในชีต — ต้องบอกเพราะสไปรต์ติดกันจนหาช่องว่างไม่ได้ (ดู findSpriteColumns) */
const COLUMNS = Number(args.get('columns') ?? 4)
const PREVIEW = process.argv.includes('--preview')

const BG = [0, 0, 0]
const BG_TOLERANCE = 26
const EDGE_FULL_DISTANCE = 70
const CLOSE_RADIUS = 3
const FILLED_BG_LIMIT = 12
const FILLED_BG_MIN_AREA = 25

const CANVAS_W = 640
const CANVAS_H = 512
/** ค่าอ้างอิงเดียวกับ cut-pigsy-v7-walk.mjs เพื่อให้ตัวขนาดเท่ากันทั้งตอนเดิน ยืน และทำท่า */
const TARGET_BODY_HEIGHT = 333
const TARGET_FEET_Y = 474
const TARGET_FEET_CENTER_X = 349.5

/*
   จำนวนไฟล์ปลายทาง
   gesture ใช้ 8 ตามที่เกมผูกไว้กับ actionUrls
   idle ต้องเป็น 24 เพราะ WukongAdventure คำนวณเฟรมยืนด้วย (เฟรมเดิน * 3) % idleCount
   ถ้าลดเหลือ 8 สูตรนี้จะกระโดดเป็น 0,3,6,1,4,7,2,5 คือเล่นสลับลำดับจนดูกระตุก
   จึงคงช่องไว้ 24 แล้วให้ต้นฉบับ 1 เฟรมกินช่องละ 3 ช่องติดกันแทน — สูตรเดิมจะไปตกที่
   ช่อง 0,3,6,...,21 ซึ่งแมปกลับเป็นเฟรมต้นฉบับ 0..7 เรียงตามลำดับพอดี
*/
const FRAME_COUNT = ANIMATION === 'idle' ? 24 : 8
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
      !outside[i] &&
      !seed[i] &&
      bgDistance(data, at(i % w, (i / w) | 0), channels) <= FILLED_BG_LIMIT
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

  // เก็บทุกก้อนที่ใหญ่พอ ไม่ใช่แค่ก้อนใหญ่สุด — ชีตท่าทางมีเฟรมที่วางคราดลงกับพื้น
  // แล้วปล่อยมือ คราดจึงไม่ต่อกับตัวละคร ถ้าเก็บก้อนเดียวคราดจะหายไปทั้งอัน
  // (เกณฑ์ 3% ตัดเศษเล็ก ๆ ออกได้ แต่ยังเก็บของถือที่วางแยกไว้ครบ)
  const kept = components.filter((c) => c.pixels.length >= components[0].pixels.length * 0.03)

  const inBody = new Uint8Array(w * h)
  const bodyPixels = []
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (const component of kept) {
    if (component.minX < minX) minX = component.minX
    if (component.minY < minY) minY = component.minY
    if (component.maxX > maxX) maxX = component.maxX
    if (component.maxY > maxY) maxY = component.maxY
    for (const local of component.pixels) {
      inBody[local] = 1
      bodyPixels.push(local)
    }
  }
  const body = { pixels: bodyPixels, minX, minY, maxX, maxY }

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
  const step = span / COLUMNS

  const density = Array.from({ length: W }, () => 0)
  for (let x = 0; x < W; x++) {
    let count = 0
    for (let y = y0; y <= y1; y++) {
      if (bgDistance(data, y * W + x, channels) > BG_TOLERANCE) count++
    }
    density[x] = count
  }

  const cuts = [contentStart]
  for (let i = 1; i < COLUMNS; i++) {
    const ideal = Math.round(contentStart + i * step)
    const window = Math.round(step * 0.22)
    let bestX = ideal
    let bestDensity = Infinity
    for (
      let x = Math.max(contentStart + 1, ideal - window);
      x <= Math.min(contentEnd - 1, ideal + window);
      x++
    ) {
      if (density[x] < bestDensity) {
        bestDensity = density[x]
        bestX = x
      }
    }
    cuts.push(bestX)
  }
  cuts.push(contentEnd + 1)

  return Array.from({ length: COLUMNS }, (_, i) => [cuts[i], cuts[i + 1] - 1])
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
  const { data, info } = await sharp(SHEET)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: W, height: H, channels } = info

  const rowBands = findRowBands(data, W, H, channels)
  const cells = []
  for (const [y0, y1] of rowBands) {
    const columns = findSpriteColumns(data, W, channels, y0, y1)
    for (const [cx0, cx1] of columns) {
      const cell = extractCell(data, W, channels, {
        x0: cx0 - 5,
        y0: y0 - 5,
        x1: cx1 + 6,
        y1: y1 + 6,
      })
      if (cell) {
        cells.push({
          cell,
          head: measureHead(cell.buffer, cell.width, cell.height),
          feet: measureFeet(cell.buffer, cell.width, cell.height),
        })
      }
    }
  }
  console.log(`${ANIMATION}: พบ ${rowBands.length} แถว ตัดได้ ${cells.length} เฟรม`)
  if (cells.length === 0) {
    console.error('ไม่พบตัวละครในชีตเลย — ตรวจว่าพื้นหลังเป็นสีดำและไม่มีกรอบล้อมรอบภาพ')
    process.exit(1)
  }

  /*
     เทียบสเกลจากความสูงตัวละคร ไม่ใช่ขนาดหัว — ต้องใช้เกณฑ์เดียวกับ cut-pigsy-v7-walk.mjs
     ไม่งั้นตัวละครจะขนาดไม่เท่ากันระหว่างตอนเดินกับตอนยืน/ทำท่า ซึ่งเห็นชัดมากเวลาสลับ
     (อาร์ตแต่ละชีตวาดสัดส่วนหัวต่อตัวไม่เท่ากัน การวัดจากหัวจึงให้ขนาดตัวต่างกันไป)
     ใช้มัธยฐานเพื่อกันเฟรมที่ยกคราดสูงจนกรอบภาพสูงผิดปกติ
  */
  const bodyHeights = cells
    .map((entry) => entry.cell.bbox.maxY - entry.cell.bbox.minY + 1)
    .toSorted((a, b) => a - b)
  const medianBody = bodyHeights[Math.floor(bodyHeights.length / 2)]
  const scale = TARGET_BODY_HEIGHT / medianBody
  console.log(`ตัวละครในชีต (มัธยฐาน) ${medianBody}px → สเกล ${scale.toFixed(4)}`)

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
      create: {
        width: CANVAS_W,
        height: CANVAS_H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
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

  await mkdir(OUT_DIR, { recursive: true })

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    // ยืดต้นฉบับให้เต็มจำนวนช่องแบบเรียงลำดับ (ไม่ใช่สุ่ม/ข้าม) เพื่อให้ลูปหายใจต่อเนื่อง
    const source =
      cells[Math.min(cells.length - 1, Math.floor((frame * cells.length) / FRAME_COUNT))]
    await render(source, join(OUT_DIR, `${FILE_PREFIX}-${frame}.png`))
  }
  console.log(
    `เขียนแล้ว ${FRAME_COUNT} ไฟล์: ${FILE_PREFIX}-0..${FRAME_COUNT - 1}.png (จากต้นฉบับ ${cells.length} เฟรม)`,
  )

  if (PREVIEW) {
    const tiles = []
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      tiles.push({
        input: await sharp(join(OUT_DIR, `${FILE_PREFIX}-${frame}.png`))
          .resize(240, 192)
          .png()
          .toBuffer(),
        left: (frame % 4) * 240,
        top: ((frame / 4) | 0) * 192,
      })
    }
    const previewPath = join(ROOT, `pigsy-${ANIMATION}-preview.png`)
    await sharp({
      create: {
        width: 960,
        height: 384,
        channels: 4,
        background: { r: 255, g: 0, b: 255, alpha: 1 },
      },
    })
      .composite(tiles)
      .png()
      .toFile(previewPath)
    console.log(`พรีวิว: ${previewPath}`)
  }
}

await main()

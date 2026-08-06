/**
 * ตัดเฟรมเดินตือโป๊ยก่ายออกจากชีตต้นฉบับ (assets/archive/characters/pigsy-walk-sheet.png)
 *
 *   node tools/cut-pigsy-walk-sheet.mjs [--preview]
 *
 * ชีตเป็นตาราง 8 แถว (ทิศ) x 7 คอลัมน์ (เฟรม) บนพื้นหลังสีเข้มสม่ำเสมอ [12,14,16]
 * มีเส้นกริดสีทอง เลขกำกับเฟรม และป้ายชื่อทิศภาษาไทยในคอลัมน์ซ้าย — ทั้งหมดนี้ต้องไม่ติดมา
 *
 * ─── ทำไมต้อง flood fill ไม่ใช่ chroma key ───────────────────────────────
 * รอบก่อนใช้วิธีลบ "ทุกพิกเซลที่สีใกล้พื้นหลัง" ทั่วทั้งภาพ ผลคือส่วนมืดของตัวละคร
 * (ชุดคลุมสีน้ำเงินเข้ม เกราะในเงา) ถูกลบไปด้วย เหลือตัวละครโปร่งแสง 65% เป็นรูพรุน
 *
 * สคริปต์นี้เติมสีจากขอบเซลล์เข้ามาแทน (flood fill) — พิกเซลมืดที่อยู่ "ข้างใน" รูปทรง
 * ตัวละครจะไม่ถูกแตะเลย เพราะเติมเข้าไปไม่ถึง ได้ตัวละครทึบเต็มเหมือนสไปรต์ตัวอื่น
 * ───────────────────────────────────────────────────────────────────────
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHEET = join(ROOT, 'assets', 'archive', 'characters', 'pigsy-walk-sheet.png')
const OUT_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const PREVIEW = process.argv.includes('--preview')

/** เส้นแบ่งแถวที่วัดได้จากชีต (ขอบบน/ล่างของแต่ละทิศ) */
const ROW_EDGES = [77, 205, 321, 435, 545, 662, 780, 894, 1014]
/** ลำดับแถวในชีต เรียงตามป้ายไทยฝั่งซ้าย */
const ROW_DIRECTIONS = [
  'down', // เดินหน้า (Front)
  'up', // ถอยหลัง (Back)
  'left', // เดินซ้าย (Left)
  'right', // เดินขวา (Right)
  'up-left', // เฉียงบนซ้าย (Up-Left)
  'up-right', // เฉียงบนขวา (Up-Right)
  'down-left', // เฉียงล่างซ้าย (Down-Left)
  'down-right', // เฉียงล่างขวา (Down-Right)
]

const BG = [12, 14, 16]
/** ต่ำกว่านี้ = พื้นหลังแน่นอน (ใช้ตอน flood fill) */
const BG_TOLERANCE = 30
/** รัศมี closing — เชื่อมช่องขาดในตัวละครที่กว้างไม่เกิน 2 เท่าของค่านี้ */
const CLOSE_RADIUS = 3
/** ขอบซ้ายของเฟรมแรก — ซ้ายกว่านี้เป็นป้ายชื่อทิศภาษาไทย ต้องไม่เอา */
const LABEL_EDGE = 125
const PANEL_RIGHT = 890

/** ปลายทางคือ canvas ขนาดเดียวกับสไปรต์ตัวอื่นทุกตัวในเกม */
const CANVAS_W = 640
const CANVAS_H = 512
/** เฟรมยืนเฉยที่ใช้เทียบสเกลและระดับพื้น — ตอนเดินกับตอนยืนต้องตัวเท่ากันและเท้าอยู่ระดับเดียวกัน */
const IDLE_REFERENCE = join(ROOT, 'assets', 'raw', 'characters', 'pigsy-idle-0.png')

function colorDistance(data, index, channels) {
  const dr = data[index * channels] - BG[0]
  const dg = data[index * channels + 1] - BG[1]
  const db = data[index * channels + 2] - BG[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * แยกตัวละครออกจากพื้นหลังในกรอบเซลล์เดียว
 * คืน mask (0-255 ต่อพิกเซล) ขนาดเท่ากรอบ พร้อม bbox ของตัวละคร
 */
function extractCell(data, W, channels, box) {
  const { x0, y0, x1, y1 } = box
  const w = x1 - x0
  const h = y1 - y0
  const at = (x, y) => (y0 + y) * W + (x0 + x)

  // 1) เมล็ดเริ่มต้น: เฉพาะพิกเซลที่ "สว่างกว่าพื้นหลังแน่ ๆ"
  const seed = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (colorDistance(data, at(x, y), channels) > BG_TOLERANCE) seed[y * w + x] = 1
    }
  }

  // 2) morphological closing (ขยายแล้วหด) — เชื่อมส่วนที่ถูกเงาดำตัดขาดให้กลับเป็นชิ้นเดียว
  //    ใช้แทนการ flood fill จากขอบ เพราะเงาในตัวละครดำเท่าพื้นหลังเป๊ะ ๆ จนไล่สีแยกไม่ได้
  //    closing รักษาเส้นบาง (ด้ามคราด) ไว้ครบ ต่างจาก opening ที่จะลบทิ้ง
  const box1D = (input, radius, horizontal) => {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = 0
        for (let d = -radius; d <= radius; d++) {
          const nx = horizontal ? x + d : x
          const ny = horizontal ? y : y + d
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          if (input[ny * w + nx]) {
            hit = 1
            break
          }
        }
        out[y * w + x] = hit
      }
    }
    return out
  }
  const erode1D = (input, radius, horizontal) => {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let all = 1
        for (let d = -radius; d <= radius; d++) {
          const nx = horizontal ? x + d : x
          const ny = horizontal ? y : y + d
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          if (!input[ny * w + nx]) {
            all = 0
            break
          }
        }
        out[y * w + x] = all
      }
    }
    return out
  }
  let mask = box1D(box1D(seed, CLOSE_RADIUS, true), CLOSE_RADIUS, false)
  mask = erode1D(erode1D(mask, CLOSE_RADIUS, true), CLOSE_RADIUS, false)
  for (let i = 0; i < mask.length; i++) if (seed[i]) mask[i] = 1

  // 3) เติมรูที่ตัวละครล้อมไว้ให้ทึบ — ช่องว่างจริง (เช่นระหว่างขา) เปิดออกสู่ขอบกรอบ จึงไม่โดนเติม
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
  const isBackground = new Uint8Array(w * h)
  for (let i = 0; i < mask.length; i++) isBackground[i] = outside[i] ? 1 : 0

  // 4) แยกก้อนตัวละคร แล้วคัดเฉพาะก้อนที่ไม่ใช่เลขกำกับเฟรม/เศษเส้นกริด
  const componentOf = new Int32Array(w * h).fill(-1)
  const components = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const local = y * w + x
      if (componentOf[local] !== -1 || isBackground[local]) continue
      const id = components.length
      const pixels = [local]
      componentOf[local] = id
      const queue = [local]
      let minX = w
      let minY = h
      let maxX = -1
      let maxY = -1
      while (queue.length > 0) {
        const current = queue.pop()
        const cx = current % w
        const cy = (current / w) | 0
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
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
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const next = ny * w + nx
          if (componentOf[next] !== -1 || isBackground[next]) continue
          componentOf[next] = id
          pixels.push(next)
          queue.push(next)
        }
      }
      components.push({ id, pixels, minX, minY, maxX, maxY })
    }
  }
  if (components.length === 0) return null

  // ก้อนใหญ่สุดคือตัวละครเสมอ ใช้เป็นหลักอ้างอิงว่าอะไร "ลอยอยู่เหนือหัว" (= เลขกำกับเฟรม)
  components.sort((a, b) => b.pixels.length - a.pixels.length)
  const body = components[0]
  const kept = components.filter((component) => {
    if (component === body) return true
    if (component.pixels.length < 25) return false
    const cw = component.maxX - component.minX + 1
    const ch = component.maxY - component.minY + 1
    // เลขกำกับเฟรม (1-8) พิมพ์ไว้บนสุดของช่อง ไม่แตะตัวละคร และเล็กกว่าตัวมาก
    // เช็คทั้งตำแหน่งสัมบูรณ์ (บนสุดของช่อง) และตำแหน่งเทียบตัวละคร เพราะบางทิศคราด
    // ยื่นสูงกว่าหัว ทำให้กรอบตัวละครสูงจนใช้เกณฑ์เทียบตัวอย่างเดียวไม่พอ
    if (component.pixels.length < 600 && (component.maxY < h * 0.25 || component.maxY <= body.minY + 3)) {
      return false
    }
    // เศษเส้นกริดที่เล็ดลอดมาติดขอบกรอบ — เส้นบางแนบขอบ ไม่ใช่ส่วนของตัวละคร
    const touchesEdge =
      component.minX === 0 || component.minY === 0 || component.maxX === w - 1 || component.maxY === h - 1
    if (touchesEdge && Math.min(cw, ch) <= 3) return false
    return true
  })
  if (kept.length === 0) return null

  // 4) สร้างภาพ RGBA — ทึบเต็มทั้งตัว ปล่อยให้ขั้นตอนขยายภาพ (lanczos) ทำขอบให้เนียนเอง
  //    ถ้าไล่ alpha ตามความสว่างที่นี่ เงาเข้มในตัวจะกลายเป็นโปร่งแสงจนตัวดูทะลุได้
  const out = Buffer.alloc(w * h * 4)
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
      const x = local % w
      const y = (local / w) | 0
      const source = at(x, y) * channels
      const target = local * 4
      out[target] = data[source]
      out[target + 1] = data[source + 1]
      out[target + 2] = data[source + 2]
      out[target + 3] = 255
    }
  }

  return { buffer: out, width: w, height: h, bbox: { minX, minY, maxX, maxY } }
}

/**
 * วัด "หัวหมู" จากพิกเซลสีเนื้อก้อนใหญ่สุด — ใช้เทียบสเกลระหว่างชุดเฟรมคนละชุด
 *
 * วัดจากกรอบรวมทั้งภาพไม่ได้ เพราะคราดยื่นออกมาคนละมุมในแต่ละท่า กรอบเลยสูงไม่เท่ากัน
 * ทั้งที่ตัวละครขนาดเท่าเดิม — หัวเป็นส่วนที่ขนาดคงที่จริงในทุกท่า จึงเป็นไม้บรรทัดที่เชื่อถือได้
 * (มือกับเท้าก็สีเนื้อ จึงเอาเฉพาะก้อนใหญ่สุด = หัว)
 */
function measureHead(rgba, w, h) {
  const isSkin = (i) => {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    return rgba[i * 4 + 3] > 128 && r > 150 && r - b > 40 && r - g > 25
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

/**
 * หาระดับเท้าและจุดกึ่งกลางเท้า — ใช้ยึดตำแหน่งให้ตัวละครยืนบนพื้นระดับเดียวกันทุกเฟรม
 * ไล่จากล่างขึ้นบนจนเจอแถวที่กว้างพอ (>=8px) เพื่อข้ามปลายด้ามคราดที่บางและอาจห้อยต่ำกว่าเท้า
 */
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

  // หาคอลัมน์ของแต่ละแถวจากโปรไฟล์แนวตั้ง (ช่องว่างระหว่างเฟรมคือพื้นหลังล้วน)
  const frames = []
  for (let row = 0; row < 8; row++) {
    // เว้นจากเส้นแบ่งแถวทั้งบนและล่าง (เส้นหนา 2px) เพื่อไม่ให้เส้นกริดติดเข้ามาในกรอบ
    const yTop = ROW_EDGES[row] + 3
    const yBottom = ROW_EDGES[row + 1] - 2
    const occupied = []
    for (let x = LABEL_EDGE; x < PANEL_RIGHT; x++) {
      let has = false
      for (let y = yTop; y < yBottom; y++) {
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
        if (i - start >= 40) segments.push({ x0: LABEL_EDGE + start - 3, x1: LABEL_EDGE + i + 3 })
        start = -1
      }
    }
    console.log(`แถว ${row + 1} (${ROW_DIRECTIONS[row]}): พบ ${segments.length} เฟรม`)
    segments.forEach((segment, index) => {
      const cell = extractCell(data, W, channels, {
        x0: segment.x0,
        y0: yTop,
        x1: segment.x1,
        y1: yBottom,
      })
      if (!cell) return
      frames.push({
        direction: ROW_DIRECTIONS[row],
        index,
        cell,
        head: measureHead(cell.buffer, cell.width, cell.height),
        feet: measureFeet(cell.buffer, cell.width, cell.height),
      })
    })
  }

  // อ้างอิงสเกลและระดับพื้นจากเฟรมยืนเฉยตัวจริง ไม่ใช่ค่าคงที่ที่เดาไว้
  const idle = await sharp(IDLE_REFERENCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const idleHead = measureHead(idle.data, idle.info.width, idle.info.height)
  const idleFeet = measureFeet(idle.data, idle.info.width, idle.info.height)

  // สเกลเดียวใช้ร่วมทุกเฟรม (ไม่ปรับรายเฟรม ไม่งั้นท่าที่ตัวเตี้ยกว่าจะถูกยืดจนดูตัวใหญ่ผิดปกติ)
  // เทียบจากขนาดหัว ไม่ใช่ความสูงกรอบ เพราะคราดยื่นคนละมุมทำให้กรอบสูงไม่เท่ากัน
  const headHeights = frames.map((f) => f.head?.height).filter(Boolean).toSorted((a, b) => a - b)
  const medianHead = headHeights[Math.floor(headHeights.length / 2)]
  const scale = idleHead.height / medianHead
  console.log(
    `\nหัวในเฟรมยืนเฉย ${idleHead.height}px, หัวในเฟรมเดิน (มัธยฐาน) ${medianHead}px → สเกล ${scale.toFixed(4)}`,
  )
  console.log(`ระดับเท้าอ้างอิง y=${idleFeet.y}, กึ่งกลางเท้า x=${idleFeet.centerX}`)

  await mkdir(OUT_DIR, { recursive: true })
  const written = []
  for (const { direction, index, cell, feet } of frames) {
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

    // ยึดตำแหน่งด้วย "เท้า" ไม่ใช่กรอบภาพ — เท้าต้องอยู่ระดับพื้นเดียวกันทุกเฟรม
    // ไม่งั้นเฟรมที่คราดยื่นต่ำจะดันตัวละครลอยขึ้น กลายเป็นเดินแล้วตัวเด้ง
    const feetInSprite = (feet.y - bbox.minY + 0.5) * scale
    const feetCenterInSprite = (feet.centerX - bbox.minX) * scale
    const left = Math.round(idleFeet.centerX - feetCenterInSprite)
    const top = Math.round(idleFeet.y - feetInSprite)

    const file = join(OUT_DIR, `pigsy-walk-${direction}-${index}.png`)
    await sharp({
      create: {
        width: CANVAS_W,
        height: CANVAS_H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: sprite, left, top }])
      .png()
      .toFile(file)
    written.push({ direction, index, file })
  }

  // เฟรมที่ 8 ของแต่ละทิศ: ต้นฉบับวาดมาแค่ 7 เฟรม — ใช้เฟรมที่ 7 ซ้ำเพื่อให้ครบรอบ 8 ช่อง
  for (const direction of ROW_DIRECTIONS) {
    const last = written.filter((w) => w.direction === direction).toSorted((a, b) => b.index - a.index)[0]
    if (!last) continue
    const copy = join(OUT_DIR, `pigsy-walk-${direction}-7.png`)
    if (last.index < 7) await writeFile(copy, await sharp(last.file).png().toBuffer())
  }

  console.log(`\nเขียนแล้ว ${written.length} เฟรม + สำเนาเฟรมที่ 8 อีก ${ROW_DIRECTIONS.length} ไฟล์`)

  if (PREVIEW) {
    const previewPath = join(ROOT, 'pigsy-walk-preview.png')
    const cellW = 120
    const cellH = 120
    const tiles = []
    for (const [row, direction] of ROW_DIRECTIONS.entries()) {
      const list = written.filter((w) => w.direction === direction).toSorted((a, b) => a.index - b.index)
      for (const item of list) {
        tiles.push({
          input: await sharp(item.file).trim().resize(cellW - 8, cellH - 8, { fit: 'inside' }).png().toBuffer(),
          left: item.index * cellW + 4,
          top: row * cellH + 4,
        })
      }
    }
    await sharp({
      create: {
        width: cellW * 7,
        height: cellH * 8,
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

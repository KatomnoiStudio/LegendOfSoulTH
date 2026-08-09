/**
 * วางเฟรมโจมตีปกติชุดใหม่ของหงอคง (36 เฟรม, มี alpha จริงอยู่แล้ว) ลง canvas
 * 640x512 เดียวกับ monkey-v2-idle เพื่อให้สเกล/ตำแหน่งเท้าตรงกัน — จำเป็นเพราะ
 * EntitySprite.tsx ใช้ SPRITE_ASPECT คงที่ทุกแอนิเมชัน สลับ idle<->attack แล้วต้อง
 * ไม่มีตัวกระโดดขนาด/ตำแหน่ง
 *
 *   node tools/place-monkey-attack-new.mjs
 *
 * แหล่งเฟรม: assets/archive/characters/monkey-attack-new-extract/
 *            sprite-192px-frames-36-rows-6-cols-6-frames/frame_NNN.png
 */
import { readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC_DIR = join(
  ROOT, 'assets', 'archive', 'characters', 'monkey-attack-new-extract',
  'sprite-192px-frames-36-rows-6-cols-6-frames',
)
const OUT_DIR = join(ROOT, 'assets', 'raw', 'characters')

const CANVAS_W = 640
const CANVAS_H = 512
/** อ้างจาก monkey-v2-idle-0.png (bbox จริง): feetY=474, bodyH=318, centerX=354.5 */
const TARGET_FEET_Y = 474
const TARGET_BODY_HEIGHT = 318
const TARGET_CENTER_X = 354.5

const ALPHA_THRESHOLD = 128

async function bbox(data, width, height) {
  let minX = width, maxX = -1, minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { minX, minY, maxX, maxY }
}

async function main() {
  const files = (await readdir(SRC_DIR))
    .filter((f) => f.endsWith('.png'))
    .toSorted()

  const boxes = []
  for (const file of files) {
    const src = join(SRC_DIR, file)
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const box = await bbox(data, info.width, info.height)
    boxes.push({ file, box })
  }

  // สเกลจากความสูงตัวมัธยฐาน กันเฟรมที่ยกไม้เท้าสูงผิดปกติทำให้สเกลเพี้ยน (เหมือน pigsy pipeline)
  const bodyHeights = boxes.map(({ box }) => box.maxY - box.minY + 1).toSorted((a, b) => a - b)
  const medianBody = bodyHeights[Math.floor(bodyHeights.length / 2)]
  const scale = TARGET_BODY_HEIGHT / medianBody
  console.log(`ตัวละครมัธยฐาน ${medianBody}px -> สเกล ${scale.toFixed(4)}`)

  for (const [index, { file, box }] of boxes.entries()) {
    const cropW = box.maxX - box.minX + 1
    const cropH = box.maxY - box.minY + 1
    const scaledW = Math.max(1, Math.round(cropW * scale))
    const scaledH = Math.max(1, Math.round(cropH * scale))
    const centerX = (box.minX + box.maxX) / 2

    const sprite = await sharp(join(SRC_DIR, file))
      .extract({ left: box.minX, top: box.minY, width: cropW, height: cropH })
      .resize(scaledW, scaledH, { kernel: 'lanczos3' })
      .png()
      .toBuffer()

    const left = Math.round(TARGET_CENTER_X - (centerX - box.minX) * scale)
    const top = Math.round(TARGET_FEET_Y - cropH * scale + 1)

    await sharp({
      create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: sprite, left, top }])
      .png()
      .toFile(join(OUT_DIR, `monkey-attack-new-${index}.png`))
  }
  console.log(`วางแล้ว ${boxes.length} เฟรม -> ${OUT_DIR}`)
}

await main()

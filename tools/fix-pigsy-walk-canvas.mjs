/**
 * ซ่อมเฟรมเดินตือโป๊ยก่าย — ต้นฉบับถูก crop มาแบบตัวติดขอบภาพ (เช่น 105x127px) ในขณะที่
 * เฟรมยืนเฉย/หันทิศเป็น canvas เต็ม 640x512 เมื่อ CSS สเกลด้วย object-fit:contain
 * บนกล่องขนาดคงที่ ตัวละครที่เดินเลยดูใหญ่ขึ้นและขยับตำแหน่งกะทันหันตอนเริ่มเดิน
 *
 * สคริปต์นี้ resize ตัวละครในแต่ละเฟรมเดินให้สูงเท่า bounding box ของเฟรมยืนเฉย (pigsy-idle-0)
 * แล้ววาง (composite) ลงบน canvas โปร่งใส 640x512 โดยให้เท้าอยู่ตำแหน่ง Y เดียวกับเฟรมยืนเฉย
 * และกึ่งกลางแนวนอน รันครั้งเดียว แก้ไฟล์ต้นฉบับใน assets/raw/ ตรง ๆ (git track อยู่แล้ว
 * ย้อนกลับได้ด้วย git checkout ถ้าผลลัพธ์ไม่โอเค)
 */

import { readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WALK_DIR = join(ROOT, 'assets', 'raw', 'characters', 'walk')
const IDLE_REFERENCE = join(ROOT, 'assets', 'raw', 'characters', 'pigsy-idle-0.png')

const CANVAS_W = 640
const CANVAS_H = 512

async function boundingBox(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3]
      if (alpha > 10) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

async function main() {
  const refBox = await boundingBox(IDLE_REFERENCE)
  const targetH = refBox.h
  const feetY = refBox.maxY
  console.log(`อ้างอิงจากเฟรมยืนเฉย: สูง ${targetH}px, เท้าอยู่ที่ y=${feetY}`)

  const files = (await readdir(WALK_DIR)).filter(
    (name) => name.startsWith('pigsy-walk-') && name.endsWith('.png'),
  )

  for (const name of files) {
    const path = join(WALK_DIR, name)
    const box = await boundingBox(path)
    const cropped = sharp(path).extract({
      left: box.minX,
      top: box.minY,
      width: box.w,
      height: box.h,
    })
    const newH = targetH
    const newW = Math.round((box.w / box.h) * newH)
    const resized = await cropped.resize(newW, newH).toBuffer()

    const left = Math.round((CANVAS_W - newW) / 2)
    const top = feetY - newH + 1

    await sharp({
      create: {
        width: CANVAS_W,
        height: CANVAS_H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resized, left, top }])
      .png()
      .toFile(path)

    console.log(`${name}: ${box.w}x${box.h} -> วางที่ (${left},${top}) สูง ${newH}px บน canvas เต็ม`)
  }

  console.log(`เสร็จ — แก้แล้ว ${files.length} ไฟล์`)
}

await main()

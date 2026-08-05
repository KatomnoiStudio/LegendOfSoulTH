/**
 * กรอบโปรไฟล์ที่ผู้เล่นสวมรอบรูปประจำตัว
 * ทุกกรอบวาดด้วย SVG เอง (ดู AvatarFrame.tsx) ไม่มีไฟล์ภาพภายนอก
 */

export interface AvatarFrame {
  id: string
  name: string
  /** คำอธิบายวิธีได้มา */
  source: string
  /** สีของวงกรอบ */
  ring: string
  /** สีของอัญมณีประดับมุม */
  gem: string
  /** สีเรืองแสงรอบกรอบ */
  glow: string
  /** ปลดล็อกแล้วหรือยัง — ตอนนี้ยังไม่มีระบบเก็บของ จึงตั้งค่าตายตัวไว้ก่อน */
  unlocked: boolean
}

export const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: 'novice',
    name: 'กรอบผู้เริ่มต้น',
    source: 'ได้รับตั้งแต่เริ่มเกม',
    ring: '#4a5478',
    gem: '#98a0c0',
    glow: 'rgb(109 140 255 / 35%)',
    unlocked: true,
  },
  {
    id: 'arcane',
    name: 'กรอบเวทศิลา',
    source: 'ได้รับเมื่อถึงเลเวล 10',
    ring: '#6d8cff',
    gem: '#7ce8ff',
    glow: 'rgb(109 140 255 / 55%)',
    unlocked: true,
  },
  {
    id: 'ember',
    name: 'กรอบเปลวอังคาร',
    source: 'รางวัลจากลานประลองฤดูกาลที่ 1',
    ring: '#ff6a3d',
    gem: '#ffb073',
    glow: 'rgb(255 106 61 / 55%)',
    unlocked: false,
  },
  {
    id: 'sovereign',
    name: 'กรอบราชันย์',
    source: 'รางวัลอันดับ 1 ของลานประลอง',
    ring: '#f0c85a',
    gem: '#ffe6a8',
    glow: 'rgb(240 200 90 / 60%)',
    unlocked: false,
  },
]

export function getFrame(id: string): AvatarFrame {
  return AVATAR_FRAMES.find((f) => f.id === id) ?? AVATAR_FRAMES[0]
}

/**
 * ทะเบียนเสียงทั้งหมดในเกม — เพิ่มเสียงใหม่แค่เพิ่มบรรทัดที่นี่แล้ววางไฟล์ที่ path ที่ระบุ
 * ไฟล์ยังไม่มีก็เรียก playSfx(id)/playMusic(id) ได้ตามปกติ — engine แค่เงียบเสียงนั้นไป
 * (log ระดับ debug ไว้ให้เห็นตอน dev) ไม่ทำให้แอปพัง ดู src/lib/audio/AudioEngine.ts
 *
 * path เป็น relative จาก public/ เสมอ (ผ่าน publicUrl() ในเอนจินให้แล้ว ไม่ต้องใส่ / นำหน้า)
 */
export const SFX = {
  buttonClick: 'audio/sfx/button-click.mp3',
  portalOpen: 'audio/sfx/portal-open.mp3',
  currencyGain: 'audio/sfx/currency-gain.mp3',
  levelUp: 'audio/sfx/level-up.mp3',
  battleHit: 'audio/sfx/battle-hit.mp3',
  victory: 'audio/sfx/victory.mp3',
  defeat: 'audio/sfx/defeat.mp3',
  notification: 'audio/sfx/notification.mp3',
  error: 'audio/sfx/error.mp3',
  dialogueAdvance: 'audio/sfx/dialogue-advance.mp3',
  modalOpen: 'audio/sfx/modal-open.mp3',
  modalClose: 'audio/sfx/modal-close.mp3',
} as const

export type SfxId = keyof typeof SFX

export const MUSIC = {
  lobby: 'audio/music/lobby-theme.mp3',
} as const

export type MusicId = keyof typeof MUSIC

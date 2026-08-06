/**
 * ทะเบียนเสียงทั้งหมดในเกม — เพิ่มเสียงใหม่แค่เพิ่มบรรทัดที่นี่แล้ววางไฟล์ที่ path ที่ระบุ
 * ไฟล์ยังไม่มีก็เรียก playSfx(id)/playMusic(id) ได้ตามปกติ — engine แค่เงียบเสียงนั้นไป
 * (log ระดับ debug ไว้ให้เห็นตอน dev) ไม่ทำให้แอปพัง ดู src/lib/audio/AudioEngine.ts
 *
 * path เป็น relative จาก public/ เสมอ (ผ่าน publicUrl() ในเอนจินให้แล้ว ไม่ต้องใส่ / นำหน้า)
 *
 * 8 ไฟล์ที่มีอยู่จริงแล้ว (.ogg) มาจาก Kenney.nl (CC0 — public domain, ไม่ต้อง credit,
 * verified สดจาก kenney.nl ตรง ๆ วันที่โหลด 2026-08-06): interface-sounds pack
 * (buttonClick/dialogueAdvance/modalOpen/modalClose/notification/error), rpg-audio pack
 * (currencyGain), impact-sounds pack (battleHit) — เลือกเฉพาะไฟล์ที่ชื่อบอกความหมายชัดเจน
 * (click/select/open/close/confirmation/error/handleCoins/impactPunch) ไม่ต้องฟังก่อนเดา
 *
 * ที่เหลือ (portalOpen/levelUp/victory/defeat + เพลง lobby) ยังเป็น placeholder — Kenney
 * ไม่มีไฟล์ไหนบอก mood ชัดพอให้เลือกโดยไม่ฟัง (มีแต่เลขเรียง เช่น jingles-steel_00..16)
 * เจตนาปล่อยว่างไว้ให้คนที่ฟังเลือกเองทีหลัง (Freesound หรือแหล่งอื่นที่ license เคลียร์)
 *
 * Safari ต้องเป็น 18.4+ ถึงจะ decode Ogg Vorbis ผ่าน decodeAudioData() ได้ (verified สด
 * 2026-08-06) — browserslist ของโปรเจกต์นี้คือ "last 2 Safari versions" ซึ่งครอบคลุมอยู่แล้ว
 * (Safari ปัจจุบันคือรุ่น 26) ไม่ต้องแปลงเป็น mp3
 */
export const SFX = {
  buttonClick: 'audio/sfx/button-click.ogg',
  portalOpen: 'audio/sfx/portal-open.mp3',
  currencyGain: 'audio/sfx/currency-gain.ogg',
  levelUp: 'audio/sfx/level-up.mp3',
  battleHit: 'audio/sfx/battle-hit.ogg',
  victory: 'audio/sfx/victory.mp3',
  defeat: 'audio/sfx/defeat.mp3',
  notification: 'audio/sfx/notification.ogg',
  error: 'audio/sfx/error.ogg',
  dialogueAdvance: 'audio/sfx/dialogue-advance.ogg',
  modalOpen: 'audio/sfx/modal-open.ogg',
  modalClose: 'audio/sfx/modal-close.ogg',
} as const

export type SfxId = keyof typeof SFX

export const MUSIC = {
  lobby: 'audio/music/lobby-theme.mp3',
} as const

export type MusicId = keyof typeof MUSIC

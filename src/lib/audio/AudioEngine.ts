import { reportError } from '../errors/reportError'
import { readJson, writeJson } from '../storage'
import { publicUrl } from '../publicUrl'
import { MUSIC, SFX, type MusicId, type SfxId } from './sounds'

/**
 * ระบบเสียงกลางของเกม — Web Audio API เปล่า ไม่มี dependency ภายนอก
 *
 * ตัดสินใจจาก CoalBoard "ask CB" opinion-lane pass (2026-08-06, 4 seat เห็นตรงกันหมด
 * รวม blind seat): Howler.js ไม่ได้ maintain จริงตั้งแต่ 2023-09 (415 issue ค้าง, commit
 * หลังจากนั้นมีแค่ readme/backers) ส่วน Web Audio API รองรับเต็มไม่มี prefix ทุกเบราว์เซอร์ที่
 * browserslist ของโปรเจกต์ target อยู่แล้ว (Chrome 34+/Firefox 25+/Safari 14.1+ ต่ำกว่า floor
 * ของโปรเจกต์มาก) — ไม่มีเหตุผลต้องพึ่ง library เพื่อแก้ปัญหาที่ไม่มีอยู่จริงสำหรับ browser ชุดนี้
 *
 * AudioContext ตัวเดียวทั้งแอป สร้างครั้งแรกตอน initAudioEngine() ถูกเรียก — ต้องเรียกจาก
 * ภายใน user-gesture handler จริง (คลิก/แตะ) เบราว์เซอร์บล็อก autoplay ก่อนมีการโต้ตอบเสมอ
 */

export type AudioChannel = 'master' | 'music' | 'sfx'

export interface AudioSettings {
  master: number
  music: number
  sfx: number
  muted: boolean
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  master: 70,
  music: 60,
  sfx: 80,
  muted: false,
}

const SETTINGS_KEY = 'los:audio:v1'
/** กันเสียงเดียวกันถูกยิงซ้ำถี่เกินไป (เช่น กด stepper รัว ๆ) ไม่งั้น gain node ทับกันจนแตก */
const COOLDOWN_MS = 90

let context: AudioContext | null = null
let masterGain: GainNode | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let musicSource: AudioBufferSourceNode | null = null

let settings: AudioSettings = readJson<AudioSettings>(SETTINGS_KEY) ?? DEFAULT_AUDIO_SETTINGS

const bufferCache = new Map<string, AudioBuffer>()
const lastPlayedAt = new Map<string, number>()

/** ค่า gain จริง 0–1 จาก channel + master + muted รวมกันในทีเดียว */
function effectiveGain(channelPercent: number): number {
  if (settings.muted) return 0
  return (channelPercent / 100) * (settings.master / 100)
}

function applySettingsToGraph(): void {
  if (!context || !musicGain || !sfxGain) return
  const now = context.currentTime
  // setTargetAtTime กันเสียง "แกร็ก" ตอนลากแถบเสียงเร็ว ๆ (เปลี่ยนค่าราบเรียบแทนกระโดดทันที)
  musicGain.gain.setTargetAtTime(effectiveGain(settings.music), now, 0.01)
  sfxGain.gain.setTargetAtTime(effectiveGain(settings.sfx), now, 0.01)
}

/**
 * เรียกจาก event handler ของ user gesture จริงเท่านั้น (คลิก/แตะครั้งแรกของ session)
 * เรียกซ้ำได้ปลอดภัย — no-op ถ้ามี context อยู่แล้ว, resume() ถ้า suspended
 */
export function initAudioEngine(): void {
  if (context) {
    if (context.state === 'suspended') void context.resume()
    return
  }

  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) throw new Error('ไม่มี AudioContext ในเบราว์เซอร์นี้')

    context = new Ctor()
    masterGain = context.createGain()
    musicGain = context.createGain()
    sfxGain = context.createGain()

    musicGain.connect(masterGain)
    sfxGain.connect(masterGain)
    masterGain.connect(context.destination)
    masterGain.gain.value = 1 // master ผสมอยู่ใน effectiveGain ของแต่ละ channel แล้ว ไม่ต้องคูณซ้ำ

    applySettingsToGraph()
    void context.resume()
  } catch (err) {
    // Web Audio ใช้ไม่ได้ (เบราว์เซอร์เก่ามาก/ปิดสิทธิ์) — เกมเล่นต่อได้ปกติ แค่ไม่มีเสียง
    reportError('AUDIO_CONTEXT_INIT_FAIL', 'silent', err)
    context = null
  }
}

export function getAudioSettings(): AudioSettings {
  return settings
}

export function setAudioSettings(next: AudioSettings): void {
  settings = next
  if (!writeJson(SETTINGS_KEY, settings)) {
    reportError('AUDIO_SETTINGS_SAVE_FAIL', 'silent')
  }
  applySettingsToGraph()
}

/** โหลดไฟล์เสียงจาก public/ แคชไว้ในหน่วยความจำตาม id — เรียกซ้ำได้ ไม่โหลดซ้ำ */
async function loadBuffer(id: string, path: string): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(id)
  if (cached) return cached
  if (!context) return null

  try {
    const response = await fetch(publicUrl(path))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await context.decodeAudioData(arrayBuffer)
    bufferCache.set(id, audioBuffer)
    return audioBuffer
  } catch (err) {
    // ไฟล์ยังไม่มี/decode ไม่ผ่าน — เกมเล่นต่อได้ปกติ แค่เงียบเสียงนั้นไปเฉย ๆ
    reportError('AUDIO_BUFFER_LOAD_FAIL', 'silent', err, { id, path })
    return null
  }
}

/** เล่น SFX แบบเดี่ยว — overlap ได้อิสระ (source node ใหม่ทุกครั้ง จบเองแล้ว GC เก็บ ไม่ต้อง pool) */
export async function playSfx(id: SfxId): Promise<void> {
  if (!context || !sfxGain || settings.muted) return

  const last = lastPlayedAt.get(id) ?? 0
  const now = performance.now()
  if (now - last < COOLDOWN_MS) return
  lastPlayedAt.set(id, now)

  const buffer = await loadBuffer(id, SFX[id])
  if (!buffer || !context || !sfxGain) return // เผื่อ context หลุดระหว่าง await (ปิดแท็บ ฯลฯ)

  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(sfxGain)
  source.start()
}

/** เล่นเพลงพื้นหลังวนซ้ำ — หยุดเพลงเดิมก่อนถ้ามีเล่นอยู่ */
export async function playMusic(id: MusicId): Promise<void> {
  if (!context || !musicGain) return

  const buffer = await loadBuffer(id, MUSIC[id])
  if (!buffer || !context || !musicGain) return

  stopMusic()
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.connect(musicGain)
  source.start()
  musicSource = source
}

export function stopMusic(): void {
  musicSource?.stop()
  musicSource = null
}

/**
 * จุดต่อสำหรับเสียงสังเคราะห์แบบพิเศษที่ generate เองด้วย oscillator (ไม่ใช่ไฟล์)
 * เช่น TitlePage's ตอนนี้ — ให้ต่อเข้า sfxGain แทนที่จะสร้าง AudioContext ของตัวเองแยก
 * (เดิมแต่ละจุดสร้าง/ปิด AudioContext เอง ไม่ผูกกับ mute/volume ที่ผู้เล่นตั้งไว้เลย)
 * คืน null ถ้า engine ยังไม่ได้ init หรือ context ใช้งานไม่ได้
 */
export function getSynthDestination(): { context: AudioContext; destination: AudioNode } | null {
  if (!context || !sfxGain) return null
  return { context, destination: sfxGain }
}

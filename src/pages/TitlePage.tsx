import { useState, type CSSProperties } from 'react'
import { BattleIcon } from '../components/icons/GameIcons'
import { GAME_INFO } from '../game/gameInfo'
import { getSynthDestination, initAudioEngine } from '../lib/audio/AudioEngine'
import { reportError } from '../lib/errors/reportError'
import { BATTLE_ART_BG } from '../game/backgroundAssets'
import styles from './TitlePage.module.css'

// url('/backgrounds/...') ตรง ๆ ใน CSS ชี้ผิดที่ตอน deploy ขึ้น subpath (ดู src/lib/publicUrl.ts) —
// ส่งเข้าไปเป็น CSS custom property แทน
const BG_BATTLE_ART_STYLE: CSSProperties = {
  ['--bg-battle-art' as string]: `url(${BATTLE_ART_BG})`,
}

interface TitlePageProps {
  /**
   * ผู้เล่นกดปุ่มเข้าสู่ตำนาน
   * หน้านี้ไม่รู้ว่าขั้นถัดไปคืออะไร — App เป็นคนตัดสินว่าจะให้สมัคร ล็อกอิน
   * หรือตั้งชื่อตัวละคร (ดู src/App.tsx)
   */
  onStart: () => void
}

/**
 * เล่นผ่าน AudioContext/sfxGain ที่ใช้ร่วมกันทั้งแอป (src/lib/audio/AudioEngine.ts)
 * แทนที่จะสร้าง/ปิด AudioContext ของตัวเองทุกครั้ง — เดิมทำแบบนั้นแล้วไม่ผูกกับค่า
 * เสียง/ปิดเสียงที่ผู้เล่นตั้งไว้ใน SettingsModal เลย (คนละ context กันคนละโลก)
 */
function playLegendPortalSound() {
  initAudioEngine()
  const synth = getSynthDestination()
  if (!synth) return // Web Audio ใช้ไม่ได้ หรือยังไม่ผ่าน user gesture — เงียบไปเฉย ๆ

  try {
    const { context, destination } = synth
    const now = context.currentTime
    const master = context.createGain()

    master.gain.setValueAtTime(0.0001, now)
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.025)
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.72)
    master.connect(destination)

    const notes = [174.61, 261.63, 392]
    notes.forEach((frequency, index) => {
      const tone = context.createOscillator()
      const toneGain = context.createGain()
      const startAt = now + index * 0.045

      tone.type = index === 0 ? 'triangle' : 'sine'
      tone.frequency.setValueAtTime(frequency, startAt)
      tone.frequency.exponentialRampToValueAtTime(frequency * 1.012, startAt + 0.42)
      toneGain.gain.setValueAtTime(0.0001, startAt)
      toneGain.gain.exponentialRampToValueAtTime(index === 0 ? 0.55 : 0.34, startAt + 0.018)
      toneGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.54)
      tone.connect(toneGain)
      toneGain.connect(master)
      tone.start(startAt)
      tone.stop(startAt + 0.56)
    })

    const strike = context.createOscillator()
    const strikeGain = context.createGain()
    strike.type = 'square'
    strike.frequency.setValueAtTime(92, now)
    strike.frequency.exponentialRampToValueAtTime(54, now + 0.11)
    strikeGain.gain.setValueAtTime(0.22, now)
    strikeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13)
    strike.connect(strikeGain)
    strikeGain.connect(master)
    strike.start(now)
    strike.stop(now + 0.14)
  } catch (err) {
    // Web Audio may be unavailable; the visual response still works.
    reportError('AUDIO_PORTAL_SOUND_FAIL', 'silent', err)
  }
}

export function TitlePage({ onStart }: TitlePageProps) {
  const [isOpening, setIsOpening] = useState(false)

  const handleStart = () => {
    if (isOpening) return
    setIsOpening(true)
    playLegendPortalSound()
    // รอให้เสียงและแอนิเมชันประตูเล่นจบก่อนค่อยเปิดหน้าถัดไป
    window.setTimeout(() => {
      onStart()
      setIsOpening(false)
    }, 440)
  }

  return (
    <main className={styles.page}>
      <div className={styles.sky} aria-hidden="true">
        <span className={styles.moon} />
        <span className={styles.cloudOne} />
        <span className={styles.cloudTwo} />
        <span className={styles.grain} />
      </div>

      <div className={styles.frame} aria-hidden="true">
        <i className={`${styles.corner} ${styles.cornerTl}`} />
        <i className={`${styles.corner} ${styles.cornerTr}`} />
        <i className={`${styles.corner} ${styles.cornerBl}`} />
        <i className={`${styles.corner} ${styles.cornerBr}`} />
      </div>

      <div className={styles.battleArt} aria-hidden="true" style={BG_BATTLE_ART_STYLE} />

      <header className={styles.topBar}>
        <span className={styles.chapter}>บทที่ ๑ · การตื่นของตำนาน</span>
        <span className={styles.topMark} aria-hidden="true">
          ✦
        </span>
        <span className={styles.genre}>MYTHIC REAL-TIME RPG</span>
      </header>

      <section className={styles.brand} aria-labelledby="game-title">
        <div className={styles.seal} aria-hidden="true">
          <span className={styles.sealOrbit} />
          <span className={styles.sealCore}>魂</span>
        </div>
        <div className={styles.eyebrow}>
          <span />
          <em>THE JOURNEY BEGINS</em>
          <span />
        </div>
        <h1 className={styles.title} id="game-title" aria-label="Legend of Soul-TH">
          <span className={styles.legend}>Legend of</span>
          <span className={styles.soul}>Soul</span>
          <span className={styles.th}>TH</span>
        </h1>
        <p className={styles.subtitle}>เมื่อเหล่าตำนานกลับมามีลมหายใจอีกครั้ง</p>
        <p className={styles.description}>รวบรวมผู้กล้า · วางกลยุทธ์ · เขียนชะตาของคุณ</p>
      </section>

      <div className={styles.startZone}>
        <span className={styles.buttonWing} aria-hidden="true" />
        <div className={`${styles.buttonFrame} ${isOpening ? styles.buttonFrameOpening : ''}`}>
          <i className={`${styles.frameCorner} ${styles.frameCornerTl}`} aria-hidden="true" />
          <i className={`${styles.frameCorner} ${styles.frameCornerTr}`} aria-hidden="true" />
          <i className={`${styles.frameCorner} ${styles.frameCornerBl}`} aria-hidden="true" />
          <i className={`${styles.frameCorner} ${styles.frameCornerBr}`} aria-hidden="true" />
          <span className={styles.frameCrown} aria-hidden="true">
            <b>魂</b>
          </span>
          <button
            type="button"
            className={styles.start}
            onClick={handleStart}
            disabled={isOpening}
            aria-busy={isOpening}
          >
            <span className={styles.buttonRune} aria-hidden="true">
              ◆
            </span>
            <span className={styles.buttonCopy}>
              <strong>เข้าสู่ตำนาน</strong>
              <small>BEGIN YOUR JOURNEY</small>
            </span>
            <BattleIcon className={styles.startIcon} />
          </button>
          <span className={styles.clickBurst} aria-hidden="true" />
        </div>
        <span className={`${styles.buttonWing} ${styles.buttonWingRight}`} aria-hidden="true" />
        <span className={styles.keyHint}>กดเพื่อเริ่มการเดินทาง</span>
      </div>

      <footer className={styles.footer}>
        <span className={styles.online}>
          <i /> ตำนานพร้อมแล้ว
        </span>
        <span className={styles.footerEmblem} aria-hidden="true">
          ◈
        </span>
        <span>VERSION {GAME_INFO.version}</span>
      </footer>
    </main>
  )
}

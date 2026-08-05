import styles from './StartAdventure.module.css'

interface StartAdventureProps {
  onStart: () => void
}

/** ปุ่มหลักของหน้า Lobby สำหรับเข้าสู่ฉากผจญภัยจริง */
export function StartAdventure({ onStart }: StartAdventureProps) {
  return (
    <div className={styles.wrap}>
      <span className={styles.tagline}>เหล่าตำนานพร้อมออกศึกแล้ว</span>
      <button type="button" className={styles.button} onClick={onStart}>
        <span className={styles.halo} />
        <span className={styles.buttonText}>เริ่มการผจญภัย</span>
      </button>
    </div>
  )
}

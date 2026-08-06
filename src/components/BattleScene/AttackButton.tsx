import styles from './BattleScene.module.css'

/**
 * ปุ่มโจมตี — ปุ่มที่ใหญ่ที่สุดบนจอตามสเปกข้อ 12
 *
 * ใช้ `onPointerDown` ไม่ใช่ `onClick` เพราะ click บนมือถือรอจนกว่านิ้วจะยกขึ้น
 * ทำให้รู้สึกหน่วงชัดเจนในเกมที่จังหวะสำคัญระดับ 100 ms
 *
 * ปุ่มนี้ไม่แย่งนิ้วกับจอยสติก เพราะจอยจับ pointerId ของนิ้วแรกไว้แล้ว (ดู BattleJoystick)
 * จึงกดโจมตีระหว่างเดินได้จริง
 */
export function AttackButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      className={styles.attackBtn}
      aria-label="โจมตี"
      onPointerDown={(event) => {
        event.preventDefault()
        onPress()
      }}
    >
      โจมตี
    </button>
  )
}

import { useEffect, useState } from 'react'

/**
 * ระดับ refresh rate มาตรฐานที่จอจริงใช้กัน (ตามที่ผู้ผลิตจอ/สเปกอุตสาหกรรมระบุ)
 * ปัดผลวัดเข้าค่าที่ใกล้สุด กันความคลาดเคลื่อนจากการวัดด้วย requestAnimationFrame
 * (jitter ±2-3Hz เป็นปกติ แม้จอจริงจะนิ่งที่ค่าใดค่าหนึ่งเป๊ะ ๆ)
 */
const STANDARD_REFRESH_RATES = [30, 60, 90, 120, 144, 165, 240]

function snapToStandardRate(measuredHz: number): number {
  return STANDARD_REFRESH_RATES.reduce((closest, rate) =>
    Math.abs(rate - measuredHz) < Math.abs(closest - measuredHz) ? rate : closest,
  )
}

/** จำนวนเฟรมที่เก็บตัวอย่าง — มากพอให้ค่ามัธยฐานนิ่ง ไม่ถ่วงจนผู้เล่นรอนาน */
const SAMPLE_FRAMES = 20

/**
 * วัด refresh rate จริงของจอผ่าน requestAnimationFrame
 *
 * เบราว์เซอร์ไม่มี API เช็ค Hz ของจอตรง ๆ — นี่คือวิธีมาตรฐานที่ใช้กันทั่วไป
 * (จับช่วงเวลาระหว่างเฟรมติดต่อกันหลายเฟรม เพราะ rAF วิ่งตามจังหวะ compositor
 * ของเบราว์เซอร์ ซึ่งอิงจอจริงเสมอ แล้วหาค่ามัธยฐานกันเฟรมกระตุกเบี่ยงค่า)
 * คืนค่าเริ่มต้น 60 (มาตรฐานที่พบมากที่สุด) จนกว่าจะวัดเสร็จ
 */
export function useDeviceRefreshRate(): number {
  const [hz, setHz] = useState(60)

  useEffect(() => {
    const deltas: number[] = []
    let last = 0
    let frame = 0
    let rafId = 0

    const tick = (time: number) => {
      if (last > 0) deltas.push(time - last)
      last = time
      frame++
      if (frame < SAMPLE_FRAMES) {
        rafId = requestAnimationFrame(tick)
        return
      }
      deltas.sort((a, b) => a - b)
      const medianDelta = deltas[Math.floor(deltas.length / 2)]
      if (medianDelta > 0) setHz(snapToStandardRate(1000 / medianDelta))
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return hz
}

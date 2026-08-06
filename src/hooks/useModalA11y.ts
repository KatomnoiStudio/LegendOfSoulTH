import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { playSfx } from '../lib/audio/AudioEngine'

/** เลือก element ที่ tab ไปหาได้จริงในเบราว์เซอร์ — ตัด [tabindex="-1"] ออก (นั่นคือตัว shell เอง) */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * รวมพฤติกรรม accessibility ที่ modal ทุกตัวในเกมต้องมีเหมือนกัน ไว้ที่เดียว
 * (ก่อนหน้านี้แต่ละ modal เขียน Escape+backdrop-click+focus-on-open ซ้ำกันเองทุกไฟล์
 * แต่ไม่มีตัวไหนมี focus trap เลยสักตัว — Tab หลุดออกไปหลัง modal ที่ยัง mount อยู่ข้างหลังได้)
 *
 * ใช้แบบ:
 *   const { shellRef, backdropProps } = useModalA11y(onClose)
 *   <div className={styles.backdrop} {...backdropProps}>
 *     <div ref={shellRef} role="dialog" aria-modal="true" tabIndex={-1}>...
 *
 * onClose เป็น callback อะไรก็ได้ที่ "ปิด" ตามที่ modal นั้นนิยาม (บาง modal มี close-animation
 * ก่อน unmount จริง — ส่ง requestClose ที่ครอบ setTimeout ไว้แล้วเข้ามาได้ ไม่ต้องเป็น onClose ตรง ๆ)
 */
export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  const shellRef = useRef<T>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // ทุก caller ส่ง onClose เป็น inline arrow (`onClose={() => setOpen(false)}`) ซึ่งเป็นค่าใหม่
  // ทุกครั้งที่ parent re-render — ใส่ effect ด้านล่างให้ผูกกับค่านี้ตรง ๆ จะทำให้ focus-on-mount/
  // capture-previously-focused รันซ้ำทุก re-render ของ parent (ไม่ใช่แค่ตอนเปิด modal จริง)
  // ซึ่งแย่ง focus ออกจาก input ที่ผู้เล่นกำลังพิมพ์อยู่ข้างในไปเรื่อย ๆ — เก็บ onClose ล่าสุดไว้ใน
  // ref แทน แล้วให้ effect ด้านล่างรันแค่ตอน mount/unmount จริงเท่านั้น
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    shellRef.current?.focus()
    void playSfx('modalOpen')

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !shellRef.current) return

      const focusable = shellRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) {
        // ไม่มีอะไรให้ focus เลยข้างใน — กัน Tab หลุดออกไปข้างนอก modal
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      // คืนโฟกัสให้ element ที่เปิด modal นี้ไว้ (ปุ่มเมนู ฯลฯ) แทนที่จะปล่อยลอย
      previouslyFocused.current?.focus?.()
      // unmount cleanup รันครั้งเดียวเสมอไม่ว่าจะปิดผ่านทางไหน (Escape/backdrop/ปุ่ม X) —
      // จุดเดียวที่ครอบคลุมทุกเส้นทางปิดโดยไม่ต้องแก้ทุก modal ที่เรียก onClose ตรง ๆ เอง
      void playSfx('modalClose')
    }
  }, [])

  const backdropProps = {
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      if (event.target === event.currentTarget) onCloseRef.current()
    },
  }

  return { shellRef, backdropProps }
}

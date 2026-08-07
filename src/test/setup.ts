import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/*
  ทำความสะอาด DOM หลังทุกเทสต์ — จำเป็นเพราะโปรเจกต์นี้ไม่เปิด vitest `globals: true`
  (ทุกเทสต์ import describe/test/expect เองจาก 'vitest' ตรง ๆ) React Testing Library
  จึงตรวจไม่เจอ test framework โดยอัตโนมัติ ต้องสั่ง cleanup เองตรงนี้ที่เดียว
  ไม่งั้น component จากเทสต์ก่อนหน้าจะค้างอยู่ใน document แล้วเทสต์ถัดไปเจอ element ซ้ำ
*/
afterEach(() => {
  cleanup()
})

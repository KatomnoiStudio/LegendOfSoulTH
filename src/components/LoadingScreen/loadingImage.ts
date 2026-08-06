/**
 * จุดเดียวที่ต้องแก้เพื่อเปลี่ยนภาพ loading screen จริง — ยังไม่มีภาพจริงตอนนี้
 * (ค่า null) LoadingScreen เลยใช้ลาย 魂 (สูญ) แบบ CSS ที่มีอยู่แล้วใน TitlePage แทนไปก่อน
 * (ตัดสินใจจาก CoalBoard ask-CB: spinner ทั่วไปดูเหมือน asset ผิด/bug เพราะไม่มีอะไรในเกม
 * นี้หน้าตาแบบนั้นเลย — ลาย 魂 คือของที่เกมมีอยู่แล้วจริง ๆ)
 *
 * เปลี่ยนเป็นภาพจริง: ใส่ไฟล์ที่ public/ui/loading/ แล้วแก้บรรทัดล่างนี้เป็น
 * publicUrl('ui/loading/ชื่อไฟล์.webp') (import { publicUrl } from '../../lib/publicUrl'
 * — ห้ามใส่ path แบบ '/ui/...' ตรง ๆ เพราะพัง ตอน deploy ขึ้น subpath ของ GitHub Pages)
 * ไม่ต้องแก้ที่เรียก LoadingScreen ที่ไหนเลย ทุกจุดที่ใช้อยู่แล้วจะได้ภาพใหม่พร้อมกันทันที
 */
export const DEFAULT_LOADING_IMAGE_SRC: string | null = null

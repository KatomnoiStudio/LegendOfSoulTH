import { describe, expect, it } from 'vitest'
// ต้องมี .ts ต่อท้ายเพราะ tsconfig.node.json ใช้ module: nodenext
// (allowImportingTsExtensions เปิดไว้อยู่แล้ว)
import { resolveBasePath } from './vite.config.ts'

/*
  เทสต์ตัวนี้มีอยู่เพราะ base ที่ผิดทำให้เว็บ "ขาวสนิทโดยไม่มี error"
  ซึ่งเป็นอาการที่จับได้ยากที่สุดแบบหนึ่ง — HTML ตอบ 200 ปกติ แต่ทุก asset 404
  จนกว่าจะมีคนเปิด DevTools ดู network ถึงจะรู้ว่าเกิดอะไรขึ้น
*/
describe('resolveBasePath', () => {
  it('ใช้ชื่อ repo จาก GITHUB_REPOSITORY ของ repo ต้นทาง', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'LegendofSoulTH/LegendOfSoulTH' })).toBe(
      '/LegendOfSoulTH/',
    )
  })

  it('ใช้ชื่อ repo ของ fork ได้โดยไม่ต้องแก้ไฟล์ config', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'nustanakritwithai/GameTurnBase' })).toBe(
      '/GameTurnBase/',
    )
  })

  it('BASE_PATH เขียนทับได้ สำหรับ custom domain ที่เสิร์ฟจาก root', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'owner/repo', BASE_PATH: '/' })).toBe('/')
  })

  it('build นอก CI ยังได้ค่าเดิม ไม่เปลี่ยนพฤติกรรมของเครื่องใคร', () => {
    expect(resolveBasePath({})).toBe('/LegendOfSoulTH/')
  })
})

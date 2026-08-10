import { describe, expect, test } from 'vitest'
import lock from '../../package-lock.json'
import pkg from '../../package.json'
import { GAME_INFO } from './gameInfo'

/*
  เวอร์ชันเกม, package.json และ root metadata สองตำแหน่งใน package-lock.json ต้องตรงกันเสมอ

  `GAME_INFO.version` คือเลขที่ผู้เล่นเห็นบนหน้าไตเติลและหน้าตั้งค่า และตั้งแต่ 2026-08-07
  มันเป็นตัวสั่งปล่อยเว็บด้วย — .github/workflows/deploy.yml จะ deploy ก็ต่อเมื่อเลขนี้เปลี่ยน
  ส่วน package.json เป็นเลขของ npm package ที่เครื่องมือรอบข้างอ่าน (SBOM, release tag)
  ส่วน package-lock.json (lock.version และ lock.packages[''].version) เป็นเลขที่ npm
  เขียนเองตอน `npm install` — ถ้าไม่ sync ด้วย `npm install --package-lock-only` มันจะค้าง
  เลขเก่าเงียบ ๆ ข้ามหลายรีลีสได้ (เคยเกิดจริง — ค้างที่ 0.15.2 ข้ามสองรีลีส)

  ถ้าเลขพวกนี้หลุดจากกันจะได้ผลประหลาดแบบเงียบ ๆ เช่น bump แค่ package.json แล้วเว็บไม่ปล่อย
  ทั้งที่ดูเหมือนออกเวอร์ชันใหม่แล้ว หรือ SBOM ในรีลีสระบุเลขคนละตัวกับที่เกมโชว์
  เทสต์นี้แดงก่อนถึง deploy เพราะ ci.yml และ deploy.yml รันชุดเดียวกัน
*/
describe('GAME_INFO.version', () => {
  test('ตรงกับ version ใน package.json และ package-lock.json', () => {
    expect(GAME_INFO.version).toBe(pkg.version)
    expect(lock.version).toBe(pkg.version)
    expect(lock.packages[''].version).toBe(pkg.version)
  })

  test('เป็นรูปแบบ SemVer ที่ tag รีลีสใช้ได้', () => {
    // deploy.yml ตัด tag เป็น `v${version}` — เลขที่ไม่ใช่ SemVer จะได้ tag ที่อ่านไม่รู้เรื่อง
    expect(GAME_INFO.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
  })
})

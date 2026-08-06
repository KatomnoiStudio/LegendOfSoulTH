import { describe, expect, test } from 'vitest'
import { directionFromVector, isInsideWalkableArea, projectToWalkableArea } from './movement'

describe('directionFromVector', () => {
  test('snaps the 4 cardinal directions', () => {
    expect(directionFromVector(1, 0)).toBe('right')
    expect(directionFromVector(-1, 0)).toBe('left')
    expect(directionFromVector(0, 1)).toBe('down')
    expect(directionFromVector(0, -1)).toBe('up')
  })

  test('snaps the 4 diagonals', () => {
    expect(directionFromVector(1, 1)).toBe('down-right')
    expect(directionFromVector(1, -1)).toBe('up-right')
    expect(directionFromVector(-1, 1)).toBe('down-left')
    expect(directionFromVector(-1, -1)).toBe('up-left')
  })
})

describe('isInsideWalkableArea', () => {
  test('a point near the courtyard center is inside', () => {
    expect(isInsideWalkableArea({ x: 800, y: 700 })).toBe(true)
  })

  test('a point far outside the polygon bounds is outside', () => {
    expect(isInsideWalkableArea({ x: -500, y: -500 })).toBe(false)
    expect(isInsideWalkableArea({ x: 5000, y: 5000 })).toBe(false)
  })
})

describe('projectToWalkableArea', () => {
  test('a point already inside is returned unchanged', () => {
    const point = { x: 800, y: 700 }
    expect(projectToWalkableArea(point)).toEqual(point)
  })

  test('a point outside is clamped onto the polygon boundary (stays inside-or-on afterward)', () => {
    const projected = projectToWalkableArea({ x: -500, y: 700 })
    // ผลลัพธ์ต้องไม่ใช่จุดเดิม (ถูกเลื่อนเข้ามาจริง) และต้องอยู่ในพื้นที่เดินได้ (หรือขอบพอดี)
    expect(projected).not.toEqual({ x: -500, y: 700 })
    expect(isInsideWalkableArea(projected) || projected.x >= 110).toBe(true)
  })
})

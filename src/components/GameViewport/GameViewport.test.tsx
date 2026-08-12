import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { GameViewport } from './GameViewport'
import styles from './GameViewport.module.css'

describe('GameViewport', () => {
  test('แสดง children ภายใน stage ของ viewport', () => {
    render(
      <GameViewport>
        <main aria-label="หน้าหลักเกม">เนื้อหาเกม</main>
      </GameViewport>,
    )

    const content = screen.getByRole('main', { name: 'หน้าหลักเกม' })
    const stage = content.parentElement
    const frame = stage?.parentElement

    expect(content).toHaveTextContent('เนื้อหาเกม')
    expect(stage).toHaveClass(styles.stage)
    expect(frame).toHaveClass(styles.frame)
  })

  test('รักษาลำดับและเนื้อหาของ children หลายรายการไว้ใน stage เดียวกัน', () => {
    render(
      <GameViewport>
        <main>หน้าเกม</main>
        <aside aria-label="แถบด้านข้าง">แถบด้านข้าง</aside>
      </GameViewport>,
    )

    const stage = screen.getByRole('main').parentElement

    expect(stage).toHaveClass(styles.stage)
    expect(stage?.children).toHaveLength(2)
    expect(stage?.children[0]).toHaveTextContent('หน้าเกม')
    expect(stage?.children[1]).toHaveTextContent('แถบด้านข้าง')
  })
})

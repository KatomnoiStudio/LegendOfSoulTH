import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingScreen } from './LoadingScreen'
import styles from './LoadingScreen.module.css'

describe('LoadingScreen', () => {
  it('ใช้จอทึบและประกาศสถานะเมื่อใช้ visual เริ่มต้น', () => {
    render(<LoadingScreen label="กำลังโหลด" />)

    const status = screen.getByRole('status')
    expect(status).toHaveClass(styles.opaqueScreen)
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('กำลังโหลด')
    expect(status.querySelector(`.${styles.seal}`)).toBeInTheDocument()
    expect(status.querySelector(`.${styles.sealCore}`)).toHaveTextContent('魂')
  })

  it('ใช้พื้นหลัง overlay และไม่สร้าง live region ซ้ำเมื่อมี children', () => {
    render(
      <LoadingScreen background="overlay" label="กำลังเตรียมสนามรบ">
        <div role="status" aria-live="assertive">
          การ์ด VS
        </div>
      </LoadingScreen>,
    )

    const overlay = screen.getByText('กำลังเตรียมสนามรบ').parentElement
    expect(overlay).toHaveClass(styles.overlayScreen)
    expect(overlay).not.toHaveAttribute('role')
    expect(overlay).not.toHaveAttribute('aria-live')
    expect(screen.getByRole('status')).toHaveTextContent('การ์ด VS')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
    expect(screen.queryByText('魂')).not.toBeInTheDocument()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UpdateBanner } from './UpdateBanner'
import { useDeployWatcher } from '../../hooks/useDeployWatcher'

vi.mock('../../hooks/useDeployWatcher')

/*
  เดิมแถบนี้แค่เตือนเฉย ๆ ให้ผู้เล่นกดรีเฟรชเอง ปิดทิ้งได้ (dismiss) — เปลี่ยนเป็นบังคับรีเฟรช
  อัตโนมัติ (HetCreep 2026-08-07) เพราะ session ผูกกับเลขเวอร์ชัน build เก่าที่ไม่รีเฟรชจะใช้
  งานต่อไม่ได้อยู่ดี เทสต์นี้ล็อกพฤติกรรม "ต้องรีเฟรชเอง ปิดไม่ได้" ไว้ไม่ให้เผลอกลับไปมี dismiss
*/
describe('UpdateBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('ไม่มีอัปเดต ไม่แสดงอะไรเลย', () => {
    vi.mocked(useDeployWatcher).mockReturnValue(false)
    const { container } = render(<UpdateBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('มีอัปเดต แสดงข้อความ ไม่มีปุ่มปิด (บังคับรีเฟรชเท่านั้น)', () => {
    vi.mocked(useDeployWatcher).mockReturnValue(true)
    render(<UpdateBanner />)

    expect(screen.getByRole('status')).toHaveTextContent('มีอัปเดตใหม่ของเกม')
    expect(screen.getByRole('button', { name: 'รีเฟรชตอนนี้' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ปิด' })).not.toBeInTheDocument()
  })

  it('มีอัปเดต ปล่อยเวลาผ่านไปครบ — รีเฟรชอัตโนมัติเอง', () => {
    vi.mocked(useDeployWatcher).mockReturnValue(true)
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })

    render(<UpdateBanner />)
    expect(reloadSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(5000)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('กดปุ่ม "รีเฟรชตอนนี้" รีเฟรชทันที ไม่ต้องรอครบเวลา', () => {
    vi.mocked(useDeployWatcher).mockReturnValue(true)
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })

    render(<UpdateBanner />)
    screen.getByRole('button', { name: 'รีเฟรชตอนนี้' }).click()

    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })
})

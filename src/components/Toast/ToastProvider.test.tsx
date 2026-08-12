import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { playSfx } from '../../lib/audio/AudioEngine'
import { ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

vi.mock('../../lib/audio/AudioEngine', () => ({
  playSfx: vi.fn().mockResolvedValue(undefined),
}))

function ToastHarness() {
  const { showToast, comingSoon } = useToast()

  return (
    <div>
      <button onClick={() => showToast('บันทึกสำเร็จ')}>success</button>
      <button onClick={() => showToast('เกิดข้อผิดพลาด', 'error')}>error</button>
      <button onClick={() => showToast('ได้รับหยก', 'currency')}>currency</button>
      <button onClick={() => comingSoon('กิลด์')}>coming-soon</button>
      <button onClick={() => showToast('ข้อความซ้ำ')}>duplicate</button>
      <button onClick={() => showToast('หนึ่ง')}>one</button>
      <button onClick={() => showToast('สอง')}>two</button>
      <button onClick={() => showToast('สาม')}>three</button>
      <button onClick={() => showToast('สี่')}>four</button>
    </div>
  )
}

function renderToast() {
  return render(
    <ToastProvider>
      <ToastHarness />
    </ToastProvider>,
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('ToastProvider', () => {
  test('แสดงข้อความใน live region และเล่นเสียงตาม variant', () => {
    renderToast()

    fireEvent.click(screen.getByRole('button', { name: 'success' }))
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('บันทึกสำเร็จ')).toBeInTheDocument()
    expect(playSfx).toHaveBeenLastCalledWith('notification')

    fireEvent.click(screen.getByRole('button', { name: 'error' }))
    fireEvent.click(screen.getByRole('button', { name: 'currency' }))
    expect(playSfx).toHaveBeenNthCalledWith(2, 'error')
    expect(playSfx).toHaveBeenNthCalledWith(3, 'currencyGain')
  })

  test('comingSoon เติมข้อความตามสัญญาโดยไม่ต้องเรียก showToast ตรง ๆ', () => {
    renderToast()

    fireEvent.click(screen.getByRole('button', { name: 'coming-soon' }))

    expect(screen.getByText('กิลด์ — เร็ว ๆ นี้')).toBeInTheDocument()
    expect(playSfx).toHaveBeenCalledWith('notification')
  })

  test('ไม่กองข้อความเดียวกันซ้ำระหว่างที่ toast เดิมยังแสดงอยู่ และแสดงใหม่ได้หลังหมดอายุ', () => {
    vi.useFakeTimers()
    renderToast()

    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }))
    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }))
    expect(screen.getAllByText('ข้อความซ้ำ')).toHaveLength(1)
    expect(playSfx).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(2_460)
    })
    expect(screen.queryByText('ข้อความซ้ำ')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }))
    expect(screen.getByText('ข้อความซ้ำ')).toBeInTheDocument()
    expect(playSfx).toHaveBeenCalledTimes(2)
  })

  test('เก็บ toast ที่มองเห็นได้ไม่เกินสามรายการล่าสุด', () => {
    renderToast()

    for (const label of ['one', 'two', 'three', 'four']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).not.toHaveTextContent('หนึ่ง')
    expect(liveRegion).toHaveTextContent('สอง')
    expect(liveRegion).toHaveTextContent('สาม')
    expect(liveRegion).toHaveTextContent('สี่')
    expect(liveRegion.querySelectorAll('[data-leaving]').length).toBe(3)
  })

  test('toast ที่ถูกเบียดตกจอ แสดงใหม่ได้ทันที ไม่ต้องรอ timer ของตัวเอง', () => {
    vi.useFakeTimers()
    renderToast()

    // Push 'หนึ่ง' off the visible stack by overflowing MAX_VISIBLE.
    for (const label of ['one', 'two', 'three', 'four']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    expect(screen.getByRole('status')).not.toHaveTextContent('หนึ่ง')
    expect(playSfx).toHaveBeenCalledTimes(4)

    // It is off screen, so nothing is "already showing" — asking for it again must show it.
    // The duplicate guard exists to stop a message stacking on top of ITSELF while visible;
    // once evicted there is nothing to stack on. Swallowing it here is a silent dead end:
    // no toast, no sound, and nothing on screen explaining why the button did nothing.
    fireEvent.click(screen.getByRole('button', { name: 'one' }))

    expect(screen.getByRole('status')).toHaveTextContent('หนึ่ง')
    expect(playSfx).toHaveBeenCalledTimes(5)
  })
})

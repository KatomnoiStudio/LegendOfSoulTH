import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainNavigation } from './MainNavigation'
import { ToastProvider } from '../Toast/ToastProvider'

/*
  MainNavigation คือ chrome ที่ mount ค้างตลอด lobby — ประตูเดียวเข้าสู่ battle/heroes/items
  และเมนูอื่น ๆ ที่ยังไม่เปิด (comingSoon ผ่าน ToastProvider จริง ไม่ mock เพราะ useToast()
  throw ถ้าไม่มี provider ครอบ — ต้องเทสต์ผ่าน context จริงเหมือนที่ใช้งานจริงในแอป)
*/

function renderNav(overrides: Partial<Parameters<typeof MainNavigation>[0]> = {}) {
  const onOpenHeroes = vi.fn()
  const onOpenBattle = vi.fn()
  const onOpenPvP = vi.fn()
  const onOpenItems = vi.fn()
  const onOpenSummon = vi.fn()
  render(
    <ToastProvider>
      <MainNavigation
        onOpenHeroes={onOpenHeroes}
        onOpenBattle={onOpenBattle}
        onOpenPvP={onOpenPvP}
        onOpenItems={onOpenItems}
        onOpenSummon={onOpenSummon}
        {...overrides}
      />
    </ToastProvider>,
  )
  return { onOpenHeroes, onOpenBattle, onOpenPvP, onOpenItems, onOpenSummon }
}

describe('MainNavigation', () => {
  test('render ครบ 8 ปุ่มเมนู ภายใต้ nav ที่มี label', () => {
    renderNav()

    expect(screen.getByRole('navigation', { name: 'เมนูหลัก' })).toBeInTheDocument()
    for (const label of [
      'ต่อสู้',
      'ตัวละคร',
      'สัตว์เลี้ยง',
      'PvP',
      'จัดทีม',
      'ไอเทม',
      'อัญเชิญ',
      'กิลด์',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  test('กด "ตัวละคร" เรียก onOpenHeroes เท่านั้น ไม่ยิง callback อื่น', async () => {
    const user = userEvent.setup()
    const { onOpenHeroes, onOpenBattle, onOpenItems } = renderNav()

    await user.click(screen.getByRole('button', { name: 'ตัวละคร' }))

    expect(onOpenHeroes).toHaveBeenCalledTimes(1)
    expect(onOpenBattle).not.toHaveBeenCalled()
    expect(onOpenItems).not.toHaveBeenCalled()
  })

  test('กด "ต่อสู้" เรียก onOpenBattle', async () => {
    const user = userEvent.setup()
    const { onOpenBattle } = renderNav()

    await user.click(screen.getByRole('button', { name: 'ต่อสู้' }))

    expect(onOpenBattle).toHaveBeenCalledTimes(1)
  })

  test('กด "ไอเทม" เรียก onOpenItems', async () => {
    const user = userEvent.setup()
    const { onOpenItems } = renderNav()

    await user.click(screen.getByRole('button', { name: 'ไอเทม' }))

    expect(onOpenItems).toHaveBeenCalledTimes(1)
  })

  /*
    The Gacha backend is deployed, but the Standard Banner's Heroes have not cleared the
    Production Asset Contract, so the button falls through to the coming-soon toast behind
    `GACHA_PRODUCTION_CONTENT_READY`. This test pins the gate; when the checklist passes and the
    flag flips, restore the original expectation that `onOpenSummon` fires.
  */
  test('กด "อัญเชิญ" ไม่เปิด modal จนกว่า Asset Contract ผ่าน — ขึ้น toast แทน', async () => {
    const user = userEvent.setup()
    const { onOpenSummon } = renderNav()

    await user.click(screen.getByRole('button', { name: 'อัญเชิญ' }))

    expect(onOpenSummon).not.toHaveBeenCalled()
    expect(await screen.findByText('อัญเชิญ — เร็ว ๆ นี้')).toBeInTheDocument()
  })

  /*
    v0.15.0 shipped the PvP button to live while its room RPCs and the `pvp-authority` Edge
    Function were still undeployed, so every tap produced an error the player could not act on.
    The button is now gated behind `PVP_BACKEND_DEPLOYED` and falls through to the coming-soon
    toast. This test pins the gate; when the backend is deployed and the flag flips, replace it
    with the original expectation that `onOpenPvP` fires.
  */
  test('กด "PvP" ยังไม่เปิด modal ตราบใดที่ backend ยังไม่ deploy — ขึ้น toast เร็ว ๆ นี้แทน', async () => {
    const user = userEvent.setup()
    const { onOpenPvP, onOpenBattle } = renderNav()

    await user.click(screen.getByRole('button', { name: 'PvP' }))

    expect(onOpenPvP).not.toHaveBeenCalled()
    expect(onOpenBattle).not.toHaveBeenCalled()
    expect(await screen.findByText('PvP — เร็ว ๆ นี้')).toBeInTheDocument()
  })

  test('กดเมนูที่ยังไม่เปิด (เช่น "กิลด์") ไม่เรียก callback ไหนเลย แต่ขึ้น toast comingSoon', async () => {
    const user = userEvent.setup()
    const { onOpenHeroes, onOpenBattle, onOpenItems } = renderNav()

    await user.click(screen.getByRole('button', { name: 'กิลด์' }))

    expect(onOpenHeroes).not.toHaveBeenCalled()
    expect(onOpenBattle).not.toHaveBeenCalled()
    expect(onOpenItems).not.toHaveBeenCalled()
    expect(await screen.findByText('กิลด์ — เร็ว ๆ นี้')).toBeInTheDocument()
  })
})

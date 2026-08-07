import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterCard } from './CharacterCard'
import { ROSTER, RARITY_LABEL } from '../../game/characters'

/*
  การ์ดนี้ถูกเรนเดอร์ซ้ำ N ใบในทำเนียบวีรชน — บั๊กเรื่อง label หรือ selection
  state ที่นี่จะกระทบทุกใบพร้อมกัน ล็อกไว้ 3 เรื่อง: label สำหรับ screen
  reader ประกอบถูกฟิลด์, aria-pressed สะท้อน selected จริง, และคลิกแล้ว
  ส่ง id ตัวละครที่ถูกต้องกลับไป (ไม่ใช่แค่ handler ถูกเรียก)
*/

const character = ROSTER[0] // ซุนหงอคง — legendary, ธาตุลม

describe('CharacterCard', () => {
  test('เรนเดอร์ปุ่มเดียว มี label ครบชื่อ/เลเวล/ระดับ/ธาตุ ให้ screen reader', () => {
    render(<CharacterCard character={character} selected={false} onSelect={vi.fn()} />)

    const card = screen.getByRole('button', {
      name: `${character.name} เลเวล ${character.level} ระดับ${RARITY_LABEL[character.rarity]} ธาตุ${character.element}`,
    })
    expect(card).toBeInTheDocument()
    expect(screen.getByText(character.name)).toBeInTheDocument()
    expect(screen.getByText(`Lv.${character.level}`)).toBeInTheDocument()
  })

  test('รูปย่อเป็น decorative (alt ว่าง) เพราะข้อมูลตัวละครอยู่ใน aria-label ของปุ่มแล้ว', () => {
    const { container } = render(
      <CharacterCard character={character} selected={false} onSelect={vi.fn()} />,
    )
    // alt="" ทำให้ role เป็น "presentation" ไม่ใช่ "img" — query ตรง ๆ ผ่าน tag แทน
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  test('selected=false → aria-pressed เป็น false', () => {
    render(<CharacterCard character={character} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')
  })

  test('selected=true → aria-pressed เป็น true จริง ไม่ใช่ hardcode', () => {
    render(<CharacterCard character={character} selected onSelect={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  test('คลิกการ์ด — เรียก onSelect ด้วย id ของตัวละครใบนี้เท่านั้น', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<CharacterCard character={character} selected={false} onSelect={onSelect} />)

    await user.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(character.id)
  })
})

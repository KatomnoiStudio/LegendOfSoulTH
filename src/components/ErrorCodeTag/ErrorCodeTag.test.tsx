import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ErrorCodeTag } from './ErrorCodeTag'

describe('ErrorCodeTag', () => {
  test('แสดงรหัสและคำอธิบายของ error code ในข้อความเดียวกัน', () => {
    render(<ErrorCodeTag code="PLAYER_SAVE_FAIL" />)

    expect(screen.getByText('PLAYER_SAVE_FAIL — บันทึกความคืบหน้าไม่สำเร็จ พื้นที่เก็บข้อมูลอาจเต็ม')).toBeInTheDocument()
  })

  test('แสดงคำอธิบายที่ตรงกับรหัสที่ส่งเข้ามาแต่ละรายการ', () => {
    render(<ErrorCodeTag code="LOBBY_SCENE_WEBGL_CONTEXT_LOST" />)

    expect(screen.getByText('LOBBY_SCENE_WEBGL_CONTEXT_LOST — การ์ดจอขาดการเชื่อมต่อ (WebGL)')).toBeInTheDocument()
  })
})

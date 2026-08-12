import { act, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { LobbyScene } from './LobbyScene'

const mocks = vi.hoisted(() => ({
  webglAvailable: true,
  reportError: vi.fn(),
}))

function MockCanvas({
  children,
  onCreated,
  onPointerMissed,
  ...props
}: {
  children?: ReactNode
  onCreated?: (state: { gl: { domElement: HTMLCanvasElement } }) => void
  onPointerMissed?: () => void
  [key: string]: unknown
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) onCreated?.({ gl: { domElement: canvasRef.current } })
  }, [onCreated])

  return (
    <div {...props}>
      <canvas data-testid="lobby-canvas" ref={canvasRef} />
      <button type="button" onClick={onPointerMissed}>
        miss scene
      </button>
      {children}
    </div>
  )
}

vi.mock('three/addons/capabilities/WebGL.js', () => ({
  default: {
    isWebGL2Available: () => mocks.webglAvailable,
  },
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: MockCanvas,
  useFrame: vi.fn(),
  useThree: () => ({ camera: { position: { x: 0, y: 0, z: 0 }, lookAt: vi.fn() }, size: { width: 800, height: 600 } }),
}))

vi.mock('../../hooks/useDeviceRefreshRate', () => ({
  useDeviceRefreshRate: () => 60,
}))

vi.mock('../../hooks/usePerformanceQuality', () => ({
  usePerformanceQuality: vi.fn(),
}))

vi.mock('../../lib/errors/reportError', () => ({
  reportError: mocks.reportError,
}))

vi.mock('../ErrorCodeTag/ErrorCodeTag', () => ({
  ErrorCodeTag: ({ code }: { code: string }) => <span data-testid="error-code">{code}</span>,
}))

function renderLobby(onSelect = vi.fn()) {
  return render(
    <LobbyScene
      teamSlots={[null, null, null, null]}
      selectedId={null}
      onSelect={onSelect}
      qualityOverride="auto"
    />,
  )
}

describe('LobbyScene', () => {
  beforeEach(() => {
    mocks.webglAvailable = true
    mocks.reportError.mockReset()
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  test('แสดง fallback เมื่อเบราว์เซอร์ไม่รองรับ WebGL2', () => {
    mocks.webglAvailable = false

    renderLobby()

    expect(screen.getByText('เบราว์เซอร์นี้ไม่รองรับ WebGL2 — ไม่สามารถแสดงฉาก 3D ได้')).toBeInTheDocument()
    expect(screen.queryByTestId('lobby-canvas')).not.toBeInTheDocument()
  })

  test('ยกเลิกการเลือกเมื่อคลิกพื้นที่ว่างของฉาก', () => {
    const onSelect = vi.fn()

    renderLobby(onSelect)
    fireEvent.click(screen.getByRole('button', { name: 'miss scene' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  test('แสดงรหัสข้อผิดพลาดและรายงานเมื่อ WebGL context หาย แล้วซ่อนเมื่อกู้คืน', () => {
    renderLobby()
    const canvas = screen.getByTestId('lobby-canvas')
    const lost = new Event('webglcontextlost', { cancelable: true })

    act(() => {
      canvas.dispatchEvent(lost)
    })

    expect(lost.defaultPrevented).toBe(true)
    expect(mocks.reportError).toHaveBeenCalledWith('LOBBY_SCENE_WEBGL_CONTEXT_LOST', 'visible')
    expect(screen.getByText('การ์ดจอขาดการเชื่อมต่อ — กำลังลองใหม่ ลองรีเฟรชหน้าถ้ายังไม่กลับมา')).toBeInTheDocument()
    expect(screen.getByTestId('error-code')).toHaveTextContent('LOBBY_SCENE_WEBGL_CONTEXT_LOST')

    act(() => {
      canvas.dispatchEvent(new Event('webglcontextrestored'))
    })

    expect(screen.queryByTestId('error-code')).not.toBeInTheDocument()
  })

  test('ถอด context listeners เมื่อ unmount เพื่อไม่รายงานเหตุการณ์จาก canvas เก่า', () => {
    const view = renderLobby()
    const canvas = screen.getByTestId('lobby-canvas')
    view.unmount()

    act(() => {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })

    expect(mocks.reportError).not.toHaveBeenCalled()
  })
})

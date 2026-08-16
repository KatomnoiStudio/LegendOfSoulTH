import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  WEBGPU_INIT_TIMEOUT_MS,
  createLobbyRenderer,
  type LobbyRendererDeps,
} from './createLobbyRenderer'

const reportError = vi.hoisted(() => vi.fn())
vi.mock('../../lib/errors/reportError', () => ({ reportError }))

/*
  เทสต์นี้แทน Playwright ที่ audit item B27 เสนอ — ไม่ใช่เพราะประหยัด dependency อย่างเดียว
  แต่เพราะเบราว์เซอร์จริงกระตุ้นสองในสามทางนี้ไม่ได้เลย: สั่งให้ driver ปฏิเสธ WebGPU ตามต้องการ
  ไม่ได้ และสั่งให้ requestAdapter() ค้างไม่ resolve ก็ไม่ได้ ทั้งที่ทางค้างคือทางที่ผู้เล่นเจอจริง
  (เกม "ค้างยาว" หลังล็อกอิน) และเป็นเหตุผลที่ timeout มีอยู่
*/

const CANVAS = { canvas: {} as HTMLCanvasElement, alpha: true }

/** renderer ปลอมของ WebGPU — init() ทำตามที่แต่ละเทสต์สั่ง */
function fakeWebGPU(init: () => Promise<unknown>) {
  const dispose = vi.fn()
  const WebGPURenderer = vi.fn(function (this: Record<string, unknown>, props: unknown) {
    this.init = init
    this.dispose = dispose
    this.props = props
  }) as unknown as new (props: unknown) => unknown
  return { WebGPURenderer, dispose }
}

function deps(overrides: Partial<LobbyRendererDeps> = {}) {
  const webgl = vi.fn((props: Record<string, unknown>) => ({ kind: 'webgl2', props }))
  return {
    webgl,
    deps: {
      hasWebGPU: () => true,
      importWebGPU: () =>
        Promise.reject(new Error('importWebGPU not stubbed for this test')) as never,
      // ตัวปลอมไม่ได้เป็น WebGLRenderer จริง — เทสต์สนใจแค่ว่า "สาขา WebGL2 ถูกเรียกไหม"
      // จึงคืน object ที่ระบุตัวได้ง่ายแทนการสร้าง renderer จริงที่ jsdom ไม่มี WebGL ให้
      createWebGL: webgl as unknown as LobbyRendererDeps['createWebGL'],
      ...overrides,
    } satisfies LobbyRendererDeps,
  }
}

beforeEach(() => {
  reportError.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createLobbyRenderer', () => {
  test('ไม่มี navigator.gpu → ใช้ WebGL2 โดยไม่แตะ three/webgpu เลย', async () => {
    const importWebGPU = vi.fn()
    const { deps: d } = deps({ hasWebGPU: () => false, importWebGPU: importWebGPU as never })

    const renderer = await createLobbyRenderer(CANVAS, vi.fn(), d)

    expect(renderer).toEqual({ kind: 'webgl2', props: expect.anything() })
    // สำคัญกว่าที่ได้ WebGL2: ห้าม import three/webgpu มาเปล่า ๆ บนเครื่องที่ไม่มี WebGPU
    // (chunk ก้อนนั้น 567 KB — โหลดมาแล้วไม่ได้ใช้คือจ่ายฟรี)
    expect(importWebGPU).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
  })

  test('WebGPU ใช้ได้ → คืน renderer ของ WebGPU และไม่สร้าง WebGL2', async () => {
    const gpu = fakeWebGPU(() => Promise.resolve())
    const { deps: d, webgl } = deps({
      importWebGPU: () => Promise.resolve({ WebGPURenderer: gpu.WebGPURenderer }) as never,
    })
    const onDeviceLost = vi.fn()

    const renderer = (await createLobbyRenderer(CANVAS, onDeviceLost, d)) as {
      onDeviceLost: (info: unknown) => void
    }

    expect(webgl).not.toHaveBeenCalled()
    expect(gpu.dispose).not.toHaveBeenCalled()
    // onDeviceLost ต้องถูกผูกไว้จริง — WebGPU ไม่ยิง DOM event 'webglcontextlost' ถ้าไม่ผูก
    // ตัวนี้ การ์ดจอหลุดแล้วจะเงียบสนิท ไม่มี fallback UI ขึ้นเลย
    expect(typeof renderer.onDeviceLost).toBe('function')
    renderer.onDeviceLost({ reason: 'destroyed' })
    expect(onDeviceLost).toHaveBeenCalledWith({ reason: 'destroyed' })
  })

  test('init() reject → dispose แล้วตกไป WebGL2 พร้อมรายงานแบบ silent', async () => {
    const boom = new Error('no adapter')
    const gpu = fakeWebGPU(() => Promise.reject(boom))
    const { deps: d } = deps({
      importWebGPU: () => Promise.resolve({ WebGPURenderer: gpu.WebGPURenderer }) as never,
    })

    const renderer = await createLobbyRenderer(CANVAS, vi.fn(), d)

    expect(renderer).toEqual({ kind: 'webgl2', props: expect.anything() })
    // dispose คือส่วนที่พลาดง่ายที่สุด — init() ล้มหลังจอง adapter/device ไปแล้วบางส่วน
    // ไม่ dispose = GPU resource ค้างทุกครั้งที่ fallback
    expect(gpu.dispose).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith('LOBBY_SCENE_WEBGPU_INIT_FAIL', 'silent', boom)
  })

  test('import three/webgpu พัง → ตกไป WebGL2 ไม่ throw ออกไปข้างนอก', async () => {
    const failed = new Error('chunk load failed')
    const { deps: d } = deps({ importWebGPU: () => Promise.reject(failed) as never })

    await expect(createLobbyRenderer(CANVAS, vi.fn(), d)).resolves.toEqual({
      kind: 'webgl2',
      props: expect.anything(),
    })
    expect(reportError).toHaveBeenCalledWith('LOBBY_SCENE_WEBGPU_INIT_FAIL', 'silent', failed)
  })

  /*
    ทางที่ Playwright แตะไม่ถึง และเป็นทางที่ผู้เล่นเจอจริง

    driver บางตัวประกาศรองรับ WebGPU แล้ว requestAdapter() ค้างตลอดกาล ไม่ resolve ไม่ reject
    ถ้าไม่มี timeout หน้าเกมจะค้างที่ loading ตลอดไป ไม่มี error ให้เห็น ไม่มี fallback
  */
  test('init() ค้างไม่ resolve → timeout แล้วตกไป WebGL2', async () => {
    vi.useFakeTimers()
    const gpu = fakeWebGPU(() => new Promise(() => {}))
    const { deps: d } = deps({
      importWebGPU: () => Promise.resolve({ WebGPURenderer: gpu.WebGPURenderer }) as never,
    })

    const pending = createLobbyRenderer(CANVAS, vi.fn(), d)
    await vi.advanceTimersByTimeAsync(WEBGPU_INIT_TIMEOUT_MS)

    await expect(pending).resolves.toEqual({ kind: 'webgl2', props: expect.anything() })
    expect(gpu.dispose).toHaveBeenCalledTimes(1)
    expect(reportError).toHaveBeenCalledWith(
      'LOBBY_SCENE_WEBGPU_INIT_FAIL',
      'silent',
      expect.objectContaining({ message: 'WebGPU renderer.init() timed out' }),
    )
  })

  test('init() ช้าแต่ทันก่อน timeout → ยังได้ WebGPU และ timer ถูกเคลียร์', async () => {
    vi.useFakeTimers()
    const gpu = fakeWebGPU(
      () => new Promise((resolve) => setTimeout(resolve, WEBGPU_INIT_TIMEOUT_MS - 1)),
    )
    const { deps: d, webgl } = deps({
      importWebGPU: () => Promise.resolve({ WebGPURenderer: gpu.WebGPURenderer }) as never,
    })

    const pending = createLobbyRenderer(CANVAS, vi.fn(), d)
    await vi.advanceTimersByTimeAsync(WEBGPU_INIT_TIMEOUT_MS - 1)

    await expect(pending).resolves.not.toEqual({ kind: 'webgl2', props: expect.anything() })
    expect(webgl).not.toHaveBeenCalled()
    // timer ต้องถูกเคลียร์ใน finally — ไม่งั้นมี timer ค้างยิง reject ใส่ promise ที่ settle
    // ไปแล้ว (unhandled rejection) ทุกครั้งที่ init สำเร็จ
    expect(vi.getTimerCount()).toBe(0)
  })
})

import { WebGLRenderer } from 'three'

import { reportError } from '../../lib/errors/reportError'

/**
 * เลือก renderer ให้ฉาก Lobby: WebGPU ก่อน ตกไป WebGL2 เมื่อทำไม่ได้
 *
 * เดิมโค้ดก้อนนี้เป็น closure อยู่ใน prop `gl={...}` ของ <Canvas> ใน LobbyScene.tsx
 * แยกออกมาเป็นฟังก์ชันเพราะ **มันทดสอบจากเบราว์เซอร์จริงไม่ได้** (audit item B27, 2026-08-16)
 *
 * audit เสนอ Playwright แต่ทางที่ fallback นี้พังจริงมีสามทาง และเบราว์เซอร์กระตุ้นได้ทางเดียว:
 *
 *   1. ไม่มี navigator.gpu           → headless Chromium ใน CI เป็นแบบนี้อยู่แล้ว ยิงได้
 *   2. init() reject (driver ไม่ไหว) → สั่งให้ GPU จริงปฏิเสธตามต้องการไม่ได้
 *   3. init() ค้างไม่ resolve/reject → ทางที่ทำให้ผู้เล่นเจอ "เกมค้างยาวหลังล็อกอิน" จริง
 *                                       และเป็นเหตุผลที่ timeout 4 วินาทีมีอยู่ — จำลองบน
 *                                       เบราว์เซอร์จริงไม่ได้เลย
 *
 * ทางที่ 3 คือทางที่มีค่าที่สุดและ Playwright แตะไม่ถึง จึงฉีด dependency เข้ามาแทน แล้วให้
 * เทสต์ป้อน renderer ปลอมที่ค้าง/พังตามสั่ง — ครอบทั้งสามทาง ไม่ต้องเพิ่ม dependency ใด ๆ
 */

/**
 * renderer.init() เรียก navigator.gpu.requestAdapter() ใต้ฝาครอบ — เจอจริงว่า driver/GPU
 * บางตัวประกาศรองรับ WebGPU (navigator.gpu มีอยู่) แต่การเจรจา adapter ค้างตลอดกาล ไม่
 * resolve ไม่ reject เลย (ผู้เล่นรายงานว่าเกม "ค้างยาว" หลังล็อกอิน — เกิดตรงนี้ ไม่ใช่ตอน
 * login จริง) กันด้วย timeout แล้วตกไป WebGL2 แทนที่จะรอเฉย ๆ ไม่มีกำหนด
 */
export const WEBGPU_INIT_TIMEOUT_MS = 4000

type WebGPURendererModule = Awaited<typeof import('three/webgpu')>
type WebGPURendererInstance = InstanceType<WebGPURendererModule['WebGPURenderer']>

/** จุดที่เทสต์เข้าไปแทนได้ — ของจริงทั้งสามตัวแตะ GPU/เครือข่ายซึ่ง jsdom ไม่มี */
export interface LobbyRendererDeps {
  hasWebGPU: () => boolean
  importWebGPU: () => Promise<WebGPURendererModule>
  createWebGL: (props: Record<string, unknown>) => WebGLRenderer
}

const defaultDeps: LobbyRendererDeps = {
  hasWebGPU: () => typeof navigator !== 'undefined' && 'gpu' in navigator,
  importWebGPU: () => import('three/webgpu'),
  createWebGL: (props) => new WebGLRenderer(props),
}

export async function createLobbyRenderer(
  defaultProps: { canvas: unknown } & Record<string, unknown>,
  onDeviceLost: (info: unknown) => void,
  deps: LobbyRendererDeps = defaultDeps,
): Promise<WebGLRenderer | WebGPURendererInstance> {
  // canvas ในเกมนี้เป็น HTMLCanvasElement จริงเสมอ (ไม่มี worker-based OffscreenCanvas
  // rendering) — cast ตรงนี้จุดเดียวเพื่อเลี่ยง type ของ R3F เอง (OffscreenCanvas แบบย่อ)
  // ชนกับ type ของ three/webgpu (OffscreenCanvas เต็มจาก DOM lib) ซึ่งเข้มกว่า
  const canvas = defaultProps.canvas as HTMLCanvasElement
  const rendererProps = {
    ...defaultProps,
    canvas,
    antialias: true,
    powerPreference: 'high-performance' as const,
  }

  if (deps.hasWebGPU()) {
    let renderer: WebGPURendererInstance | undefined
    try {
      const { WebGPURenderer } = await deps.importWebGPU()
      renderer = new WebGPURenderer(rendererProps)

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          renderer.init(),
          new Promise((_resolve, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error('WebGPU renderer.init() timed out')),
              WEBGPU_INIT_TIMEOUT_MS,
            )
          }),
        ])
      } finally {
        clearTimeout(timeoutId)
      }

      // WebGPU ไม่ยิง DOM event 'webglcontextlost' (นั่นเป็นกลไกเฉพาะ WebGL) — ต้องผูก
      // onDeviceLost ของตัว renderer เองแทน ไม่งั้นการ์ดจอหลุดแล้วเงียบ ไม่มี fallback UI
      // ให้เห็นเลย (ต่างจากฝั่ง WebGL2 ที่ LobbyScene ยังใช้ DOM event เดิม)
      renderer.onDeviceLost = onDeviceLost
      return renderer
    } catch (error) {
      reportError('LOBBY_SCENE_WEBGPU_INIT_FAIL', 'silent', error)
      // init() ล้มเหลวหลังจาก renderer จอง GPU adapter/device ไปแล้วบางส่วน — dispose ทิ้ง
      // ก่อนตกไปสร้าง WebGLRenderer ตัวใหม่ กัน GPU resource ค้าง
      renderer?.dispose()
    }
  }

  return deps.createWebGL(rendererProps)
}

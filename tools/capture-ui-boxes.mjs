import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const ARTIFACTS_DIR = 'C:\\Users\\zxc59\\.gemini\\antigravity\\brain\\cf6f19f1-9bd4-4170-b55f-aeaeb5dfeb7b'
const CDP_PORT = 9222

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const edgeProc = spawn(
    EDGE_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${CDP_PORT}`,
      '--window-size=1920,1080',
      '--no-first-run',
      '--no-default-browser-check',
      'http://localhost:5173/?preview=lobby',
    ],
    { stdio: 'ignore' },
  )

  try {
    let wsUrl = null
    for (let i = 0; i < 20; i++) {
      await sleep(500)
      try {
        const res = await fetch(`http://localhost:${CDP_PORT}/json/version`)
        const data = await res.json()
        wsUrl = data.webSocketDebuggerUrl
        if (wsUrl) break
      } catch {}
    }

    const ws = new WebSocket(wsUrl)
    let msgId = 1
    const pending = new Map()

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) reject(msg.error)
        else resolve(msg.result)
      }
    })

    await new Promise((res) => {
      ws.addEventListener('open', res, { once: true })
    })

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    }

    const targets = await send('Target.getTargets')
    const pageTarget = targets.targetInfos.find((t) => t.type === 'page')
    const { sessionId } = await send('Target.attachToTarget', {
      targetId: pageTarget.targetId,
      flatten: true,
    })

    function sendPage(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params, sessionId }))
      })
    }

    await sendPage('Page.enable')
    await sendPage('Runtime.enable')

    async function evaluate(expression) {
      const res = await sendPage('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })
      return res.result?.value
    }

    async function captureScreenshot(filename) {
      const { data } = await sendPage('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(ARTIFACTS_DIR, filename)
      writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log('Saved screenshot:', filename)
    }

    await sleep(3500)

    // ── 1. World Chat Panel ──
    console.log('Opening World Chat Panel...')
    await evaluate(`(() => {
      const chatBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('แชท') || b.getAttribute('aria-label') === 'เปิดแชทโลก');
      if (chatBtn) chatBtn.click();
    })()`)
    await sleep(1500)
    await captureScreenshot('screenshot_ui_world_chat_panel.png')

    // Close World Chat
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="ยุบแชท"], button[aria-label="ปิดแชท"]');
      if (closeBtn) closeBtn.click();
    })()`)
    await sleep(800)

    // ── 2. Enter Battle Scene ──
    console.log('Opening Stage Select & Entering Combat...')
    await evaluate(`(() => {
      const battleBtn = document.querySelector('button[data-menu-id="battle"]');
      if (battleBtn) battleBtn.click();
    })()`)
    await sleep(1500)

    // Click Stage 1-1
    await evaluate(`(() => {
      const stageBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('1-1') || b.textContent.includes('ลานฝึก'));
      if (stageBtn) stageBtn.click();
    })()`)
    await sleep(3500)
    await captureScreenshot('screenshot_ui_realtime_battle.png')

    console.log('Finished capturing chat and battle room!')
    ws.close()
  } finally {
    edgeProc.kill()
  }
}

main().catch(console.error)

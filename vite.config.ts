import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * base ของ GitHub Pages คือ "/<ชื่อ repo>/" เสมอ — จึงต้องอ่านชื่อ repo ที่ deploy จริง
 * ไม่ใช่เขียนตายตัว
 *
 * ของเดิมเขียน '/LegendOfSoulTH/' ไว้ตรง ๆ ซึ่งถูกเฉพาะกับ repo ต้นทาง พอ fork ไปชื่ออื่น
 * (เช่น `nustanakritwithai/GameTurnBase` → เสิร์ฟที่ `/GameTurnBase/`) asset ทุกตัวจะยิงไป
 * `/LegendOfSoulTH/assets/...` แล้ว 404 ทั้งหมด ผลคือ **หน้าขาวสนิท** ไม่มี error ให้เห็น
 * เพราะ `<div id="root">` ว่างเปล่าโดยที่ HTML เองตอบ 200 ปกติ
 *
 * `GITHUB_REPOSITORY` เป็น "owner/repo" ที่ GitHub Actions ใส่ให้ทุก workflow อยู่แล้ว
 * จึงได้ base ที่ถูกทั้ง repo ต้นทาง fork ปัจจุบัน และ fork ใด ๆ ในอนาคต โดยไม่ต้องแก้ไฟล์นี้อีก
 *
 * `BASE_PATH` เปิดช่องให้เขียนทับด้วยมือสำหรับ deploy target อื่น (custom domain ที่เสิร์ฟจาก
 * root ให้ตั้งเป็น '/')
 *
 * ค่าสำรอง '/LegendOfSoulTH/' ใช้เมื่อ build นอก CI ที่ไม่มีตัวแปรพวกนี้ — คงพฤติกรรมเดิมไว้
 * ไม่ให้ `npm run build` บนเครื่องของใครเปลี่ยนผลลัพธ์ไปจากที่เคยเป็น
 */
export function resolveBasePath(
  env: { GITHUB_REPOSITORY?: string; BASE_PATH?: string } = process.env,
): string {
  if (env.BASE_PATH) return env.BASE_PATH
  const repoName = env.GITHUB_REPOSITORY?.split('/')[1]
  return repoName ? `/${repoName}/` : '/LegendOfSoulTH/'
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // base ใช้เฉพาะตอน build จริงสำหรับ GitHub Pages เท่านั้น
  // ถ้าใช้ตอน dev ด้วย ทุก asset ที่ path ตรง ๆ ใน public/ (ไอคอน, ภาพตัวละคร, .glb)
  // จะ 404 หมด เพราะ dev server จะย้ายไปเสิร์ฟใต้ subpath แทนที่จะเป็น /
  base: command === 'build' ? resolveBasePath() : '/',
  plugins: [react()],
  build: {
    /*
      ประกาศ floor ของเบราว์เซอร์ให้ชัดตรงนี้ ไม่ปล่อยให้เป็นค่าปริยาย

      ฟิลด์ `browserslist` ใน package.json **ไม่มีอะไรในบิลด์นี้อ่าน** — ไม่มี plugin-legacy
      ไม่มี autoprefixer ไม่มี postcss ไม่มี babel มันเป็นเอกสารบอกเจตนาเท่านั้น
      ที่ผ่านมามีโค้ดสามไฟล์อ้างมันเป็น "หลักประกัน" ทั้งที่ไม่ใช่ (แก้แล้ว 2026-08-07
      ดู .agents/rules/ecc/web/compatibility.md) การเขียน target ตรงนี้คือจุดเดียวที่บังคับได้จริง

      ค่านี้คือ 'baseline-widely-available' ที่ Vite ใช้เป็นค่าปริยายอยู่แล้ว กางออกมาเขียนตรง ๆ
      เพื่อให้เห็นด้วยตาว่า floor คืออะไร และการเปลี่ยนมันกลายเป็นการแก้โค้ดที่มีคนเห็นใน diff
      ไม่ใช่ผลข้างเคียงเงียบ ๆ จากการอัป Vite (ยืนยันกับเอกสาร Vite 2026-08-07)

      ตัวเกมต้องการ WebGL2 เป็นอย่างน้อยอยู่แล้ว ซึ่งสูงกว่า floor นี้มาก การรองรับต่ำกว่านี้
      จึงไม่มีความหมายกับเกม — ถ้าจะขยับ ให้ขยับขึ้น ไม่ใช่ลง
    */
    target: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],

    // ฉาก 3D (three.js) ถูกแยกเป็น chunk แยกและโหลดแบบ lazy อยู่แล้ว จึงยกเพดาน
    // *advisory* ของ Vite เองขึ้น (คิดจาก raw byte เพดานตายตัว 500KB ไม่แยก vendor
    // ที่ justified ออกจากโค้ดแอป) ไม่ให้รบกวนทุกครั้งที่ build — เพดานที่ "บังคับจริง"
    // (gzip, แยกเพดาน vendor/app) อยู่ที่ tools/check-bundle-size.mjs ต่อท้าย "npm run ci"
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        /*
          แยก react/react-dom ออกเป็น chunk ของตัวเอง — โค้ดแอปเปลี่ยนแทบทุก deploy
          แต่ react เปลี่ยนนาน ๆ ครั้ง ถ้ารวมกันไว้ ทุก deploy จะทำให้ hash ของ chunk
          เดียวที่มี react เปลี่ยนไปด้วย ผู้เล่นกลับมาเล่นต้องโหลด react ใหม่ทุกครั้งทั้งที่
          ไม่ได้เปลี่ยน แยกออกมาแล้ว browser cache ยังใช้ chunk นี้ต่อได้ข้าม deploy ที่ไม่ได้
          แตะ react (three.js ไม่ต้องแยกเพิ่ม — ถูก lazy() แยก chunk เป็นของตัวเองอยู่แล้ว
          ที่ LobbyScene/BattleScene โหลดเฉพาะตอนเข้าฉากนั้นจริง ๆ)
        */
        manualChunks: (id: string) =>
          id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')
            ? 'vendor-react'
            : undefined,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    /*
      สามไฟล์นี้เป็นเทสต์ของโหมดสำรวจที่ถูกคอมเมนต์ปิดไว้ทั้งกอง (2026-08-07)

      ตัวไฟล์ยังอยู่แต่ข้างในเป็นคอมเมนต์ล้วน vitest จะฟ้อง "No test suite found"
      ถ้าปล่อยให้เก็บมารัน — เอาออกจากรายการเมื่อไหร่ที่เปิดโหมดสำรวจกลับ
    */
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // agent worktree เต็มโปรเจกต์อีกชุด (git worktree ของ session อื่นที่รันขนานกันอยู่) —
      // ไม่มีอันนี้ vitest จะไล่เจอไฟล์ .test.ts ที่ชื่อซ้ำกับด้านล่างในนั้นด้วย (เช่น
      // conditions.test.ts ของ worktree อื่น) แล้วฟ้อง "No test suite found" ปนกับผลจริง
      '.claude/worktrees/**',
      'src/game/dialogue/conditions.test.ts',
      'src/game/dialogue/engine.test.ts',
      'src/hooks/useExploration.test.ts',
    ],
    coverage: {
      /*
        รายงานเฉย ๆ ยังไม่ตั้งเพดานบังคับ

        ตอนนี้ component ทั้งหมด (~57 ไฟล์ .tsx) ยังไม่มีเทสต์สักตัว ตั้ง threshold ตอนนี้
        จะได้เลขที่ต่ำจนต้องตั้งให้หลวมเพื่อให้ผ่าน ซึ่งกลายเป็นเพดานที่ไม่ได้กันอะไรเลย
        เอาไว้ก่อนให้ "เห็นว่าคลุมอะไรอยู่บ้าง" — ตั้งเพดานเมื่อมีเทสต์ component จริงแล้ว
        (ดู .agents/rules/gold-standard-baseline.md ข้อ 6)
      */
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        'src/test/**',
        // ทะเบียนข้อมูลล้วน ไม่มีตรรกะให้คลุม นับรวมแล้วทำให้ตัวเลขหลอกตา
        'src/game/{characters,items,frames,collection,gameInfo,backgroundAssets,sceneDimensions}.ts',
        'src/game/{spriteSequences,battleSpriteSequences,walkKits}.ts',
        'src/lib/errors/codes.ts',
      ],
    },
  },
}))

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
        เพดานตั้งที่ "พื้นที่วัดได้ล่าสุด" ไม่ใช่เป้าหมายที่อยากได้ — PR ที่ทำให้ coverage ตก
        ต้องเพิ่มเทสต์ หรือลดตัวเลขนี้อย่างตั้งใจใน commit เดียวกัน (ดู
        .agents/rules/mutation-verified-fix-law.md ส่วน "The coverage floor is a number
        in the config")

        วัดสามรอบเมื่อ 2026-08-16: statements 71.52–71.56 · branches 60.05–60.17 ·
        functions 72.83 · lines 74.34–74.39

        **เพดานตั้งต่ำกว่าพื้นที่วัดได้ ~1.5 จุด โดยตั้งใจ ไม่ใช่ปัดลงเฉย ๆ** — ชุดเทสต์นี้ยัง
        ไม่ deterministic ใต้โหลด (รอบหนึ่งของ `npm run ci` วันเดียวกันได้ "3 failed |
        132 passed, 17 skipped" แล้วรอบถัดมาเขียวครบ) ซึ่งเป็นข้อค้าง B14 ของ audit
        2026-08-16 เพดานที่ชิดพื้น (branches เหลือช่องแค่ 0.05) จะทำให้ CI แดงเพราะความ
        แกว่ง ไม่ใช่เพราะ coverage ตกจริง — **เกตที่ส่งสัญญาณผิดแย่กว่าไม่มีเกต**

        ช่องว่างนี้ยังกันสิ่งที่ควรกันได้: ลบเทสต์ทิ้ง หรือเพิ่มโค้ดก้อนใหญ่ที่ไม่มีเทสต์ ตกเกิน
        1.5 จุดทันที **รัดให้แน่นขึ้นเมื่อ B14 แก้แล้ว**

        หมายเหตุแก้ 2026-08-16: คอมเมนต์เดิมตรงนี้เขียนว่า "component ทั้งหมด (~57 ไฟล์ .tsx)
        ยังไม่มีเทสต์สักตัว" ซึ่งเป็นเหตุผลที่ยังไม่ตั้งเพดาน — วันนี้มีเทสต์ component 34 ไฟล์
        จาก 66 และมี 1,185 เทสต์ทั้งโปรเจกต์ เหตุผลเดิมหมดอายุไปแล้ว
      */
      thresholds: {
        statements: 70,
        branches: 58,
        functions: 71,
        lines: 73,
      },
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

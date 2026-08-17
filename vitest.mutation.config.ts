import { defineConfig, mergeConfig, type UserConfig } from 'vite'

import baseConfig from './vite.config'

/*
  ชุดเทสต์สำหรับ mutation testing เท่านั้น (audit item B22, 2026-08-16)

  Stryker กลายพันธุ์เฉพาะ src/game/reward กับ src/game/gacha แล้วรันเทสต์ "ทั้งชุด" ซ้ำ
  หนึ่งรอบต่อ 1 mutant — 1128 mutants × ชุดเต็ม 1198 เทสต์ คือรันไม่จบ (dry run รอบแรก
  ก็ชน timeout 5 นาทีของ Stryker ไปแล้ว) ไฟล์นี้จึงตัดให้เหลือเฉพาะเทสต์ที่แตะโค้ดสองโฟลเดอร์
  นั้นจริง: 11 ไฟล์ 106 เทสต์ 9.5 วินาที

  รายการ include ด้านล่าง **ไม่ได้เดา** — มาจาก grep หา import ของ game/reward กับ
  game/gacha ในไฟล์ .test.ts/.tsx ทุกไฟล์ใน src/ บวก glob ของ src/game/reward ทั้งโฟลเดอร์
  (dropIdentity.test.ts กับ stageRewardConfig.test.ts import แบบ relative จึงไม่ติด grep)

  ⚠️ ถ้าเพิ่มเทสต์ที่แตะ reward/gacha ในที่ใหม่ ต้องเติมที่นี่เอง — ไม่มีเกตไหนจับให้
  เทสต์ที่หายไปจากรายการนี้ไม่ได้ทำให้ Stryker แดง มันทำให้ mutant "รอด" แล้วคะแนนต่ำลง
  โดยที่ความจริงคือมีเทสต์ฆ่ามันอยู่ — ผิดในทางที่ปลอดภัย ไม่ใช่ทางที่หลอกว่าดีเกินจริง
*/
// vite.config.ts export เป็น callback (มันอ่าน `command` เพื่อตัดสิน base ของ GitHub Pages)
// mergeConfig รับ callback ไม่ได้ จึงต้องเรียกให้เป็น object ก่อนแล้วค่อย merge
export default defineConfig(async (env) =>
  mergeConfig(
    (await (baseConfig as (e: typeof env) => UserConfig | Promise<UserConfig>)(env)) as UserConfig,
    {
      test: {
        include: [
          'src/game/reward/**/*.test.ts',
          'src/game/gacha/**/*.test.ts',
          'src/game/featureFlags.test.ts',
          'src/game/progression/progressionService.test.ts',
          'src/game/realtimeBattle/BattleResultAdapter.test.ts',
          'src/components/DungeonSession/**/*.test.tsx',
          'src/components/LobbyBattleSession/**/*.test.tsx',
        ],
        coverage: { enabled: false },
      },
    },
  ),
)

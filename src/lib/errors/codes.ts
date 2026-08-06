/**
 * ทะเบียน error code ทั้งเกม — object literal ธรรมดา ไม่ใช่ TS enum โดยตั้งใจ
 * (tsconfig.app.json เปิด erasableSyntaxOnly ซึ่งห้าม enum จริง ๆ — ใช้แล้ว build พัง)
 *
 * เพิ่ม error ใหม่ = เพิ่ม entry ที่นี่บรรทัดเดียว แล้วเรียก reportError(code, ...)
 * จากจุดที่เกิด error จริง — ห้ามเรียก console.error/warn/debug ตรง ๆ อีก (บังคับด้วย
 * oxlint no-console, ดู .oxlintrc.json — ยกเว้นเฉพาะไฟล์ในโฟลเดอร์นี้)
 */
export const ERROR_CODES = {
  // ตาข่ายจับ error ระดับบนสุด (VISIBLE — ดู reportError.ts's tier)
  BOUNDARY_RENDER_CRASH: 'เกิดข้อผิดพลาดขณะแสดงผล',
  GLOBAL_UNCAUGHT: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
  GLOBAL_REJECTION: 'มี promise ที่ไม่ถูกจัดการ',

  // ระบบเสียง (src/lib/audio/AudioEngine.ts, src/pages/TitlePage.tsx) — ทุกจุดตั้งใจ SILENT
  // เพราะไม่มีเสียงไม่ทำให้เกมเล่นไม่ได้
  AUDIO_CONTEXT_INIT_FAIL: 'เปิดระบบเสียงไม่สำเร็จ',
  AUDIO_BUFFER_LOAD_FAIL: 'โหลดไฟล์เสียงไม่สำเร็จ',
  AUDIO_SETTINGS_SAVE_FAIL: 'บันทึกค่าเสียงไม่สำเร็จ',
  AUDIO_PORTAL_SOUND_FAIL: 'เล่นเสียงพอร์ทัลไม่สำเร็จ',

  // localStorage (src/lib/storage.ts) — SILENT ทั้งหมด เป็นไปตามเจตนาเดิมของไฟล์
  // ("ทุกกรณีต้องไม่ทำให้เกมล่ม") ไม่ใช่ error ที่ควรขึ้นกล่องแดงให้ผู้เล่นตกใจ
  STORAGE_READ_FAIL: 'อ่านข้อมูลที่บันทึกไว้ไม่สำเร็จ',
  STORAGE_WRITE_FAIL: 'บันทึกข้อมูลไม่สำเร็จ',
  STORAGE_REMOVE_FAIL: 'ลบข้อมูลที่บันทึกไว้ไม่สำเร็จ',

  // นำเข้าไฟล์ save — SILENT เพราะผู้เล่นเห็นข้อความบอกสาเหตุอยู่แล้วจาก AuthModal
  // มีรหัสไว้เพื่อให้ผู้เล่นอ้างอิงได้เวลาแจ้งปัญหา: เกมนี้ไม่ส่ง telemetry ไปไหน
  // (ตัดสินใจไว้แล้ว ดู .agents/rules/ecc/web/observability.md) รหัสจึงทำหน้าที่แทน stack trace
  SAVE_IMPORT_PARSE_FAIL: 'ไฟล์ save ที่เลือกไม่ใช่ JSON ที่อ่านได้',

  // เข้าสู่ระบบ/โปรไฟล์ — SILENT เพราะไม่ critical (last-email เป็นแค่ความสะดวก,
  // clipboard fail ผู้เล่นเห็น toast อยู่แล้วจากอีกทาง)
  AUTH_UI_READ_FAIL: 'อ่านอีเมลล่าสุดไม่สำเร็จ',
  AUTH_UI_SAVE_FAIL: 'บันทึกอีเมลล่าสุดไม่สำเร็จ',
  PROFILE_CLIPBOARD_FAIL: 'คัดลอกไม่สำเร็จ',

  // ฉาก 3D ลอบบี้ (src/components/LobbyScene/LobbyScene.tsx)
  LOBBY_SCENE_DEVICE_LOST: 'การ์ดจอขาดการเชื่อมต่อ (WebGPU)', // VISIBLE
  LOBBY_SCENE_WEBGL_CONTEXT_LOST: 'การ์ดจอขาดการเชื่อมต่อ (WebGL)', // VISIBLE
  LOBBY_SCENE_WEBGPU_INIT_FAIL: 'เปิด WebGPU ไม่สำเร็จ ใช้ WebGL2 แทน', // SILENT — fallback ทำงานถูกต้องอยู่แล้ว

  // ห้องต่อสู้เรียลไทม์ (src/game/realtimeBattle/**, src/hooks/useRealtimeBattle.ts,
  // src/components/BattleScene/RealtimeBattleRoom.tsx)
  BATTLE_STAGE_NOT_FOUND: 'ไม่พบด่านต่อสู้', // VISIBLE — เข้าห้องต่อสู้ไม่ได้เลย
  BATTLE_NO_TEAM_CHARACTER: 'ทีมของคุณไม่มีตัวละคร', // VISIBLE — เข้าห้องต่อสู้ไม่ได้เลย
  BATTLE_ENEMY_TEMPLATE_MISSING: 'ไม่พบแม่แบบศัตรู', // SILENT — ข้ามศัตรูตัวนั้นไป ต่อสู้ต่อได้
  BATTLE_STAGE_NO_SPAWN: 'ด่านไม่มีจุดเกิดศัตรู', // SILENT — ข้ามศัตรูตัวนั้นไป ต่อสู้ต่อได้
  BATTLE_ASSET_LOAD_FAIL: 'โหลดภาพตัวละครไม่สำเร็จ', // VISIBLE — โยน error ต่อจริง กระทบผู้เล่นเห็นชัด
  BATTLE_DEFERRED_ASSET_FAIL: 'โหลดเฟรมส่วนที่เหลือไม่ครบ', // SILENT — preload พื้นหลัง ไม่บล็อกการเล่น
  BATTLE_WEBGL_CONTEXT_LOST: 'การ์ดจอขาดการเชื่อมต่อระหว่างต่อสู้', // VISIBLE
} as const

export type ErrorCode = keyof typeof ERROR_CODES

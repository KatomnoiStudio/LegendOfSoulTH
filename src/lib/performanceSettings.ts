import { readJson, writeJson } from './storage'
import type { QualityOverride } from '../hooks/usePerformanceQuality'

/**
 * ค่าตั้งค่าคุณภาพเรนเดอร์ — เก็บ/อ่านผ่าน localStorage แบบเดียวกับ a11ySettings
 * (ดู src/lib/a11ySettings.ts) แยกไฟล์ต่างหากเพราะไม่เกี่ยวกับการเข้าถึงเลย
 *
 * ไม่มี apply*() แบบ a11ySettings เพราะไม่มี CSS ที่ต้องอ่านค่านี้ — ผู้บริโภคเดียว
 * คือ LobbyScene ผ่าน usePerformanceQuality เท่านั้น
 */
export interface PerformanceSettings {
  /** 'auto' = วัด FPS จริงระหว่างเล่นแล้วปรับเอง — เลือกระดับเอง = ล็อกค่านั้นตายตัว */
  qualityOverride: QualityOverride
}

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  qualityOverride: 'auto',
}

const SETTINGS_KEY = 'los:performance:v1'

export function getPerformanceSettings(): PerformanceSettings {
  return readJson<PerformanceSettings>(SETTINGS_KEY) ?? DEFAULT_PERFORMANCE_SETTINGS
}

export function setPerformanceSettings(next: PerformanceSettings): void {
  writeJson(SETTINGS_KEY, next)
}

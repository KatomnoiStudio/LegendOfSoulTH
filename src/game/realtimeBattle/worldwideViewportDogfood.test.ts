import { describe, expect, it } from 'vitest'
import {
  resolveCombatScreenLayout,
  type CombatViewport,
  type CombatSafeAreaInsets,
  COMBAT_BUTTON_SIZES,
  MIN_BUTTON_GAP_PX,
} from './combatUILayout'
import { isPortraitViewport } from '../../lib/battle/battleViewport'

interface WorldwideDeviceProfile {
  name: string
  aspectRatioLabel: string
  orientation: 'landscape' | 'portrait'
  viewport: CombatViewport
  safeArea: CombatSafeAreaInsets
}

/**
 * Global Test Matrix representing real-world devices across all standard aspect ratios
 */
const WORLDWIDE_DEVICE_PROFILES: WorldwideDeviceProfile[] = [
  // ─── Landscape Orientations (Primary Focus) ───
  {
    name: 'Galaxy S24 / Modern Android (20:9)',
    aspectRatioLabel: '20:9',
    orientation: 'landscape',
    viewport: { width: 915, height: 412 },
    safeArea: { top: 0, right: 24, bottom: 12, left: 24 },
  },
  {
    name: 'Sony Xperia / Tall Mobile (21:9 Mobile)',
    aspectRatioLabel: '21:9',
    orientation: 'landscape',
    viewport: { width: 960, height: 411 },
    safeArea: { top: 0, right: 28, bottom: 12, left: 28 },
  },
  {
    name: 'iPhone 14 / 15 Pro Max (19.5:9)',
    aspectRatioLabel: '19.5:9',
    orientation: 'landscape',
    viewport: { width: 932, height: 430 },
    safeArea: { top: 0, right: 48, bottom: 21, left: 48 },
  },
  {
    name: 'iPhone 12 / 13 (19.5:9 Standard)',
    aspectRatioLabel: '19.5:9',
    orientation: 'landscape',
    viewport: { width: 844, height: 390 },
    safeArea: { top: 0, right: 44, bottom: 21, left: 44 },
  },
  {
    name: 'Android 18:9 (2:1 Standard)',
    aspectRatioLabel: '18:9',
    orientation: 'landscape',
    viewport: { width: 720, height: 360 },
    safeArea: { top: 0, right: 16, bottom: 8, left: 16 },
  },
  {
    name: 'iPhone 8 / SE (16:9 Standard Mobile)',
    aspectRatioLabel: '16:9',
    orientation: 'landscape',
    viewport: { width: 667, height: 375 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'iPhone 5 / SE1 (16:9 Compact Legacy)',
    aspectRatioLabel: '16:9 Compact',
    orientation: 'landscape',
    viewport: { width: 568, height: 320 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'MacBook / Laptop (16:10)',
    aspectRatioLabel: '16:10',
    orientation: 'landscape',
    viewport: { width: 1440, height: 900 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'Surface Pro / Tablet (3:2)',
    aspectRatioLabel: '3:2',
    orientation: 'landscape',
    viewport: { width: 1080, height: 720 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'iPad Pro 11" / 12.9" (4:3 Tablet)',
    aspectRatioLabel: '4:3',
    orientation: 'landscape',
    viewport: { width: 1024, height: 768 },
    safeArea: { top: 0, right: 0, bottom: 15, left: 0 },
  },
  {
    name: 'Galaxy Z Fold 5 Unfolded (6:5 Foldable)',
    aspectRatioLabel: '6:5',
    orientation: 'landscape',
    viewport: { width: 884, height: 736 },
    safeArea: { top: 0, right: 0, bottom: 16, left: 0 },
  },
  {
    name: 'Desktop Ultrawide Monitor (21:9)',
    aspectRatioLabel: '21:9 Desktop',
    orientation: 'landscape',
    viewport: { width: 2560, height: 1080 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'Desktop Super Ultrawide Monitor (32:9)',
    aspectRatioLabel: '32:9 Desktop',
    orientation: 'landscape',
    viewport: { width: 3840, height: 1080 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
  },

  // ─── Portrait Orientations (Vertical Screens) ───
  {
    name: 'iPhone Portrait (9:19.5)',
    aspectRatioLabel: '9:19.5',
    orientation: 'portrait',
    viewport: { width: 390, height: 844 },
    safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
  },
  {
    name: 'Android Portrait (9:20)',
    aspectRatioLabel: '9:20',
    orientation: 'portrait',
    viewport: { width: 412, height: 915 },
    safeArea: { top: 32, right: 0, bottom: 16, left: 0 },
  },
  {
    name: 'Standard Mobile Portrait (9:16)',
    aspectRatioLabel: '9:16',
    orientation: 'portrait',
    viewport: { width: 375, height: 667 },
    safeArea: { top: 20, right: 0, bottom: 0, left: 0 },
  },
  {
    name: 'iPad Portrait (3:4)',
    aspectRatioLabel: '3:4',
    orientation: 'portrait',
    viewport: { width: 768, height: 1024 },
    safeArea: { top: 24, right: 0, bottom: 20, left: 0 },
  },
]

describe('Worldwide Screen Aspect Ratio & Responsive Layout Dogfood (DF22)', () => {
  const landscapeProfiles = WORLDWIDE_DEVICE_PROFILES.filter((p) => p.orientation === 'landscape')
  const portraitProfiles = WORLDWIDE_DEVICE_PROFILES.filter((p) => p.orientation === 'portrait')

  describe('1. Pin (X + Y) Bounds and Safe-Area Clamping across all Landscape Aspect Ratios', () => {
    it.each(landscapeProfiles)(
      'keeps all buttons strictly within visible viewport and safe-area for $name ($aspectRatioLabel)',
      ({ viewport, safeArea }) => {
        const screen = resolveCombatScreenLayout(viewport, safeArea)
        const buttonList = Object.values(screen.buttons)

        // Verify all 5 combat cluster buttons (ATK, S1, S2, S3, ULT)
        for (const button of buttonList) {
          const radius = button.size / 2
          // Right and bottom bounds
          expect(button.x + radius).toBeLessThanOrEqual(viewport.width - safeArea.right + 0.01)
          expect(button.y + radius).toBeLessThanOrEqual(viewport.height - safeArea.bottom + 0.01)
          // Left and top bounds
          expect(button.x - radius).toBeGreaterThanOrEqual(safeArea.left - 0.01)
          expect(button.y - radius).toBeGreaterThanOrEqual(safeArea.top - 0.01)
        }

        // Verify Virtual Joystick Anchor Pin (Bottom-Left)
        const joystickRadius = screen.joystick.size / 2
        expect(screen.joystick.x - joystickRadius).toBeGreaterThanOrEqual(safeArea.left - 0.01)
        expect(screen.joystick.x + joystickRadius).toBeLessThanOrEqual(
          viewport.width - safeArea.right + 0.01,
        )
        expect(screen.joystick.y + joystickRadius).toBeLessThanOrEqual(
          viewport.height - safeArea.bottom + 0.01,
        )
      },
    )
  })

  describe('2. Minimum Touch Target (>= 48px) and No Control Overlaps across all Aspect Ratios', () => {
    it.each(landscapeProfiles)(
      'guarantees >= 48px touch targets and positive button gaps for $name',
      ({ viewport, safeArea }) => {
        const screen = resolveCombatScreenLayout(viewport, safeArea)
        const buttonList = Object.values(screen.buttons)

        // All buttons meet min touch target rule
        for (const button of buttonList) {
          expect(button.size).toBeGreaterThanOrEqual(COMBAT_BUTTON_SIZES.minTouchTarget)
        }

        // No pairwise overlap between any combat cluster buttons
        for (let i = 0; i < buttonList.length; i++) {
          for (let j = i + 1; j < buttonList.length; j++) {
            const b1 = buttonList[i]
            const b2 = buttonList[j]
            const dx = b1.x - b2.x
            const dy = b1.y - b2.y
            const centerDistance = Math.hypot(dx, dy)
            const minCenterDistance = b1.size / 2 + b2.size / 2 + MIN_BUTTON_GAP_PX
            expect(centerDistance).toBeGreaterThanOrEqual(minCenterDistance - 0.01)
          }
        }
      },
    )
  })

  describe('3. Ergonomic Hand Placement: Left Thumb Joystick & Right Thumb Cluster Separation', () => {
    it.each(landscapeProfiles)(
      'keeps joystick on left side (<= 35% width) and cluster on right side (>= 45% width) for $name',
      ({ viewport, safeArea }) => {
        const screen = resolveCombatScreenLayout(viewport, safeArea)
        const buttonList = Object.values(screen.buttons)

        // Joystick on left thumb zone
        expect(screen.joystick.x).toBeLessThanOrEqual(viewport.width * 0.35 + 1)

        // Combat action buttons on right thumb zone
        for (const button of buttonList) {
          expect(button.x).toBeGreaterThanOrEqual(viewport.width * 0.45)
        }

        // Center combat viewport area is clear and unobstructed
        const clearZoneRight = viewport.width * 0.45
        expect(screen.joystick.x + screen.joystick.size / 2).toBeLessThanOrEqual(clearZoneRight + 1)
      },
    )
  })

  describe('4. Portrait Screen Orientation Detection and Safety Guard', () => {
    it.each(portraitProfiles)(
      'correctly identifies portrait mode for $name ($aspectRatioLabel) to trigger rotation prompt',
      ({ viewport }) => {
        const isPortrait = isPortraitViewport(viewport.width, viewport.height)
        expect(isPortrait).toBe(true)
      },
    )

    it.each(landscapeProfiles)(
      'correctly identifies landscape mode for $name ($aspectRatioLabel)',
      ({ viewport }) => {
        const isPortrait = isPortraitViewport(viewport.width, viewport.height)
        expect(isPortrait).toBe(false)
      },
    )
  })
})

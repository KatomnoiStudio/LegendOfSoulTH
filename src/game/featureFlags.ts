import { STANDARD_BANNER } from './gacha/gachaConfig'
import { isHeroProductionReady } from './heroes/heroProductionBatch'

/**
 * Ship gates for features whose code is merged but whose backend is not deployed yet.
 *
 * Why this file exists: v0.15.0 shipped the Lobby PvP button to production while its room RPCs
 * and the `pvp-authority` Edge Function were still undeployed, so every tap raised an
 * RPC-not-found error the player could do nothing about (MEMORY.md item 176). v0.15.1 gated the
 * nav button — but the gate lived inside `MainNavigation`, and `LobbyPage` opens the same modal
 * from a second path (`?modal=pvp`), so the gate leaked. A flag that governs a feature has to
 * live where every entry point can read it, not inside one of them.
 */

/**
 * PvP private rooms (#21). Flip to `true` only when BOTH hold on the production project:
 * `20260809064000_p12_private_pvp_rooms.sql` applied, and the `pvp-authority` Edge Function
 * deployed and verified with two real clients. Until then every entry point falls back to
 * "coming soon" rather than opening a modal that can only fail.
 */
export const PVP_BACKEND_DEPLOYED = false

/**
 * Explicit Ring-0 approval is one half of the Gacha ship gate. Keep this false until the complete
 * banner has passed the Production Asset Contract and a real-device playtest. The computed half
 * below prevents an approval toggle from exposing a banner whose checklist later regresses.
 *
 * The production database banner must also be activated separately after the same verification;
 * this client flag is defense in depth, not the authority boundary.
 */
const HAS_RING0_GACHA_CONTENT_APPROVAL = false

export const GACHA_PRODUCTION_CONTENT_READY =
  HAS_RING0_GACHA_CONTENT_APPROVAL &&
  STANDARD_BANNER.pool.length > 0 &&
  STANDARD_BANNER.pool.every((entry) => isHeroProductionReady(entry.characterId))

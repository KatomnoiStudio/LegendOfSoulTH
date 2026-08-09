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
 * Stage energy/stamina gating (#16). The `adventure/energySystem.ts` module and per-stage
 * `energyCost` data are fully built, but §5.1's gating call (clear-gate only, or +stamina) is
 * still OPEN — the owner has not locked it. Shipping the consumption/blocking path live would
 * pre-empt a decision that isn't made yet, so it stays off until the owner locks §5.1.
 * Design-lock 2.b, 2026-08-10.
 */
export const ENERGY_GATING_ENABLED = false

---
paths:
  - '**/*.tsx'
  - '**/*.jsx'
  - '**/*.ts'
---

<!-- coalmine: verified 2026-08-07b · exemplar React Error Boundaries docs (react.dev) + React 19 release notes + Sentry React SDK + excalidraw TopErrorBoundary + MDN unhandledrejection / WEBGL_lose_context · revalidate 90d -->

# Observability & Error Handling

> Project-authored — no `observability.md` or dedicated error-handling section exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import for any of the four layers pulled into this repo. Written because this app deploys to GitHub Pages (static hosting, no server logs) — client-side instrumentation is the _only_ channel for learning about production failures.

## Global error boundary (MUST-HAVE)

Wrap the render root in a React Error Boundary (class component or the `react-error-boundary` library — React 19 still has no functional equivalent). Without one, any render-time exception white-screens the game with no user feedback and no signal to a developer.

```tsx
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

## Errors outside React's tree

Phaser scenes and Three.js's render loop run outside React's render cycle — a React Error Boundary does **not** catch exceptions thrown inside a Phaser `update()`/scene callback or an R3F `useFrame`. Add a global net:

```ts
window.addEventListener('error', reportError)
window.addEventListener('unhandledrejection', (e) => reportError(e.reason))
```

## WebGL context loss

A lost GPU context (common on low-end/mobile, tab backgrounding, driver resets) silently freezes the canvas with no error thrown by default. Listen for it explicitly:

```ts
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault() // allows restoration
  // surface a "reconnecting" UI state
})
```

## Crash/error reporting — SETTLED, do not re-open without new facts

**A third-party error-tracking sink was considered and declined.** See `MEMORY.md` ("analytics declined — no backend, same wall as Sentry"). The decision stands: this project ships no telemetry to any external service.

What that decision obliges instead — with no server to receive a report, the _player_ is the transport, so make what they can hand over actually useful:

- Every reported failure carries a stable `ErrorCode` from `src/lib/errors/codes.ts`. A player pasting "LOBBY_SCENE_WEBGPU_INIT_FAIL" into an issue is this project's substitute for a stack trace — treat the code registry as the load-bearing part, not a nicety.
- **A code that never reaches the screen is worth nothing.** `tier: 'visible'` now genuinely surfaces: `reportError` notifies subscribers, and `GlobalErrorBanner` (mounted beside `<App/>` in `main.tsx`, outside every context on purpose) renders the code where the player can select and copy it. Callers that can render their own `ErrorCodeTag` still should — the banner is the floor, not a replacement.
- A crash screen tells the player the truth about where their data is. `ErrorBoundary`'s backup button calls the **live** repository (`accountRepository.supabase`), lazily — a static import there would drag `supabaseClient` into `main.tsx`'s pre-`createRoot` path and white-screen the app whenever env is missing, which is the exact failure `main.tsx`'s dynamic `import('./App.tsx')` exists to prevent.
- **Every reported failure carries the game version and a correlation id, and every branch that fails reports.** `reportError` attaches `GAME_INFO.version` + a per-report id, and normalizes whatever was thrown (`normalizeError.ts`) so a report never serializes to `{}` and never drops a Supabase `code`/`details`/`hint`. A failure path that only shows a toast and reports nothing is a bug, not a style choice — a "polite" `ok:false` return is exactly how a 100%-broken button stayed invisible for months.
- Keep the bug-report path connected: `.github/ISSUE_TEMPLATE/bug_report.yml` carries fields for the error code and the game version.

> Amended 2026-08-10 (audit wave 1): `reportError` now ends at a pluggable **sink** (`setErrorSink`) whose default is the same console behaviour as before. This does **not** reopen the settled decision above — nothing is sent anywhere, and wiring an external service is still the owner's call, not an agent's. What the seam buys is that the choice is now a one-line change instead of a refactor, and that the payload reaching it is already normalized and scrubbed (credential-shaped keys and e-mail addresses are redacted at the source, on the assumption that a report may one day leave the player's machine).

## Server-side code has its own channel — use it

The Edge Function (`supabase/functions/pvp-authority/`) runs on Deno, has no player and no
banner, and cannot import `reportError`. Its only channel is its own log stream, so **every
failure path there logs structured single-line JSON before returning** (`logFailure()` in that
file), and `no-console` is turned off for `supabase/functions/**` for exactly that reason
(recorded in `.agents/rules/lint-policy.md`). An error object that is discarded unlogged before
a 500 — as `commitError` was — leaves a constraint violation, an RLS rejection and a deadlock
looking identical from the outside. Never log a key, a token, or a JWT: ids and the error's own
`code`/`details`/`hint` only.

> Amended 2026-08-07: `reportError.ts` used to state there was deliberately **no central relay** — "the caller knows its own code and can show it directly" — from an earlier ask-CB that judged a relay over-engineered. That was true when written: every `'visible'` caller was a component that could render. Three canaries then found independently that it had stopped being true. `globalErrorHandlers` runs outside React entirely, `useAuth.updatePlayer` sits above `ToastProvider`, and the battle error screens showed a message without a code — so `'visible'` was quietly lying in its own contract. The relay added is the smallest thing that fixes it: a `Set` of callbacks and a loop, no store, no state, no context. Reversing a recorded decision needs new facts; these were the facts.

> Corrected 2026-08-07: this section previously read "Pick a client error-tracking sink before shipping further… `@sentry/react` is the standard choice." That was written before the decision to decline analytics was made, and the two documents then sat in unreconciled contradiction — an agent reading only this file would have installed Sentry against a settled call, and one reading only `MEMORY.md` would have silently violated a written MUST-HAVE.

## Try/catch convention

Catch, degrade gracefully, return a safe fallback — and **route every catch through `reportError()`** (`src/lib/errors/`), never a bare `console.error` and never silence. `reportError` takes a severity tier: `'silent'` records the code without interrupting the player, `'visible'` surfaces it. Pick the tier deliberately; a failure the player would want to know about (a save that did not persist) is `'visible'`, or pairs a `'silent'` report with a toast the way `ProfileModal.tsx` does.

```ts
try {
  return JSON.parse(raw)
} catch (error) {
  reportError('STORAGE_READ_FAIL', 'silent', error)
  return null
}
```

> Corrected 2026-08-07: this section previously described every catch in the repo as silent and proposed `console.error('[storage] …')` as the fix. Both are out of date — `src/lib/errors/{codes,reportError}.ts` shipped the day after this rule was written and is a better mechanism than the one the rule suggested; `storage.ts` now reports through it.

> Corrected 2026-08-10: the two catches this note used to name as "the remaining real gaps" (`useDeployWatcher.ts`, `accountRepository.ts`) both route through the registry now — that sentence had been stale for a while. The gaps audit wave 1 actually found were of a different shape and are closed in the same commit as this edit: four empty `catch {}` blocks in `battleViewport.ts`, one shared error code across four distinct PvP failures, and five subsystems (gacha, hero skill/talent/awakening, the currency shop, chat send) that toasted a Thai string and reported nothing at all. **A `catch` that renders a message to the player is still an unreported catch** — the two are not substitutes, and treating a toast as sufficient is how a whole subsystem goes dark.

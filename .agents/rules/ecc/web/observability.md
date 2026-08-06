---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.ts"
---
<!-- coalmine: verified 2026-08-07 · exemplar React Error Boundaries docs (react.dev) + React 19 release notes + Sentry React SDK + excalidraw TopErrorBoundary + MDN unhandledrejection / WEBGL_lose_context · revalidate 90d -->
# Observability & Error Handling

> Project-authored — no `observability.md` or dedicated error-handling section exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import for any of the four layers pulled into this repo. Written because this app deploys to GitHub Pages (static hosting, no server logs) — client-side instrumentation is the *only* channel for learning about production failures.

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
window.addEventListener('error', reportError);
window.addEventListener('unhandledrejection', (e) => reportError(e.reason));
```

## WebGL context loss

A lost GPU context (common on low-end/mobile, tab backgrounding, driver resets) silently freezes the canvas with no error thrown by default. Listen for it explicitly:

```ts
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); // allows restoration
  // surface a "reconnecting" UI state
});
```

## Crash/error reporting — SETTLED, do not re-open without new facts

**A third-party error-tracking sink was considered and declined.** See `MEMORY.md` ("analytics declined — no backend, same wall as Sentry"). The decision stands: this project ships no telemetry to any external service.

What that decision obliges instead — with no server to receive a report, the *player* is the transport, so make what they can hand over actually useful:

- Every reported failure carries a stable `ErrorCode` from `src/lib/errors/codes.ts`, and `ErrorCodeTag` shows it on screen. A player pasting "LOBBY_SCENE_WEBGPU_INIT_FAIL" into an issue is this project's substitute for a stack trace — treat the code registry as the load-bearing part, not a nicety.
- A crash screen should give the player a way to preserve their data before reloading. `exportSave()` already exists (`src/data/accountRepository.ts`, wired at `src/hooks/useAuth.ts`) but is not reachable from `ErrorBoundary` — that gap is the real cost of having no sink, and it is worth more than adding one would be.
- Keep the bug-report path connected: `.github/ISSUE_TEMPLATE/bug_report.yml` should have a field for the error code the crash screen displays.

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

> Corrected 2026-08-07: this section previously described every catch in the repo as silent and proposed `console.error('[storage] …')` as the fix. Both are out of date — `src/lib/errors/{codes,reportError}.ts` shipped the day after this rule was written and is a better mechanism than the one the rule suggested; `storage.ts` now reports through it. The remaining real gaps are the two catches that still bypass the registry (`src/hooks/useDeployWatcher.ts`, `src/data/accountRepository.ts`), not the convention itself.

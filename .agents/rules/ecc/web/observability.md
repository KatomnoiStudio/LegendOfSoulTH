---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.ts"
---
<!-- coalmine: verified 2026-08-05 · exemplar React Error Boundaries docs (react.dev) + Sentry React SDK + MDN WebGL "Handling context lost" + MDN unhandledrejection · revalidate 90d -->
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

## Crash/error reporting

Pick a client error-tracking sink before shipping further — without one, "it just broke" reports have no stack trace, no repro, no release tag. `@sentry/react` (has a built-in `Sentry.ErrorBoundary`) is the standard choice; a free tier covers a small static site.

## Try/catch convention

This repo's existing pattern (`src/lib/storage.ts`, `TitlePage.tsx`, `ProfileModal.tsx`) is consistent — catch, degrade gracefully, return a safe fallback — but every catch is **silent**. Log before swallowing:

```ts
try {
  return JSON.parse(raw);
} catch (err) {
  console.error('[storage] failed to parse', err); // was: silent
  return null;
}
```

Once a reporting sink exists (above), route this through it instead of `console.error` alone.

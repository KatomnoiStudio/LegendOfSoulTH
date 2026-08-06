---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "index.html"
---
<!-- coalmine: verified 2026-08-06 · exemplar caniuse.com WebGL2 support matrix + Three.js WebGL.isWebGL2Available() pattern + MDN "Detect WebGL" · revalidate 90d -->
# Browser / WebGL Compatibility

> Project-authored — no `compatibility.md` exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import; `web/coding-style.md` and `web/design-quality.md` cover CSS/typography/motion only, nothing about WebGL/device support.

## WebGL availability check (MUST-HAVE)

Mount the R3F `<Canvas>` only after confirming WebGL2 is available; show a fallback message otherwise. `LobbyScene` (the only component that mounts a `<Canvas>` — `WukongAdventure` is 2D/DOM, no WebGL) already does this: `WebGL.isWebGL2Available()` gates the mount, with a fallback message shown otherwise.

```ts
import { WebGL } from 'three/examples/jsm/capabilities/WebGL.js';

if (!WebGL.isWebGL2Available()) {
  // render a fallback UI instead of <Canvas>
}
```

## Minimum support floor

CLOSED — `package.json` already carries a `browserslist` field, so Vite/esbuild target the declared floor instead of defaulting.

## Mobile / touch

`index.html`'s viewport meta (`width=device-width`, `viewport-fit=cover`) signals mobile is a target, but `WukongAdventure`'s on-screen hint documents WASD/arrow-key controls only. A `onPointerDown` floor-click handler already exists — either surface it as a visible on-screen control for touch devices, or explicitly scope mobile out in the HUD/README so the mismatch is a decision, not an oversight.

## GPU tiering (nice-to-have)

`dpr` is no longer a flat cap — `LobbyScene` already scales its max dpr down (2 → 1.5) on ≥120Hz displays via `useDeviceRefreshRate()`, since render cost scales with dpr² × refresh rate. `@react-three/drei`'s `PerformanceMonitor` or `pmndrs/detect-gpu` remain the standard way to step quality down further on low-end hardware if reports of poor mobile performance come in — still not needed pre-emptively.

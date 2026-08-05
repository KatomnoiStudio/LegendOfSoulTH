---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "index.html"
---
<!-- coalmine: verified 2026-08-05 · exemplar caniuse.com WebGL2 support matrix + Three.js WebGL.isWebGL2Available() pattern + MDN "Detect WebGL" · revalidate 90d -->
# Browser / WebGL Compatibility

> Project-authored — no `compatibility.md` exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import; `web/coding-style.md` and `web/design-quality.md` cover CSS/typography/motion only, nothing about WebGL/device support.

## WebGL availability check (MUST-HAVE)

Mount the R3F `<Canvas>` only after confirming WebGL2 is available; show a fallback message otherwise. Today `LobbyScene`/`WukongAdventure` mount unconditionally — on a browser/GPU without WebGL2, the game is blank with no explanation.

```ts
import { WebGL } from 'three/examples/jsm/capabilities/WebGL.js';

if (!WebGL.isWebGL2Available()) {
  // render a fallback UI instead of <Canvas>
}
```

## Minimum support floor

State it explicitly somewhere (README or here) instead of leaving it implicit in `tsconfig.app.json`'s `target: "es2023"`. Add a `browserslist` field to `package.json` once a floor is decided — this also lets Vite/esbuild target builds correctly instead of defaulting.

## Mobile / touch

`index.html`'s viewport meta (`width=device-width`, `viewport-fit=cover`) signals mobile is a target, but `WukongAdventure`'s on-screen hint documents WASD/arrow-key controls only. A `onPointerDown` floor-click handler already exists — either surface it as a visible on-screen control for touch devices, or explicitly scope mobile out in the HUD/README so the mismatch is a decision, not an oversight.

## GPU tiering (nice-to-have)

`dpr={[1, 2]}` is a flat cap regardless of device. `@react-three/drei`'s `PerformanceMonitor` or `pmndrs/detect-gpu` are the standard way to step quality down further on low-end hardware if reports of poor mobile performance come in — not needed pre-emptively.

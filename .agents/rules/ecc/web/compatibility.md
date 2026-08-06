---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "index.html"
---
<!-- coalmine: verified 2026-08-07 · exemplar caniuse.com WebGL2 + WebGPU support matrices + Three.js WebGL.isWebGL2Available() pattern + MDN "Detect WebGL" + Vite build.target docs · revalidate 90d -->
# Browser / WebGL Compatibility

> Project-authored — no `compatibility.md` exists in the upstream [affaan-m/ECC](https://github.com/affaan-m/ECC) import; `web/coding-style.md` and `web/design-quality.md` cover CSS/typography/motion only, nothing about WebGL/device support.

## WebGL availability check (MUST-HAVE)

Mount the R3F `<Canvas>` only after confirming WebGL2 is available; show a fallback message otherwise. **Two** components mount a `<Canvas>` and both gate it — `LobbyScene.tsx` and `BattleScene/RealtimeBattleRoom.tsx` (`WukongAdventure` is 2D/DOM, no WebGL). Any third one must do the same.

> Corrected 2026-08-07: this section previously called `LobbyScene` "the only component that mounts a `<Canvas>`", which stopped being true when the realtime battle room landed. The rule itself was right and both call sites already comply — only the count was wrong.

```ts
import { WebGL } from 'three/examples/jsm/capabilities/WebGL.js';

if (!WebGL.isWebGL2Available()) {
  // render a fallback UI instead of <Canvas>
}
```

## Minimum support floor (OPEN — the declared floor is not enforced by anything)

`package.json` carries a `browserslist` field (`last 2 Chrome/Firefox/Safari/Edge versions`), but **nothing in this project's build reads it.** Verified 2026-08-07: there is no `@vitejs/plugin-legacy`, no `autoprefixer`, no `postcss` config, no Babel; `vite.config.ts` sets no `build.target`, so Vite silently applies its own default target, which is unrelated to the declared list. `tsconfig.app.json` pins a third, separate target that never reaches output (`noEmit: true`). Three declarations, none of them wired together.

Consequences to treat as binding:

- **Do not cite `browserslist` as a compatibility guarantee** in code comments or reviews. It documents intent, not enforcement. Three source files did exactly this and had to be corrected alongside this rule (`src/lib/audio/AudioEngine.ts`, `src/lib/audio/sounds.ts`, `src/components/WorldChat/chatStorage.ts`).
- A support claim about a specific browser version needs a real check — a feature detect at the call site (the pattern `chatStorage.ts` and `AudioEngine.ts` already use), or a verified caniuse/MDN reference stated as a reference rather than as something the build enforces.
- Closing this for real means picking one mechanism and wiring it: `build.target` derived from `browserslist`, or `@vitejs/plugin-legacy`, or deleting the `browserslist` field so nothing can lean on it. Choosing among those is a human call, not an agent's.

> Corrected 2026-08-07: this section previously read "CLOSED — `package.json` already carries a `browserslist` field, so Vite/esbuild target the declared floor instead of defaulting." That was false, and the false CLOSED was load-bearing — three source files cited the guarantee it claimed to provide.

## Mobile / touch

`index.html`'s viewport meta (`width=device-width`, `viewport-fit=cover`) signals mobile is a target, but `WukongAdventure`'s on-screen hint documents WASD/arrow-key controls only. A `onPointerDown` floor-click handler already exists — either surface it as a visible on-screen control for touch devices, or explicitly scope mobile out in the HUD/README so the mismatch is a decision, not an oversight.

## GPU tiering (nice-to-have)

`dpr` is no longer a flat cap — `LobbyScene` already scales its max dpr down (2 → 1.5) on ≥120Hz displays via `useDeviceRefreshRate()`, since render cost scales with dpr² × refresh rate. `@react-three/drei`'s `PerformanceMonitor` or `pmndrs/detect-gpu` remain the standard way to step quality down further on low-end hardware if reports of poor mobile performance come in — still not needed pre-emptively.

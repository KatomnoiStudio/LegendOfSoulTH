# Hanuman Idle Alpha Repair — TDD Evidence

Operator: HetCreep
Agent: Codex
Date: 2026-08-11

## Source and user journey

No plan file was supplied. The journey was derived from the live Preview report: as the art owner, HetCreep needs every Hanuman Idle frame to retain the original dark contour pixels so the transparent sprite does not appear cut or perforated.

## RED / GREEN evidence

| Guarantee                                                                                    | Test                                                                                 | Evidence                                                                        |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| A dark original outline pixel touching colored character art survives black-backdrop removal | `preserves original dark outline pixels that touch the colored character`            | RED: expected alpha 255, received 0. GREEN: targeted suite passes.              |
| Regenerated frames cannot be hidden by the browser's old image cache                         | `cache-busts regenerated frames so the preview cannot display the damaged alpha set` | RED: version query absent. GREEN: `hanuman-ink-guard-v2` present.               |
| Idle remains rooted and uses only intact source poses                                        | existing root/QC tests                                                               | GREEN: Y drift 0px, waist drift 0.5px, source sequence `2,2,4,4,2,2,4,4`.       |
| Hole-free V2 uses four complete square poses with idle-grade ground stability                | `ships four complete V2 poses on one square canvas with idle-grade ground stability` | GREEN: four 640×640 frames, no edge contact, lowest-pixel spread ≤1px.          |
| Preview geometry matches the V2 sprite contract                                              | `previews V2 on its matching square canvas and honest feet guide`                    | RED: old 5:4 canvas/Y=490. GREEN: square canvas, Y=587, and honest ≤1px status. |

Validation command:

```text
node tools/hanuman-idle.mjs
node_modules/.bin/vitest.cmd run tools/hanuman-idle.test.mjs
node_modules/.bin/oxlint.cmd tools/hanuman-idle.mjs tools/hanuman-idle.test.mjs
```

Result: 11/11 tests passed; targeted lint exited 0. Local HTTP smoke test returned 200 for both Preview and a versioned V2 frame URL. Headless Chromium loaded the active V2 animation at natural size 640×640, advanced to Tick 3/8, and reported zero console/page errors.

## Coverage and known gap

`vitest ... --coverage` executed all 9 tests successfully, but the repository V8 coverage configuration reported 0% because the standalone `tools/*.mjs` files are outside its included production-source set. Behavior is pinned by targeted tests, but numeric tool-script coverage is therefore unavailable from the current shared configuration.

No TDD checkpoint commits were created: this Ring-1 session is working in an already dirty shared working tree and was not authorized to mutate Git history.

## Hanuman Run Erlang cadence — TDD evidence (2026-08-11)

The request changed from a 12-frame run to the supplied Erlang cadence, so the deliverable uses 25 frames to match `tmp/erlang-reference/run_right/atlas.json` (25 frames, approximately 2.042 seconds). The Erlang sheet is a motion reference only; Hanuman identity remains sourced from the accepted Idle V2.

| Guarantee                                                    | Test                                                                     | Evidence                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All Erlang-count frames exist on a common transparent canvas | `ships all 25 frames on a shared 640px canvas with no output clipping`   | RED: test initially failed because the Preview/metadata contract was not present. GREEN: 25/25 RGBA 640×640 frames, no empty/output-edge/clamped frames, body-scale CV 0.0377421, anchor-Y std 0.0149731. |
| Motion uses one shared root/feet origin                      | `uses the Erlang 25-frame cadence and the shared feet anchor`            | GREEN: 82 ms cadence, 25 labels, every processed origin `[320,570]`.                                                                                                                                      |
| Preview cannot crossfade or show stale frames                | `previews one run frame at a time and preloads all 25 without crossfade` | RED: Preview file absent. GREEN: cache-busted `erlang25-v1` URLs, `Image.decode()` preload, one stage image, no opacity transition/crossfade.                                                             |

Validation command:

```text
node_modules/.bin/vitest.cmd run tools/hanuman-run.test.mjs
node_modules/.bin/oxlint.cmd tools/hanuman-run.test.mjs
```

Result: 3/3 targeted Run tests passed. The processor was run with `--rows 5 --cols 5 --align feet --shared-scale --scale-strategy preserve --strict-qc --allow-source-edge-touch`; the allowance is recorded because 20 raw source cells are close to a source-cell edge, while delivered output has zero edge touches and no clipping. Browser smoke and visual review remain required for final Erlang-feel acceptance.

### Clipping correction pass

The first Run V1 visual review found straight cuts at the lower legs in early frames. Root cause: the generated source sheet placed feet on/through the bottom of individual cells before extraction; output QC could not detect this as an output-edge touch because the crop itself had already removed those pixels. V2 improved the source but still had source-cell proximity. The final V4 pass uses a deliberately smaller placement anchor, a hard lower margin, and an explicit odd/even arm-leg alternation contract. V4 has zero source-edge, output-edge, empty, and clamped frames; the Preview now uses `erlang25-v4` cache-busting. V1–V3 remain available for comparison only.

## Hanuman Run 12-frame reduction — TDD evidence (2026-08-11)

| Guarantee                                                                                        | Test                                                                     | Evidence                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exactly 12 complete frames are delivered                                                         | `ships all 12 frames on a shared 640px canvas with no output clipping`   | GREEN: 12/12 RGBA 640×640 frames, 3×4 metadata, no empty/output-edge/source-edge/clamped frames; body-scale CV 0.0097394.                         |
| Run cadence is stable and rooted                                                                 | `uses the Erlang 12-frame cadence and the shared feet anchor`            | GREEN: 137 ms/frame, labels `run-1` … `run-12`, every processed origin `[320,570]`; source anchor-Y std 0.0550646 under the 0.06 run ceiling.     |
| Preview shows only the requested 12 frames without crossfade and shares Idle's visual feet guide | `previews one run frame at a time and preloads all 12 without crossfade` | GREEN: `erlang12-v5` URLs, `Image.decode()` preload, 4-column strip, Y=587 guide matching Idle, one stage image, no opacity transition/crossfade. |

The final V5 source was regenerated with a smaller centered placement after V3/V4 source-edge review. The prompt explicitly requires alternating arms/opposite legs, one planted foot per frame, tail wag, generous per-cell margins, and preserved Idle White identity. The older 25-frame sheets remain comparison artifacts only.

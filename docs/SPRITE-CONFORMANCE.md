# Sprite Conformance Record

Operator: HetCreep
Agent: Codex
Updated: 2026-08-11T21:10:00+07:00

This record applies `SPRITE-DESIGN-LOCK.md` to sprite assets measured in this worktree. Current audited scope is Hanuman Idle V2 and the Hanuman Erlang-style Run preview; other project sprites remain unaudited here.

## Hanuman Idle hole-free V2

| Contract slot      | Chosen value and provenance                                                                                                                                                                                   | Status   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Source             | `assets/raw/characters/hanuman-idle-holefree-v2.png`, built-in image generation using `assets/raw/characters/hanuman-idle-source.png` as identity/style reference; prompt retained beside the delivery        | PASS     |
| Source geometry    | 1254×1254 PNG, 2×2 grid; four 627×627 source cells                                                                                                                                                            | PASS     |
| Delivered canvas   | 640×640 RGBA PNG per pose; aspect 1:1                                                                                                                                                                         | PASS     |
| Frame count        | Four unique Idle poses; Preview holds each pose twice for eight playback ticks                                                                                                                                | PASS     |
| Cadence            | 300 ms per Preview tick; project-local feel value (Layer C)                                                                                                                                                   | RECORDED |
| Anchor             | Feet-aligned bottom-centre convention; processor output origin `[320, 570]` on the untrimmed 640×640 canvas                                                                                                   | PASS     |
| Measured foot line | Lowest opaque row 586–587; 1px spread, within the design-lock pose-hold ceiling of ±1px                                                                                                                       | PASS     |
| Scale consistency  | Preserve strategy, shared source-to-output scale `0.8064620355411956`; body-scale CV `0.0115873` against strict ceiling `0.08`                                                                                | PASS     |
| Anchor consistency | Normalized anchor-Y standard deviation `0.000807754` against strict ceiling `0.05`                                                                                                                            | PASS     |
| Edge safety        | Zero source-edge touches, output-edge touches, empty frames, and paste-clamped frames                                                                                                                         | PASS     |
| Crop record        | Processor trims 4px from each 627×627 source cell to a 619×619 processing frame; per-pose source/crop/aligned boxes are retained in `pipeline-meta.json`                                                      | PASS     |
| Consumer walk      | `public/_preview-hanuman-idle.html` consumes V2 on a matching square stage with Y=587 guide. No combat/runtime character mapping was changed. V1 remains available under `public/characters/hanuman-idle-v1/` | PASS     |
| Decode ceiling     | Four unique RGBA8 canvases: `4 × 640 × 640 × 4 = 6,553,600` bytes (6.25 MiB theoretical decoded ceiling); duplicated Preview ticks reuse these four URLs                                                      | RECORDED |
| Artifact formats   | Four transparent PNGs, transparent sheet PNG, animation GIF, cleaned/raw sheets, prompt, and pipeline metadata                                                                                                | PASS     |

### Visual acceptance boundary

Automated QC proves geometry, containment, alpha extraction, scale, and anchor stability. Because V2 is an identity-preserving generated derivative rather than a pixel-exact edit of V1, final facial/style acceptance remains HetCreep's visual decision in the local Preview.

## Hanuman Run — Erlang cadence V4 (25 frames)

| Contract slot      | Chosen value and provenance                                                                                                                                                                                                                                                                      | Status   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Source             | `assets/raw/characters/hanuman-run-erlang-25-source-v4.png`, regenerated from the user-supplied Idle White lock with a deliberately smaller 5×5 placement anchor after the clipping report; the Erlang `run_right` sheet is used only as a motion reference; prompt retained beside the delivery | PASS     |
| Source geometry    | 1254×1254 PNG, 5×5 grid; processor reads 250×250 source cells (the final 4px border is magenta-only)                                                                                                                                                                                             | RECORDED |
| Delivered canvas   | 640×640 RGBA PNG per frame; aspect 1:1                                                                                                                                                                                                                                                           | PASS     |
| Frame count        | 25 frames, matching the supplied Erlang run cadence; row-major order; `run-1.png` … `run-25.png`                                                                                                                                                                                                 | PASS     |
| Cadence            | 82 ms per frame (about 2.05 s loop), matching Erlang's approximately 2.042 s / 25-frame timing; adjustable in Preview                                                                                                                                                                            | RECORDED |
| Physics sequence   | Airborne preparation → reach/extension → descent → contact → compression → single-leg midstance → passing knee → push-off → airborne switch, mirrored across the second half and looped                                                                                                          | PASS     |
| Anchor             | Feet-aligned bottom-centre convention; processor shared output origin `[320, 570]`                                                                                                                                                                                                               | PASS     |
| Scale consistency  | Preserve strategy with shared scale; body-scale CV `0.0163907` against strict ceiling `0.08`                                                                                                                                                                                                     | PASS     |
| Anchor consistency | Normalized anchor-Y standard deviation `0.0386247` against strict ceiling `0.05`                                                                                                                                                                                                                 | PASS     |
| Edge safety        | Zero source-edge touches, output-edge touches, paste-clamped frames, and empty frames. Every leg/foot is fully contained in its source and delivered cell.                                                                                                                                       | PASS     |
| Side alternation   | Prompt contract alternates right-arm/left-leg and left-arm/right-leg on every consecutive frame; no hold or extra frames.                                                                                                                                                                        | RECORDED |
| Consumer walk      | `public/_preview-hanuman-run.html` consumes V4 with checkerboard, X=320 root guide, Y=570 feet guide, frame strip, preload/decode, and no crossfade. Idle V2 remains unchanged; V1–V3 are retained for comparison.                                                                               | PASS     |
| Artifact formats   | 25 transparent PNGs, 5×5 transparent sheet, animation GIF, cleaned/raw sheets, prompt, and pipeline metadata                                                                                                                                                                                     | PASS     |

### Visual acceptance boundary

The 25-frame sheet is an identity-preserving generated derivative whose pose cadence follows the supplied Erlang reference. Automated QC proves output containment, alpha extraction, shared scale, and anchor stability; final face/line fidelity and “Erlang feel” remain HetCreep's visual decision in the local Preview.

## Hanuman Run — Erlang cadence 12 frames (current)

| Contract slot      | Chosen value and provenance                                                                                                                                                     | Status   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Source             | `assets/raw/characters/hanuman-run-erlang-12-source-v5.png`, regenerated from the locked Idle White design; Erlang is motion/cadence reference only                             | PASS     |
| Source geometry    | 1448×1086 PNG, 4×3 grid; processor reads 362×362 source cells                                                                                                                   | PASS     |
| Delivered canvas   | 640×640 RGBA PNG per frame; aspect 1:1                                                                                                                                          | PASS     |
| Frame count        | Exactly 12 row-major frames (`run-1.png` … `run-12.png`), no extras                                                                                                             | PASS     |
| Cadence            | 137 ms per frame (about 1.644 s loop); speed control remains adjustable in Preview                                                                                              | PASS     |
| Motion contract    | Alternating arm and opposite-leg emphasis every frame, one foot planted in each pose, tail wag across the cycle                                                                 | RECORDED |
| Anchor             | Feet-aligned bottom-centre convention; shared output origin `[320, 570]`                                                                                                        | PASS     |
| Scale consistency  | Preserve strategy with shared scale; body-scale CV `0.0097394` against ceiling `0.08`                                                                                           | PASS     |
| Anchor consistency | Normalized source anchor-Y std `0.0550646` against this run's `0.06` ceiling; output feet are aligned to the shared origin                                                      | PASS     |
| Edge safety        | Zero source-edge touches, output-edge touches, paste-clamped frames, and empty frames                                                                                           | PASS     |
| Consumer walk      | `public/_preview-hanuman-run.html` now consumes V5 with 4-column strip, checkerboard, X=320 root guide, Y=587 visual feet guide matching Idle, preload/decode, and no crossfade | PASS     |
| Artifact formats   | 12 transparent PNGs, 4×3 transparent sheet, animation GIF, cleaned/raw sheets, prompt, and pipeline metadata                                                                    | PASS     |

The 25-frame variants remain comparison artifacts only; V5 is the current 12-frame Preview deliverable.

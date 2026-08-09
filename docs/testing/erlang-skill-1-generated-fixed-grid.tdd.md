# Erlang Shen Skill 1 - Generated Fixed-Grid Replacement

- Operator: `HetCreep`
- Agent: `Codex / primary`
- Timestamp: `2026-08-09T15:09:37+07:00`

## Contract

- 16 runtime frames at 640x512.
- Four generated 2x2 sheets; each cell is 627x627.
- Whole-sheet magenta key removal happens before fixed-grid slicing.
- One shared 0.807 scale is applied to every complete source cell.
- No per-frame crop or trim.
- No per-frame resize is allowed. Each generated frame may only translate as one complete 640x512 canvas to the shared Idle root axis.
- Alpha below 32 is forced to zero after resize so no faint full-cell matte survives.
- Every generated frame shares Idle's feet baseline Y=480 and model-center X axis, while crouching and lunging poses retain their natural smaller pose bounds instead of being enlarged.
- Frames 0-14 are distinct fixed-grid action poses and frame 15 is a generated recovery pose. Idle is not baked into this 16-frame one-shot.
- `SkillSystem` changes the character's state to Idle after the skill duration completes, so return-to-idle happens in the runtime rather than looking like an extra frame in the asset sequence.
- The recovery source is uniformly normalized by its source-canvas height before the same 0.807 profile is applied. It is never cropped, distorted, or individually enlarged.

## User Journey

As a player, I want Skill 1 to begin immediately with an attack, progress through sixteen distinct frames at a stable Erlang scale, and return cleanly to Idle so that it never looks as though a frame is duplicated, missing, or zoomed.

## RED

`python tools/test_erlang_skill_1_generated_fixed_grid.py`

The original replacement failed two new regressions for the reported defects:

- Faint-matte test: frame 1 already had 7,149 low-alpha pixels and later frames had roughly 160,000.
- Idle-geometry test: near-standing frame 1 measured 344px instead of 370px and missed the Y111-480 anchor.
- All-frame geometry test: frame 3 measured 347px instead of 370px before the explicit all-frame normalization pass.
- Exact-geometry regression: the former two-pixel tolerance exposed frames 7/9 at 371px and frames 11/13 at 369px. The tightened test failed first on frame 7 at 371px.
- Scale-regression: the exact-height approach enlarged crouching and lunging body poses. The revised test failed because metadata still declared per-frame scaling.
- Sequence regression: the new runtime test failed because frame 0 was pixel-identical to Idle and metadata still declared two Idle frames.
- Recovery-scale regression: the generated recovery initially measured 301px versus Idle's 370px (18.65% too small); the new 10% scale gate failed as intended.
- Baked-idle regression: the revised sequence test failed because frame 15 was Idle and metadata recorded it as a canonical Idle frame.
- Animation-preview regression: the preview contract test failed because the interactive preview page did not yet exist.
- Frame-14 spill regression: the exact 30×35px area behind Erlang contained 222 opaque/visible pixels from the adjacent grid cell.

## GREEN

- `python tools/test_erlang_skill_1_generated_fixed_grid.py` - 5/5 passed.
- `npm.cmd test -- --run src/game/battleSpriteSequences.test.ts src/game/realtimeBattle/battleAssets.test.ts src/game/realtimeBattle/RealtimeBattleRuntime.test.ts` - 28/28 passed.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run build` - passed.
- `npm.cmd test -- --run src/game/battleSpriteSequences.test.ts src/game/realtimeBattle/RealtimeBattleRuntime.test.ts src/game/realtimeBattle/battleAssets.test.ts` - 28/28 passed after removing the baked Idle frame.
- `npm.cmd run typecheck` - passed after removing the baked Idle frame.
- `python tools/test_erlang_skill_1_generated_fixed_grid.py` - 6/6 passed after adding the interactive preview contract.
- Browser QA: the local preview played 1→16 at 14 FPS, stopped on frame 16, and its Previous control selected frame 15 with the matching status text.
- `python tools/test_erlang_skill_1_generated_fixed_grid.py` - 7/7 passed after erasing the audited frame-14 neighbor-cell spill; the 16-frame count and all anchors remain unchanged.
- Contact-sheet visual inspection: all 16 frames were reviewed on the checkerboard preview.

## Image QC

- Exact runtime indices 0-15.
- All frames non-empty and 640x512.
- No visible magenta pixels after key removal.
- No alpha reaches any output edge.
- Frame 0 and frame 15 both differ from `assets/raw/characters/erlang-shen-v6-idle-0.png`; Idle is selected only after the one-shot ends.
- All 16 frames are pixel-unique.
- All 16 frames use one 0.807 source-cell scale, no per-frame scaling, the Idle feet baseline Y=480, and the Idle model-center X axis.
- Recovery is 371px against Idle's 370px model height (within the 10% guard).
- Generated frames contain no pixels with alpha 1-31; canonical Idle retains only its original edge antialiasing.

## Coverage and Known Gap

The repository has no configured coverage runner for the deterministic Python asset-QC script. Its five checks cover the delivered contract: frame count/clean alpha, matte removal, shared scale/root, no leading Idle or duplicates, and fixed-grid metadata. Existing project-wide TypeScript coverage was not rerun because this change does not alter TypeScript execution paths.

"""QC checks for the regenerated Erlang Shen Skill 1 sprite sequence."""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
import re
import unittest

import numpy as np
from PIL import Image, ImageChops
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "characters"
PREVIEW = PUBLIC / "erlang-shen-skill-1-generated-preview"
ANIMATION_PREVIEW = PREVIEW / "preview-animation.html"
IDLE = ROOT / "assets" / "raw" / "characters" / "erlang-shen-v6-idle-0.png"


def character_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    rgba = np.asarray(frame.convert("RGBA"))
    red, green, blue, alpha = [rgba[:, :, channel].astype(np.int16) for channel in range(4)]
    lightning = (blue > red + 18) & (blue > green + 8) & (blue > 125)
    body = (alpha >= 128) & ~lightning
    body = ndimage.binary_opening(body, structure=np.ones((2, 2)))
    labels, _ = ndimage.label(body, structure=np.ones((3, 3)))
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    y_positions, x_positions = np.where(labels == int(sizes.argmax()))
    return (
        int(x_positions.min()),
        int(y_positions.min()),
        int(x_positions.max() + 1),
        int(y_positions.max() + 1),
    )


class ErlangSkillOneGeneratedFixedGridTest(unittest.TestCase):
    def test_runtime_has_exactly_sixteen_clean_frames(self) -> None:
        frames = [
            path
            for path in PUBLIC.glob("erlang-shen-skill-1-*.webp")
            if re.fullmatch(r"erlang-shen-skill-1-\d+", path.stem)
        ]
        frames.sort(key=lambda path: int(path.stem.rsplit("-", 1)[1]))
        self.assertEqual([int(path.stem.rsplit("-", 1)[1]) for path in frames], list(range(16)))

        for path in frames:
            with Image.open(path) as source:
                frame = source.convert("RGBA")
            self.assertEqual(frame.size, (640, 512), path.name)
            alpha = np.asarray(frame.getchannel("A"))
            self.assertGreater(np.count_nonzero(alpha), 4_000, path.name)
            self.assertFalse(np.any(alpha[0, :]), path.name)
            self.assertFalse(np.any(alpha[-1, :]), path.name)
            self.assertFalse(np.any(alpha[:, 0]), path.name)
            self.assertFalse(np.any(alpha[:, -1]), path.name)

            rgba = np.asarray(frame)
            visible = rgba[:, :, 3] > 8
            pink = (
                (rgba[:, :, 0] > 180)
                & (rgba[:, :, 2] > 150)
                & (rgba[:, :, 1] < 100)
                & visible
            )
            self.assertEqual(int(np.count_nonzero(pink)), 0, path.name)

    def test_no_faint_full_cell_matte_remains(self) -> None:
        for index in range(16):
            with Image.open(PUBLIC / f"erlang-shen-skill-1-{index}.webp") as source:
                alpha = np.asarray(source.convert("RGBA").getchannel("A"))
            faint_background = (alpha > 0) & (alpha < 32)
            self.assertLess(
                int(np.count_nonzero(faint_background)),
                5_000,
                f"frame {index} still contains a faint rectangular matte",
            )

    def test_attack_uses_one_idle_scale_and_shared_root_axis(self) -> None:
        with Image.open(IDLE) as source:
            idle_left, idle_top, idle_right, idle_bottom = character_bbox(source)
        idle_center_x = (idle_left + idle_right) / 2

        metadata = json.loads((PREVIEW / "fixed-grid-metadata.json").read_text(encoding="utf-8"))
        self.assertFalse(metadata["per_frame_scale_and_anchor"])
        self.assertEqual(len(set(metadata["whole_row_scales"])), 1)
        self.assertTrue(
            all(scale == 1.0 for scale in metadata["per_frame_normalization_scales"]),
            "attack frames must not be enlarged independently",
        )

        for index in range(16):
            with Image.open(PUBLIC / f"erlang-shen-skill-1-{index}.webp") as source:
                left, _, right, bottom = character_bbox(source)
            self.assertEqual(bottom, idle_bottom, f"frame {index} feet Y axis")
            self.assertLessEqual(
                abs(((left + right) / 2) - idle_center_x),
                0.5,
                f"frame {index} model X axis",
            )

        # The newly generated recovery must share Idle's camera/model scale;
        # it may be a different pose, but it must not look zoomed out.
        with Image.open(PUBLIC / "erlang-shen-skill-1-14.webp") as source:
            _, recovery_top, _, recovery_bottom = character_bbox(source)
        idle_height = idle_bottom - idle_top
        recovery_height = recovery_bottom - recovery_top
        self.assertLessEqual(
            abs(recovery_height - idle_height) / idle_height,
            0.10,
            "recovery model height must remain within 10% of Idle",
        )

    def test_skill_contains_only_sixteen_unique_action_frames(self) -> None:
        with Image.open(IDLE) as source:
            idle = source.convert("RGBA")

        # Idle is selected by the runtime only after this one-shot skill ends.
        # Baking it into the 16-frame sheet creates a visible extra frame.
        with Image.open(PUBLIC / "erlang-shen-skill-1-0.webp") as source:
            first = source.convert("RGBA")
        self.assertIsNotNone(ImageChops.difference(idle, first).getbbox(), "frame 0 must be the attack start")

        with Image.open(PUBLIC / "erlang-shen-skill-1-15.webp") as source:
            last = source.convert("RGBA")
        self.assertIsNotNone(ImageChops.difference(idle, last).getbbox(), "frame 15 must remain a recovery action")

        hashes: list[str] = []
        for index in range(16):
            with Image.open(PUBLIC / f"erlang-shen-skill-1-{index}.webp") as source:
                frame = source.convert("RGBA")
            hashes.append(hashlib.sha256(frame.tobytes()).hexdigest())
        self.assertEqual(len(set(hashes)), 16, "Skill 1 must not contain a duplicated/extra frame")

    def test_metadata_records_fixed_grid_without_per_frame_trim(self) -> None:
        metadata = json.loads((PREVIEW / "fixed-grid-metadata.json").read_text(encoding="utf-8"))
        self.assertEqual(metadata["frame_count"], 16)
        self.assertEqual(metadata["source_grid_per_sheet"], [2, 2])
        self.assertEqual(metadata["source_sheet_count"], 4)
        self.assertFalse(metadata["per_frame_crop_or_trim"])
        self.assertFalse(metadata["per_frame_scale_and_anchor"])
        self.assertTrue(metadata["per_frame_translation_to_shared_root"])
        self.assertEqual(metadata["output_cell_size"], [640, 512])
        self.assertEqual(metadata["canonical_idle_frames"], [])
        self.assertEqual(metadata["recovery_source_canvas_scale_strategy"], "contain-uniform")
        self.assertTrue(metadata["recovery_uses_shared_cell_scale"])

    def test_animation_preview_plays_the_sixteen_runtime_frames_in_order(self) -> None:
        source = ANIMATION_PREVIEW.read_text(encoding="utf-8")
        self.assertIn("const FRAME_COUNT = 16", source)
        self.assertIn("erlang-shen-skill-1-${index}.webp", source)
        self.assertIn('id="play-pause"', source)
        self.assertIn('id="frame-scrubber"', source)
        self.assertIn('id="previous-frame"', source)
        self.assertIn('id="next-frame"', source)

    def test_frame_fourteen_has_no_spill_from_the_previous_grid_cell(self) -> None:
        with Image.open(PUBLIC / "erlang-shen-skill-1-13.webp") as source:
            alpha = np.asarray(source.convert("RGBA").getchannel("A"))
        # This rectangle is behind Erlang's body and belongs to the lightning
        # tail in the preceding fixed-grid cell, not to frame 14 itself.
        self.assertEqual(int(np.count_nonzero(alpha[425:460, 110:140])), 0)


if __name__ == "__main__":
    unittest.main()

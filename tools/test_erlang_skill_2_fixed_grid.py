"""Regression checks for Erlang Skill 2's fixed-grid import."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import unittest

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "characters"
PREVIEW = PUBLIC / "erlang-shen-skill-2-preview"
FRAME_COUNT = 12
OUTPUT_SIZE = (800, 760)


class ErlangSkill2FixedGridTest(unittest.TestCase):
    def test_source_is_an_exact_four_by_three_grid(self) -> None:
        with Image.open(ROOT / "assets/raw/characters/erlang-shen-skill-2-green-source-4x3.png") as source:
            self.assertEqual(source.size, (1448, 1086))
            self.assertEqual((source.width // 4, source.height // 3), (362, 362))

    def test_exactly_twelve_lossless_runtime_frames_exist(self) -> None:
        frames = [PUBLIC / f"erlang-shen-skill-2-{index}.webp" for index in range(FRAME_COUNT)]
        self.assertTrue(all(frame.exists() for frame in frames))
        self.assertFalse((PUBLIC / "erlang-shen-skill-2-12.webp").exists())
        for frame in frames:
            with Image.open(frame) as image:
                self.assertEqual(image.size, OUTPUT_SIZE)

    def test_no_empty_frame_or_output_edge_clipping(self) -> None:
        for index in range(FRAME_COUNT):
            rgba = np.asarray(Image.open(PUBLIC / f"erlang-shen-skill-2-{index}.webp").convert("RGBA"))
            alpha = rgba[:, :, 3]
            with self.subTest(frame=index + 1):
                self.assertGreater(int(alpha.max()), 0)
                self.assertFalse(np.any(alpha[0]))
                self.assertFalse(np.any(alpha[-1]))
                self.assertFalse(np.any(alpha[:, 0]))
                self.assertFalse(np.any(alpha[:, -1]))

    def test_has_no_chroma_colour_or_duplicate_grid_frame(self) -> None:
        hashes: set[str] = set()
        for index in range(FRAME_COUNT):
            rgba = np.asarray(Image.open(PUBLIC / f"erlang-shen-skill-2-{index}.webp").convert("RGBA"))
            red, green, blue = [rgba[:, :, channel].astype(np.int16) for channel in range(3)]
            alpha = rgba[:, :, 3]
            magenta = (red > 200) & (blue > 200) & (green < 100) & (alpha > 0)
            chroma_green = (green > 120) & (green > red + 25) & (green > blue + 25) & (alpha > 0)
            with self.subTest(frame=index + 1):
                self.assertFalse(np.any(magenta))
                self.assertFalse(np.any(chroma_green))
                digest = hashlib.sha256(rgba.tobytes()).hexdigest()
                self.assertNotIn(digest, hashes)
                hashes.add(digest)

    def test_metadata_locks_one_scale_and_idle_world_root(self) -> None:
        metadata = json.loads((PREVIEW / "fixed-grid-metadata.json").read_text(encoding="utf-8"))
        self.assertEqual(metadata["source_grid"], [4, 3])
        self.assertEqual(metadata["source_cell_size"], [362, 362])
        self.assertEqual(metadata["output_size"], [800, 760])
        self.assertEqual(metadata["frame_count"], FRAME_COUNT)
        self.assertTrue(metadata["webp"]["lossless"])
        self.assertFalse(metadata["per_frame_crop_or_trim"])
        self.assertFalse(metadata["per_frame_scale_or_zoom"])
        self.assertTrue(metadata["per_frame_whole_canvas_translation_only"])
        self.assertEqual(len(metadata["source_root_x"]), FRAME_COUNT)
        self.assertEqual(len(metadata["source_foot_y"]), FRAME_COUNT)


if __name__ == "__main__":
    unittest.main()

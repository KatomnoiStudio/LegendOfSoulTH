"""Regression tests for the Erlang Flow Skill 1 alpha matte.

Operator: HetCreep
Agent: Codex / primary
Timestamp: 2026-08-09T13:00:00+07:00
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

from PIL import Image


MODULE_PATH = Path(__file__).with_name("import-erlang-flow-skill-1.py")
SPEC = importlib.util.spec_from_file_location("erlang_flow_importer", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load importer at {MODULE_PATH}")
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class AlphaMatteTests(unittest.TestCase):
    def alpha_for(self, rgb: tuple[int, int, int]) -> int:
        image = Image.new("RGB", (1, 1), rgb)
        return IMPORTER.remove_dark_background(image).getchannel("A").getpixel((0, 0))

    def test_dark_background_is_fully_transparent(self) -> None:
        self.assertEqual(self.alpha_for((10, 15, 20)), 0)

    def test_retained_character_shadows_are_not_see_through(self) -> None:
        self.assertGreaterEqual(self.alpha_for((30, 20, 15)), 220)

    def test_retained_neutral_midtones_are_not_see_through(self) -> None:
        self.assertGreaterEqual(self.alpha_for((55, 55, 55)), 220)

    def test_retained_blue_lightning_is_not_see_through(self) -> None:
        self.assertGreaterEqual(self.alpha_for((20, 50, 120)), 220)


if __name__ == "__main__":
    unittest.main()

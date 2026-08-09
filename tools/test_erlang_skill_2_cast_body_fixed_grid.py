"""QC gate for Erlang's six-frame Skill 2 casting body assets."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "characters"
PREVIEW = PUBLIC / "erlang-shen-skill-2-cast-preview"
EXPECTED_SIZE = (800, 640)
EXPECTED_ROOT = [400, 520]


def main() -> None:
    metadata = json.loads((PREVIEW / "fixed-grid-metadata.json").read_text(encoding="utf-8"))
    assert metadata["source_grid"] == [2, 3]
    assert metadata["source_cell_size"] == [512, 512]
    assert metadata["frame_count"] == 6
    assert metadata["output_size"] == [800, 640]
    assert metadata["fixed_grid_only"] is True
    assert metadata["per_frame_crop_or_trim"] is False
    assert metadata["per_frame_scale_or_zoom"] is False
    assert metadata["source_pixels_resampled"] is False
    assert metadata["target_root"] == EXPECTED_ROOT
    assert metadata["source_top_seam_residue_by_frame"] == [0, 0, 11, 11, 0, 0]

    for index in range(6):
        path = PUBLIC / f"erlang-shen-skill-2-cast-{index}.webp"
        assert path.exists(), f"Missing frame {index + 1}"
        image = Image.open(path).convert("RGBA")
        assert image.size == EXPECTED_SIZE, f"Frame {index + 1} has the wrong canvas"
        rgba = np.asarray(image, dtype=np.uint8)
        alpha = rgba[:, :, 3]
        assert alpha.any(), f"Frame {index + 1} is empty"
        assert not (np.any(alpha[0]) or np.any(alpha[-1]) or np.any(alpha[:, 0]) or np.any(alpha[:, -1])), f"Frame {index + 1} is clipped"
        visible = alpha > 0
        red, green, blue = [rgba[:, :, channel].astype(np.int16) for channel in range(3)]
        backing = visible & (green >= 60) & (green >= red + 20) & (green >= blue + 20)
        assert not np.any(backing), f"Frame {index + 1} still has green backing"
        # Ground contact is locked to the same output Y on every complete
        # canvas, matching the runtime's Idle ground anchor.
        assert np.where(alpha > 0)[0].max() == EXPECTED_ROOT[1], f"Frame {index + 1} has an unlocked foot Y"

    # Frame 1's lower left plume must survive the chroma key.  The key accepts
    # only green backing pixels; it must never cut the white/gold feather.
    frame_one = np.asarray(Image.open(PUBLIC / "erlang-shen-skill-2-cast-0.webp").convert("RGBA"), dtype=np.uint8)
    assert frame_one[460, 319, 3] > 0, "Frame 1's lower plume was incorrectly keyed out"

    gif_path = PREVIEW / "preview-animation-6.gif"
    assert gif_path.exists()
    with Image.open(gif_path) as gif:
        assert gif.n_frames == 6, "Animation preview must contain exactly six frames"
    assert (PREVIEW / "preview-all-6.png").exists()
    assert (PREVIEW / "preview-animation.html").exists()
    preview_html = (PREVIEW / "preview-animation.html").read_text(encoding="utf-8")
    assert "RECOVERY" not in preview_html and "IDLE" in preview_html
    assert "cast-body-runtime-aligned" in preview_html
    print("PASS: 6 fixed-grid casting frames are present, transparent, unclipped, and matte-free.")


if __name__ == "__main__":
    main()

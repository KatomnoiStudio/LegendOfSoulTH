"""Build normalized 8-direction Sun Wukong walk frames from five source sheets."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "scripts" / "assets" / "wukong-walk-source"
OUTPUT_DIR = ROOT / "public" / "characters" / "walk"
CANVAS_SIZE = (640, 512)
GRID = (4, 2)
CONTENT_SCALE = 0.8
# Every walk frame must place the supporting foot on this exact scanline.
# The generated sheet used a different bottom margin for each grid row, which
# made the character jump vertically when the animation crossed frame 3 -> 4.
FOOTLINE_Y = 450
BODY_CENTER_X = CANVAS_SIZE[0] // 2
ALPHA_THRESHOLD = 16
MIN_COMPONENT_RATIO = 0.05

SOURCE_DIRECTIONS = ("down", "down-right", "right", "up-right", "up")
MIRRORED_DIRECTIONS = {
    "down-left": "down-right",
    "left": "right",
    "up-left": "up-right",
}


def clean_and_lock_footline(image: Image.Image) -> Image.Image:
    """Remove grid-cell debris and anchor visible pixels to one foot line."""
    pixels = np.array(image.convert("RGBA"))
    alpha = pixels[:, :, 3]
    labels, count = ndimage.label(
        alpha > ALPHA_THRESHOLD,
        structure=np.ones((3, 3), dtype=np.uint8),
    )

    if count > 1:
        component_sizes = np.bincount(labels.ravel())
        largest = component_sizes[1:].max()
        keep = component_sizes >= largest * MIN_COMPONENT_RATIO
        keep[0] = False
        pixels[~keep[labels]] = 0

    cleaned = Image.fromarray(pixels, "RGBA")
    bounds = cleaned.getchannel("A").getbbox()
    if bounds is None:
        return cleaned

    # Anchor the torso, not the full silhouette: feet, tail and staff naturally
    # extend sideways during a stride and would otherwise introduce horizontal
    # jitter even though the canvas size is identical.
    left, top, right, bottom = bounds
    body_top = round(top + (bottom - top) * 0.25)
    body_bottom = round(top + (bottom - top) * 0.62)
    body_alpha = pixels[body_top:body_bottom, :, 3].astype(np.float64)
    column_weights = body_alpha.sum(axis=0)
    total_weight = column_weights.sum()
    body_center = (
        float(np.dot(np.arange(CANVAS_SIZE[0]), column_weights) / total_weight)
        if total_weight > 0
        else (left + right) / 2
    )

    shift_x = round(BODY_CENTER_X - body_center)
    shift_y = FOOTLINE_Y - bounds[3]
    anchored = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    anchored.alpha_composite(cleaned, (shift_x, shift_y))
    return anchored


def split_direction(direction: str) -> None:
    sheet = Image.open(SOURCE_DIR / f"{direction}.png").convert("RGBA")
    cell_width = sheet.width / GRID[0]
    cell_height = sheet.height / GRID[1]
    common_scale = min(
        CANVAS_SIZE[0] / cell_width,
        CANVAS_SIZE[1] / cell_height,
    ) * CONTENT_SCALE

    for index in range(GRID[0] * GRID[1]):
        column = index % GRID[0]
        row = index // GRID[0]
        bounds = (
            round(column * cell_width),
            round(row * cell_height),
            round((column + 1) * cell_width),
            round((row + 1) * cell_height),
        )
        cell = sheet.crop(bounds)
        cell = cell.resize(
            (
                max(1, round(cell.width * common_scale)),
                max(1, round(cell.height * common_scale)),
            ),
            Image.Resampling.LANCZOS,
        )

        canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
        canvas.alpha_composite(
            cell,
            ((CANVAS_SIZE[0] - cell.width) // 2, CANVAS_SIZE[1] - cell.height),
        )
        canvas = clean_and_lock_footline(canvas)
        canvas.save(
            OUTPUT_DIR / f"monkey-walk-{direction}-{index}.png",
            optimize=True,
        )


def mirror_direction(destination: str, source: str) -> None:
    for index in range(GRID[0] * GRID[1]):
        frame = Image.open(
            OUTPUT_DIR / f"monkey-walk-{source}-{index}.png",
        ).convert("RGBA")
        ImageOps.mirror(frame).save(
            OUTPUT_DIR / f"monkey-walk-{destination}-{index}.png",
            optimize=True,
        )


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for direction in SOURCE_DIRECTIONS:
        split_direction(direction)
    for destination, source in MIRRORED_DIRECTIONS.items():
        mirror_direction(destination, source)


if __name__ == "__main__":
    main()

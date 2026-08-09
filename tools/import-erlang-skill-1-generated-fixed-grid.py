"""Build Erlang Shen Skill 1 from four generated 2x2 fixed-grid sheets.

Each complete 627x627 source cell receives one shared resize. A final
complete-canvas translation locks the character root to Idle without cropping,
trimming, or enlarging pose-specific frames.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


GRID = (2, 2)
FRAME_COUNT = 16
OUTPUT_SIZE = (640, 512)
IDLE_CELL_SCALE = 0.807
ROW_SCALES = (IDLE_CELL_SCALE,) * 8
ROW_PASTE_Y = (28,) * 8
SAFETY_BORDER = 3
ALPHA_MATTE_CUTOFF = 32
TARGET_CHARACTER_CENTER_X = 321
TARGET_CHARACTER_BOTTOM = 481
KEY = np.array([255.0, 0.0, 255.0], dtype=np.float32)
# Frame 14 (one-based) received a small detached lightning fragment from the
# neighboring source cell.  This is a fixed-grid spill mask, not a trim.
CROSS_FRAME_SPILL_RECTS: dict[int, tuple[int, int, int, int]] = {13: (110, 425, 140, 460)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("sheets", type=Path, nargs=4)
    parser.add_argument(
        "--recovery-frame",
        type=Path,
        required=True,
        help="One generated full-canvas recovery pose inserted immediately before the final Idle.",
    )
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    return parser.parse_args()


def smoothstep(value: np.ndarray) -> np.ndarray:
    value = np.clip(value, 0.0, 1.0)
    return value * value * (3.0 - 2.0 * value)


def remove_magenta_background(image: Image.Image) -> Image.Image:
    """Remove only magenta-dominant pixels; dark body pixels stay opaque."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    distance = np.max(np.abs(rgb - KEY), axis=2)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    dominance = np.minimum(red, blue) - green
    key_like = (distance <= 40.0) | (dominance >= 24.0)

    distance_alpha = smoothstep((distance - 8.0) / 96.0)
    dominance_alpha = 1.0 - np.clip(dominance / np.maximum(1.0, 255.0 - green), 0.0, 1.0)
    alpha = np.where(key_like, np.minimum(distance_alpha, dominance_alpha), 1.0)
    alpha[alpha < (8.0 / 255.0)] = 0.0

    # Decontaminate only partially transparent edge pixels. Fully opaque art
    # is never recolored, which prevents holes and damage to hair or clothing.
    partial = (alpha > 0.0) & (alpha < 0.99) & key_like
    anchor = green
    rgb[:, :, 0] = np.where(partial, np.minimum(red, anchor), red)
    rgb[:, :, 2] = np.where(partial, np.minimum(blue, anchor), blue)

    rgba = np.dstack((np.rint(rgb).astype(np.uint8), np.rint(alpha * 255.0).astype(np.uint8)))
    return Image.fromarray(rgba, "RGBA")


def checkerboard(size: tuple[int, int], tile: int = 16) -> Image.Image:
    board = Image.new("RGBA", size, (224, 228, 235, 255))
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(174, 181, 193, 255))
    return board


def clear_safety_border(frame: Image.Image) -> None:
    alpha = np.asarray(frame.getchannel("A")).copy()
    # Generated magenta backgrounds can leave a nearly invisible full-cell
    # matte after chroma removal. Force that noise fully transparent while
    # retaining the brighter antialiased character and lightning contours.
    alpha[alpha < ALPHA_MATTE_CUTOFF] = 0
    alpha[:SAFETY_BORDER, :] = 0
    alpha[-SAFETY_BORDER:, :] = 0
    alpha[:, :SAFETY_BORDER] = 0
    alpha[:, -SAFETY_BORDER:] = 0
    frame.putalpha(Image.fromarray(alpha, "L"))


def character_bbox(frame: Image.Image) -> tuple[int, int, int, int]:
    """Measure the largest non-lightning character component."""
    rgba = np.asarray(frame.convert("RGBA"))
    red, green, blue, alpha = [rgba[:, :, channel].astype(np.int16) for channel in range(4)]
    lightning = (blue > red + 18) & (blue > green + 8) & (blue > 125)
    body = (alpha >= 128) & ~lightning
    body = ndimage.binary_opening(body, structure=np.ones((2, 2)))
    labels, _ = ndimage.label(body, structure=np.ones((3, 3)))
    sizes = np.bincount(labels.ravel())
    if len(sizes) <= 1:
        raise ValueError("Could not detect the character body")
    sizes[0] = 0
    y_positions, x_positions = np.where(labels == int(sizes.argmax()))
    return (
        int(x_positions.min()),
        int(y_positions.min()),
        int(x_positions.max() + 1),
        int(y_positions.max() + 1),
    )


def align_character_root(frame: Image.Image) -> Image.Image:
    """Translate, but never resize, a complete attack frame to Idle's root."""
    left, _, right, bottom = character_bbox(frame)
    offset_x = round(TARGET_CHARACTER_CENTER_X - (left + right) / 2)
    offset_y = TARGET_CHARACTER_BOTTOM - bottom
    aligned = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    aligned.alpha_composite(frame, (offset_x, offset_y))
    clear_safety_border(aligned)
    return aligned


def remove_known_cross_frame_spill(frame: Image.Image, frame_index: int) -> Image.Image:
    """Erase only the audited neighboring-cell fragment; do not crop a frame."""
    spill_rect = CROSS_FRAME_SPILL_RECTS.get(frame_index)
    if spill_rect is None:
        return frame
    cleaned = frame.copy()
    cleaned.paste((0, 0, 0, 0), spill_rect)
    return cleaned


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    public_dir = root / "public" / "characters"
    preview_dir = public_dir / "erlang-shen-skill-1-generated-preview"
    public_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    source_sizes: list[list[int]] = []
    cell_sizes: list[list[int]] = []
    for sheet_index, sheet_path in enumerate(args.sheets):
        sheet = Image.open(sheet_path).convert("RGB")
        if sheet.width % GRID[0] or sheet.height % GRID[1]:
            raise ValueError(f"{sheet_path} is not evenly divisible by the fixed 2x2 grid")
        cell_width, cell_height = sheet.width // GRID[0], sheet.height // GRID[1]
        source_sizes.append([sheet.width, sheet.height])
        cell_sizes.append([cell_width, cell_height])

        # Key the whole source sheet before any fixed-grid slicing.
        keyed_sheet = remove_magenta_background(sheet)
        for local_index in range(4):
            row, col = divmod(local_index, GRID[0])
            cell = keyed_sheet.crop(
                (
                    col * cell_width,
                    row * cell_height,
                    (col + 1) * cell_width,
                    (row + 1) * cell_height,
                )
            )
            global_row = sheet_index * 2 + row
            row_scale = ROW_SCALES[global_row]
            scaled_size = (round(cell_width * row_scale), round(cell_height * row_scale))
            scaled = cell.resize(scaled_size, Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
            paste_x = round((OUTPUT_SIZE[0] - scaled_size[0]) / 2)
            frame.alpha_composite(scaled, (paste_x, ROW_PASTE_Y[global_row]))
            clear_safety_border(frame)
            frames.append(frame)

    if len(frames) != FRAME_COUNT:
        raise ValueError(f"Expected {FRAME_COUNT} fixed-grid source frames, got {len(frames)}")

    # The raw recovery is a single full canvas.  It is letterboxed to the same
    # 627x627 source cell as every grid cell and then receives the exact same
    # 0.807 scale.  This is one action-level source normalization, never a
    # bbox-based/per-frame resize or trim.
    recovery_source = Image.open(args.recovery_frame).convert("RGB")
    recovery_source_size = list(recovery_source.size)
    # The built-in generator returned a landscape source canvas.  Normalize it
    # by the fixed grid's vertical cell height, preserving its aspect ratio so
    # its character camera scale matches the square grid cells without any
    # distortion, crop, or pose-specific scaling.
    recovery_cell_height = cell_sizes[0][1]
    recovery_contain_scale = recovery_cell_height / recovery_source.height
    recovery_cell_size = (
        round(recovery_source.width * recovery_contain_scale),
        recovery_cell_height,
    )
    recovery_keyed = remove_magenta_background(recovery_source)
    recovery_contained_size = (
        round(recovery_keyed.width * recovery_contain_scale),
        round(recovery_keyed.height * recovery_contain_scale),
    )
    recovery_cell = Image.new("RGBA", recovery_cell_size, (0, 0, 0, 0))
    recovery_cell.alpha_composite(
        recovery_keyed.resize(recovery_contained_size, Image.Resampling.LANCZOS),
        (
            round((recovery_cell_size[0] - recovery_contained_size[0]) / 2),
            round((recovery_cell_size[1] - recovery_contained_size[1]) / 2),
        ),
    )
    recovery_scaled_size = (
        round(recovery_cell_size[0] * IDLE_CELL_SCALE),
        round(recovery_cell_size[1] * IDLE_CELL_SCALE),
    )
    recovery_frame = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    recovery_frame.alpha_composite(
        recovery_cell.resize(recovery_scaled_size, Image.Resampling.LANCZOS),
        (round((OUTPUT_SIZE[0] - recovery_scaled_size[0]) / 2), round((OUTPUT_SIZE[1] - recovery_scaled_size[1]) / 2)),
    )
    clear_safety_border(recovery_frame)

    # Keep all 16 sprite frames as action/recovery poses.  The battle runtime
    # already changes the entity state to Idle after Skill 1 ends; inserting a
    # baked Idle here makes the preview look like it has an extra frame.
    frames = [*frames[:15], recovery_frame]
    if len(frames) != FRAME_COUNT:
        raise ValueError(f"Expected {FRAME_COUNT} output frames, got {len(frames)}")

    per_frame_normalization_scales: list[float] = []
    normalized_character_bboxes: list[list[int]] = []
    for index, frame in enumerate(frames):
        normalized = remove_known_cross_frame_spill(align_character_root(frame), index)
        frames[index] = normalized
        per_frame_normalization_scales.append(1.0)
        normalized_character_bboxes.append(list(character_bbox(normalized)))

    for index, frame in enumerate(frames):
        frame.save(public_dir / f"erlang-shen-skill-1-{index}.webp", "WEBP", lossless=True, method=6)
        frame.save(preview_dir / f"frame-{index:02d}.png", optimize=True)

    for stale_index in range(FRAME_COUNT, 24):
        stale = public_dir / f"erlang-shen-skill-1-{stale_index}.webp"
        if stale.exists():
            stale.unlink()

    preview_frames: list[Image.Image] = []
    for frame in frames:
        board = checkerboard(OUTPUT_SIZE)
        board.alpha_composite(frame)
        preview_frames.append(board.convert("RGB"))
    preview_frames[0].save(
        preview_dir / "erlang-shen-skill-1-generated-preview-16.gif",
        save_all=True,
        append_images=preview_frames[1:],
        duration=[90] * FRAME_COUNT,
        disposal=2,
        optimize=False,
    )

    columns, rows = 4, 4
    thumb_size, gutter, label_height = (320, 256), 8, 22
    contact = Image.new(
        "RGB",
        (
            columns * thumb_size[0] + (columns + 1) * gutter,
            rows * (thumb_size[1] + label_height) + (rows + 1) * gutter,
        ),
        (28, 31, 38),
    )
    draw = ImageDraw.Draw(contact)
    for index, preview in enumerate(preview_frames):
        row, col = divmod(index, columns)
        x = gutter + col * (thumb_size[0] + gutter)
        y = gutter + row * (thumb_size[1] + label_height + gutter)
        draw.text((x + 3, y + 3), f"FRAME {index + 1:02d}", fill=(255, 255, 255))
        contact.paste(preview.resize(thumb_size, Image.Resampling.LANCZOS), (x, y + label_height))
    contact.save(preview_dir / "erlang-shen-skill-1-generated-preview-all-16.png", optimize=True)

    metadata = {
        "source_sheet_count": 4,
        "source_sizes": source_sizes,
        "source_grid_per_sheet": list(GRID),
        "source_cell_sizes": cell_sizes,
        "recovery_source_canvas_size": recovery_source_size,
        "recovery_source_canvas_normalized_to": list(recovery_cell_size),
        "recovery_source_canvas_scale_strategy": "contain-uniform",
        "recovery_source_canvas_contain_scale": recovery_contain_scale,
        "recovery_uses_shared_cell_scale": True,
        "output_cell_size": list(OUTPUT_SIZE),
        "frame_count": FRAME_COUNT,
        "whole_row_scales": list(ROW_SCALES),
        "whole_row_paste_x": [
            round((OUTPUT_SIZE[0] - round(cell_sizes[row // 2][0] * ROW_SCALES[row])) / 2)
            for row in range(len(ROW_SCALES))
        ],
        "whole_row_paste_y": list(ROW_PASTE_Y),
        "shared_safety_border": SAFETY_BORDER,
        "alpha_matte_cutoff": ALPHA_MATTE_CUTOFF,
        "per_frame_crop_or_trim": False,
        "per_frame_scale_and_anchor": False,
        "per_frame_translation_to_shared_root": True,
        "per_frame_normalization_scales": per_frame_normalization_scales,
        "normalized_character_bboxes": normalized_character_bboxes,
        "target_character_geometry": {
            "shared_cell_scale": IDLE_CELL_SCALE,
            "bottom": TARGET_CHARACTER_BOTTOM - 1,
            "center_x": TARGET_CHARACTER_CENTER_X,
        },
        "canonical_idle_frames": [],
        "cross_frame_spill_removed": {
            str(frame_index + 1): list(rect) for frame_index, rect in CROSS_FRAME_SPILL_RECTS.items()
        },
    }
    (preview_dir / "fixed-grid-metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

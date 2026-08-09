"""Import the operator-supplied 4x4 Erlang sheet as runtime Skill 1 frames.

The source is split as a strict fixed grid. Every frame receives the same
whole-cell scale and placement; there is no per-frame crop, trim, resize, or
re-anchoring.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROWS = 4
COLS = 4
FRAME_COUNT = ROWS * COLS
OUTPUT_SIZE = (640, 512)
SHARED_SCALE = 1.72
PASTE_X = 9
ROW_PASTE_Y = (50, 35, 35, 75)
SAFETY_BORDER = 4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    return parser.parse_args()


def remove_dark_background(image: Image.Image) -> Image.Image:
    """Convert the common dark backdrop to alpha with one shared formula."""
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    value = rgb.max(axis=2)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]

    # The source backdrop peaks around 20-30 while the character and lightning
    # are substantially brighter. Blue-dominant lightning receives a slightly
    # lower threshold so its thin outer branches survive.
    # The previous gradual neutral ramp made dark cloth and hair partially
    # transparent, which appeared as checkerboard holes in-game. Pixels above
    # the measured background ceiling use a solid matte; resizing later adds
    # the only edge antialiasing required by the runtime sprite.
    normal_alpha = (value >= 35.0).astype(np.float32)
    warm_dominance = red - blue
    warm_alpha = (
        np.clip(warm_dominance / 6.0, 0.0, 1.0)
        * np.clip((value - 12.0) / 18.0, 0.0, 1.0)
    )
    blue_dominance = blue - np.maximum(red, green)
    lightning_alpha = np.where(
        blue_dominance > 7.0,
        np.clip((blue - 30.0) / 35.0, 0.0, 1.0),
        0.0,
    )
    alpha = np.maximum.reduce((normal_alpha, warm_alpha, lightning_alpha))
    alpha = np.power(alpha, 0.82)

    rgba = np.dstack((rgb.astype(np.uint8), np.rint(alpha * 255).astype(np.uint8)))
    return Image.fromarray(rgba, "RGBA")


def checkerboard(size: tuple[int, int], tile: int = 16) -> Image.Image:
    width, height = size
    board = Image.new("RGBA", size, (224, 228, 235, 255))
    draw = ImageDraw.Draw(board)
    for y in range(0, height, tile):
        for x in range(0, width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(174, 181, 193, 255))
    return board


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    source = Image.open(args.input).convert("RGB")
    cell_width = (source.width + COLS - 1) // COLS
    cell_height = (source.height + ROWS - 1) // ROWS
    padded_size = (cell_width * COLS, cell_height * ROWS)

    padded = Image.new("RGB", padded_size, (5, 10, 16))
    padded.paste(source, (0, 0))

    raw_path = root / "assets/raw/characters/erlang-shen-skill-1-flow-4x4.png"
    public_dir = root / "public/characters"
    preview_dir = public_dir / "erlang-shen-skill-1-flow-preview"
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    padded.save(raw_path, optimize=True)

    scaled_size = (
        round(cell_width * SHARED_SCALE),
        round(cell_height * SHARED_SCALE),
    )
    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        row, col = divmod(index, COLS)
        cell = padded.crop(
            (
                col * cell_width,
                row * cell_height,
                (col + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        transparent = remove_dark_background(cell)
        scaled = transparent.resize(scaled_size, Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
        frame.alpha_composite(scaled, (PASTE_X, ROW_PASTE_Y[row]))
        # A shared four-pixel transparent safety border guarantees that no
        # antialiasing residue from the generated sheet reaches a runtime edge.
        alpha = np.asarray(frame.getchannel("A")).copy()
        alpha[:SAFETY_BORDER, :] = 0
        alpha[-SAFETY_BORDER:, :] = 0
        alpha[:, :SAFETY_BORDER] = 0
        alpha[:, -SAFETY_BORDER:] = 0
        frame.putalpha(Image.fromarray(alpha, "L"))
        output_path = public_dir / f"erlang-shen-skill-1-{index}.webp"
        frame.save(output_path, "WEBP", lossless=True, method=6)
        frame.save(preview_dir / f"frame-{index:02d}.png", optimize=True)
        frames.append(frame)

    # The former Skill 1 had 24 frames. Remove only the now-unreferenced tail
    # so a directory scan cannot mistake this delivery for a 24-frame action.
    removed_old_tail: list[str] = []
    for index in range(FRAME_COUNT, 24):
        stale = public_dir / f"erlang-shen-skill-1-{index}.webp"
        if stale.exists():
            stale.unlink()
            removed_old_tail.append(stale.name)

    removed_legacy_previews: list[str] = []
    legacy_preview_names = [
        "erlang-shen-skill-1-preview-1.png",
        "erlang-shen-skill-1-preview-2.png",
        "erlang-shen-skill-1-preview-3.png",
        "erlang-shen-skill-1-preview-4.png",
        "erlang-shen-skill-1-preview-24-frames.gif",
        "erlang-shen-skill-1-preview-all-24.png",
    ]
    for name in legacy_preview_names:
        stale_preview = public_dir / name
        if stale_preview.exists():
            stale_preview.unlink()
            removed_legacy_previews.append(name)

    gif_frames: list[Image.Image] = []
    for frame in frames:
        board = checkerboard(OUTPUT_SIZE)
        board.alpha_composite(frame)
        gif_frames.append(board.convert("RGB"))
    gif_frames[0].save(
        preview_dir / "erlang-shen-skill-1-flow-preview-16.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=[100] * 15 + [300],
        loop=0,
        disposal=2,
        optimize=False,
    )

    thumb_size = (320, 256)
    gutter = 8
    label_height = 22
    contact = Image.new(
        "RGB",
        (
            COLS * thumb_size[0] + (COLS + 1) * gutter,
            ROWS * (thumb_size[1] + label_height) + (ROWS + 1) * gutter,
        ),
        (28, 31, 38),
    )
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(frames):
        row, col = divmod(index, COLS)
        x = gutter + col * (thumb_size[0] + gutter)
        y = gutter + row * (thumb_size[1] + label_height + gutter)
        draw.text((x + 3, y + 3), f"FRAME {index + 1:02d}", fill=(255, 255, 255))
        board = checkerboard(OUTPUT_SIZE)
        board.alpha_composite(frame)
        contact.paste(board.convert("RGB").resize(thumb_size, Image.Resampling.LANCZOS), (x, y + label_height))
    contact.save(preview_dir / "erlang-shen-skill-1-flow-preview-all-16.png", optimize=True)

    alpha_edge_frames: list[int] = []
    opaque_pixel_counts: list[int] = []
    for index, frame in enumerate(frames):
        alpha = np.asarray(frame.getchannel("A"))
        opaque_pixel_counts.append(int(np.count_nonzero(alpha)))
        if np.any(alpha[0, :]) or np.any(alpha[-1, :]) or np.any(alpha[:, 0]) or np.any(alpha[:, -1]):
            alpha_edge_frames.append(index)

    metadata = {
        "source_size": list(source.size),
        "padded_size": list(padded_size),
        "grid": [COLS, ROWS],
        "source_cell_size": [cell_width, cell_height],
        "output_cell_size": list(OUTPUT_SIZE),
        "frame_count": FRAME_COUNT,
        "shared_scale": SHARED_SCALE,
        "whole_row_placements": [[PASTE_X, y] for y in ROW_PASTE_Y],
        "shared_safety_border": SAFETY_BORDER,
        "per_frame_crop_trim_scale_or_anchor": False,
        "source_padding": [padded_size[0] - source.width, padded_size[1] - source.height],
        "alpha_edge_frames": alpha_edge_frames,
        "empty_frames": [index for index, count in enumerate(opaque_pixel_counts) if count == 0],
        "removed_old_tail": removed_old_tail,
        "removed_legacy_previews": removed_legacy_previews,
    }
    (preview_dir / "fixed-grid-metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

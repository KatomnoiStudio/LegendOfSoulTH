"""Import Erlang Shen Skill 2 from the supplied 4x3 source sheet.

The 362x362 source cells are always sliced by their fixed grid.  Every cell
receives the same high-quality enlargement; only a whole-canvas translation
locks its ground root to the canonical Idle world anchor.  No source or
output frame is auto-cropped, trimmed, or individually resized.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


GRID_COLUMNS = 4
GRID_ROWS = 3
CELL_SIZE = 362
FRAME_COUNT = GRID_COLUMNS * GRID_ROWS
# A taller action canvas retains the supplied effect tips after the shared
# Idle-size enlargement. Runtime geometry maps each texture pixel to the
# same world size as the 640x512 Idle canvas, so Erlang himself remains the
# exact same displayed size while the effect is not clipped.
OUTPUT_SIZE = (800, 760)

# Measured against source frame 1's non-background Erlang silhouette
# (203 px) and the canonical Idle body height (370 px).  This is one shared
# upscaling transform for the entire action -- never a per-frame zoom.
SHARED_SCALE = 370 / 203
TARGET_ROOT_X = 400
TARGET_FOOT_Y = 620
SOURCE_ROOT_X = (164, 171, 177, 180, 151, 157, 170, 174, 174, 167, 169, 169)
# These are manually audited foot contacts in the fixed source cells.  They
# translate complete canvases only, so feet share Idle's Y without trimming a
# pose or changing its scale.
SOURCE_FOOT_Y = (325, 322, 324, 323, 280, 280, 280, 280, 260, 260, 260, 267)

GRID_BORDER = 6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("assets/raw/characters/erlang-shen-skill-2-green-source-4x3.png"),
    )
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    return parser.parse_args()


def remove_green_matte(cell: Image.Image) -> Image.Image:
    """Remove the green chroma backdrop without cutting dark hair or gold effects."""
    rgb = np.asarray(cell.convert("RGB"), dtype=np.uint8).copy()
    red, green, blue = [rgb[:, :, channel].astype(np.int16) for channel in range(3)]
    # Green is intentionally absent from Erlang, his ivory/gold costume, the
    # spear, and the Skill 2 effect.  A single chroma hue makes this a clean
    # binary matte; it does not threshold dark artwork and cannot create holes.
    green_matte = (green >= 45) & (green >= red + 10) & (green >= blue + 10)
    alpha = np.where(green_matte, 0, 255).astype(np.uint8)
    # The reference edit retained a few old magenta edge pixels. They belong
    # to the former backing matte, never to the white/gold Skill 2 artwork.
    magenta_artifact = (np.minimum(red, blue) >= green + 10)
    alpha[magenta_artifact] = 0
    alpha[:GRID_BORDER, :] = 0
    alpha[-GRID_BORDER:, :] = 0
    alpha[:, :GRID_BORDER] = 0
    alpha[:, -GRID_BORDER:] = 0
    return Image.fromarray(np.dstack((rgb, alpha)), "RGBA")


def checkerboard(size: tuple[int, int], tile: int = 16) -> Image.Image:
    board = Image.new("RGBA", size, (224, 228, 235, 255))
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(174, 181, 193, 255))
    return board


def resize_rgba_without_matte_bleed(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resample premultiplied alpha so transparent chroma never bleeds into edges."""
    rgba = np.asarray(image, dtype=np.uint8)
    alpha = rgba[:, :, 3:4].astype(np.uint16)
    premultiplied = rgba.copy()
    premultiplied[:, :, :3] = ((rgba[:, :, :3].astype(np.uint16) * alpha) // 255).astype(np.uint8)
    resized = np.asarray(
        Image.fromarray(premultiplied, "RGBA").resize(size, Image.Resampling.LANCZOS), dtype=np.uint8
    ).copy()
    output_alpha = resized[:, :, 3:4].astype(np.uint16)
    visible = output_alpha > 0
    rgb = np.zeros_like(resized[:, :, :3])
    rgb[visible[:, :, 0]] = np.minimum(
        255,
        (resized[:, :, :3].astype(np.uint32)[visible[:, :, 0]] * 255)
        // output_alpha[visible[:, :, 0]],
    ).astype(np.uint8)
    resized[:, :, :3] = rgb
    return Image.fromarray(resized, "RGBA")


def frame_for_cell(cell: Image.Image, index: int) -> Image.Image:
    """Scale and translate a complete source cell; no content bounds are read."""
    keyed = remove_green_matte(cell)
    scaled_size = (round(CELL_SIZE * SHARED_SCALE), round(CELL_SIZE * SHARED_SCALE))
    scaled = resize_rgba_without_matte_bleed(keyed, scaled_size)
    frame = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    paste_x = round(TARGET_ROOT_X - SOURCE_ROOT_X[index] * SHARED_SCALE)
    paste_y = round(TARGET_FOOT_Y - SOURCE_FOOT_Y[index] * SHARED_SCALE)
    frame.alpha_composite(scaled, (paste_x, paste_y))
    rgba = np.asarray(frame).copy()
    red, green, blue = [rgba[:, :, channel].astype(np.int16) for channel in range(3)]
    green_matte = (green >= 45) & (green >= red + 10) & (green >= blue + 10)
    rgba[green_matte, 3] = 0
    magenta_artifact = np.minimum(red, blue) >= green + 10
    rgba[magenta_artifact, 3] = 0
    frame = Image.fromarray(rgba, "RGBA")
    return frame


def assert_output_frame(frame: Image.Image, index: int) -> None:
    alpha = np.asarray(frame.getchannel("A"), dtype=np.uint8)
    if not alpha.any():
        raise ValueError(f"Frame {index + 1} is empty")
    # Any non-transparent output edge would mean an actual source pixel got
    # clipped after the shared-scale placement; fail rather than ship it.
    if np.any(alpha[0]) or np.any(alpha[-1]) or np.any(alpha[:, 0]) or np.any(alpha[:, -1]):
        raise ValueError(f"Frame {index + 1} touches the output edge")


def write_preview_html(preview_dir: Path) -> None:
    urls = ",\n".join(
        f"  '../erlang-shen-skill-2-{index}.webp?v=20260809-skill2-qc-pass'"
        for index in range(FRAME_COUNT)
    )
    html = f"""<!doctype html>
<html lang=\"th\"><meta charset=\"utf-8\"><title>Erlang Skill 2 Preview</title>
<style>body{{margin:0;background:#171b22;color:#fff;font:16px system-ui;text-align:center}}main{{max-width:900px;margin:24px auto}}img{{width:800px;max-width:100%;background:repeating-conic-gradient(#d7dde5 0 25%,#b0b8c5 0 50%) 50%/32px 32px}}button{{margin:8px;padding:8px 14px}}</style>
<main><h1>Skill 2 — 12 Fixed-Grid Frames</h1><p id=\"label\"></p><img id=\"frame\" alt=\"Erlang Skill 2 animation preview\"><br><button id=\"prev\">ก่อนหน้า</button><button id=\"play\">หยุด</button><button id=\"next\">ถัดไป</button></main>
<script>const frames=[\n{urls}\n];let i=0,playing=true;const image=document.querySelector('#frame'),label=document.querySelector('#label');function show(){{image.src=frames[i];label.textContent=`FRAME ${{String(i+1).padStart(2,'0')}} / ${{frames.length}}`;}}function step(){{i=(i+1)%frames.length;show();}}let timer=setInterval(()=>{{if(playing)step()}},90);document.querySelector('#prev').onclick=()=>{{i=(i+frames.length-1)%frames.length;show()}};document.querySelector('#next').onclick=step;document.querySelector('#play').onclick=e=>{{playing=!playing;e.target.textContent=playing?'หยุด':'เล่น'}};show();</script>"""
    (preview_dir / "preview-animation.html").write_text(html, encoding="utf-8")


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    source = Image.open(root / args.source).convert("RGB")
    expected_size = (CELL_SIZE * GRID_COLUMNS, CELL_SIZE * GRID_ROWS)
    if source.size != expected_size:
        raise ValueError(f"Expected a {expected_size[0]}x{expected_size[1]} fixed-grid sheet, got {source.size}")

    public_dir = root / "public" / "characters"
    preview_dir = public_dir / "erlang-shen-skill-2-preview"
    public_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        row, column = divmod(index, GRID_COLUMNS)
        cell = source.crop(
            (column * CELL_SIZE, row * CELL_SIZE, (column + 1) * CELL_SIZE, (row + 1) * CELL_SIZE)
        )
        frame = frame_for_cell(cell, index)
        assert_output_frame(frame, index)
        frame.save(public_dir / f"erlang-shen-skill-2-{index}.webp", "WEBP", lossless=True, method=6)
        frame.save(preview_dir / f"frame-{index:02d}.png", optimize=True)
        frames.append(frame)

    preview_frames = []
    for frame in frames:
        board = checkerboard(OUTPUT_SIZE)
        board.alpha_composite(frame)
        preview_frames.append(board.convert("RGB"))
    preview_frames[0].save(
        preview_dir / "erlang-shen-skill-2-preview-12.gif",
        save_all=True,
        append_images=preview_frames[1:],
        duration=[90] * FRAME_COUNT,
        disposal=2,
        optimize=False,
    )

    thumb, gutter, label_height = (300, 285), 8, 24
    contact = Image.new("RGB", (4 * thumb[0] + 5 * gutter, 3 * (thumb[1] + label_height) + 4 * gutter), (28, 31, 38))
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(preview_frames):
        row, column = divmod(index, 4)
        x = gutter + column * (thumb[0] + gutter)
        y = gutter + row * (thumb[1] + label_height + gutter)
        draw.text((x + 4, y + 4), f"FRAME {index + 1:02d}", fill=(255, 255, 255))
        contact.paste(frame.resize(thumb, Image.Resampling.LANCZOS), (x, y + label_height))
    contact.save(preview_dir / "erlang-shen-skill-2-preview-all-12.png", optimize=True)
    write_preview_html(preview_dir)

    metadata = {
        "source": str(args.source).replace("\\", "/"),
        "source_size": list(source.size),
        "source_grid": [GRID_COLUMNS, GRID_ROWS],
        "source_cell_size": [CELL_SIZE, CELL_SIZE],
        "output_size": list(OUTPUT_SIZE),
        "frame_count": FRAME_COUNT,
        "shared_scale": SHARED_SCALE,
        "scale_strategy": "one-uniform-high-quality-upscale-for-all-frames",
        "per_frame_crop_or_trim": False,
        "per_frame_scale_or_zoom": False,
        "per_frame_whole_canvas_translation_only": True,
        "target_root": [TARGET_ROOT_X, TARGET_FOOT_Y],
        "source_root_x": list(SOURCE_ROOT_X),
        "source_foot_y": list(SOURCE_FOOT_Y),
        "webp": {"lossless": True},
        "matte_key": {
            "type": "green chroma hue with inherited magenta-artifact cleanup",
            "transparent_when": "green>=45, green>=red+10, green>=blue+10; or min(red,blue)>=green+10",
        },
        "grid_border_cleared_px": GRID_BORDER,
    }
    (preview_dir / "fixed-grid-metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

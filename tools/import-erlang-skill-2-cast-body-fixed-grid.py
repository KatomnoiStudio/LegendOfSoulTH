"""Build Erlang's six-frame casting body animation from a strict 2x3 grid.

This importer never finds a silhouette bounds, crops a frame, or changes an
individual frame's scale.  The source cells stay at native resolution; a
single renderer pixel scale makes the larger source character exactly match
Idle in-world.  Only whole-cell translations lock each pose's foot root.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


GRID_COLUMNS = 2
GRID_ROWS = 3
CELL_SIZE = 512
FRAME_COUNT = GRID_COLUMNS * GRID_ROWS
OUTPUT_SIZE = (800, 640)

# Native source pixels are retained to avoid a quality-losing downscale.  The
# battle renderer maps every output pixel by this one shared factor, measured
# from frame 1's 454 px body to Idle's 370 px body.
RENDER_PIXEL_SCALE = 370 / 454
TARGET_ROOT_X = 400
TARGET_FOOT_Y = 520
# Hand-audited face centres and lowest grounded body pixels in each fixed
# source cell.  Every value is used only to translate the complete canvas:
# no source content is cropped, rescaled, or individually zoomed.
SOURCE_ROOT_X = (298, 244, 323, 247, 301, 233)
SOURCE_FOOT_Y = (509, 509, 488, 491, 465, 473)
GRID_BORDER = 2
# Frames 3–4 contain only a detached carry-over fragment in their first
# eleven source rows.  Frames 5–6 use that margin for real plume tips and
# must retain it.  This is deterministic source-seam cleanup, never a crop.
SOURCE_TOP_SEAM_RESIDUE_BY_FRAME = (0, 0, 11, 11, 0, 0)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("assets/raw/characters/erlang-shen-skill-2-cast-body-green-source-2x3.png"),
    )
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    return parser.parse_args()


def is_green_backing(red: np.ndarray, green: np.ndarray, blue: np.ndarray) -> np.ndarray:
    """Recognise the supplied green chroma backing and its edge blend only."""
    return (green >= 60) & (green >= red + 20) & (green >= blue + 20)


def remove_green_matte(cell: Image.Image, index: int) -> Image.Image:
    """Key green alone; no costume or feather colour is in the green range."""
    rgba = np.asarray(cell.convert("RGB"), dtype=np.uint8)
    red, green, blue = [rgba[:, :, channel].astype(np.int16) for channel in range(3)]
    green_matte = is_green_backing(red, green, blue)
    alpha = np.where(green_matte, 0, 255).astype(np.uint8)
    alpha[:GRID_BORDER, :] = 0
    alpha[-GRID_BORDER:, :] = 0
    alpha[:, :GRID_BORDER] = 0
    alpha[:, -GRID_BORDER:] = 0
    seam_rows = SOURCE_TOP_SEAM_RESIDUE_BY_FRAME[index]
    if seam_rows:
        alpha[:seam_rows, :] = 0
    return Image.fromarray(np.dstack((rgba, alpha)), "RGBA")


def frame_for_cell(cell: Image.Image, index: int) -> Image.Image:
    """Place one untrimmed, native-resolution source cell on a common canvas."""
    frame = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    paste_x = TARGET_ROOT_X - SOURCE_ROOT_X[index]
    paste_y = TARGET_FOOT_Y - SOURCE_FOOT_Y[index]
    frame.alpha_composite(remove_green_matte(cell, index), (paste_x, paste_y))
    return frame


def assert_output_frame(frame: Image.Image, index: int) -> None:
    rgba = np.asarray(frame, dtype=np.uint8)
    alpha = rgba[:, :, 3]
    if not alpha.any():
        raise ValueError(f"Frame {index + 1} is empty")
    if np.any(alpha[0]) or np.any(alpha[-1]) or np.any(alpha[:, 0]) or np.any(alpha[:, -1]):
        raise ValueError(f"Frame {index + 1} clips a non-transparent output edge")
    visible = alpha > 0
    red, green, blue = [rgba[:, :, channel].astype(np.int16) for channel in range(3)]
    backing = visible & is_green_backing(red, green, blue)
    if np.any(backing):
        raise ValueError(f"Frame {index + 1} retains green backing pixels")


def checkerboard(size: tuple[int, int], tile: int = 16) -> Image.Image:
    board = Image.new("RGBA", size, (224, 228, 235, 255))
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=(174, 181, 193, 255))
    return board


def write_preview_html(preview_dir: Path) -> None:
    # The browser preview emulates the exact world-space mapping used by
    # EntitySprite: Idle's 640px canvas is displayed at 800px, while cast
    # pixels use the single Idle-derived renderer scale.  Both visible feet
    # land on the same preview ground line (Y=600).
    preview_idle_scale = OUTPUT_SIZE[0] / 640
    preview_cast_scale = preview_idle_scale * RENDER_PIXEL_SCALE
    preview_cast_left = TARGET_ROOT_X - TARGET_ROOT_X * preview_cast_scale
    preview_cast_top = 480 * preview_idle_scale - TARGET_FOOT_Y * preview_cast_scale
    cast_frames = ",\n".join(
        f"  {{ url: '../erlang-shen-skill-2-cast-{index}.webp?v=20260809-cast-body-runtime-aligned', label: 'CAST {index + 1:02d} / 06', duration: 100, kind: 'cast' }}"
        for index in range(FRAME_COUNT)
    )
    html = f"""<!doctype html>
<html lang=\"th\"><meta charset=\"utf-8\"><title>Erlang Skill 2 — Casting Preview</title>
<style>body{{margin:0;background:#171b22;color:#fff;font:16px system-ui;text-align:center}}main{{max-width:900px;margin:24px auto}}.stage{{width:800px;height:640px;max-width:100%;margin:auto;position:relative;overflow:hidden;background:repeating-conic-gradient(#d7dde5 0 25%,#b0b8c5 0 50%) 50%/32px 32px}}.stage img{{position:absolute;inset:0;width:800px;height:640px}}.stage img.cast{{transform:translate({preview_cast_left:.6f}px,{preview_cast_top:.6f}px) scale({preview_cast_scale:.9f});transform-origin:top left}}.stage img.idle{{transform:none}}button{{margin:8px;padding:8px 14px}}</style>
<main><h1>Skill 2 — ร่ายคาถา 6 เฟรม → Idle</h1><p id=\"label\"></p><div class=\"stage\"><img id=\"frame\" alt=\"Erlang casting then idle preview\"></div><br><button id=\"prev\">ก่อนหน้า</button><button id=\"play\">หยุด</button><button id=\"next\">ถัดไป</button></main>
<script>const frames=[\n{cast_frames},\n  {{ url: '../erlang-shen-v6-idle-0.webp?v=20260809-cast-body-runtime-aligned', label: 'IDLE', duration: 900, kind: 'idle' }}\n];let i=0,playing=true,timer;const image=document.querySelector('#frame'),label=document.querySelector('#label');function show(){{image.src=frames[i].url;image.className=frames[i].kind;label.textContent=frames[i].label;}}function step(){{i=(i+1)%frames.length;show();}}function tick(){{clearTimeout(timer);if(playing)timer=setTimeout(()=>{{step();tick()}},frames[i].duration)}}document.querySelector('#prev').onclick=()=>{{i=(i+frames.length-1)%frames.length;show();tick()}};document.querySelector('#next').onclick=()=>{{step();tick()}};document.querySelector('#play').onclick=e=>{{playing=!playing;e.target.textContent=playing?'หยุด':'เล่น';tick()}};show();tick();</script>"""
    (preview_dir / "preview-animation.html").write_text(html, encoding="utf-8")


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    source = Image.open(root / args.source).convert("RGB")
    expected_size = (CELL_SIZE * GRID_COLUMNS, CELL_SIZE * GRID_ROWS)
    if source.size != expected_size:
        raise ValueError(f"Expected {expected_size[0]}x{expected_size[1]} fixed grid, got {source.size}")

    public_dir = root / "public" / "characters"
    preview_dir = public_dir / "erlang-shen-skill-2-cast-preview"
    public_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)

    preview_frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        row, column = divmod(index, GRID_COLUMNS)
        cell = source.crop((column * CELL_SIZE, row * CELL_SIZE, (column + 1) * CELL_SIZE, (row + 1) * CELL_SIZE))
        frame = frame_for_cell(cell, index)
        assert_output_frame(frame, index)
        frame.save(public_dir / f"erlang-shen-skill-2-cast-{index}.webp", "WEBP", lossless=True, method=6)
        frame.save(preview_dir / f"frame-{index:02d}.png", optimize=True)
        board = checkerboard(OUTPUT_SIZE)
        board.alpha_composite(frame)
        preview_frames.append(board.convert("RGB"))

    preview_frames[0].save(preview_dir / "preview-animation-6.gif", save_all=True, append_images=preview_frames[1:], duration=[120] * FRAME_COUNT, disposal=2, optimize=False)
    thumb, gutter, label_height = (380, 304), 10, 26
    contact = Image.new("RGB", (2 * thumb[0] + 3 * gutter, 3 * (thumb[1] + label_height) + 4 * gutter), (28, 31, 38))
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(preview_frames):
        row, column = divmod(index, GRID_COLUMNS)
        x = gutter + column * (thumb[0] + gutter)
        y = gutter + row * (thumb[1] + label_height + gutter)
        draw.text((x + 5, y + 5), f"FRAME {index + 1:02d}", fill=(255, 255, 255))
        contact.paste(frame.resize(thumb, Image.Resampling.LANCZOS), (x, y + label_height))
    contact.save(preview_dir / "preview-all-6.png", optimize=True)
    write_preview_html(preview_dir)

    metadata = {
        "source": str(args.source).replace("\\\\", "/"),
        "source_size": list(source.size),
        "source_grid": [GRID_COLUMNS, GRID_ROWS],
        "source_cell_size": [CELL_SIZE, CELL_SIZE],
        "frame_count": FRAME_COUNT,
        "output_size": list(OUTPUT_SIZE),
        "fixed_grid_only": True,
        "per_frame_crop_or_trim": False,
        "per_frame_scale_or_zoom": False,
        "source_pixels_resampled": False,
        "renderer_shared_pixel_scale": RENDER_PIXEL_SCALE,
        "target_root": [TARGET_ROOT_X, TARGET_FOOT_Y],
        "source_root_x": list(SOURCE_ROOT_X),
        "source_foot_y": list(SOURCE_FOOT_Y),
        "source_top_seam_residue_by_frame": list(SOURCE_TOP_SEAM_RESIDUE_BY_FRAME),
        "matte_key": "green chroma backing only",
    }
    (preview_dir / "fixed-grid-metadata.json").write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False))


if __name__ == "__main__":
    main()

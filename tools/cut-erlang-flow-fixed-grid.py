"""Split a supplied Erlang sheet into an exact fixed grid without trimming frames."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--rows", type=int, default=4)
    parser.add_argument("--cols", type=int, default=4)
    parser.add_argument("--duration", type=int, default=140)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = Image.open(args.input).convert("RGB")
    cell_width = (source.width + args.cols - 1) // args.cols
    cell_height = (source.height + args.rows - 1) // args.rows
    padded_width = cell_width * args.cols
    padded_height = cell_height * args.rows

    # Padding is added only to make every fixed-grid cell identical. No source
    # pixel is cropped, trimmed, rescaled, or re-anchored.
    padded = Image.new("RGB", (padded_width, padded_height), (5, 10, 16))
    padded.paste(source, (0, 0))

    args.output.mkdir(parents=True, exist_ok=True)
    frames: list[Image.Image] = []
    for index in range(args.rows * args.cols):
        row, col = divmod(index, args.cols)
        left = col * cell_width
        top = row * cell_height
        frame = padded.crop((left, top, left + cell_width, top + cell_height))
        frame.save(args.output / f"frame-{index:02d}.png", optimize=True)
        frames.append(frame)

    frames[0].save(
        args.output / "erlang-flow-preview-16-frames.gif",
        save_all=True,
        append_images=frames[1:],
        duration=[args.duration] * 15 + [args.duration * 3],
        loop=0,
        disposal=2,
        optimize=False,
    )

    gutter = 8
    label_height = 24
    preview = Image.new(
        "RGB",
        (
            args.cols * cell_width + (args.cols + 1) * gutter,
            args.rows * (cell_height + label_height) + (args.rows + 1) * gutter,
        ),
        (28, 31, 38),
    )
    draw = ImageDraw.Draw(preview)
    for index, frame in enumerate(frames):
        row, col = divmod(index, args.cols)
        x = gutter + col * (cell_width + gutter)
        y = gutter + row * (cell_height + label_height + gutter)
        draw.text((x + 4, y + 4), f"FRAME {index + 1:02d}", fill=(255, 255, 255))
        preview.paste(frame, (x, y + label_height))
    preview.save(args.output / "erlang-flow-preview-all-16.png", optimize=True)

    metadata = {
        "source": str(args.input),
        "source_size": [source.width, source.height],
        "padded_size": [padded_width, padded_height],
        "grid": [args.cols, args.rows],
        "cell_size": [cell_width, cell_height],
        "frame_count": len(frames),
        "crop_or_trim": False,
        "resize": False,
        "padding": {
            "right": padded_width - source.width,
            "bottom": padded_height - source.height,
        },
    }
    (args.output / "fixed-grid-metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(metadata, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

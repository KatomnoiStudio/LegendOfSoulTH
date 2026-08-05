"""Split generated 4x2 turnaround sheets into normalized transparent game frames."""

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "characters" / "turnaround"
SOURCE_DIR = ROOT / "scripts" / "assets" / "turnaround-source"
CANVAS_SIZE = (640, 512)
GRID = (4, 2)
CONTENT_SCALE = 0.8

SHEETS = {
    "monkey": SOURCE_DIR / "monkey-turn-sheet.png",
    "pigsy": SOURCE_DIR / "pigsy-turn-sheet.png",
    "tripitaka": SOURCE_DIR / "tripitaka-turn-sheet.png",
}


def normalize_single(source: Path, destination: Path, target_height: int = 318) -> None:
    image = Image.open(source).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"No visible subject found in {source}")

    subject = image.crop(bbox)
    scale = target_height / subject.height
    subject = subject.resize(
        (max(1, round(subject.width * scale)), target_height),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    x = (CANVAS_SIZE[0] - subject.width) // 2
    # Match the established idle-frame foot line at y ~= 474.
    y = 474 - subject.height
    canvas.alpha_composite(subject, (x, y))
    canvas.save(destination, optimize=True)


def split_sheet(prefix: str, source: Path) -> None:
    sheet = Image.open(source).convert("RGBA")
    cell_width = sheet.width / GRID[0]
    cell_height = sheet.height / GRID[1]

    # Resize every complete grid cell with one common scale. This preserves the
    # model scale and foot baseline produced by the turnaround sheet.
    common_scale = min(
        CANVAS_SIZE[0] / cell_width,
        CANVAS_SIZE[1] / cell_height,
    ) * CONTENT_SCALE

    for index in range(GRID[0] * GRID[1]):
        column = index % GRID[0]
        row = index // GRID[0]
        left = round(column * cell_width)
        right = round((column + 1) * cell_width)
        top = round(row * cell_height)
        bottom = round((row + 1) * cell_height)

        cell = sheet.crop((left, top, right, bottom))
        target_size = (
            max(1, round(cell.width * common_scale)),
            max(1, round(cell.height * common_scale)),
        )
        cell = cell.resize(target_size, Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
        x = (CANVAS_SIZE[0] - cell.width) // 2
        y = CANVAS_SIZE[1] - cell.height
        canvas.alpha_composite(cell, (x, y))
        canvas.save(ASSET_DIR / f"{prefix}-turn-{index}.png", optimize=True)


def main() -> None:
    for prefix, source in SHEETS.items():
        split_sheet(prefix, source)

    # The generated left-side Pigsy cells contain rake fragments crossing the
    # grid boundary. Mirroring the clean paired right-side angles is exact,
    # deterministic, and keeps one complete rake in every rotation frame.
    for destination_index, source_index in ((5, 3), (6, 2), (7, 1)):
        source = Image.open(ASSET_DIR / f"pigsy-turn-{source_index}.png").convert("RGBA")
        ImageOps.mirror(source).save(
            ASSET_DIR / f"pigsy-turn-{destination_index}.png",
            optimize=True,
        )

    # Replace the faulty two-staff rear frame with the corrected one-staff art.
    normalize_single(
        SOURCE_DIR / "monkey-back.png",
        ASSET_DIR / "monkey-turn-4.png",
    )


if __name__ == "__main__":
    main()

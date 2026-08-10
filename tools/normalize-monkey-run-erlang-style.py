from pathlib import Path
from statistics import median
import math
from collections import deque

from PIL import Image


SOURCE = Path("assets/sprite-work/monkey-king-local/run-12-erlang-style-draft/raw-sheet.png")
OUTPUT = Path("assets/raw/characters/monkey-king-run-erlang-style-local")
PREVIEW = Path("assets/sprite-work/monkey-king-local/run-12-erlang-style-normalized")
COLS = 4
ROWS = 3
CANVAS = (640, 512)
TARGET_BOTTOM = 480
TARGET_HEIGHT = 370
BACKGROUND = (255, 0, 255)


def checkerboard(size: tuple[int, int]) -> Image.Image:
    image = Image.new("RGB", size, (52, 52, 52))
    tile = 32
    light = (86, 86, 86)
    for y in range(0, size[1], tile):
        for x in range(0, size[0], tile):
            if ((x // tile) + (y // tile)) % 2 == 0:
                image.paste(light, (x, y, min(x + tile, size[0]), min(y + tile, size[1])))
    return image


def chroma_key(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    corners = [
        rgba.getpixel((0, 0)),
        rgba.getpixel((rgba.width - 1, 0)),
        rgba.getpixel((0, rgba.height - 1)),
        rgba.getpixel((rgba.width - 1, rgba.height - 1)),
    ]
    background = tuple(sum(pixel[channel] for pixel in corners) // len(corners) for channel in range(3))
    pixels = []
    for r, g, b, _ in rgba.getdata():
        magenta_score = min(r, b) - g
        if magenta_score >= 85:
            pixels.append((r, g, b, 0))
            continue
        if magenta_score <= 25:
            pixels.append((r, g, b, 255))
            continue

        alpha = int((85 - magenta_score) * 255 / 60)
        coverage = alpha / 255
        # Remove the magenta background spill from antialiased edge pixels.
        clean = tuple(
            max(0, min(255, round((value - (1 - coverage) * background[channel]) / coverage)))
            for channel, value in enumerate((r, g, b))
        )
        pixels.append((*clean, alpha))
    rgba.putdata(pixels)
    return rgba


def foreground_bbox(image: Image.Image):
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 24 else 0)
    return alpha.getbbox()


def keep_largest_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    values = bytearray(alpha.tobytes())
    visited = bytearray(width * height)
    largest = []

    for index, value in enumerate(values):
        if value < 24 or visited[index]:
            continue
        queue = deque([index])
        visited[index] = 1
        component = []
        while queue:
            current = queue.popleft()
            component.append(current)
            y, x = divmod(current, width)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    neighbour = ny * width + nx
                    if values[neighbour] >= 24 and not visited[neighbour]:
                        visited[neighbour] = 1
                        queue.append(neighbour)
        if len(component) > len(largest):
            largest = component

    cleaned_alpha = bytearray(width * height)
    for index in largest:
        cleaned_alpha[index] = values[index]
    image.putalpha(Image.frombytes("L", image.size, bytes(cleaned_alpha)))
    return image


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    cell_width = source.width // COLS
    cell_height = source.height // ROWS
    keyed = []
    boxes = []

    for index in range(COLS * ROWS):
        column = index % COLS
        row = index // COLS
        cell = source.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        frame = keep_largest_component(chroma_key(cell))
        box = foreground_bbox(frame)
        if box is None:
            raise RuntimeError(f"No foreground found in frame {index + 1}")
        keyed.append(frame)
        boxes.append(box)

    heights = [box[3] - box[1] for box in boxes]
    scale = TARGET_HEIGHT / median(heights)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    frames = []
    checker_frames = []

    for index, (frame, box) in enumerate(zip(keyed, boxes)):
        cropped = frame.crop(box)
        resized = cropped.resize(
            (round(cropped.width * scale), round(cropped.height * scale)),
            Image.Resampling.LANCZOS,
        )
        x = (CANVAS[0] - resized.width) // 2
        y = TARGET_BOTTOM - resized.height
        if x < 0 or y < 0 or x + resized.width > CANVAS[0] or y + resized.height > CANVAS[1]:
            raise RuntimeError(f"Normalized frame {index + 1} does not fit canvas")

        normalized = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        normalized.alpha_composite(resized, (x, y))
        normalized = keep_largest_component(normalized)
        normalized.save(OUTPUT / f"run-{index}.png", optimize=True)
        normalized.save(OUTPUT / f"run-{index}.webp", lossless=True, method=6)

        preview = Image.new("RGB", CANVAS, BACKGROUND)
        preview.paste(normalized, (0, 0), normalized)
        preview.save(PREVIEW / f"run-{index:02d}.png", optimize=True)
        frames.append(preview)

        checker = checkerboard(CANVAS)
        checker.paste(normalized, (0, 0), normalized)
        checker_frames.append(checker)

        print(
            f"frame={index + 1:02d} source_bbox={box} normalized={resized.width}x{resized.height} "
            f"anchor=({x + resized.width / 2:.1f},{y + resized.height})"
        )

    sheet = Image.new("RGB", (COLS * CANVAS[0], ROWS * CANVAS[1]), BACKGROUND)
    for index, frame in enumerate(frames):
        sheet.paste(frame, ((index % COLS) * CANVAS[0], (index // COLS) * CANVAS[1]))
    sheet.save(PREVIEW / "sheet-4x3.png", optimize=True)
    frames[0].save(
        PREVIEW / "animation.gif",
        save_all=True,
        append_images=frames[1:],
        duration=125,
        loop=0,
        disposal=2,
        optimize=False,
    )
    checker_frames[0].save(
        PREVIEW / "animation-checkerboard.gif",
        save_all=True,
        append_images=checker_frames[1:],
        duration=125,
        loop=0,
        disposal=2,
        optimize=False,
    )
    print(f"scale={scale:.6f} target_height={TARGET_HEIGHT} canvas={CANVAS}")
    print(f"output={OUTPUT}")
    print(f"preview={PREVIEW}")


if __name__ == "__main__":
    main()
